"use client";

import { useCallback, useEffect, useState } from "react";
import posthog from "posthog-js";
import { Unlock, Siren, PenLine, Zap, CheckCircle2, XCircle, DollarSign } from "lucide-react";
import GateSection, { GateRow } from "@/components/app/gates/GateSection";
import PillSelect from "@/components/app/gates/PillSelect";
import UsageRing from "@/components/app/gates/UsageRing";
import PreferenceToggle from "@/components/app/settings/PreferenceToggle";
import { useCurrentUserContext } from "@/contexts/CurrentUserContext";
import { MIN_BREAK_NOTE_WORDS, MAX_BREAK_NOTE_WORDS, DEFAULT_BREAK_SECONDS, daysUntilMonthlyReset } from "@/lib/stats";
import {
  getUserPreferences,
  updateUserPreferences,
  getBreakGateStats,
  getEmergencyUnblockStats,
  getEmergencyUnblockHistory,
  recordEmergencyUnblock,
  MAX_FREE_EMERGENCY_UNBLOCKS,
  getBreakNoteHistory,
  getBreakNoteStats,
  getUserGroups,
  getGroupForFriction,
  updateGroupSettings,
  getGroupLeaderboard,
  getGroupViolations,
  getSessionsWithoutViolation,
  recordWeeklyLeaderboardWin,
  type UserPreferences,
  type BreakGateChallenge,
  type BreakGateDifficulty,
  type BreakGateStats,
  type EmergencyUnblockStats,
  type EmergencyUnblockEntry,
  type BreakNote,
  type BreakNoteStats,
  type GroupSummary,
  type GroupForFriction,
  type LeaderboardEntry,
  type GroupViolation,
} from "@/lib/supabase";

// A failed break gate means the break never actually happened, so there's no real
// requested-duration to attribute the "extra focus minutes" to — breaks are custom-length
// now (1 second to 15 minutes), picked before the gate even runs. This uses the slider's
// own default as the best available estimate, same number this already assumed pre-redesign.
const BREAK_MINUTES = DEFAULT_BREAK_SECONDS / 60;

const CHALLENGE_OPTIONS: { value: BreakGateChallenge; label: string }[] = [
  { value: "ask", label: "Ask me each time" },
  { value: "memory-match", label: "Memory Match" },
  { value: "math-sprint", label: "Math Sprint" },
  { value: "geography-quiz", label: "Geography Quiz" },
];

const DIFFICULTY_OPTIONS: { value: BreakGateDifficulty; label: string }[] = [
  { value: "easy", label: "Easy — 5s buffer" },
  { value: "normal", label: "Normal — 30s" },
  { value: "hard", label: "Hard — no slack" },
];

const COOLDOWN_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 0, label: "Off" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatGap(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}hr ${minutes % 60}min`;
}

export default function TheGatesPage() {
  const { user } = useCurrentUserContext();

  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [gateStats, setGateStats] = useState<BreakGateStats | null>(null);

  const [emergencyStats, setEmergencyStats] = useState<EmergencyUnblockStats | null>(null);
  const [emergencyHistory, setEmergencyHistory] = useState<EmergencyUnblockEntry[]>([]);
  const [buying, setBuying] = useState(false);

  const [noteHistory, setNoteHistory] = useState<BreakNote[]>([]);
  const [noteStats, setNoteStats] = useState<BreakNoteStats | null>(null);

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupForFriction | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [violations, setViolations] = useState<GroupViolation[]>([]);
  const [sessionsWithoutViolation, setSessionsWithoutViolation] = useState(0);

  const loadCore = useCallback(async (userId: string) => {
    const [p, gs, es, eh, nh, ns, gr, swv] = await Promise.all([
      getUserPreferences(userId),
      getBreakGateStats(userId, BREAK_MINUTES),
      getEmergencyUnblockStats(userId),
      getEmergencyUnblockHistory(userId, 10),
      getBreakNoteHistory(userId, 20),
      getBreakNoteStats(userId),
      getUserGroups(userId),
      getSessionsWithoutViolation(userId),
    ]);
    setPrefs(p);
    setGateStats(gs);
    setEmergencyStats(es);
    setEmergencyHistory(eh);
    setNoteHistory(nh);
    setNoteStats(ns);
    setGroups(gr);
    setSessionsWithoutViolation(swv);
    if (gr.length > 0) setGroupId((current) => current ?? gr[0].id);
  }, []);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadCore's setState calls are all inside an async body after its first await, never synchronous within this effect
    loadCore(user.id).catch(() => {});
  }, [user, loadCore]);

  useEffect(() => {
    if (!groupId || !user) return;
    let cancelled = false;
    Promise.all([getGroupForFriction(groupId), getGroupLeaderboard(groupId), getGroupViolations(groupId, 15)])
      .then(([g, lb, v]) => {
        if (cancelled) return;
        setGroup(g);
        setLeaderboard(lb);
        setViolations(v);
        // Best-effort "Iron Focus" tracking — records this ISO week as a win if the
        // current user is on top, then checks for a 4-consecutive-week streak. Must never
        // surface an error to the leaderboard render itself.
        recordWeeklyLeaderboardWin(groupId, user.id).catch(() => {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [groupId, user]);

  async function patchPrefs(patch: Partial<UserPreferences>) {
    if (!user) return;
    const previous = prefs;
    setPrefs((p) => (p ? { ...p, ...patch } : p));
    try {
      await updateUserPreferences(user.id, patch);
    } catch {
      setPrefs(previous);
    }
  }

  async function handleBuyEmergency() {
    if (!user || buying) return;
    setBuying(true);
    try {
      await recordEmergencyUnblock(user.id, null, "Purchased extra emergency unblock", true);
      posthog.capture("emergency_unblock_purchased");
      const [es, eh] = await Promise.all([getEmergencyUnblockStats(user.id), getEmergencyUnblockHistory(user.id, 10)]);
      setEmergencyStats(es);
      setEmergencyHistory(eh);
    } finally {
      setBuying(false);
    }
  }

  async function patchGroupSettings(patch: Parameters<typeof updateGroupSettings>[1]) {
    if (!groupId || !group) return;
    const previous = group;
    setGroup((g) => (g ? { ...g, settings: { ...g.settings, ...patch } } : g));
    try {
      await updateGroupSettings(groupId, patch);
    } catch {
      setGroup(previous);
    }
  }

  if (!user || !prefs) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a7d84" }}>Loading…</div>
    );
  }

  const isCreator = group && user.id === group.createdBy;

  return (
    <>
      <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(32px, 4vw, 44px)", color: "#fff", margin: 0 }}>The Gates</h1>
      <p style={{ color: "#9a9da4", fontSize: 15, marginTop: 8 }}>The system that keeps you locked in — configured your way.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 32, maxWidth: 720 }}>
        {/* ---------- Break Gates ---------- */}
        {/* No enable/disable toggle on purpose — a challenge before every break is
         *  mandatory, not optional. Only which challenge and how hard it is stay
         *  user-configurable. */}
        <GateSection
          icon={<Unlock size={19} color="#F59E0B" />}
          title="Break Gates"
          subtitle="Solve a challenge before your break starts. Always on."
          accent="#F59E0B"
        >
          <GateRow label="Default challenge" hint="What you're asked to solve for a break">
            <PillSelect options={CHALLENGE_OPTIONS} value={prefs.break_gate_default_challenge} onChange={(v) => patchPrefs({ break_gate_default_challenge: v })} accent="#F59E0B" />
          </GateRow>
          <GateRow label="Difficulty" hint="How much time you get to solve it">
            <PillSelect options={DIFFICULTY_OPTIONS} value={prefs.break_gate_difficulty} onChange={(v) => patchPrefs({ break_gate_difficulty: v })} accent="#F59E0B" />
          </GateRow>
          {gateStats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12, marginTop: 16 }}>
              <div style={{ background: "#101012", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#4ade80" }}>
                  <CheckCircle2 size={14} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Passed</span>
                </div>
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginTop: 4 }}>{gateStats.passedThisMonth}</div>
                <div style={{ color: "#5b5e66", fontSize: 11 }}>gates this month</div>
              </div>
              <div style={{ background: "#101012", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f87171" }}>
                  <XCircle size={14} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Failed</span>
                </div>
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginTop: 4 }}>{gateStats.failedThisMonth}</div>
                <div style={{ color: "#5b5e66", fontSize: 11 }}>
                  {gateStats.failedThisMonth > 0 ? `session continued for ${gateStats.extraFocusMinutes} extra min` : "no missed gates"}
                </div>
              </div>
            </div>
          )}
        </GateSection>

        {/* ---------- Emergency Unblock ---------- */}
        <GateSection icon={<Siren size={19} color="#EF4444" />} title="Emergency Unblock" subtitle="Real emergencies only." accent="#EF4444">
          {emergencyStats && (
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <UsageRing used={emergencyStats.usedThisMonth} max={MAX_FREE_EMERGENCY_UNBLOCKS} accent="#EF4444" />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ color: "#fff", fontSize: 28, fontWeight: 800 }}>
                  {Math.max(0, MAX_FREE_EMERGENCY_UNBLOCKS - emergencyStats.usedThisMonth)} / {MAX_FREE_EMERGENCY_UNBLOCKS}
                  <span style={{ fontSize: 14, color: "#7a7d84", fontWeight: 600 }}> remaining this month</span>
                </div>
                <div style={{ color: "#5b5e66", fontSize: 12, marginTop: 4 }}>Resets in {daysUntilMonthlyReset()} days</div>
                <button
                  onClick={handleBuyEmergency}
                  disabled={buying}
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    color: "#f87171",
                    border: "1px solid rgba(239,68,68,0.35)",
                    padding: "8px 16px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: buying ? "default" : "pointer",
                  }}
                >
                  <DollarSign size={13} />
                  {buying ? "Processing…" : "Buy extra emergency ($1)"}
                </button>
              </div>
            </div>
          )}

          {emergencyStats && (
            <div style={{ color: "#9a9da4", fontSize: 13, marginTop: 18 }}>
              Used <span style={{ color: "#fff", fontWeight: 700 }}>{emergencyStats.usedAllTime}</span> emergencies all-time.
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ color: "#7a7d84", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Recent history
            </div>
            {emergencyHistory.length === 0 ? (
              <p style={{ color: "#5b5e66", fontSize: 13 }}>No emergency unblocks yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {emergencyHistory.map((e) => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "#d8d8dc", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.reasonText}</span>
                    <span style={{ color: "#5b5e66", fontSize: 12, flexShrink: 0 }}>
                      {formatDate(e.createdAt)}
                      {e.wasPaid && " · paid"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GateSection>

        {/* ---------- Break Notes ---------- */}
        <GateSection
          icon={<PenLine size={19} color="#D97706" />}
          title="Break Notes"
          subtitle="Say why before you go."
          accent="#D97706"
          disabled={!prefs.break_notes_enabled}
        >
          <PreferenceToggle label="Enable Break Notes" checked={prefs.break_notes_enabled} onChange={(v) => patchPrefs({ break_notes_enabled: v })} />
          <p style={{ color: "#7a7d84", fontSize: 13, marginTop: 4 }}>Notes must be {MIN_BREAK_NOTE_WORDS}-{MAX_BREAK_NOTE_WORDS} words — not user-configurable.</p>

          {noteStats && (
            <div style={{ marginTop: 16 }}>
              {noteStats.themeBreakdown.length > 0 && (
                <p style={{ color: "#d8d8dc", fontSize: 13, lineHeight: 1.7 }}>
                  Your top break reasons:{" "}
                  {noteStats.themeBreakdown.map((t, i) => (
                    <span key={t.theme}>
                      <span style={{ color: "#D97706", fontWeight: 700 }}>
                        {t.theme} ({t.pct}%)
                      </span>
                      {i < noteStats.themeBreakdown.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </p>
              )}
              {noteStats.longestGapMinutes > 0 && (
                <p style={{ color: "#d8d8dc", fontSize: 13, marginTop: 2 }}>
                  Longest streak without a break: <span style={{ color: "#F59E0B", fontWeight: 700 }}>{formatGap(noteStats.longestGapMinutes)}</span>
                </p>
              )}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ color: "#7a7d84", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              History
            </div>
            {noteHistory.length === 0 ? (
              <p style={{ color: "#5b5e66", fontSize: 13 }}>No break notes yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                {noteHistory.map((n) => (
                  <div key={n.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ color: "#5b5e66", fontSize: 11 }}>{formatDate(n.createdAt)}</span>
                      {n.isEmergency && <span style={{ color: "#f87171", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Emergency</span>}
                    </div>
                    <p style={{ color: "#d8d8dc", fontSize: 13, margin: "3px 0 0" }}>{n.noteText}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GateSection>

        {/* ---------- Dead Man's Switch ---------- */}
        {groups.length > 0 && (
          <GateSection icon={<Zap size={19} color="#38BDF8" />} title="Dead Man's Switch" subtitle="Your group is watching." accent="#38BDF8">
            {groups.length > 1 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGroupId(g.id)}
                    style={{
                      background: g.id === groupId ? "#38BDF8" : "transparent",
                      color: g.id === groupId ? "#0a0a0a" : "#9a9da4",
                      border: `1px solid ${g.id === groupId ? "#38BDF8" : "rgba(255,255,255,0.15)"}`,
                      borderRadius: 999,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            {isCreator && group && (
              <>
                <PreferenceToggle
                  label="Public shame mode"
                  description="Notify group when someone tries blocked apps"
                  checked={group.settings.notifyOnViolation}
                  onChange={(v) => patchGroupSettings({ notifyOnViolation: v })}
                />
                <PreferenceToggle
                  label="Streak pause mode"
                  description="Pause the offender's streak"
                  checked={group.settings.pauseStreakOnViolation}
                  onChange={(v) => patchGroupSettings({ pauseStreakOnViolation: v })}
                />
                <GateRow label="Cooling off period">
                  <PillSelect options={COOLDOWN_OPTIONS} value={group.settings.cooldownMinutes} onChange={(v) => patchGroupSettings({ cooldownMinutes: v })} accent="#38BDF8" />
                </GateRow>
              </>
            )}

            <div style={{ color: "#d8d8dc", fontSize: 13, marginTop: 16 }}>
              Sessions completed without breaking: <span style={{ color: "#38BDF8", fontWeight: 700 }}>{sessionsWithoutViolation}</span>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ color: "#7a7d84", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Weekly leaderboard
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {leaderboard.map((entry, i) => (
                  <div key={entry.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#5b5e66", fontSize: 12, fontWeight: 700, width: 16 }}>{i + 1}</span>
                      <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{entry.name}</span>
                      {i === 0 && entry.violationCount === 0 && <span style={{ color: "#38BDF8", fontSize: 11, fontWeight: 700 }}>💪 Iron Focus</span>}
                    </div>
                    <span style={{ color: "#9a9da4", fontSize: 12 }}>{entry.sessionsCompleted} sessions</span>
                  </div>
                ))}
              </div>
            </div>

            {violations.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ color: "#7a7d84", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Notification log
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                  {violations.map((v) => (
                    <div key={v.id} style={{ color: "#9a9da4", fontSize: 12, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ color: v.userId === user.id ? "#f87171" : "#fff", fontWeight: 600 }}>{v.userId === user.id ? "You" : v.userName}</span>{" "}
                      touched a blocked site <span style={{ color: "#5b5e66" }}>· {formatDate(v.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GateSection>
        )}
      </div>
    </>
  );
}
