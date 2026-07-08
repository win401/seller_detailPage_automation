import {
  DetailPageProject,
  DetailSection,
  EmphasisOption,
  ProductInput,
  ProjectSummary,
  SECTION_KIND_LABELS,
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
      "출근길 커피 온도, 자리에 앉을 때까지 지켜주는 텀블러",
      "마지막 한 모금까지 따뜻하게, 데일리 텀블러",
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
    body: "이중 진공 구조가 온도를 오래 유지해 마지막 한 모금까지 처음 그대로.",
    imageRole: "product-cross-section",
  },
  {
    kind: "benefit_1",
    kicker: "BENEFIT 01",
    headline: "보온·보냉 지속력",
    body: "6시간이 지나도 따뜻함이 남아있는 이중 진공 구조.",
    bullets: ["6시간 보온 유지", "얼음 그대로 보냉"],
    imageRole: "product-detail-macro",
  },
  {
    kind: "benefit_2",
    kicker: "BENEFIT 02",
    headline: "슬림 바디 & 컵홀더 호환",
    body: "가방과 차량 어디에도 자연스럽게 들어갑니다.",
    bullets: ["일반 컵홀더 호환", "가방 사이드 포켓 수납"],
    imageRole: "product-in-context-bag",
  },
  {
    kind: "benefit_3",
    kicker: "BENEFIT 03",
    headline: "분리 세척 가능한 뚜껑",
    body: "매일 써도 위생적으로 관리하기 쉬운 구조.",
    bullets: ["뚜껑 완전 분리", "식기세척기 사용 가능"],
    imageRole: "product-disassembled",
  },
  {
    kind: "detail",
    kicker: "DETAIL",
    headline: "손끝까지 신경 쓴 마감",
    body: "무광 스테인리스 마감과 이음새 없는 바디로 손에 닿는 느낌까지 신경 썼습니다.",
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
    body: "식품안전 인증 소재, 1년 무상 교환 보증으로 안심하고 사용하세요.",
    imageRole: "certification-badge",
  },
  {
    kind: "faq",
    kicker: "FAQ",
    headline: "자주 묻는 질문",
    body: "Q. 차량 컵홀더에 들어가나요? A. 대부분의 일반 컵홀더에 맞는 슬림형입니다.",
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

export const mockSections: DetailSection[] = sectionSeeds.map((seed, i) => ({
  id: `s${i + 1}`,
  kind: seed.kind,
  kicker: seed.kicker,
  title: SECTION_KIND_LABELS[seed.kind],
  headline: seed.headline,
  body: seed.body,
  bullets: seed.bullets ?? [],
  imageRole: seed.imageRole,
  alternatives: seed.alternatives ?? [],
}));

export const mockProject: DetailPageProject = {
  id: "p1",
  userId: "demo-user",
  title: mockProductInput.productName,
  category: mockProductInput.category,
  productInput: mockProductInput,
  selectedPlatform: "smartstore",
  selectedMood: "minimal",
  selectedTone: "practical",
  sections: Object.fromEntries(mockSections.map((s) => [s.id, s])),
  sectionOrder: mockSections.map((s) => s.id),
  hiddenSectionIds: [],
  assetPaths: [],
  createdAt: "2026-07-08T00:00:00.000Z",
  updatedAt: "2026-07-08T00:03:00.000Z",
};

export const mockProjectSummaries: ProjectSummary[] = [
  { id: "p1", name: "온도 유지 프리미엄 텀블러", category: "생활/주방용품", platform: "smartstore", updatedAtLabel: "3분 전" },
  { id: "p2", name: "무선 목받침 넥쿠션", category: "자동차용품", platform: "coupang", updatedAtLabel: "2시간 전" },
  { id: "p3", name: "반신욕 스파 발마사지기", category: "뷰티/헬스", platform: "smartstore", updatedAtLabel: "어제" },
  { id: "p4", name: "접이식 캠핑 테이블", category: "레저/스포츠", platform: "coupang", updatedAtLabel: "3일 전" },
];

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
