import { z } from "zod";

// ---------- shared enums (docs/PROMPTS.md, docs/MVP_PLAN.md §6) ----------

export const toneSchema = z.enum(["practical", "trust", "premium", "warm"]);
export const moodSchema = z.enum(["minimal", "natural", "premium", "colorful"]);
export const platformSchema = z.enum(["coupang", "smartstore", "ably", "zigzag"]);
export const sectionKindSchema = z.enum([
  "intro",
  "one_line",
  "problem",
  "solution",
  "benefit_1",
  "benefit_2",
  "benefit_3",
  "detail",
  "use_scene",
  "recommended_for",
  "trust",
  "faq",
  "cta",
]);

export const competitorReferenceInputSchema = z.object({
  id: z.string(),
  url: z.string(),
  memo: z.string(),
  referenceType: z.enum(["same_product", "similar_product", "design_reference", "copy_reference", "etc"]),
});

export const generateDetailPageInputSchema = z.object({
  productName: z.string().min(1),
  category: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  targetCustomer: z.string().default(""),
  emphasisPoints: z.array(z.string()).default([]),
  // Defaulted (not just required) because the revision endpoint may only have
  // a best-effort reconstruction of the original creation-time input.
  tone: toneSchema.default("practical"),
  designMood: moodSchema.default("minimal"),
  platform: platformSchema.default("smartstore"),
  imageDescription: z.string().optional(),
  productImageDataUrl: z.string().optional(),
  additionalInstruction: z.string().optional(),
});

// ---------- 분석 에이전트 (docs/PROMPTS.md "분석 에이전트 프롬프트") ----------

export const analysisOutputSchema = z.object({
  summary: z.string(),
  competitorReferences: z.array(
    z.object({
      url: z.string(),
      userMemo: z.string(),
      usableInsights: z.array(z.string()),
      needsVerification: z.array(z.string()),
    })
  ),
  marketPositioningHints: z.array(z.string()),
  copyToneHints: z.array(z.string()),
  sectionStrategyHints: z.array(z.string()),
  imageDirectionHints: z.array(z.string()),
  avoidList: z.array(z.string()),
  warnings: z.array(z.string()),
});

// ---------- 기획 에이전트 (docs/PROMPTS.md "기획 에이전트 프롬프트") ----------

export const planningOutputSchema = z.object({
  strategySummary: z.string(),
  targetAngle: z.string(),
  primarySellingPoint: z.string(),
  toneGuide: z.string(),
  visualGuide: z.string(),
  sectionPlan: z.array(
    z.object({
      kind: z.string(),
      goal: z.string(),
      keyMessage: z.string(),
      imageRole: z.string(),
      copyNotes: z.array(z.string()),
    })
  ),
  mustAvoid: z.array(z.string()),
  warnings: z.array(z.string()),
});

// ---------- 제작 에이전트 (docs/PROMPTS.md "AI 상세페이지 생성 프롬프트") ----------

// `review_summary`는 DetailBlockLayoutType 19개 중 section-canvas.tsx의
// StructuredSectionBlock에 렌더 분기가 없는 죽은 타입이라 승인 목록에서 제외한다
// (docs/TASKS.md 우선순위 1/2 조사에서 확인).
export const APPROVED_DETAIL_BLOCK_LAYOUT_TYPES = [
  "top_notice_banner",
  "problem_hook",
  "big_claim_band",
  "material_closeup",
  "before_after_compare",
  "feature_blue_panel",
  "evidence_card",
  "option_grid",
  "step_guide",
  "comparison_table",
  "product_info_table",
  "qa_list",
  "brand_mood_story",
  "color_lineup",
  "care_guide",
  "certification_stack",
  "check_point_cards",
  "policy_notice",
] as const;

export const detailBlockLayoutTypeSchema = z.enum(APPROVED_DETAIL_BLOCK_LAYOUT_TYPES);

// 스타일 세트의 섹션 kind별 선호 layoutType — AI 응답 스키마가 아니라 /api/agent-workflow/generate
// 요청 바디의 일부라 detailBlockLayoutTypeSchema를 그대로 재사용해도 OpenAI strict-mode
// 제약(옵셔널 필드는 .optional() 대신 .nullable())은 적용 안 됨 — 그건 Output.object로
// 넘어가는 스키마에만 해당.
export const preferredLayoutByKindSchema = z.record(z.string(), detailBlockLayoutTypeSchema).optional();

// DetailOptionItem/DetailStepItem의 imageUrl은 제외 — 이미지는 AI가 아니라
// 기존 이미지 파이프라인(getMockReferencesForSection/generateSectionImages)이 담당한다.
//
// 모든 "선택적" 필드는 .optional()이 아니라 .nullable()로 정의한다 — OpenAI
// structured output의 strict JSON-schema 모드는 모든 프로퍼티가 반드시
// `required`에 들어있어야 하고, "선택적"은 오직 nullable 타입으로만 표현할 수
// 있다(.optional()로 값을 아예 생략하면 400 invalid_json_schema 에러). 실제로
// 이 제약을 어겨 라이브 호출이 매번 실패하는 것을 확인 후 전부 수정함 —
// production.ts의 stripNullSlotValues가 null을 다시 undefined로 되돌려
// DetailBlockSlots(types.ts)와 타입을 맞춘다.
const detailOptionItemSchema = z.object({
  label: z.string(),
  value: z.string().nullable(),
  description: z.string().nullable(),
  color: z.string().nullable(),
});
const detailSpecRowSchema = z.object({ label: z.string(), value: z.string() });
const detailFaqItemSchema = z.object({ question: z.string(), answer: z.string() });
const detailGuideItemSchema = z.object({ title: z.string(), body: z.string(), icon: z.string().nullable() });
const detailProofItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  description: z.string().nullable(),
});
const detailStepItemSchema = z.object({ title: z.string(), body: z.string() });
const detailComparisonRowSchema = z.object({ label: z.string(), left: z.string(), right: z.string() });

// types.ts의 DetailBlockSlots를 그대로 미러링한 flat 스키마 — 19개 layoutType이
// 전부 공유하는 단일 옵셔널 인터페이스이므로 discriminated union 대신 이 형태를
// 유지한다 (docs/TASKS.md 우선순위 2 계획 참고). image/images/beforeImage/
// afterImage/palette/swatches/reviewItems/score는 의도적으로 제외 — 이미지
// 파이프라인 소유이거나 죽은 review_summary 전용 필드다.
export const detailBlockSlotsSchema = z.object({
  eyebrow: z.string().nullable(),
  subHeadline: z.string().nullable(),
  badges: z.array(z.string()).nullable(),
  items: z.array(z.string()).nullable(),
  caption: z.string().nullable(),
  brandName: z.string().nullable(),
  beforeLabel: z.string().nullable(),
  afterLabel: z.string().nullable(),
  optionItems: z.array(detailOptionItemSchema).nullable(),
  specRows: z.array(detailSpecRowSchema).nullable(),
  faqItems: z.array(detailFaqItemSchema).nullable(),
  guideItems: z.array(detailGuideItemSchema).nullable(),
  proofItems: z.array(detailProofItemSchema).nullable(),
  steps: z.array(detailStepItemSchema).nullable(),
  comparisonRows: z.array(detailComparisonRowSchema).nullable(),
  cards: z.array(detailGuideItemSchema).nullable(),
  noticeItems: z.array(z.string()).nullable(),
  emphasis: z.string().nullable(),
});

export const generatedSectionSchema = z.object({
  kind: sectionKindSchema,
  kicker: z.string(),
  headline: z.string(),
  body: z.string(),
  bullets: z.array(z.string()),
  imageRole: z.string(),
  imagePrompt: z.string(),
  alternatives: z.array(z.string()),
  layoutType: detailBlockLayoutTypeSchema,
  slots: detailBlockSlotsSchema,
  /** 1문장으로 이 섹션에 이 layoutType을 고른 이유 — 운영자용 메타데이터, 화면엔 노출 안 함. */
  layoutRationale: z.string(),
});

export const productionOutputSchema = z.object({
  sections: z.array(generatedSectionSchema).length(13),
  warnings: z.array(z.string()),
});

// ---------- 검수 에이전트 (docs/PROMPTS.md "검수 에이전트 프롬프트") ----------

export const reviewOutputSchema = z.object({
  score: z.number(),
  summary: z.string(),
  issues: z.array(
    z.object({
      sectionId: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      type: z.enum(["exaggeration", "unsupported_claim", "missing_section", "readability", "platform_fit"]),
      message: z.string(),
      suggestion: z.string(),
    })
  ),
  autoFixSuggestions: z.array(
    z.object({
      sectionId: z.string(),
      field: z.string(),
      before: z.string(),
      after: z.string(),
    })
  ),
  warnings: z.array(z.string()),
});

// ---------- 기획자 에이전트 수정 요청 (docs/PROMPTS.md "기획자 에이전트 수정 요청 프롬프트") ----------

export const revisionOutputSchema = z.object({
  revisionSummary: z.string(),
  revisionScope: z.enum(["section", "multi_section", "full_draft"]),
  changedStrategy: z.string(),
  targetSections: z.array(z.string()),
  updatedToneGuide: z.string(),
  updatedVisualGuide: z.string(),
  updatedSectionPlan: z.array(
    z.object({
      kind: z.string(),
      goal: z.string(),
      keyMessage: z.string(),
      imageRole: z.string(),
      copyNotes: z.array(z.string()),
    })
  ),
  mustAvoid: z.array(z.string()),
  handoffToProduction: z.string(),
  warnings: z.array(z.string()),
});

// ---------- 경쟁 상세페이지 이미지 분석 (docs/CLAUDE_HANDOFF.md "다음 우선 작업" #6) ----------

export const competitorPageAnalysisSchema = z.object({
  summary: z.string(),
  marginRatio: z.string(),
  subjectOccupancyRatio: z.string(),
  colorPalette: z.array(z.string()),
  textDensity: z.object({
    size: z.string(),
    lineHeight: z.string(),
    placement: z.string(),
  }),
  sectionBreakdown: z.array(
    z.object({
      order: z.number(),
      sectionKind: sectionKindSchema.or(z.string()),
      description: z.string(),
      /** Headline/copy phrases actually legible in this section of the
       * image, verbatim — not paraphrased or invented. Empty array if the
       * section is image-only with no readable text. */
      visibleCopy: z.array(z.string()),
    })
  ),
  copyStyle: z.object({
    avgSentenceLength: z.string(),
    painPointStructure: z.string(),
  }),
  keywordAnalysis: z.object({
    /** 5~10 core keywords/short phrases repeated or emphasized across the
     * page, verbatim or near-verbatim from visible copy — not invented. */
    topKeywords: z.array(z.string()),
    /** One or two sentences on what theme/tone the page's keyword choices
     * center on. */
    summary: z.string(),
  }),
  presenceFlags: z.object({
    hasFaq: z.boolean(),
    hasSpecTable: z.boolean(),
    hasComparisonTable: z.boolean(),
    hasHookSection: z.boolean(),
  }),
  needsVerification: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type CompetitorPageAnalysis = z.infer<typeof competitorPageAnalysisSchema>;

export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;
export type PlanningOutput = z.infer<typeof planningOutputSchema>;
export type ProductionOutput = z.infer<typeof productionOutputSchema>;
export type ReviewOutput = z.infer<typeof reviewOutputSchema>;
export type RevisionOutput = z.infer<typeof revisionOutputSchema>;

/** Common shape returned by the analysis/planning/review agent functions (docs/lib/agents). */
export interface AgentRunResult {
  title: string;
  summary: string;
  output: Record<string, unknown>;
  warnings: string[];
  source: "ai" | "mock";
}
