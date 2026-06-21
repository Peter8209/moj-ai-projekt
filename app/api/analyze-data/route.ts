import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import { runFullStatisticalAnalysis } from '@/components/analysis/analysisStats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type RowValue = string | number | boolean | null;
type DataRow = Record<string, RowValue>;
type AnyRecord = Record<string, unknown>;


type QuestionnaireMode = 'none' | 'selected' | 'manual' | 'auto-suggest-only';

type QuestionnaireId =
  | 'wemwbs'
  | 'jss'
  | 'sehs_s_2020'
  | 'resilience_scale'
  | 'custom';

type CustomQuestionnaireDefinition = {
  id?: string;
  name?: string;
  language?: string;
  responseMin?: number;
  responseMax?: number;
  scoring?: 'sum' | 'mean' | string;
  scales?: unknown[];
  subscales?: unknown[];
};

type QuestionnaireConfig = {
  mode: QuestionnaireMode;
  selectedQuestionnaires: QuestionnaireId[];
  customQuestionnaires: CustomQuestionnaireDefinition[];
  customQuestionnairesText: string;
};

const DEFAULT_QUESTIONNAIRE_CONFIG: QuestionnaireConfig = {
  mode: 'auto-suggest-only',
  selectedQuestionnaires: [],
  customQuestionnaires: [],
  customQuestionnairesText: '',
};

const QUESTIONNAIRE_LABELS: Record<QuestionnaireId, string> = {
  wemwbs: 'WEMWBS',
  jss: 'JSS – Job Satisfaction Survey',
  sehs_s_2020: 'SEHS-S-2020',
  resilience_scale: 'Škála reziliencie',
  custom: 'Vlastný dotazník / vlastné škály',
};

/*
 * Dôležité:
 * Automaticky vypočítateľné sú iba tie dotazníky, ku ktorým máme
 * v kóde presné položky / pravidlá. SEHS-S-2020 a rezilienciu nechávame
 * ako používateľom zvolený kontext, kým nebude doplnená presná metodika.
 */
const AUTO_DETECTABLE_STANDARDIZED_QUESTIONNAIRES = new Set<QuestionnaireId>([
  'wemwbs',
  'jss',
]);

function normalizeQuestionnaireId(value: unknown): QuestionnaireId | null {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) return null;

  if (
    normalized === 'wemwbs' ||
    normalized === 'wembs' ||
    normalized === 'wem' ||
    normalized.includes('warwick') ||
    normalized.includes('wellbeing')
  ) {
    return 'wemwbs';
  }

  if (
    normalized === 'jss' ||
    normalized.includes('job_satisfaction') ||
    normalized.includes('pracovna_spokojnost') ||
    normalized.includes('pracovnej_spokojnosti')
  ) {
    return 'jss';
  }

  if (
    normalized === 'sehs' ||
    normalized === 'sehs_s' ||
    normalized === 'sehs_s_2020' ||
    normalized.includes('social_emotional_health')
  ) {
    return 'sehs_s_2020';
  }

  if (
    normalized === 'resilience' ||
    normalized === 'resilience_scale' ||
    normalized === 'reziliencia' ||
    normalized === 'skala_reziliencie' ||
    normalized === 'rs' ||
    normalized.includes('cd_risc')
  ) {
    return 'resilience_scale';
  }

  if (
    normalized === 'custom' ||
    normalized === 'vlastny' ||
    normalized.includes('vlastn')
  ) {
    return 'custom';
  }

  return null;
}

function parseJsonLikeField(value: FormDataEntryValue | null): unknown {
  if (typeof value !== 'string') return null;

  const text = value.trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function readQuestionnaireConfig(formData: FormData): QuestionnaireConfig {
  const rawConfig =
    parseJsonLikeField(formData.get('questionnaireConfig')) ||
    parseJsonLikeField(formData.get('standardizedQuestionnaireConfig')) ||
    parseJsonLikeField(formData.get('questionnaires')) ||
    null;

  const directQuestionnaire =
    formData.get('questionnaireId') ||
    formData.get('selectedQuestionnaire') ||
    formData.get('standardizedQuestionnaire');

  const directSelectedQuestionnaires =
    parseJsonLikeField(formData.get('selectedQuestionnaires'));

  const directMode = String(formData.get('questionnaireMode') || '').trim();

  const configSource =
    rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)
      ? (rawConfig as AnyRecord)
      : {};

  const rawMode = String(
    configSource.mode || directMode || DEFAULT_QUESTIONNAIRE_CONFIG.mode,
  ).trim() as QuestionnaireMode;

  let mode: QuestionnaireMode =
    rawMode === 'none' ||
    rawMode === 'selected' ||
    rawMode === 'manual' ||
    rawMode === 'auto-suggest-only'
      ? rawMode
      : DEFAULT_QUESTIONNAIRE_CONFIG.mode;

  const selectedFromConfig = Array.isArray(configSource.selectedQuestionnaires)
    ? configSource.selectedQuestionnaires
    : Array.isArray(rawConfig)
      ? rawConfig
      : [];

  const selectedFromDirectField = Array.isArray(directSelectedQuestionnaires)
    ? directSelectedQuestionnaires
    : [];

  const selectedQuestionnaires = [
    ...selectedFromConfig,
    ...selectedFromDirectField,
    typeof directQuestionnaire === 'string' ? directQuestionnaire : '',
  ]
    .map(normalizeQuestionnaireId)
    .filter((id): id is QuestionnaireId => Boolean(id))
    .filter((id) => id !== 'custom')
    .filter((id, index, array) => array.indexOf(id) === index);

  const customQuestionnairesText = String(
    configSource.customQuestionnairesText ??
      configSource.customQuestionnaireText ??
      formData.get('customQuestionnairesText') ??
      formData.get('customQuestionnaireText') ??
      '',
  ).trim();

  const customQuestionnaires = Array.isArray(configSource.customQuestionnaires)
    ? (configSource.customQuestionnaires.filter(
        (item): item is CustomQuestionnaireDefinition =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      ) as CustomQuestionnaireDefinition[])
    : [];

  if (mode === 'none') {
    return {
      mode: 'none',
      selectedQuestionnaires: [],
      customQuestionnaires: [],
      customQuestionnairesText: '',
    };
  }

  if (mode === 'auto-suggest-only' && selectedQuestionnaires.length > 0) {
    mode = 'selected';
  }

  if (mode === 'manual' && !customQuestionnairesText && !customQuestionnaires.length) {
    mode = selectedQuestionnaires.length > 0 ? 'selected' : 'auto-suggest-only';
  }

  return {
    mode,
    selectedQuestionnaires,
    customQuestionnaires,
    customQuestionnairesText,
  };
}

function selectedQuestionnaireLabels(questionnaireConfig: QuestionnaireConfig): string[] {
  return questionnaireConfig.selectedQuestionnaires.map(
    (id) => QUESTIONNAIRE_LABELS[id] ?? id,
  );
}

function customTextMentionsQuestionnaire(
  questionnaireConfig: QuestionnaireConfig,
  questionnaireId: QuestionnaireId,
): boolean {
  const text = String(questionnaireConfig.customQuestionnairesText || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!text) return false;

  if (questionnaireId === 'wemwbs') {
    return /wem|wembs|warwick|wellbeing|pohod/.test(text);
  }

  if (questionnaireId === 'jss') {
    return /\bjss\b|job satisfaction|pracovn.*spokoj|spokojnost.*prac/.test(text);
  }

  if (questionnaireId === 'sehs_s_2020') {
    return /sehs|social emotional health/.test(text);
  }

  if (questionnaireId === 'resilience_scale') {
    return /rezilien|resilien|cd[\s_-]?risc|\brs\b/.test(text);
  }

  return false;
}

function isQuestionnaireConfirmed(
  questionnaireConfig: QuestionnaireConfig,
  questionnaireId: QuestionnaireId,
): boolean {
  if (questionnaireConfig.mode === 'none') return false;

  if (questionnaireConfig.mode === 'selected') {
    return questionnaireConfig.selectedQuestionnaires.includes(questionnaireId);
  }

  if (questionnaireConfig.mode === 'manual') {
    return (
      customTextMentionsQuestionnaire(questionnaireConfig, questionnaireId) ||
      questionnaireConfig.customQuestionnaires.some((item) => {
        return normalizeQuestionnaireId(item.id || item.name) === questionnaireId;
      })
    );
  }

  return questionnaireConfig.mode === 'auto-suggest-only';
}

function shouldAllowAutomaticScaleDetection(
  questionnaireConfig: QuestionnaireConfig,
): boolean {
  if (questionnaireConfig.mode === 'none') return false;

  if (questionnaireConfig.mode === 'auto-suggest-only') {
    /*
     * V tomto režime systém môže iba odporúčať / navrhovať. Aby sa používateľovi
     * do výsledkov nevypočítali nesprávne štandardizované škály, automatické
     * výpočty škál ostávajú vypnuté.
     */
    return false;
  }

  if (questionnaireConfig.mode === 'manual') {
    return (
      questionnaireConfig.customQuestionnaires.length > 0 ||
      customTextMentionsQuestionnaire(questionnaireConfig, 'wemwbs') ||
      customTextMentionsQuestionnaire(questionnaireConfig, 'jss')
    );
  }

  return questionnaireConfig.selectedQuestionnaires.some((id) =>
    AUTO_DETECTABLE_STANDARDIZED_QUESTIONNAIRES.has(id),
  );
}

function normalizeHeaderForCompare(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function headerLooksLike(headers: string[], prefixes: string[]): boolean {
  const normalizedHeaders = headers.map(normalizeHeaderForCompare);

  return prefixes.some((prefix) => {
    const normalizedPrefix = normalizeHeaderForCompare(prefix);
    const count = normalizedHeaders.filter((header) =>
      header.startsWith(normalizedPrefix),
    ).length;

    return count >= 3;
  });
}

function createQuestionnaireWarnings(
  headers: string[],
  questionnaireConfig: QuestionnaireConfig,
): string[] {
  const selected = new Set(questionnaireConfig.selectedQuestionnaires);
  const warnings: string[] = [];

  if (questionnaireConfig.mode === 'none') {
    return [
      'Používateľ zvolil režim bez štandardizovaného dotazníka. Systém nebude automaticky počítať WEMWBS/JSS ani iné štandardizované škály.',
    ];
  }

  if (questionnaireConfig.mode === 'manual') {
    warnings.push(
      questionnaireConfig.customQuestionnairesText
        ? `Používateľ zadal vlastné dotazníky/subškály: ${questionnaireConfig.customQuestionnairesText}.`
        : 'Používateľ zvolil vlastný dotazník alebo vlastné škály. Automatická detekcia známych škál sa nepoužije bez presnej definície.',
    );
  }

  if (questionnaireConfig.mode === 'auto-suggest-only') {
    if (headerLooksLike(headers, ['wem', 'wemwbs'])) {
      warnings.push(
        'Systém našiel stĺpce podobné WEMWBS, ale dotazník nebol používateľom potvrdený. WEMWBS sa preto nepoužil vo výpočtoch.',
      );
    }

    if (headerLooksLike(headers, ['jss'])) {
      warnings.push(
        'Systém našiel stĺpce podobné JSS, ale dotazník nebol používateľom potvrdený. JSS sa preto nepoužil vo výpočtoch.',
      );
    }

    if (!warnings.length) {
      warnings.push(
        'Režim Neviem / iba navrhnúť: systém môže odporučiť podobný dotazník, ale štandardizované škály sa nevypočítajú bez potvrdenia používateľom.',
      );
    }
  }

  if (questionnaireConfig.mode === 'selected') {
    const labels = selectedQuestionnaireLabels(questionnaireConfig);

    warnings.push(
      `Používateľ ručne vybral dotazníky: ${labels.join(' + ')}. Tento výber má prednosť pred automatickou detekciou.`,
    );

    if (selected.has('resilience_scale')) {
      warnings.push(
        'Používateľ vybral Škálu reziliencie. Presné položky, subškály a reverzne skórované položky musia byť dodané v definícii dotazníka alebo šablóne.',
      );
    }

    if (selected.has('sehs_s_2020')) {
      warnings.push(
        'Používateľ vybral SEHS-S-2020. Presné domény/subdomény a položky musia byť dodané v definícii dotazníka alebo šablóne.',
      );
    }
  }

  return warnings;
}

function shouldRemoveUnconfirmedQuestionnaireRecord(
  record: unknown,
  questionnaireConfig: QuestionnaireConfig,
): boolean {
  const text = JSON.stringify(record ?? {})
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!text) return false;

  const mentionsWem =
    /\bwem\b|wemwbs|wembs|warwick|wellbeing|psychickej pohody/.test(text);
  const mentionsJss =
    /\bjss\b|job satisfaction|pracovnej spokojnosti|pracovna spokojnost/.test(
      text,
    );

  if (mentionsWem && !isQuestionnaireConfirmed(questionnaireConfig, 'wemwbs')) {
    return true;
  }

  if (mentionsJss && !isQuestionnaireConfirmed(questionnaireConfig, 'jss')) {
    return true;
  }

  return false;
}

function filterQuestionnaireRows<T>(
  rows: unknown,
  questionnaireConfig: QuestionnaireConfig,
): T[] {
  return asRecordArray(rows).filter(
    (row) => !shouldRemoveUnconfirmedQuestionnaireRecord(row, questionnaireConfig),
  ) as T[];
}

function filterQuestionnaireWarnings(
  warnings: unknown[],
  questionnaireConfig: QuestionnaireConfig,
): string[] {
  return warnings
    .map((item) => String(item))
    .filter(Boolean)
    .filter((warning) => {
      if (questionnaireConfig.mode === 'auto-suggest-only') {
        return true;
      }

      return !shouldRemoveUnconfirmedQuestionnaireRecord(
        { warning },
        questionnaireConfig,
      );
    })
    .filter((item, index, array) => array.indexOf(item) === index);
}

const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function createJsonResponse(payload: AnyRecord, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function isExcelFileName(fileName: string): boolean {
  return /\.(xlsx|xls|xlsm)$/i.test(fileName);
}

function isCsvFileName(fileName: string): boolean {
  return /\.csv$/i.test(fileName);
}

function isEmptyCell(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
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

  const numericText = text.replace(/\s/g, '').replace(',', '.');
  const numericValue = Number(numericText);

  if (
    numericText !== '' &&
    Number.isFinite(numericValue) &&
    /^-?\d+(\.\d+)?$/.test(numericText)
  ) {
    return numericValue;
  }

  return text;
}

function getUploadedFiles(formData: FormData): File[] {
  const files: File[] = [];

  const directFile = formData.get('file');

  if (directFile instanceof File) {
    files.push(directFile);
  }

  const directFiles = formData.getAll('files');

  directFiles.forEach((value) => {
    if (value instanceof File) {
      files.push(value);
    }
  });

  for (const [, value] of formData.entries()) {
    if (value instanceof File && !files.includes(value)) {
      files.push(value);
    }
  }

  return files;
}

async function readWorkbookFromFile(file: File): Promise<XLSX.WorkBook> {
  const fileName = file.name || 'uploaded-file';

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Súbor je príliš veľký. Maximálna veľkosť je ${MAX_FILE_SIZE_MB} MB.`,
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (isCsvFileName(fileName)) {
    const text = buffer.toString('utf8');

    return XLSX.read(text, {
      type: 'string',
      raw: false,
    });
  }

  if (isExcelFileName(fileName)) {
    return XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      raw: false,
    });
  }

  throw new Error(
    'Nepodporovaný typ súboru. Nahrajte súbor .xlsx, .xls, .xlsm alebo .csv.',
  );
}

function selectWorksheet(workbook: XLSX.WorkBook): {
  sheetName: string;
  rows: unknown[][];
} {
  const preferredSheetName = workbook.SheetNames.includes('DATA_CLEAN')
    ? 'DATA_CLEAN'
    : workbook.SheetNames.includes('Data_Clean')
      ? 'Data_Clean'
      : workbook.SheetNames[0];

  if (!preferredSheetName) {
    return {
      sheetName: '',
      rows: [],
    };
  }

  const worksheet = workbook.Sheets[preferredSheetName];

  if (!worksheet) {
    return {
      sheetName: preferredSheetName,
      rows: [],
    };
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  return {
    sheetName: preferredSheetName,
    rows,
  };
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

function createHeaders(rawHeaders: unknown[]): string[] {
  const used = new Map<string, number>();

  return rawHeaders.map((header, index) => {
    const baseName =
      String(header ?? '').trim() ||
      `STLPEC_${index + 1}`;

    const normalized = baseName
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    const safeName = normalized || `STLPEC_${index + 1}`;
    const previousCount = used.get(safeName) ?? 0;

    used.set(safeName, previousCount + 1);

    return previousCount === 0
      ? safeName
      : `${safeName}_${previousCount + 1}`;
  });
}

function rowsToObjects(rows: unknown[][]): {
  rows: DataRow[];
  headers: string[];
  headerRowIndex: number;
} {
  if (!rows.length) {
    return {
      rows: [],
      headers: [],
      headerRowIndex: 0,
    };
  }

  const headerRowIndex = detectHeaderRow(rows);
  const rawHeaders = rows[headerRowIndex] ?? [];
  const headers = createHeaders(rawHeaders);
  const bodyRows = rows.slice(headerRowIndex + 1);

  const dataRows: DataRow[] = [];

  bodyRows.forEach((row) => {
    const output: DataRow = {};
    let nonEmptyCount = 0;

    headers.forEach((header, index) => {
      const value = normalizeCellValue(row[index]);

      if (!isEmptyCell(value)) {
        nonEmptyCount += 1;
      }

      output[header] = value;
    });

    if (nonEmptyCount > 0) {
      dataRows.push(output);
    }
  });

  return {
    rows: dataRows,
    headers,
    headerRowIndex,
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecordArray(value: unknown): AnyRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is AnyRecord => {
        return Boolean(item) && typeof item === 'object' && !Array.isArray(item);
      })
    : [];
}

function getNestedValue(source: unknown, path: string[]): unknown {
  let current = source;

  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = (current as AnyRecord)[key];
  }

  return current;
}

function asChartNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const numeric = Number(
    String(value)
      .trim()
      .replace(/\s/g, '')
      .replace(',', '.'),
  );

  return Number.isFinite(numeric) ? numeric : null;
}

function chartLabelFromRecord(record: AnyRecord): string {
  return String(
    record['label'] ??
      record['variable'] ??
      record['scaleName'] ??
      record['scale'] ??
      record['name'] ??
      record['title'] ??
      record['value'] ??
      '',
  ).trim();
}

function chartNumberFromRecord(record: AnyRecord): number | null {
  return (
    asChartNumber(record['value']) ??
    asChartNumber(record['mean']) ??
    asChartNumber(record['count']) ??
    asChartNumber(record['percent']) ??
    asChartNumber(record['validPercent']) ??
    asChartNumber(record['cronbachAlpha']) ??
    asChartNumber(record['r']) ??
    asChartNumber(record['statistic']) ??
    asChartNumber(record['pValue']) ??
    asChartNumber(record['valid'])
  );
}

function normalizeChartPoint(record: AnyRecord): AnyRecord | null {
  const label = chartLabelFromRecord(record);
  const value = chartNumberFromRecord(record);

  if (!label || value === null) {
    return null;
  }

  return {
    ...record,
    label,
    value,
    description: String(
      record['description'] ??
        record['interpretation'] ??
        record['note'] ??
        record['significance'] ??
        '',
    ),
    group: String(record['group'] ?? record['method'] ?? record['testType'] ?? ''),
  };
}

function normalizeChartPoints(
  value: unknown,
  questionnaireConfig: QuestionnaireConfig,
): AnyRecord[] {
  return asRecordArray(value)
    .filter(
      (row) =>
        !shouldRemoveUnconfirmedQuestionnaireRecord(row, questionnaireConfig),
    )
    .map(normalizeChartPoint)
    .filter((row): row is AnyRecord => Boolean(row))
    .slice(0, 80);
}

function buildFrequencyChartPoints(
  stats: AnyRecord,
  questionnaireConfig: QuestionnaireConfig,
): AnyRecord[] {
  const output: AnyRecord[] = [];

  asRecordArray(stats.frequencies).forEach((frequency) => {
    if (shouldRemoveUnconfirmedQuestionnaireRecord(frequency, questionnaireConfig)) {
      return;
    }

    const variable = String(frequency.variable ?? '');
    const values = asRecordArray(frequency.values).slice(0, 8);

    values.forEach((item) => {
      const label = `${variable}: ${String(item.value ?? '')}`.trim();
      const count = asChartNumber(item.count);
      const percent = asChartNumber(item.percent);

      if (!variable || count === null) return;

      output.push({
        label,
        value: count,
        count,
        percent,
        variable,
        category: String(item.value ?? ''),
        description:
          percent === null
            ? `${count} odpovedí`
            : `${count} odpovedí (${percent} %)`,
      });
    });
  });

  return output.slice(0, 80);
}


function buildDescriptiveChartPoints(
  rows: unknown,
  questionnaireConfig: QuestionnaireConfig,
): AnyRecord[] {
  const output: AnyRecord[] = [];

  asRecordArray(rows)
    .filter(
      (row) =>
        !shouldRemoveUnconfirmedQuestionnaireRecord(row, questionnaireConfig),
    )
    .forEach((row) => {
      const value = asChartNumber(row.mean);

      if (value === null) {
        return;
      }

      const label = String(row.variable ?? row.scaleName ?? row.name ?? '').trim();

      if (!label) {
        return;
      }

      output.push({
        label,
        value,
        mean: value,
        standardDeviation: asChartNumber(row.standardDeviation),
        valid: asChartNumber(row.valid),
        description: `Priemer: ${value}`,
      });
    });

  return output.slice(0, 80);
}


function buildScaleScoreChartPoints(
  stats: AnyRecord,
  questionnaireConfig: QuestionnaireConfig,
): AnyRecord[] {
  const output: AnyRecord[] = [];

  asRecordArray(stats.scaleScores)
    .filter(
      (row) =>
        !shouldRemoveUnconfirmedQuestionnaireRecord(row, questionnaireConfig),
    )
    .forEach((scale) => {
      const scores = asArray(scale.scores)
        .map(asChartNumber)
        .filter((value): value is number => value !== null);

      if (!scores.length) {
        return;
      }

      const mean =
        scores.reduce((sum, value) => sum + value, 0) / scores.length;

      const label = String(scale.scaleName ?? scale.scaleId ?? '').trim();

      if (!label) {
        return;
      }

      output.push({
        label,
        value: Number(mean.toFixed(3)),
        valid: scores.length,
        missingRows: asChartNumber(scale.missingRows),
        scoring: String(scale.scoring ?? ''),
        description: `Priemerné skóre: ${Number(mean.toFixed(3))}`,
      });
    });

  return output.slice(0, 80);
}


function buildReliabilityChartPoints(
  stats: AnyRecord,
  questionnaireConfig: QuestionnaireConfig,
): AnyRecord[] {
  const output: AnyRecord[] = [];

  asRecordArray(stats.reliability)
    .filter(
      (row) =>
        !shouldRemoveUnconfirmedQuestionnaireRecord(row, questionnaireConfig),
    )
    .forEach((row) => {
      const value = asChartNumber(row.cronbachAlpha);

      if (value === null) {
        return;
      }

      const label = String(row.scaleName ?? row.scaleId ?? '').trim();

      if (!label) {
        return;
      }

      output.push({
        label,
        value,
        cronbachAlpha: value,
        validRows: asChartNumber(row.validRows),
        description: String(row.interpretation ?? ''),
      });
    });

  return output.slice(0, 80);
}


function buildNormalityChartPoints(
  stats: AnyRecord,
  questionnaireConfig: QuestionnaireConfig,
): AnyRecord[] {
  const output: AnyRecord[] = [];

  asRecordArray(stats.normality)
    .filter(
      (row) =>
        !shouldRemoveUnconfirmedQuestionnaireRecord(row, questionnaireConfig),
    )
    .forEach((row) => {
      const value = asChartNumber(row.pValue);

      if (value === null) {
        return;
      }

      const label = String(row.variable ?? '').trim();

      if (!label) {
        return;
      }

      output.push({
        label,
        value,
        pValue: value,
        statistic: asChartNumber(row.statistic),
        recommendation: String(row.recommendation ?? ''),
        description: String(row.note ?? ''),
      });
    });

  return output.slice(0, 80);
}




function buildCorrelationChartPoints(
  stats: AnyRecord,
  questionnaireConfig: QuestionnaireConfig,
): AnyRecord[] {
  const output: AnyRecord[] = [];

  const pearsonRows: AnyRecord[] = asRecordArray(
    getNestedValue(stats, ['correlations', 'pearson']),
  ).map((item): AnyRecord => {
    const row = item as AnyRecord;

    return {
      ...row,
      method: String(row['method'] ?? 'pearson'),
    };
  });

  const spearmanRows: AnyRecord[] = asRecordArray(
    getNestedValue(stats, ['correlations', 'spearman']),
  ).map((item): AnyRecord => {
    const row = item as AnyRecord;

    return {
      ...row,
      method: String(row['method'] ?? 'spearman'),
    };
  });

  const rows: AnyRecord[] = [...pearsonRows, ...spearmanRows];

  rows
    .filter(
      (item) =>
        !shouldRemoveUnconfirmedQuestionnaireRecord(item, questionnaireConfig),
    )
    .forEach((item) => {
      const row = item as AnyRecord;

      const r = asChartNumber(
        row['r'] ??
          row['correlation'] ??
          row['correlationCoefficient'] ??
          row['coefficient'] ??
          row['rho'] ??
          row['pearsonR'] ??
          row['spearmanR'],
      );

      if (r === null) {
        return;
      }

      const method = String(row['method'] ?? '').trim();

      const variableA = String(
        row['variableA'] ??
          row['variable_a'] ??
          row['premenná_1'] ??
          row['premenna_1'] ??
          row['x'] ??
          '',
      ).trim();

      const variableB = String(
        row['variableB'] ??
          row['variable_b'] ??
          row['premenná_2'] ??
          row['premenna_2'] ??
          row['y'] ??
          '',
      ).trim();

      if (!variableA || !variableB) {
        return;
      }

      output.push({
        label: `${method}: ${variableA} × ${variableB}`,
        value: Math.abs(r),
        r,
        pValue: asChartNumber(row['pValue'] ?? row['p'] ?? row['p_value']),
        method,
        variableA,
        variableB,
        description: String(
          row['interpretation'] ??
            row['significance'] ??
            row['description'] ??
            '',
        ),
      });
    });

  return output.slice(0, 80);
}


function buildGroupTestChartPoints(
  stats: AnyRecord,
  questionnaireConfig: QuestionnaireConfig,
): AnyRecord[] {
  const output: AnyRecord[] = [];

  const parametricRows: AnyRecord[] = asRecordArray(
    getNestedValue(stats, ['groupTests', 'parametric']),
  ).map((item): AnyRecord => {
    const row = item as AnyRecord;

    return {
      ...row,
      testGroup: 'parametrické',
    };
  });

  const nonParametricRows: AnyRecord[] = asRecordArray(
    getNestedValue(stats, ['groupTests', 'nonParametric']),
  ).map((item): AnyRecord => {
    const row = item as AnyRecord;

    return {
      ...row,
      testGroup: 'neparametrické',
    };
  });

  const rows: AnyRecord[] = [...parametricRows, ...nonParametricRows];

  rows
    .filter(
      (item) =>
        !shouldRemoveUnconfirmedQuestionnaireRecord(item, questionnaireConfig),
    )
    .forEach((item) => {
      const row = item as AnyRecord;

      const pValue = asChartNumber(row['pValue'] ?? row['p'] ?? row['p_value']);

      const statistic = asChartNumber(
        row['statistic'] ??
          row['testStatistic'] ??
          row['f'] ??
          row['t'] ??
          row['u'] ??
          row['h'],
      );

      const value = pValue ?? statistic;

      if (value === null) {
        return;
      }

      const testType = String(
        row['testType'] ?? row['test'] ?? row['method'] ?? 'test',
      ).trim();

      const dependentVariable = String(
        row['dependentVariable'] ??
          row['dependent_variable'] ??
          row['závislá_premenná'] ??
          row['zavisla_premenna'] ??
          row['variable'] ??
          '',
      ).trim();

      const groupVariable = String(
        row['groupVariable'] ??
          row['group_variable'] ??
          row['skupinová_premenná'] ??
          row['skupinova_premenna'] ??
          row['groupColumn'] ??
          '',
      ).trim();

      if (!dependentVariable || !groupVariable) {
        return;
      }

      output.push({
        label: `${testType}: ${dependentVariable} podľa ${groupVariable}`,
        value,
        pValue,
        statistic,
        testType,
        group: String(row['testGroup'] ?? ''),
        description: String(
          row['recommendation'] ??
            row['significance'] ??
            row['interpretation'] ??
            '',
        ),
      });
    });

  return output.slice(0, 80);
}

function normalizeAnalysisChartData(
  stats: AnyRecord,
  questionnaireConfig: QuestionnaireConfig,
): Record<string, AnyRecord[]> {
  const source =
    getNestedValue(stats, ['chartData']) ||
    getNestedValue(stats, ['statisticalAnalysis', 'chartData']);

  const sourceRecord =
    source && typeof source === 'object' && !Array.isArray(source)
      ? (source as AnyRecord)
      : {};

  const frequencyBars =
    normalizeChartPoints(sourceRecord.frequencyBars, questionnaireConfig);
  const meanBars = normalizeChartPoints(sourceRecord.meanBars, questionnaireConfig);
  const scaleScoreBars = normalizeChartPoints(
    sourceRecord.scaleScoreBars,
    questionnaireConfig,
  );
  const subscaleScoreBars = normalizeChartPoints(
    sourceRecord.subscaleScoreBars,
    questionnaireConfig,
  );
  const reliabilityBars = normalizeChartPoints(
    sourceRecord.reliabilityBars,
    questionnaireConfig,
  );
  const correlationBars = normalizeChartPoints(
    sourceRecord.correlationBars,
    questionnaireConfig,
  );
  const normalityBars = normalizeChartPoints(
    sourceRecord.normalityBars,
    questionnaireConfig,
  );
  const missingValueBars = normalizeChartPoints(
    sourceRecord.missingValueBars,
    questionnaireConfig,
  );

  return {
    frequencyBars:
      frequencyBars.length > 0
        ? frequencyBars
        : buildFrequencyChartPoints(stats, questionnaireConfig),
    meanBars:
      meanBars.length > 0
        ? meanBars
        : buildDescriptiveChartPoints(stats.itemDescriptives, questionnaireConfig),
    scaleScoreBars:
      scaleScoreBars.length > 0
        ? scaleScoreBars
        : buildScaleScoreChartPoints(stats, questionnaireConfig),
    subscaleScoreBars:
      subscaleScoreBars.length > 0
        ? subscaleScoreBars
        : buildDescriptiveChartPoints(stats.scaleDescriptives, questionnaireConfig),
    reliabilityBars:
      reliabilityBars.length > 0
        ? reliabilityBars
        : buildReliabilityChartPoints(stats, questionnaireConfig),
    correlationBars:
      correlationBars.length > 0
        ? correlationBars
        : buildCorrelationChartPoints(stats, questionnaireConfig),
    normalityBars:
      normalityBars.length > 0
        ? normalityBars
        : buildNormalityChartPoints(stats, questionnaireConfig),
    groupTestBars: buildGroupTestChartPoints(stats, questionnaireConfig),
    missingValueBars,
  };
}

function normalizeRecommendedCharts(
  stats: AnyRecord,
  questionnaireConfig: QuestionnaireConfig,
  chartData: Record<string, AnyRecord[]>,
): AnyRecord[] {
  const existing = asRecordArray((stats as AnyRecord).recommendedCharts);

  if (existing.length > 0) {
    return existing
      .filter(
        (row) =>
          !shouldRemoveUnconfirmedQuestionnaireRecord(row, questionnaireConfig),
      )
      .map((row) => ({
        ...row,
        rows: asArray(row.rows).length || asChartNumber(row.rows) || 0,
        data: asRecordArray(row.data).slice(0, 30),
      }));
  }

  const definitions: Array<{
    key: string;
    title: string;
    type: 'bar' | 'line' | 'scatter' | 'pie';
    description: string;
  }> = [
    {
      key: 'frequencyBars',
      title: 'Frekvenčné grafy',
      type: 'bar',
      description: 'Početnosti odpovedí a kategórií po premenných.',
    },
    {
      key: 'meanBars',
      title: 'Priemery položiek',
      type: 'bar',
      description: 'Porovnanie priemerných hodnôt položiek.',
    },
    {
      key: 'scaleScoreBars',
      title: 'Priemerné skóre škál',
      type: 'bar',
      description: 'Graf celkových škál a dotazníkových skóre.',
    },
    {
      key: 'subscaleScoreBars',
      title: 'Priemerné skóre subškál',
      type: 'bar',
      description: 'Graf subškál a odvodených škálových premenných.',
    },
    {
      key: 'reliabilityBars',
      title: 'Reliabilita škál',
      type: 'bar',
      description: 'Cronbachovo alfa pre dostupné škály.',
    },
    {
      key: 'normalityBars',
      title: 'Normalita dát',
      type: 'bar',
      description: 'p-hodnoty testov normality pre analyzované premenné.',
    },
    {
      key: 'correlationBars',
      title: 'Korelácie',
      type: 'bar',
      description: 'Sila Pearsonových a Spearmanových korelácií.',
    },
    {
      key: 'groupTestBars',
      title: 'Skupinové testy',
      type: 'bar',
      description: 'p-hodnoty alebo štatistiky t-testu, ANOVA, Mann-Whitney a Kruskal-Wallis.',
    },
  ];

  return definitions
    .map((definition) => {
      const data = chartData[definition.key] ?? [];

      return {
        ...definition,
        rows: data.length,
        variables: data.map((item) => item.label).filter(Boolean).slice(0, 12),
        data: data.slice(0, 30),
        reason:
          data.length > 0
            ? 'Graf je dostupný z vypočítanej štatistickej analýzy.'
            : 'Graf zatiaľ nemá dostatok dát.',
      };
    })
    .filter((item) => item.rows > 0);
}

function normalizeRecommendedTests(stats: AnyRecord): AnyRecord[] {
  const correlations = asRecordArray(
    getNestedValue(stats, ['correlations', 'recommended']),
  );

  const groupTests = asRecordArray(
    getNestedValue(stats, ['groupTests', 'recommended']),
  );

  const correlationRows = correlations.map((item) => ({
    title: `${item.method || 'Korelácia'}: ${item.variableA || ''} × ${
      item.variableB || ''
    }`,
    test: item.method || 'correlation',
    variables: [item.variableA, item.variableB].filter(Boolean),
    pValue: item.pValue ?? item.p,
    result: item.interpretation || item.significance || '',
    reason: 'Odporúčané podľa normality dát.',
  }));

  const groupRows = groupTests.map((item) => ({
    title: `${item.testType || 'Test'}: ${item.dependentVariable || ''} podľa ${
      item.groupVariable || ''
    }`,
    test: item.testType || 'group-test',
    variables: [item.dependentVariable, item.groupVariable].filter(Boolean),
    pValue: item.pValue ?? item.p,
    result: item.recommendation || item.significance || '',
    reason: 'Odporúčané podľa počtu skupín a normality dát.',
  }));

  return [...correlationRows, ...groupRows];
}

function createExcelTables(
  stats: AnyRecord,
  questionnaireConfig: QuestionnaireConfig,
  chartData: Record<string, AnyRecord[]>,
): AnyRecord[] {
  const chartTables = asRecordArray(stats.chartTables);

  const baseTables = chartTables.length > 0
    ? chartTables
    : [
        {
          key: 'frequencies',
          title: 'Frekvenčné tabuľky',
          rows: asArray(stats.frequencies),
        },
        {
          key: 'descriptives',
          title: 'Deskriptívna štatistika',
          rows: [
            ...asArray(stats.itemDescriptives),
            ...asArray(stats.scaleDescriptives),
          ],
        },
        {
          key: 'reliability',
          title: 'Reliabilita',
          rows: asArray(stats.reliability),
        },
        {
          key: 'normality',
          title: 'Normalita',
          rows: asArray(stats.normality),
        },
        {
          key: 'pearson_correlations',
          title: 'Pearson korelácie',
          rows: asArray(getNestedValue(stats, ['correlations', 'pearson'])),
        },
        {
          key: 'spearman_correlations',
          title: 'Spearman korelácie',
          rows: asArray(getNestedValue(stats, ['correlations', 'spearman'])),
        },
        {
          key: 'parametric_tests',
          title: 'Parametrické testy – t-test a ANOVA',
          rows: asArray(getNestedValue(stats, ['groupTests', 'parametric'])),
        },
        {
          key: 'non_parametric_tests',
          title: 'Neparametrické testy – Mann-Whitney a Kruskal-Wallis',
          rows: asArray(getNestedValue(stats, ['groupTests', 'nonParametric'])),
        },
      ];

  const graphTables = Object.entries(chartData)
    .filter(([, rows]) => rows.length > 0)
    .map(([key, rows]) => ({
      key: `graf_${key}`,
      title: `Graf – ${key}`,
      rows,
    }));

  return [...baseTables, ...graphTables]
    .map((table) => {
      const tableRecord = table as AnyRecord;

      return {
        ...tableRecord,
        rows: Array.isArray(tableRecord.rows)
          ? tableRecord.rows.filter(
              (row) =>
                !shouldRemoveUnconfirmedQuestionnaireRecord(
                  row,
                  questionnaireConfig,
                ),
            )
          : tableRecord.rows,
      };
    })
    .filter((table) => {
      if (shouldRemoveUnconfirmedQuestionnaireRecord(table, questionnaireConfig)) {
        return false;
      }

      return Array.isArray(table.rows) ? table.rows.length > 0 : true;
    });
}


export async function GET() {
  return createJsonResponse(
    {
      ok: false,
      route: '/api/analyze-data',
      message: 'Endpoint /api/analyze-data používa metódu POST.',
      error: 'Použite POST s FormData a priloženým súborom.',
    },
    405,
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const questionnaireConfig = readQuestionnaireConfig(formData);
    const files = getUploadedFiles(formData);

    if (!files.length) {
      return createJsonResponse(
        {
          ok: false,
          title: 'Analýza dát',
          summary: '',
          dataDescription: '',
          warnings: ['Nebol nahratý žiadny súbor.'],
          variables: [],
          frequencies: [],
          descriptiveStatistics: [],
          recommendedTests: [],
          recommendedCharts: [],
          hypothesisTests: [],
          excelTables: [],
          practicalText: '',
          interpretation: '',
          fullText: '',
          error: 'Chýba súbor v poli file alebo files.',
        },
        400,
      );
    }

    const file = files[0];
    const workbook = await readWorkbookFromFile(file);
    const selected = selectWorksheet(workbook);

    if (!selected.rows.length) {
      return createJsonResponse(
        {
          ok: false,
          title: 'Analýza dát',
          summary: '',
          dataDescription: '',
          warnings: ['Súbor neobsahuje žiadne čitateľné dáta.'],
          variables: [],
          frequencies: [],
          descriptiveStatistics: [],
          recommendedTests: [],
          recommendedCharts: [],
          hypothesisTests: [],
          excelTables: [],
          practicalText: '',
          interpretation: '',
          fullText: '',
          error: 'Prvý alebo vybraný hárok je prázdny.',
        },
        400,
      );
    }

    const parsed = rowsToObjects(selected.rows);

    if (!parsed.rows.length) {
      return createJsonResponse(
        {
          ok: false,
          title: 'Analýza dát',
          summary: '',
          dataDescription: '',
          warnings: ['Nepodarilo sa vytvoriť dátové riadky z nahratého súboru.'],
          variables: [],
          frequencies: [],
          descriptiveStatistics: [],
          recommendedTests: [],
          recommendedCharts: [],
          hypothesisTests: [],
          excelTables: [],
          practicalText: '',
          interpretation: '',
          fullText: '',
          error: 'Dátové riadky sú prázdne.',
        },
        400,
      );
    }

    const runStats = runFullStatisticalAnalysis as unknown as (
      rows: AnyRecord[],
      options?: AnyRecord,
    ) => AnyRecord;

    const questionnaireWarnings = createQuestionnaireWarnings(
      parsed.headers,
      questionnaireConfig,
    );

    const stats = runStats(parsed.rows as AnyRecord[], {
      // Dôležité: WEMWBS/JSS a iné štandardizované dotazníky sa nesmú
      // zapnúť iba podľa názvov stĺpcov. Automatická detekcia je povolená
      // len vtedy, keď ju používateľ potvrdil výberom dotazníka.
      autoDetectScales: shouldAllowAutomaticScaleDetection(questionnaireConfig),
      fallbackToNumericVariables: true,
      autoDetectGroupColumns: true,
      includeFrequencies: true,
      includeItemDescriptives: true,
      alpha: 0.05,
      questionnaireConfig,
      selectedQuestionnaires: questionnaireConfig.selectedQuestionnaires,
      customQuestionnaires: questionnaireConfig.customQuestionnaires,
      strictQuestionnaireMode: true,
      allowUnconfirmedStandardizedQuestionnaires: false,
    });

    const chartData = normalizeAnalysisChartData(stats, questionnaireConfig);
    const recommendedCharts = normalizeRecommendedCharts(
      stats,
      questionnaireConfig,
      chartData,
    );
    const recommendedTests = normalizeRecommendedTests(stats).filter(
      (row) => !shouldRemoveUnconfirmedQuestionnaireRecord(row, questionnaireConfig),
    );
    const excelTables = createExcelTables(stats, questionnaireConfig, chartData)
      .map((table) => {
        const tableRecord = table as AnyRecord;

        return {
          ...tableRecord,
          rows: Array.isArray(tableRecord.rows)
            ? tableRecord.rows.filter(
                (row) =>
                  !shouldRemoveUnconfirmedQuestionnaireRecord(
                    row,
                    questionnaireConfig,
                  ),
              )
            : tableRecord.rows,
        };
      })
      .filter(
        (table) =>
          !shouldRemoveUnconfirmedQuestionnaireRecord(
            table,
            questionnaireConfig,
          ),
      );

    const descriptiveStatistics = [
      ...asArray(stats.itemDescriptives),
      ...filterQuestionnaireRows(stats.scaleDescriptives, questionnaireConfig),
    ];

    const warnings = filterQuestionnaireWarnings(
      [
        ...questionnaireWarnings,
        ...asArray(stats.warnings),
      ],
      questionnaireConfig,
    );

    const respondentCount =
      Number(getNestedValue(stats, ['meta', 'respondentCount'])) ||
      parsed.rows.length;

    const title = 'Výsledky analýzy dát';

    const summary = `Analýza bola spracovaná na súbore ${file.name}. Bolo načítaných ${parsed.rows.length} riadkov a ${parsed.headers.length} premenných.`;

    const dataDescription =
      `Použitý hárok: ${selected.sheetName || 'nezistený'}. ` +
      `Riadok hlavičky: ${parsed.headerRowIndex + 1}. ` +
      `Počet respondentov / záznamov: ${respondentCount}.`;

    const practicalText =
      'Dáta boli pripravené na frekvenčnú analýzu, deskriptívnu štatistiku, kontrolu normality, reliabilitu, korelácie a testovanie rozdielov medzi skupinami. Výsledky je možné použiť v praktickej časti práce.';

    const interpretation =
      'Interpretácia výsledkov musí vychádzať z charakteru premenných, normality dát a zvolených štatistických testov. Pri nenormálnom rozdelení dát je vhodné uprednostniť neparametrické testy a Spearmanovu koreláciu.';

    const fullText = [
      title,
      '',
      summary,
      '',
      dataDescription,
      '',
      practicalText,
      '',
      interpretation,
    ].join('\n');

    return createJsonResponse({
      ok: true,
      title,
      summary,
      dataDescription,
      warnings,

      variables: asArray(getNestedValue(stats, ['aliases', 'variables'])),
      frequencies: asArray(stats.frequencies),
      descriptiveStatistics,
      recommendedTests,
      recommendedCharts,
      chartCards: recommendedCharts,
      graphData: chartData,
      hypothesisTests: asArray(getNestedValue(stats, ['groupTests', 'recommended'])),
      excelTables,

      practicalText,
      interpretation,
      fullText,

      questionnaireConfig,
      questionnaireSuggestions: questionnaireWarnings,

      statisticalAnalysis: stats,
      chartData,
      chartTables: excelTables.filter((table) => {
        const tableRecord = table as AnyRecord;

        return String(tableRecord['key'] ?? '').startsWith('graf_');
      }),
      scaleScores: filterQuestionnaireRows(stats.scaleScores, questionnaireConfig),
      scaleDescriptives: filterQuestionnaireRows(stats.scaleDescriptives, questionnaireConfig),
      normality: filterQuestionnaireRows(stats.normality, questionnaireConfig),
      correlations: stats.correlations || {},
      reliability: filterQuestionnaireRows(stats.reliability, questionnaireConfig),
      groupTests: stats.groupTests || {},
      correlationMatrix: filterQuestionnaireRows(stats.correlationMatrix, questionnaireConfig),
      scaleDefinitions: filterQuestionnaireRows(stats.scaleDefinitions, questionnaireConfig),
      combinedScaleDefinitions: filterQuestionnaireRows(stats.combinedScaleDefinitions, questionnaireConfig),
      scaleScoreRows: asArray(stats.scaleScoreRows),
      aliases: stats.aliases || {},

      meta: {
        filesCount: files.length,
        extractedChars: 0,
        generatedAt: new Date().toISOString(),
        source: file.name,
        sheetName: selected.sheetName,
        rows: parsed.rows.length,
        columns: parsed.headers.length,
        respondentCount,
        questionnaireMode: questionnaireConfig.mode,
        selectedQuestionnaires: questionnaireConfig.selectedQuestionnaires,
      },

      preparedFile: {
        fileName: file.name,
        rows: parsed.rows.length,
        columns: parsed.headers.length,
        warnings,
        qualityReport: [],
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Neznáma chyba pri analýze dát.';

    console.error('[api/analyze-data] Chyba:', error);

    return createJsonResponse(
      {
        ok: false,
        title: 'Analýza dát',
        summary: '',
        dataDescription: '',
        warnings: [message],
        variables: [],
        frequencies: [],
        descriptiveStatistics: [],
        recommendedTests: [],
        recommendedCharts: [],
        hypothesisTests: [],
        excelTables: [],
        practicalText: '',
        interpretation: '',
        fullText: '',
        message: 'Analýza dát zlyhala.',
        error: message,
        meta: {
          filesCount: 0,
          extractedChars: 0,
          generatedAt: new Date().toISOString(),
        },
      },
      500,
    );
  }
}

export async function PUT() {
  return createJsonResponse(
    {
      ok: false,
      route: '/api/analyze-data',
      message: 'Metóda PUT nie je podporovaná.',
      error: 'Použite POST.',
    },
    405,
  );
}

export async function PATCH() {
  return createJsonResponse(
    {
      ok: false,
      route: '/api/analyze-data',
      message: 'Metóda PATCH nie je podporovaná.',
      error: 'Použite POST.',
    },
    405,
  );
}

export async function DELETE() {
  return createJsonResponse(
    {
      ok: false,
      route: '/api/analyze-data',
      message: 'Metóda DELETE nie je podporovaná.',
      error: 'Použite POST.',
    },
    405,
  );
}