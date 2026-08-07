/** 5-tier intensity scale per spec: no session / under 30min / 30-60min / over 1hr / over 2hr —
 *  the last tier gets a real glow (not just a flatter/brighter fill) since the spec calls it
 *  out explicitly as "glowing gold". */
function intensity(minutes: number): { background: string; boxShadow?: string } {
  if (minutes <= 0) return { background: "#141416" };
  if (minutes < 30) return { background: "rgba(245,158,11,0.28)" };
  if (minutes < 60) return { background: "rgba(245,158,11,0.55)" };
  if (minutes < 120) return { background: "#F59E0B" };
  return { background: "#FBBF24", boxShadow: "0 0 8px 2px rgba(245,158,11,0.85)" };
}

export default function HabitGrid({ data, days = 365 }: { data: { date: string; minutes: number }[]; days?: number }) {
  const byDate = new Map(data.map((d) => [d.date, d.minutes]));
  const cells: { date: string; minutes: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, minutes: byDate.get(key) ?? 0 });
  }

  const weeks: { date: string; minutes: number }[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div style={{ display: "flex", gap: 4, overflowX: "auto", padding: "4px 0" }}>
      {weeks.map((week, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {week.map((cell) => {
            const style = intensity(cell.minutes);
            return (
              <div
                key={cell.date}
                title={`${cell.date} — ${cell.minutes} min`}
                style={{ width: 12, height: 12, borderRadius: 3, background: style.background, boxShadow: style.boxShadow }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
