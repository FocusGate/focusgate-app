import { formatHoursMinutes } from "@/lib/stats";

export default function ProductivityInsights({
  mostProductive,
  bestDay,
}: {
  mostProductive: { label: string; minutes: number } | null;
  bestDay: { date: string; minutes: number } | null;
}) {
  const hasBestDay = !!bestDay && bestDay.minutes > 0;

  return (
    <div className="fg-app-2col" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18 }}>
      <div style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, minWidth: 0 }}>
        <div style={{ color: "#7a7d84", fontSize: 13, fontWeight: 600 }}>Most productive time</div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginTop: 8 }}>{mostProductive ? mostProductive.label : "—"}</div>
      </div>
      <div style={{ background: "#0A0A0A", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 16, padding: 20, minWidth: 0 }}>
        <div style={{ color: "#F59E0B", fontSize: 13, fontWeight: 700 }}>🏆 Best day ever</div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginTop: 8 }}>{hasBestDay ? formatHoursMinutes(bestDay.minutes) : "—"}</div>
        {hasBestDay && (
          <div style={{ color: "#7a7d84", fontSize: 12, marginTop: 4 }}>
            {new Date(bestDay.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
          </div>
        )}
      </div>
    </div>
  );
}
