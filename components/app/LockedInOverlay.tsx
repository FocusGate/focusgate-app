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
import {
  updateBreakNoteActualDuration,
  reportGroupViolation,
  getSessionPause,
  startSessionPause,
  endSessionPause,
  subscribeToSessionPause,
  type SessionPause,
  type NewlyUnlockedBadge,
} from "@/lib/supabase";
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
  initialSecondsLeft,
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
  /** The session's original planned length — stays fixed for its whole life, including
   *  across a rehydrated mount. Pomodoro/All Nighter auto-break checkpoints are computed
   *  from this, so it must never be "how much is left," only "how much there always was." */
  totalSeconds: number;
  /** Where the countdown should actually start counting down from. Equal to totalSeconds
   *  for a session just started this tab; lower when this overlay is mounting fresh onto
   *  an already-in-progress session (a route the user was redirected back to, a reload,
   *  a second tab) — the dashboard page computes this from elapsed wall-clock time minus
   *  time already spent paused. Defaults to totalSeconds when omitted. */
  initialSecondsLeft?: number;
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
  const [seconds, setSeconds] = useState(initialSecondsLeft ?? totalSeconds);
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
  const breakStateRef = useRef<BreakState | null>(null);
  useEffect(() => {
    breakStateRef.current = breakState;
  }, [breakState]);

  // Deep Focus offers no Break Gates at all; Pomodoro's breaks are fully automatic, so a
  // manual request alongside them would just fight the cadence — both hide the button
  // entirely rather than disabling it.
  const manualBreaksAllowed = mode !== "deep_focus" && mode !== "pomodoro";

  // A break started on the Chrome extension (or a page reload mid-break) needs to show up
  // here without this tab having triggered it locally — Supabase's sessions row is the
  // shared source of truth both surfaces read from now, not just this component's own
  // state. `applyRemotePause` is deliberately idempotent against *this tab's own* writes:
  // when handleBreakGranted/triggerAutoBreak below set breakState optimistically and then
  // write to Supabase, the Realtime echo of that same write arrives here too, but the
  // "already showing this pause" guard makes it a no-op rather than a restart.
  function applyRemotePause(pause: SessionPause) {
    const untilMs = pause.pauseUntil ? new Date(pause.pauseUntil).getTime() : null;
    const isActive = untilMs !== null && untilMs > Date.now();

    if (isActive) {
      if (breakStateRef.current) return; // already showing this (or another) pause locally
      // A pause just became authoritative — if this tab still has its own break-request
      // modal open (e.g. the extension won the race and started one first), close it
      // rather than risk rendering both it and The Lounge at once.
      setShowBreakFlow(false);
      const totalSeconds = pause.requestedSeconds ?? Math.max(0, Math.round((untilMs! - Date.now()) / 1000));
      const secondsLeft = Math.max(0, Math.round((untilMs! - Date.now()) / 1000));
      setBreakState({
        secondsLeft,
        totalSeconds,
        note: pause.noteText ?? "",
        breakNoteId: pause.breakNoteId ?? "",
        autoTriggered: pause.pauseType === "auto",
        skippable: pause.skippable,
        reminderText: pause.reminderText ?? undefined,
      });
    } else if (breakStateRef.current) {
      // Cleared remotely (ended from the extension, or from this same account elsewhere) —
      // exit the visual without re-reporting actual duration; whichever surface actually
      // ended it already did that via endBreak below.
      exitBreakVisual();
    }
  }

  useEffect(() => {
    let cancelled = false;
    getSessionPause(sessionId)
      .then((p) => {
        if (!cancelled) applyRemotePause(p);
      })
      .catch(() => {});
    const unsubscribe = subscribeToSessionPause(sessionId, applyRemotePause);
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyRemotePause reads current state via breakStateRef, not a dependency; sessionId is stable for the life of a session
  }, [sessionId]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- triggerAutoBreak now also closes over sessionId (writing the shared pause state), which is stable for the life of a session — not a real missing dependency
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- endBreak now also closes over sessionId (clearing the shared pause state), which is stable for the life of a session — not a real missing dependency
  }, [breakState]);

  function triggerAutoBreak(seconds: number, skippable: boolean, reminderText?: string) {
    setBreakState({ secondsLeft: seconds, totalSeconds: seconds, note: "", breakNoteId: "", autoTriggered: true, skippable, reminderText });
    // Best-effort, not blocking: a scheduled Pomodoro/All Nighter break happening locally
    // even if this write fails is better than silently skipping the user's earned rest —
    // unlike a manually *requested* break (BreakFlowModal), there's no user action to show
    // an error against here, and the next successful sync corrects the drift.
    const untilIso = new Date(Date.now() + seconds * 1000).toISOString();
    startSessionPause(sessionId, {
      untilIso,
      type: "auto",
      breakNoteId: null,
      requestedSeconds: seconds,
      skippable,
      noteText: "",
      reminderText: reminderText ?? null,
    }).catch(() => {});
  }

  function handleBreakGranted(requestedSeconds: number, note: string, breakNoteId: string) {
    // BreakFlowModal already wrote the shared pause state (blocking, with its own error
    // handling) before calling this — this is purely the local optimistic UI update.
    setShowBreakFlow(false);
    setBreakState({ secondsLeft: requestedSeconds, totalSeconds: requestedSeconds, note, breakNoteId, autoTriggered: false, skippable: true });
  }

  function exitBreakVisual() {
    setBreakState(null);
    setShowBackToIt(true);
    setTimeout(() => setShowBackToIt(false), 1700);
  }

  /** Ends the current break, whether it ran out naturally (secondsLeft already 0) or via
   *  "I'm ready, back to focus" (secondsLeft > 0). Reports the actual time used — best
   *  effort, wrapped so a network hiccup here can never block the session from resuming —
   *  clears the shared pause state (so the extension, or another tab, learns the break is
   *  over within about a second), then plays the brief "Back to it." transition before the
   *  gold UI takes over again. */
  function endBreak(state: BreakState, secondsLeftAtEnd: number) {
    const actualUsed = state.totalSeconds - secondsLeftAtEnd;
    if (state.breakNoteId) {
      updateBreakNoteActualDuration(state.breakNoteId, actualUsed).catch(() => {});
    }
    endSessionPause(sessionId).catch(() => {});
    exitBreakVisual();
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
