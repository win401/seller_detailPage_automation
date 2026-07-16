"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CanvasElement, FONT_FAMILY_LABELS, FontFamily } from "@/lib/types";
import { cn } from "@/lib/utils";

const FONT_OPTIONS = (Object.keys(FONT_FAMILY_LABELS) as FontFamily[]).map((value) => ({
  value,
  label: FONT_FAMILY_LABELS[value],
}));

const toggleButtonClass =
  "flex h-8 flex-1 items-center justify-center rounded-md border border-border text-xs font-medium text-muted-foreground transition-colors hover:border-primary/70 hover:text-foreground";
const toggleButtonActiveClass = "border-primary bg-primary/10 text-foreground";

function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-9 shrink-0 rounded-md border border-border"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/**
 * Selection-driven property panel for a single canvasData element — the
 * Figma-style replacement for the preset-toggle-button controls used by the
 * structured layoutType blocks. Every field here is box-level (applies to
 * the whole text/shape/image element, not a sub-selection within it) —
 * see docs/TASKS.md for why per-word styling was scoped out of canvas mode.
 */
export function CanvasElementPanel({
  element,
  onChange,
}: {
  element: CanvasElement;
  onChange: (patch: Partial<CanvasElement>) => void;
}) {
  if (element.type === "text") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>글꼴</Label>
          <select
            value={element.fontFamily ?? "system"}
            onChange={(e) => onChange({ fontFamily: e.target.value as FontFamily })}
            className="h-8 rounded-md border border-border bg-transparent px-2 text-sm"
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <Label>굵게</Label>
          <button
            type="button"
            onClick={() => onChange({ bold: !element.bold })}
            className={cn(toggleButtonClass, "w-16 flex-none", element.bold && toggleButtonActiveClass)}
          >
            B
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>크기(px)</Label>
            <Input
              type="number"
              value={element.fontSize}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) || element.fontSize })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>줄간격</Label>
            <Input
              type="number"
              step="0.1"
              value={element.lineHeight}
              onChange={(e) => onChange({ lineHeight: Number(e.target.value) || element.lineHeight })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>자간(px)</Label>
            <Input
              type="number"
              value={element.letterSpacing}
              onChange={(e) => onChange({ letterSpacing: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>정렬</Label>
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                type="button"
                onClick={() => onChange({ align })}
                className={cn(toggleButtonClass, element.align === align && toggleButtonActiveClass)}
              >
                {align === "left" ? "왼쪽" : align === "center" ? "가운데" : "오른쪽"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>색상</Label>
          <ColorField value={element.fill} onChange={(fill) => onChange({ fill })} />
        </div>
      </div>
    );
  }

  if (element.type === "shape") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>배경색</Label>
          <ColorField value={element.fill} onChange={(fill) => onChange({ fill })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>모서리 둥글기(px)</Label>
          <Input
            type="number"
            value={element.cornerRadius}
            onChange={(e) => onChange({ cornerRadius: Number(e.target.value) || 0 })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>채우기 방식</Label>
        <div className="flex gap-1">
          {(["cover", "contain"] as const).map((fit) => (
            <button
              key={fit}
              type="button"
              onClick={() => onChange({ fit })}
              className={cn(toggleButtonClass, element.fit === fit && toggleButtonActiveClass)}
            >
              {fit === "cover" ? "채우기" : "전체 보기"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
