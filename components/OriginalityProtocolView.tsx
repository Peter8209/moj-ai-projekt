'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  FileText,
  Info,
  Loader2,
  Printer,
  RefreshCcw,
  X,
} from 'lucide-react';

type CorpusMatch = {
  name: string;
  percent: number;
  count?: number;
};

type SimilarDocument = {
  id?: string | number;
  order?: number;
  citation: string;
  source?: string;
  plagId?: string;
  workType?: string;
  percent: number;
};

type SimilarityPassage = {
  id?: string | number;
  paragraph?: string;
  reliability?: string;
  percent?: number;
  controlledText: string;
  matchedText?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  sourceDocNumber?: number;
  reason?: string;
};

type DictionaryStats = {
  extractedChars: number;
  totalWords: number;
  dictionaryWords: number;
  dictionaryWordsRatio: number;
  dictionaryLengthSum: number;
  dictionaryLengthRatio: number;
};

type HistogramItem = {
  length: number;
  count: number;
  deviation?: '=' | '>>' | '<<' | string;
};

type ProtocolResult = {
  ok?: boolean;
  protocolTitle?: string;
  protocolText?: string;

  score?: number;
  originality?: number;
  ai_risk?: number;
  aiRisk?: number;
  similarity?: number;
  similarityScore?: number;
  similarityPercent?: number;
  similarityRiskScore?: number;
  plagiarism?: number;
  plagiarismScore?: number;
  plagiarismPercent?: number;
  overlap?: number;
  overlapPercent?: number;
  percent?: number;
  overallPercent?: number;

  title?: string;
  author?: string;
  authorName?: string;
  school?: string;
  faculty?: string;
  studyProgram?: string;
  supervisor?: string;
  workType?: string;
  citationStyle?: string;
  language?: string;
  createdAt?: string;
  generatedAt?: string;

  metadataUrl?: string;
  webProtocolUrl?: string;

  corpuses?: CorpusMatch[];
  dictionaryStats?: DictionaryStats;
  histogram?: HistogramItem[];
  documents?: SimilarDocument[];
  passages?: SimilarityPassage[];
  plaintext?: string;
  extractedText?: string;
  text?: string;

  summary?: string;
  recommendation?: string;

  activeProfile?: any;
  profile?: any;
  result?: any;
};

type RequiredProtocolResult = {
  score: number;
  title: string;
  author: string;
  school: string;
  faculty: string;
  studyProgram: string;
  supervisor: string;
  workType: string;
  citationStyle: string;
  language: string;
  createdAt: string;
  metadataUrl: string;
  webProtocolUrl: string;
  corpuses: CorpusMatch[];
  dictionaryStats: DictionaryStats;
  histogram: HistogramItem[];
  documents: SimilarDocument[];
  passages: SimilarityPassage[];
  plaintext: string;
  summary: string;
  recommendation: string;
};

const ORIGINALITY_PROTOCOL_STORAGE_KEYS = [
  'zedpera_originality_protocol_result',
  'originality_protocol_result',
  'originality_result',
  'latest_originality_result',
  'zedpera_originality_result',
];

const DEFAULT_CORPUSES: CorpusMatch[] = [
  { name: 'Korpus CRZP', percent: 0, count: 0 },
  { name: 'Internet', percent: 0, count: 0 },
  { name: 'Wiki', percent: 0, count: 0 },
  { name: 'Slov-Lex', percent: 0, count: 0 },
];

const DEFAULT_DOCUMENTS: SimilarDocument[] = [];

export default function OriginalityProtocolView({
  result,
}: {
  result?: ProtocolResult | null;
}) {
  const [localResult, setLocalResult] = useState<ProtocolResult | null>(
    result || null,
  );
  const [isLoadingProtocol, setIsLoadingProtocol] = useState(!result);
  const [attempts, setAttempts] = useState(0);

  const loadedResult = result || localResult;

  useEffect(() => {
    if (result) {
      setLocalResult(result);
      setIsLoadingProtocol(false);
      return;
    }

    let cancelled = false;
    let counter = 0;
    let interval: ReturnType<typeof setInterval> | null = null;

    const tryLoadProtocol = () => {
      if (cancelled) return;

      counter += 1;
      setAttempts(counter);

      const found = readProtocolFromBrowserStorage();

      if (found) {
        setLocalResult(found);
        setIsLoadingProtocol(false);

        if (interval) {
          clearInterval(interval);
          interval = null;
        }

        return;
      }

      if (counter >= 80) {
        setIsLoadingProtocol(false);

        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    };

    tryLoadProtocol();

    interval = setInterval(tryLoadProtocol, 250);

    const onStorageOrFocus = () => {
      const found = readProtocolFromBrowserStorage();

      if (found) {
        setLocalResult(found);
        setIsLoadingProtocol(false);

        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    };

    window.addEventListener('storage', onStorageOrFocus);
    window.addEventListener('focus', onStorageOrFocus);

    return () => {
      cancelled = true;

      if (interval) {
        clearInterval(interval);
      }

      window.removeEventListener('storage', onStorageOrFocus);
      window.removeEventListener('focus', onStorageOrFocus);
    };
  }, [result]);

  const normalized = useMemo(() => {
    if (!loadedResult) return null;
    return normalizeResult(loadedResult);
  }, [loadedResult]);

  if (isLoadingProtocol && !normalized) {
    return (
      <ProtocolStatusShell>
        <div className="rounded-[2rem] border border-violet-500/30 bg-violet-500/10 p-8 text-white shadow-2xl">
          <div className="flex items-start gap-4">
            <Loader2 className="mt-1 h-8 w-8 animate-spin text-violet-300" />

            <div>
              <h1 className="text-3xl font-black">Načítavam protokol</h1>

              <p className="mt-4 text-lg leading-8 text-violet-100">
                Kontrola originality ešte dokončuje zápis výsledku. Stránka
                protokolu sa pokúša výsledok automaticky načítať.
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-violet-100">
                Pokus načítania: {attempts}
              </div>
            </div>
          </div>
        </div>
      </ProtocolStatusShell>
    );
  }

  if (!normalized) {
    return (
      <ProtocolStatusShell>
        <div className="rounded-[2rem] border border-red-500/40 bg-red-950/40 p-8 text-white shadow-2xl">
          <div className="flex items-start gap-4">
            <AlertTriangle className="mt-1 h-9 w-9 text-red-200" />

            <div className="w-full">
              <h1 className="text-3xl font-black">Protokol sa nezobrazil</h1>

              <p className="mt-4 text-lg leading-8">
                Protokol sa nenašiel ani po automatickom opakovanom načítaní.
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-base leading-8">
                Riešenie: vráť sa na stránku kontroly originality, klikni znova
                na „Skontrolovať originalitu“ a povoľ nové okná v prehliadači.
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoadingProtocol(true);
                    setAttempts(0);

                    const found = readProtocolFromBrowserStorage();

                    if (found) {
                      setLocalResult(found);
                      setIsLoadingProtocol(false);
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black hover:bg-slate-100"
                >
                  <RefreshCcw className="h-5 w-5" />
                  Skúsiť znova načítať
                </button>

                <button
                  type="button"
                  onClick={() => window.close()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15"
                >
                  <X className="h-5 w-5" />
                  Zavrieť okno
                </button>
              </div>
            </div>
          </div>
        </div>
      </ProtocolStatusShell>
    );
  }

  return (
    <div className="protocol-shell mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-white p-4 text-black shadow-2xl md:p-8">
      <ProtocolStyles />

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <div className="text-lg font-black text-slate-900">
            Náhľad protokolu originality
          </div>

          <div className="text-sm text-slate-500">
            Vizuálny výstup pripravený na tlač alebo export do PDF.
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-700"
        >
          <Printer size={18} />
          Tlačiť / PDF
        </button>
      </div>

      <section className="protocol-page crzp-page">
        <ProtocolHeader result={normalized} />
        <ControlledWork result={normalized} />
        <VisualGraphs result={normalized} />
        <ExtractedTextInfo result={normalized} />
        <DictionaryGraphs result={normalized} />
        <InfluenceTable />
        <WordHistogram result={normalized} />
        <DocumentsSection result={normalized} />
        <SimilarityDetails result={normalized} />
        <PlaintextSection result={normalized} />
        <ProtocolFooter result={normalized} />
      </section>
    </div>
  );
}

function ProtocolStatusShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#050711] px-4 py-10 text-white md:px-10">
      <div className="mx-auto max-w-6xl">{children}</div>
    </main>
  );
}

function readProtocolFromBrowserStorage(): ProtocolResult | null {
  if (typeof window === 'undefined') return null;

  for (const key of ORIGINALITY_PROTOCOL_STORAGE_KEYS) {
    const parsed = readJsonFromStorageKey(key);

    if (isUsableProtocolResult(parsed)) {
      return normalizeStoredProtocolShape(parsed);
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const directData = urlParams.get('data');

  if (directData) {
    try {
      const decoded = decodeURIComponent(directData);
      const parsed = JSON.parse(decoded);

      if (isUsableProtocolResult(parsed)) {
        return normalizeStoredProtocolShape(parsed);
      }
    } catch {
      return null;
    }
  }

  return null;
}

function readJsonFromStorageKey(key: string): any | null {
  try {
    const raw =
      window.localStorage.getItem(key) || window.sessionStorage.getItem(key);

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (typeof parsed === 'string') {
      try {
        return JSON.parse(parsed);
      } catch {
        return {
          plaintext: parsed,
          protocolText: parsed,
          createdAt: new Date().toISOString(),
        };
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

function isUsableProtocolResult(value: any): value is ProtocolResult {
  if (!value || typeof value !== 'object') return false;

  const source =
    value?.result && typeof value.result === 'object' ? value.result : value;

  if (source.ok === false && !source.summary && !source.protocolText) {
    return false;
  }

  return Boolean(
    source.score !== undefined ||
      source.percent !== undefined ||
      source.overallPercent !== undefined ||
      source.similarityRiskScore !== undefined ||
      source.protocolText ||
      source.summary ||
      source.recommendation ||
      source.plaintext ||
      source.extractedText ||
      source.text ||
      Array.isArray(source.documents) ||
      Array.isArray(source.passages) ||
      Array.isArray(source.corpuses),
  );
}

function normalizeStoredProtocolShape(value: any): ProtocolResult {
  const source =
    value?.result && typeof value.result === 'object' ? value.result : value;

  const plaintext =
    source.plaintext ||
    source.extractedText ||
    source.text ||
    source.protocolText ||
    source.summary ||
    '';

  return {
    ...source,
    score:
      source.score ??
      source.similarityRiskScore ??
      source.similarityScore ??
      source.similarityPercent ??
      source.percent ??
      source.overallPercent ??
      source.plagiarismPercent ??
      source.overlapPercent,
    title:
      source.title ||
      source.protocolTitle ||
      source.activeProfile?.title ||
      source.profile?.title ||
      'Kontrola originality',
    author: source.author || source.authorName || '',
    supervisor:
      source.supervisor ||
      source.activeProfile?.supervisor ||
      source.profile?.supervisor ||
      '',
    workType:
      source.workType ||
      source.activeProfile?.type ||
      source.activeProfile?.schema?.label ||
      source.profile?.type ||
      'neurčené',
    citationStyle:
      source.citationStyle ||
      source.activeProfile?.citation ||
      source.profile?.citation ||
      'ISO 690',
    language:
      source.language ||
      source.activeProfile?.workLanguage ||
      source.activeProfile?.language ||
      source.profile?.workLanguage ||
      source.profile?.language ||
      'SK',
    createdAt: source.createdAt || source.generatedAt || new Date().toISOString(),
    plaintext,
    extractedText: source.extractedText || plaintext,
    summary: source.summary || source.protocolText || '',
    recommendation: source.recommendation || '',
    corpuses: Array.isArray(source.corpuses) ? source.corpuses : [],
    documents: Array.isArray(source.documents) ? source.documents : [],
    passages: Array.isArray(source.passages) ? source.passages : [],
    histogram: Array.isArray(source.histogram) ? source.histogram : [],
    dictionaryStats: source.dictionaryStats,
  };
}

function ProtocolHeader({ result }: { result: RequiredProtocolResult }) {
  return (
    <header className="crzp-header">
      <div className="crzp-topline">
        <span>{formatDate(result.createdAt)} (verzia 3.0)</span>
        <span>www.crzp.sk/vysvetlivky30.pdf</span>
      </div>

      <h1>Protokol o kontrole originality</h1>

      <div className="crzp-meta-row">
        <div>metadata</div>
        <div>webprotokol</div>
      </div>
    </header>
  );
}

function ControlledWork({ result }: { result: RequiredProtocolResult }) {
  return (
    <section className="crzp-section">
      <h2 className="crzp-section-title">Kontrolovaná práca</h2>

      <table className="crzp-work-table">
        <thead>
          <tr>
            <th>Citácia</th>
            <th>Percento*</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>
              <div className="crzp-citation-main">
                {result.title} / - školiteľ {result.supervisor || 'Neuvedené'}
              </div>

              <div className="crzp-citation-detail">
                {result.author && <>autor {result.author}, </>}
                {result.faculty || 'Neuvedená fakulta'}.-{' '}
                {result.school || 'Neuvedená škola'}, {getYear(result.createdAt)}
                .- typ práce: {result.workType || 'neurčené'} zdroj:{' '}
                {result.school || 'ZEDPERA'}
              </div>
            </td>

            <td className="crzp-percent-cell">
              <div className="crzp-big-percent">
                {formatPercent(result.score, 2)}
              </div>

              <MiniBlocks value={result.score} />
            </td>
          </tr>
        </tbody>
      </table>

      <p className="crzp-note">
        *Číslo vyjadruje percentuálny podiel textu, ktorý má prekryv s indexom
        prác korpusu CRZP, internetových zdrojov alebo iných porovnávaných
        dokumentov. Intervaly grafického zvýraznenia prekryvu sú nastavené na
        [0-20, 21-40, 41-60, 61-80, 81-100].
      </p>

      <p className="crzp-corpuses-line">
        <strong>Zhoda v korpusoch:</strong>{' '}
        {result.corpuses
          .map(
            (item) =>
              `${item.name}: ${formatPercent(item.percent, 2)}${
                typeof item.count === 'number' ? ` (${item.count})` : ''
              }`,
          )
          .join(', ')}
      </p>
    </section>
  );
}

function VisualGraphs({ result }: { result: RequiredProtocolResult }) {
  return (
    <section className="crzp-section crzp-visual-section">
      <h2 className="crzp-visual-title">
        Grafické vyhodnotenie kontroly originality
      </h2>

      <div className="crzp-visual-grid">
        <SimilarityDonut value={result.score} />
        <CorpusBars corpuses={result.corpuses} />
        <RiskScale value={result.score} />
      </div>
    </section>
  );
}

function SimilarityDonut({ value }: { value: number }) {
  const percent = safePercent(value);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <div className="crzp-graph-card">
      <div className="crzp-graph-card-title">Celkové percento prekryvu</div>

      <div className="crzp-donut-wrap">
        <svg viewBox="0 0 150 150" className="crzp-donut">
          <circle
            cx="75"
            cy="75"
            r={radius}
            className="crzp-donut-bg"
            strokeWidth="18"
            fill="none"
          />

          <circle
            cx="75"
            cy="75"
            r={radius}
            className="crzp-donut-value"
            strokeWidth="18"
            fill="none"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
          />
        </svg>

        <div className="crzp-donut-center">
          <strong>{formatPercent(percent, 2)}</strong>
          <span>podobnosť</span>
        </div>
      </div>
    </div>
  );
}

function CorpusBars({ corpuses }: { corpuses: CorpusMatch[] }) {
  return (
    <div className="crzp-graph-card">
      <div className="crzp-graph-card-title">Zhoda v korpusoch</div>

      <div className="crzp-corpus-bars">
        {corpuses.map((item, index) => {
          const percent = safePercent(item.percent);

          return (
            <div key={`${item.name}-${index}`} className="crzp-corpus-row">
              <div className="crzp-corpus-label">
                <strong>{item.name}</strong>

                <span>
                  {formatPercent(percent, 2)}
                  {typeof item.count === 'number' ? ` (${item.count})` : ''}
                </span>
              </div>

              <div className="crzp-corpus-track">
                <div
                  className="crzp-corpus-fill"
                  style={{
                    width: `${percent}%`,
                    animationDelay: `${index * 120}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RiskScale({ value }: { value: number }) {
  const percent = safePercent(value);

  return (
    <div className="crzp-graph-card">
      <div className="crzp-graph-card-title">Interval grafického zvýraznenia</div>

      <div className="crzp-risk-scale">
        <div className="crzp-risk-segment risk-1">0-20</div>
        <div className="crzp-risk-segment risk-2">21-40</div>
        <div className="crzp-risk-segment risk-3">41-60</div>
        <div className="crzp-risk-segment risk-4">61-80</div>
        <div className="crzp-risk-segment risk-5">81-100</div>

        <div className="crzp-risk-pointer" style={{ left: `${percent}%` }}>
          <span>{formatPercent(percent, 2)}</span>
        </div>
      </div>

      <p className="crzp-risk-caption">
        Čierna línia označuje aktuálne percento prekryvu dokumentu.
      </p>
    </div>
  );
}

function ExtractedTextInfo({ result }: { result: RequiredProtocolResult }) {
  const stats = result.dictionaryStats;

  return (
    <section className="crzp-section">
      <h2 className="crzp-section-title">
        Informácie o extrahovanom texte dodanom na kontrolu
      </h2>

      <div className="crzp-info-grid">
        <div>
          <strong>Dĺžka extrahovaného textu v znakoch:</strong>{' '}
          {formatNumber(stats.extractedChars)}
        </div>

        <div>
          <strong>Celkový počet slov textu:</strong>{' '}
          {formatNumber(stats.totalWords)}
        </div>

        <div>
          <strong>Počet slov v slovníku (SK, CZ, EN, HU, DE):</strong>{' '}
          {formatNumber(stats.dictionaryWords)}
        </div>

        <div>
          <strong>Pomer počtu slovníkových slov:</strong>{' '}
          {formatPercent(stats.dictionaryWordsRatio, 1)}
        </div>

        <div>
          <strong>Súčet dĺžky slov v slovníku (SK, CZ, EN, HU, DE):</strong>{' '}
          {formatNumber(stats.dictionaryLengthSum)}
        </div>

        <div>
          <strong>Pomer dĺžky slovníkových slov:</strong>{' '}
          {formatPercent(stats.dictionaryLengthRatio, 1)}
        </div>
      </div>
    </section>
  );
}

function DictionaryGraphs({ result }: { result: RequiredProtocolResult }) {
  const stats = result.dictionaryStats;

  return (
    <section className="crzp-section crzp-dictionary-visual">
      <h2 className="crzp-visual-title">Graf slovníkového testu</h2>

      <div className="crzp-dictionary-grid">
        <MetricGauge
          label="Pomer počtu slovníkových slov"
          value={stats.dictionaryWordsRatio}
        />

        <MetricGauge
          label="Pomer dĺžky slovníkových slov"
          value={stats.dictionaryLengthRatio}
        />

        <div className="crzp-stat-card">
          <div className="crzp-stat-card-title">Celkový počet slov</div>

          <div className="crzp-stat-card-number">
            {formatNumber(stats.totalWords)}
          </div>

          <div className="crzp-stat-card-text">
            Slovníkové slová: {formatNumber(stats.dictionaryWords)}
          </div>
        </div>

        <div className="crzp-stat-card">
          <div className="crzp-stat-card-title">Dĺžka extrahovaného textu</div>

          <div className="crzp-stat-card-number">
            {formatNumber(stats.extractedChars)}
          </div>

          <div className="crzp-stat-card-text">znakov</div>
        </div>
      </div>
    </section>
  );
}

function MetricGauge({ label, value }: { label: string; value: number }) {
  const percent = safePercent(value);

  return (
    <div className="crzp-stat-card">
      <div className="crzp-stat-card-title">{label}</div>

      <div className="crzp-gauge">
        <div className="crzp-gauge-track">
          <div className="crzp-gauge-fill" style={{ width: `${percent}%` }} />
        </div>

        <div className="crzp-gauge-value">{formatPercent(percent, 1)}</div>
      </div>
    </div>
  );
}

function InfluenceTable() {
  const rows = [
    ['100%-70%', 'žiadny'],
    ['70%-60%', 'malý'],
    ['60%-50%', 'stredný'],
    ['40%-30%', 'veľký'],
    ['30%-0%', 'zásadný'],
  ];

  return (
    <section className="crzp-section">
      <table className="crzp-influence-table">
        <tbody>
          <tr>
            <th>Interval</th>
            {rows.map(([interval]) => (
              <td key={interval}>{interval}</td>
            ))}
          </tr>

          <tr>
            <th>Vplyv na KO*</th>
            {rows.map(([interval, effect], index) => (
              <td key={interval} className={index === 1 ? 'crzp-red-text' : ''}>
                {effect}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <p className="crzp-note">
        *Kontrola originality je výrazne ovplyvnená kvalitou dodaného textu.
        Slovníkový test vyjadruje mieru zhody slov kontrolovanej práce so
        slovníkom referenčných slov podporovaných jazykov. Nízka zhoda môže byť
        spôsobená: nepodporovaný jazyk, chyba prevodu PDF alebo úmyselná
        manipulácia textu. Text práce na vizuálnu kontrolu je na konci
        protokolu.
      </p>
    </section>
  );
}

function WordHistogram({ result }: { result: RequiredProtocolResult }) {
  const histogram = normalizeHistogram(result.histogram);
  const maxCount = Math.max(1, ...histogram.map((item) => Number(item.count)));

  return (
    <section className="crzp-section crzp-histogram-section">
      <h2 className="crzp-section-title">Početnosť slov - histogram</h2>

      <table className="crzp-histogram-table">
        <tbody>
          <tr>
            <th>Dĺžka slova</th>

            {histogram.map((item) => (
              <td key={`length-${item.length}`}>{item.length}</td>
            ))}
          </tr>

          <tr>
            <th>Indik. odchýlka</th>

            {histogram.map((item) => (
              <td
                key={`deviation-${item.length}`}
                className={item.deviation === '>>' ? 'crzp-red-text' : ''}
              >
                {item.deviation || '='}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="crzp-histogram-visual">
        {histogram.map((item, index) => {
          const height = Math.max(10, (Number(item.count) / maxCount) * 180);

          return (
            <div
              key={`histogram-bar-${item.length}`}
              className="crzp-histogram-column"
            >
              <div className="crzp-histogram-count">{item.count}</div>

              <div
                className={
                  item.deviation === '>>'
                    ? 'crzp-histogram-bar is-warning'
                    : item.deviation === '<<'
                      ? 'crzp-histogram-bar is-low'
                      : 'crzp-histogram-bar'
                }
                style={{
                  height: `${height}px`,
                  animationDelay: `${index * 35}ms`,
                }}
              />

              <div className="crzp-histogram-label">{item.length}</div>
            </div>
          );
        })}
      </div>

      <p className="crzp-note">
        *Odchýlky od priemerných hodnôt početnosti slov. Profil početností slov
        je počítaný pre korpus slovenských prác. Značka &quot;&gt;&gt;&quot;
        indikuje výrazne viac slov danej dĺžky ako priemer a značka
        &quot;&lt;&lt;&quot; výrazne menej slov danej dĺžky ako priemer.
        Výrazné odchýlky môžu indikovať manipuláciu textu. Je potrebné
        skontrolovať &quot;plaintext&quot;!
      </p>
    </section>
  );
}

function DocumentsSection({ result }: { result: RequiredProtocolResult }) {
  const documents =
    result.documents.length > 0 ? result.documents : DEFAULT_DOCUMENTS;

  return (
    <section className="crzp-section">
      <h2 className="crzp-section-title">
        Práce s nadprahovou hodnotou podobnosti
      </h2>

      {documents.length === 0 ? (
        <div className="crzp-empty-passages">
          Neboli zistené dokumenty s nadprahovou hodnotou podobnosti.
        </div>
      ) : (
        <>
          <table className="crzp-documents-table">
            <thead>
              <tr>
                <th>Dok.</th>
                <th>Citácia</th>
                <th>Percento*</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((doc, index) => (
                <tr key={`${doc.citation}-${index}`}>
                  <td className="crzp-doc-number">{doc.order || index + 1}</td>

                  <td>
                    <div className="crzp-doc-title">{doc.citation}</div>

                    <div className="crzp-doc-meta">
                      plagID: {doc.plagId || 'ORIENTAČNE'} typ práce:{' '}
                      {doc.workType || 'neurčené'} zdroj:{' '}
                      {doc.source || 'ZEDPERA'}
                    </div>
                  </td>

                  <td className="crzp-doc-percent">
                    <MiniBlocks value={doc.percent} />

                    <div>{formatPercent(doc.percent, 2)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="crzp-note">
            *Číslo vyjadruje percentuálny prekryv testovaného dokumentu len s
            dokumentom uvedeným v príslušnom riadku.
          </p>

          <p className="crzp-note">
            Dokument má prekryv s viacerými dokumentmi. Zoznam dokumentov je
            usporiadaný podľa percenta zostupne. Celkový počet dokumentov je [
            {documents.length}]. V prípade veľkého počtu je často príčinou zhoda
            v texte, ktorý je predpísaný pre daný typ práce.
          </p>
        </>
      )}
    </section>
  );
}

function SimilarityDetails({ result }: { result: RequiredProtocolResult }) {
  return (
    <section className="crzp-section">
      <h2 className="crzp-section-title">Detaily - zistené podobnosti</h2>

      {result.passages.length === 0 ? (
        <div className="crzp-empty-passages">
          Neboli vrátené konkrétne zistené podobnosti.
        </div>
      ) : (
        <div className="crzp-passages">
          {result.passages.map((passage, index) => (
            <article
              key={`${passage.paragraph}-${index}`}
              className="crzp-passage"
            >
              <div className="crzp-passage-head">
                <strong>{index + 1}. odsek:</strong>

                <span>
                  spoľahlivosť [
                  {passage.reliability ||
                    (typeof passage.percent === 'number'
                      ? formatPercent(passage.percent, 0)
                      : 'orientačná')}
                  ]
                </span>
              </div>

              <div className="crzp-passage-body">
                <HighlightedText text={passage.controlledText} />
              </div>

              {passage.matchedText && (
                <div className="crzp-source-box">
                  <strong>Zdrojový / zhodný text:</strong>

                  <HighlightedText text={passage.matchedText} />
                </div>
              )}

              {(passage.sourceTitle || passage.reason) && (
                <div className="crzp-passage-note">
                  {passage.sourceTitle && (
                    <>
                      Zdroj: <strong>{passage.sourceTitle}</strong>
                      <br />
                    </>
                  )}

                  {passage.reason && <>Dôvod: {passage.reason}</>}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PlaintextSection({ result }: { result: RequiredProtocolResult }) {
  if (!result.plaintext) return null;

  return (
    <section className="crzp-section crzp-plaintext-section">
      <h2 className="crzp-section-title">
        <FileText size={20} />
        Plaintext dokumentu na kontrolu
      </h2>

      <p className="crzp-note">
        Skontrolujte extrahovaný text práce na konci protokolu. Plaintext je
        čistý extrahovaný text dokumentu a tvorí základ pre textový analyzátor.
        Tento text môže byť poškodený úmyselne vkladaním znakov, používaním
        neštandardných znakových sád alebo neúmyselne pri konverzii na PDF.
      </p>

      <div className="crzp-plaintext">
        <HighlightedText text={result.plaintext.slice(0, 70000)} />
      </div>
    </section>
  );
}

function ProtocolFooter({ result }: { result: RequiredProtocolResult }) {
  return (
    <footer className="crzp-footer">
      <div>{formatDate(result.createdAt)} (verzia 3.0)</div>
      <div>-</div>
      <div>www.crzp.sk/vysvetlivky30.pdf</div>

      <div className="crzp-footer-links">
        <div>metadata: {result.metadataUrl}</div>
        <div>webprotokol: {result.webProtocolUrl}</div>
      </div>

      <div className="crzp-warning-box no-print">
        <Info size={18} />

        <span>
          Tento protokol je orientačný výstup systému ZEDPERA Originalita.
          Nenahrádza oficiálnu kontrolu originality školy, CRZP, Turnitin ani
          iný autorizovaný antiplagiátorský systém.
        </span>
      </div>
    </footer>
  );
}

function MiniBlocks({ value }: { value: number }) {
  const percent = safePercent(value);
  const filled =
    percent <= 0 ? 0 : Math.max(1, Math.min(5, Math.ceil(percent / 20)));

  return (
    <div className="crzp-mini-blocks">
      {[1, 2, 3, 4, 5].map((item) => (
        <span key={item} className={item <= filled ? 'is-filled' : ''} />
      ))}
    </div>
  );
}

function HighlightedText({ text }: { text: string }) {
  const parts = String(text || '')
    .split(/(\[[^\]]*(?:»|«)[^\]]*\])/g)
    .filter(Boolean);

  return (
    <p className="crzp-highlighted-text">
      {parts.map((part, index) => {
        if (/^\[[^\]]*(?:»|«)[^\]]*\]$/.test(part)) {
          return (
            <span key={`${part}-${index}`} className="crzp-marker">
              {part}
            </span>
          );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </p>
  );
}

/* =====================================================
   NORMALIZÁCIA A VÝPOČET PERCENT
   ===================================================== */

function normalizeResult(result: ProtocolResult): RequiredProtocolResult {
  const plaintext =
    result.plaintext || result.extractedText || result.text || result.protocolText || '';

  const documents = normalizeDocuments(result.documents || []);
  const passages = normalizePassages(result.passages || []);

  const dictionaryStats = normalizeDictionaryStats(
    result.dictionaryStats,
    plaintext,
  );

  const corpusesBeforeScore = normalizeCorpuses(
    result.corpuses || [],
    documents,
    passages,
    plaintext,
  );

  const score = calculateOverallScore({
    result,
    corpuses: corpusesBeforeScore,
    documents,
    passages,
    plaintext,
  });

  const corpuses = applyScoreBackToCorpuses({
    corpuses: corpusesBeforeScore,
    score,
    documents,
    passages,
  });

  return {
    score,
    title: result.title || result.protocolTitle || 'Názov práce nebol uvedený',
    author: result.author || result.authorName || '',
    school: result.school || 'Neuvedená škola',
    faculty: result.faculty || 'Neuvedená fakulta',
    studyProgram: result.studyProgram || '',
    supervisor: result.supervisor || 'Neuvedené',
    workType: result.workType || 'neurčené',
    citationStyle: result.citationStyle || 'ISO 690',
    language: result.language || 'SK',
    createdAt: result.createdAt || result.generatedAt || new Date().toISOString(),
    metadataUrl: result.metadataUrl || 'https://zedpera.com/originalita/metadata',
    webProtocolUrl:
      result.webProtocolUrl || 'https://zedpera.com/originalita/protokol',
    corpuses,
    dictionaryStats,
    histogram: normalizeHistogram(result.histogram || [], plaintext),
    documents,
    passages,
    plaintext,
    summary: result.summary || result.protocolText || '',
    recommendation: result.recommendation || '',
  };
}

function normalizeDocuments(documents: SimilarDocument[]): SimilarDocument[] {
  return documents
    .map((doc, index) => ({
      ...doc,
      order: Number.isFinite(Number(doc.order)) ? Number(doc.order) : index + 1,
      citation: String(doc.citation || `Zdroj ${index + 1}`),
      percent: safePercent(readPercentValue(doc.percent)),
    }))
    .filter((doc) => doc.percent > 0 || doc.citation.trim().length > 0)
    .sort((a, b) => safePercent(b.percent) - safePercent(a.percent));
}

function normalizePassages(passages: SimilarityPassage[]): SimilarityPassage[] {
  return passages
    .map((passage) => ({
      ...passage,
      controlledText: String(passage.controlledText || ''),
      matchedText: passage.matchedText ? String(passage.matchedText) : undefined,
      percent:
        typeof passage.percent === 'number' || typeof passage.percent === 'string'
          ? safePercent(readPercentValue(passage.percent))
          : undefined,
    }))
    .filter((passage) => passage.controlledText.trim().length > 0);
}

function normalizeCorpuses(
  corpuses: CorpusMatch[],
  documents: SimilarDocument[],
  passages: SimilarityPassage[],
  plaintext: string,
): CorpusMatch[] {
  const cleanCorpuses = corpuses
    .map((item) => ({
      name: String(item.name || 'Neurčený korpus'),
      percent: safePercent(readPercentValue(item.percent)),
      count: Number.isFinite(Number(item.count)) ? Number(item.count) : 0,
    }))
    .filter((item) => item.name.trim().length > 0);

  const hasUsefulCorpusPercent = cleanCorpuses.some((item) => item.percent > 0);

  if (cleanCorpuses.length > 0 && hasUsefulCorpusPercent) {
    return ensureDefaultCorpusOrder(cleanCorpuses);
  }

  const fromDocuments = calculateCorpusesFromDocuments(documents);

  if (fromDocuments.some((item) => item.percent > 0)) {
    return ensureDefaultCorpusOrder(fromDocuments);
  }

  const passageScore = calculatePassageCoveragePercent(passages, plaintext);

  if (passageScore > 0) {
    return ensureDefaultCorpusOrder([
      {
        name: 'Textové podobnosti',
        percent: passageScore,
        count: passages.length,
      },
    ]);
  }

  if (cleanCorpuses.length > 0) {
    return ensureDefaultCorpusOrder(cleanCorpuses);
  }

  return DEFAULT_CORPUSES;
}

function calculateCorpusesFromDocuments(
  documents: SimilarDocument[],
): CorpusMatch[] {
  if (documents.length === 0) return [];

  const groups = new Map<string, { total: number; max: number; count: number }>();

  documents.forEach((doc) => {
    const name = normalizeCorpusName(doc.source || doc.citation || 'ZEDPERA');
    const percent = safePercent(doc.percent);

    const existing = groups.get(name) || {
      total: 0,
      max: 0,
      count: 0,
    };

    existing.total += percent;
    existing.max = Math.max(existing.max, percent);
    existing.count += 1;

    groups.set(name, existing);
  });

  return Array.from(groups.entries()).map(([name, value]) => {
    const average = value.count > 0 ? value.total / value.count : 0;

    return {
      name,
      percent: safePercent(Math.max(value.max, average)),
      count: value.count,
    };
  });
}

function normalizeCorpusName(value: string): string {
  const source = String(value || '').toLowerCase();

  if (
    source.includes('crzp') ||
    source.includes('univerz') ||
    source.includes('eu.') ||
    source.includes('spu.') ||
    source.includes('uk.') ||
    source.includes('tu.') ||
    source.includes('vš') ||
    source.includes('vysok') ||
    source.includes('fakulta') ||
    source.includes('škola') ||
    source.includes('skola')
  ) {
    return 'Korpus CRZP';
  }

  if (
    source.includes('internet') ||
    source.includes('http') ||
    source.includes('www') ||
    source.includes('.sk') ||
    source.includes('.cz') ||
    source.includes('.com') ||
    source.includes('.eu') ||
    source.includes('.org') ||
    source.includes('.net')
  ) {
    return 'Internet';
  }

  if (source.includes('wiki')) return 'Wiki';

  if (
    source.includes('slov-lex') ||
    source.includes('zakon') ||
    source.includes('zákon')
  ) {
    return 'Slov-Lex';
  }

  return 'Iné zdroje';
}

function ensureDefaultCorpusOrder(corpuses: CorpusMatch[]): CorpusMatch[] {
  const wantedNames = ['Korpus CRZP', 'Internet', 'Wiki', 'Slov-Lex'];
  const map = new Map<string, CorpusMatch>();

  corpuses.forEach((item) => {
    const existing = map.get(item.name);

    if (!existing) {
      map.set(item.name, {
        name: item.name,
        percent: safePercent(item.percent),
        count: Number.isFinite(Number(item.count)) ? Number(item.count) : 0,
      });

      return;
    }

    map.set(item.name, {
      name: item.name,
      percent: Math.max(existing.percent, safePercent(item.percent)),
      count: Number(existing.count || 0) + Number(item.count || 0),
    });
  });

  wantedNames.forEach((name) => {
    if (!map.has(name)) {
      map.set(name, { name, percent: 0, count: 0 });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const ai = wantedNames.indexOf(a.name);
    const bi = wantedNames.indexOf(b.name);

    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;

    return safePercent(b.percent) - safePercent(a.percent);
  });
}

function applyScoreBackToCorpuses({
  corpuses,
  score,
  documents,
  passages,
}: {
  corpuses: CorpusMatch[];
  score: number;
  documents: SimilarDocument[];
  passages: SimilarityPassage[];
}): CorpusMatch[] {
  const hasPositiveCorpus = corpuses.some((item) => safePercent(item.percent) > 0);

  if (hasPositiveCorpus || score <= 0) {
    return corpuses;
  }

  const sourceName =
    documents.length > 0
      ? normalizeCorpusName(documents[0].source || documents[0].citation)
      : passages.length > 0
        ? 'Textové podobnosti'
        : 'Korpus CRZP';

  const updated = corpuses.map((item) => {
    if (item.name === sourceName) {
      return {
        ...item,
        percent: score,
        count: Math.max(
          Number(item.count || 0),
          documents.length || passages.length || 1,
        ),
      };
    }

    return item;
  });

  const exists = updated.some((item) => item.name === sourceName);

  if (!exists) {
    updated.push({
      name: sourceName,
      percent: score,
      count: documents.length || passages.length || 1,
    });
  }

  return ensureDefaultCorpusOrder(updated);
}

function normalizeDictionaryStats(
  stats: DictionaryStats | undefined,
  plaintext: string,
): DictionaryStats {
  if (stats) {
    const totalWords = Number(stats.totalWords || 0);
    const dictionaryWords = Number(stats.dictionaryWords || 0);
    const dictionaryLengthSum = Number(stats.dictionaryLengthSum || 0);
    const extractedChars = Number(stats.extractedChars || plaintext.length || 0);

    const dictionaryWordsRatio =
      Number.isFinite(Number(stats.dictionaryWordsRatio)) &&
      Number(stats.dictionaryWordsRatio) > 0
        ? safePercent(stats.dictionaryWordsRatio)
        : totalWords > 0
          ? safePercent((dictionaryWords / totalWords) * 100)
          : 0;

    const dictionaryLengthRatio =
      Number.isFinite(Number(stats.dictionaryLengthRatio)) &&
      Number(stats.dictionaryLengthRatio) > 0
        ? safePercent(stats.dictionaryLengthRatio)
        : extractedChars > 0
          ? safePercent((dictionaryLengthSum / extractedChars) * 100)
          : 0;

    return {
      extractedChars,
      totalWords,
      dictionaryWords,
      dictionaryWordsRatio,
      dictionaryLengthSum,
      dictionaryLengthRatio,
    };
  }

  const words = extractWords(plaintext);
  const totalWords = words.length;
  const dictionaryWords = words.filter((word) => word.length >= 2).length;
  const dictionaryLengthSum = words.reduce((sum, word) => sum + word.length, 0);
  const extractedChars = plaintext.length;

  return {
    extractedChars,
    totalWords,
    dictionaryWords,
    dictionaryWordsRatio:
      totalWords > 0 ? safePercent((dictionaryWords / totalWords) * 100) : 0,
    dictionaryLengthSum,
    dictionaryLengthRatio:
      extractedChars > 0
        ? safePercent((dictionaryLengthSum / extractedChars) * 100)
        : 0,
  };
}

function calculateOverallScore({
  result,
  corpuses,
  documents,
  passages,
  plaintext,
}: {
  result: ProtocolResult;
  corpuses: CorpusMatch[];
  documents: SimilarDocument[];
  passages: SimilarityPassage[];
  plaintext: string;
}): number {
  const directSimilarity = firstPositivePercent([
    result.score,
    result.similarity,
    result.similarityScore,
    result.similarityPercent,
    result.similarityRiskScore,
    result.plagiarism,
    result.plagiarismScore,
    result.plagiarismPercent,
    result.overlap,
    result.overlapPercent,
    result.percent,
    result.overallPercent,
    result.ai_risk,
    result.aiRisk,
  ]);

  if (directSimilarity > 0) {
    return directSimilarity;
  }

  const originalityValue = readPercentValue(result.originality);

  if (originalityValue > 0 && originalityValue <= 100) {
    return safePercent(100 - originalityValue);
  }

  const corpusPercents = corpuses
    .map((item) => safePercent(item.percent))
    .filter((value) => value > 0);

  if (corpusPercents.length > 0) {
    return safePercent(Math.max(...corpusPercents));
  }

  const documentPercents = documents
    .map((item) => safePercent(item.percent))
    .filter((value) => value > 0);

  if (documentPercents.length > 0) {
    const maxDocument = Math.max(...documentPercents);
    const averageTopDocuments = averagePercent(documentPercents.slice(0, 5));

    return safePercent(Math.max(maxDocument, averageTopDocuments));
  }

  const passagePercents = passages
    .map((item) => item.percent)
    .filter((value): value is number => typeof value === 'number')
    .map((value) => safePercent(value))
    .filter((value) => value > 0);

  if (passagePercents.length > 0) {
    return safePercent(averagePercent(passagePercents));
  }

  const passageCoverage = calculatePassageCoveragePercent(passages, plaintext);

  if (passageCoverage > 0) {
    return passageCoverage;
  }

  const percentFromText = extractPercentFromText(
    [
      result.protocolText,
      result.summary,
      result.recommendation,
      result.protocolTitle,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  if (percentFromText > 0) {
    return percentFromText;
  }

  return 0;
}

function calculatePassageCoveragePercent(
  passages: SimilarityPassage[],
  plaintext: string,
): number {
  const totalText = String(plaintext || '').trim();

  if (!totalText || passages.length === 0) {
    return 0;
  }

  const totalLength = Math.max(1, totalText.length);

  const matchedLength = passages.reduce((sum, passage) => {
    const controlled = String(passage.controlledText || '').trim();
    const matched = String(passage.matchedText || '').trim();

    const controlledLength = controlled.length;
    const matchedLength = matched.length;

    return sum + Math.max(controlledLength, matchedLength);
  }, 0);

  return safePercent((matchedLength / totalLength) * 100);
}

function firstPositivePercent(values: unknown[]): number {
  for (const value of values) {
    const percent = readPercentValue(value);

    if (percent > 0) {
      return safePercent(percent);
    }
  }

  return 0;
}

function readPercentValue(value: unknown): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return safePercent(value);
  }

  if (typeof value === 'string') {
    const cleaned = value
      .replace(/\s+/g, '')
      .replace('%', '')
      .replace(',', '.');

    const number = Number(cleaned);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return safePercent(number);
  }

  return 0;
}

function extractPercentFromText(text: string): number {
  const source = String(text || '');

  if (!source.trim()) {
    return 0;
  }

  const matches = source.match(/(\d{1,3}(?:[,.]\d{1,2})?)\s*%/g);

  if (!matches || matches.length === 0) {
    return 0;
  }

  const values = matches
    .map((match) => readPercentValue(match))
    .filter((value) => value > 0 && value <= 100);

  if (values.length === 0) {
    return 0;
  }

  return safePercent(Math.max(...values));
}

function averagePercent(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, item) => sum + safePercent(item), 0);

  return safePercent(total / values.length);
}

function extractWords(text: string): string[] {
  return String(text || '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function normalizeHistogram(
  value: HistogramItem[],
  plaintext = '',
): HistogramItem[] {
  const map = new Map<number, HistogramItem>();

  value.forEach((item) => {
    const length = Number(item.length);

    if (Number.isFinite(length)) {
      map.set(length, {
        length,
        count: Number(item.count || 0),
        deviation: item.deviation || '=',
      });
    }
  });

  if (map.size === 0 && plaintext.trim()) {
    const words = extractWords(plaintext);

    words.forEach((word) => {
      const length = Math.max(3, Math.min(25, word.length));
      const existing = map.get(length);

      map.set(length, {
        length,
        count: Number(existing?.count || 0) + 1,
        deviation: '=',
      });
    });
  }

  const completed: HistogramItem[] = [];

  for (let length = 3; length <= 25; length += 1) {
    const existing = map.get(length);

    completed.push(
      existing || {
        length,
        count: 0,
        deviation: '=',
      },
    );
  }

  return completed;
}

function safePercent(value: unknown) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, number));
}

function formatPercent(value: unknown, decimals = 2) {
  return `${safePercent(value).toFixed(decimals).replace('.', ',')}%`;
}

function formatNumber(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '-';
  }

  return new Intl.NumberFormat('sk-SK').format(number);
}

function formatDate(value?: string) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('sk-SK');
  }

  return date.toLocaleDateString('sk-SK');
}

function getYear(value?: string) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().getFullYear();
  }

  return date.getFullYear();
}

function ProtocolStyles() {
  return (
    <style jsx global>{`
      .crzp-page {
        width: 100%;
        max-width: 1040px;
        margin: 0 auto;
        background: #ffffff;
        color: #000000;
        font-family: Arial, Helvetica, sans-serif;
        padding: 34px 42px;
        border: 1px solid #cbd5e1;
        border-radius: 18px;
        box-shadow: 0 30px 90px rgba(15, 23, 42, 0.18);
      }

      .crzp-header {
        margin-bottom: 28px;
      }

      .crzp-topline {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        font-size: 14px;
        color: #000000;
      }

      .crzp-header h1 {
        margin: 34px 0 12px;
        text-align: center;
        font-size: 36px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: -1px;
      }

      .crzp-meta-row {
        display: flex;
        justify-content: space-between;
        font-size: 16px;
        margin-top: 18px;
      }

      .crzp-section {
        margin-top: 30px;
      }

      .crzp-section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 10px;
        font-size: 26px;
        line-height: 1.1;
        font-weight: 900;
        color: #000000;
      }

      .crzp-work-table,
      .crzp-influence-table,
      .crzp-histogram-table,
      .crzp-documents-table {
        width: 100%;
        border-collapse: collapse;
      }

      .crzp-work-table th,
      .crzp-work-table td,
      .crzp-influence-table th,
      .crzp-influence-table td,
      .crzp-histogram-table th,
      .crzp-histogram-table td,
      .crzp-documents-table th,
      .crzp-documents-table td {
        border: 1.5px solid #000000;
        padding: 12px;
        vertical-align: top;
      }

      .crzp-work-table th,
      .crzp-documents-table th {
        font-size: 20px;
        text-align: left;
        font-weight: 900;
      }

      .crzp-work-table th:last-child,
      .crzp-documents-table th:last-child {
        width: 170px;
        text-align: center;
      }

      .crzp-citation-main {
        font-size: 20px;
        font-weight: 900;
        line-height: 1.45;
      }

      .crzp-citation-detail {
        margin-top: 8px;
        font-size: 18px;
        line-height: 1.55;
        font-style: italic;
      }

      .crzp-percent-cell {
        text-align: center;
      }

      .crzp-big-percent {
        font-size: 42px;
        line-height: 1;
        font-weight: 900;
      }

      .crzp-mini-blocks {
        display: flex;
        justify-content: center;
        gap: 7px;
        margin-top: 14px;
      }

      .crzp-mini-blocks span {
        width: 15px;
        height: 15px;
        border: 1.4px solid #000000;
        background: #ffffff;
      }

      .crzp-mini-blocks span.is-filled {
        background: #ef4444;
      }

      .crzp-note {
        margin: 8px 0 0;
        font-size: 16px;
        line-height: 1.45;
      }

      .crzp-corpuses-line {
        margin: 12px 0 0;
        font-size: 18px;
        line-height: 1.45;
      }

      .crzp-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 22px 40px;
        margin-top: 14px;
        font-size: 18px;
        line-height: 1.4;
      }

      .crzp-influence-table th {
        width: 190px;
        font-size: 20px;
        font-weight: 900;
        text-align: center;
      }

      .crzp-influence-table td {
        text-align: center;
        font-size: 18px;
      }

      .crzp-red-text {
        color: #ef4444 !important;
      }

      .crzp-visual-section {
        margin-top: 34px;
        border: 1.5px solid #111827;
        border-radius: 18px;
        padding: 18px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .crzp-visual-title {
        margin: 0 0 16px;
        font-size: 24px;
        font-weight: 900;
        color: #000000;
      }

      .crzp-visual-grid {
        display: grid;
        grid-template-columns: 260px 1fr 1fr;
        gap: 16px;
      }

      .crzp-graph-card {
        border: 1px solid #cbd5e1;
        border-radius: 16px;
        background: #ffffff;
        padding: 16px;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .crzp-graph-card-title {
        margin-bottom: 12px;
        font-size: 15px;
        font-weight: 900;
        color: #0f172a;
      }

      .crzp-donut-wrap {
        position: relative;
        width: 190px;
        height: 190px;
        margin: 0 auto;
      }

      .crzp-donut {
        width: 190px;
        height: 190px;
        transform: rotate(-90deg);
        display: block;
      }

      .crzp-donut-bg {
        stroke: #fee2e2;
      }

      .crzp-donut-value {
        stroke: #ef4444;
        animation: crzpDonutDraw 1.1s ease-out both;
      }

      @keyframes crzpDonutDraw {
        from {
          stroke-dasharray: 0 999;
        }
      }

      .crzp-donut-center {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .crzp-donut-center strong {
        font-size: 31px;
        line-height: 1;
        font-weight: 900;
        color: #dc2626;
      }

      .crzp-donut-center span {
        margin-top: 6px;
        font-size: 12px;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
      }

      .crzp-corpus-bars {
        display: grid;
        gap: 13px;
      }

      .crzp-corpus-row {
        width: 100%;
      }

      .crzp-corpus-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 5px;
        font-size: 13px;
      }

      .crzp-corpus-label strong {
        color: #0f172a;
      }

      .crzp-corpus-label span {
        font-weight: 900;
        color: #dc2626;
      }

      .crzp-corpus-track {
        height: 18px;
        overflow: hidden;
        border: 1px solid #94a3b8;
        border-radius: 999px;
        background: #ffffff;
      }

      .crzp-corpus-fill {
        height: 100%;
        min-width: 2px;
        border-radius: 999px;
        background: repeating-linear-gradient(
          90deg,
          #ef4444,
          #ef4444 9px,
          #fb7185 9px,
          #fb7185 16px
        );
        animation: crzpBarGrow 900ms ease-out both;
      }

      @keyframes crzpBarGrow {
        from {
          width: 0%;
        }
      }

      .crzp-risk-scale {
        position: relative;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        height: 54px;
        margin-top: 36px;
        border: 1px solid #111827;
        border-radius: 10px;
      }

      .crzp-risk-segment {
        display: flex;
        align-items: center;
        justify-content: center;
        border-right: 1px solid #111827;
        font-size: 12px;
        font-weight: 900;
      }

      .crzp-risk-segment:last-child {
        border-right: 0;
      }

      .risk-1 {
        background: #dcfce7;
      }

      .risk-2 {
        background: #fef9c3;
      }

      .risk-3 {
        background: #fed7aa;
      }

      .risk-4 {
        background: #fecaca;
      }

      .risk-5 {
        background: #ef4444;
        color: #ffffff;
      }

      .crzp-risk-pointer {
        position: absolute;
        top: -34px;
        width: 2px;
        height: 90px;
        background: #000000;
        transform: translateX(-1px);
        animation: crzpPointerIn 850ms ease-out both;
      }

      .crzp-risk-pointer span {
        position: absolute;
        top: -25px;
        left: 50%;
        transform: translateX(-50%);
        border-radius: 999px;
        background: #111827;
        color: #ffffff;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 900;
        white-space: nowrap;
      }

      @keyframes crzpPointerIn {
        from {
          opacity: 0;
          transform: translateX(-1px) scaleY(0.2);
        }

        to {
          opacity: 1;
          transform: translateX(-1px) scaleY(1);
        }
      }

      .crzp-risk-caption {
        margin-top: 12px;
        font-size: 12px;
        color: #64748b;
      }

      .crzp-dictionary-visual {
        margin-top: 26px;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .crzp-dictionary-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
      }

      .crzp-stat-card {
        border: 1px solid #cbd5e1;
        border-radius: 16px;
        background: #ffffff;
        padding: 14px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      }

      .crzp-stat-card-title {
        font-size: 13px;
        font-weight: 900;
        color: #475569;
      }

      .crzp-stat-card-number {
        margin-top: 8px;
        font-size: 26px;
        line-height: 1;
        font-weight: 900;
        color: #111827;
      }

      .crzp-stat-card-text {
        margin-top: 8px;
        font-size: 12px;
        color: #64748b;
      }

      .crzp-gauge {
        margin-top: 14px;
      }

      .crzp-gauge-track {
        height: 18px;
        overflow: hidden;
        border: 1px solid #94a3b8;
        border-radius: 999px;
        background: #f1f5f9;
      }

      .crzp-gauge-fill {
        height: 100%;
        min-width: 2px;
        border-radius: 999px;
        background: linear-gradient(90deg, #fb923c, #ef4444);
        animation: crzpBarGrow 900ms ease-out both;
      }

      .crzp-gauge-value {
        margin-top: 8px;
        text-align: right;
        font-size: 22px;
        font-weight: 900;
        color: #dc2626;
      }

      .crzp-histogram-table th {
        width: 160px;
        font-size: 20px;
        font-weight: 900;
        text-align: center;
      }

      .crzp-histogram-table td {
        text-align: center;
        font-size: 18px;
      }

      .crzp-histogram-visual {
        display: flex;
        align-items: flex-end;
        gap: 5px;
        height: 240px;
        margin-top: 18px;
        border: 1.5px solid #000000;
        border-radius: 16px;
        padding: 18px 12px 32px;
        background:
          linear-gradient(#e5e7eb 1px, transparent 1px) 0 0 / 100% 40px,
          #ffffff;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .crzp-histogram-column {
        flex: 1;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-direction: column;
        position: relative;
      }

      .crzp-histogram-count {
        margin-bottom: 4px;
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        font-size: 10px;
        color: #64748b;
      }

      .crzp-histogram-bar {
        width: 100%;
        min-width: 8px;
        border: 1px solid #111827;
        border-radius: 7px 7px 0 0;
        background: #334155;
        animation: crzpHistogramGrow 720ms ease-out both;
        transform-origin: bottom;
      }

      .crzp-histogram-bar.is-warning {
        background: #ef4444;
      }

      .crzp-histogram-bar.is-low {
        background: #f97316;
      }

      @keyframes crzpHistogramGrow {
        from {
          transform: scaleY(0);
        }

        to {
          transform: scaleY(1);
        }
      }

      .crzp-histogram-label {
        position: absolute;
        bottom: -24px;
        font-size: 11px;
        font-weight: 900;
      }

      .crzp-documents-table th {
        font-size: 20px;
        font-weight: 900;
      }

      .crzp-documents-table th:nth-child(1),
      .crzp-documents-table td:nth-child(1) {
        width: 70px;
        text-align: center;
      }

      .crzp-documents-table th:nth-child(3),
      .crzp-documents-table td:nth-child(3) {
        width: 170px;
        text-align: center;
      }

      .crzp-doc-number {
        font-size: 28px;
        font-weight: 900;
      }

      .crzp-doc-title {
        font-size: 19px;
        line-height: 1.45;
        font-weight: 800;
      }

      .crzp-doc-meta {
        margin-top: 8px;
        font-size: 18px;
        line-height: 1.35;
        font-style: italic;
      }

      .crzp-doc-percent {
        font-size: 28px;
        font-weight: 900;
      }

      .crzp-passages {
        display: grid;
        gap: 22px;
      }

      .crzp-passage {
        border: 1.5px solid #000000;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .crzp-passage-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1.5px solid #000000;
        padding: 10px 14px;
        font-size: 18px;
        font-weight: 900;
      }

      .crzp-passage-body {
        padding: 14px;
      }

      .crzp-highlighted-text {
        margin: 0;
        white-space: pre-wrap;
        font-size: 18px;
        line-height: 1.55;
      }

      .crzp-marker {
        display: inline-block;
        margin: 0 2px;
        color: #ef4444;
        font-weight: 900;
      }

      .crzp-source-box {
        border-top: 1px solid #cbd5e1;
        background: #fff7ed;
        padding: 14px;
      }

      .crzp-passage-note {
        border-top: 1px solid #cbd5e1;
        background: #f8fafc;
        padding: 12px 14px;
        font-size: 15px;
        line-height: 1.45;
      }

      .crzp-empty-passages {
        border: 1px solid #000000;
        padding: 14px;
        font-size: 16px;
      }

      .crzp-plaintext-section {
        page-break-before: always;
        break-before: page;
      }

      .crzp-plaintext {
        margin-top: 14px;
        border-top: 1.5px solid #000000;
        padding-top: 14px;
      }

      .crzp-footer {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 20px;
        margin-top: 34px;
        padding-top: 18px;
        font-size: 20px;
        align-items: center;
      }

      .crzp-footer > div:nth-child(3) {
        text-align: right;
      }

      .crzp-footer-links {
        grid-column: 1 / -1;
        margin-top: 14px;
        font-size: 14px;
        word-break: break-all;
      }

      .crzp-warning-box {
        grid-column: 1 / -1;
        display: flex;
        gap: 10px;
        align-items: flex-start;
        border: 1px solid #fed7aa;
        background: #fff7ed;
        color: #9a3412;
        border-radius: 14px;
        padding: 12px;
        font-size: 13px;
      }

      @media print {
        @page {
          size: A4;
          margin: 10mm;
        }

        html,
        body {
          background: #ffffff !important;
        }

        body * {
          visibility: hidden;
        }

        .protocol-shell,
        .protocol-shell *,
        .crzp-page,
        .crzp-page * {
          visibility: visible;
        }

        .protocol-shell {
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          max-width: none !important;
          margin: 0 !important;
        }

        .crzp-page {
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          padding: 0 !important;
          max-width: none !important;
          margin: 0 !important;
        }

        .no-print {
          display: none !important;
        }

        .crzp-visual-section,
        .crzp-dictionary-visual,
        .crzp-histogram-visual {
          display: block !important;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .crzp-visual-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr 1fr !important;
          gap: 8px !important;
        }

        .crzp-dictionary-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr 1fr 1fr !important;
          gap: 8px !important;
        }

        .crzp-graph-card,
        .crzp-stat-card {
          box-shadow: none !important;
        }

        .crzp-donut-value,
        .crzp-corpus-fill,
        .crzp-gauge-fill,
        .crzp-histogram-bar {
          animation: none !important;
        }
      }

      @media (max-width: 1000px) {
        .crzp-page {
          padding: 24px 18px;
        }

        .crzp-visual-grid {
          grid-template-columns: 1fr;
        }

        .crzp-dictionary-grid {
          grid-template-columns: 1fr 1fr;
        }

        .crzp-info-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 700px) {
        .crzp-dictionary-grid {
          grid-template-columns: 1fr;
        }

        .crzp-histogram-visual {
          overflow-x: auto;
        }

        .crzp-histogram-column {
          min-width: 24px;
        }

        .crzp-footer {
          grid-template-columns: 1fr;
          text-align: left;
        }

        .crzp-footer > div:nth-child(3) {
          text-align: left;
        }
      }
    `}</style>
  );
}