/** The Talon-Lock icon — replaces the generic 🔒 padlock everywhere it was standing in for
 *  "this is locked/secured," now that the brand is Raven, not a padlock company. A single
 *  solid talon-foot silhouette (a leg gripping down into three splayed toes), not three
 *  separate spoke shapes — the earlier three-claw-around-a-bar version read as a pinwheel/
 *  flower at the small sizes it actually renders at (the 40px feature-card icon, 16-24px
 *  elsewhere), not as a claw. A single filled shape stays legible that small.
 *
 *  `tone="dark"` (default) renders gold-on-transparent for dark backgrounds; `tone="light"`
 *  renders black-on-transparent for light backgrounds, per the brief. `color` overrides both. */
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
      <path
        d="M12 2.2c-1 0-1.8.8-1.8 1.8v5.1c-1.7.4-3.4 1.6-4.9 3.7-.9 1.3-1.5 2.6-1.8 3.5-.2.6.4 1.1.9.7 1.4-1 3.1-1.7 4.6-1.9.2 1.2.3 2.3.3 2.9 0 .6.5 1 1 1h3.4c.5 0 1-.4 1-1 0-.6.1-1.7.3-2.9 1.5.2 3.2.9 4.6 1.9.5.4 1.1-.1.9-.7-.3-.9-.9-2.2-1.8-3.5-1.5-2.1-3.2-3.3-4.9-3.7V4c0-1-.8-1.8-1.8-1.8Z"
        fill={fill}
      />
    </svg>
  );
}
