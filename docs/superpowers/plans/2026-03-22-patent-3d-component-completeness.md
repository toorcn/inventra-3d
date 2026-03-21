# Patent 3D Component Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every meaningful structural/functional patent component gets a quality-validated image and a correctly positioned 3D representation in the viewer, with an interactive legend panel for discovery.

**Architecture:** Hybrid quality-gated routing — existing heuristic crop analysis acts as a fast pre-filter, borderline crops get AI vision validation, failed crops route through a full-figure extraction path. A new assembly inference engine resolves 3D positions for all components (anchored or not) using a 3-tier strategy. The viewer gains an interactive legend panel with bidirectional highlighting.

**Tech Stack:** Next.js App Router, React Three Fiber, drei, @react-spring/three, OpenRouter (Gemini Flash structured output), Fal.ai (Nano Banana Pro, Trellis 2), vitest

**Spec:** `docs/superpowers/specs/2026-03-22-patent-3d-component-completeness-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| NEW | `src/lib/patent-crop-validator.ts` | AI quality gate — `validateCropQuality()` using Gemini Flash structured output |
| NEW | `src/lib/__tests__/patent-crop-validator.test.ts` | Unit tests for crop validator routing logic |
| NEW | `src/lib/patent-assembly-inference.ts` | Spatial relationship graph, 3-tier position resolver, scale normalizer |
| NEW | `src/lib/__tests__/patent-assembly-inference.test.ts` | Unit tests for all 3 tiers + scale cross-validation |
| MODIFY | `src/lib/patent-workspace.ts` | Add `CropValidation` to evidence, `placementTier` to assembly contract, `SpatialRelationship` type |
| MODIFY | `src/lib/patent-extractor.ts` | Integrate quality gate into crop pipeline |
| MODIFY | `src/lib/patent-image-enhancer.ts` | Full-figure extraction prompt variant |
| MODIFY | `src/lib/patent-component-image-generator.ts` | Route based on `evidenceMode` for full-figure path |
| MODIFY | `src/lib/patent-three-d.ts` | Use assembly inference engine for contract building |
| MODIFY | `src/components/patent/PatentThreeDViewer.tsx` | Legend panel, raycasting, bidirectional highlighting, placeholders |
| MODIFY | `src/app/api/patent/three-d/generate/route.ts` | Assembly inference integration |
| MODIFY | `src/app/patent-extract/page.tsx` | Quality gate visibility in workflow UI |

---

### Task 1: Add Types to patent-workspace.ts

**Files:**
- Modify: `src/lib/patent-workspace.ts` (types section, lines ~90-175)

- [ ] **Step 1: Add `CropValidation` interface after `PatentComponentEvidence` type (~line 105)**

```typescript
export interface CropValidation {
  hasGeometry: boolean;
  coverageFraction: number; // 0-1 normalized
  issues: string[];         // e.g., ["label_only", "partial_cutoff", "mostly_whitespace"]
}
```

- [ ] **Step 2: Add `cropValidation` field to `PatentComponentEvidence` type**

Add `cropValidation?: CropValidation;` as an optional field on the `PatentComponentEvidence` interface (after the existing `qualityScore` / `qualityIssues` fields).

- [ ] **Step 3: Add `SpatialRelationship` interface after `CropValidation`**

```typescript
export interface SpatialRelationship {
  ref: string;
  relation: 'between' | 'through' | 'attached_to' | 'inside' | 'adjacent' | 'surrounds';
  targets: string[];
  axis?: 'x' | 'y' | 'z';
  side?: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
  offset?: number;
}
```

- [ ] **Step 4: Add `placementTier` to `PatentAssemblyContract` (~line 160)**

Add `placementTier: 1 | 2 | 3;` to the `PatentAssemblyContract` interface, after the existing `fitWarnings` field.

- [ ] **Step 5: Run existing tests to verify no regressions**

Run: `npx vitest run src/lib/__tests__/patent-workspace.test.ts`
Expected: All existing tests PASS. The new types are additive and optional fields don't break existing construction.

- [ ] **Step 6: Fix any failures from adding required `placementTier` field**

If `buildPatentAssemblyContract()` in `patent-three-d.ts` constructs contracts without `placementTier`, add a default: `placementTier: 1` (since existing contracts all use anchor regions = Tier 1).

Run: `npx vitest run src/lib/__tests__/patent-three-d.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/patent-workspace.ts src/lib/patent-three-d.ts
git commit -m "feat: add CropValidation, SpatialRelationship types and placementTier to assembly contract"
```

---

### Task 2: Crop Quality Validator

**Files:**
- Create: `src/lib/patent-crop-validator.ts`
- Create: `src/lib/__tests__/patent-crop-validator.test.ts`

- [ ] **Step 1: Write failing tests for the validator**

```typescript
import { describe, expect, it, vi } from "vitest";
import { validateCropQuality, triageCropQuality } from "@/lib/patent-crop-validator";

// Mock openrouter structuredOutput
vi.mock("@/lib/openrouter", () => ({
  structuredOutput: vi.fn(),
}));

import { structuredOutput } from "@/lib/openrouter";

describe("triageCropQuality", () => {
  it("returns 'skip' for clearly bad crops (score < 0.3)", () => {
    const result = triageCropQuality(0.2, ["blank_crop"]);
    expect(result).toBe("skip");
  });

  it("returns 'pass' for clearly good crops (score > 0.7)", () => {
    const result = triageCropQuality(0.85, []);
    expect(result).toBe("pass");
  });

  it("returns 'validate' for borderline crops (score 0.3-0.7)", () => {
    const result = triageCropQuality(0.5, []);
    expect(result).toBe("validate");
  });
});

describe("validateCropQuality", () => {
  it("returns pass when AI confirms geometry is present", async () => {
    vi.mocked(structuredOutput).mockResolvedValueOnce({
      hasGeometry: true,
      coverageFraction: 0.65,
      issues: [],
    });

    const result = await validateCropQuality({
      imageBase64: "data:image/png;base64,abc123",
      refNumber: "12",
      componentName: "Housing",
      componentKind: "component",
    });

    expect(result.hasGeometry).toBe(true);
    expect(result.coverageFraction).toBe(0.65);
    expect(result.issues).toEqual([]);
  });

  it("returns fail when AI detects label-only crop", async () => {
    vi.mocked(structuredOutput).mockResolvedValueOnce({
      hasGeometry: false,
      coverageFraction: 0.05,
      issues: ["label_only"],
    });

    const result = await validateCropQuality({
      imageBase64: "data:image/png;base64,abc123",
      refNumber: "14",
      componentName: "Gasket",
      componentKind: "seal",
    });

    expect(result.hasGeometry).toBe(false);
    expect(result.issues).toContain("label_only");
  });

  it("treats low coverage as a fail even if hasGeometry is true", async () => {
    vi.mocked(structuredOutput).mockResolvedValueOnce({
      hasGeometry: true,
      coverageFraction: 0.15,
      issues: ["partial_cutoff"],
    });

    const result = await validateCropQuality({
      imageBase64: "data:image/png;base64,abc123",
      refNumber: "16",
      componentName: "Bolt",
      componentKind: "fastener",
    });

    expect(result.coverageFraction).toBeLessThan(0.30);
    expect(result.issues).toContain("partial_cutoff");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/patent-crop-validator.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement patent-crop-validator.ts**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/patent-crop-validator.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/patent-crop-validator.ts src/lib/__tests__/patent-crop-validator.test.ts
git commit -m "feat: add AI crop quality validator with heuristic pre-filter"
```

---

### Task 3: Integrate Quality Gate into Extractor

**Files:**
- Modify: `src/lib/patent-extractor.ts` (~lines 272-294 in `shouldKeepDetection` area)
- Modify: `src/lib/patent-workspace.ts` (in `attachAssemblyParents`, ~lines 1069-1148)

- [ ] **Step 1: Add quality gate call in patent-extractor.ts**

After `analyzeCropQuality()` runs and before the final keep/skip decision, add the quality gate routing. In the section where component candidates are built (after crop + quality analysis), add:

```typescript
import { triageCropQuality, validateCropQuality } from "@/lib/patent-crop-validator";
```

In the candidate creation loop, after `analyzeCropQuality()` returns `{ score, issues }`, add:

```typescript
const routeDecision = triageCropQuality(score, issues);
let cropValidation: CropValidation | undefined;

if (routeDecision === "validate") {
  try {
    const imageBase64 = `data:image/png;base64,${cropBuffer.toString("base64")}`;
    cropValidation = await validateCropQuality({
      imageBase64,
      refNumber: detection.refNumber ?? "unknown",
      componentName: detection.name,
      componentKind: detection.kind,
    });
  } catch {
    // AI validation failed — treat as borderline pass
    cropValidation = undefined;
  }
}
```

Store `cropValidation` on the candidate's evidence data so it flows through to `PatentComponentEvidence`.

- [ ] **Step 2: Update evidenceMode derivation in patent-workspace.ts**

In `attachAssemblyParents()` (~line 1069), where `evidenceMode` is derived, add logic to check `cropValidation` results:

```typescript
// After existing evidenceMode derivation, override if crop validation failed
const bestEvidence = component.evidence[0];
if (bestEvidence?.cropValidation) {
  const cv = bestEvidence.cropValidation;
  const cropFailed = !cv.hasGeometry || cv.coverageFraction < 0.30 ||
    cv.issues.some(i => ["label_only", "partial_cutoff"].includes(i));
  if (cropFailed && component.evidenceMode === "direct_crop") {
    component.evidenceMode = "figure_context";
  }
}
```

- [ ] **Step 3: Write test for quality gate routing behavior**

Add to `src/lib/__tests__/patent-crop-validator.test.ts`:

```typescript
describe("quality gate integration", () => {
  it("routes borderline crop with failed AI validation to figure_context evidenceMode", () => {
    // Simulate the integration logic from patent-workspace.ts
    const cropValidation = {
      hasGeometry: false,
      coverageFraction: 0.1,
      issues: ["label_only"],
    };
    const currentEvidenceMode = "direct_crop";

    const cropFailed = !cropValidation.hasGeometry ||
      cropValidation.coverageFraction < 0.30 ||
      cropValidation.issues.some((i: string) => ["label_only", "partial_cutoff"].includes(i));

    const newEvidenceMode = cropFailed && currentEvidenceMode === "direct_crop"
      ? "figure_context"
      : currentEvidenceMode;

    expect(newEvidenceMode).toBe("figure_context");
  });

  it("keeps direct_crop evidenceMode when AI validation passes", () => {
    const cropValidation = {
      hasGeometry: true,
      coverageFraction: 0.65,
      issues: [],
    };
    const currentEvidenceMode = "direct_crop";

    const cropFailed = !cropValidation.hasGeometry ||
      cropValidation.coverageFraction < 0.30 ||
      cropValidation.issues.some((i: string) => ["label_only", "partial_cutoff"].includes(i));

    const newEvidenceMode = cropFailed && currentEvidenceMode === "direct_crop"
      ? "figure_context"
      : currentEvidenceMode;

    expect(newEvidenceMode).toBe("direct_crop");
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/patent-crop-validator.test.ts`
Expected: All PASS

- [ ] **Step 5: Run all patent tests for regression**

Run: `npx vitest run src/lib/__tests__/patent-workspace.test.ts src/lib/__tests__/patent-image-enhancer.test.ts src/lib/__tests__/patent-three-d.test.ts`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/patent-extractor.ts src/lib/patent-workspace.ts src/lib/__tests__/patent-crop-validator.test.ts
git commit -m "feat: integrate crop quality gate into extraction pipeline"
```

---

### Task 4: Full-Figure Extraction Prompt

**Files:**
- Modify: `src/lib/patent-image-enhancer.ts` (~lines 99-104, evidenceMode branching)
- Test: `src/lib/__tests__/patent-image-enhancer.test.ts`

- [ ] **Step 1: Write failing test for full-figure prompt**

Add to `patent-image-enhancer.test.ts`:

```typescript
it("produces full-figure extraction instructions when evidenceMode is figure_context", () => {
  const prompt = buildPatentComponentEnhancementPrompt({
    variant: "realistic_display",
    canonicalName: "gasket",
    canonicalLabel: "gasket",
    canonicalRefNumber: "14",
    kind: "seal",
    componentRole: "interface",
    buildableStatus: "buildable",
    evidenceMode: "figure_context",
    inferenceStatus: "partial",
    summary: "Sealing element between housing and cover.",
    functionDescription: "Prevents fluid leakage at the junction.",
    refNumbers: ["14"],
    supportingFigures: ["FIG. 1", "FIG. 3"],
    rootProductName: "valve assembly",
    rootProductDescription: "Industrial valve.",
    parentAssemblyName: "Housing",
    relatedComponentNames: ["cover", "bolt"],
    assemblyChildRefNumbers: [],
    textSnippets: ["Gasket 14 is positioned between housing 10 and cover 12."],
    evidencePolicyNote: "Use broader figure context.",
    scaleHints: { normalizedWidth: 0.3, normalizedHeight: 0.05, relativeArea: 0.015 },
  });

  expect(prompt).toContain("ISOLATE and EXTRACT");
  expect(prompt).toContain("reference number 14");
  expect(prompt).toContain("from the full patent figure");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/patent-image-enhancer.test.ts`
Expected: FAIL — prompt doesn't contain expected strings

- [ ] **Step 3: Update the evidenceMode branching in buildPatentComponentEnhancementPrompt**

In `patent-image-enhancer.ts`, in the `evidenceMode` branching section (~lines 99-104), enhance the `"figure_context"` case:

```typescript
case "figure_context":
  lines.push(
    `The reference images show FULL patent figures, not isolated crops. You must ISOLATE and EXTRACT only the component identified as reference number ${input.canonicalRefNumber} ("${input.canonicalName}") from the full patent figure.`,
    `Focus on the geometry associated with ref ${input.canonicalRefNumber}. Ignore all other components, leader lines, and annotations in the figure.`,
    `Generate a clean, isolated view showing ONLY this component against a neutral background.`,
  );
  break;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/patent-image-enhancer.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/patent-image-enhancer.ts src/lib/__tests__/patent-image-enhancer.test.ts
git commit -m "feat: add full-figure extraction prompt for figure_context evidenceMode"
```

---

### Task 5: Update Image Generator for Full-Figure Path

**Files:**
- Modify: `src/lib/patent-component-image-generator.ts` (~lines 48-73, reference image selection)

- [ ] **Step 1: Update reference image selection for figure_context mode**

In `generatePatentComponentImageVariant()`, where evidence items are selected as reference images (~lines 48-73), add a branch for `figure_context` mode. When `component.evidenceMode === "figure_context"`, instead of using individual crop images, use the full figure page images from `component.evidence[].imagePath` pointing to the figure-level images:

```typescript
// After sorting evidence by quality
let referenceImagePaths: string[];

if (component.evidenceMode === "figure_context" || component.evidenceMode === "contextual_inferred") {
  // Use full figure page images instead of individual crops
  const figureIds = component.supportingContext?.supportingFigureIds ?? [];
  const figures = workspace.figures.filter(f => figureIds.includes(f.id));
  referenceImagePaths = figures
    .slice(0, maxImages)
    .map(f => f.imagePath)
    .filter(Boolean) as string[];

  // Fallback: if no supporting figures, use the figure pages from evidence
  if (referenceImagePaths.length === 0) {
    const evidenceFigureIds = [...new Set(component.evidence.map(e => e.figureId))];
    const evidenceFigures = workspace.figures.filter(f => evidenceFigureIds.includes(f.id));
    referenceImagePaths = evidenceFigures
      .slice(0, maxImages)
      .map(f => f.imagePath)
      .filter(Boolean) as string[];
  }
} else {
  // Existing logic: use individual crop images
  referenceImagePaths = sortedEvidence
    .slice(0, maxImages)
    .map(e => e.imagePath)
    .filter(Boolean) as string[];
}
```

- [ ] **Step 2: Run existing tests**

Run: `npx vitest run src/lib/__tests__/patent-image-enhancer.test.ts`
Expected: PASS (image generator doesn't have dedicated tests, but prompt tests should still pass)

- [ ] **Step 3: Commit**

```bash
git add src/lib/patent-component-image-generator.ts
git commit -m "feat: route figure_context components to full figure images instead of crops"
```

---

### Task 6: Assembly Inference Engine

**Files:**
- Create: `src/lib/patent-assembly-inference.ts`
- Create: `src/lib/__tests__/patent-assembly-inference.test.ts`

- [ ] **Step 1: Write failing tests for spatial relationship inference**

```typescript
import { describe, expect, it, vi } from "vitest";
import {
  resolveComponentPosition,
  normalizeComponentScale,
  inferSpatialRelationships,
} from "@/lib/patent-assembly-inference";
import type { SpatialRelationship } from "@/lib/patent-workspace";

vi.mock("@/lib/openrouter", () => ({
  structuredOutput: vi.fn(),
}));

import { structuredOutput } from "@/lib/openrouter";

describe("resolveComponentPosition", () => {
  it("tier 1: uses anchor regions when available", () => {
    const result = resolveComponentPosition({
      componentId: "c1",
      anchorRegions: [
        { figureId: "fig-1", figureLabel: "FIG. 1", pageNumber: 1, region: { x: 0.3, y: 0.4, width: 0.2, height: 0.2 } },
      ],
      heroFigureIds: ["fig-1"],
      relationships: [],
      resolvedPositions: new Map(),
      parentComponentId: null,
      componentKind: "component",
    });

    expect(result.tier).toBe(1);
    expect(result.position).toBeDefined();
    // Position derived from anchor center: (0.3 + 0.2/2 - 0.5) * 2 = -0.2
    expect(result.position[0]).toBeCloseTo(-0.2, 1);
  });

  it("tier 2: interpolates from anchored neighbors via relationships", () => {
    const resolvedPositions = new Map<string, [number, number, number]>();
    resolvedPositions.set("c-housing", [0, 0, 0]);
    resolvedPositions.set("c-cover", [0, 0.5, 0]);

    const relationships: SpatialRelationship[] = [
      { ref: "14", relation: "between", targets: ["10", "12"], axis: "z" },
    ];

    const result = resolveComponentPosition({
      componentId: "c-gasket",
      anchorRegions: [],
      heroFigureIds: ["fig-1"],
      relationships,
      resolvedPositions,
      refToComponentId: new Map([["10", "c-housing"], ["12", "c-cover"]]),
      parentComponentId: null,
      componentKind: "seal",
    });

    expect(result.tier).toBe(2);
    // Between housing [0,0,0] and cover [0,0.5,0] → midpoint
    expect(result.position[1]).toBeCloseTo(0.25, 1);
  });

  it("tier 3: positions near parent with kind-based offset", () => {
    const resolvedPositions = new Map<string, [number, number, number]>();
    resolvedPositions.set("c-housing", [0, 0, 0]);

    const result = resolveComponentPosition({
      componentId: "c-bolt",
      anchorRegions: [],
      heroFigureIds: ["fig-1"],
      relationships: [],
      resolvedPositions,
      refToComponentId: new Map(),
      parentComponentId: "c-housing",
      componentKind: "fastener",
    });

    expect(result.tier).toBe(3);
    expect(result.position).toBeDefined();
    // Offset from parent, not at origin
    const distFromParent = Math.sqrt(
      result.position[0] ** 2 + result.position[1] ** 2 + result.position[2] ** 2
    );
    expect(distFromParent).toBeGreaterThan(0);
  });
});

describe("normalizeComponentScale", () => {
  it("uses figure-derived scaleHints as primary source", () => {
    const result = normalizeComponentScale({
      scaleHints: { normalizedWidth: 0.2, normalizedHeight: 0.2, relativeArea: 0.04 },
      heroRelativeArea: 0.35,
      textDimensions: null,
      componentKind: "component",
    });

    expect(result.linearScale).toBeCloseTo(Math.sqrt(0.04 / 0.35), 2);
    expect(result.source).toBe("figure");
  });

  it("prefers text dimensions when figure scale deviates >50%", () => {
    const result = normalizeComponentScale({
      scaleHints: { normalizedWidth: 0.5, normalizedHeight: 0.5, relativeArea: 0.25 },
      heroRelativeArea: 0.35,
      textDimensions: { fractionOfHero: 0.05 },
      componentKind: "fastener",
    });

    expect(result.source).toBe("text");
    expect(result.linearScale).toBeCloseTo(Math.sqrt(0.05), 2);
  });

  it("falls back to kind defaults when no hints available", () => {
    const result = normalizeComponentScale({
      scaleHints: null,
      heroRelativeArea: 0.35,
      textDimensions: null,
      componentKind: "fastener",
    });

    expect(result.source).toBe("kind_default");
    expect(result.linearScale).toBeLessThan(0.3); // fasteners are small
  });
});

describe("inferSpatialRelationships", () => {
  it("calls structuredOutput with patent context and returns relationships", async () => {
    const mockRelationships: SpatialRelationship[] = [
      { ref: "14", relation: "between", targets: ["10", "12"], axis: "z" },
      { ref: "16", relation: "through", targets: ["10", "12", "14"], axis: "z" },
    ];

    vi.mocked(structuredOutput).mockResolvedValueOnce({
      relationships: mockRelationships,
      textDimensions: [],
    });

    const result = await inferSpatialRelationships({
      components: [
        { ref: "10", name: "Housing", kind: "component" },
        { ref: "12", name: "Cover", kind: "component" },
        { ref: "14", name: "Gasket", kind: "seal" },
        { ref: "16", name: "Bolt", kind: "fastener" },
      ],
      patentText: "Gasket 14 is positioned between housing 10 and cover 12. Bolts 16 pass through all layers.",
      assemblyGraph: { heroRef: "10", children: ["12", "14", "16"] },
    });

    expect(result.relationships).toHaveLength(2);
    expect(result.relationships[0].relation).toBe("between");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/patent-assembly-inference.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement patent-assembly-inference.ts**

```typescript
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

    // Map 0-1 normalized figure coords to 3D space centered at origin
    const x = (cx - 0.5) * 2;
    const y = -(cy - 0.5) * 2; // flip Y for 3D
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
      // Midpoint of targets
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
      // Offset from first resolved target
      const base = targetPositions[0];
      const axisOffset = rel.axis === "x" ? 0 : rel.axis === "y" ? 1 : 2;
      const pos: [number, number, number] = [...base];
      pos[axisOffset] += rel.offset ?? 0.1;

      return { tier: 2, position: pos };
    }
  }

  // Tier 3: Hierarchy fallback — near parent with kind-based offset
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

  // No parent — orbit hero at default radius
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

  // Cross-validation: if both exist and deviate >50%, prefer text
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

  // Kind defaults
  const defaultScale = KIND_DEFAULT_SCALES[input.componentKind] ?? KIND_DEFAULT_SCALES.component;
  return { linearScale: defaultScale, source: "kind_default" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/patent-assembly-inference.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/patent-assembly-inference.ts src/lib/__tests__/patent-assembly-inference.test.ts
git commit -m "feat: add assembly inference engine with 3-tier position resolution and scale normalization"
```

---

### Task 7: Integrate Assembly Inference into 3D Generation

**Files:**
- Modify: `src/lib/patent-three-d.ts` (`buildPatentAssemblyContract`, ~lines 278-362)
- Modify: `src/app/api/patent/three-d/generate/route.ts` (~lines 174-238)

- [ ] **Step 1: Update buildPatentAssemblyContract to accept placementTier and use inference positions**

In `patent-three-d.ts`, update the `buildPatentAssemblyContract` function signature to accept optional inference data:

```typescript
import { resolveComponentPosition, normalizeComponentScale, type PositionResult } from "@/lib/patent-assembly-inference";
```

Add to the function input type:

```typescript
inferenceData?: {
  relationships: SpatialRelationship[];
  resolvedPositions: Map<string, [number, number, number]>;
  refToComponentId: Map<string, string>;
  textDimensions: Map<string, { fractionOfHero: number }>;
};
```

Replace the anchor-only position logic with inference-aware logic:

```typescript
// For non-hero components, use inference engine
if (component.kind !== "full_product" && inferenceData) {
  const posResult = resolveComponentPosition({
    componentId: component.id,
    anchorRegions: component.anchorRegions ?? [],
    heroFigureIds: workspace.figures.filter(f => f.role === "full_product_view").map(f => f.id),
    relationships: inferenceData.relationships.filter(r => r.ref === component.canonicalRefNumber),
    resolvedPositions: inferenceData.resolvedPositions,
    refToComponentId: inferenceData.refToComponentId,
    parentComponentId: component.parentAssemblyId ?? null,
    componentKind: component.kind,
  });

  assembledPosition = posResult.position;
  placementTier = posResult.tier;
} else if (component.kind !== "full_product") {
  // Fallback: existing anchor-only logic
  const placement = computeAnchorPlacement(component, workspace);
  assembledPosition = placement?.assembledPosition ?? [0, 0, 0];
  placementTier = placement ? 1 : 3;
}
```

Set `placementTier` on the returned contract object.

- [ ] **Step 2: Update the API route to run inference before generating contracts**

In `src/app/api/patent/three-d/generate/route.ts`, before the contract-building loop (~line 209), add:

```typescript
import { inferSpatialRelationships } from "@/lib/patent-assembly-inference";

// Run assembly inference once for all components
const inferenceInput = {
  components: targetComponents.map(c => ({
    ref: c.canonicalRefNumber ?? c.id,
    name: c.canonicalName,
    kind: c.kind,
  })),
  patentText: workspace.extractedText ?? "",
  assemblyGraph: workspace.assemblyGraph ?? null,
};

let inferenceResult;
try {
  inferenceResult = await inferSpatialRelationships(inferenceInput);
} catch {
  inferenceResult = { relationships: [], textDimensions: [] };
}

// Build lookup maps for position resolution
const refToComponentId = new Map<string, string>();
for (const c of targetComponents) {
  if (c.canonicalRefNumber) refToComponentId.set(c.canonicalRefNumber, c.id);
}
const resolvedPositions = new Map<string, [number, number, number]>();
const textDimensionMap = new Map<string, { fractionOfHero: number }>();
for (const td of inferenceResult.textDimensions) {
  textDimensionMap.set(td.ref, { fractionOfHero: td.fractionOfHero });
}

const inferenceData = {
  relationships: inferenceResult.relationships,
  resolvedPositions,
  refToComponentId,
  textDimensions: textDimensionMap,
};
```

Pass `inferenceData` to each `buildPatentAssemblyContract()` call, and after each call, store the resolved position in `resolvedPositions` so subsequent components can reference it for Tier 2 inference.

**Graceful degradation in the generation loop:** Add retry-once logic for Trellis 2 failures:

```typescript
let glbBuffer: Buffer | null = null;
try {
  glbBuffer = await generatePatentThreeDAsset(/* ... */);
} catch (err) {
  // Retry once on failure
  try {
    glbBuffer = await generatePatentThreeDAsset(/* ... */);
  } catch {
    // Second failure — component will use placeholder in viewer
    glbBuffer = null;
  }
}
```

When `glbBuffer` is null, still build the assembly contract (using inference for position/scale) and set `threeDStatus: "failed"` so the viewer can show a placeholder. Set `fitWarnings` to include `"glb_generation_failed"`.

- [ ] **Step 3: Write test for placementTier with inference data**

Add to `src/lib/__tests__/patent-three-d.test.ts`:

```typescript
it("sets placementTier from inference data when provided", () => {
  const workspace = buildWorkspace();
  const hero = workspace.componentLibrary.find(c => c.kind === "full_product")!;
  const sub = workspace.componentLibrary.find(c => c.kind === "subassembly")!;

  const resolvedPositions = new Map<string, [number, number, number]>();
  resolvedPositions.set(hero.id, [0, 0, 0]);

  const contract = buildPatentAssemblyContract({
    component: sub,
    workspace,
    nativeBounds: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5], size: [1, 1, 1], center: [0, 0, 0], longestAxis: 1 },
    heroComponent: hero,
    inferenceData: {
      relationships: [{ ref: "32", relation: "inside", targets: ["31"], axis: "z" }],
      resolvedPositions,
      refToComponentId: new Map([["31", hero.id], ["32", sub.id]]),
      textDimensions: new Map(),
    },
  });

  expect(contract.placementTier).toBeDefined();
  expect([1, 2, 3]).toContain(contract.placementTier);
});
```

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run src/lib/__tests__/patent-three-d.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/patent-three-d.ts src/app/api/patent/three-d/generate/route.ts src/lib/__tests__/patent-three-d.test.ts
git commit -m "feat: integrate assembly inference engine into 3D contract generation"
```

---

### Task 8: Interactive Legend Panel

**Files:**
- Modify: `src/components/patent/PatentThreeDViewer.tsx`

- [ ] **Step 1: Define extended props and legend item types**

Update the component's type definitions:

```typescript
interface PatentThreeDViewerItem {
  id: string;
  name: string;
  refNumber?: string;
  kind?: string;
  description?: string;
  url: string | null;  // null = placeholder (no GLB)
  contract: PatentAssemblyContract;
}

interface PatentThreeDViewerProps {
  items: PatentThreeDViewerItem[];
  exploded: boolean;
  onExplodedChange?: (exploded: boolean) => void;
}
```

- [ ] **Step 2: Create the legend panel JSX**

Add a `LegendPanel` component within the file:

```typescript
function LegendPanel({
  items,
  hoveredId,
  selectedId,
  exploded,
  onHover,
  onSelect,
  onExplodedChange,
}: {
  items: PatentThreeDViewerItem[];
  hoveredId: string | null;
  selectedId: string | null;
  exploded: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onExplodedChange?: (exploded: boolean) => void;
}) {
  const selectedItem = items.find(i => i.id === selectedId);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to hovered item
  useEffect(() => {
    if (hoveredId && listRef.current) {
      const el = listRef.current.querySelector(`[data-component-id="${hoveredId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [hoveredId]);

  const sorted = [...items].sort((a, b) => {
    const aNum = parseInt(a.refNumber ?? "999", 10);
    const bNum = parseInt(b.refNumber ?? "999", 10);
    return aNum - bNum;
  });

  return (
    <div className="flex flex-col h-full bg-gray-950 border-l border-gray-800 w-72">
      {/* View toggle */}
      <div className="flex border-b border-gray-800">
        <button
          className={`flex-1 py-2 text-xs ${!exploded ? "text-white border-b-2 border-blue-500" : "text-gray-500"}`}
          onClick={() => onExplodedChange?.(false)}
        >
          Assembled
        </button>
        <button
          className={`flex-1 py-2 text-xs ${exploded ? "text-white border-b-2 border-blue-500" : "text-gray-500"}`}
          onClick={() => onExplodedChange?.(true)}
        >
          Exploded
        </button>
      </div>

      {/* Component list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="text-[10px] text-gray-500 uppercase px-2 mb-1">
          Components ({items.length})
        </div>
        {sorted.map(item => {
          const isHovered = item.id === hoveredId;
          const isSelected = item.id === selectedId;
          return (
            <div
              key={item.id}
              data-component-id={item.id}
              className={`px-2 py-1.5 rounded cursor-pointer border-l-2 transition-colors ${
                isSelected
                  ? "bg-blue-950 border-blue-500"
                  : isHovered
                  ? "bg-gray-800 border-amber-500"
                  : "bg-gray-900 border-gray-700 hover:bg-gray-800"
              }`}
              onMouseEnter={() => onHover(item.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(isSelected ? null : item.id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">
                  {item.refNumber ?? "?"} — {item.name}
                </span>
                {item.kind && (
                  <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                    {item.kind}
                  </span>
                )}
              </div>
              {item.description && (
                <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                  {item.description}
                </div>
              )}
              {!item.url && (
                <span className="text-[9px] text-amber-600">placeholder</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedItem && (
        <div className="border-t border-gray-800 p-3 bg-gray-950">
          <div className="text-[10px] text-gray-500 uppercase mb-1">
            Ref {selectedItem.refNumber ?? "?"}
          </div>
          <div className="text-xs text-gray-300 leading-relaxed">
            <strong>{selectedItem.name}</strong>
            {selectedItem.description && ` — ${selectedItem.description}`}
          </div>
          <div className="flex gap-1 mt-2 flex-wrap">
            {selectedItem.contract.placementTier === 3 && (
              <span className="text-[9px] bg-amber-950 text-amber-500 px-1.5 py-0.5 rounded">
                approximate position
              </span>
            )}
            {selectedItem.contract.placementTier === 2 && (
              <span className="text-[9px] bg-blue-950 text-blue-400 px-1.5 py-0.5 rounded">
                inferred position
              </span>
            )}
            {!selectedItem.url && (
              <span className="text-[9px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded">
                placeholder — no source image
              </span>
            )}
            {selectedItem.contract.fitWarnings?.includes("glb_generation_failed") && selectedItem.url && (
              <span className="text-[9px] bg-amber-950 text-amber-500 px-1.5 py-0.5 rounded">
                simplified geometry
              </span>
            )}
            {selectedItem.contract.fitWarnings?.includes("scale_mismatch") && (
              <span className="text-[9px] bg-yellow-950 text-yellow-500 px-1.5 py-0.5 rounded">
                ⚠ scale adjusted from text
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add raycasting and highlight state to the 3D scene**

Update the main viewer component to manage hover/selection state and pass it to both the canvas and legend:

```typescript
export default function PatentThreeDViewer({ items, exploded, onExplodedChange }: PatentThreeDViewerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex h-full">
      <div className="flex-[2] relative">
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} />
          {items.map(item => (
            <ComponentMesh
              key={item.id}
              item={item}
              exploded={exploded}
              isHovered={item.id === hoveredId}
              isSelected={item.id === selectedId}
              isDimmed={
                (hoveredId !== null && item.id !== hoveredId) ||
                (selectedId !== null && item.id !== selectedId)
              }
              onHover={setHoveredId}
              onSelect={setSelectedId}
            />
          ))}
          <OrbitControls autoRotate={!exploded} autoRotateSpeed={1} />
        </Canvas>
      </div>
      <LegendPanel
        items={items}
        hoveredId={hoveredId}
        selectedId={selectedId}
        exploded={exploded}
        onHover={setHoveredId}
        onSelect={setSelectedId}
        onExplodedChange={onExplodedChange}
      />
    </div>
  );
}
```

- [ ] **Step 4: Implement ComponentMesh with highlighting and raycasting**

```typescript
function ComponentMesh({
  item,
  exploded,
  isHovered,
  isSelected,
  isDimmed,
  onHover,
  onSelect,
}: {
  item: PatentThreeDViewerItem;
  exploded: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isDimmed: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const contract = item.contract;

  const position = exploded
    ? [
        contract.assembledPosition[0] + contract.explodedOffset[0],
        contract.assembledPosition[1] + contract.explodedOffset[1],
        contract.assembledPosition[2] + contract.explodedOffset[2],
      ] as [number, number, number]
    : contract.assembledPosition;

  const emissiveIntensity = isHovered ? 0.3 : isSelected ? 0.2 : 0;
  const opacity = isDimmed ? 0.3 : 1;

  return (
    <group
      ref={groupRef}
      position={position}
      scale={contract.normalizedScale}
      userData={{ componentId: item.id }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(item.id); }}
      onPointerOut={(e) => { e.stopPropagation(); onHover(null); }}
      onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
    >
      {item.url ? (
        <LoadedModel
          url={item.url}
          center={contract.nativeBounds.center}
          emissiveIntensity={emissiveIntensity}
          opacity={opacity}
        />
      ) : (
        <PlaceholderMesh
          name={item.name}
          emissiveIntensity={emissiveIntensity}
          opacity={opacity}
        />
      )}
    </group>
  );
}
```

- [ ] **Step 5: Implement LoadedModel and PlaceholderMesh**

```typescript
function LoadedModel({
  url,
  center,
  emissiveIntensity,
  opacity,
}: {
  url: string;
  center: [number, number, number];
  emissiveIntensity: number;
  opacity: number;
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(), [scene]);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // Clone materials once on mount, dispose on unmount
  useEffect(() => {
    const mats: THREE.MeshStandardMaterial[] = [];
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.emissive = new THREE.Color(0xffaa00);
        mesh.material = mat;
        mats.push(mat);
      }
    });
    materialsRef.current = mats;
    return () => { mats.forEach(m => m.dispose()); };
  }, [cloned]);

  // Update material properties without re-cloning
  useEffect(() => {
    for (const mat of materialsRef.current) {
      mat.emissiveIntensity = emissiveIntensity;
      mat.opacity = opacity;
      mat.transparent = opacity < 1;
    }
  }, [emissiveIntensity, opacity]);

  return (
    <primitive
      object={cloned}
      position={[-center[0], -center[1], -center[2]]}
    />
  );
}

function PlaceholderMesh({
  name,
  emissiveIntensity,
  opacity,
}: {
  name: string;
  emissiveIntensity: number;
  opacity: number;
}) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial
          color="#666"
          wireframe
          emissive="#ffaa00"
          emissiveIntensity={emissiveIntensity}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
      <Html center distanceFactor={2} style={{ pointerEvents: "none" }}>
        <div style={{ background: "rgba(0,0,0,0.7)", color: "#ccc", padding: "2px 6px", borderRadius: 3, fontSize: 10, whiteSpace: "nowrap" }}>
          {name}
        </div>
      </Html>
    </group>
  );
}
```

- [ ] **Step 6: Run dev server and manually verify**

Run: `npm run dev`
Navigate to patent extract page, upload a patent, generate 3D.
Expected: Legend panel renders alongside canvas. Hover highlighting works bidirectionally. View toggle switches between assembled and exploded. Placeholder cubes show for components without GLBs.

- [ ] **Step 7: Commit**

```bash
git add src/components/patent/PatentThreeDViewer.tsx
git commit -m "feat: add interactive legend panel with bidirectional highlighting and placeholder primitives"
```

---

### Task 9: Update Patent Extract Page

**Files:**
- Modify: `src/app/patent-extract/page.tsx`

- [ ] **Step 1: Update PatentThreeDViewer usage to pass extended item data**

In the section where `PatentThreeDViewer` items are built from workspace component library (~where `handleGenerateThreeDSet` result is rendered), update the item mapping to include the new fields:

```typescript
const viewerItems: PatentThreeDViewerItem[] = componentsWithThreeD.map(c => ({
  id: c.id,
  name: c.canonicalName,
  refNumber: c.canonicalRefNumber ?? undefined,
  kind: c.kind,
  description: c.supportingContext?.summary ?? c.evidence[0]?.summary,
  url: c.threeDAsset?.glbPath ?? null,
  contract: c.assemblyContract!,
}));
```

- [ ] **Step 2: Pass exploded state and toggle handler to viewer**

Ensure the `exploded` boolean state and toggle callback are passed to the updated `PatentThreeDViewer`:

```typescript
<PatentThreeDViewer
  items={viewerItems}
  exploded={exploded}
  onExplodedChange={setExploded}
/>
```

- [ ] **Step 3: Include placeholder items for components with contracts but no GLB**

After the featured components that have full 3D, also include components that got assembly contracts (from inference) but failed Trellis generation:

```typescript
// Include all components with assembly contracts, not just those with GLBs
const allAssembledComponents = workspace.componentLibrary.filter(
  c => c.assemblyContract && ["buildable_part", "buildable_sub_assembly", "full_product"].includes(c.buildableStatus),
);
```

- [ ] **Step 4: Run dev server and manually verify**

Run: `npm run dev`
Expected: Patent extract page shows 3D viewer with legend panel. All meaningful components appear in legend. Components without GLBs show as placeholder wireframe cubes.

- [ ] **Step 5: Commit**

```bash
git add src/app/patent-extract/page.tsx
git commit -m "feat: update patent extract page to use interactive legend viewer with all assembled components"
```

---

### Task 10: End-to-End Verification and Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run build check**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 3: Manual end-to-end test with sample patent**

Run: `npm run dev`
Upload `docs/sample-patent.pdf`. Walk through:
1. Extraction completes with component candidates
2. Auto-review approves/skips appropriately
3. Image generation works for both good crops and full-figure fallback
4. 3D generation produces GLBs with assembly contracts
5. Viewer shows all components with legend panel
6. Hover highlighting works both directions
7. Assembled ↔ Exploded toggle animates correctly
8. Placeholder cubes appear for any components without GLBs

- [ ] **Step 4: Fix any issues found during manual testing**

Address any visual glitches, positioning issues, or runtime errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: address issues from end-to-end testing"
```
