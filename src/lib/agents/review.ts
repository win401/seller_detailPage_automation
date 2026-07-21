import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";

import { mockReviewAgent } from "@/lib/mock-ai";
import { DetailSection, GenerateDetailPageInput, GenerateDetailPageOutput } from "@/lib/types";
import { AgentRunResult, PlanningOutput, reviewOutputSchema } from "./schemas";
import { AI_CALL_TIMEOUT_MS, getMockReason, isLiveAiEnabled } from "./runtime-config";

type ReviewIssue = ReturnType<typeof reviewOutputSchema.parse>["issues"][number];

/**
 * Deterministic pre-check, not an LLM judgment call: a section whose
 * imageRole says it needs a photo (`imageRole !== "none"`) but has no
 * imageUrl at all is an unambiguous gap, not a matter of taste — checking it
 * in code means this always fires (including in mock mode, with no LLM call
 * needed) rather than depending on the model noticing it in a JSON blob.
 * layout_mismatch/section_flow/repetition stay LLM-only since they're
 * genuinely semantic judgments this can't decide from data alone.
 */
export function detectMissingImageIssues(sections: DetailSection[]): ReviewIssue[] {
  return sections
    .filter((section) => section.imageRole !== "none" && !section.imageUrl)
    .map((section) => ({
      sectionId: section.id,
      severity: "medium" as const,
      type: "missing_image_slot" as const,
      message: `${section.title} 섹션은 이미지가 필요한데(imageRole: ${section.imageRole}) 아직 이미지가 없습니다.`,
      suggestion: "섹션 편집 패널에서 이미지를 업로드하거나 AI로 생성해 채워주세요.",
    }));
}

function buildPrompt(
  input: GenerateDetailPageInput,
  productionOutput: GenerateDetailPageOutput,
  planningOutput?: PlanningOutput
) {
  return `
너는 커머스 상세페이지 검수 담당자야.

제작 에이전트가 만든 상세페이지 초안을 검토하고, 과장 표현, 근거 없는 정보, 섹션 누락, 모바일 가독성 문제를 찾아줘.

중요 규칙:
- 상품 정보에 없는 효능, 인증, 수치, 원산지, 수상 이력은 위험으로 표시한다.
- "완벽", "무조건", "최고", "1위"처럼 근거가 필요한 표현은 위험으로 표시한다.
- 검수는 사용자가 수정할 수 있게 구체적으로 작성한다.
- 자동 수정이 가능한 항목은 안전한 대체 문구를 제안한다.
- 문제가 없으면 빈 배열을 사용한다.
- layout_mismatch: 섹션의 layoutType이 그 섹션의 실제 메시지(headline/body)와 안 맞으면 표시한다(예: 비교 레이아웃인데 비교 내용이 없음).
- section_flow: 13개 섹션 전체를 놓고 봤을 때 강조 순서나 흐름이 부자연스러우면(예: 문제 제기 없이 바로 해결책부터 나옴) 표시한다.
- repetition: 서로 다른 섹션의 headline/body가 같은 표현이나 문장 구조를 반복하면 표시한다.

입력:
- 상품 정보: ${input.productName} / ${input.category} / 강조 포인트: ${input.emphasisPoints.join(", ") || "없음"}
- 플랫폼: ${input.platform}
- 기획 에이전트 결과: ${planningOutput ? JSON.stringify(planningOutput) : "(없음)"}
- 제작 에이전트 결과 섹션: ${JSON.stringify(
    productionOutput.sections.map((section) => ({
      id: section.id,
      kind: section.kind,
      headline: section.headline,
      body: section.body,
      bullets: section.bullets,
      layoutType: section.layoutType,
      slots: section.slots,
      imageRole: section.imageRole,
      hasImage: Boolean(section.imageUrl),
    }))
  )}
`.trim();
}

export async function runReviewAgent(
  input: GenerateDetailPageInput,
  productionOutput: GenerateDetailPageOutput,
  planningOutput?: PlanningOutput
): Promise<AgentRunResult> {
  const deterministicIssues = detectMissingImageIssues(productionOutput.sections);

  const fallback = (reason?: string): AgentRunResult => {
    const mock = mockReviewAgent();
    const mockOutput = mock.output as ReturnType<typeof reviewOutputSchema.parse>;
    return {
      ...mock,
      output: { ...mockOutput, issues: [...mockOutput.issues, ...deterministicIssues] },
      warnings: reason ? [...mock.warnings, reason] : mock.warnings,
      source: "mock",
    };
  };

  if (!isLiveAiEnabled()) {
    return fallback(getMockReason());
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallback("OPENAI_API_KEY가 없어 mock 검수 결과를 사용했습니다.");
  }

  try {
    const modelId = process.env.AI_MODEL ?? "gpt-4.1-mini";
    const { output } = await generateText({
      model: openai(modelId),
      maxRetries: 0,
      maxOutputTokens: 2500,
      temperature: 0.2,
      timeout: AI_CALL_TIMEOUT_MS,
      output: Output.object({ schema: reviewOutputSchema }),
      prompt: buildPrompt(input, productionOutput, planningOutput),
    });

    return {
      title: "검수 에이전트",
      summary: output.summary,
      output: { ...output, issues: [...output.issues, ...deterministicIssues] },
      warnings: output.warnings,
      source: "ai",
    };
  } catch (error) {
    console.error("review agent failed", error);
    return fallback("OpenAI 호출 실패로 mock 검수 결과를 사용했습니다.");
  }
}
