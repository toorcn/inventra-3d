import { inventions } from "@/data/inventions";
import { chatCompletion } from "@/lib/openrouter";
import { searchInventions } from "@/lib/exa-search";
import { NextRequest, NextResponse } from "next/server";

type ExaSearchResult = {
  inventionId: "telephone" | "iphone" | "steam-engine" | "telescope" | null;
  lat: number;
  lng: number;
  regionName: string;
};

const KNOWN_INVENTIONS = [
  { id: "telephone", year: 1876, city: "Boston", lat: 42.3601, lng: -71.0589 },
  { id: "iphone", year: 2007, city: "Cupertino", lat: 37.3318, lng: -122.0312 },
  { id: "steam-engine", year: 1769, city: "Birmingham", lat: 52.4862, lng: -1.8904 },
  { id: "telescope", year: 1609, city: "Padua", lat: 45.4064, lng: 11.8768 },
];

function localFallback(query: string): ExaSearchResult {
  const q = query.toLowerCase();
  for (const inv of inventions) {
    const searchable = `${inv.title} ${inv.description} ${inv.country}`.toLowerCase();
    if (searchable.includes(q) || q.includes(inv.title.toLowerCase())) {
      const known = KNOWN_INVENTIONS.find((k) => k.id === inv.id);
      return {
        inventionId: inv.id as ExaSearchResult["inventionId"],
        lat: known?.lat ?? inv.location.lat,
        lng: known?.lng ?? inv.location.lng,
        regionName: inv.location.label,
      };
    }
  }
  return { inventionId: null, lat: 0, lng: 0, regionName: "" };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = body?.query ?? "";

    if (!query.trim()) {
      return NextResponse.json({ inventionId: null, lat: 0, lng: 0, regionName: "" });
    }

    // No EXA_API_KEY — use local fallback
    if (!process.env.EXA_API_KEY) {
      return NextResponse.json(localFallback(query));
    }

    // Call Exa semantic search
    const exaResults = await searchInventions(query);

    // Use OpenRouter to extract structured data from Exa results
    const context = exaResults
      .map((r, i) => `Result ${i + 1}: ${r.title ?? ""} — ${r.url}`)
      .join("\n");

    const prompt = `You are helping identify which of our known inventions best matches a search query.

Known inventions:
- telephone (1876, Boston, USA) — lat: 42.3601, lng: -71.0589
- iphone (2007, Cupertino, USA) — lat: 37.3318, lng: -122.0312
- steam-engine (1769, Birmingham, UK) — lat: 52.4862, lng: -1.8904
- telescope (1609, Padua, Italy) — lat: 45.4064, lng: 11.8768

User query: "${query}"

Exa search results:
${context}

Based on the query and Exa results, identify which invention (if any) is the best match.
Respond with ONLY valid JSON in this exact format:
{ "inventionId": "telephone"|"iphone"|"steam-engine"|"telescope"|null, "lat": <number>, "lng": <number>, "regionName": "<string>" }

If none of the known inventions match, set inventionId to null and lat/lng to 0.`;

    const raw = await chatCompletion(
      [{ role: "user", content: prompt }],
      { temperature: 0, max_tokens: 150 },
    );

    // Extract JSON from the response (strip markdown fences if present)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(localFallback(query));
    }

    const parsed = JSON.parse(jsonMatch[0]) as ExaSearchResult;
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[exa-search] error:", err);
    return NextResponse.json(
      { inventionId: null, lat: 0, lng: 0, regionName: "" },
      { status: 500 },
    );
  }
}
