"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useInView, animate } from "framer-motion";

type CountOpts = {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  comma?: boolean;
  duration?: number;
  /** Overrides the default prefix/suffix/decimals formatting entirely — e.g. rendering
   *  minutes as "2h 34m" instead of a plain number. */
  formatValue?: (v: number) => string;
};

function format(v: number, opts: CountOpts) {
  if (opts.formatValue) return opts.formatValue(v);
  const dec = opts.decimals ?? 0;
  const body = dec
    ? v.toFixed(dec)
    : opts.comma
      ? Math.round(v).toLocaleString("en-US")
      : String(Math.round(v));
  return `${opts.prefix ?? ""}${body}${opts.suffix ?? ""}`;
}

/** Animates a number from 0 to target when the element scrolls into view — fast at first,
 *  decelerating into the final value, with a brief gold pulse once it lands. */
export function useMotionCountUp(ref: RefObject<HTMLElement | null>, opts: CountOpts) {
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const firedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!firedRef.current) el.textContent = format(0, opts);
    if (!isInView || firedRef.current) return;
    firedRef.current = true;

    const controls = animate(0, opts.target, {
      duration: opts.duration ?? 1.6,
      ease: [0.08, 0.82, 0.17, 1],
      onUpdate: (v) => {
        el.textContent = format(v, opts);
      },
      onComplete: () => {
        animate(
          el,
          { textShadow: ["0 0 0px rgba(245,158,11,0)", "0 0 22px rgba(245,158,11,0.85)", "0 0 0px rgba(245,158,11,0)"] },
          { duration: 0.7, ease: "easeOut" }
        );
      },
    });

    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);
}
