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
      kind: "component",
      summary: "A rolling writing tip seated at the end of the pen cartridge.",
      functionDescription: "Transfers ink to paper while rotating inside the tip socket.",
      refNumbers: ["5", "31"],
      supportingFigures: ["FIG. 1", "FIG. 8"],
    });

    expect(prompt).toContain("Component name: roller ball tip.");
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
    expect(isRateLimitErrorMessage("Gemini image enhancement failed (429): quota exceeded")).toBe(true);
    expect(isRateLimitErrorMessage("Rate limit reached")).toBe(true);
    expect(isRateLimitErrorMessage("unexpected server error")).toBe(false);
  });
});

