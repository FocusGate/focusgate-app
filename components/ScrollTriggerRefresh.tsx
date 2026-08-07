"use client";

import { useEffect } from "react";
import { ScrollTrigger, ensureGsapPlugins } from "@/lib/gsap";

/**
 * Recalculates every ScrollTrigger's start/end positions once the full page has settled.
 *
 * Individual components measure their own trigger positions as soon as they mount, but other
 * components mounting after them — especially pinned sections like HorizontalFeatures, which
 * inserts a pin-spacer and changes document height — can shift everything below them. Without
 * this, an early-mounting ScrollTrigger can fire the instant the page loads because its target
 * looked like it was already in view before layout finished settling.
 */
export default function ScrollTriggerRefresh() {
  useEffect(() => {
    ensureGsapPlugins();
    const refresh = () => ScrollTrigger.refresh();
    const id = window.setTimeout(refresh, 300);
    window.addEventListener("load", refresh);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("load", refresh);
    };
  }, []);

  return null;
}
