"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MathSprintGate from "@/components/app/friction/gates/MathSprintGate";
import MemoryMatchGate from "@/components/app/friction/gates/MemoryMatchGate";
import GeographyQuizGate from "@/components/app/friction/gates/GeographyQuizGate";
import { formatBreakDuration } from "@/lib/stats";

// Completely different emotional register from Locked In Mode's gold/black intensity —
// warm, soft, dim-lit reading-room tones. Kept as named constants (not scattered hexes)
// since this whole component leans on exactly these four.
const WARM = {
  stone: "#78716C",
  taupe: "#A8A29E",
  cream: "#FEF3C7",
  bg: "#1C1917",
};

type Mode = "chill" | "games";
type Sound = "silence" | "rain" | "lofi";
type GameSlug = "math-sprint" | "memory-match" | "geography-quiz";

const DUST = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 17) % 100,
  size: 2 + (i % 3),
  delay: i % 6,
  dur: 9 + (i % 5),
}));

/**
 * The Lounge — what a break looks like now that it no longer unblocks any sites. Sites
 * stay blocked throughout (nothing to lift or restore here); this is purely a calmer place
 * to sit out the pause. `secondsLeft`/`totalSeconds` are owned and ticked by the parent
 * (LockedInOverlay) — this component is a pure view over them plus its own two local
 * concerns: which mode is showing, and the ambient sound toggle.
 */
export default function TheLounge({
  secondsLeft,
  totalSeconds,
  note,
  userId,
  sessionId,
  onEarlyReturn,
  earlyReturnDisabled = false,
  reminderText,
}: {
  secondsLeft: number;
  totalSeconds: number;
  note: string;
  userId: string;
  sessionId: string;
  onEarlyReturn: () => void;
  /** All Nighter's mandatory rest checkpoints — "cannot be skipped, framed as rest
   *  checkpoints not optional." Hides the early-return button entirely rather than just
   *  disabling it, so it doesn't read as a broken control. */
  earlyReturnDisabled?: boolean;
  /** All Nighter's soft hydration/posture reminders, shown in place of a break note when
   *  this break wasn't something the user wrote a reason for (it was scheduled, not asked for). */
  reminderText?: string;
}) {
  const [mode, setMode] = useState<Mode>("chill");
  const [game, setGame] = useState<GameSlug | null>(null);
  const [sound, setSound] = useState<Sound>("silence");

  const pct = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const circumference = 2 * Math.PI * 108;

  useAmbientSound(sound);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 550,
        background: `radial-gradient(ellipse 900px 600px at 50% 30%, ${WARM.cream}14, transparent 65%), ${WARM.bg}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflow: "hidden",
      }}
    >
      <LoungeScene />

      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, width: "100%", maxWidth: 480 }}>
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{ color: WARM.taupe, fontSize: 16, fontWeight: 500, textAlign: "center", margin: 0 }}
        >
          Take a breath. You&apos;ve earned this.
        </motion.p>

        <BreathingCircle pct={pct} circumference={circumference} label={formatBreakDuration(secondsLeft)} />

        {note && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{ color: WARM.stone, fontSize: 14, fontStyle: "italic", textAlign: "center", margin: 0, maxWidth: "34ch" }}
          >
            &ldquo;{note}&rdquo;
          </motion.p>
        )}

        {reminderText && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{ color: WARM.cream, fontSize: 13, textAlign: "center", margin: 0, opacity: 0.75 }}
          >
            {reminderText}
          </motion.p>
        )}

        <ModeToggle mode={mode} onChange={setMode} />

        <AnimatePresence mode="wait">
          {mode === "chill" ? (
            <motion.div
              key="chill"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
            >
              <span style={{ color: WARM.stone, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Ambient sound</span>
              <SoundToggle sound={sound} onChange={setSound} />
            </motion.div>
          ) : (
            <motion.div
              key="games"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
            >
              <p style={{ color: WARM.stone, fontSize: 13, textAlign: "center", margin: 0, maxWidth: "36ch" }}>
                Something to do with your hands while you rest your mind. No pressure, nothing to win.
              </p>
              {!game ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <GamePickButton label="Math Sprint" onClick={() => setGame("math-sprint")} />
                  <GamePickButton label="Memory Match" onClick={() => setGame("memory-match")} />
                  <GamePickButton label="Geography Quiz" onClick={() => setGame("geography-quiz")} />
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(254,243,199,0.05)",
                    border: `1px solid ${WARM.stone}55`,
                    borderRadius: 20,
                    padding: 22,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  {game === "math-sprint" && <MathSprintGate userId={userId} sessionId={sessionId} practiceMode />}
                  {game === "memory-match" && <MemoryMatchGate userId={userId} sessionId={sessionId} practiceMode />}
                  {game === "geography-quiz" && <GeographyQuizGate userId={userId} sessionId={sessionId} practiceMode />}
                  <button
                    onClick={() => setGame(null)}
                    style={{ background: "transparent", border: "none", color: WARM.taupe, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Try something else
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {earlyReturnDisabled ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            style={{ marginTop: 8, color: WARM.stone, fontSize: 12, textAlign: "center" }}
          >
            Rest checkpoint — this one&apos;s mandatory.
          </motion.p>
        ) : (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            onClick={onEarlyReturn}
            style={{
              marginTop: 8,
              background: "transparent",
              color: WARM.taupe,
              border: `1px solid ${WARM.stone}66`,
              padding: "10px 20px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            I&apos;m ready, back to focus
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function BreathingCircle({ pct, circumference, label }: { pct: number; circumference: number; label: string }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.035, 1] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      style={{ position: "relative", width: 236, height: 236, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg width="236" height="236" viewBox="0 0 236 236" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx="118" cy="118" r="108" fill="none" stroke="rgba(168,162,158,0.18)" strokeWidth="4" />
        <motion.circle
          cx="118"
          cy="118"
          r="108"
          fill="none"
          stroke={WARM.cream}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 0.9, ease: "linear" }}
          style={{ filter: `drop-shadow(0 0 8px ${WARM.cream}55)` }}
        />
      </svg>
      <div
        style={{
          width: 190,
          height: 190,
          borderRadius: "50%",
          background: "radial-gradient(circle at 50% 40%, rgba(254,243,199,0.08), rgba(120,113,108,0.06) 70%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <span style={{ color: WARM.cream, fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{label}</span>
        <span style={{ color: WARM.stone, fontSize: 11, marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>remaining</span>
      </div>
    </motion.div>
  );
}

/** Flat-illustration reading nook, purely decorative, sitting behind the countdown circle:
 *  two soft bean-bag blobs, a warm lamp glow, and a small plant silhouette — all shape/CSS,
 *  no image assets. Absolutely positioned so it never affects layout of the real content. */
function LoungeScene() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* lamp glow */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 520,
          height: 420,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${WARM.cream}12, transparent 70%)`,
          filter: "blur(20px)",
        }}
      />
      {/* bean bags */}
      <div
        style={{
          position: "absolute",
          left: "-6%",
          bottom: "-8%",
          width: 340,
          height: 300,
          background: `linear-gradient(160deg, ${WARM.stone}33, ${WARM.stone}0d)`,
          borderRadius: "62% 38% 55% 45% / 58% 45% 55% 42%",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "-8%",
          bottom: "-10%",
          width: 300,
          height: 260,
          background: `linear-gradient(200deg, ${WARM.taupe}2e, ${WARM.taupe}0a)`,
          borderRadius: "45% 55% 40% 60% / 50% 40% 60% 50%",
        }}
      />
      {/* plant silhouette, bottom-right corner */}
      <svg width="120" height="150" viewBox="0 0 120 150" style={{ position: "absolute", right: 28, bottom: 0, opacity: 0.5 }}>
        <path d="M55 150 L55 90" stroke={WARM.stone} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M55 100c-18-6-30-24-28-42 20 2 32 16 34 34" fill={WARM.stone} opacity="0.6" />
        <path d="M58 88c16-8 26-26 22-44-20 4-30 20-30 38" fill={WARM.stone} opacity="0.75" />
        <path d="M55 96c10-2 18-10 20-22-14 0-22 8-24 18" fill={WARM.taupe} opacity="0.6" />
        <rect x="34" y="118" width="42" height="32" rx="4" fill={WARM.stone} opacity="0.45" />
      </svg>
      {/* dust motes */}
      {DUST.map((d) => (
        <span
          key={d.id}
          style={{
            position: "absolute",
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            borderRadius: "50%",
            background: WARM.cream,
            opacity: 0.3,
            animation: `fg-float ${d.dur}s ease-in-out ${d.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div style={{ display: "flex", background: "rgba(120,113,108,0.15)", borderRadius: 999, padding: 4, gap: 4 }}>
      {(["chill", "games"] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            background: mode === m ? WARM.cream : "transparent",
            color: mode === m ? "#1C1917" : WARM.taupe,
            border: "none",
            padding: "8px 18px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            transition: "background 0.25s ease, color 0.25s ease",
          }}
        >
          {m === "chill" ? "Just Chill" : "Brain Games"}
        </button>
      ))}
    </div>
  );
}

function GamePickButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "rgba(254,243,199,0.06)",
        border: `1px solid ${WARM.stone}55`,
        color: WARM.cream,
        padding: "10px 16px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function SoundToggle({ sound, onChange }: { sound: Sound; onChange: (s: Sound) => void }) {
  const OPTIONS: { value: Sound; label: string }[] = [
    { value: "rain", label: "🌧️ Rain" },
    { value: "lofi", label: "🎧 Lo-fi" },
    { value: "silence", label: "🤫 Silence" },
  ];
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            background: sound === o.value ? "rgba(254,243,199,0.14)" : "transparent",
            border: `1px solid ${sound === o.value ? WARM.cream : WARM.stone}55`,
            color: sound === o.value ? WARM.cream : WARM.taupe,
            padding: "7px 14px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Real, self-contained ambient audio via the Web Audio API — no audio files (none exist in
 * this project, and fetching third-party ones isn't something to do unprompted). "Rain" is
 * filtered looped noise; "lo-fi" is three soft detuned sine tones forming a slow pad chord.
 * Everything is built and torn down per mount/mode change; nothing persists once the
 * component unmounts (break ends) or the mode changes back to silence.
 */
function useAmbientSound(sound: Sound) {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);

  useEffect(() => {
    function teardown() {
      for (const n of nodesRef.current) {
        try {
          if ("stop" in n && typeof (n as AudioScheduledSourceNode).stop === "function") {
            (n as AudioScheduledSourceNode).stop();
          }
          n.disconnect();
        } catch {
          // already stopped/disconnected — nothing to do
        }
      }
      nodesRef.current = [];
    }

    teardown();
    if (sound === "silence") return;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!ctxRef.current) ctxRef.current = new AudioCtx();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();

    if (sound === "rain") {
      const bufferSeconds = 2;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * bufferSeconds, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;

      const gain = ctx.createGain();
      gain.gain.value = 0.05;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      nodesRef.current = [source, filter, gain];
    } else if (sound === "lofi") {
      const freqs = [130.81, 164.81, 196.0]; // a soft C3-E3-G3 pad
      const master = ctx.createGain();
      master.gain.value = 0.05;
      master.connect(ctx.destination);

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.15;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.015;
      lfo.connect(lfoGain);
      lfoGain.connect(master.gain);
      lfo.start();

      const oscNodes: AudioNode[] = [master, lfo, lfoGain];
      for (const f of freqs) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = 0.6;
        osc.connect(g);
        g.connect(master);
        osc.start();
        oscNodes.push(osc, g);
      }
      nodesRef.current = oscNodes;
    }

    return teardown;
  }, [sound]);

  // Full context close on unmount (break ends) — not just node teardown.
  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);
}
