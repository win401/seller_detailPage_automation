import type { SupabaseClient } from "@supabase/supabase-js";

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

/** snake_case DB row shape of public.style_sets, mirrored to StyleSet below. */
interface StyleSetRow {
  id: string;
  user_id: string;
  name: string;
  default_mood: string;
  default_tone: string;
  primary_color: string;
  secondary_color: string;
  default_platform: string;
  section_visibility: Record<string, boolean>;
  brand_note: string | null;
  image_position: string | null;
  image_position_x: number | null;
  image_position_y: number | null;
  image_fit: string | null;
  image_height: string | null;
  spacing: number | null;
  text_scale: number | null;
  font_family: string | null;
  letter_spacing: number | null;
  line_height: number | null;
  preferred_layout_by_kind: Record<string, string>;
  image_slot_priority: string[];
  created_at: string;
  updated_at: string;
}

function mapStyleSetRow(row: StyleSetRow): StyleSet {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    defaultMood: row.default_mood as StyleSet["defaultMood"],
    defaultTone: row.default_tone as StyleSet["defaultTone"],
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    defaultPlatform: row.default_platform as StyleSet["defaultPlatform"],
    sectionVisibility: (row.section_visibility ?? {}) as StyleSet["sectionVisibility"],
    brandNote: row.brand_note ?? undefined,
    imagePosition: (row.image_position ?? undefined) as StyleSet["imagePosition"],
    imagePositionX: row.image_position_x ?? undefined,
    imagePositionY: row.image_position_y ?? undefined,
    imageFit: (row.image_fit ?? undefined) as StyleSet["imageFit"],
    imageHeight: (row.image_height ?? undefined) as StyleSet["imageHeight"],
    spacing: row.spacing ?? undefined,
    textScale: row.text_scale ?? undefined,
    fontFamily: (row.font_family ?? undefined) as StyleSet["fontFamily"],
    letterSpacing: row.letter_spacing ?? undefined,
    lineHeight: row.line_height ?? undefined,
    preferredLayoutByKind: (row.preferred_layout_by_kind ?? {}) as StyleSet["preferredLayoutByKind"],
    imageSlotPriority: (row.image_slot_priority ?? []) as StyleSet["imageSlotPriority"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStyleSetToRow(styleSet: StyleSet, userId: string) {
  return {
    id: styleSet.id,
    user_id: userId,
    name: styleSet.name,
    default_mood: styleSet.defaultMood,
    default_tone: styleSet.defaultTone,
    primary_color: styleSet.primaryColor,
    secondary_color: styleSet.secondaryColor,
    default_platform: styleSet.defaultPlatform,
    section_visibility: styleSet.sectionVisibility,
    brand_note: styleSet.brandNote ?? null,
    image_position: styleSet.imagePosition ?? null,
    image_position_x: styleSet.imagePositionX ?? null,
    image_position_y: styleSet.imagePositionY ?? null,
    image_fit: styleSet.imageFit ?? null,
    image_height: styleSet.imageHeight ?? null,
    spacing: styleSet.spacing ?? null,
    text_scale: styleSet.textScale ?? null,
    font_family: styleSet.fontFamily ?? null,
    letter_spacing: styleSet.letterSpacing ?? null,
    line_height: styleSet.lineHeight ?? null,
    preferred_layout_by_kind: styleSet.preferredLayoutByKind ?? {},
    image_slot_priority: styleSet.imageSlotPriority ?? [],
    updated_at: new Date().toISOString(),
  };
}

export async function loadRemoteStyleSets(supabase: SupabaseClient, userId: string): Promise<StyleSet[]> {
  const { data, error } = await supabase.from("style_sets").select().eq("user_id", userId);
  if (error) throw error;
  return (data as StyleSetRow[]).map(mapStyleSetRow);
}

export async function upsertRemoteStyleSet(
  supabase: SupabaseClient,
  userId: string,
  styleSet: StyleSet
): Promise<void> {
  const { error } = await supabase.from("style_sets").upsert(mapStyleSetToRow(styleSet, userId));
  if (error) throw error;
}

export async function deleteRemoteStyleSet(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("style_sets").delete().eq("id", id);
  if (error) throw error;
}
