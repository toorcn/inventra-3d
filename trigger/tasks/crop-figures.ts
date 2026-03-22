import { task, logger } from "@trigger.dev/sdk/v3";
import { fal } from "@fal-ai/client";
import type { FigureInfo } from "./identify-figures";

interface PageInput {
  pageNumber: number;
  imageBase64: string;
  text: string;
}

export interface CropFiguresPayload {
  pages: PageInput[];
  figures: FigureInfo[];
}

export interface CropFiguresOutput {
  imageUrls: string[];
}

export const cropFiguresTask = task({
  id: "crop-figures",
  retry: { maxAttempts: 2 },
  run: async (payload: CropFiguresPayload): Promise<CropFiguresOutput> => {
    logger.info("Cropping figures", { count: payload.figures.length });

    const imageUrls: string[] = [];

    for (const figure of payload.figures) {
      const page = payload.pages.find((p) => p.pageNumber === figure.pageNumber);
      if (!page) {
        logger.warn("Page not found for figure", { pageNumber: figure.pageNumber });
        continue;
      }

      // Decode the page image
      const { createCanvas, loadImage } = await import("@napi-rs/canvas");
      const imgBuffer = Buffer.from(page.imageBase64, "base64");
      const image = await loadImage(imgBuffer);

      // Calculate crop coordinates from percentage-based bounding box
      const cropX = Math.floor((figure.boundingBox.x / 100) * image.width);
      const cropY = Math.floor((figure.boundingBox.y / 100) * image.height);
      const cropW = Math.floor((figure.boundingBox.width / 100) * image.width);
      const cropH = Math.floor((figure.boundingBox.height / 100) * image.height);

      // Ensure minimum dimensions
      const finalW = Math.max(cropW, 256);
      const finalH = Math.max(cropH, 256);

      const canvas = createCanvas(finalW, finalH);
      const ctx = canvas.getContext("2d");

      // Fill with white background (patent figures often have white bg)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, finalW, finalH);

      // Draw the cropped region
      ctx.drawImage(
        image,
        cropX, cropY, cropW, cropH,
        0, 0, finalW, finalH,
      );

      const pngBuffer = canvas.toBuffer("image/png");

      // Upload to fal.ai storage
      const blob = new Blob([new Uint8Array(pngBuffer)], { type: "image/png" });
      const url = await fal.storage.upload(blob);

      imageUrls.push(url);
      logger.info(`Cropped and uploaded figure: ${figure.componentName}`, { url });
    }

    return { imageUrls };
  },
});
