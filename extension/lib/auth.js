// auth.js — stores the signed-in FocusGate account's tokens in chrome.storage.local and
// keeps the access token fresh. This is a *separate* sign-in from the web dashboard (the
// extension can't read the site's browser storage across origins) — same account,
// entered once here, so the extension can talk to Supabase on the user's behalf.

import { signInWithPassword, refreshSession, fetchProfile } from "./supabaseApi.js";

const AUTH_KEY = "focusgate_auth";

/**
 * @typedef {Object} AuthState
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {number} expiresAt   - epoch ms
 * @property {string} userId
 * @property {string} email
 * @property {string} name
 * @property {string[]} goals
 * @property {string|null} goalTargetDate
 */

/** @returns {Promise<AuthState | null>} */
export async function getAuth() {
  const result = await chrome.storage.local.get(AUTH_KEY);
  return result[AUTH_KEY] ?? null;
}

async function setAuth(auth) {
  await chrome.storage.local.set({ [AUTH_KEY]: auth });
}

export async function clearAuth() {
  await chrome.storage.local.remove(AUTH_KEY);
}

/** Signs in and persists the session. Throws with a readable message on bad credentials. */
export async function signIn(email, password) {
  const data = await signInWithPassword(email, password);
  const profile = await fetchProfile(data.access_token, data.user.id);

  const auth = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    userId: data.user.id,
    email: data.user.email,
    name: profile?.name ?? data.user.email.split("@")[0],
    goals: profile?.goals ?? [],
    goalTargetDate: profile?.goal_target_date ?? null,
  };
  await setAuth(auth);
  return auth;
}

// Coalesces concurrent refresh attempts into one shared in-flight promise. Popup.js's
// fast SYNC_NOW poll (every 2s while open) and the background alarm tick can both notice
// the token's about to expire within the same window; without this, each would
// independently call refreshSession() with the *same* refresh token. Supabase rotates
// refresh tokens on use — the first call to land invalidates it for every other
// concurrent caller, which then fails even though the refresh genuinely succeeded.
let refreshInFlight = null;

/**
 * Returns a valid access token, transparently refreshing it first if it's expired or
 * about to expire. Returns null if signed out, if the refresh token itself is dead (in
 * which case the stored auth is cleared, so the popup falls back to the sign-in form), or
 * if the refresh attempt simply couldn't reach Supabase (network hiccup — the stored auth
 * is left alone in that case, since a failed *request* says nothing about whether the
 * refresh token itself is still good; the next call just tries again).
 */
export async function getValidAccessToken() {
  const auth = await getAuth();
  if (!auth) return null;

  const EXPIRY_BUFFER_MS = 60_000;
  if (Date.now() < auth.expiresAt - EXPIRY_BUFFER_MS) return auth.accessToken;

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const data = await refreshSession(auth.refreshToken);
      const refreshed = {
        ...auth,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };
      await setAuth(refreshed);
      return refreshed.accessToken;
    } catch (err) {
      // fetch() itself rejects with a TypeError when the request never completes at all
      // (offline, DNS hiccup, connection reset) — there's no verdict from Supabase to act
      // on, so leave the stored session alone and let the next attempt retry. Only an
      // actual response *rejecting* the refresh token (parseOrThrow's Error, from a real
      // HTTP error status) means the session is genuinely dead.
      if (!(err instanceof TypeError)) {
        await clearAuth();
      }
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}
