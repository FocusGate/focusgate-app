"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { date: string; minutes: number };
  const dateLabel = new Date(`${point.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <div style={{ background: "#101012", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "8px 12px" }}>
      <div style={{ color: "#7a7d84", fontSize: 11, fontWeight: 600 }}>{dateLabel}</div>
      <div style={{ color: "#F59E0B", fontSize: 14, fontWeight: 700 }}>{point.minutes} min</div>
    </div>
  );
}

/** 30-day focus trend — single series, so a plain gold area fade per the dataviz
 *  sequential rule (never a rainbow, never a second hue for one measure). */
export default function FocusTrendChart({ data }: { data: { date: string; minutes: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="fg-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          stroke="#5b5e66"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={Math.ceil(data.length / 6) - 1}
          tickFormatter={(value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "UTC" })}
        />
        <YAxis stroke="#5b5e66" fontSize={12} tickLine={false} axisLine={false} width={36} />
        <Tooltip cursor={{ stroke: "rgba(245,158,11,0.4)", strokeWidth: 1 }} content={(props) => <ChartTooltip {...props} />} />
        <Area type="monotone" dataKey="minutes" stroke="#F59E0B" strokeWidth={2} fill="url(#fg-trend-fill)" dot={false} activeDot={{ r: 4, fill: "#F59E0B", stroke: "#0A0A0A", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
