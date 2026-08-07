"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const INTERACTIVE_SELECTOR = "a, button, input, textarea, [role='button'], .fg-badge, .fg-cursor-hover";

export default function CustomCursor() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const springX = useSpring(x, { stiffness: 700, damping: 40, mass: 0.3 });
  const springY = useSpring(y, { stiffness: 700, damping: 40, mass: 0.3 });
  const springScale = useSpring(scale, { stiffness: 500, damping: 30 });

  useEffect(() => {
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    document.body.classList.add("fg-has-cursor");

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const onOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) scale.set(2);
    };
    const onOut = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) scale.set(1);
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    return () => {
      document.body.classList.remove("fg-has-cursor");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, [x, y, scale]);

  return <motion.div className="fg-cursor" style={{ x: springX, y: springY, scale: springScale }} aria-hidden="true" />;
}
