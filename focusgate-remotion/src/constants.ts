// constants.ts — the one place every scene reads its palette, timing, and speed from, so
// "gold and black throughout" and "these scene boundaries" stay true by construction rather
// than by every scene file agreeing independently.

export const FPS = 30;

// Brand palette — mirrors the web app's own gold/black system (app/(app)/dashboard/page.tsx,
// components/landing/*) rather than inventing a separate one for this video.
export const COLORS = {
  black: "#0A0A0A",
  blackDeep: "#060606", // landing page's darkest sections use this, one step below black
  gold: "#F59E0B",
  goldLight: "#FBBF24", // top of the gold gradient buttons/glows use throughout the app
  goldMuted: "#F59E0B", // the wordmark/secondary-gold color used site-wide
  amber: "#F97316", // the timer bar's mid-urgency stop (Scene 4) — brief's third palette color
  white: "#FFFFFF",
  grey: "#9a9da4", // secondary/body text grey used throughout the app
  greyDim: "#5b5e66",
  red: "#EF4444", // "blocked" red used for the X marks, matching the app's own blocked-site styling
  redDim: "#f87171",
  green: "#22c55e", // correct-answer flash (Scene 4) — matches the app's own "success" green
} as const;

// Raven rebrand: the wordmark switched from Instrument Serif to bold Geist (matching the
// web navbar's RAVEN treatment) — FONT_DISPLAY is gone, FONT_BODY now covers every scene.
export const FONT_BODY = "Geist"; // matches app/layout.tsx's own stack

// ---------- speed ----------
// "Increase overall animation speed by 15%" — one dial, applied at each animation's own
// frame input (spring({frame: spd(x)}), interpolate(spd(x), ...)) rather than hand-retimed
// into every constant below, so it stays a single adjustable knob instead of a rewrite.
export const SPEED = 1.15;
export const spd = (frame: number) => frame * SPEED;

// ---------- scene content durations ----------
// TransitionSeries.Sequence durations (see FocusGateVideo.tsx) — NOT the same as how long a
// scene is actually *visible*, since each TRANSITION_FRAMES-long crossfade overlaps the tail
// of one scene with the head of the next, consuming that many frames from the total
// timeline. These are inflated (see TRANSITION_FRAMES comment below) so the final, visible
// video still lands on the brief's 30 seconds / roughly-original per-scene proportions.
const s = (seconds: number) => Math.round(seconds * FPS);

export const TRANSITION_FRAMES = 10; // 1/3s scale+fade between every pair of scenes

const ORIGINAL_SCENE_SECONDS = {
  logo: 4,
  doomscroll: 6,
  lockedIn: 8,
  breakGate: 6,
  badgeUnlock: 4,
  cta: 2,
} as const;

const SCENE_KEYS = Object.keys(ORIGINAL_SCENE_SECONDS) as (keyof typeof ORIGINAL_SCENE_SECONDS)[];
const TRANSITION_COUNT = SCENE_KEYS.length - 1;
const TOTAL_DURATION_FRAMES_TARGET = s(30);
// Scale every scene's own content duration up by the same factor, just enough that
// subtracting all the transition overlaps lands back on exactly 30s total — see this
// file's header comment for the arithmetic. Proportions between scenes stay the same as
// the original brief; only the total grows by the transition overlap before it's removed.
const INFLATION = (TOTAL_DURATION_FRAMES_TARGET + TRANSITION_COUNT * TRANSITION_FRAMES) / TOTAL_DURATION_FRAMES_TARGET;

export const SCENE_DURATIONS = Object.fromEntries(
  SCENE_KEYS.map((key) => [key, Math.round(s(ORIGINAL_SCENE_SECONDS[key]) * INFLATION)])
) as Record<keyof typeof ORIGINAL_SCENE_SECONDS, number>;

// What actually plays on screen, after transition overlaps eat into the padded durations
// above — should equal TOTAL_DURATION_FRAMES_TARGET (30s) exactly.
export const TOTAL_DURATION_FRAMES =
  Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) - TRANSITION_COUNT * TRANSITION_FRAMES;

export const BLOCKED_SITES = ["tiktok.com", "youtube.com", "instagram.com", "reddit.com", "x.com"];
