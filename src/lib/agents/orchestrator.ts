import { randomUUID } from "node:crypto";

import { generateText, stepCountIs, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
  mockAnalysisAgent,
  mockBuildAgentWorkflow,
  mockGenerateDetailPage,
  mockPlanningAgent,
  mockPlanRevision,
  mockProductionAgentSummary,
  mockReviewAgent,
} from "@/lib/mock-ai";
import {
  AgentRunDraft,
  AgentWorkflowDraft,
  CompetitorReferenceInput,
  DetailSection,
  GenerateDetailPageInput,
  GenerateDetailPageOutput,
} from "@/lib/types";
import { runAnalysisAgent } from "./analysis";
import { runPlanningAgent } from "./planning";
import { runProductionAgent } from "./production";
import { runReviewAgent } from "./review";
import { runRevisionAgent } from "./revision";
import { getMockReason, isLiveAiEnabled } from "./runtime-config";
import { generateSectionImages } from "./section-images";
import { AgentRunResult, AnalysisOutput, PlanningOutput, ReviewOutput } from "./schemas";

const MAX_STEPS = 8;

type OrderedAgentType = "analysis" | "planning" | "production" | "review";
const ORDERED_AGENT_TYPES: OrderedAgentType[] = ["analysis", "planning", "production", "review"];

const reasonInputSchema = z.object({
  reason: z.string().describe("이 tool을 지금 호출하는 이유를 한 줄로 설명"),
});

function hasRepeatedToolCalls(steps: { toolCalls?: { toolName: string }[] }[]): boolean {
  const recentToolNames = steps.slice(-3).map((step) => step.toolCalls?.[0]?.toolName);
  return (
    recentToolNames.length === 3 &&
    recentToolNames[0] !== undefined &&
    recentToolNames[0] === recentToolNames[1] &&
    recentToolNames[1] === recentToolNames[2]
  );
}

function buildOrchestratorPrompt(input: GenerateDetailPageInput, competitorReferences: CompetitorReferenceInput[]) {
  const referenceLines = competitorReferences.length
    ? competitorReferences
        .map((reference, index) => `${index + 1}. url: ${reference.url || "(없음)"} / 메모: ${reference.memo || "(없음)"}`)
        .join("\n")
    : "(경쟁 상세페이지 URL/메모 없음)";

  return `
아래 상품에 대한 모바일 상세페이지 초안을 완성해줘.

상품 정보:
- 상품명: ${input.productName}
- 카테고리: ${input.category}
- 핵심 키워드: ${input.keywords.join(", ") || "없음"}
- 타깃 고객: ${input.targetCustomer || "없음"}
- 강조 포인트: ${input.emphasisPoints.join(", ") || "없음"}
- 톤앤매너: ${input.tone}
- 디자인 무드: ${input.designMood}
- 플랫폼: ${input.platform}
- 추가 제작 요청: ${input.additionalInstruction || "없음"}

경쟁 상세페이지 참고:
${referenceLines}
`.trim();
}

const ORCHESTRATOR_SYSTEM_PROMPT = `
너는 커머스 상세페이지 제작 파이프라인을 감독하는 총괄 에이전트야.
콘텐츠를 직접 작성하지 않는다. 아래 4개 tool을 필요한 순서로 호출해서 상세페이지 제작을 완료해줘.

기본 순서:
1. runAnalysisAgent 호출
2. runPlanningAgent 호출 (분석 결과는 코드가 자동으로 전달하니 다시 입력할 필요 없다)
3. runProductionAgent 호출 (기획 결과는 코드가 자동으로 전달한다)
4. runReviewAgent 호출 (제작 결과가 있어야만 호출할 수 있다)

판단 기준:
- runReviewAgent의 score가 낮거나 issueCount가 많으면, 문제 성격에 따라 runPlanningAgent(전략 문제) 또는 runProductionAgent(문구 문제)부터 다시 호출할 수 있다.
- 이미 확인된 정보를 다시 tool에 묻지 않는다. 각 tool은 이전 단계 결과를 코드 레벨에서 자동으로 전달받으니, tool 호출 시 인자로는 "왜 지금 이 tool을 호출하는지"만 짧게 남기면 된다.

비용/안전 제한:
- 총 tool 호출은 이번 실행에서 최대 8회를 넘지 않는다.
- 같은 tool을 연속 2회 넘게 재시도하지 않는다.
- 제한에 도달하면 마지막으로 확보한 결과로 종료한다.

모든 tool 호출이 끝나면(runProductionAgent와 runReviewAgent가 최소 1회씩 실행된 뒤) 어떤 tool을 어떤 순서로 왜 호출했는지 한두 문장으로 요약해서 답한다.
`.trim();

function toRunDraft(
  agentType: AgentRunDraft["agentType"],
  result: AgentRunResult,
  parentRunId: string
): AgentRunDraft {
  return {
    id: randomUUID(),
    parentRunId,
    agentType,
    status: result.source === "ai" ? "succeeded" : "mocked",
    title: result.title,
    summary: result.summary,
    output: result.output,
    warnings: result.warnings,
    createdAt: new Date().toISOString(),
  };
}

/** Picks the latest recorded run for an agent type, or synthesizes one from mock data so the
 * fixed-order [analysis, planning, production, review] contract that new/page.tsx relies on
 * (`agentWorkflow?.runs[index]`) always has exactly 4 entries. */
function pickLatestOrFallback(
  runs: AgentRunDraft[],
  agentType: OrderedAgentType,
  input: GenerateDetailPageInput,
  competitorReferences: CompetitorReferenceInput[]
): AgentRunDraft {
  const latest = runs.filter((run) => run.agentType === agentType).at(-1);
  if (latest) return latest;

  const mock =
    agentType === "analysis"
      ? mockAnalysisAgent(input, competitorReferences)
      : agentType === "planning"
        ? mockPlanningAgent(input)
        : agentType === "production"
          ? mockProductionAgentSummary()
          : mockReviewAgent();

  return {
    id: randomUUID(),
    agentType,
    status: "mocked",
    title: mock.title,
    summary: mock.summary,
    output: mock.output,
    warnings: [...mock.warnings, "총괄 에이전트가 이 단계를 호출하지 않아 mock으로 보완했습니다."],
    createdAt: new Date().toISOString(),
  };
}

export async function runOrchestratedGeneration(
  input: GenerateDetailPageInput,
  competitorReferences: CompetitorReferenceInput[]
): Promise<{ workflow: AgentWorkflowDraft; output: GenerateDetailPageOutput }> {
  if (!isLiveAiEnabled() || !process.env.OPENAI_API_KEY) {
    const mockOutput = mockGenerateDetailPage(input);
    return {
      workflow: mockBuildAgentWorkflow(input, competitorReferences),
      output: {
        ...mockOutput,
        sections: await generateSectionImages(mockOutput.sections, input.productImageDataUrl),
        warnings: [getMockReason(), ...(mockOutput.warnings ?? [])],
      },
    };
  }

  const orchestratorRunId = randomUUID();
  const runs: AgentRunDraft[] = [];
  const pipelineState: {
    analysis?: AnalysisOutput;
    planning?: PlanningOutput;
    production?: GenerateDetailPageOutput;
  } = {};

  const tools = {
    runAnalysisAgent: tool({
      description: "경쟁 분석 초안을 생성한다. 파이프라인의 첫 단계로 가장 먼저 호출한다.",
      inputSchema: reasonInputSchema,
      execute: async ({ reason }: { reason: string }) => {
        const result = await runAnalysisAgent(input, competitorReferences);
        pipelineState.analysis = result.output as AnalysisOutput;
        runs.push(toRunDraft("analysis", result, orchestratorRunId));
        return { reason, summary: result.summary, warningCount: result.warnings.length };
      },
    }),
    runPlanningAgent: tool({
      description: "상세페이지 기획안을 생성한다. 분석 결과가 있으면 자동으로 반영된다.",
      inputSchema: reasonInputSchema,
      execute: async ({ reason }: { reason: string }) => {
        const result = await runPlanningAgent(input, pipelineState.analysis);
        pipelineState.planning = result.output as PlanningOutput;
        runs.push(toRunDraft("planning", result, orchestratorRunId));
        return { reason, summary: result.summary, warningCount: result.warnings.length };
      },
    }),
    runProductionAgent: tool({
      description: "13개 섹션 상세페이지 초안을 생성한다. 기획 결과가 있으면 자동으로 반영된다.",
      inputSchema: reasonInputSchema,
      execute: async ({ reason }: { reason: string }) => {
        const result = await runProductionAgent(input, pipelineState.planning);
        pipelineState.production = result;
        runs.push(
          toRunDraft(
            "production",
            {
              title: "제작 에이전트",
              summary: `${result.sections.length}개 섹션 초안을 생성했습니다.`,
              output: { sectionCount: result.sections.length },
              warnings: result.warnings ?? [],
              source: result.source === "mock" ? "mock" : "ai",
            },
            orchestratorRunId
          )
        );
        return { reason, sectionCount: result.sections.length, source: result.source };
      },
    }),
    runReviewAgent: tool({
      description: "제작 결과를 검수해 점수와 이슈를 반환한다. runProductionAgent 이후에만 호출할 수 있다.",
      inputSchema: reasonInputSchema,
      execute: async ({ reason }: { reason: string }) => {
        if (!pipelineState.production) {
          return {
            reason,
            error: "아직 제작 결과가 없어 검수할 수 없습니다. runProductionAgent를 먼저 호출하세요.",
          };
        }
        const result = await runReviewAgent(input, pipelineState.production, pipelineState.planning);
        runs.push(toRunDraft("review", result, orchestratorRunId));
        const score = typeof result.output.score === "number" ? result.output.score : undefined;
        const issueCount = Array.isArray(result.output.issues) ? result.output.issues.length : 0;
        return { reason, score, issueCount, summary: result.summary };
      },
    }),
  };

  let stoppedReason: "completed" | "cost_limit_reached" | "repeated_failure" = "completed";

  try {
    const modelId = process.env.AI_MODEL ?? "gpt-4.1-mini";
    const result = await generateText({
      model: openai(modelId),
      tools,
      stopWhen: [stepCountIs(MAX_STEPS), ({ steps }) => hasRepeatedToolCalls(steps)],
      temperature: 0.2,
      maxOutputTokens: 1200,
      system: ORCHESTRATOR_SYSTEM_PROMPT,
      prompt: buildOrchestratorPrompt(input, competitorReferences),
    });

    if (result.steps.length >= MAX_STEPS) stoppedReason = "cost_limit_reached";

    if (!pipelineState.production) {
      // Orchestrator never called production — run it directly so the user still gets a draft.
      stoppedReason = "repeated_failure";
      const fallbackProduction = await runProductionAgent(input, pipelineState.planning);
      pipelineState.production = fallbackProduction;
      runs.push(
        toRunDraft(
          "production",
          {
            title: "제작 에이전트",
            summary: "총괄 에이전트가 제작 단계를 호출하지 않아 직접 실행했습니다.",
            output: { sectionCount: fallbackProduction.sections.length },
            warnings: [
              ...(fallbackProduction.warnings ?? []),
              "총괄 에이전트가 제작 단계를 호출하지 않아 자동으로 보완했습니다.",
            ],
            source: fallbackProduction.source === "mock" ? "mock" : "ai",
          },
          orchestratorRunId
        )
      );
    }

    const orderedRuns = ORDERED_AGENT_TYPES.map((agentType) =>
      pickLatestOrFallback(runs, agentType, input, competitorReferences)
    );

    const orchestratorRun: AgentRunDraft = {
      id: orchestratorRunId,
      agentType: "orchestrator",
      status: "succeeded",
      title: "총괄 에이전트",
      summary: result.text || "분석-기획-제작-검수 파이프라인을 조율했습니다.",
      output: {
        planSummary: result.text,
        steps: runs.map((run) => ({ tool: run.agentType, runId: run.id })),
        stoppedReason,
      },
      warnings: [],
      createdAt: new Date().toISOString(),
    };

    return {
      workflow: {
        competitorReferences,
        revisionEnabled: true,
        runs: orderedRuns,
        orchestratorRun,
      },
      output: pipelineState.production,
    };
  } catch (error) {
    console.error("orchestrator agent failed", error);
    const mockOutput = mockGenerateDetailPage(input);
    return {
      workflow: mockBuildAgentWorkflow(input, competitorReferences),
      output: {
        ...mockOutput,
        sections: await generateSectionImages(mockOutput.sections, input.productImageDataUrl),
      },
    };
  }
}

export interface RevisionResult {
  sections: DetailSection[];
  revisionSummary: string;
  revisionScope: string;
  runs: AgentRunDraft[];
}

/** Instant, deterministic fallback used both when OPENAI_API_KEY is absent and
 * when the real revision pipeline throws — mirrors the pre-orchestrator
 * client-side mock behavior exactly (docs/TASKS.md §12). */
function mockRevisionResult(
  currentSections: DetailSection[],
  request: string,
  selectedSectionId?: string,
  reason?: string
): RevisionResult {
  const target = currentSections.find((section) => section.id === selectedSectionId) ?? currentSections[0];
  const revisedSections = mockPlanRevision(currentSections, target, request);
  const summary = `"${request}" 요청을 mock으로 반영했습니다.`;
  const run: AgentRunDraft = {
    id: randomUUID(),
    agentType: "revision_planning",
    status: "mocked",
    title: "기획자 에이전트 수정 요청",
    summary,
    output: { targetSection: target.title },
    warnings: reason ? [reason] : [],
    createdAt: new Date().toISOString(),
  };
  return { sections: revisedSections, revisionSummary: summary, revisionScope: "section", runs: [run] };
}

/**
 * Real revision loop (docs/TASKS.md §12): runs the revision agent, adapts its
 * output into a PlanningOutput shape (same fields as updatedSectionPlan) so
 * the existing production/review agents can be reused unchanged, then merges
 * only the sections the revision scope actually targets back into
 * currentSections — image fields are always carried forward since production
 * has no concept of them.
 */
export async function runOrchestratedRevision(
  input: GenerateDetailPageInput,
  currentSections: DetailSection[],
  request: string,
  selectedSectionId?: string,
  priorAnalysis?: AnalysisOutput,
  priorPlanning?: PlanningOutput,
  priorReview?: ReviewOutput
): Promise<RevisionResult> {
  if (!isLiveAiEnabled() || !process.env.OPENAI_API_KEY) {
    return mockRevisionResult(currentSections, request, selectedSectionId, getMockReason());
  }

  try {
    const revisionResult = await runRevisionAgent(
      input,
      currentSections,
      request,
      priorAnalysis,
      priorPlanning,
      priorReview,
      selectedSectionId
    );
    const revisionOutput = revisionResult.output as {
      revisionScope?: "section" | "multi_section" | "full_draft";
      targetSections?: string[];
      updatedToneGuide?: string;
      updatedVisualGuide?: string;
      updatedSectionPlan?: PlanningOutput["sectionPlan"];
      mustAvoid?: string[];
    };

    const revisionRunId = randomUUID();
    const revisionRun: AgentRunDraft = {
      id: revisionRunId,
      agentType: "revision_planning",
      status: revisionResult.source === "ai" ? "succeeded" : "mocked",
      title: revisionResult.title,
      summary: revisionResult.summary,
      output: revisionResult.output,
      warnings: revisionResult.warnings,
      createdAt: new Date().toISOString(),
    };
    const runs: AgentRunDraft[] = [revisionRun];

    if (revisionResult.source !== "ai") {
      return mockRevisionResult(currentSections, request, selectedSectionId, revisionResult.warnings[0]);
    }

    const adaptedPlanning: PlanningOutput = {
      strategySummary: revisionResult.summary,
      targetAngle: "",
      primarySellingPoint: "",
      toneGuide: revisionOutput.updatedToneGuide || input.tone,
      visualGuide: revisionOutput.updatedVisualGuide || input.designMood,
      sectionPlan: revisionOutput.updatedSectionPlan ?? [],
      mustAvoid: revisionOutput.mustAvoid ?? [],
      warnings: [],
    };

    const productionResult = await runProductionAgent(input, adaptedPlanning);
    runs.push(
      toRunDraft(
        "production",
        {
          title: "제작 에이전트",
          summary: `${productionResult.sections.length}개 섹션을 재생성했습니다.`,
          output: { sectionCount: productionResult.sections.length },
          warnings: productionResult.warnings ?? [],
          source: productionResult.source === "mock" ? "mock" : "ai",
        },
        revisionRunId
      )
    );

    const reviewResult = await runReviewAgent(input, productionResult, adaptedPlanning);
    runs.push(toRunDraft("review", reviewResult, revisionRunId));

    const scope = revisionOutput.revisionScope ?? "full_draft";
    const targetKinds = new Set(revisionOutput.targetSections ?? []);

    const mergedSections: DetailSection[] = currentSections.map((original) => {
      const shouldReplace = scope === "full_draft" || targetKinds.has(original.kind);
      if (!shouldReplace) return original;

      const replacement = productionResult.sections.find((section) => section.kind === original.kind);
      if (!replacement) return original;

      return {
        ...replacement,
        // Production has no concept of section images — always keep the existing ones.
        imageUrl: original.imageUrl,
        imageGradient: original.imageGradient,
        imageLabel: original.imageLabel,
        imageSource: original.imageSource,
      };
    });

    return {
      sections: mergedSections,
      revisionSummary: revisionResult.summary,
      revisionScope: scope,
      runs,
    };
  } catch (error) {
    console.error("revision orchestration failed", error);
    return mockRevisionResult(currentSections, request, selectedSectionId, "재기획 파이프라인 호출 실패로 mock 결과를 사용했습니다.");
  }
}
