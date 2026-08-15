/** The Talon-Lock icon — replaces the generic 🔒 padlock everywhere it was standing in for
 *  "this is locked/secured," now that the brand is Raven, not a padlock company. Three
 *  angular talon/claw shapes grip a short central bar from three different angles (like a
 *  bird foot closing around a perch), all built from straight-edged polygons — no organic
 *  curves — so it stays sharp and angular per spec rather than reading as a cute rounded
 *  claw. One base claw path, reused three times at different rotations (same pattern as
 *  FeatherIcon's layered-rotation trick in components/app/featherIcons.tsx).
 *
 *  `tone="dark"` (default) renders gold-on-transparent for dark backgrounds; `tone="light"`
 *  renders black-on-transparent for light backgrounds, per the brief. `color` overrides both. */
function ClawShape({ fill }: { fill: string }) {
  // A single hooked talon: wide where it meets the bar, reaching out at an angle, then
  // bending sharply back on itself near the tip — the hook-back is what actually reads as
  // "gripping" rather than just a spoke pointing outward. Straight segments only (angled,
  // not curved) per spec.
  return <path d="M-1 0L1 0L2.5 5L0.5 8L-2 6L-1.5 3Z" fill={fill} />;
}

export function TalonLockIcon({
  size = 24,
  tone = "dark",
  color,
}: {
  size?: number;
  tone?: "dark" | "light";
  color?: string;
}) {
  const fill = color ?? (tone === "dark" ? "#F59E0B" : "#0A0A0A");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* the central bar/perch the three talons close around */}
      <rect x="11" y="3" width="2" height="12" rx="0.5" fill={fill} />
      <g transform="translate(12 12)">
        <g transform="rotate(-110)">
          <ClawShape fill={fill} />
        </g>
        <g transform="rotate(10)">
          <ClawShape fill={fill} />
        </g>
        <g transform="rotate(130)">
          <ClawShape fill={fill} />
        </g>
      </g>
    </svg>
  );
}
