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

type DefenseResponse = {
  ok: boolean;
  slides?: DefenseSlide[];
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

function buildFallbackSlides({
  title,
  defenseType,
  profile,
  reviewFilesCount,
  hasWorkText,
}: {
  title: string;
  defenseType: string;
  profile: SavedProfile | null;
  reviewFilesCount: number;
  hasWorkText: boolean;
}): DefenseSlide[] {
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
        profile?.annotation || 'Vysvetlenie, prečo je téma odborné alebo prakticky dôležitá',
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
        profile?.goal || 'Hlavný cieľ práce je potrebné doplniť',
        profile?.problem || profile?.researchProblem || 'Riešený problém je potrebné doplniť',
        'Prepojenie cieľa s metodologickým postupom',
      ],
      speakerNotes: 'Pomenujte hlavný cieľ práce a vysvetlite, ako nadväzuje na riešený problém.',
      visualSuggestion: 'Jednoduchá karta s cieľom práce.',
      layout: 'content',
    },
    {
      title: 'Výskumné otázky alebo hypotézy',
      bullets: [
        profile?.researchQuestions || 'Výskumné otázky je potrebné doplniť',
        profile?.hypotheses || 'Hypotézy je potrebné doplniť, ak boli súčasťou práce',
        'Otázky alebo hypotézy majú byť priamo prepojené s cieľom práce',
      ],
      speakerNotes: 'Stručne ukážte, čo práca overovala alebo na čo hľadala odpoveď.',
      visualSuggestion: 'Dve samostatné karty: otázky a hypotézy.',
      layout: 'two-column',
    },
    {
      title: 'Teoretické východiská',
      bullets: [
        'Stručné zhrnutie kľúčových pojmov a teoretických rámcov',
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
        profile?.methodology || 'Metodologický postup je potrebné doplniť',
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
        hasWorkText ? 'Zhrnutie hlavných výsledkov podľa spracovaného textu práce' : 'Výsledky je potrebné doplniť podľa finálneho textu práce',
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
        'Vysvetlenie významu hlavných zistení',
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
        profile?.scientificContribution || profile?.contribution || 'Odborný alebo praktický prínos je potrebné doplniť',
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
        'Vecné pomenovanie obmedzení práce',
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
        'Zhrnutie cieľa a spôsobu riešenia práce',
        'Zhrnutie hlavných výsledkov a prínosu',
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

function buildSystemPrompt() {
  return `
Si odborný akademický asistent pre prípravu obhajoby záverečnej práce.

Tvojou úlohou je vytvoriť čistý výstup pre klienta:
- prezentáciu na obhajobu,
- stručné body do slidov,
- poznámky pre ústne vystúpenie,
- návrhy vizuálneho rozloženia slidov,
- reakcie na otázky a pripomienky komisie.

Musíš vychádzať z:
- aktuálneho profilu práce,
- názvu práce,
- textu práce,
- priložených podkladov,
- cieľa, metodológie, hypotéz, výskumných otázok a prínosu práce.

Ak je dostupný text práce z nahraného Word/PDF/TXT/RTF/CSV/XLSX súboru alebo clientExtractedText, považuj ho za hlavný obsah práce.
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

NÁZOV PRÁCE:
${title}

TYP OBHAJOBY:
${defenseType}

AKTUÁLNY PROFIL PRÁCE:
${buildProfilePromptBlock(profile, defenseType)}

POKYN POUŽÍVATEĽA:
${instruction || 'Používateľ neposlal samostatný pokyn.'}

HLAVNÝ TEXT PRÁCE ALEBO EXTRAHOVANÝ OBSAH:
${workText || 'Text práce nie je dostupný. Vychádzaj z profilu práce a uveď, kde treba doplniť údaje.'}

PRILOŽENÉ PODKLADY:
${reviewsBlock}

HLAVNÁ ÚLOHA:
Vytvor prezentáciu na obhajobu, ktorá bude použiteľná pred komisiou.

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
  warning,
  model = MODEL,
  shortInstructionDetected = false,
}: {
  finalTitle: string;
  defenseType: string;
  profile: SavedProfile | null;
  reviewFiles: ReviewFileInfo[];
  hasWorkText: boolean;
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
      workTextChars: 0,
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const title = cleanClientVisibleText(String(formData.get('title') || ''));

    const rawSummary = String(
      formData.get('summary') ||
        formData.get('text') ||
        formData.get('content') ||
        formData.get('message') ||
        '',
    );

    const summary = cleanClientVisibleText(rawSummary);
    const shortInstructionDetected = isShortInstructionOnly(summary);
    const instruction = shortInstructionDetected ? summary : '';

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

    const uploadedReviewFiles = [
      ...formData.getAll('reviews'),
      ...formData.getAll('files'),
      ...formData.getAll('attachments'),
    ].filter((item): item is File => item instanceof File);

    const finalTitle =
      title ||
      cleanClientVisibleText(profile?.title || '') ||
      cleanClientVisibleText(profile?.topic || '') ||
      'Obhajoba záverečnej práce';

    if (!process.env.OPENAI_API_KEY) {
      const fallback = buildFallbackDefenseResponse({
        finalTitle,
        defenseType,
        profile,
        reviewFiles: [],
        hasWorkText: Boolean(
          summary ||
            formData.get('clientExtractedText') ||
            formData.get('attachmentText') ||
            formData.get('attachmentTexts'),
        ),
        warning:
          'Chýba OPENAI_API_KEY v .env.local. Bol použitý náhradný základ prezentácie bez volania AI.',
        model: 'fallback-no-openai-key',
        shortInstructionDetected,
      });

      return NextResponse.json<DefenseResponse>(fallback);
    }

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

    if (clientExtractedText) {
      const truncated = truncateText(clientExtractedText, MAX_TOTAL_ATTACHMENT_CHARS);

      reviewFiles.unshift({
        name: 'Extrahovaný text z klienta',
        size: Buffer.byteLength(clientExtractedText, 'utf-8'),
        type: 'text/plain',
        text: truncated.text,
        compressed: truncated.truncated,
        extractionAvailable: true,
        detectedKind: 'work',
        warning: truncated.truncated
          ? 'Extrahovaný text z klienta bol skrátený kvôli veľkosti.'
          : undefined,
      });
    }

    const workText = buildCombinedWorkText({
      summary: shortInstructionDetected ? '' : summary,
      clientExtractedText,
      reviewFiles,
    });

    const hasWorkText = workText.trim().length >= 600;

    if (!hasWorkText && !profile?.title && !profile?.topic) {
      return NextResponse.json<DefenseResponse>(
        {
          ok: false,
          error:
            'Chýba text práce alebo profil práce. Nahrajte Word/PDF/TXT súbor, pošlite clientExtractedText alebo vyberte aktívny profil práce.',
        },
        { status: 400 },
      );
    }

    const reviewsBlock = buildReviewsPromptBlock(reviewFiles);

    let slides: DefenseSlide[] = [];
    let warning: string | undefined;
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
      warning = isOpenAiRateLimitError(aiError)
        ? 'OpenAI dočasne vrátil limit 429/rate limit. Bol použitý náhradný základ prezentácie bez ďalšieho volania AI.'
        : `AI generovanie prezentácie zlyhalo: ${getErrorMessage(aiError)} Bol použitý náhradný základ prezentácie.`;
    }

    if (hasWorkText && slides.length < MIN_SLIDES_WITH_WORK_TEXT) {
      warning = `AI vrátila iba ${slides.length} slidov, hoci bol dostupný text práce. Bol použitý rozšírený základ prezentácie.`;
      slides = buildFallbackSlides({
        title: finalTitle,
        defenseType,
        profile,
        reviewFilesCount: reviewFiles.length,
        hasWorkText,
      });
      fallbackUsed = true;
    }

    if (!slides.length) {
      slides = buildFallbackSlides({
        title: finalTitle,
        defenseType,
        profile,
        reviewFilesCount: reviewFiles.length,
        hasWorkText,
      });

      warning =
        'AI nevrátila platné slidy vo formáte JSON. Bol použitý náhradný základ prezentácie.';
      fallbackUsed = true;
    }

    const textOutput = buildPlainTextOutput(slides);
    const extractedFilesCount = reviewFiles.filter((file) => file.extractionAvailable).length;
    const imageFilesCount = reviewFiles.filter((file) => file.detectedKind === 'image').length;

    return NextResponse.json<DefenseResponse>({
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
        model: MODEL,
        finalTitle,
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
