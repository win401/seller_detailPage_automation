import type { ReactNode } from "react";

/**
 * Deliberately tiny, non-nesting inline markup for headline/body text:
 * `**강조**` → bold, `==강조==` → accent highlight. Stored directly inside
 * the existing plain-string `headline`/`body` fields (no schema change), so
 * it flows through localStorage/Supabase persistence, undo/redo, and ZIP
 * export (which screenshots this same rendered output) with no extra work —
 * see docs/TASKS.md 우선순위 4, "자유 편집 확장 방향" (light-weight first step
 * before a full span-based rich text model).
 */
// [\s\S] instead of "." (with the "s"/dotAll flag, which needs ES2018 —
// this repo targets ES2017) so a marked span can contain a manual line
// break (headline and body both support multi-line editing) without
// breaking the match.
const MARKUP_PATTERN = /\*\*([\s\S]+?)\*\*|==([\s\S]+?)==/g;

export function renderInlineMarkup(text: string): ReactNode {
  if (!text) return text;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  MARKUP_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MARKUP_PATTERN.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(
        <strong key={key++} className="font-extrabold">
          {match[1]}
        </strong>
      );
    } else if (match[2] !== undefined) {
      // Translucent overlay rather than a fixed text color so it stays
      // legible on both light section backgrounds and the dark/colored
      // ones (top_notice_banner, big_claim_band, ...) without needing to
      // know the surrounding block's text color.
      parts.push(
        <span key={key++} className="rounded-[2px] bg-canvas-accent/25 px-0.5">
          {match[2]}
        </span>
      );
    }
    lastIndex = MARKUP_PATTERN.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}
