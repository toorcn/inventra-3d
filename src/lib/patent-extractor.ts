import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { hasOpenRouterApiKey } from "@/lib/openrouter";
import { triageCropQuality, validateCropQuality } from "@/lib/patent-crop-validator";
import { hasFalApiKey, hasPatentImageEnhancementApiKey } from "@/lib/patent-image-enhancer";
import {
  createPatentWorkspaceManifest,
  type CropValidation,
  type NormalizedRegion,
  type PatentAssetKind,
  type PatentExtractionResult,
  type PatentFigure,
  type PatentFigureComponent,
  type PatentFigureComponentDetection,
  type PatentScaleHints,
} from "@/lib/patent-workspace";
import {
  getPatentWorkspaceDiskPaths,
  readPatentWorkspaceManifestIfCompatible,
  writePatentWorkspaceBinary,
  writePatentWorkspaceManifest,
  writePatentWorkspaceText,
} from "@/lib/patent-workspace-store";

type PatentExtractionInput = {
  pdfBuffer: Buffer;
  sourceFilename: string;
  patentId?: string;
};

type VisionComponent = {
  refNumber: string | null;
  name: string;
  summary: string;
  functionDescription: string;
  kind: PatentAssetKind;
  confidence: number;
};

type VisionComponentRegion = VisionComponent & {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string | null;
};

type VisionFigureAnalysis = {
  isFigurePage: boolean;
  isTextOnlyPage: boolean;
  labels: string[];
  description: string;
  figureRegions: NormalizedRegion[];
  components: VisionComponent[];
  componentRegions: VisionComponentRegion[];
};

type VisionAnalysisResult = {
  analysis: VisionFigureAnalysis | null;
  error: string | null;
};

type PdfTextItem = {
  str?: string;
};

type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
  getTextContent: () => Promise<{ items: PdfTextItem[] }>;
};

type CanvasImage = {
  width: number;
  height: number;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type PdfJsModule = {
  getDocument: (opts: {
    data: Uint8Array;
    useWorkerFetch: boolean;
    isEvalSupported: boolean;
  }) => { promise: Promise<PdfDocument> };
};

type Canvas2DContext = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const VISION_MODEL = "google/gemini-2.5-flash-lite";
const FIGURE_LABEL_REGEX = /(?:fig(?:ure)?\.?\s*)(\d+[a-z]?)/gi;

let pdfJsModulePromise: Promise<PdfJsModule> | null = null;

async function loadPdfJsModule(): Promise<PdfJsModule> {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs") as unknown as Promise<PdfJsModule>;
  }
  return pdfJsModulePromise;
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function normalizeRegion(region: NormalizedRegion): NormalizedRegion {
  const x = clamp01(region.x);
  const y = clamp01(region.y);
  const width = clamp01(region.width);
  const height = clamp01(region.height);

  return {
    x,
    y,
    width: x + width > 1 ? clamp01(1 - x) : width,
    height: y + height > 1 ? clamp01(1 - y) : height,
    label: region.label ?? null,
    confidence: typeof region.confidence === "number" ? Math.max(0, Math.min(1, region.confidence)) : undefined,
  };
}

function expandRegion(region: NormalizedRegion, padding = 0.08): NormalizedRegion {
  const xPad = region.width * padding;
  const yPad = region.height * padding;

  return normalizeRegion({
    x: region.x - xPad,
    y: region.y - yPad,
    width: region.width + xPad * 2,
    height: region.height + yPad * 2,
    label: region.label,
    confidence: region.confidence,
  });
}

function pickBestRegion(regions: NormalizedRegion[]): NormalizedRegion | null {
  const valid = regions
    .map(normalizeRegion)
    .filter((region) => region.width > 0.05 && region.height > 0.05 && region.width * region.height > 0.03);

  if (valid.length === 0) {
    return null;
  }

  valid.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    if (Math.abs(areaA - areaB) > 0.0001) {
      return areaB - areaA;
    }
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });

  return valid[0] ?? null;
}

async function cropImageByRegion(imageBuffer: Buffer, region: NormalizedRegion): Promise<Buffer> {
  const image = (await loadImage(imageBuffer)) as unknown as CanvasImage;
  const sourceWidth = image.width;
  const sourceHeight = image.height;

  const x = Math.max(0, Math.floor(region.x * sourceWidth));
  const y = Math.max(0, Math.floor(region.y * sourceHeight));
  const width = Math.max(20, Math.floor(region.width * sourceWidth));
  const height = Math.max(20, Math.floor(region.height * sourceHeight));

  const safeWidth = Math.min(width, sourceWidth - x);
  const safeHeight = Math.min(height, sourceHeight - y);
  const canvas = createCanvas(safeWidth, safeHeight);
  const context = canvas.getContext("2d") as Canvas2DContext;

  context.drawImage(
    image as unknown as Parameters<Canvas2DContext["drawImage"]>[0],
    x,
    y,
    safeWidth,
    safeHeight,
    0,
    0,
    safeWidth,
    safeHeight,
  );

  return canvas.toBuffer("image/png");
}

function buildScaleHints(region: NormalizedRegion | null): PatentScaleHints | undefined {
  if (!region) {
    return undefined;
  }

  return {
    normalizedWidth: region.width,
    normalizedHeight: region.height,
    relativeArea: region.width * region.height,
  };
}

function isGenericCandidateName(name: string): boolean {
  return new Set(["component", "portion", "part", "member", "section", "device"]).has(name.trim().toLowerCase());
}

async function analyzeCropQuality(imageBuffer: Buffer): Promise<{ score: number; issues: string[] }> {
  const image = (await loadImage(imageBuffer)) as unknown as CanvasImage;
  const width = Math.max(1, image.width);
  const height = Math.max(1, image.height);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d") as Canvas2DContext;

  context.drawImage(image as unknown as Parameters<Canvas2DContext["drawImage"]>[0], 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height).data;

  let nonWhitePixels = 0;
  let darkPixels = 0;

  for (let index = 0; index < imageData.length; index += 4) {
    const r = imageData[index] ?? 255;
    const g = imageData[index + 1] ?? 255;
    const b = imageData[index + 2] ?? 255;
    const brightness = (r + g + b) / 3;

    if (brightness < 245) {
      nonWhitePixels += 1;
    }

    if (brightness < 210) {
      darkPixels += 1;
    }
  }

  const totalPixels = Math.max(1, width * height);
  const nonWhiteRatio = nonWhitePixels / totalPixels;
  const darkRatio = darkPixels / totalPixels;
  const aspectRatio = width / height;
  const issues: string[] = [];
  let score = 0.9;

  if (nonWhiteRatio < 0.01) {
    issues.push("blank_crop");
    score -= 0.65;
  } else if (nonWhiteRatio < 0.03) {
    score -= 0.2;
  }

  if (aspectRatio > 7 || aspectRatio < 0.14) {
    issues.push("text_heavy");
    score -= 0.35;
  }

  if (darkRatio < 0.012) {
    score -= 0.12;
  }

  if (width < 72 || height < 72) {
    issues.push("tiny_crop");
    score -= 0.18;
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    issues,
  };
}

function shouldKeepDetection(
  name: string,
  quality: { score: number; issues: string[] },
  region: NormalizedRegion | null,
): boolean {
  if (quality.issues.includes("blank_crop")) {
    return false;
  }

  if (quality.issues.includes("text_heavy") && quality.score < 0.48) {
    return false;
  }

  if (region && region.width * region.height < 0.004) {
    return false;
  }

  if (isGenericCandidateName(name) && quality.score < 0.5) {
    return false;
  }

  return true;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function createPatentId(sourceFilename: string, patentId?: string): string {
  const base = patentId?.trim() ? patentId : sourceFilename;
  const normalized = slugify(base);
  return normalized || "patent";
}

function sanitizeFileToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function extractFigureLabels(text: string): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(FIGURE_LABEL_REGEX)) {
    const label = `FIG. ${match[1].toUpperCase()}`;
    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels;
}

function getOpenRouterHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "InventorNet",
  };
}

function buildPatentFigureAnalysisPrompt(pageText: string): string {
  return [
    "Analyze this patent page image for staged patent-to-product extraction.",
    "Stage 1: infer what product or embodiment this page belongs to.",
    "Stage 2: decide whether this page is a full product view, subassembly view, component detail, auxiliary/tooling/process view, or mostly text.",
    "Return isTextOnlyPage=true when the page is mostly prose and should not be exported as an image.",
    "If it is a figure page, extract visible figure labels (e.g., FIG. 1, FIG. 2A), a short figure description, and component evidence.",
    "Return figureRegions as normalized bounding boxes [x,y,width,height] for whole diagram areas only.",
    "Return componentRegions for distinct visible manufacturable parts or subassemblies within the figure.",
    "Only create multiple componentRegions when the image clearly shows separate parts worth preserving independently.",
    "Do not overfit to sectional fragments. Prefer patent-specific part names over generic local names like left section, base, portion, or housing when a more specific identity is inferable.",
    "For each component or componentRegion, provide a concise specific name, what it is, how it works in the patent, refNumber if visible, confidence 0..1, and kind.",
    "Use kind='full_product' only for the overall product view, kind='subassembly' for multi-part groupings, and kind='component' for leaf parts.",
    "Indicate only manufacturable or build-relevant items; avoid splitting a page into arbitrary geometric fragments.",
    "Coordinates are 0..1 relative to the full page image.",
    "",
    "Page OCR/Text context:",
    pageText.slice(0, 2800),
  ].join("\n");
}

async function supplementPageTextWithVision(imageBuffer: Buffer): Promise<string | null> {
  if (!hasOpenRouterApiKey()) {
    return null;
  }

  const imageDataUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: getOpenRouterHeaders(),
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content: "You extract concise OCR-like patent context. Return plain text only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Read this patent page image and return a concise plain-text context block.",
                "Prefer visible figure labels, part names, reference numbers, captions, and a short product/assembly description.",
                "Do not explain your reasoning and do not output markdown.",
                "Keep it under 700 characters.",
              ].join("\n"),
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() || null;
}

async function analyzeFigureWithVision(imageBuffer: Buffer, pageText: string): Promise<VisionAnalysisResult> {
  if (!hasOpenRouterApiKey()) {
    return {
      analysis: null,
      error: "OPENROUTER_API_KEY is missing",
    };
  }

  const imageDataUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;
  const schema = {
    type: "object",
    properties: {
      isFigurePage: { type: "boolean" },
      isTextOnlyPage: { type: "boolean" },
      labels: {
        type: "array",
        items: { type: "string" },
      },
      description: { type: "string" },
      figureRegions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            width: { type: "number" },
            height: { type: "number" },
            label: { type: ["string", "null"] },
            confidence: { type: "number" },
          },
          required: ["x", "y", "width", "height", "label", "confidence"],
          additionalProperties: false,
        },
      },
      components: {
        type: "array",
        items: {
          type: "object",
          properties: {
            refNumber: { type: ["string", "null"] },
            name: { type: "string" },
            summary: { type: "string" },
            functionDescription: { type: "string" },
            kind: { type: "string", enum: ["full_product", "subassembly", "component"] },
            confidence: { type: "number" },
          },
          required: ["refNumber", "name", "summary", "functionDescription", "kind", "confidence"],
          additionalProperties: false,
        },
      },
      componentRegions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            width: { type: "number" },
            height: { type: "number" },
            label: { type: ["string", "null"] },
            refNumber: { type: ["string", "null"] },
            name: { type: "string" },
            summary: { type: "string" },
            functionDescription: { type: "string" },
            kind: { type: "string", enum: ["full_product", "subassembly", "component"] },
            confidence: { type: "number" },
          },
          required: [
            "x",
            "y",
            "width",
            "height",
            "label",
            "refNumber",
            "name",
            "summary",
            "functionDescription",
            "kind",
            "confidence",
          ],
          additionalProperties: false,
        },
      },
    },
    required: [
      "isFigurePage",
      "isTextOnlyPage",
      "labels",
      "description",
      "figureRegions",
      "components",
      "componentRegions",
    ],
    additionalProperties: false,
  };

  const prompt = buildPatentFigureAnalysisPrompt(pageText);

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: getOpenRouterHeaders(),
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0,
      max_tokens: 1400,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "patent_component_analysis",
          strict: true,
          schema,
        },
      },
      messages: [
        {
          role: "system",
          content: "You are a patent diagram analyst. Return strict JSON matching the provided schema.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      analysis: null,
      error: `Vision API call failed (${response.status}): ${body.slice(0, 300)}`,
    };
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return {
      analysis: null,
      error: "Vision API returned empty content",
    };
  }

  try {
    return {
      analysis: JSON.parse(content) as VisionFigureAnalysis,
      error: null,
    };
  } catch {
    return {
      analysis: null,
      error: "Vision API returned invalid JSON",
    };
  }
}

function fallbackHeuristic(pageText: string): VisionFigureAnalysis {
  const labels = extractFigureLabels(pageText);
  const isFigurePage = labels.length > 0;
  const words = pageText.split(/\s+/).filter(Boolean);
  const snippet = words.slice(0, 32).join(" ");
  const fallbackName = labels[0] ? `${labels[0]} component` : "patent component";

  return {
    isFigurePage,
    isTextOnlyPage: !isFigurePage,
    labels,
    description: isFigurePage
      ? "Patent figure page detected via FIG labels."
      : "Not identified as a figure page by fallback heuristic.",
    figureRegions: [],
    components: isFigurePage
      ? [
        {
          refNumber: null,
          name: fallbackName,
          summary: snippet || "Patent component inferred from figure context.",
          functionDescription: "Functional role inferred from nearby patent text.",
          kind: "subassembly",
          confidence: 0.35,
        },
      ]
      : [],
    componentRegions: [],
  };
}

function dedupeFigureComponents(components: VisionComponent[]): PatentFigureComponent[] {
  const seen = new Set<string>();
  const result: PatentFigureComponent[] = [];

  for (const component of components) {
    const name = component.name.trim();
    if (!name) {
      continue;
    }
    const key = `${component.refNumber ?? "none"}-${name.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      refNumber: component.refNumber?.trim() || null,
      name,
    });
  }

  return result.slice(0, 25);
}

async function renderPagePng(page: PdfPage, scale = 1.8): Promise<Buffer> {
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    canvas: canvas as unknown as HTMLCanvasElement,
    viewport,
  }).promise;

  return canvas.toBuffer("image/png");
}

async function extractPageText(page: PdfPage): Promise<string> {
  const textContent = await page.getTextContent();
  return textContent.items
    .map((item) => {
      if ("str" in item) {
        return item.str;
      }
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFallbackRegions(
  figureId: string,
  figureLabel: string,
  figureFilename: string,
  figureImagePath: string,
  components: VisionComponent[],
  figureCropRegion: NormalizedRegion | null,
  figureQuality: { score: number; issues: string[] },
): PatentFigureComponentDetection[] {
  return components.slice(0, 8).map((component, index) => ({
    id: `${figureId}-component-${index + 1}`,
    name: component.name.trim() || `Component ${index + 1}`,
    refNumber: component.refNumber?.trim() || null,
    summary: component.summary.trim() || `Component inferred from ${figureLabel}.`,
    functionDescription: component.functionDescription.trim() || "Functional role inferred from patent context.",
    kind: component.kind,
    confidence: component.confidence,
    region: figureCropRegion,
    imageFilename: figureFilename,
    imagePath: figureImagePath,
    sourceFigureId: figureId,
    qualityScore: figureQuality.score,
    qualityIssues: figureQuality.issues,
    scaleHints: buildScaleHints(figureCropRegion),
  }));
}

export async function extractPatentFigures(input: PatentExtractionInput): Promise<PatentExtractionResult> {
  const patentId = createPatentId(input.sourceFilename, input.patentId);
  const cachedManifest = await readPatentWorkspaceManifestIfCompatible(patentId);
  if (cachedManifest) {
    return {
      outputDirectory: cachedManifest.paths.outputDirectory,
      manifestPath: cachedManifest.paths.manifestPath,
      textPath: cachedManifest.paths.textPath,
      manifest: cachedManifest,
    };
  }

  const diskPaths = getPatentWorkspaceDiskPaths(patentId);

  const pdfjsLib = await loadPdfJsModule();
  const documentTask = pdfjsLib.getDocument({
    data: new Uint8Array(input.pdfBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdf = await documentTask.promise;
  const parsedLimit = Number.parseInt(process.env.PATENT_EXTRACT_MAX_PAGES ?? "60", 10);
  const maxPages = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 60;
  const pagesToProcess = Math.min(pdf.numPages, maxPages);
  const pagesText: string[] = [];
  const figures: PatentFigure[] = [];
  const warnings: string[] = [];

  if (pdf.numPages > maxPages) {
    warnings.push(
      `PDF has ${pdf.numPages} pages. Processed first ${maxPages} pages due to PATENT_EXTRACT_MAX_PAGES limit.`,
    );
  }

  if (!hasOpenRouterApiKey()) {
    warnings.push("OPENROUTER_API_KEY is missing. Figure analysis used heuristic fallback.");
  }

  for (let pageNumber = 1; pageNumber <= pagesToProcess; pageNumber += 1) {
    try {
      const page = await pdf.getPage(pageNumber);
      const imageBuffer = await renderPagePng(page);
      const extractedPageText = await extractPageText(page);
      const pageText =
        extractedPageText.trim() || (await supplementPageTextWithVision(imageBuffer)) || extractedPageText;
      pagesText.push(pageText);

      const likelyCandidate = extractFigureLabels(pageText).length > 0 || pageText.split(/\s+/).length < 120;
      if (!likelyCandidate) {
        continue;
      }

      const visionResult = await analyzeFigureWithVision(imageBuffer, pageText);
      const analysis = visionResult.analysis ?? fallbackHeuristic(pageText);
      const analysisSource: "vision" | "heuristic" = visionResult.analysis ? "vision" : "heuristic";
      const failureReason = analysisSource === "heuristic" ? visionResult.error : null;

      if (!analysis.isFigurePage || analysis.isTextOnlyPage) {
        if (analysis.isTextOnlyPage && analysisSource === "vision") {
          warnings.push(`Skipped text-only page ${pageNumber} based on vision analysis.`);
        }
        continue;
      }

      const label = analysis.labels[0] ?? extractFigureLabels(pageText)[0] ?? `FIG. P${pageNumber}`;
      const safeLabel = sanitizeFileToken(label.replace(/^fig\.?\s*/i, "fig-"));
      const filename = `page-${pageNumber}-${safeLabel || `fig-p${pageNumber}`}.png`;
      const figureRelativePath = path.posix.join(diskPaths.rootRelative, filename);

      const cropRegion = pickBestRegion(analysis.figureRegions);
      const expandedFigureRegion = cropRegion ? expandRegion(cropRegion, 0.04) : null;
      const imageToWrite = expandedFigureRegion ? await cropImageByRegion(imageBuffer, expandedFigureRegion) : imageBuffer;
      const figureImagePath = await writePatentWorkspaceBinary(figureRelativePath, imageToWrite, {
        contentType: "image/png",
      });
      const figureQuality = await analyzeCropQuality(imageToWrite);

      const detectionInputs =
        analysis.componentRegions.length > 0
          ? analysis.componentRegions.map((region) => ({
            ...region,
            region: normalizeRegion(region),
          }))
          : analysis.components.map((component) => ({
            ...component,
            label: null,
            x: cropRegion?.x ?? 0,
            y: cropRegion?.y ?? 0,
            width: cropRegion?.width ?? 1,
            height: cropRegion?.height ?? 1,
            region: cropRegion,
          }));

      const componentDetections: PatentFigureComponentDetection[] = [];

      for (let index = 0; index < detectionInputs.length; index += 1) {
        const detection = detectionInputs[index];
        const detectionRegion = detection.region;
        const componentToken = sanitizeFileToken(
          `${detection.refNumber ?? detection.name}-${index + 1}`,
        ) || `component-${index + 1}`;

        let imageFilename = filename;
        let imagePath = figureImagePath;

        let quality = figureQuality;
        let cropValidation: CropValidation | undefined;
        if (detectionRegion) {
          const paddedRegion = expandRegion(detectionRegion, 0.1);
          const detectionBuffer = await cropImageByRegion(imageBuffer, paddedRegion);
          quality = await analyzeCropQuality(detectionBuffer);

          const routeDecision = triageCropQuality(quality.score, quality.issues);
          if (routeDecision === "skip") {
            continue;
          }
          if (!shouldKeepDetection(detection.name, quality, paddedRegion)) {
            continue;
          }

          if (routeDecision === "validate") {
            try {
              const imageBase64 = `data:image/png;base64,${detectionBuffer.toString("base64")}`;
              cropValidation = await validateCropQuality({
                imageBase64,
                refNumber: detection.refNumber ?? "unknown",
                componentName: detection.name,
                componentKind: detection.kind,
              });
            } catch {
              // AI validation failed — treat as borderline pass
              cropValidation = undefined;
            }
          }

          imageFilename = `candidate-p${pageNumber}-${safeLabel}-${componentToken}.png`;
          imagePath = await writePatentWorkspaceBinary(
            path.posix.join(diskPaths.candidateDirectoryRelative, imageFilename),
            detectionBuffer,
            {
              contentType: "image/png",
            },
          );
        }

        componentDetections.push({
          id: `${safeLabel || `fig-p${pageNumber}`}-detection-${index + 1}`,
          name: detection.name.trim() || `Component ${index + 1}`,
          refNumber: detection.refNumber?.trim() || null,
          summary: detection.summary.trim() || `Patent component from ${label}.`,
          functionDescription:
            detection.functionDescription.trim() || "Functional role inferred from patent figure context.",
          kind: detection.kind,
          confidence: typeof detection.confidence === "number" ? Math.max(0, Math.min(1, detection.confidence)) : 0.5,
          region: detectionRegion,
          imageFilename,
          imagePath,
          sourceFigureId: `${safeLabel || `fig-p${pageNumber}`}-${pageNumber}`,
          qualityScore: quality.score,
          qualityIssues: quality.issues,
          cropValidation,
          scaleHints: buildScaleHints(detectionRegion),
        });
      }

      const fallbackDetections =
        componentDetections.length > 0
          ? componentDetections
          : buildFallbackRegions(
            `${safeLabel || `fig-p${pageNumber}`}-${pageNumber}`,
            label,
            filename,
            figureImagePath,
            analysis.components,
            expandedFigureRegion,
            figureQuality,
          );

      figures.push({
        id: `${safeLabel || `fig-p${pageNumber}`}-${pageNumber}`,
        filename,
        imagePath: figureImagePath,
        pageNumber,
        label,
        description: analysis.description.trim() || "Patent figure page",
        role: "irrelevant",
        relationToRootProduct: "Awaiting patent-level product planning.",
        assemblyHint: null,
        analysisSource,
        failureReason,
        cropRegion: expandedFigureRegion,
        components: dedupeFigureComponents(analysis.components),
        componentDetections: fallbackDetections,
        pageTextSnippet: pageText.slice(0, 500),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      warnings.push(`Failed to process page ${pageNumber}: ${message}`);
    }
  }

  const extractedText = pagesText.join("\n\n").trim();
  const textPath = await writePatentWorkspaceText(patentId, extractedText);

  const manifest = await writePatentWorkspaceManifest(
    createPatentWorkspaceManifest({
      patentId,
      sourceFilename: input.sourceFilename,
      totalPages: pdf.numPages,
      processedPages: pagesToProcess,
      extractedAt: new Date().toISOString(),
      extractedText,
      warnings,
      capabilities: {
        imageGeneration: hasPatentImageEnhancementApiKey(),
        threeDGeneration: hasFalApiKey(),
      },
      paths: {
        ...diskPaths.publicPaths,
        textPath,
      },
      figures,
    }),
  );

  return {
    outputDirectory: manifest.paths.outputDirectory,
    manifestPath: manifest.paths.manifestPath,
    textPath: manifest.paths.textPath,
    manifest,
  };
}

export type { PatentExtractionInput };
