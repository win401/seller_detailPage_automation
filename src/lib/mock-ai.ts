import { mockSections } from "./mock-data";
import {
  AgentWorkflowDraft,
  AiEditAction,
  CompetitorReferenceInput,
  DetailSection,
  GenerateDetailPageInput,
  GenerateDetailPageOutput,
} from "./types";

/**
 * Mock fallback for the AI editing assistant (docs/TASKS.md §0, §12).
 * Real implementation swaps this out for a Vercel AI SDK call using the
 * prompt in docs/PROMPTS.md ("AI 편집 도우미 액션 프롬프트"), keeping the
 * same input/output shape so the UI doesn't need to change.
 */
export function mockAiRewrite(section: DetailSection, action: AiEditAction): string {
  const body = section.body;
  switch (action) {
    case "shorten_section":
      return body.split(/[.!?]/)[0]?.trim() + ".";
    case "soften_tone":
      return body.replace(/!/g, ".").replace(/최고|완벽|무조건/g, "만족스러운");
    case "premium_tone":
      return "프리미엄 마감으로 완성한 " + body;
    case "check_exaggeration":
      return body + " (과장 표현 없음 · 사실 기반 문구로 확인됨)";
    case "rewrite_faq":
      return "Q. 자주 묻는 질문을 더 명확하게 정리했습니다. A. " + body;
    case "rewrite_cta":
      return "지금 바로 확인하세요 — " + body;
    default:
      return body;
  }
}

export function mockGenerateDetailPage(input: GenerateDetailPageInput): GenerateDetailPageOutput {
  const keywordText = input.keywords.slice(0, 2).join(" · ");
  const sections = mockSections.map((section) => {
    const headlinePrefix =
      section.kind === "intro"
        ? input.productName
        : section.kind === "one_line"
          ? keywordText || input.productName
          : section.headline;

    return {
      ...section,
      headline: headlinePrefix || section.headline,
      body:
        section.kind === "intro"
          ? `${input.targetCustomer || "고객"}에게 어울리는 ${input.productName} 상세페이지 초안입니다.`
          : section.body,
      imagePrompt:
        `${input.designMood} mood, ${section.imageRole}, product detail page section image, keep real product facts unchanged`,
    };
  });

  return {
    sections,
    source: "mock",
    warnings: ["Claude API 키가 없거나 호출에 실패하면 mock 초안을 사용합니다."],
  };
}

export function mockBuildAgentWorkflow(
  input: GenerateDetailPageInput,
  competitorReferences: CompetitorReferenceInput[]
): AgentWorkflowDraft {
  const now = new Date().toISOString();
  const referenceMemos = competitorReferences
    .map((reference) => reference.memo.trim())
    .filter(Boolean);
  const primaryMemo = referenceMemos[0] ?? "경쟁 URL은 참고 링크로만 저장하고, 메모 기반으로 분석합니다.";
  const keywords = input.keywords.slice(0, 3);

  return {
    competitorReferences,
    revisionEnabled: true,
    runs: [
      {
        id: "agent-analysis-1",
        agentType: "analysis",
        status: "mocked",
        title: "분석 에이전트",
        summary: `${competitorReferences.length || 0}개 경쟁 참고와 상품 키워드를 바탕으로 참고 포인트를 정리했습니다.`,
        output: {
          usableInsights: [
            primaryMemo,
            keywords.length
              ? `핵심 키워드는 ${keywords.join(", ")} 순서로 먼저 검토합니다.`
              : "상품 키워드가 부족하면 첫 화면에서 상품명과 사용 상황을 우선합니다.",
          ],
          avoidList: ["URL을 실제로 크롤링한 것처럼 단정하지 않기", "근거 없는 인증/수치 만들지 않기"],
        },
        warnings: competitorReferences.length
          ? ["MVP에서는 URL 원문을 자동 수집하지 않고 사용자가 적은 메모만 분석합니다."]
          : ["경쟁 URL/메모가 없어서 기본 상품 정보 중심으로 분석했습니다."],
        createdAt: now,
      },
      {
        id: "agent-planning-1",
        agentType: "planning",
        status: "mocked",
        title: "기획자 에이전트",
        summary: `${input.targetCustomer || "타깃 고객"} 기준으로 상세페이지 흐름과 강조 순서를 잡았습니다.`,
        output: {
          primarySellingPoint: keywords[0] ?? input.productName,
          toneGuide: input.tone,
          visualGuide: input.designMood,
          sectionStrategy: ["Intro에서 사용 상황 제시", "Benefit에서 핵심 장점 분리", "FAQ/Trust에서 과장 없이 확인"],
        },
        warnings: [],
        createdAt: now,
      },
      {
        id: "agent-production-1",
        agentType: "production",
        status: "mocked",
        title: "제작 에이전트",
        summary: "기획안을 바탕으로 13개 섹션 초안을 제작합니다.",
        output: {
          sectionCount: 13,
          handoff: "현재 구현된 generate-detail-page API가 제작 에이전트 역할을 수행합니다.",
        },
        warnings: [],
        createdAt: now,
      },
      {
        id: "agent-review-1",
        agentType: "review",
        status: "mocked",
        title: "검수 에이전트",
        summary: "과장 표현, 근거 없는 수치/인증, 모바일 가독성을 확인할 준비가 되었습니다.",
        output: {
          score: 82,
          checks: ["unsupported_claim", "exaggeration", "mobile_readability", "section_completeness"],
        },
        warnings: ["실제 검수 API 연결 전까지는 mock 검수 점수입니다."],
        createdAt: now,
      },
    ],
  };
}
