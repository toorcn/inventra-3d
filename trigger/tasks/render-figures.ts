import { task, logger } from "@trigger.dev/sdk/v3";
import { fal } from "@fal-ai/client";
import type { FigureInfo } from "./identify-figures";

export interface RenderFiguresPayload {
  /** Cropped patent figure image URLs (line drawings) */
  imageUrls: string[];
  /** Figure metadata for prompt generation */
  figures: FigureInfo[];
  /** Overall invention title for context */
  inventionTitle: string;
  /** Overall invention description */
  inventionDescription: string;
}

export interface RenderFiguresOutput {
  /** Photorealistic rendering URLs suitable for Trellis */
  renderedUrls: string[];
}

export const renderFiguresTask = task({
  id: "render-figures",
  retry: { maxAttempts: 2 },
  run: async (payload: RenderFiguresPayload): Promise<RenderFiguresOutput> => {
    logger.info("Rendering patent figures as photorealistic images", {
      count: payload.imageUrls.length,
    });

    const renderedUrls: string[] = [];

    for (let i = 0; i < payload.imageUrls.length; i++) {
      const imageUrl = payload.imageUrls[i];
      const figure = payload.figures[i];

      const prompt = buildRenderPrompt(
        figure,
        payload.inventionTitle,
        payload.inventionDescription,
      );

      logger.info(`Rendering figure ${i + 1}/${payload.imageUrls.length}: ${figure?.componentName}`, {
        prompt,
      });

      try {
        // Use Flux image-to-image to convert the patent line drawing
        // into a photorealistic product rendering
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (fal as any).subscribe("fal-ai/flux/dev/image-to-image", {
          input: {
            image_url: imageUrl,
            prompt,
            strength: 0.85, // High strength to heavily reinterpret the line drawing
            num_inference_steps: 28,
            guidance_scale: 7.5,
            image_size: "square_hd", // 1024x1024
          },
          pollInterval: 2000,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onQueueUpdate: (update: any) => {
            if (update.status === "IN_PROGRESS") {
              logger.info(`Render ${i + 1}: in progress`);
            }
          },
        });

        const data = result.data as { images?: { url?: string }[] };
        const renderedUrl = data.images?.[0]?.url;

        if (!renderedUrl) {
          logger.warn(`Render ${i + 1}: no image URL in response, falling back to original`);
          renderedUrls.push(imageUrl);
          continue;
        }

        renderedUrls.push(renderedUrl);
        logger.info(`Render ${i + 1}: success`, { renderedUrl });
      } catch (error) {
        logger.error(`Render ${i + 1}: failed, falling back to original`, {
          error: String(error),
        });
        // Fall back to the original cropped patent figure
        renderedUrls.push(imageUrl);
      }
    }

    logger.info("Figure rendering complete", { total: renderedUrls.length });
    return { renderedUrls };
  },
});

function buildRenderPrompt(
  figure: FigureInfo | undefined,
  inventionTitle: string,
  inventionDescription: string,
): string {
  const componentName = figure?.componentName ?? "component";
  const materials = figure?.materials?.join(", ") ?? "metal";
  const figureDescription = figure?.description ?? "";
  const figureColor = figure?.color ?? "#888888";

  return [
    `Photorealistic 3D product render of a ${componentName} from a ${inventionTitle}.`,
    figureDescription ? `This component: ${figureDescription}.` : "",
    inventionDescription ? `Context: ${inventionDescription.slice(0, 200)}.` : "",
    `Made of ${materials}, color approximately ${figureColor}.`,
    `Studio lighting, white background, product photography style.`,
    `Clean isolated object, no text or labels, high detail, realistic materials and textures.`,
    `The object should look like a real manufactured product, not a technical drawing.`,
  ]
    .filter(Boolean)
    .join(" ");
}
