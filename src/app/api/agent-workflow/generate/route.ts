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

  const { workflow, output } = await runOrchestratedGeneration(body.input, body.competitorReferences);
  return Response.json({ workflow, output });
}
