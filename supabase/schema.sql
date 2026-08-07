-- FocusGate schema — run in the Supabase SQL editor.
-- Safe to re-run: guards every create with IF NOT EXISTS / OR REPLACE.

create extension if not exists "pgcrypto";

-- ---------- tables ----------

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  streak integer not null default 0,
  total_focus_hours numeric not null default 0
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  duration_minutes integer,
  completed boolean not null default false
);

create table if not exists public.blocked_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  unlock_condition text not null
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create table if not exists public.friend_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.friend_groups (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  group_id uuid references public.friend_groups (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  plan text check (plan in ('free', 'pro', 'lifetime')),
  created_at timestamptz not null default now()
);

-- idempotent for installs that ran this file before `plan` existed
alter table public.waitlist add column if not exists plan text;
alter table public.waitlist drop constraint if exists waitlist_plan_check;
alter table public.waitlist add constraint waitlist_plan_check check (plan in ('free', 'pro', 'lifetime'));

-- ---------- seed badges (matches the landing page badge showcase) ----------

insert into public.badges (name, description, rarity, unlock_condition) values
  ('First Lock', 'Complete your first Locked In session', 'common', 'completed_sessions >= 1'),
  ('Early Bird', 'Start a session before 7am', 'common', 'session started before 07:00 local time'),
  ('Night Owl', 'Start a session after 10pm', 'common', 'session started after 22:00 local time'),
  ('On Fire', 'Complete a 7-day study streak', 'rare', 'streak >= 7'),
  ('Deep Worker', 'Complete a single 4-hour Locked In session', 'rare', 'longest_session_minutes >= 240'),
  ('Unstoppable', 'Complete a 30-day study streak', 'epic', 'streak >= 30'),
  ('Distraction Slayer', 'Block 1,000 distraction attempts', 'epic', 'blocked_attempts >= 1000'),
  ('FocusGate Legend', 'Use FocusGate every single day for 365 days', 'legendary', 'streak >= 365')
on conflict (name) do nothing;

-- ---------- row level security ----------

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.blocked_sites enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.friend_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.notifications enable row level security;
alter table public.waitlist enable row level security;

-- users: read your own row and the profiles of people in a shared friend group; only ever write your own row
drop policy if exists "users read own" on public.users;
create policy "users read own" on public.users for select using (auth.uid() = id);

drop policy if exists "users read groupmates" on public.users;
create policy "users read groupmates" on public.users for select using (
  exists (
    select 1 from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = users.id
  )
);

drop policy if exists "users insert own" on public.users;
create policy "users insert own" on public.users for insert with check (auth.uid() = id);

drop policy if exists "users update own" on public.users;
create policy "users update own" on public.users for update using (auth.uid() = id);

-- sessions: fully owned by the user; groupmates can see start/completion for accountability
drop policy if exists "sessions crud own" on public.sessions;
create policy "sessions crud own" on public.sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sessions read groupmates" on public.sessions;
create policy "sessions read groupmates" on public.sessions for select using (
  exists (
    select 1 from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = sessions.user_id
  )
);

-- blocked_sites: fully private to the owner
drop policy if exists "blocked_sites crud own" on public.blocked_sites;
create policy "blocked_sites crud own" on public.blocked_sites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- badges: catalog is public read-only (no direct writes from the client)
drop policy if exists "badges read all" on public.badges;
create policy "badges read all" on public.badges for select using (true);

-- user_badges: owner reads/inserts their own; groupmates can see who unlocked what
drop policy if exists "user_badges crud own" on public.user_badges;
create policy "user_badges crud own" on public.user_badges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_badges read groupmates" on public.user_badges;
create policy "user_badges read groupmates" on public.user_badges for select using (
  exists (
    select 1 from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = user_badges.user_id
  )
);

-- friend_groups: members can read; any authenticated user can create (becomes creator).
-- The creator clause matters beyond "nice to have" — createFriendGroup() does
-- insert(...).select().single(), and Postgres applies this SELECT policy to that
-- RETURNING row too. At the instant of creation the creator isn't in group_members yet
-- (that's a separate follow-up insert), so without `auth.uid() = created_by` here the
-- RETURNING read fails RLS and the whole insert errors with the same 42501 a broken
-- INSERT policy would produce — easy to misdiagnose as the wrong policy being broken.
drop policy if exists "friend_groups read member" on public.friend_groups;
create policy "friend_groups read member" on public.friend_groups for select using (
  auth.uid() = created_by
  or exists (select 1 from public.group_members gm where gm.group_id = friend_groups.id and gm.user_id = auth.uid())
);

drop policy if exists "friend_groups insert own" on public.friend_groups;
create policy "friend_groups insert own" on public.friend_groups for insert with check (auth.uid() = created_by);

-- group_members: members can see the roster of their own groups; users can add themselves (join)
drop policy if exists "group_members read member" on public.group_members;
create policy "group_members read member" on public.group_members for select using (
  exists (select 1 from public.group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid())
);

drop policy if exists "group_members insert self" on public.group_members;
create policy "group_members insert self" on public.group_members for insert with check (auth.uid() = user_id);

drop policy if exists "group_members delete self" on public.group_members;
create policy "group_members delete self" on public.group_members for delete using (auth.uid() = user_id);

-- notifications: only the recipient can read/update (mark read); inserted via notifyFriendGroup on behalf of group members
drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications for update using (auth.uid() = user_id);

drop policy if exists "notifications insert groupmate" on public.notifications;
create policy "notifications insert groupmate" on public.notifications for insert with check (
  group_id is null or exists (
    select 1 from public.group_members gm where gm.group_id = notifications.group_id and gm.user_id = auth.uid()
  )
);

-- waitlist: anyone (including anonymous visitors) can join; no reads from the client
drop policy if exists "waitlist insert anyone" on public.waitlist;
create policy "waitlist insert anyone" on public.waitlist for insert with check (true);

-- ---------- app-build migration (dashboard/badges/stats/friends/settings) ----------

alter table public.users add column if not exists longest_streak integer not null default 0;

drop policy if exists "users delete own" on public.users;
create policy "users delete own" on public.users for delete using (auth.uid() = id);

create index if not exists sessions_user_start_idx on public.sessions (user_id, start_time desc);

alter table public.blocked_sites add column if not exists sort_order integer not null default 0;

-- user_preferences: a separate table, not columns on `users` — `users` has a
-- blanket groupmate-read policy for profile display, and preferences must not
-- be groupmate-visible (RLS can't filter at the column level).
create table if not exists public.user_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  share_session_starts boolean not null default true,
  notify_friend_activity boolean not null default true,
  session_break_reminders boolean not null default false,
  break_reminder_interval_minutes integer not null default 60,
  default_session_minutes integer not null default 60,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences crud own" on public.user_preferences;
create policy "user_preferences crud own" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- session_reactions: 🔥-react to a groupmate's session. Reuses the same
-- groupmate self-join pattern (via group_members) used everywhere else.
create table if not exists public.session_reactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  emoji text not null default '🔥',
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

alter table public.session_reactions enable row level security;

drop policy if exists "session_reactions read groupmates" on public.session_reactions;
create policy "session_reactions read groupmates" on public.session_reactions for select using (
  exists (
    select 1 from public.sessions s
    join public.group_members gm1 on gm1.user_id = s.user_id
    join public.group_members gm2 on gm2.group_id = gm1.group_id
    where s.id = session_reactions.session_id and gm2.user_id = auth.uid()
  )
);

drop policy if exists "session_reactions insert groupmate" on public.session_reactions;
create policy "session_reactions insert groupmate" on public.session_reactions for insert with check (
  auth.uid() = user_id and exists (
    select 1 from public.sessions s
    join public.group_members gm1 on gm1.user_id = s.user_id
    join public.group_members gm2 on gm2.group_id = gm1.group_id
    where s.id = session_reactions.session_id and gm2.user_id = auth.uid()
  )
);

drop policy if exists "session_reactions delete own" on public.session_reactions;
create policy "session_reactions delete own" on public.session_reactions for delete using (auth.uid() = user_id);

-- ---------- fix: infinite recursion in group_members RLS policy ----------
-- "group_members read member" queried public.group_members from inside its own USING
-- clause. Evaluating that inner query re-triggers the same policy on group_members with
-- no base case, so Postgres throws "infinite recursion detected in policy for relation
-- \"group_members\"" on every read of group_members — and by extension every other table
-- whose groupmate policy joins through it (users, sessions, user_badges, notifications,
-- session_reactions), since evaluating those joins requires evaluating group_members's own
-- policy too. A `security definer` function breaks the cycle: it runs with RLS bypassed
-- internally, so checking membership no longer re-enters the calling policy.
create or replace function public.is_group_member(_group_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = _user_id
  );
$$;

drop policy if exists "group_members read member" on public.group_members;
create policy "group_members read member" on public.group_members for select using (
  public.is_group_member(group_members.group_id, auth.uid())
);

-- ---------- brain games: per-user high scores ----------
-- One row per (user, game) — "game" is a short slug ("memory-match", "math-sprint",
-- "geography-quiz") rather than a foreign key, since these aren't part of the focus-tracking
-- schema and don't need a catalog table of their own.
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  game text not null,
  best_score numeric not null,
  higher_is_better boolean not null,
  updated_at timestamptz not null default now(),
  unique (user_id, game)
);
alter table public.game_scores enable row level security;

drop policy if exists "game_scores crud own" on public.game_scores;
create policy "game_scores crud own" on public.game_scores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Friction Triggers: anti-distraction system ----------

-- Break gate attempts (pass/fail log, not a "best score" — reuses game_scores' slug style)
create table if not exists public.break_gate_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  game text not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);
alter table public.break_gate_attempts enable row level security;
drop policy if exists "break_gate_attempts crud own" on public.break_gate_attempts;
create policy "break_gate_attempts crud own" on public.break_gate_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Intentional break notes — shared by 5-min breaks AND emergency unblocks
create table if not exists public.break_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  note_text text not null,
  break_duration_minutes integer,
  is_emergency boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.break_notes enable row level security;
drop policy if exists "break_notes crud own" on public.break_notes;
create policy "break_notes crud own" on public.break_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Emergency unblocks — immutable audit log, no update/delete policy on purpose
create table if not exists public.emergency_unblocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  reason_text text not null,
  was_paid boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.emergency_unblocks enable row level security;
drop policy if exists "emergency_unblocks read own" on public.emergency_unblocks;
create policy "emergency_unblocks read own" on public.emergency_unblocks for select using (auth.uid() = user_id);
drop policy if exists "emergency_unblocks insert own" on public.emergency_unblocks;
create policy "emergency_unblocks insert own" on public.emergency_unblocks for insert with check (auth.uid() = user_id);

-- Group accountability settings — columns on friend_groups, editable by the creator only
alter table public.friend_groups add column if not exists notify_on_violation boolean not null default true;
alter table public.friend_groups add column if not exists pause_streak_on_violation boolean not null default true;
alter table public.friend_groups add column if not exists cooldown_minutes integer not null default 5;
alter table public.friend_groups add column if not exists silent_mode boolean not null default false;

drop policy if exists "friend_groups update by creator" on public.friend_groups;
create policy "friend_groups update by creator" on public.friend_groups
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);

-- Dead Man's Switch violations — real-time group notifications. `attempted_site` is nullable
-- since today's only writer is the in-app "Simulate slip-up" button (no browser extension
-- exists yet to report a real one) — a future extension is just one more caller of the same
-- insert path.
create table if not exists public.group_violations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.friend_groups (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  attempted_site text,
  comeback_note text,
  created_at timestamptz not null default now()
);
alter table public.group_violations enable row level security;

drop policy if exists "group_violations read groupmates" on public.group_violations;
create policy "group_violations read groupmates" on public.group_violations for select using (
  public.is_group_member(group_violations.group_id, auth.uid())
);
drop policy if exists "group_violations insert self" on public.group_violations;
create policy "group_violations insert self" on public.group_violations for insert with check (
  auth.uid() = user_id and public.is_group_member(group_violations.group_id, auth.uid())
);
drop policy if exists "group_violations update own comeback note" on public.group_violations;
create policy "group_violations update own comeback note" on public.group_violations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime delivery for group violation notifications (INSERTs pushed live to group members).
-- Requires Realtime enabled on the project (Database → Replication) — this line alone
-- silently no-ops if that project-level toggle is off.
alter publication supabase_realtime add table public.group_violations;

-- New badge for passing a break gate — parsed by the existing checkAndUnlockBadges name match.
insert into public.badges (name, description, rarity, unlock_condition)
values ('Focused Under Pressure', 'Passed a break gate challenge under time pressure.', 'rare', 'break_gates_passed:1')
on conflict (name) do nothing;

-- ---------- The Gates control panel: per-user friction settings ----------
-- These live on user_preferences (not a new table) because they're the same shape as the
-- existing private per-user settings and are covered by its "crud own" policy already —
-- deliberately NOT on `users`, which has a blanket groupmate-read policy.
alter table public.user_preferences add column if not exists break_gates_enabled boolean not null default true;
-- 'ask' | 'memory-match' | 'math-sprint' | 'geography-quiz' — 'ask' shows the chooser mid-session.
alter table public.user_preferences add column if not exists break_gate_default_challenge text not null default 'ask';
-- 'easy' | 'normal' | 'hard' — maps to the gate countdown length (see GATE_SECONDS_BY_DIFFICULTY).
alter table public.user_preferences add column if not exists break_gate_difficulty text not null default 'normal';
alter table public.user_preferences add column if not exists break_notes_enabled boolean not null default true;
alter table public.user_preferences add column if not exists break_note_min_chars integer not null default 50;

-- ---------- Public accountability instead of technical uninstall-prevention ----------
-- Uninstalling the extension mid-session can't be technically blocked (no Chrome API for
-- it), so this is the honest substitute: the extension detects "this device just synced
-- with an active remote session for the very first time since this install" (see
-- background.js's HAS_SYNCED storage flag) and flags the session here instead. Shown in
-- the user's own stats and pushed to their friend group as a `notifications` row —
-- reputational cost, not a technical wall.
alter table public.sessions add column if not exists interrupted_by_uninstall boolean not null default false;

-- ---------- Badge tier reorg: Common / Rare / Epic / Mythic / Legendary ----------

-- Widen the rarity check to add 'mythic' (sits between 'epic' and 'legendary').
alter table public.badges drop constraint if exists badges_rarity_check;
alter table public.badges add constraint badges_rarity_check check (rarity in ('common', 'rare', 'epic', 'mythic', 'legendary'));

-- Night Owl is gone for good — cascades to any user_badges rows referencing it, so anyone
-- who'd already unlocked it simply no longer has it. Deliberate: we don't want to keep
-- rewarding late-night sessions even retroactively.
delete from public.badges where name = 'Night Owl';

-- Early Bird becomes Early Riser (8am instead of 7am) — renamed in place rather than
-- deleted+reinserted so anyone who already unlocked it keeps it under the new name.
update public.badges
set name = 'Early Riser', description = 'Start a session before 8am', unlock_condition = 'session started before 08:00 local time'
where name = 'Early Bird';

-- users.blocked_attempts — running counter for "Distraction Slayer", incremented by the
-- extension every time a navigation gets redirected to blocked.html (see
-- extension/blocked.js + the increment_blocked_attempts() RPC below). Previously this
-- badge was permanently unearnable (no extension existed yet to count anything); it's
-- real now.
alter table public.users add column if not exists blocked_attempts integer not null default 0;

-- Atomic increment via RPC rather than a client read-modify-write PATCH, so two rapid
-- syncs from the same device (or a slow one racing a fast one) can't clobber each other's
-- count. security invoker (the default) means it still runs under the caller's own RLS —
-- "users update own" already restricts this to the signed-in user's own row.
create or replace function public.increment_blocked_attempts(p_user_id uuid, p_amount integer)
returns void
language sql
as $$
  update public.users set blocked_attempts = blocked_attempts + p_amount where id = p_user_id;
$$;

-- New badges. unlock_condition follows the existing convention: either a
-- `metric >= number` string the generic engine in lib/stats.ts's parseThreshold /
-- getMetricValue can parse, or free-form descriptive text for the badges that are
-- special-cased by name in lib/supabase.ts's checkAndUnlockBadges (same pattern already
-- used for Early Riser).
insert into public.badges (name, description, rarity, unlock_condition) values
  ('Clean Slate', 'Finish a session with zero break gates used', 'common', 'session completed with zero break gates used'),
  ('Weekend Warrior', 'Study on both Saturday and Sunday', 'common', 'completed sessions on both a Saturday and a Sunday'),
  ('Gate Keeper', 'Pass 25 break gates', 'rare', 'break_gates_passed >= 25'),
  ('No Excuses', '10 sessions with zero emergency unblocks used', 'rare', 'clean_sessions >= 10'),
  ('Iron Focus', 'Top your group leaderboard for 4 straight weeks', 'epic', 'rank #1 on a friend group leaderboard for 4 consecutive weeks'),
  ('Century Club', '100 total hours focused', 'epic', 'total_focus_hours >= 100'),
  ('Untouchable', '90 day streak with zero broken sessions', 'mythic', 'streak >= 90 with zero sessions interrupted by uninstalling'),
  ('The Regulator', '500 hours focused all time', 'mythic', 'total_focus_hours >= 500')
on conflict (name) do nothing;

-- weekly_leaderboard_wins — snapshots "this user was #1 on this group's leaderboard this
-- ISO week", recorded client-side whenever someone loads The Gates page and their group's
-- leaderboard shows them in first place (see lib/supabase.ts's recordWeeklyLeaderboardWin).
-- There's no cron/scheduled job in this stack, so this is necessarily best-effort: a week
-- where nobody in the group opens the app never gets a winner recorded. checkIronFocus()
-- looks for any 4 consecutive ISO weeks of wins in the same group.
create table if not exists public.weekly_leaderboard_wins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  group_id uuid not null references public.friend_groups (id) on delete cascade,
  iso_week text not null, -- e.g. '2026-W32'
  created_at timestamptz not null default now(),
  unique (user_id, group_id, iso_week)
);

alter table public.weekly_leaderboard_wins enable row level security;

drop policy if exists "weekly_leaderboard_wins crud own" on public.weekly_leaderboard_wins;
create policy "weekly_leaderboard_wins crud own" on public.weekly_leaderboard_wins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weekly_leaderboard_wins read groupmates" on public.weekly_leaderboard_wins;
create policy "weekly_leaderboard_wins read groupmates" on public.weekly_leaderboard_wins for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = weekly_leaderboard_wins.group_id and gm.user_id = auth.uid()
  )
);

-- ---------- Break system redesign: custom duration, no more site-unblocking ----------

-- Precise requested duration in seconds (custom breaks now go as low as 1 second, which
-- `break_duration_minutes` can't represent) — that legacy column is left in place,
-- still populated (rounded) for anything not yet updated to read the new one.
alter table public.break_notes add column if not exists break_duration_seconds integer;

-- How long the break actually ran before it ended — equal to break_duration_seconds for a
-- break that ran its full course, shorter when "I'm ready, back to focus" ends it early.
-- Nullable until the break actually ends (see lib/supabase.ts's
-- updateBreakNoteActualDuration / extension/lib/supabaseApi.js's equivalent).
alter table public.break_notes add column if not exists actual_duration_seconds integer;

-- ---------- Session Modes ----------
-- Locked In Mode's actual blocking/enforcement is identical across every mode — these
-- columns only drive which *structure* wraps it (auto-cycling breaks, forced gate
-- difficulty, a bound friend group, etc.), read client-side by lib/sessionModes.ts and
-- LockedInOverlay.tsx. 'custom' is the original manual-duration/manual-break flow.
alter table public.sessions add column if not exists session_mode text not null default 'custom';
alter table public.sessions drop constraint if exists sessions_session_mode_check;
alter table public.sessions add constraint sessions_session_mode_check
  check (session_mode in ('pomodoro', 'exam_cram', 'group_study', 'all_nighter', 'deep_focus', 'custom'));

-- Which friend group a Group Study session is bound to — notifications, presence dots, and
-- the end-of-session group summary all scope to this one group rather than every group the
-- user happens to belong to. Null for every other mode.
alter table public.sessions add column if not exists group_id uuid references public.friend_groups (id) on delete set null;

-- Free-form per-mode settings that don't deserve their own column (Pomodoro's cycle count,
-- All Nighter's checkpoint interval) — read/written only by the mode that owns them.
alter table public.sessions add column if not exists mode_config jsonb;

-- ---------- roadmap signups (landing page "Coming Soon" section) ----------
-- Deliberately separate from public.waitlist rather than reusing its `plan` column — this
-- is signal about which *platform* to build next (desktop/iOS/Android/all), not which
-- pricing tier someone wants, and the two shouldn't be conflated in one table.
create table if not exists public.roadmap_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  platform_interest text not null check (platform_interest in ('desktop', 'ios', 'android', 'all')),
  created_at timestamptz not null default now()
);

alter table public.roadmap_signups enable row level security;

-- Anyone (including anonymous visitors) can join; no reads from the client — same posture
-- as the waitlist table above.
drop policy if exists "roadmap_signups insert anyone" on public.roadmap_signups;
create policy "roadmap_signups insert anyone" on public.roadmap_signups for insert with check (true);
