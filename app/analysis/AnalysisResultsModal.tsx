'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  FileDown,
  FileText,
  Info,
  Printer,
  Table2,
  X,
} from 'lucide-react';

import AnalysisCharts from './AnalysisCharts';
import AnalysisTable from './AnalysisTable';
import type { AnalysisResult } from './analysisTypes';

type Props = {
  open: boolean;
  result: AnalysisResult | null;
  onClose: () => void;
};

type ModalTab = 'summary' | 'text' | 'tables' | 'charts' | 'tests' | 'sources';

type TabItem = {
  key: ModalTab;
  label: string;
  icon: React.ReactNode;
};

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function normalizeSourcesText(value: unknown) {
  const cleaned = cleanText(value);

  if (!cleaned) return '';

  return cleaned
    .replace(
      /A\.\s*Detegované\s+zdroje\s+z\s+extrahovaného\s+textu/gi,
      'A. Zdroje nájdené v priložených dokumentoch',
    )
    .replace(
      /Detegované\s+zdroje\s+z\s+extrahovaného\s+textu/gi,
      'Zdroje nájdené v priložených dokumentoch',
    )
    .replace(
      /A\.\s*Zdroje\s+z\s+extrahovaného\s+textu/gi,
      'A. Zdroje nájdené v priložených dokumentoch',
    )
    .replace(
      /Zdroje\s+z\s+extrahovaného\s+textu/gi,
      'Zdroje nájdené v priložených dokumentoch',
    )
    .trim();
}

function getTitle(result: AnalysisResult | null) {
  return cleanText((result as any)?.title || 'Výsledky analýzy dát');
}

function getSummary(result: AnalysisResult | null) {
  if (!result) return '';

  return cleanText(
    (result as any).summary ||
      (result as any).dataDescription ||
      (result as any).description ||
      '',
  );
}

function getResultText(result: AnalysisResult | null) {
  if (!result) return '';

  const candidates = [
    (result as any).interpretation,
    (result as any).practicalText,
    (result as any).fullText,
    (result as any).fullResult,
    (result as any).text,
    (result as any).output,
    (result as any).result,
    (result as any).summary,
  ];

  const value = candidates.find((item) => cleanText(item).length > 0);

  return cleanText(value || '');
}

function getSourcesText(result: AnalysisResult | null) {
  if (!result) return '';

  const candidates = [
    (result as any).sources,
    (result as any).sourceText,
    (result as any).bibliography,
    (result as any).formattedSources,
    (result as any).usedSources,
    (result as any).references,
  ];

  const value = candidates.find((item) => cleanText(item).length > 0);

  return normalizeSourcesText(value || '');
}

function createExportText(result: AnalysisResult | null) {
  if (!result) return '';

  const title = getTitle(result);
  const summary = getSummary(result);
  const warnings = safeArray<string>((result as any)?.warnings);
  const resultText = getResultText(result);
  const sourcesText = getSourcesText(result);

  const warningsBlock = warnings.length
    ? `Upozornenia:\n${warnings.map((item) => `- ${item}`).join('\n')}`
    : '';

  return cleanText(
    [
      title,
      '',
      summary ? `Súhrn\n${summary}` : '',
      '',
      warningsBlock,
      '',
      resultText ? `Textová interpretácia\n${resultText}` : '',
      '',
      sourcesText
        ? `Použité zdroje a autori\n\n${sourcesText}`
        : `Použité zdroje a autori

A. Zdroje nájdené v priložených dokumentoch
Zdroje neboli dodané alebo sa ich nepodarilo overene načítať.

B. Formátované bibliografické záznamy
Údaj je potrebné overiť.

C. Varianty odkazov v texte
Údaj je potrebné overiť.

D. Priložené dokumenty použité ako podklad
Údaj je potrebné overiť.`,
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

function htmlEscape(value: string) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function createDocHtml(title: string, text: string) {
  const paragraphs = cleanText(text)
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '<p>&nbsp;</p>';

      const isHeading =
        /^(Súhrn|Textová interpretácia|Použité zdroje a autori|Upozornenia|Tabuľky|Grafy|Testy)$/i.test(
          line.trim(),
        );

      if (isHeading) {
        return `<h2>${htmlEscape(line)}</h2>`;
      }

      return `<p>${htmlEscape(line)}</p>`;
    })
    .join('');

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${htmlEscape(title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111827;
      padding: 40px;
    }

    h1 {
      font-size: 22pt;
      margin-bottom: 24px;
    }

    h2 {
      font-size: 16pt;
      margin: 24px 0 12px;
    }

    p {
      margin: 0 0 11px 0;
    }
  </style>
</head>
<body>
  <h1>${htmlEscape(title)}</h1>
  ${paragraphs}
</body>
</html>
`;
}

function sanitizeFileName(value: string) {
  return (
    String(value || 'vysledky-analyzy')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'vysledky-analyzy'
  );
}

function downloadBlob({
  content,
  fileName,
  mimeType,
}: {
  content: BlobPart;
  fileName: string;
  mimeType: string;
}) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function getObjectTitle(value: any, fallback: string) {
  if (typeof value === 'string') return value;

  return (
    value?.title ||
    value?.name ||
    value?.test ||
    value?.analysis ||
    value?.variable ||
    fallback
  );
}

function getObjectDescription(value: any) {
  if (typeof value === 'string') return value;

  return (
    value?.description ||
    value?.interpretation ||
    value?.reason ||
    value?.hypothesis ||
    value?.result ||
    value?.summary ||
    ''
  );
}

function getCountLabel(value: number, one: string, many: string) {
  return value === 1 ? `${value} ${one}` : `${value} ${many}`;
}

function InfoCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
          {icon}
        </div>

        <div className="text-sm font-black text-slate-200">{title}</div>
      </div>

      <div className="text-2xl font-black text-white">{value}</div>

      {subtitle ? (
        <div className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</div>
      ) : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm leading-7 text-slate-400">
      {text}
    </div>
  );
}

function SectionBox({
  title,
  children,
  tone = 'default',
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'default' | 'blue' | 'green' | 'amber';
}) {
  const toneClass =
    tone === 'blue'
      ? 'border-blue-400/20 bg-blue-500/10'
      : tone === 'green'
        ? 'border-emerald-400/20 bg-emerald-500/10'
        : tone === 'amber'
          ? 'border-amber-400/20 bg-amber-500/10'
          : 'border-white/10 bg-white/[0.055]';

  const titleClass =
    tone === 'blue'
      ? 'text-blue-100'
      : tone === 'green'
        ? 'text-emerald-100'
        : tone === 'amber'
          ? 'text-amber-100'
          : 'text-white';

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <h3 className={`mb-4 text-lg font-black ${titleClass}`}>{title}</h3>
      {children}
    </div>
  );
}

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[420px] overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-slate-300">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AnalysisResultsModal({ open, result, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ModalTab>('summary');

  const title = useMemo(() => getTitle(result), [result]);
  const summary = useMemo(() => getSummary(result), [result]);
  const resultText = useMemo(() => getResultText(result), [result]);
  const sourcesText = useMemo(() => getSourcesText(result), [result]);
  const exportText = useMemo(() => createExportText(result), [result]);

  const warnings = safeArray<string>((result as any)?.warnings);

  const variables = safeArray<any>(
    (result as any)?.variables || (result as any)?.detectedVariables,
  );

  const frequencies = safeArray<any>(
    (result as any)?.frequencies ||
      (result as any)?.frequencyTables ||
      (result as any)?.frequency_tables,
  );

  const recommendedTests = safeArray<any>(
    (result as any)?.recommendedTests ||
      (result as any)?.tests ||
      (result as any)?.recommended_tests,
  );

  const recommendedCharts = safeArray<any>(
    (result as any)?.recommendedCharts ||
      (result as any)?.charts ||
      (result as any)?.recommended_charts,
  );

  const excelTables = safeArray<any>(
    (result as any)?.excelTables ||
      (result as any)?.tables ||
      (result as any)?.excel_tables,
  );

  const descriptiveStatistics = safeArray<any>(
    (result as any)?.descriptiveStatistics ||
      (result as any)?.descriptive_statistics ||
      (result as any)?.statistics,
  );

  const hypothesisTests = safeArray<any>(
    (result as any)?.hypothesisTests ||
      (result as any)?.hypothesis_tests ||
      (result as any)?.testResults,
  );

  const selectedAnalyses = safeArray<any>(
    (result as any)?.selectedAnalyses || (result as any)?.selected_analyses,
  );

  const hasTables =
    frequencies.length > 0 ||
    excelTables.length > 0 ||
    descriptiveStatistics.length > 0 ||
    variables.length > 0;

  const hasCharts = recommendedCharts.length > 0 || frequencies.length > 0;

  const hasTests = recommendedTests.length > 0 || hypothesisTests.length > 0;

  useEffect(() => {
    if (open) {
      setActiveTab('summary');
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleDownloadTxt = () => {
    if (!exportText.trim()) return;

    downloadBlob({
      content: exportText,
      fileName: `${sanitizeFileName(title)}.txt`,
      mimeType: 'text/plain;charset=utf-8',
    });
  };

  const handleDownloadDoc = () => {
    if (!exportText.trim()) return;

    const html = createDocHtml(title, exportText);

    downloadBlob({
      content: html,
      fileName: `${sanitizeFileName(title)}.doc`,
      mimeType: 'application/msword;charset=utf-8',
    });
  };

  const handlePrintPdf = () => {
    if (!exportText.trim()) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      alert('Prehliadač zablokoval otvorenie PDF okna. Povoľ pop-up okná.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(createDocHtml(title, exportText));
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const tabs: TabItem[] = [
    {
      key: 'summary',
      label: 'Súhrn',
      icon: <Info className="h-4 w-4" />,
    },
    {
      key: 'text',
      label: 'Text',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      key: 'tables',
      label: 'Tabuľky',
      icon: <Table2 className="h-4 w-4" />,
    },
    {
      key: 'charts',
      label: 'Grafy',
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      key: 'tests',
      label: 'Testy',
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      key: 'sources',
      label: 'Zdroje',
      icon: <BookOpen className="h-4 w-4" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 text-white backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#070a16] shadow-2xl shadow-black/50">
        <div className="shrink-0 border-b border-white/10 bg-[#070a16] px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                Analýza dokončená
              </div>

              <h2 className="text-2xl font-black md:text-3xl">{title}</h2>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Výsledky analýzy dát sú rozdelené na súhrn, textovú
                interpretáciu, tabuľky, grafy, odporúčané testy a použité
                zdroje.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTxt}
                disabled={!exportText.trim()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/[0.11] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                TXT
              </button>

              <button
                type="button"
                onClick={handleDownloadDoc}
                disabled={!exportText.trim()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/[0.11] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileDown className="h-4 w-4" />
                DOC
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                disabled={!exportText.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Printer className="h-4 w-4" />
                PDF
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-red-500/90 p-3 text-white transition hover:bg-red-400"
                title="Zavrieť"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black transition ${
                    active
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/30'
                      : 'border border-white/10 bg-white/[0.055] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          {!result && (
            <EmptyState text="Výsledok analýzy nie je dostupný. Skontroluj, či rodičovský súbor posiela do modalu hodnotu analysisResult." />
          )}

          {result && activeTab === 'summary' && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                  icon={<FileText className="h-5 w-5" />}
                  title="Premenné"
                  value={variables.length}
                  subtitle={getCountLabel(
                    variables.length,
                    'identifikovaná premenná',
                    'identifikovaných premenných',
                  )}
                />

                <InfoCard
                  icon={<Table2 className="h-5 w-5" />}
                  title="Tabuľky"
                  value={
                    frequencies.length +
                    excelTables.length +
                    descriptiveStatistics.length
                  }
                  subtitle="Frekvenčné tabuľky, Excel tabuľky a deskriptívna štatistika"
                />

                <InfoCard
                  icon={<BarChart3 className="h-5 w-5" />}
                  title="Grafy"
                  value={recommendedCharts.length}
                  subtitle="Odporúčané alebo dostupné grafy"
                />

                <InfoCard
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="Testy"
                  value={recommendedTests.length + hypothesisTests.length}
                  subtitle="Odporúčané alebo vypočítané štatistické testy"
                />
              </div>

              {summary ? (
                <SectionBox title="Súhrn analýzy">
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                    {summary}
                  </div>
                </SectionBox>
              ) : (
                <EmptyState text="Súhrn analýzy nebol v odpovedi dostupný." />
              )}

              {warnings.length > 0 ? (
                <SectionBox title="Upozornenia" tone="amber">
                  <div className="space-y-2">
                    {warnings.map((warning, index) => (
                      <div
                        key={`warning-${index}`}
                        className="flex gap-3 rounded-2xl border border-amber-400/20 bg-black/20 px-4 py-3 text-sm leading-6 text-amber-50"
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                        <div>{warning}</div>
                      </div>
                    ))}
                  </div>
                </SectionBox>
              ) : (
                <SectionBox title="Stav spracovania" tone="green">
                  <div className="text-sm leading-7 text-emerald-50">
                    Spracovanie prebehlo bez zásadných upozornení.
                  </div>
                </SectionBox>
              )}

              {selectedAnalyses.length > 0 && (
                <SectionBox title="Vybrané analýzy">
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedAnalyses.map((item: any, index) => (
                      <div
                        key={`selected-analysis-${index}`}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300"
                      >
                        <div className="font-black text-white">
                          {getObjectTitle(item, `Analýza ${index + 1}`)}
                        </div>

                        {getObjectDescription(item) ? (
                          <div className="mt-2 text-slate-400">
                            {getObjectDescription(item)}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </SectionBox>
              )}
            </div>
          )}

          {result && activeTab === 'text' && (
            <div className="space-y-5">
              {resultText ? (
                <SectionBox title="Textová interpretácia">
                  <div className="whitespace-pre-wrap text-sm leading-8 text-slate-200">
                    {resultText}
                  </div>
                </SectionBox>
              ) : (
                <EmptyState text="Textová interpretácia nebola v odpovedi dostupná." />
              )}

              {(result as any).practicalText && (
                <SectionBox title="Formulácia do praktickej časti práce" tone="blue">
                  <div className="whitespace-pre-wrap text-sm leading-8 text-blue-50/90">
                    {cleanText((result as any).practicalText)}
                  </div>
                </SectionBox>
              )}
            </div>
          )}

          {result && activeTab === 'tables' && (
            <div className="space-y-5">
              {hasTables ? (
                <AnalysisTable result={result} />
              ) : (
                <EmptyState text="Tabuľky neboli v odpovedi dostupné. Skontroluj, či /api/analysis/files vracia polia frequencies, excelTables, variables alebo descriptiveStatistics." />
              )}

              {!hasTables && (
                <SectionBox title="Technická kontrola dát">
                  <JsonPreview
                    value={{
                      variables,
                      frequencies,
                      excelTables,
                      descriptiveStatistics,
                    }}
                  />
                </SectionBox>
              )}
            </div>
          )}

          {result && activeTab === 'charts' && (
            <div className="space-y-5">
              {hasCharts ? (
                <AnalysisCharts result={result} />
              ) : (
                <EmptyState text="Grafy neboli v odpovedi dostupné. Skontroluj, či /api/analysis/files vracia polia recommendedCharts alebo frekvenčné tabuľky." />
              )}

              {!hasCharts && (
                <SectionBox title="Technická kontrola grafov">
                  <JsonPreview
                    value={{
                      recommendedCharts,
                      frequencies,
                    }}
                  />
                </SectionBox>
              )}
            </div>
          )}

          {result && activeTab === 'tests' && (
            <div className="space-y-5">
              {!hasTests && (
                <EmptyState text="Odporúčané alebo vypočítané štatistické testy neboli v odpovedi dostupné." />
              )}

              {recommendedTests.length > 0 && (
                <SectionBox title="Odporúčané štatistické testy">
                  <div className="space-y-3">
                    {recommendedTests.map((item: any, index) => (
                      <div
                        key={`recommended-test-${index}`}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="text-sm font-black text-white">
                          {getObjectTitle(item, `Test ${index + 1}`)}
                        </div>

                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                          {getObjectDescription(item) ||
                            JSON.stringify(item, null, 2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionBox>
              )}

              {hypothesisTests.length > 0 && (
                <SectionBox title="Výsledky testovania hypotéz">
                  <div className="space-y-3">
                    {hypothesisTests.map((item: any, index) => (
                      <div
                        key={`hypothesis-test-${index}`}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="text-sm font-black text-white">
                          {getObjectTitle(item, `Výsledok testu ${index + 1}`)}
                        </div>

                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                          {getObjectDescription(item) ||
                            JSON.stringify(item, null, 2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionBox>
              )}
            </div>
          )}

          {result && activeTab === 'sources' && (
            <div className="space-y-5">
              <SectionBox title="Použité zdroje a autori" tone="green">
                {sourcesText ? (
                  <div className="whitespace-pre-wrap text-sm leading-8 text-emerald-50/90">
                    {sourcesText}
                  </div>
                ) : (
                  <div className="text-sm leading-7 text-emerald-50/80">
                    Zdroje neboli dodané alebo sa ich nepodarilo overene
                    načítať.
                  </div>
                )}
              </SectionBox>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}