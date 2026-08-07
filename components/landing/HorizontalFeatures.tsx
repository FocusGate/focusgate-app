"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, ensureGsapPlugins } from "@/lib/gsap";
import TiltCard from "@/components/TiltCard";

const CARDS = [
  {
    title: "Locked In Mode",
    desc: "Once you start a session, there's no exit button. No pausing, no early quitting — just the timer and the work.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <path d="M5 21V11a7 7 0 0 1 14 0v10" stroke="#F59E0B" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <line x1="3.6" y1="21" x2="20.4" y2="21" stroke="#F59E0B" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="12" cy="12.4" r="1.5" fill="#F59E0B" />
        <path d="M12 13.6V16.6" stroke="#F59E0B" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Friend Notifications",
    desc: "Your study group sees when you start a session, when you finish it, and if you never show up at all.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6z" stroke="#F59E0B" strokeWidth="1.7" fill="none" strokeLinejoin="round" />
        <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="#F59E0B" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Focus Badges",
    desc: "Collect achievements for real focus habits — first sessions, streaks, deep-work marathons, and more.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="9" r="6" stroke="#F59E0B" strokeWidth="1.7" fill="none" />
        <path d="M8.5 14.5L7 21l5-2.5 5 2.5-1.5-6.5" stroke="#F59E0B" strokeWidth="1.7" fill="none" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "AI Insights",
    desc: "Weekly reports that show when you focus best, where you get distracted, and how to build a stronger habit.",
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <path d="M12 3l1.8 4.6L18 9.2l-4.2 1.6L12 15l-1.8-4.2L6 9.2l4.2-1.6L12 3z" stroke="#F59E0B" strokeWidth="1.7" fill="none" strokeLinejoin="round" />
        <path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" stroke="#F59E0B" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function HorizontalFeatures() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    ensureGsapPlugins();
    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    if (!wrapper || !track) return;

    const ctx = gsap.context(() => {
      const getScrollAmount = () => Math.max(0, track.scrollWidth - wrapper.offsetWidth);

      const trigger = ScrollTrigger.create({
        trigger: wrapper,
        start: "top top",
        end: () => `+=${getScrollAmount()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        animation: gsap.to(track, { x: () => -getScrollAmount(), ease: "none" }),
      });

      return () => trigger.kill();
    }, wrapper);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={wrapperRef} style={{ position: "relative", overflow: "hidden", background: "#060606", height: "100vh" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ padding: "0 32px", marginBottom: 48 }}>
          <div style={{ color: "#8a8d94", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 18 }}>
            Everything you need
          </div>
          <h2
            className="fg-h2"
            style={{
              fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
              fontWeight: 700,
              fontSize: 48,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#fff",
              maxWidth: "20ch",
            }}
          >
            One app, built to make you actually finish.
          </h2>
        </div>

        <div ref={trackRef} style={{ display: "flex", gap: 24, width: "max-content", padding: "0 32px" }}>
          {CARDS.map((card) => (
            <TiltCard
              key={card.title}
              style={{
                flex: "0 0 min(78vw, 420px)",
                background: "#0A0A0A",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                padding: "40px 34px",
                display: "flex",
                flexDirection: "column",
                gap: 22,
                minHeight: 300,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "rgba(245,158,11,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {card.icon}
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>{card.title}</h3>
              <p style={{ color: "#9a9da4", fontSize: 16, lineHeight: 1.6, margin: 0 }}>{card.desc}</p>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
