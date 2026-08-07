"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { logBreakGateAttempt, type GameSlug } from "@/lib/supabase";

const DEFAULT_GATE_SECONDS = 30;
const ACCENT = "#A78BFA";
const SYMBOLS = ["🧠", "🔥", "⚡", "🎯"];
const GAME_SLUG: GameSlug = "memory-match";

type Card = { id: number; symbol: string; matched: boolean };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck(): Card[] {
  return shuffle([...SYMBOLS, ...SYMBOLS]).map((symbol, id) => ({ id, symbol, matched: false }));
}

/** In-session 30-second break gate: find 4 pairs before time runs out. Unlike the
 *  standalone Memory Match page (a count-up stopwatch with no fail path), this variant
 *  needs a genuine countdown and a real "ran out of time" failure branch.
 *
 *  `practiceMode` reframes this as The Lounge's "Brain Games" — something to do with your
 *  hands while resting, not a gate to pass. No timer shown, no fail state, no logged
 *  attempt (it isn't a real gate attempt); solving a round just quietly deals a fresh one. */
export default function MemoryMatchGate({
  userId,
  sessionId,
  onResult,
  seconds = DEFAULT_GATE_SECONDS,
  practiceMode = false,
}: {
  userId: string;
  sessionId: string | null;
  seconds?: number;
  onResult?: (passed: boolean) => void;
  practiceMode?: boolean;
}) {
  const [cards, setCards] = useState<Card[]>(() => buildDeck());
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [settled, setSettled] = useState(false);
  const busyRef = useRef(false);

  function finish(passed: boolean) {
    if (settled) return;
    setSettled(true);
    logBreakGateAttempt(userId, sessionId, GAME_SLUG, passed).catch(() => {});
    setTimeout(() => onResult?.(passed), passed ? 500 : 700);
  }

  function dealFreshRound() {
    setCards(buildDeck());
    setMatchedIds(new Set());
    setFlipped([]);
    setTimeLeft(seconds);
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

  useEffect(() => {
    if (matchedIds.size < SYMBOLS.length) return;
    if (practiceMode) {
      setTimeout(dealFreshRound, 700);
      return;
    }
    if (settled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- transitioning to a passed gate once every pair is matched is the intended sync here
    finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish/dealFreshRound close over state already captured via settled/matchedIds/practiceMode
  }, [matchedIds, settled, practiceMode]);

  function handleCardClick(id: number) {
    if (busyRef.current || settled) return;
    const card = cards.find((c) => c.id === id);
    if (!card || matchedIds.has(id) || flipped.includes(id)) return;

    if (flipped.length === 0) {
      setFlipped([id]);
      return;
    }

    const nextFlipped = [flipped[0], id];
    setFlipped(nextFlipped);
    busyRef.current = true;

    const first = cards.find((c) => c.id === nextFlipped[0])!;
    if (first.symbol === card.symbol) {
      setTimeout(() => {
        setMatchedIds((prev) => new Set(prev).add(first.id).add(card.id));
        setFlipped([]);
        busyRef.current = false;
      }, 300);
    } else {
      setTimeout(() => {
        setFlipped([]);
        busyRef.current = false;
      }, 550);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 300, textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 16, fontSize: 13, fontWeight: practiceMode ? 500 : 700 }}>
        <span style={{ color: practiceMode ? "#57534E" : "#9a9da4" }}>
          {matchedIds.size / 2} / {SYMBOLS.length} pairs
        </span>
        {!practiceMode && <span style={{ color: timeLeft <= 10 ? "#f87171" : ACCENT }}>{timeLeft}s left</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, perspective: 800 }}>
        {cards.map((card) => {
          const faceUp = matchedIds.has(card.id) || flipped.includes(card.id);
          return (
            <div key={card.id} style={{ aspectRatio: "1 / 1" }}>
              <button
                onClick={() => handleCardClick(card.id)}
                disabled={faceUp || settled}
                style={{ position: "relative", width: "100%", height: "100%", background: "none", border: "none", padding: 0, cursor: faceUp ? "default" : "pointer" }}
              >
                <motion.div
                  animate={{ rotateY: faceUp ? 180 : 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d" }}
                >
                  <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: "#101012", border: "1px solid #26262b", backfaceVisibility: "hidden" }} />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 10,
                      background: matchedIds.has(card.id) ? "rgba(167,139,250,0.16)" : "#16161a",
                      border: matchedIds.has(card.id) ? `1px solid ${ACCENT}` : "1px solid #26262b",
                      boxShadow: matchedIds.has(card.id) ? `0 0 12px ${ACCENT}88` : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      transform: "rotateY(180deg)",
                      backfaceVisibility: "hidden",
                    }}
                  >
                    {card.symbol}
                  </div>
                </motion.div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
