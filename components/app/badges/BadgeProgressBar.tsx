export default function BadgeProgressBar({ current, target, color = "#F59E0B" }: { current: number; target: number; color?: string }) {
  const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : 0;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ color: "#7a7d84", fontSize: 11, marginTop: 4 }}>
        {current} / {target}
      </div>
    </div>
  );
}
