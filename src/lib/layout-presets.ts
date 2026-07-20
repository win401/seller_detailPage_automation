import {
  DetailSection,
  FontFamily,
  IMAGE_POSITION_CSS,
  ImageFit,
  ImageHeight,
  ImagePosition,
  SectionLayoutPreset,
} from "./types";

/**
 * CSS mapping helpers for the section layout presets (docs/TASKS.md — 섹션
 * 레이아웃 프리셋). "prominent" sections (intro/cta) get a slightly larger
 * headline-to-body ratio, matching the canvas's existing intro/cta
 * treatment.
 *
 * 여백/텍스트 크기/자간/줄간격은 3~5단계 프리셋이 아니라 연속값(px)으로
 * 저장·편집된다 (2026-07-20, 실사용 피드백으로 세분화). 전부 inline `style`
 * 로만 적용하는 이유: Tailwind의 JIT 스캐너는 소스에 리터럴로 등장하는
 * 클래스 문자열만 인식하므로, `text-[${n}px]`처럼 런타임에 조립한 arbitrary
 * value 클래스는 대응하는 CSS가 아예 생성되지 않는다(조용히 무효화). 값이
 * 없을 때(undefined)는 각 getter가 undefined를 돌려주고, 그러면 호출부는
 * 그 style 프로퍼티를 아예 안 써서 layoutType 블록 자신의 하드코딩된
 * text-[Npx]/leading-[N] 클래스가 그대로 보인다 — "한 번도 안 건드림"과
 * "명시적으로 기본값 선택함"을 구분하기 위함.
 */

export const SECTION_SPACING_RANGE = { min: 8, max: 56, step: 2 } as const;
export const SECTION_SPACING_DEFAULT = 24;

export const TEXT_SIZE_RANGE = { min: 10, max: 24, step: 0.5 } as const;
export const TEXT_SIZE_DEFAULT = 13;

export const LETTER_SPACING_RANGE = { min: -2, max: 4, step: 0.5 } as const;
export const LETTER_SPACING_DEFAULT = 0;

export const LINE_HEIGHT_RANGE = { min: 14, max: 48, step: 1 } as const;
export const LINE_HEIGHT_DEFAULT = 20;

const HEADLINE_TO_BODY_RATIO = { prominent: 1.46, normal: 1.15 };

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

/** Section padding (all sides), as an inline style — see file header for
 * why this can't be a dynamic Tailwind class. */
export function getSpacingStyle(spacing: number | undefined): { padding: string } | undefined {
  return typeof spacing === "number" ? { padding: `${spacing}px` } : undefined;
}

export function getBodyFontSizePx(scale: number | undefined): number | undefined {
  return typeof scale === "number" ? scale : undefined;
}

export function getHeadlineFontSizePx(scale: number | undefined, prominent: boolean): number | undefined {
  if (typeof scale !== "number") return undefined;
  const ratio = prominent ? HEADLINE_TO_BODY_RATIO.prominent : HEADLINE_TO_BODY_RATIO.normal;
  return Math.round(scale * ratio * 2) / 2;
}

export function getLetterSpacingPx(spacing: number | undefined): string | undefined {
  return typeof spacing === "number" ? `${spacing}px` : undefined;
}

export function getLineHeightPx(lineHeight: number | undefined): string | undefined {
  return typeof lineHeight === "number" ? `${lineHeight}px` : undefined;
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

/** Stamps only the preset fields that are actually set onto every section —
 * used both to seed a fresh draft from a style set and to bulk-apply a
 * style set to an already-generated draft. Per-section overrides made
 * afterward in the editor still win until the next apply. Numeric fields
 * use a `typeof === "number"` guard rather than truthiness — 0 is a valid,
 * explicit value for letterSpacing. */
export function applyLayoutPresetToSections(
  sections: DetailSection[],
  preset: SectionLayoutPreset
): DetailSection[] {
  return sections.map((section) => ({
    ...section,
    ...(preset.imagePosition && { imagePosition: preset.imagePosition }),
    ...(preset.imageFit && { imageFit: preset.imageFit }),
    ...(preset.imageHeight && { imageHeight: preset.imageHeight }),
    ...(typeof preset.spacing === "number" && { spacing: preset.spacing }),
    ...(typeof preset.textScale === "number" && { textScale: preset.textScale }),
    ...(preset.fontFamily && { fontFamily: preset.fontFamily }),
    ...(typeof preset.letterSpacing === "number" && { letterSpacing: preset.letterSpacing }),
    ...(typeof preset.lineHeight === "number" && { lineHeight: preset.lineHeight }),
  }));
}
