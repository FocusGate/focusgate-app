import { useCurrentFrame } from "remotion";
import { spd } from "../constants";

/** Reveals `text` a character at a time starting at `startFrame` (scene-local), one
 *  character every `framesPerChar` frames — shared by Scene 4's question, Scene 5's badge
 *  name, and Scene 6's URL rather than three separate ad-hoc implementations. Runs through
 *  spd() itself (see constants.ts) so every caller gets the same speed-up automatically. */
export function TypewriterText({
  text,
  startFrame,
  framesPerChar = 1.4,
  cursor = true,
  style,
}: {
  text: string;
  startFrame: number;
  framesPerChar?: number;
  cursor?: boolean;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, spd(frame) - spd(startFrame));
  const charsShown = Math.min(text.length, Math.floor(elapsed / framesPerChar));
  const done = charsShown >= text.length;
  // Blinks only while still typing (or briefly after) — a cursor blinking forever on a
  // static end card reads as "broken," not "cinematic."
  const cursorOn = cursor && (!done || Math.floor(frame / 15) % 2 === 0) && charsShown > 0;

  return (
    <span style={style}>
      {text.slice(0, charsShown)}
      {cursorOn && <span style={{ opacity: done ? 0.5 : 1 }}>|</span>}
    </span>
  );
}
