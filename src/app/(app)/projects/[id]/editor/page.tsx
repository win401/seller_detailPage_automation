"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { gsap } from "gsap";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { arrayMove } from "@dnd-kit/sortable";
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
import { getMockReferencesForSection, mockSections } from "@/lib/mock-data";
import { mockPlanRevision } from "@/lib/mock-ai";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  AgentRunDraft,
  AgentWorkflowDraft,
  DesignMood,
  DetailSection,
  GenerateDetailPageInput,
  Platform,
  PLATFORM_EXPORT_WIDTH,
  PLATFORM_LABELS,
  ProjectSummary,
  SectionImageAsset,
  UploadedImageDraft,
  UserStyleSignalDraft,
  UserStyleSignalKind,
} from "@/lib/types";

interface Snapshot {
  sections: DetailSection[];
  hiddenIds: string[];
}

interface LocalGeneration {
  input?: {
    productName?: string;
    category?: string;
    platform?: Platform;
    tone?: string;
    designMood?: string;
    [key: string]: unknown;
  };
  source?: string;
  warnings?: unknown[];
}

class SupabaseSaveError extends Error {
  constructor(
    public readonly step: string,
    cause: unknown
  ) {
    super(`${step}: ${getErrorMessage(cause)}`);
    this.name = "SupabaseSaveError";
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybeMessage = "message" in error ? error.message : undefined;
    const maybeDetails = "details" in error ? error.details : undefined;
    const maybeHint = "hint" in error ? error.hint : undefined;
    return [maybeMessage, maybeDetails, maybeHint].filter(Boolean).join(" / ") || "알 수 없는 오류";
  }
  return String(error || "알 수 없는 오류");
}

const EXPORT_SLICE_HEIGHT = 2000;
const CANVAS_ZOOM_MIN = 0.5;
const CANVAS_ZOOM_MAX = 1.5;
const CANVAS_ZOOM_STEP = 0.1;

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas export failed"));
    }, "image/png");
  });
}

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[^\w가-힣-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isPlatform(value: string | null | undefined): value is Platform {
  return value === "coupang" || value === "smartstore" || value === "ably" || value === "zigzag";
}

function isDesignMood(value: string | null | undefined): value is DesignMood {
  return value === "minimal" || value === "natural" || value === "premium" || value === "colorful";
}

function isDetailSectionArray(value: unknown): value is DetailSection[] {
  return (
    Array.isArray(value) &&
    value.every(
      (section) =>
        typeof section === "object" &&
        section !== null &&
        "id" in section &&
        "kind" in section &&
        "headline" in section &&
        "body" in section
    )
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default function DetailPageEditor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;
  const fallbackProjectSummary = useMemo<ProjectSummary>(
    () => ({
      id: projectId,
      name: "상세페이지 프로젝트",
      category: "카테고리 미설정",
      platform: "smartstore",
      updatedAtLabel: "-",
    }),
    [projectId]
  );
  const storageKey = `detail-page-project:${projectId}`;
  const draftAssetsKey = `detail-page-draft-assets:${projectId}`;
  const agentWorkflowKey = `detail-page-agent-workflow:${projectId}`;
  const generationKey = `detail-page-generation:${projectId}`;
  const styleSignalsKey = `detail-page-style-signals:${projectId}`;
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const exportSuccessRef = useRef<HTMLDivElement>(null);
  const panStateRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(
    null
  );

  const [projectSummary, setProjectSummary] = useState<ProjectSummary>(fallbackProjectSummary);
  const [sections, setSections] = useState<DetailSection[]>(mockSections);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string>(mockSections[0].id);
  const [aiOpen, setAiOpen] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState("");
  const [pendingSections, setPendingSections] = useState<DetailSection[] | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [exportSuccessKey, setExportSuccessKey] = useState(0);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const [draftLoadSource, setDraftLoadSource] = useState<"mock" | "local" | "supabase">("mock");
  const [isLoadingRemoteDraft, setIsLoadingRemoteDraft] = useState(false);
  const [productImage, setProductImage] = useState<UploadedImageDraft | null>(null);
  const [referenceImage, setReferenceImage] = useState<UploadedImageDraft | null>(null);
  const [agentWorkflow, setAgentWorkflow] = useState<AgentWorkflowDraft | null>(null);
  const [styleSignals, setStyleSignals] = useState<UserStyleSignalDraft[]>([]);
  const [styleSignalSync, setStyleSignalSync] = useState<"local" | "remote" | "idle">("idle");
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const node = exportSuccessRef.current;
    if (!node || exportSuccessKey === 0 || shouldReduceMotion) return;

    const timeline = gsap.timeline();
    timeline
      .fromTo(
        node,
        { autoAlpha: 0, y: 12, scale: 0.92 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: "back.out(1.6)" }
      )
      .to(node, { autoAlpha: 0, y: -8, duration: 0.28, delay: 1.15, ease: "power2.in" });

    return () => {
      timeline.kill();
    };
  }, [exportSuccessKey, shouldReduceMotion]);

  // Load a locally saved draft, if one exists (docs/MVP_PLAN.md Should Have:
  // localStorage fallback). Draft persistence is still local; style signals sync to Supabase below.
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
        setDraftLoadSource("local");
      }
    } catch {
      // ignore corrupt local storage
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftAssetsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        productImage?: UploadedImageDraft;
        referenceImage?: UploadedImageDraft;
      };
      if (parsed.productImage) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProductImage(parsed.productImage);
      }
      if (parsed.referenceImage) {
        setReferenceImage(parsed.referenceImage);
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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(generationKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        input?: {
          productName?: string;
          category?: string;
          platform?: ProjectSummary["platform"];
        };
      };
      if (!parsed.input) return;
      // one-time metadata hydration from localStorage after route mount
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProjectSummary({
        id: projectId,
        name: parsed.input.productName || fallbackProjectSummary.name,
        category: parsed.input.category || fallbackProjectSummary.category,
        platform: parsed.input.platform || fallbackProjectSummary.platform,
        updatedAtLabel: "방금 전",
      });
    } catch {
      // ignore corrupt generation storage
    }
  }, [fallbackProjectSummary, generationKey, projectId]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(styleSignalsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as UserStyleSignalDraft[];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStyleSignals(parsed);
    } catch {
      // ignore corrupt style signal storage
    }
  }, [styleSignalsKey]);

  useEffect(() => {
    if (!isUuid(projectId)) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;

    async function loadRemoteDraft() {
      const { data: project, error: projectError } = await client
        .from("detail_page_projects")
        .select(
          "id, title, category, selected_platform, current_draft_version_id, product_input, updated_at"
        )
        .eq("id", projectId)
        .single();

      if (cancelled || projectError || !project) return;

      const platform = isPlatform(project.selected_platform)
        ? project.selected_platform
        : fallbackProjectSummary.platform;

      const nextSummary: ProjectSummary = {
        id: project.id,
        name: project.title || fallbackProjectSummary.name,
        category: project.category || fallbackProjectSummary.category,
        platform,
        updatedAtLabel: "DB 저장본",
      };

      let draftQuery = client
        .from("draft_versions")
        .select("id, sections, hidden_section_ids, source, review_summary, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (project.current_draft_version_id) {
        draftQuery = client
          .from("draft_versions")
          .select("id, sections, hidden_section_ids, source, review_summary, created_at")
          .eq("id", project.current_draft_version_id)
          .limit(1);
      }

      const { data: drafts, error: draftError } = await draftQuery;
      if (cancelled || draftError) return;

      const draft = drafts?.[0];
      const remoteSections = isDetailSectionArray(draft?.sections) ? draft.sections : null;
      const remoteHiddenIds = isStringArray(draft?.hidden_section_ids)
        ? draft.hidden_section_ids
        : [];

      const { data: runs } = await client
        .from("agent_runs")
        .select("id, agent_type, status, title, summary, output, warnings, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      const remoteWorkflow: AgentWorkflowDraft | null = runs?.length
        ? {
            competitorReferences: [],
            revisionEnabled: true,
            runs: runs.map(
              (run): AgentRunDraft => ({
                id: run.id,
                agentType: run.agent_type as AgentRunDraft["agentType"],
                status: run.status as AgentRunDraft["status"],
                title: run.title ?? "에이전트 실행",
                summary: run.summary ?? "",
                output:
                  typeof run.output === "object" && run.output !== null
                    ? (run.output as Record<string, unknown>)
                    : {},
                warnings: isStringArray(run.warnings) ? run.warnings : [],
                createdAt: run.created_at,
              })
            ),
          }
        : null;

      // One-time hydration from Supabase when opening a persisted project.
      setProjectSummary(nextSummary);
      if (remoteSections) {
        setSections(remoteSections);
        setHiddenIds(new Set(remoteHiddenIds));
        setSelectedId(remoteSections[0]?.id ?? selectedId);
        setLoadedFromStorage(false);
        setDraftLoadSource("supabase");
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ sections: remoteSections, hiddenIds: remoteHiddenIds })
        );
      }
      if (remoteWorkflow) {
        setAgentWorkflow(remoteWorkflow);
        window.localStorage.setItem(agentWorkflowKey, JSON.stringify(remoteWorkflow));
      }

      // product_input holds the original GenerateDetailPageInput JSON; use it
      // so mood/tone/keywords survive a cross-device load (previously only
      // name/category/platform were kept, dropping mood/keywords/etc. even
      // though product_input was already fetched above).
      const productInput = isRecord(project.product_input) ? project.product_input : undefined;
      const localGeneration = {
        input: {
          productName:
            (typeof productInput?.productName === "string" && productInput.productName) ||
            nextSummary.name,
          category:
            (typeof productInput?.category === "string" && productInput.category) ||
            nextSummary.category,
          platform: nextSummary.platform,
          keywords: isStringArray(productInput?.keywords) ? productInput.keywords : [],
          targetCustomer:
            typeof productInput?.targetCustomer === "string" ? productInput.targetCustomer : "",
          emphasisPoints: isStringArray(productInput?.emphasisPoints) ? productInput.emphasisPoints : [],
          tone: typeof productInput?.tone === "string" ? productInput.tone : "practical",
          designMood: isDesignMood(
            typeof productInput?.designMood === "string" ? productInput.designMood : undefined
          )
            ? productInput?.designMood
            : "minimal",
          additionalInstruction:
            typeof productInput?.additionalInstruction === "string"
              ? productInput.additionalInstruction
              : "",
        },
        source: draft?.source ?? "mock",
        warnings:
          typeof draft?.review_summary === "object" && draft.review_summary !== null
            ? (draft.review_summary as { warnings?: unknown }).warnings
            : [],
      };
      window.localStorage.setItem(generationKey, JSON.stringify(localGeneration));
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time loading flag for this mount's fetch, not a render loop
    setIsLoadingRemoteDraft(true);
    void loadRemoteDraft().finally(() => {
      if (!cancelled) setIsLoadingRemoteDraft(false);
    });

    return () => {
      cancelled = true;
    };
    // One-time hydration on mount (see comment above) — intentionally excludes
    // `selectedId` from deps. Including it caused this effect to re-fetch and
    // reset the selection to the first section on every section click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    agentWorkflowKey,
    fallbackProjectSummary.category,
    fallbackProjectSummary.name,
    fallbackProjectSummary.platform,
    generationKey,
    projectId,
    storageKey,
  ]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;

    let cancelled = false;

    async function loadRemoteStyleSignals() {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) return;

      const { data, error } = await client
        .from("user_style_signals")
        .select("id, project_id, section_id, section_title, kind, before, after, summary, created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (cancelled || error || !data?.length) return;

      const remoteSignals: UserStyleSignalDraft[] = data.map((signal) => ({
        id: signal.id,
        projectId: signal.project_id ?? projectId,
        sectionId: signal.section_id ?? undefined,
        sectionTitle: signal.section_title ?? undefined,
        kind: signal.kind as UserStyleSignalKind,
        before: signal.before ?? undefined,
        after: signal.after ?? undefined,
        summary: signal.summary,
        createdAt: signal.created_at,
      }));

      setStyleSignals((prev) => {
        const byId = new Map<string, UserStyleSignalDraft>();
        [...remoteSignals, ...prev].forEach((signal) => byId.set(signal.id, signal));
        const next = Array.from(byId.values()).slice(0, 30);
        window.localStorage.setItem(styleSignalsKey, JSON.stringify(next));
        return next;
      });
      setStyleSignalSync("remote");
    }

    void loadRemoteStyleSignals();

    return () => {
      cancelled = true;
    };
  }, [projectId, styleSignalsKey]);

  const selectedSection = sections.find((s) => s.id === selectedId) ?? sections[0];

  const pushHistory = useCallback(() => {
    setUndoStack((prev) => [...prev, { sections, hiddenIds: Array.from(hiddenIds) }]);
    setRedoStack([]);
  }, [sections, hiddenIds]);

  function flash(id: string) {
    setFlashId(id);
    window.setTimeout(() => setFlashId((current) => (current === id ? null : current)), 900);
  }

  function openAiPanel() {
    setAiOpen(true);
  }

  function closeAiPanel() {
    setAiOpen(false);
  }

  function selectSection(id: string) {
    setSelectedId(id);
    setPendingSections(null);
  }

  function summarizeStyleSignal(kind: UserStyleSignalKind, sectionTitle: string, after?: string) {
    switch (kind) {
      case "copy_manual_edit":
        return `${sectionTitle} 문구를 사용자가 직접 수정했습니다. 다음 기획에서는 이 표현 톤을 우선 참고합니다.`;
      case "headline_choice":
        return `${sectionTitle} 헤드라인 후보를 사용자가 선택했습니다. 다음 기획에서는 이 표현을 우선 참고합니다.`;
      case "section_reorder":
        return `${sectionTitle} 섹션 순서를 사용자가 조정했습니다. 다음 기획에서는 섹션 우선순위를 참고합니다.`;
      case "section_visibility":
        return `${sectionTitle} 섹션 표시 상태를 사용자가 변경했습니다. 다음 기획에서는 섹션 필요도를 참고합니다.`;
      case "section_image_choice":
        return `${sectionTitle} 섹션 이미지 방향을 사용자가 선택했습니다. 다음 기획에서는 선호 비주얼을 참고합니다.`;
      case "planner_revision_apply":
        return `기획자 에이전트 시안을 사용자가 적용했습니다: ${after ?? "수정 요청 반영"}`;
    }
  }

  async function persistStyleSignal(signal: UserStyleSignalDraft) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStyleSignalSync("local");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStyleSignalSync("local");
      return;
    }

    const { error } = await supabase.from("user_style_signals").insert({
      user_id: user.id,
      project_id: isUuid(signal.projectId) ? signal.projectId : null,
      section_id: signal.sectionId,
      section_title: signal.sectionTitle,
      kind: signal.kind,
      before: signal.before,
      after: signal.after,
      summary: signal.summary,
      created_at: signal.createdAt,
    });

    if (error) {
      setStyleSignalSync("local");
      toast("스타일 신호는 로컬에 저장되었습니다", {
        description: "Supabase 저장은 스키마 적용 또는 로그인 상태 확인 후 다시 연결됩니다.",
      });
      return;
    }

    setStyleSignalSync("remote");
  }

  function recordStyleSignal({
    kind,
    section = selectedSection,
    before,
    after,
  }: {
    kind: UserStyleSignalKind;
    section?: DetailSection;
    before?: string;
    after?: string;
  }) {
    if (before !== undefined && after !== undefined && before.trim() === after.trim()) return;

    const nextSignal: UserStyleSignalDraft = {
      id: `style-signal-${Date.now()}`,
      projectId,
      sectionId: section.id,
      sectionTitle: section.title,
      kind,
      before,
      after,
      summary: summarizeStyleSignal(kind, section.title, after),
      createdAt: new Date().toISOString(),
    };

    setStyleSignals((prev) => {
      const next = [nextSignal, ...prev].slice(0, 30);
      window.localStorage.setItem(styleSignalsKey, JSON.stringify(next));
      return next;
    });

    void persistStyleSignal(nextSignal);
  }

  function readLocalGeneration(): LocalGeneration | null {
    try {
      const raw = window.localStorage.getItem(generationKey);
      return raw ? (JSON.parse(raw) as LocalGeneration) : null;
    } catch {
      return null;
    }
  }

  function copyLocalDraftKeys(nextProjectId: string) {
    const keyPairs = [
      [storageKey, `detail-page-project:${nextProjectId}`],
      [draftAssetsKey, `detail-page-draft-assets:${nextProjectId}`],
      [agentWorkflowKey, `detail-page-agent-workflow:${nextProjectId}`],
      [generationKey, `detail-page-generation:${nextProjectId}`],
      [styleSignalsKey, `detail-page-style-signals:${nextProjectId}`],
    ];

    keyPairs.forEach(([fromKey, toKey]) => {
      const raw = window.localStorage.getItem(fromKey);
      if (raw) window.localStorage.setItem(toKey, raw);
    });
  }

  async function persistDraftToSupabase(snapshot: Snapshot) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { saved: false, reason: "Supabase 환경변수가 없습니다." };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { saved: false, reason: "로그인 세션이 없습니다." };

    const localGeneration = readLocalGeneration();
    const input = localGeneration?.input ?? {};
    const projectTitle = input.productName || projectSummary.name || "상세페이지 프로젝트";
    const projectCategory = input.category || projectSummary.category || "카테고리 미설정";
    const projectPlatform = isPlatform(input.platform) ? input.platform : projectSummary.platform;
    const projectMood = typeof input.designMood === "string" ? input.designMood : "minimal";
    const projectTone = typeof input.tone === "string" ? input.tone : "practical";

    let remoteProjectId = isUuid(projectId) ? projectId : null;

    if (!remoteProjectId) {
      const { data: project, error: projectError } = await supabase
        .from("detail_page_projects")
        .insert({
          user_id: user.id,
          title: projectTitle,
          category: projectCategory,
          selected_platform: projectPlatform,
          selected_mood: projectMood,
          selected_tone: projectTone,
          product_input: Object.keys(input).length
            ? input
            : {
                productName: projectTitle,
                category: projectCategory,
                platform: projectPlatform,
              },
        })
        .select("id")
        .single();

      if (projectError || !project?.id) {
        throw new SupabaseSaveError(
          "프로젝트 생성 실패",
          projectError ?? new Error("Project create failed")
        );
      }
      remoteProjectId = project.id as string;

      if (agentWorkflow?.runs.length) {
        const { error: runsError } = await supabase.from("agent_runs").insert(
          agentWorkflow.runs.map((run) => ({
            project_id: remoteProjectId,
            user_id: user.id,
            agent_type: run.agentType,
            status: run.status,
            title: run.title,
            summary: run.summary,
            input,
            output: run.output,
            warnings: run.warnings,
            created_at: run.createdAt,
          }))
        );
        if (runsError) {
          console.warn("Agent run save skipped:", runsError);
        }
      }
    }

    const { data: latestDraft, error: latestDraftError } = await supabase
      .from("draft_versions")
      .select("version_no")
      .eq("project_id", remoteProjectId)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDraftError) {
      console.warn("Latest draft lookup skipped:", latestDraftError);
    }

    const nextVersionNo =
      typeof latestDraft?.version_no === "number" ? latestDraft.version_no + 1 : 1;

    const { data: draft, error: draftError } = await supabase
      .from("draft_versions")
      .insert({
        project_id: remoteProjectId,
        user_id: user.id,
        version_no: nextVersionNo,
        source: "manual",
        sections: snapshot.sections,
        hidden_section_ids: snapshot.hiddenIds,
        asset_paths: [],
        review_summary: {
          savedAt: new Date().toISOString(),
          source: "editor_save",
          warnings: localGeneration?.warnings ?? [],
        },
      })
      .select("id")
      .single();

    if (draftError || !draft?.id) {
      throw new SupabaseSaveError(
        "초안 저장 실패",
        draftError ?? new Error("Draft save failed")
      );
    }

    const { error: updateError } = await supabase
      .from("detail_page_projects")
      .update({
        current_draft_version_id: draft.id,
        title: projectTitle,
        category: projectCategory,
        selected_platform: projectPlatform,
        updated_at: new Date().toISOString(),
      })
      .eq("id", remoteProjectId);

    if (updateError) {
      console.warn("Current draft pointer update skipped:", updateError);
    }

    if (remoteProjectId !== projectId) {
      copyLocalDraftKeys(remoteProjectId);
      router.replace(`/projects/${remoteProjectId}/editor`);
    }

    setProjectSummary({
      id: remoteProjectId,
      name: projectTitle,
      category: projectCategory,
      platform: projectPlatform,
      updatedAtLabel: "방금 전",
    });
    setLoadedFromStorage(false);
    setDraftLoadSource("supabase");

    return { saved: true, projectId: remoteProjectId };
  }

  function updateSelectedBody(value: string) {
    pushHistory();
    setSections((prev) => prev.map((s) => (s.id === selectedId ? { ...s, body: value } : s)));
  }

  function commitSelectedBody(before: string, after: string) {
    recordStyleSignal({ kind: "copy_manual_edit", before, after });
  }

  /** Canvas double-click inline edit commit for either headline or body (docs/TASKS.md §7). */
  function handleCanvasTextCommit(
    sectionId: string,
    field: "headline" | "body",
    before: string,
    after: string
  ) {
    if (before === after) return;
    const target = sections.find((s) => s.id === sectionId);
    pushHistory();
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, [field]: after } : s)));
    if (target) {
      recordStyleSignal({ kind: "copy_manual_edit", section: target, before, after });
    }
  }

  function zoomIn() {
    setCanvasZoom((z) => Math.min(CANVAS_ZOOM_MAX, Math.round((z + CANVAS_ZOOM_STEP) * 100) / 100));
  }

  function zoomOut() {
    setCanvasZoom((z) => Math.max(CANVAS_ZOOM_MIN, Math.round((z - CANVAS_ZOOM_STEP) * 100) / 100));
  }

  function resetZoom() {
    setCanvasZoom(1);
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!isSpaceDown || !canvasScrollRef.current) return;
    e.preventDefault();
    panStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: canvasScrollRef.current.scrollLeft,
      scrollTop: canvasScrollRef.current.scrollTop,
    };
    setIsPanning(true);
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!panStateRef.current || !canvasScrollRef.current) return;
    const dx = e.clientX - panStateRef.current.startX;
    const dy = e.clientY - panStateRef.current.startY;
    canvasScrollRef.current.scrollLeft = panStateRef.current.scrollLeft - dx;
    canvasScrollRef.current.scrollTop = panStateRef.current.scrollTop - dy;
  }

  function stopPanning() {
    panStateRef.current = null;
    setIsPanning(false);
  }

  function toggleHide(id: string) {
    const target = sections.find((section) => section.id === id);
    pushHistory();
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (target) {
      recordStyleSignal({
        kind: "section_visibility",
        section: target,
        before: hiddenIds.has(id) ? "hidden" : "visible",
        after: hiddenIds.has(id) ? "visible" : "hidden",
      });
    }
  }

  function moveSelected(dir: -1 | 1) {
    const currentIndex = sections.findIndex((s) => s.id === selectedId);
    const nextIndex = currentIndex + dir;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sections.length) return;

    pushHistory();
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === selectedId);
      const nextIdx = idx + dir;
      const next = prev.slice();
      const [item] = next.splice(idx, 1);
      next.splice(nextIdx, 0, item);
      return next;
    });
    recordStyleSignal({
      kind: "section_reorder",
      before: `index:${currentIndex}`,
      after: `index:${nextIndex}`,
    });
  }

  function reorderSections(activeId: string, overId: string) {
    const fromIndex = sections.findIndex((s) => s.id === activeId);
    const toIndex = sections.findIndex((s) => s.id === overId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    pushHistory();
    setSections((prev) => {
      const from = prev.findIndex((s) => s.id === activeId);
      const to = prev.findIndex((s) => s.id === overId);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
    recordStyleSignal({
      kind: "section_reorder",
      before: `index:${fromIndex}`,
      after: `index:${toIndex}`,
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

  /** Swaps the selected section's headline with one of its AI-generated
   * alternatives (docs/TASKS.md §11 "카피 후보 선택"), keeping the swap
   * reversible by putting the previous headline back into the candidate
   * list at the same slot. */
  function applyHeadlineAlternative(index: number) {
    const target = selectedSection;
    const candidate = target.alternatives[index];
    if (!candidate) return;

    pushHistory();
    setSections((prev) =>
      prev.map((s) =>
        s.id === selectedId
          ? {
              ...s,
              headline: candidate,
              alternatives: s.alternatives.map((alt, i) => (i === index ? target.headline : alt)),
            }
          : s
      )
    );
    flash(selectedId);
    recordStyleSignal({
      kind: "headline_choice",
      section: target,
      before: target.headline,
      after: candidate,
    });
  }

  function applySectionImage(asset: SectionImageAsset) {
    const beforeImage = selectedSection.imageLabel ?? "이미지 없음";
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
    recordStyleSignal({
      kind: "section_image_choice",
      before: beforeImage,
      after: asset.label,
    });
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

  async function generateSectionImage() {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);
    const prompt =
      selectedSection.imagePrompt ||
      `${selectedSection.title} 섹션, ${selectedSection.imageRole} 연출, 커머스 상세페이지용 이미지`;

    try {
      const response = await fetch("/api/agent-workflow/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, referenceImageDataUrl: productImage?.dataUrl }),
      });
      const result = (await response.json()) as { dataUrl?: string; error?: string };

      if (!response.ok || !result.dataUrl) {
        toast("이미지 생성 실패", { description: result.error ?? "알 수 없는 오류가 발생했습니다." });
        return;
      }

      applySectionImage({
        id: `ai-generated-${selectedId}-${Date.now()}`,
        label: "AI 생성 이미지",
        description: prompt.slice(0, 60),
        source: "generated",
        dataUrl: result.dataUrl,
        promptHint: prompt,
        tags: ["generated", selectedSection.kind],
      });
    } catch {
      toast("이미지 생성 실패", { description: "네트워크 오류로 요청을 완료하지 못했습니다." });
    } finally {
      setIsGeneratingImage(false);
    }
  }

  /** Best-effort reconstruction of the original generation input for the
   * revision agent — full detail lives in the localStorage generation blob
   * (same-browser case); falls back to summary fields + server-side defaults
   * (docs/TASKS.md §12) when that isn't available (e.g. cross-device). */
  function buildRevisionInput(): GenerateDetailPageInput {
    const local = readLocalGeneration()?.input as Partial<GenerateDetailPageInput> | undefined;
    return {
      productName: local?.productName || projectSummary.name,
      category: local?.category || projectSummary.category,
      keywords: local?.keywords ?? [],
      targetCustomer: local?.targetCustomer ?? "",
      emphasisPoints: local?.emphasisPoints ?? [],
      tone: local?.tone ?? "practical",
      designMood: local?.designMood ?? "minimal",
      platform: local?.platform ?? projectSummary.platform,
      additionalInstruction: local?.additionalInstruction,
    };
  }

  function appendAgentWorkflowRuns(newRuns: AgentRunDraft[]) {
    setAgentWorkflow((prev) => {
      const nextWorkflow: AgentWorkflowDraft = prev
        ? { ...prev, runs: [...prev.runs, ...newRuns] }
        : { competitorReferences: [], revisionEnabled: true, runs: newRuns };
      window.localStorage.setItem(agentWorkflowKey, JSON.stringify(nextWorkflow));
      return nextWorkflow;
    });
  }

  async function generateRevisionDraft(request: string) {
    if (isRevising) return;
    setIsRevising(true);

    try {
      const response = await fetch("/api/agent-workflow/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: buildRevisionInput(),
          currentSections: sections,
          selectedSectionId: selectedSection.id,
          request,
          analysisOutput: agentWorkflow?.runs.find((run) => run.agentType === "analysis")?.output,
          planningOutput: agentWorkflow?.runs.find((run) => run.agentType === "planning")?.output,
          reviewOutput: agentWorkflow?.runs.find((run) => run.agentType === "review")?.output,
        }),
      });
      if (!response.ok) throw new Error("Revision request failed");

      const result = (await response.json()) as {
        sections: DetailSection[];
        revisionSummary: string;
        revisionScope: string;
        runs: AgentRunDraft[];
      };

      setPendingSections(result.sections);
      appendAgentWorkflowRuns(result.runs);
      toast("재기획 시안이 생성되었습니다", {
        description: result.revisionSummary || "적용 전/후를 확인해보세요",
      });
    } catch {
      // Network/route failure — fall back to the original client-only mock
      // path so the panel still produces a usable candidate.
      const nextSections = mockPlanRevision(sections, selectedSection, request);
      appendAgentWorkflowRuns([
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
          warnings: ["네트워크 오류로 mock 재기획 결과를 사용했습니다."],
          createdAt: new Date().toISOString(),
        },
      ]);
      setPendingSections(nextSections);
      toast("재기획 시안이 생성되었습니다", { description: "네트워크 오류로 mock 결과를 사용했습니다" });
    } finally {
      setIsRevising(false);
    }
  }

  function applyAiPending() {
    if (!pendingSections) return;
    pushHistory();
    setSections(pendingSections);
    flash(selectedId);
    setPendingSections(null);
    recordStyleSignal({
      kind: "planner_revision_apply",
      before: selectedSection.body,
      after: revisionRequest.trim() || "기획자 에이전트 수정 시안 적용",
    });
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

  // Space + drag canvas panning (docs/TASKS.md §7). Ignored while the user is
  // typing (inline canvas edit, side-panel textarea, etc.) so Space still
  // types a literal space there instead of arming pan mode.
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || isTypingTarget(e.target)) return;
      e.preventDefault();
      setIsSpaceDown(true);
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      setIsSpaceDown(false);
      stopPanning();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Ctrl/Cmd + mouse wheel canvas zoom (docs/TASKS.md §7, Figma-style). React's
  // onWheel listener is attached passively by default, so calling
  // preventDefault() there would not actually stop the browser's native
  // page-zoom — a manually attached, non-passive native listener is required.
  useEffect(() => {
    const container = canvasScrollRef.current;
    if (!container) return;

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setCanvasZoom((z) => {
        const next = z - e.deltaY * 0.002;
        return Math.min(CANVAS_ZOOM_MAX, Math.max(CANVAS_ZOOM_MIN, Math.round(next * 100) / 100));
      });
    }

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  async function handleSave(options?: { silent?: boolean }) {
    if (isSaving) return { saved: false, reason: "이미 저장 중입니다." };

    const snapshot: Snapshot = { sections, hiddenIds: Array.from(hiddenIds) };
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));

    setIsSaving(true);
    try {
      const result = await persistDraftToSupabase(snapshot);

      if (!options?.silent) {
        if (result.saved) {
          toast("저장되었습니다", { description: "Supabase 프로젝트에 저장됨" });
        } else {
          toast("임시 저장되었습니다", { description: result.reason ?? "이 브라우저에 저장됨" });
        }
      }

      return result;
    } catch (error) {
      console.error("Supabase draft save failed:", error);
      if (!options?.silent) {
        toast("임시 저장되었습니다", {
          description: `${getErrorMessage(error)} · 이 브라우저에 저장됨`,
        });
      }
      return { saved: false, reason: getErrorMessage(error) };
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExport() {
    if (!canvasWrapRef.current) return;
    setIsExporting(true);
    try {
      await handleSave({ silent: true });
      const { toCanvas } = await import("html-to-image");
      const JSZip = (await import("jszip")).default;
      const exportWidth = PLATFORM_EXPORT_WIDTH[projectSummary.platform];
      const sourceWidth = canvasWrapRef.current.offsetWidth || 360;
      const sourceHeight = canvasWrapRef.current.scrollHeight || canvasWrapRef.current.offsetHeight;
      const pixelRatio = exportWidth / sourceWidth;
      const fullCanvas = await toCanvas(canvasWrapRef.current, {
        width: sourceWidth,
        height: sourceHeight,
        pixelRatio,
        backgroundColor: "#ffffff",
      });
      const zip = new JSZip();
      const sliceCount = Math.max(1, Math.ceil(fullCanvas.height / EXPORT_SLICE_HEIGHT));

      for (let index = 0; index < sliceCount; index += 1) {
        const sourceY = index * EXPORT_SLICE_HEIGHT;
        const sliceHeight = Math.min(EXPORT_SLICE_HEIGHT, fullCanvas.height - sourceY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = fullCanvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context is not available");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          fullCanvas,
          0,
          sourceY,
          fullCanvas.width,
          sliceHeight,
          0,
          0,
          fullCanvas.width,
          sliceHeight
        );
        const fileName = `${String(index + 1).padStart(2, "0")}.png`;
        zip.file(fileName, await canvasToBlob(sliceCanvas));
      }

      zip.file(
        "export-info.json",
        JSON.stringify(
          {
            platform: projectSummary.platform,
            width: fullCanvas.width,
            height: fullCanvas.height,
            sliceHeight: EXPORT_SLICE_HEIGHT,
            files: sliceCount,
            createdAt: new Date().toISOString(),
          },
          null,
          2
        )
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(projectSummary.name) || "detail-page"}_${projectSummary.platform}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast("ZIP 다운로드가 완료되었습니다", {
        description: `${exportWidth}px 폭 · ${sliceCount}개 PNG`,
      });
      setExportSuccessKey((key) => key + 1);
    } finally {
      setIsExporting(false);
    }
  }

  const visibleSections = useMemo(
    () => sections.filter((s) => !hiddenIds.has(s.id)),
    [sections, hiddenIds]
  );
  const selectedReferences = useMemo(() => {
    const mood = readLocalGeneration()?.input?.designMood;
    return getMockReferencesForSection(selectedSection, isDesignMood(mood) ? mood : "minimal");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- readLocalGeneration reads a stable per-project localStorage key
  }, [selectedSection]);

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
              {isLoadingRemoteDraft
                ? "불러오는 중..."
                : draftLoadSource === "supabase"
                  ? "DB draft 불러옴"
                  : loadedFromStorage
                    ? "저장된 draft 불러옴"
                    : "새 초안"}
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
          <Button
            onClick={() => void handleSave()}
            disabled={isSaving || isExporting}
            variant="outline"
            className="h-[34px] gap-1.5 text-[12.5px] font-semibold"
          >
            <Save className="size-3.5" />
            {isSaving ? "저장 중..." : "저장"}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isSaving || isExporting}
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
            onReorder={reorderSections}
          />
          <div className="mt-auto border-t border-border p-3">
            <AgentWorkflowPanel workflow={agentWorkflow} compact />
            <div className="mt-3 rounded-lg border border-border bg-card-soft p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold">스타일 신호</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                  {styleSignals.length}
                </span>
              </div>
              <div className="mt-1 text-[10.5px] font-bold text-muted-foreground">
                {styleSignalSync === "remote"
                  ? "Supabase 동기화됨"
                  : styleSignalSync === "local"
                    ? "로컬 저장 중"
                    : "저장 대기"}
              </div>
              <p className="mt-1 line-clamp-2 text-[11.5px] leading-5 text-muted-foreground">
                {styleSignals[0]?.summary ?? "수동 수정이 생기면 사용자 선호 신호로 저장됩니다."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs font-bold text-muted-foreground">
            <span>상세페이지 캔버스 · Space+드래그로 이동</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={zoomOut}
                disabled={canvasZoom <= CANVAS_ZOOM_MIN}
                className="flex size-6 items-center justify-center rounded-md border border-border text-sm font-bold disabled:opacity-40"
                aria-label="캔버스 축소"
              >
                −
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="min-w-11 rounded-md border border-border px-1.5 py-0.5 text-center text-[11px] font-bold"
                aria-label="캔버스 확대/축소 초기화"
              >
                {Math.round(canvasZoom * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={canvasZoom >= CANVAS_ZOOM_MAX}
                className="flex size-6 items-center justify-center rounded-md border border-border text-sm font-bold disabled:opacity-40"
                aria-label="캔버스 확대"
              >
                +
              </button>
            </div>
          </div>
          <div
            ref={canvasScrollRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={stopPanning}
            onMouseLeave={stopPanning}
            className={cn(
              "flex flex-1 justify-center overflow-auto px-[220px] py-[160px]",
              isSpaceDown && "cursor-grab",
              isPanning && "cursor-grabbing select-none"
            )}
          >
            <div style={{ transform: `scale(${canvasZoom})`, transformOrigin: "top center" }}>
              <div ref={canvasWrapRef}>
                <SectionCanvas
                  sections={visibleSections}
                  selectedId={selectedId}
                  flashId={flashId}
                  platform={projectSummary.platform}
                  onSelect={selectSection}
                  onCommitText={handleCanvasTextCommit}
                />
              </div>
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
              onCommitBody={commitSelectedBody}
              onMoveUp={() => moveSelected(-1)}
              onMoveDown={() => moveSelected(1)}
              onToggleHide={() => toggleHide(selectedId)}
              onRegenerate={regenerateSelected}
              onSelectAlternative={applyHeadlineAlternative}
              productImage={productImage}
              referenceImage={referenceImage}
              references={selectedReferences}
              onApplyImage={applySectionImage}
              onUploadSectionImage={uploadSectionImage}
              onGenerateImage={generateSectionImage}
              isGeneratingImage={isGeneratingImage}
            />
          </div>
        </div>
      </div>

      <LayoutGroup id="ai-assistant-motion">
        <AnimatePresence mode="popLayout" initial={false}>
          {aiOpen ? (
            <motion.div
              key="ai-panel"
              layoutId="ai-assistant-surface"
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 8 }}
              transition={{
                layout: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.18 },
                scale: { duration: 0.24 },
                y: { duration: 0.24 },
              }}
              className="fixed right-7 bottom-7 z-50 flex max-h-[70vh] w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)] transform-gpu will-change-transform"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3.5 text-accent">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4" />
                  <span className="font-bold">기획자 에이전트</span>
                </div>
                <button onClick={closeAiPanel} className="rounded-md p-0.5">
                  <X className="size-3.5" />
                </button>
              </div>
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.22, ease: "easeOut" }}
                className="overflow-y-auto p-4"
              >
                <AiAssistantPanel
                  section={selectedSection}
                  request={revisionRequest}
                  pendingSections={pendingSections}
                  onChangeRequest={setRevisionRequest}
                  onGenerate={generateRevisionDraft}
                  onApply={applyAiPending}
                  onDiscard={discardAiPending}
                  isRevising={isRevising}
                />
              </motion.div>
            </motion.div>
          ) : (
            <motion.button
              key="ai-fab"
              layoutId="ai-assistant-surface"
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.86, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              transition={{
                layout: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.18 },
                scale: { duration: 0.22 },
                y: { duration: 0.22 },
              }}
              onClick={openAiPanel}
              className="fixed right-7 bottom-7 z-40 flex size-[54px] items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_24px_rgba(204,95,51,0.4)] motion-safe:animate-[aiPulse_2.4s_ease-in-out_infinite] transform-gpu will-change-transform"
              aria-label="기획자 에이전트 열기"
            >
              <Sparkles className="size-5.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </LayoutGroup>
      <div
        key={exportSuccessKey}
        ref={exportSuccessRef}
        className="pointer-events-none fixed right-7 top-[78px] z-50 flex items-center gap-2 rounded-full border border-primary/30 bg-card px-3.5 py-2 text-[12px] font-bold text-primary opacity-0 shadow-[var(--shadow-elevated)]"
      >
        <Download className="size-3.5" />
        ZIP 생성 완료
      </div>
    </div>
  );
}
