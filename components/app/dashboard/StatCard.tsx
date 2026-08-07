"use client";

import { useRef } from "react";
import { useMotionCountUp } from "@/hooks/useMotionCountUp";
export { formatHoursMinutes } from "@/lib/stats";

export type StatCardProps = {
  label: string;
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  comma?: boolean;
  formatValue?: (v: number) => string;
  icon?: React.ReactNode;
  /** Overrides the value's color — used for accountability stats (e.g. sessions broken by
   *  uninstalling) that should read as a penalty rather than an achievement. Defaults to
   *  the usual white. */
  valueColor?: string;
};

/** Shared stat tile used on both the Dashboard and Stats pages — previously duplicated
 *  inline in each, and neither animated; both now count up via useMotionCountUp. */
export default function StatCard({ label, target, prefix, suffix, decimals, comma, formatValue, icon, valueColor }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useMotionCountUp(ref, { target, prefix, suffix, decimals, comma, formatValue });

  return (
    <div style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, minWidth: 0 }}>
      <div style={{ color: "#7a7d84", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        {label}
      </div>
      {/* tabular-nums: without it, digits with different glyph widths (proportional fonts —
          "1" is narrower than "8") shift the box's width on every count-up frame, which on
          a narrow mobile viewport reads as the whole card (and its neighbors, sharing this
          grid row) visibly twitching for the ~1.6s the animation runs. */}
      <div ref={ref} style={{ color: valueColor ?? "#fff", fontSize: 28, fontWeight: 800, marginTop: 8, fontVariantNumeric: "tabular-nums" }} />
    </div>
  );
}
