"use client";

import { motion } from "framer-motion";
import { computeFocusScore, formatHoursMinutes } from "@/lib/stats";
import { getBadgeIcon } from "@/components/app/badgeIcons";
import FocusScoreCard from "@/components/app/stats/FocusScoreCard";
import type { NewlyUnlockedBadge } from "@/lib/supabase";
import ShareCard from "./ShareCard";

export default function SessionCompleteScreen({
  durationMinutes,
  streak,
  unlockedBadges,
  onStartAnother,
  onReturnToDashboard,
  modeExtra,
}: {
  durationMinutes: number;
  streak: number;
  unlockedBadges: NewlyUnlockedBadge[];
  onStartAnother: () => void;
  onReturnToDashboard: () => void;
  /** Mode-specific end-of-session content — Exam Cram's Cram Report, Group Study's group
   *  summary, All Nighter's sleep note. Nothing renders here for Custom/Deep Focus/etc. */
  modeExtra?: React.ReactNode;
}) {
  const focusScore = computeFocusScore({ durationMinutes, streak });
  const durationLabel = formatHoursMinutes(durationMinutes);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        background: "#060606",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        overflowY: "auto",
        textAlign: "center",
      }}
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        style={{
          width: 84,
          height: 84,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 60px rgba(245,158,11,0.5)",
          marginBottom: 22,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 20 20" fill="#0a0a0a">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </motion.div>

      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: 0 }}>
        Session complete
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ color: "#9a9da4", fontSize: 16, marginTop: 8 }}>
        {durationLabel} locked in. 🔥 {streak} day{streak === 1 ? "" : "s"}.
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ marginTop: 28 }}>
        <FocusScoreCard score={focusScore} />
      </motion.div>

      {unlockedBadges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{ marginTop: 26, display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", maxWidth: 420 }}
        >
          {unlockedBadges.map((b, i) => {
            const icon = getBadgeIcon(b.name);
            return (
              <motion.div
                key={b.id}
                initial={{ scale: 0, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.7 + i * 0.15 }}
                style={{ background: "#0A0A0A", border: `1px solid ${icon.color}66`, borderRadius: 14, padding: 14, width: 120 }}
              >
                <div style={{ filter: `drop-shadow(0 0 10px ${icon.color}aa)` }}>{icon.svg}</div>
                <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, marginTop: 8 }}>{b.name}</div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {modeExtra && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} style={{ marginTop: 26, width: "100%", maxWidth: 440 }}>
          {modeExtra}
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} style={{ display: "flex", gap: 12, marginTop: 34, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={onStartAnother}
          style={{ background: "#F59E0B", color: "#0a0a0a", border: "none", padding: "14px 24px", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Start another session
        </button>
        <button
          onClick={onReturnToDashboard}
          style={{ background: "transparent", color: "#9a9da4", border: "1px solid rgba(255,255,255,0.15)", padding: "14px 24px", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Return to dashboard
        </button>
        <ShareCard durationLabel={durationLabel} streak={streak} focusScore={focusScore} />
      </motion.div>
    </motion.div>
  );
}
