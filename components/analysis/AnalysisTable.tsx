'use client';

import { Table2 } from 'lucide-react';
import type { AnalysisTable as AnalysisTableType } from './analysisTypes';

type Props = {
  table: AnalysisTableType;
};

type RowValue = string | number | boolean | null | undefined;

type NormalizedColumn = {
  key: string;
  label: string;
  sourceKeys?: string[];
};

type TableRow = Record<string, RowValue>;

function normalizeKey(key: string) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

function formatCellValue(value: RowValue) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—';

    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(4).replace(/\.?0+$/, '');
  }

  if (typeof value === 'boolean') {
    return value ? 'áno' : 'nie';
  }

  return String(value);
}

function getColumnLabel(key: string) {
  const normalized = normalizeKey(key);

  const labels: Record<string, string> = {
    variable: 'Premenná',
    premenna: 'Premenná',
    column: 'Premenná',
    stlpec: 'Premenná',
    field: 'Premenná',
    name: 'Premenná',
    nazov: 'Premenná',
    label: 'Premenná',

    title: 'Názov',
    description: 'Popis',

    type: 'Typ premennej',
    variabletype: 'Typ premennej',
    variable_type: 'Typ premennej',
    typ: 'Typ premennej',
    typ_premennej: 'Typ premennej',

    measurementlevel: 'Úroveň merania',
    measurement_level: 'Úroveň merania',
    level: 'Úroveň merania',
    uroven: 'Úroveň merania',
    uroven_merania: 'Úroveň merania',

    count: 'Počet',
    n: 'N',
    total: 'Spolu',
    valid: 'N platných',
    validn: 'N platných',
    valid_n: 'N platných',
    valid_count: 'N platných',
    n_valid: 'N platných',
    platne: 'N platných',
    platne_hodnoty: 'N platných',

    missing: 'N chýbajúcich',
    missingn: 'N chýbajúcich',
    missing_n: 'N chýbajúcich',
    missing_count: 'N chýbajúcich',
    n_missing: 'N chýbajúcich',
    chybajuce: 'N chýbajúcich',
    chybajuce_hodnoty: 'N chýbajúcich',

    mean: 'Priemer',
    avg: 'Priemer',
    average: 'Priemer',
    m: 'Priemer',
    priemer: 'Priemer',

    median: 'Medián',
    median_value: 'Medián',

    mode: 'Modus',
    modus: 'Modus',

    min: 'Minimum',
    minimum: 'Minimum',
    max: 'Maximum',
    maximum: 'Maximum',
    range: 'Rozpätie',
    variance: 'Rozptyl',

    std: 'Smerodajná odchýlka',
    sd: 'Smerodajná odchýlka',
    stddeviation: 'Smerodajná odchýlka',
    std_deviation: 'Smerodajná odchýlka',
    standarddeviation: 'Smerodajná odchýlka',
    standard_deviation: 'Smerodajná odchýlka',

    skewness: 'Šikmosť',
    kurtosis: 'Špicatosť',

    percent: 'Percento',
    percentage: 'Percento',
    validpercent: 'Validné percento',
    valid_percent: 'Validné percento',
    cumulativepercent: 'Kumulatívne percento',
    cumulative_percent: 'Kumulatívne percento',

    frequency: 'Frekvencia',
    freq: 'Frekvencia',
    value: 'Hodnota',
    category: 'Kategória',
    kategoria: 'Kategória',

    group: 'Skupina',
    group1: 'Skupina 1',
    group2: 'Skupina 2',

    test: 'Test',
    statistic: 'Štatistika',
    statistic_value: 'Štatistika',
    p: 'p-hodnota',
    pvalue: 'p-hodnota',
    p_value: 'p-hodnota',
    df: 'Stupne voľnosti',
    effectsize: 'Veľkosť efektu',
    effect_size: 'Veľkosť efektu',

    correlation: 'Korelácia',
    r: 'r',
    r2: 'R²',
    r_squared: 'R²',
    beta: 'Beta',
    intercept: 'Konštanta',
    slope: 'Smernica',

    alpha: 'Cronbach alfa',
    cronbachalpha: 'Cronbach alfa',
    cronbach_alpha: 'Cronbach alfa',

    interpretation: 'Interpretácia',
    recommendation: 'Odporúčanie',
    rows: 'Riadky',
  };

  return labels[normalized] || key;
}

function isVariableLikeColumn(key: string) {
  const normalized = normalizeKey(key);

  return [
    'variable',
    'premenna',
    'column',
    'stlpec',
    'field',
    'name',
    'nazov',
    'label',
  ].includes(normalized);
}

function getBestVariableValue(row: TableRow) {
  const priorityKeys = [
    'variable',
    'premenná',
    'premenna',
    'column',
    'stĺpec',
    'stlpec',
    'field',
    'name',
    'názov',
    'nazov',
    'label',
  ];

  for (const key of priorityKeys) {
    const value = row[key];

    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }

  const dynamicKey = Object.keys(row).find((key) => isVariableLikeColumn(key));

  if (dynamicKey) {
    const value = row[dynamicKey];

    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }

  return undefined;
}

function getCellValue(row: TableRow, column: NormalizedColumn): RowValue {
  if (column.key === '__variable__') {
    return getBestVariableValue(row);
  }

  if (Array.isArray(column.sourceKeys) && column.sourceKeys.length > 0) {
    for (const sourceKey of column.sourceKeys) {
      const value = row[sourceKey];

      if (value !== null && value !== undefined && value !== '') {
        return value;
      }
    }

    return undefined;
  }

  return row[column.key];
}

function hasAnyVisibleValue(rows: TableRow[], column: NormalizedColumn) {
  return rows.some((row) => {
    const value = getCellValue(row, column);

    return value !== null && value !== undefined && value !== '';
  });
}

function dedupeColumns(columns: NormalizedColumn[]) {
  const result: NormalizedColumn[] = [];
  const usedLabels = new Set<string>();
  const variableSourceKeys: string[] = [];

  for (const column of columns) {
    if (isVariableLikeColumn(column.key)) {
      variableSourceKeys.push(column.key);
      continue;
    }

    const normalizedLabel = normalizeKey(column.label);

    if (usedLabels.has(normalizedLabel)) {
      continue;
    }

    usedLabels.add(normalizedLabel);
    result.push(column);
  }

  if (variableSourceKeys.length > 0) {
    result.unshift({
      key: '__variable__',
      label: 'Premenná',
      sourceKeys: variableSourceKeys,
    });
  }

  return result;
}

function normalizeColumns(table: AnalysisTableType, rows: TableRow[]) {
  let columns: NormalizedColumn[] = [];

  if (table.columns && table.columns.length > 0) {
    columns = table.columns.map((column) => ({
      key: column.key,
      label: column.label || getColumnLabel(column.key),
    }));
  } else {
    const firstRow = rows[0];

    if (!firstRow) return [];

    columns = Object.keys(firstRow).map((key) => ({
      key,
      label: getColumnLabel(key),
    }));
  }

  const dedupedColumns = dedupeColumns(columns);

  return dedupedColumns.filter((column) => hasAnyVisibleValue(rows, column));
}

export default function AnalysisTable({ table }: Props) {
  const rows = Array.isArray(table.rows) ? (table.rows as TableRow[]) : [];
  const columns = normalizeColumns(table, rows);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
      <div className="border-b border-white/10 bg-white/[0.045] px-4 py-4">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 text-violet-200" />

          <h4 className="font-black text-white">
            {table.title || 'Tabuľka'}
          </h4>
        </div>

        {table.description ? (
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {table.description}
          </p>
        ) : null}
      </div>

      {columns.length === 0 || rows.length === 0 ? (
        <div className="px-4 py-5 text-sm leading-7 text-slate-400">
          Tabuľka neobsahuje zobraziteľné riadky alebo stĺpce.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.035]">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="whitespace-nowrap px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-300"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-white/5 transition last:border-b-0 hover:bg-white/[0.035]"
                >
                  {columns.map((column) => (
                    <td
                      key={`${rowIndex}-${column.key}`}
                      className="whitespace-nowrap px-4 py-3 text-slate-200"
                    >
                      {formatCellValue(getCellValue(row, column))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}