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
