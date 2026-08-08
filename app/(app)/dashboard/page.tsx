"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Lock, Ban } from "lucide-react";
import LockedInOverlay from "@/components/app/LockedInOverlay";
import LockInEntryAnimation from "@/components/app/LockInEntryAnimation";
import SessionModeFlow, { type StartConfig } from "@/components/app/dashboard/SessionModeFlow";
import StatCard, { formatHoursMinutes } from "@/components/app/dashboard/StatCard";
import { useCurrentUserContext, type CurrentUser } from "@/contexts/CurrentUserContext";
import {
  addBlockedSite,
  checkAndUnlockBadges,
  endSession,
  getBlockedSites,
  getSessions,
  getUser,
  getUserPreferences,
  notifyFriendGroup,
  removeBlockedSite,
  startSession,
} from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import { getTodayFocusMinutes } from "@/lib/stats";
import { GOAL_OPTIONS } from "@/lib/onboarding";

type BlockedSite = { id: string; url: string };
type SessionRow = { id: string; start_time: string; duration_minutes: number | null; completed: boolean };

function greeting(name: string) {
  const hour = new Date().getHours();
  const time = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return `Good ${time}, ${name.split(" ")[0]} 👋`;
}

/** "🎯 Working toward: Study for exams — by September 2, 2026", reading straight off
 *  the onboarding goals/timeframe captured at signup (lib/supabase.ts signUp()). Only
 *  the first goal is named (matching the summary screen's "+N more" treatment) — null
 *  if the account has no goals on file, e.g. anyone who signed up before this existed. */
function goalReminder(goals: string[] | null, targetDate: string | null): string | null {
  if (!goals || goals.length === 0 || !targetDate) return null;
  const label = GOAL_OPTIONS.find((g) => g.value === goals[0])?.label ?? goals[0];
  const extra = goals.length > 1 ? ` +${goals.length - 1} more` : "";
  const formatted = new Date(`${targetDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `🎯 Working toward: ${label}${extra} — by ${formatted}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { user, setUser } = useCurrentUserContext();
  const [blockedSites, setBlockedSites] = useState<BlockedSite[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [newSite, setNewSite] = useState("");
  const [siteError, setSiteError] = useState<string | null>(null);
  const [addingSite, setAddingSite] = useState(false);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionStartIso, setSessionStartIso] = useState<string>("");
  const [sessionMode, setSessionMode] = useState<StartConfig["mode"]>("custom");
  const [sessionModeConfig, setSessionModeConfig] = useState<StartConfig["modeConfig"]>(null);
  const [sessionGroupId, setSessionGroupId] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const lastConfigRef = useRef<StartConfig | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getBlockedSites(user.id), getSessions(user.id), getUserPreferences(user.id)])
      .then(([sites, sess]) => {
        setBlockedSites(sites as BlockedSite[]);
        setSessions(sess as SessionRow[]);
      })
      .catch(() => {});
  }, [user]);

  const todaysSessions = useMemo(() => sessions.filter((s) => s.start_time.slice(0, 10) === todayKey()), [sessions]);
  const todayMinutes = useMemo(() => getTodayFocusMinutes(sessions), [sessions]);

  async function handleStart(cfg: StartConfig) {
    if (!user || starting) return;
    setStartError(null);
    setStarting(true);
    lastConfigRef.current = cfg;
    try {
      const urls = blockedSites.map((s) => s.url);
      const session = await startSession(user.id, urls, cfg.minutes, { mode: cfg.mode, groupId: cfg.groupId, modeConfig: cfg.modeConfig });
      setSessionId(session.id);
      setSessionSeconds(cfg.minutes * 60);
      setSessionStartIso(session.start_time);
      setSessionMode(cfg.mode);
      setSessionModeConfig(cfg.modeConfig);
      setSessionGroupId(cfg.groupId);

      const prefs = await getUserPreferences(user.id);
      if (prefs.share_session_starts) {
        if (cfg.mode === "group_study" && cfg.groupId) {
          // Group Study notifies only the bound group — not every group the user's in.
          await notifyFriendGroup(user.id, cfg.groupId, `${user.name} just started a Group Study session 🔒`);
        } else {
          const supabase = createClient();
          const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
          await Promise.all(
            (memberships ?? []).map((m) =>
              notifyFriendGroup(user.id, m.group_id, `${user.name} just started a ${cfg.minutes}-minute Locked In session 🔒`)
            )
          );
        }
      }
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Could not start the session. Try again.");
    } finally {
      setStarting(false);
    }
  }

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newSite.trim() || addingSite) return;
    setSiteError(null);
    setAddingSite(true);
    try {
      const site = await addBlockedSite(user.id, newSite.trim());
      setBlockedSites((s) => [...s, site as BlockedSite]);
      setNewSite("");
    } catch (err) {
      setSiteError(err instanceof Error ? err.message : "Could not add that site.");
    } finally {
      setAddingSite(false);
    }
  }

  async function handleRemoveSite(url: string) {
    if (!user) return;
    await removeBlockedSite(user.id, url);
    setBlockedSites((s) => s.filter((site) => site.url !== url));
  }

  /** Ends the session, checks for newly-unlocked badges, and refreshes the streak/hours
   *  shown across the shell — returns the unlocked badges so the Locked-In overlay's
   *  Session Complete screen can animate them in. */
  async function handleSessionComplete() {
    if (!sessionId || !user) return [];
    await endSession(sessionId);
    const unlocked = await checkAndUnlockBadges(user.id);
    const refreshed = await getUser();
    if (refreshed) setUser(refreshed as CurrentUser);
    setSessions((prev) => [
      { id: sessionId, start_time: new Date().toISOString(), duration_minutes: Math.round(sessionSeconds / 60), completed: true },
      ...prev,
    ]);
    return unlocked;
  }

  if (!user) return null;

  const goalLine = goalReminder(user.goals, user.goal_target_date);

  return (
    <>
      {entering && <LockInEntryAnimation onDone={() => setEntering(false)} />}

      {sessionId && (
        <LockedInOverlay
          totalSeconds={sessionSeconds}
          blockedSites={blockedSites.map((s) => s.url)}
          streak={user.streak}
          userId={user.id}
          sessionId={sessionId}
          sessionStartIso={sessionStartIso}
          mode={sessionMode}
          modeConfig={sessionModeConfig}
          groupId={sessionGroupId}
          onComplete={handleSessionComplete}
          onFinished={() => setSessionId(null)}
          onStartAnother={() => {
            setSessionId(null);
            if (lastConfigRef.current) void handleStart(lastConfigRef.current);
          }}
        />
      )}

      <h1 style={{ fontSize: 28, fontWeight: 700 }}>{greeting(user.name)}</h1>
      <p style={{ color: "#9a9da4", marginTop: 6 }}>Ready to get locked in?</p>
      {goalLine && <p style={{ color: "#b08d57", fontSize: 13, fontWeight: 600, marginTop: 10 }}>{goalLine}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 18, marginTop: 30 }}>
        <StatCard label="Current streak" target={user.streak} suffix={user.streak === 1 ? " day" : " days"} icon={<Flame size={14} color="#F59E0B" />} />
        <StatCard label="Focus time today" target={todayMinutes} formatValue={formatHoursMinutes} />
        <StatCard label="Blocked sites" target={blockedSites.length} />
      </div>

      <div style={{ marginTop: 36, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>Choose your session mode</h2>
        <p style={{ color: "#7a7d84", fontSize: 14, marginBottom: 22, textAlign: "center" }}>
          Tap a mode to set it up, then lock in. Every mode runs on the same enforcement underneath —
          they just change the structure around it. Not sure which one? Custom is the flexible default.
        </p>

        <SessionModeFlow
          userId={user.id}
          onConfirmed={(cfg) => {
            setEntering(true);
            void handleStart(cfg);
          }}
        />
        {startError && <p style={{ color: "#f87171", fontSize: 13, marginTop: 14, textAlign: "center" }}>{startError}</p>}
      </div>

      <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Blocked sites</h2>
        <form onSubmit={handleAddSite} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <input
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            placeholder="e.g. youtube.com"
            style={{ flex: 1, minWidth: 0, background: "#101012", border: "1px solid #26262b", color: "#fff", padding: "12px 16px", borderRadius: 10, fontSize: 14, outline: "none" }}
          />
          <button
            type="submit"
            disabled={addingSite}
            style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.4)", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: addingSite ? 0.6 : 1 }}
          >
            {addingSite ? "Adding…" : "Add"}
          </button>
        </form>
        {siteError && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{siteError}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {blockedSites.length === 0 && <span style={{ color: "#7a7d84", fontSize: 14 }}>No sites blocked yet.</span>}
          {blockedSites.map((site) => (
            <span
              key={site.id}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171", padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600 }}
            >
              <Ban size={12} />
              {site.url}
              <button
                onClick={() => handleRemoveSite(site.url)}
                aria-label={`Remove ${site.url}`}
                style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Today&apos;s sessions</h2>
        {todaysSessions.length === 0 && <p style={{ color: "#7a7d84", fontSize: 14 }}>Nothing yet today — start your first session above.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {todaysSessions.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 14 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#d8d8dc" }}>
                <Lock size={13} color="#F59E0B" />
                {new Date(s.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}
              </span>
              <span style={{ color: s.completed ? "#22c55e" : "#f87171" }}>{s.completed ? `${s.duration_minutes ?? 0} min` : "Incomplete"}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
