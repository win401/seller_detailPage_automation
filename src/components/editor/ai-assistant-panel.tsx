"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { renderRichText } from "@/lib/rich-text";
import { DetailSection } from "@/lib/types";

const REVISION_EXAMPLES = [
  "전체 톤을 더 프리미엄하게",
  "선택 섹션을 짧고 강하게",
  "검수 경고를 반영해서 과장 표현 줄이기",
  "FAQ/CTA는 더 짧고 간결하게 축약해줘",
];

export function AiAssistantPanel({
  section,
  request,
  pendingSections,
  onChangeRequest,
  onGenerate,
  onApply,
  onDiscard,
  isRevising,
}: {
  section: DetailSection;
  request: string;
  pendingSections: DetailSection[] | null;
  onChangeRequest: (value: string) => void;
  onGenerate: (request: string) => void;
  onApply: () => void;
  onDiscard: () => void;
  isRevising: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<HTMLDivElement>(null);
  const pendingSection = pendingSections?.find((item) => item.id === section.id);

  useEffect(() => {
    const root = panelRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const controls = root.querySelectorAll("[data-ai-control]");
    gsap.fromTo(
      controls,
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: 0.36, ease: "power3.out", stagger: 0.045 }
    );
  }, []);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending || !pendingSection || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.fromTo(
      pending,
      { autoAlpha: 0, y: 14, scale: 0.98 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: "back.out(1.35)" }
    );
  }, [pendingSection?.body, pendingSection]);

  return (
    <div ref={panelRef} className="flex flex-col gap-3">
      <div data-ai-control>
        <div className="text-[11.5px] text-muted-foreground">기획자 에이전트</div>
        <div className="text-[13px] font-bold">{section.title} 중심으로 수정 요청</div>
        <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
          요청을 보내면 분석/기획 맥락을 기준으로 새 시안 후보를 만들고, 적용 시 캔버스 전체에 반영합니다.
        </p>
      </div>

      <div data-ai-control className="flex flex-wrap gap-1.5">
        {REVISION_EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onChangeRequest(example)}
            className="rounded-full border border-border bg-card-soft px-3 py-1.5 text-xs font-semibold transition-colors hover:border-accent hover:text-accent"
          >
            {example}
          </button>
        ))}
      </div>

      <Textarea
        data-ai-control
        rows={3}
        value={request}
        onChange={(event) => onChangeRequest(event.target.value)}
        placeholder="예: 첫 화면은 더 감성적으로, FAQ는 짧게, 전체적으로 공구 느낌은 줄여줘"
      />
      <Button
        data-ai-control
        onClick={() => onGenerate(request)}
        className="h-[36px] text-[12.5px] font-bold"
        disabled={!request.trim() || isRevising}
      >
        {isRevising ? "재기획 중..." : "재기획 시안 만들기"}
      </Button>

      {pendingSection ? (
        <div ref={pendingRef} className="flex flex-col gap-2">
          <div className="rounded-lg border border-border bg-card-soft p-2.5">
            <div className="mb-0.5 text-[10.5px] font-bold text-muted-foreground">적용 전</div>
            <p className="text-xs leading-6 text-muted-foreground">{renderRichText(section.body)}</p>
          </div>
          <div className="rounded-lg border border-primary bg-chip-active p-2.5">
            <div className="mb-0.5 text-[10.5px] font-bold text-primary">새 시안 후보</div>
            <p className="text-xs leading-6">{renderRichText(pendingSection.body)}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onApply} className="h-[34px] flex-1 text-[12.5px] font-bold">
              새 시안 적용
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
        <p data-ai-control className="text-[11.5px] leading-6 text-muted-foreground">
          아직 생성된 수정 시안이 없습니다. 요청을 입력한 뒤 재기획 시안을 만들어보세요.
        </p>
      )}
    </div>
  );
}
