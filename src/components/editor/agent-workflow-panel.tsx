"use client";

import { AlertTriangle, CheckCircle2, CircleDashed, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AgentRunDraft, AgentRunStatus, AgentWorkflowDraft, AgentType } from "@/lib/types";
import { cn } from "@/lib/utils";

const AGENT_LABELS: Record<AgentType, string> = {
  orchestrator: "총괄",
  analysis: "분석",
  planning: "기획",
  production: "제작",
  review: "검수",
  revision_planning: "재기획",
  style_signal_summary: "스타일 학습",
};

const STATUS_LABELS: Record<AgentRunStatus, string> = {
  pending: "대기",
  running: "진행",
  succeeded: "완료",
  failed: "실패",
  mocked: "Mock",
};

function StatusIcon({ status }: { status: AgentRunStatus }) {
  if (status === "succeeded" || status === "mocked") {
    return <CheckCircle2 className="size-3.5 text-primary" />;
  }
  if (status === "failed") return <AlertTriangle className="size-3.5 text-destructive" />;
  if (status === "running") return <Clock3 className="size-3.5 text-accent" />;
  return <CircleDashed className="size-3.5 text-muted-foreground" />;
}

function RunCard({ run }: { run: AgentRunDraft }) {
  const outputPreview = Object.entries(run.output)
    .slice(0, 2)
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.slice(0, 3).join(", ")}`;
      if (typeof value === "string") return `${key}: ${value}`;
      return "";
    })
    .filter(Boolean);

  return (
    <div className="rounded-lg border border-border bg-card-soft p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <StatusIcon status={run.status} />
            <span className="text-xs font-bold">{AGENT_LABELS[run.agentType]}</span>
          </div>
          <div className="mt-1 truncate text-[12px] font-semibold text-muted-foreground">
            {run.title}
          </div>
        </div>
        <Badge variant={run.status === "failed" ? "destructive" : "secondary"}>
          {STATUS_LABELS[run.status]}
        </Badge>
      </div>
      <p className="text-[11.5px] leading-5 text-muted-foreground">{run.summary}</p>
      {outputPreview.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-border pt-2">
          {outputPreview.map((line) => (
            <div key={line} className="line-clamp-1 text-[11px] text-muted-foreground">
              {line}
            </div>
          ))}
        </div>
      )}
      {run.warnings.length > 0 && (
        <div className="mt-2 rounded-md bg-accent-soft px-2 py-1.5 text-[11px] leading-5 text-accent">
          {run.warnings[0]}
        </div>
      )}
    </div>
  );
}

export function AgentWorkflowPanel({
  workflow,
  compact = false,
}: {
  workflow: AgentWorkflowDraft | null;
  compact?: boolean;
}) {
  if (!workflow) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card-soft p-3">
        <div className="text-xs font-bold">에이전트 결과 없음</div>
        <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
          새 상세페이지 만들기에서 초안을 생성하면 분석, 기획, 제작, 검수 결과가 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold">에이전트 워크플로우</div>
          <Badge variant="outline">{workflow.competitorReferences.length} refs</Badge>
        </div>
        {!compact && (
          <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
            경쟁 URL은 참고 링크로만 저장하며, 사용자가 입력한 메모를 바탕으로 분석 흐름을 구성합니다.
          </p>
        )}
      </div>

      {workflow.competitorReferences.length > 0 && !compact && (
        <div className="rounded-lg border border-border bg-card-soft p-3">
          <div className="mb-1 text-[11.5px] font-bold">경쟁/레퍼런스 입력</div>
          <div className="space-y-1.5">
            {workflow.competitorReferences.slice(0, 3).map((ref) => (
              <div key={ref.id} className="min-w-0">
                <div className="truncate text-[11px] font-semibold">{ref.url}</div>
                {ref.memo && (
                  <div className="line-clamp-1 text-[11px] text-muted-foreground">{ref.memo}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
        {workflow.runs.map((run) => (
          <RunCard key={run.id} run={run} />
        ))}
      </div>
    </div>
  );
}
