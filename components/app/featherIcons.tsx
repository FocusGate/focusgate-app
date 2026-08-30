// Feathers system (formerly "badges"). Unlike the old per-achievement icon map, every
// achievement in a tier now shows the SAME stylized feather silhouette in that tier's
// color — identity comes from the name/description text, rarity comes from the icon's
// color + glow. The Golden Quill (formerly "FocusGate Legend") is the one exception: it
// gets its own ornate glyph in GoldenQuill.tsx, not this file.

/** One feather's silhouette as raw path data — two lobes split by a shaft, with a handful
 *  of short barb ticks for texture. Reused at every size/color/rotation via FeatherIcon, and
 *  exported for GoldenQuillGlyph.tsx's larger, more ornate composite. */
export function FeatherShape({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <path d="M24 5C31 9 36 16 34 24C32 31 28 36 23 40L24 40C24 40 24 22 24 5Z" fill={color} />
      <path d="M24 5C24 5 24 22 24 40L23 40C19 36 16 30 17 23C18 15 21 9 24 5Z" fill={color} opacity="0.78" />
      <path d="M24 5C23.3 17 23.3 30 22.5 44" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.9" />
      <path
        d="M24 12L30 9M24 18L31 15M24 24L32 21M24 30L30 28M24 12L18 10M24 18L17 16M24 24L16 22M24 30L18 28"
        stroke={color}
        strokeWidth="0.7"
        opacity="0.35"
        strokeLinecap="round"
      />
    </g>
  );
}

/** A single angled feather with a fainter, larger, counter-rotated "ghost" feather behind
 *  it — the "layered" look the rebrand spec asked for, without needing a unique glyph per
 *  achievement. */
export function FeatherIcon({ color, size = 48, layered = true }: { color: string; size?: number; layered?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {layered && (
        <g transform="rotate(-14 24 24) scale(1.16) translate(-3 -2)">
          <FeatherShape color={color} opacity={0.22} />
        </g>
      )}
      <g transform="rotate(12 24 24)">
        <FeatherShape color={color} opacity={1} />
      </g>
    </svg>
  );
}

export function getFeatherIcon(tier: BadgeTier) {
  const color = TIER_META[tier].glow;
  return { color, svg: <FeatherIcon color={color} /> };
}

// ---------- tier metadata ----------

export type BadgeTier = "common" | "rare" | "epic" | "mythic" | "legendary";

export const TIER_ORDER: BadgeTier[] = ["common", "rare", "epic", "mythic", "legendary"];

export const TIER_META: Record<BadgeTier, { label: string; glow: string; glowSoft: string }> = {
  common: { label: "Common", glow: "#64748B", glowSoft: "rgba(100,116,139,0.16)" }, // blue-grey
  rare: { label: "Rare", glow: "#3B82F6", glowSoft: "rgba(59,130,246,0.18)" }, // blue
  epic: { label: "Epic", glow: "#A855F7", glowSoft: "rgba(168,85,247,0.2)" }, // purple
  mythic: { label: "Mythic", glow: "#FB7185", glowSoft: "rgba(251,113,133,0.24)" }, // coral/red — rarer, louder
  legendary: { label: "Legendary", glow: "#FFB020", glowSoft: "rgba(255, 176, 32,0.28)" }, // The Golden Quill only
};

export function isValidTier(rarity: string): rarity is BadgeTier {
  return (TIER_ORDER as string[]).includes(rarity);
}
