import type { ReactNode } from "react";

import type { RichText } from "./types";

/**
 * Span-based rich text for headline/body: each TextRun carries its own
 * bold/highlight flags, rendered as real DOM (<strong>/<span>) so styling is
 * visible immediately while editing (via RichTextEditor, not just after
 * commit) — replaces the earlier marker-string phase
 * (`**bold**`/`==highlight==` parsed at display time only). See
 * docs/TASKS.md 우선순위 4.
 */

export function renderRichText(runs: RichText): ReactNode {
  return runs.map((run, i) => {
    let node: ReactNode = run.text;
    if (run.bold) {
      node = (
        <strong key={i} className="font-extrabold">
          {node}
        </strong>
      );
    }
    if (run.highlight) {
      // Translucent overlay rather than a fixed text color so it stays
      // legible on both light section backgrounds and the dark/colored
      // ones (top_notice_banner, big_claim_band, ...) without needing to
      // know the surrounding block's text color.
      node = (
        <span key={run.bold ? `${i}-h` : i} className="rounded-[2px] bg-canvas-accent/25 px-0.5">
          {node}
        </span>
      );
    }
    return <span key={i}>{node}</span>;
  });
}

export function richTextToPlainText(runs: RichText): string {
  return runs.map((run) => run.text).join("");
}

// Recognizes the earlier **bold**/==highlight== marker phase so upgrading a
// draft that already used it produces real bold/highlight runs instead of
// flattening the styling away. [\s\S] instead of "." + the "s" flag (which
// needs ES2018 — this repo targets ES2017) so a marked span can contain a
// manual line break.
const MARKUP_PATTERN = /\*\*([\s\S]+?)\*\*|==([\s\S]+?)==/g;

function parseLegacyMarkers(text: string): RichText {
  if (!text) return [{ text: "" }];
  const runs: RichText = [];
  let lastIndex = 0;
  MARKUP_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MARKUP_PATTERN.exec(text))) {
    if (match.index > lastIndex) {
      runs.push({ text: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      runs.push({ text: match[1], bold: true });
    } else if (match[2] !== undefined) {
      runs.push({ text: match[2], highlight: true });
    }
    lastIndex = MARKUP_PATTERN.lastIndex;
  }
  if (lastIndex < text.length) {
    runs.push({ text: text.slice(lastIndex) });
  }
  return runs.length ? runs : [{ text: "" }];
}

/**
 * Migration/back-compat entry point — the choke point older
 * localStorage/Supabase drafts (and AI/mock output, which still emits plain
 * strings by design) pass through to become real RichText. A plain string
 * gets its bold/highlight markers upgraded to real runs instead of
 * discarded; an already-migrated array passes through unchanged.
 */
export function toRichText(value: string | RichText | null | undefined): RichText {
  if (Array.isArray(value)) return value.length ? value : [{ text: "" }];
  return parseLegacyMarkers(value ?? "");
}

function mergeAdjacentRuns(runs: RichText): RichText {
  const merged: RichText = [];
  for (const run of runs) {
    const prev = merged[merged.length - 1];
    if (prev && !!prev.bold === !!run.bold && !!prev.highlight === !!run.highlight) {
      prev.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
}

/**
 * Walks a contentEditable subtree into RichText, used on blur to commit an
 * edit. `<strong>`/`.rich-highlight` ancestors (within `root`) set the
 * bold/highlight flags for each text node; adjacent runs with identical
 * flags are merged so toggling doesn't fragment a paragraph into many
 * single-character runs over an editing session.
 */
export function domToRichText(root: HTMLElement): RichText {
  const runs: RichText = [];

  function walk(node: Node, bold: boolean, highlight: boolean) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Strip the zero-width space used to seed an empty toggled span (see
      // toggleInlineStyle) — it's only there so the cursor has somewhere to
      // land, never meant to be persisted.
      const text = (node.textContent ?? "").replace(/​/g, "");
      if (text) runs.push({ text, ...(bold && { bold }), ...(highlight && { highlight }) });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.tagName === "BR") {
      runs.push({ text: "\n" });
      return;
    }
    const nextBold = bold || el.tagName === "STRONG" || el.tagName === "B";
    const nextHighlight = highlight || el.classList.contains("rich-highlight");
    // A block-level child (e.g. a wrapping <div> some browsers insert for
    // Enter) starts a new line — only add the separator if this isn't the
    // subtree's very first content, to avoid a leading blank line.
    const isBlock = el.tagName === "DIV" || el.tagName === "P";
    if (isBlock && runs.length > 0) runs.push({ text: "\n" });
    node.childNodes.forEach((child) => walk(child, nextBold, nextHighlight));
  }

  root.childNodes.forEach((child) => walk(child, false, false));
  const merged = mergeAdjacentRuns(runs);
  return merged.length ? merged : [{ text: "" }];
}

/**
 * Inverse of domToRichText — populates a contentEditable root's DOM from
 * RichText on mount. Only called once when editing starts (see
 * RichTextEditor); the DOM is the source of truth from then on, not this
 * function, which is why there's no corresponding "update" path.
 */
export function buildRichTextDom(root: HTMLElement, runs: RichText): void {
  runs.forEach((run) => {
    const lines = run.text.split("\n");
    lines.forEach((line, i) => {
      if (i > 0) root.appendChild(document.createElement("br"));
      if (!line) return;
      let node: HTMLElement | Text = document.createTextNode(line);
      if (run.bold) {
        const strong = document.createElement("strong");
        strong.className = "font-extrabold";
        strong.appendChild(node);
        node = strong;
      }
      if (run.highlight) {
        const span = document.createElement("span");
        span.className = "rich-highlight rounded-[2px] bg-canvas-accent/25 px-0.5";
        span.appendChild(node);
        node = span;
      }
      root.appendChild(node);
    });
  });
}

function isStyleElement(el: HTMLElement, style: "bold" | "highlight"): boolean {
  return style === "bold" ? el.tagName === "STRONG" || el.tagName === "B" : el.classList.contains("rich-highlight");
}

function findStyleAncestor(node: Node | null, root: HTMLElement, style: "bold" | "highlight"): HTMLElement | null {
  let el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement | null);
  while (el && el !== root) {
    if (isStyleElement(el, style)) return el;
    el = el.parentElement;
  }
  return null;
}

function unwrapElement(el: HTMLElement) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function makeStyleElement(style: "bold" | "highlight"): HTMLElement {
  if (style === "bold") {
    const strong = document.createElement("strong");
    strong.className = "font-extrabold";
    return strong;
  }
  const span = document.createElement("span");
  span.className = "rich-highlight rounded-[2px] bg-canvas-accent/25 px-0.5";
  return span;
}

/**
 * Toggle bold/highlight on the current selection within `root` (a
 * contentEditable element). Mirrors the string-marker toggleMarkup's fixed
 * bug from earlier today: if the selection/cursor sits *inside* an existing
 * span of this style — not just if it exactly matches the span's boundaries
 * — the whole span is unwrapped, so removing emphasis doesn't require
 * reselecting the exact original range. With no selection, inserts an empty
 * styled element and places the cursor inside it.
 */
export function toggleInlineStyle(root: HTMLElement, style: "bold" | "highlight"): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return;

  const existing = findStyleAncestor(range.startContainer, root, style);
  if (existing && existing.contains(range.endContainer)) {
    unwrapElement(existing);
    return;
  }

  if (range.collapsed) {
    const el = makeStyleElement(style);
    el.appendChild(document.createTextNode("​"));
    range.insertNode(el);
    const newRange = document.createRange();
    newRange.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return;
  }

  const el = makeStyleElement(style);
  try {
    range.surroundContents(el);
  } catch {
    // Range partially overlaps an element boundary (e.g. selection spans
    // across an existing <strong>) — surroundContents throws in that case;
    // extract-and-reinsert works for arbitrary ranges.
    const fragment = range.extractContents();
    el.appendChild(fragment);
    range.insertNode(el);
  }
  const newRange = document.createRange();
  newRange.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(newRange);
}
