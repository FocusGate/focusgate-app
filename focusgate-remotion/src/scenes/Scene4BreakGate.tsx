import { interpolate, spring, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { COLORS, FONT_BODY, FPS } from "../constants";

const ANSWERS = [38, 42, 45, 51];
const CORRECT_INDEX = 1;
const TIMER_START = 30;

/** 18-24s (this scene's own local frame 0-180): a Break Gate math question card drops in,
 *  its 30-second timer ticks down in real sync, the correct answer gets picked, then "Earn
 *  your breaks." lands. */
export function Scene4BreakGate({ localFrame }: { localFrame: number }) {
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;
  const base = Math.min(width, height);

  const cardScale = spring({ frame: localFrame, fps, config: { damping: 14 }, durationInFrames: 20 });
  const cardOpacity = interpolate(localFrame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const secondsLeft = Math.max(0, TIMER_START - Math.floor(localFrame / FPS));
  const timerUrgent = secondsLeft <= 10;

  const PICK_AT = 95;
  const pickProgress = spring({ frame: Math.max(0, localFrame - PICK_AT), fps, config: { damping: 11 }, durationInFrames: 12 });

  const textFrame = Math.max(0, localFrame - PICK_AT - 30);
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: cardWidth * 0.06 }}>
            <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: cardWidth * 0.052, color: COLORS.grey }}>Math Sprint</span>
            <div
              style={{
                width: cardWidth * 0.14,
                height: cardWidth * 0.14,
                borderRadius: "50%",
                border: `${cardWidth * 0.008}px solid ${timerUrgent ? COLORS.red : COLORS.gold}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_BODY,
                fontWeight: 800,
                fontSize: cardWidth * 0.06,
                color: timerUrgent ? COLORS.red : COLORS.gold,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {secondsLeft}
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              fontFamily: FONT_BODY,
              fontWeight: 800,
              fontSize: cardWidth * 0.14,
              color: COLORS.white,
              margin: `${cardWidth * 0.08}px 0`,
            }}
          >
            7 × 6 = ?
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: cardWidth * 0.04 }}>
            {ANSWERS.map((n, i) => {
              const isCorrect = i === CORRECT_INDEX;
              const picked = isCorrect && pickProgress > 0;
              return (
                <div
                  key={n}
                  style={{
                    padding: `${cardWidth * 0.045}px 0`,
                    textAlign: "center",
                    borderRadius: cardWidth * 0.025,
                    fontFamily: FONT_BODY,
                    fontWeight: 700,
                    fontSize: cardWidth * 0.06,
                    background: picked ? `rgba(245,158,11,${0.12 + pickProgress * 0.1})` : "#141416",
                    border: `1.5px solid ${picked ? COLORS.gold : "#26262b"}`,
                    color: picked ? COLORS.gold : COLORS.grey,
                    boxShadow: picked ? `0 0 ${cardWidth * 0.05 * pickProgress}px ${COLORS.gold}88` : "none",
                    transform: `scale(${picked ? 1 + pickProgress * 0.06 : 1})`,
                  }}
                >
                  {n}
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
