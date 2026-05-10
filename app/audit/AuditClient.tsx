'use client';

import { useMemo, useState } from 'react';
import {
  FileCheck2,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  Copy,
  RotateCcw,
  Wand2,
} from 'lucide-react';

type AuditPayload = {
  title: string;
  workType: string;
  language: string;
  citationStyle: string;
  text: string;
};

type AuditApiResponse = {
  ok?: boolean;
  result?: string;
  error?: string;
  message?: string;
};

const WORK_TYPES = [
  'Bakalárska práca',
  'Diplomová práca',
  'Seminárna práca',
  'Esej',
  'Maturitná práca',
  'Disertačná práca',
  'Odborný článok',
];

const LANGUAGES = [
  'Slovenčina',
  'Čeština',
  'Angličtina',
  'Nemčina',
  'Poľština',
  'Maďarčina',
];

const CITATION_STYLES = ['ISO 690', 'APA 7', 'Harvard', 'Chicago', 'MLA'];

const MIN_TEXT_LENGTH = 300;

// ================= CLEAN HELPERS =================

function cleanBrokenEncoding(value: string) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\uFFFD/g, '')

    .replace(/Â+/g, '')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã¤/g, 'ä')
    .replace(/Ãč/g, 'č')
    .replace(/Ä/g, 'č')
    .replace(/Ä/g, 'ď')
    .replace(/Ã©/g, 'é')
    .replace(/Ä›/g, 'ě')
    .replace(/Ã­/g, 'í')
    .replace(/Äľ/g, 'ľ')
    .replace(/Ä¾/g, 'ľ')
    .replace(/Åˆ/g, 'ň')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã´/g, 'ô')
    .replace(/Å•/g, 'ŕ')
    .replace(/Å¡/g, 'š')
    .replace(/Å¥/g, 'ť')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã½/g, 'ý')
    .replace(/Å¾/g, 'ž')

    .replace(/ÄŚ/g, 'Č')
    .replace(/ÄŽ/g, 'Ď')
    .replace(/Ã‰/g, 'É')
    .replace(/Ä˝/g, 'Ľ')
    .replace(/Å‡/g, 'Ň')
    .replace(/Ã“/g, 'Ó')
    .replace(/Å Š/g, 'Š')
    .replace(/Å½/g, 'Ž')

    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€¦/g, '…')

    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")

    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function removeBadAuditStart(value: string) {
  return cleanBrokenEncoding(value)
    .replace(/^Audit\s+kvality\s*[-–—:]?.*$/im, '')
    .replace(/^AI\s+audit\s+kvality\s*[-–—:]?.*$/im, '')
    .replace(/^Ako\s+audit\s+kvality\s*,?\s*/i, '')
    .replace(/^Ako\s+AI\s+audítor\s*,?\s*/i, '')
    .replace(/^Dobrý\s+deň\s*,?\s*/i, '')
    .replace(/^Vážený\s+študent\s*,?\s*/i, '')
    .replace(/^Predmet\s*:.*$/gim, '')
    .replace(/^Email\s*:.*$/gim, '')
    .replace(/^\s*[^\p{L}\p{N}\s"'„“‚‘\-–—()[\]]{1,20}\s*/gmu, '')
    .replace(/^\s*[|/\\_~^`´¨]+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function buildCleanAuditResult({
  title,
  workType,
  language,
  citationStyle,
  rawResult,
}: {
  title: string;
  workType: string;
  language: string;
  citationStyle: string;
  rawResult: string;
}) {
  const cleaned = removeBadAuditStart(rawResult);

  const safeTitle = title.trim() || 'Kontrolovaná akademická práca';

  return `
Audit kvality práce: ${safeTitle}

Typ práce: ${workType}
Jazyk práce: ${language}
Citačný štýl: ${citationStyle}

${cleaned}
`.trim();
}

function buildAuditInstruction(payload: AuditPayload) {
  return `
Vykonaj odborný audit kvality akademickej práce.

DÔLEŽITÉ PRAVIDLÁ:
- Výstup musí začať normálnym nadpisom práce, nie textom "Audit kvality - ..." s poškodenými znakmi.
- Nepíš email.
- Nepíš oslovenie.
- Nepíš predmet emailu.
- Nepíš úvod typu "Ako AI audítor...".
- Nepoužívaj poškodené znaky, cudzie symboly ani nečitateľné znaky.
- Ak vstup obsahuje poškodené znaky, ignoruj ich a pracuj so zrozumiteľným obsahom.
- Výstup píš čistým slovenským textom vhodným do Wordu.
- Nepoužívaj markdown znaky #, ##, **, --- ani kódové bloky.
- Nevymýšľaj zdroje, autorov, DOI ani URL.
- Hodnoť odborne, konkrétne a priamo.

ÚDAJE O PRÁCI:
Názov práce: ${payload.title || 'Neuvedené'}
Typ práce: ${payload.workType}
Jazyk práce: ${payload.language}
Citačný štýl: ${payload.citationStyle}

TEXT NA AUDIT:
"""
${payload.text}
"""

VÝSTUP MUSÍ MAŤ TÚTO ŠTRUKTÚRU:

1. Stručné hodnotenie
Zhodnoť celkovú kvalitu textu, akademickú úroveň a použiteľnosť do práce.

2. Silné stránky
Uveď konkrétne silné stránky textu.

3. Slabé stránky
Uveď konkrétne slabiny textu.

4. Logika a štruktúra
Zhodnoť nadväznosť, členenie, argumentáciu a vnútornú súdržnosť.

5. Metodológia
Zhodnoť, či je metodologická časť dostatočná alebo čo chýba.

6. Citácie a zdroje
Zhodnoť, kde treba doplniť citácie, odborné zdroje alebo presnejšie odkazy.

7. Akademický štýl
Zhodnoť jazyk, odbornosť, štylistiku, terminológiu a zrozumiteľnosť.

8. Konkrétne opravy
Uveď konkrétne návrhy úprav a lepšie formulácie vybraných viet.

9. Odporúčané doplnenia
Napíš, čo má autor doplniť do práce.

10. Skóre kvality od 0 do 100
Uveď:
Logika:
Metodológia:
Citácie:
Akademický štýl:
Celkové skóre:

11. Priorita opráv
Rozdeľ opravy na:
Urgentné:
Dôležité:
Odporúčané:

12. Technické upozornenie
Ak text obsahoval poškodené znaky alebo nečitateľné časti, uveď to tu.
`.trim();
}

export default function AuditClient() {
  const [title, setTitle] = useState('');
  const [workType, setWorkType] = useState('Bakalárska práca');
  const [language, setLanguage] = useState('Slovenčina');
  const [citationStyle, setCitationStyle] = useState('ISO 690');
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cleanedInfo, setCleanedInfo] = useState('');

  const trimmedText = cleanBrokenEncoding(text).trim();

  const characterCount = text.length;

  const wordCount = useMemo(() => {
    return trimmedText ? trimmedText.split(/\s+/).filter(Boolean).length : 0;
  }, [trimmedText]);

  const canRunAudit = trimmedText.length >= MIN_TEXT_LENGTH && !loading;

  const progressPercent = useMemo(() => {
    return Math.min(100, Math.round((trimmedText.length / MIN_TEXT_LENGTH) * 100));
  }, [trimmedText.length]);

  async function parseAuditResponse(res: Response): Promise<AuditApiResponse> {
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return (await res.json()) as AuditApiResponse;
    }

    const rawText = await res.text();

    return {
      ok: res.ok,
      result: res.ok ? rawText : '',
      error: res.ok ? '' : rawText,
    };
  }

  function cleanCurrentText() {
    const cleaned = cleanBrokenEncoding(text);
    const oldLength = text.length;

    setText(cleaned);
    setCleanedInfo(
      oldLength !== cleaned.length
        ? 'Text bol vyčistený od poškodených znakov a neviditeľných symbolov.'
        : 'Text bol skontrolovaný. Nenašli sa výrazné poškodené znaky.'
    );
  }

  async function runAudit() {
    setError('');
    setResult('');
    setCleanedInfo('');

    const cleanedInputText = cleanBrokenEncoding(trimmedText);

    if (cleanedInputText.length < MIN_TEXT_LENGTH) {
      setError(`Vlož aspoň ${MIN_TEXT_LENGTH} znakov textu.`);
      return;
    }

    const payload: AuditPayload = {
      title: cleanBrokenEncoding(title.trim()),
      workType,
      language,
      citationStyle,
      text: cleanedInputText,
    };

    const enhancedPayload = {
      ...payload,
      prompt: buildAuditInstruction(payload),
      instruction: buildAuditInstruction(payload),
      cleanOutput: true,
      removeBrokenEncoding: true,
      outputFormat: 'clean_word_text',
    };

    setLoading(true);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json',
        },
        body: JSON.stringify(enhancedPayload),
      });

      const data = await parseAuditResponse(res);

      if (!res.ok || data.ok === false) {
        throw new Error(
          data.error ||
            data.message ||
            `Audit zlyhal. Server vrátil chybu ${res.status}.`
        );
      }

      const rawAuditResult = data.result?.trim();

      if (!rawAuditResult) {
        throw new Error('API nevrátilo žiadny výsledok auditu.');
      }

      const cleanedResult = buildCleanAuditResult({
        title: payload.title,
        workType: payload.workType,
        language: payload.language,
        citationStyle: payload.citationStyle,
        rawResult: rawAuditResult,
      });

      setResult(cleanedResult);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Nepodarilo sa vykonať audit. Skontroluj API /api/audit.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(removeBadAuditStart(result));
    } catch {
      setError('Výsledok sa nepodarilo skopírovať do schránky.');
    }
  }

  function resetAudit() {
    setTitle('');
    setWorkType('Bakalárska práca');
    setLanguage('Slovenčina');
    setCitationStyle('ISO 690');
    setText('');
    setResult('');
    setError('');
    setLoading(false);
    setCleanedInfo('');
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-500/20 p-3">
                <FileCheck2 className="h-7 w-7 text-emerald-300" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Audit kvality práce
                </h1>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">
                  Odborné hodnotenie akademickej práce, logiky, štruktúry,
                  metodológie, citácií, argumentácie a jazykového štýlu.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={cleanCurrentText}
                disabled={loading || !text.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Wand2 className="h-4 w-4" />
                Vyčistiť znaky
              </button>

              <button
                type="button"
                onClick={resetAudit}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />
                Vyčistiť
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="md:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Názov práce
              </span>

              <input
                value={title}
                onChange={(e) => setTitle(cleanBrokenEncoding(e.target.value))}
                placeholder="Napr. Vplyv umelej inteligencie na vzdelávanie"
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Typ práce
              </span>

              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
              >
                {WORK_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Citačný štýl
              </span>

              <select
                value={citationStyle}
                onChange={(e) => setCitationStyle(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
              >
                {CITATION_STYLES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[18rem_1fr]">
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Jazyk práce
              </span>

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
              >
                {LANGUAGES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>Minimálny rozsah textu</span>
                <span>
                  {trimmedText.length} / {MIN_TEXT_LENGTH} znakov
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Odporúčanie: pre presnejší audit vlož celú kapitolu alebo viac
                odsekov, nie iba krátku vetu.
              </p>
            </div>
          </div>

          {cleanedInfo && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm leading-6 text-emerald-100">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{cleanedInfo}</span>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-emerald-300" />
                <h2 className="font-semibold">Text práce na kontrolu</h2>
              </div>

              <div className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                {wordCount} slov
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => setText(cleanBrokenEncoding(text))}
              placeholder="Sem vlož kapitolu, úvod, záver alebo celú časť práce..."
              className="h-[520px] w-full resize-none rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-400">
                <p>Počet znakov: {characterCount}</p>
                <p>Počet slov: {wordCount}</p>
              </div>

              <button
                type="button"
                onClick={runAudit}
                disabled={!canRunAudit}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
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
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm leading-6 text-red-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <h2 className="font-semibold">Výsledok auditu</h2>
              </div>

              {result && (
                <button
                  type="button"
                  onClick={copyResult}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Kopírovať
                </button>
              )}
            </div>

            {!result && !loading && (
              <div className="flex h-[520px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
                <div>
                  <ShieldCheck className="mx-auto mb-3 h-9 w-9 text-slate-600" />
                  <p>Výsledok auditu sa zobrazí tu.</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Audit vyhodnotí štruktúru, logiku, metodológiu, citácie,
                    štýl a odporúčané úpravy.
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 text-slate-300">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-300" />
                <p className="font-medium">Prebieha odborné hodnotenie textu...</p>
                <p className="mt-2 max-w-sm text-center text-xs text-slate-500">
                  AI analyzuje odbornú úroveň, štruktúru, citácie, argumentáciu
                  a kvalitu akademického štýlu.
                </p>
              </div>
            )}

            {result && (
              <div className="h-[520px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm leading-6 text-slate-100">
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">
                    Audit bol úspešne dokončený.
                  </span>
                </div>

                {result}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}