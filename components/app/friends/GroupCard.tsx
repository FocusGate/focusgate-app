import Avatar from "@/components/app/Avatar";
import PresenceBadge from "./PresenceBadge";
import type { GroupSummary, PresenceEntry } from "@/lib/supabase";

function minutesAgo(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export default function GroupCard({ group, presence }: { group: GroupSummary; presence: PresenceEntry[] }) {
  const presentIds = new Set(presence.map((p) => p.userId));

  return (
    <div style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{group.name}</div>
        <span style={{ color: "#5b5e66", fontSize: 12 }}>Code: {group.id}</span>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 16 }}>
        {group.members.map((m) => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 60, minWidth: 0 }}>
            <div style={{ position: "relative" }}>
              <Avatar name={m.name} size={40} />
              <PresenceBadge active={presentIds.has(m.id)} />
            </div>
            <span
              style={{ color: "#9a9da4", fontSize: 11, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}
            >
              {m.name.split(" ")[0]}
            </span>
          </div>
        ))}
      </div>

      {presence.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {presence.map((p) => (
            <div key={p.userId} style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}>
              🟢 {p.name} is locked in · {minutesAgo(p.startedAt)}m
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
