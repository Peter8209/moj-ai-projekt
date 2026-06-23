import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type RowValue = string | number | boolean | null;

type DataRow = Record<string, RowValue>;

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

type PrepareResponse = {
  ok: boolean;
  message: string;
  preparedFileName?: string;
  preparedFileBase64?: string;
  mimeType?: string;
  rows?: number;
  columns?: number;
  sheets?: string[];
  warnings?: string[];
  qualityReport?: QualityReportItem[];
  questionnaireConfig?: QuestionnaireConfig;
  error?: string;
};

const EXCEL_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

function getNormalizedManualQuestionnaireText(
  questionnaireConfig: QuestionnaireConfig,
): string {
  return removeDiacritics(
    [
      questionnaireConfig.customQuestionnairesText,
      questionnaireConfig.manualScalesText,
      questionnaireConfig.manualSubscalesText,
      questionnaireConfig.groupingColumnsText,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  );
}

function manualTextMentionsQuestionnaire(
  questionnaireConfig: QuestionnaireConfig,
  questionnaireId: QuestionnaireId,
): boolean {
  const normalizedText = getNormalizedManualQuestionnaireText(questionnaireConfig);

  if (!normalizedText) return false;

  if (questionnaireId === 'wemwbs') {
    return /wem|wembs|warwick|wellbeing|pohod/.test(normalizedText);
  }

  if (questionnaireId === 'jss') {
    return /\bjss\b|job satisfaction|pracovn.*spokoj|spokojnost.*prac/.test(
      normalizedText,
    );
  }

  if (questionnaireId === 'sehs_s_2020') {
    return /sehs|social emotional health/.test(normalizedText);
  }

  if (questionnaireId === 'resilience_scale') {
    return /rezilien|resilien|cd-risc|\brs\b/.test(normalizedText);
  }

  return false;
}

function shouldUseQuestionnaire(
  questionnaireConfig: QuestionnaireConfig,
  questionnaireId: QuestionnaireId,
  autoDetected: boolean,
): boolean {
  if (questionnaireConfig.mode === 'none') return false;

  if (questionnaireConfig.mode === 'selected') {
    return questionnaireConfig.selectedQuestionnaires.includes(questionnaireId);
  }

  if (questionnaireConfig.mode === 'manual') {
    return manualTextMentionsQuestionnaire(questionnaireConfig, questionnaireId);
  }

  /*
   * Režim „Neviem / iba navrhnúť“ nesmie automaticky počítať WEMWBS/JSS.
   * V tomto režime sa môže vypísať iba odporúčanie/upozornenie.
   */
  if (questionnaireConfig.mode === 'auto-suggest-only') {
    return false;
  }

  return autoDetected;
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

function createJsonResponse(payload: PrepareResponse, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
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

function isExcelFileName(fileName: string): boolean {
  return /\.(xlsx|xls|xlsm)$/i.test(fileName);
}

function isCsvFileName(fileName: string): boolean {
  return /\.csv$/i.test(fileName);
}

function getUploadedFile(formData: FormData): File | null {
  const directFile = formData.get('file');

  if (directFile instanceof File) {
    return directFile;
  }

  for (const [, value] of formData.entries()) {
    if (value instanceof File) {
      return value;
    }
  }

  return null;
}

function getWorkbookFirstSheetRows(workbook: XLSX.WorkBook): unknown[][] {
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });
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

function getExplicitQuestionnaireColumnType(header: string): 'WEM' | 'JSS' | null {
  const { compact } = normalizeQuestionnaireHeader(header);

  if (
    /^wem(?:wbs)?0?(\d{1,2})$/.test(compact) ||
    /^wem(?:wbs)?_?0?(\d{1,2})$/.test(compact) ||
    /^w0?(\d{1,2})$/.test(compact) ||
    /wem(?:wbs)?(?:polozka|item|otazka|question)?0?(\d{1,2})/.test(compact)
  ) {
    return 'WEM';
  }

  if (
    /^jss0?(\d{1,2})$/.test(compact) ||
    /^jss_?0?(\d{1,2})$/.test(compact) ||
    /^js0?(\d{1,2})$/.test(compact) ||
    /jss(?:polozka|item|otazka|question)?0?(\d{1,2})/.test(compact)
  ) {
    return 'JSS';
  }

  const rawLower = removeDiacritics(header).toLowerCase();

  if (/(wem|wemwbs|well|pohod|dusev|psychick).*?(\d{1,2})/.test(rawLower)) {
    return 'WEM';
  }

  if (/(jss|job satisfaction|pracovn|spokoj|zamestn).*?(\d{1,2})/.test(rawLower)) {
    return 'JSS';
  }

  return null;
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

  if (questionnaireConfig.mode === 'none') {
    warnings.push(
      'Automatické mapovanie štandardizovaných dotazníkov bolo vypnuté, pretože používateľ zvolil analýzu bez štandardizovaného dotazníka.',
    );

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
       * Zámerne pripúšťame aj všeobecné dotazníkové stĺpce bez kľúčových slov.
       * Mnohé exporty z Forms / Google Forms majú v hlavičke iba plný text otázky,
       * nie kód WEM1/JSS1. Preto sa po odfiltrovaní demografie mapuje podľa poradia.
       */
      return looksLikeQuestionColumn(item.header) || true;
    })
    .map((item) => item.index);

  if (questionnaireConfig.mode === 'auto-suggest-only') {
    if (!hasAnyWem && !hasAnyJss && candidateIndexes.length >= 50) {
      warnings.push(
        'Súbor pravdepodobne obsahuje WEMWBS + JSS, ale používateľ zvolil iba návrh. Položky sa neprepisujú a skóre sa automaticky nevytvára.',
      );
    } else if (!hasAnyJss && candidateIndexes.length >= 36) {
      warnings.push(
        'Súbor pravdepodobne obsahuje JSS, ale používateľ zvolil iba návrh. Položky sa neprepisujú a JSS skóre sa automaticky nevytvára.',
      );
    } else if (!hasAnyWem && candidateIndexes.length >= 14) {
      warnings.push(
        'Súbor pravdepodobne obsahuje WEMWBS, ale používateľ zvolil iba návrh. Položky sa neprepisujú a WEMWBS skóre sa automaticky nevytvára.',
      );
    }

    return {
      headers: nextHeaders,
      warnings,
    };
  }

  /*
   * Ručný výber používateľa má prednosť:
   * ak používateľ vybral WEMWBS + JSS, mapujeme presne tieto dva dotazníky podľa poradia,
   * ale iba vtedy, keď stĺpce ešte nie sú explicitne pomenované.
   */
  if (
    (questionnaireConfig.mode === 'selected' || questionnaireConfig.mode === 'manual') &&
    selectedWem &&
    selectedJss &&
    !hasAnyWem &&
    !hasAnyJss &&
    candidateIndexes.length >= 50
  ) {
    const wemIndexes = candidateIndexes.slice(0, 14);
    const jssIndexes = candidateIndexes.slice(14, 50);

    wemIndexes.forEach((columnIndex, itemIndex) => {
      nextHeaders[columnIndex] = `WEM${itemIndex + 1}`;
      alreadyMappedIndexes.add(columnIndex);
    });

    jssIndexes.forEach((columnIndex, itemIndex) => {
      nextHeaders[columnIndex] = `JSS${itemIndex + 1}`;
      alreadyMappedIndexes.add(columnIndex);
    });

    warnings.push(
      'Používateľ vybral WEMWBS + JSS. Položky WEM1–WEM14 a JSS1–JSS36 boli vytvorené podľa poradia stĺpcov, bez prepísania AI detekciou.',
    );

    return {
      headers: nextHeaders,
      warnings,
    };
  }

  /*
   * Ak máme explicitné názvy WEM/JSS, poradie už netreba agresívne prepisovať.
   */
  if (hasAnyWem && hasAnyJss) {
    return {
      headers: nextHeaders,
      warnings,
    };
  }

  /*
   * Variant 1: súbor obsahuje WEMWBS + JSS spolu.
   * Prvých 14 dotazníkových stĺpcov po demografii = WEM1–WEM14.
   * Ďalších 36 dotazníkových stĺpcov = JSS1–JSS36.
   */
  if (
    false &&
    !hasAnyWem &&
    !hasAnyJss &&
    candidateIndexes.length >= 50
  ) {
    const wemIndexes = candidateIndexes.slice(0, 14);
    const jssIndexes = candidateIndexes.slice(14, 50);

    wemIndexes.forEach((columnIndex, itemIndex) => {
      nextHeaders[columnIndex] = `WEM${itemIndex + 1}`;
      alreadyMappedIndexes.add(columnIndex);
    });

    jssIndexes.forEach((columnIndex, itemIndex) => {
      nextHeaders[columnIndex] = `JSS${itemIndex + 1}`;
      alreadyMappedIndexes.add(columnIndex);
    });

    warnings.push(
      'Súbor pravdepodobne obsahuje WEMWBS + JSS. Položky WEM1–WEM14 a JSS1–JSS36 boli vytvorené automaticky podľa poradia stĺpcov.',
    );

    return {
      headers: nextHeaders,
      warnings,
    };
  }

  /*
   * Variant 2: súbor obsahuje iba JSS.
   * Musí byť pred WEM-only vetvou, aby sa 36 položiek nemapovalo nesprávne ako WEM + zvyšok.
   */
  if (
    selectedJss &&
    !hasAnyJss &&
    !selectedWem &&
    candidateIndexes.length >= 36
  ) {
    const jssIndexes = candidateIndexes.slice(0, 36);

    jssIndexes.forEach((columnIndex, itemIndex) => {
      nextHeaders[columnIndex] = `JSS${itemIndex + 1}`;
      alreadyMappedIndexes.add(columnIndex);
    });

    warnings.push(
      'Súbor pravdepodobne obsahuje iba JSS dotazník. Položky JSS1 až JSS36 boli vytvorené automaticky podľa poradia stĺpcov.',
    );

    return {
      headers: nextHeaders,
      warnings,
    };
  }

  /*
   * Variant 3: súbor obsahuje iba WEMWBS.
   */
  if (
    selectedWem &&
    !hasAnyWem &&
    !selectedJss &&
    candidateIndexes.length >= 14
  ) {
    const wemIndexes = candidateIndexes.slice(0, 14);

    wemIndexes.forEach((columnIndex, itemIndex) => {
      nextHeaders[columnIndex] = `WEM${itemIndex + 1}`;
      alreadyMappedIndexes.add(columnIndex);
    });

    warnings.push(
      'Súbor pravdepodobne obsahuje iba WEMWBS dotazník. Položky WEM1 až WEM14 boli vytvorené automaticky podľa poradia stĺpcov.',
    );

    return {
      headers: nextHeaders,
      warnings,
    };
  }

  /*
   * Variant 4: už existuje WEM, ale JSS chýba – zvyšné dotazníkové stĺpce mapujeme na JSS.
   */
  if (selectedJss && hasAnyWem && !hasAnyJss) {
    const remainingCandidateIndexes = candidateIndexes.filter(
      (index) => !alreadyMappedIndexes.has(index),
    );

    if (remainingCandidateIndexes.length >= 36) {
      const jssIndexes = remainingCandidateIndexes.slice(0, 36);

      jssIndexes.forEach((columnIndex, itemIndex) => {
        nextHeaders[columnIndex] = `JSS${itemIndex + 1}`;
        alreadyMappedIndexes.add(columnIndex);
      });

      warnings.push(
        'Položky JSS1 až JSS36 boli doplnené automaticky podľa poradia zostávajúcich dotazníkových stĺpcov.',
      );
    }
  }

  /*
   * Variant 5: už existuje JSS, ale WEM chýba – prvých 14 zvyšných stĺpcov mapujeme na WEM.
   */
  if (selectedWem && hasAnyJss && !hasAnyWem && candidateIndexes.length >= 14) {
    const wemIndexes = candidateIndexes.slice(0, 14);

    wemIndexes.forEach((columnIndex, itemIndex) => {
      nextHeaders[columnIndex] = `WEM${itemIndex + 1}`;
      alreadyMappedIndexes.add(columnIndex);
    });

    warnings.push(
      'Položky WEM1 až WEM14 boli doplnené automaticky podľa poradia zostávajúcich dotazníkových stĺpcov.',
    );
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
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
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

  const name =
    separatorIndex >= 0
      ? value.slice(0, separatorIndex).trim()
      : `${kind} ${index + 1}`;

  const items =
    separatorIndex >= 0
      ? value.slice(separatorIndex + 1).trim()
      : value;

  if (!items) {
    return null;
  }

  const outputName = `${kind === 'škála' ? 'SCALE' : 'SUBSCALE'}_${normalizeHeaderKey(name).toUpperCase()}`;

  return {
    skala: name || `${kind} ${index + 1}`,
    polozky: items,
    vypocet:
      'Definícia zo zadania používateľa. Finálne skóre, deskriptíva, reliabilita, normalita, korelácie a testy rozdielov sa počítajú v analysisStats.ts.',
    vyslednaPremenna: outputName,
    poznamka:
      kind === 'škála'
        ? 'Manuálne zadaná škála pred spustením analýzy dát.'
        : 'Manuálne zadaná subškála pred spustením analýzy dát.',
  };
}

function createManualScoringItems(questionnaireConfig: QuestionnaireConfig): ScoringItem[] {
  const scaleItems = splitManualLines(questionnaireConfig.manualScalesText)
    .map((line, index) => parseManualScoringLine(line, 'škála', index))
    .filter((item): item is ScoringItem => Boolean(item));

  const subscaleItems = splitManualLines(questionnaireConfig.manualSubscalesText)
    .map((line, index) => parseManualScoringLine(line, 'subškála', index))
    .filter((item): item is ScoringItem => Boolean(item));

  return [...scaleItems, ...subscaleItems];
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
  const scoringItems: ScoringItem[] = createManualScoringItems(questionnaireConfig);

  const wemColumns = Array.from({ length: 14 }, (_, index) => `WEM${index + 1}`);
  const jssColumns = Array.from({ length: 36 }, (_, index) => `JSS${index + 1}`);

  const autoHasAnyWem = wemColumns.some((column) => nextHeaders.includes(column));
  const autoHasAllWem = hasColumns(nextHeaders, wemColumns);

  const autoHasAnyJss = jssColumns.some((column) => nextHeaders.includes(column));
  const autoHasAllJss = hasColumns(nextHeaders, jssColumns);

  const hasAnyWem =
    questionnaireConfig.mode === 'selected' &&
    shouldUseQuestionnaire(
      questionnaireConfig,
      'wemwbs',
      autoHasAnyWem,
    );
  const hasAllWem = hasAnyWem && autoHasAllWem;

  const hasAnyJss =
    questionnaireConfig.mode === 'selected' &&
    shouldUseQuestionnaire(
      questionnaireConfig,
      'jss',
      autoHasAnyJss,
    );
  const hasAllJss = hasAnyJss && autoHasAllJss;

  if (hasAnyWem && !autoHasAnyWem) {
    warnings.push(
      'Používateľ vybral WEMWBS, ale v pripravených dátach sa nepodarilo nájsť alebo vytvoriť položky WEM1 až WEM14. Skontrolujte názvy stĺpcov alebo poradie položiek.',
    );
  }

  if (hasAnyJss && !autoHasAnyJss) {
    warnings.push(
      'Používateľ vybral JSS, ale v pripravených dátach sa nepodarilo nájsť alebo vytvoriť položky JSS1 až JSS36. Skontrolujte názvy stĺpcov alebo poradie položiek.',
    );
  }

  if (hasAnyWem) {
    if (!nextHeaders.includes('WEMWBS_skore')) {
      nextHeaders.push('WEMWBS_skore');
    }

    if (!nextHeaders.includes('WEMWBS_priemer')) {
      nextHeaders.push('WEMWBS_priemer');
    }

    scoringItems.push({
      skala: 'WEMWBS',
      polozky: 'WEM1–WEM14',
      vypocet: 'Súčet dostupných položiek WEM1 až WEM14',
      vyslednaPremenna: 'WEMWBS_skore',
      poznamka: hasAllWem
        ? 'Všetkých 14 položiek bolo nájdených.'
        : 'Niektoré položky WEMWBS chýbajú, skóre je počítané z dostupných položiek.',
    });

    scoringItems.push({
      skala: 'WEMWBS',
      polozky: 'WEM1–WEM14',
      vypocet: 'Priemer dostupných položiek WEM1 až WEM14',
      vyslednaPremenna: 'WEMWBS_priemer',
      poznamka:
        'Priemer slúži ako pomocná premenná pri kontrole škály.',
    });

    if (!hasAllWem) {
      warnings.push(
        'Neboli nájdené všetky položky WEM1 až WEM14. WEMWBS_skore bolo vypočítané iba z dostupných položiek.',
      );
    }
  }

  if (hasAnyJss) {
    if (!nextHeaders.includes('JSS_skore')) {
      nextHeaders.push('JSS_skore');
    }

    if (!nextHeaders.includes('JSS_priemer')) {
      nextHeaders.push('JSS_priemer');
    }

    Object.keys(JSS_SUBSCALES).forEach((subscaleName) => {
      if (!nextHeaders.includes(subscaleName)) {
        nextHeaders.push(subscaleName);
      }
    });

    scoringItems.push({
      skala: 'JSS',
      polozky: 'JSS1–JSS36',
      vypocet:
        'Súčet dostupných položiek JSS1 až JSS36; negatívne položky sú reverzne skórované podľa pravidla 7 - hodnota.',
      vyslednaPremenna: 'JSS_skore',
      poznamka: hasAllJss
        ? 'Všetkých 36 položiek bolo nájdených.'
        : 'Niektoré položky JSS chýbajú, skóre je počítané z dostupných položiek.',
    });

    scoringItems.push({
      skala: 'JSS',
      polozky: 'JSS1–JSS36',
      vypocet:
        'Priemer dostupných reverzne upravených položiek JSS1 až JSS36.',
      vyslednaPremenna: 'JSS_priemer',
      poznamka:
        'Priemer slúži ako pomocná premenná pri kontrole pracovnej spokojnosti.',
    });

    Object.entries(JSS_SUBSCALES).forEach(([subscaleName, itemNumbers]) => {
      scoringItems.push({
        skala: 'JSS subškála',
        polozky: itemNumbers.map((itemNumber) => `JSS${itemNumber}`).join(', '),
        vypocet:
          'Súčet dostupných položiek subškály; negatívne položky sú reverzne skórované podľa pravidla 7 - hodnota.',
        vyslednaPremenna: subscaleName,
        poznamka:
          'Subškála pracovnej spokojnosti podľa štruktúry JSS.',
      });
    });

    if (!hasAllJss) {
      warnings.push(
        'Neboli nájdené všetky položky JSS1 až JSS36. JSS_skore a subškály boli vypočítané iba z dostupných položiek.',
      );
    }
  }

  const rows = cleanRows.map((row) => {
    const nextRow: DataRow = { ...row };

    if (hasAnyWem) {
      const wemValues = wemColumns.map((column) => toNumber(nextRow[column]));

      nextRow.WEMWBS_skore = sumExistingValues(wemValues);
      nextRow.WEMWBS_priemer = averageExistingValues(wemValues);
    }

    if (hasAnyJss) {
      const jssValues = jssColumns.map((column, index) =>
        reverseJssValue(index + 1, nextRow[column]),
      );

      nextRow.JSS_skore = sumExistingValues(jssValues);
      nextRow.JSS_priemer = averageExistingValues(jssValues);

      Object.entries(JSS_SUBSCALES).forEach(([subscaleName, itemNumbers]) => {
        const values = itemNumbers.map((itemNumber) =>
          reverseJssValue(itemNumber, nextRow[`JSS${itemNumber}`]),
        );

        nextRow[subscaleName] = sumExistingValues(values);
      });
    }

    return nextRow;
  });

  if (!hasAnyWem && questionnaireConfig.mode === 'selected' && questionnaireConfig.selectedQuestionnaires.includes('wemwbs')) {
    warnings.push(
      'Používateľ vybral WEMWBS, ale WEMWBS_skore nebolo vytvorené, pretože chýbajú položky WEM1 až WEM14.',
    );
  }

  if (!hasAnyJss && questionnaireConfig.mode === 'selected' && questionnaireConfig.selectedQuestionnaires.includes('jss')) {
    warnings.push(
      'Používateľ vybral JSS, ale JSS_skore a JSS subškály neboli vytvorené, pretože chýbajú položky JSS1 až JSS36.',
    );
  }

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
        : 'Neboli zadané manuálne škály ani subškály. Systém použije iba všeobecnú analýzu dostupných premenných.',
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
        'Vyčistené a štandardizované dáta pripravené na štatistickú analýzu.',
    },
    {
      cast: 'VARIABLE_DICTIONARY',
      popis:
        'Dátový slovník s popisom premenných, typmi a odporúčaným použitím.',
    },
    {
      cast: 'SCORING',
      popis:
        'Popis používateľom zadaných škál a subškál. Formát: Názov škály = položka1, položka2 alebo položka1 až položka10.',
    },
    {
      cast: 'QUALITY_REPORT',
      popis:
        'Kontrola kvality pripraveného súboru pred spustením štatistiky.',
    },
    {
      cast: 'DÔLEŽITÉ',
      popis:
        'Prepare route už nepracuje s pevnými kartičkami WEMWBS/JSS/SEHS/Resilience ako hlavným workflow. Používateľ zadáva vlastné škály, subškály a skupinové premenné v troch kolónkach pred analýzou.',
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
  const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  XLSX.utils.book_append_sheet(workbook, worksheet, normalizeSheetName(name));
}

function buildPreparedWorkbook(params: {
  rawRows: DataRow[];
  cleanRows: DataRow[];
  variableDictionary: VariableDictionaryItem[];
  scoringItems: ScoringItem[];
  qualityReport: QualityReportItem[];
  questionnaireConfig: QuestionnaireConfig;
}): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

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
  addWorksheetFromJson(workbook, 'README', createReadmeRows());

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = getUploadedFile(formData);

    if (!file) {
      return createJsonResponse(
        {
          ok: false,
          message: 'Súbor nebol nahratý.',
          error: 'Chýba parameter file vo FormData.',
        },
        400,
      );
    }

    const questionnaireConfig = normalizeQuestionnaireConfig(formData);

    const workbook = await readWorkbookFromFile(file);
    const rows = getWorkbookFirstSheetRows(workbook);

    if (!rows.length) {
      return createJsonResponse(
        {
          ok: false,
          message: 'Súbor neobsahuje dáta.',
          error: 'Prvý hárok je prázdny alebo sa ho nepodarilo načítať.',
        },
        400,
      );
    }

    const converted = convertRowsToObjects(rows, questionnaireConfig);

    const scoringResult = calculateScores(
      converted.cleanRows,
      converted.headers,
      questionnaireConfig,
    );

    const allWarnings = [
      ...createQuestionnaireSelectionWarnings(questionnaireConfig),
      ...converted.warnings,
      ...scoringResult.warnings,
    ];

    const rangeControl = countInvalidRanges(
      scoringResult.rows,
      scoringResult.headers,
    );

    const finalWarnings = [
      ...allWarnings,
      ...rangeControl.warnings,
    ];

    const variableDictionary = createVariableDictionary(
      scoringResult.headers,
      converted.originalHeaders,
      scoringResult.rows,
    );

    const qualityReport = createQualityReport({
      rawRows: converted.rawRows,
      cleanRows: scoringResult.rows,
      headers: scoringResult.headers,
      warnings: finalWarnings,
      scoringItems: scoringResult.scoringItems,
    });

    const preparedWorkbook = buildPreparedWorkbook({
      rawRows: converted.rawRows,
      cleanRows: scoringResult.rows,
      variableDictionary,
      scoringItems: scoringResult.scoringItems,
      qualityReport,
      questionnaireConfig,
    });

    const preparedBuffer = XLSX.write(preparedWorkbook, {
      bookType: 'xlsx',
      type: 'buffer',
      compression: true,
    }) as Buffer;

    const preparedFileName = createPreparedFileName(file.name || 'data.xlsx');
    const preparedFileBase64 = preparedBuffer.toString('base64');

    return createJsonResponse({
      ok: true,
      message:
        'Súbor bol pripravený podľa vzoru. Štatistiku spúšťajte až nad listom DATA_CLEAN z pripraveného súboru.',
      preparedFileName,
      preparedFileBase64,
      mimeType: EXCEL_MIME_TYPE,
      rows: scoringResult.rows.length,
      columns: scoringResult.headers.length,
      sheets: [
        'DATA_RAW',
        'DATA_CLEAN',
        'VARIABLE_DICTIONARY',
        'SCORING',
        'QUESTIONNAIRE_SETUP',
        'QUALITY_REPORT',
        'README',
      ],
      warnings: finalWarnings,
      qualityReport,
      questionnaireConfig,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Neznáma chyba pri príprave súboru.';

    console.error('[analyze-data/prepare] Chyba prípravy súboru:', error);

    return createJsonResponse(
      {
        ok: false,
        message: 'Príprava súboru zlyhala.',
        error: message,
      },
      500,
    );
  }
}