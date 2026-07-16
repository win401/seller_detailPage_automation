import { DetailSection } from "@/lib/types";
import { runImageAgent } from "./image";

const MAX_CONCURRENT = 3;

async function generateOneSectionImage(
  section: DetailSection,
  referenceImageDataUrl?: string
): Promise<DetailSection> {
  if (section.imageRole === "none") return section;

  const prompt =
    section.imagePrompt || `${section.title} 섹션, ${section.imageRole} 연출, 커머스 상세페이지용 이미지`;
  const result = await runImageAgent(prompt, referenceImageDataUrl);
  if ("error" in result) return section;

  return {
    ...section,
    imageUrl: result.dataUrl,
    imageLabel: "AI 생성 이미지",
    imageSource: "generated",
    imageGradient: undefined,
  };
}

/**
 * Best-effort: replaces each section's stock reference image with a real
 * Gemini-generated one grounded in the product info/photo, at initial draft
 * generation time. Runs with limited concurrency to stay under provider rate
 * limits. Any section that fails (quota, network, no key) just keeps its
 * existing stock image — this must never block draft generation itself.
 */
export async function generateSectionImages(
  sections: DetailSection[],
  referenceImageDataUrl?: string
): Promise<DetailSection[]> {
  if (!process.env.GEMINI_API_KEY) return sections;

  const result = [...sections];
  let cursor = 0;

  async function worker() {
    while (cursor < result.length) {
      const index = cursor++;
      result[index] = await generateOneSectionImage(result[index], referenceImageDataUrl);
    }
  }

  await Promise.all(Array.from({ length: MAX_CONCURRENT }, worker));
  return result;
}
