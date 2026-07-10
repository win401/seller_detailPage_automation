import { mockStyleSets } from "./mock-data";
import { StyleSet } from "./types";

const STYLE_SETS_STORAGE_KEY = "detail-page-style-sets";

/** Style sets are local-first for now (docs/supabase/schema.sql already has
 * a `style_sets` table, but only for the original mood/tone/color columns —
 * the new layout-preset fields aren't in the live schema yet). Seeds from
 * the bundled mock sets on first use so the picker isn't empty. */
export function loadStyleSets(): StyleSet[] {
  if (typeof window === "undefined") return mockStyleSets;
  try {
    const raw = window.localStorage.getItem(STYLE_SETS_STORAGE_KEY);
    if (!raw) return mockStyleSets;
    const parsed = JSON.parse(raw) as StyleSet[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : mockStyleSets;
  } catch {
    return mockStyleSets;
  }
}

export function saveStyleSets(styleSets: StyleSet[]) {
  window.localStorage.setItem(STYLE_SETS_STORAGE_KEY, JSON.stringify(styleSets));
}
