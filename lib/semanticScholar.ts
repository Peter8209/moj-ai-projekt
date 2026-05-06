export type SemanticScholarAuthor = {
  authorId?: string;
  name?: string;
};

export type SemanticScholarPaper = {
  paperId: string;
  title?: string;
  abstract?: string;
  year?: number;
  venue?: string;
  url?: string;
  citationCount?: number;
  authors?: SemanticScholarAuthor[];
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
    PubMed?: string;
    CorpusId?: string;
  };
  openAccessPdf?: {
    url?: string;
    status?: string;
  };
};

export type SourceForAI = {
  id: string;
  marker: string;
  title: string;
  authors: string;
  authorList: string[];
  year: string;
  venue: string;
  abstract: string;
  url: string;
  doi: string;
  citationCount: number;
  pdfUrl: string;
};

const S2_API_BASE = 'https://api.semanticscholar.org/graph/v1';

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAuthors(authors?: SemanticScholarAuthor[]): {
  authors: string;
  authorList: string[];
} {
  const authorList =
    authors
      ?.map((author) => cleanText(author.name))
      .filter(Boolean)
      .slice(0, 10) || [];

  return {
    authorList,
    authors: authorList.length ? authorList.join(', ') : 'Neznámy autor',
  };
}

function normalizePaper(
  paper: SemanticScholarPaper,
  index: number,
): SourceForAI | null {
  const title = cleanText(paper.title);
  const abstract = cleanText(paper.abstract);

  if (!paper.paperId || !title) {
    return null;
  }

  const { authors, authorList } = normalizeAuthors(paper.authors);

  const doi = cleanText(paper.externalIds?.DOI);
  const pdfUrl = cleanText(paper.openAccessPdf?.url);

  const url =
    pdfUrl ||
    cleanText(paper.url) ||
    (doi ? `https://doi.org/${doi}` : '');

  return {
    id: paper.paperId,
    marker: `S${index + 1}`,
    title,
    authors,
    authorList,
    year: paper.year ? String(paper.year) : 'bez roku',
    venue: cleanText(paper.venue) || 'neuvedené',
    abstract: abstract || 'Abstrakt nie je dostupný.',
    url,
    doi,
    citationCount: Number(paper.citationCount || 0),
    pdfUrl,
  };
}

export async function searchSemanticScholarSources(params: {
  query: string;
  limit?: number;
  yearFrom?: number;
  yearTo?: number;
  pdfOnly?: boolean;
}): Promise<SourceForAI[]> {
  const query = cleanText(params.query);

  if (!query) {
    return [];
  }

  const limit = Math.min(Math.max(params.limit || 10, 1), 25);

  const searchParams = new URLSearchParams({
    query,
    limit: String(limit),
    fields:
      'paperId,title,abstract,year,venue,url,citationCount,authors,externalIds,openAccessPdf',
  });

  if (params.yearFrom || params.yearTo) {
    const from = params.yearFrom ? String(params.yearFrom) : '';
    const to = params.yearTo ? String(params.yearTo) : '';
    searchParams.set('year', `${from}-${to}`);
  }

  const headers: HeadersInit = {
    Accept: 'application/json',
  };

  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const response = await fetch(
    `${S2_API_BASE}/paper/search?${searchParams.toString()}`,
    {
      method: 'GET',
      headers,
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');

    throw new Error(
      `Semantic Scholar API chyba ${response.status}: ${
        errorText || response.statusText
      }`,
    );
  }

  const json = (await response.json()) as {
    data?: SemanticScholarPaper[];
  };

  let sources = (json.data || [])
    .map((paper, index) => normalizePaper(paper, index))
    .filter((item): item is SourceForAI => Boolean(item))
    .filter((source) => source.title.length > 3);

  if (params.pdfOnly) {
    sources = sources.filter((source) => Boolean(source.pdfUrl));
  }

  sources = sources
    .sort((a, b) => {
      const citationDiff = b.citationCount - a.citationCount;

      if (citationDiff !== 0) {
        return citationDiff;
      }

      return Number(b.year || 0) - Number(a.year || 0);
    })
    .slice(0, limit)
    .map((source, index) => ({
      ...source,
      marker: `S${index + 1}`,
    }));

  return sources;
}

export function sourcesToPromptBlock(sources: SourceForAI[]): string {
  if (!sources.length) {
    return 'Neboli nájdené žiadne relevantné akademické zdroje zo Semantic Scholar.';
  }

  return sources
    .map((source) => {
      return [
        `[${source.marker}]`,
        `Názov: ${source.title}`,
        `Autori: ${source.authors}`,
        `Rok: ${source.year}`,
        `Zdroj/časopis: ${source.venue}`,
        `Počet citácií: ${source.citationCount}`,
        `DOI: ${source.doi || 'neuvedené'}`,
        `URL: ${source.url || 'neuvedené'}`,
        `PDF: ${source.pdfUrl || 'neuvedené'}`,
        `Abstrakt: ${source.abstract}`,
      ].join('\n');
    })
    .join('\n\n');
}

export function sourcesToUserList(sources: SourceForAI[]): string {
  if (!sources.length) {
    return 'Neboli nájdené žiadne zdroje.';
  }

  return sources
    .map((source, index) => {
      return `${index + 1}. ${source.authors} (${source.year}). ${source.title}. ${source.venue}. ${
        source.doi ? `DOI: ${source.doi}. ` : ''
      }${source.url ? `URL: ${source.url}` : ''}`;
    })
    .join('\n');
}