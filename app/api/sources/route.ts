import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

// =====================================================
// CONFIG
// =====================================================
export const runtime = 'nodejs';
export const maxDuration = 90;

const SEMANTIC_URL = 'https://api.semanticscholar.org/graph/v1/paper/search';

const SEMANTIC_FIELDS = [
  'paperId',
  'title',
  'abstract',
  'authors',
  'year',
  'url',
  'openAccessPdf',
  'isOpenAccess',
  'publicationTypes',
  'publicationDate',
  'externalIds',
].join(',');

const OPENALEX_API_KEY = process.env.OPENALEX_API_KEY || '';
const SEMANTIC_SCHOLAR_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY || '';
const CORE_API_KEY = process.env.CORE_API_KEY || '';
const UNPAYWALL_EMAIL = process.env.UNPAYWALL_EMAIL || 'info@zedpera.com';

const DEFAULT_SELECTED_SOURCES = [
  'openalex',
  'semanticScholar',
  'crossref',
  'core',
  'europePmc',
  'arxiv',
];

// =====================================================
// TYPES
// =====================================================
type SearchBody = {
  action?: 'search' | 'suggest' | 'analyze';
  query?: string;
  text?: string;
  citationStyle?: 'APA' | 'ISO' | 'MLA' | 'HARVARD' | string;
  onlyPdf?: boolean;
  yearFrom?: string;
  yearTo?: string;
  yearFromNumber?: number | string | null;
  yearToNumber?: number | string | null;
  selectedSources?: string[];
};

type NormalizedSource = {
  id: string;
  paperId?: string | null;
  source: string;
  sourceKey: string;
  title: string;
  authors: string[];
  year: number | null;
  publicationDate: string | null;
  abstract: string;
  url: string | null;
  isPdf: boolean;
  pdfUrl: string | null;
  openAccessPdf?: any;
  isOpenAccess: boolean;
  publicationTypes: string[];
  externalIds: Record<string, any>;
  doi?: string | null;
  citation?: string;
};

// =====================================================
// POST
// =====================================================
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SearchBody;

    const action = body.action || 'search';
    const query = String(body.query || '').trim();
    const text = String(body.text || '').trim();
    const citationStyle = body.citationStyle || 'APA';

    const onlyPdf = Boolean(body.onlyPdf);

    const yearFromNumber =
      normalizeYear(body.yearFromNumber) ||
      extractYear(body.yearFrom) ||
      null;

    const yearToNumber =
      normalizeYear(body.yearToNumber) ||
      extractYear(body.yearTo) ||
      null;

    const semanticYear = buildSemanticScholarYearParam(
      yearFromNumber,
      yearToNumber,
    );

    const selectedSources =
      Array.isArray(body.selectedSources) && body.selectedSources.length > 0
        ? body.selectedSources
        : DEFAULT_SELECTED_SOURCES;

    // =====================================================
    // SUGGESTIONS
    // =====================================================
    if (action === 'suggest') {
      if (!query || query.length < 3) {
        return Response.json({
          ok: true,
          suggestions: [],
        });
      }

      try {
        const aiRes = await generateText({
          model: openai('gpt-4o-mini'),
          prompt: `
Convert this academic topic into 3 short scientific search queries in English.

Rules:
- Return ONLY the queries.
- One query per line.
- No numbering.
- No explanations.
- Use professional academic terminology.

Topic:
${query}
`,
        });

        const suggestions = aiRes.text
          .split('\n')
          .map((q) => q.replace(/^\d+\.?\s*/, '').trim())
          .filter(Boolean)
          .slice(0, 3);

        return Response.json({
          ok: true,
          suggestions,
        });
      } catch {
        return Response.json({
          ok: true,
          suggestions: [
            `${query} systematic review`,
            `${query} recent studies`,
            `${query} empirical research`,
          ],
        });
      }
    }

    // =====================================================
    // SEARCH
    // =====================================================
    if (action === 'search') {
      if (!query || query.length < 3) {
        return Response.json(
          {
            ok: false,
            error: 'QUERY_TOO_SHORT',
          },
          { status: 400 },
        );
      }

      // ================= AI EXPANSION =================
      let queries: string[] = [];

      try {
        const aiRes = await generateText({
          model: openai('gpt-4o-mini'),
          prompt: `
Convert this academic topic into 5 scientific search queries in English.

Rules:
- Return ONLY search queries.
- One query per line.
- No numbering.
- No explanations.
- Prefer keywords suitable for academic databases.
- Keep each query short and searchable.

Topic:
${query}
`,
        });

        queries = aiRes.text
          .split('\n')
          .map((q) => q.replace(/^\d+\.?\s*/, '').trim())
          .filter(Boolean)
          .slice(0, 5);
      } catch {
        queries = [query];
      }

      if (!queries.length) {
        queries = [query];
      }

      // ================= MULTI DATABASE SEARCH =================
      const searchTasks: Promise<NormalizedSource[]>[] = [];

      for (const q of queries) {
        if (selectedSources.includes('openalex')) {
          searchTasks.push(searchOpenAlex(q, yearFromNumber, yearToNumber));
        }

        if (selectedSources.includes('semanticScholar')) {
          searchTasks.push(
            searchSemanticScholar(q, semanticYear, yearFromNumber, yearToNumber),
          );
        }

        if (selectedSources.includes('crossref')) {
          searchTasks.push(searchCrossref(q, yearFromNumber, yearToNumber));
        }

        if (selectedSources.includes('core')) {
          searchTasks.push(searchCore(q, yearFromNumber, yearToNumber));
        }

        if (selectedSources.includes('europePmc')) {
          searchTasks.push(searchEuropePmc(q, yearFromNumber, yearToNumber));
        }

        // arXiv voláme iba pre prvý dotaz, aby nevznikal 429 Rate exceeded.
        if (selectedSources.includes('arxiv') && q === queries[0]) {
          searchTasks.push(searchArxiv(q, yearFromNumber, yearToNumber));
        }
      }

      const settled = await Promise.allSettled(searchTasks);

      let allResults = settled.flatMap((item) =>
        item.status === 'fulfilled' ? item.value : [],
      );

      // ================= UNPAYWALL PDF ENRICHMENT =================
      allResults = await enrichWithUnpaywall(allResults);

      // ================= DEDUPLICATION =================
      let results = dedupeResults(allResults);

      // ================= BACKEND YEAR FILTER SAFETY =================
      results = results.filter((item) => {
        const y = Number(item.year);

        if (yearFromNumber && y && y < Number(yearFromNumber)) return false;
        if (yearToNumber && y && y > Number(yearToNumber)) return false;

        return true;
      });

      // ================= BACKEND PDF FILTER =================
      if (onlyPdf) {
        results = results.filter(
          (item) => item.isPdf === true || Boolean(item.pdfUrl),
        );
      }

      // ================= CITATIONS =================
      results = results.map((item) => ({
        ...item,
        citation: formatCitation(
          {
            title: item.title,
            authors: item.authors,
            year: item.year,
          },
          citationStyle,
        ),
      }));

      // ================= SORT =================
      results.sort((a, b) => {
        const pdfScore =
          Number(Boolean(b.pdfUrl || b.isPdf)) -
          Number(Boolean(a.pdfUrl || a.isPdf));

        if (pdfScore !== 0) return pdfScore;

        const openScore =
          Number(Boolean(b.isOpenAccess)) -
          Number(Boolean(a.isOpenAccess));

        if (openScore !== 0) return openScore;

        return (b.year || 0) - (a.year || 0);
      });

      // ================= FRONTEND COMPATIBLE ID =================
      const finalResults = results.map((item, index) => ({
        ...item,
        id: index + 1,
        originalId: item.id,
      }));

      return Response.json({
        ok: true,
        source: 'multi_database',
        count: finalResults.length,
        databases: {
          openalex: selectedSources.includes('openalex'),
          semanticScholar: selectedSources.includes('semanticScholar'),
          crossref: selectedSources.includes('crossref'),
          core: selectedSources.includes('core'),
          europePmc: selectedSources.includes('europePmc'),
          arxiv: selectedSources.includes('arxiv'),
          unpaywall: true,
        },
        filters: {
          yearFromNumber,
          yearToNumber,
          semanticYear,
          onlyPdf,
          selectedSources,
        },
        results: finalResults,
      });
    }

    // =====================================================
    // ANALYZE
    // =====================================================
    if (action === 'analyze') {
      if (!text || text.length < 20) {
        return Response.json(
          {
            ok: false,
            error: 'TEXT_TOO_SHORT',
          },
          { status: 400 },
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
        model: openai('gpt-4o-mini'),
        prompt,
      });

      try {
        const cleaned = cleanJsonText(result.text);
        const parsed = JSON.parse(cleaned);

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
            usable_for: '',
            citation_hint: '',
          },
        });
      }
    }

    // =====================================================
    // UNKNOWN ACTION
    // =====================================================
    return Response.json(
      {
        ok: false,
        error: 'UNKNOWN_ACTION',
      },
      { status: 400 },
    );
  } catch (err: any) {
    console.error('SOURCES ERROR:', err);

    return Response.json(
      {
        ok: false,
        error: 'SOURCES_FAILED',
        detail: err?.message || 'unknown',
      },
      { status: 500 },
    );
  }
}

// =====================================================
// OPENALEX
// =====================================================
async function searchOpenAlex(
  query: string,
  yearFrom: number | null,
  yearTo: number | null,
): Promise<NormalizedSource[]> {
  try {
    const params = new URLSearchParams();

    params.set('search', query);
    params.set('per-page', '10');
    params.set('sort', 'relevance_score:desc');

    if (OPENALEX_API_KEY) {
      params.set('api_key', OPENALEX_API_KEY);
    }

    const filters: string[] = [];

    if (yearFrom) filters.push(`from_publication_date:${yearFrom}-01-01`);
    if (yearTo) filters.push(`to_publication_date:${yearTo}-12-31`);

    if (filters.length > 0) {
      params.set('filter', filters.join(','));
    }

    const url = `https://api.openalex.org/works?${params.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('OpenAlex failed:', {
        query,
        status: res.status,
        text: await safeText(res),
      });

      return [];
    }

    const data = await res.json();

    return (data.results || []).map((p: any): NormalizedSource => {
      const doi = normalizeDoi(p.doi);

      const authors = Array.isArray(p.authorships)
        ? p.authorships
            .map((a: any) => a?.author?.display_name)
            .filter(Boolean)
            .slice(0, 8)
        : [];

      const pdfUrl =
        p.primary_location?.pdf_url ||
        p.best_oa_location?.pdf_url ||
        p.open_access?.oa_url ||
        null;

      const url =
        p.primary_location?.landing_page_url ||
        p.best_oa_location?.landing_page_url ||
        p.doi ||
        p.id ||
        null;

      return {
        id: `openalex-${p.id || p.doi || p.display_name}`,
        paperId: p.id || null,
        source: 'OpenAlex',
        sourceKey: 'openalex',
        title: cleanText(p.display_name) || 'Untitled',
        authors,
        year: p.publication_year || null,
        publicationDate: p.publication_date || null,
        abstract:
          reconstructOpenAlexAbstract(p.abstract_inverted_index) ||
          'Bez abstraktu',
        url,
        isPdf: Boolean(pdfUrl),
        pdfUrl,
        openAccessPdf: pdfUrl ? { url: pdfUrl } : null,
        isOpenAccess: Boolean(p.open_access?.is_oa || pdfUrl),
        publicationTypes: p.type ? [p.type] : [],
        externalIds: {
          DOI: doi,
          OpenAlex: p.id,
        },
        doi,
      };
    });
  } catch (err) {
    console.error('OpenAlex query failed:', query, err);
    return [];
  }
}

// =====================================================
// SEMANTIC SCHOLAR
// =====================================================
async function searchSemanticScholar(
  query: string,
  semanticYear: string | null,
  yearFrom: number | null,
  yearTo: number | null,
): Promise<NormalizedSource[]> {
  try {
    const params = new URLSearchParams();

    params.set('query', query);
    params.set('limit', '10');
    params.set('fields', SEMANTIC_FIELDS);

    if (semanticYear) {
      params.set('year', semanticYear);
    }

    const headers: HeadersInit = {
      Accept: 'application/json',
    };

    if (SEMANTIC_SCHOLAR_API_KEY) {
      headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY;
    }

    const url = `${SEMANTIC_URL}?${params.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Semantic Scholar failed:', {
        query,
        status: res.status,
        text: await safeText(res),
      });

      return [];
    }

    const data = await res.json();

    if (!Array.isArray(data.data)) return [];

    return data.data
      .map((p: any): NormalizedSource => {
        const authors = Array.isArray(p.authors)
          ? p.authors.map((a: any) => a.name).filter(Boolean).slice(0, 8)
          : [];

        const pdfUrl = p.openAccessPdf?.url || null;
        const doi = normalizeDoi(p.externalIds?.DOI);

        const isPdf =
          Boolean(pdfUrl) ||
          Boolean(String(p.url || '').toLowerCase().includes('.pdf'));

        return {
          id: `semantic-${p.paperId || p.title}`,
          paperId: p.paperId || null,
          source: 'Semantic Scholar',
          sourceKey: 'semanticScholar',
          title: cleanText(p.title) || 'Untitled',
          authors,
          year: p.year || null,
          publicationDate: p.publicationDate || null,
          abstract: cleanText(p.abstract) || 'Bez abstraktu',
          url: p.url || pdfUrl || null,
          isPdf,
          pdfUrl,
          openAccessPdf: p.openAccessPdf || null,
          isOpenAccess: Boolean(p.isOpenAccess || pdfUrl),
          publicationTypes: p.publicationTypes || [],
          externalIds: p.externalIds || {},
          doi,
        };
      })
      .filter((item: NormalizedSource) => {
        if (yearFrom && item.year && item.year < yearFrom) return false;
        if (yearTo && item.year && item.year > yearTo) return false;
        return true;
      });
  } catch (err) {
    console.error('Semantic Scholar query failed:', query, err);
    return [];
  }
}

// =====================================================
// CROSSREF
// =====================================================
async function searchCrossref(
  query: string,
  yearFrom: number | null,
  yearTo: number | null,
): Promise<NormalizedSource[]> {
  try {
    const params = new URLSearchParams();

    params.set('query.bibliographic', query);
    params.set('rows', '10');
    params.set('sort', 'relevance');

    const filters: string[] = [];

    if (yearFrom) filters.push(`from-pub-date:${yearFrom}-01-01`);
    if (yearTo) filters.push(`until-pub-date:${yearTo}-12-31`);

    if (filters.length > 0) {
      params.set('filter', filters.join(','));
    }

    const url = `https://api.crossref.org/works?${params.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': `Zedpera/1.0 (mailto:${UNPAYWALL_EMAIL})`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Crossref failed:', {
        query,
        status: res.status,
        text: await safeText(res),
      });

      return [];
    }

    const data = await res.json();

    return (data.message?.items || []).map((p: any): NormalizedSource => {
      const year =
        p.published?.['date-parts']?.[0]?.[0] ||
        p.issued?.['date-parts']?.[0]?.[0] ||
        null;

      const publicationDate = buildDateFromParts(
        p.published?.['date-parts']?.[0] || p.issued?.['date-parts']?.[0],
      );

      const authors = Array.isArray(p.author)
        ? p.author
            .map((a: any) => `${a.given || ''} ${a.family || ''}`.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];

      const doi = normalizeDoi(p.DOI);

      return {
        id: `crossref-${p.DOI || p.URL || p.title?.[0]}`,
        paperId: p.DOI || null,
        source: 'Crossref',
        sourceKey: 'crossref',
        title: cleanText(p.title?.[0]) || 'Untitled',
        authors,
        year,
        publicationDate,
        abstract: cleanText(p.abstract) || 'Bez abstraktu',
        url: p.URL || (doi ? `https://doi.org/${doi}` : null),
        isPdf: false,
        pdfUrl: null,
        openAccessPdf: null,
        isOpenAccess: Boolean(p.license?.length),
        publicationTypes: p.type ? [String(p.type)] : [],
        externalIds: {
          DOI: doi,
          ISSN: p.ISSN,
          ISBN: p.ISBN,
        },
        doi,
      };
    });
  } catch (err) {
    console.error('Crossref query failed:', query, err);
    return [];
  }
}

// =====================================================
// CORE
// =====================================================
async function searchCore(
  query: string,
  yearFrom: number | null,
  yearTo: number | null,
): Promise<NormalizedSource[]> {
  try {
    if (!CORE_API_KEY) {
      return [];
    }

    const res = await fetch('https://api.core.ac.uk/v3/search/works', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CORE_API_KEY}`,
      },
      body: JSON.stringify({
        q: query,
        limit: 10,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('CORE failed:', {
        query,
        status: res.status,
        text: await safeText(res),
      });

      return [];
    }

    const data = await res.json();

    return (data.results || [])
      .map((p: any): NormalizedSource => {
        const authors = Array.isArray(p.authors)
          ? p.authors
              .map((a: any) => a.name || a)
              .filter(Boolean)
              .slice(0, 8)
          : [];

        const pdfUrl = p.downloadUrl || p.sourceFulltextUrls?.[0] || null;

        const year =
          p.yearPublished || extractYear(p.publishedDate) || null;

        const doi = normalizeDoi(p.doi);

        return {
          id: `core-${p.id || p.doi || p.title}`,
          paperId: p.id ? String(p.id) : null,
          source: 'CORE',
          sourceKey: 'core',
          title: cleanText(p.title) || 'Untitled',
          authors,
          year,
          publicationDate: p.publishedDate || null,
          abstract: cleanText(p.abstract) || 'Bez abstraktu',
          url: pdfUrl || p.links?.[0]?.url || null,
          isPdf: Boolean(pdfUrl),
          pdfUrl,
          openAccessPdf: pdfUrl ? { url: pdfUrl } : null,
          isOpenAccess: Boolean(pdfUrl),
          publicationTypes: p.types || [],
          externalIds: {
            DOI: doi,
            CORE: p.id,
          },
          doi,
        };
      })
      .filter((item: NormalizedSource) => {
        if (yearFrom && item.year && item.year < yearFrom) return false;
        if (yearTo && item.year && item.year > yearTo) return false;
        return true;
      });
  } catch (err) {
    console.error('CORE query failed:', query, err);
    return [];
  }
}

// =====================================================
// EUROPE PMC
// =====================================================
async function searchEuropePmc(
  query: string,
  yearFrom: number | null,
  yearTo: number | null,
): Promise<NormalizedSource[]> {
  try {
    let pmcQuery = query;

    if (yearFrom || yearTo) {
      const from = yearFrom || 1900;
      const to = yearTo || new Date().getFullYear();

      pmcQuery = `${query} PUB_YEAR:[${from} TO ${to}]`;
    }

    const params = new URLSearchParams();

    params.set('query', pmcQuery);
    params.set('format', 'json');
    params.set('pageSize', '10');
    params.set('resultType', 'core');

    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Europe PMC failed:', {
        query,
        status: res.status,
        text: await safeText(res),
      });

      return [];
    }

    const data = await res.json();

    return (data.resultList?.result || []).map((p: any): NormalizedSource => {
      const authors = p.authorString
        ? String(p.authorString)
            .split(',')
            .map((a: string) => a.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];

      const year = p.pubYear ? Number(p.pubYear) : null;
      const doi = normalizeDoi(p.doi);

      const url = doi
        ? `https://doi.org/${doi}`
        : p.pmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`
          : p.pmcid
            ? `https://europepmc.org/article/PMC/${p.pmcid}`
            : null;

      return {
        id: `europepmc-${p.id || p.doi || p.pmid || p.title}`,
        paperId: p.id || p.pmid || null,
        source: 'Europe PMC',
        sourceKey: 'europePmc',
        title: cleanText(p.title) || 'Untitled',
        authors,
        year,
        publicationDate: p.firstPublicationDate || null,
        abstract: cleanText(p.abstractText) || 'Bez abstraktu',
        url,
        isPdf: false,
        pdfUrl: null,
        openAccessPdf: null,
        isOpenAccess: p.isOpenAccess === 'Y',
        publicationTypes: Array.isArray(p.pubTypeList?.pubType)
          ? p.pubTypeList.pubType
          : [],
        externalIds: {
          DOI: doi,
          PMID: p.pmid,
          PMCID: p.pmcid,
        },
        doi,
      };
    });
  } catch (err) {
    console.error('Europe PMC query failed:', query, err);
    return [];
  }
}

// =====================================================
// ARXIV
// =====================================================
async function searchArxiv(
  query: string,
  yearFrom: number | null,
  yearTo: number | null,
): Promise<NormalizedSource[]> {
  try {
    const params = new URLSearchParams();

    params.set('search_query', `all:${query}`);
    params.set('start', '0');
    params.set('max_results', '10');
    params.set('sortBy', 'relevance');

    const url = `https://export.arxiv.org/api/query?${params.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/atom+xml',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await safeText(res);

      if (res.status === 429) {
        console.warn('arXiv rate limit reached. Skipping arXiv for this search.', {
          query,
          status: res.status,
          text,
        });

        return [];
      }

      console.error('arXiv failed:', {
        query,
        status: res.status,
        text,
      });

      return [];
    }

    const xml = await res.text();
    const entries = xml.split('<entry>').slice(1);

    return entries
      .map((entry, index): NormalizedSource => {
        const title = getXmlTag(entry, 'title') || 'Untitled';
        const abstract = getXmlTag(entry, 'summary') || 'Bez abstraktu';
        const published = getXmlTag(entry, 'published');
        const year = published ? Number(published.slice(0, 4)) : null;
        const id = getXmlTag(entry, 'id');

        const authorBlocks = [
          ...entry.matchAll(/<author>([\s\S]*?)<\/author>/gi),
        ];

        const authors = authorBlocks
          .map((block) => getXmlTag(block[1], 'name'))
          .filter(Boolean)
          .slice(0, 8);

        const pdfMatch = entry.match(
          /<link[^>]+title="pdf"[^>]+href="([^"]+)"/i,
        );

        const pdfUrl = pdfMatch?.[1] || (id ? id.replace('/abs/', '/pdf/') : null);

        return {
          id: `arxiv-${id || index}`,
          paperId: id || null,
          source: 'arXiv',
          sourceKey: 'arxiv',
          title: cleanText(title),
          authors,
          year,
          publicationDate: published || null,
          abstract: cleanText(abstract),
          url: id || null,
          isPdf: Boolean(pdfUrl),
          pdfUrl,
          openAccessPdf: pdfUrl ? { url: pdfUrl } : null,
          isOpenAccess: Boolean(pdfUrl),
          publicationTypes: ['preprint'],
          externalIds: {
            arXiv: id,
          },
          doi: null,
        };
      })
      .filter((item: NormalizedSource) => {
        if (yearFrom && item.year && item.year < yearFrom) return false;
        if (yearTo && item.year && item.year > yearTo) return false;
        return true;
      });
  } catch (err) {
    console.error('arXiv query failed:', query, err);
    return [];
  }
}

// =====================================================
// UNPAYWALL ENRICHMENT
// =====================================================
async function enrichWithUnpaywall(
  results: NormalizedSource[],
): Promise<NormalizedSource[]> {
  const withDoi = results.filter((item) => item.doi && !item.pdfUrl).slice(0, 20);

  await Promise.all(
    withDoi.map(async (item) => {
      try {
        const doi = encodeURIComponent(item.doi || '');
        const email = encodeURIComponent(UNPAYWALL_EMAIL);

        const res = await fetch(
          `https://api.unpaywall.org/v2/${doi}?email=${email}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
            cache: 'no-store',
          },
        );

        if (!res.ok) return;

        const data = await res.json();

        const pdfUrl =
          data.best_oa_location?.url_for_pdf ||
          data.oa_locations?.find((loc: any) => loc.url_for_pdf)?.url_for_pdf ||
          null;

        const landingUrl =
          data.best_oa_location?.url || data.oa_locations?.[0]?.url || null;

        if (pdfUrl) {
          item.pdfUrl = pdfUrl;
          item.openAccessPdf = { url: pdfUrl };
          item.isPdf = true;
          item.isOpenAccess = true;
        }

        if (!item.url && landingUrl) {
          item.url = landingUrl;
        }

        if (data.is_oa) {
          item.isOpenAccess = true;
        }
      } catch {
        // Unpaywall enrichment is optional.
      }
    }),
  );

  return results;
}

// =====================================================
// HELPERS
// =====================================================
function normalizeYear(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;

  const year = Number(value);

  if (!Number.isFinite(year)) return null;
  if (year < 1900 || year > 2100) return null;

  return year;
}

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
  to: number | null,
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
    return '';
  }
}

function cleanText(value: any): string {
  if (!value) return '';

  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDoi(value: any): string | null {
  if (!value) return null;

  const doi = String(value)
    .replace(/^https?:\/\/doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim();

  return doi || null;
}

function buildDateFromParts(parts: any): string | null {
  if (!Array.isArray(parts) || parts.length === 0) return null;

  const year = parts[0];
  const month = String(parts[1] || '01').padStart(2, '0');
  const day = String(parts[2] || '01').padStart(2, '0');

  if (!year) return null;

  return `${year}-${month}-${day}`;
}

function reconstructOpenAlexAbstract(index: Record<string, number[]> | null) {
  if (!index || typeof index !== 'object') return '';

  const words: string[] = [];

  for (const [word, positions] of Object.entries(index)) {
    if (!Array.isArray(positions)) continue;

    for (const position of positions) {
      words[position] = word;
    }
  }

  return cleanText(words.filter(Boolean).join(' '));
}

function getXmlTag(xml: string, tag: string): string {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
  );

  return cleanText(match?.[1] || '');
}

function cleanJsonText(value: string) {
  return value
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();
}

function dedupeResults(results: NormalizedSource[]) {
  const map = new Map<string, NormalizedSource>();

  for (const item of results) {
    const doi = item.doi ? `doi:${item.doi.toLowerCase()}` : '';

    const title = item.title
      ? `title:${item.title
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, ' ')
          .trim()}`
      : '';

    const key = doi || title || item.id;

    if (!key) continue;

    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      continue;
    }

    map.set(key, mergeDuplicate(existing, item));
  }

  return Array.from(map.values());
}

function mergeDuplicate(
  a: NormalizedSource,
  b: NormalizedSource,
): NormalizedSource {
  return {
    ...a,
    abstract:
      a.abstract && a.abstract !== 'Bez abstraktu' ? a.abstract : b.abstract,
    authors: a.authors.length >= b.authors.length ? a.authors : b.authors,
    year: a.year || b.year,
    publicationDate: a.publicationDate || b.publicationDate,
    url: a.url || b.url,
    pdfUrl: a.pdfUrl || b.pdfUrl,
    isPdf: Boolean(a.isPdf || b.isPdf || a.pdfUrl || b.pdfUrl),
    openAccessPdf: a.openAccessPdf || b.openAccessPdf,
    isOpenAccess: Boolean(a.isOpenAccess || b.isOpenAccess),
    publicationTypes: Array.from(
      new Set([...(a.publicationTypes || []), ...(b.publicationTypes || [])]),
    ),
    externalIds: {
      ...(b.externalIds || {}),
      ...(a.externalIds || {}),
    },
    doi: a.doi || b.doi,
    source: a.source === b.source ? a.source : `${a.source}, ${b.source}`,
  };
}

// =====================================================
// CITATION FORMATTER
// =====================================================
function formatCitation(source: any, style: string): string {
  const authors = source.authors?.length
    ? source.authors.join(', ')
    : 'Unknown';

  const year = source.year || 'n.d.';
  const title = source.title || 'Untitled';

  switch (style) {
    case 'ISO':
      return `${authors}: ${title}. ${year}.`;

    case 'MLA':
      return `${authors}. "${title}." ${year}.`;

    case 'HARVARD':
      return `${authors} (${year}) ${title}.`;

    case 'APA':
    default:
      return `${authors} (${year}). ${title}.`;
  }
}