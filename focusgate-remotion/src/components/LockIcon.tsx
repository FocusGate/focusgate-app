// LockIcon.tsx — the same mark used site-wide next to the "FocusGate" wordmark
// (components/landing/Navbar.tsx's FocusGateMark, ported here since this is a separate
// Remotion project with no access to the Next.js app's own components/imports). Same path
// data, so the logo in this video is pixel-faithful to the one in the real product — this
// component just adds what a still nav icon doesn't need: a gold glow and a scale prop for
// the Scene 1 hero moment.

export function LockIcon({
  size = 120,
  color = "#F59E0B",
  glow = 0,
}: {
  size?: number;
  color?: string;
  /** 0 = no glow, 1 = full glow — animate this in from the scene, not CSS, so it's
   *  frame-exact under Remotion's render (no relying on a live transition timer). */
  glow?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{
        filter: glow > 0 ? `drop-shadow(0 0 ${18 * glow}px ${color}) drop-shadow(0 0 ${44 * glow}px ${color}88)` : undefined,
      }}
    >
      <path d="M5 21V11a7 7 0 0 1 14 0v10" stroke={color} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <line x1="3.6" y1="21" x2="20.4" y2="21" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="12.4" r="1.5" fill={color} />
      <path d="M12 13.6V16.6" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
