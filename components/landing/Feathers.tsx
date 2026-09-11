"use client";

import { RevealItem } from "@/components/motion/Reveal";
import TwoRowFeatherShowcase, { type ShowcaseFeather } from "@/components/feathers/TwoRowFeatherShowcase";
import GoldenQuillCard from "@/components/app/feathers/GoldenQuillCard";
import { RaveSplit } from "./RaveSplit";

// Mirrors the real catalog seeded in supabase/schema.sql — kept as static copy here (not
// fetched) since this is marketing content, same as the rest of the landing page. The
// Golden Quill gets its own dramatic centerpiece below instead of sitting in either row.
//
// All landing-page feathers render locked (unlocked: false below) — real names/conditions
// are withheld ("???" / "Download to find out") so the achievement list stays a surprise
// you only see by actually using the app. FeatherCard/GoldenQuillCard already have this
// exact grayed-out "???" treatment built in for the real in-app locked state; we're just
// forcing it on here rather than building a second locked look.
const SHOWCASE: ShowcaseFeather[] = [
  { id: "first-lock", name: "First Lock", description: "Complete your first RavenLock session", rarity: "common", tier: "common", unlock_condition: "Download to find out", unlocked: false },
  { id: "early-riser", name: "Early Riser", description: "Start a session before 8am", rarity: "common", tier: "common", unlock_condition: "Download to find out", unlocked: false },
  { id: "clean-slate", name: "Clean Slate", description: "Finish a session with zero break gates used", rarity: "common", tier: "common", unlock_condition: "Download to find out", unlocked: false },
  { id: "weekend-warrior", name: "Weekend Warrior", description: "Study on both Saturday and Sunday", rarity: "common", tier: "common", unlock_condition: "Download to find out", unlocked: false },
  { id: "on-fire", name: "On Fire", description: "Complete a 7-day study streak", rarity: "rare", tier: "rare", unlock_condition: "Download to find out", unlocked: false },
  { id: "deep-worker", name: "Deep Worker", description: "Complete a single 4-hour RavenLock session", rarity: "rare", tier: "rare", unlock_condition: "Download to find out", unlocked: false },
  { id: "gate-keeper", name: "Gate Keeper", description: "Pass 25 break gates", rarity: "rare", tier: "rare", unlock_condition: "Download to find out", unlocked: false },
  { id: "no-excuses", name: "No Excuses", description: "10 sessions with zero emergency unblocks used", rarity: "rare", tier: "rare", unlock_condition: "Download to find out", unlocked: false },
  { id: "unstoppable", name: "Unstoppable", description: "Complete a 30-day study streak", rarity: "epic", tier: "epic", unlock_condition: "Download to find out", unlocked: false },
  { id: "distraction-slayer", name: "Distraction Slayer", description: "Block 1,000 distraction attempts", rarity: "epic", tier: "epic", unlock_condition: "Download to find out", unlocked: false },
  { id: "iron-focus", name: "Iron Focus", description: "Top your group leaderboard for 4 straight weeks", rarity: "epic", tier: "epic", unlock_condition: "Download to find out", unlocked: false },
  { id: "century-club", name: "Century Club", description: "100 total hours focused", rarity: "epic", tier: "epic", unlock_condition: "Download to find out", unlocked: false },
  { id: "untouchable", name: "Untouchable", description: "90 day streak with zero broken sessions", rarity: "mythic", tier: "mythic", unlock_condition: "Download to find out", unlocked: false },
  { id: "the-regulator", name: "The Regulator", description: "500 hours focused all time", rarity: "mythic", tier: "mythic", unlock_condition: "Download to find out", unlocked: false },
];

const GOLDEN_QUILL = {
  id: "golden-quill",
  name: "The Golden Quill",
  description: "Earned by using Raven every single day for 365 days.",
  rarity: "legendary",
  unlock_condition: "Download to find out",
};

export default function Feathers() {
  return (
    <section
      id="feathers"
      className="fg-sec"
      style={{
        background: "radial-gradient(ellipse 1000px 500px at 50% 0%, rgba(255,255,255,0.04), transparent 60%), #060606",
        padding: "150px 0 60px",
      }}
    >
      <div style={{ padding: "0 32px" }}>
        <RaveSplit image="/rave/rave-feathers.png" imageAlt="Rave holding up a golden feather" side="left" glow="rgba(245,158,11,0.16)">
          <div style={{ color: "#8a8d94", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 22 }}>
            Achievements
          </div>
          <h2
            className="fg-h2"
            style={{
              fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
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
            Five tiers, fourteen feathers, one quill. Collect proof your focus is real — show it off to your study group.
          </p>
        </RaveSplit>
      </div>

      <div style={{ marginTop: 56, padding: "10px 32px 10px" }}>
        <TwoRowFeatherShowcase items={SHOWCASE} />
      </div>

      <RevealItem standalone style={{ maxWidth: 460, margin: "48px auto 0", padding: "0 32px" }}>
        <GoldenQuillCard feather={GOLDEN_QUILL} unlocked={false} unlockedAt={undefined} onClick={() => {}} />
      </RevealItem>

      <p style={{ maxWidth: 1240, margin: "28px auto 0", padding: "0 32px", color: "#7a7d84", fontSize: 14 }}>
        Feathers unlock automatically as you build your focus habit.
      </p>
    </section>
  );
}
