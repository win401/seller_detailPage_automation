import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** True for a real Supabase-issued UUID project/row id — false for the
 * local-only fallback ids (e.g. "p1") used before a project is saved to
 * Supabase. Shared so every insert that has an optional *_id FK can guard
 * against writing a non-UUID placeholder into a uuid column. */
export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
