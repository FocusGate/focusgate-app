import { interpolate, spring, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { COLORS, FONT_BODY, FONT_DISPLAY } from "../constants";

const PARTICLE_COUNT = 28;

// Deterministic particle field — no Math.random() (Remotion re-renders every frame and
// needs the exact same output each time, same reasoning as the main app's own
// TheLounge.tsx avoiding it for SSR/client parity). Angles spread evenly around the circle,
// each nudged by a simple per-index formula so they don't look like a perfect starburst.
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const baseAngle = (i / PARTICLE_COUNT) * Math.PI * 2;
  const jitter = ((i * 37) % 17) / 17 - 0.5; // -0.5..0.5, deterministic per index
  return {
    angle: baseAngle + jitter * 0.35,
    distance: 0.75 + (((i * 53) % 29) / 29) * 0.55, // 0.75..1.3, varies burst radius
    size: 0.5 + (((i * 19) % 13) / 13) * 0.6, // 0.5..1.1
    delay: (i % 5) * 1.5, // small stagger so the burst isn't perfectly synchronized
  };
});

/** 24-28s (this scene's own local frame 0-120): the badge scales in with an overshoot pop,
 *  gold particles burst outward from it, then the badge name settles below. */
export function Scene5BadgeUnlock({ localFrame }: { localFrame: number }) {
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;
  const base = Math.min(width, height);

  const badgeScale = spring({ frame: localFrame, fps, config: { damping: 8, mass: 0.7 }, durationInFrames: 22 });
  const badgeGlow = interpolate(localFrame, [0, 20, 60], [0, 1, 0.75], { extrapolateRight: "clamp" });

  const nameFrame = Math.max(0, localFrame - 26);
  const nameOpacity = interpolate(nameFrame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const nameY = interpolate(nameFrame, [0, 16], [14, 0], { extrapolateRight: "clamp" });

  const badgeSize = base * (isVertical ? 0.34 : 0.24);
  const burstRadius = base * (isVertical ? 0.38 : 0.28);

  return (
    <Background glowY={32}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: badgeSize, height: badgeSize, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {PARTICLES.map((p, i) => {
            const t = Math.max(0, localFrame - p.delay);
            const travel = interpolate(t, [0, 34], [0, 1], { extrapolateRight: "clamp" });
            const eased = 1 - (1 - travel) * (1 - travel); // ease-out
            const r = eased * burstRadius * p.distance;
            const opacity = interpolate(t, [0, 8, 30, 44], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const x = Math.cos(p.angle) * r;
            const y = Math.sin(p.angle) * r;
            const dotSize = base * 0.009 * p.size;
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

          <div
            style={{
              position: "relative",
              width: badgeSize,
              height: badgeSize,
              borderRadius: "50%",
              transform: `scale(${badgeScale})`,
              background: `radial-gradient(circle at 35% 30%, ${COLORS.goldLight}, ${COLORS.gold} 55%, ${COLORS.goldMuted} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 ${badgeSize * 0.5 * badgeGlow}px ${COLORS.gold}aa, 0 0 ${badgeSize * 1.1 * badgeGlow}px ${COLORS.gold}55`,
            }}
          >
            <svg width={badgeSize * 0.46} height={badgeSize * 0.46} viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z"
                fill={COLORS.black}
              />
            </svg>
          </div>
        </div>

        <div
          style={{
            opacity: nameOpacity,
            transform: `translateY(${nameY}px)`,
            marginTop: base * 0.045,
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: base * 0.02, letterSpacing: "0.18em", color: COLORS.goldMuted, textTransform: "uppercase" }}>
            Legendary Badge Unlocked
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: base * (isVertical ? 0.07 : 0.055), color: COLORS.white, marginTop: base * 0.012 }}>
            FocusGate Legend
          </div>
        </div>
      </div>
    </Background>
  );
}
