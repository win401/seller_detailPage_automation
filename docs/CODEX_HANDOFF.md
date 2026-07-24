# Codex Handoff (2026-07-23)

이 문서는 사용자가 Claude와 Codex를 함께 쓰기 위해 작성한 인수인계 문서입니다 (이전 2026-07-16 버전은 완전히 낡았음 — 거기 적힌 Konva 자유 편집 작업은 이후 실사용 피드백으로 전부 되돌려졌습니다, `git log`의 `f134653`/`d2ce688` 참고). 프로젝트 전반 배경은 `docs/MVP_PLAN.md`, 지금까지의 전체 작업 이력·설계 결정·겪은 버그는 전부 `docs/TASKS.md`에 있습니다 — **이 문서는 "지금 당장 뭘 해야 하는지"만 요약하고, 세부 근거/코드 위치는 항상 TASKS.md를 원본으로 취급하세요.**

## 지금 당장 해야 할 일

**우선순위 7(관리자 회원/사용량 대시보드)을 2026-07-23 세션에서 구현·실브라우저 검증까지 끝냈습니다 — 아직 커밋 전입니다(아래 "커밋/push 상태" 참고). 다음에 뭘 할지는 아직 사용자가 정하지 않았으니, 아래 "다음 후보들"을 참고해서 사용자에게 먼저 물어보세요.**

우선순위 7에서 한 일 요약(자세한 내용은 TASKS.md 우선순위 7 참고):

1. Supabase 마이그레이션(`docs/supabase/migration_2026-07-23_admin_usage_dashboard.sql` + `schema.sql` 동기화) — `admin_usage_stats()`/`admin_recent_projects(limit)` SECURITY DEFINER 함수 2개. `profiles`/`detail_page_projects`/`agent_runs`/`usage_events` 자체 RLS는 안 건드리고, 함수 내부에서만 `is_admin()` 체크 후 집계값/제한된 컬럼만 반환(4개 테이블에 "or is_admin()"을 직접 까는 것보다 노출 범위가 좁다는 설계 — 사용자 확인 후 진행). Supabase MCP `apply_migration`으로 실제 프로젝트에 이미 적용 완료.
2. `/api/admin/usage-dashboard`(GET, `requireAdmin()` 재사용) + `/admin/usage-dashboard` 화면(reference-analysis와 동일한 gate 패턴) + nav-bar 두 번째 관리자 링크.
3. ZIP 다운로드 카운트 — `editor/page.tsx`의 `handleExport()` 성공 직후 `usage_events`에 `event_type: 'zip_download'` insert. **배포 시점 이전 다운로드는 소급 집계 안 됨.**

실브라우저로 전체 플로우 검증 완료(실제 카운트 확인 → 테스트 프로젝트 생성 → ZIP 다운로드 → `usage_events` row 생성 및 대시보드 카운트 반영 확인 → 테스트 데이터 정리) + `tsc`/`lint`/`build` 클린.

**부수 발견(버그 아님, 데이터 이슈)**: `detail_page_projects` 52건 전부 현재 `profiles` 2개 계정 어느 쪽과도 안 맞는 고아 row — 과거 QA 세션에서 계정만 정리하고 그 계정이 만든 프로젝트는 안 지운 흔적으로 보임. 대시보드 "작성자" 열엔 "-"로 표시(정상 동작, join 실패 아님). 정리 필요하면 별도 논의.

## 커밋/push 상태

우선순위 7 작업은 아직 커밋 전입니다 — 사용자에게 먼저 커밋 여부를 확인하세요(이 세션 내내 지켜온 규칙, 아래 "일하는 방식" 참고). Supabase 마이그레이션 자체는 이미 라이브 DB에 적용되어 있으니(코드 커밋과 별개), 다음 세션에서 이 마이그레이션 파일을 다시 적용하려 하면 idempotent라 안전하지만 이미 적용됐다는 걸 알고 있으면 됨.

## 일하는 방식 (이 세션 내내 지켜온 규칙, 계속 지켜주세요)

- **커밋은 사용자가 명시적으로 요청할 때만.** push도 마찬가지로 매번 별도 요청 시에만.
- **비트리비얼한 기능은 먼저 조사(Explore) → 계획 → 사용자 확인(스코프 갈림길은 꼭 물어보기) → 구현** 순서. 계획 없이 바로 큰 코드를 쓰지 않습니다.
- **실제로 동작하는지 항상 실제로 확인** — 코드만 보고 "될 것 같다"고 끝내지 않음. Playwright로 실브라우저 조작 + Supabase MCP(`mcp__claude_ai_Supabase__*`)로 DB 직접 조회/검증. 테스트 계정: `winnerv401+qae2e@gmail.com`(Supabase 프로젝트 `xfzirfufohqazkqbnxdx`, QA 전용, 현재 `profiles.role = 'admin'`으로 지정돼 있음). 사용자 실제 계정 `winnerv401@gmail.com`도 최근 가입시켜 admin으로 지정함(이메일 확인 완료 여부는 재확인 필요).
- **테스트 중 만든 프로젝트/스타일 세트/이미지/분석 row는 작업 끝에 항상 정리** — Supabase에서 직접 delete하고 정리 완료를 확인.
- **매 작업 단위 후 `docs/TASKS.md` 갱신** — 뭘 만들었는지, 실제 겪은 버그와 원인, 검증 방법까지 상세히 기록하는 게 관례(대충 "완료"만 적지 않음). 이 문서 자체보다 TASKS.md가 항상 최신 진실.
- `npm run lint` / `npx tsc --noEmit` / `npm run build` 클린 확인은 매 배치 필수.

## 지금 꺼져 있는 것들 (비용 관련 임시 플래그, 절대 그냥 켜지 마세요)

- `ENABLE_LIVE_AI=false` (`.env.local`) — 켜지기 전엔 모든 AI 생성이 mock. 실제 품질 테스트가 필요하면 사용자에게 먼저 확인.
- `FROZEN_DEMO_MODE = true` (`src/lib/mock-ai.ts`) — mock 생성이 입력값과 무관하게 항상 같은 고정 "프리미엄 뱀부 대형 타올" 초안을 반환.
- `PAUSED_FOR_SPEND_CAP = true` (`src/lib/agents/section-images.ts`) — Gemini 자동 섹션 이미지 생성 완전 중단(월 지출 한도 초과, 계정 이슈였고 코드 문제 아님). 섹션 편집 패널의 수동 "AI로 이미지 생성" 버튼은 이 플래그와 무관하게 동작.

## 최근에 뭘 했는지 (요약, 자세한 내용/발견한 버그는 전부 TASKS.md)

최근 커밋 순서(오래된 것 → 최신, `git log`로 재확인 가능):
1. 우선순위 1: 셀러 업로드 이미지가 실제 Storage 풀 + 슬롯 배정으로 상세페이지를 채우게 함.
2. 우선순위 2: 제작 에이전트가 실제 `layoutType`/`slots`를 구조화 출력하도록(mock뿐 아니라 라이브 AI도).
3. 우선순위 3: 스타일 세트를 색상 프리셋에서 실제 레이아웃 시스템으로 확장, Supabase 동기화.
4. 검수 에이전트에 레이아웃/이미지 슬롯 체크 4종 추가 + 사용자 스타일 신호 집계 → 기획 에이전트에 반영.
5. ZIP export 버그 2건(에디터 크롬/선택 테두리가 export 이미지에 찍히던 것) 발견+수정.
6. Supabase 새로고침 후 RichText 서식이 사이드패널에서만 유실되던 버그 발견+수정.
7. 스타일 세트 다이얼로그에 실시간 미리보기 캔버스 추가.
8. 이미지 영속성 검증 + 초기 생성 시 상품 사진이 base64로 남던 잔여 버그 수정.
9. README/MVP_PLAN/DEMO_SCRIPT를 실제 구현과 재동기화(README가 에이전트 파이프라인 이전 문구로 심하게 낡아 있었음).
10. **우선순위 5 Phase 1**: 관리자 전용 경쟁 상세페이지 분석(`/admin/reference-analysis`) — 이 코드베이스 최초의 인증 API 라우트(`src/lib/supabase/server-auth.ts`)와 최초의 관리자 RLS 패턴(`public.is_admin()`). 좌표/OCR 신뢰도/EDA 집계 대시보드는 Phase 2+로 명시적으로 미룸(TASKS.md 우선순위5 참고).
11. **우선순위 6**: `/projects/new` 폼 개편 — 기본값 제거, 가격 콤마 입력, 상품 속성 결정론적 추천, 카테고리/키워드 자동완성.
12. **우선순위 7**: 관리자 회원/사용량 대시보드. 위 "지금 당장 해야 할 일" 참고.

## 다음 후보들 (사용자가 아직 확정 안 함, 순서 없음)

- 실제 상품 사진(mock 아님)으로 3개 템플릿 패밀리(리빙/기능성/웰니스) 최종 시각 QA — 사용자의 실제 사진 필요.
- `ENABLE_LIVE_AI` 켜고 실제 AI 품질 1회 테스트 — 비용 발생, 사용자 승인 필요.
