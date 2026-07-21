import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";

import { getMockReferencesForSection } from "@/lib/mock-data";
import { createTemplateSections } from "@/lib/detail-page-templates";
import { mockGenerateDetailPage } from "@/lib/mock-ai";
import { toRichText } from "@/lib/rich-text";
import {
  DetailBlockLayoutType,
  DetailBlockSlots,
  GenerateDetailPageInput,
  GenerateDetailPageOutput,
  SECTION_KIND_LABELS,
  SECTION_KIND_ORDER,
  SectionKind,
} from "@/lib/types";
import { backfillSectionSlots, deriveBlockRole, stripNullSlotValues } from "./layout-fallback";
import { APPROVED_DETAIL_BLOCK_LAYOUT_TYPES, PlanningOutput, productionOutputSchema } from "./schemas";
import { generateSectionImages } from "./section-images";
import { getMockReason, isLiveAiEnabled, PRODUCTION_CALL_TIMEOUT_MS } from "./runtime-config";

// 한 줄 설명은 docs/REFERENCE_DETAIL_PAGE_ANALYSIS.md의 layoutType 표를 그대로 재사용.
const LAYOUT_TYPE_CATALOG: Record<(typeof APPROVED_DETAIL_BLOCK_LAYOUT_TYPES)[number], string> = {
  top_notice_banner: "배송/혜택/구성 안내",
  problem_hook: "사용자의 불편을 짚는 문제 제기",
  big_claim_band: "가장 강한 셀링포인트를 한 화면에 강조",
  material_closeup: "소재/촉감/구조를 클로즈업 이미지로 설명",
  before_after_compare: "사용 전후/일반 제품과의 차이 비교",
  feature_blue_panel: "파란 배경의 강한 기능 강조 섹션",
  evidence_card: "자료/실험/구조 설명처럼 신뢰를 보강",
  option_grid: "색상/타입/구성 옵션 안내",
  step_guide: "제품 사용법/관리법을 단계별 설명",
  comparison_table: "경쟁/기존 제품 대비 장점 비교",
  product_info_table: "상세정보/스펙/고시 정보",
  qa_list: "구매 전 자주 묻는 질문",
  brand_mood_story: "브랜드 감성/세계관/생활 장면 제안",
  color_lineup: "컬러/옵션을 감성 이미지와 함께 소개",
  care_guide: "세탁/관리/사용 주의사항",
  certification_stack: "인증/수상/판매량/리뷰 수 등 신뢰 자료",
  check_point_cards: "구매 전 확인할 장점/주의점을 카드형으로 정리",
  policy_notice: "배송/교환/반품/AS 안내",
};

const sectionPlan = SECTION_KIND_ORDER.map((kind, index) => ({
  id: `s${index + 1}`,
  kind,
  title: SECTION_KIND_LABELS[kind],
}));

async function fallback(
  input: GenerateDetailPageInput,
  reason?: string,
  preferredLayoutByKind?: Partial<Record<SectionKind, DetailBlockLayoutType>>
): Promise<GenerateDetailPageOutput> {
  const result = mockGenerateDetailPage(input, preferredLayoutByKind);
  const sections = await generateSectionImages(result.sections, input.productImageDataUrl);
  return {
    ...result,
    sections,
    warnings: reason ? [...(result.warnings ?? []), reason] : result.warnings,
  };
}

function buildPrompt(
  input: GenerateDetailPageInput,
  planningOutput?: PlanningOutput,
  preferredLayoutByKind?: Partial<Record<SectionKind, DetailBlockLayoutType>>
) {
  return `
너는 쿠팡/네이버 스마트스토어 상세페이지를 많이 작성한 이커머스 카피라이터야.

아래 상품 정보${planningOutput ? "와 기획 에이전트의 섹션 기획안" : ""}만 근거로 모바일 상세페이지 13개 섹션 초안을 작성해줘.

중요 규칙:
- 상품 정보에 없는 효능, 인증, 수치, 원산지, 수상 이력은 만들지 않는다.
- "완벽", "무조건", "최고"처럼 과장 광고처럼 보이는 표현은 피한다.
- 모바일에서 읽기 쉽게 짧은 문장으로 쓴다.
- 각 섹션의 목적에 맞게 문구를 다르게 작성한다.
- 사용자가 입력한 키워드와 강조 포인트를 우선 반영한다.
- 확실하지 않은 내용은 단정하지 않는다.
- FAQ/Trust 섹션에서도 근거 없는 인증, 보증, 수치를 만들지 않는다.
- imagePrompt는 실제 이미지를 생성하지 않고, 섹션에 필요한 이미지 연출 방향만 작성한다.
- imagePrompt에서도 상품의 실제 형태, 색상, 소재, 구성품을 바꾸지 않는다.

상품 정보:
- 상품명: ${input.productName}
- 카테고리: ${input.category}
- 핵심 키워드: ${input.keywords.join(", ") || "없음"}
- 타깃 고객: ${input.targetCustomer || "없음"}
- 강조 포인트: ${input.emphasisPoints.join(", ") || "없음"}
- 톤앤매너: ${input.tone}
- 디자인 무드: ${input.designMood}
- 플랫폼: ${input.platform}
- 이미지 설명: ${input.imageDescription || "사용자가 업로드한 원본 상품 이미지를 기준으로 함"}
- 추가 제작 요청: ${input.additionalInstruction || "없음"}
${planningOutput ? `\n기획 에이전트 결과:\n${JSON.stringify(planningOutput)}\n` : ""}

반드시 아래 순서와 kind로 13개 섹션을 반환해:
${sectionPlan.map((section) => `- ${section.id}: ${section.kind} (${section.title})`).join("\n")}

각 섹션:
- headline은 한 줄 제목
- body는 1~2문장
- bullets는 필요 없으면 빈 배열
- alternatives는 대체 카피 후보 2개
- imageRole은 섹션에 필요한 이미지 역할
- imagePrompt는 Pinterest 스타일 레퍼런스나 이미지 생성에 넘길 수 있는 안전한 이미지 연출 프롬프트. 반드시 그 섹션 자신의 headline/body가 강조하는 구체적 포인트(예: 소재감, 흡수력, 크기 체감 등 문구에 실제로 등장하는 내용)를 이미지로 시각화하도록 작성하고, 모든 섹션에 동일한 범용 상품 컷을 반복하지 않는다
- layoutType은 아래 카탈로그 중에서 그 섹션의 메시지에 가장 잘 맞는 것을 하나 골라라:
${Object.entries(LAYOUT_TYPE_CATALOG)
  .map(([type, description]) => `  - ${type}: ${description}`)
  .join("\n")}
- slots는 고른 layoutType이 실제로 쓰는 필드만 채워라(예: qa_list라면 faqItems, product_info_table이라면 specRows). 필요 없는 필드는 비워도 된다.
- layoutRationale은 이 섹션에 그 layoutType을 고른 이유를 1문장으로 설명한다.
- warnings는 근거가 부족하거나 사용자가 확인해야 할 사항이 있을 때만 작성하고, 없으면 빈 배열로 반환한다.
${
  preferredLayoutByKind && Object.keys(preferredLayoutByKind).length > 0
    ? `\n스타일 세트 선호 레이아웃 힌트(참고용, 문맥에 안 맞으면 다른 값을 골라도 됨):\n${Object.entries(
        preferredLayoutByKind
      )
        .map(([kind, layout]) => `  - ${kind}: ${layout}`)
        .join("\n")}\n`
    : ""
}
`.trim();
}

export async function runProductionAgent(
  input: GenerateDetailPageInput,
  planningOutput?: PlanningOutput,
  preferredLayoutByKind?: Partial<Record<SectionKind, DetailBlockLayoutType>>
): Promise<GenerateDetailPageOutput> {
  if (!isLiveAiEnabled()) {
    return await fallback(input, getMockReason(), preferredLayoutByKind);
  }

  if (!process.env.OPENAI_API_KEY) {
    return await fallback(input, "OPENAI_API_KEY가 없어 mock 초안을 사용했습니다.", preferredLayoutByKind);
  }

  try {
    const modelId = process.env.AI_MODEL ?? "gpt-4.1-mini";
    const { output } = await generateText({
      model: openai(modelId),
      maxRetries: 0,
      // 4000 -> 9000: layoutType/slots/layoutRationale이 추가되면서 13개 섹션 전체
      // 응답이 훨씬 커짐 — strict 구조화 출력 모드가 모든 슬롯 키를 required(값은
      // nullable)로 요구해서 매 섹션이 이전보다 실질적으로 더 많은 토큰을 씀
      // (실측: 8000에서 정상 완료, 4000에서는 NoOutputGeneratedError로 잘림).
      maxOutputTokens: 9000,
      temperature: 0.35,
      timeout: PRODUCTION_CALL_TIMEOUT_MS,
      output: Output.object({ schema: productionOutputSchema }),
      prompt: buildPrompt(input, planningOutput, preferredLayoutByKind),
    });

    // 실제 kind별 mock 템플릿 섹션 — 소프트 실패(유효한 layoutType이지만 필수
    // 슬롯이 비어있는 경우)에서 그 키만 채우는 백필 소스로 쓴다.
    const templateSections = createTemplateSections(input, preferredLayoutByKind);

    const sections = output.sections.map((section, index) => {
      const kind = section.kind as SectionKind;
      const blockRole = deriveBlockRole(section.layoutType);
      const templateSection = templateSections.find((t) => t.kind === kind);
      const aiSlots = stripNullSlotValues(section.slots) as DetailBlockSlots;
      const slots = backfillSectionSlots(section.layoutType, aiSlots, templateSection?.slots ?? {});
      const base = {
        id: `s${index + 1}`,
        kind,
        blockRole,
        layoutType: section.layoutType,
        slots,
        kicker: section.kicker,
        title: SECTION_KIND_LABELS[kind],
        headline: toRichText(section.headline),
        body: toRichText(section.body),
        bullets: section.bullets,
        imageRole: section.imageRole,
        imagePrompt: section.imagePrompt,
        alternatives: section.alternatives,
        layoutRationale: section.layoutRationale,
      };
      if (section.imageRole === "none") return base;
      // 셀러가 실제 상품 사진을 올렸으면(원본 도매 사진 업로드 필드) 그 사진을
      // 우선 씀 — 이전엔 이 값이 있어도 매 섹션이 항상 무관한 목업 스톡 사진
      // (mood 기반 제네릭 이미지)으로 채워졌음(실제 사용자 리포트로 발견: "타올"
      // 상품인데 데스크 램프 사진이 나옴). 업로드 사진이 없을 때만 기존 목업
      // 스톡 사진으로 폴백.
      if (input.productImageDataUrl) {
        return {
          ...base,
          imageUrl: input.productImageDataUrl,
          imageLabel: "업로드한 상품 사진",
          imageSource: "uploaded" as const,
          imageGradient: undefined,
        };
      }
      // Auto-apply a default reference image so a fresh AI draft doesn't start
      // with every section blank (docs/TASKS.md §4/§5) — same lookup used by
      // the editor's manual "Pinterest 스타일 레퍼런스" picker and by mockSections.
      const defaultImage = getMockReferencesForSection(base, input.designMood)[0];
      return {
        ...base,
        imageUrl: defaultImage.dataUrl,
        imageGradient: defaultImage.gradient,
        imageLabel: defaultImage.label,
        imageSource: defaultImage.source,
      };
    });

    return {
      sections: await generateSectionImages(sections, input.productImageDataUrl),
      source: "ai",
      warnings: output.warnings,
    };
  } catch (error) {
    console.error("production agent failed", error);
    return await fallback(input, "OpenAI 호출 실패로 mock 초안을 사용했습니다.", preferredLayoutByKind);
  }
}
