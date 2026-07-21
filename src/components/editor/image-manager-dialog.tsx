"use client";

import { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  BLOCK_IMAGE_LAYOUT_TYPES,
  DetailSection,
  IMAGE_SLOT_CATEGORY_LABELS,
  ImageSlotCategory,
  ProjectImageAsset,
  SECTION_KIND_SLOT_CATEGORY,
} from "@/lib/types";

/** Which section field a picked photo should be written to. Every
 * BLOCK_IMAGE_LAYOUT_TYPES section has exactly one "image" slot except
 * before_after_compare, which has two independent ones — see BlockImage's
 * imageUrlOverride/strictOverride props in section-canvas.tsx. */
type SlotTarget = { sectionId: string; slot: "image" | "beforeImage" | "afterImage" };

interface SlotRow {
  key: string;
  target: SlotTarget;
  title: string;
  slotLabel: string;
  category: ImageSlotCategory;
  currentUrl: string | undefined;
}

function slotRowsForSections(sections: DetailSection[]): SlotRow[] {
  return sections
    .filter((s) => s.layoutType && BLOCK_IMAGE_LAYOUT_TYPES.includes(s.layoutType))
    .flatMap((s): SlotRow[] => {
      const category = SECTION_KIND_SLOT_CATEGORY[s.kind];
      const categoryLabel = IMAGE_SLOT_CATEGORY_LABELS[category];
      if (s.layoutType === "before_after_compare") {
        return [
          {
            key: `${s.id}-beforeImage`,
            target: { sectionId: s.id, slot: "beforeImage" },
            title: s.title,
            slotLabel: `전 · ${categoryLabel}`,
            category,
            currentUrl: s.slots?.beforeImage,
          },
          {
            key: `${s.id}-afterImage`,
            target: { sectionId: s.id, slot: "afterImage" },
            title: s.title,
            slotLabel: `후 · ${categoryLabel}`,
            category,
            currentUrl: s.slots?.afterImage,
          },
        ];
      }
      return [
        {
          key: `${s.id}-image`,
          target: { sectionId: s.id, slot: "image" },
          title: s.title,
          slotLabel: categoryLabel,
          category,
          currentUrl: s.slots?.image ?? s.imageUrl,
        },
      ];
    });
}

/** Style-set-driven display order only — never changes which category a
 * section belongs to (docs/TASKS.md 우선순위 3). Categories not listed in
 * `priority` keep their relative order, after every ranked one. */
function sortRowsByPriority(rows: SlotRow[], priority: ImageSlotCategory[] | undefined): SlotRow[] {
  if (!priority || priority.length === 0) return rows;
  const rank = new Map(priority.map((category, index) => [category, index]));
  return [...rows].sort((a, b) => (rank.get(a.category) ?? Infinity) - (rank.get(b.category) ?? Infinity));
}

export function ImageManagerDialog({
  open,
  onOpenChange,
  sections,
  assets,
  isUploading,
  onUpload,
  onDelete,
  onAssign,
  imageSlotPriority,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: DetailSection[];
  assets: ProjectImageAsset[];
  isUploading: boolean;
  onUpload: (file: File) => void;
  onDelete: (asset: ProjectImageAsset) => void;
  onAssign: (target: SlotTarget, asset: ProjectImageAsset) => void;
  /** Which image slot categories to fill first — display order only, from
   * the currently selected style set (docs/TASKS.md 우선순위 3). */
  imageSlotPriority?: ImageSlotCategory[];
}) {
  const [pickingFor, setPickingFor] = useState<SlotTarget | null>(null);
  const rows = sortRowsByPriority(slotRowsForSections(sections), imageSlotPriority);

  function handlePoolClick(asset: ProjectImageAsset) {
    if (!pickingFor) return;
    onAssign(pickingFor, asset);
    setPickingFor(null);
  }

  function usageCount(asset: ProjectImageAsset) {
    return rows.filter((row) => row.currentUrl === asset.publicUrl).length;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setPickingFor(null);
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-[820px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>이미지 관리</DialogTitle>
        </DialogHeader>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[13px] font-bold">
              업로드한 사진
              {pickingFor && (
                <span className="ml-2 text-[11.5px] font-semibold text-accent">
                  배정할 사진을 클릭하세요
                </span>
              )}
            </div>
            <label
              className={cn(
                "flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold hover:border-primary/70",
                isUploading && "pointer-events-none opacity-50"
              )}
            >
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                  e.currentTarget.value = "";
                }}
              />
              <ImagePlus className="size-3.5" />
              {isUploading ? "업로드 중..." : "업로드"}
            </label>
          </div>

          {assets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card-soft p-4 text-center text-[12px] text-muted-foreground">
              아직 업로드한 사진이 없습니다. 위 버튼으로 상품 사진을 올려주세요.
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2">
              {assets.map((asset) => (
                <div key={asset.id} className="group relative aspect-square">
                  <button
                    type="button"
                    onClick={() => handlePoolClick(asset)}
                    disabled={!pickingFor}
                    className={cn(
                      "size-full overflow-hidden rounded-lg border-2 bg-cover bg-center transition-colors",
                      pickingFor ? "cursor-pointer border-accent" : "cursor-default border-border"
                    )}
                    style={{ backgroundImage: `url(${asset.publicUrl})` }}
                    aria-label={asset.originalFilename ?? "업로드한 사진"}
                  />
                  {!pickingFor && (
                    <button
                      type="button"
                      onClick={() => onDelete(asset)}
                      title={usageCount(asset) > 0 ? "사용 중인 사진입니다 — 삭제하면 배정도 사라집니다" : "삭제"}
                      className="absolute -top-1.5 -right-1.5 hidden size-5 items-center justify-center rounded-full bg-destructive text-white group-hover:flex"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3">
          <div className="mb-2 text-[13px] font-bold">섹션별 이미지 배정</div>
          <div className="grid gap-1.5">
            {rows.map((row) => {
              const isPicking =
                pickingFor?.sectionId === row.target.sectionId && pickingFor.slot === row.target.slot;
              return (
                <div
                  key={row.key}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-2",
                    isPicking ? "border-accent bg-accent-soft" : "border-border"
                  )}
                >
                  <div
                    className="size-12 shrink-0 rounded-md bg-muted bg-cover bg-center"
                    style={row.currentUrl ? { backgroundImage: `url(${row.currentUrl})` } : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-bold">{row.title}</div>
                    <div className="text-[10.5px] text-muted-foreground">{row.slotLabel}</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 text-[11.5px]"
                    onClick={() => setPickingFor(isPicking ? null : row.target)}
                  >
                    {isPicking ? "취소" : "선택"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
