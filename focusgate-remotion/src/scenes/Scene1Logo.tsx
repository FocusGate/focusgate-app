import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { LockIcon } from "../components/LockIcon";
import { COLORS, FONT_DISPLAY } from "../constants";

/** 0-4s: the lock mark scales up with a growing gold glow, then the wordmark settles in
 *  beside/below it. Both driven by spring() so the motion has real weight instead of a
 *  linear ease — matches the snap the rest of the brand's own hover/entrance motion has. */
export function Scene1Logo() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;
  const base = Math.min(width, height);

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.6 }, durationInFrames: 28 });
  const glow = interpolate(frame, [0, 30, 55], [0, 1, 0.85], { extrapolateRight: "clamp" });

  const wordmarkFrame = Math.max(0, frame - 28);
  const wordmarkProgress = spring({ frame: wordmarkFrame, fps, config: { damping: 14 }, durationInFrames: 24 });
  const wordmarkOpacity = interpolate(wordmarkFrame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  const iconSize = base * (isVertical ? 0.22 : 0.16);
  const wordmarkSize = base * (isVertical ? 0.1 : 0.075);

  return (
    <Background>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: base * 0.05,
        }}
      >
        <div style={{ transform: `scale(${iconScale})` }}>
          <LockIcon size={iconSize} color={COLORS.gold} glow={glow} />
        </div>
        <div
          style={{
            opacity: wordmarkOpacity,
            transform: `translateY(${(1 - wordmarkProgressSafe(wordmarkProgress)) * 24}px)`,
            fontFamily: FONT_DISPLAY,
            fontSize: wordmarkSize,
            fontWeight: 400,
            letterSpacing: "0.01em",
            color: COLORS.goldMuted,
            textShadow: `0 0 ${base * 0.03}px ${COLORS.gold}44`,
          }}
        >
          FocusGate
        </div>
      </div>
    </Background>
  );
}

// spring() can briefly overshoot past 1 — clamped here only for the translateY easing so
// the wordmark doesn't dip *below* its resting position on the settle-back bounce.
function wordmarkProgressSafe(v: number) {
  return Math.min(1, v);
}
