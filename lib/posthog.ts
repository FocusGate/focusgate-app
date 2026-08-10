"use client";

// posthog.ts — the one place this app talks to PostHog. Reads NEXT_PUBLIC_POSTHOG_KEY /
// NEXT_PUBLIC_POSTHOG_HOST (both meant to be public — PostHog's project API key is a
// write-only ingestion key, safe in a client bundle, unlike a Resend/Supabase service-role
// key). No-ops entirely if either is unset, so a local dev environment without them
// configured doesn't throw or half-initialize.

import posthog from "posthog-js";

let initialized = false;

/** Called once, client-side only, from PostHogProvider. Session recording is masked at the
 *  input level (maskAllInputs) rather than scoped to specific forms — simpler than trying to
 *  enumerate every place a user types something, and it means the login/signup fields (the
 *  two forms this was explicitly asked to exclude) are covered by construction, not by
 *  remembering to tag them. Those two forms are also marked `ph-no-capture` directly (see
 *  SignupForm.tsx/LoginForm.tsx) — a second, independent layer that keeps autocapture from
 *  ever recording a click/submit on them with field values attached, on top of the replay
 *  masking. */
export function initPostHog() {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return;

  posthog.init(key, {
    api_host: host,
    // Pageviews are fired manually on route change (see PostHogProvider's PostHogPageView) —
    // the App Router doesn't do full page loads on navigation, so the default init-time
    // $pageview alone would only ever fire once per tab.
    capture_pageview: false,
    // Only creates a full person profile once something actually identifies the visitor
    // (see CurrentUserContext's posthog.identify call) — an anonymous landing-page visit
    // doesn't need one.
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: { password: true },
    },
  });
  initialized = true;
}

export { posthog };

export type AnalyticsEvent =
  | "user_signup"
  | "session_started"
  | "session_completed"
  | "break_requested"
  | "break_gate_passed"
  | "break_gate_failed"
  | "emergency_unblock_used"
  | "badge_unlocked"
  | "upgrade_button_clicked"
  | "dead_mans_switch_triggered";

/** Thin wrapper over posthog.capture() — one typed call site for every event this app
 *  tracks, so the event name list above is the single source of truth for what "tracking an
 *  event" means here. Safe to call before init resolves or without env vars configured;
 *  posthog-js queues/no-ops gracefully either way. */
export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}
