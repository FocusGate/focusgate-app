"use client";

import { RevealGroup, RevealItem } from "@/components/motion/Reveal";

// Replaces the old LockedInShowcase (RavenLock headline + live FlipClock mockup) in this
// slot — that mechanic is covered by HowItWorks/HorizontalFeatures/ModesCarousel elsewhere
// on the page. This section instead introduces Rave, the mascot, as a character rather
// than a feature: not another enforcement mechanic, a companion. `id="features"` stays
// here since the navbar's FEATURES link scrolls to it.
const HELPERS = [
  { emoji: "👋", label: "Greets you at the start of every session" },
  { emoji: "📉", label: "Nudges you when screen time creeps up" },
  { emoji: "🎉", label: "Celebrates every streak and Feather with you" },
];

export default function MeetRave() {
  return (
    <section id="features" className="fg-sec" style={{ background: "#060606", padding: "150px 32px", position: "relative" }}>
      <RevealGroup
        stagger={0.12}
        className="fg-split"
        style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}
      >
        <RevealItem>
          <div style={{ color: "#8a8d94", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 24 }}>
            Meet Rave
          </div>
          <h2
            className="fg-h2"
            style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
              fontWeight: 700,
              fontSize: 64,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: "#fff",
            }}
          >
            This is Rave. Your focus companion.
          </h2>
          <p style={{ color: "#9a9da4", fontSize: 18, lineHeight: 1.7, maxWidth: "52ch", marginTop: 28, textWrap: "pretty" }}>
            Rave isn&apos;t a lock screen or a rulebook — it&apos;s the little raven in your corner, on your
            side every time you choose five more minutes of focus over five more minutes of scrolling.
            Rave notices when you&apos;re slipping into another doomscroll, shows up when you finish a
            session, and celebrates every streak like it&apos;s rooting for you personally. Lower screen
            time isn&apos;t something Rave forces on you — it&apos;s something Rave helps you actually want.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 36 }}>
            {HELPERS.map((h) => (
              <span
                key={h.label}
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
                <span style={{ fontSize: 15 }}>{h.emoji}</span>
                {h.label}
              </span>
            ))}
          </div>
          <p style={{ color: "#7a7d84", fontSize: 13, marginTop: 16, fontStyle: "italic" }}>
            Not a nag. Not a lecture. Just a friend who wants you to log off and get back to your life.
          </p>
        </RevealItem>

        <RevealItem style={{ position: "relative", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              position: "absolute",
              inset: -30,
              background: "radial-gradient(ellipse at center, rgba(245,158,11,0.14), transparent 70%)",
              filter: "blur(30px)",
            }}
          />
          {/* Same bob animation as the hero/waitlist mascot (rv-mascot-bob, globals.css),
              applied inline rather than via the .fg-hero-mascot class — that class also
              carries a <900px display:none meant for a side-decoration role, which is
              wrong here since this section's whole point is the mascot. */}
          <img
            src="/mascot-raven.png"
            alt="Rave, the Raven mascot"
            style={{
              position: "relative",
              width: "min(70%, 320px)",
              height: "auto",
              animation: "rv-mascot-bob 5.5s ease-in-out infinite",
              filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.5))",
            }}
          />
        </RevealItem>
      </RevealGroup>
    </section>
  );
}
