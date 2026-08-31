"use client";

import { AnimatePresence, motion } from "framer-motion";
import { getFeatherIcon, TIER_META, isValidTier } from "@/components/app/featherIcons";
import FeatherProgressBar from "./FeatherProgressBar";

export type FeatherModalData = {
  id: string;
  name: string;
  description: string;
  rarity: string;
  unlock_condition: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: { current: number; target: number };
};

export default function FeatherModal({ feather, onClose }: { feather: FeatherModalData | null; onClose: () => void }) {
  const tier = feather && isValidTier(feather.rarity) ? feather.rarity : "common";
  const meta = TIER_META[tier];
  return (
    <AnimatePresence>
      {feather && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 700,
            background: "rgba(6,6,6,0.85)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0A0A0A",
              border: `1px solid ${meta.glow}66`,
              borderRadius: 24,
              padding: 32,
              maxWidth: 360,
              width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ filter: feather.unlocked ? `drop-shadow(0 0 20px ${getFeatherIcon(tier).color}aa)` : "grayscale(1) opacity(0.4)" }}>
              {getFeatherIcon(tier).svg}
            </div>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginTop: 14 }}>{feather.unlocked ? feather.name : "???"}</div>
            <div style={{ color: meta.glow, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 6 }}>
              {feather.rarity}
            </div>
            <p style={{ color: "#9a9da4", fontSize: 14, lineHeight: 1.6, marginTop: 14 }}>{feather.unlocked ? feather.description : feather.unlock_condition}</p>

            {feather.unlocked && feather.unlockedAt && (
              <div style={{ color: "#5b5e66", fontSize: 12, marginTop: 10 }}>Unlocked {new Date(feather.unlockedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</div>
            )}

            {!feather.unlocked && feather.progress && (
              <div style={{ marginTop: 18 }}>
                <FeatherProgressBar current={feather.progress.current} target={feather.progress.target} color={meta.glow} />
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                marginTop: 22,
                background: "rgba(245, 158, 11,0.15)",
                color: "#F59E0B",
                border: "1px solid rgba(245, 158, 11,0.4)",
                padding: "10px 24px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
