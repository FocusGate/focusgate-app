// challenge.js — the in-extension "prove you deserve this break" games. Ported from
// components/app/friction/gates/*Gate.tsx (React) into plain DOM/JS since this extension
// has no build step. Deliberately simplified in one place: Geography Quiz swaps the
// dashboard's SVG world map (d3-geo + topojson + a world-atlas dataset — no path into an
// unpacked, no-bundler extension) for a flag-emoji quiz over the same country list and
// the same "3 questions, one shared timer, any miss fails" rules.
//
// This page only ever runs after popup.js's OPEN_BREAK_CHALLENGE opens it — there's no
// path to start a break from here that skips the service worker's own checks (breaks
// cap, active session, signed in) or that never mirrors what got granted back to
// Supabase (see BREAK_CHALLENGE_RESULT in background.js).

const root = document.getElementById("challenge-root");

const ACCENTS = { "math-sprint": "#F59E0B", "memory-match": "#A78BFA", "geography-quiz": "#FB923C" };
const LABELS = { "math-sprint": "Math Sprint", "memory-match": "Memory Match", "geography-quiz": "Geography Quiz" };

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
      <p class="challenge__subtitle">Open this from the "Take a Break" button in the FocusGate popup.</p>
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

async function finish(passed, slug) {
  if (settled) return;
  settled = true;
  clearActiveTimer();

  chrome.runtime.sendMessage({ type: "BREAK_CHALLENGE_RESULT", passed, game: slug }).catch(() => {});

  root.innerHTML = passed
    ? `
      <div class="challenge__card challenge__card--center">
        <div class="challenge__icon">☕</div>
        <h1 class="challenge__title" style="color:${ACCENTS[slug]}">Break started</h1>
        <p class="challenge__subtitle">Nice work — head back to what you were doing. This tab will close itself.</p>
      </div>
    `
    : `
      <div class="challenge__card challenge__card--center fg-shake">
        <div class="challenge__icon">🔒</div>
        <h1 class="challenge__title">Session continues.</h1>
        <p class="challenge__subtitle challenge__subtitle--danger">No break for you.</p>
      </div>
    `;

  setTimeout(closeTab, passed ? 1400 : 1800);
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

// ---------- Geography Quiz (flag-emoji variant of GeographyQuizGate.tsx) ----------

const COUNTRIES = [
  { name: "France", flag: "🇫🇷" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "Egypt", flag: "🇪🇬" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "India", flag: "🇮🇳" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "Norway", flag: "🇳🇴" },
  { name: "Kenya", flag: "🇰🇪" },
  { name: "Argentina", flag: "🇦🇷" },
];

function buildRound() {
  const QUESTION_COUNT = 3;
  const pool = shuffle(COUNTRIES).slice(0, QUESTION_COUNT);
  const namePool = COUNTRIES.map((c) => c.name);
  return pool.map((c) => {
    const distractors = shuffle(namePool.filter((n) => n !== c.name)).slice(0, 3);
    return { flag: c.flag, answer: c.name, options: shuffle([c.name, ...distractors]) };
  });
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
        <div class="challenge__flag">${current.flag}</div>
        <div class="challenge__question">Which country is this?</div>
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
