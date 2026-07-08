"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DetailSection } from "@/lib/types";

export function SectionEditPanel({
  section,
  hidden,
  onChangeBody,
  onMoveUp,
  onMoveDown,
  onToggleHide,
  onRegenerate,
}: {
  section: DetailSection;
  hidden: boolean;
  onChangeBody: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleHide: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <Label>본문</Label>
        <Textarea rows={5} value={section.body} onChange={(e) => onChangeBody(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button onClick={onMoveUp} variant="outline" className="h-8 flex-1 text-xs font-semibold">
          위로
        </Button>
        <Button
          onClick={onMoveDown}
          variant="outline"
          className="h-8 flex-1 text-xs font-semibold"
        >
          아래로
        </Button>
        <Button
          onClick={onToggleHide}
          variant="outline"
          className="h-8 flex-1 text-xs font-semibold"
        >
          {hidden ? "섹션 표시" : "섹션 숨기기"}
        </Button>
      </div>
      <Button
        onClick={onRegenerate}
        variant="outline"
        className="mt-1 h-[38px] gap-1.5 text-[12.5px] font-bold text-accent"
      >
        <RefreshCw className="size-3.5" />이 섹션 다시 생성
      </Button>
    </div>
  );
}
