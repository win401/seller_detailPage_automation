"use client";

import { Eye, EyeOff, GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import { DetailSection } from "@/lib/types";

export function SectionList({
  sections,
  selectedId,
  hiddenIds,
  onSelect,
  onToggleHide,
}: {
  sections: DetailSection[];
  selectedId: string;
  hiddenIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleHide: (id: string) => void;
}) {
  return (
    <div className="flex flex-col">
      {sections.map((sec, i) => {
        const hidden = hiddenIds.has(sec.id);
        const active = sec.id === selectedId;
        return (
          <div
            key={sec.id}
            onClick={() => onSelect(sec.id)}
            className={cn(
              "flex cursor-pointer items-center gap-2 border-l-[2.5px] border-transparent px-3.5 py-2.5",
              active && "border-primary bg-accent-soft",
              hidden && "opacity-45"
            )}
          >
            <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="w-[18px] shrink-0 font-mono text-[11px] text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
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
      })}
    </div>
  );
}
