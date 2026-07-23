import { randomUUID } from 'node:crypto';

import {
  NextResponse,
  type NextRequest,
} from 'next/server';
import * as XLSX from 'xlsx';

import {
  EntitlementError,
  requireDataAnalysisAction,
} from '@/lib/entitlements';
import {
  recordCurrentUserAttachmentUsage,
  type AttachmentUsageItem,
  type AuthenticatedAttachmentUsageSnapshot,
} from '@/lib/attachment-usage';
import {
  zedperaErrorJson,
  zedperaUnknownErrorJson,
} from '@/lib/zedpera-api-errors.server';
import type {
  ZedperaErrorCode,
  ZedperaErrorContext,
} from '@/lib/api-error-messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 120;

type RowValue = string | number | boolean | null;

type DataRow = Record<string, RowValue>;

/**
 * Súbor prijatý cez Request.formData().
 *
 * Nepoužívame `instanceof File`, pretože v Node.js/serverless runtime môže
 * objekt súboru pochádzať z iného JavaScript realm-u. Kontrolujeme preto
 * bezpečne jeho vlastnosti a metódu arrayBuffer().
 */
type UploadedDataFile = Blob & {
  name: string;
  lastModified?: number;
};

/**
 * Verejný a JSON-bezpečný prehľad oprávnení použitý v odpovedi route.
 *
 * `null` pri limitoch znamená neobmedzený ADMIN prístup.
 */
type PrepareAccess = {
  planId: string;
  planName: string;
  isAdmin: boolean;
  isUnlimited: boolean;
  hasUnlimitedAccess: boolean;
  hasDatabaseRecord: boolean;
  pageLimit: number | null;
  basePageLimit: number | null;
  extraPageLimit: number;
  pagesUsed: number;
  promptLimit: number | null;
  promptsUsed: number;
  promptsRemaining: number | null;
  attachmentLimit: number | null;
  billingStatus: string | null;
  addonIds: string[];
  addonNames: string[];
  features: string[];
  requiredFeature: 'data-prepare';
};

type QualityStatus = 'ok' | 'warning' | 'error';

type QuestionnaireMode =
  | 'auto-suggest-only'
  | 'none'
  | 'selected'
  | 'manual';

type QuestionnaireConfig = {
  mode: QuestionnaireMode;
  selectedQuestionnaires: string[];

  /**
   * Voľný text – názov dotazníka alebo všeobecný popis.
   * Už neslúži na pevné vyberanie WEMWBS/JSS/SEHS/Resilience.
   */
  customQuestionnairesText: string;

  /**
   * Hlavné 3 kolónky z Dashboardu.
   * Toto je nový základ workflow: používateľ zadá škály, subškály a skupinové premenné.
   */
  manualScalesText: string;
  manualSubscalesText: string;
  groupingColumnsText: string;
};

type QuestionnaireId =
  | 'wemwbs'
  | 'jss'
  | 'sehs_s_2020'
  | 'resilience_scale'
  | 'custom';

type QualityReportItem = {
  kontrola: string;
  vysledok: string | number;
  stav: QualityStatus;
  poznamka: string;
};

type VariableDictionaryItem = {
  premenna: string;
  povodnyNazov: string;
  popis: string;
  typ: string;
  hodnoty: string;
  pouzitie: string;
};

type ScoringItem = {
  skala: string;
  polozky: string;
  vypocet: string;
  vyslednaPremenna: string;
  poznamka: string;
};

type JaspTableRow = Record<string, string | number | null>;

type JaspAnalysisResult = {
  summary: JaspTableRow[];
  variables: JaspTableRow[];
  descriptives: JaspTableRow[];
  frequencies: JaspTableRow[];
  reliability: JaspTableRow[];
  normality: JaspTableRow[];
  correlations: JaspTableRow[];
  parametricTests: JaspTableRow[];
  nonParametricTests: JaspTableRow[];
  testSelection: JaspTableRow[];
  itemDescriptives: JaspTableRow[];
  warnings: JaspTableRow[];
};

type PrepareErrorCode =
  | 'DATA_PREPARED'
  | 'INVALID_CONTENT_TYPE'
  | 'INVALID_FORM_DATA'
  | 'FILE_REQUIRED'
  | 'MULTIPLE_FILES_NOT_SUPPORTED'
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'FILE_READ_FAILED'
  | 'EMPTY_WORKBOOK'
  | 'NO_DATA_ROWS'
  | 'WORKBOOK_GENERATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'FEATURE_NOT_INCLUDED'
  | 'ATTACHMENT_LIMIT_REACHED'
  | 'ENTITLEMENTS_LOAD_FAILED'
  | 'INTERNAL_SERVER_ERROR'
  | string;

type PrepareResponse = {
  ok: boolean;
  success?: boolean;
  code?: PrepareErrorCode;
  message: string;
  requestId?: string;
  errorId?: string;
  processingMs?: number;

  preparedFileName?: string;
  preparedFileBase64?: string;
  preparedFileSizeBytes?: number;
  preparedFileBase64Length?: number;
  mimeType?: string;

  sourceFile?: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };

  rows?: number;
  columns?: number;
  sheets?: string[];
  warnings?: string[];
  qualityReport?: QualityReportItem[];
  questionnaireConfig?: QuestionnaireConfig;
  jaspSummary?: JaspTableRow[];
  access?: PrepareAccess;

  /**
   * Zachované kvôli spätnej kompatibilite frontendu.
   * V produkcii obsahuje iba bezpečnú používateľskú správu.
   */
  error?: string;

  /**
   * Technický detail sa vracia iba mimo produkčného prostredia.
   */
  detail?: string;
};

const EXCEL_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const MAX_FILE_NAME_LENGTH = 255;
const REQUIRED_DATA_FEATURE = 'data-prepare' as const;

const SUPPORTED_EXTENSIONS = new Set([
  'xlsx',
  'xls',
  'xlsm',
  'csv',
]);

const NO_STORE_HEADERS = {
  'Cache-Control':
    'private, no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  Vary: 'Cookie, Authorization',
  'X-Content-Type-Options': 'nosniff',
} as const;

class PrepareRouteError extends Error {
  readonly code: PrepareErrorCode;
  readonly status: number;
  readonly publicMessage: string;
  readonly detail?: string;
  readonly context: ZedperaErrorContext;

  constructor({
    code,
    status,
    message,
    detail,
    context = {},
  }: {
    code: PrepareErrorCode;
    status: number;
    message: string;
    detail?: string;
    context?: ZedperaErrorContext;
  }) {
    super(detail || message);
    this.name = 'PrepareRouteError';
    this.code = code;
    this.status = status;
    this.publicMessage = message;
    this.detail = detail;
    this.context = context;

    Object.setPrototypeOf(
      this,
      PrepareRouteError.prototype,
    );
  }
}


const JSS_REVERSE_ITEMS = new Set<number>([
  2, 4, 6, 8, 10, 12, 14, 16, 18, 19, 21, 23, 24, 26, 29, 31, 32, 34, 36,
]);

const JSS_SUBSCALES: Record<string, number[]> = {
  JSS_plat: [1, 10, 19, 28],
  JSS_povysenie: [2, 11, 20, 33],
  JSS_nadriadeny: [3, 12, 21, 30],
  JSS_benefity: [4, 13, 22, 29],
  JSS_odmeny_a_uznanie: [5, 14, 23, 32],
  JSS_prevadzkove_podmienky: [6, 15, 24, 31],
  JSS_spolupracovnici: [7, 16, 25, 34],
  JSS_povaha_prace: [8, 17, 27, 35],
  JSS_komunikacia: [9, 18, 26, 36],
};

const KNOWN_QUESTIONNAIRE_IDS = new Set<QuestionnaireId>([
  'wemwbs',
  'jss',
  'sehs_s_2020',
  'resilience_scale',
  'custom',
]);

const QUESTIONNAIRE_LABELS: Record<QuestionnaireId, string> = {
  wemwbs: 'WEMWBS',
  jss: 'JSS – Job Satisfaction Survey',
  sehs_s_2020: 'SEHS-S-2020',
  resilience_scale: 'Škála reziliencie',
  custom: 'Vlastný dotazník / vlastné škály',
};

function isKnownQuestionnaireId(value: string): value is QuestionnaireId {
  return KNOWN_QUESTIONNAIRE_IDS.has(value as QuestionnaireId);
}

function normalizeQuestionnaireId(value: unknown): QuestionnaireId | null {
  const normalized = removeDiacritics(String(value ?? ''))
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');

  if (!normalized) return null;

  if (
    normalized === 'wemwbs' ||
    normalized === 'wembs' ||
    normalized === 'wem' ||
    normalized.includes('warwick')
  ) {
    return 'wemwbs';
  }

  if (
    normalized === 'jss' ||
    normalized.includes('job-satisfaction') ||
    normalized.includes('pracovna-spokojnost')
  ) {
    return 'jss';
  }

  if (
    normalized === 'sehs' ||
    normalized === 'sehs-s' ||
    normalized === 'sehs-s-2020' ||
    normalized === 'sehs_s_2020' ||
    normalized.includes('social-emotional-health')
  ) {
    return 'sehs_s_2020';
  }

  if (
    normalized === 'resilience' ||
    normalized === 'reziliencia' ||
    normalized === 'skala-reziliencie' ||
    normalized === 'resilience-scale' ||
    normalized === 'resilience_scale' ||
    normalized === 'rs' ||
    normalized.includes('cd-risc')
  ) {
    return 'resilience_scale';
  }

  if (normalized === 'custom' || normalized.includes('vlastn')) {
    return 'custom';
  }

  return isKnownQuestionnaireId(normalized) ? normalized : null;
}

function safeJsonParse<T>(value: FormDataEntryValue | null): T | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeQuestionnaireConfig(formData: FormData): QuestionnaireConfig {
  const parsed = safeJsonParse<Partial<QuestionnaireConfig>>(
    formData.get('questionnaireConfig'),
  );

  const manualAnalysisConfig =
    safeJsonParse<Partial<QuestionnaireConfig>>(formData.get('manualAnalysisConfig')) ??
    {};

  const customQuestionnairesText = String(
    parsed?.customQuestionnairesText ??
      manualAnalysisConfig.customQuestionnairesText ??
      formData.get('customQuestionnairesText') ??
      '',
  ).trim();

  const manualScalesText = String(
    parsed?.manualScalesText ??
      manualAnalysisConfig.manualScalesText ??
      formData.get('manualScalesText') ??
      '',
  ).trim();

  const manualSubscalesText = String(
    parsed?.manualSubscalesText ??
      manualAnalysisConfig.manualSubscalesText ??
      formData.get('manualSubscalesText') ??
      '',
  ).trim();

  const groupingColumnsText = String(
    parsed?.groupingColumnsText ??
      manualAnalysisConfig.groupingColumnsText ??
      formData.get('groupingColumnsText') ??
      '',
  ).trim();

  const hasManualDefinitions =
    customQuestionnairesText.length > 0 ||
    manualScalesText.length > 0 ||
    manualSubscalesText.length > 0 ||
    groupingColumnsText.length > 0;

  const selectedFromConfig = Array.isArray(parsed?.selectedQuestionnaires)
    ? parsed.selectedQuestionnaires
    : [];

  const selectedFromField =
    safeJsonParse<unknown[]>(formData.get('selectedQuestionnaires')) ?? [];

  /*
   * Starý výber konkrétnych dotazníkov ponechávame iba ako spätnú kompatibilitu.
   * Nový workflow nemá pevné tlačidlá WEMWBS/JSS/SEHS/Resilience – používateľ zadáva
   * škály a subškály ručne v troch textových poliach.
   */
  const selectedQuestionnaires = [
    ...selectedFromConfig,
    ...selectedFromField,
  ]
    .map(normalizeQuestionnaireId)
    .filter((id): id is QuestionnaireId => Boolean(id) && id !== 'custom');

  const uniqueSelected = hasManualDefinitions
    ? []
    : Array.from(new Set(selectedQuestionnaires));

  const rawMode = String(
    parsed?.mode ??
      manualAnalysisConfig.mode ??
      formData.get('questionnaireMode') ??
      'manual',
  );

  let mode: QuestionnaireMode =
    rawMode === 'selected' ||
    rawMode === 'manual' ||
    rawMode === 'none' ||
    rawMode === 'auto-suggest-only'
      ? rawMode
      : 'manual';

  if (hasManualDefinitions) {
    mode = 'manual';
  }

  if (mode === 'selected' && uniqueSelected.length === 0) {
    mode = 'manual';
  }

  return {
    mode,
    selectedQuestionnaires: uniqueSelected,
    customQuestionnairesText,
    manualScalesText,
    manualSubscalesText,
    groupingColumnsText,
  };
}

function createQuestionnaireSelectionWarnings(
  questionnaireConfig: QuestionnaireConfig,
): string[] {
  if (questionnaireConfig.mode === 'selected') {
    const labels = questionnaireConfig.selectedQuestionnaires.map(
      (id) => QUESTIONNAIRE_LABELS[id as QuestionnaireId] ?? id,
    );

    return [
      `Používateľ ručne vybral dotazníky: ${labels.join(' + ')}. Tento režim je ponechaný iba pre spätnú kompatibilitu.`,
    ];
  }

  if (questionnaireConfig.mode === 'manual') {
    return [
      [
        'Používateľ zadal vlastné škály/subškály a skupinové premenné.',
        questionnaireConfig.customQuestionnairesText
          ? `Popis: ${questionnaireConfig.customQuestionnairesText}`
          : '',
        questionnaireConfig.manualScalesText
          ? `Škály: ${questionnaireConfig.manualScalesText}`
          : '',
        questionnaireConfig.manualSubscalesText
          ? `Subškály: ${questionnaireConfig.manualSubscalesText}`
          : '',
        questionnaireConfig.groupingColumnsText
          ? `Skupiny: ${questionnaireConfig.groupingColumnsText}`
          : '',
      ]
        .filter(Boolean)
        .join(' '),
    ];
  }

  if (questionnaireConfig.mode === 'none') {
    return [
      'Používateľ zvolil analýzu bez štandardizovaného dotazníka. Automatické škály WEMWBS/JSS sa nevytvárajú.',
    ];
  }

  return [
    'Režim dotazníkov: iba všeobecná príprava dát. Pevné dotazníky sa automaticky nepočítajú; škály a subškály sa majú zadať v troch manuálnych poliach.',
  ];
}


const STANDARD_COLUMN_MAP: Record<string, string> = {
  id: 'ID',
  respondent: 'ID',
  respondent_id: 'ID',
  respondentid: 'ID',
  cislo: 'ID',
  cislodotaznika: 'ID',
  poradovecislo: 'ID',

  vek: 'Vek',
  age: 'Vek',

  pohlavie: 'POHLAVIE',
  gender: 'POHLAVIE',
  sex: 'POHLAVIE',

  rodinnystav: 'RODINNY_STAV',
  rodinny_stav: 'RODINNY_STAV',
  maritalstatus: 'RODINNY_STAV',

  typpodniku: 'TYP_PODNIKU',
  typ_podniku: 'TYP_PODNIKU',
  typfirmy: 'TYP_PODNIKU',
  companytype: 'TYP_PODNIKU',
};

function createJsonResponse(
  payload: PrepareResponse,
  status = 200,
  requestId?: string,
) {
  const processingMs =
    typeof payload.processingMs === 'number' &&
    Number.isFinite(payload.processingMs)
      ? Math.max(0, Math.trunc(payload.processingMs))
      : null;

  return NextResponse.json(payload, {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      ...(requestId
        ? {
            'X-Request-Id': requestId,
            'X-Zedpera-Request-Id': requestId,
          }
        : {}),
      ...(processingMs !== null
        ? {
            'X-Processing-Time-Ms':
              String(processingMs),
            'Server-Timing':
              `zedpera;dur=${processingMs}`,
          }
        : {}),
    },
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim() || 'UNKNOWN_ERROR';
  }

  if (typeof error === 'string') {
    return error.trim() || 'UNKNOWN_ERROR';
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'UNKNOWN_ERROR';
  }
}

function getDevelopmentDetail(
  detail: string | undefined,
): Pick<PrepareResponse, 'detail'> {
  if (
    process.env.NODE_ENV === 'production' ||
    !detail
  ) {
    return {};
  }

  return { detail };
}


function toNonNegativeInteger(
  value: unknown,
  fallback = 0,
): number {
  const numericValue =
    typeof value === 'number'
      ? value
      : Number(value);

  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0
  ) {
    return Math.max(
      0,
      Math.trunc(fallback),
    );
  }

  return Math.trunc(numericValue);
}

function toNullableNonNegativeInteger(
  value: unknown,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue =
    typeof value === 'number'
      ? value
      : Number(value);

  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0
  ) {
    return null;
  }

  return Math.trunc(numericValue);
}

/**
 * Vytvorí jednotný ADMIN/plan snapshot bez toho, aby route dôverovala
 * údajom odoslaným klientom.
 */
function createPrepareAccess(
  entitlements: Awaited<
    ReturnType<typeof requireDataAnalysisAction>
  >,
): PrepareAccess {
  const isAdmin =
    entitlements.isAdmin === true ||
    entitlements.planId === 'admin';

  const hasUnlimitedAccess =
    isAdmin ||
    entitlements.hasUnlimitedAccess === true;

  /**
   * Obchodný limit príloh je totožný s celkovým limitom strán.
   * Frontendový alebo starý databázový attachmentLimit nie je zdroj pravdy.
   */
  const entitlementRecord =
    entitlements as unknown as Record<
      string,
      unknown
    >;

  const authoritativeTotalPageLimit =
    entitlementRecord.totalPageLimit ??
    entitlementRecord.pageLimit ??
    entitlements.pageLimit;

  const attachmentLimit =
    hasUnlimitedAccess
      ? null
      : toNullableNonNegativeInteger(
          authoritativeTotalPageLimit,
        );

  const features = Array.from(
    new Set(
      [
        ...(Array.isArray(
          entitlements.featureList,
        )
          ? entitlements.featureList
          : []),
        ...(entitlements.features instanceof Set
          ? Array.from(entitlements.features)
          : []),
      ].map((feature) => String(feature)),
    ),
  ).sort();

  return {
    planId: isAdmin
      ? 'admin'
      : String(entitlements.planId),
    planName: isAdmin
      ? 'ADMIN'
      : String(
          entitlements.planName ||
            entitlements.planId,
        ),
    isAdmin,
    isUnlimited: hasUnlimitedAccess,
    hasUnlimitedAccess,
    hasDatabaseRecord:
      entitlements.hasDatabaseRecord !== false,

    pageLimit: hasUnlimitedAccess
      ? null
      : toNullableNonNegativeInteger(
          entitlements.pageLimit,
        ),
    basePageLimit: hasUnlimitedAccess
      ? null
      : toNullableNonNegativeInteger(
          entitlements.basePageLimit,
        ),
    extraPageLimit: hasUnlimitedAccess
      ? 0
      : toNonNegativeInteger(
          entitlements.extraPageLimit,
          0,
        ),
    pagesUsed: hasUnlimitedAccess
      ? 0
      : toNonNegativeInteger(
          entitlements.pagesUsed,
          0,
        ),

    promptLimit: hasUnlimitedAccess
      ? null
      : toNullableNonNegativeInteger(
          entitlements.promptLimit,
        ),
    promptsUsed: hasUnlimitedAccess
      ? 0
      : toNonNegativeInteger(
          entitlements.promptsUsed,
          0,
        ),
    promptsRemaining: hasUnlimitedAccess
      ? null
      : toNullableNonNegativeInteger(
          entitlements.promptsRemaining,
        ),

    attachmentLimit,
    billingStatus: isAdmin
      ? 'admin'
      : entitlements.billingStatus ?? null,
    addonIds: Array.isArray(
      entitlements.addonIds,
    )
      ? entitlements.addonIds.map(String)
      : [],
    addonNames: Array.isArray(
      entitlements.addonNames,
    )
      ? entitlements.addonNames.map(String)
      : [],
    features,
    requiredFeature:
      REQUIRED_DATA_FEATURE,
  };
}

function resolveRequestId(
  request: NextRequest,
): string {
  const suppliedRequestId =
    request.headers
      .get('x-request-id')
      ?.trim() || '';

  /**
   * Request ID sa zapisuje do hlavičiek aj serverových logov.
   * Povolená je iba bezpečná množina znakov a maximálne 128 znakov.
   */
  const safeRequestId =
    suppliedRequestId
      .replace(
        /[^a-zA-Z0-9._:~-]+/g,
        '',
      )
      .slice(0, 128);

  return safeRequestId || randomUUID();
}

function isMultipartRequest(
  request: NextRequest,
): boolean {
  const contentType =
    request.headers
      .get('content-type')
      ?.toLowerCase() || '';

  return contentType.includes(
    'multipart/form-data',
  );
}

function sanitizeFileName(
  fileName: string,
): string {
  return String(fileName || 'uploaded-file')
    .replace(/[\\/]+/g, '_')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MAX_FILE_NAME_LENGTH) || 'uploaded-file';
}

function getFileExtension(
  fileName: string,
): string {
  const match = fileName
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);

  return match?.[1] || '';
}

function removeDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeHeaderKey(value: unknown): string {
  return removeDiacritics(String(value ?? ''))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeSheetName(value: string): string {
  const cleaned = value
    .replace(/[\\/?*[\]:]/g, '_')
    .trim()
    .slice(0, 31);

  return cleaned || 'Sheet';
}

function normalizeCellValue(value: unknown): RowValue {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  return text;
}

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');

  if (!normalized) {
    return null;
  }

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function isEmptyCell(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

function isCsvFileName(fileName: string): boolean {
  return /\.csv$/i.test(fileName);
}

function isUploadedDataFile(
  value: unknown,
): value is UploadedDataFile {
  if (
    !value ||
    typeof value === 'string' ||
    typeof value !== 'object'
  ) {
    return false;
  }

  const candidate =
    value as Partial<UploadedDataFile> & {
      arrayBuffer?: unknown;
    };

  return (
    typeof candidate.arrayBuffer === 'function' &&
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0 &&
    typeof candidate.size === 'number' &&
    Number.isFinite(candidate.size) &&
    candidate.size >= 0 &&
    typeof candidate.type === 'string'
  );
}

/**
 * Načíta všetky reálne súbory z FormData a odstráni duplicity.
 *
 * Dashboard kvôli spätnej kompatibilite posiela ten istý súbor pod poľami
 * `file` aj `files`. Bez deduplikácie route videla dva súbory a vracala
 * MULTIPLE_FILES_NOT_SUPPORTED, hoci používateľ nahral iba jeden dataset.
 */
function getUploadedFiles(
  formData: FormData,
): UploadedDataFile[] {
  const uniqueFiles =
    new Map<string, UploadedDataFile>();

  for (const [, value] of formData.entries()) {
    if (!isUploadedDataFile(value)) {
      continue;
    }

    const key = [
      value.name.trim().toLowerCase(),
      value.size,
      value.type.trim().toLowerCase(),
      value.lastModified ?? 0,
    ].join('|');

    if (!uniqueFiles.has(key)) {
      uniqueFiles.set(key, value);
    }
  }

  return Array.from(uniqueFiles.values());
}

function getWorkbookFirstSheetRows(workbook: XLSX.WorkBook): unknown[][] {
  let bestRows: unknown[][] = [];
  let bestScore = -1;

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: null,
      blankrows: false,
    });

    const nonEmptyCells = rows.reduce(
      (sum, row) => sum + row.filter((cell) => !isEmptyCell(cell)).length,
      0,
    );
    const score = rows.length * 10 + nonEmptyCells;

    if (score > bestScore) {
      bestScore = score;
      bestRows = rows;
    }
  });

  return bestRows;
}

function detectHeaderRow(rows: unknown[][]): number {
  const maxRowsToScan = Math.min(rows.length, 15);

  let bestIndex = 0;
  let bestScore = -1;

  for (let rowIndex = 0; rowIndex < maxRowsToScan; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];

    const nonEmptyCount = row.filter((cell) => !isEmptyCell(cell)).length;

    const textCount = row.filter((cell) => {
      if (isEmptyCell(cell)) {
        return false;
      }

      return Number.isNaN(Number(String(cell).replace(',', '.')));
    }).length;

    const score = nonEmptyCount + textCount * 2;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
    }
  }

  return bestIndex;
}


function looksLikeQuestionColumn(header: string): boolean {
  const normalized = removeDiacritics(String(header || ''))
    .toLowerCase()
    .trim();

  return (
    normalized.includes('otaz') ||
    normalized.includes('otáz') ||
    normalized.includes('polozk') ||
    normalized.includes('položk') ||
    normalized.includes('item') ||
    normalized.includes('question') ||
    normalized.includes('tvrden') ||
    normalized.includes('vyrok') ||
    normalized.includes('výrok') ||
    normalized.includes('skore') ||
    normalized.includes('skóre') ||
    normalized.includes('spokoj') ||
    normalized.includes('pohod') ||
    normalized.includes('well') ||
    normalized.includes('being') ||
    normalized.includes('praca') ||
    normalized.includes('práca') ||
    normalized.includes('zamestn') ||
    normalized.includes('nadriaden') ||
    normalized.includes('benefit') ||
    normalized.includes('benefitov') ||
    normalized.includes('plat') ||
    normalized.includes('mzda') ||
    normalized.includes('odmen') ||
    normalized.includes('uznanie') ||
    normalized.includes('povysen') ||
    normalized.includes('povýšen') ||
    normalized.includes('kolegov') ||
    normalized.includes('spolupracov') ||
    normalized.includes('komunik') ||
    normalized.includes('podmien') ||
    normalized.includes('organizac') ||
    normalized.includes('vykonavam') ||
    normalized.includes('vykonávam') ||
    normalized.includes('nadšen') ||
    normalized.includes('nadsen') ||
    normalized.includes('energie') ||
    normalized.includes('silny') ||
    normalized.includes('silný') ||
    normalized.includes('cas rychlo') ||
    normalized.includes('čas rýchlo')
  );
}

function isLikelyDemographicColumn(header: string): boolean {
  const normalized = removeDiacritics(String(header || ''))
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^\w]/g, '');

  return (
    normalized === 'id' ||
    normalized === 'respondent' ||
    normalized === 'respondentid' ||
    normalized === 'cislo' ||
    normalized === 'cislodotaznika' ||
    normalized === 'poradie' ||
    normalized === 'poradovecislo' ||
    normalized === 'index' ||
    normalized === 'vek' ||
    normalized === 'age' ||
    normalized === 'pohlavie' ||
    normalized === 'gender' ||
    normalized === 'sex' ||
    normalized === 'rodinnystav' ||
    normalized === 'maritalstatus' ||
    normalized === 'stav' ||
    normalized === 'typpodniku' ||
    normalized === 'typfirmy' ||
    normalized === 'companytype' ||
    normalized.includes('respondent') ||
    normalized.includes('cislo') ||
    normalized.includes('poradie') ||
    normalized.includes('vzdelanie') ||
    normalized.includes('pozicia') ||
    normalized.includes('pracovnapozicia') ||
    normalized.includes('dlzkapraxe') ||
    normalized.includes('dlžkapraxe') ||
    normalized.includes('prax') ||
    normalized.includes('bydlisko') ||
    normalized.includes('kraj') ||
    normalized.includes('mesto') ||
    normalized.includes('okres') ||
    normalized.includes('datum') ||
    normalized.includes('casova') ||
    normalized.includes('timestamp')
  );
}

function normalizeQuestionnaireHeader(header: string): {
  normalized: string;
  compact: string;
} {
  const normalized = removeDiacritics(String(header || ''))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return {
    normalized,
    compact: normalized.replace(/_/g, ''),
  };
}

function autoMapQuestionnaireColumnsByOrder(
  rawHeaders: unknown[],
  mappedHeaders: string[],
  questionnaireConfig: QuestionnaireConfig,
): {
  headers: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const nextHeaders = [...mappedHeaders];

  if (
    questionnaireConfig.mode === 'none' ||
    questionnaireConfig.mode === 'manual'
  ) {
    if (questionnaireConfig.mode === 'none') {
      warnings.push(
        'Automatické mapovanie štandardizovaných dotazníkov bolo vypnuté, pretože používateľ zvolil analýzu bez štandardizovaného dotazníka.',
      );
    }

    return {
      headers: nextHeaders,
      warnings,
    };
  }

  const selectedWem =
    questionnaireConfig.mode === 'selected' &&
    questionnaireConfig.selectedQuestionnaires.includes('wemwbs');

  const selectedJss =
    questionnaireConfig.mode === 'selected' &&
    questionnaireConfig.selectedQuestionnaires.includes('jss');

  const hasAnyWem =
    nextHeaders.some((header) => /^WEM\d+$/.test(header)) ||
    nextHeaders.includes('WEMWBS_skore');

  const hasAnyJss =
    nextHeaders.some((header) => /^JSS\d+$/.test(header)) ||
    nextHeaders.includes('JSS_skore');

  const alreadyMappedIndexes = new Set<number>();

  nextHeaders.forEach((header, index) => {
    if (
      header === 'ID' ||
      header === 'Vek' ||
      header === 'POHLAVIE' ||
      header === 'RODINNY_STAV' ||
      header === 'TYP_PODNIKU' ||
      /^WEM\d+$/.test(header) ||
      /^JSS\d+$/.test(header)
    ) {
      alreadyMappedIndexes.add(index);
    }
  });

  const candidateIndexes = rawHeaders
    .map((header, index) => ({
      header: String(header || '').trim(),
      index,
    }))
    .filter((item) => {
      if (!item.header) return false;
      if (alreadyMappedIndexes.has(item.index)) return false;
      if (isLikelyDemographicColumn(item.header)) return false;

      /*
       * Pri starom explicitnom výbere WEMWBS/JSS môže byť názvom stĺpca celý
       * text otázky, preto v režime selected pripúšťame všetky nedemografické
       * stĺpce. V režime auto-suggest-only iba odhadujeme podľa hlavičky a
       * nikdy stĺpce neprepisujeme.
       */
      if (questionnaireConfig.mode === 'selected') return true;

      return looksLikeQuestionColumn(item.header);
    })
    .map((item) => item.index);

  if (questionnaireConfig.mode === 'auto-suggest-only') {
    if (!hasAnyWem && !hasAnyJss && candidateIndexes.length >= 50) {
      warnings.push(
        'Súbor môže obsahovať WEMWBS + JSS, ale bol zvolený iba návrh. Položky sa neprepisujú a skóre sa automaticky nevytvára.',
      );
    } else if (!hasAnyJss && candidateIndexes.length >= 36) {
      warnings.push(
        'Súbor môže obsahovať JSS, ale bol zvolený iba návrh. Položky sa neprepisujú a JSS skóre sa automaticky nevytvára.',
      );
    } else if (!hasAnyWem && candidateIndexes.length >= 14) {
      warnings.push(
        'Súbor môže obsahovať WEMWBS, ale bol zvolený iba návrh. Položky sa neprepisujú a WEMWBS skóre sa automaticky nevytvára.',
      );
    }

    return {
      headers: nextHeaders,
      warnings,
    };
  }

  if (
    selectedWem &&
    selectedJss &&
    !hasAnyWem &&
    !hasAnyJss &&
    candidateIndexes.length >= 50
  ) {
    candidateIndexes.slice(0, 14).forEach((columnIndex, itemIndex) => {
      nextHeaders[columnIndex] = `WEM${itemIndex + 1}`;
      alreadyMappedIndexes.add(columnIndex);
    });

    candidateIndexes.slice(14, 50).forEach((columnIndex, itemIndex) => {
      nextHeaders[columnIndex] = `JSS${itemIndex + 1}`;
      alreadyMappedIndexes.add(columnIndex);
    });

    warnings.push(
      'Používateľ v starom režime vybral WEMWBS + JSS. Položky WEM1–WEM14 a JSS1–JSS36 boli vytvorené podľa poradia nedemografických stĺpcov.',
    );

    return {
      headers: nextHeaders,
      warnings,
    };
  }

  if (
    selectedJss &&
    !selectedWem &&
    !hasAnyJss &&
    candidateIndexes.length >= 36
  ) {
    candidateIndexes.slice(0, 36).forEach((columnIndex, itemIndex) => {
      nextHeaders[columnIndex] = `JSS${itemIndex + 1}`;
      alreadyMappedIndexes.add(columnIndex);
    });

    warnings.push(
      'Používateľ v starom režime vybral JSS. Položky JSS1–JSS36 boli vytvorené podľa poradia nedemografických stĺpcov.',
    );

    return {
      headers: nextHeaders,
      warnings,
    };
  }

  if (
    selectedWem &&
    !selectedJss &&
    !hasAnyWem &&
    candidateIndexes.length >= 14
  ) {
    candidateIndexes.slice(0, 14).forEach((columnIndex, itemIndex) => {
      nextHeaders[columnIndex] = `WEM${itemIndex + 1}`;
      alreadyMappedIndexes.add(columnIndex);
    });

    warnings.push(
      'Používateľ v starom režime vybral WEMWBS. Položky WEM1–WEM14 boli vytvorené podľa poradia nedemografických stĺpcov.',
    );

    return {
      headers: nextHeaders,
      warnings,
    };
  }

  if (selectedJss && hasAnyWem && !hasAnyJss) {
    const remainingCandidateIndexes = candidateIndexes.filter(
      (index) => !alreadyMappedIndexes.has(index),
    );

    if (remainingCandidateIndexes.length >= 36) {
      remainingCandidateIndexes.slice(0, 36).forEach((columnIndex, itemIndex) => {
        nextHeaders[columnIndex] = `JSS${itemIndex + 1}`;
        alreadyMappedIndexes.add(columnIndex);
      });

      warnings.push(
        'Položky JSS1–JSS36 boli doplnené podľa poradia zostávajúcich nedemografických stĺpcov.',
      );
    }
  }

  if (selectedWem && hasAnyJss && !hasAnyWem) {
    const remainingCandidateIndexes = candidateIndexes.filter(
      (index) => !alreadyMappedIndexes.has(index),
    );

    if (remainingCandidateIndexes.length >= 14) {
      remainingCandidateIndexes.slice(0, 14).forEach((columnIndex, itemIndex) => {
        nextHeaders[columnIndex] = `WEM${itemIndex + 1}`;
        alreadyMappedIndexes.add(columnIndex);
      });

      warnings.push(
        'Položky WEM1–WEM14 boli doplnené podľa poradia zostávajúcich nedemografických stĺpcov.',
      );
    }
  }

  return {
    headers: nextHeaders,
    warnings,
  };
}

function createUniqueHeaders(
  rawHeaders: unknown[],
  questionnaireConfig: QuestionnaireConfig,
): {
  headers: string[];
  originalHeaders: string[];
  duplicateWarnings: string[];
} {
  const used = new Map<string, number>();
  const originalHeaders: string[] = [];

  const mappedHeaders = rawHeaders.map((header, index) => {
    const original =
      String(header ?? '').trim() || `Stĺpec_${index + 1}`;

    originalHeaders.push(original);

    return mapColumnName(original, index);
  });

  const orderMapping = autoMapQuestionnaireColumnsByOrder(
    rawHeaders,
    mappedHeaders,
    questionnaireConfig,
  );

  const headers: string[] = [];
  const duplicateWarnings: string[] = [...orderMapping.warnings];

  orderMapping.headers.forEach((header, index) => {
    const baseName = header || `STLPEC_${index + 1}`;

    const previousCount = used.get(baseName) ?? 0;
    used.set(baseName, previousCount + 1);

    const finalName =
      previousCount === 0 ? baseName : `${baseName}_${previousCount + 1}`;

    if (previousCount > 0) {
      duplicateWarnings.push(
        `Duplicitný stĺpec "${baseName}" bol premenovaný na "${finalName}".`,
      );
    }

    headers.push(finalName);
  });

  return {
    headers,
    originalHeaders,
    duplicateWarnings,
  };
}

function mapColumnName(originalHeader: string, index: number): string {
  const raw = String(originalHeader || '').trim();

  const { normalized, compact } = normalizeQuestionnaireHeader(raw);

  if (STANDARD_COLUMN_MAP[normalized]) {
    return STANDARD_COLUMN_MAP[normalized];
  }

  if (STANDARD_COLUMN_MAP[compact]) {
    return STANDARD_COLUMN_MAP[compact];
  }

  if (
    compact === 'id' ||
    compact === 'respondent' ||
    compact === 'respondentid' ||
    compact === 'cislo' ||
    compact === 'cislodotaznika' ||
    compact === 'poradie' ||
    compact === 'poradovecislo' ||
    compact === 'index'
  ) {
    return 'ID';
  }

  if (compact === 'vek' || compact === 'age') {
    return 'Vek';
  }

  if (
    compact === 'pohlavie' ||
    compact === 'gender' ||
    compact === 'sex'
  ) {
    return 'POHLAVIE';
  }

  if (
    compact === 'rodinnystav' ||
    compact === 'maritalstatus'
  ) {
    return 'RODINNY_STAV';
  }

  if (
    compact === 'typpodniku' ||
    compact === 'typfirmy' ||
    compact === 'companytype'
  ) {
    return 'TYP_PODNIKU';
  }

  const wemPatterns = [
    /^wem(?:wbs)?0?(\d{1,2})$/,
    /^wem(?:wbs)?_?0?(\d{1,2})$/,
    /^w0?(\d{1,2})$/,
  ];

  for (const pattern of wemPatterns) {
    const match = compact.match(pattern);

    if (match?.[1]) {
      const number = Number(match[1]);

      if (number >= 1 && number <= 14) {
        return `WEM${number}`;
      }
    }
  }

  const wemTextMatch = compact.match(
    /wem(?:wbs)?(?:polozka|item|otazka|question)?0?(\d{1,2})/,
  );

  if (wemTextMatch?.[1]) {
    const number = Number(wemTextMatch[1]);

    if (number >= 1 && number <= 14) {
      return `WEM${number}`;
    }
  }

  const jssPatterns = [
    /^jss0?(\d{1,2})$/,
    /^jss_?0?(\d{1,2})$/,
    /^js0?(\d{1,2})$/,
  ];

  for (const pattern of jssPatterns) {
    const match = compact.match(pattern);

    if (match?.[1]) {
      const number = Number(match[1]);

      if (number >= 1 && number <= 36) {
        return `JSS${number}`;
      }
    }
  }

  const jssTextMatch = compact.match(
    /jss(?:polozka|item|otazka|question)?0?(\d{1,2})/,
  );

  if (jssTextMatch?.[1]) {
    const number = Number(jssTextMatch[1]);

    if (number >= 1 && number <= 36) {
      return `JSS${number}`;
    }
  }

  const rawLower = removeDiacritics(raw).toLowerCase();

  const wemLooseMatch = rawLower.match(
    /(wem|wemwbs|well|pohod|dusev|psychick).*?(\d{1,2})/,
  );

  if (wemLooseMatch?.[2]) {
    const number = Number(wemLooseMatch[2]);

    if (number >= 1 && number <= 14) {
      return `WEM${number}`;
    }
  }

  const jssLooseMatch = rawLower.match(
    /(jss|job satisfaction|pracovn|spokoj|zamestn).*?(\d{1,2})/,
  );

  if (jssLooseMatch?.[2]) {
    const number = Number(jssLooseMatch[2]);

    if (number >= 1 && number <= 36) {
      return `JSS${number}`;
    }
  }

  if (!normalized) {
    return `STLPEC_${index + 1}`;
  }

  return normalized.toUpperCase();
}

function convertRowsToObjects(
  rows: unknown[][],
  questionnaireConfig: QuestionnaireConfig,
): {
  rawRows: DataRow[];
  cleanRows: DataRow[];
  headers: string[];
  originalHeaders: string[];
  warnings: string[];
} {
  if (!rows.length) {
    return {
      rawRows: [],
      cleanRows: [],
      headers: [],
      originalHeaders: [],
      warnings: ['Súbor neobsahuje žiadne dáta.'],
    };
  }

  const headerRowIndex = detectHeaderRow(rows);
  const rawHeaderRow = rows[headerRowIndex] ?? [];

  const {
    headers,
    originalHeaders,
    duplicateWarnings,
  } = createUniqueHeaders(rawHeaderRow, questionnaireConfig);

  const dataRows = rows.slice(headerRowIndex + 1);

  const rawRows: DataRow[] = [];
  const cleanRows: DataRow[] = [];

  for (const row of dataRows) {
    const rawObject: DataRow = {};
    const cleanObject: DataRow = {};

    let nonEmptyCells = 0;

    headers.forEach((header, index) => {
      const value = normalizeCellValue(row[index]);

      if (!isEmptyCell(value)) {
        nonEmptyCells += 1;
      }

      rawObject[originalHeaders[index] || header] = value;
      cleanObject[header] = value;
    });

    if (nonEmptyCells > 0) {
      rawRows.push(rawObject);
      cleanRows.push(cleanObject);
    }
  }

  return {
    rawRows,
    cleanRows,
    headers,
    originalHeaders,
    warnings: duplicateWarnings,
  };
}

function reverseJssValue(itemNumber: number, value: unknown): number | null {
  const number = toNumber(value);

  if (number === null) {
    return null;
  }

  if (JSS_REVERSE_ITEMS.has(itemNumber)) {
    return 7 - number;
  }

  return number;
}

function sumExistingValues(values: Array<number | null>): number | null {
  const validValues = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );

  if (!validValues.length) {
    return null;
  }

  return validValues.reduce((sum, value) => sum + value, 0);
}

function averageExistingValues(values: Array<number | null>): number | null {
  const validValues = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );

  if (!validValues.length) {
    return null;
  }

  return (
    validValues.reduce((sum, value) => sum + value, 0) / validValues.length
  );
}

function hasColumns(headers: string[], expectedColumns: string[]): boolean {
  return expectedColumns.every((column) => headers.includes(column));
}


function splitManualLines(text: string): string[] {
  const normalized = String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[•·]/g, '\n')
    .trim();

  if (!normalized) return [];

  const baseLines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const lines: string[] = [];

  baseLines.forEach((line) => {
    const parts = line
      .split(/;+/)
      .map((part) => part.trim())
      .filter(Boolean);

    const definitionCount = parts.filter((part) => /^[^:=]{1,140}\s*[:=]/.test(part)).length;

    if (definitionCount > 1) {
      lines.push(...parts);
    } else {
      lines.push(line);
    }
  });

  return lines;
}

function expandManualItemRange(value: string): string[] {
  const text = String(value || '').trim();
  if (!text) return [];

  const match = text.match(/^(.*?)\s*(?:až|az|do|to|–|—|-)\s*(.*?)$/i);

  if (!match) {
    return [text];
  }

  const left = match[1].trim();
  const right = match[2].trim();
  const leftMatch = left.match(/^(.*?)(\d+)$/);
  const rightMatch = right.match(/^(.*?)(\d+)$/);

  if (!leftMatch || !rightMatch) {
    return [text];
  }

  const leftPrefix = leftMatch[1].trim();
  const rightPrefix = rightMatch[1].trim() || leftPrefix;
  const start = Number(leftMatch[2]);
  const end = Number(rightMatch[2]);

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start > end ||
    normalizeHeaderKey(leftPrefix) !== normalizeHeaderKey(rightPrefix)
  ) {
    return [text];
  }

  return Array.from({ length: end - start + 1 }, (_, index) => `${leftPrefix}${start + index}`);
}

function parseManualItemTokens(value: string): string[] {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/\+/g, ',')
    .split(/[,;\n]+/)
    .flatMap((part) => expandManualItemRange(part))
    .map((item) => item.trim())
    .filter(Boolean);
}

function findMatchingHeader(headers: string[], requestedItem: string): string | null {
  const item = String(requestedItem || '').trim();
  if (!item) return null;

  const exact = headers.find((header) => header === item);
  if (exact) return exact;

  const normalizedItem = normalizeHeaderKey(item);

  const normalizedExact = headers.find(
    (header) => normalizeHeaderKey(header) === normalizedItem,
  );

  if (normalizedExact) return normalizedExact;

  const compactItem = normalizedItem.replace(/_/g, '');

  const compactExact = headers.find(
    (header) => normalizeHeaderKey(header).replace(/_/g, '') === compactItem,
  );

  if (compactExact) return compactExact;

  return null;
}

type ManualScoringRuntime = {
  item: ScoringItem;
  requestedItems: string[];
  matchedColumns: string[];
  missingItems: string[];
  minRequiredItems: number;
};

function createManualScoringRuntime(
  scoringItems: ScoringItem[],
  headers: string[],
): ManualScoringRuntime[] {
  return scoringItems.map((item) => {
    const requestedItems = parseManualItemTokens(item.polozky);
    const matchedColumns = Array.from(
      new Set(
        requestedItems
          .map((requestedItem) => findMatchingHeader(headers, requestedItem))
          .filter((column): column is string => Boolean(column)),
      ),
    );
    const missingItems = requestedItems.filter(
      (requestedItem) => !findMatchingHeader(headers, requestedItem),
    );

    return {
      item,
      requestedItems,
      matchedColumns,
      missingItems,
      minRequiredItems: Math.max(1, Math.ceil(requestedItems.length * 0.5)),
    };
  });
}

function parseManualScoringLine(
  line: string,
  kind: 'škála' | 'subškála',
  index: number,
): ScoringItem | null {
  const value = String(line || '').trim();
  if (!value) return null;

  const separatorCandidates = [
    value.indexOf('='),
    value.indexOf(':'),
  ].filter((position) => position >= 0);

  const separatorIndex =
    separatorCandidates.length > 0
      ? Math.min(...separatorCandidates)
      : -1;

  /*
   * Samostatný názov bez = alebo : znamená, že používateľ už má v databáze
   * hotový stĺpec škály/subškály. Nevytvárame duplicitnú premennú – stĺpec
   * sa iba zaradí medzi analytické premenné.
   */
  if (separatorIndex < 0) {
    return {
      skala: value,
      polozky: value,
      vypocet:
        'Použije sa existujúci číselný stĺpec z DATA_CLEAN bez prepočítania.',
      vyslednaPremenna: '',
      poznamka:
        kind === 'škála'
          ? 'Existujúca škálová premenná zadaná používateľom.'
          : 'Existujúca subškálová premenná zadaná používateľom.',
    };
  }

  const name = value.slice(0, separatorIndex).trim();
  const items = value.slice(separatorIndex + 1).trim();

  if (!items) return null;

  const normalizedName =
    normalizeHeaderKey(name || `${kind}_${index + 1}`)
      .toUpperCase() || `${kind === 'škála' ? 'SKALA' : 'SUBSKALA'}_${index + 1}`;

  return {
    skala: name || `${kind} ${index + 1}`,
    polozky: items,
    vypocet:
      'Priemer dostupných číselných položiek. Výpočet prebehne pri minimálne 50 % platných zadaných položiek.',
    vyslednaPremenna: `${kind === 'škála' ? 'SCALE' : 'SUBSCALE'}_${normalizedName}`,
    poznamka:
      kind === 'škála'
        ? 'Manuálne zadaná škála pred spustením analýzy dát.'
        : 'Manuálne zadaná subškála pred spustením analýzy dát.',
  };
}

function createManualScoringItems(
  questionnaireConfig: QuestionnaireConfig,
): ScoringItem[] {
  const items = [
    ...splitManualLines(questionnaireConfig.manualScalesText)
      .map((line, index) => parseManualScoringLine(line, 'škála', index))
      .filter((item): item is ScoringItem => Boolean(item)),
    ...splitManualLines(questionnaireConfig.manualSubscalesText)
      .map((line, index) => parseManualScoringLine(line, 'subškála', index))
      .filter((item): item is ScoringItem => Boolean(item)),
  ];

  const usedOutputNames = new Map<string, number>();

  return items.map((item) => {
    if (!item.vyslednaPremenna) return item;

    const baseName = item.vyslednaPremenna;
    const previousCount = usedOutputNames.get(baseName) ?? 0;
    usedOutputNames.set(baseName, previousCount + 1);

    return {
      ...item,
      vyslednaPremenna:
        previousCount === 0
          ? baseName
          : `${baseName}_${previousCount + 1}`,
    };
  });
}

function calculateScores(
  cleanRows: DataRow[],
  headers: string[],
  questionnaireConfig: QuestionnaireConfig,
): {
  rows: DataRow[];
  headers: string[];
  scoringItems: ScoringItem[];
  warnings: string[];
} {
  const nextHeaders = [...headers];
  const warnings: string[] = [];
  const manualScoringItems = createManualScoringItems(questionnaireConfig);
  const scoringItems: ScoringItem[] = [...manualScoringItems];

  const wemColumns = Array.from({ length: 14 }, (_, index) => `WEM${index + 1}`);
  const jssColumns = Array.from({ length: 36 }, (_, index) => `JSS${index + 1}`);

  const selectedLegacyWem =
    questionnaireConfig.mode === 'selected' &&
    questionnaireConfig.selectedQuestionnaires.includes('wemwbs');
  const selectedLegacyJss =
    questionnaireConfig.mode === 'selected' &&
    questionnaireConfig.selectedQuestionnaires.includes('jss');

  const autoHasAnyWem = wemColumns.some((column) => nextHeaders.includes(column));
  const autoHasAllWem = hasColumns(nextHeaders, wemColumns);
  const autoHasAnyJss = jssColumns.some((column) => nextHeaders.includes(column));
  const autoHasAllJss = hasColumns(nextHeaders, jssColumns);

  const hasAnyWem = selectedLegacyWem && autoHasAnyWem;
  const hasAnyJss = selectedLegacyJss && autoHasAnyJss;

  if (selectedLegacyWem && !autoHasAnyWem) {
    warnings.push(
      'Používateľ v starom režime vybral WEMWBS, ale položky WEM1–WEM14 sa nepodarilo nájsť ani vytvoriť. Skontrolujte názvy alebo poradie stĺpcov.',
    );
  }

  if (selectedLegacyJss && !autoHasAnyJss) {
    warnings.push(
      'Používateľ v starom režime vybral JSS, ale položky JSS1–JSS36 sa nepodarilo nájsť ani vytvoriť. Skontrolujte názvy alebo poradie stĺpcov.',
    );
  }

  if (hasAnyWem) {
    if (!nextHeaders.includes('WEMWBS_skore')) nextHeaders.push('WEMWBS_skore');
    if (!nextHeaders.includes('WEMWBS_priemer')) nextHeaders.push('WEMWBS_priemer');

    scoringItems.push(
      {
        skala: 'WEMWBS',
        polozky: 'WEM1–WEM14',
        vypocet: 'Súčet dostupných položiek WEM1 až WEM14.',
        vyslednaPremenna: 'WEMWBS_skore',
        poznamka: autoHasAllWem
          ? 'Všetkých 14 položiek bolo nájdených.'
          : 'Niektoré položky chýbajú; skóre sa počíta iba z dostupných položiek.',
      },
      {
        skala: 'WEMWBS priemer',
        polozky: 'WEM1–WEM14',
        vypocet: 'Priemer dostupných položiek WEM1 až WEM14.',
        vyslednaPremenna: 'WEMWBS_priemer',
        poznamka: 'Pomocná škálová premenná pre kontrolu a deskriptívu.',
      },
    );

    if (!autoHasAllWem) {
      warnings.push(
        'Neboli nájdené všetky položky WEM1–WEM14. WEMWBS skóre sa vypočíta iba z dostupných položiek.',
      );
    }
  }

  if (hasAnyJss) {
    if (!nextHeaders.includes('JSS_skore')) nextHeaders.push('JSS_skore');
    if (!nextHeaders.includes('JSS_priemer')) nextHeaders.push('JSS_priemer');

    Object.keys(JSS_SUBSCALES).forEach((subscaleName) => {
      if (!nextHeaders.includes(subscaleName)) nextHeaders.push(subscaleName);
    });

    scoringItems.push(
      {
        skala: 'JSS',
        polozky: 'JSS1–JSS36',
        vypocet:
          'Súčet dostupných položiek JSS1–JSS36; reverzné položky sú prepočítané pravidlom 7 - hodnota.',
        vyslednaPremenna: 'JSS_skore',
        poznamka: autoHasAllJss
          ? 'Všetkých 36 položiek bolo nájdených.'
          : 'Niektoré položky chýbajú; skóre sa počíta iba z dostupných položiek.',
      },
      {
        skala: 'JSS priemer',
        polozky: 'JSS1–JSS36',
        vypocet: 'Priemer dostupných reverzne upravených položiek JSS1–JSS36.',
        vyslednaPremenna: 'JSS_priemer',
        poznamka: 'Pomocná škálová premenná pre kontrolu a deskriptívu.',
      },
    );

    Object.entries(JSS_SUBSCALES).forEach(([subscaleName, itemNumbers]) => {
      scoringItems.push({
        skala: subscaleName,
        polozky: itemNumbers.map((itemNumber) => `JSS${itemNumber}`).join(', '),
        vypocet:
          'Súčet dostupných položiek subškály; reverzné položky sú prepočítané pravidlom 7 - hodnota.',
        vyslednaPremenna: subscaleName,
        poznamka: 'Subškála pracovnej spokojnosti podľa štruktúry JSS.',
      });
    });

    if (!autoHasAllJss) {
      warnings.push(
        'Neboli nájdené všetky položky JSS1–JSS36. JSS skóre a subškály sa vypočítajú iba z dostupných položiek.',
      );
    }
  }

  const manualRuntime = createManualScoringRuntime(
    manualScoringItems,
    nextHeaders,
  );

  manualRuntime.forEach((runtime) => {
    if (!runtime.item.vyslednaPremenna) {
      if (runtime.matchedColumns.length === 1) {
        runtime.item.polozky = runtime.matchedColumns[0];
        runtime.item.vypocet =
          'Použije sa existujúci číselný stĺpec bez prepočítania.';
        runtime.item.poznamka =
          `Existujúca analytická premenná bola nájdená v DATA_CLEAN: ${runtime.matchedColumns[0]}.`;
      } else {
        warnings.push(
          `Zadanú existujúcu škálu/subškálu „${runtime.item.skala}“ sa nepodarilo jednoznačne nájsť v DATA_CLEAN.`,
        );
      }
      return;
    }

    if (runtime.matchedColumns.length === 0) {
      warnings.push(
        `Škála/subškála „${runtime.item.skala}“ nebola vypočítaná, pretože sa nenašla žiadna zadaná položka.`,
      );
      return;
    }

    let outputName = runtime.item.vyslednaPremenna;
    let suffix = 2;

    while (nextHeaders.includes(outputName)) {
      outputName = `${runtime.item.vyslednaPremenna}_${suffix}`;
      suffix += 1;
    }

    runtime.item.vyslednaPremenna = outputName;
    nextHeaders.push(outputName);

    runtime.item.polozky = runtime.requestedItems.join(', ');
    runtime.item.vypocet =
      `Priemer položiek: ${runtime.matchedColumns.join(', ')}. Výpočet prebehne pri minimálne ${runtime.minRequiredItems} z ${runtime.matchedColumns.length} nájdených položiek.`;
    runtime.item.poznamka = runtime.missingItems.length > 0
      ? `Nenájdené položky: ${runtime.missingItems.join(', ')}.`
      : 'Všetky zadané položky boli nájdené.';
  });

  const rows = cleanRows.map((row) => {
    const nextRow: DataRow = { ...row };

    if (hasAnyWem) {
      const values = wemColumns.map((column) => toNumber(nextRow[column]));
      nextRow.WEMWBS_skore = sumExistingValues(values);
      nextRow.WEMWBS_priemer = averageExistingValues(values);
    }

    if (hasAnyJss) {
      const values = jssColumns.map((column, index) =>
        reverseJssValue(index + 1, nextRow[column]),
      );

      nextRow.JSS_skore = sumExistingValues(values);
      nextRow.JSS_priemer = averageExistingValues(values);

      Object.entries(JSS_SUBSCALES).forEach(([subscaleName, itemNumbers]) => {
        nextRow[subscaleName] = sumExistingValues(
          itemNumbers.map((itemNumber) =>
            reverseJssValue(itemNumber, nextRow[`JSS${itemNumber}`]),
          ),
        );
      });
    }

    manualRuntime.forEach((runtime) => {
      if (!runtime.item.vyslednaPremenna || runtime.matchedColumns.length === 0) {
        return;
      }

      const values = runtime.matchedColumns
        .map((column) => toNumber(nextRow[column]))
        .filter((value): value is number => value !== null);

      nextRow[runtime.item.vyslednaPremenna] =
        values.length >= runtime.minRequiredItems
          ? Number(
              (
                values.reduce((sum, value) => sum + value, 0) /
                values.length
              ).toFixed(4),
            )
          : null;
    });

    return nextRow;
  });

  return {
    rows,
    headers: nextHeaders,
    scoringItems,
    warnings,
  };
}

function getVariableType(column: string, rows: DataRow[]): string {
  const values = rows
    .map((row) => row[column])
    .filter((value) => !isEmptyCell(value));

  if (!values.length) {
    return 'neurčený';
  }

  const numericCount = values.filter((value) => toNumber(value) !== null).length;
  const numericRatio = numericCount / values.length;

  const uniqueValues = new Set(values.map((value) => String(value))).size;

  if (
    column === 'POHLAVIE' ||
    column === 'RODINNY_STAV' ||
    column === 'TYP_PODNIKU'
  ) {
    return 'kategorizovaná';
  }

  if (/^(WEM|JSS)\d+$/.test(column)) {
    return 'ordinálna / škálová položka';
  }

  if (
    column.endsWith('_skore') ||
    column.endsWith('_priemer') ||
    column.startsWith('SCALE_') ||
    column.startsWith('SUBSCALE_') ||
    column.startsWith('JSS_') ||
    column === 'Vek'
  ) {
    return 'číselná / škálová';
  }

  if (numericRatio >= 0.85 && uniqueValues > 8) {
    return 'číselná';
  }

  if (uniqueValues <= 12) {
    return 'kategorizovaná';
  }

  return 'textová';
}

function getVariableDescription(column: string): string {
  if (column === 'ID') return 'Identifikátor respondenta alebo záznamu.';
  if (column === 'POHLAVIE') return 'Pohlavie respondenta.';
  if (column === 'Vek') return 'Vek respondenta.';
  if (column === 'RODINNY_STAV') return 'Rodinný stav respondenta.';
  if (column === 'TYP_PODNIKU') return 'Typ podniku alebo organizácie.';
  if (/^WEM\d+$/.test(column)) return 'Položka škály WEMWBS.';
  if (column === 'WEMWBS_skore') return 'Celkové skóre psychickej pohody podľa WEMWBS.';
  if (column === 'WEMWBS_priemer') return 'Priemerné skóre položiek WEMWBS.';
  if (/^JSS\d+$/.test(column)) return 'Položka škály Job Satisfaction Survey.';
  if (column === 'JSS_skore') return 'Celkové skóre pracovnej spokojnosti podľa JSS.';
  if (column === 'JSS_priemer') return 'Priemerné skóre položiek JSS.';
  if (column.startsWith('JSS_')) return 'Subškála pracovnej spokojnosti podľa JSS.';
  if (column.startsWith('SCALE_')) return 'Vypočítaná celková škálová premenná podľa manuálne zadaných položiek.';
  if (column.startsWith('SUBSCALE_')) return 'Vypočítaná subškálová premenná podľa manuálne zadaných položiek.';

  return 'Premenná importovaná z pôvodného dátového súboru.';
}

function getVariableUsage(column: string): string {
  if (column === 'ID') return 'identifikácia';
  if (column === 'POHLAVIE') return 'demografia, frekvencie, rozdielové testy';
  if (column === 'Vek') return 'deskriptívna štatistika, korelácie, regresia';
  if (column === 'RODINNY_STAV') return 'demografia, frekvencie, rozdielové testy';
  if (column === 'TYP_PODNIKU') return 'demografia, frekvencie, rozdielové testy';
  if (/^WEM\d+$/.test(column)) return 'výpočet WEMWBS skóre';
  if (column === 'WEMWBS_skore') return 'hlavná škálová premenná, hypotézy';
  if (column === 'WEMWBS_priemer') return 'kontrola a deskriptívna štatistika';
  if (/^JSS\d+$/.test(column)) return 'výpočet JSS skóre a subškál';
  if (column === 'JSS_skore') return 'hlavná škálová premenná, hypotézy';
  if (column === 'JSS_priemer') return 'kontrola a deskriptívna štatistika';
  if (column.startsWith('JSS_')) return 'subškálová analýza';
  if (column.startsWith('SCALE_') || column.startsWith('SUBSCALE_')) {
    return 'deskriptíva, normalita, reliabilita, korelácie a rozdielové testy';
  }

  return 'doplnková premenná';
}

function getVariableValues(column: string): string {
  if (column === 'POHLAVIE') {
    return 'napr. muž / žena alebo 1 / 2';
  }

  if (column === 'RODINNY_STAV') {
    return 'kategórie podľa dotazníka';
  }

  if (column === 'TYP_PODNIKU') {
    return 'kategórie podľa dotazníka';
  }

  if (/^WEM\d+$/.test(column)) {
    return 'typicky 1–5';
  }

  if (/^JSS\d+$/.test(column)) {
    return 'typicky 1–6';
  }

  if (
    column.endsWith('_skore') ||
    column.endsWith('_priemer') ||
    column.startsWith('SCALE_') ||
    column.startsWith('SUBSCALE_') ||
    column.startsWith('JSS_') ||
    column === 'Vek'
  ) {
    return 'číselná hodnota';
  }

  return '';
}

function createVariableDictionary(
  headers: string[],
  originalHeaders: string[],
  rows: DataRow[],
): VariableDictionaryItem[] {
  return headers.map((header, index) => ({
    premenna: header,
    povodnyNazov: originalHeaders[index] || header,
    popis: getVariableDescription(header),
    typ: getVariableType(header, rows),
    hodnoty: getVariableValues(header),
    pouzitie: getVariableUsage(header),
  }));
}

function countMissingValues(rows: DataRow[], headers: string[]): number {
  let missing = 0;

  rows.forEach((row) => {
    headers.forEach((header) => {
      if (isEmptyCell(row[header])) {
        missing += 1;
      }
    });
  });

  return missing;
}

function countInvalidRanges(rows: DataRow[], headers: string[]): {
  count: number;
  warnings: string[];
} {
  let count = 0;
  const warnings: string[] = [];

  const checkRange = (
    column: string,
    min: number,
    max: number,
    label: string,
  ) => {
    if (!headers.includes(column)) {
      return;
    }

    const invalidRows = rows.filter((row) => {
      const number = toNumber(row[column]);

      if (number === null) {
        return false;
      }

      return number < min || number > max;
    });

    if (invalidRows.length > 0) {
      count += invalidRows.length;
      warnings.push(
        `${label}: stĺpec ${column} obsahuje ${invalidRows.length} hodnôt mimo rozsahu ${min}–${max}.`,
      );
    }
  };

  for (let index = 1; index <= 14; index += 1) {
    checkRange(`WEM${index}`, 1, 5, 'Kontrola WEMWBS');
  }

  for (let index = 1; index <= 36; index += 1) {
    checkRange(`JSS${index}`, 1, 6, 'Kontrola JSS');
  }

  if (headers.includes('Vek')) {
    const invalidAgeRows = rows.filter((row) => {
      const number = toNumber(row.Vek);

      if (number === null) {
        return false;
      }

      return number < 10 || number > 100;
    });

    if (invalidAgeRows.length > 0) {
      count += invalidAgeRows.length;
      warnings.push(
        `Kontrola veku: stĺpec Vek obsahuje ${invalidAgeRows.length} podozrivých hodnôt mimo rozsahu 10–100.`,
      );
    }
  }

  return {
    count,
    warnings,
  };
}

function createQualityReport(params: {
  rawRows: DataRow[];
  cleanRows: DataRow[];
  headers: string[];
  warnings: string[];
  scoringItems: ScoringItem[];
}): QualityReportItem[] {
  const {
    rawRows,
    cleanRows,
    headers,
    warnings,
    scoringItems,
  } = params;

  const missingValues = countMissingValues(cleanRows, headers);
  const totalCells = cleanRows.length * headers.length;
  const missingPercent =
    totalCells > 0 ? Number(((missingValues / totalCells) * 100).toFixed(2)) : 0;

  const rangeControl = countInvalidRanges(cleanRows, headers);

  const hasWemScore = headers.includes('WEMWBS_skore');
  const hasJssScore = headers.includes('JSS_skore');
  const hasManualScoring = scoringItems.length > 0;

  return [
    {
      kontrola: 'Počet pôvodných riadkov',
      vysledok: rawRows.length,
      stav: rawRows.length > 0 ? 'ok' : 'error',
      poznamka: rawRows.length > 0 ? 'Dáta boli načítané.' : 'Súbor neobsahuje dáta.',
    },
    {
      kontrola: 'Počet pripravených riadkov',
      vysledok: cleanRows.length,
      stav: cleanRows.length > 0 ? 'ok' : 'error',
      poznamka:
        cleanRows.length > 0
          ? 'Dáta boli pripravené pre štatistiku.'
          : 'Nie sú dostupné žiadne pripravené dáta.',
    },
    {
      kontrola: 'Počet premenných',
      vysledok: headers.length,
      stav: headers.length > 0 ? 'ok' : 'error',
      poznamka:
        headers.length > 0
          ? 'Premenné boli identifikované a štandardizované.'
          : 'Neboli identifikované premenné.',
    },
    {
      kontrola: 'Chýbajúce hodnoty',
      vysledok: `${missingValues} (${missingPercent} %)`,
      stav:
        missingPercent === 0
          ? 'ok'
          : missingPercent <= 10
            ? 'warning'
            : 'error',
      poznamka:
        missingPercent === 0
          ? 'Bez chýbajúcich hodnôt.'
          : 'Pred interpretáciou treba pracovať s validnými percentami a skontrolovať rozsah chýbania.',
    },
    {
      kontrola: 'Manuálne škály a subškály',
      vysledok: hasManualScoring ? scoringItems.length : 'nezadané',
      stav: hasManualScoring ? 'ok' : 'warning',
      poznamka: hasManualScoring
        ? 'Používateľom zadané škály/subškály boli zapísané do SCORING a odovzdajú sa do štatistického výpočtu.'
        : 'Neboli zadané manuálne škály ani subškály. Systém nevykoná fallback na vek, ID ani jednotlivé položky.',
    },
    {
      kontrola: 'Legacy WEMWBS/JSS skóre',
      vysledok: hasWemScore || hasJssScore ? 'vytvorené v režime spätnej kompatibility' : 'nepoužité',
      stav: 'ok',
      poznamka:
        'Pevné dotazníky WEMWBS/JSS už nie sú hlavný workflow. Používateľ má zadávať škály a subškály ručne.',
    },
    {
      kontrola: 'Výpočtové pravidlá',
      vysledok: scoringItems.length,
      stav: scoringItems.length > 0 ? 'ok' : 'warning',
      poznamka:
        scoringItems.length > 0
          ? 'Bol vytvorený list SCORING s pravidlami výpočtu.'
          : 'Neboli vytvorené žiadne výpočtové pravidlá.',
    },
    {
      kontrola: 'Kontrola rozsahov',
      vysledok: rangeControl.count,
      stav:
        rangeControl.count === 0
          ? 'ok'
          : rangeControl.count <= 10
            ? 'warning'
            : 'error',
      poznamka:
        rangeControl.count === 0
          ? 'Neboli zistené hodnoty mimo očakávaných rozsahov.'
          : 'Niektoré položky obsahujú hodnoty mimo očakávaného rozsahu.',
    },
    {
      kontrola: 'Upozornenia',
      vysledok: warnings.length + rangeControl.warnings.length,
      stav:
        warnings.length + rangeControl.warnings.length === 0
          ? 'ok'
          : 'warning',
      poznamka:
        warnings.length + rangeControl.warnings.length === 0
          ? 'Bez upozornení.'
          : 'Pozri upozornenia vo výstupe API a v liste QUALITY_REPORT.',
    },
  ];
}

function roundStat(value: number | null | undefined, digits = 4): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function compactPValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '';
  if (value < 0.001) return '< .001';
  return roundStat(value, 4)?.toString() ?? '';
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleVariance(values: number[]): number | null {
  if (values.length < 2) return null;
  const valueMean = mean(values);
  if (valueMean === null) return null;
  return values.reduce((sum, value) => sum + (value - valueMean) ** 2, 0) / (values.length - 1);
}

function standardDeviation(values: number[]): number | null {
  const variance = sampleVariance(values);
  return variance === null ? null : Math.sqrt(variance);
}

function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  const next = sorted[base + 1];
  if (next === undefined) return sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

function median(values: number[]): number | null {
  return quantile(values, 0.5);
}

function numericValues(rows: DataRow[], column: string): number[] {
  return rows
    .map((row) => toNumber(row[column]))
    .filter((value): value is number => value !== null);
}

function nonEmptyValues(rows: DataRow[], column: string): RowValue[] {
  return rows
    .map((row) => row[column])
    .filter((value): value is RowValue => !isEmptyCell(value));
}

function uniqueValues(rows: DataRow[], column: string): string[] {
  return Array.from(new Set(nonEmptyValues(rows, column).map((value) => String(value))));
}

function numericRatio(rows: DataRow[], column: string): number {
  const values = nonEmptyValues(rows, column);
  if (!values.length) return 0;
  const numericCount = values.filter((value) => toNumber(value) !== null).length;
  return numericCount / values.length;
}

function isIdentifierLike(column: string, rows: DataRow[]): boolean {
  const normalized = normalizeHeaderKey(column).toLowerCase();

  if (
    normalized === 'id' ||
    normalized === 'index' ||
    normalized === 'poradie' ||
    normalized === 'poradove_cislo' ||
    normalized === 'cislo_respondenta' ||
    normalized.includes('respondent_id') ||
    normalized.includes('identifikator') ||
    normalized.includes('identifier') ||
    normalized.endsWith('_id')
  ) {
    return true;
  }

  /*
   * Samotná jedinečnosť číselných hodnôt nestačí na označenie premennej ako ID.
   * Kontinuálne skóre môže mať tiež jedinečnú hodnotu v každom riadku.
   */
  const values = numericValues(rows, column);

  if (values.length < 3 || values.some((value) => !Number.isInteger(value))) {
    return false;
  }

  const sorted = Array.from(new Set(values)).sort((a, b) => a - b);
  const sequential = sorted.every(
    (value, index) => index === 0 || value - sorted[index - 1] === 1,
  );

  return (
    sequential &&
    sorted.length === values.length &&
    /(?:^|_)(cislo|number|no|poradie|row)(?:_|$)/.test(normalized)
  );
}

function getJaspMeasureType(column: string, rows: DataRow[]): 'Scale' | 'Ordinal' | 'Nominal' | 'Text' {
  const values = nonEmptyValues(rows, column);
  if (!values.length) return 'Text';

  const ratio = numericRatio(rows, column);
  const unique = uniqueValues(rows, column).length;
  const normalized = normalizeHeaderKey(column).toLowerCase();

  if (isIdentifierLike(column, rows)) return 'Nominal';

  if (
    ratio >= 0.85 &&
    (
      unique > 7 ||
      normalized.includes('score') ||
      normalized.includes('skore') ||
      normalized.includes('priemer') ||
      normalized.startsWith('scale_') ||
      normalized.startsWith('subscale_') ||
      normalized === 'vek'
    )
  ) {
    return 'Scale';
  }

  if (ratio >= 0.85) return 'Ordinal';
  if (unique <= 30) return 'Nominal';
  return 'Text';
}

function isItemLevelColumnName(column: string): boolean {
  const normalized = normalizeHeaderKey(column).toLowerCase();
  const compact = normalized.replace(/_/g, '');

  return (
    /^(wem|jss|sehs|rs|swls|pss|phq|gad|bdi)\d+$/.test(compact) ||
    /^(item|polozka|otazka|question|q)\d+$/.test(compact) ||
    /(?:^|_)(item|polozka|otazka|question)(?:_|\d|$)/.test(normalized)
  );
}

function isLikelyPrecomputedScaleColumn(
  column: string,
  rows: DataRow[],
): boolean {
  if (numericValues(rows, column).length < 3) return false;
  if (isIdentifierLike(column, rows) || isItemLevelColumnName(column)) return false;

  const normalized = normalizeHeaderKey(column).toLowerCase();
  const compact = normalized.replace(/_/g, '');

  const explicitName =
    normalized.startsWith('scale_') ||
    normalized.startsWith('subscale_') ||
    /(?:^|_)(skore|score|priemer|mean|total|celkom|index|sum)(?:_|$)/.test(normalized) ||
    /(?:_)(skore|score|priemer|mean|total|celkom|index|sum)$/.test(normalized);

  const knownScaleName =
    /(wemwbs|jssskore|sehs|rezilien|resilien|rs25|swls|pss|phq|gad|bdi|covital|sebauci|empati)/.test(compact);

  return explicitName || knownScaleName;
}

function getConfiguredAnalysisColumns(
  headers: string[],
  rows: DataRow[],
  scoringItems: ScoringItem[],
): string[] {
  const output: string[] = [];

  scoringItems.forEach((item) => {
    if (
      item.vyslednaPremenna &&
      headers.includes(item.vyslednaPremenna) &&
      numericValues(rows, item.vyslednaPremenna).length >= 3
    ) {
      output.push(item.vyslednaPremenna);
    }

    const requestedItems = parseManualItemTokens(item.polozky);

    if (requestedItems.length === 1) {
      const existingColumn = findMatchingHeader(headers, requestedItems[0]);

      if (
        existingColumn &&
        numericValues(rows, existingColumn).length >= 3
      ) {
        output.push(existingColumn);
      }
    }
  });

  return Array.from(new Set(output));
}

function getNumericAnalysisColumns(
  headers: string[],
  rows: DataRow[],
  scoringItems: ScoringItem[] = [],
): string[] {
  const configuredColumns = getConfiguredAnalysisColumns(
    headers,
    rows,
    scoringItems,
  );

  const precomputedColumns = headers.filter((header) =>
    isLikelyPrecomputedScaleColumn(header, rows),
  );

  /*
   * Zámerne nepoužívame všeobecný fallback na všetky číselné alebo ordinálne
   * premenné. Od JASP_DESCRIPTIVES ďalej sa analyzujú iba vypočítané,
   * používateľom zadané alebo jasne pomenované existujúce škály/subškály.
   * Vek, ID a jednotlivé položky sa tým nemiešajú do korelácií a testov.
   */
  return Array.from(
    new Set([...configuredColumns, ...precomputedColumns]),
  ).slice(0, 60);
}

function getGroupingColumns(
  headers: string[],
  rows: DataRow[],
  questionnaireConfig: QuestionnaireConfig,
): string[] {
  const requested = parseManualItemTokens(questionnaireConfig.groupingColumnsText)
    .map((item) => findMatchingHeader(headers, item))
    .filter((item): item is string => Boolean(item))
    .filter((item) => !isIdentifierLike(item, rows));

  if (requested.length > 0) {
    return Array.from(new Set(requested));
  }

  /*
   * Manuálny workflow je striktne riadený tromi vstupnými kolónkami.
   * Keď používateľ skupinové premenné nezadá, nevytvárame automatické testy
   * podľa náhodne zvolených kategorizovaných stĺpcov.
   */
  if (
    questionnaireConfig.mode === 'manual' ||
    questionnaireConfig.mode === 'none'
  ) {
    return [];
  }

  return headers
    .filter((header) => {
      if (isIdentifierLike(header, rows)) return false;
      const measure = getJaspMeasureType(header, rows);
      const unique = uniqueValues(rows, header).length;
      return (
        (measure === 'Nominal' || measure === 'Ordinal') &&
        unique >= 2 &&
        unique <= 10
      );
    })
    .slice(0, 12);
}

function createJaspSummary(params: {
  fileName: string;
  rows: DataRow[];
  headers: string[];
  scoringItems: ScoringItem[];
  numericColumns: string[];
  groupingColumns: string[];
}): JaspTableRow[] {
  return [
    { parameter: 'Softvérový štýl', value: 'JASP-like report', note: 'Výstup je pripravený ako univerzálny štatistický report pre ľubovoľnú databázu.' },
    { parameter: 'Zdrojový súbor', value: params.fileName, note: '' },
    { parameter: 'Respondenti / riadky', value: params.rows.length, note: '' },
    { parameter: 'Premenné / stĺpce', value: params.headers.length, note: '' },
    { parameter: 'Číselné premenné pre štatistiku', value: params.numericColumns.length, note: params.numericColumns.slice(0, 15).join(', ') },
    { parameter: 'Skupinové premenné', value: params.groupingColumns.length, note: params.groupingColumns.slice(0, 15).join(', ') },
    { parameter: 'Manuálne škály/subškály', value: params.scoringItems.length, note: params.scoringItems.map((item) => item.skala).slice(0, 15).join(', ') },
  ];
}

function createJaspVariables(
  headers: string[],
  rows: DataRow[],
  analysisColumns: string[],
  groupingColumns: string[],
): JaspTableRow[] {
  const analysisSet = new Set(analysisColumns);
  const groupingSet = new Set(groupingColumns);

  return headers.map((header) => {
    const values = nonEmptyValues(rows, header);
    const missing = rows.length - values.length;
    const unique = uniqueValues(rows, header).length;
    const numbers = numericValues(rows, header);

    let useAs = 'Frequency / Supporting variable';
    if (analysisSet.has(header)) useAs = 'Dependent / Scale variable';
    if (groupingSet.has(header)) useAs = 'Factor / Grouping variable';
    if (isItemLevelColumnName(header)) useAs = 'Item-level variable / 22_POLOZKY';

    return {
      variable: header,
      measure: getJaspMeasureType(header, rows),
      type:
        numbers.length / Math.max(values.length, 1) >= 0.85
          ? 'Numeric'
          : 'Text / Factor',
      valid: values.length,
      missing,
      missing_percent:
        rows.length > 0
          ? roundStat((missing / rows.length) * 100, 2)
          : 0,
      unique_values: unique,
      use_as: useAs,
    };
  });
}

function createJaspDescriptives(
  headers: string[],
  rows: DataRow[],
  scoringItems: ScoringItem[],
): JaspTableRow[] {
  const output = getNumericAnalysisColumns(headers, rows, scoringItems).map(
    (column) => {
      const values = numericValues(rows, column);
      const valueMean = mean(values);
      const sd = standardDeviation(values);
      const q1 = quantile(values, 0.25);
      const q3 = quantile(values, 0.75);
      const med = median(values);
      const min = values.length ? Math.min(...values) : null;
      const max = values.length ? Math.max(...values) : null;
      const variance = sampleVariance(values);
      const se = sd !== null && values.length > 0
        ? sd / Math.sqrt(values.length)
        : null;
      const skewness = computeSkewness(values);
      const kurtosis = computeKurtosisExcess(values);
      const seSkewness = values.length >= 3
        ? Math.sqrt((6 * values.length * (values.length - 1)) / ((values.length - 2) * (values.length + 1) * (values.length + 3)))
        : null;
      const seKurtosis = values.length >= 4 && seSkewness !== null
        ? 2 * seSkewness * Math.sqrt((values.length ** 2 - 1) / ((values.length - 3) * (values.length + 5)))
        : null;

      return {
        variable: column,
        valid: values.length,
        missing: rows.length - values.length,
        median: roundStat(med),
        mean: roundStat(valueMean),
        std_deviation: roundStat(sd),
        std_error_mean: roundStat(se),
        variance: roundStat(variance),
        skewness: roundStat(skewness),
        std_error_skewness: roundStat(seSkewness),
        kurtosis: roundStat(kurtosis),
        std_error_kurtosis: roundStat(seKurtosis),
        minimum: roundStat(min),
        maximum: roundStat(max),
        q1: roundStat(q1),
        q3: roundStat(q3),
        iqr:
          q1 !== null && q3 !== null
            ? roundStat(q3 - q1)
            : null,
        ci95_lower:
          valueMean !== null && se !== null
            ? roundStat(valueMean - 1.96 * se)
            : null,
        ci95_upper:
          valueMean !== null && se !== null
            ? roundStat(valueMean + 1.96 * se)
            : null,
      };
    },
  );

  return output.length
    ? output
    : [
        {
          variable: '',
          valid: 0,
          missing: rows.length,
          note:
            'Nebola nájdená používateľom zadaná, vypočítaná ani jasne pomenovaná škála/subškála.',
        },
      ];
}

function computeSkewness(values: number[]): number | null {
  if (values.length < 3) return null;
  const valueMean = mean(values);
  const sd = standardDeviation(values);
  if (valueMean === null || sd === null || sd === 0) return null;
  const n = values.length;
  const thirdMoment = values.reduce((sum, value) => sum + ((value - valueMean) / sd) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * thirdMoment;
}

function computeKurtosisExcess(values: number[]): number | null {
  if (values.length < 4) return null;
  const valueMean = mean(values);
  const sd = standardDeviation(values);
  if (valueMean === null || sd === null || sd === 0) return null;
  const n = values.length;
  const fourth = values.reduce((sum, value) => sum + ((value - valueMean) / sd) ** 4, 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * fourth - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

function createJaspFrequencies(headers: string[], rows: DataRow[]): JaspTableRow[] {
  const candidateColumns = headers.filter((header) => {
    const measure = getJaspMeasureType(header, rows);
    const unique = uniqueValues(rows, header).length;
    return !isIdentifierLike(header, rows) && (measure !== 'Scale' || unique <= 20) && unique > 0 && unique <= 50;
  }).slice(0, 60);

  const output: JaspTableRow[] = [];

  candidateColumns.forEach((column) => {
    const values = nonEmptyValues(rows, column).map((value) => String(value));
    const total = values.length;
    const counts = new Map<string, number>();

    values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

    Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 50)
      .forEach(([value, count]) => {
        output.push({
          variable: column,
          value,
          count,
          percent: total > 0 ? roundStat((count / total) * 100, 2) : 0,
          valid_percent: total > 0 ? roundStat((count / total) * 100, 2) : 0,
        });
      });
  });

  return output.length ? output : [{ variable: '', value: '', count: 0, percent: 0, valid_percent: 0 }];
}

function createJaspItemDescriptives(
  headers: string[],
  rows: DataRow[],
): JaspTableRow[] {
  const itemColumns = headers
    .filter((header) => isItemLevelColumnName(header))
    .filter((header) => numericValues(rows, header).length > 0)
    .slice(0, 250);

  const output = itemColumns.map((column) => {
    const values = numericValues(rows, column);
    const q1 = quantile(values, 0.25);
    const q3 = quantile(values, 0.75);

    return {
      item: column,
      valid: values.length,
      missing: rows.length - values.length,
      mean: roundStat(mean(values)),
      std_deviation: roundStat(standardDeviation(values)),
      median: roundStat(median(values)),
      minimum: values.length ? roundStat(Math.min(...values)) : null,
      maximum: values.length ? roundStat(Math.max(...values)) : null,
      q1: roundStat(q1),
      q3: roundStat(q3),
      iqr:
        q1 !== null && q3 !== null
          ? roundStat(q3 - q1)
          : null,
    };
  });

  return output.length
    ? output
    : [
        {
          item: '',
          valid: 0,
          missing: rows.length,
          note: 'Neboli rozpoznané explicitne pomenované položkové premenné.',
        },
      ];
}

function cronbachAlpha(rows: DataRow[], columns: string[]): {
  alpha: number | null;
  completeRows: number;
  itemCount: number;
  note: string;
} {
  if (columns.length < 2) {
    return { alpha: null, completeRows: 0, itemCount: columns.length, note: 'Cronbachovo alfa vyžaduje minimálne 2 položky.' };
  }

  const itemValues = columns.map(() => [] as number[]);
  const totals: number[] = [];

  rows.forEach((row) => {
    const values = columns.map((column) => toNumber(row[column]));
    const numericValues = values.filter((value): value is number => value !== null);

    if (numericValues.length !== columns.length) return;

    numericValues.forEach((value, index) => {
      itemValues[index].push(value);
    });

    totals.push(numericValues.reduce((sum, value) => sum + value, 0));
  });

  if (totals.length < 2) {
    return { alpha: null, completeRows: totals.length, itemCount: columns.length, note: 'Na výpočet sú potrebné aspoň 2 kompletné riadky.' };
  }

  const totalVariance = sampleVariance(totals);
  if (totalVariance === null || totalVariance <= 0) {
    return { alpha: null, completeRows: totals.length, itemCount: columns.length, note: 'Rozptyl celkového skóre je nulový.' };
  }

  const itemVarianceSum = itemValues.reduce((sum, values) => sum + (sampleVariance(values) ?? 0), 0);
  const k = columns.length;
  const alpha = (k / (k - 1)) * (1 - itemVarianceSum / totalVariance);

  return { alpha, completeRows: totals.length, itemCount: k, note: '' };
}

function interpretAlpha(alpha: number | null): string {
  if (alpha === null || !Number.isFinite(alpha)) return 'nevypočítané';
  if (alpha >= 0.9) return 'excellent';
  if (alpha >= 0.8) return 'good';
  if (alpha >= 0.7) return 'acceptable';
  if (alpha >= 0.6) return 'questionable';
  return 'low';
}

function createJaspReliability(
  rows: DataRow[],
  headers: string[],
  scoringItems: ScoringItem[],
): JaspTableRow[] {
  const runtime = createManualScoringRuntime(scoringItems, headers);
  const output: JaspTableRow[] = [];
  const processedItemSets = new Set<string>();

  runtime.forEach((item) => {
    const signature = [...item.matchedColumns]
      .sort((a, b) => a.localeCompare(b))
      .join('|');

    if (signature && processedItemSets.has(signature)) return;
    if (signature) processedItemSets.add(signature);

    if (item.matchedColumns.length < 2) {
      output.push({
        scale: item.item.skala,
        items_requested: item.requestedItems.join(', '),
        items_used: item.matchedColumns.join(', '),
        items_missing: item.missingItems.join(', '),
        cronbach_alpha: null,
        n_complete: 0,
        item_count: item.matchedColumns.length,
        interpretation: 'nevypočítané',
        note:
          item.matchedColumns.length === 1
            ? 'Ide o existujúcu výslednú škálovú premennú bez dostupných položiek. Cronbachovo alfa sa z jedného stĺpca nedá vypočítať.'
            : 'Nenašli sa aspoň dve položky. Skontrolujte názvy stĺpcov v DATA_CLEAN.',
      });
      return;
    }

    const alpha = cronbachAlpha(rows, item.matchedColumns);

    output.push({
      scale: item.item.skala,
      items_requested: item.requestedItems.join(', '),
      items_used: item.matchedColumns.join(', '),
      items_missing: item.missingItems.join(', '),
      cronbach_alpha: roundStat(alpha.alpha),
      n_complete: alpha.completeRows,
      item_count: alpha.itemCount,
      interpretation: interpretAlpha(alpha.alpha),
      note: alpha.note,
    });
  });

  return output.length
    ? output
    : [
        {
          scale: '',
          items_requested: '',
          items_used: '',
          items_missing: '',
          cronbach_alpha: null,
          n_complete: 0,
          item_count: 0,
          interpretation: 'nezadané',
          note:
            'Reliabilita sa počíta iba pre škálu/subškálu s minimálne dvoma známymi položkami.',
        },
      ];
}

function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * absX);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1 + sign * erf);
}

function logGamma(z: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }

  let x = 0.99999999999980993;
  const adjusted = z - 1;
  coefficients.forEach((coefficient, index) => {
    x += coefficient / (adjusted + index + 1);
  });
  const t = adjusted + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (adjusted + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaContinuedFraction(x: number, a: number, b: number): number {
  const maxIterations = 120;
  const epsilon = 3e-7;
  const fpMin = 1e-30;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpMin) d = fpMin;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < epsilon) break;
  }

  return h;
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(x, a, b)) / a;
  }
  return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b;
}

function studentTCdf(t: number, df: number): number {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return NaN;
  const x = df / (df + t * t);
  const ib = regularizedBeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

function fCdf(f: number, df1: number, df2: number): number {
  if (f <= 0) return 0;
  const x = (df1 * f) / (df1 * f + df2);
  return regularizedBeta(x, df1 / 2, df2 / 2);
}

function gammaLowerRegularized(s: number, x: number): number {
  if (x <= 0) return 0;
  if (x < s + 1) {
    let sum = 1 / s;
    let term = sum;
    for (let n = 1; n < 120; n += 1) {
      term *= x / (s + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-8) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
  }

  let b = x + 1 - s;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 120; i += 1) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-8) break;
  }
  return 1 - Math.exp(-x + s * Math.log(x) - logGamma(s)) * h;
}

function chiSquarePValue(chiSquare: number, df: number): number | null {
  if (!Number.isFinite(chiSquare) || !Number.isFinite(df) || df <= 0) return null;
  return 1 - gammaLowerRegularized(df / 2, chiSquare / 2);
}

function calculateNormalityScreen(values: number[]): {
  statistic: number | null;
  p: number | null;
  compatible: boolean;
  skewness: number | null;
  kurtosis: number | null;
} {
  const skewness = computeSkewness(values);
  const kurtosis = computeKurtosisExcess(values);
  const n = values.length;
  const statistic =
    n >= 4 && skewness !== null && kurtosis !== null
      ? (n / 6) * (skewness ** 2 + (kurtosis ** 2) / 4)
      : null;
  const p = statistic !== null
    ? chiSquarePValue(statistic, 2)
    : null;

  return {
    statistic,
    p,
    compatible: p !== null && p >= 0.05,
    skewness,
    kurtosis,
  };
}

function groupsCompatibleWithNormality(
  groups: Array<{ group: string; values: number[] }>,
): boolean {
  if (groups.length < 2) return false;

  return groups.every((group) => {
    if (group.values.length < 4) return false;
    const screen = calculateNormalityScreen(group.values);
    return screen.compatible;
  });
}

function createJaspNormality(
  headers: string[],
  rows: DataRow[],
  scoringItems: ScoringItem[],
): JaspTableRow[] {
  const output = getNumericAnalysisColumns(headers, rows, scoringItems).map(
    (column) => {
      const values = numericValues(rows, column);
      const screen = calculateNormalityScreen(values);

      return {
        variable: column,
        test: 'Jarque-Bera normality screen',
        statistic: roundStat(screen.statistic),
        p: compactPValue(screen.p),
        normality_flag: screen.compatible
          ? 'compatible with normality'
          : screen.p === null
            ? 'insufficient data'
            : 'deviation from normality',
        n: values.length,
        skewness: roundStat(screen.skewness),
        kurtosis: roundStat(screen.kurtosis),
        note:
          'Server-side skríning normality. Výsledok sa používa na automatické odporúčanie parametrického alebo neparametrického testu; pri záverečnej akademickej interpretácii ho treba overiť v štatistickom softvéri.',
      };
    },
  );

  return output.length
    ? output
    : [
        {
          variable: '',
          test: 'Jarque-Bera normality screen',
          statistic: null,
          p: '',
          normality_flag: 'not available',
          n: 0,
          note: 'Nebola nájdená škálová ani subškálová premenná.',
        },
      ];
}

function pearsonCorrelation(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  const mx = mean(x);
  const my = mean(y);
  if (mx === null || my === null) return null;
  const sx = standardDeviation(x);
  const sy = standardDeviation(y);
  if (sx === null || sy === null || sx === 0 || sy === 0) return null;
  const covariance = x.reduce((sum, value, index) => sum + (value - mx) * (y[index] - my), 0) / (x.length - 1);
  return covariance / (sx * sy);
}

function ranks(values: number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const output = new Array(values.length).fill(0);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].value === indexed[i].value) j += 1;
    const averageRank = (i + j + 2) / 2;
    for (let k = i; k <= j; k += 1) output[indexed[k].index] = averageRank;
    i = j + 1;
  }
  return output;
}

function createJaspCorrelations(
  headers: string[],
  rows: DataRow[],
  scoringItems: ScoringItem[],
): JaspTableRow[] {
  const columns = getNumericAnalysisColumns(headers, rows, scoringItems).slice(0, 30);
  const output: JaspTableRow[] = [];

  for (let i = 0; i < columns.length; i += 1) {
    for (let j = i + 1; j < columns.length; j += 1) {
      const a = columns[i];
      const b = columns[j];
      const pairs = rows
        .map(
          (row) =>
            [toNumber(row[a]), toNumber(row[b])] as [
              number | null,
              number | null,
            ],
        )
        .filter(
          (pair): pair is [number, number] =>
            pair[0] !== null && pair[1] !== null,
        );

      if (pairs.length < 3) continue;

      const x = pairs.map((pair) => pair[0]);
      const y = pairs.map((pair) => pair[1]);
      const r = pearsonCorrelation(x, y);
      const t =
        r !== null && Math.abs(r) < 1
          ? r * Math.sqrt((pairs.length - 2) / (1 - r * r))
          : null;
      const p =
        t !== null
          ? 2 * (1 - studentTCdf(Math.abs(t), pairs.length - 2))
          : null;
      const rho = pearsonCorrelation(ranks(x), ranks(y));
      const ts =
        rho !== null && Math.abs(rho) < 1
          ? rho * Math.sqrt((pairs.length - 2) / (1 - rho * rho))
          : null;
      const ps =
        ts !== null
          ? 2 * (1 - studentTCdf(Math.abs(ts), pairs.length - 2))
          : null;
      const normalA = calculateNormalityScreen(x).compatible;
      const normalB = calculateNormalityScreen(y).compatible;
      const recommended = normalA && normalB ? 'Pearson' : 'Spearman';
      const fisherZ =
        r !== null && Math.abs(r) < 1
          ? 0.5 * Math.log((1 + r) / (1 - r))
          : null;
      const fisherSe = pairs.length > 3
        ? 1 / Math.sqrt(pairs.length - 3)
        : null;

      output.push({
        variable_a: a,
        variable_b: b,
        n: pairs.length,
        recommended_method: recommended,
        pearson_r: roundStat(r),
        pearson_p: compactPValue(p),
        spearman_rho: roundStat(rho),
        spearman_p: compactPValue(ps),
        fisher_z: roundStat(fisherZ),
        fisher_z_se: roundStat(fisherSe),
      });
    }
  }

  return output.length
    ? output
    : [
        {
          variable_a: '',
          variable_b: '',
          n: 0,
          recommended_method: '',
          pearson_r: null,
          pearson_p: '',
          spearman_rho: null,
          spearman_p: '',
          fisher_z: null,
          fisher_z_se: null,
        },
      ];
}

function groupedNumericValues(rows: DataRow[], groupColumn: string, numericColumn: string): Array<{ group: string; values: number[] }> {
  const groups = new Map<string, number[]>();

  rows.forEach((row) => {
    const groupValue = row[groupColumn];
    const numeric = toNumber(row[numericColumn]);
    if (isEmptyCell(groupValue) || numeric === null) return;
    const group = String(groupValue);
    const values = groups.get(group) ?? [];
    values.push(numeric);
    groups.set(group, values);
  });

  return Array.from(groups.entries())
    .map(([group, values]) => ({ group, values }))
    .filter((item) => item.values.length >= 2)
    .sort((a, b) => a.group.localeCompare(b.group));
}

function welchTTest(groupA: number[], groupB: number[]): { t: number | null; df: number | null; p: number | null; d: number | null } {
  const m1 = mean(groupA);
  const m2 = mean(groupB);
  const v1 = sampleVariance(groupA);
  const v2 = sampleVariance(groupB);
  if (m1 === null || m2 === null || v1 === null || v2 === null) return { t: null, df: null, p: null, d: null };
  const n1 = groupA.length;
  const n2 = groupB.length;
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  if (se === 0) return { t: null, df: null, p: null, d: null };
  const t = (m1 - m2) / se;
  const df = ((v1 / n1 + v2 / n2) ** 2) / (((v1 / n1) ** 2) / (n1 - 1) + ((v2 / n2) ** 2) / (n2 - 1));
  const p = 2 * (1 - studentTCdf(Math.abs(t), df));
  const pooled = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const d = pooled > 0 ? (m1 - m2) / pooled : null;
  return { t, df, p, d };
}

function oneWayAnova(groups: Array<{ group: string; values: number[] }>): { f: number | null; df1: number; df2: number; p: number | null; eta2: number | null } {
  const allValues = groups.flatMap((group) => group.values);
  const grandMean = mean(allValues);
  if (grandMean === null || groups.length < 2) return { f: null, df1: groups.length - 1, df2: allValues.length - groups.length, p: null, eta2: null };
  const ssBetween = groups.reduce((sum, group) => {
    const groupMean = mean(group.values);
    return groupMean === null ? sum : sum + group.values.length * (groupMean - grandMean) ** 2;
  }, 0);
  const ssWithin = groups.reduce((sum, group) => {
    const groupMean = mean(group.values);
    return groupMean === null ? sum : sum + group.values.reduce((inner, value) => inner + (value - groupMean) ** 2, 0);
  }, 0);
  const df1 = groups.length - 1;
  const df2 = allValues.length - groups.length;
  if (df1 <= 0 || df2 <= 0 || ssWithin <= 0) return { f: null, df1, df2, p: null, eta2: null };
  const f = (ssBetween / df1) / (ssWithin / df2);
  const p = 1 - fCdf(f, df1, df2);
  const eta2 = (ssBetween + ssWithin) > 0 ? ssBetween / (ssBetween + ssWithin) : null;
  return { f, df1, df2, p, eta2 };
}

function createJaspParametricTests(
  headers: string[],
  rows: DataRow[],
  questionnaireConfig: QuestionnaireConfig,
  scoringItems: ScoringItem[],
): JaspTableRow[] {
  const numericColumns = getNumericAnalysisColumns(
    headers,
    rows,
    scoringItems,
  ).slice(0, 30);
  const groupColumns = getGroupingColumns(
    headers,
    rows,
    questionnaireConfig,
  ).slice(0, 10);
  const output: JaspTableRow[] = [];

  groupColumns.forEach((groupColumn) => {
    numericColumns.forEach((numericColumn) => {
      if (groupColumn === numericColumn) return;

      const groups = groupedNumericValues(
        rows,
        groupColumn,
        numericColumn,
      ).filter((group) => group.values.length >= 2);

      if (!groupsCompatibleWithNormality(groups)) return;

      if (groups.length === 2) {
        const test = welchTTest(groups[0].values, groups[1].values);
        output.push({
          test: 'Welch independent samples t-test',
          dependent: numericColumn,
          factor: groupColumn,
          selection_reason:
            'Parametrický test bol vybraný, pretože všetky porovnávané skupiny prešli skríningom normality.',
          groups: groups
            .map((group) => `${group.group} (n=${group.values.length})`)
            .join(' | '),
          statistic: roundStat(test.t),
          df: roundStat(test.df),
          p: compactPValue(test.p),
          effect: roundStat(test.d),
          effect_name: 'Cohen d',
          mean_group_1: roundStat(mean(groups[0].values)),
          mean_group_2: roundStat(mean(groups[1].values)),
        });
      } else if (groups.length >= 3 && groups.length <= 10) {
        const test = oneWayAnova(groups);
        output.push({
          test: 'One-way ANOVA',
          dependent: numericColumn,
          factor: groupColumn,
          selection_reason:
            'Parametrický test bol vybraný, pretože všetky porovnávané skupiny prešli skríningom normality.',
          groups: groups
            .map((group) => `${group.group} (n=${group.values.length})`)
            .join(' | '),
          statistic: roundStat(test.f),
          df: `${test.df1}, ${test.df2}`,
          p: compactPValue(test.p),
          effect: roundStat(test.eta2),
          effect_name: 'eta squared',
          mean_group_1: '',
          mean_group_2: '',
        });
      }
    });
  });

  return output.length
    ? output
    : [
        {
          test: '',
          dependent: '',
          factor: '',
          selection_reason:
            'Nebola nájdená kombinácia škály a skupinovej premennej vhodná pre parametrický test.',
          groups: '',
          statistic: null,
          df: '',
          p: '',
          effect: null,
          effect_name: '',
          mean_group_1: '',
          mean_group_2: '',
        },
      ];
}

function mannWhitney(groupA: number[], groupB: number[]): { u: number | null; z: number | null; p: number | null; effect: number | null } {
  const combined = [...groupA.map((value) => ({ value, group: 1 })), ...groupB.map((value) => ({ value, group: 2 }))];
  const rankValues = ranks(combined.map((item) => item.value));
  const r1 = rankValues.reduce((sum, rank, index) => sum + (combined[index].group === 1 ? rank : 0), 0);
  const n1 = groupA.length;
  const n2 = groupB.length;
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const u = Math.min(u1, u2);
  const meanU = (n1 * n2) / 2;
  const sdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  if (sdU === 0) return { u, z: null, p: null, effect: null };
  const z = (u - meanU) / sdU;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const effect = 1 - (2 * u) / (n1 * n2);
  return { u, z, p, effect };
}

function kruskalWallis(groups: Array<{ group: string; values: number[] }>): { h: number | null; df: number; p: number | null; effect: number | null } {
  const combined: Array<{ value: number; groupIndex: number }> = [];
  groups.forEach((group, groupIndex) => group.values.forEach((value) => combined.push({ value, groupIndex })));
  if (groups.length < 2 || combined.length <= groups.length) return { h: null, df: groups.length - 1, p: null, effect: null };
  const rankValues = ranks(combined.map((item) => item.value));
  const n = combined.length;
  let sum = 0;
  groups.forEach((group, groupIndex) => {
    const rankSum = rankValues.reduce((inner, rank, index) => inner + (combined[index].groupIndex === groupIndex ? rank : 0), 0);
    sum += (rankSum ** 2) / group.values.length;
  });
  const h = (12 / (n * (n + 1))) * sum - 3 * (n + 1);
  const df = groups.length - 1;
  const p = chiSquarePValue(h, df);
  const effect = n > groups.length ? (h - groups.length + 1) / (n - groups.length) : null;
  return { h, df, p, effect };
}

function createJaspNonParametricTests(
  headers: string[],
  rows: DataRow[],
  questionnaireConfig: QuestionnaireConfig,
  scoringItems: ScoringItem[],
): JaspTableRow[] {
  const numericColumns = getNumericAnalysisColumns(
    headers,
    rows,
    scoringItems,
  ).slice(0, 30);
  const groupColumns = getGroupingColumns(
    headers,
    rows,
    questionnaireConfig,
  ).slice(0, 10);
  const output: JaspTableRow[] = [];

  groupColumns.forEach((groupColumn) => {
    numericColumns.forEach((numericColumn) => {
      if (groupColumn === numericColumn) return;

      const groups = groupedNumericValues(
        rows,
        groupColumn,
        numericColumn,
      ).filter((group) => group.values.length >= 2);

      if (groups.length < 2 || groupsCompatibleWithNormality(groups)) return;

      if (groups.length === 2) {
        const test = mannWhitney(groups[0].values, groups[1].values);
        output.push({
          test: 'Mann-Whitney U',
          dependent: numericColumn,
          factor: groupColumn,
          selection_reason:
            'Neparametrický test bol vybraný, pretože aspoň jedna skupina neprešla skríningom normality alebo má príliš málo platných hodnôt.',
          groups: groups
            .map((group) => `${group.group} (n=${group.values.length})`)
            .join(' | '),
          statistic: roundStat(test.u),
          z: roundStat(test.z),
          df: '',
          p: compactPValue(test.p),
          effect: roundStat(test.effect),
          effect_name: 'rank-biserial correlation',
          median_group_1: roundStat(median(groups[0].values)),
          median_group_2: roundStat(median(groups[1].values)),
        });
      } else if (groups.length >= 3 && groups.length <= 10) {
        const test = kruskalWallis(groups);
        output.push({
          test: 'Kruskal-Wallis H',
          dependent: numericColumn,
          factor: groupColumn,
          selection_reason:
            'Neparametrický test bol vybraný, pretože aspoň jedna skupina neprešla skríningom normality alebo má príliš málo platných hodnôt.',
          groups: groups
            .map((group) => `${group.group} (n=${group.values.length})`)
            .join(' | '),
          statistic: roundStat(test.h),
          z: '',
          df: test.df,
          p: compactPValue(test.p),
          effect: roundStat(test.effect),
          effect_name: 'epsilon squared',
          median_group_1: '',
          median_group_2: '',
        });
      }
    });
  });

  return output.length
    ? output
    : [
        {
          test: '',
          dependent: '',
          factor: '',
          selection_reason:
            'Nebola nájdená kombinácia škály a skupinovej premennej vhodná pre neparametrický test.',
          groups: '',
          statistic: null,
          z: '',
          df: '',
          p: '',
          effect: null,
          effect_name: '',
          median_group_1: '',
          median_group_2: '',
        },
      ];
}

function createJaspTestSelection(
  headers: string[],
  rows: DataRow[],
  questionnaireConfig: QuestionnaireConfig,
  scoringItems: ScoringItem[],
): JaspTableRow[] {
  const numericColumns = getNumericAnalysisColumns(headers, rows, scoringItems);
  const groupColumns = getGroupingColumns(headers, rows, questionnaireConfig);
  const output: JaspTableRow[] = [];

  numericColumns.forEach((numericColumn) => {
    if (groupColumns.length === 0) {
      output.push({
        dependent: numericColumn,
        factor: '',
        groups: 0,
        recommended_test: 'Descriptive statistics / correlation only',
        reason:
          'Nebola zadaná skupinová premenná. Rozdielový test sa nevykoná.',
      });
      return;
    }

    groupColumns.forEach((groupColumn) => {
      const groups = groupedNumericValues(rows, groupColumn, numericColumn);
      const groupCount = groups.length;
      const parametric = groupsCompatibleWithNormality(groups);

      let recommendedTest = 'Not available';

      if (groupCount === 2) {
        recommendedTest = parametric
          ? 'Welch independent samples t-test'
          : 'Mann-Whitney U';
      } else if (groupCount >= 3 && groupCount <= 10) {
        recommendedTest = parametric
          ? 'One-way ANOVA'
          : 'Kruskal-Wallis H';
      }

      output.push({
        dependent: numericColumn,
        factor: groupColumn,
        groups: groupCount,
        recommended_test: recommendedTest,
        reason:
          groupCount < 2
            ? 'Nie sú dostupné aspoň dve skupiny s minimálne dvoma platnými hodnotami.'
            : parametric
              ? 'Všetky skupiny prešli skríningom normality.'
              : 'Aspoň jedna skupina neprešla skríningom normality alebo má menej ako štyri platné hodnoty.',
      });
    });
  });

  return output.length
    ? output
    : [
        {
          dependent: '',
          factor: '',
          groups: 0,
          recommended_test: 'Not available',
          reason:
            'Nebola nájdená používateľom zadaná, vypočítaná ani jasne pomenovaná škála/subškála.',
        },
      ];
}

function createJaspWarnings(
  headers: string[],
  rows: DataRow[],
  questionnaireConfig: QuestionnaireConfig,
  scoringItems: ScoringItem[],
): JaspTableRow[] {
  const warnings: string[] = [];
  const numericColumns = getNumericAnalysisColumns(headers, rows, scoringItems);
  const groupColumns = getGroupingColumns(headers, rows, questionnaireConfig);

  if (numericColumns.length === 0) {
    warnings.push(
      'Nebola identifikovaná používateľom zadaná, vypočítaná ani jasne pomenovaná škála/subškála. Vek, ID a jednotlivé položky sa zámerne nepoužívajú ako náhradné analytické premenné.',
    );
  }

  if (groupColumns.length === 0) {
    warnings.push(
      'Nebola zadaná skupinová premenná. Parametrické ani neparametrické testy rozdielov sa nevykonajú.',
    );
  }

  if (scoringItems.length === 0) {
    warnings.push(
      'Neboli zadané pravidlá škál/subškál. Reliabilita sa vypočíta iba vtedy, keď sú známe aspoň dve položky jednej škály.',
    );
  }

  const highMissingColumns = headers.filter((column) => {
    const missing = rows.length - nonEmptyValues(rows, column).length;
    return rows.length > 0 && missing / rows.length > 0.25;
  });

  if (highMissingColumns.length > 0) {
    warnings.push(
      `Premenné s viac ako 25 % chýbajúcich hodnôt: ${highMissingColumns
        .slice(0, 20)
        .join(', ')}.`,
    );
  }

  return warnings.length
    ? warnings.map((warning, index) => ({
        id: index + 1,
        warning,
        severity: 'warning',
      }))
    : [
        {
          id: 1,
          warning: 'Bez zásadných upozornení.',
          severity: 'ok',
        },
      ];
}

function buildJaspAnalysis(params: {
  fileName: string;
  rows: DataRow[];
  headers: string[];
  scoringItems: ScoringItem[];
  questionnaireConfig: QuestionnaireConfig;
}): JaspAnalysisResult {
  const numericColumns = getNumericAnalysisColumns(
    params.headers,
    params.rows,
    params.scoringItems,
  );
  const groupingColumns = getGroupingColumns(
    params.headers,
    params.rows,
    params.questionnaireConfig,
  );

  return {
    summary: createJaspSummary({
      fileName: params.fileName,
      rows: params.rows,
      headers: params.headers,
      scoringItems: params.scoringItems,
      numericColumns,
      groupingColumns,
    }),
    variables: createJaspVariables(
      params.headers,
      params.rows,
      numericColumns,
      groupingColumns,
    ),
    descriptives: createJaspDescriptives(
      params.headers,
      params.rows,
      params.scoringItems,
    ),
    frequencies: createJaspFrequencies(params.headers, params.rows),
    reliability: createJaspReliability(
      params.rows,
      params.headers,
      params.scoringItems,
    ),
    normality: createJaspNormality(
      params.headers,
      params.rows,
      params.scoringItems,
    ),
    correlations: createJaspCorrelations(
      params.headers,
      params.rows,
      params.scoringItems,
    ),
    parametricTests: createJaspParametricTests(
      params.headers,
      params.rows,
      params.questionnaireConfig,
      params.scoringItems,
    ),
    nonParametricTests: createJaspNonParametricTests(
      params.headers,
      params.rows,
      params.questionnaireConfig,
      params.scoringItems,
    ),
    testSelection: createJaspTestSelection(
      params.headers,
      params.rows,
      params.questionnaireConfig,
      params.scoringItems,
    ),
    itemDescriptives: createJaspItemDescriptives(
      params.headers,
      params.rows,
    ),
    warnings: createJaspWarnings(
      params.headers,
      params.rows,
      params.questionnaireConfig,
      params.scoringItems,
    ),
  };
}

function createReadmeRows(): Array<Record<string, string>> {
  return [
    {
      cast: 'DATA_RAW',
      popis:
        'Pôvodné importované dáta zo súboru. Tento list slúži ako archív pôvodného stavu.',
    },
    {
      cast: 'DATA_CLEAN',
      popis:
        'Vyčistené a štandardizované dáta vrátane vypočítaných manuálnych škál a subškál.',
    },
    {
      cast: 'VARIABLE_DICTIONARY',
      popis:
        'Dátový slovník s popisom premenných, typmi a odporúčaným použitím.',
    },
    {
      cast: 'SCORING',
      popis:
        'Pravidlá používateľom zadaných škál a subškál. Definícia môže mať tvar Názov = položka1, položka2 alebo môže obsahovať iba názov už existujúceho skórovacieho stĺpca.',
    },
    {
      cast: 'QUESTIONNAIRE_SETUP',
      popis:
        'Presný záznam režimu, škál, subškál a skupinových premenných odoslaných z Dashboardu.',
    },
    {
      cast: 'QUALITY_REPORT',
      popis:
        'Kontrola kvality pripraveného súboru pred spustením štatistiky.',
    },
    {
      cast: 'JASP_SUMMARY',
      popis:
        'Prehľad počtu riadkov, premenných, škál/subškál a skupinových premenných.',
    },
    {
      cast: 'JASP_VARIABLES',
      popis:
        'Prehľad všetkých premenných a ich použitia. Jednotlivé položky sú označené pre samostatný list 22_POLOZKY.',
    },
    {
      cast: 'JASP_DESCRIPTIVES',
      popis:
        'Deskriptívna štatistika výlučne pre používateľom zadané, vypočítané alebo jasne pomenované škály/subškály. Vek ani jednotlivé položky sa nepoužívajú ako fallback.',
    },
    {
      cast: 'JASP_FREQUENCIES',
      popis:
        'Frekvenčné tabuľky pre kategorizované a nízkokardinálne premenné.',
    },
    {
      cast: 'JASP_RELIABILITY',
      popis:
        'Cronbachovo alfa pre škály/subškály, pri ktorých sú známe minimálne dve položky.',
    },
    {
      cast: 'JASP_NORMALITY',
      popis:
        'Server-side skríning normality iba pre škály/subškály.',
    },
    {
      cast: 'JASP_CORRELATIONS',
      popis:
        'Pearsonove a Spearmanove korelácie iba medzi škálami/subškálami vrátane odporúčanej metódy, Fisherovho z a štandardnej chyby z.',
    },
    {
      cast: 'JASP_PARAMETRIC',
      popis:
        'Welchov t-test alebo jednofaktorová ANOVA iba pri skupinách kompatibilných s normalitou.',
    },
    {
      cast: 'JASP_NONPARAMETRIC',
      popis:
        'Mann-Whitney U alebo Kruskal-Wallis H pri odchýlke od normality alebo malom počte hodnôt v skupine.',
    },
    {
      cast: 'JASP_TEST_SELECTION',
      popis:
        'Odporúčaný rozdielový test pre každú kombináciu škály/subškály a používateľom zadanej skupinovej premennej.',
    },
    {
      cast: '22_POLOZKY',
      popis:
        'Samostatná deskriptíva explicitne pomenovaných položkových premenných. Položky sa nemiešajú do hlavných korelácií ani rozdielových testov.',
    },
    {
      cast: 'JASP_WARNINGS',
      popis:
        'Upozornenia k chýbajúcim škálam, skupinovým premenným, reliabilite a kvalite dát.',
    },
    {
      cast: 'DÔLEŽITÉ',
      popis:
        'Hlavný workflow je manuálny: používateľ zadáva škály, subškály a skupinové premenné v troch kolónkach. Pevné WEMWBS/JSS zostávajú iba ako spätná kompatibilita režimu selected.',
    },
  ];
}

function createQuestionnaireSetupRows(
  questionnaireConfig: QuestionnaireConfig,
): Array<Record<string, string>> {
  return [
    {
      pole: 'mode',
      hodnota: questionnaireConfig.mode,
      popis:
        'Režim prípravy dát. Pri vyplnení škál, subškál alebo skupinových premenných sa automaticky používa manual.',
    },
    {
      pole: 'selectedQuestionnaires',
      hodnota:
        questionnaireConfig.selectedQuestionnaires
          .map((id) => QUESTIONNAIRE_LABELS[id as QuestionnaireId] ?? id)
          .join(' + ') || '',
      popis:
        'Starý výber konkrétnych dotazníkov – ponechaný iba pre spätnú kompatibilitu.',
    },
    {
      pole: 'customQuestionnairesText',
      hodnota: questionnaireConfig.customQuestionnairesText || '',
      popis: 'Voľný popis dotazníka alebo metodiky.',
    },
    {
      pole: 'manualScalesText',
      hodnota: questionnaireConfig.manualScalesText || '',
      popis:
        'Manuálne zadané celkové škály. Príklad: Celková reziliencia = R1 až R25.',
    },
    {
      pole: 'manualSubscalesText',
      hodnota: questionnaireConfig.manualSubscalesText || '',
      popis:
        'Manuálne zadané subškály. Príklad: Mzda = JSS1, JSS10, JSS19, JSS28.',
    },
    {
      pole: 'groupingColumnsText',
      hodnota: questionnaireConfig.groupingColumnsText || '',
      popis:
        'Skupinové premenné pre t-test, ANOVA, Mann-Whitney alebo Kruskal-Wallis.',
    },
  ];
}

function addWorksheetFromJson<T extends Record<string, unknown>>(
  workbook: XLSX.WorkBook,
  name: string,
  rows: T[],
) {
  const worksheet = XLSX.utils.json_to_sheet(
    (rows.length ? rows : [{}]) as Record<string, unknown>[],
  );
  XLSX.utils.book_append_sheet(workbook, worksheet, normalizeSheetName(name));
}

function buildPreparedWorkbook(params: {
  rawRows: DataRow[];
  cleanRows: DataRow[];
  variableDictionary: VariableDictionaryItem[];
  scoringItems: ScoringItem[];
  qualityReport: QualityReportItem[];
  questionnaireConfig: QuestionnaireConfig;
  jaspAnalysis: JaspAnalysisResult;
}): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Pomocník musí byť prvým listom pripraveného pracovného zošita.
  addWorksheetFromJson(workbook, 'README', createReadmeRows());
  addWorksheetFromJson(workbook, 'DATA_RAW', params.rawRows);
  addWorksheetFromJson(workbook, 'DATA_CLEAN', params.cleanRows);
  addWorksheetFromJson(
    workbook,
    'VARIABLE_DICTIONARY',
    params.variableDictionary,
  );
  addWorksheetFromJson(workbook, 'SCORING', params.scoringItems);
  addWorksheetFromJson(
    workbook,
    'QUESTIONNAIRE_SETUP',
    createQuestionnaireSetupRows(params.questionnaireConfig),
  );
  addWorksheetFromJson(workbook, 'QUALITY_REPORT', params.qualityReport);
  addWorksheetFromJson(workbook, 'JASP_SUMMARY', params.jaspAnalysis.summary);
  addWorksheetFromJson(workbook, 'JASP_VARIABLES', params.jaspAnalysis.variables);
  addWorksheetFromJson(
    workbook,
    'JASP_DESCRIPTIVES',
    params.jaspAnalysis.descriptives,
  );
  addWorksheetFromJson(
    workbook,
    'JASP_FREQUENCIES',
    params.jaspAnalysis.frequencies,
  );
  addWorksheetFromJson(
    workbook,
    'JASP_RELIABILITY',
    params.jaspAnalysis.reliability,
  );
  addWorksheetFromJson(
    workbook,
    'JASP_NORMALITY',
    params.jaspAnalysis.normality,
  );
  addWorksheetFromJson(
    workbook,
    'JASP_CORRELATIONS',
    params.jaspAnalysis.correlations,
  );
  addWorksheetFromJson(
    workbook,
    'JASP_PARAMETRIC',
    params.jaspAnalysis.parametricTests,
  );
  addWorksheetFromJson(
    workbook,
    'JASP_NONPARAMETRIC',
    params.jaspAnalysis.nonParametricTests,
  );
  addWorksheetFromJson(
    workbook,
    'JASP_TEST_SELECTION',
    params.jaspAnalysis.testSelection,
  );
  addWorksheetFromJson(workbook, 'JASP_WARNINGS', params.jaspAnalysis.warnings);
  addWorksheetFromJson(
    workbook,
    '22_POLOZKY',
    params.jaspAnalysis.itemDescriptives,
  );

  return workbook;
}

function createPreparedFileName(originalFileName: string): string {
  const safeName = originalFileName
    .replace(/\.[^.]+$/g, '')
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

  const date = new Date().toISOString().slice(0, 10);

  return `${safeName || 'data'}_PREPARED_${date}.xlsx`;
}

async function readWorkbookFromFile(
  file: UploadedDataFile,
): Promise<XLSX.WorkBook> {
  const fileName = sanitizeFileName(
    file.name || 'uploaded-file',
  );
  const extension = getFileExtension(fileName);

  if (file.size <= 0) {
    throw new PrepareRouteError({
      code: 'EMPTY_FILE',
      status: 400,
      message:
        'Nahratý súbor je prázdny.',
      context: {
        fileName,
      },
    });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new PrepareRouteError({
      code: 'FILE_TOO_LARGE',
      status: 413,
      message:
        `Súbor je príliš veľký. Maximálna veľkosť je ${MAX_FILE_SIZE_MB} MB.`,
      detail:
        `Veľkosť súboru: ${file.size} bajtov. Povolené maximum: ${MAX_FILE_SIZE_BYTES} bajtov.`,
      context: {
        fileName,
        maxFileSizeMb:
          MAX_FILE_SIZE_MB,
      },
    });
  }

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new PrepareRouteError({
      code: 'UNSUPPORTED_FILE_TYPE',
      status: 415,
      message:
        'Nepodporovaný typ súboru. Nahrajte súbor .xlsx, .xls, .xlsm alebo .csv.',
      detail:
        `Názov súboru: ${fileName}; MIME typ: ${file.type || 'neuvedený'}.`,
      context: {
        fileName,
        allowedTypes: [
          'XLSX',
          'XLS',
          'XLSM',
          'CSV',
        ],
      },
    });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isCsvFileName(fileName)) {
      const text = buffer.toString('utf8');

      return XLSX.read(text, {
        type: 'string',
        raw: false,
      });
    }

    return XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      raw: false,
    });
  } catch (error: unknown) {
    throw new PrepareRouteError({
      code: 'FILE_READ_FAILED',
      status: 422,
      message:
        'Súbor sa nepodarilo načítať. Skontrolujte, či nie je poškodený, zašifrovaný alebo chránený heslom.',
      detail: getErrorMessage(error),
      context: {
        fileName,
      },
    });
  }
}


const PREPARE_ERROR_CODE_MAP: Record<
  string,
  ZedperaErrorCode
> = {
  INVALID_CONTENT_TYPE:
    'INVALID_REQUEST',
  INVALID_FORM_DATA:
    'INVALID_REQUEST',
  FILE_REQUIRED:
    'DATA_FILE_REQUIRED',
  MULTIPLE_FILES_NOT_SUPPORTED:
    'INVALID_REQUEST',
  EMPTY_FILE:
    'DATA_FILE_INVALID',
  FILE_TOO_LARGE:
    'ATTACHMENT_FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE:
    'ATTACHMENT_UNSUPPORTED_TYPE',
  FILE_READ_FAILED:
    'DATA_FILE_INVALID',
  EMPTY_WORKBOOK:
    'DATA_FILE_INVALID',
  NO_DATA_ROWS:
    'DATA_FILE_INVALID',
  WORKBOOK_GENERATION_FAILED:
    'DATA_PREPARATION_FAILED',
  UNAUTHENTICATED:
    'AUTH_REQUIRED',
  FEATURE_NOT_INCLUDED:
    'FEATURE_NOT_INCLUDED',
  ATTACHMENT_LIMIT_REACHED:
    'ATTACHMENT_LIMIT_REACHED',
  ENTITLEMENTS_LOAD_FAILED:
    'INTERNAL_SERVER_ERROR',
  INTERNAL_SERVER_ERROR:
    'INTERNAL_SERVER_ERROR',
};

function mapPrepareErrorCode(
  code: PrepareErrorCode,
): ZedperaErrorCode {
  return (
    PREPARE_ERROR_CODE_MAP[
      String(code || '')
        .trim()
        .toUpperCase()
    ] ||
    String(code || 'UNKNOWN_ERROR')
  );
}

function cleanOptionalText(
  value: unknown,
): string | null {
  return typeof value === 'string' &&
    value.trim()
    ? value.trim()
    : null;
}

function readOptionalInteger(
  value: unknown,
): number | null {
  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? Math.max(
        0,
        Math.trunc(numeric),
      )
    : null;
}

/**
 * Frontend posiela attachmentItems a samostatné fallback polia.
 * Server ich vždy zosúladí so skutočne prijatými binárnymi súbormi.
 */
function parseAttachmentUsageItems(
  formData: FormData,
  uploadedFiles: UploadedDataFile[],
): AttachmentUsageItem[] {
  const serialized =
    formData.get('attachmentItems');

  let parsedItems:
    | Record<string, unknown>[]
    | null = null;

  if (
    typeof serialized === 'string' &&
    serialized.trim()
  ) {
    try {
      const parsed =
        JSON.parse(serialized) as unknown;

      if (Array.isArray(parsed)) {
        parsedItems = parsed.filter(
          (
            item,
          ): item is Record<
            string,
            unknown
          > =>
            Boolean(
              item &&
                typeof item ===
                  'object' &&
                !Array.isArray(item),
            ),
        );
      }
    } catch {
      parsedItems = null;
    }
  }

  const fallbackId =
    cleanOptionalText(
      formData.get('attachmentId'),
    );
  const fallbackName =
    cleanOptionalText(
      formData.get('attachmentName'),
    );
  const fallbackSize =
    readOptionalInteger(
      formData.get('attachmentSize'),
    );
  const fallbackType =
    cleanOptionalText(
      formData.get('attachmentType'),
    );
  const fallbackUploadedAt =
    cleanOptionalText(
      formData.get(
        'attachmentUploadedAt',
      ),
    );

  return uploadedFiles.map(
    (file, index) => {
      const metadata =
        parsedItems?.[index] || {};

      const metadataName =
        cleanOptionalText(
          metadata.name,
        );
      const metadataType =
        cleanOptionalText(
          metadata.type,
        );
      const metadataUploadedAt =
        cleanOptionalText(
          metadata.uploadedAt,
        );
      const metadataId =
        cleanOptionalText(
          metadata.id,
        );
      const metadataSize =
        readOptionalInteger(
          metadata.size,
        );

      /**
       * Názov, veľkosť a MIME typ sa odvodzujú prioritne zo skutočného
       * binárneho súboru. Klient dodáva iba stabilné ID a čas uploadu.
       */
      return {
        id:
          metadataId ||
          fallbackId,
        name:
          file.name ||
          metadataName ||
          fallbackName ||
          `data-${index + 1}`,
        size:
          file.size ||
          metadataSize ||
          fallbackSize ||
          0,
        type:
          file.type ||
          metadataType ||
          fallbackType ||
          'application/octet-stream',
        uploadedAt:
          metadataUploadedAt ||
          fallbackUploadedAt,
      };
    },
  );
}

function readProjectId(
  formData: FormData,
): string | null {
  return cleanOptionalText(
    formData.get('projectId'),
  );
}

function createErrorHeaders({
  requestId,
  errorId,
  processingMs,
}: {
  requestId: string;
  errorId: string;
  processingMs: number;
}): HeadersInit {
  return {
    ...NO_STORE_HEADERS,
    'X-Request-Id':
      requestId,
    'X-Zedpera-Request-Id':
      requestId,
    'X-Error-Id':
      errorId,
    'X-Processing-Time-Ms':
      String(processingMs),
    'Server-Timing':
      `zedpera;dur=${processingMs}`,
  };
}

function entitlementErrorContext(
  error: EntitlementError,
): {
  code: ZedperaErrorCode;
  status: number;
  context: ZedperaErrorContext;
} {
  const record =
    error as unknown as Record<
      string,
      unknown
    >;

  const rawCode =
    cleanOptionalText(
      record.code,
    ) ||
    'ACCESS_DENIED';

  const status =
    readOptionalInteger(
      record.status,
    ) ||
    403;

  return {
    code: rawCode,
    status,
    context: {
      serverCode:
        rawCode,
      serverMessage:
        error.message,
      serverDetail:
        cleanOptionalText(
          record.detail,
        ) ||
        cleanOptionalText(
          record.details,
        ),
      purchaseUrl:
        cleanOptionalText(
          record.purchaseUrl,
        ) ||
        cleanOptionalText(
          record.purchase_url,
        ),
      attachmentLimit:
        readOptionalInteger(
          record.attachmentLimit,
        ),
      receivedAttachments:
        readOptionalInteger(
          record.receivedAttachments,
        ),
      promptLimit:
        readOptionalInteger(
          record.promptLimit,
        ),
      promptsUsed:
        readOptionalInteger(
          record.promptsUsed,
        ),
      promptsRemaining:
        readOptionalInteger(
          record.promptsRemaining,
        ),
      pageLimit:
        readOptionalInteger(
          record.pageLimit,
        ),
      pagesUsed:
        readOptionalInteger(
          record.pagesUsed,
        ),
      pagesRemaining:
        readOptionalInteger(
          record.pagesRemaining,
        ),
      featureLabel:
        cleanOptionalText(
          record.featureLabel,
        ),
      planName:
        cleanOptionalText(
          record.planName,
        ),
    },
  };
}

function assertAttachmentTrackingAvailable({
  usage,
  request,
  requestId,
  errorId,
  processingMs,
}: {
  usage:
    AuthenticatedAttachmentUsageSnapshot;
  request: NextRequest;
  requestId: string;
  errorId: string;
  processingMs: number;
}): NextResponse | null {
  if (!usage.authenticated) {
    return zedperaErrorJson(
      'AUTH_REQUIRED',
      {
        endpoint:
          '/api/analyze-data/prepare',
        module: 'data',
        requestId,
        errorId,
      },
      {
        request,
        status: 401,
        headers:
          createErrorHeaders({
            requestId,
            errorId,
            processingMs,
          }),
      },
    );
  }

  if (
    !usage.trackingAvailable ||
    (!usage.limitAvailable &&
      !usage.isUnlimited)
  ) {
    return zedperaErrorJson(
      'ATTACHMENT_TRACKING_UNAVAILABLE',
      {
        endpoint:
          '/api/analyze-data/prepare',
        module: 'data',
        requestId,
        errorId,
      },
      {
        request,
        status: 503,
        headers:
          createErrorHeaders({
            requestId,
            errorId,
            processingMs,
          }),
      },
    );
  }

  return null;
}

/**
 * POST /api/analyze-data/prepare
 *
 * Pripraví jeden Excel alebo CSV súbor pre ďalšiu dátovú analýzu.
 * Route:
 *
 * 1. overí prihlásenie a funkciu data-prepare,
 * 2. skontroluje limit príloh aktívneho balíka,
 * 3. validuje formát a veľkosť súboru,
 * 4. pripraví DATA_RAW, DATA_CLEAN, slovník premenných a scoring,
 * 5. vytvorí JASP-like štatistické hárky,
 * 6. vráti pripravený XLSX súbor ako Base64.
 *
 * Táto route nevytvára AI text, preto sama nespotrebúva prompt ani
 * generované strany. Spotreba sa má zaznamenať až v route, ktorá
 * úspešne vytvorí používateľský AI výstup.
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  const requestId = resolveRequestId(request);
  const errorId = randomUUID();
  const startedAt = Date.now();

  try {
    /**
     * Oprávnenie kontrolujeme pred načítaním a spracovaním veľkého súboru,
     * aby neoprávnená požiadavka nespotrebovala výpočtové zdroje servera.
     */
    const entitlements =
      await requireDataAnalysisAction(
        'prepare',
      );

    const access =
      createPrepareAccess(entitlements);

    if (!isMultipartRequest(request)) {
      throw new PrepareRouteError({
        code: 'INVALID_CONTENT_TYPE',
        status: 415,
        message:
          'Požiadavka musí používať Content-Type multipart/form-data.',
        context: {
          field:
            'content-type',
        },
      });
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch (error: unknown) {
      throw new PrepareRouteError({
        code: 'INVALID_FORM_DATA',
        status: 400,
        message:
          'Telo požiadavky neobsahuje platné FormData.',
        detail: getErrorMessage(error),
        context: {
          field:
            'formData',
        },
      });
    }

    const uploadedFiles =
      getUploadedFiles(formData);

    if (uploadedFiles.length === 0) {
      throw new PrepareRouteError({
        code: 'FILE_REQUIRED',
        status: 400,
        message:
          'Súbor nebol nahratý.',
        detail:
          'Vo FormData chýba položka typu File.',
        context: {
          field: 'file',
          allowedTypes: [
            'XLSX',
            'XLS',
            'XLSM',
            'CSV',
          ],
        },
      });
    }

    /**
     * Analýza dát obchádza /api/chat, preto musí každý prijatý súbor
     * zaevidovať vo vlastnej serverovej route. Zápis prebehne ešte pred
     * dátovým spracovaním. Odstránenie súboru z formulára kredit nevracia.
     */
    const attachmentUsage =
      await recordCurrentUserAttachmentUsage({
        requestId,
        projectId:
          readProjectId(formData),
        module: 'data',
        items:
          parseAttachmentUsageItems(
            formData,
            uploadedFiles,
          ),
        fallbackCount:
          uploadedFiles.length,
      });

    const attachmentTrackingError =
      assertAttachmentTrackingAvailable({
        usage: attachmentUsage,
        request,
        requestId,
        errorId,
        processingMs:
          Date.now() - startedAt,
      });

    if (attachmentTrackingError) {
      return attachmentTrackingError;
    }

    /**
     * Presný limit je ešte povolený. Blokovanie nastane až po prijatí
     * ďalšieho jedinečného súboru nad limit. Takýto súbor už zostáva
     * zaevidovaný a po navýšení kapacity sa pri retry nezapočíta druhýkrát.
     */
    if (
      !attachmentUsage.isUnlimited &&
      attachmentUsage.attachmentLimit !==
        null &&
      attachmentUsage.attachmentsUsed >
        attachmentUsage.attachmentLimit
    ) {
      const processingMs =
        Date.now() - startedAt;

      return zedperaErrorJson(
        'ATTACHMENT_LIMIT_REACHED',
        {
          endpoint:
            '/api/analyze-data/prepare',
          module: 'data',
          requestId,
          errorId,
          attachmentLimit:
            attachmentUsage.attachmentLimit,
          attachmentsUsed:
            attachmentUsage.attachmentsUsed,
          attachmentsRemaining:
            attachmentUsage.attachmentsRemaining,
          receivedAttachments:
            uploadedFiles.length,
          purchaseUrl:
            '/pricing#doplnkove-sluzby',
        },
        {
          request,
          status: 402,
          headers:
            createErrorHeaders({
              requestId,
              errorId,
              processingMs,
            }),
        },
      );
    }

    /**
     * Snapshot v úspešnej odpovedi používa rovnaký autoritatívny limit
     * ako serverová evidencia príloh.
     */
    const effectiveAccess: PrepareAccess = {
      ...access,
      attachmentLimit:
        attachmentUsage.attachmentLimit,
    };

    if (uploadedFiles.length > 1) {
      throw new PrepareRouteError({
        code:
          'MULTIPLE_FILES_NOT_SUPPORTED',
        status: 400,
        message:
          'Príprava dát podporuje v jednej požiadavke práve jeden súbor.',
        detail:
          `Prijatý počet súborov: ${uploadedFiles.length}.`,
        context: {
          receivedAttachments:
            uploadedFiles.length,
          maxRequestAttachments: 1,
        },
      });
    }

    const file = uploadedFiles[0];
    const safeFileName =
      sanitizeFileName(
        file.name || 'data.xlsx',
      );

    const sourceFile = {
      name: safeFileName,
      size: file.size,
      type:
        file.type ||
        'application/octet-stream',
      extension:
        getFileExtension(safeFileName),
    };

    const questionnaireConfig =
      normalizeQuestionnaireConfig(
        formData,
      );

    const workbook =
      await readWorkbookFromFile(file);

    if (workbook.SheetNames.length === 0) {
      throw new PrepareRouteError({
        code: 'EMPTY_WORKBOOK',
        status: 422,
        message:
          'Súbor neobsahuje žiadny čitateľný hárok.',
        context: {
          fileName:
            safeFileName,
        },
      });
    }

    const rows =
      getWorkbookFirstSheetRows(
        workbook,
      );

    if (!rows.length) {
      throw new PrepareRouteError({
        code: 'NO_DATA_ROWS',
        status: 422,
        message:
          'Súbor neobsahuje čitateľné dátové riadky.',
        detail:
          'Žiadny hárok neobsahuje čitateľnú tabuľku alebo sa dáta nepodarilo načítať.',
        context: {
          fileName:
            safeFileName,
        },
      });
    }

    const converted =
      convertRowsToObjects(
        rows,
        questionnaireConfig,
      );

    if (
      converted.cleanRows.length === 0 ||
      converted.headers.length === 0
    ) {
      throw new PrepareRouteError({
        code: 'NO_DATA_ROWS',
        status: 422,
        message:
          'Po rozpoznaní hlavičky neostali žiadne použiteľné dátové riadky.',
        context: {
          fileName:
            safeFileName,
        },
      });
    }

    const scoringResult =
      calculateScores(
        converted.cleanRows,
        converted.headers,
        questionnaireConfig,
      );

    const allWarnings = [
      ...createQuestionnaireSelectionWarnings(
        questionnaireConfig,
      ),
      ...converted.warnings,
      ...scoringResult.warnings,
    ];

    const rangeControl =
      countInvalidRanges(
        scoringResult.rows,
        scoringResult.headers,
      );

    const finalWarnings =
      Array.from(
        new Set([
          ...allWarnings,
          ...rangeControl.warnings,
        ]),
      );

    const variableDictionary =
      createVariableDictionary(
        scoringResult.headers,
        converted.originalHeaders,
        scoringResult.rows,
      );

    const qualityReport =
      createQualityReport({
        rawRows: converted.rawRows,
        cleanRows: scoringResult.rows,
        headers: scoringResult.headers,
        warnings: finalWarnings,
        scoringItems:
          scoringResult.scoringItems,
      });

    const jaspAnalysis =
      buildJaspAnalysis({
        fileName: safeFileName,
        rows: scoringResult.rows,
        headers: scoringResult.headers,
        scoringItems:
          scoringResult.scoringItems,
        questionnaireConfig,
      });

    const preparedWorkbook =
      buildPreparedWorkbook({
        rawRows: converted.rawRows,
        cleanRows: scoringResult.rows,
        variableDictionary,
        scoringItems:
          scoringResult.scoringItems,
        qualityReport,
        questionnaireConfig,
        jaspAnalysis,
      });

    let preparedBuffer: Buffer;

    try {
      preparedBuffer = XLSX.write(
        preparedWorkbook,
        {
          bookType: 'xlsx',
          type: 'buffer',
          compression: true,
        },
      ) as Buffer;
    } catch (error: unknown) {
      throw new PrepareRouteError({
        code:
          'WORKBOOK_GENERATION_FAILED',
        status: 500,
        message:
          'Pripravený Excel súbor sa nepodarilo vytvoriť.',
        detail: getErrorMessage(error),
        context: {
          fileName:
            safeFileName,
        },
      });
    }

    const preparedFileName =
      createPreparedFileName(
        safeFileName,
      );
    const preparedFileBase64 =
      preparedBuffer.toString('base64');
    const processingMs =
      Date.now() - startedAt;

    return createJsonResponse(
      {
        ok: true,
        success: true,
        code: 'DATA_PREPARED',
        message:
          'Dáta boli úspešne načítané, vyčistené a pripravené na štatistickú analýzu. Použité boli iba manuálne zadané, vypočítané alebo jednoznačne pomenované škály a subškály.',
        requestId,
        processingMs,
        preparedFileName,
        preparedFileBase64,
        preparedFileSizeBytes:
          preparedBuffer.length,
        preparedFileBase64Length:
          preparedFileBase64.length,
        mimeType: EXCEL_MIME_TYPE,
        sourceFile,
        rows: scoringResult.rows.length,
        columns:
          scoringResult.headers.length,
        sheets: [
          'README',
          'DATA_RAW',
          'DATA_CLEAN',
          'VARIABLE_DICTIONARY',
          'SCORING',
          'QUESTIONNAIRE_SETUP',
          'QUALITY_REPORT',
          'JASP_SUMMARY',
          'JASP_VARIABLES',
          'JASP_DESCRIPTIVES',
          'JASP_FREQUENCIES',
          'JASP_RELIABILITY',
          'JASP_NORMALITY',
          'JASP_CORRELATIONS',
          'JASP_PARAMETRIC',
          'JASP_NONPARAMETRIC',
          'JASP_TEST_SELECTION',
          'JASP_WARNINGS',
          '22_POLOZKY',
        ],
        warnings: finalWarnings,
        qualityReport,
        questionnaireConfig,
        jaspSummary:
          jaspAnalysis.summary,
        access: effectiveAccess,
      },
      200,
      requestId,
    );
  } catch (error: unknown) {
    const processingMs =
      Date.now() - startedAt;

    if (error instanceof EntitlementError) {
      const mapped =
        entitlementErrorContext(error);

      console.warn(
        '[POST /api/analyze-data/prepare] Access rejected.',
        {
          requestId,
          errorId,
          code: mapped.code,
          status: mapped.status,
          processingMs,
        },
      );

      return zedperaErrorJson(
        mapped.code,
        {
          ...mapped.context,
          endpoint:
            '/api/analyze-data/prepare',
          module: 'data',
          requestId,
          errorId,
        },
        {
          request,
          status: mapped.status,
          headers:
            createErrorHeaders({
              requestId,
              errorId,
              processingMs,
            }),
        },
      );
    }

    if (error instanceof PrepareRouteError) {
      const centralCode =
        mapPrepareErrorCode(
          error.code,
        );

      const logPayload = {
        requestId,
        errorId,
        originalCode:
          error.code,
        centralCode,
        status:
          error.status,
        processingMs,
        detail:
          error.detail,
        context:
          error.context,
      };

      if (error.status >= 500) {
        console.error(
          '[POST /api/analyze-data/prepare] Processing failed.',
          logPayload,
        );
      } else {
        console.warn(
          '[POST /api/analyze-data/prepare] Invalid request.',
          logPayload,
        );
      }

      const developmentDetail =
        getDevelopmentDetail(
          error.detail ||
            error.message,
        ).detail;

      return zedperaErrorJson(
        centralCode,
        {
          ...error.context,
          endpoint:
            '/api/analyze-data/prepare',
          module: 'data',
          requestId,
          errorId,
          serverCode:
            String(error.code),
          serverMessage:
            error.publicMessage,
          serverDetail:
            developmentDetail,
        },
        {
          request,
          status:
            error.status,
          headers:
            createErrorHeaders({
              requestId,
              errorId,
              processingMs,
            }),
        },
      );
    }

    const technicalMessage =
      getErrorMessage(error);

    console.error(
      '[POST /api/analyze-data/prepare] Unexpected server error.',
      {
        requestId,
        errorId,
        processingMs,
        message:
          technicalMessage,
        error,
      },
    );

    return zedperaUnknownErrorJson(
      error,
      {
        request,
        endpoint:
          '/api/analyze-data/prepare',
        module: 'data',
        requestId,
        status: 500,
        headers:
          createErrorHeaders({
            requestId,
            errorId,
            processingMs,
          }),
      },
    );

  }
}
