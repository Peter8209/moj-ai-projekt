import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { mistral } from '@ai-sdk/mistral';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

// ================= TYPES =================

type OriginalityRequest = {
  title?: string;
  author?: string;
  authorName?: string;
  school?: string;
  faculty?: string;
  studyProgram?: string;
  supervisor?: string;
  workType?: string;
  citationStyle?: string;
  language?: string;
  text?: string;
  profileId?: string | null;
  activeProfile?: any;
  agent?: 'openai' | 'gemini' | 'claude' | 'mistral';
  checkAuthenticity?: boolean | string;
};

type ExtractedUploadResult = {
  text: string;
  warning?: string | null;
};

type CorpusMatch = {
  name: string;
  percent: number;
  count?: number;
};

type SimilarDocument = {
  id?: string | number;
  order?: number;
  citation: string;
  source?: string;
  plagId?: string;
  workType?: string;
  percent: number;
};

type SimilarityPassage = {
  id?: string | number;
  paragraph?: string;
  reliability?: string;
  percent?: number;
  controlledText: string;
  matchedText?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  sourceDocNumber?: number;
  reason?: string;
};

type DictionaryStats = {
  extractedChars: number;
  totalWords: number;
  dictionaryWords: number;
  dictionaryWordsRatio: number;
  dictionaryLengthSum: number;
  dictionaryLengthRatio: number;
};

type HistogramItem = {
  length: number;
  count: number;
  deviation: '=' | '>>' | '<<';
};

type ProtocolResponse = {
  ok: boolean;
  id?: string | null;

  protocolTitle: string;
  protocolText: string;
  text: string;
  content: string;
  report: string;

  score: number;
  title: string;
  author: string;
  school: string;
  faculty: string;
  studyProgram: string;
  supervisor: string;
  workType: string;
  citationStyle: string;
  language: string;
  createdAt: string;

  metadataUrl: string;
  webProtocolUrl: string;

  corpuses: CorpusMatch[];
  dictionaryStats: DictionaryStats;
  histogram: HistogramItem[];
  documents: SimilarDocument[];
  passages: SimilarityPassage[];

  summary: string;
  recommendation: string;
  plaintext: string;

  fileWarning?: string | null;
  file?: {
    name: string;
    size: number;
    type: string;
    extension: string;
  } | null;

  rawAiJson?: any;
};

// ================= FILE CONFIG =================

const ALLOWED_EXTENSIONS = [
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

const MAX_EXTRACTED_TEXT_LENGTH = 70000;

// ================= BASIC HELPERS =================

function getExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');

  if (index === -1) {
    return '';
  }

  return fileName.slice(index).toLowerCase();
}

function isAllowedFile(file: File) {
  return ALLOWED_EXTENSIONS.includes(getExtension(file.name));
}

function cleanInputText(value: string) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function cleanAiText(value: string) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function stripRtf(value: string) {
  return String(value || '')
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-zA-Z]+\d* ?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function boolValue(value: boolean | string | undefined, fallback = true) {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();

    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }

    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }

  return fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

function clampPercent(value: unknown) {
  const number = safeNumber(value, 0);
  return Math.max(0, Math.min(100, number));
}

function normalizeString(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.trim() || fallback;
}

function formatPercent(value: unknown, decimals = 2) {
  return `${safeNumber(value, 0).toFixed(decimals).replace('.', ',')}%`;
}

function formatDateSk(value?: string) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('sk-SK');
  }

  return date.toLocaleDateString('sk-SK');
}

function normalizeForProtocolText(value: string) {
  return cleanInputText(value)
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([.!?])([A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ])/g, '$1 $2')
    .trim();
}

// ================= TEXT STATS =================

function countDictionaryLikeWords(text: string) {
  const words = cleanInputText(text)
    .split(/\s+/)
    .map((word) =>
      word
        .replace(/[.,;:!?()[\]{}"'„“”‘’<>/\\|+=*_~`^%$#@]/g, '')
        .trim(),
    )
    .filter(Boolean);

  const dictionaryWords = words.filter((word) =>
    /^[A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýžÜÖÄüöäßÉÈÊÀÙÇÑñ]+$/.test(
      word,
    ),
  );

  const dictionaryLengthSum = dictionaryWords.reduce(
    (sum, word) => sum + word.length,
    0,
  );

  const allLengthSum = words.reduce((sum, word) => sum + word.length, 0);

  return {
    totalWords: words.length,
    dictionaryWords: dictionaryWords.length,
    dictionaryWordsRatio:
      words.length > 0 ? (dictionaryWords.length / words.length) * 100 : 0,
    dictionaryLengthSum,
    dictionaryLengthRatio:
      allLengthSum > 0 ? (dictionaryLengthSum / allLengthSum) * 100 : 0,
  };
}

function createDictionaryStats(text: string): DictionaryStats {
  const dictionary = countDictionaryLikeWords(text);

  return {
    extractedChars: text.length,
    totalWords: dictionary.totalWords,
    dictionaryWords: dictionary.dictionaryWords,
    dictionaryWordsRatio: Number(dictionary.dictionaryWordsRatio.toFixed(1)),
    dictionaryLengthSum: dictionary.dictionaryLengthSum,
    dictionaryLengthRatio: Number(dictionary.dictionaryLengthRatio.toFixed(1)),
  };
}

function createHistogram(text: string): HistogramItem[] {
  const words = cleanInputText(text)
    .split(/\s+/)
    .map((word) =>
      word
        .replace(/[.,;:!?()[\]{}"'„“”‘’<>/\\|+=*_~`^%$#@]/g, '')
        .trim(),
    )
    .filter(Boolean);

  const counts: Record<number, number> = {};

  for (let length = 3; length <= 25; length += 1) {
    counts[length] = 0;
  }

  for (const word of words) {
    const length = word.length;

    if (length >= 3 && length <= 25) {
      counts[length] += 1;
    }
  }

  const values = Object.values(counts);
  const average =
    values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;

  return Object.entries(counts).map(([length, count]) => {
    let deviation: '=' | '>>' | '<<' = '=';

    if (average > 0 && count > average * 1.8) {
      deviation = '>>';
    }

    if (average > 0 && count < average * 0.25) {
      deviation = '<<';
    }

    return {
      length: Number(length),
      count,
      deviation,
    };
  });
}

// ================= JSON AI HELPERS =================

function extractJsonFromAi(raw: string) {
  const cleaned = cleanAiText(raw)
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');

    if (first !== -1 && last !== -1 && last > first) {
      const jsonSlice = cleaned.slice(first, last + 1);
      return JSON.parse(jsonSlice);
    }

    throw new Error('AI nevrátilo platný JSON pre protokol originality.');
  }
}

function normalizeDocuments(value: unknown): SimilarDocument[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 30).map((doc: any, index: number) => ({
    id: doc?.id || index + 1,
    order: Number(doc?.order || index + 1),
    citation: normalizeString(
      doc?.citation || doc?.title || doc?.name || doc?.documentTitle,
      `Dokument ${index + 1}`,
    ),
    source: normalizeString(doc?.source || doc?.database, ''),
    plagId: normalizeString(doc?.plagId || doc?.plagID || doc?.id, ''),
    workType: normalizeString(doc?.workType || doc?.type, ''),
    percent: clampPercent(doc?.percent || doc?.score || doc?.similarity),
  }));
}

function normalizePassages(value: unknown): SimilarityPassage[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 40).map((passage: any, index: number) => ({
    id: passage?.id || index + 1,
    paragraph: normalizeString(
      passage?.paragraph || passage?.section,
      `${index + 1}. odsek`,
    ),
    reliability: normalizeString(passage?.reliability, 'orientačná'),
    percent: clampPercent(passage?.percent || passage?.score || 0),
    controlledText: normalizeString(
      passage?.controlledText ||
        passage?.text ||
        passage?.inputText ||
        passage?.originalText,
      '',
    ),
    matchedText: normalizeString(
      passage?.matchedText || passage?.sourceText || passage?.matchText,
      '',
    ),
    sourceTitle: normalizeString(
      passage?.sourceTitle || passage?.source || passage?.documentTitle,
      'ZEDPERA orientačné hodnotenie textu',
    ),
    sourceUrl: normalizeString(passage?.sourceUrl || passage?.url, ''),
    sourceDocNumber:
      passage?.sourceDocNumber !== undefined
        ? Number(passage.sourceDocNumber)
        : index + 1,
    reason: normalizeString(passage?.reason || passage?.comment, ''),
  }));
}

function normalizeCorpuses(value: unknown, score: number): CorpusMatch[] {
  if (Array.isArray(value) && value.length > 0) {
    return value.slice(0, 10).map((item: any) => ({
      name: normalizeString(item?.name || item?.corpus, 'Neznámy korpus'),
      percent: clampPercent(item?.percent || item?.score),
      count:
        item?.count !== undefined && item?.count !== null
          ? Number(item.count)
          : 0,
    }));
  }

  return [
    {
      name: 'Korpus CRZP',
      percent: score,
      count: Math.max(1, Math.round(score * 8)),
    },
    {
      name: 'Internet',
      percent: Math.max(0, Math.min(100, score * 0.48)),
      count: Math.max(0, Math.round(score * 1.4)),
    },
    {
      name: 'Wiki',
      percent: Math.max(0, Math.min(100, score * 0.12)),
      count: Math.max(0, Math.round(score * 0.35)),
    },
    {
      name: 'Slov-Lex',
      percent: 0,
      count: 0,
    },
  ];
}

function createFallbackDocuments(score: number): SimilarDocument[] {
  if (score < 10) return [];

  return [
    {
      order: 1,
      citation:
        'Orientačne identifikované rizikové formulácie v texte / systémová textová analýza ZEDPERA.',
      source: 'ZEDPERA',
      plagId: 'ORIENTACNE',
      workType: 'orientačné vyhodnotenie',
      percent: score,
    },
  ];
}

function createFallbackPassages(text: string, score: number): SimilarityPassage[] {
  const sentences = cleanInputText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 70);

  const risky = sentences
    .filter((sentence) => {
      const lower = sentence.toLowerCase();

      return (
        lower.includes('je dôležité') ||
        lower.includes('v dnešnej dobe') ||
        lower.includes('zohráva významnú úlohu') ||
        lower.includes('môžeme konštatovať') ||
        lower.includes('na základe uvedeného') ||
        lower.includes('problematika') ||
        lower.includes('cieľom práce je') ||
        sentence.length > 220
      );
    })
    .slice(0, 12);

  const selected = risky.length > 0 ? risky : sentences.slice(0, 8);

  return selected.map((sentence, index) => ({
    id: index + 1,
    paragraph: `${index + 1}. odsek`,
    reliability: 'orientačná',
    percent: Math.max(5, Math.min(100, score - index * 2)),
    controlledText: sentence,
    matchedText:
      'Nejde o potvrdenú databázovú zhodu. Pasáž je označená orientačne pre všeobecnosť formulácie, možné chýbajúce citovanie, opisný charakter alebo slabší vlastný autorský prínos.',
    sourceTitle: 'ZEDPERA orientačné hodnotenie textu',
    sourceUrl: '',
    sourceDocNumber: index + 1,
    reason:
      'Pasáž odporúčame skontrolovať, doplniť citáciu, konkrétny zdroj, vlastnú analýzu alebo presnejší odborný kontext.',
  }));
}

// ================= MODEL ROUTER =================

function getModel(agent?: string) {
  if (agent === 'openai' && process.env.OPENAI_API_KEY) {
    return openai(process.env.OPENAI_MODEL || 'gpt-4o-mini');
  }

  if (agent === 'claude' && process.env.ANTHROPIC_API_KEY) {
    return anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6') as any;
  }

  if (agent === 'mistral' && process.env.MISTRAL_API_KEY) {
    return mistral(process.env.MISTRAL_MODEL || 'mistral-small-latest') as any;
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(process.env.GOOGLE_MODEL || 'gemini-2.5-flash') as any;
  }

  if (process.env.OPENAI_API_KEY) {
    return openai(process.env.OPENAI_MODEL || 'gpt-4o-mini');
  }

  throw new Error(
    'Nie je nastavený žiadny AI provider. Doplň GOOGLE_GENERATIVE_AI_API_KEY alebo OPENAI_API_KEY.',
  );
}

// ================= FILE EXTRACTION =================

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParseModule: any = await import('pdf-parse');

  const possibleDefaultParser = pdfParseModule?.default;

  if (typeof possibleDefaultParser === 'function') {
    const result = await possibleDefaultParser(buffer);
    return cleanInputText(result?.text || '');
  }

  if (typeof pdfParseModule === 'function') {
    const result = await pdfParseModule(buffer);
    return cleanInputText(result?.text || '');
  }

  if (typeof pdfParseModule?.parse === 'function') {
    const result = await pdfParseModule.parse(buffer);
    return cleanInputText(result?.text || result?.content || '');
  }

  if (typeof pdfParseModule?.parsePDF === 'function') {
    const result = await pdfParseModule.parsePDF(buffer);
    return cleanInputText(result?.text || result?.content || '');
  }

  throw new Error(
    'PDF parser sa nepodarilo inicializovať. Skontroluj verziu balíka pdf-parse.',
  );
}

async function extractTextFromFile(file: File): Promise<ExtractedUploadResult> {
  const extension = getExtension(file.name);

  if (!isAllowedFile(file)) {
    throw new Error(`Nepodporovaný formát súboru: ${file.name}`);
  }

  if (['.txt', '.md', '.csv'].includes(extension)) {
    const content = await file.text();

    return {
      text: cleanInputText(content),
      warning: null,
    };
  }

  if (extension === '.rtf') {
    try {
      const content = await file.text();

      return {
        text: cleanInputText(stripRtf(content)),
        warning: null,
      };
    } catch (error) {
      console.error('RTF EXTRACT ERROR:', error);

      return {
        text: `[RTF súbor bol priložený: ${file.name}. Text RTF sa nepodarilo automaticky extrahovať.]`,
        warning:
          error instanceof Error
            ? `RTF extrakcia zlyhala: ${error.message}`
            : 'RTF extrakcia zlyhala.',
      };
    }
  }

  if (extension === '.docx') {
    try {
      const mammoth = await import('mammoth');
      const buffer = Buffer.from(await file.arrayBuffer());

      const result = await mammoth.extractRawText({
        buffer,
      } as any);

      return {
        text: cleanInputText(result.value || ''),
        warning:
          result.messages && result.messages.length > 0
            ? result.messages
                .map((message: any) => message?.message)
                .filter(Boolean)
                .join(' | ')
            : null,
      };
    } catch (error) {
      console.error('DOCX EXTRACT ERROR:', error);

      return {
        text: `[DOCX súbor bol priložený: ${file.name}. Text DOCX sa nepodarilo automaticky extrahovať.]`,
        warning:
          error instanceof Error
            ? `DOCX extrakcia zlyhala: ${error.message}`
            : 'DOCX extrakcia zlyhala.',
      };
    }
  }

  if (['.xls', '.xlsx'].includes(extension)) {
    try {
      const xlsx = await import('xlsx');
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = xlsx.read(buffer, { type: 'buffer' });

      const texts: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = xlsx.utils.sheet_to_csv(sheet);

        if (csv.trim()) {
          texts.push(`Hárok: ${sheetName}\n${csv}`);
        }
      }

      return {
        text: cleanInputText(texts.join('\n\n')),
        warning: null,
      };
    } catch (error) {
      console.error('XLSX EXTRACT ERROR:', error);

      return {
        text: `[Tabuľkový súbor bol priložený: ${file.name}. Text z tabuľky sa nepodarilo automaticky extrahovať.]`,
        warning:
          error instanceof Error
            ? `Tabuľková extrakcia zlyhala: ${error.message}`
            : 'Tabuľková extrakcia zlyhala.',
      };
    }
  }

  if (extension === '.pdf') {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const extractedText = await extractPdfText(buffer);

      if (!extractedText.trim()) {
        return {
          text: `[PDF súbor bol priložený: ${file.name}. PDF neobsahuje čitateľný text alebo je skenované ako obrázok.]`,
          warning:
            'PDF neobsahuje čitateľný text alebo je skenované ako obrázok.',
        };
      }

      return {
        text: extractedText,
        warning: null,
      };
    } catch (error) {
      console.error('PDF EXTRACT ERROR:', error);

      return {
        text: `[PDF súbor bol priložený: ${file.name}. Text PDF sa nepodarilo automaticky extrahovať.]`,
        warning:
          error instanceof Error
            ? `PDF extrakcia zlyhala: ${error.message}`
            : 'PDF extrakcia zlyhala.',
      };
    }
  }

  if (['.doc', '.odt', '.ppt', '.pptx'].includes(extension)) {
    return {
      text: `[Súbor bol priložený: ${file.name}. Tento formát je povolený, ale plná extrakcia textu pre tento typ zatiaľ nie je aktívna. Pre presnejšiu kontrolu vlož text práce aj ručne alebo nahraj DOCX/PDF/TXT.]`,
      warning:
        'Súbor je povolený, ale text sa z tohto typu v tejto trase plne neextrahuje.',
    };
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
    return {
      text: `[Obrázok bol priložený: ${file.name}. OCR alebo vizuálna analýza obrázkov zatiaľ nie je aktívna. Pre presnejšiu kontrolu vlož text z obrázka aj ručne.]`,
      warning:
        'Obrázok bol priložený, ale OCR v tejto trase zatiaľ nie je aktívne.',
    };
  }

  return {
    text: `[Súbor bol priložený: ${file.name}.]`,
    warning: null,
  };
}

// ================= AI PROMPT =================

function buildProtocolPrompt(data: {
  text: string;
  title: string;
  authorName: string;
  school: string;
  faculty: string;
  studyProgram: string;
  supervisor: string;
  workType: string;
  citationStyle: string;
  language: string;
  activeProfile: any;
  checkAuthenticity: boolean;
  dictionaryStats: DictionaryStats;
}) {
  return `
Si ZEDPERA Originalita.

Tvoj cieľ:
Vrátiť štruktúrované dáta pre protokol s názvom "Protokol o kontrole originality".

DÔLEŽITÉ:
- Neuvádzaj, že ide o oficiálnu kontrolu CRZP, Turnitin alebo školský systém.
- Neuvádzaj vymyslené DOI, URL, databázy ani reálne zhody, ak ich nevieš overiť.
- Výsledok je orientačný.
- Hodnoť text podľa rizika podobnosti, všeobecných formulácií, chýbajúcich citácií, možného parafrázovania bez zdroja, slabého autorského prínosu a generického akademického štýlu.
- Vráť iba čistý JSON.
- Bez Markdownu.
- Bez komentára mimo JSON.
- JSON musí byť parsovateľný cez JSON.parse.

ÚDAJE O PRÁCI:
Názov práce: ${data.title || 'Neuvedené'}
Autor: ${data.authorName || 'Neuvedené'}
Škola: ${data.school || 'Neuvedené'}
Fakulta: ${data.faculty || 'Neuvedené'}
Študijný program: ${data.studyProgram || 'Neuvedené'}
Vedúci práce: ${data.supervisor || data.activeProfile?.supervisor || 'Neuvedené'}
Typ práce: ${data.workType || data.activeProfile?.type || 'Neuvedené'}
Citačná norma: ${data.citationStyle || data.activeProfile?.citation || 'ISO 690'}
Jazyk: ${data.language || data.activeProfile?.language || 'SK'}
Kontrola autentickosti textu: ${data.checkAuthenticity ? 'Áno' : 'Nie'}

PROFIL PRÁCE:
Téma: ${data.activeProfile?.topic || 'Neuvedené'}
Cieľ: ${data.activeProfile?.goal || 'Neuvedené'}
Metodológia: ${data.activeProfile?.methodology || 'Neuvedené'}
Odbor: ${data.activeProfile?.field || 'Neuvedené'}

TECHNICKÉ ÚDAJE O TEXTE:
Dĺžka extrahovaného textu v znakoch: ${data.dictionaryStats.extractedChars}
Celkový počet slov: ${data.dictionaryStats.totalWords}
Počet slov v slovníku: ${data.dictionaryStats.dictionaryWords}
Pomer slovníkových slov: ${data.dictionaryStats.dictionaryWordsRatio} %
Súčet dĺžky slov v slovníku: ${data.dictionaryStats.dictionaryLengthSum}
Pomer dĺžky slovníkových slov: ${data.dictionaryStats.dictionaryLengthRatio} %

TEXT NA KONTROLU:
"""
${data.text}
"""

Vráť presne JSON v tejto štruktúre:

{
  "score": number,
  "title": string,
  "author": string,
  "school": string,
  "faculty": string,
  "studyProgram": string,
  "supervisor": string,
  "workType": string,
  "citationStyle": string,
  "language": string,
  "summary": string,
  "recommendation": string,
  "corpuses": [
    {
      "name": string,
      "percent": number,
      "count": number
    }
  ],
  "documents": [
    {
      "order": number,
      "citation": string,
      "source": string,
      "plagId": string,
      "workType": string,
      "percent": number
    }
  ],
  "passages": [
    {
      "paragraph": string,
      "reliability": string,
      "percent": number,
      "controlledText": string,
      "matchedText": string,
      "sourceTitle": string,
      "sourceUrl": string,
      "sourceDocNumber": number,
      "reason": string
    }
  ]
}

Význam:
- "score" je percento rizika podobnosti pre protokol.
- Čím vyššie číslo, tým vyššie riziko podobnosti.
- "passages" musia obsahovať konkrétne vety alebo úseky z kontrolovaného textu.
- "matchedText" nepíš ako potvrdenú databázovú zhodu, ak ju nevieš overiť.
- Ak nemáš reálny externý zdroj, sourceTitle nastav na "ZEDPERA orientačné hodnotenie textu".
- Percentá drž v rozsahu 0 až 100.
`;
}

// ================= PROTOCOL NORMALIZATION =================

function normalizeProtocolData(params: {
  aiData: any;
  text: string;
  body: OriginalityRequest;
  activeProfile: any;
  uploadedFile: File | null;
  fileWarning: string | null;
  report: string;
  savedId: string | null;
}): Omit<ProtocolResponse, 'protocolText' | 'text' | 'content' | 'report'> {
  const {
    aiData,
    text,
    body,
    activeProfile,
    uploadedFile,
    fileWarning,
    savedId,
  } = params;

  const dictionaryStats = createDictionaryStats(text);
  const histogram = createHistogram(text);

  const title =
    normalizeString(aiData?.title) ||
    normalizeString(body.title) ||
    normalizeString(activeProfile?.title) ||
    'Kontrolovaná práca';

  const author =
    normalizeString(aiData?.author) ||
    normalizeString(body.author) ||
    normalizeString(body.authorName) ||
    'Neuvedené';

  const school =
    normalizeString(aiData?.school) ||
    normalizeString(body.school) ||
    'Neuvedené';

  const faculty =
    normalizeString(aiData?.faculty) ||
    normalizeString(body.faculty) ||
    'Neuvedené';

  const studyProgram =
    normalizeString(aiData?.studyProgram) ||
    normalizeString(body.studyProgram) ||
    'Neuvedené';

  const supervisor =
    normalizeString(aiData?.supervisor) ||
    normalizeString(body.supervisor) ||
    normalizeString(activeProfile?.supervisor) ||
    'Neuvedené';

  const workType =
    normalizeString(aiData?.workType) ||
    normalizeString(body.workType) ||
    normalizeString(activeProfile?.type) ||
    'Neuvedené';

  const citationStyle =
    normalizeString(aiData?.citationStyle) ||
    normalizeString(body.citationStyle) ||
    normalizeString(activeProfile?.citation) ||
    'ISO 690';

  const language =
    normalizeString(aiData?.language) ||
    normalizeString(body.language) ||
    normalizeString(activeProfile?.workLanguage) ||
    normalizeString(activeProfile?.language) ||
    'SK';

  const score = clampPercent(
    aiData?.score ??
      aiData?.similarityRiskScore ??
      aiData?.overallPercent ??
      aiData?.percent ??
      0,
  );

  const documents = normalizeDocuments(aiData?.documents);
  const passages = normalizePassages(aiData?.passages);

  const finalDocuments =
    documents.length > 0 ? documents : createFallbackDocuments(score);

  const finalPassages =
    passages.length > 0 ? passages : createFallbackPassages(text, score);

  const id = savedId || null;

  const metadataUrl = id
    ? `metadata:https://opac.crzp.sk/?fn=detailBiblioForm&sid=${id}`
    : 'metadata:';

  const webProtocolUrl = id
    ? `webprotokol:https://www.crzp.sk/eprotokol?pid=${id}`
    : 'webprotokol:';

  return {
    ok: true,
    id,

    protocolTitle: 'Protokol',

    score,
    title,
    author,
    school,
    faculty,
    studyProgram,
    supervisor,
    workType,
    citationStyle,
    language,
    createdAt: new Date().toISOString(),

    metadataUrl,
    webProtocolUrl,

    corpuses: normalizeCorpuses(aiData?.corpuses, score),
    dictionaryStats,
    histogram,
    documents: finalDocuments,
    passages: finalPassages,

    summary:
      normalizeString(aiData?.summary) ||
      'Výsledok je orientačná kontrola originality. Protokol vyhodnocuje podobnosť, rizikové formulácie, chýbajúce citácie, všeobecné pasáže a akademickú autentickosť textu.',

    recommendation:
      normalizeString(aiData?.recommendation) ||
      'Skontrolujte označené pasáže, doplňte zdroje, upravte všeobecné formulácie, posilnite vlastný komentár autora a overte výsledok v oficiálnom systéme školy.',

    plaintext: text,

    fileWarning,

    file: uploadedFile
      ? {
          name: uploadedFile.name,
          size: uploadedFile.size,
          type: uploadedFile.type,
          extension: getExtension(uploadedFile.name),
        }
      : null,

    rawAiJson: aiData,
  };
}

// ================= PROTOCOL TEXT GENERATOR =================

function createProtocolText(data: Omit<ProtocolResponse, 'protocolText' | 'text' | 'content' | 'report'>) {
  const date = formatDateSk(data.createdAt);

  const corpusesLine = data.corpuses
    .map(
      (corpus) =>
        `${corpus.name}:${formatPercent(corpus.percent, 2)} (${corpus.count ?? 0})`,
    )
    .join(', ');

  const histogramLengths = data.histogram.map((item) => item.length).join('\n');
  const histogramDeviations = data.histogram
    .map((item) => item.deviation)
    .join('\n');

  const documentsText =
    data.documents.length > 0
      ? data.documents
          .map((doc, index) => {
            return `${doc.order || index + 1}
${doc.citation}
plagID: ${doc.plagId || 'ORIENTACNE'} typ práce: ${
              doc.workType || data.workType || 'neurčené'
            } zdroj: ${doc.source || 'ZEDPERA'}
${formatPercent(doc.percent, 2)}`;
          })
          .join('\n\n')
      : 'Neboli identifikované práce s nadprahovou hodnotou podobnosti.';

  const detailsText =
    data.passages.length > 0
      ? data.passages
          .map((passage, index) => {
            const controlled = normalizeForProtocolText(passage.controlledText);
            const matched = normalizeForProtocolText(passage.matchedText || '');
            const reason = normalizeForProtocolText(passage.reason || '');

            return `${index + 1}. odsek : spoľahlivosť [${
              passage.reliability ||
              (typeof passage.percent === 'number'
                ? formatPercent(passage.percent, 0)
                : 'orientačná')
            }]
${controlled}

Zdroj / porovnanie:
${matched || 'Nejde o potvrdenú databázovú zhodu. Ide o orientačné označenie rizikovej pasáže.'}

${reason ? `Dôvod: ${reason}` : ''}`;
          })
          .join('\n\n')
      : 'Neboli vrátené konkrétne zistené podobnosti.';

  const plaintext = data.plaintext.slice(0, 70000);

  return `Protokol

${date} (verzia 3.0) - www.crzp.sk/vysvetlivky30.pdf
Protokolokontroleoriginality

${data.metadataUrl}
${data.webProtocolUrl}

Kontrolovanápráca
Citácia
Percento*
${data.title} / autor ${data.author} - školiteľ ${data.supervisor}
${data.faculty} / ${data.studyProgram}. - ${data.school}. - ${new Date(
    data.createdAt,
  ).getFullYear()}.
plagID: ${data.id || 'ORIENTACNE'} typ práce: ${data.workType} zdroj: ${
    data.school
  }
${formatPercent(data.score, 2)}

*Číslo vyjadruje percentuálny podiel textu, ktorý má prekryv s indexom kontrolovaných textových vzorov. Intervaly grafického zvýraznenia prekryvu sú nastavené na [0-20, 21-40, 41-60, 61-80, 81-100].

Zhoda v korpusoch: ${corpusesLine}

Informácieoextrahovanomtextedodanomnakontrolu
Dĺžka extrahovaného textu v znakoch: ${data.dictionaryStats.extractedChars}
Celkový počet slov textu: ${data.dictionaryStats.totalWords}
Počet slov v slovníku (SK, CZ, EN, HU, DE): ${data.dictionaryStats.dictionaryWords}
Pomer počtu slovníkových slov: ${formatPercent(
    data.dictionaryStats.dictionaryWordsRatio,
    1,
  )}
Súčet dĺžky slov v slovníku (SK, CZ, EN, HU, DE): ${
    data.dictionaryStats.dictionaryLengthSum
  }
Pomer dĺžky slovníkových slov: ${formatPercent(
    data.dictionaryStats.dictionaryLengthRatio,
    1,
  )}

Interval
100%-70%
70%-60%
60%-50%
40%-30%
30%-0%

Vplyv na KO*
žiadny
malý
stredný
veľký
zásadný

*Kontrola originality je výrazne ovplyvnená kvalitou dodaného textu. Slovníkový test vyjadruje mieru zhody slov kontrolovanej práce so slovníkom referenčných slov podporovaných jazykov. Nízka zhoda môže byť spôsobená: nepodporovaný jazyk, chyba prevodu PDF alebo úmyselná manipulácia textu. Text práce na vizuálnu kontrolu je na konci protokolu.

Početnosť slov-histogram
Dĺžka slova
${histogramLengths}

Indik. odchylka
${histogramDeviations}

*Odchýlky od priemerných hodnôt početnosti slov. Profil početností slov je počítaný orientačne podľa extrahovaného textu. Značka ">>" indikuje výrazne viac slov danej dĺžky ako priemer a značka "<<" výrazne menej slov danej dĺžky ako priemer. Výrazné odchýlky môžu indikovať manipuláciu textu. Je potrebné skontrolovať "plaintext"! Priveľa krátkych slov indikuje vkladanie oddelovačov alebo znakov netradičného kódovania. Priveľa dlhých slov indikuje vkladanie bielych znakov, prípadne iný jazyk práce.

Prácesnadprahovouhodnotoupodobnosti
Dok.
Citácia
Percento*
${documentsText}

*Číslo vyjadruje percentuálny prekryv testovaného dokumentu len s dokumentom alebo orientačnou kategóriou uvedenou v príslušnom riadku.
:Dokument má prekryv s viacerými rizikovými formuláciami. Zoznam dokumentov je krátený a usporiadaný podľa percenta zostupne. Celkový počet dokumentov je [${data.documents.length}]. Pri veľkom počte býva často príčinou zhoda v texte, ktorý je predpísaný pre daný typ práce, napríklad položky tabuliek, záhlavia, čestné vyhlásenia, poďakovania alebo všeobecné formulácie.

Detaily-zistenépodobnosti
${detailsText}

Plaintext dokumentunakontrolu
Skontroluje extrahovaný text práce na konci protokolu! Plaintext (čistý text - extrahovaný text) dokumentuje základom pre textový analyzátor. Tento text môže byť poškodený úmyselne vkladaním znakov, používaním neštandardných znakových sád alebo neúmyselne napr. pri konverzii na PDF nekvalitným programom. Nepoškodený text je čitateľný, slová sú správne oddelené, diakritické znaky sú správne, množstvo textu je primerané rozsahu práce.

___________________________________________________________________________

${plaintext}

${data.metadataUrl}
${data.webProtocolUrl}

Upozornenie:
Tento protokol je orientačný výstup systému ZEDPERA Originalita. Nenahrádza oficiálnu kontrolu originality školy, CRZP, Turnitin ani iný autorizovaný antiplagiátorský systém.
`;
}

// ================= API ROUTE =================

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let body: OriginalityRequest = {};
    let uploadedFile: File | null = null;
    let uploadedFiles: File[] = [];
    let fileWarning: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      const rawSingleFile = formData.get('file');
      const rawMultipleFiles = formData.getAll('files');

      uploadedFile = rawSingleFile instanceof File ? rawSingleFile : null;

      uploadedFiles = rawMultipleFiles.filter(
        (item): item is File => item instanceof File,
      );

      if (!uploadedFile && uploadedFiles.length > 0) {
        uploadedFile = uploadedFiles[0];
      }

      const activeProfileRaw = formData.get('activeProfile')?.toString() || '';

      let activeProfile = null;

      try {
        activeProfile = activeProfileRaw ? JSON.parse(activeProfileRaw) : null;
      } catch {
        activeProfile = null;
      }

      body = {
        title: formData.get('title')?.toString() || '',
        author: formData.get('author')?.toString() || '',
        authorName:
          formData.get('authorName')?.toString() ||
          formData.get('author')?.toString() ||
          '',
        school: formData.get('school')?.toString() || '',
        faculty: formData.get('faculty')?.toString() || '',
        studyProgram: formData.get('studyProgram')?.toString() || '',
        supervisor: formData.get('supervisor')?.toString() || '',
        workType: formData.get('workType')?.toString() || '',
        citationStyle: formData.get('citationStyle')?.toString() || 'ISO 690',
        language: formData.get('language')?.toString() || 'SK',
        text: formData.get('text')?.toString() || '',
        profileId: formData.get('profileId')?.toString() || null,
        agent: (formData.get('agent')?.toString() || 'gemini') as any,
        checkAuthenticity:
          formData.get('checkAuthenticity')?.toString() !== 'false',
        activeProfile,
      };
    } else {
      body = (await req.json()) as OriginalityRequest;
    }

    let extractedFromFile = '';

    const filesToExtract =
      uploadedFiles.length > 0
        ? uploadedFiles
        : uploadedFile
          ? [uploadedFile]
          : [];

    for (const file of filesToExtract) {
      const extracted = await extractTextFromFile(file);

      if (extracted.text) {
        extractedFromFile += `\n\n===== SÚBOR: ${file.name} =====\n${extracted.text}`;
      }

      if (extracted.warning) {
        fileWarning = fileWarning
          ? `${fileWarning} | ${extracted.warning}`
          : extracted.warning;
      }
    }

    const text = cleanInputText(
      `${body.text || ''}\n\n${extractedFromFile || ''}`,
    );

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: 'TEXT_REQUIRED',
          message: 'Chýba text práce alebo extrahovaný obsah súboru.',
        },
        { status: 400 },
      );
    }

    if (text.length < 300) {
      return NextResponse.json(
        {
          ok: false,
          error: 'TEXT_TOO_SHORT',
          message:
            'Na kontrolu vlož aspoň 300 znakov alebo nahraj čitateľný súbor.',
        },
        { status: 400 },
      );
    }

    const activeProfile = body.activeProfile || null;
    const dictionaryStats = createDictionaryStats(text);

    const prompt = buildProtocolPrompt({
      text: text.slice(0, MAX_EXTRACTED_TEXT_LENGTH),
      title: body.title || activeProfile?.title || 'Kontrola originality',
      authorName: body.authorName || body.author || '',
      school: body.school || '',
      faculty: body.faculty || '',
      studyProgram: body.studyProgram || '',
      supervisor: body.supervisor || activeProfile?.supervisor || '',
      workType: body.workType || activeProfile?.type || '',
      citationStyle: body.citationStyle || activeProfile?.citation || 'ISO 690',
      language:
        body.language ||
        activeProfile?.workLanguage ||
        activeProfile?.language ||
        'SK',
      activeProfile,
      checkAuthenticity: boolValue(body.checkAuthenticity, true),
      dictionaryStats,
    });

    const model = getModel(body.agent);

    const aiResult = await generateText({
      model,
      prompt,
      temperature: 0.05,
      maxOutputTokens: 6000,
    });

    const rawAiReport = cleanAiText(aiResult.text || '');

    let aiData: any = {};

    try {
      aiData = extractJsonFromAi(rawAiReport);
    } catch (parseError) {
      console.error('ORIGINALITY JSON PARSE ERROR:', parseError);
      aiData = {};
    }

    let savedId: string | null = null;

    const preliminaryData = normalizeProtocolData({
      aiData,
      text,
      body,
      activeProfile,
      uploadedFile,
      fileWarning,
      report: rawAiReport,
      savedId: null,
    });

    try {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from('zedpera_originality_checks')
        .insert({
          user_id: null,
          profile_id: body.profileId || null,

          title: preliminaryData.title,
          author_name: preliminaryData.author || null,
          school: preliminaryData.school || null,
          faculty: preliminaryData.faculty || null,
          study_program: preliminaryData.studyProgram || null,
          supervisor: preliminaryData.supervisor || null,

          work_type: preliminaryData.workType || null,
          citation_style: preliminaryData.citationStyle || 'ISO 690',
          language: preliminaryData.language || 'SK',

          file_name: uploadedFile?.name || null,
          file_size: uploadedFile?.size || null,
          mime_type: uploadedFile?.type || null,

          extracted_text: text,
          input_length: text.length,

          originality_score: Math.max(0, 100 - preliminaryData.score),
          similarity_risk_score: preliminaryData.score,
          ai_style_score: null,
          authenticity_score: null,

          risk_level: preliminaryData.summary,
          summary: preliminaryData.summary,

          risky_passages: preliminaryData.passages,
          missing_citations: [],
          recommendations: preliminaryData.recommendation
            ? [{ text: preliminaryData.recommendation }]
            : [],
          authentic_rewrite: [],

          raw_report: rawAiReport,
          status: 'completed',
        })
        .select('id')
        .single();

      if (!error && data?.id) {
        savedId = data.id;
      }

      if (error) {
        console.error('ORIGINALITY SAVE ERROR:', error);
      }
    } catch (saveError) {
      console.error('ORIGINALITY SAVE ERROR:', saveError);
    }

    const finalData = normalizeProtocolData({
      aiData,
      text,
      body,
      activeProfile,
      uploadedFile,
      fileWarning,
      report: rawAiReport,
      savedId,
    });

    const protocolText = createProtocolText(finalData);

    const response: ProtocolResponse = {
      ...finalData,
      protocolText,
      text: protocolText,
      content: protocolText,
      report: protocolText,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('ORIGINALITY API ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'ORIGINALITY_CHECK_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Neznáma chyba pri kontrole originality.',
      },
      { status: 500 },
    );
  }
}