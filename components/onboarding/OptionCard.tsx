"use client";

import { motion } from "framer-motion";

/** Shared single-select card used by every quiz/commitment screen. Selecting fires
 *  `onSelect` immediately (so the parent can record the answer and start its 200ms
 *  auto-advance timer) — the auto-advance itself lives in the parent screen, not here,
 *  since only the screen knows whether it's the last question or needs to chain into
 *  something else. */
export default function OptionCard({
  icon,
  label,
  description,
  selected,
  onSelect,
}: {
  icon?: string;
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        textAlign: "left",
        background: selected ? "rgba(176,141,87,0.12)" : "#0A0A0A",
        border: `1px solid ${selected ? "#b08d57" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 16,
        padding: "18px 20px",
        color: "#fff",
        fontSize: 16,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: selected ? "0 0 24px rgba(176,141,87,0.2)" : "none",
        transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
      <span style={{ flex: 1 }}>
        <span style={{ display: "block" }}>{label}</span>
        {description && <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#7a7d84", marginTop: 3 }}>{description}</span>}
      </span>
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `1.5px solid ${selected ? "#b08d57" : "rgba(255,255,255,0.25)"}`,
          background: selected ? "#b08d57" : "transparent",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected && (
          <svg width="11" height="11" viewBox="0 0 20 20" fill="#0a0a0a">
            <path d="M2.94 6.94a.75.75 0 011.06 0L10 12.94l6-6a.75.75 0 111.06 1.06l-6.53 6.53a.75.75 0 01-1.06 0L2.94 8a.75.75 0 010-1.06z" />
          </svg>
        )}
      </span>
    </motion.button>
  );
}
