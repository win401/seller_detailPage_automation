# Tasks

## 현재 작업 원칙

- 실제 AI API 품질 테스트가 끝나기 전까지 AI 기능은 "구조 연결 완료"와 "실제 응답 검증 완료"를 분리해서 표시합니다.
- 새 기능 확장보다 현재 MVP 흐름의 안정성, 문서 정합성, 데모 가능 상태를 우선합니다.
- mock fallback은 데모 안정성을 위해 유지합니다.

## 0. 우선순위: 얇은 End-to-End 플로우 (1차 목표)

아래 흐름을 mock/placeholder를 적극 활용해서 먼저 한 번 끝까지 통과시킵니다.
나머지 섹션의 세부 항목(반응형 세로 모니터 대응, GSAP 모션, 스타일 세트, 이미지 개선/합성 UI, 관리자 화면 등)은 이 흐름이 통과한 뒤 2차로 채웁니다.

- [x] 로그인 (데모 계정 진입 포함) — mock, Supabase Auth 연동 전
- [x] 새 프로젝트 생성 진입
- [x] 상품 정보 입력 (최소 필드: 상품명, 카테고리, 키워드, 타깃, 톤앤매너, 무드, 플랫폼, 추가 제작 요청) — AI 생성 API 입력값으로 연결
- [x] 경쟁 상세페이지 URL/메모 입력 — 실제 크롤링 없음, 사용자 제공 정보 기반
- [x] 분석 에이전트 결과 표시 — mock 또는 structured output
- [x] 기획 에이전트 결과 표시 — mock 또는 structured output
- [x] 상품 이미지 업로드 — 1200px 기준 클라이언트 최적화 + 브라우저 preview + 에디터 임시 전달
- [x] 제작 에이전트 13섹션 생성 (mock fallback 허용) — Vercel AI SDK API + mock fallback
- [x] 검수 에이전트 결과 표시 — 과장 표현/누락/가독성 체크
- [x] 에디터에서 기존 분석/기획/제작/검수 결과 확인 — Supabase 우선, localStorage fallback
- [x] 모바일 캔버스에 13섹션 렌더링
- [x] 섹션 1개 문구 직접 수정
- [x] 기획자 에이전트 수정 요청 → 재기획 → 새 시안 적용 — mock 우선
- [x] 수동 수정 내용을 사용자 스타일 신호로 요약 저장 — localStorage 우선
- [x] 프로젝트 저장 및 다시 불러오기 — Supabase 우선, localStorage fallback
- [x] 플랫폼 기준 이미지 생성 + ZIP 다운로드 — 플랫폼 폭 적용, 2000px 단위 슬라이싱

## 1. 프로젝트 기본 구조

- [x] Claude Design 산출물 검토 및 화면별 라우트 매핑
- [x] 디자인 색상/타이포/spacing 토큰 globals.css 반영
- [x] 디자인 기준 누락 shadcn/ui 컴포넌트 추가 설치 — shadcn CLI 네트워크 차단으로 @base-ui/react 기반 직접 작성
- [x] 라우트 구조 정리
- [x] 공통 레이아웃 구성
- [x] shadcn/ui 컴포넌트 정리
- [x] 공통 타입 정의
- [x] mock 상세페이지 데이터 작성
- [x] light/dark 테마 기본 구조 설정

## 2. 인증과 대시보드

- [x] Supabase Auth 설정 — browser client + env 연결 준비
- [x] 로그인 화면
- [x] 데모 계정 로그인 진입
- [x] 회원가입 전용 페이지 — `/signup`, display name/email/password 입력 후 Supabase Auth 가입
- [x] 로그아웃 — 상단 계정 메뉴에서 Supabase signOut 후 `/login` 이동
- [x] 상단 계정 메뉴 — 아바타 클릭 시 설정/로그아웃 표시
- [x] 계정 설정 페이지 — `/settings`, 계정/인증/SMTP 예정 정보 표시
- [x] 프로젝트 대시보드 — Supabase `detail_page_projects` 목록 표시, 샘플 프로젝트 fallback 제거
- [x] 새 프로젝트 생성 진입
- [x] 상단 네비게이션 테마 토글 — `ThemeSwitch`

## 3. 상품 입력

- [x] 상품명 입력
- [x] 카테고리 선택
- [x] 핵심 키워드 입력
- [x] 타깃 고객 입력
- [x] 강조 포인트 체크박스
- [x] 톤앤매너 선택
- [x] 디자인 무드 선택
- [x] 플랫폼 선택
- [ ] 스타일 세트 선택 — 2차
- [x] 초안 생성 전 추가 제작 요청 입력
- [x] 추가 제작 요청 예시 칩 또는 placeholder 제공
- [x] 경쟁 상세페이지 URL 입력 필드
- [x] 경쟁 상세페이지 메모 입력 필드
- [x] 경쟁 URL 여러 개 추가/삭제 UI
- [x] "자동 크롤링하지 않음, 메모 기반 분석" 안내 문구

## 3-1. 에이전트 워크플로우

- [x] 생성 화면에 분석 → 기획 → 제작 → 검수 단계 표시
- [x] 에이전트 단계별 진행 상태 UI
- [x] 분석 에이전트 output type 정의 — AgentRunDraft mock output 기반
- [x] 기획 에이전트 output type 정의 — AgentRunDraft mock output 기반
- [x] 검수 에이전트 output type 정의 — AgentRunDraft mock output 기반
- [x] 에이전트 결과를 프로젝트 draft에 저장 — Supabase 저장, localStorage fallback
- [x] 에이전트 결과를 편집 화면에서 다시 확인
- [x] 에이전트 실패 시 다음 단계로 진행 가능한 mock fallback
- [x] 경쟁 URL은 참고 링크로만 저장하고 자동 크롤링하지 않는 정책 반영
- [x] 대시보드 하드코딩 샘플 프로젝트 제거 — Supabase 목록 또는 빈 상태만 표시

## 4. 이미지 처리

- [x] 이미지 업로드 — local preview
- [x] 레퍼런스 이미지 업로드 또는 메모 입력 — 생성 화면 업로드 + 에디터 "레퍼런스 이미지 적용" 버튼
- [x] 클라이언트 리사이즈
- [x] WebP/JPEG 압축
- [x] 최적화 전/후 용량 표시
- [ ] Supabase Storage 저장
- [x] 원본/레퍼런스/개선 결과 이미지 비교 UI — 생성 화면 preview + 에디터 mock reference 카드

## 5. 이미지 개선/합성 준비 (2차)

- [ ] 이미지 개선 방향 structured output schema 작성
- [ ] 이미지 생성/합성 프롬프트 생성
- [ ] negative prompt 생성
- [ ] 개선 결과 이미지 슬롯
- [x] mock 개선 이미지 또는 placeholder — Pinterest 스타일 mock 레퍼런스 카드
- [x] 상세페이지 섹션에 개선 이미지 반영 — mock 레퍼런스/업로드 이미지 섹션 적용
- [ ] 실제 상품 정보와 다른 이미지 생성 방지 규칙

## 6. AI/에이전트 생성

- [x] Vercel AI SDK 설정
- [x] 13섹션 zod schema 작성
- [x] 제작 에이전트 생성 API route 작성
- [x] mock fallback 작성
- [x] 과장 표현 방지 프롬프트 적용
- [x] 추가 제작 요청 additionalInstruction 반영
- [x] 분석 에이전트 API route 작성 — `src/lib/agents/analysis.ts` (`/api/agent-workflow/generate`를 통해 호출)
- [x] 기획 에이전트 API route 작성 — `src/lib/agents/planning.ts`
- [x] 검수 에이전트 API route 작성 — `src/lib/agents/review.ts`
- [x] 에이전트 단계별 zod schema 작성 — `src/lib/agents/schemas.ts`
- [x] 분석 결과를 기획 입력으로 연결 — `runPlanningAgent(input, analysisOutput)`
- [x] 기획 결과를 제작 입력으로 연결 — `runProductionAgent(input, planningOutput)`
- [x] 제작 결과를 검수 입력으로 연결 — `runReviewAgent(input, productionOutput, planningOutput)`
- [x] 누락 섹션 검증 — `productionOutputSchema`의 `sections.length(13)` zod 검증 실패 시 mock 폴백
- [x] 기획자 에이전트 수정 요청 structured output schema 작성 — `revisionOutputSchema`
- [x] 총괄 에이전트 tool 정의 (`runAnalysisAgent` / `runPlanningAgent` / `runProductionAgent` / `runReviewAgent`) — `src/lib/agents/orchestrator.ts`
- [x] 총괄 에이전트 tool-calling route 작성 — `src/app/api/agent-workflow/generate/route.ts`
- [x] 총괄 에이전트 실행 로그 저장 (`agent_type = "orchestrator"`, 하위 run `parent_run_id` 연결) — Supabase 실제 insert로 검증 완료
- [x] 총괄 에이전트 비용 제한 (최대 tool 호출 횟수, 동일 tool 연속 재시도 제한) — `stepCountIs(8)` + 연속 동일 tool 3회 감지 가드
- [x] API 키 없음/실패 시 총괄 에이전트 호출 생략하고 기존 mock 파이프라인 폴백 — provider/model 호출 실패 시 데모가 끊기지 않도록 처리
- [ ] 실제 AI API 응답 품질 검증 — API/모델 최종 테스트 전

## 7. 상세페이지 캔버스

- [x] 모바일 캔버스 레이아웃 — `src/components/editor/section-canvas.tsx`
- [x] 13개 섹션 렌더링
- [x] 무드 프리셋 적용 — mood별 이미지 그라디언트 팔레트(minimal/natural/premium/colorful)를 `input.designMood` 기준으로 mock/live 생성 경로 모두에 적용
- [x] 선택 섹션 표시
- [x] 미리보기 확대/축소 — 헤더 −/100%/+ 버튼, 50~150% 범위. ZIP export는 `canvasWrapRef` 부모에만 `transform: scale`을 걸어 격리(줌 상태와 무관하게 항상 원래 크기로 캡처됨, 실제 export로 검증 완료)
- [x] 캔버스 독립 스크롤 처리
- [x] Space + drag 화면 이동 — Space 홀드 중 드래그 시 스크롤 컨테이너 `scrollLeft`/`scrollTop` 직접 이동. 텍스트 입력 중에는 비활성화됨
- [x] 캔버스 텍스트 더블클릭 inline 수정 — headline/body 더블클릭 시 캔버스 위에서 바로 수정, blur/Enter 커밋 · Escape 취소, 사이드 패널·스타일 신호와 동일한 undo 스택/`recordStyleSignal` 경로 재사용

## 8. 반응형 작업 레이아웃 (2차)

- [ ] 가로 모니터용 3열 편집 레이아웃
- [ ] 세로 모니터용 캔버스 중심 레이아웃 — 실제 사용성 검토 후 MVP에서는 보류, 3열 작업 모드 유지
- [ ] 보조 패널 접기/펼치기
- [ ] 상단 작업 바 반응형 처리
- [ ] 캔버스/패널 독립 스크롤
- [ ] 노트북/가로 모니터/세로 모니터 뷰포트 점검

## 9. Light/Dark 모드

- [x] 시스템 테마 기본값 반영 — `ThemeProvider defaultTheme="system"` (`src/app/layout.tsx`)
- [x] light/dark/system 선택 UI — `ThemeSwitch` (`src/components/app-shell/theme-switch.tsx`)
- [x] 선택한 테마 저장 — next-themes가 localStorage에 자동 저장
- [ ] 대시보드 light/dark 확인 — 실제 화면 눈으로 확인 필요 (수동 QA)
- [ ] 편집기 light/dark 확인 — 실제 화면 눈으로 확인 필요 (수동 QA)
- [ ] 관리자 화면 light/dark 확인 — 2차 항목(관리자 화면)이 아직 없어 해당 없음
- [x] 상세페이지 캔버스/export 디자인과 앱 테마 분리 — `globals.css`에 `--canvas-*` 토큰이 `.dark`와 무관하게 고정값으로 정의됨 ("intentionally NOT theme-dependent" 주석 포함)

## 10. GSAP 인터랙션 (2차)

- [x] GSAP/@gsap/react 설치
- [x] floating AI 도우미 버튼 — 기존 pulse 유지 + GSAP entrance
- [x] AI 도우미 버튼에서 패널로 확장되는 모션 — `aiPanelRef`/`aiFabRef`
- [x] AI 결과 생성 시 후보 카드 reveal 모션 — `AiAssistantPanel`
- [x] AI 결과 적용 시 섹션 하이라이트 모션 — `SectionCanvas` GSAP flash
- [x] export 완료 success motion — ZIP 생성 완료 badge
- [x] prefers-reduced-motion 대응

## 11. 블록형 편집기

- [x] 섹션 문구 수정 — 사이드 패널 + 캔버스 inline 수정
- [x] 섹션 이미지 교체 — 직접 업로드/상품 이미지/레퍼런스 mock 적용
- [x] 섹션 숨김/복구
- [x] dnd-kit 섹션 순서 변경 — `SectionList`의 grip 아이콘이 실제 드래그 핸들로 동작 (`@dnd-kit/sortable`), 위/아래 버튼도 유지
- [x] 카피 후보 선택 — 섹션 편집 패널 "카피 후보" 목록에서 클릭하면 헤드라인 교체(이전 헤드라인은 후보 목록에 남아 다시 전환 가능)
- [x] 특정 섹션 다시 생성 — "이 섹션 다시 생성" 버튼(mock 우선, 3종 대체 문구 로테이션)
- [x] 편집 히스토리 상태 관리 (undo/redo 스택)
- [x] Ctrl+Z / Ctrl+Shift+Z 단축키
- [x] 상단 작업바 되돌리기/다시하기 버튼
- [x] 섹션 레이아웃 프리셋 편집 — 자유 px 편집 대신 프리셋 기반(`docs/CLAUDE_HANDOFF.md`의 "블록 기반 유지" 결정과 타협): 이미지 위치(3x3), 이미지 채우기(cover/contain), 이미지 높이(낮게/기본/높게), 섹션 여백(좁게/기본/넉넉하게), 텍스트 크기(작게/기본/크게). `src/lib/layout-presets.ts`, 섹션 편집 패널 "레이아웃"/"여백 & 텍스트 크기" 블록

## 12. 기획자 에이전트 수정 요청

- [x] 편집기 내 기획자 에이전트 요청 패널
- [x] 빠른 액션 버튼
- [x] 전체 시안 수정 요청
- [x] 선택 섹션 중심 수정 요청
- [x] FAQ/CTA 축약 요청 — 전용 예시 칩 추가 (`AiAssistantPanel` REVISION_EXAMPLES)
- [x] 검수 경고 반영 요청 — 예시 칩 + `priorReview` 컨텍스트 전달 구조 연결
- [x] 재기획 전/후 비교 — `AiAssistantPanel` 적용 전/새 시안 후보 비교 UI
- [x] 새 시안 적용하기
- [x] 수정 요청 API 호출 — `src/app/api/agent-workflow/revise/route.ts`
- [x] 총괄 에이전트가 수정 요청 범위(section / multi_section / full_draft) 판단 — `runRevisionAgent`의 `revisionScope` 출력 기준으로 병합
- [x] 총괄 에이전트를 통한 기획 → 제작 → 검수 루프 연결 — `runOrchestratedRevision`(revision→production→review), 기존 `runProductionAgent`/`runReviewAgent` 재사용
- [ ] 총괄 에이전트 tool 호출 상한과 연결된 호출 횟수 제한 상태 — 재기획은 결정론적 3단계 파이프라인이라 tool-calling 루프/상한 자체가 해당 없음
- [x] mock fallback — API 키 없음/호출 실패 시 기존 `mockPlanRevision` 그대로 사용
- [x] 기존 분석/기획/제작/검수 결과를 기획자 에이전트 입력 맥락으로 전달 — `agentWorkflow.runs`에서 추출해 프롬프트에 포함
- [x] 수동 수정 전/후를 사용자 스타일 신호로 기록
- [ ] 실제 AI API 재기획 응답 품질 검증 — API/모델 최종 테스트 전

## 13. 스타일 세트 (2차)

- [x] 스타일 세트 목록 — `/styles`, localStorage 기반(`src/lib/style-sets.ts`), 아직 Supabase `style_sets` 테이블과는 연결 안 됨(레이아웃 프리셋 컬럼이 스키마에 없음)
- [x] 스타일 세트 생성 — `/styles`의 `StyleSetFormDialog`
- [x] 스타일 세트 수정
- [x] 기본 무드/톤/색상 저장
- [x] 레이아웃 기본값 저장 — 이미지 위치/채우기/높이, 섹션 여백, 텍스트 크기 프리셋(`SectionLayoutPreset`, §7/§11과 필드 공유)
- [ ] 섹션 표시 기본값 저장 — 필드(`sectionVisibility`)는 있으나 폼 UI 미제공
- [x] 새 프로젝트에 스타일 세트 적용 — 생성 화면에서 선택 시 무드/톤/플랫폼 자동 반영 + 생성된 섹션에 레이아웃 기본값 스탬프. 에디터에서도 기존 초안에 일괄 적용 가능("전체 섹션에 레이아웃 적용")
- [ ] 수동 수정 요약 기반 사용자 선호 저장
- [ ] 다음 프로젝트 생성 시 기획 에이전트 입력에 스타일 신호 반영

## 14. 저장

- [x] 프로젝트 저장 — 에디터 저장 시 Supabase `draft_versions` 새 버전 저장
- [x] 프로젝트 불러오기 — 대시보드에서 Supabase 프로젝트 목록 조회
- [x] 에디터 DB draft 복원 — `detail_page_projects` + `draft_versions` + `agent_runs` 조회 후 localStorage fallback 유지
- [x] 프로젝트 수정 저장 — `current_draft_version_id` 최신 draft로 갱신
- [x] localStorage 임시 저장
- [x] 로컬 초안 DB 승격 저장 — `p1` fallback 초안도 저장 시 Supabase 프로젝트로 생성
- [x] 새 프로젝트 생성 시 Supabase `detail_page_projects` 저장 — 로그인 세션이 있으면 DB 저장, 실패 시 localStorage fallback
- [x] 에이전트 결과 저장 — 생성 시 `agent_runs` insert, localStorage fallback 유지
- [x] 경쟁 상세페이지 URL/메모 저장 — 생성 시 `competitor_references` insert, localStorage fallback 유지
- [x] 초안 버전 저장 — 생성 시 `draft_versions` insert 후 `current_draft_version_id` 연결
- [x] 사용자 스타일 신호 저장 — localStorage `detail-page-style-signals:{projectId}`
- [x] 사용자 스타일 신호 Supabase 저장 연결 — 로그인 세션이 있으면 `user_style_signals` insert, 실패 시 localStorage fallback
- [x] Supabase PostgreSQL/RLS 스키마 초안 작성 — `docs/supabase/schema.sql`
- [x] RLS 정책 Supabase 프로젝트에 실제 적용 — `agent_runs.parent_run_id` 컬럼 + `authenticated` GRANT 포함, MCP로 마이그레이션 적용 완료

## 15. Export

- [x] 플랫폼 가로폭 적용
- [x] 전체 상세페이지 이미지 생성
- [x] 2000px 단위 슬라이싱
- [x] ZIP 다운로드 전 현재 draft 저장 시도
- [x] 파일명 자동 정리
- [x] ZIP 다운로드
- [x] 다운로드 상태 표시

## 16. 관리자 화면 (2차)

- [ ] 관리자 권한 확인
- [ ] 사용자 수 표시
- [ ] 프로젝트 수 표시
- [ ] AI 생성 횟수 표시
- [ ] ZIP 다운로드 횟수 표시
- [ ] 최근 프로젝트 메타데이터 표시

## 16-1. Python/FastAPI 고도화 후보

현재 MVP의 메인 백엔드는 Next.js + Supabase로 유지합니다. FastAPI/Python은 아래처럼 Python 생태계가 꼭 필요한 기능이 생길 때만 별도 worker/service로 추가합니다.

- [ ] 이미지 누끼 제거 worker 검토
- [ ] OpenCV 기반 이미지 여백/복잡도 분석 worker 검토
- [ ] 레퍼런스 기반 이미지 합성 worker 검토
- [ ] 대량 상품/경쟁 데이터 분석 배치 검토
- [ ] FastAPI가 Auth/DB/Storage를 소유하지 않도록 Supabase 중심 연동 규칙 유지
- [ ] `enhanceProductImage`, `removeBackground`, `analyzeReferenceImage` 함수 경계 설계

## 17. 마무리

- [x] 샘플 상품 데이터 — `mockProductInput`이 새 프로젝트 폼 기본값으로 이미 연결됨
- [x] 빈 상태 UI — 대시보드 로그아웃/미설정/빈 목록 상태 메시지
- [x] 로딩 상태 UI — 대시보드/생성 화면/에디터(Supabase draft 불러오는 중 표시 추가) 모두 커버
- [x] 오류 상태 UI — 대시보드 오류 상태, `SupabaseSaveError` 상세 메시지, AI 실패 시 mock 폴백
- [ ] 주요 뷰포트 반응형 최종 점검 — 실제 화면 눈으로 확인 필요 (수동 QA)
- [ ] light/dark 시각 점검 — 실제 화면 눈으로 확인 필요 (수동 QA, §9와 동일)
- [ ] 주요 모션이 작업 흐름을 방해하지 않는지 점검 — 실제 화면 눈으로 확인 필요 (수동 QA)
- [x] lint/build 확인 — 2026-07-10 `npm run lint`, `npx tsc --noEmit`, `npm run build` 통과
- [x] 발표 데모 흐름 정리 — `docs/DEMO_SCRIPT.md`
