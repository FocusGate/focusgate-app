// popup.js — the Locked-In control panel. Sessions still only ever start from the
// dashboard, but once one is running this is where you actually use FocusGate day to
// day: see time left, and reach the same friction-gated escape hatches the dashboard
// has — Emergency Unblock (which ends the session) and Take a Break (a temporary pause)
// — both recorded to the same Supabase tables. "Emergency Unblock" and "End Session
// Early" on the active screen are two entry points into that one identical
// confirm-then-reason flow, not two different features — there's still exactly one way
// to end a session early, it just has two names depending on how you think about it.
//
// Everything below one state's markup is built with innerHTML on demand, not pre-written
// into popup.html and toggled with `hidden` — there's exactly one screen's worth of DOM
// in the document at any moment, built the instant its button is pressed and nothing
// before that.

// TODO: replace with the real production dashboard URL once deployed.
const DASHBOARD_URL = "https://focusgate.app/dashboard";

const MIN_REASON_LENGTH = 15; // mirrors EmergencyUnblockModal.tsx — must match background.js
const MAX_FREE_EMERGENCY_UNBLOCKS_DISPLAY = 2; // mirrors lib/supabase.ts's MAX_FREE_EMERGENCY_UNBLOCKS, for copy only
const MIN_BREAK_NOTE_WORDS = 5; // mirrors lib/stats.ts — must match background.js
const MAX_BREAK_NOTE_WORDS = 10; // mirrors lib/stats.ts — must match background.js
// Breaks are custom-length now — mirrors lib/stats.ts's MIN/MAX/DEFAULT_BREAK_SECONDS.
const MIN_BREAK_SECONDS = 1;
const MAX_BREAK_SECONDS = 15 * 60;
const DEFAULT_BREAK_SECONDS = 5 * 60;

/** "3 min 20 sec" / "45 sec" / "1 min" — mirrors lib/stats.ts's formatBreakDuration(). */
function formatBreakDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  if (minutes === 0) return `${seconds} sec`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} sec`;
}

const el = (id) => document.getElementById(id);

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

// True while an Emergency Unblock / Take a Break sub-flow is on screen — the 1-second
// status poll skips re-rendering while this is set, so it can't yank the popup back to
// the main view mid-flow (e.g. while typing a reason).
let inFlow = false;
let emergencyReason = "";
let breakNotesEnabledForCurrentFlow = false;
let requestedBreakSeconds = DEFAULT_BREAK_SECONDS;

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
      <button class="popup__action-btn popup__action-btn--emergency" id="btn-emergency">Emergency Unblock</button>
      <button class="popup__action-btn popup__action-btn--outline" id="btn-end-early">End Session Early</button>
    </div>
    <button class="popup__link-btn popup__break-link" id="btn-break">☕ Take a Break instead</button>
  `;
  el("btn-emergency").addEventListener("click", startEmergencyFlow);
  el("btn-end-early").addEventListener("click", startEmergencyFlow);
  el("btn-break").addEventListener("click", startBreakFlow);
}

// Warm, dim-lit palette — deliberately not the gold/black Locked In look, matching The
// Lounge on the dashboard side. This popup is too small for the full illustrated scene,
// but the color shift + softer copy carries the same "permitted rest" mood.
function renderPaused() {
  hideFlowError();
  rootEl.className = "view popup__lounge";
  rootEl.innerHTML = `
    <div class="popup__status popup__status--lounge">
      <div class="popup__status-label">The Lounge</div>
      <div class="popup__clock popup__clock--lounge" id="paused-countdown">--:--</div>
      <div class="popup__status-hint">Sites stay blocked — this is just a mental pause. Take a breath.</div>
    </div>
    <button class="popup__link-btn popup__lounge-return" id="btn-end-break-early">I&rsquo;m ready, back to focus</button>
  `;
  el("btn-end-break-early").addEventListener("click", async () => {
    el("btn-end-break-early").disabled = true;
    await chrome.runtime.sendMessage({ type: "END_BREAK_EARLY" });
    await refreshStatus();
  });
}

// ---------- Emergency Unblock flow (mirrors EmergencyUnblockModal.tsx) ----------
// Granting an emergency unblock now ends the session outright (matches the web app's
// LockedInOverlay) rather than pausing it — the next refreshStatus() call after a
// successful grant will show the idle screen once the session's gone. "Emergency
// Unblock" and "End Session Early" on the active screen both call this — same one
// friction-gated exit, two entry points into it.

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

  // Free-vs-paid is checked right here, after the reason is submitted — no separate
  // cooldown step. Paid still needs its own explicit confirm screen: charging $1 without
  // a visible, separately-clicked consent step isn't something to do silently.
  continueBtn.addEventListener("click", async () => {
    const info = await chrome.runtime.sendMessage({ type: "GET_BREAK_INFO" });
    if (!info.ok) {
      showFlowError(info.error);
      endFlow();
      return;
    }
    if (info.emergencyRemainingFree > 0) {
      await submitEmergency(false);
    } else {
      renderEmergencyPaid();
    }
  });
}

function renderEmergencyPaid() {
  hideFlowError();
  rootEl.className = "view popup__flow";
  rootEl.innerHTML = `
    <h3 class="popup__flow-title">Out of free emergencies</h3>
    <p class="popup__flow-text">You've used all ${MAX_FREE_EMERGENCY_UNBLOCKS_DISPLAY} free unblocks this month. Extra unblocks cost $1 each.</p>
    <button class="popup__flow-btn popup__flow-btn--light" id="emergency-paid-confirm">Buy Emergency Unblock ($1)</button>
    <p class="popup__flow-note">Yes. It costs money on purpose. This friction is the point.</p>
    <button class="popup__flow-btn popup__flow-btn--ghost" id="emergency-paid-cancel">Never mind</button>
  `;
  el("emergency-paid-confirm").addEventListener("click", () => submitEmergency(true));
  el("emergency-paid-cancel").addEventListener("click", endFlow);
}

async function submitEmergency(wasPaid) {
  const result = await chrome.runtime.sendMessage({ type: "START_EMERGENCY_UNBLOCK", reason: emergencyReason, wasPaid });
  if (!result.ok) {
    showFlowError(result.error);
    return;
  }
  inFlow = false;
  await refreshStatus();
}

// ---------- Take a Break flow (mirrors BreakFlowModal.tsx) ----------
// Order matches the dashboard exactly: write a note first if that layer's on, then
// always a challenge — it isn't optional — then (and only then) the break actually
// starts. A challenge game is too much for this popup to host — and the popup closes the
// instant it loses focus anyway — so that layer hands off to its own tab
// (challenge.html) instead of rendering inline.

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
  renderBreakDuration();
}

/** Always the first break-request screen, note layer or not — matches BreakFlowModal.tsx's
 *  order (duration, then note, then the mandatory gate). */
function renderBreakDuration() {
  hideFlowError();
  requestedBreakSeconds = DEFAULT_BREAK_SECONDS;
  rootEl.className = "view popup__flow";
  rootEl.innerHTML = `
    <h3 class="popup__flow-title">How long do you need?</h3>
    <p class="popup__flow-text">Sites stay blocked either way — this is just how long your session clock pauses.</p>
    <div class="popup__break-duration-preview" id="break-duration-preview">${formatBreakDuration(requestedBreakSeconds)}</div>
    <input type="range" class="popup__break-duration-slider" id="break-duration-slider" min="${MIN_BREAK_SECONDS}" max="${MAX_BREAK_SECONDS}" step="1" value="${requestedBreakSeconds}" />
    <div class="popup__flow-range-labels"><span>1 sec</span><span>15 min</span></div>
    <button class="popup__flow-btn popup__flow-btn--gold" id="break-duration-continue">Continue</button>
    <button class="popup__flow-btn popup__flow-btn--ghost" id="break-duration-cancel">Cancel</button>
  `;
  const slider = el("break-duration-slider");
  const preview = el("break-duration-preview");
  slider.addEventListener("input", () => {
    requestedBreakSeconds = Number(slider.value);
    preview.textContent = formatBreakDuration(requestedBreakSeconds);
  });
  el("break-duration-continue").addEventListener("click", () => {
    if (breakNotesEnabledForCurrentFlow) {
      renderBreakNote();
    } else {
      launchChallenge("");
    }
  });
  el("break-duration-cancel").addEventListener("click", endFlow);
}

function renderBreakNote() {
  hideFlowError();
  rootEl.className = "view popup__flow";
  rootEl.innerHTML = `
    <h3 class="popup__flow-title">Prove you deserve this break.</h3>
    <p class="popup__flow-text">Why do you need this break?</p>
    <textarea class="popup__flow-textarea" id="break-note-input" rows="3" placeholder="I need to…"></textarea>
    <div class="popup__flow-counter" id="break-note-counter">0 / ${MIN_BREAK_NOTE_WORDS}-${MAX_BREAK_NOTE_WORDS} words</div>
    <button class="popup__flow-btn popup__flow-btn--gold" id="break-note-continue" disabled>Start break</button>
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
 *  anyway: opening a new tab takes away the popup's focus, which closes it. */
async function launchChallenge(noteText) {
  const result = await chrome.runtime.sendMessage({
    type: "OPEN_BREAK_CHALLENGE",
    note: noteText,
    breakNotesEnabled: breakNotesEnabledForCurrentFlow,
    requestedSeconds: requestedBreakSeconds,
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
      renderPaused();
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
const syncWarningPollHandle = setInterval(refreshSyncWarning, 5000);
window.addEventListener("unload", () => {
  clearInterval(pollHandle);
  clearInterval(syncWarningPollHandle);
});
