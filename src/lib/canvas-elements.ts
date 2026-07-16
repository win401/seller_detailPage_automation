import { richTextToPlainText } from "./rich-text";
import { CanvasElement, DetailSection, SectionCanvasData } from "./types";

const CANVAS_WIDTH = 860;
const CANVAS_HEIGHT = 520;
const PADDING = 48;

/**
 * One-time conversion from the structured (flow-layout) section shape into a
 * free-form canvas: a background shape plus a headline text box, a body text
 * box, and — if the section has one — an image box, all given sensible
 * default positions/sizes. This is the only place structured content becomes
 * canvasData; it never runs again once canvasData exists (see the "자유
 * 편집으로 전환" button in section-edit-panel.tsx), so edits afterward only
 * touch canvasData directly. Badge grids / item lists / other slots are
 * intentionally dropped here — vertical-slice scope (docs/TASKS.md).
 */
export function createDefaultCanvasData(section: DetailSection): SectionCanvasData {
  const headlineText = richTextToPlainText(section.headline);
  const bodyText = richTextToPlainText(section.body);
  const hasImage = !!section.imageUrl;

  const textAreaWidth = CANVAS_WIDTH - PADDING * 2;
  const imageHeight = hasImage ? 220 : 0;
  const imageY = CANVAS_HEIGHT - imageHeight - PADDING;

  const elements: CanvasElement[] = [
    {
      id: "headline",
      type: "text",
      x: PADDING,
      y: PADDING,
      width: textAreaWidth,
      height: 72,
      text: headlineText,
      fontSize: 26,
      lineHeight: 1.3,
      letterSpacing: 0,
      align: "left",
      fill: "#1f2420",
      bold: true,
    },
    {
      id: "body",
      type: "text",
      x: PADDING,
      y: PADDING + 88,
      width: textAreaWidth,
      height: 96,
      text: bodyText,
      fontSize: 15,
      lineHeight: 1.6,
      letterSpacing: 0,
      align: "left",
      fill: "#55524a",
    },
  ];

  if (hasImage) {
    elements.push({
      id: "image",
      type: "image",
      x: PADDING,
      y: imageY,
      width: textAreaWidth,
      height: imageHeight,
      imageUrl: section.imageUrl,
      fit: "cover",
    });
  }

  return {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    background: { fill: "#f7f5ef", cornerRadius: 0 },
    elements,
  };
}
