// emailTemplates.ts — the same gold/black branded shell as lib/email.ts (the Next.js app's
// own transactional emails), ported into Deno rather than imported, since Edge Functions run
// in a completely separate runtime from the Next.js app and can't share a module across
// them. Keep both in sync by hand if the brand shell ever changes — there's no build step
// that enforces it.

export const GOLD = "#b08d57";
export const GOLD_BRIGHT = "#F59E0B";
const INK = "#141413";
const MUTED = "#6b6b6b";

export type EmailType = "welcome" | "trial_ending" | "re_engagement" | "milestone_streak" | "milestone_badge" | "launch_announcement";

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
          <span style="font-size:20px; font-weight:800; color:${INK}; letter-spacing:-0.01em;">🔒 Focus<span style="color:${GOLD};">Gate</span></span>
        </td></tr>
        <tr><td style="padding:24px 32px 32px; color:${INK}; font-size:15px; line-height:1.6;">
          ${bodyHtml}
        </td></tr>
      </table>
      <p style="max-width:480px; margin:20px 0 0; color:${MUTED}; font-size:12px; text-align:center;">
        FocusGate · <a href="https://focusgate.site/settings" style="color:${MUTED};">Manage email preferences</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block; margin-top:20px; padding:12px 24px; background:linear-gradient(180deg, ${GOLD_BRIGHT}, ${GOLD}); color:#0a0a0a; font-weight:700; font-size:14px; text-decoration:none; border-radius:999px;">${label}</a>`;
}

function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

export function welcomeEmail(name: string): { subject: string; html: string } {
  const fn = firstName(name);
  return {
    subject: "Welcome to FocusGate 🔒",
    html: emailShell(
      `${fn}, your first Locked In session is one click away.`,
      `
      <p style="margin:0 0 16px;">Hey ${fn},</p>
      <p style="margin:0 0 16px;">Welcome to FocusGate. You said you'd study — now let's make it stick.</p>
      <p style="margin:0 0 16px;">Pick your sites to block, choose a session length, and lock in. Once it starts, there's no backing out until it's done — that's the whole point.</p>
      ${button("Start your first session", "https://focusgate.site/dashboard")}
      `
    ),
  };
}

export function trialEndingEmail(name: string): { subject: string; html: string } {
  const fn = firstName(name);
  return {
    subject: "Your FocusGate trial ends tomorrow",
    html: emailShell(
      "1 day left — upgrade to keep everything you've built.",
      `
      <p style="margin:0 0 16px;">Hey ${fn},</p>
      <p style="margin:0 0 16px;">Your 5-day free trial ends tomorrow. After that, Locked In Mode still works, but you'll lose Break Gates, friend groups, Dead Man's Switch, and badges above Common tier — plus your blocked sites cap at 1.</p>
      <p style="margin:0 0 16px; color:${MUTED};">Your streak, stats, and badges stay exactly as they are — upgrading just unlocks them again.</p>
      ${button("Keep everything — upgrade now", "https://focusgate.site/#pricing")}
      `
    ),
  };
}

export function reEngagementEmail(name: string): { subject: string; html: string } {
  const fn = firstName(name);
  return {
    subject: "Your streak is waiting for you",
    html: emailShell(
      "It's been a few days — your next session is one click away.",
      `
      <p style="margin:0 0 16px;">Hey ${fn},</p>
      <p style="margin:0 0 16px;">It's been a few days since your last Locked In session. No pressure — just a nudge that your dashboard, your blocked sites, and your streak are all still right where you left them.</p>
      ${button("Get back to it", "https://focusgate.site/dashboard")}
      `
    ),
  };
}

export function milestoneStreakEmail(name: string, streak: number): { subject: string; html: string } {
  const fn = firstName(name);
  return {
    subject: `🔥 ${streak}-day streak — keep it going`,
    html: emailShell(
      `${fn} just hit a ${streak}-day streak.`,
      `
      <p style="margin:0 0 16px;">Nice work, ${fn}.</p>
      <p style="margin:0 0 4px; font-size:19px; font-weight:800;">🔥 ${streak}-day streak</p>
      <p style="margin:0 0 16px; color:${MUTED};">That's ${streak} days in a row you showed up and locked in. Keep it alive.</p>
      ${button("Start today's session", "https://focusgate.site/dashboard")}
      `
    ),
  };
}

export function milestoneBadgeEmail(name: string, badge: { name: string; description: string; rarity: string }): { subject: string; html: string } {
  const fn = firstName(name);
  return {
    subject: `🏆 You unlocked ${badge.name}`,
    html: emailShell(
      `You just unlocked ${badge.name}.`,
      `
      <p style="margin:0 0 16px;">Nice work, ${fn}.</p>
      <p style="margin:0 0 8px; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${GOLD};">${badge.rarity} badge unlocked</p>
      <p style="margin:0 0 4px; font-size:19px; font-weight:800;">🏆 ${badge.name}</p>
      <p style="margin:0 0 16px; color:${MUTED};">${badge.description}</p>
      ${button("See all your badges", "https://focusgate.site/badges")}
      `
    ),
  };
}

export function launchAnnouncementEmail(name: string): { subject: string; html: string } {
  const fn = firstName(name);
  return {
    subject: "FocusGate is officially live — and your price is locked in",
    html: emailShell(
      `${fn}, your early price is locked in forever.`,
      `
      <p style="margin:0 0 16px;">Hey ${fn},</p>
      <p style="margin:0 0 16px;">FocusGate is officially out of beta. Because you joined early, your account keeps full access — Locked In Mode, unlimited blocked sites, every badge tier, unlimited friend groups, Dead Man's Switch, Break Gates, all of it — for free, permanently. No trial, no downgrade, no catch.</p>
      <p style="margin:0 0 16px; color:${MUTED};">That's our thank-you for being here before anyone else was.</p>
      ${button("Open your dashboard", "https://focusgate.site/dashboard")}
      `
    ),
  };
}
