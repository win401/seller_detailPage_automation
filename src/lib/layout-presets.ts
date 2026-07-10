import {
  DetailSection,
  IMAGE_POSITION_CSS,
  ImageFit,
  ImageHeight,
  ImagePosition,
  SectionLayoutPreset,
  SectionSpacing,
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
    case "compact":
      return prominent ? "text-[17px]" : "text-[13px]";
    case "large":
      return prominent ? "text-[22px]" : "text-[17px]";
    default:
      return prominent ? "text-[19px]" : "text-[15px]";
  }
}

export function getBodyTextClass(scale: TextScale | undefined): string {
  switch (scale ?? "default") {
    case "compact":
      return "text-[12px]";
    case "large":
      return "text-[14.5px]";
    default:
      return "text-[13px]";
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
  }));
}
