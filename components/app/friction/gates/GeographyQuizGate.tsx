"use client";

import { useEffect, useState } from "react";
import WorldMap from "@/components/app/games/WorldMap";
import { logBreakGateAttempt, type GameSlug } from "@/lib/supabase";

const DEFAULT_GATE_SECONDS = 30;
const QUESTION_COUNT = 3;
const ACCENT = "#FB923C";
const GAME_SLUG: GameSlug = "geography-quiz";

// A smaller pool than the standalone Geography Quiz — this gate is map-only per spec
// ("World map with country highlighted... 4 options"), no flags or landmarks.
const COUNTRIES = [
  { name: "France", mapName: "France" },
  { name: "Germany", mapName: "Germany" },
  { name: "Brazil", mapName: "Brazil" },
  { name: "Japan", mapName: "Japan" },
  { name: "Egypt", mapName: "Egypt" },
  { name: "Canada", mapName: "Canada" },
  { name: "Australia", mapName: "Australia" },
  { name: "India", mapName: "India" },
  { name: "Mexico", mapName: "Mexico" },
  { name: "Norway", mapName: "Norway" },
  { name: "Kenya", mapName: "Kenya" },
  { name: "Argentina", mapName: "Argentina" },
];

type Question = { mapTarget: string; answer: string; options: string[] };

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
  const namePool = COUNTRIES.map((c) => c.name);
  return pool.map((c) => {
    const distractors = shuffle(namePool.filter((n) => n !== c.name)).slice(0, 3);
    return { mapTarget: c.mapName, answer: c.name, options: shuffle([c.name, ...distractors]) };
  });
}

/** In-session 30-second break gate: 3 map questions, one total timer for the whole round.
 *  Per spec — "Fail one — no break" — any single wrong answer fails the round immediately,
 *  unlike the standalone Geography Quiz which just tallies a percentage over 10 questions.
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
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 6, fontSize: 13, fontWeight: practiceMode ? 500 : 700 }}>
        <span style={{ color: practiceMode ? "#57534E" : "#9a9da4" }}>{practiceMode ? "Which country is this?" : `Question ${index + 1} / ${round.length}`}</span>
        {!practiceMode && <span style={{ color: timeLeft <= 10 ? "#f87171" : ACCENT }}>{timeLeft}s left</span>}
      </div>
      <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: "12px 0" }}>Which country is highlighted?</div>
      <div style={{ width: "100%", height: 160, marginBottom: 16 }}>
        <WorldMap highlightName={current.mapTarget} accent={ACCENT} />
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
