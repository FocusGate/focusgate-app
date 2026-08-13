import { Composition } from "remotion";
import { loadFonts } from "./fonts";
import { FocusGateVideo } from "./FocusGateVideo";
import { FPS, TOTAL_DURATION_FRAMES } from "./constants";

loadFonts();

/** Two compositions, same component — see FocusGateVideo.tsx for why one component covers
 *  both formats. Render either with:
 *    npx remotion render src/index.ts FocusGateVertical out/focusgate-vertical.mp4
 *    npx remotion render src/index.ts FocusGateHorizontal out/focusgate-horizontal.mp4
 *  (also wired up as `npm run render:vertical` / `render:horizontal` / `render:all`). */
export function RemotionRoot() {
  return (
    <>
      <Composition
        id="FocusGateVertical"
        component={FocusGateVideo}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="FocusGateHorizontal"
        component={FocusGateVideo}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
}
