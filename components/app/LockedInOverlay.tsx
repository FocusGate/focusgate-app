"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coffee, Siren } from "lucide-react";
import FlipClock from "@/components/timer/FlipClock";
import MotivationalMessages from "@/components/app/session/MotivationalMessages";
import SessionCompleteScreen from "@/components/app/session/SessionCompleteScreen";
import BreakFlowModal from "@/components/app/friction/BreakFlowModal";
import EmergencyUnblockModal from "@/components/app/friction/EmergencyUnblockModal";
import TheLounge from "@/components/app/session/TheLounge";
import GroupPresenceRow from "@/components/app/session/GroupPresenceRow";
import PomodoroProgress from "@/components/app/session/PomodoroProgress";
import ModeCompleteExtra from "@/components/app/session/ModeCompleteExtra";
import { updateBreakNoteActualDuration, reportGroupViolation, type NewlyUnlockedBadge } from "@/lib/supabase";
import {
  type SessionMode,
  type ModeConfig,
  type PomodoroConfig,
  type AllNighterConfig,
  POMODORO_FOCUS_MINUTES,
  POMODORO_BREAK_MINUTES,
  POMODORO_DEFAULT_CYCLES,
  ALL_NIGHTER_CHECKPOINT_MINUTES,
  ALL_NIGHTER_CHECKPOINT_BREAK_MINUTES,
  ALL_NIGHTER_REMINDERS,
  EXAM_CRAM_EMERGENCY_COST_MULTIPLIER,
} from "@/lib/sessionModes";

type BreakState = {
  secondsLeft: number;
  totalSeconds: number;
  note: string;
  breakNoteId: string;
  autoTriggered: boolean;
  skippable: boolean;
  reminderText?: string;
};

export default function LockedInOverlay({
  totalSeconds,
  blockedSites,
  streak,
  userId,
  sessionId,
  sessionStartIso,
  mode = "custom",
  modeConfig = null,
  groupId = null,
  onComplete,
  onFinished,
  onStartAnother,
}: {
  totalSeconds: number;
  blockedSites: string[];
  streak: number;
  userId: string;
  sessionId: string;
  sessionStartIso: string;
  mode?: SessionMode;
  modeConfig?: ModeConfig | null;
  groupId?: string | null;
  onComplete: () => Promise<NewlyUnlockedBadge[]>;
  onFinished: () => void;
  onStartAnother: () => void;
}) {
  const [seconds, setSeconds] = useState(totalSeconds);
  const [phase, setPhase] = useState<"running" | "complete">("running");
  const [unlockedBadges, setUnlockedBadges] = useState<NewlyUnlockedBadge[]>([]);
  const firedRef = useRef(false);

  // ---------- Break system: The Lounge + emergency unblock ----------
  // Take a Break (manual or mode-auto-triggered) pauses the main clock and resumes it
  // afterward — sites were never unblocked in the first place (the extension keeps
  // enforcing them the whole session, break or not), so there's nothing to lift or
  // restore here, only the clock to pause.
  const [showBreakFlow, setShowBreakFlow] = useState(false);
  const [breakState, setBreakState] = useState<BreakState | null>(null);
  const [showBackToIt, setShowBackToIt] = useState(false);
  const [showEmergencyFlow, setShowEmergencyFlow] = useState(false);

  const paused = breakState !== null;

  // Deep Focus offers no Break Gates at all; Pomodoro's breaks are fully automatic, so a
  // manual request alongside them would just fight the cadence — both hide the button
  // entirely rather than disabling it.
  const manualBreaksAllowed = mode !== "deep_focus" && mode !== "pomodoro";

  const pomodoroCycles = (modeConfig as PomodoroConfig | null)?.cycles ?? POMODORO_DEFAULT_CYCLES;
  const [pomodoroCyclesDone, setPomodoroCyclesDone] = useState(0);
  const autoBreakThresholdRef = useRef<number | null>(null);
  const autoBreakStepRef = useRef(0);

  // Seeds the next auto-break threshold once, per mode, from the *initial* totalSeconds —
  // re-running this on every render would re-arm a threshold that's already passed.
  useEffect(() => {
    if (mode === "pomodoro") {
      autoBreakStepRef.current = POMODORO_FOCUS_MINUTES * 60;
      autoBreakThresholdRef.current = totalSeconds - autoBreakStepRef.current;
    } else if (mode === "all_nighter") {
      const checkpointMinutes = (modeConfig as AllNighterConfig | null)?.checkpointMinutes ?? ALL_NIGHTER_CHECKPOINT_MINUTES;
      autoBreakStepRef.current = checkpointMinutes * 60;
      autoBreakThresholdRef.current = totalSeconds - autoBreakStepRef.current;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately runs once per mount (mode/modeConfig/totalSeconds are fixed for the life of a session)
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  // Pomodoro/All Nighter's automatic checkpoint breaks — fires the instant the countdown
  // crosses the next threshold, entirely bypassing BreakFlowModal (no gate, no note; the
  // spec is explicit that these breaks are "pre-earned by the design").
  useEffect(() => {
    if (paused || seconds <= 0) return;
    if (mode !== "pomodoro" && mode !== "all_nighter") return;
    if (autoBreakThresholdRef.current === null || seconds !== autoBreakThresholdRef.current) return;

    if (mode === "pomodoro") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- advancing the tomato-row count exactly when the countdown crosses a cycle boundary is the intended sync here
      setPomodoroCyclesDone((c) => c + 1);
      triggerAutoBreak(POMODORO_BREAK_MINUTES * 60, true);
    } else {
      const reminder = ALL_NIGHTER_REMINDERS[Math.floor(Math.random() * ALL_NIGHTER_REMINDERS.length)];
      triggerAutoBreak(ALL_NIGHTER_CHECKPOINT_BREAK_MINUTES * 60, false, reminder);
    }
    autoBreakThresholdRef.current -= autoBreakStepRef.current;
  }, [seconds, paused, mode]);

  // Break countdown — sites stay blocked, but the main session clock doesn't tick.
  useEffect(() => {
    if (!breakState || breakState.secondsLeft <= 0) return;
    const id = setTimeout(() => setBreakState((b) => (b ? { ...b, secondsLeft: b.secondsLeft - 1 } : b)), 1000);
    return () => clearTimeout(id);
  }, [breakState]);

  useEffect(() => {
    if (!breakState || breakState.secondsLeft > 0) return;
    endBreak(breakState, 0);
  }, [breakState]);

  function triggerAutoBreak(seconds: number, skippable: boolean, reminderText?: string) {
    setBreakState({ secondsLeft: seconds, totalSeconds: seconds, note: "", breakNoteId: "", autoTriggered: true, skippable, reminderText });
  }

  function handleBreakGranted(requestedSeconds: number, note: string, breakNoteId: string) {
    setShowBreakFlow(false);
    setBreakState({ secondsLeft: requestedSeconds, totalSeconds: requestedSeconds, note, breakNoteId, autoTriggered: false, skippable: true });
  }

  /** Ends the current break, whether it ran out naturally (secondsLeft already 0) or via
   *  "I'm ready, back to focus" (secondsLeft > 0). Reports the actual time used — best
   *  effort, wrapped so a network hiccup here can never block the session from resuming —
   *  then plays the brief "Back to it." transition before the gold UI takes over again. */
  function endBreak(state: BreakState, secondsLeftAtEnd: number) {
    const actualUsed = state.totalSeconds - secondsLeftAtEnd;
    if (state.breakNoteId) {
      updateBreakNoteActualDuration(state.breakNoteId, actualUsed).catch(() => {});
    }
    setBreakState(null);
    setShowBackToIt(true);
    setTimeout(() => setShowBackToIt(false), 1700);
  }

  function handleEarlyReturn() {
    if (!breakState || !breakState.skippable) return;
    endBreak(breakState, breakState.secondsLeft);
  }

  // Emergency Unblock ends the session — same finalization path as the timer reaching
  // zero naturally (handleComplete's firedRef guard keeps this safe even if both were
  // somehow triggered close together). In Group Study, it's also a Dead Man's Switch
  // trip — the group finds out, automatically, not optionally.
  function handleEmergencyGranted() {
    setShowEmergencyFlow(false);
    if (mode === "group_study" && groupId) {
      reportGroupViolation(groupId, userId, sessionId, null).catch(() => {});
    }
    void handleComplete();
  }

  async function handleComplete() {
    if (firedRef.current) return;
    firedRef.current = true;
    const unlocked = await onComplete();
    // Lets FlipClock's own brief internal completion flash (confetti + "Session
    // Complete 🏆") play out before swapping to the fuller Session Complete screen.
    setTimeout(() => {
      setUnlockedBadges(unlocked);
      setPhase("complete");
    }, 1600);
  }

  if (phase === "complete") {
    return (
      <SessionCompleteScreen
        durationMinutes={Math.round(totalSeconds / 60)}
        streak={streak}
        unlockedBadges={unlockedBadges}
        onStartAnother={onStartAnother}
        onReturnToDashboard={onFinished}
        modeExtra={<ModeCompleteExtra mode={mode} sessionId={sessionId} groupId={groupId} sessionStartIso={sessionStartIso} />}
      />
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "#060606",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 22,
      }}
    >
      {mode === "group_study" && groupId && <GroupPresenceRow groupId={groupId} userId={userId} />}

      <MotivationalMessages />
      <FlipClock seconds={seconds} totalSeconds={totalSeconds} blockedSites={blockedSites} fullscreenComplete onComplete={handleComplete} />

      {mode === "pomodoro" && <PomodoroProgress cycles={pomodoroCycles} completed={pomodoroCyclesDone} />}

      {/* Exactly 2 buttons, clearly distinct: gold/neutral for the gated, friction-first
          path ("Request a Break" — note, then gate, then a duration you pick once you've
          earned it) vs. red/warning for the fast, ungated real-emergency path. Mirrors the
          extension popup's active screen 1:1. */}
      {!paused && !showBreakFlow && !showEmergencyFlow && (
        <div style={{ display: "flex", gap: 12 }}>
          {manualBreaksAllowed && (
            <button
              onClick={() => setShowBreakFlow(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(245,158,11,0.1)",
                color: "#F59E0B",
                border: "1px solid rgba(245,158,11,0.35)",
                padding: "10px 18px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Coffee size={15} />
              Request a Break
            </button>
          )}
          <button
            onClick={() => setShowEmergencyFlow(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(239,68,68,0.1)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.35)",
              padding: "10px 18px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Siren size={15} />
            Emergency Unblock
          </button>
        </div>
      )}

      {showBreakFlow && (
        <BreakFlowModal
          userId={userId}
          sessionId={sessionId}
          sessionDurationMinutes={Math.round(totalSeconds / 60)}
          forceDifficulty={mode === "exam_cram" ? "hard" : undefined}
          onGranted={handleBreakGranted}
          onDenied={() => setShowBreakFlow(false)}
          onCancel={() => setShowBreakFlow(false)}
        />
      )}

      {showEmergencyFlow && (
        <EmergencyUnblockModal
          userId={userId}
          sessionId={sessionId}
          costMultiplier={mode === "exam_cram" ? EXAM_CRAM_EMERGENCY_COST_MULTIPLIER : 1}
          onGranted={handleEmergencyGranted}
          onCancel={() => setShowEmergencyFlow(false)}
        />
      )}

      <AnimatePresence>
        {breakState && (
          <TheLounge
            secondsLeft={breakState.secondsLeft}
            totalSeconds={breakState.totalSeconds}
            note={breakState.note}
            userId={userId}
            sessionId={sessionId}
            onEarlyReturn={handleEarlyReturn}
            earlyReturnDisabled={!breakState.skippable}
            reminderText={breakState.reminderText}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBackToIt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 540,
              background: "#060606",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              style={{ color: "#F59E0B", fontSize: 28, fontWeight: 800, letterSpacing: "-0.01em" }}
            >
              Back to it.
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
