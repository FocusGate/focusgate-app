"use server";

// email.ts — every outbound Resend email Raven sends, in one place. Marked "use server"
// at the file level (a Next.js Server Actions file): every export here compiles to a
// server-only RPC endpoint, so client components can call sendWelcomeEmail() etc. directly,
// as a normal async function call, without RESEND_API_KEY or the `resend` SDK ever reaching
// the client bundle. There is no app/api route for any of this on purpose — Server Actions
// are the more idiomatic fit for a codebase that already calls every other mutation
// (startSession, addBlockedSite, ...) as a plain imported async function, not a fetch().
//
// All four sends are deliberately best-effort — every exported function routes through
// deliver() below, which never throws (Resend itself doesn't throw on an API-level
// rejection like an unverified sender; it resolves { data: null, error } instead, so both
// paths are handled explicitly) — rather than letting an email failure block the *real*
// action that triggered it: a feather unlocking, a session starting, a break running long
// shouldn't ever hinge on an email provider being up. Both outcomes are only ever logged
// server-side (visible in Vercel's function logs), there is no user-facing retry/error
// surface for this by design.

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Every send goes out from this one address — support@focusgate.site must be a verified
// sender/domain in Resend's own dashboard (SPF/DKIM/DMARC DNS records on focusgate.site)
// for these to actually deliver; that verification lives in Resend's dashboard, not in this
// repo, and isn't something this code can confirm on its own.
// HOLD (ravenlock.pro brand pass): every *link* below now points at ravenlock.pro, but this
// FROM address deliberately still sends from focusgate.site — flipping it to
// support@ravenlock.pro before that domain has its own verified SPF/DKIM/DMARC records in
// Resend would silently break every outbound email (bounces or outright rejection at send
// time). Swap this the moment ravenlock.pro is verified there; nothing else needs to change.
const FROM = "Raven <support@focusgate.site>";

const GOLD = "#b08d57";
const GOLD_BRIGHT = "#F59E0B";
const INK = "#141413";
const MUTED = "#6b6b6b";

/** Shared table-based shell — inline styles only, no external stylesheet or webfont, since
 *  neither is reliable across email clients. A light body with the brand gold as the only
 *  accent color reads correctly in both light and dark mail clients, unlike attempting the
 *  web app's own near-black background (Gmail/Outlook both frequently override or strip
 *  dark email backgrounds, which would leave white-on-white text). */
function emailShell(preheader: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0; padding:0; background:#f4f3f0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0; padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e8e6e1;">
        <tr><td style="padding:28px 32px 0;">
          <span style="font-size:19px; font-weight:800; letter-spacing:0.08em; color:${GOLD};">RAVEN</span>
        </td></tr>
        <tr><td style="padding:24px 32px 32px; color:${INK}; font-size:15px; line-height:1.6;">
          ${bodyHtml}
        </td></tr>
      </table>
      <p style="max-width:480px; margin:20px 0 0; color:${MUTED}; font-size:12px; text-align:center;">
        Raven · <a href="https://ravenlock.pro/settings" style="color:${MUTED};">Manage email preferences</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block; margin-top:20px; padding:12px 24px; background:linear-gradient(180deg, ${GOLD_BRIGHT}, ${GOLD}); color:#0a0a0a; font-weight:700; font-size:14px; text-decoration:none; border-radius:999px;">${label}</a>`;
}

/** The one place that actually calls resend.emails.send() — every exported send* function
 *  below routes through this so success/failure logging (both sides visible in Vercel's
 *  function logs) and the swallow-don't-throw behavior only have to be written once. Resend
 *  itself doesn't throw on an API-level rejection (bad/unverified sender, invalid recipient,
 *  etc.) — it returns { data: null, error } instead, which is why both branches are checked
 *  explicitly rather than relying on the catch alone. */
async function deliver(kind: string, to: string, subject: string, html: string): Promise<void> {
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error(`${kind} failed:`, error);
      return;
    }
    console.log(`${kind} sent to ${to}, id=${data?.id}`);
  } catch (err) {
    console.error(`${kind} threw:`, err);
  }
}

/** Fired once, right after a new account's profile row is created (see SignupForm.tsx).
 *  Best-effort: signup itself has already fully succeeded by the time this is called, so a
 *  delivery failure here is logged and otherwise invisible to the new user. */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const firstName = name.split(" ")[0] || name;
  const html = emailShell(
    `${firstName}, your first RavenLock session is one click away.`,
    `
    <p style="margin:0 0 16px;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;">Welcome to Raven. You said you'd study — now let's make it stick.</p>
    <p style="margin:0 0 16px;">Pick your sites to block, choose a session length, and lock in. Once it starts, there's no backing out until it's done — that's the whole point.</p>
    ${button("Start your first session", "https://ravenlock.pro/dashboard")}
    `
  );
  await deliver("sendWelcomeEmail", to, "Welcome to Raven 🐦‍⬛", html);
}

/** Fired per newly-unlocked feather from checkAndUnlockFeathers' result (dashboard's
 *  handleSessionComplete) — a session can unlock more than one at once, so this is called
 *  once per feather rather than batched, keeping each email about exactly one achievement. */
export async function sendFeatherUnlockEmail(to: string, name: string, feather: { name: string; description: string; rarity: string }): Promise<void> {
  const firstName = name.split(" ")[0] || name;
  const html = emailShell(
    `You just earned ${feather.name}.`,
    `
    <p style="margin:0 0 16px;">Nice work, ${firstName}.</p>
    <p style="margin:0 0 8px; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${GOLD};">${feather.rarity} feather earned</p>
    <p style="margin:0 0 4px; font-size:19px; font-weight:800;">🪶 ${feather.name}</p>
    <p style="margin:0 0 16px; color:${MUTED};">${feather.description}</p>
    ${button("See all your feathers", "https://ravenlock.pro/feathers")}
    `
  );
  await deliver("sendFeatherUnlockEmail", to, `🪶 You earned ${feather.name}`, html);
}

/** Fired alongside (not instead of) the in-app notification row notifyFriendGroup() already
 *  writes — same trigger, same message text, second channel. */
export async function sendFriendGroupNotificationEmail(to: string, name: string, message: string): Promise<void> {
  const firstName = name.split(" ")[0] || name;
  const html = emailShell(
    message,
    `
    <p style="margin:0 0 16px;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;">${message}</p>
    ${button("Open Friends", "https://ravenlock.pro/friends")}
    `
  );
  await deliver("sendFriendGroupNotificationEmail", to, "Raven — activity in your group", html);
}

/** Fired by LockedInOverlay's own reminder timer, at most once per
 *  break_reminder_interval_minutes while a session is actively running (never while already
 *  paused/on a break — see the interval effect's own guard) and only when the user has
 *  session_break_reminders turned on in Settings. */
export async function sendBreakReminderEmail(to: string, name: string): Promise<void> {
  const firstName = name.split(" ")[0] || name;
  const html = emailShell(
    "Still there? A short break helps you finish stronger.",
    `
    <p style="margin:0 0 16px;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;">You've been locked in for a while now. A short break — even a minute — tends to help you finish stronger than pushing straight through.</p>
    <p style="margin:0 0 16px; color:${MUTED};">Your sites stay blocked either way. This is just a nudge, not a requirement.</p>
    ${button("Take a break", "https://ravenlock.pro/dashboard")}
    `
  );
  await deliver("sendBreakReminderEmail", to, "Raven — still locked in?", html);
}
