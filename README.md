# Seller Detail Page Automation

쿠팡, 네이버 스마트스토어 셀러가 상품 정보와 사진만 입력하면 AI가 상세페이지 문구, 구성, 디자인 초안을 자동으로 만들어주는 제작 자동화 툴입니다.

## One Line

초보 셀러가 상품 정보와 사진만 넣으면, AI가 판매 문구와 상세페이지 디자인을 자동 생성해주는 셀러용 콘텐츠 제작 도구.

## Target Users

- 쿠팡 셀러
- 네이버 스마트스토어 셀러
- 1인 쇼핑몰 운영자
- 위탁판매/사입 판매자
- 상세페이지 제작 외주비가 부담되는 초보 셀러
- 디자인 툴 사용이 어려운 소상공인

## Core Problem

- 상세페이지 제작은 시간과 비용이 많이 듭니다.
- 초보 셀러는 어떤 순서로 상품을 설명해야 하는지 모릅니다.
- 상품의 장점을 판매 문구로 바꾸기 어렵습니다.
- 사진은 있어도 상세페이지 레이아웃과 카피를 구성하기 어렵습니다.
- 쿠팡, 스마트스토어 등 플랫폼별 이미지/콘텐츠 구성에 맞추기 번거롭습니다.

## Product Flow

1. 셀러가 상품명, 가격, 카테고리, 핵심 특징, 타깃 고객을 입력하고 상품/레퍼런스 이미지를 업로드합니다. 원하면 스타일 세트(재사용 가능한 레이아웃/톤 프리셋)를 골라 적용합니다.
2. `에이전트로 상세페이지 시안 생성`을 누르면 분석 → 기획 → 제작 → 검수 4단계 에이전트 파이프라인(오케스트레이터, Vercel AI SDK structured output)이 순차 실행됩니다.
3. 제작 에이전트는 13개 섹션마다 `blockRole`/`layoutType`(승인된 18종 중 선택)/`slots`를 채운 구조화 출력을 만들고, 검수 에이전트가 과장 표현·근거 없는 수치·이미지 슬롯 누락·레이아웃 불일치·반복·가독성을 점검합니다.
4. 에디터에서 구조화 블록 렌더러(`SectionCanvas`)로 결과를 미리보고, 섹션 순서 변경/숨김, 본문·헤드라인 인라인 서식(굵게/강조/글꼴) 수정, 이미지 위치·크기·여백 슬라이더 조정, "재기획" 요청(AI 도우미 패널)을 할 수 있습니다.
5. 저장은 Supabase(프로젝트/초안 버전/에이전트 실행 기록)에 반영되고, `ZIP 다운로드`로 플랫폼 폭 기준 슬라이싱된 PNG 묶음을 내보냅니다.

## MVP Scope

- 상품 정보 입력 폼 + 상품/레퍼런스 이미지 업로드(클라이언트 리사이즈/압축)
- 분석·기획·제작·검수 4단계 AI 에이전트 파이프라인(mock ↔ 실제 AI 전환 가능)
- 섹션별 `layoutType`/`slots` 구조화 출력과 그에 맞는 블록 렌더러
- 스타일 세트: 레이아웃 프리셋(이미지 위치/크기/여백/텍스트/폰트)·섹션 표시·선호 레이아웃을 Supabase에 저장하고 라이브 미리보기 캔버스로 확인
- 에디터: 드래그 순서 변경, 인라인 리치텍스트 서식, 되돌리기/다시하기, "재기획" 자연어 수정 요청
- 상세페이지 ZIP(PNG 슬라이스) 내보내기

## Suggested Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui 기반 컴포넌트
- AI: Vercel AI SDK(`generateText` + structured output), OpenAI(텍스트), Gemini(이미지, 현재 비용 문제로 일시 중단 — 아래 "Current implementation status" 참고)
- Backend/Storage: Supabase (Auth, Postgres + RLS, Storage) — 프로젝트/초안 버전/스타일 세트/에이전트 실행 기록의 주 저장소
- Export: `html-to-image` + `JSZip`(PNG 슬라이스 ZIP)

## Supabase Setup

Supabase is used as the main backend for Auth, PostgreSQL, Storage, and RLS.

Developer setup:

1. Create a Supabase project.
2. In Supabase Dashboard, go to Project Settings → API.
3. Copy the Project URL and anon public key.
4. Add these values to `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

5. Open Supabase SQL Editor.
6. Run `docs/supabase/schema.sql`.
7. In Authentication settings, choose whether email confirmation is required.
8. Restart the local dev server after editing `.env.local`.

Never put the Supabase service role key in frontend code or any `NEXT_PUBLIC_*` variable.

Current implementation status:

- Login and signup page can call Supabase Auth when env vars exist.
- Demo account button still enters the mock dashboard without Supabase.
- Database/RLS schema lives in `docs/supabase/schema.sql`, kept in sync with applied migrations under `docs/supabase/`.
- Projects, draft versions, style sets, and agent-run history are Supabase-first (local-first pattern: write to `localStorage` immediately, sync to Supabase in the background, merge remote-wins on load) — no longer localStorage-only.
- `ENABLE_LIVE_AI` toggles the whole agent pipeline between mock (free, instant, deterministic) and live OpenAI-backed generation — currently defaults to `false`.
- Two temporary, cost-driven flags are currently on and affect what a fresh checkout actually does: `FROZEN_DEMO_MODE` (`src/lib/mock-ai.ts`) makes mock generation always return one fixed sample draft regardless of input; `PAUSED_FOR_SPEND_CAP` (`src/lib/agents/section-images.ts`) disables automatic per-section AI image generation during draft creation (the manual "AI로 이미지 생성" button per section still works if `GEMINI_API_KEY` is set). Both should be flipped back to `false` once the underlying billing constraint clears.

## Presentation Message

> 초보 셀러에게 상세페이지 제작은 판매보다 먼저 만나는 큰 장벽입니다. 이 서비스는 상품 정보와 사진만 입력하면 AI가 판매 문구, 구성, 디자인 초안까지 자동으로 만들어주는 상세페이지 제작 자동화 툴입니다.
