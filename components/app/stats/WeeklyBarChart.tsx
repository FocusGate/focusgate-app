"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const minutes = Number(payload[0].value);
  return (
    <div style={{ background: "#101012", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "8px 12px" }}>
      <div style={{ color: "#7a7d84", fontSize: 11, fontWeight: 600 }}>{label}</div>
      <div style={{ color: "#F59E0B", fontSize: 14, fontWeight: 700 }}>{minutes} min</div>
    </div>
  );
}

/** Real recharts bars (was hand-rolled) — single series, so one gold hue with a light→dark
 *  gradient per the dataviz sequential rule, plus a proper hover tooltip. */
export default function WeeklyBarChart({ data }: { data: { date: string; label: string; minutes: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="fg-weekly-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="label" stroke="#5b5e66" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#5b5e66" fontSize={12} tickLine={false} axisLine={false} width={36} />
        <Tooltip cursor={{ fill: "rgba(245,158,11,0.06)" }} content={(props) => <ChartTooltip {...props} />} />
        <Bar dataKey="minutes" fill="url(#fg-weekly-bar)" radius={[6, 6, 2, 2]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
