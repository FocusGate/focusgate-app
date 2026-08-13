import { AbsoluteFill } from "remotion";

/** Cinematic dark-edge overlay, rendered once at the top level (FocusGateVideo.tsx) above
 *  every scene and transition — a single consistent vignette across the whole video, rather
 *  than each scene needing its own (which would visibly shift/reset at every cut). Pure
 *  radial darkening, no color tint, so it never fights a scene's own gold glow underneath. */
export function Vignette() {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: "radial-gradient(ellipse 75% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
      }}
    />
  );
}
