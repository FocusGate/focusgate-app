"use client";

import { useEffect, useRef } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import gsap from "gsap";
import { ensureGsapPlugins, ScrollTrigger } from "@/lib/gsap";
import { setLenisInstance } from "@/lib/lenis";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    ensureGsapPlugins();
    // GSAP's documented Lenis integration: ScrollTrigger caches scroll position per
    // animation frame, and Lenis's own smoothing can update that position between GSAP
    // ticks — without the ScrollTrigger.update() call here, ScrollTrigger-driven sections
    // (the games showcase's scroll-snap) lag a frame behind and snap targets drift.
    // Reading `lenisRef.current?.lenis` inside the ticker (rather than once on mount) also
    // sidesteps any ordering question about whether ReactLenis has constructed its instance
    // yet — this just naturally starts working the first frame it exists.
    function update(time: number) {
      const lenis = lenisRef.current?.lenis;
      if (lenis) {
        lenis.raf(time * 1000);
        setLenisInstance(lenis);
      }
      ScrollTrigger.update();
    }
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
      setLenisInstance(null);
    };
  }, []);

  // Smoothly animate to in-page anchors (nav/footer links to #features, #badges, #pricing, the
  // logo's "#" back-to-top, …) instead of the browser's instant jump.
  useEffect(() => {
    const easing = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element | null)?.closest("a[href^='#']");
      if (!anchor) return;
      const hash = anchor.getAttribute("href");
      if (!hash) return;

      if (hash === "#") {
        e.preventDefault();
        lenisRef.current?.lenis?.scrollTo(0, { duration: 1.4, easing });
        return;
      }

      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return;

      e.preventDefault();
      lenisRef.current?.lenis?.scrollTo(target, { offset: -100, duration: 1.4, easing });
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{ autoRaf: false, lerp: 0.1, duration: 1.2 }}
    >
      {children}
    </ReactLenis>
  );
}
