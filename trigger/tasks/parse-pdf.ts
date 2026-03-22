import { task, logger } from "@trigger.dev/sdk/v3";
import * as fs from "node:fs/promises";

interface ParsedPage {
  pageNumber: number;
  imageBase64: string;
  text: string;
}

export interface ParsePdfPayload {
  pdfPath: string;
}

export interface ParsePdfOutput {
  pages: ParsedPage[];
  totalPages: number;
}

export const parsePdfTask = task({
  id: "parse-pdf",
  retry: { maxAttempts: 2 },
  run: async (payload: ParsePdfPayload): Promise<ParsePdfOutput> => {
    logger.info("Parsing PDF", { pdfPath: payload.pdfPath });

    const pdfBuffer = await fs.readFile(payload.pdfPath);
    const pdfData = new Uint8Array(pdfBuffer);

    // Use pdfjs-dist for text extraction and page rendering
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdfDocument = await loadingTask.promise;

    logger.info("PDF loaded", { totalPages: pdfDocument.numPages });

    const pages: ParsedPage[] = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);

      // Extract text content
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");

      // Render page to image using @napi-rs/canvas
      const scale = 2.0;
      const viewport = page.getViewport({ scale });
      const { createCanvas } = await import("@napi-rs/canvas");
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (page.render as any)({
        canvasContext: context,
        viewport,
      }).promise;

      const pngBuffer = canvas.toBuffer("image/png");
      const imageBase64 = pngBuffer.toString("base64");

      pages.push({
        pageNumber: pageNum,
        imageBase64,
        text,
      });

      logger.info(`Parsed page ${pageNum}/${pdfDocument.numPages}`);
    }

    return { pages, totalPages: pdfDocument.numPages };
  },
});
