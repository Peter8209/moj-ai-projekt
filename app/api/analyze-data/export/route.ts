import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

type ExportFormat = 'word' | 'doc' | 'xlsx' | 'xls' | 'excel' | 'pdf';

type ExportBody = {
  format?: ExportFormat;
  title?: string;
  result?: any;
};

type ExportTable = {
  title: string;
  description?: string;
  rows: Record<string, any>[];
};

type SummaryMetric = {
  label: string;
  value: string | number;
};

const COLUMN_LABELS: Record<string, string> = {
  name: 'Premenná',
  variable: 'Premenná',
  label: 'Názov',
  title: 'Názov',
  type: 'Typ',
  variableType: 'Typ premennej',
  measurementLevel: 'Úroveň merania',

  valid: 'N platných',
  validValues: 'N platných',
  validCount: 'N platných',
  n: 'N',
  count: 'Počet',
  frequency: 'Počet',

  missing: 'Chýbajúce',
  missingValues: 'Chýbajúce',
  missingCount: 'Chýbajúce',

  mean: 'M',
  M: 'M',
  average: 'Priemer',

  median: 'Medián',
  Md: 'Medián',

  stdDeviation: 'SD',
  standardDeviation: 'SD',
  stdDev: 'SD',
  SD: 'SD',
  sd: 'SD',

  min: 'Min',
  minimum: 'Min',
  max: 'Max',
  maximum: 'Max',

  sum: 'Súčet',
  range: 'Rozpätie',
  variance: 'Rozptyl',
  skewness: 'Šikmosť',
  kurtosis: 'Špicatosť',
  distinctValues: 'Počet hodnôt',

  value: 'Hodnota',
  category: 'Kategória',
  percent: 'Percento',
  percentage: 'Percento',
  validPercent: 'Validné percento',
  cumulativePercent: 'Kumulatívne percento',

  test: 'Test',
  hypothesis: 'Hypotéza',
  variables: 'Premenné',
  reason: 'Odôvodnenie',
  assumptions: 'Predpoklady',
  interpretation: 'Interpretácia',
  description: 'Popis',
  conclusion: 'Záver',
  result: 'Výsledok',

  variable1: 'Premenná 1',
  variable2: 'Premenná 2',
  coefficient: 'Koeficient',
  r: 'r',
  rho: 'ρ',
  pValue: 'p',
  p: 'p',
  df: 'df',
  strength: 'Sila vzťahu',
  direction: 'Smer vzťahu',
  significant: 'Signifikantné',

  dependentVariable: 'Závislá premenná',
  independentVariable: 'Nezávislá premenná',
  groupVariable: 'Skupinová premenná',
  group1: 'Skupina 1',
  group2: 'Skupina 2',
  mean1: 'M1',
  mean2: 'M2',
  sd1: 'SD1',
  sd2: 'SD2',
  n1: 'n1',
  n2: 'n2',
  statistic: 'Štatistika',
  t: 't',
  meanDifference: 'Rozdiel priemerov',

  fileName: 'Súbor',
  filename: 'Súbor',
  extension: 'Prípona',
  size: 'Veľkosť',
  method: 'Metóda',
  status: 'Stav',
  warnings: 'Upozornenia',
};

const SECTION_COLORS = [
  '#2563eb',
  '#059669',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
  '#dc2626',
  '#4f46e5',
  '#0f766e',
];

function cleanText(value: unknown): string {
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

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeFileName(value: string): string {
  return (
    cleanText(value || 'vysledky-analyzy-dat')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'vysledky-analyzy-dat'
  );
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getFieldLabel(key: string): string {
  return (
    COLUMN_LABELS[key] ||
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/^\w/, (char) => char.toUpperCase())
  );
}

function normalizeRows(value: unknown): Record<string, any>[] {
  if (!Array.isArray(value)) return [];

  return value.map((row, index) => {
    if (isRecord(row)) return row;

    if (Array.isArray(row)) {
      const output: Record<string, any> = {};

      row.forEach((cell, cellIndex) => {
        output[`col_${cellIndex + 1}`] = cell;
      });

      return output;
    }

    return {
      poradie: index + 1,
      hodnota: row,
    };
  });
}

function getColumns(rows: Record<string, any>[]): string[] {
  const priority = [
    'name',
    'variable',
    'label',
    'title',
    'type',
    'variableType',
    'measurementLevel',
    'valid',
    'validValues',
    'n',
    'missing',
    'missingValues',
    'mean',
    'M',
    'median',
    'Md',
    'stdDeviation',
    'standardDeviation',
    'SD',
    'min',
    'minimum',
    'max',
    'maximum',
    'sum',
    'skewness',
    'kurtosis',
    'value',
    'category',
    'frequency',
    'count',
    'percent',
    'validPercent',
    'cumulativePercent',
    'test',
    'hypothesis',
    'variables',
    'variable1',
    'variable2',
    'coefficient',
    'r',
    'rho',
    'pValue',
    'p',
    'df',
    'strength',
    'direction',
    'dependentVariable',
    'independentVariable',
    'group1',
    'group2',
    'mean1',
    'mean2',
    'sd1',
    'sd2',
    'n1',
    'n2',
    't',
    'reason',
    'description',
    'interpretation',
  ];

  const allColumns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const priorityColumns = priority.filter((column) => allColumns.includes(column));

  const restColumns = allColumns
    .filter((column) => !priorityColumns.includes(column))
    .sort((a, b) => a.localeCompare(b, 'sk'));

  return [...priorityColumns, ...restColumns];
}

function getCellValue(value: unknown): string | number {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Áno' : 'Nie';
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (isRecord(item)) return JSON.stringify(item);
        return String(item ?? '');
      })
      .join(', ');
  }

  if (isRecord(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  const text = String(value);
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.');

  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    const numeric = Number(normalized);

    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return text;
}

function getFrequencyRows(table: any): Record<string, any>[] {
  if (!isRecord(table)) return [];

  return normalizeRows(
    safeArray(table.rows).length > 0
      ? table.rows
      : safeArray(table.data).length > 0
        ? table.data
        : table.items,
  );
}

function makeTable(title: string, rows: unknown, description = ''): ExportTable {
  return {
    title,
    description,
    rows: normalizeRows(rows),
  };
}

function getAllTables(result: any): ExportTable[] {
  const tables: ExportTable[] = [];

  const files = safeArray(result?.files || result?.extractedFiles || result?.attachments);

  if (files.length) {
    tables.push(
      makeTable(
        'Spracované súbory',
        files,
        'Prehľad súborov použitých pri analýze.',
      ),
    );
  }

  const variables = safeArray(
    result?.variables || result?.detectedVariables || result?.columns,
  );

  if (variables.length) {
    tables.push(
      makeTable(
        'Identifikované premenné',
        variables,
        'Prehľad premenných rozpoznaných v dátach.',
      ),
    );
  }

  const descriptive = safeArray(
    result?.descriptiveStatistics ||
      result?.descriptive_statistics ||
      result?.statistics,
  );

  if (descriptive.length) {
    tables.push(
      makeTable(
        'Deskriptívna štatistika',
        descriptive,
        'N, M, medián, SD, minimum, maximum, šikmosť a špicatosť.',
      ),
    );
  }

  const frequencies = safeArray(
    result?.frequencies ||
      result?.frequencyTables ||
      result?.frequency_tables,
  );

  frequencies.forEach((table: any, index) => {
    const rows = getFrequencyRows(table);

    if (!rows.length) return;

    tables.push({
      title:
        cleanText(table?.title) ||
        `Frekvenčná tabuľka – ${table?.variable || table?.name || index + 1}`,
      description:
        cleanText(table?.description || table?.interpretation) ||
        'Frekvenčné rozdelenie hodnôt.',
      rows,
    });
  });

  const pearson = safeArray(result?.pearsonCorrelations || result?.pearson);

  if (pearson.length) {
    tables.push(
      makeTable(
        'Pearsonove korelácie',
        pearson,
        'Lineárne vzťahy medzi numerickými premennými.',
      ),
    );
  }

  const spearman = safeArray(result?.spearmanCorrelations || result?.spearman);

  if (spearman.length) {
    tables.push(
      makeTable(
        'Spearmanove korelácie',
        spearman,
        'Poradové alebo monotónne vzťahy medzi premennými.',
      ),
    );
  }

  const correlations = safeArray(result?.correlations || result?.correlationResults);

  if (correlations.length && !pearson.length && !spearman.length) {
    tables.push(
      makeTable(
        'Korelácie',
        correlations,
        'Korelačné výsledky medzi premennými.',
      ),
    );
  }

  const tTests = safeArray(result?.tTests || result?.t_tests);

  if (tTests.length) {
    tables.push(
      makeTable(
        'T-testy',
        tTests,
        'Porovnanie dvoch skupín pri numerických premenných.',
      ),
    );
  }

  const hypothesisTests = safeArray(
    result?.hypothesisTests ||
      result?.hypothesis_tests ||
      result?.testResults,
  );

  if (hypothesisTests.length) {
    tables.push(
      makeTable(
        'Výsledky testovania hypotéz',
        hypothesisTests,
        'Výsledky štatistického testovania.',
      ),
    );
  }

  const recommendedTests = safeArray(
    result?.recommendedTests ||
      result?.recommended_tests ||
      result?.tests,
  );

  if (recommendedTests.length) {
    tables.push(
      makeTable(
        'Odporúčané štatistické testy',
        recommendedTests,
        'Testy odporúčané podľa typu premenných.',
      ),
    );
  }

  const recommendedCharts = safeArray(
    result?.recommendedCharts ||
      result?.recommended_charts ||
      result?.charts,
  );

  if (recommendedCharts.length) {
    tables.push(
      makeTable(
        'Odporúčané grafy',
        recommendedCharts,
        'Grafy vhodné pre praktickú časť práce.',
      ),
    );
  }

  const excelTables = safeArray(
    result?.excelTables ||
      result?.excel_tables ||
      result?.tables,
  );

  excelTables.forEach((table: any, index) => {
    if (!isRecord(table)) return;

    const rows = normalizeRows(table.rows || table.data);

    if (!rows.length) return;

    tables.push({
      title: cleanText(table.title || table.name || `Tabuľka ${index + 1}`),
      description: cleanText(table.description || ''),
      rows,
    });
  });

  const seen = new Set<string>();

  return tables.filter((table) => {
    if (!table.rows.length) return false;

    const key = `${table.title}-${table.rows.length}`;

    if (seen.has(key)) return false;

    seen.add(key);

    return true;
  });
}

function buildChartDataTables(result: any): ExportTable[] {
  const output: ExportTable[] = [];

  const frequencies = safeArray(
    result?.frequencies ||
      result?.frequencyTables ||
      result?.frequency_tables,
  );

  frequencies.slice(0, 10).forEach((table: any, index) => {
    const rows = getFrequencyRows(table)
      .map((row) => ({
        Kategória: row.value ?? row.category ?? row.name ?? '',
        Počet: row.frequency ?? row.count ?? row.n ?? 0,
        Percento: row.percent ?? row.percentage ?? '',
        ValidnéPercento: row.validPercent ?? '',
        KumulatívnePercento: row.cumulativePercent ?? '',
      }))
      .filter((row) => row.Kategória !== '');

    if (!rows.length) return;

    output.push({
      title: `Grafové dáta – frekvencia ${table?.variable || table?.name || index + 1}`,
      description:
        'Dáta pripravené na vytvorenie stĺpcového alebo koláčového grafu v Exceli.',
      rows,
    });
  });

  const descriptive = safeArray(
    result?.descriptiveStatistics ||
      result?.descriptive_statistics ||
      result?.statistics,
  )
    .map((row: any) => ({
      Premenná: row.variable || row.name || row.label || '',
      M: row.M ?? row.mean ?? '',
      Medián: row.Md ?? row.median ?? '',
      SD: row.SD ?? row.stdDeviation ?? row.standardDeviation ?? '',
      Min: row.min ?? row.minimum ?? '',
      Max: row.max ?? row.maximum ?? '',
      Šikmosť: row.skewness ?? '',
      Špicatosť: row.kurtosis ?? '',
    }))
    .filter((row: any) => row.Premenná);

  if (descriptive.length) {
    output.push({
      title: 'Grafové dáta – deskriptívna štatistika',
      description:
        'Dáta pripravené na vizualizáciu priemerov, mediánov a variability.',
      rows: descriptive,
    });
  }

  const correlations = [
    ...safeArray(result?.pearsonCorrelations || result?.pearson),
    ...safeArray(result?.spearmanCorrelations || result?.spearman),
    ...safeArray(result?.correlations || result?.correlationResults),
  ]
    .map((row: any) => ({
      Test: row.test || '',
      Premenná1: row.variable1 || '',
      Premenná2: row.variable2 || '',
      Koeficient: row.coefficient ?? row.r ?? row.rho ?? '',
      AbsolútnaHodnota: Math.abs(
        Number(row.coefficient ?? row.r ?? row.rho ?? 0),
      ),
      Sila: row.strength || '',
      Smer: row.direction || '',
    }))
    .filter((row: any) => row.Premenná1 && row.Premenná2);

  if (correlations.length) {
    output.push({
      title: 'Grafové dáta – korelácie',
      description:
        'Dáta pripravené na vizualizáciu sily korelačných vzťahov.',
      rows: correlations,
    });
  }

  return output;
}

function getSummaryMetrics(result: any, tables: ExportTable[]): SummaryMetric[] {
  const variables = safeArray(result?.variables || result?.detectedVariables || result?.columns);

  const descriptive = safeArray(
    result?.descriptiveStatistics ||
      result?.descriptive_statistics ||
      result?.statistics,
  );

  const frequencies = safeArray(
    result?.frequencies ||
      result?.frequencyTables ||
      result?.frequency_tables,
  );

  const pearson = safeArray(result?.pearsonCorrelations || result?.pearson);
  const spearman = safeArray(result?.spearmanCorrelations || result?.spearman);
  const tTests = safeArray(result?.tTests || result?.t_tests);

  const recommendedTests = safeArray(
    result?.recommendedTests ||
      result?.recommended_tests ||
      result?.tests,
  );

  const recommendedCharts = safeArray(
    result?.recommendedCharts ||
      result?.recommended_charts ||
      result?.charts,
  );

  return [
    {
      label: 'Premenné',
      value: variables.length,
    },
    {
      label: 'Deskriptívne výpočty',
      value: descriptive.length,
    },
    {
      label: 'Frekvenčné tabuľky',
      value: frequencies.length,
    },
    {
      label: 'Pearsonove korelácie',
      value: pearson.length,
    },
    {
      label: 'Spearmanove korelácie',
      value: spearman.length,
    },
    {
      label: 'T-testy',
      value: tTests.length,
    },
    {
      label: 'Odporúčané testy',
      value: recommendedTests.length,
    },
    {
      label: 'Odporúčané grafy',
      value: recommendedCharts.length,
    },
    {
      label: 'Sekcie v exporte',
      value: tables.length,
    },
  ];
}

function buildSummaryMetricsHtml(metrics: SummaryMetric[]): string {
  if (!metrics.length) return '';

  const cells = metrics
    .map(
      (metric) => `
        <td class="metric-card">
          <div class="metric-label">${htmlEscape(metric.label)}</div>
          <div class="metric-value">${htmlEscape(metric.value)}</div>
        </td>
      `,
    )
    .join('');

  return `
    <table class="metrics-table">
      <tr>${cells}</tr>
    </table>
  `;
}

function buildSectionTable(table: ExportTable, index: number): string {
  const columns = getColumns(table.rows);
  const color = SECTION_COLORS[index % SECTION_COLORS.length];

  const headerHtml = columns
    .map((column) => `<th>${htmlEscape(getFieldLabel(column))}</th>`)
    .join('');

  const bodyHtml = table.rows
    .map((row) => {
      const cells = columns
        .map((column) => `<td>${htmlEscape(getCellValue(row[column]))}</td>`)
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <tr>
      <td colspan="12" class="section-spacer">&nbsp;</td>
    </tr>

    <tr>
      <td colspan="12" class="section-title" style="background:${color};">
        ${htmlEscape(index + 1)}. ${htmlEscape(table.title)}
      </td>
    </tr>

    ${
      table.description
        ? `
          <tr>
            <td colspan="12" class="section-description">
              ${htmlEscape(table.description)}
            </td>
          </tr>
        `
        : ''
    }

    <tr>
      <td colspan="12" class="embedded-table-cell">
        <table class="data-table">
          <thead>
            <tr>${headerHtml}</tr>
          </thead>
          <tbody>
            ${bodyHtml}
          </tbody>
        </table>
      </td>
    </tr>
  `;
}

function createOneSheetExcelHtml(title: string, result: any): string {
  const summary = cleanText(result?.summary || '');

  const interpretation = cleanText(
    result?.interpretation ||
      result?.practicalText ||
      result?.fullText ||
      result?.output ||
      '',
  );

  const warnings = safeArray<string>(result?.warnings);

  const tables = [...getAllTables(result), ...buildChartDataTables(result)];

  const metrics = getSummaryMetrics(result, tables);

  const tablesHtml = tables
    .map((table, index) => buildSectionTable(table, index))
    .join('\n');

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8" />
<style>
  body {
    font-family: Arial, sans-serif;
    color: #111827;
    background: #ffffff;
  }

  .main-sheet {
    width: 100%;
    border-collapse: collapse;
  }

  .title-cell {
    background: #0f172a;
    color: #ffffff;
    font-size: 24px;
    font-weight: 800;
    padding: 18px 20px;
    border: 1px solid #0f172a;
  }

  .subtitle-cell {
    background: #e0f2fe;
    color: #0f172a;
    font-size: 12px;
    padding: 10px 20px;
    border: 1px solid #bae6fd;
  }

  .meta-cell {
    background: #f8fafc;
    color: #475569;
    font-size: 11px;
    padding: 8px 20px;
    border: 1px solid #e2e8f0;
  }

  .block-title {
    background: #1d4ed8;
    color: #ffffff;
    font-weight: 700;
    font-size: 14px;
    padding: 10px 14px;
    border: 1px solid #1d4ed8;
  }

  .block-content {
    background: #ffffff;
    color: #111827;
    font-size: 12px;
    padding: 12px 14px;
    border: 1px solid #dbeafe;
    line-height: 1.5;
  }

  .warning-title {
    background: #d97706;
    color: #ffffff;
    font-weight: 700;
    font-size: 14px;
    padding: 10px 14px;
    border: 1px solid #d97706;
  }

  .warning-content {
    background: #fffbeb;
    color: #78350f;
    font-size: 12px;
    padding: 12px 14px;
    border: 1px solid #fcd34d;
  }

  .metrics-table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
  }

  .metric-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    padding: 10px;
    min-width: 115px;
  }

  .metric-label {
    color: #64748b;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .metric-value {
    color: #0f172a;
    font-size: 20px;
    font-weight: 800;
    margin-top: 4px;
  }

  .section-spacer {
    height: 16px;
    background: #ffffff;
    border: none;
  }

  .section-title {
    color: #ffffff;
    font-size: 15px;
    font-weight: 800;
    padding: 10px 14px;
    border: 1px solid #cbd5e1;
  }

  .section-description {
    background: #f8fafc;
    color: #475569;
    font-size: 11px;
    font-style: italic;
    padding: 8px 14px;
    border: 1px solid #e2e8f0;
  }

  .embedded-table-cell {
    padding: 0;
    border: 1px solid #cbd5e1;
  }

  .data-table {
    border-collapse: collapse;
    width: 100%;
    margin: 0;
  }

  .data-table th {
    background: #111827;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid #cbd5e1;
    padding: 7px 8px;
    text-align: center;
    vertical-align: middle;
  }

  .data-table td {
    color: #111827;
    font-size: 11px;
    border: 1px solid #dbe3ef;
    padding: 6px 8px;
    vertical-align: top;
  }

  .data-table tr:nth-child(even) td {
    background: #f8fafc;
  }

  .data-table tr:nth-child(odd) td {
    background: #ffffff;
  }

  .footer-cell {
    background: #f1f5f9;
    color: #475569;
    font-size: 11px;
    padding: 10px 14px;
    border: 1px solid #cbd5e1;
  }
</style>
</head>

<body>
  <table class="main-sheet">
    <tr>
      <td colspan="12" class="title-cell">${htmlEscape(title)}</td>
    </tr>

    <tr>
      <td colspan="12" class="subtitle-cell">
        Profesionálne usporiadaný export výsledkov analýzy dát v jednom liste.
      </td>
    </tr>

    <tr>
      <td colspan="12" class="meta-cell">
        Vygenerované: ${htmlEscape(new Date().toLocaleString('sk-SK'))}
      </td>
    </tr>

    <tr>
      <td colspan="12" class="block-title">Prehľad výsledkov</td>
    </tr>

    <tr>
      <td colspan="12" class="block-content">
        ${buildSummaryMetricsHtml(metrics)}
      </td>
    </tr>

    ${
      summary
        ? `
          <tr>
            <td colspan="12" class="block-title">Súhrn</td>
          </tr>
          <tr>
            <td colspan="12" class="block-content">
              ${htmlEscape(summary).replace(/\n/g, '<br />')}
            </td>
          </tr>
        `
        : ''
    }

    ${
      warnings.length
        ? `
          <tr>
            <td colspan="12" class="warning-title">Upozornenia</td>
          </tr>
          <tr>
            <td colspan="12" class="warning-content">
              ${warnings.map((warning) => `• ${htmlEscape(warning)}`).join('<br />')}
            </td>
          </tr>
        `
        : ''
    }

    ${
      interpretation
        ? `
          <tr>
            <td colspan="12" class="block-title">Interpretácia / text do praktickej časti</td>
          </tr>
          <tr>
            <td colspan="12" class="block-content">
              ${htmlEscape(interpretation).replace(/\n/g, '<br />')}
            </td>
          </tr>
        `
        : ''
    }

    ${tablesHtml}

    <tr>
      <td colspan="12" class="section-spacer">&nbsp;</td>
    </tr>

    <tr>
      <td colspan="12" class="footer-cell">
        Poznámka: Všetky výsledky sú uložené v jednom liste. Jednotlivé sekcie sú oddelené farebnými nadpismi a tabuľkami.
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function createWordHtml(title: string, result: any): string {
  return createOneSheetExcelHtml(title, result);
}

function createPlainPdfFallback(title: string, result: any): string {
  const tables = getAllTables(result);

  const blocks: string[] = [
    title,
    '',
    'SÚHRN',
    cleanText(result?.summary || ''),
    '',
    'INTERPRETÁCIA',
    cleanText(
      result?.interpretation ||
        result?.practicalText ||
        result?.fullText ||
        result?.output ||
        '',
    ),
  ];

  tables.forEach((table) => {
    blocks.push('', table.title);

    if (table.description) {
      blocks.push(table.description);
    }

    const columns = getColumns(table.rows);

    blocks.push(columns.map((column) => getFieldLabel(column)).join(' | '));

    table.rows.slice(0, 120).forEach((row) => {
      blocks.push(
        columns.map((column) => String(getCellValue(row[column]))).join(' | '),
      );
    });
  });

  return blocks.join('\n');
}

function fileResponse(params: {
  buffer: Buffer | string;
  fileName: string;
  contentType: string;
}) {
  const body =
    typeof params.buffer === 'string'
      ? params.buffer
      : new Uint8Array(params.buffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': params.contentType,
      'Content-Disposition': `attachment; filename="${params.fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ExportBody;

    const result = body.result;

    if (!result || typeof result !== 'object') {
      return NextResponse.json(
        {
          ok: false,
          error: 'MISSING_RESULT',
          message: 'Chýba objekt result s výsledkami analýzy.',
        },
        { status: 400 },
      );
    }

    const requestedFormat = cleanText(body.format || 'xlsx').toLowerCase();

    const format =
      requestedFormat === 'word' || requestedFormat === 'doc'
        ? 'doc'
        : requestedFormat === 'pdf'
          ? 'pdf'
          : 'xls';

    const title = cleanText(
      body.title || result.title || 'Výsledky analýzy dát',
    );

    const baseFileName = sanitizeFileName(title);

    if (format === 'doc') {
      const html = createWordHtml(title, result);

      return fileResponse({
        buffer: html,
        fileName: `${baseFileName}.doc`,
        contentType: 'application/msword; charset=utf-8',
      });
    }

    if (format === 'pdf') {
      const text = createPlainPdfFallback(title, result);

      return fileResponse({
        buffer: text,
        fileName: `${baseFileName}.txt`,
        contentType: 'text/plain; charset=utf-8',
      });
    }

    const html = createOneSheetExcelHtml(title, result);

    return fileResponse({
      buffer: html,
      fileName: `${baseFileName}.xls`,
      contentType: 'application/vnd.ms-excel; charset=utf-8',
    });
  } catch (error) {
    console.error('ANALYZE_DATA_EXPORT_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'EXPORT_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa vytvoriť export analýzy.',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/analyze-data/export',
    methods: ['POST'],
    formats: ['word', 'doc', 'excel', 'xls', 'xlsx', 'pdf'],
    note:
      'Excel export je generovaný ako profesionálne usporiadaný jeden HTML Excel list .xls bez potreby balíka exceljs.',
  });
}