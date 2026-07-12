'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Loader2,
  PieChart,
  ShieldCheck,
  Table2,
  TrendingUp,
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




type SupportedLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';
type ChartKind = 'bar' | 'pie';

const UI_TEXT: Record<SupportedLanguage, Record<string, string>> = {
  sk: {
    analysis: 'Analýza', resultsTitle: 'Výsledky analýzy',
    resultsSubtitle: 'Profesionálny Canvas výsledkov a samostatné exportné API.',
    resultsAndCharts: 'VÝSLEDKY A ANALÝZY', export: 'EXPORT',
    canvas: 'Analytický Canvas', dataResults: 'Výsledky analýzy dát',
    ready: 'Analýza pripravená', respondents: 'Respondenti',
    respondentsDesc: 'Počet analyzovaných záznamov.', variables: 'Premenné',
    variablesDesc: 'Počet dostupných dátových premenných.', scales: 'Škály a subškály',
    scalesDesc: 'Rozpoznané a vypočítané konštrukty.', warnings: 'Upozornenia',
    warningsDesc: 'Odporúča sa kontrola kvality dát.', noWarnings: 'Bez evidovaných upozornení.',
    section: 'Výsledková sekcia', records: 'záznamov', overview: 'Grafický prehľad',
    topResults: 'Top numerické výsledky sekcie', details: 'Detailné výsledky',
    tablePreview: 'Tabuľkový náhľad analytických výstupov',
    noNumeric: 'Pre túto sekciu nie sú dostupné numerické údaje na vytvorenie grafu.',
    noTable: 'Pre túto sekciu nie sú dostupné tabuľkové údaje.',
    shown: 'Zobrazených prvých', of: 'z', rows: 'riadkov',
    noResults: 'Výsledky zatiaľ nie sú dostupné',
    noResultsDesc: 'Výsledkový objekt neobsahuje rozpoznané tabuľkové sekcie. Skontrolujte odpoveď analytického API.',
    exportResults: 'Export výsledkov', chooseFormat: 'Vyberte výstupný formát',
    endpoint: 'Každý formát používa vlastný samostatný API endpoint.', close: 'Zavrieť',
    defaultSummary: 'Analýza bola spracovaná. V jednotlivých sekciách sú dostupné tabuľkové výsledky a profesionálne vizualizácie.',
    bar: 'Stĺpcový graf', pie: 'Koláčový graf', chartType: 'Typ grafu',
    descriptives: 'Deskriptívna štatistika', reliability: 'Reliabilita škál',
    normality: 'Normalita dát', correlations: 'Korelácie',
    parametric: 'Parametrické testy', nonParametric: 'Neparametrické testy',
    frequencies: 'Frekvenčné tabuľky', scaleSection: 'Škály a subškály',
    exportTooLarge: 'Exportné dáta sa nepodarilo bezpečne zmenšiť pod 3 MB. Pre úplný export veľkej databázy musí /api/analyze-data/prepare vrátiť preparedFileId.',
    emptyExport: 'Exportné API vrátilo prázdny súbor.', exportFailed: 'Export sa nepodarilo vytvoriť.'
  },
  cs: {
    analysis: 'Analýza', resultsTitle: 'Výsledky analýzy',
    resultsSubtitle: 'Profesionální Canvas výsledků a samostatná exportní API.',
    resultsAndCharts: 'VÝSLEDKY A ANALÝZY', export: 'EXPORT',
    canvas: 'Analytický Canvas', dataResults: 'Výsledky analýzy dat',
    ready: 'Analýza připravena', respondents: 'Respondenti',
    respondentsDesc: 'Počet analyzovaných záznamů.', variables: 'Proměnné',
    variablesDesc: 'Počet dostupných datových proměnných.', scales: 'Škály a subškály',
    scalesDesc: 'Rozpoznané a vypočtené konstrukty.', warnings: 'Upozornění',
    warningsDesc: 'Doporučuje se kontrola kvality dat.', noWarnings: 'Bez evidovaných upozornění.',
    section: 'Výsledková sekce', records: 'záznamů', overview: 'Grafický přehled',
    topResults: 'Hlavní numerické výsledky sekce', details: 'Detailní výsledky',
    tablePreview: 'Tabulkový náhled analytických výstupů',
    noNumeric: 'Pro tuto sekci nejsou dostupné numerické údaje pro vytvoření grafu.',
    noTable: 'Pro tuto sekci nejsou dostupné tabulkové údaje.',
    shown: 'Zobrazeno prvních', of: 'z', rows: 'řádků',
    noResults: 'Výsledky zatím nejsou dostupné',
    noResultsDesc: 'Výsledkový objekt neobsahuje rozpoznané tabulkové sekce. Zkontrolujte odpověď analytického API.',
    exportResults: 'Export výsledků', chooseFormat: 'Vyberte výstupní formát',
    endpoint: 'Každý formát používá vlastní samostatný API endpoint.', close: 'Zavřít',
    defaultSummary: 'Analýza byla zpracována. V jednotlivých sekcích jsou dostupné tabulkové výsledky a profesionální vizualizace.',
    bar: 'Sloupcový graf', pie: 'Koláčový graf', chartType: 'Typ grafu',
    descriptives: 'Deskriptivní statistika', reliability: 'Reliabilita škál',
    normality: 'Normalita dat', correlations: 'Korelace',
    parametric: 'Parametrické testy', nonParametric: 'Neparametrické testy',
    frequencies: 'Frekvenční tabulky', scaleSection: 'Škály a subškály',
    exportTooLarge: 'Exportní data se nepodařilo bezpečně zmenšit pod 3 MB. Pro úplný export velké databáze musí /api/analyze-data/prepare vrátit preparedFileId.',
    emptyExport: 'Exportní API vrátilo prázdný soubor.', exportFailed: 'Export se nepodařilo vytvořit.'
  },
  en: {
    analysis: 'Analysis', resultsTitle: 'Analysis results',
    resultsSubtitle: 'Professional results Canvas with separate export APIs.',
    resultsAndCharts: 'RESULTS AND ANALYSIS', export: 'EXPORT',
    canvas: 'Analysis Canvas', dataResults: 'Data analysis results',
    ready: 'Analysis ready', respondents: 'Respondents',
    respondentsDesc: 'Number of analysed records.', variables: 'Variables',
    variablesDesc: 'Number of available data variables.', scales: 'Scales and subscales',
    scalesDesc: 'Detected and calculated constructs.', warnings: 'Warnings',
    warningsDesc: 'A data-quality review is recommended.', noWarnings: 'No recorded warnings.',
    section: 'Results section', records: 'records', overview: 'Visual overview',
    topResults: 'Top numeric results in this section', details: 'Detailed results',
    tablePreview: 'Tabular preview of analytical outputs',
    noNumeric: 'No numeric data are available for a chart in this section.',
    noTable: 'No tabular data are available for this section.',
    shown: 'Showing the first', of: 'of', rows: 'rows',
    noResults: 'Results are not available yet',
    noResultsDesc: 'The result object does not contain recognised table sections. Check the analytical API response.',
    exportResults: 'Export results', chooseFormat: 'Choose an output format',
    endpoint: 'Each format uses its own separate API endpoint.', close: 'Close',
    defaultSummary: 'The analysis has been processed. Each section contains tabular results and professional visualisations.',
    bar: 'Bar chart', pie: 'Pie chart', chartType: 'Chart type',
    descriptives: 'Descriptive statistics', reliability: 'Scale reliability',
    normality: 'Data normality', correlations: 'Correlations',
    parametric: 'Parametric tests', nonParametric: 'Non-parametric tests',
    frequencies: 'Frequency tables', scaleSection: 'Scales and subscales',
    exportTooLarge: 'The export data could not be safely reduced below 3 MB. For a complete export of a large dataset, /api/analyze-data/prepare must return preparedFileId.',
    emptyExport: 'The export API returned an empty file.', exportFailed: 'The export could not be created.'
  },
  de: {
    analysis: 'Analyse', resultsTitle: 'Analyseergebnisse',
    resultsSubtitle: 'Professioneller Ergebnis-Canvas mit separaten Export-APIs.',
    resultsAndCharts: 'ERGEBNISSE UND ANALYSE', export: 'EXPORT',
    canvas: 'Analyse-Canvas', dataResults: 'Ergebnisse der Datenanalyse',
    ready: 'Analyse abgeschlossen', respondents: 'Befragte',
    respondentsDesc: 'Anzahl der analysierten Datensätze.', variables: 'Variablen',
    variablesDesc: 'Anzahl der verfügbaren Datenvariablen.', scales: 'Skalen und Subskalen',
    scalesDesc: 'Erkannte und berechnete Konstrukte.', warnings: 'Warnungen',
    warningsDesc: 'Eine Prüfung der Datenqualität wird empfohlen.', noWarnings: 'Keine Warnungen erfasst.',
    section: 'Ergebnisbereich', records: 'Einträge', overview: 'Grafische Übersicht',
    topResults: 'Wichtigste numerische Ergebnisse', details: 'Detaillierte Ergebnisse',
    tablePreview: 'Tabellarische Vorschau der Analyseergebnisse',
    noNumeric: 'Für diesen Bereich sind keine numerischen Daten für ein Diagramm verfügbar.',
    noTable: 'Für diesen Bereich sind keine Tabellendaten verfügbar.',
    shown: 'Angezeigt werden die ersten', of: 'von', rows: 'Zeilen',
    noResults: 'Noch keine Ergebnisse verfügbar',
    noResultsDesc: 'Das Ergebnisobjekt enthält keine erkannten Tabellenbereiche. Prüfen Sie die Antwort der Analyse-API.',
    exportResults: 'Ergebnisse exportieren', chooseFormat: 'Ausgabeformat auswählen',
    endpoint: 'Jedes Format verwendet einen eigenen API-Endpunkt.', close: 'Schließen',
    defaultSummary: 'Die Analyse wurde verarbeitet. In den einzelnen Bereichen stehen tabellarische Ergebnisse und professionelle Visualisierungen zur Verfügung.',
    bar: 'Balkendiagramm', pie: 'Kreisdiagramm', chartType: 'Diagrammtyp',
    descriptives: 'Deskriptive Statistik', reliability: 'Reliabilität der Skalen',
    normality: 'Normalverteilung', correlations: 'Korrelationen',
    parametric: 'Parametrische Tests', nonParametric: 'Nichtparametrische Tests',
    frequencies: 'Häufigkeitstabellen', scaleSection: 'Skalen und Subskalen',
    exportTooLarge: 'Die Exportdaten konnten nicht sicher auf unter 3 MB reduziert werden. Für den vollständigen Export großer Datensätze muss /api/analyze-data/prepare preparedFileId zurückgeben.',
    emptyExport: 'Die Export-API hat eine leere Datei zurückgegeben.', exportFailed: 'Der Export konnte nicht erstellt werden.'
  },
  pl: {
    analysis: 'Analiza', resultsTitle: 'Wyniki analizy',
    resultsSubtitle: 'Profesjonalny Canvas wyników z oddzielnymi interfejsami API eksportu.',
    resultsAndCharts: 'WYNIKI I ANALIZA', export: 'EKSPORT',
    canvas: 'Canvas analityczny', dataResults: 'Wyniki analizy danych',
    ready: 'Analiza gotowa', respondents: 'Respondenci',
    respondentsDesc: 'Liczba analizowanych rekordów.', variables: 'Zmienne',
    variablesDesc: 'Liczba dostępnych zmiennych danych.', scales: 'Skale i podskale',
    scalesDesc: 'Rozpoznane i obliczone konstrukty.', warnings: 'Ostrzeżenia',
    warningsDesc: 'Zalecana jest kontrola jakości danych.', noWarnings: 'Brak zarejestrowanych ostrzeżeń.',
    section: 'Sekcja wyników', records: 'rekordów', overview: 'Przegląd graficzny',
    topResults: 'Najważniejsze wyniki liczbowe sekcji', details: 'Szczegółowe wyniki',
    tablePreview: 'Tabelaryczny podgląd wyników analitycznych',
    noNumeric: 'Brak danych liczbowych do utworzenia wykresu w tej sekcji.',
    noTable: 'Brak danych tabelarycznych dla tej sekcji.',
    shown: 'Wyświetlono pierwsze', of: 'z', rows: 'wierszy',
    noResults: 'Wyniki nie są jeszcze dostępne',
    noResultsDesc: 'Obiekt wyników nie zawiera rozpoznanych sekcji tabel. Sprawdź odpowiedź analitycznego API.',
    exportResults: 'Eksport wyników', chooseFormat: 'Wybierz format wyjściowy',
    endpoint: 'Każdy format korzysta z własnego punktu API.', close: 'Zamknij',
    defaultSummary: 'Analiza została przetworzona. W sekcjach dostępne są wyniki tabelaryczne i profesjonalne wizualizacje.',
    bar: 'Wykres słupkowy', pie: 'Wykres kołowy', chartType: 'Typ wykresu',
    descriptives: 'Statystyka opisowa', reliability: 'Rzetelność skal',
    normality: 'Normalność danych', correlations: 'Korelacje',
    parametric: 'Testy parametryczne', nonParametric: 'Testy nieparametryczne',
    frequencies: 'Tabele częstości', scaleSection: 'Skale i podskale',
    exportTooLarge: 'Nie udało się bezpiecznie zmniejszyć danych eksportu poniżej 3 MB. Dla pełnego eksportu dużej bazy /api/analyze-data/prepare musi zwracać preparedFileId.',
    emptyExport: 'API eksportu zwróciło pusty plik.', exportFailed: 'Nie udało się utworzyć eksportu.'
  },
  hu: {
    analysis: 'Elemzés', resultsTitle: 'Az elemzés eredményei',
    resultsSubtitle: 'Professzionális eredmény-Canvas külön export API-kkal.',
    resultsAndCharts: 'EREDMÉNYEK ÉS ELEMZÉS', export: 'EXPORT',
    canvas: 'Elemzési Canvas', dataResults: 'Az adatelemzés eredményei',
    ready: 'Az elemzés elkészült', respondents: 'Válaszadók',
    respondentsDesc: 'Az elemzett rekordok száma.', variables: 'Változók',
    variablesDesc: 'Az elérhető adatváltozók száma.', scales: 'Skálák és alskálák',
    scalesDesc: 'Felismerett és kiszámított konstruktumok.', warnings: 'Figyelmeztetések',
    warningsDesc: 'Az adatminőség ellenőrzése javasolt.', noWarnings: 'Nincs rögzített figyelmeztetés.',
    section: 'Eredményszakasz', records: 'rekord', overview: 'Grafikus áttekintés',
    topResults: 'A szakasz legfontosabb numerikus eredményei', details: 'Részletes eredmények',
    tablePreview: 'Az elemzési kimenetek táblázatos előnézete',
    noNumeric: 'Ehhez a szakaszhoz nem áll rendelkezésre numerikus adat diagram készítéséhez.',
    noTable: 'Ehhez a szakaszhoz nem áll rendelkezésre táblázatos adat.',
    shown: 'Az első', of: 'a(z)', rows: 'sorból',
    noResults: 'Az eredmények még nem érhetők el',
    noResultsDesc: 'Az eredményobjektum nem tartalmaz felismert táblázatos szakaszokat. Ellenőrizze az elemzési API válaszát.',
    exportResults: 'Eredmények exportálása', chooseFormat: 'Válasszon kimeneti formátumot',
    endpoint: 'Minden formátum külön API-végpontot használ.', close: 'Bezárás',
    defaultSummary: 'Az elemzés feldolgozása megtörtént. Az egyes szakaszok táblázatos eredményeket és professzionális vizualizációkat tartalmaznak.',
    bar: 'Oszlopdiagram', pie: 'Kördiagram', chartType: 'Diagramtípus',
    descriptives: 'Leíró statisztika', reliability: 'Skálák megbízhatósága',
    normality: 'Az adatok normalitása', correlations: 'Korrelációk',
    parametric: 'Parametrikus tesztek', nonParametric: 'Nemparametrikus tesztek',
    frequencies: 'Gyakorisági táblák', scaleSection: 'Skálák és alskálák',
    exportTooLarge: 'Az exportadatokat nem sikerült biztonságosan 3 MB alá csökkenteni. Nagy adatbázis teljes exportjához az /api/analyze-data/prepare végpontnak preparedFileId értéket kell visszaadnia.',
    emptyExport: 'Az export API üres fájlt adott vissza.', exportFailed: 'Az export létrehozása nem sikerült.'
  },
};


const SECTION_DESCRIPTIONS: Record<
  SupportedLanguage,
  Record<string, string>
> = {
  sk: {
    descriptives: 'Priemery, mediány, variabilita a rozsah vypočítaných škál a subškál.',
    reliability: 'Cronbachovo alfa a kvalita vnútornej konzistencie jednotlivých škál a subškál.',
    normality: 'Kontrola predpokladov pre výber parametrických a neparametrických testov.',
    correlations: 'Vzťahy medzi škálami, subškálami a ďalšími analyzovanými premennými.',
    parametric: 'Výsledky t-testov a ANOVA vrátane testových štatistík a p-hodnôt.',
    nonParametric: 'Výsledky Mann-Whitneyho a Kruskal-Wallisovho testu.',
    frequencies: 'Početnosti a percentuálne zastúpenie odpovedí v jednotlivých kategóriách.',
    scales: 'Prehľad definícií, skórovania a vypočítaných výsledkov škál a subškál.',
  },
  cs: {
    descriptives: 'Průměry, mediány, variabilita a rozsah vypočtených škál a subškál.',
    reliability: 'Cronbachovo alfa a kvalita vnitřní konzistence jednotlivých škál a subškál.',
    normality: 'Kontrola předpokladů pro výběr parametrických a neparametrických testů.',
    correlations: 'Vztahy mezi škálami, subškálami a dalšími analyzovanými proměnnými.',
    parametric: 'Výsledky t-testů a ANOVA včetně testových statistik a p-hodnot.',
    nonParametric: 'Výsledky Mann-Whitneyho a Kruskal-Wallisova testu.',
    frequencies: 'Četnosti a procentuální zastoupení odpovědí v jednotlivých kategoriích.',
    scales: 'Přehled definic, skórování a vypočtených výsledků škál a subškál.',
  },
  en: {
    descriptives: 'Means, medians, variability and range of calculated scales and subscales.',
    reliability: 'Cronbach’s alpha and internal-consistency quality for individual scales and subscales.',
    normality: 'Assumption checks for selecting parametric and non-parametric tests.',
    correlations: 'Relationships between scales, subscales and other analysed variables.',
    parametric: 't-test and ANOVA results, including test statistics and p-values.',
    nonParametric: 'Mann–Whitney and Kruskal–Wallis test results.',
    frequencies: 'Counts and percentage distribution of responses across categories.',
    scales: 'Overview of definitions, scoring and calculated scale and subscale results.',
  },
  de: {
    descriptives: 'Mittelwerte, Mediane, Streuung und Spannweite der berechneten Skalen und Subskalen.',
    reliability: 'Cronbachs Alpha und interne Konsistenz der einzelnen Skalen und Subskalen.',
    normality: 'Prüfung der Voraussetzungen für parametrische und nichtparametrische Tests.',
    correlations: 'Zusammenhänge zwischen Skalen, Subskalen und weiteren analysierten Variablen.',
    parametric: 'Ergebnisse von t-Tests und ANOVA einschließlich Teststatistik und p-Werten.',
    nonParametric: 'Ergebnisse der Mann-Whitney- und Kruskal-Wallis-Tests.',
    frequencies: 'Anzahlen und prozentuale Verteilung der Antworten in den Kategorien.',
    scales: 'Übersicht über Definitionen, Bewertung und berechnete Ergebnisse.',
  },
  pl: {
    descriptives: 'Średnie, mediany, zmienność i zakres obliczonych skal i podskal.',
    reliability: 'Alfa Cronbacha i spójność wewnętrzna poszczególnych skal i podskal.',
    normality: 'Kontrola założeń przy wyborze testów parametrycznych i nieparametrycznych.',
    correlations: 'Zależności między skalami, podskalami i innymi analizowanymi zmiennymi.',
    parametric: 'Wyniki testów t i ANOVA wraz ze statystykami i wartościami p.',
    nonParametric: 'Wyniki testów Manna–Whitneya i Kruskala–Wallisa.',
    frequencies: 'Liczebności i procentowy rozkład odpowiedzi w kategoriach.',
    scales: 'Przegląd definicji, punktacji i obliczonych wyników skal i podskal.',
  },
  hu: {
    descriptives: 'A kiszámított skálák és alskálák átlagai, mediánjai, változékonysága és tartománya.',
    reliability: 'Cronbach-alfa és az egyes skálák, alskálák belső konzisztenciája.',
    normality: 'A parametrikus és nemparametrikus tesztek feltételeinek ellenőrzése.',
    correlations: 'Kapcsolatok a skálák, alskálák és más elemzett változók között.',
    parametric: 't-próbák és ANOVA eredményei tesztstatisztikákkal és p-értékekkel.',
    nonParametric: 'Mann–Whitney- és Kruskal–Wallis-tesztek eredményei.',
    frequencies: 'A válaszok darabszáma és százalékos megoszlása kategóriánként.',
    scales: 'A definíciók, pontozás és kiszámított skálaeredmények áttekintése.',
  },
};

function sectionDescription(
  language: SupportedLanguage,
  key: string,
): string {
  return (
    SECTION_DESCRIPTIONS[language]?.[key] ??
    SECTION_DESCRIPTIONS.sk[key] ??
    ''
  );
}

function normalizeLanguageCode(value: unknown): SupportedLanguage {
  const code = String(value ?? '').trim().toLowerCase().replace('_', '-').split('-')[0];
  if (code === 'cz') return 'cs';
  return ['sk', 'cs', 'en', 'de', 'pl', 'hu'].includes(code)
    ? (code as SupportedLanguage)
    : 'sk';
}

function detectPageLanguage(): SupportedLanguage {
  if (typeof document === 'undefined') return 'sk';
  if (document.documentElement.lang) {
    return normalizeLanguageCode(document.documentElement.lang);
  }

  for (const key of ['language', 'locale', 'appLanguage', 'selectedLanguage', 'zedpera_language', 'zedpera_locale']) {
    try {
      const value = localStorage.getItem(key);
      if (value) return normalizeLanguageCode(value);
    } catch {
      // Ignore inaccessible storage.
    }
  }

  return normalizeLanguageCode(navigator.language);
}

function usePageLanguage(): SupportedLanguage {
  const [language, setLanguage] = useState<SupportedLanguage>('sk');

  useEffect(() => {
    const update = () => setLanguage(detectPageLanguage());
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    });

    window.addEventListener('storage', update);
    window.addEventListener('languagechange', update);
    window.addEventListener('zedpera-language-change', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', update);
      window.removeEventListener('languagechange', update);
      window.removeEventListener('zedpera-language-change', update);
    };
  }, []);

  return language;
}

function tr(language: SupportedLanguage, key: string): string {
  return UI_TEXT[language]?.[key] ?? UI_TEXT.sk[key] ?? key;
}

function localeForLanguage(language: SupportedLanguage): string {
  return {
    sk: 'sk-SK',
    cs: 'cs-CZ',
    en: 'en-US',
    de: 'de-DE',
    pl: 'pl-PL',
    hu: 'hu-HU',
  }[language];
}

type ModalView = 'canvas' | 'export';

type CanvasMetric = {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
};

type CanvasTableSection = {
  id: string;
  title: string;
  description: string;
  rows: JsonObject[];
  chartLabelKey?: string;
  chartValueKeys?: string[];
};

type ChartPoint = {
  label: string;
  value: number;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');

  if (!normalized) return null;

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function formatCanvasValue(value: unknown, language: SupportedLanguage = 'sk'): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—';

    return value.toLocaleString(localeForLanguage(language), {
      maximumFractionDigits: Number.isInteger(value) ? 0 : 4,
    });
  }

  if (typeof value === 'boolean') {
    return value ? 'Áno' : 'Nie';
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 10)
      .map((item) => formatCanvasValue(item, language))
      .join(', ');
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .slice(0, 8)
      .map(([key, item]) => `${key}: ${formatCanvasValue(item, language)}`)
      .join('; ');
  }

  return String(value).trim() || '—';
}

function getFirstArrayByPaths(
  source: unknown,
  paths: string[][],
): JsonObject[] {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (!Array.isArray(value)) continue;

    const records = value.filter(isRecord);
    if (records.length > 0) {
      return records;
    }
  }

  return [];
}

function getFirstNumberByPaths(
  source: unknown,
  paths: string[][],
): number | null {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    const number = toFiniteNumber(value);
    if (number !== null) return number;
  }

  return null;
}

function getFirstTextByPaths(
  source: unknown,
  paths: string[][],
): string {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    const text = String(value ?? '').trim();
    if (text) return text;
  }

  return '';
}

function normalizeFrequencyRows(sourceRows: JsonObject[]): JsonObject[] {
  const rows: JsonObject[] = [];

  sourceRows.forEach((frequency) => {
    const values = [
      frequency.values,
      frequency.items,
      frequency.rows,
      frequency.data,
    ].find(Array.isArray);

    if (!Array.isArray(values)) {
      rows.push(frequency);
      return;
    }

    const variable = String(
      frequency.variable ??
        frequency.name ??
        frequency.premenna ??
        '',
    );

    values.filter(isRecord).forEach((item) => {
      rows.push({
        premenna: variable,
        hodnota:
          item.value ??
          item.label ??
          item.hodnota ??
          '',
        pocet:
          item.count ??
          item.pocet ??
          item.frequency ??
          '',
        percento:
          item.percent ??
          item.percentage ??
          item.percento ??
          '',
      });
    });
  });

  return rows;
}

function buildCanvasSections(
  result: AnalysisResult,
  language: SupportedLanguage,
): CanvasTableSection[] {
  const descriptives = getFirstArrayByPaths(result, [
    ['scaleDescriptives'],
    ['statisticalAnalysis', 'scaleDescriptives'],
    ['descriptiveStatistics'],
    ['statisticalAnalysis', 'descriptiveStatistics'],
    ['descriptives'],
  ]);

  const reliability = getFirstArrayByPaths(result, [
    ['reliability'],
    ['reliabilityAnalysis'],
    ['statisticalAnalysis', 'reliability'],
    ['statisticalAnalysis', 'reliabilityAnalysis'],
  ]);

  const normality = getFirstArrayByPaths(result, [
    ['normality'],
    ['statisticalAnalysis', 'normality'],
  ]);

  const correlations = getFirstArrayByPaths(result, [
    ['correlations', 'recommended'],
    ['correlations', 'pearson'],
    ['correlations'],
    ['statisticalAnalysis', 'correlations', 'recommended'],
    ['statisticalAnalysis', 'correlations', 'pearson'],
    ['statisticalAnalysis', 'correlations'],
  ]);

  const parametric = getFirstArrayByPaths(result, [
    ['parametricGroupTests'],
    ['groupTests', 'parametric'],
    ['statisticalAnalysis', 'parametricGroupTests'],
    ['statisticalAnalysis', 'groupTests', 'parametric'],
  ]);

  const nonParametric = getFirstArrayByPaths(result, [
    ['nonParametricGroupTests'],
    ['groupTests', 'nonParametric'],
    ['statisticalAnalysis', 'nonParametricGroupTests'],
    ['statisticalAnalysis', 'groupTests', 'nonParametric'],
  ]);

  const frequencies = normalizeFrequencyRows(
    getFirstArrayByPaths(result, [
      ['frequencies'],
      ['statisticalAnalysis', 'frequencies'],
    ]),
  );

  const scales = getFirstArrayByPaths(result, [
    ['scaleScores'],
    ['scaleDefinitions'],
    ['statisticalAnalysis', 'scaleScores'],
    ['statisticalAnalysis', 'scaleDefinitions'],
  ]);

  return [
    {
      id: 'descriptives',
      title: tr(language, 'descriptives'),
      description:
        sectionDescription(language, 'descriptives'),
      rows: descriptives,
      chartLabelKey: 'variable',
      chartValueKeys: ['mean', 'priemer'],
    },
    {
      id: 'reliability',
      title: tr(language, 'reliability'),
      description:
        sectionDescription(language, 'reliability'),
      rows: reliability,
      chartLabelKey: 'scaleName',
      chartValueKeys: ['cronbachAlpha', 'alpha', 'cronbach_alpha'],
    },
    {
      id: 'normality',
      title: tr(language, 'normality'),
      description:
        sectionDescription(language, 'normality'),
      rows: normality,
      chartLabelKey: 'variable',
      chartValueKeys: ['statistic', 'skewness'],
    },
    {
      id: 'correlations',
      title: tr(language, 'correlations'),
      description:
        sectionDescription(language, 'correlations'),
      rows: correlations,
      chartLabelKey: 'variableA',
      chartValueKeys: ['coefficient', 'r', 'rho', 'koeficient'],
    },
    {
      id: 'parametric',
      title: tr(language, 'parametric'),
      description:
        sectionDescription(language, 'parametric'),
      rows: parametric,
      chartLabelKey: 'test',
      chartValueKeys: ['statistic', 'statistika'],
    },
    {
      id: 'non-parametric',
      title: tr(language, 'nonParametric'),
      description:
        sectionDescription(language, 'nonParametric'),
      rows: nonParametric,
      chartLabelKey: 'test',
      chartValueKeys: ['statistic', 'statistika'],
    },
    {
      id: 'frequencies',
      title: tr(language, 'frequencies'),
      description:
        sectionDescription(language, 'frequencies'),
      rows: frequencies,
      chartLabelKey: 'hodnota',
      chartValueKeys: ['pocet', 'count'],
    },
    {
      id: 'scales',
      title: tr(language, 'scaleSection'),
      description:
        sectionDescription(language, 'scales'),
      rows: scales,
      chartLabelKey: 'name',
      chartValueKeys: ['mean', 'score'],
    },
  ].filter((section) => section.rows.length > 0);
}

function getRowLabel(
  row: JsonObject,
  preferredKey?: string,
): string {
  const candidates = [
    preferredKey ? row[preferredKey] : undefined,
    row.scaleName,
    row.scale,
    row.skala,
    row.variable,
    row.premenna,
    row.name,
    row.nazov,
    row.label,
    row.test,
    row.hodnota,
    row.value,
  ];

  for (const candidate of candidates) {
    const text = String(candidate ?? '').trim();
    if (text) return text;
  }

  return 'Výsledok';
}

function getRowNumericValue(
  row: JsonObject,
  preferredKeys: string[] = [],
): number | null {
  const keys = [
    ...preferredKeys,
    'mean',
    'priemer',
    'cronbachAlpha',
    'cronbach_alpha',
    'alpha',
    'coefficient',
    'koeficient',
    'r',
    'rho',
    'statistic',
    'statistika',
    'count',
    'pocet',
    'score',
  ];

  for (const key of keys) {
    const value = toFiniteNumber(row[key]);
    if (value !== null) return value;
  }

  return null;
}

function buildChartPoints(
  section: CanvasTableSection,
): ChartPoint[] {
  return section.rows
    .map((row) => ({
      label: getRowLabel(row, section.chartLabelKey),
      value: getRowNumericValue(
        row,
        section.chartValueKeys,
      ),
    }))
    .filter(
      (
        item,
      ): item is {
        label: string;
        value: number;
      } => item.value !== null,
    )
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 10);
}

function ProfessionalBarChart({
  points,
  language,
}: {
  points: ChartPoint[];
  language: SupportedLanguage;
}) {
  if (!points.length) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 text-center text-sm text-slate-500">
        {tr(language, 'noNumeric')}
      </div>
    );
  }

  const max = Math.max(
    ...points.map((point) => Math.abs(point.value)),
    1,
  );

  return (
    <div className="space-y-3">
      {points.map((point, index) => {
        const width = Math.max(
          (Math.abs(point.value) / max) * 100,
          2,
        );

        return (
          <div
            key={`${point.label}-${index}`}
            className="grid grid-cols-[minmax(120px,0.9fr)_minmax(180px,2fr)_80px] items-center gap-3"
          >
            <div
              className="truncate text-xs font-semibold text-slate-300"
              title={point.label}
            >
              {point.label}
            </div>

            <div className="h-8 overflow-hidden rounded-xl border border-white/10 bg-black/30 p-1">
              <div
                className="flex h-full items-center justify-end rounded-lg bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 px-2 shadow-[0_0_24px_rgba(34,211,238,0.22)] transition-all"
                style={{ width: `${width}%` }}
              >
                <span className="text-[10px] font-black text-white/90">
                  {index + 1}
                </span>
              </div>
            </div>

            <div className="text-right text-sm font-black tabular-nums text-white">
              {formatCanvasValue(point.value, language)}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function totalLabel(language: SupportedLanguage): string {
  return {
    sk: 'Spolu',
    cs: 'Celkem',
    en: 'Total',
    de: 'Gesamt',
    pl: 'Suma',
    hu: 'Összesen',
  }[language];
}

const PIE_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#0891b2',
  '#059669',
  '#d97706',
  '#e11d48',
  '#9333ea',
  '#0d9488',
];

function ProfessionalPieChart({
  points,
  language,
}: {
  points: ChartPoint[];
  language: SupportedLanguage;
}) {
  const positivePoints = points
    .map((point) => ({
      ...point,
      value: Math.abs(point.value),
    }))
    .filter((point) => point.value > 0)
    .slice(0, 8);

  if (!positivePoints.length) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 text-center text-sm text-slate-500">
        {tr(language, 'noNumeric')}
      </div>
    );
  }

  const total = positivePoints.reduce(
    (sum, point) => sum + point.value,
    0,
  );

  let cursor = 0;
  const stops = positivePoints.map((point, index) => {
    const start = (cursor / total) * 100;
    cursor += point.value;
    const end = (cursor / total) * 100;
    return `${PIE_COLORS[index % PIE_COLORS.length]} ${start}% ${end}%`;
  });

  return (
    <div className="grid min-h-[300px] gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
      <div className="relative mx-auto h-[210px] w-[210px]">
        <div
          className="absolute inset-0 rounded-full shadow-[0_0_50px_rgba(124,58,237,0.22)]"
          style={{
            background: `conic-gradient(${stops.join(', ')})`,
          }}
        />
        <div className="absolute inset-[48px] flex flex-col items-center justify-center rounded-full border border-white/10 bg-[#0b1120] shadow-inner">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Total
          </span>
          <span className="mt-1 text-xl font-black text-white">
            {formatCanvasValue(total, language)}
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {positivePoints.map((point, index) => {
          const percentage = (point.value / total) * 100;

          return (
            <div
              key={`${point.label}-${index}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      PIE_COLORS[index % PIE_COLORS.length],
                  }}
                />
                <span
                  className="truncate text-xs font-semibold text-slate-300"
                  title={point.label}
                >
                  {point.label}
                </span>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-xs font-black text-white">
                  {percentage.toLocaleString(
                    localeForLanguage(language),
                    { maximumFractionDigits: 1 },
                  )}
                  %
                </div>
                <div className="text-[10px] text-slate-500">
                  {formatCanvasValue(point.value, language)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfessionalDataTable({
  rows,
  language,
}: {
  rows: JsonObject[];
  language: SupportedLanguage;
}) {
  const visibleRows = rows.slice(0, 50);
  const headers = Array.from(
    new Set(
      visibleRows.flatMap((row) => Object.keys(row)),
    ),
  ).slice(0, 12);

  if (!visibleRows.length || !headers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center text-sm text-slate-500">
        {tr(language, 'noTable')}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#11182b]">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap border-b border-white/10 px-4 py-3 font-black uppercase tracking-[0.08em] text-blue-100"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-white/[0.06] transition hover:bg-white/[0.035]"
              >
                {headers.map((header) => (
                  <td
                    key={`${rowIndex}-${header}`}
                    className="max-w-[320px] px-4 py-3 align-top leading-5 text-slate-300"
                  >
                    <div className="max-h-24 overflow-hidden whitespace-pre-wrap break-words">
                      {formatCanvasValue(row[header], language)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > visibleRows.length ? (
        <div className="border-t border-white/10 bg-white/[0.025] px-4 py-2 text-xs text-slate-500">
          {tr(language, 'shown')} {visibleRows.length} {tr(language, 'of')} {rows.length} {tr(language, 'rows')}.
        </div>
      ) : null}
    </div>
  );
}

function CanvasMetricCard({
  metric,
}: {
  metric: CanvasMetric;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.025] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            {metric.label}
          </p>
          <p className="mt-3 text-3xl font-black text-white">
            {metric.value}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {metric.description}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200/15 bg-blue-500/10 p-3 text-blue-100">
          {metric.icon}
        </div>
      </div>
    </div>
  );
}

function AnalysisCanvas({
  result,
  preparedDataFile,
  language,
}: {
  result: AnalysisResult;
  preparedDataFile: PreparedDataFileLike;
  language: SupportedLanguage;
}) {
  const sections = useMemo(
    () => buildCanvasSections(result, language),
    [result, language],
  );

  const [activeSectionId, setActiveSectionId] = useState(
    sections[0]?.id ?? '',
  );
  const [chartKind, setChartKind] = useState<ChartKind>(
    sections[0]?.id === 'frequencies' ? 'pie' : 'bar',
  );

  useEffect(() => {
    if (
      sections.length > 0 &&
      !sections.some(
        (section) => section.id === activeSectionId,
      )
    ) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  const activeSection =
    sections.find(
      (section) => section.id === activeSectionId,
    ) ?? sections[0];

  useEffect(() => {
    if (!activeSection) return;
    setChartKind(
      activeSection.id === 'frequencies' ||
      activeSection.id === 'scales'
        ? 'pie'
        : 'bar',
    );
  }, [activeSection?.id]);

  const respondentCount =
    getFirstNumberByPaths(result, [
      ['meta', 'respondentCount'],
      ['meta', 'rows'],
      ['preparedDataset', 'quality', 'rowCount'],
    ]) ??
    preparedDataFile?.rows ??
    0;

  const variableCount =
    getFirstNumberByPaths(result, [
      ['meta', 'variableCount'],
      ['meta', 'columns'],
      ['preparedDataset', 'quality', 'variableCount'],
    ]) ??
    preparedDataFile?.columns ??
    0;

  const reliabilityCount =
    getFirstArrayByPaths(result, [
      ['reliability'],
      ['reliabilityAnalysis'],
      ['statisticalAnalysis', 'reliability'],
      ['statisticalAnalysis', 'reliabilityAnalysis'],
    ]).length;

  const scaleCount = Math.max(
    getFirstArrayByPaths(result, [
      ['scaleDefinitions'],
      ['scaleScores'],
      ['statisticalAnalysis', 'scaleDefinitions'],
      ['statisticalAnalysis', 'scaleScores'],
    ]).length,
    reliabilityCount,
  );

  const warningCount = Array.from(
    new Set([
      ...safeArray<string>(
        getNestedValue(result, ['warnings']),
      ),
      ...safeArray<string>(
        getNestedValue(result, [
          'statisticalAnalysis',
          'warnings',
        ]),
      ),
      ...safeArray<string>(preparedDataFile?.warnings),
    ]),
  ).length;

  const summary =
    getFirstTextByPaths(result, [
      ['practicalText'],
      ['summary'],
      ['interpretation'],
      ['statisticalAnalysis', 'summary'],
      ['statisticalAnalysis', 'interpretation'],
    ]) ||
    tr(language, 'defaultSummary');

  const metrics: CanvasMetric[] = [
    {
      label: tr(language, 'respondents'),
      value: respondentCount
        ? respondentCount.toLocaleString(localeForLanguage(language))
        : '—',
      description: tr(language, 'respondentsDesc'),
      icon: <Database className="h-5 w-5" />,
    },
    {
      label: tr(language, 'variables'),
      value: variableCount
        ? variableCount.toLocaleString(localeForLanguage(language))
        : '—',
      description: tr(language, 'variablesDesc'),
      icon: <Table2 className="h-5 w-5" />,
    },
    {
      label: tr(language, 'scales'),
      value: scaleCount
        ? scaleCount.toLocaleString(localeForLanguage(language))
        : '—',
      description: tr(language, 'scalesDesc'),
      icon: <Activity className="h-5 w-5" />,
    },
    {
      label: tr(language, 'warnings'),
      value: warningCount.toLocaleString(localeForLanguage(language)),
      description:
        warningCount > 0
          ? tr(language, 'warningsDesc')
          : tr(language, 'noWarnings'),
      icon: <ShieldCheck className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[26px] border border-blue-300/15 bg-gradient-to-br from-blue-600/15 via-cyan-500/[0.07] to-transparent p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-blue-200">
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">
                {tr(language, 'canvas')}
              </span>
            </div>

            <h3 className="mt-3 text-2xl font-black text-white sm:text-3xl">
              {tr(language, 'dataResults')}
            </h3>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {summary}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-emerald-300/15 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">
            <TrendingUp className="h-4 w-4" />
            {tr(language, 'ready')}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <CanvasMetricCard
            key={metric.label}
            metric={metric}
          />
        ))}
      </section>

      {sections.length > 0 ? (
        <>
          <section className="rounded-[26px] border border-white/10 bg-white/[0.025] p-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sections.map((section) => {
                const active = section.id === activeSection?.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() =>
                      setActiveSectionId(section.id)
                    }
                    className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-black transition ${
                      active
                        ? 'border-blue-300/35 bg-blue-500/20 text-blue-50 shadow-[0_10px_30px_rgba(37,99,235,0.18)]'
                        : 'border-white/10 bg-black/20 text-slate-400 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {section.title}
                  </button>
                );
              })}
            </div>
          </section>

          {activeSection ? (
            <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 shadow-[0_24px_65px_rgba(0,0,0,0.24)] sm:p-6">
              <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                    {tr(language, 'section')}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-white sm:text-2xl">
                    {activeSection.title}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    {activeSection.description}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-slate-300">
                  {activeSection.rows.length.toLocaleString(localeForLanguage(language))}{' '}
                  {tr(language, 'records')}
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.4fr)]">
                <div className="rounded-2xl border border-white/10 bg-[#0b1120] p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-xl border border-blue-200/15 bg-blue-500/10 p-2.5 text-blue-100">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-white">
                        {tr(language, 'overview')}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {tr(language, 'topResults')}
                      </p>
                    </div>
                  </div>

                  <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-1">
                    <span className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                      {tr(language, 'chartType')}
                    </span>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setChartKind('bar')}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-black transition ${
                          chartKind === 'bar'
                            ? 'bg-blue-500/20 text-blue-100'
                            : 'text-slate-500 hover:text-white'
                        }`}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        {tr(language, 'bar')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setChartKind('pie')}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-black transition ${
                          chartKind === 'pie'
                            ? 'bg-violet-500/20 text-violet-100'
                            : 'text-slate-500 hover:text-white'
                        }`}
                      >
                        <PieChart className="h-3.5 w-3.5" />
                        {tr(language, 'pie')}
                      </button>
                    </div>
                  </div>

                  {chartKind === 'pie' ? (
                    <ProfessionalPieChart
                      points={buildChartPoints(activeSection)}
                      language={language}
                    />
                  ) : (
                    <ProfessionalBarChart
                      points={buildChartPoints(activeSection)}
                      language={language}
                    />
                  )}
                </div>

                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-200">
                      <Table2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-white">
                        {tr(language, 'details')}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {tr(language, 'tablePreview')}
                      </p>
                    </div>
                  </div>

                  <ProfessionalDataTable
                    rows={activeSection.rows}
                    language={language}
                  />
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-slate-600" />
          <h3 className="mt-4 text-lg font-black text-white">
            {tr(language, 'noResults')}
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            {tr(language, 'noResultsDesc')}
          </p>
        </section>
      )}
    </div>
  );
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
  const [view, setView] = useState<ModalView>('canvas');
  const language = usePageLanguage();

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
          tr(language, 'exportTooLarge'),
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
            `${tr(language, 'exportFailed')} HTTP ${response.status}.`,
        );
        return;
      }

      const contentType =
        response.headers.get('content-type') || '';

      const blob = await response.blob();

      if (!blob.size) {
        setError(
          tr(language, 'emptyExport'),
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
          : tr(language, 'exportFailed'),
      );
    } finally {
      setExporting(null);
    }
  }

  if (!open || !result) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 p-2 text-white backdrop-blur-md sm:p-4">
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
        aria-label={tr(language, 'close')}
      />

      <div className="relative mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-[1500px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#060a14] shadow-[0_40px_120px_rgba(0,0,0,0.68)] sm:h-[calc(100dvh-2rem)]">
        <header className="shrink-0 border-b border-white/10 bg-[#0a0f20] px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex min-w-0 rounded-2xl border border-white/10 bg-black/25 p-1">
              <button
                type="button"
                onClick={() => setView('canvas')}
                className={`flex min-w-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition sm:text-sm ${
                  view === 'canvas'
                    ? 'bg-blue-500/20 text-blue-50 shadow-[0_10px_25px_rgba(37,99,235,0.16)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {tr(language, 'resultsAndCharts')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setView('export')}
                className={`flex min-w-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition sm:text-sm ${
                  view === 'export'
                    ? 'bg-blue-500/20 text-blue-50 shadow-[0_10px_25px_rgba(37,99,235,0.16)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Download className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {tr(language, 'export')}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:border-white/20 hover:bg-white/[0.09]"
              aria-label={tr(language, 'close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-5 py-5 sm:px-7 sm:py-7">
          {view === 'canvas' ? (
            <AnalysisCanvas
              result={result}
              preparedDataFile={preparedDataFile}
              language={language}
            />
          ) : (
            <div className="mx-auto flex min-h-full max-w-4xl items-center">
              <div className="grid w-full gap-4 sm:grid-cols-2">
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
                  icon={<FileSpreadsheet className="h-6 w-6" />}
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
                  icon={<FileSpreadsheet className="h-6 w-6" />}
                  exporting={exporting}
                  onClick={exportViaApiRoute}
                />
              </div>

              {error ? (
                <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">
                  {error}
                </div>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
