"use client";

import { RevealGroup, RevealItem } from "@/components/motion/Reveal";

const STEPS = [
  { n: "1", title: "Add the extension", detail: "10 seconds. No download, no app store wait — straight from the Chrome Web Store." },
  { n: "2", title: "Connect your account", detail: "Sign in once so the extension and your dashboard stay in sync." },
  { n: "3", title: "Start your first session", detail: "Pick a duration on your dashboard and lock in. That's it." },
];

export default function HowItWorks() {
  return (
    <section className="fg-sec" style={{ background: "#060606", padding: "100px 32px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <RevealGroup stagger={0.1} style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        <RevealItem>
          <div style={{ color: "#8a8d94", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>
            How it works
          </div>
          <h2
            style={{
              fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
              fontWeight: 700,
              fontSize: 40,
              letterSpacing: "-0.02em",
              color: "#fff",
              marginBottom: 56,
            }}
          >
            No download. No app store wait.
          </h2>
        </RevealItem>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
          {STEPS.map((s) => (
            <RevealItem
              key={s.n}
              style={{
                background: "#0A0A0A",
                border: "1px solid rgba(176,141,87,0.15)",
                borderRadius: 20,
                padding: "34px 26px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(176,141,87,0.12)",
                  border: "1px solid rgba(176,141,87,0.35)",
                  color: "#d4af7a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  fontWeight: 800,
                  marginBottom: 20,
                }}
              >
                {s.n}
              </div>
              <div style={{ color: "#fff", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
              <p style={{ color: "#9a9da4", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.detail}</p>
            </RevealItem>
          ))}
        </div>
      </RevealGroup>
    </section>
  );
}
