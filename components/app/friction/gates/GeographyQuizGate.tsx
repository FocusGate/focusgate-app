"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { logBreakGateAttempt, type GameSlug } from "@/lib/supabase";

const DEFAULT_GATE_SECONDS = 30;
const QUESTION_COUNT = 3;
const ACCENT = "#FB923C";
const GAME_SLUG: GameSlug = "geography-quiz";

// Was "which of these tiny highlighted specks on a squished world map is this country" —
// technically a real map, but at the size this renders (a whole world crammed into ~160px
// of height) most countries are indistinguishable blobs, so it played like guessing a
// country code rather than actual geography. Swapped for "where in the world is this
// country" continent trivia — picking a continent is a question people can actually reason
// their way through. (Flag emoji were tried here first and dropped: Windows renders flag
// sequences as literal two-letter codes like "FR" with no color-emoji font, which is
// exactly the "what is AU" abbreviation problem this rewrite exists to get away from.)
const COUNTRIES = [
  { name: "France", continent: "Europe" },
  { name: "Germany", continent: "Europe" },
  { name: "Norway", continent: "Europe" },
  { name: "Brazil", continent: "South America" },
  { name: "Argentina", continent: "South America" },
  { name: "Japan", continent: "Asia" },
  { name: "India", continent: "Asia" },
  { name: "Egypt", continent: "Africa" },
  { name: "Kenya", continent: "Africa" },
  { name: "Canada", continent: "North America" },
  { name: "Mexico", continent: "North America" },
  { name: "Australia", continent: "Oceania" },
];

const CONTINENTS = ["Europe", "Asia", "Africa", "North America", "South America", "Oceania"];

type Question = { country: string; answer: string; options: string[] };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildRound(): Question[] {
  const pool = shuffle(COUNTRIES).slice(0, QUESTION_COUNT);
  return pool.map((c) => {
    const distractors = shuffle(CONTINENTS.filter((cont) => cont !== c.continent)).slice(0, 3);
    return { country: c.name, answer: c.continent, options: shuffle([c.continent, ...distractors]) };
  });
}

/** In-session 30-second break gate: 3 continent-trivia questions, one total timer for the
 *  whole round. Per spec — "Fail one — no break" — any single wrong answer fails the round
 *  immediately, unlike the standalone Geography Quiz which just tallies a percentage over
 *  10 questions.
 *
 *  `practiceMode` reframes this as The Lounge's "Brain Games" — something to do with your
 *  hands while resting, not a gate to pass. No timer, no fail-on-wrong-answer, no logged
 *  attempt; a wrong answer just moves to the next question, and finishing the round quietly
 *  deals a fresh one. */
export default function GeographyQuizGate({
  userId,
  sessionId,
  seconds = DEFAULT_GATE_SECONDS,
  onResult,
  practiceMode = false,
}: {
  userId: string;
  sessionId: string | null;
  seconds?: number;
  onResult?: (passed: boolean) => void;
  practiceMode?: boolean;
}) {
  const [round, setRound] = useState<Question[]>(() => buildRound());
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [settled, setSettled] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const current = round[index];

  function finish(passed: boolean) {
    if (settled) return;
    setSettled(true);
    logBreakGateAttempt(userId, sessionId, GAME_SLUG, passed).catch(() => {});
    setTimeout(() => onResult?.(passed), passed ? 500 : 700);
  }

  useEffect(() => {
    if (practiceMode || settled || timeLeft === 0) return;
    const id = setTimeout(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearTimeout(id);
  }, [practiceMode, settled, timeLeft]);

  useEffect(() => {
    if (practiceMode || settled || timeLeft > 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- transitioning to a failed gate once the countdown reaches zero is the intended sync here
    finish(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish closes over state already captured via settled/timeLeft
  }, [timeLeft, settled, practiceMode]);

  function handleAnswer(option: string) {
    if (selected || settled) return;
    setSelected(option);
    const correct = option === current.answer;

    if (practiceMode) {
      setTimeout(() => {
        if (index + 1 >= round.length) {
          setRound(buildRound());
          setIndex(0);
        } else {
          setIndex((i) => i + 1);
        }
        setSelected(null);
      }, correct ? 400 : 600);
      return;
    }

    if (!correct) {
      setTimeout(() => finish(false), 600);
      return;
    }
    setTimeout(() => {
      if (index + 1 >= round.length) {
        finish(true);
      } else {
        setIndex((i) => i + 1);
        setSelected(null);
      }
    }, 400);
  }

  return (
    <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
      {/* justify-content is center-only-when-there's-one-item: with the timer sibling present,
          space-between anchors each side independently so the timer's shrinking digit count
          (30s -> 9s) can't shift the question label sideways — a centered row re-centers its
          whole cluster on every width change, which read as "the screen moves with the timer." */}
      <div style={{ display: "flex", justifyContent: practiceMode ? "center" : "space-between", gap: 16, marginBottom: 6, fontSize: 13, fontWeight: practiceMode ? 500 : 700 }}>
        <span style={{ color: practiceMode ? "#57534E" : "#9a9da4" }}>{practiceMode ? "Brain break" : `Question ${index + 1} / ${round.length}`}</span>
        {!practiceMode && <span style={{ color: timeLeft <= 10 ? "#f87171" : ACCENT, fontVariantNumeric: "tabular-nums" }}>{timeLeft}s left</span>}
      </div>
      <div style={{ display: "flex", justifyContent: "center", margin: "18px 0 10px" }}>
        <MapPin size={44} color={ACCENT} strokeWidth={1.8} />
      </div>
      <div style={{ color: "#fff", fontSize: 17, fontWeight: 700, marginBottom: 20 }}>
        Where is <span style={{ color: ACCENT }}>{current.country}</span> located?
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {current.options.map((option) => {
          const isCorrectOption = option === current.answer;
          const isSelected = option === selected;
          let bg = "#101012";
          let border = "1px solid #26262b";
          let color = "#d8d8dc";
          if (selected) {
            if (isCorrectOption) {
              bg = practiceMode ? "rgba(254,243,199,0.14)" : "rgba(34,197,94,0.1)";
              border = practiceMode ? "1px solid #A8A29E" : "1px solid rgba(34,197,94,0.6)";
              color = practiceMode ? "#FEF3C7" : "#4ade80";
            } else if (isSelected) {
              bg = practiceMode ? "rgba(120,113,108,0.14)" : "rgba(239,68,68,0.1)";
              border = practiceMode ? "1px solid #78716C" : "1px solid rgba(239,68,68,0.6)";
              color = practiceMode ? "#A8A29E" : "#f87171";
            }
          }
          return (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={!!selected || settled}
              className={!practiceMode && isSelected && !isCorrectOption ? "fg-shake-standalone" : undefined}
              style={{ background: bg, border, color, padding: "12px 10px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: selected ? "default" : "pointer" }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
