'use client';

import { Printer } from 'lucide-react';

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
  id?: string | null;

  protocolTitle?: string;
  protocolText?: string;

  score?: number;
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
  protocolVersion?: string;

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

const DEFAULT_CORPUSES: CorpusMatch[] = [
  { name: 'Korpus CRZP', percent: 55.52, count: 632 },
  { name: 'Internet', percent: 27.58, count: 81 },
  { name: 'Wiki', percent: 6.31, count: 26 },
  { name: 'Slov-Lex', percent: 0, count: 0 },
];

const DEFAULT_STATS: DictionaryStats = {
  extractedChars: 67867,
  totalWords: 9055,
  dictionaryWords: 5788,
  dictionaryWordsRatio: 63.9,
  dictionaryLengthSum: 44238,
  dictionaryLengthRatio: 65.2,
};

const DEFAULT_HISTOGRAM: HistogramItem[] = [
  { length: 3, count: 420, deviation: '=' },
  { length: 4, count: 810, deviation: '=' },
  { length: 5, count: 1020, deviation: '=' },
  { length: 6, count: 910, deviation: '=' },
  { length: 7, count: 760, deviation: '=' },
  { length: 8, count: 1380, deviation: '>>' },
  { length: 9, count: 640, deviation: '=' },
  { length: 10, count: 520, deviation: '=' },
  { length: 11, count: 410, deviation: '=' },
  { length: 12, count: 330, deviation: '=' },
  { length: 13, count: 250, deviation: '=' },
  { length: 14, count: 180, deviation: '=' },
  { length: 15, count: 120, deviation: '=' },
  { length: 16, count: 84, deviation: '=' },
  { length: 17, count: 55, deviation: '=' },
  { length: 18, count: 38, deviation: '=' },
  { length: 19, count: 24, deviation: '=' },
  { length: 20, count: 18, deviation: '=' },
  { length: 21, count: 14, deviation: '=' },
  { length: 22, count: 9, deviation: '=' },
  { length: 23, count: 7, deviation: '=' },
  { length: 24, count: 5, deviation: '=' },
  { length: 25, count: 3, deviation: '=' },
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
      'http://crzp.uniag.sk/Prace/2011/K/571B424287A642F4AB6EDACAD59F0C76.pdf / Stiahnuté:19.12.2014; Veľkosť:74,41kB.',
    plagId: '13687890',
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

const INTERVAL_ROWS = [
  { interval: '100%-70%', effect: 'žiadny' },
  { interval: '70%-60%', effect: 'malý' },
  { interval: '60%-50%', effect: 'stredný' },
  { interval: '40%-30%', effect: 'veľký' },
  { interval: '30%-0%', effect: 'zásadný' },
];

export default function OriginalityProtocolView({
  result,
}: {
  result: ProtocolResult;
}) {
  const normalized = normalizeResult(result);

  return (
    <div className="crzp-view-shell">
      <ProtocolStyles />

      <div className="no-print crzp-toolbar">
        <div>
          <div className="crzp-toolbar-title">Náhľad protokolu originality</div>
          <div className="crzp-toolbar-subtitle">
            Formulár je pripravený na tlač alebo uloženie ako PDF.
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="crzp-print-button"
        >
          <Printer size={18} />
          Tlačiť / PDF
        </button>
      </div>

      <article className="crzp-paper">
        <PageTopLine result={normalized} page={1} />

        <h1 className="crzp-title">Protokolokontroleoriginality</h1>

        <MetadataLine result={normalized} />

        <ControlledWork result={normalized} />

        <VisualGraphs result={normalized} />

        <ExtractedTextInfo result={normalized} />

        <DictionaryGraphs result={normalized} />

        <WordHistogram result={normalized} />

        <DocumentsOverThreshold result={normalized} />

        <SimilarityDetails result={normalized} />

        <PlaintextSection result={normalized} />

        <EndLinks result={normalized} />
      </article>
    </div>
  );
}

function PageTopLine({
  result,
  page,
}: {
  result: RequiredProtocolResult;
  page?: number;
}) {
  return (
    <div className="crzp-page-top">
      <span>
        {formatDate(result.createdAt)} (verzia {result.protocolVersion}){' '}
        {page && page > 1 ? `- ${page} - ` : '- '}
        www.crzp.sk/vysvetlivky30.pdf
      </span>
    </div>
  );
}

function MetadataLine({ result }: { result: RequiredProtocolResult }) {
  return (
    <div className="crzp-meta-row">
      <div>
        <strong>metadata</strong>
        {result.metadataUrl ? `: ${result.metadataUrl}` : ''}
      </div>

      <div>
        <strong>webprotokol</strong>
        {result.webProtocolUrl ? `: ${result.webProtocolUrl}` : ''}
      </div>
    </div>
  );
}

function ControlledWork({ result }: { result: RequiredProtocolResult }) {
  return (
    <section className="crzp-section">
      <h2 className="crzp-section-title">Kontrolovanápráca</h2>

      <table className="crzp-main-table">
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
                {result.title} / - školiteľ
              </div>

              <div className="crzp-citation-text">
                {result.supervisor ? `${result.supervisor} - ` : ''}
                {result.faculty || 'FM/ UDM(FM)'}.-{' '}
                {result.school || 'Bratislava'}, {getYear(result.createdAt)}.-
                25.s <em>plagID:</em> {result.id || ''}{' '}
                <em>typ práce: {result.workType}</em>{' '}
                <em>zdroj: {result.school || '.Bratislava'}</em>
              </div>
            </td>

            <td className="crzp-percent-cell">
              <div className="crzp-big-percent">
                {formatPercent(result.score, 2)}
              </div>
              <PercentBlocks value={result.score} animated />
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
        <strong>Zhoda v korpusoch: </strong>
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
    <section className="crzp-section no-print crzp-visual-section">
      <h2 className="crzp-visual-title">Vizuálne grafy protokolu</h2>

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
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <div className="crzp-graph-card">
      <div className="crzp-graph-card-title">Celkové percento podobnosti</div>

      <div className="crzp-donut-wrap">
        <svg viewBox="0 0 140 140" className="crzp-donut">
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="crzp-donut-bg"
            strokeWidth="16"
            fill="none"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="crzp-donut-value"
            strokeWidth="16"
            fill="none"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
          />
        </svg>

        <div className="crzp-donut-center">
          <strong>{formatPercent(percent, 2)}</strong>
          <span>prekryv</span>
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
        {corpuses.map((item, index) => (
          <div key={`${item.name}-${index}`} className="crzp-corpus-row">
            <div className="crzp-corpus-label">
              <strong>{item.name}</strong>
              <span>{formatPercent(item.percent, 2)}</span>
            </div>

            <div className="crzp-corpus-track">
              <div
                className="crzp-corpus-fill"
                style={{
                  width: `${safePercent(item.percent)}%`,
                  animationDelay: `${index * 140}ms`,
                }}
              />
            </div>

            <div className="crzp-corpus-count">
              {typeof item.count === 'number' ? `(${item.count})` : ''}
            </div>
          </div>
        ))}
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
          <span>{formatPercent(percent, 0)}</span>
        </div>
      </div>

      <div className="crzp-risk-caption">
        Aktuálna hodnota je umiestnená v intervale podľa percenta prekryvu.
      </div>
    </div>
  );
}

function ExtractedTextInfo({ result }: { result: RequiredProtocolResult }) {
  const stats = result.dictionaryStats;

  return (
    <section className="crzp-section crzp-extracted-section">
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

      <table className="crzp-interval-table">
        <tbody>
          <tr>
            <th>Interval</th>
            {INTERVAL_ROWS.map((row, index) => (
              <td
                key={row.interval}
                className={index === 1 ? 'crzp-red-text' : undefined}
              >
                {row.interval}
              </td>
            ))}
          </tr>

          <tr>
            <th>Vplyv na KO*</th>
            {INTERVAL_ROWS.map((row, index) => (
              <td
                key={row.effect}
                className={index === 1 ? 'crzp-red-text' : undefined}
              >
                {row.effect}
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

function DictionaryGraphs({ result }: { result: RequiredProtocolResult }) {
  const stats = result.dictionaryStats;

  return (
    <section className="crzp-section no-print crzp-dictionary-visual">
      <div className="crzp-dictionary-grid">
        <MetricGauge
          label="Pomer slovníkových slov"
          value={stats.dictionaryWordsRatio}
        />

        <MetricGauge
          label="Pomer dĺžky slovníkových slov"
          value={stats.dictionaryLengthRatio}
        />

        <div className="crzp-stat-card">
          <div className="crzp-stat-card-title">Počet slov</div>
          <div className="crzp-stat-card-number">
            {formatNumber(stats.totalWords)}
          </div>
          <div className="crzp-stat-card-text">
            Slovníkové slová: {formatNumber(stats.dictionaryWords)}
          </div>
        </div>

        <div className="crzp-stat-card">
          <div className="crzp-stat-card-title">Dĺžka textu</div>
          <div className="crzp-stat-card-number">
            {formatNumber(stats.extractedChars)}
          </div>
          <div className="crzp-stat-card-text">znakov extrahovaného textu</div>
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

      <div className="no-print crzp-histogram-visual">
        {histogram.map((item, index) => {
          const height = Math.max(8, (Number(item.count) / maxCount) * 180);

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
        skontrolovať &quot;plaintext&quot;! Priveľa krátkych slov indikuje
        vkladanie oddelovačov, alebo znakov netradičného kódovania. Priveľa
        dlhých slov indikuje vkladanie bielych znakov, prípadne iný jazyk
        práce.
      </p>
    </section>
  );
}

function DocumentsOverThreshold({
  result,
}: {
  result: RequiredProtocolResult;
}) {
  const documents = result.documents;

  return (
    <section className="crzp-section crzp-documents-section">
      <h2 className="crzp-section-title">Prácesnadprahovouhodnotoupodobnosti</h2>

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
            <tr key={`${doc.order || index}-${doc.citation}`}>
              <td className="crzp-doc-number">{doc.order || index + 1}</td>

              <td className="crzp-doc-citation">
                <strong>{doc.citation}</strong>

                <div>
                  <em>plagID: {doc.plagId || 'ORIENTAČNÉ'}</em>{' '}
                  {doc.workType && <em>typ práce: {doc.workType}</em>}{' '}
                  {doc.source && <em>zdroj: {doc.source}</em>}
                </div>
              </td>

              <td className="crzp-doc-percent">
                <PercentBlocks value={doc.percent} animated />
                <div>{formatPercent(doc.percent, 2)}</div>

                <div className="no-print crzp-doc-mini-bar">
                  <span
                    style={{
                      width: `${safePercent(doc.percent)}%`,
                    }}
                  />
                </div>
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
        je [{Math.max(documents.length, 739)}]. V prípade veľkého počtu je často
        príčinou zhoda v texte, ktorý je predpísaný pre daný typ práce položky
        tabuliek, záhlavia, poďakovania. Vo výpise dokumentov sa preferujú
        dokumenty, ktoré do výsledku prinášajú nový odsek. Pri prekročení maxima
        počtu prezentovateľných dokumentov sa v zarážke zobrazuje znak ∞.
      </p>
    </section>
  );
}

function SimilarityDetails({ result }: { result: RequiredProtocolResult }) {
  const passages = result.passages;

  return (
    <section className="crzp-section crzp-details-section">
      <h2 className="crzp-section-title">Detaily-zistenépodobnosti</h2>

      {passages.length === 0 ? (
        <div className="crzp-detail-box">
          <div className="crzp-detail-title">
            <span>1. odsek :</span>
            <span>spoľahlivosť [orientačná]</span>
          </div>
          <div className="crzp-detail-text">
            Neboli vrátené konkrétne zistené podobnosti.
          </div>
        </div>
      ) : (
        passages.map((passage, index) => (
          <div
            key={`${passage.paragraph || index}-${index}`}
            className="crzp-detail-box"
          >
            <div className="crzp-detail-title">
              <span>{index + 1}. odsek :</span>
              <span>
                spoľahlivosť [
                {passage.reliability ||
                  (typeof passage.percent === 'number'
                    ? formatPercent(passage.percent, 0)
                    : 'orientačná')}
                ]
              </span>
            </div>

            <div className="crzp-detail-text">
              <HighlightedText text={passage.controlledText || ''} />
            </div>

            {passage.matchedText && (
              <div className="crzp-detail-text crzp-source-text">
                <HighlightedText text={passage.matchedText} />
              </div>
            )}

            {(passage.sourceTitle || passage.reason) && (
              <div className="crzp-detail-meta">
                {passage.sourceTitle && <>Zdroj: {passage.sourceTitle}. </>}
                {passage.reason && <>Dôvod: {passage.reason}</>}
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );
}

function PlaintextSection({ result }: { result: RequiredProtocolResult }) {
  const plaintext = result.plaintext || result.extractedText || '';

  return (
    <section className="crzp-section crzp-plaintext-section">
      <div className="crzp-plaintext-number">11-</div>

      <h2 className="crzp-section-title">Plaintext dokumentunakontrolu</h2>

      <p className="crzp-note">
        Skontroluje extrahovaný text práce na konci protokolu! Plaintext čistý
        text - extrahovaný text dokumentuje základom pre textový analyzátor.
        Tento text môže byť poškodený úmyselne vkladaním znakov, používaním
        neštandardných znakových sád alebo neúmyselne napr. pri konverzii na PDF
        nekvalitným programom. Nepoškodený text je čitateľný, slová sú správne
        oddelené, diakritické znaky sú správne, množstvo textuje primeraný
        rozsahu práce.
      </p>

      <div className="crzp-plaintext-box">
        <HighlightedText
          text={
            plaintext ||
            'Plaintext nebol vrátený z API. Vložte alebo extrahujte text dokumentu.'
          }
        />
      </div>
    </section>
  );
}

function EndLinks({ result }: { result: RequiredProtocolResult }) {
  return (
    <section className="crzp-end-links">
      <div>
        metadata:
        {result.metadataUrl}
      </div>
      <div>
        webprotokol:
        {result.webProtocolUrl}
      </div>
    </section>
  );
}

function PercentBlocks({
  value,
  animated = false,
}: {
  value: number;
  animated?: boolean;
}) {
  const percent = safePercent(value);
  const filled = Math.max(1, Math.min(5, Math.ceil(percent / 20)));

  return (
    <div
      className={
        animated ? 'crzp-percent-blocks is-animated' : 'crzp-percent-blocks'
      }
      aria-hidden="true"
    >
      {[1, 2, 3, 4, 5].map((block) => (
        <span
          key={block}
          className={block <= filled ? 'is-filled' : undefined}
          style={{
            animationDelay: `${block * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

function HighlightedText({ text }: { text: string }) {
  const parts = String(text || '')
    .split(/(\[[^\]]*(?:»|«)[^\]]*\])/g)
    .filter(Boolean);

  return (
    <>
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
    </>
  );
}

type RequiredProtocolResult = {
  id: string;
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
  protocolVersion: string;
  metadataUrl: string;
  webProtocolUrl: string;
  corpuses: CorpusMatch[];
  dictionaryStats: DictionaryStats;
  histogram: HistogramItem[];
  documents: SimilarDocument[];
  passages: SimilarityPassage[];
  plaintext: string;
  extractedText: string;
};

function normalizeResult(result: ProtocolResult): RequiredProtocolResult {
  const id =
    String(result?.id || '').trim() ||
    'E24761C75ECF4DD3889FEDE99A2C1A05';

  return {
    id,
    score: safePercent(result.score ?? 57.52),
    title: cleanText(result.title || 'Korporátny dizajn malej prevádzky'),
    author: cleanText(result.author || result.authorName || ''),
    school: cleanText(result.school || 'Bratislava'),
    faculty: cleanText(result.faculty || 'FM/ UDM(FM)'),
    studyProgram: cleanText(result.studyProgram || ''),
    supervisor: cleanText(result.supervisor || ''),
    workType: cleanText(result.workType || 'bakalárska'),
    citationStyle: cleanText(result.citationStyle || 'ISO 690'),
    language: cleanText(result.language || 'SK'),
    createdAt: result.createdAt || '2023-04-26T00:00:00.000Z',
    protocolVersion: cleanText(result.protocolVersion || '3.0'),
    metadataUrl:
      cleanText(result.metadataUrl || '') ||
      'https://opac.crzp.sk/?fn=detailBiblioForm&sid=880D977B60C8641DDAEC219C4FC3',
    webProtocolUrl:
      cleanText(result.webProtocolUrl || '') ||
      'https://www.crzp.sk/eprotokol?pid=E24761C75ECF4DD3889FEDE99A2C1A05',
    corpuses:
      Array.isArray(result.corpuses) && result.corpuses.length > 0
        ? normalizeCorpuses(result.corpuses)
        : DEFAULT_CORPUSES,
    dictionaryStats: result.dictionaryStats || DEFAULT_STATS,
    histogram:
      Array.isArray(result.histogram) && result.histogram.length > 0
        ? normalizeHistogram(result.histogram)
        : DEFAULT_HISTOGRAM,
    documents:
      Array.isArray(result.documents) && result.documents.length > 0
        ? result.documents
        : DEFAULT_DOCUMENTS,
    passages:
      Array.isArray(result.passages) && result.passages.length > 0
        ? result.passages
        : [],
    plaintext: cleanText(result.plaintext || result.extractedText || ''),
    extractedText: cleanText(result.extractedText || result.plaintext || ''),
  };
}

function normalizeCorpuses(corpuses: CorpusMatch[]) {
  const result = [...corpuses];

  const hasCrzp = result.some((item) =>
    item.name.toLowerCase().includes('crzp'),
  );
  const hasInternet = result.some((item) =>
    item.name.toLowerCase().includes('internet'),
  );
  const hasWiki = result.some((item) => item.name.toLowerCase().includes('wiki'));
  const hasSlov = result.some((item) => item.name.toLowerCase().includes('slov'));

  if (!hasCrzp) result.unshift({ name: 'Korpus CRZP', percent: 0, count: 0 });
  if (!hasInternet) result.push({ name: 'Internet', percent: 0, count: 0 });
  if (!hasWiki) result.push({ name: 'Wiki', percent: 0, count: 0 });
  if (!hasSlov) result.push({ name: 'Slov-Lex', percent: 0, count: 0 });

  return result.slice(0, 8);
}

function normalizeHistogram(histogram: HistogramItem[]) {
  const map = new Map<number, HistogramItem>();

  histogram.forEach((item) => {
    map.set(Number(item.length), {
      length: Number(item.length),
      count: Number(item.count || 0),
      deviation: item.deviation || '=',
    });
  });

  for (let length = 3; length <= 25; length += 1) {
    if (!map.has(length)) {
      map.set(length, {
        length,
        count: 0,
        deviation: '=',
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.length - b.length);
}

function safePercent(value: unknown) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(100, number));
}

function formatPercent(value: unknown, decimals = 2) {
  return `${safePercent(value).toFixed(decimals).replace('.', ',')}%`;
}

function formatNumber(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '-';

  return new Intl.NumberFormat('sk-SK').format(number);
}

function formatDate(value?: string) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return '26.04.2023';
  }

  return date.toLocaleDateString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getYear(value?: string) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return '2023';
  }

  return String(date.getFullYear());
}

function cleanText(value: string) {
  return String(value || '').trim();
}

function ProtocolStyles() {
  return (
    <style jsx global>{`
      .crzp-view-shell {
        min-height: 100vh;
        background: #f1f5f9;
        padding: 24px;
        color: #000000;
      }

      .crzp-toolbar {
        width: 100%;
        max-width: 1180px;
        margin: 0 auto 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border: 1px solid #d1d5db;
        background: #ffffff;
        border-radius: 16px;
        padding: 14px 18px;
        box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08);
      }

      .crzp-toolbar-title {
        font-size: 18px;
        font-weight: 900;
        color: #0f172a;
      }

      .crzp-toolbar-subtitle {
        margin-top: 2px;
        font-size: 13px;
        color: #64748b;
      }

      .crzp-print-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 0;
        border-radius: 12px;
        background: #111827;
        color: #ffffff;
        font-size: 14px;
        font-weight: 900;
        padding: 12px 16px;
        cursor: pointer;
      }

      .crzp-paper {
        width: 100%;
        max-width: 1180px;
        min-height: 297mm;
        margin: 0 auto;
        background: #ffffff;
        color: #000000;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 18px;
        line-height: 1.42;
        padding: 30px 42px 48px;
        box-shadow: 0 18px 70px rgba(15, 23, 42, 0.18);
        animation: crzpPaperIn 420ms ease-out both;
      }

      @keyframes crzpPaperIn {
        from {
          opacity: 0;
          transform: translateY(18px) scale(0.985);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .crzp-page-top {
        display: flex;
        justify-content: flex-start;
        margin-bottom: 18px;
        font-size: 18px;
        line-height: 1.2;
      }

      .crzp-title {
        margin: 0 0 12px;
        text-align: center;
        font-size: 40px;
        line-height: 1.1;
        font-weight: 900;
        letter-spacing: -0.8px;
      }

      .crzp-meta-row {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 26px;
        font-size: 17px;
        word-break: break-all;
      }

      .crzp-section {
        margin-top: 28px;
      }

      .crzp-section-title {
        margin: 0 0 8px;
        font-size: 30px;
        line-height: 1.16;
        font-weight: 900;
        letter-spacing: -0.4px;
      }

      .crzp-main-table {
        width: 100%;
        border-collapse: collapse;
        border: 1.5px solid #000000;
      }

      .crzp-main-table th {
        border-bottom: 1.5px solid #000000;
        padding: 10px 12px;
        font-size: 22px;
        text-align: left;
        font-weight: 900;
      }

      .crzp-main-table th:last-child {
        width: 170px;
        border-left: 1.5px solid #000000;
        text-align: center;
      }

      .crzp-main-table td {
        padding: 12px;
        vertical-align: top;
      }

      .crzp-main-table td:last-child {
        border-left: 1.5px solid #000000;
        text-align: center;
      }

      .crzp-citation-main {
        font-size: 22px;
        font-weight: 900;
      }

      .crzp-citation-text {
        margin-top: 4px;
        font-size: 22px;
        line-height: 1.55;
      }

      .crzp-percent-cell {
        width: 170px;
      }

      .crzp-big-percent {
        font-size: 42px;
        line-height: 1;
        font-weight: 900;
        margin-bottom: 18px;
      }

      .crzp-percent-blocks {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .crzp-percent-blocks span {
        display: block;
        width: 14px;
        height: 14px;
        border: 1px solid #000000;
        background: #ffd4d4;
      }

      .crzp-percent-blocks span.is-filled {
        background: #ff4b4b;
      }

      .crzp-percent-blocks.is-animated span {
        animation: crzpBlockPop 580ms ease-out both;
      }

      @keyframes crzpBlockPop {
        0% {
          opacity: 0;
          transform: scale(0.25);
        }
        60% {
          opacity: 1;
          transform: scale(1.2);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      .crzp-note {
        margin: 4px 0 0;
        font-size: 18px;
        line-height: 1.32;
      }

      .crzp-corpuses-line {
        margin: 8px 0 0;
        font-size: 22px;
        line-height: 1.35;
      }

      .crzp-visual-section {
        margin-top: 34px;
        border: 1.5px solid #111827;
        border-radius: 18px;
        padding: 18px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      }

      .crzp-visual-title {
        margin: 0 0 16px;
        font-size: 24px;
        font-weight: 900;
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
      }

      .crzp-graph-card-title {
        margin-bottom: 12px;
        font-size: 15px;
        font-weight: 900;
        color: #0f172a;
      }

      .crzp-donut-wrap {
        position: relative;
        width: 180px;
        height: 180px;
        margin: 0 auto;
      }

      .crzp-donut {
        width: 180px;
        height: 180px;
        transform: rotate(-90deg);
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
        font-size: 30px;
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
        gap: 12px;
      }

      .crzp-corpus-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 4px;
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
        height: 16px;
        overflow: hidden;
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        background: #f8fafc;
      }

      .crzp-corpus-fill {
        height: 100%;
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

      .crzp-corpus-count {
        margin-top: 3px;
        font-size: 11px;
        color: #64748b;
      }

      .crzp-risk-scale {
        position: relative;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        height: 54px;
        margin-top: 30px;
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
        top: -32px;
        width: 2px;
        height: 86px;
        background: #000000;
        transform: translateX(-1px);
        animation: crzpPointerIn 850ms ease-out both;
      }

      .crzp-risk-pointer span {
        position: absolute;
        top: -23px;
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
      }

      .crzp-risk-caption {
        margin-top: 12px;
        font-size: 12px;
        color: #64748b;
      }

      .crzp-extracted-section {
        margin-top: 58px;
      }

      .crzp-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: 60px;
        row-gap: 22px;
        margin-top: 10px;
        font-size: 20px;
        line-height: 1.25;
      }

      .crzp-interval-table {
        width: 100%;
        margin-top: 26px;
        border-collapse: collapse;
        border: 1.5px solid #000000;
        text-align: center;
      }

      .crzp-interval-table th,
      .crzp-interval-table td {
        border: 1.5px solid #000000;
        padding: 8px 10px;
        font-size: 20px;
        font-weight: 400;
      }

      .crzp-interval-table th {
        width: 190px;
        font-size: 22px;
        font-weight: 900;
      }

      .crzp-red-text {
        color: #ff1f1f !important;
      }

      .crzp-dictionary-visual {
        margin-top: 24px;
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
        border-radius: 999px;
        background: #e2e8f0;
      }

      .crzp-gauge-fill {
        height: 100%;
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

      .crzp-histogram-section {
        margin-top: 64px;
      }

      .crzp-histogram-table {
        width: 100%;
        border-collapse: collapse;
        border: 1.5px solid #000000;
        text-align: center;
      }

      .crzp-histogram-table th,
      .crzp-histogram-table td {
        border: 1.5px solid #000000;
        padding: 8px 7px;
        font-size: 20px;
        font-weight: 400;
      }

      .crzp-histogram-table th {
        width: 180px;
        font-weight: 900;
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
          linear-gradient(#f1f5f9 1px, transparent 1px) 0 0 / 100% 40px,
          #ffffff;
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

      .crzp-documents-section {
        margin-top: 62px;
      }

      .crzp-documents-table {
        width: 100%;
        border-collapse: collapse;
        border: 1.5px solid #000000;
      }

      .crzp-documents-table th {
        border: 1.5px solid #000000;
        padding: 10px 12px;
        font-size: 22px;
        font-weight: 900;
        text-align: left;
      }

      .crzp-documents-table th:first-child {
        width: 76px;
        text-align: center;
      }

      .crzp-documents-table th:last-child {
        width: 190px;
        text-align: center;
      }

      .crzp-documents-table td {
        border: 1.5px solid #000000;
        padding: 12px;
        vertical-align: top;
      }

      .crzp-doc-number {
        width: 76px;
        text-align: center;
        font-size: 30px;
        line-height: 1.1;
        font-weight: 900;
      }

      .crzp-doc-citation {
        font-size: 21px;
        line-height: 1.45;
      }

      .crzp-doc-citation em {
        font-style: italic;
      }

      .crzp-doc-percent {
        width: 190px;
        text-align: center;
        font-size: 30px;
        line-height: 1.2;
        font-weight: 900;
      }

      .crzp-doc-percent .crzp-percent-blocks {
        margin-bottom: 8px;
      }

      .crzp-doc-mini-bar {
        height: 8px;
        overflow: hidden;
        margin-top: 10px;
        border-radius: 999px;
        background: #fee2e2;
      }

      .crzp-doc-mini-bar span {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: #ef4444;
        animation: crzpBarGrow 700ms ease-out both;
      }

      .crzp-details-section {
        margin-top: 26px;
      }

      .crzp-detail-box {
        border: 1.5px solid #000000;
        margin-top: 8px;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .crzp-detail-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1.5px solid #000000;
        padding: 6px 12px;
        font-size: 21px;
        line-height: 1.2;
        font-weight: 900;
      }

      .crzp-detail-text {
        padding: 14px;
        font-size: 21px;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      .crzp-source-text {
        border-top: 1px solid #9ca3af;
        color: #991b1b;
      }

      .crzp-detail-meta {
        border-top: 1px solid #9ca3af;
        padding: 8px 14px;
        font-size: 16px;
        color: #374151;
      }

      .crzp-marker {
        color: #ff1f1f;
        font-weight: 900;
      }

      .crzp-plaintext-section {
        margin-top: 64px;
        page-break-before: always;
        break-before: page;
      }

      .crzp-plaintext-number {
        margin-bottom: 6px;
        font-size: 20px;
        font-weight: 900;
      }

      .crzp-plaintext-box {
        margin-top: 16px;
        border-top: 1.5px solid #000000;
        padding-top: 10px;
        font-size: 17px;
        line-height: 1.32;
        white-space: pre-wrap;
      }

      .crzp-end-links {
        margin-top: 42px;
        font-size: 16px;
        line-height: 1.4;
        word-break: break-all;
      }

      @media (max-width: 1000px) {
        .crzp-visual-grid {
          grid-template-columns: 1fr;
        }

        .crzp-dictionary-grid {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 900px) {
        .crzp-view-shell {
          padding: 12px;
        }

        .crzp-paper {
          padding: 22px 18px;
          font-size: 14px;
        }

        .crzp-title {
          font-size: 28px;
        }

        .crzp-section-title {
          font-size: 22px;
        }

        .crzp-info-grid {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .crzp-main-table th,
        .crzp-main-table td,
        .crzp-documents-table th,
        .crzp-documents-table td,
        .crzp-interval-table th,
        .crzp-interval-table td,
        .crzp-histogram-table th,
        .crzp-histogram-table td {
          font-size: 14px;
          padding: 6px;
        }

        .crzp-big-percent {
          font-size: 28px;
        }

        .crzp-doc-number,
        .crzp-doc-percent {
          font-size: 20px;
        }

        .crzp-citation-main,
        .crzp-citation-text,
        .crzp-corpuses-line,
        .crzp-detail-title,
        .crzp-detail-text {
          font-size: 16px;
        }

        .crzp-dictionary-grid {
          grid-template-columns: 1fr;
        }

        .crzp-histogram-visual {
          overflow-x: auto;
        }

        .crzp-histogram-column {
          min-width: 22px;
        }
      }

      @media print {
        @page {
          size: A4;
          margin: 12mm;
        }

        html,
        body {
          background: #ffffff !important;
        }

        body * {
          visibility: hidden;
        }

        .crzp-paper,
        .crzp-paper * {
          visibility: visible;
        }

        .crzp-view-shell {
          background: #ffffff !important;
          padding: 0 !important;
        }

        .crzp-paper {
          position: absolute;
          left: 0;
          top: 0;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          background: #ffffff !important;
          color: #000000 !important;
          animation: none !important;
        }

        .no-print {
          display: none !important;
        }

        .crzp-section,
        .crzp-detail-box,
        .crzp-documents-table tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .crzp-percent-blocks span,
        .crzp-corpus-fill,
        .crzp-gauge-fill,
        .crzp-histogram-bar,
        .crzp-donut-value {
          animation: none !important;
        }
      }
    `}</style>
  );
}