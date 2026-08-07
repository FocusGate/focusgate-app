// blocked.js — reads live session status from the service worker and renders the
// countdown. No bypass control lives here by design (per spec): this page only informs.

// TODO: replace with the real production dashboard URL once deployed (mirrors popup.js's
// own DASHBOARD_URL constant — keep both in sync).
const DASHBOARD_URL = "https://focusgate.app/dashboard";

const viewActiveEl = document.getElementById("view-active");
const viewCompleteEl = document.getElementById("view-complete");
const unblockBtn = document.getElementById("unblock-btn");
const countdownEl = document.getElementById("countdown");
const quoteEl = document.getElementById("blocked-quote");
const goalEl = document.getElementById("blocked-goal");

// Mirrors lib/onboarding.ts's GOAL_OPTIONS labels — this extension can't import a .ts
// file from the Next.js app, so the value→label mapping is duplicated here on purpose.
const GOAL_LABELS = {
  exams: "Study for exams",
  doomscrolling: "Stop doomscrolling",
  gaming: "Avoid gaming distractions",
  grades: "Improve grades",
  habit: "Build a focus habit",
  procrastination: "Beat procrastination",
};

const QUOTES = [
  "Deep work over distraction.",
  "You said you'd study. Now prove it.",
  "Discipline is choosing between what you want now and what you want most.",
  "The distraction will still be there later. This moment won't.",
  "Every focused minute is a vote for the person you're becoming.",
  "Future you is watching this exact decision.",
];

// One quote per page load, not per second — nobody wants a live-updating motivational
// quote flickering next to a countdown they're already staring at.
quoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];

// Every load of this page IS a blocked distraction attempt (declarativeNetRequest only
// redirects here when a blocked domain was hit) — one count for "Distraction Slayer".
// Fire-and-forget: this page has nothing useful to do with a failure here.
chrome.runtime.sendMessage({ type: "RECORD_BLOCKED_ATTEMPT" }).catch(() => {});

function formatGoalDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

async function renderGoal() {
  try {
    const { auth } = await chrome.runtime.sendMessage({ type: "GET_AUTH" });
    const goals = auth?.goals ?? [];
    if (!auth || goals.length === 0 || !auth.goalTargetDate) return;
    const label = GOAL_LABELS[goals[0]] ?? goals[0];
    const extra = goals.length > 1 ? ` +${goals.length - 1} more` : "";
    goalEl.textContent = `🎯 ${label}${extra} — by ${formatGoalDate(auth.goalTargetDate)}`;
    goalEl.hidden = false;
  } catch {
    // No goal on file (or the service worker briefly wasn't reachable) — the quote alone
    // is still shown, so failing quietly here just means no second line, not a broken page.
  }
}

renderGoal();

function formatRemaining(ms) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Once true, stop flipping views on every poll — the completion state doesn't need to
// keep re-rendering, and it means a slow/failed GET_STATUS call after this point can't
// flicker the user back to the (stale) countdown view.
let settled = false;

async function refresh() {
  if (settled) return;
  const { session, remainingMs } = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  if (session?.active) {
    countdownEl.textContent = formatRemaining(remainingMs);
    return;
  }
  // The session ended (naturally, or via Emergency Unblock) while this tab was still
  // sitting here — declarativeNetRequest's rules are already cleared by background.js at
  // this point, so there's nothing left to show but the "you're done" moment.
  settled = true;
  viewActiveEl.hidden = true;
  viewCompleteEl.hidden = false;
}

unblockBtn.addEventListener("click", () => {
  window.location.href = DASHBOARD_URL;
});

refresh();
setInterval(refresh, 1000);
