/** Small pulsing green dot overlaid on a member's avatar — reuses the existing
 *  `fg-pulse` keyframe already defined in globals.css for the landing page's live pill. */
export default function PresenceBadge({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span
      className="fg-presence-dot"
      style={{
        position: "absolute",
        bottom: -1,
        right: -1,
        width: 11,
        height: 11,
        borderRadius: "50%",
        background: "#22c55e",
        border: "2px solid #0A0A0A",
      }}
    />
  );
}
