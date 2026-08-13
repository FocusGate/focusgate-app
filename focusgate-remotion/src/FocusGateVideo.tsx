import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { SCENES } from "./constants";
import { Scene1Logo } from "./scenes/Scene1Logo";
import { Scene2Doomscroll } from "./scenes/Scene2Doomscroll";
import { Scene3LockedIn } from "./scenes/Scene3LockedIn";
import { Scene4BreakGate } from "./scenes/Scene4BreakGate";
import { Scene5BadgeUnlock } from "./scenes/Scene5BadgeUnlock";
import { Scene6CTA } from "./scenes/Scene6CTA";

/**
 * The single composition both exported formats (1080x1920 vertical, 1920x1080 horizontal)
 * render — every scene reads useVideoConfig()'s width/height itself and adapts, so this
 * component doesn't need two versions. Scene boundaries come from constants.ts's SCENES map,
 * the one place the brief's exact timings (0-4, 4-10, 10-18, 18-24, 24-28, 28-30) live.
 *
 * Each scene component receives `localFrame` (frames since that scene's own start, not the
 * timeline's absolute frame) via a thin wrapper below <Sequence> — every scene's internal
 * animation math is written relative to its own 0, which is what makes each one easy to
 * re-time independently later without touching the others.
 */
export function FocusGateVideo() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0A0A" }}>
      <Sequence from={SCENES.logo.from} durationInFrames={SCENES.logo.duration}>
        <Scene1Logo />
      </Sequence>

      <Sequence from={SCENES.doomscroll.from} durationInFrames={SCENES.doomscroll.duration}>
        <LocalFrameProvider>{(f) => <Scene2Doomscroll localFrame={f} />}</LocalFrameProvider>
      </Sequence>

      <Sequence from={SCENES.lockedIn.from} durationInFrames={SCENES.lockedIn.duration}>
        <LocalFrameProvider>{(f) => <Scene3LockedIn localFrame={f} />}</LocalFrameProvider>
      </Sequence>

      <Sequence from={SCENES.breakGate.from} durationInFrames={SCENES.breakGate.duration}>
        <LocalFrameProvider>{(f) => <Scene4BreakGate localFrame={f} />}</LocalFrameProvider>
      </Sequence>

      <Sequence from={SCENES.badgeUnlock.from} durationInFrames={SCENES.badgeUnlock.duration}>
        <LocalFrameProvider>{(f) => <Scene5BadgeUnlock localFrame={f} />}</LocalFrameProvider>
      </Sequence>

      <Sequence from={SCENES.cta.from} durationInFrames={SCENES.cta.duration}>
        <LocalFrameProvider>{(f) => <Scene6CTA localFrame={f} />}</LocalFrameProvider>
      </Sequence>
    </AbsoluteFill>
  );
}

/** <Sequence> already offsets useCurrentFrame() to start at 0 for its children — this just
 *  makes that explicit/named at each call site above instead of every scene needing its own
 *  useCurrentFrame() call and a comment explaining it's already scene-relative. */
function LocalFrameProvider({ children }: { children: (localFrame: number) => React.ReactNode }) {
  const frame = useCurrentFrame();
  return <>{children(frame)}</>;
}
