import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";

import { mockPlanRevision } from "@/lib/mock-ai";
import { DetailSection, GenerateDetailPageInput } from "@/lib/types";
import { AgentRunResult, AnalysisOutput, PlanningOutput, ReviewOutput, revisionOutputSchema } from "./schemas";
import { getMockReason, isLiveAiEnabled } from "./runtime-config";

function buildPrompt(
  input: GenerateDetailPageInput,
  currentSections: DetailSection[],
  request: string,
  priorAnalysis?: AnalysisOutput,
  priorPlanning?: PlanningOutput,
  priorReview?: ReviewOutput
) {
  return `
너는 커머스 상세페이지 기획자야.

사용자가 완성된 시안을 보고 남긴 수정 요청을 바탕으로 기존 기획안을 다시 조정해줘.
이 단계는 단순히 문구 한 줄을 바꾸는 편집이 아니라, 필요한 경우 섹션 전략, 강조 순서, 톤앤매너, 이미지 방향을 다시 설계하는 재기획 단계야.

중요 규칙:
- 별도의 편집 에이전트처럼 행동하지 않는다.
- 사용자의 요청을 기획 변경 사항으로 해석한다.
- 상품 정보에 없는 효능, 인증, 수치, 원산지, 수상 이력은 만들지 않는다.
- 검수 에이전트가 지적한 위험 표현은 우선적으로 완화한다.
- 수정 요청이 특정 섹션에만 해당하면 targetSections를 해당 섹션 kind로 제한하고 revisionScope를 "section" 또는 "multi_section"으로 한다.
- 수정 요청이 전체 톤/구성에 해당하면 revisionScope를 "full_draft"로 하고 전체 updatedSectionPlan을 조정한다.
- 새 기획안은 제작 에이전트가 다시 상세페이지 시안을 만들 수 있게 구조화한다.

입력:
- 상품명: ${input.productName}
- 카테고리: ${input.category}
- 톤앤매너: ${input.tone}
- 디자인 무드: ${input.designMood}
- 기존 분석 에이전트 결과: ${priorAnalysis ? JSON.stringify(priorAnalysis) : "(없음)"}
- 기존 기획 에이전트 결과: ${priorPlanning ? JSON.stringify(priorPlanning) : "(없음)"}
- 기존 검수 에이전트 결과: ${priorReview ? JSON.stringify(priorReview) : "(없음)"}
- 현재 섹션 목록(kind, headline, body): ${JSON.stringify(
    currentSections.map((section) => ({ kind: section.kind, headline: section.headline, body: section.body }))
  )}
- 사용자 수정 요청: ${request}
`.trim();
}

function fallback(
  currentSections: DetailSection[],
  request: string,
  selectedSectionId?: string,
  reason?: string
): AgentRunResult {
  const target = currentSections.find((section) => section.id === selectedSectionId) ?? currentSections[0];
  const revisedSections = mockPlanRevision(currentSections, target, request);
  const changedKinds = revisedSections
    .filter(
      (section, index) =>
        section.body !== currentSections[index]?.body || section.headline !== currentSections[index]?.headline
    )
    .map((section) => section.kind);
  const targetKinds = changedKinds.length ? changedKinds : [target.kind];
  const summary = `"${request}" 요청을 mock으로 반영했습니다.`;

  const output = {
    revisionSummary: summary,
    revisionScope: targetKinds.length > 1 ? "multi_section" : "section",
    changedStrategy: "",
    targetSections: targetKinds,
    updatedToneGuide: "",
    updatedVisualGuide: "",
    updatedSectionPlan: revisedSections.map((section) => ({
      kind: section.kind,
      goal: section.title,
      keyMessage: section.body,
      imageRole: section.imageRole,
      copyNotes: [],
    })),
    mustAvoid: [],
    handoffToProduction: "",
    warnings: reason ? [reason] : [],
  };

  return {
    title: "기획자 에이전트 수정 요청",
    summary,
    output,
    warnings: output.warnings,
    source: "mock",
  };
}

export async function runRevisionAgent(
  input: GenerateDetailPageInput,
  currentSections: DetailSection[],
  request: string,
  priorAnalysis?: AnalysisOutput,
  priorPlanning?: PlanningOutput,
  priorReview?: ReviewOutput,
  selectedSectionId?: string
): Promise<AgentRunResult> {
  if (!isLiveAiEnabled()) {
    return fallback(currentSections, request, selectedSectionId, getMockReason());
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallback(currentSections, request, selectedSectionId, "OPENAI_API_KEY가 없어 mock 재기획 결과를 사용했습니다.");
  }

  try {
    const modelId = process.env.AI_MODEL ?? "gpt-4.1-mini";
    const { output } = await generateText({
      model: openai(modelId),
      maxRetries: 0,
      maxOutputTokens: 2000,
      temperature: 0.3,
      output: Output.object({ schema: revisionOutputSchema }),
      prompt: buildPrompt(input, currentSections, request, priorAnalysis, priorPlanning, priorReview),
    });

    return {
      title: "기획자 에이전트 수정 요청",
      summary: output.revisionSummary,
      output,
      warnings: output.warnings,
      source: "ai",
    };
  } catch (error) {
    console.error("revision agent failed", error);
    return fallback(currentSections, request, selectedSectionId, "OpenAI 호출 실패로 mock 재기획 결과를 사용했습니다.");
  }
}
