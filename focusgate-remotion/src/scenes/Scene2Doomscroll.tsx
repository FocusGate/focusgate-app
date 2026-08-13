import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { COLORS, FONT_BODY } from "../constants";

// Deliberately generic — an abstracted "social feed" (avatar + caption lines + image card +
// like/comment row), not a recreation of any specific real app's UI, logo, or wordmark.
// Brighter/more saturated than a real muted-UI palette would be — this needs to read
// clearly as "a feed" at a glance in a fast-cut promo, not sit at realistic low contrast.
const POST_TONES = ["#6B4F2A", "#4A3F6B", "#2A6B57", "#6B2A45", "#2A456B", "#5A522A"];

function FeedPost({ tone, cardWidth }: { tone: string; cardWidth: number }) {
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
      <div style={{ display: "flex", gap: cardWidth * 0.05, padding: cardWidth * 0.045 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: cardWidth * 0.06, height: cardWidth * 0.06, borderRadius: "50%", border: "1.5px solid #7a7d86" }} />
        ))}
      </div>
    </div>
  );
}

/** 4-10s (this scene's own local frame 0-180): the feed scrolls endlessly for ~3s, a red X
 *  slams across it, then "3 hours lost. Every day." lands. */
export function Scene2Doomscroll({ localFrame }: { localFrame: number }) {
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;
  const base = Math.min(width, height);

  const SLAM_AT = 95; // ~3.2s into this 6s scene
  const cardWidth = base * (isVertical ? 0.62 : 0.24);
  const cardHeight = cardWidth * 1.32;
  const gap = base * 0.03;
  const stepHeight = cardHeight + gap;

  // Continuous upward scroll — wraps via modulo so a handful of repeated posts read as an
  // endless feed. Freezes at the slam frame (a scrolling feed mid-freeze-frame is exactly
  // what "this stops you" should look like).
  const scrollFrame = Math.min(localFrame, SLAM_AT);
  const rawOffset = (scrollFrame / fps) * (stepHeight * 0.6);
  const scrollOffset = rawOffset % stepHeight;

  const posts = Array.from({ length: 6 }, (_, i) => POST_TONES[i % POST_TONES.length]);

  const slamProgress = spring({ frame: Math.max(0, localFrame - SLAM_AT), fps, config: { damping: 9, mass: 0.5 }, durationInFrames: 16 });
  const slamOpacity = interpolate(localFrame, [SLAM_AT, SLAM_AT + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // A brief shake right as the X lands — sells the "slam," not just a fade-in.
  const shakeT = localFrame - SLAM_AT;
  const shakeX = shakeT >= 0 && shakeT < 10 ? Math.sin(shakeT * 2.4) * (10 - shakeT) * 0.6 : 0;

  const textFrame = Math.max(0, localFrame - SLAM_AT - 14);
  const textOpacity = interpolate(textFrame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(textFrame, [0, 16], [16, 0], { extrapolateRight: "clamp" });

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
            }}
          >
            {posts.map((tone, i) => (
              <FeedPost key={i} tone={tone} cardWidth={cardWidth} />
            ))}
          </div>

          {slamOpacity > 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: slamOpacity }}>
              <svg width={base * 0.34} height={base * 0.34} viewBox="0 0 100 100" style={{ transform: `scale(${0.7 + slamProgress * 0.3})` }}>
                <line x1="12" y1="12" x2="88" y2="88" stroke={COLORS.red} strokeWidth="14" strokeLinecap="round" />
                <line x1="88" y1="12" x2="12" y2="88" stroke={COLORS.red} strokeWidth="14" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>

        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: base * (isVertical ? 0.062 : 0.05),
            color: COLORS.white,
            textAlign: "center",
            lineHeight: 1.25,
            maxWidth: base * 0.9,
          }}
        >
          3 hours lost.
          <br />
          <span style={{ color: COLORS.red }}>Every day.</span>
        </div>
      </div>
    </Background>
  );
}
