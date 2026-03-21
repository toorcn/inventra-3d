import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  enhancePatentFigureImage,
  getImageExtensionForMimeType,
} from "@/lib/patent-image-enhancer";

export const runtime = "nodejs";

type FigureComponent = {
  refNumber: string | null;
  name: string;
};

type PatentEnhanceRequest = {
  patentId?: string;
  figureFilename?: string;
  figureLabel?: string;
  description?: string;
  components?: FigureComponent[];
};

function isSafePatentId(value: string): boolean {
  return /^[a-z0-9-]+$/i.test(value);
}

function isSafeFigureFilename(value: string): boolean {
  return (
    value === path.posix.basename(value) &&
    /^[a-z0-9][a-z0-9._-]*$/i.test(value) &&
    /\.(png|jpe?g|webp)$/i.test(value)
  );
}

function sanitizeOutputToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as PatentEnhanceRequest;
    const patentId = body.patentId?.trim();
    const figureFilename = body.figureFilename?.trim();

    if (!patentId || !isSafePatentId(patentId)) {
      return Response.json({ error: "Invalid patentId" }, { status: 400 });
    }

    if (!figureFilename || !isSafeFigureFilename(figureFilename)) {
      return Response.json({ error: "Invalid figureFilename" }, { status: 400 });
    }

    const figurePath = path.join(process.cwd(), "public", "patents", patentId, figureFilename);
    const sourceBuffer = await readFile(figurePath);
    const extension = path.extname(figureFilename).toLowerCase();
    const mimeType =
      extension === ".jpg" || extension === ".jpeg"
        ? "image/jpeg"
        : extension === ".webp"
          ? "image/webp"
          : "image/png";

    const enhanced = await enhancePatentFigureImage({
      figureLabel: body.figureLabel?.trim() || "Patent figure",
      description: body.description?.trim() || "Patent component illustration",
      components: Array.isArray(body.components)
        ? body.components
            .filter((component) => typeof component?.name === "string")
            .slice(0, 12)
            .map((component) => ({
              refNumber:
                typeof component.refNumber === "string" && component.refNumber.trim()
                  ? component.refNumber.trim()
                  : null,
              name: component.name.trim(),
            }))
            .filter((component) => component.name)
        : [],
      imageBuffer: sourceBuffer,
      mimeType,
    });

    const outputDirectoryRelative = path.posix.join("patents", patentId, "enhanced");
    const outputDirectoryAbsolute = path.join(process.cwd(), "public", outputDirectoryRelative);
    await mkdir(outputDirectoryAbsolute, { recursive: true });

    const baseName = sanitizeOutputToken(path.parse(figureFilename).name) || "figure";
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const outputFilename = `${baseName}-nano-banana-${timestamp}.${getImageExtensionForMimeType(
      enhanced.mimeType,
    )}`;
    const outputPathAbsolute = path.join(outputDirectoryAbsolute, outputFilename);
    const outputPathRelative = `/${path.posix.join(outputDirectoryRelative, outputFilename)}`;

    await writeFile(outputPathAbsolute, enhanced.imageBuffer);

    return Response.json(
      {
        outputPath: outputPathRelative,
        outputFilename,
        model: enhanced.model,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      const errorWithCode = error as Error & { code?: string };
      if (errorWithCode.code === "ENOENT") {
        return Response.json({ error: "Patent figure image not found" }, { status: 404 });
      }

      const status = error.message.includes("GEMINI_API_KEY") ? 503 : 500;
      return Response.json({ error: error.message }, { status });
    }

    return Response.json({ error: "Unknown patent enhancement error" }, { status: 500 });
  }
}
