"use client";

import type { ReactNode } from "react";
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
type RenderEditableText = (
  sec: DetailSection,
  field: EditableField,
  className: string,
  editClassName: string,
  multiline?: boolean
) => ReactNode;

function BlockImage({
  section,
  className,
  overlay = true,
}: {
  section: DetailSection;
  className?: string;
  overlay?: boolean;
}) {
  const image = section.slots?.image ?? section.imageUrl;
  const backgroundImage = image ? `url(${image})` : section.imageGradient;
  const isMockImage = !image && section.imageSource !== "uploaded";

  if (!backgroundImage) {
    return (
      <div
        className={cn(
          "flex min-h-[156px] items-center justify-center bg-[linear-gradient(135deg,#f4f0e8,#d7cab8)] text-center text-[11px] font-bold text-canvas-muted",
          className
        )}
      >
        이미지 슬롯
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden bg-cover bg-center", className)}
      style={{
        backgroundImage,
        backgroundPosition: getImagePositionCss(section.imagePosition),
      }}
      aria-label={section.imageLabel ?? section.imageRole}
    >
      {isMockImage && (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.26),transparent_42%,rgba(0,0,0,.12))]" />
          <div className="absolute inset-x-[12%] bottom-0 h-[54%] rounded-t-[46%] border border-white/35 bg-white/14 shadow-[0_-16px_36px_rgba(255,255,255,.1)]" />
          <div className="absolute left-[22%] top-[17%] h-[20%] w-[56%] rounded-full border border-white/45 bg-white/18" />
        </>
      )}
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-black/38 via-black/5 to-transparent" />}
      {section.imageLabel && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-white">
          <span className="text-[9px] font-bold tracking-[0.16em] text-white/76">
            {isMockImage ? "IMAGE SLOT" : "PRODUCT VISUAL"}
          </span>
          <span className="truncate rounded-full border border-white/20 bg-black/20 px-2 py-1 text-[10px] font-bold backdrop-blur-sm">
            {section.imageLabel}
          </span>
        </div>
      )}
    </div>
  );
}

function StructuredSectionBlock({
  section,
  index,
  sectionCount,
  isSelected,
  isFlash,
  onSelect,
  renderEditableText,
}: {
  section: DetailSection;
  index: number;
  sectionCount: number;
  isSelected: boolean;
  isFlash: boolean;
  onSelect: (id: string) => void;
  renderEditableText: RenderEditableText;
}) {
  const slots = section.slots ?? {};
  const layoutType = section.layoutType;
  const sectionFrameClass = cn(
    "cursor-pointer outline-offset-[-2px] transition-colors",
    index !== sectionCount - 1 && "border-b border-canvas-border",
    isSelected && "outline outline-2 outline-canvas-accent",
    isFlash && "animate-[flashHighlight_0.9s_ease]"
  );
  const headline = (className: string, editClassName = className) =>
    renderEditableText(section, "headline", className, editClassName);
  const body = (className: string, editClassName = className) =>
    renderEditableText(section, "body", className, editClassName, true);

  return (
    <section
      data-section-id={section.id}
      onClick={() => onSelect(section.id)}
      className={sectionFrameClass}
    >
      {layoutType === "brand_mood_story" && (
        <div className="bg-[#f7f4ec]">
          <BlockImage section={section} className="h-[390px]" />
          <div className="px-8 py-10 text-center">
            {slots.brandName && (
              <div className="mb-5 font-serif text-[22px] font-semibold text-[#263126]">{slots.brandName}</div>
            )}
            <div className="mb-3 text-[10px] font-extrabold tracking-[0.22em] text-[#5f765f]">
              {slots.eyebrow ?? section.kicker}
            </div>
            {headline("text-[28px] font-bold leading-[1.22] text-canvas-dark")}
            <div className="mx-auto mt-4 h-px w-12 bg-[#7f9474]" />
            {body("mt-5 text-[13px] leading-[1.9] text-canvas-muted")}
            {slots.badges && (
              <div className="mt-7 grid grid-cols-3 gap-2">
                {slots.badges.map((badge) => (
                  <div
                    key={badge}
                    className="rounded-full bg-white px-2 py-3 text-[10px] font-bold text-[#5d6f5b] shadow-sm"
                  >
                    {badge}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {layoutType === "big_claim_band" && (
        <div className="bg-[#405f48] px-7 py-11 text-center text-white">
          <div className="mb-3 text-[10px] font-extrabold tracking-[0.28em] text-white/70">
            {section.kicker}
          </div>
          {headline("text-[29px] font-extrabold leading-[1.2] text-white")}
          {slots.subHeadline && (
            <p className="mt-3 text-[13px] font-semibold text-white/82">{slots.subHeadline}</p>
          )}
          <BlockImage section={section} className="mt-8 h-[240px] rounded-[2px]" />
          {body("mt-6 text-[13px] leading-[1.75] text-white/82")}
          {slots.badges && (
            <div className="mt-7 grid grid-cols-3 gap-2">
              {slots.badges.map((badge) => (
                <span key={badge} className="rounded-full bg-white/16 px-2 py-2 text-[10px] font-bold">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {layoutType === "problem_hook" && (
        <div className="bg-white px-7 py-10">
          <div className="mb-4 inline-flex rounded-full bg-[#f1e8dc] px-3 py-1 text-[10px] font-extrabold text-[#6e5b49]">
            {section.kicker}
          </div>
          {headline("text-[25px] font-extrabold leading-[1.25] tracking-tight text-canvas-dark")}
          {body("mt-4 text-[13px] leading-[1.8] text-canvas-muted")}
          <div className="mt-7 space-y-2.5">
            {(section.bullets.length > 0
              ? section.bullets
              : ["작은 사이즈로 불편한 사용감", "거친 촉감과 낮은 흡수감", "욕실 분위기와 맞지 않는 컬러"]
            ).map((item, itemIndex) => (
              <div key={item} className="flex items-center gap-3 bg-[#f8f6f1] px-3 py-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#526f58] text-[11px] font-extrabold text-white">
                  {itemIndex + 1}
                </span>
                <span className="text-[12px] font-semibold leading-relaxed text-canvas-dark">{item}</span>
              </div>
            ))}
          </div>
          <BlockImage section={section} className="mt-7 h-[180px]" />
        </div>
      )}

      {layoutType === "material_closeup" && (
        <div className="bg-[#fbfaf7]">
          <div className="px-7 py-8">
            <div className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-[#6e8068]">
              {section.kicker}
            </div>
            {headline("text-[23px] font-extrabold leading-[1.25] text-canvas-dark")}
            {body("mt-3 text-[13px] leading-[1.75] text-canvas-muted")}
          </div>
          <BlockImage section={section} className="mx-7 h-[260px]" overlay={false} />
          <div className="grid grid-cols-3 gap-px bg-[#e8e1d6] px-7 py-8">
            {(slots.badges ?? ["Soft", "Absorbent", "Daily"]).map((badge) => (
              <div key={badge} className="bg-white py-4 text-center text-[11px] font-extrabold text-[#526f58]">
                {badge}
              </div>
            ))}
          </div>
        </div>
      )}

      {layoutType === "feature_blue_panel" && (
        <div className="bg-[#1676ba] px-7 py-10 text-white">
          <div className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-white/75">
            {section.kicker}
          </div>
          {headline("text-[24px] font-extrabold leading-[1.25] tracking-tight text-white")}
          {body("mt-3 text-[13px] leading-[1.75] text-white/88")}
          <BlockImage section={section} className="mt-8 h-[245px] rounded-[2px]" />
          {section.bullets.length > 0 && (
            <div className="mt-6 grid gap-2">
              {section.bullets.map((bullet) => (
                <div key={bullet} className="bg-white px-3 py-3 text-[12px] font-bold text-[#0f5c95]">
                  {bullet}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {layoutType === "color_lineup" && (
        <div className="bg-white px-7 py-10">
          <div className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-[#526f58]">
            {section.kicker}
          </div>
          {headline("text-[24px] font-extrabold leading-[1.25] text-canvas-dark")}
          {body("mt-3 text-[13px] leading-[1.75] text-canvas-muted")}
          <BlockImage section={section} className="mt-7 h-[220px]" overlay={false} />
          <div className="mt-7 grid grid-cols-3 gap-2">
            {(slots.optionItems ?? []).map((option) => (
              <div key={option.label} className="bg-[#f7f5ef] p-2.5 text-center">
                <span
                  className="mx-auto block size-8 rounded-full border border-black/10"
                  style={{ backgroundColor: option.color ?? "#ddd" }}
                />
                <span className="mt-2 block text-[10px] font-bold text-canvas-dark">{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {layoutType === "care_guide" && (
        <div className="bg-[#f6f8f1] px-7 py-10">
          <div className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-[#526f58]">
            {section.kicker}
          </div>
          {headline("text-[24px] font-extrabold leading-[1.25] text-canvas-dark")}
          {body("mt-3 text-[13px] leading-[1.75] text-canvas-muted")}
          <div className="mt-7 divide-y divide-[#dfe7da] bg-white">
            {(slots.guideItems ?? []).map((guide) => (
              <div key={guide.title} className="flex gap-4 p-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#526f58] text-[11px] font-extrabold text-white">
                  {guide.icon ?? "✓"}
                </span>
                <div>
                  <div className="text-[13px] font-extrabold text-canvas-dark">{guide.title}</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-canvas-muted">{guide.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {layoutType === "check_point_cards" && (
        <div className="bg-[#a1846b] px-7 py-11 text-white">
          <div className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-white/70">
            {section.kicker}
          </div>
          {headline("text-[24px] font-extrabold leading-[1.25] text-white")}
          {body("mt-3 text-[13px] leading-[1.75] text-white/85")}
          <div className="mt-8 grid gap-2.5">
            {(slots.cards ?? []).map((card, cardIndex) => (
              <div key={card.title} className="grid grid-cols-[32px_1fr] gap-3 bg-white/92 p-4 text-canvas-dark">
                <div className="flex size-8 items-center justify-center rounded-full bg-[#a1846b] text-[11px] font-extrabold text-white">
                  {String(cardIndex + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="text-[13px] font-extrabold">{card.title}</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-canvas-muted">{card.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {layoutType === "product_info_table" && (
        <div className="bg-white px-7 py-11">
          <div className="text-[10px] font-extrabold tracking-[0.22em] text-[#526f58]">PRODUCT INFO</div>
          {headline("mt-3 text-[28px] font-extrabold leading-[1.2] text-canvas-dark")}
          <div className="mt-2 text-[14px] text-canvas-muted">Product Information</div>
          {body("mt-4 text-[12px] leading-[1.7] text-canvas-muted")}
          <div className="mt-6 border-t-2 border-canvas-dark">
            {(slots.specRows ?? []).map((row) => (
              <div key={row.label} className="grid grid-cols-[82px_1fr] border-b border-canvas-border py-3.5">
                <div className="text-[12px] font-bold text-canvas-muted">[{row.label}]</div>
                <div className="text-[12.5px] font-semibold leading-relaxed text-canvas-dark">{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {layoutType === "policy_notice" && (
        <div className="bg-[#f8f8f8] px-7 py-10">
          <div className="border-l-4 border-[#526f58] pl-4">
            {headline("text-[23px] font-extrabold leading-[1.25] text-canvas-dark")}
            {slots.emphasis && (
              <div className="mt-2 text-[12px] font-extrabold text-[#526f58]">{slots.emphasis}</div>
            )}
          </div>
          <ul className="mt-6 space-y-3">
            {(slots.noticeItems ?? [section.body]).map((notice) => (
              <li key={notice} className="text-[12px] font-semibold leading-[1.75] text-canvas-muted">
                · {notice}
              </li>
            ))}
          </ul>
        </div>
      )}

      {layoutType === "qa_list" && (
        <div className="bg-white px-7 py-10">
          <div className="mb-3 text-center text-[32px] font-black tracking-tight text-canvas-dark">FAQ</div>
          {body("mx-auto max-w-[260px] text-center text-[12px] leading-[1.7] text-canvas-muted")}
          <div className="mt-7 space-y-3">
            {(slots.faqItems ?? []).map((faq) => (
              <div key={faq.question} className="bg-[#f5f6f2] p-4">
                <div className="text-[12px] font-extrabold text-canvas-dark">Q. {faq.question}</div>
                <div className="mt-2 text-[12px] leading-relaxed text-canvas-muted">A. {faq.answer}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {![
        "brand_mood_story",
        "big_claim_band",
        "problem_hook",
        "material_closeup",
        "feature_blue_panel",
        "color_lineup",
        "care_guide",
        "check_point_cards",
        "product_info_table",
        "policy_notice",
        "qa_list",
      ].includes(layoutType ?? "") && (
        <div className="bg-white px-7 py-10">
          <div className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-canvas-accent">
            {section.kicker}
          </div>
          {headline("text-[24px] font-extrabold leading-[1.25] text-canvas-dark")}
          {body("mt-3 text-[13px] leading-[1.75] text-canvas-muted")}
        </div>
      )}
    </section>
  );
}

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

  function renderEditableText(
    sec: DetailSection,
    field: EditableField,
    className: string,
    editClassName: string,
    multiline = false
  ) {
    const isEditing = editingCell?.sectionId === sec.id && editingCell.field === field;

    if (isEditing && multiline) {
      return (
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
            "w-full resize-none rounded border border-dashed bg-transparent outline-none",
            editClassName
          )}
        />
      );
    }

    if (isEditing) {
      return (
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
          className={cn("w-full rounded border border-dashed bg-transparent outline-none", editClassName)}
        />
      );
    }

    return (
      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          startEdit(sec, field);
        }}
        className={cn("cursor-text", className)}
      >
        {field === "headline" ? sec.headline : sec.body}
      </div>
    );
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
          if (sec.layoutType) {
            return (
              <StructuredSectionBlock
                key={sec.id}
                section={sec}
                index={i}
                sectionCount={sections.length}
                isSelected={isSelected}
                isFlash={isFlash}
                onSelect={onSelect}
                renderEditableText={renderEditableText}
              />
            );
          }

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
