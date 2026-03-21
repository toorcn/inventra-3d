import { inventions } from "@/data/inventions";
import { parseSearchQuery } from "@/lib/search-parser";
import type { Invention, SearchFilters } from "@/types";

const REGION_TO_COUNTRIES: Record<string, string[]> = {
  europe: ["GB", "DE", "CH", "SE", "IT", "FR"],
  asia: ["CN", "JP"],
  "north america": ["US"],
  "south america": ["AR"],
  africa: [],
  oceania: ["AU"],
};

function applyFilters(dataset: Invention[], filters: SearchFilters): Invention[] {
  return dataset.filter((invention) => {
    if (filters.categories?.length && !filters.categories.includes(invention.category)) {
      return false;
    }

    if (filters.country && invention.country.toLowerCase() !== filters.country.toLowerCase()) {
      return false;
    }

    if (filters.region) {
      const regionCountries = REGION_TO_COUNTRIES[filters.region.toLowerCase()];
      if (regionCountries && regionCountries.length > 0 && !regionCountries.includes(invention.countryCode)) {
        return false;
      }
    }

    if (filters.yearRange) {
      const [minYear, maxYear] = filters.yearRange;
      if (invention.year < minYear || invention.year > maxYear) {
        return false;
      }
    }

    if (filters.query) {
      const haystack = [
        invention.title,
        invention.description,
        invention.country,
        invention.stateOrProvince,
        invention.category,
        invention.patentNumber,
        invention.inventors.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const terms = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
      if (terms.length && !terms.some((term) => haystack.includes(term))) {
        return false;
      }
    }

    return true;
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { query?: string };
    const query = body.query?.trim() ?? "";
    const filters = await parseSearchQuery(query);
    const matches = applyFilters(inventions, filters);

    return Response.json({
      filters,
      explanation: `Found ${matches.length} inventions matching your search.`,
      inventions: matches,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown search error";
    return Response.json({ error: message }, { status: 500 });
  }
}
