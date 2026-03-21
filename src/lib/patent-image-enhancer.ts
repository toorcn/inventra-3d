type FigureComponent = {
  refNumber: string | null;
  name: string;
};

type PatentFigureEnhancementInput = {
  figureLabel: string;
  description: string;
  components: FigureComponent[];
  imageBuffer: Buffer;
  mimeType?: string;
};

type PatentFigureEnhancementResult = {
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

export function buildPatentFigureEnhancementPrompt(input: Omit<PatentFigureEnhancementInput, "imageBuffer" | "mimeType">): string {
  const componentHints = input.components
    .slice(0, 8)
    .map((component) => {
      const name = component.name.trim();
      if (!name) {
        return null;
      }
      return component.refNumber ? `${component.refNumber} ${name}` : name;
    })
    .filter((value): value is string => Boolean(value))
    .join(", ");

  return [
    "Use the provided patent figure as the reference image.",
    "Create a single high-fidelity, photorealistic product-style render of the main engineered component shown in the figure.",
    `Target figure label: ${input.figureLabel || "Unknown figure"}.`,
    `Figure description: ${input.description || "Patent component illustration."}`,
    componentHints ? `Visible component hints: ${componentHints}.` : null,
    "Preserve the reference image's overall silhouette, orientation, proportions, and major mechanical sub-parts.",
    "Convert sketch or line-art cues into realistic materials, depth, lighting, surface detail, and shadows.",
    "Focus on one clean hero render of the primary component on a neutral studio background.",
    "Do not include patent callout numbers, arrows, labels, measurement marks, page borders, multi-panel layouts, or any text.",
    "Do not output a blueprint, exploded diagram, or illustration.",
    "Return an image only.",
  ]
    .filter(Boolean)
    .join("\n");
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

export async function enhancePatentFigureImage(
  input: PatentFigureEnhancementInput,
): Promise<PatentFigureEnhancementResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to enable Nano Banana figure enhancement.");
  }

  const prompt = buildPatentFigureEnhancementPrompt(input);
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
              {
                inline_data: {
                  mime_type: input.mimeType ?? "image/png",
                  data: input.imageBuffer.toString("base64"),
                },
              },
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

