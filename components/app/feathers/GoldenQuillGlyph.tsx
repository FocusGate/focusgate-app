import { FeatherShape } from "@/components/app/featherIcons";

/** The Golden Quill's own glyph — deliberately fuller/more ornate than the plain single-
 *  feather silhouette every other tier shares: three layered feather passes (a wide, soft
 *  back layer; a mid layer; a crisp gold front layer) plus a small metal nib at the base, so
 *  it reads as an actual quill pen, not just another feather in gold. Fed a gradient fill
 *  (id supplied by the caller) so the same glyph works both static (landing showcase) and
 *  CSS-rotated (fg-gem-rotate, in-app card). */
export function GoldenQuillGlyph({ size = 130, gradientId = "rv-quill-gold" }: { size?: number; gradientId?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF4E0" />
          <stop offset="0.45" stopColor="#FFB020" />
          <stop offset="1" stopColor="#C2660A" />
        </linearGradient>
      </defs>
      <g transform="rotate(-18 24 24) scale(1.28) translate(-4 -3)">
        <FeatherShape color={`url(#${gradientId})`} opacity={0.18} />
      </g>
      <g transform="rotate(-2 24 24) scale(1.1) translate(-1.5 -1)">
        <FeatherShape color={`url(#${gradientId})`} opacity={0.5} />
      </g>
      <g transform="rotate(14 24 24)">
        <FeatherShape color={`url(#${gradientId})`} opacity={1} />
      </g>
      {/* nib — a small split metal point continuing the shaft past the vane, the detail
          that turns "a feather" into "a quill pen". */}
      <path d="M22.7 40.5L21 47L24.1 44.3L27 47L25.3 40.5Z" fill={`url(#${gradientId})`} opacity="0.95" />
    </svg>
  );
}
