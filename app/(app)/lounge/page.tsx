"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import TheLounge from "@/components/app/session/TheLounge";
import { useCurrentUserContext } from "@/contexts/CurrentUserContext";
import {
  getActiveSession,
  getSessionPause,
  endSessionPause,
  subscribeToSessionPause,
  updateBreakNoteActualDuration,
  type SessionPause,
} from "@/lib/supabase";

type BreakState = {
  secondsLeft: number;
  totalSeconds: number;
  note: string;
  breakNoteId: string;
  skippable: boolean;
  reminderText?: string;
};

type Status = "loading" | "no-session" | "not-paused" | "paused" | "leaving";

/**
 * A standalone entry point into The Lounge — reachable straight from the Chrome
 * extension's "Enter the Lounge" button during a break. The popup is too small to host
 * the real Lounge (breathing circle, brain games, decorations), so it opens this page in
 * a full tab instead, for a session this tab never itself started.
 *
 * Mirrors LockedInOverlay's pause-sync logic (fetch-on-mount + Realtime subscribe) against
 * the user's currently active session, so it shows the *live* shared break state. It
 * deliberately never calls endSessionPause() on natural expiry (secondsLeft hitting 0) —
 * the extension's background alarm already owns that as the session's authoritative timer;
 * this page only reacts once it observes the pause clear, same as it would to the break
 * being ended from any other surface.
 */
export default function LoungePage() {
  const { user } = useCurrentUserContext();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [breakState, setBreakState] = useState<BreakState | null>(null);
  // sessionId is read during render (below, to decide whether to show TheLounge and what
  // to pass it) — a ref can't be, per React's rules on refs, so this has to be real state
  // even though it's only ever set once per page load.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const breakStateRef = useRef<BreakState | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    breakStateRef.current = breakState;
  }, [breakState]);

  function applyPause(pause: SessionPause) {
    const untilMs = pause.pauseUntil ? new Date(pause.pauseUntil).getTime() : null;
    const isActive = untilMs !== null && untilMs > Date.now();

    if (isActive) {
      setBreakState({
        secondsLeft: Math.max(0, Math.round((untilMs! - Date.now()) / 1000)),
        totalSeconds: pause.requestedSeconds ?? Math.max(0, Math.round((untilMs! - Date.now()) / 1000)),
        note: pause.noteText ?? "",
        breakNoteId: pause.breakNoteId ?? "",
        skippable: pause.skippable,
        reminderText: pause.reminderText ?? undefined,
      });
      setStatus("paused");
    } else if (breakStateRef.current) {
      // Was showing a live break and it just cleared (ended elsewhere, or ran out and the
      // extension's background alarm resolved it) — hand back to the dashboard rather than
      // sitting on a dead-end page.
      setBreakState(null);
      setStatus("leaving");
      setTimeout(() => router.replace("/dashboard"), 1600);
    } else {
      setStatus("not-paused");
    }
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getActiveSession(user.id)
      .then((session) => {
        if (cancelled) return;
        if (!session) {
          setStatus("no-session");
          return;
        }
        setSessionId(session.id);
        unsubscribeRef.current = subscribeToSessionPause(session.id, applyPause);
        return getSessionPause(session.id).then((p) => {
          if (!cancelled) applyPause(p);
        });
      })
      .catch(() => {
        if (!cancelled) setStatus("no-session");
      });

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyPause reads current state via breakStateRef, not a dependency
  }, [user]);

  // Break countdown display — purely visual here (see the doc comment above for why this
  // page never writes pause_until itself on expiry).
  useEffect(() => {
    if (!breakState || breakState.secondsLeft <= 0) return;
    const id = setTimeout(() => setBreakState((b) => (b ? { ...b, secondsLeft: b.secondsLeft - 1 } : b)), 1000);
    return () => clearTimeout(id);
  }, [breakState]);

  async function handleEarlyReturn() {
    if (!breakState || !breakState.skippable || !sessionId) return;
    const actualUsed = breakState.totalSeconds - breakState.secondsLeft;
    if (breakState.breakNoteId) {
      updateBreakNoteActualDuration(breakState.breakNoteId, actualUsed).catch(() => {});
    }
    await endSessionPause(sessionId).catch(() => {});
    setBreakState(null);
    setStatus("leaving");
    setTimeout(() => router.replace("/dashboard"), 1600);
  }

  if (status === "paused" && breakState && user && sessionId) {
    return (
      <TheLounge
        secondsLeft={breakState.secondsLeft}
        totalSeconds={breakState.totalSeconds}
        note={breakState.note}
        userId={user.id}
        sessionId={sessionId}
        onEarlyReturn={handleEarlyReturn}
        earlyReturnDisabled={!breakState.skippable}
        reminderText={breakState.reminderText}
      />
    );
  }

  // TheLounge above already handles "paused" — everything reaching here is a non-paused
  // status, but that fact lives in the control flow, not the `status` variable's own type.
  return <FullscreenMessage status={status as Exclude<Status, "paused">} />;
}

const COPY: Record<Exclude<Status, "paused">, string> = {
  loading: "",
  "no-session": "You don’t have an active focus session right now.",
  "not-paused": "You’re not on a break right now — your session’s still running.",
  leaving: "Back to it.",
};

function FullscreenMessage({ status }: { status: Exclude<Status, "paused"> }) {
  const showLink = status === "no-session" || status === "not-paused";
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 550,
          background: "#060606",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        {status !== "loading" && (
          <motion.span
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            style={{
              color: status === "leaving" ? "#F59E0B" : "#c9ccd2",
              fontSize: status === "leaving" ? 28 : 16,
              fontWeight: status === "leaving" ? 800 : 500,
              letterSpacing: status === "leaving" ? "-0.01em" : "normal",
              maxWidth: "34ch",
            }}
          >
            {COPY[status]}
          </motion.span>
        )}
        {showLink && (
          <a href="/dashboard" style={{ color: "#F59E0B", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
            Go to dashboard &rarr;
          </a>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
