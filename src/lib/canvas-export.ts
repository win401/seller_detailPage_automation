import Konva from "konva";

import { SectionCanvasData } from "./types";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Renders canvasData at its real (export-resolution) size through a
 * detached, offscreen Konva stage and returns a PNG data URL — used only at
 * export time (handleExport in the editor page), never for on-screen
 * preview (see SectionCanvasKonva, which renders the same data live via
 * react-konva at a scaled-down preview size instead).
 *
 * This exists because the live preview <canvas> doesn't get captured
 * reliably by html-to-image (the DOM screenshot library ZIP export already
 * uses for every other, plain-DOM section) — real exports came out with the
 * canvas content stretched. Rendering straight from canvasData through
 * Konva's own toDataURL sidesteps that entirely: no cross-library canvas
 * embedding involved, just Konva rendering its own data at its own stated
 * resolution.
 */
export async function renderCanvasDataToDataUrl(data: SectionCanvasData): Promise<string> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  try {
    const stage = new Konva.Stage({ container, width: data.width, height: data.height });
    const layer = new Konva.Layer();
    stage.add(layer);

    layer.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width: data.width,
        height: data.height,
        fill: data.background.fill,
        cornerRadius: data.background.cornerRadius,
      })
    );

    for (const el of data.elements) {
      const common = {
        x: el.x,
        y: el.y,
        rotation: el.rotation ?? 0,
        width: el.width,
        height: el.height,
      };
      if (el.type === "shape") {
        layer.add(new Konva.Rect({ ...common, fill: el.fill, cornerRadius: el.cornerRadius }));
      } else if (el.type === "text") {
        layer.add(
          new Konva.Text({
            ...common,
            text: el.text,
            fontSize: el.fontSize,
            lineHeight: el.lineHeight,
            letterSpacing: el.letterSpacing,
            align: el.align,
            fill: el.fill,
            fontStyle: el.bold ? "bold" : "normal",
            fontFamily: el.fontFamily ?? undefined,
          })
        );
      } else if (el.imageUrl) {
        const image = await loadImage(el.imageUrl);
        layer.add(new Konva.Image({ ...common, image }));
      }
    }

    layer.draw();
    const dataUrl = stage.toDataURL({ pixelRatio: 1, mimeType: "image/png" });
    stage.destroy();
    return dataUrl;
  } finally {
    container.remove();
  }
}
