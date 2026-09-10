"use client";

import { RaveSplit } from "./RaveSplit";

// Replaces the old LockedInShowcase (RavenLock headline + live FlipClock mockup) in this
// slot — that mechanic is covered by HowItWorks/HorizontalFeatures/ModesCarousel elsewhere
// on the page. This section instead introduces Rave, the mascot, as a character rather
// than a feature: not another enforcement mechanic, a companion. `id="features"` stays
// here since the navbar's FEATURES link scrolls to it -- also why this is the "Features"
// pose in the RaveSplit sequence (image-right/text-left; the next split down the page,
// Feathers, flips to image-left).
const HELPERS = [
  { emoji: "👋", label: "Greets you at the start of every session" },
  { emoji: "📉", label: "Nudges you when screen time creeps up" },
  { emoji: "🎉", label: "Celebrates every streak and Feather with you" },
];

export default function MeetRave() {
  return (
    <section id="features" className="fg-sec" style={{ background: "#060606", padding: "150px 32px", position: "relative" }}>
      <RaveSplit image="/rave/rave-features.png" imageAlt="Rave pointing out a feature" side="right">
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
      </RaveSplit>
    </section>
  );
}
