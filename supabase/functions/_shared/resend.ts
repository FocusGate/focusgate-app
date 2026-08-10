// resend.ts — the one place every Edge Function actually calls Resend from. Plain fetch()
// to Resend's REST API rather than their npm SDK — Deno can import npm packages via an
// `npm:` specifier, but a bare fetch() has zero dependency/compatibility surface to worry
// about for something this simple (one POST, one JSON body).

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { EmailType } from "./emailTemplates.ts";

const FROM = "FocusGate <support@focusgate.site>";

/**
 * Sends one email via Resend and logs the outcome to public.email_logs — every call site
 * in every function routes through this so "what actually went out" always lives in one
 * table, regardless of which function sent it. Never throws: a Resend failure is logged
 * with status 'failed' and returned, not raised, so a batch loop (daily checks, the launch
 * announcement) can't have one bad send abort every send after it.
 */
export async function sendAndLog(
  supabase: SupabaseClient,
  opts: {
    userId: string | null;
    to: string;
    type: EmailType;
    subject: string;
    html: string;
  }
): Promise<{ ok: boolean; resendId: string | null }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    await logEmail(supabase, opts, "failed", null);
    return { ok: false, resendId: null };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`sendAndLog(${opts.type}) failed:`, res.status, body);
      await logEmail(supabase, opts, "failed", null);
      return { ok: false, resendId: null };
    }
    await logEmail(supabase, opts, "sent", body?.id ?? null);
    return { ok: true, resendId: body?.id ?? null };
  } catch (err) {
    console.error(`sendAndLog(${opts.type}) threw:`, err);
    await logEmail(supabase, opts, "failed", null);
    return { ok: false, resendId: null };
  }
}

/** Records a skip (email_opt_in false) without ever calling Resend — still shows up in
 *  email_logs so "why didn't this user get an email" has an answer other than silence. */
export async function logSkipped(supabase: SupabaseClient, opts: { userId: string | null; to: string; type: EmailType }): Promise<void> {
  await logEmail(supabase, { ...opts, subject: "", html: "" }, "skipped", null);
}

async function logEmail(
  supabase: SupabaseClient,
  opts: { userId: string | null; to: string; type: EmailType; subject?: string; html?: string },
  status: "sent" | "failed" | "skipped",
  resendId: string | null
): Promise<void> {
  const { error } = await supabase
    .from("email_logs")
    .insert({ user_id: opts.userId, email: opts.to, type: opts.type, status, resend_id: resendId });
  if (error) console.error("email_logs insert failed:", error);
}

/** Non-critical email types are gated on user_preferences.email_opt_in; there's currently
 *  no security-critical type in this table at all (OTP/password-reset go through Supabase
 *  Auth's own SMTP, entirely outside this system) — this exists so that if one's ever added
 *  here later, there's already a place to exempt it rather than needing to thread a new
 *  bypass through every call site. */
export function isCritical(_type: EmailType): boolean {
  return false;
}
