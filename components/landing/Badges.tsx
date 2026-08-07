"use client";

import { useEffect, useRef } from "react";
import { motion, animate, type Variants } from "framer-motion";
import { RevealItem } from "@/components/motion/Reveal";
import TiltCard from "@/components/TiltCard";
import { getBadgeIcon, TIER_META, type BadgeTier } from "@/components/app/badgeIcons";

// Mirrors the real catalog seeded in supabase/schema.sql — kept as static copy here (not
// fetched) since this is marketing content, same as the rest of the landing page. Grouped
// by tier on purpose: "Iron Focus" and "The Gates" pattern already established elsewhere.
// FocusGate Legend gets its own dramatic card below instead of sitting in this list.
const SHOWCASE: { name: string; desc: string; tier: BadgeTier }[] = [
  { name: "First Lock", desc: "Complete your first Locked In session", tier: "common" },
  { name: "Early Riser", desc: "Start a session before 8am", tier: "common" },
  { name: "Clean Slate", desc: "Finish a session with zero break gates used", tier: "common" },
  { name: "Weekend Warrior", desc: "Study on both Saturday and Sunday", tier: "common" },
  { name: "On Fire", desc: "Complete a 7-day study streak", tier: "rare" },
  { name: "Deep Worker", desc: "Complete a single 4-hour Locked In session", tier: "rare" },
  { name: "Gate Keeper", desc: "Pass 25 break gates", tier: "rare" },
  { name: "No Excuses", desc: "10 sessions with zero emergency unblocks used", tier: "rare" },
  { name: "Unstoppable", desc: "Complete a 30-day study streak", tier: "epic" },
  { name: "Distraction Slayer", desc: "Block 1,000 distraction attempts", tier: "epic" },
  { name: "Iron Focus", desc: "Top your group leaderboard for 4 straight weeks", tier: "epic" },
  { name: "Century Club", desc: "100 total hours focused", tier: "epic" },
  { name: "Untouchable", desc: "90 day streak with zero broken sessions", tier: "mythic" },
  { name: "The Regulator", desc: "500 hours focused all time", tier: "mythic" },
];

const TOTAL_CARDS = SHOWCASE.length + 1 + 2; // + the big Legendary card + 2 locked teasers
const CENTER = (TOTAL_CARDS - 1) / 2;

const trackVariants: Variants = { hidden: {}, visible: {} };

const cardItemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (distance: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: distance * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};

function glow(hex: string, alpha = 0.22) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `0 14px 34px rgba(0,0,0,0.55), 0 0 42px rgba(${r},${g},${b},${alpha})`;
}

/** Wraps a track child so the "wave from center" reveal can animate it independent of its own flex sizing. */
function CardSlot({ index, flexBasis, children }: { index: number; flexBasis: number; children: React.ReactNode }) {
  return (
    <motion.div custom={Math.abs(index - CENTER)} variants={cardItemVariants} style={{ flex: `0 0 ${flexBasis}px` }}>
      {children}
    </motion.div>
  );
}

export default function Badges() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // auto-scrolling carousel: ping-pongs across the track, pausing on hover.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;

    const controls = animate(0, maxScroll, {
      duration: Math.max(8, maxScroll / 45),
      ease: "linear",
      repeat: Infinity,
      repeatType: "reverse",
      repeatDelay: 0.6,
      onUpdate: (v) => {
        el.scrollLeft = v;
      },
    });

    const pause = () => controls.pause();
    const resume = () => controls.play();
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);

    return () => {
      controls.stop();
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
    };
  }, []);

  return (
    <section
      id="badges"
      className="fg-sec"
      style={{
        background: "radial-gradient(ellipse 1000px 500px at 50% 0%, rgba(255,255,255,0.04), transparent 60%), #060606",
        padding: "150px 0 60px",
      }}
    >
      <RevealItem standalone style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ color: "#8a8d94", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 22 }}>
          Achievements
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
            maxWidth: "16ch",
          }}
        >
          Every session earns you something.
        </h2>
        <p style={{ color: "#9a9da4", fontSize: 18, lineHeight: 1.7, maxWidth: "54ch", marginTop: 22 }}>
          Five tiers, sixteen badges. Collect proof your focus is real — show it off to your study group.
        </p>
      </RevealItem>

      <div ref={scrollerRef} className="fg-scroll" style={{ marginTop: 56, overflowX: "auto", padding: "34px 32px 44px" }}>
        <motion.div
          className="fg-badge-track"
          variants={trackVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          style={{ display: "flex", gap: 22, width: "max-content", alignItems: "stretch" }}
        >
          {SHOWCASE.map((b, i) => (
            <CardSlot key={b.name} index={i} flexBasis={224}>
              <BadgeCard tier={b.tier} title={b.name} desc={b.desc} />
            </CardSlot>
          ))}

          <CardSlot index={SHOWCASE.length} flexBasis={330}>
            <TiltCard
              style={{
                background: "linear-gradient(180deg, #0d0b06, #0A0A0A)",
                border: "2px solid #F59E0B",
                borderRadius: 20,
                padding: "48px 30px 42px",
                minHeight: 260,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                overflow: "hidden",
                animation: "fg-legend-border 4s ease-in-out infinite",
              }}
            >
              <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
                <div
                  style={{
                    position: "absolute",
                    top: "-50%",
                    left: "-60%",
                    width: "50%",
                    height: "220%",
                    background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.22), transparent)",
                    animation: "fg-shimmer-sweep 3.2s linear infinite",
                  }}
                />
              </div>
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <span style={{ position: "absolute", left: "14%", top: "20%", width: 3, height: 3, borderRadius: "50%", background: "#F59E0B", boxShadow: "0 0 6px #F59E0B", animation: "fg-gold-particle 5s ease-in-out infinite" }} />
                <span style={{ position: "absolute", left: "82%", top: "30%", width: 3, height: 3, borderRadius: "50%", background: "#FCD34D", boxShadow: "0 0 6px #FCD34D", animation: "fg-gold-particle 6s ease-in-out 1s infinite" }} />
                <span style={{ position: "absolute", left: "24%", top: "72%", width: 2, height: 2, borderRadius: "50%", background: "#F59E0B", boxShadow: "0 0 6px #F59E0B", animation: "fg-gold-particle 7s ease-in-out 0.5s infinite" }} />
                <span style={{ position: "absolute", left: "74%", top: "80%", width: 3, height: 3, borderRadius: "50%", background: "#FCD34D", boxShadow: "0 0 6px #FCD34D", animation: "fg-gold-particle 5.5s ease-in-out 2s infinite" }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.5)", borderRadius: 999, padding: "4px 12px", marginBottom: 20 }}>
                LEGENDARY
              </span>
              <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="112" height="112" viewBox="0 0 48 48" fill="none" style={{ animation: "fg-gem-rotate 14s linear infinite" }}>
                  <defs>
                    <linearGradient id="fg-gem" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#F59E0B" />
                      <stop offset="0.5" stopColor="#ffffff" />
                      <stop offset="1" stopColor="#0EA5E9" />
                    </linearGradient>
                  </defs>
                  <path d="M14 12h20l6 8-16 20L8 20z" fill="url(#fg-gem)" opacity="0.92" />
                  <path d="M14 12l4 8h12l4-8M8 20h32M18 20l6 20 6-20" stroke="#000" strokeWidth="0.9" fill="none" opacity="0.35" />
                </svg>
              </div>
              <div style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "0.04em", color: "#F59E0B", marginTop: 14, textShadow: "0 0 18px rgba(245,158,11,0.45)" }}>
                FOCUSGATE LEGEND
              </div>
              <div style={{ color: "#cbd0d8", fontSize: 13, marginTop: 12, lineHeight: 1.5, maxWidth: "26ch" }}>
                Use FocusGate every single day for 365 days
              </div>
              <div style={{ color: "#7a7d84", fontSize: 12, fontStyle: "italic", marginTop: 10 }}>Only 1% of users ever unlock this.</div>
            </TiltCard>
          </CardSlot>

          <CardSlot index={SHOWCASE.length + 1} flexBasis={224}>
            <LockedBadge />
          </CardSlot>
          <CardSlot index={SHOWCASE.length + 2} flexBasis={224}>
            <LockedBadge />
          </CardSlot>
        </motion.div>
      </div>
      <p style={{ maxWidth: 1240, margin: "8px auto 0", padding: "0 32px", color: "#7a7d84", fontSize: 14 }}>
        Badges unlock automatically as you build your focus habit.
      </p>
    </section>
  );
}

function BadgeCard({ tier, title, desc }: { tier: BadgeTier; title: string; desc: string }) {
  const meta = TIER_META[tier];
  const icon = getBadgeIcon(title);
  const isRarer = tier === "epic" || tier === "mythic";

  return (
    <TiltCard
      className="fg-badge"
      style={{
        width: "100%",
        height: "100%",
        background: `radial-gradient(circle at 50% 22%, ${meta.glowSoft}, #0A0A0A 68%)`,
        border: `1px solid ${meta.glow}99`,
        borderRadius: 16,
        padding: "36px 22px",
        minHeight: 260,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        boxShadow: glow(meta.glow, tier === "mythic" ? 0.3 : 0.22),
      }}
    >
      {tier !== "common" && (
        <div style={{ position: "relative", height: 20, alignSelf: "flex-end" }}>
          <span
            style={{
              position: "absolute",
              top: -8,
              right: 0,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: meta.glow,
              border: `1px solid ${meta.glow}88`,
              borderRadius: 999,
              padding: "2px 8px",
            }}
          >
            {meta.label.toUpperCase()}
          </span>
        </div>
      )}
      <div
        style={{
          height: 88,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: `drop-shadow(0 0 ${isRarer ? 16 : 12}px ${icon.color}aa)`,
          transform: isRarer ? "scale(1.15)" : undefined,
        }}
      >
        {icon.svg}
      </div>
      <div style={{ fontWeight: 700, fontSize: 16, marginTop: 6 }}>{title}</div>
      <div style={{ color: "#7a7d84", fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>{desc}</div>
    </TiltCard>
  );
}

function LockedBadge() {
  return (
    <TiltCard
      style={{
        width: "100%",
        height: "100%",
        background: "#0A0A0A",
        border: "1px solid #1E293B",
        borderRadius: 16,
        padding: "36px 22px",
        minHeight: 260,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        opacity: 0.55,
      }}
    >
      <div style={{ height: 88, display: "flex", alignItems: "center", justifyContent: "center", filter: "blur(7px)" }}>
        <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
          <rect x="11" y="21" width="26" height="19" rx="3" fill="#334155" />
          <path d="M16 21v-4a8 8 0 0 1 16 0v4" stroke="#334155" strokeWidth="3.4" fill="none" />
        </svg>
      </div>
      <div style={{ fontWeight: 700, fontSize: 16, marginTop: 6, color: "#475569" }}>???</div>
      <div style={{ color: "#334155", fontSize: 12, marginTop: 8 }}>Keep focusing to reveal</div>
    </TiltCard>
  );
}
