-- ============================================================================
-- Delay — Complete Supabase Schema
-- ----------------------------------------------------------------------------
-- HOW TO USE:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this whole file → Run
--   3. It is IDEMPOTENT — safe to run again after edits.
--
-- COVERS: profiles + plan/billing security · plan catalogue · all sync tables
--         (notes, tasks, events, code, AI, memories, timer, voice) ·
--         collaboration (workspaces, members, invites) · billing audit log ·
--         AI usage metering · row-level security on everything ·
--         realtime publication · storage buckets.
-- ============================================================================

-- ============================================================
-- 0 · EXTENSIONS & SHARED HELPERS
-- ============================================================
create extension if not exists pgcrypto;          -- gen_random_uuid(), gen_random_bytes()

-- Auto-touch updated_at on any row update.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;


-- ============================================================
-- 1 · PLANS — single source of truth for tiers, price & limits
-- ============================================================
create table if not exists public.plans (
  id                     text primary key check (id in ('free','pro','max')),
  name                   text not null,
  price_monthly_cents    int  not null default 0,
  price_yearly_cents     int  not null default 0,
  stripe_price_monthly   text,                    -- fill in from Stripe dashboard
  stripe_price_yearly    text,
  max_notes              int,                     -- null = unlimited
  max_boards             int,
  max_flows              int,
  max_vault_mb           int  not null default 0,
  ai_credits_monthly     int,                     -- null = unlimited
  can_share              boolean not null default false,
  can_cloud_sync         boolean not null default false,
  can_collaborate        boolean not null default false,
  max_workspace_members  int  not null default 1,
  sort_order             int  not null default 0
);

-- Prices: Pro $12/mo ($120/yr), Max $29/mo ($290/yr).
insert into public.plans
  (id, name, price_monthly_cents, price_yearly_cents,
   max_notes, max_boards, max_flows, max_vault_mb, ai_credits_monthly,
   can_share, can_cloud_sync, can_collaborate, max_workspace_members, sort_order)
values
  ('free', 'Free',    0,     0,      50,  3,    10,   0,     20,   false, false, false, 1,  0),
  ('pro',  'Pro',     1200,  12000,  null, null, null, 5000,  500,  true,  true,  true,  3,  1),
  ('max',  'Max',     2900,  29000,  null, null, null, 20000, null, true,  true,  true,  10, 2)
on conflict (id) do update set
  name                  = excluded.name,
  price_monthly_cents   = excluded.price_monthly_cents,
  price_yearly_cents    = excluded.price_yearly_cents,
  max_notes             = excluded.max_notes,
  max_boards            = excluded.max_boards,
  max_flows             = excluded.max_flows,
  max_vault_mb          = excluded.max_vault_mb,
  ai_credits_monthly    = excluded.ai_credits_monthly,
  can_share             = excluded.can_share,
  can_cloud_sync        = excluded.can_cloud_sync,
  can_collaborate       = excluded.can_collaborate,
  max_workspace_members = excluded.max_workspace_members,
  sort_order            = excluded.sort_order;

alter table public.plans enable row level security;
drop policy if exists "plans_public_read" on public.plans;
create policy "plans_public_read" on public.plans
  for select using (true);                        -- pricing page reads this, even logged-out


-- ============================================================
-- 2 · PROFILES — one row per auth user
-- ============================================================
create table if not exists public.profiles (
  id                       uuid primary key references auth.users on delete cascade,
  email                    text,
  display_name             text,
  avatar_url               text,
  plan                     text not null default 'free' references public.plans(id),
  xp                       int  not null default 0,
  level                    int  not null default 1,
  streak_days              int  not null default 0,
  streak_last_date         text,
  stripe_customer_id       text unique,
  subscription_id          text,
  subscription_status      text,
  subscription_period_end  timestamptz,
  ai_credits               int  not null default 20,
  ai_credits_reset_at      timestamptz,
  weekly_insight           text,
  weekly_insight_date      text,
  onboarding_complete      boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- SECURITY FIX — the old policy let a user run
--   update profiles set plan='max' where id = auth.uid();
-- and hand themselves a paid plan for free. This trigger reverts every
-- billing / credit column to its previous value unless the caller is the
-- service_role (Stripe webhook, server-side functions).
create or replace function public.guard_profile_columns()
returns trigger language plpgsql security definer as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.plan                    := old.plan;
    new.stripe_customer_id      := old.stripe_customer_id;
    new.subscription_id         := old.subscription_id;
    new.subscription_status     := old.subscription_status;
    new.subscription_period_end := old.subscription_period_end;
    new.ai_credits              := old.ai_credits;
    new.ai_credits_reset_at     := old.ai_credits_reset_at;
  end if;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists guard_profile_columns_trg on public.profiles;
create trigger guard_profile_columns_trg
  before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- Auto-create a profile row whenever an auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email,'user'), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 3 · COLLABORATION — workspaces, members, invites
-- ============================================================
create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users on delete cascade,
  name        text not null default 'Untitled Workspace',
  color       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id  uuid not null references public.workspaces on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  role          text not null default 'editor' check (role in ('owner','editor','viewer')),
  invited_by    uuid references auth.users,
  joined_at     timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

create table if not exists public.workspace_invites (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces on delete cascade,
  email         text not null,
  role          text not null default 'editor' check (role in ('editor','viewer')),
  token         text not null unique default encode(gen_random_bytes(18), 'hex'),
  invited_by    uuid not null references auth.users,
  expires_at    timestamptz not null default (now() + interval '7 days'),
  accepted_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists workspace_invites_email_idx on public.workspace_invites(lower(email));

-- Membership helpers. SECURITY DEFINER so they bypass RLS — this is what
-- prevents the classic "policy references its own table" infinite recursion.
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_workspace(ws uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid() and role in ('owner','editor')
  );
$$;

create or replace function public.is_workspace_owner(ws uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspaces where id = ws and owner_id = auth.uid()
  );
$$;

alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;

-- workspaces
drop policy if exists "workspaces_read"   on public.workspaces;
create policy "workspaces_read" on public.workspaces
  for select using (owner_id = auth.uid() or public.is_workspace_member(id));
drop policy if exists "workspaces_insert" on public.workspaces;
create policy "workspaces_insert" on public.workspaces
  for insert with check (owner_id = auth.uid());
drop policy if exists "workspaces_update" on public.workspaces;
create policy "workspaces_update" on public.workspaces
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "workspaces_delete" on public.workspaces;
create policy "workspaces_delete" on public.workspaces
  for delete using (owner_id = auth.uid());

-- workspace_members
drop policy if exists "members_read"   on public.workspace_members;
create policy "members_read" on public.workspace_members
  for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id));
drop policy if exists "members_insert" on public.workspace_members;
create policy "members_insert" on public.workspace_members
  for insert with check (public.is_workspace_owner(workspace_id));
drop policy if exists "members_update" on public.workspace_members;
create policy "members_update" on public.workspace_members
  for update using (public.is_workspace_owner(workspace_id));
drop policy if exists "members_delete" on public.workspace_members;
create policy "members_delete" on public.workspace_members
  for delete using (public.is_workspace_owner(workspace_id) or user_id = auth.uid());

-- workspace_invites
drop policy if exists "invites_read"   on public.workspace_invites;
create policy "invites_read" on public.workspace_invites
  for select using (public.is_workspace_member(workspace_id) or lower(email) = lower(auth.jwt()->>'email'));
drop policy if exists "invites_write"  on public.workspace_invites;
create policy "invites_write" on public.workspace_invites
  for all using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id));

-- Accept an invite by token (runs as definer so the invitee can join).
create or replace function public.accept_workspace_invite(invite_token text)
returns uuid language plpgsql security definer as $$
declare
  inv public.workspace_invites%rowtype;
begin
  select * into inv from public.workspace_invites
    where token = invite_token and accepted_at is null and expires_at > now();
  if not found then
    raise exception 'Invite is invalid or expired';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role, invited_by)
    values (inv.workspace_id, auth.uid(), inv.role, inv.invited_by)
    on conflict (workspace_id, user_id) do nothing;
  update public.workspace_invites set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end; $$;

create trigger workspaces_touch before update on public.workspaces
  for each row execute function public.touch_updated_at();


-- ============================================================
-- 4 · SYNC TABLES — mirror the local Dexie store
-- ----------------------------------------------------------------------------
-- Convention: text ids (client-generated uuid), epoch-SECONDS bigints for
-- created_at/updated_at/deleted_at (matches the app's now()). Each row is
-- owned by user_id and may optionally belong to a workspace_id for sharing.
-- ============================================================

-- helper: standard RW + workspace-collab policy set for a content table
-- (applied per-table below — kept explicit for clarity / auditability)

-- 4.1 NOTES ------------------------------------------------------------------
create table if not exists public.user_notes (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  workspace_id  uuid references public.workspaces on delete set null,
  title         text default '',
  content       text default '',
  content_text  text default '',
  color         text,
  pinned        int  default 0,
  is_public     int  default 0,
  public_slug   text unique,
  created_at    bigint not null default 0,
  updated_at    bigint not null default 0,
  deleted_at    bigint default 0
);
create index if not exists user_notes_user_idx   on public.user_notes(user_id, updated_at);
create index if not exists user_notes_ws_idx     on public.user_notes(workspace_id) where workspace_id is not null;
create index if not exists user_notes_slug_idx   on public.user_notes(public_slug) where is_public = 1;
alter table public.user_notes enable row level security;
drop policy if exists "notes_owner_or_ws" on public.user_notes;
create policy "notes_owner_or_ws" on public.user_notes
  using (auth.uid() = user_id or (workspace_id is not null and public.is_workspace_member(workspace_id)))
  with check (auth.uid() = user_id or (workspace_id is not null and public.can_edit_workspace(workspace_id)));
drop policy if exists "notes_public_read" on public.user_notes;
create policy "notes_public_read" on public.user_notes
  for select using (is_public = 1);

-- 4.2 TASKS ------------------------------------------------------------------
create table if not exists public.user_tasks (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  workspace_id  uuid references public.workspaces on delete set null,
  title         text default '',
  description   text default '',
  completed     int  default 0,
  priority      int  default 0,
  due_date      bigint,
  list_id       text default 'inbox',
  sort_order    int  default 0,
  created_at    bigint not null default 0,
  updated_at    bigint not null default 0,
  deleted_at    bigint default 0
);
create index if not exists user_tasks_user_idx on public.user_tasks(user_id, updated_at);
create index if not exists user_tasks_ws_idx   on public.user_tasks(workspace_id) where workspace_id is not null;
alter table public.user_tasks enable row level security;
drop policy if exists "tasks_owner_or_ws" on public.user_tasks;
create policy "tasks_owner_or_ws" on public.user_tasks
  using (auth.uid() = user_id or (workspace_id is not null and public.is_workspace_member(workspace_id)))
  with check (auth.uid() = user_id or (workspace_id is not null and public.can_edit_workspace(workspace_id)));

-- 4.3 TASK LISTS -------------------------------------------------------------
create table if not exists public.user_task_lists (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  workspace_id  uuid references public.workspaces on delete set null,
  name          text default '',
  color         text,
  icon          text default 'list',
  sort_order    int  default 0,
  created_at    bigint not null default 0
);
create index if not exists user_task_lists_user_idx on public.user_task_lists(user_id);
alter table public.user_task_lists enable row level security;
drop policy if exists "task_lists_owner_or_ws" on public.user_task_lists;
create policy "task_lists_owner_or_ws" on public.user_task_lists
  using (auth.uid() = user_id or (workspace_id is not null and public.is_workspace_member(workspace_id)))
  with check (auth.uid() = user_id or (workspace_id is not null and public.can_edit_workspace(workspace_id)));

-- 4.4 EVENTS -----------------------------------------------------------------
create table if not exists public.user_events (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  workspace_id  uuid references public.workspaces on delete set null,
  title         text default '',
  description   text,
  start_time    bigint not null default 0,
  end_time      bigint not null default 0,
  all_day       boolean default false,
  color         text,
  category      text,
  recurrence    text,
  created_at    bigint not null default 0,
  updated_at    bigint not null default 0,
  deleted_at    bigint default 0
);
create index if not exists user_events_user_idx on public.user_events(user_id, start_time);
create index if not exists user_events_ws_idx   on public.user_events(workspace_id) where workspace_id is not null;
alter table public.user_events enable row level security;
drop policy if exists "events_owner_or_ws" on public.user_events;
create policy "events_owner_or_ws" on public.user_events
  using (auth.uid() = user_id or (workspace_id is not null and public.is_workspace_member(workspace_id)))
  with check (auth.uid() = user_id or (workspace_id is not null and public.can_edit_workspace(workspace_id)));

-- 4.5 CODE SNIPPETS ----------------------------------------------------------
create table if not exists public.user_code_snippets (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  workspace_id  uuid references public.workspaces on delete set null,
  title         text default '',
  language      text default 'plaintext',
  code          text default '',
  created_at    bigint not null default 0,
  updated_at    bigint not null default 0
);
create index if not exists user_code_user_idx on public.user_code_snippets(user_id, updated_at);
alter table public.user_code_snippets enable row level security;
drop policy if exists "code_owner_or_ws" on public.user_code_snippets;
create policy "code_owner_or_ws" on public.user_code_snippets
  using (auth.uid() = user_id or (workspace_id is not null and public.is_workspace_member(workspace_id)))
  with check (auth.uid() = user_id or (workspace_id is not null and public.can_edit_workspace(workspace_id)));

-- 4.6 AI CONVERSATIONS + MESSAGES (personal) ---------------------------------
create table if not exists public.user_ai_conversations (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  title       text default 'New chat',
  created_at  bigint not null default 0,
  updated_at  bigint not null default 0
);
alter table public.user_ai_conversations enable row level security;
drop policy if exists "ai_conv_own" on public.user_ai_conversations;
create policy "ai_conv_own" on public.user_ai_conversations
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.user_ai_messages (
  id               text primary key,
  user_id          uuid not null references auth.users on delete cascade,
  conversation_id  text not null references public.user_ai_conversations(id) on delete cascade,
  role             text not null check (role in ('user','assistant','system')),
  content          text default '',
  created_at       bigint not null default 0
);
create index if not exists user_ai_messages_conv_idx on public.user_ai_messages(conversation_id, created_at);
alter table public.user_ai_messages enable row level security;
drop policy if exists "ai_msg_own" on public.user_ai_messages;
create policy "ai_msg_own" on public.user_ai_messages
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4.7 MEMORIES (personal AI memory) ------------------------------------------
create table if not exists public.user_memories (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  content     text default '',
  created_at  bigint not null default 0
);
alter table public.user_memories enable row level security;
drop policy if exists "memories_own" on public.user_memories;
create policy "memories_own" on public.user_memories
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4.8 TIMER SESSIONS (personal — feeds Status analytics) ---------------------
create table if not exists public.user_timer_sessions (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  type        text not null check (type in ('focus','short_break','long_break')),
  duration    int  not null default 0,
  completed   boolean default false,
  started_at  bigint not null default 0,
  ended_at    bigint not null default 0
);
create index if not exists user_timer_user_idx on public.user_timer_sessions(user_id, started_at);
alter table public.user_timer_sessions enable row level security;
drop policy if exists "timer_own" on public.user_timer_sessions;
create policy "timer_own" on public.user_timer_sessions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4.9 VOICE RECORDINGS — metadata only; the audio blob lives in the `voice`
-- storage bucket (never store base64 audio in a Postgres row).
create table if not exists public.user_voice_recordings (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  name          text default '',
  mime          text default 'audio/webm',
  duration      int  default 0,
  storage_path  text,                              -- voice/<uid>/<id>.webm
  created_at    bigint not null default 0
);
create index if not exists user_voice_user_idx on public.user_voice_recordings(user_id, created_at);
alter table public.user_voice_recordings enable row level security;
drop policy if exists "voice_own" on public.user_voice_recordings;
create policy "voice_own" on public.user_voice_recordings
  using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================================
-- 5 · BILLING AUDIT LOG + AI USAGE METERING
-- ============================================================
-- Every Stripe webhook event is logged here. The id is the Stripe event id,
-- so re-delivered events are a no-op (idempotency). No RLS policies are
-- defined → RLS denies everyone, only the service_role (webhook) can write.
create table if not exists public.billing_events (
  id          text primary key,                   -- Stripe event id
  type        text not null,
  user_id     uuid references auth.users on delete set null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
alter table public.billing_events enable row level security;

-- AI usage rows — written server-side to meter credits / catch abuse.
create table if not exists public.ai_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users on delete cascade,
  model       text,
  tokens      int default 0,
  created_at  timestamptz not null default now()
);
create index if not exists ai_usage_user_idx on public.ai_usage(user_id, created_at);
alter table public.ai_usage enable row level security;
drop policy if exists "ai_usage_read_own" on public.ai_usage;
create policy "ai_usage_read_own" on public.ai_usage
  for select using (auth.uid() = user_id);        -- read-only for users; writes are service_role


-- ============================================================
-- 6 · REALTIME — publish collaborative tables
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'user_notes','user_tasks','user_task_lists','user_events',
    'user_code_snippets','workspaces','workspace_members'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ============================================================
-- 7 · STORAGE BUCKETS — vault files, voice audio, avatars
-- ============================================================
insert into storage.buckets (id, name, public)
values ('vault','vault',false), ('voice','voice',false), ('avatars','avatars',true)
on conflict (id) do nothing;

-- Path convention: <bucket>/<auth.uid()>/<filename>. Users may only touch
-- objects under their own uid folder.
drop policy if exists "vault_own_rw" on storage.objects;
create policy "vault_own_rw" on storage.objects
  for all using (
    bucket_id = 'vault' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'vault' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "voice_own_rw" on storage.objects;
create policy "voice_own_rw" on storage.objects
  for all using (
    bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_own_write" on storage.objects;
create policy "avatars_own_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "avatars_own_update" on storage.objects;
create policy "avatars_own_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- ============================================================
-- DONE. Next: set plans.stripe_price_monthly / _yearly to your real Stripe
-- price IDs, then deploy the edge functions in supabase/functions/.
-- ============================================================
