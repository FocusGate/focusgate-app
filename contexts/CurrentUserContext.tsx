"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { getUser } from "@/lib/supabase";
import { getAppConfig, computeEntitlements, type Entitlements } from "@/lib/entitlements";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  streak: number;
  longest_streak: number;
  total_focus_hours: number;
  goals: string[] | null;
  goal_target_date: string | null;
  is_beta_user: boolean;
  trial_ends_at: string | null;
};

type Ctx = {
  user: CurrentUser | null;
  loading: boolean;
  setUser: (u: CurrentUser) => void;
  /** Live value of public.app_config.beta_mode — most code should read `entitlements`
   *  instead of this directly; it's exposed mainly for the BETA badge itself. */
  betaMode: boolean;
  /** Computed once per user/betaMode fetch (lib/entitlements.ts) — the single source every
   *  gated feature (blocked-sites cap, Break Gates, friend groups, Dead Man's Switch, badge
   *  rarity) checks, rather than each re-deriving beta/trial logic on its own. */
  entitlements: Entitlements;
};

const CurrentUserContext = createContext<Ctx | null>(null);

// Used only before the real fetch resolves — betaMode true here isn't a policy choice, it's
// just "assume full access for the one render before we actually know," matching
// getAppConfig()'s own fail-open default.
const FALLBACK_ENTITLEMENTS: Entitlements = {
  fullAccess: true,
  blockedSitesLimit: Infinity,
  canUseBreakGates: true,
  canUseFriendGroups: true,
  canUseDeadMansSwitch: true,
  maxBadgeRarity: ["common", "rare", "epic", "mythic", "legendary"],
  trialDaysLeft: null,
};

/** Fetches the signed-in user (auth + profile + streak sync) exactly once per app-shell
 *  mount, not once per page — every route under app/(app) reads from this instead of
 *  re-running that multi-round-trip fetch on every tab switch, which is what made
 *  switching between Dashboard/Badges/Stats/etc. feel like a fresh page load each time.
 *  app_config's beta_mode rides along in the same mount-time fetch, for the same reason. */
export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [betaMode, setBetaMode] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getUser(), getAppConfig().catch(() => ({ betaMode: true }))])
      .then(([u, config]) => {
        if (cancelled) return;
        if (!u) {
          router.replace("/login");
          return;
        }
        const currentUser = u as CurrentUser;
        posthog.identify(currentUser.id, {
          email: currentUser.email,
          name: currentUser.name,
        });
        setUser(currentUser);
        setBetaMode(config.betaMode);
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const entitlements = user ? computeEntitlements(user, betaMode) : FALLBACK_ENTITLEMENTS;

  return <CurrentUserContext.Provider value={{ user, loading, setUser, betaMode, entitlements }}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUserContext() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUserContext must be used within a CurrentUserProvider");
  return ctx;
}
