import { describe, expect, it } from "vitest";
import {
  buildPatentComponentEnhancementPrompt,
  getImageExtensionForMimeType,
  isRateLimitErrorMessage,
} from "@/lib/patent-image-enhancer";

describe("buildPatentComponentEnhancementPrompt", () => {
  it("includes component context and asset instructions", () => {
    const prompt = buildPatentComponentEnhancementPrompt({
      variant: "realistic_display",
      canonicalName: "roller ball tip",
      canonicalLabel: "roller ball tip",
      canonicalRefNumber: "5",
      kind: "component",
      componentRole: "core",
      buildableStatus: "buildable",
      evidenceMode: "direct_crop",
      inferenceStatus: "direct",
      summary: "A rolling writing tip seated at the end of the pen cartridge.",
      functionDescription: "Transfers ink to paper while rotating inside the tip socket.",
      refNumbers: ["5", "31"],
      supportingFigures: ["FIG. 1", "FIG. 8"],
      rootProductName: "ballpoint pen tip",
      rootProductDescription: "The finished pen tip assembly.",
      parentAssemblyName: "Ball retention geometry",
      relatedComponentNames: ["tip seat", "socket"],
      assemblyChildRefNumbers: ["5", "31", "32"],
      textSnippets: ["The rolling ball is seated at the front end of the tip."],
      evidencePolicyNote: "Use direct patent evidence crops as the primary grounding.",
      scaleHints: {
        normalizedWidth: 0.2,
        normalizedHeight: 0.2,
        relativeArea: 0.04,
      },
    });

    expect(prompt).toContain("Root product: ballpoint pen tip.");
    expect(prompt).toContain("Parent assembly: Ball retention geometry.");
    expect(prompt).toContain("Component name: roller ball tip.");
    expect(prompt).toContain("Canonical reference number: 5.");
    expect(prompt).toContain("Buildable status: buildable.");
    expect(prompt).toContain("Assembly child reference numbers: 5, 31, 32.");
    expect(prompt).toContain("Visible patent reference numbers: 5, 31.");
    expect(prompt).toContain("Patent scale hint: width 20%, height 20%, area 4%.");
    expect(prompt).toContain("How it works: Transfers ink to paper");
    expect(prompt).toContain("Render one isolated centered asset");
  });

  it("produces full-figure extraction instructions when evidenceMode is figure_context", () => {
    const prompt = buildPatentComponentEnhancementPrompt({
      variant: "realistic_display",
      canonicalName: "gasket",
      canonicalLabel: "gasket",
      canonicalRefNumber: "14",
      kind: "component",
      componentRole: "core",
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

  it("tightens framing instructions for 3D source renders", () => {
    const prompt = buildPatentComponentEnhancementPrompt({
      variant: "three_d_source",
      canonicalName: "tip assembly",
      canonicalLabel: "tip assembly",
      canonicalRefNumber: "31",
      kind: "subassembly",
      componentRole: "core",
      buildableStatus: "buildable",
      evidenceMode: "figure_context",
      inferenceStatus: "partial",
      summary: "Grouped tip assembly.",
      functionDescription: "Supports the ball and ink path.",
      refNumbers: ["31", "32"],
      supportingFigures: ["FIG. 1"],
      rootProductName: "ballpoint pen tip",
      rootProductDescription: "Finished writing tip.",
      parentAssemblyName: "Tip body / housing",
      relatedComponentNames: ["roller ball tip"],
      assemblyChildRefNumbers: ["5", "31", "32"],
      textSnippets: [],
      evidencePolicyNote: "Use broader figure context.",
      scaleHints: null,
    });

    expect(prompt).toContain("Create one clean 3D-source image of the assembled subassembly.");
    expect(prompt).toContain("Show the complete object fully in frame");
    expect(prompt).toContain("suitable for image-to-3D conversion");
  });
});

describe("getImageExtensionForMimeType", () => {
  it("maps common image mime types to file extensions", () => {
    expect(getImageExtensionForMimeType("image/png")).toBe("png");
    expect(getImageExtensionForMimeType("image/jpeg")).toBe("jpg");
    expect(getImageExtensionForMimeType("image/webp")).toBe("webp");
  });

  it("falls back to png for unknown mime types", () => {
    expect(getImageExtensionForMimeType("application/octet-stream")).toBe("png");
  });
});

describe("isRateLimitErrorMessage", () => {
  it("detects typical quota and rate limit failures", () => {
    expect(isRateLimitErrorMessage("OpenRouter Nano Banana enhancement failed (429): quota exceeded")).toBe(true);
    expect(isRateLimitErrorMessage("Rate limit reached")).toBe(true);
    expect(isRateLimitErrorMessage("unexpected server error")).toBe(false);
  });
});
