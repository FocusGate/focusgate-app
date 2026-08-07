// challenge.js — the in-extension "prove you deserve this break" games. Ported from
// components/app/friction/gates/*Gate.tsx (React) into plain DOM/JS since this extension
// has no build step.
//
// This page only ever runs after popup.js's OPEN_BREAK_CHALLENGE opens it — there's no
// path to start a break from here that skips the service worker's own checks (breaks
// cap, active session, signed in) or that never mirrors what got granted back to
// Supabase (see BREAK_CHALLENGE_RESULT in background.js).
//
// A pass doesn't grant the break immediately — it hands off to renderBreakDuration()
// below for the "how long do you need?" screen (1-15 min), matching BreakFlowModal.tsx's
// order: note, then gate, then only-once-you've-earned-it duration. Only *that* final step
// actually sends BREAK_CHALLENGE_RESULT; a fail sends it immediately since there's nothing
// further to earn.

const root = document.getElementById("challenge-root");

const ACCENTS = { "math-sprint": "#F59E0B", "memory-match": "#A78BFA", "geography-quiz": "#FB923C" };
const LABELS = { "math-sprint": "Math Sprint", "memory-match": "Memory Match", "geography-quiz": "Geography Quiz" };

// Break length, picked here (not before the gate) — mirrors lib/stats.ts's
// MIN/MAX/DEFAULT_BREAK_SECONDS, which must stay in sync with background.js's own copy.
const MIN_BREAK_SECONDS = 60;
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

let activeTimerId = null;
let settled = false;

function clearActiveTimer() {
  if (activeTimerId !== null) {
    clearInterval(activeTimerId);
    activeTimerId = null;
  }
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------- entry ----------

(async function init() {
  const { ok, pending } = await chrome.runtime.sendMessage({ type: "GET_PENDING_BREAK_CHALLENGE" });
  if (!ok || !pending) {
    renderNothingToDo();
    return;
  }
  if (pending.challenge === "ask") {
    renderChooser(pending.seconds);
  } else {
    startGame(pending.challenge, pending.seconds);
  }
})();

function renderNothingToDo() {
  root.innerHTML = `
    <div class="challenge__card challenge__card--center">
      <div class="challenge__icon">🔒</div>
      <h1 class="challenge__title">Nothing to do here</h1>
      <p class="challenge__subtitle">Open this from the "Request a Break" button in the FocusGate popup.</p>
      <button class="challenge__btn challenge__btn--ghost" id="close-btn">Close this tab</button>
    </div>
  `;
  document.getElementById("close-btn").addEventListener("click", closeTab);
}

function renderChooser(seconds) {
  root.innerHTML = `
    <div class="challenge__card">
      <h1 class="challenge__title">Choose your challenge</h1>
      <p class="challenge__subtitle">Solve it in ${seconds} seconds. Only then does your break start.</p>
      <div class="challenge__choices">
        <button class="challenge__choice" data-slug="math-sprint" style="border-color:${ACCENTS["math-sprint"]}55">Math Sprint</button>
        <button class="challenge__choice" data-slug="memory-match" style="border-color:${ACCENTS["memory-match"]}55">Memory Match</button>
        <button class="challenge__choice" data-slug="geography-quiz" style="border-color:${ACCENTS["geography-quiz"]}55">Geography Quiz</button>
      </div>
    </div>
  `;
  root.querySelectorAll(".challenge__choice").forEach((btn) => {
    btn.addEventListener("click", () => startGame(btn.dataset.slug, seconds));
  });
}

function startGame(slug, seconds) {
  settled = false;
  if (slug === "memory-match") memoryMatch(seconds);
  else if (slug === "geography-quiz") geographyQuiz(seconds);
  else mathSprint(seconds);
}

// ---------- shared result screen ----------

/** A fail ends the flow right here — nothing was earned, so there's no duration to pick,
 *  and the result is reported immediately. A pass doesn't report anything yet: it hands
 *  off to renderBreakDuration() below, which only sends BREAK_CHALLENGE_RESULT once a
 *  length's actually been chosen. */
function finish(passed, slug) {
  if (settled) return;
  settled = true;
  clearActiveTimer();

  if (!passed) {
    chrome.runtime.sendMessage({ type: "BREAK_CHALLENGE_RESULT", passed: false, game: slug }).catch(() => {});
    root.innerHTML = `
      <div class="challenge__card challenge__card--center fg-shake">
        <div class="challenge__icon">🔒</div>
        <h1 class="challenge__title">Session continues.</h1>
        <p class="challenge__subtitle challenge__subtitle--danger">Try again next time.</p>
      </div>
    `;
    setTimeout(closeTab, 1800);
    return;
  }

  renderBreakDuration(slug);
}

function renderBreakDuration(slug) {
  let seconds = DEFAULT_BREAK_SECONDS;
  root.innerHTML = `
    <div class="challenge__card challenge__card--center">
      <div class="challenge__icon">☕</div>
      <h1 class="challenge__title" style="color:${ACCENTS[slug]}">Nice work.</h1>
      <p class="challenge__subtitle">How long do you need?</p>
      <div class="popup__break-duration-preview" id="duration-preview">${formatBreakDuration(seconds)}</div>
      <input type="range" class="popup__break-duration-slider" id="duration-slider" min="${MIN_BREAK_SECONDS}" max="${MAX_BREAK_SECONDS}" step="1" value="${seconds}" />
      <div class="popup__flow-range-labels"><span>1 min</span><span>15 min</span></div>
      <button class="challenge__btn challenge__btn--gold" id="duration-continue">Start My Break</button>
    </div>
  `;
  const slider = document.getElementById("duration-slider");
  const preview = document.getElementById("duration-preview");
  slider.addEventListener("input", () => {
    seconds = Number(slider.value);
    preview.textContent = formatBreakDuration(seconds);
  });
  document.getElementById("duration-continue").addEventListener("click", () => grantAndFinish(slug, seconds));
}

async function grantAndFinish(slug, seconds) {
  const btn = document.getElementById("duration-continue");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Starting…";
  }
  const result = await chrome.runtime
    .sendMessage({ type: "BREAK_CHALLENGE_RESULT", passed: true, game: slug, requestedSeconds: seconds })
    .catch(() => ({ ok: false }));

  if (!result?.ok || result.granted === false) {
    root.innerHTML = `
      <div class="challenge__card challenge__card--center">
        <div class="challenge__icon">⚠️</div>
        <h1 class="challenge__title">Couldn&rsquo;t start your break</h1>
        <p class="challenge__subtitle challenge__subtitle--danger">${result?.error ?? "Something went wrong — head back and try again."}</p>
      </div>
    `;
    setTimeout(closeTab, 2200);
    return;
  }

  root.innerHTML = `
    <div class="challenge__card challenge__card--center">
      <div class="challenge__icon">☕</div>
      <h1 class="challenge__title" style="color:${ACCENTS[slug]}">Break started</h1>
      <p class="challenge__subtitle">Nice work — head back to what you were doing. This tab will close itself.</p>
    </div>
  `;
  setTimeout(closeTab, 1400);
}

function closeTab() {
  chrome.runtime.sendMessage({ type: "CLOSE_TAB" }).catch(() => {});
}

// ---------- Math Sprint (mirrors MathSprintGate.tsx) ----------

function generateProblem() {
  const op = Math.random() < 0.5 ? "+" : "-";
  let a, b, answer, text;
  if (op === "+") {
    a = randomInt(4, 20);
    b = randomInt(4, 20);
    answer = a + b;
    text = `${a} + ${b}`;
  } else {
    a = randomInt(10, 30);
    b = randomInt(1, a);
    answer = a - b;
    text = `${a} − ${b}`;
  }
  const distractors = new Set();
  while (distractors.size < 3) {
    const offset = randomInt(1, 6) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + offset;
    if (candidate !== answer && candidate >= 0) distractors.add(candidate);
  }
  return { text, answer, options: shuffle([answer, ...distractors]) };
}

function mathSprint(seconds) {
  const QUESTION_COUNT = 5;
  let problem = generateProblem();
  let solved = 0;
  let timeLeft = seconds;

  function render() {
    root.innerHTML = `
      <div class="challenge__card">
        <div class="challenge__game-title" style="color:${ACCENTS["math-sprint"]}">${LABELS["math-sprint"]}</div>
        <div class="challenge__meta">
          <span>${solved} / ${QUESTION_COUNT} solved</span>
          <span class="${timeLeft <= 10 ? "challenge__time--danger" : ""}">${timeLeft}s left</span>
        </div>
        <div class="challenge__problem">${problem.text} = ?</div>
        <div class="challenge__grid challenge__grid--2">
          ${problem.options.map((opt) => `<button class="challenge__option" data-value="${opt}">${opt}</button>`).join("")}
        </div>
      </div>
    `;
    root.querySelectorAll(".challenge__option").forEach((btn) => {
      btn.addEventListener("click", () => handleAnswer(Number(btn.dataset.value), btn));
    });
  }

  function handleAnswer(value, btnEl) {
    if (settled) return;
    root.querySelectorAll(".challenge__option").forEach((b) => (b.disabled = true));
    const correct = value === problem.answer;
    if (!correct) {
      btnEl.classList.add("challenge__option--wrong", "fg-shake");
      setTimeout(() => finish(false, "math-sprint"), 500);
      return;
    }
    btnEl.classList.add("challenge__option--right");
    solved += 1;
    setTimeout(() => {
      if (solved >= QUESTION_COUNT) {
        finish(true, "math-sprint");
      } else {
        problem = generateProblem();
        render();
      }
    }, 350);
  }

  activeTimerId = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    if (timeLeft === 0) {
      finish(false, "math-sprint");
      return;
    }
    render();
  }, 1000);

  render();
}

// ---------- Memory Match (mirrors MemoryMatchGate.tsx) ----------

function memoryMatch(seconds) {
  const SYMBOLS = ["🧠", "🔥", "⚡", "🎯"];
  const cards = shuffle([...SYMBOLS, ...SYMBOLS]).map((symbol, id) => ({ id, symbol }));
  const matched = new Set();
  let flipped = [];
  let timeLeft = seconds;
  let busy = false;

  function render() {
    root.innerHTML = `
      <div class="challenge__card">
        <div class="challenge__game-title" style="color:${ACCENTS["memory-match"]}">${LABELS["memory-match"]}</div>
        <div class="challenge__meta">
          <span>${matched.size / 2} / ${SYMBOLS.length} pairs</span>
          <span class="${timeLeft <= 10 ? "challenge__time--danger" : ""}">${timeLeft}s left</span>
        </div>
        <div class="challenge__grid challenge__grid--4">
          ${cards
            .map((card) => {
              const faceUp = matched.has(card.id) || flipped.includes(card.id);
              const isMatched = matched.has(card.id);
              return `<button class="challenge__card-tile ${faceUp ? "challenge__card-tile--up" : ""} ${isMatched ? "challenge__card-tile--matched" : ""}" data-id="${card.id}" ${faceUp ? "disabled" : ""}>${faceUp ? card.symbol : ""}</button>`;
            })
            .join("")}
        </div>
      </div>
    `;
    root.querySelectorAll(".challenge__card-tile").forEach((btn) => {
      btn.addEventListener("click", () => handleCardClick(Number(btn.dataset.id)));
    });
  }

  function handleCardClick(id) {
    if (busy || settled || matched.has(id) || flipped.includes(id)) return;
    if (flipped.length === 0) {
      flipped = [id];
      render();
      return;
    }
    const nextFlipped = [flipped[0], id];
    flipped = nextFlipped;
    busy = true;
    render();

    const first = cards.find((c) => c.id === nextFlipped[0]);
    const second = cards.find((c) => c.id === id);
    if (first.symbol === second.symbol) {
      setTimeout(() => {
        matched.add(first.id);
        matched.add(second.id);
        flipped = [];
        busy = false;
        if (matched.size >= cards.length) {
          finish(true, "memory-match");
        } else {
          render();
        }
      }, 300);
    } else {
      setTimeout(() => {
        flipped = [];
        busy = false;
        render();
      }, 550);
    }
  }

  activeTimerId = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    if (timeLeft === 0) {
      finish(false, "memory-match");
      return;
    }
    render();
  }, 1000);

  render();
}

// ---------- Geography Quiz (mirrors GeographyQuizGate.tsx's mixed trivia) ----------
// No flag emoji here on purpose — Windows renders flag-emoji sequences as literal
// two-letter codes ("FR") with no color-emoji font installed, which is exactly the
// "what is AU" abbreviation problem this quiz format exists to get away from. A plain
// inline map-pin SVG can't degrade to text like that. One icon for all three question
// types here (location/capital/landmark) rather than the web app's three lucide icons —
// this extension has no icon library, and a single pin still reads fine for "geography."

const MAP_PIN_SVG =
  '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';

const COUNTRIES = [
  { name: "France", continent: "Europe", capital: "Paris", landmark: "The Eiffel Tower" },
  { name: "Germany", continent: "Europe", capital: "Berlin", landmark: "The Brandenburg Gate" },
  { name: "Norway", continent: "Europe", capital: "Oslo", landmark: "The Norwegian Fjords" },
  { name: "Brazil", continent: "South America", capital: "Brasília", landmark: "Christ the Redeemer" },
  { name: "Argentina", continent: "South America", capital: "Buenos Aires", landmark: "Iguazu Falls" },
  { name: "Japan", continent: "Asia", capital: "Tokyo", landmark: "Mount Fuji" },
  { name: "India", continent: "Asia", capital: "New Delhi", landmark: "The Taj Mahal" },
  { name: "Egypt", continent: "Africa", capital: "Cairo", landmark: "The Pyramids of Giza" },
  { name: "Kenya", continent: "Africa", capital: "Nairobi", landmark: "The Maasai Mara" },
  { name: "Canada", continent: "North America", capital: "Ottawa", landmark: "Niagara Falls" },
  { name: "Mexico", continent: "North America", capital: "Mexico City", landmark: "Chichén Itzá" },
  { name: "Australia", continent: "Oceania", capital: "Canberra", landmark: "The Great Barrier Reef" },
];

const CONTINENTS = ["Europe", "Asia", "Africa", "North America", "South America", "Oceania"];
const QUESTION_TYPES = ["location", "capital", "landmark"];

function buildQuestion(country, type) {
  const accent = ACCENTS["geography-quiz"];
  if (type === "location") {
    const distractors = shuffle(CONTINENTS.filter((c) => c !== country.continent)).slice(0, 3);
    return {
      question: `Where is <strong style="color:${accent}">${country.name}</strong> located?`,
      answer: country.continent,
      options: shuffle([country.continent, ...distractors]),
    };
  }
  if (type === "capital") {
    const distractors = shuffle(COUNTRIES.filter((c) => c.name !== country.name).map((c) => c.capital)).slice(0, 3);
    return {
      question: `What is the capital of <strong style="color:${accent}">${country.name}</strong>?`,
      answer: country.capital,
      options: shuffle([country.capital, ...distractors]),
    };
  }
  const distractors = shuffle(COUNTRIES.filter((c) => c.name !== country.name).map((c) => c.name)).slice(0, 3);
  return {
    question: `<strong style="color:${accent}">${country.landmark}</strong> is a famous landmark in which country?`,
    answer: country.name,
    options: shuffle([country.name, ...distractors]),
  };
}

function buildRound() {
  const QUESTION_COUNT = 3;
  const pool = shuffle(COUNTRIES).slice(0, QUESTION_COUNT);
  return pool.map((c) => buildQuestion(c, QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)]));
}

function geographyQuiz(seconds) {
  const round = buildRound();
  let index = 0;
  let timeLeft = seconds;

  function render() {
    const current = round[index];
    root.innerHTML = `
      <div class="challenge__card">
        <div class="challenge__game-title" style="color:${ACCENTS["geography-quiz"]}">${LABELS["geography-quiz"]}</div>
        <div class="challenge__meta">
          <span>Question ${index + 1} / ${round.length}</span>
          <span class="${timeLeft <= 10 ? "challenge__time--danger" : ""}">${timeLeft}s left</span>
        </div>
        <div class="challenge__flag" style="color:${ACCENTS["geography-quiz"]}; display:flex; justify-content:center;">${MAP_PIN_SVG}</div>
        <div class="challenge__question">${current.question}</div>
        <div class="challenge__grid challenge__grid--2">
          ${current.options.map((opt) => `<button class="challenge__option" data-value="${opt}">${opt}</button>`).join("")}
        </div>
      </div>
    `;
    root.querySelectorAll(".challenge__option").forEach((btn) => {
      btn.addEventListener("click", () => handleAnswer(btn.dataset.value, btn));
    });
  }

  function handleAnswer(value, btnEl) {
    if (settled) return;
    const current = round[index];
    root.querySelectorAll(".challenge__option").forEach((b) => (b.disabled = true));
    const correct = value === current.answer;
    if (!correct) {
      btnEl.classList.add("challenge__option--wrong", "fg-shake");
      setTimeout(() => finish(false, "geography-quiz"), 600);
      return;
    }
    btnEl.classList.add("challenge__option--right");
    setTimeout(() => {
      if (index + 1 >= round.length) {
        finish(true, "geography-quiz");
      } else {
        index += 1;
        render();
      }
    }, 400);
  }

  activeTimerId = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    if (timeLeft === 0) {
      finish(false, "geography-quiz");
      return;
    }
    render();
  }, 1000);

  render();
}
