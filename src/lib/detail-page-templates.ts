import {
  DetailBlockLayoutType,
  DetailBlockRole,
  DetailBlockSlots,
  DetailSection,
  GenerateDetailPageInput,
  SECTION_KIND_LABELS,
  SectionKind,
} from "./types";

type TemplateFamily = "living" | "functional" | "wellness";

type SectionDraft = {
  kind: SectionKind;
  role: DetailBlockRole;
  layout: DetailBlockLayoutType;
  kicker: string;
  headline: string;
  body: string;
  imageRole: string;
  bullets?: string[];
  slots?: DetailBlockSlots;
};

function pickKeywords(input: GenerateDetailPageInput) {
  return input.keywords.filter(Boolean).slice(0, 3);
}

function selectTemplateFamily(input: GenerateDetailPageInput): TemplateFamily {
  const text = `${input.productName} ${input.category} ${input.keywords.join(" ")}`.toLowerCase();
  if (/(베개|경추|수면|목\s*지지|자세)/.test(text)) return "wellness";
  if (/(깔창|인솔|신발|보호|교정|물주머니|온열|기능성)/.test(text)) return "functional";
  return "living";
}

function section(index: number, draft: SectionDraft): DetailSection {
  return {
    id: `s${index + 1}`,
    kind: draft.kind,
    blockRole: draft.role,
    layoutType: draft.layout,
    kicker: draft.kicker,
    title: SECTION_KIND_LABELS[draft.kind],
    headline: draft.headline,
    body: draft.body,
    bullets: draft.bullets ?? [],
    imageRole: draft.imageRole,
    slots: draft.slots,
    alternatives: [],
  };
}

function commonInfo(input: GenerateDetailPageInput) {
  const keywords = pickKeywords(input);
  const keyText = keywords.join(" · ") || "상품의 핵심 특징";
  return {
    keywords,
    keyText,
    customer: input.targetCustomer || "이 상품이 필요한 고객",
    product: input.productName,
    category: input.category || "상품 카테고리",
  };
}

function livingTemplate(input: GenerateDetailPageInput): SectionDraft[] {
  const v = commonInfo(input);
  return [
    {
      kind: "intro", role: "notice", layout: "top_notice_banner", kicker: "SHOPPING GUIDE",
      headline: `${v.product} 구매 전 확인`, body: "상품 정보와 옵션을 확인한 뒤 필요한 구성으로 선택해 주세요.", imageRole: "top-benefit-banner",
      slots: { badges: ["상품 정보 확인", "옵션 선택", "배송 전 확인"], items: ["상품별 상세 정보는 하단 표를 확인해 주세요."] },
    },
    {
      kind: "one_line", role: "intro", layout: "brand_mood_story", kicker: "DAILY LIVING",
      headline: `${v.product}, 매일의 감각을 바꾸는 선택`, body: `${v.customer}의 일상에 자연스럽게 어울리도록 소재와 사용 장면을 중심으로 구성했습니다.`, imageRole: "lifestyle-hero",
      slots: { brandName: "YOUR BRAND", eyebrow: v.keyText, badges: ["DAILY", "MATERIAL", "DETAIL"] },
    },
    {
      kind: "problem", role: "problem", layout: "problem_hook", kicker: "WHY IT MATTERS",
      headline: "매일 쓰는 제품일수록, 작은 차이가 중요합니다", body: "구매 전에는 사용 장면과 소재, 관리 방법까지 함께 확인해야 오래 만족스럽게 사용할 수 있습니다.", imageRole: "daily-use-scene",
      bullets: ["내 생활에 맞는 사용감", "피부와 손에 닿는 소재", "꾸준히 쓰기 쉬운 관리"],
    },
    {
      kind: "solution", role: "claim", layout: "big_claim_band", kicker: "KEY POINT",
      headline: v.keyText, body: "복잡한 설명 대신, 실제 사용할 때 체감되는 핵심 포인트를 먼저 보여드립니다.", imageRole: "product-main-detail",
      slots: { subHeadline: v.product, badges: ["일상 사용", "디테일", "선택 가이드"] },
    },
    {
      kind: "benefit_1", role: "material", layout: "material_closeup", kicker: "MATERIAL",
      headline: "가까이에서 확인하는 소재와 마감", body: "텍스트만으로 판단하기 어려운 소재의 결, 촉감, 마감 포인트를 이미지와 함께 확인하는 영역입니다.", imageRole: "material-closeup",
      slots: { badges: v.keywords.length ? v.keywords : ["Material", "Texture", "Finish"] },
    },
    {
      kind: "benefit_2", role: "feature", layout: "feature_blue_panel", kicker: "BENEFIT 01",
      headline: "일상에서 필요한 기능을 명확하게", body: "사용 목적과 핵심 특징을 짧고 선명하게 전달해 구매 판단을 돕습니다.", imageRole: "feature-in-use",
      bullets: ["상품 정보 기반 핵심 포인트", "과장 없이 확인 가능한 설명"],
    },
    {
      kind: "benefit_3", role: "option", layout: "color_lineup", kicker: "OPTIONS",
      headline: "내 공간과 취향에 맞춰 고르는 옵션", body: "실제 제공되는 옵션명과 색상은 판매자가 직접 입력해 정확하게 안내합니다.", imageRole: "option-lineup",
      slots: { optionItems: ["옵션 A", "옵션 B", "옵션 C", "옵션 D", "옵션 E", "옵션 F"].map((label, index) => ({ label, color: ["#eee9df", "#cdbda7", "#8b5b43", "#4f725e", "#223247", "#55555b"][index] })) },
    },
    {
      kind: "detail", role: "trust", layout: "evidence_card", kicker: "DETAIL CHECK",
      headline: "구매 전, 디테일을 한 번 더", body: "원단, 구성, 마감처럼 사진으로 확인해야 하는 포인트를 모아 보여주는 상세 영역입니다.", imageRole: "product-detail-grid",
      slots: { caption: "실제 상품 사진을 넣어 디테일을 확인해 주세요.", proofItems: [{ label: "소재", value: v.keywords[0] ?? "판매자 입력" }, { label: "구성", value: "판매자 입력" }] },
    },
    {
      kind: "use_scene", role: "guide", layout: "care_guide", kicker: "CARE GUIDE",
      headline: "오래 잘 쓰기 위한 관리 안내", body: "상품 특성에 맞는 세탁, 보관, 사용 주의사항을 판매자가 직접 입력하는 영역입니다.", imageRole: "care-guide",
      slots: { guideItems: [{ title: "사용 전 확인", body: "상품 구성과 옵션을 먼저 확인해 주세요.", icon: "01" }, { title: "관리 방법", body: "소재별 관리 방법을 상품 정보에 맞춰 입력해 주세요.", icon: "02" }, { title: "보관 안내", body: "직사광선과 습기를 피해 보관해 주세요.", icon: "03" }] },
    },
    {
      kind: "recommended_for", role: "trust", layout: "check_point_cards", kicker: "CHECK POINT",
      headline: "이런 기준으로 선택해 보세요", body: "제품을 사용할 장소와 빈도, 원하는 사용감을 기준으로 비교해 보세요.", imageRole: "purchase-checkpoints",
      slots: { cards: [{ title: "사용 장면", body: "내 일상에서 가장 자주 쓰는 상황을 먼저 떠올려 보세요." }, { title: "소재와 관리", body: "피부 접촉과 관리 난이도를 함께 확인해 주세요." }, { title: "옵션", body: "필요한 색상과 구성을 정확히 선택해 주세요." }] },
    },
    infoSection(v), faqSection(), policySection(),
  ];
}

function functionalTemplate(input: GenerateDetailPageInput): SectionDraft[] {
  const v = commonInfo(input);
  return [
    {
      kind: "intro", role: "notice", layout: "top_notice_banner", kicker: "BENEFIT",
      headline: `${v.product} 핵심 안내`, body: "기능성 상품은 사용 목적과 규격을 먼저 확인해 주세요.", imageRole: "top-benefit-banner",
      slots: { badges: ["사용 목적 확인", "규격 확인", "옵션 확인"], items: ["상품 정보에 없는 효과나 수치는 단정하지 않습니다."] },
    },
    {
      kind: "one_line", role: "problem", layout: "problem_hook", kicker: "START WITH YOUR NEED",
      headline: "불편한 순간을 먼저 떠올려 보세요", body: `${v.customer}에게 필요한 사용 상황을 기준으로 ${v.product}의 기능을 설명합니다.`, imageRole: "problem-use-scene",
      bullets: ["언제 불편한지", "어떤 사용감이 필요한지", "내 제품 규격과 맞는지"],
    },
    {
      kind: "problem", role: "claim", layout: "big_claim_band", kicker: "KEY BENEFIT",
      headline: v.keyText, body: "핵심 포인트를 한 화면에 요약하고, 아래에서 구조와 사용 방법을 순서대로 안내합니다.", imageRole: "product-hero-functional",
      slots: { subHeadline: v.product, badges: ["문제 인식", "구조 확인", "사용 가이드"] },
    },
    {
      kind: "solution", role: "feature", layout: "before_after_compare", kicker: "COMPARE",
      headline: "사용 전 확인할 차이", body: "일반적인 사용 상황과 이 상품을 사용할 때 확인할 포인트를 나란히 보여주는 비교 영역입니다.", imageRole: "before-after-compare",
      slots: { beforeLabel: "기존 사용 환경", afterLabel: `${v.product} 사용 포인트`, comparisonRows: [{ label: "확인 기준", left: "불편한 지점 파악", right: "상품 정보와 맞는지 확인" }, { label: "구매 전", left: "규격 확인 필요", right: "옵션과 사용법 확인" }] },
    },
    {
      kind: "benefit_1", role: "material", layout: "material_closeup", kicker: "STRUCTURE",
      headline: "구조와 소재를 가까이에서", body: "기능성 상품은 실제 디테일 컷과 구성 이미지가 구매 판단에 가장 중요합니다.", imageRole: "structure-closeup",
      slots: { badges: v.keywords.length ? v.keywords : ["Structure", "Material", "Fit"] },
    },
    {
      kind: "benefit_2", role: "feature", layout: "feature_blue_panel", kicker: "BENEFIT 01",
      headline: "사용 장면에서 확인하는 핵심 기능", body: "제품의 형태와 기능을 바꾸지 않고, 판매자가 제공한 정보 안에서만 설명합니다.", imageRole: "functional-use-scene",
      bullets: ["실사용 이미지 배치", "핵심 기능 한 줄 설명"],
    },
    {
      kind: "benefit_3", role: "trust", layout: "evidence_card", kicker: "DETAIL EVIDENCE",
      headline: "사진과 정보로 확인하는 포인트", body: "근거가 필요한 인증, 실험 수치, 효능은 판매자가 자료를 넣었을 때만 노출하는 영역입니다.", imageRole: "evidence-detail",
      slots: { caption: "판매자가 제공한 근거 자료를 배치해 주세요.", proofItems: [{ label: "핵심 소재", value: v.keywords[0] ?? "판매자 입력" }, { label: "사용 대상", value: v.customer }] },
    },
    {
      kind: "detail", role: "guide", layout: "step_guide", kicker: "HOW TO USE",
      headline: "사용 방법을 순서대로 안내합니다", body: "한 장의 긴 설명 대신 단계별 이미지와 짧은 문장을 함께 보여줍니다.", imageRole: "step-by-step-use",
      slots: { steps: [{ title: "STEP 1", body: "사용 전 제품 규격과 구성품을 확인합니다." }, { title: "STEP 2", body: "상품 특성에 맞는 위치와 방법으로 사용합니다." }, { title: "STEP 3", body: "사용 후 관리 안내를 확인합니다." }] },
    },
    {
      kind: "use_scene", role: "trust", layout: "comparison_table", kicker: "BUYING GUIDE",
      headline: "내 사용 환경과 비교해 보세요", body: "과장된 우위 표현 대신, 구매 전 확인해야 할 기준을 표로 정리합니다.", imageRole: "comparison-guide",
      slots: { comparisonRows: [{ label: "사용 목적", left: "현재 필요한 상황", right: v.product }, { label: "확인할 점", left: "규격·사이즈", right: "옵션·구성" }, { label: "관리", left: "기존 방식", right: "상품 안내 기준" }] },
    },
    {
      kind: "recommended_for", role: "option", layout: "option_grid", kicker: "OPTIONS",
      headline: "필요한 옵션을 정확하게 선택하세요", body: "색상, 규격, 구성처럼 실제 판매 옵션을 카드 형태로 안내합니다.", imageRole: "option-grid",
      slots: { optionItems: ["기본 옵션", "추가 옵션", "구성 선택", "사이즈 확인"].map((label) => ({ label, description: "판매자 입력" })) },
    },
    infoSection(v), faqSection(), policySection(),
  ];
}

function wellnessTemplate(input: GenerateDetailPageInput): SectionDraft[] {
  const v = commonInfo(input);
  const base = functionalTemplate(input);
  return base.map((draft, index) => {
    if (index === 1) return { ...draft, headline: "내 몸에 맞는 사용 환경부터 확인하세요", body: "수면과 휴식에 쓰는 제품은 개인의 체형과 생활 습관에 따라 사용감이 다를 수 있습니다." };
    if (index === 3) return { ...draft, layout: "certification_stack", role: "trust", kicker: "INFORMATION", headline: "구매 전 확인해야 할 전문 정보", body: "인증, 소재, 사용 대상처럼 근거가 필요한 정보는 판매자가 제공한 자료를 기준으로만 보여줍니다.", imageRole: "wellness-information", slots: { proofItems: [{ label: "소재", value: v.keywords[0] ?? "판매자 입력" }, { label: "권장 대상", value: v.customer }, { label: "안내", value: "개인차가 있을 수 있음" }], caption: "근거 자료와 실제 제품 이미지를 함께 배치해 주세요." } };
    if (index === 7) return { ...draft, layout: "evidence_card", role: "trust", kicker: "DESIGN DETAIL", headline: "구조와 사용 환경을 함께 확인하세요", body: "제품 단면, 지지 구조, 사용 자세처럼 사진이 필요한 정보를 정리합니다.", imageRole: "wellness-structure" };
    if (index === 9) return { ...draft, layout: "check_point_cards", role: "trust", kicker: "CHECK POINT", headline: "선택 전 체크리스트", body: "사이즈, 사용 환경, 관리 방법을 확인한 뒤 선택해 주세요.", imageRole: "wellness-checklist", slots: { cards: [{ title: "사용 환경", body: "평소 사용하는 공간과 자세를 고려해 주세요." }, { title: "개인차", body: "사용감은 개인의 체형과 습관에 따라 달라질 수 있습니다." }, { title: "관리", body: "커버와 본품의 관리 방법을 확인해 주세요." }] } };
    return draft;
  });
}

function infoSection(v: ReturnType<typeof commonInfo>): SectionDraft {
  return { kind: "trust", role: "spec", layout: "product_info_table", kicker: "PRODUCT INFO", headline: "제품 상세 정보", body: "구매 전 상품명, 카테고리, 옵션과 구성 정보를 확인해 주세요.", imageRole: "product-info-table", slots: { specRows: [{ label: "제품명", value: v.product }, { label: "카테고리", value: v.category }, { label: "핵심 특징", value: v.keyText }, { label: "사용 대상", value: v.customer }, { label: "옵션", value: "판매자 입력" }] } };
}

function faqSection(): SectionDraft {
  return { kind: "faq", role: "faq", layout: "qa_list", kicker: "FAQ", headline: "자주 묻는 질문", body: "구매 전 궁금한 내용을 미리 확인해 주세요.", imageRole: "none", slots: { faqItems: [{ question: "상품 구성은 어떻게 확인하나요?", answer: "상세 정보와 옵션 선택 영역을 함께 확인해 주세요." }, { question: "이미지와 실제 색상이 같은가요?", answer: "모니터 환경에 따라 색상 차이가 있을 수 있습니다." }, { question: "교환과 반품은 가능한가요?", answer: "상품 상태와 판매자 정책을 확인해 주세요." }] } };
}

function policySection(): SectionDraft {
  return { kind: "cta", role: "policy", layout: "policy_notice", kicker: "SHOPPING NOTICE", headline: "배송 및 교환 안내", body: "상품 수령 후 상태와 옵션을 확인해 주세요.", imageRole: "policy-notice", slots: { emphasis: "구매 전 옵션과 상품 정보를 꼭 확인해 주세요.", noticeItems: ["사용 또는 훼손된 상품은 교환과 반품이 제한될 수 있습니다.", "상품 색상은 모니터 환경에 따라 차이가 있을 수 있습니다.", "배송과 교환 기준은 판매자 정책을 확인해 주세요."] } };
}

export function createTemplateSections(input: GenerateDetailPageInput): DetailSection[] {
  const family = selectTemplateFamily(input);
  const drafts = family === "functional" ? functionalTemplate(input) : family === "wellness" ? wellnessTemplate(input) : livingTemplate(input);
  return drafts.map((draft, index) => section(index, draft));
}
