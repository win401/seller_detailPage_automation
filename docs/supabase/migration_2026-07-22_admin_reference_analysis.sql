-- 우선순위 5 Phase 1: 관리자 경쟁 상세페이지 분석 기반 다지기 (docs/TASKS.md).
-- Supabase SQL Editor에 전체를 그대로 붙여넣고 한 번에 실행하세요.
-- 전부 idempotent(재실행해도 안전 — 이미 있으면 건너뜀).
--
-- 이 파일은 docs/supabase/schema.sql에 이미 반영된 내용과 동일합니다 —
-- schema.sql은 처음부터 새 프로젝트를 만들 때 쓰는 전체 스키마이고, 이
-- 파일은 "기존 프로젝트에 이번 변경분만 추가로 적용"하기 위한 별도 사본입니다.
--
-- 2026-07-15/16 축소 MVP(competitor_page_analyses, 관리자 게이팅 없음, 이미지
-- 1장만, 홀리스틱 분석)를 관리자 전용 다중 이미지 모델로 확장하는 첫 단계.
-- TASKS.md 원래 체크리스트는 "competitor_references 확장"이라고 적혀 있지만,
-- 그 테이블은 project_id가 필수인 셀러 전용 URL/메모 테이블이라 이것과는
-- 무관 — 이미 project_id가 nullable인 competitor_page_analyses가 실제
-- 확장 대상.
--
-- 좌표 보정, 섹션 단위 OCR 신뢰도, EDA 집계 대시보드는 다음 단계(Phase 2+)로
-- 미룸 — 이번엔 (1) 관리자 권한 자체, (2) 이미지를 base64 텍스트가 아니라
-- Storage 풀로 여러 장 저장, (3) 분석 실행을 별도 row로 추적하는 기반만 놓음.

-- is_admin(): SECURITY INVOKER(기본값)로 충분 — auth.uid() = 호출자 자신의
-- profiles row만 보면 되므로, profiles의 "본인만 select" RLS와 충돌 없음.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

alter table public.competitor_page_analyses add column if not exists source_url text;
alter table public.competitor_page_analyses add column if not exists platform text;
alter table public.competitor_page_analyses add column if not exists product_name text;
alter table public.competitor_page_analyses add column if not exists category text;
alter table public.competitor_page_analyses add column if not exists analysis_status text not null default 'completed';
alter table public.competitor_page_analyses add column if not exists updated_at timestamptz not null default now();
-- 관리자 다중 이미지 경로는 실제 픽셀 데이터를 competitor_reference_assets
-- Storage 풀에 넣고 이 컬럼은 비워둠 — 기존 축소 MVP row(base64 텍스트)는 그대로 유지.
alter table public.competitor_page_analyses alter column image_data_url drop not null;

drop policy if exists "competitor_page_analyses own access" on public.competitor_page_analyses;
create policy "competitor_page_analyses own or admin" on public.competitor_page_analyses
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

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
alter table public.competitor_reference_assets enable row level security;
drop policy if exists "competitor_reference_assets admin only" on public.competitor_reference_assets;
create policy "competitor_reference_assets admin only" on public.competitor_reference_assets
  for all using (public.is_admin()) with check (public.is_admin());

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
alter table public.competitor_analysis_runs enable row level security;
drop policy if exists "competitor_analysis_runs admin only" on public.competitor_analysis_runs;
create policy "competitor_analysis_runs admin only" on public.competitor_analysis_runs
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.competitor_reference_assets to authenticated;
grant select, insert, update, delete on public.competitor_analysis_runs to authenticated;

-- product-images와 동일하게 public 버킷 — 경쟁사 자체가 이미 공개된 상품페이지
-- 캡처라 민감 정보 아님, RLS는 쓰기만 admin으로 제한(기존 product-images와
-- 같은 보안 모델: 공개 읽기 URL, 소유/권한 체크는 쓰기 경로에서만).
insert into storage.buckets (id, name, public)
values ('competitor-references', 'competitor-references', true)
on conflict (id) do nothing;

drop policy if exists "competitor-references admin all" on storage.objects;
create policy "competitor-references admin all" on storage.objects
  for all using (bucket_id = 'competitor-references' and public.is_admin())
  with check (bucket_id = 'competitor-references' and public.is_admin());

-- PostgREST가 새 테이블/컬럼을 바로 인식하도록 스키마 캐시 강제 갱신.
notify pgrst, 'reload schema';

-- 확인용: 새 테이블 2개가 정상 생성됐는지 확인.
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('competitor_reference_assets', 'competitor_analysis_runs');
