"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Redo2,
  Save,
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
import { mockPlanRevision } from "@/lib/mock-ai";
import {
  AgentWorkflowDraft,
  DetailSection,
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
  const [aiOpen, setAiOpen] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState("");
  const [pendingSections, setPendingSections] = useState<DetailSection[] | null>(null);
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
    setPendingSections(null);
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

  function generateRevisionDraft(request: string) {
    const nextSections = mockPlanRevision(sections, selectedSection, request);
    const now = new Date().toISOString();
    setPendingSections(nextSections);
    setAgentWorkflow((prev) => {
      if (!prev) return prev;
      const nextWorkflow: AgentWorkflowDraft = {
        ...prev,
        runs: [
          ...prev.runs,
          {
            id: `agent-revision-${Date.now()}`,
            agentType: "revision_planning",
            status: "mocked",
            title: "기획자 에이전트 수정 요청",
            summary: `"${request.trim()}" 요청을 바탕으로 새 시안 후보를 만들었습니다.`,
            output: {
              selectedSection: selectedSection.title,
              revisedSectionCount: nextSections.filter(
                (section, index) => section.body !== sections[index]?.body
              ).length,
            },
            warnings: ["MVP에서는 mock 재기획 결과이며, 실제 Claude API 연결은 후속 작업입니다."],
            createdAt: now,
          },
        ],
      };
      window.localStorage.setItem(agentWorkflowKey, JSON.stringify(nextWorkflow));
      return nextWorkflow;
    });
    toast("재기획 시안이 생성되었습니다", { description: "적용 전/후를 확인해보세요" });
  }

  function applyAiPending() {
    if (!pendingSections) return;
    pushHistory();
    setSections(pendingSections);
    flash(selectedId);
    setPendingSections(null);
    toast("재기획 시안이 캔버스에 반영되었습니다");
  }

  function discardAiPending() {
    setPendingSections(null);
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

      {aiOpen ? (
          <div className="fixed right-7 bottom-7 z-40 flex max-h-[70vh] w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 text-accent">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4" />
                <span className="font-bold">기획자 에이전트</span>
              </div>
              <button onClick={() => setAiOpen(false)} className="rounded-md p-0.5">
                <X className="size-3.5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <AiAssistantPanel
                section={selectedSection}
                request={revisionRequest}
                pendingSections={pendingSections}
                onChangeRequest={setRevisionRequest}
                onGenerate={generateRevisionDraft}
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
        )}
    </div>
  );
}
