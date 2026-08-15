"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { getEntryPath } from "@/lib/returningUser";
import { CHROME_WEBSTORE_URL } from "./Navbar";
import Marquee from "./Marquee";
import MotionWord, { wordContainerVariants } from "@/components/MotionWord";
import MagneticButton from "@/components/MagneticButton";

const DOTS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  left: (i * 61) % 100,
  top: ((i * 37 + 13) % 90) + 3,
  size: 2 + (i % 3),
  delay: i % 5,
  dur: 8 + (i % 6),
}));

// subtle mid-depth blurred orbs — the "middle decorative" parallax layer
const ORBS = [
  { left: "12%", top: "18%", size: 260, color: "rgba(176,141,87,0.14)" },
  { left: "82%", top: "12%", size: 320, color: "rgba(255,255,255,0.06)" },
  { left: "70%", top: "62%", size: 220, color: "rgba(245,158,11,0.1)" },
];

const LINE_1 = "You said you'd study. ";
const LINE_2 = "Now prove it.";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const router = useRouter();

  // parallax depth layers: background dots at 0.1x, mid orbs at 0.3x, foreground text stays put.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const dotsY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const orbsY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "120px 24px 0",
        overflow: "hidden",
        fontFamily: "'Mulish', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
        background:
          "radial-gradient(ellipse 900px 600px at 50% 34%, rgba(255,255,255,0.045), transparent 70%), #060606",
      }}
    >
      {/* mid-depth parallax layer (0.3x) */}
      <motion.div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", y: orbsY }}>
        {ORBS.map((o, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: o.left,
              top: o.top,
              width: o.size,
              height: o.size,
              borderRadius: "50%",
              background: o.color,
              filter: "blur(60px)",
            }}
          />
        ))}
      </motion.div>

      {/* background parallax layer (0.1x) */}
      <motion.div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", y: dotsY }}>
        {DOTS.map((d) => (
          <div
            key={d.id}
            style={{
              position: "absolute",
              left: `${d.left}%`,
              top: `${d.top}%`,
              width: d.size,
              height: d.size,
              borderRadius: "50%",
              background: "#d8d8dc",
              boxShadow: "0 0 8px rgba(216,216,220,0.7)",
              animation: `fg-float ${d.dur}s ease-in-out ${d.delay}s infinite`,
              opacity: 0.25,
            }}
          />
        ))}
      </motion.div>

      {/* foreground — fixed, no parallax */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.05)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "#d8d8dc",
          }}
        >
          🔒 BETA — FREE FOR FIRST MONTH
        </div>

        <motion.h1
          className="fg-h1"
          variants={wordContainerVariants}
          initial="hidden"
          animate="visible"
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontWeight: 400,
            fontSize: 108,
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
            maxWidth: "15ch",
            textWrap: "balance",
          }}
        >
          {LINE_1.split(" ").map((w, i) => (
            <MotionWord
              key={`l1-${i}`}
              text={w}
              style={{
                fontStyle: "italic",
                background: "linear-gradient(180deg, #ffffff 0%, #9a9aa0 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            />
          ))}
          <br />
          {LINE_2.split(" ").map((w, i) => (
            <MotionWord key={`l2-${i}`} text={w} style={{ fontStyle: "italic", color: "#b08d57" }} />
          ))}
        </motion.h1>

        <p style={{ color: "#9a9da4", fontSize: 19, lineHeight: 1.6, maxWidth: "62ch", textWrap: "pretty" }}>
          The only blocker that makes quitting harder than finishing. Free Chrome extension. Locked in, in 60 seconds.
        </p>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
          <MagneticButton>
            <a
              href={CHROME_WEBSTORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "linear-gradient(180deg, #d4af7a, #b08d57)",
                color: "#0a0a0a",
                border: "none",
                padding: "16px 32px",
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 800,
                cursor: "pointer",
                textDecoration: "none",
                boxShadow: "0 0 30px rgba(176,141,87,0.4)",
              }}
            >
              🧩 Add to Chrome — Free
            </a>
          </MagneticButton>
          <MagneticButton>
            <button
              type="button"
              onClick={() => router.push(getEntryPath())}
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.25)",
                padding: "16px 30px",
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Get Early Access →
            </button>
          </MagneticButton>
        </div>
      </div>

      <Marquee />
    </section>
  );
}
