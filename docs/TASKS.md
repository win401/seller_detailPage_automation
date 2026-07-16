# Tasks

> 최종 갱신: 2026-07-16
>
> 이 문서는 현재 구현 상태와 다음 실행 순서를 관리한다. 과거 논의와 폐기된 결정은 다른 `docs/` 문서에 남기고, 여기에는 실제로 의미 있는 완료 상태와 남은 작업만 기록한다.

## 제품 방향

쿠팡·스마트스토어 셀러가 상품 정보와 사진을 입력하면, 구조화된 세로형 상세페이지 초안을 만들고 편집·저장·ZIP 내보내기까지 수행하는 데스크톱 작업 도구다.

- 셀러는 PC에서 작업하며, 중앙 캔버스는 모바일 상세페이지 비율의 긴 결과물을 미리 보여준다.
- 현재 기본은 검증된 블록을 조립하는 템플릿 편집이지만, "피그마식 자유 편집은 하지 않는다"는 더 이상 고정 원칙이 아니다(2026-07-16 결정). 인라인(문장/단어 단위) 텍스트 스타일링은 span 기반 RichText + WYSIWYG 에디터로 이미 구현 완료. 좌표 배치·레이어는 다음 단계로 계속 남아 있으며, Supabase 스키마·AI 스키마·undo/redo·export까지 동시에 손대야 하는 별도 규모의 작업이라 별도 계획으로 진행한다.
- 개발과 데모 중에는 mock 생성이 기본이다. 실제 AI 호출은 비용과 품질을 의도적으로 확인할 때만 켠다.
- 현재 경쟁 상세페이지 URL은 참고 링크다. 셀러용 흐름에서 외부 사이트 자동 크롤링은 하지 않는다.

## 현재 구현 상태

### 핵심 사용자 흐름

- [x] Supabase Auth 로그인, 회원가입, 로그아웃, 계정 메뉴, 설정 화면
- [x] Supabase 기반 대시보드, 프로젝트 생성, 초안 버전 저장, 프로젝트 복원, localStorage fallback
- [x] 상품명·카테고리·키워드·타깃·강조 포인트·무드·톤·플랫폼·추가 요청·경쟁 URL/메모·상품/레퍼런스 이미지 입력
- [x] 클라이언트 이미지 최적화: 최대 1200px 리사이즈, WebP/JPEG 압축, 최적화 전후 용량 안내
- [x] 분석 → 기획 → 제작 → 검수 워크플로우와 Zod structured output, mock fallback
- [x] Vercel AI SDK 기반 실제 AI 호출 경로. `ENABLE_LIVE_AI=true`일 때만 실행하며 기본 모델은 `gpt-4.1-mini`
- [x] 편집기 직접 문구 수정, 이미지 교체, 섹션 숨김/복구, 드래그 정렬, 카피 후보, 섹션 재생성, undo/redo, 확대/축소, Space+drag 이동
- [x] headline/body가 span 기반 RichText(`TextRun[]`)이고, `contentEditable` 기반 에디터로 굵게·강조색을 타이핑 중 실시간(WYSIWYG)으로 편집 (2026-07-16)
- [x] 섹션별 레이아웃 프리셋(이미지 위치/채우기/높이, 여백, 텍스트 크기, 글꼴, 자간, 줄간격)이 구조화 섹션(`StructuredSectionBlock`)에서 실제로 적용됨 — 미설정 필드는 각 블록 고유 디자인을 그대로 유지 (2026-07-16)
- [x] 기획자 에이전트 수정 루프: 요청 → 기획 → 제작 → 검수 → 새 시안 비교/적용
- [x] 스타일 세트 CRUD 및 새/기존 초안에 무드·톤·플랫폼·레이아웃 프리셋 적용 (현재 local-first)
- [x] 전체 상세페이지 렌더링, 플랫폼 폭 적용, 2000px 슬라이싱, ZIP 생성·다운로드
- [x] light/dark/system 테마, 캔버스/export 디자인의 앱 테마 독립, AI/적용/export 모션 및 reduced-motion 대응

### 상세페이지 렌더링

- [x] 리빙, 기능성, 웰니스 3개 구조 템플릿 패밀리
- [x] 상품명/카테고리/키워드 기반 mock 템플릿 선택
- [x] 13개 섹션 데이터를 `blockRole + layoutType + slots` 구조로 확장
- [x] 캔버스와 export가 같은 React 블록 렌더러 사용
- [x] 안내·브랜드 스토리·문제 제기·핵심 베네핏·소재·비교·기능·옵션·근거·사용 단계·관리·체크리스트·상품 정보표·FAQ·정책 블록
- [x] 기존 그라디언트 중심 이미지 영역을 실사형 mock 비주얼로 교체
- [x] 기존 draft를 열 때 구조화된 레이아웃 경로로 정규화

### 데이터와 플랫폼 기반

- [x] profiles, projects, draft versions, agent runs, style signals, usage events, 프로젝트 연결 경쟁 레퍼런스의 Supabase/RLS 기본 구조
- [x] 총괄 에이전트와 하위 실행을 연결하는 parent/child agent run 추적
- [x] 수동 수정 내용을 Supabase 스타일 신호로 저장하고 localStorage fallback 유지

## 최우선: 현재 흐름 검증

새 기능을 넓히기 전에 현재 흐름이 배포 환경에서도 안정적으로 동작하는지 확인한다.

- [ ] 로컬·Vercel에서 회원가입/로그인 → 프로젝트 생성 → mock 시안 → 편집 → 저장 → 새로고침 복원 → ZIP 다운로드 E2E QA
- [ ] 실제 Supabase 스키마와 `docs/supabase/schema.sql`의 차이 확인 및 필요한 마이그레이션 정리
- [ ] 데모 계정이 아닌 두 계정으로 저장/조회와 RLS 격리 확인
- [ ] 모든 지원 폭에서 ZIP 조각의 하단 잘림, 겹침, 스케일 오류 확인
- [ ] 다음 구현 묶음마다 `npm run lint`, `npx tsc --noEmit`, `npm run build` 실행
- [ ] 매 push 후 실제 확인한 Vercel 배포 버전/URL을 작업 기록에 남기기
- [ ] UI 또는 진단 정보에 mock/live, 선택 모델, fallback 이유, 생성 시간 표시
- [ ] API 크레딧과 `ENABLE_LIVE_AI` 설정을 의도적으로 준비한 뒤 실제 AI 품질 테스트 1회 수행

## 우선순위 1: 셀러 이미지가 실제 상세페이지를 채우게 하기

구조화된 레이아웃은 구현됐다. 다음 품질 단계는 일반 mock 이미지 대신 판매자가 올린 이미지를 각 블록에 정확히 배치하는 것이다.

- [ ] 업로드 이미지와 블록 슬롯 연결 규칙 정의: 히어로, 제품 단독컷, 소재 디테일, 사용 장면, 옵션, 사이즈/스펙, 정책
- [ ] 모든 블록 이미지 슬롯을 보여주고 업로드 파일을 선택할 수 있는 이미지 배정 UI
- [ ] 프로젝트 범위 Supabase Storage 경로와 RLS 정책 구성
- [ ] 브라우저 URL이 아닌 draft version에 이미지 자산 메타데이터와 슬롯 배정 저장
- [ ] 이미지 그리드/연속 이미지 레이아웃의 복수 이미지 지원
- [ ] 이미지가 없을 때 레이아웃을 망치지 않는 빈 상태와 필요한 이미지 안내
- [ ] 새로고침, 스타일 세트 변경, 수정 시안, ZIP export 뒤에도 이미지 배정 유지 확인
- [ ] 실제 상품 사진으로 3개 템플릿 패밀리 최종 시각 QA

## 우선순위 2: 블록 렌더러용 AI 출력 고도화

현재 mock은 구조화된 레이아웃을 만든다. 실제 AI도 임의 HTML/CSS가 아니라 같은 계약을 따르도록 단계적으로 맞춘다.

- [ ] 제작 에이전트 스키마에 승인된 `layoutType`과 슬롯 콘텐츠 출력 추가
- [ ] 허용 `layoutType`을 서버 enum으로 제한하고, 알 수 없는 값은 안전한 템플릿 fallback 처리
- [ ] 기존 AI 섹션 출력과 `blockRole + layoutType + slots` 사이 호환 변환 함수
- [ ] 선택한 스타일 세트 규칙과 누적 스타일 신호를 기획/제작 입력에 전달
- [ ] 검수 에이전트에 근거 부족, 이미지 슬롯 누락, 섹션 흐름, 반복, 가독성 점검 추가
- [ ] 각 섹션/레이아웃 선택 이유를 짧은 structured 설명으로 제공
- [ ] 리빙·기능성·웰니스 테스트 프롬프트로 live 결과를 mock 기준과 비교
- [ ] API 오류·시간 초과·데모 모드에서 결정론적 mock fallback 유지

## 우선순위 3: 스타일 세트를 레이아웃 시스템으로 확장

스타일 세트는 색상/무드 프리셋이 아니라 재사용 가능한 상세페이지 디자인 시스템이 되어야 한다.

- [ ] local-first 스타일 세트를 Supabase로 동기화하되 안전한 local fallback 유지
- [x] 텍스트 스키마 필드(글자 크기 5단계, 글꼴 self-host 3종, 자간, 줄간격) 추가와 구조화 섹션 실제 적용 완료 — 스타일 세트 다이얼로그 레이아웃 버그, legacy 렌더 경로에만 연결돼 구조화 섹션엔 미적용이던 버그 포함 수정 (2026-07-15~16, 세부 내용은 git log 참고)
- [ ] 레이아웃 기본값, 선호 블록 역할/타입, 섹션 표시, 여백, 이미지 처리용 나머지 스키마 필드 추가
- [ ] 편집기와 같은 블록 렌더러를 쓰는 스타일 세트 미리보기 캔버스
- [ ] 프리미엄 리빙, 따뜻한 라이프스타일, 정보 밀도 기능성, 클린 웰니스 기본 세트 정의
- [ ] 스타일 세트별 섹션 역할 기본값과 이미지 슬롯 우선순위 제공
- [ ] 수동 수정 신호를 사용자/스타일 세트 선호 요약으로 집계해 다음 기획에 사용
- [ ] 스타일 세트 적용이 확정된 상품 사실을 덮어쓰지 않는지 검증

## 우선순위 4: 편집기 작업 환경

- [x] 문장/단어 단위 텍스트 스타일링 완료: 마커 문자열(1~3단계) → span 기반 RichText + `contentEditable` WYSIWYG 에디터(4단계, 최종)로 대체. AI 스키마는 안 건드림(계속 plain string 생성, 조립 지점에서 감쌈). 세부 설계·발견한 버그는 git log 참고 (2026-07-16)
- [x] (2026-07-16) 단어/구간 단위 글꼴 변경 — `TextRun.fontFamily`(기존 `bold`/`highlight`와 같은 급) 추가, 섹션 레벨 글꼴 선택(`layout-presets.ts`의 `FontFamily`/`getFontFamilyCss`, self-host된 Pretendard/Gmarket Sans/에스코어드림)을 그대로 재사용. `rich-text.tsx`에 `applyFontFamily(root, family)` 추가 — bold/highlight의 `toggleInlineStyle`과 달리 값 선택(불리언 아님)이라 별도 함수: 선택 영역을 덮는 기존 `[data-font]` 조상을 먼저 해제한 뒤, "기본"이 아니면 새 폰트로 감쌈. `domToRichText`/`buildRichTextDom`도 `data-font` 속성으로 왕복 직렬화하도록 확장. `MarkupToolbar`에 "글꼴" 드롭다운 추가 — 네이티브 `<select>`나 기존 Radix/base-ui `DropdownMenu`는 열릴 때 포커스를 가져가 contentEditable의 선택 영역이 blur로 날아가버려서 못 씀(B/강조 버튼과 같은 이유), 직접 만든 팝오버 + `onMouseDown`+`preventDefault`로 해결. 브라우저에서 단어 선택 → 폰트 적용 → 초기화("기본")/굵게와 동시 적용 → blur 후 정적 렌더링까지 DOM 검사로 실제 확인.
- [x] (2026-07-16) "AI로 이미지 생성" 버튼 실동작 확인 — `src/lib/agents/image.ts`의 `generateText` 호출에 `providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } }`가 빠져 있어 `gemini-2.5-flash-image`가 항상 텍스트만 반환하고 `result.files`가 비어 "이미지를 반환하지 않았습니다" 에러로 귀결되던 버그. 새 `GEMINI_API_KEY`로 교체 후 이 옵션을 추가해 실제 이미지가 반환되도록 수정. 브라우저에서 버튼을 두 번 클릭해 매번 실제 Gemini 응답(200, 서로 다른 이미지)이 섹션에 적용되는 것 확인
- [x] (2026-07-16) "새 상세페이지 만들기" 최초 생성 시 13개 섹션 이미지를 입력 상품에 맞춰 실제 Gemini로 자동 생성 — 기존엔 mock/live 두 경로 모두 항상 같은 5장짜리 고정 Unsplash 스톡 사진만 붙었음(`src/lib/mock-data.ts`). `src/lib/agents/section-images.ts`(신규, `generateSectionImages`)가 `runImageAgent`를 섹션마다(동시성 3, `imageRole: "none"` 제외) 호출해 대체하고, 실패한 섹션은 조용히 기존 스톡 이미지로 폴백(초안 생성 자체를 막지 않음). `runProductionAgent`(`production.ts`)와 `runOrchestratedGeneration`의 mock 단축 경로·catch 폴백(`orchestrator.ts`) 3곳 모두에 적용 — `ENABLE_LIVE_AI` 여부와 무관하게 `GEMINI_API_KEY` 존재 여부로만 게이팅(수동 버튼과 동일한 규칙). 업로드한 상품 사진은 `GenerateDetailPageInput.productImageDataUrl`로 새로 전달해 이미지 편집 레퍼런스로 사용.
  - **실제 겪은 버그**: Gemini가 반환하는 원본 PNG는 장당 1.3~2.2MB — 13섹션이면 초안 하나가 ~20MB에 달해 `saveGeneratedDraftLocally`의 `localStorage.setItem`이 `QuotaExceededError`로 터지고, 이게 `handleGenerate`의 바깥 `catch`로 전파되어 방금 받은 실제 생성 결과를 통째로 버리고 순수 클라이언트 mock(스톡 이미지)으로 조용히 대체되는 문제가 있었음 — 서버는 정상 응답했는데 최종 화면엔 여전히 스톡 이미지만 보여서 원인 파악에 시간이 걸림(curl 직접 호출 → 정상 확인, 브라우저 `fetch()` 직접 호출 → 정상 확인, `localStorage` 실제 저장값 검사로 확진). `sharp`(신규 의존성)로 서버에서 1200px/WebP 품질 85로 재압축(`image.ts`)해 장당 30~90KB, 초안 전체 ~0.5~0.8MB로 줄여 해결 — 클라이언트 `optimizeImageFile`(`image-optimize.ts`)와 동일한 압축 기준.
  - mock 경로의 `imagePrompt`가 `designMood`/`imageRole`만 담고 상품명 자체가 아예 안 들어가 있어(`mock-ai.ts`) Gemini가 상품과 무관한 이미지를 생성하는 문제도 같이 발견 — `productName`/`category`/`keywords`를 prompt 맨 앞에 추가해 해결. 실제 "프리미엄 뱀부 대형 타올" 입력으로 재검증: 12개 섹션 전부 상품과 맞는 이미지(뱀부 타올 소재 클로즈업, "PREMIUM BAMBOO" 태그 등) 생성 확인, 1개 섹션 실패 시 스톡 이미지로 정상 폴백하는 것도 확인.
  - 이어서 각 섹션 고유의 headline/body 내용(예: "빠른 흡수", "소재와 마감")을 imagePrompt에 반영하도록 개선(`mock-ai.ts`, `production.ts` 프롬프트 지침) — 모든 섹션이 같은 범용 상품 컷이 아니라 그 섹션이 실제로 강조하는 포인트를 시각화하게 함.
- [x] (2026-07-16, 임시 조치) **Gemini 이미지 생성 일시 중단 + 데모용 고정(freeze)** — 테스트 중 AI Studio 프로젝트 월 지출 한도(monthly spending cap) 초과로 모든 이미지 생성 호출이 실패하기 시작함(계정 빌링 이슈, 코드 문제 아님). 시연 준비까지 안정적/즉시 응답이 필요해 두 곳에 임시 스위치를 걸었다: `src/lib/agents/section-images.ts`의 `PAUSED_FOR_SPEND_CAP = true`(Gemini 재호출 완전 중단, 매번 즉시 폴백), `src/lib/mock-ai.ts`의 `FROZEN_DEMO_MODE = true`(`mockGenerateDetailPage`가 입력값과 무관하게 `src/lib/data/frozen-demo-sections.json`—오늘 테스트로 얻은 실제 Gemini 생성 이미지 12장이 포함된 "프리미엄 뱀부 대형 타올" 결과—을 그대로 반환). **한도가 풀리면 두 플래그를 모두 `false`로 되돌릴 것.** 되돌린 뒤 "새 상세페이지 만들기"가 임의 입력에 대해 다시 실제로 생성하는지 재확인 필요. 플래그 적용 후 응답 시간 30초대→0.13초로 확인, localStorage 캐시 과다 누적(오늘 테스트로 46개 키/3.3MB)으로 인한 동일한 `QuotaExceededError` 재발도 확인해 정리함(사용자 확인 후 삭제 — Supabase가 원본이라 데이터 손실 없음).
  - **후속 버그**: 위 정리 후에도 반복 테스트로 localStorage가 다시 쌓여 동일한 `QuotaExceededError`가 재발했고, 이번엔 `handleGenerate`의 catch-폴백 분기 안 `saveGeneratedDraftLocally` 호출이 try/catch로 감싸여 있지 않아 예외가 그대로 전파되어 "생성" 버튼을 눌러도 아무 반응이 없는(에디터로 진입 못 하는) 실사용 버그로 이어짐. `saveGeneratedDraftLocally`(`new/page.tsx`) 자체를 두 가지로 강화: (1) 매 저장 전 현재 projectId를 제외한 과거 `detail-page-project/generation/agent-workflow/draft-assets:*` 캐시를 모두 정리(`pruneOldLocalDrafts`) — Supabase가 원본이라 캐시 삭제는 안전, (2) 쓰기 자체를 try/catch로 감싸 quota 초과 시에도 조용히 건너뛰고 생성 흐름은 계속 진행. 같은 프로젝트로 연속 생성해도 브라우저 저장 용량이 항상 프로젝트 1개분(~2.2MB)으로 고정되는 것을 반복 확인.
- [ ] Supabase 저장 → 새로고침 복원의 RichText 실동작 확인 (JSON 직렬화 구조상 안전하지만 실제 프로젝트로는 아직 미검증 — 테스트 계정/프로젝트로 확인 필요)
- [ ] ZIP export 캡처(`toCanvas`) 시점에 self-host 폰트 로드가 끝나 있는지, RichText(굵게/강조) 렌더링이 export에서도 캔버스와 동일하게 나오는지 확인 (미확인 시 fallback 폰트로 캡처될 위험 — 캔버스 자체의 글꼴/자간/줄간격 적용은 2026-07-16 확인 완료, export 결과물 자체는 미확인)
- [ ] 자유 좌표 배치 + 레이어 패널은 여전히 별도 세션의 별도 계획으로 보류 (span 마이그레이션과 달리 Supabase 스키마·AI 스키마·undo-redo 재설계·export 파이프라인까지 동시에 손대야 하는 멀티세션급 작업 — 2026-07-16 조사 결과)
- [ ] 현재 3열 레이아웃을 노트북과 와이드 데스크톱에서 검증
- [ ] 화면이 좁은 데스크톱에서 좌/우 보조 패널 접기 기능
- [ ] 다양한 화면 높이에서 섹션 목록·캔버스·편집 패널의 독립 스크롤 유지
- [ ] 세로 모니터 전용 레이아웃은 보류. 현재 사용자 테스트에서는 가로 작업 환경이 더 적합함
- [ ] 캔버스 수정, 드래그, 줌, AI 도우미에 키보드 접근성 보강
- [ ] 캔버스 고정 외형을 바꾸지 않는 범위에서 light/dark 시각 QA
- [ ] 실제 사용 후 생성·패널 전환 모션이 작업을 지연시키지 않도록 튜닝

## 우선순위 5: 관리자 경쟁 상세페이지 이미지 분석 / EDA

목표: 관리자가 다른 셀러의 긴 상세페이지 캡처 이미지를 업로드하면, 레이아웃과 카피 신호를 추출해 내부 EDA 데이터로 축적한다. 이는 셀러가 입력하는 경쟁 URL/메모 기능과 별개이며 URL 크롤링을 전제로 하지 않는다.

**MVP 착수 상태 (2026-07-15, Claude):** 아래 전체 스펙(관리자 전용, 다중 이미지, 좌표/OCR/신뢰도, Storage 3테이블 분리)과는 별개로, 동작 검증용 축소 버전을 먼저 붙였다. 관리자 게이팅 없이 로그인한 모든 사용자가 nav-bar "경쟁 분석"(`/competitor-analysis`)에서 이미지 1장만 업로드해 분석하고, 결과를 `competitor_page_analyses` 테이블(project_id nullable, jsonb 통짜 저장) 1개에 저장한다. 좌표/OCR 신뢰도/이미지 분할/오버레이/관리자 집계는 없음 — 아래 체크리스트는 그대로 두고, 이 축소 버전을 관리자 전용 다중 이미지/좌표 기반 스펙으로 확장하는 게 다음 단계다. 관련 코드: `src/lib/agents/competitor-analysis.ts`, `src/app/(app)/competitor-analysis/page.tsx`, `src/app/api/agent-workflow/analyze-competitor-page/route.ts`.

- [x] (2026-07-16) 분석 결과에 키워드 분석(`keywordAnalysis: { topKeywords, summary }`) 추가 — 경쟁사 카피에서 반복/강조되는 핵심 키워드 5~10개와 요약을 뽑음(내 상품 키워드와의 비교는 아님, 별도 입력 없이 이미지만으로 동작). Zod 스키마·AI 비전 프롬프트·mock·UI(칩 목록 + 요약)까지 반영. `analysis`가 jsonb라 마이그레이션은 불필요하지만, 이 필드가 없던 기존 저장 이력과의 호환을 위해 UI에서 optional chaining으로 방어 처리(구버전 이력은 이 섹션만 표시 안 됨) — 실제 기존 이력으로 크래시 없음 확인
- [x] (2026-07-16) PDF 업로드 지원 — 이미지뿐 아니라 PDF도 업로드 가능. `src/lib/pdf-to-image.ts`(`pdfjs-dist` 신규 의존성)가 클라이언트에서 PDF 각 페이지를 렌더링해 세로로 이어붙인 뒤 기존 `optimizeImageFile` 파이프라인에 그대로 흘려보냄 — API 라우트·AI 프롬프트·스키마는 무변경(서버는 여전히 이미지 데이터 URL만 받음). 스티칭 캔버스 자체가 `IMAGE_MAX_HEIGHT`를 넘지 않도록 미리 스케일 조정(Chrome/Skia canvas 높이 제한 버그 재발 방지, 기존 이미지 업로드에서 이미 겪은 문제). 합성 2페이지 PDF를 실제로 업로드해 실제 AI 비전 분석까지 종단 테스트 완료 — 두 페이지 텍스트를 정확히 읽어 키워드/섹션 구성에 반영됨을 확인
- [x] (2026-07-16) 나눠서 캡처한 PNG 여러 장 업로드 지원 — 캡처 도구가 너무 긴 페이지를 PNG 여러 장으로 쪼개 주는 경우, 한 번에 다 선택하면 파일명 순서대로(숫자 인식 자연 정렬) 이어붙임. 이미지 파일 input의 `multiple` 속성만으로는 선택 순서가 브라우저마다 보장되지 않아 파일명 기준으로 직접 정렬. 스티칭 로직은 PDF 업로드와 동일한 `IMAGE_MAX_HEIGHT` 안전장치를 공유(`src/lib/stitch-canvases.ts`로 추출해 `pdf-to-image.ts`/`stitch-images.ts` 둘 다 재사용). 파일명을 일부러 순서 뒤섞어(3, 1, 2) 업로드해도 최종 이미지는 1→2→3 순서로 정확히 이어붙는 것을 브라우저에서 확인

### 레퍼런스 데이터 모델

- [ ] `nav-bar.tsx`에 관리자 전용 "레퍼런스 분석" 진입 버튼
- [ ] 업로드·분석 상태·결과·재시도를 제공하는 `/admin/reference-analysis` 화면
- [ ] `competitor_references` 확장: 원본 메타데이터만 저장 — nullable `project_id`, `source_url`, `platform`, `product_name`, `category`, `analysis_status`, `updated_at`
- [ ] `competitor_reference_assets` 추가: 여러 장의 캡처 이미지 경로, 순서, 크기, MIME 타입, 파일 크기, 해시
- [ ] `competitor_analysis_runs` 추가: 분석 모델/프롬프트 버전/상태/오류와 페이지 단위 EDA 수치
- [ ] `competitor_reference_sections` 추가: 감지된 섹션마다 1행 — 섹션 유형, 순서, 원본 Y 좌표, 비율, OCR 카피, 카피 특징, 신뢰도
- [ ] `agent_runs`는 필요 시 호출 추적/디버깅에만 연결하고 EDA 주 데이터 저장소로 사용하지 않음
- [ ] 일반 사용자는 본인이 올린 원본만, 관리자는 전체 분석 코퍼스에 접근하는 RLS 정책
- [ ] 외부 원본 이미지 보관 기간/삭제/내부 분석 범위를 정의하고, 장기 데이터는 원본보다 파생 지표 중심으로 보관

### 분석 파이프라인

- [ ] 여러 장의 긴 이미지 업로드와 수동 순서 변경
- [ ] 지나치게 긴 이미지는 겹침 영역을 포함한 분석 단위로 분할하고 원본 Y 좌표 유지
- [ ] 경계 중복 없이 분할 분석 결과를 하나의 상세페이지 좌표계로 병합
- [ ] 이미지 처리로 캔버스 크기, 여백, 텍스트/이미지/피사체 비율, 정렬, 색상 팔레트 추출
- [ ] Vision AI로 OCR, 13대 섹션 분류, 제목/본문 분리, 카피 톤·페인포인트·효익·근거·CTA 추출
- [ ] 타이포그래피는 캡처 이미지 기반 추정값과 confidence를 저장하고, 원본 CSS 값이라고 단정하지 않음
- [ ] 결과 화면에서 섹션 경계, 텍스트 안전영역, 여백 측정치를 원본 위에 오버레이
- [ ] 업로드·대기·분석 중·완료·실패·재시도 상태 UI

### EDA 출력

- [ ] 비주얼: 전체/섹션 여백 비율, 피사체 비율, 텍스트/이미지 비율, 정렬, 팔레트, 안전영역
- [ ] 타이포: 제목/본문 상대 크기, 줄 수, 추정 줄간격/자간, 대비와 가독성
- [ ] 구조: 섹션 유형·순서·높이·간격, 누락/반복 패턴
- [ ] 카피: 제목/본문 길이, 문장 구조, 공감·페인포인트·효익·근거·CTA 분류, 톤
- [ ] 카테고리·플랫폼·레퍼런스 유형별 평균 여백, 섹션 흐름, 카피 길이, 톤 분포 관리자 집계

## 보류 / 리서치 후보

아래는 현재 구현 우선순위가 아니다.

- [ ] 레퍼런스 이미지를 활용한 상품 이미지 개선/합성. 실제 상품 정보 보존 규칙이 전제
- [ ] 누끼 제거 또는 이미지 품질 개선 worker
- [ ] 대량 이미지 분석이 필요해질 때 OpenCV/FastAPI worker 검토
- [ ] 사용자가 열어 둔 상세페이지에서 직접 자료를 수집하는 Chrome 확장 프로그램
- [ ] 쇼핑몰 직접 업로드 API, 결제, 광범위한 마켓 자동화

## 배포 전 체크리스트

- [ ] 기능 계약이 바뀌면 README, MVP plan, schema, 환경변수 예시를 함께 갱신
- [ ] `docs/DEMO_SCRIPT.md`를 실제 데모 흐름과 일치시킴
- [ ] 발표 전 제한 사항과 mock fallback 동작을 정리
- [ ] 최종 배포 전 데스크톱 반응형, 테마, 기본 접근성, 프로젝트 복원, 이미지 영속성, ZIP 파일 내용을 확인
