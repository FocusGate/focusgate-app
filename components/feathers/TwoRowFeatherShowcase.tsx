"use client";

import FeatherCard, { type FeatherCardData } from "@/components/app/feathers/FeatherCard";
import type { BadgeTier } from "@/components/app/featherIcons";

export type ShowcaseFeather = FeatherCardData & {
  tier: BadgeTier;
  unlocked?: boolean; // omit on the landing page's static marketing copy — treated as true
  unlockedAt?: string;
  progress?: { current: number; target: number };
};

const CARD_WIDTH = 228;

/** Two independently-looping marquee rows: row 1 (Common + Rare) scrolls left→right, row 2
 *  (Epic + Mythic) scrolls right→left, both continuous and both pausing on hover. Pure CSS
 *  (see the `rv-feather-marquee-*` keyframes in globals.css) — each row's item list is
 *  rendered twice back-to-back and animated exactly -50%, so the loop point is invisible.
 *  The Golden Quill never appears here — it's `legendary` tier and gets its own centerpiece
 *  treatment (GoldenQuillCard) wherever this component is used. */
export default function TwoRowFeatherShowcase({
  items,
  onSelect,
}: {
  items: ShowcaseFeather[];
  onSelect?: (item: ShowcaseFeather) => void;
}) {
  const row1 = items.filter((i) => i.tier === "common" || i.tier === "rare");
  const row2 = items.filter((i) => i.tier === "epic" || i.tier === "mythic");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <MarqueeRow items={row1} direction="ltr" onSelect={onSelect} />
      <MarqueeRow items={row2} direction="rtl" onSelect={onSelect} />
    </div>
  );
}

function MarqueeRow({ items, direction, onSelect }: { items: ShowcaseFeather[]; direction: "ltr" | "rtl"; onSelect?: (item: ShowcaseFeather) => void }) {
  if (items.length === 0) return null;
  // Duration scales with row width so every row moves at roughly the same visual speed
  // regardless of how many cards it holds.
  const duration = Math.max(18, items.length * 3.4);

  return (
    <div className="rv-feather-row">
      <div
        className={`rv-feather-track ${direction === "ltr" ? "rv-feather-track-ltr" : "rv-feather-track-rtl"}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {[...items, ...items].map((item, i) => (
          <div key={`${item.id}-${i}`} style={{ flex: `0 0 ${CARD_WIDTH}px`, height: "100%" }}>
            <FeatherCard
              feather={item}
              unlocked={item.unlocked ?? true}
              unlockedAt={item.unlockedAt}
              progress={item.progress}
              onClick={() => onSelect?.(item)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
