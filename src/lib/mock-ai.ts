import { getMockReferencesForSection } from "./mock-data";
import { createTemplateSections } from "./detail-page-templates";
import { richTextToPlainText, toRichText } from "./rich-text";
import {
  AgentWorkflowDraft,
  AiEditAction,
  CompetitorReferenceInput,
  DetailSection,
  GenerateDetailPageInput,
  GenerateDetailPageOutput,
} from "./types";
import { CompetitorPageAnalysis } from "./agents/schemas";

/**
 * Mock fallback for the AI editing assistant (docs/TASKS.md §0, §12).
 * Real implementation swaps this out for a Vercel AI SDK call using the
 * prompt in docs/PROMPTS.md ("AI 편집 도우미 액션 프롬프트"), keeping the
 * same input/output shape so the UI doesn't need to change.
 */
export function mockAiRewrite(section: DetailSection, action: AiEditAction): string {
  const body = richTextToPlainText(section.body);
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
  const sections = createTemplateSections(input).map((section) => {

    // Re-pick the reference image for the selected design mood so a fresh
    // mock draft's imagery matches what the user chose, instead of always
    // reusing mockSections' fixed "minimal" palette (docs/TASKS.md §7).
    const moodImage =
      section.imageRole === "none" ? null : getMockReferencesForSection(section, input.designMood)[0];

    return {
      ...section,
      imagePrompt:
        `${input.designMood} mood, ${section.imageRole}, product detail page section image, keep real product facts unchanged`,
      ...(moodImage && {
        imageUrl: moodImage.dataUrl,
        imageGradient: moodImage.gradient,
        imageLabel: moodImage.label,
        imageSource: moodImage.source,
      }),
    };
  });

  return {
    sections,
    source: "mock",
    warnings: ["카테고리별 구조 템플릿을 적용한 mock 시안입니다. 실제 상품 사진과 옵션 정보는 편집기에서 연결해 주세요."],
  };
}

/** Upgrade the first flat/gradient mock format without discarding user copy. */
export function upgradeLegacyMockSections(
  input: GenerateDetailPageInput,
  legacySections: DetailSection[]
): DetailSection[] {
  // Runs unconditionally, before the layoutType gate below — a draft can
  // already have layoutType set (true for virtually all real data, since
  // that's a separate, older migration) while its headline/body are still
  // plain strings from before the RichText migration. legacySections is
  // typed as RichText already, but real stored JSON from before this
  // migration (or from the intermediate **bold**/==highlight== marker
  // phase) can still be a plain string at runtime — toRichText upgrades
  // either case; it's a no-op for data that's already RichText.
  const normalizedLegacy = legacySections.map((section) => ({
    ...section,
    headline: toRichText(section.headline),
    body: toRichText(section.body),
  }));

  if (normalizedLegacy.some((section) => section.layoutType)) return normalizedLegacy;

  const templateSections = mockGenerateDetailPage(input).sections;
  return templateSections.map((template, index) => {
    const legacy = normalizedLegacy.find((section) => section.kind === template.kind) ?? normalizedLegacy[index];
    if (!legacy) return template;

    const keepOwnVisual = legacy.imageSource === "uploaded" || legacy.imageSource === "generated";
    return {
      ...template,
      kicker: legacy.kicker || template.kicker,
      headline: richTextToPlainText(legacy.headline).trim() ? legacy.headline : template.headline,
      body: richTextToPlainText(legacy.body).trim() ? legacy.body : template.body,
      bullets: legacy.bullets.length ? legacy.bullets : template.bullets,
      alternatives: legacy.alternatives.length ? legacy.alternatives : template.alternatives,
      ...(keepOwnVisual && {
        imageUrl: legacy.imageUrl,
        imageLabel: legacy.imageLabel,
        imageSource: legacy.imageSource,
        imageGradient: legacy.imageGradient,
        imagePrompt: legacy.imagePrompt,
      }),
    };
  });
}

type MockAgentRun = Pick<AgentWorkflowDraft["runs"][number], "title" | "summary" | "output" | "warnings">;

/**
 * Fallback for the analysis agent, used both by mockBuildAgentWorkflow (full-mock
 * pipeline) and by the real runAnalysisAgent (docs/PROMPTS.md) when the OpenAI
 * call fails or OPENAI_API_KEY is missing.
 */
export function mockAnalysisAgent(
  input: GenerateDetailPageInput,
  competitorReferences: CompetitorReferenceInput[]
): MockAgentRun {
  const referenceMemos = competitorReferences
    .map((reference) => reference.memo.trim())
    .filter(Boolean);
  const primaryMemo = referenceMemos[0] ?? "경쟁 URL은 참고 링크로만 저장하고, 메모 기반으로 분석합니다.";
  const keywords = input.keywords.slice(0, 3);

  return {
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
  };
}

/** Fallback for the planning agent (see mockAnalysisAgent doc). */
export function mockPlanningAgent(input: GenerateDetailPageInput): MockAgentRun {
  const keywords = input.keywords.slice(0, 3);
  return {
    title: "기획자 에이전트",
    summary: `${input.targetCustomer || "타깃 고객"} 기준으로 상세페이지 흐름과 강조 순서를 잡았습니다.`,
    output: {
      primarySellingPoint: keywords[0] ?? input.productName,
      toneGuide: input.tone,
      visualGuide: input.designMood,
      sectionStrategy: ["Intro에서 사용 상황 제시", "Benefit에서 핵심 장점 분리", "FAQ/Trust에서 과장 없이 확인"],
    },
    warnings: [],
  };
}

/** Fallback summary card for the production agent (real output comes from mockGenerateDetailPage/runProductionAgent). */
export function mockProductionAgentSummary(): MockAgentRun {
  return {
    title: "제작 에이전트",
    summary: "기획안을 바탕으로 13개 섹션 초안을 제작합니다.",
    output: {
      sectionCount: 13,
      handoff: "현재 구현된 generate-detail-page API가 제작 에이전트 역할을 수행합니다.",
    },
    warnings: [],
  };
}

/** Fallback for the review agent (see mockAnalysisAgent doc). */
export function mockReviewAgent(): MockAgentRun {
  return {
    title: "검수 에이전트",
    summary: "과장 표현, 근거 없는 수치/인증, 모바일 가독성을 확인할 준비가 되었습니다.",
    output: {
      score: 82,
      checks: ["unsupported_claim", "exaggeration", "mobile_readability", "section_completeness"],
    },
    warnings: ["실제 검수 API 연결 전까지는 mock 검수 점수입니다."],
  };
}

export function mockBuildAgentWorkflow(
  input: GenerateDetailPageInput,
  competitorReferences: CompetitorReferenceInput[]
): AgentWorkflowDraft {
  const now = new Date().toISOString();

  return {
    competitorReferences,
    revisionEnabled: true,
    runs: [
      {
        // crypto.randomUUID() (not a hardcoded string) because these ids are
        // written to agent_runs.id, a uuid column, when the draft is persisted.
        id: crypto.randomUUID(),
        agentType: "analysis",
        status: "mocked",
        createdAt: now,
        ...mockAnalysisAgent(input, competitorReferences),
      },
      {
        id: crypto.randomUUID(),
        agentType: "planning",
        status: "mocked",
        createdAt: now,
        ...mockPlanningAgent(input),
      },
      {
        id: crypto.randomUUID(),
        agentType: "production",
        status: "mocked",
        createdAt: now,
        ...mockProductionAgentSummary(),
      },
      {
        id: crypto.randomUUID(),
        agentType: "review",
        status: "mocked",
        createdAt: now,
        ...mockReviewAgent(),
      },
    ],
  };
}

export function mockPlanRevision(
  sections: DetailSection[],
  selectedSection: DetailSection,
  request: string
): DetailSection[] {
  const normalizedRequest = request.trim() || "선택 섹션을 더 설득력 있게 다듬기";
  const requestLower = normalizedRequest.toLowerCase();
  const shouldReviseAll =
    requestLower.includes("전체") ||
    requestLower.includes("시안") ||
    requestLower.includes("톤") ||
    requestLower.includes("흐름");

  return sections.map((section) => {
    const isSelected = section.id === selectedSection.id;
    const shouldRevise = shouldReviseAll || isSelected;
    if (!shouldRevise) return section;

    const suffix = isSelected
      ? `\n\n기획자 에이전트 반영: ${normalizedRequest}`
      : `\n\n전체 흐름 보정: ${normalizedRequest}`;

    return {
      ...section,
      headline: isSelected ? [...section.headline, { text: " 더 선명하게" }] : section.headline,
      body: [...section.body, { text: suffix }],
      alternatives: [
        `요청 "${normalizedRequest}"을 반영한 대안 문구`,
        ...section.alternatives.slice(0, 2),
      ],
    };
  });
}

/** Fallback for the competitor detail-page image analysis feature
 * (docs/CLAUDE_HANDOFF.md "다음 우선 작업" #6, docs/TASKS.md §16-2). Returns a
 * plausible structural analysis without calling a vision model, so the
 * upload -> analyze -> save flow stays demoable without an API key. */
export function mockCompetitorPageAnalysis(label?: string): CompetitorPageAnalysis {
  const subject = label?.trim() || "업로드한 경쟁 상세페이지";

  return {
    summary: `${subject} 이미지를 기준으로 한 목업 구조 분석입니다. 실제 API 키 연결 전에는 대략적인 패턴만 보여줍니다.`,
    marginRatio: "섹션 간 여백은 화면 높이의 약 6~10% 수준으로 넉넉한 편",
    subjectOccupancyRatio: "각 섹션에서 상품/피사체가 화면 폭의 60~80%를 차지",
    colorPalette: ["#F5F1EA", "#2B2B2B", "#C9A46A"],
    textDensity: {
      size: "헤드라인 20~24px, 본문 14~16px 추정",
      lineHeight: "본문 줄간격 1.5~1.6배 수준으로 여유 있음",
      placement: "이미지 하단 또는 좌측 정렬 텍스트 블록 반복",
    },
    sectionBreakdown: [
      {
        order: 1,
        sectionKind: "intro",
        description: "브랜드/제품명이 강조된 도입부",
        visibleCopy: ["(mock) 브랜드명 · 제품명이 큰 글씨로 표시됨"],
      },
      {
        order: 2,
        sectionKind: "problem",
        description: "문제 제기형 후킹 문구",
        visibleCopy: ["(mock) 아직도 이렇게 쓰고 계신가요?"],
      },
      {
        order: 3,
        sectionKind: "benefit_1",
        description: "핵심 장점 이미지 + 짧은 카피",
        visibleCopy: ["(mock) 핵심 장점을 한 줄로 요약한 헤드라인"],
      },
      {
        order: 4,
        sectionKind: "detail",
        description: "제품 상세 스펙/소재 설명",
        visibleCopy: [],
      },
      {
        order: 5,
        sectionKind: "faq",
        description: "자주 묻는 질문 목록",
        visibleCopy: ["(mock) Q. 세탁은 어떻게 하나요?"],
      },
    ],
    copyStyle: {
      avgSentenceLength: "문장당 15~25자 내외의 짧은 단문 위주",
      painPointStructure: "문제 제기 -> 원인 -> 해결(제품 특징) 순서로 반복",
    },
    presenceFlags: {
      hasFaq: true,
      hasSpecTable: true,
      hasComparisonTable: false,
      hasHookSection: true,
    },
    needsVerification: [
      "실제 이미지 없이 생성한 목업 결과이므로 색상/수치는 참고용으로만 사용",
    ],
    warnings: ["API 키가 없어 mock 분석 결과를 사용했습니다."],
  };
}
