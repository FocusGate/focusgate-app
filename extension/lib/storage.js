// storage.js — single source of truth for session state in chrome.storage.local.
// Keeping every read/write behind these two functions means background.js, popup.js,
// and blocked.js all agree on the exact shape of `session` without duplicating it.

const STORAGE_KEY = "focusgate_session";

/**
 * @typedef {Object} FocusSession
 * @property {boolean} active
 * @property {string[]} blockedDomains
 * @property {number} durationMs            - total session length in ms
 * @property {number} startNetworkTime      - trusted (network-verified) epoch ms when the session started
 * @property {number} confirmedElapsedMs    - accumulated elapsed time that has been *verified* against
 *                                             network time (see lib/time.js) — this, not a raw
 *                                             `Date.now() - startNetworkTime` diff, is what protects
 *                                             against local system-clock rollback.
 * @property {{ local: number, network: number }} lastCheck - last time we reconciled local vs. network time
 */

/** @returns {Promise<FocusSession | null>} */
export async function getSession() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? null;
}

/** @param {FocusSession} session */
export async function setSession(session) {
  await chrome.storage.local.set({ [STORAGE_KEY]: session });
}

export async function clearSession() {
  await chrome.storage.local.remove(STORAGE_KEY);
}

// The last error a dashboard-sync attempt hit, if any — surfaced in the popup so a sync
// failure (bad token, RLS/network issue, etc.) is visible instead of quietly looking
// identical to "nothing to sync yet."
const SYNC_ERROR_KEY = "focusgate_last_sync_error";

export async function getLastSyncError() {
  const result = await chrome.storage.local.get(SYNC_ERROR_KEY);
  return result[SYNC_ERROR_KEY] ?? null;
}

export async function setLastSyncError(message) {
  await chrome.storage.local.set({ [SYNC_ERROR_KEY]: message });
}

export async function clearLastSyncError() {
  await chrome.storage.local.remove(SYNC_ERROR_KEY);
}

// The break note/challenge/seconds a "Take a Break" click committed to, stashed here the
// moment the popup opens challenge.html — a plain in-memory variable wouldn't survive the
// service worker being suspended between "tab opened" and "challenge.js asks what to play."
const PENDING_BREAK_CHALLENGE_KEY = "focusgate_pending_break_challenge";

/**
 * @typedef {Object} PendingBreakChallenge
 * @property {string} note
 * @property {boolean} breakNotesEnabled
 * @property {string} challenge   - a GameSlug, or "ask" to let challenge.js offer all three
 * @property {number} seconds     - the gate game's own time limit
 * @property {number} requestedBreakSeconds - how long the break itself runs once the gate is passed (1s-15min, from the popup's duration slider)
 */

/** @returns {Promise<PendingBreakChallenge | null>} */
export async function getPendingBreakChallenge() {
  const result = await chrome.storage.local.get(PENDING_BREAK_CHALLENGE_KEY);
  return result[PENDING_BREAK_CHALLENGE_KEY] ?? null;
}

/** @param {PendingBreakChallenge} pending */
export async function setPendingBreakChallenge(pending) {
  await chrome.storage.local.set({ [PENDING_BREAK_CHALLENGE_KEY]: pending });
}

export async function clearPendingBreakChallenge() {
  await chrome.storage.local.remove(PENDING_BREAK_CHALLENGE_KEY);
}

// Uninstalling wipes every key in chrome.storage.local, including this one — that's
// exactly the point. If this flag is missing the first time syncFromDashboard() runs
// after a fresh sign-in and it finds a session already active on the dashboard, the most
// likely explanation is that this device had the extension running that same session
// before, got uninstalled (wiping this flag along with everything else), and is now being
// reinstalled — see background.js's syncFromDashboard() for where this gets used.
const HAS_SYNCED_KEY = "focusgate_has_synced";

/** @returns {Promise<boolean>} */
export async function getHasSynced() {
  const result = await chrome.storage.local.get(HAS_SYNCED_KEY);
  return !!result[HAS_SYNCED_KEY];
}

export async function setHasSynced() {
  await chrome.storage.local.set({ [HAS_SYNCED_KEY]: true });
}

// "Distraction Slayer" counter — blocked.js fires one of these per navigation redirected
// to blocked.html. Accumulated locally rather than PATCHed to Supabase on every single
// block (a fast-refreshing distracting tab could fire dozens of these a minute); flushed
// in a batch by background.js's syncFromDashboard() via the increment_blocked_attempts RPC,
// then decremented by exactly the amount that was actually flushed (not reset to 0) so a
// block that happens mid-flush is never silently dropped.
const PENDING_BLOCKED_ATTEMPTS_KEY = "focusgate_pending_blocked_attempts";

/** @returns {Promise<number>} */
export async function getPendingBlockedAttempts() {
  const result = await chrome.storage.local.get(PENDING_BLOCKED_ATTEMPTS_KEY);
  return result[PENDING_BLOCKED_ATTEMPTS_KEY] ?? 0;
}

export async function incrementPendingBlockedAttempts() {
  const current = await getPendingBlockedAttempts();
  await chrome.storage.local.set({ [PENDING_BLOCKED_ATTEMPTS_KEY]: current + 1 });
}

export async function consumePendingBlockedAttempts(amount) {
  const current = await getPendingBlockedAttempts();
  await chrome.storage.local.set({ [PENDING_BLOCKED_ATTEMPTS_KEY]: Math.max(0, current - amount) });
}
