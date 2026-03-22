import { task, logger } from "@trigger.dev/sdk/v3";
import { structuredOutput, multimodalMessage } from "../../src/lib/openrouter";

interface PageInput {
  pageNumber: number;
  imageBase64: string;
  text: string;
}

export interface FigureInfo {
  pageNumber: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  componentName: string;
  description: string;
  materials: string[];
  color: string;
  patentText: string | null;
  spatialHint: "top" | "bottom" | "left" | "right" | "center" | "front" | "back";
}

export interface FigureAnalysis {
  figures: FigureInfo[];
}

export interface IdentifyFiguresPayload {
  pages: PageInput[];
}

const figureAnalysisSchema = {
  type: "object",
  properties: {
    figures: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pageNumber: { type: "number" },
          boundingBox: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
            },
            required: ["x", "y", "width", "height"],
            additionalProperties: false,
          },
          componentName: { type: "string" },
          description: { type: "string" },
          materials: { type: "array", items: { type: "string" } },
          color: { type: "string" },
          patentText: { type: ["string", "null"] },
          spatialHint: {
            type: "string",
            enum: ["top", "bottom", "left", "right", "center", "front", "back"],
          },
        },
        required: [
          "pageNumber", "boundingBox", "componentName", "description",
          "materials", "color", "patentText", "spatialHint",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["figures"],
  additionalProperties: false,
};

export const identifyFiguresTask = task({
  id: "identify-figures",
  retry: { maxAttempts: 2 },
  run: async (payload: IdentifyFiguresPayload): Promise<FigureAnalysis> => {
    logger.info("Identifying 3D-convertible figures", { pageCount: payload.pages.length });

    const imagesToSend = payload.pages.slice(0, 8);

    const systemPrompt = `You are a patent figure analysis expert. Your job is to identify the key PHYSICAL SUBASSEMBLIES of the invention described in this patent, so they can be converted to 3D models.

IMPORTANT DISTINCTION: You are NOT identifying individual figures to crop. Instead, you are identifying the key PHYSICAL PARTS/SUBASSEMBLIES of the invention. Each subassembly will be rendered as a separate 3D component.

Based on the patent text and figures, identify the main physical subassemblies. For example, a ballpoint pen might have: "Pen Body/Barrel", "Ink Cartridge", "Pen Tip Assembly", "Writing Ball", "Cap".

For each subassembly:
- pageNumber: which page has the best drawing showing this part (1-indexed). If no clear drawing exists, use the page with the overall assembly view.
- boundingBox: approximate position of this part in the figure as percentages (0-100) of page dimensions {x, y, width, height}. If imagined (not explicitly drawn), use the overall figure bounds.
- componentName: human-readable name (e.g., "Pen Barrel", "Writing Ball", "Ink Cartridge")
- description: what this component IS and what it LOOKS LIKE physically (shape, form factor). This will be used to generate a 3D rendering.
- materials: likely materials (e.g., "stainless steel", "plastic", "ceramic")
- color: realistic hex color for this component (e.g., silver metal = "#C0C0C0", black plastic = "#1a1a1a")
- patentText: relevant text from the patent describing this component, or null
- spatialHint: where this component sits relative to the overall assembly

STRICTLY EXCLUDE:
- Graphs, charts, plots (e.g., "flow vs distance" plots)
- Microscope/SEM images
- Tables or data figures
- Circuit diagrams, flowcharts, block diagrams
- Any non-physical/abstract figures

IMPORTANT GUIDELINES:
- Return at most 6 subassemblies. Focus on the most visually distinctive and important parts.
- PREFER to imagine realistic subassemblies based on patent description rather than cropping poor-quality line drawings.
- Describe each part's PHYSICAL APPEARANCE (shape, form, texture) in the description field — this will be used to generate a photorealistic 3D rendering.
- Use REALISTIC colors (metals are silver/grey, not bright colors).`;

    const userMessage = multimodalMessage(
      "Identify 3D-convertible figures and subassemblies in this patent:",
      imagesToSend.map((p) => ({ base64: p.imageBase64 })),
    );

    const result = await structuredOutput<FigureAnalysis>(
      [
        { role: "system", content: systemPrompt },
        userMessage,
      ],
      figureAnalysisSchema,
      { model: "google/gemini-2.0-flash-001", max_tokens: 2000 },
    );

    // Cap at 6 figures
    if (result.figures.length > 6) {
      result.figures = result.figures.slice(0, 6);
    }

    logger.info("Figure identification complete", { figureCount: result.figures.length });
    return result;
  },
});
