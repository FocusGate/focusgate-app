"use client";

import { useRef } from "react";

const TEXT =
  "LOCKED IN  ·  STAY FOCUSED  ·  NO EXIT  ·  BUILD THE HABIT  ·  ";

function Row({ reverse }: { reverse?: boolean }) {
  const rowRef = useRef<HTMLDivElement>(null);
  return (
    <div
      onMouseEnter={() => rowRef.current?.style.setProperty("--fg-play", "paused")}
      onMouseLeave={() => rowRef.current?.style.setProperty("--fg-play", "running")}
      style={{ overflow: "hidden", padding: "8px 0" }}
    >
      <div
        ref={rowRef}
        style={{
          display: "flex",
          width: "max-content",
          animation: "fg-marquee 26s linear infinite",
          animationDirection: reverse ? "reverse" : "normal",
          animationPlayState: "var(--fg-play, running)" as React.CSSProperties["animationPlayState"],
        }}
      >
        {[0, 1].map((i) => (
          <span key={i} style={{ color: "#0a0a0a", fontWeight: 800, fontSize: 14, letterSpacing: "0.16em", whiteSpace: "nowrap" }}>
            {TEXT.repeat(4)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Two rows scrolling in opposite directions, each independently pausable on hover. */
export default function Marquee() {
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 3, background: "#f5f5f5" }}>
      <Row />
      <Row reverse />
    </div>
  );
}
