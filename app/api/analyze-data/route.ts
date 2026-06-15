import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type PrimitiveValue = string | number | boolean | null;
type DataRow = Record<string, PrimitiveValue>;
type AnyRecord = Record<string, any>;

type VariableRole =
  | 'identifier'
  | 'demographic'
  | 'grouping'
  | 'item'
  | 'scale'
  | 'subscale'
  | 'numeric'
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
  name: string;
  variable: string;
  label: string;
  originalName: string;
  displayName: string;
  type: VariableKind;
  dataType: VariableKind;
  kind: VariableKind;
  role: VariableRole;
  measurementLevel: 'nominal' | 'ordinal' | 'scale' | 'unknown';
  nonMissing: number;
  valid: number;
  missing: number;
  uniqueCount: number;
  uniqueValues: number;
  min: number | null;
  max: number | null;
  examples: Array<string | number>;
  categories: Array<string | number>;
  scaleGroup?: string | null;
  warning?: string;
  notes?: string;
};

type ScaleDefinition = {
  name: string;
  label: string;
  type: 'scale' | 'subscale';
  items: string[];
  scoring: 'mean' | 'sum';
  description?: string;
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
  rows: DataRow[];

  rawDataSheet: unknown[][];
  variableMapSheet: unknown[][];
  dataQualitySheet: unknown[][];

  quality: {
    sourceFileName: string;
    selectedSheetName: string;
    headerRowIndex: number;
    originalRowCount: number;
    rowCount: number;
    originalColumnCount: number;
    variableCount: number;
    removedEmptyRows: number;
    removedDuplicateRows: number;
    scaleCount: number;
    subscaleCount: number;
    warnings: string[];
    notes: string[];
  };
};

type DescriptiveRow = {
  variable: string;
  n: number;
  missing: number;
  mean: number | null;
  median: number | null;
  sd: number | null;
  minimum: number | null;
  min: number | null;
  maximum: number | null;
  max: number | null;
  q1: number | null;
  q3: number | null;
  iqr: number | null;
  skewness: number | null;
  kurtosis: number | null;
};

type FrequencyRow = {
  variable: string;
  value: string | number;
  category: string | number;
  count: number;
  frequency: number;
  percent: number;
  percentage: number;
  validPercent: number | null;
  cumulativePercent: number | null;
};

type FrequencyTable = {
  variable: string;
  name: string;
  title: string;
  description: string;
  rows: FrequencyRow[];
  data: FrequencyRow[];
  values: FrequencyRow[];
  total: number;
  validTotal: number;
  missingTotal: number;
};

type ReliabilityRow = {
  scale: string;
  name: string;
  label: string;
  items: string[];
  itemCount: number;
  validN: number;
  n: number;
  cronbachAlpha: number | null;
  alpha: number | null;
  interpretation: string;
};

type CorrelationRow = {
  test: 'Pearson' | 'Spearman';
  variable1: string;
  variable2: string;
  variableA: string;
  variableB: string;
  n: number;
  coefficient: number | null;
  r?: number | null;
  rho?: number | null;
  pearsonR?: number | null;
  spearmanRho?: number | null;
  pValue: number | null;
  p: number | null;
  strength: string;
  direction: string;
  significant: boolean;
  interpretation: string;
};

type StatisticalTestRow = {
  test: 't-test' | 'ANOVA' | 'Mann-Whitney U' | 'Kruskal-Wallis';
  dependentVariable: string;
  groupVariable: string;
  groupingVariable: string;
  groups: string;
  statistic: number | null;
  t?: number | null;
  f?: number | null;
  u?: number | null;
  h?: number | null;
  df?: number | null;
  df1?: number | null;
  df2?: number | null;
  pValue: number | null;
  p: number | null;
  significant: boolean;
  interpretation: string;
};

type AnalysisResult = {
  ok: boolean;
  success: boolean;
  title: string;
  summary: string;
  dataDescription: string;

  preparedDataset: PreparedDataset;
  rawDataFileName: string;
  rawDataWorkbookBase64: string;

  variables: AnalysisVariable[];
  detectedVariables: AnalysisVariable[];
  columns: AnalysisVariable[];

  frequencies: FrequencyTable[];
  frequencyTables: FrequencyTable[];
  frequency_tables: FrequencyTable[];

  descriptives: DescriptiveRow[];
  descriptiveStatistics: DescriptiveRow[];
  descriptive_statistics: DescriptiveRow[];
  statistics: DescriptiveRow[];

  reliabilities: ReliabilityRow[];
  reliability: ReliabilityRow[];
  cronbachAlpha: ReliabilityRow[];

  correlations: CorrelationRow[];
  correlationResults: CorrelationRow[];
  pearsonCorrelations: CorrelationRow[];
  spearmanCorrelations: CorrelationRow[];

  statisticalTests: StatisticalTestRow[];
  statistical_tests: StatisticalTestRow[];
  hypothesisTests: StatisticalTestRow[];
  hypothesis_tests: StatisticalTestRow[];
  testResults: StatisticalTestRow[];
  tTests: StatisticalTestRow[];

  recommendedTests: AnyRecord[];
  recommendedCharts: AnyRecord[];
  excelTables: AnyRecord[];

  practicalText: string;
  interpretation: string;
  fullText: string;
  warnings: string[];

  meta: AnyRecord;
  aiAgent?: AnyRecord | null;

  statisticalAnalysis?: AnyRecord;
  scaleScores?: AnyRecord[];
  scaleDescriptives?: DescriptiveRow[];
  itemDescriptives?: DescriptiveRow[];
  correlationMatrix?: AnyRecord[];
  normality?: AnyRecord[];
  parametricGroupTests?: StatisticalTestRow[];
  nonParametricGroupTests?: StatisticalTestRow[];
  recommendedGroupTests?: AnyRecord[];
};

type WorkbookReadResult = {
  fileName: string;
  selectedSheetName: string;
  sheetNames: string[];
  headerRowIndex: number;
  originalRowCount: number;
  originalColumnCount: number;
  rows: DataRow[];
  originalHeaders: string[];
};

type ExportFormat = 'excel' | 'xls' | 'raw' | 'word' | 'doc' | 'pdf';

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

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'boolean') return value ? 1 : 0;

  const text = cleanText(value)
    .replace(/\s/g, '')
    .replace('%', '')
    .replace(',', '.');

  if (!text) return null;

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || cleanText(value) === '';
}

function round(value: number | null | undefined, digits = 4): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sanitizeColumnName(value: unknown, fallback: string): string {
  const text = cleanText(value)
    .replace(/\s+/g, ' ')
    .replace(/^"+|"+$/g, '');

  return text || fallback;
}

function makeUniqueNames(headers: string[]): string[] {
  const used = new Map<string, number>();

  return headers.map((header, index) => {
    const base = sanitizeColumnName(header, `PremennĂˇ ${index + 1}`);
    const key = base.toLowerCase();
    const current = used.get(key) || 0;
    used.set(key, current + 1);

    if (current === 0) return base;
    return `${base}_${current + 1}`;
  });
}

function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  return index === -1 ? '' : fileName.slice(index).toLowerCase();
}

function detectDelimiter(line: string): string {
  const delimiters = [';', ',', '\t'];
  let best = ';';
  let bestCount = 0;

  for (const delimiter of delimiters) {
    const count = line.split(delimiter).length;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  return best;
}

function splitCsvLine(line: string, delimiter: string): string[] {
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

function convertCell(value: unknown): PrimitiveValue {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') return value;

  const text = cleanText(value);
  if (!text) return null;

  const numericValue = parseNumericValue(text);
  if (numericValue !== null && /^-?\d+([,.]\d+)?%?$/.test(text.replace(/\s/g, ''))) {
    return numericValue;
  }

  return text;
}

function countNonEmptyCells(row: unknown[]): number {
  return row.filter((cell) => !isEmptyValue(cell)).length;
}

function normalizeAoA(rawRows: unknown[][]): unknown[][] {
  return rawRows.map((row) => Array.isArray(row) ? row : []);
}

function detectHeaderRowIndex(rows: unknown[][]): number {
  const limit = Math.min(rows.length, 25);
  let bestIndex = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < limit; i += 1) {
    const row = rows[i] || [];
    const nonEmpty = row.map(cleanText).filter(Boolean);
    if (nonEmpty.length < 2) continue;

    const unique = new Set(nonEmpty.map((item) => item.toLowerCase())).size;
    const belowRows = rows.slice(i + 1, Math.min(rows.length, i + 11));
    const belowScore = belowRows.reduce((sum, belowRow) => sum + Math.min(countNonEmptyCells(belowRow), nonEmpty.length), 0);
    const textHeaders = nonEmpty.filter((item) => parseNumericValue(item) === null).length;
    const score = unique * 4 + textHeaders * 2 + belowScore - i * 0.25;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function aoaToRows(rawRows: unknown[][], headerRowIndex: number): {
  rows: DataRow[];
  headers: string[];
  originalHeaders: string[];
} {
  const headerRow = rawRows[headerRowIndex] || [];
  const originalHeaders = headerRow.map((header, index) =>
    sanitizeColumnName(header, `StÄşpec ${index + 1}`),
  );
  const headers = makeUniqueNames(originalHeaders);

  const rows: DataRow[] = [];

  for (const rawRow of rawRows.slice(headerRowIndex + 1)) {
    const row: DataRow = {};

    headers.forEach((header, index) => {
      row[header] = convertCell(rawRow[index]);
    });

    if (Object.values(row).some((value) => !isEmptyValue(value))) {
      rows.push(row);
    }
  }

  return { rows, headers, originalHeaders };
}

function removeDuplicateRows(rows: DataRow[]): {
  rows: DataRow[];
  removed: number;
} {
  const seen = new Set<string>();
  const output: DataRow[] = [];
  let removed = 0;

  for (const row of rows) {
    const signature = JSON.stringify(row);
    if (seen.has(signature)) {
      removed += 1;
      continue;
    }

    seen.add(signature);
    output.push(row);
  }

  return { rows: output, removed };
}

function parseDelimitedTextToWorkbookResult(fileName: string, text: string): WorkbookReadResult {
  const lines = cleanText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      fileName,
      selectedSheetName: 'CSV',
      sheetNames: ['CSV'],
      headerRowIndex: 0,
      originalRowCount: 0,
      originalColumnCount: 0,
      rows: [],
      originalHeaders: [],
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const aoa = lines.map((line) => splitCsvLine(line, delimiter));
  const headerRowIndex = detectHeaderRowIndex(aoa);
  const { rows, headers, originalHeaders } = aoaToRows(aoa, headerRowIndex);

  return {
    fileName,
    selectedSheetName: 'CSV',
    sheetNames: ['CSV'],
    headerRowIndex,
    originalRowCount: rows.length,
    originalColumnCount: headers.length,
    rows,
    originalHeaders,
  };
}

async function readExcelToWorkbookResult(file: File): Promise<WorkbookReadResult> {
  const XLSX = await import('xlsx');
  const buffer = Buffer.from(await file.arrayBuffer());

  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  let bestSheetName = workbook.SheetNames[0] || 'Sheet1';
  let bestAoA: unknown[][] = [];
  let bestScore = -Infinity;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const aoa = normalizeAoA(
      XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: null,
        raw: true,
      }),
    );

    const rowsWithData = aoa.filter((row) => countNonEmptyCells(row) > 0);
    const maxColumns = rowsWithData.reduce((max, row) => Math.max(max, countNonEmptyCells(row)), 0);
    const score = rowsWithData.length * Math.max(maxColumns, 1);

    if (score > bestScore) {
      bestScore = score;
      bestSheetName = sheetName;
      bestAoA = aoa;
    }
  }

  const headerRowIndex = detectHeaderRowIndex(bestAoA);
  const { rows, headers, originalHeaders } = aoaToRows(bestAoA, headerRowIndex);

  return {
    fileName: file.name,
    selectedSheetName: bestSheetName,
    sheetNames: workbook.SheetNames,
    headerRowIndex,
    originalRowCount: rows.length,
    originalColumnCount: headers.length,
    rows,
    originalHeaders,
  };
}

async function extractWorkbookResultFromFile(file: File): Promise<WorkbookReadResult> {
  const extension = getFileExtension(file.name);

  if (['.csv', '.txt'].includes(extension)) {
    return parseDelimitedTextToWorkbookResult(file.name, await file.text());
  }

  if (['.xlsx', '.xls'].includes(extension)) {
    return readExcelToWorkbookResult(file);
  }

  return {
    fileName: file.name,
    selectedSheetName: '',
    sheetNames: [],
    headerRowIndex: 0,
    originalRowCount: 0,
    originalColumnCount: 0,
    rows: [],
    originalHeaders: [],
  };
}

function isLikelyIdColumnName(column: string): boolean {
  const normalized = cleanText(column)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return (
    normalized === 'id' ||
    normalized === 'respondent id' ||
    normalized === 'respondent_id' ||
    normalized === 'respondent' ||
    normalized === 'cislo' ||
    normalized === 'poradie' ||
    normalized === 'por. c.' ||
    normalized.includes('identifikator') ||
    normalized.includes('identifier')
  );
}

function getColumnNames(rows: DataRow[]): string[] {
  const columns = new Set<string>();

  for (const row of rows) {
    Object.keys(row).forEach((key) => {
      if (cleanText(key)) columns.add(key);
    });
  }

  return Array.from(columns);
}

function getColumnValues(rows: DataRow[], column: string): PrimitiveValue[] {
  return rows.map((row) => row[column] ?? null);
}

function getValidValues(rows: DataRow[], column: string): PrimitiveValue[] {
  return getColumnValues(rows, column).filter((value) => !isEmptyValue(value));
}

function getNumericValues(rows: DataRow[], column: string): number[] {
  return getValidValues(rows, column)
    .map(parseNumericValue)
    .filter((value): value is number => value !== null);
}

function inferVariable(rows: DataRow[], column: string, index: number): AnalysisVariable {
  const values = getColumnValues(rows, column);
  const validValues = values.filter((value) => !isEmptyValue(value));
  const numericValues = validValues
    .map(parseNumericValue)
    .filter((value): value is number => value !== null);

  const uniqueStrings = Array.from(new Set(validValues.map((value) => cleanText(value)))).filter(Boolean);
  const numericRatio = validValues.length > 0 ? numericValues.length / validValues.length : 0;
  const uniqueCount = uniqueStrings.length;
  const min = numericValues.length ? Math.min(...numericValues) : null;
  const max = numericValues.length ? Math.max(...numericValues) : null;
  const isLikert =
    numericRatio >= 0.9 &&
    min !== null &&
    max !== null &&
    min >= 0 &&
    max <= 10 &&
    uniqueCount >= 2 &&
    uniqueCount <= 11;

  let kind: VariableKind = 'unknown';
  let role: VariableRole = 'unknown';
  let measurementLevel: AnalysisVariable['measurementLevel'] = 'unknown';

  if (validValues.length === 0) {
    kind = 'empty';
    role = 'unknown';
  } else if (isLikelyIdColumnName(column) || (uniqueCount === validValues.length && index === 0)) {
    kind = numericRatio >= 0.8 ? 'numeric' : 'categorical';
    role = 'identifier';
    measurementLevel = 'nominal';
  } else if (isLikert) {
    kind = 'likert';
    role = 'item';
    measurementLevel = 'ordinal';
  } else if (numericRatio >= 0.9) {
    kind = 'numeric';
    role = 'numeric';
    measurementLevel = 'scale';
  } else if (uniqueCount <= Math.min(20, Math.max(3, Math.floor(rows.length * 0.4)))) {
    kind = 'categorical';
    role = index <= 5 ? 'demographic' : 'grouping';
    measurementLevel = 'nominal';
  } else {
    kind = 'text';
    role = 'text';
    measurementLevel = 'nominal';
  }

  return {
    name: column,
    variable: column,
    label: column,
    originalName: column,
    displayName: column,
    type: kind,
    dataType: kind,
    kind,
    role,
    measurementLevel,
    nonMissing: validValues.length,
    valid: validValues.length,
    missing: rows.length - validValues.length,
    uniqueCount,
    uniqueValues: uniqueCount,
    min,
    max,
    examples: uniqueStrings.slice(0, 5),
    categories: uniqueStrings.slice(0, 20),
    scaleGroup: detectScaleGroup(column),
  };
}

function detectScaleGroup(column: string): string | null {
  const normalized = cleanText(column)
    .replace(/\[[^\]]+\]/g, '')
    .trim();

  const patterns = [
    /^(.+?)[_\-\s]*\d+$/i,
    /^([A-Za-zĂ-Ĺľ]+)[_\-\s]*Q?\d+$/i,
    /^([A-Za-zĂ-Ĺľ]+)[_\-\s]*item[_\-\s]*\d+$/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const group = cleanText(match[1]).replace(/[_\-]+$/g, '').trim();
      if (group.length >= 2) return group;
    }
  }

  return null;
}

function buildScaleDefinitions(itemColumns: string[]): {
  scaleDefinitions: ScaleDefinition[];
  subscaleDefinitions: ScaleDefinition[];
} {
  const grouped = new Map<string, string[]>();

  itemColumns.forEach((column) => {
    const group = detectScaleGroup(column);
    if (!group) return;
    const current = grouped.get(group) || [];
    current.push(column);
    grouped.set(group, current);
  });

  const subscaleDefinitions: ScaleDefinition[] = Array.from(grouped.entries())
    .filter(([, items]) => items.length >= 2)
    .map(([name, items]) => ({
      name,
      label: `SubĹˇkĂˇla: ${name}`,
      type: 'subscale',
      items,
      scoring: 'mean',
      description: `Automaticky rozpoznanĂˇ subĹˇkĂˇla podÄľa nĂˇzvov poloĹľiek: ${items.join(', ')}`,
    }));

  const scaleDefinitions: ScaleDefinition[] = [];

  if (itemColumns.length >= 2) {
    scaleDefinitions.push({
      name: 'total_score',
      label: 'CelkovĂ© skĂłre',
      type: 'scale',
      items: itemColumns,
      scoring: 'mean',
      description: 'CelkovĂˇ ĹˇkĂˇla vypoÄŤĂ­tanĂˇ ako priemer vĹˇetkĂ˝ch rozpoznanĂ˝ch poloĹľiek.',
    });
  }

  if (subscaleDefinitions.length === 1 && scaleDefinitions.length === 0) {
    scaleDefinitions.push({
      ...subscaleDefinitions[0],
      type: 'scale',
      label: subscaleDefinitions[0].label.replace(/^SubĹˇkĂˇla:\s*/i, 'Ĺ kĂˇla: '),
    });
  }

  return { scaleDefinitions, subscaleDefinitions };
}

function computeScore(row: DataRow, items: string[], scoring: 'mean' | 'sum'): number | null {
  const values = items
    .map((item) => parseNumericValue(row[item]))
    .filter((value): value is number => value !== null);

  if (values.length === 0) return null;

  const sum = values.reduce((acc, value) => acc + value, 0);
  return scoring === 'sum' ? round(sum) : round(sum / values.length);
}

function prepareDataset(workbook: WorkbookReadResult): PreparedDataset {
  const emptyRowsRemoved = workbook.rows.filter((row) =>
    Object.values(row).some((value) => !isEmptyValue(value)),
  );

  const removedEmptyRows = workbook.rows.length - emptyRowsRemoved.length;
  const deduplicated = removeDuplicateRows(emptyRowsRemoved);
  const baseRows = deduplicated.rows;
  const headers = getColumnNames(baseRows);
  const variables = headers.map((column, index) => inferVariable(baseRows, column, index));

  const itemColumns = variables.filter((variable) => variable.role === 'item').map((variable) => variable.name);
  const numericColumns = variables
    .filter((variable) => ['numeric', 'scale', 'subscale'].includes(variable.role) || variable.kind === 'numeric')
    .map((variable) => variable.name);
  const categoricalColumns = variables
    .filter((variable) => ['categorical', 'ordinal', 'likert'].includes(variable.kind))
    .map((variable) => variable.name);
  const groupingColumns = variables
    .filter((variable) => ['demographic', 'grouping'].includes(variable.role))
    .map((variable) => variable.name);
  const demographicColumns = variables
    .filter((variable) => variable.role === 'demographic')
    .map((variable) => variable.name);
  const textColumns = variables.filter((variable) => variable.kind === 'text').map((variable) => variable.name);
  const dateColumns = variables.filter((variable) => variable.kind === 'date').map((variable) => variable.name);

  const { scaleDefinitions, subscaleDefinitions } = buildScaleDefinitions(itemColumns);

  const rows = baseRows.map((row, index) => {
    const nextRow: DataRow = { respondentId: index + 1, ...row };

    for (const definition of scaleDefinitions) {
      nextRow[definition.label] = computeScore(row, definition.items, definition.scoring);
    }

    for (const definition of subscaleDefinitions) {
      nextRow[definition.label] = computeScore(row, definition.items, definition.scoring);
    }

    return nextRow;
  });

  const scaleVariables: AnalysisVariable[] = scaleDefinitions.map((definition) => ({
    name: definition.label,
    variable: definition.label,
    label: definition.label,
    originalName: definition.label,
    displayName: definition.label,
    type: 'numeric',
    dataType: 'numeric',
    kind: 'numeric',
    role: 'scale',
    measurementLevel: 'scale',
    nonMissing: rows.filter((row) => !isEmptyValue(row[definition.label])).length,
    valid: rows.filter((row) => !isEmptyValue(row[definition.label])).length,
    missing: rows.filter((row) => isEmptyValue(row[definition.label])).length,
    uniqueCount: new Set(rows.map((row) => cleanText(row[definition.label])).filter(Boolean)).size,
    uniqueValues: new Set(rows.map((row) => cleanText(row[definition.label])).filter(Boolean)).size,
    min: null,
    max: null,
    examples: [],
    categories: [],
    scaleGroup: definition.name,
  }));

  const subscaleVariables: AnalysisVariable[] = subscaleDefinitions.map((definition) => ({
    name: definition.label,
    variable: definition.label,
    label: definition.label,
    originalName: definition.label,
    displayName: definition.label,
    type: 'numeric',
    dataType: 'numeric',
    kind: 'numeric',
    role: 'subscale',
    measurementLevel: 'scale',
    nonMissing: rows.filter((row) => !isEmptyValue(row[definition.label])).length,
    valid: rows.filter((row) => !isEmptyValue(row[definition.label])).length,
    missing: rows.filter((row) => isEmptyValue(row[definition.label])).length,
    uniqueCount: new Set(rows.map((row) => cleanText(row[definition.label])).filter(Boolean)).size,
    uniqueValues: new Set(rows.map((row) => cleanText(row[definition.label])).filter(Boolean)).size,
    min: null,
    max: null,
    examples: [],
    categories: [],
    scaleGroup: definition.name,
  }));

  const allVariables = [...variables, ...scaleVariables, ...subscaleVariables];
  const rawHeaders = ['respondentId', ...headers, ...scaleDefinitions.map((item) => item.label), ...subscaleDefinitions.map((item) => item.label)];

  const rawDataSheet = [
    rawHeaders,
    ...rows.map((row) => rawHeaders.map((header) => row[header] ?? null)),
  ];

  const variableMapSheet = [
    [
      'originalName',
      'name',
      'displayName',
      'role',
      'kind',
      'measurementLevel',
      'valid',
      'missing',
      'uniqueCount',
      'min',
      'max',
      'scaleGroup',
      'examples',
      'categories',
      'notes',
    ],
    ...allVariables.map((variable) => [
      variable.originalName,
      variable.name,
      variable.displayName,
      variable.role,
      variable.kind,
      variable.measurementLevel,
      variable.valid,
      variable.missing,
      variable.uniqueCount,
      variable.min,
      variable.max,
      variable.scaleGroup ?? '',
      variable.examples.join(', '),
      variable.categories.join(', '),
      variable.notes ?? '',
    ]),
  ];

  const warnings: string[] = [];

  if (itemColumns.length >= 2 && scaleDefinitions.length === 0 && subscaleDefinitions.length === 0) {
    warnings.push('Boli rozpoznanĂ© poloĹľky, ale nepodarilo sa vytvoriĹĄ ĹˇkĂˇly alebo subĹˇkĂˇly.');
  }

  if (groupingColumns.length === 0) {
    warnings.push('Neboli rozpoznanĂ© skupinovĂ© premennĂ©. SkupinovĂ© testy sa nemusia vykonaĹĄ.');
  }

  const dataQualitySheet = [
    ['UkazovateÄľ', 'Hodnota'],
    ['sourceFileName', workbook.fileName],
    ['selectedSheetName', workbook.selectedSheetName],
    ['headerRowIndex', workbook.headerRowIndex],
    ['originalRowCount', workbook.originalRowCount],
    ['rowCount', rows.length],
    ['originalColumnCount', workbook.originalColumnCount],
    ['variableCount', allVariables.length],
    ['removedEmptyRows', removedEmptyRows],
    ['removedDuplicateRows', deduplicated.removed],
    ['scaleCount', scaleDefinitions.length],
    ['subscaleCount', subscaleDefinitions.length],
    ['warnings', warnings.join(' | ')],
  ];

  return {
    sourceFileName: workbook.fileName,
    selectedSheetName: workbook.selectedSheetName,
    originalHeaders: workbook.originalHeaders,
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
    rawDataSheet,
    variableMapSheet,
    dataQualitySheet,
    quality: {
      sourceFileName: workbook.fileName,
      selectedSheetName: workbook.selectedSheetName,
      headerRowIndex: workbook.headerRowIndex,
      originalRowCount: workbook.originalRowCount,
      rowCount: rows.length,
      originalColumnCount: workbook.originalColumnCount,
      variableCount: allVariables.length,
      removedEmptyRows,
      removedDuplicateRows: deduplicated.removed,
      scaleCount: scaleDefinitions.length,
      subscaleCount: subscaleDefinitions.length,
      warnings,
      notes: [
        'Ĺ tatistiky sa poÄŤĂ­tajĂş z pripravenĂ˝ch raw dĂˇt.',
        'Raw dĂˇta obsahujĂş pĂ´vodnĂ© stÄşpce aj vypoÄŤĂ­tanĂ© ĹˇkĂˇly/subĹˇkĂˇly.',
      ],
    },
  };
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

function variance(values: number[]): number | null {
  if (values.length <= 1) return null;
  const avg = mean(values);
  if (avg === null) return null;
  return values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
}

function standardDeviation(values: number[]): number | null {
  const varValue = variance(values);
  return varValue === null ? null : Math.sqrt(varValue);
}

function skewness(values: number[]): number | null {
  if (values.length < 3) return null;
  const avg = mean(values);
  const sd = standardDeviation(values);
  if (avg === null || sd === null || sd === 0) return null;
  const n = values.length;
  const sumCubed = values.reduce((sum, value) => sum + ((value - avg) / sd) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sumCubed;
}

function kurtosis(values: number[]): number | null {
  if (values.length < 4) return null;
  const avg = mean(values);
  const sd = standardDeviation(values);
  if (avg === null || sd === null || sd === 0) return null;
  const n = values.length;
  const sumFourth = values.reduce((sum, value) => sum + ((value - avg) / sd) ** 4, 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sumFourth -
    (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

function calculateDescriptives(dataset: PreparedDataset): DescriptiveRow[] {
  const columns = Array.from(new Set([
    ...dataset.numericColumns,
    ...dataset.itemColumns,
    ...dataset.scaleDefinitions.map((item) => item.label),
    ...dataset.subscaleDefinitions.map((item) => item.label),
  ])).filter((column) => !isLikelyIdColumnName(column));

  return columns.map((column) => {
    const values = getNumericValues(dataset.rows, column);
    const q1 = quantile(values, 0.25);
    const q3 = quantile(values, 0.75);

    return {
      variable: column,
      n: values.length,
      missing: dataset.rows.length - values.length,
      mean: round(mean(values)),
      median: round(median(values)),
      sd: round(standardDeviation(values)),
      minimum: values.length ? round(Math.min(...values)) : null,
      min: values.length ? round(Math.min(...values)) : null,
      maximum: values.length ? round(Math.max(...values)) : null,
      max: values.length ? round(Math.max(...values)) : null,
      q1: round(q1),
      q3: round(q3),
      iqr: q1 !== null && q3 !== null ? round(q3 - q1) : null,
      skewness: round(skewness(values)),
      kurtosis: round(kurtosis(values)),
    };
  });
}

function compareFrequencyLabels(a: string, b: string): number {
  const aNumber = parseNumericValue(a);
  const bNumber = parseNumericValue(b);
  if (aNumber !== null && bNumber !== null) return aNumber - bNumber;
  return a.localeCompare(b, 'sk', { numeric: true, sensitivity: 'base' });
}

function calculateFrequencies(dataset: PreparedDataset): FrequencyTable[] {
  const columns = Array.from(new Set([
    ...dataset.categoricalColumns,
    ...dataset.groupingColumns,
    ...dataset.demographicColumns,
    ...dataset.itemColumns,
  ])).filter((column) => !isLikelyIdColumnName(column));

  return columns.map((column) => {
    const values = dataset.rows.map((row) => row[column]);
    const total = values.length;
    const validValues = values.filter((value) => !isEmptyValue(value));
    const validTotal = validValues.length;
    const counts = new Map<string, number>();

    validValues.forEach((value) => {
      const key = cleanText(value) || 'NezadanĂ©';
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    let cumulativePercent = 0;

    const rows: FrequencyRow[] = Array.from(counts.entries())
      .sort((a, b) => compareFrequencyLabels(a[0], b[0]))
      .map(([value, count]) => {
        const percent = total ? (count / total) * 100 : 0;
        const validPercent = validTotal ? (count / validTotal) * 100 : 0;
        cumulativePercent += validPercent;

        return {
          variable: column,
          value,
          category: value,
          count,
          frequency: count,
          percent: round(percent, 2) || 0,
          percentage: round(percent, 2) || 0,
          validPercent: round(validPercent, 2),
          cumulativePercent: round(cumulativePercent, 2),
        };
      });

    const missing = total - validTotal;
    if (missing > 0) {
      rows.push({
        variable: column,
        value: 'Missing',
        category: 'Missing',
        count: missing,
        frequency: missing,
        percent: round((missing / Math.max(total, 1)) * 100, 2) || 0,
        percentage: round((missing / Math.max(total, 1)) * 100, 2) || 0,
        validPercent: null,
        cumulativePercent: null,
      });
    }

    return {
      variable: column,
      name: column,
      title: `Frequencies for ${column}`,
      description: `FrekvenÄŤnĂˇ tabuÄľka pre premennĂş ${column}.`,
      rows,
      data: rows,
      values: rows,
      total,
      validTotal,
      missingTotal: missing,
    };
  });
}

function cronbachAlpha(matrix: number[][]): number | null {
  if (matrix.length < 2) return null;

  const itemCount = matrix[0]?.length || 0;
  if (itemCount < 2) return null;

  const cleanMatrix = matrix.filter(
    (row) => row.length === itemCount && row.every((value) => Number.isFinite(value)),
  );

  if (cleanMatrix.length < 2) return null;

  const itemVariances = Array.from({ length: itemCount }, (_, index) =>
    variance(cleanMatrix.map((row) => row[index])) || 0,
  );

  const totals = cleanMatrix.map((row) => row.reduce((sum, value) => sum + value, 0));
  const totalVariance = variance(totals);

  if (!totalVariance || totalVariance <= 0) return null;

  const alpha =
    (itemCount / (itemCount - 1)) *
    (1 - itemVariances.reduce((sum, value) => sum + value, 0) / totalVariance);

  return Number.isFinite(alpha) ? alpha : null;
}

function interpretAlpha(alpha: number | null): string {
  if (alpha === null) return 'Reliabilitu nebolo moĹľnĂ© vypoÄŤĂ­taĹĄ.';
  if (alpha >= 0.9) return 'VĂ˝bornĂˇ reliabilita.';
  if (alpha >= 0.8) return 'DobrĂˇ reliabilita.';
  if (alpha >= 0.7) return 'AkceptovateÄľnĂˇ reliabilita.';
  if (alpha >= 0.6) return 'HraniÄŤnĂˇ reliabilita.';
  return 'NĂ­zka reliabilita.';
}

function getReliabilityCandidateDefinitions(dataset: PreparedDataset): ScaleDefinition[] {
  const definitions = [...dataset.scaleDefinitions, ...dataset.subscaleDefinitions]
    .filter((definition) => definition.items.length >= 2);

  const usedNames = new Set(definitions.map((definition) => definition.label.toLowerCase()));
  const candidates: ScaleDefinition[] = [...definitions];

  const itemLikeColumns = dataset.variables
    .filter((variable) => {
      if (variable.role === 'identifier') return false;
      if (variable.role === 'item') return true;
      if (variable.kind === 'likert' || variable.measurementLevel === 'ordinal') return true;

      const numericValues = getNumericValues(dataset.rows, variable.name);
      if (numericValues.length < 3) return false;

      const minValue = Math.min(...numericValues);
      const maxValue = Math.max(...numericValues);
      const uniqueCount = new Set(numericValues.map((value) => String(value))).size;

      return minValue >= 0 && maxValue <= 10 && uniqueCount >= 2 && uniqueCount <= 15;
    })
    .map((variable) => variable.name)
    .filter((column) => !isLikelyIdColumnName(column));

  const grouped = new Map<string, string[]>();

  itemLikeColumns.forEach((column) => {
    const group = detectScaleGroup(column) || 'Automaticky rozpoznané položky';
    const current = grouped.get(group) || [];
    current.push(column);
    grouped.set(group, current);
  });

  Array.from(grouped.entries())
    .filter(([, items]) => items.length >= 2)
    .forEach(([group, items]) => {
      const label = group === 'Automaticky rozpoznané položky'
        ? 'Reliabilita – všetky rozpoznané položky'
        : `Reliabilita – ${group}`;

      if (!usedNames.has(label.toLowerCase())) {
        usedNames.add(label.toLowerCase());
        candidates.push({
          name: group,
          label,
          type: 'scale',
          items,
          scoring: 'mean',
          description: `Automaticky vytvorená škála pre výpočet reliability z položiek: ${items.join(', ')}`,
        });
      }
    });

  const numericLikeColumns = Array.from(new Set([
    ...itemLikeColumns,
    ...dataset.itemColumns,
  ])).filter((column) => !isLikelyIdColumnName(column));

  if (numericLikeColumns.length >= 2 && !usedNames.has('reliabilita – všetky položky')) {
    candidates.push({
      name: 'all_items_reliability',
      label: 'Reliabilita – všetky položky',
      type: 'scale',
      items: numericLikeColumns,
      scoring: 'mean',
      description: 'Záložná reliabilita zo všetkých číselných/ordinálnych položiek, aby výstup neostal prázdny.',
    });
  }

  return candidates;
}

function buildReliabilityMatrix(dataset: PreparedDataset, items: string[]): number[][] {
  const itemMeans = items.map((item) => mean(getNumericValues(dataset.rows, item)));

  return dataset.rows
    .map((row) => {
      const rawValues = items.map((item) => parseNumericValue(row[item]));
      const validCount = rawValues.filter((value) => value !== null).length;

      if (validCount < 2) return null;

      const filled = rawValues.map((value, index) => {
        if (value !== null) return value;

        return itemMeans[index] ?? null;
      });

      if (filled.some((value) => value === null || !Number.isFinite(value))) {
        return null;
      }

      return filled as number[];
    })
    .filter((row): row is number[] => Array.isArray(row) && row.length === items.length);
}

function calculateReliabilities(dataset: PreparedDataset): ReliabilityRow[] {
  const definitions = getReliabilityCandidateDefinitions(dataset);

  return definitions.map((definition) => {
    const matrix = buildReliabilityMatrix(dataset, definition.items);
    const alpha = cronbachAlpha(matrix);
    const roundedAlpha = round(alpha);

    return {
      scale: definition.label,
      name: definition.label,
      label: definition.label,
      items: definition.items,
      itemCount: definition.items.length,
      validN: matrix.length,
      n: matrix.length,
      cronbachAlpha: roundedAlpha,
      alpha: roundedAlpha,
      interpretation: interpretAlpha(alpha),
    };
  });
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
    sx += dx ** 2;
    sy += dy ** 2;
  }

  const denominator = Math.sqrt(sx * sy);
  return denominator === 0 ? null : numerator / denominator;
}

function rank(values: number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => a.value - b.value);

  const ranks = new Array(values.length);
  let i = 0;

  while (i < indexed.length) {
    let j = i;

    while (j + 1 < indexed.length && indexed[j + 1].value === indexed[i].value) {
      j += 1;
    }

    const avgRank = (i + 1 + j + 1) / 2;

    for (let k = i; k <= j; k += 1) {
      ranks[indexed[k].index] = avgRank;
    }

    i = j + 1;
  }

  return ranks;
}

function spearman(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  return pearson(rank(x), rank(y));
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
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));
  return sign * y;
}

function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function approximateCorrelationPValue(r: number | null, n: number): number | null {
  if (r === null || n < 3) return null;
  const absR = Math.min(Math.abs(r), 0.999999);
  const z = 0.5 * Math.log((1 + absR) / (1 - absR)) * Math.sqrt(n - 3);
  return 2 * (1 - normalCdf(Math.abs(z)));
}

function correlationStrength(r: number | null): string {
  if (r === null) return 'nevyhodnotenĂ©';
  const abs = Math.abs(r);
  if (abs >= 0.7) return 'silnĂ˝ vzĹĄah';
  if (abs >= 0.5) return 'stredne silnĂ˝ vzĹĄah';
  if (abs >= 0.3) return 'slabĹˇĂ­ vzĹĄah';
  return 'veÄľmi slabĂ˝ vzĹĄah';
}

function getCorrelationVariables(dataset: PreparedDataset): string[] {
  const candidates = Array.from(new Set([
    ...dataset.scaleDefinitions.map((definition) => definition.label),
    ...dataset.subscaleDefinitions.map((definition) => definition.label),
    ...dataset.numericColumns,
    ...dataset.itemColumns,
    ...dataset.variables
      .filter((variable) => variable.role !== 'identifier' && ['numeric', 'likert', 'ordinal'].includes(variable.kind))
      .map((variable) => variable.name),
  ]));

  return candidates
    .filter((column) => !isLikelyIdColumnName(column))
    .filter((column) => {
      const values = getNumericValues(dataset.rows, column);
      if (values.length < 3) return false;

      return new Set(values.map((value) => String(value))).size >= 2;
    })
    .slice(0, 120);
}

function buildPairedValues(dataset: PreparedDataset, variable1: string, variable2: string): { x: number[]; y: number[] } {
  const pairs = dataset.rows
    .map((row) => ({
      x: parseNumericValue(row[variable1]),
      y: parseNumericValue(row[variable2]),
    }))
    .filter((pair): pair is { x: number; y: number } => pair.x !== null && pair.y !== null);

  return {
    x: pairs.map((pair) => pair.x),
    y: pairs.map((pair) => pair.y),
  };
}

function calculateCorrelations(dataset: PreparedDataset): CorrelationRow[] {
  const variables = getCorrelationVariables(dataset);
  const result: CorrelationRow[] = [];

  for (let i = 0; i < variables.length; i += 1) {
    for (let j = i + 1; j < variables.length; j += 1) {
      const variable1 = variables[i];
      const variable2 = variables[j];
      const { x, y } = buildPairedValues(dataset, variable1, variable2);

      if (x.length < 3 || y.length < 3) continue;

      const pearsonR = pearson(x, y);
      const spearmanRho = spearman(x, y);

      const pPearson = approximateCorrelationPValue(pearsonR, x.length);
      const pSpearman = approximateCorrelationPValue(spearmanRho, x.length);

      result.push({
        test: 'Pearson',
        variable1,
        variable2,
        variableA: variable1,
        variableB: variable2,
        n: x.length,
        coefficient: round(pearsonR),
        r: round(pearsonR),
        pearsonR: round(pearsonR),
        pValue: round(pPearson),
        p: round(pPearson),
        strength: correlationStrength(pearsonR),
        direction: pearsonR === null ? 'none' : pearsonR > 0 ? 'positive' : pearsonR < 0 ? 'negative' : 'none',
        significant: (pPearson ?? 1) < 0.05,
        interpretation: `Pearsonova korelácia medzi ${variable1} a ${variable2}: r = ${round(pearsonR) ?? '—'}, p = ${round(pPearson) ?? '—'}.`,
      });

      result.push({
        test: 'Spearman',
        variable1,
        variable2,
        variableA: variable1,
        variableB: variable2,
        n: x.length,
        coefficient: round(spearmanRho),
        rho: round(spearmanRho),
        spearmanRho: round(spearmanRho),
        pValue: round(pSpearman),
        p: round(pSpearman),
        strength: correlationStrength(spearmanRho),
        direction: spearmanRho === null ? 'none' : spearmanRho > 0 ? 'positive' : spearmanRho < 0 ? 'negative' : 'none',
        significant: (pSpearman ?? 1) < 0.05,
        interpretation: `Spearmanova korelácia medzi ${variable1} a ${variable2}: rho = ${round(spearmanRho) ?? '—'}, p = ${round(pSpearman) ?? '—'}.`,
      });
    }
  }

  return result;
}

function buildCorrelationMatrix(correlations: CorrelationRow[], method: 'Pearson' | 'Spearman' = 'Spearman'): AnyRecord[] {
  const filtered = correlations.filter((row) => row.test === method);
  const variables = Array.from(new Set(filtered.flatMap((row) => [row.variable1, row.variable2])));

  return variables.map((variable) => {
    const matrixRow: AnyRecord = { variable };

    variables.forEach((column) => {
      if (column === variable) {
        matrixRow[column] = 1;
        return;
      }

      const found = filtered.find((row) =>
        (row.variable1 === variable && row.variable2 === column) ||
        (row.variable1 === column && row.variable2 === variable),
      );

      matrixRow[column] = found?.coefficient ?? null;
    });

    return matrixRow;
  });
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

  z -= 1;
  let x = 0.99999999999980993;

  for (let i = 0; i < coefficients.length; i += 1) {
    x += coefficients[i] / (z + i + 1);
  }

  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(x: number, a: number, b: number): number {
  const maxIterations = 100;
  const eps = 3e-7;
  const fpmin = 1e-30;

  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
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

  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(x, a, b)) / a;
  }

  return 1 - (bt * betacf(1 - x, b, a)) / b;
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

function getGroups(dataset: PreparedDataset, dependentVariable: string, groupVariable: string): Map<string, number[]> {
  const groups = new Map<string, number[]>();

  for (const row of dataset.rows) {
    const groupValue = row[groupVariable];
    const dependentValue = parseNumericValue(row[dependentVariable]);

    if (isEmptyValue(groupValue) || dependentValue === null) continue;

    const groupKey = cleanText(groupValue);
    const current = groups.get(groupKey) || [];
    current.push(dependentValue);
    groups.set(groupKey, current);
  }

  return groups;
}

function tTest(groups: Map<string, number[]>): { statistic: number | null; pValue: number | null; df: number | null } {
  const entries = Array.from(groups.entries()).filter(([, values]) => values.length >= 2);
  if (entries.length !== 2) return { statistic: null, pValue: null, df: null };

  const a = entries[0][1];
  const b = entries[1][1];

  const ma = mean(a);
  const mb = mean(b);
  const va = variance(a);
  const vb = variance(b);

  if (ma === null || mb === null || va === null || vb === null) {
    return { statistic: null, pValue: null, df: null };
  }

  const se = Math.sqrt(va / a.length + vb / b.length);
  if (se === 0) return { statistic: null, pValue: null, df: null };

  const t = (ma - mb) / se;
  const df = a.length + b.length - 2;
  const p = 2 * (1 - normalCdf(Math.abs(t)));

  return { statistic: t, pValue: p, df };
}

function mannWhitney(groups: Map<string, number[]>): { statistic: number | null; pValue: number | null } {
  const entries = Array.from(groups.entries()).filter(([, values]) => values.length >= 2);
  if (entries.length !== 2) return { statistic: null, pValue: null };

  const a = entries[0][1];
  const b = entries[1][1];

  const combined = [
    ...a.map((value) => ({ value, group: 'a' })),
    ...b.map((value) => ({ value, group: 'b' })),
  ].sort((left, right) => left.value - right.value);

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
  const p = 2 * (1 - normalCdf(Math.abs(z)));

  return { statistic: u, pValue: p };
}

function anova(groups: Map<string, number[]>): { statistic: number | null; pValue: number | null; df1: number | null; df2: number | null } {
  const entries = Array.from(groups.entries()).filter(([, values]) => values.length >= 2);
  if (entries.length < 2) return { statistic: null, pValue: null, df1: null, df2: null };

  const allValues = entries.flatMap(([, values]) => values);
  const grandMean = mean(allValues);
  if (grandMean === null) return { statistic: null, pValue: null, df1: null, df2: null };

  let ssBetween = 0;
  let ssWithin = 0;

  entries.forEach(([, values]) => {
    const groupMean = mean(values);
    if (groupMean === null) return;

    ssBetween += values.length * (groupMean - grandMean) ** 2;
    values.forEach((value) => {
      ssWithin += (value - groupMean) ** 2;
    });
  });

  const df1 = entries.length - 1;
  const df2 = allValues.length - entries.length;

  if (df1 <= 0 || df2 <= 0) return { statistic: null, pValue: null, df1, df2 };

  const msBetween = ssBetween / df1;
  const msWithin = ssWithin / df2;

  if (msWithin === 0) return { statistic: null, pValue: null, df1, df2 };

  const f = msBetween / msWithin;
  const p = fDistributionPValue(f, df1, df2);

  return { statistic: f, pValue: p, df1, df2 };
}

function kruskalWallis(groups: Map<string, number[]>): { statistic: number | null; pValue: number | null; df: number | null } {
  const entries = Array.from(groups.entries()).filter(([, values]) => values.length >= 2);
  if (entries.length < 2) return { statistic: null, pValue: null, df: null };

  const combined = entries.flatMap(([group, values]) => values.map((value) => ({ group, value })));
  const ranks = rank(combined.map((item) => item.value));
  const n = combined.length;

  let h = 0;

  entries.forEach(([group, values]) => {
    let rankSum = 0;

    combined.forEach((item, index) => {
      if (item.group === group) rankSum += ranks[index];
    });

    h += (rankSum ** 2) / values.length;
  });

  h = (12 / (n * (n + 1))) * h - 3 * (n + 1);

  const df = entries.length - 1;
  const p = chiSquarePValue(h, df);

  return { statistic: h, pValue: p, df };
}

function interpretPValue(pValue: number | null): string {
  if (pValue === null) return 'p-hodnota nebola vypoÄŤĂ­tanĂˇ.';
  if (pValue < 0.001) return 'VĂ˝sledok je Ĺˇtatisticky vĂ˝znamnĂ˝ na hladine p < 0,001.';
  if (pValue < 0.01) return 'VĂ˝sledok je Ĺˇtatisticky vĂ˝znamnĂ˝ na hladine p < 0,01.';
  if (pValue < 0.05) return 'VĂ˝sledok je Ĺˇtatisticky vĂ˝znamnĂ˝ na hladine p < 0,05.';
  return 'VĂ˝sledok nie je Ĺˇtatisticky vĂ˝znamnĂ˝ na hladine p < 0,05.';
}

function calculateStatisticalTests(dataset: PreparedDataset): StatisticalTestRow[] {
  const dependentVariables = Array.from(new Set([
    ...dataset.scaleDefinitions.map((definition) => definition.label),
    ...dataset.subscaleDefinitions.map((definition) => definition.label),
    ...dataset.numericColumns,
  ])).filter((column) => !isLikelyIdColumnName(column));

  const groupVariables = dataset.groupingColumns.filter((column) => !isLikelyIdColumnName(column));
  const output: StatisticalTestRow[] = [];

  for (const groupVariable of groupVariables) {
    for (const dependentVariable of dependentVariables) {
      if (groupVariable === dependentVariable) continue;

      const groups = getGroups(dataset, dependentVariable, groupVariable);
      const validGroups = Array.from(groups.entries()).filter(([, values]) => values.length >= 2);

      if (validGroups.length === 2) {
        const groupsText = validGroups.map(([group]) => group).join(' / ');

        const parametric = tTest(groups);
        output.push({
          test: 't-test',
          dependentVariable,
          groupVariable,
          groupingVariable: groupVariable,
          groups: groupsText,
          statistic: round(parametric.statistic),
          t: round(parametric.statistic),
          df: parametric.df,
          pValue: round(parametric.pValue),
          p: round(parametric.pValue),
          significant: (parametric.pValue ?? 1) < 0.05,
          interpretation: interpretPValue(parametric.pValue),
        });

        const nonParametric = mannWhitney(groups);
        output.push({
          test: 'Mann-Whitney U',
          dependentVariable,
          groupVariable,
          groupingVariable: groupVariable,
          groups: groupsText,
          statistic: round(nonParametric.statistic),
          u: round(nonParametric.statistic),
          pValue: round(nonParametric.pValue),
          p: round(nonParametric.pValue),
          significant: (nonParametric.pValue ?? 1) < 0.05,
          interpretation: interpretPValue(nonParametric.pValue),
        });
      }

      if (validGroups.length > 2 && validGroups.length <= 12) {
        const groupsText = validGroups.map(([group]) => group).join(' / ');

        const parametric = anova(groups);
        output.push({
          test: 'ANOVA',
          dependentVariable,
          groupVariable,
          groupingVariable: groupVariable,
          groups: groupsText,
          statistic: round(parametric.statistic),
          f: round(parametric.statistic),
          df1: parametric.df1,
          df2: parametric.df2,
          pValue: round(parametric.pValue),
          p: round(parametric.pValue),
          significant: (parametric.pValue ?? 1) < 0.05,
          interpretation: interpretPValue(parametric.pValue),
        });

        const nonParametric = kruskalWallis(groups);
        output.push({
          test: 'Kruskal-Wallis',
          dependentVariable,
          groupVariable,
          groupingVariable: groupVariable,
          groups: groupsText,
          statistic: round(nonParametric.statistic),
          h: round(nonParametric.statistic),
          df: nonParametric.df,
          pValue: round(nonParametric.pValue),
          p: round(nonParametric.pValue),
          significant: (nonParametric.pValue ?? 1) < 0.05,
          interpretation: interpretPValue(nonParametric.pValue),
        });
      }
    }
  }

  return output;
}

function buildRecommendedCharts(dataset: PreparedDataset): AnyRecord[] {
  const firstGrouping = dataset.groupingColumns[0] || 'skupinovĂˇ premennĂˇ';
  const firstNumeric = dataset.scaleDefinitions[0]?.label || dataset.subscaleDefinitions[0]?.label || dataset.numericColumns[0] || 'ÄŤĂ­selnĂˇ premennĂˇ';
  const secondNumeric = dataset.scaleDefinitions[1]?.label || dataset.subscaleDefinitions[1]?.label || dataset.numericColumns[1] || 'druhĂˇ ÄŤĂ­selnĂˇ premennĂˇ';
  const scaleVariables = [
    ...dataset.scaleDefinitions.map((definition) => definition.label),
    ...dataset.subscaleDefinitions.map((definition) => definition.label),
  ];

  return [
    {
      name: 'StÄşpcovĂ˝ graf kategorizovanĂ˝ch premennĂ˝ch',
      title: 'StÄşpcovĂ˝ graf kategorizovanĂ˝ch premennĂ˝ch',
      type: 'bar',
      chartType: 'bar',
      variables: dataset.groupingColumns.length ? dataset.groupingColumns : [firstGrouping],
      reason: 'VhodnĂ© pre demografickĂ© a skupinovĂ© premennĂ©.',
    },
    {
      name: 'Histogram ÄŤĂ­selnej premennej',
      title: 'Histogram ÄŤĂ­selnej premennej',
      type: 'histogram',
      chartType: 'histogram',
      variables: [firstNumeric],
      reason: 'VhodnĂ© na vizuĂˇlnu kontrolu rozdelenia.',
    },
    {
      name: 'Boxplot podÄľa skupĂ­n',
      title: 'Boxplot podÄľa skupĂ­n',
      type: 'boxplot',
      chartType: 'boxplot',
      variables: [firstGrouping, firstNumeric],
      x: firstGrouping,
      y: firstNumeric,
      groupBy: firstGrouping,
      reason: 'VhodnĂ© pred t-testom, ANOVA, Mann-Whitney alebo Kruskal-Wallis.',
    },
    {
      name: 'KorelaÄŤnĂˇ matica',
      title: 'KorelaÄŤnĂˇ matica',
      type: 'heatmap',
      chartType: 'heatmap',
      variables: scaleVariables.length >= 2 ? scaleVariables : [firstNumeric, secondNumeric],
      reason: 'VhodnĂ© na zobrazenie PearsonovĂ˝ch alebo SpearmanovĂ˝ch korelĂˇciĂ­.',
    },
  ];
}

function buildRecommendedTests(dataset: PreparedDataset): AnyRecord[] {
  const firstGrouping = dataset.groupingColumns[0] || 'skupinovĂˇ premennĂˇ';
  const firstNumeric = dataset.scaleDefinitions[0]?.label || dataset.subscaleDefinitions[0]?.label || dataset.numericColumns[0] || 'ÄŤĂ­selnĂˇ premennĂˇ';
  const secondNumeric = dataset.scaleDefinitions[1]?.label || dataset.subscaleDefinitions[1]?.label || dataset.numericColumns[1] || 'druhĂˇ ÄŤĂ­selnĂˇ premennĂˇ';
  const numericVariables = [
    ...dataset.scaleDefinitions.map((definition) => definition.label),
    ...dataset.subscaleDefinitions.map((definition) => definition.label),
    ...dataset.numericColumns,
  ];

  return [
    {
      name: 'DeskriptĂ­vna Ĺˇtatistika',
      test: 'DeskriptĂ­vna Ĺˇtatistika',
      variables: numericVariables,
      reason: 'ZĂˇkladnĂ˝ krok po vytvorenĂ­ raw-data.xlsx.',
    },
    {
      name: 'FrekvenÄŤnĂˇ analĂ˝za',
      test: 'FrekvenÄŤnĂ© tabuÄľky',
      variables: dataset.groupingColumns,
      reason: 'VhodnĂ© pre kategorizovanĂ© a ordinĂˇlne premennĂ©.',
    },
    {
      name: 'Reliabilita ĹˇkĂˇl',
      test: 'Cronbachova alfa',
      variables: dataset.itemColumns,
      reason: 'Reliabilita sa poÄŤĂ­ta z poloĹľiek patriacich do ĹˇkĂˇly alebo subĹˇkĂˇly.',
    },
    {
      name: 'KorelaÄŤnĂˇ analĂ˝za',
      test: 'Pearsonova alebo Spearmanova korelĂˇcia',
      variables: [firstNumeric, secondNumeric],
      reason: 'Pearson pri splnenĂ­ predpokladov, Spearman pri ordinĂˇlnych/nenormĂˇlnych dĂˇtach.',
    },
    {
      name: 'Rozdiely medzi dvoma skupinami',
      test: 't-test alebo Mann-Whitney U',
      dependentVariable: firstNumeric,
      groupingVariable: firstGrouping,
      variables: [firstGrouping, firstNumeric],
      reason: 'PouĹľiĹĄ pri skupinovej premennej s dvoma skupinami.',
    },
    {
      name: 'Rozdiely medzi viacerĂ˝mi skupinami',
      test: 'ANOVA alebo Kruskal-Wallis',
      dependentVariable: firstNumeric,
      groupingVariable: firstGrouping,
      variables: [firstGrouping, firstNumeric],
      reason: 'PouĹľiĹĄ pri skupinovej premennej s tromi a viac skupinami.',
    },
  ];
}

function workbookBase64FromSheets(sheets: { name: string; rows: unknown[][] }[]): string {
  const XLSX = require('xlsx');
  const workbook = XLSX.utils.book_new();
  const used = new Set<string>();

  sheets.forEach((sheet) => {
    const name = uniqueSheetName(sheet.name, used);
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });

  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  return Buffer.from(buffer).toString('base64');
}

function objectsToSheetRows(data: AnyRecord[], emptyLabel = 'Ĺ˝iadne dĂˇta'): unknown[][] {
  if (!data.length) return [[emptyLabel]];

  const headers = Array.from(new Set(data.flatMap((row) => Object.keys(row))));

  return [
    headers,
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        if (Array.isArray(value)) return value.join(', ');
        if (isRecord(value)) return JSON.stringify(value);
        return value ?? null;
      }),
    ),
  ];
}

function frequenciesToRows(frequencies: FrequencyTable[]): unknown[][] {
  const rows = frequencies.flatMap((table) =>
    table.rows.map((row) => ({
      ...row,
      variable: row.variable ?? table.variable,
    })),
  );

  return objectsToSheetRows(rows, 'Ĺ˝iadne frekvencie');
}

function buildExcelSheets(result: AnalysisResult, type: 'raw' | 'full' = 'full'): { name: string; rows: unknown[][] }[] {
  const prepared = result.preparedDataset;

  const rawSheets = [
    { name: 'raw-data', rows: prepared.rawDataSheet },
    { name: 'variable-map', rows: prepared.variableMapSheet },
    { name: 'data-quality', rows: prepared.dataQualitySheet },
  ];

  if (type === 'raw') return rawSheets;

  return [
    ...rawSheets,
    { name: 'descriptives', rows: objectsToSheetRows(result.descriptives as AnyRecord[]) },
    { name: 'frequencies', rows: frequenciesToRows(result.frequencies) },
    { name: 'scale-scores', rows: objectsToSheetRows((result.scaleScores || []) as AnyRecord[]) },
    { name: 'reliability', rows: objectsToSheetRows(result.reliabilities as AnyRecord[]) },
    { name: 'correlations', rows: objectsToSheetRows(result.correlations as AnyRecord[]) },
    { name: 'correlation-matrix', rows: objectsToSheetRows((result.correlationMatrix || []) as AnyRecord[]) },
    { name: 'parametric-tests', rows: objectsToSheetRows((result.parametricGroupTests || []) as AnyRecord[]) },
    { name: 'non-parametric-tests', rows: objectsToSheetRows((result.nonParametricGroupTests || []) as AnyRecord[]) },
    { name: 'tests', rows: objectsToSheetRows(result.statisticalTests as AnyRecord[]) },
    { name: 'recommended-tests', rows: objectsToSheetRows(result.recommendedTests) },
    { name: 'recommended-charts', rows: objectsToSheetRows(result.recommendedCharts) },
    { name: 'warnings', rows: [['Upozornenie'], ...result.warnings.map((warning) => [warning])] },
  ];
}

function uniqueSheetName(base: string, used: Set<string>): string {
  const cleaned = cleanText(base).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || 'Sheet';
  let name = cleaned;
  let index = 2;

  while (used.has(name.toLowerCase())) {
    const suffix = ` ${index}`;
    name = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }

  used.add(name.toLowerCase());
  return name;
}

async function createXlsxBuffer(result: AnalysisResult, type: 'raw' | 'full' = 'full'): Promise<Buffer> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const used = new Set<string>();

  for (const sheet of buildExcelSheets(result, type)) {
    const safeRows = Array.isArray(sheet.rows) && sheet.rows.length > 0
      ? sheet.rows
      : [['Žiadne dáta']];

    const worksheet = XLSX.utils.aoa_to_sheet(safeRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, uniqueSheetName(sheet.name, used));
  }

  const output = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  if (Buffer.isBuffer(output)) {
    return output;
  }

  if (output instanceof ArrayBuffer) {
    return Buffer.from(output);
  }

  if (ArrayBuffer.isView(output)) {
    return Buffer.from(output.buffer, output.byteOffset, output.byteLength);
  }

  return Buffer.from(output);
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtmlTable(title: string, rows: unknown[][]): string {
  if (!rows.length) return '';

  const [headers, ...bodyRows] = rows;

  return `
    <h2>${htmlEscape(title)}</h2>
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${htmlEscape(header)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  `;
}

function createHtmlDocument(result: AnalysisResult): string {
  const sheets = buildExcelSheets(result, 'full');

  return `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8" />
<title>${htmlEscape(result.title)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #111827; line-height: 1.55; padding: 32px; }
  h1 { color: #0f172a; }
  h2 { margin-top: 28px; color: #1e3a8a; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; font-size: 12px; }
  th { background: #0f172a; color: white; text-align: left; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
  .summary { padding: 16px; background: #f8fafc; border: 1px solid #cbd5e1; }
</style>
</head>
<body>
<h1>${htmlEscape(result.title)}</h1>
<div class="summary">
  <p>${htmlEscape(result.summary)}</p>
  <p>${htmlEscape(result.dataDescription)}</p>
</div>
<h2>InterpretĂˇcia</h2>
<p>${htmlEscape(result.interpretation || result.practicalText)}</p>
${sheets.map((sheet) => renderHtmlTable(sheet.name, sheet.rows)).join('\n')}
</body>
</html>`;
}

function getOpenAIClient() {
  const apiKey = getEnv('OPENAI_API_KEY');
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function buildAiPrompt(result: Omit<AnalysisResult, 'aiAgent'>): string {
  return `
Si profesionĂˇlny Ĺˇtatistik a metodolĂłg. VrĂˇĹĄ iba validnĂ˝ JSON bez markdownu.

Ăšloha: interpretuj vĂ˝sledky analĂ˝zy dĂˇt po slovensky.

DĂˇta:
- SĂşbor: ${result.preparedDataset.sourceFileName}
- HĂˇrok: ${result.preparedDataset.selectedSheetName}
- Riadky: ${result.preparedDataset.quality.rowCount}
- PremennĂ©: ${result.preparedDataset.quality.variableCount}
- Ĺ kĂˇly: ${result.preparedDataset.quality.scaleCount}
- SubĹˇkĂˇly: ${result.preparedDataset.quality.subscaleCount}

DeskriptĂ­va:
${JSON.stringify(result.descriptives.slice(0, 30), null, 2)}

Reliabilita:
${JSON.stringify(result.reliabilities, null, 2)}

KorelĂˇcie:
${JSON.stringify(result.correlations.slice(0, 30), null, 2)}

Testy:
${JSON.stringify(result.statisticalTests.slice(0, 30), null, 2)}

VrĂˇĹĄ:
{
  "summary": "struÄŤnĂ˝ sĂşhrn",
  "practicalText": "text do praktickej ÄŤasti prĂˇce",
  "interpretation": "odbornĂˇ interpretĂˇcia vĂ˝sledkov",
  "warnings": []
}
`.trim();
}

function parseAiJson(text: string): AnyRecord | null {
  const cleaned = cleanText(text)
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '');

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const candidate = firstBrace !== -1 && lastBrace !== -1 ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;

  try {
    const parsed = JSON.parse(candidate);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function runAiInterpretation(result: Omit<AnalysisResult, 'aiAgent'>): Promise<{
  agent: AnyRecord | null;
  summary?: string;
  practicalText?: string;
  interpretation?: string;
  warnings?: string[];
}> {
  const client = getOpenAIClient();
  const model = getEnv('OPENAI_MODEL') || 'gpt-4o-mini';

  if (!client) {
    return {
      agent: {
        enabled: false,
        ok: false,
        provider: 'openai',
        model,
        error: 'ChĂ˝ba OPENAI_API_KEY.',
      },
    };
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Si Ĺˇtatistik. VĹľdy vraciaĹˇ iba validnĂ˝ JSON bez markdownu.',
        },
        {
          role: 'user',
          content: buildAiPrompt(result),
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || '';
    const parsed = parseAiJson(text);

    return {
      agent: {
        enabled: true,
        ok: Boolean(parsed),
        provider: 'openai',
        model,
        text,
        error: parsed ? null : 'OpenAI nevrĂˇtil validnĂ˝ JSON.',
      },
      summary: typeof parsed?.summary === 'string' ? parsed.summary : undefined,
      practicalText: typeof parsed?.practicalText === 'string' ? parsed.practicalText : undefined,
      interpretation: typeof parsed?.interpretation === 'string' ? parsed.interpretation : undefined,
      warnings: Array.isArray(parsed?.warnings) ? parsed.warnings.map(cleanText).filter(Boolean) : undefined,
    };
  } catch (error) {
    return {
      agent: {
        enabled: true,
        ok: false,
        provider: 'openai',
        model,
        error: error instanceof Error ? error.message : 'OpenAI interpretĂˇcia zlyhala.',
      },
    };
  }
}

function buildFallbackSummary(dataset: PreparedDataset): string {
  return [
    'AnalĂ˝za dĂˇt bola spracovanĂˇ univerzĂˇlnym postupom.',
    `Najprv bol pripravenĂ˝ sĂşbor raw-data.xlsx zo vstupnĂ©ho sĂşboru â€ž${dataset.sourceFileName}â€ś.`,
    `Po prĂ­prave dĂˇt je dostupnĂ˝ch ${dataset.quality.rowCount} riadkov a ${dataset.quality.variableCount} premennĂ˝ch.`,
    `SystĂ©m rozpoznal ${dataset.quality.scaleCount} ĹˇkĂˇl a ${dataset.quality.subscaleCount} subĹˇkĂˇl.`,
    'NĂˇsledne boli vypoÄŤĂ­tanĂ© frekvenÄŤnĂ© tabuÄľky, deskriptĂ­vna Ĺˇtatistika, reliabilita, korelĂˇcie a skupinovĂ© testy podÄľa dostupnĂ˝ch premennĂ˝ch.',
  ].join(' ');
}

function buildFallbackPracticalText(result: Omit<AnalysisResult, 'aiAgent'>): string {
  return `
V prvom kroku bol nahratĂ˝ dĂˇtovĂ˝ sĂşbor prevedenĂ˝ do jednotnĂ©ho formĂˇtu raw-data.xlsx. PoÄŤas prĂ­pravy dĂˇt bol vybranĂ˝ vhodnĂ˝ hĂˇrok, rozpoznanĂˇ hlaviÄŤka tabuÄľky, odstrĂˇnenĂ© prĂˇzdne a duplicitnĂ© riadky a vytvorenĂˇ mapa premennĂ˝ch. TĂˇto mapa urÄŤuje, ktorĂ© premennĂ© sa majĂş spracovaĹĄ ako kategorizovanĂ©, skupinovĂ©, poloĹľkovĂ©, ÄŤĂ­selnĂ©, ĹˇkĂˇlovĂ© alebo subĹˇkĂˇlovĂ©.

Na pripravenĂ˝ch raw dĂˇtach boli vypoÄŤĂ­tanĂ© frekvenÄŤnĂ© tabuÄľky, deskriptĂ­vna Ĺˇtatistika, reliabilita ĹˇkĂˇl pomocou Cronbachovej alfy, korelaÄŤnĂˇ analĂ˝za Pearson/Spearman a skupinovĂ© testy t-test, ANOVA, Mann-Whitney U a Kruskal-Wallis podÄľa typu premennĂ˝ch a poÄŤtu skupĂ­n.

VĂ˝sledky je potrebnĂ© interpretovaĹĄ podÄľa charakteru premennĂ˝ch. Pri kategorizovanĂ˝ch premennĂ˝ch sa uvĂˇdzajĂş poÄŤetnosti a percentĂˇ. Pri ÄŤĂ­selnĂ˝ch, ĹˇkĂˇlovĂ˝ch a subĹˇkĂˇlovĂ˝ch premennĂ˝ch sa uvĂˇdza N, priemer, mediĂˇn, smerodajnĂˇ odchĂ˝lka, minimum a maximum. Reliabilita sa interpretuje ako vnĂştornĂˇ konzistencia ĹˇkĂˇly. KorelĂˇcie sa interpretujĂş podÄľa smeru, sily a Ĺˇtatistickej vĂ˝znamnosti. SkupinovĂ© testy sa interpretujĂş podÄľa p-hodnoty a charakteru porovnĂˇvanĂ˝ch skupĂ­n.
`.trim();
}


function buildScaleScoreRows(dataset: PreparedDataset): AnyRecord[] {
  const definitions = [...dataset.scaleDefinitions, ...dataset.subscaleDefinitions];

  if (!definitions.length) return [];

  return dataset.rows.map((row, index) => {
    const output: AnyRecord = {
      respondentId: row.respondentId ?? index + 1,
    };

    definitions.forEach((definition) => {
      output[definition.label] = row[definition.label] ?? computeScore(row, definition.items, definition.scoring);
    });

    return output;
  });
}

function splitGroupTests(tests: StatisticalTestRow[]): {
  parametric: StatisticalTestRow[];
  nonParametric: StatisticalTestRow[];
} {
  return {
    parametric: tests.filter((row) => row.test === 't-test' || row.test === 'ANOVA'),
    nonParametric: tests.filter((row) => row.test === 'Mann-Whitney U' || row.test === 'Kruskal-Wallis'),
  };
}

function buildAnalysisResult(dataset: PreparedDataset): Omit<AnalysisResult, 'aiAgent'> {
  const descriptives = calculateDescriptives(dataset);
  const frequencies = calculateFrequencies(dataset);
  const reliabilities = calculateReliabilities(dataset);
  const correlations = calculateCorrelations(dataset);
  const statisticalTests = calculateStatisticalTests(dataset);
  const correlationMatrix = buildCorrelationMatrix(correlations, 'Spearman');
  const scaleScores = buildScaleScoreRows(dataset);
  const groupTests = splitGroupTests(statisticalTests);
  const recommendedCharts = buildRecommendedCharts(dataset);
  const recommendedTests = buildRecommendedTests(dataset);
  const warnings = [
    ...dataset.quality.warnings,
    ...(reliabilities.length === 0 ? ['Reliabilita nebola vypoÄŤĂ­tanĂˇ, pretoĹľe neboli dostupnĂ© ĹˇkĂˇly s minimĂˇlne dvomi poloĹľkami.'] : []),
    ...(correlations.length === 0 ? ['KorelaÄŤnĂˇ analĂ˝za sa nevykonala, pretoĹľe nie sĂş dostupnĂ© aspoĹ dve ÄŤĂ­selnĂ© alebo ĹˇkĂˇlovĂ© premennĂ©.'] : []),
    ...(statisticalTests.length === 0 ? ['SkupinovĂ© testy sa nevykonali, pretoĹľe neboli dostupnĂ© vhodnĂ© skupinovĂ© a zĂˇvislĂ© premennĂ©.'] : []),
  ];

  const result: Omit<AnalysisResult, 'aiAgent'> = {
    ok: true,
    success: true,
    title: 'VĂ˝sledky analĂ˝zy dĂˇt',
    summary: buildFallbackSummary(dataset),
    dataDescription: `Bolo pripravenĂ˝ch ${dataset.quality.rowCount} riadkov, ${dataset.quality.variableCount} premennĂ˝ch, ${dataset.quality.scaleCount} ĹˇkĂˇl a ${dataset.quality.subscaleCount} subĹˇkĂˇl.`,
    preparedDataset: dataset,
    rawDataFileName: 'raw-data.xlsx',
    rawDataWorkbookBase64: workbookBase64FromSheets([
      { name: 'raw-data', rows: dataset.rawDataSheet },
      { name: 'variable-map', rows: dataset.variableMapSheet },
      { name: 'data-quality', rows: dataset.dataQualitySheet },
    ]),
    variables: dataset.variables,
    detectedVariables: dataset.variables,
    columns: dataset.variables,
    frequencies,
    frequencyTables: frequencies,
    frequency_tables: frequencies,
    descriptives,
    descriptiveStatistics: descriptives,
    descriptive_statistics: descriptives,
    statistics: descriptives,
    reliabilities,
    reliability: reliabilities,
    cronbachAlpha: reliabilities,
    correlations,
    correlationResults: correlations,
    pearsonCorrelations: correlations.filter((row) => row.test === 'Pearson'),
    spearmanCorrelations: correlations.filter((row) => row.test === 'Spearman'),
    statisticalTests,
    statistical_tests: statisticalTests,
    hypothesisTests: statisticalTests,
    hypothesis_tests: statisticalTests,
    testResults: statisticalTests,
    tTests: statisticalTests.filter((row) => row.test === 't-test'),
    recommendedTests,
    recommendedCharts,
    excelTables: [],
    practicalText: '',
    interpretation: '',
    fullText: '',
    warnings,
    statisticalAnalysis: {
      meta: {
        pipeline: 'universal-raw-data-statistics',
        generatedAt: new Date().toISOString(),
        sourceFileName: dataset.sourceFileName,
        selectedSheetName: dataset.selectedSheetName,
        rowCount: dataset.quality.rowCount,
        respondentCount: dataset.quality.rowCount,
        variableCount: dataset.quality.variableCount,
        scaleCount: dataset.quality.scaleCount,
        subscaleCount: dataset.quality.subscaleCount,
      },
      frequencies,
      itemDescriptives: descriptives.filter((row) => dataset.itemColumns.includes(row.variable)),
      scaleScores,
      scaleDescriptives: descriptives.filter((row) =>
        dataset.scaleDefinitions.some((definition) => definition.label === row.variable) ||
        dataset.subscaleDefinitions.some((definition) => definition.label === row.variable) ||
        dataset.numericColumns.includes(row.variable),
      ),
      reliability: reliabilities,
      correlations: {
        pearson: correlations.filter((row) => row.test === 'Pearson'),
        spearman: correlations.filter((row) => row.test === 'Spearman'),
        matrix: correlationMatrix,
        recommended: correlations.filter((row) => row.test === 'Spearman'),
        recommendationNote: 'Pri ordinálnych alebo Likertových dátach sa prioritne interpretuje Spearmanova korelácia; Pearson je doplnený pre porovnanie.',
      },
      groupTests: {
        parametric: groupTests.parametric,
        nonParametric: groupTests.nonParametric,
        recommended: statisticalTests,
        recommendationNote: 'Parametrické aj neparametrické testy sú vytvorené podľa dostupných skupinových premenných.',
      },
      warnings,
    },
    scaleScores,
    scaleDescriptives: descriptives.filter((row) =>
      dataset.scaleDefinitions.some((definition) => definition.label === row.variable) ||
      dataset.subscaleDefinitions.some((definition) => definition.label === row.variable) ||
      dataset.numericColumns.includes(row.variable),
    ),
    itemDescriptives: descriptives.filter((row) => dataset.itemColumns.includes(row.variable)),
    correlationMatrix,
    normality: [],
    parametricGroupTests: groupTests.parametric,
    nonParametricGroupTests: groupTests.nonParametric,
    recommendedGroupTests: statisticalTests,
    meta: {
      pipeline: 'universal-raw-data-statistics',
      generatedAt: new Date().toISOString(),
      sourceFileName: dataset.sourceFileName,
      selectedSheetName: dataset.selectedSheetName,
      rows: dataset.quality.rowCount,
      rowCount: dataset.quality.rowCount,
      respondentCount: dataset.quality.rowCount,
      columns: dataset.quality.variableCount,
      variableCount: dataset.quality.variableCount,
      scales: dataset.quality.scaleCount,
      scaleCount: dataset.quality.scaleCount,
      subscales: dataset.quality.subscaleCount,
      subscaleCount: dataset.quality.subscaleCount,
    },
  };

  result.practicalText = buildFallbackPracticalText(result);
  result.interpretation = result.practicalText;
  result.fullText = `${result.summary}\n\n${result.practicalText}`;

  result.excelTables = [
    {
      title: 'raw-data',
      rows: dataset.rawDataSheet,
    },
    {
      title: 'variable-map',
      rows: dataset.variableMapSheet,
    },
    {
      title: 'data-quality',
      rows: dataset.dataQualitySheet,
    },
    {
      title: 'descriptives',
      rows: descriptives,
    },
    {
      title: 'frequencies',
      rows: frequencies.flatMap((table) =>
        table.rows.map((row) => ({
          ...row,
          variable: row.variable ?? table.variable,
        })),
      ),
    },
    {
      title: 'reliability',
      rows: reliabilities,
    },
    {
      title: 'correlations',
      rows: correlations,
    },
    {
      title: 'correlation-matrix',
      rows: correlationMatrix,
    },
    {
      title: 'parametric-tests',
      rows: groupTests.parametric,
    },
    {
      title: 'non-parametric-tests',
      rows: groupTests.nonParametric,
    },
    {
      title: 'tests',
      rows: statisticalTests,
    },
  ];

  return result;
}

async function analyzeUploadedFiles(files: File[]): Promise<AnalysisResult> {
  if (!files.length) {
    throw new Error('Nebolo moĹľnĂ© nĂˇjsĹĄ nahratĂ˝ sĂşbor.');
  }

  let selected: WorkbookReadResult | null = null;

  for (const file of files) {
    const workbook = await extractWorkbookResultFromFile(file);
    if (workbook.rows.length > 0) {
      selected = workbook;
      break;
    }
  }

  if (!selected) {
    throw new Error('Nepodarilo sa naÄŤĂ­taĹĄ tabuÄľkovĂ© dĂˇta. Nahrajte Excel (.xlsx/.xls) alebo CSV/TXT sĂşbor.');
  }

  const dataset = prepareDataset(selected);
  const baseResult = buildAnalysisResult(dataset);
  const ai = await runAiInterpretation(baseResult);

  const result: AnalysisResult = {
    ...baseResult,
    aiAgent: ai.agent,
  };

  if (ai.summary) result.summary = ai.summary;
  if (ai.practicalText) result.practicalText = ai.practicalText;
  if (ai.interpretation) result.interpretation = ai.interpretation;
  if (ai.warnings?.length) result.warnings = Array.from(new Set([...result.warnings, ...ai.warnings]));

  result.fullText = `${result.summary}\n\n${result.practicalText}\n\n${result.interpretation}`;

  return result;
}

function getExportFormat(value: unknown): ExportFormat {
  const text = cleanText(value).toLowerCase();
  if (text === 'xls') return 'xls';
  if (text === 'raw') return 'raw';
  if (text === 'word' || text === 'doc') return 'word';
  if (text === 'pdf') return 'pdf';
  return 'excel';
}

async function handleExport(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const result = body.result || body.analysis;
  const format = getExportFormat(body.format || body.type || 'excel');

  if (!result || !isRecord(result)) {
    return NextResponse.json({ ok: false, error: 'ChĂ˝ba objekt result/analysis na export.' }, { status: 400 });
  }

  const analysisResult = result as AnalysisResult;
  const fileBase = cleanText(body.fileName || (format === 'raw' ? 'raw-data' : 'statisticka-analyza')) || 'statisticka-analyza';

  if (format === 'word' || format === 'doc') {
    const html = createHtmlDocument(analysisResult);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'application/msword; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileBase}.doc"`,
      },
    });
  }

  if (format === 'pdf') {
    const html = createHtmlDocument(analysisResult);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileBase}.html"`,
      },
    });
  }

  const buffer = await createXlsxBuffer(
    analysisResult,
    format === 'raw' ? 'raw' : 'full',
  );

  const responseBody = new Uint8Array(buffer.byteLength);
  responseBody.set(buffer);

  const fileName =
    format === 'raw'
      ? 'raw-data.xlsx'
      : `${fileBase || 'statisticka-analyza'}.xlsx`;

  return new NextResponse(responseBody, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Content-Length': String(responseBody.byteLength),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null);

      if (body?.action === 'export' || body?.type || body?.format) {
        return handleExport(new NextRequest(request.url, {
          method: 'POST',
          headers: request.headers,
          body: JSON.stringify(body),
        }));
      }

      return NextResponse.json(
        {
          ok: false,
          error: 'Pre analĂ˝zu poĹˇli multipart/form-data so sĂşborom. Pre export poĹˇli { action: "export", result, format }.',
        },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const files = formData
      .getAll('files')
      .concat(formData.getAll('file'))
      .filter((value): value is File => value instanceof File && value.size > 0);

    const result = await analyzeUploadedFiles(files);

    return NextResponse.json(result);
  } catch (error) {
    console.error('ANALYZE_DATA_ROUTE_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : 'Nepodarilo sa spracovaĹĄ analĂ˝zu dĂˇt.',
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        Allow: 'GET,POST,OPTIONS',
      },
    },
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/analyze-data',
    message: 'Analyze-data backend beĹľĂ­ sprĂˇvne. Endpoint najprv pripravĂ­ raw-data.xlsx a nĂˇsledne poÄŤĂ­ta Ĺˇtatistiky.',
    workflow: [
      'upload Excel/CSV/TXT',
      'detect sheet/header',
      'prepare raw-data.xlsx',
      'create variable-map and data-quality',
      'compute descriptives, frequencies, reliabilities, correlations and tests',
      'export raw/full Excel, Word or HTML print document',
    ],
    export: {
      enabled: true,
      method: 'POST',
      body: { action: 'export', format: 'excel | raw | word | pdf', result: 'AnalysisResult' },
    },
    generatedAt: new Date().toISOString(),
  });
}

