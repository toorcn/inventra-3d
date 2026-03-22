import { extractPatentFigures } from "@/lib/patent-extractor";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const patentIdField = formData.get("patentId");

    if (!(file instanceof File)) {
      return Response.json({ error: "Missing file field in multipart form-data" }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json({ error: "Uploaded file must be a PDF" }, { status: 400 });
    }

    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      return Response.json(
        { error: "PDF exceeds max size of 50MB for this POC endpoint" },
        { status: 413 },
      );
    }

    const patentId = typeof patentIdField === "string" ? patentIdField.trim() : undefined;
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractPatentFigures({
      pdfBuffer: buffer,
      sourceFilename: file.name,
      patentId,
    });

    return Response.json(
      result.manifest,
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown patent extraction error";
    return Response.json({ error: message }, { status: 500 });
  }
}
