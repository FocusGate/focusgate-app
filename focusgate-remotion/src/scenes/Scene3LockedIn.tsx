import { interpolate, spring, useVideoConfig, Easing } from "remotion";
import { Background } from "../components/Background";
import { FlipDigit } from "../components/FlipDigit";
import { BLOCKED_SITES, COLORS, FONT_BODY, FPS, spd } from "../constants";
import { shakeOffset } from "../shake";

const START_SECONDS = 47 * 60; // 00:47:00 — a plausible mid-session Locked In countdown

// ---------- beat timings (scene-local frames, pre-spd()) ----------
const BLACK_HOLD = 15; // 0.5s dead black before anything happens
const LINE_START = BLACK_HOLD;
const LINE_DURATION = 16; // gold line drawing itself across
const TITLE_START = LINE_START + 14; // both halves start sliding in
const TITLE_IMPACT = TITLE_START + 13; // where they collide — shake/flash fires here
const TITLE_HOLD_UNTIL = TITLE_IMPACT + 16; // brief hold once it lands
const TITLE_FADE_DURATION = 10;
const CLOCK_START = TITLE_HOLD_UNTIL - 4; // clock/pill begin as the title fades, not after
const DIGIT_STAGGER = 6; // hours -> minutes -> seconds stamp-in gap
const SITE_START = CLOCK_START + 42;
const SITE_STEP = 3; // 0.1s @ 30fps, per the brief
const TAGLINE_START = SITE_START + BLOCKED_SITES.length * SITE_STEP + 24;

/** 10-18s (padded): the hero moment, staged like a trailer beat rather than a UI appearing —
 *  black hold, a line draws itself, the title slams together from both sides, then the
 *  actual Locked In UI (pill, flip clock, blocked sites) stamps in underneath it. */
export function Scene3LockedIn({ localFrame }: { localFrame: number }) {
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;
  const base = Math.min(width, height);

  // ---- black hold + line draw ----
  const blackOpacity = interpolate(localFrame, [BLACK_HOLD - 1, BLACK_HOLD + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineProgress = interpolate(spd(localFrame) - spd(LINE_START), [0, LINE_DURATION], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const lineOpacity = interpolate(localFrame, [LINE_START, LINE_START + 2, TITLE_IMPACT, TITLE_IMPACT + 10], [0, 1, 1, 0], { extrapolateRight: "clamp" });

  // ---- title: two halves colliding ----
  const titleP = spring({ frame: Math.max(0, spd(localFrame) - spd(TITLE_START)), fps, config: { damping: 12, stiffness: 200, mass: 0.7 }, durationInFrames: 16 });
  const leftX = interpolate(titleP, [0, 1], [-base * 0.6, 0]);
  const rightX = interpolate(titleP, [0, 1], [base * 0.6, 0]);
  const titleInOpacity = interpolate(localFrame, [TITLE_START, TITLE_START + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOutOpacity = interpolate(spd(localFrame), [spd(TITLE_HOLD_UNTIL), spd(TITLE_HOLD_UNTIL + TITLE_FADE_DURATION)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = titleInOpacity * titleOutOpacity;
  const impactShake = shakeOffset(spd(localFrame), spd(TITLE_IMPACT), spd(8), 6);
  const impactFlash = interpolate(localFrame, [TITLE_IMPACT, TITLE_IMPACT + 2, TITLE_IMPACT + 9], [0, 0.5, 0], { extrapolateRight: "clamp" });

  // ---- pill badge (fades in as the title fades out) ----
  const pillOpacity = interpolate(spd(localFrame) - spd(CLOCK_START), [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dotPulse = 0.6 + Math.abs(Math.sin(localFrame / 8)) * 0.4;

  // ---- flip clock: each digit "stamps" in (drops + scales down hard, tiny bounce) ----
  const secondsLeft = Math.max(0, START_SECONDS - Math.floor(localFrame / FPS));
  const hh = Math.floor(secondsLeft / 3600);
  const mm = Math.floor((secondsLeft % 3600) / 60);
  const ss = secondsLeft % 60;
  const digitScale = isVertical ? 1.55 : 1.15;

  function stampTransform(startFrame: number) {
    const p = spring({ frame: Math.max(0, spd(localFrame) - spd(startFrame)), fps, config: { damping: 8, stiffness: 260, mass: 0.7 }, durationInFrames: 12 });
    const scale = interpolate(p, [0, 1], [2.2, 1]);
    const y = interpolate(p, [0, 1], [-40, 0]);
    const opacity = interpolate(spd(localFrame) - spd(startFrame), [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return { transform: `translateY(${y}px) scale(${scale})`, opacity };
  }

  // ---- blocked sites: fly in from the right, staggered, each with a small bounce ----
  const TAGLINE_TEXT = ["Start a session you ", "can't quit", "."];
  const taglineOpacity = interpolate(spd(localFrame) - spd(TAGLINE_START), [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const taglineY = interpolate(spd(localFrame) - spd(TAGLINE_START), [0, 16], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          transform: `translateX(${impactShake}px)`,
        }}
      >
        {/* the drawing line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: base * 0.7 * lineProgress,
            height: 2,
            background: COLORS.gold,
            opacity: lineOpacity,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 ${base * 0.02}px ${COLORS.gold}`,
          }}
        />

        {/* the two-halves title */}
        {titleOpacity > 0.001 && (
          <div style={{ position: "absolute", display: "flex", opacity: titleOpacity, fontFamily: FONT_BODY, fontWeight: 800, fontSize: base * (isVertical ? 0.072 : 0.058), color: COLORS.gold }}>
            <span style={{ transform: `translateX(${leftX}px)` }}>LOCKED IN&nbsp;</span>
            <span style={{ transform: `translateX(${rightX}px)` }}>MODE</span>
          </div>
        )}
        {impactFlash > 0 && <div style={{ position: "absolute", inset: 0, background: COLORS.gold, opacity: impactFlash, mixBlendMode: "screen" }} />}

        {/* the functional UI underneath, fading in as the title clears */}
        <div
          style={{
            opacity: pillOpacity,
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

        <div style={{ display: "flex", alignItems: "flex-start", gap: base * 0.012 }}>
          <div style={stampTransform(CLOCK_START + 8)}>
            <FlipDigit value={hh} label="Hours" scale={digitScale} />
          </div>
          <span style={{ fontFamily: FONT_BODY, fontSize: base * 0.05, fontWeight: 800, color: COLORS.goldMuted, lineHeight: `${base * 0.09}px`, opacity: pillOpacity }}>:</span>
          <div style={stampTransform(CLOCK_START + 8 + DIGIT_STAGGER)}>
            <FlipDigit value={mm} label="Minutes" scale={digitScale} />
          </div>
          <span style={{ fontFamily: FONT_BODY, fontSize: base * 0.05, fontWeight: 800, color: COLORS.goldMuted, lineHeight: `${base * 0.09}px`, opacity: pillOpacity }}>:</span>
          <div style={stampTransform(CLOCK_START + 8 + DIGIT_STAGGER * 2)}>
            <FlipDigit value={ss} label="Seconds" scale={digitScale} />
          </div>
        </div>

        <div style={{ display: "flex", gap: base * 0.014, flexWrap: "wrap", justifyContent: "center", maxWidth: base * 0.85 }}>
          {BLOCKED_SITES.map((site, i) => {
            const appearAt = SITE_START + i * SITE_STEP;
            const p = spring({ frame: Math.max(0, spd(localFrame) - spd(appearAt)), fps, config: { damping: 10, stiffness: 220 }, durationInFrames: 12 });
            const x = interpolate(p, [0, 1], [base * 0.5, 0]);
            const op = interpolate(spd(localFrame) - spd(appearAt), [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={site}
                style={{
                  opacity: op,
                  transform: `translateX(${x}px)`,
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
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: base * (isVertical ? 0.048 : 0.038),
            color: COLORS.white,
            textAlign: "center",
            maxWidth: base * 0.85,
            marginTop: base * 0.01,
          }}
        >
          {TAGLINE_TEXT[0]}
          <span style={{ color: COLORS.gold }}>{TAGLINE_TEXT[1]}</span>
          {TAGLINE_TEXT[2]}
        </div>
      </div>

      {blackOpacity > 0.001 && <div style={{ position: "absolute", inset: 0, background: COLORS.black, opacity: blackOpacity }} />}
    </Background>
  );
}
