"use client";

import { motion } from "framer-motion";

/** A row of tomatoes filling in as Pomodoro cycles complete — the spec's "progress shown
 *  as a row of tomato icons," nothing fancier than that. */
export default function PomodoroProgress({ cycles, completed }: { cycles: number; completed: number }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {Array.from({ length: cycles }, (_, i) => (
        <motion.span
          key={i}
          initial={false}
          animate={{ scale: i < completed ? [1, 1.3, 1] : 1, opacity: i < completed ? 1 : 0.25 }}
          transition={{ duration: 0.4 }}
          style={{ fontSize: 22, filter: i < completed ? "none" : "grayscale(1)" }}
        >
          🍅
        </motion.span>
      ))}
    </div>
  );
}
