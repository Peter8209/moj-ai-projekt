'use client';

import type { AnalysisResult } from './analysisTypes';

type Props = {
  result?: AnalysisResult | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function valueToText(value: unknown): string {
  if (value === null || value === undefined) return '—';

  if (typeof value === 'string') return value || '—';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
  if (typeof value === 'boolean') return value ? 'Áno' : 'Nie';

  if (Array.isArray(value)) {
    if (value.length === 0) return '—';

    return value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          return String(item);
        }

        if (isObject(item)) {
          return Object.entries(item)
            .map(([key, val]) => `${key}: ${valueToText(val)}`)
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
      .map(([key, val]) => `${key}: ${valueToText(val)}`)
      .join('\n');
  }

  return String(value);
}

function normalizeRows(result?: AnalysisResult | null) {
  if (!result) return [];

  const raw = result as unknown as Record<string, unknown>;

  return Object.entries(raw)
    .filter(([key]) => key !== 'ok')
    .map(([key, value]) => ({
      key,
      label: key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\w/, (char) => char.toUpperCase()),
      value: valueToText(value),
    }));
}

export default function AnalysisTable({ result }: Props) {
  const rows = normalizeRows(result);

  if (!rows.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-400">
        Nie sú dostupné žiadne tabuľkové výsledky analýzy.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-base font-black text-white">Tabuľka výsledkov</h3>
        <p className="mt-1 text-xs text-slate-400">
          Súhrn dát, premenných, odporúčaných testov a interpretácií.
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
    </div>
  );
}