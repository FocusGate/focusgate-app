"use client";

import { motion, type Variants } from "framer-motion";

/** Wrap a run of <MotionWord> siblings in this to drive the stagger. */
export const wordContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

/** A single word that fades + slides up into place, driven by an ancestor's variants + stagger. */
export default function MotionWord({ text, style }: { text: string; style?: React.CSSProperties }) {
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", marginRight: "0.25em" }}>
      <motion.span variants={wordVariants} style={{ display: "inline-block", ...style }}>
        {text}
      </motion.span>
    </span>
  );
}
