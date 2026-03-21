import { inventions } from "@/data/inventions";
import { describe, expect, it } from "vitest";

describe("inventions dataset", () => {
  it("ships a diverse first-pass globe catalog", () => {
    expect(inventions.length).toBeGreaterThanOrEqual(25);

    const countries = new Set(inventions.map((invention) => invention.countryCode));
    const usStates = new Set(
      inventions
        .filter((invention) => invention.countryCode === "US")
        .map((invention) => invention.stateOrProvince),
    );

    expect(countries.size).toBeGreaterThanOrEqual(10);
    expect(usStates.size).toBeGreaterThanOrEqual(6);
  });

  it("provides stable local imagery and valid coordinates for every invention", () => {
    const ids = new Set<string>();

    inventions.forEach((invention) => {
      expect(ids.has(invention.id)).toBe(false);
      ids.add(invention.id);

      expect(Number.isFinite(invention.location.lat)).toBe(true);
      expect(Number.isFinite(invention.location.lng)).toBe(true);
      expect(invention.imageSrc.startsWith("/")).toBe(true);
      expect(invention.imageAlt.length).toBeGreaterThan(10);
      expect(invention.imageSourceUrl.startsWith("https://")).toBe(true);
      expect(invention.sourceUrl.startsWith("https://")).toBe(true);
    });
  });
});
