import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT_BODY, FPS } from "../constants";

/**
 * A brand-matched but simplified stand-in for the real app's FlipUnit.tsx (the actual
 * component uses imperative framer-motion animate() calls against live DOM refs — not
 * something to port into a frame-deterministic Remotion render). Same dark card + gold
 * digit + uppercase label look; the "flip" here is a lightweight per-second rotateX pulse
 * driven by Remotion's own frame math instead of the real mechanical two-panel flip.
 */
export function FlipDigit({ value, label, scale = 1 }: { value: number; label: string; scale?: number }) {
  const frame = useCurrentFrame();
  const display = String(Math.max(0, value)).padStart(2, "0");

  // A quick "flip" pulse at the start of every simulated second (30 frames), settling by
  // frame 10 of each — reads as a digit tick without needing to track the previous value.
  const intoSecond = frame % FPS;
  const flip = interpolate(intoSecond, [0, 5, 10], [1, 0.62, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * scale }}>
      <div
        style={{
          position: "relative",
          width: 92 * scale,
          height: 116 * scale,
          borderRadius: 14 * scale,
          background: "linear-gradient(180deg, #101012, #0A0A0A)",
          border: `1.5px solid #3a2f1c`,
          boxShadow: "0 20px 40px rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          transform: `scaleY(${flip})`,
        }}
      >
        {/* seam line, matching the real two-panel flip unit's split */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: "rgba(0,0,0,0.6)" }} />
        <span
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 56 * scale,
            color: COLORS.gold,
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 0 24px ${COLORS.gold}55`,
          }}
        >
          {display}
        </span>
      </div>
      <span
        style={{
          fontFamily: FONT_BODY,
          fontSize: 12 * scale,
          fontWeight: 700,
          letterSpacing: "0.16em",
          color: COLORS.greyDim,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}
