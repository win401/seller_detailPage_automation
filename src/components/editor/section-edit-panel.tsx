"use client";

import { useRef } from "react";
import { ImagePlus, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DetailSection, SectionImageAsset, UploadedImageDraft } from "@/lib/types";

export function SectionEditPanel({
  section,
  hidden,
  onChangeBody,
  onCommitBody,
  onMoveUp,
  onMoveDown,
  onToggleHide,
  onRegenerate,
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
  onChangeBody: (value: string) => void;
  onCommitBody: (before: string, after: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleHide: () => void;
  onRegenerate: () => void;
  productImage: UploadedImageDraft | null;
  referenceImage: UploadedImageDraft | null;
  references: SectionImageAsset[];
  onApplyImage: (asset: SectionImageAsset) => void;
  onUploadSectionImage: (file: File) => void;
  /** Gemini("Nano Banana")로 실제 이미지를 생성 (docs/MVP_PLAN.md §5). */
  onGenerateImage: () => void;
  isGeneratingImage: boolean;
}) {
  const bodyFocusValueRef = useRef(section.body);
  const currentImageStyle = section.imageUrl
    ? { backgroundImage: `url(${section.imageUrl})` }
    : section.imageGradient
      ? { backgroundImage: section.imageGradient }
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <Label>본문</Label>
        <Textarea
          rows={5}
          value={section.body}
          onFocus={() => {
            bodyFocusValueRef.current = section.body;
          }}
          onBlur={() => {
            onCommitBody(bodyFocusValueRef.current, section.body);
          }}
          onChange={(e) => onChangeBody(e.target.value)}
        />
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
