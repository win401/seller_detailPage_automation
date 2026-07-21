-- 우선순위 1: 셀러 이미지 업로드 풀 + Storage (docs/TASKS.md).
-- Supabase SQL Editor에 전체를 그대로 붙여넣고 한 번에 실행하세요.
-- 전부 idempotent(재실행해도 안전 — 이미 있으면 건너뜀/덮어씀).
--
-- 이 파일은 docs/supabase/schema.sql에 이미 반영된 내용과 동일합니다 —
-- schema.sql은 처음부터 새 프로젝트를 만들 때 쓰는 전체 스키마이고, 이
-- 파일은 "기존 프로젝트에 이번 변경분만 추가로 적용"하기 위한 별도 사본입니다.

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

alter table public.project_image_assets enable row level security;

drop policy if exists "project_image_assets own access" on public.project_image_assets;
create policy "project_image_assets own access" on public.project_image_assets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.project_image_assets to authenticated;

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

-- PostgREST가 새 테이블을 바로 인식하도록 스키마 캐시 강제 갱신.
notify pgrst, 'reload schema';

-- 확인용 — 실행 후 아래 두 SELECT 결과에 각각 행이 하나씩 보여야 정상입니다.
select id, public from storage.buckets where id = 'product-images';
select table_name from information_schema.tables where table_schema = 'public' and table_name = 'project_image_assets';
