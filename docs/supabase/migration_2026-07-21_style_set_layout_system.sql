-- 우선순위 3: 스타일 세트를 레이아웃 시스템으로 확장 (docs/TASKS.md).
-- Supabase SQL Editor에 전체를 그대로 붙여넣고 한 번에 실행하세요.
-- 전부 idempotent(재실행해도 안전 — 이미 있으면 건너뜀).
--
-- 이 파일은 docs/supabase/schema.sql에 이미 반영된 내용과 동일합니다 —
-- schema.sql은 처음부터 새 프로젝트를 만들 때 쓰는 전체 스키마이고, 이
-- 파일은 "기존 프로젝트에 이번 변경분만 추가로 적용"하기 위한 별도 사본입니다.
--
-- style_sets 테이블은 지금까지 앱 코드에서 전혀 조회/저장되지 않고 항상
-- localStorage로만 동작했습니다(레이아웃 프리셋 필드가 DB에 없어서 동기화가
-- 불가능했음) — 이번에 그 필드들과 새 레이아웃 선호 필드를 추가합니다.

alter table public.style_sets add column if not exists image_position text;
alter table public.style_sets add column if not exists image_position_x numeric;
alter table public.style_sets add column if not exists image_position_y numeric;
alter table public.style_sets add column if not exists image_fit text;
alter table public.style_sets add column if not exists image_height text;
alter table public.style_sets add column if not exists spacing numeric;
alter table public.style_sets add column if not exists text_scale numeric;
alter table public.style_sets add column if not exists font_family text;
alter table public.style_sets add column if not exists letter_spacing numeric;
alter table public.style_sets add column if not exists line_height numeric;
-- 섹션 kind별 선호 layoutType — 예: {"intro": "top_notice_banner", "benefit_1": "material_closeup"}.
alter table public.style_sets add column if not exists preferred_layout_by_kind jsonb not null default '{}'::jsonb;
-- 이미지 슬롯 채우기 우선순위 — 예: ["hero", "material", "usage_scene"].
alter table public.style_sets add column if not exists image_slot_priority jsonb not null default '[]'::jsonb;

-- PostgREST가 새 컬럼을 바로 인식하도록 스키마 캐시 강제 갱신.
notify pgrst, 'reload schema';

-- 확인용 — 실행 후 style_sets의 전체 컬럼 목록에 위 12개가 보여야 정상입니다.
select column_name from information_schema.columns where table_name = 'style_sets' order by ordinal_position;
