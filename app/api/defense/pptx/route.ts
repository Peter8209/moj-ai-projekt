import { NextRequest, NextResponse } from 'next/server';
import pptxgen from 'pptxgenjs';

// DÔLEŽITÉ: pptxgenjs musí zostať iba v API route/serverovom súbore.
// Nesmie byť importovaný v DashboardClient.tsx ani inom 'use client' komponente.
const pptx = pptxgen;

// pptxgenjs v niektorých Next.js runtime buildoch neposkytuje ShapeType cez default import
// (pptx.ShapeType môže byť undefined). Používame preto stabilné string hodnoty
// podporované funkciou slide.addShape().
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
};

type ThemeName = 'dark' | 'light' | 'academic';

type PptTheme = {
  name: ThemeName;
  bg: string;
  bg2: string;
  card: string;
  card2: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  border: string;
  danger: string;
  soft: string;
};

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

const MAX_BULLETS_PER_SLIDE = 5;
const MAX_TABLE_ROWS = 8;
const MAX_TABLE_COLS = 6;
const MAX_CHART_ITEMS = 7;
const MAX_SOURCE_TEXT_CHARS = 220_000;
const MAX_EXPORTED_SLIDES = 18;

const THEMES: Record<ThemeName, PptTheme> = {
  dark: {
    name: 'dark',
    bg: '070B1A',
    bg2: '111827',
    card: '151B2E',
    card2: '1E293B',
    text: 'FFFFFF',
    muted: 'CBD5E1',
    accent: '7C3AED',
    accent2: '22C55E',
    border: '334155',
    danger: 'EF4444',
    soft: '10182C',
  },
  light: {
    name: 'light',
    bg: 'F8FAFC',
    bg2: 'EEF2FF',
    card: 'FFFFFF',
    card2: 'F1F5F9',
    text: '0F172A',
    muted: '475569',
    accent: '7C3AED',
    accent2: '0284C7',
    border: 'CBD5E1',
    danger: 'DC2626',
    soft: 'EDE9FE',
  },
  academic: {
    name: 'academic',
    bg: 'F8FAFC',
    bg2: 'EEF2FF',
    card: 'FFFFFF',
    card2: 'F1F5F9',
    text: '111827',
    muted: '4B5563',
    accent: '4F46E5',
    accent2: '0F766E',
    border: 'D1D5DB',
    danger: 'B91C1C',
    soft: 'EEF2FF',
  },
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
  const middleStart = Math.max(
    0,
    Math.floor(text.length / 2) - Math.floor(max * 0.12),
  );
  const middle = text.slice(middleStart, middleStart + Math.floor(max * 0.24));
  const end = text.slice(text.length - Math.floor(max * 0.28));

  return `${start}\n\n${middle}\n\n${end}`.trim();
}

function safeFileName(value: string): string {
  const safe = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return safe || 'obhajoba';
}

function asThemeName(value: unknown): ThemeName {
  const theme = String(value || '').toLowerCase().trim();

  if (theme === 'light') return 'light';
  if (theme === 'academic') return 'academic';

  return 'dark';
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
    ? raw.headers
        .map((item) => cleanInlineText(item))
        .filter(Boolean)
        .slice(0, MAX_TABLE_COLS)
    : [];

  const rows = Array.isArray(raw.rows)
    ? raw.rows
        .filter((row): row is unknown[] => Array.isArray(row))
        .map((row) =>
          row
            .map((cell) => cleanInlineText(cell))
            .slice(0, MAX_TABLE_COLS),
        )
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
    ? raw.labels
        .map((item) => cleanInlineText(item))
        .filter(Boolean)
        .slice(0, MAX_CHART_ITEMS)
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
    type:
      raw.type === 'progress' || raw.type === 'column' || raw.type === 'bar'
        ? raw.type
        : 'bar',
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

      return {
        title,
        data,
        path,
        alt,
      };
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
    layout === 'image'
  ) {
    return layout;
  }

  if (index === 0) return 'section';
  if ((index + 1) % 5 === 0) return 'split';

  return 'bullets';
}

function normalizeSlide(value: unknown, index: number): DefenseSlide {
  const item =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};

  const title = cleanInlineText(item.title || `Snímka ${index + 1}`);

  const bullets = Array.isArray(item.bullets)
    ? item.bullets
        .map((bullet: unknown) => cleanInlineText(bullet))
        .filter(Boolean)
        .slice(0, MAX_BULLETS_PER_SLIDE)
    : [];

  const table = normalizeTable(item.table);
  const chart = normalizeChart(item.chart);
  const images = normalizeImages(item.images);

  let layout = normalizeLayout(item.layout, index);

  if (table) layout = 'table';
  if (chart) layout = 'chart';
  if (images.length > 0) layout = 'image';

  return {
    title,
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
    .slice(0, 80);
}

function extractSection(
  text: string,
  patterns: RegExp[],
  maxSentences = 4,
): string[] {
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
    .map((sentence) =>
      sentence.length > 170 ? `${sentence.slice(0, 167)}…` : sentence,
    )
    .filter(Boolean)
    .slice(0, MAX_BULLETS_PER_SLIDE);

  return bullets.length ? bullets : fallback.slice(0, MAX_BULLETS_PER_SLIDE);
}

function generateSlidesFromSource(
  sourceText: string,
  title: string,
): DefenseSlide[] {
  const text = truncate(sourceText);

  if (!cleanText(text)) {
    return [
      {
        title: 'Cieľ a zameranie práce',
        layout: 'section',
        bullets: [
          'Predstaviť hlavný cieľ záverečnej práce.',
          'Vysvetliť riešený problém a dôvod výberu témy.',
          'Stručne uviesť metodický postup práce.',
        ],
        speakerNotes:
          'Na úvod predstavte tému, hlavný problém a dôvod, prečo je práca dôležitá.',
      },
      {
        title: 'Metodika práce',
        layout: 'bullets',
        bullets: [
          'Opísať použité metódy a postup spracovania.',
          'Vysvetliť výber dát, zdrojov alebo výskumnej vzorky.',
          'Uviesť, ako boli výsledky vyhodnocované.',
        ],
      },
      {
        title: 'Hlavné výsledky',
        layout: 'bullets',
        bullets: [
          'Zhrnúť najdôležitejšie zistenia práce.',
          'Zdôrazniť výsledky priamo súvisiace s cieľom práce.',
          'Prepojiť výsledky s odporúčaniami alebo prínosom.',
        ],
      },
      {
        title: 'Prínos práce',
        layout: 'quote',
        bullets: [
          'Najväčším prínosom práce je prepojenie teoretických poznatkov s praktickým riešením problému.',
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
    extractSection(text, [/teoret/i, /východisk/i, /literat/i, /autor/i], 4),
    [
      'Teoretická časť vytvára odborný rámec riešenej problematiky.',
      'V práci sú vysvetlené základné pojmy a súvislosti.',
      'Literárne zdroje slúžia ako podklad pre vlastné spracovanie témy.',
    ],
  );

  const methodology = toBullets(
    extractSection(
      text,
      [/metod/i, /výskum/i, /vzorka/i, /dotazník/i, /analýz/i],
      5,
    ),
    [
      'Praktická časť vychádza z metodického postupu zvoleného podľa charakteru témy.',
      'Dáta alebo podklady boli spracované systematicky a vyhodnotené vo vzťahu k cieľom práce.',
      'Metodika umožnila formulovať závery a odporúčania.',
    ],
  );

  const results = toBullets(
    extractSection(text, [/výsled/i, /zisten/i, /potvrd/i, /preukáz/i, /ukáz/i], 5),
    [
      'Výsledky ukazujú hlavné zistenia súvisiace s cieľom práce.',
      'Najdôležitejšie zistenia sú interpretované vo vzťahu k skúmanému problému.',
      'Výsledky vytvárajú podklad pre odporúčania a záver práce.',
    ],
  );

  const recommendations = toBullets(
    extractSection(
      text,
      [/odporúč/i, /navrh/i, /riešen/i, /prínos/i, /záver/i],
      5,
    ),
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
      speakerNotes:
        'Predstavte tému, hlavný cieľ práce a stručne vysvetlite, čo bolo predmetom skúmania.',
    },
    {
      title: 'Teoretické východiská',
      layout: 'bullets',
      bullets: theory,
      visualSuggestion: 'Vhodné doplniť schému hlavných pojmov alebo konceptov.',
    },
    {
      title: 'Metodika a postup spracovania',
      layout: 'split',
      bullets: methodology,
      visualSuggestion: 'Vhodné doplniť postupový diagram metodiky.',
    },
    {
      title: 'Hlavné výsledky práce',
      layout: 'bullets',
      bullets: results,
      visualSuggestion:
        'Vhodné doplniť graf alebo tabuľku s hlavnými výsledkami.',
    },
    {
      title: 'Prínos a odporúčania',
      layout: 'quote',
      bullets: recommendations,
      speakerNotes:
        'V závere zdôraznite, čo práca priniesla a ako možno výsledky využiť.',
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
      .map((line) =>
        line
          .split('|')
          .map((cell) => cleanInlineText(cell))
          .filter(Boolean),
      )
      .filter((row) => row.length >= 2);

    const filteredRows = rows.filter(
      (row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell)),
    );

    if (filteredRows.length >= 2) {
      const headers = filteredRows[0].slice(0, MAX_TABLE_COLS);
      const dataRows = filteredRows
        .slice(1, MAX_TABLE_ROWS + 1)
        .map((row) => row.slice(0, MAX_TABLE_COLS));

      tables.push({
        title: 'Tabuľkové výsledky',
        headers,
        rows: dataRows,
      });
    }

    block = [];
  }

  for (const line of lines) {
    if (line.includes('|')) {
      block.push(line);
    } else {
      flush();
    }
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

      const parts = line
        .split(/\t|;| {2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

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
    const rows = block
      .slice(1, MAX_TABLE_ROWS + 1)
      .map((row) => row.slice(0, MAX_TABLE_COLS));

    tables.push({
      title: 'Prehľad údajov z práce',
      headers,
      rows,
    });

    block = [];
  }

  for (const line of candidateLines) {
    const parts = line
      .split(/\t|;| {2,}/)
      .map((part) => cleanInlineText(part))
      .filter(Boolean);

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
      const label = cleanInlineText(match[1])
        .replace(/^[-•–—]\s*/, '')
        .slice(0, 40);

      const value = parseNumber(match[2]);
      const hasPercent = Boolean(match[3]);

      if (!label || value === null) continue;
      if (value < 0 || value > 100000) continue;
      if (/^(strana|kapitola|tabuľka|obrázok|graf|rok)$/i.test(label)) {
        continue;
      }

      if (
        pairs.some(
          (item) => item.label.toLowerCase() === label.toLowerCase(),
        )
      ) {
        continue;
      }

      pairs.push({ label, value, hasPercent });
    }
  }

  if (pairs.length < 2) return undefined;

  const percentCount = pairs.filter(
    (item) => item.hasPercent || item.value <= 100,
  ).length;

  return {
    title: 'Kľúčové číselné výsledky',
    type: percentCount >= Math.ceil(pairs.length / 2) ? 'bar' : 'column',
    labels: pairs.map((item) => item.label),
    values: pairs.map((item) => item.value),
    unit: percentCount >= Math.ceil(pairs.length / 2) ? '%' : '',
  };
}

function buildAgenda(slides: DefenseSlide[]): string[] {
  return slides
    .map((slide) => slide.title)
    .filter(Boolean)
    .slice(0, 9);
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
    h: 0.16,
    fill: { color: theme.accent },
    line: { color: theme.accent },
  });

  slide.addShape(ShapeType.ellipse, {
    x: 9.25,
    y: -1.4,
    w: 5.3,
    h: 5.3,
    fill: { color: theme.accent, transparency: 88 },
    line: { color: theme.accent, transparency: 72, width: 1.4 },
  });

  slide.addShape(ShapeType.ellipse, {
    x: -1.9,
    y: 4.75,
    w: 4.9,
    h: 4.9,
    fill: { color: theme.accent2, transparency: 91 },
    line: { color: theme.accent2, transparency: 82, width: 1.2 },
  });
}

function addHeader(
  slide: PptxSlide,
  theme: PptTheme,
  eyebrow: string,
  title: string,
) {
  slide.addText(eyebrow.toUpperCase(), {
    x: 0.65,
    y: 0.38,
    w: 5.8,
    h: 0.25,
    fontFace: 'Aptos',
    fontSize: 8,
    bold: true,
    color: theme.accent,
    margin: 0,
  });

  slide.addText(title, {
    x: 0.65,
    y: 0.75,
    w: 11.95,
    h: 0.78,
    fontFace: 'Aptos Display',
    fontSize: title.length > 70 ? 22 : 27,
    bold: true,
    color: theme.text,
    fit: 'shrink',
    margin: 0,
    breakLine: false,
  });
}

function addFooter(slide: PptxSlide, theme: PptTheme, slideNumber: number) {
  slide.addShape(ShapeType.line, {
    x: 0.65,
    y: 6.92,
    w: 12.0,
    h: 0,
    line: { color: theme.border, transparency: 50, width: 1 },
  });

  slide.addText(String(slideNumber).padStart(2, '0'), {
    x: 0.65,
    y: 7.04,
    w: 0.8,
    h: 0.22,
    fontFace: 'Aptos',
    fontSize: 8,
    color: theme.muted,
    margin: 0,
  });

  slide.addText('ZEDPERA', {
    x: 11.45,
    y: 7.03,
    w: 1.2,
    h: 0.25,
    fontFace: 'Aptos',
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
    // Poznámky rečníka sú voliteľné.
  }
}

function addBulletCards(
  slide: PptxSlide,
  theme: PptTheme,
  bullets: string[],
  startY = 1.82,
) {
  const safeBullets = bullets.slice(0, MAX_BULLETS_PER_SLIDE);
  const cardHeight = safeBullets.length <= 3 ? 0.86 : 0.68;

  safeBullets.forEach((bullet, index) => {
    const y = startY + index * (cardHeight + 0.16);

    slide.addShape(ShapeType.roundRect, {
      x: 0.85,
      y,
      w: 11.75,
      h: cardHeight,
      rectRadius: 0.08,
      fill: { color: theme.card, transparency: theme.name === 'dark' ? 4 : 0 },
      line: { color: theme.border, transparency: 30, width: 1 },
    } as any);

    slide.addShape(ShapeType.roundRect, {
      x: 1.05,
      y: y + 0.22,
      w: 0.32,
      h: 0.32,
      rectRadius: 0.04,
      fill: { color: index % 2 === 0 ? theme.accent : theme.accent2 },
      line: { color: index % 2 === 0 ? theme.accent : theme.accent2 },
    } as any);

    slide.addText(cleanInlineText(bullet), {
      x: 1.55,
      y: y + 0.13,
      w: 10.55,
      h: cardHeight - 0.2,
      fontFace: 'Aptos',
      fontSize: safeBullets.length <= 3 ? 17 : 15,
      color: theme.text,
      fit: 'shrink',
      valign: 'middle',
      margin: 0,
      breakLine: false,
    });
  });
}

function addSplitSlide(
  slide: PptxSlide,
  theme: PptTheme,
  item: DefenseSlide,
) {
  const bullets = item.bullets.slice(0, MAX_BULLETS_PER_SLIDE);
  const left = bullets.slice(0, Math.ceil(bullets.length / 2));
  const right = bullets.slice(Math.ceil(bullets.length / 2));

  slide.addShape(ShapeType.roundRect, {
    x: 0.8,
    y: 1.78,
    w: 5.75,
    h: 4.65,
    rectRadius: 0.08,
    fill: { color: theme.card },
    line: { color: theme.border, transparency: 25 },
  } as any);

  slide.addShape(ShapeType.roundRect, {
    x: 6.78,
    y: 1.78,
    w: 5.75,
    h: 4.65,
    rectRadius: 0.08,
    fill: { color: theme.card2 },
    line: { color: theme.border, transparency: 25 },
  } as any);

  slide.addText('Kľúčové body', {
    x: 1.08,
    y: 2.08,
    w: 5.15,
    h: 0.32,
    fontFace: 'Aptos',
    fontSize: 13,
    bold: true,
    color: theme.accent,
    margin: 0,
  });

  slide.addText(left.map((bullet) => `• ${bullet}`).join('\n'), {
    x: 1.08,
    y: 2.58,
    w: 5.05,
    h: 3.35,
    fontFace: 'Aptos',
    fontSize: 15,
    color: theme.text,
    fit: 'shrink',
    margin: 0.04,
    breakLine: false,
    paraSpaceAfter: 8,
  });

  slide.addText('Dôraz pri obhajobe', {
    x: 7.08,
    y: 2.08,
    w: 5.15,
    h: 0.32,
    fontFace: 'Aptos',
    fontSize: 13,
    bold: true,
    color: theme.accent2,
    margin: 0,
  });

  slide.addText(
    (right.length ? right : left).map((bullet) => `• ${bullet}`).join('\n'),
    {
      x: 7.08,
      y: 2.58,
      w: 5.05,
      h: 3.35,
      fontFace: 'Aptos',
      fontSize: 15,
      color: theme.text,
      fit: 'shrink',
      margin: 0.04,
      breakLine: false,
      paraSpaceAfter: 8,
    },
  );
}

function addTable(slide: PptxSlide, theme: PptTheme, table: DefenseTable) {
  const headers = table.headers?.length
    ? table.headers.slice(0, MAX_TABLE_COLS)
    : ['Ukazovateľ', 'Hodnota'];

  const rows = table.rows?.length ? table.rows : [];

  const normalizedRows = rows.slice(0, MAX_TABLE_ROWS).map((row) => {
    const next = [...row.map((cell) => cleanInlineText(cell))];

    while (next.length < headers.length) next.push('');

    return next.slice(0, headers.length);
  });

  const data = [headers, ...normalizedRows];

  const tableData = data.map((row, rowIndex) =>
    row.map((cell) => ({
      text: cleanInlineText(cell),
      options: {
        bold: rowIndex === 0,
        color: rowIndex === 0 ? 'FFFFFF' : theme.text,
        fill: {
          color:
            rowIndex === 0
              ? theme.accent
              : rowIndex % 2 === 0
                ? theme.card2
                : theme.card,
        },
        margin: 0.06,
        fontFace: 'Aptos',
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
    fontFace: 'Aptos',
    fontSize: 13,
    bold: true,
    color: theme.accent2,
    margin: 0,
  });

  try {
    slide.addTable(tableData as any, {
      x: 0.85,
      y: 2.18,
      w: 11.75,
      h: 4.05,
      border: { type: 'solid', color: theme.border, pt: 0.5 },
      margin: 0.05,
      fit: 'shrink',
    } as any);
  } catch {
    const fallback = [
      headers.join(' | '),
      ...normalizedRows.map((row) => row.join(' | ')),
    ].join('\n');

    slide.addText(fallback, {
      x: 0.9,
      y: 2.2,
      w: 11.6,
      h: 4.0,
      fontFace: 'Aptos',
      fontSize: 12,
      color: theme.text,
      fit: 'shrink',
      margin: 0.05,
      breakLine: false,
    });
  }
}

function addBarChart(
  slide: PptxSlide,
  theme: PptTheme,
  chart: DefenseChart,
) {
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
    fontFace: 'Aptos',
    fontSize: 13,
    bold: true,
    color: theme.accent2,
    margin: 0,
  });

  if (chart.type === 'column') {
    const chartX = 1.0;
    const chartY = 2.15;
    const chartW = 11.1;
    const chartH = 3.65;
    const gap = 0.18;
    const barW = (chartW - gap * (count - 1)) / Math.max(count, 1);

    for (let i = 0; i < count; i += 1) {
      const value = values[i];
      const ratio = clamp(value / maxValue, 0, 1);
      const h = Math.max(0.18, chartH * ratio);
      const x = chartX + i * (barW + gap);
      const y = chartY + chartH - h;

      slide.addShape(ShapeType.roundRect, {
        x,
        y,
        w: barW,
        h,
        rectRadius: 0.04,
        fill: { color: i % 2 === 0 ? theme.accent : theme.accent2 },
        line: { color: i % 2 === 0 ? theme.accent : theme.accent2 },
      } as any);

      slide.addText(`${value}${unit}`, {
        x,
        y: y - 0.28,
        w: barW,
        h: 0.18,
        fontFace: 'Aptos',
        fontSize: 8,
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
        fontFace: 'Aptos',
        fontSize: 7.5,
        color: theme.muted,
        fit: 'shrink',
        align: 'center',
        margin: 0,
      });
    }

    return;
  }

  const chartX = 1.05;
  const chartY = 2.22;
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
      fontFace: 'Aptos',
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
      rectRadius: 0.04,
      fill: { color: theme.card2 },
      line: { color: theme.border, transparency: 40 },
    } as any);

    slide.addShape(ShapeType.roundRect, {
      x: chartX + 3.05,
      y: y + 0.07,
      w: barW,
      h: rowH - 0.14,
      rectRadius: 0.04,
      fill: { color: i % 2 === 0 ? theme.accent : theme.accent2 },
      line: { color: i % 2 === 0 ? theme.accent : theme.accent2 },
    } as any);

    slide.addText(`${value}${unit}`, {
      x: Math.min(chartX + 3.18 + barW, 11.15),
      y,
      w: 1.05,
      h: rowH,
      fontFace: 'Aptos',
      fontSize: 10,
      bold: true,
      color: theme.text,
      fit: 'shrink',
      margin: 0,
      valign: 'middle',
    });
  }
}

function addImageSlide(
  slide: PptxSlide,
  theme: PptTheme,
  item: DefenseSlide,
) {
  const image = item.images?.[0];

  if (!image) {
    addBulletCards(
      slide,
      theme,
      item.bullets.length
        ? item.bullets
        : ['Vizuálnu prílohu je možné doplniť manuálne.'],
    );
    return;
  }

  slide.addShape(ShapeType.roundRect, {
    x: 0.85,
    y: 1.75,
    w: 11.75,
    h: 4.75,
    rectRadius: 0.08,
    fill: { color: theme.card },
    line: { color: theme.border, transparency: 25 },
  } as any);

  try {
    slide.addImage({
      ...(image.data ? { data: image.data } : { path: image.path }),
      x: 1.08,
      y: 1.98,
      w: 6.1,
      h: 4.25,
      sizing: {
        type: 'contain',
        x: 1.08,
        y: 1.98,
        w: 6.1,
        h: 4.25,
      },
    } as any);
  } catch {
    slide.addText('Obrázok sa nepodarilo vložiť automaticky.', {
      x: 1.08,
      y: 3.55,
      w: 6.1,
      h: 0.35,
      fontFace: 'Aptos',
      fontSize: 13,
      color: theme.muted,
      align: 'center',
      margin: 0,
    });
  }

  const bullets = item.bullets.slice(0, 4);

  slide.addText(image.title || 'Vizuálny podklad', {
    x: 7.45,
    y: 2.05,
    w: 4.7,
    h: 0.32,
    fontFace: 'Aptos',
    fontSize: 13,
    bold: true,
    color: theme.accent2,
    margin: 0,
  });

  slide.addText(
    (bullets.length
      ? bullets
      : ['Vizuál podporuje vysvetlenie výsledkov alebo metodiky.']
    )
      .map((bullet) => `• ${bullet}`)
      .join('\n'),
    {
      x: 7.45,
      y: 2.58,
      w: 4.7,
      h: 3.2,
      fontFace: 'Aptos',
      fontSize: 13,
      color: theme.text,
      fit: 'shrink',
      margin: 0.04,
      breakLine: false,
      paraSpaceAfter: 7,
    },
  );
}

function addQuoteSlide(
  slide: PptxSlide,
  theme: PptTheme,
  item: DefenseSlide,
) {
  const quote =
    item.bullets[0] || item.visualSuggestion || 'Kľúčové zistenie práce';

  slide.addShape(ShapeType.roundRect, {
    x: 1.15,
    y: 2.05,
    w: 11.0,
    h: 3.05,
    rectRadius: 0.08,
    fill: { color: theme.card },
    line: { color: theme.border, transparency: 25 },
  } as any);

  slide.addText('„', {
    x: 1.45,
    y: 1.8,
    w: 0.8,
    h: 0.7,
    fontFace: 'Georgia',
    fontSize: 54,
    color: theme.accent,
    margin: 0,
  });

  slide.addText(quote, {
    x: 2.1,
    y: 2.45,
    w: 9.35,
    h: 1.65,
    fontFace: 'Aptos Display',
    fontSize: quote.length > 120 ? 22 : 27,
    bold: true,
    color: theme.text,
    fit: 'shrink',
    margin: 0,
    breakLine: false,
    valign: 'middle',
  });

  if (item.bullets.length > 1) {
    slide.addText(
      item.bullets
        .slice(1, 4)
        .map((bullet) => `• ${bullet}`)
        .join('\n'),
      {
        x: 2.1,
        y: 4.55,
        w: 9.35,
        h: 1.05,
        fontFace: 'Aptos',
        fontSize: 13,
        color: theme.muted,
        fit: 'shrink',
        margin: 0,
        breakLine: false,
      },
    );
  }
}

function addVisualSuggestion(
  slide: PptxSlide,
  theme: PptTheme,
  suggestion?: string,
) {
  const clean = cleanInlineText(suggestion);

  if (!clean) return;

  slide.addShape(ShapeType.roundRect, {
    x: 0.85,
    y: 6.22,
    w: 11.75,
    h: 0.42,
    rectRadius: 0.05,
    fill: { color: theme.card2, transparency: theme.name === 'dark' ? 0 : 15 },
    line: { color: theme.border, transparency: 55 },
  } as any);

  slide.addText(`Vizuál: ${clean}`, {
    x: 1.05,
    y: 6.31,
    w: 11.35,
    h: 0.2,
    fontFace: 'Aptos',
    fontSize: 8,
    italic: true,
    color: theme.muted,
    fit: 'shrink',
    margin: 0,
  });
}

function addCoverSlide(
  pptxDoc: PptxGen,
  theme: PptTheme,
  title: string,
  defenseType: string,
) {
  const slide = pptxDoc.addSlide();

  addBackground(slide, theme);

  slide.addShape(ShapeType.roundRect, {
    x: 0.72,
    y: 0.55,
    w: 1.55,
    h: 0.42,
    rectRadius: 0.05,
    fill: { color: theme.accent },
    line: { color: theme.accent },
  } as any);

  slide.addText('ZEDPERA', {
    x: 0.88,
    y: 0.67,
    w: 1.25,
    h: 0.16,
    fontFace: 'Aptos',
    fontSize: 8,
    bold: true,
    color: 'FFFFFF',
    margin: 0,
    align: 'center',
  });

  slide.addText(defenseType.toUpperCase(), {
    x: 0.8,
    y: 1.52,
    w: 9.8,
    h: 0.32,
    fontFace: 'Aptos',
    fontSize: 11,
    bold: true,
    color: theme.accent2,
    margin: 0,
  });

  slide.addText(title, {
    x: 0.78,
    y: 2.05,
    w: 11.8,
    h: 1.75,
    fontFace: 'Aptos Display',
    fontSize: title.length > 90 ? 28 : 36,
    bold: true,
    color: theme.text,
    fit: 'shrink',
    margin: 0,
    breakLine: false,
  });

  slide.addText('Prezentácia na obhajobu záverečnej práce', {
    x: 0.82,
    y: 4.38,
    w: 10.5,
    h: 0.32,
    fontFace: 'Aptos',
    fontSize: 15,
    color: theme.muted,
    margin: 0,
  });

  slide.addShape(ShapeType.line, {
    x: 0.82,
    y: 5.05,
    w: 4.25,
    h: 0,
    line: { color: theme.accent, width: 2 },
  });

  slide.addText('Moderná akademická šablóna · pripravené pre komisiu', {
    x: 0.82,
    y: 6.78,
    w: 10.5,
    h: 0.25,
    fontFace: 'Aptos',
    fontSize: 9,
    color: theme.muted,
    margin: 0,
  });
}

function addAgendaSlide(pptxDoc: PptxGen, theme: PptTheme, agenda: string[]) {
  const slide = pptxDoc.addSlide();

  addBackground(slide, theme);
  addHeader(slide, theme, 'Obsah prezentácie', 'Agenda obhajoby');

  const left = agenda.slice(0, 5);
  const right = agenda.slice(5, 10);

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
        rectRadius: 0.05,
        fill: { color: globalIndex % 2 === 0 ? theme.accent2 : theme.accent },
        line: { color: globalIndex % 2 === 0 ? theme.accent2 : theme.accent },
      } as any);

      slide.addText(String(globalIndex), {
        x,
        y: y + 0.13,
        w: 0.5,
        h: 0.15,
        fontFace: 'Aptos',
        fontSize: 8,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        margin: 0,
      });

      slide.addText(item, {
        x: x + 0.72,
        y: y + 0.08,
        w: 4.85,
        h: 0.34,
        fontFace: 'Aptos',
        fontSize: 13,
        bold: true,
        color: theme.text,
        fit: 'shrink',
        margin: 0,
      });
    });
  });

  addFooter(slide, theme, 1);
}

function addContentSlide(
  pptxDoc: PptxGen,
  theme: PptTheme,
  item: DefenseSlide,
  slideNumber: number,
) {
  const slide = pptxDoc.addSlide();

  addBackground(slide, theme);
  addHeader(
    slide,
    theme,
    `Snímka ${slideNumber}`,
    item.title || `Snímka ${slideNumber}`,
  );

  if (item.layout === 'table' && item.table) {
    addTable(slide, theme, item.table);
  } else if (item.layout === 'chart' && item.chart) {
    addBarChart(slide, theme, item.chart);
  } else if (item.layout === 'image') {
    addImageSlide(slide, theme, item);
  } else if (item.layout === 'quote') {
    addQuoteSlide(slide, theme, item);
  } else if (item.layout === 'split') {
    addSplitSlide(slide, theme, item);
  } else if (item.layout === 'section') {
    addQuoteSlide(slide, theme, item);
  } else {
    addBulletCards(
      slide,
      theme,
      item.bullets.length
        ? item.bullets
        : ['Obsah snímky je potrebné doplniť podľa finálnej verzie práce.'],
    );
  }

  addVisualSuggestion(slide, theme, item.visualSuggestion);
  addSpeakerNotes(slide, item.speakerNotes);
  addFooter(slide, theme, slideNumber);
}

function addClosingSlide(pptxDoc: PptxGen, theme: PptTheme) {
  const slide = pptxDoc.addSlide();

  addBackground(slide, theme);

  slide.addText('Ďakujem za pozornosť', {
    x: 1.0,
    y: 2.25,
    w: 11.3,
    h: 0.8,
    fontFace: 'Aptos Display',
    fontSize: 40,
    bold: true,
    color: theme.text,
    align: 'center',
    margin: 0,
  });

  slide.addText('Priestor na otázky komisie', {
    x: 1.0,
    y: 3.25,
    w: 11.3,
    h: 0.35,
    fontFace: 'Aptos',
    fontSize: 16,
    color: theme.muted,
    align: 'center',
    margin: 0,
  });

  slide.addShape(ShapeType.line, {
    x: 4.55,
    y: 4.15,
    w: 4.2,
    h: 0,
    line: { color: theme.accent, width: 2 },
  });

  slide.addText('ZEDPERA', {
    x: 5.7,
    y: 6.78,
    w: 2.0,
    h: 0.25,
    fontFace: 'Aptos',
    fontSize: 10,
    bold: true,
    color: theme.accent,
    align: 'center',
    margin: 0,
  });
}

function enrichSlidesWithDetectedVisuals(
  slides: DefenseSlide[],
  sourceText: string,
): DefenseSlide[] {
  const text = truncate(sourceText);
  const markdownTables = extractMarkdownTables(text);
  const looseTables = extractLooseTables(text);
  const allTables = [...markdownTables, ...looseTables];
  const extractedChart = extractNumericChart(text);

  const hasTable = slides.some((slide) => slide.table || slide.layout === 'table');
  const hasChart = slides.some((slide) => slide.chart || slide.layout === 'chart');

  const enriched = slides.map((slide) => ({
    ...slide,
    bullets: slide.bullets.slice(0, MAX_BULLETS_PER_SLIDE),
  }));

  if (!hasChart && extractedChart && enriched.length > 0) {
    const targetIndex = enriched.findIndex((slide) =>
      /výsled|analýz|zisten|respond|dát|graf|štat|hypot/i.test(slide.title),
    );

    const index = targetIndex >= 0 ? targetIndex : Math.min(6, enriched.length - 1);

    enriched[index] = {
      ...enriched[index],
      layout: 'chart',
      chart: extractedChart,
      visualSuggestion:
        enriched[index].visualSuggestion ||
        'Doplniť jednoduchý graf k hlavným číselným výsledkom práce.',
    };
  }

  if (!hasTable && allTables.length > 0 && enriched.length > 0) {
    const targetIndex = enriched.findIndex((slide) =>
      /výsled|tabuľ|analýz|zisten|dát|prehľad|výskum/i.test(slide.title),
    );

    const index = targetIndex >= 0 ? targetIndex : Math.min(7, enriched.length - 1);

    if (enriched[index].layout !== 'chart') {
      enriched[index] = {
        ...enriched[index],
        layout: 'table',
        table: allTables[0],
        visualSuggestion:
          enriched[index].visualSuggestion ||
          'Zobraziť kľúčové výsledky formou prehľadnej tabuľky.',
      };
    } else if (enriched.length > index + 1) {
      enriched.splice(index + 1, 0, {
        title: allTables[0].title || 'Prehľad výsledkov',
        bullets: [
          'Tabuľka sumarizuje najdôležitejšie údaje využiteľné pri obhajobe.',
        ],
        layout: 'table',
        table: allTables[0],
        speakerNotes:
          'Tabuľku vysvetlite stručne a zdôraznite iba hlavný trend alebo rozdiel.',
      });
    }
  }

  return enriched.slice(0, MAX_EXPORTED_SLIDES);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DefensePptxRequestBody;

    const title = cleanInlineText(body.title || 'Obhajoba práce');
    const defenseType = cleanInlineText(body.defenseType || 'Obhajoba');
    const themeName = asThemeName(body.theme);
    const theme = THEMES[themeName];

    const sourceText = truncate(
      cleanText(
        body.sourceText ||
          body.extractedWorkText ||
          body.attachmentText ||
          body.text ||
          body.workTitle ||
          '',
      ),
    );

    const rawSlides = Array.isArray(body.slides) ? body.slides : [];

    let slides: DefenseSlide[] = rawSlides
      .map((slide: unknown, index: number): DefenseSlide =>
        normalizeSlide(slide, index),
      )
      .filter(
        (slide: DefenseSlide): boolean =>
          slide.title.length > 0 || slide.bullets.length > 0,
      )
      .slice(0, 16);

    if (!slides.length && sourceText) {
      slides = generateSlidesFromSource(sourceText, title);
    }

    if (!slides.length) {
      slides = generateSlidesFromSource('', title);
    }

    slides = enrichSlidesWithDetectedVisuals(slides, sourceText);

    if (!slides.length) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýbajú snímky na export.',
        },
        { status: 400 },
      );
    }

    const pptxDoc = new pptxgen();

    pptxDoc.layout = 'LAYOUT_WIDE';
    pptxDoc.author = 'ZEDPERA';
    pptxDoc.company = 'ZEDPERA';
    pptxDoc.subject = defenseType;
    pptxDoc.title = title;

    (pptxDoc as any).lang = 'sk-SK';

    pptxDoc.theme = {
      headFontFace: 'Aptos Display',
      bodyFontFace: 'Aptos',
      lang: 'sk-SK',
    } as any;

    addCoverSlide(pptxDoc, theme, title, defenseType);
    addAgendaSlide(pptxDoc, theme, buildAgenda(slides));

    slides.forEach((item: DefenseSlide, index: number) => {
      addContentSlide(pptxDoc, theme, item, index + 2);
    });

    addClosingSlide(pptxDoc, theme);

    const output = await (pptxDoc as any).write({
      outputType: 'nodebuffer',
    });

    const buffer = Buffer.isBuffer(output)
      ? output
      : output instanceof ArrayBuffer
        ? Buffer.from(output)
        : ArrayBuffer.isView(output)
          ? Buffer.from(output.buffer, output.byteOffset, output.byteLength)
          : Buffer.from(String(output || ''), 'binary');

    if (!buffer.length) {
      throw new Error('PPTX export vrátil prázdny súbor.');
    }

    const fileName = `${safeFileName(title)}.pptx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('PPTX_EXPORT_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa exportovať PowerPoint.',
      },
      { status: 500 },
    );
  }
}
