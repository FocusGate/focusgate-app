import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { FlipDigit } from "../components/FlipDigit";
import { BLOCKED_SITES, COLORS, FONT_BODY, FPS } from "../constants";

const START_SECONDS = 47 * 60; // 00:47:00 — a plausible mid-session Locked In countdown

/** 10-18s (this scene's own local frame 0-240): the "Locked In Mode" badge settles in, the
 *  flip clock starts ticking down for real, blocked sites stack in one at a time, then
 *  "Start a session you can't quit." lands. */
export function Scene3LockedIn({ localFrame }: { localFrame: number }) {
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;
  const base = Math.min(width, height);

  const badgeOpacity = interpolate(localFrame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const dotPulse = 0.6 + Math.abs(Math.sin(localFrame / 8)) * 0.4;

  const clockScale = spring({ frame: Math.max(0, localFrame - 6), fps, config: { damping: 13 }, durationInFrames: 22 });
  const secondsLeft = Math.max(0, START_SECONDS - Math.floor(localFrame / FPS));
  const hh = Math.floor(secondsLeft / 3600);
  const mm = Math.floor((secondsLeft % 3600) / 60);
  const ss = secondsLeft % 60;

  const SITE_START = 60;
  const SITE_STEP = 22;

  const textFrame = Math.max(0, localFrame - 190);
  const textOpacity = interpolate(textFrame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(textFrame, [0, 18], [14, 0], { extrapolateRight: "clamp" });

  // FlipDigit's `scale` prop is a multiplier over its own default size (92x116px etc.),
  // not a pixel value — this is a flat tuned number per orientation, not base-derived, since
  // both compositions happen to share the same 1080 "base" (min(width,height)) regardless
  // of which dimension is 1080 vs 1920.
  const digitScale = isVertical ? 1.55 : 1.15;

  return (
    <Background glowY={28}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: base * 0.045,
        }}
      >
        <div
          style={{
            opacity: badgeOpacity,
            display: "inline-flex",
            alignItems: "center",
            gap: base * 0.016,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.35)",
            borderRadius: 999,
            padding: `${base * 0.014}px ${base * 0.028}px`,
          }}
        >
          <span style={{ width: base * 0.014, height: base * 0.014, borderRadius: "50%", background: COLORS.gold, opacity: dotPulse }} />
          <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: base * 0.02, letterSpacing: "0.18em", color: COLORS.gold, textTransform: "uppercase" }}>
            Locked In Mode
          </span>
        </div>

        <div style={{ transform: `scale(${clockScale})`, display: "flex", alignItems: "flex-start", gap: base * 0.012 }}>
          <FlipDigit value={hh} label="Hours" scale={digitScale} />
          <span style={{ fontFamily: FONT_BODY, fontSize: base * 0.05, fontWeight: 800, color: COLORS.goldMuted, lineHeight: `${base * 0.09}px` }}>:</span>
          <FlipDigit value={mm} label="Minutes" scale={digitScale} />
          <span style={{ fontFamily: FONT_BODY, fontSize: base * 0.05, fontWeight: 800, color: COLORS.goldMuted, lineHeight: `${base * 0.09}px` }}>:</span>
          <FlipDigit value={ss} label="Seconds" scale={digitScale} />
        </div>

        <div style={{ display: "flex", gap: base * 0.014, flexWrap: "wrap", justifyContent: "center", maxWidth: base * 0.85 }}>
          {BLOCKED_SITES.map((site, i) => {
            const appearAt = SITE_START + i * SITE_STEP;
            const p = spring({ frame: Math.max(0, localFrame - appearAt), fps, config: { damping: 12 }, durationInFrames: 14 });
            const op = interpolate(localFrame, [appearAt, appearAt + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={site}
                style={{
                  opacity: op,
                  transform: `scale(${0.8 + p * 0.2})`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: base * 0.008,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  color: COLORS.redDim,
                  padding: `${base * 0.01}px ${base * 0.018}px`,
                  borderRadius: 999,
                  fontFamily: FONT_BODY,
                  fontSize: base * 0.018,
                  fontWeight: 600,
                }}
              >
                <svg width={base * 0.014} height={base * 0.014} viewBox="0 0 10 10">
                  <line x1="1" y1="1" x2="9" y2="9" stroke={COLORS.red} strokeWidth="1.6" strokeLinecap="round" />
                  <line x1="9" y1="1" x2="1" y2="9" stroke={COLORS.red} strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                {site}
              </div>
            );
          })}
        </div>

        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: base * (isVertical ? 0.048 : 0.038),
            color: COLORS.white,
            textAlign: "center",
            maxWidth: base * 0.85,
            marginTop: base * 0.01,
          }}
        >
          Start a session you <span style={{ color: COLORS.gold }}>can&apos;t quit</span>.
        </div>
      </div>
    </Background>
  );
}
