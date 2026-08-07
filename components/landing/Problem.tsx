"use client";

import { useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { useMotionCountUp } from "@/hooks/useMotionCountUp";
import MotionWord, { wordContainerVariants } from "@/components/MotionWord";

const LINE_1 = "Social media is";
const LINE_2 = "rotting your brain.";

const STATS = [
  { target: 30, suffix: " years", label: "Average screen time over a lifetime" },
  { target: 144, suffix: " times", label: "How often the average person checks their phone per day" },
  { target: 47, suffix: " seconds", label: "Average attention span, down from 2.5 minutes in 2004" },
];

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
};

function StatCard({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useMotionCountUp(ref, { target, suffix });

  return (
    <div
      className="fg-statcard"
      style={{
        background: "#101012",
        borderTop: "2px solid #F59E0B",
        borderRadius: "0 0 12px 12px",
        padding: "20px 10px",
        flex: "1 1 0",
        minWidth: 0, // flex items default to min-width:auto, which would keep this card
        // from shrinking below its label text's width and push the row past the viewport
      }}
    >
      <div
        ref={ref}
        className="fg-statcard-num"
        style={{
          fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
          fontWeight: 800,
          fontSize: 26,
          color: "#fff",
          fontVariantNumeric: "tabular-nums",
        }}
      />
      <div style={{ color: "#7a7d84", fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>{label}</div>
    </div>
  );
}

export default function Problem() {
  return (
    <section className="fg-sec" style={{ background: "#060606", color: "#fff", padding: "150px 32px", position: "relative", overflow: "hidden" }}>
      <motion.div
        className="fg-split"
        style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 56, alignItems: "start", position: "relative" }}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div variants={itemVariants} style={{ position: "relative", zIndex: 2 }}>
          <div style={{ color: "#8a8d94", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 26 }}>
            The Reality
          </div>
          <h2
            className="fg-h2"
            style={{
              fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
              fontWeight: 700,
              fontSize: 76,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              color: "#fff",
            }}
          >
            You waste 3 hours a day
            <br />
            to distraction.
          </h2>
          <p style={{ color: "#9a9da4", fontSize: 18, lineHeight: 1.7, maxWidth: "54ch", marginTop: 30, textWrap: "pretty" }}>
            Your phone is designed by billion dollar companies to keep you scrolling. Every notification, every
            autoplay, every infinite feed. FocusGate fights back.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 40 }}>
            {["3hrs lost daily", "45 days per year", "1 app to fix it"].map((t) => (
              <span
                key={t}
                style={{
                  border: "1px solid rgba(255,255,255,0.2)",
                  padding: "11px 20px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div
            className="fg-science-card"
            style={{
              background: "linear-gradient(180deg, #101012, #0A0A0A)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              padding: "44px 36px",
              boxShadow: "0 40px 90px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ color: "#F59E0B", fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 20 }}>
              The Science
            </div>
            <motion.h3
              variants={wordContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              style={{ margin: 0 }}
            >
              <span
                style={{
                  display: "block",
                  fontFamily: "'Instrument Serif', serif",
                  fontWeight: 400,
                  fontSize: 40,
                  lineHeight: 1.15,
                  color: "#fff",
                }}
              >
                {LINE_1.split(" ").map((w, i) => (
                  <MotionWord key={`p1-${i}`} text={w} style={{ color: "#fff" }} />
                ))}
              </span>
              <span
                style={{
                  display: "block",
                  fontFamily: "'Instrument Serif', serif",
                  fontWeight: 400,
                  fontSize: 40,
                  lineHeight: 1.15,
                  color: "#fff",
                }}
              >
                {LINE_2.split(" ").map((w, i) => (
                  <MotionWord key={`p2-${i}`} text={w} style={{ color: "#fff" }} />
                ))}
              </span>
            </motion.h3>
            <p style={{ color: "#9a9da4", fontSize: 15, lineHeight: 1.7, marginTop: 22 }}>
              Every scroll triggers a dopamine hit. Your brain gets rewired to crave distraction over deep work.
              Attention spans are shrinking. Focus is becoming rare. And the apps are designed to make it worse.
            </p>
            <div className="fg-statcard-row" style={{ display: "flex", gap: 10, marginTop: 30 }}>
              {STATS.map((s) => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>
            <div style={{ color: "#F59E0B", fontSize: 16, fontWeight: 700, marginTop: 26 }}>
              FocusGate rewires it back.
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
