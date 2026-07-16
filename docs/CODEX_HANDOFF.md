# Codex Handoff (2026-07-16)

이 문서는 Claude 세션이 토큰 소진으로 중단되면서, 같은 작업을 Codex가 이어받기 위해 작성한 인수인계 문서입니다. 프로젝트 전반 배경은 `docs/CLAUDE_HANDOFF.md`, `docs/TASKS.md`를 참고하세요 (특히 `docs/TASKS.md` 우선순위 4의 2026-07-16 항목들이 이번 세션 작업 전체입니다).

## 지금 당장 해야 할 일 (최우선)

**Konva 자유 편집 모드의 ZIP export 버그를 방금 고쳤는데, 실제로 고쳐졌는지 아직 육안 확인을 못 했습니다.**

1. `npm run dev`로 서버 실행, `/projects/[아무 프로젝트]/editor` 접속.
2. 좌측에서 "Intro" 섹션 선택 → 우측 패널의 "자유 편집으로 전환 (실험적)" 버튼 클릭.
3. 캔버스에 나타난 텍스트박스/이미지박스 중 하나를 클릭해 우측 패널이 속성 편집 패널(글꼴/굵게/크기/줄간격/자간/정렬/색상)로 바뀌는지 확인.
4. 상단 "ZIP 다운로드" 클릭.
5. **다운로드된 zip을 풀어서 `01.png`를 직접 열어보고 다음 두 가지를 확인**:
   - Intro 섹션 이미지가 좌우로 늘어나 보이지 않는지 (원래 버그: 비정상적으로 stretch됨)
   - 이미지 위에 "상세페이지 캔버스" / "smartstore·860px" 라는 헤더 텍스트나 테두리가 찍혀있지 않은지 (원래 버그: 에디터 UI 크롬이 그대로 캡처됨)

두 버그 모두 아래 "방금 한 수정"에서 고쳤다고 판단했지만, Claude 세션에서는 자동화된 브라우저 환경이라 다운로드된 실제 파일을 열어볼 수 없어서 **코드 레벨 검증(`tsc`/`lint` 통과, Konva 자체 렌더링 비율 확인)까지만 하고 최종 육안 확인은 못 한 채 끝났습니다.**

문제가 남아있다면 아래 "관련 코드" 섹션을 참고해서 `src/lib/canvas-export.ts`와 `handleExport`(editor page.tsx) 쪽을 다시 보세요.

## 커밋 상태

다음 순서로 이미 커밋되어 있습니다 (전부 `main` 브랜치, `git log --oneline`으로 확인):

1. `f72af20` Gemini 이미지 생성 응답 모달리티 누락 버그 수정
2. `408f443` 새 상세페이지 생성 시 섹션별 이미지 자동 생성
3. `3d99c80` 섹션별 카피 기반 이미지 프롬프트 개선 + 데모 고정
4. `0db92fc` localStorage 용량 초과로 생성 버튼이 먹통되던 버그 수정
5. `11ec4a0` 리치텍스트 에디터에 단어별 폰트 변경 기능 추가
6. `f0fd8bb` 폰트/굵게 등 스타일만 바뀐 편집이 blur 시 사라지던 버그 수정
7. `fedd535` **Konva 기반 자유 편집(Figma-style) 1단계 수직 슬라이스** (가장 큰 작업)
8. **커밋 안 됨 (작업 트리에 있음, 아래 "커밋 필요" 참고)** — ZIP export 버그 2건 수정

`git push` 여부: 사용자가 매번 명시적으로 요청할 때만 push했습니다. 최신 상태가 push됐는지 `git status`/`git log origin/main..HEAD`로 확인하세요.

## 커밋 필요 (Claude 세션 마지막에 처리 못함)

아래 4개 파일이 수정된 채 커밋되지 않았을 수 있습니다 (Claude Code의 자동 안전 분류기가 세션 막바지에 일시 장애를 일으켜 `git commit`이 반복 실패했습니다 — 이 저장소나 코드와는 무관한 인프라 이슈였습니다):

```
M  src/app/(app)/projects/[id]/editor/page.tsx
M  src/components/editor/section-canvas-konva.tsx
M  src/components/editor/section-canvas.tsx
?? src/lib/canvas-export.ts
```

`git status`로 먼저 확인하고, 이미 커밋되어 있지 않다면 아래 메시지로 커밋해 주세요 (사용자가 "push까지 완료해줘"라고 요청했으니, 커밋 후 `git push`도 실행):

```
Fix ZIP export capturing editor chrome and stretching Konva sections

Two bugs found by the user opening a real exported ZIP:

1. Canvas-mode section images came out stretched left-right —
   html-to-image doesn't reliably capture a live Konva <canvas>. Fixed
   by rendering canvasData through a detached offscreen Konva stage at
   real export resolution (canvas-export.ts's renderCanvasDataToDataUrl)
   and swapping the live <Stage> for a plain <img> of that render
   (SectionCanvasKonva's staticImageUrl prop) just for the html-to-image
   capture window.
2. Exported PNGs included the editor's own header label/border because
   handleExport captured canvasWrapRef, which wrapped <SectionCanvas>'s
   entire root (header included), not just the section stack. Fixed via
   a new sectionsRootRef that wraps only the sections.

tsc/lint clean.
```

## 이번 세션에서 실제로 한 작업 (시간순)

1. **Gemini 실제 이미지 생성 활성화** — `generateText` 호출에 `providerOptions.google.responseModalities`가 빠져 있던 버그.
2. **"새 상세페이지 만들기" 시 섹션 이미지 자동 생성** — 기존엔 고정 스톡 사진만 붙던 것을 Gemini로 실제 생성하도록 확장. 이 과정에서 localStorage 용량 초과 버그를 2번 겪고 고침(자세한 내용 `docs/TASKS.md` 참고).
3. **Gemini 월 지출 한도 초과** → 임시로 `src/lib/agents/section-images.ts`의 `PAUSED_FOR_SPEND_CAP = true`, `src/lib/mock-ai.ts`의 `FROZEN_DEMO_MODE = true`로 이미지 생성을 중단하고 데모용 고정 데이터(`src/lib/data/frozen-demo-sections.json`)를 반환하도록 해둠. **한도가 풀리면 이 두 플래그를 `false`로 되돌려야 합니다.**
4. **리치텍스트 에디터에 단어별 글꼴 변경 기능 추가** (`TextRun.fontFamily`, `MarkupToolbar`의 "글꼴" 드롭다운).
5. **Konva 기반 자유 편집(Figma-style) 마이그레이션 1단계** — 가장 큰 작업, 아래 별도 섹션 참고.

## Konva 마이그레이션 — 핵심 설계 결정

전체 배경/설계는 `/Users/sungwoo/.claude/plans/transient-humming-puppy.md`에 상세히 있습니다 (계획 파일, 삭제하지 마세요). 요약:

- **왜 Konva**: 사용자가 Figma 스타일 자유 편집(텍스트박스 클릭 → 우측 패널에서 font/px/lineheight/letterspacing/align/fill, 섹션 background/box 크기·모양·round 편집)을 원함. Polotno SDK는 $899/월 상용 라이선스라 제외, `react-konva`/`konva`(MIT, 무료) 채택.
- **범위를 의도적으로 좁힘**: 전체 19개 layoutType을 한 번에 바꾸는 대신, **"intro" 섹션 1개만** 자유 편집 모드로 전환 가능하게 만들어 전체 파이프라인(선택→속성패널→드래그/리사이즈→텍스트편집→undo/redo→export)을 검증. 나머지 18개는 명시적으로 다음 세션 몫.
- **단어별 스타일링 → 박스 단위로 축소**: Konva.Text가 리치텍스트(한 텍스트박스 안에 여러 스타일)를 기본 지원하지 않아서, 캔버스 텍스트박스는 폰트/굵기/크기/줄간격/자간/정렬/색상을 박스 전체 단위로만 적용(Figma의 실제 동작과 동일). 기존 구조화 블록(`StructuredSectionBlock`)의 단어별 굵게/강조/글꼴은 그대로 유지.
- **데이터 모델**: `DetailSection.canvasData?: SectionCanvasData` (신규, additive 필드). `canvasData` 있으면 Konva 렌더러, 없으면 기존 `StructuredSectionBlock` — 섹션 단위로 공존.

## 관련 코드 (새로 만든 파일)

- `src/lib/types.ts` — `CanvasElement`(`text`/`image`/`shape` union), `SectionCanvasData`, `DetailSection.canvasData?`
- `src/lib/canvas-elements.ts` — `createDefaultCanvasData(section)`: 기존 headline/body/imageUrl을 1회성으로 캔버스 엘리먼트로 변환
- `src/lib/canvas-export.ts` — `renderCanvasDataToDataUrl(data)`: export 전용, 오프스크린 Konva 스테이지로 실제 해상도 PNG 생성 (오늘 마지막에 추가)
- `src/components/editor/section-canvas-konva.tsx` — `<Stage>` 렌더러, 선택/드래그/리사이즈(Konva `Transformer`)/더블클릭 텍스트 편집(HTML textarea 오버레이), `staticImageUrl` prop(export 전용)
- `src/components/editor/canvas-element-panel.tsx` — 선택된 엘리먼트 타입별 속성 패널
- `src/components/editor/section-canvas.tsx` — `sec.canvasData` 있으면 Konva 렌더러로 분기, `sectionsRootRef`(export 캡처 대상, 헤더/테두리 제외)
- `src/components/editor/section-edit-panel.tsx` — "자유 편집으로 전환" 버튼(intro 섹션에만 노출, 되돌리기 없음)
- `src/app/(app)/projects/[id]/editor/page.tsx` — `selectedElementId` state, `handleSelectElement`/`handleChangeElement`/`handleEnableCanvasMode`, export 시 `exportImageOverrides` 처리

## 겪었던 실제 버그들 (같은 실수 반복하지 않도록)

1. **미리보기(360px) vs 실제 좌표(860px) 불일치** → 텍스트 잘림. Konva `Stage`의 `scaleX/scaleY`로 해결(좌표값은 그대로, Konva가 드래그/리사이즈 결과를 이미 스케일 반영해서 돌려줌 — 이벤트 핸들러에 추가 계산 불필요).
2. **섹션 wrapper div의 `onClick`이 Konva 선택 이후 버블링되어 `selectedElementId`를 매번 `null`로 리셋** → 우측 패널이 절대 안 바뀌던 버그. 캔버스 모드 섹션에서는 그 `onClick` 제거.
3. **`position: fixed` 오버레이가 엉뚱한 곳에 나타남** — 에디터가 캔버스 전체를 `transform: scale()`로 감싸는데, transform이 있는 조상은 `position: fixed` 자손의 containing block이 되어버림(zoom 100%/`scale(1)`이어도 발생). `position: absolute` + 같은 wrapper 안에 배치로 해결.
4. **`useEffect`를 조건부 early-return 뒤에 호출** — Rules of Hooks 위반, lint로 잡음.
5. **ZIP export에서 Konva 캔버스가 늘어남 + 에디터 크롬이 찍힘** — 위 "지금 당장 해야 할 일" 참고, 코드 수정은 했지만 육안 재확인 필요.

## 하지 말아야 할 것 / 주의

- `docs/TASKS.md`는 매 작업 단위 후 갱신하는 규칙이 있습니다 (`git log`의 "Require updating docs/TASKS.md after each unit of work" 커밋 참고). 계속 지켜주세요.
- push는 사용자가 매번 명시적으로 요청할 때만 하세요 (이번엔 요청했으니 위 "커밋 필요" 항목 커밋 후 push).
- `PAUSED_FOR_SPEND_CAP`/`FROZEN_DEMO_MODE` 두 플래그는 Gemini 지출 한도가 풀렸는지 사용자에게 먼저 확인 후에만 되돌리세요.
- Konva 마이그레이션의 나머지 18개 layoutType 전환, 레이어 패널, "구조화 블록↔캔버스 되돌리기"는 사용자가 명시적으로 요청하기 전까지 시작하지 마세요 (범위가 크다는 걸 사용자와 이미 합의했습니다).
