"use client";

import { useEffect, useState } from "react";
import { getCramReportStats, getGroupStudySummary, type CramReportStats, type GroupStudyMemberResult } from "@/lib/supabase";
import type { SessionMode } from "@/lib/sessionModes";

/** The mode-specific slot on the Session Complete screen — Exam Cram's Cram Report,
 *  Group Study's who-finished/who-broke summary, All Nighter's sleep note. Renders
 *  nothing for Pomodoro/Deep Focus/Custom, which don't have an end-of-session variant. */
export default function ModeCompleteExtra({
  mode,
  sessionId,
  groupId,
  sessionStartIso,
}: {
  mode: SessionMode;
  sessionId: string;
  groupId: string | null;
  sessionStartIso: string;
}) {
  if (mode === "exam_cram") return <CramReport sessionId={sessionId} />;
  if (mode === "group_study" && groupId) return <GroupSummary groupId={groupId} sinceIso={sessionStartIso} />;
  if (mode === "all_nighter") return <SleepNote />;
  return null;
}

function CramReport({ sessionId }: { sessionId: string }) {
  const [stats, setStats] = useState<CramReportStats | null>(null);

  useEffect(() => {
    getCramReportStats(sessionId)
      .then(setStats)
      .catch(() => {});
  }, [sessionId]);

  return (
    <div style={{ background: "#0A0A0A", border: "1px solid rgba(217,119,6,0.3)", borderRadius: 16, padding: 22 }}>
      <div style={{ color: "#D97706", fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Cram Report</div>
      {stats ? (
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 14, textAlign: "center" }}>
          <Stat label="Gates faced" value={stats.gatesFaced} />
          <Stat label="Gates passed" value={stats.gatesPassed} />
          <Stat label="Distractions blocked" value={stats.gatesFaced} />
        </div>
      ) : (
        <p style={{ color: "#7a7d84", fontSize: 13, marginTop: 10 }}>Tallying…</p>
      )}
    </div>
  );
}

function GroupSummary({ groupId, sinceIso }: { groupId: string; sinceIso: string }) {
  const [members, setMembers] = useState<GroupStudyMemberResult[] | null>(null);

  useEffect(() => {
    getGroupStudySummary(groupId, sinceIso)
      .then(setMembers)
      .catch(() => {});
  }, [groupId, sinceIso]);

  return (
    <div style={{ background: "#0A0A0A", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 16, padding: 22 }}>
      <div style={{ color: "#3B82F6", fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Group summary</div>
      {!members && <p style={{ color: "#7a7d84", fontSize: 13, marginTop: 10 }}>Checking in with the group…</p>}
      {members && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {members.map((m) => (
            <div key={m.userId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#d8d8dc" }}>{m.name}</span>
              <span style={{ color: m.broke ? "#f87171" : m.finished ? "#4ade80" : "#7a7d84" }}>
                {m.broke ? "Broke early" : m.finished ? "Finished 🔥" : "Still locked in"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SleepNote() {
  return (
    <div style={{ background: "#0A0A0A", border: "1px solid rgba(79,70,229,0.3)", borderRadius: 16, padding: "18px 22px", textAlign: "center" }}>
      <p style={{ color: "#A5B4FC", fontSize: 13, margin: 0 }}>🌙 Consider a full night&apos;s sleep tomorrow.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>{value}</div>
      <div style={{ color: "#7a7d84", fontSize: 11, marginTop: 2 }}>{label}</div>
    </div>
  );
}
