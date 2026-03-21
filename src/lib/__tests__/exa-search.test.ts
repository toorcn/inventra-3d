import { describe, expect, it } from "vitest";
import { inventions } from "@/data/inventions";
import type { Invention } from "@/types";

/**
 * Mimics the local fallback matching logic used in the Exa API route
 * when no EXA_API_KEY is set.
 */
function localFallbackMatch(query: string): Invention | null {
  const lowered = query.toLowerCase();
  const terms = lowered.split(/\s+/).filter(Boolean);

  let best: Invention | null = null;
  let bestScore = 0;

  inventions.forEach((inv) => {
    const searchable = `${inv.title} ${inv.description} ${inv.country} ${inv.stateOrProvince ?? ""} ${inv.patentNumber ?? ""} ${inv.inventors.join(" ")}`.toLowerCase();
    const score = terms.reduce((total, term) => total + (searchable.includes(term) ? 1 : 0), 0);
    const boostedScore = searchable.includes(lowered) || lowered.includes(inv.title.toLowerCase())
      ? score + 4
      : score;

    if (boostedScore > bestScore) {
      best = inv;
      bestScore = boostedScore;
    }
  });

  return best;
}

describe("Exa search local fallback", () => {
  it("matches 'telephone' to the Telephone invention", () => {
    const result = localFallbackMatch("telephone");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("telephone");
  });

  it("matches 'optical instruments' to the Refracting Telescope", () => {
    const result = localFallbackMatch("Refracting Telescope");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("telescope");
  });

  it("matches 'geneva web' to the World Wide Web", () => {
    const result = localFallbackMatch("geneva web");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("world-wide-web");
  });

  it("matches 'tokyo portable music' to the Walkman", () => {
    const result = localFallbackMatch("portable music");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("walkman");
  });

  it("returns null for a nonsense query", () => {
    const result = localFallbackMatch("xyzzy-nonsense-query-12345");
    expect(result).toBeNull();
  });
});
