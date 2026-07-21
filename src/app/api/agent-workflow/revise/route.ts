import { z } from "zod";

import { runOrchestratedRevision } from "@/lib/agents/orchestrator";
import {
  AnalysisOutput,
  detailBlockLayoutTypeSchema,
  PlanningOutput,
  preferredLayoutByKindSchema,
  ReviewOutput,
  generateDetailPageInputSchema,
  sectionKindSchema,
} from "@/lib/agents/schemas";
import { DetailBlockLayoutType, SectionKind } from "@/lib/types";

export const runtime = "nodejs";

const textRunSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  highlight: z.boolean().optional(),
});
const richTextSchema = z.array(textRunSchema);

// Plain client round-trip validation, not AI-facing structured output — uses
// .optional() (matching DetailBlockSlots exactly) rather than the AI schema's
// .nullable() (schemas.ts's detailBlockSlotsSchema, required for OpenAI's
// strict mode). Includes the image-bearing fields the AI-facing schema
// deliberately excludes, since this is real section data, not a model prompt.
const detailOptionItemRoundTripSchema = z.object({
  label: z.string(),
  value: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  imageUrl: z.string().optional(),
});
const detailStepItemRoundTripSchema = z.object({
  title: z.string(),
  body: z.string(),
  imageUrl: z.string().optional(),
});
const detailGuideItemRoundTripSchema = z.object({
  title: z.string(),
  body: z.string(),
  icon: z.string().optional(),
});
const detailSlotsRoundTripSchema = z.object({
  eyebrow: z.string().optional(),
  subHeadline: z.string().optional(),
  badges: z.array(z.string()).optional(),
  items: z.array(z.string()).optional(),
  caption: z.string().optional(),
  brandName: z.string().optional(),
  palette: z.array(z.string()).optional(),
  swatches: z.array(z.string()).optional(),
  beforeLabel: z.string().optional(),
  afterLabel: z.string().optional(),
  beforeImage: z.string().optional(),
  afterImage: z.string().optional(),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
  optionItems: z.array(detailOptionItemRoundTripSchema).optional(),
  specRows: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  faqItems: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  guideItems: z.array(detailGuideItemRoundTripSchema).optional(),
  proofItems: z.array(z.object({ label: z.string(), value: z.string(), description: z.string().optional() })).optional(),
  steps: z.array(detailStepItemRoundTripSchema).optional(),
  comparisonRows: z.array(z.object({ label: z.string(), left: z.string(), right: z.string() })).optional(),
  reviewItems: z.array(z.string()).optional(),
  score: z.string().optional(),
  cards: z.array(detailGuideItemRoundTripSchema).optional(),
  noticeItems: z.array(z.string()).optional(),
  emphasis: z.string().optional(),
});

const detailSectionSchema = z.object({
  id: z.string(),
  kind: sectionKindSchema,
  // Zod object schemas strip unrecognized keys by default — without these,
  // every section round-tripped through this endpoint silently lost its
  // blockRole/layoutType/slots/layoutRationale, so any kind the revision
  // didn't touch (returned as `original` verbatim in orchestrator.ts's merge)
  // came back with layoutType undefined, falling through to the renderer's
  // bare kicker/headline/body fallback (real bug, found while wiring
  // preferredLayoutByKind through here; docs/TASKS.md).
  blockRole: z
    .enum([
      "notice",
      "intro",
      "problem",
      "claim",
      "material",
      "feature",
      "option",
      "usage",
      "guide",
      "trust",
      "spec",
      "faq",
      "policy",
      "cta",
    ])
    .optional(),
  layoutType: detailBlockLayoutTypeSchema.optional(),
  slots: detailSlotsRoundTripSchema.optional(),
  layoutRationale: z.string().optional(),
  // SectionLayoutPreset fields — same stripping bug as above, these were also
  // missing entirely (every 여백/텍스트크기/이미지위치/폰트 customization was
  // lost on every revision, not just untouched sections).
  imagePosition: z
    .enum(["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"])
    .optional(),
  imagePositionX: z.number().optional(),
  imagePositionY: z.number().optional(),
  imageFit: z.enum(["cover", "contain"]).optional(),
  imageHeight: z.enum(["compact", "default", "tall"]).optional(),
  spacing: z.number().optional(),
  textScale: z.number().optional(),
  fontFamily: z.enum(["system", "pretendard", "gmarket-sans", "s-core-dream"]).optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
  kicker: z.string(),
  title: z.string(),
  headline: richTextSchema,
  body: richTextSchema,
  bullets: z.array(z.string()),
  imageRole: z.string(),
  imageUrl: z.string().optional(),
  imageLabel: z.string().optional(),
  imageSource: z.enum(["uploaded", "reference", "generated", "mock"]).optional(),
  imageGradient: z.string().optional(),
  imagePrompt: z.string().optional(),
  alternatives: z.array(z.string()),
});

const requestSchema = z.object({
  input: generateDetailPageInputSchema,
  currentSections: z.array(detailSectionSchema).min(1),
  selectedSectionId: z.string().optional(),
  request: z.string().min(1),
  analysisOutput: z.record(z.string(), z.unknown()).optional(),
  planningOutput: z.record(z.string(), z.unknown()).optional(),
  reviewOutput: z.record(z.string(), z.unknown()).optional(),
  preferredLayoutByKind: preferredLayoutByKindSchema,
  brandNote: z.string().optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof requestSchema>;

  try {
    const json = await request.json();
    body = requestSchema.parse(json);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await runOrchestratedRevision(
    body.input,
    body.currentSections,
    body.request,
    body.selectedSectionId,
    body.analysisOutput as AnalysisOutput | undefined,
    body.planningOutput as PlanningOutput | undefined,
    body.reviewOutput as ReviewOutput | undefined,
    body.preferredLayoutByKind as Partial<Record<SectionKind, DetailBlockLayoutType>> | undefined,
    body.brandNote
  );

  return Response.json(result);
}
