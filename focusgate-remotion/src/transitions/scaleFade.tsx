import { AbsoluteFill } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";

/**
 * Custom @remotion/transitions presentation — modeled directly on the package's own built-in
 * `fade` (same component shape: opacity driven by presentationProgress, direction-aware),
 * with a scale added: the outgoing scene shrinks slightly as it fades, the incoming scene
 * starts slightly oversized and settles to 1 as it fades in. Exactly the depth effect asked
 * for ("current scene scales slightly to 0.95 and fades... next scene scales from 1.05").
 */
function ScaleFadePresentation({ children, presentationDirection, presentationProgress }: TransitionPresentationComponentProps<Record<string, never>>) {
  const isEntering = presentationDirection === "entering";
  const opacity = isEntering ? presentationProgress : 1 - presentationProgress;
  // Entering: 1.05 -> 1.00 as progress goes 0 -> 1. Exiting: 1.00 -> 0.95.
  const scale = isEntering ? 1.05 - presentationProgress * 0.05 : 1 - presentationProgress * 0.05;

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      {children}
    </AbsoluteFill>
  );
}

export function scaleFade(): TransitionPresentation<Record<string, never>> {
  return { component: ScaleFadePresentation, props: {} };
}
