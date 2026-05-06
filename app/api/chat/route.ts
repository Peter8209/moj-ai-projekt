import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { xai } from '@ai-sdk/xai';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 90;

// ================= TYPES =================

type Agent = 'openai' | 'claude' | 'gemini' | 'grok' | 'mistral';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type SavedProfile = {
  title?: string;
  topic?: string;
  type?: string;
  level?: string;
  field?: string;
  supervisor?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  problem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;
  businessProblem?: string;
  businessGoal?: string;
  implementation?: string;
  caseStudy?: string;
  reflection?: string;
  sourcesRequirement?: string;
  keywordsList?: string[];
  keywords?: string[];
  schema?: {
    label?: string;
    description?: string;
    recommendedLength?: string;
    structure?: string[];
    requiredSections?: string[];
    aiInstruction?: string;
  };
};

type ProjectDocument = {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  file_type?: string | null;
  type?: string | null;
  extracted_text?: string | null;
  created_at?: string;
};

type ModelResult = {
  model: any;
  providerLabel: string;
};

type SemanticScholarAuthor = {
  authorId?: string;
  name?: string;
};

type SemanticScholarPaper = {
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

type SourceForAI = {
  marker: string;
  paperId: string;
  title: string;
  authors: string;
  year: string;
  venue: string;
  abstract: string;
  url: string;
  doi: string;
  pdfUrl: string;
  citationCount: number;
};

type SemanticScholarResult = {
  enabled: boolean;
  query: string;
  sources: SourceForAI[];
  warning: string | null;
};

// ================= PROJECT DOCUMENTS =================

async function loadProjectDocuments(projectId: string | null) {
  if (!projectId) {
    return [];
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('zedpera_documents')
    .select(
      'id, project_id, file_name, file_path, file_size, file_type, type, extracted_text, created_at'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('LOAD PROJECT DOCUMENTS ERROR:', error);
    return [];
  }

  return (data || []) as ProjectDocument[];
}

// ================= GENERAL HELPERS =================

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toCleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isAllowedAgent(value: unknown): value is Agent {
  return (
    value === 'openai' ||
    value === 'claude' ||
    value === 'gemini' ||
    value === 'grok' ||
    value === 'mistral'
  );
}

function normalizeMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => {
      return (
        message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0
      );
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));
}

function getWorkLanguage(profile: SavedProfile | null) {
  return (
    toCleanString(profile?.workLanguage) ||
    toCleanString(profile?.language) ||
    'slovenčina'
  );
}

function getCitationStyle(profile: SavedProfile | null) {
  return toCleanString(profile?.citation) || 'ISO 690';
}

function getKeywords(profile: SavedProfile | null) {
  if (!profile) {
    return [];
  }

  const fromKeywordsList = Array.isArray(profile.keywordsList)
    ? profile.keywordsList
    : [];

  const fromKeywords = Array.isArray(profile.keywords) ? profile.keywords : [];

  return [...fromKeywordsList, ...fromKeywords]
    .map((keyword) => String(keyword).trim())
    .filter(Boolean);
}

function getLastUserMessage(messages: ChatMessage[]) {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user' && message.content.trim());

  return lastUserMessage?.content?.trim() || '';
}

// ================= ATTACHMENTS =================

const allowedAttachmentExtensions = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.rtf',
  '.odt',
  '.md',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
];

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');

  if (index === -1) {
    return '';
  }

  return fileName.slice(index).toLowerCase();
}

function isAllowedAttachment(file: File) {
  const extension = getFileExtension(file.name);
  return allowedAttachmentExtensions.includes(extension);
}

function getAttachmentLabel(fileName: string) {
  const extension = getFileExtension(fileName);

  if (extension === '.pdf') return 'PDF dokument';

  if (['.doc', '.docx'].includes(extension)) return 'Word dokument';

  if (['.txt', '.rtf', '.odt', '.md'].includes(extension)) {
    return 'Textový dokument';
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
    return 'Obrázok';
  }

  if (['.xls', '.xlsx', '.csv'].includes(extension)) return 'Tabuľka';

  if (['.ppt', '.pptx'].includes(extension)) return 'Prezentácia';

  return 'Súbor';
}

async function extractAttachmentTexts(files: File[]) {
  const results: string[] = [];

  if (!files.length) {
    return results;
  }

  for (const file of files) {
    if (!isAllowedAttachment(file)) {
      results.push(
        `NEPODPOROVANÝ SÚBOR: ${file.name}
Typ: ${file.type || 'application/octet-stream'}
Veľkosť: ${file.size} bajtov
[Tento formát súboru nie je povolený.]`
      );
      continue;
    }

    const extension = getFileExtension(file.name);
    const label = getAttachmentLabel(file.name);

    if (['.txt', '.md', '.csv'].includes(extension)) {
      try {
        const content = await file.text();

        results.push(
          `${label}: ${file.name}
Typ: ${file.type || 'text/plain'}
Veľkosť: ${file.size} bajtov

EXTRAHOVANÝ TEXT:
${content.slice(0, 30000)}`
        );

        continue;
      } catch {
        results.push(
          `${label}: ${file.name}
Typ: ${file.type || 'text/plain'}
Veľkosť: ${file.size} bajtov
[Textový obsah sa nepodarilo načítať.]`
        );

        continue;
      }
    }

    let note = '';

    if (extension === '.pdf') {
      note =
        'PDF dokument bol priložený. Server v tejto trase zatiaľ neextrahuje plný text PDF.';
    } else if (['.doc', '.docx', '.odt', '.rtf'].includes(extension)) {
      note =
        'Dokument bol priložený. Server v tejto trase zatiaľ neextrahuje plný text Word/ODT/RTF dokumentu.';
    } else if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
      note =
        'Obrázok bol priložený. Server v tejto trase zatiaľ nerobí OCR ani vizuálnu analýzu obrázka.';
    } else if (['.xls', '.xlsx'].includes(extension)) {
      note =
        'Tabuľkový súbor bol priložený. Server v tejto trase zatiaľ neextrahuje obsah buniek XLS/XLSX.';
    } else if (['.ppt', '.pptx'].includes(extension)) {
      note =
        'Prezentácia bola priložená. Server v tejto trase zatiaľ neextrahuje text zo slidov.';
    } else {
      note =
        'Súbor bol priložený. Server v tejto trase zatiaľ neextrahuje jeho plný obsah.';
    }

    results.push(
      `${label}: ${file.name}
Typ: ${file.type || 'application/octet-stream'}
Veľkosť: ${file.size} bajtov
[${note} AI vie, že súbor existuje, ale nemá overený celý obsah súboru.]`
    );
  }

  return results;
}

// ================= SEMANTIC SCHOLAR =================

function normalizeSemanticScholarPaper(
  paper: SemanticScholarPaper,
  index: number
): SourceForAI | null {
  const title = toCleanString(paper.title);

  if (!paper.paperId || !title) {
    return null;
  }

  const authors =
    paper.authors
      ?.map((author) => toCleanString(author.name))
      .filter(Boolean)
      .slice(0, 10)
      .join(', ') || 'Neznámy autor';

  const doi = toCleanString(paper.externalIds?.DOI);
  const pdfUrl = toCleanString(paper.openAccessPdf?.url);
  const url =
    pdfUrl ||
    toCleanString(paper.url) ||
    (doi ? `https://doi.org/${doi}` : '');

  return {
    marker: `S${index + 1}`,
    paperId: paper.paperId,
    title,
    authors,
    year: paper.year ? String(paper.year) : 'bez roku',
    venue: toCleanString(paper.venue) || 'neuvedené',
    abstract: toCleanString(paper.abstract) || 'Abstrakt nie je dostupný.',
    url,
    doi,
    pdfUrl,
    citationCount: Number(paper.citationCount || 0),
  };
}

function buildFallbackResearchQuery(
  profile: SavedProfile | null,
  messages: ChatMessage[]
) {
  const keywords = getKeywords(profile);

  const values = [
    profile?.title,
    profile?.topic,
    profile?.field,
    profile?.problem,
    profile?.goal,
    profile?.methodology,
    keywords.join(' '),
    getLastUserMessage(messages),
  ]
    .map((value) => toCleanString(value))
    .filter(Boolean);

  return values.join(' ').slice(0, 250);
}

async function buildEnglishResearchQuery(
  profile: SavedProfile | null,
  messages: ChatMessage[],
  agent: Agent
) {
  const fallbackQuery = buildFallbackResearchQuery(profile, messages);

  if (!fallbackQuery) {
    return '';
  }

  try {
    const model = getModelByAgent(agent).model;

    const keywords = getKeywords(profile).join(', ');

    const profileText = `
Názov práce: ${profile?.title || ''}
Téma práce: ${profile?.topic || ''}
Typ práce: ${profile?.type || profile?.schema?.label || ''}
Odbor: ${profile?.field || ''}
Cieľ práce: ${profile?.goal || ''}
Výskumný problém: ${profile?.problem || ''}
Metodológia: ${profile?.methodology || ''}
Kľúčové slová: ${keywords}
Posledná požiadavka používateľa: ${getLastUserMessage(messages)}
`.trim();

    const result = await generateText({
      model,
      system: `
Si akademický rešeršný asistent.
Z profilu práce vytvor jeden presný anglický vyhľadávací dopyt pre Semantic Scholar.

Pravidlá:
- odpovedz iba jedným anglickým vyhľadávacím dopytom,
- nepíš vysvetlenie,
- nepoužívaj odrážky,
- nepoužívaj úvodzovky,
- maximálne 18 slov,
- zachovaj odborný význam práce,
- ak je téma viazaná na Slovensko, ponechaj slová Slovak alebo Slovakia,
- ak ide o divadlo, literatúru, politický režim, rod, manažment, techniku alebo IT, použi odborné anglické termíny.
`,
      prompt: profileText,
      temperature: 0.2,
      maxOutputTokens: 80,
    });

    const query = result.text.trim().replace(/^["']|["']$/g, '');

    return query || fallbackQuery;
  } catch (error) {
    console.error('RESEARCH QUERY ERROR:', error);
    return fallbackQuery;
  }
}

async function searchSemanticScholarSources(params: {
  query: string;
  limit?: number;
  yearFrom?: number;
  yearTo?: number;
  pdfOnly?: boolean;
}) {
  const query = params.query.trim();

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
    `https://api.semanticscholar.org/graph/v1/paper/search?${searchParams.toString()}`,
    {
      method: 'GET',
      headers,
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');

    throw new Error(
      `Semantic Scholar API chyba ${response.status}: ${
        errorText || response.statusText
      }`
    );
  }

  const json = (await response.json()) as {
    data?: SemanticScholarPaper[];
  };

  let sources = (json.data || [])
    .map((paper, index) => normalizeSemanticScholarPaper(paper, index))
    .filter((source): source is SourceForAI => Boolean(source))
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

function semanticSourcesToPromptBlock(result: SemanticScholarResult) {
  if (!result.enabled) {
    return `
SEMANTIC SCHOLAR:
Vyhľadávanie cez Semantic Scholar bolo vypnuté.
`;
  }

  if (result.warning) {
    return `
SEMANTIC SCHOLAR:
Vyhľadávanie bolo zapnuté, ale nastala chyba:
${result.warning}

Dôležité:
Ak nie sú dostupné overené zdroje, nesmieš si vymýšľať autorov, názvy článkov, DOI ani roky.
`;
  }

  if (!result.sources.length) {
    return `
SEMANTIC SCHOLAR:
Vyhľadávací dopyt: ${result.query || 'nevytvorený'}

Neboli nájdené žiadne relevantné zdroje.

Dôležité:
Ak nie sú dostupné overené zdroje, nesmieš si vymýšľať autorov, názvy článkov, DOI ani roky.
`;
  }

  const sourcesText = result.sources
    .map((source) => {
      return `
[${source.marker}]
Názov: ${source.title}
Autori: ${source.authors}
Rok: ${source.year}
Zdroj / časopis: ${source.venue}
Počet citácií: ${source.citationCount}
DOI: ${source.doi || 'neuvedené'}
URL: ${source.url || 'neuvedené'}
PDF: ${source.pdfUrl || 'neuvedené'}
Abstrakt: ${source.abstract}
`.trim();
    })
    .join('\n\n-----------------\n\n');

  return `
SEMANTIC SCHOLAR:
Vyhľadávací dopyt použitý pre zdroje:
${result.query || 'nevytvorený'}

OVERENÉ AKADEMICKÉ ZDROJE NAČÍTANÉ ZO SEMANTIC SCHOLAR:
${sourcesText}
`;
}

async function loadSemanticScholarForChat(params: {
  enabled: boolean;
  profile: SavedProfile | null;
  messages: ChatMessage[];
  agent: Agent;
  limit?: number;
  yearFrom?: number;
  yearTo?: number;
  pdfOnly?: boolean;
}): Promise<SemanticScholarResult> {
  if (!params.enabled) {
    return {
      enabled: false,
      query: '',
      sources: [],
      warning: null,
    };
  }

  try {
    const query = await buildEnglishResearchQuery(
      params.profile,
      params.messages,
      params.agent
    );

    if (!query) {
      return {
        enabled: true,
        query: '',
        sources: [],
        warning:
          'Nepodarilo sa vytvoriť rešeršný dopyt, pretože profil práce alebo správa používateľa neobsahuje dostatok údajov.',
      };
    }

    const sources = await searchSemanticScholarSources({
      query,
      limit: params.limit || 10,
      yearFrom: params.yearFrom || 2000,
      yearTo: params.yearTo,
      pdfOnly: Boolean(params.pdfOnly),
    });

    return {
      enabled: true,
      query,
      sources,
      warning: null,
    };
  } catch (error) {
    console.error('SEMANTIC SCHOLAR ERROR:', error);

    return {
      enabled: true,
      query: '',
      sources: [],
      warning: error instanceof Error ? error.message : String(error),
    };
  }
}

// ================= SYSTEM PROMPT =================

function buildSystemPrompt(
  profile: SavedProfile | null,
  attachmentTexts: string[],
  semanticScholar: SemanticScholarResult
) {
  const keywords = getKeywords(profile);

  const structureText =
    profile?.schema?.structure && profile.schema.structure.length > 0
      ? profile.schema.structure
          .map((item, index) => `${index + 1}. ${item}`)
          .join('\n')
      : 'Neuvedené';

  const requiredSectionsText =
    profile?.schema?.requiredSections &&
    profile.schema.requiredSections.length > 0
      ? profile.schema.requiredSections.map((item) => `- ${item}`).join('\n')
      : 'Neuvedené';

  const attachmentsBlock =
    attachmentTexts.length > 0
      ? `\nPRILOŽENÉ SÚBORY A PODKLADY:\n${attachmentTexts.join(
          '\n\n-----------------\n\n'
        )}\n`
      : '\nPRILOŽENÉ SÚBORY A PODKLADY: Žiadne.\n';

  const semanticScholarBlock = semanticSourcesToPromptBlock(semanticScholar);
  const workLanguage = getWorkLanguage(profile);
  const citationStyle = getCitationStyle(profile);

  return `
Si ZEDPERA, profesionálny akademický AI asistent a AI vedúci práce.

HLAVNÝ PRACOVNÝ POSTUP:
1. Najprv vychádzaj z uloženého Profilu práce.
2. Následne zohľadni priložené súbory a dokumenty zo Supabase.
3. Potom použi zdroje načítané zo Semantic Scholar.
4. Až potom vytvor akademický text, kapitolu, úvod, abstrakt, metodológiu, analýzu alebo inú odpoveď.
5. Ak sú dostupné zdroje zo Semantic Scholar, odborné tvrdenia opieraj najmä o ne.
6. Ak sú zdroje slabé alebo tematicky vzdialené, jasne to napíš v analýze.

HLAVNÉ PRAVIDLÁ:
- Odpovedaj v jazyku práce: ${workLanguage}.
- Vychádzaj prednostne z uloženého profilu práce.
- Ak sú priložené súbory, zohľadni ich ako doplnkové podklady.
- Ak pri niektorom súbore nie je dostupný extrahovaný obsah, jasne uveď, že server pozná iba názov, typ a veľkosť súboru, nie celý obsah.
- Text má byť odborne napísaný, logický a vhodný pre akademické písanie.
- Nevymýšľaj konkrétne bibliografické údaje, ak nie sú priamo dostupné.
- Nepoužívaj falošné citácie, autorov, DOI ani názvy článkov.
- Nepoužívaj Markdown formátovanie ako tučný text, mriežky, hviezdičky, oddeľovače ani kódové bloky.
- Nadpisy píš obyčajným textom bez znakov #, *, _, \`.
- Výstup musí byť čistý text vhodný na priame vloženie do Word dokumentu.

PRAVIDLÁ PRE ZDROJE, AUTOROV A CITÁCIE:
- Na konci každej akademickej odpovede musí byť sekcia:
=== POUŽITÉ ZDROJE A AUTORI ===
- Vypíš iba zdroje, ktoré boli reálne dostupné v Semantic Scholar, priložených súboroch alebo texte používateľa.
- Pri každom zdroji uveď autora, rok, názov, zdroj alebo časopis, DOI alebo URL, ak sú dostupné.
- Ak používaš zdroj [S1], [S2] a podobne, musí sa objaviť aj v sekcii Použité zdroje a autori.
- Dodrž citačnú normu: ${citationStyle}.
- Nikdy si nevymýšľaj zdroje, autorov, DOI, URL ani roky.
- Ak nebol použitý žiadny overený zdroj, napíš presne:
Zdroje neboli dodané alebo sa ich nepodarilo overene načítať. Odporúčam ich doplniť cez modul Zdroje alebo priložiť PDF/Word súbory.

ULOŽENÝ PROFIL PRÁCE:
Názov práce: ${profile?.title || 'Neuvedené'}
Téma práce: ${profile?.topic || 'Neuvedené'}
Typ práce: ${profile?.schema?.label || profile?.type || 'Neuvedené'}
Úroveň / odbornosť: ${profile?.level || 'Neuvedené'}
Odbor / predmet / oblasť: ${profile?.field || 'Neuvedené'}
Vedúci práce: ${profile?.supervisor || 'Neuvedené'}
Citačná norma: ${citationStyle}
Jazyk rozhrania: ${profile?.language || 'Neuvedené'}
Jazyk práce: ${workLanguage}
Odporúčaný rozsah: ${profile?.schema?.recommendedLength || 'Neuvedené'}

Anotácia:
${profile?.annotation || 'Neuvedené'}

Cieľ práce:
${profile?.goal || 'Neuvedené'}

Výskumný problém:
${profile?.problem || 'Neuvedené'}

Metodológia:
${profile?.methodology || 'Neuvedené'}

Hypotézy:
${profile?.hypotheses || 'Neuvedené'}

Výskumné otázky:
${profile?.researchQuestions || 'Neuvedené'}

Praktická / analytická časť:
${profile?.practicalPart || 'Neuvedené'}

Vedecký / odborný prínos:
${profile?.scientificContribution || 'Neuvedené'}

Firemný / manažérsky problém:
${profile?.businessProblem || 'Neuvedené'}

Manažérsky cieľ:
${profile?.businessGoal || 'Neuvedené'}

Implementácia:
${profile?.implementation || 'Neuvedené'}

Prípadová štúdia:
${profile?.caseStudy || 'Neuvedené'}

Reflexia:
${profile?.reflection || 'Neuvedené'}

Požiadavky na zdroje:
${profile?.sourcesRequirement || 'Neuvedené'}

Kľúčové slová:
${keywords.length > 0 ? keywords.join(', ') : 'Neuvedené'}

Štruktúra práce:
${structureText}

Povinné časti:
${requiredSectionsText}

Špecifická inštrukcia typu práce:
${profile?.schema?.aiInstruction || 'Neuvedené'}

${attachmentsBlock}

${semanticScholarBlock}

FORMÁT ODPOVEDE:
Použi presne tieto sekcie. Nepoužívaj Markdown znaky, hviezdičky, mriežky ani kódové bloky.

=== VÝSTUP ===
Sem napíš hlavný výstup ako čistý akademický text. Ak ide o akademický text, vkladaj citácie priamo do textu podľa normy ${citationStyle}.

=== ANALÝZA ===
Stručne vysvetli, z ktorých údajov profilu, priložených súborov a Semantic Scholar zdrojov si čerpal.

=== SKÓRE ===
Napíš iba číslo od 0 do 100 a krátke slovné hodnotenie.

=== ODPORÚČANIA ===
Uveď konkrétne odporúčania v čistom texte bez Markdown symbolov.

=== POUŽITÉ ZDROJE A AUTORI ===
Vypíš iba zdroje, ktoré boli reálne použité v texte.
Pri každom zdroji uveď:
- autor / autori,
- rok,
- názov,
- zdroj / časopis / vydavateľ,
- DOI alebo URL, ak sú dostupné.
Ak nebol použitý žiadny overený zdroj, napíš:
Zdroje neboli dodané alebo sa ich nepodarilo overene načítať. Odporúčam ich doplniť cez modul Zdroje alebo priložiť PDF/Word súbory.
`;
}

// ================= AI MODEL ROUTER =================

function getModelByAgent(agent: Agent): ModelResult {
  if (agent === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Chýba OPENAI_API_KEY pre GPT.');
    }

    return {
      model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
      providerLabel: 'GPT',
    };
  }

  if (agent === 'claude') {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Chýba ANTHROPIC_API_KEY pre Claude.');
    }

    return {
      model: anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6') as any,
      providerLabel: 'Claude',
    };
  }

  if (agent === 'gemini') {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('Chýba GOOGLE_GENERATIVE_AI_API_KEY pre Gemini.');
    }

    return {
      model: google(process.env.GOOGLE_MODEL || 'gemini-2.5-flash') as any,
      providerLabel: 'Gemini',
    };
  }

  if (agent === 'grok') {
    if (!process.env.XAI_API_KEY) {
      throw new Error('Chýba XAI_API_KEY pre Grok.');
    }

    return {
      model: xai(process.env.XAI_MODEL || 'grok-3') as any,
      providerLabel: 'Grok',
    };
  }

  if (agent === 'mistral') {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error('Chýba MISTRAL_API_KEY pre Mistral.');
    }

    return {
      model: mistral(process.env.MISTRAL_MODEL || 'mistral-small-latest') as any,
      providerLabel: 'Mistral',
    };
  }

  throw new Error(`Neznámy AI agent: ${agent}`);
}

function getFallbackModel(): ModelResult {
  if (process.env.OPENAI_API_KEY) {
    return {
      model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
      providerLabel: 'GPT fallback',
    };
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return {
      model: google(process.env.GOOGLE_MODEL || 'gemini-2.5-flash') as any,
      providerLabel: 'Gemini fallback',
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      model: anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6') as any,
      providerLabel: 'Claude fallback',
    };
  }

  if (process.env.MISTRAL_API_KEY) {
    return {
      model: mistral(process.env.MISTRAL_MODEL || 'mistral-small-latest') as any,
      providerLabel: 'Mistral fallback',
    };
  }

  if (process.env.XAI_API_KEY) {
    return {
      model: xai(process.env.XAI_MODEL || 'grok-3') as any,
      providerLabel: 'Grok fallback',
    };
  }

  throw new Error(
    'Nie je nastavený žiadny AI provider. Doplň aspoň jeden API kľúč.'
  );
}

function isModelNotFoundError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes('model') &&
    (message.includes('not found') ||
      message.includes('404') ||
      message.includes('not supported') ||
      message.includes('invalid model'))
  );
}

async function createStreamResponse({
  model,
  systemPrompt,
  normalizedMessages,
}: {
  model: ModelResult['model'];
  systemPrompt: string;
  normalizedMessages: ReturnType<typeof normalizeMessages>;
}) {
  const result = streamText({
    model,
    system: systemPrompt,
    messages: normalizedMessages,
    temperature: 0.45,
    maxOutputTokens: 4500,
  });

  return result.toTextStreamResponse();
}

// ================= API ROUTE =================

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let rawAgent: unknown = 'gemini';
    let messages: ChatMessage[] = [];
    let profile: SavedProfile | null = null;
    let files: File[] = [];
    let projectId: string | null = null;

    let useSemanticScholar = true;
    let semanticScholarLimit = 10;
    let semanticScholarYearFrom: number | undefined = 2000;
    let semanticScholarYearTo: number | undefined = undefined;
    let semanticScholarPdfOnly = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      rawAgent = formData.get('agent')?.toString() || 'gemini';
      messages = parseJson<ChatMessage[]>(formData.get('messages'), []);
      profile = parseJson<SavedProfile | null>(formData.get('profile'), null);
      projectId = formData.get('projectId')?.toString() || null;

      useSemanticScholar =
        formData.get('useSemanticScholar')?.toString() !== 'false';

      semanticScholarLimit = Number(
        formData.get('semanticScholarLimit')?.toString() || 10
      );

      const yearFromValue = formData.get('semanticScholarYearFrom')?.toString();
      const yearToValue = formData.get('semanticScholarYearTo')?.toString();

      semanticScholarYearFrom = yearFromValue ? Number(yearFromValue) : 2000;
      semanticScholarYearTo = yearToValue ? Number(yearToValue) : undefined;

      semanticScholarPdfOnly =
        formData.get('semanticScholarPdfOnly')?.toString() === 'true';

      files = formData
        .getAll('files')
        .filter((item): item is File => item instanceof File);
    } else {
      const body = await req.json().catch(() => null);

      rawAgent = body?.agent || 'gemini';
      messages = Array.isArray(body?.messages) ? body.messages : [];
      profile = body?.profile || body?.activeProfile || body?.savedProfile || null;
      projectId = body?.projectId || null;

      useSemanticScholar = body?.useSemanticScholar !== false;
      semanticScholarLimit = Number(body?.semanticScholarLimit || 10);

      semanticScholarYearFrom =
        body?.semanticScholarYearFrom === null ||
        body?.semanticScholarYearFrom === undefined
          ? 2000
          : Number(body.semanticScholarYearFrom);

      semanticScholarYearTo =
        body?.semanticScholarYearTo === null ||
        body?.semanticScholarYearTo === undefined
          ? undefined
          : Number(body.semanticScholarYearTo);

      semanticScholarPdfOnly = Boolean(body?.semanticScholarPdfOnly);

      files = [];
    }

    if (!isAllowedAgent(rawAgent)) {
      return new Response(`Neznámy AI agent: ${String(rawAgent)}`, {
        status: 400,
      });
    }

    const agent = rawAgent;
    const normalizedMessages = normalizeMessages(messages);

    if (normalizedMessages.length === 0) {
      return new Response('Chýbajú správy pre AI.', {
        status: 400,
      });
    }

    const uploadedAttachmentTexts = await extractAttachmentTexts(files);
    const projectDocuments = await loadProjectDocuments(projectId);

    const projectDocumentTexts = projectDocuments.map((doc, index) => {
      const documentType = doc.file_type || doc.type || 'neuvedené';

      return `DOKUMENT ZO SUPABASE ${index + 1}
Názov: ${doc.file_name}
Typ: ${documentType}
Veľkosť: ${doc.file_size || 0} bajtov
Text:
${doc.extracted_text || '[Dokument nemá uložený extrahovaný text]'}`;
    });

    const attachmentTexts = [
      ...uploadedAttachmentTexts,
      ...projectDocumentTexts,
    ];

    const semanticScholar = await loadSemanticScholarForChat({
      enabled: useSemanticScholar,
      profile,
      messages,
      agent,
      limit: semanticScholarLimit,
      yearFrom: semanticScholarYearFrom,
      yearTo: semanticScholarYearTo,
      pdfOnly: semanticScholarPdfOnly,
    });

    const systemPrompt = buildSystemPrompt(
      profile,
      attachmentTexts,
      semanticScholar
    );

    try {
      const primary = getModelByAgent(agent);

      return await createStreamResponse({
        model: primary.model,
        systemPrompt,
        normalizedMessages,
      });
    } catch (primaryError) {
      console.error('PRIMARY MODEL ERROR:', primaryError);

      if (!isModelNotFoundError(primaryError)) {
        throw primaryError;
      }

      const fallback = getFallbackModel();

      const fallbackSystemPrompt = `
${systemPrompt}

TECHNICKÁ POZNÁMKA:
Vybraný model nebol dostupný alebo bol odmietnutý poskytovateľom.
Odpovedáš cez náhradný model: ${fallback.providerLabel}.

Aj pri náhradnom modeli musíš dodržať pravidlo:
Na konci akademickej odpovede vždy uveď sekciu:

=== POUŽITÉ ZDROJE A AUTORI ===

Ak zdroje nie sú dostupné, nevymýšľaj ich a uveď:
Zdroje neboli dodané alebo sa ich nepodarilo overene načítať. Odporúčam ich doplniť cez modul Zdroje alebo priložiť PDF/Word súbory.
`;

      return await createStreamResponse({
        model: fallback.model,
        systemPrompt: fallbackSystemPrompt,
        normalizedMessages,
      });
    }
  } catch (error) {
    console.error('CHAT API ERROR:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Neznáma chyba servera v /api/chat';

    return new Response(`API error 500: ${message}`, {
      status: 500,
    });
  }
}