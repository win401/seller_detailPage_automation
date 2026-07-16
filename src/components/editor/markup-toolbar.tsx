"use client";

import type { RefObject } from "react";

import { toggleMarkup, type MarkupMarker } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/**
 * Bold/highlight buttons for the currently selected text in `targetRef`'s
 * textarea. Uses onMouseDown + preventDefault (not onClick) so the browser
 * never blurs the textarea before the handler runs — losing focus would
 * also lose selectionStart/selectionEnd, which is the whole point.
 */
export function MarkupToolbar({
  targetRef,
  value,
  onChange,
}: {
  targetRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  function apply(marker: MarkupMarker) {
    const el = targetRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const result = toggleMarkup(value, start, end, marker);
    onChange(result.value);
    // Write the DOM value directly so the selection can be restored in
    // this same synchronous handler, ahead of React's re-render (which
    // will reconcile to the same string and leave the selection alone).
    el.value = result.value;
    el.setSelectionRange(result.start, result.end);
    el.focus();
  }

  const buttonClass =
    "flex h-6 items-center justify-center rounded border border-border px-1.5 text-[10.5px] font-bold text-muted-foreground transition-colors hover:border-primary/70 hover:text-foreground";

  return (
    <div className="flex gap-1">
      <button
        type="button"
        aria-label="굵게"
        title="굵게 (**강조**)"
        onMouseDown={(e) => {
          e.preventDefault();
          apply("**");
        }}
        className={cn(buttonClass, "w-6 font-extrabold")}
      >
        B
      </button>
      <button
        type="button"
        aria-label="강조 색상"
        title="강조 색상 (==강조==)"
        onMouseDown={(e) => {
          e.preventDefault();
          apply("==");
        }}
        className={buttonClass}
      >
        강조
      </button>
    </div>
  );
}
