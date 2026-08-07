"use client";

import { useEffect, useState } from "react";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import FlipClock from "@/components/timer/FlipClock";

const DEMO_TOTAL_SECONDS = 2 * 3600;

const PILLS = [
  { emoji: "📱", label: "Cross-Device Sync" },
  { emoji: "🛑", label: "Zero Workarounds" },
  { emoji: "⚡", label: "Hardcore Lock" },
  { emoji: "🔒", label: "Survives restarts" },
];

export default function LockedInShowcase() {
  const [seconds, setSeconds] = useState(6452);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : DEMO_TOTAL_SECONDS));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="features" className="fg-sec" style={{ background: "#060606", padding: "150px 32px", position: "relative" }}>
      <RevealGroup
        stagger={0.12}
        className="fg-split"
        style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}
      >
        <RevealItem>
          <div style={{ color: "#8a8d94", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 24 }}>
            Locked In Mode
          </div>
          <h2
            className="fg-h2"
            style={{
              fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
              fontWeight: 700,
              fontSize: 64,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: "#fff",
            }}
          >
            The focus app that won&apos;t let you cheat.
          </h2>
          <p style={{ color: "#9a9da4", fontSize: 18, lineHeight: 1.7, maxWidth: "52ch", marginTop: 28, textWrap: "pretty" }}>
            Every other app lets you turn it off. That&apos;s why they don&apos;t work. Once you activate Locked In
            Mode, you cannot end the session. No exit. No exceptions.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 36 }}>
            {PILLS.map((p) => (
              <span
                key={p.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#d8d8dc",
                  padding: "10px 18px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: 15 }}>{p.emoji}</span>
                {p.label}
              </span>
            ))}
          </div>
          <p style={{ color: "#7a7d84", fontSize: 13, marginTop: 16, fontStyle: "italic" }}>
            In case of emergencies, we added 2 emergency exits per month.
          </p>
        </RevealItem>

        <RevealItem style={{ position: "relative", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              position: "absolute",
              inset: -30,
              background: "radial-gradient(ellipse at center, rgba(245,158,11,0.10), transparent 70%)",
              filter: "blur(30px)",
            }}
          />
          <FlipClock seconds={seconds} totalSeconds={DEMO_TOTAL_SECONDS} />
        </RevealItem>
      </RevealGroup>
    </section>
  );
}
