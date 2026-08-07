"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useAnimation } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

// Routes that live under app/(app)/layout.tsx's shared AppShell — switching between them
// should feel like tabs in a native app (instant, no cover), not a marketing-site page
// load. Keeping this list here (rather than a route-group lookup) is what lets both the
// click-interceptor and the reveal effect below skip the black overlay cheaply.
const APP_ROUTE_PREFIXES = ["/dashboard", "/badges", "/the-gates", "/stats", "/friends", "/settings"];

function isAppRoute(pathname: string) {
  return APP_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const overlay = useAnimation();
  // Compared (rather than a first-render boolean) so React StrictMode's double-invoked
  // effect can't mistake the initial mount for a navigation and slide the overlay
  // back over the page.
  const lastPathRef = useRef(pathname);

  // Reveal (slide the overlay back out) once the new page has mounted.
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    const tabSwitch = isAppRoute(lastPathRef.current) && isAppRoute(pathname);
    lastPathRef.current = pathname;
    if (tabSwitch) return; // switching app tabs never covered the screen — nothing to reveal
    overlay.set({ y: "0%" });
    overlay.start({ y: "-100%", transition: { duration: 0.5, ease: EASE, delay: 0.05 } });
  }, [pathname, overlay]);

  // Intercept internal link clicks: slide the overlay in to cover the screen, then navigate.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      if (anchor.hasAttribute("download") || anchor.target === "_blank") return;

      const url = new URL(href, window.location.href);
      if (url.pathname === window.location.pathname) return; // same-page anchors — let Lenis handle it

      // App-shell tab switches (sidebar links) navigate like a native app's tab bar:
      // instantly, letting next/link's own default handler run — no cover animation,
      // and no interception at all here.
      if (isAppRoute(window.location.pathname) && isAppRoute(url.pathname)) return;

      // Capture-phase: stop the event here so next/link's own bubble-phase click
      // handler (which would navigate instantly) never runs.
      e.preventDefault();
      e.stopPropagation();
      overlay.set({ y: "100%" });
      overlay.start({ y: "0%", transition: { duration: 0.4, ease: EASE } }).then(() => router.push(href));
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [router, overlay]);

  const appRoute = isAppRoute(pathname);

  return (
    <>
      {/* Parked off-screen declaratively via `initial` — never rely on an effect to get
          it out of the way, or a mis-timed `.set()` leaves a black sheet over the page. */}
      <motion.div
        initial={{ y: "100%" }}
        animate={overlay}
        style={{ position: "fixed", inset: 0, zIndex: 9998, background: "#000", pointerEvents: "none" }}
        aria-hidden="true"
      />
      {appRoute ? (
        // No key-by-pathname wrapper here: keying by pathname would force React to tear
        // down and rebuild the entire tree (including the shared AppShell + user context
        // from app/(app)/layout.tsx) on every tab switch. Rendering children directly lets
        // Next.js's own route-group layout persistence do its job.
        children
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
