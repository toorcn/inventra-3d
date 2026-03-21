import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { hasOpenRouterApiKey } from "@/lib/openrouter";
import {
  createPatentWorkspaceManifest,
  type NormalizedRegion,
  type PatentAssetKind,
  type PatentExtractionResult,
  type PatentFigure,
  type PatentFigureComponent,
  type PatentFigureComponentDetection,
} from "@/lib/patent-workspace";
import { ensurePatentWorkspaceDirectories, writePatentWorkspaceManifest } from "@/lib/patent-workspace-store";

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
const VISION_MODEL = "google/gemini-2.0-flash-001";
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

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function createPatentId(sourceFilename: string, patentId?: string): string {
  const base = patentId?.trim() ? patentId : sourceFilename;
  const normalized = slugify(base);
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return normalized ? `${normalized}-${stamp}` : `patent-${stamp}`;
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

  const prompt = [
    "Analyze this patent page image for later component extraction and 3D assembly planning.",
    "Decide if this page is primarily a patent figure/diagram (not prose-heavy claims/spec text).",
    "Return isTextOnlyPage=true when the page is mostly text/prose and should not be exported as an image.",
    "If it is a figure page, extract visible figure labels (e.g., FIG. 1, FIG. 2A), a short figure description, and component evidence.",
    "Return figureRegions as normalized bounding boxes [x,y,width,height] for whole diagram areas only.",
    "Return componentRegions for distinct visible manufacturable parts or subassemblies within the figure.",
    "Only create multiple componentRegions when the image clearly shows separate parts worth preserving independently.",
    "For each component or componentRegion, provide a concise specific name, what it is, how it works in the patent, refNumber if visible, confidence 0..1, and kind.",
    "Use kind='full_product' only for the full product view, 'subassembly' for multi-part groupings, and 'component' for leaf parts.",
    "Avoid generic names like component, portion, or device unless absolutely necessary.",
    "Coordinates are 0..1 relative to the full page image.",
    "",
    "Page OCR/Text context:",
    pageText.slice(0, 2800),
  ].join("\n");

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
  }));
}

export async function extractPatentFigures(input: PatentExtractionInput): Promise<PatentExtractionResult> {
  const patentId = createPatentId(input.sourceFilename, input.patentId);
  const diskPaths = await ensurePatentWorkspaceDirectories(patentId);

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
      const pageText = await extractPageText(page);
      pagesText.push(pageText);

      const likelyCandidate = extractFigureLabels(pageText).length > 0 || pageText.split(/\s+/).length < 120;
      if (!likelyCandidate) {
        continue;
      }

      const imageBuffer = await renderPagePng(page);
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
      const figureAbsolutePath = path.join(diskPaths.rootAbsolute, filename);
      const figureImagePath = `${diskPaths.publicPaths.outputDirectory}/${filename}`;

      const cropRegion = pickBestRegion(analysis.figureRegions);
      const imageToWrite = cropRegion ? await cropImageByRegion(imageBuffer, cropRegion) : imageBuffer;
      await writeFile(figureAbsolutePath, imageToWrite);

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

        if (detectionRegion) {
          const detectionBuffer = await cropImageByRegion(imageBuffer, detectionRegion);
          imageFilename = `candidate-p${pageNumber}-${safeLabel}-${componentToken}.png`;
          const candidateAbsolutePath = path.join(diskPaths.candidateAbsoluteDirectory, imageFilename);
          await writeFile(candidateAbsolutePath, detectionBuffer);
          imagePath = `${diskPaths.publicPaths.candidateDirectory}/${imageFilename}`;
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
              cropRegion,
            );

      figures.push({
        id: `${safeLabel || `fig-p${pageNumber}`}-${pageNumber}`,
        filename,
        imagePath: figureImagePath,
        pageNumber,
        label,
        description: analysis.description.trim() || "Patent figure page",
        analysisSource,
        failureReason,
        cropRegion,
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
  await writeFile(diskPaths.textAbsolute, extractedText, "utf8");

  const manifest = createPatentWorkspaceManifest({
    patentId,
    sourceFilename: input.sourceFilename,
    totalPages: pdf.numPages,
    processedPages: pagesToProcess,
    extractedAt: new Date().toISOString(),
    extractedText,
    warnings,
    paths: diskPaths.publicPaths,
    figures,
  });

  await writePatentWorkspaceManifest(manifest);

  return {
    outputDirectory: diskPaths.publicPaths.outputDirectory,
    manifestPath: diskPaths.publicPaths.manifestPath,
    textPath: diskPaths.publicPaths.textPath,
    manifest,
  };
}

export type { PatentExtractionInput };
