'use client';

import { useState } from 'react';
import { ClipboardCheck, Loader2, PenLine, Sparkles } from 'lucide-react';

type Props = {
  initialText?: string;
  workType?: string;
  language?: string;
  citationStyle?: string;
};

export default function ImprovementBox({
  initialText = '',
  workType = 'akademický text',
  language = 'slovenčina',
  citationStyle = 'ISO 690',
}: Props) {
  const [text, setText] = useState(initialText);
  const [mode, setMode] = useState<'full' | 'style' | 'logic' | 'citations'>(
    'full',
  );
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function runImprovement() {
    if (!text.trim()) {
      setError('Najprv vlož text na zlepšenie.');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      const res = await fetch('/api/quality/improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          mode,
          workType,
          language,
          citationStyle,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Návrhy zlepšení sa nepodarilo vytvoriť.');
      }

      setResult(data.result || '');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Nastala neočakávaná chyba.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function copyResult() {
    if (!result.trim()) return;
    navigator.clipboard.writeText(result);
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#070a16]">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          <PenLine className="h-6 w-6" />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white">
            Návrhy zlepšení
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Modul nevypíše iba kritiku. Vytvorí aj prepísané vety, vysvetlí
            problém a pripraví zapracovanú upravenú verziu textu.
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ModeButton
          active={mode === 'full'}
          label="Celkový audit"
          onClick={() => setMode('full')}
        />
        <ModeButton
          active={mode === 'style'}
          label="Štylistika"
          onClick={() => setMode('style')}
        />
        <ModeButton
          active={mode === 'logic'}
          label="Logika"
          onClick={() => setMode('logic')}
        />
        <ModeButton
          active={mode === 'citations'}
          label="Citácie"
          onClick={() => setMode('citations')}
        />
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Vlož text, ku ktorému chceš vytvoriť návrhy zlepšení..."
        className="min-h-[240px] w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-950 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-slate-500"
      />

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={runImprovement}
          disabled={loading}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? 'Spracúvam...' : 'Vytvoriť návrhy zlepšení'}
        </button>

        <button
          type="button"
          onClick={copyResult}
          disabled={!result.trim()}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1]"
        >
          <ClipboardCheck className="h-4 w-4" />
          Kopírovať výsledok
        </button>
      </div>

      {result && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-black/30">
          <h3 className="mb-3 text-lg font-black text-slate-950 dark:text-white">
            Výsledok návrhov zlepšení
          </h3>

          <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-800 dark:text-slate-100">
            {result}
          </pre>
        </div>
      )}
    </section>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-2xl px-4 text-sm font-black transition ${
        active
          ? 'bg-violet-600 text-white'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]'
      }`}
    >
      {label}
    </button>
  );
}