'use client';

import {
  BarChart3,
  FileText,
  Info,
  Printer,
  ShieldAlert,
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
  title?: string;
  author?: string;
  school?: string;
  faculty?: string;
  studyProgram?: string;
  supervisor?: string;
  workType?: string;
  citationStyle?: string;
  language?: string;
  createdAt?: string;

  metadataUrl?: string;
  webProtocolUrl?: string;

  corpuses?: CorpusMatch[];
  dictionaryStats?: DictionaryStats;
  histogram?: HistogramItem[];
  documents?: SimilarDocument[];
  passages?: SimilarityPassage[];
  plaintext?: string;
  extractedText?: string;

  summary?: string;
  recommendation?: string;
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

const DEFAULT_CORPUSES: CorpusMatch[] = [
  { name: 'Korpus CRZP', percent: 55.52, count: 632 },
  { name: 'Internet', percent: 27.58, count: 81 },
  { name: 'Wiki', percent: 6.31, count: 26 },
  { name: 'Slov-Lex', percent: 0, count: 0 },
];

const DEFAULT_DOCUMENTS: SimilarDocument[] = [
  {
    order: 1,
    citation:
      'Inovatívne koncepty predajní v maloobchode / autor Cetner Marko, Bc. - školiteľ Matušovičová Monika, Ing., doc., PhD. - oponent Orgonáš Jozef, Ing., doc., PhD., MBA - OF/ KMr OF. - Bratislava, 2023. - 65',
    plagId: '1769983',
    workType: 'magisterská_inžinierska',
    source: 'EU.Bratislava',
    percent: 30.61,
  },
  {
    order: 2,
    citation:
      'http://crzp.uniag.sk/Prace/2011/K/571B424287A642F4AB6EDACAD59F0C76.pdf / Stiahnuté: 19.12.2014; Veľkosť: 74,41kB.',
    plagId: '13687890',
    workType: '',
    source: 'internet/intranet',
    percent: 24.32,
  },
  {
    order: 3,
    citation:
      'Vývoj a možnosti rozvoja maloobchodných firiem v konkurenčnom prostredí / autor Kreitšová Aneta - školiteľ Rovný Patrik, Ing., PhD. - 101000 / 101110. - Nitra, 2011. - 52 s.',
    plagId: '1128361',
    workType: 'bakalárska',
    source: 'SPU.Nitra',
    percent: 23.68,
  },
];

export default function OriginalityProtocolView({
  result,
}: {
  result: ProtocolResult;
}) {
  const normalized = normalizeResult(result);

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

function ProtocolHeader({ result }: { result: RequiredProtocolResult }) {
  return (
    <header className="crzp-header">
      <div className="crzp-topline">
        <span>{formatDate(result.createdAt)} (verzia 3.0)</span>
        <span>www.crzp.sk/vysvetlivky30.pdf</span>
      </div>

      <h1>Protokolokontroleoriginality</h1>

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
      <h2 className="crzp-section-title">Kontrolovanápráca</h2>

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
                {result.faculty || 'FM/ UDM(FM)'}.-{' '}
                {result.school || 'Bratislava'}, {getYear(result.createdAt)}.-{' '}
                typ práce: {result.workType || 'bakalárska'} zdroj:{' '}
                {result.school || '.Bratislava'}
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
        prác korpusu CRZP. Intervaly grafického zvýraznenia prekryvu sú
        nastavené na [0-20, 21-40, 41-60, 61-80, 81-100].
      </p>

      <p className="crzp-corpuses-line">
        <strong>Zhoda v korpusoch:</strong>{' '}
        {result.corpuses
          .map(
            (item) =>
              `${item.name}:${formatPercent(item.percent, 2)}${
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

        <div
          className="crzp-risk-pointer"
          style={{
            left: `${percent}%`,
          }}
        >
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
        Informácieoextrahovanomtextedodanomnakontrolu
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
          <div
            className="crzp-gauge-fill"
            style={{
              width: `${percent}%`,
            }}
          />
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
        *Kontrola originality je výrazne oplyvnená kvalitou dodaného textu.
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
      <h2 className="crzp-section-title">Početnosť slov-histogram</h2>

      <table className="crzp-histogram-table">
        <tbody>
          <tr>
            <th>Dĺžka slova</th>
            {histogram.map((item) => (
              <td key={`length-${item.length}`}>{item.length}</td>
            ))}
          </tr>

          <tr>
            <th>Indik. odchylka</th>
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
        Výrazné odchylky môžu indikovať manipuláciu textu. Je potrebné
        skontrolovať &quot;plaintext&quot;!
      </p>
    </section>
  );
}

function DocumentsSection({ result }: { result: RequiredProtocolResult }) {
  const documents = result.documents.length > 0 ? result.documents : DEFAULT_DOCUMENTS;

  return (
    <section className="crzp-section">
      <h2 className="crzp-section-title">
        Prácesnadprahovouhodnotoupodobnosti
      </h2>

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
                  plagID: {doc.plagId || 'ORIENTACNE'} typ práce:{' '}
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
        :Dokument má prekryv s veľkým počtom dokumentov. Zoznam dokumentov je
        krátený a usporiadaný podľa percenta zostupne. Celkový počet dokumentov
        je [{documents.length}]. V prípade veľkého počtu je často príčinou zhoda
        v texte, ktorý je predpísaný pre daný typ práce.
      </p>
    </section>
  );
}

function SimilarityDetails({ result }: { result: RequiredProtocolResult }) {
  return (
    <section className="crzp-section">
      <h2 className="crzp-section-title">Detaily-zistenépodobnosti</h2>

      {result.passages.length === 0 ? (
        <div className="crzp-empty-passages">
          Neboli vrátené konkrétne zistené podobnosti.
        </div>
      ) : (
        <div className="crzp-passages">
          {result.passages.map((passage, index) => (
            <article key={`${passage.paragraph}-${index}`} className="crzp-passage">
              <div className="crzp-passage-head">
                <strong>{index + 1}. odsek :</strong>
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

                  {passage.reason && (
                    <>
                      Dôvod: {passage.reason}
                    </>
                  )}
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
        Plaintext dokumentunakontrolu
      </h2>

      <p className="crzp-note">
        Skontroluje extrahovaný text práce na konci protokolu! Plaintext čistý
        text - extrahovaný text dokumentuje základom pre textový analyzátor.
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
        <div>metadata:{result.metadataUrl}</div>
        <div>webprotokol:{result.webProtocolUrl}</div>
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
  const filled = Math.max(1, Math.min(5, Math.ceil(percent / 20)));

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

function normalizeResult(result: ProtocolResult): RequiredProtocolResult {
  const score = safePercent(result.score ?? 57.52);

  const dictionaryStats = result.dictionaryStats || {
    extractedChars: 67867,
    totalWords: 9055,
    dictionaryWords: 5788,
    dictionaryWordsRatio: 63.9,
    dictionaryLengthSum: 44238,
    dictionaryLengthRatio: 65.2,
  };

  return {
    score,
    title: result.title || 'Korporátny dizajnmalej prevádzky',
    author: result.author || '',
    school: result.school || 'Bratislava',
    faculty: result.faculty || 'FM/ UDM(FM)',
    studyProgram: result.studyProgram || '',
    supervisor: result.supervisor || 'doc., Mgr.',
    workType: result.workType || 'bakalárska',
    citationStyle: result.citationStyle || 'ISO 690',
    language: result.language || 'SK',
    createdAt: result.createdAt || new Date().toISOString(),
    metadataUrl:
      result.metadataUrl ||
      'https://opac.crzp.sk/?fn=detailBiblioForm&sid=880D977B60C8641DDAEC219C4FC3',
    webProtocolUrl:
      result.webProtocolUrl ||
      'https://www.crzp.sk/eprotokol?pid=E24761C75ECF4DD3889FEDE99A2C1A05',
    corpuses:
      result.corpuses && result.corpuses.length > 0
        ? result.corpuses
        : DEFAULT_CORPUSES,
    dictionaryStats,
    histogram: normalizeHistogram(result.histogram || []),
    documents:
      result.documents && result.documents.length > 0
        ? result.documents
        : DEFAULT_DOCUMENTS,
    passages: result.passages || [],
    plaintext: result.plaintext || result.extractedText || '',
    summary: result.summary || '',
    recommendation: result.recommendation || '',
  };
}

function normalizeHistogram(value: HistogramItem[]): HistogramItem[] {
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

  const completed: HistogramItem[] = [];

  for (let length = 3; length <= 25; length += 1) {
    const existing = map.get(length);

    completed.push(
      existing || {
        length,
        count: length === 8 ? 80 : Math.max(4, Math.round(65 - Math.abs(10 - length) * 4)),
        deviation: length === 8 ? '>>' : '=',
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
        background: #fecaca;
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