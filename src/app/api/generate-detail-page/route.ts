import { runProductionAgent } from "@/lib/agents/production";
import { generateDetailPageInputSchema } from "@/lib/agents/schemas";
import { GenerateDetailPageInput } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input: GenerateDetailPageInput;

  try {
    const json = await request.json();
    input = generateDetailPageInputSchema.parse(json);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const output = await runProductionAgent(input);
  return Response.json(output);
}
