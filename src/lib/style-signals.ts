import type { SupabaseClient } from "@supabase/supabase-js";

import { StyleSignalSummary, UserStyleSignalDraft, UserStyleSignalKind } from "./types";

/** Extracted from editor/page.tsx's inline query (same select/order/limit) so
 * new/page.tsx can also load signals — previously only the editor did. No
 * project_id filter: aggregation is user-wide, not per-project (docs/TASKS.md
 * 우선순위 2/3 — matches the existing unfiltered query shape). */
export async function loadUserStyleSignals(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<UserStyleSignalDraft[]> {
  const { data, error } = await supabase
    .from("user_style_signals")
    .select("id, project_id, section_id, section_title, kind, before, after, summary, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  return data.map((signal) => ({
    id: signal.id,
    projectId: signal.project_id ?? "",
    sectionId: signal.section_id ?? undefined,
    sectionTitle: signal.section_title ?? undefined,
    kind: signal.kind as UserStyleSignalKind,
    before: signal.before ?? undefined,
    after: signal.after ?? undefined,
    summary: signal.summary,
    createdAt: signal.created_at,
  }));
}

const SNIPPET_KINDS: UserStyleSignalKind[] = ["planner_revision_apply", "copy_manual_edit", "headline_choice"];

/** Pure, deterministic — no LLM call. planner_revision_apply/copy_manual_edit/
 * headline_choice carry real text worth quoting; section_reorder/
 * section_visibility/section_image_choice are tally-only (their before/after
 * are low-semantic strings like "index:3"/"hidden", not worth diffing). */
export function summarizeStyleSignals(signals: UserStyleSignalDraft[]): StyleSignalSummary {
  const countsByKind: Partial<Record<UserStyleSignalKind, number>> = {};
  for (const signal of signals) {
    countsByKind[signal.kind] = (countsByKind[signal.kind] ?? 0) + 1;
  }

  const notableSnippets = signals
    .filter((signal) => SNIPPET_KINDS.includes(signal.kind))
    .slice(0, 8)
    .map((signal) => {
      if (signal.kind === "planner_revision_apply") {
        return `수정 요청: "${signal.after}"`;
      }
      return `"${signal.before ?? ""}" → "${signal.after ?? ""}"`;
    });

  return { totalCount: signals.length, countsByKind, notableSnippets };
}

/** Non-binding hint block, same "참고용, 안 맞으면 무시해도 됨" tone as
 * production.ts's preferredLayoutByKind hint. Returns undefined when there's
 * nothing worth saying, so callers can skip the prompt section entirely. */
export function buildStyleSignalHint(summary: StyleSignalSummary): string | undefined {
  if (summary.totalCount === 0) return undefined;

  const lines: string[] = [];
  if (summary.notableSnippets.length > 0) {
    lines.push("이 사용자가 과거에 직접 수정하거나 선택한 내용(참고용):");
    lines.push(...summary.notableSnippets.map((snippet) => `  - ${snippet}`));
  }
  const kindLabels: Record<UserStyleSignalKind, string> = {
    copy_manual_edit: "문구 직접 수정",
    headline_choice: "헤드라인 후보 선택",
    section_reorder: "섹션 순서 조정",
    section_visibility: "섹션 표시/숨김 조정",
    section_image_choice: "이미지 방향 선택",
    planner_revision_apply: "재기획 시안 적용",
  };
  const tallies = Object.entries(summary.countsByKind)
    .map(([kind, count]) => `${kindLabels[kind as UserStyleSignalKind]} ${count}회`)
    .join(", ");
  if (tallies) lines.push(`그 외 활동: ${tallies}`);

  return lines.length > 0 ? lines.join("\n") : undefined;
}
