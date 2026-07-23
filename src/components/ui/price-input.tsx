"use client";

import { Input } from "./input";

/** Digits-only price entry with a live comma-formatted display and a fixed
 * "원" suffix outside the input (same sibling-<span> unit pattern as
 * SliderField's %/px in layout-preset-controls.tsx) — 새 상세페이지 만들기
 * 폼 개편 (docs/TASKS.md). `value`/`onChange` carry raw digits only, so
 * downstream consumers never have to strip commas/"원" back out. */
export function PriceInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (digitsOnly: string) => void;
  placeholder?: string;
}) {
  const display = value ? Number(value).toLocaleString("ko-KR") : "";

  return (
    <div className="flex items-center gap-1.5">
      <Input
        inputMode="numeric"
        value={display}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder={placeholder}
        className="flex-1"
      />
      <span className="shrink-0 text-[13px] font-semibold text-muted-foreground">원</span>
    </div>
  );
}
