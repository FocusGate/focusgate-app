"use client";

import { useEffect, useState } from "react";
import { getGroupPresence, type PresenceEntry } from "@/lib/supabase";

const POLL_MS = 18_000; // matches the existing Friends-page presence polling cadence

/** Group Study's "live presence dots shown for the whole group during the session" —
 *  reuses the same getGroupPresence() the Friends page already polls with, just mounted
 *  here instead. A green dot per group member currently mid-session; everyone else (this
 *  user included, since getGroupPresence returns every active member) fades in as their
 *  own session starts. */
export default function GroupPresenceRow({ groupId, userId }: { groupId: string; userId: string }) {
  const [entries, setEntries] = useState<PresenceEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    function poll() {
      getGroupPresence(groupId)
        .then((e) => {
          if (!cancelled) setEntries(e);
        })
        .catch(() => {});
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [groupId]);

  if (entries.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(59,130,246,0.08)",
        border: "1px solid rgba(59,130,246,0.3)",
        borderRadius: 999,
        padding: "8px 16px",
        zIndex: 501,
      }}
    >
      {entries.map((e) => (
        <span key={e.userId} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: e.userId === userId ? "#93C5FD" : "#9a9da4" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3B82F6", boxShadow: "0 0 6px #3B82F6" }} />
          {e.userId === userId ? "You" : e.name.split(" ")[0]}
        </span>
      ))}
    </div>
  );
}
