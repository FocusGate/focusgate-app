"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Smartphone } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { joinRoadmapWaitlist, type RoadmapPlatform } from "@/lib/supabase";

// Muted vs. bright gold are deliberately different tokens here — the whole point of this
// section is to read as "not yet available" against the vibrant "available now" feel of
// Pricing right above it. #F59E0B is the app's live accent (see Problem.tsx's eyebrow,
// The Gates, FlipClock); #B45309 is reserved for this section's ribbons/badges only.
const MUTED_GOLD = "#B45309";
const BRIGHT_GOLD = "#F59E0B";

type RoadmapCardData = {
  id: RoadmapPlatform;
  icon: ReactNode;
  accent: string;
  title: string;
  description: string;
  small: string;
};

const CARDS: RoadmapCardData[] = [
  {
    id: "desktop",
    icon: <Monitor size={24} />,
    accent: BRIGHT_GOLD,
    title: "FocusGate Desktop",
    description:
      "True system-level lockdown. Blocks apps, not just sites. Survives restarts. Can't be closed through Task Manager. The strongest version of Locked In Mode we can build.",
    small: "For Windows and Mac",
  },
  {
    id: "ios",
    icon: <Smartphone size={24} />,
    accent: "#60A5FA",
    title: "FocusGate for iPhone",
    description:
      "Block distracting apps on your phone using Apple's Screen Time framework. Same Locked In Mode, same badges, same friend groups — now in your pocket.",
    small: "App Store — launching after beta",
  },
  {
    id: "android",
    icon: <Smartphone size={24} />,
    accent: "#4ADE80",
    title: "FocusGate for Android",
    description: "Full app blocking on Android using accessibility permissions. The most powerful mobile version of FocusGate.",
    small: "Google Play — launching after beta",
  },
];

const PLATFORM_OPTIONS: { id: RoadmapPlatform; label: string }[] = [
  { id: "all", label: "All platforms" },
  { id: "desktop", label: "Desktop" },
  { id: "ios", label: "iPhone" },
  { id: "android", label: "Android" },
];

/** Diagonal corner ribbon — a fixed-width strip rotated 45° and clipped by the card's own
 *  overflow:hidden, the standard ribbon technique. Sits alongside (not instead of) the
 *  inline "Coming Soon" pill below the icon — the spec calls for both treatments. */
function ComingSoonRibbon() {
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: -42,
        width: 160,
        transform: "rotate(45deg)",
        background: MUTED_GOLD,
        color: "#fff",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        textAlign: "center",
        padding: "5px 0",
        boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
      }}
    >
      Coming Soon
    </div>
  );
}

function RoadmapCard({ card }: { card: RoadmapCardData }) {
  return (
    <RevealItem style={{ minWidth: 0 }}>
      {/* Separate inner motion.div for the hover interaction — keeps "brighten on hover"
         and the tooltip's own rest/hover variants isolated from RevealItem's scroll-reveal
         variants (which already own the hidden/visible labels one level up). */}
      <motion.div
        initial="rest"
        whileHover="hover"
        animate="rest"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#0b0b0d",
          border: "1px solid rgba(180,83,9,0.3)",
          borderRadius: 20,
          padding: "32px 28px",
          textAlign: "left",
          height: "100%",
          cursor: "default",
        }}
      >
        <ComingSoonRibbon />

        <motion.div variants={{ rest: { opacity: 0.85 }, hover: { opacity: 1 } }} transition={{ duration: 0.25, ease: "easeOut" }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              background: `${card.accent}1f`,
              color: card.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {card.icon}
          </div>

          <h3 style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 19, color: "#fff", margin: "20px 0 0" }}>{card.title}</h3>

          <span
            style={{
              display: "inline-block",
              marginTop: 12,
              background: "rgba(180,83,9,0.14)",
              color: MUTED_GOLD,
              border: "1px solid rgba(180,83,9,0.4)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              padding: "4px 11px",
              borderRadius: 999,
            }}
          >
            Coming Soon
          </span>

          <p style={{ color: "#9a9da4", fontSize: 14, lineHeight: 1.65, margin: "16px 0 0" }}>{card.description}</p>
          <p style={{ color: "#5b5e66", fontSize: 12, margin: "18px 0 0" }}>{card.small}</p>
        </motion.div>

        <motion.div
          variants={{ rest: { opacity: 0, y: 8 }, hover: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: 28,
            right: 28,
            bottom: 20,
            background: "#17171a",
            border: "1px solid rgba(180,83,9,0.45)",
            borderRadius: 10,
            padding: "9px 13px",
            fontSize: 12,
            color: "#d8d8dc",
            pointerEvents: "none",
          }}
        >
          Join the waitlist to be notified first.
        </motion.div>
      </motion.div>
    </RevealItem>
  );
}

export default function Roadmap() {
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState<RoadmapPlatform>("all");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      await joinRoadmapWaitlist(email.trim(), platform);
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="fg-sec" style={{ background: "#060606", color: "#fff", padding: "130px 32px", textAlign: "center" }}>
      <RevealItem standalone style={{ maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: 58, lineHeight: 1.1, color: "#fff" }}>
          This is just the beginning.
        </h2>
        <p style={{ color: "#9a9da4", fontSize: 17, marginTop: 16 }}>FocusGate is expanding beyond the browser.</p>
      </RevealItem>

      <RevealGroup
        stagger={0.1}
        className="fg-price3"
        style={{ maxWidth: 1140, margin: "56px auto 0", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, alignItems: "stretch" }}
      >
        {CARDS.map((card) => (
          <RoadmapCard key={card.id} card={card} />
        ))}
      </RevealGroup>

      <RevealItem standalone style={{ maxWidth: 460, margin: "60px auto 0" }}>
        <p style={{ color: "#cbccd2", fontSize: 16, fontWeight: 600 }}>Want to know the moment these launch?</p>

        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, margin: "16px 0 18px" }}>
          {PLATFORM_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPlatform(opt.id)}
              style={{
                background: platform === opt.id ? "rgba(180,83,9,0.15)" : "transparent",
                color: platform === opt.id ? MUTED_GOLD : "#8a8d94",
                border: `1px solid ${platform === opt.id ? "rgba(180,83,9,0.5)" : "#26262b"}`,
                padding: "7px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {status === "done" ? (
            <motion.p
              key="done"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ color: MUTED_GOLD, fontSize: 14, fontWeight: 600 }}
            >
              You&apos;re on the list — we&apos;ll email you the moment it ships.
            </motion.p>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              style={{ display: "flex", gap: 10 }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                style={{ flex: 1, minWidth: 0, background: "#101012", border: "1px solid #26262b", color: "#fff", padding: "12px 16px", borderRadius: 10, fontSize: 14, outline: "none" }}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                style={{
                  background: "rgba(180,83,9,0.15)",
                  color: MUTED_GOLD,
                  border: "1px solid rgba(180,83,9,0.45)",
                  padding: "12px 22px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: status === "loading" ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {status === "loading" ? "Sending…" : "Notify me"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
        {status === "error" && <p style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>Something went wrong — try again.</p>}
      </RevealItem>
    </section>
  );
}
