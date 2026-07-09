-- Seller Detail Page Automation Supabase schema draft
-- Run this in Supabase SQL Editor after creating a Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'seller',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.style_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  default_mood text not null default 'minimal',
  default_tone text not null default 'practical',
  primary_color text not null default '#1f5f4b',
  secondary_color text not null default '#f4eadf',
  default_platform text not null default 'smartstore',
  section_visibility jsonb not null default '{}'::jsonb,
  brand_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.detail_page_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  style_set_id uuid references public.style_sets(id) on delete set null,
  title text not null,
  category text not null,
  selected_platform text not null default 'smartstore',
  selected_mood text not null default 'minimal',
  selected_tone text not null default 'practical',
  product_input jsonb not null default '{}'::jsonb,
  current_draft_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competitor_references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.detail_page_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  url text,
  memo text,
  reference_type text not null default 'same_product',
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.detail_page_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_type text not null,
  status text not null default 'pending',
  title text,
  summary text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.draft_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.detail_page_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_no integer not null default 1,
  source text not null default 'mock',
  sections jsonb not null default '[]'::jsonb,
  hidden_section_ids jsonb not null default '[]'::jsonb,
  asset_paths jsonb not null default '[]'::jsonb,
  review_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'detail_page_projects_current_draft_version_fk'
  ) then
    alter table public.detail_page_projects
      add constraint detail_page_projects_current_draft_version_fk
      foreign key (current_draft_version_id)
      references public.draft_versions(id)
      on delete set null;
  end if;
end;
$$;

create table if not exists public.user_style_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.detail_page_projects(id) on delete cascade,
  section_id text,
  section_title text,
  kind text not null,
  before text,
  after text,
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  project_id uuid references public.detail_page_projects(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.style_sets enable row level security;
alter table public.detail_page_projects enable row level security;
alter table public.competitor_references enable row level security;
alter table public.agent_runs enable row level security;
alter table public.draft_versions enable row level security;
alter table public.user_style_signals enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (id = auth.uid());
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "style_sets own access" on public.style_sets;
create policy "style_sets own access" on public.style_sets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "detail_page_projects own access" on public.detail_page_projects;
create policy "detail_page_projects own access" on public.detail_page_projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "competitor_references own access" on public.competitor_references;
create policy "competitor_references own access" on public.competitor_references
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "agent_runs own access" on public.agent_runs;
create policy "agent_runs own access" on public.agent_runs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "draft_versions own access" on public.draft_versions;
create policy "draft_versions own access" on public.draft_versions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_style_signals own access" on public.user_style_signals;
create policy "user_style_signals own access" on public.user_style_signals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "usage_events own access" on public.usage_events;
create policy "usage_events own access" on public.usage_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS policies alone are not enough: Postgres also requires table-level
-- GRANTs for a role before RLS is even evaluated. Without these, every
-- query from the `authenticated` role fails with
-- "permission denied for table ..." even though the RLS policy would
-- otherwise allow it.
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.style_sets to authenticated;
grant select, insert, update, delete on public.detail_page_projects to authenticated;
grant select, insert, update, delete on public.competitor_references to authenticated;
grant select, insert, update, delete on public.agent_runs to authenticated;
grant select, insert, update, delete on public.draft_versions to authenticated;
grant select, insert, update, delete on public.user_style_signals to authenticated;
grant select, insert, update, delete on public.usage_events to authenticated;
