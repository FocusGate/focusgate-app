/**
 * Pure helpers + localStorage persistence for the pre-signup onboarding flow. Kept
 * DB-free (unlike lib/supabase.ts) since none of this exists until account creation on
 * the final screen — everything here is client-only state for an anonymous visitor.
 */

export type OnboardingAnswers = {
  name: string;
  focusKiller: string;
  hoursLost: string;
  pastFailures: string;
  commitmentLevel: string;
  email: string;
  goals: string[];
  goalTimeframeWeeks: number;
};

export const EMPTY_ANSWERS: OnboardingAnswers = {
  name: "",
  focusKiller: "",
  hoursLost: "",
  pastFailures: "",
  commitmentLevel: "",
  email: "",
  goals: [],
  goalTimeframeWeeks: 0,
};

/** Drives the progress bar's percentage math — 15 "pages" as originally specced, where
 *  the 15th is the real /signup route the flow hands off to, not a screen this component
 *  renders itself. */
export const TOTAL_STEPS = 15;

/** The last screen OnboardingFlow actually renders — completing it navigates to /signup
 *  instead of advancing to an internal step 15. */
export const LAST_SCREEN = 14;

/** Screen 11's multi-select goal cards — "show a grid of goal cards user can select
 *  (multi-select)." Values double as keys into GOAL_DEFAULT_DOMAINS (lib/supabase.ts)
 *  for goal-aware default blocklist seeding on signup. */
export const GOAL_OPTIONS: { value: string; icon: string; label: string }[] = [
  { value: "exams", icon: "📚", label: "Study for exams" },
  { value: "doomscrolling", icon: "📱", label: "Stop doomscrolling" },
  { value: "gaming", icon: "🎮", label: "Avoid gaming distractions" },
  { value: "grades", icon: "📈", label: "Improve grades" },
  { value: "habit", icon: "🔁", label: "Build a focus habit" },
  { value: "procrastination", icon: "⏳", label: "Beat procrastination" },
];

/** Screen 12's "1 month, 6 months, or set your own" horizon picker. A third "Custom"
 *  card (handled directly in Screen12Timeframe.tsx, not listed here since it has no
 *  fixed `weeks` value) reveals a months input instead of auto-advancing. */
export const GOAL_TIMEFRAME_OPTIONS: { weeks: number; label: string; description: string }[] = [
  { weeks: 4, label: "1 month", description: "A quick reset — see results fast." },
  { weeks: 26, label: "6 months", description: "Build a habit that actually sticks." },
];

/** Converts Screen 12's "Custom" months input into the same `weeks` unit the preset
 *  options and computeTargetDate() already work in — 4.345 is the average weeks/month
 *  (52/12), matching how "6 months" above maps to 26 (not a flat 24) weeks. */
export function monthsToWeeks(months: number): number {
  return Math.max(1, Math.round(months * 4.345));
}

/** Label shown on the option card + the real numeric hours/day it represents — Screen 8's
 *  "days lost per year" math reads the numeric side of whichever one was picked on Screen 6. */
export const HOURS_LOST_OPTIONS: { value: string; label: string; hours: number }[] = [
  { value: "under-1", label: "Less than 1 hour", hours: 0.5 },
  { value: "1-2", label: "1–2 hours", hours: 1.5 },
  { value: "3-4", label: "3–4 hours", hours: 3.5 },
  { value: "5-plus", label: "5+ hours", hours: 6 },
];

export function hoursForAnswer(hoursLostValue: string): number {
  return HOURS_LOST_OPTIONS.find((o) => o.value === hoursLostValue)?.hours ?? 2;
}

/** Whole days per year lost at a given hours/day rate — the Screen 8 "mirroring" number. */
export function daysLostPerYear(hoursPerDay: number): number {
  return Math.round((hoursPerDay * 365) / 24);
}

/** Screen 13's "you will have unbreakable focus by [date]" target — driven by the
 *  timeframe chosen on Screen 12 (falls back to 8 weeks if somehow unset), formatted
 *  the same way across every render of the same session. */
export function computeTargetDate(weeksOut = 8, from: Date = new Date()): string {
  return targetDateObj(weeksOut, from).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Same target date as computeTargetDate, as `YYYY-MM-DD` — what actually gets written
 *  to the `users.goal_target_date` column (a Postgres `date`) and later reformatted for
 *  display wherever it's read back (e.g. the dashboard goal-reminder line). Built from
 *  local year/month/day rather than `toISOString()` (which converts through UTC) — that
 *  conversion can silently roll the date backward or forward a day for anyone not on
 *  UTC, disagreeing with the local date Screen 13 just showed the user. */
export function computeTargetISODate(weeksOut = 8, from: Date = new Date()): string {
  const d = targetDateObj(weeksOut, from);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function targetDateObj(weeksOut: number, from: Date): Date {
  const target = new Date(from);
  target.setDate(target.getDate() + weeksOut * 7);
  return target;
}

const STORAGE_KEY = "fg-onboarding-state";

type StoredState = { step: number; answers: OnboardingAnswers };

/** Reads saved progress back out — used once on mount so a refresh mid-flow doesn't lose
 *  answers. Fails soft (returns null) on any parse error or when running server-side. */
export function loadOnboardingState(): StoredState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (!parsed || typeof parsed.step !== "number" || !parsed.answers) return null;
    return { step: parsed.step, answers: { ...EMPTY_ANSWERS, ...parsed.answers } };
  } catch {
    return null;
  }
}

export function saveOnboardingState(state: StoredState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearOnboardingState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
