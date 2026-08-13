import { AbsoluteFill } from "remotion";
import { COLORS } from "../constants";

/** The one background every scene sits on — same radial-glow-over-black treatment the
 *  landing page's dark sections use, so scene-to-scene cuts don't jump between different
 *  blacks. `glowX`/`glowY` (0-100, percent) let a scene bias the glow toward its subject
 *  instead of always centering it. */
export function Background({ glowX = 50, glowY = 35, children }: { glowX?: number; glowY?: number; children?: React.ReactNode }) {
  return (
    <AbsoluteFill
      style={{
        // The 65% stop is an explicit 0-alpha gold, not the `transparent` keyword — Chrome
        // interpolates `transparent` as rgba(0,0,0,0), which briefly drags the gradient
        // through pure black on its way from gold to the (different, near-black) base color
        // and shows up as a faint visible seam. Same color at both ends of the fade-out,
        // just alpha 0x -> 14x, doesn't have that problem.
        // The 65% stop is an explicit 0-alpha gold, not the `transparent` keyword — Chrome
        // interpolates `transparent` as rgba(0,0,0,0), which briefly drags the gradient
        // through pure black on its way from gold to the (different, near-black) base color
        // and shows up as a faint visible seam. Same color at both ends of the fade-out,
        // just alpha 0x -> 14x, doesn't have that problem.
        background: `radial-gradient(ellipse 1200px 900px at ${glowX}% ${glowY}%, ${COLORS.gold}14, ${COLORS.gold}00 65%), ${COLORS.black}`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}
