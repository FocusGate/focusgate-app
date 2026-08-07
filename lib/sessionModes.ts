// lib/sessionModes.ts — the one place that defines what each Session Mode *is*. Locked In
// Mode's actual enforcement (declarativeNetRequest blocking, anti-bypass, Break Gates, The
// Lounge) is identical underneath every mode — this file only describes the structure each
// mode wraps around that same engine: duration rules, whether breaks are automatic, forced
// gate difficulty, a bound friend group, and so on. Consumed by the mode-selection screen,
// LockedInOverlay (which reads `modeConfig` to decide how to behave), and startSession().

export type SessionMode = "pomodoro" | "exam_cram" | "group_study" | "all_nighter" | "deep_focus" | "custom";

export type ModeDefinition = {
  id: SessionMode;
  name: string;
  emoji: string;
  tagline: string;
  typicalDuration: string;
  accent: string; // hover accent — "a whisper, not a rainbow" per spec
};

export const SESSION_MODES: ModeDefinition[] = [
  { id: "pomodoro", name: "Pomodoro Sprints", emoji: "🍅", tagline: "25 min focus, 5 min break, repeat.", typicalDuration: "~100 min (4 cycles)", accent: "#EF4444" },
  { id: "exam_cram", name: "Exam Cram", emoji: "📚", tagline: "Longer stretch. Higher stakes. No easy breaks.", typicalDuration: "2–4 hours", accent: "#D97706" },
  { id: "group_study", name: "Group Study", emoji: "👥", tagline: "Lock in together. Stay accountable.", typicalDuration: "Set by you", accent: "#3B82F6" },
  { id: "all_nighter", name: "All Nighter", emoji: "🌙", tagline: "Long haul session. Built-in rest reminders.", typicalDuration: "4+ hours", accent: "#4F46E5" },
  { id: "deep_focus", name: "Deep Focus", emoji: "🎯", tagline: "One task. Zero interruptions. Maximum lock.", typicalDuration: "90 min, fixed", accent: "#F59E0B" },
];

export const CUSTOM_MODE: ModeDefinition = {
  id: "custom",
  name: "Custom",
  emoji: "⚙️",
  tagline: "Pick your own duration. Manual breaks via Break Gates.",
  typicalDuration: "Set by you",
  accent: "#9CA3AF",
};

export const ALL_MODE_CARDS: ModeDefinition[] = [...SESSION_MODES, CUSTOM_MODE];

export function getModeDefinition(mode: SessionMode): ModeDefinition {
  return ALL_MODE_CARDS.find((m) => m.id === mode) ?? CUSTOM_MODE;
}

// ---------- Pomodoro ----------
export const POMODORO_FOCUS_MINUTES = 25;
export const POMODORO_BREAK_MINUTES = 5;
export const POMODORO_MIN_CYCLES = 2;
export const POMODORO_MAX_CYCLES = 8;
export const POMODORO_DEFAULT_CYCLES = 4;

// ---------- Exam Cram ----------
export const EXAM_CRAM_MIN_MINUTES = 120;
export const EXAM_CRAM_MAX_MINUTES = 240;
export const EXAM_CRAM_DEFAULT_MINUTES = 150;
export const EXAM_CRAM_EMERGENCY_COST_MULTIPLIER = 2; // visual only — see EmergencyUnblockModal

// ---------- All Nighter ----------
export const ALL_NIGHTER_MIN_MINUTES = 240;
export const ALL_NIGHTER_DEFAULT_MINUTES = 300;
export const ALL_NIGHTER_CHECKPOINT_MINUTES = 90;
export const ALL_NIGHTER_CHECKPOINT_BREAK_MINUTES = 10;
export const ALL_NIGHTER_REMINDERS = [
  "Drink some water.",
  "Stretch your back.",
  "Roll your shoulders — you've been at this a while.",
  "Blink. Look at something far away for a few seconds.",
];

// ---------- Deep Focus ----------
export const DEEP_FOCUS_MINUTES = 90;
export const DEEP_FOCUS_CONFIRM_PHRASE = "DEEP FOCUS";

/** Per-mode `mode_config` shapes, stored as-is in sessions.mode_config (jsonb). */
export type PomodoroConfig = { cycles: number };
export type AllNighterConfig = { checkpointMinutes: number };
export type ModeConfig = PomodoroConfig | AllNighterConfig | Record<string, never>;
