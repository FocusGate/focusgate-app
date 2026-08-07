"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function DeleteAccountDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setDeleting(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account.");
      setDeleting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={deleting ? undefined : onClose}
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
            style={{ background: "#0A0A0A", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 24, padding: 32, maxWidth: 420, width: "100%" }}
          >
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>Delete your account?</h2>
            <p style={{ color: "#9a9da4", fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
              This permanently deletes your FocusGate profile, sessions, badges, and blocked sites. Any group you created will be deleted for every member in it.
            </p>
            <p style={{ color: "#9a9da4", fontSize: 14, lineHeight: 1.6, marginTop: 10 }}>
              This does <strong>not</strong> delete your underlying login credentials — you&apos;ll be signed out, but the account itself remains. Contact support if you need that removed too.
            </p>

            <div style={{ marginTop: 18 }}>
              <label style={{ color: "#7a7d84", fontSize: 12 }}>Type DELETE to confirm</label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={deleting}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 6,
                  background: "#101012",
                  border: "1px solid #26262b",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>{error}</p>}

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button
                onClick={onClose}
                disabled={deleting}
                style={{ background: "transparent", color: "#9a9da4", border: "1px solid rgba(255,255,255,0.15)", padding: "10px 20px", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirmText !== "DELETE" || deleting}
                style={{
                  background: "rgba(239,68,68,0.15)",
                  color: "#f87171",
                  border: "1px solid rgba(239,68,68,0.5)",
                  padding: "10px 20px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: confirmText !== "DELETE" || deleting ? "default" : "pointer",
                  opacity: confirmText !== "DELETE" ? 0.5 : 1,
                }}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
