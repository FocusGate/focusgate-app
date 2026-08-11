// supabaseApi.js — thin fetch() wrappers around Supabase's Auth (GoTrue) and REST
// (PostgREST) HTTP APIs. No @supabase/supabase-js dependency on purpose: this extension
// is loaded unpacked with no build step, so plain fetch() keeps it dependency-free while
// talking to the exact same backend + tables the Next.js dashboard uses.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// Mirrors lib/supabase.ts's DEFAULT_PREFERENCES on the web app — used whenever a user
// has no `user_preferences` row yet (new accounts) so break/emergency flows here behave
// identically to the dashboard's.
export const DEFAULT_PREFERENCES = {
  default_session_minutes: 60,
  break_gates_enabled: true,
  break_notes_enabled: true,
  break_note_min_chars: 50,
  break_gate_default_challenge: "ask",
  break_gate_difficulty: "normal",
};

export const MAX_FREE_EMERGENCY_UNBLOCKS = 2; // mirrors lib/supabase.ts

/** Mirrors lib/supabase.ts's GATE_SECONDS_BY_DIFFICULTY — how long the in-extension
 *  challenge (challenge.html) gives the user per the dashboard's configured difficulty. */
export const GATE_SECONDS_BY_DIFFICULTY = { easy: 35, normal: 30, hard: 22 };

async function parseOrThrow(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error_description || body?.message || body?.msg || `Supabase request failed (${res.status})`);
  }
  return body;
}

/** Signs in with the user's existing FocusGate account (same credentials as the web app). */
export async function signInWithPassword(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseOrThrow(res); // { access_token, refresh_token, expires_in, user }
}

/** Exchanges a refresh token for a new access token once the current one is near expiry. */
export async function refreshSession(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  return parseOrThrow(res);
}

function restHeaders(accessToken) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

/** Reads the user's `users` row (name/streak/goals) — mirrors lib/supabase.ts's getUser(). */
export async function fetchProfile(accessToken, userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id,name,email,streak,goals,goal_target_date`, {
    headers: restHeaders(accessToken),
  });
  const rows = await parseOrThrow(res);
  return rows[0] ?? null;
}

/** The user's configured block list (same table Settings/Dashboard write to). */
export async function fetchBlockedSites(accessToken, userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blocked_sites?user_id=eq.${userId}&select=url&order=sort_order.asc`,
    { headers: restHeaders(accessToken) }
  );
  const rows = await parseOrThrow(res);
  return rows.map((r) => r.url);
}

/**
 * The break/emergency-gate preferences configured on the dashboard's Settings page.
 * Falls back to DEFAULT_PREFERENCES for accounts with no row yet, same as
 * lib/supabase.ts's getUserPreferences().
 */
export async function fetchUserPreferences(accessToken, userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_preferences?user_id=eq.${userId}&select=default_session_minutes,break_gates_enabled,break_notes_enabled,break_note_min_chars,break_gate_default_challenge,break_gate_difficulty`,
    { headers: restHeaders(accessToken) }
  );
  const rows = await parseOrThrow(res);
  return rows[0] ? { ...DEFAULT_PREFERENCES, ...rows[0] } : DEFAULT_PREFERENCES;
}

/**
 * The most recent still-running session for this user, if any — this is how the
 * extension notices "a Locked In session was just started on the dashboard" without
 * ever creating one itself. Sessions can now only be *started* from the dashboard.
 */
export async function fetchActiveSession(accessToken, userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sessions?user_id=eq.${userId}&completed=eq.false&select=id,start_time,duration_minutes&order=start_time.desc&limit=1`,
    { headers: restHeaders(accessToken) }
  );
  const rows = await parseOrThrow(res);
  return rows[0] ?? null;
}

/**
 * Combined status check for a session the extension is currently mirroring: whether it's
 * been completed from elsewhere (e.g. the dashboard tab's own timer finished it — the
 * extension needs to lift its local block the moment that happens, without re-completing a
 * row that's already done), and its live pause state. Both need checking on every sync, so
 * this is one round trip instead of two.
 *
 * Pause is the same shared source of truth the web dashboard's LockedInOverlay reads via
 * Supabase Realtime (lib/supabase.ts's subscribeToSessionPause) — this extension polls it
 * instead. A service worker can't reliably hold a persistent Realtime WebSocket connection
 * open across Chrome's MV3 idle-suspension (it gets torn down and the subscription lost),
 * so background.js re-checks this on every alarm tick, and popup.js polls it directly and
 * much more often while the popup itself is open (see popup.js's SYNC_NOW interval).
 */
export async function fetchSessionStatus(accessToken, sessionId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}&select=completed,pause_until,pause_type,pause_break_note_id,pause_requested_seconds,pause_skippable,pause_reminder_text,pause_note_text`,
    { headers: restHeaders(accessToken) }
  );
  const rows = await parseOrThrow(res);
  const row = rows[0];
  if (!row) return { completed: true, pause: null }; // treat a deleted/missing row as "no longer active"

  const untilMs = row.pause_until ? new Date(row.pause_until).getTime() : null;
  const pause =
    untilMs !== null && untilMs > Date.now()
      ? {
          until: untilMs,
          type: row.pause_type,
          breakNoteId: row.pause_break_note_id,
          requestedSeconds: row.pause_requested_seconds,
          skippable: row.pause_skippable,
          reminderText: row.pause_reminder_text,
          noteText: row.pause_note_text,
        }
      : null;

  return { completed: row.completed, pause };
}

/** Writes (or clears, when `pause` is null) the live pause state on a session's own row —
 *  see fetchSessionStatus's doc comment for why this exists. Blocking by design at every
 *  call site that *starts* a break (grantBreak): a break only this extension's local
 *  storage knows about is exactly the split-brain state this mechanism replaces. Ending a
 *  break (resolvePauseIfActive, END_BREAK_EARLY) stays best-effort, matching the existing
 *  updateBreakNoteActualDuration calls right next to them — the local resume has already
 *  happened by that point regardless. */
export async function updateSessionPause(accessToken, sessionId, pause) {
  const body =
    pause === null
      ? {
          pause_until: null,
          pause_type: null,
          pause_break_note_id: null,
          pause_requested_seconds: null,
          pause_skippable: true,
          pause_reminder_text: null,
          pause_note_text: null,
        }
      : {
          pause_until: pause.untilIso,
          pause_type: pause.type,
          pause_break_note_id: pause.breakNoteId,
          pause_requested_seconds: pause.requestedSeconds,
          pause_skippable: pause.skippable,
          pause_reminder_text: pause.reminderText ?? null,
          pause_note_text: pause.noteText ?? null,
        };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`, {
    method: "PATCH",
    headers: restHeaders(accessToken),
    body: JSON.stringify(body),
  });
  await parseOrThrow(res);
}

/**
 * Marks a `sessions` row completed, so it shows up in the dashboard's stats/streak.
 * `endTimeIso` and `durationMinutes` must be derived from the tamper-verified elapsed
 * time (session.confirmedElapsedMs) by the caller, NOT from the local wall clock — the
 * whole point of the tamper-resistant timer is undermined if the one value written back
 * to the shared source of truth trusts `Date.now()` instead.
 */
export async function completeRemoteSession(accessToken, sessionId, endTimeIso, durationMinutes) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`, {
    method: "PATCH",
    headers: restHeaders(accessToken),
    body: JSON.stringify({ end_time: endTimeIso, duration_minutes: durationMinutes, completed: true }),
  });
  await parseOrThrow(res);
}

/** Flags a session as interrupted by an uninstall — see background.js's syncFromDashboard()
 *  for the (necessarily heuristic) detection this feeds. Public accountability instead of
 *  a technical block, since there's no Chrome API to actually prevent uninstalling. */
export async function flagSessionInterrupted(accessToken, sessionId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`, {
    method: "PATCH",
    headers: restHeaders(accessToken),
    body: JSON.stringify({ interrupted_by_uninstall: true }),
  });
  await parseOrThrow(res);
}

/** Atomically adds `amount` to the user's `blocked_attempts` counter ("Distraction Slayer")
 *  via the increment_blocked_attempts() RPC — an RPC rather than a read-modify-write PATCH
 *  so two overlapping flushes from the same device can't clobber each other's count. */
export async function flushBlockedAttempts(accessToken, userId, amount) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_blocked_attempts`, {
    method: "POST",
    headers: restHeaders(accessToken),
    body: JSON.stringify({ p_user_id: userId, p_amount: amount }),
  });
  await parseOrThrow(res);
}

/** Tells every one of the user's friend groups that a session got interrupted this way —
 *  mirrors lib/supabase.ts's notifyFriendGroup(), just flattened across every group this
 *  user belongs to instead of taking one groupId at a time (the extension has no per-group
 *  UI moment to call this from repeatedly the way the dashboard does). Best-effort by
 *  design: one group's insert failing shouldn't stop the others from being notified. */
export async function notifyGroupsOfInterruption(accessToken, userId, userName) {
  const membershipRes = await fetch(`${SUPABASE_URL}/rest/v1/group_members?user_id=eq.${userId}&select=group_id`, {
    headers: restHeaders(accessToken),
  });
  const memberships = await parseOrThrow(membershipRes);
  const message = `${userName} broke a Locked In session by uninstalling FocusGate 💔`;

  await Promise.all(
    memberships.map(async ({ group_id }) => {
      const membersRes = await fetch(
        `${SUPABASE_URL}/rest/v1/group_members?group_id=eq.${group_id}&user_id=neq.${userId}&select=user_id`,
        { headers: restHeaders(accessToken) }
      );
      const members = await parseOrThrow(membersRes);
      if (!members.length) return;

      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: "POST",
        headers: restHeaders(accessToken),
        body: JSON.stringify(
          members.map((m) => ({
            user_id: m.user_id,
            group_id,
            message,
            created_at: new Date().toISOString(),
            read: false,
          }))
        ),
      });
      await parseOrThrow(insertRes);
    })
  );
}

/** How many free emergency unblocks the user has used this calendar month (UTC), for MAX_FREE_EMERGENCY_UNBLOCKS. */
export async function fetchEmergencyUnblocksUsedThisMonth(accessToken, userId) {
  const now = new Date();
  const monthStartIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/emergency_unblocks?user_id=eq.${userId}&created_at=gte.${monthStartIso}&select=id`,
    { headers: restHeaders(accessToken) }
  );
  const rows = await parseOrThrow(res);
  return rows.length;
}

/** Records an emergency unblock — mirrors lib/supabase.ts's recordEmergencyUnblock(). */
export async function insertEmergencyUnblock(accessToken, userId, sessionId, reasonText, wasPaid) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/emergency_unblocks`, {
    method: "POST",
    headers: restHeaders(accessToken),
    body: JSON.stringify({ user_id: userId, session_id: sessionId, reason_text: reasonText, was_paid: wasPaid }),
  });
  await parseOrThrow(res);
}

/** How many (non-emergency, non-automatic) breaks have already been taken this session —
 *  mirrors lib/supabase.ts's getBreakNoteCountForSession(), used against
 *  maxBreaksForDuration(). is_auto=false excludes a mode's own built-in breaks (Pomodoro's
 *  between-cycle rests, All Nighter's checkpoints) from the manually-requested-break budget
 *  this cap governs — those aren't started from this extension, but the same shared table
 *  needs the same filter here so mirroring a Pomodoro/All Nighter session doesn't
 *  under-count how many manual breaks are actually still available. */
export async function fetchBreakNoteCountForSession(accessToken, sessionId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/break_notes?session_id=eq.${sessionId}&is_emergency=eq.false&is_auto=eq.false&select=id`,
    { headers: restHeaders(accessToken) }
  );
  const rows = await parseOrThrow(res);
  return rows.length;
}

/** Records a break note — mirrors lib/supabase.ts's saveBreakNote(). `requestedSeconds` is
 *  the precise custom-slider duration (1 second to 15 minutes); `break_duration_minutes`
 *  stays populated (rounded) alongside the new `break_duration_seconds` for anything that
 *  hasn't moved off it. Requests the inserted row back (Prefer: return=representation,
 *  which PostgREST otherwise omits by default) so the caller has the id to later report
 *  the actual duration used via updateBreakNoteActualDuration. */
export async function insertBreakNote(accessToken, userId, sessionId, noteText, requestedSeconds) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/break_notes?select=id`, {
    method: "POST",
    headers: { ...restHeaders(accessToken), Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      session_id: sessionId,
      note_text: noteText,
      break_duration_minutes: requestedSeconds != null ? Math.round(requestedSeconds / 60) : null,
      break_duration_seconds: requestedSeconds,
      is_emergency: false,
    }),
  });
  const rows = await parseOrThrow(res);
  return { id: rows?.[0]?.id ?? null };
}

/** Reports how long a break actually ran — mirrors lib/supabase.ts's
 *  updateBreakNoteActualDuration(). Best-effort by every call site: a failure here must
 *  never block the session from resuming. */
export async function updateBreakNoteActualDuration(accessToken, breakNoteId, actualSeconds) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/break_notes?id=eq.${breakNoteId}`, {
    method: "PATCH",
    headers: restHeaders(accessToken),
    body: JSON.stringify({ actual_duration_seconds: Math.round(actualSeconds) }),
  });
  await parseOrThrow(res);
}

/** Records a challenge.html attempt — mirrors lib/supabase.ts's logBreakGateAttempt().
 *  Deliberately skips that function's "Focused Under Pressure" badge-unlock side effect:
 *  it's a nice-to-have the web app already covers next time the user opens the dashboard,
 *  not something worth the extra round-trip here. */
export async function insertBreakGateAttempt(accessToken, userId, sessionId, game, passed) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/break_gate_attempts`, {
    method: "POST",
    headers: restHeaders(accessToken),
    body: JSON.stringify({ user_id: userId, session_id: sessionId, game, passed }),
  });
  await parseOrThrow(res);
}
