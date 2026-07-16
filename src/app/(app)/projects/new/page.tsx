"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ClipboardList, ImagePlus, LinkIcon, Loader2, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  mockBuildAgentWorkflow,
  mockGenerateDetailPage,
  upgradeLegacyMockSections,
} from "@/lib/mock-ai";
import { mockEmphasisOptions, mockProductInput, mockStyleSets } from "@/lib/mock-data";
import { applyLayoutPresetToSections } from "@/lib/layout-presets";
import { loadStyleSets } from "@/lib/style-sets";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { optimizeImageFile } from "@/lib/image-optimize";
import {
  ADDITIONAL_INSTRUCTION_EXAMPLES,
  AgentWorkflowDraft,
  CompetitorReferenceInput,
  CompetitorReferenceType,
  DesignMood,
  GenerateDetailPageInput,
  GenerateDetailPageOutput,
  MOOD_LABELS,
  PLATFORM_LABELS,
  Platform,
  StyleSet,
  TONE_LABELS,
  Tone,
  UploadedImageDraft,
} from "@/lib/types";

const TONE_OPTIONS = Object.keys(TONE_LABELS) as Tone[];
const MOOD_OPTIONS = Object.keys(MOOD_LABELS) as DesignMood[];
const PLATFORM_OPTIONS = Object.keys(PLATFORM_LABELS) as Platform[];
const GENERATION_STAGES = [
  { label: "상품 정보 분석", description: "입력 정보와 경쟁 참고를 정리하고 있어요" },
  { label: "상세페이지 기획", description: "판매 흐름과 섹션 구성을 설계하고 있어요" },
  { label: "카피와 시안 제작", description: "13개 섹션의 문구와 레이아웃을 만들고 있어요" },
  { label: "검수", description: "과장 표현과 정보 누락을 확인하고 있어요" },
  { label: "프로젝트 저장", description: "편집 가능한 시안으로 마무리하고 있어요" },
] as const;
const REFERENCE_TYPE_LABELS: Record<CompetitorReferenceType, string> = {
  same_product: "동일 상품",
  similar_product: "유사 상품",
  design_reference: "디자인 참고",
  copy_reference: "카피 참고",
  etc: "기타",
};

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
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
        active
          ? "border-primary bg-accent-soft text-primary"
          : "border-border bg-card-soft text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function GenerationProgressOverlay({
  open,
  elapsed,
  productName,
}: {
  open: boolean;
  elapsed: number;
  productName: string;
}) {
  const stageIndex = elapsed < 5 ? 0 : elapsed < 13 ? 1 : elapsed < 27 ? 2 : elapsed < 42 ? 3 : 4;
  const stage = GENERATION_STAGES[stageIndex];
  const progress = Math.max(10, ((stageIndex + 1) / GENERATION_STAGES.length) * 100);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          aria-label="상세페이지 시안 생성 중"
        >
          <motion.div
            className="w-full max-w-[460px] overflow-hidden rounded-lg border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
            initial={{ y: 18, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className="flex items-center gap-4 border-b border-border px-6 py-5">
              <div className="relative flex size-14 shrink-0 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-muted border-t-primary"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.15, repeat: Infinity, ease: "linear" }}
                />
                <Sparkles className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-primary">AI DETAIL PAGE</div>
                <h2 className="mt-1 text-lg font-extrabold">상세페이지 시안을 만들고 있어요</h2>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {productName || "새 상품"} · {elapsed}초 경과
                </p>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="mb-4 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-1.5 rounded-full bg-primary"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </div>

              <div className="mb-5 rounded-md border border-primary/25 bg-accent-soft px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  {stage.label}
                </div>
                <p className="mt-1 pl-6 text-xs leading-5 text-muted-foreground">
                  {stage.description}
                </p>
              </div>

              <div className="grid gap-2.5">
                {GENERATION_STAGES.map((item, index) => {
                  const isComplete = index < stageIndex;
                  const isCurrent = index === stageIndex;
                  return (
                    <div
                      key={item.label}
                      className={cn(
                        "flex h-8 items-center gap-3 text-xs transition-colors duration-300",
                        isCurrent ? "font-bold text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border",
                          isComplete && "border-primary bg-primary text-primary-foreground",
                          isCurrent && "border-primary text-primary",
                          !isComplete && !isCurrent && "border-border"
                        )}
                      >
                        {isComplete ? (
                          <Check className="size-3" />
                        ) : isCurrent ? (
                          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                        ) : (
                          <span className="size-1 rounded-full bg-muted-foreground/35" />
                        )}
                      </span>
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-5 text-center text-[11px] text-muted-foreground">
                완료되면 편집 화면으로 자동 이동합니다.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function CreateProjectPage() {
  const router = useRouter();
  const [productName, setProductName] = useState(mockProductInput.productName);
  const [category, setCategory] = useState(mockProductInput.category);
  const [price, setPrice] = useState(mockProductInput.price ?? "");
  const [keywordText, setKeywordText] = useState(mockProductInput.keywords.join(", "));
  const [targetCustomer, setTargetCustomer] = useState(mockProductInput.targetCustomer);
  const [emphasis, setEmphasis] = useState<Record<string, boolean>>({
    warmth: true,
    design: true,
  });
  const [tone, setTone] = useState<Tone>("practical");
  const [mood, setMood] = useState<DesignMood>("minimal");
  const [platform, setPlatform] = useState<Platform>("smartstore");
  const [styleSets, setStyleSets] = useState<StyleSet[]>(mockStyleSets);
  const [styleSetId, setStyleSetId] = useState(mockStyleSets[0]?.id ?? "");

  useEffect(() => {
    // one-time hydration from localStorage on mount, not a render loop
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStyleSets(loadStyleSets());
  }, []);
  const [additionalInstruction, setAdditionalInstruction] = useState("");
  const [referenceMemo, setReferenceMemo] = useState("");
  const [competitorReferences, setCompetitorReferences] = useState<CompetitorReferenceInput[]>([
    {
      id: "ref-1",
      url: "",
      memo: "",
      referenceType: "same_product",
    },
  ]);
  const [agentWorkflow, setAgentWorkflow] = useState<AgentWorkflowDraft | null>(null);
  const [productImage, setProductImage] = useState<UploadedImageDraft | null>(null);
  const [referenceImage, setReferenceImage] = useState<UploadedImageDraft | null>(null);
  const [imageOptimizationMessage, setImageOptimizationMessage] = useState<string | null>(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = window.setInterval(() => {
      setGenerationElapsed((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  async function persistGeneratedProject({
    input,
    competitorReferences,
    workflow,
    output,
  }: {
    input: GenerateDetailPageInput;
    competitorReferences: CompetitorReferenceInput[];
    workflow: AgentWorkflowDraft;
    output: GenerateDetailPageOutput;
  }) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: project, error: projectError } = await supabase
      .from("detail_page_projects")
      .insert({
        user_id: user.id,
        title: input.productName,
        category: input.category,
        selected_platform: input.platform,
        selected_mood: input.designMood,
        selected_tone: input.tone,
        product_input: input,
      })
      .select("id")
      .single();

    if (projectError || !project?.id) throw projectError ?? new Error("Project create failed");

    const projectId = project.id as string;

    if (competitorReferences.length) {
      const { error } = await supabase.from("competitor_references").insert(
        competitorReferences.map((reference) => ({
          project_id: projectId,
          user_id: user.id,
          url: reference.url.trim() || null,
          memo: reference.memo.trim() || null,
          reference_type: reference.referenceType,
        }))
      );
      if (error) throw error;
    }

    // Orchestrator row must come first: the other rows self-reference it via
    // parent_run_id within this same multi-row insert, so Postgres needs to
    // see the parent row before the children that point at it.
    const agentRunRows = [
      ...(workflow.orchestratorRun ? [workflow.orchestratorRun] : []),
      ...workflow.runs,
    ].map((run) => ({
      id: run.id,
      parent_run_id: run.parentRunId ?? null,
      project_id: projectId,
      user_id: user.id,
      agent_type: run.agentType,
      status: run.status,
      title: run.title,
      summary: run.summary,
      input,
      output: run.output,
      warnings: run.warnings,
      created_at: run.createdAt,
    }));

    const { error: agentRunsError } = await supabase.from("agent_runs").insert(agentRunRows);
    if (agentRunsError) throw agentRunsError;

    const { data: draft, error: draftError } = await supabase
      .from("draft_versions")
      .insert({
        project_id: projectId,
        user_id: user.id,
        version_no: 1,
        source: output.source ?? "ai",
        sections: output.sections,
        hidden_section_ids: [],
        asset_paths: [],
        review_summary: {
          warnings: output.warnings ?? [],
          reviewAgent: workflow.runs.find((run) => run.agentType === "review")?.output ?? {},
        },
      })
      .select("id")
      .single();

    if (draftError || !draft?.id) throw draftError ?? new Error("Draft create failed");

    const { error: updateError } = await supabase
      .from("detail_page_projects")
      .update({ current_draft_version_id: draft.id })
      .eq("id", projectId);

    if (updateError) throw updateError;

    return projectId;
  }

  function saveGeneratedDraftLocally({
    projectId,
    input,
    competitorReferences,
    workflow,
    output,
  }: {
    projectId: string;
    input: GenerateDetailPageInput;
    competitorReferences: CompetitorReferenceInput[];
    workflow: AgentWorkflowDraft;
    output: GenerateDetailPageOutput;
  }) {
    if (productImage || referenceImage) {
      window.localStorage.setItem(
        `detail-page-draft-assets:${projectId}`,
        JSON.stringify({ productImage, referenceImage })
      );
    }
    window.localStorage.setItem(`detail-page-agent-workflow:${projectId}`, JSON.stringify(workflow));
    window.localStorage.setItem(
      `detail-page-project:${projectId}`,
      JSON.stringify({ sections: output.sections, hiddenIds: [] })
    );
    window.localStorage.setItem(
      `detail-page-generation:${projectId}`,
      JSON.stringify({
        input,
        competitorReferences,
        agentWorkflow: workflow,
        source: output.source ?? "ai",
        warnings: output.warnings ?? [],
      })
    );
  }

  function toggleEmphasis(key: string) {
    setEmphasis((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function updateCompetitorReference(
    id: string,
    field: keyof Omit<CompetitorReferenceInput, "id">,
    value: string
  ) {
    setCompetitorReferences((prev) =>
      prev.map((reference) =>
        reference.id === id ? { ...reference, [field]: value } : reference
      )
    );
  }

  function addCompetitorReference() {
    setCompetitorReferences((prev) => [
      ...prev,
      {
        id: `ref-${Date.now()}`,
        url: "",
        memo: "",
        referenceType: "similar_product",
      },
    ]);
  }

  function removeCompetitorReference(id: string) {
    setCompetitorReferences((prev) =>
      prev.length === 1 ? prev : prev.filter((reference) => reference.id !== id)
    );
  }

  async function handleGenerate() {
    setGenerationElapsed(0);
    setIsGenerating(true);
    setGenerationMessage("분석 → 기획 → 제작 → 검수 에이전트가 초안을 준비하는 중입니다...");
    const input: GenerateDetailPageInput = {
      productName,
      category,
      keywords: keywordText
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      targetCustomer,
      emphasisPoints: mockEmphasisOptions
        .filter((option) => emphasis[option.key])
        .map((option) => option.label),
      tone,
      designMood: mood,
      platform,
      imageDescription: referenceMemo || productImage?.name || "",
      productImageDataUrl: productImage?.dataUrl,
      additionalInstruction,
    };
    const normalizedCompetitorReferences = competitorReferences.filter(
      (reference) => reference.url.trim() || reference.memo.trim()
    );
    const optimisticWorkflow = mockBuildAgentWorkflow(input, normalizedCompetitorReferences);
    setAgentWorkflow(optimisticWorkflow);

    // A style set's layout defaults (image position/fit/height, spacing,
    // text scale) are a presentation concern the agents don't need to know
    // about, so they're stamped onto the generated sections here rather
    // than passed into the generation prompt.
    const selectedStyleSet = styleSets.find((ss) => ss.id === styleSetId);
    function withStyleLayout(rawOutput: GenerateDetailPageOutput): GenerateDetailPageOutput {
      // The editor only accepts structured blocks. A live model may return the
      // old flat 13-section shape, so normalize it before either local or DB save.
      const structuredSections = upgradeLegacyMockSections(input, rawOutput.sections);
      return {
        ...rawOutput,
        sections: selectedStyleSet
          ? applyLayoutPresetToSections(structuredSections, selectedStyleSet)
          : structuredSections,
      };
    }

    try {
      const response = await fetch("/api/agent-workflow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, competitorReferences: normalizedCompetitorReferences }),
      });
      if (!response.ok) throw new Error("AI generation request failed");
      const { workflow, output: rawOutput } = (await response.json()) as {
        workflow: AgentWorkflowDraft;
        output: GenerateDetailPageOutput;
      };
      const output = withStyleLayout(rawOutput);
      setAgentWorkflow(workflow);
      let projectId = "p1";
      try {
        projectId =
          (await persistGeneratedProject({
            input,
            competitorReferences: normalizedCompetitorReferences,
            workflow,
            output,
          })) ?? "p1";
      } catch {
        setGenerationMessage("Supabase 저장 실패로 브라우저 임시 저장을 사용합니다.");
      }
      saveGeneratedDraftLocally({
        projectId,
        input,
        competitorReferences: normalizedCompetitorReferences,
        workflow,
        output,
      });
      setGenerationMessage(
        output.source === "mock"
          ? "mock 제작 시안으로 에디터를 준비했습니다."
          : "에이전트 시안 생성 완료"
      );
      router.push(`/projects/${projectId}/editor`);
    } catch {
      const output = withStyleLayout(mockGenerateDetailPage(input));
      let projectId = "p1";
      try {
        projectId =
          (await persistGeneratedProject({
            input,
            competitorReferences: normalizedCompetitorReferences,
            workflow: optimisticWorkflow,
            output,
          })) ?? "p1";
      } catch {
        setGenerationMessage("Supabase 저장 실패로 브라우저 임시 저장을 사용합니다.");
      }
      saveGeneratedDraftLocally({
        projectId,
        input,
        competitorReferences: normalizedCompetitorReferences,
        workflow: optimisticWorkflow,
        output,
      });
      setGenerationMessage("AI 호출 실패로 mock 에이전트 시안을 사용합니다.");
      router.push(`/projects/${projectId}/editor`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleProductImageChange(file: File | undefined) {
    if (!file) return;
    setIsOptimizingImage(true);
    setImageOptimizationMessage("이미지를 최적화하는 중입니다...");
    try {
      const optimized = await optimizeImageFile(file);
      setProductImage(optimized);
      const originalKb = optimized.originalSize
        ? `${(optimized.originalSize / 1024).toFixed(0)}KB`
        : "원본";
      const optimizedKb = `${(optimized.size / 1024).toFixed(0)}KB`;
      setImageOptimizationMessage(
        `이미지를 최적화했습니다. ${originalKb} → ${optimizedKb}, ${optimized.optimizedWidth}px 폭`
      );
    } catch {
      setImageOptimizationMessage("이미지 최적화에 실패했습니다. 다른 이미지를 업로드해주세요.");
    } finally {
      setIsOptimizingImage(false);
    }
  }

  async function handleReferenceImageChange(file: File | undefined) {
    if (!file) return;
    try {
      const optimized = await optimizeImageFile(file);
      setReferenceImage(optimized);
    } catch {
      setImageOptimizationMessage("레퍼런스 이미지 최적화에 실패했습니다. 다른 이미지를 업로드해주세요.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-8 pb-16">
      <GenerationProgressOverlay
        open={isGenerating}
        elapsed={generationElapsed}
        productName={productName}
      />
      <h1 className="text-2xl font-extrabold tracking-tight">새 상세페이지 만들기</h1>
      <p className="text-[13.5px] text-muted-foreground">
        상품 정보와 사진만 넣으면 AI가 13섹션 초안을 만들어드려요
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <section className="rounded-xl border border-border bg-card p-4.5">
            <div className="mb-3 text-[13px] font-bold">기본 정보</div>
            <div className="flex flex-col gap-3">
              <div className="grid gap-1.5">
                <Label>상품명</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="grid gap-1.5">
                  <Label>카테고리</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>가격</Label>
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>핵심 키워드</Label>
                <Input
                  value={keywordText}
                  onChange={(e) => setKeywordText(e.target.value)}
                  placeholder="보온보냉, 슬림디자인, 컵홀더호환"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>타깃 고객</Label>
                <Textarea
                  rows={2}
                  value={targetCustomer}
                  onChange={(e) => setTargetCustomer(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4.5">
            <div className="mb-3 text-[13px] font-bold">강조 포인트</div>
            <div className="flex flex-wrap gap-2">
              {mockEmphasisOptions.map((opt) => (
                <Chip
                  key={opt.key}
                  active={!!emphasis[opt.key]}
                  onClick={() => toggleEmphasis(opt.key)}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4.5">
            <div className="mb-3 text-[13px] font-bold">톤앤매너 &amp; 디자인 무드</div>
            <div className="mb-3 flex flex-wrap gap-2">
              {TONE_OPTIONS.map((t) => (
                <Chip key={t} active={tone === t} onClick={() => setTone(t)}>
                  {TONE_LABELS[t]}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((m) => (
                <Chip key={m} active={mood === m} onClick={() => setMood(m)}>
                  {MOOD_LABELS[m]}
                </Chip>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4.5">
            <div className="mb-3 text-[13px] font-bold">플랫폼 &amp; 스타일 세트</div>
            <div className="mb-3 flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <Chip key={p} active={platform === p} onClick={() => setPlatform(p)}>
                  {PLATFORM_LABELS[p]}
                </Chip>
              ))}
            </div>
            <Select
              value={styleSetId}
              onValueChange={(value) => {
                if (!value) return;
                setStyleSetId(value);
                const selected = styleSets.find((ss) => ss.id === value);
                if (!selected) return;
                setMood(selected.defaultMood);
                setTone(selected.defaultTone);
                setPlatform(selected.defaultPlatform);
              }}
            >
              <SelectTrigger className="h-9 w-full bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {styleSets.map((ss) => (
                  <SelectItem key={ss.id} value={ss.id}>
                    {ss.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section className="rounded-xl border border-border bg-card p-4.5">
            <div className="mb-2 text-[13px] font-bold">추가 제작 요청</div>
            <p className="mb-2 text-xs text-muted-foreground">
              AI에게 추가로 요청할 내용이 있다면 짧게 적어주세요. (선택)
            </p>
            <Textarea
              rows={2}
              placeholder={ADDITIONAL_INSTRUCTION_EXAMPLES[0]}
              value={additionalInstruction}
              onChange={(e) => setAdditionalInstruction(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ADDITIONAL_INSTRUCTION_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setAdditionalInstruction(ex)}
                  className="rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4.5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-bold">경쟁 상세페이지 참고</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  URL은 참고 링크로만 저장하고, 자동 크롤링 없이 메모 기반으로 분석합니다.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                onClick={addCompetitorReference}
              >
                <Plus className="size-3.5" />
                추가
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {competitorReferences.map((reference, index) => (
                <div key={reference.id} className="rounded-lg border border-border bg-card-soft p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                      <LinkIcon className="size-3.5" />
                      참고 {index + 1}
                    </div>
                    {competitorReferences.length > 1 && (
                      <button
                        type="button"
                        className="text-[11.5px] font-semibold text-muted-foreground hover:text-destructive"
                        onClick={() => removeCompetitorReference(reference.id)}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Input
                      value={reference.url}
                      onChange={(e) =>
                        updateCompetitorReference(reference.id, "url", e.target.value)
                      }
                      placeholder="https://smartstore.naver.com/..."
                    />
                    <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
                      <Select
                        value={reference.referenceType}
                        onValueChange={(value) =>
                          updateCompetitorReference(
                            reference.id,
                            "referenceType",
                            value as CompetitorReferenceType
                          )
                        }
                      >
                        <SelectTrigger className="h-9 bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(REFERENCE_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={reference.memo}
                        onChange={(e) =>
                          updateCompetitorReference(reference.id, "memo", e.target.value)
                        }
                        placeholder="예: 첫 화면 구성 참고, FAQ 구성 좋음, 색감은 제외"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-xl border border-border bg-card p-4.5">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-bold">
              <ClipboardList className="size-4 text-primary" />
              에이전트 워크플로우
            </div>
            <div className="grid gap-2">
              {[
                ["분석", "경쟁 URL/메모 기반 참고 포인트 정리"],
                ["기획", "타깃·강조 순서·섹션 전략 설계"],
                ["제작", "13개 섹션 상세페이지 시안 생성"],
                ["검수", "과장 표현·근거 없는 수치·가독성 점검"],
              ].map(([label, description], index) => {
                const run = agentWorkflow?.runs[index];
                return (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card-soft p-3"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold",
                        run
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-bold">{label} 에이전트</div>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {run?.summary ?? description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4.5">
            <div className="mb-3 text-[13px] font-bold">상품 이미지</div>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[10px] border border-dashed border-border bg-card-soft px-4 py-6 text-center text-muted-foreground transition-colors hover:border-primary/70 hover:bg-muted/60">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleProductImageChange(e.target.files?.[0])}
              />
              {productImage ? (
                <>
                  <span
                    className="h-44 w-full rounded-lg bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${productImage.dataUrl})` }}
                    aria-label="업로드한 상품 이미지 미리보기"
                  />
                  <span className="text-[13px] font-semibold text-foreground">
                    {productImage.name}
                  </span>
                  <span className="text-[11px] font-semibold text-accent">
                    {(productImage.size / 1024).toFixed(0)}KB ·{" "}
                    {productImage.optimizedWidth ?? 0}×{productImage.optimizedHeight ?? 0}px ·{" "}
                    에디터에서 섹션 이미지로 사용 가능
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus className="size-5.5" />
                  <span className="text-[13px]">도매 원본 상품 사진 업로드</span>
                  <span className="text-[11px] font-semibold text-accent">
                    {isOptimizingImage
                      ? "최적화 중..."
                      : "1200px 폭 기준 WebP/JPEG 품질 0.85로 최적화"}
                  </span>
                </>
              )}
            </label>
            {imageOptimizationMessage && (
              <div className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-[11.5px] font-semibold text-accent">
                {imageOptimizationMessage}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4.5">
            <div className="mb-2 text-[13px] font-bold">이미지 개선/합성 준비</div>
            <p className="mb-3 text-xs leading-6 text-muted-foreground">
              레퍼런스는 분위기·구도·조명만 참고합니다. 상품의 실제 형태·색상·소재는
              바뀌지 않습니다.
            </p>
            <div className="mb-3 grid grid-cols-2 gap-2.5">
              {productImage ? (
                <div
                  className="h-[84px] rounded-lg border border-border bg-muted bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${productImage.dataUrl})` }}
                  aria-label="원본 상품 이미지"
                />
              ) : (
                <div className="flex h-[84px] items-center justify-center rounded-lg border border-dashed border-border bg-muted text-[11.5px] text-muted-foreground">
                  원본 상품 이미지
                </div>
              )}
              <label className="flex h-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted text-[11.5px] text-muted-foreground transition-colors hover:border-primary/70 hover:bg-muted/60">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handleReferenceImageChange(e.target.files?.[0])}
                />
                {referenceImage ? (
                  <span
                    className="h-full w-full bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${referenceImage.dataUrl})` }}
                    aria-label="업로드한 레퍼런스 이미지 미리보기"
                  />
                ) : (
                  <span>레퍼런스 이미지</span>
                )}
              </label>
            </div>
            <Textarea
              rows={2}
              placeholder="레퍼런스 메모: 따뜻한 우드톤 책상, 자연광, 여백 넉넉하게"
              value={referenceMemo}
              onChange={(e) => setReferenceMemo(e.target.value)}
            />
          </section>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || isOptimizingImage}
          className="h-[46px] gap-2 rounded-[10px] px-6 text-[14.5px] font-bold"
        >
          <Sparkles className="size-4.5" />
          {isGenerating
            ? "에이전트 실행 중..."
            : isOptimizingImage
              ? "이미지 최적화 중..."
              : "에이전트로 상세페이지 시안 생성"}
        </Button>
      </div>
      {generationMessage && (
        <p className="mt-3 text-right text-xs font-semibold text-muted-foreground">
          {generationMessage}
        </p>
      )}
    </div>
  );
}
