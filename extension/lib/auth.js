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

/**
 * Returns a valid access token, transparently refreshing it first if it's expired or
 * about to expire. Returns null if signed out or the refresh token itself is dead (in
 * which case the stored auth is cleared, so the popup falls back to the sign-in form).
 */
export async function getValidAccessToken() {
  const auth = await getAuth();
  if (!auth) return null;

  const EXPIRY_BUFFER_MS = 60_000;
  if (Date.now() < auth.expiresAt - EXPIRY_BUFFER_MS) return auth.accessToken;

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
  } catch {
    await clearAuth();
    return null;
  }
}
