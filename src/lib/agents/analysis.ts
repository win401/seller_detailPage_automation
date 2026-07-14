import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";

import { mockAnalysisAgent } from "@/lib/mock-ai";
import { CompetitorReferenceInput, GenerateDetailPageInput } from "@/lib/types";
import { AgentRunResult, analysisOutputSchema } from "./schemas";
import { getMockReason, isLiveAiEnabled } from "./runtime-config";

function buildPrompt(input: GenerateDetailPageInput, competitorReferences: CompetitorReferenceInput[]) {
  const referenceLines = competitorReferences.length
    ? competitorReferences
        .map((reference, index) => `${index + 1}. url: ${reference.url || "(없음)"} / 메모: ${reference.memo || "(없음)"}`)
        .join("\n")
    : "(경쟁 상세페이지 URL/메모 없음)";

  return `
너는 커머스 상세페이지 전략 분석가야.

사용자가 입력한 상품 정보, 경쟁 상세페이지 URL, 참고 메모를 바탕으로 상세페이지 기획에 필요한 경쟁 분석 초안을 작성해줘.

중요 규칙:
- 외부 사이트를 실제로 열람하거나 크롤링했다고 말하지 않는다.
- URL은 참고 출처 식별용으로만 다룬다.
- 사용자가 메모로 제공하지 않은 경쟁 상세페이지의 구체적인 문구, 이미지, 리뷰, 수치, 가격, 인증은 만들지 않는다.
- 확실하지 않은 내용은 "needsVerification"으로 분리한다.
- 분석 결과는 다음 단계의 기획 에이전트가 바로 사용할 수 있게 구조화한다.

입력:
- 상품명: ${input.productName}
- 카테고리: ${input.category}
- 핵심 키워드: ${input.keywords.join(", ") || "없음"}
- 타깃 고객: ${input.targetCustomer || "없음"}
- 강조 포인트: ${input.emphasisPoints.join(", ") || "없음"}
- 경쟁 상세페이지 URL/메모:
${referenceLines}
- 추가 제작 요청: ${input.additionalInstruction || "없음"}
`.trim();
}

export async function runAnalysisAgent(
  input: GenerateDetailPageInput,
  competitorReferences: CompetitorReferenceInput[]
): Promise<AgentRunResult> {
  const fallback = (reason?: string): AgentRunResult => {
    const mock = mockAnalysisAgent(input, competitorReferences);
    return {
      ...mock,
      warnings: reason ? [...mock.warnings, reason] : mock.warnings,
      source: "mock",
    };
  };

  if (!isLiveAiEnabled()) {
    return fallback(getMockReason());
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallback("OPENAI_API_KEY가 없어 mock 분석 결과를 사용했습니다.");
  }

  try {
    const modelId = process.env.AI_MODEL ?? "gpt-4.1-mini";
    const { output } = await generateText({
      model: openai(modelId),
      maxRetries: 0,
      maxOutputTokens: 2500,
      temperature: 0.3,
      output: Output.object({ schema: analysisOutputSchema }),
      prompt: buildPrompt(input, competitorReferences),
    });

    return {
      title: "분석 에이전트",
      summary: output.summary,
      output,
      warnings: output.warnings,
      source: "ai",
    };
  } catch (error) {
    console.error("analysis agent failed", error);
    return fallback("OpenAI 호출 실패로 mock 분석 결과를 사용했습니다.");
  }
}
