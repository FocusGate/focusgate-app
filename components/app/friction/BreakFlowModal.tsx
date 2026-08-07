"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import MathSprintGate from "./gates/MathSprintGate";
import MemoryMatchGate from "./gates/MemoryMatchGate";
import GeographyQuizGate from "./gates/GeographyQuizGate";
import {
  saveBreakNote,
  getUserPreferences,
  getBreakNoteCountForSession,
  GATE_SECONDS_BY_DIFFICULTY,
  type UserPreferences,
  type BreakGateChallenge,
  type BreakGateDifficulty,
} from "@/lib/supabase";
import {
  isValidBreakNote,
  maxBreaksForDuration,
  MIN_BREAK_NOTE_WORDS,
  MAX_BREAK_NOTE_WORDS,
  MIN_BREAK_SECONDS,
  MAX_BREAK_SECONDS,
  DEFAULT_BREAK_SECONDS,
  formatBreakDuration,
} from "@/lib/stats";

type GateChoice = Exclude<BreakGateChallenge, "ask">;
type Step = "loading" | "note" | "choose" | "gate" | "duration" | "failed" | "limit-reached";

/** Three layers of friction before any break — write your reason (if that layer's on),
 *  then always prove you deserve it with a gate game, and only once you've actually earned
 *  it do you pick how long you need (The Lounge starts right after). The gate itself isn't
 *  optional — only the note layer, which game it is, and the gate's time limit stay
 *  configurable on /the-gates. A failed gate never reaches the "granted" callback — the
 *  session was never paused, so there's nothing to resume, and no duration was ever picked
 *  to discard. Before any of that, the session's own length caps how many breaks it earns
 *  at all (see maxBreaksForDuration) — a longer session earns more. */
export default function BreakFlowModal({
  userId,
  sessionId,
  sessionDurationMinutes,
  forceDifficulty,
  onGranted,
  onDenied,
  onCancel,
}: {
  userId: string;
  sessionId: string;
  sessionDurationMinutes: number;
  /** Exam Cram forces every gate to Hard, regardless of the user's own /the-gates
   *  preference — "no easy exit" is the mode's whole point, so this session-scoped
   *  override never touches the actual saved preference. */
  forceDifficulty?: BreakGateDifficulty;
  onGranted: (seconds: number, note: string, breakNoteId: string) => void;
  onDenied: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>("loading");
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [requestedSeconds, setRequestedSeconds] = useState(DEFAULT_BREAK_SECONDS);
  const [noteText, setNoteText] = useState("");
  const [choice, setChoice] = useState<GateChoice | null>(null);

  const maxBreaks = maxBreaksForDuration(sessionDurationMinutes);

  useEffect(() => {
    Promise.all([getUserPreferences(userId), getBreakNoteCountForSession(sessionId)])
      .then(([p, takenSoFar]) => {
        setPrefs(p);
        if (takenSoFar >= maxBreaksForDuration(sessionDurationMinutes)) {
          setStep("limit-reached");
          return;
        }
        if (p.break_notes_enabled) {
          setStep("note");
        } else {
          // A challenge is mandatory — there's no "both layers off, break just
          // granted" path anymore, only note-then-gate or gate-only.
          enterGateFlow(p);
        }
      })
      // Fail open to the strictest layer rather than silently skipping every one.
      .catch(() => setStep("note"));
  }, [userId, sessionId, sessionDurationMinutes]);

  function enterGateFlow(p: UserPreferences) {
    if (p.break_gate_default_challenge === "ask") {
      setStep("choose");
    } else {
      setChoice(p.break_gate_default_challenge);
      setStep("gate");
    }
  }

  const noteValid = isValidBreakNote(noteText);
  const wordCount = noteText.trim().length ? noteText.trim().split(/\s+/).filter(Boolean).length : 0;
  const gateSeconds = GATE_SECONDS_BY_DIFFICULTY[forceDifficulty ?? prefs?.break_gate_difficulty ?? "normal"];

  function handleNoteContinue() {
    if (!noteValid || !prefs) return;
    enterGateFlow(prefs);
  }

  // A failed gate ends the flow right here — nothing was ever earned, so there's no
  // duration to pick. A pass moves to "duration": only once you've actually proven you
  // deserve a break do you get to say how long it is.
  function handleResult(passed: boolean) {
    if (passed) {
      setStep("duration");
    } else {
      setStep("failed");
      setTimeout(onDenied, 1800);
    }
  }

  async function handleDurationConfirm() {
    const { id } = await saveBreakNote(userId, sessionId, noteText, requestedSeconds, false).catch(() => ({ id: "" }));
    onGranted(requestedSeconds, noteText, id);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 700,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{ background: "#0A0A0A", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 24, padding: 32, maxWidth: 460, width: "100%", position: "relative" }}
      >
        {step !== "gate" && step !== "failed" && step !== "loading" && (
          <button
            onClick={onCancel}
            aria-label="Cancel"
            style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: "#7a7d84", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        )}

        {step === "loading" && <div style={{ padding: "40px 0", textAlign: "center", color: "#7a7d84", fontSize: 14 }}>Loading…</div>}

        {step === "note" && (
          <>
            <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>Prove you deserve this break.</h3>
            <p style={{ color: "#9a9da4", fontSize: 14, marginTop: 8 }}>Why do you need this break? {MIN_BREAK_NOTE_WORDS}-{MAX_BREAK_NOTE_WORDS} words.</p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="I need to…"
              style={{ width: "100%", marginTop: 12, background: "#101012", border: "1px solid #26262b", color: "#fff", borderRadius: 12, padding: 14, fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit" }}
            />
            <div style={{ color: noteValid ? "#4ade80" : "#7a7d84", fontSize: 12, marginTop: 6 }}>
              {wordCount} / {MIN_BREAK_NOTE_WORDS}-{MAX_BREAK_NOTE_WORDS} words
            </div>
            <button
              onClick={handleNoteContinue}
              disabled={!noteValid}
              style={{
                marginTop: 18,
                width: "100%",
                background: noteValid ? "#F59E0B" : "#26262b",
                color: noteValid ? "#0a0a0a" : "#5b5e66",
                border: "none",
                padding: 14,
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 800,
                cursor: noteValid ? "pointer" : "default",
              }}
            >
              Continue
            </button>
          </>
        )}

        {step === "choose" && (
          <>
            <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>Choose your challenge</h3>
            <p style={{ color: "#9a9da4", fontSize: 14, marginTop: 8 }}>Solve it in {gateSeconds} seconds. Only then does your break start.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
              <GateChoiceButton
                label="Math Sprint"
                accent="#F59E0B"
                onClick={() => {
                  setChoice("math-sprint");
                  setStep("gate");
                }}
              />
              <GateChoiceButton
                label="Memory Match"
                accent="#A78BFA"
                onClick={() => {
                  setChoice("memory-match");
                  setStep("gate");
                }}
              />
              <GateChoiceButton
                label="Geography Quiz"
                accent="#FB923C"
                onClick={() => {
                  setChoice("geography-quiz");
                  setStep("gate");
                }}
              />
            </div>
          </>
        )}

        {step === "gate" && choice && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            {choice === "math-sprint" && <MathSprintGate userId={userId} sessionId={sessionId} seconds={gateSeconds} onResult={handleResult} />}
            {choice === "memory-match" && <MemoryMatchGate userId={userId} sessionId={sessionId} seconds={gateSeconds} onResult={handleResult} />}
            {choice === "geography-quiz" && <GeographyQuizGate userId={userId} sessionId={sessionId} seconds={gateSeconds} onResult={handleResult} />}
          </div>
        )}

        {step === "duration" && (
          <>
            <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>Nice work. How long do you need?</h3>
            <p style={{ color: "#9a9da4", fontSize: 14, marginTop: 8 }}>
              Your sites stay blocked either way — this is just how long your session clock pauses for.
            </p>
            <div style={{ textAlign: "center", marginTop: 28, marginBottom: 8 }}>
              <span style={{ color: "#F59E0B", fontSize: 32, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                {formatBreakDuration(requestedSeconds)}
              </span>
            </div>
            <input
              type="range"
              min={MIN_BREAK_SECONDS}
              max={MAX_BREAK_SECONDS}
              step={1}
              value={requestedSeconds}
              onChange={(e) => setRequestedSeconds(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#F59E0B", cursor: "pointer" }}
              aria-label="Break duration"
            />
            <div style={{ display: "flex", justifyContent: "space-between", color: "#5b5e66", fontSize: 11, marginTop: 4 }}>
              <span>1 min</span>
              <span>15 min</span>
            </div>
            <button
              onClick={handleDurationConfirm}
              style={{
                marginTop: 22,
                width: "100%",
                background: "#F59E0B",
                color: "#0a0a0a",
                border: "none",
                padding: 14,
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Start My Break
            </button>
          </>
        )}

        {step === "failed" && (
          <div className="fg-shake-standalone" style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 32 }}>🔒</div>
            <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 12 }}>Session continues.</h3>
            <p style={{ color: "#f87171", fontSize: 14, marginTop: 6 }}>Try again next time.</p>
          </div>
        )}

        {step === "limit-reached" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 32 }}>⏳</div>
            <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 12 }}>No breaks left.</h3>
            <p style={{ color: "#9a9da4", fontSize: 14, marginTop: 6 }}>
              This session earns {maxBreaks} break{maxBreaks === 1 ? "" : "s"} — you&apos;ve used all of them.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function GateChoiceButton({ label, accent, onClick }: { label: string; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: "#101012", border: `1px solid ${accent}55`, color: "#fff", padding: "14px 18px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
    >
      {label}
    </button>
  );
}
