"use client";

import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import { logBreakGateAttempt, type GameSlug } from "@/lib/supabase";

const DEFAULT_GATE_SECONDS = 30;
const QUESTION_COUNT = 5;
const ACCENT = "#F59E0B";
const GAME_SLUG: GameSlug = "math-sprint";

type Problem = { text: string; answer: number; options: number[] };

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Fixed, gentle difficulty — this is a 30-second gate under time pressure, not the
 *  standalone game's escalating-tier mode. */
function generateProblem(): Problem {
  const op = Math.random() < 0.5 ? "+" : "-";
  let a: number, b: number, answer: number, text: string;
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

  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const offset = randomInt(1, 6) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + offset;
    if (candidate !== answer && candidate >= 0) distractors.add(candidate);
  }
  const options = [answer, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { text, answer, options };
}

/** In-session 30-second break gate: 5 questions, get them all right before time runs out
 *  or the break is denied. A single wrong answer fails immediately — this is deliberately
 *  stricter than the standalone Math Sprint page, which just keeps score over a full round.
 *
 *  `practiceMode` reframes this as The Lounge's "Brain Games" — something to do with your
 *  hands while resting, not a gate to pass. No timer, no fail-on-wrong-answer, no logged
 *  attempt; a wrong answer or a finished round just quietly moves to the next problem. */
export default function MathSprintGate({
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
  const [problem, setProblem] = useState<Problem>(() => generateProblem());
  const [solved, setSolved] = useState(0);
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [settled, setSettled] = useState(false);
  const [feedback, setFeedback] = useState<{ option: number; correct: boolean } | null>(null);

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

  function handleAnswer(option: number) {
    if (feedback || settled) return;
    const correct = option === problem.answer;
    setFeedback({ option, correct });

    if (practiceMode) {
      // No fail state here — a miss just moves on to the next problem after a beat.
      setTimeout(() => {
        setProblem(generateProblem());
        setFeedback(null);
        if (correct) setSolved((s) => s + 1);
      }, 450);
      return;
    }

    if (!correct) {
      setTimeout(() => finish(false), 500);
      return;
    }
    const nextSolved = solved + 1;
    setTimeout(() => {
      if (nextSolved >= QUESTION_COUNT) {
        setSolved(nextSolved);
        finish(true);
      } else {
        setSolved(nextSolved);
        setProblem(generateProblem());
        setFeedback(null);
      }
    }, 350);
  }

  return (
    <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 6 }}>
        <Calculator size={18} color={ACCENT} />
        <span style={{ color: practiceMode ? "#57534E" : "#9a9da4", fontSize: 13, fontWeight: practiceMode ? 500 : 700 }}>
          {practiceMode ? `${solved} solved` : `${solved} / ${QUESTION_COUNT} solved`}
        </span>
      </div>
      {!practiceMode && (
        <div style={{ color: timeLeft <= 10 ? "#f87171" : "#fff", fontSize: 15, fontWeight: 800, marginBottom: 18, fontVariantNumeric: "tabular-nums" }}>
          {timeLeft}s left
        </div>
      )}
      <div style={{ color: "#fff", fontSize: 34, fontWeight: 800, marginBottom: 22, fontVariantNumeric: "tabular-nums" }}>{problem.text} = ?</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {problem.options.map((option) => {
          const isPicked = feedback?.option === option;
          const isCorrectOption = feedback && option === problem.answer;
          let bg = "#101012";
          let border = "1px solid #26262b";
          let color = "#d8d8dc";
          if (feedback && isCorrectOption) {
            bg = practiceMode ? "rgba(254,243,199,0.14)" : "rgba(245,158,11,0.16)";
            border = practiceMode ? "1px solid #A8A29E" : `1px solid ${ACCENT}`;
            color = practiceMode ? "#FEF3C7" : ACCENT;
          } else if (isPicked && !feedback?.correct) {
            bg = practiceMode ? "rgba(120,113,108,0.14)" : "rgba(239,68,68,0.14)";
            border = practiceMode ? "1px solid #78716C" : "1px solid rgba(239,68,68,0.6)";
            color = practiceMode ? "#A8A29E" : "#f87171";
          }
          return (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={!!feedback || settled}
              className={!practiceMode && isPicked && !feedback?.correct ? "fg-shake-standalone" : undefined}
              style={{ background: bg, border, color, padding: "16px 12px", borderRadius: 12, fontSize: 18, fontWeight: 800, cursor: feedback ? "default" : "pointer" }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
