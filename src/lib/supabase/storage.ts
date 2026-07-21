"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { optimizeImageFile } from "@/lib/image-optimize";
import { ImageSlotCategory, ProjectImageAsset } from "@/lib/types";

const BUCKET = "product-images";

/** Row shape of public.project_image_assets (docs/supabase/schema.sql) —
 * snake_case DB columns, mapped to the camelCase ProjectImageAsset below. */
interface ProjectImageAssetRow {
  id: string;
  project_id: string;
  storage_path: string;
  public_url: string;
  original_filename: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  slot_category: ImageSlotCategory | null;
  created_at: string;
}

function rowToAsset(row: ProjectImageAssetRow): ProjectImageAsset {
  return {
    id: row.id,
    projectId: row.project_id,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    originalFilename: row.original_filename,
    width: row.width,
    height: row.height,
    sizeBytes: row.size_bytes,
    slotCategory: row.slot_category,
    createdAt: row.created_at,
  };
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Uploads a photo to the project's Storage folder and records it in the
 * project_image_assets pool. `source` is either a raw `File` (runs it
 * through the existing client-side optimizeImageFile compression pipeline
 * — 1200px width cap, WebP q0.85) or an already-compressed
 * `{dataUrl, name}` pair for callers that already did their own
 * compression server-side (e.g. Gemini section-image generation, which
 * runs through sharp before it ever reaches the browser) — re-compressing
 * that would just waste a canvas round-trip for no size benefit.
 */
export async function uploadProjectImage(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  source: File | { dataUrl: string; name: string },
  slotCategory?: ImageSlotCategory
): Promise<ProjectImageAsset> {
  const optimized =
    source instanceof File
      ? await optimizeImageFile(source)
      : { dataUrl: source.dataUrl, name: source.name, optimizedWidth: undefined, optimizedHeight: undefined, size: undefined };

  const blob = await dataUrlToBlob(optimized.dataUrl);
  const extension = optimized.name.match(/\.[^.]+$/)?.[0] ?? ".webp";
  const storagePath = `${userId}/${projectId}/${crypto.randomUUID()}${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType: blob.type || "image/webp" });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from("project_image_assets")
    .insert({
      project_id: projectId,
      user_id: userId,
      storage_path: storagePath,
      public_url: publicUrl,
      original_filename: optimized.name,
      width: optimized.optimizedWidth ?? null,
      height: optimized.optimizedHeight ?? null,
      size_bytes: optimized.size ?? blob.size,
      slot_category: slotCategory ?? null,
    })
    .select()
    .single();
  if (error) {
    // Row insert failed after the file made it to Storage — clean up the
    // orphaned object rather than leaving a pool entry-less file behind.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }

  return rowToAsset(data as ProjectImageAssetRow);
}

export async function deleteProjectImage(supabase: SupabaseClient, asset: ProjectImageAsset): Promise<void> {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([asset.storagePath]);
  if (storageError) throw storageError;
  const { error } = await supabase.from("project_image_assets").delete().eq("id", asset.id);
  if (error) throw error;
}

export async function listProjectImages(supabase: SupabaseClient, projectId: string): Promise<ProjectImageAsset[]> {
  const { data, error } = await supabase
    .from("project_image_assets")
    .select()
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ProjectImageAssetRow[]).map(rowToAsset);
}
