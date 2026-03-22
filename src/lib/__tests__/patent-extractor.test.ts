import { describe, expect, it } from "vitest";
import { createPatentId } from "@/lib/patent-extractor";

describe("createPatentId", () => {
  it("uses the explicit patent id as a stable cache key", () => {
    expect(createPatentId("sample-patent.pdf", "US-Sample 42")).toBe("us-sample-42");
  });

  it("falls back to the source filename slug when patent id is blank", () => {
    expect(createPatentId("Sample Patent.pdf")).toBe("sample-patent");
  });

  it("returns a generic fallback when no stable token can be derived", () => {
    expect(createPatentId("   ")).toBe("patent");
  });
});
