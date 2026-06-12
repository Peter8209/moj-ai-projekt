import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import {
  runFullStatisticalAnalysis,
  type AnalysisRow,
  type CombinedScaleDefinition,
  type ScaleDefinition,
  type StatisticalAnalysisResult,
} from '@/components/analysis/analysisStats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================= TYPES =================

type SavedProfile = {
  id?: string;
  title?: string;
  topic?: string;
  type?: string;
  field?: string;
  goal?: string;
  problem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;
  keywords?: string[];
  keywordsList?: string[];
};

type DataRow = Record<string, string | number | null>;

type TableColumn = {
  key: string;
  label: string;
};

type AnalysisTable = {
  title: string;
  description: string;
  columns: TableColumn[];
  rows: Record<string, string | number | null>[];
};

type RecommendedChart = {
  title: string;
  type: 'bar' | 'pie' | 'histogram' | 'boxplot' | 'scatter' | 'line';
  description: string;
  variables: string[];
  xKey?: string;
  yKey?: string;
  sourceTable?: string;
  data?: Record<string, string | number | null>[];
};

type HypothesisTest = {
  title: string;
  description: string;
  variables?: string[];
  test?: string;
  reason?: string;
};

type ComputedAnalysis = {
  dataDescription: string;
  variables: {
    name: string;
    type: 'numeric' | 'categorical';
    nonEmptyCount: number;
    emptyCount: number;
    uniqueCount: number;
  }[];
  descriptiveStatistics: AnalysisTable[];
  frequencies: AnalysisTable[];
  excelTables: AnalysisTable[];
  recommendedCharts: RecommendedChart[];
  hypothesisTests: HypothesisTest[];
  warnings: string[];
  extractedRows: number;
  extractedColumns: number;
  extractedFiles: string[];
  statisticalAnalysis: StatisticalAnalysisResult;
};

// ================= TEXT HELPERS =================

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function safeJsonParse<T>(value: FormDataEntryValue | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
  return fileName.slice(index).toLowerCase();
}

function getKeywords(profile: SavedProfile | null) {
  if (!profile) return 'nezadané';

  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length > 0) {
    return profile.keywordsList.join(', ');
  }

  if (Array.isArray(profile.keywords) && profile.keywords.length > 0) {
    return profile.keywords.join(', ');
  }

  return 'nezadané';
}

function extractJsonFromText(text: string) {
  const cleaned = cleanText(text);

  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

function round(value: number, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isEmptyValue(value: unknown) {
  return value === null || value === undefined || cleanText(value) === '';
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const text = cleanText(value)
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace('%', '');

  if (!text) return null;

  const number = Number(text);

  if (!Number.isFinite(number)) return null;

  return number;
}

function parseNumberFromFormData(value: FormDataEntryValue | null): number | undefined {
  const parsed = parseNumericValue(value);
  return parsed === null ? undefined : parsed;
}

function parseStringArrayFromFormData(value: FormDataEntryValue | null): string[] | undefined {
  if (!value) return undefined;

  const parsed = safeJsonParse<string[]>(value);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => cleanText(item)).filter(Boolean);
  }

  const text = cleanText(value);
  if (!text) return undefined;

  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function median(values: number[]) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function quantile(values: number[], q: number) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;

  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }

  return sorted[base];
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);

  return Math.sqrt(variance);
}

// ================= FILE EXTRACTION =================

function detectDelimiter(line: string) {
  const delimiters = [';', ',', '\t'];

  let bestDelimiter = ';';
  let bestCount = 0;

  for (const delimiter of delimiters) {
    const count = line.split(delimiter).length;

    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function splitCsvLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());

  return result;
}

function parseDelimitedTextToRows(text: string): DataRow[] {
  const cleaned = cleanText(text);
  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((header, index) => {
    const cleanedHeader = cleanText(header);
    return cleanedHeader || `Stĺpec ${index + 1}`;
  });

  const rows: DataRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, delimiter);

    const row: DataRow = {};

    headers.forEach((header, index) => {
      const rawValue = cells[index] ?? '';
      const numericValue = parseNumericValue(rawValue);

      row[header] =
        numericValue !== null && rawValue.trim() !== ''
          ? numericValue
          : cleanText(rawValue);
    });

    rows.push(row);
  }

  return rows;
}

async function readExcelRows(file: File): Promise<DataRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const XLSX = await import('xlsx');

  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const allRows: DataRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });

    for (const row of rows) {
      const normalizedRow: DataRow = {};

      for (const [key, value] of Object.entries(row)) {
        const header = cleanText(key);

        if (!header || header.startsWith('__EMPTY')) continue;

        const textValue = cleanText(value);
        const numericValue = parseNumericValue(textValue);

        normalizedRow[header] =
          numericValue !== null && textValue !== '' ? numericValue : textValue;
      }

      if (Object.keys(normalizedRow).length > 0) {
        allRows.push(normalizedRow);
      }
    }
  }

  return allRows;
}

async function readFileAsText(file: File) {
  const extension = getFileExtension(file.name);

  if (['.txt', '.csv', '.md', '.rtf'].includes(extension)) {
    try {
      return cleanText(await file.text());
    } catch {
      return '';
    }
  }

  if (['.xlsx', '.xls'].includes(extension)) {
    try {
      const rows = await readExcelRows(file);

      if (rows.length === 0) {
        return `Súbor "${file.name}" bol načítaný, ale neobsahuje čitateľné tabuľkové dáta.`;
      }

      const previewRows = rows.slice(0, 20);

      return cleanText(`
Súbor "${file.name}" bol načítaný ako Excel.
Počet načítaných riadkov: ${rows.length}
Počet stĺpcov: ${Object.keys(rows[0] || {}).length}

Ukážka dát:
${JSON.stringify(previewRows, null, 2)}
`);
    } catch (error) {
      return `Súbor "${file.name}" sa nepodarilo načítať ako Excel. Detail: ${
        error instanceof Error ? error.message : 'neznáma chyba'
      }`;
    }
  }

  if (['.pdf', '.docx', '.doc', '.pptx'].includes(extension)) {
    return `Súbor "${file.name}" bol priložený, ale tento endpoint spracúva štatisticky hlavne Excel/CSV/TXT dáta. Pre PDF/DOCX odporúčam najprv extrahovať text cez samostatný endpoint /api/extract-text.`;
  }

  return `Súbor "${file.name}" bol priložený.`;
}

async function extractRowsFromFile(file: File): Promise<DataRow[]> {
  const extension = getFileExtension(file.name);

  if (['.csv', '.txt'].includes(extension)) {
    const text = await file.text();
    return parseDelimitedTextToRows(text);
  }

  if (['.xlsx', '.xls'].includes(extension)) {
    return readExcelRows(file);
  }

  return [];
}

// ================= COMPUTED ANALYSIS =================

function getColumnNames(rows: DataRow[]) {
  const columnSet = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (cleanText(key)) columnSet.add(key);
    }
  }

  return Array.from(columnSet);
}

function detectVariableType(rows: DataRow[], column: string): 'numeric' | 'categorical' {
  const values = rows
    .map((row) => row[column])
    .filter((value) => !isEmptyValue(value));

  if (values.length === 0) return 'categorical';

  const numericCount = values.filter((value) => parseNumericValue(value) !== null).length;
  const numericRatio = numericCount / values.length;
  const uniqueCount = new Set(values.map((value) => cleanText(value))).size;

  if (numericRatio >= 0.8 && uniqueCount > 5) {
    return 'numeric';
  }

  return 'categorical';
}

function buildVariableSummary(rows: DataRow[]) {
  const columns = getColumnNames(rows);

  return columns.map((column) => {
    const values = rows.map((row) => row[column]);
    const nonEmptyValues = values.filter((value) => !isEmptyValue(value));
    const uniqueValues = new Set(nonEmptyValues.map((value) => cleanText(value)));

    return {
      name: column,
      type: detectVariableType(rows, column),
      nonEmptyCount: nonEmptyValues.length,
      emptyCount: values.length - nonEmptyValues.length,
      uniqueCount: uniqueValues.size,
    };
  });
}

function buildDescriptiveStatistics(rows: DataRow[]): AnalysisTable[] {
  const variables = buildVariableSummary(rows).filter(
    (variable) => variable.type === 'numeric',
  );

  if (variables.length === 0) return [];

  const tableRows = variables.map((variable) => {
    const values = rows
      .map((row) => parseNumericValue(row[variable.name]))
      .filter((value): value is number => value !== null);

    const sum = values.reduce((acc, value) => acc + value, 0);
    const mean = values.length > 0 ? sum / values.length : 0;

    return {
      variable: variable.name,
      n: values.length,
      missing: rows.length - values.length,
      mean: round(mean),
      median: round(median(values)),
      sd: round(standardDeviation(values)),
      min: values.length ? round(Math.min(...values)) : 0,
      q1: round(quantile(values, 0.25)),
      q3: round(quantile(values, 0.75)),
      max: values.length ? round(Math.max(...values)) : 0,
    };
  });

  return [
    {
      title: 'Deskriptívna štatistika položiek',
      description:
        'Základná deskriptívna štatistika pre číselné premenné/položky z dátového súboru.',
      columns: [
        { key: 'variable', label: 'Premenná' },
        { key: 'n', label: 'N' },
        { key: 'missing', label: 'Chýbajúce' },
        { key: 'mean', label: 'Priemer' },
        { key: 'median', label: 'Medián' },
        { key: 'sd', label: 'SD' },
        { key: 'min', label: 'Minimum' },
        { key: 'q1', label: 'Q1' },
        { key: 'q3', label: 'Q3' },
        { key: 'max', label: 'Maximum' },
      ],
      rows: tableRows,
    },
  ];
}

function buildFrequencyTables(rows: DataRow[]): AnalysisTable[] {
  const variables = buildVariableSummary(rows).filter(
    (variable) => variable.type === 'categorical',
  );

  return variables.map((variable) => {
    const values = rows.map((row) => row[variable.name]);
    const total = values.length;
    const validValues = values.filter((value) => !isEmptyValue(value));
    const validTotal = validValues.length;

    const counts = new Map<string, number>();

    for (const value of validValues) {
      const label = cleanText(value) || 'Nezadané';
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    const sortedEntries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

    let cumulativePercent = 0;

    const tableRows = sortedEntries.map(([value, count]) => {
      const percent = total > 0 ? (count / total) * 100 : 0;
      const validPercent = validTotal > 0 ? (count / validTotal) * 100 : 0;
      cumulativePercent += validPercent;

      return {
        value,
        frequency: count,
        percent: round(percent),
        validPercent: round(validPercent),
        cumulativePercent: round(cumulativePercent),
      };
    });

    if (total - validTotal > 0) {
      tableRows.push({
        value: 'Chýbajúce odpovede',
        frequency: total - validTotal,
        percent: round(((total - validTotal) / total) * 100),
        validPercent: 0,
        cumulativePercent: round(cumulativePercent),
      });
    }

    return {
      title: variable.name,
      description: `Frekvenčná tabuľka pre premennú/stĺpec „${variable.name}“.`,
      columns: [
        { key: 'value', label: variable.name },
        { key: 'frequency', label: 'Frekvencia' },
        { key: 'percent', label: 'Percent' },
        { key: 'validPercent', label: 'Validné percentá' },
        { key: 'cumulativePercent', label: 'Kumulatívne percentá' },
      ],
      rows: tableRows,
    };
  });
}

function buildRecommendedCharts(frequencies: AnalysisTable[]): RecommendedChart[] {
  return frequencies.map((table) => ({
    title: `Stĺpcový graf – ${table.title}`,
    type: 'bar',
    description: `Stĺpcový graf sa má generovať zo stĺpca Percent vo frekvenčnej tabuľke „${table.title}“.`,
    variables: [table.title],
    xKey: 'value',
    yKey: 'percent',
    sourceTable: table.title,
    data: table.rows.map((row) => ({
      value: row.value,
      percent: row.percent,
    })),
  }));
}

function buildHypothesisTests(rows: DataRow[], profile: SavedProfile | null): HypothesisTest[] {
  const variables = buildVariableSummary(rows);
  const numericVariables = variables.filter((variable) => variable.type === 'numeric');
  const categoricalVariables = variables.filter((variable) => variable.type === 'categorical');

  const tests: HypothesisTest[] = [];

  if (profile?.hypotheses || profile?.researchQuestions) {
    tests.push({
      title: 'Testovanie hypotéz podľa zadania práce',
      description:
        'Na základe uvedených hypotéz alebo výskumných otázok je potrebné zvoliť test podľa typu premenných.',
      variables: [],
      test: 'Výber podľa hypotézy',
      reason: cleanText(`${profile?.hypotheses || ''}\n${profile?.researchQuestions || ''}`),
    });
  }

  if (numericVariables.length >= 2) {
    tests.push({
      title: 'Vzťah medzi číselnými premennými',
      description:
        'Pre dvojice číselných premenných odporúčam korelačnú analýzu. Pri normálnom rozdelení Pearsonovu koreláciu, pri porušení normality Spearmanovu koreláciu.',
      variables: numericVariables.slice(0, 5).map((variable) => variable.name),
      test: 'Pearsonova alebo Spearmanova korelácia',
      reason: 'Používa sa na overenie vzťahu medzi dvomi číselnými premennými.',
    });
  }

  if (categoricalVariables.length >= 1 && numericVariables.length >= 1) {
    tests.push({
      title: 'Rozdiely v číselnej premennej podľa skupín',
      description:
        'Ak kategóriová premenná tvorí skupiny a číselná premenná je výsledok, odporúčam t-test pri dvoch skupinách, ANOVA pri troch a viacerých skupinách. Pri nenormálnom rozdelení Mann-Whitney alebo Kruskal-Wallis.',
      variables: [categoricalVariables[0].name, numericVariables[0].name],
      test: 't-test / ANOVA / Mann-Whitney / Kruskal-Wallis',
      reason: 'Používa sa na porovnanie priemerov alebo rozdelení medzi skupinami.',
    });
  }

  if (categoricalVariables.length >= 2) {
    tests.push({
      title: 'Vzťah medzi kategóriovými premennými',
      description:
        'Pre dve kategóriové premenné odporúčam chí-kvadrát test nezávislosti.',
      variables: categoricalVariables.slice(0, 2).map((variable) => variable.name),
      test: 'Chí-kvadrát test nezávislosti',
      reason: 'Používa sa na overenie súvislosti medzi dvomi kategóriovými premennými.',
    });
  }

  if (numericVariables.length >= 1) {
    tests.push({
      title: 'Overenie normality číselných premenných',
      description:
        'Pred výberom parametrických testov odporúčam overiť normalitu rozdelenia pomocou Shapiro-Wilkovho testu, histogramu a Q-Q grafu.',
      variables: numericVariables.map((variable) => variable.name),
      test: 'Shapiro-Wilkov test normality',
      reason: 'Výsledok normality pomáha rozhodnúť, či použiť parametrické alebo neparametrické testy.',
    });
  }

  if (tests.length === 0) {
    tests.push({
      title: 'Odporúčanie k hypotézam',
      description:
        'V nahraných dátach nie je dostatok štruktúrovaných premenných na automatické odporúčanie testov.',
      variables: [],
      test: 'Nie je možné určiť',
      reason: 'Chýbajú vhodné premenné alebo dáta.',
    });
  }

  return tests;
}

function toStatisticalRows(rows: DataRow[]): AnalysisRow[] {
  return rows.map((row) => {
    const output: AnalysisRow = {};

    Object.entries(row).forEach(([key, value]) => {
      output[key] = value;
    });

    return output;
  });
}

function buildStatisticalTables(statisticalAnalysis: StatisticalAnalysisResult): AnalysisTable[] {
  const frequencyTables: AnalysisTable[] = statisticalAnalysis.frequencies.map((table) => ({
    title: `Frekvencie – ${table.variable}`,
    description:
      'Frekvenčná tabuľka vypočítaná zo štatistického jadra vrátane percent, validných percent a kumulatívnych percent.',
    columns: [
      { key: 'value', label: 'Hodnota' },
      { key: 'count', label: 'Počet' },
      { key: 'percent', label: 'Percent' },
      { key: 'validPercent', label: 'Validné percento' },
      { key: 'cumulativePercent', label: 'Kumulatívne percento' },
    ],
    rows: table.values.map((row) => ({
      value: row.value,
      count: row.count,
      percent: row.percent,
      validPercent: row.validPercent,
      cumulativePercent: row.cumulativePercent,
    })),
  }));

  const scaleDescriptivesTable: AnalysisTable = {
    title: 'Deskriptívna štatistika škál a subškál',
    description:
      'JASP štýl tabuľky pre škály a subškály: Valid, Missing, Median, Mean, SD, Skewness, Kurtosis, Shapiro-Wilk, p-hodnota, Minimum a Maximum.',
    columns: [
      { key: 'variable', label: 'Škála / subškála' },
      { key: 'valid', label: 'Valid' },
      { key: 'missing', label: 'Missing' },
      { key: 'median', label: 'Median' },
      { key: 'mean', label: 'Mean' },
      { key: 'standardDeviation', label: 'Std. Deviation' },
      { key: 'skewness', label: 'Skewness' },
      { key: 'standardErrorSkewness', label: 'Std. Error of Skewness' },
      { key: 'kurtosis', label: 'Kurtosis' },
      { key: 'standardErrorKurtosis', label: 'Std. Error of Kurtosis' },
      { key: 'shapiroWilk', label: 'Shapiro-Wilk' },
      { key: 'pValueOfShapiroWilk', label: 'P-value of Shapiro-Wilk' },
      { key: 'minimum', label: 'Minimum' },
      { key: 'maximum', label: 'Maximum' },
    ],
    rows: statisticalAnalysis.scaleDescriptives.map((row) => {
      const normality = statisticalAnalysis.normality.find(
        (item) => item.variable === row.variable,
      );

      return {
        variable: row.variable,
        valid: row.valid,
        missing: row.missing,
        median: row.median,
        mean: row.mean,
        standardDeviation: row.standardDeviation,
        skewness: row.skewness,
        standardErrorSkewness: row.standardErrorSkewness,
        kurtosis: row.kurtosis,
        standardErrorKurtosis: row.standardErrorKurtosis,
        shapiroWilk: normality?.statistic ?? null,
        pValueOfShapiroWilk: normality?.pValue ?? null,
        minimum: row.minimum,
        maximum: row.maximum,
      };
    }),
  };

  const reliabilityTable: AnalysisTable = {
    title: 'Reliabilita škál – Cronbach alfa',
    description:
      'Reliabilita vypočítaná pre automaticky alebo manuálne rozpoznané škály a subškály.',
    columns: [
      { key: 'scaleName', label: 'Škála / subškála' },
      { key: 'validRows', label: 'Valid rows' },
      { key: 'cronbachAlpha', label: "Cronbach's alpha" },
      { key: 'interpretation', label: 'Interpretácia' },
    ],
    rows: statisticalAnalysis.reliability.map((row) => ({
      scaleName: row.scaleName,
      validRows: row.validRows,
      cronbachAlpha: row.cronbachAlpha,
      interpretation: row.interpretation,
    })),
  };

  const spearmanTable: AnalysisTable = {
    title: 'Spearmanove korelácie medzi škálami a subškálami',
    description:
      'Korelačná analýza medzi vypočítanými škálami/subškálami. Vhodné pre malé súbory a ordinálne alebo nenormálne dáta.',
    columns: [
      { key: 'variableA', label: 'Premenná 1' },
      { key: 'variableB', label: 'Premenná 2' },
      { key: 'rho', label: "Spearman's rho" },
      { key: 'pValue', label: 'p' },
      { key: 'significance', label: 'Signifikancia' },
      { key: 'fisherZ', label: "Effect size Fisher's z" },
      { key: 'standardError', label: 'SE Effect size' },
      { key: 'interpretation', label: 'Interpretácia' },
    ],
    rows: statisticalAnalysis.correlations.spearman.map((row) => ({
      variableA: row.variableA,
      variableB: row.variableB,
      rho: row.r,
      pValue: row.pValue,
      significance: row.significance,
      fisherZ: row.fisherZ,
      standardError: row.standardError,
      interpretation: row.interpretation,
    })),
  };

  const normalityTable: AnalysisTable = {
    title: 'Normalita dát',
    description:
      'Posúdenie normality škál a subškál a odporúčanie parametrických alebo neparametrických testov.',
    columns: [
      { key: 'variable', label: 'Premenná' },
      { key: 'valid', label: 'Valid' },
      { key: 'method', label: 'Metóda' },
      { key: 'statistic', label: 'Štatistika' },
      { key: 'pValue', label: 'p' },
      { key: 'isNormal', label: 'Normálne rozdelenie' },
      { key: 'recommendation', label: 'Odporúčanie' },
      { key: 'note', label: 'Poznámka' },
    ],
    rows: statisticalAnalysis.normality.map((row) => ({
      variable: row.variable,
      valid: row.valid,
      method: row.method,
      statistic: row.statistic,
      pValue: row.pValue,
      isNormal: row.isNormal === null ? null : row.isNormal ? 'Áno' : 'Nie',
      recommendation: row.recommendation,
      note: row.note,
    })),
  };

  const output: AnalysisTable[] = [
    ...frequencyTables,
  ];

  if (scaleDescriptivesTable.rows.length > 0) output.push(scaleDescriptivesTable);
  if (normalityTable.rows.length > 0) output.push(normalityTable);
  if (reliabilityTable.rows.length > 0) output.push(reliabilityTable);
  if (spearmanTable.rows.length > 0) output.push(spearmanTable);

  return output;
}

function buildExcelTables(
  descriptiveStatistics: AnalysisTable[],
  frequencies: AnalysisTable[],
  statisticalTables: AnalysisTable[],
) {
  return [
    ...descriptiveStatistics,
    ...frequencies,
    ...statisticalTables,
  ];
}

function buildComputedAnalysis({
  rows,
  files,
  dataDescription,
  profile,
  statisticalAnalysis,
}: {
  rows: DataRow[];
  files: File[];
  dataDescription: string;
  profile: SavedProfile | null;
  statisticalAnalysis: StatisticalAnalysisResult;
}): ComputedAnalysis {
  const warnings: string[] = [];

  if (rows.length === 0) {
    warnings.push(
      'Nepodarilo sa načítať tabuľkové dáta z Excel/CSV súboru. Deskriptívna a frekvenčná analýza bude iba odporúčaná, nie vypočítaná.',
    );
  }

  const variables = buildVariableSummary(rows);

  if (variables.length === 0) {
    warnings.push('Neboli identifikované žiadne premenné/stĺpce.');
  }

  if (statisticalAnalysis.meta.fallbackUsed) {
    warnings.push(
      'Neboli spoľahlivo rozpoznané škály/subškály. Systém preto použil numerické premenné ako náhradné skóre. Pre presné výsledky odporúčame zadať alebo overiť definície škál.',
    );
  }

  const descriptiveStatistics = buildDescriptiveStatistics(rows);
  const frequencies = buildFrequencyTables(rows);
  const statisticalTables = buildStatisticalTables(statisticalAnalysis);
  const recommendedCharts = buildRecommendedCharts(frequencies);
  const hypothesisTests = buildHypothesisTests(rows, profile);
  const excelTables = buildExcelTables(descriptiveStatistics, frequencies, statisticalTables);

  const extractedColumns = getColumnNames(rows).length;

  return {
    dataDescription:
      dataDescription ||
      (rows.length > 0
        ? `Bolo načítaných ${rows.length} riadkov a ${extractedColumns} stĺpcov.`
        : 'Dáta neboli načítané ako štruktúrovaná tabuľka.'),
    variables,
    descriptiveStatistics,
    frequencies,
    excelTables,
    recommendedCharts,
    hypothesisTests,
    warnings,
    extractedRows: rows.length,
    extractedColumns,
    extractedFiles: files.map((file) => file.name),
    statisticalAnalysis,
  };
}

// ================= RESPONSE HELPERS =================

function buildBaseResponse({
  title,
  summary,
  computed,
  practicalText,
  interpretation,
  extraWarnings = [],
}: {
  title: string;
  summary: string;
  computed: ComputedAnalysis;
  practicalText: string;
  interpretation: string;
  extraWarnings?: string[];
}) {
  const statisticalAnalysis = computed.statisticalAnalysis;

  return {
    ok: true,
    title,
    summary,
    dataDescription: computed.dataDescription,

    files: computed.extractedFiles.map((fileName) => ({
      fileName,
    })),
    extractedFiles: computed.extractedFiles,

    variables: computed.variables,
    selectedAnalyses: [
      {
        title: 'Frekvenčná analýza',
        description:
          'Pre položky a kategóriové premenné boli vypočítané frekvenčné tabuľky s percentami, validnými percentami a kumulatívnymi percentami.',
      },
      {
        title: 'Deskriptívna štatistika škál a subškál',
        description:
          'Pre škály a subškály boli vypočítané Valid, Missing, Median, Mean, SD, Skewness, Kurtosis, Shapiro-Wilk, p-hodnota, Minimum a Maximum.',
      },
      {
        title: 'Reliabilita a korelačná analýza',
        description:
          'Pre škály boli vypočítané Cronbachovo alfa a korelácie medzi škálami/subškálami.',
      },
    ],

    descriptiveStatistics: computed.descriptiveStatistics,
    frequencies: statisticalAnalysis.frequencies,
    frequencyTables: statisticalAnalysis.frequencies,

    itemDescriptives: statisticalAnalysis.itemDescriptives,
    scaleScores: statisticalAnalysis.scaleScores,
    scaleDescriptives: statisticalAnalysis.scaleDescriptives,
    normality: statisticalAnalysis.normality,

    pearsonCorrelations: statisticalAnalysis.correlations.pearson,
    spearmanCorrelations: statisticalAnalysis.correlations.spearman,
    recommendedCorrelations: statisticalAnalysis.correlations.recommended,

    reliability: statisticalAnalysis.reliability,

    parametricGroupTests: statisticalAnalysis.groupTests.parametric,
    nonParametricGroupTests: statisticalAnalysis.groupTests.nonParametric,
    recommendedGroupTests: statisticalAnalysis.groupTests.recommended,

    statisticalAnalysis,

    recommendedCharts: computed.recommendedCharts,
    excelTables: computed.excelTables,
    hypothesisTests: computed.hypothesisTests,
    recommendedTests: [
      ...computed.hypothesisTests,
      ...statisticalAnalysis.groupTests.recommended.map((test) => ({
        title: test.testType,
        description: test.recommendation,
        variables: [test.dependentVariable, test.groupVariable],
        test: test.testType,
        reason: test.significance,
      })),
    ],

    practicalText,
    interpretation,
    warnings: [...computed.warnings, ...extraWarnings],
    fullText: `${practicalText}\n\nInterpretácia:\n${interpretation}`,

    exportReady: {
      word: true,
      pdf: true,
      excel: true,
      tables: computed.excelTables,
      charts: computed.recommendedCharts,
    },

    meta: {
      ...statisticalAnalysis.meta,
      filesCount: computed.extractedFiles.length,
      extractedRows: computed.extractedRows,
      extractedColumns: computed.extractedColumns,
      extractedFiles: computed.extractedFiles,
      generatedAt: new Date().toISOString(),
    },
  };
}

function fallbackResult(fullText: string, computed: ComputedAnalysis) {
  return buildBaseResponse({
    title: 'Výsledky analýzy',
    summary:
      'Analýza bola vytvorená, ale odpoveď AI nebola v presnom JSON formáte. Zobrazujú sa vypočítané štatistické tabuľky.',
    computed,
    practicalText: fullText,
    interpretation: fullText,
    extraWarnings: [
      'AI výstup nebol v presnom JSON formáte. Skontroluj prompt alebo model.',
    ],
  });
}

function buildPrompt({
  profile,
  analysisGoal,
  dataDescription,
  filesBlock,
  computed,
}: {
  profile: SavedProfile | null;
  analysisGoal: string;
  dataDescription: string;
  filesBlock: string;
  computed: ComputedAnalysis;
}) {
  return `
Si profesionálny štatistik, metodológ výskumu a konzultant praktickej časti záverečných prác.

Tvojou úlohou je pripraviť presnú analýzu údajov pre praktickú časť práce.

DÔLEŽITÉ:
- Neignoruj vypočítané tabuľky.
- V odpovedi interpretuj najmä škály a subškály, nie iba jednotlivé položky.
- Ak je dostupná normalita, reliabilita, Spearmanova korelácia a testovanie rozdielov, opíš ich.
- Výstup musí byť v slovenčine.
- Výstup musí byť iba validný JSON bez markdown blokov.

PROFIL PRÁCE:
Názov: ${profile?.title || 'nezadané'}
Téma: ${profile?.topic || 'nezadané'}
Typ práce: ${profile?.type || 'nezadané'}
Odbor: ${profile?.field || 'nezadané'}
Cieľ práce: ${profile?.goal || 'nezadané'}
Výskumný problém: ${profile?.problem || 'nezadané'}
Metodológia: ${profile?.methodology || 'nezadané'}
Hypotézy: ${profile?.hypotheses || 'nezadané'}
Výskumné otázky: ${profile?.researchQuestions || 'nezadané'}
Praktická časť: ${profile?.practicalPart || 'nezadané'}
Citačná norma: ${profile?.citation || 'ISO 690'}
Jazyk práce: ${profile?.workLanguage || profile?.language || 'slovenčina'}
Kľúčové slová: ${getKeywords(profile)}

CIEĽ ANALÝZY OD POUŽÍVATEĽA:
${analysisGoal || 'Navrhni a priprav kompletnú analýzu do praktickej časti.'}

VLOŽENÝ TEXT / OPIS DÁT:
${dataDescription || 'Používateľ nevložil textový opis dát.'}

PRILOŽENÉ SÚBORY:
${filesBlock || 'Bez priložených súborov.'}

VYPOČÍTANÁ ANALÝZA Z DÁT:
${JSON.stringify(
  {
    dataDescription: computed.dataDescription,
    variables: computed.variables,
    statisticalAnalysis: computed.statisticalAnalysis,
    warnings: computed.warnings,
  },
  null,
  2,
)}

VRÁŤ PRESNE TÚTO JSON ŠTRUKTÚRU:

{
  "ok": true,
  "title": "Výsledky analýzy",
  "summary": "stručný súhrn analýzy",
  "practicalText": "súvislý text do praktickej časti práce",
  "interpretation": "interpretácia výsledkov",
  "warnings": [],
  "fullText": "kompletný slovný výstup"
}

PRAVIDLÁ:
- practicalText nesmie byť prázdny.
- interpretation nesmie byť prázdna.
- Neprepisuj vypočítané tabuľky, iba ich interpretuj.
- Uveď, že ID stĺpec bol vynechaný z výpočtov, ak bol rozpoznaný.
`.trim();
}

// ================= ROUTE =================

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const analysisGoal = cleanText(formData.get('analysisGoal'));
    const dataDescription = cleanText(formData.get('dataDescription'));
    const profile = safeJsonParse<SavedProfile>(formData.get('activeProfile'));

    const idColumn = cleanText(formData.get('idColumn')) || undefined;
    const alpha = parseNumberFromFormData(formData.get('alpha'));
    const groupColumns = parseStringArrayFromFormData(formData.get('groupColumns'));

    const scales =
      safeJsonParse<ScaleDefinition[]>(formData.get('scales')) || undefined;

    const combinedScales =
      safeJsonParse<CombinedScaleDefinition[]>(formData.get('combinedScales')) ||
      undefined;

    const files = formData
      .getAll('files')
      .filter((item): item is File => item instanceof File);

    const fileTexts: string[] = [];
    const extractedRows: DataRow[] = [];

    for (const file of files) {
      const text = await readFileAsText(file);
      const rows = await extractRowsFromFile(file);

      extractedRows.push(...rows);

      fileTexts.push(`
SÚBOR: ${file.name}
Typ: ${file.type || 'nezadané'}
Veľkosť: ${file.size}
Načítané riadky: ${rows.length}
Obsah:
${text || 'Text sa nepodarilo načítať.'}
`);
    }

    const filesBlock = fileTexts.join('\n\n------------------------------\n\n');

    if (!analysisGoal && !dataDescription && files.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Chýbajú dáta na analýzu. Vlož text, cieľ analýzy alebo prilož Excel/CSV súbor.',
        },
        { status: 400 },
      );
    }

    const statisticalRows = toStatisticalRows(extractedRows);

    const statisticalAnalysis = runFullStatisticalAnalysis(statisticalRows, {
      idColumn,
      scales,
      combinedScales,
      groupColumns,
      alpha,
      includeItemDescriptives: true,
      includeFrequencies: true,
      autoDetectScales: true,
      fallbackToNumericVariables: true,
    });

    const computed = buildComputedAnalysis({
      rows: extractedRows,
      files,
      dataDescription,
      profile,
      statisticalAnalysis,
    });

    const defaultPracticalText =
      'Na základe analyzovaných údajov bola pripravená štruktúra praktickej časti. V praktickej časti je vhodné najskôr opísať výskumnú vzorku, následne uviesť frekvenčné tabuľky pre dotazníkové položky, potom deskriptívnu štatistiku škál a subškál, kontrolu normality, reliabilitu škál a korelačnú alebo skupinovú analýzu podľa výskumných otázok. ID stĺpec sa nepoužíva v štatistických výpočtoch, ale slúži iba na identifikáciu respondentov a určenie veľkosti výskumnej vzorky.';

    const defaultInterpretation =
      'Výsledky je potrebné interpretovať podľa vypočítaných tabuliek. Frekvenčné tabuľky ukazujú rozdelenie odpovedí respondentov. Deskriptívna štatistika škál a subškál uvádza počet platných odpovedí, chýbajúce hodnoty, medián, priemer, smerodajnú odchýlku, šikmosť, špicatosť, orientačný test normality, minimum a maximum. Reliabilita pomocou Cronbachovho alfa hodnotí vnútornú konzistenciu škál. Spearmanove korelácie sú vhodné najmä pri menšom súbore, ordinálnych dátach alebo pri nenormálnom rozdelení škál.';

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        buildBaseResponse({
          title: 'Výsledky analýzy',
          summary:
            'Analýza bola vypočítaná zo súboru. AI interpretácia nebola doplnená, pretože chýba OPENAI_API_KEY.',
          computed,
          practicalText: defaultPracticalText,
          interpretation: defaultInterpretation,
          extraWarnings: [],
        }),
      );
    }

    const prompt = buildPrompt({
      profile,
      analysisGoal,
      dataDescription,
      filesBlock,
      computed,
    });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.2,
      response_format: {
        type: 'json_object',
      },
      messages: [
        {
          role: 'system',
          content:
            'Si štatistik a metodológ. Vždy vraciaš iba validný JSON bez markdownu. Nikdy nenechaj prázdne interpretation ani practicalText.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '';

    if (!raw.trim()) {
      return NextResponse.json(
        buildBaseResponse({
          title: 'Výsledky analýzy',
          summary:
            'Analýza bola vypočítaná, ale AI nevrátila slovnú interpretáciu.',
          computed,
          practicalText: defaultPracticalText,
          interpretation: defaultInterpretation,
          extraWarnings: ['AI nevrátila výsledok analýzy.'],
        }),
      );
    }

    const jsonText = extractJsonFromText(raw);

    try {
      const parsed = JSON.parse(jsonText);

      const practicalText =
        cleanText(parsed.practicalText) || defaultPracticalText;

      const interpretation =
        cleanText(parsed.interpretation) || defaultInterpretation;

      return NextResponse.json({
        ...buildBaseResponse({
          title: parsed.title || 'Výsledky analýzy',
          summary:
            parsed.summary ||
            'Analýza obsahuje frekvenčné tabuľky, deskriptívnu štatistiku škál a subškál, normalitu, reliabilitu, korelácie a odporúčané testy.',
          computed,
          practicalText,
          interpretation,
          extraWarnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        }),
        fullText:
          cleanText(parsed.fullText) ||
          `${practicalText}\n\nInterpretácia:\n${interpretation}`,
      });
    } catch {
      return NextResponse.json(fallbackResult(raw, computed));
    }
  } catch (error) {
    console.error('ANALYZE_DATA_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa vykonať analýzu dát.',
      },
      { status: 500 },
    );
  }
}