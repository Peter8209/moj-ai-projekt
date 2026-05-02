import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// =====================================================
// ⚙️ CONFIG
// =====================================================
const SEMANTIC_URL = "https://api.semanticscholar.org/graph/v1/paper/search";

// =====================================================
// 🔎 FALLBACK DATA
// =====================================================
const MOCK_SOURCES = [
  {
    title: "Artificial Intelligence in Logistics",
    authors: ["Smith J.", "Doe A."],
    year: 2022,
    abstract: "Study about AI optimization in logistics chains.",
    url: "https://example.com/ai-logistics",
  },
];

// =====================================================
// 📡 POST
// =====================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const action = body.action || "search";
    const query = body.query || "";
    const text = body.text || "";
    const citationStyle = body.citationStyle || "APA";

    // =====================================================
    // 🔎 SEARCH (KONTEXTA LEVEL)
    // =====================================================
    if (action === "search") {

      if (!query || query.length < 3) {
        return Response.json({ error: "QUERY_TOO_SHORT" }, { status: 400 });
      }

      // ================= AI EXPANSION =================
      let queries: string[] = [];

      try {
        const aiRes = await generateText({
          model: openai("gpt-4o-mini"),
          prompt: `
Convert this academic topic into 5 scientific search queries in English.

Return ONLY queries, one per line.

Topic:
${query}
`,
        });

        queries = aiRes.text
          .split("\n")
          .map(q => q.replace(/^\d+\.?\s*/, "").trim())
          .filter(Boolean);

      } catch {
        queries = [query];
      }

      if (!queries.length) queries = [query];

      // ================= MULTI SEARCH =================
      let allResults: any[] = [];

      for (const q of queries) {
        try {
          const url = `${SEMANTIC_URL}?query=${encodeURIComponent(q)}&limit=10&fields=title,abstract,authors,year,url`;

          const res = await fetch(url, {
            headers: {
              "x-api-key": process.env.SEMANTIC_SCHOLAR_API_KEY!,
            },
          });

          const data = await res.json();
          allResults.push(...(data.data || []));

        } catch (err) {
          console.error("Query failed:", q);
        }
      }

      // ================= DEDUPLICATION =================
      const unique = Array.from(
        new Map(allResults.map((item: any) => [item.title, item])).values()
      );

      // ================= MAP =================
      let results = unique.map((p: any, i: number) => ({
        id: i + 1,
        title: p.title,
        authors: (p.authors || []).map((a: any) => a.name),
        year: p.year,
        abstract: p.abstract || "Bez abstraktu",
        url: p.url,
        citation: formatCitation({
          title: p.title,
          authors: (p.authors || []).map((a: any) => a.name),
          year: p.year,
        }, citationStyle),
      }));

      // ================= SORT =================
      results.sort((a, b) => (b.year || 0) - (a.year || 0));

      // ================= FALLBACK =================
      if (!results.length) {
        console.warn("No results → fallback");

        const fallback = MOCK_SOURCES.map((s, i) => ({
          id: i + 1,
          title: s.title,
          authors: s.authors,
          year: s.year,
          abstract: s.abstract,
          url: s.url,
          citation: formatCitation(s, citationStyle),
        }));

        return Response.json({
          ok: true,
          source: "fallback",
          count: fallback.length,
          results: fallback,
        });
      }

      return Response.json({
        ok: true,
        source: "semantic_scholar_multi",
        count: results.length,
        results,
      });
    }

    // =====================================================
    // 🧠 ANALYZE (AI)
    // =====================================================
    if (action === "analyze") {

      if (!text || text.length < 20) {
        return Response.json({ error: "TEXT_TOO_SHORT" }, { status: 400 });
      }

      const prompt = `
Analyzuj akademický text.

Vráť JSON:
{
  "summary": "stručné zhrnutie",
  "key_points": ["bod1", "bod2"],
  "usable_for": "na čo sa dá použiť v práci",
  "citation_hint": "ako ho citovať"
}

Text:
${text}
`;

      const result = await generateText({
        model: openai("gpt-4o-mini"),
        prompt,
      });

      try {
        const parsed = JSON.parse(result.text);

        return Response.json({
          ok: true,
          analysis: parsed,
        });

      } catch {
        return Response.json({
          ok: true,
          analysis: {
            summary: result.text,
            key_points: [],
            usable_for: "",
            citation_hint: "",
          },
        });
      }
    }

    // =====================================================
    // ❌ UNKNOWN
    // =====================================================
    return Response.json({ error: "UNKNOWN_ACTION" }, { status: 400 });

  } catch (err: any) {
    console.error("SOURCES ERROR:", err);

    return Response.json(
      {
        error: "SOURCES_FAILED",
        detail: err?.message || "unknown",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// 📚 CITATION FORMATTER
// =====================================================
function formatCitation(source: any, style: string): string {

  const authors = source.authors?.join(", ") || "Unknown";
  const year = source.year || "n.d.";
  const title = source.title || "Untitled";

  switch (style) {
    case "ISO":
      return `${authors}: ${title}. ${year}.`;

    case "MLA":
      return `${authors}. "${title}." ${year}.`;

    case "HARVARD":
      return `${authors} (${year}) ${title}.`;

    case "APA":
    default:
      return `${authors} (${year}). ${title}.`;
  }
}