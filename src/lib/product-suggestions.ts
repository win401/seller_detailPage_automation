import { DesignMood, EmphasisOption, Tone } from "./types";

/** One category bucket's suggested attributes — every field is what gets
 * offered/pre-applied when the bucket's `match` regex fires. */
interface ProductSuggestionBucket {
  match: RegExp;
  suggestedCategory: string;
  suggestedKeywords: string[];
  suggestedTargetCustomers: string[];
  suggestedTone: Tone;
  suggestedMood: DesignMood;
  suggestedEmphasisOptions: EmphasisOption[];
}

/**
 * Curated deterministic keyword-matching (same approach as
 * `selectTemplateFamily` in detail-page-templates.ts — no AI call, instant,
 * free) — "새 상세페이지 만들기" 폼 개편 (docs/TASKS.md). `mockEmphasisOptions`
 * (소재감/생활 무드/관리 편의/흡수력/선물용) is itself towel-shaped and makes no
 * sense for e.g. electronics or food, so each bucket carries its own full
 * emphasis-option set rather than picking a subset of one universal list.
 * Order matters — first match wins, so more specific buckets should sit
 * above broader ones.
 */
const SUGGESTION_BUCKETS: ProductSuggestionBucket[] = [
  {
    match: /(타올|수건|이불|베개|패브릭|리빙)/,
    suggestedCategory: "리빙/패브릭",
    suggestedKeywords: ["부드러운 촉감", "빠른 흡수", "고급 소재"],
    suggestedTargetCustomers: ["포근한 욕실/침구 무드를 원하는 1인 가구"],
    suggestedTone: "premium",
    suggestedMood: "natural",
    suggestedEmphasisOptions: [
      { key: "material", label: "소재감" },
      { key: "wash", label: "관리 편의" },
      { key: "absorb", label: "흡수력" },
      { key: "gift", label: "선물용" },
    ],
  },
  {
    match: /(스킨|로션|크림|세럼|뷰티|화장품|앰플|토너)/,
    suggestedCategory: "뷰티/스킨케어",
    suggestedKeywords: ["저자극", "보습", "산뜻한 사용감"],
    suggestedTargetCustomers: ["민감성 피부 고민이 있는 2030 여성"],
    suggestedTone: "trust",
    suggestedMood: "minimal",
    suggestedEmphasisOptions: [
      { key: "ingredient", label: "성분" },
      { key: "texture", label: "사용감" },
      { key: "sensitive", label: "저자극" },
      { key: "gift", label: "선물용" },
    ],
  },
  {
    match: /(케이스|충전기|이어폰|스마트|전자|액세서리|거치대|케이블)/,
    suggestedCategory: "전자기기/액세서리",
    suggestedKeywords: ["휴대성", "내구성", "호환성"],
    suggestedTargetCustomers: ["이동이 잦은 직장인/학생"],
    suggestedTone: "practical",
    suggestedMood: "minimal",
    suggestedEmphasisOptions: [
      { key: "durability", label: "내구성" },
      { key: "portability", label: "휴대성" },
      { key: "compat", label: "호환성" },
    ],
  },
  {
    match: /(간식|반찬|식품|과일|건강식|음료|차\b)/,
    suggestedCategory: "식품",
    suggestedKeywords: ["신선함", "당일 제조", "건강한 재료"],
    suggestedTargetCustomers: ["바쁜 일상 속 건강을 챙기고 싶은 고객"],
    suggestedTone: "warm",
    suggestedMood: "natural",
    suggestedEmphasisOptions: [
      { key: "fresh", label: "신선함" },
      { key: "healthy", label: "건강함" },
      { key: "convenience", label: "간편함" },
      { key: "gift", label: "선물용" },
    ],
  },
  {
    match: /(옷|의류|티셔츠|바지|원피스|자켓|니트)/,
    suggestedCategory: "의류",
    suggestedKeywords: ["편안한 착용감", "데일리룩", "체형 커버"],
    suggestedTargetCustomers: ["데일리로 편하게 입을 옷을 찾는 2030"],
    suggestedTone: "warm",
    suggestedMood: "natural",
    suggestedEmphasisOptions: [
      { key: "fit", label: "핏" },
      { key: "material", label: "소재감" },
      { key: "coordi", label: "코디 활용도" },
    ],
  },
  {
    match: /(반려|강아지|고양이|펫)/,
    suggestedCategory: "반려동물 용품",
    suggestedKeywords: ["안전한 소재", "튼튼함", "간편 세척"],
    suggestedTargetCustomers: ["반려동물 건강과 안전을 우선하는 보호자"],
    suggestedTone: "warm",
    suggestedMood: "natural",
    suggestedEmphasisOptions: [
      { key: "safety", label: "안전성" },
      { key: "durability", label: "내구성" },
      { key: "wash", label: "관리 편의" },
    ],
  },
  {
    match: /(유아|아기|신생아|아동)/,
    suggestedCategory: "유아용품",
    suggestedKeywords: ["안전 인증", "무독성 소재", "간편 세척"],
    suggestedTargetCustomers: ["신생아/영유아를 키우는 초보 부모"],
    suggestedTone: "trust",
    suggestedMood: "natural",
    suggestedEmphasisOptions: [
      { key: "safety", label: "안전 인증" },
      { key: "material", label: "무독성 소재" },
      { key: "wash", label: "관리 편의" },
    ],
  },
  {
    match: /(운동|헬스|요가|스포츠|캠핑|등산|레저)/,
    suggestedCategory: "스포츠/레저",
    suggestedKeywords: ["가벼운 무게", "활동성", "내구성"],
    suggestedTargetCustomers: ["주말마다 야외 활동을 즐기는 2030"],
    suggestedTone: "practical",
    suggestedMood: "colorful",
    suggestedEmphasisOptions: [
      { key: "durability", label: "내구성" },
      { key: "portability", label: "휴대성" },
      { key: "activity", label: "활동성" },
    ],
  },
  {
    match: /(가구|인테리어|조명|소파|책상|수납)/,
    suggestedCategory: "가구/인테리어",
    suggestedKeywords: ["공간 활용", "조립 간편", "인테리어 소품"],
    suggestedTargetCustomers: ["자취방/원룸을 꾸미는 1인 가구"],
    suggestedTone: "premium",
    suggestedMood: "minimal",
    suggestedEmphasisOptions: [
      { key: "space", label: "공간 활용" },
      { key: "assembly", label: "조립 간편" },
      { key: "design", label: "인테리어 소품" },
    ],
  },
  {
    match: /(문구|다이어리|노트|필기|오피스|사무)/,
    suggestedCategory: "문구/오피스",
    suggestedKeywords: ["실용성", "휴대성", "감성 디자인"],
    suggestedTargetCustomers: ["다이어리/기록을 즐기는 2030"],
    suggestedTone: "practical",
    suggestedMood: "minimal",
    suggestedEmphasisOptions: [
      { key: "design", label: "디자인" },
      { key: "portability", label: "휴대성" },
      { key: "gift", label: "선물용" },
    ],
  },
  {
    match: /(영양제|건강기능식품|프로틴|유산균|비타민)/,
    suggestedCategory: "건강기능식품",
    suggestedKeywords: ["임상 성분", "섭취 편의", "인증"],
    suggestedTargetCustomers: ["건강 관리를 시작하는 3040"],
    suggestedTone: "trust",
    suggestedMood: "minimal",
    suggestedEmphasisOptions: [
      { key: "ingredient", label: "성분" },
      { key: "certification", label: "인증" },
      { key: "convenience", label: "섭취 편의" },
    ],
  },
];

const FALLBACK_EMPHASIS_OPTIONS: EmphasisOption[] = [
  { key: "material", label: "소재감" },
  { key: "design", label: "디자인" },
  { key: "convenience", label: "사용 편의" },
  { key: "gift", label: "선물용" },
];

export interface ProductSuggestions {
  /** False until productName/category/keywords actually match a curated
   * bucket — callers use this to tell "a real product-aware suggestion
   * fired" apart from "nothing typed yet, this is just the neutral fallback
   * option list to render" (matters for emphasis, whose option list is never
   * empty even with no match). */
  hasMatch: boolean;
  suggestedCategory?: string;
  suggestedKeywords: string[];
  suggestedTargetCustomers: string[];
  suggestedTone?: Tone;
  suggestedMood?: DesignMood;
  suggestedEmphasisOptions: EmphasisOption[];
}

/**
 * Pure function, no network/AI call — mirrors `selectTemplateFamily`
 * (detail-page-templates.ts) exactly: lowercase-join the free-text fields the
 * seller already typed, regex-match against curated category buckets, first
 * match wins. No match falls back to a neutral emphasis-option set and no
 * category/tone/mood/keyword suggestion (never throws, never blocks the form).
 */
export function suggestProductAttributes(
  productName: string,
  category: string,
  keywords: string[]
): ProductSuggestions {
  const text = `${productName} ${category} ${keywords.join(" ")}`.toLowerCase();
  const bucket = SUGGESTION_BUCKETS.find((b) => b.match.test(text));

  if (!bucket) {
    return {
      hasMatch: false,
      suggestedKeywords: [],
      suggestedTargetCustomers: [],
      suggestedEmphasisOptions: FALLBACK_EMPHASIS_OPTIONS,
    };
  }

  return {
    hasMatch: true,
    suggestedCategory: bucket.suggestedCategory,
    suggestedKeywords: bucket.suggestedKeywords,
    suggestedTargetCustomers: bucket.suggestedTargetCustomers,
    suggestedTone: bucket.suggestedTone,
    suggestedMood: bucket.suggestedMood,
    suggestedEmphasisOptions: bucket.suggestedEmphasisOptions,
  };
}
