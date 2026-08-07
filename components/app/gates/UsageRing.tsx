/** SVG ring gauge for "N used out of M" counters — same construction as FocusScoreCard
 *  (stroke-dasharray/dashoffset on a circle) but driven by a used/max pair instead of a
 *  0-100 score, and themeable per Gate section. */
export default function UsageRing({ used, max, accent, size = 96 }: { used: number; max: number; accent: string; size?: number }) {
  const R = 40;
  const CIRC = 2 * Math.PI * R;
  const pct = max > 0 ? Math.max(0, Math.min(1, used / max)) : 0;
  const offset = CIRC * (1 - pct);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={accent}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#fff", fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{Math.max(0, max - used)}</span>
        <span style={{ color: "#7a7d84", fontSize: 10, marginTop: 2 }}>left</span>
      </div>
    </div>
  );
}
