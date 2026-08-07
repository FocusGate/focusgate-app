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
 *  decelerating into the final value, with a brief gold pulse once it lands.
 *
 *  `target` is almost always backed by async-fetched data (session stats, streaks, etc.)
 *  that's still 0/unloaded at first paint. Re-running only on `isInView` (as this used to)
 *  meant: if the card was already in view before its data arrived — the common case for
 *  anything above the fold — the animation fired once with target=0, latched a "already
 *  fired" flag, and then silently ignored every later target update for the rest of the
 *  component's life. The card would just sit at 0 forever with no visible error. Reacting
 *  to `opts.target` too fixes that: once in view, each real target change gets its own
 *  animation, running from the currently-displayed value (not restarting at 0) so a
 *  fast-follow update still reads as "counting up to the right number," not a reset. */
export function useMotionCountUp(ref: RefObject<HTMLElement | null>, opts: CountOpts) {
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const firedRef = useRef(false);
  const currentRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!firedRef.current) el.textContent = format(0, opts);
    if (!isInView) return;

    const from = firedRef.current ? currentRef.current : 0;
    firedRef.current = true;

    const controls = animate(from, opts.target, {
      duration: opts.duration ?? 1.6,
      ease: [0.08, 0.82, 0.17, 1],
      onUpdate: (v) => {
        currentRef.current = v;
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
  }, [isInView, opts.target]);
}
