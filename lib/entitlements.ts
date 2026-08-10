// entitlements.ts — the whole trial/beta/paywall model in one place. BETA_MODE lives in
// Supabase (public.app_config, a single row) rather than an env var specifically so it can
// be flipped at real launch with one UPDATE statement, no redeploy, no rebuilding this
// system — it's built and wired end-to-end now, just dormant while beta_mode is true.

import { createClient } from "@/lib/supabase/client";

let cached: ReturnType<typeof createClient> | null = null;
function db() {
  if (!cached) cached = createClient();
  return cached;
}
const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop, receiver) {
    return Reflect.get(db(), prop, receiver);
  },
});

const TRIAL_DAYS = 5;

export type AppConfig = { betaMode: boolean };

/** Public read (see schema.sql's "app_config public read" policy) — called both signed-in
 *  (CurrentUserContext, alongside getUser()) and signed-out (the landing page's own Pricing
 *  section, to decide whether to show the beta banner at all). */
export async function getAppConfig(): Promise<AppConfig> {
  const { data, error } = await supabase.from("app_config").select("beta_mode").eq("id", true).maybeSingle();
  if (error) throw error;
  // Fails toward full access, not toward an accidental paywall, if this row is ever
  // unreadable — schema.sql seeds it so this shouldn't happen, but a broken config read
  // locking out every user is a far worse failure mode than one that doesn't restrict yet.
  return { betaMode: data?.beta_mode ?? true };
}

/** now() + 5 days, in the same ISO form the `trial_ends_at` column stores — computed here,
 *  not left to whatever the caller's own date math happens to produce, so signUp() and any
 *  future "restart a trial" admin action agree on exactly what "5 days" means. */
export function trialEndsAtFor(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d.toISOString();
}

export type Entitlements = {
  /** The one flag most call sites should actually check — true while beta_mode is on, the
   *  account is permanently grandfathered in (is_beta_user), or its 5-day trial hasn't
   *  ended yet. False is the post-trial restricted state. */
  fullAccess: boolean;
  blockedSitesLimit: number;
  canUseBreakGates: boolean;
  canUseFriendGroups: boolean;
  /** Explicitly separate from canUseFriendGroups even though Dead Man's Switch can't
   *  actually trigger without a friend group either way — kept as its own flag so it's
   *  checked at its own call site (LockedInOverlay's Group Study emergency-unblock path),
   *  not implied by the friend-groups gate, matching a future world where Dead Man's Switch
   *  could be its own separate paid tier from friend groups generally. */
  canUseDeadMansSwitch: boolean;
  maxBadgeRarity: string[];
  /** Only set when fullAccess is true via an active trial specifically (not beta, not
   *  grandfathered) — for a "N days left in your trial" note. Null otherwise. */
  trialDaysLeft: number | null;
};

const ALL_RARITIES = ["common", "rare", "epic", "mythic", "legendary"];

const FULL_ACCESS_BASE = {
  fullAccess: true as const,
  blockedSitesLimit: Infinity,
  canUseBreakGates: true,
  canUseFriendGroups: true,
  canUseDeadMansSwitch: true,
  maxBadgeRarity: ALL_RARITIES,
};

const RESTRICTED: Entitlements = {
  fullAccess: false,
  blockedSitesLimit: 1,
  canUseBreakGates: false,
  canUseFriendGroups: false,
  canUseDeadMansSwitch: false,
  maxBadgeRarity: ["common"],
  trialDaysLeft: null,
};

/** Pure function, no I/O — every enforcement point and every UI banner in the app computes
 *  its answer through this rather than re-deriving beta/trial logic itself. `now` is a
 *  parameter (not read internally) purely so this stays trivially testable. */
export function computeEntitlements(
  user: { is_beta_user: boolean; trial_ends_at: string | null },
  betaMode: boolean,
  now: Date = new Date()
): Entitlements {
  if (betaMode || user.is_beta_user) {
    return { ...FULL_ACCESS_BASE, trialDaysLeft: null };
  }

  const trialEndsAt = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const msLeft = trialEndsAt ? trialEndsAt.getTime() - now.getTime() : -1;

  if (msLeft > 0) {
    return { ...FULL_ACCESS_BASE, trialDaysLeft: Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000))) };
  }

  return RESTRICTED;
}
