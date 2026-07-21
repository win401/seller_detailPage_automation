"use client";

import { cn } from "@/lib/utils";

/** Continuous px-value editor (slider + synced numeric input) for the
 * typography/spacing controls that used to be 3-5 step presets — 여백/
 * 텍스트 크기/자간/줄간격 (2026-07-20, hands-on feedback that discrete
 * steps were too coarse). `value` undefined means "never touched," shown
 * as `defaultValue` on the controls but not yet written to the section. */
export function SliderField({
  value,
  defaultValue,
  min,
  max,
  step = 1,
  unit = "px",
  onChange,
}: {
  value: number | undefined;
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (next: number) => void;
}) {
  const current = value ?? defaultValue;
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-primary"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isNaN(next)) onChange(next);
        }}
        className="h-7 w-14 shrink-0 rounded-md border border-border bg-transparent px-1.5 text-right text-[11.5px] tabular-nums"
      />
      <span className="w-5 shrink-0 text-[10.5px] text-muted-foreground">{unit}</span>
    </div>
  );
}

/** Generic labeled preset toggle (fit / height / image position). */
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
            "h-7 flex-1 whitespace-nowrap rounded-md px-1 text-[11.5px] font-semibold transition-colors",
            current === option.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
