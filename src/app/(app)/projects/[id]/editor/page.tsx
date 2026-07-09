"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Monitor,
  Redo2,
  Save,
  Smartphone,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { SectionCanvas } from "@/components/editor/section-canvas";
import { SectionList } from "@/components/editor/section-list";
import { SectionEditPanel } from "@/components/editor/section-edit-panel";
import { AiAssistantPanel } from "@/components/editor/ai-assistant-panel";
import { AgentWorkflowPanel } from "@/components/editor/agent-workflow-panel";
import { getMockReferencesForSection, mockProjectSummaries, mockSections } from "@/lib/mock-data";
import { mockAiRewrite } from "@/lib/mock-ai";
import {
  AgentWorkflowDraft,
  AiEditAction,
  DetailSection,
  EditorLayout,
  EditorTab,
  PLATFORM_LABELS,
  SectionImageAsset,
  UploadedImageDraft,
} from "@/lib/types";

interface Snapshot {
  sections: DetailSection[];
  hiddenIds: string[];
}

export default function DetailPageEditor() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const projectSummary =
    mockProjectSummaries.find((p) => p.id === projectId) ?? mockProjectSummaries[0];
  const storageKey = `detail-page-project:${projectId}`;
  const draftAssetsKey = `detail-page-draft-assets:${projectId}`;
  const agentWorkflowKey = `detail-page-agent-workflow:${projectId}`;
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const [sections, setSections] = useState<DetailSection[]>(mockSections);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string>(mockSections[0].id);
  const [layout, setLayout] = useState<EditorLayout>("horizontal");
  const [tab, setTab] = useState<EditorTab>("sections");
  const [aiOpen, setAiOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<AiEditAction | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const [productImage, setProductImage] = useState<UploadedImageDraft | null>(null);
  const [agentWorkflow, setAgentWorkflow] = useState<AgentWorkflowDraft | null>(null);

  // Load a locally saved draft, if one exists (docs/MVP_PLAN.md Should Have:
  // localStorage fallback). Supabase persistence is a later phase.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Snapshot;
        // one-time load from localStorage on mount, not a render loop
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSections(parsed.sections);
        setHiddenIds(new Set(parsed.hiddenIds));
        setLoadedFromStorage(true);
      }
    } catch {
      // ignore corrupt local storage
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftAssetsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { productImage?: UploadedImageDraft };
      if (parsed.productImage) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProductImage(parsed.productImage);
      }
    } catch {
      // ignore corrupt asset storage
    }
  }, [draftAssetsKey]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(agentWorkflowKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AgentWorkflowDraft;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAgentWorkflow(parsed);
    } catch {
      // ignore corrupt agent workflow storage
    }
  }, [agentWorkflowKey]);

  const selectedSection = sections.find((s) => s.id === selectedId) ?? sections[0];

  const pushHistory = useCallback(() => {
    setUndoStack((prev) => [...prev, { sections, hiddenIds: Array.from(hiddenIds) }]);
    setRedoStack([]);
  }, [sections, hiddenIds]);

  function flash(id: string) {
    setFlashId(id);
    window.setTimeout(() => setFlashId((current) => (current === id ? null : current)), 900);
  }

  function selectSection(id: string) {
    setSelectedId(id);
    setPendingAction(null);
    setPendingText(null);
  }

  function updateSelectedBody(value: string) {
    pushHistory();
    setSections((prev) => prev.map((s) => (s.id === selectedId ? { ...s, body: value } : s)));
  }

  function toggleHide(id: string) {
    pushHistory();
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function moveSelected(dir: -1 | 1) {
    pushHistory();
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === selectedId);
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(idx, 1);
      next.splice(nextIdx, 0, item);
      return next;
    });
  }

  function regenerateSelected() {
    pushHistory();
    const rewrites = [
      "매일 쓰기 좋은 디테일까지 다시 다듬은 문장입니다.",
      "더 담백하게, 그러나 장점은 분명하게 정리했습니다.",
      "제품의 핵심 가치를 한 번 더 검토해 다시 썼습니다.",
    ];
    const newBody = rewrites[Math.floor(Math.random() * rewrites.length)];
    setSections((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, body: newBody } : s))
    );
    flash(selectedId);
  }

  function applySectionImage(asset: SectionImageAsset) {
    pushHistory();
    setSections((prev) =>
      prev.map((s) =>
        s.id === selectedId
          ? {
              ...s,
              imageUrl: asset.dataUrl,
              imageGradient: asset.gradient,
              imageLabel: asset.label,
              imageSource: asset.source,
              imagePrompt: asset.promptHint,
            }
          : s
      )
    );
    flash(selectedId);
    toast("섹션 이미지가 반영되었습니다", { description: asset.label });
  }

  function uploadSectionImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      applySectionImage({
        id: `section-upload-${selectedId}-${Date.now()}`,
        label: file.name,
        description: "섹션에 직접 업로드한 이미지",
        source: "uploaded",
        dataUrl: reader.result,
        promptHint: "Use this uploaded image for the selected detail-page section.",
        tags: ["uploaded", selectedSection.kind, selectedSection.imageRole],
      });
    };
    reader.readAsDataURL(file);
  }

  function selectAiAction(action: AiEditAction) {
    setPendingAction(action);
    setPendingText(mockAiRewrite(selectedSection, action));
  }

  function applyAiPending() {
    if (!pendingText) return;
    pushHistory();
    setSections((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, body: pendingText } : s))
    );
    flash(selectedId);
    setPendingAction(null);
    setPendingText(null);
    toast("AI 수정 결과가 섹션에 반영되었습니다");
  }

  function discardAiPending() {
    setPendingAction(null);
    setPendingText(null);
  }

  function undo() {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, { sections, hiddenIds: Array.from(hiddenIds) }]);
      setSections(last.sections);
      setHiddenIds(new Set(last.hiddenIds));
      return prev.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setUndoStack((u) => [...u, { sections, hiddenIds: Array.from(hiddenIds) }]);
      setSections(last.sections);
      setHiddenIds(new Set(last.hiddenIds));
      return prev.slice(0, -1);
    });
  }

  // Ctrl+Z / Ctrl+Shift+Z (or Cmd on Mac) keyboard shortcuts (docs/MVP_PLAN.md §11).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, hiddenIds, undoStack, redoStack]);

  function handleSave() {
    const snapshot: Snapshot = { sections, hiddenIds: Array.from(hiddenIds) };
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    toast("저장되었습니다", { description: "이 브라우저에 임시 저장됨" });
  }

  async function handleExport() {
    if (!canvasWrapRef.current) return;
    setIsExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const JSZip = (await import("jszip")).default;
      const dataUrl = await toPng(canvasWrapRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const blob = await (await fetch(dataUrl)).blob();
      const zip = new JSZip();
      zip.file("01.png", blob);
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectSummary.name}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast("ZIP 다운로드가 완료되었습니다", { description: "01.png" });
    } finally {
      setIsExporting(false);
    }
  }

  const visibleSections = useMemo(
    () => sections.filter((s) => !hiddenIds.has(s.id)),
    [sections, hiddenIds]
  );
  const selectedReferences = useMemo(
    () => getMockReferencesForSection(selectedSection),
    [selectedSection]
  );

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col">
      <div className="flex h-[58px] shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="flex size-8 items-center justify-center rounded-lg border border-border"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{projectSummary.name}</div>
            <div className="text-[11.5px] text-muted-foreground">
              {PLATFORM_LABELS[projectSummary.platform]} ·{" "}
              {loadedFromStorage ? "저장된 draft 불러옴" : "새 초안"}
            </div>
          </div>
        </div>

        <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setLayout("horizontal")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
              layout === "horizontal" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Monitor className="size-3.5" />
            가로 모니터
          </button>
          <button
            type="button"
            onClick={() => setLayout("vertical")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
              layout === "vertical" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Smartphone className="size-3.5" />
            세로 모니터
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={undo}
            disabled={undoStack.length === 0}
            variant="outline"
            size="icon"
            title="되돌리기 (Ctrl+Z)"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            onClick={redo}
            disabled={redoStack.length === 0}
            variant="outline"
            size="icon"
            title="다시하기 (Ctrl+Shift+Z)"
          >
            <Redo2 className="size-4" />
          </Button>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-bold text-accent">
            {PLATFORM_LABELS[projectSummary.platform]}
          </span>
          <Button onClick={handleSave} variant="outline" className="h-[34px] gap-1.5 text-[12.5px] font-semibold">
            <Save className="size-3.5" />
            저장
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="h-[34px] gap-1.5 text-[12.5px] font-bold"
          >
            <Download className="size-3.5" />
            {isExporting ? "생성 중..." : "ZIP 다운로드"}
          </Button>
        </div>
      </div>

      {layout === "horizontal" ? (
        <div className="grid min-h-0 flex-1 grid-cols-[230px_minmax(0,1fr)_320px]">
          <div className="flex flex-col overflow-y-auto border-r border-border bg-card">
            <div className="border-b border-border px-4 py-3 text-xs font-bold text-muted-foreground">
              섹션 목록
            </div>
            <SectionList
              sections={sections}
              selectedId={selectedId}
              hiddenIds={hiddenIds}
              onSelect={selectSection}
              onToggleHide={toggleHide}
            />
            <div className="mt-auto border-t border-border p-3">
              <AgentWorkflowPanel workflow={agentWorkflow} compact />
            </div>
          </div>

          <div className="flex min-h-0 flex-col bg-background">
            <div className="border-b border-border px-4 py-3 text-xs font-bold text-muted-foreground">
              상세페이지 캔버스
            </div>
            <div className="flex flex-1 justify-center overflow-y-auto px-4.5 py-6.5">
              <div ref={canvasWrapRef}>
                <SectionCanvas
                  sections={visibleSections}
                  selectedId={selectedId}
                  flashId={flashId}
                  platform={projectSummary.platform}
                  onSelect={selectSection}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col overflow-y-auto border-l border-border bg-card">
            <div className="border-b border-border px-4 py-3 text-xs font-bold text-muted-foreground">
              섹션 편집 · {selectedSection.title}
            </div>
            <div className="p-4">
              <SectionEditPanel
                section={selectedSection}
                hidden={hiddenIds.has(selectedId)}
                onChangeBody={updateSelectedBody}
                onMoveUp={() => moveSelected(-1)}
                onMoveDown={() => moveSelected(1)}
                onToggleHide={() => toggleHide(selectedId)}
                onRegenerate={regenerateSelected}
                productImage={productImage}
                references={selectedReferences}
                onApplyImage={applySectionImage}
                onUploadSectionImage={uploadSectionImage}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 justify-center overflow-y-auto bg-background px-4 py-5">
            <div ref={canvasWrapRef}>
              <SectionCanvas
                sections={visibleSections}
                selectedId={selectedId}
                flashId={flashId}
                platform={projectSummary.platform}
                onSelect={selectSection}
              />
            </div>
          </div>
          <div className="flex h-[280px] shrink-0 flex-col border-t border-border bg-card">
            <div className="flex border-b border-border">
              {(
                [
                  { id: "sections", label: "섹션" },
                  { id: "edit", label: "편집" },
                  { id: "agents", label: "에이전트" },
                  { id: "ai", label: "AI 도우미" },
                ] as { id: EditorTab; label: string }[]
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 border-b-2 py-2.5 text-xs font-bold ${
                    tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {tab === "sections" && (
                <SectionList
                  sections={sections}
                  selectedId={selectedId}
                  hiddenIds={hiddenIds}
                  onSelect={selectSection}
                  onToggleHide={toggleHide}
                />
              )}
              {tab === "edit" && (
                <SectionEditPanel
                  section={selectedSection}
                  hidden={hiddenIds.has(selectedId)}
                  onChangeBody={updateSelectedBody}
                  onMoveUp={() => moveSelected(-1)}
                  onMoveDown={() => moveSelected(1)}
                  onToggleHide={() => toggleHide(selectedId)}
                  onRegenerate={regenerateSelected}
                  productImage={productImage}
                  references={selectedReferences}
                  onApplyImage={applySectionImage}
                  onUploadSectionImage={uploadSectionImage}
                />
              )}
              {tab === "agents" && <AgentWorkflowPanel workflow={agentWorkflow} />}
              {tab === "ai" && (
                <AiAssistantPanel
                  section={selectedSection}
                  pendingAction={pendingAction}
                  pendingText={pendingText}
                  onSelectAction={selectAiAction}
                  onApply={applyAiPending}
                  onDiscard={discardAiPending}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {layout === "horizontal" &&
        (aiOpen ? (
          <div className="fixed right-7 bottom-7 z-40 flex max-h-[70vh] w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 text-accent">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4" />
                <span className="font-bold">AI 편집 도우미</span>
              </div>
              <button onClick={() => setAiOpen(false)} className="rounded-md p-0.5">
                <X className="size-3.5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <AiAssistantPanel
                section={selectedSection}
                pendingAction={pendingAction}
                pendingText={pendingText}
                onSelectAction={selectAiAction}
                onApply={applyAiPending}
                onDiscard={discardAiPending}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAiOpen(true)}
            className="fixed right-7 bottom-7 z-40 flex size-[54px] items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_24px_rgba(204,95,51,0.4)] motion-safe:animate-[aiPulse_2.4s_ease-in-out_infinite]"
          >
            <Sparkles className="size-5.5" />
          </button>
        ))}
    </div>
  );
}
