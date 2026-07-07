"use client";

import { useRef, useState } from "react";
import {
  Download,
  ImagePlus,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Platform = "smartstore" | "coupang";
type Tone = "practical" | "trust" | "premium" | "warm";

type ProductInput = {
  name: string;
  price: string;
  category: string;
  features: string;
  audience: string;
  platform: Platform;
  tone: Tone;
  imageDescription: string;
};

type DetailPageDraft = {
  headline: string;
  subcopy: string;
  benefits: string[];
  sections: { title: string; body: string }[];
  recommendedFor: string[];
  faq: { question: string; answer: string }[];
  cta: string;
};

const initialProduct: ProductInput = {
  name: "온도 유지 프리미엄 텀블러",
  price: "29,900원",
  category: "생활/주방용품",
  features:
    "오래 가는 보온/보냉, 손에 잡기 쉬운 슬림 디자인, 차량 컵홀더 호환, 분리 세척 가능한 뚜껑",
  audience: "출근길 커피를 자주 마시는 직장인, 텀블러를 매일 들고 다니는 대학생",
  platform: "smartstore",
  tone: "practical",
  imageDescription: "무광 스테인리스 텀블러, 책상 위 커피와 함께 촬영된 라이프스타일 사진",
};

const initialDraft: DetailPageDraft = {
  headline: "아침 커피의 온도를 오래 지키는 데일리 텀블러",
  subcopy: "가방과 차량 컵홀더에 자연스럽게 들어가는 슬림한 텀블러로 하루의 음료 루틴을 편하게 챙기세요.",
  benefits: ["오래 지속되는 보온/보냉", "휴대하기 쉬운 슬림 바디", "분리 세척 가능한 실용 구조"],
  sections: [
    {
      title: "출근길부터 오후까지 편안하게",
      body: "따뜻한 커피와 시원한 음료를 원하는 시간에 즐길 수 있도록 일상 사용성에 집중했습니다.",
    },
    {
      title: "매일 들고 다니기 좋은 형태",
      body: "손에 안정적으로 잡히는 사이즈와 차량 컵홀더 호환 구조로 이동 중에도 부담이 적습니다.",
    },
    {
      title: "세척까지 생각한 디테일",
      body: "뚜껑을 분리해 씻을 수 있어 반복 사용에도 깔끔하게 관리하기 쉽습니다.",
    },
  ],
  recommendedFor: ["출근길 커피를 챙기는 직장인", "학교와 도서관에서 오래 머무는 학생", "일회용 컵 사용을 줄이고 싶은 분"],
  faq: [
    {
      question: "차량 컵홀더에 들어가나요?",
      answer: "대부분의 일반 컵홀더에 들어가는 슬림형 기준으로 설계된 상품 콘셉트입니다.",
    },
    {
      question: "뚜껑 세척이 쉬운가요?",
      answer: "분리 세척 가능한 구조를 강조해 상세페이지에서 관리 편의성을 안내할 수 있습니다.",
    },
    {
      question: "선물용으로도 괜찮나요?",
      answer: "실용적인 데일리 아이템이라 직장인, 학생, 홈카페 사용자에게 선물하기 좋습니다.",
    },
  ],
  cta: "매일 마시는 음료를 더 오래, 더 편하게 즐겨보세요.",
};

const platformLabels: Record<Platform, string> = {
  smartstore: "스마트스토어",
  coupang: "쿠팡",
};

const toneLabels: Record<Tone, string> = {
  practical: "실용적",
  trust: "신뢰감",
  premium: "프리미엄",
  warm: "감성적",
};

export default function Home() {
  const [product, setProduct] = useState<ProductInput>(initialProduct);
  const [draft, setDraft] = useState<DetailPageDraft>(initialDraft);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  function updateProduct<Key extends keyof ProductInput>(
    key: Key,
    value: ProductInput[Key]
  ) {
    setProduct((current) => ({ ...current, [key]: value }));
  }

  function updateSection(index: number, field: "title" | "body", value: string) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [field]: value } : section
      ),
    }));
  }

  function updateFaq(index: number, field: "question" | "answer", value: string) {
    setDraft((current) => ({
      ...current,
      faq: current.faq.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  async function generateDraft() {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-detail-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      if (!response.ok) {
        throw new Error("Failed to generate draft");
      }

      const data = (await response.json()) as DetailPageDraft;
      setDraft(data);
    } finally {
      setIsGenerating(false);
    }
  }

  async function downloadPreview() {
    if (!previewRef.current) {
      return;
    }

    setIsDownloading(true);

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `${product.name || "detail-page"}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsDownloading(false);
    }
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImagePreview(URL.createObjectURL(file));
    updateProduct("imageDescription", `${file.name} 업로드 이미지`);
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#1f2520]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-[#d8d4c8] pb-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit bg-[#245c4f] text-white hover:bg-[#245c4f]">
              셀러페이지 AI
            </Badge>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-[#17201c] sm:text-3xl">
                상품 정보만 넣고 상세페이지 초안을 만드세요
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#58635d]">
                1차 MVP는 입력, 이미지 업로드, AI 문구 생성, 수정 가능한 미리보기,
                PNG 다운로드 흐름에 집중합니다.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={generateDraft}
              disabled={isGenerating}
              className="bg-[#245c4f] text-white hover:bg-[#1d493f]"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 />}
              문구 생성
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={downloadPreview}
              disabled={isDownloading}
              className="border-[#b9b3a5] bg-white"
            >
              {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
              PNG 저장
            </Button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="rounded-lg border-[#d8d4c8] bg-white shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-[#cc5f33]" />
                상품 입력
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">상품명</Label>
                <Input
                  id="name"
                  value={product.name}
                  onChange={(event) => updateProduct("name", event.target.value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="price">가격</Label>
                  <Input
                    id="price"
                    value={product.price}
                    onChange={(event) => updateProduct("price", event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">카테고리</Label>
                  <Input
                    id="category"
                    value={product.category}
                    onChange={(event) =>
                      updateProduct("category", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>플랫폼</Label>
                  <Select
                    value={product.platform}
                    onValueChange={(value) =>
                      updateProduct("platform", value as Platform)
                    }
                  >
                    <SelectTrigger className="h-9 w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smartstore">스마트스토어</SelectItem>
                      <SelectItem value="coupang">쿠팡</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>톤</Label>
                  <Select
                    value={product.tone}
                    onValueChange={(value) => updateProduct("tone", value as Tone)}
                  >
                    <SelectTrigger className="h-9 w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="practical">실용적</SelectItem>
                      <SelectItem value="trust">신뢰감</SelectItem>
                      <SelectItem value="premium">프리미엄</SelectItem>
                      <SelectItem value="warm">감성적</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="features">핵심 특징</Label>
                <Textarea
                  id="features"
                  rows={4}
                  value={product.features}
                  onChange={(event) =>
                    updateProduct("features", event.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="audience">타깃 고객</Label>
                <Textarea
                  id="audience"
                  rows={3}
                  value={product.audience}
                  onChange={(event) =>
                    updateProduct("audience", event.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="image">상품 이미지</Label>
                <label
                  htmlFor="image"
                  className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#b9b3a5] bg-[#fbfaf7] px-4 py-5 text-center text-sm text-[#58635d]"
                >
                  <ImagePlus className="size-5 text-[#cc5f33]" />
                  {imagePreview ? "이미지가 업로드되었습니다" : "클릭해서 상품 사진 업로드"}
                </label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section
              ref={previewRef}
              className="overflow-hidden rounded-lg border border-[#d8d4c8] bg-white"
            >
              <div className="bg-[#17201c] px-5 py-4 text-white">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span>{platformLabels[product.platform]}</span>
                  <span className="h-1 w-1 rounded-full bg-white/60" />
                  <span>{toneLabels[product.tone]}</span>
                  <span className="h-1 w-1 rounded-full bg-white/60" />
                  <span>{product.category}</span>
                </div>
                <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-normal">
                  {draft.headline}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
                  {draft.subcopy}
                </p>
              </div>

              <div className="aspect-[4/3] bg-[#ece7dc]">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="업로드된 상품 이미지"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <ImagePlus className="size-8 text-[#927d61]" />
                    <p className="max-w-xs text-sm leading-6 text-[#665d50]">
                      상품 사진을 업로드하면 이 영역에 메인 비주얼이 표시됩니다.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-8 px-5 py-7">
                <div>
                  <p className="text-xs font-semibold uppercase text-[#cc5f33]">
                    핵심 장점
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {draft.benefits.map((benefit, index) => (
                      <div
                        key={benefit}
                        className="rounded-lg border border-[#ded8cb] bg-[#fbfaf7] p-4"
                      >
                        <span className="font-mono text-xs text-[#cc5f33]">
                          0{index + 1}
                        </span>
                        <p className="mt-2 text-sm font-medium leading-6">
                          {benefit}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {draft.sections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    <h3 className="text-xl font-semibold tracking-normal">
                      {section.title}
                    </h3>
                    <p className="text-sm leading-7 text-[#58635d]">{section.body}</p>
                  </div>
                ))}

                <div className="rounded-lg bg-[#f1eee6] p-5">
                  <h3 className="text-lg font-semibold">이런 분께 추천해요</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#58635d]">
                    {draft.recommendedFor.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">자주 묻는 질문</h3>
                  {draft.faq.map((item) => (
                    <div key={item.question} className="border-t border-[#ded8cb] pt-3">
                      <p className="text-sm font-semibold">Q. {item.question}</p>
                      <p className="mt-1 text-sm leading-6 text-[#58635d]">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-[#245c4f] p-5 text-white">
                  <p className="text-xl font-semibold tracking-normal">{draft.cta}</p>
                  <p className="mt-2 text-sm text-white/75">{product.price}</p>
                </div>
              </div>
            </section>

            <Card className="h-fit rounded-lg border-[#d8d4c8] bg-white shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">미리보기 문구 수정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="headline">메인 타이틀</Label>
                  <Textarea
                    id="headline"
                    rows={2}
                    value={draft.headline}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        headline: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subcopy">서브 카피</Label>
                  <Textarea
                    id="subcopy"
                    rows={3}
                    value={draft.subcopy}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        subcopy: event.target.value,
                      }))
                    }
                  />
                </div>
                <Separator />
                {draft.sections.map((section, index) => (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={`section-${index}`}>섹션 {index + 1}</Label>
                    <Input
                      id={`section-${index}`}
                      value={section.title}
                      onChange={(event) =>
                        updateSection(index, "title", event.target.value)
                      }
                    />
                    <Textarea
                      rows={3}
                      value={section.body}
                      onChange={(event) =>
                        updateSection(index, "body", event.target.value)
                      }
                    />
                  </div>
                ))}
                <Separator />
                {draft.faq.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={`faq-${index}`}>FAQ {index + 1}</Label>
                    <Input
                      id={`faq-${index}`}
                      value={item.question}
                      onChange={(event) =>
                        updateFaq(index, "question", event.target.value)
                      }
                    />
                    <Textarea
                      rows={2}
                      value={item.answer}
                      onChange={(event) =>
                        updateFaq(index, "answer", event.target.value)
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
