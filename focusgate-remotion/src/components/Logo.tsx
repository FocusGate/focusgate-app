import { Img, staticFile } from "remotion";

/** The real brand mark — extension/icons/icon-source.png (the gold "F" on black, the same
 *  source art used for the Chrome extension icon and the web app's favicon), copied into
 *  public/logo.png since this is a separate project with no access to the main repo's own
 *  files. Replaces the earlier hand-drawn LockIcon SVG, which was a stand-in guess at the
 *  mark rather than the actual logo. */
export function Logo({ size = 120, glow = 0 }: { size?: number; glow?: number }) {
  return (
    <Img
      src={staticFile("logo.png")}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22, // matches the source art's own rounded-square corners
        filter: glow > 0 ? `drop-shadow(0 0 ${size * 0.12 * glow}px #F59E0B) drop-shadow(0 0 ${size * 0.3 * glow}px #F59E0B88)` : undefined,
      }}
    />
  );
}
