import { structuredOutput } from "@/lib/openrouter";
import type { SpatialRelationship, PatentScaleHints } from "@/lib/patent-workspace";

// --- Spatial Relationship Inference ---

interface InferenceInput {
  components: Array<{ ref: string; name: string; kind: string }>;
  patentText: string;
  assemblyGraph: { heroRef: string; children: string[] } | null;
}

interface InferenceResult {
  relationships: SpatialRelationship[];
  textDimensions: Array<{ ref: string; fractionOfHero: number }>;
}

const INFERENCE_SCHEMA = {
  type: "object",
  properties: {
    relationships: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ref: { type: "string" },
          relation: { type: "string", enum: ["between", "through", "attached_to", "inside", "adjacent", "surrounds"] },
          targets: { type: "array", items: { type: "string" } },
          axis: { type: "string", enum: ["x", "y", "z"] },
          side: { type: "string", enum: ["top", "bottom", "left", "right", "front", "back"] },
          offset: { type: "number" },
        },
        required: ["ref", "relation", "targets"],
        additionalProperties: false,
      },
    },
    textDimensions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ref: { type: "string" },
          fractionOfHero: { type: "number" },
        },
        required: ["ref", "fractionOfHero"],
        additionalProperties: false,
      },
      description: "Relative size of each component as a fraction of the overall product, derived from any dimensions mentioned in the patent text. Empty if no dimensions found.",
    },
  },
  required: ["relationships", "textDimensions"],
  additionalProperties: false,
};

export async function inferSpatialRelationships(
  input: InferenceInput,
): Promise<InferenceResult> {
  const componentList = input.components
    .map(c => `- Ref ${c.ref}: "${c.name}" (${c.kind})`)
    .join("\n");

  const assemblyContext = input.assemblyGraph
    ? `Hero/root component: ref ${input.assemblyGraph.heroRef}. Child components: ${input.assemblyGraph.children.join(", ")}.`
    : "No assembly hierarchy available.";

  const messages = [
    {
      role: "user" as const,
      content: `Analyze this patent's components and determine their spatial relationships for 3D assembly.

Components:
${componentList}

Assembly hierarchy: ${assemblyContext}

Patent text excerpt:
${input.patentText.slice(0, 3000)}

For each non-hero component, determine its spatial relationship to other components (between, through, attached_to, inside, adjacent, surrounds). Also extract any dimensional information that indicates relative size (as a fraction of the overall product).`,
    },
  ];

  return structuredOutput<InferenceResult>(messages, INFERENCE_SCHEMA);
}

// --- Position Resolution ---

interface PositionInput {
  componentId: string;
  anchorRegions: Array<{
    figureId: string;
    figureLabel: string;
    pageNumber: number;
    region: { x: number; y: number; width: number; height: number };
  }>;
  heroFigureIds: string[];
  relationships: SpatialRelationship[];
  resolvedPositions: Map<string, [number, number, number]>;
  refToComponentId?: Map<string, string>;
  parentComponentId: string | null;
  componentKind: string;
}

interface PositionResult {
  tier: 1 | 2 | 3;
  position: [number, number, number];
}

const KIND_OFFSETS: Record<string, [number, number, number]> = {
  fastener: [0.15, 0.1, 0.0],
  seal: [0.0, 0.02, 0.0],
  component: [0.2, 0.0, 0.1],
  subassembly: [0.25, 0.0, 0.15],
};

export function resolveComponentPosition(input: PositionInput): PositionResult {
  // Tier 1: Anchor regions in hero figures
  const heroAnchors = input.anchorRegions.filter(
    a => input.heroFigureIds.includes(a.figureId),
  );

  if (heroAnchors.length > 0) {
    let cx = 0, cy = 0;
    for (const anchor of heroAnchors) {
      cx += anchor.region.x + anchor.region.width / 2;
      cy += anchor.region.y + anchor.region.height / 2;
    }
    cx /= heroAnchors.length;
    cy /= heroAnchors.length;

    const x = (cx - 0.5) * 2;
    const y = -(cy - 0.5) * 2;
    const z = 0;

    return { tier: 1, position: [x, y, z] };
  }

  // Tier 2: Relational inference from anchored neighbors
  const refMap = input.refToComponentId ?? new Map();
  for (const rel of input.relationships) {
    const targetPositions = rel.targets
      .map(t => {
        const cid = refMap.get(t);
        return cid ? input.resolvedPositions.get(cid) : undefined;
      })
      .filter((p): p is [number, number, number] => p !== undefined);

    if (targetPositions.length >= 2 && rel.relation === "between") {
      const mid: [number, number, number] = [0, 0, 0];
      for (const p of targetPositions) {
        mid[0] += p[0];
        mid[1] += p[1];
        mid[2] += p[2];
      }
      mid[0] /= targetPositions.length;
      mid[1] /= targetPositions.length;
      mid[2] /= targetPositions.length;

      return { tier: 2, position: mid };
    }

    if (targetPositions.length >= 1) {
      const base = targetPositions[0];
      const axisOffset = rel.axis === "x" ? 0 : rel.axis === "y" ? 1 : 2;
      const pos: [number, number, number] = [...base];
      pos[axisOffset] += rel.offset ?? 0.1;

      return { tier: 2, position: pos };
    }
  }

  // Tier 3: Hierarchy fallback
  if (input.parentComponentId) {
    const parentPos = input.resolvedPositions.get(input.parentComponentId) ?? [0, 0, 0];
    const offset = KIND_OFFSETS[input.componentKind] ?? KIND_OFFSETS.component;
    return {
      tier: 3,
      position: [
        parentPos[0] + offset[0],
        parentPos[1] + offset[1],
        parentPos[2] + offset[2],
      ],
    };
  }

  return { tier: 3, position: [0.3, 0.3, 0.3] };
}

// --- Scale Normalization ---

interface ScaleInput {
  scaleHints: PatentScaleHints | null;
  heroRelativeArea: number;
  textDimensions: { fractionOfHero: number } | null;
  componentKind: string;
}

interface ScaleResult {
  linearScale: number;
  source: "figure" | "text" | "kind_default";
}

const KIND_DEFAULT_SCALES: Record<string, number> = {
  fastener: 0.08,
  seal: 0.12,
  component: 0.25,
  subassembly: 0.4,
  full_product: 1.0,
};

export function normalizeComponentScale(input: ScaleInput): ScaleResult {
  const figureScale = input.scaleHints
    ? Math.sqrt(input.scaleHints.relativeArea / input.heroRelativeArea)
    : null;

  const textScale = input.textDimensions
    ? Math.sqrt(input.textDimensions.fractionOfHero)
    : null;

  if (figureScale !== null && textScale !== null) {
    const deviation = Math.abs(figureScale - textScale) / Math.max(figureScale, textScale);
    if (deviation > 0.5) {
      return { linearScale: textScale, source: "text" };
    }
    return { linearScale: figureScale, source: "figure" };
  }

  if (figureScale !== null) {
    return { linearScale: figureScale, source: "figure" };
  }

  if (textScale !== null) {
    return { linearScale: textScale, source: "text" };
  }

  const defaultScale = KIND_DEFAULT_SCALES[input.componentKind] ?? KIND_DEFAULT_SCALES.component;
  return { linearScale: defaultScale, source: "kind_default" };
}
