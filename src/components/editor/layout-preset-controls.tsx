"use client";

import { cn } from "@/lib/utils";
import { ImagePosition } from "@/lib/types";

const POSITION_GRID: ImagePosition[] = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

/** 3x3 focal-point picker for an image's crop position — a bounded stand-in
 * for free pixel-position editing (docs/CLAUDE_HANDOFF.md: keep the editor
 * block-based, not Figma-style). */
export function ImagePositionGrid({
  value,
  onChange,
}: {
  value: ImagePosition | undefined;
  onChange: (position: ImagePosition) => void;
}) {
  const current = value ?? "center";
  return (
    <div className="grid w-fit grid-cols-3 gap-1 rounded-lg border border-border bg-muted p-1">
      {POSITION_GRID.map((position) => (
        <button
          key={position}
          type="button"
          aria-label={`이미지 위치: ${position}`}
          onClick={() => onChange(position)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md transition-colors",
            current === position ? "bg-card shadow-sm" : "hover:bg-card/60"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              current === position ? "bg-primary" : "bg-muted-foreground/50"
            )}
          />
        </button>
      ))}
    </div>
  );
}

/** Generic labeled preset toggle (fit / height / spacing / text scale /
 * font family / letter spacing / line height). `defaultValue` overrides the
 * middle-index fallback used to highlight a button when `value` is
 * undefined — the middle option is the sensible "default" for a 3-step
 * compact/default/large-style scale, but not for a 4-option font-family
 * picker where "기본(system)" isn't in the middle. */
export function PresetToggleGroup<T extends string>({
  options,
  value,
  defaultValue,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  defaultValue?: T;
  onChange: (next: T) => void;
}) {
  const current = value ?? defaultValue ?? options[Math.floor(options.length / 2)]?.value;
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "h-7 flex-1 rounded-md text-[11.5px] font-semibold transition-colors",
            current === option.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
