"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

/** Collapsible dark card — one per Gate in the control panel. Open by default so a user
 *  landing here sees their settings rather than four closed lids. */
export default function GateSection({
  icon,
  title,
  subtitle,
  accent,
  disabled,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  /** Renders the header muted with an "Off" pill — the section still opens. */
  disabled?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        background: "#0A0A0A",
        border: `1px solid ${open ? `${accent}44` : "rgba(255,255,255,0.08)"}`,
        borderRadius: 20,
        overflow: "hidden",
        transition: "border-color 0.3s ease",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "transparent",
          border: "none",
          padding: "22px 24px",
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
        }}
      >
        <span
          style={{
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: 12,
            background: `${accent}1f`,
            border: `1px solid ${accent}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled ? 0.45 : 1,
          }}
        >
          {icon}
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>{title}</span>
            {disabled && (
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7a7d84", border: "1px solid #26262b", borderRadius: 999, padding: "2px 8px" }}>
                Off
              </span>
            )}
          </span>
          <span style={{ display: "block", color: "#7a7d84", fontSize: 13, marginTop: 3 }}>{subtitle}</span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} style={{ display: "flex", color: "#7a7d84" }}>
          <ChevronDown size={18} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "4px 24px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Labelled row wrapper so every control in a section lines up the same way. */
export function GateRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#d8d8dc", fontSize: 14, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ color: "#5b5e66", fontSize: 12, marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}
