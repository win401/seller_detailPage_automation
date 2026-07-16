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

export type MarkupMarker = "**" | "==";

function escapeForRegExp(marker: string): string {
  return marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Toggle-wraps [start, end) of `value` with `marker`. First checks whether
 * the range already sits *inside* an existing span of this marker type —
 * not just whether it's exactly the previously-selected range — and if so
 * removes that whole span. Without this, "undo the emphasis" only works if
 * you reselect the exact original boundaries; placing the cursor anywhere
 * inside already-bold text (or re-selecting a subset of it) would instead
 * wrap a second, nested marker pair around it, and the only way out would
 * be manually deleting the ** or == characters by hand.
 *
 * With no selection (start === end) and no surrounding span, inserts an
 * empty pair and places the cursor between them so typing lands inside the
 * markup. Returns the new string plus a selection range to restore.
 */
export function toggleMarkup(
  value: string,
  start: number,
  end: number,
  marker: MarkupMarker
): { value: string; start: number; end: number } {
  const markerLen = marker.length;
  const escaped = escapeForRegExp(marker);
  const spanPattern = new RegExp(`${escaped}([\\s\\S]+?)${escaped}`, "g");
  let match: RegExpExecArray | null;
  while ((match = spanPattern.exec(value))) {
    const innerStart = match.index + markerLen;
    const innerEnd = match.index + match[0].length - markerLen;
    if (start >= innerStart && end <= innerEnd) {
      const next = value.slice(0, match.index) + match[1] + value.slice(match.index + match[0].length);
      return { value: next, start: start - markerLen, end: end - markerLen };
    }
  }

  if (start === end) {
    const next = value.slice(0, start) + marker + marker + value.slice(end);
    const cursor = start + markerLen;
    return { value: next, start: cursor, end: cursor };
  }
  const selected = value.slice(start, end);
  const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
  return { value: next, start: start + markerLen, end: end + markerLen };
}
