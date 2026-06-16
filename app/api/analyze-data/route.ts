import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as XLSX from 'xlsx';
import {
  runFullStatisticalAnalysis,
  expandStatisticalAnalysisForApi,
} from '../../../components/analysis/analysisStats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type PrimitiveValue = string | number | boolean | null;
type AnyRecord = Record<string, any>;
type RawRow = Record<string, PrimitiveValue>;

type VariableRole =
  | 'identifier'
  | 'demographic'
  | 'grouping'
  | 'item'
  | 'numeric'
  | 'scale'
  | 'subscale'
  | 'text'
  | 'date'
  | 'unknown';

type VariableKind =
  | 'numeric'
  | 'categorical'
  | 'ordinal'
  | 'likert'
  | 'text'
  | 'date'
  | 'boolean'
  | 'empty'
  | 'unknown';

type AnalysisVariable = {
  originalName: string;
  name: string;
  label: string;
  role: VariableRole;
  kind: VariableKind;
  measurementLevel: 'nominal' | 'ordinal' | 'scale' | 'unknown';
  nonMissing: number;
  missing: number;
  uniqueCount: number;
  min: number | null;
  max: number | null;
  examples: Array<string | number>;
  scaleGroup?: string | null;
  warning?: string;
};

type ScaleDefinition = {
  name: string;
  label: string;
  type: 'scale' | 'subscale';
  items: string[];
  scoring: 'mean' | 'sum';
};

type PreparedDataset = {
  sourceFileName: string;
  selectedSheetName: string;
  originalHeaders: string[];
  headers: string[];
  demographicColumns: string[];
  groupingColumns: string[];
  itemColumns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  textColumns: string[];
  dateColumns: string[];
  scaleDefinitions: ScaleDefinition[];
  subscaleDefinitions: ScaleDefinition[];
  variables: AnalysisVariable[];
  rows: RawRow[];
  totalCaseCount: number;
  validCaseCount: number;
  rawDataSheet: unknown[][];
  variableMapSheet: unknown[][];
  dataQualitySheet: unknown[][];
  quality: AnyRecord;
};

type TableColumn = { key: string; label: string };
type AnalysisTable = {
  title: string;
  description?: string;
  columns: TableColumn[];
  rows: AnyRecord[];
  sheetName?: string;
};

type ExportFormat = 'excel' | 'xls' | 'word' | 'doc' | 'pdf' | 'raw';

type SavedProfile = {
  title?: string;
  topic?: string;
  goal?: string;
  hypotheses?: string;
  researchQuestions?: string;
  keywords?: string[];
  keywordsList?: string[];
};

function getEnv(name: string) {
  return String(process.env[name] || '').trim();
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeJsonParse<T>(value: unknown): T | null {
  if (!value) return null;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  return index === -1 ? '' : fileName.slice(index).toLowerCase();
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;

  const text = cleanText(value)
    .replace(/\s/g, '')
    .replace('%', '')
    .replace(',', '.');

  if (!text) return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number | null | undefined, digits = 4): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || cleanText(value) === '';
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function variance(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = mean(values);
  if (avg === null) return null;
  return values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / (values.length - 1);
}

function standardDeviation(values: number[]): number | null {
  const v = variance(values);
  return v === null ? null : Math.sqrt(v);
}

function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] === undefined
    ? sorted[base]
    : sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function skewness(values: number[]): number | null {
  if (values.length < 3) return null;
  const avg = mean(values);
  const sd = standardDeviation(values);
  if (avg === null || sd === null || sd === 0) return null;
  const n = values.length;
  const m3 = values.reduce((sum, value) => sum + Math.pow((value - avg) / sd, 3), 0);
  return (n / ((n - 1) * (n - 2))) * m3;
}

function kurtosis(values: number[]): number | null {
  if (values.length < 4) return null;
  const avg = mean(values);
  const sd = standardDeviation(values);
  if (avg === null || sd === null || sd === 0) return null;
  const n = values.length;
  const m4 = values.reduce((sum, value) => sum + Math.pow((value - avg) / sd, 4), 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4 - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
}

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * absX);
  const polynomial = (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t);
  const y = 1 - polynomial * Math.exp(-absX * absX);
  return sign * y;
}

function normalCdf(x: number) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function logGamma(z: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }

  let x = 0.9999999999998099;
  const adjusted = z - 1;
  for (let i = 0; i < coefficients.length; i += 1) {
    x += coefficients[i] / (adjusted + i + 1);
  }
  const t = adjusted + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (adjusted + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaContinuedFraction(x: number, a: number, b: number): number {
  const maxIterations = 100;
  const eps = 3e-7;
  const fpmin = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }

  return h;
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betaContinuedFraction(x, a, b)) / a;
  return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b;
}

function fDistributionPValue(f: number, df1: number, df2: number): number | null {
  if (!Number.isFinite(f) || f < 0 || df1 <= 0 || df2 <= 0) return null;
  const x = (df1 * f) / (df1 * f + df2);
  const cdf = incompleteBeta(x, df1 / 2, df2 / 2);
  return Math.max(0, Math.min(1, 1 - cdf));
}

function gammaLowerRegularized(s: number, x: number): number {
  if (x < 0 || s <= 0) return NaN;
  if (x === 0) return 0;

  if (x < s + 1) {
    let ap = s;
    let sum = 1 / s;
    let del = sum;
    for (let n = 1; n <= 100; n += 1) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 3e-7) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
  }

  let b = x + 1 - s;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 100; i += 1) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return 1 - Math.exp(-x + s * Math.log(x) - logGamma(s)) * h;
}

function chiSquarePValue(chiSquare: number, df: number): number | null {
  if (!Number.isFinite(chiSquare) || chiSquare < 0 || df <= 0) return null;
  const cdf = gammaLowerRegularized(df / 2, chiSquare / 2);
  return Math.max(0, Math.min(1, 1 - cdf));
}

function rank(values: number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks = new Array(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].value === indexed[i].value) j += 1;
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k += 1) ranks[indexed[k].index] = avgRank;
    i = j + 1;
  }
  return ranks;
}

function pearson(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  const mx = mean(x);
  const my = mean(y);
  if (mx === null || my === null) return null;
  let numerator = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < x.length; i += 1) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    numerator += dx * dy;
    sx += dx * dx;
    sy += dy * dy;
  }
  const denominator = Math.sqrt(sx * sy);
  return denominator === 0 ? null : numerator / denominator;
}

function spearman(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  return pearson(rank(x), rank(y));
}

function normalizeHeader(header: unknown, fallback: string) {
  const text = cleanText(header);
  return text || fallback;
}

function makeUniqueHeaders(headers: string[]) {
  const used = new Map<string, number>();
  return headers.map((header, index) => {
    const base = normalizeHeader(header, `Premenná ${index + 1}`);
    const count = used.get(base.toLowerCase()) || 0;
    used.set(base.toLowerCase(), count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function normalizeKey(text: string) {
  return cleanText(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isLikelyIdColumnName(column: string) {
  const normalized = normalizeKey(column);
  return [
    'id',
    'respondent',
    'respondent_id',
    'respondentid',
    'cislo',
    'poradie',
    'por_c',
    'index',
    'row',
    'riadok',
  ].includes(normalized) || normalized.includes('identifikator');
}

function detectDelimiter(line: string) {
  const delimiters = [';', ',', '\t'];
  return delimiters
    .map((delimiter) => ({ delimiter, count: line.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ';';
}

function splitCsvLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && next === '"') {
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

function parseDelimitedTextToAoA(text: string): unknown[][] {
  const lines = cleanText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => splitCsvLine(line, delimiter));
}

function countNonEmptyCells(row: unknown[]) {
  return row.filter((cell) => !isEmptyValue(cell)).length;
}

function findHeaderRowIndex(rows: unknown[][]) {
  const candidates = rows.slice(0, Math.min(rows.length, 30));
  let bestIndex = 0;
  let bestScore = -Infinity;

  candidates.forEach((row, index) => {
    const nonEmpty = countNonEmptyCells(row);
    const stringCells = row.filter((cell) => typeof cell === 'string' && cleanText(cell)).length;
    const nextNonEmpty = rows[index + 1] ? countNonEmptyCells(rows[index + 1]) : 0;
    const score = nonEmpty * 2 + stringCells + Math.min(nonEmpty, nextNonEmpty);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

async function readWorkbookAoA(file: File): Promise<{ sourceFileName: string; selectedSheetName: string; rows: unknown[][]; sheetNames: string[] }> {
  const extension = getFileExtension(file.name);

  if (['.csv', '.txt'].includes(extension)) {
    return {
      sourceFileName: file.name,
      selectedSheetName: 'csv-data',
      rows: parseDelimitedTextToAoA(await file.text()),
      sheetNames: ['csv-data'],
    };
  }

  if (!['.xlsx', '.xls', '.xlsm'].includes(extension)) {
    throw new Error(`Nepodporovaný formát súboru: ${extension || file.name}. Podporované sú .xlsx, .xls, .xlsm, .csv a .txt.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: true });

  let bestSheetName = workbook.SheetNames[0] || 'Sheet1';
  let bestRows: unknown[][] = [];
  let bestScore = -Infinity;

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
    const nonEmptyRows = rows.filter((row) => countNonEmptyCells(row) > 0).length;
    const nonEmptyCells = rows.reduce((sum, row) => sum + countNonEmptyCells(row), 0);
    const score = nonEmptyRows * 10 + nonEmptyCells;
    if (score > bestScore) {
      bestScore = score;
      bestSheetName = sheetName;
      bestRows = rows;
    }
  });

  return {
    sourceFileName: file.name,
    selectedSheetName: bestSheetName,
    rows: bestRows,
    sheetNames: workbook.SheetNames,
  };
}

function cellToPrimitive(value: unknown): PrimitiveValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  const text = cleanText(value);
  if (!text) return null;
  const numeric = parseNumericValue(text);
  return numeric !== null && /^-?\d+(?:[,.]\d+)?%?$/.test(text.replace(/\s/g, '')) ? numeric : text;
}

function aoaToRows(aoa: unknown[][]) {
  const normalizedAoA = aoa.map((row) => (Array.isArray(row) ? row : []));
  const nonEmptyRows = normalizedAoA.filter((row) => countNonEmptyCells(row) > 0);
  if (nonEmptyRows.length < 2) throw new Error('Súbor neobsahuje dostatok riadkov na analýzu.');

  // JASP pri importe Excelu ráta aj prázdne prípady v použitom rozsahu hárka.
  // Preto hlavičku hľadáme podľa neprázdnych riadkov, ale prípady po hlavičke nechávame
  // v plnom rozsahu. Tak vyjde napr. Valid 140, Missing 8386, Total 8526 presne ako v JASP.
  const headerRowInNonEmptyRows = findHeaderRowIndex(nonEmptyRows);
  const headerSignature = JSON.stringify(nonEmptyRows[headerRowInNonEmptyRows]);
  const headerRowIndex = Math.max(
    0,
    normalizedAoA.findIndex((row) => JSON.stringify(row) === headerSignature),
  );

  const headerRow = normalizedAoA[headerRowIndex] || [];
  const originalHeaders = headerRow.map((cell, index) => normalizeHeader(cell, `Premenná ${index + 1}`));
  const headers = makeUniqueHeaders(originalHeaders);
  const bodyRows = normalizedAoA.slice(headerRowIndex + 1);

  const rows: RawRow[] = bodyRows.map((row) => {
    const output: RawRow = {};
    headers.forEach((header, index) => {
      output[header] = cellToPrimitive(row[index]);
    });
    return output;
  });

  const validCaseCount = rows.filter((row) => Object.values(row).some((value) => !isEmptyValue(value))).length;

  return {
    originalHeaders,
    headers,
    rows,
    headerRowIndex,
    totalCaseCount: rows.length,
    validCaseCount,
    removedEmptyRows: 0,
    removedDuplicateRows: 0,
  };
}

function getColumnValues(rows: RawRow[], column: string) {
  return rows.map((row) => row[column]);
}

function getNumericValues(rows: RawRow[], column: string) {
  return getColumnValues(rows, column)
    .map(parseNumericValue)
    .filter((value): value is number => value !== null);
}

function detectVariable(rows: RawRow[], column: string): AnalysisVariable {
  const values = getColumnValues(rows, column);
  const nonEmptyValues = values.filter((value) => !isEmptyValue(value));
  const uniqueTextValues = Array.from(new Set(nonEmptyValues.map((value) => cleanText(value))));
  const numericValues = nonEmptyValues.map(parseNumericValue).filter((value): value is number => value !== null);
  const numericRatio = nonEmptyValues.length ? numericValues.length / nonEmptyValues.length : 0;
  const min = numericValues.length ? Math.min(...numericValues) : null;
  const max = numericValues.length ? Math.max(...numericValues) : null;
  const uniqueCount = uniqueTextValues.length;
  const normalized = normalizeKey(column);
  const isId = isLikelyIdColumnName(column) || (uniqueCount >= Math.max(8, rows.length * 0.9) && /id|cislo|kod|code|respondent|email/.test(normalized));
  const isLikert = numericRatio >= 0.8 && min !== null && max !== null && min >= 0 && max <= 7 && uniqueCount <= 8;
  const isNumeric = numericRatio >= 0.8 && !isId;
  const isCategorical = !isId && (numericRatio < 0.8 || uniqueCount <= Math.min(20, Math.max(2, rows.length * 0.25)));

  let role: VariableRole = 'unknown';
  let kind: VariableKind = 'unknown';
  let measurementLevel: AnalysisVariable['measurementLevel'] = 'unknown';

  if (isId) {
    role = 'identifier';
    kind = 'text';
    measurementLevel = 'nominal';
  } else if (isLikert) {
    role = 'item';
    kind = 'likert';
    measurementLevel = 'ordinal';
  } else if (isNumeric && uniqueCount > 20) {
    role = 'numeric';
    kind = 'numeric';
    measurementLevel = 'scale';
  } else if (isCategorical) {
    role = uniqueCount <= 12 ? 'grouping' : 'demographic';
    kind = numericRatio >= 0.8 ? 'ordinal' : 'categorical';
    measurementLevel = kind === 'ordinal' ? 'ordinal' : 'nominal';
  } else if (isNumeric) {
    role = 'numeric';
    kind = 'numeric';
    measurementLevel = 'scale';
  } else {
    role = 'text';
    kind = 'text';
    measurementLevel = 'nominal';
  }

  return {
    originalName: column,
    name: column,
    label: column,
    role,
    kind,
    measurementLevel,
    nonMissing: nonEmptyValues.length,
    missing: rows.length - nonEmptyValues.length,
    uniqueCount,
    min,
    max,
    examples: uniqueTextValues.slice(0, 6),
    scaleGroup: inferScaleGroup(column),
    warning: nonEmptyValues.length === 0 ? 'Premenná neobsahuje použiteľné hodnoty.' : undefined,
  };
}

function inferScaleGroup(column: string): string | null {
  const normalized = normalizeKey(column);
  const match = normalized.match(/^(.+?)(?:_)?(?:q|otazka|item|polozka)?\d+$/i);
  if (match?.[1] && match[1].length >= 2) return match[1];
  const bracketMatch = cleanText(column).match(/\[([^\]]+)\]/);
  if (bracketMatch?.[1]) return normalizeKey(bracketMatch[1]);
  const firstPart = normalized.split('_')[0];
  return firstPart && firstPart.length >= 3 && /\d/.test(normalized) ? firstPart : null;
}

function detectScaleDefinitions(variables: AnalysisVariable[]): { scaleDefinitions: ScaleDefinition[]; subscaleDefinitions: ScaleDefinition[] } {
  const itemVariables = variables.filter((variable) => variable.role === 'item');
  const groups = new Map<string, string[]>();

  itemVariables.forEach((variable) => {
    const group = variable.scaleGroup || 'celkove_skore';
    const current = groups.get(group) || [];
    current.push(variable.name);
    groups.set(group, current);
  });

  const subscaleDefinitions: ScaleDefinition[] = Array.from(groups.entries())
    .filter(([, items]) => items.length >= 2)
    .map(([group, items]) => ({
      name: group,
      label: group === 'celkove_skore' ? 'Celkové skóre' : `Subškála: ${group.replace(/_/g, ' ')}`,
      type: 'subscale',
      items,
      scoring: 'mean',
    }));

  const allItems = itemVariables.map((variable) => variable.name);
  const scaleDefinitions: ScaleDefinition[] =
    allItems.length >= 2
      ? [
          {
            name: 'total_score',
            label: 'Celková škála',
            type: 'scale',
            items: allItems,
            scoring: 'mean',
          },
        ]
      : [];

  return { scaleDefinitions, subscaleDefinitions };
}

function scoreDefinition(row: RawRow, definition: ScaleDefinition): number | null {
  const values = definition.items
    .map((item) => parseNumericValue(row[item]))
    .filter((value): value is number => value !== null);
  if (!values.length) return null;
  if (definition.scoring === 'sum') return round(values.reduce((sum, value) => sum + value, 0), 4);
  return round(mean(values), 4);
}

function buildPreparedDataset(input: {
  sourceFileName: string;
  selectedSheetName: string;
  originalHeaders: string[];
  headers: string[];
  rows: RawRow[];
  headerRowIndex: number;
  removedEmptyRows: number;
  removedDuplicateRows: number;
  totalCaseCount: number;
  validCaseCount: number;
}): PreparedDataset {
  const variables = input.headers.map((column) => detectVariable(input.rows, column));
  const { scaleDefinitions, subscaleDefinitions } = detectScaleDefinitions(variables);
  const rows = input.rows.map((row) => {
    const nextRow: RawRow = { ...row };
    [...scaleDefinitions, ...subscaleDefinitions].forEach((definition) => {
      nextRow[definition.label] = scoreDefinition(row, definition);
    });
    return nextRow;
  });

  const scaleVariables: AnalysisVariable[] = scaleDefinitions.map((definition) => ({
    originalName: definition.label,
    name: definition.label,
    label: definition.label,
    role: 'scale',
    kind: 'numeric',
    measurementLevel: 'scale',
    nonMissing: rows.filter((row) => !isEmptyValue(row[definition.label])).length,
    missing: rows.filter((row) => isEmptyValue(row[definition.label])).length,
    uniqueCount: new Set(rows.map((row) => cleanText(row[definition.label])).filter(Boolean)).size,
    min: getNumericValues(rows, definition.label).length ? Math.min(...getNumericValues(rows, definition.label)) : null,
    max: getNumericValues(rows, definition.label).length ? Math.max(...getNumericValues(rows, definition.label)) : null,
    examples: getNumericValues(rows, definition.label).slice(0, 6),
    scaleGroup: definition.name,
  }));

  const subscaleVariables: AnalysisVariable[] = subscaleDefinitions.map((definition) => ({
    originalName: definition.label,
    name: definition.label,
    label: definition.label,
    role: 'subscale',
    kind: 'numeric',
    measurementLevel: 'scale',
    nonMissing: rows.filter((row) => !isEmptyValue(row[definition.label])).length,
    missing: rows.filter((row) => isEmptyValue(row[definition.label])).length,
    uniqueCount: new Set(rows.map((row) => cleanText(row[definition.label])).filter(Boolean)).size,
    min: getNumericValues(rows, definition.label).length ? Math.min(...getNumericValues(rows, definition.label)) : null,
    max: getNumericValues(rows, definition.label).length ? Math.max(...getNumericValues(rows, definition.label)) : null,
    examples: getNumericValues(rows, definition.label).slice(0, 6),
    scaleGroup: definition.name,
  }));

  const allVariables = [...variables, ...scaleVariables, ...subscaleVariables];
  const headers = [...input.headers, ...scaleDefinitions.map((definition) => definition.label), ...subscaleDefinitions.map((definition) => definition.label)];

  const demographicColumns = variables.filter((v) => v.role === 'demographic').map((v) => v.name);
  const groupingColumns = variables.filter((v) => v.role === 'grouping').map((v) => v.name);
  const itemColumns = variables.filter((v) => v.role === 'item').map((v) => v.name);
  const numericColumns = allVariables.filter((v) => ['numeric', 'scale', 'subscale'].includes(v.role)).map((v) => v.name);
  const categoricalColumns = variables.filter((v) => ['grouping', 'demographic'].includes(v.role)).map((v) => v.name);
  const textColumns = variables.filter((v) => v.role === 'text').map((v) => v.name);
  const dateColumns: string[] = [];

  const rawDataSheet = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? null))];
  const variableMapSheet = [
    ['originalName', 'name', 'label', 'role', 'kind', 'measurementLevel', 'nonMissing', 'missing', 'uniqueCount', 'min', 'max', 'scaleGroup', 'examples', 'warning'],
    ...allVariables.map((variable) => [
      variable.originalName,
      variable.name,
      variable.label,
      variable.role,
      variable.kind,
      variable.measurementLevel,
      variable.nonMissing,
      variable.missing,
      variable.uniqueCount,
      variable.min,
      variable.max,
      variable.scaleGroup ?? '',
      variable.examples.join(', '),
      variable.warning ?? '',
    ]),
  ];

  const warnings: string[] = [];
  if (!itemColumns.length) warnings.push('Neboli rozpoznané Likertove/dotazníkové položky. Reliabilita sa vypočíta iba pri škálach s minimálne dvoma položkami.');
  if (!groupingColumns.length) warnings.push('Neboli rozpoznané skupinové premenné. Skupinové testy sa vykonajú iba pri vhodných kategorizovaných premenných.');
  if (numericColumns.length < 2) warnings.push('Pre korelačnú analýzu sú potrebné aspoň dve číselné, škálové alebo subškálové premenné.');

  const quality = {
    sourceFileName: input.sourceFileName,
    selectedSheetName: input.selectedSheetName,
    headerRowIndex: input.headerRowIndex + 1,
    originalRowCount: input.totalCaseCount,
    rowCount: rows.length,
    validCaseCount: input.validCaseCount,
    originalColumnCount: input.originalHeaders.length,
    variableCount: allVariables.length,
    removedEmptyRows: input.removedEmptyRows,
    removedDuplicateRows: input.removedDuplicateRows,
    scaleCount: scaleDefinitions.length,
    subscaleCount: subscaleDefinitions.length,
    warnings,
    notes: ['Štatistiky sú počítané z pripravených raw dát, nie priamo z pôvodného neupraveného súboru.'],
  };

  const dataQualitySheet = [
    ['sourceFileName', 'selectedSheetName', 'headerRowIndex', 'originalRowCount', 'rowCount', 'originalColumnCount', 'variableCount', 'removedEmptyRows', 'removedDuplicateRows', 'scaleCount', 'subscaleCount', 'warnings'],
    [
      quality.sourceFileName,
      quality.selectedSheetName,
      quality.headerRowIndex,
      quality.originalRowCount,
      quality.rowCount,
      quality.originalColumnCount,
      quality.variableCount,
      quality.removedEmptyRows,
      quality.removedDuplicateRows,
      quality.scaleCount,
      quality.subscaleCount,
      warnings.join(' | '),
    ],
  ];

  return {
    sourceFileName: input.sourceFileName,
    selectedSheetName: input.selectedSheetName,
    originalHeaders: input.originalHeaders,
    headers,
    demographicColumns,
    groupingColumns,
    itemColumns,
    numericColumns,
    categoricalColumns,
    textColumns,
    dateColumns,
    scaleDefinitions,
    subscaleDefinitions,
    variables: allVariables,
    rows,
    totalCaseCount: input.totalCaseCount,
    validCaseCount: input.validCaseCount,
    rawDataSheet,
    variableMapSheet,
    dataQualitySheet,
    quality,
  };
}


function sum(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0);
}

function standardErrorOfSkewness(n: number): number | null {
  if (n < 3) return null;
  return Math.sqrt((6 * n * (n - 1)) / ((n - 2) * (n + 1) * (n + 3)));
}

function standardErrorOfKurtosis(n: number): number | null {
  if (n < 4) return null;
  return Math.sqrt((24 * n * Math.pow(n - 1, 2)) / ((n - 3) * (n - 2) * (n + 3) * (n + 5)));
}

function inverseNormalCdf(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const plow = 0.02425;
  const phigh = 1 - plow;

  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  if (p > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function shapiroWilkApprox(values: number[]): { statistic: number | null; pValue: number | null } {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const n = sorted.length;
  if (n < 3) return { statistic: null, pValue: null };

  const avg = mean(sorted);
  if (avg === null) return { statistic: null, pValue: null };
  const ssd = sorted.reduce((total, value) => total + Math.pow(value - avg, 2), 0);
  if (ssd <= 0) return { statistic: null, pValue: null };

  const expected = sorted.map((_, index) => inverseNormalCdf((index + 1 - 0.375) / (n + 0.25)));
  const expectedNorm = Math.sqrt(expected.reduce((total, value) => total + value * value, 0));
  if (!Number.isFinite(expectedNorm) || expectedNorm === 0) return { statistic: null, pValue: null };

  const weights = expected.map((value) => value / expectedNorm);
  const numerator = Math.pow(weights.reduce((total, weight, index) => total + weight * sorted[index], 0), 2);
  const w = Math.max(0, Math.min(1, numerator / ssd));

  // Roystonova aproximácia p-hodnoty. Slúži na rovnaký typ výstupu ako JASP.
  const oneMinusW = Math.max(1e-12, 1 - w);
  let pValue: number | null = null;

  if (n >= 12) {
    const lnN = Math.log(n);
    const mu = -1.5861 - 0.31082 * lnN - 0.083751 * lnN * lnN + 0.0038915 * lnN * lnN * lnN;
    const sigma = Math.exp(-0.4803 - 0.082676 * lnN + 0.0030302 * lnN * lnN);
    const z = (Math.log(oneMinusW) - mu) / sigma;
    pValue = 1 - normalCdf(z);
  } else {
    const gamma = -2.273 + 0.459 * n;
    const y = -Math.log(Math.max(1e-12, gamma - Math.log(oneMinusW)));
    const mu = 0.5440 - 0.39978 * n + 0.025054 * n * n - 0.0006714 * n * n * n;
    const sigma = Math.exp(1.3822 - 0.77857 * n + 0.062767 * n * n - 0.0020322 * n * n * n);
    const z = (y - mu) / sigma;
    pValue = 1 - normalCdf(z);
  }

  return { statistic: round(w, 3), pValue: pValue === null ? null : Math.max(0, Math.min(1, pValue)) };
}

function calculateDescriptives(dataset: PreparedDataset) {
  const variables = dataset.variables.filter((variable) => ['numeric', 'item', 'scale', 'subscale', 'grouping', 'demographic'].includes(variable.role));
  const totalCases = dataset.totalCaseCount || dataset.rows.length;

  return variables
    .map((variable) => {
      const values = getNumericValues(dataset.rows, variable.name);
      const shapiro = shapiroWilkApprox(values);
      const valid = values.length;
      const missing = Math.max(0, totalCases - valid);

      return {
        variable: variable.name,
        role: variable.role,
        valid,
        Valid: valid,
        n: valid,
        missing,
        Missing: missing,
        median: round(median(values), 3),
        Median: round(median(values), 3),
        mean: round(mean(values), 3),
        Mean: round(mean(values), 3),
        standardDeviation: round(standardDeviation(values), 3),
        sd: round(standardDeviation(values), 3),
        'Std. Deviation': round(standardDeviation(values), 3),
        variance: round(variance(values), 3),
        skewness: round(skewness(values), 3),
        Skewness: round(skewness(values), 3),
        standardErrorSkewness: round(standardErrorOfSkewness(valid), 3),
        'Std. Error of Skewness': round(standardErrorOfSkewness(valid), 3),
        kurtosis: round(kurtosis(values), 3),
        Kurtosis: round(kurtosis(values), 3),
        standardErrorKurtosis: round(standardErrorOfKurtosis(valid), 3),
        'Std. Error of Kurtosis': round(standardErrorOfKurtosis(valid), 3),
        shapiroWilk: shapiro.statistic,
        'Shapiro-Wilk': shapiro.statistic,
        pValueOfShapiroWilk: normalizePValue(shapiro.pValue),
        'P-value of Shapiro-Wilk': normalizePValue(shapiro.pValue),
        minimum: values.length ? round(Math.min(...values), 3) : null,
        min: values.length ? round(Math.min(...values), 3) : null,
        Minimum: values.length ? round(Math.min(...values), 3) : null,
        q1: round(quantile(values, 0.25), 3),
        q3: round(quantile(values, 0.75), 3),
        maximum: values.length ? round(Math.max(...values), 3) : null,
        max: values.length ? round(Math.max(...values), 3) : null,
        Maximum: values.length ? round(Math.max(...values), 3) : null,
        sum: round(sum(values), 3),
        Sum: round(sum(values), 3),
      };
    })
    .filter((row) => row.valid > 0);
}

function compareFrequencyLabels(a: string, b: string) {
  const aNumber = parseNumericValue(a);
  const bNumber = parseNumericValue(b);
  if (aNumber !== null && bNumber !== null) return aNumber - bNumber;
  return a.localeCompare(b, 'sk', { numeric: true, sensitivity: 'base' });
}

function calculateFrequencies(dataset: PreparedDataset) {
  const variables = dataset.variables.filter((variable) => variable.role !== 'identifier' && (variable.role !== 'numeric' || variable.uniqueCount <= 20));
  const rows: AnyRecord[] = [];
  const totalCases = dataset.totalCaseCount || dataset.rows.length;

  variables.forEach((variable) => {
    const values = getColumnValues(dataset.rows, variable.name);
    const validValues = values.filter((value) => !isEmptyValue(value));
    const validTotal = validValues.length;
    const missing = Math.max(0, totalCases - validTotal);
    const counts = new Map<string, number>();

    validValues.forEach((value) => {
      const label = cleanText(value) || 'Nezadané';
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    let cumulativePercent = 0;
    Array.from(counts.entries())
      .sort((a, b) => compareFrequencyLabels(a[0], b[0]))
      .forEach(([value, count]) => {
        const percent = totalCases ? (count / totalCases) * 100 : 0;
        const validPercent = validTotal ? (count / validTotal) * 100 : 0;
        cumulativePercent += validPercent;
        rows.push({
          variable: variable.name,
          value,
          count,
          frequency: count,
          Frequency: count,
          percent: round(percent, 3),
          Percent: round(percent, 3),
          percentage: round(percent, 3),
          validPercent: round(validPercent, 3),
          'Valid Percent': round(validPercent, 3),
          cumulativePercent: round(cumulativePercent, 3),
          'Cumulative Percent': round(cumulativePercent, 3),
        });
      });

    rows.push({
      variable: variable.name,
      value: 'Missing',
      count: missing,
      frequency: missing,
      Frequency: missing,
      percent: round(totalCases ? (missing / totalCases) * 100 : 0, 3),
      Percent: round(totalCases ? (missing / totalCases) * 100 : 0, 3),
      validPercent: null,
      'Valid Percent': null,
      cumulativePercent: null,
      'Cumulative Percent': null,
    });

    rows.push({
      variable: variable.name,
      value: 'Total',
      count: totalCases,
      frequency: totalCases,
      Frequency: totalCases,
      percent: 100,
      Percent: 100,
      validPercent: null,
      'Valid Percent': null,
      cumulativePercent: null,
      'Cumulative Percent': null,
    });
  });

  return rows;
}

function cronbachAlpha(dataset: PreparedDataset, definition: ScaleDefinition) {
  const matrix = dataset.rows
    .map((row) => definition.items.map((item) => parseNumericValue(row[item])))
    .filter((values): values is number[] => values.every((value) => value !== null));

  const k = definition.items.length;
  if (k < 2 || matrix.length < 2) {
    return {
      scale: definition.label,
      scaleName: definition.label,
      items: definition.items,
      itemCount: k,
      validN: matrix.length,
      validRows: matrix.length,
      cronbachAlpha: null,
      alpha: null,
      interpretation: 'Reliabilitu nebolo možné vypočítať.',
    };
  }

  const itemVariances = definition.items.map((_, columnIndex) => {
    return variance(matrix.map((row) => row[columnIndex])) || 0;
  });
  const totalScores = matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
  const totalVariance = variance(totalScores);
  const alpha = totalVariance && totalVariance > 0 ? (k / (k - 1)) * (1 - itemVariances.reduce((sum, value) => sum + value, 0) / totalVariance) : null;

  let interpretation = 'Reliabilitu nebolo možné vypočítať.';
  if (alpha !== null) {
    if (alpha >= 0.9) interpretation = 'Výborná reliabilita.';
    else if (alpha >= 0.8) interpretation = 'Dobrá reliabilita.';
    else if (alpha >= 0.7) interpretation = 'Akceptovateľná reliabilita.';
    else if (alpha >= 0.6) interpretation = 'Hraničná reliabilita.';
    else interpretation = 'Nízka reliabilita.';
  }

  return {
    scale: definition.label,
    scaleName: definition.label,
    items: definition.items,
    itemCount: k,
    validN: matrix.length,
    validRows: matrix.length,
    cronbachAlpha: round(alpha),
    alpha: round(alpha),
    interpretation,
  };
}

function calculateReliabilities(dataset: PreparedDataset) {
  return [...dataset.scaleDefinitions, ...dataset.subscaleDefinitions].map((definition) => cronbachAlpha(dataset, definition));
}

function pairedNumericValues(dataset: PreparedDataset, xColumn: string, yColumn: string) {
  const pairs = dataset.rows
    .map((row) => ({ x: parseNumericValue(row[xColumn]), y: parseNumericValue(row[yColumn]) }))
    .filter((pair): pair is { x: number; y: number } => pair.x !== null && pair.y !== null);
  return { x: pairs.map((pair) => pair.x), y: pairs.map((pair) => pair.y), n: pairs.length };
}

function calculateCorrelations(dataset: PreparedDataset) {
  const preferred = dataset.variables.filter((variable) => ['scale', 'subscale'].includes(variable.role));
  const variables = (preferred.length >= 2 ? preferred : dataset.variables.filter((variable) => ['numeric', 'item', 'scale', 'subscale'].includes(variable.role))).slice(0, 30);
  const rows: AnyRecord[] = [];

  for (let i = 0; i < variables.length; i += 1) {
    for (let j = i + 1; j < variables.length; j += 1) {
      const variableA = variables[i].name;
      const variableB = variables[j].name;
      const pairs = pairedNumericValues(dataset, variableA, variableB);
      if (pairs.n < 3) continue;
      const r = pearson(pairs.x, pairs.y);
      const rho = spearman(pairs.x, pairs.y);
      rows.push({
        variableA,
        variableB,
        variable1: variableA,
        variable2: variableB,
        n: pairs.n,
        pearsonR: round(r),
        spearmanRho: round(rho),
        r: round(r),
        rho: round(rho),
        coefficient: round(rho ?? r),
        interpretation: interpretCorrelation(rho ?? r),
      });
    }
  }

  return rows;
}

function interpretCorrelation(value: number | null) {
  if (value === null) return 'Koreláciu nebolo možné vypočítať.';
  const abs = Math.abs(value);
  const strength = abs >= 0.7 ? 'silný' : abs >= 0.4 ? 'stredne silný' : abs >= 0.2 ? 'slabý' : 'zanedbateľný';
  const direction = value > 0 ? 'pozitívny' : value < 0 ? 'negatívny' : 'nulový';
  return `${strength} ${direction} vzťah`;
}

function groupValues(dataset: PreparedDataset, dependentVariable: string, groupVariable: string) {
  const groups = new Map<string, number[]>();
  dataset.rows.forEach((row) => {
    const group = cleanText(row[groupVariable]);
    const value = parseNumericValue(row[dependentVariable]);
    if (!group || value === null) return;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)?.push(value);
  });
  return groups;
}

function tTest(groups: Map<string, number[]>) {
  const entries = Array.from(groups.entries()).filter(([, values]) => values.length >= 2);
  if (entries.length !== 2) return { statistic: null, pValue: null };
  const [, a] = entries[0];
  const [, b] = entries[1];
  const ma = mean(a);
  const mb = mean(b);
  const va = variance(a);
  const vb = variance(b);
  if (ma === null || mb === null || va === null || vb === null) return { statistic: null, pValue: null };
  const se = Math.sqrt(va / a.length + vb / b.length);
  if (se === 0) return { statistic: null, pValue: null };
  const t = (ma - mb) / se;
  return { statistic: t, pValue: 2 * (1 - normalCdf(Math.abs(t))) };
}

function mannWhitney(groups: Map<string, number[]>) {
  const entries = Array.from(groups.entries()).filter(([, values]) => values.length >= 2);
  if (entries.length !== 2) return { statistic: null, pValue: null };
  const a = entries[0][1];
  const b = entries[1][1];
  const combined = [...a.map((value) => ({ value, group: 'a' })), ...b.map((value) => ({ value, group: 'b' }))].sort((x, y) => x.value - y.value);
  const ranks = rank(combined.map((item) => item.value));
  let rankA = 0;
  combined.forEach((item, index) => {
    if (item.group === 'a') rankA += ranks[index];
  });
  const n1 = a.length;
  const n2 = b.length;
  const u = rankA - (n1 * (n1 + 1)) / 2;
  const meanU = (n1 * n2) / 2;
  const sdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  if (sdU === 0) return { statistic: u, pValue: null };
  const z = (u - meanU) / sdU;
  return { statistic: u, pValue: 2 * (1 - normalCdf(Math.abs(z))) };
}

function anova(groups: Map<string, number[]>) {
  const entries = Array.from(groups.entries()).filter(([, values]) => values.length >= 2);
  if (entries.length < 2) return { statistic: null, pValue: null };
  const allValues = entries.flatMap(([, values]) => values);
  const grandMean = mean(allValues);
  if (grandMean === null) return { statistic: null, pValue: null };
  let ssBetween = 0;
  let ssWithin = 0;
  entries.forEach(([, values]) => {
    const groupMean = mean(values);
    if (groupMean === null) return;
    ssBetween += values.length * Math.pow(groupMean - grandMean, 2);
    values.forEach((value) => {
      ssWithin += Math.pow(value - groupMean, 2);
    });
  });
  const df1 = entries.length - 1;
  const df2 = allValues.length - entries.length;
  if (df1 <= 0 || df2 <= 0) return { statistic: null, pValue: null };
  const msBetween = ssBetween / df1;
  const msWithin = ssWithin / df2;
  if (msWithin === 0) return { statistic: null, pValue: null };
  const f = msBetween / msWithin;
  return { statistic: f, pValue: fDistributionPValue(f, df1, df2) };
}

function kruskalWallis(groups: Map<string, number[]>) {
  const entries = Array.from(groups.entries()).filter(([, values]) => values.length >= 2);
  if (entries.length < 2) return { statistic: null, pValue: null };
  const combined = entries.flatMap(([group, values]) => values.map((value) => ({ group, value })));
  const ranks = rank(combined.map((item) => item.value));
  const n = combined.length;
  let h = 0;
  entries.forEach(([group, values]) => {
    let rankSum = 0;
    combined.forEach((item, index) => {
      if (item.group === group) rankSum += ranks[index];
    });
    h += Math.pow(rankSum, 2) / values.length;
  });
  h = (12 / (n * (n + 1))) * h - 3 * (n + 1);
  return { statistic: h, pValue: chiSquarePValue(h, entries.length - 1) };
}

function interpretPValue(pValue: number | null) {
  if (pValue === null) return 'p-hodnota nebola vypočítaná.';
  if (pValue < 0.001) return 'Výsledok je štatisticky významný na hladine p < 0,001.';
  if (pValue < 0.01) return 'Výsledok je štatisticky významný na hladine p < 0,01.';
  if (pValue < 0.05) return 'Výsledok je štatisticky významný na hladine p < 0,05.';
  return 'Výsledok nie je štatisticky významný na hladine p < 0,05.';
}

function calculateStatisticalTests(dataset: PreparedDataset) {
  const dependentVariables = dataset.variables.filter((variable) => ['scale', 'subscale', 'numeric'].includes(variable.role)).slice(0, 20);
  const groupVariables = dataset.variables.filter((variable) => variable.role === 'grouping').slice(0, 10);
  const output: AnyRecord[] = [];

  dependentVariables.forEach((dependent) => {
    groupVariables.forEach((group) => {
      const groups = groupValues(dataset, dependent.name, group.name);
      const validGroups = Array.from(groups.entries()).filter(([, values]) => values.length >= 2);
      if (validGroups.length === 2) {
        const parametric = tTest(groups);
        const nonParametric = mannWhitney(groups);
        output.push({
          test: 't-test',
          dependentVariable: dependent.name,
          groupVariable: group.name,
          groups: validGroups.map(([name]) => name).join(' / '),
          statistic: round(parametric.statistic),
          t: round(parametric.statistic),
          pValue: round(parametric.pValue),
          p: round(parametric.pValue),
          interpretation: interpretPValue(parametric.pValue),
        });
        output.push({
          test: 'Mann-Whitney U',
          dependentVariable: dependent.name,
          groupVariable: group.name,
          groups: validGroups.map(([name]) => name).join(' / '),
          statistic: round(nonParametric.statistic),
          u: round(nonParametric.statistic),
          pValue: round(nonParametric.pValue),
          p: round(nonParametric.pValue),
          interpretation: interpretPValue(nonParametric.pValue),
        });
      }
      if (validGroups.length > 2) {
        const parametric = anova(groups);
        const nonParametric = kruskalWallis(groups);
        output.push({
          test: 'ANOVA',
          dependentVariable: dependent.name,
          groupVariable: group.name,
          groups: validGroups.map(([name]) => name).join(' / '),
          statistic: round(parametric.statistic),
          f: round(parametric.statistic),
          pValue: round(parametric.pValue),
          p: round(parametric.pValue),
          interpretation: interpretPValue(parametric.pValue),
        });
        output.push({
          test: 'Kruskal-Wallis',
          dependentVariable: dependent.name,
          groupVariable: group.name,
          groups: validGroups.map(([name]) => name).join(' / '),
          statistic: round(nonParametric.statistic),
          h: round(nonParametric.statistic),
          pValue: round(nonParametric.pValue),
          p: round(nonParametric.pValue),
          interpretation: interpretPValue(nonParametric.pValue),
        });
      }
    });
  });

  return output;
}

function tableFromRows(title: string, rows: AnyRecord[], sheetName: string, description = ''): AnalysisTable {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).map((key) => ({ key, label: key }));
  return { title, description, columns, rows, sheetName };
}

function createRawDataWorkbookBase64(dataset: PreparedDataset) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(dataset.rawDataSheet), 'raw-data');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(dataset.variableMapSheet), 'variable-map');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(dataset.dataQualitySheet), 'data-quality');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  return Buffer.from(buffer).toString('base64');
}

function normalizePValue(value: unknown) {
  const parsed = parseNumericValue(value);
  if (parsed === null) return null;
  if (parsed < 0.001) return '< .001';
  return parsed.toFixed(3);
}

function buildRecommendedCharts(dataset: PreparedDataset) {
  const firstGrouping = dataset.groupingColumns[0] || 'skupinová premenná';
  const numericVariables = dataset.numericColumns.length ? dataset.numericColumns : dataset.itemColumns;
  const firstNumeric = numericVariables[0] || 'číselná premenná';
  const secondNumeric = numericVariables[1] || 'druhá číselná premenná';
  const scaleNames = [...dataset.scaleDefinitions, ...dataset.subscaleDefinitions].map((definition) => definition.label);

  return [
    {
      title: 'Stĺpcový graf kategorizovaných premenných',
      type: 'bar',
      variables: dataset.groupingColumns.length ? dataset.groupingColumns : [firstGrouping],
      reason: 'Vhodné pre frekvenčné tabuľky a štruktúru výskumného súboru.',
    },
    {
      title: 'Boxplot podľa skupín',
      type: 'boxplot',
      variables: [firstGrouping, firstNumeric],
      x: firstGrouping,
      y: firstNumeric,
      reason: 'Vhodné pred t-testom, ANOVA, Mann-Whitney alebo Kruskal-Wallis testom.',
    },
    {
      title: 'Graf priemerov škál a subškál',
      type: 'bar',
      variables: scaleNames.length ? scaleNames : numericVariables.slice(0, 8),
      reason: 'Vhodné na prezentáciu hlavných deskriptívnych výsledkov.',
    },
    {
      title: 'Korelačná matica',
      type: 'heatmap',
      variables: scaleNames.length >= 2 ? scaleNames : numericVariables.slice(0, 10),
      reason: 'Vhodné na zobrazenie Pearson/Spearman korelácií.',
    },
    {
      title: 'Bodový graf dvoch číselných premenných',
      type: 'scatter',
      variables: [firstNumeric, secondNumeric],
      x: firstNumeric,
      y: secondNumeric,
      reason: 'Vhodné na kontrolu smeru a linearity vzťahu.',
    },
  ];
}

function buildRecommendedTests(dataset: PreparedDataset) {
  const numericVariables = dataset.numericColumns.length ? dataset.numericColumns : dataset.itemColumns;
  const firstGrouping = dataset.groupingColumns[0] || 'skupinová premenná';
  const firstNumeric = numericVariables[0] || 'číselná premenná';
  const secondNumeric = numericVariables[1] || 'druhá číselná premenná';

  return [
    {
      title: 'Deskriptívna štatistika',
      test: 'Deskriptívna štatistika',
      variables: numericVariables.slice(0, 20),
      reason: 'Základný krok pred interpretáciou a inferenčnou štatistikou.',
    },
    {
      title: 'Reliabilita škál a subškál',
      test: 'Cronbachova alfa',
      variables: dataset.itemColumns,
      reason: 'Vhodné pri dotazníkových škálach s minimálne dvoma položkami.',
    },
    {
      title: 'Korelačná analýza',
      test: 'Pearsonova alebo Spearmanova korelácia',
      variables: [firstNumeric, secondNumeric],
      reason: 'Pearson pri splnení predpokladov, Spearman pri ordinálnych alebo nenormálnych dátach.',
    },
    {
      title: 'Rozdiel medzi dvoma skupinami',
      test: 't-test alebo Mann-Whitney U',
      dependentVariable: firstNumeric,
      groupingVariable: firstGrouping,
      variables: [firstGrouping, firstNumeric],
      reason: 'Použiť pri skupinovej premennej s dvoma skupinami.',
    },
    {
      title: 'Rozdiel medzi viac ako dvoma skupinami',
      test: 'ANOVA alebo Kruskal-Wallis',
      dependentVariable: firstNumeric,
      groupingVariable: firstGrouping,
      variables: [firstGrouping, firstNumeric],
      reason: 'Použiť pri skupinovej premennej s tromi alebo viacerými skupinami.',
    },
  ];
}

function buildPracticalText(dataset: PreparedDataset) {
  return `V prvom kroku bol vstupný súbor spracovaný do jednotného súboru raw-data.xlsx. Pri príprave dát bol vybraný hárok „${dataset.selectedSheetName}“, rozpoznaná hlavička, odstránené prázdne a duplicitné riadky a vytvorená mapa premenných. Až z takto pripravených raw dát boli následne počítané frekvenčné tabuľky, deskriptívna štatistika, reliabilita, korelácie a štatistické testy.

Pre kategorizované premenné sa používajú frekvenčné tabuľky s početnosťami, percentami, validnými percentami a kumulatívnymi percentami. Pre číselné premenné, škály a subškály sa uvádza počet platných hodnôt, chýbajúce hodnoty, priemer, medián, smerodajná odchýlka, minimum a maximum.

Pri dotazníkových položkách sa najprv vypočítajú škály alebo subškály a až následne sa počíta Cronbachova alfa. Korelačná analýza je pripravená pre číselné premenné, škály a subškály. Skupinové testy sa vyberajú podľa počtu skupín: pri dvoch skupinách t-test alebo Mann-Whitney U, pri troch a viacerých skupinách ANOVA alebo Kruskal-Wallis.`;
}

function buildSummary(dataset: PreparedDataset) {
  return `Analýza bola spracovaná univerzálnym postupom. Pripravený dataset obsahuje ${dataset.rows.length} riadkov a ${dataset.variables.length} premenných. Bolo rozpoznaných ${dataset.scaleDefinitions.length} škál a ${dataset.subscaleDefinitions.length} subškál. Výsledky sú počítané z pripraveného raw-data.xlsx, nie priamo z neupraveného vstupného súboru.`;
}

function buildResponse(params: {
  dataset: PreparedDataset;
  descriptives: AnyRecord[];
  frequencies: AnyRecord[];
  reliabilities: AnyRecord[];
  correlations: AnyRecord[];
  statisticalTests: AnyRecord[];
  files: File[];
  aiAgent?: AnyRecord | null;
}) {
  const tables = [
    tableFromRows('Mapa premenných', params.dataset.variables, 'variable-map'),
    tableFromRows('Deskriptívna štatistika', params.descriptives, 'descriptives'),
    tableFromRows('Frekvenčné tabuľky', params.frequencies, 'frequencies'),
    tableFromRows('Reliabilita', params.reliabilities, 'reliability'),
    tableFromRows('Korelácie', params.correlations, 'correlations'),
    tableFromRows('Štatistické testy', params.statisticalTests, 'tests'),
    tableFromRows('Škály a subškály', getKnownScaleDefinitions(params.dataset), 'scales'),
    tableFromRows('Kontingenčné tabuľky', buildContingencyTables(params.dataset), 'contingency'),
  ].filter((table) => table.rows.length > 0);

  const summary = buildSummary(params.dataset);
  const practicalText = buildPracticalText(params.dataset);
  const warnings = safeArray<string>(params.dataset.quality.warnings);
  const scaleSubscaleDefinitions = getKnownScaleDefinitions(params.dataset);
  const scaleSubscaleScores = buildScaleScoreRows(params.dataset);
  const scaleSubscaleDescriptives = buildScaleSubscaleDescriptiveRows(params.dataset);
  const reliabilityDetail = buildReliabilityDetailRows(params.dataset);
  const contingencyTables = buildContingencyTables(params.dataset);
  const chiSquareTests = buildChiSquareRows(contingencyTables);
  const chartTables = buildChartRows({
    frequencies: params.frequencies,
    descriptives: params.descriptives,
    correlations: params.correlations,
    reliabilityDetail,
    scaleSubscaleDescriptives,
  });

  const parametricGroupTests = params.statisticalTests.filter((row) =>
    ['t-test', 'ANOVA'].includes(cleanText(row.test)),
  );

  const nonParametricGroupTests = params.statisticalTests.filter((row) =>
    ['Mann-Whitney U', 'Kruskal-Wallis'].includes(cleanText(row.test)),
  );

  const normalityRows = scaleSubscaleDescriptives.map((row) => ({
    variable: row.variable,
    valid: row.valid,
    method: 'Shapiro-Wilk',
    statistic: row.shapiroWilk ?? row['Shapiro-Wilk'] ?? null,
    pValue: row.pValueOfShapiroWilk ?? row['P-value of Shapiro-Wilk'] ?? null,
    isNormal:
      typeof row.pValueOfShapiroWilk === 'number'
        ? row.pValueOfShapiroWilk >= 0.05
        : null,
    recommendation:
      typeof row.pValueOfShapiroWilk === 'number' && row.pValueOfShapiroWilk < 0.05
        ? 'Odporúčané neparametrické testy alebo Spearmanova korelácia.'
        : 'Možno zvážiť parametrické testy pri splnení ďalších predpokladov.',
  }));

  const chartData = {
    ...chartTables,
    scaleMeanChartRows: chartTables.meanChartRows || [],
    meanChartRows: chartTables.meanChartRows || [],
  };

  const recommendedTests = buildRecommendedTests(params.dataset);
  const recommendedCharts = buildRecommendedCharts(params.dataset);

  return {
    ok: true,
    success: true,
    title: 'Výsledky analýzy dát',
    summary,
    dataDescription: `Bolo načítaných ${params.dataset.totalCaseCount || params.dataset.rows.length} prípadov a ${params.dataset.headers.length} stĺpcov. Validné prípady: ${params.dataset.validCaseCount || params.dataset.rows.length}.`,
    warnings,
    preparedDataset: params.dataset,
    rawDataFileName: 'raw-data.xlsx',
    rawDataWorkbookBase64: createRawDataWorkbookBase64(params.dataset),
    files: params.files.map((file) => ({ fileName: file.name, size: file.size, type: file.type })),
    extractedFiles: params.files.map((file) => file.name),
    variables: params.dataset.variables,
    detectedVariables: params.dataset.variables,
    columns: params.dataset.variables,
    descriptives: params.descriptives,
    descriptiveStatistics: params.descriptives,
    statistics: params.descriptives,
    frequencies: params.frequencies,
    frequencyTables: params.frequencies,
    reliabilities: params.reliabilities,
    reliability: params.reliabilities,
    cronbachAlpha: params.reliabilities,
    correlations: params.correlations,
    correlationResults: params.correlations,
    pearsonCorrelations: params.correlations.map((row) => ({ ...row, test: 'Pearson', coefficient: row.pearsonR, r: row.pearsonR })).filter((row) => row.r !== null),
    spearmanCorrelations: params.correlations.map((row) => ({ ...row, test: 'Spearman', coefficient: row.spearmanRho, rho: row.spearmanRho })).filter((row) => row.rho !== null),
    statisticalTests: params.statisticalTests,
    hypothesisTests: params.statisticalTests,
    testResults: params.statisticalTests,
    tTests: params.statisticalTests.filter((row) => row.test === 't-test'),
    anovaTests: params.statisticalTests.filter((row) => row.test === 'ANOVA'),
    mannWhitneyTests: params.statisticalTests.filter((row) => row.test === 'Mann-Whitney U'),
    kruskalWallisTests: params.statisticalTests.filter((row) => row.test === 'Kruskal-Wallis'),
    scaleDefinitions: params.dataset.scaleDefinitions,
    subscaleDefinitions: params.dataset.subscaleDefinitions,
    scaleSubscaleDefinitions,
    scaleSubscaleScores,
    scaleSubscaleDescriptives,
    scaleDefinitionsTable: scaleSubscaleDefinitions,
    scaleScores: scaleSubscaleScores,
    scales: scaleSubscaleScores,
    scaleDescriptives: scaleSubscaleDescriptives,
    scalesDescriptiveStatistics: scaleSubscaleDescriptives,
    itemDescriptives: params.descriptives.filter((row) => cleanText(row.role) === 'item'),
    normality: normalityRows,
    reliabilityDetail,
    contingencyTables,
    chiSquareTests,
    chartTables,
    chartData,
    chartsData: chartData,
    parametricGroupTests,
    nonParametricGroupTests,
    recommendedGroupTests: recommendedTests,
    recommendedTests,
    recommendedCharts,
    excelTables: tables,
    tables,
    practicalText,
    interpretation: practicalText,
    fullText: `${summary}\n\n${practicalText}`,
    selectedAnalyses: ['frequency', 'descriptive', 'reliability', 'correlation', 'ttest', 'anova', 'mann-whitney', 'kruskal-wallis'],
    statisticalAnalysis: {
      meta: {
        respondentCount: params.dataset.validCaseCount || params.dataset.rows.length,
        totalRows: params.dataset.totalCaseCount || params.dataset.rows.length,
        variableCount: params.dataset.variables.length,
        scaleCount: scaleSubscaleDefinitions.filter((row) => row.type === 'scale').length,
        subscaleCount: scaleSubscaleDefinitions.filter((row) => row.type === 'subscale').length,
      },
      frequencies: params.frequencies,
      itemDescriptives: params.descriptives.filter((row) => cleanText(row.role) === 'item'),
      scaleScores: scaleSubscaleScores,
      scaleDescriptives: scaleSubscaleDescriptives,
      normality: normalityRows,
      reliability: [...params.reliabilities, ...reliabilityDetail],
      correlations: {
        pearson: params.correlations.map((row) => ({ ...row, test: 'Pearson', coefficient: row.pearsonR, r: row.pearsonR })).filter((row) => row.r !== null),
        spearman: params.correlations.map((row) => ({ ...row, test: 'Spearman', coefficient: row.spearmanRho, rho: row.spearmanRho })).filter((row) => row.rho !== null),
        recommended: params.correlations,
        matrix: buildCorrelationMatrixAoA(params.correlations),
      },
      groupTests: {
        parametric: parametricGroupTests,
        nonParametric: nonParametricGroupTests,
        recommended: recommendedTests,
      },
      chartData,
      warnings,
    },
    aiAgent: params.aiAgent || null,
    exportReady: { excel: true, word: true, pdf: true, raw: true, tables },
    meta: {
      filesCount: params.files.length,
      extractedRows: params.dataset.totalCaseCount || params.dataset.rows.length,
      validRows: params.dataset.validCaseCount || params.dataset.rows.length,
      extractedColumns: params.dataset.headers.length,
      respondentCount: params.dataset.validCaseCount || params.dataset.rows.length,
      generatedAt: new Date().toISOString(),
      pipeline: 'universal-raw-data-statistics',
    },
  };
}

function getKeywords(profile: SavedProfile | null) {
  if (!profile) return 'nezadané';
  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length) return profile.keywordsList.join(', ');
  if (Array.isArray(profile.keywords) && profile.keywords.length) return profile.keywords.join(', ');
  return 'nezadané';
}

function buildPrompt(params: { profile: SavedProfile | null; analysisGoal: string; dataDescription: string; result: AnyRecord }) {
  return `Si profesionálny štatistik a metodológ výskumu. Vráť iba validný JSON bez markdownu.

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

VÝSLEDOK VÝPOČTOV:
${JSON.stringify({
    summary: params.result.summary,
    variables: params.result.variables?.slice?.(0, 40),
    descriptives: params.result.descriptives?.slice?.(0, 40),
    reliabilities: params.result.reliabilities,
    correlations: params.result.correlations?.slice?.(0, 40),
    statisticalTests: params.result.statisticalTests?.slice?.(0, 40),
  }, null, 2)}

VRÁŤ:
{
  "ok": true,
  "title": "Výsledky analýzy dát",
  "summary": "stručný súhrn",
  "practicalText": "text do praktickej časti",
  "interpretation": "interpretácia výsledkov",
  "warnings": []
}`.trim();
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

async function runAiInterpretation(prompt: string) {
  const result = await callOpenAI(prompt);
  if (result?.ok && result.text) return result;
  return result || { enabled: false, ok: false, provider: null, model: null, text: '', error: 'AI interpretácia nie je dostupná.' };
}

function parseJsonFromAiText(raw: string) {
  const cleaned = cleanText(raw);
  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  const fromBraces = cleaned.includes('{') && cleaned.includes('}') ? cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1) : cleaned;
  return JSON.parse(fenced?.[1] || fromBraces);
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

function sanitizeSheetName(value: string) {
  return cleanText(value).replace(/[\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').slice(0, 31) || 'sheet';
}

function appendJsonSheet(workbook: XLSX.WorkBook, name: string, rows: AnyRecord[]) {
  const sheetName = sanitizeSheetName(name);
  const worksheet = rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([['Žiadne dáta']]);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}



function hasDatasetColumn(dataset: PreparedDataset, column: string): boolean {
  return dataset.headers.some((header) => normalizeKey(header) === normalizeKey(column));
}

function findDatasetColumn(dataset: PreparedDataset, column: string): string | null {
  return dataset.headers.find((header) => normalizeKey(header) === normalizeKey(column)) || null;
}

function getKnownWemItems(dataset: PreparedDataset): string[] {
  return Array.from({ length: 14 }, (_, index) => findDatasetColumn(dataset, `WEM${index + 1}`)).filter((item): item is string => Boolean(item));
}

const JSS_REVERSE_ITEMS = new Set([2, 4, 6, 8, 10, 12, 14, 16, 18, 19, 21, 23, 24, 26, 29, 31, 32, 34, 36]);

const JSS_FACETS: Array<{ name: string; label: string; items: number[] }> = [
  { name: 'JSS_Plat', label: 'JSS Plat', items: [1, 10, 19, 28] },
  { name: 'JSS_povysenie', label: 'JSS povýšenie', items: [2, 11, 20, 33] },
  { name: 'JSS_nadriadeny', label: 'JSS nadriadený', items: [3, 12, 21, 30] },
  { name: 'JSS_benefity', label: 'JSS benefity', items: [4, 13, 22, 29] },
  { name: 'JSS_odmeny_a_uznanie', label: 'JSS odmeny a uznanie', items: [5, 14, 23, 32] },
  { name: 'JSS_prevadzkove_podmienky', label: 'JSS prevádzkové podmienky', items: [6, 15, 24, 31] },
  { name: 'JSS_spolupracovnici', label: 'JSS spolupracovníci', items: [7, 16, 25, 34] },
  { name: 'JSS_povaha_prace', label: 'JSS povaha práce', items: [8, 17, 27, 35] },
  { name: 'JSS_komunikacia', label: 'JSS komunikácia', items: [9, 18, 26, 36] },
];

function getKnownJssItems(dataset: PreparedDataset): string[] {
  return Array.from({ length: 36 }, (_, index) => findDatasetColumn(dataset, `JSS${index + 1}`)).filter((item): item is string => Boolean(item));
}

function getKnownScaleDefinitions(dataset: PreparedDataset) {
  const rows: AnyRecord[] = [];
  const wemItems = getKnownWemItems(dataset);
  const jssItems = getKnownJssItems(dataset);

  if (wemItems.length >= 2) {
    rows.push({
      type: 'scale',
      name: 'WEMWBS_skore',
      label: 'WEMWBS skóre',
      items: wemItems.join(', '),
      itemCount: wemItems.length,
      scoring: 'sum',
      reverseItems: '',
      source: hasDatasetColumn(dataset, 'WEMWBS_skore') ? 'existujúci stĺpec / kontrolný výpočet' : 'automatický výpočet zo stĺpcov WEM1-WEM14',
    });
  }

  if (jssItems.length >= 2) {
    rows.push({
      type: 'scale',
      name: 'JSS_skore',
      label: 'JSS celkové skóre',
      items: jssItems.join(', '),
      itemCount: jssItems.length,
      scoring: 'sum',
      reverseItems: Array.from(JSS_REVERSE_ITEMS).map((item) => `JSS${item}`).join(', '),
      source: hasDatasetColumn(dataset, 'JSS_skore') ? 'existujúci stĺpec / kontrolný výpočet' : 'automatický výpočet zo stĺpcov JSS1-JSS36',
    });
  }

  JSS_FACETS.forEach((facet) => {
    const items = facet.items.map((item) => findDatasetColumn(dataset, `JSS${item}`)).filter((item): item is string => Boolean(item));
    if (items.length >= 2 || hasDatasetColumn(dataset, facet.name)) {
      rows.push({
        type: 'subscale',
        name: facet.name,
        label: facet.label,
        items: items.join(', '),
        itemCount: items.length,
        scoring: 'sum',
        reverseItems: facet.items.filter((item) => JSS_REVERSE_ITEMS.has(item)).map((item) => `JSS${item}`).join(', '),
        source: hasDatasetColumn(dataset, facet.name) ? 'existujúci stĺpec / kontrolný výpočet' : 'automatický výpočet podľa metodiky JSS',
      });
    }
  });

  [...dataset.scaleDefinitions, ...dataset.subscaleDefinitions].forEach((definition) => {
    const alreadyExists = rows.some((row) => normalizeKey(row.name) === normalizeKey(definition.name) || normalizeKey(row.label) === normalizeKey(definition.label));
    if (!alreadyExists) {
      rows.push({
        type: definition.type,
        name: definition.name,
        label: definition.label,
        items: definition.items.join(', '),
        itemCount: definition.items.length,
        scoring: definition.scoring,
        reverseItems: '',
        source: 'automatická detekcia podľa názvov položiek',
      });
    }
  });

  return rows;
}

function getKnownScoreValue(row: RawRow, itemName: string, reverse = false): number | null {
  const value = parseNumericValue(row[itemName]);
  if (value === null) return null;
  return reverse ? 7 - value : value;
}

function scoreKnownJssFacet(row: RawRow, dataset: PreparedDataset, items: number[]): number | null {
  const values = items
    .map((item) => {
      const column = findDatasetColumn(dataset, `JSS${item}`);
      if (!column) return null;
      return getKnownScoreValue(row, column, JSS_REVERSE_ITEMS.has(item));
    })
    .filter((value): value is number => value !== null);
  return values.length ? round(values.reduce((sum, value) => sum + value, 0), 4) : null;
}

function scoreKnownJssTotal(row: RawRow, dataset: PreparedDataset): number | null {
  const values = Array.from({ length: 36 }, (_, index) => index + 1)
    .map((item) => {
      const column = findDatasetColumn(dataset, `JSS${item}`);
      if (!column) return null;
      return getKnownScoreValue(row, column, JSS_REVERSE_ITEMS.has(item));
    })
    .filter((value): value is number => value !== null);
  return values.length ? round(values.reduce((sum, value) => sum + value, 0), 4) : null;
}

function scoreKnownWemTotal(row: RawRow, dataset: PreparedDataset): number | null {
  const values = getKnownWemItems(dataset)
    .map((item) => parseNumericValue(row[item]))
    .filter((value): value is number => value !== null);
  return values.length ? round(values.reduce((sum, value) => sum + value, 0), 4) : null;
}

function buildScaleScoreRows(dataset: PreparedDataset): AnyRecord[] {
  return dataset.rows.map((row, index) => {
    const output: AnyRecord = { respondent: index + 1 };

    const existingWem = findDatasetColumn(dataset, 'WEMWBS_skore');
    const existingJss = findDatasetColumn(dataset, 'JSS_skore');
    output.WEMWBS_skore = existingWem ? row[existingWem] : scoreKnownWemTotal(row, dataset);
    output.JSS_skore = existingJss ? row[existingJss] : scoreKnownJssTotal(row, dataset);

    JSS_FACETS.forEach((facet) => {
      const existing = findDatasetColumn(dataset, facet.name);
      output[facet.name] = existing ? row[existing] : scoreKnownJssFacet(row, dataset, facet.items);
    });

    [...dataset.scaleDefinitions, ...dataset.subscaleDefinitions].forEach((definition) => {
      if (output[definition.label] === undefined) output[definition.label] = scoreDefinition(row, definition);
    });

    return output;
  });
}

function descriptiveFromValues(variable: string, values: number[], totalCount: number, role = 'scale') {
  const valid = values.length;
  const sd = standardDeviation(values);
  return {
    variable,
    role,
    valid,
    missing: Math.max(totalCount - valid, 0),
    median: round(median(values), 3),
    mean: round(mean(values), 3),
    standardDeviation: round(sd, 3),
    skewness: round(skewness(values), 3),
    standardErrorSkewness: valid > 0 ? round(Math.sqrt(6 / valid), 3) : null,
    kurtosis: round(kurtosis(values), 3),
    standardErrorKurtosis: valid > 0 ? round(Math.sqrt(24 / valid), 3) : null,
    shapiroWilk: null,
    pValueOfShapiroWilk: null,
    minimum: values.length ? round(Math.min(...values), 3) : null,
    maximum: values.length ? round(Math.max(...values), 3) : null,
    sum: round(values.reduce((sum, value) => sum + value, 0), 3),
  };
}

function buildScaleSubscaleDescriptiveRows(dataset: PreparedDataset): AnyRecord[] {
  const scoreRows = buildScaleScoreRows(dataset);
  const keys = Array.from(new Set(scoreRows.flatMap((row) => Object.keys(row)))).filter((key) => key !== 'respondent');
  return keys
    .map((key) => descriptiveFromValues(key, scoreRows.map((row) => parseNumericValue(row[key])).filter((value): value is number => value !== null), dataset.rows.length, key.toLowerCase().includes('skore') ? 'scale' : 'subscale'))
    .filter((row) => row.valid > 0);
}

function alphaFromMatrix(matrix: number[][]): number | null {
  if (matrix.length < 2 || !matrix[0] || matrix[0].length < 2) return null;
  const k = matrix[0].length;
  const cleanMatrix = matrix.filter((row) => row.length === k && row.every((value) => Number.isFinite(value)));
  if (cleanMatrix.length < 2) return null;
  const itemVariances = Array.from({ length: k }, (_, columnIndex) => variance(cleanMatrix.map((row) => row[columnIndex])) || 0);
  const totalScores = cleanMatrix.map((row) => row.reduce((sum, value) => sum + value, 0));
  const totalVariance = variance(totalScores);
  if (!totalVariance || totalVariance <= 0) return null;
  return round((k / (k - 1)) * (1 - itemVariances.reduce((sum, value) => sum + value, 0) / totalVariance), 4);
}

function reliabilityInterpretation(alpha: number | null) {
  if (alpha === null) return 'Reliabilitu nebolo možné vypočítať.';
  if (alpha >= 0.9) return 'Výborná reliabilita.';
  if (alpha >= 0.8) return 'Dobrá reliabilita.';
  if (alpha >= 0.7) return 'Akceptovateľná reliabilita.';
  if (alpha >= 0.6) return 'Hraničná reliabilita.';
  return 'Nízka reliabilita.';
}

function matrixForColumns(dataset: PreparedDataset, columns: string[], reverseItemNumbers = new Set<number>()): number[][] {
  return dataset.rows
    .map((row) => columns.map((column) => {
      const itemNumber = Number((cleanText(column).match(/JSS(\d+)/i) || [])[1]);
      return getKnownScoreValue(row, column, reverseItemNumbers.has(itemNumber));
    }))
    .filter((values): values is number[] => values.every((value) => value !== null));
}

function buildReliabilityDetailRows(dataset: PreparedDataset): AnyRecord[] {
  const rows: AnyRecord[] = [];
  const wemItems = getKnownWemItems(dataset);
  const jssItems = getKnownJssItems(dataset);

  if (wemItems.length >= 2) {
    const alpha = alphaFromMatrix(matrixForColumns(dataset, wemItems));
    rows.push({ scaleName: 'WEMWBS_skore', type: 'scale', items: wemItems.join(', '), itemCount: wemItems.length, validRows: matrixForColumns(dataset, wemItems).length, cronbachAlpha: alpha, interpretation: reliabilityInterpretation(alpha) });
  }

  if (jssItems.length >= 2) {
    const matrix = matrixForColumns(dataset, jssItems, JSS_REVERSE_ITEMS);
    const alpha = alphaFromMatrix(matrix);
    rows.push({ scaleName: 'JSS_skore', type: 'scale', items: jssItems.join(', '), itemCount: jssItems.length, validRows: matrix.length, cronbachAlpha: alpha, interpretation: reliabilityInterpretation(alpha) });
  }

  JSS_FACETS.forEach((facet) => {
    const columns = facet.items.map((item) => findDatasetColumn(dataset, `JSS${item}`)).filter((item): item is string => Boolean(item));
    if (columns.length >= 2) {
      const reverseItems = new Set(facet.items.filter((item) => JSS_REVERSE_ITEMS.has(item)));
      const matrix = matrixForColumns(dataset, columns, reverseItems);
      const alpha = alphaFromMatrix(matrix);
      rows.push({ scaleName: facet.name, label: facet.label, type: 'subscale', items: columns.join(', '), itemCount: columns.length, validRows: matrix.length, cronbachAlpha: alpha, interpretation: reliabilityInterpretation(alpha) });
    }
  });

  return rows;
}

function buildCorrelationMatrixAoA(correlationRows: AnyRecord[]): unknown[][] {
  const variables = Array.from(new Set(correlationRows.flatMap((row) => [cleanText(row.variableA || row.variable1), cleanText(row.variableB || row.variable2)]).filter(Boolean)));
  if (!variables.length) return [['Korelačná matica', 'Žiadne dáta']];
  const matrix = new Map<string, number | string | null>();
  correlationRows.forEach((row) => {
    const a = cleanText(row.variableA || row.variable1);
    const b = cleanText(row.variableB || row.variable2);
    const value = row.spearmanRho ?? row.rho ?? row.pearsonR ?? row.r ?? row.coefficient ?? null;
    matrix.set(`${a}|${b}`, value);
    matrix.set(`${b}|${a}`, value);
  });
  return [
    ['Korelačná matica', ...variables],
    ...variables.map((variableA) => [variableA, ...variables.map((variableB) => variableA === variableB ? 1 : matrix.get(`${variableA}|${variableB}`) ?? '')]),
  ];
}

function getCategoricalVariablesForCrosstabs(dataset: PreparedDataset): AnalysisVariable[] {
  return dataset.variables.filter((variable) => ['grouping', 'demographic', 'item'].includes(variable.role) && variable.uniqueCount > 1 && variable.uniqueCount <= 12).slice(0, 18);
}

function buildContingencyTables(dataset: PreparedDataset): AnyRecord[] {
  const variables = getCategoricalVariablesForCrosstabs(dataset);
  const output: AnyRecord[] = [];

  for (let i = 0; i < variables.length; i += 1) {
    for (let j = i + 1; j < variables.length; j += 1) {
      const rowVar = variables[i].name;
      const colVar = variables[j].name;
      const rowValues = Array.from(new Set(dataset.rows.map((row) => cleanText(row[rowVar])).filter(Boolean))).sort(compareFrequencyLabels);
      const colValues = Array.from(new Set(dataset.rows.map((row) => cleanText(row[colVar])).filter(Boolean))).sort(compareFrequencyLabels);
      const total = dataset.rows.filter((row) => cleanText(row[rowVar]) && cleanText(row[colVar])).length;
      if (!total || rowValues.length < 2 || colValues.length < 2) continue;
      const rowTotals = new Map<string, number>();
      const colTotals = new Map<string, number>();
      const counts = new Map<string, number>();

      dataset.rows.forEach((row) => {
        const rv = cleanText(row[rowVar]);
        const cv = cleanText(row[colVar]);
        if (!rv || !cv) return;
        counts.set(`${rv}|${cv}`, (counts.get(`${rv}|${cv}`) || 0) + 1);
        rowTotals.set(rv, (rowTotals.get(rv) || 0) + 1);
        colTotals.set(cv, (colTotals.get(cv) || 0) + 1);
      });

      rowValues.forEach((rv) => {
        colValues.forEach((cv) => {
          const count = counts.get(`${rv}|${cv}`) || 0;
          output.push({
            table: `${rowVar} × ${colVar}`,
            rowVariable: rowVar,
            columnVariable: colVar,
            rowCategory: rv,
            columnCategory: cv,
            count,
            rowPercent: round(((count / (rowTotals.get(rv) || 1)) * 100), 3),
            columnPercent: round(((count / (colTotals.get(cv) || 1)) * 100), 3),
            totalPercent: round(((count / total) * 100), 3),
          });
        });
      });
    }
  }

  return output;
}

function buildChiSquareRows(contingencyRows: AnyRecord[]): AnyRecord[] {
  const tableNames = Array.from(new Set(contingencyRows.map((row) => cleanText(row.table)).filter(Boolean)));
  return tableNames.map((table) => {
    const rows = contingencyRows.filter((row) => row.table === table);
    const rowCategories = Array.from(new Set(rows.map((row) => cleanText(row.rowCategory))));
    const columnCategories = Array.from(new Set(rows.map((row) => cleanText(row.columnCategory))));
    const total = rows.reduce((sum, row) => sum + (parseNumericValue(row.count) || 0), 0);
    let chiSquare = 0;
    rowCategories.forEach((rowCategory) => {
      const rowTotal = rows.filter((row) => row.rowCategory === rowCategory).reduce((sum, row) => sum + (parseNumericValue(row.count) || 0), 0);
      columnCategories.forEach((columnCategory) => {
        const columnTotal = rows.filter((row) => row.columnCategory === columnCategory).reduce((sum, row) => sum + (parseNumericValue(row.count) || 0), 0);
        const observed = rows.find((row) => row.rowCategory === rowCategory && row.columnCategory === columnCategory)?.count || 0;
        const expected = total ? (rowTotal * columnTotal) / total : 0;
        if (expected > 0) chiSquare += Math.pow((observed as number) - expected, 2) / expected;
      });
    });
    const df = (rowCategories.length - 1) * (columnCategories.length - 1);
    return { table, rowVariable: rows[0]?.rowVariable, columnVariable: rows[0]?.columnVariable, chiSquare: round(chiSquare, 4), df, pValue: round(chiSquarePValue(chiSquare, df), 4), interpretation: interpretPValue(chiSquarePValue(chiSquare, df)) };
  });
}

function chartBar(value: number, max: number) {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(max) || max <= 0) return '';
  return '█'.repeat(Math.max(1, Math.round((value / max) * 30)));
}

function buildChartRows(result: AnyRecord) {
  const frequencies = safeArray<AnyRecord>(result.frequencies);
  const descriptives = safeArray<AnyRecord>(result.scaleSubscaleDescriptives || result.descriptives || result.descriptiveStatistics);
  const reliability = safeArray<AnyRecord>(result.reliabilityDetail || result.reliabilities || result.reliability);
  const correlations = safeArray<AnyRecord>(result.correlations);

  const frequencyChartRows = frequencies
    .filter((row) => !['missing', 'total'].includes(cleanText(row.value).toLowerCase()))
    .slice(0, 300)
    .map((row) => ({ chart: 'Frekvenčné rozdelenie', variable: row.variable, category: row.value, value: parseNumericValue(row.validPercent ?? row.percent) || 0 }));
  const maxFrequency = Math.max(...frequencyChartRows.map((row) => row.value), 1);

  const meanChartRows = descriptives
    .filter((row) => parseNumericValue(row.mean) !== null)
    .slice(0, 80)
    .map((row) => ({ chart: 'Priemery škál/subškál', variable: row.variable, value: parseNumericValue(row.mean) || 0 }));
  const maxMean = Math.max(...meanChartRows.map((row) => row.value), 1);

  const reliabilityChartRows = reliability
    .filter((row) => parseNumericValue(row.cronbachAlpha ?? row.alpha) !== null)
    .map((row) => ({ chart: 'Reliabilita', variable: row.scaleName || row.scale, value: parseNumericValue(row.cronbachAlpha ?? row.alpha) || 0 }));

  const correlationChartRows = correlations
    .map((row) => ({ chart: 'Sila korelácií', variable: `${row.variableA || row.variable1} × ${row.variableB || row.variable2}`, value: Math.abs(parseNumericValue(row.spearmanRho ?? row.rho ?? row.pearsonR ?? row.r ?? row.coefficient) || 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  return {
    frequencyChartRows: frequencyChartRows.map((row) => ({ ...row, bar: chartBar(row.value, maxFrequency) })),
    meanChartRows: meanChartRows.map((row) => ({ ...row, bar: chartBar(row.value, maxMean) })),
    reliabilityChartRows: reliabilityChartRows.map((row) => ({ ...row, bar: chartBar(row.value, 1) })),
    correlationChartRows: correlationChartRows.map((row) => ({ ...row, bar: chartBar(row.value, 1) })),
  };
}

function setWorksheetLayout(worksheet: XLSX.WorkSheet, widths: number[]) {
  worksheet['!cols'] = widths.map((wch) => ({ wch }));
  worksheet['!autofilter'] = worksheet['!ref'] ? { ref: worksheet['!ref'] } : undefined;
}

function appendProfessionalJsonSheet(workbook: XLSX.WorkBook, name: string, rows: AnyRecord[], widths: number[] = [24, 18, 18, 18, 18, 18, 18, 18]) {
  const sheetName = sanitizeSheetName(name);
  const worksheet = rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([['Žiadne dáta']]);
  setWorksheetLayout(worksheet, widths);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

function appendAoASheet(workbook: XLSX.WorkBook, name: string, rows: unknown[][], widths: number[] = [28, 16, 16, 16, 16, 16, 16, 16, 16, 16]) {
  const sheetName = sanitizeSheetName(name);
  const worksheet = XLSX.utils.aoa_to_sheet(rows.length ? rows : [['Žiadne dáta']]);
  setWorksheetLayout(worksheet, widths);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}


function buildJaspDescriptiveAoA(rows: AnyRecord[]): unknown[][] {
  const variables = rows.map((row) => cleanText(row.variable)).filter(Boolean);
  const statistics = [
    ['Valid', 'valid'],
    ['Missing', 'missing'],
    ['Median', 'median'],
    ['Mean', 'mean'],
    ['Std. Deviation', 'standardDeviation'],
    ['Skewness', 'skewness'],
    ['Std. Error of Skewness', 'standardErrorSkewness'],
    ['Kurtosis', 'kurtosis'],
    ['Std. Error of Kurtosis', 'standardErrorKurtosis'],
    ['Shapiro-Wilk', 'shapiroWilk'],
    ['P-value of Shapiro-Wilk', 'pValueOfShapiroWilk'],
    ['Minimum', 'minimum'],
    ['Maximum', 'maximum'],
    ['Sum', 'sum'],
  ];

  return [
    ['Descriptive Statistics', ...variables],
    ...statistics.map(([label, key]) => [label, ...rows.map((row) => row[key] ?? row[label] ?? null)]),
  ];
}

function buildJaspFrequencyAoA(rows: AnyRecord[]): unknown[][] {
  const grouped = new Map<string, AnyRecord[]>();
  rows.forEach((row) => {
    const variable = cleanText(row.variable || 'Premenná');
    const current = grouped.get(variable) || [];
    current.push(row);
    grouped.set(variable, current);
  });

  const output: unknown[][] = [];
  grouped.forEach((items, variable) => {
    if (output.length) output.push([]);
    output.push([`Frequencies for ${variable}`]);
    output.push([variable, 'Frequency', 'Percent', 'Valid Percent', 'Cumulative Percent']);
    items.forEach((row) => {
      output.push([row.value, row.frequency ?? row.count ?? row.Frequency, row.percent ?? row.Percent, row.validPercent ?? row['Valid Percent'], row.cumulativePercent ?? row['Cumulative Percent']]);
    });
  });

  return output.length ? output : [['Žiadne frekvenčné tabuľky']];
}

function buildContingencyAoA(rows: AnyRecord[]): unknown[][] {
  const grouped = new Map<string, AnyRecord[]>();
  rows.forEach((row) => {
    const key = cleanText(row.table || `${row.rowVariable} × ${row.columnVariable}`);
    const current = grouped.get(key) || [];
    current.push(row);
    grouped.set(key, current);
  });
  const output: unknown[][] = [];
  grouped.forEach((items, tableName) => {
    if (output.length) output.push([]);
    output.push([tableName]);
    output.push(['Riadková premenná', 'Stĺpcová premenná', 'Riadková kategória', 'Stĺpcová kategória', 'Count', 'Row %', 'Column %', 'Total %']);
    items.forEach((row) => output.push([row.rowVariable, row.columnVariable, row.rowCategory, row.columnCategory, row.count, row.rowPercent, row.columnPercent, row.totalPercent]));
  });
  return output.length ? output : [['Žiadne kontingenčné tabuľky']];
}

function createXlsxBuffer(result: AnyRecord, mode: 'full' | 'raw' = 'full') {
  const workbook = XLSX.utils.book_new();
  const dataset = isRecord(result.preparedDataset) ? result.preparedDataset as PreparedDataset : null;

  if (dataset) {
    appendAoASheet(workbook, 'raw-data', dataset.rawDataSheet || [['Žiadne dáta']], [18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18]);
    appendAoASheet(workbook, 'variable-map', dataset.variableMapSheet || [['Žiadne dáta']], [28, 22, 28, 16, 16, 18, 14, 14, 14, 14, 14, 20, 34, 34]);
    appendAoASheet(workbook, 'data-quality', dataset.dataQualitySheet || [['Žiadne dáta']], [26, 22, 16, 16, 16, 18, 18, 18, 18, 14, 14, 60]);
  }

  if (mode === 'raw') return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  const descriptiveRows = safeArray<AnyRecord>(result.descriptives || result.descriptiveStatistics);
  const frequencyRows = safeArray<AnyRecord>(result.frequencies);
  const scaleDefinitionRows = dataset ? getKnownScaleDefinitions(dataset) : safeArray<AnyRecord>(result.scaleSubscaleDefinitions);
  const scaleScoreRows = dataset ? buildScaleScoreRows(dataset) : safeArray<AnyRecord>(result.scaleSubscaleScores);
  const scaleDescriptiveRows = dataset ? buildScaleSubscaleDescriptiveRows(dataset) : safeArray<AnyRecord>(result.scaleSubscaleDescriptives);
  const reliabilityRows = [
    ...safeArray<AnyRecord>(result.reliabilities || result.reliability),
    ...(dataset ? buildReliabilityDetailRows(dataset) : []),
  ];
  const correlationRows = safeArray<AnyRecord>(result.correlations);
  const testRows = safeArray<AnyRecord>(result.statisticalTests || result.hypothesisTests);
  const contingencyRows = dataset ? buildContingencyTables(dataset) : safeArray<AnyRecord>(result.contingencyTables);
  const chiSquareRows = buildChiSquareRows(contingencyRows);
  const chartRows = buildChartRows({ ...result, reliabilityDetail: reliabilityRows, scaleSubscaleDescriptives: scaleDescriptiveRows });

  appendAoASheet(workbook, 'JASP Descriptive Statistics', buildJaspDescriptiveAoA(descriptiveRows), [32, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
  appendAoASheet(workbook, 'JASP Frequency Tables', buildJaspFrequencyAoA(frequencyRows), [34, 14, 14, 16, 20]);
  appendProfessionalJsonSheet(workbook, 'Skaly a podskaly', scaleDefinitionRows, [16, 26, 34, 60, 14, 18, 45, 34]);
  appendProfessionalJsonSheet(workbook, 'Skore skal', scaleScoreRows, [14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16]);
  appendProfessionalJsonSheet(workbook, 'Deskriptiva skal', scaleDescriptiveRows, [30, 14, 14, 14, 14, 16, 14, 20, 14, 20, 16, 20, 14, 14, 14]);
  appendProfessionalJsonSheet(workbook, 'Reliability Cronbach', reliabilityRows, [32, 16, 60, 14, 14, 18, 24, 40]);
  appendProfessionalJsonSheet(workbook, 'Correlations pairs', correlationRows, [30, 30, 14, 14, 14, 14, 18, 40]);
  appendAoASheet(workbook, 'Correlation matrix', buildCorrelationMatrixAoA(correlationRows), [32, 16, 16, 16, 16, 16, 16, 16, 16, 16]);
  appendProfessionalJsonSheet(workbook, 'ANOVA t-testy', testRows.filter((row) => ['ANOVA', 't-test'].includes(cleanText(row.test))), [16, 32, 32, 30, 16, 16, 16, 45]);
  appendProfessionalJsonSheet(workbook, 'Neparametricke testy', testRows.filter((row) => ['Mann-Whitney U', 'Kruskal-Wallis'].includes(cleanText(row.test))), [20, 32, 32, 30, 16, 16, 16, 45]);
  appendAoASheet(workbook, 'Kontingencne tabulky', buildContingencyAoA(contingencyRows), [26, 26, 24, 24, 12, 14, 14, 14]);
  appendProfessionalJsonSheet(workbook, 'Chi-square testy', chiSquareRows, [45, 28, 28, 16, 12, 14, 45]);
  appendProfessionalJsonSheet(workbook, 'Grafy frekvencie', chartRows.frequencyChartRows, [24, 28, 26, 14, 42]);
  appendProfessionalJsonSheet(workbook, 'Grafy priemery', chartRows.meanChartRows, [24, 34, 14, 42]);
  appendProfessionalJsonSheet(workbook, 'Grafy reliabilita', chartRows.reliabilityChartRows, [24, 34, 14, 42]);
  appendProfessionalJsonSheet(workbook, 'Grafy korelacie', chartRows.correlationChartRows, [24, 55, 14, 42]);

  appendProfessionalJsonSheet(workbook, 'descriptives', descriptiveRows);
  appendProfessionalJsonSheet(workbook, 'frequencies', frequencyRows);
  appendProfessionalJsonSheet(workbook, 'recommended-tests', safeArray<AnyRecord>(result.recommendedTests));
  appendProfessionalJsonSheet(workbook, 'recommended-charts', safeArray<AnyRecord>(result.recommendedCharts));
  appendProfessionalJsonSheet(workbook, 'warnings', safeArray(result.warnings).map((warning) => ({ warning })));

  workbook.Workbook = {
    Views: [{ RTL: false }],
    Sheets: workbook.SheetNames.map((name) => ({ name, Hidden: 0 })),
  } as any;

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer', compression: true });
}

function createWordHtml(result: AnyRecord, title: string) {
  const sections = [
    ['Súhrn', result.summary],
    ['Text do praktickej časti', result.practicalText],
    ['Interpretácia', result.interpretation],
  ];

  function table(titleText: string, rows: AnyRecord[]) {
    if (!rows.length) return '';
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    return `<h2>${htmlEscape(titleText)}</h2><table><thead><tr>${columns.map((column) => `<th>${htmlEscape(column)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${htmlEscape(row[column])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Calibri,Arial,sans-serif;line-height:1.45;color:#111827}h1{color:#0f172a}h2{margin-top:24px;color:#1e40af}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #cbd5e1;padding:6px 8px;font-size:11px;vertical-align:top}th{background:#1e293b;color:white}</style></head><body><h1>${htmlEscape(title)}</h1>${sections.map(([sectionTitle, text]) => text ? `<h2>${htmlEscape(sectionTitle)}</h2><p>${htmlEscape(text).replace(/\n/g, '<br>')}</p>` : '').join('')}${table('Deskriptívna štatistika', safeArray<AnyRecord>(result.descriptives || result.descriptiveStatistics))}${table('Reliabilita', safeArray<AnyRecord>(result.reliabilities || result.reliability))}${table('Korelácie', safeArray<AnyRecord>(result.correlations))}${table('Štatistické testy', safeArray<AnyRecord>(result.statisticalTests || result.hypothesisTests))}</body></html>`;
}

function pdfEscape(value: unknown) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function createSimplePdf(result: AnyRecord, title: string) {
  const lines = [title, '', cleanText(result.summary), '', cleanText(result.practicalText || result.interpretation)].join('\n').split('\n').flatMap((line) => {
    const clean = line || ' ';
    const chunks: string[] = [];
    for (let i = 0; i < clean.length; i += 92) chunks.push(clean.slice(i, i + 92));
    return chunks;
  });

  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 42) pages.push(lines.slice(i, i + 42));
  if (!pages.length) pages.push(['Výsledky analýzy dát']);

  const objects: string[] = [];
  const offsets: number[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  const fontObj = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageObjects: number[] = [];
  const contentObjects = pages.map((page) => {
    const stream = `BT\n/F1 10 Tf\n50 790 Td\n${page.map((line, index) => `${index === 0 ? '' : '0 -16 Td\n'}(${pdfEscape(line)}) Tj`).join('\n')}\nET`;
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
  for (let i = 1; i <= objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function contentDisposition(fileName: string) {
  return `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function getFormText(formData: FormData, ...keys: string[]): string {
  for (const key of keys) {
    const value = formData.get(key);

    if (typeof value === 'string' && cleanText(value)) {
      return cleanText(value);
    }
  }

  return '';
}

function getDirectExportFormatFromFormData(formData: FormData): ExportFormat | null {
  const requested = getFormText(
    formData,
    'format',
    'exportFormat',
    'type',
    'downloadFormat',
    'fileFormat',
  ).toLowerCase();

  if (['excel', 'xls', 'xlsx'].includes(requested)) return 'excel';
  if (requested === 'raw' || requested === 'raw-data' || requested === 'rawdata') return 'raw';
  if (requested === 'word' || requested === 'doc') return 'word';
  if (requested === 'pdf') return 'pdf';

  const action = getFormText(formData, 'action', 'mode', 'intent').toLowerCase();

  if (['export', 'download', 'export-excel', 'direct-export', 'file-export'].includes(action)) {
    return 'excel';
  }

  return null;
}

function buildFileIntelligence(params: {
  workbook: { sourceFileName: string; selectedSheetName: string; rows: unknown[][]; sheetNames: string[] };
  dataset: PreparedDataset;
  descriptives: AnyRecord[];
  frequencies: AnyRecord[];
  reliabilities: AnyRecord[];
  correlations: AnyRecord[];
  statisticalTests: AnyRecord[];
  expandedFullStatisticalAnalysis?: AnyRecord;
}) {
  const { workbook, dataset } = params;
  const firstRows = dataset.rows.slice(0, 5);
  const scaleRows = safeArray<AnyRecord>(
    params.expandedFullStatisticalAnalysis?.scaleSubscaleScores ||
      params.expandedFullStatisticalAnalysis?.scaleScores,
  );
  const scaleDefinitions = safeArray<AnyRecord>(
    params.expandedFullStatisticalAnalysis?.scaleSubscaleDefinitions ||
      params.expandedFullStatisticalAnalysis?.scaleDefinitions,
  );

  return {
    sourceFileName: workbook.sourceFileName,
    selectedSheetName: workbook.selectedSheetName,
    sheetNames: workbook.sheetNames,
    detectedHeaderRow: dataset.quality.headerRowIndex,
    originalColumnCount: dataset.originalHeaders.length,
    preparedColumnCount: dataset.headers.length,
    totalCaseCount: dataset.totalCaseCount,
    validCaseCount: dataset.validCaseCount,
    respondentCount: dataset.validCaseCount || dataset.totalCaseCount,
    headers: dataset.headers,
    originalHeaders: dataset.originalHeaders,
    demographicColumns: dataset.demographicColumns,
    groupingColumns: dataset.groupingColumns,
    itemColumns: dataset.itemColumns,
    numericColumns: dataset.numericColumns,
    categoricalColumns: dataset.categoricalColumns,
    textColumns: dataset.textColumns,
    dateColumns: dataset.dateColumns,
    scaleDefinitions: dataset.scaleDefinitions,
    subscaleDefinitions: dataset.subscaleDefinitions,
    detectedScaleDefinitions: scaleDefinitions,
    calculatedScaleScoreRows: scaleRows.length,
    descriptiveRows: params.descriptives.length,
    frequencyRows: params.frequencies.length,
    reliabilityRows: params.reliabilities.length,
    correlationRows: params.correlations.length,
    statisticalTestRows: params.statisticalTests.length,
    warnings: dataset.quality.warnings || [],
    firstRows,
    note: 'Analýza je počítaná priamo z nahraného súboru. Dashboard len odovzdáva súbory a nepočíta štatistiky.',
  };
}

function createFileResponseFromAnalysis(result: AnyRecord, format: ExportFormat | null): NextResponse {
  const finalFormat = format || 'excel';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const title = cleanText(result.title || 'Výsledky analýzy dát');

  if (finalFormat === 'word' || finalFormat === 'doc') {
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

  if (finalFormat === 'pdf') {
    const pdf = createSimplePdf(result, title);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': contentDisposition(`vysledky-analyzy-dat-${timestamp}.pdf`),
        'cache-control': 'no-store',
      },
    });
  }

  const rawMode = finalFormat === 'raw';
  const buffer = createXlsxBuffer(result, rawMode ? 'raw' : 'full');
  const fileName = rawMode
    ? `raw-data-${timestamp}.xlsx`
    : `statisticka-analyza-${timestamp}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': contentDisposition(fileName),
      'content-length': String(buffer.byteLength),
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function handleExport(body: AnyRecord) {
  const format = cleanText(body.format || body.exportFormat || body.type || 'excel').toLowerCase() as ExportFormat;
  const result = isRecord(body.result) ? body.result : isRecord(body.analysis) ? body.analysis : body;
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
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': contentDisposition(`vysledky-analyzy-dat-${timestamp}.pdf`),
        'cache-control': 'no-store',
      },
    });
  }

  const rawMode = format === 'raw' || body.type === 'raw';
  const buffer = createXlsxBuffer(result, rawMode ? 'raw' : 'full');
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': contentDisposition(rawMode ? `raw-data-${timestamp}.xlsx` : `vysledky-analyzy-dat-${timestamp}.xlsx`),
      'cache-control': 'no-store',
    },
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/analyze-data',
    supports: ['upload-analysis', 'raw-data.xlsx', 'export-excel', 'export-word', 'export-pdf'],
    message: 'Analyze-data backend beží s univerzálnou raw-data štatistickou pipeline.',
    generatedAt: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null);
      if (!isRecord(body)) return NextResponse.json({ ok: false, error: 'Neplatné JSON telo požiadavky.' }, { status: 400 });
      const action = cleanText(body.action || body.mode || '');
      if (action === 'export' || body.result || body.analysis || body.format || body.type === 'raw') return handleExport(body);
      return NextResponse.json({ ok: false, error: 'JSON požiadavka neobsahuje action: export, result ani analysis.' }, { status: 400 });
    }

    const formData = await req.formData();
    const analysisGoal = cleanText(formData.get('analysisGoal'));
    const dataDescription = cleanText(formData.get('dataDescription'));
    const profile = safeJsonParse<SavedProfile>(formData.get('activeProfile'));
    const directExportFormat = getDirectExportFormatFromFormData(formData);
    const files = [...formData.getAll('files'), ...formData.getAll('file')].filter((item): item is File => item instanceof File && item.size > 0);

    if (!files.length) {
      return NextResponse.json({ ok: false, error: 'Chýba Excel/CSV súbor. Nahraj .xlsx, .xls, .xlsm, .csv alebo .txt.' }, { status: 400 });
    }

    const firstFile = files[0];
    const workbook = await readWorkbookAoA(firstFile);
    const parsedRows = aoaToRows(workbook.rows);
    const dataset = buildPreparedDataset({
      sourceFileName: workbook.sourceFileName,
      selectedSheetName: workbook.selectedSheetName,
      ...parsedRows,
    });

    const descriptives = calculateDescriptives(dataset);
    const frequencies = calculateFrequencies(dataset);
    const reliabilities = calculateReliabilities(dataset);
    const correlations = calculateCorrelations(dataset);
    const statisticalTests = calculateStatisticalTests(dataset);

    // Napojenie profesionálneho štatistického jadra.
    // Tento výpočet dopĺňa škály, podškály, skóre škál, normalitu,
    // reliabilitu, Pearson/Spearman korelácie, odporúčané testy a dáta pre grafy.
    const detectedIdColumn =
      dataset.variables.find((variable) => variable.role === 'identifier')?.name ||
      null;

    const fullStatisticalAnalysis = runFullStatisticalAnalysis(dataset.rows, {
      idColumn: detectedIdColumn || undefined,
      groupColumns: dataset.groupingColumns,
      autoDetectScales: true,
      fallbackToNumericVariables: true,
      autoDetectGroupColumns: true,
      includeFrequencies: true,
      includeItemDescriptives: true,
    });

    const expandedFullStatisticalAnalysis =
      expandStatisticalAnalysisForApi(fullStatisticalAnalysis) as AnyRecord;

    let responsePayload = {
      ...buildResponse({
        dataset,
        descriptives,
        frequencies,
        reliabilities,
        correlations,
        statisticalTests,
        files,
      }),
      ...expandedFullStatisticalAnalysis,
    } as AnyRecord;

    responsePayload.statisticalAnalysis = {
      ...(isRecord(responsePayload.statisticalAnalysis)
        ? responsePayload.statisticalAnalysis
        : {}),
      ...fullStatisticalAnalysis,
    };

    responsePayload.preparedDataset = {
      ...dataset,
      quality: {
        ...dataset.quality,
        scaleCount:
          fullStatisticalAnalysis.meta.autoDetectedScaleCount +
          fullStatisticalAnalysis.meta.manualScaleCount,
        subscaleCount: safeArray(
          expandedFullStatisticalAnalysis.subscaleDefinitions,
        ).length,
      },
    };

    responsePayload.fileAnalysis = buildFileIntelligence({
      workbook,
      dataset,
      descriptives,
      frequencies,
      reliabilities,
      correlations,
      statisticalTests,
      expandedFullStatisticalAnalysis,
    });

    responsePayload.exportSource = {
      mode: 'file-direct',
      note: 'Výsledný Excel, raw-data a všetky štatistiky sú vytvorené priamo z nahraného súboru. Dashboard len posiela súbor do API.',
      sourceFileName: workbook.sourceFileName,
      selectedSheetName: workbook.selectedSheetName,
    };

    responsePayload.summary = `${responsePayload.summary || buildSummary(dataset)}\n\nDoplnené výpočty: škály, podškály, skóre škál, normalita, reliabilita, korelácie, skupinové testy a grafové dáta. Výpočet ide priamo zo súboru: ${workbook.sourceFileName}.`;

    if (directExportFormat) {
      return createFileResponseFromAnalysis(responsePayload, directExportFormat);
    }

    const aiAgent = await runAiInterpretation(buildPrompt({ profile, analysisGoal, dataDescription, result: responsePayload }));
    if (aiAgent.ok && aiAgent.text) {
      try {
        const parsed = parseJsonFromAiText(aiAgent.text);
        responsePayload = {
          ...responsePayload,
          title: cleanText(parsed.title) || responsePayload.title,
          summary: cleanText(parsed.summary) || responsePayload.summary,
          practicalText: cleanText(parsed.practicalText) || responsePayload.practicalText,
          interpretation: cleanText(parsed.interpretation) || responsePayload.interpretation,
          fullText: cleanText(parsed.fullText) || `${cleanText(parsed.practicalText) || responsePayload.practicalText}\n\n${cleanText(parsed.interpretation) || responsePayload.interpretation}`,
          warnings: [
            ...safeArray<string>(responsePayload.warnings),
            ...safeArray(parsed.warnings).map((warning) => cleanText(warning)).filter(Boolean),
          ],
          aiAgent,
        };
      } catch {
        responsePayload = {
          ...responsePayload,
          warnings: [
            ...safeArray<string>(responsePayload.warnings),
            'AI výstup nebol v presnom JSON formáte. Použitá bola predvolená interpretácia.',
          ],
          aiAgent,
        };
      }
    } else if (aiAgent.error) {
      responsePayload = {
        ...responsePayload,
        warnings: [
          ...safeArray<string>(responsePayload.warnings),
          `AI interpretácia nebola doplnená: ${aiAgent.error}`,
        ],
        aiAgent,
      };
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('ANALYZE_DATA_ERROR:', error);
    return NextResponse.json({ ok: false, success: false, error: error instanceof Error ? error.message : 'Nepodarilo sa vykonať analýzu dát.' }, { status: 500 });
  }
}
