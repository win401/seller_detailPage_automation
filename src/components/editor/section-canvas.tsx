"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

import { MarkupToolbar } from "@/components/editor/markup-toolbar";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { getMockReferencesForSection } from "@/lib/mock-data";
import { renderRichText, richTextToPlainText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import { DetailSection, PLATFORM_EXPORT_WIDTH, Platform, RichText } from "@/lib/types";
import {
  getBodyFontSizePx,
  getFontFamilyCss,
  getHeadlineFontSizePx,
  getImageFitClass,
  getImageHeightClass,
  getImagePositionCss,
  getLetterSpacingPx,
  getLineHeightPx,
  getSpacingStyle,
} from "@/lib/layout-presets";

type EditableField = "headline" | "body";
type EditingCell = { sectionId: string; field: EditableField };
type RenderEditableText = (
  sec: DetailSection,
  field: EditableField,
  className: string,
  editClassName: string
) => ReactNode;
/** Plain-string counterpart to RenderEditableText for `section.kicker` and
 * the simple slot fields — see handleCanvasLabelCommit in editor/page.tsx
 * for the full scope note and the "kicker" / "slot.<x>" / "slot.<x>.<i>"
 * key format. */
type RenderEditableLabel = (sec: DetailSection, key: string, value: string) => ReactNode;

function BlockImage({
  section,
  className,
  overlay = true,
  imageUrlOverride,
  strictOverride = false,
  placeholderLabel = "이미지 슬롯",
}: {
  section: DetailSection;
  className?: string;
  overlay?: boolean;
  /** Explicit image URL for this particular slot — for blocks with more
   * than one image slot (e.g. before_after_compare's 전/후), where the
   * default single-image lookup below can't tell the slots apart (this
   * used to render the exact same photo in both, docs/TASKS.md 우선순위
   * 1). Ignored when unset unless strictOverride is true. */
  imageUrlOverride?: string;
  /** When true, imageUrlOverride is authoritative — no fallback to
   * section.slots?.image/imageUrl/a mock photo even if imageUrlOverride
   * itself is unset. Use for a block's second+ image slot so an
   * unassigned slot shows its own empty state instead of silently
   * duplicating the block's main image. */
  strictOverride?: boolean;
  placeholderLabel?: string;
}) {
  const savedImage = strictOverride ? imageUrlOverride : (imageUrlOverride ?? section.slots?.image ?? section.imageUrl);
  // Older local/Supabase drafts only stored a gradient. Give those drafts the
  // same photo-like mock visual as newly generated drafts without mutating data.
  const fallbackMockImage =
    !strictOverride && !savedImage && section.imageSource !== "uploaded"
      ? getMockReferencesForSection(section)[0]?.dataUrl
      : undefined;
  const image = savedImage ?? fallbackMockImage;
  const backgroundImage = image ? `url(${image})` : strictOverride ? undefined : section.imageGradient;
  const isMockImage = !savedImage && !!fallbackMockImage || section.imageSource === "reference";

  // imageFit's "cover" default matches this component's own prior hardcoded
  // bg-cover, so it's safe to apply unconditionally. imageHeight is only
  // applied when the user explicitly set it — each layoutType block below
  // hardcodes its own hand-tuned height (h-[390px], h-[240px], ...), and an
  // unconditional default (e.g. h-36) would shrink every one of them.
  const explicitHeightClass = section.imageHeight ? getImageHeightClass(section.imageHeight) : undefined;

  if (!backgroundImage) {
    return (
      <div
        className={cn(
          "flex min-h-[156px] items-center justify-center bg-[linear-gradient(135deg,#f4f0e8,#d7cab8)] text-center text-[11px] font-bold text-canvas-muted",
          className,
          explicitHeightClass
        )}
      >
        {placeholderLabel}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-center",
        getImageFitClass(section.imageFit),
        className,
        explicitHeightClass
      )}
      style={{
        backgroundImage,
        backgroundPosition: getImagePositionCss(section.imagePositionX, section.imagePositionY, section.imagePosition),
      }}
      aria-label={section.imageLabel ?? section.imageRole}
    >
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-black/38 via-black/5 to-transparent" />}
      {section.imageLabel && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-white">
          <span className="text-[9px] font-bold tracking-[0.16em] text-white/76">
            {isMockImage ? "MOCK VISUAL" : "PRODUCT VISUAL"}
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
  renderEditableLabel,
}: {
  section: DetailSection;
  index: number;
  sectionCount: number;
  isSelected: boolean;
  isFlash: boolean;
  onSelect: (id: string) => void;
  renderEditableText: RenderEditableText;
  renderEditableLabel: RenderEditableLabel;
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
    renderEditableText(section, "body", className, editClassName);
  const kicker = renderEditableLabel(section, "kicker", section.kicker);
  const label = (key: string, value: string) => renderEditableLabel(section, key, value);
  // Only overrides each block's own hand-tuned padding once the user
  // explicitly sets 섹션 여백. Inline style rather than a Tailwind class —
  // see layout-presets.ts's file header for why a continuous px value
  // can't be a dynamic arbitrary-value class.
  const spacingStyle = getSpacingStyle(section.spacing);
  const content = (className: string): { className: string; style?: CSSProperties } => ({
    className,
    style: spacingStyle,
  });

  return (
    <section
      data-section-id={section.id}
      onClick={() => onSelect(section.id)}
      className={sectionFrameClass}
    >
      {layoutType === "top_notice_banner" && (
        <div {...content("bg-[#273b34] px-6 py-7 text-center text-white")}>
          <div className="text-[9px] font-extrabold tracking-[0.22em] text-white/62">{kicker}</div>
          {headline("mt-3 text-[20px] font-extrabold leading-[1.3] text-white")}
          {body("mx-auto mt-2 max-w-[270px] text-[11px] leading-[1.65] text-white/76")}
          <div className="mt-5 grid grid-cols-3 border-y border-white/18">
            {(slots.badges ?? []).map((badge, badgeIndex) => (
              <div key={badgeIndex} className="px-1 py-3 text-[10px] font-bold text-white/90">
                {label(`slot.badges.${badgeIndex}`, badge)}
              </div>
            ))}
          </div>
          {slots.items?.[0] && (
            <div className="mt-3 text-[10px] text-white/58">{label("slot.items.0", slots.items[0])}</div>
          )}
        </div>
      )}

      {layoutType === "brand_mood_story" && (
        <div className="bg-[#f7f4ec]">
          <BlockImage section={section} className="h-[390px]" />
          <div {...content("px-8 py-10 text-center")}>
            {slots.brandName && (
              <div className="mb-5 font-serif text-[22px] font-semibold text-[#263126]">
                {label("slot.brandName", slots.brandName)}
              </div>
            )}
            <div className="mb-3 text-[10px] font-extrabold tracking-[0.22em] text-[#5f765f]">
              {slots.eyebrow ? label("slot.eyebrow", slots.eyebrow) : kicker}
            </div>
            {headline("text-[28px] font-bold leading-[1.22] text-canvas-dark")}
            <div className="mx-auto mt-4 h-px w-12 bg-[#7f9474]" />
            {body("mt-5 text-[13px] leading-[1.9] text-canvas-muted")}
            {slots.badges && (
              <div className="mt-7 grid grid-cols-3 gap-2">
                {slots.badges.map((badge, badgeIndex) => (
                  <div
                    key={badgeIndex}
                    className="rounded-full bg-white px-2 py-3 text-[10px] font-bold text-[#5d6f5b] shadow-sm"
                  >
                    {label(`slot.badges.${badgeIndex}`, badge)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {layoutType === "big_claim_band" && (
        <div {...content("bg-[#405f48] px-7 py-11 text-center text-white")}>
          <div className="mb-3 text-[10px] font-extrabold tracking-[0.28em] text-white/70">
            {kicker}
          </div>
          {headline("text-[29px] font-extrabold leading-[1.2] text-white")}
          {slots.subHeadline && (
            <p className="mt-3 text-[13px] font-semibold text-white/82">
              {label("slot.subHeadline", slots.subHeadline)}
            </p>
          )}
          <BlockImage section={section} className="mt-8 h-[240px] rounded-[2px]" />
          {body("mt-6 text-[13px] leading-[1.75] text-white/82")}
          {slots.badges && (
            <div className="mt-7 grid grid-cols-3 gap-2">
              {slots.badges.map((badge, badgeIndex) => (
                <span key={badgeIndex} className="rounded-full bg-white/16 px-2 py-2 text-[10px] font-bold">
                  {label(`slot.badges.${badgeIndex}`, badge)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {layoutType === "problem_hook" && (
        <div {...content("bg-white px-7 py-10")}>
          <div className="mb-4 inline-flex rounded-full bg-[#f1e8dc] px-3 py-1 text-[10px] font-extrabold text-[#6e5b49]">
            {kicker}
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
          <div {...content("px-7 py-8")}>
            <div className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-[#6e8068]">
              {kicker}
            </div>
            {headline("text-[23px] font-extrabold leading-[1.25] text-canvas-dark")}
            {body("mt-3 text-[13px] leading-[1.75] text-canvas-muted")}
          </div>
          <BlockImage section={section} className="mx-7 h-[260px]" overlay={false} />
          <div className="grid grid-cols-3 gap-px bg-[#e8e1d6] px-7 py-8">
            {(slots.badges ?? ["Soft", "Absorbent", "Daily"]).map((badge, badgeIndex) => (
              <div key={badgeIndex} className="bg-white py-4 text-center text-[11px] font-extrabold text-[#526f58]">
                {slots.badges ? label(`slot.badges.${badgeIndex}`, badge) : badge}
              </div>
            ))}
          </div>
        </div>
      )}

      {layoutType === "before_after_compare" && (
        <div {...content("bg-[#f6f7f4] px-7 py-10")}>
          <div className="text-center">
            <div className="text-[10px] font-extrabold tracking-[0.2em] text-[#466451]">{kicker}</div>
            {headline("mt-3 text-[24px] font-extrabold leading-[1.25] text-canvas-dark")}
            {body("mx-auto mt-3 max-w-[280px] text-[12px] leading-[1.75] text-canvas-muted")}
          </div>
          <div className="mt-7 grid grid-cols-2 gap-2">
            <div className="overflow-hidden bg-white">
              <BlockImage
                section={section}
                className="h-[190px]"
                imageUrlOverride={slots.beforeImage}
                placeholderLabel="전 사진 필요"
              />
              <div className="px-3 py-3 text-center text-[11px] font-extrabold text-canvas-muted">
                {label("slot.beforeLabel", slots.beforeLabel ?? "기존 사용 환경")}
              </div>
            </div>
            <div className="overflow-hidden bg-white">
              <BlockImage
                section={section}
                className="h-[190px]"
                imageUrlOverride={slots.afterImage}
                strictOverride
                placeholderLabel="후 사진 필요"
              />
              <div className="bg-[#466451] px-3 py-3 text-center text-[11px] font-extrabold text-white">
                {label("slot.afterLabel", slots.afterLabel ?? "상품 사용 포인트")}
              </div>
            </div>
          </div>
          <div className="mt-5 divide-y divide-[#dce2db] border-y border-[#dce2db]">
            {(slots.comparisonRows ?? []).map((row) => (
              <div key={row.label} className="grid grid-cols-[62px_1fr_1fr] gap-2 py-3 text-[10.5px] leading-relaxed">
                <span className="font-bold text-canvas-muted">{row.label}</span>
                <span className="text-canvas-muted">{row.left}</span>
                <span className="font-bold text-[#355640]">{row.right}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {layoutType === "feature_blue_panel" && (
        // 원래 배경이 채도 높은 파란색(#1676ba)이었는데, 나머지 17개 블록이 전부
        // 초록/크림/브라운 계열 팔레트를 쓰는 것과 완전히 동떨어져 있어서 AI가
        // 이 layoutType을 고를 때마다 "뜬금없는 파란 섹션"으로 튀어 보인다는
        // 실제 사용자 리포트로 발견 — 나머지 강조 블록(top_notice_banner의
        // #273b34, big_claim_band의 #405f48)과 같은 계열의 짙은 틸그린으로 교체.
        <div {...content("bg-[#1f5c52] px-7 py-10 text-white")}>
          <div className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-white/75">
            {kicker}
          </div>
          {headline("text-[24px] font-extrabold leading-[1.25] tracking-tight text-white")}
          {body("mt-3 text-[13px] leading-[1.75] text-white/88")}
          <BlockImage section={section} className="mt-8 h-[245px] rounded-[2px]" />
          {section.bullets.length > 0 && (
            <div className="mt-6 grid gap-2">
              {section.bullets.map((bullet) => (
                <div key={bullet} className="bg-white px-3 py-3 text-[12px] font-bold text-[#1f5c52]">
                  {bullet}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {layoutType === "color_lineup" && (
        <div {...content("bg-white px-7 py-10")}>
          <div className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-[#526f58]">
            {kicker}
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

      {layoutType === "option_grid" && (
        <div {...content("bg-white px-7 py-10")}>
          <div className="text-[10px] font-extrabold tracking-[0.2em] text-[#526f58]">{kicker}</div>
          {headline("mt-3 text-[24px] font-extrabold leading-[1.25] text-canvas-dark")}
          {body("mt-3 text-[13px] leading-[1.75] text-canvas-muted")}
          <div className="mt-7 grid grid-cols-2 gap-3">
            {(slots.optionItems ?? []).map((option, index) => (
              <div key={option.label} className="border border-[#e3e0d8] bg-[#fbfaf7] p-4">
                <div className="text-[9px] font-extrabold text-[#758475]">OPTION {String(index + 1).padStart(2, "0")}</div>
                <div className="mt-2 text-[13px] font-extrabold text-canvas-dark">{option.label}</div>
                {option.description && <div className="mt-1 text-[11px] text-canvas-muted">{option.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {layoutType === "evidence_card" && (
        <div {...content("bg-[#f4f1ea] px-7 py-10")}>
          <div className="text-[10px] font-extrabold tracking-[0.2em] text-[#7b6651]">{kicker}</div>
          {headline("mt-3 text-[24px] font-extrabold leading-[1.25] text-canvas-dark")}
          {body("mt-3 text-[13px] leading-[1.75] text-canvas-muted")}
          <BlockImage section={section} className="mt-7 h-[230px]" overlay={false} />
          {slots.caption && (
            <div className="mt-3 text-center text-[10px] leading-relaxed text-canvas-muted">
              {label("slot.caption", slots.caption)}
            </div>
          )}
          <div className="mt-6 grid gap-2">
            {(slots.proofItems ?? []).map((item) => (
              <div key={item.label} className="grid grid-cols-[78px_1fr] border-b border-[#dcd5c9] py-3 text-[11px]">
                <span className="font-bold text-canvas-muted">{item.label}</span>
                <span className="font-bold text-canvas-dark">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {layoutType === "step_guide" && (
        <div {...content("bg-white px-7 py-10")}>
          <div className="text-[10px] font-extrabold tracking-[0.2em] text-[#1f5c52]">{kicker}</div>
          {headline("mt-3 text-[24px] font-extrabold leading-[1.25] text-canvas-dark")}
          {body("mt-3 text-[13px] leading-[1.75] text-canvas-muted")}
          <div className="mt-8 space-y-5">
            {(slots.steps ?? []).map((step, index) => (
              <div key={step.title} className="grid grid-cols-[44px_1fr] gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#1f5c52] text-[11px] font-extrabold text-white">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="border-b border-[#e5e3dc] pb-5">
                  <div className="text-[12px] font-extrabold text-canvas-dark">{step.title}</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-canvas-muted">{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {layoutType === "comparison_table" && (
        <div {...content("bg-[#f8f8f6] px-7 py-10")}>
          <div className="text-center text-[10px] font-extrabold tracking-[0.2em] text-[#526f58]">{kicker}</div>
          {headline("mt-3 text-center text-[24px] font-extrabold leading-[1.25] text-canvas-dark")}
          {body("mx-auto mt-3 max-w-[280px] text-center text-[12px] leading-[1.7] text-canvas-muted")}
          <div className="mt-7 overflow-hidden border border-[#dfe0da] bg-white">
            <div className="grid grid-cols-[74px_1fr_1fr] bg-[#e9eee7] text-[10px] font-extrabold text-[#536351]">
              <span className="p-3">비교 기준</span><span className="p-3">내 사용 환경</span><span className="bg-[#526f58] p-3 text-white">상품 확인</span>
            </div>
            {(slots.comparisonRows ?? []).map((row) => (
              <div key={row.label} className="grid grid-cols-[74px_1fr_1fr] border-t border-[#e4e5df] text-[10.5px] leading-relaxed">
                <span className="p-3 font-bold text-canvas-muted">{row.label}</span>
                <span className="p-3 text-canvas-muted">{row.left}</span>
                <span className="border-l border-[#e4e5df] p-3 font-bold text-canvas-dark">{row.right}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {layoutType === "certification_stack" && (
        <div {...content("bg-[#eef5ef] px-7 py-10")}>
          <div className="text-[10px] font-extrabold tracking-[0.2em] text-[#3f704f]">{kicker}</div>
          {headline("mt-3 text-[24px] font-extrabold leading-[1.25] text-canvas-dark")}
          {body("mt-3 text-[13px] leading-[1.75] text-canvas-muted")}
          <div className="mt-7 divide-y divide-[#d5e3d4] border-y border-[#d5e3d4] bg-white">
            {(slots.proofItems ?? []).map((item, index) => (
              <div key={item.label} className="flex items-center gap-4 p-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#4d815c] text-[11px] font-extrabold text-white">{index + 1}</span>
                <div><div className="text-[12px] font-extrabold text-canvas-dark">{item.label}</div><div className="mt-1 text-[11px] text-canvas-muted">{item.value}</div></div>
              </div>
            ))}
          </div>
          {slots.caption && (
            <div className="mt-4 text-[10px] leading-relaxed text-canvas-muted">
              {label("slot.caption", slots.caption)}
            </div>
          )}
        </div>
      )}

      {layoutType === "care_guide" && (
        <div {...content("bg-[#f6f8f1] px-7 py-10")}>
          <div className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-[#526f58]">
            {kicker}
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
        <div {...content("bg-[#a1846b] px-7 py-11 text-white")}>
          <div className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-white/70">
            {kicker}
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
        <div {...content("bg-white px-7 py-11")}>
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
        <div {...content("bg-[#f8f8f8] px-7 py-10")}>
          <div className="border-l-4 border-[#526f58] pl-4">
            {headline("text-[23px] font-extrabold leading-[1.25] text-canvas-dark")}
            {slots.emphasis && (
              <div className="mt-2 text-[12px] font-extrabold text-[#526f58]">
                {label("slot.emphasis", slots.emphasis)}
              </div>
            )}
          </div>
          <ul className="mt-6 space-y-3">
            {(slots.noticeItems ?? [richTextToPlainText(section.body)]).map((notice, noticeIndex) => (
              <li key={noticeIndex} className="text-[12px] font-semibold leading-[1.75] text-canvas-muted">
                · {slots.noticeItems ? label(`slot.noticeItems.${noticeIndex}`, notice) : notice}
              </li>
            ))}
          </ul>
        </div>
      )}

      {layoutType === "qa_list" && (
        <div {...content("bg-white px-7 py-10")}>
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
        "top_notice_banner",
        "big_claim_band",
        "problem_hook",
        "material_closeup",
        "before_after_compare",
        "feature_blue_panel",
        "evidence_card",
        "option_grid",
        "step_guide",
        "comparison_table",
        "color_lineup",
        "care_guide",
        "certification_stack",
        "check_point_cards",
        "product_info_table",
        "policy_notice",
        "qa_list",
      ].includes(layoutType ?? "") && (
        <div {...content("bg-white px-7 py-10")}>
          <div className="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-canvas-accent">
            {kicker}
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
  onCommitLabel,
}: {
  sections: DetailSection[];
  selectedId: string;
  flashId: string | null;
  platform: Platform;
  onSelect: (id: string) => void;
  /** Double-click inline edit commit (docs/TASKS.md §7). before/after let the
   * caller decide whether anything actually changed. */
  onCommitText: (sectionId: string, field: EditableField, before: RichText, after: RichText) => void;
  /** Double-click inline edit commit for `section.kicker` and the plain
   * string/string[] slot fields (2026-07-20) — see renderEditableLabel and
   * handleCanvasLabelCommit in editor/page.tsx for the key format and scope
   * (structured slots like steps/faqItems stay read-only). */
  onCommitLabel: (sectionId: string, key: string, before: string, after: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editingLabelKey, setEditingLabelKey] = useState<{ sectionId: string; key: string } | null>(null);
  // Only one field can be actively edited at a time (editingCell is a
  // single cell), so one shared ref for the MarkupToolbar is enough.
  const editingContainerRef = useRef<HTMLDivElement>(null);

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
  }

  function commitEdit(sec: DetailSection, field: EditableField, value: RichText) {
    const before = field === "headline" ? sec.headline : sec.body;
    onCommitText(sec.id, field, before, value);
    setEditingCell(null);
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  function renderEditableText(sec: DetailSection, field: EditableField, className: string, editClassName: string) {
    const isEditing = editingCell?.sectionId === sec.id && editingCell.field === field;
    // Every value here is only set when the user has explicitly touched
    // that control — undefined means "don't set this style prop," letting
    // the layoutType block's own hardcoded Tailwind classes (text-[Npx],
    // leading-[N], varying 20-29px across blocks) show through untouched.
    // This uses inline style rather than a Tailwind class merge because
    // tailwind-merge treats font-size and line-height as one conflicting
    // group: merging in a "text-[Npx]" override silently drops any earlier
    // `leading-*` class, including a block's own hand-tuned one.
    const prominent = sec.kind === "intro" || sec.kind === "cta";
    const typographyStyle = {
      fontFamily: getFontFamilyCss(sec.fontFamily),
      fontSize: field === "headline" ? getHeadlineFontSizePx(sec.textScale, prominent) : getBodyFontSizePx(sec.textScale),
      letterSpacing: getLetterSpacingPx(sec.letterSpacing),
      lineHeight: getLineHeightPx(sec.lineHeight),
    };

    if (isEditing) {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <div className="mb-1 flex justify-end">
            <MarkupToolbar targetRef={editingContainerRef} />
          </div>
          <RichTextEditor
            key={`${sec.id}-${field}`}
            containerRef={editingContainerRef}
            initialValue={field === "headline" ? sec.headline : sec.body}
            onCommit={(value) => commitEdit(sec, field, value)}
            onCancel={cancelEdit}
            style={typographyStyle}
            className={cn("w-full rounded border border-dashed bg-transparent", editClassName)}
          />
        </div>
      );
    }

    return (
      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          startEdit(sec, field);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          e.stopPropagation();
          startEdit(sec, field);
        }}
        tabIndex={0}
        role="button"
        aria-label={`${field === "headline" ? "헤드라인" : "본문"} 편집 (Enter)`}
        style={typographyStyle}
        className={cn(
          "cursor-text whitespace-pre-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-canvas-accent",
          className
        )}
      >
        {renderRichText(field === "headline" ? sec.headline : sec.body)}
      </div>
    );
  }

  /** Plain-string sibling of renderEditableText for `section.kicker` and the
   * simple slot fields — a plain <input> rather than RichTextEditor since
   * these are short labels with no bold/highlight/font styling need. `key`
   * uniquely identifies the field within a section ("kicker", "slot.<x>",
   * "slot.<array>.<index>") — see handleCanvasLabelCommit in editor/page.tsx
   * for the parser and the persistence-scope note. */
  function renderEditableLabel(sec: DetailSection, key: string, value: string) {
    const isEditing = editingLabelKey?.sectionId === sec.id && editingLabelKey.key === key;

    if (isEditing) {
      return (
        <input
          key={key}
          autoFocus
          defaultValue={value}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => {
            onCommitLabel(sec.id, key, value, e.target.value);
            setEditingLabelKey(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditingLabelKey(null);
            }
          }}
          className="w-full min-w-0 border-b border-dashed border-current/50 bg-transparent outline-none"
        />
      );
    }

    return (
      <span
        onDoubleClick={(e) => {
          e.stopPropagation();
          onSelect(sec.id);
          setEditingLabelKey({ sectionId: sec.id, key });
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          e.stopPropagation();
          onSelect(sec.id);
          setEditingLabelKey({ sectionId: sec.id, key });
        }}
        tabIndex={0}
        role="button"
        aria-label="문구 편집 (Enter)"
        className="cursor-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-canvas-accent"
      >
        {value}
      </span>
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
          const hasImage = !!sec.imageUrl || !!sec.imageGradient || sec.imageSource !== "uploaded";
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
                renderEditableLabel={renderEditableLabel}
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
                <BlockImage
                  section={sec}
                  className={cn(
                    "border-b border-canvas-border",
                    getImageHeightClass(sec.imageHeight),
                    getImageFitClass(sec.imageFit)
                  )}
                />
              )}
              <div style={getSpacingStyle(sec.spacing)}>
                <div
                  className={cn(
                    "mb-1.5 text-[10px] font-extrabold tracking-wide",
                    isIntro || isCta ? "text-white/75" : "text-canvas-accent"
                  )}
                >
                  {sec.kicker}
                </div>
                {editingCell?.sectionId === sec.id && editingCell.field === "headline" ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <div className="mb-1 flex justify-end">
                      <MarkupToolbar targetRef={editingContainerRef} />
                    </div>
                    <RichTextEditor
                      key={`${sec.id}-headline`}
                      containerRef={editingContainerRef}
                      initialValue={sec.headline}
                      onCommit={(value) => commitEdit(sec, "headline", value)}
                      onCancel={cancelEdit}
                      style={{
                        fontFamily: getFontFamilyCss(sec.fontFamily),
                        fontSize: getHeadlineFontSizePx(sec.textScale, isIntro || isCta),
                        letterSpacing: getLetterSpacingPx(sec.letterSpacing),
                        lineHeight: getLineHeightPx(sec.lineHeight),
                      }}
                      className={cn(
                        "mb-1.5 w-full rounded border border-dashed bg-transparent font-bold tracking-tight",
                        isIntro || isCta
                          ? "border-white/50 text-white"
                          : "border-canvas-accent text-canvas-dark"
                      )}
                    />
                  </div>
                ) : (
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEdit(sec, "headline");
                    }}
                    style={{
                      fontFamily: getFontFamilyCss(sec.fontFamily),
                      fontSize: getHeadlineFontSizePx(sec.textScale, isIntro || isCta),
                      letterSpacing: getLetterSpacingPx(sec.letterSpacing),
                      lineHeight: getLineHeightPx(sec.lineHeight),
                    }}
                    className={cn(
                      "mb-1.5 cursor-text whitespace-pre-line font-bold tracking-tight",
                      isIntro || isCta ? "text-white" : "text-canvas-dark"
                    )}
                  >
                    {renderRichText(sec.headline)}
                  </div>
                )}
                {editingCell?.sectionId === sec.id && editingCell.field === "body" ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <div className="mb-1 flex justify-end">
                      <MarkupToolbar targetRef={editingContainerRef} />
                    </div>
                    <RichTextEditor
                      key={`${sec.id}-body`}
                      containerRef={editingContainerRef}
                      initialValue={sec.body}
                      onCommit={(value) => commitEdit(sec, "body", value)}
                      onCancel={cancelEdit}
                      style={{
                        fontFamily: getFontFamilyCss(sec.fontFamily),
                        fontSize: getBodyFontSizePx(sec.textScale),
                        letterSpacing: getLetterSpacingPx(sec.letterSpacing),
                        lineHeight: getLineHeightPx(sec.lineHeight),
                      }}
                      className={cn(
                        "w-full rounded border border-dashed bg-transparent leading-relaxed",
                        isIntro || isCta
                          ? "border-white/50 text-white/85"
                          : "border-canvas-accent text-canvas-muted"
                      )}
                    />
                  </div>
                ) : (
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEdit(sec, "body");
                    }}
                    style={{
                      fontFamily: getFontFamilyCss(sec.fontFamily),
                      fontSize: getBodyFontSizePx(sec.textScale),
                      letterSpacing: getLetterSpacingPx(sec.letterSpacing),
                      lineHeight: getLineHeightPx(sec.lineHeight),
                    }}
                    className={cn(
                      "cursor-text whitespace-pre-line leading-relaxed",
                      isIntro || isCta ? "text-white/85" : "text-canvas-muted"
                    )}
                  >
                    {renderRichText(sec.body)}
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
