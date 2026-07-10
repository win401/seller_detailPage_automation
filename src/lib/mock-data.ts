import {
  DesignMood,
  DetailSection,
  EmphasisOption,
  ProductInput,
  SECTION_KIND_LABELS,
  SectionImageAsset,
  SectionKind,
  StyleSet,
} from "./types";

/**
 * Mock data used for local-first development (docs/TASKS.md §0 thin
 * end-to-end flow). Content is reused from the Claude Design handoff
 * prototype (docs/design/handoff) so the mock UI matches what was designed.
 */

export const mockEmphasisOptions: EmphasisOption[] = [
  { key: "warmth", label: "보온보냉력" },
  { key: "design", label: "디자인" },
  { key: "wash", label: "세척편의" },
  { key: "price", label: "가성비" },
  { key: "gift", label: "선물용" },
];

export const mockProductInput: ProductInput = {
  productName: "온도 유지 프리미엄 텀블러",
  category: "생활/주방용품",
  price: "29,900원",
  keywords: ["보온보냉", "슬림디자인", "컵홀더호환", "분리세척"],
  targetCustomer: "출근길 커피를 자주 마시는 직장인, 텀블러를 매일 들고 다니는 대학생",
  emphasisPoints: ["warmth", "design"],
  tone: "practical",
  designMood: "minimal",
  platform: "smartstore",
  additionalInstruction: "",
};

/**
 * Mood-specific gradient palettes for the 5 mock reference "roles" below.
 * Same composition/shape per role across moods, only the color stops change,
 * so a generated draft's imagery actually reflects the user's selected
 * design mood (docs/TASKS.md §7 "무드 프리셋 적용") instead of always using
 * the same warm-neutral palette.
 */
const MOOD_GRADIENTS: Record<
  DesignMood,
  { desk: string; macro: string; commute: string; parts: string; badge: string }
> = {
  minimal: {
    desk: "linear-gradient(135deg, #f6efe4 0%, #d9b99a 48%, #7d6a58 100%)",
    macro: "radial-gradient(circle at 30% 25%, #f4f2ed 0%, #b9b7ad 38%, #3f443d 100%)",
    commute: "linear-gradient(145deg, #e9eef0 0%, #9ca9a3 45%, #2f3a36 100%)",
    parts: "linear-gradient(135deg, #fafafa 0%, #dcd8cf 50%, #8f8b82 100%)",
    badge: "linear-gradient(135deg, #fbfaf7 0%, #d8c8ae 46%, #5b4637 100%)",
  },
  natural: {
    desk: "linear-gradient(135deg, #f1f0e4 0%, #b9c9a0 48%, #5c6b4a 100%)",
    macro: "radial-gradient(circle at 30% 25%, #f0f2e8 0%, #a9b98f 38%, #3c4530 100%)",
    commute: "linear-gradient(145deg, #eaf0e6 0%, #93a879 45%, #38452e 100%)",
    parts: "linear-gradient(135deg, #f7f8f0 0%, #cbd6b4 50%, #7c8a63 100%)",
    badge: "linear-gradient(135deg, #f5f6ec 0%, #c2cf9e 46%, #4c5a3a 100%)",
  },
  premium: {
    desk: "linear-gradient(135deg, #2b2823 0%, #5b4a33 48%, #0f0d0a 100%)",
    macro: "radial-gradient(circle at 30% 25%, #3a352c 0%, #7a5f36 38%, #100e0a 100%)",
    commute: "linear-gradient(145deg, #262421 0%, #6b5738 45%, #0c0b09 100%)",
    parts: "linear-gradient(135deg, #302c26 0%, #8a7350 50%, #14120e 100%)",
    badge: "linear-gradient(135deg, #201d19 0%, #b08d4f 46%, #0a0908 100%)",
  },
  colorful: {
    desk: "linear-gradient(135deg, #fff1e6 0%, #ff9d6c 48%, #d94f70 100%)",
    macro: "radial-gradient(circle at 30% 25%, #fff7e0 0%, #ffc857 38%, #ef5da8 100%)",
    commute: "linear-gradient(145deg, #e6f7ff 0%, #4fc3d9 45%, #2c5fa8 100%)",
    parts: "linear-gradient(135deg, #f4fff0 0%, #8fe388 50%, #1f9e6d 100%)",
    badge: "linear-gradient(135deg, #fff0f6 0%, #ff7ab8 46%, #a83279 100%)",
  },
};

function buildSectionImageReferences(mood: DesignMood): SectionImageAsset[] {
  const g = MOOD_GRADIENTS[mood] ?? MOOD_GRADIENTS.minimal;
  return [
    {
      id: "ref-desk",
      label: "데스크 연출 컷",
      description: "자연광이 들어오는 책상 위 여백 중심 컷",
      source: "reference",
      gradient: g.desk,
      promptHint: `${mood} mood, desk composition, soft natural light, generous whitespace`,
      tags: ["intro", "one_line", "product-hero-lifestyle", "product-flatlay"],
    },
    {
      id: "ref-soft-macro",
      label: "소재 클로즈업",
      description: "질감과 디테일을 강조하는 접사 컷",
      source: "reference",
      gradient: g.macro,
      promptHint: `${mood} mood, macro product detail, texture, shallow depth of field, clean lighting`,
      tags: ["benefit_1", "detail", "product-detail-macro", "product-detail-texture"],
    },
    {
      id: "ref-commute-scene",
      label: "실사용 장면",
      description: "가방, 노트북, 이동 동선이 보이는 실사용 라이프스타일 컷",
      source: "reference",
      gradient: g.commute,
      promptHint: `${mood} mood, everyday lifestyle scene, product in use, calm urban setting`,
      tags: ["problem", "use_scene", "recommended_for", "problem-context-commute", "lifestyle-multi-scene"],
    },
    {
      id: "ref-clean-parts",
      label: "구성품 정렬",
      description: "구성품을 깔끔하게 분리해 구조를 보여주는 컷",
      source: "reference",
      gradient: g.parts,
      promptHint: `${mood} mood, disassembled product parts, clean top-down layout, precise shadows`,
      tags: ["benefit_3", "solution", "product-disassembled", "product-cross-section"],
    },
    {
      id: "ref-premium-badge",
      label: "신뢰 포인트",
      description: "인증, 보증, 소재 정보를 차분하게 보여주는 그래픽형 컷",
      source: "reference",
      gradient: g.badge,
      promptHint: `${mood} mood, trust point layout, subtle badge area, no fake certification`,
      tags: ["trust", "faq", "cta", "certification-badge"],
    },
  ];
}

export const mockSectionImageReferences: SectionImageAsset[] = buildSectionImageReferences("minimal");

/**
 * Picks a single default reference image for a freshly generated section, by
 * kind or imageRole tag (same matching rule as getMockReferencesForSection
 * below, kept in sync so both pick from the same result set). Used so new
 * drafts don't start with every section blank — a real detail page is
 * dominated by imagery, not just copy.
 */
function pickDefaultImageAsset(kind: SectionKind, imageRole: string): SectionImageAsset {
  const matched = mockSectionImageReferences.filter((ref) =>
    ref.tags.some((tag) => tag === kind || tag === imageRole)
  );
  return matched[0] ?? mockSectionImageReferences[0];
}

interface SectionSeed {
  kind: SectionKind;
  kicker: string;
  headline: string;
  body: string;
  bullets?: string[];
  imageRole: string;
  alternatives?: string[];
}

const sectionSeeds: SectionSeed[] = [
  {
    kind: "intro",
    kicker: "INTRO",
    headline: "아침을 여는 온도",
    body: "무광 스테인리스 텀블러, 책상 위 커피와 함께하는 아침 루틴.",
    imageRole: "product-hero-lifestyle",
  },
  {
    kind: "one_line",
    kicker: "ONE LINE",
    headline: "아침 커피의 온도를 오래 지키는 데일리 텀블러",
    body: "매일 쓰는 물건이라 온도 유지력부터 확인했습니다.",
    imageRole: "product-flatlay",
    alternatives: [
      "출근길 커피를 더 편하게 챙기는 데일리 텀블러",
      "매일 들고 다니기 좋은 차분한 데일리 텀블러",
    ],
  },
  {
    kind: "problem",
    kicker: "PROBLEM",
    headline: "벌써 식어버린 커피",
    body: "출근길에 급하게 내린 커피, 자리에 앉을 때쯤이면 벌써 미지근해집니다.",
    imageRole: "problem-context-commute",
  },
  {
    kind: "solution",
    kicker: "SOLUTION",
    headline: "이중 진공 구조",
    body: "이중 진공 구조로 음료 온도를 더 안정적으로 즐길 수 있게 설계했습니다.",
    imageRole: "product-cross-section",
  },
  {
    kind: "benefit_1",
    kicker: "BENEFIT 01",
    headline: "보온·보냉 지속력",
    body: "따뜻한 음료와 차가운 음료를 더 편하게 들고 다닐 수 있는 구조입니다.",
    bullets: ["일상 이동에 어울리는 온도 유지 구조", "계절에 맞춰 쓰기 좋은 보온·보냉 활용"],
    imageRole: "product-detail-macro",
  },
  {
    kind: "benefit_2",
    kicker: "BENEFIT 02",
    headline: "슬림 바디 & 컵홀더 호환",
    body: "휴대하기 좋은 슬림한 인상으로 일상 이동에 자연스럽게 어울립니다.",
    bullets: ["손에 잡기 편한 바디감", "가방 속에 넣기 좋은 데일리 사용감"],
    imageRole: "product-in-context-bag",
  },
  {
    kind: "benefit_3",
    kicker: "BENEFIT 03",
    headline: "분리 세척 가능한 뚜껑",
    body: "사용 후 관리가 편하도록 뚜껑과 입구 주변을 확인하기 쉽게 보여줍니다.",
    bullets: ["세척 포인트를 한눈에 확인", "매일 쓰는 제품에 필요한 관리 편의성"],
    imageRole: "product-disassembled",
  },
  {
    kind: "detail",
    kicker: "DETAIL",
    headline: "손끝까지 신경 쓴 마감",
    body: "차분한 질감과 바디 라인을 가까이 보여주어 제품의 인상을 명확하게 전달합니다.",
    imageRole: "product-detail-texture",
  },
  {
    kind: "use_scene",
    kicker: "USE SCENE",
    headline: "어디서든 자연스럽게",
    body: "출근길 지하철, 카페 테이크아웃, 차량 이동까지 — 어디서든 자연스럽게.",
    imageRole: "lifestyle-multi-scene",
  },
  {
    kind: "recommended_for",
    kicker: "FOR YOU",
    headline: "이런 분께 추천해요",
    body: "출근길 커피를 챙기는 직장인, 도서관에서 오래 머무는 학생에게 추천합니다.",
    bullets: ["매일 커피를 내려 마시는 직장인", "장시간 카페·도서관에 머무는 학생"],
    imageRole: "persona-illustration",
  },
  {
    kind: "trust",
    kicker: "TRUST",
    headline: "안심하고 쓰는 이유",
    body: "매일 손이 닿는 제품이라 마감, 세척, 사용 편의성을 차분히 확인할 수 있게 정리했습니다.",
    imageRole: "certification-badge",
  },
  {
    kind: "faq",
    kicker: "FAQ",
    headline: "자주 묻는 질문",
    body: "Q. 차량 컵홀더에 들어가나요? A. 구매 전 제품 사이즈와 사용하는 컵홀더 규격을 함께 확인해 주세요.",
    imageRole: "none",
  },
  {
    kind: "cta",
    kicker: "CTA",
    headline: "지금 바로 시작해보세요",
    body: "매일 마시는 음료를 더 오래, 더 편하게 즐겨보세요.",
    imageRole: "product-hero-lifestyle",
    alternatives: ["오늘부터 온도 걱정 없이", "매일의 온도를 지켜드릴게요"],
  },
];

export const mockSections: DetailSection[] = sectionSeeds.map((seed, i) => {
  const defaultImage = seed.imageRole === "none" ? null : pickDefaultImageAsset(seed.kind, seed.imageRole);
  return {
    id: `s${i + 1}`,
    kind: seed.kind,
    kicker: seed.kicker,
    title: SECTION_KIND_LABELS[seed.kind],
    headline: seed.headline,
    body: seed.body,
    bullets: seed.bullets ?? [],
    imageRole: seed.imageRole,
    alternatives: seed.alternatives ?? [],
    ...(defaultImage && {
      imageGradient: defaultImage.gradient,
      imageLabel: defaultImage.label,
      imageSource: defaultImage.source,
    }),
  };
});

export const mockStyleSets: StyleSet[] = [
  {
    id: "ss1",
    userId: "demo-user",
    name: "테라코타 & 크림 기본",
    defaultMood: "minimal",
    defaultTone: "practical",
    primaryColor: "#cc785c",
    secondaryColor: "#221c14",
    defaultPlatform: "smartstore",
    sectionVisibility: {},
    brandNote: "텀블러·주방용품 라인에 사용하는 기본 세트",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "ss2",
    userId: "demo-user",
    name: "프리미엄 우드톤",
    defaultMood: "premium",
    defaultTone: "trust",
    primaryColor: "#3d3833",
    secondaryColor: "#b8845a",
    defaultPlatform: "coupang",
    sectionVisibility: { use_scene: false, faq: false },
    brandNote: "단가가 높은 리빙 카테고리용",
    createdAt: "2026-06-05T00:00:00.000Z",
    updatedAt: "2026-06-05T00:00:00.000Z",
  },
  {
    id: "ss3",
    userId: "demo-user",
    name: "컬러풀 캠핑 라인",
    defaultMood: "colorful",
    defaultTone: "warm",
    primaryColor: "#a85a2e",
    secondaryColor: "#e2794a",
    defaultPlatform: "smartstore",
    sectionVisibility: { trust: false },
    brandNote: "레저·아웃도어 상품 전용",
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
  },
];

export function getMockReferencesForSection(
  section: Pick<DetailSection, "kind" | "imageRole">,
  mood: DesignMood = "minimal"
): SectionImageAsset[] {
  const references = buildSectionImageReferences(mood);
  const matched = references.filter((ref) =>
    ref.tags.some((tag) => tag === section.kind || tag === section.imageRole)
  );
  return matched.length > 0 ? matched : references.slice(0, 3);
}
