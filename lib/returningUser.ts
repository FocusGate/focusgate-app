/**
 * Remembers a visitor's email across the signed-out landing page, purely client-side —
 * this is NOT auth state (Supabase already owns that), just a hint so a returning
 * visitor's "start using the app" click goes to /login instead of the 13-screen
 * onboarding they've already completed once. Saved specifically at sign-out (see
 * AppShell's confirm dialog), not at every login, since that's the moment we know for
 * sure "this person already has an account and is stepping away."
 */

const KNOWN_EMAIL_KEY = "fg-known-email";

export function saveKnownEmail(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KNOWN_EMAIL_KEY, email);
}

export function getKnownEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KNOWN_EMAIL_KEY);
}

/** Where a "start using FocusGate" CTA should send a visitor: straight to sign-in if
 *  we recognize them, otherwise into the onboarding flow. */
export function getEntryPath(): "/login" | "/onboarding" {
  return getKnownEmail() ? "/login" : "/onboarding";
}
