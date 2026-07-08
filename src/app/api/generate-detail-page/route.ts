import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import { mockGenerateDetailPage } from "@/lib/mock-ai";
import {
  GenerateDetailPageInput,
  SECTION_KIND_LABELS,
  SECTION_KIND_ORDER,
  SectionKind,
} from "@/lib/types";

export const runtime = "nodejs";

const toneSchema = z.enum(["practical", "trust", "premium", "warm"]);
const moodSchema = z.enum(["minimal", "natural", "premium", "colorful"]);
const platformSchema = z.enum(["coupang", "smartstore", "ably", "zigzag"]);
const sectionKindSchema = z.enum([
  "intro",
  "one_line",
  "problem",
  "solution",
  "benefit_1",
  "benefit_2",
  "benefit_3",
  "detail",
  "use_scene",
  "recommended_for",
  "trust",
  "faq",
  "cta",
]);

const inputSchema = z.object({
  productName: z.string().min(1),
  category: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  targetCustomer: z.string().default(""),
  emphasisPoints: z.array(z.string()).default([]),
  tone: toneSchema,
  designMood: moodSchema,
  platform: platformSchema,
  imageDescription: z.string().optional(),
  additionalInstruction: z.string().optional(),
});

const generatedSectionSchema = z.object({
  kind: sectionKindSchema,
  kicker: z.string(),
  headline: z.string(),
  body: z.string(),
  bullets: z.array(z.string()),
  imageRole: z.string(),
  imagePrompt: z.string(),
  alternatives: z.array(z.string()),
});

const generatedOutputSchema = z.object({
  sections: z.array(generatedSectionSchema).length(13),
  warnings: z.array(z.string()),
});

const sectionPlan = SECTION_KIND_ORDER.map((kind, index) => ({
  id: `s${index + 1}`,
  kind,
  title: SECTION_KIND_LABELS[kind],
}));

function fallback(input: GenerateDetailPageInput, reason?: string) {
  const result = mockGenerateDetailPage(input);
  return Response.json({
    ...result,
    warnings: reason ? [...(result.warnings ?? []), reason] : result.warnings,
  });
}

function buildPrompt(input: GenerateDetailPageInput) {
  return `
너는 쿠팡/네이버 스마트스토어 상세페이지를 많이 작성한 이커머스 카피라이터야.

아래 상품 정보만 근거로 모바일 상세페이지 13개 섹션 초안을 작성해줘.

중요 규칙:
- 상품 정보에 없는 효능, 인증, 수치, 원산지, 수상 이력은 만들지 않는다.
- "완벽", "무조건", "최고"처럼 과장 광고처럼 보이는 표현은 피한다.
- 모바일에서 읽기 쉽게 짧은 문장으로 쓴다.
- 각 섹션의 목적에 맞게 문구를 다르게 작성한다.
- 사용자가 입력한 키워드와 강조 포인트를 우선 반영한다.
- 확실하지 않은 내용은 단정하지 않는다.
- FAQ/Trust 섹션에서도 근거 없는 인증, 보증, 수치를 만들지 않는다.
- imagePrompt는 실제 이미지를 생성하지 않고, 섹션에 필요한 이미지 연출 방향만 작성한다.
- imagePrompt에서도 상품의 실제 형태, 색상, 소재, 구성품을 바꾸지 않는다.

상품 정보:
- 상품명: ${input.productName}
- 카테고리: ${input.category}
- 핵심 키워드: ${input.keywords.join(", ") || "없음"}
- 타깃 고객: ${input.targetCustomer || "없음"}
- 강조 포인트: ${input.emphasisPoints.join(", ") || "없음"}
- 톤앤매너: ${input.tone}
- 디자인 무드: ${input.designMood}
- 플랫폼: ${input.platform}
- 이미지 설명: ${input.imageDescription || "사용자가 업로드한 원본 상품 이미지를 기준으로 함"}
- 추가 제작 요청: ${input.additionalInstruction || "없음"}

반드시 아래 순서와 kind로 13개 섹션을 반환해:
${sectionPlan.map((section) => `- ${section.id}: ${section.kind} (${section.title})`).join("\n")}

각 섹션:
- headline은 한 줄 제목
- body는 1~2문장
- bullets는 필요 없으면 빈 배열
- alternatives는 대체 카피 후보 2개
- imageRole은 섹션에 필요한 이미지 역할
- imagePrompt는 Pinterest 스타일 레퍼런스나 이미지 생성에 넘길 수 있는 안전한 이미지 연출 프롬프트
- warnings는 근거가 부족하거나 사용자가 확인해야 할 사항이 있을 때만 작성하고, 없으면 빈 배열로 반환한다.
`.trim();
}

export async function POST(request: Request) {
  let input: GenerateDetailPageInput;

  try {
    const json = await request.json();
    input = inputSchema.parse(json);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return fallback(input, "OPENAI_API_KEY가 없어 mock 초안을 사용했습니다.");
    }

    const modelId = process.env.AI_MODEL ?? "gpt-5.4-mini";
    const { output } = await generateText({
      model: openai(modelId),
      maxRetries: 0,
      temperature: 0.35,
      output: Output.object({ schema: generatedOutputSchema }),
      prompt: buildPrompt(input),
    });

    const sections = output.sections.map((section, index) => {
      const kind = section.kind as SectionKind;
      return {
        id: `s${index + 1}`,
        kind,
        kicker: section.kicker,
        title: SECTION_KIND_LABELS[kind],
        headline: section.headline,
        body: section.body,
        bullets: section.bullets,
        imageRole: section.imageRole,
        imagePrompt: section.imagePrompt,
        alternatives: section.alternatives,
      };
    });

    return Response.json({
      sections,
      source: "ai",
      warnings: output.warnings,
    });
  } catch (error) {
    console.error("generate-detail-page failed", error);
    return fallback(input, "AI 호출 실패로 mock 초안을 사용했습니다.");
  }
}
