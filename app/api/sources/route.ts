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
    // 🔎 SEARCH (Semantic Scholar)
    // =====================================================
    if (action === "search") {

      if (!query || query.length < 3) {
        return Response.json({ error: "QUERY_TOO_SHORT" }, { status: 400 });
      }

      try {
        const url = `${SEMANTIC_URL}?query=${encodeURIComponent(query)}&limit=10&fields=title,abstract,authors,year,url`;

        const res = await fetch(url, {
          headers: {
            "x-api-key": process.env.SEMANTIC_SCHOLAR_API_KEY!,
          },
        });

        const data = await res.json();

        const results = (data.data || []).map((p: any, i: number) => ({
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

        return Response.json({
          ok: true,
          source: "semantic_scholar",
          count: results.length,
          results,
        });

      } catch (apiErr) {
        console.error("Semantic Scholar failed → fallback");

        // 🔥 fallback
        const results = MOCK_SOURCES.map((s, i) => ({
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
          count: results.length,
          results,
        });
      }
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