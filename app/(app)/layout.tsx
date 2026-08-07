"use client";

import { CurrentUserProvider, useCurrentUserContext } from "@/contexts/CurrentUserContext";
import AppShell from "@/components/app/AppShell";

/** Wraps every authenticated route (dashboard, badges, the-gates, stats, friends,
 *  settings) in one persistent shell + one user fetch. Because a route group's layout
 *  stays mounted while its child routes swap, navigating between these pages no longer
 *  remounts the sidebar or re-runs the auth/profile/streak fetch — only the page content
 *  below it changes. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrentUserProvider>
      <Shell>{children}</Shell>
    </CurrentUserProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useCurrentUserContext();

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", background: "#060606", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a7d84" }}>
        Loading…
      </div>
    );
  }

  return <AppShell user={user}>{children}</AppShell>;
}
