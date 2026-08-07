"use client";

import { useEffect, useState } from "react";
import { Flame, Trophy, Unplug } from "lucide-react";
import HabitGrid from "@/components/app/HabitGrid";
import StatCard, { formatHoursMinutes } from "@/components/app/dashboard/StatCard";
import WeeklyBarChart from "@/components/app/stats/WeeklyBarChart";
import FocusTrendChart from "@/components/app/stats/FocusTrendChart";
import ProductivityInsights from "@/components/app/stats/ProductivityInsights";
import { useCurrentUserContext } from "@/contexts/CurrentUserContext";
import { getHabitGrid, getSessions } from "@/lib/supabase";
import { bucketLast7Days, bucketLastNDays, getBestDay, getMostProductiveHour, sumMinutesSince } from "@/lib/stats";

type Session = {
  id: string;
  start_time: string;
  duration_minutes: number | null;
  completed: boolean;
  interrupted_by_uninstall: boolean;
};

export default function StatsPage() {
  const { user } = useCurrentUserContext();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [habit, setHabit] = useState<{ date: string; minutes: number }[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getSessions(user.id), getHabitGrid(user.id)])
      .then(([s, h]) => {
        setSessions(s as Session[]);
        setHabit(h);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your stats."))
      .finally(() => setDataLoading(false));
  }, [user]);

  if (!user) return null;

  const completed = sessions.filter((s) => s.completed);
  const avgMinutes = completed.length
    ? Math.round(completed.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / completed.length)
    : 0;
  const brokenByUninstall = sessions.filter((s) => s.interrupted_by_uninstall).length;

  const now = new Date();
  const weekMinutes = sumMinutesSince(sessions, new Date(now.getTime() - 7 * 86400000));
  const monthMinutes = sumMinutesSince(sessions, new Date(now.getTime() - 30 * 86400000));

  const weeklyData = bucketLast7Days(sessions);
  const trendData = bucketLastNDays(sessions, 30);
  const mostProductive = getMostProductiveHour(sessions);
  const bestDay = getBestDay(habit);

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Stats</h1>
      <p style={{ color: "#9a9da4", marginTop: 6 }}>Your focus habit, at a glance.</p>

      {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 14 }}>{error}</p>}
      {dataLoading && <p style={{ color: "#7a7d84", fontSize: 13, marginTop: 14 }}>Loading your stats…</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 18, marginTop: 28 }}>
        <StatCard label="Current streak" target={user.streak} suffix={user.streak === 1 ? " day" : " days"} icon={<Flame size={14} color="#F59E0B" />} />
        <StatCard label="Longest streak" target={user.longest_streak} suffix={user.longest_streak === 1 ? " day" : " days"} icon={<Trophy size={14} color="#F59E0B" />} />
        <StatCard label="Sessions completed" target={completed.length} />
        <StatCard label="Avg. session length" target={avgMinutes} formatValue={formatHoursMinutes} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 18, marginTop: 18 }}>
        <StatCard label="Hours this week" target={weekMinutes} formatValue={formatHoursMinutes} />
        <StatCard label="Hours this month" target={monthMinutes} formatValue={formatHoursMinutes} />
        <StatCard label="Total focus time" target={Math.round(user.total_focus_hours * 60)} formatValue={formatHoursMinutes} />
      </div>

      {/* No technical way to stop someone from uninstalling mid-session — this is the
          honest substitute: a public accountability stat instead of an unbypassable claim.
          Always shown, even at zero, same as every other stat card here; also lands in
          the offender's friend groups' Notifications feed the moment it happens. */}
      <div style={{ marginTop: 18, maxWidth: 280 }}>
        <StatCard
          label="Sessions broken by uninstalling"
          target={brokenByUninstall}
          icon={<Unplug size={14} color="#f87171" />}
          valueColor={brokenByUninstall > 0 ? "#f87171" : "#fff"}
        />
      </div>

      <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>This week</h2>
        <WeeklyBarChart data={weeklyData} />
      </div>

      <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Last 30 days</h2>
        <FocusTrendChart data={trendData} />
      </div>

      <div style={{ marginTop: 24 }}>
        <ProductivityInsights mostProductive={mostProductive} bestDay={bestDay} />
      </div>

      <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Last 365 days</h2>
        <HabitGrid data={habit} days={365} />
      </div>

      <div style={{ marginTop: 24, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Recent sessions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sessions.length === 0 && !dataLoading && (
            <span style={{ color: "#7a7d84", fontSize: 14 }}>No sessions yet — start your first Locked In session from the dashboard.</span>
          )}
          {sessions.slice(0, 10).map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 14 }}>
              <span style={{ color: "#d8d8dc" }}>{new Date(s.start_time).toLocaleString("en-US", { timeZone: "UTC" })}</span>
              <span style={{ color: s.completed ? "#22c55e" : "#f87171" }}>
                {s.completed ? `${s.duration_minutes ?? 0} min` : s.interrupted_by_uninstall ? "Broken — uninstalled" : "Incomplete"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
