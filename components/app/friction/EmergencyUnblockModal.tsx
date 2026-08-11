"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import { getEmergencyUnblockStats, recordEmergencyUnblock, MAX_FREE_EMERGENCY_UNBLOCKS } from "@/lib/supabase";

const COOLDOWN_SECONDS = 10;
const MIN_REASON_LENGTH = 15;

type Step = "confirm" | "reason" | "cooldown" | "limit-reached";

export default function EmergencyUnblockModal({
  userId,
  sessionId,
  costMultiplier = 1,
  onGranted,
  onCancel,
}: {
  userId: string;
  sessionId: string;
  /** Exam Cram's "emergency unblocks cost double" — visual only for now (the spec is
   *  explicit about that): no change to MAX_FREE_EMERGENCY_UNBLOCKS or how many rows get
   *  written, just the copy shown while confirming, so the friction *reads* heavier in
   *  this mode without a real differential-billing system behind it. */
  costMultiplier?: number;
  onGranted: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>("confirm");
  const [confirmCount, setConfirmCount] = useState(0);
  const [reason, setReason] = useState("");
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [remainingFree, setRemainingFree] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function grant() {
    if (submitting) return;
    setSubmitting(true);
    try {
      // wasPaid is always false now — the $1 paid unblock is removed (for now); the free
      // monthly cap (MAX_FREE_EMERGENCY_UNBLOCKS) is a hard stop, not a paywall. The
      // was_paid column/param stay in place on purpose so this is easy to bring back later.
      await recordEmergencyUnblock(userId, sessionId, reason, false);
      onGranted();
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    getEmergencyUnblockStats(userId)
      .then((s) => setRemainingFree(Math.max(0, MAX_FREE_EMERGENCY_UNBLOCKS - s.usedThisMonth)))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (step !== "cooldown" || cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [step, cooldown]);

  useEffect(() => {
    if (step !== "cooldown" || cooldown > 0) return;
    if (remainingFree !== null && remainingFree <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- transitioning to the limit-reached screen once the free monthly allowance is exhausted and the cooldown finishes is the intended sync here
      setStep("limit-reached");
    } else {
      void grant();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- grant closes over reason/userId/sessionId already captured via props/state
  }, [step, cooldown, remainingFree]);

  function handleConfirmClick() {
    const next = confirmCount + 1;
    setConfirmCount(next);
    if (next >= 3) setStep("reason");
  }

  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 700,
        background: "rgba(20,0,0,0.85)",
        backdropFilter: "blur(6px)",
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
        style={{ background: "#0A0A0A", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 24, padding: 32, maxWidth: 460, width: "100%", position: "relative" }}
      >
        {step !== "cooldown" && (
          <button
            onClick={onCancel}
            aria-label="Cancel"
            style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: "#7a7d84", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        )}

        {step === "confirm" && (
          <>
            <AlertTriangle size={28} color="#EF4444" />
            <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginTop: 14 }}>Is this really an emergency?</h3>
            <p style={{ color: "#9a9da4", fontSize: 14, marginTop: 8 }}>
              Not for cravings, boredom, or impulse. This ends your session — you&apos;ll need to start a new one. Confirm{" "}
              {3 - confirmCount} more time{3 - confirmCount === 1 ? "" : "s"}.
            </p>
            {costMultiplier > 1 && (
              <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 10, fontWeight: 700 }}>
                Exam Cram mode: this uses {costMultiplier} credits instead of 1.
              </p>
            )}
            <button
              onClick={handleConfirmClick}
              style={{ marginTop: 18, width: "100%", background: "#EF4444", color: "#fff", border: "none", padding: 14, borderRadius: 999, fontSize: 15, fontWeight: 800, cursor: "pointer" }}
            >
              Yes, it&apos;s a real emergency ({confirmCount} / 3)
            </button>
          </>
        )}

        {step === "reason" && (
          <>
            <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>What&apos;s the emergency?</h3>
            <p style={{ color: "#9a9da4", fontSize: 14, marginTop: 8 }}>Write a sentence explaining what happened.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="I need to…"
              style={{ width: "100%", marginTop: 12, background: "#101012", border: "1px solid #26262b", color: "#fff", borderRadius: 12, padding: 14, fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit" }}
            />
            <button
              onClick={() => setStep("cooldown")}
              disabled={!reasonValid}
              style={{
                marginTop: 18,
                width: "100%",
                background: reasonValid ? "#EF4444" : "#26262b",
                color: reasonValid ? "#fff" : "#5b5e66",
                border: "none",
                padding: 14,
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 800,
                cursor: reasonValid ? "pointer" : "default",
              }}
            >
              Continue
            </button>
          </>
        )}

        {step === "cooldown" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ color: "#EF4444", fontSize: 48, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{cooldown}</div>
            <p style={{ color: "#9a9da4", fontSize: 14, marginTop: 10 }}>Mandatory cooling-off period. Almost there.</p>
          </div>
        )}

        {step === "limit-reached" && (
          <>
            <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>Out of emergencies this month</h3>
            <p style={{ color: "#9a9da4", fontSize: 14, marginTop: 8 }}>
              You&apos;ve used all {MAX_FREE_EMERGENCY_UNBLOCKS} Emergency Unblocks this month — that&apos;s the whole point of
              the cap. More become available next month.
            </p>
            <button
              onClick={onCancel}
              style={{ marginTop: 18, width: "100%", background: "#EF4444", color: "#fff", border: "none", padding: 14, borderRadius: 999, fontSize: 15, fontWeight: 800, cursor: "pointer" }}
            >
              Back to focus
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
