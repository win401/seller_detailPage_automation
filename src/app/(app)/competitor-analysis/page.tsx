"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { optimizeImageFile } from "@/lib/image-optimize";
import { pdfFileToImageFile } from "@/lib/pdf-to-image";
import type { CompetitorPageAnalysis } from "@/lib/agents/schemas";
import type { UploadedImageDraft } from "@/lib/types";

type HistorySource = "loading" | "supabase" | "signedOut" | "unconfigured" | "error";

type AnalysisHistoryRow = {
  id: string;
  label: string | null;
  analysis: CompetitorPageAnalysis;
  source: "ai" | "mock";
  createdAt: string;
};

const SECTION_KIND_LABELS_FALLBACK: Record<string, string> = {
  intro: "도입부",
  one_line: "한 줄 요약",
  problem: "문제 제기",
  solution: "해결책 제시",
  benefit_1: "핵심 장점 1",
  benefit_2: "핵심 장점 2",
  benefit_3: "핵심 장점 3",
  detail: "상세 정보",
  use_scene: "사용 장면",
  recommended_for: "추천 대상",
  trust: "신뢰 요소",
  faq: "FAQ",
  cta: "구매 유도",
};

function AnalysisResultCard({ analysis, source }: { analysis: CompetitorPageAnalysis; source: "ai" | "mock" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-bold">분석 결과</span>
        <span
          className={
            source === "ai"
              ? "rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent"
              : "rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground"
          }
        >
          {source === "ai" ? "실제 AI 분석" : "mock"}
        </span>
      </div>
      <p className="mb-3 text-[13px] leading-6 text-foreground">{analysis.summary}</p>

      <div className="grid grid-cols-2 gap-3 text-[12.5px]">
        <div>
          <div className="mb-1 font-semibold text-muted-foreground">여백 비율</div>
          <div>{analysis.marginRatio}</div>
        </div>
        <div>
          <div className="mb-1 font-semibold text-muted-foreground">상품/피사체 점유율</div>
          <div>{analysis.subjectOccupancyRatio}</div>
        </div>
        <div>
          <div className="mb-1 font-semibold text-muted-foreground">텍스트 크기/줄간격</div>
          <div>
            {analysis.textDensity.size} · {analysis.textDensity.lineHeight}
          </div>
        </div>
        <div>
          <div className="mb-1 font-semibold text-muted-foreground">텍스트 배치</div>
          <div>{analysis.textDensity.placement}</div>
        </div>
        <div>
          <div className="mb-1 font-semibold text-muted-foreground">카피 문장 길이</div>
          <div>{analysis.copyStyle.avgSentenceLength}</div>
        </div>
        <div>
          <div className="mb-1 font-semibold text-muted-foreground">페인포인트 구조</div>
          <div>{analysis.copyStyle.painPointStructure}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-[12.5px] font-semibold text-muted-foreground">주요 색상 팔레트</div>
        <div className="flex gap-1.5">
          {analysis.colorPalette.map((color, index) => (
            <span
              key={`${color}-${index}`}
              className="size-6 rounded-md border border-border"
              style={{ background: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* keywordAnalysis is optional-chained because analysis is jsonb read
          straight from Supabase with no runtime schema validation — history
          rows saved before this field existed won't have it. */}
      {(analysis.keywordAnalysis?.topKeywords?.length ?? 0) > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-[12.5px] font-semibold text-muted-foreground">키워드 분석</div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.keywordAnalysis.topKeywords.map((keyword, index) => (
              <span
                key={`${keyword}-${index}`}
                className="rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent"
              >
                {keyword}
              </span>
            ))}
          </div>
          {analysis.keywordAnalysis.summary && (
            <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">{analysis.keywordAnalysis.summary}</p>
          )}
        </div>
      )}

      <div className="mt-3">
        <div className="mb-1.5 text-[12.5px] font-semibold text-muted-foreground">섹션 구성</div>
        <ol className="grid gap-1">
          {analysis.sectionBreakdown.map((section) => (
            <li key={section.order} className="text-[12.5px]">
              <span className="mr-1.5 font-semibold text-accent">{section.order}.</span>
              <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-[11px] font-bold">
                {SECTION_KIND_LABELS_FALLBACK[section.sectionKind] ?? section.sectionKind}
              </span>
              {section.description}
              {(section.visibleCopy?.length ?? 0) > 0 && (
                <ul className="mt-1 ml-5 grid gap-0.5">
                  {section.visibleCopy.map((copy, index) => (
                    <li key={index} className="text-[11.5px] text-muted-foreground">
                      &ldquo;{copy}&rdquo;
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {analysis.presenceFlags.hasFaq && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">FAQ 있음</span>}
        {analysis.presenceFlags.hasSpecTable && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">제품 정보표 있음</span>
        )}
        {analysis.presenceFlags.hasComparisonTable && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">비교표 있음</span>
        )}
        {analysis.presenceFlags.hasHookSection && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">후킹 섹션 있음</span>
        )}
      </div>

      {analysis.needsVerification.length > 0 && (
        <div className="mt-3 rounded-lg border border-dashed border-border p-2.5 text-[11.5px] text-muted-foreground">
          <div className="mb-1 font-semibold">확인 필요</div>
          <ul className="list-disc pl-4">
            {analysis.needsVerification.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function CompetitorAnalysisPage() {
  const [image, setImage] = useState<UploadedImageDraft | null>(null);
  const [label, setLabel] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ analysis: CompetitorPageAnalysis; source: "ai" | "mock" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "signedOut" | "error">("idle");

  const [history, setHistory] = useState<AnalysisHistoryRow[]>([]);
  const [historySource, setHistorySource] = useState<HistorySource>("loading");

  async function loadHistory(supabase: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setHistorySource("signedOut");
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("competitor_page_analyses")
      .select("id, label, analysis, source, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (fetchError) {
      setHistorySource("error");
      return;
    }

    setHistory(
      (data ?? []).map((row) => ({
        id: row.id,
        label: row.label,
        analysis: row.analysis as CompetitorPageAnalysis,
        source: (row.source as "ai" | "mock") ?? "mock",
        createdAt: row.created_at,
      }))
    );
    setHistorySource("supabase");
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistorySource("unconfigured");
      return;
    }
    void loadHistory(supabase);
  }, []);

  async function handleImageChange(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    setIsConverting(isPdf);
    try {
      // PDF pages get rendered + stitched into one long image client-side
      // first, then flow through the same resize/compress pipeline as a
      // real screenshot upload — see src/lib/pdf-to-image.ts.
      const rasterFile = isPdf ? await pdfFileToImageFile(file) : file;
      const optimized = await optimizeImageFile(rasterFile);
      setImage(optimized);
    } catch (err) {
      setImage(null);
      setError(err instanceof Error ? err.message : "이미지를 처리하지 못했습니다.");
    } finally {
      setIsConverting(false);
    }
  }

  async function runAnalysis() {
    if (!image || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    setSaveStatus("idle");

    try {
      const response = await fetch("/api/agent-workflow/analyze-competitor-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: image.dataUrl, label: label.trim() || undefined }),
      });
      const body = (await response.json()) as
        | { analysis: CompetitorPageAnalysis; source: "ai" | "mock" }
        | { error: string };

      if (!response.ok || "error" in body) {
        setError("error" in body ? body.error : "분석 요청이 실패했습니다.");
        return;
      }

      setResult(body);
      await saveAnalysis(body);
    } catch {
      setError("네트워크 오류로 분석 요청을 완료하지 못했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function saveAnalysis(payload: { analysis: CompetitorPageAnalysis; source: "ai" | "mock" }) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !image) {
      setSaveStatus("signedOut");
      return;
    }

    setSaveStatus("saving");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaveStatus("signedOut");
      return;
    }

    const { error: insertError } = await supabase.from("competitor_page_analyses").insert({
      user_id: user.id,
      label: label.trim() || null,
      image_data_url: image.dataUrl,
      analysis: payload.analysis,
      source: payload.source,
    });

    if (insertError) {
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saved");
    void loadHistory(supabase);
  }

  const saveStatusLabel: Record<typeof saveStatus, string> = {
    idle: "",
    saving: "저장 중...",
    saved: "DB에 저장됨",
    signedOut: "로그인하면 분석 결과가 저장됩니다",
    error: "저장 실패 (분석 결과는 화면에 남아있습니다)",
  };

  return (
    <div className="mx-auto w-full max-w-[900px] flex-1 px-6 py-8 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">경쟁 분석</h1>
        <p className="text-[13.5px] text-muted-foreground">
          다른 셀러의 상세페이지를 세로로 길게 캡처한 이미지 1장을 올리면, 여백·색상·섹션 구성·카피
          스타일을 구조적으로 분석해 저장합니다. 실제 크롤링은 하지 않습니다.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-border bg-card p-4.5">
        <div className="mb-3 grid gap-1.5">
          <Label>라벨 (선택)</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="예: 쿠팡 A사 텀블러 상세페이지"
          />
        </div>

        <div className="mb-3 grid gap-1.5">
          <Label>상세페이지 캡처 이미지 또는 PDF</Label>
          <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-card-soft text-muted-foreground">
            {isConverting ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            <span className="text-[12.5px] font-semibold">
              {isConverting ? "PDF를 이미지로 변환 중..." : image ? image.name : "이미지 또는 PDF를 선택하세요"}
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={isConverting}
              onChange={(e) => void handleImageChange(e.target.files?.[0])}
            />
          </label>
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.dataUrl}
              alt="업로드한 경쟁 상세페이지 미리보기"
              className="max-h-[420px] w-full rounded-lg border border-border object-contain object-top"
            />
          )}
        </div>

        <Button
          disabled={!image || isAnalyzing}
          onClick={() => void runAnalysis()}
          className="h-[38px] gap-1.5 px-4 text-[13.5px] font-bold"
        >
          {isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {isAnalyzing ? "분석 중..." : "분석 시작"}
        </Button>

        {error && <p className="mt-2 text-[12.5px] text-destructive">{error}</p>}
        {saveStatus !== "idle" && (
          <p className="mt-2 text-[12px] text-muted-foreground">{saveStatusLabel[saveStatus]}</p>
        )}
      </div>

      {result && <div className="mb-8">{<AnalysisResultCard analysis={result.analysis} source={result.source} />}</div>}

      <div>
        <h2 className="mb-3 text-[15px] font-bold">분석 이력</h2>
        {historySource === "loading" && (
          <p className="text-[12.5px] text-muted-foreground">불러오는 중입니다.</p>
        )}
        {historySource === "signedOut" && (
          <p className="text-[12.5px] text-muted-foreground">로그인 후 저장된 분석 이력을 확인할 수 있습니다.</p>
        )}
        {historySource === "unconfigured" && (
          <p className="text-[12.5px] text-muted-foreground">Supabase 연결 후 분석 이력을 확인할 수 있습니다.</p>
        )}
        {historySource === "error" && (
          <p className="text-[12.5px] text-muted-foreground">분석 이력을 불러오지 못했습니다.</p>
        )}
        {historySource === "supabase" && history.length === 0 && (
          <p className="text-[12.5px] text-muted-foreground">아직 저장된 분석 이력이 없습니다.</p>
        )}
        <div className="grid gap-3">
          {history.map((row) => (
            <details key={row.id} className="rounded-xl border border-border bg-card p-4.5">
              <summary className="cursor-pointer text-[13px] font-bold">
                {row.label || "라벨 없음"}{" "}
                <span className="ml-2 text-[11.5px] font-normal text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </span>
              </summary>
              <div className="mt-3">
                <AnalysisResultCard analysis={row.analysis} source={row.source} />
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
