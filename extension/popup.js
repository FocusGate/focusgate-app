// popup.js — the Locked-In control panel. Sessions still only ever start from the
// dashboard, but once one is running this is where you actually use FocusGate day to
// day: see time left, and reach the same two friction-gated escape hatches the dashboard
// has — "Request a Break" (note, then a gate game, then a duration you pick once you've
// earned it — a temporary pause) and "Emergency Unblock" (ends the session outright) —
// both recorded to the same Supabase tables.
//
// Everything below one state's markup is built with innerHTML on demand, not pre-written
// into popup.html and toggled with `hidden` — there's exactly one screen's worth of DOM
// in the document at any moment, built the instant its button is pressed and nothing
// before that.

const DASHBOARD_URL = "https://focusgate.site/dashboard";

const MIN_REASON_LENGTH = 15; // mirrors EmergencyUnblockModal.tsx — must match background.js
const MAX_FREE_EMERGENCY_UNBLOCKS_DISPLAY = 2; // mirrors lib/supabase.ts's MAX_FREE_EMERGENCY_UNBLOCKS, for copy only
const MIN_BREAK_NOTE_WORDS = 3; // mirrors lib/stats.ts — must match background.js
const MAX_BREAK_NOTE_WORDS = 10; // mirrors lib/stats.ts — must match background.js
// Break *length* (1-15 min) isn't picked here anymore — that slider now lives in
// challenge.js's post-pass screen, shown only once the gate's actually been earned.

const el = (id) => document.getElementById(id);

/** The break note/reminder is the first user-authored (or at least user-adjacent) text
 *  this popup ever renders via innerHTML — everything else here is either static markup or
 *  values it fully controls itself. Escapes it the plain DOM way rather than trusting it. */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// The only elements that live in popup.html itself — everything else is injected.
const headerBadgeEl = el("header-badge");
const syncWarningEl = el("sync-warning");
const rootEl = el("popup-root");
const flowErrorEl = el("flow-error");
const accountFooterEl = el("account-footer");
const authNameEl = el("auth-name");
const authSignOutBtn = el("auth-signout");
const versionMarkerEl = el("version-marker");

// Shows the installed build's version — if you just reloaded the extension after an
// update and this doesn't match what you expect, chrome://extensions didn't actually
// pick up the new files yet (see the reload steps in the delivery notes).
versionMarkerEl.textContent = `v${chrome.runtime.getManifest().version}`;

// True while an Emergency Unblock / Request a Break sub-flow is on screen — the 1-second
// status poll skips re-rendering while this is set, so it can't yank the popup back to
// the main view mid-flow (e.g. while typing a reason).
let inFlow = false;
let emergencyReason = "";
let breakNotesEnabledForCurrentFlow = false;

// What's currently built into #popup-root — compared against on every poll so a plain
// countdown tick (same state, new number) only patches a text node, while an actual
// state change (idle → active, or returning from a flow) rebuilds the screen. Flow
// screens set this to "flow" so the next real state always counts as a change and
// rebuilds, even if it's the same state name as before the flow started.
let currentState = null;

function formatRemaining(ms) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function setHeaderBadge(text, variant) {
  headerBadgeEl.textContent = text;
  headerBadgeEl.className = "popup__badge" + (variant ? ` popup__badge--${variant}` : "");
}

function showFlowError(message) {
  flowErrorEl.textContent = message;
  flowErrorEl.hidden = false;
}

function hideFlowError() {
  flowErrorEl.hidden = true;
}

// ---------- screens ----------

function renderSignedOut() {
  hideFlowError();
  rootEl.className = "view";
  rootEl.innerHTML = `
    <div class="popup__status">
      <div class="popup__status-label">Status</div>
      <div class="popup__status-value">Idle</div>
      <div class="popup__status-hint">Sign in below, then start a session from your dashboard.</div>
    </div>
    <hr class="popup__divider" />
    <div class="popup__sync">
      <div class="popup__sync-label">Sign in to sync with your dashboard</div>
      <input class="popup__sync-input" id="auth-email" type="email" placeholder="Email" autocomplete="username" />
      <input class="popup__sync-input" id="auth-password" type="password" placeholder="Password" autocomplete="current-password" />
      <button class="popup__sync-btn" id="auth-submit">Sign in</button>
      <p class="popup__error" id="auth-error" hidden></p>
    </div>
  `;
  const emailEl = el("auth-email");
  const passwordEl = el("auth-password");
  const submitBtn = el("auth-submit");
  const errorEl = el("auth-error");

  submitBtn.addEventListener("click", async () => {
    errorEl.hidden = true;
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    if (!email || !password) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";
    const result = await chrome.runtime.sendMessage({ type: "SIGN_IN", email, password });
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";

    if (result.ok) {
      passwordEl.value = "";
      await refreshStatus();
      await refreshSyncWarning();
    } else {
      errorEl.textContent = result.error;
      errorEl.hidden = false;
    }
  });
}

function renderIdle() {
  hideFlowError();
  rootEl.className = "view";
  rootEl.innerHTML = `
    <div class="popup__status">
      <div class="popup__status-label">Status</div>
      <div class="popup__status-value">Idle</div>
      <div class="popup__status-hint">No Locked In session running.</div>
    </div>
    <a class="popup__flow-btn popup__flow-btn--gold popup__flow-btn--link popup__start-session-btn" id="start-session-link" href="${DASHBOARD_URL}" target="_blank" rel="noopener noreferrer">
      Start a Session
    </a>
  `;
}

// Exactly 2 buttons, clearly distinct: gold for the gated, friction-first path ("Request
// a Break" — note, then gate, then a duration you pick once you've earned it) vs. red for
// the fast, ungated real-emergency path. Mirrors LockedInOverlay.tsx's active screen 1:1.
// (There used to be a third "End Session Early" button here that called the exact same
// startEmergencyFlow as "Emergency Unblock" — a duplicate of the same action under a
// second name, removed rather than kept as a redundant entry point.)
function renderActive() {
  hideFlowError();
  rootEl.className = "view";
  rootEl.innerHTML = `
    <div class="popup__status popup__status--gold">
      <div class="popup__status-label">Locked In</div>
      <div class="popup__clock popup__clock--active" id="active-countdown">--:--</div>
      <div class="popup__status-hint">No shortcuts — ending early still takes a real confirmation.</div>
    </div>
    <div class="popup__actions">
      <button class="popup__action-btn popup__action-btn--break" id="btn-break">☕ Request a Break</button>
      <button class="popup__action-btn popup__action-btn--emergency" id="btn-emergency">Emergency Unblock</button>
    </div>
  `;
  el("btn-break").addEventListener("click", startBreakFlow);
  el("btn-emergency").addEventListener("click", startEmergencyFlow);
}

// Warm, dim-lit palette — deliberately not the gold/black Locked In look, matching The
// Lounge on the dashboard side. This popup is too small for the full illustrated scene,
// but the color shift + softer copy carries the same "permitted rest" mood. Also shows the
// break's own note (or, for an automatic Pomodoro/All Nighter break, its reminder text) —
// this screen used to never surface *why* the break was taken, unlike the dashboard's Lounge.
// Which Lounge tab is showing — module-level, not per-render, on purpose: render() below
// only calls renderPaused() once on the transition *into* the paused state, then just
// updates the countdown text every tick without rebuilding this DOM. That's what makes a
// Brain Games attempt (and this tab choice) survive the 1-second poll instead of resetting
// under the user every tick — the same reason a Chrome popup closing does still lose it
// (a closed popup's whole JS context is gone, module-level or not; there's nothing here to
// persist across *that*, same as the untimed web practice mode losing progress on
// navigating away — this is deliberately not the same "must survive closing" requirement
// as the timed break-gate attempt in challenge.js).
let loungeTab = "chill";
let loungeGameHandle = null;

function renderPaused(pause) {
  hideFlowError();
  rootEl.className = "view popup__lounge";
  const reasonText = pause?.noteText ? `“${pause.noteText}”` : pause?.reminderText || "";
  const reasonHtml = reasonText ? `<p class="popup__lounge-note">${escapeHtml(reasonText)}</p>` : "";
  loungeTab = "chill";

  rootEl.innerHTML = `
    <div class="popup__lounge-scene" aria-hidden="true">
      <div class="popup__lounge-moon"></div>
    </div>
    <div class="popup__status popup__status--lounge">
      <div class="popup__status-label">The Lounge</div>
      <div class="popup__clock popup__clock--lounge" id="paused-countdown">--:--</div>
      <div class="popup__status-hint">Sites stay blocked — this is just a mental pause. Take a breath.</div>
    </div>
    ${reasonHtml}
    <div class="popup__lounge-toggle" role="tablist">
      <button class="popup__lounge-toggle-btn" data-tab="chill" id="lounge-tab-chill">Just Chill</button>
      <button class="popup__lounge-toggle-btn" data-tab="games" id="lounge-tab-games">Brain Games</button>
    </div>
    <div id="lounge-body"></div>
    <button class="popup__link-btn popup__lounge-return" id="btn-end-break-early">I&rsquo;m ready, back to focus</button>
  `;

  el("lounge-tab-chill").addEventListener("click", () => selectLoungeTab("chill"));
  el("lounge-tab-games").addEventListener("click", () => selectLoungeTab("games"));
  renderLoungeTabs();
  renderLoungeBody();

  el("btn-end-break-early").addEventListener("click", async () => {
    el("btn-end-break-early").disabled = true;
    if (loungeGameHandle) {
      loungeGameHandle.destroy();
      loungeGameHandle = null;
    }
    await chrome.runtime.sendMessage({ type: "END_BREAK_EARLY" });
    await refreshStatus();
  });
}

function selectLoungeTab(tab) {
  if (tab === loungeTab) return;
  loungeTab = tab;
  renderLoungeTabs();
  renderLoungeBody();
}

function renderLoungeTabs() {
  const chillBtn = el("lounge-tab-chill");
  const gamesBtn = el("lounge-tab-games");
  if (!chillBtn || !gamesBtn) return;
  chillBtn.classList.toggle("popup__lounge-toggle-btn--active", loungeTab === "chill");
  gamesBtn.classList.toggle("popup__lounge-toggle-btn--active", loungeTab === "games");
  chillBtn.setAttribute("aria-selected", String(loungeTab === "chill"));
  gamesBtn.setAttribute("aria-selected", String(loungeTab === "games"));
}

function renderLoungeBody() {
  if (loungeGameHandle) {
    loungeGameHandle.destroy();
    loungeGameHandle = null;
  }
  const body = el("lounge-body");
  if (!body) return;

  if (loungeTab === "chill") {
    body.innerHTML = `<p class="popup__lounge-chill-text">Just breathe. No pressure, nothing to do.</p>`;
    return;
  }

  body.innerHTML = `
    <p class="popup__lounge-games-text">Something to do with your hands while you rest your mind. No pressure, nothing to win.</p>
    <div class="popup__lounge-game-frame">
      <div id="lounge-game-board" class="popup__lounge-game-board"></div>
    </div>
  `;
  loungeGameHandle = FGMemoryMatch.render(el("lounge-game-board"), { mode: "practice", pairs: 4 });
}

// ---------- Emergency Unblock flow (mirrors EmergencyUnblockModal.tsx) ----------
// Granting an emergency unblock now ends the session outright (matches the web app's
// LockedInOverlay) rather than pausing it — the next refreshStatus() call after a
// successful grant will show the idle screen once the session's gone.

function endFlow() {
  inFlow = false;
  refreshStatus();
}

function startEmergencyFlow() {
  inFlow = true;
  emergencyReason = "";
  currentState = "flow";
  renderEmergencyConfirm();
}

function renderEmergencyConfirm() {
  hideFlowError();
  rootEl.className = "view popup__flow";
  rootEl.innerHTML = `
    <h3 class="popup__flow-title">Is this really an emergency?</h3>
    <p class="popup__flow-text">Not for cravings or boredom.</p>
    <button class="popup__flow-btn popup__flow-btn--danger" id="emergency-confirm-btn">Yes, Continue</button>
    <button class="popup__flow-btn popup__flow-btn--ghost" id="emergency-confirm-cancel">Cancel</button>
  `;
  el("emergency-confirm-btn").addEventListener("click", renderEmergencyReason);
  el("emergency-confirm-cancel").addEventListener("click", endFlow);
}

function renderEmergencyReason() {
  hideFlowError();
  rootEl.className = "view popup__flow";
  rootEl.innerHTML = `
    <h3 class="popup__flow-title">What's the emergency?</h3>
    <p class="popup__flow-text">Write a sentence explaining what happened.</p>
    <textarea class="popup__flow-textarea" id="emergency-reason-input" rows="3" placeholder="I need to…"></textarea>
    <div class="popup__flow-counter" id="emergency-reason-counter">0 / ${MIN_REASON_LENGTH}</div>
    <button class="popup__flow-btn popup__flow-btn--danger" id="emergency-reason-continue" disabled>Submit &amp; Unblock</button>
  `;
  const input = el("emergency-reason-input");
  const counter = el("emergency-reason-counter");
  const continueBtn = el("emergency-reason-continue");

  input.addEventListener("input", () => {
    emergencyReason = input.value;
    const len = emergencyReason.trim().length;
    counter.textContent = `${len} / ${MIN_REASON_LENGTH}`;
    continueBtn.disabled = len < MIN_REASON_LENGTH;
  });

  // Checked right here, after the reason is submitted — no separate cooldown step.
  continueBtn.addEventListener("click", async () => {
    const info = await chrome.runtime.sendMessage({ type: "GET_BREAK_INFO" });
    if (!info.ok) {
      showFlowError(info.error);
      endFlow();
      return;
    }
    if (info.emergencyRemainingFree > 0) {
      await submitEmergency();
    } else {
      renderEmergencyLimitReached();
    }
  });
}

// The $1 paid unblock is removed (for now) — the monthly free cap is a hard stop, not a
// paywall, once it's used up. Mirrors EmergencyUnblockModal.tsx's "limit-reached" step.
function renderEmergencyLimitReached() {
  hideFlowError();
  rootEl.className = "view popup__flow";
  rootEl.innerHTML = `
    <h3 class="popup__flow-title">Out of emergencies this month</h3>
    <p class="popup__flow-text">You've used all ${MAX_FREE_EMERGENCY_UNBLOCKS_DISPLAY} Emergency Unblocks this month — that's the whole point of the cap. More become available next month.</p>
    <button class="popup__flow-btn popup__flow-btn--danger" id="emergency-limit-close">Back to focus</button>
  `;
  el("emergency-limit-close").addEventListener("click", endFlow);
}

async function submitEmergency() {
  // wasPaid is always false now — see renderEmergencyLimitReached's comment. Left as an
  // explicit param on the message (rather than dropped) so background.js's handling and
  // the was_paid column stay untouched and easy to bring back later.
  const result = await chrome.runtime.sendMessage({ type: "START_EMERGENCY_UNBLOCK", reason: emergencyReason, wasPaid: false });
  if (!result.ok) {
    showFlowError(result.error);
    return;
  }
  inFlow = false;
  await refreshStatus();
}

// ---------- Request a Break flow (mirrors BreakFlowModal.tsx) ----------
// Order matches the dashboard exactly: write a note first if that layer's on, then
// always a challenge — it isn't optional — then (and only then, once it's actually been
// earned) does the break duration get picked. A challenge game is too much for this popup
// to host — and the popup closes the instant it loses focus anyway — so that layer hands
// off to its own tab (challenge.html), which also hosts the post-pass duration picker,
// instead of rendering any of it inline here.

async function startBreakFlow() {
  inFlow = true;
  hideFlowError();
  const info = await chrome.runtime.sendMessage({ type: "GET_BREAK_INFO" });
  if (!info.ok) {
    showFlowError(info.error);
    inFlow = false;
    return;
  }

  if (info.breaksUsed >= info.breaksCap) {
    currentState = "flow";
    renderBreakLimit(`This session earns ${info.breaksCap} break${info.breaksCap === 1 ? "" : "s"} — you've used all of them.`);
    return;
  }

  breakNotesEnabledForCurrentFlow = info.breakNotesEnabled;
  currentState = "flow";
  if (breakNotesEnabledForCurrentFlow) {
    renderBreakNote();
  } else {
    launchChallenge("");
  }
}

/** Always the first break-request screen when the note layer's on — matches
 *  BreakFlowModal.tsx's order (note, then the mandatory gate, then duration). */
function renderBreakNote() {
  hideFlowError();
  rootEl.className = "view popup__flow";
  rootEl.innerHTML = `
    <h3 class="popup__flow-title">Prove you deserve this break.</h3>
    <p class="popup__flow-text">Why do you need this break?</p>
    <textarea class="popup__flow-textarea" id="break-note-input" rows="3" placeholder="I need to…"></textarea>
    <div class="popup__flow-counter" id="break-note-counter">0 / ${MIN_BREAK_NOTE_WORDS}-${MAX_BREAK_NOTE_WORDS} words</div>
    <button class="popup__flow-btn popup__flow-btn--gold" id="break-note-continue" disabled>Continue</button>
    <button class="popup__flow-btn popup__flow-btn--ghost" id="break-note-cancel">Cancel</button>
  `;
  const input = el("break-note-input");
  const counter = el("break-note-counter");
  const continueBtn = el("break-note-continue");

  input.addEventListener("input", () => {
    const words = input.value.trim().split(/\s+/).filter(Boolean);
    const count = words.length;
    counter.textContent = `${count} / ${MIN_BREAK_NOTE_WORDS}-${MAX_BREAK_NOTE_WORDS} words`;
    continueBtn.disabled = count < MIN_BREAK_NOTE_WORDS || count > MAX_BREAK_NOTE_WORDS;
  });

  continueBtn.addEventListener("click", () => launchChallenge(input.value));
  el("break-note-cancel").addEventListener("click", endFlow);
}

function renderBreakLimit(message) {
  hideFlowError();
  rootEl.className = "view popup__flow";
  rootEl.innerHTML = `
    <h3 class="popup__flow-title">No breaks left.</h3>
    <p class="popup__flow-text">${message}</p>
    <button class="popup__flow-btn popup__flow-btn--ghost" id="break-limit-cancel">Close</button>
  `;
  el("break-limit-cancel").addEventListener("click", endFlow);
}

/** Opens challenge.html in its own tab and hands control over to it — win or lose, it
 *  reports the outcome straight to the service worker (BREAK_CHALLENGE_RESULT), so this
 *  popup doesn't need to stay open or track anything else. It usually won't stay open
 *  anyway: opening a new tab takes away the popup's focus, which closes it. No duration
 *  to pass along here — challenge.html asks for that itself, only after the gate's won. */
async function launchChallenge(noteText) {
  const result = await chrome.runtime.sendMessage({
    type: "OPEN_BREAK_CHALLENGE",
    note: noteText,
    breakNotesEnabled: breakNotesEnabledForCurrentFlow,
  });
  if (!result.ok) {
    showFlowError(result.error);
    return;
  }
  inFlow = false;
  await refreshStatus();
}

// ---------- status polling ----------

function render(session, remainingMs, auth) {
  accountFooterEl.hidden = !auth;
  if (auth) authNameEl.textContent = auth.name;

  if (!auth) {
    setHeaderBadge("SIGNED OUT");
    if (currentState !== "signed-out") {
      currentState = "signed-out";
      renderSignedOut();
    }
    return;
  }
  if (!session?.active) {
    setHeaderBadge("IDLE");
    if (currentState !== "idle") {
      currentState = "idle";
      renderIdle();
    }
    return;
  }
  if (session.pause) {
    setHeaderBadge("ON BREAK", "break");
    if (currentState !== "paused") {
      currentState = "paused";
      renderPaused(session.pause);
    }
    const countdownEl = el("paused-countdown");
    if (countdownEl) countdownEl.textContent = formatRemaining(remainingMs);
    return;
  }
  setHeaderBadge("LOCKED IN", "active");
  if (currentState !== "active") {
    currentState = "active";
    renderActive();
  }
  const countdownEl = el("active-countdown");
  if (countdownEl) countdownEl.textContent = formatRemaining(remainingMs);
}

async function refreshSyncWarning() {
  const { error } = await chrome.runtime.sendMessage({ type: "GET_SYNC_ERROR" });
  if (error) {
    syncWarningEl.textContent = `⚠ Sync issue: ${error}`;
    syncWarningEl.hidden = false;
  } else {
    syncWarningEl.hidden = true;
  }
}

// Cheap, local-only — safe to poll every second for a smooth countdown. Skipped entirely
// while a flow is open so it can't interrupt the user mid-input.
async function refreshStatus() {
  if (inFlow) return;
  const { session, remainingMs } = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  const { auth } = await chrome.runtime.sendMessage({ type: "GET_AUTH" });
  render(session, remainingMs, auth);
}

// Network-backed — same SYNC_NOW the service worker's own alarm tick uses, just run much
// more often while this popup is actually open (a service worker can't do this on its own:
// Chrome clamps MV3 alarms to roughly a 1-minute minimum in production, so *its* pickup of
// a dashboard-started break is bounded by that — this is what gets the popup, specifically,
// to reflect a break started on the dashboard within a couple of seconds instead).
async function refreshFast() {
  if (inFlow) return;
  const { session, remainingMs } = await chrome.runtime.sendMessage({ type: "SYNC_NOW" });
  const { auth } = await chrome.runtime.sendMessage({ type: "GET_AUTH" });
  render(session, remainingMs, auth);
}

authSignOutBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
  await refreshStatus();
  await refreshSyncWarning();
});

// ---------- init ----------
// One network-backed sync the moment the popup opens (so a session started on the
// dashboard seconds ago shows up immediately), then a cheap local poll every second
// after that to keep the countdown ticking smoothly.
(async () => {
  const { session, remainingMs } = await chrome.runtime.sendMessage({ type: "SYNC_NOW" });
  const { auth } = await chrome.runtime.sendMessage({ type: "GET_AUTH" });
  render(session, remainingMs, auth);
  await refreshSyncWarning();
})();

const pollHandle = setInterval(refreshStatus, 1000);
const fastSyncPollHandle = setInterval(refreshFast, 2000);
const syncWarningPollHandle = setInterval(refreshSyncWarning, 5000);
window.addEventListener("unload", () => {
  clearInterval(pollHandle);
  clearInterval(fastSyncPollHandle);
  clearInterval(syncWarningPollHandle);
});
