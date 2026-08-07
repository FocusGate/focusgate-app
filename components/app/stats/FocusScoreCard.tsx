/** SVG ring gauge for the 0-100 focus score — visually consistent with FlipClock's own
 *  hand-rolled progress ring. Reused on both the Stats page and the Session Complete screen. */
export default function FocusScoreCard({ score, label = "Focus score" }: { score: number; label?: string }) {
  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - Math.max(0, Math.min(100, score)) / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#F59E0B", fontSize: 26, fontWeight: 800 }}>{score}</span>
        </div>
      </div>
      <span style={{ color: "#7a7d84", fontSize: 12, fontWeight: 600 }}>{label}</span>
    </div>
  );
}
