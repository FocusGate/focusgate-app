// daily-email-checks — invoked once a day by pg_cron (see supabase/functions/README.md for
// the exact `cron.schedule(...)` call and where to confirm it's actually running). Runs all
// three checks in one pass: trial ending tomorrow, 5+ days inactive, and the 7-day-streak /
// first-Rare+-badge congratulations milestones. The heavy "who qualifies" logic lives in
// Postgres (schema.sql's get_users_*() functions) — this function's job is just to call
// each one, send whatever it gets back, and (for the two milestone checks) record that it
// sent it so tomorrow's run doesn't send it again.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { trialEndingEmail, reEngagementEmail, milestoneStreakEmail, milestoneBadgeEmail } from "../_shared/emailTemplates.ts";
import { sendAndLog } from "../_shared/resend.ts";

const STREAK_THRESHOLD = 7;

Deno.serve(async (_req: Request) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const results = { trialEnding: 0, reEngagement: 0, streakMilestone: 0, badgeMilestone: 0, errors: [] as string[] };

  // ---- 1. Trial ending tomorrow ----
  try {
    const { data: users, error } = await supabase.rpc("get_users_trial_ending_tomorrow");
    if (error) throw error;
    for (const u of users ?? []) {
      const { subject, html } = trialEndingEmail(u.name);
      const { ok } = await sendAndLog(supabase, { userId: u.id, to: u.email, type: "trial_ending", subject, html });
      if (ok) results.trialEnding++;
    }
  } catch (err) {
    results.errors.push(`trial_ending: ${String(err)}`);
  }

  // ---- 2. Inactive 5+ days ----
  try {
    const { data: users, error } = await supabase.rpc("get_users_inactive_5_days");
    if (error) throw error;
    for (const u of users ?? []) {
      const { subject, html } = reEngagementEmail(u.name);
      const { ok } = await sendAndLog(supabase, { userId: u.id, to: u.email, type: "re_engagement", subject, html });
      if (ok) results.reEngagement++;
    }
  } catch (err) {
    results.errors.push(`re_engagement: ${String(err)}`);
  }

  // ---- 3a. 7-day streak milestone ----
  try {
    const { data: users, error } = await supabase.rpc("get_users_streak_milestone", { threshold: STREAK_THRESHOLD });
    if (error) throw error;
    for (const u of users ?? []) {
      const { subject, html } = milestoneStreakEmail(u.name, u.streak);
      const { ok } = await sendAndLog(supabase, { userId: u.id, to: u.email, type: "milestone_streak", subject, html });
      if (ok) {
        results.streakMilestone++;
        // Recorded only after a successful send — a failed send should be retried by
        // tomorrow's run, not permanently marked as "already congratulated."
        await supabase.from("milestone_emails_sent").insert({ user_id: u.id, milestone_type: `streak_${STREAK_THRESHOLD}` });
      }
    }
  } catch (err) {
    results.errors.push(`milestone_streak: ${String(err)}`);
  }

  // ---- 3b. First Rare+ badge (per badge, so a later different Rare+ badge congratulates again) ----
  try {
    const { data: rows, error } = await supabase.rpc("get_users_badge_milestone");
    if (error) throw error;
    for (const r of rows ?? []) {
      const { subject, html } = milestoneBadgeEmail(r.name, { name: r.badge_name, description: r.badge_description, rarity: r.badge_rarity });
      const { ok } = await sendAndLog(supabase, { userId: r.id, to: r.email, type: "milestone_badge", subject, html });
      if (ok) {
        results.badgeMilestone++;
        await supabase.from("milestone_emails_sent").insert({ user_id: r.id, milestone_type: `badge_${r.badge_id}` });
      }
    }
  } catch (err) {
    results.errors.push(`milestone_badge: ${String(err)}`);
  }

  return new Response(JSON.stringify({ ok: results.errors.length === 0, ...results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
