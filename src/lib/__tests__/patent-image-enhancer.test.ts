import { describe, expect, it } from "vitest";
import {
  buildPatentFigureEnhancementPrompt,
  getImageExtensionForMimeType,
} from "@/lib/patent-image-enhancer";

describe("buildPatentFigureEnhancementPrompt", () => {
  it("includes realism and cleanup instructions", () => {
    const prompt = buildPatentFigureEnhancementPrompt({
      figureLabel: "FIG. 3",
      description: "A sectional view of a rotating valve assembly.",
      components: [
        { refNumber: "102", name: "rotor" },
        { refNumber: "104", name: "housing" },
      ],
    });

    expect(prompt).toContain("photorealistic product-style render");
    expect(prompt).toContain("Target figure label: FIG. 3.");
    expect(prompt).toContain("102 rotor, 104 housing");
    expect(prompt).toContain("Do not include patent callout numbers");
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

