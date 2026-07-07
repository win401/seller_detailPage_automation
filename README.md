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

1. 셀러가 상품명, 가격, 카테고리, 핵심 특징, 타깃 고객을 입력합니다.
2. 상품 사진을 업로드합니다.
3. AI가 상세페이지 구조와 판매 문구를 생성합니다.
4. Claude Design 또는 디자인 생성 도구로 상세페이지 시안을 만듭니다.
5. 사용자가 미리보기에서 문구와 섹션을 수정합니다.
6. PNG, HTML, 복사용 텍스트 등으로 결과물을 내보냅니다.

## MVP Scope

- 상품 정보 입력 폼
- 상품 이미지 업로드
- AI 상세페이지 문구 생성
- 상세페이지 섹션 자동 구성
- 디자인 템플릿 기반 미리보기
- 텍스트 수정 기능
- 상세페이지 이미지 다운로드

## Suggested Stack

- Frontend: Next.js, TypeScript
- UI: Tailwind CSS, shadcn/ui
- AI Text: Claude API or OpenAI API
- AI Design: Claude Design workflow
- Storage: local state first, SQLite or Supabase later
- Export: html-to-image or Playwright

## Presentation Message

> 초보 셀러에게 상세페이지 제작은 판매보다 먼저 만나는 큰 장벽입니다. 이 서비스는 상품 정보와 사진만 입력하면 AI가 판매 문구, 구성, 디자인 초안까지 자동으로 만들어주는 상세페이지 제작 자동화 툴입니다.

