'use client';

import { Table2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AnalysisTable as AnalysisTableType } from './analysisTypes';

type Props = {
  table: AnalysisTableType;
};

type RowValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[]
  | Array<string | number | null>
  | Record<string, unknown>;

type NormalizedColumn = {
  key: string;
  label: string;
  sourceKeys?: string[];
};

type TableRow = Record<string, RowValue>;

const TECHNICAL_COLUMNS = [
  'id',
  'ID',
  'Id',
  'iD',
  'respondent',
  'respondent_id',
  'respondent id',
  'Respondent',
  'Respondent ID',
  'respondentId',
  'respondentID',
  'row_id',
  'rowid',
  'index',
  'Index',
  'poradie',
  'Poradie',
  'cislo',
  'číslo',
  'c',
  'C',
  'timestamp',
  'datum',
  'dátum',
  'cas',
  'čas',
  'created_at',
  'updated_at',
];

function normalizeKey(key: string): string {
  return String(key || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[^\w]/g, '');
}

function normalizeLabel(label: string): string {
  return normalizeKey(label)
    .replace(/^id_/, '')
    .replace(/_id$/, '')
    .replace(/^respondent_/, '')
    .replace(/_respondent$/, '');
}

function isTechnicalColumn(key: string): boolean {
  const normalized = normalizeKey(key);

  return TECHNICAL_COLUMNS.map(normalizeKey).includes(normalized);
}

function isIdLikeColumn(key: string, label?: string): boolean {
  const normalizedKey = normalizeKey(key);
  const normalizedLabel = normalizeKey(label || key);

  const blocked = new Set([
    'id',
    'respondent_id',
    'respondentid',
    'respondent',
    'row_id',
    'rowid',
    'index',
    'poradie',
    'cislo',
    'c',
  ]);

  return blocked.has(normalizedKey) || blocked.has(normalizedLabel);
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';

  if (Number.isInteger(value)) return String(value);

  return value.toLocaleString('sk-SK', {
    maximumFractionDigits: 4,
  });
}

function getColumnLabel(key: string): string {
  const normalized = normalizeKey(key);

  const labels: Record<string, string> = {
    scaleid: 'ID škály',
    scale_id: 'ID škály',
    scalename: 'Škála / subškála',
    scale_name: 'Škála / subškála',

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
    note: 'Poznámka',

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
    frequency: 'Frekvencia',
    freq: 'Frekvencia',
    n: 'N',
    ntotal: 'N spolu',
    n_total: 'N spolu',
    total: 'Spolu',

    valid: 'N platných',
    validn: 'N platných',
    valid_n: 'N platných',
    valid_count: 'N platných',
    validvalues: 'N platných',
    valid_values: 'N platných',
    n_valid: 'N platných',
    platne: 'N platných',
    platne_hodnoty: 'N platných',

    missing: 'N chýbajúcich',
    missingn: 'N chýbajúcich',
    missing_n: 'N chýbajúcich',
    missing_count: 'N chýbajúcich',
    missingvalues: 'N chýbajúcich',
    missing_values: 'N chýbajúcich',
    missingrows: 'Chýbajúce riadky',
    missing_rows: 'Chýbajúce riadky',
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
    md: 'Medián',

    mode: 'Modus',
    modus: 'Modus',

    min: 'Minimum',
    minimum: 'Minimum',
    max: 'Maximum',
    maximum: 'Maximum',
    range: 'Rozpätie',
    variance: 'Rozptyl',

    q1: 'Q1',
    q3: 'Q3',
    iqr: 'IQR',

    std: 'Smerodajná odchýlka',
    sd: 'Smerodajná odchýlka',
    stddeviation: 'Smerodajná odchýlka',
    std_deviation: 'Smerodajná odchýlka',
    standarddeviation: 'Smerodajná odchýlka',
    standard_deviation: 'Smerodajná odchýlka',

    skewness: 'Šikmosť',
    standarderrorskewness: 'SE šikmosti',
    standard_error_skewness: 'SE šikmosti',

    kurtosis: 'Špicatosť',
    standarderrorkurtosis: 'SE špicatosti',
    standard_error_kurtosis: 'SE špicatosti',

    percent: 'Percento',
    percentage: 'Percento',
    validpercent: 'Validné percento',
    valid_percent: 'Validné percento',
    cumulativepercent: 'Kumulatívne percento',
    cumulative_percent: 'Kumulatívne percento',

    value: 'Hodnota',
    category: 'Kategória',
    kategoria: 'Kategória',

    scoring: 'Výpočet',
    items: 'Položky',
    itemsused: 'Použité položky',
    items_used: 'Použité položky',
    scores: 'Skóre',

    group: 'Skupina',
    groups: 'Skupiny',
    group1: 'Skupina 1',
    group2: 'Skupina 2',
    groupvariable: 'Skupinová premenná',
    group_variable: 'Skupinová premenná',

    dependentvariable: 'Závislá premenná',
    dependent_variable: 'Závislá premenná',
    independentvariable: 'Nezávislá premenná',
    independent_variable: 'Nezávislá premenná',

    test: 'Test',
    testtype: 'Typ testu',
    test_type: 'Typ testu',
    statistic: 'Štatistika',
    statistic_value: 'Štatistika',
    p: 'p-hodnota',
    pvalue: 'p-hodnota',
    p_value: 'p-hodnota',
    df: 'Stupne voľnosti',
    effectsize: 'Veľkosť efektu',
    effect_size: 'Veľkosť efektu',
    significance: 'Významnosť',

    correlation: 'Korelácia',
    coefficient: 'Koeficient',
    r: 'r',
    rho: 'ρ',
    r2: 'R²',
    r_squared: 'R²',
    fisherz: 'Fisherovo z',
    fisher_z: 'Fisherovo z',
    standarderror: 'SE',
    standard_error: 'SE',

    variablea: 'Premenná 1',
    variable_a: 'Premenná 1',
    variableb: 'Premenná 2',
    variable_b: 'Premenná 2',
    variable1: 'Premenná 1',
    variable2: 'Premenná 2',

    beta: 'Beta',
    intercept: 'Konštanta',
    slope: 'Smernica',

    alpha: 'Cronbach alfa',
    cronbachalpha: 'Cronbach alfa',
    cronbach_alpha: 'Cronbach alfa',
    validrows: 'N platných riadkov',
    valid_rows: 'N platných riadkov',

    method: 'Metóda',
    isnormal: 'Normalita',
    is_normal: 'Normalita',

    interpretation: 'Interpretácia',
    recommendation: 'Odporúčanie',
    rows: 'Riadky',
  };

  return labels[normalized] || key;
}

function formatCellValue(value: RowValue): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'áno' : 'nie';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '—';

    const formattedItems = value
      .map((item): string | null => {
        if (item === null || item === undefined || item === '') return null;

        if (typeof item === 'number') {
          return formatNumber(item);
        }

        return String(item);
      })
      .filter((item): item is string => Boolean(item));

    return formattedItems.length > 0 ? formattedItems.join(', ') : '—';
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);

    if (entries.length === 0) return '—';

    const formattedEntries = entries
      .filter(([key]) => !isIdLikeColumn(key))
      .map(([key, val]): string | null => {
        if (val === null || val === undefined || val === '') return null;

        return `${getColumnLabel(key)}: ${formatCellValue(val as RowValue)}`;
      })
      .filter((item): item is string => Boolean(item));

    return formattedEntries.length > 0 ? formattedEntries.join('\n') : '—';
  }

  return String(value);
}

function isVariableLikeColumn(key: string): boolean {
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
    'scalename',
    'scale_name',
  ].includes(normalized);
}

function getBestVariableValue(row: TableRow): RowValue {
  const priorityKeys = [
    'scaleName',
    'scale_name',
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

function hasAnyVisibleValue(
  rows: TableRow[],
  column: NormalizedColumn,
): boolean {
  return rows.some((row) => {
    const value = getCellValue(row, column);

    return value !== null && value !== undefined && value !== '';
  });
}

function dedupeColumns(columns: NormalizedColumn[]): NormalizedColumn[] {
  const result: NormalizedColumn[] = [];
  const usedColumnNames = new Set<string>();
  const variableSourceKeys: string[] = [];

  for (const column of columns) {
    const safeKey = String(column.key || '');
    const safeLabel = String(column.label || safeKey);

    if (isTechnicalColumn(safeKey) || isIdLikeColumn(safeKey, safeLabel)) {
      continue;
    }

    if (isVariableLikeColumn(safeKey)) {
      variableSourceKeys.push(safeKey);
      continue;
    }

    const normalizedKey = normalizeKey(safeKey);
    const normalizedLabel = normalizeLabel(safeLabel);
    const uniqueName = `${normalizedKey}__${normalizedLabel}`;

    if (
      usedColumnNames.has(normalizedKey) ||
      usedColumnNames.has(normalizedLabel) ||
      usedColumnNames.has(uniqueName)
    ) {
      continue;
    }

    usedColumnNames.add(normalizedKey);
    usedColumnNames.add(normalizedLabel);
    usedColumnNames.add(uniqueName);

    result.push({
      key: safeKey,
      label: safeLabel,
      sourceKeys: column.sourceKeys,
    });
  }

  if (variableSourceKeys.length > 0) {
    result.unshift({
      key: '__variable__',
      label: 'Premenná / škála',
      sourceKeys: Array.from(new Set(variableSourceKeys)),
    });
  }

  return result;
}

function normalizeTableRows(table: AnalysisTableType): TableRow[] {
  if (!Array.isArray(table.rows)) return [];

  return table.rows.map((row): TableRow => {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      return row as TableRow;
    }

    return {
      value: row as RowValue,
    };
  });
}

function normalizeColumns(
  table: AnalysisTableType,
  rows: TableRow[],
): NormalizedColumn[] {
  let columns: NormalizedColumn[] = [];

  if (Array.isArray(table.columns) && table.columns.length > 0) {
    columns = table.columns.map((column) => ({
      key: String(column.key || ''),
      label: String(column.label || getColumnLabel(String(column.key || ''))),
    }));
  } else {
    const allKeys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

    columns = allKeys.map((key) => ({
      key,
      label: getColumnLabel(key),
    }));
  }

  const priority = [
    '__variable__',
    'scaleName',
    'scale_name',
    'variable',
    'name',
    'label',
    'valid',
    'n',
    'missing',
    'mean',
    'M',
    'median',
    'standardDeviation',
    'SD',
    'minimum',
    'maximum',
    'skewness',
    'kurtosis',
    'pValue',
    'p',
    'r',
    'rho',
    'coefficient',
    'cronbachAlpha',
    'statistic',
    'testType',
    'recommendation',
    'interpretation',
  ];

  const dedupedColumns = dedupeColumns(columns).filter((column) =>
    hasAnyVisibleValue(rows, column),
  );

  return dedupedColumns.sort((a, b) => {
    const aIndex = priority.findIndex(
      (item) => normalizeKey(item) === normalizeKey(a.key),
    );

    const bIndex = priority.findIndex(
      (item) => normalizeKey(item) === normalizeKey(b.key),
    );

    if (aIndex === -1 && bIndex === -1) {
      return a.label.localeCompare(b.label, 'sk');
    }

    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;

    return aIndex - bIndex;
  });
}

function renderCellValue(value: RowValue): ReactNode {
  return formatCellValue(value);
}

export default function AnalysisTable({ table }: Props) {
  const rows = normalizeTableRows(table);
  const columns = normalizeColumns(table, rows);

  return (
    <div
      data-analysis-table="true"
      className="w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-black/20"
    >
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
        <div
          data-analysis-table-wrapper="true"
          className="max-h-[70vh] w-full overflow-auto overscroll-contain"
        >
          <table className="min-w-max border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-950">
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
                      className="max-w-[420px] whitespace-pre-wrap break-words px-4 py-3 align-top text-slate-200"
                    >
                      {renderCellValue(getCellValue(row, column))}
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