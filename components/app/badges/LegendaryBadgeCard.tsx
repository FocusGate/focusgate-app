"use client";

import { getBadgeIcon } from "@/components/app/badgeIcons";
import BadgeProgressBarView from "./BadgeProgressBar";
import type { BadgeCardData } from "./BadgeCard";

/** The single Legendary-tier card — deliberately its own component rather than a variant
 *  of BadgeCard: biggest card, animated gold border + shimmer sweep + rotating gem +
 *  floating particles (reusing the landing page's existing fg-legend-border/fg-shimmer-
 *  sweep/fg-gold-particle/fg-gem-rotate keyframes from globals.css), and — unlike the
 *  landing page's always-"unlocked" marketing version — has a real locked state. */
export default function LegendaryBadgeCard({
  badge,
  unlocked,
  unlockedAt,
  progress,
  onClick,
}: {
  badge: BadgeCardData;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: { current: number; target: number };
  onClick: () => void;
}) {
  const icon = getBadgeIcon(badge.name);

  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        textAlign: "center",
        cursor: "pointer",
        font: "inherit",
        background: unlocked ? "linear-gradient(180deg, #0d0b06, #0A0A0A)" : "#0A0A0A",
        border: `2px solid ${unlocked ? "#F59E0B" : "#1E293B"}`,
        borderRadius: 20,
        padding: "44px 30px 38px",
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
                background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.22), transparent)",
                animation: "fg-shimmer-sweep 3.2s linear infinite",
              }}
            />
          </div>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <span style={{ position: "absolute", left: "14%", top: "20%", width: 3, height: 3, borderRadius: "50%", background: "#F59E0B", boxShadow: "0 0 6px #F59E0B", animation: "fg-gold-particle 5s ease-in-out infinite" }} />
            <span style={{ position: "absolute", left: "82%", top: "26%", width: 3, height: 3, borderRadius: "50%", background: "#FCD34D", boxShadow: "0 0 6px #FCD34D", animation: "fg-gold-particle 6s ease-in-out 1s infinite" }} />
            <span style={{ position: "absolute", left: "24%", top: "72%", width: 2, height: 2, borderRadius: "50%", background: "#F59E0B", boxShadow: "0 0 6px #F59E0B", animation: "fg-gold-particle 7s ease-in-out 0.5s infinite" }} />
            <span style={{ position: "absolute", left: "74%", top: "78%", width: 3, height: 3, borderRadius: "50%", background: "#FCD34D", boxShadow: "0 0 6px #FCD34D", animation: "fg-gold-particle 5.5s ease-in-out 2s infinite" }} />
          </div>
        </>
      )}

      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.16em",
          color: unlocked ? "#FCD34D" : "#475569",
          border: `1px solid ${unlocked ? "rgba(245,158,11,0.5)" : "#1E293B"}`,
          borderRadius: 999,
          padding: "4px 12px",
          marginBottom: 20,
        }}
      >
        LEGENDARY
      </span>

      <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ animation: unlocked ? "fg-gem-rotate 14s linear infinite" : "none", filter: unlocked ? undefined : "grayscale(1) blur(1px)" }}>
          {icon.svg && <div style={{ transform: "scale(2.3)" }}>{icon.svg}</div>}
        </div>
      </div>

      <div
        style={{
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: "0.02em",
          color: unlocked ? "#F59E0B" : "#475569",
          marginTop: 14,
          textShadow: unlocked ? "0 0 18px rgba(245,158,11,0.45)" : "none",
        }}
      >
        {unlocked ? badge.name.toUpperCase() : "???"}
      </div>
      <div style={{ color: unlocked ? "#cbd0d8" : "#334155", fontSize: 13, marginTop: 12, lineHeight: 1.5, maxWidth: "30ch" }}>
        {unlocked ? badge.description : badge.unlock_condition}
      </div>
      {unlocked ? (
        <div style={{ color: "#7a7d84", fontSize: 12, fontStyle: "italic", marginTop: 10 }}>Only 1% of users ever unlock this.</div>
      ) : (
        progress && (
          <div style={{ marginTop: 16, width: "100%", maxWidth: 240 }}>
            <BadgeProgressBarView current={progress.current} target={progress.target} color="#F59E0B" />
          </div>
        )
      )}
      {unlocked && unlockedAt && (
        <div style={{ color: "#5b5e66", fontSize: 11, marginTop: 10 }}>Unlocked {new Date(unlockedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</div>
      )}
    </button>
  );
}
