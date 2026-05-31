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
  auditDate: string;
  currentYear: number;
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
const MAX_TEXT_LENGTH = 25000;
const AUDIT_END_MARKER = 'KONIEC AUDITU';

// ================= DATE HELPERS =================

function getCurrentAuditDateInfo() {
  const now = new Date();

  const auditDate = new Intl.DateTimeFormat('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);

  return {
    auditDate,
    currentYear: now.getFullYear(),
    isoDate: now.toISOString(),
  };
}

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

function removeEndMarker(value: string) {
  return cleanBrokenEncoding(value)
    .replace(new RegExp(`\\s*${AUDIT_END_MARKER}\\s*$`, 'i'), '')
    .trim();
}

function hasAuditEndMarker(value: string) {
  return cleanBrokenEncoding(value).toUpperCase().includes(AUDIT_END_MARKER);
}

function normalizeTextForAudit(value: string) {
  const cleaned = cleanBrokenEncoding(value);

  if (cleaned.length <= MAX_TEXT_LENGTH) {
    return cleaned;
  }

  return cleaned.slice(0, MAX_TEXT_LENGTH).trim();
}

function buildCleanAuditResult({
  title,
  workType,
  language,
  citationStyle,
  rawResult,
  auditDate,
  currentYear,
}: {
  title: string;
  workType: string;
  language: string;
  citationStyle: string;
  rawResult: string;
  auditDate: string;
  currentYear: number;
}) {
  const cleaned = removeEndMarker(removeBadAuditStart(rawResult));

  const safeTitle = title.trim() || 'Kontrolovaná akademická práca';

  return `
Audit kvality práce: ${safeTitle}

Typ práce: ${workType}
Jazyk práce: ${language}
Citačný štýl: ${citationStyle}
Dátum auditu: ${auditDate}
Referenčný aktuálny rok: ${currentYear}

${cleaned}
`.trim();
}

function buildAuditInstruction(payload: AuditPayload) {
  return `
Vykonaj odborný audit kvality akademickej práce.

KRITICKÉ PRAVIDLÁ:
1. Výstup musí byť kompletný a ukončený presnou vetou: ${AUDIT_END_MARKER}
2. Nepíš email, oslovenie, predmet, úvod typu "Ako AI audítor".
3. Nepoužívaj markdown: žiadne #, **, ---, tabuľky ani kódové bloky.
4. Nevymýšľaj konkrétne zdroje, autorov, DOI ani URL.
5. Ak treba citácie, napíš iba typ zdroja, ktorý má autor doplniť, napríklad ISO norma, AOAC metóda, odborný článok alebo metodická príručka.
6. Píš čisto, formálne a odborne po slovensky.
7. Výstup nesmie byť príliš dlhý. Každý bod píš stručne, ale konkrétne.
8. Pri časti "Ukážky upravených viet" uveď maximálne 5 upravených viet, aby sa výstup neodsekol.
9. Pri kontrole rokov a časových údajov používaj výhradne reálny dátum auditu uvedený nižšie.
10. Aktuálny rok je ${payload.currentYear}. Roky menšie alebo rovné ${payload.currentYear} nikdy neoznačuj ako budúcnosť.
11. Rok ${payload.currentYear} je aktuálny rok, nie budúcnosť.
12. Roky 2025 a 2026 neoznačuj automaticky ako budúce roky. Posudzuj ich podľa aktuálneho roka ${payload.currentYear}.
13. Ako budúce označ iba roky väčšie ako ${payload.currentYear}.
14. Ak sa v práci nachádzajú roky 2025 alebo 2026, nepíš, že ide o budúcnosť, ak aktuálny rok je ${payload.currentYear} alebo vyšší.
15. Neupozorňuj na rok ako chybný len preto, že je vyšší než tvoj interný tréningový dátum.

REFERENČNÝ DÁTUM AUDITU:
Dátum auditu: ${payload.auditDate}
Aktuálny rok: ${payload.currentYear}

ÚDAJE O PRÁCI:
Názov práce: ${payload.title || 'Neuvedené'}
Typ práce: ${payload.workType}
Jazyk práce: ${payload.language}
Citačný štýl: ${payload.citationStyle}

TEXT NA AUDIT:
"""
${payload.text}
"""

POVINNÁ ŠTRUKTÚRA VÝSTUPU:

1. Stručné hodnotenie
Uveď celkové hodnotenie kvality textu v 5 až 8 vetách.

2. Silné stránky
Uveď 3 až 6 konkrétnych silných stránok.

3. Slabé stránky
Uveď 3 až 8 konkrétnych slabín.

4. Konkrétne odborné opravy
Uveď odborné chyby alebo nepresnosti. Pri každej napíš:
- čo je problém,
- ako to opraviť,
- prečo je oprava dôležitá.

5. Logika a štruktúra
Zhodnoť nadväznosť, členenie, argumentáciu a vnútornú súdržnosť.

6. Metodológia
Zhodnoť metodickú časť. Uveď, či chýba princíp metódy, postup, prístroje, činidlá, koncentrácie, vzorkovanie alebo výpočty.

7. Citácie a zdroje
Uveď, kde treba doplniť citácie. Nevymýšľaj konkrétne bibliografické záznamy.

8. Akademický štýl
Zhodnoť jazyk, odbornosť, štylistiku, terminológiu a zrozumiteľnosť.

9. Ukážky upravených viet
Uveď maximálne 5 vzorových preformulovaných viet.

10. Odporúčané doplnenia
Uveď, čo má autor doplniť do práce.

11. Skóre kvality od 0 do 100
Uveď presne tieto riadky:
Logika:
Metodológia:
Citácie:
Akademický štýl:
Celkové skóre:

12. Priorita opráv
Rozdeľ opravy na:
Urgentné:
Dôležité:
Odporúčané:

13. Technické upozornenie
Ak text obsahoval poškodené znaky alebo nečitateľné časti, uveď to tu. Ak nie, napíš, že technické problémy neboli zistené.

14. Kontrola časových údajov
Skontroluj roky, dátumy a časové formulácie v texte. Použi dátum auditu ${payload.auditDate} a aktuálny rok ${payload.currentYear}.
Roky menšie alebo rovné ${payload.currentYear} nepovažuj za budúcnosť.
Ako budúcnosť označ iba roky väčšie ako ${payload.currentYear}.
Ak nie sú zistené problémy s časovými údajmi, napíš: Časové údaje sú posúdené podľa aktuálneho dátumu auditu a nebol zistený problém s budúcimi rokmi.

Na úplný koniec napíš presne:
${AUDIT_END_MARKER}
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
  const [warning, setWarning] = useState('');
  const [cleanedInfo, setCleanedInfo] = useState('');

  const auditReferenceDate = useMemo(() => getCurrentAuditDateInfo(), []);

  const trimmedText = cleanBrokenEncoding(text).trim();

  const characterCount = text.length;

  const wordCount = useMemo(() => {
    return trimmedText ? trimmedText.split(/\s+/).filter(Boolean).length : 0;
  }, [trimmedText]);

  const canRunAudit = trimmedText.length >= MIN_TEXT_LENGTH && !loading;

  const progressPercent = useMemo(() => {
    return Math.min(100, Math.round((trimmedText.length / MIN_TEXT_LENGTH) * 100));
  }, [trimmedText.length]);

  const isTextTooLong = trimmedText.length > MAX_TEXT_LENGTH;

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
        : 'Text bol skontrolovaný. Nenašli sa výrazné poškodené znaky.',
    );
  }

  async function runAudit() {
    setError('');
    setWarning('');
    setResult('');
    setCleanedInfo('');

    const cleanedInputText = normalizeTextForAudit(trimmedText);

    if (cleanedInputText.length < MIN_TEXT_LENGTH) {
      setError(`Vlož aspoň ${MIN_TEXT_LENGTH} znakov textu.`);
      return;
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      setWarning(
        `Text je veľmi dlhý. Do auditu sa odoslalo prvých ${MAX_TEXT_LENGTH} znakov, aby sa výstup neodsekol. Pre kompletný audit odporúčam kontrolovať text po kapitolách.`,
      );
    }

    const freshAuditDate = getCurrentAuditDateInfo();

    const payload: AuditPayload = {
      title: cleanBrokenEncoding(title.trim()),
      workType,
      language,
      citationStyle,
      text: cleanedInputText,
      auditDate: freshAuditDate.auditDate,
      currentYear: freshAuditDate.currentYear,
    };

    const instruction = buildAuditInstruction(payload);

    const enhancedPayload = {
      ...payload,
      prompt: instruction,
      instruction,
      cleanOutput: true,
      removeBrokenEncoding: true,
      outputFormat: 'complete_clean_word_text',
      requireEndMarker: AUDIT_END_MARKER,
      maxOutputTokens: 3500,

      // DÔLEŽITÉ PRE API:
      // Server môže tieto hodnoty použiť aj vo vlastnom systémovom prompte.
      auditReferenceDate: freshAuditDate.auditDate,
      auditReferenceIsoDate: freshAuditDate.isoDate,
      auditCurrentYear: freshAuditDate.currentYear,
      temporalValidation: {
        currentYear: freshAuditDate.currentYear,
        auditDate: freshAuditDate.auditDate,
        futureYearRule: `Ako budúcnosť označ iba roky väčšie ako ${freshAuditDate.currentYear}. Roky menšie alebo rovné ${freshAuditDate.currentYear} nie sú budúcnosť.`,
      },
    };

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 120000);

    setLoading(true);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json',
        },
        body: JSON.stringify(enhancedPayload),
        signal: controller.signal,
      });

      const data = await parseAuditResponse(res);

      if (!res.ok || data.ok === false) {
        throw new Error(
          data.error ||
            data.message ||
            `Audit zlyhal. Server vrátil chybu ${res.status}.`,
        );
      }

      const rawAuditResult = data.result?.trim();

      if (!rawAuditResult) {
        throw new Error('API nevrátilo žiadny výsledok auditu.');
      }

      if (!hasAuditEndMarker(rawAuditResult)) {
        setWarning(
          'Audit sa pravdepodobne neukončil úplne. Zvýš maxTokens v /api/audit alebo skontroluj, či server neukončuje odpoveď predčasne.',
        );
      }

      const cleanedResult = buildCleanAuditResult({
        title: payload.title,
        workType: payload.workType,
        language: payload.language,
        citationStyle: payload.citationStyle,
        rawResult: rawAuditResult,
        auditDate: payload.auditDate,
        currentYear: payload.currentYear,
      });

      setResult(cleanedResult);
    } catch (err) {
      const message =
        err instanceof Error && err.name === 'AbortError'
          ? 'Audit trval príliš dlho a bol prerušený. Skús kratší text alebo zvýš timeout v API.'
          : err instanceof Error
            ? err.message
            : 'Nepodarilo sa vykonať audit. Skontroluj API /api/audit.';

      setError(message);
    } finally {
      window.clearTimeout(timeoutId);
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
    setWarning('');
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

                <p className="mt-2 text-xs font-semibold text-emerald-200">
                  Dátum auditu: {auditReferenceDate.auditDate} · Aktuálny rok:{' '}
                  {auditReferenceDate.currentYear}
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
                placeholder="Napr. Stanovenie obsahu bielkovín podľa Kjeldahla"
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
                odsekov. Pri veľmi dlhých dokumentoch kontroluj text po kapitolách,
                aby sa výstup neodsekol.
              </p>
            </div>
          </div>

          {isTextTooLong && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Text má viac ako {MAX_TEXT_LENGTH} znakov. Pri audite sa odošle
                iba prvých {MAX_TEXT_LENGTH} znakov, aby sa výsledok neodsekol.
              </span>
            </div>
          )}

          {cleanedInfo && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm leading-6 text-emerald-100">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{cleanedInfo}</span>
            </div>
          )}

          {warning && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warning}</span>
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

                {warning && (
                  <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{warning}</span>
                  </div>
                )}

                {result}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}