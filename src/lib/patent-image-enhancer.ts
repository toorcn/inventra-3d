import type {
  PatentAssetKind,
  PatentBuildableStatus,
  PatentComponentRole,
  PatentEvidenceMode,
  PatentInferenceStatus,
} from "@/lib/patent-workspace";

export type PatentComponentReferenceImage = {
  imageBuffer: Buffer;
  mimeType?: string;
};

export type PatentComponentEnhancementInput = {
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
  referenceImages: PatentComponentReferenceImage[];
};

type PatentComponentEnhancementResult = {
  imageBuffer: Buffer;
  mimeType: string;
  model: string;
};

type FalImageOutput = {
  url?: string;
  content_type?: string;
  file_name?: string;
};

type FalGenerateResponse = {
  images?: FalImageOutput[];
};

const FAL_NANO_BANANA_PRO_MODEL = "fal-ai/nano-banana-pro/edit";

function getFalApiKey(): string | null {
  const apiKey = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
  return apiKey?.trim() ? apiKey.trim() : null;
}

export function hasFalApiKey(): boolean {
  return Boolean(getFalApiKey());
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
  const subjectInstruction =
    input.componentRole === "root_product" || input.kind === "full_product"
      ? "Create a single high-fidelity, photorealistic studio render of the complete assembled product hero."
      : input.kind === "subassembly"
        ? "Create a single high-fidelity, photorealistic render of the assembled subassembly."
        : "Create a single high-fidelity, photorealistic render of the finished standalone part.";
  const framingInstruction =
    input.componentRole === "root_product" || input.kind === "full_product"
      ? "Render the full assembled object centered on a clean neutral studio background."
      : input.kind === "subassembly"
        ? "Render the complete subassembly centered on a clean neutral studio background."
        : "Render one isolated centered asset on a clean neutral studio background.";
  const inferenceInstruction =
    input.evidenceMode === "contextual_inferred" || input.inferenceStatus === "inferred"
      ? "No clean standalone figure exists for this part. Use nearby figures, ref-number context, and patent function text to reconstruct the most likely form. Missing details may be inferred conservatively from patent context. If inferred, keep geometry plausible and mechanically manufacturable. Do not invent decorative details or modern consumer styling."
      : input.evidenceMode === "figure_context"
        ? "Dedicated standalone crops are limited. Use the broader figure context to preserve correct proportions and mating surfaces."
        : "Use the direct patent evidence views as the primary grounding for geometry and silhouette.";

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
  const apiKey = getFalApiKey();
  if (!apiKey) {
    throw new Error("FAL_KEY is missing. Add it to enable fal.ai Nano Banana Pro component enhancement.");
  }

  if (input.referenceImages.length === 0) {
    throw new Error("At least one reference image is required for component enhancement.");
  }

  const prompt = buildPatentComponentEnhancementPrompt(input);
  const imageUrls = input.referenceImages.slice(0, 3).map(buildDataUri);

  const response = await fetch(`https://fal.run/${FAL_NANO_BANANA_PRO_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_urls: imageUrls,
      num_images: 1,
      aspect_ratio: "auto",
      output_format: "png",
      resolution: "1K",
      limit_generations: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`fal.ai Nano Banana Pro enhancement failed (${response.status}): ${body.slice(0, 400)}`);
  }

  const payload = (await response.json()) as FalGenerateResponse;
  const generatedImage = payload.images?.[0];
  if (!generatedImage?.url) {
    throw new Error("fal.ai Nano Banana Pro enhancement returned no image output.");
  }

  const imageResponse = await fetch(generatedImage.url);
  if (!imageResponse.ok) {
    throw new Error(`fal.ai generated image download failed (${imageResponse.status}).`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();

  return {
    imageBuffer: Buffer.from(arrayBuffer),
    mimeType: generatedImage.content_type ?? imageResponse.headers.get("content-type") ?? "image/png",
    model: FAL_NANO_BANANA_PRO_MODEL,
  };
}
