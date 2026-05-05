'use client';

import { useState } from 'react';
import {
  FileCheck2,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react';

export default function AuditPage() {
  const [title, setTitle] = useState('');
  const [workType, setWorkType] = useState('Bakalárska práca');
  const [language, setLanguage] = useState('Slovenčina');
  const [citationStyle, setCitationStyle] = useState('ISO 690');
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function runAudit() {
    setError('');
    setResult('');

    if (text.trim().length < 300) {
      setError('Vlož aspoň 300 znakov textu.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          workType,
          language,
          citationStyle,
          text,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Audit zlyhal.');
      }

      setResult(data.result);
    } catch (e: any) {
      setError(e.message || 'Nepodarilo sa vykonať audit.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/20 p-3">
              <FileCheck2 className="h-7 w-7 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Audit kvality práce</h1>
              <p className="text-sm text-slate-300">
                Odborné hodnotenie akademickej práce, logiky, štruktúry,
                metodológie, citácií a štýlu.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Názov práce"
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-emerald-400 md:col-span-2"
            />

            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-emerald-400"
            >
              <option>Bakalárska práca</option>
              <option>Diplomová práca</option>
              <option>Seminárna práca</option>
              <option>Esej</option>
              <option>Maturitná práca</option>
              <option>Disertačná práca</option>
              <option>Odborný článok</option>
            </select>

            <select
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-emerald-400"
            >
              <option>ISO 690</option>
              <option>APA 7</option>
              <option>Harvard</option>
              <option>Chicago</option>
              <option>MLA</option>
            </select>
          </div>

          <div className="mt-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-emerald-400 md:w-72"
            >
              <option>Slovenčina</option>
              <option>Čeština</option>
              <option>Angličtina</option>
              <option>Nemčina</option>
              <option>Poľština</option>
              <option>Maďarčina</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-emerald-300" />
              <h2 className="font-semibold">Text práce na kontrolu</h2>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Sem vlož kapitolu, úvod, záver alebo celú časť práce..."
              className="h-[520px] w-full resize-none rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm leading-6 text-slate-100 outline-none focus:border-emerald-400"
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Počet znakov: {text.length}
              </p>

              <button
                onClick={runAudit}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Kontrolujem...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Spustiť audit
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <h2 className="font-semibold">Výsledok auditu</h2>
            </div>

            {!result && !loading && (
              <div className="flex h-[520px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
                Výsledok auditu sa zobrazí tu.
              </div>
            )}

            {loading && (
              <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 text-slate-300">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-300" />
                Prebieha odborné hodnotenie textu...
              </div>
            )}

            {result && (
              <div className="h-[520px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm leading-6 text-slate-100">
                {result}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}