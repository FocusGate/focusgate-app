"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const CONFIRM_PHRASE = "I AM LOCKED IN";

/** Gate in front of every real session start — not a toggleable "hardcore mode," since
 *  Locked In Mode has never had an early-exit path anyway (no plain Stop button
 *  anywhere, in the dashboard or the extension). This just makes sure starting one is a
 *  deliberate act, not a misclick: typing the exact phrase is a small enough commitment
 *  to filter out "oops" clicks without adding real friction to someone who means it. */
export default function LockConfirmModal({
  minutes,
  onConfirm,
  onCancel,
}: {
  minutes: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const ready = typed.trim().toUpperCase() === CONFIRM_PHRASE;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
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
          background: "rgba(10,10,10,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(176,141,87,0.3)",
          borderRadius: 24,
          padding: 36,
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 34, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: "#fff", fontSize: 21, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
          Once started, this cannot be undone.
        </h2>
        <p style={{ color: "#9a9da4", fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
          Not by closing your laptop. Not by restarting. Not by anything until the {minutes}-minute timer ends.
        </p>
        <p style={{ color: "#7a7d84", fontSize: 12, marginTop: 18 }}>
          Type <span style={{ color: "#b08d57", fontWeight: 700 }}>{CONFIRM_PHRASE}</span> to confirm.
        </p>
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && ready) onConfirm();
          }}
          placeholder={CONFIRM_PHRASE}
          style={{
            width: "100%",
            marginTop: 12,
            background: "#0A0A0A",
            border: `1px solid ${ready ? "#b08d57" : "rgba(255,255,255,0.12)"}`,
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
              background: ready ? "linear-gradient(180deg, #d4af7a, #b08d57)" : "#26262b",
              color: ready ? "#0a0a0a" : "#5b5e66",
              border: "none",
              padding: "13px 0",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 800,
              cursor: ready ? "pointer" : "default",
            }}
          >
            Lock In
          </button>
        </div>
      </motion.div>
    </div>
  );
}
