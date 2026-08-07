"use client";

import { motion, useScroll } from "framer-motion";

/** Thin gold line above the navbar that fills left-to-right as the user scrolls the page. */
export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 10000,
        background: "transparent",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <motion.div
        style={{
          height: "100%",
          width: "100%",
          background: "linear-gradient(90deg, #b08d57, #F59E0B)",
          boxShadow: "0 0 8px rgba(245,158,11,0.6)",
          transformOrigin: "left center",
          scaleX: scrollYProgress,
        }}
      />
    </div>
  );
}
