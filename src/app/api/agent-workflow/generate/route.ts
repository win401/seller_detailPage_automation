import { z } from "zod";

import { runOrchestratedGeneration } from "@/lib/agents/orchestrator";
import {
  competitorReferenceInputSchema,
  generateDetailPageInputSchema,
  preferredLayoutByKindSchema,
} from "@/lib/agents/schemas";
import { DetailBlockLayoutType, SectionKind } from "@/lib/types";

export const runtime = "nodejs";

const requestSchema = z.object({
  input: generateDetailPageInputSchema,
  competitorReferences: z.array(competitorReferenceInputSchema).default([]),
  preferredLayoutByKind: preferredLayoutByKindSchema,
  styleSignalHint: z.string().optional(),
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

  const startedAt = Date.now();
  const { workflow, output } = await runOrchestratedGeneration(
    body.input,
    body.competitorReferences,
    body.preferredLayoutByKind as Partial<Record<SectionKind, DetailBlockLayoutType>> | undefined,
    body.styleSignalHint,
    body.brandNote
  );
  const generationTimeMs = Date.now() - startedAt;
  // Mock generation never calls a model — surfacing the env-configured model
  // id only when the pipeline actually ran live avoids implying a model was
  // used when it wasn't (docs/TASKS.md 최우선: mock/live·모델·생성시간 표시).
  const model = output.source === "mock" ? null : (process.env.AI_MODEL ?? "gpt-4.1-mini");
  return Response.json({ workflow, output, generationTimeMs, model });
}
