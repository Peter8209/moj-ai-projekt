import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// =====================================================
// CONFIG
// =====================================================
const SEMANTIC_URL = "https://api.semanticscholar.org/graph/v1/paper/search";

const SEMANTIC_FIELDS = [
  "paperId",
  "title",
  "abstract",
  "authors",
  "year",
  "url",
  "openAccessPdf",
  "isOpenAccess",
  "publicationTypes",
  "publicationDate",
  "externalIds",
].join(",");

// =====================================================
// FALLBACK DATA
// =====================================================
const MOCK_SOURCES = [
  {
    title: "Artificial Intelligence in Logistics",
    authors: ["Smith J.", "Doe A."],
    year: 2022,
    abstract: "Study about AI optimization in logistics chains.",
    url: "https://example.com/ai-logistics",
    openAccessPdf: null,
    isOpenAccess: false,
  },
];

// =====================================================
// POST
// =====================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const action = body.action || "search";
    const query = String(body.query || "").trim();
    const text = String(body.text || "").trim();
    const citationStyle = body.citationStyle || "APA";

    const onlyPdf = Boolean(body.onlyPdf);

    const yearFromNumber =
      body.yearFromNumber ||
      extractYear(body.yearFrom) ||
      null;

    const yearToNumber =
      body.yearToNumber ||
      extractYear(body.yearTo) ||
      null;

    const semanticYear = buildSemanticScholarYearParam(
      yearFromNumber,
      yearToNumber
    );

    // =====================================================
    // SUGGESTIONS
    // =====================================================
    if (action === "suggest") {
      if (!query || query.length < 3) {
        return Response.json({
          ok: true,
          suggestions: [],
        });
      }

      try {
        const aiRes = await generateText({
          model: openai("gpt-4o-mini"),
          prompt: `
Convert this academic topic into 3 short scientific search queries in English.

Rules:
- Return ONLY the queries.
- One query per line.
- No numbering.
- No explanations.

Topic:
${query}
`,
        });

        const suggestions = aiRes.text
          .split("\n")
          .map((q) => q.replace(/^\d+\.?\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 3);

        return Response.json({
          ok: true,
          suggestions,
        });
      } catch {
        return Response.json({
          ok: true,
          suggestions: [query],
        });
      }
    }

    // =====================================================
    // SEARCH
    // =====================================================
    if (action === "search") {
      if (!query || query.length < 3) {
        return Response.json(
          { error: "QUERY_TOO_SHORT" },
          { status: 400 }
        );
      }

      // ================= AI EXPANSION =================
      let queries: string[] = [];

      try {
        const aiRes = await generateText({
          model: openai("gpt-4o-mini"),
          prompt: `
Convert this academic topic into 5 scientific search queries in English.

Rules:
- Return ONLY search queries.
- One query per line.
- No numbering.
- No explanations.

Topic:
${query}
`,
        });

        queries = aiRes.text
          .split("\n")
          .map((q) => q.replace(/^\d+\.?\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 5);
      } catch {
        queries = [query];
      }

      if (!queries.length) queries = [query];

      // ================= MULTI SEARCH =================
      let allResults: any[] = [];

      for (const q of queries) {
        try {
          const params = new URLSearchParams();

          params.set("query", q);
          params.set("limit", "10");
          params.set("fields", SEMANTIC_FIELDS);

          // DÔLEŽITÉ: tu sa konečne posiela rok do Semantic Scholar
          if (semanticYear) {
            params.set("year", semanticYear);
          }

          const url = `${SEMANTIC_URL}?${params.toString()}`;

          const headers: HeadersInit = {};

          if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
            headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;
          }

          const res = await fetch(url, {
            method: "GET",
            headers,
            cache: "no-store",
          });

          if (!res.ok) {
            console.error("Semantic Scholar failed:", {
              query: q,
              status: res.status,
              text: await safeText(res),
            });

            continue;
          }

          const data = await res.json();

          if (Array.isArray(data.data)) {
            allResults.push(...data.data);
          }
        } catch (err) {
          console.error("Query failed:", q, err);
        }
      }

      // ================= DEDUPLICATION =================
      const unique = Array.from(
        new Map(
          allResults.map((item: any) => [
            item.paperId || item.title,
            item,
          ])
        ).values()
      );

      // ================= MAP =================
      let results = unique.map((p: any, i: number) => {
        const authors = Array.isArray(p.authors)
          ? p.authors.map((a: any) => a.name).filter(Boolean)
          : [];

        const pdfUrl = p.openAccessPdf?.url || null;

        const isPdf =
          Boolean(pdfUrl) ||
          Boolean(p.isOpenAccess && pdfUrl) ||
          Boolean(String(p.url || "").toLowerCase().includes(".pdf"));

        return {
          id: i + 1,
          paperId: p.paperId,
          title: p.title || "Untitled",
          authors,
          year: p.year || null,
          publicationDate: p.publicationDate || null,
          abstract: p.abstract || "Bez abstraktu",
          url: p.url || pdfUrl || null,

          // DÔLEŽITÉ PRE FRONTEND FILTER
          isPdf,
          pdfUrl,
          openAccessPdf: p.openAccessPdf || null,
          isOpenAccess: Boolean(p.isOpenAccess),

          publicationTypes: p.publicationTypes || [],
          externalIds: p.externalIds || {},

          citation: formatCitation(
            {
              title: p.title,
              authors,
              year: p.year,
            },
            citationStyle
          ),
        };
      });

      // ================= BACKEND YEAR FILTER SAFETY =================
      results = results.filter((item) => {
        const y = Number(item.year);

        if (yearFromNumber && y && y < Number(yearFromNumber)) return false;
        if (yearToNumber && y && y > Number(yearToNumber)) return false;

        return true;
      });

      // ================= BACKEND PDF FILTER =================
      if (onlyPdf) {
        results = results.filter((item) => item.isPdf === true);
      }

      // ================= SORT =================
      results.sort((a, b) => (b.year || 0) - (a.year || 0));

      // ================= FALLBACK =================
      if (!results.length) {
        console.warn("No results after filters.");

        return Response.json({
          ok: true,
          source: "empty",
          count: 0,
          filters: {
            yearFromNumber,
            yearToNumber,
            semanticYear,
            onlyPdf,
          },
          results: [],
        });
      }

      return Response.json({
        ok: true,
        source: "semantic_scholar_multi",
        count: results.length,
        filters: {
          yearFromNumber,
          yearToNumber,
          semanticYear,
          onlyPdf,
        },
        results,
      });
    }

    // =====================================================
    // ANALYZE
    // =====================================================
    if (action === "analyze") {
      if (!text || text.length < 20) {
        return Response.json(
          { error: "TEXT_TOO_SHORT" },
          { status: 400 }
        );
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
    // UNKNOWN
    // =====================================================
    return Response.json(
      { error: "UNKNOWN_ACTION" },
      { status: 400 }
    );
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
// HELPERS
// =====================================================
function extractYear(value: any): number | null {
  if (!value) return null;

  const match = String(value).match(/\d{4}/);
  if (!match) return null;

  const year = Number(match[0]);

  if (!Number.isFinite(year)) return null;
  if (year < 1900 || year > 2100) return null;

  return year;
}

function buildSemanticScholarYearParam(
  from: number | null,
  to: number | null
): string | null {
  if (from && to) return `${from}-${to}`;
  if (from && !to) return `${from}-`;
  if (!from && to) return `-${to}`;
  return null;
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

// =====================================================
// CITATION FORMATTER
// =====================================================
function formatCitation(source: any, style: string): string {
  const authors = source.authors?.length
    ? source.authors.join(", ")
    : "Unknown";

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