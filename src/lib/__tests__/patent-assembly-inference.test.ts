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
    expect(result.linearScale).toBeLessThan(0.3);
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
