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

export const generatedSectionSchema = z.object({
  kind: sectionKindSchema,
  kicker: z.string(),
  headline: z.string(),
  body: z.string(),
  bullets: z.array(z.string()),
  imageRole: z.string(),
  imagePrompt: z.string(),
  alternatives: z.array(z.string()),
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
