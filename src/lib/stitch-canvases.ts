/** A drawable source plus its intrinsic size — HTMLCanvasElement uses
 * width/height, HTMLImageElement uses naturalWidth/naturalHeight, so
 * callers normalize to this shape rather than this module caring which. */
export interface StitchableSource {
  source: CanvasImageSource;
  width: number;
  height: number;
}

/**
 * Stacks sources vertically into one canvas, pre-scaled so the *stitched*
 * canvas itself never exceeds `maxHeight`. Chrome/Skia silently returns an
 * empty canvas past ~16384px in one dimension with no error (see
 * IMAGE_MAX_HEIGHT in image-optimize.ts) — stitching several tall sources
 * can cross that well before any downstream resize gets a chance to catch
 * it, so the cap has to apply here, before the canvas is created, not
 * after. Shared by pdf-to-image.ts (PDF pages) and stitch-images.ts
 * (multiple uploaded capture files).
 */
export function stitchVertically(sources: StitchableSource[], maxHeight: number): HTMLCanvasElement {
  if (sources.length === 0) {
    throw new Error("이어붙일 이미지가 없습니다.");
  }

  let totalHeight = 0;
  let maxWidth = 0;
  for (const s of sources) {
    totalHeight += s.height;
    maxWidth = Math.max(maxWidth, s.width);
  }

  const scale = Math.min(1, maxHeight / totalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(maxWidth * scale));
  canvas.height = Math.max(1, Math.round(totalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context is not available");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let yOffset = 0;
  for (const s of sources) {
    const drawWidth = s.width * scale;
    const drawHeight = s.height * scale;
    ctx.drawImage(s.source, 0, yOffset, drawWidth, drawHeight);
    yOffset += drawHeight;
  }

  return canvas;
}

export async function canvasToPngFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("이미지를 만들지 못했습니다.");
  return new File([blob], name, { type: "image/png" });
}
