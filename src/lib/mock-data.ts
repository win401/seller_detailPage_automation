import {
  DetailBlockLayoutType,
  DetailBlockRole,
  DesignMood,
  DetailSection,
  DetailBlockSlots,
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
  { key: "material", label: "소재감" },
  { key: "design", label: "생활 무드" },
  { key: "wash", label: "관리 편의" },
  { key: "absorb", label: "흡수력" },
  { key: "gift", label: "선물용" },
];

export const mockProductInput: ProductInput = {
  productName: "프리미엄 뱀부 대형 타올",
  category: "리빙/패브릭",
  price: "32,900원",
  keywords: ["뱀부 소재", "대형 타올", "빠른 흡수", "부드러운 촉감"],
  targetCustomer: "샤워 후 포근한 사용감을 원하는 1인 가구, 호텔 같은 욕실 무드를 좋아하는 고객",
  emphasisPoints: ["material", "absorb", "wash"],
  tone: "premium",
  designMood: "natural",
  platform: "smartstore",
  additionalInstruction: "프리미엄 리빙 브랜드 상세페이지처럼 감성 이미지와 소재 설명을 중심으로 구성",
};

/**
 * Mock visual sources for the five common image roles. These are intentionally
 * generic editorial images, never a claimed photo of the seller's product.
 * They let the draft read like a real detail page before the seller replaces
 * each section with an actual product photo.
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
      dataUrl: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=82",
      gradient: g.desk,
      promptHint: `${mood} mood, desk composition, soft natural light, generous whitespace`,
      tags: ["intro", "one_line", "product-hero-lifestyle", "product-flatlay"],
    },
    {
      id: "ref-soft-macro",
      label: "소재 클로즈업",
      description: "질감과 디테일을 강조하는 접사 컷",
      source: "reference",
      dataUrl: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1200&q=82",
      gradient: g.macro,
      promptHint: `${mood} mood, macro product detail, texture, shallow depth of field, clean lighting`,
      tags: ["benefit_1", "detail", "product-detail-macro", "product-detail-texture"],
    },
    {
      id: "ref-commute-scene",
      label: "실사용 장면",
      description: "가방, 노트북, 이동 동선이 보이는 실사용 라이프스타일 컷",
      source: "reference",
      dataUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=82",
      gradient: g.commute,
      promptHint: `${mood} mood, everyday lifestyle scene, product in use, calm urban setting`,
      tags: ["problem", "use_scene", "recommended_for", "problem-context-commute", "lifestyle-multi-scene"],
    },
    {
      id: "ref-clean-parts",
      label: "구성품 정렬",
      description: "구성품을 깔끔하게 분리해 구조를 보여주는 컷",
      source: "reference",
      dataUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=82",
      gradient: g.parts,
      promptHint: `${mood} mood, disassembled product parts, clean top-down layout, precise shadows`,
      tags: ["benefit_3", "solution", "product-disassembled", "product-cross-section"],
    },
    {
      id: "ref-premium-badge",
      label: "신뢰 포인트",
      description: "인증, 보증, 소재 정보를 차분하게 보여주는 그래픽형 컷",
      source: "reference",
      dataUrl: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=82",
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
  blockRole?: DetailBlockRole;
  layoutType?: DetailBlockLayoutType;
  kicker: string;
  headline: string;
  body: string;
  bullets?: string[];
  imageRole: string;
  imageGradient?: string;
  slots?: DetailBlockSlots;
  alternatives?: string[];
}

const sectionSeeds: SectionSeed[] = [
  {
    kind: "intro",
    blockRole: "intro",
    layoutType: "brand_mood_story",
    kicker: "F:LAT HOME",
    headline: "욕실의 시간을 더 부드럽게",
    body: "샤워 후 가장 먼저 닿는 타올이 하루의 감각을 바꿉니다. 뱀부 소재의 차분한 촉감으로 매일의 욕실을 호텔처럼 정돈해보세요.",
    imageRole: "bath-lifestyle-hero",
    imageGradient: "linear-gradient(145deg, #d8e6d6 0%, #9fb99f 48%, #506c55 100%)",
    slots: {
      brandName: "F:LAT",
      eyebrow: "BAMBOO BATH TOWEL",
      badges: ["Bamboo 100%", "Large Size", "Soft Touch"],
      palette: ["#57735d", "#d6c7b6", "#f5f1e8"],
    },
  },
  {
    kind: "one_line",
    blockRole: "claim",
    layoutType: "big_claim_band",
    kicker: "POINT",
    headline: "크고 부드러운 한 장",
    body: "머리부터 어깨까지 넉넉하게 감싸는 대형 사이즈와 폭신한 터치감을 한 번에 담았습니다.",
    imageRole: "towel-folded-stack",
    imageGradient: "linear-gradient(135deg, #f7f2ea 0%, #d4c1aa 52%, #6f7c63 100%)",
    slots: {
      subHeadline: "프리미엄 뱀부 호텔 코튼 무드",
      badges: ["대형 사이즈", "부드러운 촉감", "데일리 욕실"],
    },
    alternatives: [
      "샤워 후 가장 먼저 닿는 포근함",
      "욕실 무드를 바꾸는 프리미엄 타올",
    ],
  },
  {
    kind: "problem",
    blockRole: "problem",
    layoutType: "problem_hook",
    kicker: "WHY",
    headline: "매일 쓰는 타올, 정말 편안한가요?",
    body: "샤워 후 타올이 작거나 거칠면 몸을 닦는 짧은 순간도 불편해집니다. 매일 쓰는 만큼 촉감과 흡수감이 중요합니다.",
    imageRole: "bathroom-after-shower",
    imageGradient: "linear-gradient(145deg, #f2eee7 0%, #cbb8a4 50%, #594438 100%)",
  },
  {
    kind: "solution",
    blockRole: "material",
    layoutType: "material_closeup",
    kicker: "MATERIAL",
    headline: "뱀부 소재의 보드라운 터치",
    body: "피부에 닿는 순간 거칠지 않도록 부드러운 촉감을 우선했습니다. 욕실, 수영장, 여행지 어디서든 편하게 사용할 수 있습니다.",
    imageRole: "towel-texture-closeup",
    imageGradient: "radial-gradient(circle at 30% 30%, #faf6ef 0%, #d9c7b5 45%, #6d6f5f 100%)",
    slots: {
      badges: ["Soft", "Absorbent", "Daily"],
      caption: "섬유 결이 느껴지는 타올 접사 컷",
    },
  },
  {
    kind: "benefit_1",
    blockRole: "feature",
    layoutType: "feature_blue_panel",
    kicker: "BENEFIT 01",
    headline: "샤워 후 물기를 빠르게 감싸는 흡수감",
    body: "넓은 면적과 부드러운 파일감으로 몸에 남은 물기를 편하게 닦아낼 수 있습니다.",
    bullets: ["넉넉한 대형 사이즈", "욕실과 수영장 모두 어울리는 활용도"],
    imageRole: "towel-water-absorption",
    imageGradient: "linear-gradient(145deg, #e4f1e6 0%, #81a987 48%, #2e5b45 100%)",
  },
  {
    kind: "benefit_2",
    blockRole: "option",
    layoutType: "color_lineup",
    kicker: "COLOR",
    headline: "욕실 분위기에 맞추는 7컬러",
    body: "차분한 뉴트럴부터 깊은 그린, 네이비까지 욕실 톤에 맞춰 고를 수 있습니다.",
    bullets: ["아이보리, 베이지, 브라운", "그린, 네이비, 차콜, 블랙"],
    imageRole: "towel-color-lineup",
    imageGradient: "linear-gradient(135deg, #eee4d7 0%, #9a735c 35%, #335c4a 68%, #1f2b37 100%)",
    slots: {
      swatches: ["#eee9df", "#cdbda7", "#8b5b43", "#4f725e", "#223247", "#55555b", "#151313"],
      optionItems: [
        { label: "아이보리", color: "#eee9df" },
        { label: "베이지", color: "#cdbda7" },
        { label: "브라운", color: "#8b5b43" },
        { label: "그린", color: "#4f725e" },
        { label: "네이비", color: "#223247" },
        { label: "차콜", color: "#55555b" },
        { label: "블랙", color: "#151313" },
      ],
    },
  },
  {
    kind: "benefit_3",
    blockRole: "usage",
    layoutType: "brand_mood_story",
    kicker: "LIFESTYLE",
    headline: "욕실 밖에서도 자연스럽게",
    body: "수영장, 여행, 반려동물 목욕 후에도 넉넉한 크기로 편하게 사용할 수 있습니다.",
    bullets: ["샤워 후 바디 타올", "수영장/여행용 타올", "반려동물 목욕 후 케어"],
    imageRole: "family-towel-scene",
    imageGradient: "linear-gradient(145deg, #f7efe7 0%, #c99d7c 45%, #75614f 100%)",
  },
  {
    kind: "detail",
    blockRole: "guide",
    layoutType: "care_guide",
    kicker: "CARE GUIDE",
    headline: "오래 부드럽게 쓰는 세탁 가이드",
    body: "타올의 촉감과 흡수감을 오래 유지하려면 첫 세탁과 건조 방법이 중요합니다.",
    imageRole: "laundry-guide",
    imageGradient: "linear-gradient(135deg, #f4f6ef 0%, #d7dfcf 50%, #8fa083 100%)",
    slots: {
      guideItems: [
        { title: "첫 세탁 권장", body: "사용 전 단독 세탁 후 사용해 주세요.", icon: "01" },
        { title: "섬유유연제 주의", body: "흡수력을 위해 과도한 섬유유연제는 피해주세요.", icon: "02" },
        { title: "그늘 건조", body: "통풍이 잘 되는 곳에서 자연 건조를 권장합니다.", icon: "03" },
      ],
    },
  },
  {
    kind: "use_scene",
    blockRole: "trust",
    layoutType: "check_point_cards",
    kicker: "CHECK POINT",
    headline: "구매 전 확인해 주세요",
    body: "대형 타올은 사이즈, 소재, 관리 방법을 함께 확인하면 더 만족스럽게 사용할 수 있습니다.",
    imageRole: "towel-check-points",
    slots: {
      cards: [
        { title: "대형 사이즈", body: "몸을 감싸는 넉넉한 크기" },
        { title: "뱀부 소재", body: "피부에 닿는 부드러운 촉감" },
        { title: "컬러 선택", body: "욕실 무드에 맞는 7가지 색상" },
      ],
    },
  },
  {
    kind: "recommended_for",
    blockRole: "spec",
    layoutType: "product_info_table",
    kicker: "INFO",
    headline: "제품 상세 정보",
    body: "구매 전 사이즈와 소재 정보를 확인해 주세요.",
    bullets: [],
    imageRole: "product-info-table",
    slots: {
      specRows: [
        { label: "제품명", value: "프리미엄 뱀부 대형 타올" },
        { label: "사이즈", value: "약 70 x 140cm" },
        { label: "소재", value: "뱀부 혼방 패브릭" },
        { label: "색상", value: "아이보리, 베이지, 브라운, 그린, 네이비, 차콜, 블랙" },
        { label: "권장 용도", value: "욕실, 수영장, 여행, 반려동물 케어" },
      ],
    },
  },
  {
    kind: "trust",
    blockRole: "policy",
    layoutType: "policy_notice",
    kicker: "NOTICE",
    headline: "배송 및 교환 안내",
    body: "단순 변심 교환/반품은 상품 수령 후 안내 기간 내 신청해 주세요. 사용 흔적이 있는 경우 교환이 제한될 수 있습니다.",
    imageRole: "policy-notice",
    slots: {
      noticeItems: [
        "사용 전 제품 상태와 색상을 먼저 확인해 주세요.",
        "세탁 또는 사용 후에는 교환/반품이 제한될 수 있습니다.",
        "모니터 환경에 따라 실제 색상과 차이가 있을 수 있습니다.",
      ],
      emphasis: "구매 전 옵션과 사이즈를 꼭 확인해 주세요.",
    },
  },
  {
    kind: "faq",
    blockRole: "faq",
    layoutType: "qa_list",
    kicker: "FAQ",
    headline: "자주 묻는 질문",
    body: "Q. 세탁 후에도 부드럽나요? A. 세탁 방법과 건조 방법에 따라 사용감이 달라질 수 있어 세탁 가이드를 함께 확인해 주세요.",
    imageRole: "none",
    slots: {
      faqItems: [
        { question: "처음 받으면 바로 사용해도 되나요?", answer: "사용 전 단독 세탁 후 사용하는 것을 권장합니다." },
        { question: "건조기 사용이 가능한가요?", answer: "섬유 손상을 줄이기 위해 자연 건조를 권장합니다." },
        { question: "선물용으로도 괜찮나요?", answer: "차분한 컬러와 넉넉한 사이즈로 집들이/신혼 선물용으로도 좋습니다." },
      ],
    },
  },
  {
    kind: "cta",
    blockRole: "cta",
    layoutType: "big_claim_band",
    kicker: "CTA",
    headline: "오늘의 욕실을 더 포근하게",
    body: "매일 쓰는 타올부터 차분하고 부드러운 감각으로 바꿔보세요.",
    imageRole: "bath-lifestyle-hero",
    imageGradient: "linear-gradient(145deg, #526f58 0%, #9eb497 55%, #f4efe5 100%)",
    slots: {
      subHeadline: "프리미엄 뱀부 대형 타올",
      badges: ["부드러운 촉감", "넉넉한 사이즈", "7컬러"],
    },
    alternatives: ["샤워 후 가장 먼저 닿는 포근함", "욕실의 분위기를 바꾸는 한 장"],
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
    blockRole: seed.blockRole,
    layoutType: seed.layoutType,
    slots: seed.slots,
    alternatives: seed.alternatives ?? [],
    ...(defaultImage && {
      imageGradient: seed.imageGradient ?? defaultImage.gradient,
      imageLabel: defaultImage.label,
      imageSource: defaultImage.source,
    }),
    ...(!defaultImage && seed.imageGradient && {
      imageGradient: seed.imageGradient,
      imageLabel: seed.imageRole,
      imageSource: "mock" as const,
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
