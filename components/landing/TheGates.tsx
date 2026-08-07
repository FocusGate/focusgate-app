"use client";

import { Unlock, Siren, PenLine, Zap } from "lucide-react";
import { RevealItem } from "@/components/motion/Reveal";
import TiltCard from "@/components/TiltCard";
import MagneticButton from "@/components/MagneticButton";
import { StickyScrollStack, type StickyStackItem } from "@/components/ui/sticky-scroll-cards";

/** Marketing showcase for the friction system — the same four features the logged-in
 *  control panel at /the-gates lets you configure, framed here to convince a visitor
 *  to sign up rather than to be operated. */
const GATES = [
  {
    name: "Break Gates",
    tag: "Earn it",
    description: "Want a 5 minute break? Solve a 30-second challenge first. Fail it and the session just keeps going.",
    icon: Unlock,
    color: "#F59E0B",
  },
  {
    name: "Emergency Unblock",
    tag: "2 free / month",
    description: "Real emergencies happen. Two free unblocks a month — after that they cost $1, on purpose.",
    icon: Siren,
    color: "#EF4444",
  },
  {
    name: "Intentional Break Notes",
    tag: "Say it out loud",
    description: "Write a full sentence explaining why you deserve the break. Most people stop halfway through.",
    icon: PenLine,
    color: "#D97706",
  },
  {
    name: "Dead Man's Switch",
    tag: "Group only",
    description: "Studying with friends? Touch a blocked site and your whole group finds out instantly.",
    icon: Zap,
    color: "#38BDF8",
  },
] as const;

function GateStackCard({ gate }: { gate: (typeof GATES)[number] }) {
  const Icon = gate.icon;
  return (
    <TiltCard
      style={{
        background: `radial-gradient(circle at 50% 12%, ${gate.color}26, #0A0A0A 70%)`,
        border: `1px solid ${gate.color}55`,
        borderRadius: 22,
        padding: "34px 30px",
        width: "100%",
        height: 230,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 13,
            background: `${gate.color}1f`,
            border: `1px solid ${gate.color}66`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={22} color={gate.color} />
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: gate.color,
            border: `1px solid ${gate.color}66`,
            background: `${gate.color}14`,
            borderRadius: 999,
            padding: "4px 12px",
          }}
        >
          {gate.tag}
        </span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 22, color: "#fff" }}>{gate.name}</div>
      <p style={{ color: "#9a9da4", fontSize: 14, lineHeight: 1.55, margin: 0, maxWidth: "42ch" }}>{gate.description}</p>
    </TiltCard>
  );
}

export default function TheGates() {
  const stackItems: StickyStackItem[] = GATES.map((gate) => ({
    key: gate.name,
    content: <GateStackCard gate={gate} />,
  }));

  return (
    <section
      id="the-gates"
      className="fg-sec"
      style={{
        background: "radial-gradient(ellipse 1000px 500px at 50% 0%, rgba(245,158,11,0.05), transparent 60%), #060606",
        padding: "150px 0 60px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <RevealItem standalone style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ color: "#8a8d94", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 22 }}>
          The Gates
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
            maxWidth: "18ch",
          }}
        >
          Quitting should be harder than finishing.
        </h2>
        <p style={{ color: "#9a9da4", fontSize: 18, lineHeight: 1.7, maxWidth: "58ch", marginTop: 22 }}>
          Every other focus app has an off switch, so you use it. FocusGate puts four gates between you and the exit —
          each one small enough to pass if you really need to, and annoying enough that you usually won&apos;t bother.
        </p>
      </RevealItem>

      <StickyScrollStack items={stackItems} className="mt-4" />

      <RevealItem standalone style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px", textAlign: "center" }}>
        <MagneticButton style={{ display: "inline-block" }}>
          <a href="/signup" className="fg-cta-nav" style={{ display: "inline-block", padding: "15px 30px", fontSize: 15 }}>
            Get locked in →
          </a>
        </MagneticButton>
      </RevealItem>
    </section>
  );
}
