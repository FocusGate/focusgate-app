import { createClient } from "@/lib/supabase/client";
import {
  computeStreakFromSessions,
  computeThemeBreakdown,
  computeLongestGapMinutes,
  getMetricValue,
  parseThreshold,
  getISOWeek,
  hasConsecutiveISOWeeks,
  type BadgeMetricCtx,
} from "@/lib/stats";
import type { SessionMode, ModeConfig } from "@/lib/sessionModes";
import { sendFriendGroupNotificationEmail } from "@/lib/email";
import { getAppConfig, trialEndsAtFor } from "@/lib/entitlements";

let cached: ReturnType<typeof createClient> | null = null;

/** Lazily constructs the browser client so importing this module never throws
 *  just because NEXT_PUBLIC_SUPABASE_URL isn't configured yet. */
function db() {
  if (!cached) cached = createClient();
  return cached;
}

const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop, receiver) {
    return Reflect.get(db(), prop, receiver);
  },
});

// ---------- auth ----------

/**
 * supabase-js wraps some failures (e.g. a 500 from the Auth API when it can't send a
 * confirmation email) in an `AuthRetryableFetchError` whose `.message` is the literal
 * string `"{}"` rather than anything readable — rendering that straight to a form's error
 * text looks broken. Falls back to a friendly message whenever `.message` is missing or
 * looks like a stringified empty object.
 */
export function getAuthErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message && err.message !== "{}") return err.message;
  return fallback;
}

/**
 * When the Supabase project requires email confirmation, `signUp()` returns no session
 * until the user clicks the confirm link — `auth.uid()` is null at that point, so the
 * "users insert own" RLS policy (`auth.uid() = id`) would reject the profile insert here.
 * Only insert eagerly when a session already came back (confirmation disabled); otherwise
 * `signIn()`'s upsert creates the profile once the user actually has an authenticated session.
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
  goals: string[] = [],
  goalTargetDate: string | null = null
) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  if (data.user && data.session) {
    // is_beta_user is permanent from this moment — whatever beta_mode reads *right now*, at
    // the instant of signup, is what this account keeps forever, even after beta_mode later
    // flips to false. trial_ends_at is set unconditionally (not skipped just because beta
    // access covers it today) so the 5-day trial is already ticking underneath beta access
    // from day one, exactly as if beta_mode were already off.
    const { betaMode } = await getAppConfig().catch(() => ({ betaMode: true }));
    const baseProfile = { id: data.user.id, email, name, goals, goal_target_date: goalTargetDate };
    const { error: profileError } = await supabase
      .from("users")
      .insert({ ...baseProfile, is_beta_user: betaMode, trial_ends_at: trialEndsAtFor() });
    if (profileError) {
      // Falls back to the pre-migration column set instead of failing signup outright if
      // is_beta_user/trial_ends_at don't exist in this database yet (supabase/schema.sql's
      // "Pricing / trial / beta mode" migration not applied) — PostgREST reports an unknown
      // insert column as PGRST204, specifically, not any other error shape. Confirmed live:
      // without this fallback, signup breaks completely (not gracefully) the moment this
      // code ships ahead of that migration actually being run.
      if (profileError.code === "PGRST204") {
        const { error: fallbackError } = await supabase.from("users").insert(baseProfile);
        if (fallbackError) throw fallbackError;
      } else {
        throw profileError;
      }
    }
    await seedDefaultBlockedSites(data.user.id, goals);
  }

  return data;
}

/** `ignoreDuplicates` is a safety net for signups made while email confirmation was pending
 *  (see `signUp()`) — it creates the profile row on first authenticated sign-in if it's
 *  still missing, and never overwrites an existing profile's name. */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  if (data.user) {
    // Checked *before* the upsert so we know whether this sign-in is what actually
    // creates the profile row (the email-confirmation-pending path) — only then should
    // the starter block list get seeded, not on every ordinary login.
    const { data: existing } = await supabase.from("users").select("id").eq("id", data.user.id).maybeSingle();

    const { error: profileError } = await supabase.from("users").upsert(
      { id: data.user.id, email: data.user.email ?? email, name: email.split("@")[0] },
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (profileError) throw profileError;
    if (!existing) await seedDefaultBlockedSites(data.user.id);
  }

  return data;
}

/** Passwordless: emails a 6-digit code. `shouldCreateUser` separates signup from login-only. */
export async function sendEmailOtp(email: string, shouldCreateUser: boolean) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser } });
  if (error) throw error;
}

/**
 * Verifies the 6-digit code, then guarantees a `users` profile row exists.
 * OTP signup only creates the auth record — never the profile — and `getUser()`
 * does a `.single()` on that table, so a missing row breaks every authed page.
 * `ignoreDuplicates` keeps an existing profile's name from being overwritten on login.
 */
export async function verifyEmailOtp(email: string, token: string, name?: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;

  if (data.user) {
    const { data: existing } = await supabase.from("users").select("id").eq("id", data.user.id).maybeSingle();

    const { error: profileError } = await supabase.from("users").upsert(
      {
        id: data.user.id,
        email: data.user.email ?? email,
        name: name?.trim() || email.split("@")[0],
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (profileError) throw profileError;
    if (!existing) await seedDefaultBlockedSites(data.user.id);
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (profileError) throw profileError;

  // Self-heals streak decay on every load (see computeAndSyncStreak) rather than trusting
  // a column nothing else keeps current.
  const { streak, longestStreak } = await computeAndSyncStreak(user.id);

  return { ...profile, streak, longest_streak: longestStreak };
}

// ---------- account ----------

/** Deletes the app's profile row (cascades to sessions/blocked_sites/user_badges/
 *  group_members/owned friend_groups via existing FKs) and signs out. Does NOT delete
 *  the underlying Supabase Auth login — that needs a service-role key, which this
 *  project doesn't have configured. Callers must disclose this in the UI. */
export async function deleteAccount(userId: string) {
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) throw error;
  await signOut();
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Emails a recovery link that lands the user on /reset-password with a temporary
 *  recovery session, so `changePassword()` above works there without knowing the old
 *  password. Requires the Supabase project to actually be able to send email (same
 *  requirement as signup confirmation) and /reset-password to be an allowed redirect URL
 *  in the project's Auth settings. */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updateProfile(userId: string, patch: { name: string }) {
  const { data, error } = await supabase.from("users").update(patch).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

// ---------- sessions ----------

/**
 * `duration_minutes` is written here as the *planned* length (so the Chrome extension —
 * which has no other way to know how long a dashboard-started session should run — can
 * read it and mirror the block locally). `endSession()` below overwrites this same column
 * with the *actual* elapsed minutes once the session completes, which is what stats/history
 * already expect to read — no schema change, the column just does double duty depending
 * on `completed`.
 */
export async function startSession(
  userId: string,
  blockedSites: string[],
  durationMinutes: number,
  opts?: { mode?: SessionMode; groupId?: string | null; modeConfig?: ModeConfig | null }
) {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      start_time: new Date().toISOString(),
      duration_minutes: durationMinutes,
      completed: false,
      session_mode: opts?.mode ?? "custom",
      group_id: opts?.groupId ?? null,
      mode_config: opts?.modeConfig ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  return { ...data, blockedSites };
}

/** The signed-in user's currently in-progress session, if any — for a tab that never
 *  itself started the session (e.g. the standalone /lounge page, opened straight from the
 *  extension's "Enter the Lounge" button) and so has no `sessionId` in local component
 *  state to work with. Not used by the dashboard's own start/resume flow, which tracks
 *  sessionId locally from the moment it calls startSession(). */
export type ActiveSession = {
  id: string;
  startTime: string;
  durationMinutes: number;
  mode: SessionMode;
  modeConfig: ModeConfig | null;
  groupId: string | null;
};

export async function getActiveSession(userId: string): Promise<ActiveSession | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, start_time, duration_minutes, session_mode, mode_config, group_id")
    .eq("user_id", userId)
    .eq("completed", false)
    .is("end_time", null)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    startTime: data.start_time,
    durationMinutes: data.duration_minutes ?? 0,
    mode: (data.session_mode as SessionMode) ?? "custom",
    modeConfig: data.mode_config as ModeConfig | null,
    groupId: data.group_id,
  };
}

/** Total seconds this session's main clock has already spent paused — completed breaks
 *  (summed from break_notes' actual_duration_seconds; emergency unblocks excluded, since
 *  those end the session rather than pause it) plus whatever's left of a *currently*
 *  active pause, if any. A page rehydrating an in-progress session (see dashboard's
 *  mount-time active-session fetch) needs this to resume the countdown at the right
 *  remaining time — wall-clock-since-start alone would count paused time as if the user
 *  had been focusing through it. `pauseStartedAt` is inferred (pause_until minus its
 *  requested_seconds), not stored directly — accurate for how pauses are actually created
 *  (see startSessionPause), just not literally the source of truth. */
export async function getSessionPausedSeconds(sessionId: string): Promise<number> {
  const [{ data: notes, error: notesError }, pause] = await Promise.all([
    supabase.from("break_notes").select("actual_duration_seconds").eq("session_id", sessionId).eq("is_emergency", false),
    getSessionPause(sessionId),
  ]);
  if (notesError) throw notesError;

  const completed = (notes ?? []).reduce((sum, n) => sum + (n.actual_duration_seconds ?? 0), 0);

  let current = 0;
  if (pause.pauseUntil && pause.requestedSeconds) {
    const untilMs = new Date(pause.pauseUntil).getTime();
    if (untilMs > Date.now()) {
      const startedAtMs = untilMs - pause.requestedSeconds * 1000;
      current = Math.max(0, Math.round((Date.now() - startedAtMs) / 1000));
    }
  }

  return completed + current;
}

export async function endSession(sessionId: string) {
  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (fetchError) throw fetchError;

  const endTime = new Date();
  const startTime = new Date(session.start_time);
  const durationMinutes = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60000));

  const { data, error } = await supabase
    .from("sessions")
    .update({ end_time: endTime.toISOString(), duration_minutes: durationMinutes, completed: true })
    .eq("id", sessionId)
    .select()
    .single();
  if (error) throw error;

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("total_focus_hours, streak")
    .eq("id", session.user_id)
    .single();
  if (userError) throw userError;

  const addedHours = durationMinutes / 60;
  const { error: updateError } = await supabase
    .from("users")
    .update({ total_focus_hours: (user.total_focus_hours ?? 0) + addedHours })
    .eq("id", session.user_id);
  if (updateError) throw updateError;

  // Streak must be current before the caller runs checkAndUnlockBadges — badge checks
  // read `users.streak` directly and would otherwise see yesterday's value.
  await computeAndSyncStreak(session.user_id);

  return data;
}

/**
 * Recomputes {streak, longestStreak} from the `sessions` table (source of truth, no
 * drift) and writes back to `users` only if changed. Chosen over a pure incremented
 * counter (there's no increment logic anywhere today, and a counter alone can't handle
 * "the user simply didn't open the app on a missed day" decay) and over a pure read-only
 * aggregation (every existing `.streak` reader — getStreak, checkAndUnlockBadges, every
 * page's stat card — reads the stored column; switching them all to a separate read path
 * would be a much bigger change for no real benefit). Called from both `getUser()` (so
 * decay self-heals on every page load) and `endSession()` (so it's instant at completion).
 */
export async function computeAndSyncStreak(userId: string): Promise<{ streak: number; longestStreak: number }> {
  const [{ data: sessions, error: sessionsError }, { data: user, error: userError }] = await Promise.all([
    supabase.from("sessions").select("start_time, completed").eq("user_id", userId).eq("completed", true),
    supabase.from("users").select("streak, longest_streak").eq("id", userId).single(),
  ]);
  if (sessionsError) throw sessionsError;
  if (userError) throw userError;

  const computed = computeStreakFromSessions(sessions ?? []);
  const longestStreak = Math.max(computed.longestStreak, user.longest_streak ?? 0);
  const streak = computed.streak;

  if (streak !== user.streak || longestStreak !== user.longest_streak) {
    const { error: updateError } = await supabase.from("users").update({ streak, longest_streak: longestStreak }).eq("id", userId);
    if (updateError) throw updateError;
  }

  return { streak, longestStreak };
}

export async function getSessions(userId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("start_time", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getStreak(userId: string) {
  const { data, error } = await supabase.from("users").select("streak").eq("id", userId).single();
  if (error) throw error;
  return data.streak as number;
}

export async function getTotalHours(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("total_focus_hours")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data.total_focus_hours as number;
}

export async function getHabitGrid(userId: string, days = 365) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("sessions")
    .select("start_time, duration_minutes")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("start_time", since.toISOString());
  if (error) throw error;

  const byDate = new Map<string, number>();
  for (const row of data) {
    const date = row.start_time.slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + (row.duration_minutes ?? 0));
  }

  return Array.from(byDate.entries()).map(([date, minutes]) => ({ date, minutes }));
}

// ---------- blocked sites ----------

/** Matches the Chrome extension's DEFAULT_BLOCKED_DOMAINS (extension/lib/rules.js) —
 *  keeping the two lists identical means a fresh account's dashboard list and the
 *  extension's fallback list agree before the user has customized anything. */
const DEFAULT_BLOCKED_SITES = [
  "tiktok.com",
  "youtube.com",
  "instagram.com",
  "reddit.com",
  "x.com",
  "twitter.com",
  "discord.com",
  "web.whatsapp.com",
];

/** Extra domains layered on top of DEFAULT_BLOCKED_SITES for onboarding goals whose
 *  distraction pattern isn't already covered by the base social-media list — keyed by
 *  GOAL_OPTIONS[].value (lib/onboarding.ts). Goals without an obvious dedicated site
 *  (exams/grades/habit/procrastination) intentionally have no entry, since the base
 *  list already covers their real-world distraction sources. */
const GOAL_DEFAULT_DOMAINS: Record<string, string[]> = {
  doomscrolling: ["facebook.com", "pinterest.com", "snapchat.com"],
  gaming: ["twitch.tv", "store.steampowered.com", "roblox.com", "epicgames.com"],
};

/** Gives a brand-new account a starter block list instead of an empty one. Only ever
 *  called right after a `users` profile row is first created (see signUp/signIn/
 *  verifyEmailOtp below) — never on an existing account, so a user who's deliberately
 *  cleared their list doesn't get it silently refilled. `goals` (from the onboarding
 *  flow) layers in goal-specific domains on top of the base list — deduped, since a
 *  goal's suggestions can overlap the defaults. */
async function seedDefaultBlockedSites(userId: string, goals: string[] = []) {
  const extra = goals.flatMap((g) => GOAL_DEFAULT_DOMAINS[g] ?? []);
  const domains = Array.from(new Set([...DEFAULT_BLOCKED_SITES, ...extra]));
  const { error } = await supabase
    .from("blocked_sites")
    .insert(domains.map((url, i) => ({ user_id: userId, url, sort_order: i })));
  if (error) throw error;
}

export async function addBlockedSite(userId: string, url: string) {
  const { data, error } = await supabase
    .from("blocked_sites")
    .insert({ user_id: userId, url })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeBlockedSite(userId: string, url: string) {
  const { error } = await supabase
    .from("blocked_sites")
    .delete()
    .eq("user_id", userId)
    .eq("url", url);
  if (error) throw error;
}

export async function getBlockedSites(userId: string) {
  const { data, error } = await supabase
    .from("blocked_sites")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Persists a new drag-to-reorder position for every site in one pass — `orderedIds` is
 *  the full list in its new order, matching what Framer Motion's Reorder.Group hands back. */
export async function reorderBlockedSites(userId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("blocked_sites").update({ sort_order: index }).eq("id", id).eq("user_id", userId)
    )
  );
}

// ---------- preferences ----------

export type BreakGateChallenge = "ask" | "memory-match" | "math-sprint" | "geography-quiz";
export type BreakGateDifficulty = "easy" | "normal" | "hard";

/** "Easy" buys a few extra seconds, "hard" leaves no slack — the spec's
 *  "Easy (5 sec buffer) / Normal (30 sec) / Hard (no time to spare)". */
export const GATE_SECONDS_BY_DIFFICULTY: Record<BreakGateDifficulty, number> = {
  easy: 35,
  normal: 30,
  hard: 22,
};

export type UserPreferences = {
  share_session_starts: boolean;
  notify_friend_activity: boolean;
  session_break_reminders: boolean;
  break_reminder_interval_minutes: number;
  default_session_minutes: number;
  break_gates_enabled: boolean;
  break_gate_default_challenge: BreakGateChallenge;
  break_gate_difficulty: BreakGateDifficulty;
  break_notes_enabled: boolean;
  break_note_min_chars: number;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  share_session_starts: true,
  notify_friend_activity: true,
  session_break_reminders: false,
  break_reminder_interval_minutes: 60,
  default_session_minutes: 60,
  break_gates_enabled: true,
  break_gate_default_challenge: "ask",
  break_gate_difficulty: "normal",
  break_notes_enabled: true,
  break_note_min_chars: 50,
};

/** Reads the friction columns defensively: they were added after `user_preferences` shipped,
 *  so a row written before this migration has them as undefined rather than absent-with-default.
 *  Falling back per-field (instead of trusting the row wholesale) keeps those older rows working. */
function rowToPreferences(data: Record<string, unknown>): UserPreferences {
  return {
    share_session_starts: (data.share_session_starts as boolean) ?? DEFAULT_PREFERENCES.share_session_starts,
    notify_friend_activity: (data.notify_friend_activity as boolean) ?? DEFAULT_PREFERENCES.notify_friend_activity,
    session_break_reminders: (data.session_break_reminders as boolean) ?? DEFAULT_PREFERENCES.session_break_reminders,
    break_reminder_interval_minutes: (data.break_reminder_interval_minutes as number) ?? DEFAULT_PREFERENCES.break_reminder_interval_minutes,
    default_session_minutes: (data.default_session_minutes as number) ?? DEFAULT_PREFERENCES.default_session_minutes,
    break_gates_enabled: (data.break_gates_enabled as boolean) ?? DEFAULT_PREFERENCES.break_gates_enabled,
    break_gate_default_challenge: (data.break_gate_default_challenge as BreakGateChallenge) ?? DEFAULT_PREFERENCES.break_gate_default_challenge,
    break_gate_difficulty: (data.break_gate_difficulty as BreakGateDifficulty) ?? DEFAULT_PREFERENCES.break_gate_difficulty,
    break_notes_enabled: (data.break_notes_enabled as boolean) ?? DEFAULT_PREFERENCES.break_notes_enabled,
    break_note_min_chars: (data.break_note_min_chars as number) ?? DEFAULT_PREFERENCES.break_note_min_chars,
  };
}

/** Returns hardcoded defaults (rather than throwing) when no row exists yet — covers
 *  every user who signed up before this table existed, with no backfill needed. */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_PREFERENCES;
  return rowToPreferences(data);
}

export async function updateUserPreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const current = await getUserPreferences(userId);
  const merged = { ...current, ...patch };
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: userId, ...merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return rowToPreferences(data);
}

// ---------- badges ----------

export async function unlockBadge(userId: string, badgeId: string) {
  const { data: existing } = await supabase
    .from("user_badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_id", badgeId)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("user_badges")
    .insert({ user_id: userId, badge_id: badgeId, unlocked_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserBadges(userId: string) {
  const { data, error } = await supabase
    .from("user_badges")
    .select("*, badges(*)")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

export type BadgeRow = { id: string; name: string; description: string; rarity: string; unlock_condition: string };

// Badges special-cased by name rather than parsed generically from `unlock_condition` —
// either because the condition isn't a `metric >= number` shape (Weekend Warrior, Clean
// Slate, Untouchable), or because it depends on cross-user leaderboard data instead of
// this user's own stats (Iron Focus, handled entirely outside this function — see
// recordWeeklyLeaderboardWin/checkIronFocus below).
const SPECIAL_CASED_BADGES = new Set(["Early Riser", "Clean Slate", "Weekend Warrior", "Untouchable", "Iron Focus"]);

/**
 * Fetches everything checkAndUnlockBadges and getBadgeProgress both need and reduces it
 * to one metric context, so the two don't duplicate five near-identical queries between
 * them. Session-day/weekday checks use UTC hours/day, matching this file's and
 * lib/stats.ts's existing UTC-day convention (no per-user timezone anywhere in this schema).
 */
async function buildBadgeContext(userId: string): Promise<{ badges: BadgeRow[]; ctx: BadgeMetricCtx; alreadyUnlockedIds: Set<string>; special: { hasEarlyRiser: boolean; hasCleanSlate: boolean; hasWeekendWarrior: boolean; untouchable: boolean } }> {
  const [
    { data: badges, error: badgesError },
    { data: user, error: userError },
    { data: sessions, error: sessionsError },
    { data: existing, error: existingError },
    { data: gateAttempts, error: gateError },
    { data: emergency, error: emergencyError },
    { count: interruptedCount, error: interruptedError },
  ] = await Promise.all([
    supabase.from("badges").select("*"),
    supabase.from("users").select("streak, total_focus_hours, blocked_attempts").eq("id", userId).single(),
    supabase.from("sessions").select("id, start_time, duration_minutes, completed").eq("user_id", userId).eq("completed", true),
    supabase.from("user_badges").select("badge_id").eq("user_id", userId),
    supabase.from("break_gate_attempts").select("session_id, passed").eq("user_id", userId),
    supabase.from("emergency_unblocks").select("session_id").eq("user_id", userId),
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("interrupted_by_uninstall", true),
  ]);
  if (badgesError) throw badgesError;
  if (userError) throw userError;
  if (sessionsError) throw sessionsError;
  if (existingError) throw existingError;
  if (gateError) throw gateError;
  if (emergencyError) throw emergencyError;
  if (interruptedError) throw interruptedError;

  const alreadyUnlockedIds = new Set((existing ?? []).map((b) => b.badge_id));
  const sessionsWithGateAttempt = new Set((gateAttempts ?? []).map((a) => a.session_id).filter((id): id is string => !!id));
  const emergencySessionIds = new Set((emergency ?? []).map((e) => e.session_id).filter((id): id is string => !!id));

  const completedCount = sessions?.length ?? 0;
  const longestSessionMinutes = Math.max(0, ...(sessions ?? []).map((s) => s.duration_minutes ?? 0));
  const cleanSessions = (sessions ?? []).filter((s) => !emergencySessionIds.has(s.id)).length;
  const breakGatesPassed = (gateAttempts ?? []).filter((a) => a.passed).length;

  const ctx: BadgeMetricCtx = {
    completedCount,
    streak: user.streak ?? 0,
    longestSessionMinutes,
    totalFocusHours: user.total_focus_hours ?? 0,
    blockedAttempts: user.blocked_attempts ?? 0,
    breakGatesPassed,
    cleanSessions,
  };

  const special = {
    hasEarlyRiser: (sessions ?? []).some((s) => new Date(s.start_time).getUTCHours() < 8),
    hasCleanSlate: (sessions ?? []).some((s) => !sessionsWithGateAttempt.has(s.id)),
    // "Both Saturday and Sunday" — checked cumulatively across all-time sessions, not
    // necessarily the same calendar weekend (keeps this an easy, common-tier badge).
    hasWeekendWarrior: (sessions ?? []).some((s) => new Date(s.start_time).getUTCDay() === 6) && (sessions ?? []).some((s) => new Date(s.start_time).getUTCDay() === 0),
    // All-time, not just within the current streak window — zero interrupted sessions ever.
    untouchable: (user.streak ?? 0) >= 90 && (interruptedCount ?? 0) === 0,
  };

  return { badges: (badges ?? []) as BadgeRow[], ctx, alreadyUnlockedIds, special };
}

/**
 * Evaluates the fixed FocusGate badge set against the user's current stats
 * and unlocks any newly-earned ones. Matched by badge name since
 * `unlock_condition` is free-form copy, not a machine-readable rule.
 */
export type NewlyUnlockedBadge = { id: string; name: string; description: string; rarity: string; unlocked_at: string };

/** `allowedRarities` — restricted (post-trial, non-beta) accounts stop earning anything
 *  above Common; omit it (every other caller) for unrestricted behavior. Filtered before
 *  the already-unlocked check below, not after — a badge a restricted account technically
 *  qualifies for but can't earn shouldn't consume a "newly unlocked" slot or otherwise be
 *  treated as earned; it'll unlock for real the moment they're no longer restricted and
 *  this runs again. */
export async function checkAndUnlockBadges(userId: string, allowedRarities?: string[]): Promise<NewlyUnlockedBadge[]> {
  const { badges, ctx, alreadyUnlockedIds, special } = await buildBadgeContext(userId);

  const earned = badges.filter((badge) => {
    if (allowedRarities && !allowedRarities.includes(badge.rarity)) return false;
    switch (badge.name) {
      case "Early Riser":
        return special.hasEarlyRiser;
      case "Clean Slate":
        return special.hasCleanSlate;
      case "Weekend Warrior":
        return special.hasWeekendWarrior;
      case "Untouchable":
        return special.untouchable;
      case "Iron Focus":
        return false; // handled by recordWeeklyLeaderboardWin/checkIronFocus, not here
      default: {
        const parsed = parseThreshold(badge.unlock_condition);
        if (!parsed) return false;
        const value = getMetricValue(parsed.metric, ctx);
        return value !== null && value >= parsed.target;
      }
    }
  });

  // Filtered to badges the user didn't already have — unlockBadge() itself is idempotent
  // (returns the existing row rather than erroring), but without this filter every badge
  // the user ever qualified for would be re-reported as "newly unlocked" on every single
  // session completion, since `earned` re-matches all of them every time this runs.
  const newlyUnlocked: NewlyUnlockedBadge[] = [];
  for (const badge of earned) {
    if (alreadyUnlockedIds.has(badge.id)) continue;
    const row = await unlockBadge(userId, badge.id);
    newlyUnlocked.push({ id: badge.id, name: badge.name, description: badge.description, rarity: badge.rarity, unlocked_at: row.unlocked_at });
  }
  return newlyUnlocked;
}

const PROGRESS_ELIGIBLE_BADGES = new Set([
  "First Lock",
  "On Fire",
  "Deep Worker",
  "Unstoppable",
  "FocusGate Legend",
  "Gate Keeper",
  "No Excuses",
  "Century Club",
  "Distraction Slayer",
  "The Regulator",
]);

export type BadgeProgress = {
  badge: BadgeRow;
  unlocked: boolean;
  current: number;
  target: number;
  pct: number;
};

/** Progress bars only for numeric-threshold badges — everything in SPECIAL_CASED_BADGES
 *  (time-of-day/weekday/streak-condition badges) is deliberately omitted rather than shown
 *  with a fake 0% bar, same as the original Early Bird/Night Owl exclusion. */
export async function getBadgeProgress(userId: string): Promise<BadgeProgress[]> {
  const { badges, ctx, alreadyUnlockedIds } = await buildBadgeContext(userId);

  const result: BadgeProgress[] = [];
  for (const badge of badges) {
    if (SPECIAL_CASED_BADGES.has(badge.name) || !PROGRESS_ELIGIBLE_BADGES.has(badge.name)) continue;
    const parsed = parseThreshold(badge.unlock_condition);
    if (!parsed) continue;
    // Metrics like total_focus_hours accumulate as a raw float (e.g. 0.9333333333333333
    // hours) — round to 1 decimal before it ever reaches the UI, since "current / target"
    // is rendered verbatim by BadgeCard/BadgeProgressBar with no formatting of its own.
    const rawCurrent = getMetricValue(parsed.metric, ctx) ?? 0;
    const current = Math.round(rawCurrent * 10) / 10;
    result.push({
      badge,
      unlocked: alreadyUnlockedIds.has(badge.id),
      current: Math.min(current, parsed.target),
      target: parsed.target,
      pct: Math.max(0, Math.min(100, Math.round((rawCurrent / parsed.target) * 100))),
    });
  }
  return result;
}

/**
 * Records "this user was #1 on this group's leaderboard this ISO week" and checks whether
 * that completes a 4-consecutive-week run for "Iron Focus". Call this wherever a group
 * leaderboard is loaded (currently The Gates page) — there's no cron job in this stack, so
 * a week nobody visits the page in never gets a winner recorded. Best-effort by design:
 * failures here must never break the leaderboard render itself.
 */
export async function recordWeeklyLeaderboardWin(groupId: string, userId: string): Promise<void> {
  const leaderboard = await getGroupLeaderboard(groupId);
  if (leaderboard.length === 0 || leaderboard[0].userId !== userId) return;

  const isoWeek = getISOWeek(new Date());
  const { error } = await supabase
    .from("weekly_leaderboard_wins")
    .upsert({ user_id: userId, group_id: groupId, iso_week: isoWeek }, { onConflict: "user_id,group_id,iso_week" });
  if (error) throw error;

  await checkIronFocus(userId);
}

async function checkIronFocus(userId: string): Promise<void> {
  const { data, error } = await supabase.from("weekly_leaderboard_wins").select("group_id, iso_week").eq("user_id", userId);
  if (error) throw error;

  const byGroup = new Map<string, string[]>();
  for (const row of data ?? []) {
    const weeks = byGroup.get(row.group_id) ?? [];
    weeks.push(row.iso_week);
    byGroup.set(row.group_id, weeks);
  }

  const qualifies = Array.from(byGroup.values()).some((weeks) => hasConsecutiveISOWeeks(weeks, 4));
  if (qualifies) await unlockBadgeByName(userId, "Iron Focus");
}

// ---------- friend groups ----------

export async function createFriendGroup(userId: string, name: string) {
  const { data: group, error } = await supabase
    .from("friend_groups")
    .insert({ name, created_by: userId })
    .select()
    .single();
  if (error) throw error;

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: userId });
  if (memberError) throw memberError;

  return group;
}

export async function joinFriendGroup(userId: string, groupId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function notifyFriendGroup(userId: string, groupId: string, message: string) {
  // users(email, name) rides the group_members -> users foreign key (RLS already allows
  // reading a group-mate's profile, not just your own — see schema.sql's "users read own"
  // policy comment) — one round trip gets both the id list for the notifications insert
  // below and the email/name each member's notification email needs, rather than a second
  // query for the same rows.
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("user_id, users(email, name)")
    .eq("group_id", groupId)
    .neq("user_id", userId);
  if (membersError) throw membersError;

  if (!members.length) return [];

  const { data, error } = await supabase
    .from("notifications")
    .insert(
      members.map((m) => ({
        user_id: m.user_id,
        group_id: groupId,
        message,
        created_at: new Date().toISOString(),
        read: false,
      }))
    )
    .select();
  if (error) throw error;

  // Fire-and-forget, second channel alongside the in-app notification rows just inserted —
  // a missing/null profile join (shouldn't happen given the FK, but Supabase types it as
  // possibly null) just skips that member's email rather than failing the whole notify call.
  for (const m of members) {
    const profile = m.users as unknown as { email: string; name: string } | null;
    if (profile?.email) void sendFriendGroupNotificationEmail(profile.email, profile.name, message);
  }

  return data;
}

export type GroupSummary = {
  id: string;
  name: string;
  members: { id: string; name: string }[];
};

type FriendGroupRow = { id: string; name: string };
type UserRow = { id: string; name: string };

/** Replaces the previous N+1 (one count query per group) pattern in the Friends page —
 *  one query for memberships, one batched query for every member row across those
 *  groups. Returns the full member roster (not just a count) since "members with
 *  avatars" needs names, not just how many. */
export async function getUserGroups(userId: string): Promise<GroupSummary[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from("group_members")
    .select("group_id, friend_groups(id, name)")
    .eq("user_id", userId);
  if (membershipsError) throw membershipsError;

  const groups = (memberships ?? [])
    .map((m) => (Array.isArray(m.friend_groups) ? m.friend_groups[0] : m.friend_groups) as FriendGroupRow | null)
    .filter((g): g is FriendGroupRow => !!g);

  if (groups.length === 0) return [];
  const groupIds = groups.map((g) => g.id);

  const { data: allMembers, error: membersError } = await supabase
    .from("group_members")
    .select("group_id, users(id, name)")
    .in("group_id", groupIds);
  if (membersError) throw membersError;

  const byGroup = new Map<string, { id: string; name: string }[]>();
  for (const row of allMembers ?? []) {
    const user = (Array.isArray(row.users) ? row.users[0] : row.users) as UserRow | null;
    if (!user) continue;
    const list = byGroup.get(row.group_id) ?? [];
    list.push({ id: user.id, name: user.name });
    byGroup.set(row.group_id, list);
  }

  return groups.map((g) => ({ id: g.id, name: g.name, members: byGroup.get(g.id) ?? [] }));
}

export type PresenceEntry = { userId: string; name: string; startedAt: string };

// Comfortably above the longest realistic session (Deep Worker's 4hr) — with no
// heartbeat, only polling, anything older than this is treated as stale/abandoned
// rather than "still studying."
const PRESENCE_STALE_MS = 6 * 60 * 60 * 1000;

/** Polled every ~15-20s while the Friends page is mounted (confirmed approach — not
 *  Supabase Realtime, which would need channel/subscription lifecycle management this
 *  project doesn't have yet). */
export async function getGroupPresence(groupId: string): Promise<PresenceEntry[]> {
  const { data: members, error: membersError } = await supabase.from("group_members").select("user_id").eq("group_id", groupId);
  if (membersError) throw membersError;

  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("user_id, start_time, users(name)")
    .in("user_id", userIds)
    .eq("completed", false)
    .is("end_time", null);
  if (sessionsError) throw sessionsError;

  const cutoff = Date.now() - PRESENCE_STALE_MS;
  const entries = (sessions ?? [])
    .filter((s) => new Date(s.start_time).getTime() >= cutoff)
    .map((s) => {
      const user = (Array.isArray(s.users) ? s.users[0] : s.users) as UserRow | null;
      return { userId: s.user_id, name: user?.name ?? "Someone", startedAt: s.start_time };
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  // A user can end up with more than one completed=false/end_time=null row at once — e.g.
  // closing the laptop mid-session (never properly ended) and then starting a fresh one
  // later. Callers (GroupPresenceRow, GroupCard) key their list by userId, so without this
  // dedup they'd render — and React would warn on — duplicate entries for the same person.
  // Sorted newest-first above, so keeping the first occurrence per user keeps their most
  // recent session.
  const byUser = new Map<string, PresenceEntry>();
  for (const entry of entries) {
    if (!byUser.has(entry.userId)) byUser.set(entry.userId, entry);
  }
  return Array.from(byUser.values());
}

export type SessionFeedItem = {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  durationMinutes: number | null;
  completed: boolean;
};

/** Recent sessions across a group's members, already permitted by the existing
 *  "sessions read groupmates" RLS policy. Kept separate from the free-text
 *  `notifications` table rather than bolting a session_id onto it. */
export async function getGroupSessionFeed(groupId: string, limit = 20): Promise<SessionFeedItem[]> {
  const { data: members, error: membersError } = await supabase.from("group_members").select("user_id").eq("group_id", groupId);
  if (membersError) throw membersError;

  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("sessions")
    .select("id, user_id, start_time, duration_minutes, completed, users(name)")
    .in("user_id", userIds)
    .order("start_time", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((s) => {
    const user = (Array.isArray(s.users) ? s.users[0] : s.users) as UserRow | null;
    return {
      id: s.id,
      userId: s.user_id,
      userName: user?.name ?? "Someone",
      startTime: s.start_time,
      durationMinutes: s.duration_minutes,
      completed: s.completed,
    };
  });
}

/** Toggle: inserts a reaction if the user hasn't reacted to this session yet, removes it
 *  if they have. */
export async function reactToSession(sessionId: string, userId: string, emoji = "🔥") {
  const { data: existing, error: existingError } = await supabase
    .from("session_reactions")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase.from("session_reactions").delete().eq("id", existing.id);
    if (error) throw error;
    return { reacted: false };
  }

  const { error } = await supabase.from("session_reactions").insert({ session_id: sessionId, user_id: userId, emoji });
  if (error) throw error;
  return { reacted: true };
}

export async function getSessionReactions(
  sessionIds: string[],
  userId: string
): Promise<Record<string, { count: number; reactedByMe: boolean }>> {
  if (sessionIds.length === 0) return {};
  const { data, error } = await supabase.from("session_reactions").select("session_id, user_id").in("session_id", sessionIds);
  if (error) throw error;

  const result: Record<string, { count: number; reactedByMe: boolean }> = {};
  for (const id of sessionIds) result[id] = { count: 0, reactedByMe: false };
  for (const row of data ?? []) {
    const entry = result[row.session_id] ?? { count: 0, reactedByMe: false };
    entry.count += 1;
    if (row.user_id === userId) entry.reactedByMe = true;
    result[row.session_id] = entry;
  }
  return result;
}

// ---------- brain games ----------

export type GameSlug = "memory-match" | "math-sprint" | "geography-quiz";

export async function getGameBest(userId: string, game: GameSlug): Promise<number | null> {
  const { data, error } = await supabase.from("game_scores").select("best_score").eq("user_id", userId).eq("game", game).maybeSingle();
  if (error) throw error;
  return data ? Number(data.best_score) : null;
}

/** Upserts the new best only if it actually beats the stored one — returns whether it did,
 *  so callers can show a "New best!" moment. */
export async function saveGameBest(userId: string, game: GameSlug, score: number, higherIsBetter: boolean): Promise<boolean> {
  const current = await getGameBest(userId, game);
  const isNewBest = current === null || (higherIsBetter ? score > current : score < current);
  if (!isNewBest) return false;

  const { error } = await supabase
    .from("game_scores")
    .upsert({ user_id: userId, game, best_score: score, higher_is_better: higherIsBetter, updated_at: new Date().toISOString() }, { onConflict: "user_id,game" });
  if (error) throw error;
  return true;
}

// ---------- Friction Triggers: break gates ----------

async function unlockBadgeByName(userId: string, name: string): Promise<void> {
  const { data: badge, error } = await supabase.from("badges").select("id").eq("name", name).maybeSingle();
  if (error) throw error;
  if (!badge) return; // migration not run yet — fail soft rather than throw
  await unlockBadge(userId, badge.id);
}

/** Logs a break-gate pass/fail attempt. A pass also unlocks "Focused Under Pressure" —
 *  checked directly by name here rather than through checkAndUnlockBadges' generic
 *  `metric >= threshold` parser, since "passed at least one gate" isn't a numeric-metric
 *  badge tied to session stats. Badge-unlock failure doesn't fail the whole call — the
 *  attempt itself is the thing that must not silently drop. */
export async function logBreakGateAttempt(userId: string, sessionId: string | null, game: GameSlug, passed: boolean): Promise<void> {
  const { error } = await supabase.from("break_gate_attempts").insert({ user_id: userId, session_id: sessionId, game, passed });
  if (error) throw error;
  if (passed) {
    try {
      await unlockBadgeByName(userId, "Focused Under Pressure");
    } catch {
      // non-fatal — the pass is already logged
    }
  }
}

export type BreakGateStats = { passedThisMonth: number; failedThisMonth: number; extraFocusMinutes: number };

/** Every failed gate is a break that never happened, so the session kept running — that's
 *  the "session continued for N extra minutes" figure, derived rather than separately
 *  tracked (there's no clock event to record; the absence of a pause *is* the data). */
export async function getBreakGateStats(userId: string, breakMinutes: number): Promise<BreakGateStats> {
  const monthStart = startOfCurrentMonthISO();
  const { data, error } = await supabase
    .from("break_gate_attempts")
    .select("passed")
    .eq("user_id", userId)
    .gte("created_at", monthStart);
  if (error) throw error;

  const passedThisMonth = (data ?? []).filter((r) => r.passed).length;
  const failedThisMonth = (data ?? []).filter((r) => !r.passed).length;
  return { passedThisMonth, failedThisMonth, extraFocusMinutes: failedThisMonth * breakMinutes };
}

function startOfCurrentMonthISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export type CramReportStats = { gatesPassed: number; gatesFaced: number };

/** Exam Cram's end-of-session "Cram Report" — gates faced/passed for *this* session
 *  specifically (unlike getBreakGateStats, which is a monthly rollup across all
 *  sessions). "Distractions blocked" in the mode's spec maps onto gatesFaced: every gate
 *  faced was a moment Break Gates stood between the user and a distraction. */
export async function getCramReportStats(sessionId: string): Promise<CramReportStats> {
  const { data, error } = await supabase.from("break_gate_attempts").select("passed").eq("session_id", sessionId);
  if (error) throw error;
  const gatesFaced = data?.length ?? 0;
  const gatesPassed = (data ?? []).filter((r) => r.passed).length;
  return { gatesFaced, gatesPassed };
}

/** Completed sessions the user got through without a single group violation — the
 *  Dead Man's Switch "sessions completed without breaking" number. Sessions are counted
 *  across all the user's groups, since a violation in any group broke that session. */
export async function getSessionsWithoutViolation(userId: string): Promise<number> {
  const [{ data: sessions, error: sessionsError }, { data: violations, error: violationsError }] = await Promise.all([
    supabase.from("sessions").select("id").eq("user_id", userId).eq("completed", true),
    supabase.from("group_violations").select("session_id").eq("user_id", userId),
  ]);
  if (sessionsError) throw sessionsError;
  if (violationsError) throw violationsError;

  const violatedSessionIds = new Set((violations ?? []).map((v) => v.session_id).filter((id): id is string => !!id));
  return (sessions ?? []).filter((s) => !violatedSessionIds.has(s.id)).length;
}

// ---------- Friction Triggers: break notes ----------

export type BreakNote = {
  id: string;
  noteText: string;
  breakDurationMinutes: number | null;
  isEmergency: boolean;
  createdAt: string;
};

/**
 * Records a break request. `requestedSeconds` is the precise, custom-slider duration (1
 * to 15 minutes — see lib/stats.ts's MIN/MAX_BREAK_SECONDS); the legacy
 * `break_duration_minutes` column is still populated (rounded) alongside the new
 * `break_duration_seconds` for anything that hasn't moved off it. Returns the new row's id
 * so the caller can later report how long the break actually ran via
 * updateBreakNoteActualDuration() — early returns end it before the requested time.
 */
export async function saveBreakNote(
  userId: string,
  sessionId: string | null,
  noteText: string,
  requestedSeconds: number | null,
  isEmergency: boolean
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("break_notes")
    .insert({
      user_id: userId,
      session_id: sessionId,
      note_text: noteText,
      break_duration_minutes: requestedSeconds != null ? Math.round(requestedSeconds / 60) : null,
      break_duration_seconds: requestedSeconds,
      is_emergency: isEmergency,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** Reports how long a break actually ran, once it ends (naturally or via "I'm ready, back
 *  to focus"). Best-effort by the caller's design — a failure here must never block the
 *  session from actually resuming, so every call site wraps this in .catch(() => {}). */
export async function updateBreakNoteActualDuration(breakNoteId: string, actualSeconds: number): Promise<void> {
  const { error } = await supabase
    .from("break_notes")
    .update({ actual_duration_seconds: Math.round(actualSeconds) })
    .eq("id", breakNoteId);
  if (error) throw error;
}

// ---------- live break/pause state (shared source of truth with the extension) ----------
// A break used to be pure local state — React state here, chrome.storage.local on the
// extension — so starting one on either surface was invisible to the other, and reloading
// mid-break lost it entirely. These functions read/write the pause_* columns on the
// session's own row instead, which both surfaces now treat as the single source of truth
// (see LockedInOverlay.tsx's applyRemotePause and extension/background.js's
// mergeRemotePause).

export type SessionPause = {
  pauseUntil: string | null;
  pauseType: "break" | "auto" | null;
  breakNoteId: string | null;
  requestedSeconds: number | null;
  skippable: boolean;
  reminderText: string | null;
  noteText: string | null;
};

type SessionPauseColumns = {
  pause_until: string | null;
  pause_type: "break" | "auto" | null;
  pause_break_note_id: string | null;
  pause_requested_seconds: number | null;
  pause_skippable: boolean;
  pause_reminder_text: string | null;
  pause_note_text: string | null;
};

const PAUSE_SELECT = "pause_until, pause_type, pause_break_note_id, pause_requested_seconds, pause_skippable, pause_reminder_text, pause_note_text";

function mapPauseRow(row: SessionPauseColumns): SessionPause {
  return {
    pauseUntil: row.pause_until,
    pauseType: row.pause_type,
    breakNoteId: row.pause_break_note_id,
    requestedSeconds: row.pause_requested_seconds,
    skippable: row.pause_skippable,
    reminderText: row.pause_reminder_text,
    noteText: row.pause_note_text,
  };
}

/** Current pause state for one session — call on mount so a page load mid-break (or a
 *  break that started on the extension moments before this tab opened) is picked up
 *  immediately, without waiting for the first Realtime event. */
export async function getSessionPause(sessionId: string): Promise<SessionPause> {
  const { data, error } = await supabase.from("sessions").select(PAUSE_SELECT).eq("id", sessionId).single();
  if (error) throw error;
  return mapPauseRow(data as SessionPauseColumns);
}

/** Starts (or replaces) the live pause on a session — writing this is what a break
 *  "starting" *means* now, from either surface's point of view. Blocking by design (every
 *  call site awaits and surfaces a failure rather than falling back to a local-only break):
 *  a break that only exists in this tab's React state is exactly the split-brain state this
 *  whole mechanism exists to eliminate. */
export async function startSessionPause(
  sessionId: string,
  opts: {
    untilIso: string;
    type: "break" | "auto";
    breakNoteId: string | null;
    requestedSeconds: number;
    skippable: boolean;
    noteText: string;
    reminderText?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({
      pause_until: opts.untilIso,
      pause_type: opts.type,
      pause_break_note_id: opts.breakNoteId,
      pause_requested_seconds: opts.requestedSeconds,
      pause_skippable: opts.skippable,
      pause_reminder_text: opts.reminderText ?? null,
      pause_note_text: opts.noteText,
    })
    .eq("id", sessionId);
  if (error) throw error;
}

/** Clears the live pause — a break "ending," from either surface, whichever one actually
 *  triggered it (naturally running out, or an early "back to focus"). The *other* surface
 *  never calls this on its own behalf; it only reacts to seeing pause_until go null (see
 *  applyRemotePause), so actual-duration reporting to break_notes never double-writes. */
export async function endSessionPause(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({
      pause_until: null,
      pause_type: null,
      pause_break_note_id: null,
      pause_requested_seconds: null,
      pause_skippable: true,
      pause_reminder_text: null,
      pause_note_text: null,
    })
    .eq("id", sessionId);
  if (error) throw error;
}

/** Live pause-state updates for one session — the web app's own tab reflecting a break
 *  started (or ended) from the Chrome extension within about a second. Same Realtime
 *  pattern as subscribeToGroupViolations. Returns an unsubscribe function; callers must
 *  invoke it on unmount. */
export function subscribeToSessionPause(sessionId: string, onChange: (pause: SessionPause) => void): () => void {
  const channel = supabase
    .channel(`session-pause-${sessionId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
      (payload) => {
        onChange(mapPauseRow(payload.new as SessionPauseColumns));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** How many (non-emergency) breaks have already been taken during this specific
 *  session — the count that maxBreaksForDuration()'s cap is checked against. */
export async function getBreakNoteCountForSession(sessionId: string): Promise<number> {
  const { count, error } = await supabase
    .from("break_notes")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("is_emergency", false);
  if (error) throw error;
  return count ?? 0;
}

export async function getBreakNoteHistory(userId: string, limit = 50): Promise<BreakNote[]> {
  const { data, error } = await supabase
    .from("break_notes")
    .select("id, note_text, break_duration_minutes, is_emergency, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    noteText: r.note_text,
    breakDurationMinutes: r.break_duration_minutes,
    isEmergency: r.is_emergency,
    createdAt: r.created_at,
  }));
}

export type BreakNoteStats = { themeBreakdown: { theme: string; pct: number }[]; longestGapMinutes: number };

export async function getBreakNoteStats(userId: string): Promise<BreakNoteStats> {
  const notes = await getBreakNoteHistory(userId, 200);
  return {
    themeBreakdown: computeThemeBreakdown(notes.map((n) => ({ note_text: n.noteText }))),
    longestGapMinutes: computeLongestGapMinutes(notes.map((n) => n.createdAt)),
  };
}

// ---------- Friction Triggers: emergency unblocks ----------

export const MAX_FREE_EMERGENCY_UNBLOCKS = 2;

export async function recordEmergencyUnblock(userId: string, sessionId: string | null, reasonText: string, wasPaid: boolean): Promise<void> {
  const { error } = await supabase
    .from("emergency_unblocks")
    .insert({ user_id: userId, session_id: sessionId, reason_text: reasonText, was_paid: wasPaid });
  if (error) throw error;
}

export type EmergencyUnblockEntry = { id: string; reasonText: string; wasPaid: boolean; createdAt: string };

export async function getEmergencyUnblockHistory(userId: string, limit = 10): Promise<EmergencyUnblockEntry[]> {
  const { data, error } = await supabase
    .from("emergency_unblocks")
    .select("id, reason_text, was_paid, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, reasonText: r.reason_text, wasPaid: r.was_paid, createdAt: r.created_at }));
}

export type EmergencyUnblockStats = { usedThisMonth: number; usedAllTime: number; sessionsWithoutEmergency: number };

/** `usedThisMonth` is computed on read from raw rows (matches the existing streak/badge
 *  pattern of computing-on-read rather than storing a counter that needs a reset job). */
export async function getEmergencyUnblockStats(userId: string): Promise<EmergencyUnblockStats> {
  const [{ data: unblocks, error: unblocksError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase.from("emergency_unblocks").select("created_at, session_id").eq("user_id", userId),
    supabase.from("sessions").select("id").eq("user_id", userId).eq("completed", true),
  ]);
  if (unblocksError) throw unblocksError;
  if (sessionsError) throw sessionsError;

  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const usedThisMonth = (unblocks ?? []).filter((u) => new Date(u.created_at).getTime() >= monthStart).length;
  const usedAllTime = (unblocks ?? []).length;
  const emergencySessionIds = new Set((unblocks ?? []).map((u) => u.session_id).filter((id): id is string => !!id));
  const sessionsWithoutEmergency = (sessions ?? []).filter((s) => !emergencySessionIds.has(s.id)).length;

  return { usedThisMonth, usedAllTime, sessionsWithoutEmergency };
}

// ---------- Friction Triggers: Dead Man's Switch ----------

export type GroupSettings = {
  notifyOnViolation: boolean;
  pauseStreakOnViolation: boolean;
  cooldownMinutes: number;
  silentMode: boolean;
};

export type GroupForFriction = {
  id: string;
  name: string;
  createdBy: string;
  settings: GroupSettings;
  members: { id: string; name: string }[];
};

export async function getGroupForFriction(groupId: string): Promise<GroupForFriction | null> {
  const { data: group, error } = await supabase
    .from("friend_groups")
    .select("id, name, created_by, notify_on_violation, pause_streak_on_violation, cooldown_minutes, silent_mode")
    .eq("id", groupId)
    .maybeSingle();
  if (error) throw error;
  if (!group) return null;

  const { data: memberRows, error: memberError } = await supabase.from("group_members").select("users(id, name)").eq("group_id", groupId);
  if (memberError) throw memberError;

  const members = (memberRows ?? [])
    .map((r) => (Array.isArray(r.users) ? r.users[0] : r.users) as UserRow | null)
    .filter((u): u is UserRow => !!u);

  return {
    id: group.id,
    name: group.name,
    createdBy: group.created_by,
    settings: {
      notifyOnViolation: group.notify_on_violation,
      pauseStreakOnViolation: group.pause_streak_on_violation,
      cooldownMinutes: group.cooldown_minutes,
      silentMode: group.silent_mode,
    },
    members,
  };
}

export async function updateGroupSettings(
  groupId: string,
  patch: Partial<{ notifyOnViolation: boolean; pauseStreakOnViolation: boolean; cooldownMinutes: number; silentMode: boolean }>
): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.notifyOnViolation !== undefined) dbPatch.notify_on_violation = patch.notifyOnViolation;
  if (patch.pauseStreakOnViolation !== undefined) dbPatch.pause_streak_on_violation = patch.pauseStreakOnViolation;
  if (patch.cooldownMinutes !== undefined) dbPatch.cooldown_minutes = patch.cooldownMinutes;
  if (patch.silentMode !== undefined) dbPatch.silent_mode = patch.silentMode;
  // RLS ("friend_groups update by creator") is what actually enforces creator-only writes —
  // this guards against a wasted round-trip for a caller that shouldn't be calling it at all.
  const { error } = await supabase.from("friend_groups").update(dbPatch).eq("id", groupId);
  if (error) throw error;
}

export type GroupViolation = {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  attemptedSite: string | null;
  comebackNote: string | null;
  createdAt: string;
};

/** Inserts a violation. Today the only caller is the in-app "Simulate slip-up" button —
 *  no browser extension exists yet to detect a real blocked-site visit. A future extension
 *  is just one more caller of this same function; nothing else needs to change. */
export async function reportGroupViolation(groupId: string, userId: string, sessionId: string | null, attemptedSite: string | null): Promise<void> {
  const { error } = await supabase
    .from("group_violations")
    .insert({ group_id: groupId, user_id: userId, session_id: sessionId, attempted_site: attemptedSite });
  if (error) throw error;
}

export async function submitComebackNote(violationId: string, note: string): Promise<void> {
  const { error } = await supabase.from("group_violations").update({ comeback_note: note }).eq("id", violationId);
  if (error) throw error;
}

export async function getGroupViolations(groupId: string, limit = 20): Promise<GroupViolation[]> {
  const { data, error } = await supabase
    .from("group_violations")
    .select("id, group_id, user_id, attempted_site, comeback_note, created_at, users(name)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const user = (Array.isArray(r.users) ? r.users[0] : r.users) as UserRow | null;
    return {
      id: r.id,
      groupId: r.group_id,
      userId: r.user_id,
      userName: user?.name ?? "Someone",
      attemptedSite: r.attempted_site,
      comebackNote: r.comeback_note,
      createdAt: r.created_at,
    };
  });
}

export type GroupStudyMemberResult = { userId: string; name: string; streak: number; finished: boolean; broke: boolean };

/** Group Study's end-of-session summary — who in the group finished a session bound to
 *  this same group (sessions.group_id) since the session started, and who triggered a
 *  Dead Man's Switch violation (group_violations) in that window. `sinceIso` is the
 *  session's own start_time — scoping to "since this session began" rather than all-time
 *  is what makes this a summary of *this* lock-in, not the group's whole history. */
export async function getGroupStudySummary(groupId: string, sinceIso: string): Promise<GroupStudyMemberResult[]> {
  const { data: memberRows, error: memberError } = await supabase.from("group_members").select("users(id, name, streak)").eq("group_id", groupId);
  if (memberError) throw memberError;

  const members = (memberRows ?? [])
    .map((r) => (Array.isArray(r.users) ? r.users[0] : r.users) as (UserRow & { streak: number }) | null)
    .filter((u): u is UserRow & { streak: number } => !!u);
  const userIds = members.map((m) => m.id);
  if (userIds.length === 0) return [];

  const [{ data: sessions, error: sessionsError }, { data: violations, error: violationsError }] = await Promise.all([
    supabase.from("sessions").select("user_id, completed").eq("group_id", groupId).in("user_id", userIds).gte("start_time", sinceIso),
    supabase.from("group_violations").select("user_id").eq("group_id", groupId).in("user_id", userIds).gte("created_at", sinceIso),
  ]);
  if (sessionsError) throw sessionsError;
  if (violationsError) throw violationsError;

  const finishedIds = new Set((sessions ?? []).filter((s) => s.completed).map((s) => s.user_id));
  const brokeIds = new Set((violations ?? []).map((v) => v.user_id));

  return members.map((m) => ({ userId: m.id, name: m.name, streak: m.streak ?? 0, finished: finishedIds.has(m.id), broke: brokeIds.has(m.id) }));
}

/** First use of Supabase Realtime in this codebase — everywhere else (e.g. getGroupPresence)
 *  deliberately polls instead, but Dead Man's Switch is meant to feel instant ("all group
 *  members get instant notification"), which polling's 15-20s lag can't deliver. Returns an
 *  unsubscribe function; callers must invoke it on unmount. */
export function subscribeToGroupViolations(
  groupId: string,
  onViolation: (violation: { userId: string; attemptedSite: string | null; createdAt: string }) => void
): () => void {
  const channel = supabase
    .channel(`group-violations-${groupId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "group_violations", filter: `group_id=eq.${groupId}` },
      (payload) => {
        const row = payload.new as { user_id: string; attempted_site: string | null; created_at: string };
        onViolation({ userId: row.user_id, attemptedSite: row.attempted_site, createdAt: row.created_at });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export type LeaderboardEntry = { userId: string; name: string; sessionsCompleted: number; violationCount: number };

/** Weekly (trailing 7 days) view: completed sessions vs. violations per member, ranked by
 *  sessions completed with violations as a tiebreaking penalty — "Iron Focus" is simply
 *  entry 0 when its violationCount is 0. */
export async function getGroupLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  const { data: memberRows, error: memberError } = await supabase.from("group_members").select("users(id, name)").eq("group_id", groupId);
  if (memberError) throw memberError;

  const members = (memberRows ?? [])
    .map((r) => (Array.isArray(r.users) ? r.users[0] : r.users) as UserRow | null)
    .filter((u): u is UserRow => !!u);
  if (members.length === 0) return [];
  const userIds = members.map((m) => m.id);

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: sessions, error: sessionsError }, { data: violations, error: violationsError }] = await Promise.all([
    supabase.from("sessions").select("user_id").in("user_id", userIds).eq("completed", true).gte("start_time", weekAgo),
    supabase.from("group_violations").select("user_id").eq("group_id", groupId).gte("created_at", weekAgo),
  ]);
  if (sessionsError) throw sessionsError;
  if (violationsError) throw violationsError;

  const sessionCounts = new Map<string, number>();
  for (const s of sessions ?? []) sessionCounts.set(s.user_id, (sessionCounts.get(s.user_id) ?? 0) + 1);
  const violationCounts = new Map<string, number>();
  for (const v of violations ?? []) violationCounts.set(v.user_id, (violationCounts.get(v.user_id) ?? 0) + 1);

  const score = (e: { sessionsCompleted: number; violationCount: number }) => e.sessionsCompleted - e.violationCount * 2;
  return members
    .map((m) => ({
      userId: m.id,
      name: m.name,
      sessionsCompleted: sessionCounts.get(m.id) ?? 0,
      violationCount: violationCounts.get(m.id) ?? 0,
    }))
    .sort((a, b) => score(b) - score(a));
}

// ---------- waitlist ----------

export type WaitlistPlan = "free" | "pro" | "lifetime";

// Deliberately no .select().single() after the insert — Postgres applies the table's
// SELECT policy to a RETURNING read too, and waitlist has none (anonymous visitors have no
// auth.uid() to scope one by, same as roadmap_signups below). Requesting the row back would
// fail RLS with the same "new row violates row-level security policy" error a genuinely
// broken INSERT policy would produce, which makes the real problem easy to misdiagnose.
export async function joinWaitlist(email: string, plan?: WaitlistPlan) {
  const { error } = await supabase.from("waitlist").insert({ email, plan: plan ?? null });
  if (error) {
    if (error.code === "23505") return { alreadyJoined: true };
    throw error;
  }
  return { alreadyJoined: false };
}

// ---------- roadmap signups ----------
// Landing page "Coming Soon" section — separate table from waitlist above since this is
// platform interest (desktop/iOS/Android/all), not a pricing-tier signal.

export type RoadmapPlatform = "desktop" | "ios" | "android" | "all";

// Deliberately no .select().single() after the insert — Postgres applies the table's
// SELECT policy to a RETURNING read too, and roadmap_signups has none (anonymous visitors
// have no auth.uid() to scope one by). Requesting the row back would fail RLS with the
// exact same "new row violates row-level security policy" error the INSERT itself would
// throw if it were actually broken, which makes the real problem easy to misdiagnose.
export async function joinRoadmapWaitlist(email: string, platform: RoadmapPlatform) {
  const { error } = await supabase.from("roadmap_signups").insert({ email, platform_interest: platform });
  if (error) throw error;
}
