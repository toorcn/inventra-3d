import { hasOpenRouterApiKey } from "@/lib/openrouter";
import type {
  PatentAssetKind,
  PatentBuildableStatus,
  PatentComponentRole,
  PatentEvidenceMode,
  PatentInferenceStatus,
  PatentImageVariant,
  PatentScaleHints,
} from "@/lib/patent-workspace";

export type PatentComponentReferenceImage = {
  imageBuffer: Buffer;
  mimeType?: string;
};

export type PatentComponentEnhancementInput = {
  variant: PatentImageVariant;
  canonicalName: string;
  canonicalLabel: string;
  canonicalRefNumber: string | null;
  kind: PatentAssetKind;
  componentRole: PatentComponentRole;
  buildableStatus: PatentBuildableStatus;
  evidenceMode: PatentEvidenceMode;
  inferenceStatus: PatentInferenceStatus;
  summary: string;
  functionDescription: string;
  refNumbers: string[];
  supportingFigures: string[];
  rootProductName: string;
  rootProductDescription: string;
  parentAssemblyName: string | null;
  relatedComponentNames: string[];
  assemblyChildRefNumbers: string[];
  textSnippets: string[];
  evidencePolicyNote: string;
  scaleHints?: PatentScaleHints | null;
  referenceImages: PatentComponentReferenceImage[];
};

type PatentComponentEnhancementResult = {
  imageBuffer: Buffer;
  mimeType: string;
  model: string;
};

type OpenRouterImageOutput = {
  image_url?: string;
  url?: string;
  type?: string;
};

type OpenRouterContentPart = {
  type?: string;
  text?: string;
  image_url?: {
    url?: string;
  };
};

type OpenRouterGenerateResponse = {
  choices?: Array<{
    message?: {
      images?: OpenRouterImageOutput[];
      content?: string | OpenRouterContentPart[];
    };
  }>;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_NANO_BANANA_MODEL = "google/gemini-2.5-flash-image:nitro";

function getOpenRouterApiKey(): string | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  return apiKey?.trim() ? apiKey.trim() : null;
}

function getFalApiKey(): string | null {
  const apiKey = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
  return apiKey?.trim() ? apiKey.trim() : null;
}

export function hasPatentImageEnhancementApiKey(): boolean {
  return hasOpenRouterApiKey();
}

export function hasFalApiKey(): boolean {
  return Boolean(getFalApiKey());
}

function getOpenRouterHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "InventorNet",
  };
}

function extractGeneratedImageDataUrl(payload: OpenRouterGenerateResponse): string | null {
  const message = payload.choices?.[0]?.message;
  const directImageUrl = message?.images?.find((image) => typeof image.image_url === "string" || typeof image.url === "string");
  if (directImageUrl?.image_url) {
    return directImageUrl.image_url;
  }
  if (directImageUrl?.url) {
    return directImageUrl.url;
  }

  if (Array.isArray(message?.content)) {
    const imagePart = message.content.find((part) => part?.type === "image_url" && typeof part.image_url?.url === "string");
    if (imagePart?.image_url?.url) {
      return imagePart.image_url.url;
    }
  }

  return null;
}

function decodeDataUri(dataUri: string): { buffer: Buffer; mimeType: string } {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("OpenRouter Nano Banana enhancement returned an invalid image payload.");
  }

  return {
    mimeType: match[1] ?? "image/png",
    buffer: Buffer.from(match[2] ?? "", "base64"),
  };
}

export function buildPatentComponentEnhancementPrompt(
  input: Omit<PatentComponentEnhancementInput, "referenceImages">,
): string {
  const refHint = input.refNumbers.length > 0 ? input.refNumbers.join(", ") : "none";
  const canonicalRefHint = input.canonicalRefNumber ?? "none";
  const figureHint = input.supportingFigures.length > 0 ? input.supportingFigures.slice(0, 6).join(", ") : "none";
  const relatedHint = input.relatedComponentNames.length > 0 ? input.relatedComponentNames.slice(0, 6).join(", ") : "none";
  const assemblyChildRefHint =
    input.assemblyChildRefNumbers.length > 0 ? input.assemblyChildRefNumbers.slice(0, 10).join(", ") : "none";
  const snippetHint = input.textSnippets.length > 0 ? input.textSnippets.join(" | ") : "none";
  const isHero = input.componentRole === "root_product" || input.kind === "full_product";
  const subjectInstruction =
    input.variant === "three_d_source"
      ? isHero
        ? "Create one clean 3D-source product image of the complete assembled product hero."
        : input.kind === "subassembly"
          ? "Create one clean 3D-source image of the assembled subassembly."
          : "Create one clean 3D-source image of the standalone engineered part."
      : isHero
        ? "Create a single high-fidelity, photorealistic studio render of the complete assembled product hero."
        : input.kind === "subassembly"
          ? "Create a single high-fidelity, photorealistic render of the assembled subassembly."
          : "Create a single high-fidelity, photorealistic render of the finished standalone part.";
  const framingInstruction =
    input.variant === "three_d_source"
      ? "Show the complete object fully in frame, centered, isolated, and uncropped against a plain light neutral background with a minimal soft shadow."
      : isHero
        ? "Render the full assembled object centered on a clean neutral studio background."
        : input.kind === "subassembly"
          ? "Render the complete subassembly centered on a clean neutral studio background."
          : "Render one isolated centered asset on a clean neutral studio background.";
  let inferenceInstruction: string;
  if (input.evidenceMode === "contextual_inferred" || input.inferenceStatus === "inferred") {
    inferenceInstruction =
      "No clean standalone figure exists for this part. Use nearby figures, ref-number context, and patent function text to reconstruct the most likely form. Missing details may be inferred conservatively from patent context. If inferred, keep geometry plausible and mechanically manufacturable. Do not invent decorative details or modern consumer styling.";
  } else if (input.evidenceMode === "figure_context") {
    inferenceInstruction = [
      `The reference images show FULL patent figures, not isolated crops. You must ISOLATE and EXTRACT only the component identified as reference number ${input.canonicalRefNumber} ("${input.canonicalName}") from the full patent figure.`,
      `Focus on the geometry associated with ref ${input.canonicalRefNumber}. Ignore all other components, leader lines, and annotations in the figure.`,
      `Generate a clean, isolated view showing ONLY this component against a neutral background.`,
    ].join(" ");
  } else {
    inferenceInstruction =
      "Use the direct patent evidence views as the primary grounding for geometry and silhouette.";
  }

  const scaleHint =
    input.scaleHints && input.scaleHints.relativeArea > 0
      ? `Patent scale hint: width ${Math.round(input.scaleHints.normalizedWidth * 100)}%, height ${Math.round(input.scaleHints.normalizedHeight * 100)}%, area ${Math.max(1, Math.round(input.scaleHints.relativeArea * 100))}%.`
      : "Patent scale hint: none.";

  return [
    "Use the provided patent evidence images as reference views of the same engineered part.",
    subjectInstruction,
    `Root product: ${input.rootProductName || "Unknown product"}.`,
    `Root product summary: ${input.rootProductDescription || "Patent-derived product context."}`,
    `Parent assembly: ${input.parentAssemblyName || "none"}.`,
    `Part role: ${input.componentRole}.`,
    `Evidence mode: ${input.evidenceMode}.`,
    `Inference status: ${input.inferenceStatus}.`,
    `Buildable status: ${input.buildableStatus}.`,
    `Component name: ${input.canonicalName || "Unknown component"}.`,
    `Canonical label: ${input.canonicalLabel || input.canonicalName || "Unknown component"}.`,
    `Canonical reference number: ${canonicalRefHint}.`,
    `Component type: ${input.kind}.`,
    `Visible patent reference numbers: ${refHint}.`,
    `Supporting figures: ${figureHint}.`,
    `Known mating relationships: ${relatedHint}.`,
    `Assembly child reference numbers: ${assemblyChildRefHint}.`,
    scaleHint,
    `What it is: ${input.summary || "Patent component illustration."}`,
    `How it works: ${input.functionDescription || "Functional role inferred from patent context."}`,
    `Patent text context: ${snippetHint}.`,
    `Evidence policy: ${input.evidencePolicyNote}.`,
    "Preserve the silhouette, proportions, and key mechanical features visible in the evidence.",
    "If multiple evidence images are provided, reconcile them into one consistent component design.",
    "This output should represent a finished, buildable engineered object rather than a patent sheet fragment.",
    inferenceInstruction,
    framingInstruction,
    "Do not include patent callout numbers, arrows, page borders, dimension lines, labels, or any text.",
    "Do not output an exploded view, collage, blueprint, cutaway sheet, or figure plate unless explicitly requested.",
    input.variant === "three_d_source"
      ? "Use a consistent front-facing or near-orthographic product view suitable for image-to-3D conversion. Preserve silhouette fidelity over cinematic styling."
      : "Use realistic materials and lighting while preserving mechanical silhouette and proportions.",
    "Return an image only.",
  ].join("\n");
}

function buildDataUri(referenceImage: PatentComponentReferenceImage): string {
  const mimeType = referenceImage.mimeType ?? "image/png";
  return `data:${mimeType};base64,${referenceImage.imageBuffer.toString("base64")}`;
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
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing. Add it to enable OpenRouter Nano Banana component enhancement.");
  }

  if (input.referenceImages.length === 0) {
    throw new Error("At least one reference image is required for component enhancement.");
  }

  const prompt = buildPatentComponentEnhancementPrompt(input);
  const imageContent = input.referenceImages.slice(0, 3).map((referenceImage) => ({
    type: "image_url",
    image_url: {
      url: buildDataUri(referenceImage),
    },
  }));

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: getOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model: OPENROUTER_NANO_BANANA_MODEL,
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            ...imageContent,
          ],
        },
      ],
      stream: false,
      image_config: {
        aspect_ratio: "1:1",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter Nano Banana enhancement failed (${response.status}): ${body.slice(0, 400)}`);
  }

  const payload = (await response.json()) as OpenRouterGenerateResponse;
  const generatedImageDataUrl = extractGeneratedImageDataUrl(payload);
  if (!generatedImageDataUrl) {
    throw new Error("OpenRouter Nano Banana enhancement returned no image output.");
  }

  const { buffer, mimeType } = decodeDataUri(generatedImageDataUrl);

  return {
    imageBuffer: buffer,
    mimeType,
    model: OPENROUTER_NANO_BANANA_MODEL,
  };
}
