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
export const maxDuration = 120;

type DataRow = Record<string, string | number | null>;
type AnyRecord = Record<string, any>;

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

type TableColumn = {
  key: string;
  label: string;
};

type AnalysisTable = {
  title: string;
  description?: string;
  columns: TableColumn[];
  rows: AnyRecord[];
  sheetName?: string;
};

type ExportFormat = 'excel' | 'xls' | 'word' | 'doc' | 'pdf';

function getEnv(name: string) {
  return String(process.env[name] || '').trim();
}

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

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
  return fileName.slice(index).toLowerCase();
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const text = cleanText(value)
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace('%', '');

  if (!text) return null;

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function round(value: number | null | undefined, digits = 3) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isEmptyValue(value: unknown) {
  return value === null || value === undefined || cleanText(value) === '';
}

function normalizePValue(value: unknown) {
  const parsed = parseNumericValue(value);
  if (parsed === null) return null;
  if (parsed < 0.001) return '< .001';
  return parsed.toFixed(3);
}

function formatJaspNumber(value: unknown, digits = 3) {
  const parsed = parseNumericValue(value);
  if (parsed === null) return null;
  return parsed.toFixed(digits);
}

function formatJaspCount(value: unknown) {
  const parsed = parseNumericValue(value);
  if (parsed === null) return null;
  return Math.round(parsed);
}

function normalizeAlpha(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 0.05;
  if (value <= 0 || value >= 1) return 0.05;
  return value;
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
  if (sorted.length % 2 === 0) return (sorted[middle - 1] + sorted[middle]) / 2;
  return sorted[middle];
}

function quantile(values: number[], q: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function isLikelyIdColumnName(column: string) {
  const normalized = cleanText(column).toLowerCase();
  return (
    normalized === 'id' ||
    normalized === 'respondent id' ||
    normalized === 'respondent_id' ||
    normalized === 'respondent' ||
    normalized === 'číslo' ||
    normalized === 'cislo' ||
    normalized === 'poradie' ||
    normalized === 'por. č.' ||
    normalized === 'por. c.' ||
    normalized.includes('identifikátor') ||
    normalized.includes('identifikator')
  );
}

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
  const headers = splitCsvLine(lines[0], delimiter).map((header, index) => cleanText(header) || `Stĺpec ${index + 1}`);

  const rows: DataRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, delimiter);
    const row: DataRow = {};

    headers.forEach((header, index) => {
      const rawValue = cells[index] ?? '';
      const numericValue = parseNumericValue(rawValue);
      row[header] = numericValue !== null && rawValue.trim() !== '' ? numericValue : cleanText(rawValue);
    });

    rows.push(row);
  }

  return rows;
}

async function readExcelRows(file: File): Promise<DataRow[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
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
        normalizedRow[header] = numericValue !== null && textValue !== '' ? numericValue : textValue;
      }

      if (Object.keys(normalizedRow).length > 0) allRows.push(normalizedRow);
    }
  }

  return allRows;
}

async function extractRowsFromFile(file: File): Promise<DataRow[]> {
  const extension = getFileExtension(file.name);
  if (['.csv', '.txt'].includes(extension)) return parseDelimitedTextToRows(await file.text());
  if (['.xlsx', '.xls'].includes(extension)) return readExcelRows(file);
  return [];
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
      return cleanText(`Súbor "${file.name}" bol načítaný ako Excel.\nPočet načítaných riadkov: ${rows.length}\nPočet stĺpcov: ${Object.keys(rows[0] || {}).length}\n\nUkážka dát:\n${JSON.stringify(rows.slice(0, 20), null, 2)}`);
    } catch (error) {
      return `Súbor "${file.name}" sa nepodarilo načítať ako Excel. Detail: ${error instanceof Error ? error.message : 'neznáma chyba'}`;
    }
  }

  return `Súbor "${file.name}" bol priložený.`;
}

function getColumnNames(rows: DataRow[]) {
  const columnSet = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((key) => {
      if (cleanText(key)) columnSet.add(key);
    });
  }
  return Array.from(columnSet);
}

function detectVariableType(rows: DataRow[], column: string): 'numeric' | 'categorical' {
  const values = rows.map((row) => row[column]).filter((value) => !isEmptyValue(value));
  if (values.length === 0) return 'categorical';
  const numericCount = values.filter((value) => parseNumericValue(value) !== null).length;
  const numericRatio = numericCount / values.length;
  if (numericRatio >= 0.8) return 'numeric';
  return 'categorical';
}

function buildVariableSummary(rows: DataRow[]) {
  return getColumnNames(rows).map((column) => {
    const values = rows.map((row) => row[column]);
    const nonEmptyValues = values.filter((value) => !isEmptyValue(value));
    const uniqueValues = new Set(nonEmptyValues.map((value) => cleanText(value)));

    return {
      name: column,
      type: detectVariableType(rows, column),
      nonEmptyCount: nonEmptyValues.length,
      emptyCount: values.length - nonEmptyValues.length,
      uniqueCount: uniqueValues.size,
      ignored: isLikelyIdColumnName(column),
    };
  });
}

function buildDescriptiveStatistics(rows: DataRow[]): AnalysisTable[] {
  const variables = buildVariableSummary(rows).filter((variable) => variable.type === 'numeric' && !isLikelyIdColumnName(variable.name));
  if (!variables.length) return [];

  const tableRows = variables.map((variable) => {
    const values = rows.map((row) => parseNumericValue(row[variable.name])).filter((value): value is number => value !== null);
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
      description: 'Základná deskriptívna štatistika pre číselné premenné/položky z dátového súboru.',
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
      sheetName: 'Deskriptiva poloziek',
    },
  ];
}

function compareFrequencyLabels(a: string, b: string) {
  const aNumber = parseNumericValue(a);
  const bNumber = parseNumericValue(b);
  if (aNumber !== null && bNumber !== null) return aNumber - bNumber;
  return a.localeCompare(b, 'sk', { numeric: true, sensitivity: 'base' });
}

function buildFrequencyTables(rows: DataRow[]): AnalysisTable[] {
  const variables = buildVariableSummary(rows).filter(
    (variable) =>
      !isLikelyIdColumnName(variable.name) &&
      (variable.type === 'categorical' || (variable.type === 'numeric' && variable.uniqueCount <= 20)),
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

    let cumulativePercent = 0;

    const tableRows = Array.from(counts.entries())
      .sort((a, b) => compareFrequencyLabels(a[0], b[0]))
      .map(([value, count]) => {
        const percent = total > 0 ? (count / total) * 100 : 0;
        const validPercent = validTotal > 0 ? (count / validTotal) * 100 : 0;
        cumulativePercent += validPercent;
        return {
          value,
          frequency: count,
          count,
          percent: round(percent),
          percentage: round(percent),
          validPercent: round(validPercent),
          cumulativePercent: round(cumulativePercent),
        };
      });

    const missing = total - validTotal;
    if (missing > 0) {
      tableRows.push({
        value: 'Missing',
        frequency: missing,
        count: missing,
        percent: round((missing / total) * 100),
        percentage: round((missing / total) * 100),
        validPercent: null,
        cumulativePercent: null,
      });
    }

    tableRows.push({
      value: 'Total',
      frequency: total,
      count: total,
      percent: 100,
      percentage: 100,
      validPercent: null,
      cumulativePercent: null,
    });

    return {
      title: `Frequencies for ${variable.name}`,
      description: `Frekvenčná tabuľka pre premennú/stĺpec "${variable.name}".`,
      columns: [
        { key: 'value', label: variable.name },
        { key: 'frequency', label: 'Frequency' },
        { key: 'percent', label: 'Percent' },
        { key: 'validPercent', label: 'Valid Percent' },
        { key: 'cumulativePercent', label: 'Cumulative Percent' },
      ],
      rows: tableRows,
      sheetName: `Frekv ${variable.name}`,
    };
  });
}

function resolveEffectiveIdColumn(rows: DataRow[], requestedIdColumn?: string) {
  if (requestedIdColumn && getColumnNames(rows).includes(requestedIdColumn)) return requestedIdColumn;
  const columns = getColumnNames(rows);
  for (const column of columns) {
    if (!isLikelyIdColumnName(column)) continue;
    const values = rows.map((row) => row[column]).filter((value) => !isEmptyValue(value)).map((value) => cleanText(value));
    if (!values.length) continue;
    const uniqueCount = new Set(values).size;
    if (uniqueCount === values.length || uniqueCount / values.length >= 0.95) return column;
  }
  return requestedIdColumn;
}

function toStatisticalRows(rows: DataRow[]): AnalysisRow[] {
  return rows.map((row) => ({ ...row }));
}

function getKeywords(profile: SavedProfile | null) {
  if (!profile) return 'nezadané';
  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length) return profile.keywordsList.join(', ');
  if (Array.isArray(profile.keywords) && profile.keywords.length) return profile.keywords.join(', ');
  return 'nezadané';
}

function buildStatisticalTables(statisticalAnalysis: StatisticalAnalysisResult): AnalysisTable[] {
  const output: AnalysisTable[] = [];

  const frequencyTables: AnalysisTable[] = safeArray<AnyRecord>(statisticalAnalysis.frequencies).map((table) => ({
    title: `Frequencies for ${table.variable}`,
    description: 'Frekvenčná tabuľka zo štatistického jadra.',
    columns: [
      { key: 'value', label: table.variable || 'Hodnota' },
      { key: 'count', label: 'Frequency' },
      { key: 'percent', label: 'Percent' },
      { key: 'validPercent', label: 'Valid Percent' },
      { key: 'cumulativePercent', label: 'Cumulative Percent' },
    ],
    rows: safeArray<AnyRecord>(table.values).map((row) => ({
      value: row.value,
      count: row.count,
      frequency: row.count,
      percent: row.percent,
      validPercent: row.validPercent,
      cumulativePercent: row.cumulativePercent,
    })),
    sheetName: `Freq ${table.variable || ''}`,
  }));

  output.push(...frequencyTables);

  const scaleDescriptivesTable: AnalysisTable = {
    title: 'Descriptive Statistics',
    description: 'JASP tabuľka pre škály a subškály.',
    columns: [
      { key: 'variable', label: '' },
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
    rows: safeArray<AnyRecord>(statisticalAnalysis.scaleDescriptives).map((row) => {
      const normality = safeArray<AnyRecord>(statisticalAnalysis.normality).find((item) => item.variable === row.variable);
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
        shapiroWilk: normality?.statistic ?? row.shapiroWilk ?? null,
        pValueOfShapiroWilk: normalizePValue(normality?.pValue ?? row.pValueOfShapiroWilk),
        minimum: row.minimum,
        maximum: row.maximum,
      };
    }),
    sheetName: 'Descriptive Statistics',
  };

  if (scaleDescriptivesTable.rows.length) output.push(scaleDescriptivesTable);

  const normalityTable: AnalysisTable = {
    title: 'Normalita dát',
    description: 'Shapiro-Wilkov test a odporúčanie.',
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
    rows: safeArray<AnyRecord>(statisticalAnalysis.normality).map((row) => ({
      variable: row.variable,
      valid: row.valid,
      method: row.method,
      statistic: row.statistic,
      pValue: normalizePValue(row.pValue),
      isNormal: row.isNormal === null ? null : row.isNormal ? 'Áno' : 'Nie',
      recommendation: row.recommendation,
      note: row.note,
    })),
    sheetName: 'Normalita',
  };

  if (normalityTable.rows.length) output.push(normalityTable);

  const reliabilityTable: AnalysisTable = {
    title: 'Reliabilita škál, subškál',
    description: 'Cronbachovo alfa pre škály a subškály.',
    columns: [
      { key: 'scaleName', label: 'Škála / subškála' },
      { key: 'validRows', label: 'Valid rows' },
      { key: 'itemsCount', label: 'Počet položiek' },
      { key: 'cronbachAlpha', label: "Cronbach's α" },
      { key: 'interpretation', label: 'Interpretácia' },
    ],
    rows: safeArray<AnyRecord>(statisticalAnalysis.reliability).map((row) => ({
      scaleName: row.scaleName,
      validRows: row.validRows,
      itemsCount: safeArray(row.items).length,
      cronbachAlpha: row.cronbachAlpha,
      interpretation: row.interpretation,
    })),
    sheetName: 'Reliabilita',
  };

  if (reliabilityTable.rows.length) output.push(reliabilityTable);

  const spearmanTable: AnalysisTable = {
    title: "Spearman's Correlations",
    description: 'Spearmanove korelácie medzi škálami a subškálami.',
    columns: [
      { key: 'variableA', label: '' },
      { key: 'separator', label: '' },
      { key: 'variableB', label: '' },
      { key: 'rho', label: "Spearman's rho" },
      { key: 'significance', label: '' },
      { key: 'pValue', label: 'p' },
      { key: 'fisherZ', label: "Effect size (Fisher's z)" },
      { key: 'standardError', label: 'SE Effect size' },
    ],
    rows: safeArray<AnyRecord>(statisticalAnalysis.correlations?.spearman).map((row) => ({
      variableA: row.variableA,
      separator: '-',
      variableB: row.variableB,
      rho: row.r ?? row.rho,
      significance: row.significance || '',
      pValue: normalizePValue(row.pValue ?? row.p),
      fisherZ: row.fisherZ,
      standardError: row.standardError,
    })),
    sheetName: 'Spearman',
  };

  if (spearmanTable.rows.length) output.push(spearmanTable);

  return output;
}

function normalizeForSection(value: string) {
  return cleanText(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getJaspFrequencySectionTitle(variable: string) {
  const normalized = normalizeForSection(variable);
  if (normalized.includes('s-embu otec') || normalized.includes('embu otec')) return 'FREKVENČNÉ TABUĽKY EMBU OTEC';
  if (normalized.includes('s-embu matka') || normalized.includes('embu matka')) return 'FREKVENČNÁ TABUĽKA EMBU MATKA';
  if (normalized.includes('skala skolskej zaclenenosti') || normalized.includes('skolskej zaclenenosti') || normalized.includes('school belonging')) {
    return 'FREKVENČNÁ TABUĽKA ŠKÁLA ŠKOLSKEJ ZAČLENENOSTI';
  }
  return 'FREKVENČNÉ TABUĽKY OSTATNÉ PREMENNÉ';
}

function buildJaspFrequencySections(frequencyTables: AnalysisTable[]) {
  const groups = new Map<string, AnalysisTable[]>();

  frequencyTables.forEach((table) => {
    const variable = String(table.columns?.[0]?.label || table.title || 'Premenná');
    const sectionTitle = getJaspFrequencySectionTitle(variable);
    const current = groups.get(sectionTitle) || [];
    current.push(table);
    groups.set(sectionTitle, current);
  });

  return Array.from(groups.entries()).map(([title, tables], index) => ({
    key: `frequency-${index + 1}`,
    title,
    subtitle: `${index + 1} Frequency Tables`,
    description: 'Sekcia frekvenčných tabuliek v štýle JASP.',
    tables,
  }));
}

function buildResponse(params: {
  title: string;
  summary: string;
  rows: DataRow[];
  files: File[];
  computedTables: AnalysisTable[];
  statisticalAnalysis: StatisticalAnalysisResult;
  practicalText: string;
  interpretation: string;
  warnings?: string[];
  aiAgent?: AnyRecord | null;
}) {
  const frequencyTables = params.computedTables.filter((table) => table.title.toLowerCase().includes('frequenc'));
  const jaspFrequencySections = buildJaspFrequencySections(frequencyTables);
  const descriptiveTable = params.computedTables.find((table) => table.title === 'Descriptive Statistics');
  const reliabilityTables = params.computedTables.filter((table) => table.title.toLowerCase().includes('reliabil'));
  const spearmanTable = params.computedTables.find((table) => table.title.includes('Spearman'));

  const jaspOutput = {
    title: 'Výsledky analýzy podľa JASP prílohy',
    description: 'Frekvenčné tabuľky, deskriptívna štatistika, reliabilita a Spearmanova korelačná analýza.',
    frequencySections: jaspFrequencySections,
    descriptiveSection: {
      key: 'descriptive-statistics',
      title: 'DESKRIPTÍVNA ŠTATISTIKA - škály a subškály',
      subtitle: 'Descriptive Statistics',
      tables: descriptiveTable ? [descriptiveTable] : [],
    },
    reliabilitySection: {
      key: 'reliability',
      title: 'RELIABILITA ŠKÁL, SUBŠKÁL',
      subtitle: '1.1 Unidimensional Reliability',
      tables: reliabilityTables,
    },
    correlationSection: {
      key: 'spearman-correlations',
      title: 'KORELAČNÁ ANALÝZA-SPEARMAN - MALÝ SÚBOR',
      subtitle: 'IBA MEDZI ŠKÁLAMI A SUBŠKÁLAMI',
      tables: spearmanTable ? [spearmanTable] : [],
    },
  };

  const variables = buildVariableSummary(params.rows);

  return {
    ok: true,
    title: params.title,
    summary: params.summary,
    dataDescription: `Bolo načítaných ${params.rows.length} riadkov a ${getColumnNames(params.rows).length} stĺpcov.`,
    files: params.files.map((file) => ({ fileName: file.name, size: file.size, type: file.type })),
    extractedFiles: params.files.map((file) => file.name),
    variables,
    selectedAnalyses: [
      { title: 'Frekvenčná analýza', description: 'Frekvenčné tabuľky s percentami a validnými percentami.' },
      { title: 'Deskriptívna štatistika škál a subškál', description: 'Valid, Missing, Median, Mean, SD, Skewness, Kurtosis, Shapiro-Wilk.' },
      { title: 'Reliabilita a korelačná analýza', description: 'Cronbachovo alfa a Spearmanove korelácie.' },
    ],
    descriptiveStatistics: params.computedTables.filter((table) => table.title.toLowerCase().includes('deskript') || table.title.toLowerCase().includes('descriptive')),
    frequencies: frequencyTables,
    frequencyTables,
    itemDescriptives: params.statisticalAnalysis.itemDescriptives,
    scaleScores: params.statisticalAnalysis.scaleScores,
    scaleDescriptives: params.statisticalAnalysis.scaleDescriptives,
    normality: params.statisticalAnalysis.normality,
    pearsonCorrelations: params.statisticalAnalysis.correlations?.pearson || [],
    spearmanCorrelations: params.statisticalAnalysis.correlations?.spearman || [],
    recommendedCorrelations: params.statisticalAnalysis.correlations?.recommended || [],
    reliability: params.statisticalAnalysis.reliability,
    parametricGroupTests: params.statisticalAnalysis.groupTests?.parametric || [],
    nonParametricGroupTests: params.statisticalAnalysis.groupTests?.nonParametric || [],
    recommendedGroupTests: params.statisticalAnalysis.groupTests?.recommended || [],
    statisticalAnalysis: params.statisticalAnalysis,
    recommendedCharts: [],
    excelTables: params.computedTables,
    tables: params.computedTables,
    analysisTables: params.computedTables,
    resultTables: params.computedTables,
    resultsTables: params.computedTables,
    jaspOutput,
    jaspFrequencySections,
    jaspDescriptiveSection: jaspOutput.descriptiveSection,
    jaspReliabilitySection: jaspOutput.reliabilitySection,
    jaspCorrelationSection: jaspOutput.correlationSection,
    practicalText: params.practicalText,
    interpretation: params.interpretation,
    warnings: params.warnings || [],
    fullText: `${params.practicalText}\n\nInterpretácia:\n${params.interpretation}`,
    aiAgent: params.aiAgent || null,
    claudeAgent: params.aiAgent?.provider === 'anthropic' ? params.aiAgent : null,
    exportReady: {
      excel: true,
      word: true,
      pdf: true,
      tables: params.computedTables,
    },
    meta: {
      ...params.statisticalAnalysis.meta,
      filesCount: params.files.length,
      extractedRows: params.rows.length,
      extractedColumns: getColumnNames(params.rows).length,
      extractedFiles: params.files.map((file) => file.name),
      generatedAt: new Date().toISOString(),
    },
  };
}

function buildPrompt(params: {
  profile: SavedProfile | null;
  analysisGoal: string;
  dataDescription: string;
  filesBlock: string;
  statisticalAnalysis: StatisticalAnalysisResult;
}) {
  return `
Si profesionálny štatistik a metodológ výskumu.
Vráť iba validný JSON bez markdownu.

PROFIL:
Názov: ${params.profile?.title || 'nezadané'}
Téma: ${params.profile?.topic || 'nezadané'}
Cieľ: ${params.profile?.goal || 'nezadané'}
Hypotézy: ${params.profile?.hypotheses || 'nezadané'}
Výskumné otázky: ${params.profile?.researchQuestions || 'nezadané'}
Kľúčové slová: ${getKeywords(params.profile)}

CIEĽ ANALÝZY:
${params.analysisGoal || 'Kompletná analýza dát do praktickej časti.'}

OPIS DÁT:
${params.dataDescription || 'Bez opisu.'}

SÚBORY:
${params.filesBlock || 'Bez súborov.'}

VÝPOČTY:
${JSON.stringify(params.statisticalAnalysis, null, 2)}

VRÁŤ:
{
  "ok": true,
  "title": "Výsledky analýzy",
  "summary": "stručný súhrn",
  "practicalText": "text do praktickej časti",
  "interpretation": "interpretácia výsledkov",
  "warnings": [],
  "fullText": "kompletný text"
}
`.trim();
}

async function callOpenAI(prompt: string) {
  const apiKey = getEnv('OPENAI_API_KEY');
  if (!apiKey) return null;

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: getEnv('OPENAI_MODEL') || 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Si štatistik. Vždy vraciaš iba validný JSON.' },
        { role: 'user', content: prompt },
      ],
    });

    const text = completion.choices[0]?.message?.content || '';
    return text.trim()
      ? { enabled: true, ok: true, provider: 'openai', model: getEnv('OPENAI_MODEL') || 'gpt-4o-mini', text, error: null }
      : null;
  } catch (error) {
    return { enabled: true, ok: false, provider: 'openai', model: getEnv('OPENAI_MODEL') || 'gpt-4o-mini', text: '', error: error instanceof Error ? error.message : 'OpenAI zlyhal.' };
  }
}

async function callAnthropic(prompt: string) {
  const apiKey = getEnv('ANTHROPIC_API_KEY');
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: getEnv('ANTHROPIC_MODEL') || 'claude-sonnet-4-5',
        max_tokens: 3500,
        temperature: 0.2,
        system: 'Si profesionálny štatistik. Vráť iba validný JSON bez markdownu.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);

    const text = payload?.content?.map((item: any) => item?.text || '').join('\n').trim() || '';
    return text
      ? { enabled: true, ok: true, provider: 'anthropic', model: getEnv('ANTHROPIC_MODEL') || 'claude-sonnet-4-5', text, error: null }
      : null;
  } catch (error) {
    return { enabled: true, ok: false, provider: 'anthropic', model: getEnv('ANTHROPIC_MODEL') || 'claude-sonnet-4-5', text: '', error: error instanceof Error ? error.message : 'Claude zlyhal.' };
  }
}

async function runAiInterpretation(prompt: string) {
  const providers = [callAnthropic, callOpenAI];
  const errors: string[] = [];

  for (const provider of providers) {
    const result = await provider(prompt);
    if (result?.ok && result.text) return result;
    if (result?.error) errors.push(`${result.provider}: ${result.error}`);
  }

  return { enabled: errors.length > 0, ok: false, provider: null, model: null, text: '', error: errors.join(' | ') || 'AI interpretácia nie je dostupná.' };
}

function xmlEscape(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function htmlEscape(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripInvalidSheetChars(value: string) {
  return cleanText(value)
    .replace(/[\\/\?\*\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 31) || 'Hárok';
}

function uniqueSheetName(base: string, used: Set<string>) {
  let name = stripInvalidSheetChars(base);
  let index = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` ${index}`;
    name = `${stripInvalidSheetChars(base).slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

function normalizeTable(table: unknown, fallbackTitle: string): AnalysisTable | null {
  if (!isRecord(table)) return null;

  const title = cleanText(table.title || table.name || fallbackTitle || 'Tabuľka');
  const rawRows = safeArray<AnyRecord>(table.rows || table.data || table.values || table.items);
  const rawColumns = safeArray<AnyRecord>(table.columns || table.headers);

  const rows = rawRows.map((row) => (isRecord(row) ? row : { value: row }));

  const columns: TableColumn[] = rawColumns.length
    ? rawColumns.map((column, index) => ({
        key: cleanText(column.key || column.id || column.name || column.label || `col_${index + 1}`),
        label: cleanText(column.label || column.name || column.key || `Stĺpec ${index + 1}`),
      }))
    : Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).map((key) => ({ key, label: key }));

  if (!rows.length && !columns.length) return null;

  return {
    title,
    description: cleanText(table.description),
    sheetName: cleanText(table.sheetName || title),
    columns,
    rows,
  };
}

function pushTable(tables: AnalysisTable[], table: unknown, fallbackTitle: string) {
  const normalized = normalizeTable(table, fallbackTitle);
  if (normalized && normalized.rows.length) tables.push(normalized);
}

function collectExportTables(result: AnyRecord): AnalysisTable[] {
  const tables: AnalysisTable[] = [];

  safeArray(result.excelTables || result.tables || result.analysisTables || result.resultTables || result.resultsTables).forEach((table, index) => {
    pushTable(tables, table, `Tabuľka ${index + 1}`);
  });

  safeArray(result.frequencies || result.frequencyTables).forEach((table, index) => {
    pushTable(tables, table, `Frekvencia ${index + 1}`);
  });

  pushTable(tables, {
    title: 'Premenné',
    rows: safeArray(result.variables || result.detectedVariables || result.columns),
  }, 'Premenné');

  pushTable(tables, {
    title: 'Deskriptívna štatistika škál a subškál',
    rows: safeArray(result.scaleDescriptives || result.statisticalAnalysis?.scaleDescriptives),
  }, 'Deskriptívna štatistika');

  pushTable(tables, {
    title: 'Normalita dát',
    rows: safeArray(result.normality || result.statisticalAnalysis?.normality),
  }, 'Normalita');

  pushTable(tables, {
    title: 'Reliabilita',
    rows: safeArray(result.reliability || result.statisticalAnalysis?.reliability),
  }, 'Reliabilita');

  pushTable(tables, {
    title: "Spearman's Correlations",
    rows: safeArray(result.spearmanCorrelations || result.statisticalAnalysis?.correlations?.spearman),
  }, 'Spearman');

  const jaspOutput = isRecord(result.jaspOutput) ? result.jaspOutput : {};

  safeArray<unknown>(
    jaspOutput.frequencySections || result.jaspFrequencySections,
  ).forEach((section) => {
    if (!isRecord(section)) return;

    safeArray<unknown>(section.tables).forEach((table, index) => {
      if (!isRecord(table)) return;

      pushTable(
        tables,
        {
          ...table,
          title: `${section.title || 'Frekvencie'} - ${
            table.title || index + 1
          }`,
        },
        'JASP frekvencia',
      );
    });
  });

  [
    result.jaspDescriptiveSection || jaspOutput.descriptiveSection,
    result.jaspReliabilitySection || jaspOutput.reliabilitySection,
    result.jaspCorrelationSection || jaspOutput.correlationSection,
  ]
    .filter(isRecord)
    .forEach((section) => {
      safeArray<unknown>(section.tables).forEach((table, index) => {
        if (!isRecord(table)) return;

        pushTable(
          tables,
          {
            ...table,
            title: `${section.title || 'JASP'} - ${
              table.title || index + 1
            }`,
          },
          'JASP tabuľka',
        );
      });
    });

  const seen = new Set<string>();
  return tables.filter((table) => {
    const signature = `${table.title}|${table.rows.length}|${table.columns.map((column) => column.key).join(',')}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function createExcelXml(result: AnyRecord, title: string) {
  const tables = collectExportTables(result);
  const generatedAt = new Date().toLocaleString('sk-SK');
  const usedSheetNames = new Set<string>();

  type ExcelCell = {
    value: unknown;
    style?: string;
    mergeAcross?: number;
    formula?: string;
    type?: 'String' | 'Number' | 'DateTime';
  };

  type ExcelSheet = {
    name: string;
    rows: ExcelCell[][];
    freezeRows?: number;
    autoFilterRow?: number;
    columnWidths?: number[];
  };

  function numberValue(value: unknown) {
    const parsed = parseNumericValue(value);
    return parsed === null ? null : parsed;
  }

  function excelCell(value: unknown, style = 'Text', options: Partial<ExcelCell> = {}): ExcelCell {
    return {
      value,
      style,
      ...options,
    };
  }

  function excelNumber(value: unknown, style = 'Number', options: Partial<ExcelCell> = {}): ExcelCell {
    const parsed = numberValue(value);
    if (parsed === null) return excelCell(value ?? '', style, options);
    return {
      value: parsed,
      style,
      type: 'Number',
      ...options,
    };
  }

  function normalizeForSheet(value: unknown) {
    const text = cleanText(value);
    if (!text) return '';
    return text.length > 32000 ? `${text.slice(0, 32000)}…` : text;
  }

  function createDataRow(values: unknown[], style = 'Text') {
    return values.map((value) => {
      const parsed = numberValue(value);
      if (parsed !== null && String(value).trim() !== '' && !String(value).includes('<')) {
        return excelNumber(parsed, style === 'Text' ? 'Number' : style);
      }

      return excelCell(normalizeForSheet(value), style);
    });
  }

  function styleForHeader(label: string) {
    const normalized = cleanText(label).toLowerCase();
    if (normalized.includes('p-value') || normalized === 'p' || normalized.includes("spearman")) return 'HeaderBlue';
    if (normalized.includes('cronbach') || normalized.includes('reliabil')) return 'HeaderGreen';
    if (normalized.includes('frequency') || normalized.includes('percent')) return 'HeaderPurple';
    return 'Header';
  }

  function styleForTableValue(columnKey: string, value: unknown) {
    const normalized = cleanText(columnKey).toLowerCase();
    const parsed = parseNumericValue(value);

    if (normalized.includes('pvalue') || normalized === 'p' || normalized.includes('p-value')) {
      if (typeof value === 'string' && value.includes('<')) return 'PValueStrong';
      if (parsed !== null && parsed < 0.05) return 'PValueStrong';
      return 'PValue';
    }

    if (normalized.includes('cronbach') || normalized.includes('alpha')) {
      if (parsed !== null && parsed >= 0.7) return 'GoodNumber';
      if (parsed !== null && parsed < 0.6) return 'BadNumber';
      return 'Number';
    }

    if (
      normalized.includes('percent') ||
      normalized.includes('percentage') ||
      normalized.includes('validpercent') ||
      normalized.includes('cumulativepercent')
    ) {
      return 'Percent';
    }

    if (parsed !== null && String(value).trim() !== '' && !String(value).includes('<')) return 'Number';

    return 'Text';
  }

  function tableToSheet(table: AnalysisTable, index: number): ExcelSheet {
    const columns = table.columns.length
      ? table.columns
      : Array.from(new Set(table.rows.flatMap((row) => Object.keys(row)))).map((key) => ({
          key,
          label: key,
        }));

    const titleRow = [excelCell(table.title || `Tabuľka ${index + 1}`, 'TableTitle', { mergeAcross: Math.max(columns.length - 1, 0) })];
    const descriptionRows = table.description
      ? [[excelCell(table.description, 'TableDescription', { mergeAcross: Math.max(columns.length - 1, 0) })]]
      : [];

    const headerRow = columns.map((column) => excelCell(column.label || column.key, styleForHeader(column.label || column.key)));

    const dataRows = table.rows.map((row) =>
      columns.map((column) => {
        const value = row[column.key] ?? '';
        return excelCell(normalizeForSheet(value), styleForTableValue(column.key, value));
      }),
    );

    return {
      name: table.sheetName || table.title || `Tabuľka ${index + 1}`,
      freezeRows: 3 + descriptionRows.length,
      autoFilterRow: 3 + descriptionRows.length,
      columnWidths: columns.map((column) => {
        const labelLength = cleanText(column.label || column.key).length;
        const maxValueLength = Math.min(
          48,
          Math.max(
            labelLength,
            ...table.rows.slice(0, 100).map((row) => cleanText(row[column.key]).length),
          ),
        );
        return Math.max(80, Math.min(260, maxValueLength * 7 + 28));
      }),
      rows: [
        titleRow,
        ...descriptionRows,
        headerRow,
        ...dataRows,
      ],
    };
  }

  function extractRowsFromTableByTitle(patterns: string[]) {
    const lowered = patterns.map((pattern) => pattern.toLowerCase());
    return tables
      .filter((table) => lowered.some((pattern) => table.title.toLowerCase().includes(pattern)))
      .flatMap((table) => table.rows.map((row) => ({ tableTitle: table.title, ...row })));
  }

  function chartBar(value: number, max: number) {
    if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(max) || max <= 0) return '';
    const length = Math.max(1, Math.round((value / max) * 28));
    return '█'.repeat(length);
  }

  function getTopFrequencyChartRows() {
    const frequencyTables = tables.filter((table) =>
      table.title.toLowerCase().includes('frequenc') ||
      table.title.toLowerCase().includes('frekv'),
    );

    const rows: { chart: string; category: string; value: number; percent: number | null }[] = [];

    frequencyTables.slice(0, 8).forEach((table) => {
      table.rows
        .filter((row) => {
          const label = cleanText(row.value ?? row.category ?? row.label);
          return label && label.toLowerCase() !== 'total' && label.toLowerCase() !== 'missing';
        })
        .slice(0, 8)
        .forEach((row) => {
          const value = parseNumericValue(row.frequency ?? row.count) ?? 0;
          const percent = parseNumericValue(row.percent ?? row.percentage);
          if (value > 0) {
            rows.push({
              chart: table.title.replace(/^Frequencies for\s+/i, ''),
              category: cleanText(row.value ?? row.category ?? row.label),
              value,
              percent,
            });
          }
        });
    });

    return rows;
  }

  function getScaleMeanChartRows() {
    const rows = safeArray<AnyRecord>(
      result.scaleDescriptives || result.statisticalAnalysis?.scaleDescriptives,
    );

    return rows
      .map((row) => ({
        scale: cleanText(row.variable || row.scaleName || row.name),
        mean: parseNumericValue(row.mean ?? row.M),
        median: parseNumericValue(row.median ?? row.Md),
        sd: parseNumericValue(row.standardDeviation ?? row.sd ?? row.SD),
      }))
      .filter((row) => row.scale && row.mean !== null)
      .slice(0, 20);
  }

  function getReliabilityChartRows() {
    const rows = safeArray<AnyRecord>(result.reliability || result.statisticalAnalysis?.reliability);

    return rows
      .map((row) => ({
        scale: cleanText(row.scaleName || row.variable || row.name),
        alpha: parseNumericValue(row.cronbachAlpha ?? row.alpha),
        validRows: parseNumericValue(row.validRows ?? row.valid ?? row.n),
      }))
      .filter((row) => row.scale && row.alpha !== null)
      .slice(0, 20);
  }

  function getSpearmanChartRows() {
    const rows = safeArray<AnyRecord>(
      result.spearmanCorrelations || result.statisticalAnalysis?.correlations?.spearman,
    );

    return rows
      .map((row) => {
        const rho = parseNumericValue(row.rho ?? row.r ?? row.coefficient);
        return {
          pair: `${cleanText(row.variableA || row.variable1)} × ${cleanText(row.variableB || row.variable2)}`,
          rho,
          absRho: rho === null ? null : Math.abs(rho),
          pValue: row.pValue ?? row.p,
        };
      })
      .filter((row) => row.pair.trim() !== '×' && row.absRho !== null)
      .sort((a, b) => (b.absRho || 0) - (a.absRho || 0))
      .slice(0, 20);
  }

  function createChartsSheet(): ExcelSheet {
    const frequencyRows = getTopFrequencyChartRows();
    const scaleRows = getScaleMeanChartRows();
    const reliabilityRows = getReliabilityChartRows();
    const spearmanRows = getSpearmanChartRows();

    const rows: ExcelCell[][] = [
      [excelCell('Prehľadné grafy a vizuálne porovnania', 'ReportTitle', { mergeAcross: 5 })],
      [excelCell(`Vygenerované: ${generatedAt}`, 'Meta', { mergeAcross: 5 })],
      [],
    ];

    if (frequencyRows.length) {
      const maxFrequency = Math.max(...frequencyRows.map((row) => row.value), 1);
      rows.push([excelCell('Graf 1 – frekvencie odpovedí', 'SectionTitle', { mergeAcross: 5 })]);
      rows.push([
        excelCell('Premenná', 'HeaderPurple'),
        excelCell('Kategória', 'HeaderPurple'),
        excelCell('Počet', 'HeaderPurple'),
        excelCell('Percento', 'HeaderPurple'),
        excelCell('Vizuálny stĺpec', 'HeaderPurple', { mergeAcross: 1 }),
      ]);
      frequencyRows.forEach((row) => {
        rows.push([
          excelCell(row.chart, 'Text'),
          excelCell(row.category, 'Text'),
          excelNumber(row.value, 'Number'),
          row.percent === null ? excelCell('', 'Text') : excelNumber(row.percent, 'Percent'),
          excelCell(chartBar(row.value, maxFrequency), 'BarPurple', { mergeAcross: 1 }),
        ]);
      });
      rows.push([]);
    }

    if (scaleRows.length) {
      const maxMean = Math.max(...scaleRows.map((row) => row.mean || 0), 1);
      rows.push([excelCell('Graf 2 – priemery škál a subškál', 'SectionTitle', { mergeAcross: 5 })]);
      rows.push([
        excelCell('Škála / subškála', 'HeaderBlue'),
        excelCell('Mean', 'HeaderBlue'),
        excelCell('Median', 'HeaderBlue'),
        excelCell('SD', 'HeaderBlue'),
        excelCell('Vizuálny stĺpec', 'HeaderBlue', { mergeAcross: 1 }),
      ]);
      scaleRows.forEach((row) => {
        rows.push([
          excelCell(row.scale, 'Text'),
          excelNumber(row.mean, 'Number'),
          excelNumber(row.median, 'Number'),
          excelNumber(row.sd, 'Number'),
          excelCell(chartBar(row.mean || 0, maxMean), 'BarBlue', { mergeAcross: 1 }),
        ]);
      });
      rows.push([]);
    }

    if (reliabilityRows.length) {
      rows.push([excelCell('Graf 3 – reliabilita škál Cronbachovo alfa', 'SectionTitle', { mergeAcross: 5 })]);
      rows.push([
        excelCell('Škála / subškála', 'HeaderGreen'),
        excelCell("Cronbach's α", 'HeaderGreen'),
        excelCell('Valid rows', 'HeaderGreen'),
        excelCell('Hodnotenie', 'HeaderGreen'),
        excelCell('Vizuálny stĺpec', 'HeaderGreen', { mergeAcross: 1 }),
      ]);
      reliabilityRows.forEach((row) => {
        const alpha = row.alpha || 0;
        const label = alpha >= 0.8 ? 'veľmi dobrá' : alpha >= 0.7 ? 'dobrá' : alpha >= 0.6 ? 'hraničná' : 'slabá';
        rows.push([
          excelCell(row.scale, 'Text'),
          excelNumber(row.alpha, alpha >= 0.7 ? 'GoodNumber' : alpha < 0.6 ? 'BadNumber' : 'Number'),
          excelNumber(row.validRows, 'Number'),
          excelCell(label, alpha >= 0.7 ? 'GoodText' : alpha < 0.6 ? 'BadText' : 'Text'),
          excelCell(chartBar(alpha, 1), 'BarGreen', { mergeAcross: 1 }),
        ]);
      });
      rows.push([]);
    }

    if (spearmanRows.length) {
      rows.push([excelCell('Graf 4 – najsilnejšie Spearmanove korelácie podľa |ρ|', 'SectionTitle', { mergeAcross: 5 })]);
      rows.push([
        excelCell('Dvojica premenných', 'HeaderOrange'),
        excelCell("Spearman's ρ", 'HeaderOrange'),
        excelCell('|ρ|', 'HeaderOrange'),
        excelCell('p', 'HeaderOrange'),
        excelCell('Vizuálny stĺpec', 'HeaderOrange', { mergeAcross: 1 }),
      ]);
      spearmanRows.forEach((row) => {
        rows.push([
          excelCell(row.pair, 'Text'),
          excelNumber(row.rho, 'Number'),
          excelNumber(row.absRho, 'Number'),
          excelCell(normalizePValue(row.pValue), 'PValue'),
          excelCell(chartBar(row.absRho || 0, 1), 'BarOrange', { mergeAcross: 1 }),
        ]);
      });
      rows.push([]);
    }

    if (!frequencyRows.length && !scaleRows.length && !reliabilityRows.length && !spearmanRows.length) {
      rows.push([
        excelCell(
          'Grafy nebolo možné vytvoriť, pretože výsledok neobsahuje vhodné frekvencie, priemery škál, reliabilitu ani Spearmanove korelácie.',
          'Warning',
          { mergeAcross: 5 },
        ),
      ]);
    }

    return {
      name: 'Grafy',
      freezeRows: 3,
      columnWidths: [190, 220, 95, 95, 260, 90],
      rows,
    };
  }

  function createSummarySheet(): ExcelSheet {
    const rows: ExcelCell[][] = [
      [excelCell('Výsledky analýzy dát', 'ReportTitle', { mergeAcross: 5 })],
      [excelCell(`Vygenerované: ${generatedAt}`, 'Meta', { mergeAcross: 5 })],
      [],
      [excelCell('Súhrn výsledkov', 'SectionTitle', { mergeAcross: 5 })],
      [excelCell(cleanText(result.summary) || 'Analýza bola spracovaná.', 'Summary', { mergeAcross: 5 })],
      [],
      [
        excelCell('Ukazovateľ', 'Header'),
        excelCell('Hodnota', 'Header'),
        excelCell('Poznámka', 'Header', { mergeAcross: 3 }),
      ],
      [
        excelCell('Počet tabuliek', 'Text'),
        excelNumber(tables.length, 'Number'),
        excelCell('Všetky tabuľky pripravené na export.', 'Text', { mergeAcross: 3 }),
      ],
      [
        excelCell('Počet respondentov', 'Text'),
        excelCell(result.meta?.respondentCount ?? result.statisticalAnalysis?.meta?.respondentCount ?? '', 'Text'),
        excelCell('Podľa meta údajov zo štatistického jadra.', 'Text', { mergeAcross: 3 }),
      ],
      [
        excelCell('Ignorovaný ID stĺpec', 'Text'),
        excelCell(result.meta?.idColumn ?? result.statisticalAnalysis?.meta?.idColumn ?? '', 'Text'),
        excelCell('ID stĺpec sa nepoužíva ako analyzovaná premenná.', 'Text', { mergeAcross: 3 }),
      ],
      [
        excelCell('Frekvenčné tabuľky', 'Text'),
        excelNumber(tables.filter((table) => table.title.toLowerCase().includes('frequenc') || table.title.toLowerCase().includes('frekv')).length, 'Number'),
        excelCell('Rozdelenie odpovedí podľa položiek.', 'Text', { mergeAcross: 3 }),
      ],
      [
        excelCell('Deskriptívne tabuľky', 'Text'),
        excelNumber(tables.filter((table) => table.title.toLowerCase().includes('descriptive') || table.title.toLowerCase().includes('deskript')).length, 'Number'),
        excelCell('Škály, subškály a položky.', 'Text', { mergeAcross: 3 }),
      ],
      [
        excelCell('Reliabilita', 'Text'),
        excelNumber(safeArray(result.reliability || result.statisticalAnalysis?.reliability).length, 'Number'),
        excelCell('Cronbachovo alfa podľa škál.', 'Text', { mergeAcross: 3 }),
      ],
      [
        excelCell('Korelácie Spearman', 'Text'),
        excelNumber(safeArray(result.spearmanCorrelations || result.statisticalAnalysis?.correlations?.spearman).length, 'Number'),
        excelCell('Vzťahy medzi škálami/subškálami.', 'Text', { mergeAcross: 3 }),
      ],
      [],
      [excelCell('Interpretácia', 'SectionTitle', { mergeAcross: 5 })],
      [excelCell(cleanText(result.interpretation || result.practicalText || result.fullText) || 'Interpretácia nie je dostupná.', 'Summary', { mergeAcross: 5 })],
    ];

    return {
      name: 'Súhrn',
      freezeRows: 3,
      columnWidths: [180, 130, 220, 120, 120, 120],
      rows,
    };
  }

  const sheets: ExcelSheet[] = [
    createSummarySheet(),
    createChartsSheet(),
    ...tables.map((table, index) => tableToSheet(table, index)),
  ];

  function renderCell(cell: ExcelCell, rowIndex: number) {
    const value = cell.value;
    const parsed = parseNumericValue(value);
    const hasNumericValue =
      cell.type === 'Number' ||
      (parsed !== null && String(value).trim() !== '' && !String(value).includes('<') && !String(value).startsWith('0'));

    const type = cell.type || (hasNumericValue ? 'Number' : 'String');
    const data = type === 'Number' && parsed !== null ? String(parsed) : xmlEscape(value);
    const style = cell.style || (rowIndex === 0 ? 'ReportTitle' : 'Text');
    const merge = cell.mergeAcross && cell.mergeAcross > 0 ? ` ss:MergeAcross="${cell.mergeAcross}"` : '';
    const formula = cell.formula ? ` ss:Formula="${xmlEscape(cell.formula)}"` : '';

    return `<Cell ss:StyleID="${xmlEscape(style)}"${merge}${formula}><Data ss:Type="${type}">${data}</Data></Cell>`;
  }

  function renderWorksheet(sheet: ExcelSheet) {
    const safeName = uniqueSheetName(sheet.name, usedSheetNames);
    const maxColumns = Math.max(...sheet.rows.map((row) => row.length), sheet.columnWidths?.length || 1);

    const columnXml = Array.from({ length: maxColumns }, (_, index) => {
      const width = sheet.columnWidths?.[index] ?? 120;
      return `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`;
    }).join('\n');

    const rowsXml = sheet.rows
      .map((row, rowIndex) => {
        const height =
          rowIndex === 0
            ? ' ss:Height="28"'
            : row.some((cell) => cell.style === 'Summary' || cell.style === 'Warning')
              ? ' ss:Height="48"'
              : '';
        return `<Row${height}>${row.map((cell) => renderCell(cell, rowIndex)).join('')}</Row>`;
      })
      .join('\n');

    const filterXml =
      sheet.autoFilterRow && maxColumns > 1
        ? `<AutoFilter x:Range="R${sheet.autoFilterRow}C1:R${Math.max(sheet.rows.length, sheet.autoFilterRow)}C${maxColumns}" xmlns="urn:schemas-microsoft-com:office:excel"/>`
        : '';

    const freezeRows = sheet.freezeRows || 1;

    return `<Worksheet ss:Name="${xmlEscape(safeName)}">
<Table>
${columnXml}
${rowsXml}
</Table>
${filterXml}
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
 <PageSetup>
  <Layout x:Orientation="Landscape"/>
  <Header x:Margin="0.3"/>
  <Footer x:Margin="0.3"/>
  <PageMargins x:Bottom="0.5" x:Left="0.4" x:Right="0.4" x:Top="0.5"/>
 </PageSetup>
 <FitToPage/>
 <Print><FitWidth>1</FitWidth><FitHeight>0</FitHeight><ValidPrinterInfo/></Print>
 <FreezePanes/>
 <FrozenNoSplit/>
 <SplitHorizontal>${freezeRows}</SplitHorizontal>
 <TopRowBottomPane>${freezeRows}</TopRowBottomPane>
 <ActivePane>2</ActivePane>
 <ProtectObjects>False</ProtectObjects>
 <ProtectScenarios>False</ProtectScenarios>
</WorksheetOptions>
</Worksheet>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${xmlEscape(title)}</Title>
  <Author>ZEDPERA</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
  <WindowHeight>9000</WindowHeight>
  <WindowWidth>14000</WindowWidth>
  <ProtectStructure>False</ProtectStructure>
  <ProtectWindows>False</ProtectWindows>
 </ExcelWorkbook>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top"/><Font ss:FontName="Calibri" ss:Size="11"/></Style>
  <Style ss:ID="ReportTitle"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Meta"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#475569"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style>
  <Style ss:ID="SectionTitle"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2563EB" ss:Pattern="Solid"/></Style>
  <Style ss:ID="TableTitle"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#111827" ss:Pattern="Solid"/></Style>
  <Style ss:ID="TableDescription"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#475569"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Summary"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#111827"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/></Borders></Style>
  <Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#334155" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/></Borders></Style>
  <Style ss:ID="HeaderBlue"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2563EB" ss:Pattern="Solid"/></Style>
  <Style ss:ID="HeaderGreen"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#059669" ss:Pattern="Solid"/></Style>
  <Style ss:ID="HeaderPurple"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#7C3AED" ss:Pattern="Solid"/></Style>
  <Style ss:ID="HeaderOrange"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#EA580C" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Text"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#111827"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
  <Style ss:ID="Number"><Alignment ss:Horizontal="Right" ss:Vertical="Top"/><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#111827"/><NumberFormat ss:Format="0.000"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
  <Style ss:ID="Percent"><Alignment ss:Horizontal="Right" ss:Vertical="Top"/><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#111827"/><NumberFormat ss:Format="0.000"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/></Style>
  <Style ss:ID="PValue"><Alignment ss:Horizontal="Right" ss:Vertical="Top"/><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#334155"/><NumberFormat ss:Format="0.000"/></Style>
  <Style ss:ID="PValueStrong"><Alignment ss:Horizontal="Right" ss:Vertical="Top"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/></Style>
  <Style ss:ID="GoodNumber"><Alignment ss:Horizontal="Right" ss:Vertical="Top"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#047857"/><NumberFormat ss:Format="0.000"/><Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/></Style>
  <Style ss:ID="BadNumber"><Alignment ss:Horizontal="Right" ss:Vertical="Top"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/><NumberFormat ss:Format="0.000"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/></Style>
  <Style ss:ID="GoodText"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#047857"/><Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/></Style>
  <Style ss:ID="BadText"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Warning"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#92400E"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/></Style>
  <Style ss:ID="BarBlue"><Font ss:FontName="Consolas" ss:Size="10" ss:Color="#2563EB"/><Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/></Style>
  <Style ss:ID="BarGreen"><Font ss:FontName="Consolas" ss:Size="10" ss:Color="#059669"/><Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/></Style>
  <Style ss:ID="BarPurple"><Font ss:FontName="Consolas" ss:Size="10" ss:Color="#7C3AED"/><Interior ss:Color="#F5F3FF" ss:Pattern="Solid"/></Style>
  <Style ss:ID="BarOrange"><Font ss:FontName="Consolas" ss:Size="10" ss:Color="#EA580C"/><Interior ss:Color="#FFF7ED" ss:Pattern="Solid"/></Style>
 </Styles>
 ${sheets.map(renderWorksheet).join('\n')}
</Workbook>`;
}
function createWordHtml(result: AnyRecord, title: string) {
  const tables = collectExportTables(result);
  const generatedAt = new Date().toLocaleString('sk-SK');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${htmlEscape(title)}</title><style>
body{font-family:Arial,sans-serif;font-size:11pt;color:#111827;line-height:1.5}h1{font-size:20pt}h2{font-size:15pt;margin-top:24px}table{border-collapse:collapse;width:100%;margin:12px 0 22px 0}th,td{border:1px solid #CBD5E1;padding:6px 8px;vertical-align:top}th{background:#DBEAFE;font-weight:bold}.summary{background:#F8FAFC;border:1px solid #CBD5E1;padding:12px;margin:12px 0 20px 0;white-space:pre-wrap}.small{font-size:9pt;color:#475569}</style></head><body>
<h1>${htmlEscape(title)}</h1>
<p class="small">Vygenerované: ${htmlEscape(generatedAt)}</p>
<div class="summary">${htmlEscape(result.summary || 'Analýza bola spracovaná.')}</div>
<h2>Interpretácia</h2>
<div class="summary">${htmlEscape(result.interpretation || result.practicalText || result.fullText || 'Interpretácia nie je dostupná.')}</div>
${tables
  .map((table) => `<h2>${htmlEscape(table.title)}</h2>${table.description ? `<p>${htmlEscape(table.description)}</p>` : ''}<table><thead><tr>${table.columns
    .map((column) => `<th>${htmlEscape(column.label || column.key)}</th>`)
    .join('')}</tr></thead><tbody>${table.rows
    .map((row) => `<tr>${table.columns.map((column) => `<td>${htmlEscape(row[column.key] ?? '')}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`)
  .join('\n')}
</body></html>`;
}

function pdfEscape(value: unknown) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\r?\n/g, ' ');
}

function createSimplePdf(result: AnyRecord, title: string) {
  const tables = collectExportTables(result);
  const lines: string[] = [];

  lines.push(title);
  lines.push(`Vygenerované: ${new Date().toLocaleString('sk-SK')}`);
  lines.push('');
  lines.push(cleanText(result.summary) || 'Analýza bola spracovaná.');
  lines.push('');
  lines.push('Interpretácia:');
  lines.push(cleanText(result.interpretation || result.practicalText || result.fullText).slice(0, 3000) || 'Interpretácia nie je dostupná.');
  lines.push('');

  for (const table of tables.slice(0, 20)) {
    lines.push(`TABUĽKA: ${table.title}`);
    lines.push(table.columns.map((column) => column.label || column.key).join(' | '));
    for (const row of table.rows.slice(0, 60)) {
      lines.push(table.columns.map((column) => cleanText(row[column.key]).slice(0, 40)).join(' | '));
    }
    lines.push('');
  }

  const wrapped: string[] = [];
  for (const line of lines) {
    const text = String(line || '');
    if (text.length <= 105) {
      wrapped.push(text);
    } else {
      for (let i = 0; i < text.length; i += 105) wrapped.push(text.slice(i, i + 105));
    }
  }

  const pages: string[][] = [];
  for (let i = 0; i < wrapped.length; i += 46) pages.push(wrapped.slice(i, i + 46));
  if (!pages.length) pages.push(['Bez dát.']);

  const objects: string[] = [];
  const offsets: number[] = [];

  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  const fontObj = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageObjects: number[] = [];

  const contentObjects = pages.map((page) => {
    const stream = `BT\n/F1 9 Tf\n40 800 Td\n${page
      .map((line, index) => `${index === 0 ? '' : '0 -16 Td\n'}(${pdfEscape(line)}) Tj`)
      .join('\n')}\nET`;
    return addObject(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
  });

  const pagesObjPlaceholder = objects.length + pages.length + 1;

  contentObjects.forEach((contentObj) => {
    const pageObj = addObject(`<< /Type /Page /Parent ${pagesObjPlaceholder} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    pageObjects.push(pageObj);
  });

  const pagesObj = addObject(`<< /Type /Pages /Kids [${pageObjects.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjects.length} >>`);
  const catalogObj = addObject(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

function contentDisposition(fileName: string) {
  return `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

async function handleExport(body: AnyRecord) {
  const format = cleanText(body.format || body.exportFormat || 'excel').toLowerCase() as ExportFormat;
  const result = isRecord(body.result) ? body.result : body;
  const title = cleanText(body.title || result.title || 'Výsledky analýzy dát');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  if (format === 'word' || format === 'doc') {
    const html = createWordHtml(result, title);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'content-type': 'application/msword; charset=utf-8',
        'content-disposition': contentDisposition(`vysledky-analyzy-dat-${timestamp}.doc`),
        'cache-control': 'no-store',
      },
    });
  }

  if (format === 'pdf') {
    const pdf = createSimplePdf(result, title);
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': contentDisposition(`vysledky-analyzy-dat-${timestamp}.pdf`),
        'cache-control': 'no-store',
      },
    });
  }

  const xml = createExcelXml(result, title);
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'content-type': 'application/vnd.ms-excel; charset=utf-8',
      'content-disposition': contentDisposition(`vysledky-analyzy-dat-${timestamp}.xls`),
      'cache-control': 'no-store',
    },
  });
}

function parseJsonFromAiText(raw: string) {
  const cleaned = cleanText(raw);
  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1) || cleaned;
  return JSON.parse(candidate);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/analyze-data',
    supports: ['analysis', 'export-excel', 'export-word', 'export-pdf'],
    message: 'Analyze-data backend beží. Export je zlúčený v tomto jednom route.ts súbore.',
    generatedAt: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ ok: false, error: 'Neplatné JSON telo požiadavky.' }, { status: 400 });
      }

      const action = cleanText((body as AnyRecord).action || (body as AnyRecord).mode || '');
      if (action === 'export' || (body as AnyRecord).result || (body as AnyRecord).format) {
        return handleExport(body as AnyRecord);
      }

      return NextResponse.json({ ok: false, error: 'JSON požiadavka neobsahuje action: export ani result.' }, { status: 400 });
    }

    const formData = await req.formData();
    const analysisGoal = cleanText(formData.get('analysisGoal'));
    const dataDescription = cleanText(formData.get('dataDescription'));
    const profile = safeJsonParse<SavedProfile>(formData.get('activeProfile'));
    const requestedIdColumn = cleanText(formData.get('idColumn')) || undefined;
    const alpha = normalizeAlpha(parseNumberFromFormData(formData.get('alpha')));
    const groupColumns = parseStringArrayFromFormData(formData.get('groupColumns'));
    const scales = safeJsonParse<ScaleDefinition[]>(formData.get('scales')) || undefined;
    const combinedScales = safeJsonParse<CombinedScaleDefinition[]>(formData.get('combinedScales')) || undefined;

    const files = [...formData.getAll('files'), ...formData.getAll('file')].filter((item): item is File => item instanceof File);

    if (!analysisGoal && !dataDescription && files.length === 0) {
      return NextResponse.json({ ok: false, error: 'Chýbajú dáta na analýzu. Vlož text, cieľ analýzy alebo prilož Excel/CSV súbor.' }, { status: 400 });
    }

    const fileTexts: string[] = [];
    const extractedRows: DataRow[] = [];

    for (const file of files) {
      const text = await readFileAsText(file);
      const rows = await extractRowsFromFile(file);
      extractedRows.push(...rows);
      fileTexts.push(`SÚBOR: ${file.name}\nTyp: ${file.type || 'nezadané'}\nVeľkosť: ${file.size}\nNačítané riadky: ${rows.length}\nObsah:\n${text || 'Text sa nepodarilo načítať.'}`);
    }

    const effectiveIdColumn = resolveEffectiveIdColumn(extractedRows, requestedIdColumn);
    const statisticalRows = toStatisticalRows(extractedRows);

    const statisticalAnalysis = runFullStatisticalAnalysis(statisticalRows, {
      idColumn: effectiveIdColumn,
      scales,
      combinedScales,
      groupColumns,
      alpha,
      includeItemDescriptives: true,
      includeFrequencies: true,
      autoDetectScales: true,
      fallbackToNumericVariables: true,
    });

    const computedTables = [
      ...buildDescriptiveStatistics(extractedRows),
      ...buildFrequencyTables(extractedRows),
      ...buildStatisticalTables(statisticalAnalysis),
    ];

    const defaultPracticalText = 'Na základe analyzovaných údajov bola pripravená štruktúra praktickej časti. V praktickej časti je vhodné najskôr opísať výskumnú vzorku, následne uviesť frekvenčné tabuľky pre dotazníkové položky, potom deskriptívnu štatistiku škál a subškál, kontrolu normality, reliabilitu škál a korelačnú alebo skupinovú analýzu podľa výskumných otázok. ID stĺpec sa nepoužíva v štatistických výpočtoch, ale slúži iba na identifikáciu respondentov a určenie veľkosti výskumnej vzorky.';

    const defaultInterpretation = 'Výsledky je potrebné interpretovať podľa vypočítaných tabuliek. Frekvenčné tabuľky ukazujú rozdelenie odpovedí respondentov. Deskriptívna štatistika škál a subškál uvádza počet platných odpovedí, chýbajúce hodnoty, medián, priemer, smerodajnú odchýlku, šikmosť, špicatosť, orientačný test normality, minimum a maximum. Reliabilita pomocou Cronbachovho alfa hodnotí vnútornú konzistenciu škál. Spearmanove korelácie sú vhodné najmä pri menšom súbore, ordinálnych dátach alebo pri nenormálnom rozdelení škál.';

    const warnings: string[] = [];
    if (!extractedRows.length) warnings.push('Nepodarilo sa načítať tabuľkové dáta z Excel/CSV súboru.');
    if (effectiveIdColumn) warnings.push(`Stĺpec „${effectiveIdColumn}“ bol rozpoznaný ako ID a v štatistických výpočtoch sa nepoužíva ako analyzovaná premenná.`);
    if ((statisticalAnalysis.meta as AnyRecord)?.fallbackUsed) warnings.push('Neboli spoľahlivo rozpoznané škály/subškály. Systém použil numerické premenné ako náhradné skóre.');

    const prompt = buildPrompt({
      profile,
      analysisGoal,
      dataDescription,
      filesBlock: fileTexts.join('\n\n------------------------------\n\n'),
      statisticalAnalysis,
    });

    const aiAgent = await runAiInterpretation(prompt);

    let practicalText = defaultPracticalText;
    let interpretation = defaultInterpretation;
    let title = 'Výsledky analýzy';
    let summary = 'Analýza obsahuje frekvenčné tabuľky, deskriptívnu štatistiku škál a subškál, normalitu, reliabilitu, korelácie a odporúčané testy.';

    if (aiAgent.ok && aiAgent.text) {
      try {
        const parsed = parseJsonFromAiText(aiAgent.text);
        practicalText = cleanText(parsed.practicalText) || practicalText;
        interpretation = cleanText(parsed.interpretation) || interpretation;
        title = cleanText(parsed.title) || title;
        summary = cleanText(parsed.summary) || summary;
        if (Array.isArray(parsed.warnings)) warnings.push(...parsed.warnings.map((item: unknown) => cleanText(item)).filter(Boolean));
      } catch {
        warnings.push('AI výstup nebol v presnom JSON formáte. Použitá bola predvolená interpretácia.');
      }
    } else if (aiAgent.error) {
      warnings.push(`AI interpretácia nebola doplnená: ${aiAgent.error}`);
    }

    return NextResponse.json(
      buildResponse({
        title,
        summary,
        rows: extractedRows,
        files,
        computedTables,
        statisticalAnalysis,
        practicalText,
        interpretation,
        warnings,
        aiAgent,
      }),
    );
  } catch (error) {
    console.error('ANALYZE_DATA_ERROR:', error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Nepodarilo sa vykonať analýzu dát.' }, { status: 500 });
  }
}
