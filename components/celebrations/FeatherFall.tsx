"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** One feather's silhouette — the same two-lobe-plus-shaft shape as featherIcons.tsx's
 *  FeatherShape, but drawn as an outline here (thin gold stroke) over a solid black fill,
 *  per the brief, instead of that file's flat tier-colored fill. Kept as its own copy
 *  rather than importing FeatherShape directly: that one is tuned for a static 48x48 icon
 *  glyph (fixed proportions, no stroke), this one needs to look right free-falling and
 *  tumbling at arbitrary sizes with a visible outline. */
function FallingFeatherShape({ size, gold }: { size: number; gold: string }) {
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 30 48" fill="none">
      <path
        d="M15 4C22 8 26 15 24 23C22 30 18 35 15 40L15 44"
        stroke={gold}
        strokeWidth="1.2"
        fill="#0A0A0A"
        strokeLinejoin="round"
      />
      <path d="M15 4C15 4 15 22 15 40" stroke={gold} strokeWidth="0.8" opacity="0.85" />
      <path
        d="M15 12L20 9M15 18L21 15M15 24L22 21M15 30L20 28M15 12L10 10M15 18L9 16M15 24L8 22M15 30L10 28"
        stroke={gold}
        strokeWidth="0.5"
        opacity="0.4"
      />
    </svg>
  );
}

/** The Golden Quill's own larger, more ornate falling shape — mixed in among the regular
 *  feathers only when `variant="quill"` (i.e. only for the Golden Quill's own celebration),
 *  same 3-layer-plus-nib construction as GoldenQuillGlyph.tsx, ported here since that one
 *  is built for a static rotating card, not a tumbling fall. */
function FallingQuillShape({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 30 48" fill="none">
      <defs>
        <linearGradient id="ff-quill-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF4E0" />
          <stop offset="0.5" stopColor="#FFB020" />
          <stop offset="1" stopColor="#C2660A" />
        </linearGradient>
      </defs>
      <path d="M15 4C22 8 26 15 24 23C22 30 18 35 15 40L15 44" fill="url(#ff-quill-gold)" opacity="0.95" />
      <path d="M15 4C15 4 15 22 15 40" stroke="#C2660A" strokeWidth="0.8" opacity="0.6" />
      <path d="M13.6 40L12 46L15.1 43.5L18 46L16.4 40Z" fill="url(#ff-quill-gold)" />
    </svg>
  );
}

type Feather = {
  id: number;
  isQuill: boolean;
  startX: number; // vw
  size: number;
  duration: number;
  delay: number;
  rotateStart: number;
  rotateEnd: number;
  driftKeyframes: number[]; // vw offsets sampled across the fall, sine-wave drift
  spinDirection: 1 | -1;
};

/** Deterministic per-feather variety from a plain index — same "no Math.random() where it'd
 *  make output non-reproducible" discipline as the Remotion project, though here it's really
 *  just so re-triggering the same celebration doesn't feel identical every time; a simple
 *  hash of the index is enough. */
function paramsFor(i: number, count: number, slow: boolean, includeQuills: boolean): Feather {
  const h = (n: number) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1; // 0..1 pseudo-random, stable per i
  const startX = 4 + h(i) * 92; // vw, spread across the width
  const size = 14 + h(i + 50) * 12;
  const baseDuration = slow ? 5.5 : 3.2;
  const duration = baseDuration + h(i + 100) * (slow ? 2.5 : 1.6);
  const delay = i * (0.03 + h(i + 150) * 0.05);
  const rotateStart = -30 + h(i + 200) * 60;
  const rotateEnd = rotateStart + (h(i + 250) > 0.5 ? 1 : -1) * (180 + h(i + 300) * 360);
  const driftAmp = 5 + h(i + 350) * 6; // vw
  const driftFreq = 1 + h(i + 400) * 1.5; // cycles across the fall
  const driftPhase = h(i + 450) * Math.PI * 2;
  const driftKeyframes = Array.from({ length: 8 }, (_, k) => {
    const t = k / 7;
    return startX + Math.sin(t * Math.PI * 2 * driftFreq + driftPhase) * driftAmp;
  });
  const isQuill = includeQuills && i % 9 === 0 && i > 0;
  return {
    id: i,
    isQuill,
    startX,
    size: isQuill ? size * 1.8 : size,
    duration,
    delay,
    rotateStart,
    rotateEnd,
    driftKeyframes,
    spinDirection: h(i + 500) > 0.5 ? 1 : -1,
  };
}

export type FeatherFallProps = {
  /** Toggle true to fire the animation; the component clears itself out after the last
   *  feather finishes, so the same boolean can be flipped true again to re-trigger. */
  active: boolean;
  /** 10 for a regular feather/tier unlock, 15-30 for a general celebration (session
   *  complete, streak milestones), 40+ for the Golden Quill. */
  count?: number;
  /** Golden Quill only — noticeably slower fall plus a few larger quill shapes mixed in. */
  slow?: boolean;
  includeQuills?: boolean;
  gold?: string;
  onDone?: () => void;
};

/** Fixed full-viewport overlay: feathers spawn just above the top edge and fall past the
 *  bottom, each with its own gentle sine-wave side-to-side drift and rotation speed so the
 *  fall reads as physical, not like a uniform particle system. Pointer-events are off
 *  throughout — this never blocks interaction with whatever's underneath. */
export function FeatherFall({ active, count = 20, slow = false, includeQuills = false, gold = "#FFB020", onDone }: FeatherFallProps) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!active) return;
    setPlaying(true);
  }, [active]);

  const feathers = useMemo(() => {
    if (!playing) return [];
    return Array.from({ length: count }, (_, i) => paramsFor(i, count, slow, includeQuills));
  }, [playing, count, slow, includeQuills]);

  const longestFinish = useMemo(
    () => feathers.reduce((max, f) => Math.max(max, f.delay + f.duration), 0),
    [feathers]
  );

  useEffect(() => {
    if (!playing || feathers.length === 0) return;
    const t = setTimeout(() => {
      setPlaying(false);
      onDone?.();
    }, (longestFinish + 0.3) * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-firing only depends on `playing` flipping true again
  }, [playing, longestFinish]);

  return (
    <AnimatePresence>
      {playing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, pointerEvents: "none", overflow: "hidden" }}>
          {feathers.map((f) => (
            <motion.div
              key={f.id}
              initial={{ top: "-8vh", left: `${f.startX}vw`, opacity: 0, rotate: f.rotateStart }}
              animate={{
                top: "108vh",
                left: f.driftKeyframes.map((x) => `${x}vw`),
                opacity: [0, 1, 1, 0],
                rotate: f.rotateEnd,
              }}
              exit={{ opacity: 0 }}
              transition={{
                top: { duration: f.duration, delay: f.delay, ease: "linear" },
                left: { duration: f.duration, delay: f.delay, ease: "easeInOut" },
                opacity: { duration: f.duration, delay: f.delay, times: [0, 0.08, 0.82, 1] },
                rotate: { duration: f.duration, delay: f.delay, ease: "linear" },
              }}
              style={{ position: "absolute" }}
            >
              {f.isQuill ? <FallingQuillShape size={f.size} /> : <FallingFeatherShape size={f.size} gold={gold} />}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
