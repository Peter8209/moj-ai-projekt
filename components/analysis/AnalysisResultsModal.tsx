'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  X,
} from 'lucide-react';

import type { AnalysisResult } from './analysisTypes';

type JsonObject = Record<string, unknown>;
type ApiExportFormat = 'word' | 'excel' | 'pdf' | 'raw';

type PreparedDataFileLike = {
  preparedFileId?: string;
  fileId?: string;
  storageKey?: string;
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
  preparedDataFile?: PreparedDataFileLike;

  /**
   * Zachované iba kvôli spätnej kompatibilite.
   * Modal tento callback nepoužíva.
   */
  onExportExcel?: () => void | Promise<void>;
};

type CompactProfile = {
  maxDepth: number;
  maxStringLength: number;
  defaultArrayLimit: number;
  includePreparedBase64: boolean;
};

type ExportPayload = {
  preparedFileId?: string;
  analysisResult?: unknown;
  preparedDataFile?: {
    preparedFileId?: string;
    fileId?: string;
    storageKey?: string;
    fileName?: string;
    mimeType?: string;
    rows?: number;
    columns?: number;
    warnings?: string[];
    sheets?: string[];
    qualityReport?: unknown[];
    base64?: string;
  } | null;
  fileName: string;
  source: string;
  exportMode:
    | 'prepared-file-id'
    | 'compact-analysis-result'
    | 'compact-analysis-with-file';
  payloadVersion: '3.0';
  maxChartsPerSection: 1;
  clientSideBuild: false;
};

const EXPORT_ENDPOINTS: Record<ApiExportFormat, string> = {
  word: '/api/analyze-data/export/word',
  excel: '/api/analyze-data/export/excel',
  pdf: '/api/analyze-data/export/pdf',
  raw: '/api/analyze-data/export/raw-data',
};

/**
 * Request sa cielene drží pod 3 MB.
 * 2.75 MB ponecháva rezervu pre proxy a serverless platformu.
 */
const TARGET_PAYLOAD_MB = 2.75;
const HARD_PAYLOAD_MB = 2.95;

const DUPLICATE_OR_BINARY_KEYS = new Set([
  'result',
  'analysisResult',
  'data',

  'base64',
  'fileBase64',
  'contentBase64',
  'rawFileBase64',
  'xlsxBase64',
  'originalFileBase64',
  'binary',
  'buffer',

  'chatHistory',
  'chat_history',
  'history',
  'messages',

  'file',
  'files',
  'attachment',
  'attachments',
]);

const RAW_DATA_KEYS = new Set([
  'rawData',
  'rawRows',
  'cleanRows',
  'dataRows',
  'preparedRows',
  'records',
  'rows',
  'rawDataSheet',
]);

const ARRAY_LIMITS: Record<string, number> = {
  warnings: 50,
  qualityReport: 150,
  frequencies: 300,
  itemDescriptives: 300,
  scaleDescriptives: 150,
  scaleScores: 150,
  normality: 150,
  reliability: 150,
  correlations: 300,
  pearsonCorrelations: 300,
  spearmanCorrelations: 300,
  parametricGroupTests: 150,
  nonParametricGroupTests: 150,
  statisticalTests: 150,
  recommendedTests: 150,
  selectedAnalyses: 100,
  scaleDefinitions: 120,
  subscaleDefinitions: 120,
};

const COMPACT_PROFILES: CompactProfile[] = [
  {
    maxDepth: 8,
    maxStringLength: 50_000,
    defaultArrayLimit: 350,
    includePreparedBase64: true,
  },
  {
    maxDepth: 7,
    maxStringLength: 25_000,
    defaultArrayLimit: 200,
    includePreparedBase64: false,
  },
  {
    maxDepth: 6,
    maxStringLength: 12_000,
    defaultArrayLimit: 100,
    includePreparedBase64: false,
  },
  {
    maxDepth: 5,
    maxStringLength: 6_000,
    defaultArrayLimit: 50,
    includePreparedBase64: false,
  },
  {
    maxDepth: 4,
    maxStringLength: 3_000,
    defaultArrayLimit: 25,
    includePreparedBase64: false,
  },
];

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getNestedValue(source: unknown, path: string[]): unknown {
  let current = source;

  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }

  return current;
}

function getPreparedDataFileFromResult(
  result: AnalysisResult | null,
): PreparedDataFileLike {
  const raw: JsonObject = isRecord(result) ? result : {};

  const candidates = [
    raw.preparedDataFile,
    raw.preparedFileData,
    raw.preparedFile,
    raw.preparedDatasetFile,
    getNestedValue(raw, ['statisticalAnalysis', 'preparedDataFile']),
    getNestedValue(raw, ['analysisResult', 'preparedDataFile']),
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;

    const useful =
      typeof candidate.preparedFileId === 'string' ||
      typeof candidate.fileId === 'string' ||
      typeof candidate.storageKey === 'string' ||
      typeof candidate.fileName === 'string' ||
      typeof candidate.base64 === 'string' ||
      typeof candidate.mimeType === 'string';

    if (useful) {
      return candidate as PreparedDataFileLike;
    }
  }

  return null;
}

function getPreparedFileId(
  result: AnalysisResult | null,
  preparedDataFile: PreparedDataFileLike,
): string {
  const raw = isRecord(result) ? result : {};

  const candidates = [
    preparedDataFile?.preparedFileId,
    preparedDataFile?.fileId,
    preparedDataFile?.storageKey,
    raw.preparedFileId,
    raw.fileId,
    raw.storageKey,
    getNestedValue(raw, ['preparedDataFile', 'preparedFileId']),
    getNestedValue(raw, ['preparedFile', 'preparedFileId']),
    getNestedValue(raw, ['statisticalAnalysis', 'preparedFileId']),
  ];

  for (const candidate of candidates) {
    const text = String(candidate ?? '').trim();
    if (text) return text;
  }

  return '';
}

function getJsonSizeMb(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size / 1024 / 1024;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function compactValue(
  value: unknown,
  profile: CompactProfile,
  currentKey = '',
  depth = 0,
): unknown {
  if (value === null || value === undefined) return value;

  if (depth > profile.maxDepth) {
    return '[removed-depth-limit]';
  }

  if (typeof value === 'string') {
    if (value.length <= profile.maxStringLength) return value;

    return `${value.slice(0, profile.maxStringLength)}… [truncated:${value.length}]`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    const configuredLimit = ARRAY_LIMITS[currentKey];
    const limit = Math.min(
      configuredLimit ?? profile.defaultArrayLimit,
      profile.defaultArrayLimit,
    );

    return value
      .slice(0, limit)
      .map((item) =>
        compactValue(item, profile, currentKey, depth + 1),
      );
  }

  if (!isRecord(value)) return String(value);

  const output: JsonObject = {};

  Object.entries(value).forEach(([key, child]) => {
    if (DUPLICATE_OR_BINARY_KEYS.has(key)) {
      output[`${key}Removed`] = true;

      if (typeof child === 'string') {
        output[`${key}Length`] = child.length;
      } else if (Array.isArray(child)) {
        output[`${key}Count`] = child.length;
      }

      return;
    }

    if (RAW_DATA_KEYS.has(key)) {
      output[`${key}Removed`] = true;
      output[`${key}Count`] = Array.isArray(child)
        ? child.length
        : 0;
      return;
    }

    output[key] = compactValue(
      child,
      profile,
      key,
      depth + 1,
    );
  });

  return output;
}

function createPreparedFileReference(
  preparedDataFile: PreparedDataFileLike,
  preparedFileId: string,
  includeBase64: boolean,
): ExportPayload['preparedDataFile'] {
  if (!preparedDataFile && !preparedFileId) return null;

  const reference: NonNullable<ExportPayload['preparedDataFile']> = {
    preparedFileId: preparedFileId || undefined,
    fileId: preparedDataFile?.fileId,
    storageKey: preparedDataFile?.storageKey,
    fileName: preparedDataFile?.fileName,
    mimeType: preparedDataFile?.mimeType,
    rows: preparedDataFile?.rows,
    columns: preparedDataFile?.columns,
    warnings: safeArray<string>(
      preparedDataFile?.warnings,
    ).slice(0, 50),
    sheets: safeArray<string>(
      preparedDataFile?.sheets,
    ).slice(0, 50),
    qualityReport: safeArray(
      preparedDataFile?.qualityReport,
    ).slice(0, 150),
  };

  if (
    includeBase64 &&
    typeof preparedDataFile?.base64 === 'string' &&
    preparedDataFile.base64.length > 0
  ) {
    reference.base64 = preparedDataFile.base64;
  }

  return reference;
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function getBaseFileName(format: ApiExportFormat): string {
  const timestamp = getTimestamp();

  if (format === 'excel') {
    return `ZEDPERA_export_analyzy_dat_${timestamp}`;
  }

  if (format === 'raw') {
    return `ZEDPERA_raw_data_${timestamp}`;
  }

  return `ZEDPERA_vysledky_analyzy_dat_${timestamp}`;
}

function getFallbackFileName(
  format: ApiExportFormat,
  contentType = '',
): string {
  const base = getBaseFileName(format);

  if (contentType.includes('application/pdf')) {
    return `${base}.pdf`;
  }

  if (contentType.includes('json')) {
    return `${base}.json`;
  }

  if (contentType.includes('html')) {
    return `${base}.html`;
  }

  if (format === 'word') return `${base}.doc`;
  if (format === 'pdf') return `${base}.pdf`;

  return `${base}.xlsx`;
}

function buildBasePayload(
  format: ApiExportFormat,
): Pick<
  ExportPayload,
  | 'fileName'
  | 'source'
  | 'payloadVersion'
  | 'maxChartsPerSection'
  | 'clientSideBuild'
> {
  return {
    fileName: getBaseFileName(format),
    source: `AnalysisResultsModal.${format}`,
    payloadVersion: '3.0',
    maxChartsPerSection: 1,
    clientSideBuild: false,
  };
}

function buildPayloadCandidate(params: {
  result: AnalysisResult;
  preparedDataFile: PreparedDataFileLike;
  format: ApiExportFormat;
  profile: CompactProfile;
}): ExportPayload {
  const preparedFileId = getPreparedFileId(
    params.result,
    params.preparedDataFile,
  );

  const base = buildBasePayload(params.format);

  if (preparedFileId) {
    return {
      ...base,
      preparedFileId,
      preparedDataFile: createPreparedFileReference(
        params.preparedDataFile,
        preparedFileId,
        false,
      ),
      exportMode: 'prepared-file-id',
    };
  }

  const preparedReference = createPreparedFileReference(
    params.preparedDataFile,
    '',
    params.profile.includePreparedBase64,
  );

  return {
    ...base,
    analysisResult: compactValue(
      params.result,
      params.profile,
    ),
    preparedDataFile: preparedReference,
    exportMode:
      preparedReference?.base64
        ? 'compact-analysis-with-file'
        : 'compact-analysis-result',
  };
}

function buildPayloadUnderLimit(params: {
  result: AnalysisResult;
  preparedDataFile: PreparedDataFileLike;
  format: ApiExportFormat;
}): ExportPayload {
  for (const profile of COMPACT_PROFILES) {
    const candidate = buildPayloadCandidate({
      ...params,
      profile,
    });

    const sizeMb = getJsonSizeMb(candidate);

    if (
      Number.isFinite(sizeMb) &&
      sizeMb <= TARGET_PAYLOAD_MB
    ) {
      return candidate;
    }
  }

  const raw = isRecord(params.result)
    ? params.result
    : {};

  const minimalResult = {
    meta: raw.meta,
    title: raw.title,
    summary: raw.summary,
    practicalText: raw.practicalText,
    interpretation: raw.interpretation,
    warnings: safeArray(raw.warnings).slice(0, 30),
    analysisConfig: raw.analysisConfig,
    manualAnalysisConfig: raw.manualAnalysisConfig,
    questionnaireConfig: raw.questionnaireConfig,
    scaleDefinitions: safeArray(
      raw.scaleDefinitions,
    ).slice(0, 80),
    subscaleDefinitions: safeArray(
      raw.subscaleDefinitions,
    ).slice(0, 80),
    statisticalAnalysis: compactValue(
      raw.statisticalAnalysis,
      {
        maxDepth: 4,
        maxStringLength: 2_000,
        defaultArrayLimit: 20,
        includePreparedBase64: false,
      },
      'statisticalAnalysis',
    ),
  };

  return {
    ...buildBasePayload(params.format),
    analysisResult: minimalResult,
    preparedDataFile: createPreparedFileReference(
      params.preparedDataFile,
      '',
      false,
    ),
    exportMode: 'compact-analysis-result',
  };
}

function getFileNameFromContentDisposition(
  contentDisposition: string | null,
  fallbackFileName: string,
): string {
  if (!contentDisposition) return fallbackFileName;

  const utf8Match =
    contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(
        utf8Match[1].replace(/"/g, '').trim(),
      );
    } catch {
      return (
        utf8Match[1].replace(/"/g, '').trim() ||
        fallbackFileName
      );
    }
  }

  const fileNameMatch =
    contentDisposition.match(/filename="?([^";]+)"?/i);

  return fileNameMatch?.[1]?.trim() || fallbackFileName;
}

function downloadBlob(
  blob: Blob,
  fileName: string,
): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function ExportButton({
  format,
  label,
  icon,
  exporting,
  onClick,
}: {
  format: ApiExportFormat;
  label: string;
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
      className="group relative flex min-h-[138px] w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.075] to-white/[0.025] px-6 py-7 text-center shadow-[0_20px_50px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-blue-300/45 hover:bg-white/[0.095] hover:shadow-[0_24px_65px_rgba(37,99,235,0.18)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
    >
      <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/60 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-200/15 bg-blue-500/10 text-blue-100 shadow-inner">
        {active ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          icon
        )}
      </span>

      <span className="text-lg font-black tracking-[0.12em] text-white">
        {label}
      </span>
    </button>
  );
}

export default function AnalysisResultsModal({
  open,
  result,
  onClose,
  preparedDataFile:
    preparedDataFileFromProps = null,
}: Props) {
  const [exporting, setExporting] =
    useState<ApiExportFormat | null>(null);

  const [error, setError] = useState('');

  const preparedDataFile = useMemo(
    () =>
      preparedDataFileFromProps ||
      getPreparedDataFileFromResult(result),
    [preparedDataFileFromProps, result],
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [open, onClose]);

  async function exportViaApiRoute(
    format: ApiExportFormat,
  ) {
    if (!result || exporting) return;

    setError('');
    setExporting(format);

    try {
      const endpoint = EXPORT_ENDPOINTS[format];

      const payload = buildPayloadUnderLimit({
        result,
        preparedDataFile,
        format,
      });

      const payloadSizeMb = getJsonSizeMb(payload);

      if (
        !Number.isFinite(payloadSizeMb) ||
        payloadSizeMb > HARD_PAYLOAD_MB
      ) {
        setError(
          'Exportné dáta sa nepodarilo bezpečne zmenšiť pod 3 MB. ' +
            'Pre úplný export veľkej databázy musí /api/analyze-data/prepare ' +
            'vrátiť preparedFileId.',
        );
        return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zedpera-Export-Source':
            `analysis-results-modal-${format}`,
          'X-Zedpera-Export-Mode':
            payload.exportMode,
          'X-Zedpera-Payload-MB':
            payloadSizeMb.toFixed(3),
          'X-Zedpera-Max-Charts': '1',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const contentType =
          response.headers.get('content-type') || '';

        let message = '';

        if (contentType.includes('application/json')) {
          const body = await response
            .json()
            .catch(() => null);

          if (isRecord(body)) {
            message = String(
              body.error ||
                body.message ||
                JSON.stringify(body),
            );
          } else {
            message = JSON.stringify(body);
          }
        } else {
          message = await response.text();
        }

        setError(
          message ||
            `Export sa nepodarilo vytvoriť. HTTP ${response.status}.`,
        );
        return;
      }

      const contentType =
        response.headers.get('content-type') || '';

      const blob = await response.blob();

      if (!blob.size) {
        setError(
          'Exportné API vrátilo prázdny súbor.',
        );
        return;
      }

      const fileName =
        getFileNameFromContentDisposition(
          response.headers.get(
            'content-disposition',
          ),
          getFallbackFileName(
            format,
            contentType,
          ),
        );

      downloadBlob(blob, fileName);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'Export sa nepodarilo vytvoriť.',
      );
    } finally {
      setExporting(null);
    }
  }

  if (!open || !result) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 text-white backdrop-blur-md">
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
        aria-label="Zavrieť exportný modal"
      />

      <div className="relative w-full max-w-4xl overflow-hidden rounded-[30px] border border-white/10 bg-[#070b17] shadow-[0_35px_100px_rgba(0,0,0,0.62)]">
        <header className="flex items-center justify-between gap-6 border-b border-white/10 bg-[#0a0f20] px-6 py-5 sm:px-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-200">
              ZEDPERA EXPORT
            </p>

            <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
              Export výsledkov analýzy
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:border-white/20 hover:bg-white/[0.09]"
            aria-label="Zavrieť"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <ExportButton
              format="word"
              label="WORD"
              icon={<FileText className="h-6 w-6" />}
              exporting={exporting}
              onClick={exportViaApiRoute}
            />

            <ExportButton
              format="excel"
              label="EXCEL"
              icon={
                <FileSpreadsheet className="h-6 w-6" />
              }
              exporting={exporting}
              onClick={exportViaApiRoute}
            />

            <ExportButton
              format="pdf"
              label="PDF"
              icon={<Download className="h-6 w-6" />}
              exporting={exporting}
              onClick={exportViaApiRoute}
            />

            <ExportButton
              format="raw"
              label="RAW DATA"
              icon={
                <FileSpreadsheet className="h-6 w-6" />
              }
              exporting={exporting}
              onClick={exportViaApiRoute}
            />
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">
              {error}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
