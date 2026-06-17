import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import { runFullStatisticalAnalysis } from '@/components/analysis/analysisStats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type RowValue = string | number | boolean | null;
type DataRow = Record<string, RowValue>;
type AnyRecord = Record<string, unknown>;

const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function createJsonResponse(payload: AnyRecord, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function isExcelFileName(fileName: string): boolean {
  return /\.(xlsx|xls|xlsm)$/i.test(fileName);
}

function isCsvFileName(fileName: string): boolean {
  return /\.csv$/i.test(fileName);
}

function isEmptyCell(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

function normalizeCellValue(value: unknown): RowValue {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const numericText = text.replace(/\s/g, '').replace(',', '.');
  const numericValue = Number(numericText);

  if (
    numericText !== '' &&
    Number.isFinite(numericValue) &&
    /^-?\d+(\.\d+)?$/.test(numericText)
  ) {
    return numericValue;
  }

  return text;
}

function getUploadedFiles(formData: FormData): File[] {
  const files: File[] = [];

  const directFile = formData.get('file');

  if (directFile instanceof File) {
    files.push(directFile);
  }

  const directFiles = formData.getAll('files');

  directFiles.forEach((value) => {
    if (value instanceof File) {
      files.push(value);
    }
  });

  for (const [, value] of formData.entries()) {
    if (value instanceof File && !files.includes(value)) {
      files.push(value);
    }
  }

  return files;
}

async function readWorkbookFromFile(file: File): Promise<XLSX.WorkBook> {
  const fileName = file.name || 'uploaded-file';

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Súbor je príliš veľký. Maximálna veľkosť je ${MAX_FILE_SIZE_MB} MB.`,
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (isCsvFileName(fileName)) {
    const text = buffer.toString('utf8');

    return XLSX.read(text, {
      type: 'string',
      raw: false,
    });
  }

  if (isExcelFileName(fileName)) {
    return XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      raw: false,
    });
  }

  throw new Error(
    'Nepodporovaný typ súboru. Nahrajte súbor .xlsx, .xls, .xlsm alebo .csv.',
  );
}

function selectWorksheet(workbook: XLSX.WorkBook): {
  sheetName: string;
  rows: unknown[][];
} {
  const preferredSheetName = workbook.SheetNames.includes('DATA_CLEAN')
    ? 'DATA_CLEAN'
    : workbook.SheetNames.includes('Data_Clean')
      ? 'Data_Clean'
      : workbook.SheetNames[0];

  if (!preferredSheetName) {
    return {
      sheetName: '',
      rows: [],
    };
  }

  const worksheet = workbook.Sheets[preferredSheetName];

  if (!worksheet) {
    return {
      sheetName: preferredSheetName,
      rows: [],
    };
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  return {
    sheetName: preferredSheetName,
    rows,
  };
}

function detectHeaderRow(rows: unknown[][]): number {
  const maxRowsToScan = Math.min(rows.length, 15);

  let bestIndex = 0;
  let bestScore = -1;

  for (let rowIndex = 0; rowIndex < maxRowsToScan; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];

    const nonEmptyCount = row.filter((cell) => !isEmptyCell(cell)).length;

    const textCount = row.filter((cell) => {
      if (isEmptyCell(cell)) {
        return false;
      }

      return Number.isNaN(Number(String(cell).replace(',', '.')));
    }).length;

    const score = nonEmptyCount + textCount * 2;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
    }
  }

  return bestIndex;
}

function createHeaders(rawHeaders: unknown[]): string[] {
  const used = new Map<string, number>();

  return rawHeaders.map((header, index) => {
    const baseName =
      String(header ?? '').trim() ||
      `STLPEC_${index + 1}`;

    const normalized = baseName
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    const safeName = normalized || `STLPEC_${index + 1}`;
    const previousCount = used.get(safeName) ?? 0;

    used.set(safeName, previousCount + 1);

    return previousCount === 0
      ? safeName
      : `${safeName}_${previousCount + 1}`;
  });
}

function rowsToObjects(rows: unknown[][]): {
  rows: DataRow[];
  headers: string[];
  headerRowIndex: number;
} {
  if (!rows.length) {
    return {
      rows: [],
      headers: [],
      headerRowIndex: 0,
    };
  }

  const headerRowIndex = detectHeaderRow(rows);
  const rawHeaders = rows[headerRowIndex] ?? [];
  const headers = createHeaders(rawHeaders);
  const bodyRows = rows.slice(headerRowIndex + 1);

  const dataRows: DataRow[] = [];

  bodyRows.forEach((row) => {
    const output: DataRow = {};
    let nonEmptyCount = 0;

    headers.forEach((header, index) => {
      const value = normalizeCellValue(row[index]);

      if (!isEmptyCell(value)) {
        nonEmptyCount += 1;
      }

      output[header] = value;
    });

    if (nonEmptyCount > 0) {
      dataRows.push(output);
    }
  });

  return {
    rows: dataRows,
    headers,
    headerRowIndex,
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecordArray(value: unknown): AnyRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is AnyRecord => {
        return Boolean(item) && typeof item === 'object' && !Array.isArray(item);
      })
    : [];
}

function getNestedValue(source: unknown, path: string[]): unknown {
  let current = source;

  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = (current as AnyRecord)[key];
  }

  return current;
}

function normalizeRecommendedCharts(stats: AnyRecord): AnyRecord[] {
  const existing = asRecordArray((stats as AnyRecord).recommendedCharts);

  if (existing.length > 0) {
    return existing;
  }

  const chartData =
    getNestedValue(stats, ['chartData']) ||
    getNestedValue(stats, ['statisticalAnalysis', 'chartData']);

  if (!chartData || typeof chartData !== 'object') {
    return [];
  }

  const rows: AnyRecord[] = [];

  Object.entries(chartData as AnyRecord).forEach(([key, value]) => {
    const items = asRecordArray(value);

    if (!items.length) {
      return;
    }

    rows.push({
      title: key,
      type: 'bar',
      variables: items
        .map((item) => item.label)
        .filter(Boolean)
        .slice(0, 10),
      description: `Grafová sekcia ${key} obsahuje ${items.length} položiek.`,
      reason: 'Dáta boli vytvorené automaticky zo štatistickej analýzy.',
    });
  });

  return rows;
}

function normalizeRecommendedTests(stats: AnyRecord): AnyRecord[] {
  const correlations = asRecordArray(
    getNestedValue(stats, ['correlations', 'recommended']),
  );

  const groupTests = asRecordArray(
    getNestedValue(stats, ['groupTests', 'recommended']),
  );

  const correlationRows = correlations.map((item) => ({
    title: `${item.method || 'Korelácia'}: ${item.variableA || ''} × ${
      item.variableB || ''
    }`,
    test: item.method || 'correlation',
    variables: [item.variableA, item.variableB].filter(Boolean),
    pValue: item.pValue ?? item.p,
    result: item.interpretation || item.significance || '',
    reason: 'Odporúčané podľa normality dát.',
  }));

  const groupRows = groupTests.map((item) => ({
    title: `${item.testType || 'Test'}: ${item.dependentVariable || ''} podľa ${
      item.groupVariable || ''
    }`,
    test: item.testType || 'group-test',
    variables: [item.dependentVariable, item.groupVariable].filter(Boolean),
    pValue: item.pValue ?? item.p,
    result: item.recommendation || item.significance || '',
    reason: 'Odporúčané podľa počtu skupín a normality dát.',
  }));

  return [...correlationRows, ...groupRows];
}

function createExcelTables(stats: AnyRecord): AnyRecord[] {
  const chartTables = asRecordArray(stats.chartTables);

  if (chartTables.length > 0) {
    return chartTables;
  }

  return [
    {
      key: 'frequencies',
      title: 'Frekvenčné tabuľky',
      rows: asArray(stats.frequencies),
    },
    {
      key: 'descriptives',
      title: 'Deskriptívna štatistika',
      rows: [
        ...asArray(stats.itemDescriptives),
        ...asArray(stats.scaleDescriptives),
      ],
    },
    {
      key: 'reliability',
      title: 'Reliabilita',
      rows: asArray(stats.reliability),
    },
    {
      key: 'normality',
      title: 'Normalita',
      rows: asArray(stats.normality),
    },
  ];
}

export async function GET() {
  return createJsonResponse(
    {
      ok: false,
      route: '/api/analyze-data',
      message: 'Endpoint /api/analyze-data používa metódu POST.',
      error: 'Použite POST s FormData a priloženým súborom.',
    },
    405,
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = getUploadedFiles(formData);

    if (!files.length) {
      return createJsonResponse(
        {
          ok: false,
          title: 'Analýza dát',
          summary: '',
          dataDescription: '',
          warnings: ['Nebol nahratý žiadny súbor.'],
          variables: [],
          frequencies: [],
          descriptiveStatistics: [],
          recommendedTests: [],
          recommendedCharts: [],
          hypothesisTests: [],
          excelTables: [],
          practicalText: '',
          interpretation: '',
          fullText: '',
          error: 'Chýba súbor v poli file alebo files.',
        },
        400,
      );
    }

    const file = files[0];
    const workbook = await readWorkbookFromFile(file);
    const selected = selectWorksheet(workbook);

    if (!selected.rows.length) {
      return createJsonResponse(
        {
          ok: false,
          title: 'Analýza dát',
          summary: '',
          dataDescription: '',
          warnings: ['Súbor neobsahuje žiadne čitateľné dáta.'],
          variables: [],
          frequencies: [],
          descriptiveStatistics: [],
          recommendedTests: [],
          recommendedCharts: [],
          hypothesisTests: [],
          excelTables: [],
          practicalText: '',
          interpretation: '',
          fullText: '',
          error: 'Prvý alebo vybraný hárok je prázdny.',
        },
        400,
      );
    }

    const parsed = rowsToObjects(selected.rows);

    if (!parsed.rows.length) {
      return createJsonResponse(
        {
          ok: false,
          title: 'Analýza dát',
          summary: '',
          dataDescription: '',
          warnings: ['Nepodarilo sa vytvoriť dátové riadky z nahratého súboru.'],
          variables: [],
          frequencies: [],
          descriptiveStatistics: [],
          recommendedTests: [],
          recommendedCharts: [],
          hypothesisTests: [],
          excelTables: [],
          practicalText: '',
          interpretation: '',
          fullText: '',
          error: 'Dátové riadky sú prázdne.',
        },
        400,
      );
    }

    const runStats = runFullStatisticalAnalysis as unknown as (
      rows: AnyRecord[],
      options?: AnyRecord,
    ) => AnyRecord;

    const stats = runStats(parsed.rows as AnyRecord[], {
      autoDetectScales: true,
      fallbackToNumericVariables: true,
      autoDetectGroupColumns: true,
      includeFrequencies: true,
      includeItemDescriptives: true,
      alpha: 0.05,
    });

    const recommendedCharts = normalizeRecommendedCharts(stats);
    const recommendedTests = normalizeRecommendedTests(stats);
    const excelTables = createExcelTables(stats);

    const descriptiveStatistics = [
      ...asArray(stats.itemDescriptives),
      ...asArray(stats.scaleDescriptives),
    ];

    const warnings = [
      ...asArray(stats.warnings).map((item) => String(item)),
    ];

    const respondentCount =
      Number(getNestedValue(stats, ['meta', 'respondentCount'])) ||
      parsed.rows.length;

    const title = 'Výsledky analýzy dát';

    const summary = `Analýza bola spracovaná na súbore ${file.name}. Bolo načítaných ${parsed.rows.length} riadkov a ${parsed.headers.length} premenných.`;

    const dataDescription =
      `Použitý hárok: ${selected.sheetName || 'nezistený'}. ` +
      `Riadok hlavičky: ${parsed.headerRowIndex + 1}. ` +
      `Počet respondentov / záznamov: ${respondentCount}.`;

    const practicalText =
      'Dáta boli pripravené na frekvenčnú analýzu, deskriptívnu štatistiku, kontrolu normality, reliabilitu, korelácie a testovanie rozdielov medzi skupinami. Výsledky je možné použiť v praktickej časti práce.';

    const interpretation =
      'Interpretácia výsledkov musí vychádzať z charakteru premenných, normality dát a zvolených štatistických testov. Pri nenormálnom rozdelení dát je vhodné uprednostniť neparametrické testy a Spearmanovu koreláciu.';

    const fullText = [
      title,
      '',
      summary,
      '',
      dataDescription,
      '',
      practicalText,
      '',
      interpretation,
    ].join('\n');

    return createJsonResponse({
      ok: true,
      title,
      summary,
      dataDescription,
      warnings,

      variables: asArray(getNestedValue(stats, ['aliases', 'variables'])),
      frequencies: asArray(stats.frequencies),
      descriptiveStatistics,
      recommendedTests,
      recommendedCharts,
      hypothesisTests: asArray(getNestedValue(stats, ['groupTests', 'recommended'])),
      excelTables,

      practicalText,
      interpretation,
      fullText,

      statisticalAnalysis: stats,
      chartData: stats.chartData || {},
      chartTables: stats.chartTables || [],
      scaleScores: asArray(stats.scaleScores),
      scaleDescriptives: asArray(stats.scaleDescriptives),
      normality: asArray(stats.normality),
      correlations: stats.correlations || {},
      reliability: asArray(stats.reliability),
      groupTests: stats.groupTests || {},
      correlationMatrix: asArray(stats.correlationMatrix),
      scaleDefinitions: asArray(stats.scaleDefinitions),
      combinedScaleDefinitions: asArray(stats.combinedScaleDefinitions),
      scaleScoreRows: asArray(stats.scaleScoreRows),
      aliases: stats.aliases || {},

      meta: {
        filesCount: files.length,
        extractedChars: 0,
        generatedAt: new Date().toISOString(),
        source: file.name,
        sheetName: selected.sheetName,
        rows: parsed.rows.length,
        columns: parsed.headers.length,
        respondentCount,
      },

      preparedFile: {
        fileName: file.name,
        rows: parsed.rows.length,
        columns: parsed.headers.length,
        warnings,
        qualityReport: [],
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Neznáma chyba pri analýze dát.';

    console.error('[api/analyze-data] Chyba:', error);

    return createJsonResponse(
      {
        ok: false,
        title: 'Analýza dát',
        summary: '',
        dataDescription: '',
        warnings: [message],
        variables: [],
        frequencies: [],
        descriptiveStatistics: [],
        recommendedTests: [],
        recommendedCharts: [],
        hypothesisTests: [],
        excelTables: [],
        practicalText: '',
        interpretation: '',
        fullText: '',
        message: 'Analýza dát zlyhala.',
        error: message,
        meta: {
          filesCount: 0,
          extractedChars: 0,
          generatedAt: new Date().toISOString(),
        },
      },
      500,
    );
  }
}

export async function PUT() {
  return createJsonResponse(
    {
      ok: false,
      route: '/api/analyze-data',
      message: 'Metóda PUT nie je podporovaná.',
      error: 'Použite POST.',
    },
    405,
  );
}

export async function PATCH() {
  return createJsonResponse(
    {
      ok: false,
      route: '/api/analyze-data',
      message: 'Metóda PATCH nie je podporovaná.',
      error: 'Použite POST.',
    },
    405,
  );
}

export async function DELETE() {
  return createJsonResponse(
    {
      ok: false,
      route: '/api/analyze-data',
      message: 'Metóda DELETE nie je podporovaná.',
      error: 'Použite POST.',
    },
    405,
  );
}