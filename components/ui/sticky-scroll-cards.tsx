"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Adapted from a "images-scrolling-animation" sticky-stack pattern — generalized to render
 * arbitrary card content (not just images) and stripped of its own `<ReactLenis root>`:
 * this app already drives one global Lenis instance from `components/SmoothScroll.tsx`,
 * and nesting a second root instance would fight the first for control of the scroll.
 *
 * Each card is a later DOM sibling, so it still paints over the previous one once both are
 * stuck at the same sticky slot — but now every card's own scroll progress (tracked via
 * useScroll against its own wrapper) drives an entrance fade/slide-up as it arrives, and a
 * gentle scale-down + fade as the *next* card scrolls in to take its place, instead of an
 * instant hard cut where one card just blocks out the one underneath.
 */
export type StickyStackItem = {
  key: string;
  content: React.ReactNode;
};

function StickyStackCard({
  content,
  topOffsetClass,
  isLast,
}: {
  content: React.ReactNode;
  topOffsetClass: string;
  isLast: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: wrapperRef, offset: ["start end", "end start"] });

  // Entrance (0 -> 0.25): fades + slides up into place. Held (0.25 -> 0.7): fully visible
  // while stuck. Handoff (0.7 -> 1): eases back and fades a touch as the next card arrives
  // on top of it -- skipped for the last card, which has nothing scrolling in over it.
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.7, 1], [0, 1, 1, isLast ? 1 : 0.35]);
  const scale = useTransform(scrollYProgress, [0, 0.25, 0.7, 1], [0.94, 1, 1, isLast ? 1 : 0.92]);
  const y = useTransform(scrollYProgress, [0, 0.25], [36, 0]);

  return (
    <div ref={wrapperRef} className={cn("sticky flex h-[70vh] items-center justify-center px-4", topOffsetClass)}>
      <motion.div style={{ top: "-5vh", opacity, scale, y }} className="relative w-full max-w-xl">
        {content}
      </motion.div>
    </div>
  );
}

export function StickyScrollStack({
  items,
  className,
  topOffsetClass = "top-24",
}: {
  items: StickyStackItem[];
  className?: string;
  /** Tailwind `top-*` class for the sticky offset — clear a floating navbar (landing page's
   *  default `top-24`) or sit closer to the top when there isn't one (e.g. inside AppShell). */
  topOffsetClass?: string;
}) {
  const container = useRef<HTMLDivElement>(null);

  // pb here is scroll runway for the last card's sticky pin to release, not visual
  // whitespace on its own — but the source pattern's pb-[30vh] left a noticeably bigger gap
  // before whatever section follows than this page's fixed-pixel section paddings (150px
  // top / 60-80px bottom elsewhere) ever produce, reading as an unintentional dead zone
  // rather than a deliberate beat. 8vh is enough runway for the release to still feel
  // smooth without the leftover gap.
  return (
    <div ref={container} className={cn("relative flex w-full flex-col items-center justify-center pb-[8vh] pt-[2vh]", className)}>
      {items.map((item, i) => (
        <StickyStackCard key={item.key} content={item.content} topOffsetClass={topOffsetClass} isLast={i === items.length - 1} />
      ))}
    </div>
  );
}
