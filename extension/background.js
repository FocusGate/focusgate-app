// background.js — FocusGate's service worker.
//
// Sessions can now ONLY be started from the web dashboard — this service worker never
// creates one. Its job is to notice when the signed-in user's dashboard starts/ends a
// session and mirror the block locally, run the tamper-resistant countdown, and (once a
// session is running) refuse to lift the block early except through the same friction
// mechanisms the dashboard itself offers — Emergency Unblock (which now ends the
// session, matching LockedInOverlay.tsx) and Request a Break (a temporary pause), both
// recorded to Supabase exactly like the web app's own flows. Disabling the extension
// itself is still possible via chrome://extensions, same as any Chrome extension — that
// control belongs to the browser, not to this code.

import {
  getSession,
  setSession,
  clearSession,
  getLastSyncError,
  setLastSyncError,
  clearLastSyncError,
  getPendingBreakChallenge,
  setPendingBreakChallenge,
  clearPendingBreakChallenge,
  getPendingGameAttempt,
  setPendingGameAttempt,
  clearPendingGameAttempt,
  getHasSynced,
  setHasSynced,
  getPendingBlockedAttempts,
  incrementPendingBlockedAttempts,
  consumePendingBlockedAttempts,
} from "./lib/storage.js";
import { applyBlockRules, clearBlockRules, sweepExistingTabs, DEFAULT_BLOCKED_DOMAINS } from "./lib/rules.js";
import { getTrustedStartTime, reconcileElapsed, getRemainingMs, getDisplayRemainingMs } from "./lib/time.js";
import { getAuth, signIn, clearAuth, getValidAccessToken } from "./lib/auth.js";
import {
  DEFAULT_PREFERENCES,
  MAX_FREE_EMERGENCY_UNBLOCKS,
  GATE_SECONDS_BY_DIFFICULTY,
  fetchBlockedSites,
  fetchUserPreferences,
  fetchActiveSession,
  fetchSessionStatus,
  fetchEmergencyUnblocksUsedThisMonth,
  fetchBreakNoteCountForSession,
  insertEmergencyUnblock,
  insertBreakNote,
  insertBreakGateAttempt,
  completeRemoteSession,
  flagSessionInterrupted,
  notifyGroupsOfInterruption,
  flushBlockedAttempts,
  updateBreakNoteActualDuration,
  updateSessionPause,
} from "./lib/supabaseApi.js";

const TICK_ALARM = "focusgate-tick";
const MIN_REASON_LENGTH = 15; // mirrors EmergencyUnblockModal.tsx
const MIN_BREAK_NOTE_WORDS = 3; // mirrors lib/stats.ts's MIN_BREAK_NOTE_WORDS
const MAX_BREAK_NOTE_WORDS = 10; // mirrors lib/stats.ts's MAX_BREAK_NOTE_WORDS
// Breaks are custom-length now — mirrors lib/stats.ts's MIN/MAX/DEFAULT_BREAK_SECONDS.
const MIN_BREAK_SECONDS = 60;
const MAX_BREAK_SECONDS = 15 * 60;
const DEFAULT_BREAK_SECONDS = 5 * 60;

/** Mirrors lib/stats.ts's maxBreaksForDuration() — one break per 30 planned minutes, floored at 1. */
function maxBreaksForDuration(durationMinutes) {
  return Math.max(1, Math.floor(durationMinutes / 30));
}

/**
 * Reads the stored session, but treats an "active" session with no `remoteSessionId` as
 * corrupt and wipes it instead of trusting it. Every session this version of the
 * extension creates comes from mirroring a dashboard-started row (see
 * startMirroredSession) and always has a remoteSessionId — the only way to see one
 * without it is a leftover record from an older build that could start sessions itself.
 * Without this guard, that stale record would sit in chrome.storage.local forever,
 * showing as a phantom "active session" no dashboard ever started and no break/emergency
 * action could meaningfully affect.
 */
async function getValidSession() {
  const session = await getSession();
  if (session?.active && !session.remoteSessionId) {
    await clearBlockRules();
    await clearSession();
    chrome.action.setBadgeText({ text: "" });
    return null;
  }
  return session;
}

function isValidBreakNoteWords(text) {
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean);
  return words.length >= MIN_BREAK_NOTE_WORDS && words.length <= MAX_BREAK_NOTE_WORDS;
}

/** Creates the recurring poll/tamper-check alarm if it isn't already running. */
async function ensureTickAlarm() {
  const existing = await chrome.alarms.get(TICK_ALARM);
  if (!existing) chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
}

/** Seeds local session state from a `sessions` row the dashboard created, and turns blocking on. */
async function startMirroredSession(remoteSession, plannedMinutes, domains) {
  const trustedNow = await getTrustedStartTime();
  const remoteStartMs = Date.parse(remoteSession.start_time);
  const durationMs = plannedMinutes * 60_000;
  // The dashboard may have started this seconds or minutes before the extension noticed
  // it — seed elapsed time from the gap between the row's start_time and right now,
  // rather than assuming the extension just witnessed the start.
  const confirmedElapsedMs = Math.max(trustedNow - remoteStartMs, 0);

  const session = {
    active: true,
    blockedDomains: domains,
    durationMs,
    startNetworkTime: remoteStartMs,
    confirmedElapsedMs,
    lastCheck: { local: Date.now(), network: trustedNow },
    remoteSessionId: remoteSession.id,
    remoteStartTime: remoteSession.start_time,
    pause: null, // { type: "break", until: <trusted epoch ms> } while blocking is temporarily lifted for a break
  };
  await setSession(session);
  // Rules first (so any *new* navigation is caught immediately), then sweep tabs that
  // were already sitting open on a blocked site before this session existed — otherwise
  // they'd stay open, un-redirected, until the user next navigated.
  await applyBlockRules(domains);
  await sweepExistingTabs(domains);
  await ensureTickAlarm();
  updateBadge(session);
}

/**
 * Ends the local session. `skipRemoteSync` is used when the *dashboard* already
 * completed the row (we're just catching up) — otherwise the extension is the one
 * telling Supabase this session is done (e.g. it timed out while the dashboard tab
 * wasn't even open to notice, or Emergency Unblock was granted). The completed row's
 * end_time/duration are derived from `confirmedElapsedMs` — the tamper-verified elapsed
 * time — never from the local clock.
 */
async function endSession({ skipRemoteSync = false } = {}) {
  const session = await getValidSession();

  if (!skipRemoteSync && session?.remoteSessionId) {
    const accessToken = await getValidAccessToken();
    if (accessToken) {
      try {
        const durationMinutes = Math.round(session.confirmedElapsedMs / 60_000);
        const endTimeIso = new Date(Date.parse(session.remoteStartTime) + session.confirmedElapsedMs).toISOString();
        await completeRemoteSession(accessToken, session.remoteSessionId, endTimeIso, durationMinutes);
      } catch {
        // Best-effort — the local block still lifts even if the sync call fails.
      }
    }
  }

  await clearBlockRules();
  await clearSession();
  chrome.action.setBadgeText({ text: "" });
  // Deliberately NOT clearing TICK_ALARM here — it needs to keep polling afterwards so
  // the *next* dashboard-started session is picked up too. tick() below is what decides
  // when polling can actually stop (only once idle and signed out).
}

/**
 * Reconciles local state with the dashboard: picks up a session that was just started
 * there, and notices if a session the extension is mirroring has been ended there.
 * Any failure here is recorded via setLastSyncError so the popup can show *why* nothing
 * synced, instead of that looking identical to "there's just nothing to sync yet."
 */
async function syncFromDashboard() {
  const auth = await getAuth();
  if (!auth) return;

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    await setLastSyncError("Signed in, but the session token couldn't be refreshed — try signing in again.");
    return;
  }

  // Read *before* marking this device synced — used below to detect "this is the first
  // successful sync since this extension was installed (or reinstalled)". Uninstalling
  // wipes chrome.storage.local entirely, including this flag, so its absence right when
  // an already-active session turns up is the signal a mid-session uninstall left behind.
  const isFirstSyncThisInstall = !(await getHasSynced());
  await setHasSynced();

  // Flush any "Distraction Slayer" block-attempt count accumulated since the last sync.
  // Fire-and-forget: a flaky network here must never block the rest of this sync, and
  // failure just leaves the count pending for the next tick to retry.
  const pendingBlocked = await getPendingBlockedAttempts();
  if (pendingBlocked > 0) {
    flushBlockedAttempts(accessToken, auth.userId, pendingBlocked)
      .then(() => consumePendingBlockedAttempts(pendingBlocked))
      .catch(() => {});
  }

  const session = await getValidSession();

  if (session?.active && session.remoteSessionId) {
    try {
      const status = await fetchSessionStatus(accessToken, session.remoteSessionId);
      if (status.completed) {
        await endSession({ skipRemoteSync: true });
        await clearLastSyncError();
        return;
      }
      // A break started (or ended) on the dashboard needs to pause (or resume) this
      // extension's own countdown exactly like one started here would — see
      // mergeRemotePause's own comment for why this doesn't just trust local state.
      await mergeRemotePause(session, status.pause);
      await clearLastSyncError();
    } catch (err) {
      await setLastSyncError(describeError(err));
      // Offline — leave the local mirror running; the tamper-check below still governs
      // when it actually ends.
    }
    return;
  }

  if (session?.active) {
    await clearLastSyncError();
    return; // active but not a mirrored session — leave it alone
  }

  try {
    const remote = await fetchActiveSession(accessToken, auth.userId);
    if (!remote) {
      await clearLastSyncError();
      return; // nothing running on the dashboard right now
    }

    // Older rows (or any row created outside the normal dashboard flow) may not have a
    // planned duration recorded — fall back to the user's default session length rather
    // than silently refusing to mirror a session that is, in fact, actively running.
    let plannedMinutes = remote.duration_minutes;
    if (!plannedMinutes) {
      plannedMinutes = await fetchUserPreferences(accessToken, auth.userId)
        .then((p) => p.default_session_minutes)
        .catch(() => DEFAULT_PREFERENCES.default_session_minutes);
    }

    // This device has no local memory of this session (it wasn't in `session`, checked
    // above) yet the dashboard says it's still running — the local machinery is about to
    // re-lock right back onto it below regardless. If this is *also* the first sync since
    // this install, that combination means the local state that would normally remember
    // this session got wiped since it started — almost always an uninstall. Flag it and
    // tell the friend group; best-effort, since neither should ever block the actual
    // re-lock from happening.
    if (isFirstSyncThisInstall) {
      flagSessionInterrupted(accessToken, remote.id).catch(() => {});
      notifyGroupsOfInterruption(accessToken, auth.userId, auth.name).catch(() => {});
    }

    const domains = await fetchBlockedSites(accessToken, auth.userId);
    await startMirroredSession(remote, plannedMinutes, domains.length > 0 ? domains : DEFAULT_BLOCKED_DOMAINS);
    await clearLastSyncError();
  } catch (err) {
    await setLastSyncError(describeError(err));
  }
}

function describeError(err) {
  return err instanceof Error ? err.message : "Couldn't reach the dashboard.";
}

/**
 * Reconciles the locally-mirrored pause against Supabase's copy — the shared source of
 * truth a break started on either the dashboard or this extension writes to. Only
 * *adopts* changes here; a pause this extension itself started or ended already updated
 * Supabase directly (grantBreak, resolvePauseIfActive, END_BREAK_EARLY) and doesn't need
 * round-tripping back through this function to take effect locally.
 */
async function mergeRemotePause(session, remotePause) {
  const localUntil = session.pause?.until ?? null;
  const remoteUntil = remotePause?.until ?? null;
  if (remoteUntil === localUntil) return; // already in sync — the common case, every tick

  if (remoteUntil) {
    // A new (or different) pause is active remotely — adopt it, whether it started on the
    // dashboard or on a different device running this same extension.
    const updated = {
      ...session,
      pause: {
        type: remotePause.type,
        until: remoteUntil,
        breakNoteId: remotePause.breakNoteId,
        requestedSeconds: remotePause.requestedSeconds,
        noteText: remotePause.noteText ?? "",
        reminderText: remotePause.reminderText ?? null,
      },
    };
    await setSession(updated);
    updateBadgePaused(updated);
  } else if (localUntil) {
    // The pause that was active locally has been cleared remotely (ended from the
    // dashboard) — adopt the clear without re-reporting actual duration; whichever
    // surface actually ended it already did that.
    const trustedNow = await getTrustedStartTime();
    const resumed = { ...session, pause: null, lastCheck: { local: Date.now(), network: trustedNow } };
    await setSession(resumed);
    updateBadge(resumed);
  }
}

/**
 * If the session is paused (on a break), checks — using trusted network time — whether
 * the pause window is over, and clears the pause if so. Returns the (possibly updated)
 * session either way. Blocking itself is untouched here on purpose: breaks no longer lift
 * it (see The Lounge — sites stay blocked the entire session, break or not), so there's
 * nothing to reapply on resume, only the pause flag and badge to clear.
 */
async function resolvePauseIfActive(session) {
  if (!session.pause) return session;

  const trustedNow = await getTrustedStartTime();
  if (trustedNow < session.pause.until) return session; // still on break

  // Reset lastCheck to right now so the paused interval is never counted as elapsed
  // focus time once the main countdown resumes.
  const resumed = { ...session, pause: null, lastCheck: { local: Date.now(), network: trustedNow } };
  await setSession(resumed);
  updateBadge(resumed);

  // Best-effort: the break ran its full requested course. Failure here must never block
  // the resume above, which has already happened by this point.
  const auth = await getAuth();
  const accessToken = auth && (await getValidAccessToken());
  if (accessToken) {
    if (session.pause.breakNoteId) {
      updateBreakNoteActualDuration(accessToken, session.pause.breakNoteId, session.pause.requestedSeconds ?? 0).catch(() => {});
    }
    if (session.remoteSessionId) {
      updateSessionPause(accessToken, session.remoteSessionId, null).catch(() => {});
    }
  }

  return resumed;
}

/** Runs on every alarm tick: syncs with the dashboard, resumes from any expired pause, then re-verifies the countdown. */
async function tick() {
  await syncFromDashboard();

  let session = await getValidSession();
  if (!session?.active) {
    const auth = await getAuth();
    if (!auth) await chrome.alarms.clear(TICK_ALARM);
    return;
  }

  session = await resolvePauseIfActive(session);
  if (session.pause) {
    updateBadgePaused(session);
    return; // still on a break — don't touch the main timer
  }

  const { confirmedElapsedMs, lastCheck } = await reconcileElapsed(session);
  const updated = { ...session, confirmedElapsedMs, lastCheck };

  if (getRemainingMs(updated) <= 0) {
    await endSession();
  } else {
    await setSession(updated);
    updateBadge(updated);
  }
}

/** Shows minutes remaining on the toolbar icon, so the countdown is visible without opening the popup. */
function updateBadge(session) {
  const minutes = Math.ceil(getDisplayRemainingMs(session) / 60_000);
  chrome.action.setBadgeText({ text: String(minutes) });
  chrome.action.setBadgeBackgroundColor({ color: "#b08d57" });
}

/** Green badge while a break is running, showing minutes left of the pause. */
function updateBadgePaused(session) {
  const minutes = Math.max(Math.ceil((session.pause.until - Date.now()) / 60_000), 0);
  chrome.action.setBadgeText({ text: String(minutes) });
  chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
}

/**
 * `remainingMs` means different things depending on `session.pause`: the main session
 * countdown when not paused, or time left in the break window when paused. Popup/blocked
 * pages branch on `session.pause` to know which one they're looking at.
 */
function buildStatusResponse(session) {
  if (!session?.active) return { session, remainingMs: 0 };
  if (session.pause) return { session, remainingMs: Math.max(session.pause.until - Date.now(), 0) };
  return { session, remainingMs: getDisplayRemainingMs(session) };
}

/** Emergency Unblock now ends the session outright — matches LockedInOverlay.tsx's
 *  handleEmergencyGranted(). The confirm/reason/cooldown gauntlet already happened in
 *  the popup before this is called; this just records it and ends the session. */
async function grantEmergencyUnblock(reason, wasPaid) {
  const session = await getValidSession();
  if (!session?.active) return { ok: false, error: "No active session." };
  if (session.pause) return { ok: false, error: "You're on a break." };
  if (!wasPaid && (!reason || reason.trim().length < MIN_REASON_LENGTH)) {
    return { ok: false, error: `Reason must be at least ${MIN_REASON_LENGTH} characters.` };
  }

  const auth = await getAuth();
  const accessToken = auth && (await getValidAccessToken());
  if (!auth || !accessToken) return { ok: false, error: "Not signed in." };

  try {
    await insertEmergencyUnblock(accessToken, auth.userId, session.remoteSessionId, reason, wasPaid);
  } catch {
    return { ok: false, error: "Couldn't reach the dashboard — check your connection and try again." };
  }

  await endSession();
  return { ok: true };
}

/** `requestedSeconds` is the custom slider duration from challenge.html's post-pass
 *  "how long do you need?" screen (1 to 15 minutes) — chosen only after the gate game is
 *  won, not before, so it's clamped again here since the message that carries it crosses a
 *  trust boundary. Blocking is deliberately left untouched: sites stay blocked through the
 *  whole break (see The Lounge on the dashboard side), so there's nothing to lift. */
async function grantBreak(noteText, breakNotesEnabled, requestedSeconds) {
  const session = await getValidSession();
  if (!session?.active) return { ok: false, error: "No active session." };
  if (session.pause) return { ok: false, error: "Already on a break." };

  const auth = await getAuth();
  const accessToken = auth && (await getValidAccessToken());
  if (!auth || !accessToken) return { ok: false, error: "Not signed in." };

  const cap = maxBreaksForDuration(session.durationMs / 60_000);
  let usedSoFar;
  try {
    usedSoFar = await fetchBreakNoteCountForSession(accessToken, session.remoteSessionId);
  } catch {
    return { ok: false, error: "Couldn't reach the dashboard — check your connection and try again." };
  }
  if (usedSoFar >= cap) {
    return { ok: false, error: `No breaks left — this session earns ${cap}.` };
  }

  if (breakNotesEnabled && !isValidBreakNoteWords(noteText)) {
    return { ok: false, error: `Note must be ${MIN_BREAK_NOTE_WORDS}-${MAX_BREAK_NOTE_WORDS} words.` };
  }

  const seconds = Math.round(Math.min(Math.max(requestedSeconds ?? DEFAULT_BREAK_SECONDS, MIN_BREAK_SECONDS), MAX_BREAK_SECONDS));

  let breakNoteId = null;
  try {
    const inserted = await insertBreakNote(accessToken, auth.userId, session.remoteSessionId, noteText ?? "", seconds);
    breakNoteId = inserted.id;
  } catch {
    return { ok: false, error: "Couldn't reach the dashboard — check your connection and try again." };
  }

  const trustedNow = await getTrustedStartTime();
  const until = trustedNow + seconds * 1000;

  // Blocking by design: writing the shared pause state to Supabase is what a break
  // "starting" *means* now — a break only this extension's local storage knows about is
  // exactly the split-brain state this mechanism replaces (see updateSessionPause's own
  // doc comment). If this fails, nothing local changes either, and the user can retry.
  try {
    await updateSessionPause(accessToken, session.remoteSessionId, {
      untilIso: new Date(until).toISOString(),
      type: "break",
      breakNoteId,
      requestedSeconds: seconds,
      skippable: true,
      noteText: noteText ?? "",
      reminderText: null,
    });
  } catch {
    return { ok: false, error: "Couldn't reach the dashboard — check your connection and try again." };
  }

  const updated = { ...session, pause: { type: "break", until, breakNoteId, requestedSeconds: seconds, noteText: noteText ?? "", reminderText: null } };
  await setSession(updated);
  updateBadgePaused(updated);
  return { ok: true, seconds };
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TICK_ALARM) tick();
});

// --- Message API (popup.js and challenge.js talk to the service worker through this) ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      // Local-only, no network — cheap enough to poll every second from the popup for a
      // smooth countdown without hammering Supabase.
      case "GET_STATUS": {
        const session = await getValidSession();
        sendResponse(buildStatusResponse(session));
        break;
      }

      // The one network-backed check — call this once when the popup opens so a session
      // started on the dashboard moments ago shows up immediately, rather than waiting
      // for the next alarm tick (up to ~1 minute, Chrome's alarm minimum interval).
      case "SYNC_NOW": {
        await syncFromDashboard();
        const session = await getValidSession();
        sendResponse(buildStatusResponse(session));
        break;
      }

      // Sent once by blocked.js on every load — one "distraction attempt" for
      // "Distraction Slayer". Always recorded locally regardless of sign-in state; only
      // actually flushed to Supabase (see syncFromDashboard) once signed in.
      case "RECORD_BLOCKED_ATTEMPT": {
        await incrementPendingBlockedAttempts();
        sendResponse({ ok: true });
        break;
      }

      case "GET_SYNC_ERROR": {
        sendResponse({ error: await getLastSyncError() });
        break;
      }

      case "SIGN_IN":
        try {
          const auth = await signIn(message.email, message.password);
          await ensureTickAlarm();
          await syncFromDashboard();
          sendResponse({ ok: true, name: auth.name, email: auth.email });
        } catch (err) {
          sendResponse({ ok: false, error: err instanceof Error ? err.message : "Sign-in failed." });
        }
        break;

      case "SIGN_OUT": {
        await clearAuth();
        await clearLastSyncError();
        // If a session is actively being mirrored, keep polling/tamper-checking it —
        // signing out of the extension's sync must not become a way to end an active
        // block early. tick()'s own idle+signed-out check retires the alarm once that
        // session naturally ends.
        const session = await getValidSession();
        if (!session?.active) await chrome.alarms.clear(TICK_ALARM);
        sendResponse({ ok: true });
        break;
      }

      case "GET_AUTH": {
        const auth = await getAuth();
        sendResponse({
          auth: auth ? { name: auth.name, email: auth.email, goals: auth.goals ?? [], goalTargetDate: auth.goalTargetDate ?? null } : null,
        });
        break;
      }

      // Break-gate settings from the dashboard's Settings page, how many breaks this
      // session has earned/used, and how many free emergency unblocks are left this
      // month — the popup needs all of it to decide which step to show.
      case "GET_BREAK_INFO": {
        const auth = await getAuth();
        const accessToken = auth && (await getValidAccessToken());
        const session = await getValidSession();
        if (!auth || !accessToken) {
          sendResponse({ ok: false, error: "Not signed in." });
          break;
        }
        if (!session?.active) {
          sendResponse({ ok: false, error: "No active session." });
          break;
        }
        try {
          const [prefs, usedThisMonth, breaksUsed] = await Promise.all([
            fetchUserPreferences(accessToken, auth.userId),
            fetchEmergencyUnblocksUsedThisMonth(accessToken, auth.userId),
            fetchBreakNoteCountForSession(accessToken, session.remoteSessionId),
          ]);
          sendResponse({
            ok: true,
            // No breakGatesEnabled here on purpose — the gate is mandatory, not a
            // preference to branch on. breakGateChallenge/breakGateSeconds still get
            // decided fresh inside OPEN_BREAK_CHALLENGE below, not from this response.
            breakNotesEnabled: prefs.break_notes_enabled,
            breaksUsed,
            breaksCap: maxBreaksForDuration(session.durationMs / 60_000),
            emergencyRemainingFree: Math.max(MAX_FREE_EMERGENCY_UNBLOCKS - usedThisMonth, 0),
          });
        } catch {
          sendResponse({ ok: false, error: "Couldn't reach the dashboard." });
        }
        break;
      }

      case "START_EMERGENCY_UNBLOCK": {
        const result = await grantEmergencyUnblock(message.reason, !!message.wasPaid);
        sendResponse(result);
        break;
      }

      // Popup hands off to challenge.html rather than hosting a game itself (too little
      // room, and the popup closes the instant it loses focus). This looks up the current
      // break-gate settings itself — rather than trusting whatever the popup last read —
      // and stashes them so challenge.html knows what to play once its tab opens.
      case "OPEN_BREAK_CHALLENGE": {
        const auth = await getAuth();
        const accessToken = auth && (await getValidAccessToken());
        const session = await getValidSession();
        if (!auth || !accessToken) {
          sendResponse({ ok: false, error: "Not signed in." });
          break;
        }
        if (!session?.active) {
          sendResponse({ ok: false, error: "No active session." });
          break;
        }
        if (session.pause) {
          sendResponse({ ok: false, error: "Already on a break." });
          break;
        }
        try {
          const prefs = await fetchUserPreferences(accessToken, auth.userId);
          await setPendingBreakChallenge({
            note: message.note ?? "",
            breakNotesEnabled: !!message.breakNotesEnabled,
            challenge: prefs.break_gate_default_challenge,
            seconds: GATE_SECONDS_BY_DIFFICULTY[prefs.break_gate_difficulty] ?? GATE_SECONDS_BY_DIFFICULTY.normal,
            // Break length isn't known yet at this point — challenge.html only asks for it
            // after the gate is actually passed, and sends it back in BREAK_CHALLENGE_RESULT.
          });
          const tab = await chrome.tabs.create({ url: chrome.runtime.getURL("challenge.html") });
          sendResponse({ ok: true, tabId: tab.id });
        } catch {
          sendResponse({ ok: false, error: "Couldn't reach the dashboard." });
        }
        break;
      }

      // Also returns any in-progress game attempt (see lib/storage.js) alongside the
      // original request — challenge.js needs both to decide whether to resume an attempt
      // already underway, treat one that expired while the tab was closed as a failure, or
      // start fresh.
      case "GET_PENDING_BREAK_CHALLENGE": {
        const pending = await getPendingBreakChallenge();
        const gameAttempt = await getPendingGameAttempt();
        sendResponse({ ok: !!pending, pending, gameAttempt });
        break;
      }

      // A specific game just started (not the "choose your challenge" screen — picking
      // isn't timed) — fixes this attempt's deadline so reopening the tab later can never
      // extend it, only resume within whatever's left of it.
      case "GAME_ATTEMPT_START": {
        const deadlineAt = Date.now() + Math.max(0, message.seconds) * 1000;
        await setPendingGameAttempt({ slug: message.slug, deadlineAt, state: message.state ?? null });
        sendResponse({ ok: true, deadlineAt });
        break;
      }

      // Board mutations (a card flip, a match resolving) — called often enough that this
      // deliberately doesn't round-trip through getPendingGameAttempt() first; it just
      // overwrites state for whichever slug/deadline is already stored, matching the one
      // attempt that's ever live at a time.
      case "GAME_ATTEMPT_UPDATE": {
        const current = await getPendingGameAttempt();
        if (!current || current.slug !== message.slug) {
          sendResponse({ ok: false, error: "No matching attempt in progress." });
          break;
        }
        await setPendingGameAttempt({ ...current, state: message.state });
        sendResponse({ ok: true });
        break;
      }

      case "GAME_ATTEMPT_CLEAR": {
        await clearPendingGameAttempt();
        sendResponse({ ok: true });
        break;
      }

      // challenge.html reports its outcome here rather than calling grantBreak() itself —
      // keeps every path that can actually lift the block funneled through this one
      // service worker, same as START_EMERGENCY_UNBLOCK above. Also the single funnel for
      // "this attempt is over" — clears the game attempt here rather than trusting every
      // settle path in challenge.js to remember to, including the one that fires when the
      // deadline had already passed before the tab was even reopened.
      case "BREAK_CHALLENGE_RESULT": {
        const pending = await getPendingBreakChallenge();
        await clearPendingBreakChallenge();
        await clearPendingGameAttempt();

        const auth = await getAuth();
        const accessToken = auth && (await getValidAccessToken());
        const session = await getValidSession();
        if (auth && accessToken) {
          insertBreakGateAttempt(accessToken, auth.userId, session?.remoteSessionId ?? null, message.game, !!message.passed).catch(() => {
            // best-effort logging only — a failed write here shouldn't block granting/denying the break
          });
        }

        if (!message.passed) {
          sendResponse({ ok: true, granted: false });
          break;
        }
        // requestedSeconds comes from challenge.html's post-pass duration screen, not from
        // the original OPEN_BREAK_CHALLENGE call — the whole point of the reorder is that
        // duration is picked only after the gate's actually been earned.
        const result = await grantBreak(pending?.note ?? "", !!pending?.breakNotesEnabled, message.requestedSeconds);
        sendResponse({ ok: result.ok, granted: result.ok, error: result.error, seconds: result.seconds });
        break;
      }

      // "I'm ready, back to focus" from the popup's paused view — ends the break before
      // its requested time is up and reports the shorter actual duration used.
      case "END_BREAK_EARLY": {
        const session = await getValidSession();
        if (!session?.pause) {
          sendResponse({ ok: false, error: "Not on a break." });
          break;
        }
        const trustedNow = await getTrustedStartTime();
        const remainingMs = Math.max(session.pause.until - trustedNow, 0);
        const requested = session.pause.requestedSeconds ?? 0;
        const actualUsed = Math.max(requested - Math.round(remainingMs / 1000), 0);
        const breakNoteId = session.pause.breakNoteId;

        const resumed = { ...session, pause: null, lastCheck: { local: Date.now(), network: trustedNow } };
        await setSession(resumed);
        updateBadge(resumed);

        // Best-effort, same as resolvePauseIfActive's natural-expiry path — the local
        // resume above has already happened, so a failure here just means the dashboard
        // (or another device) learns about it a bit later, on its own next sync.
        const auth = await getAuth();
        const accessToken = auth && (await getValidAccessToken());
        if (accessToken) {
          if (breakNoteId) updateBreakNoteActualDuration(accessToken, breakNoteId, actualUsed).catch(() => {});
          if (session.remoteSessionId) updateSessionPause(accessToken, session.remoteSessionId, null).catch(() => {});
        }
        sendResponse({ ok: true });
        break;
      }

      // challenge.html asks the background page to close its own tab rather than calling
      // window.close() on itself — reliable regardless of how Chrome feels about a
      // programmatically-opened tab closing itself.
      case "CLOSE_TAB": {
        if (sender.tab?.id) await chrome.tabs.remove(sender.tab.id);
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ ok: false, error: `unknown message type: ${message?.type}` });
    }
  })();
  return true; // tells Chrome we'll call sendResponse asynchronously
});

// --- Persistent worker / auto-recovery ---
// chrome.declarativeNetRequest dynamic rules and chrome.alarms both already persist
// automatically across service-worker suspensions and full browser restarts. What
// genuinely needs re-checking on a fresh browser start is whether a previously-active
// session (or its pause) should still be considered running, and getting the poll alarm
// going again.
async function restoreSessionOnStartup() {
  let session = await getValidSession();

  if (session?.active) {
    session = await resolvePauseIfActive(session);
    if (session.pause) {
      updateBadgePaused(session);
    } else {
      // The service worker can sit dormant for anywhere from seconds to hours between
      // restarts (extension reload, browser relaunch, Chrome suspending an idle worker).
      // `lastCheck` from before that gap is stale, and getDisplayRemainingMs() interpolates
      // off it — left unreconciled, the popup can show a badly undercounted time (even
      // 0:00) right after a restart despite confirmedElapsedMs (the value that actually
      // decides whether the session ends) being fine. Reconciling here — the same
      // network-verified step tick() runs every minute — closes that gap on every restart
      // instead of waiting for the next scheduled tick to happen to fire.
      const { confirmedElapsedMs, lastCheck } = await reconcileElapsed(session);
      session = { ...session, confirmedElapsedMs, lastCheck };

      if (getRemainingMs(session) <= 0) {
        await endSession();
        session = null;
      } else {
        await setSession(session);
        await applyBlockRules(session.blockedDomains);
        await sweepExistingTabs(session.blockedDomains); // catch tabs left open from before the restart
        updateBadge(session);
      }
    }
  }

  const auth = await getAuth();
  if (auth || session?.active) await ensureTickAlarm();

  await syncFromDashboard();
}

chrome.runtime.onStartup.addListener(restoreSessionOnStartup);
chrome.runtime.onInstalled.addListener(restoreSessionOnStartup);
