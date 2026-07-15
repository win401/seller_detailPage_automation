import { UploadedImageDraft } from "@/lib/types";

export const IMAGE_MAX_WIDTH = 1200;
export const IMAGE_QUALITY = 0.85;
export const IMAGE_OUTPUT_TYPE = "image/webp";
// Chrome silently returns an empty "data:," canvas (no error, no rejected
// promise) once a dimension crosses its internal encode limit — measured
// in-browser at width 900 it flips between 14500 (ok) and 16384 (fails),
// consistent with Skia's ~16384px max canvas dimension. This bites long,
// full-page screenshots (e.g. the competitor-analysis uploader) where
// width alone is capped but height is not. Cap height directly, well
// under the observed failure point, rather than an area-based estimate
// (area alone didn't predict the failure — 900x16384 fails at 14.7MP
// while 1200x8000 succeeds at 9.6MP).
export const IMAGE_MAX_HEIGHT = 8000;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, type: string, quality: number) {
  return canvas.toDataURL(type, quality);
}

/** Client-side resize (max width 1200) + WebP compression, used by both the
 * product image uploader and the competitor detail-page image uploader. */
export async function optimizeImageFile(file: File): Promise<UploadedImageDraft> {
  const originalDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Image read failed"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Image read failed"));
    reader.readAsDataURL(file);
  });

  const image = await loadImage(originalDataUrl);
  const widthScale = Math.min(1, IMAGE_MAX_WIDTH / image.naturalWidth);
  const heightAfterWidthScale = image.naturalHeight * widthScale;
  const heightScale = Math.min(1, IMAGE_MAX_HEIGHT / heightAfterWidthScale);
  const scale = widthScale * heightScale;
  const optimizedWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const optimizedHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = optimizedWidth;
  canvas.height = optimizedHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context is not available");
  ctx.drawImage(image, 0, 0, optimizedWidth, optimizedHeight);

  const optimizedDataUrl = canvasToDataUrl(canvas, IMAGE_OUTPUT_TYPE, IMAGE_QUALITY);
  if (!/^data:image\/[^;]+;base64,.+/.test(optimizedDataUrl)) {
    throw new Error(
      "이미지를 처리하지 못했습니다. 이미지가 너무 크거나 손상되었을 수 있습니다."
    );
  }
  const estimatedSize = Math.round((optimizedDataUrl.length * 3) / 4);
  const optimized = scale < 1 || estimatedSize < file.size;

  return {
    dataUrl: optimizedDataUrl,
    name: file.name.replace(/\.[^.]+$/, ".webp"),
    size: estimatedSize,
    type: IMAGE_OUTPUT_TYPE,
    originalSize: file.size,
    originalWidth: image.naturalWidth,
    originalHeight: image.naturalHeight,
    optimizedWidth,
    optimizedHeight,
    optimized,
  };
}
