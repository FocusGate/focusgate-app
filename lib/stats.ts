/**
 * Pure, DB-free stat computations shared by the dashboard, stats page, and
 * badge-progress UI. Kept free of Supabase calls so they're trivially
 * testable against hardcoded fixtures.
 */

export type SessionRow = {
  start_time: string;
  duration_minutes: number | null;
  completed: boolean;
};

/** Shared "Xh Ym" duration formatter for stat cards driven by a raw minutes count. */
export function formatHoursMinutes(totalMinutes: number): string {
  const m = Math.round(totalMinutes);
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h === 0) return `${mins}m`;
  return `${h}h ${mins}m`;
}

/** UTC calendar-day key — matches `getHabitGrid`'s existing `.slice(0,10)` bucketing
 *  convention exactly. There's no per-user timezone anywhere in this schema, so every
 *  date-bucketing function in this file intentionally uses the same UTC-day convention
 *  (a session at 11pm Pacific could count toward the next UTC day — a known, accepted
 *  limitation, not an oversight). */
function dayKey(iso: string) {
  return iso.slice(0, 10);
}

// ---------- streak ----------

export function computeStreakFromSessions(sessions: Pick<SessionRow, "start_time" | "completed">[]): {
  streak: number;
  longestStreak: number;
} {
  const days = new Set(sessions.filter((s) => s.completed).map((s) => dayKey(s.start_time)));
  if (days.size === 0) return { streak: 0, longestStreak: 0 };

  const sorted = Array.from(days).sort();

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00Z").getTime();
    const cur = new Date(sorted[i] + "T00:00:00Z").getTime();
    const diffDays = Math.round((cur - prev) / 86400000);
    run = diffDays === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // Counts backward from today, but falls back to yesterday as the anchor when today has
  // no session yet — otherwise an in-progress streak would read as "broken" every morning
  // before that day's session happens.
  const todayKey = new Date().toISOString().slice(0, 10);
  const cursor = new Date(todayKey + "T00:00:00Z");
  if (!days.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return { streak, longestStreak: longest };
}

// ---------- focus score ----------

/**
 * Invented, deterministic 0-100 score — not scientific. Every session that reaches this
 * screen already ran to completion (Locked In Mode has no early-exit), so the score
 * rewards duration and streak consistency on top of that guaranteed baseline, rather
 * than "did you finish," which every session here already satisfies.
 */
export function computeFocusScore({ durationMinutes, streak }: { durationMinutes: number; streak: number }): number {
  const base = 55;
  const durationBonus = Math.min(30, Math.round((durationMinutes / 120) * 30));
  const streakBonus = Math.min(15, Math.round((streak / 30) * 15));
  return Math.max(0, Math.min(100, base + durationBonus + streakBonus));
}

// ---------- productivity insights ----------

function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

/** Uses local hours (`Date#getHours`), matching the existing Early-Bird/Night-Owl checks
 *  in `checkAndUnlockBadges` — unlike the UTC-day bucketing above, "what time of day is
 *  productive for you" is only meaningful in the browser's own local time. */
export function getMostProductiveHour(sessions: SessionRow[]): { label: string; minutes: number } | null {
  const completed = sessions.filter((s) => s.completed);
  if (completed.length === 0) return null;

  const byHour = new Map<number, number>();
  for (const s of completed) {
    const hour = new Date(s.start_time).getHours();
    byHour.set(hour, (byHour.get(hour) ?? 0) + (s.duration_minutes ?? 0));
  }

  let bestHour = 0;
  let bestMinutes = -1;
  for (const [hour, minutes] of byHour) {
    if (minutes > bestMinutes) {
      bestHour = hour;
      bestMinutes = minutes;
    }
  }

  return { label: formatHour(bestHour), minutes: bestMinutes };
}

export function getBestDay(habitData: { date: string; minutes: number }[]): { date: string; minutes: number } | null {
  if (habitData.length === 0) return null;
  return habitData.reduce((best, d) => (d.minutes > best.minutes ? d : best), habitData[0]);
}

/** Last `days` UTC calendar days (today inclusive), keyed by plain date — shared by the
 *  7-day weekly chart and the 30-day trend chart. Callers format their own display label
 *  since a 7-day range reads best as weekday names but a 30-day range needs "M/D". */
export function bucketLastNDays(sessions: SessionRow[], days: number): { date: string; minutes: number }[] {
  const byDate = new Map<string, number>();
  for (const s of sessions) {
    if (!s.completed) continue;
    const key = dayKey(s.start_time);
    byDate.set(key, (byDate.get(key) ?? 0) + (s.duration_minutes ?? 0));
  }

  const now = new Date();
  const out: { date: string; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, minutes: byDate.get(key) ?? 0 });
  }
  return out;
}

/** Last 7 UTC calendar days (today inclusive), for the dashboard/stats weekly bar chart. */
export function bucketLast7Days(sessions: SessionRow[]): { date: string; label: string; minutes: number }[] {
  return bucketLastNDays(sessions, 7).map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
  }));
}

export function getTodayFocusMinutes(sessions: SessionRow[]): number {
  const todayKey = new Date().toISOString().slice(0, 10);
  return sessions
    .filter((s) => s.completed && dayKey(s.start_time) === todayKey)
    .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
}

export function sumMinutesSince(sessions: SessionRow[], since: Date): number {
  const sinceTime = since.getTime();
  return sessions
    .filter((s) => s.completed && new Date(s.start_time).getTime() >= sinceTime)
    .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
}

// ---------- badge progress ----------

export type ParsedThreshold = { metric: string; target: number } | null;

/** Parses the free-form `unlock_condition` copy for the subset of badges that follow a
 *  `metric_name >= number` pattern (the only ones a progress bar makes sense for —
 *  see `getMetricValue` for which metrics are recognized). */
export function parseThreshold(unlockCondition: string): ParsedThreshold {
  const match = unlockCondition.match(/^(\w+)\s*>=\s*(\d+)/);
  if (!match) return null;
  return { metric: match[1], target: parseInt(match[2], 10) };
}

export type BadgeMetricCtx = {
  completedCount: number;
  streak: number;
  longestSessionMinutes: number;
  totalFocusHours: number;
  blockedAttempts: number;
  breakGatesPassed: number;
  cleanSessions: number;
};

export function getMetricValue(metric: string, ctx: BadgeMetricCtx): number | null {
  switch (metric) {
    case "completed_sessions":
      return ctx.completedCount;
    case "streak":
      return ctx.streak;
    case "longest_session_minutes":
      return ctx.longestSessionMinutes;
    case "total_focus_hours":
      return ctx.totalFocusHours;
    case "blocked_attempts":
      return ctx.blockedAttempts;
    case "break_gates_passed":
      return ctx.breakGatesPassed;
    case "clean_sessions":
      return ctx.cleanSessions;
    default:
      return null;
  }
}

// ---------- Iron Focus: consecutive-week leaderboard streak ----------

/** ISO-8601 week key ("2026-W32") for a date, UTC-based — matches this file's existing
 *  UTC-day convention. Week 1 is the week containing the year's first Thursday. */
export function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday determines the ISO year
  const isoYear = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = jan4.getTime() - jan4Day * 86400000;
  const week = Math.round((d.getTime() - week1Monday) / (7 * 86400000)) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

function isoWeekStartMs(isoWeek: string): number {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = jan4.getTime() - jan4Day * 86400000;
  return week1Monday + (week - 1) * 7 * 86400000;
}

/** True if `weeks` contains at least `run` ISO weeks in an unbroken consecutive run —
 *  used by "Iron Focus" (4 straight weeks at #1 on a group leaderboard). Dedupes first
 *  since a week can only be won once per group but this may see repeats across groups
 *  merged incorrectly by a caller. */
export function hasConsecutiveISOWeeks(weeks: string[], run: number): boolean {
  const starts = Array.from(new Set(weeks.map(isoWeekStartMs))).sort((a, b) => a - b);
  let streak = starts.length > 0 ? 1 : 0;
  for (let i = 1; i < starts.length; i++) {
    streak = starts[i] - starts[i - 1] === 7 * 86400000 ? streak + 1 : 1;
    if (streak >= run) return true;
  }
  return streak >= run;
}

// ---------- break notes (Friction Triggers) ----------

/** Break notes are a fixed 3-10 word window — short enough to not be its own chore,
 *  long enough that "idk" doesn't qualify. Not user-configurable (the old 30/50/100
 *  character picker on /the-gates is gone) — this replaces it everywhere. */
export const MIN_BREAK_NOTE_WORDS = 3;
export const MAX_BREAK_NOTE_WORDS = 10;

/** How many Take a Break requests a session's length earns it — one per 30 minutes of
 *  planned duration, floored at 1 so even a 25-minute session gets a single break. A
 *  25/45-minute session gets 1, 60 gets 2, 90 gets 3, 120 gets 4, and so on. Not user
 *  configurable — this is about the session's own length, not a preference. */
export function maxBreaksForDuration(durationMinutes: number): number {
  return Math.max(1, Math.floor(durationMinutes / 30));
}

// ---------- break duration (The Lounge) ----------
// Breaks used to be a fixed 5 minutes. Now the person taking the break picks how long they
// actually need, 1 to 15 minutes, via a slider (shown only after they've earned it by
// passing a Break Gate) — these bounds are the slider's range.
export const MIN_BREAK_SECONDS = 60;
export const MAX_BREAK_SECONDS = 15 * 60;
export const DEFAULT_BREAK_SECONDS = 5 * 60;

/** "3 min 20 sec" / "45 sec" / "1 min" — the slider's live preview label. Always spells
 *  out both units it needs, never a bare "3:20" — this reads better next to a hand-dragged
 *  slider than a clock format does. */
export function formatBreakDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  if (minutes === 0) return `${seconds} sec`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} sec`;
}

/** Whole days until the 1st of next month (UTC) — drives the emergency-unblock
 *  "Resets in N days" copy. Matches how getEmergencyUnblockStats buckets by UTC month. */
export function daysUntilMonthlyReset(now: Date = new Date()): number {
  const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((nextMonth - today) / 86400000));
}

/** A handful of common short words that legitimately lack a vowel-bearing pattern our
 *  simple heuristic would otherwise flag, or that are borderline short — kept tiny on
 *  purpose, this is explicitly a "basic check," not a real dictionary. */
const COMMON_SHORT_WORDS = new Set(["i", "a", "to", "my", "an", "of", "in", "on", "or", "is", "it"]);

/** No real dictionary or AI call — a basic heuristic matching the spec's own framing
 *  ("basic check for repeated characters, real words"): rejects notes outside the 5-10
 *  word window, that repeat one character 5+ times in a row ("aaaaa", "asdfasdfasdf"
 *  would still slip through — this is intentionally basic), or where most "words" don't
 *  look like words. */
export function isValidBreakNote(text: string): boolean {
  const trimmed = text.trim();
  if (/(.)\1{4,}/.test(trimmed)) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < MIN_BREAK_NOTE_WORDS || words.length > MAX_BREAK_NOTE_WORDS) return false;

  const looksLikeWord = (w: string) => {
    const clean = w.toLowerCase().replace(/[^a-z']/g, "");
    if (!clean) return false;
    if (COMMON_SHORT_WORDS.has(clean)) return true;
    if (clean.length < 2) return false;
    return /[aeiou]/.test(clean);
  };
  const realWordCount = words.filter(looksLikeWord).length;
  return realWordCount / words.length >= 0.7;
}

const THEME_KEYWORDS: { theme: string; keywords: string[] }[] = [
  { theme: "bored", keywords: ["bored", "boring", "restless"] },
  { theme: "tired", keywords: ["tired", "exhausted", "sleepy", "rest my eyes", "eyes"] },
  { theme: "hungry", keywords: ["hungry", "eat", "food", "snack", "headache"] },
  { theme: "family", keywords: ["mom", "dad", "sister", "brother", "family", "call"] },
  { theme: "bathroom", keywords: ["bathroom", "restroom", "toilet"] },
];

/** Basic keyword match against a fixed theme list — first match wins. Returns `null` when
 *  nothing matches rather than guessing, since a wrong guess is worse than no tag. */
export function classifyBreakNoteTheme(text: string): string | null {
  const lower = text.toLowerCase();
  for (const { theme, keywords } of THEME_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return theme;
  }
  return null;
}

/** Percentage breakdown of classified themes across a set of notes, sorted descending —
 *  unclassified notes are simply excluded rather than lumped into a fake "other" bucket. */
export function computeThemeBreakdown(notes: { note_text: string }[]): { theme: string; pct: number }[] {
  const counts = new Map<string, number>();
  let classified = 0;
  for (const n of notes) {
    const theme = classifyBreakNoteTheme(n.note_text);
    if (!theme) continue;
    classified += 1;
    counts.set(theme, (counts.get(theme) ?? 0) + 1);
  }
  if (classified === 0) return [];
  return Array.from(counts.entries())
    .map(([theme, count]) => ({ theme, pct: Math.round((count / classified) * 100) }))
    .sort((a, b) => b.pct - a.pct);
}

/** Longest gap between consecutive break-note timestamps, in minutes — reads as "your
 *  longest streak without a break." Needs at least 2 notes to define a gap. */
export function computeLongestGapMinutes(noteTimestamps: string[]): number {
  if (noteTimestamps.length < 2) return 0;
  const sorted = [...noteTimestamps].map((t) => new Date(t).getTime()).sort((a, b) => a - b);
  let longest = 0;
  for (let i = 1; i < sorted.length; i++) {
    longest = Math.max(longest, sorted[i] - sorted[i - 1]);
  }
  return Math.round(longest / 60000);
}
