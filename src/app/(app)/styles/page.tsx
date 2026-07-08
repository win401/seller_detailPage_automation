import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { mockStyleSets } from "@/lib/mock-data";
import { MOOD_LABELS, PLATFORM_LABELS, SECTION_KIND_ORDER, TONE_LABELS } from "@/lib/types";

export default function StyleSetsPage() {
  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-8 pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">스타일 세트</h1>
          <p className="text-[13.5px] text-muted-foreground">
            반복되는 톤·색상·플랫폼 설정을 저장해두고 재사용하세요
          </p>
        </div>
        <Button className="h-[38px] gap-1.5 px-4 text-[13.5px] font-bold">
          <Plus className="size-4" />
          새 스타일 세트 만들기
        </Button>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
        {mockStyleSets.map((ss) => {
          const hiddenCount = Object.values(ss.sectionVisibility).filter(
            (v) => v === false
          ).length;
          return (
            <div key={ss.id} className="rounded-xl border border-border bg-card p-4.5">
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] font-bold">{ss.name}</span>
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-bold text-accent">
                  {PLATFORM_LABELS[ss.defaultPlatform]}
                </span>
              </div>
              <div className="my-3 flex items-center gap-2">
                <div
                  className="size-[22px] rounded-md border border-border"
                  style={{ background: ss.primaryColor }}
                />
                <div
                  className="size-[22px] rounded-md border border-border"
                  style={{ background: ss.secondaryColor }}
                />
                <span className="text-[12.5px] text-muted-foreground">대표 · 보조 색상</span>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {MOOD_LABELS[ss.defaultMood]}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {TONE_LABELS[ss.defaultTone]}
                </span>
              </div>
              <p className="text-[12.5px] leading-6 text-muted-foreground">{ss.brandNote}</p>
              <div className="mt-2.5 flex gap-1">
                {SECTION_KIND_ORDER.map((kind) => (
                  <span
                    key={kind}
                    className="h-[5px] w-2.5 rounded-full"
                    style={{
                      background:
                        ss.sectionVisibility[kind] === false ? "var(--border)" : ss.primaryColor,
                    }}
                  />
                ))}
              </div>
              {hiddenCount > 0 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {hiddenCount}개 섹션 기본 숨김
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
