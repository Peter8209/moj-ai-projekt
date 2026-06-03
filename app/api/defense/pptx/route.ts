import { NextRequest, NextResponse } from 'next/server';
import pptxgen from 'pptxgenjs';

// PPTX export musí zostať iba na serveri/API route.
// Nepoužívajte pptxgenjs v client komponentoch.

const ShapeType = {
  rect: 'rect',
  roundRect: 'roundRect',
  ellipse: 'ellipse',
  line: 'line',
} as const;

type PptxGen = InstanceType<typeof pptxgen>;
type PptxSlide = ReturnType<PptxGen['addSlide']>;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

type DefenseTable = {
  title?: string;
  headers?: string[];
  rows?: Array<Array<string | number>>;
};

type DefenseChart = {
  title?: string;
  type?: 'bar' | 'column' | 'progress';
  labels?: string[];
  values?: number[];
  unit?: string;
};

type DefenseImage = {
  title?: string;
  data?: string;
  path?: string;
  alt?: string;
};

type DefenseSlide = {
  title: string;
  bullets: string[];
  speakerNotes?: string;
  layout?:
    | 'cover'
    | 'agenda'
    | 'section'
    | 'bullets'
    | 'split'
    | 'table'
    | 'chart'
    | 'quote'
    | 'image'
    | 'closing';
  visualSuggestion?: string;
  table?: DefenseTable;
  chart?: DefenseChart;
  images?: DefenseImage[];
};

type DefensePptxRequestBody = {
  title?: unknown;
  defenseType?: unknown;
  slides?: unknown;
  sourceText?: unknown;
  extractedWorkText?: unknown;
  attachmentText?: unknown;
  text?: unknown;
  workTitle?: unknown;
  theme?: unknown;

  // Batch režim: každá položka sa exportuje ako samostatný PPTX súbor.
  works?: unknown;
  selectedWorks?: unknown;
  projects?: unknown;
};

type NormalizedPptxInput = {
  title: string;
  defenseType: string;
  sourceText: string;
  slides: DefenseSlide[];
};

type GeneratedPptxFile = {
  fileName: string;
  title: string;
  buffer: Buffer;
  slidesCount: number;
};

type ThemeName = 'universal' | 'light' | 'academic' | 'dark';

type PptTheme = {
  name: ThemeName;
  bg: string;
  bg2: string;
  card: string;
  card2: string;
  text: string;
  title: string;
  muted: string;
  accent: string;
  accent2: string;
  border: string;
  soft: string;
  headerText: string;
};

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

const MAX_BULLETS_PER_SLIDE = 5;
const MAX_TABLE_ROWS = 8;
const MAX_TABLE_COLS = 6;
const MAX_CHART_ITEMS = 7;
const MAX_SOURCE_TEXT_CHARS = 220_000;
const MAX_EXPORTED_SLIDES = 28;

// Bezpečné limity pre text, aby sa nikdy nerozsypal mimo snímky.
const MAX_BULLET_CHARS = 155;
const MAX_BULLET_CHARS_COMPACT = 115;
const MAX_TOTAL_CHARS_PER_SLIDE = 620;
const MAX_TITLE_CHARS = 92;

// Všeobecná, svetlá a vysoko kontrastná šablóna.
// Všetky názvy tém smerujeme na čitateľné farby, aby písmo nikdy nebolo bledé.
const UNIVERSAL_THEME: PptTheme = {
  name: 'universal',
  bg: 'FFFFFF',
  bg2: 'F8FAFC',
  card: 'FFFFFF',
  card2: 'F1F5F9',
  text: '111827',
  title: '020617',
  muted: '334155',
  accent: '4F46E5',
  accent2: '0F766E',
  border: 'CBD5E1',
  soft: 'EEF2FF',
  headerText: 'FFFFFF',
};

const THEMES: Record<ThemeName, PptTheme> = {
  universal: UNIVERSAL_THEME,
  light: UNIVERSAL_THEME,
  academic: UNIVERSAL_THEME,
  dark: UNIVERSAL_THEME,
};

function cleanText(value: unknown): string {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanInlineText(value: unknown): string {
  return cleanText(value).replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max = MAX_SOURCE_TEXT_CHARS): string {
  const text = cleanText(value);

  if (text.length <= max) return text;

  const start = text.slice(0, Math.floor(max * 0.48));
  const middleStart = Math.max(0, Math.floor(text.length / 2) - Math.floor(max * 0.12));
  const middle = text.slice(middleStart, middleStart + Math.floor(max * 0.24));
  const end = text.slice(text.length - Math.floor(max * 0.28));

  return `${start}\n\n${middle}\n\n${end}`.trim();
}

function splitLongTextToChunks(text: string, maxChars = MAX_BULLET_CHARS): string[] {
  const clean = cleanInlineText(text);

  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((item) => cleanInlineText(item))
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences.length ? sentences : [clean]) {
    if (!current) {
      current = sentence;
      continue;
    }

    if (`${current} ${sentence}`.length <= maxChars) {
      current = `${current} ${sentence}`;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }

  if (current) chunks.push(current);

  return chunks
    .flatMap((chunk) => {
      if (chunk.length <= maxChars) return [chunk];

      const parts: string[] = [];

      for (let i = 0; i < chunk.length; i += maxChars) {
        parts.push(`${chunk.slice(i, i + maxChars).trim()}${i + maxChars < chunk.length ? '…' : ''}`);
      }

      return parts;
    })
    .filter(Boolean);
}

function normalizeBulletsForSlides(bullets: string[]): string[] {
  return bullets
    .flatMap((bullet) => splitLongTextToChunks(bullet, MAX_BULLET_CHARS))
    .map((bullet) => cleanInlineText(bullet).replace(/^[-•–—]\s*/, ''))
    .filter(Boolean);
}

function getTextLengthScore(bullets: string[]) {
  return bullets.reduce((sum, bullet) => sum + cleanInlineText(bullet).length, 0);
}

function paginateBullets(bullets: string[]): string[][] {
  const normalized = normalizeBulletsForSlides(bullets);
  const pages: string[][] = [];

  let current: string[] = [];
  let currentChars = 0;

  for (const bullet of normalized) {
    const bulletChars = bullet.length;
    const wouldExceedCount = current.length >= MAX_BULLETS_PER_SLIDE;
    const wouldExceedChars = currentChars + bulletChars > MAX_TOTAL_CHARS_PER_SLIDE;

    if (current.length > 0 && (wouldExceedCount || wouldExceedChars)) {
      pages.push(current);
      current = [];
      currentChars = 0;
    }

    current.push(bullet);
    currentChars += bulletChars;
  }

  if (current.length > 0) pages.push(current);

  return pages.length ? pages : [[]];
}

function safeSlideTitle(title: string, partIndex?: number, totalParts?: number) {
  const clean = cleanInlineText(title || 'Snímka');

  const base =
    clean.length > MAX_TITLE_CHARS
      ? `${clean.slice(0, MAX_TITLE_CHARS - 1).trim()}…`
      : clean;

  if (partIndex !== undefined && totalParts !== undefined && totalParts > 1) {
    return `${base} (${partIndex + 1}/${totalParts})`;
  }

  return base;
}

function expandTextSlides(slides: DefenseSlide[]): DefenseSlide[] {
  const expanded: DefenseSlide[] = [];

  for (const slide of slides) {
    if (
      slide.layout === 'table' ||
      slide.layout === 'chart' ||
      slide.layout === 'image' ||
      slide.table ||
      slide.chart ||
      slide.images?.length
    ) {
      expanded.push({
        ...slide,
        title: safeSlideTitle(slide.title),
        bullets: slide.bullets.slice(0, MAX_BULLETS_PER_SLIDE),
      });
      continue;
    }

    const pages = paginateBullets(slide.bullets);

    if (pages.length <= 1) {
      expanded.push({
        ...slide,
        title: safeSlideTitle(slide.title),
        bullets: pages[0] || slide.bullets.slice(0, MAX_BULLETS_PER_SLIDE),
      });
      continue;
    }

    pages.forEach((pageBullets, pageIndex) => {
      expanded.push({
        ...slide,
        title: safeSlideTitle(slide.title, pageIndex, pages.length),
        bullets: pageBullets,
        layout: pageIndex === 0 ? slide.layout : 'bullets',
        visualSuggestion: pageIndex === 0 ? slide.visualSuggestion : '',
        speakerNotes: pageIndex === 0 ? slide.speakerNotes : undefined,
      });
    });
  }

  return expanded.slice(0, MAX_EXPORTED_SLIDES);
}

function getDynamicBulletFontSize(bullets: string[]) {
  const totalChars = getTextLengthScore(bullets);
  const count = bullets.length;

  if (count <= 3 && totalChars <= 320) return 18;
  if (count <= 4 && totalChars <= 460) return 16;
  if (count <= 5 && totalChars <= 620) return 14.2;

  return 12.5;
}

function getDynamicCardHeight(bullets: string[]) {
  const count = Math.max(1, bullets.length);

  if (count <= 3) return 1.08;
  if (count === 4) return 0.86;

  return 0.72;
}

function safeFileName(value: string): string {
  const safe = cleanInlineText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return safe || 'prezentacia';
}

function asThemeName(value: unknown): ThemeName {
  const theme = String(value || '').toLowerCase().trim();

  if (theme === 'light') return 'light';
  if (theme === 'academic') return 'academic';
  if (theme === 'dark') return 'dark';

  return 'universal';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseNumber(value: unknown): number | null {
  const normalized = String(value || '')
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  if (!normalized || normalized === '-' || normalized === '.') return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTable(value: unknown): DefenseTable | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const raw = value as Record<string, unknown>;

  const headers = Array.isArray(raw.headers)
    ? raw.headers.map((item) => cleanInlineText(item)).filter(Boolean).slice(0, MAX_TABLE_COLS)
    : [];

  const rows = Array.isArray(raw.rows)
    ? raw.rows
        .filter((row): row is unknown[] => Array.isArray(row))
        .map((row) => row.map((cell) => cleanInlineText(cell)).slice(0, MAX_TABLE_COLS))
        .filter((row) => row.some(Boolean))
        .slice(0, MAX_TABLE_ROWS)
    : [];

  if (!headers.length && !rows.length) return undefined;

  return {
    title: cleanInlineText(raw.title),
    headers,
    rows,
  };
}

function normalizeChart(value: unknown): DefenseChart | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const raw = value as Record<string, unknown>;

  const labels = Array.isArray(raw.labels)
    ? raw.labels.map((item) => cleanInlineText(item)).filter(Boolean).slice(0, MAX_CHART_ITEMS)
    : [];

  const values = Array.isArray(raw.values)
    ? raw.values
        .map((item) => parseNumber(item))
        .filter((item): item is number => item !== null)
        .slice(0, labels.length || MAX_CHART_ITEMS)
    : [];

  if (!labels.length || !values.length) return undefined;

  const count = Math.min(labels.length, values.length, MAX_CHART_ITEMS);

  return {
    title: cleanInlineText(raw.title),
    type: raw.type === 'progress' || raw.type === 'column' || raw.type === 'bar' ? raw.type : 'bar',
    labels: labels.slice(0, count),
    values: values.slice(0, count),
    unit: cleanInlineText(raw.unit),
  };
}

function normalizeImages(value: unknown): DefenseImage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): DefenseImage | null => {
      if (!item || typeof item !== 'object') return null;

      const raw = item as Record<string, unknown>;
      const title = cleanInlineText(raw.title);
      const data = cleanInlineText(raw.data);
      const path = cleanInlineText(raw.path);
      const alt = cleanInlineText(raw.alt || title || 'Obrázok');

      if (!data && !path) return null;

      return { title, data, path, alt };
    })
    .filter((item): item is DefenseImage => item !== null)
    .slice(0, 3);
}

function normalizeLayout(value: unknown, index: number): DefenseSlide['layout'] {
  const layout = String(value || '').toLowerCase().trim();

  if (
    layout === 'section' ||
    layout === 'table' ||
    layout === 'chart' ||
    layout === 'quote' ||
    layout === 'split' ||
    layout === 'closing' ||
    layout === 'image' ||
    layout === 'bullets'
  ) {
    return layout;
  }

  if (index === 0) return 'section';
  if ((index + 1) % 5 === 0) return 'split';

  return 'bullets';
}

function normalizeSlide(value: unknown, index: number): DefenseSlide {
  const item = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const title = cleanInlineText(item.title || `Snímka ${index + 1}`);

  const rawBullets = Array.isArray(item.bullets)
    ? item.bullets.map((bullet: unknown) => cleanInlineText(bullet)).filter(Boolean)
    : [];

  const bullets = normalizeBulletsForSlides(rawBullets);

  const table = normalizeTable(item.table);
  const chart = normalizeChart(item.chart);
  const images = normalizeImages(item.images);

  let layout = normalizeLayout(item.layout, index);

  if (table) layout = 'table';
  if (chart) layout = 'chart';
  if (images.length > 0) layout = 'image';

  return {
    title: safeSlideTitle(title),
    bullets,
    speakerNotes: item.speakerNotes ? cleanText(item.speakerNotes) : undefined,
    layout,
    visualSuggestion: cleanInlineText(item.visualSuggestion),
    table,
    chart,
    images,
  };
}

function splitIntoSentences(text: string): string[] {
  return cleanText(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanInlineText(sentence))
    .filter((sentence) => sentence.length >= 35)
    .slice(0, 90);
}

function extractSection(text: string, patterns: RegExp[], maxSentences = 4): string[] {
  const sentences = splitIntoSentences(text);
  const selected: string[] = [];

  for (const sentence of sentences) {
    if (patterns.some((pattern) => pattern.test(sentence))) {
      selected.push(sentence);
    }

    if (selected.length >= maxSentences) break;
  }

  return selected;
}

function toBullets(sentences: string[], fallback: string[]): string[] {
  const bullets = sentences
    .map((sentence) => sentence.replace(/^[-•–—]\s*/, ''))
    .flatMap((sentence) => splitLongTextToChunks(sentence, MAX_BULLET_CHARS))
    .filter(Boolean)
    .slice(0, MAX_BULLETS_PER_SLIDE);

  return bullets.length ? bullets : fallback.slice(0, MAX_BULLETS_PER_SLIDE);
}

function generateSlidesFromSource(sourceText: string, title: string): DefenseSlide[] {
  const text = truncate(sourceText);

  if (!cleanText(text)) {
    return [
      {
        title: 'Cieľ a zameranie práce',
        layout: 'section',
        bullets: [
          'Predstaviť hlavný cieľ práce a dôvod výberu témy.',
          'Stručne vysvetliť riešený problém.',
          'Ukázať, ako je práca štruktúrovaná.',
        ],
        speakerNotes: 'Na úvod pokojne a vecne predstavte tému, cieľ a dôvod výberu práce.',
      },
      {
        title: 'Metodika práce',
        layout: 'bullets',
        bullets: [
          'Opísať použité metódy a postup spracovania.',
          'Vysvetliť výber dát, zdrojov alebo výskumnej vzorky.',
          'Uviesť spôsob vyhodnotenia výsledkov.',
        ],
      },
      {
        title: 'Hlavné výsledky',
        layout: 'bullets',
        bullets: [
          'Zhrnúť najdôležitejšie zistenia práce.',
          'Prepojiť výsledky s cieľom práce.',
          'Zdôrazniť prínos pre prax alebo odbor.',
        ],
      },
      {
        title: 'Záver a otázky',
        layout: 'closing',
        bullets: [
          'Zhrnúť cieľ, výsledky a prínos práce.',
          'Poďakovať komisii za pozornosť.',
          'Pripraviť sa na otázky komisie.',
        ],
      },
    ];
  }

  const objective = toBullets(
    extractSection(text, [/cieľ/i, /zameran/i, /predmetom práce/i, /účel/i], 4),
    [
      `Práca sa zameriava na tému: ${title}.`,
      'Hlavným cieľom je odborne spracovať riešený problém.',
      'Výstupom je syntéza teoretických poznatkov a praktických zistení.',
    ],
  );

  const theory = toBullets(
    extractSection(text, [/teoret/i, /východisk/i, /literat/i, /autor/i, /koncept/i], 4),
    [
      'Teoretická časť vytvára odborný rámec riešenej problematiky.',
      'V práci sú vysvetlené základné pojmy a súvislosti.',
      'Literárne zdroje slúžia ako podklad pre vlastné spracovanie témy.',
    ],
  );

  const methodology = toBullets(
    extractSection(text, [/metod/i, /výskum/i, /vzorka/i, /dotazník/i, /analýz/i, /postup/i], 5),
    [
      'Praktická časť vychádza z metodického postupu zvoleného podľa charakteru témy.',
      'Dáta alebo podklady boli spracované systematicky a vo vzťahu k cieľu práce.',
      'Metodika umožnila formulovať závery a odporúčania.',
    ],
  );

  const results = toBullets(
    extractSection(text, [/výsled/i, /zisten/i, /potvrd/i, /preukáz/i, /ukáz/i, /hodnot/i], 5),
    [
      'Výsledky ukazujú hlavné zistenia súvisiace s cieľom práce.',
      'Najdôležitejšie zistenia sú interpretované vo vzťahu k skúmanému problému.',
      'Výsledky vytvárajú podklad pre odporúčania a záver práce.',
    ],
  );

  const recommendations = toBullets(
    extractSection(text, [/odporúč/i, /navrh/i, /riešen/i, /prínos/i, /záver/i, /limit/i], 5),
    [
      'Na základe výsledkov je možné formulovať praktické odporúčania.',
      'Práca prináša odborný pohľad na riešenú problematiku.',
      'Závery možno využiť pri ďalšom výskume alebo praktickej aplikácii.',
    ],
  );

  return [
    {
      title: 'Cieľ a zameranie práce',
      layout: 'section',
      bullets: objective,
      speakerNotes: 'Predstavte tému, hlavný cieľ práce a stručne vysvetlite, čo bolo predmetom skúmania.',
    },
    {
      title: 'Teoretické východiská',
      layout: 'bullets',
      bullets: theory,
      visualSuggestion: 'Možno doplniť jednoduchú schému hlavných pojmov.',
    },
    {
      title: 'Metodika a postup spracovania',
      layout: 'split',
      bullets: methodology,
      visualSuggestion: 'Možno doplniť procesnú schému postupu.',
    },
    {
      title: 'Hlavné výsledky práce',
      layout: 'bullets',
      bullets: results,
      visualSuggestion: 'Možno doplniť graf alebo tabuľku s hlavnými výsledkami.',
    },
    {
      title: 'Prínos, odporúčania a záver',
      layout: 'quote',
      bullets: recommendations,
      speakerNotes: 'Zdôraznite, čo práca priniesla a ako možno výsledky využiť.',
    },
  ];
}

function extractMarkdownTables(text: string): DefenseTable[] {
  const lines = cleanText(text).split('\n');
  const tables: DefenseTable[] = [];
  let block: string[] = [];

  function flush() {
    if (block.length < 2) {
      block = [];
      return;
    }

    const rows = block
      .map((line) => line.split('|').map((cell) => cleanInlineText(cell)).filter(Boolean))
      .filter((row) => row.length >= 2);

    const filteredRows = rows.filter((row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell)));

    if (filteredRows.length >= 2) {
      const headers = filteredRows[0].slice(0, MAX_TABLE_COLS);
      const dataRows = filteredRows.slice(1, MAX_TABLE_ROWS + 1).map((row) => row.slice(0, MAX_TABLE_COLS));

      tables.push({ title: 'Tabuľkové výsledky', headers, rows: dataRows });
    }

    block = [];
  }

  for (const line of lines) {
    if (line.includes('|')) block.push(line);
    else flush();
  }

  flush();

  return tables.slice(0, 4);
}

function extractLooseTables(text: string): DefenseTable[] {
  const source = cleanText(text);
  const tables: DefenseTable[] = [];

  const candidateLines = source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (line.includes('|')) return false;

      const parts = line.split(/\t|;| {2,}/).map((part) => part.trim()).filter(Boolean);

      return parts.length >= 2 && parts.length <= MAX_TABLE_COLS;
    });

  if (candidateLines.length < 3) return [];

  let block: string[][] = [];

  function flushBlock() {
    if (block.length < 3) {
      block = [];
      return;
    }

    const headers = block[0].slice(0, MAX_TABLE_COLS);
    const rows = block.slice(1, MAX_TABLE_ROWS + 1).map((row) => row.slice(0, MAX_TABLE_COLS));

    tables.push({ title: 'Prehľad údajov z práce', headers, rows });
    block = [];
  }

  for (const line of candidateLines) {
    const parts = line.split(/\t|;| {2,}/).map((part) => cleanInlineText(part)).filter(Boolean);

    if (block.length === 0 || Math.abs(parts.length - block[0].length) <= 1) {
      block.push(parts);
    } else {
      flushBlock();
      block.push(parts);
    }
  }

  flushBlock();

  return tables.slice(0, 2);
}

function extractNumericChart(text: string): DefenseChart | undefined {
  const source = cleanText(text);
  const pairs: Array<{ label: string; value: number; hasPercent: boolean }> = [];

  const patterns = [
    /([A-Za-zÀ-ž0-9][A-Za-zÀ-ž0-9 .,/()_-]{2,48})\s*[:=–-]\s*(\d{1,4}(?:[,.]\d{1,2})?)\s*(%|percent|percentá|percento)?/giu,
    /([A-Za-zÀ-ž0-9][A-Za-zÀ-ž0-9 .,/()_-]{2,48})\s+(\d{1,4}(?:[,.]\d{1,2})?)\s*(%|percent|percentá|percento)/giu,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(source)) && pairs.length < MAX_CHART_ITEMS) {
      const label = cleanInlineText(match[1]).replace(/^[-•–—]\s*/, '').slice(0, 40);
      const value = parseNumber(match[2]);
      const hasPercent = Boolean(match[3]);

      if (!label || value === null) continue;
      if (value < 0 || value > 100000) continue;
      if (/^(strana|kapitola|tabuľka|obrázok|graf|rok)$/i.test(label)) continue;

      if (pairs.some((item) => item.label.toLowerCase() === label.toLowerCase())) continue;

      pairs.push({ label, value, hasPercent });
    }
  }

  if (pairs.length < 2) return undefined;

  const percentCount = pairs.filter((item) => item.hasPercent || item.value <= 100).length;

  return {
    title: 'Kľúčové číselné výsledky',
    type: percentCount >= Math.ceil(pairs.length / 2) ? 'bar' : 'column',
    labels: pairs.map((item) => item.label),
    values: pairs.map((item) => item.value),
    unit: percentCount >= Math.ceil(pairs.length / 2) ? '%' : '',
  };
}

function buildAgenda(slides: DefenseSlide[]): string[] {
  return slides.map((slide) => slide.title).filter(Boolean).slice(0, 10);
}

function addBackground(slide: PptxSlide, theme: PptTheme) {
  slide.background = { color: theme.bg };

  slide.addShape(ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: theme.bg },
    line: { color: theme.bg },
  });

  slide.addShape(ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: 0.32,
    fill: { color: theme.accent },
    line: { color: theme.accent },
  });

  slide.addShape(ShapeType.rect, {
    x: 0,
    y: 0.32,
    w: SLIDE_W,
    h: 0.04,
    fill: { color: theme.accent2 },
    line: { color: theme.accent2 },
  });

  slide.addShape(ShapeType.rect, {
    x: 0,
    y: 6.98,
    w: SLIDE_W,
    h: 0.02,
    fill: { color: theme.border },
    line: { color: theme.border },
  });
}

function addHeader(slide: PptxSlide, theme: PptTheme, eyebrow: string, title: string) {
  const cleanTitle = safeSlideTitle(title);

  slide.addText(eyebrow.toUpperCase(), {
    x: 0.65,
    y: 0.55,
    w: 5.8,
    h: 0.25,
    fontFace: 'Arial',
    fontSize: 8.5,
    bold: true,
    color: theme.accent,
    margin: 0,
  });

  slide.addText(cleanTitle, {
    x: 0.65,
    y: 0.86,
    w: 11.95,
    h: 0.86,
    fontFace: 'Arial',
    fontSize: cleanTitle.length > 74 ? 21 : cleanTitle.length > 54 ? 24 : 27,
    bold: true,
    color: theme.title,
    fit: 'shrink',
    margin: 0,
    breakLine: false,
    valign: 'middle',
  });
}

function addFooter(slide: PptxSlide, theme: PptTheme, slideNumber: number, workTitle?: string) {
  slide.addText(String(slideNumber).padStart(2, '0'), {
    x: 0.65,
    y: 7.08,
    w: 0.75,
    h: 0.18,
    fontFace: 'Arial',
    fontSize: 8,
    bold: true,
    color: theme.muted,
    margin: 0,
  });

  slide.addText(cleanInlineText(workTitle || 'Prezentácia k obhajobe'), {
    x: 1.35,
    y: 7.06,
    w: 9.6,
    h: 0.22,
    fontFace: 'Arial',
    fontSize: 8,
    color: theme.muted,
    fit: 'shrink',
    margin: 0,
  });

  slide.addText('ZEDPERA', {
    x: 11.45,
    y: 7.05,
    w: 1.25,
    h: 0.22,
    fontFace: 'Arial',
    fontSize: 8,
    bold: true,
    color: theme.accent,
    margin: 0,
    align: 'right',
  });
}

function addSpeakerNotes(slide: PptxSlide, notes?: string) {
  const clean = cleanText(notes);
  if (!clean) return;

  try {
    slide.addNotes(clean);
  } catch {
    // Poznámky rečníka sú voliteľné a nesmú zhodiť export.
  }
}

function addBulletCards(slide: PptxSlide, theme: PptTheme, bullets: string[], startY = 1.86) {
  const safeBullets = normalizeBulletsForSlides(bullets).slice(0, MAX_BULLETS_PER_SLIDE);

  if (!safeBullets.length) {
    safeBullets.push('Obsah snímky je potrebné doplniť podľa finálnej verzie práce.');
  }

  const fontSize = getDynamicBulletFontSize(safeBullets);
  const cardHeight = getDynamicCardHeight(safeBullets);
  const gap = safeBullets.length >= 5 ? 0.11 : 0.16;
  const availableBottom = 6.58;

  safeBullets.forEach((bullet, index) => {
    const y = startY + index * (cardHeight + gap);
    const safeY = Math.min(y, availableBottom - cardHeight);

    slide.addShape(ShapeType.roundRect, {
      x: 0.85,
      y: safeY,
      w: 11.75,
      h: cardHeight,
      rectRadius: 0.06,
      fill: { color: index % 2 === 0 ? theme.card : theme.card2 },
      line: { color: theme.border, transparency: 0, width: 1 },
    } as any);

    slide.addShape(ShapeType.rect, {
      x: 0.85,
      y: safeY,
      w: 0.11,
      h: cardHeight,
      fill: { color: index % 2 === 0 ? theme.accent : theme.accent2 },
      line: { color: index % 2 === 0 ? theme.accent : theme.accent2 },
    });

    slide.addText(cleanInlineText(bullet), {
      x: 1.18,
      y: safeY + 0.11,
      w: 10.92,
      h: cardHeight - 0.2,
      fontFace: 'Arial',
      fontSize,
      bold: false,
      color: theme.text,
      fit: 'shrink',
      valign: 'middle',
      margin: 0.01,
      breakLine: false,
    });
  });
}

function addSplitSlide(slide: PptxSlide, theme: PptTheme, item: DefenseSlide) {
  const bullets = normalizeBulletsForSlides(item.bullets).slice(0, MAX_BULLETS_PER_SLIDE);

  if (bullets.length <= 3) {
    addBulletCards(slide, theme, bullets);
    return;
  }

  const left = bullets.slice(0, Math.ceil(bullets.length / 2));
  const right = bullets.slice(Math.ceil(bullets.length / 2));

  const boxes = [
    { x: 0.8, title: 'Kľúčové body', bullets: left, accent: theme.accent },
    { x: 6.78, title: 'Dôraz pri obhajobe', bullets: right.length ? right : left, accent: theme.accent2 },
  ];

  boxes.forEach((box) => {
    slide.addShape(ShapeType.roundRect, {
      x: box.x,
      y: 1.86,
      w: 5.75,
      h: 4.7,
      rectRadius: 0.06,
      fill: { color: theme.card },
      line: { color: theme.border, transparency: 0, width: 1 },
    } as any);

    slide.addShape(ShapeType.rect, {
      x: box.x,
      y: 1.86,
      w: 5.75,
      h: 0.13,
      fill: { color: box.accent },
      line: { color: box.accent },
    });

    slide.addText(box.title, {
      x: box.x + 0.28,
      y: 2.18,
      w: 5.15,
      h: 0.32,
      fontFace: 'Arial',
      fontSize: 13,
      bold: true,
      color: box.accent,
      margin: 0,
    });

    slide.addText(
      box.bullets
        .map((bullet) => {
          const compact = cleanInlineText(bullet);
          return `• ${compact.length > MAX_BULLET_CHARS_COMPACT ? `${compact.slice(0, MAX_BULLET_CHARS_COMPACT).trim()}…` : compact}`;
        })
        .join('\n'),
      {
        x: box.x + 0.32,
        y: 2.66,
        w: 5.08,
        h: 3.42,
        fontFace: 'Arial',
        fontSize: box.bullets.length >= 3 ? 12.4 : 13.6,
        color: theme.text,
        fit: 'shrink',
        margin: 0.03,
        breakLine: false,
        paraSpaceAfter: 4,
      },
    );
  });
}

function addTable(slide: PptxSlide, theme: PptTheme, table: DefenseTable) {
  const headers = table.headers?.length ? table.headers.slice(0, MAX_TABLE_COLS) : ['Ukazovateľ', 'Hodnota'];
  const rows = table.rows?.length ? table.rows : [];

  const normalizedRows = rows.slice(0, MAX_TABLE_ROWS).map((row) => {
    const next = [...row.map((cell) => cleanInlineText(cell))];
    while (next.length < headers.length) next.push('');
    return next.slice(0, headers.length);
  });

  const tableData = [headers, ...normalizedRows].map((row, rowIndex) =>
    row.map((cell) => ({
      text: cleanInlineText(cell),
      options: {
        bold: rowIndex === 0,
        color: rowIndex === 0 ? 'FFFFFF' : theme.text,
        fill: { color: rowIndex === 0 ? theme.accent : rowIndex % 2 === 0 ? theme.card2 : theme.card },
        margin: 0.06,
        fontFace: 'Arial',
        fontSize: rowIndex === 0 ? 10 : 9,
        valign: 'middle',
      },
    })),
  );

  slide.addText(table.title || 'Prehľad výsledkov', {
    x: 0.85,
    y: 1.72,
    w: 11.7,
    h: 0.32,
    fontFace: 'Arial',
    fontSize: 14,
    bold: true,
    color: theme.accent2,
    margin: 0,
  });

  try {
    slide.addTable(tableData as any, {
      x: 0.85,
      y: 2.18,
      w: 11.75,
      h: 4.1,
      border: { type: 'solid', color: theme.border, pt: 0.75 },
      margin: 0.05,
      fit: 'shrink',
    } as any);
  } catch {
    const fallback = [headers.join(' | '), ...normalizedRows.map((row) => row.join(' | '))].join('\n');

    slide.addText(fallback, {
      x: 0.9,
      y: 2.2,
      w: 11.6,
      h: 4.0,
      fontFace: 'Arial',
      fontSize: 12,
      color: theme.text,
      fit: 'shrink',
      margin: 0.05,
      breakLine: false,
    });
  }
}

function addBarChart(slide: PptxSlide, theme: PptTheme, chart: DefenseChart) {
  const labels = chart.labels || [];
  const values = chart.values || [];
  const unit = chart.unit || '';
  const count = Math.min(labels.length, values.length, MAX_CHART_ITEMS);
  const maxValue = Math.max(...values.slice(0, count), 1);

  slide.addText(chart.title || 'Grafické zobrazenie výsledkov', {
    x: 0.85,
    y: 1.72,
    w: 11.7,
    h: 0.32,
    fontFace: 'Arial',
    fontSize: 14,
    bold: true,
    color: theme.accent2,
    margin: 0,
  });

  if (chart.type === 'column') {
    const chartX = 1.0;
    const chartY = 2.25;
    const chartW = 11.1;
    const chartH = 3.6;
    const gap = 0.18;
    const barW = (chartW - gap * (count - 1)) / Math.max(count, 1);

    for (let i = 0; i < count; i += 1) {
      const value = values[i];
      const ratio = clamp(value / maxValue, 0, 1);
      const h = Math.max(0.18, chartH * ratio);
      const x = chartX + i * (barW + gap);
      const y = chartY + chartH - h;

      slide.addShape(ShapeType.rect, {
        x,
        y,
        w: barW,
        h,
        fill: { color: i % 2 === 0 ? theme.accent : theme.accent2 },
        line: { color: i % 2 === 0 ? theme.accent : theme.accent2 },
      });

      slide.addText(`${value}${unit}`, {
        x,
        y: y - 0.3,
        w: barW,
        h: 0.18,
        fontFace: 'Arial',
        fontSize: 8.5,
        bold: true,
        color: theme.text,
        align: 'center',
        margin: 0,
      });

      slide.addText(labels[i], {
        x,
        y: chartY + chartH + 0.18,
        w: barW,
        h: 0.45,
        fontFace: 'Arial',
        fontSize: 7.8,
        color: theme.muted,
        fit: 'shrink',
        align: 'center',
        margin: 0,
      });
    }

    return;
  }

  const chartX = 1.05;
  const chartY = 2.25;
  const chartW = 10.95;
  const rowH = Math.min(0.58, 3.9 / Math.max(count, 1));

  for (let i = 0; i < count; i += 1) {
    const label = labels[i];
    const value = values[i];
    const y = chartY + i * (rowH + 0.18);
    const ratio = clamp(value / maxValue, 0, 1);
    const barW = Math.max(0.25, (chartW - 3.35) * ratio);

    slide.addText(label, {
      x: chartX,
      y,
      w: 2.85,
      h: rowH,
      fontFace: 'Arial',
      fontSize: 10,
      color: theme.text,
      fit: 'shrink',
      margin: 0,
      valign: 'middle',
    });

    slide.addShape(ShapeType.roundRect, {
      x: chartX + 3.05,
      y: y + 0.07,
      w: chartW - 3.35,
      h: rowH - 0.14,
      rectRadius: 0.03,
      fill: { color: theme.card2 },
      line: { color: theme.border, transparency: 0 },
    } as any);

    slide.addShape(ShapeType.roundRect, {
      x: chartX + 3.05,
      y: y + 0.07,
      w: barW,
      h: rowH - 0.14,
      rectRadius: 0.03,
      fill: { color: i % 2 === 0 ? theme.accent : theme.accent2 },
      line: { color: i % 2 === 0 ? theme.accent : theme.accent2 },
    } as any);

    slide.addText(`${value}${unit}`, {
      x: Math.min(chartX + 3.18 + barW, 11.15),
      y,
      w: 1.05,
      h: rowH,
      fontFace: 'Arial',
      fontSize: 10,
      bold: true,
      color: theme.text,
      fit: 'shrink',
      margin: 0,
      valign: 'middle',
    });
  }
}

function addImageSlide(slide: PptxSlide, theme: PptTheme, item: DefenseSlide) {
  const image = item.images?.[0];

  if (!image) {
    addBulletCards(slide, theme, item.bullets.length ? item.bullets : ['Vizuálnu prílohu je možné doplniť manuálne.']);
    return;
  }

  slide.addShape(ShapeType.roundRect, {
    x: 0.85,
    y: 1.75,
    w: 11.75,
    h: 4.75,
    rectRadius: 0.06,
    fill: { color: theme.card },
    line: { color: theme.border, transparency: 0 },
  } as any);

  try {
    slide.addImage({
      ...(image.data ? { data: image.data } : { path: image.path }),
      x: 1.08,
      y: 1.98,
      w: 6.1,
      h: 4.25,
      sizing: { type: 'contain', x: 1.08, y: 1.98, w: 6.1, h: 4.25 },
    } as any);
  } catch {
    slide.addText('Obrázok sa nepodarilo vložiť automaticky.', {
      x: 1.08,
      y: 3.55,
      w: 6.1,
      h: 0.35,
      fontFace: 'Arial',
      fontSize: 13,
      color: theme.muted,
      align: 'center',
      margin: 0,
    });
  }

  const bullets = normalizeBulletsForSlides(item.bullets).slice(0, 4);

  slide.addText(image.title || 'Vizuálny podklad', {
    x: 7.45,
    y: 2.05,
    w: 4.7,
    h: 0.32,
    fontFace: 'Arial',
    fontSize: 14,
    bold: true,
    color: theme.accent2,
    margin: 0,
  });

  slide.addText((bullets.length ? bullets : ['Vizuál podporuje vysvetlenie výsledkov alebo metodiky.']).map((bullet) => `• ${bullet}`).join('\n'), {
    x: 7.45,
    y: 2.58,
    w: 4.7,
    h: 3.2,
    fontFace: 'Arial',
    fontSize: 12.4,
    color: theme.text,
    fit: 'shrink',
    margin: 0.03,
    breakLine: false,
    paraSpaceAfter: 4,
  });
}

function addQuoteSlide(slide: PptxSlide, theme: PptTheme, item: DefenseSlide) {
  const bullets = normalizeBulletsForSlides(item.bullets);
  const quoteRaw = bullets[0] || item.visualSuggestion || 'Kľúčové zistenie práce';

  const quote =
    quoteRaw.length > 260
      ? `${quoteRaw.slice(0, 257).trim()}…`
      : quoteRaw;

  slide.addShape(ShapeType.roundRect, {
    x: 0.9,
    y: 1.9,
    w: 11.55,
    h: 3.15,
    rectRadius: 0.06,
    fill: { color: theme.card },
    line: { color: theme.border, transparency: 0, width: 1 },
  } as any);

  slide.addShape(ShapeType.rect, {
    x: 0.9,
    y: 1.9,
    w: 0.16,
    h: 3.15,
    fill: { color: theme.accent },
    line: { color: theme.accent },
  });

  slide.addText(quote, {
    x: 1.35,
    y: 2.23,
    w: 10.45,
    h: 1.78,
    fontFace: 'Arial',
    fontSize: quote.length > 190 ? 18 : quote.length > 120 ? 21 : 25,
    bold: true,
    color: theme.title,
    fit: 'shrink',
    margin: 0,
    breakLine: false,
    valign: 'middle',
  });

  if (bullets.length > 1) {
    const otherBullets = bullets
      .slice(1, 4)
      .map((bullet) => {
        const compact = bullet.length > 120 ? `${bullet.slice(0, 117).trim()}…` : bullet;
        return `• ${compact}`;
      })
      .join('\n');

    slide.addText(otherBullets, {
      x: 1.35,
      y: 4.22,
      w: 10.45,
      h: 0.9,
      fontFace: 'Arial',
      fontSize: 11.8,
      color: theme.muted,
      fit: 'shrink',
      margin: 0.01,
      breakLine: false,
      paraSpaceAfter: 3,
    });
  }
}

function addVisualSuggestion(slide: PptxSlide, theme: PptTheme, suggestion?: string) {
  const clean = cleanInlineText(suggestion);
  if (!clean) return;

  const safeSuggestion =
    clean.length > 135 ? `${clean.slice(0, 132).trim()}…` : clean;

  slide.addShape(ShapeType.roundRect, {
    x: 0.85,
    y: 6.34,
    w: 11.75,
    h: 0.32,
    rectRadius: 0.04,
    fill: { color: theme.soft },
    line: { color: theme.border, transparency: 0 },
  } as any);

  slide.addText(`Vizuál: ${safeSuggestion}`, {
    x: 1.05,
    y: 6.41,
    w: 11.35,
    h: 0.16,
    fontFace: 'Arial',
    fontSize: 7.4,
    italic: true,
    color: theme.muted,
    fit: 'shrink',
    margin: 0,
  });
}

function addCoverSlide(pptxDoc: PptxGen, theme: PptTheme, title: string, defenseType: string) {
  const slide = pptxDoc.addSlide();
  addBackground(slide, theme);

  slide.addText('ZEDPERA', {
    x: 0.78,
    y: 0.08,
    w: 1.45,
    h: 0.18,
    fontFace: 'Arial',
    fontSize: 8,
    bold: true,
    color: theme.headerText,
    margin: 0,
  });

  slide.addText(defenseType.toUpperCase(), {
    x: 0.82,
    y: 1.35,
    w: 9.8,
    h: 0.32,
    fontFace: 'Arial',
    fontSize: 11,
    bold: true,
    color: theme.accent2,
    margin: 0,
  });

  slide.addText(safeSlideTitle(title, undefined, undefined), {
    x: 0.8,
    y: 1.95,
    w: 11.85,
    h: 2.05,
    fontFace: 'Arial',
    fontSize: title.length > 95 ? 28 : 36,
    bold: true,
    color: theme.title,
    fit: 'shrink',
    margin: 0,
    breakLine: false,
  });

  slide.addShape(ShapeType.rect, {
    x: 0.82,
    y: 4.34,
    w: 4.4,
    h: 0.05,
    fill: { color: theme.accent },
    line: { color: theme.accent },
  });

  slide.addText('Prezentácia na obhajobu záverečnej práce', {
    x: 0.82,
    y: 4.65,
    w: 10.8,
    h: 0.32,
    fontFace: 'Arial',
    fontSize: 16,
    bold: true,
    color: theme.text,
    margin: 0,
  });

  slide.addText('Všeobecná svetlá šablóna · vysoký kontrast · čitateľné písmo', {
    x: 0.82,
    y: 6.55,
    w: 11.5,
    h: 0.28,
    fontFace: 'Arial',
    fontSize: 10,
    color: theme.muted,
    margin: 0,
  });
}

function addAgendaSlide(pptxDoc: PptxGen, theme: PptTheme, agenda: string[], title: string) {
  const slide = pptxDoc.addSlide();
  addBackground(slide, theme);
  addHeader(slide, theme, 'Obsah prezentácie', 'Agenda obhajoby');

  const safeAgenda = agenda.map((item) => safeSlideTitle(item)).slice(0, 10);
  const left = safeAgenda.slice(0, 5);
  const right = safeAgenda.slice(5, 10);

  [left, right].forEach((items, columnIndex) => {
    const x = columnIndex === 0 ? 0.9 : 6.85;

    items.forEach((item, index) => {
      const globalIndex = columnIndex === 0 ? index + 1 : index + 6;
      const y = 1.95 + index * 0.76;

      slide.addShape(ShapeType.roundRect, {
        x,
        y,
        w: 0.5,
        h: 0.5,
        rectRadius: 0.04,
        fill: { color: globalIndex % 2 === 0 ? theme.accent2 : theme.accent },
        line: { color: globalIndex % 2 === 0 ? theme.accent2 : theme.accent },
      } as any);

      slide.addText(String(globalIndex), {
        x,
        y: y + 0.13,
        w: 0.5,
        h: 0.15,
        fontFace: 'Arial',
        fontSize: 8,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        margin: 0,
      });

      slide.addText(item, {
        x: x + 0.72,
        y: y + 0.07,
        w: 4.85,
        h: 0.36,
        fontFace: 'Arial',
        fontSize: 13.5,
        bold: true,
        color: theme.text,
        fit: 'shrink',
        margin: 0,
      });
    });
  });

  addFooter(slide, theme, 1, title);
}

function addContentSlide(pptxDoc: PptxGen, theme: PptTheme, item: DefenseSlide, slideNumber: number, workTitle: string) {
  const slide = pptxDoc.addSlide();
  const safeItem: DefenseSlide = {
    ...item,
    title: safeSlideTitle(item.title || `Snímka ${slideNumber}`),
    bullets: normalizeBulletsForSlides(item.bullets).slice(0, MAX_BULLETS_PER_SLIDE),
  };

  addBackground(slide, theme);
  addHeader(slide, theme, `Snímka ${slideNumber}`, safeItem.title);

  if (safeItem.layout === 'table' && safeItem.table) {
    addTable(slide, theme, safeItem.table);
  } else if (safeItem.layout === 'chart' && safeItem.chart) {
    addBarChart(slide, theme, safeItem.chart);
  } else if (safeItem.layout === 'image') {
    addImageSlide(slide, theme, safeItem);
  } else if (safeItem.layout === 'quote' || safeItem.layout === 'section') {
    addQuoteSlide(slide, theme, safeItem);
  } else if (safeItem.layout === 'split') {
    addSplitSlide(slide, theme, safeItem);
  } else {
    addBulletCards(
      slide,
      theme,
      safeItem.bullets.length
        ? safeItem.bullets
        : ['Obsah snímky je potrebné doplniť podľa finálnej verzie práce.'],
    );
  }

  addVisualSuggestion(slide, theme, safeItem.visualSuggestion);
  addSpeakerNotes(slide, safeItem.speakerNotes);
  addFooter(slide, theme, slideNumber, workTitle);
}

function addClosingSlide(pptxDoc: PptxGen, theme: PptTheme, title: string, slideNumber: number) {
  const slide = pptxDoc.addSlide();
  addBackground(slide, theme);

  slide.addText('Ďakujem za pozornosť', {
    x: 1.0,
    y: 2.18,
    w: 11.3,
    h: 0.8,
    fontFace: 'Arial',
    fontSize: 39,
    bold: true,
    color: theme.title,
    align: 'center',
    margin: 0,
  });

  slide.addText('Priestor na otázky komisie', {
    x: 1.0,
    y: 3.25,
    w: 11.3,
    h: 0.35,
    fontFace: 'Arial',
    fontSize: 17,
    bold: true,
    color: theme.text,
    align: 'center',
    margin: 0,
  });

  slide.addShape(ShapeType.rect, {
    x: 4.55,
    y: 4.15,
    w: 4.2,
    h: 0.05,
    fill: { color: theme.accent },
    line: { color: theme.accent },
  });

  addFooter(slide, theme, slideNumber, title);
}

function enrichSlidesWithDetectedVisuals(slides: DefenseSlide[], sourceText: string): DefenseSlide[] {
  const text = truncate(sourceText);
  const markdownTables = extractMarkdownTables(text);
  const looseTables = extractLooseTables(text);
  const allTables = [...markdownTables, ...looseTables];
  const extractedChart = extractNumericChart(text);

  const hasTable = slides.some((slide) => slide.table || slide.layout === 'table');
  const hasChart = slides.some((slide) => slide.chart || slide.layout === 'chart');

  const enriched = slides.map((slide) => ({
    ...slide,
    title: safeSlideTitle(slide.title),
    bullets: normalizeBulletsForSlides(slide.bullets),
  }));

  if (!hasChart && extractedChart && enriched.length > 0) {
    const targetIndex = enriched.findIndex((slide) => /výsled|analýz|zisten|respond|dát|graf|štat|hypot/i.test(slide.title));
    const index = targetIndex >= 0 ? targetIndex : Math.min(6, enriched.length - 1);

    enriched[index] = {
      ...enriched[index],
      layout: 'chart',
      chart: extractedChart,
      visualSuggestion: enriched[index].visualSuggestion || 'Doplniť jednoduchý graf k hlavným číselným výsledkom práce.',
    };
  }

  if (!hasTable && allTables.length > 0 && enriched.length > 0) {
    const targetIndex = enriched.findIndex((slide) => /výsled|tabuľ|analýz|zisten|dát|prehľad|výskum/i.test(slide.title));
    const index = targetIndex >= 0 ? targetIndex : Math.min(7, enriched.length - 1);

    if (enriched[index].layout !== 'chart') {
      enriched[index] = {
        ...enriched[index],
        layout: 'table',
        table: allTables[0],
        visualSuggestion: enriched[index].visualSuggestion || 'Zobraziť kľúčové výsledky formou prehľadnej tabuľky.',
      };
    } else if (enriched.length > index + 1) {
      enriched.splice(index + 1, 0, {
        title: allTables[0].title || 'Prehľad výsledkov',
        bullets: ['Tabuľka sumarizuje najdôležitejšie údaje využiteľné pri obhajobe.'],
        layout: 'table',
        table: allTables[0],
        speakerNotes: 'Tabuľku vysvetlite stručne a zdôraznite iba hlavný trend alebo rozdiel.',
      });
    }
  }

  return enriched.slice(0, MAX_EXPORTED_SLIDES);
}

function normalizeSlidesFromBody(rawSlides: unknown, sourceText: string, title: string): DefenseSlide[] {
  const initialSlides = Array.isArray(rawSlides)
    ? rawSlides
        .map((slide: unknown, index: number): DefenseSlide => normalizeSlide(slide, index))
        .filter((slide: DefenseSlide): boolean => slide.title.length > 0 || slide.bullets.length > 0)
        .slice(0, 18)
    : [];

  let slides = initialSlides;

  if (!slides.length && sourceText) {
    slides = generateSlidesFromSource(sourceText, title);
  }

  if (!slides.length) {
    slides = generateSlidesFromSource('', title);
  }

  const enriched = enrichSlidesWithDetectedVisuals(slides, sourceText);

  return expandTextSlides(enriched);
}

function sourceTextFromBody(body: Record<string, unknown>): string {
  return truncate(
    cleanText(
      body.sourceText ||
        body.extractedWorkText ||
        body.attachmentText ||
        body.text ||
        body.workText ||
        body.content ||
        body.summary ||
        body.workTitle ||
        '',
    ),
  );
}

function normalizeSingleInput(body: Record<string, unknown>): NormalizedPptxInput {
  const title = cleanInlineText(body.title || body.workTitle || 'Obhajoba práce');
  const defenseType = cleanInlineText(body.defenseType || body.type || 'Obhajoba záverečnej práce');
  const sourceText = sourceTextFromBody(body);
  const slides = normalizeSlidesFromBody(body.slides, sourceText, title);

  return { title, defenseType, sourceText, slides };
}

function normalizeWorks(body: DefensePptxRequestBody): NormalizedPptxInput[] {
  const rawWorks = Array.isArray(body.works)
    ? body.works
    : Array.isArray(body.selectedWorks)
      ? body.selectedWorks
      : Array.isArray(body.projects)
        ? body.projects
        : [];

  if (!rawWorks.length) {
    return [normalizeSingleInput(body as Record<string, unknown>)];
  }

  return rawWorks
    .map((work, index): NormalizedPptxInput => {
      const raw = work && typeof work === 'object' ? (work as Record<string, unknown>) : {};
      const title = cleanInlineText(raw.title || raw.workTitle || raw.topic || raw.name || `Práca ${index + 1}`);
      const defenseType = cleanInlineText(raw.defenseType || raw.type || body.defenseType || 'Obhajoba záverečnej práce');
      const sourceText = sourceTextFromBody({ ...raw, fallbackText: body.text });
      const slides = normalizeSlidesFromBody(raw.slides, sourceText, title);

      return { title, defenseType, sourceText, slides };
    })
    .filter((item) => item.title || item.slides.length);
}

async function buildPresentation(input: NormalizedPptxInput, theme: PptTheme): Promise<GeneratedPptxFile> {
  if (!input.slides.length) {
    throw new Error(`Chýbajú snímky na export pre prácu: ${input.title}`);
  }

  const pptxDoc = new pptxgen();

  pptxDoc.layout = 'LAYOUT_WIDE';
  pptxDoc.author = 'ZEDPERA';
  pptxDoc.company = 'ZEDPERA';
  pptxDoc.subject = input.defenseType;
  pptxDoc.title = input.title;

  (pptxDoc as any).lang = 'sk-SK';

  pptxDoc.theme = {
    headFontFace: 'Arial',
    bodyFontFace: 'Arial',
    lang: 'sk-SK',
  } as any;

  const finalSlides = expandTextSlides(input.slides).slice(0, MAX_EXPORTED_SLIDES);

  addCoverSlide(pptxDoc, theme, input.title, input.defenseType);
  addAgendaSlide(pptxDoc, theme, buildAgenda(finalSlides), input.title);

  finalSlides.forEach((item: DefenseSlide, index: number) => {
    addContentSlide(pptxDoc, theme, item, index + 2, input.title);
  });

  addClosingSlide(pptxDoc, theme, input.title, finalSlides.length + 2);

  const output = await (pptxDoc as any).write({ outputType: 'nodebuffer' });

  const buffer = Buffer.isBuffer(output)
    ? output
    : output instanceof ArrayBuffer
      ? Buffer.from(output)
      : ArrayBuffer.isView(output)
        ? Buffer.from(output.buffer, output.byteOffset, output.byteLength)
        : Buffer.from(String(output || ''), 'binary');

  if (!buffer.length) {
    throw new Error(`PPTX export vrátil prázdny súbor pre prácu: ${input.title}`);
  }

  return {
    fileName: `${safeFileName(input.title)}.pptx`,
    title: input.title,
    buffer,
    slidesCount: finalSlides.length + 3,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DefensePptxRequestBody;
    const themeName = asThemeName(body.theme);
    const theme = THEMES[themeName];
    const works = normalizeWorks(body);

    if (!works.length) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýbajú vybrané práce alebo snímky na export.',
        },
        { status: 400 },
      );
    }

    const files: GeneratedPptxFile[] = [];

    for (const work of works) {
      files.push(await buildPresentation(work, theme));
    }

    if (files.length === 1) {
      const file = files[0];

      return new NextResponse(new Uint8Array(file.buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': `attachment; filename="${file.fileName}"`,
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    return NextResponse.json({
      ok: true,
      mode: 'batch',
      count: files.length,
      files: files.map((file) => ({
        fileName: file.fileName,
        title: file.title,
        slidesCount: file.slidesCount,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        base64: file.buffer.toString('base64'),
      })),
    });
  } catch (error) {
    console.error('PPTX_EXPORT_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Nepodarilo sa exportovať PowerPoint.',
      },
      { status: 500 },
    );
  }
}
