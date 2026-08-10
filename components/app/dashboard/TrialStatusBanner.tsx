"use client";

import Link from "next/link";
import type { Entitlements } from "@/lib/entitlements";
import { track } from "@/lib/posthog";

/** One of four states, all driven by the same entitlements object every other gate in the
 *  app reads from — nothing here re-derives beta/trial logic on its own:
 *   1. beta_mode on — "Beta Access — Full Access Free," no countdown, nothing to upgrade.
 *   2. beta_mode off, grandfathered (is_beta_user) or a real paid plan (not modeled yet,
 *      but fullAccess + no trialDaysLeft means "nothing time-limited left to say") — no
 *      banner at all; there's nothing to tell them.
 *   3. beta_mode off, trial still running — a light "N days left" note, not an alarm.
 *   4. beta_mode off, trial over — the persistent upgrade banner. This is the one state
 *      that's actually dormant right now (BETA_MODE is true), waiting for launch.
 */
export default function TrialStatusBanner({ betaMode, entitlements }: { betaMode: boolean; entitlements: Entitlements }) {
  if (betaMode) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          padding: "8px 16px",
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: 999,
          color: "#F59E0B",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        🎁 Beta Access — Full Access Free
      </div>
    );
  }

  if (!entitlements.fullAccess) {
    return (
      <div
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          padding: "14px 20px",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.35)",
          borderRadius: 14,
        }}
      >
        <span style={{ color: "#f87171", fontSize: 14, fontWeight: 600 }}>
          Your trial ended — upgrade to keep everything.
        </span>
        <Link
          href="/#pricing"
          onClick={() => track("upgrade_button_clicked")}
          style={{
            background: "linear-gradient(180deg, #FBBF24, #F59E0B)",
            color: "#0A0A0A",
            fontSize: 13,
            fontWeight: 800,
            padding: "8px 18px",
            borderRadius: 999,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Upgrade →
        </Link>
      </div>
    );
  }

  if (entitlements.trialDaysLeft !== null) {
    return (
      <p style={{ marginTop: 12, color: "#9a9da4", fontSize: 13 }}>
        {entitlements.trialDaysLeft} day{entitlements.trialDaysLeft === 1 ? "" : "s"} left in your free trial.
      </p>
    );
  }

  return null;
}
