// constants.ts — the one place every scene reads its palette and timing from, so "gold and
// black throughout" and "these exact scene boundaries" stay true by construction rather
// than by every scene file agreeing independently.

export const FPS = 30;

// Brand palette — mirrors the web app's own gold/black system (app/(app)/dashboard/page.tsx,
// components/landing/*) rather than inventing a separate one for this video.
export const COLORS = {
  black: "#0A0A0A",
  blackDeep: "#060606", // landing page's darkest sections use this, one step below black
  gold: "#F59E0B",
  goldLight: "#FBBF24", // top of the gold gradient buttons/glows use throughout the app
  goldMuted: "#b08d57", // the wordmark/secondary-gold color used site-wide
  white: "#FFFFFF",
  grey: "#9a9da4", // secondary/body text grey used throughout the app
  greyDim: "#5b5e66",
  red: "#EF4444", // "blocked" red used for the X marks, matching the app's own blocked-site styling
  redDim: "#f87171",
} as const;

export const FONT_DISPLAY = "Instrument Serif"; // the wordmark's serif face
export const FONT_BODY = "Geist"; // everything else — matches app/layout.tsx's own stack

// ---------- scene boundaries (seconds -> frames @ FPS) ----------
// Exactly the brief's timings: 0-4, 4-10, 10-18, 18-24, 24-28, 28-30.
const s = (seconds: number) => Math.round(seconds * FPS);

export const SCENES = {
  logo: { from: s(0), duration: s(4) }, // 0-4s
  doomscroll: { from: s(4), duration: s(6) }, // 4-10s
  lockedIn: { from: s(10), duration: s(8) }, // 10-18s
  breakGate: { from: s(18), duration: s(6) }, // 18-24s
  badgeUnlock: { from: s(24), duration: s(4) }, // 24-28s
  cta: { from: s(28), duration: s(2) }, // 28-30s
} as const;

export const TOTAL_DURATION_FRAMES = s(30);

export const BLOCKED_SITES = ["tiktok.com", "youtube.com", "instagram.com", "reddit.com", "x.com"];
