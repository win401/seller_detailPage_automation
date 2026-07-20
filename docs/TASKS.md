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
  - **실제 겪은 버그**: 위 확인 직후 사용자가 "텍스트 박스 밖을 클릭하면 원래 폰트로 되돌아온다"고 리포트. 원인은 `page.tsx`의 `handleCanvasTextCommit`이 변경 여부를 `richTextToPlainText(before) === richTextToPlainText(after)`(순수 텍스트만 비교)로 판단해, 글자는 그대로고 스타일만 바뀐 편집(폰트·굵게·강조를 기존 단어에 적용, 텍스트 삽입/삭제 없음)을 "변경 없음"으로 오판해 `setSections` 자체를 건너뛰던 것 — RichTextEditor가 blur 시 DOM을 정확히 커밋했는데도 상태에 반영되기 전에 버려짐(캔버스·본문 패널 등 4개 편집 경로 전부 이 한 함수를 공유해서 동일하게 영향받음). `JSON.stringify(before) === JSON.stringify(after)`로 RichText 전체 구조를 비교하도록 수정, `copy_manual_edit` 스타일 신호 기록은 원래 의도대로 실제 텍스트가 바뀐 경우에만 남도록 분리. 같은 단어에 폰트 적용 후 캔버스 밖 클릭 → DOM에 폰트 유지되는 것 재확인.
- [x] (2026-07-16) "AI로 이미지 생성" 버튼 실동작 확인 — `src/lib/agents/image.ts`의 `generateText` 호출에 `providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } }`가 빠져 있어 `gemini-2.5-flash-image`가 항상 텍스트만 반환하고 `result.files`가 비어 "이미지를 반환하지 않았습니다" 에러로 귀결되던 버그. 새 `GEMINI_API_KEY`로 교체 후 이 옵션을 추가해 실제 이미지가 반환되도록 수정. 브라우저에서 버튼을 두 번 클릭해 매번 실제 Gemini 응답(200, 서로 다른 이미지)이 섹션에 적용되는 것 확인
- [x] (2026-07-16) "새 상세페이지 만들기" 최초 생성 시 13개 섹션 이미지를 입력 상품에 맞춰 실제 Gemini로 자동 생성 — 기존엔 mock/live 두 경로 모두 항상 같은 5장짜리 고정 Unsplash 스톡 사진만 붙었음(`src/lib/mock-data.ts`). `src/lib/agents/section-images.ts`(신규, `generateSectionImages`)가 `runImageAgent`를 섹션마다(동시성 3, `imageRole: "none"` 제외) 호출해 대체하고, 실패한 섹션은 조용히 기존 스톡 이미지로 폴백(초안 생성 자체를 막지 않음). `runProductionAgent`(`production.ts`)와 `runOrchestratedGeneration`의 mock 단축 경로·catch 폴백(`orchestrator.ts`) 3곳 모두에 적용 — `ENABLE_LIVE_AI` 여부와 무관하게 `GEMINI_API_KEY` 존재 여부로만 게이팅(수동 버튼과 동일한 규칙). 업로드한 상품 사진은 `GenerateDetailPageInput.productImageDataUrl`로 새로 전달해 이미지 편집 레퍼런스로 사용.
  - **실제 겪은 버그**: Gemini가 반환하는 원본 PNG는 장당 1.3~2.2MB — 13섹션이면 초안 하나가 ~20MB에 달해 `saveGeneratedDraftLocally`의 `localStorage.setItem`이 `QuotaExceededError`로 터지고, 이게 `handleGenerate`의 바깥 `catch`로 전파되어 방금 받은 실제 생성 결과를 통째로 버리고 순수 클라이언트 mock(스톡 이미지)으로 조용히 대체되는 문제가 있었음 — 서버는 정상 응답했는데 최종 화면엔 여전히 스톡 이미지만 보여서 원인 파악에 시간이 걸림(curl 직접 호출 → 정상 확인, 브라우저 `fetch()` 직접 호출 → 정상 확인, `localStorage` 실제 저장값 검사로 확진). `sharp`(신규 의존성)로 서버에서 1200px/WebP 품질 85로 재압축(`image.ts`)해 장당 30~90KB, 초안 전체 ~0.5~0.8MB로 줄여 해결 — 클라이언트 `optimizeImageFile`(`image-optimize.ts`)와 동일한 압축 기준.
  - mock 경로의 `imagePrompt`가 `designMood`/`imageRole`만 담고 상품명 자체가 아예 안 들어가 있어(`mock-ai.ts`) Gemini가 상품과 무관한 이미지를 생성하는 문제도 같이 발견 — `productName`/`category`/`keywords`를 prompt 맨 앞에 추가해 해결. 실제 "프리미엄 뱀부 대형 타올" 입력으로 재검증: 12개 섹션 전부 상품과 맞는 이미지(뱀부 타올 소재 클로즈업, "PREMIUM BAMBOO" 태그 등) 생성 확인, 1개 섹션 실패 시 스톡 이미지로 정상 폴백하는 것도 확인.
  - 이어서 각 섹션 고유의 headline/body 내용(예: "빠른 흡수", "소재와 마감")을 imagePrompt에 반영하도록 개선(`mock-ai.ts`, `production.ts` 프롬프트 지침) — 모든 섹션이 같은 범용 상품 컷이 아니라 그 섹션이 실제로 강조하는 포인트를 시각화하게 함.
- [x] (2026-07-16, 임시 조치) **Gemini 이미지 생성 일시 중단 + 데모용 고정(freeze)** — 테스트 중 AI Studio 프로젝트 월 지출 한도(monthly spending cap) 초과로 모든 이미지 생성 호출이 실패하기 시작함(계정 빌링 이슈, 코드 문제 아님). 시연 준비까지 안정적/즉시 응답이 필요해 두 곳에 임시 스위치를 걸었다: `src/lib/agents/section-images.ts`의 `PAUSED_FOR_SPEND_CAP = true`(Gemini 재호출 완전 중단, 매번 즉시 폴백), `src/lib/mock-ai.ts`의 `FROZEN_DEMO_MODE = true`(`mockGenerateDetailPage`가 입력값과 무관하게 `src/lib/data/frozen-demo-sections.json`—오늘 테스트로 얻은 실제 Gemini 생성 이미지 12장이 포함된 "프리미엄 뱀부 대형 타올" 결과—을 그대로 반환). **한도가 풀리면 두 플래그를 모두 `false`로 되돌릴 것.** 되돌린 뒤 "새 상세페이지 만들기"가 임의 입력에 대해 다시 실제로 생성하는지 재확인 필요. 플래그 적용 후 응답 시간 30초대→0.13초로 확인, localStorage 캐시 과다 누적(오늘 테스트로 46개 키/3.3MB)으로 인한 동일한 `QuotaExceededError` 재발도 확인해 정리함(사용자 확인 후 삭제 — Supabase가 원본이라 데이터 손실 없음).
  - **후속 버그**: 위 정리 후에도 반복 테스트로 localStorage가 다시 쌓여 동일한 `QuotaExceededError`가 재발했고, 이번엔 `handleGenerate`의 catch-폴백 분기 안 `saveGeneratedDraftLocally` 호출이 try/catch로 감싸여 있지 않아 예외가 그대로 전파되어 "생성" 버튼을 눌러도 아무 반응이 없는(에디터로 진입 못 하는) 실사용 버그로 이어짐. `saveGeneratedDraftLocally`(`new/page.tsx`) 자체를 두 가지로 강화: (1) 매 저장 전 현재 projectId를 제외한 과거 `detail-page-project/generation/agent-workflow/draft-assets:*` 캐시를 모두 정리(`pruneOldLocalDrafts`) — Supabase가 원본이라 캐시 삭제는 안전, (2) 쓰기 자체를 try/catch로 감싸 quota 초과 시에도 조용히 건너뛰고 생성 흐름은 계속 진행. 같은 프로젝트로 연속 생성해도 브라우저 저장 용량이 항상 프로젝트 1개분(~2.2MB)으로 고정되는 것을 반복 확인.
- [ ] Supabase 저장 → 새로고침 복원의 RichText 실동작 확인 (JSON 직렬화 구조상 안전하지만 실제 프로젝트로는 아직 미검증 — 테스트 계정/프로젝트로 확인 필요)
- [ ] ZIP export 캡처(`toCanvas`) 시점에 self-host 폰트 로드가 끝나 있는지, RichText(굵게/강조) 렌더링이 export에서도 캔버스와 동일하게 나오는지 확인 (미확인 시 fallback 폰트로 캡처될 위험 — 캔버스 자체의 글꼴/자간/줄간격 적용은 2026-07-16 확인 완료, export 결과물 자체는 미확인)
- [x] (2026-07-16) Konva 기반 자유 편집(Figma-style) 마이그레이션을 "intro" 섹션 1개 대상 수직 슬라이스로 시도했으나, 실사용 후 되돌림 — 정렬 가이드/스냅 없이 순수 자유 드래그만으로는 구조화 블록 편집보다 오히려 다루기 불편하다는 실제 사용 피드백. `react-konva`/`konva` 의존성, `canvasData`/`CanvasElement` 스키마, `section-canvas-konva.tsx`/`canvas-element-panel.tsx`/`canvas-elements.ts`/`canvas-export.ts` 모두 제거(`git revert` 2건, 2026-07-20). 자유 배치를 다시 시도한다면 Figma류 정렬 가이드/스냅부터 갖추고 시작할 것.
- [ ] 자유 좌표 배치 + 레이어 패널은 여전히 별도 세션의 별도 계획으로 보류 (span 마이그레이션과 달리 Supabase 스키마·AI 스키마·undo-redo 재설계·export 파이프라인까지 동시에 손대야 하는 멀티세션급 작업이고, 스냅/정렬 가이드 없이는 사용성도 검증 안 됨 — 2026-07-16/2026-07-20 조사 결과)
- [x] (2026-07-20) `section.kicker` + `slots`의 문자열형 필드(eyebrow/subHeadline/brandName/caption/emphasis/beforeLabel/afterLabel/badges/items/noticeItems)를 headline/body와 같은 더블클릭 인라인 편집으로 지원 — 지금까지 이 필드들은 19개 layoutType 블록 전부에서 `{slots.badges}`처럼 그냥 찍히기만 하고 편집 UI가 아예 없었음(사용자가 "이거 이미지인가?"로 리포트, 실제로는 그냥 편집 미연결). `section-canvas.tsx`에 `renderEditableLabel`(RichTextEditor 대신 단순 `<input>`, 굵게/강조 불필요) + `editingLabelKey` 상태 추가, `StructuredSectionBlock`에 `renderEditableLabel` prop으로 전달. 커밋 경로는 `key`를 `"kicker"`/`"slot.<scalar>"`/`"slot.<array>.<index>"` 문자열로 인코딩해 `editor/page.tsx`의 `applyLabelEdit()`(신규, 정규식으로 파싱해 해당 필드에 씀)로 보냄 — `headline`/`body`와 동일하게 `pushHistory`+`copy_manual_edit` 스타일 신호 기록도 재사용.
  - **스코프 컷**: `steps`/`faqItems`/`comparisonRows`/`optionItems`/`specRows`/`guideItems`/`proofItems`/`cards`(항목마다 필드 여러 개인 구조화 배열)는 다음 세션으로 미룸 — 사용자와 합의된 범위(문자열형만).
  - **하드코딩 폴백 배열 주의**: `material_closeup`의 `slots.badges ?? ["Soft","Absorbent","Daily"]`, `policy_notice`의 `slots.noticeItems ?? [본문 텍스트]`처럼 실제 slots 값이 없을 때 JSX가 하드코딩된 배열을 보여주는 케이스가 2곳 있음 — 이걸 그대로 편집 가능하게 두면 `applyLabelEdit`이 쓰는 `section.slots.badges`가 실제로는 `undefined`(빈 배열)라서 인덱스 기반 수정이 조용히 no-op이 되는 함정이 있었음. `slots.badges ? label(...) : badge`처럼 **실제 slots 데이터가 있을 때만 편집 가능**하게 조건부 처리해서 해결 — `beforeLabel`/`afterLabel`처럼 스칼라 필드의 문자열 폴백(`slots.beforeLabel ?? "..."`)은 이 문제가 없어(항상 전체 값을 덮어쓰므로) 조건 없이 바로 편집 가능하게 둠.
  - **실제 겪은 버그**: 브라우저 자동화(Playwright) `.dblclick()`이 이 span에서 안 먹혀서(네이티브 텍스트 단어선택만 발생, React 핸들러 미발화) 처음엔 기능이 안 되는 줄 알았음 — `dispatchEvent(new MouseEvent('dblclick', ...))`으로 직접 DOM에 이벤트를 쏴보니 핸들러 정상 발화, `input.select()`로 전체 선택도 정상, 커밋도 정상 — Playwright의 합성 더블클릭이 이 케이스에서 안 먹히는 테스트 툴 한계였음(실제 마우스 더블클릭은 영향 없음). 배지/키커/문구 3곳 편집 → 값 반영 확인, undo 3회로 전부 원복 확인.
- [x] (2026-07-20) 섹션 레이아웃 프리셋(여백/텍스트 크기/자간/줄간격) 4개를 3~5단계 버튼 프리셋에서 연속값(px) 슬라이더+숫자 입력으로 전환, 글꼴은 버튼 그룹 대신 드롭다운(`Select`)으로 교체. `SectionLayoutPreset`/`StyleSet`의 `spacing`/`textScale`/`letterSpacing`/`lineHeight` 타입을 enum → `number`로 변경(`types.ts`), 기존 `SectionSpacing`/`TextScale`/`LetterSpacing`/`TextLineHeight` enum과 그 `*_LABELS`는 삭제 — `FontFamily`(단어별 스타일링과 공유)만 유지. `layout-preset-controls.tsx`에 새 `SliderField`(range input + 동기화된 number input) 추가. 값 적용은 전부 inline `style`로만 함 — Tailwind JIT는 소스에 리터럴로 없는 `text-[${n}px]` 같은 동적 arbitrary-value 클래스는 인식 못 해 조용히 무효화되므로, 런타임 연속값은 애초에 Tailwind 클래스가 될 수 없음(`layout-presets.ts` 상단 코멘트 참고). `StructuredSectionBlock`의 19개 layoutType 블록이 쓰던 `content(className)` 헬퍼를 className 문자열 반환에서 `{className, style}` 반환으로 바꾸고 호출부 19곳을 `className={content(...)}` → `{...content(...)}`로 교체. 같은 패턴을 `section-canvas.tsx`의 미사용(dead) 레거시 `!sec.layoutType` 렌더 분기와 `styles/page.tsx`(스타일 세트 다이얼로그+카드 배지)에도 반영해 타입 일관성 유지.
  - **실제 겪은 버그**: `Select`/`SelectValue`(`@base-ui/react`)가 기본적으로 선택된 원시 value("system", "pretendard")를 그대로 렌더링하고 대응하는 `SelectItem`의 라벨("기본", "Pretendard")을 자동으로 보여주지 않음 — 브라우저에서 드롭다운 닫힌 상태로 "system"이 그대로 노출되는 것을 실제로 확인. `SelectValue`에 `children`으로 `(value) => FONT_FAMILY_LABELS[value] ?? value` 렌더 함수를 넘겨 해결(두 파일 모두). 슬라이더 이동 → 우측 패널 숫자 갱신 → 캔버스 미리보기 즉시 반영(여백/텍스트크기/자간/줄간격 각각 브라우저에서 실제 변경 확인), 글꼴 드롭다운 선택 후 트리거에 정확한 한글 라벨 표시되는 것도 재확인. `tsc`/`eslint` 클린.
- [x] (2026-07-20) 3열 레이아웃을 1366/1440/1920/2560px 폭에서 실브라우저(Playwright)로 검증 — 가로 스크롤·레이아웃 붕괴 없음. 다만 좌/우 패널과 가운데 캔버스(모바일 비율 미리보기라 고정폭)가 전부 고정폭이라, 와이드 데스크톱(1920px+)에서는 캔버스 좌우로 빈 회색 공간이 크게 남는 걸 확인 — 버그는 아니고(모바일 상세페이지 미리보기가 늘어나면 오히려 이상함) 의도된 트레이드오프, 다음 줄 항목(좁은 화면 패널 접기)과 짝을 이루는 "넓은 화면 최적화"는 이번엔 손대지 않음(우선순위 낮다고 판단, 필요시 재검토).
- [x] (2026-07-20) 좌/우 보조 패널(섹션 목록/섹션 편집) 접기 토글 추가 — 너비 기준 자동 접힘이 아니라 각 패널 헤더의 버튼(`PanelLeftClose`/`PanelRightClose`)으로 직접 켜고 끄는 수동 토글, 상태는 좌/우 각각 독립(`leftPanelCollapsed`/`rightPanelCollapsed`). 3열 grid의 `grid-cols-[...]`는 4가지 조합(둘 다 열림/왼쪽만 접힘/오른쪽만 접힘/둘 다 접힘)을 리터럴 Tailwind 클래스 4개로 분기 — 연속값이 아니라 유한한 조합이라 여백/텍스트크기 작업 때와 달리 arbitrary-value 클래스로도 문제없음. 접힌 패널은 40px 폭 스트립에 펼치기 버튼(`PanelLeftOpen`/`PanelRightOpen`)만 남김. 브라우저에서 접기→캔버스 폭 확장→펼치기(왼쪽만 다시 펼쳐도 오른쪽은 그대로 접힌 채 유지) 확인.
- [x] (2026-07-20) 다양한 화면 높이에서 독립 스크롤 검증 중 실제 버그 발견+수정 — 700px 높이 뷰포트에서 에디터 페이지 자체 헤더("상세페이지 프로젝트" 타이틀 행)가 위로 잘려 보임. 원인 추적: (1) 처음엔 `RichTextEditor`가 마운트 시 무조건 `.focus()`를 호출하는 게 범인인 줄 알았음 — 우측 패널의 "본문" 편집기가 `key={section.id}`라 섹션 전환마다 리마운트되면서 매번 포커스를 훔쳐가고 있었던 것(별도의 진짜 버그, `autoFocus` prop 추가해 캔버스 더블클릭 편집 쪽만 기본 `true` 유지하고 사이드패널은 `false`로 수정, `section-canvas.tsx`의 더블클릭 편집은 회귀 없음을 재확인). (2) 그런데 이 수정 후에도 700px 높이에서 여전히 `scrollY: 26`으로 페이지가 스크롤된 채 시작 — 진짜 원인은 별개였음: `/projects/new`에서 "생성" 버튼으로 클라이언트 사이드 라우팅(`router.push`)해서 들어올 때만 재현되고, 같은 URL을 하드 리로드(`page.goto`)하면 `scrollY: 0`으로 정상 — Next.js App Router의 내비게이션 후 포커스/스크롤 처리가 조금 어긋나는 것으로 보임(scroll anchoring 끔`overflow-anchor:none`으로도 안 고쳐짐, 이 페이지 콘텐츠 자체가 700px보다 큰 것도 아님 — 수동으로 `scrollTo(0,0)` 하면 잘리는 것 하나 없이 완벽하게 들어맞는 것으로 확인). 에디터 페이지 마운트 시 `window.scrollTo(0, 0)` 강제 실행으로 해결(`editor/page.tsx`). 프로덕션 빌드(`next build && next start`)로도 재현·수정 확인, 1366×700에서 헤더 안 잘리는 것·섹션 전환해도 포커스 안 뺏기는 것·`tsc`/`eslint` 클린 모두 확인.
- [ ] 세로 모니터 전용 레이아웃은 보류. 현재 사용자 테스트에서는 가로 작업 환경이 더 적합함
- [x] (2026-07-20) 캔버스 수정/드래그/줌/AI 도우미 키보드 접근성 점검+보강 — 드래그(섹션 순서 변경)는 dnd-kit `KeyboardSensor`가 이미 있어서 별도 조치 불필요(직접 확인만 함), 줌 버튼도 이미 진짜 `<button>` + `aria-label`이라 문제없음. 실제 구멍은 두 곳: (1) 캔버스 텍스트 편집(헤드라인/본문 + 이번에 추가한 kicker/slots 라벨)이 더블클릭 전용이라 키보드/스크린리더로는 편집 진입 자체가 불가능했음 — `renderEditableText`/`renderEditableLabel`의 비편집 상태 엘리먼트에 `tabIndex={0}` + `role="button"` + `aria-label`("헤드라인 편집 (Enter)" 등) + `focus-visible` 아웃라인 + Enter/Space `onKeyDown` 추가(더블클릭과 동일한 진입 로직 재사용). (2) "기획자 에이전트" 플로팅 패널이 열려도 포커스가 그대로였고 Escape로도 안 닫혔음 — 열릴 때 닫기 버튼(`aria-label` 없던 것도 같이 추가)으로 포커스 이동, 닫히면 FAB로 포커스 복귀, Escape 키로 닫기 추가. **겪은 버그**: FAB 포커스 복귀를 `closeAiPanel()` 안에서 바로 `.focus()` 호출했더니 실제로는 포커스가 안 돌아옴 — `setState`가 비동기라 그 시점엔 AnimatePresence가 아직 FAB를 마운트하기 전이라 ref가 비어 있었음. `wasAiOpenRef`로 "열림→닫힘" 전환을 감지하는 `useEffect`로 옮겨 해결(최초 마운트 시 원치 않는 FAB 포커스도 같이 방지). 브라우저에서 Tab만으로 배지/헤드라인 편집 진입, AI 패널 Enter로 열기→Escape로 닫고 포커스 FAB 복귀까지 전부 실제 확인, 페이지 로드 시 포커스 도둑맞지 않는 것도 재확인. `tsc`/`eslint`/`next build` 클린.
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
