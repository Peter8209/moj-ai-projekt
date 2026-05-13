'use client';

import { Table2 } from 'lucide-react';
import type { AnalysisTable as AnalysisTableType } from './analysisTypes';

type Props = {
  table: AnalysisTableType;
};

type RowValue = string | number | boolean | null | undefined;

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
  const labels: Record<string, string> = {
    variable: 'Premenná',
    name: 'Premenná',
    label: 'Názov',
    type: 'Typ',
    count: 'Počet',
    n: 'N',
    valid: 'Platné hodnoty',
    missing: 'Chýbajúce hodnoty',
    mean: 'Priemer',
    median: 'Medián',
    mode: 'Modus',
    min: 'Minimum',
    max: 'Maximum',
    range: 'Rozpätie',
    variance: 'Rozptyl',
    std: 'Smerodajná odchýlka',
    stdDeviation: 'Smerodajná odchýlka',
    standardDeviation: 'Smerodajná odchýlka',
    percent: 'Percento',
    percentage: 'Percento',
    frequency: 'Frekvencia',
    cumulativePercent: 'Kumulatívne percento',
    value: 'Hodnota',
    category: 'Kategória',
    interpretation: 'Interpretácia',
  };

  return labels[key] || key;
}

function normalizeColumns(table: AnalysisTableType) {
  if (table.columns && table.columns.length > 0) {
    return table.columns.map((column) => ({
      key: column.key,
      label: column.label || getColumnLabel(column.key),
    }));
  }

  const firstRow = table.rows?.[0];

  if (!firstRow) return [];

  return Object.keys(firstRow).map((key) => ({
    key,
    label: getColumnLabel(key),
  }));
}

export default function AnalysisTable({ table }: Props) {
  const columns = normalizeColumns(table);
  const rows = Array.isArray(table.rows) ? table.rows : [];

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
                      {formatCellValue(row[column.key] as RowValue)}
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