"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { optimizeImageFile } from "@/lib/image-optimize";
import { pdfFileToImageFile } from "@/lib/pdf-to-image";
import { stitchImageFiles } from "@/lib/stitch-images";
import { listReferenceAssets, uploadReferenceAsset, type CompetitorReferenceAsset } from "@/lib/supabase/reference-assets";
import type { CompetitorPageAnalysis } from "@/lib/agents/schemas";
import { AnalysisResultCard } from "@/app/(app)/competitor-analysis/page";

type AdminGateStatus = "checking" | "allowed" | "denied" | "signedOut";

type HistoryRow = {
  id: string;
  label: string | null;
  productName: string | null;
  analysis: CompetitorPageAnalysis | null;
  analysisStatus: string;
  source: "ai" | "mock";
  createdAt: string;
};

/**
 * Admin-only expansion of the reduced /competitor-analysis MVP (우선순위 5
 * Phase 1, docs/TASKS.md): multiple ordered page captures stored in
 * Storage (competitor_reference_assets) instead of one base64 blob, and a
 * tracked analysis run (competitor_analysis_runs) instead of only the flat
 * `analysis` jsonb. Coordinates/OCR-confidence/overlays/EDA aggregation are
 * explicitly Phase 2+ — this batch only lays the auth + storage foundation.
 */
export default function AdminReferenceAnalysisPage() {
  const [gate, setGate] = useState<AdminGateStatus>("checking");

  const [label, setLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ analysis: CompetitorPageAnalysis; source: "ai" | "mock" } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyAssets, setHistoryAssets] = useState<Record<string, CompetitorReferenceAsset[]>>({});

  async function loadHistory() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data, error: fetchError } = await supabase
      .from("competitor_page_analyses")
      .select("id, label, product_name, analysis, analysis_status, source, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (fetchError || !data) return;

    const rows: HistoryRow[] = data.map((row) => ({
      id: row.id,
      label: row.label,
      productName: row.product_name,
      analysis: (row.analysis as CompetitorPageAnalysis) ?? null,
      analysisStatus: row.analysis_status,
      source: (row.source as "ai" | "mock") ?? "mock",
      createdAt: row.created_at,
    }));
    setHistory(rows);

    const assetEntries = await Promise.all(
      rows.map(async (row) => [row.id, await listReferenceAssets(supabase, row.id).catch(() => [])] as const)
    );
    setHistoryAssets(Object.fromEntries(assetEntries));
  }

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const supabase = client;
    let cancelled = false;

    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setGate("signedOut");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (cancelled) return;
      if (profile?.role === "admin") {
        setGate("allowed");
        void loadHistory();
      } else {
        setGate("denied");
      }
    }

    void checkAdmin();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFilesChange(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setError(null);
    setResult(null);

    const pdfFiles = files.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    if (pdfFiles.length > 0 && files.length > 1) {
      setError("PDF는 한 번에 1개만 올릴 수 있습니다. 나눠진 캡처는 이미지(PNG/JPG) 여러 장으로 올려주세요.");
      return;
    }

    setIsConverting(true);
    try {
      let previewSource: File;
      if (pdfFiles.length === 1) {
        previewSource = await pdfFileToImageFile(pdfFiles[0]);
      } else if (files.length === 1) {
        previewSource = files[0];
      } else {
        previewSource = await stitchImageFiles(files);
      }
      const optimized = await optimizeImageFile(previewSource);
      setPreviewDataUrl(optimized.dataUrl);
      // PDF pages aren't stored as individual assets (already flattened into
      // one rendered image) — only the raw uploaded image files are, in
      // upload order, matching "position" 1:1 with what the admin actually
      // selected.
      setRawFiles(pdfFiles.length === 1 ? [] : files);
    } catch (err) {
      setPreviewDataUrl(null);
      setRawFiles([]);
      setError(err instanceof Error ? err.message : "이미지를 처리하지 못했습니다.");
    } finally {
      setIsConverting(false);
    }
  }

  async function runAnalysis() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !previewDataUrl || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!user || !session) {
        setError("로그인이 만료됐습니다. 다시 로그인해주세요.");
        return;
      }

      const { data: refRow, error: refError } = await supabase
        .from("competitor_page_analyses")
        .insert({
          user_id: user.id,
          label: label.trim() || null,
          source_url: sourceUrl.trim() || null,
          product_name: productName.trim() || null,
          category: category.trim() || null,
          analysis_status: "running",
        })
        .select("id")
        .single();
      if (refError || !refRow) {
        setError("레퍼런스 생성에 실패했습니다.");
        return;
      }
      const referenceId = refRow.id as string;

      // Individual pages upload independently; one failed page shouldn't
      // block analysis of the rest (same tolerance as generateSectionImages'
      // per-item fallback, src/lib/agents/section-images.ts).
      await Promise.all(
        rawFiles.map((file, position) =>
          uploadReferenceAsset(supabase, user.id, referenceId, file, position).catch((err) => {
            console.warn("Reference asset upload failed:", err);
          })
        )
      );

      const response = await fetch("/api/agent-workflow/analyze-competitor-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ imageDataUrl: previewDataUrl, label: label.trim() || undefined, referenceId }),
      });
      const body = (await response.json()) as
        | { analysis: CompetitorPageAnalysis; source: "ai" | "mock" }
        | { error: string };

      if (!response.ok || "error" in body) {
        setError("error" in body ? body.error : "분석 요청이 실패했습니다.");
        return;
      }

      setResult(body);
      void loadHistory();
    } catch {
      setError("네트워크 오류로 분석 요청을 완료하지 못했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (gate === "checking") {
    return <div className="mx-auto w-full max-w-[900px] flex-1 px-6 py-8 text-[13px] text-muted-foreground">확인 중...</div>;
  }
  if (gate === "signedOut" || gate === "denied") {
    return (
      <div className="mx-auto w-full max-w-[900px] flex-1 px-6 py-8">
        <p className="text-[13.5px] text-muted-foreground">
          {gate === "signedOut" ? "로그인이 필요합니다." : "관리자만 접근할 수 있는 화면입니다."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[900px] flex-1 px-6 py-8 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">레퍼런스 분석 (관리자)</h1>
        <p className="text-[13.5px] text-muted-foreground">
          여러 장의 캡처 이미지를 순서대로 업로드하면 각 페이지를 개별 저장하고, 이어붙인 이미지로
          구조/카피 분석을 실행합니다. 실제 크롤링은 하지 않습니다.
        </p>
      </div>

      <div className="mb-5 grid gap-3 rounded-xl border border-border bg-card p-4.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>라벨 (선택)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 쿠팡 A사 텀블러" />
          </div>
          <div className="grid gap-1.5">
            <Label>원본 URL (선택)</Label>
            <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid gap-1.5">
            <Label>상품명 (선택)</Label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>카테고리 (선택)</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>상세페이지 캡처 이미지(여러 장) 또는 PDF 1개</Label>
          <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-card-soft text-muted-foreground">
            {isConverting ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            <span className="text-[12.5px] font-semibold">
              {isConverting
                ? "이미지로 변환 중..."
                : rawFiles.length > 0
                  ? `이미지 ${rawFiles.length}장 선택됨`
                  : previewDataUrl
                    ? "PDF 1개 선택됨"
                    : "이미지 또는 PDF를 선택하세요"}
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              disabled={isConverting}
              onChange={(e) => void handleFilesChange(e.target.files)}
            />
          </label>
          {previewDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewDataUrl}
              alt="업로드한 경쟁 상세페이지 미리보기"
              className="max-h-[420px] w-full rounded-lg border border-border object-contain object-top"
            />
          )}
        </div>

        <Button
          disabled={!previewDataUrl || isAnalyzing}
          onClick={() => void runAnalysis()}
          className="h-[38px] w-fit gap-1.5 px-4 text-[13.5px] font-bold"
        >
          {isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {isAnalyzing ? "분석 중..." : "분석 시작"}
        </Button>

        {error && <p className="text-[12.5px] text-destructive">{error}</p>}
      </div>

      {result && <div className="mb-8">{<AnalysisResultCard analysis={result.analysis} source={result.source} />}</div>}

      <div>
        <h2 className="mb-3 text-[15px] font-bold">분석 이력 (전체 관리자 공유)</h2>
        {history.length === 0 && <p className="text-[12.5px] text-muted-foreground">아직 저장된 분석 이력이 없습니다.</p>}
        <div className="grid gap-3">
          {history.map((row) => (
            <details key={row.id} className="rounded-xl border border-border bg-card p-4.5">
              <summary className="cursor-pointer text-[13px] font-bold">
                {row.label || row.productName || "라벨 없음"}{" "}
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">
                  {row.analysisStatus}
                </span>
                <span className="ml-2 text-[11.5px] font-normal text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </span>
              </summary>
              <div className="mt-3">
                {(historyAssets[row.id]?.length ?? 0) > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {historyAssets[row.id].map((asset) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={asset.id}
                        src={asset.publicUrl}
                        alt={`페이지 ${asset.position + 1}`}
                        className="h-16 rounded border border-border object-cover"
                      />
                    ))}
                  </div>
                )}
                {row.analysis ? (
                  <AnalysisResultCard analysis={row.analysis} source={row.source} />
                ) : (
                  <p className="text-[12.5px] text-muted-foreground">분석 결과가 아직 없습니다.</p>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
