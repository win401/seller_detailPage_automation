import { mockSections } from "./mock-data";
import { AiEditAction, DetailSection, GenerateDetailPageInput, GenerateDetailPageOutput } from "./types";

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
    warnings: ["AI Gateway/API 키가 없거나 호출에 실패하면 mock 초안을 사용합니다."],
  };
}
