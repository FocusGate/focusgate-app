// time.js — tamper-resistant elapsed-time tracking.
//
// THE PROBLEM: naively storing `endTime = Date.now() + duration` and later checking
// `Date.now() >= endTime` is trivial to cheat — just roll your system clock forward and
// the session "ends" instantly (or roll it back to freeze/extend remaining time forever).
//
// THE FIX: don't trust a single stored deadline compared against the local clock at
// arbitrary points in time. Instead, periodically ask a trusted server for the *real*
// current time, and accumulate `confirmedElapsedMs` using that network-verified delta.
// If the browser's local clock disagrees with the network by more than a small
// tolerance, we know the local clock was tampered with, and we simply ignore it —
// elapsed time only ever advances based on verified network time.
//
// This isn't unbreakable (nothing client-side fully is — e.g. cutting network access
// entirely defeats the periodic re-check, though then the extension just falls back to
// local-clock timing rather than "the timer resets to 0"). But it directly closes the
// specific, common bypass this feature exists to stop: casually changing the system
// date/time to end a session early.
//
// The trusted time source is the `Date` response header from the user's own Supabase
// project, not a dedicated time API — every HTTP server sends one on every response by
// spec (even an error response, so the exact route/method doesn't matter), and this
// avoids depending on a free third-party time API's uptime for a core feature. (An
// earlier version used worldtimeapi.org; it isn't reliable enough to gate the timer on.)

import { SUPABASE_URL } from "./config.js";

const CLOCK_TOLERANCE_MS = 15_000; // allow normal small drift/latency before flagging tampering

/** Fetches the current time via the `Date` header of a response from the user's own
 *  Supabase project — reachable exactly whenever the rest of this extension's sync
 *  already needs it to be, so this doesn't add a new point of failure. Throws if
 *  offline/unreachable or the header is somehow missing/unparseable. */
async function fetchNetworkTimeMs() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, { cache: "no-store" });
  const dateHeader = res.headers.get("date");
  if (!dateHeader) throw new Error("response had no Date header");
  const ms = Date.parse(dateHeader);
  if (Number.isNaN(ms)) throw new Error("Date header was unparseable");
  return ms;
}

/**
 * Called once when a session starts. Returns the trusted "now" (network time if
 * reachable, local time as a same-instant fallback if offline) to seed the session.
 */
export async function getTrustedStartTime() {
  try {
    return await fetchNetworkTimeMs();
  } catch {
    // Offline at session start: fall back to local time. Elapsed-time tracking below
    // will still catch clock tampering *during* the session as soon as the network is
    // reachable again.
    return Date.now();
  }
}

/**
 * Re-verifies elapsed time against the network clock and returns an updated
 * `confirmedElapsedMs`. Call this on a recurring alarm while a session is active.
 *
 * @param {import("./storage.js").FocusSession} session
 * @returns {Promise<{ confirmedElapsedMs: number, lastCheck: { local: number, network: number } }>}
 */
export async function reconcileElapsed(session) {
  const nowLocal = Date.now();

  let nowNetwork;
  try {
    nowNetwork = await fetchNetworkTimeMs();
  } catch {
    // Can't verify right now (offline) — don't advance confirmedElapsedMs at all this
    // tick rather than trusting the local clock. The session simply pauses its
    // "verified" countdown until connectivity returns; it can never be shortened by
    // an unverifiable local-clock jump.
    return { confirmedElapsedMs: session.confirmedElapsedMs, lastCheck: session.lastCheck };
  }

  const elapsedLocal = nowLocal - session.lastCheck.local;
  const elapsedNetwork = nowNetwork - session.lastCheck.network;
  const drift = Math.abs(elapsedLocal - elapsedNetwork);

  // Local clock roughly agrees with the network — trust the network delta (it's the
  // ground truth either way, but this is the expected, non-tampered case).
  // If it disagrees beyond tolerance, the local clock was changed since our last check;
  // we still only add the *network-verified* delta, so a backward local-clock jump
  // never reduces (and a forward jump never inflates) confirmed elapsed time.
  const verifiedDelta = drift > CLOCK_TOLERANCE_MS ? Math.max(elapsedNetwork, 0) : elapsedNetwork;

  return {
    confirmedElapsedMs: session.confirmedElapsedMs + Math.max(verifiedDelta, 0),
    lastCheck: { local: nowLocal, network: nowNetwork },
  };
}

/**
 * Authoritative remaining time — based only on `confirmedElapsedMs`, which advances
 * exclusively via network-verified reconciliation (see `reconcileElapsed` above). This
 * is what decides when a session actually ends; it never trusts the raw local clock.
 */
export function getRemainingMs(session) {
  return Math.max(session.durationMs - session.confirmedElapsedMs, 0);
}

/**
 * Display remaining time — the authoritative value minus whatever's elapsed *locally*
 * since the last verified check. `confirmedElapsedMs` only updates once a minute (the
 * tick alarm's period), so using it alone for the UI made the popup/blocked-page
 * countdown jump in 60-second steps instead of ticking down every second. Interpolating
 * with the local clock between checkpoints gives a smooth, second-by-second countdown
 * without weakening the tamper check: if the local clock is rolled back mid-minute, this
 * value briefly reads a little high, but the next reconciliation tick corrects it — the
 * *actual* session-end decision (`getRemainingMs`) never uses this interpolated value.
 */
export function getDisplayRemainingMs(session) {
  const sinceLastCheck = Date.now() - session.lastCheck.local;
  return Math.max(session.durationMs - session.confirmedElapsedMs - sinceLastCheck, 0);
}
