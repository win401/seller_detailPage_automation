# Reference Detail Page Analysis

## 1. 기준 레퍼런스

- 파일:
  - `/Users/sungwoo/Downloads/7.10/untitled-07-10-2026_04_04_PM_part1.png`
  - `/Users/sungwoo/Downloads/7.10/untitled-07-10-2026_04_04_PM_part2.png`
- 상품 유형: 기능성 신발 깔창/인솔
- 선정 이유:
  - 실제 셀러/기획자가 좋다고 판단한 상세페이지 흐름이다.
  - 이미지 생성 API 없이도 사용자가 직접 넣은 상품 이미지, 사용 장면 이미지, 디테일 컷으로 충분히 구성 가능하다.
  - 문제 제기, 소재/구조 설명, 사용법, 비교, 제품정보, Q&A까지 구매 전환에 필요한 블록이 대부분 들어 있다.

## 1-1. 추가 raw data 레퍼런스

아래 세 상품을 추가 raw data로 확보했다. 모두 사용자가 이미지를 직접 넣는 MVP 경로와 잘 맞으며, 생활용품 상세페이지에서 반복되는 실전 블록을 뽑기 좋다.

| 상품 | 파일 | 주요 특징 | 추출 가치 |
| --- | --- | --- | --- |
| 뱀부 대형 타올 | `뱀부_대형타올_part1.png`, `뱀부_대형타올_part2.png` | 감성 히어로, 브랜드 무드, 컬러 옵션, 소재/흡수력, 세탁 가이드 | 프리미엄 리빙/패브릭형 템플릿 |
| 오가닉코튼 경추베개 | `오가닉코튼_경추베개_part1.png` ~ `part3.png` | 문제 해결, 인증/수상, 구조 설명, Q&A, 교환/반품 안내 | 헬스케어성 생활용품/전문성 강조 템플릿 |
| 파쉬 물주머니 | `파쉬_물주머니_part1.png`, `파쉬_물주머니_part2.png` | 혜택/원산지 배지, 사용 장면, 옵션 그리드, 체크포인트, 상세정보 | 옵션 많은 생활용품/구매 가이드형 템플릿 |

## 2. 전체 상세페이지 흐름

이 레퍼런스는 하나의 긴 이미지를 예쁘게 꾸미는 방식이 아니라, 구매 설득 흐름에 맞춰 여러 섹션 블록을 쌓는 구조다.

1. 배송/혜택/상단 안내
2. 제품 핵심 문제 제기
3. 대표 장점 한 줄 후킹
4. 소재/촉감/구조 설명
5. 사용 전후 또는 상황 비교
6. 핵심 기능 강조
7. 신뢰/검증 자료 또는 설명 이미지
8. 착용감/효과 설명
9. 컬러/옵션 안내
10. 반복 기능 설명
11. 제품 사용 방법
12. 고객 반응/비교표
13. 제품 정보
14. Q&A / 자주 묻는 질문

추가 raw data까지 반영하면 생활용품 상세페이지의 공통 흐름은 아래처럼 정리할 수 있다.

1. 상단 혜택/배송/원산지/브랜드 신뢰 배지
2. 감성 또는 문제 제기 히어로
3. 핵심 셀링포인트 한 줄
4. 사용 상황 공감 또는 페인포인트
5. 소재/구조/성분/기능 원리 설명
6. 대표 사용 장면 이미지
7. 상세 기능 반복 설명
8. 옵션/컬러/구성품 안내
9. 비교표 또는 체크포인트
10. 관리/세탁/사용 방법
11. 상품 정보/스펙 표
12. Q&A
13. 배송/교환/반품 안내

## 3. 추출할 블록 타입

| 블록 타입 | 역할 | 주요 슬롯 |
| --- | --- | --- |
| `top_notice_banner` | 배송/혜택/구성 안내 | `badges`, `headline`, `items` |
| `problem_hook` | 사용자의 불편을 짚는 문제 제기 | `eyebrow`, `headline`, `body`, `image` |
| `big_claim_band` | 가장 강한 셀링포인트를 한 화면에 강조 | `headline`, `subHeadline`, `backgroundColor`, `image` |
| `material_closeup` | 소재/촉감/구조를 클로즈업 이미지로 설명 | `headline`, `body`, `image`, `badges` |
| `before_after_compare` | 사용 전후/일반 제품과의 차이 비교 | `beforeImage`, `afterImage`, `beforeLabel`, `afterLabel`, `headline` |
| `feature_blue_panel` | 파란 배경의 강한 기능 강조 섹션 | `headline`, `body`, `image`, `bullets` |
| `evidence_card` | 자료/실험/구조 설명처럼 신뢰를 보강 | `headline`, `body`, `image`, `caption` |
| `option_grid` | 색상/타입/구성 옵션 안내 | `optionItems`, `headline`, `body` |
| `step_guide` | 제품 사용법/관리법을 단계별 설명 | `steps`, `images`, `headline` |
| `comparison_table` | 경쟁/기존 제품 대비 장점 비교 | `rows`, `highlightColumn`, `headline` |
| `review_summary` | 만족도/후기/사용자 반응 요약 | `headline`, `body`, `reviewItems`, `score` |
| `product_info_table` | 상세정보/스펙/고시 정보 | `specRows`, `headline`, `subHeadline` |
| `qa_list` | 구매 전 자주 묻는 질문 | `faqItems`, `headline` |
| `brand_mood_story` | 브랜드 감성/세계관/생활 장면 제안 | `brandName`, `headline`, `body`, `image`, `palette` |
| `color_lineup` | 컬러/옵션을 감성 이미지와 함께 소개 | `headline`, `optionItems`, `image`, `swatches` |
| `care_guide` | 세탁/관리/사용 주의사항 | `headline`, `guideItems`, `icons`, `image` |
| `certification_stack` | 인증/수상/판매량/리뷰 수 등 신뢰 자료 | `headline`, `proofItems`, `image`, `caption` |
| `check_point_cards` | 구매 전 확인할 장점/주의점을 카드형으로 정리 | `headline`, `cards`, `image` |
| `policy_notice` | 배송/교환/반품/AS 안내 | `headline`, `noticeItems`, `emphasis` |

## 3-1. 상품군별 템플릿 후보

### 기능성 생활용품/잡화형

- 기준: 기능성 깔창, 물주머니
- 강점: 문제 제기, 기능 설명, 사용법, 옵션, 제품 정보
- 블록 흐름:
  - `top_notice_banner`
  - `problem_hook`
  - `big_claim_band`
  - `before_after_compare`
  - `feature_blue_panel`
  - `step_guide`
  - `option_grid`
  - `product_info_table`
  - `qa_list`

### 프리미엄 리빙/패브릭형

- 기준: 뱀부 대형 타올
- 강점: 감성 히어로, 소재 신뢰, 컬러 라인업, 사용 장면, 세탁 가이드
- 블록 흐름:
  - `brand_mood_story`
  - `big_claim_band`
  - `material_closeup`
  - `color_lineup`
  - `feature_blue_panel`
  - `care_guide`
  - `product_info_table`
  - `policy_notice`

### 헬스케어성 생활용품/전문성형

- 기준: 오가닉코튼 경추베개
- 강점: 문제 해결, 인증/수상, 구조 설명, Q&A, 교환/반품 안내
- 블록 흐름:
  - `problem_hook`
  - `certification_stack`
  - `material_closeup`
  - `evidence_card`
  - `before_after_compare`
  - `check_point_cards`
  - `qa_list`
  - `policy_notice`

## 4. MVP 구현 원칙

- Nano Banana/Gemini 이미지 생성은 현재 MVP 필수 경로에서 제외한다.
- 이미지는 사용자가 직접 업로드하거나, 레퍼런스/상품 이미지 슬롯에 직접 배치한다.
- AI는 이미지를 생성하지 않고 아래 역할에 집중한다.
  - 적절한 `layoutType` 선택
  - 섹션별 카피 생성
  - 이미지가 들어갈 역할 설명
  - 제품 정보 표/FAQ/비교표의 텍스트 슬롯 채우기
- mock/test 상태에서도 위 블록들이 실제 상세페이지처럼 보여야 한다.

## 5. 1차 템플릿 후보

기능성 생활용품/잡화형 템플릿으로 먼저 구현한다.

```ts
const functionalGoodsTemplate = [
  "top_notice_banner",
  "problem_hook",
  "big_claim_band",
  "material_closeup",
  "before_after_compare",
  "feature_blue_panel",
  "evidence_card",
  "feature_blue_panel",
  "step_guide",
  "comparison_table",
  "option_grid",
  "product_info_table",
  "qa_list",
];
```

## 6. 기존 13섹션과의 매핑

| 기존 섹션 | 신규 블록 후보 |
| --- | --- |
| `intro` | `top_notice_banner`, `problem_hook` |
| `one_line` | `big_claim_band` |
| `problem` | `problem_hook`, `before_after_compare` |
| `solution` | `feature_blue_panel` |
| `benefit_1` | `material_closeup` |
| `benefit_2` | `feature_blue_panel` |
| `benefit_3` | `evidence_card` |
| `detail` | `product_info_table` |
| `use_scene` | `step_guide`, `before_after_compare` |
| `recommended_for` | `review_summary`, `comparison_table` |
| `trust` | `evidence_card`, `review_summary` |
| `faq` | `qa_list` |
| `cta` | `big_claim_band` 또는 `review_summary` |

## 7. 다음 구현 작업

- [ ] 위 레퍼런스를 기준으로 mock/test 상세페이지 데이터를 작성한다.
- [ ] `layoutType`별 블록 컴포넌트 파일 구조를 정한다.
- [ ] 기존 `SectionCanvas`가 `layoutType`을 우선해 렌더링하도록 리팩터링한다.
- [ ] 직접 업로드한 이미지를 각 블록의 이미지 슬롯에 연결한다.
- [ ] 제품 정보 표, 비교표, Q&A는 텍스트 데이터만으로 먼저 완성한다.
