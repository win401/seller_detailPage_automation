"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AI_QUICK_ACTIONS, AiEditAction, DetailSection } from "@/lib/types";

export function AiAssistantPanel({
  section,
  pendingAction,
  pendingText,
  onSelectAction,
  onApply,
  onDiscard,
}: {
  section: DetailSection;
  pendingAction: AiEditAction | null;
  pendingText: string | null;
  onSelectAction: (action: AiEditAction) => void;
  onApply: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[11.5px] text-muted-foreground">선택된 섹션</div>
        <div className="text-[13px] font-bold">{section.title}</div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {AI_QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.id}
            type="button"
            onClick={() => onSelectAction(qa.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              pendingAction === qa.id
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-card-soft text-foreground"
            )}
          >
            {qa.label}
          </button>
        ))}
      </div>

      <input
        placeholder="짧게 요청해보세요 (예: 더 신뢰가 가게)"
        className="h-9 w-full rounded-lg border border-border bg-input px-3 text-sm outline-none placeholder:text-muted-foreground"
      />

      {pendingText ? (
        <div className="flex flex-col gap-2">
          <div className="rounded-lg border border-border bg-card-soft p-2.5">
            <div className="mb-0.5 text-[10.5px] font-bold text-muted-foreground">적용 전</div>
            <p className="text-xs leading-6 text-muted-foreground">{section.body}</p>
          </div>
          <div className="rounded-lg border border-primary bg-chip-active p-2.5">
            <div className="mb-0.5 text-[10.5px] font-bold text-primary">적용 후</div>
            <p className="text-xs leading-6">{pendingText}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onApply} className="h-[34px] flex-1 text-[12.5px] font-bold">
              적용하기
            </Button>
            <Button
              onClick={onDiscard}
              variant="outline"
              className="h-[34px] flex-1 text-[12.5px] font-semibold"
            >
              취소
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[11.5px] leading-6 text-muted-foreground">
          빠른 액션을 선택하면 적용 전/후를 비교할 수 있어요.
        </p>
      )}
    </div>
  );
}
