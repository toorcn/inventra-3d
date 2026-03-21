import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "@/lib/search-parser";

describe("parseSearchQuery", () => {
  it("extracts category from energy query", async () => {
    const result = await parseSearchQuery("energy inventions");
    expect(result.categories).toContain("energy");
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
    const result = await parseSearchQuery("renewable energy in Asia after 2000");
    expect(result.categories).toContain("energy");
    expect(result.region).toBe("Asia");
    expect(result.yearRange?.[0]).toBeGreaterThanOrEqual(2000);
  });

  it("returns empty-like filters for empty query", async () => {
    const result = await parseSearchQuery("");
    expect(result.categories).toBeUndefined();
  });
});
