"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { DEEP_FOCUS_CONFIRM_PHRASE, DEEP_FOCUS_MINUTES } from "@/lib/sessionModes";

/** Deep Focus's own confirm gate — stronger than the standard LockConfirmModal on purpose:
 *  this is the one mode with literally no break path (Break Gates aren't offered at all,
 *  only Emergency Unblock), so the commitment device has to be louder than "I AM LOCKED
 *  IN" to match. */
export default function DeepFocusConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [typed, setTyped] = useState("");
  const ready = typed.trim().toUpperCase() === DEEP_FOCUS_CONFIRM_PHRASE;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: "rgba(10,10,10,0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(245,158,11,0.5)",
          boxShadow: "0 0 60px rgba(245,158,11,0.15)",
          borderRadius: 24,
          padding: 36,
          maxWidth: 460,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 34, marginBottom: 16 }}>🎯</div>
        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
          This is Deep Focus.
        </h2>
        <p style={{ color: "#F59E0B", fontSize: 15, fontWeight: 700, marginTop: 10 }}>
          No breaks. No exceptions. {DEEP_FOCUS_MINUTES} minutes.
        </p>
        <p style={{ color: "#9a9da4", fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
          Break Gates aren&apos;t offered in this mode at all — the only way out early is Emergency Unblock, and that
          still ends the session outright.
        </p>
        <p style={{ color: "#7a7d84", fontSize: 12, marginTop: 18 }}>
          Type <span style={{ color: "#F59E0B", fontWeight: 700 }}>{DEEP_FOCUS_CONFIRM_PHRASE}</span> to confirm.
        </p>
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && ready) onConfirm();
          }}
          placeholder={DEEP_FOCUS_CONFIRM_PHRASE}
          style={{
            width: "100%",
            marginTop: 12,
            background: "#0A0A0A",
            border: `1px solid ${ready ? "#F59E0B" : "rgba(255,255,255,0.12)"}`,
            color: "#fff",
            padding: "14px 16px",
            borderRadius: 12,
            fontSize: 15,
            textAlign: "center",
            outline: "none",
            letterSpacing: "0.02em",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#9a9da4",
              padding: "13px 0",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!ready}
            style={{
              flex: 1,
              background: ready ? "linear-gradient(180deg, #FBBF24, #F59E0B)" : "#26262b",
              color: ready ? "#0a0a0a" : "#5b5e66",
              border: "none",
              padding: "13px 0",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 800,
              cursor: ready ? "pointer" : "default",
              boxShadow: ready ? "0 0 30px rgba(245,158,11,0.4)" : "none",
            }}
          >
            Lock In
          </button>
        </div>
      </motion.div>
    </div>
  );
}
