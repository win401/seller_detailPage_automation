import { IMAGE_MAX_HEIGHT } from "./image-optimize";

// Sanity cap so an accidental huge PDF doesn't hang the browser rendering
// dozens of pages client-side.
const MAX_PDF_PAGES = 30;
const PDF_RENDER_SCALE = 2;

/**
 * Renders every page of a PDF and stitches them vertically into a single
 * PNG File — multi-page PDFs become one long image, matching this feature's
 * "한 장의 세로로 긴 캡처 이미지" concept, before flowing into the existing
 * optimizeImageFile() pipeline unchanged. pdfjs-dist is dynamically
 * imported (client-only), same pattern as html-to-image/jszip in the ZIP
 * export flow, to keep it out of the initial bundle.
 */
export async function pdfFileToImageFile(file: File): Promise<File> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  if (pdf.numPages === 0) {
    throw new Error("PDF에서 페이지를 찾을 수 없습니다.");
  }
  if (pdf.numPages > MAX_PDF_PAGES) {
    throw new Error(`PDF 페이지가 너무 많습니다(최대 ${MAX_PDF_PAGES}장). 필요한 구간만 캡처해 이미지로 올려주세요.`);
  }

  const pageCanvases: HTMLCanvasElement[] = [];
  let totalHeight = 0;
  let maxWidth = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context is not available");
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    pageCanvases.push(canvas);
    totalHeight += canvas.height;
    maxWidth = Math.max(maxWidth, canvas.width);
  }

  // Chrome/Skia silently returns an empty canvas past ~16384px in one
  // dimension with no error (see IMAGE_MAX_HEIGHT in image-optimize.ts) —
  // stitching pages naively could cross that well before
  // optimizeImageFile() ever gets a chance to downscale it downstream, so
  // cap the *stitched* canvas itself here, before it's created.
  const stitchScale = Math.min(1, IMAGE_MAX_HEIGHT / totalHeight);
  const stitchedWidth = Math.max(1, Math.round(maxWidth * stitchScale));
  const stitchedHeight = Math.max(1, Math.round(totalHeight * stitchScale));

  const stitched = document.createElement("canvas");
  stitched.width = stitchedWidth;
  stitched.height = stitchedHeight;
  const stitchedCtx = stitched.getContext("2d");
  if (!stitchedCtx) throw new Error("Canvas context is not available");
  stitchedCtx.fillStyle = "#ffffff";
  stitchedCtx.fillRect(0, 0, stitchedWidth, stitchedHeight);

  let yOffset = 0;
  for (const pageCanvas of pageCanvases) {
    const drawHeight = pageCanvas.height * stitchScale;
    const drawWidth = pageCanvas.width * stitchScale;
    stitchedCtx.drawImage(pageCanvas, 0, yOffset, drawWidth, drawHeight);
    yOffset += drawHeight;
  }

  const blob = await new Promise<Blob | null>((resolve) => stitched.toBlob(resolve, "image/png"));
  if (!blob) {
    throw new Error("PDF를 이미지로 변환하지 못했습니다.");
  }

  return new File([blob], file.name.replace(/\.pdf$/i, ".png"), { type: "image/png" });
}
