// send-launch-announcement — the one function in this system that's never scheduled. You
// trigger it once, by hand, at actual launch (see supabase/functions/README.md for the
// exact `supabase functions invoke` command). It automates the *sending* — looping every
// beta user and calling Resend for each — not the *timing*; nothing about when this runs
// is automatic, on purpose.
//
// Targets is_beta_user = true specifically — the accounts this email's "your price is
// locked in forever" message is actually true for (see lib/entitlements.ts's
// computeEntitlements: is_beta_user grants permanent full access regardless of beta_mode).
// Deduped against email_logs so accidentally invoking this twice doesn't double-email
// everyone — sequential, not parallel, so a few hundred users doesn't slam Resend's rate
// limit all at once.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { launchAnnouncementEmail } from "../_shared/emailTemplates.ts";
import { sendAndLog } from "../_shared/resend.ts";

Deno.serve(async (_req: Request) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("is_beta_user", true);
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  const { data: alreadySent } = await supabase
    .from("email_logs")
    .select("user_id")
    .eq("type", "launch_announcement")
    .eq("status", "sent");
  const alreadySentIds = new Set((alreadySent ?? []).map((r) => r.user_id));

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const u of users ?? []) {
    if (alreadySentIds.has(u.id)) {
      skipped++;
      continue;
    }
    try {
      const { subject, html } = launchAnnouncementEmail(u.name);
      const { ok } = await sendAndLog(supabase, { userId: u.id, to: u.email, type: "launch_announcement", subject, html });
      if (ok) sent++;
      else errors.push(`${u.email}: send failed`);
    } catch (err) {
      errors.push(`${u.email}: ${String(err)}`);
    }
  }

  return new Response(JSON.stringify({ ok: errors.length === 0, totalCandidates: (users ?? []).length, sent, skipped, errors }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
