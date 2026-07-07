# MVP Plan

## 목표

상품 정보와 이미지를 입력하면 AI가 상세페이지 초안을 생성하고, 사용자는 데스크톱 화면에서 모바일 상세페이지 캔버스를 보며 문구와 섹션 순서를 수정한 뒤, 플랫폼 업로드용 이미지 ZIP을 다운로드할 수 있습니다.

이 프로젝트는 수업 미니 프로젝트로 진행하며, 현재 구현 범위 안에서 완성도 있는 결과물을 만드는 데 집중합니다.

## 핵심 사용자

- 쿠팡, 네이버 스마트스토어, 에이블리, 지그재그 등에 상품을 등록하는 셀러
- 상세페이지 문구와 구성을 직접 만들기 어려운 초보 셀러
- 디자인 툴 없이 빠르게 상세페이지 초안을 만들고 싶은 사용자

## 핵심 플로우

1. 사용자가 로그인합니다.
2. 새 상세페이지 프로젝트를 생성합니다.
3. 상품명, 카테고리, 키워드, 타깃 고객, 강조 포인트를 입력합니다.
4. 상품 이미지를 업로드합니다.
5. 톤앤매너, 디자인 무드, 플랫폼 규격을 선택합니다.
6. AI가 13개 섹션 상세페이지 초안을 생성합니다.
7. 사용자가 모바일 캔버스에서 상세페이지를 확인합니다.
8. 사용자가 섹션 문구, 이미지, 순서, 숨김 여부를 수정합니다.
9. 작업물을 저장합니다.
10. 플랫폼 규격에 맞춰 이미지를 슬라이싱하고 ZIP으로 다운로드합니다.

## Must Have

### 1. 인증

- 이메일/비밀번호 회원가입
- 이메일/비밀번호 로그인
- 로그아웃
- 로그인한 사용자 기준 프로젝트 조회

### 2. 프로젝트 대시보드

- 저장된 상세페이지 프로젝트 목록
- 새 프로젝트 만들기
- 프로젝트명, 카테고리, 플랫폼, 수정일 표시
- 프로젝트 다시 열기

### 3. 상품 정보 입력

- 상품명
- 카테고리
- 핵심 키워드
- 타깃 고객
- 강조 포인트 체크박스
- 톤앤매너 선택
- 디자인 무드 선택
- 플랫폼 선택

입력 UI는 텍스트 입력만 사용하지 않고, 선택형 UI를 적극적으로 사용합니다.

### 4. 이미지 업로드 및 최적화

- 상품 이미지 업로드
- 업로드 이미지 최대 가로폭 1200px로 리사이즈
- WebP 우선, 필요 시 JPEG 사용
- 품질 0.85 기준 압축
- 최적화 전/후 용량 표시
- 최적화 완료 상태 표시

### 5. AI 상세페이지 생성

- Vercel AI SDK 사용
- 13개 섹션 JSON 생성
- zod schema 기반 출력 검증
- 낮은 temperature 설정
- 상품 정보에 없는 효능, 인증, 수치 생성 금지
- 누락 섹션 fallback 처리

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

### 6. 모바일 상세페이지 캔버스

- 사용자는 PC/노트북에서 작업합니다.
- 결과물은 모바일 상세페이지 형태의 세로형 캔버스로 보여줍니다.
- 캔버스는 실제 export 결과와 최대한 유사하게 표시합니다.
- 화면 미리보기용 크기와 export용 실제 크기를 구분합니다.

### 7. 블록형 편집기

- 섹션 문구 수정
- 섹션 이미지 교체
- 섹션 숨김/복구
- 섹션 순서 변경
- 추천 카피 후보 선택
- 특정 섹션 다시 생성

제공하지 않는 기능:

- 피그마식 자유 좌표 배치
- 임의 텍스트 박스 생성
- 레이어 패널
- 이미지 세밀 리사이즈
- 자유 드로잉 도구

### 8. 스타일 세트

- 사용자별 스타일 세트 저장
- 기본 디자인 무드
- 기본 톤앤매너
- 대표 색상
- 보조 색상
- 기본 플랫폼
- 섹션 표시/숨김 기본값
- 브랜드 메모

### 9. 프로젝트 저장

- Supabase Auth 사용
- Supabase Database 사용
- 사용자별 프로젝트 저장
- 사용자별 스타일 세트 저장
- RLS로 사용자별 데이터 접근 제한
- Supabase Storage에 최적화된 이미지 저장

### 10. 이미지 ZIP 다운로드

- 플랫폼별 출력 가로폭 적용
- 전체 상세페이지 이미지 생성
- 2000px 단위 세로 슬라이싱
- `01.png`, `02.png`, `03.png` 파일명 자동 정리
- ZIP 다운로드

우선 플랫폼:

- 에이블리: 860px
- 지그재그: 1000px
- 스마트스토어
- 쿠팡

### 11. 관리자 화면

- 관리자 계정만 접근
- 전체 사용자 수
- 전체 프로젝트 수
- AI 생성 횟수
- ZIP 다운로드 횟수
- 최근 프로젝트 메타데이터

관리자 화면은 프로젝트 시연과 기본 운영 확인을 위한 범위로 제한합니다.

## Should Have

- 상세페이지 완성도 체크리스트
- 섹션별 다시 생성
- 전체 PNG 다운로드
- 프로젝트 복제
- 미리보기 확대/축소
- localStorage 임시 저장
- Supabase 저장 실패 시 localStorage fallback

## Won't Have

이번 버전에서는 구현하지 않습니다.

- 쇼핑몰 직접 업로드
- 결제
- 팀/조직 협업
- Pinterest API 실시간 연동
- AI 누끼 제거
- 이미지 합성
- 피그마식 자유 편집
- 대량 상품 일괄 생성
- Electron/Tauri 데스크톱 앱
- 외부 커머스 데이터 크롤링

## 기술 스택

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- dnd-kit

### AI

- Vercel AI SDK
- zod
- mock fallback data

### Data

- Supabase Auth
- Supabase Database
- Supabase Storage
- Supabase RLS
- localStorage fallback

### Export

- Canvas 또는 DOM capture
- JSZip
- 클라이언트 이미지 리사이즈/압축

## 데이터 모델 초안

### profiles

- `id`
- `email`
- `display_name`
- `role`
- `created_at`

### style_sets

- `id`
- `user_id`
- `name`
- `default_mood`
- `default_tone`
- `primary_color`
- `secondary_color`
- `default_platform`
- `section_visibility`
- `brand_note`
- `created_at`
- `updated_at`

### detail_page_projects

- `id`
- `user_id`
- `style_set_id`
- `title`
- `product_input`
- `selected_platform`
- `selected_mood`
- `selected_tone`
- `sections`
- `section_order`
- `hidden_section_ids`
- `asset_paths`
- `created_at`
- `updated_at`

### usage_events

- `id`
- `user_id`
- `project_id`
- `event_name`
- `metadata`
- `created_at`

## 개발 순서

### Phase 1. 기본 구조

- 프로젝트 구조 정리
- 타입 정의
- mock data 작성
- 기본 레이아웃 구성
- 로그인/대시보드 화면 구성

### Phase 2. 생성 플로우

- 상품 입력 폼
- 이미지 업로드/최적화
- AI 생성 API
- 13개 섹션 JSON 검증
- 생성 결과 캔버스 표시

### Phase 3. 편집기

- 모바일 캔버스
- 섹션 선택
- 문구 수정
- 섹션 숨김/복구
- 섹션 순서 변경
- 스타일 세트 적용

### Phase 4. 저장

- Supabase Auth 연결
- 프로젝트 저장/불러오기
- 스타일 세트 저장/불러오기
- 이미지 Storage 저장
- RLS 정책 적용

### Phase 5. Export

- 플랫폼 가로폭 선택
- 상세페이지 이미지 생성
- 2000px 슬라이싱
- ZIP 다운로드
- 다운로드 상태 표시

### Phase 6. 마무리

- 관리자 화면
- 완성도 체크리스트
- 샘플 데이터
- 오류 상태 처리
- UI polish
- 발표 시나리오 정리

## 완료 기준

- 사용자가 로그인할 수 있습니다.
- 상품 정보를 입력하고 이미지를 업로드할 수 있습니다.
- AI가 13개 섹션 상세페이지 초안을 생성합니다.
- 사용자가 캔버스에서 문구와 섹션 순서를 수정할 수 있습니다.
- 작업물을 저장하고 다시 열 수 있습니다.
- 플랫폼 업로드용 ZIP 이미지를 다운로드할 수 있습니다.
