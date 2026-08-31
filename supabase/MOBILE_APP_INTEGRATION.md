# Syncing a mobile app to the same account as the web app + Chrome extension

This is the contract a companion mobile app needs to follow to share sessions, account
state, and blocking with the existing web app and Chrome extension — same account, same
`sessions` row, three clients reading/writing the same source of truth in Supabase.

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
