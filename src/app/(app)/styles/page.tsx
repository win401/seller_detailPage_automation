"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PresetToggleGroup, SliderField } from "@/components/editor/layout-preset-controls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockStyleSets } from "@/lib/mock-data";
import {
  IMAGE_POSITION_DEFAULT,
  IMAGE_POSITION_RANGE,
  LETTER_SPACING_DEFAULT,
  LETTER_SPACING_RANGE,
  LINE_HEIGHT_DEFAULT,
  LINE_HEIGHT_RANGE,
  SECTION_SPACING_DEFAULT,
  SECTION_SPACING_RANGE,
  TEXT_SIZE_DEFAULT,
  TEXT_SIZE_RANGE,
} from "@/lib/layout-presets";
import { loadStyleSets, saveStyleSets } from "@/lib/style-sets";
import { cn } from "@/lib/utils";
import {
  DesignMood,
  FONT_FAMILY_LABELS,
  IMAGE_FIT_LABELS,
  IMAGE_HEIGHT_LABELS,
  MOOD_LABELS,
  PLATFORM_LABELS,
  Platform,
  SECTION_KIND_ORDER,
  StyleSet,
  TONE_LABELS,
  Tone,
} from "@/lib/types";

const TONE_OPTIONS = Object.keys(TONE_LABELS) as Tone[];
const MOOD_OPTIONS = Object.keys(MOOD_LABELS) as DesignMood[];
const PLATFORM_OPTIONS = Object.keys(PLATFORM_LABELS) as Platform[];
const IMAGE_FIT_OPTIONS = (Object.keys(IMAGE_FIT_LABELS) as (keyof typeof IMAGE_FIT_LABELS)[]).map(
  (value) => ({ value, label: IMAGE_FIT_LABELS[value] })
);
const IMAGE_HEIGHT_OPTIONS = (
  Object.keys(IMAGE_HEIGHT_LABELS) as (keyof typeof IMAGE_HEIGHT_LABELS)[]
).map((value) => ({ value, label: IMAGE_HEIGHT_LABELS[value] }));
const FONT_FAMILY_OPTIONS = (
  Object.keys(FONT_FAMILY_LABELS) as (keyof typeof FONT_FAMILY_LABELS)[]
).map((value) => ({ value, label: FONT_FAMILY_LABELS[value] }));

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
        active
          ? "border-primary bg-accent-soft text-primary"
          : "border-border bg-card-soft text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function emptyStyleSet(): StyleSet {
  return {
    id: crypto.randomUUID(),
    userId: "local",
    name: "",
    defaultMood: "minimal",
    defaultTone: "practical",
    primaryColor: "#cc785c",
    secondaryColor: "#221c14",
    defaultPlatform: "smartstore",
    sectionVisibility: {},
    brandNote: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function StyleSetFormDialog({
  trigger,
  initial,
  onSave,
}: {
  trigger: React.ReactElement;
  initial: StyleSet | null;
  onSave: (styleSet: StyleSet) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<StyleSet>(() => initial ?? emptyStyleSet());

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(initial ?? emptyStyleSet());
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{initial ? "스타일 세트 수정" : "새 스타일 세트 만들기"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>이름</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="예: 테라코타 & 크림 기본"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>톤앤매너</Label>
            <div className="flex flex-wrap gap-1.5">
              {TONE_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  active={draft.defaultTone === t}
                  onClick={() => setDraft((d) => ({ ...d, defaultTone: t }))}
                >
                  {TONE_LABELS[t]}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>디자인 무드</Label>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  active={draft.defaultMood === m}
                  onClick={() => setDraft((d) => ({ ...d, defaultMood: m }))}
                >
                  {MOOD_LABELS[m]}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>기본 플랫폼</Label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_OPTIONS.map((p) => (
                <Chip
                  key={p}
                  active={draft.defaultPlatform === p}
                  onClick={() => setDraft((d) => ({ ...d, defaultPlatform: p }))}
                >
                  {PLATFORM_LABELS[p]}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>대표 색상</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={draft.primaryColor}
                  onChange={(e) => setDraft((d) => ({ ...d, primaryColor: e.target.value }))}
                  className="size-9 shrink-0 rounded-md border border-border"
                />
                <Input
                  value={draft.primaryColor}
                  onChange={(e) => setDraft((d) => ({ ...d, primaryColor: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>보조 색상</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={draft.secondaryColor}
                  onChange={(e) => setDraft((d) => ({ ...d, secondaryColor: e.target.value }))}
                  className="size-9 shrink-0 rounded-md border border-border"
                />
                <Input
                  value={draft.secondaryColor}
                  onChange={(e) => setDraft((d) => ({ ...d, secondaryColor: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-2 text-[13px] font-bold">레이아웃 기본값</div>
            <p className="mb-3 text-[11.5px] leading-5 text-muted-foreground">
              이 스타일 세트를 적용하면 모든 섹션에 아래 기본값이 일괄 적용됩니다. 적용 후에도
              에디터에서 섹션별로 다시 조정할 수 있습니다.
            </p>
            <div className="grid gap-2">
              <div>
                <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                  가로 위치
                </div>
                <SliderField
                  value={draft.imagePositionX}
                  defaultValue={IMAGE_POSITION_DEFAULT}
                  {...IMAGE_POSITION_RANGE}
                  unit="%"
                  onChange={(imagePositionX) => setDraft((d) => ({ ...d, imagePositionX }))}
                />
              </div>
              <div>
                <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                  세로 위치
                </div>
                <SliderField
                  value={draft.imagePositionY}
                  defaultValue={IMAGE_POSITION_DEFAULT}
                  {...IMAGE_POSITION_RANGE}
                  unit="%"
                  onChange={(imagePositionY) => setDraft((d) => ({ ...d, imagePositionY }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                    이미지 채우기
                  </div>
                  <PresetToggleGroup
                    options={IMAGE_FIT_OPTIONS}
                    value={draft.imageFit}
                    onChange={(imageFit) => setDraft((d) => ({ ...d, imageFit }))}
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                    이미지 높이
                  </div>
                  <PresetToggleGroup
                    options={IMAGE_HEIGHT_OPTIONS}
                    value={draft.imageHeight}
                    onChange={(imageHeight) => setDraft((d) => ({ ...d, imageHeight }))}
                  />
                </div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                  섹션 여백
                </div>
                <SliderField
                  value={draft.spacing}
                  defaultValue={SECTION_SPACING_DEFAULT}
                  {...SECTION_SPACING_RANGE}
                  onChange={(spacing) => setDraft((d) => ({ ...d, spacing }))}
                />
              </div>
              <div>
                <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                  텍스트 크기
                </div>
                <SliderField
                  value={draft.textScale}
                  defaultValue={TEXT_SIZE_DEFAULT}
                  {...TEXT_SIZE_RANGE}
                  onChange={(textScale) => setDraft((d) => ({ ...d, textScale }))}
                />
              </div>
            </div>
            <div className="mt-2">
              <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">글꼴</div>
              <Select
                value={draft.fontFamily ?? "system"}
                onValueChange={(fontFamily) =>
                  fontFamily && setDraft((d) => ({ ...d, fontFamily: fontFamily as StyleSet["fontFamily"] }))
                }
              >
                <SelectTrigger className="h-8 w-full bg-transparent text-[12px]">
                  <SelectValue>{(value: string) => FONT_FAMILY_LABELS[value as keyof typeof FONT_FAMILY_LABELS] ?? value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                  자간
                </div>
                <SliderField
                  value={draft.letterSpacing}
                  defaultValue={LETTER_SPACING_DEFAULT}
                  {...LETTER_SPACING_RANGE}
                  onChange={(letterSpacing) => setDraft((d) => ({ ...d, letterSpacing }))}
                />
              </div>
              <div>
                <div className="mb-1 text-[10.5px] font-semibold text-muted-foreground">
                  줄 간격
                </div>
                <SliderField
                  value={draft.lineHeight}
                  defaultValue={LINE_HEIGHT_DEFAULT}
                  {...LINE_HEIGHT_RANGE}
                  onChange={(lineHeight) => setDraft((d) => ({ ...d, lineHeight }))}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>브랜드 메모</Label>
            <Textarea
              rows={2}
              value={draft.brandNote ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, brandNote: e.target.value }))}
              placeholder="예: 텀블러·주방용품 라인에 사용하는 기본 세트"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={!draft.name.trim()}
            onClick={() => {
              onSave({ ...draft, updatedAt: new Date().toISOString() });
              setOpen(false);
            }}
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StyleSetsPage() {
  const [styleSets, setStyleSets] = useState<StyleSet[]>(mockStyleSets);

  useEffect(() => {
    // one-time hydration from localStorage on mount, not a render loop
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStyleSets(loadStyleSets());
  }, []);

  function persist(next: StyleSet[]) {
    setStyleSets(next);
    saveStyleSets(next);
  }

  function upsert(styleSet: StyleSet) {
    persist(
      styleSets.some((s) => s.id === styleSet.id)
        ? styleSets.map((s) => (s.id === styleSet.id ? styleSet : s))
        : [...styleSets, styleSet]
    );
  }

  function remove(id: string) {
    persist(styleSets.filter((s) => s.id !== id));
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-8 pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">스타일 세트</h1>
          <p className="text-[13.5px] text-muted-foreground">
            반복되는 톤·색상·플랫폼·레이아웃 설정을 저장해두고 새 프로젝트에 재사용하세요
          </p>
        </div>
        <StyleSetFormDialog
          initial={null}
          onSave={upsert}
          trigger={
            <Button className="h-[38px] gap-1.5 px-4 text-[13.5px] font-bold">
              <Plus className="size-4" />
              새 스타일 세트 만들기
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
        {styleSets.map((ss) => {
          const hiddenCount = Object.values(ss.sectionVisibility).filter(
            (v) => v === false
          ).length;
          return (
            <div key={ss.id} className="rounded-xl border border-border bg-card p-4.5">
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] font-bold">{ss.name}</span>
                <div className="flex items-center gap-1">
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-bold text-accent">
                    {PLATFORM_LABELS[ss.defaultPlatform]}
                  </span>
                  <StyleSetFormDialog
                    initial={ss}
                    onSave={upsert}
                    trigger={
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                        aria-label="스타일 세트 수정"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    }
                  />
                  <button
                    type="button"
                    onClick={() => remove(ss.id)}
                    className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                    aria-label="스타일 세트 삭제"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="my-3 flex items-center gap-2">
                <div
                  className="size-[22px] rounded-md border border-border"
                  style={{ background: ss.primaryColor }}
                />
                <div
                  className="size-[22px] rounded-md border border-border"
                  style={{ background: ss.secondaryColor }}
                />
                <span className="text-[12.5px] text-muted-foreground">대표 · 보조 색상</span>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {MOOD_LABELS[ss.defaultMood]}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {TONE_LABELS[ss.defaultTone]}
                </span>
                {typeof ss.spacing === "number" && (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    여백 {ss.spacing}px
                  </span>
                )}
                {typeof ss.textScale === "number" && (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    텍스트 {ss.textScale}px
                  </span>
                )}
                {ss.fontFamily && (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    글꼴 {FONT_FAMILY_LABELS[ss.fontFamily]}
                  </span>
                )}
              </div>
              <p className="text-[12.5px] leading-6 text-muted-foreground">{ss.brandNote}</p>
              <div className="mt-2.5 flex gap-1">
                {SECTION_KIND_ORDER.map((kind) => (
                  <span
                    key={kind}
                    className="h-[5px] w-2.5 rounded-full"
                    style={{
                      background:
                        ss.sectionVisibility[kind] === false ? "var(--border)" : ss.primaryColor,
                    }}
                  />
                ))}
              </div>
              {hiddenCount > 0 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {hiddenCount}개 섹션 기본 숨김
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
