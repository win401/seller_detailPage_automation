import {
  DetailSection,
  FontFamily,
  IMAGE_POSITION_CSS,
  ImageFit,
  ImageHeight,
  ImagePosition,
  LetterSpacing,
  SectionLayoutPreset,
  SectionSpacing,
  TextLineHeight,
  TextScale,
} from "./types";

/**
 * CSS mapping helpers for the section layout presets (docs/TASKS.md — 섹션
 * 레이아웃 프리셋). "prominent" sections (intro/cta) get a slightly larger
 * base size at every scale, matching the canvas's existing intro/cta
 * treatment.
 */

export function getImagePositionCss(position: ImagePosition | undefined): string {
  return IMAGE_POSITION_CSS[position ?? "center"];
}

export function getImageFitClass(fit: ImageFit | undefined): string {
  return fit === "contain" ? "bg-contain bg-no-repeat" : "bg-cover";
}

export function getImageHeightClass(height: ImageHeight | undefined): string {
  switch (height ?? "default") {
    case "compact":
      return "h-28";
    case "tall":
      return "h-48";
    default:
      return "h-36";
  }
}

export function getSpacingClasses(spacing: SectionSpacing | undefined, prominent: boolean): string {
  switch (spacing ?? "default") {
    case "compact":
      return prominent ? "px-3.5 py-4.5" : "px-3.5 py-3.5";
    case "spacious":
      return prominent ? "px-6.5 py-8.5" : "px-6.5 py-7";
    default:
      return prominent ? "px-5 py-6.5" : "px-5 py-5";
  }
}

export function getHeadlineTextClass(scale: TextScale | undefined, prominent: boolean): string {
  switch (scale ?? "default") {
    case "x-small":
      return prominent ? "text-[15px]" : "text-[11px]";
    case "compact":
      return prominent ? "text-[17px]" : "text-[13px]";
    case "large":
      return prominent ? "text-[22px]" : "text-[17px]";
    case "x-large":
      return prominent ? "text-[25px]" : "text-[19px]";
    default:
      return prominent ? "text-[19px]" : "text-[15px]";
  }
}

export function getBodyTextClass(scale: TextScale | undefined): string {
  switch (scale ?? "default") {
    case "x-small":
      return "text-[10.5px]";
    case "compact":
      return "text-[12px]";
    case "large":
      return "text-[14.5px]";
    case "x-large":
      return "text-[16px]";
    default:
      return "text-[13px]";
  }
}

const HEADLINE_FONT_SIZE_PX: Record<TextScale, { prominent: number; normal: number }> = {
  "x-small": { prominent: 15, normal: 11 },
  compact: { prominent: 17, normal: 13 },
  default: { prominent: 19, normal: 15 },
  large: { prominent: 22, normal: 17 },
  "x-large": { prominent: 25, normal: 19 },
};

const BODY_FONT_SIZE_PX: Record<TextScale, number> = {
  "x-small": 10.5,
  compact: 12,
  default: 13,
  large: 14.5,
  "x-large": 16,
};

const LETTER_SPACING_EM: Record<LetterSpacing, string> = {
  tight: "-0.01em",
  default: "normal",
  wide: "0.04em",
};

const LINE_HEIGHT_VALUE: Record<TextLineHeight, number> = {
  compact: 1.25,
  default: 1.5,
  relaxed: 1.75,
};

/**
 * Raw-value (not Tailwind-class) equivalents of getHeadlineTextClass /
 * getBodyTextClass / getLetterSpacingClass / getLineHeightClass, for inline
 * `style` use in structured (layoutType) blocks. Each layoutType block
 * hardcodes its own text-[Npx]/leading-[N] Tailwind classes, and
 * tailwind-merge treats font-size and line-height as the same conflicting
 * class group — merging a "text-[Npx]" override in via `cn`/twMerge silently
 * drops any earlier `leading-*` class, including a block's own hand-tuned
 * one (confirmed: `twMerge("text-[20px] leading-[1.3]", "text-[22px]")` →
 * drops leading-[1.3] entirely). Inline style sidesteps class-merge
 * conflicts altogether, and undefined here means "don't set this style
 * prop" so the block's own class-based default shows through untouched.
 */
export function getHeadlineFontSizePx(scale: TextScale | undefined, prominent: boolean): number | undefined {
  if (!scale) return undefined;
  const entry = HEADLINE_FONT_SIZE_PX[scale];
  return prominent ? entry.prominent : entry.normal;
}

export function getBodyFontSizePx(scale: TextScale | undefined): number | undefined {
  return scale ? BODY_FONT_SIZE_PX[scale] : undefined;
}

export function getLetterSpacingEm(spacing: LetterSpacing | undefined): string | undefined {
  return spacing ? LETTER_SPACING_EM[spacing] : undefined;
}

export function getLineHeightValue(lineHeight: TextLineHeight | undefined): number | undefined {
  return lineHeight ? LINE_HEIGHT_VALUE[lineHeight] : undefined;
}

export function getFontFamilyCss(family: FontFamily | undefined): string | undefined {
  switch (family) {
    case "pretendard":
      return "var(--font-pretendard)";
    case "gmarket-sans":
      return "var(--font-gmarket-sans)";
    case "s-core-dream":
      return "var(--font-s-core-dream)";
    default:
      return undefined;
  }
}

/** Returns undefined (no override) when `spacing` is untouched, so callers
 * that merge this into a layoutType block's own hand-tuned tracking class
 * via `cn`/twMerge only override that design once the user makes an
 * explicit choice — including "기본", which is a real choice distinct from
 * "never touched this control". */
export function getLetterSpacingClass(spacing: LetterSpacing | undefined): string | undefined {
  switch (spacing) {
    case "tight":
      return "tracking-[-0.01em]";
    case "wide":
      return "tracking-[0.04em]";
    case "default":
      return "tracking-normal";
    default:
      return undefined;
  }
}

/** Same untouched-vs-explicit-"기본" distinction as {@link getLetterSpacingClass}. */
export function getLineHeightClass(lineHeight: TextLineHeight | undefined): string | undefined {
  switch (lineHeight) {
    case "compact":
      return "leading-[1.25]";
    case "relaxed":
      return "leading-[1.75]";
    case "default":
      return "leading-[1.5]";
    default:
      return undefined;
  }
}

/** Stamps only the preset fields that are actually set onto every section —
 * used both to seed a fresh draft from a style set and to bulk-apply a
 * style set to an already-generated draft. Per-section overrides made
 * afterward in the editor still win until the next apply. */
export function applyLayoutPresetToSections(
  sections: DetailSection[],
  preset: SectionLayoutPreset
): DetailSection[] {
  return sections.map((section) => ({
    ...section,
    ...(preset.imagePosition && { imagePosition: preset.imagePosition }),
    ...(preset.imageFit && { imageFit: preset.imageFit }),
    ...(preset.imageHeight && { imageHeight: preset.imageHeight }),
    ...(preset.spacing && { spacing: preset.spacing }),
    ...(preset.textScale && { textScale: preset.textScale }),
    ...(preset.fontFamily && { fontFamily: preset.fontFamily }),
    ...(preset.letterSpacing && { letterSpacing: preset.letterSpacing }),
    ...(preset.lineHeight && { lineHeight: preset.lineHeight }),
  }));
}
