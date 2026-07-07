# MVP Plan

## Project Stance

이 프로젝트는 이름상 미니프로젝트이지만, 단순 제출용 CRUD가 아니라 프론트엔드 포트폴리오로 확장 가능한 AI 제작 자동화 툴을 목표로 합니다.

개발은 2026년 7월 8일부터 2026년 7월 19일까지 진행한다고 가정합니다.

약 11-12일의 개발 기간 동안 "기본 MVP"만 만드는 것이 아니라, 사용자가 실제 제작 흐름을 경험할 수 있는 수준까지 고도화합니다.

단, 개발 우선순위는 "셀러가 직접 상세페이지를 만들고 저장하고 내보내는 핵심 플로우"가 먼저입니다. 관리자 대시보드와 데이터 자산화 기능은 사업화 가능성을 열어두기 위한 운영/분석 레이어로 함께 설계합니다.

## MVP Goal

상품 정보와 이미지를 입력하면 AI가 13개 섹션 기반 상세페이지 초안을 만들고, 사용자는 데스크톱에서 모바일 상세페이지 캔버스를 보며 블록 순서와 문구를 수정한 뒤, 플랫폼 업로드용 이미지 ZIP을 다운로드할 수 있습니다.

## Portfolio Goal

프론트엔드 포트폴리오에서 다음 역량을 보여주는 것을 목표로 합니다.

- 복합 제품형 UI 설계
- AI 구조화 출력 연동
- 블록형 WYSIWYG 편집 UX
- 이미지 업로드 및 최적화
- 브라우저 기반 이미지 export
- ZIP 다운로드 자동화
- Supabase Auth/RLS 기반 사용자별 데이터 관리
- 관리자 대시보드와 사용 데이터 분석
- 실무 도메인 문제 해결

## Core User Flow

1. 사용자가 회원가입 또는 로그인합니다.
2. 사용자가 상품 정보를 입력합니다.
3. 상품 이미지를 업로드합니다.
4. 카테고리, 톤앤매너, 디자인 무드, 강조 포인트를 선택합니다.
5. 저장된 회원별 상세페이지 스타일 세트를 선택하거나 새로 만듭니다.
6. AI가 13개 섹션 상세페이지 초안을 생성합니다.
7. 앱이 무드 프리셋과 스타일 세트에 맞춰 상세페이지 블록을 자동 배치합니다.
8. 사용자는 데스크톱 화면에서 모바일 상세페이지 캔버스를 확인합니다.
9. 사용자는 섹션 순서, 문구, 이미지, 숨김 여부를 수정합니다.
10. 플랫폼을 선택합니다.
11. 상세페이지를 플랫폼 가로폭 기준으로 렌더링합니다.
12. 2000px 단위로 슬라이싱된 이미지 ZIP을 다운로드합니다.
13. 작업 결과를 Supabase에 저장하고 다시 불러올 수 있습니다.

## Admin Flow

관리자는 별도의 관리자 대시보드에서 서비스 사용 흐름을 확인합니다.

관리자 대시보드의 1차 목적은 CS/운영이 아니라, 미니프로젝트 이후 사업화 가능성을 판단하기 위한 데이터 관찰입니다.

관리자가 확인하는 데이터:

- 전체 가입자 수
- 전체 프로젝트 수
- AI 생성 횟수
- ZIP 다운로드 횟수
- 많이 선택된 상품 카테고리
- 많이 선택된 디자인 무드
- 많이 선택된 톤앤매너
- 많이 선택된 플랫폼 규격
- 많이 숨겨지는 섹션
- 많이 수정되는 섹션
- 스타일 세트 사용 빈도
- 최근 생성된 프로젝트 메타데이터

관리자 대시보드에서 기본적으로 보지 않는 데이터:

- 셀러가 입력한 상품 원문 전체
- 업로드한 원본 이미지 전체
- 개별 셀러의 민감한 소싱 정보
- 판매 예정 상품을 특정할 수 있는 상세 내용

원칙:

- 관리자 대시보드는 익명/집계 데이터를 우선합니다.
- 개별 프로젝트 상세 열람은 개발/CS 목적이 있을 때만 제한적으로 고려합니다.
- 나중에 사업화할 데이터는 "셀러 개인의 상품 정보"가 아니라 "카테고리/무드/섹션/제작 패턴의 집계 인사이트"로 만듭니다.

## Must Have

### 1. 상품 입력 및 선택형 UI

- 상품명 입력
- 카테고리 선택
- 핵심 키워드 입력
- 타깃 고객 입력 또는 선택
- 상품 이미지 업로드
- 톤앤매너 선택
- 디자인 무드 선택
- 강조 포인트 체크박스

### 2. 업로드 이미지 자동 최적화

- 업로드 이미지 최대 가로폭 1200px
- WebP 우선, 필요 시 JPEG
- 품질 0.85 기준 압축
- 최적화 전/후 용량 표시
- 최적화 완료 상태 표시

### 3. Vercel AI SDK 기반 13섹션 생성

- Vercel AI SDK 사용
- `zod` schema 기반 구조화 출력
- 13개 섹션 JSON 생성
- 낮은 temperature 설정
- 누락 섹션 fallback
- 과장/허위 표현 방지 규칙

13개 섹션:

1. Intro
2. One Line Selling Point
3. Problem
4. Solution
5. Key Benefit 1
6. Key Benefit 2
7. Key Benefit 3
8. Detail Point
9. Use Scene
10. Recommended For
11. Trust Point
12. FAQ
13. CTA

### 4. 무드 프리셋 기반 레이아웃 자동 매칭

MVP에서는 Pinterest API를 사용하지 않고 내부 프리셋을 사용합니다.

프리셋 후보:

- 미니멀
- 감성
- 프리미엄
- 정보형
- 공구형

각 프리셋은 다음 값을 포함합니다.

- 배경색
- 타이포 크기
- 섹션 간격
- 이미지 비율
- 강조 색상
- 블록 타입 배정 규칙

### 5. 데스크톱 기반 모바일 상세페이지 캔버스

- 사용자는 PC/노트북에서 서비스를 사용합니다.
- 캔버스는 모바일 상세페이지 결과물 비율로 표시합니다.
- 화면 표시용 캔버스와 출력용 캔버스 개념을 구분합니다.
- 에이블리 860px, 지그재그 1000px 기준 출력 폭을 지원합니다.

### 6. 블록형 편집기

- 섹션 문구 수정
- 섹션 이미지 교체
- 섹션 숨김/복구
- 추천 카피 후보 선택
- dnd-kit 기반 섹션 순서 변경

제공하지 않는 것:

- 피그마식 자유 좌표 배치
- 텍스트 박스 임의 생성
- 레이어 패널
- 이미지 세밀 리사이즈

### 7. 플랫폼 업로드용 ZIP 다운로드

- 플랫폼 선택
- 출력 가로폭 자동 적용
- 전체 상세페이지 PNG 생성
- 2000px 단위 슬라이싱
- `01.png`, `02.png`, `03.png` 파일명 자동 정리
- ZIP 다운로드

### 8. Supabase 기반 프로젝트 저장

MVP에서도 Supabase를 사용합니다.

로그인/회원가입, 사용자별 프로젝트 저장, 사용자별 스타일 세트 저장까지 포함합니다.

### 9. Supabase Auth와 RLS

MVP에서도 Supabase Auth를 사용합니다.

인증 범위:

- 이메일/비밀번호 회원가입
- 이메일/비밀번호 로그인
- 로그아웃
- 로그인한 사용자의 프로젝트 목록 조회
- 로그인한 사용자의 스타일 세트 조회

RLS 범위:

- 사용자는 자신의 프로젝트만 조회할 수 있습니다.
- 사용자는 자신의 프로젝트만 생성/수정/삭제할 수 있습니다.
- 사용자는 자신의 스타일 세트만 조회할 수 있습니다.
- 사용자는 자신의 스타일 세트만 생성/수정/삭제할 수 있습니다.
- Storage를 사용하면 사용자별 경로 기준으로 접근을 제한합니다.

MVP에서 하지 않는 것:

- 소셜 로그인
- 비밀번호 재설정 고도화
- 팀/조직 초대
- 결제 권한 분기
- 복잡한 workspace 권한 모델

관리자 권한은 포함하되, MVP에서는 단순 `admin` role 기반으로 제한합니다.

### 10. 회원별 상세페이지 스타일 세트 저장

사용자별로 자주 쓰는 상세페이지 스타일 세트를 저장할 수 있습니다.

스타일 세트 저장 대상:

- 스타일 세트 이름
- 기본 디자인 무드
- 기본 톤앤매너
- 대표 색상
- 보조 색상
- 폰트 분위기
- 기본 플랫폼 규격
- 강조 포인트 기본값
- 섹션 표시/숨김 기본값
- 브랜드/스토어 메모

활용 방식:

- 새 상세페이지 생성 시 스타일 세트를 선택합니다.
- 선택된 스타일 세트가 입력 기본값과 레이아웃 프리셋에 반영됩니다.
- 사용자는 매번 같은 톤/무드/색상을 반복 선택하지 않아도 됩니다.

포트폴리오 관점:

- 단순 AI 생성기를 넘어 "사용자별 작업 환경을 저장하는 SaaS"처럼 보입니다.
- Supabase Auth, RLS, user-scoped data modeling을 보여줄 수 있습니다.

### 11. Supabase 기반 프로젝트 저장

상세페이지 작업물을 저장하고 불러오는 범위에 집중합니다.

저장 대상:

- 상품 입력값
- 선택한 톤앤매너
- 선택한 디자인 무드
- 강조 포인트
- 13개 섹션 JSON
- 섹션 순서
- 섹션 숨김 여부
- 선택한 플랫폼 규격
- 생성/수정 시간
- 연결된 스타일 세트 ID

이미지 처리:

- Supabase Storage에 최적화된 업로드 이미지를 저장합니다.
- 저장된 이미지 URL/path를 프로젝트 데이터와 연결합니다.
- Storage가 지연되면 이미지 저장은 localStorage fallback으로 처리하고, 텍스트/JSON 프로젝트 저장을 먼저 완성합니다.

DB 범위:

- 프로젝트 목록
- 프로젝트 상세 저장
- 프로젝트 다시 불러오기
- 샘플 프로젝트 seed
- 스타일 세트 목록
- 스타일 세트 저장/수정/삭제

MVP에서 하지 않는 것:

- 결제
- 팀 공유
- 다중 사용자 권한 관리

### 12. 관리자 대시보드

MVP에서도 관리자 대시보드를 포함합니다.

목표:

- 서비스 운영자가 전체 사용 흐름을 확인합니다.
- 어떤 카테고리/무드/플랫폼이 많이 쓰이는지 확인합니다.
- 어떤 섹션이 자주 수정/삭제되는지 확인합니다.
- 향후 셀러 인사이트 리포트나 유료 기능으로 확장할 데이터를 쌓습니다.

관리자 화면 1차 범위:

- `/admin` 페이지
- 관리자 전용 접근 제한
- 사용자 수 카드
- 프로젝트 수 카드
- AI 생성 횟수 카드
- ZIP 다운로드 횟수 카드
- 인기 카테고리 차트
- 인기 무드/톤 차트
- 플랫폼 선택 분포
- 섹션별 수정/숨김 빈도
- 최근 프로젝트 메타데이터 리스트

MVP에서 하지 않는 것:

- 복잡한 CRM
- 결제/구독 관리
- 개별 사용자 강제 제어
- 개별 셀러 상품 데이터 판매
- 실시간 BI 수준의 고급 분석

### 13. 사용 이벤트 수집

관리자 대시보드와 향후 데이터 자산화를 위해 최소한의 이벤트를 저장합니다.

수집 이벤트 후보:

- `user_signed_up`
- `project_created`
- `image_uploaded`
- `image_optimized`
- `ai_generated`
- `section_edited`
- `section_hidden`
- `section_reordered`
- `copy_variant_selected`
- `style_set_created`
- `style_set_applied`
- `export_downloaded`

이벤트에 저장하는 값:

- event name
- user id
- project id
- category
- platform
- mood
- tone
- section id
- metadata json
- created at

주의:

- 원문 상품 설명이나 민감한 소싱 정보는 이벤트 테이블에 그대로 저장하지 않습니다.
- 데이터 분석은 집계/익명화 중심으로 설계합니다.
- 향후 셀러에게 판매 가능한 데이터는 "요즘 어떤 상품이 많이 등록되는가"보다 먼저 "상세페이지 제작 패턴과 전환 설계 인사이트"에서 출발합니다.

## High-Value Enhancements

개발 속도가 빠르면 7월 19일까지 함께 노리는 고도화 기능입니다.

### 1. 상세페이지 완성도 점수

규칙 기반으로 상세페이지 품질을 점수화합니다.

평가 기준 예시:

- 13개 섹션 완성 여부
- 이미지 포함 여부
- CTA 존재 여부
- FAQ 존재 여부
- 문구 길이 적정성
- 과장 표현 위험 여부
- 추천 대상/신뢰 요소 포함 여부

### 2. 섹션별 다시 생성

- 전체 재생성이 아니라 특정 섹션만 다시 생성합니다.
- FAQ만 다시 생성
- CTA만 다시 생성
- Key Benefit만 다시 생성

### 3. 전체 PNG 다운로드 옵션

- ZIP 슬라이싱 외에 긴 이미지 1장 다운로드 옵션을 제공합니다.

### 4. 샘플 상품 데이터

발표 데모 안정성을 위해 샘플 상품을 제공합니다.

후보:

- 린넨 셔츠
- 프리미엄 텀블러
- 감성 디퓨저
- 뷰티 세럼

### 5. Supabase Storage 이미지 저장

- 최적화된 업로드 이미지를 Supabase Storage에 저장합니다.
- 저장된 이미지 URL을 프로젝트 데이터와 연결합니다.
- Storage 구현이 늦어질 경우 프로젝트 JSON 저장을 우선합니다.

### 6. 스타일 세트 빠른 적용

- 저장된 스타일 세트를 선택하면 톤앤매너, 무드, 컬러, 플랫폼 기본값이 자동 적용됩니다.
- 발표 데모에서 "반복 작업을 줄이는 셀러용 작업 환경"으로 보여줄 수 있습니다.

### 7. 관리자 대시보드 고도화

- 기간별 사용량 필터
- 카테고리별 프로젝트 생성 추이
- 카테고리별 자주 선택되는 무드/톤
- 많이 수정되는 섹션 순위
- 완성도 점수 평균
- ZIP 다운로드 전환율
- 샘플 데이터 기반 운영 리포트

## Should Have

- 미리보기 확대/축소
- 1500/2000/3000px 슬라이싱 옵션
- 스마트스토어/쿠팡 프리셋 추가
- 브랜드 컬러 간단 선택
- 카피 톤앤매너 재생성
- localStorage 자동 임시 저장
- Supabase 저장 실패 시 localStorage fallback
- 비밀번호 재설정 기본 플로우
- 관리자 대시보드 기간 필터
- 관리자용 CSV 다운로드

## Could Have

- 간단한 브랜드 프리셋 저장
- 섹션별 슬라이싱
- 이미지별 고화질 최적화 옵션
- AI 생성 로그 보기
- Claude/Gemini/OpenAI 모델 선택 UI
- 소셜 로그인
- 셀러 인사이트 리포트 초안
- 카테고리 트렌드 리포트 초안

## Won't Have

이번 개발 기간에는 제외합니다.

- Pinterest API 실시간 연동
- 레퍼런스 이미지 분석
- AI 누끼 제거
- Image-to-Image 합성
- 이미지 복잡도 기반 텍스트 안전영역 자동 탐지
- 쇼핑몰 플랫폼 직접 업로드
- 결제
- 팀/조직 협업
- 대량 상품 일괄 생성
- Electron/Tauri 데스크톱 앱
- 외부 커머스 데이터 크롤링
- 개별 셀러 상품 데이터 판매

## Technical Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- dnd-kit

### AI

- Vercel AI SDK
- zod schema
- AI Gateway 또는 직접 provider key
- mock fallback data

### Image / Export

- Canvas API
- html-to-image 또는 유사 DOM capture 도구
- JSZip
- 클라이언트 이미지 리사이즈/압축

### Data

MVP에서는 Supabase를 사용합니다.

- Supabase Auth: 이메일 회원가입/로그인
- Supabase Database: 프로젝트 저장/불러오기
- Supabase Database: 사용자별 스타일 세트 저장
- Supabase Database: 사용 이벤트 저장
- Supabase Database: 관리자 대시보드 집계 조회
- Supabase RLS: 사용자별 프로젝트/스타일 세트 접근 제한
- Supabase Storage: 업로드 이미지 저장
- React state: 편집 중 상태 관리
- localStorage: 자동 임시 저장 및 fallback
- mock sample data: 데모 안정성 확보

인증은 MVP 범위에 포함합니다.

단, 팀/조직 권한 모델은 제외하고 개인 계정 단위로만 저장합니다.

### Backend

- Next.js Route Handler
- Node.js runtime
- Vercel AI SDK 기반 생성 API
- Supabase server/client integration
- 입력 검증 및 fallback 처리
- 관리자 전용 데이터 조회 API
- 사용 이벤트 기록 API

## Supabase Schema Draft

### profiles

- `id`: uuid, auth.users 참조
- `email`: text
- `display_name`: text
- `role`: text, default `user`
- `created_at`: timestamptz

### style_sets

- `id`: uuid
- `user_id`: uuid
- `name`: text
- `default_mood`: text
- `default_tone`: text
- `primary_color`: text
- `secondary_color`: text
- `font_mood`: text
- `default_platform`: text
- `default_highlights`: jsonb
- `section_visibility`: jsonb
- `brand_note`: text
- `created_at`: timestamptz
- `updated_at`: timestamptz

### detail_page_projects

- `id`: uuid
- `user_id`: uuid
- `style_set_id`: uuid nullable
- `title`: text
- `product_input`: jsonb
- `selected_platform`: text
- `selected_mood`: text
- `selected_tone`: text
- `sections`: jsonb
- `section_order`: jsonb
- `hidden_section_ids`: jsonb
- `asset_paths`: jsonb
- `quality_score`: integer nullable
- `created_at`: timestamptz
- `updated_at`: timestamptz

### usage_events

- `id`: uuid
- `user_id`: uuid nullable
- `project_id`: uuid nullable
- `event_name`: text
- `category`: text nullable
- `platform`: text nullable
- `mood`: text nullable
- `tone`: text nullable
- `section_id`: text nullable
- `metadata`: jsonb
- `created_at`: timestamptz

### Storage bucket

- bucket: `detail-page-assets`
- path convention: `{user_id}/{project_id}/{file_name}`
- 저장 대상: 최적화된 업로드 이미지, 필요 시 export preview

### RLS Policy Direction

- `auth.uid() = user_id` 조건으로 프로젝트와 스타일 세트를 보호합니다.
- Storage path의 첫 segment가 `auth.uid()`와 일치할 때 접근을 허용합니다.
- MVP에서는 개인 계정 범위만 다루고 팀 공유는 제외합니다.
- 관리자 대시보드는 `profiles.role = 'admin'`인 계정만 접근할 수 있습니다.
- service role key는 클라이언트에 절대 노출하지 않습니다.
- 집계 조회는 서버 Route Handler 또는 Supabase RPC/view를 통해 제공합니다.
- 일반 사용자는 자신의 이벤트만 생성할 수 있고, 전체 이벤트 집계는 관리자만 조회할 수 있습니다.

## Development Roadmap

### Phase 1: Foundation

기간: 2026년 7월 8일 - 2026년 7월 9일

- 프로젝트 구조 정리
- 13개 섹션 타입 정의
- mock 상세페이지 데이터 작성
- Supabase 테이블 초안 정의
- Supabase Auth/RLS 정책 초안 정의
- 관리자 role 모델 정의
- 사용 이벤트 테이블 초안 정의
- 기본 레이아웃 구성
- 데스크톱 작업 화면 + 모바일 캔버스 구성

### Phase 2: Canvas and Editing

기간: 2026년 7월 10일 - 2026년 7월 11일

- 회원가입/로그인 기본 UI
- 13개 섹션 렌더링
- 무드 프리셋 적용
- 섹션 선택/편집 패널
- 문구 수정
- 섹션 숨김/복구
- dnd-kit 순서 변경

### Phase 3: Input and Image Handling

기간: 2026년 7월 12일 - 2026년 7월 13일

- 상품 입력 폼
- 선택형 UI
- 이미지 업로드
- 이미지 자동 최적화
- 샘플 상품 데이터
- Supabase 프로젝트 저장/불러오기
- Supabase 스타일 세트 저장/불러오기
- Supabase Storage 이미지 저장
- localStorage fallback
- 주요 사용자 이벤트 기록

### Phase 4: AI Generation

기간: 2026년 7월 14일 - 2026년 7월 15일

- Vercel AI SDK 설치 및 설정
- 13섹션 zod schema 작성
- AI 생성 API route
- fallback mock 처리
- 과장 표현/누락 섹션 검증
- AI 생성 결과 Supabase 저장
- AI 생성 이벤트 저장

### Phase 5: Export

기간: 2026년 7월 16일 - 2026년 7월 17일

- 플랫폼 가로폭 선택
- 전체 PNG 다운로드
- 2000px 슬라이싱
- ZIP 다운로드
- 파일명 자동 정리
- export 다운로드 이벤트 저장

### Phase 6: Polish and Demo

기간: 2026년 7월 18일 - 2026년 7월 19일

- 상세페이지 완성도 점수
- 스타일 세트 빠른 적용 polish
- 관리자 대시보드 1차 구현
- UI polish
- 반응형 점검
- 데모 시나리오 정리
- 발표용 샘플 생성
- 최종 버그 수정

## Risk Management

가장 큰 리스크:

- PNG 생성 품질
- 긴 상세페이지 슬라이싱
- ZIP 다운로드 안정성
- AI JSON 출력 안정성
- Supabase Storage 이미지 저장 지연
- Auth/RLS 설정 지연
- 관리자 권한 분기 실수
- 이벤트 수집 범위가 과하게 넓어지는 문제

대응:

- mock JSON 기반 기능을 먼저 완성합니다.
- AI 실패 시 fallback 데이터를 제공합니다.
- ZIP 다운로드가 늦어지면 전체 PNG 다운로드를 먼저 완성합니다.
- dnd-kit이 지연되면 위/아래 이동 버튼을 임시 대안으로 둡니다.
- Supabase Storage가 지연되면 텍스트/JSON 프로젝트 저장만 먼저 완성합니다.
- DB 저장이 지연되면 localStorage 자동 저장으로 데모 안정성을 확보합니다.
- Auth/RLS가 지연되면 단일 demo user seed로 먼저 캔버스/저장 플로우를 완성한 뒤 인증을 붙입니다.
- 관리자 대시보드가 지연되면 집계 카드 4개와 최근 프로젝트 메타데이터만 먼저 제공합니다.
- 이벤트 수집은 원문 저장이 아니라 최소 메타데이터 저장으로 제한합니다.

## Final Target

최종 데모는 다음 한 문장으로 설명 가능해야 합니다.

"회원별 스타일 세트를 저장해두고, 상품 정보와 이미지만 넣으면 AI가 상세페이지를 13개 섹션으로 자동 구성하며, 셀러가 블록형 캔버스에서 수정/저장한 뒤 플랫폼 업로드용 ZIP 이미지 패키지로 다운로드할 수 있고, 운영자는 관리자 대시보드에서 사용 패턴과 카테고리 흐름을 확인할 수 있습니다."
