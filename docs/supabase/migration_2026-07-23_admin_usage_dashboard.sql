-- 관리자 회원/사용량 대시보드 (docs/TASKS.md "보류/리서치 후보" -> 우선순위 승격).
-- Supabase SQL Editor에 전체를 그대로 붙여넣고 한 번에 실행하세요.
-- 전부 idempotent(재실행해도 안전 — 이미 있으면 건너뜀).
--
-- 이 파일은 docs/supabase/schema.sql에 이미 반영된 내용과 동일합니다 —
-- schema.sql은 처음부터 새 프로젝트를 만들 때 쓰는 전체 스키마이고, 이
-- 파일은 "기존 프로젝트에 이번 변경분만 추가로 적용"하기 위한 별도 사본입니다.
--
-- 설계: profiles/detail_page_projects/agent_runs/usage_events 4개 테이블
-- 각각에 "or is_admin()" RLS를 얹는 대신(competitor_page_analyses에 쓴
-- 방식), SECURITY DEFINER 집계 함수 2개만 추가한다. 함수 내부에서
-- is_admin()을 한 번만 체크하고 집계된 숫자/제한된 컬럼만 반환하므로,
-- 관리자에게 4개 테이블의 전체 CRUD 우회 권한을 여는 것보다 노출 범위가
-- 좁다. 각 테이블 자체의 RLS/정책은 이번에 손대지 않는다.

create or replace function public.admin_usage_stats()
returns table (
  total_users bigint,
  total_projects bigint,
  total_generations bigint,
  total_zip_downloads bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 접근할 수 있습니다.' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.profiles)::bigint,
    (select count(*) from public.detail_page_projects)::bigint,
    -- 'orchestrator'는 전체 4단계 파이프라인 1회 실행마다 정확히 1건 남는
    -- 최상위 agent_runs row (src/lib/agents/orchestrator.ts) — analysis/
    -- planning/production/review 각 하위 에이전트 row와는 구분됨.
    (select count(*) from public.agent_runs where agent_type = 'orchestrator')::bigint,
    (select count(*) from public.usage_events where event_type = 'zip_download')::bigint;
end;
$$;

revoke all on function public.admin_usage_stats() from public;
grant execute on function public.admin_usage_stats() to authenticated;

create or replace function public.admin_recent_projects(result_limit integer default 20)
returns table (
  id uuid,
  title text,
  category text,
  selected_platform text,
  owner_email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 접근할 수 있습니다.' using errcode = '42501';
  end if;

  return query
  select p.id, p.title, p.category, p.selected_platform, pr.email, p.created_at
  from public.detail_page_projects p
  left join public.profiles pr on pr.id = p.user_id
  order by p.created_at desc
  limit result_limit;
end;
$$;

revoke all on function public.admin_recent_projects(integer) from public;
grant execute on function public.admin_recent_projects(integer) to authenticated;

-- PostgREST가 새 RPC 함수를 바로 인식하도록 스키마 캐시 강제 갱신.
notify pgrst, 'reload schema';

-- 확인용: 관리자 계정으로 실행하면 값이, 비관리자로 실행하면 예외가 떠야 함.
select * from public.admin_usage_stats();
