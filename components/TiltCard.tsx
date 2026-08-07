"use client";

import { motion, type Variants } from "framer-motion";

const cardVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.04 },
};

const glowVariants: Variants = {
  rest: { opacity: 0 },
  hover: { opacity: 1 },
};

/** Card hover: scale up + a gold glow ring fades in. */
export default function TiltCard({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      style={{ ...style, position: "relative" }}
      initial="rest"
      whileHover="hover"
      variants={cardVariants}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
      <motion.div
        variants={glowVariants}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          pointerEvents: "none",
          boxShadow: "0 0 40px 6px rgba(245,158,11,0.35)",
        }}
        aria-hidden="true"
      />
    </motion.div>
  );
}
