"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Input } from "./input";

/**
 * Free-text input with a lightweight suggestion dropdown — this codebase has
 * no combobox/autocomplete primitive (no cmdk/popover dependency) and the
 * existing `Select` is fixed-option-only, so this is hand-rolled rather than
 * adding a new dependency. Same closed-on-outside-click/Escape + absolute-
 * positioned-list visual language as MarkupToolbar's font popover
 * (markup-toolbar.tsx) — 새 상세페이지 만들기 폼 개편 (docs/TASKS.md).
 *
 * `mode="replace"`: picking a suggestion overwrites the whole field (category).
 * `mode="append"`: picking a suggestion appends it as a new comma-separated
 * entry, skipping it if already present (keywords).
 */
export function TextSuggestInput({
  value,
  onChange,
  suggestions,
  mode,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  suggestions: string[];
  mode: "replace" | "append";
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const visibleSuggestions =
    mode === "append"
      ? suggestions.filter(
          (s) => !value.split(",").map((part) => part.trim()).includes(s)
        )
      : suggestions;

  function pick(suggestion: string) {
    if (mode === "replace") {
      onChange(suggestion);
    } else {
      const trimmed = value.trim();
      onChange(trimmed ? `${trimmed}, ${suggestion}` : suggestion);
    }
    setOpen(false);
    setHighlightIndex(-1);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(visibleSuggestions.length > 0)}
        onKeyDown={(e) => {
          if (!open || visibleSuggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((i) => (i + 1) % visibleSuggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((i) => (i <= 0 ? visibleSuggestions.length - 1 : i - 1));
          } else if (e.key === "Enter" && highlightIndex >= 0) {
            e.preventDefault();
            pick(visibleSuggestions[highlightIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && visibleSuggestions.length > 0 && (
        <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-border bg-popover p-1 shadow-md">
          {visibleSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(suggestion);
              }}
              className={cn(
                "block w-full rounded px-2.5 py-1.5 text-left text-[12.5px] font-medium text-popover-foreground transition-colors hover:bg-accent",
                index === highlightIndex && "bg-accent"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
