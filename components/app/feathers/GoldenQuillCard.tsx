"use client";

import { GoldenQuillGlyph } from "./GoldenQuillGlyph";
import FeatherProgressBarView from "./FeatherProgressBar";
import type { FeatherCardData } from "./FeatherCard";

const PARTICLES = [
  { left: "10%", top: "18%", delay: 0, size: 3 },
  { left: "88%", top: "14%", delay: 1.2, size: 2 },
  { left: "80%", top: "30%", delay: 0.4, size: 3 },
  { left: "16%", top: "68%", delay: 1.8, size: 2 },
  { left: "26%", top: "80%", delay: 0.9, size: 3 },
  { left: "72%", top: "82%", delay: 2.4, size: 2 },
  { left: "6%", top: "44%", delay: 3.1, size: 2 },
  { left: "92%", top: "58%", delay: 1.6, size: 3 },
];

/** The Golden Quill — formerly the "FocusGate Legend" card, now not just a re-skin but a
 *  step up in treatment: not in either scrolling Feathers row, deliberately its own bigger
 *  centerpiece, ornate 3-layer glyph (GoldenQuillGlyph, not a plain feather), 8 floating
 *  particles instead of 4, and a continuously rotating gold gradient on the glyph itself
 *  (not just a border pulse) — reusing the existing fg-legend-border/fg-shimmer-sweep/
 *  fg-gold-particle/fg-gem-rotate keyframes from globals.css, same as the card it replaces. */
export default function GoldenQuillCard({
  feather,
  unlocked,
  unlockedAt,
  progress,
  onClick,
}: {
  feather: FeatherCardData;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: { current: number; target: number };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        textAlign: "center",
        cursor: "pointer",
        font: "inherit",
        background: unlocked ? "linear-gradient(180deg, #100c04, #0A0A0A)" : "#0A0A0A",
        border: `2px solid ${unlocked ? "#F59E0B" : "#1E293B"}`,
        borderRadius: 22,
        padding: "52px 34px 44px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        animation: unlocked ? "fg-legend-border 4s ease-in-out infinite" : "none",
        opacity: unlocked ? 1 : 0.6,
      }}
    >
      {unlocked && (
        <>
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <div
              style={{
                position: "absolute",
                top: "-50%",
                left: "-60%",
                width: "50%",
                height: "220%",
                background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.24), transparent)",
                animation: "fg-shimmer-sweep 3.2s linear infinite",
              }}
            />
          </div>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {PARTICLES.map((p, i) => (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: p.left,
                  top: p.top,
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  background: i % 2 === 0 ? "#F59E0B" : "#FCD34D",
                  boxShadow: `0 0 6px ${i % 2 === 0 ? "#F59E0B" : "#FCD34D"}`,
                  animation: `fg-gold-particle ${5 + (i % 4)}s ease-in-out ${p.delay}s infinite`,
                }}
              />
            ))}
          </div>
        </>
      )}

      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.18em",
          color: unlocked ? "#FCD34D" : "#475569",
          border: `1px solid ${unlocked ? "rgba(245, 158, 11,0.5)" : "#1E293B"}`,
          borderRadius: 999,
          padding: "5px 14px",
          marginBottom: 24,
        }}
      >
        LEGENDARY
      </span>

      <div style={{ height: 156, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ animation: unlocked ? "fg-gem-rotate 14s linear infinite" : "none", filter: unlocked ? undefined : "grayscale(1) blur(1px)" }}>
          <GoldenQuillGlyph size={136} gradientId={`rv-quill-${unlocked ? "on" : "off"}`} />
        </div>
      </div>

      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 400,
          fontSize: 30,
          letterSpacing: "0.01em",
          color: unlocked ? "#F59E0B" : "#475569",
          marginTop: 16,
          textShadow: unlocked ? "0 0 20px rgba(245, 158, 11,0.5)" : "none",
        }}
      >
        {unlocked ? "The Golden Quill" : "???"}
      </div>
      <div style={{ color: unlocked ? "#cbd0d8" : "#334155", fontSize: 13, marginTop: 12, lineHeight: 1.5, maxWidth: "30ch" }}>
        {unlocked ? "Earned by using Raven every single day for 365 days." : feather.unlock_condition}
      </div>
      {unlocked ? (
        <div style={{ color: "#7a7d84", fontSize: 12, fontStyle: "italic", marginTop: 10 }}>Only 1% of users ever hold one.</div>
      ) : (
        progress && (
          <div style={{ marginTop: 16, width: "100%", maxWidth: 260 }}>
            <FeatherProgressBarView current={progress.current} target={progress.target} color="#F59E0B" />
          </div>
        )
      )}
      {unlocked && unlockedAt && (
        <div style={{ color: "#5b5e66", fontSize: 11, marginTop: 10 }}>Unlocked {new Date(unlockedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</div>
      )}
    </button>
  );
}
