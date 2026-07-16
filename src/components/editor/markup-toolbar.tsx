"use client";

import type { RefObject } from "react";

import { toggleInlineStyle } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/**
 * Bold/highlight buttons for the current selection inside `targetRef`'s
 * contentEditable element. Uses onMouseDown + preventDefault (not onClick)
 * so the browser never blurs the element before the handler runs — losing
 * focus would also lose the window.getSelection() range, which is the whole
 * point.
 */
export function MarkupToolbar({ targetRef }: { targetRef: RefObject<HTMLDivElement | null> }) {
  function apply(style: "bold" | "highlight") {
    const el = targetRef.current;
    if (!el) return;
    toggleInlineStyle(el, style);
  }

  const buttonClass =
    "flex h-6 items-center justify-center rounded border border-border px-1.5 text-[10.5px] font-bold text-muted-foreground transition-colors hover:border-primary/70 hover:text-foreground";

  return (
    <div className="flex gap-1">
      <button
        type="button"
        aria-label="굵게"
        title="굵게"
        onMouseDown={(e) => {
          e.preventDefault();
          apply("bold");
        }}
        className={cn(buttonClass, "w-6 font-extrabold")}
      >
        B
      </button>
      <button
        type="button"
        aria-label="강조 색상"
        title="강조 색상"
        onMouseDown={(e) => {
          e.preventDefault();
          apply("highlight");
        }}
        className={buttonClass}
      >
        강조
      </button>
    </div>
  );
}
