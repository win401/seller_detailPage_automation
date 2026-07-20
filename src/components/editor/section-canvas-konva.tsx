"use client";

import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from "react-konva";

import { CanvasElement, SectionCanvasData } from "@/lib/types";

function useLoadedImage(src: string | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.src = src;
    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [src]);

  return src ? image : null;
}

function CanvasImageNode({
  element,
  ...shapeProps
}: { element: Extract<CanvasElement, { type: "image" }> } & Konva.ShapeConfig) {
  const image = useLoadedImage(element.imageUrl);
  return <KonvaImage image={image ?? undefined} {...shapeProps} />;
}

/**
 * Konva has no contentEditable equivalent, so double-clicking a text element
 * hides it and overlays a plain HTML <textarea> positioned exactly over its
 * on-screen rect (the standard Konva editable-text pattern) — commits back
 * into canvasData on blur, mirroring RichTextEditor's DOM-is-source-of-truth-
 * during-editing / commit-on-blur design elsewhere in this editor.
 *
 * Deliberately `position: absolute` inside the same `position: relative`
 * wrapper the Stage renders into (NOT `position: fixed` against the
 * viewport) — the editor wraps the whole canvas in a zoom `transform: scale`
 * ancestor, and CSS makes any transformed ancestor the containing block for
 * `position: fixed` descendants, which silently offset the overlay by
 * hundreds of px even at zoom 100% (`scale(1)` still counts). Positioning
 * relative to the immediate wrapper sidesteps that entirely — no
 * getBoundingClientRect() needed.
 */
function TextEditOverlay({
  element,
  scale,
  onCommit,
  onCancel,
}: {
  element: Extract<CanvasElement, { type: "text" }>;
  scale: number;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  return (
    <textarea
      ref={textareaRef}
      defaultValue={element.text}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      style={{
        position: "absolute",
        top: element.y * scale,
        left: element.x * scale,
        width: element.width * scale,
        height: element.height * scale,
        fontSize: element.fontSize * scale,
        lineHeight: element.lineHeight,
        letterSpacing: element.letterSpacing * scale,
        textAlign: element.align,
        fontWeight: element.bold ? 700 : 400,
        color: element.fill,
        border: "1px solid var(--primary)",
        padding: 0,
        margin: 0,
        background: "white",
        resize: "none",
        outline: "none",
        overflow: "hidden",
        zIndex: 50,
      }}
    />
  );
}

// Section previews render at a fixed 360px container width regardless of the
// section's real (export-resolution) coordinate space (section-canvas.tsx's
// canvasRef wrapper) — canvasData stores real coordinates (e.g. 860px wide,
// matching PLATFORM_EXPORT_WIDTH), so the Stage is scaled down to fit via
// Konva's own scaleX/scaleY rather than shrinking the coordinate values
// themselves. Konva reports drag/resize results back in the *unscaled*
// coordinate space automatically, so onChangeElement below needs no extra
// math to stay in canvasData's real coordinates.
const PREVIEW_WIDTH = 360;

export function SectionCanvasKonva({
  data,
  selectedElementId,
  onSelectElement,
  onChangeElement,
}: {
  data: SectionCanvasData;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onChangeElement: (id: string, patch: Partial<CanvasElement>) => void;
}) {
  const scale = PREVIEW_WIDTH / data.width;
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef(new Map<string, Konva.Node>());
  const [editingElementId, setEditingElementId] = useState<string | null>(null);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = selectedElementId ? shapeRefs.current.get(selectedElementId) : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedElementId, data.elements]);

  const editingElement = data.elements.find(
    (el): el is Extract<CanvasElement, { type: "text" }> => el.id === editingElementId && el.type === "text"
  );

  return (
    <div style={{ position: "relative", width: data.width * scale, height: data.height * scale }}>
      <Stage
        width={data.width * scale}
        height={data.height * scale}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) onSelectElement(null);
        }}
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={data.width}
            height={data.height}
            fill={data.background.fill}
            cornerRadius={data.background.cornerRadius}
          />
          {data.elements.map((el) => {
            const common = {
              ref: (node: Konva.Node | null) => {
                if (node) shapeRefs.current.set(el.id, node);
                else shapeRefs.current.delete(el.id);
              },
              x: el.x,
              y: el.y,
              rotation: el.rotation ?? 0,
              draggable: true,
              onClick: () => onSelectElement(el.id),
              onTap: () => onSelectElement(el.id),
              onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                onChangeElement(el.id, { x: e.target.x(), y: e.target.y() });
              },
              onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
                const node = e.target;
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();
                node.scaleX(1);
                node.scaleY(1);
                onChangeElement(el.id, {
                  x: node.x(),
                  y: node.y(),
                  width: Math.max(20, el.width * scaleX),
                  height: Math.max(20, el.height * scaleY),
                  rotation: node.rotation(),
                });
              },
            };

            if (el.type === "shape") {
              return (
                <Rect
                  key={el.id}
                  {...common}
                  width={el.width}
                  height={el.height}
                  fill={el.fill}
                  cornerRadius={el.cornerRadius}
                />
              );
            }
            if (el.type === "image") {
              return (
                <CanvasImageNode key={el.id} {...common} element={el} width={el.width} height={el.height} />
              );
            }
            return (
              <Text
                key={el.id}
                {...common}
                width={el.width}
                height={el.height}
                text={el.text}
                fontSize={el.fontSize}
                lineHeight={el.lineHeight}
                letterSpacing={el.letterSpacing}
                align={el.align}
                fill={el.fill}
                fontStyle={el.bold ? "bold" : "normal"}
                fontFamily={el.fontFamily ?? undefined}
                onDblClick={() => setEditingElementId(el.id)}
                onDblTap={() => setEditingElementId(el.id)}
              />
            );
          })}
          <Transformer ref={transformerRef} rotateEnabled flipEnabled={false} />
        </Layer>
      </Stage>
      {editingElement && (
        <TextEditOverlay
          element={editingElement}
          scale={scale}
          onCommit={(text) => {
            onChangeElement(editingElement.id, { text });
            setEditingElementId(null);
          }}
          onCancel={() => setEditingElementId(null)}
        />
      )}
    </div>
  );
}
