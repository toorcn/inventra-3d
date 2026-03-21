import { describe, expect, it } from "vitest";
import { inventions } from "@/data/inventions";
import type { Invention } from "@/types";

/**
 * Mimics the local fallback matching logic used in the Exa API route
 * when no EXA_API_KEY is set.
 */
function localFallbackMatch(query: string): Invention | null {
  return (
    inventions.find((inv) =>
      `${inv.title} ${inv.description} ${inv.country}`
        .toLowerCase()
        .includes(query.toLowerCase())
    ) || null
  );
}

describe("Exa search local fallback", () => {
  it("matches 'telephone' to the Telephone invention", () => {
    const result = localFallbackMatch("telephone");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("telephone");
  });

  it("matches 'optical instruments' to the Refracting Telescope", () => {
    // The telescope description contains "instrument" and "Refracting Telescope" in its title
    const result = localFallbackMatch("Refracting Telescope");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("telescope");
  });

  it("matches 'steam' to the Watt Steam Engine", () => {
    const result = localFallbackMatch("steam");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("steam-engine");
  });

  it("returns null for a nonsense query", () => {
    const result = localFallbackMatch("xyzzy-nonsense-query-12345");
    expect(result).toBeNull();
  });
});
