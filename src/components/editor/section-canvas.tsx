"use client";

import { cn } from "@/lib/utils";
import { DetailSection, PLATFORM_EXPORT_WIDTH, Platform } from "@/lib/types";

/**
 * The mobile detail-page canvas. Colors here are intentionally the
 * canvas-* fixed tokens (not the app's light/dark theme) — the exported
 * detail page keeps its own look regardless of the editor's theme
 * (docs/MVP_PLAN.md §9).
 */
export function SectionCanvas({
  sections,
  selectedId,
  flashId,
  platform,
  onSelect,
}: {
  sections: DetailSection[];
  selectedId: string;
  flashId: string | null;
  platform: Platform;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="w-[360px] max-w-full shrink-0 overflow-hidden rounded-xl border border-canvas-border bg-canvas-bg shadow-[0_10px_28px_rgba(23,32,28,0.14)]">
      <div className="flex h-[34px] items-center justify-between border-b border-canvas-border bg-canvas-soft px-3.5 text-[11px] font-bold text-canvas-dark">
        <span>상세페이지 캔버스</span>
        <span className="font-semibold text-canvas-muted">
          {platform} · {PLATFORM_EXPORT_WIDTH[platform]}px
        </span>
      </div>
      <div className="flex flex-col">
        {sections.map((sec, i) => {
          const isSelected = sec.id === selectedId;
          const isFlash = sec.id === flashId;
          const isCta = sec.kind === "cta";
          const isIntro = sec.kind === "intro";
          const hasImage = !!sec.imageUrl || !!sec.imageGradient;
          return (
            <div
              key={sec.id}
              onClick={() => onSelect(sec.id)}
              className={cn(
                "cursor-pointer outline-offset-[-2px] transition-colors",
                i !== sections.length - 1 && "border-b border-canvas-border",
                isCta && "bg-canvas-primary",
                !isCta && isIntro && "bg-canvas-dark",
                !isCta && !isIntro && isSelected && "bg-[#f6f1e9]",
                !isCta && !isIntro && !isSelected && "bg-canvas-bg",
                isSelected && "outline outline-2 outline-canvas-accent",
                isFlash && "animate-[flashHighlight_0.9s_ease]"
              )}
            >
              {hasImage && (
                <div
                  className="h-36 border-b border-canvas-border bg-cover bg-center"
                  style={{
                    backgroundImage: sec.imageUrl
                      ? `url(${sec.imageUrl})`
                      : sec.imageGradient,
                  }}
                  aria-label={sec.imageLabel ?? sec.imageRole}
                >
                  <div className="flex h-full items-end bg-gradient-to-t from-black/24 to-transparent p-3">
                    <span className="rounded-full bg-white/85 px-2 py-1 text-[10px] font-bold text-canvas-dark">
                      {sec.imageLabel ?? sec.imageRole}
                    </span>
                  </div>
                </div>
              )}
              <div className={cn("px-5", isIntro || isCta ? "py-6.5" : "py-5")}>
                <div
                  className={cn(
                    "mb-1.5 text-[10px] font-extrabold tracking-wide",
                    isIntro || isCta ? "text-white/75" : "text-canvas-accent"
                  )}
                >
                  {sec.kicker}
                </div>
                <div
                  className={cn(
                    "mb-1.5 font-bold tracking-tight",
                    isIntro || isCta ? "text-[19px] text-white" : "text-[15px] text-canvas-dark"
                  )}
                >
                  {sec.headline}
                </div>
                <div
                  className={cn(
                    "text-[13px] leading-relaxed",
                    isIntro || isCta ? "text-white/85" : "text-canvas-muted"
                  )}
                >
                  {sec.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
