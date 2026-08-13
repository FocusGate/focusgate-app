import { interpolate, spring, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { TypewriterText } from "../components/TypewriterText";
import { COLORS, FONT_BODY, spd } from "../constants";
import { shakeOffset } from "../shake";

const ANSWERS = [38, 42, 45, 51];
const CORRECT_INDEX = 1;
const TIMER_START = 30; // the *displayed* countdown, in seconds — see secondsLeft below for why this isn't 1:1 with real elapsed time
const QUESTION_TYPE_START = 8;
// The visual sweep window: tuned so the bar actually passes through amber (57) then red
// (95) *before* PICK_AT — the tension needs to build ahead of the reveal, not after it.
const TIMER_SWEEP_FRAMES = 114;
const PICK_AT = 108;

/** 18-24s (padded): the question types itself out, a draining timer bar climbs from calm
 *  gold through amber to a pulsing red as it runs low, then the reveal — wrong answers
 *  shake and redden, the correct one flashes green with a checkmark — before "Earn your
 *  breaks." lands. */
export function Scene4BreakGate({ localFrame }: { localFrame: number }) {
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;
  const base = Math.min(width, height);

  const cardScale = spring({ frame: spd(localFrame), fps, config: { damping: 14 }, durationInFrames: 18 });
  const cardOpacity = interpolate(spd(localFrame), [0, 10], [0, 1], { extrapolateRight: "clamp" });

  // Swept across TIMER_SWEEP_FRAMES, not real elapsed seconds — a literal 1:1 mapping would
  // take the full real 30s to drain, but this scene is only ~6s long, so the bar would never
  // actually reach the amber/red urgency the brief asks to see. This is a display prop (like
  // Scene 3's flip clock showing a plausible mid-session time, not a literal live
  // countdown), compressed to fit what's actually on screen.
  const secondsLeft = Math.max(0, TIMER_START * (1 - localFrame / TIMER_SWEEP_FRAMES));
  const timerFraction = Math.max(0, secondsLeft / TIMER_START);
  const isAmber = secondsLeft <= 15;
  const isRed = secondsLeft <= 5;
  const timerColor = isRed ? COLORS.red : isAmber ? COLORS.amber : COLORS.gold;
  const redPulse = isRed ? 0.6 + Math.abs(Math.sin(localFrame / 4)) * 0.4 : 1;

  const pickProgress = spring({ frame: Math.max(0, spd(localFrame) - spd(PICK_AT)), fps, config: { damping: 12 }, durationInFrames: 12 });
  const revealed = pickProgress > 0.01;

  const textFrame = Math.max(0, spd(localFrame) - spd(PICK_AT + 26));
  const textOpacity = interpolate(textFrame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(textFrame, [0, 16], [14, 0], { extrapolateRight: "clamp" });

  const cardWidth = base * (isVertical ? 0.78 : 0.42);

  return (
    <Background glowY={40}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: base * 0.06 }}>
        <div
          style={{
            opacity: cardOpacity,
            transform: `scale(${cardScale})`,
            width: cardWidth,
            background: "#0A0A0A",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: base * 0.035,
            padding: cardWidth * 0.08,
            boxShadow: "0 40px 90px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: cardWidth * 0.04 }}>
            <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: cardWidth * 0.052, color: COLORS.grey }}>Math Sprint</span>
            <span style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: cardWidth * 0.052, color: timerColor, opacity: redPulse, fontVariantNumeric: "tabular-nums" }}>
              {Math.ceil(secondsLeft)}s
            </span>
          </div>

          {/* the draining timer bar */}
          <div style={{ width: "100%", height: cardWidth * 0.018, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: cardWidth * 0.07 }}>
            <div
              style={{
                width: `${timerFraction * 100}%`,
                height: "100%",
                background: timerColor,
                opacity: redPulse,
                boxShadow: isRed ? `0 0 ${cardWidth * 0.03}px ${COLORS.red}` : "none",
                transition: "background 0.3s ease",
              }}
            />
          </div>

          <div style={{ textAlign: "center", fontFamily: FONT_BODY, fontWeight: 800, fontSize: cardWidth * 0.14, color: COLORS.white, margin: `${cardWidth * 0.06}px 0`, minHeight: cardWidth * 0.17 }}>
            <TypewriterText text="7 × 6 = ?" startFrame={QUESTION_TYPE_START} framesPerChar={1.6} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: cardWidth * 0.04 }}>
            {ANSWERS.map((n, i) => {
              const isCorrect = i === CORRECT_INDEX;
              const wrongShake = revealed && !isCorrect ? shakeOffset(spd(localFrame), spd(PICK_AT), spd(10), 4) : 0;
              const checkOpacity = isCorrect ? interpolate(pickProgress, [0, 0.3, 1], [0, 0, 1]) : 0;
              return (
                <div
                  key={n}
                  style={{
                    position: "relative",
                    padding: `${cardWidth * 0.045}px 0`,
                    textAlign: "center",
                    borderRadius: cardWidth * 0.025,
                    fontFamily: FONT_BODY,
                    fontWeight: 700,
                    fontSize: cardWidth * 0.06,
                    background: revealed ? (isCorrect ? `rgba(34,197,94,${0.14 + pickProgress * 0.1})` : `rgba(239,68,68,${0.1 * pickProgress})`) : "#141416",
                    border: `1.5px solid ${revealed ? (isCorrect ? COLORS.green : COLORS.red) : "#26262b"}`,
                    color: revealed ? (isCorrect ? COLORS.green : COLORS.redDim) : COLORS.grey,
                    boxShadow: isCorrect && revealed ? `0 0 ${cardWidth * 0.05 * pickProgress}px ${COLORS.green}88` : "none",
                    transform: `translateX(${wrongShake}px) scale(${isCorrect && revealed ? 1 + pickProgress * 0.06 : 1})`,
                  }}
                >
                  {n}
                  {checkOpacity > 0 && (
                    <span style={{ position: "absolute", right: cardWidth * 0.04, top: "50%", transform: "translateY(-50%)", opacity: checkOpacity, color: COLORS.green }}>
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: base * (isVertical ? 0.052 : 0.042),
            color: COLORS.white,
            textAlign: "center",
          }}
        >
          <span style={{ color: COLORS.gold }}>Earn</span> your breaks.
        </div>
      </div>
    </Background>
  );
}
