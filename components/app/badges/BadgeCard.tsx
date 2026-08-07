"use client";

import { getBadgeIcon, TIER_META, type BadgeTier } from "@/components/app/badgeIcons";
import BadgeProgressBarView from "./BadgeProgressBar";

export type BadgeCardData = {
  id: string;
  name: string;
  description: string;
  rarity: string;
  unlock_condition: string;
};

/** Mythic gets extra floating particles (still, just fewer/dimmer than Legendary's) — the
 *  spec calls for mythic/legendary to "feel visually rarer" via more particle effects. */
const MYTHIC_PARTICLES = [
  { left: "18%", top: "16%", delay: 0 },
  { left: "80%", top: "24%", delay: 1.4 },
  { left: "68%", top: "76%", delay: 2.3 },
];

export default function BadgeCard({
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
  const tier = (badge.rarity as BadgeTier) in TIER_META ? (badge.rarity as BadgeTier) : "common";
  const meta = TIER_META[tier];
  const icon = getBadgeIcon(badge.name);
  const isMythic = tier === "mythic";

  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        background: unlocked ? `radial-gradient(circle at 50% 22%, ${meta.glowSoft}, #0A0A0A 68%)` : "#0A0A0A",
        border: `1px solid ${unlocked ? `${meta.glow}aa` : "#1E293B"}`,
        borderRadius: 16,
        padding: isMythic ? "32px 22px" : "26px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        opacity: unlocked ? 1 : 0.5,
        cursor: "pointer",
        font: "inherit",
        minWidth: 0,
        overflow: "hidden",
        boxShadow: unlocked && !isMythic ? `0 14px 30px rgba(0,0,0,0.5), 0 0 24px ${meta.glowSoft}` : undefined,
        animation: unlocked && isMythic ? "fg-mythic-pulse 3s ease-in-out infinite" : undefined,
      }}
    >
      {isMythic && unlocked && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {MYTHIC_PARTICLES.map((p, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: p.left,
                top: p.top,
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: meta.glow,
                boxShadow: `0 0 6px ${meta.glow}`,
                animation: `fg-gold-particle ${5 + i}s ease-in-out ${p.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}
      <div
        style={{
          height: isMythic ? 74 : 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: unlocked ? `drop-shadow(0 0 ${isMythic ? 16 : 10}px ${icon.color}aa)` : "blur(6px)",
        }}
      >
        {icon.svg}
      </div>
      <div style={{ fontWeight: 700, fontSize: isMythic ? 16 : 15, marginTop: 10, color: unlocked ? "#fff" : "#475569" }}>
        {unlocked ? badge.name : "???"}
      </div>
      <div style={{ color: unlocked ? "#7a7d84" : "#334155", fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
        {unlocked ? badge.description : progress ? `${progress.current} / ${progress.target}` : badge.unlock_condition}
      </div>
      {unlocked && unlockedAt && (
        <div style={{ color: "#5b5e66", fontSize: 11, marginTop: 10 }}>Unlocked {new Date(unlockedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</div>
      )}
      {!unlocked && progress && (
        <div style={{ marginTop: 12, width: "100%" }}>
          <BadgeProgressBarView current={progress.current} target={progress.target} color={meta.glow} />
        </div>
      )}
    </button>
  );
}
