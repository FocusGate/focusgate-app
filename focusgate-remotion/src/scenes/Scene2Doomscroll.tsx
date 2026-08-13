import { interpolate, spring, useVideoConfig, Easing } from "remotion";
import { Background } from "../components/Background";
import { COLORS, FONT_BODY, spd } from "../constants";
import { shakeOffset } from "../shake";

// Deliberately generic — an abstracted "social feed" (avatar + caption lines + image card +
// like/comment row), not a recreation of any specific real app's UI, logo, or wordmark.
// Brighter/more saturated than a real muted-UI palette would be — this needs to read
// clearly as "a feed" at a glance in a fast-cut promo, not sit at realistic low contrast.
const POST_TONES = ["#6B4F2A", "#4A3F6B", "#2A6B57", "#6B2A45", "#2A456B", "#5A522A"];

// Deterministic per-post like/comment counts (no Math.random() — same reasoning as the
// particle fields elsewhere) so each card in the stack shows a different, plausible number
// rather than the same placeholder repeated.
function fakeLikes(index: number) {
  const n = ((index * 1471 + 2300) % 18000) + 900;
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}
function fakeComments(index: number) {
  return String(((index * 53 + 40) % 800) + 20);
}

function CommentLine({ width }: { width: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: width * 0.025 }}>
      <div style={{ width: width * 0.06, height: width * 0.06, borderRadius: "50%", background: "#5a5d66", flexShrink: 0 }} />
      <div style={{ width: width * (0.35 + ((width * 7) % 20) / 100), height: width * 0.018, borderRadius: 3, background: "#3f424b" }} />
    </div>
  );
}

function FeedPost({ tone, cardWidth, index }: { tone: string; cardWidth: number; index: number }) {
  return (
    <div
      style={{
        width: cardWidth,
        borderRadius: cardWidth * 0.04,
        overflow: "hidden",
        background: "#1c1c1f",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: cardWidth * 0.03, padding: cardWidth * 0.04 }}>
        <div style={{ width: cardWidth * 0.09, height: cardWidth * 0.09, borderRadius: "50%", background: "#6b6e77" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: cardWidth * 0.015 }}>
          <div style={{ width: cardWidth * 0.28, height: cardWidth * 0.025, borderRadius: 4, background: "#8a8d96" }} />
          <div style={{ width: cardWidth * 0.18, height: cardWidth * 0.02, borderRadius: 4, background: "#4a4d56" }} />
        </div>
      </div>
      <div style={{ width: "100%", height: cardWidth * 0.85, background: `linear-gradient(160deg, ${tone}, #241f1a)` }} />

      {/* Engagement row — real-looking counts, not bare icon outlines, so the feed reads as
          "active" the way an actual doomscroll does. */}
      <div style={{ display: "flex", alignItems: "center", gap: cardWidth * 0.045, padding: `${cardWidth * 0.04}px ${cardWidth * 0.045}px 0` }}>
        <div style={{ display: "flex", alignItems: "center", gap: cardWidth * 0.014 }}>
          <span style={{ fontSize: cardWidth * 0.05, lineHeight: 1 }}>❤️</span>
          <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: cardWidth * 0.032, color: COLORS.white }}>{fakeLikes(index)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: cardWidth * 0.014 }}>
          <span style={{ fontSize: cardWidth * 0.05, lineHeight: 1 }}>💬</span>
          <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: cardWidth * 0.032, color: COLORS.white }}>{fakeComments(index)}</span>
        </div>
        <div style={{ width: cardWidth * 0.06, height: cardWidth * 0.06, borderRadius: "50%", border: "1.5px solid #7a7d86", marginLeft: "auto" }} />
      </div>

      {/* A couple of comment previews, not just a count — this is the part that actually
          reads as "comments" rather than a like/share icon row. */}
      <div style={{ display: "flex", flexDirection: "column", gap: cardWidth * 0.03, padding: cardWidth * 0.045 }}>
        <CommentLine width={cardWidth} />
        <CommentLine width={cardWidth} />
      </div>
    </div>
  );
}

// Deterministic "dopamine hit" hearts — fixed spawn frame/x-position/size per index (no
// Math.random(), same reasoning as Scene5's particle field: Remotion needs identical output
// on every re-render of the same frame). Only active during the scroll phase, before the X.
const HEART_COUNT = 9;
const HEARTS = Array.from({ length: HEART_COUNT }, (_, i) => ({
  spawnAt: 8 + i * 9,
  x: 0.15 + ((i * 37) % 70) / 100, // 0.15-0.85 across the phone width
  size: 0.7 + ((i * 23) % 10) / 20, // 0.7-1.2
}));

const SLAM_AT = 82; // scene-local frame the X impact lands, pre-spd()

/** 4-10s (padded): the feed scrolls fast and blurred with floating hearts popping up, the X
 *  slams in from off-screen with a camera shake and a red shockwave, then "3 hours lost.
 *  Every day." lands word by word like punches. */
export function Scene2Doomscroll({ localFrame }: { localFrame: number }) {
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;
  const base = Math.min(width, height);

  const cardWidth = base * (isVertical ? 0.62 : 0.24);
  // Taller now that each card has an engagement row + two comment previews, not just an
  // icon row — only used for the scroll-loop step math below, so an approximate estimate
  // (not pixel-exact) is fine; it just needs to be in the right ballpark for the loop to
  // feel continuous rather than jumping.
  const cardHeight = cardWidth * 1.68;
  const gap = base * 0.03;
  const stepHeight = cardHeight + gap;

  // Fast scroll (roughly 2.7x the original pace), motion-blurred, freezing right as the X
  // lands rather than easing to a stop — a scroll that just stops dead sells "interrupted."
  const scrollFrame = Math.min(spd(localFrame), spd(SLAM_AT));
  const rawOffset = (scrollFrame / fps) * (stepHeight * 1.6);
  const scrollOffset = rawOffset % stepHeight;
  const isScrolling = localFrame < SLAM_AT;
  const scrollBlur = isScrolling ? interpolate(localFrame, [0, 10], [0, 3.5], { extrapolateRight: "clamp" }) : 0;

  const posts = Array.from({ length: 6 }, (_, i) => POST_TONES[i % POST_TONES.length]);

  // The X: slams toward camera from oversized + rotated, not a plain scale/fade — reads as
  // "thrown at the screen" rather than "materialized."
  const slamP = spring({ frame: Math.max(0, spd(localFrame) - spd(SLAM_AT)), fps, config: { damping: 11, stiffness: 260, mass: 0.6 }, durationInFrames: 14 });
  const slamScale = interpolate(slamP, [0, 1], [2.6, 1]);
  const slamRotate = interpolate(slamP, [0, 1], [-22, 0]);
  const slamOpacity = interpolate(localFrame, [SLAM_AT, SLAM_AT + 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Camera shake: 3px, ~0.3s (9 frames), decaying — applied to the whole phone mockup.
  const shakeX = shakeOffset(spd(localFrame), spd(SLAM_AT), spd(9), 3);

  // Red shockwave ring, same mechanism as Scene 1's gold one.
  const ringFrame = Math.max(0, spd(localFrame) - spd(SLAM_AT));
  const ringProgress = interpolate(ringFrame, [0, 20], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const ringOpacity = interpolate(ringFrame, [0, 4, 20], [0, 0.85, 0], { extrapolateRight: "clamp" });

  const WORDS = ["3", "hours", "lost.", "Every", "day."];
  const WORD_START = SLAM_AT + 18;
  const WORD_STEP = 7;

  return (
    <Background glowY={30}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: base * 0.06 }}>
        <div
          style={{
            position: "relative",
            width: cardWidth + base * 0.05,
            height: isVertical ? base * 1.0 : base * 0.62,
            borderRadius: base * 0.07,
            border: `${base * 0.006}px solid #2a2a2e`,
            background: "#000",
            overflow: "hidden",
            transform: `translateX(${shakeX}px)`,
            boxShadow: "0 40px 90px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: base * 0.025,
              right: base * 0.025,
              top: -scrollOffset + base * 0.03,
              display: "flex",
              flexDirection: "column",
              gap,
              filter: scrollBlur > 0 ? `blur(${scrollBlur}px)` : undefined,
            }}
          >
            {posts.map((tone, i) => (
              <FeedPost key={i} tone={tone} cardWidth={cardWidth} index={i} />
            ))}
          </div>

          {/* Dopamine hearts — small, popping up, gone before the X ever lands. */}
          {isScrolling &&
            HEARTS.map((h, i) => {
              const t = localFrame - h.spawnAt;
              if (t < 0 || t > 16) return null;
              const p = interpolate(t, [0, 5, 16], [0, 1.15, 1], { extrapolateRight: "clamp" });
              const rise = interpolate(t, [0, 16], [0, -base * 0.05]);
              const op = interpolate(t, [0, 3, 11, 16], [0, 1, 1, 0]);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${h.x * 100}%`,
                    bottom: base * 0.08,
                    transform: `translate(-50%, ${rise}px) scale(${p * h.size})`,
                    opacity: op,
                    fontSize: base * 0.05,
                    filter: `drop-shadow(0 0 ${base * 0.01}px ${COLORS.red}aa)`,
                  }}
                >
                  ❤️
                </div>
              );
            })}

          {slamOpacity > 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: slamOpacity }}>
              <div
                style={{
                  position: "absolute",
                  width: base * 0.4,
                  height: base * 0.4,
                  borderRadius: "50%",
                  border: `3px solid ${COLORS.red}`,
                  opacity: ringOpacity,
                  transform: `scale(${0.3 + ringProgress * 1.4})`,
                }}
              />
              <svg width={base * 0.34} height={base * 0.34} viewBox="0 0 100 100" style={{ transform: `scale(${slamScale}) rotate(${slamRotate}deg)` }}>
                <line x1="12" y1="12" x2="88" y2="88" stroke={COLORS.red} strokeWidth="14" strokeLinecap="round" />
                <line x1="88" y1="12" x2="12" y2="88" stroke={COLORS.red} strokeWidth="14" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${base * 0.018}px`, maxWidth: base * 0.9 }}>
          {WORDS.map((word, i) => {
            const wordStart = WORD_START + i * WORD_STEP;
            const p = spring({ frame: Math.max(0, spd(localFrame) - spd(wordStart)), fps, config: { damping: 10, stiffness: 300 }, durationInFrames: 10 });
            const scale = interpolate(p, [0, 1], [1.4, 1]);
            const opacity = interpolate(spd(localFrame) - spd(wordStart), [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const isRed = word === "Every" || word === "day.";
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  transform: `scale(${scale})`,
                  opacity,
                  fontFamily: FONT_BODY,
                  fontWeight: 800,
                  fontSize: base * (isVertical ? 0.062 : 0.05),
                  color: isRed ? COLORS.red : COLORS.white,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </Background>
  );
}
