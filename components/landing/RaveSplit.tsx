"use client";

import type { ReactNode } from "react";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";

/** Shared image+text split for a Rave illustration section. `side` controls which column
 *  the illustration sits in on desktop (alternated section-to-section down the page for a
 *  zigzag rhythm); on narrow viewports (<900px, see the .rave-split rules in globals.css)
 *  it always stacks image-above-text regardless of `side` — that override lives in CSS
 *  (`!important`, the one thing that beats an inline style) since the desktop left/right
 *  choice is itself set via an inline `order` on these same elements. */
export function RaveSplit({
  image,
  imageAlt,
  side,
  glow = "rgba(245,158,11,0.14)",
  imageMaxWidth = 360,
  children,
}: {
  image: string;
  imageAlt: string;
  side: "left" | "right";
  glow?: string;
  imageMaxWidth?: number;
  children: ReactNode;
}) {
  const imageOrder = side === "left" ? 1 : 2;
  const textOrder = side === "left" ? 2 : 1;

  return (
    <RevealGroup
      stagger={0.12}
      className="rave-split"
      style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}
    >
      <RevealItem
        className="rave-split__image-col"
        style={{ order: imageOrder, position: "relative", display: "flex", justifyContent: "center" }}
      >
        <div
          style={{
            position: "absolute",
            inset: -30,
            background: `radial-gradient(ellipse at center, ${glow}, transparent 70%)`,
            filter: "blur(30px)",
          }}
        />
        <img
          src={image}
          alt={imageAlt}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: imageMaxWidth,
            height: "auto",
            filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.5))",
          }}
        />
      </RevealItem>

      <RevealItem className="rave-split__text-col" style={{ order: textOrder }}>
        {children}
      </RevealItem>
    </RevealGroup>
  );
}
