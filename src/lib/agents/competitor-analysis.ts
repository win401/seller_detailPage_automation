import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";

import { mockCompetitorPageAnalysis } from "@/lib/mock-ai";
import { CompetitorPageAnalysis, competitorPageAnalysisSchema } from "./schemas";

export type CompetitorPageAnalysisResult = {
  analysis: CompetitorPageAnalysis;
  source: "ai" | "mock";
};

const PROMPT = `
너는 커머스 상세페이지 UX/카피 구조를 분석하는 전문가야.

첨부된 이미지는 다른 셀러의 상세페이지를 세로로 길게 캡처한 것이야. 이 이미지만 근거로
구조적 패턴을 분석해줘.

중요 규칙:
- 이미지에서 실제로 보이는 내용만 근거로 분석한다. 브랜드명, 인증, 가격, 리뷰 수치처럼
  이미지에 명확히 보이지 않는 내용은 추측해서 단정하지 않는다.
- 확실하지 않은 부분은 needsVerification에 분리해서 적는다.
- 색상 팔레트는 실제로 눈에 띄는 대표 색상만 hex 근사값으로 3~6개 적는다.
- sectionBreakdown은 위에서 아래 순서로, 우리 서비스가 쓰는 13개 섹션 종류
  (intro, one_line, problem, solution, benefit_1, benefit_2, benefit_3, detail,
  use_scene, recommended_for, trust, faq, cta) 중 가장 가까운 것을 sectionKind로 매칭하되,
  애매하면 자유 텍스트로 적어도 된다.
- 각 섹션의 visibleCopy에는 그 섹션 안에서 실제로 읽을 수 있는 헤드라인/카피 문구를
  이미지에 적힌 그대로(의역/요약 없이) 적는다. 글자가 흐릿하거나 읽을 수 없으면 억지로
  만들어내지 말고 빈 배열로 둔다. 브랜드명·가격·인증 마크의 글자도 실제로 읽힌다면 그대로
  옮기되, 이미지에 없는 문구를 추가하지 않는다.
- keywordAnalysis.topKeywords에는 페이지 전체에서 반복되거나 강조되는 핵심 키워드/짧은
  표현을 5~10개 뽑는다(예: "저자극", "촉촉함", "무료배송"). 실제로 이미지에서 확인되는
  단어·표현을 근거로만 뽑고, 한 번도 등장하지 않는 표현을 지어내지 않는다.
- keywordAnalysis.summary에는 이 페이지가 어떤 키워드/톤을 중심으로 카피를 구성했는지
  한두 문장으로 요약한다.
- 이 분석은 다른 셀러 상세페이지를 모방/복제하기 위한 것이 아니라, 구조/패턴 학습용이다.
`.trim();

export async function runCompetitorPageAnalysisAgent(
  imageDataUrl: string,
  label?: string
): Promise<CompetitorPageAnalysisResult> {
  const fallback = (): CompetitorPageAnalysisResult => ({
    analysis: mockCompetitorPageAnalysis(label),
    source: "mock",
  });

  if (!process.env.OPENAI_API_KEY) {
    return fallback();
  }

  const match = /^data:([^;]+);base64,/.exec(imageDataUrl);
  if (!match) {
    return fallback();
  }
  const mediaType = match[1];

  try {
    const modelId = process.env.AI_MODEL ?? "gpt-4.1-mini";
    const { output } = await generateText({
      model: openai(modelId),
      maxRetries: 0,
      maxOutputTokens: 4000,
      temperature: 0.3,
      output: Output.object({ schema: competitorPageAnalysisSchema }),
      prompt: [
        {
          role: "user",
          content: [
            { type: "text", text: label ? `${PROMPT}\n\n참고 라벨: ${label}` : PROMPT },
            { type: "image", image: new URL(imageDataUrl), mediaType },
          ],
        },
      ],
    });

    return { analysis: output, source: "ai" };
  } catch (error) {
    console.error("competitor page analysis agent failed", error);
    return fallback();
  }
}
