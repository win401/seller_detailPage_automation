"use client";

import { Eye, EyeOff, GripVertical } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";
import { DetailSection } from "@/lib/types";

function SortableSectionRow({
  sec,
  index,
  active,
  hidden,
  onSelect,
  onToggleHide,
}: {
  sec: DetailSection;
  index: number;
  active: boolean;
  hidden: boolean;
  onSelect: (id: string) => void;
  onToggleHide: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sec.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => onSelect(sec.id)}
      className={cn(
        "flex cursor-pointer items-center gap-2 border-l-[2.5px] border-transparent bg-card px-3.5 py-2.5",
        active && "border-primary bg-accent-soft",
        hidden && "opacity-45",
        isDragging && "z-10 opacity-70 shadow-[0_6px_16px_rgba(23,32,28,0.16)]"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 cursor-grab touch-none p-0.5 text-muted-foreground active:cursor-grabbing"
        aria-label="섹션 순서 변경"
      >
        <GripVertical className="size-3.5" />
      </button>
      <span className="w-[18px] shrink-0 font-mono text-[11px] text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span
        className={cn(
          "flex-1 truncate text-[12.5px] font-semibold",
          active ? "text-primary" : "text-foreground"
        )}
      >
        {sec.title}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleHide(sec.id);
        }}
        className="shrink-0 p-0.5 text-muted-foreground"
      >
        {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  );
}

export function SectionList({
  sections,
  selectedId,
  hiddenIds,
  onSelect,
  onToggleHide,
  onReorder,
}: {
  sections: DetailSection[];
  selectedId: string;
  hiddenIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleHide: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((sec) => sec.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col">
          {sections.map((sec, i) => (
            <SortableSectionRow
              key={sec.id}
              sec={sec}
              index={i}
              active={sec.id === selectedId}
              hidden={hiddenIds.has(sec.id)}
              onSelect={onSelect}
              onToggleHide={onToggleHide}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
