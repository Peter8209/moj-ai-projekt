import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// =====================================================
// 🔎 MOCK DATA (fallback keď API nefunguje)
// =====================================================
const MOCK_SOURCES = [
  {
    title: "Artificial Intelligence in Logistics",
    authors: ["Smith J.", "Doe A."],
    year: 2022,
    abstract: "Study about AI optimization in logistics chains.",
    url: "https://example.com/ai-logistics",
  },
  {
    title: "Automation in Industry 4.0",
    authors: ["Novák P."],
    year: 2021,
    abstract: "Industrial automation and smart factories.",
    url: "https://example.com/industry4",
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
    // 🔎 SEARCH SOURCES
    // =====================================================
    if (action === "search") {

      if (!query || query.length < 3) {
        return Response.json({ error: "QUERY_TOO_SHORT" }, { status: 400 });
      }

      // =========================================
      // 🔥 TU NAPOJÍŠ Semantic Scholar API
      // =========================================
      // teraz fallback:

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

    // =====================================================
    // 🧠 ANALYZE SOURCE (AI SUMMARY)
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
            summary: "Nepodarilo sa presne analyzovať",
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

  const authors = source.authors.join(", ");
  const year = source.year;
  const title = source.title;

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