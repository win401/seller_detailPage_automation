import { z } from "zod";

import { runCompetitorPageAnalysisAgent } from "@/lib/agents/competitor-analysis";
import { AuthError, requireAdmin } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";

const requestSchema = z.object({
  imageDataUrl: z.string().min(1),
  label: z.string().optional(),
  // Present only for the admin multi-page flow (/admin/reference-analysis,
  // 우선순위 5 Phase 1) — the existing single-image `/competitor-analysis`
  // MVP never sends this and stays fully unauthenticated, unchanged.
  referenceId: z.string().optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof requestSchema>;

  try {
    const json = await request.json();
    body = requestSchema.parse(json);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  let supabase;
  if (body.referenceId) {
    try {
      ({ supabase } = await requireAdmin(request));
    } catch (error) {
      if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  let runId: string | undefined;
  if (supabase && body.referenceId) {
    const { data: run } = await supabase
      .from("competitor_analysis_runs")
      .insert({ reference_id: body.referenceId, status: "running", model: process.env.AI_MODEL ?? "gpt-4.1-mini" })
      .select("id")
      .single();
    runId = run?.id;
  }

  try {
    const result = await runCompetitorPageAnalysisAgent(body.imageDataUrl, body.label);

    if (supabase && body.referenceId) {
      if (runId) {
        await supabase
          .from("competitor_analysis_runs")
          .update({ status: "completed", result: result.analysis, completed_at: new Date().toISOString() })
          .eq("id", runId);
      }
      await supabase
        .from("competitor_page_analyses")
        .update({
          analysis: result.analysis,
          analysis_status: "completed",
          source: result.source,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.referenceId);
    }

    return Response.json(result);
  } catch (error) {
    if (supabase && runId) {
      await supabase
        .from("competitor_analysis_runs")
        .update({ status: "failed", error: error instanceof Error ? error.message : String(error) })
        .eq("id", runId);
    }
    throw error;
  }
}
