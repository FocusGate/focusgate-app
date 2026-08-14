// shake.ts — a decaying horizontal shake offset, for impact moments (Scene 2's X slam,
// Scene 3's "RAVENLOCK" halves colliding). Not a component — just a number scenes
// apply to their own transform, since what should shake differs per scene (the whole phone
// mockup in Scene 2, just the text in Scene 3).

/** Returns a translateX offset in px: 0 before `triggerFrame`, then a decaying oscillation
 *  for `durationFrames`, back to 0 after. `magnitude` is the peak offset at the moment of
 *  impact. Call with the scene's own (already spd()-scaled, if relevant) frame number. */
export function shakeOffset(frame: number, triggerFrame: number, durationFrames: number, magnitude: number): number {
  const t = frame - triggerFrame;
  if (t < 0 || t > durationFrames) return 0;
  const decay = 1 - t / durationFrames;
  return Math.sin(t * 3.4) * magnitude * decay;
}
