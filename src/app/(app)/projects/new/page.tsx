"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Sparkles } from "lucide-react";

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
import { mockEmphasisOptions, mockProductInput, mockStyleSets } from "@/lib/mock-data";
import {
  ADDITIONAL_INSTRUCTION_EXAMPLES,
  DesignMood,
  MOOD_LABELS,
  PLATFORM_LABELS,
  Platform,
  TONE_LABELS,
  Tone,
} from "@/lib/types";

const TONE_OPTIONS = Object.keys(TONE_LABELS) as Tone[];
const MOOD_OPTIONS = Object.keys(MOOD_LABELS) as DesignMood[];
const PLATFORM_OPTIONS = Object.keys(PLATFORM_LABELS) as Platform[];

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

export default function CreateProjectPage() {
  const router = useRouter();
  const [emphasis, setEmphasis] = useState<Record<string, boolean>>({
    warmth: true,
    design: true,
  });
  const [tone, setTone] = useState<Tone>("practical");
  const [mood, setMood] = useState<DesignMood>("minimal");
  const [platform, setPlatform] = useState<Platform>("smartstore");
  const [additionalInstruction, setAdditionalInstruction] = useState("");
  const [productImage, setProductImage] = useState<{
    dataUrl: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  function toggleEmphasis(key: string) {
    setEmphasis((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleGenerate() {
    setIsGenerating(true);
    if (productImage) {
      window.localStorage.setItem("detail-page-draft-assets:p1", JSON.stringify({ productImage }));
    }
    // Thin end-to-end flow (docs/TASKS.md §0): no AI API wired yet, mock fallback.
    setTimeout(() => {
      router.push("/projects/p1/editor");
    }, 400);
  }

  function handleProductImageChange(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setProductImage({
        dataUrl: reader.result,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-8 pb-16">
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
                <Input defaultValue={mockProductInput.productName} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="grid gap-1.5">
                  <Label>카테고리</Label>
                  <Input defaultValue={mockProductInput.category} />
                </div>
                <div className="grid gap-1.5">
                  <Label>가격</Label>
                  <Input defaultValue={mockProductInput.price} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>핵심 키워드</Label>
                <div className="flex flex-wrap gap-1.5">
                  {mockProductInput.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>타깃 고객</Label>
                <Textarea rows={2} defaultValue={mockProductInput.targetCustomer} />
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
            <Select defaultValue={mockStyleSets[0]?.id}>
              <SelectTrigger className="h-9 w-full bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mockStyleSets.map((ss) => (
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
        </div>

        <div className="flex flex-col gap-5">
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
                    {(productImage.size / 1024).toFixed(0)}KB · 에디터에서 섹션 이미지로 사용 가능
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus className="size-5.5" />
                  <span className="text-[13px]">도매 원본 상품 사진 업로드</span>
                  <span className="text-[11px] font-semibold text-accent">
                    이번 단계에서는 브라우저 preview로 먼저 연결
                  </span>
                </>
              )}
            </label>
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
              <div className="flex h-[84px] items-center justify-center rounded-lg border border-dashed border-border bg-muted text-[11.5px] text-muted-foreground">
                레퍼런스 이미지
              </div>
            </div>
            <Textarea
              rows={2}
              placeholder="레퍼런스 메모: 따뜻한 우드톤 책상, 자연광, 여백 넉넉하게"
            />
          </section>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="h-[46px] gap-2 rounded-[10px] px-6 text-[14.5px] font-bold"
        >
          <Sparkles className="size-4.5" />
          {isGenerating ? "생성 중..." : "AI로 13섹션 상세페이지 생성"}
        </Button>
      </div>
    </div>
  );
}
