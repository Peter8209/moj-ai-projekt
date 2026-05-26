'use client';

import type { AnalysisResult } from './analysisTypes';

type Props = {
  result?: AnalysisResult | null;
};

type GenericRow = Record<string, unknown>;

type NormalizedSection = {
  key: string;
  title: string;
  description?: string;
  rows: GenericRow[];
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Premenná',
  variable: 'Premenná',
  premenna: 'Premenná',
  column: 'Stĺpec',
  label: 'Názov',

  type: 'Typ',
  dataType: 'Typ dát',
  measurementLevel: 'Úroveň merania',
  scale: 'Škála',

  valid: 'N platných',
  n: 'N',
  count: 'Počet',
  missing: 'Chýbajúce',
  missingCount: 'Chýbajúce',

  mean: 'M',
  M: 'M',
  average: 'Priemer',
  median: 'Medián',
  Md: 'Medián',
  mode: 'Modus',

  stdDeviation: 'SD',
  standardDeviation: 'SD',
  std: 'SD',
  sd: 'SD',
  SD: 'SD',
  variance: 'Rozptyl',

  minimum: 'Min',
  min: 'Min',
  maximum: 'Max',
  max: 'Max',
  range: 'Rozpätie',
  sum: 'Súčet',

  skewness: 'Šikmosť',
  kurtosis: 'Špicatosť',

  value: 'Hodnota',
  frequency: 'Počet',
  percent: 'Percento',
  percentage: 'Percento',
  validPercent: 'Validné percento',
  cumulativePercent: 'Kumulatívne percento',

  test: 'Test',
  statistic: 'Štatistika',
  t: 't',
  r: 'r',
  p: 'p',
  pValue: 'p',
  df: 'df',
  degreesOfFreedom: 'df',
  significance: 'Významnosť',
  result: 'Výsledok',
  conclusion: 'Záver',
  interpretation: 'Interpretácia',

  title: 'Názov',
  chart: 'Graf',
  chartType: 'Typ grafu',
  reason: 'Odôvodnenie',
  recommendation: 'Odporúčanie',
  hypothesis: 'Hypotéza',

  fileName: 'Súbor',
  filename: 'Súbor',
  size: 'Veľkosť',
  status: 'Stav',
};

const PRIORITY_KEYS = [
  'name',
  'variable',
  'premenna',
  'label',
  'type',
  'dataType',
  'measurementLevel',
  'valid',
  'n',
  'count',
  'missing',
  'mean',
  'M',
  'median',
  'Md',
  'stdDeviation',
  'standardDeviation',
  'std',
  'sd',
  'SD',
  'minimum',
  'min',
  'maximum',
  'max',
  'sum',
  'skewness',
  'kurtosis',
  'value',
  'frequency',
  'percent',
  'validPercent',
  'cumulativePercent',
  'test',
  'statistic',
  't',
  'r',
  'df',
  'p',
  'pValue',
  'interpretation',
  'conclusion',
  'reason',
  'recommendation',
];

const HIDDEN_TOP_LEVEL_KEYS = new Set([
  'ok',
  'title',
  'summary',
  'warnings',
  'variables',
  'detectedVariables',
  'columns',
  'frequencies',
  'frequencyTables',
  'frequency_tables',
  'recommendedTests',
  'recommended_tests',
  'tests',
  'recommendedCharts',
  'recommended_charts',
  'charts',
  'excelTables',
  'excel_tables',
  'tables',
  'descriptiveStatistics',
  'descriptive_statistics',
  'statistics',
  'hypothesisTests',
  'hypothesis_tests',
  'testResults',
  'selectedAnalyses',
  'selected_analyses',
  'practicalText',
  'practical_text',
  'fullText',
  'fullResult',
  'text',
  'output',
  'result',
  'interpretation',
  'dataDescription',
  'data_description',
  'files',
  'extractedFiles',
  'attachments',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPrimitive(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';

  if (Number.isInteger(value)) return String(value);

  return value.toLocaleString('sk-SK', {
    maximumFractionDigits: 3,
  });
}

function valueToText(value: unknown): string {
  if (value === null || value === undefined) return '—';

  if (typeof value === 'string') return value.trim() || '—';

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  if (typeof value === 'boolean') return value ? 'Áno' : 'Nie';

  if (Array.isArray(value)) {
    if (value.length === 0) return '—';

    return value
      .map((item) => {
        if (isPrimitive(item)) {
          return valueToText(item);
        }

        if (isObject(item)) {
          return Object.entries(item)
            .map(([key, val]) => `${getFieldLabel(key)}: ${valueToText(val)}`)
            .join(', ');
        }

        return String(item);
      })
      .join('\n');
  }

  if (isObject(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) return '—';

    return entries
      .map(([key, val]) => `${getFieldLabel(key)}: ${valueToText(val)}`)
      .join('\n');
  }

  return String(value);
}

function getFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];

  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase());
}

function normalizeArray(value: unknown): GenericRow[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    if (isObject(item)) return item;

    return {
      poradie: index + 1,
      value: item,
    };
  });
}

function getRawResult(result?: AnalysisResult | null): Record<string, unknown> {
  if (!result) return {};
  return result as unknown as Record<string, unknown>;
}

function getFirstArray(raw: Record<string, unknown>, keys: string[]): GenericRow[] {
  for (const key of keys) {
    const rows = normalizeArray(raw[key]);
    if (rows.length > 0) return rows;
  }

  return [];
}

function getTextValue(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function collectColumns(rows: GenericRow[]): string[] {
  const keys = new Set<string>();

  for (const row of rows) {
    Object.keys(row).forEach((key) => keys.add(key));
  }

  const allKeys = Array.from(keys);

  const priority = PRIORITY_KEYS.filter((key) => allKeys.includes(key));
  const rest = allKeys
    .filter((key) => !priority.includes(key))
    .sort((a, b) => a.localeCompare(b, 'sk'));

  return [...priority, ...rest];
}

function getRowId(row: GenericRow, index: number): string {
  const name =
    row.name ||
    row.variable ||
    row.premenna ||
    row.label ||
    row.title ||
    row.test ||
    row.value;

  return `${String(name || 'row')}-${index}`;
}

function normalizeGenericRows(result?: AnalysisResult | null) {
  const raw = getRawResult(result);

  return Object.entries(raw)
    .filter(([key]) => !HIDDEN_TOP_LEVEL_KEYS.has(key))
    .map(([key, value]) => ({
      key,
      label: getFieldLabel(key),
      value: valueToText(value),
    }))
    .filter((row) => row.value && row.value !== '—');
}

function createSections(result?: AnalysisResult | null): NormalizedSection[] {
  const raw = getRawResult(result);

  const variables = getFirstArray(raw, [
    'variables',
    'detectedVariables',
    'columns',
  ]);

  const descriptiveStatistics = getFirstArray(raw, [
    'descriptiveStatistics',
    'descriptive_statistics',
    'statistics',
  ]);

  const frequencies = getFirstArray(raw, [
    'frequencies',
    'frequencyTables',
    'frequency_tables',
  ]);

  const recommendedCharts = getFirstArray(raw, [
    'recommendedCharts',
    'recommended_charts',
    'charts',
  ]);

  const recommendedTests = getFirstArray(raw, [
    'recommendedTests',
    'recommended_tests',
    'tests',
  ]);

  const hypothesisTests = getFirstArray(raw, [
    'hypothesisTests',
    'hypothesis_tests',
    'testResults',
  ]);

  const excelTables = getFirstArray(raw, [
    'excelTables',
    'excel_tables',
    'tables',
  ]);

  const files = getFirstArray(raw, ['files', 'extractedFiles', 'attachments']);

  const sections: NormalizedSection[] = [];

  if (variables.length > 0) {
    sections.push({
      key: 'variables',
      title: 'Identifikované premenné',
      description:
        'Prehľad premenných rozpoznaných zo súboru alebo z vložených dát.',
      rows: variables,
    });
  }

  if (descriptiveStatistics.length > 0) {
    sections.push({
      key: 'descriptiveStatistics',
      title: 'Deskriptívna štatistika',
      description:
        'Prehľad základných štatistík: N, M, medián, SD, minimum, maximum, šikmosť a špicatosť.',
      rows: descriptiveStatistics,
    });
  }

  if (frequencies.length > 0) {
    sections.push({
      key: 'frequencies',
      title: 'Frekvenčná analýza',
      description:
        'Prehľad hodnôt, početností, percent, validných percent a kumulatívnych percent.',
      rows: frequencies,
    });
  }

  if (recommendedCharts.length > 0) {
    sections.push({
      key: 'recommendedCharts',
      title: 'Odporúčané grafy',
      description:
        'Návrh vhodných grafov pre praktickú časť práce a prezentáciu výsledkov.',
      rows: recommendedCharts,
    });
  }

  if (recommendedTests.length > 0) {
    sections.push({
      key: 'recommendedTests',
      title: 'Odporúčané štatistické testy',
      description:
        'Návrh vhodných štatistických testov podľa typu premenných a cieľa analýzy.',
      rows: recommendedTests,
    });
  }

  if (hypothesisTests.length > 0) {
    sections.push({
      key: 'hypothesisTests',
      title: 'Výsledky štatistických testov',
      description:
        'Výsledky testovania hypotéz, korelácií alebo rozdielov medzi skupinami.',
      rows: hypothesisTests,
    });
  }

  if (excelTables.length > 0) {
    sections.push({
      key: 'excelTables',
      title: 'Tabuľky vhodné do práce',
      description:
        'Odporúčané tabuľky, ktoré je vhodné zaradiť do praktickej alebo analytickej časti.',
      rows: excelTables,
    });
  }

  if (files.length > 0) {
    sections.push({
      key: 'files',
      title: 'Spracované súbory',
      description: 'Prehľad súborov použitých pri analýze dát.',
      rows: files,
    });
  }

  return sections;
}

function renderTextBlock(title: string, value?: string) {
  if (!value?.trim()) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-base font-black text-white">{title}</h3>
      </div>

      <div className="px-5 py-4">
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
          {value}
        </div>
      </div>
    </section>
  );
}

function renderWarnings(warnings: unknown) {
  const rows = normalizeArray(warnings);

  if (!rows.length) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-amber-400/20 bg-amber-500/10">
      <div className="border-b border-amber-400/20 px-5 py-4">
        <h3 className="text-base font-black text-amber-100">Upozornenia</h3>
        <p className="mt-1 text-xs text-amber-100/70">
          Položky, ktoré je potrebné pri interpretácii výsledkov skontrolovať.
        </p>
      </div>

      <div className="px-5 py-4">
        <ul className="space-y-2 text-sm leading-6 text-amber-50/90">
          {rows.map((row, index) => (
            <li key={getRowId(row, index)} className="rounded-2xl bg-black/10 px-4 py-3">
              {valueToText(row.value ?? row.message ?? row.warning ?? row)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SectionTable({ section }: { section: NormalizedSection }) {
  const columns = collectColumns(section.rows);

  if (!section.rows.length || !columns.length) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-base font-black text-white">{section.title}</h3>

        {section.description ? (
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {section.description}
          </p>
        ) : null}
      </div>

      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#0b1020] text-xs uppercase tracking-[0.14em] text-slate-400">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-white/10 px-5 py-3 font-black"
                >
                  {getFieldLabel(column)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {section.rows.map((row, rowIndex) => (
              <tr
                key={getRowId(row, rowIndex)}
                className="border-b border-white/5 transition-colors hover:bg-white/[0.035]"
              >
                {columns.map((column) => (
                  <td
                    key={`${getRowId(row, rowIndex)}-${column}`}
                    className="whitespace-pre-wrap px-5 py-4 align-top leading-6 text-slate-300"
                  >
                    {valueToText(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GenericResultTable({ result }: Props) {
  const rows = normalizeGenericRows(result);

  if (!rows.length) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-base font-black text-white">Ostatné výsledky</h3>
        <p className="mt-1 text-xs text-slate-400">
          Doplnkové údaje, ktoré nepatria do hlavných analytických tabuliek.
        </p>
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-[#0b1020] text-xs uppercase tracking-[0.16em] text-slate-400">
            <tr>
              <th className="w-[260px] border-b border-white/10 px-5 py-3">
                Položka
              </th>
              <th className="border-b border-white/10 px-5 py-3">
                Hodnota
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-white/5">
                <td className="align-top px-5 py-4 font-bold text-slate-200">
                  {row.label}
                </td>
                <td className="whitespace-pre-wrap px-5 py-4 leading-6 text-slate-300">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AnalysisTable({ result }: Props) {
  const raw = getRawResult(result);

  const title =
    typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim()
      : 'Výsledky analýzy dát';

  const summary = getTextValue(raw, ['summary']);
  const dataDescription = getTextValue(raw, [
    'dataDescription',
    'data_description',
  ]);

  const practicalText = getTextValue(raw, [
    'practicalText',
    'practical_text',
  ]);

  const interpretation = getTextValue(raw, [
    'interpretation',
    'fullText',
    'fullResult',
    'output',
    'text',
  ]);

  const sections = createSections(result);

  const hasAnyContent =
    Boolean(summary) ||
    Boolean(dataDescription) ||
    Boolean(practicalText) ||
    Boolean(interpretation) ||
    sections.length > 0 ||
    normalizeGenericRows(result).length > 0;

  if (!hasAnyContent) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-400">
        Nie sú dostupné žiadne tabuľkové výsledky analýzy.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 className="text-base font-black text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Súhrn dát, identifikovaných premenných, deskriptívnej štatistiky,
            frekvenčných tabuliek, odporúčaných grafov a štatistických testov.
          </p>
        </div>

        {summary ? (
          <div className="px-5 py-4">
            <div className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm leading-7 text-slate-300">
              {summary}
            </div>
          </div>
        ) : null}
      </section>

      {renderWarnings(raw.warnings)}

      {renderTextBlock('Popis dát', dataDescription)}

      {sections.map((section) => (
        <SectionTable key={section.key} section={section} />
      ))}

      {renderTextBlock('Interpretácia výsledkov do práce', practicalText)}

      {renderTextBlock('Celková interpretácia', interpretation)}

      <GenericResultTable result={result} />
    </div>
  );
}