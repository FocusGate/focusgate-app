import { Flame } from "lucide-react";
import type { SessionFeedItem } from "@/lib/supabase";

export default function ActivityFeedItem({
  item,
  reaction,
  onReact,
}: {
  item: SessionFeedItem;
  reaction: { count: number; reactedByMe: boolean };
  onReact: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 14 }}>
      <div style={{ minWidth: 0 }}>
        <span style={{ color: "#d8d8dc" }}>
          {item.userName} {item.completed ? `locked in for ${item.durationMinutes ?? 0} min` : "started a session"}
        </span>
        <div style={{ color: "#5b5e66", fontSize: 12, marginTop: 2 }}>
          {new Date(item.startTime).toLocaleString("en-US", { timeZone: "UTC" })}
        </div>
      </div>
      <button
        onClick={onReact}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
          background: reaction.reactedByMe ? "rgba(245,158,11,0.15)" : "transparent",
          border: `1px solid ${reaction.reactedByMe ? "rgba(245,158,11,0.4)" : "#26262b"}`,
          color: reaction.reactedByMe ? "#F59E0B" : "#9a9da4",
          padding: "6px 12px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <Flame size={13} />
        {reaction.count > 0 ? reaction.count : ""}
      </button>
    </div>
  );
}
