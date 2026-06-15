import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RowValue = string | number | boolean | null;

type DataRow = Record<string, RowValue>;

type QualityStatus = 'ok' | 'warning' | 'error';

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

function createUniqueHeaders(rawHeaders: unknown[]): {
  headers: string[];
  originalHeaders: string[];
  duplicateWarnings: string[];
} {
  const used = new Map<string, number>();
  const headers: string[] = [];
  const originalHeaders: string[] = [];
  const duplicateWarnings: string[] = [];

  rawHeaders.forEach((header, index) => {
    const original =
      String(header ?? '').trim() || `Stĺpec_${index + 1}`;

    const normalized = normalizeHeaderKey(original);
    const mapped = mapColumnName(original, index);

    const baseName =
      mapped || normalized || `STLPEC_${index + 1}`;

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
    originalHeaders.push(original);
  });

  return {
    headers,
    originalHeaders,
    duplicateWarnings,
  };
}

function mapColumnName(originalHeader: string, index: number): string {
  const normalized = normalizeHeaderKey(originalHeader);

  if (STANDARD_COLUMN_MAP[normalized]) {
    return STANDARD_COLUMN_MAP[normalized];
  }

  const wemMatch = normalized.match(/^wem(?:wbs)?_?(\d{1,2})$/i);

  if (wemMatch?.[1]) {
    const number = Number(wemMatch[1]);

    if (number >= 1 && number <= 14) {
      return `WEM${number}`;
    }
  }

  const wemTextMatch = normalized.match(/wem.*?(\d{1,2})/i);

  if (wemTextMatch?.[1]) {
    const number = Number(wemTextMatch[1]);

    if (number >= 1 && number <= 14) {
      return `WEM${number}`;
    }
  }

  const jssMatch = normalized.match(/^jss_?(\d{1,2})$/i);

  if (jssMatch?.[1]) {
    const number = Number(jssMatch[1]);

    if (number >= 1 && number <= 36) {
      return `JSS${number}`;
    }
  }

  const jssTextMatch = normalized.match(/jss.*?(\d{1,2})/i);

  if (jssTextMatch?.[1]) {
    const number = Number(jssTextMatch[1]);

    if (number >= 1 && number <= 36) {
      return `JSS${number}`;
    }
  }

  if (!normalized) {
    return `STLPEC_${index + 1}`;
  }

  return normalized
    .toUpperCase()
    .replace(/^RODINNY_STAV$/, 'RODINNY_STAV')
    .replace(/^TYP_PODNIKU$/, 'TYP_PODNIKU');
}

function convertRowsToObjects(rows: unknown[][]): {
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
  } = createUniqueHeaders(rawHeaderRow);

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

function calculateScores(cleanRows: DataRow[], headers: string[]): {
  rows: DataRow[];
  headers: string[];
  scoringItems: ScoringItem[];
  warnings: string[];
} {
  const nextHeaders = [...headers];
  const warnings: string[] = [];
  const scoringItems: ScoringItem[] = [];

  const wemColumns = Array.from({ length: 14 }, (_, index) => `WEM${index + 1}`);
  const jssColumns = Array.from({ length: 36 }, (_, index) => `JSS${index + 1}`);

  const hasAnyWem = wemColumns.some((column) => nextHeaders.includes(column));
  const hasAllWem = hasColumns(nextHeaders, wemColumns);

  const hasAnyJss = jssColumns.some((column) => nextHeaders.includes(column));
  const hasAllJss = hasColumns(nextHeaders, jssColumns);

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

  if (!hasAnyWem) {
    warnings.push(
      'V dátach neboli nájdené položky WEM1 až WEM14. WEMWBS_skore nebolo vytvorené.',
    );
  }

  if (!hasAnyJss) {
    warnings.push(
      'V dátach neboli nájdené položky JSS1 až JSS36. JSS_skore a JSS subškály neboli vytvorené.',
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
      kontrola: 'WEMWBS skóre',
      vysledok: hasWemScore ? 'vytvorené' : 'nevytvorené',
      stav: hasWemScore ? 'ok' : 'warning',
      poznamka: hasWemScore
        ? 'Premenná WEMWBS_skore bola dopočítaná.'
        : 'V dátach neboli nájdené položky WEM alebo ich názvy nezodpovedajú očakávanému vzoru.',
    },
    {
      kontrola: 'JSS skóre',
      vysledok: hasJssScore ? 'vytvorené' : 'nevytvorené',
      stav: hasJssScore ? 'ok' : 'warning',
      poznamka: hasJssScore
        ? 'Premenná JSS_skore a subškály boli dopočítané.'
        : 'V dátach neboli nájdené položky JSS alebo ich názvy nezodpovedajú očakávanému vzoru.',
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
        'Popis výpočtu skóre a subškál, napríklad WEMWBS_skore, JSS_skore a JSS subškály.',
    },
    {
      cast: 'QUALITY_REPORT',
      popis:
        'Kontrola kvality pripraveného súboru pred spustením štatistiky.',
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

    const converted = convertRowsToObjects(rows);

    const scoringResult = calculateScores(
      converted.cleanRows,
      converted.headers,
    );

    const allWarnings = [
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
        'QUALITY_REPORT',
        'README',
      ],
      warnings: finalWarnings,
      qualityReport,
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