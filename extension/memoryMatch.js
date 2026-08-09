// memoryMatch.js — shared Memory Match board renderer for both the break-gate challenge
// (challenge.js: timed, pass/fail, resumable if the tab closes mid-attempt) and the
// popup's Lounge "Brain Games" tab (popup.js: untimed practice, no pass/fail, resets
// freely). One implementation so the grid/overflow fix only has to exist in one place —
// exposed as window.FGMemoryMatch since this extension has no bundler wiring popup.js and
// challenge.js together as modules.

(function () {
  const ALL_SYMBOLS = ["🧠", "🔥", "⚡", "🎯", "🌊", "🍀", "⭐", "🎨"];

  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function buildDeck(symbols) {
    return shuffle([...symbols, ...symbols]).map((symbol, id) => ({ id, symbol }));
  }

  /**
   * Renders (and re-renders in place on every state change) a Memory Match board into
   * `container`. Returns `{ destroy() }` — callers must call it on teardown to stop the
   * countdown interval.
   *
   * opts:
   *   mode: "timed" | "practice"
   *   seconds: total attempt length for "timed" mode (ignored for "practice")
   *   pairs: how many pairs to deal, 2-8 (default 4 for "timed" — matches the gate's
   *     existing difficulty; default 8 for "practice" — matches MemoryMatchGate.tsx's web
   *     practiceMode board). The popup's Lounge passes 4 here for its own practice board:
   *     an 8-pair/4-row grid forces scroll in a 328px-wide popup even with the container
   *     fix below, and "compact" was the whole point of building this for the popup.
   *   initialState: { cards, matched: number[], flipped: number[], deadlineAt } | null —
   *     pass this (from a previous onStateChange call) to resume a "timed" attempt exactly
   *     where it left off, board layout included, instead of dealing a fresh one.
   *   onSettle(passed): "timed" mode only — called exactly once when the attempt ends,
   *     whether by completing the board (passed=true) or the deadline passing (false).
   *   onStateChange(state): "timed" mode only — called after every mutation so the caller
   *     can persist it (e.g. to chrome.storage.local) and survive the tab/popup closing.
   */
  function render(container, opts) {
    const mode = opts.mode === "practice" ? "practice" : "timed";
    const pairCount = Math.max(2, Math.min(8, opts.pairs || (mode === "practice" ? 8 : 4)));
    const symbols = ALL_SYMBOLS.slice(0, pairCount);

    let cards, matched, flipped, deadlineAt;
    if (opts.initialState) {
      cards = opts.initialState.cards;
      matched = new Set(opts.initialState.matched);
      flipped = [...opts.initialState.flipped];
      deadlineAt = opts.initialState.deadlineAt;
    } else {
      cards = buildDeck(symbols);
      matched = new Set();
      flipped = [];
      deadlineAt = mode === "timed" ? Date.now() + (opts.seconds || 30) * 1000 : null;
    }

    let busy = false;
    let settled = false;
    let timerId = null;

    function persist() {
      if (mode === "timed" && opts.onStateChange) {
        opts.onStateChange({ cards, matched: [...matched], flipped, deadlineAt });
      }
    }

    function secondsLeft() {
      return mode === "timed" ? Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)) : null;
    }

    function draw() {
      const tLeft = secondsLeft();
      container.innerHTML = `
        <div class="challenge__meta">
          <span>${matched.size / 2} / ${symbols.length} pairs</span>
          ${mode === "timed" ? `<span class="${tLeft <= 10 ? "challenge__time--danger" : ""}">${tLeft}s left</span>` : ""}
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
      `;
      container.querySelectorAll(".challenge__card-tile").forEach((btn) => {
        btn.addEventListener("click", () => handleClick(Number(btn.dataset.id)));
      });
    }

    function handleClick(id) {
      if (busy || settled || matched.has(id) || flipped.includes(id)) return;
      if (flipped.length === 0) {
        flipped = [id];
        draw();
        persist();
        return;
      }
      flipped = [flipped[0], id];
      busy = true;
      draw();
      persist();

      const first = cards.find((c) => c.id === flipped[0]);
      const second = cards.find((c) => c.id === id);
      if (first.symbol === second.symbol) {
        setTimeout(() => {
          matched.add(first.id);
          matched.add(second.id);
          flipped = [];
          busy = false;
          if (matched.size >= cards.length) {
            settle(true);
          } else {
            draw();
            persist();
          }
        }, 300);
      } else {
        setTimeout(() => {
          flipped = [];
          busy = false;
          draw();
          persist();
        }, 550);
      }
    }

    function settle(passed) {
      if (settled) return;
      settled = true;
      if (timerId !== null) clearInterval(timerId);
      if (mode === "timed" && opts.onSettle) opts.onSettle(passed);
    }

    if (mode === "timed") {
      timerId = setInterval(() => {
        if (secondsLeft() <= 0) {
          settle(false);
          return;
        }
        draw();
      }, 1000);
    }

    draw();

    return {
      destroy() {
        if (timerId !== null) clearInterval(timerId);
      },
    };
  }

  window.FGMemoryMatch = { render };
})();
