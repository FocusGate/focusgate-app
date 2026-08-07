"use client";

import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { FocusGateMark } from "./Navbar";

const FG_ITEMS = [
  "Locked In Mode — cannot be turned off",
  "Friend accountability groups",
  "Badge achievement system",
  "AI focus insights",
  "Custom block schedules",
  "Real-time session timer",
  "Focus streak tracking",
  "Built for students",
  "Set up in 10 seconds",
  "Premium, modern design",
  "Free during beta",
  "Blocking survives restarts",
];

const OTHER_ITEMS = [
  "Can be turned off anytime",
  "No accountability",
  "No rewards system",
  "No insights",
  "Basic scheduling only",
  "No visual timer",
  "No streaks",
  "Built for adults",
  "Install + manual setup",
  "Dated, cluttered interfaces",
  "Often paid upfront",
  "Bypass protection varies",
];

export default function Comparison() {
  return (
    <section className="fg-sec" style={{ padding: 0, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <RevealGroup stagger={0.05} amount={0.1} className="fg-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, position: "relative" }}>
        <div
          style={{
            background: "radial-gradient(ellipse 700px 500px at 30% 0%, rgba(176,141,87,0.08), transparent 65%), #0b0b0d",
            padding: "110px 8% 120px",
            borderRight: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 34 }}>
            <FocusGateMark size={22} />
            <span style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>FocusGate</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {FG_ITEMS.map((t) => (
              <RevealItem key={t} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M5 13l4 4 10-11" stroke="#b08d57" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ color: "#f3f3f5", fontSize: 17, fontWeight: 500 }}>{t}</span>
              </RevealItem>
            ))}
          </div>
        </div>

        <div style={{ background: "#0A0A0A", padding: "110px 8% 120px" }}>
          <div style={{ marginBottom: 34 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: "#5b5e66", letterSpacing: "-0.01em" }}>Other Apps</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {OTHER_ITEMS.map((t) => (
              <RevealItem key={t} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M7 7l10 10M17 7L7 17" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <span style={{ color: "#56585f", fontSize: 17, textDecoration: "line-through", textDecorationColor: "rgba(239,68,68,0.4)" }}>
                  {t}
                </span>
              </RevealItem>
            ))}
          </div>
        </div>
      </RevealGroup>
    </section>
  );
}
