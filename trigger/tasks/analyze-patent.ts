import { task, logger } from "@trigger.dev/sdk/v3";
import { structuredOutput, multimodalMessage } from "../../src/lib/openrouter";
import type { CategoryId } from "../../src/types";

interface PageInput {
  pageNumber: number;
  imageBase64: string;
  text: string;
}

export interface PatentAnalysis {
  id: string;
  title: string;
  year: number;
  inventors: string[];
  description: string;
  category: CategoryId;
  country: string;
  countryCode: string;
  patentNumber: string;
  location: { lat: number; lng: number };
}

export interface AnalyzePatentPayload {
  pages: PageInput[];
}

const VALID_CATEGORIES: CategoryId[] = [
  "technology", "biology", "energy", "materials", "computing", "transportation", "other",
];

const patentAnalysisSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    year: { type: "number" },
    inventors: { type: "array", items: { type: "string" } },
    description: { type: "string" },
    category: {
      type: "string",
      enum: VALID_CATEGORIES,
    },
    country: { type: "string" },
    countryCode: { type: "string" },
    patentNumber: { type: "string" },
    location: {
      type: "object",
      properties: {
        lat: { type: "number" },
        lng: { type: "number" },
      },
      required: ["lat", "lng"],
      additionalProperties: false,
    },
  },
  required: [
    "title", "year", "inventors", "description", "category",
    "country", "countryCode", "patentNumber", "location",
  ],
  additionalProperties: false,
};

export const analyzePatentTask = task({
  id: "analyze-patent",
  retry: { maxAttempts: 2 },
  run: async (payload: AnalyzePatentPayload): Promise<PatentAnalysis> => {
    logger.info("Analyzing patent", { pageCount: payload.pages.length });

    // Combine all text for context
    const fullText = payload.pages.map((p) => p.text).join("\n\n");

    // Send first few pages as images for visual context
    const imagesToSend = payload.pages.slice(0, 4);

    const systemPrompt = `You are a patent analysis expert. Given a patent document (text and images), extract structured metadata about the invention.

Rules:
- title: The official name of the invention
- year: The year the patent was filed or granted
- inventors: Array of inventor names
- description: A 2-3 sentence description of what the invention does and why it matters
- category: Must be one of: technology, biology, energy, materials, computing, transportation, other
- country: The country where the patent was filed
- countryCode: ISO alpha-2 country code (e.g., "US", "GB", "DE")
- patentNumber: The patent number as it appears in the document
- location: Approximate latitude/longitude of where the invention originated (inventor's location or filing office)`;

    const userMessage = multimodalMessage(
      `Analyze this patent document and extract metadata:\n\n${fullText.slice(0, 8000)}`,
      imagesToSend.map((p) => ({ base64: p.imageBase64 })),
    );

    const result = await structuredOutput<Omit<PatentAnalysis, "id">>(
      [
        { role: "system", content: systemPrompt },
        userMessage,
      ],
      patentAnalysisSchema,
      { model: "google/gemini-2.0-flash-001", max_tokens: 1000 },
    );

    // Validate
    if (!VALID_CATEGORIES.includes(result.category)) {
      result.category = "other";
    }
    if (result.year < 1700 || result.year > 2030) {
      logger.warn("Suspicious year, defaulting to 2000", { year: result.year });
      result.year = 2000;
    }

    // Generate URL-safe ID from patent number
    const id = result.patentNumber
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    logger.info("Patent analysis complete", { id, title: result.title });

    return { ...result, id };
  },
});
