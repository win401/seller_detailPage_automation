"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { optimizeImageFile } from "@/lib/image-optimize";

const BUCKET = "competitor-references";

export interface CompetitorReferenceAsset {
  id: string;
  referenceId: string;
  storagePath: string;
  publicUrl: string;
  position: number;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  mimeType: string | null;
  createdAt: string;
}

interface CompetitorReferenceAssetRow {
  id: string;
  reference_id: string;
  storage_path: string;
  public_url: string;
  position: number;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
}

function rowToAsset(row: CompetitorReferenceAssetRow): CompetitorReferenceAsset {
  return {
    id: row.id,
    referenceId: row.reference_id,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    position: row.position,
    width: row.width,
    height: row.height,
    sizeBytes: row.size_bytes,
    mimeType: row.mime_type,
    createdAt: row.created_at,
  };
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Uploads one competitor-page capture (a single page/file, before stitching)
 * to the admin-only `competitor-references` Storage bucket and records it in
 * `competitor_reference_assets` with its page `position` — mirrors
 * `uploadProjectImage` (`storage.ts`) exactly: compress via the same
 * client-side pipeline, upload, then roll back the Storage object if the DB
 * insert fails so a pool entry-less file never lingers.
 */
export async function uploadReferenceAsset(
  supabase: SupabaseClient,
  userId: string,
  referenceId: string,
  file: File,
  position: number
): Promise<CompetitorReferenceAsset> {
  const optimized = await optimizeImageFile(file);
  const blob = await dataUrlToBlob(optimized.dataUrl);
  const extension = optimized.name.match(/\.[^.]+$/)?.[0] ?? ".webp";
  const storagePath = `${userId}/${referenceId}/${crypto.randomUUID()}${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType: blob.type || "image/webp" });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from("competitor_reference_assets")
    .insert({
      reference_id: referenceId,
      user_id: userId,
      storage_path: storagePath,
      public_url: publicUrl,
      position,
      width: optimized.optimizedWidth ?? null,
      height: optimized.optimizedHeight ?? null,
      size_bytes: optimized.size ?? blob.size,
      mime_type: blob.type || "image/webp",
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }

  return rowToAsset(data as CompetitorReferenceAssetRow);
}

export async function listReferenceAssets(
  supabase: SupabaseClient,
  referenceId: string
): Promise<CompetitorReferenceAsset[]> {
  const { data, error } = await supabase
    .from("competitor_reference_assets")
    .select()
    .eq("reference_id", referenceId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data as CompetitorReferenceAssetRow[]).map(rowToAsset);
}
