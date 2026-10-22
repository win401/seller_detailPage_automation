# Seller Detail Page Automation

쿠팡, 네이버 스마트스토어 셀러가 상품 정보와 사진만 입력하면 AI가 상세페이지 문구, 구성, 디자인 초안을 자동으로 만들어주는 제작 자동화 툴입니다.

## 한 줄 소개

초보 셀러가 상품 정보와 사진만 넣으면, AI가 판매 문구와 상세페이지 디자인을 자동 생성해주는 셀러용 콘텐츠 제작 도구.

## 타깃 사용자

- 쿠팡 셀러
- 네이버 스마트스토어 셀러
- 1인 쇼핑몰 운영자
- 위탁판매/사입 판매자
- 상세페이지 제작 외주비가 부담되는 초보 셀러
- 디자인 툴 사용이 어려운 소상공인

## 해결하려는 문제

- 상세페이지 제작은 시간과 비용이 많이 듭니다.
- 초보 셀러는 어떤 순서로 상품을 설명해야 하는지 모릅니다.
- 상품의 장점을 판매 문구로 바꾸기 어렵습니다.
- 사진은 있어도 상세페이지 레이아웃과 카피를 구성하기 어렵습니다.
- 쿠팡, 스마트스토어 등 플랫폼별 이미지/콘텐츠 구성에 맞추기 번거롭습니다.

## 서비스 흐름

1. 셀러가 상품명, 가격, 카테고리, 핵심 특징, 타깃 고객을 입력하고 상품/레퍼런스 이미지를 업로드합니다. 원하면 스타일 세트(재사용 가능한 레이아웃/톤 프리셋)를 골라 적용합니다.
2. `에이전트로 상세페이지 시안 생성`을 누르면 분석 → 기획 → 제작 → 검수 4단계 에이전트 파이프라인(오케스트레이터, Vercel AI SDK structured output)이 순차 실행됩니다.
3. 제작 에이전트는 13개 섹션마다 `blockRole`/`layoutType`(승인된 18종 중 선택)/`slots`를 채운 구조화 출력을 만들고, 검수 에이전트가 과장 표현·근거 없는 수치·이미지 슬롯 누락·레이아웃 불일치·반복·가독성을 점검합니다.
4. 에디터에서 구조화 블록 렌더러(`SectionCanvas`)로 결과를 미리보고, 섹션 순서 변경/숨김, 본문·헤드라인 인라인 서식(굵게/강조/글꼴) 수정, 이미지 위치·크기·여백 슬라이더 조정, "재기획" 요청(AI 도우미 패널)을 할 수 있습니다.
5. 저장은 Supabase(프로젝트/초안 버전/에이전트 실행 기록)에 반영되고, `ZIP 다운로드`로 플랫폼 폭 기준 슬라이싱된 PNG 묶음을 내보냅니다.

## MVP 범위

- 상품 정보 입력 폼 + 상품/레퍼런스 이미지 업로드(클라이언트 리사이즈/압축)
- 분석·기획·제작·검수 4단계 AI 에이전트 파이프라인(mock ↔ 실제 AI 전환 가능)
- 섹션별 `layoutType`/`slots` 구조화 출력과 그에 맞는 블록 렌더러
- 스타일 세트: 레이아웃 프리셋(이미지 위치/크기/여백/텍스트/폰트)·섹션 표시·선호 레이아웃을 Supabase에 저장하고 라이브 미리보기 캔버스로 확인
- 에디터: 드래그 순서 변경, 인라인 리치텍스트 서식, 되돌리기/다시하기, "재기획" 자연어 수정 요청
- 상세페이지 ZIP(PNG 슬라이스) 내보내기

## 기술 스택

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui 기반 컴포넌트
- AI: Vercel AI SDK(`generateText` + structured output), OpenAI(텍스트), Gemini(이미지, 현재 비용 문제로 일시 중단 — 아래 "현재 구현 상태" 참고)
- Backend/Storage: Supabase (Auth, Postgres + RLS, Storage) — 프로젝트/초안 버전/스타일 세트/에이전트 실행 기록의 주 저장소
- Export: `html-to-image` + `JSZip`(PNG 슬라이스 ZIP)

## Supabase 설정

Supabase를 Auth, PostgreSQL, Storage, RLS를 담당하는 메인 백엔드로 사용합니다.

개발 환경 설정:

1. Supabase 프로젝트를 생성합니다.
2. Supabase Dashboard에서 Project Settings → API로 이동합니다.
3. Project URL과 anon public key를 복사합니다.
4. 복사한 값을 `.env.local`에 추가합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

5. Supabase SQL Editor를 엽니다.
6. `docs/supabase/schema.sql`을 실행합니다.
7. Authentication 설정에서 이메일 인증(email confirmation)을 필수로 할지 선택합니다.
8. `.env.local`을 수정한 뒤에는 로컬 개발 서버를 재시작합니다.

Supabase service role key는 절대 프론트엔드 코드나 `NEXT_PUBLIC_*` 환경 변수에 넣지 마세요.

현재 구현 상태:

- 환경 변수가 설정되어 있으면 로그인/회원가입 페이지가 Supabase Auth를 호출합니다.
- 데모 계정 버튼은 Supabase 없이도 mock 대시보드로 바로 진입합니다.
- DB/RLS 스키마는 `docs/supabase/schema.sql`에 있으며, `docs/supabase/` 아래에 적용된 마이그레이션과 동기화된 상태로 유지합니다.
- 프로젝트, 초안 버전, 스타일 세트, 에이전트 실행 기록은 Supabase 우선으로 저장됩니다(local-first 패턴: `localStorage`에 즉시 저장 → 백그라운드에서 Supabase와 동기화 → 불러올 때는 원격 데이터 우선으로 병합). 더 이상 localStorage 전용이 아닙니다.
- `ENABLE_LIVE_AI`로 전체 에이전트 파이프라인을 mock(무료, 즉시 응답, 결과 고정)과 실제 OpenAI 기반 생성 사이에서 전환합니다. 현재 기본값은 `false`입니다.
- 비용 문제로 임시로 켜 둔 플래그 두 개가 있어, 새로 클론한 환경의 실제 동작에 영향을 줍니다. `FROZEN_DEMO_MODE`(`src/lib/mock-ai.ts`)는 입력과 상관없이 mock 생성이 항상 고정된 샘플 초안 하나를 반환하게 하고, `PAUSED_FOR_SPEND_CAP`(`src/lib/agents/section-images.ts`)은 초안 생성 중 섹션별 AI 이미지 자동 생성을 끕니다(`GEMINI_API_KEY`가 설정되어 있으면 섹션마다 있는 "AI로 이미지 생성" 버튼은 수동으로 계속 사용할 수 있습니다). 결제 한도 문제가 해결되면 두 플래그 모두 다시 `false`로 돌려야 합니다.

## 발표 메시지

> 초보 셀러에게 상세페이지 제작은 판매보다 먼저 만나는 큰 장벽입니다. 이 서비스는 상품 정보와 사진만 입력하면 AI가 판매 문구, 구성, 디자인 초안까지 자동으로 만들어주는 상세페이지 제작 자동화 툴입니다.
