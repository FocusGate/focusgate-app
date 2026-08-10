// send-welcome-email — triggered by a Supabase Database Webhook on INSERT into public.users
// (configured in the dashboard, not in code — see supabase/functions/README.md). Event-based,
// not cron: fires within moments of signup, not on the next daily run.
//
// No email_opt_in check here on purpose — user_preferences is created lazily (see
// lib/supabase.ts's getUserPreferences/updateUserPreferences), so a row brand new enough to
// still be triggering this webhook never has one yet; the column's own default is true
// regardless, so there's nothing meaningfully different to check yet.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { welcomeEmail } from "../_shared/emailTemplates.ts";
import { sendAndLog } from "../_shared/resend.ts";

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const record = payload?.record;
    if (!record?.id || !record?.email || !record?.name) {
      return new Response(JSON.stringify({ ok: false, error: "Missing record.id/email/name in webhook payload" }), { status: 400 });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { subject, html } = welcomeEmail(record.name);
    const result = await sendAndLog(supabase, { userId: record.id, to: record.email, type: "welcome", subject, html });

    return new Response(JSON.stringify({ ok: result.ok }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("send-welcome-email failed:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});
