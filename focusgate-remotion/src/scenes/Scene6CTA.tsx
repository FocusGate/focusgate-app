import { interpolate, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { Logo } from "../components/Logo";
import { TypewriterText } from "../components/TypewriterText";
import { COLORS, FONT_BODY, spd } from "../constants";

const URL_START = 6;
const SUBTITLE_START = 30;

/** A real lub-dub heartbeat curve, not a plain sine wave — two close pulses (the "lub" a
 *  touch stronger than the "dub") then a long rest, repeating. Returns roughly 0-1. */
function heartbeat(frame: number) {
  const cycle = 46;
  const t = frame % cycle;
  const bump = (center: number, width: number, amp: number) => amp * Math.exp(-(((t - center) / width) ** 2));
  return bump(3, 2.4, 1) + bump(11, 2.6, 0.7);
}

/** 28-30s (padded): only ~2 seconds of real content, by necessity — the lock pulses with a
 *  genuine heartbeat rhythm throughout while "focusgate.site" writes itself out letter by
 *  letter, then "Free during beta." lands underneath. */
export function Scene6CTA({ localFrame }: { localFrame: number }) {
  const { width, height } = useVideoConfig();
  const isVertical = height > width;
  const base = Math.min(width, height);

  const iconOpacity = interpolate(localFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const beat = heartbeat(spd(localFrame));
  const pulse = 1 + beat * 0.1;
  const glow = 0.55 + beat * 0.45;

  const subOpacity = interpolate(spd(localFrame) - spd(SUBTITLE_START), [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Background>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: base * 0.035 }}>
        <div style={{ opacity: iconOpacity, transform: `scale(${pulse})` }}>
          <Logo size={base * (isVertical ? 0.14 : 0.1)} glow={glow} />
        </div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: base * (isVertical ? 0.075 : 0.06),
            letterSpacing: "-0.01em",
            minHeight: base * 0.09,
          }}
        >
          {/* Two segments, not one — "focusgate" white, ".site" gold, matching the brand
              mark's own two-tone treatment. The second segment's startFrame is timed to
              begin right as "focusgate" (9 chars) finishes typing, accounting for spd(). */}
          <TypewriterText text="focusgate" startFrame={URL_START} framesPerChar={1.1} cursor={false} style={{ color: COLORS.white }} />
          <TypewriterText text=".site" startFrame={URL_START + 9} framesPerChar={1.1} style={{ color: COLORS.gold }} />
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
