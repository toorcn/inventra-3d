import { structuredOutput } from "@/lib/openrouter";
import type { CropValidation } from "@/lib/patent-workspace";

export type CropRouteDecision = "pass" | "validate" | "skip";

/**
 * Fast pre-filter using existing heuristic score.
 * Determines whether a crop needs AI validation or can be routed immediately.
 */
export function triageCropQuality(
  heuristicScore: number,
  heuristicIssues: string[],
): CropRouteDecision {
  if (heuristicScore < 0.3 || heuristicIssues.includes("blank_crop")) {
    return "skip";
  }
  if (heuristicScore > 0.7) {
    return "pass";
  }
  return "validate";
}

interface ValidateCropInput {
  imageBase64: string;
  refNumber: string;
  componentName: string;
  componentKind: string;
}

const CROP_VALIDATION_SCHEMA = {
  type: "object",
  properties: {
    hasGeometry: {
      type: "boolean",
      description:
        "Whether the crop contains recognizable component geometry (not just a reference number label, leader line, or whitespace)",
    },
    coverageFraction: {
      type: "number",
      description:
        "Fraction of the crop area occupied by actual component geometry, from 0.0 to 1.0",
    },
    issues: {
      type: "array",
      items: { type: "string" },
      description:
        'List of issues found. Possible values: "label_only", "partial_cutoff", "mostly_whitespace", "text_heavy", "leader_line_only"',
    },
  },
  required: ["hasGeometry", "coverageFraction", "issues"],
  additionalProperties: false,
};

/**
 * AI-powered crop quality validation using Gemini Flash vision.
 * Called only for borderline crops (heuristic score 0.3-0.7).
 *
 * Note: OpenRouterMessage.content is string-only. We embed the base64 image
 * inline in the text prompt. Gemini Flash can parse data URIs in text content
 * for structured output. If this proves insufficient, extend OpenRouterMessage
 * to support multimodal content arrays as a separate task.
 */
export async function validateCropQuality(
  input: ValidateCropInput,
): Promise<CropValidation> {
  const messages = [
    {
      role: "user" as const,
      content: `Analyze this cropped region from a patent figure. The image is provided as a data URI: ${input.imageBase64}

This crop should show reference number ${input.refNumber} ("${input.componentName}", a ${input.componentKind}).

Determine:
1. Does this crop contain actual component GEOMETRY (the physical shape of the part), or is it just a reference number label, leader line, or mostly empty space?
2. What fraction (0.0-1.0) of the crop area contains actual component geometry?
3. List any issues: "label_only" (just a number/text), "partial_cutoff" (component extends beyond crop edge), "mostly_whitespace", "text_heavy", "leader_line_only"`,
    },
  ];

  return structuredOutput<CropValidation>(messages, CROP_VALIDATION_SCHEMA);
}
