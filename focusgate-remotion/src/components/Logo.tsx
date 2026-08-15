/** Raven rebrand: the real brand mark is now the minimal angled raven silhouette from
 *  components/landing/Navbar.tsx's RavenMark (same path data, ported by hand since this is
 *  a separate project with no access to the main repo's own components) — replaces the
 *  earlier gold "F" PNG (extension/icons/icon-source.png), which was FocusGate's mark, not
 *  Raven's. Inline SVG rather than a raster image, so no new asset file was needed here. */
export function Logo({ size = 120, glow = 0 }: { size?: number; glow?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: glow > 0 ? `drop-shadow(0 0 ${size * 0.12 * glow}px #F59E0B) drop-shadow(0 0 ${size * 0.3 * glow}px #F59E0B88)` : undefined,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M2 12L6 8L14 5L22 9L13 11L20 18L12 14L7 15Z" fill="#b08d57" />
      </svg>
    </div>
  );
}
