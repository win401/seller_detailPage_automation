import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const IMAGE_MODEL_ID = "gemini-2.5-flash-image";

function parseDataUrl(dataUrl: string): { mediaType: string } | null {
  const match = /^data:([^;]+);base64,/.exec(dataUrl);
  return match ? { mediaType: match[1] } : null;
}

export type ImageAgentResult = { dataUrl: string } | { error: string };

/**
 * Gemini 2.5 Flash Image ("Nano Banana") — a multimodal model called through
 * generateText (not generateImage); results come back as result.files. When a
 * reference image is supplied it's passed as image-editing input so the real
 * uploaded product photo is preserved (docs/MVP_PLAN.md §5: keep shape/color/
 * material unchanged, only vary background/lighting/composition).
 */
export async function runImageAgent(
  prompt: string,
  referenceImageDataUrl?: string
): Promise<ImageAgentResult> {
  if (!process.env.GEMINI_API_KEY) {
    return { error: "GEMINI_API_KEY가 없어 이미지를 생성할 수 없습니다." };
  }

  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const referenceMeta = referenceImageDataUrl ? parseDataUrl(referenceImageDataUrl) : null;

    const result = await generateText({
      model: google(IMAGE_MODEL_ID),
      // Without this, Gemini defaults to text-only output for this model —
      // result.files stays empty regardless of prompt/key validity, and
      // every call falls into the "no image returned" branch below.
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
      prompt: referenceMeta
        ? [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "file",
                  data: new URL(referenceImageDataUrl!),
                  mediaType: referenceMeta.mediaType,
                },
              ],
            },
          ]
        : prompt,
    });

    const imageFile = result.files.find((file) => file.mediaType?.startsWith("image/"));
    if (!imageFile) {
      return { error: "Gemini가 이미지를 반환하지 않았습니다. 응답: " + (result.text || "(빈 응답)") };
    }

    return { dataUrl: `data:${imageFile.mediaType};base64,${imageFile.base64}` };
  } catch (error) {
    console.error("image agent failed", error);
    return { error: error instanceof Error ? error.message : "이미지 생성 중 알 수 없는 오류가 발생했습니다." };
  }
}
