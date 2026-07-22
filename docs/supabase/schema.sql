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
  -- 레이아웃 프리셋(우선순위 3, docs/TASKS.md) — 전 섹션에 균일 적용되는 값들.
  image_position text,
  image_position_x numeric,
  image_position_y numeric,
  image_fit text,
  image_height text,
  spacing numeric,
  text_scale numeric,
  font_family text,
  letter_spacing numeric,
  line_height numeric,
  -- 섹션 kind별 선호 layoutType, 예: {"intro": "top_notice_banner"}.
  preferred_layout_by_kind jsonb not null default '{}'::jsonb,
  -- 이미지 슬롯 채우기 우선순위, 예: ["hero", "material"].
  image_slot_priority jsonb not null default '[]'::jsonb,
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
  parent_run_id uuid references public.agent_runs(id) on delete set null,
  agent_type text not null,
  status text not null default 'pending',
  title text,
  summary text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Groups sub-agent runs (analysis/planning/production/review) under the
-- orchestrator run that invoked them, so a single workflow execution can be
-- traced as a tree instead of independent rows. Added via ALTER so it also
-- applies to an already-created agent_runs table, not just fresh installs.
alter table public.agent_runs
  add column if not exists parent_run_id uuid references public.agent_runs(id) on delete set null;

create index if not exists agent_runs_parent_run_id_idx on public.agent_runs (parent_run_id);

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

-- Standalone competitor-detail-page-image analysis (docs/CLAUDE_HANDOFF.md
-- "다음 우선 작업" #6, docs/TASKS.md §16-2). Not tied to a specific project
-- (project_id nullable) since this is a nav-bar-level analysis library the
-- user builds up across projects, unlike competitor_references which is
-- scoped to one project's generation flow.
create table if not exists public.competitor_page_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.detail_page_projects(id) on delete set null,
  label text,
  image_data_url text,
  analysis jsonb not null default '{}'::jsonb,
  source text not null default 'mock',
  -- 우선순위 5 Phase 1(2026-07-22, docs/TASKS.md): 관리자 다중 이미지 경로용 확장 —
  -- 그 경로는 image_data_url을 안 쓰고 competitor_reference_assets Storage 풀을 씀
  -- (그래서 image_data_url이 nullable), 기존 축소 MVP(단일 이미지, 무인증)는 그대로 유지.
  source_url text,
  platform text,
  product_name text,
  category text,
  analysis_status text not null default 'completed',
  updated_at timestamptz not null default now()
);

-- 우선순위 5 Phase 1: 관리자가 여러 장(페이지)의 캡처 이미지를 순서대로 저장하는 풀
-- (project_image_assets와 같은 패턴, 부모가 project가 아니라 competitor_page_analyses row).
create table if not exists public.competitor_reference_assets (
  id uuid primary key default gen_random_uuid(),
  reference_id uuid not null references public.competitor_page_analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  position integer not null default 0,
  width integer,
  height integer,
  size_bytes integer,
  mime_type text,
  created_at timestamptz not null default now()
);

-- 우선순위 5 Phase 1: 분석 1회 실행 기록 — competitor_page_analyses.analysis(최신 결과
-- 요약)와 별개로, 모델/프롬프트 버전/상태/에러까지 실행 단위로 추적한다.
create table if not exists public.competitor_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  reference_id uuid not null references public.competitor_page_analyses(id) on delete cascade,
  model text,
  prompt_version text,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  error text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 셀러가 업로드한 사진 "풀" (docs/TASKS.md 우선순위 1). 어떤 사진이 어떤 섹션/슬롯에
-- 배정됐는지는 별도 테이블 없이 draft_versions.sections jsonb 안의 imageUrl이
-- Storage public URL을 직접 담는 것으로 표현한다 — draft_versions는 항상 최신 1개
-- row만 읽히고(버전 롤백 UI 없음) 배정 정보가 이미 그 안에 온전히 들어있어서 별도
-- 배정 테이블은 불필요하다고 판단했다. 버전 롤백 기능이 생기면 이 가정이 깨지니
-- 그때 재검토할 것.
create table if not exists public.project_image_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.detail_page_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  original_filename text,
  width integer,
  height integer,
  size_bytes integer,
  slot_category text check (slot_category in ('hero','product_solo','material','usage_scene','option','size_spec','policy')),
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
alter table public.competitor_page_analyses enable row level security;
alter table public.project_image_assets enable row level security;
alter table public.competitor_reference_assets enable row level security;
alter table public.competitor_analysis_runs enable row level security;

-- 우선순위 5 Phase 1: 관리자 판별 — SECURITY INVOKER(기본값)로 충분하다. auth.uid() =
-- 호출자 자신의 profiles row만 보면 되므로 "본인만 select" RLS와 충돌하지 않는다.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

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

drop policy if exists "competitor_page_analyses own access" on public.competitor_page_analyses;
create policy "competitor_page_analyses own or admin" on public.competitor_page_analyses
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "project_image_assets own access" on public.project_image_assets;
create policy "project_image_assets own access" on public.project_image_assets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "competitor_reference_assets admin only" on public.competitor_reference_assets;
create policy "competitor_reference_assets admin only" on public.competitor_reference_assets
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "competitor_analysis_runs admin only" on public.competitor_analysis_runs;
create policy "competitor_analysis_runs admin only" on public.competitor_analysis_runs
  for all using (public.is_admin()) with check (public.is_admin());

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
grant select, insert, update, delete on public.competitor_page_analyses to authenticated;
grant select, insert, update, delete on public.project_image_assets to authenticated;
grant select, insert, update, delete on public.competitor_reference_assets to authenticated;
grant select, insert, update, delete on public.competitor_analysis_runs to authenticated;

-- Storage: 셀러가 업로드한 상품 사진 (docs/TASKS.md 우선순위 1). Public read로 감 —
-- 이 사진들은 어차피 마켓플레이스 상세페이지에 공개될 콘텐츠라 서명 URL의 만료 관리
-- 복잡도를 피하는 쪽을 택했다. 트레이드오프: 업로드 직후부터, 셀러가 아직 "공개"를
-- 결정하기 전에도 URL을 아는 사람은 볼 수 있다 — path가
-- {userId}/{projectId}/{uuid}.webp라 추측은 불가능하지만 인증되지 않은 접근인 건 맞다.
-- 쓰기(insert/update/delete)는 경로의 첫 폴더가 본인 auth.uid()와 일치할 때만 허용하는
-- Supabase 표준 "owner folder" 패턴을 그대로 따른다.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product-images public read" on storage.objects;
create policy "product-images public read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product-images owner write" on storage.objects;
create policy "product-images owner write" on storage.objects
  for insert with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "product-images owner update" on storage.objects;
create policy "product-images owner update" on storage.objects
  for update using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "product-images owner delete" on storage.objects;
create policy "product-images owner delete" on storage.objects
  for delete using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Storage: 관리자가 업로드한 경쟁사 상세페이지 캡처 (우선순위 5 Phase 1). product-images와
-- 같은 이유로 public 버킷 — 경쟁사 자체가 이미 공개된 상품페이지 캡처라 민감 정보 아님.
-- 쓰기/읽기 전부 is_admin()으로 제한(공개 읽기 URL이라 누구나 URL을 알면 열람 가능하다는
-- 트레이드오프는 product-images와 동일, "owner folder" 대신 "관리자만" 정책).
insert into storage.buckets (id, name, public)
values ('competitor-references', 'competitor-references', true)
on conflict (id) do nothing;

drop policy if exists "competitor-references admin all" on storage.objects;
create policy "competitor-references admin all" on storage.objects
  for all using (bucket_id = 'competitor-references' and public.is_admin())
  with check (bucket_id = 'competitor-references' and public.is_admin());
