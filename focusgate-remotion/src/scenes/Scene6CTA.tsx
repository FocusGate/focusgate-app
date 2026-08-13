import { interpolate, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { LockIcon } from "../components/LockIcon";
import { COLORS, FONT_BODY } from "../constants";

/** 28-30s (this scene's own local frame 0-60): everything here is quick by necessity —
 *  only 2 seconds. The lock pulses continuously (a heartbeat, not a one-shot entrance) while
 *  the URL and "Free during beta." fade straight in under it. */
export function Scene6CTA({ localFrame }: { localFrame: number }) {
  const { width, height } = useVideoConfig();
  const isVertical = height > width;
  const base = Math.min(width, height);

  const iconOpacity = interpolate(localFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const pulse = 1 + Math.sin(localFrame / 6) * 0.08;
  const glow = 0.7 + Math.sin(localFrame / 6) * 0.3;

  const urlOpacity = interpolate(localFrame, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOpacity = interpolate(localFrame, [18, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Background>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: base * 0.035 }}>
        <div style={{ opacity: iconOpacity, transform: `scale(${pulse})` }}>
          <LockIcon size={base * (isVertical ? 0.14 : 0.1)} color={COLORS.gold} glow={glow} />
        </div>
        <div
          style={{
            opacity: urlOpacity,
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: base * (isVertical ? 0.075 : 0.06),
            color: COLORS.white,
            letterSpacing: "-0.01em",
          }}
        >
          focusgate<span style={{ color: COLORS.gold }}>.site</span>
        </div>
        <div
          style={{
            opacity: subOpacity,
            fontFamily: FONT_BODY,
            fontWeight: 600,
            fontSize: base * (isVertical ? 0.028 : 0.022),
            color: COLORS.grey,
          }}
        >
          Free during beta.
        </div>
      </div>
    </Background>
  );
}
