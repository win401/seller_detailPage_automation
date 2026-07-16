"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { applyFontFamily, toggleInlineStyle } from "@/lib/rich-text";
import { FONT_FAMILY_LABELS, type FontFamily } from "@/lib/types";
import { cn } from "@/lib/utils";

const FONT_OPTIONS = (Object.keys(FONT_FAMILY_LABELS) as FontFamily[]).map((value) => ({
  value,
  label: FONT_FAMILY_LABELS[value],
}));

/**
 * Bold/highlight/font-family controls for the current selection inside
 * `targetRef`'s contentEditable element. Every interactive element here uses
 * onMouseDown + preventDefault (never onClick) so the browser never blurs the
 * element before the handler runs — losing focus would also lose the
 * window.getSelection() range, which is the whole point. The font-family
 * picker is a hand-rolled popover rather than a native <select> or a
 * Radix/base-ui menu for the same reason: both steal focus on open before a
 * value is even picked.
 */
export function MarkupToolbar({ targetRef }: { targetRef: RefObject<HTMLDivElement | null> }) {
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fontMenuOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setFontMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [fontMenuOpen]);

  function apply(style: "bold" | "highlight") {
    const el = targetRef.current;
    if (!el) return;
    toggleInlineStyle(el, style);
  }

  function applyFont(family: FontFamily) {
    const el = targetRef.current;
    if (!el) return;
    applyFontFamily(el, family);
    setFontMenuOpen(false);
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
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-label="글꼴"
          title="글꼴"
          onMouseDown={(e) => {
            e.preventDefault();
            setFontMenuOpen((open) => !open);
          }}
          className={cn(buttonClass, "font-medium")}
        >
          글꼴
        </button>
        {fontMenuOpen && (
          <div className="absolute left-0 top-full z-10 mt-1 flex w-32 flex-col rounded border border-border bg-popover p-1 shadow-md">
            {FONT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFont(option.value);
                }}
                className="rounded px-2 py-1 text-left text-[11px] font-medium text-popover-foreground transition-colors hover:bg-accent"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
