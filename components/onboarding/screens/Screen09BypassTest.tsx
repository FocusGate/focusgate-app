"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import ContinueButton from "@/components/onboarding/ContinueButton";

const COUNTDOWN_SECONDS = 5;

/** A tiny taste of what a real Locked-In session feels like — the countdown can't
 *  actually be cancelled no matter how many times "Try to Cancel Lock" is pressed, which
 *  is the entire point of the demo. */
export default function Screen09BypassTest({ onNext }: { onNext: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (secondsLeft === 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const done = secondsLeft === 0;

  return (
    <ScreenShell>
      <ScreenHeading eyebrow="Try it yourself" title="Try to cancel the lock." subtitle="Go ahead. Click the button. See what happens." />

      <div
        style={{
          background: "#0A0A0A",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          padding: "36px 24px",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <Lock size={32} color="#b08d57" />
        </div>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
          {String(secondsLeft).padStart(2, "0")}s
        </div>

        {!done && (
          <button
            key={attempts}
            onClick={() => setAttempts((a) => a + 1)}
            className={attempts > 0 ? "fg-shake-standalone" : undefined}
            style={{
              marginTop: 22,
              background: "transparent",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.4)",
              padding: "12px 24px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try to Cancel Lock
          </button>
        )}

        {attempts > 0 && !done && (
          <p style={{ color: "#f87171", fontSize: 13, fontWeight: 700, marginTop: 14 }}>🔒 Bypass Blocked!</p>
        )}

        {done && (
          <p style={{ color: "#4ade80", fontSize: 14, fontWeight: 600, marginTop: 18 }}>
            {attempts > 0 ? "Couldn't cancel it, could you? That's the point." : "That's what real focus feels like."}
          </p>
        )}
      </div>

      <ContinueButton onClick={onNext} disabled={!done} />
    </ScreenShell>
  );
}
