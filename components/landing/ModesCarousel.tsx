"use client";

import { RevealItem } from "@/components/motion/Reveal";
import CircularCarousel, { type CarouselItem } from "@/components/ui/circular-carousel";

// Mirrors lib/sessionModes.ts's SESSION_MODES exactly — this is marketing copy for real,
// shipped behavior, not aspirational feature-teasing. If a mode's rules change, update
// them there first and bring this in line, not the other way around.
const MODES: CarouselItem[] = [
  {
    id: "pomodoro",
    title: "Pomodoro Sprints",
    description: "25 min focus, 5 min break, repeat — automatically. No requesting breaks, no Break Gate between cycles, just The Lounge each time one's earned.",
    tag: "New",
  },
  {
    id: "exam-cram",
    title: "Exam Cram",
    description: "A 2-4 hour stretch with Break Gates locked to Hard and emergency unblocks priced double — higher stakes for higher pressure. Ends with a full Cram Report.",
    tag: "Popular",
  },
  {
    id: "group-study",
    title: "Group Study",
    description: "Pick a friend group and lock in together — live presence dots, and Dead Man's Switch tells the group the moment anyone breaks early. No turning that off.",
  },
  {
    id: "all-nighter",
    title: "All Nighter",
    description: "For 4-hour-plus sessions — mandatory, non-skippable Lounge checkpoints every 90 minutes with hydration and stretch reminders built in.",
  },
  {
    id: "deep-focus",
    title: "Deep Focus",
    description: "The strictest mode: a fixed 90 minutes, zero Break Gates offered at all. Only Emergency Unblock gets you out — and that still ends the session.",
    tag: "Most intense",
  },
];

export default function ModesCarousel() {
  return (
    <section className="fg-sec" style={{ background: "#060606", color: "#fff", padding: "140px 32px", textAlign: "center" }}>
      <RevealItem standalone style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ color: "#8a8d94", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 22 }}>
          Session modes
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
          Built for every kind of study session.
        </h2>
        <p style={{ color: "#9a9da4", fontSize: 18, lineHeight: 1.7, maxWidth: "60ch", margin: "26px auto 0", textWrap: "pretty" }}>
          Pick the mode that matches what you&apos;re actually up against — Locked In Mode adapts underneath it.
        </p>
      </RevealItem>

      <RevealItem standalone amount={0.1} style={{ maxWidth: 1080, margin: "56px auto 0" }}>
        <CircularCarousel items={MODES} />
      </RevealItem>
    </section>
  );
}
