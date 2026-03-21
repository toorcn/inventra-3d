import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "@/lib/search-parser";

describe("parseSearchQuery", () => {
  it("extracts category from computing query", async () => {
    const result = await parseSearchQuery("computing inventions");
    expect(result.categories).toContain("computing");
  });

  it("extracts region from europe query", async () => {
    const result = await parseSearchQuery("inventions in Europe");
    expect(result.region).toBe("Europe");
  });

  it("extracts year range from after query", async () => {
    const result = await parseSearchQuery("computing after 1950");
    expect(result.yearRange?.[0]).toBeGreaterThanOrEqual(1950);
  });

  it("handles combined query", async () => {
    const result = await parseSearchQuery("medical inventions in Asia after 1900");
    expect(result.categories).toContain("medicine");
    expect(result.region).toBe("Asia");
    expect(result.yearRange?.[0]).toBeGreaterThanOrEqual(1900);
  });

  it("returns empty-like filters for empty query", async () => {
    const result = await parseSearchQuery("");
    expect(result.categories).toBeUndefined();
  });
});
