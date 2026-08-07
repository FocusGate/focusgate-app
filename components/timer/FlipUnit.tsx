"use client";

import { useLayoutEffect, useRef } from "react";
import { animate, type AnimationPlaybackControls } from "framer-motion";

const SHADOW_REST = "0 20px 40px rgba(0,0,0,0.55)";
const SHADOW_DEEP = "0 34px 64px rgba(0,0,0,0.9)";

export default function FlipUnit({ value, label }: { value: number; label: string }) {
  const display = String(Math.max(0, value)).padStart(2, "0");
  const prevRef = useRef(display);
  const mountedRef = useRef(false);

  const backTopRef = useRef<HTMLSpanElement>(null);
  const backBottomRef = useRef<HTMLSpanElement>(null);
  const foldTopWrapRef = useRef<HTMLDivElement>(null);
  const foldTopTextRef = useRef<HTMLSpanElement>(null);
  const foldBottomWrapRef = useRef<HTMLDivElement>(null);
  const foldBottomTextRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (backTopRef.current) backTopRef.current.textContent = display;
    if (backBottomRef.current) backBottomRef.current.textContent = display;

    const top = foldTopWrapRef.current;
    const bottom = foldBottomWrapRef.current;
    const card = cardRef.current;

    if (!mountedRef.current) {
      mountedRef.current = true;
      prevRef.current = display;
      if (top) animate(top, { opacity: 0 }, { duration: 0 });
      if (bottom) animate(bottom, { opacity: 0 }, { duration: 0 });
      return;
    }

    const prev = prevRef.current;
    if (prev === display) return;
    prevRef.current = display;

    if (!top || !bottom || !card) return;

    if (foldTopTextRef.current) foldTopTextRef.current.textContent = prev;
    if (foldBottomTextRef.current) foldBottomTextRef.current.textContent = display;

    // Reset fold state instantly (a 0-duration animate keeps framer's internal
    // transform cache in sync, unlike poking el.style.transform directly).
    animate(top, { rotateX: 0, opacity: 1 }, { duration: 0 });
    animate(bottom, { rotateX: 90, opacity: 1 }, { duration: 0 });

    const controls: AnimationPlaybackControls[] = [];
    controls.push(animate(card, { boxShadow: [SHADOW_REST, SHADOW_DEEP] }, { duration: 0.2, ease: [0.55, 0, 1, 0.45] }));
    controls.push(
      animate(top, { rotateX: -90 }, {
        type: "spring",
        stiffness: 340,
        damping: 30,
        onComplete: () => animate(top, { opacity: 0 }, { duration: 0 }),
      })
    );

    const timer = setTimeout(() => {
      controls.push(animate(bottom, { rotateX: 0 }, { type: "spring", stiffness: 300, damping: 26 }));
      controls.push(animate(card, { boxShadow: [SHADOW_DEEP, SHADOW_REST] }, { duration: 0.2, ease: [0, 0.55, 0.45, 1] }));
    }, 190);

    return () => {
      clearTimeout(timer);
      controls.forEach((c) => c.stop());
    };
  }, [display]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div ref={cardRef} className="fg-flip-unit" style={{ perspective: 400 }}>
        <div className="fg-flip-half fg-top">
          <div className="fg-flip-face fg-face-top">
            <span ref={backTopRef}>{display}</span>
          </div>
        </div>
        <div className="fg-flip-half fg-bottom">
          <div className="fg-flip-face fg-face-bottom">
            <span ref={backBottomRef}>{display}</span>
          </div>
        </div>

        <div ref={foldTopWrapRef} className="fg-flip-fold fg-fold-top">
          <div className="fg-flip-face fg-face-top">
            <span ref={foldTopTextRef}>{display}</span>
          </div>
        </div>
        <div ref={foldBottomWrapRef} className="fg-flip-fold fg-fold-bottom">
          <div className="fg-flip-face fg-face-bottom">
            <span ref={foldBottomTextRef}>{display}</span>
          </div>
        </div>
      </div>
      <div className="fg-flip-label">{label}</div>
    </div>
  );
}
