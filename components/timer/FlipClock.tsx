"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useAnimation } from "framer-motion";
import { spawnParticles, spawnConfetti } from "@/lib/particles";
import FlipUnit from "./FlipUnit";

export type FlipClockProps = {
  /** Remaining seconds — tick this down from the parent every second. */
  seconds: number;
  /** Seconds the session started at, used to size the progress arc. */
  totalSeconds: number;
  blockedSites?: string[];
  /** Render the completion flash/confetti as a fixed full-viewport overlay instead of clipped to the card. */
  fullscreenComplete?: boolean;
  onComplete?: () => void;
  onCannotEndClick?: () => void;
};

const BORDER_COLORS = {
  normal: "#3a2f1c",
  halfway: "#0EA5E9",
  almost: "#EF4444",
};

export default function FlipClock({
  seconds,
  totalSeconds,
  blockedSites = ["youtube.com", "instagram.com", "tiktok.com"],
  fullscreenComplete = false,
  onComplete,
  onCannotEndClick,
}: FlipClockProps) {
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;

  const prevRef = useRef(clamped);
  const cardRef = useRef<HTMLDivElement>(null);

  const [shaking, setShaking] = useState(false);
  const shakeControls = useAnimation();

  const CIRC = 2 * Math.PI * 92;

  // derived purely from the current second — no state needed, and no risk of it
  // getting stuck if the parent's ticker skips a beat.
  const milestone: "halfway" | "almost" | null =
    clamped <= 1800 && clamped > 1797 ? "halfway" : clamped <= 600 && clamped > 597 ? "almost" : null;
  const completed = clamped <= 0 && totalSeconds > 0;

  // gold glow heartbeat pulse + particle burst + completion, once per tick
  useEffect(() => {
    if (cardRef.current) {
      // The persistent drop shadow is baked into every keyframe so this animation
      // owns `boxShadow` exclusively — it never fights a static React style value.
      animate(
        cardRef.current,
        {
          boxShadow: [
            "0 40px 80px rgba(0,0,0,0.6), 0 0 0px rgba(245,158,11,0)",
            "0 40px 80px rgba(0,0,0,0.6), 0 0 20px rgba(245,158,11,0.55)",
            "0 40px 80px rgba(0,0,0,0.6), 0 0 0px rgba(245,158,11,0)",
          ],
        },
        { duration: 0.3, ease: "easeOut" }
      );
    }

    const prev = prevRef.current;

    // particle burst every 5 minutes completed
    if (Math.floor(prev / 300) !== Math.floor(clamped / 300) && clamped < prev && cardRef.current) {
      spawnParticles(cardRef.current, { count: 10 });
    }

    if (clamped === 0 && prev > 0) {
      if (cardRef.current) spawnConfetti(cardRef.current);
      onComplete?.();
    }

    prevRef.current = clamped;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped]);

  // progress arc — dashoffset shrinks as time elapses (driven declaratively below)
  const arcProgress = totalSeconds ? 1 - clamped / totalSeconds : 0;
  const dashOffset = CIRC * (1 - arcProgress);

  const borderColor = milestone ? BORDER_COLORS[milestone] : BORDER_COLORS.normal;
  const colonBright = clamped % 2 === 0;

  function handleCannotEnd() {
    setShaking(true);
    onCannotEndClick?.();
    shakeControls.start({
      x: [0, -1, 2, -6, 6, -6, 6, -6, 2, -1, 0],
      transition: { duration: 0.4, ease: "easeInOut", times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] },
    });
    setTimeout(() => setShaking(false), 420);
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div className="fg-timer-badge">
        <span className="fg-timer-dot" style={{ animation: "fg-heartbeat 1.4s ease-in-out infinite" }} />
        <span style={{ color: "#F59E0B", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Locked In Mode
        </span>
      </div>

      <div style={{ position: "relative" }}>
        <svg
          width="380"
          height="380"
          viewBox="0 0 200 200"
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.35, pointerEvents: "none" }}
        >
          <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth="1" />
          <motion.circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke="#5c4111"
            strokeWidth="1.5"
            strokeDasharray={CIRC}
            initial={false}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.6, ease: "linear" }}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
        </svg>

        <div
          ref={cardRef}
          className="fg-timer-card"
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            padding: "36px 40px",
            borderRadius: 24,
            background: "linear-gradient(180deg, #101012, #0A0A0A)",
            border: `1.5px solid ${borderColor}`,
            transition: "border-color 0.6s ease",
            boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
            overflow: fullscreenComplete ? "visible" : "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <FlipUnit value={hours} label="HOURS" />
            <span className={`fg-flip-colon ${colonBright ? "fg-bright" : "fg-dim"}`}>:</span>
            <FlipUnit value={minutes} label="MINUTES" />
            <span className={`fg-flip-colon ${colonBright ? "fg-bright" : "fg-dim"}`}>:</span>
            <FlipUnit value={secs} label="SECONDS" />
          </div>

          {milestone === "halfway" && (
            <p style={{ color: "#0EA5E9", fontSize: 13, fontWeight: 700, margin: 0 }}>Halfway there 💪</p>
          )}
          {milestone === "almost" && (
            <p style={{ color: "#EF4444", fontSize: 13, fontWeight: 700, margin: 0 }}>Almost done 🔥</p>
          )}

          <motion.button
            onClick={handleCannotEnd}
            animate={shakeControls}
            className="fg-cannot-end"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(20,20,22,0.75)",
              color: "#8a8570",
              border: "1px solid #2a2515",
              padding: "12px 20px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              cursor: "not-allowed",
            }}
          >
            🔒 Cannot end session early
            {shaking && (
              <span
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#0A0A0A",
                  border: "1px solid rgba(245,158,11,0.5)",
                  color: "#F59E0B",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 8,
                  whiteSpace: "nowrap",
                }}
              >
                You committed to this session
              </span>
            )}
          </motion.button>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {blockedSites.map((site) => (
              <span
                key={site}
                className="fg-blocked-pill"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  color: "#f87171",
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "fg-pulse 1.8s ease-in-out infinite" }} />
                {site}
                <span className="fg-tooltip">Blocked 🔒</span>
              </span>
            ))}
          </div>

          {completed && (
            <div
              style={{
                position: fullscreenComplete ? "fixed" : "absolute",
                inset: 0,
                zIndex: 999,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                background: "rgba(245,158,11,0.12)",
                backdropFilter: "blur(2px)",
                animation: "fg-complete-flash 1s ease-out",
              }}
            >
              <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 28, color: "#F59E0B", textShadow: "0 0 30px rgba(245,158,11,0.7)" }}>
                Session Complete 🏆
              </span>
              <div className="fg-timer-badge">
                <span className="fg-timer-dot" />
                <span style={{ color: "#F59E0B", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em" }}>LOCKED IN</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
