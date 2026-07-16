import { IMAGE_MAX_HEIGHT } from "./image-optimize";
import { canvasToPngFile, stitchVertically } from "./stitch-canvases";

function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("이미지를 읽지 못했습니다."));
        return;
      }
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
      image.src = reader.result;
    };
    reader.onerror = () => reject(reader.error ?? new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

// Capture-split tools name parts sequentially (01/02/03...), and a browser
// file input's FileList doesn't reliably preserve click/selection order
// across browsers — filename order is what "순서대로 올리면 이어붙인다"
// actually needs to mean. `numeric: true` makes "2.png" sort before
// "10.png" instead of after.
function sortByNameNatural(files: File[]): File[] {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}

/**
 * Stitches multiple already-split capture images (e.g. a "긴 캡처를 PNG
 * 3장으로 나눠 저장" tool's output) into one long image, sorted by filename,
 * before flowing into the existing optimizeImageFile() pipeline — same
 * "one long vertical capture" model as pdf-to-image.ts, just with images
 * as the input instead of PDF pages.
 */
export async function stitchImageFiles(files: File[]): Promise<File> {
  const ordered = sortByNameNatural(files);
  const images = await Promise.all(ordered.map(loadImageFile));
  const stitched = stitchVertically(
    images.map((image) => ({ source: image, width: image.naturalWidth, height: image.naturalHeight })),
    IMAGE_MAX_HEIGHT
  );
  return canvasToPngFile(stitched, "stitched-capture.png");
}
