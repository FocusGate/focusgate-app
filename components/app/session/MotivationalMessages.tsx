"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MESSAGES = ["You started this. Finish it.", "Your future self is watching.", "Stay locked in.", "Every minute counts."];

/** Rotates through the exact given phrases on a simple 60s round-robin — wraps around
 *  FlipClock (which owns its own shake button and completion flash), not inside it. */
export default function MotivationalMessages() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ color: "#9a9da4", fontSize: 14, fontWeight: 600, letterSpacing: "0.02em", margin: 0 }}
        >
          {MESSAGES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
