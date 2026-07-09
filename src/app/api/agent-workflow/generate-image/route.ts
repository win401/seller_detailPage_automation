import { z } from "zod";

import { runImageAgent } from "@/lib/agents/image";

export const runtime = "nodejs";

const requestSchema = z.object({
  prompt: z.string().min(1),
  referenceImageDataUrl: z.string().optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof requestSchema>;

  try {
    const json = await request.json();
    body = requestSchema.parse(json);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await runImageAgent(body.prompt, body.referenceImageDataUrl);

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json({ dataUrl: result.dataUrl });
}
