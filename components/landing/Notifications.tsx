"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";

const CARDS = [
  {
    initial: "J",
    initialBg: "#1a1a1a",
    text: "James just started a 2hr Locked In session 🔒",
    footer: <span style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 999, padding: "4px 12px", fontSize: 13 }}>🔥</span>,
    time: "2 min ago",
    rotate: -3,
    restY: 0,
  },
  {
    initial: "S",
    initialBg: "#22c55e",
    text: "Sarah is 45 minutes into her session 💪",
    footer: null,
    time: "now",
    rotate: 0,
    restY: -14,
  },
  {
    initial: "J",
    initialBg: "#1a1a1a",
    text: "James just completed 2 hours. 🎉",
    footer: <span style={{ color: "#9a9da4", fontSize: 12 }}>12 friends reacted 🔥</span>,
    time: "2 hrs ago",
    rotate: 3,
    restY: 0,
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2 } },
};

// each card bounces up to its own resting Y offset (used for the staggered card layout).
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 60, scale: 0.8 },
  visible: (restY: number) => ({
    opacity: 1,
    y: restY,
    scale: 1,
    transition: { duration: 0.7, ease: "backOut" },
  }),
};

export default function Notifications() {
  return (
    <section className="fg-sec" style={{ background: "#060606", color: "#fff", padding: "150px 32px", textAlign: "center" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ color: "#8a8d94", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 22 }}>
          Accountability
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
          Your friends know when you quit.
        </h2>
        <p style={{ color: "#9a9da4", fontSize: 18, lineHeight: 1.7, maxWidth: "60ch", margin: "26px auto 0", textWrap: "pretty" }}>
          Start a Locked In session and FocusGate notifies your study group instantly. They see when you start. They
          see when you finish. They&apos;ll know if you cheat.
        </p>
      </div>
      <AnimatePresence>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          style={{ maxWidth: 980, margin: "64px auto 0", display: "flex", justifyContent: "center", gap: 22, flexWrap: "wrap" }}
        >
          {CARDS.map((c, i) => (
            <motion.div
              key={i}
              custom={c.restY}
              variants={cardVariants}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                background: "#101012",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 18,
                padding: "20px 22px",
                width: 300,
                textAlign: "left",
                boxShadow: "0 20px 50px rgba(0,0,0,0.09)",
                rotate: c.rotate,
                zIndex: c.restY !== 0 ? 2 : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: c.initialBg,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {c.initial}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>{c.text}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: c.footer ? "space-between" : "flex-end", marginTop: 14 }}>
                {c.footer}
                <span style={{ color: "#999", fontSize: 12 }}>{c.time}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
