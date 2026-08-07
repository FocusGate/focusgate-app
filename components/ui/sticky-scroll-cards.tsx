"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Adapted from a "images-scrolling-animation" sticky-stack pattern — generalized to render
 * arbitrary card content (not just images) and stripped of its own `<ReactLenis root>`:
 * this app already drives one global Lenis instance from `components/SmoothScroll.tsx`,
 * and nesting a second root instance would fight the first for control of the scroll.
 *
 * Every card renders at the same size and the same position (no per-card scale-down, no
 * growing per-index offset) — each later card is a later DOM sibling, so it paints fully
 * over the previous one as it scrolls into its sticky slot, with nothing peeking out from
 * underneath.
 */
export type StickyStackItem = {
  key: string;
  content: React.ReactNode;
};

function StickyStackCard({ content, topOffsetClass }: { content: React.ReactNode; topOffsetClass: string }) {
  return (
    <div
      className={cn("sticky flex h-[70vh] items-center justify-center px-4", topOffsetClass)}
      style={{ background: "var(--fg-bg)" }}
    >
      <div style={{ top: "-5vh" }} className="relative w-full max-w-xl">
        {content}
      </div>
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
      {items.map((item) => (
        <StickyStackCard key={item.key} content={item.content} topOffsetClass={topOffsetClass} />
      ))}
    </div>
  );
}
