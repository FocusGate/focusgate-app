# Syncing a mobile app to the same account as the web app + Chrome extension

This is the contract a companion mobile app needs to follow to share sessions, account
state, and blocking with the existing web app and Chrome extension — same account, same
`sessions` row, three clients reading/writing the same source of truth in Supabase.

## Direct answers (2026-09-10 request)

**Important limit up front**: this session only has the web app + Chrome extension repo.
There is no iOS app code here — I can confirm and fix everything on the Supabase/web/
extension side below, but I cannot read, verify, or edit the iOS app itself. Points 1, 4,
and 5 below are answered from this side only; closing the loop on the iOS side needs that
codebase in front of whoever's doing this work next (me in a future session, or your iOS
dev), ideally with `supabase/MOBILE_APP_INTEGRATION.md` (this file) as the checklist.

1. **Same project, confirmed on this side.** Both `.env.local` (web app,
   `NEXT_PUBLIC_SUPABASE_URL`) and `extension/lib/config.js` (`SUPABASE_URL`) point at
   `https://itdwtkvnlztwomalawpy.supabase.co` — matches the ref you gave. Same auth flow
   here too: both are plain Supabase Auth (email+password), not a custom system, so any
   client signing in via `supabase.auth.signInWithPassword` against this same project
   gets the same `auth.uid()` and is the same account everywhere. *Can't confirm from
   here* whether the iOS app is actually pointed at this same project/using this same
   auth call — that's the one thing only the iOS repo itself can answer.

2. **Schema is already shared** (there was never a separate copy for the extension —
   `extension/lib/supabaseApi.js` reads/writes the exact same `public.*` tables as the
   web app) — `blocked_sites`, `user_preferences` (Gates settings), `users.streak`,
   `user_feathers`. The one concept that doesn't exist *anywhere* yet, on any platform:
   **"current theme selection"** — there's no theme/appearance column or table in this
   schema at all today (grepped for it — nothing). If the iOS app already has a theme
   picker, its data model for that is the one genuinely new thing to design a shared
   column for (`user_preferences.theme` is the natural spot) — flagging per your point 5
   rather than inventing a shape for it unseen.

3. **Realtime coverage was the actual gap, now fixed on the schema side.** Before this
   change, only `sessions` and `group_violations` were in the `supabase_realtime`
   publication — every other synced concept (blocked sites, Gates settings, streak,
   Feathers) only ever updated on a poll or an on-mount fetch, so a change on one
   platform genuinely would *not* have shown up on another without a refresh. Added
   `blocked_sites`, `user_preferences`, `users`, and `user_feathers` to the publication
   (see schema.sql's new "cross-platform realtime" section — same idempotent-guard
   pattern as the existing entries, safe to re-run). This needs to actually be run in the
   Supabase SQL editor like every other schema.sql change in this project. Once it's run,
   any client — including a future iOS build — can subscribe to `postgres_changes` on
   these tables the same way `lib/supabase.ts`'s `subscribeToSessionPause` already does
   for sessions. The Chrome extension itself will keep polling regardless (see section 3
   below, unchanged, for why), but the *data* is now available to push, not just pull.

4. **Extension's current auth storage, audited**: `extension/lib/auth.js` stores the
   access token, refresh token, and expiry in plain `chrome.storage.local` (see that
   file's own header comment — it's a *second*, separate sign-in from the web dashboard,
   since an extension can't read the site's own browser storage across origins). This is
   sandboxed per-extension by Chrome (other extensions/pages can't read it directly) but
   it is **not** encrypted at rest the way iOS Keychain is — anyone with local disk/
   profile access, or the user themselves via chrome://extensions' own inspector, can read
   it in plaintext. That's normal for a Chrome extension (there's no first-party
   equivalent of Keychain available to it) but it is a real difference worth stating
   explicitly rather than assuming iOS's Keychain-backed persistence "just works the same
   way" — it doesn't, and shouldn't be assumed to carry the same guarantees.

5. **Diverging/duplicated models found on this side**: none beyond the realtime gap
   (now fixed) and the missing theme concept (both above) — the web app and extension
   already read/write the identical tables, there's no second copy of this schema
   anywhere in this repo. The real "diverging models" question is entirely about how the
   iOS app currently represents sessions/Gates/streak/Feathers *locally* before sync,
   which requires that codebase to actually answer.

## 1. Auth: use Supabase Auth directly, nothing extension-specific

Sign in with the same Supabase project's email+password auth (`supabase.auth.signInWithPassword`
in whichever official SDK — JS, Swift, Kotlin, or React Native all work identically here).
There is no separate "mobile" account system — a user signing into the app with the same
email/password gets the same `auth.uid()`, and every RLS policy in this schema is written as
`using (auth.uid() = user_id)`, so it doesn't matter which client is asking: web dashboard,
Chrome extension (which stores a long-lived access/refresh token pair, see
`extension/lib/auth.js`), or a mobile app. Whatever your app's SDK gives you as the signed-in
user's id is the exact `user_id` to filter every query below by.

## 2. The one table that matters: `public.sessions`

```sql
id                uuid primary key
user_id           uuid references public.users
start_time        timestamptz
end_time          timestamptz
duration_minutes  integer      -- planned length, in minutes
completed         boolean      -- false while the session is actively running
-- pause_* columns (added later): pause_until, pause_type ('break'|'auto'),
-- pause_break_note_id, pause_requested_seconds, pause_skippable, pause_reminder_text,
-- pause_note_text — all describe a temporary "on a break" state, see section 4.
```

**A partial unique index enforces exactly one active session per user at the database
level**: `sessions_one_active_per_user on public.sessions (user_id) where completed = false`.
This is the actual mechanism that makes "starts a session on their phone or desktop, blocks
both" possible — not a special sync feature, just the ordinary constraint that there can only
ever be one truly active session for an account, no matter which client created it.

### Starting a session
Whichever client the user starts from does a plain `insert into sessions (...) values (...)`.
If another client already has one running, this insert **fails with Postgres error 23505**
(`unique_violation`) — that failure is the signal. Do not treat it as an error to surface;
catch it and fall through to "adopt the existing session" (section 3) instead. This is
exactly what `extension/lib/supabaseApi.js` + `background.js` already do (see
`startMirroredSession` — it never originates a session itself anymore, only mirrors one
the dashboard created).

### Ending a session
`update sessions set completed = true, end_time = ..., duration_minutes = <actual elapsed>
where id = ...`. Compute the actual elapsed time yourself rather than trusting the client's
own wall clock uncritically if you want tamper-resistance — see section 5.

## 3. Adopting a session you didn't start (the "mirror" pattern)

On app foreground / periodic check, query:

```sql
select * from sessions where user_id = auth.uid() and completed = false limit 1;
```

- **Row found, your app doesn't know about it yet** → this session was started on another
  device (web dashboard, extension, or the other app). Adopt it: compute remaining time from
  `start_time` + `duration_minutes` minus now, apply your own local block enforcement, done.
  This is the actual "starting a session on one device blocks the other" behavior — every
  client independently discovers the same row and enforces locally.
- **Row found, matches what your app already has active** → no-op, you're already enforcing it.
- **No row found** → nothing running; don't block.

The Chrome extension does this once a minute via `chrome.alarms` (`background.js`'s
`syncFromDashboard`). **That's a poll, not a push, deliberately** — Manifest V3 service
workers get suspended when Chrome is idle, so a persistent WebSocket from the extension isn't
reliable (see schema.sql's own comment on this above the `pause_*` columns). A native mobile
app doesn't have that specific constraint and can use Supabase Realtime for a near-instant
push instead of polling:

```
public.sessions is already added to the `supabase_realtime` publication.
Subscribe to postgres_changes on table "sessions", filter "user_id=eq.<the user's id>",
for INSERT (new session started elsewhere) and UPDATE (paused/ended elsewhere) events.
```

(Same pattern the web app itself uses for its own near-instant break-pause sync — see
`lib/supabase.ts`'s `subscribeToSessionPause` for the exact `.channel().on("postgres_changes",
...)` shape to copy.) If your app's platform can't reliably hold that connection in the
background either (varies a lot for iOS background execution in particular), fall back to
polling on a timer the same way the extension does — just pick whichever's reliable on your
platform, the *data contract* is what has to match, not the transport.

## 4. Breaks / pauses (if your app wants to participate in this too)

A session can be temporarily paused (a manual break, or a mode's own automatic break) without
ending it: `pause_until` (timestamptz the pause lifts), `pause_type` (`'break'` or `'auto'`).
While `pause_until` is in the future, blocking is meant to be lifted; once it passes (or the
row updates to clear it), resume enforcing. This is optional for a first version — a mobile
app that just enforces "is there an active session" without honoring pauses will still be
correct, just stricter than the web/extension experience during a break.

## 5. Tamper-resistance (optional, but matches the existing bar)

The Chrome extension doesn't trust the local device clock for anything that decides when a
session's timer has run out — a user could just change their system clock forward to end a
session early. It cross-checks against a trusted network time source (WorldTimeAPI) and
reconciles (`extension/lib/time.js`'s `getTrustedStartTime`/`reconcileElapsed`). If you want
the mobile app's enforcement to be resistant to the same trick, replicate that: fetch a
trusted timestamp once, then track elapsed time as (trusted-time-then) vs (device-clock-now)
deltas rather than trusting `Date.now()` alone for "has the timer expired" decisions.

## 6. What blocking actually means per platform

`public.blocked_sites` (`user_id`, `url`) is the list of domains the user configured. The
Chrome extension enforces it via `declarativeNetRequest` (desktop-browser-level redirect
rules) — that mechanism has no mobile equivalent. A phone needs its own enforcement layer
entirely (iOS: Screen Time / Managed Settings + Family Controls entitlement; Android: either
an Accessibility-service-based blocker or a local VPN that null-routes matching domains).
That's a real, separate build on your app's side — this document only covers keeping the
*session and account state* in sync, not how you implement blocking once your app knows a
session is active.
