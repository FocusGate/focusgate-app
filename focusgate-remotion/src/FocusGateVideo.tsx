import { AbsoluteFill, useCurrentFrame } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { SCENE_DURATIONS, TRANSITION_FRAMES } from "./constants";
import { scaleFade } from "./transitions/scaleFade";
import { Vignette } from "./components/Vignette";
import { ProgressBar } from "./components/ProgressBar";
import { Scene1Logo } from "./scenes/Scene1Logo";
import { Scene2Doomscroll } from "./scenes/Scene2Doomscroll";
import { Scene3LockedIn } from "./scenes/Scene3LockedIn";
import { Scene4BreakGate } from "./scenes/Scene4BreakGate";
import { Scene5BadgeUnlock } from "./scenes/Scene5BadgeUnlock";
import { Scene6CTA } from "./scenes/Scene6CTA";

/**
 * The single composition both exported formats (1080x1920 vertical, 1920x1080 horizontal)
 * render — every scene reads useVideoConfig()'s width/height itself and adapts, so this
 * component doesn't need two versions.
 *
 * Scenes now run through @remotion/transitions' <TransitionSeries> instead of bare
 * <Sequence> — every cut is the same scale+fade "depth" transition (scaleFade.tsx),
 * TRANSITION_FRAMES long. Each TransitionSeries.Sequence's durationInFrames comes from
 * SCENE_DURATIONS (constants.ts), which is deliberately padded beyond each scene's "real"
 * on-brief length — a transition overlaps and eats into both the outgoing and incoming
 * scene's own duration, so without the padding the total video would run short of 30s.
 *
 * The vignette and progress bar are siblings of the TransitionSeries, not inside it — both
 * need to read real, uninterrupted absolute-frame values (useCurrentFrame() at the very top
 * level), which a scene *inside* the series never sees (Sequence/TransitionSeries.Sequence
 * always offsets useCurrentFrame() to start at 0 for their own content).
 */
export function FocusGateVideo() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0A0A" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.logo}>
          <Scene1Logo />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={scaleFade()} timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.doomscroll}>
          <LocalFrame>{(f) => <Scene2Doomscroll localFrame={f} />}</LocalFrame>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={scaleFade()} timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.lockedIn}>
          <LocalFrame>{(f) => <Scene3LockedIn localFrame={f} />}</LocalFrame>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={scaleFade()} timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.breakGate}>
          <LocalFrame>{(f) => <Scene4BreakGate localFrame={f} />}</LocalFrame>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={scaleFade()} timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.badgeUnlock}>
          <LocalFrame>{(f) => <Scene5BadgeUnlock localFrame={f} />}</LocalFrame>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={scaleFade()} timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.cta}>
          <LocalFrame>{(f) => <Scene6CTA localFrame={f} />}</LocalFrame>
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <Vignette />
      <ProgressBar />
    </AbsoluteFill>
  );
}

/** Same helper as before — <Sequence>/<TransitionSeries.Sequence> already offsets
 *  useCurrentFrame() to start at 0 for their own children; this just names that explicitly
 *  at each call site instead of every scene needing its own useCurrentFrame() call. */
function LocalFrame({ children }: { children: (localFrame: number) => React.ReactNode }) {
  const frame = useCurrentFrame();
  return <>{children(frame)}</>;
}
