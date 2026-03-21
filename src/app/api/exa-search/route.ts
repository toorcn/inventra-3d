import { inventions } from "@/data/inventions";
import { chatCompletion } from "@/lib/openrouter";
import { searchInventions } from "@/lib/exa-search";
import { NextRequest, NextResponse } from "next/server";

type ExaSearchResult = {
  inventionId: string | null;
  lat: number;
  lng: number;
  regionName: string;
};

function localFallback(query: string): ExaSearchResult {
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  let bestMatch: ExaSearchResult | null = null;
  let bestScore = 0;

  for (const inv of inventions) {
    const searchable = [
      inv.title,
      inv.description,
      inv.country,
      inv.stateOrProvince,
      inv.patentNumber,
      inv.inventors.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const score = terms.reduce((total, term) => total + (searchable.includes(term) ? 1 : 0), 0);
    const boostedScore = searchable.includes(q) || q.includes(inv.title.toLowerCase())
      ? score + 4
      : score;

    if (boostedScore > bestScore) {
      bestScore = boostedScore;
      bestMatch = {
        inventionId: inv.id,
        lat: inv.location.lat,
        lng: inv.location.lng,
        regionName: inv.location.label,
      };
    }
  }

  return bestMatch ?? { inventionId: null, lat: 0, lng: 0, regionName: "" };
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
    const knownInventions = inventions
      .map((inv) => `- ${inv.id} (${inv.year}, ${inv.location.label}, ${inv.country}) — lat: ${inv.location.lat}, lng: ${inv.location.lng}`)
      .join("\n");

    const prompt = `You are helping identify which of our known inventions best matches a search query.

Known inventions:
${knownInventions}

User query: "${query}"

Exa search results:
${context}

Based on the query and Exa results, identify which invention (if any) is the best match.
Respond with ONLY valid JSON in this exact format:
{ "inventionId": "<known invention id>"|null, "lat": <number>, "lng": <number>, "regionName": "<string>" }

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
