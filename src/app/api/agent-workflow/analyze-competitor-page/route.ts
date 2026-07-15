import { z } from "zod";

import { runCompetitorPageAnalysisAgent } from "@/lib/agents/competitor-analysis";

export const runtime = "nodejs";

const requestSchema = z.object({
  imageDataUrl: z.string().min(1),
  label: z.string().optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof requestSchema>;

  try {
    const json = await request.json();
    body = requestSchema.parse(json);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await runCompetitorPageAnalysisAgent(body.imageDataUrl, body.label);
  return Response.json(result);
}
