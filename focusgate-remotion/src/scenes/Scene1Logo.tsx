import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { Background } from "../components/Background";
import { Logo } from "../components/Logo";
import { COLORS, FONT_DISPLAY, spd } from "../constants";

const WORDMARK = "FocusGate";
const LETTER_STAGGER = 1.5; // 0.05s @ 30fps, per the brief
const ICON_LAND_FRAME = 30; // roughly where the bounce has visually settled

/** 0-4s (padded): a heavyweight-champion entrance, not a quick pop. The lock drops from
 *  well above frame with a springy overshoot-then-settle, a gold shockwave rings out the
 *  instant it lands, and the wordmark builds itself in letter by letter underneath. */
export function Scene1Logo() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;
  const base = Math.min(width, height);

  // Heavy, underdamped spring — this specific config overshoots to roughly 1.1x its target
  // before settling, which is what turns a 220px drop into a ~20px overshoot-then-settle
  // once mapped through translateY below, instead of just easing to a stop.
  const dropSpring = spring({ frame: spd(frame), fps, config: { damping: 9, stiffness: 90, mass: 1.1 }, durationInFrames: 40 });
  const dropY = interpolate(dropSpring, [0, 1], [-220, 0]);
  const iconOpacity = interpolate(frame, [0, 4], [0, 1], { extrapolateRight: "clamp" });

  // The shockwave: a ring that expands and fades, timed to the icon's actual landing
  // rather than a fixed frame, so it never fires before the bounce has really settled.
  const glowFrame = Math.max(0, spd(frame) - spd(ICON_LAND_FRAME));
  const glowProgress = interpolate(glowFrame, [0, 26], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const glowOpacity = interpolate(glowFrame, [0, 6, 26], [0, 0.9, 0], { extrapolateRight: "clamp" });
  const ambientGlow = interpolate(frame, [0, ICON_LAND_FRAME, ICON_LAND_FRAME + 30], [0, 1, 0.8], { extrapolateRight: "clamp" });

  const iconSize = base * (isVertical ? 0.22 : 0.16);
  const wordmarkSize = base * (isVertical ? 0.1 : 0.075);
  const ringMax = iconSize * 2.6;

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
        <div style={{ position: "relative", width: iconSize, height: iconSize, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Shockwave ring — a single expanding, fading circle centered on the icon. */}
          <div
            style={{
              position: "absolute",
              width: ringMax * glowProgress,
              height: ringMax * glowProgress,
              borderRadius: "50%",
              border: `2px solid ${COLORS.gold}`,
              opacity: glowOpacity,
            }}
          />
          <div style={{ transform: `translateY(${dropY}px)`, opacity: iconOpacity }}>
            <Logo size={iconSize} glow={ambientGlow} />
          </div>
        </div>

        <div style={{ display: "flex" }}>
          {WORDMARK.split("").map((letter, i) => {
            const letterStart = ICON_LAND_FRAME - 6 + i * LETTER_STAGGER;
            const p = spring({ frame: Math.max(0, spd(frame) - spd(letterStart)), fps, config: { damping: 14 }, durationInFrames: 16 });
            const y = interpolate(p, [0, 1], [22, 0]);
            const opacity = interpolate(spd(frame) - spd(letterStart), [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  transform: `translateY(${y}px)`,
                  opacity,
                  fontFamily: FONT_DISPLAY,
                  fontSize: wordmarkSize,
                  fontWeight: 400,
                  letterSpacing: "0.01em",
                  color: COLORS.goldMuted,
                  textShadow: `0 0 ${base * 0.03}px ${COLORS.gold}44`,
                  whiteSpace: "pre",
                }}
              >
                {letter}
              </span>
            );
          })}
        </div>
      </div>
    </Background>
  );
}
