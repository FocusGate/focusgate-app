# FocusGate automated email system

Three Edge Functions, one Database Webhook, one pg_cron schedule. **None of this is deployed
yet** — this environment has no Supabase CLI, no project link, and no service-role key, so
everything below is code and SQL ready for you to deploy, not something already live. Follow
this in order; nothing later works until the step before it is done.

## What's here

- `_shared/emailTemplates.ts` — the gold/black branded HTML for all 6 emails. Same visual
  shell as `lib/email.ts` (the Next.js app's own emails), ported by hand since Edge
  Functions run in Deno, a separate runtime that can't import from the Next.js app.
- `_shared/resend.ts` — the one place that actually calls Resend's API and logs to
  `email_logs`. Every function below routes through it.
- `send-welcome-email/` — fires on signup, via a Database Webhook (event-based, no cron).
- `daily-email-checks/` — trial-ending, re-engagement, and streak/badge congratulations,
  via pg_cron once a day.
- `send-launch-announcement/` — the one-time, manually-triggered launch email.

## 1. Install the Supabase CLI

```bash
npm install -g supabase
```

## 2. Log in and link this project

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Your project ref is the subdomain in your Supabase project URL —
`https://<project-ref>.supabase.co`.

## 3. Set the secrets the functions need

```bash
supabase secrets set RESEND_API_KEY=<your-real-resend-key>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` don't need setting — Supabase injects both
into every Edge Function automatically. Find your service-role key (if you need it for
anything else) under **Project Settings → API → service_role** — treat it like a master
password, never put it in client-side code or `NEXT_PUBLIC_*` env vars.

## 4. Run the schema migration

If you haven't already run the latest `supabase/schema.sql` additions (the "Pricing / trial
/ beta mode" and "Automated email system" sections), do that first, in the SQL Editor —
`email_logs`, `milestone_emails_sent`, `user_preferences.email_opt_in`, and the
`get_users_*()` helper functions all need to exist before these functions will work.

## 5. Deploy the three functions

```bash
supabase functions deploy send-welcome-email
supabase functions deploy daily-email-checks
supabase functions deploy send-launch-announcement
```

## 6. Wire up the welcome email — Database Webhook

This is a dashboard step, not SQL:

1. Supabase Dashboard → **Database → Webhooks** → **Create a new hook**.
2. Table: `users`. Events: **Insert** only.
3. Type: **Supabase Edge Functions**. Function: `send-welcome-email`.
4. Save.

That's it — every new row in `public.users` now fires `send-welcome-email` within moments.

## 7. Schedule the daily checks — pg_cron

First, enable the two extensions this needs (Dashboard → **Database → Extensions**, or via
SQL):

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
```

Then schedule the job — run this in the SQL Editor, with your real project ref and anon key
filled in (Project Settings → API):

```sql
select cron.schedule(
  'daily-email-checks',
  '0 9 * * *', -- 9:00 AM UTC every day
  $$
  select net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/daily-email-checks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <your-anon-key>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Change `'0 9 * * *'` if you want a different time — that's standard cron syntax, always in
UTC.

## 8. Confirm it's actually scheduled — the Cron Jobs dashboard

Supabase Dashboard (left sidebar) → **Integrations** → **Cron Jobs** (on older dashboard
versions it's under **Database → Cron Jobs** instead — same feature, Supabase moved it into
Integrations at some point). You'll see `daily-email-checks` listed there with its schedule,
last run time, and status. Click into it for a run history — this is also where you'd pause
or delete it later if needed, without touching SQL again.

You can also just query it directly at any time:

```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
```

## 9. The launch announcement — when you actually launch

This one is never scheduled. When you're ready:

```bash
supabase functions invoke send-launch-announcement
```

It loops every `is_beta_user = true` account, sends the launch email, and is safe to
re-run if it fails partway through — anyone already successfully emailed (per `email_logs`)
is skipped, not re-sent.

## Checking what actually sent

```sql
select type, status, count(*) from email_logs group by type, status order by type;
select * from email_logs where email = 'someone@example.com' order by created_at desc;
```
