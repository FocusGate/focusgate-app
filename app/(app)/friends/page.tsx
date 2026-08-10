"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import GroupCard from "@/components/app/friends/GroupCard";
import ActivityFeedItem from "@/components/app/friends/ActivityFeedItem";
import { useCurrentUserContext } from "@/contexts/CurrentUserContext";
import {
  createFriendGroup,
  getGroupPresence,
  getGroupSessionFeed,
  getSessionReactions,
  getUserGroups,
  joinFriendGroup,
  reactToSession,
  type GroupSummary,
  type PresenceEntry,
  type SessionFeedItem,
} from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/posthog";

type Notification = { id: string; message: string; created_at: string };
type ReactionMap = Record<string, { count: number; reactedByMe: boolean }>;

const PRESENCE_POLL_MS = 18000;

export default function FriendsPage() {
  const { user, entitlements } = useCurrentUserContext();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [presenceByGroup, setPresenceByGroup] = useState<Record<string, PresenceEntry[]>>({});
  const [feed, setFeed] = useState<SessionFeedItem[]>([]);
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinId, setJoinId] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const loadGroups = useCallback(async (userId: string) => {
    const list = await getUserGroups(userId);
    setGroups(list);
    return list;
  }, []);

  const loadNotifications = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, message, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications((data as Notification[]) ?? []);
  }, []);

  const refreshPresenceAndFeed = useCallback(async (groupList: GroupSummary[], userId: string) => {
    if (groupList.length === 0) {
      setPresenceByGroup({});
      setFeed([]);
      setReactions({});
      return;
    }

    const [presenceEntries, feedLists] = await Promise.all([
      Promise.all(groupList.map((g) => getGroupPresence(g.id))),
      Promise.all(groupList.map((g) => getGroupSessionFeed(g.id, 20))),
    ]);

    const presenceMap: Record<string, PresenceEntry[]> = {};
    groupList.forEach((g, i) => {
      presenceMap[g.id] = presenceEntries[i];
    });
    setPresenceByGroup(presenceMap);

    const byId = new Map<string, SessionFeedItem>();
    for (const list of feedLists) {
      for (const item of list) byId.set(item.id, item);
    }
    const merged = Array.from(byId.values())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 20);
    setFeed(merged);

    const reactionMap = await getSessionReactions(
      merged.map((m) => m.id),
      userId
    );
    setReactions(reactionMap);
  }, []);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/user-change is the intended sync here
    setGroupsLoading(true);
    setGroupsError(null);
    Promise.all([loadGroups(user.id), loadNotifications(user.id)])
      .then(([groupList]) => refreshPresenceAndFeed(groupList, user.id))
      .catch((err) => setGroupsError(err instanceof Error ? err.message : "Could not load your groups."))
      .finally(() => setGroupsLoading(false));
  }, [user, loadGroups, loadNotifications, refreshPresenceAndFeed]);

  useEffect(() => {
    if (!user || groups.length === 0) return;
    const id = setInterval(() => {
      void refreshPresenceAndFeed(groups, user.id);
    }, PRESENCE_POLL_MS);
    return () => clearInterval(id);
  }, [user, groups, refreshPresenceAndFeed]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !groupName.trim() || creating) return;
    if (!entitlements.canUseFriendGroups) {
      setCreateError("Your trial ended — upgrade to create friend groups.");
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      await createFriendGroup(user.id, groupName.trim());
      setGroupName("");
      const list = await loadGroups(user.id);
      await refreshPresenceAndFeed(list, user.id);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create group.");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !joinId.trim() || joining) return;
    if (!entitlements.canUseFriendGroups) {
      setJoinError("Your trial ended — upgrade to join friend groups.");
      return;
    }
    setJoinError(null);
    setJoining(true);
    try {
      await joinFriendGroup(user.id, joinId.trim());
      setJoinId("");
      const list = await loadGroups(user.id);
      await refreshPresenceAndFeed(list, user.id);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Could not join that group — check the group code.");
    } finally {
      setJoining(false);
    }
  }

  async function handleReact(sessionId: string) {
    if (!user) return;
    const prev = reactions[sessionId] ?? { count: 0, reactedByMe: false };
    setReactions((r) => ({
      ...r,
      [sessionId]: { count: prev.reactedByMe ? prev.count - 1 : prev.count + 1, reactedByMe: !prev.reactedByMe },
    }));
    try {
      await reactToSession(sessionId, user.id);
    } catch {
      setReactions((r) => ({ ...r, [sessionId]: prev }));
    }
  }

  if (!user) return null;

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Friends</h1>
      <p style={{ color: "#9a9da4", marginTop: 6 }}>Accountability groups keep you honest.</p>

      <div className="fg-app-2col" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18, marginTop: 28 }}>
        <div style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 22, minWidth: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Create a group</h2>
          <form onSubmit={handleCreate} style={{ display: "flex", gap: 10 }}>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" style={inputStyle} />
            <button type="submit" disabled={creating || !entitlements.canUseFriendGroups} style={{ ...btnStyle, opacity: creating || !entitlements.canUseFriendGroups ? 0.6 : 1 }}>
              {creating ? "Creating…" : "Create"}
            </button>
          </form>
          {createError && <p style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>{createError}</p>}
        </div>
        <div style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 22, minWidth: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Join a group</h2>
          <form onSubmit={handleJoin} style={{ display: "flex", gap: 10 }}>
            <input value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="Group code" style={inputStyle} />
            <button type="submit" disabled={joining || !entitlements.canUseFriendGroups} style={{ ...btnStyle, opacity: joining || !entitlements.canUseFriendGroups ? 0.6 : 1 }}>
              {joining ? "Joining…" : "Join"}
            </button>
          </form>
          {joinError && <p style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>{joinError}</p>}
          {!entitlements.canUseFriendGroups && !joinError && (
            <p style={{ color: "#7a7d84", fontSize: 12, marginTop: 10 }}>
              Your trial ended — <Link href="/#pricing" onClick={() => track("upgrade_button_clicked")} style={{ color: "#F59E0B" }}>upgrade</Link> to create or join groups.
            </p>
          )}
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Your groups</h2>
        {groupsError && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 14 }}>{groupsError}</p>}
        {groupsLoading && <p style={{ color: "#7a7d84", fontSize: 14 }}>Loading your groups…</p>}
        {!groupsLoading && groups.length === 0 && !groupsError && (
          <p style={{ color: "#7a7d84", fontSize: 14 }}>You&apos;re not in any groups yet — create one or join with a code.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} presence={presenceByGroup[g.id] ?? []} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Activity</h2>
        {feed.length === 0 && <p style={{ color: "#7a7d84", fontSize: 14 }}>No activity yet — start a session to show up here.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {feed.map((item) => (
            <ActivityFeedItem
              key={item.id}
              item={item}
              reaction={reactions[item.id] ?? { count: 0, reactedByMe: false }}
              onReact={() => handleReact(item.id)}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Notifications</h2>
        {notifications.length === 0 && <p style={{ color: "#7a7d84", fontSize: 14 }}>No notifications yet — start a session to notify your groups.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notifications.map((n) => (
            <div key={n.id} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 14, color: "#d8d8dc" }}>
              {n.message}
              <div style={{ color: "#5b5e66", fontSize: 12, marginTop: 4 }}>{new Date(n.created_at).toLocaleString("en-US", { timeZone: "UTC" })}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "#101012",
  border: "1px solid #26262b",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  background: "rgba(245,158,11,0.15)",
  color: "#F59E0B",
  border: "1px solid rgba(245,158,11,0.4)",
  padding: "10px 18px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  flexShrink: 0,
};
