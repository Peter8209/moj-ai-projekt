'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  X,
} from 'lucide-react';

import type { AnalysisResult } from './analysisTypes';

type PreparedDataFileLike = {
  fileName?: string;
  base64?: string;
  mimeType?: string;
  rows?: number;
  columns?: number;
  warnings?: string[];
  sheets?: string[];
  qualityReport?: unknown[];
} | null;

type Props = {
  open: boolean;
  result: AnalysisResult | null;
  onClose: () => void;

  /**
   * Pripravený súbor z /api/analyze-data/prepare.
   * Modal ho neposiela cez lokálne exporty. Posiela ho do samostatného
   * Word, Excel, PDF alebo Raw Data API podľa zvoleného tlačidla.
   */
  preparedDataFile?: PreparedDataFileLike;

  /**
   * Zachované len kvôli spätnej kompatibilite s DashboardClient.tsx.
   * Tento modal ho zámerne nepoužíva. Excel volá výhradne samostatný Excel endpoint.
   */
  onExportExcel?: () => void | Promise<void>;
};

type ApiExportFormat = 'excel' | 'raw' | 'word' | 'pdf';

type JsonObject = Record<string, unknown>;

type PreparedDatasetRecord = JsonObject & {
  quality?: unknown;
  rows?: unknown;
  rawDataSheet?: unknown;
  variables?: unknown;
  variableMapSheet?: unknown;
};

const EXPORT_ENDPOINTS: Record<ApiExportFormat, string> = {
  excel: '/api/analyze-data/export/excel',
  word: '/api/analyze-data/export/word',
  pdf: '/api/analyze-data/export/pdf',
  raw: '/api/analyze-data/export/raw-data',
};

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function valueToText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—';

    return value.toLocaleString('sk-SK', {
      maximumFractionDigits: Number.isInteger(value) ? 0 : 4,
    });
  }

  if (typeof value === 'boolean') return value ? 'Áno' : 'Nie';

  if (Array.isArray(value)) {
    if (!value.length) return '—';

    return value.map(valueToText).join(', ');
  }

  if (isRecord(value)) {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined && item !== '')
      .slice(0, 8);

    if (!entries.length) return '—';

    return entries
      .map(([key, item]) => `${key}: ${valueToText(item)}`)
      .join('\n');
  }

  return String(value).trim() || '—';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');

  if (!normalized) return null;

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function getNestedValue(source: unknown, path: string[]): unknown {
  let current = source;

  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }

  return current;
}

function getPreparedDataFileFromResult(result: AnalysisResult | null): PreparedDataFileLike {
  const raw: JsonObject = isRecord(result) ? result : {};

  const candidates = [
    raw['preparedDataFile'],
    raw['preparedFileData'],
    raw['preparedFile'],
    raw['preparedDatasetFile'],
    getNestedValue(raw, ['statisticalAnalysis', 'preparedDataFile']),
    getNestedValue(raw, ['analysisResult', 'preparedDataFile']),
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;

    const hasUsefulData =
      typeof candidate['base64'] === 'string' ||
      typeof candidate['fileName'] === 'string' ||
      typeof candidate['mimeType'] === 'string' ||
      typeof candidate['rows'] === 'number' ||
      typeof candidate['columns'] === 'number' ||
      Array.isArray(candidate['warnings']) ||
      Array.isArray(candidate['sheets']) ||
      Array.isArray(candidate['qualityReport']);

    if (hasUsefulData) {
      return candidate as PreparedDataFileLike;
    }
  }

  return null;
}

function getFileNameFromContentDisposition(
  contentDisposition: string | null,
  fallbackFileName: string,
): string {
  if (!contentDisposition) return fallbackFileName;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/"/g, '').trim());
    } catch {
      return utf8Match[1].replace(/"/g, '').trim() || fallbackFileName;
    }
  }

  const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);

  return fileNameMatch?.[1]?.trim() || fallbackFileName;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function getBaseFileName(format: ApiExportFormat): string {
  const timestamp = getTimestamp();

  if (format === 'excel') return `ZEDPERA_export_analyzy_dat_${timestamp}`;
  if (format === 'raw') return `ZEDPERA_raw_data_${timestamp}`;
  if (format === 'word') return `ZEDPERA_vysledky_analyzy_dat_${timestamp}`;

  return `ZEDPERA_vysledky_analyzy_dat_${timestamp}`;
}

function getFallbackFileName(format: ApiExportFormat, contentType = ''): string {
  const base = getBaseFileName(format);

  if (contentType.includes('application/pdf')) return `${base}.pdf`;
  if (contentType.includes('json')) return `${base}.json`;
  if (contentType.includes('html')) return `${base}.html`;
  if (format === 'word') return `${base}.doc`;
  if (format === 'pdf') return `${base}.pdf`;

  return `${base}.xlsx`;
}

function getResultRoot(result: AnalysisResult | null): unknown {
  if (!result) return {};

  return result;
}

function buildApiExportPayload(params: {
  result: AnalysisResult;
  preparedDataFile: PreparedDataFileLike;
  format: ApiExportFormat;
}) {
  const resultRoot = getResultRoot(params.result);
  const fileName = getBaseFileName(params.format);
  const endpoint = EXPORT_ENDPOINTS[params.format];

  return {
    result: resultRoot,
    analysisResult: resultRoot,
    data: resultRoot,
    preparedDataFile: params.preparedDataFile,
    fileName,
    exportMode: 'dedicated-api-route',
    source: `AnalysisResultsModal.${params.format}`,
    endpoint,

    /**
     * Formát určuje samotný endpoint. Modal nevytvára dokumenty,
     * Excel hárky ani grafy a nepoužíva lokálny fallback.
     */
    clientSideDocumentBuild: false,
    clientSideSheetBuild: false,
    clientSideCharts: false,
    duplicateSheetSections: false,
    maxChartsPerSection: 1,
  };
}

function getResultMeta(result: AnalysisResult | null, preparedDataFile: PreparedDataFileLike) {
  const raw: JsonObject = isRecord(result) ? result : {};
  const statistical: JsonObject = isRecord(raw['statisticalAnalysis'])
    ? raw['statisticalAnalysis']
    : {};
  const meta: JsonObject = isRecord(raw['meta'])
    ? raw['meta']
    : isRecord(statistical['meta'])
      ? statistical['meta']
      : {};

  const preparedDataset: PreparedDatasetRecord = isRecord(raw['preparedDataset'])
    ? (raw['preparedDataset'] as PreparedDatasetRecord)
    : {};

  const quality: JsonObject = isRecord(preparedDataset['quality'])
    ? preparedDataset['quality']
    : {};

  const preparedRows = safeArray(preparedDataset['rows']).length;
  const rawDataSheet = safeArray(preparedDataset['rawDataSheet']);
  const rawDataSheetRows =
    rawDataSheet.length > 1 && Array.isArray(rawDataSheet[0])
      ? rawDataSheet.length - 1
      : 0;

  const variableRows = safeArray(preparedDataset['variables']).length;
  const variableMapSheet = safeArray(preparedDataset['variableMapSheet']);
  const variableMapRows =
    variableMapSheet.length > 1 && Array.isArray(variableMapSheet[0])
      ? variableMapSheet.length - 1
      : 0;

  const directRespondents =
    toNumber(meta['respondentCount']) ??
    toNumber(meta['rows']) ??
    toNumber(meta['rowCount']) ??
    toNumber(quality['rowCount']) ??
    toNumber(preparedDataFile?.rows) ??
    preparedRows;

  const respondents = directRespondents || rawDataSheetRows || 0;

  const directVariables =
    toNumber(meta['columns']) ??
    toNumber(meta['variableCount']) ??
    toNumber(quality['variableCount']) ??
    toNumber(preparedDataFile?.columns) ??
    variableRows;

  const variables = directVariables || variableMapRows || 0;

  const warnings = [
    ...safeArray<string>(preparedDataFile?.warnings),
    ...safeArray<string>(raw['warnings']),
    ...safeArray<string>(statistical['warnings']),
  ].filter(Boolean);

  const preparedFileName = valueToText(meta['preparedFileName']);
  const sourceFileName = valueToText(quality['sourceFileName']);
  const sheetName = valueToText(meta['sheetName']);
  const selectedSheetName = valueToText(quality['selectedSheetName']);
  const title = valueToText(raw['title']);

  return {
    respondents,
    variables,
    warnings,
    sourceFile:
      preparedDataFile?.fileName ||
      (preparedFileName !== '—' ? preparedFileName : '') ||
      (sourceFileName !== '—' ? sourceFileName : '') ||
      '—',
    selectedSheet:
      sheetName !== '—'
        ? sheetName
        : selectedSheetName !== '—'
          ? selectedSheetName
          : '—',
    hasPreparedBase64: Boolean(preparedDataFile?.base64),
    preparedSheets: safeArray(preparedDataFile?.sheets),
    title: title !== '—' ? title : 'Výsledky analýzy dát',
  };
}

function getRouteStatusText(preparedDataFile: PreparedDataFileLike): string {
  if (preparedDataFile?.base64) {
    return 'Pripravený Excel/base64 je dostupný a bude odoslaný do API route na dopočítanie listov.';
  }

  return 'Pripravený Excel/base64 nie je v props modalu. API route použije dostupný result/analysisResult payload.';
}

function formatPayloadSize(payload: unknown): string {
  try {
    const sizeMb = new Blob([JSON.stringify(payload)]).size / 1024 / 1024;

    return `${sizeMb.toLocaleString('sk-SK', {
      maximumFractionDigits: 2,
    })} MB`;
  } catch {
    return '—';
  }
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: unknown;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{valueToText(value)}</p>
      {description ? (
        <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}

function ExportButton({
  format,
  label,
  description,
  icon,
  exporting,
  onClick,
}: {
  format: ApiExportFormat;
  label: string;
  description: string;
  icon: ReactNode;
  exporting: ApiExportFormat | null;
  onClick: (format: ApiExportFormat) => void;
}) {
  const active = exporting === format;
  const disabled = exporting !== null;

  return (
    <button
      type="button"
      onClick={() => onClick(format)}
      disabled={disabled}
      className="group flex min-h-[92px] w-full items-start gap-3 rounded-2xl border border-white/10 bg-[#0b1020] p-4 text-left shadow-sm transition hover:border-blue-300/40 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="mt-0.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-blue-100">
        {active ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      </span>
      <span>
        <span className="block text-sm font-black text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-400">
          {description}
        </span>
      </span>
    </button>
  );
}

export default function AnalysisResultsModal({
  open,
  result,
  onClose,
  preparedDataFile: preparedDataFileFromProps = null,
}: Props) {
  const [exporting, setExporting] = useState<ApiExportFormat | null>(null);
  const [error, setError] = useState<string>('');

  const preparedDataFile = useMemo(
    () => preparedDataFileFromProps || getPreparedDataFileFromResult(result),
    [preparedDataFileFromProps, result],
  );

  const meta = useMemo(
    () => getResultMeta(result, preparedDataFile),
    [result, preparedDataFile],
  );

  const previewPayload = useMemo(() => {
    if (!result) return null;

    return buildApiExportPayload({
      result,
      preparedDataFile,
      format: 'excel',
    });
  }, [result, preparedDataFile]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  async function exportViaApiRoute(format: ApiExportFormat) {
    if (!result) return;

    setError('');
    setExporting(format);

    try {
      const payload = buildApiExportPayload({
        result,
        preparedDataFile,
        format,
      });

      const endpoint = EXPORT_ENDPOINTS[format];

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zedpera-Export-Source': `analysis-results-modal-${format}`,
          'X-Zedpera-Client-Sheet-Build': 'disabled',
          'X-Zedpera-Client-Charts': 'disabled',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const errorText = contentType.includes('application/json')
          ? JSON.stringify(await response.json())
          : await response.text();

        throw new Error(
          errorText ||
            `Export cez ${endpoint} zlyhal. HTTP status: ${response.status}.`,
        );
      }

      const contentType = response.headers.get('content-type') || '';
      const blob = await response.blob();

      if (!blob.size) {
        throw new Error(`Export cez ${endpoint} vrátil prázdny súbor.`);
      }

      const fileName = getFileNameFromContentDisposition(
        response.headers.get('content-disposition'),
        getFallbackFileName(format, contentType),
      );

      downloadBlob(blob, fileName);
    } catch (exportError) {
      const message =
        exportError instanceof Error
          ? exportError.message
          : 'Export sa nepodarilo vytvoriť.';

      console.error('ANALYSIS_RESULTS_MODAL_API_ROUTE_EXPORT_ERROR:', exportError);
      setError(message);
    } finally {
      setExporting(null);
    }
  }

  if (!open || !result) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 p-2 text-white backdrop-blur-md sm:p-5">
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
        aria-label="Zavrieť exportný modal"
      />

      <div className="relative mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#050814] shadow-2xl sm:h-[calc(100dvh-2.5rem)]">
        <header className="shrink-0 border-b border-white/10 bg-[#0b1020] px-5 py-4 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
                ZEDPERA export
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                Samostatné exportné API
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Každý formát používa vlastný API endpoint. Modal iba odošle kompletné výsledky analýzy
                a stiahne hotový súbor. Word, Excel, PDF a Raw Data sa už navzájom nemiešajú
                a nepoužívajú spoločný klientsky fallback.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white transition hover:bg-white/10"
              aria-label="Zavrieť"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-5 py-5 sm:px-7">
          <section className="rounded-[24px] border border-blue-300/15 bg-blue-500/10 p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-200" />
              <div>
                <h3 className="text-base font-black text-blue-50">
                  Štyri oddelené exportné endpointy
                </h3>
                <p className="mt-2 text-sm leading-6 text-blue-50/80">
                  Každé tlačidlo volá samostatný route: Word, Excel, PDF alebo Raw Data.
                  Analytické údaje, škály, subškály, reliabilita, tabuľky a najviac jeden prehľadový
                  graf na sekciu pripravuje príslušné API. Modal nevytvára export lokálne.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Respondenti"
              value={meta.respondents || '—'}
              description="Hodnota je iba informatívna; reálny export počíta API route."
            />
            <MetricCard
              label="Premenné"
              value={meta.variables || '—'}
              description="Počet stĺpcov/premenných z dostupného payloadu."
            />
            <MetricCard
              label="Pripravený súbor"
              value={meta.hasPreparedBase64 ? 'Áno' : 'Nie'}
              description={getRouteStatusText(preparedDataFile)}
            />
            <MetricCard
              label="Veľkosť payloadu"
              value={previewPayload ? formatPayloadSize(previewPayload) : '—'}
              description="Payload sa posiela priamo do export route."
            />
          </section>

          <section className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.025] p-5">
            <h3 className="text-lg font-black text-white">Dostupné exporty</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Každý formát má vlastný endpoint a vlastné serverové spracovanie. Do všetkých endpointov
              sa odosiela rovnaký kompletný analytický payload, aby boli výsledky konzistentné.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ExportButton
                format="excel"
                label="EXCEL"
                description="Kompletný Excel cez /api/analyze-data/export/excel, usporiadané listy a najviac jeden graf na príslušnú sekciu."
                icon={<FileSpreadsheet className="h-5 w-5" />}
                exporting={exporting}
                onClick={exportViaApiRoute}
              />
              <ExportButton
                format="raw"
                label="RAW DATA"
                description="Kompletné zdrojové a pripravené dáta cez /api/analyze-data/export/raw-data bez klientského skladania."
                icon={<FileSpreadsheet className="h-5 w-5" />}
                exporting={exporting}
                onClick={exportViaApiRoute}
              />
              <ExportButton
                format="word"
                label="WORD"
                description="Profesionálny Word cez /api/analyze-data/export/word so všetkými výsledkami a usporiadanými sekciami."
                icon={<FileText className="h-5 w-5" />}
                exporting={exporting}
                onClick={exportViaApiRoute}
              />
              <ExportButton
                format="pdf"
                label="PDF"
                description="Profesionálny PDF cez /api/analyze-data/export/pdf so všetkými výsledkami a prehľadným rozložením."
                icon={<Download className="h-5 w-5" />}
                exporting={exporting}
                onClick={exportViaApiRoute}
              />
            </div>
          </section>

          <section className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.025] p-5">
            <h3 className="text-lg font-black text-white">Kontrola odosielaného payloadu</h3>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Zdrojový súbor
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
                  {meta.sourceFile}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Hárok / zdroj výpočtu
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
                  {meta.selectedSheet}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 lg:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  API endpoint
                </p>
                <div className="mt-2 grid gap-1 text-sm leading-6 text-slate-100">
                  <code>{EXPORT_ENDPOINTS.word}</code>
                  <code>{EXPORT_ENDPOINTS.excel}</code>
                  <code>{EXPORT_ENDPOINTS.pdf}</code>
                  <code>{EXPORT_ENDPOINTS.raw}</code>
                </div>
              </div>
            </div>

            {meta.warnings.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                  <div>
                    <p className="text-sm font-black text-amber-50">
                      Upozornenia z payloadu
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-50/85">
                      {meta.warnings.slice(0, 8).map((warning, index) => (
                        <li key={`warning-${index}`}>{valueToText(warning)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-200" />
                  <div>
                    <p className="text-sm font-black text-red-50">
                      Export cez API route zlyhal
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-red-50/85">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
