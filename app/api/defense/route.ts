import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 75_000,
  maxRetries: 1,
});

const MODEL = process.env.OPENAI_DEFENSE_MODEL || 'gpt-4.1-mini';

const MAX_TEXT_CHARS_PER_FILE = 80_000;
const MAX_TOTAL_ATTACHMENT_CHARS = 180_000;
const MAX_WORK_TEXT_CHARS = 180_000;
const LARGE_FILE_LIMIT_BYTES = 8 * 1024 * 1024;
const MIN_SLIDES_WITH_WORK_TEXT = 10;
const TARGET_SLIDES_WITH_WORK_TEXT = 13;
const MAX_SLIDES = 14;

type SavedProfile = {
  title?: string;
  topic?: string;
  type?: string;
  level?: string;
  field?: string;
  supervisor?: string;
  citation?: string;
  language?: string;
  interfaceLanguage?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  problem?: string;
  researchProblem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;
  contribution?: string;
  sourcesRequirement?: string;
  keywords?: string[];
  keywordsList?: string[];
  schema?: {
    label?: string;
    structure?: string | string[];
    requiredSections?: string | string[];
    recommendedLength?: string;
    aiInstruction?: string;
  };
};

type DefenseSlide = {
  title: string;
  bullets: string[];
  speakerNotes?: string;
  visualSuggestion?: string;
  layout?: 'title' | 'content' | 'two-column' | 'table' | 'image' | 'closing';
};

type ReviewFileInfo = {
  name: string;
  size: number;
  type: string;
  text: string;
  compressed: boolean;
  extractionAvailable: boolean;
  warning?: string;
  detectedKind?: 'work' | 'review' | 'image' | 'table' | 'unknown';
};

type DefenseQuestionAnswer = {
  directAnswer: string;
  oralAnswer: string;
  keyArguments: string[];
  defenseStrategy: string[];
  caveat?: string;
  followUpQuestions: Array<{
    question: string;
    answer: string;
  }>;
};

type DefenseResponse = {
  ok: boolean;
  code?: string;
  detail?: string;
  mode?: 'presentation' | 'question';
  slides?: DefenseSlide[];
  questionAnswer?: DefenseQuestionAnswer;
  answer?: string;
  textOutput?: string;

  /**
   * Kompatibilné textové aliasy pre spoločné frontendy modulov.
   * Všetky obsahujú rovnaký vyčistený výsledok.
   */
  output?: string;
  result?: string;
  message?: string;
  text?: string;

  reviewsCount?: number;
  reviews?: Array<{
    name: string;
    size: number;
    type: string;
    compressed: boolean;
    extractionAvailable: boolean;
    warning?: string;
    detectedKind?: string;
  }>;
  allowedExports?: Array<'docx' | 'pdf' | 'pptx'>;
  disallowedExports?: Array<'xlsx'>;
  pptxEndpoint?: string;
  warning?: string;
  error?: string;
  meta?: {
    model: string;
    finalTitle: string;
    workTextChars: number;
    extractedFilesCount: number;
    imageFilesCount: number;
    generatedSlidesCount: number;
    fallbackUsed: boolean;
    shortInstructionDetected: boolean;
  };
};

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function cleanInvisibleCharacters(value: string) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function stripMarkdownFences(value: string) {
  return String(value || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function extractJsonObject(value: string) {
  const raw = stripMarkdownFences(value);
  const firstBrace = raw.indexOf('{');

  if (firstBrace === -1) return raw;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = firstBrace; i < raw.length; i += 1) {
    const char = raw[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;

    if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        return raw.slice(firstBrace, i + 1);
      }
    }
  }

  return raw;
}

function cleanClientVisibleText(value: string) {
  return cleanInvisibleCharacters(value)
    .replace(/\bprimárny zdroj\b/gi, '')
    .replace(/\bsekundárny zdroj\b/gi, '')
    .replace(/\binterný zdroj\b/gi, '')
    .replace(/\banalyzovaný zdroj\b/gi, '')
    .replace(/\bpodľa nahratého súboru\b/gi, '')
    .replace(/\bpodľa prílohy\b/gi, '')
    .replace(/\bpoužívateľ nahral súbor\b/gi, '')
    .replace(/\bdokument obsahuje\b/gi, '')
    .replace(/\bAI vedúci\b/gi, '')
    .replace(/\bsystémová poznámka\b/gi, '')
    .replace(/\btechnická poznámka\b/gi, '')
    .replace(/\bprompt\b/gi, '')
    .replace(/\bmodel\b/gi, '')
    .replace(/\bOpenAI\b/gi, '')
    .replace(/\bZEDPERA\b/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanBullet(value: string) {
  return cleanClientVisibleText(value)
    .replace(/^[-•–—]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim();
}

function normalizeSlide(slide: unknown): DefenseSlide | null {
  if (!slide || typeof slide !== 'object') return null;

  const raw = slide as Record<string, unknown>;
  const title = cleanClientVisibleText(String(raw.title || ''));

  if (!title) return null;

  const bulletsRaw = Array.isArray(raw.bullets) ? raw.bullets : [];
  const bullets = bulletsRaw
    .map((item) => cleanBullet(String(item || '')))
    .filter(Boolean)
    .slice(0, 6);

  if (bullets.length === 0) return null;

  const layoutRaw = String(raw.layout || 'content') as DefenseSlide['layout'];
  const allowedLayouts: Array<NonNullable<DefenseSlide['layout']>> = [
    'title',
    'content',
    'two-column',
    'table',
    'image',
    'closing',
  ];

  return {
    title,
    bullets,
    speakerNotes: cleanClientVisibleText(String(raw.speakerNotes || '')),
    visualSuggestion: cleanClientVisibleText(String(raw.visualSuggestion || '')),
    layout: allowedLayouts.includes(layoutRaw as NonNullable<DefenseSlide['layout']>)
      ? layoutRaw
      : 'content',
  };
}

function normalizeSlides(value: unknown): DefenseSlide[] {
  if (!value || typeof value !== 'object') return [];

  const raw = value as Record<string, unknown>;
  const rawSlides = Array.isArray(raw.slides) ? raw.slides : [];

  return rawSlides
    .map((slide) => normalizeSlide(slide))
    .filter((slide): slide is DefenseSlide => Boolean(slide))
    .slice(0, MAX_SLIDES);
}

function getProfileKeywords(profile: SavedProfile | null) {
  if (!profile) return 'nezadané';

  if (Array.isArray(profile.keywords) && profile.keywords.length > 0) {
    return profile.keywords.filter(Boolean).join(', ');
  }

  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length > 0) {
    return profile.keywordsList.filter(Boolean).join(', ');
  }

  return 'nezadané';
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function truncateText(value: string, maxChars: number) {
  const clean = cleanInvisibleCharacters(value);

  if (clean.length <= maxChars) {
    return {
      text: clean,
      truncated: false,
    };
  }

  const startLength = Math.floor(maxChars * 0.45);
  const middleLength = Math.floor(maxChars * 0.2);
  const endLength = Math.max(1, maxChars - startLength - middleLength);
  const middleStart = Math.max(0, Math.floor(clean.length / 2) - Math.floor(middleLength / 2));

  return {
    text: [
      clean.slice(0, startLength),
      '\n\n[Text bol skrátený kvôli technickému limitu. Túto poznámku nepoužívaj vo výstupe.]\n',
      clean.slice(middleStart, middleStart + middleLength),
      '\n\n[Pokračovanie skráteného textu.]\n',
      clean.slice(clean.length - endLength),
    ].join('\n'),
    truncated: true,
  };
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : fileName.slice(lastDotIndex).toLowerCase();
}

function isImageFile(fileName: string, fileType: string) {
  const lowerName = fileName.toLowerCase();
  const lowerType = fileType.toLowerCase();

  return (
    lowerType.startsWith('image/') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.gif')
  );
}

function isTextLikeFile(fileName: string, fileType: string) {
  const lowerName = fileName.toLowerCase();
  const lowerType = fileType.toLowerCase();

  return (
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.rtf') ||
    lowerName.endsWith('.json') ||
    lowerType.startsWith('text/') ||
    lowerType.includes('csv') ||
    lowerType.includes('json')
  );
}

function stripRtf(value: string) {
  return cleanInvisibleCharacters(
    value
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\line/g, '\n')
      .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
      .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
      .replace(/[{}]/g, ' '),
  );
}

function detectFileKind(fileName: string, fileType: string): ReviewFileInfo['detectedKind'] {
  const lower = `${fileName} ${fileType}`.toLowerCase();

  if (isImageFile(fileName, fileType)) return 'image';
  if (lower.includes('posud') || lower.includes('review') || lower.includes('otaz') || lower.includes('otáz')) return 'review';
  if (lower.includes('tab') || lower.includes('xlsx') || lower.includes('xls') || lower.includes('csv')) return 'table';
  if (lower.includes('praca') || lower.includes('práca') || lower.includes('thesis') || lower.includes('diplom') || lower.includes('bakalar')) return 'work';

  return 'unknown';
}

async function extractDocxText(buffer: Buffer) {
  const mammothModule: any = await import('mammoth');
  const mammoth = mammothModule?.default || mammothModule;
  const result = await mammoth.extractRawText({ buffer });
  return cleanInvisibleCharacters(result?.value || '');
}

async function extractPdfText(buffer: Buffer) {
  const pdfParseModule: any = await import('pdf-parse');
  const parser =
    typeof pdfParseModule?.default === 'function'
      ? pdfParseModule.default
      : typeof pdfParseModule === 'function'
        ? pdfParseModule
        : pdfParseModule?.parse;

  if (typeof parser !== 'function') {
    throw new Error('PDF parser sa nepodarilo inicializovať.');
  }

  const result = await parser(buffer);
  return cleanInvisibleCharacters(result?.text || '');
}

async function extractExcelText(buffer: Buffer) {
  const xlsxModule: any = await import('xlsx');
  const xlsx = xlsxModule?.default || xlsxModule;
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames || []) {
    const sheet = workbook.Sheets[sheetName];
    const csv = xlsx.utils.sheet_to_csv(sheet);

    if (csv.trim()) {
      parts.push(`Hárok: ${sheetName}\n${csv}`);
    }
  }

  return cleanInvisibleCharacters(parts.join('\n\n'));
}

async function extractTextFromUploadedFile(file: File): Promise<ReviewFileInfo> {
  const name = file.name || 'bez-nazvu';
  const type = file.type || 'application/octet-stream';
  const size = file.size || 0;
  const compressed = size > LARGE_FILE_LIMIT_BYTES;
  const extension = getFileExtension(name);
  const detectedKind = detectFileKind(name, type);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isImageFile(name, type)) {
      return {
        name,
        size,
        type,
        text: [
          'Vizuálna príloha bola prijatá.',
          `Názov: ${name}`,
          `Typ: ${type}`,
          `Veľkosť: ${formatFileSize(size)}`,
          'Pri tvorbe prezentácie navrhni samostatný vizuálny slide alebo miesto, kam sa má obrázok vložiť.',
        ].join('\n'),
        compressed,
        extractionAvailable: false,
        detectedKind: 'image',
        warning: 'Obrázok bol prijatý ako vizuálna príloha. Text sa z obrázka v tejto route neextrahuje.',
      };
    }

    let extractedText = '';

    if (isTextLikeFile(name, type)) {
      const decoded = buffer.toString('utf-8');
      extractedText = extension === '.rtf' ? stripRtf(decoded) : cleanInvisibleCharacters(decoded);
    } else if (extension === '.docx' || type.includes('wordprocessingml.document')) {
      extractedText = await extractDocxText(buffer);
    } else if (extension === '.pdf' || type.includes('pdf')) {
      extractedText = await extractPdfText(buffer);
    } else if (extension === '.xlsx' || extension === '.xls' || type.includes('spreadsheet')) {
      extractedText = await extractExcelText(buffer);
    }

    if (extractedText) {
      const truncated = truncateText(extractedText, MAX_TEXT_CHARS_PER_FILE);

      return {
        name,
        size,
        type,
        text: truncated.text,
        compressed: compressed || truncated.truncated,
        extractionAvailable: true,
        detectedKind,
        warning: truncated.truncated
          ? 'Text prílohy bol skrátený kvôli veľkosti.'
          : undefined,
      };
    }

    return {
      name,
      size,
      type,
      text: [
        `Príloha bola prijatá.`,
        `Názov: ${name}`,
        `Typ: ${type}`,
        `Veľkosť: ${formatFileSize(size)}`,
        `Text z tohto typu súboru sa nepodarilo priamo extrahovať.`,
      ].join('\n'),
      compressed,
      extractionAvailable: false,
      detectedKind,
      warning:
        'Text z tejto prílohy nebol automaticky extrahovaný. Ak ide o sken PDF, vložte aj skopírovaný text alebo použite OCR pred nahratím.',
    };
  } catch (error) {
    return {
      name,
      size,
      type,
      text: [
        `Príloha bola prijatá, ale nepodarilo sa ju prečítať.`,
        `Názov: ${name}`,
        `Typ: ${type}`,
        `Veľkosť: ${formatFileSize(size)}`,
      ].join('\n'),
      compressed,
      extractionAvailable: false,
      detectedKind,
      warning:
        error instanceof Error
          ? `Súbor sa nepodarilo prečítať: ${error.message}`
          : 'Súbor sa nepodarilo prečítať.',
    };
  }
}

function isShortInstructionOnly(value: string) {
  const text = cleanInvisibleCharacters(value).toLowerCase();

  if (!text) return true;
  if (text.length > 450) return false;

  const instructionWords = [
    'priprav',
    'vytvor',
    'sprav',
    'urob',
    'prezent',
    'obhajob',
    'podľa',
    'podla',
    'priložen',
    'priloh',
    'ppt',
    'slid',
  ];

  return instructionWords.some((word) => text.includes(word));
}

function buildReviewsPromptBlock(reviewFiles: ReviewFileInfo[]) {
  if (!reviewFiles.length) {
    return 'Neboli priložené žiadne posudky ani podklady.';
  }

  let usedChars = 0;

  return reviewFiles
    .map((file, index) => {
      const remainingChars = Math.max(MAX_TOTAL_ATTACHMENT_CHARS - usedChars, 0);
      const allowedChars = Math.min(MAX_TEXT_CHARS_PER_FILE, remainingChars || 2_000);
      const truncated = truncateText(file.text, allowedChars);

      usedChars += truncated.text.length;

      return `
PODKLAD ${index + 1}
Názov súboru: ${file.name}
Typ: ${file.type || 'nezadané'}
Veľkosť: ${formatFileSize(file.size)}
Druh podkladu: ${file.detectedKind || 'unknown'}
Technické skrátenie: ${file.compressed || truncated.truncated ? 'áno' : 'nie'}
Textová extrakcia dostupná: ${file.extractionAvailable ? 'áno' : 'nie'}

OBSAH PODKLADU:
${truncated.text || 'Bez dostupného textu.'}
`;
    })
    .join('\n\n-----------------------------\n\n');
}

function stringifyProfileValue(value: string | string[] | undefined) {
  if (!value) return 'nezadané';
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return value;
}

function buildProfilePromptBlock(profile: SavedProfile | null, defenseType: string) {
  return `
- Názov práce z profilu: ${profile?.title || 'nezadané'}
- Téma: ${profile?.topic || 'nezadané'}
- Typ práce: ${profile?.type || profile?.schema?.label || defenseType}
- Úroveň práce: ${profile?.level || 'nezadané'}
- Odbor: ${profile?.field || 'nezadané'}
- Vedúci práce: ${profile?.supervisor || 'voliteľný údaj, nepýtaj ho povinne'}
- Jazyk rozhrania: ${profile?.interfaceLanguage || profile?.language || 'slovenčina'}
- Jazyk práce: ${profile?.workLanguage || profile?.language || 'slovenčina'}
- Citačná norma: ${profile?.citation || 'nezadané'}
- Anotácia: ${profile?.annotation || 'nezadané'}
- Cieľ práce: ${profile?.goal || 'nezadané'}
- Výskumný problém: ${profile?.problem || profile?.researchProblem || 'nezadané'}
- Metodológia: ${profile?.methodology || 'nezadané'}
- Hypotézy: ${profile?.hypotheses || 'nezadané'}
- Výskumné otázky: ${profile?.researchQuestions || 'nezadané'}
- Praktická časť: ${profile?.practicalPart || 'nezadané'}
- Odborný alebo vedecký prínos: ${profile?.scientificContribution || profile?.contribution || 'nezadané'}
- Požiadavky na zdroje: ${profile?.sourcesRequirement || 'nezadané'}
- Kľúčové slová: ${getProfileKeywords(profile)}
- Štruktúra podľa profilu: ${stringifyProfileValue(profile?.schema?.structure)}
- Povinné časti podľa profilu: ${stringifyProfileValue(profile?.schema?.requiredSections)}
- Odporúčaný rozsah podľa profilu: ${profile?.schema?.recommendedLength || 'nezadané'}
`.trim();
}

function getFallbackWorkSection(
  workText: string,
  keywords: string[],
  maxChars = 280,
) {
  const paragraphs = cleanInvisibleCharacters(workText)
    .split(/\n{1,}/)
    .map((part) => cleanClientVisibleText(part))
    .filter((part) => part.length >= 24);

  if (!paragraphs.length) return '';

  const normalizedKeywords = keywords.map((keyword) =>
    keyword
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
  );

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index];
    const normalized = paragraph
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (!normalizedKeywords.some((keyword) => normalized.includes(keyword))) {
      continue;
    }

    const candidate =
      paragraph.length <= 140 && paragraphs[index + 1]
        ? `${paragraph}: ${paragraphs[index + 1]}`
        : paragraph;

    return cleanClientVisibleText(candidate).slice(0, maxChars).trim();
  }

  return '';
}

function getFallbackWorkOverview(workText: string, maxChars = 280) {
  const paragraph = cleanInvisibleCharacters(workText)
    .split(/\n{1,}/)
    .map((part) => cleanClientVisibleText(part))
    .find((part) => part.length >= 60);

  return (paragraph || '').slice(0, maxChars).trim();
}

function buildFallbackSlides({
  title,
  defenseType,
  profile,
  reviewFilesCount,
  hasWorkText,
  workText,
}: {
  title: string;
  defenseType: string;
  profile: SavedProfile | null;
  reviewFilesCount: number;
  hasWorkText: boolean;
  workText: string;
}): DefenseSlide[] {
  const overview = getFallbackWorkOverview(workText);
  const goal = getFallbackWorkSection(workText, ['cieľ', 'ciel', 'goal', 'objective']);
  const problem = getFallbackWorkSection(workText, ['výskumný problém', 'vyskumny problem', 'research problem', 'problem']);
  const questions = getFallbackWorkSection(workText, ['výskumné otázky', 'vyskumne otazky', 'research questions', 'hypotéz', 'hypotez', 'hypothes']);
  const theory = getFallbackWorkSection(workText, ['teoret', 'theor', 'literat']);
  const methodology = getFallbackWorkSection(workText, ['metodol', 'methodol', 'metód', 'metod']);
  const results = getFallbackWorkSection(workText, ['výsled', 'vysled', 'result', 'zisten', 'finding']);
  const discussion = getFallbackWorkSection(workText, ['diskusi', 'discussion', 'interpret']);
  const contribution = getFallbackWorkSection(workText, ['prínos', 'prinos', 'contribution', 'benefit']);
  const limitations = getFallbackWorkSection(workText, ['limit', 'obmedz', 'limitation']);
  const conclusion = getFallbackWorkSection(workText, ['záver', 'zaver', 'conclusion', 'summary']);

  const baseSlides: DefenseSlide[] = [
    {
      title: title || 'Obhajoba záverečnej práce',
      bullets: [
        profile?.type || defenseType || 'Typ práce je potrebné doplniť',
        profile?.field || 'Odbor je potrebné doplniť',
        profile?.topic || 'Predstavenie témy a zamerania práce',
      ].filter(Boolean),
      speakerNotes: 'Na úvod stručne predstavte názov práce, odbor, typ práce a dôvod výberu témy.',
      visualSuggestion: 'Titulný slide s názvom práce a jemným akademickým pozadím.',
      layout: 'title',
    },
    {
      title: 'Význam a aktuálnosť témy',
      bullets: [
        overview || 'Význam témy doplň podľa hlavného textu nahranej práce.',
        'Prepojenie témy s odborom a praxou',
        'Stručné pomenovanie riešeného problému',
      ],
      speakerNotes: 'Vysvetlite, prečo má zvolená téma význam a aký problém práca rieši.',
      visualSuggestion: 'Ikona problému alebo jednoduchá schéma kontextu témy.',
      layout: 'content',
    },
    {
      title: 'Cieľ práce',
      bullets: [
        goal || 'Hlavný cieľ sa nepodarilo bezpečne identifikovať v nahranej práci.',
        problem || 'Riešený problém sa nepodarilo bezpečne identifikovať v nahranej práci.',
        'Prepojenie cieľa s metodologickým postupom',
      ],
      speakerNotes: 'Pomenujte hlavný cieľ práce a vysvetlite, ako nadväzuje na riešený problém.',
      visualSuggestion: 'Jednoduchá karta s cieľom práce.',
      layout: 'content',
    },
    {
      title: 'Výskumné otázky alebo hypotézy',
      bullets: [
        questions || 'Výskumné otázky alebo hypotézy doplň podľa nahranej práce.',
        'Nevymýšľaj otázky ani hypotézy, ktoré v nahranej práci nie sú uvedené.',
        'Otázky alebo hypotézy majú byť priamo prepojené s cieľom práce',
      ],
      speakerNotes: 'Stručne ukážte, čo práca overovala alebo na čo hľadala odpoveď.',
      visualSuggestion: 'Dve samostatné karty: otázky a hypotézy.',
      layout: 'two-column',
    },
    {
      title: 'Teoretické východiská',
      bullets: [
        theory || 'Kľúčové teoretické východiská doplň podľa nahranej práce.',
        'Prepojenie teórie s cieľom práce',
        'Použité zdroje a odborné prístupy uviesť iba vecne',
      ],
      speakerNotes: 'Nevymenúvajte celú teóriu. Vyberte iba to, čo je dôležité pre obhajobu.',
      visualSuggestion: 'Schéma hlavných pojmov alebo vzťahov.',
      layout: 'content',
    },
    {
      title: 'Metodológia',
      bullets: [
        methodology || 'Metodologický postup doplň podľa nahranej práce.',
        'Charakteristika výskumného alebo analytického postupu',
        'Zdôvodnenie zvolených metód',
      ],
      speakerNotes: 'Vysvetlite, ako bola práca spracovaná a prečo boli zvolené dané metódy.',
      visualSuggestion: 'Procesná schéma krokov metodológie.',
      layout: 'content',
    },
    {
      title: 'Výsledky práce',
      bullets: [
        results || (hasWorkText ? 'Hlavné výsledky vyber z nahranej práce.' : 'Výsledky nie sú dostupné.'),
        'Vyzdvihnutie najdôležitejších zistení',
        'Prepojenie výsledkov s cieľom a otázkami práce',
      ],
      speakerNotes: 'Pri výsledkoch hovorte konkrétne a opierajte sa o vlastné zistenia práce.',
      visualSuggestion: 'Tabuľka alebo graf s najdôležitejšími výsledkami.',
      layout: 'table',
    },
    {
      title: 'Diskusia a interpretácia výsledkov',
      bullets: [
        discussion || 'Interpretáciu výsledkov doplň výhradne podľa nahranej práce.',
        'Porovnanie s cieľom práce a teoretickými východiskami',
        'Vecné zhodnotenie, čo výsledky znamenajú',
      ],
      speakerNotes: 'Neopakujte iba výsledky. Vysvetlite ich význam a dopad.',
      visualSuggestion: 'Dvojstĺpcové porovnanie: zistenie a interpretácia.',
      layout: 'two-column',
    },
    {
      title: 'Prínos práce',
      bullets: [
        contribution || 'Odborný alebo praktický prínos doplň podľa nahranej práce.',
        'Možnosti využitia výsledkov v praxi alebo ďalšom výskume',
        'Zvýraznenie vlastného prínosu autora práce',
      ],
      speakerNotes: 'Zdôraznite, čo práca prináša a pre koho sú výsledky užitočné.',
      visualSuggestion: 'Karta „Prínos pre prax“ a „Prínos pre odbor“.',
      layout: 'two-column',
    },
    {
      title: 'Limity práce',
      bullets: [
        limitations || 'Limity práce doplň podľa nahranej práce; nevymýšľaj ich.',
        'Vysvetlenie, ako limity ovplyvňujú interpretáciu výsledkov',
        'Návrhy na ďalšie skúmanie alebo dopracovanie',
      ],
      speakerNotes: 'Limity pomenujte pokojne. Ukazuje to odbornú zrelosť, nie slabosť práce.',
      visualSuggestion: 'Tri krátke body v samostatných kartách.',
      layout: 'content',
    },
    {
      title: 'Otázky komisie a odpovede',
      bullets:
        reviewFilesCount > 0
          ? [
              'Pripomienky zapracovať do vecných ústnych odpovedí',
              'Odpovede formulovať stručne a odborne',
              'Pri nejasnosti sa oprieť o cieľ, metodológiu a výsledky práce',
            ]
          : [
              'Ak budú položené otázky, odpovedať priamo a konkrétne',
              'Oprieť sa o metodológiu, výsledky a vlastný prínos',
              'Vyhnúť sa všeobecným alebo obranným formuláciám',
            ],
      speakerNotes: 'Pripravte si pokojné odpovede. Najskôr odpovedzte priamo, potom pridajte zdôvodnenie.',
      visualSuggestion: 'Slide s ikonou otázky a krátkymi odpoveďami.',
      layout: 'content',
    },
    {
      title: 'Záver obhajoby',
      bullets: [
        conclusion || goal || 'Záver zhrň podľa nahranej práce.',
        results || contribution || 'Hlavné výsledky a prínos zhrň podľa nahranej práce.',
        'Poďakovanie komisii za pozornosť',
      ],
      speakerNotes: 'Ukončite obhajobu stručne, vecne a sebavedomo.',
      visualSuggestion: 'Záverečný čistý slide s poďakovaním.',
      layout: 'closing',
    },
  ];

  return baseSlides
    .map((slide) => normalizeSlide(slide))
    .filter((slide): slide is DefenseSlide => Boolean(slide));
}

function buildPlainTextOutput(slides: DefenseSlide[]) {
  return slides
    .map((slide, index) => {
      const bullets = slide.bullets.map((bullet) => `- ${bullet}`).join('\n');

      return [
        `${index + 1}. ${slide.title}`,
        bullets,
        slide.visualSuggestion ? `Vizuálne odporúčanie: ${slide.visualSuggestion}` : '',
        slide.speakerNotes ? `Poznámky k vystúpeniu: ${slide.speakerNotes}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

function cleanQuestionVisibleText(value: unknown) {
  return cleanInvisibleCharacters(String(value || ''))
    .replace(/\bOpenAI\b/gi, '')
    .replace(/\bZEDPERA\b/gi, '')
    .replace(/\bsystémová poznámka\b/gi, '')
    .replace(/\btechnická poznámka\b/gi, '')
    .replace(/\bprompt\b/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeStringList(value: unknown, maxItems = 6) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanQuestionVisibleText(item))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeQuestionAnswer(value: unknown): DefenseQuestionAnswer | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  const directAnswer = cleanQuestionVisibleText(raw.directAnswer);
  const oralAnswer = cleanQuestionVisibleText(raw.oralAnswer);

  if (!directAnswer && !oralAnswer) return null;

  const followUpQuestions = Array.isArray(raw.followUpQuestions)
    ? raw.followUpQuestions
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Record<string, unknown>;
          const question = cleanQuestionVisibleText(row.question);
          const answer = cleanQuestionVisibleText(row.answer);
          return question && answer ? { question, answer } : null;
        })
        .filter(
          (item): item is { question: string; answer: string } => Boolean(item),
        )
        .slice(0, 4)
    : [];

  return {
    directAnswer: directAnswer || oralAnswer,
    oralAnswer: oralAnswer || directAnswer,
    keyArguments: normalizeStringList(raw.keyArguments, 6),
    defenseStrategy: normalizeStringList(raw.defenseStrategy, 6),
    caveat: cleanQuestionVisibleText(raw.caveat) || undefined,
    followUpQuestions,
  };
}

function buildQuestionTextOutput(answer: DefenseQuestionAnswer) {
  const parts = [answer.directAnswer, '', answer.oralAnswer];

  if (answer.keyArguments.length > 0) {
    parts.push('', ...answer.keyArguments.map((item) => `• ${item}`));
  }

  if (answer.defenseStrategy.length > 0) {
    parts.push('', ...answer.defenseStrategy.map((item) => `• ${item}`));
  }

  if (answer.caveat) {
    parts.push('', answer.caveat);
  }

  if (answer.followUpQuestions.length > 0) {
    parts.push(
      '',
      ...answer.followUpQuestions.flatMap((item) => [
        `Q: ${item.question}`,
        `A: ${item.answer}`,
      ]),
    );
  }

  return parts.filter((part, index, array) => {
    if (part !== '') return true;
    return index > 0 && array[index - 1] !== '';
  }).join('\n');
}

function buildQuestionSystemPrompt() {
  return `
Si akademický tréner obhajoby záverečnej práce. Používateľ zadáva otázku, ktorú dostal alebo môže dostať od komisie.

Tvoj cieľ je pripraviť odpoveď, ktorú študent vie reálne povedať pri obhajobe, a zároveň mu vysvetliť logiku odpovede.

Pravidlá:
- Najprv odpovedz priamo na otázku.
- Potom priprav prirodzenú ústnu odpoveď približne na 45 až 90 sekúnd.
- Uveď 3 až 6 kľúčových odborných argumentov.
- Uveď konkrétnu stratégiu, ako odpoveď obhájiť pred komisiou.
- Nahratý text práce je hlavný zdroj odborného obsahu, výsledkov, metodológie a formulácií obhajoby.
- Aktívny profil je povinný doplnkový kontext identity práce, jazyka, typu práce a údajov o projekte.
- Nahratý text práce používaj iba vtedy, keď patrí k aktívnemu profilu; tematický súlad overuje server ešte pred týmto generovaním.
- Ak sa profil a nahraná práca rozchádzajú v konkrétnom odbornom obsahu, nevymýšľaj kompromis. Pri prezentácii je obsah nahranej práce rozhodujúci; profil slúži na identitu a kontext.
- Posudky, tabuľky a vizuály sú doplnkové podklady; nesmú prebiť hlavný text nahratej práce.
- Ak je otázka všeobecná, použi spoľahlivé odborné znalosti a nevymýšľaj konkrétne výsledky práce.
- Ak odpoveď závisí od konkrétnych údajov práce a tieto údaje nie sú dostupné, jasne povedz, čo má študent doplniť, namiesto vymýšľania čísiel.
- Odpoveď má byť vecná, sebavedomá, zrozumiteľná a bez zbytočného akademického balastu.
- Nevysvetľuj interné fungovanie systému, nepoužívaj technické poznámky a nespomínaj názov AI systému.
- Vráť iba platný JSON bez markdownu.

Presný formát:
{
  "directAnswer": "Priama odborná odpoveď na otázku komisie.",
  "oralAnswer": "Hotová ústna formulácia, ktorú môže študent povedať pred komisiou.",
  "keyArguments": ["argument 1", "argument 2", "argument 3"],
  "defenseStrategy": ["ako začať", "ako zdôvodniť", "ako uzavrieť"],
  "caveat": "Voliteľné upozornenie na hranice odpovede alebo údaj, ktorý treba doplniť.",
  "followUpQuestions": [
    { "question": "Možná doplňujúca otázka", "answer": "Krátka odporúčaná odpoveď" }
  ]
}
`.trim();
}

function buildQuestionUserPrompt({
  question,
  workText,
  defenseType,
  profile,
  reviewsBlock,
  conversation,
}: {
  question: string;
  workText: string;
  defenseType: string;
  profile: SavedProfile | null;
  reviewsBlock: string;
  conversation: string;
}) {
  return `
JAZYK ODPOVEDE:
${profile?.workLanguage || profile?.language || 'slovenčina'}

OTÁZKA KOMISIE – ODPOVEDZ NA ŇU PRIAMO:
${question}

AKTÍVNY PROFIL PRÁCE – DOPLNKOVÝ KONTEXT A IDENTITA:
${buildProfilePromptBlock(profile, defenseType)}

NAHRATÁ PRÁCA – HLAVNÝ OBSAHOVÝ ZDROJ:
${workText || 'Text práce nie je dostupný. Pri otázke závislej od konkrétnych výsledkov nevymýšľaj údaje a používaj profil iba ako kontext.'}

DOPLNKOVÉ PODKLADY / POSUDKY:
${reviewsBlock}

PREDCHÁDZAJÚCI ROZHOVOR:
${conversation || 'Bez predchádzajúceho rozhovoru.'}

Priprav odpoveď tak, aby študent vedel:
1. čo je správna odpoveď,
2. ako ju povedať komisii,
3. čím ju odborne zdôvodniť,
4. na čo si dať pozor,
5. ako reagovať na pravdepodobné doplňujúce otázky.
`.trim();
}

function buildSystemPrompt() {
  return `
Si odborný akademický asistent pre prípravu obhajoby záverečnej práce.

Tvojou úlohou je vytvoriť čistý výstup pre klienta:
- prezentáciu na obhajobu,
- stručné body do slidov,
- poznámky pre ústne vystúpenie,
- návrhy vizuálneho rozloženia slidov,
- reakcie na otázky a pripomienky komisie.

PRÍSNA HIERARCHIA KONTEXTU:
1. Nahratá práca je hlavný a rozhodujúci zdroj odborného obsahu prezentácie: cieľa, metodológie, výsledkov, diskusie, prínosu, limitov a záverov.
2. Aktívny profil práce je povinný kontext identity, jazyka, typu práce, odboru a údajov o projekte. Nesmie nahradiť obsah nahranej práce.
3. Explicitný pokyn používateľa musí súvisieť s touto obhajobou a je povinné ho vykonať.
4. Server pred generovaním overí, že nahratá práca patrí k aktívnemu profilu.
5. Ak sa niektorý konkrétny odborný údaj v overenom texte a profile líši, pri obsahu prezentácie sa drž nahranej práce; profil používaj na identitu a kontext. Nevytváraj hybrid dvoch rôznych prác.
6. Posudky, otázky komisie, tabuľky a vizuály sú doplnkové podklady k tej istej práci.
7. Prezentáciu negeneruj iba z profilu. Ak hlavný text nahranej práce chýba, server má požiadavku odmietnuť.

Ak používateľ žiada zakomponovať otázku alebo pripomienku z posudku:
- zapracuj ju do slidu s otázkami komisie alebo vytvor samostatný slide,
- priprav stručnú odbornú odpoveď do speakerNotes,
- odpoveď ukotvi v aktívnom profile a v texte práce, ktorý bol voči tomuto profilu overený,
- nevygeneruj iba všeobecnú prezentáciu bez vykonania požadovanej úpravy.

Ak je dostupný text práce z nahraného Word/PDF/TXT/RTF/CSV/XLSX súboru alebo clientExtractedText, používaj ho iba po úspešnom overení, že súvisí s aktívnym profilom práce.
Krátku vetu používateľa typu „priprav prezentáciu podľa priloženej práce“ považuj iba za pokyn, nie za obsah práce.
Nikdy nevytvor iba 2 slidy, ak je dostupný text práce alebo dlhší extrahovaný obsah.

Meno školiteľa alebo vedúceho práce je voliteľný údaj. Nepýtaj ho ako povinný údaj a nevytváraj kvôli nemu chybové hlásenie.

Zakázané výrazy vo výstupe:
- primárny zdroj,
- sekundárny zdroj,
- interný zdroj,
- analyzovaný zdroj,
- podľa nahratého súboru,
- podľa prílohy,
- používateľ nahral súbor,
- dokument obsahuje,
- AI vedúci,
- systémová poznámka,
- technická poznámka,
- prompt,
- model,
- OpenAI,
- ZEDPERA.

Výstup musí byť čistý, profesionálny a vhodný na export do Wordu, PPTX a PDF.
Nepíš interné komentáre.
Nepíš technické vysvetlenia.
Nepíš, z ktorého zdroja si čerpal.
Obsah z dokumentov zapracuj prirodzene do textu.
Excel sa pri obhajobe nepoužíva.

Vráť iba platný JSON.
`.trim();
}

function buildUserPrompt({
  title,
  instruction,
  workText,
  defenseType,
  profile,
  reviewsBlock,
  hasWorkText,
}: {
  title: string;
  instruction: string;
  workText: string;
  defenseType: string;
  profile: SavedProfile | null;
  reviewsBlock: string;
  hasWorkText: boolean;
}) {
  const targetSlides = hasWorkText ? TARGET_SLIDES_WITH_WORK_TEXT : 10;

  return `
Vytvor profesionálnu prezentáciu na obhajobu záverečnej práce.

JAZYK VÝSTUPU:
${profile?.workLanguage || profile?.language || 'slovenčina'}

NÁZOV / IDENTITA PRÁCE – ZÁVÄZNÝ ÚDAJ Z AKTÍVNEHO PROFILU:
${title}

TYP OBHAJOBY:
${defenseType}

AKTÍVNY PROFIL PRÁCE – DOPLNKOVÝ KONTEXT A IDENTITA:
${buildProfilePromptBlock(profile, defenseType)}

POKYN POUŽÍVATEĽA – POVINNÉ VYKONAŤ:
${instruction || 'Priprav obhajobu podľa nahranej práce a aktívny profil použi ako doplnkový kontext.'}

NAHRATÁ PRÁCA – HLAVNÝ A ROZHODUJÚCI OBSAHOVÝ ZDROJ:
${workText || 'Text nahranej práce nie je dostupný. Prezentáciu z profilu samotného nevytváraj.'}

DOPLNKOVÉ PODKLADY – POSUDKY, OTÁZKY, TABUĽKY A VIZUÁLY:
${reviewsBlock}

HLAVNÁ ÚLOHA:
Vytvor prezentáciu na obhajobu použiteľnú pred komisiou. Odborný obsah vytvor z nahranej práce. Aktívny profil použi súbežne ako kontext identity, jazyka, typu práce a doplňujúcich údajov.

KONTROLA PRED ODOVZDANÍM:
- odborný obsah prezentácie musí vychádzať z nahranej práce,
- názov, téma a identita musia byť kompatibilné s aktívnym profilom,
- nahratú prácu použi na cieľ, metodológiu, výsledky, diskusiu, prínos a limity,
- pri rozpore, ktorý by naznačoval inú prácu, nič nekombinuj ani nevymýšľaj; server má taký vstup odmietnuť ešte pred generovaním,
- explicitný pokyn používateľa musí byť viditeľne zapracovaný vo výsledku,
- posudky, tabuľky a vizuály používaj ako doplnkové podklady a nesmie nimi byť prepísaná identita hlavnej práce.

POŽIADAVKY NA POČET A ŠTRUKTÚRU:
- vytvor približne ${targetSlides} slidov,
- minimálne ${hasWorkText ? MIN_SLIDES_WITH_WORK_TEXT : 8} slidov,
- maximálne ${MAX_SLIDES} slidov,
- nikdy nevytvor iba 2 slidy, ak je dostupný hlavný text práce,
- každý slide musí mať jasný názov,
- každý slide musí mať 3 až 5 stručných bodov,
- ku každému slidu doplň speakerNotes,
- ku každému slidu doplň visualSuggestion,
- prezentácia má byť akademická, vecná a obhájiteľná,
- nepíš všeobecné frázy bez obsahu,
- zachovaj logiku obhajoby: úvod, význam témy, cieľ, problém, otázky alebo hypotézy, teória, metodológia, výsledky, diskusia, prínos, limity, otázky komisie a záver.

POVINNÉ TYPY SLIDOV:
1. Názov práce
2. Význam a aktuálnosť témy
3. Cieľ práce
4. Výskumný problém, otázky alebo hypotézy
5. Teoretické východiská
6. Metodológia
7. Charakteristika dát, vzorky alebo postupu
8. Hlavné výsledky 1
9. Hlavné výsledky 2
10. Diskusia výsledkov
11. Prínos práce
12. Limity práce
13. Odporúčania alebo otázky komisie
14. Záver

Ak text práce obsahuje tabuľky, percentá, premenné, číselné výsledky alebo porovnania, vytvor samostatný slide s layout hodnotou "table".
Ak sú priložené obrázky, navrhni ich vloženie cez visualSuggestion a layout "image".
Ak niektorý údaj v práci chýba, napíš vecne, že údaj je potrebné doplniť.

DÔLEŽITÉ:
Vo výstupe nesmie byť uvedené "primárny zdroj" ani "sekundárny zdroj".
Vo výstupe nesmie byť uvedené, že text pochádza z prílohy alebo nahratého dokumentu.
Výstup má byť čistý, ako keby bol priamo pripravený pre klienta.

VRÁŤ IBA JSON BEZ MARKDOWNU.

Presný formát:
{
  "slides": [
    {
      "title": "Názov slidu",
      "bullets": ["bod 1", "bod 2", "bod 3"],
      "speakerNotes": "Krátke poznámky k tomu, čo má študent povedať.",
      "visualSuggestion": "Návrh vizuálneho prvku, tabuľky, grafu alebo obrázka.",
      "layout": "content"
    }
  ]
}
`.trim();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Nepodarilo sa vygenerovať prezentáciu na obhajobu.';
}


function isOpenAiRateLimitError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('429') ||
    message.includes('rate_limit') ||
    message.includes('rate limit') ||
    message.includes('tokens per min') ||
    message.includes('tpm')
  );
}

function buildFallbackDefenseResponse({
  finalTitle,
  defenseType,
  profile,
  reviewFiles,
  hasWorkText,
  workText,
  warning,
  model = MODEL,
  shortInstructionDetected = false,
}: {
  finalTitle: string;
  defenseType: string;
  profile: SavedProfile | null;
  reviewFiles: ReviewFileInfo[];
  hasWorkText: boolean;
  workText: string;
  warning: string;
  model?: string;
  shortInstructionDetected?: boolean;
}): DefenseResponse {
  const slides = buildFallbackSlides({
    title: finalTitle,
    defenseType,
    profile,
    reviewFilesCount: reviewFiles.length,
    hasWorkText,
    workText,
  });

  const textOutput = buildPlainTextOutput(slides);
  const extractedFilesCount = reviewFiles.filter((file) => file.extractionAvailable).length;
  const imageFilesCount = reviewFiles.filter((file) => file.detectedKind === 'image').length;

  return {
    ok: true,
    slides,
    textOutput,
    output: textOutput,
    result: textOutput,
    message: textOutput,
    text: textOutput,
    reviewsCount: reviewFiles.length,
    reviews: reviewFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      compressed: file.compressed,
      extractionAvailable: file.extractionAvailable,
      warning: file.warning,
      detectedKind: file.detectedKind,
    })),
    allowedExports: ['docx', 'pdf', 'pptx'],
    disallowedExports: ['xlsx'],
    pptxEndpoint: '/api/defense/pptx',
    warning,
    meta: {
      model,
      finalTitle,
      workTextChars: workText.length,
      extractedFilesCount,
      imageFilesCount,
      generatedSlidesCount: slides.length,
      fallbackUsed: true,
      shortInstructionDetected,
    },
  };
}

function buildCombinedWorkText({
  summary,
  clientExtractedText,
  reviewFiles,
}: {
  summary: string;
  clientExtractedText: string;
  reviewFiles: ReviewFileInfo[];
}) {
  const extractedTexts = reviewFiles
    .filter((file) => file.extractionAvailable && file.text.trim().length > 0)
    .map((file) => `=== ${file.name} ===\n${file.text}`)
    .join('\n\n');

  const combined = [summary, clientExtractedText, extractedTexts]
    .map((item) => cleanInvisibleCharacters(item))
    .filter(Boolean)
    .join('\n\n');

  return truncateText(combined, MAX_WORK_TEXT_CHARS).text;
}

function getAttachmentTitleHint(files: ReviewFileInfo[]) {
  const firstWorkFile = files.find(
    (file) =>
      file.extractionAvailable &&
      file.text.trim() &&
      file.detectedKind !== 'review' &&
      file.detectedKind !== 'image' &&
      file.detectedKind !== 'table',
  );

  if (!firstWorkFile) return '';

  const labeledTitle = firstWorkFile.text.match(
    /(?:názov\s+práce|nazov\s+prace|title)\s*[:\-]\s*([^\n]{12,220})/i,
  );

  if (labeledTitle?.[1]) {
    const cleaned = cleanClientVisibleText(labeledTitle[1]);
    if (cleaned) return cleaned;
  }

  const fileNameTitle = cleanClientVisibleText(
    firstWorkFile.name
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );

  return fileNameTitle;
}


type ProfileRelationResult = {
  related: boolean;
  confidence: number;
  reason: string;
  source: 'profile-only' | 'heuristic' | 'ai';
};

function hasUsableDefenseProfile(
  profile: SavedProfile | null,
): profile is SavedProfile {
  if (!profile) return false;

  return Boolean(
    cleanClientVisibleText(profile.title || '') ||
      cleanClientVisibleText(profile.topic || ''),
  );
}

function normalizeRelationText(value: string) {
  return cleanInvisibleCharacters(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const RELATION_STOP_WORDS = new Set([
  'praca', 'prace', 'bakalarska', 'diplomova', 'magisterska', 'zaverecna',
  'tema', 'nazov', 'ciel', 'vyskum', 'vyskumna', 'vysledky', 'metodologia',
  'analyza', 'teoria', 'teoreticka', 'prakticka', 'student', 'studenta',
  'obhajoba', 'prezentacia', 'odbor', 'problem', 'otazka', 'otazky', 'hypoteza',
  'hypotezy', 'system', 'model', 'profil', 'podla', 'ktory', 'ktora', 'ktore',
  'tento', 'tato', 'toto', 'preto', 'alebo', 'medzi', 'vyuzitie', 'pouzitie',
]);

function meaningfulRelationTokens(value: string) {
  return normalizeRelationText(value)
    .split(' ')
    .filter((token) => token.length >= 4 && !RELATION_STOP_WORDS.has(token));
}

function buildProfileRelationText(profile: SavedProfile) {
  return [
    profile.title,
    profile.topic,
    profile.field,
    profile.annotation,
    profile.goal,
    profile.problem,
    profile.researchProblem,
    profile.methodology,
    profile.researchQuestions,
    profile.hypotheses,
    profile.practicalPart,
    profile.scientificContribution,
    profile.contribution,
    ...(profile.keywords || []),
    ...(profile.keywordsList || []),
  ]
    .filter(Boolean)
    .join('\n');
}

function getLexicalProfileRelation(
  profile: SavedProfile,
  candidateText: string,
): ProfileRelationResult | null {
  const profileText = buildProfileRelationText(profile);
  const profileTokens = Array.from(new Set(meaningfulRelationTokens(profileText)));
  const candidateTokens = new Set(meaningfulRelationTokens(candidateText));

  const normalizedCandidate = normalizeRelationText(candidateText);
  const normalizedTitle = normalizeRelationText(profile.title || '');
  const normalizedTopic = normalizeRelationText(profile.topic || '');

  if (
    (normalizedTitle.length >= 12 && normalizedCandidate.includes(normalizedTitle)) ||
    (normalizedTopic.length >= 12 && normalizedCandidate.includes(normalizedTopic))
  ) {
    return {
      related: true,
      confidence: 0.99,
      reason: 'Text obsahuje názov alebo tému aktívneho profilu.',
      source: 'heuristic',
    };
  }

  if (profileTokens.length < 2 || candidateTokens.size < 2) return null;

  const shared = profileTokens.filter((token) => candidateTokens.has(token));
  const requiredShared = Math.max(2, Math.min(5, Math.ceil(profileTokens.length * 0.12)));

  if (shared.length >= requiredShared) {
    return {
      related: true,
      confidence: Math.min(0.96, 0.78 + shared.length * 0.03),
      reason: `Text zdieľa s profilom ${shared.length} významových pojmov.`,
      source: 'heuristic',
    };
  }

  if (candidateText.length >= 2_000 && profileTokens.length >= 4 && shared.length === 0) {
    return {
      related: false,
      confidence: 0.9,
      reason: 'V rozsiahlejšom texte sa nenašli významové pojmy aktívneho profilu.',
      source: 'heuristic',
    };
  }

  return null;
}

function isGenericDefenseInstruction(value: string, mode: 'presentation' | 'question') {
  const text = normalizeRelationText(value);
  if (!text) return true;

  if (mode === 'presentation') {
    const stripped = text
      .replace(/\b(priprav|vytvor|sprav|urob)\b/g, ' ')
      .replace(/\b(obhajobu|prezentaciu|slidy|slide|snímky|snimky)\b/g, ' ')
      .replace(/\b(podla|z|k|na|pre)\b/g, ' ')
      .replace(/\b(prilozenej|nahratej|aktualnej|tejto)\b/g, ' ')
      .replace(/\b(prace|praci|profilu|profil)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!stripped) return true;
  }

  if (mode === 'question' && text.length <= 240) {
    const defenseTerms = [
      'metod', 'vysled', 'ciel', 'hypotez', 'vzorka', 'respondent', 'limit',
      'prinos', 'vybral', 'zvolil', 'overil', 'meral', 'interpret', 'komisi',
      'prace', 'praci', 'vyskumn',
    ];
    const conversationalDefenseTerms = [
      'vysvetli', 'rozved', 'podrobnejs', 'strucnejs', 'preformul', 'povedat',
      'odpoved', 'argument', 'dopln', 'zjednodus',
    ];

    if (
      defenseTerms.some((term) => text.includes(term)) ||
      conversationalDefenseTerms.some((term) => text.includes(term))
    ) {
      return true;
    }
  }

  return false;
}

async function classifyCandidateAgainstProfile({
  profile,
  candidateText,
  contextLabel,
}: {
  profile: SavedProfile;
  candidateText: string;
  contextLabel: string;
}): Promise<ProfileRelationResult> {
  const cleanCandidate = cleanInvisibleCharacters(candidateText);

  if (!cleanCandidate) {
    return {
      related: true,
      confidence: 1,
      reason: `${contextLabel}: bez samostatného obsahu na kontrolu.`,
      source: 'profile-only',
    };
  }

  const heuristic = getLexicalProfileRelation(profile, cleanCandidate);
  if (heuristic?.related && heuristic.confidence >= 0.9) {
    return {
      ...heuristic,
      reason: `${contextLabel}: ${heuristic.reason}`,
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    if (heuristic) {
      return {
        ...heuristic,
        reason: `${contextLabel}: ${heuristic.reason}`,
      };
    }

    return {
      related: false,
      confidence: 0.5,
      reason: `${contextLabel}: súvis s profilom sa bez dostupnej AI validácie nepodarilo spoľahlivo overiť.`,
      source: 'heuristic',
    };
  }

  try {
    const compactCandidate = truncateText(cleanCandidate, 22_000).text;
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0,
      max_tokens: 420,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Si validačný klasifikátor akademickej obhajoby. Aktívny profil je záväzná identita práce. Rozhodni, či kontrolovaný vstup patrí k tej istej práci alebo je priamou otázkou/pokynom k jej obhajobe. Parafráza, synonymá a iný jazyk sú prípustné. Všeobecné otázky o metodike, výsledkoch, limitoch alebo prínose obhajovanej práce považuj za súvisiace. Ak však vstup zjavne rieši inú prácu, inú odbornú tému alebo úplne inú požiadavku, musí byť related=false. Vráť iba JSON: {"related": boolean, "confidence": number od 0 do 1, "reason": "stručný dôvod"}.`,
        },
        {
          role: 'user',
          content: `AKTÍVNY PROFIL:\n${buildProfilePromptBlock(profile, profile.type || profile.schema?.label || 'záverečná práca')}\n\nTYP KONTROLY: ${contextLabel}\n\nKONTROLOVANÝ VSTUP:\n${compactCandidate}`,
        },
      ],
    });

    const raw = extractJsonObject(completion.choices[0]?.message?.content || '{}');
    const parsed = safeJsonParse<Record<string, unknown>>(raw, {});
    const related = parsed.related === true;
    const confidenceRaw = Number(parsed.confidence);
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(1, confidenceRaw))
      : 0.5;
    const reason = cleanClientVisibleText(String(parsed.reason || ''));

    if (typeof parsed.related === 'boolean') {
      return {
        related,
        confidence,
        reason: `${contextLabel}: ${
          reason ||
          (related
            ? 'vstup súvisí s aktívnym profilom.'
            : 'vstup nesúvisí s aktívnym profilom.')
        }`,
        source: 'ai',
      };
    }
  } catch (error) {
    console.warn('DEFENSE_PROFILE_RELATION_CHECK_WARNING:', getErrorMessage(error));
  }

  if (heuristic) {
    return {
      ...heuristic,
      reason: `${contextLabel}: ${heuristic.reason}`,
    };
  }

  return {
    related: false,
    confidence: 0.5,
    reason: `${contextLabel}: súvis s aktívnym profilom sa nepodarilo spoľahlivo overiť.`,
    source: 'heuristic',
  };
}

async function checkProfileRelation({
  profile,
  mode,
  instruction,
  workText,
  supplementalFiles,
}: {
  profile: SavedProfile;
  mode: 'presentation' | 'question';
  instruction: string;
  workText: string;
  supplementalFiles: ReviewFileInfo[];
}): Promise<ProfileRelationResult> {
  const supplementalText = supplementalFiles
    .filter((file) => file.extractionAvailable && file.text.trim())
    .map((file) => `${file.name}\n${truncateText(file.text, 4_000).text}`)
    .join('\n\n');

  const evidenceText = [workText, supplementalText]
    .filter(Boolean)
    .join('\n\n');

  if (evidenceText.trim()) {
    const evidenceRelation = await classifyCandidateAgainstProfile({
      profile,
      candidateText: evidenceText,
      contextLabel: 'Dokumenty a podklady',
    });

    if (!evidenceRelation.related) return evidenceRelation;
  }

  if (!isGenericDefenseInstruction(instruction, mode) && instruction.trim()) {
    const instructionRelation = await classifyCandidateAgainstProfile({
      profile,
      candidateText: instruction,
      contextLabel: mode === 'question' ? 'Otázka komisie' : 'Pokyn používateľa',
    });

    if (!instructionRelation.related) return instructionRelation;

    return instructionRelation;
  }

  return {
    related: true,
    confidence: 1,
    reason: evidenceText.trim()
      ? 'Dokumenty súvisia s aktívnym profilom a pokyn je všeobecný pre obhajobu.'
      : 'Aktívny profil je dostupný ako kontext; pre prezentáciu je zároveň povinná nahraná práca.',
    source: evidenceText.trim() ? 'ai' : 'profile-only',
  };
}

function isWorkAttachmentForProfile(
  file: ReviewFileInfo,
  _profile: SavedProfile | null,
) {
  if (!file.extractionAvailable || !file.text.trim()) return false;

  if (
    file.detectedKind === 'review' ||
    file.detectedKind === 'image' ||
    file.detectedKind === 'table'
  ) {
    return false;
  }

  return file.detectedKind === 'work' || file.detectedKind === 'unknown';
}

function isSupplementalAttachmentForProfile(
  file: ReviewFileInfo,
  _profile: SavedProfile | null,
) {
  if (file.detectedKind === 'image') return true;

  if (file.detectedKind === 'review' || file.detectedKind === 'table') {
    return Boolean(file.extractionAvailable && file.text.trim());
  }

  return false;
}

function sameCleanText(a: string, b: string) {
  const left = cleanInvisibleCharacters(a);
  const right = cleanInvisibleCharacters(b);
  return Boolean(left && right && left === right);
}

function appendWarning(current: string | undefined, next: string) {
  const cleanNext = cleanInvisibleCharacters(next);

  if (!cleanNext) return current;
  if (!current) return cleanNext;

  return `${current} ${cleanNext}`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const requestedModeRaw = cleanInvisibleCharacters(
      String(formData.get('mode') || formData.get('action') || 'presentation'),
    ).toLowerCase();

    const requestedMode: 'presentation' | 'question' =
      requestedModeRaw === 'question' ||
      requestedModeRaw === 'qa' ||
      requestedModeRaw === 'commission-question'
        ? 'question'
        : 'presentation';

    const conversationRaw = String(formData.get('conversation') || '[]');
    const conversationItems = safeJsonParse<Array<{ role?: string; content?: string }>>(
      conversationRaw,
      [],
    )
      .filter((item) => item && typeof item === 'object')
      .slice(-8)
      .map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: cleanQuestionVisibleText(item.content),
      }))
      .filter((item) => item.content);

    const conversation = conversationItems
      .map((item) => `${item.role === 'assistant' ? 'ASISTENT' : 'ŠTUDENT'}: ${item.content}`)
      .join('\n\n');

    const title = cleanClientVisibleText(String(formData.get('title') || ''));

    const explicitInstruction = cleanClientVisibleText(
      String(
        formData.get('userInstruction') ||
          formData.get('instruction') ||
          formData.get('question') ||
          '',
      ),
    );

    const summaryEntry = formData.get('summary');
    const textEntry = formData.get('text');
    const contentEntry = formData.get('content');
    const messageEntry = formData.get('message');

    /**
     * Prázdne summary/text je stále platná hodnota. Nepoužívame preto `||`,
     * pretože pri prázdnom chatovom poli by sa ako summary zobral interný
     * generovaný prompt z poľa message a server by ho omylom považoval za
     * text práce.
     */
    const rawSummary = String(
      summaryEntry !== null
        ? summaryEntry
        : textEntry !== null
          ? textEntry
          : contentEntry !== null
            ? contentEntry
            : messageEntry !== null
              ? messageEntry
              : '',
    );

    const summary = cleanClientVisibleText(rawSummary);
    const shortInstructionDetected = isShortInstructionOnly(summary);

    /**
     * Frontend posiela text chatového poľa cez userInstruction/instruction.
     * Tento explicitný pokyn má prioritu a nesmie sa zahodiť len preto, že
     * neobsahuje slová typu "priprav" alebo "vytvor".
     */
    const instruction =
      explicitInstruction ||
      (shortInstructionDetected ? summary : '');

    /**
     * Ak je summary totožné s explicitným pokynom, nejde o text práce.
     * Taký text sa nesmie primiešať do workText a následne prebiť profil.
     */
    const summaryForWork =
      instruction && sameCleanText(summary, instruction)
        ? ''
        : shortInstructionDetected
          ? ''
          : summary;

    const defenseType = cleanClientVisibleText(
      String(formData.get('defenseType') || 'Bakalárska'),
    );

    const activeProfileRaw = String(
      formData.get('activeProfile') ||
        formData.get('profile') ||
        formData.get('savedProfile') ||
        'null',
    );

    const profile = safeJsonParse<SavedProfile | null>(activeProfileRaw, null);

    if (!hasUsableDefenseProfile(profile)) {
      return NextResponse.json<DefenseResponse>(
        {
          ok: false,
          code: 'DEFENSE_PROFILE_REQUIRED',
          mode: requestedMode,
          error:
            'Obhajoba musí byť prepojená s aktívnym profilom práce. Najprv vyberte alebo vytvorte profil s názvom alebo témou práce.',
          detail:
            'Bez aktívneho profilu sa obhajoba negeneruje, aby sa výstup nemohol priradiť k nesprávnej práci.',
        },
        { status: 400 },
      );
    }

    const uploadedReviewFiles = [
      ...formData.getAll('reviews'),
      ...formData.getAll('files'),
      ...formData.getAll('attachments'),
    ].filter((item): item is File => item instanceof File);

    const profileFallbackTitle =
      cleanClientVisibleText(profile?.title || '') ||
      title ||
      cleanClientVisibleText(profile?.topic || '') ||
      'Obhajoba záverečnej práce';

    const reviewFiles: ReviewFileInfo[] =
      await Promise.all(
        uploadedReviewFiles.map((file) =>
          extractTextFromUploadedFile(file),
        ),
      );

    const clientExtractedText = cleanClientVisibleText(
      String(
        formData.get('clientExtractedText') ||
          formData.get('attachmentText') ||
          formData.get('attachmentTexts') ||
          '',
      ),
    );

    const workFiles = reviewFiles.filter((file) =>
      isWorkAttachmentForProfile(file, profile),
    );

    const supplementalFiles = reviewFiles.filter((file) =>
      isSupplementalAttachmentForProfile(file, profile),
    );

    const usedFiles = new Set<ReviewFileInfo>([
      ...workFiles,
      ...supplementalFiles,
    ]);

    const ignoredFiles = reviewFiles.filter(
      (file) => !usedFiles.has(file),
    );

    /**
     * Starší klient môže poslať už extrahovaný text bez File objektu.
     * Aj tento text sa pred použitím overí voči aktívnemu profilu.
     */
    const clientTextAllowed =
      Boolean(clientExtractedText) && uploadedReviewFiles.length === 0;

    const acceptedClientExtractedText =
      clientTextAllowed ? clientExtractedText : '';

    const primaryCandidates = reviewFiles.filter(
      (file) =>
        file.detectedKind !== 'review' &&
        file.detectedKind !== 'image' &&
        file.detectedKind !== 'table',
    );

    const unreadablePrimaryFiles = primaryCandidates.filter(
      (file) => !file.extractionAvailable || !file.text.trim(),
    );

    /**
     * Kritické bezpečnostné pravidlo proti nesprávnej obhajobe:
     * ak používateľ nahral dokument práce, ale text sa nepodarilo extrahovať,
     * nesmieme potichu vygenerovať obsah iba z profilu.
     */
    if (
      requestedMode === 'presentation' &&
      primaryCandidates.length > 0 &&
      workFiles.length === 0 &&
      unreadablePrimaryFiles.length > 0
    ) {
      return NextResponse.json<DefenseResponse>(
        {
          ok: false,
          mode: 'presentation',
          error: `Prílohu sa nepodarilo textovo načítať: ${unreadablePrimaryFiles
            .map((file) => file.name)
            .join(', ')}. Obhajoba nebola vygenerovaná z profilu, aby nedošlo k zámene práce.`,
        },
        { status: 422 },
      );
    }

    const workText = buildCombinedWorkText({
      summary: workFiles.length > 0 ? '' : summaryForWork,
      clientExtractedText: acceptedClientExtractedText,
      reviewFiles: workFiles,
    });

    const hasWorkText = workText.trim().length > 0;
    const hasPrimaryAttachment =
      workFiles.length > 0 || Boolean(acceptedClientExtractedText);

    /**
     * Prezentácia Obhajoby sa nesmie vytvoriť iba z aktívneho profilu.
     * Profil je povinný kontext, ale hlavný odborný obsah musí pochádzať
     * z nahranej a textovo spracovateľnej práce.
     */
    if (requestedMode === 'presentation' && !hasPrimaryAttachment) {
      return NextResponse.json<DefenseResponse>(
        {
          ok: false,
          code: 'DEFENSE_ATTACHMENT_REQUIRED',
          mode: 'presentation',
          error:
            'Pre vytvorenie obhajoby nahrajte PDF, Word alebo inú podporovanú prílohu s textom práce. Aktívny profil sa použije spolu s prílohou ako doplnkový kontext, nie ako náhrada práce.',
          detail:
            'Obhajoba sa generuje z nahranej práce. Profil dopĺňa identitu, jazyk, typ práce a projektové údaje.',
        },
        { status: 400 },
      );
    }

    const relation = await checkProfileRelation({
      profile,
      mode: requestedMode,
      instruction,
      workText,
      supplementalFiles,
    });

    if (!relation.related) {
      const isUnverified = relation.confidence < 0.7;

      return NextResponse.json<DefenseResponse>(
        {
          ok: false,
          code: isUnverified
            ? 'DEFENSE_PROFILE_RELATION_UNVERIFIED'
            : 'DEFENSE_PROFILE_MISMATCH',
          mode: requestedMode,
          error: isUnverified
            ? 'Súvis zadania alebo príloh s aktívnym profilom sa nepodarilo spoľahlivo overiť. Obhajoba nebola vygenerovaná.'
            : 'Zadanie alebo nahratá práca nesúvisí s aktívnym profilom. Obhajoba nebola vygenerovaná.',
          detail: `${relation.reason} Aktívny profil: ${profile.title || profile.topic || 'bez názvu'}. Vyberte správny profil alebo použite podklady patriace k tomuto profilu.`,
        },
        { status: 422 },
      );
    }

    const attachmentTitleHint = getAttachmentTitleHint(workFiles);
    const finalTitle =
      cleanClientVisibleText(profile.title || '') ||
      cleanClientVisibleText(profile.topic || '') ||
      attachmentTitleHint ||
      profileFallbackTitle;

    const reviewsBlock = buildReviewsPromptBlock(supplementalFiles);

    if (!process.env.OPENAI_API_KEY) {
      if (requestedMode === 'question') {
        return NextResponse.json<DefenseResponse>(
          {
            ok: false,
            mode: 'question',
            error: 'AI odpoveď na otázku komisie momentálne nie je dostupná. Skontrolujte OPENAI_API_KEY.',
          },
          { status: 503 },
        );
      }

      const fallback = buildFallbackDefenseResponse({
        finalTitle,
        defenseType,
        profile,
        reviewFiles,
        hasWorkText,
        workText,
        warning:
          'Chýba OPENAI_API_KEY v .env.local. Bol použitý náhradný základ prezentácie bez volania AI.',
        model: 'fallback-no-openai-key',
        shortInstructionDetected,
      });

      return NextResponse.json<DefenseResponse>(fallback);
    }

    if (requestedMode === 'question') {
      if (!instruction.trim()) {
        return NextResponse.json<DefenseResponse>(
          {
            ok: false,
            mode: 'question',
            error: 'Napíšte otázku od komisie, na ktorú sa má pripraviť odpoveď.',
          },
          { status: 400 },
        );
      }

      let questionAnswer: DefenseQuestionAnswer | null = null;

      try {
        const completion = await openai.chat.completions.create({
          model: MODEL,
          temperature: 0.18,
          max_tokens: 2_400,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: buildQuestionSystemPrompt(),
            },
            {
              role: 'user',
              content: buildQuestionUserPrompt({
                question: instruction,
                workText,
                defenseType,
                profile,
                reviewsBlock,
                conversation,
              }),
            },
          ],
        });

        const raw = extractJsonObject(
          completion.choices[0]?.message?.content || '{}',
        );

        let parsed: unknown = {};

        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = {};
        }

        questionAnswer = normalizeQuestionAnswer(parsed);
      } catch (aiError) {
        console.error('DEFENSE_QUESTION_OPENAI_ERROR:', aiError);

        return NextResponse.json<DefenseResponse>(
          {
            ok: false,
            mode: 'question',
            error: isOpenAiRateLimitError(aiError)
              ? 'AI je dočasne vyťažená. Skúste otázku odoslať znova o chvíľu.'
              : `Odpoveď na otázku komisie sa nepodarilo pripraviť: ${getErrorMessage(aiError)}`,
          },
          { status: 502 },
        );
      }

      if (!questionAnswer) {
        return NextResponse.json<DefenseResponse>(
          {
            ok: false,
            mode: 'question',
            error: 'AI nevrátila použiteľnú odpoveď na otázku komisie. Skúste otázku formulovať presnejšie.',
          },
          { status: 502 },
        );
      }

      const textOutput = buildQuestionTextOutput(questionAnswer);
      const ignoredWarning =
        ignoredFiles.length > 0
          ? `Niektoré nesúvisiace alebo neoverené prílohy sa pri odpovedi nepoužili: ${ignoredFiles
              .map((file) => file.name)
              .join(', ')}.`
          : undefined;

      return NextResponse.json<DefenseResponse>({
        ok: true,
        mode: 'question',
        questionAnswer,
        answer: questionAnswer.directAnswer,
        textOutput,
        output: textOutput,
        result: textOutput,
        message: textOutput,
        text: textOutput,
        reviewsCount: reviewFiles.length,
        reviews: reviewFiles.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          compressed: file.compressed,
          extractionAvailable: file.extractionAvailable,
          warning: file.warning,
          detectedKind: file.detectedKind,
        })),
        allowedExports: ['docx', 'pdf', 'pptx'],
        disallowedExports: ['xlsx'],
        pptxEndpoint: '/api/defense/pptx',
        warning: ignoredWarning,
        meta: {
          model: MODEL,
          finalTitle,
          workTextChars: workText.length,
          extractedFilesCount: reviewFiles.filter((file) => file.extractionAvailable).length,
          imageFilesCount: reviewFiles.filter((file) => file.detectedKind === 'image').length,
          generatedSlidesCount: 0,
          fallbackUsed: false,
          shortInstructionDetected,
        },
      });
    }

    if (!hasWorkText) {
      return NextResponse.json<DefenseResponse>(
        {
          ok: false,
          code: 'DEFENSE_WORK_TEXT_REQUIRED',
          mode: 'presentation',
          error:
            'Z nahranej prílohy sa nepodarilo získať použiteľný text práce. Obhajoba sa nevygenerovala iba z profilu.',
          detail:
            'Nahrajte čitateľný PDF, Word, TXT alebo RTF dokument s obsahom práce. Aktívny profil zostáva doplnkovým kontextom.',
        },
        { status: 422 },
      );
    }

    let slides: DefenseSlide[] = [];
    let warning: string | undefined =
      ignoredFiles.length > 0
        ? `Niektoré prílohy nebolo možné zaradiť do hlavného ani doplnkového kontextu: ${ignoredFiles
            .map((file) => file.name)
            .join(', ')}.`
        : undefined;
    let fallbackUsed = false;

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.22,
        max_tokens: 6_500,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(),
          },
          {
            role: 'user',
            content: buildUserPrompt({
              title: finalTitle,
              instruction,
              workText,
              defenseType,
              profile,
              reviewsBlock,
              hasWorkText,
            }),
          },
        ],
      });

      const raw = extractJsonObject(completion.choices[0]?.message?.content || '{}');

      let parsed: unknown = {};

      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {};
      }

      slides = normalizeSlides(parsed);
    } catch (aiError) {
      console.error('DEFENSE_OPENAI_ERROR:', aiError);

      fallbackUsed = true;
      warning = appendWarning(
        warning,
        isOpenAiRateLimitError(aiError)
          ? 'OpenAI dočasne vrátil limit 429/rate limit. Bol použitý náhradný základ prezentácie bez ďalšieho volania AI.'
          : `AI generovanie prezentácie zlyhalo: ${getErrorMessage(aiError)} Bol použitý náhradný základ prezentácie.`,
      );
    }

    if (hasWorkText && slides.length < MIN_SLIDES_WITH_WORK_TEXT) {
      warning = appendWarning(
        warning,
        `AI vrátila iba ${slides.length} slidov, hoci bol dostupný text práce. Bol použitý rozšírený základ prezentácie.`,
      );
      slides = buildFallbackSlides({
        title: finalTitle,
        defenseType,
        profile,
        reviewFilesCount: supplementalFiles.length,
        hasWorkText,
        workText,
      });
      fallbackUsed = true;
    }

    if (!slides.length) {
      slides = buildFallbackSlides({
        title: finalTitle,
        defenseType,
        profile,
        reviewFilesCount: supplementalFiles.length,
        hasWorkText,
        workText,
      });

      warning = appendWarning(
        warning,
        'AI nevrátila platné slidy vo formáte JSON. Bol použitý náhradný základ prezentácie.',
      );
      fallbackUsed = true;
    }

    const textOutput = buildPlainTextOutput(slides);
    const extractedFilesCount = reviewFiles.filter((file) => file.extractionAvailable).length;
    const imageFilesCount = reviewFiles.filter((file) => file.detectedKind === 'image').length;

    return NextResponse.json<DefenseResponse>({
      ok: true,
      mode: 'presentation',
      slides,
      textOutput,
      output: textOutput,
      result: textOutput,
      message: textOutput,
      text: textOutput,
      reviewsCount: reviewFiles.length,
      reviews: reviewFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        compressed: file.compressed,
        extractionAvailable: file.extractionAvailable,
        warning: file.warning,
        detectedKind: file.detectedKind,
      })),
      allowedExports: ['docx', 'pdf', 'pptx'],
      disallowedExports: ['xlsx'],
      pptxEndpoint: '/api/defense/pptx',
      warning,
      meta: {
        model: MODEL,
        finalTitle: slides[0]?.title || finalTitle,
        workTextChars: workText.length,
        extractedFilesCount,
        imageFilesCount,
        generatedSlidesCount: slides.length,
        fallbackUsed,
        shortInstructionDetected,
      },
    });
  } catch (error) {
    console.error('DEFENSE_GENERATE_ERROR:', error);

    return NextResponse.json<DefenseResponse>(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
