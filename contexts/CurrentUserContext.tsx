"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/supabase";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  streak: number;
  longest_streak: number;
  total_focus_hours: number;
  goals: string[] | null;
  goal_target_date: string | null;
};

type Ctx = {
  user: CurrentUser | null;
  loading: boolean;
  setUser: (u: CurrentUser) => void;
};

const CurrentUserContext = createContext<Ctx | null>(null);

/** Fetches the signed-in user (auth + profile + streak sync) exactly once per app-shell
 *  mount, not once per page — every route under app/(app) reads from this instead of
 *  re-running that multi-round-trip fetch on every tab switch, which is what made
 *  switching between Dashboard/Badges/Stats/etc. feel like a fresh page load each time. */
export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getUser()
      .then((u) => {
        if (cancelled) return;
        if (!u) {
          router.replace("/login");
          return;
        }
        setUser(u as CurrentUser);
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return <CurrentUserContext.Provider value={{ user, loading, setUser }}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUserContext() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUserContext must be used within a CurrentUserProvider");
  return ctx;
}
