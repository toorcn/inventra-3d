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

    const systemPrompt = `You are a patent figure analysis expert specializing in identifying 3D-representable objects in patent documents.

Analyze the patent figures and identify which ones show objects that can be converted to 3D models. Look for:
- Exploded views showing subassemblies
- Perspective drawings of physical components
- Cross-section views of mechanical parts

Do NOT include:
- Flowcharts, circuit diagrams, or graphs
- Pure text or table figures
- Block diagrams or software architecture

For each suitable figure, provide:
- pageNumber: which page it's on (1-indexed)
- boundingBox: approximate position as percentages (0-100) of page dimensions {x, y, width, height}
- componentName: human-readable name (e.g., "Housing", "Rotor", "Circuit Board")
- description: brief description of the component's function
- materials: likely materials used
- color: hex color that represents this component visually
- patentText: relevant text from the patent describing this component, or null
- spatialHint: where this component sits relative to the overall assembly ("top", "bottom", "left", "right", "center", "front", "back")

IMPORTANT: Return at most 6 figures. Prioritize the most important/distinctive subassemblies.
If the patent shows a single object from multiple angles, identify the distinct subassemblies rather than different views.
You may also IMAGINE subassemblies that should exist based on the patent description even if they aren't explicitly shown in figures.`;

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
