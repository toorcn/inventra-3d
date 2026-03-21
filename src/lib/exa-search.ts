import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY!);

export async function searchInventions(query: string) {
  const results = await exa.search(query, {
    type: "neural",
    numResults: 5,
    includeDomains: ["patents.google.com", "lens.org", "espacenet.com", "en.wikipedia.org"],
    useAutoprompt: true,
  });
  return results.results;
}
