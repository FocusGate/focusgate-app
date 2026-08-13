import { useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate } from "remotion";
import { COLORS, TOTAL_DURATION_FRAMES } from "../constants";

/** Thin gold bar across the very bottom, filling over the whole video's real (absolute)
 *  duration — rendered once at the top level, a sibling of the TransitionSeries rather than
 *  inside it, specifically so it reads off the timeline's true frame count and isn't reset
 *  or offset by any scene's own local frame numbering. */
export function ProgressBar() {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const progress = interpolate(frame, [0, TOTAL_DURATION_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const barHeight = Math.max(3, Math.round(height * 0.0025));

  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: barHeight, background: "rgba(255,255,255,0.06)" }}>
      <div
        style={{
          height: "100%",
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, ${COLORS.goldMuted}, ${COLORS.gold})`,
          boxShadow: `0 0 ${barHeight * 3}px ${COLORS.gold}aa`,
        }}
      />
    </div>
  );
}
