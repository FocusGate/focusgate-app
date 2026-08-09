"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CurrentUserProvider, useCurrentUserContext } from "@/contexts/CurrentUserContext";
import AppShell from "@/components/app/AppShell";
import { getActiveSession } from "@/lib/supabase";

/** Routes that stay reachable while a session is locked in — /dashboard (where
 *  LockedInOverlay itself lives, main session + Break Gates + The Lounge all render
 *  there) and /lounge (the extension's standalone entry point into the same break state).
 *  Everything else under this layout — Badges, Stats, Friends, Settings, The Gates — must
 *  bounce back to /dashboard rather than ever actually render while locked in. Emergency
 *  Unblock isn't in this list because it doesn't need to be: it ends the session outright,
 *  so by the time it's done there's no active session left for this guard to enforce. */
const ALLOWED_DURING_SESSION = ["/dashboard", "/lounge"];

/** Wraps every authenticated route (dashboard, badges, the-gates, stats, friends,
 *  settings) in one persistent shell + one user fetch. Because a route group's layout
 *  stays mounted while its child routes swap, navigating between these pages no longer
 *  remounts the sidebar or re-runs the auth/profile/streak fetch — only the page content
 *  below it changes. That persistence is also exactly what makes the session lock below
 *  work: usePathname() re-fires this effect on every client-side navigation (Link clicks,
 *  browser back/forward) without needing a full page reload to notice one. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrentUserProvider>
      <Shell>{children}</Shell>
    </CurrentUserProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useCurrentUserContext();
  const pathname = usePathname();
  const router = useRouter();
  const [hasActiveSession, setHasActiveSession] = useState(false);
  // The path this component has actually confirmed is safe to render — null/mismatched
  // means "don't know yet," which on a disallowed route means "don't render it yet either."
  // This is what stops Badges/Settings/etc. from ever flashing into view even for a frame
  // before the redirect lands, which is the entire point of the guard.
  const [checkedPath, setCheckedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // No synchronous setCheckedPath(null) here on purpose: checkedPath still holds the
    // *previous* path's value the instant pathname changes, which already differs from the
    // new pathname — `gated` below reads that mismatch as "not yet confirmed" on its own,
    // with nothing to reset. Setting state synchronously in an effect body is also exactly
    // what react-hooks/set-state-in-effect flags; this fix and that lint fix are the same fix.

    getActiveSession(user.id)
      .then((active) => {
        if (cancelled) return;
        const isActive = !!active;
        setHasActiveSession(isActive);
        if (isActive && !ALLOWED_DURING_SESSION.includes(pathname)) {
          router.replace("/dashboard");
          return; // stays gated; this effect reruns once the replace lands on /dashboard
        }
        setCheckedPath(pathname);
      })
      .catch(() => {
        // Fails open on the check itself — a transient network hiccup shouldn't lock
        // someone out of their own account. Worst case, the guard just doesn't apply
        // until the next successful check.
        setCheckedPath(pathname);
      });

    return () => {
      cancelled = true;
    };
  }, [user, pathname, router]);

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", background: "#060606", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a7d84" }}>
        Loading…
      </div>
    );
  }

  const gated = checkedPath !== pathname && !ALLOWED_DURING_SESSION.includes(pathname);
  if (gated) {
    return (
      <div style={{ minHeight: "100vh", background: "#060606", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a7d84" }}>
        Loading…
      </div>
    );
  }

  return (
    <AppShell user={user} hasActiveSession={hasActiveSession}>
      {children}
    </AppShell>
  );
}
