"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

import { cn } from "@/lib/utils";
import { DetailSection, PLATFORM_EXPORT_WIDTH, Platform } from "@/lib/types";
import {
  getBodyTextClass,
  getHeadlineTextClass,
  getImageFitClass,
  getImageHeightClass,
  getImagePositionCss,
  getSpacingClasses,
} from "@/lib/layout-presets";

type EditableField = "headline" | "body";
type EditingCell = { sectionId: string; field: EditableField };

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
  onCommitText,
}: {
  sections: DetailSection[];
  selectedId: string;
  flashId: string | null;
  platform: Platform;
  onSelect: (id: string) => void;
  /** Double-click inline edit commit (docs/TASKS.md §7). before/after let the
   * caller decide whether anything actually changed. */
  onCommitText: (sectionId: string, field: EditableField, before: string, after: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [draftValue, setDraftValue] = useState("");

  useEffect(() => {
    if (!flashId || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = canvasRef.current?.querySelector<HTMLElement>(
      `[data-section-id="${CSS.escape(flashId)}"]`
    );
    if (!target) return;

    gsap.fromTo(
      target,
      { y: -4, boxShadow: "0 0 0 0 rgba(204, 95, 51, 0.45)" },
      {
        y: 0,
        boxShadow: "0 0 0 12px rgba(204, 95, 51, 0)",
        duration: 0.72,
        ease: "power3.out",
      }
    );
  }, [flashId]);

  function startEdit(sec: DetailSection, field: EditableField) {
    onSelect(sec.id);
    setEditingCell({ sectionId: sec.id, field });
    setDraftValue(field === "headline" ? sec.headline : sec.body);
  }

  function commitEdit(sec: DetailSection) {
    if (!editingCell || editingCell.sectionId !== sec.id) return;
    const before = editingCell.field === "headline" ? sec.headline : sec.body;
    onCommitText(sec.id, editingCell.field, before, draftValue);
    setEditingCell(null);
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  return (
    <div
      ref={canvasRef}
      className="w-[360px] max-w-full shrink-0 overflow-hidden rounded-xl border border-canvas-border bg-canvas-bg shadow-[0_10px_28px_rgba(23,32,28,0.14)]"
    >
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
              data-section-id={sec.id}
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
                  className={cn(
                    "border-b border-canvas-border",
                    getImageHeightClass(sec.imageHeight),
                    getImageFitClass(sec.imageFit)
                  )}
                  style={{
                    backgroundImage: sec.imageUrl
                      ? `url(${sec.imageUrl})`
                      : sec.imageGradient,
                    backgroundPosition: getImagePositionCss(sec.imagePosition),
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
              <div className={getSpacingClasses(sec.spacing, isIntro || isCta)}>
                <div
                  className={cn(
                    "mb-1.5 text-[10px] font-extrabold tracking-wide",
                    isIntro || isCta ? "text-white/75" : "text-canvas-accent"
                  )}
                >
                  {sec.kicker}
                </div>
                {editingCell?.sectionId === sec.id && editingCell.field === "headline" ? (
                  <input
                    autoFocus
                    value={draftValue}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setDraftValue(e.target.value)}
                    onBlur={() => commitEdit(sec)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitEdit(sec);
                      } else if (e.key === "Escape") {
                        cancelEdit();
                      }
                    }}
                    className={cn(
                      "mb-1.5 w-full rounded border border-dashed bg-transparent font-bold tracking-tight outline-none",
                      getHeadlineTextClass(sec.textScale, isIntro || isCta),
                      isIntro || isCta
                        ? "border-white/50 text-white"
                        : "border-canvas-accent text-canvas-dark"
                    )}
                  />
                ) : (
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEdit(sec, "headline");
                    }}
                    className={cn(
                      "mb-1.5 cursor-text font-bold tracking-tight",
                      getHeadlineTextClass(sec.textScale, isIntro || isCta),
                      isIntro || isCta ? "text-white" : "text-canvas-dark"
                    )}
                  >
                    {sec.headline}
                  </div>
                )}
                {editingCell?.sectionId === sec.id && editingCell.field === "body" ? (
                  <textarea
                    autoFocus
                    rows={3}
                    value={draftValue}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setDraftValue(e.target.value)}
                    onBlur={() => commitEdit(sec)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className={cn(
                      "w-full resize-none rounded border border-dashed bg-transparent leading-relaxed outline-none",
                      getBodyTextClass(sec.textScale),
                      isIntro || isCta
                        ? "border-white/50 text-white/85"
                        : "border-canvas-accent text-canvas-muted"
                    )}
                  />
                ) : (
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEdit(sec, "body");
                    }}
                    className={cn(
                      "cursor-text leading-relaxed",
                      getBodyTextClass(sec.textScale),
                      isIntro || isCta ? "text-white/85" : "text-canvas-muted"
                    )}
                  >
                    {sec.body}
                  </div>
                )}
                {sec.bullets.length > 0 && (
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {sec.bullets.map((bullet, bulletIndex) => (
                      <li
                        key={bulletIndex}
                        className={cn(
                          "flex items-start gap-1.5 text-[12.5px] leading-relaxed",
                          isIntro || isCta ? "text-white/85" : "text-canvas-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-[3px] size-3.5 shrink-0 rounded-full text-center text-[9px] font-extrabold leading-[14px]",
                            isIntro || isCta
                              ? "bg-white/20 text-white"
                              : "bg-canvas-accent/15 text-canvas-accent"
                          )}
                        >
                          ✓
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
