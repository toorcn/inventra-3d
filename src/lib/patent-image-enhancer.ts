import type { PatentAssetKind } from "@/lib/patent-workspace";

export type PatentComponentReferenceImage = {
  imageBuffer: Buffer;
  mimeType?: string;
};

export type PatentComponentEnhancementInput = {
  canonicalName: string;
  kind: PatentAssetKind;
  summary: string;
  functionDescription: string;
  refNumbers: string[];
  supportingFigures: string[];
  referenceImages: PatentComponentReferenceImage[];
};

type PatentComponentEnhancementResult = {
  imageBuffer: Buffer;
  mimeType: string;
  model: string;
};

type GeminiInlineData = {
  data?: string;
  mimeType?: string;
  mime_type?: string;
};

type GeminiPart = {
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
  text?: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview";

function getGeminiApiKey(): string | null {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  return apiKey?.trim() ? apiKey.trim() : null;
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

export function buildPatentComponentEnhancementPrompt(
  input: Omit<PatentComponentEnhancementInput, "referenceImages">,
): string {
  const refHint = input.refNumbers.length > 0 ? input.refNumbers.join(", ") : "none";
  const figureHint = input.supportingFigures.length > 0 ? input.supportingFigures.slice(0, 6).join(", ") : "none";

  return [
    "Use the provided patent evidence images as reference views of the same engineered part.",
    "Create a single high-fidelity, photorealistic studio render of this component.",
    `Component name: ${input.canonicalName || "Unknown component"}.`,
    `Component type: ${input.kind}.`,
    `Visible patent reference numbers: ${refHint}.`,
    `Supporting figures: ${figureHint}.`,
    `What it is: ${input.summary || "Patent component illustration."}`,
    `How it works: ${input.functionDescription || "Functional role inferred from patent context."}`,
    "Preserve the silhouette, proportions, and key mechanical features visible in the evidence.",
    "If multiple evidence images are provided, reconcile them into one consistent component design.",
    "Render one isolated centered asset on a clean neutral studio background.",
    "Do not include patent callout numbers, arrows, page borders, dimension lines, labels, or any text.",
    "Do not output an exploded view, collage, blueprint, or cutaway sheet.",
    "Return an image only.",
  ].join("\n");
}

function extractInlineImagePart(payload: GeminiGenerateContentResponse): GeminiInlineData | null {
  for (const candidate of payload.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const inlineData = part.inlineData ?? part.inline_data;
      if (inlineData?.data) {
        return inlineData;
      }
    }
  }

  return null;
}

export function getImageExtensionForMimeType(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    default:
      return "png";
  }
}

export function isRateLimitErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("429") || normalized.includes("quota") || normalized.includes("rate limit");
}

export async function enhancePatentComponentImage(
  input: PatentComponentEnhancementInput,
): Promise<PatentComponentEnhancementResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to enable Nano Banana component enhancement.");
  }

  if (input.referenceImages.length === 0) {
    throw new Error("At least one reference image is required for component enhancement.");
  }

  const prompt = buildPatentComponentEnhancementPrompt(input);
  const parts = input.referenceImages.slice(0, 3).map((referenceImage) => ({
    inline_data: {
      mime_type: referenceImage.mimeType ?? "image/png",
      data: referenceImage.imageBuffer.toString("base64"),
    },
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              ...parts,
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini image enhancement failed (${response.status}): ${body.slice(0, 400)}`);
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const inlineImage = extractInlineImagePart(payload);
  if (!inlineImage?.data) {
    throw new Error("Gemini image enhancement returned no image output.");
  }

  return {
    imageBuffer: Buffer.from(inlineImage.data, "base64"),
    mimeType: inlineImage.mimeType ?? inlineImage.mime_type ?? "image/png",
    model: GEMINI_IMAGE_MODEL,
  };
}

