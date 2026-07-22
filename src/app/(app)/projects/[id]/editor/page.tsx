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
  ImagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Save,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCanvas } from "@/components/editor/section-canvas";
import { SectionList } from "@/components/editor/section-list";
import { SectionEditPanel } from "@/components/editor/section-edit-panel";
import { AiAssistantPanel } from "@/components/editor/ai-assistant-panel";
import { AgentWorkflowPanel } from "@/components/editor/agent-workflow-panel";
import { ImageManagerDialog } from "@/components/editor/image-manager-dialog";
import { getMockReferencesForSection, mockSections } from "@/lib/mock-data";
import { mockPlanRevision, upgradeLegacyMockSections } from "@/lib/mock-ai";
import { applyLayoutPresetToSections, resolveHiddenSectionIds } from "@/lib/layout-presets";
import { loadUserStyleSignals } from "@/lib/style-signals";
import { loadRemoteStyleSets, loadStyleSets, saveStyleSets } from "@/lib/style-sets";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteProjectImage, listProjectImages, uploadProjectImage } from "@/lib/supabase/storage";
import { richTextToPlainText } from "@/lib/rich-text";
import { cn, isUuid } from "@/lib/utils";
import {
  AgentRunDraft,
  AgentWorkflowDraft,
  DesignMood,
  DetailSection,
  GenerateDetailPageInput,
  Platform,
  PLATFORM_EXPORT_WIDTH,
  PLATFORM_LABELS,
  ProjectImageAsset,
  ProjectSummary,
  RichText,
  SectionLayoutPreset,
  SectionImageAsset,
  SECTION_KIND_SLOT_CATEGORY,
  StyleSet,
  Tone,
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
  /** Wall-clock time the generation request took, ms (docs/TASKS.md 최우선:
   * mock/live·모델·생성시간 표시) — undefined for older saved drafts. */
  generationTimeMs?: number;
  /** Env-configured model id, only set when generation actually ran live
   * (null for mock, undefined for older saved drafts predating this field). */
  model?: string | null;
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

function isPlatform(value: string | null | undefined): value is Platform {
  return value === "coupang" || value === "smartstore" || value === "ably" || value === "zigzag";
}

function isDesignMood(value: string | null | undefined): value is DesignMood {
  return value === "minimal" || value === "natural" || value === "premium" || value === "colorful";
}

function isTone(value: string | null | undefined): value is Tone {
  return value === "practical" || value === "trust" || value === "premium" || value === "warm";
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

const SCALAR_SLOT_KEYS = [
  "eyebrow",
  "subHeadline",
  "brandName",
  "caption",
  "emphasis",
  "beforeLabel",
  "afterLabel",
] as const;
const ARRAY_SLOT_KEYS = ["badges", "items", "noticeItems"] as const;

/** Parses a renderEditableLabel key ("kicker" / "slot.<scalar>" /
 * "slot.<array>.<index>") and writes the edited value into the matching
 * field — the mutation side of section-canvas.tsx's plain-string label
 * editing (see handleCanvasLabelCommit's docstring for scope). Unknown/
 * malformed keys are a no-op rather than a throw, since this only ever
 * receives keys this file itself generated. */
function applyLabelEdit(section: DetailSection, key: string, value: string): DetailSection {
  if (key === "kicker") return { ...section, kicker: value };

  const scalarMatch = key.match(/^slot\.([a-zA-Z]+)$/);
  const scalarKey = scalarMatch?.[1];
  if (scalarKey && (SCALAR_SLOT_KEYS as readonly string[]).includes(scalarKey)) {
    return { ...section, slots: { ...section.slots, [scalarKey]: value } };
  }

  const arrayMatch = key.match(/^slot\.([a-zA-Z]+)\.(\d+)$/);
  const arrayKey = arrayMatch?.[1];
  if (arrayKey && (ARRAY_SLOT_KEYS as readonly string[]).includes(arrayKey)) {
    const index = Number(arrayMatch[2]);
    const currentArray = (section.slots?.[arrayKey as (typeof ARRAY_SLOT_KEYS)[number]] as string[] | undefined) ?? [];
    const nextArray = currentArray.map((item, i) => (i === index ? value : item));
    return { ...section, slots: { ...section.slots, [arrayKey]: nextArray } };
  }

  return section;
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
  const aiCloseButtonRef = useRef<HTMLButtonElement>(null);
  const aiFabButtonRef = useRef<HTMLButtonElement>(null);
  const wasAiOpenRef = useRef(false);
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
  const [styleSets, setStyleSets] = useState<StyleSet[]>([]);
  const [styleSetToApply, setStyleSetToApply] = useState<string>("");
  const [productImage, setProductImage] = useState<UploadedImageDraft | null>(null);
  const [referenceImage, setReferenceImage] = useState<UploadedImageDraft | null>(null);
  const [agentWorkflow, setAgentWorkflow] = useState<AgentWorkflowDraft | null>(null);
  const [styleSignals, setStyleSignals] = useState<UserStyleSignalDraft[]>([]);
  const [styleSignalSync, setStyleSignalSync] = useState<"local" | "remote" | "idle">("idle");
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  /** 좁은 데스크톱에서 좌/우 보조 패널을 접어 캔버스 폭을 확보하는 수동 토글
   * (docs/TASKS.md 우선순위 4). 너비 기준 자동 접힘이 아니라 항상 켜져 있는
   * 버튼 — 자동 브레이크포인트보다 사용자가 직접 켜고 끄는 편이 예측 가능함. */
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  /** 셀러가 업로드한 사진 풀 (docs/TASKS.md 우선순위 1) — Supabase Storage에
   * 저장, project_image_assets 테이블에서 로드. 실제 프로젝트(UUID)로
   * 저장돼 있어야만 쓸 수 있음(로컬 전용 초안은 업로드 대상 project_id가 없음). */
  const [projectImageAssets, setProjectImageAssets] = useState<ProjectImageAsset[]>([]);
  const [imageManagerOpen, setImageManagerOpen] = useState(false);
  const [isUploadingPoolImage, setIsUploadingPoolImage] = useState(false);

  // This page's chrome is a fixed h-[calc(100vh-60px)] layout with its own
  // internal per-column scroll (섹션 목록/캔버스/편집 패널) — the outer
  // <html>/<body> is never meant to scroll. But arriving here via the
  // client-side router.push from "새 상세페이지 만들기" (not a hard
  // navigation) leaves the page ~26px scrolled on mount — reproduced at
  // every viewport height tested, absent on a hard reload of the same URL,
  // so it's Next.js App Router's post-navigation focus/scroll handling
  // landing slightly off, not anything about this page's own content height
  // (manually resetting to 0 after mount always lands on the fully-correct,
  // nothing-cut-off position). Narrow-viewport laptops are the ones that
  // actually notice, since there the offset clips this page's own header
  // row instead of just leaving empty space below the fold.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
        const rawGeneration = window.localStorage.getItem(generationKey);
        const generation = rawGeneration ? (JSON.parse(rawGeneration) as LocalGeneration) : null;
        const input = generation?.input;
        const legacyInput: GenerateDetailPageInput | null = input?.productName
          ? {
              productName: input.productName,
              category: input.category ?? "",
              platform: input.platform ?? "smartstore",
              keywords: isStringArray(input.keywords) ? input.keywords : [],
              targetCustomer: typeof input.targetCustomer === "string" ? input.targetCustomer : "",
              emphasisPoints: isStringArray(input.emphasisPoints) ? input.emphasisPoints : [],
              tone: isTone(input.tone) ? input.tone : "practical",
              designMood: isDesignMood(input.designMood) ? input.designMood : "minimal",
              additionalInstruction:
                typeof input.additionalInstruction === "string" ? input.additionalInstruction : "",
            }
          : null;
        const displaySections = legacyInput
          ? upgradeLegacyMockSections(legacyInput, parsed.sections)
          : parsed.sections;
        if (displaySections !== parsed.sections) {
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({ sections: displaySections, hiddenIds: parsed.hiddenIds })
          );
        }
        // one-time load from localStorage on mount, not a render loop
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSections(displaySections);
        setHiddenIds(new Set(parsed.hiddenIds));
        setLoadedFromStorage(true);
        setDraftLoadSource("local");
      }
    } catch {
      // ignore corrupt local storage
    }
  }, [generationKey, storageKey]);

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
    // one-time hydration from localStorage on mount, not a render loop
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStyleSets(loadStyleSets());
  }, []);

  // Same remote-wins merge pattern as styles/page.tsx.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;

    async function mergeRemoteStyleSets() {
      const {
        data: { user },
      } = await supabase!.auth.getUser();
      if (!user || cancelled) return;

      try {
        const remoteSets = await loadRemoteStyleSets(supabase!, user.id);
        if (cancelled || remoteSets.length === 0) return;
        setStyleSets((prev) => {
          const byId = new Map<string, StyleSet>();
          [...prev, ...remoteSets].forEach((styleSet) => byId.set(styleSet.id, styleSet));
          const next = Array.from(byId.values());
          saveStyleSets(next);
          return next;
        });
      } catch {
        // 로컬 캐시로 계속 진행 — 이 페이지는 조회만 하므로 실패해도 안전.
      }
    }

    void mergeRemoteStyleSets();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // 로컬 전용(비UUID) 초안은 업로드 대상 project_id 자체가 없어서 그냥 빈 풀로 둠 —
    // "이미지 관리" 버튼도 이 경우 비활성화된다(아래 헤더 JSX).
    if (!isUuid(projectId)) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      try {
        const assets = await listProjectImages(supabase, projectId);
        if (!cancelled) setProjectImageAssets(assets);
      } catch {
        // best-effort — 이미지 관리 다이얼로그가 그냥 빈 풀로 열림
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

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

      const generatedInput = localGeneration.input as GenerateDetailPageInput;
      const displaySections = remoteSections
        ? upgradeLegacyMockSections(generatedInput, remoteSections)
        : null;

      if (displaySections) {
        setSections(displaySections);
        setHiddenIds(new Set(remoteHiddenIds));
        setSelectedId(displaySections[0]?.id ?? selectedId);
        setLoadedFromStorage(false);
        setDraftLoadSource("supabase");
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ sections: displaySections, hiddenIds: remoteHiddenIds })
        );
      }
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

      const remoteSignalsRaw = await loadUserStyleSignals(client, user.id);
      if (cancelled || remoteSignalsRaw.length === 0) return;

      // Substitute the current page's projectId for signals stored with a
      // null project_id (local-only drafts at write time, isUuid guard in
      // persistStyleSignal) — display-only fallback, matches prior behavior.
      const remoteSignals: UserStyleSignalDraft[] = remoteSignalsRaw.map((signal) => ({
        ...signal,
        projectId: signal.projectId || projectId,
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

  /** Canvas double-click inline edit commit for either headline or body
   * (docs/TASKS.md §7), and also used directly by the side panel's 본문
   * editor — both are RichTextEditor instances that only report a change on
   * blur now (docs/TASKS.md span 마이그레이션), so one commit handler covers
   * both surfaces. */
  function handleCanvasTextCommit(
    sectionId: string,
    field: "headline" | "body",
    before: RichText,
    after: RichText
  ) {
    // Compares the full RichText structure, not just the plain text — a
    // style-only edit (bold/highlight/fontFamily on an existing word, no
    // characters added or removed) has beforeText === afterText, and used to
    // be treated as a no-op here, silently dropping the just-committed DOM
    // change once the editor swapped back to the static renderRichText
    // display (looked like the style "reverted" on blur).
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    const beforeText = richTextToPlainText(before);
    const afterText = richTextToPlainText(after);
    const target = sections.find((s) => s.id === sectionId);
    pushHistory();
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, [field]: after } : s)));
    if (target && beforeText !== afterText) {
      recordStyleSignal({ kind: "copy_manual_edit", section: target, before: beforeText, after: afterText });
    }
  }

  /** Double-click inline edit commit for the plain-string labels that live
   * outside headline/body — `section.kicker` and the simple string/string[]
   * fields of `section.slots` (badges/items/noticeItems/eyebrow/subHeadline/
   * brandName/caption/emphasis/beforeLabel/afterLabel). Structured slots
   * (steps/faqItems/comparisonRows/optionItems/specRows/guideItems/
   * proofItems/cards) stay read-only — each has a different per-item shape
   * and needs its own add/remove UI, deferred to a future session
   * (docs/TASKS.md, 2026-07-20). `key` is a small path string built by
   * renderEditableLabel in section-canvas.tsx: "kicker", "slot.<scalar>", or
   * "slot.<array>.<index>" — see applyLabelEdit below for the parser. */
  function handleCanvasLabelCommit(sectionId: string, key: string, before: string, after: string) {
    if (before === after) return;
    const target = sections.find((s) => s.id === sectionId);
    pushHistory();
    setSections((prev) => prev.map((s) => (s.id === sectionId ? applyLabelEdit(s, key, after) : s)));
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
      prev.map((s) => (s.id === selectedId ? { ...s, body: [{ text: newBody }] } : s))
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
    const previousHeadlineText = richTextToPlainText(target.headline);
    setSections((prev) =>
      prev.map((s) =>
        s.id === selectedId
          ? {
              ...s,
              headline: [{ text: candidate }],
              alternatives: s.alternatives.map((alt, i) => (i === index ? previousHeadlineText : alt)),
            }
          : s
      )
    );
    flash(selectedId);
    recordStyleSignal({
      kind: "headline_choice",
      section: target,
      before: previousHeadlineText,
      after: candidate,
    });
  }

  /** Per-section layout preset override (image position/fit/height, section
   * spacing, text scale) — docs/TASKS.md 섹션 레이아웃 프리셋. */
  function updateSelectedLayout(patch: SectionLayoutPreset) {
    pushHistory();
    setSections((prev) => prev.map((s) => (s.id === selectedId ? { ...s, ...patch } : s)));
  }

  /** Bulk-applies a saved style set's layout defaults to every section in
   * the current draft. Per-section overrides made afterward in the side
   * panel still win until the next apply. */
  function applyStyleSetToDraft() {
    const styleSet = styleSets.find((ss) => ss.id === styleSetToApply);
    if (!styleSet) return;
    pushHistory();
    setSections((prev) => applyLayoutPresetToSections(prev, styleSet));
    // Style-set-hidden kinds are unioned into the existing hide set rather
    // than replacing it — re-applying a style set should never un-hide a
    // section the user hid manually for their own reasons.
    const styleHiddenIds = resolveHiddenSectionIds(sections, styleSet.sectionVisibility);
    if (styleHiddenIds.length > 0) {
      setHiddenIds((prev) => new Set([...prev, ...styleHiddenIds]));
    }
    toast("스타일 세트를 적용했습니다", { description: styleSet.name });
  }

  /** Uploads to Supabase Storage + the project_image_assets pool
   * (docs/TASKS.md 우선순위 1). Returns null (not a thrown error) when the
   * project isn't persisted yet (no UUID — local-only draft) or the user
   * isn't logged in, so callers can gracefully fall back to the old
   * base64-in-memory behavior instead of hard-failing local editing. */
  async function uploadToProjectPool(
    source: File | { dataUrl: string; name: string }
  ): Promise<ProjectImageAsset | null> {
    if (!isUuid(projectId)) return null;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    try {
      const asset = await uploadProjectImage(
        supabase,
        user.id,
        projectId,
        source,
        SECTION_KIND_SLOT_CATEGORY[selectedSection.kind]
      );
      setProjectImageAssets((prev) => [asset, ...prev]);
      return asset;
    } catch (error) {
      toast("이미지 업로드 실패", { description: getErrorMessage(error) });
      return null;
    }
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

  async function uploadSectionImage(file: File) {
    const poolAsset = await uploadToProjectPool(file);
    if (poolAsset) {
      applySectionImage({
        id: poolAsset.id,
        label: file.name,
        description: "섹션에 직접 업로드한 이미지",
        source: "uploaded",
        dataUrl: poolAsset.publicUrl,
        promptHint: "Use this uploaded image for the selected detail-page section.",
        tags: ["uploaded", selectedSection.kind, selectedSection.imageRole],
      });
      return;
    }
    // Storage 업로드 대상이 없는(로컬 전용, 비로그인) 프로젝트 — 예전처럼
    // base64로 즉시 반영. uploadToProjectPool이 실제 실패(로그인은 됐는데
    // 업로드 자체가 실패)한 경우는 이미 토스트로 안내했으므로 여기서 조용히
    // base64 폴백으로 넘어가도 사용자가 원인 모른 채 방치되지 않음.
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

      // 서버에서 이미 sharp로 압축된 결과라(agents/image.ts) 재압축 없이 그대로
      // Storage에 업로드 — 로컬 전용 프로젝트면 null이 와서 base64를 그대로 씀.
      const poolAsset = await uploadToProjectPool({ dataUrl: result.dataUrl, name: `ai-generated-${selectedId}.webp` });
      applySectionImage({
        id: poolAsset?.id ?? `ai-generated-${selectedId}-${Date.now()}`,
        label: "AI 생성 이미지",
        description: prompt.slice(0, 60),
        source: "generated",
        dataUrl: poolAsset?.publicUrl ?? result.dataUrl,
        promptHint: prompt,
        tags: ["generated", selectedSection.kind],
      });
    } catch {
      toast("이미지 생성 실패", { description: "네트워크 오류로 요청을 완료하지 못했습니다." });
    } finally {
      setIsGeneratingImage(false);
    }
  }

  /** "이미지 관리" 다이얼로그(image-manager-dialog.tsx)용 핸들러 3개 —
   * uploadToProjectPool과 달리 selectedSection에 묶이지 않고 풀 자체를
   * 대상으로 하므로 slotCategory 없이 업로드한다. */
  async function handlePoolUpload(file: File) {
    setIsUploadingPoolImage(true);
    if (!isUuid(projectId)) {
      toast("로그인 후 저장한 프로젝트에서만 이미지를 업로드할 수 있습니다");
      setIsUploadingPoolImage(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setIsUploadingPoolImage(false);
      return;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast("로그인이 필요합니다");
        return;
      }
      const asset = await uploadProjectImage(supabase, user.id, projectId, file);
      setProjectImageAssets((prev) => [asset, ...prev]);
    } catch (error) {
      toast("이미지 업로드 실패", { description: getErrorMessage(error) });
    } finally {
      setIsUploadingPoolImage(false);
    }
  }

  async function handlePoolDelete(asset: ProjectImageAsset) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const inUse = sections.some(
      (s) => s.imageUrl === asset.publicUrl || s.slots?.beforeImage === asset.publicUrl || s.slots?.afterImage === asset.publicUrl
    );
    if (inUse && !window.confirm("이 사진은 현재 섹션에 배정되어 있습니다. 삭제하면 해당 섹션은 이미지 없는 상태가 됩니다. 삭제할까요?")) {
      return;
    }
    try {
      await deleteProjectImage(supabase, asset);
      setProjectImageAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } catch (error) {
      toast("삭제 실패", { description: getErrorMessage(error) });
    }
  }

  function handleAssignPoolImage(
    target: { sectionId: string; slot: "image" | "beforeImage" | "afterImage" },
    asset: ProjectImageAsset
  ) {
    pushHistory();
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== target.sectionId) return s;
        if (target.slot === "image") {
          return {
            ...s,
            imageUrl: asset.publicUrl,
            imageSource: "uploaded",
            imageLabel: asset.originalFilename ?? s.imageLabel,
          };
        }
        return { ...s, slots: { ...s.slots, [target.slot]: asset.publicUrl } };
      })
    );
    flash(target.sectionId);
    toast("이미지가 배정되었습니다");
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
      // 재기획 시 이 프로젝트의 스타일 세트 레이아웃 선호/브랜드 메모가 유실되던
      // 버그 수정 — 원래 생성 때만 넘어가고 재기획엔 안 넘어갔음(docs/TASKS.md).
      const revisionStyleSet = styleSets.find((ss) => ss.id === styleSetToApply);
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
          preferredLayoutByKind: revisionStyleSet?.preferredLayoutByKind,
          brandNote: revisionStyleSet?.brandNote,
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
      before: richTextToPlainText(selectedSection.body),
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

  // AI 도우미 패널 키보드 접근성 (docs/TASKS.md 우선순위 4): 열리면 닫기 버튼으로
  // 포커스 이동, 닫히면 FAB 버튼으로 복귀, Escape로 닫기. FAB 포커스 복귀는
  // closeAiPanel(클릭 핸들러) 안에서 바로 하면 안 됨 — setState는 비동기라
  // 그 시점엔 AnimatePresence가 아직 FAB를 마운트하기 전이라 ref가 비어 있음.
  // wasAiOpenRef로 "열림→닫힘" 전환만 감지해서, 최초 마운트(둘 다 false) 때는
  // FAB에 원치 않는 포커스가 가지 않도록 함.
  useEffect(() => {
    if (aiOpen) {
      aiCloseButtonRef.current?.focus();
    } else if (wasAiOpenRef.current) {
      aiFabButtonRef.current?.focus();
    }
    wasAiOpenRef.current = aiOpen;

    if (!aiOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      closeAiPanel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aiOpen]);

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

  /**
   * Captures each ZIP slice as its own html-to-image render instead of
   * rendering the whole (potentially 13-section) draft into one giant
   * canvas and re-slicing it afterward. A long draft's uncapped height in
   * export resolution can exceed the browser's ~16384px max canvas
   * dimension (see html-to-image's checkCanvasDimensions /
   * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size)
   * — when that happens html-to-image silently shrinks BOTH dimensions to
   * fit, so the "860px" export actually comes out ~845px wide with zero
   * warning (found via an actual downloaded ZIP, not just code reading —
   * docs/TASKS.md). Each per-slice capture stays at exactly
   * EXPORT_SLICE_HEIGHT (2000px), always safely under the cap, so this
   * can't happen regardless of how long the draft is.
   */
  async function handleExport() {
    if (!canvasWrapRef.current) return;
    setIsExporting(true);
    const offscreenHost = document.createElement("div");
    try {
      await handleSave({ silent: true });
      const { toCanvas } = await import("html-to-image");
      const JSZip = (await import("jszip")).default;
      const exportWidth = PLATFORM_EXPORT_WIDTH[projectSummary.platform];
      const sourceNode = canvasWrapRef.current;
      const sourceWidth = sourceNode.offsetWidth || 360;
      // SectionCanvas renders its own editor-only "상세페이지 캔버스" label bar
      // (data-export-chrome) above the actual sections — excluded from both
      // the height measurement here and the clone below so it never ends up
      // baked into the exported PNG.
      const chromeHeight = sourceNode.querySelector<HTMLElement>('[data-export-chrome="true"]')?.offsetHeight ?? 0;
      const sourceHeight = (sourceNode.scrollHeight || sourceNode.offsetHeight) - chromeHeight;
      const pixelRatio = exportWidth / sourceWidth;
      const previewSliceHeight = EXPORT_SLICE_HEIGHT / pixelRatio;
      const sliceCount = Math.max(1, Math.ceil(sourceHeight / previewSliceHeight));

      // Off-screen clone so slicing never touches the live, interactive
      // canvas — cloneNode(true) copies DOM structure/attributes/inline
      // styles (background-image data URLs included), which is everything
      // toCanvas needs; it doesn't need React event handlers to render a
      // static snapshot. Positioned on-screen (top-left, z-index behind
      // everything) rather than off-screen via a large negative left — an
      // earlier version used `left: -99999px` and toCanvas silently
      // captured a blank white image every time (found by actually opening
      // the exported PNGs, not just from the code). In-viewport with a
      // very negative z-index avoids whatever off-screen-coordinate issue
      // that was while staying invisible behind the real app chrome.
      offscreenHost.style.position = "fixed";
      offscreenHost.style.top = "0";
      offscreenHost.style.left = "0";
      offscreenHost.style.zIndex = "-1";
      offscreenHost.style.width = `${sourceWidth}px`;
      offscreenHost.style.overflow = "hidden";
      const clone = sourceNode.cloneNode(true) as HTMLElement;
      clone.style.position = "relative";
      clone.querySelectorAll('[data-export-chrome="true"]').forEach((el) => el.remove());
      // Whichever section is currently selected in the editor gets an
      // outline (StructuredSectionBlock's sectionFrameClass) — also
      // editor-only chrome, so it must not survive into the export (found
      // baked into a real downloaded ZIP, orange outline around whichever
      // section was selected when "ZIP 다운로드" was clicked).
      const noSelectionOutline = document.createElement("style");
      noSelectionOutline.textContent = "[data-section-id] { outline: none !important; }";
      clone.prepend(noSelectionOutline);
      offscreenHost.appendChild(clone);
      document.body.appendChild(offscreenHost);

      const zip = new JSZip();
      for (let index = 0; index < sliceCount; index += 1) {
        const sourceY = index * previewSliceHeight;
        const sliceHeight = Math.min(previewSliceHeight, sourceHeight - sourceY);
        offscreenHost.style.height = `${sliceHeight}px`;
        clone.style.marginTop = `${-sourceY}px`;
        const sliceCanvas = await toCanvas(offscreenHost, {
          width: sourceWidth,
          height: sliceHeight,
          pixelRatio,
          backgroundColor: "#ffffff",
        });
        const fileName = `${String(index + 1).padStart(2, "0")}.png`;
        zip.file(fileName, await canvasToBlob(sliceCanvas));
      }

      const finalWidth = Math.round(sourceWidth * pixelRatio);
      const finalHeight = Math.round(sourceHeight * pixelRatio);
      zip.file(
        "export-info.json",
        JSON.stringify(
          {
            platform: projectSummary.platform,
            width: finalWidth,
            height: finalHeight,
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
        description: `${finalWidth}px 폭 · ${sliceCount}개 PNG`,
      });
      setExportSuccessKey((key) => key + 1);
    } finally {
      offscreenHost.remove();
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
  // Header diagnostic badge: mock/live, model, generation time
  // (docs/TASKS.md 최우선). Undefined for drafts saved before this field
  // existed, or for the client-only mock fallback path — both render nothing.
  //
  // useState+useEffect, not useMemo: readLocalGeneration() reads
  // window.localStorage directly, which doesn't exist during SSR. A useMemo
  // computed inline during render returns null on the server (no window) but
  // the real value on the client's very first (hydration) render — window
  // already exists there — so the server-rendered HTML and the client's
  // hydration pass disagree on whether the "· Mock 생성 · 0.1초" fragment
  // exists at all. That's a genuine content mismatch, not a false positive:
  // it's exactly what was producing the "Hydration failed"/"script tag"
  // console errors reported while using the editor. Starting at null on both
  // passes (matching what SSR always renders) and only computing the real
  // value in an effect after mount avoids the mismatch — the badge just pops
  // in a frame after load instead of ever disagreeing with the server.
  const [generationDiagnostics, setGenerationDiagnostics] = useState<string | null>(null);
  useEffect(() => {
    const generation = readLocalGeneration();
    if (!generation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage (an external system), not derived from React state
      setGenerationDiagnostics(null);
      return;
    }
    // Reloading a Supabase-persisted project reconstructs this record from
    // draft_versions.source, which tracks the LATEST version's own
    // provenance — it becomes "manual" the moment the user edits and saves
    // (docs/supabase/schema.sql), not "mock"/"ai" forever. That reload path
    // also never carries model/generationTimeMs (only set at generation
    // time, not persisted to the DB) — found by actually saving an edit,
    // reloading in a fresh browser context, and seeing this wrongly claim
    // "AI 생성" for what was really a manually-edited draft. Only claim a
    // specific model when we actually have one; "manual" gets no model
    // claim at all instead of a guess.
    const parts: string[] = [];
    if (generation.source === "mock") {
      parts.push("Mock 생성");
    } else if (generation.model) {
      parts.push(generation.model);
    } else if (generation.source === "ai") {
      parts.push("AI 생성");
    }
    if (typeof generation.generationTimeMs === "number") {
      parts.push(`${(generation.generationTimeMs / 1000).toFixed(1)}초`);
    }
    setGenerationDiagnostics(parts.length > 0 ? parts.join(" · ") : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- readLocalGeneration reads a stable per-project localStorage key, re-derive whenever the draft reloads
  }, [loadedFromStorage, draftLoadSource]);

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
              {generationDiagnostics && (
                <>
                  {" · "}
                  <span title="mock/live 생성 정보 (docs/TASKS.md 최우선)">{generationDiagnostics}</span>
                </>
              )}
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
            onClick={() => setImageManagerOpen(true)}
            disabled={!isUuid(projectId)}
            variant="outline"
            className="h-[34px] gap-1.5 text-[12.5px] font-semibold"
            title={isUuid(projectId) ? undefined : "로그인 후 저장한 프로젝트에서 이용 가능"}
          >
            <ImagePlus className="size-3.5" />
            이미지 관리
          </Button>
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

      <div
        className={cn(
          "grid min-h-0 flex-1",
          leftPanelCollapsed && rightPanelCollapsed && "grid-cols-[40px_minmax(0,1fr)_40px]",
          leftPanelCollapsed && !rightPanelCollapsed && "grid-cols-[40px_minmax(0,1fr)_320px]",
          !leftPanelCollapsed && rightPanelCollapsed && "grid-cols-[230px_minmax(0,1fr)_40px]",
          !leftPanelCollapsed && !rightPanelCollapsed && "grid-cols-[230px_minmax(0,1fr)_320px]"
        )}
      >
        {leftPanelCollapsed ? (
          <div className="flex flex-col items-center border-r border-border bg-card py-3">
            <button
              type="button"
              onClick={() => setLeftPanelCollapsed(false)}
              title="섹션 목록 펼치기"
              aria-label="섹션 목록 펼치기"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          </div>
        ) : (
        <div className="flex flex-col overflow-y-auto border-r border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs font-bold text-muted-foreground">
            <span>섹션 목록</span>
            <button
              type="button"
              onClick={() => setLeftPanelCollapsed(true)}
              title="섹션 목록 접기"
              aria-label="섹션 목록 접기"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <PanelLeftClose className="size-3.5" />
            </button>
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
            {styleSets.length > 0 && (
              <div className="mt-3 rounded-lg border border-border bg-card-soft p-3">
                <div className="mb-2 text-xs font-bold">스타일 세트 적용</div>
                <Select value={styleSetToApply} onValueChange={(v) => v && setStyleSetToApply(v)}>
                  <SelectTrigger className="h-8 w-full bg-transparent text-[12px]">
                    <SelectValue placeholder="스타일 세트 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {styleSets.map((ss) => (
                      <SelectItem key={ss.id} value={ss.id}>
                        {ss.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={applyStyleSetToDraft}
                  disabled={!styleSetToApply}
                  variant="outline"
                  className="mt-2 h-8 w-full text-[12px] font-semibold"
                >
                  전체 섹션에 레이아웃 적용
                </Button>
              </div>
            )}
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
        )}

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
                  onCommitLabel={handleCanvasLabelCommit}
                />
              </div>
            </div>
          </div>
        </div>

        {rightPanelCollapsed ? (
          <div className="flex flex-col items-center border-l border-border bg-card py-3">
            <button
              type="button"
              onClick={() => setRightPanelCollapsed(false)}
              title="편집 패널 펼치기"
              aria-label="편집 패널 펼치기"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <PanelRightOpen className="size-4" />
            </button>
          </div>
        ) : (
        <div className="flex flex-col overflow-y-auto border-l border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs font-bold text-muted-foreground">
            <span>섹션 편집 · {selectedSection.title}</span>
            <button
              type="button"
              onClick={() => setRightPanelCollapsed(true)}
              title="편집 패널 접기"
              aria-label="편집 패널 접기"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <PanelRightClose className="size-3.5" />
            </button>
          </div>
          <div className="p-4">
            <SectionEditPanel
              section={selectedSection}
              hidden={hiddenIds.has(selectedId)}
              onCommitBody={(before, after) => handleCanvasTextCommit(selectedId, "body", before, after)}
              onMoveUp={() => moveSelected(-1)}
              onMoveDown={() => moveSelected(1)}
              onToggleHide={() => toggleHide(selectedId)}
              onRegenerate={regenerateSelected}
              onSelectAlternative={applyHeadlineAlternative}
              onChangeLayout={updateSelectedLayout}
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
        )}
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
                <button
                  ref={aiCloseButtonRef}
                  onClick={closeAiPanel}
                  aria-label="기획자 에이전트 닫기"
                  className="rounded-md p-0.5"
                >
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
              ref={aiFabButtonRef}
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
      <ImageManagerDialog
        open={imageManagerOpen}
        onOpenChange={setImageManagerOpen}
        sections={sections}
        assets={projectImageAssets}
        isUploading={isUploadingPoolImage}
        onUpload={handlePoolUpload}
        onDelete={handlePoolDelete}
        onAssign={handleAssignPoolImage}
        imageSlotPriority={styleSets.find((ss) => ss.id === styleSetToApply)?.imageSlotPriority}
      />
    </div>
  );
}
