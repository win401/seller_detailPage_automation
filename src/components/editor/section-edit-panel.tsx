"use client";

import { useRef } from "react";
import { ImagePlus, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DetailSection,
  FONT_FAMILY_LABELS,
  IMAGE_FIT_LABELS,
  IMAGE_HEIGHT_LABELS,
  LETTER_SPACING_LABELS,
  LINE_HEIGHT_LABELS,
  RichText,
  SECTION_SPACING_LABELS,
  SectionImageAsset,
  SectionLayoutPreset,
  TEXT_SCALE_LABELS,
  UploadedImageDraft,
} from "@/lib/types";
import { ImagePositionGrid, PresetToggleGroup } from "./layout-preset-controls";
import { MarkupToolbar } from "./markup-toolbar";
import { RichTextEditor } from "./rich-text-editor";

const IMAGE_FIT_OPTIONS = (Object.keys(IMAGE_FIT_LABELS) as (keyof typeof IMAGE_FIT_LABELS)[]).map(
  (value) => ({ value, label: IMAGE_FIT_LABELS[value] })
);
const IMAGE_HEIGHT_OPTIONS = (
  Object.keys(IMAGE_HEIGHT_LABELS) as (keyof typeof IMAGE_HEIGHT_LABELS)[]
).map((value) => ({ value, label: IMAGE_HEIGHT_LABELS[value] }));
const SPACING_OPTIONS = (
  Object.keys(SECTION_SPACING_LABELS) as (keyof typeof SECTION_SPACING_LABELS)[]
).map((value) => ({ value, label: SECTION_SPACING_LABELS[value] }));
const TEXT_SCALE_OPTIONS = (
  Object.keys(TEXT_SCALE_LABELS) as (keyof typeof TEXT_SCALE_LABELS)[]
).map((value) => ({ value, label: TEXT_SCALE_LABELS[value] }));
const FONT_FAMILY_OPTIONS = (
  Object.keys(FONT_FAMILY_LABELS) as (keyof typeof FONT_FAMILY_LABELS)[]
).map((value) => ({ value, label: FONT_FAMILY_LABELS[value] }));
const LETTER_SPACING_OPTIONS = (
  Object.keys(LETTER_SPACING_LABELS) as (keyof typeof LETTER_SPACING_LABELS)[]
).map((value) => ({ value, label: LETTER_SPACING_LABELS[value] }));
const LINE_HEIGHT_OPTIONS = (
  Object.keys(LINE_HEIGHT_LABELS) as (keyof typeof LINE_HEIGHT_LABELS)[]
).map((value) => ({ value, label: LINE_HEIGHT_LABELS[value] }));

export function SectionEditPanel({
  section,
  hidden,
  onCommitBody,
  onMoveUp,
  onMoveDown,
  onToggleHide,
  onRegenerate,
  onSelectAlternative,
  onChangeLayout,
  productImage,
  referenceImage,
  references,
  onApplyImage,
  onUploadSectionImage,
  onGenerateImage,
  isGeneratingImage,
}: {
  section: DetailSection;
  hidden: boolean;
  onCommitBody: (before: RichText, after: RichText) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleHide: () => void;
  onRegenerate: () => void;
  onSelectAlternative: (index: number) => void;
  /** Section-level layout preset override (docs/TASKS.md — 섹션 레이아웃 프리셋). */
  onChangeLayout: (patch: SectionLayoutPreset) => void;
  productImage: UploadedImageDraft | null;
  referenceImage: UploadedImageDraft | null;
  references: SectionImageAsset[];
  onApplyImage: (asset: SectionImageAsset) => void;
  onUploadSectionImage: (file: File) => void;
  /** Gemini("Nano Banana")로 실제 이미지를 생성 (docs/MVP_PLAN.md §5). */
  onGenerateImage: () => void;
  isGeneratingImage: boolean;
}) {
  const bodyContainerRef = useRef<HTMLDivElement>(null);
  const currentImageStyle = section.imageUrl
    ? { backgroundImage: `url(${section.imageUrl})` }
    : section.imageGradient
      ? { backgroundImage: section.imageGradient }
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label>본문</Label>
          <MarkupToolbar targetRef={bodyContainerRef} />
        </div>
        <RichTextEditor
          key={section.id}
          containerRef={bodyContainerRef}
          initialValue={section.body}
          onCommit={(next) => onCommitBody(section.body, next)}
          onCancel={() => {}}
          className="field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        <span className="text-[10.5px] text-muted-foreground">
          부분 선택 후 버튼을 눌러 굵게·강조 색상을 적용하세요
        </span>
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

      {section.alternatives.length > 0 && (
        <div className="mt-1 border-t border-border pt-3">
          <div className="mb-2 text-xs font-bold">카피 후보</div>
          <div className="grid gap-1.5">
            {section.alternatives.map((alt, index) => (
              <button
                key={`${section.id}-alt-${index}`}
                type="button"
                onClick={() => onSelectAlternative(index)}
                className="rounded-lg border border-border bg-card-soft px-2.5 py-2 text-left text-[12px] leading-5 transition-colors hover:border-primary/70"
              >
                {alt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 border-t border-border pt-3">
        <div className="mb-2 text-xs font-bold">섹션 이미지</div>
        <div
          className="flex h-28 items-end overflow-hidden rounded-lg border border-border bg-muted bg-cover bg-center p-2"
          style={currentImageStyle}
        >
          <span className="rounded-full bg-background/90 px-2 py-1 text-[11px] font-bold text-foreground">
            {section.imageLabel ?? "이미지 없음"}
          </span>
        </div>

        <div className="mt-2 flex items-start gap-3">
          <div>
            <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
              이미지 위치
            </div>
            <ImagePositionGrid
              value={section.imagePosition}
              onChange={(imagePosition) => onChangeLayout({ imagePosition })}
            />
          </div>
          <div className="flex-1 grid gap-1.5">
            <div>
              <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                이미지 채우기
              </div>
              <PresetToggleGroup
                options={IMAGE_FIT_OPTIONS}
                value={section.imageFit}
                onChange={(imageFit) => onChangeLayout({ imageFit })}
              />
            </div>
            <div>
              <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                이미지 높이
              </div>
              <PresetToggleGroup
                options={IMAGE_HEIGHT_OPTIONS}
                value={section.imageHeight}
                onChange={(imageHeight) => onChangeLayout({ imageHeight })}
              />
            </div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border text-xs font-semibold">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadSectionImage(file);
                e.currentTarget.value = "";
              }}
            />
            <ImagePlus className="size-3.5" />
            직접 교체
          </label>
          <Button
            type="button"
            variant="outline"
            className="h-8 text-xs font-semibold"
            disabled={!productImage}
            onClick={() => {
              if (!productImage) return;
              onApplyImage({
                id: "uploaded-product-image",
                label: "업로드 상품 이미지",
                description: productImage.name,
                source: "uploaded",
                dataUrl: productImage.dataUrl,
                promptHint: "Use the uploaded product photo as the base visual. Keep the real shape, color, and material unchanged.",
                tags: ["uploaded", section.kind, section.imageRole],
              });
            }}
          >
            상품 이미지 적용
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-8 w-full text-xs font-semibold"
          disabled={!referenceImage}
          onClick={() => {
            if (!referenceImage) return;
            onApplyImage({
              id: "uploaded-reference-image",
              label: "업로드 레퍼런스 이미지",
              description: referenceImage.name,
              source: "reference",
              dataUrl: referenceImage.dataUrl,
              promptHint:
                "Use the uploaded reference image only for mood, composition, and lighting. Keep the actual product's shape, color, and material unchanged.",
              tags: ["reference", section.kind, section.imageRole],
            });
          }}
        >
          레퍼런스 이미지 적용
        </Button>
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-8 w-full gap-1.5 text-xs font-semibold text-accent"
          disabled={isGeneratingImage}
          onClick={onGenerateImage}
        >
          <Sparkles className="size-3.5" />
          {isGeneratingImage ? "생성 중..." : "AI로 이미지 생성"}
        </Button>
      </div>

      <div className="mt-2 border-t border-border pt-3">
        <div className="mb-2 text-xs font-bold">여백 & 텍스트 크기</div>
        <div className="grid gap-1.5">
          <div>
            <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
              섹션 여백
            </div>
            <PresetToggleGroup
              options={SPACING_OPTIONS}
              value={section.spacing}
              onChange={(spacing) => onChangeLayout({ spacing })}
            />
          </div>
          <div>
            <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
              텍스트 크기
            </div>
            <PresetToggleGroup
              options={TEXT_SCALE_OPTIONS}
              value={section.textScale}
              onChange={(textScale) => onChangeLayout({ textScale })}
            />
          </div>
          <div>
            <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
              글꼴
            </div>
            <PresetToggleGroup
              options={FONT_FAMILY_OPTIONS}
              value={section.fontFamily}
              defaultValue="system"
              onChange={(fontFamily) => onChangeLayout({ fontFamily })}
            />
          </div>
          <div>
            <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
              자간
            </div>
            <PresetToggleGroup
              options={LETTER_SPACING_OPTIONS}
              value={section.letterSpacing}
              onChange={(letterSpacing) => onChangeLayout({ letterSpacing })}
            />
          </div>
          <div>
            <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
              줄 간격
            </div>
            <PresetToggleGroup
              options={LINE_HEIGHT_OPTIONS}
              value={section.lineHeight}
              onChange={(lineHeight) => onChangeLayout({ lineHeight })}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <div>
          <div className="text-xs font-bold">Pinterest 스타일 레퍼런스</div>
          <p className="text-[11px] leading-5 text-muted-foreground">
            실제 Pinterest API 전 단계 mock 추천입니다. 선택하면 섹션 이미지 방향으로 반영됩니다.
          </p>
        </div>
        <div className="grid gap-2">
          {references.map((ref) => (
            <button
              key={ref.id}
              type="button"
              onClick={() => onApplyImage(ref)}
              className="grid grid-cols-[64px_minmax(0,1fr)] gap-2 rounded-lg border border-border bg-card-soft p-2 text-left transition-colors hover:border-primary/70"
            >
              <span
                className="h-14 rounded-md bg-cover bg-center"
                style={{ backgroundImage: ref.dataUrl ? `url(${ref.dataUrl})` : ref.gradient }}
              />
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold">{ref.label}</span>
                <span className="line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                  {ref.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
