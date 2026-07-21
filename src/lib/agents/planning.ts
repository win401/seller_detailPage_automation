import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";

import { mockPlanningAgent } from "@/lib/mock-ai";
import { GenerateDetailPageInput } from "@/lib/types";
import { AgentRunResult, AnalysisOutput, planningOutputSchema } from "./schemas";
import { AI_CALL_TIMEOUT_MS, getMockReason, isLiveAiEnabled } from "./runtime-config";

function buildPrompt(
  input: GenerateDetailPageInput,
  analysisOutput?: AnalysisOutput,
  styleSignalHint?: string,
  brandNote?: string
) {
  return `
너는 커머스 상세페이지 기획자야.

상품 정보와 분석 에이전트 결과를 바탕으로 13개 섹션 상세페이지의 기획안을 작성해줘.

중요 규칙:
- 상품 정보에 없는 효능, 인증, 수치, 원산지, 수상 이력은 만들지 않는다.
- 경쟁 URL/메모는 참고 방향으로만 사용하고, 원문을 본 것처럼 말하지 않는다.
- 제작 에이전트가 바로 사용할 수 있도록 섹션별 목적과 핵심 메시지를 구체적으로 작성한다.

입력:
- 상품명: ${input.productName}
- 카테고리: ${input.category}
- 핵심 키워드: ${input.keywords.join(", ") || "없음"}
- 타깃 고객: ${input.targetCustomer || "없음"}
- 강조 포인트: ${input.emphasisPoints.join(", ") || "없음"}
- 톤앤매너: ${input.tone}
- 디자인 무드: ${input.designMood}
- 플랫폼: ${input.platform}
- 추가 제작 요청: ${input.additionalInstruction || "없음"}
- 분석 에이전트 결과: ${analysisOutput ? JSON.stringify(analysisOutput) : "(분석 결과 없음, 상품 정보만으로 기획)"}
${brandNote ? `\n브랜드 톤 메모(참고용): ${brandNote}\n` : ""}${
    styleSignalHint ? `\n사용자 스타일 신호 요약(참고용, 문맥에 안 맞으면 무시해도 됨):\n${styleSignalHint}\n` : ""
  }`.trim();
}

export async function runPlanningAgent(
  input: GenerateDetailPageInput,
  analysisOutput?: AnalysisOutput,
  styleSignalHint?: string,
  brandNote?: string
): Promise<AgentRunResult> {
  const fallback = (reason?: string): AgentRunResult => {
    const mock = mockPlanningAgent(input);
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
    return fallback("OPENAI_API_KEY가 없어 mock 기획 결과를 사용했습니다.");
  }

  try {
    const modelId = process.env.AI_MODEL ?? "gpt-4.1-mini";
    const { output } = await generateText({
      model: openai(modelId),
      maxRetries: 0,
      maxOutputTokens: 3000,
      temperature: 0.3,
      timeout: AI_CALL_TIMEOUT_MS,
      output: Output.object({ schema: planningOutputSchema }),
      prompt: buildPrompt(input, analysisOutput, styleSignalHint, brandNote),
    });

    return {
      title: "기획자 에이전트",
      summary: output.strategySummary,
      output,
      warnings: output.warnings,
      source: "ai",
    };
  } catch (error) {
    console.error("planning agent failed", error);
    return fallback("OpenAI 호출 실패로 mock 기획 결과를 사용했습니다.");
  }
}
