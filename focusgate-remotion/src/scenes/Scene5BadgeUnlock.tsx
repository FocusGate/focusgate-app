import { interpolate, spring, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { TypewriterText } from "../components/TypewriterText";
import { COLORS, FONT_BODY, spd } from "../constants";

const PARTICLE_COUNT = 64;
const BADGE_NAME_START = 24;

// Deterministic particle field — no Math.random() (Remotion re-renders every frame and
// needs identical output each time). Angles spread evenly around the full circle (not just
// upward), each with an "arc" applied at render time via a parabolic vertical offset on top
// of the straight radial path, so the trajectory curves like a firework instead of a
// straight burst.
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const baseAngle = (i / PARTICLE_COUNT) * Math.PI * 2;
  const jitter = ((i * 37) % 17) / 17 - 0.5;
  return {
    angle: baseAngle + jitter * 0.3,
    distance: 0.7 + (((i * 53) % 29) / 29) * 0.65,
    size: 0.45 + (((i * 19) % 13) / 13) * 0.65,
    delay: (i % 6) * 1.2,
    arcStrength: 0.3 + (((i * 41) % 11) / 11) * 0.5,
  };
});

/** 24-28s (padded): a championship-win beat — a 2-frame white flash, the badge overshoots
 *  to 1.3x before settling, 64 particles arc outward in every direction, the badge name
 *  types itself out, then a "1% of users" subtitle lands. */
export function Scene5BadgeUnlock({ localFrame }: { localFrame: number }) {
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;
  const base = Math.min(width, height);

  const flashOpacity = interpolate(localFrame, [0, 1, 2, 5], [0, 1, 0.4, 0], { extrapolateRight: "clamp" });

  const badgeP = spring({ frame: spd(localFrame), fps, config: { damping: 7, stiffness: 140, mass: 0.8 }, durationInFrames: 24 });
  const badgeScale = interpolate(badgeP, [0, 1], [0, 1]);
  const badgeGlow = interpolate(localFrame, [0, 18, 55], [0, 1, 0.75], { extrapolateRight: "clamp" });

  const nameOpacity = interpolate(spd(localFrame) - spd(BADGE_NAME_START), [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nameY = interpolate(spd(localFrame) - spd(BADGE_NAME_START), [0, 16], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const SUBTITLE_START = BADGE_NAME_START + 20;
  const subtitleOpacity = interpolate(spd(localFrame) - spd(SUBTITLE_START), [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const badgeSize = base * (isVertical ? 0.34 : 0.24);
  const burstRadius = base * (isVertical ? 0.42 : 0.32);

  return (
    <Background glowY={32}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: badgeSize, height: badgeSize, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {PARTICLES.map((p, i) => {
            const t = Math.max(0, spd(localFrame) - p.delay);
            const travel = interpolate(t, [0, 40], [0, 1], { extrapolateRight: "clamp" });
            const eased = 1 - (1 - travel) * (1 - travel);
            const r = eased * burstRadius * p.distance;
            const opacity = interpolate(t, [0, 8, 32, 50], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const x = Math.cos(p.angle) * r;
            // Arc: straight radial motion plus a parabolic dip (rises then falls, like
            // gravity acting on a firework ember) scaled by each particle's own strength.
            const arc = Math.sin(eased * Math.PI) * burstRadius * 0.35 * p.arcStrength;
            const y = Math.sin(p.angle) * r - arc;
            const dotSize = base * 0.008 * p.size;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: dotSize,
                  height: dotSize,
                  borderRadius: "50%",
                  background: i % 3 === 0 ? COLORS.white : COLORS.gold,
                  opacity,
                  transform: `translate(${x - dotSize / 2}px, ${y - dotSize / 2}px)`,
                  boxShadow: `0 0 ${dotSize * 1.5}px ${COLORS.gold}`,
                }}
              />
            );
          })}

          {/* The actual FocusGate Legend badge glyph (components/app/badgeIcons.tsx's exact
              path + gradient — a gold/white/sky-blue gem, not a circle-and-star this video
              made up). Shown bare with a glow, matching how the real app's own unlock
              celebration presents it (app/(app)/badges/page.tsx), not wrapped in a coin —
              plus a slow continuous rotation, mirroring the real dashboard card's
              fg-gem-rotate animation on an unlocked Legendary badge. */}
          <div
            style={{
              transform: `scale(${badgeScale}) rotate(${(spd(localFrame) / 30) * (360 / 14)}deg)`,
              filter: `drop-shadow(0 0 ${badgeSize * 0.14 * badgeGlow}px ${COLORS.gold}cc) drop-shadow(0 0 ${badgeSize * 0.3 * badgeGlow}px ${COLORS.gold}66)`,
            }}
          >
            <svg width={badgeSize} height={badgeSize} viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient id="badge-gem" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={COLORS.gold} />
                  <stop offset="0.5" stopColor={COLORS.white} />
                  <stop offset="1" stopColor="#0EA5E9" />
                </linearGradient>
              </defs>
              <path d="M14 12h20l6 8-16 20L8 20z" fill="url(#badge-gem)" opacity="0.92" />
            </svg>
          </div>
        </div>

        <div style={{ marginTop: base * 0.045, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: base * 0.02, letterSpacing: "0.18em", color: COLORS.goldMuted, textTransform: "uppercase" }}>
            Legendary Badge Unlocked
          </div>
          <div
            style={{
              opacity: nameOpacity,
              transform: `translateY(${nameY}px)`,
              fontFamily: FONT_BODY,
              fontWeight: 800,
              letterSpacing: "0.02em",
              fontSize: base * (isVertical ? 0.062 : 0.05),
              color: COLORS.gold,
              marginTop: base * 0.012,
              minHeight: base * 0.08,
            }}
          >
            <TypewriterText text="FOCUSGATE LEGEND" startFrame={BADGE_NAME_START} framesPerChar={1.1} />
          </div>
          {/* Verbatim from LegendaryBadgeCard.tsx's unlocked state, not a paraphrase. */}
          <div style={{ opacity: subtitleOpacity, fontFamily: FONT_BODY, fontWeight: 600, fontStyle: "italic", fontSize: base * 0.022, color: COLORS.grey, marginTop: base * 0.014 }}>
            Only 1% of users ever unlock this.
          </div>
        </div>
      </div>

      {flashOpacity > 0 && <div style={{ position: "absolute", inset: 0, background: COLORS.white, opacity: flashOpacity }} />}
    </Background>
  );
}
