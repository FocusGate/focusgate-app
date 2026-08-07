"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const MAX_DIST = 80;
const MAX_MOVE = 15;

/** Wraps a CTA so it drifts toward the cursor within 80px, then springs back when it leaves. */
export default function MagneticButton({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 320, damping: 14, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 320, damping: 14, mass: 0.6 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < MAX_DIST) {
        const strength = (1 - dist / MAX_DIST) * MAX_MOVE;
        x.set(dist === 0 ? 0 : (dx / dist) * strength);
        y.set(dist === 0 ? 0 : (dy / dist) * strength);
      } else {
        x.set(0);
        y.set(0);
      }
    }

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [x, y]);

  return (
    <motion.div ref={ref} className={className} style={{ ...style, x: springX, y: springY, display: "inline-block" }}>
      {children}
    </motion.div>
  );
}
