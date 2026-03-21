import { describe, expect, it } from "vitest";
import {
  buildPatentComponentEnhancementPrompt,
  getImageExtensionForMimeType,
  isRateLimitErrorMessage,
} from "@/lib/patent-image-enhancer";

describe("buildPatentComponentEnhancementPrompt", () => {
  it("includes component context and asset instructions", () => {
    const prompt = buildPatentComponentEnhancementPrompt({
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
    });

    expect(prompt).toContain("Root product: ballpoint pen tip.");
    expect(prompt).toContain("Parent assembly: Ball retention geometry.");
    expect(prompt).toContain("Component name: roller ball tip.");
    expect(prompt).toContain("Canonical reference number: 5.");
    expect(prompt).toContain("Buildable status: buildable.");
    expect(prompt).toContain("Assembly child reference numbers: 5, 31, 32.");
    expect(prompt).toContain("Visible patent reference numbers: 5, 31.");
    expect(prompt).toContain("How it works: Transfers ink to paper");
    expect(prompt).toContain("Render one isolated centered asset");
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
    expect(isRateLimitErrorMessage("fal.ai Nano Banana Pro enhancement failed (429): quota exceeded")).toBe(true);
    expect(isRateLimitErrorMessage("Rate limit reached")).toBe(true);
    expect(isRateLimitErrorMessage("unexpected server error")).toBe(false);
  });
});
