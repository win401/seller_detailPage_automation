# Implementation Capability Review

## Purpose

이 문서는 기존 작업 폴더를 훑어본 뒤, 상세페이지 AI 제작 프로그램 MVP에서 구현 가능한 기술 범위와 새롭게 도전해야 할 범위를 정리합니다.

검토 대상:

- `/Users/sungwoo/Desktop/work/class`
- `/Users/sungwoo/Desktop/work/bus-log-project`
- `/Users/sungwoo/Desktop/work/hakuna-solution`
- `/Users/sungwoo/Desktop/work/hakuna-engine`

## Observed Existing Experience

### Next.js / React / TypeScript

확인 근거:

- `bus-log-project`: Next.js 14, React 18, TypeScript, Tailwind
- `hakuna-solution`: Next.js 14, React 18, TypeScript, Tailwind, Recharts
- `hakuna-engine`: Next.js 15, React 19, TypeScript, shadcn/Base UI 계열
- `health_care_coachBack/frontend`: Next.js 기반 프론트엔드

판단:

상세페이지 MVP의 기본 웹앱 구조, 입력 폼, 캔버스 화면, 편집 패널 구현은 충분히 가능한 범위입니다.

### AI API 연동

확인 근거:

- `bus-log-project`: `@google/generative-ai` 사용
- `hakuna-engine`: `@anthropic-ai/sdk` 사용
- `hakuna-engine/lib/claude/moderation.ts`: JSON 출력 파싱, 금지어/검수 프롬프트 구성 경험

판단:

13대 섹션별 AI 카피 생성 API는 기존 경험과 직접적으로 이어집니다.

주의할 점:

- JSON 파싱 실패 fallback 필요
- 출력 스키마 검증 필요
- hallucination 방지를 위한 금지 규칙 필요

### API Route / File Upload

확인 근거:

- `hakuna-engine/app/api/scrape/route.ts`: JSON body 검증, zod 사용, API 처리 흐름
- `hakuna-engine/app/api/upload-csv/route.ts`: multipart/form-data 파일 업로드, 확장자/용량 검증

판단:

AI 생성 API route, 파일 업로드 처리, 입력 검증은 구현 가능한 범위입니다.

### Export / Download

확인 근거:

- `bus-log-project/lib/exportExcel.ts`: 브라우저에서 xlsx 파일 생성 및 다운로드
- `bus-log-project/components/ExcelDownloadButton.tsx`: 클라이언트 버튼에서 export 유틸 호출

판단:

브라우저 기반 파일 다운로드 패턴은 이미 경험이 있습니다.

이번 프로젝트에서는 Excel 대신 PNG/ZIP 다운로드로 바뀌므로, 파일 생성 방식은 새로 익혀야 하지만 개념은 이어집니다.

### Automation / Scraping / External Workflows

확인 근거:

- `hakuna-engine`: Playwright, 상품 스크래핑, Shopee API, Slack 알림, node-cron

판단:

외부 API와 자동화 플로우 경험이 있으므로, 추후 Pinterest API나 쇼핑몰 업로드 연동을 검토할 기반은 있습니다.

단, MVP에서는 해당 기능을 제외하는 것이 적절합니다.

## MVP Feature Feasibility

### 비교적 안정적으로 가능한 범위

- 상품 정보 입력 폼
- 선택형 UI: 카테고리, 톤앤매너, 디자인 무드, 강조 포인트
- 13개 섹션 데이터 구조 정의
- mock JSON 기반 상세페이지 캔버스
- AI API route 구성
- Gemini/Claude 기반 구조화 카피 생성
- 금지 표현 및 출력 규칙 프롬프트 구성
- 텍스트 수정
- 섹션 숨김/삭제
- 플랫폼 가로폭 선택

### 새롭게 도전하지만 MVP에서 시도 가능한 범위

- 업로드 이미지 클라이언트 최적화
- DOM 또는 캔버스 기반 PNG 생성
- 긴 상세페이지 이미지 슬라이싱
- ZIP 패키지 다운로드
- dnd-kit 기반 섹션 블록 재정렬

### MVP에서 미루는 것이 좋은 범위

- Pinterest API 실시간 연동
- 레퍼런스 이미지 분석
- AI 누끼 제거
- Image-to-Image 합성
- 이미지 복잡도 기반 텍스트 안전영역 탐지
- 쇼핑몰 직접 업로드
- Electron/Tauri 데스크톱 앱

## Technical Risk Ranking

낮은 위험:

- 입력 폼
- 선택형 UI
- 상세페이지 섹션 데이터 구조
- mock 기반 캔버스
- AI API route
- 섹션별 텍스트 수정

중간 위험:

- AI JSON 출력 안정화
- 이미지 업로드 최적화
- dnd-kit 섹션 순서 변경
- 플랫폼별 가로폭 반영

높은 위험:

- 긴 상세페이지 전체 PNG 생성
- 2000px 슬라이싱
- ZIP 다운로드
- 다운로드 결과와 화면 미리보기의 일치성 확보

MVP 밖:

- Pinterest API
- 이미지 합성
- 자동 누끼
- 지능형 타이포그래피 안전영역 분석

## Recommended Implementation Strategy

1. AI 없이 mock JSON으로 13섹션 캔버스를 먼저 완성합니다.
2. 편집 가능한 블록형 구조를 먼저 만듭니다.
3. 이미지 업로드와 최적화는 캔버스가 안정된 뒤 붙입니다.
4. AI API는 데이터 구조가 확정된 뒤 연결합니다.
5. 다운로드 기능은 처음에는 전체 PNG 1장으로 시작합니다.
6. 마지막 단계에서 슬라이싱 ZIP 다운로드로 확장합니다.

## Conclusion

기존 프로젝트를 기준으로 보면, 이번 MVP의 핵심 웹앱/AI/API 구현은 충분히 가능한 범위입니다.

다만 이미지 export, 슬라이싱, ZIP 다운로드는 새롭게 검증해야 하는 영역입니다.

따라서 MVP 성공 가능성을 높이려면 상세페이지 캔버스와 데이터 구조를 먼저 안정화하고, 이미지 내보내기 기능은 후반부에 단계적으로 붙이는 전략이 적합합니다.

