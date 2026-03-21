import { countries } from "@/data/countries";
import type { CategoryId, SearchFilters } from "@/types";
import { structuredOutput } from "./openrouter";

const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  communications: ["communications", "telephone", "phone", "radio", "telegraph", "signal"],
  optics: ["optics", "telescope", "lens", "light", "microscope", "vision"],
  mechanical: ["mechanical", "engine", "steam", "gear", "machine", "piston"],
  "consumer-electronics": ["electronics", "iphone", "smartphone", "device", "mobile", "gadget"],
  transportation: ["transportation", "airplane", "flight", "aviation", "jet", "vehicle"],
  medicine: ["medicine", "medical", "vaccine", "scanner", "hospital", "diagnostic"],
  computing: ["computing", "computer", "chip", "transistor", "web", "code", "digital"],
  materials: ["materials", "paper", "fabric", "zipper", "dynamite", "manufacturing"],
};

const REGIONS = ["Europe", "Asia", "North America", "South America", "Africa", "Oceania"];

function parseYearRange(query: string): [number, number] | undefined {
  const lower = query.toLowerCase();
  const currentYear = new Date().getFullYear();

  const afterMatch = lower.match(/after\s+(\d{4})/);
  if (afterMatch) {
    return [Number(afterMatch[1]), currentYear];
  }

  const beforeMatch = lower.match(/before\s+(\d{4})/);
  if (beforeMatch) {
    return [0, Number(beforeMatch[1])];
  }

  const betweenMatch = lower.match(/between\s+(\d{4})\s+and\s+(\d{4})/);
  if (betweenMatch) {
    return [Number(betweenMatch[1]), Number(betweenMatch[2])];
  }

  return undefined;
}

function parseWithHeuristics(query: string): SearchFilters {
  const normalized = query.trim();
  if (!normalized) {
    return {};
  }

  const lowered = normalized.toLowerCase();
  const categories = (Object.keys(CATEGORY_KEYWORDS) as CategoryId[]).filter((category) =>
    CATEGORY_KEYWORDS[category].some((keyword) => lowered.includes(keyword)),
  );

  const region = REGIONS.find((candidate) => lowered.includes(candidate.toLowerCase()));
  const country = countries.find(
    (candidate) =>
      lowered.includes(candidate.name.toLowerCase()) || lowered.includes(candidate.code.toLowerCase()),
  )?.name;

  const yearRange = parseYearRange(lowered);

  const filters: SearchFilters = {
    query: normalized,
  };

  if (categories.length > 0) {
    filters.categories = categories;
  }
  if (region) {
    filters.region = region;
  }
  if (country) {
    filters.country = country;
  }
  if (yearRange) {
    filters.yearRange = yearRange;
  }

  return filters;
}

export async function parseSearchQuery(query: string): Promise<SearchFilters> {
  const normalized = query.trim();
  if (!normalized) {
    return {};
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return parseWithHeuristics(normalized);
  }

  try {
    const parsed = await structuredOutput<SearchFilters>(
      [
        {
          role: "system",
          content:
            "Extract structured invention search filters from user query. Use only allowed categories and return JSON matching schema.",
        },
        { role: "user", content: normalized },
      ],
      {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "communications",
                "optics",
                "mechanical",
                "consumer-electronics",
                "transportation",
                "medicine",
                "computing",
                "materials",
              ],
            },
          },
          region: { type: "string" },
          yearRange: {
            type: "array",
            items: { type: "number" },
            minItems: 2,
            maxItems: 2,
          },
          country: { type: "string" },
        },
        additionalProperties: false,
      },
    );

    return { ...parsed, query: normalized };
  } catch {
    return parseWithHeuristics(normalized);
  }
}
