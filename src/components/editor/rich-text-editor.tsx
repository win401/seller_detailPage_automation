"use client";

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";

import { buildRichTextDom, domToRichText } from "@/lib/rich-text";
import type { RichText } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * contentEditable-based headline/body editor. The DOM is the source of
 * truth while focused — React never re-renders this element's children
 * mid-edit — so the browser's native selection/cursor and Korean IME
 * composition handling are never fought. Initial content is built once on
 * mount (see buildRichTextDom); `onCommit` fires only on blur, serializing
 * the live DOM back to RichText (domToRichText). Bold/highlight toggling
 * happens directly on the DOM via toggleInlineStyle (see MarkupToolbar),
 * which is why styling is visible immediately while typing instead of only
 * after commit — the actual usability complaint this replaces the
 * `**`/`==` marker phase to fix.
 */
export function RichTextEditor({
  containerRef,
  initialValue,
  onCommit,
  onCancel,
  style,
  className,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  initialValue: RichText;
  onCommit: (value: RichText) => void;
  onCancel: () => void;
  style?: CSSProperties;
  className?: string;
}) {
  const mountedInitialValue = useRef(initialValue);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root.innerHTML = "";
    buildRichTextDom(root, mountedInitialValue.current);
    root.focus();
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    // Intentionally runs once per mount only — this component is remounted
    // (via `key`) whenever the caller switches to editing a different field,
    // and must not reset the live DOM on every parent re-render while a
    // single edit session is in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBlur() {
    const root = containerRef.current;
    if (!root) return;
    onCommit(domToRichText(root));
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  }

  return (
    <div
      ref={containerRef}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onPaste={handlePaste}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      style={style}
      className={cn("outline-none", className)}
    />
  );
}
