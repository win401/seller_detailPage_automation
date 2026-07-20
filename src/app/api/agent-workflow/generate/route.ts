import { z } from "zod";

import { runOrchestratedGeneration } from "@/lib/agents/orchestrator";
import { competitorReferenceInputSchema, generateDetailPageInputSchema } from "@/lib/agents/schemas";

export const runtime = "nodejs";

const requestSchema = z.object({
  input: generateDetailPageInputSchema,
  competitorReferences: z.array(competitorReferenceInputSchema).default([]),
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
  const { workflow, output } = await runOrchestratedGeneration(body.input, body.competitorReferences);
  const generationTimeMs = Date.now() - startedAt;
  // Mock generation never calls a model — surfacing the env-configured model
  // id only when the pipeline actually ran live avoids implying a model was
  // used when it wasn't (docs/TASKS.md 최우선: mock/live·모델·생성시간 표시).
  const model = output.source === "mock" ? null : (process.env.AI_MODEL ?? "gpt-4.1-mini");
  return Response.json({ workflow, output, generationTimeMs, model });
}
