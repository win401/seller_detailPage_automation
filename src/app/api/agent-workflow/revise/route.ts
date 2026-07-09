import { z } from "zod";

import { runOrchestratedRevision } from "@/lib/agents/orchestrator";
import {
  AnalysisOutput,
  PlanningOutput,
  ReviewOutput,
  generateDetailPageInputSchema,
  sectionKindSchema,
} from "@/lib/agents/schemas";

export const runtime = "nodejs";

const detailSectionSchema = z.object({
  id: z.string(),
  kind: sectionKindSchema,
  kicker: z.string(),
  title: z.string(),
  headline: z.string(),
  body: z.string(),
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
    body.reviewOutput as ReviewOutput | undefined
  );

  return Response.json(result);
}
