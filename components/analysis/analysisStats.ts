/* components/analysis/analysisStats.ts */

/**
 * ZEDPERA – štatistické výpočty pre modul Analýza dát
 *
 * Tento súbor rieši:
 * - automatické ignorovanie ID stĺpca,
 * - počet respondentov N,
 * - frekvenčnú analýzu po položkách,
 * - deskriptívnu štatistiku po položkách,
 * - výpočet škál a subškál,
 * - deskriptívnu štatistiku po škálach a subškálách,
 * - normalitu dát,
 * - Pearsonovu a Spearmanovu koreláciu,
 * - Cronbachovo alfa,
 * - Independent t-test,
 * - Mann-Whitney U test,
 * - ANOVA,
 * - Kruskal-Wallis test,
 * - odporúčanie, ktorý test použiť.
 *
 * Dôležité:
 * ID stĺpec sa nepoužíva v korelácii, t-teste, ANOVA, reliabilite ani v iných výpočtoch.
 * ID slúži iba na poradie/respondenta a na zistenie N.
 */

export type RawValue = string | number | boolean | null | undefined;

export type AnalysisRow = Record<string, RawValue>;

export type ScaleItemReference = string | number;

export type ScaleScoringMode = 'sum' | 'mean';

export type NormalityMethod = 'approx-shapiro-jarque-bera';

export type CorrelationMethod = 'pearson' | 'spearman';

export type GroupTestType =
  | 'independent-t-test'
  | 'mann-whitney-u'
  | 'anova'
  | 'kruskal-wallis';

export type TestRecommendation =
  | 'pearson'
  | 'spearman'
  | 'independent-t-test'
  | 'mann-whitney-u'
  | 'anova'
  | 'kruskal-wallis'
  | 'not-enough-data';

export interface ScaleDefinition {
  /**
   * Interné ID škály.
   * Príklad: "sembu_father_rejection"
   */
  id: string;

  /**
   * Názov zobrazovaný používateľovi.
   * Príklad: "s-EMBU Otec – Odmietanie"
   */
  name: string;

  /**
   * Položky, z ktorých sa škála počíta.
   * Môžu byť:
   * - názvy stĺpcov: ["Otec_1", "Otec_4"]
   * - čísla položiek: [1, 4, 7]
   *
   * Ak použiješ čísla, systém sa pokúsi nájsť stĺpec, ktorý obsahuje dané číslo položky.
   */
  items: ScaleItemReference[];

  /**
   * Reverzne kódované položky.
   * Príklad: [17] alebo ["17R"] alebo ["Položka 17"]
   */
  reverseItems?: ScaleItemReference[];

  /**
   * Minimum položky.
   * Pri Likertovej škále napr. 1.
   */
  minValue?: number;

  /**
   * Maximum položky.
   * Pri Likertovej škále napr. 4 alebo 5.
   */
  maxValue?: number;

  /**
   * Spôsob výpočtu škály.
   * sum = súčet položiek
   * mean = priemer položiek
   */
  scoring?: ScaleScoringMode;

  /**
   * Voliteľný popis.
   */
  description?: string;
}

export interface CombinedScaleDefinition {
  /**
   * Interné ID kombinovanej škály.
   */
  id: string;

  /**
   * Názov kombinovanej škály.
   * Príklad: "s-EMBU Celkom – Odmietanie"
   */
  name: string;

  /**
   * ID škál, ktoré sa majú spojiť.
   * Príklad: ["sembu_father_rejection", "sembu_mother_rejection"]
   */
  scaleIds: string[];

  /**
   * sum = súčet škál
   * mean = priemer škál
   */
  scoring?: ScaleScoringMode;

  description?: string;
}

export interface StatisticalAnalysisOptions {
  /**
   * Explicitne zadaný ID stĺpec.
   * Ak nezadáš, systém sa pokúsi ID stĺpec nájsť automaticky.
   */
  idColumn?: string;

  /**
   * Definície škál a subškál.
   */
  scales?: ScaleDefinition[];

  /**
   * Definície kombinovaných škál.
   * Napr. otec + matka = celkové skóre.
   */
  combinedScales?: CombinedScaleDefinition[];

  /**
   * Skupinové stĺpce pre t-test, ANOVA, Mann-Whitney, Kruskal-Wallis.
   * Príklad: ["pohlavie", "rocnik", "skupina"]
   */
  groupColumns?: string[];

  /**
   * Alfa hladina významnosti.
   * Predvolené: 0.05
   */
  alpha?: number;

  /**
   * Či počítať aj deskriptívu po jednotlivých položkách.
   */
  includeItemDescriptives?: boolean;

  /**
   * Či počítať frekvenčnú analýzu po jednotlivých položkách.
   */
  includeFrequencies?: boolean;
}

export interface FrequencyValueResult {
  value: string;
  count: number;
  percent: number;
  validPercent: number;
  cumulativePercent: number;
}

export interface FrequencyAnalysisResult {
  variable: string;
  valid: number;
  missing: number;
  total: number;
  values: FrequencyValueResult[];
}

export interface DescriptiveStatisticsResult {
  variable: string;
  valid: number;
  missing: number;
  mean: number | null;
  median: number | null;
  mode: number | string | null;
  standardDeviation: number | null;
  variance: number | null;
  skewness: number | null;
  standardErrorSkewness: number | null;
  kurtosis: number | null;
  standardErrorKurtosis: number | null;
  minimum: number | null;
  maximum: number | null;
  q1: number | null;
  q3: number | null;
  iqr: number | null;
}

export interface ScaleScoreResult {
  scaleId: string;
  scaleName: string;
  scores: Array<number | null>;
  itemsUsed: string[];
  missingRows: number;
  scoring: ScaleScoringMode;
}

export interface NormalityResult {
  variable: string;
  valid: number;
  method: NormalityMethod;
  statistic: number | null;
  pValue: number | null;
  isNormal: boolean | null;
  recommendation: 'normal' | 'not-normal' | 'not-enough-data';
  note: string;
}

export interface CorrelationResult {
  variableA: string;
  variableB: string;
  method: CorrelationMethod;
  n: number;
  r: number | null;
  pValue: number | null;
  significance: string;
  fisherZ: number | null;
  standardError: number | null;
  interpretation: string;
}

export interface ReliabilityResult {
  scaleId: string;
  scaleName: string;
  items: string[];
  validRows: number;
  cronbachAlpha: number | null;
  interpretation: string;
}

export interface GroupTestResult {
  dependentVariable: string;
  groupVariable: string;
  testType: GroupTestType;
  groups: string[];
  nTotal: number;
  statistic: number | null;
  pValue: number | null;
  significance: string;
  recommendation: string;
}

export interface StatisticalAnalysisResult {
  meta: {
    totalRows: number;
    respondentCount: number;
    idColumn: string | null;
    ignoredColumns: string[];
    numericColumns: string[];
    groupColumns: string[];
    alpha: number;
  };

  frequencies: FrequencyAnalysisResult[];
  itemDescriptives: DescriptiveStatisticsResult[];

  scaleScores: ScaleScoreResult[];
  scaleDescriptives: DescriptiveStatisticsResult[];
  normality: NormalityResult[];

  correlations: {
    pearson: CorrelationResult[];
    spearman: CorrelationResult[];
    recommended: CorrelationResult[];
    recommendationNote: string;
  };

  reliability: ReliabilityResult[];

  groupTests: {
    parametric: GroupTestResult[];
    nonParametric: GroupTestResult[];
    recommended: GroupTestResult[];
    recommendationNote: string;
  };

  aiRecommendation: string[];
}

/* -------------------------------------------------------------------------- */
/* HLAVNÁ FUNKCIA                                                             */
/* -------------------------------------------------------------------------- */

export function runFullStatisticalAnalysis(
  rows: AnalysisRow[],
  options: StatisticalAnalysisOptions = {},
): StatisticalAnalysisResult {
  const alpha = options.alpha ?? 0.05;

  const cleanRows = normalizeRows(rows);
  const columns = getColumns(cleanRows);

  const idColumn = options.idColumn ?? detectIdColumn(columns);
  const ignoredColumns = idColumn ? [idColumn] : [];

  const candidateColumns = columns.filter((column) => !ignoredColumns.includes(column));

  const numericColumns = candidateColumns.filter((column) =>
    isMostlyNumeric(cleanRows.map((row) => row[column])),
  );

  const autoGroupColumns = candidateColumns.filter((column) =>
    !numericColumns.includes(column) && hasReasonableGroupCount(cleanRows.map((row) => row[column])),
  );

  const groupColumns = uniqueStrings([...(options.groupColumns ?? []), ...autoGroupColumns]).filter(
    (column) => columns.includes(column) && column !== idColumn,
  );

  const respondentCount = countRespondents(cleanRows, idColumn);

  const frequencies = options.includeFrequencies === false
    ? []
    : numericColumns.map((column) => calculateFrequencyAnalysis(cleanRows, column));

  const itemDescriptives = options.includeItemDescriptives === false
    ? []
    : numericColumns.map((column) => calculateDescriptiveStatistics(column, getNumericColumn(cleanRows, column)));

  const baseScaleScores = calculateScaleScores(cleanRows, numericColumns, options.scales ?? []);
  const combinedScaleScores = calculateCombinedScaleScores(baseScaleScores, options.combinedScales ?? []);
  const allScaleScores = [...baseScaleScores, ...combinedScaleScores];

  const scaleDescriptives = allScaleScores.map((scale) =>
    calculateDescriptiveStatistics(scale.scaleName, scale.scores),
  );

  const normality = allScaleScores.map((scale) =>
    calculateNormality(scale.scaleName, scale.scores, alpha),
  );

  const pearson = calculatePairwiseCorrelations(allScaleScores, 'pearson');
  const spearman = calculatePairwiseCorrelations(allScaleScores, 'spearman');

  const shouldUseParametric = normality.length > 0 && normality.every((item) => item.isNormal === true);

  const recommendedCorrelations = shouldUseParametric ? pearson : spearman;

  const reliability = calculateReliabilityForScales(cleanRows, numericColumns, options.scales ?? []);

  const groupTestInput = allScaleScores.length > 0
    ? allScaleScores
    : numericColumns.map((column) => ({
        scaleId: column,
        scaleName: column,
        scores: getNumericColumn(cleanRows, column),
        itemsUsed: [column],
        missingRows: 0,
        scoring: 'sum' as const,
      }));

  const parametricGroupTests: GroupTestResult[] = [];
  const nonParametricGroupTests: GroupTestResult[] = [];
  const recommendedGroupTests: GroupTestResult[] = [];

  for (const groupColumn of groupColumns) {
    const groupValues = cleanRows.map((row) => normalizeGroupValue(row[groupColumn]));
    const groupCount = uniqueStrings(groupValues.filter(Boolean)).length;

    if (groupCount < 2) continue;

    for (const variable of groupTestInput) {
      const grouped = buildGroupedValues(variable.scores, groupValues);

      if (groupCount === 2) {
        const tTest = calculateIndependentTTest(variable.scaleName, groupColumn, grouped);
        const mannWhitney = calculateMannWhitneyUTest(variable.scaleName, groupColumn, grouped);

        parametricGroupTests.push(tTest);
        nonParametricGroupTests.push(mannWhitney);
        recommendedGroupTests.push(shouldUseParametric ? tTest : mannWhitney);
      }

      if (groupCount >= 3) {
        const anova = calculateOneWayAnova(variable.scaleName, groupColumn, grouped);
        const kruskal = calculateKruskalWallisTest(variable.scaleName, groupColumn, grouped);

        parametricGroupTests.push(anova);
        nonParametricGroupTests.push(kruskal);
        recommendedGroupTests.push(shouldUseParametric ? anova : kruskal);
      }
    }
  }

  const aiRecommendation = buildAiRecommendation({
    idColumn,
    respondentCount,
    normality,
    shouldUseParametric,
    hasScales: allScaleScores.length > 0,
    groupColumns,
  });

  return {
    meta: {
      totalRows: cleanRows.length,
      respondentCount,
      idColumn,
      ignoredColumns,
      numericColumns,
      groupColumns,
      alpha,
    },

    frequencies,
    itemDescriptives,

    scaleScores: allScaleScores,
    scaleDescriptives,
    normality,

    correlations: {
      pearson,
      spearman,
      recommended: recommendedCorrelations,
      recommendationNote: shouldUseParametric
        ? 'Na základe normality dát odporúčame interpretovať Pearsonovu koreláciu.'
        : 'Na základe normality dát odporúčame interpretovať Spearmanovu koreláciu.',
    },

    reliability,

    groupTests: {
      parametric: parametricGroupTests,
      nonParametric: nonParametricGroupTests,
      recommended: recommendedGroupTests,
      recommendationNote: shouldUseParametric
        ? 'Dáta sú približne normálne rozdelené, preto odporúčame parametrické testy: Independent t-test alebo ANOVA.'
        : 'Dáta nie sú normálne rozdelené alebo normalita nie je potvrdená, preto odporúčame neparametrické testy: Mann-Whitney U alebo Kruskal-Wallis.',
    },

    aiRecommendation,
  };
}

/* -------------------------------------------------------------------------- */
/* DÁTA, STĹPCE, ID                                                           */
/* -------------------------------------------------------------------------- */

function normalizeRows(rows: AnalysisRow[]): AnalysisRow[] {
  if (!Array.isArray(rows)) return [];

  return rows.filter((row) => row && typeof row === 'object');
}

function getColumns(rows: AnalysisRow[]): string[] {
  const set = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (key && key.trim()) {
        set.add(key.trim());
      }
    }
  }

  return Array.from(set);
}

function detectIdColumn(columns: string[]): string | null {
  const candidates = [
    'id',
    'ID',
    'Id',
    'respondent',
    'Respondent',
    'respondent_id',
    'Respondent ID',
    'číslo',
    'cislo',
    'poradie',
    'Poradie',
  ];

  for (const candidate of candidates) {
    const found = columns.find((column) => normalizeText(column) === normalizeText(candidate));
    if (found) return found;
  }

  const firstColumn = columns[0];

  if (firstColumn && normalizeText(firstColumn).includes('id')) {
    return firstColumn;
  }

  return null;
}

function countRespondents(rows: AnalysisRow[], idColumn: string | null): number {
  if (!idColumn) {
    return rows.length;
  }

  const nonEmptyIds = rows
    .map((row) => row[idColumn])
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== '');

  return nonEmptyIds.length > 0 ? nonEmptyIds.length : rows.length;
}

/* -------------------------------------------------------------------------- */
/* FREKVENCIE                                                                 */
/* -------------------------------------------------------------------------- */

export function calculateFrequencyAnalysis(
  rows: AnalysisRow[],
  column: string,
): FrequencyAnalysisResult {
  const values = rows.map((row) => row[column]);
  const total = values.length;
  const validValues = values.filter((value) => !isMissing(value));
  const missing = total - validValues.length;

  const counts = new Map<string, number>();

  for (const value of validValues) {
    const key = String(value).trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => {
    const aNum = toNumber(a[0]);
    const bNum = toNumber(b[0]);

    if (aNum !== null && bNum !== null) return aNum - bNum;

    return a[0].localeCompare(b[0], 'sk');
  });

  let cumulative = 0;

  const resultValues = sorted.map(([value, count]) => {
    const percent = total > 0 ? (count / total) * 100 : 0;
    const validPercent = validValues.length > 0 ? (count / validValues.length) * 100 : 0;
    cumulative += validPercent;

    return {
      value,
      count,
      percent: round2(percent),
      validPercent: round2(validPercent),
      cumulativePercent: round2(cumulative),
    };
  });

  return {
    variable: column,
    valid: validValues.length,
    missing,
    total,
    values: resultValues,
  };
}

/* -------------------------------------------------------------------------- */
/* DESKRIPTÍVNA ŠTATISTIKA                                                    */
/* -------------------------------------------------------------------------- */

export function calculateDescriptiveStatistics(
  variable: string,
  rawValues: Array<number | null>,
): DescriptiveStatisticsResult {
  const total = rawValues.length;
  const values = rawValues.filter(isFiniteNumber).sort((a, b) => a - b);
  const valid = values.length;
  const missing = total - valid;

  if (valid === 0) {
    return {
      variable,
      valid,
      missing,
      mean: null,
      median: null,
      mode: null,
      standardDeviation: null,
      variance: null,
      skewness: null,
      standardErrorSkewness: null,
      kurtosis: null,
      standardErrorKurtosis: null,
      minimum: null,
      maximum: null,
      q1: null,
      q3: null,
      iqr: null,
    };
  }

  const meanValue = mean(values);
  const varianceValue = sampleVariance(values);
  const standardDeviationValue = Math.sqrt(varianceValue);
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);

  return {
    variable,
    valid,
    missing,
    mean: round2(meanValue),
    median: round2(median(values)),
    mode: calculateMode(values),
    standardDeviation: round2(standardDeviationValue),
    variance: round2(varianceValue),
    skewness: round2(skewness(values)),
    standardErrorSkewness: round2(Math.sqrt(6 / valid)),
    kurtosis: round2(kurtosis(values)),
    standardErrorKurtosis: round2(Math.sqrt(24 / valid)),
    minimum: round2(values[0]),
    maximum: round2(values[values.length - 1]),
    q1: round2(q1),
    q3: round2(q3),
    iqr: round2(q3 - q1),
  };
}

/* -------------------------------------------------------------------------- */
/* ŠKÁLY A SUBŠKÁLY                                                           */
/* -------------------------------------------------------------------------- */

export function calculateScaleScores(
  rows: AnalysisRow[],
  numericColumns: string[],
  scales: ScaleDefinition[],
): ScaleScoreResult[] {
  return scales.map((scale) => {
    const scoring = scale.scoring ?? 'sum';
    const minValue = scale.minValue ?? 1;
    const maxValue = scale.maxValue ?? 5;

    const resolvedItems = scale.items
      .map((item) => resolveItemColumn(item, numericColumns))
      .filter(Boolean) as string[];

    const reverseItemColumns = (scale.reverseItems ?? [])
      .map((item) => resolveItemColumn(item, numericColumns))
      .filter(Boolean) as string[];

    const scores = rows.map((row) => {
      const itemValues: number[] = [];

      for (const column of resolvedItems) {
        const raw = toNumber(row[column]);

        if (raw === null) continue;

        const shouldReverse =
          reverseItemColumns.includes(column) ||
          /(^|\D)r($|\D)/i.test(String(column)) ||
          String(column).trim().toLowerCase().endsWith('r');

        const value = shouldReverse ? reverseCode(raw, minValue, maxValue) : raw;
        itemValues.push(value);
      }

      if (itemValues.length === 0) return null;

      if (scoring === 'mean') {
        return round2(mean(itemValues));
      }

      return round2(sum(itemValues));
    });

    return {
      scaleId: scale.id,
      scaleName: scale.name,
      scores,
      itemsUsed: resolvedItems,
      missingRows: scores.filter((score) => score === null).length,
      scoring,
    };
  });
}

export function calculateCombinedScaleScores(
  scaleScores: ScaleScoreResult[],
  combinedScales: CombinedScaleDefinition[],
): ScaleScoreResult[] {
  return combinedScales.map((combined) => {
    const scoring = combined.scoring ?? 'sum';
    const selectedScales = combined.scaleIds
      .map((id) => scaleScores.find((scale) => scale.scaleId === id))
      .filter(Boolean) as ScaleScoreResult[];

    const maxLength = Math.max(...selectedScales.map((scale) => scale.scores.length), 0);

    const scores: Array<number | null> = [];

    for (let index = 0; index < maxLength; index++) {
      const rowValues = selectedScales
        .map((scale) => scale.scores[index])
        .filter(isFiniteNumber);

      if (rowValues.length === 0) {
        scores.push(null);
        continue;
      }

      scores.push(scoring === 'mean' ? round2(mean(rowValues)) : round2(sum(rowValues)));
    }

    return {
      scaleId: combined.id,
      scaleName: combined.name,
      scores,
      itemsUsed: selectedScales.flatMap((scale) => scale.itemsUsed),
      missingRows: scores.filter((score) => score === null).length,
      scoring,
    };
  });
}

function resolveItemColumn(item: ScaleItemReference, columns: string[]): string | null {
  const itemText = String(item).trim();

  const exact = columns.find((column) => normalizeText(column) === normalizeText(itemText));
  if (exact) return exact;

  const itemNumber = extractFirstNumber(itemText);

  if (itemNumber !== null) {
    const numberMatches = columns.filter((column) => {
      const columnNumbers = extractAllNumbers(column);
      return columnNumbers.includes(itemNumber);
    });

    if (numberMatches.length === 1) return numberMatches[0];

    const preferred = numberMatches.find((column) =>
      normalizeText(column).includes(`polozka${itemNumber}`) ||
      normalizeText(column).includes(`item${itemNumber}`) ||
      normalizeText(column).includes(`otazka${itemNumber}`),
    );

    if (preferred) return preferred;
  }

  const partial = columns.find((column) => normalizeText(column).includes(normalizeText(itemText)));
  if (partial) return partial;

  return null;
}

function reverseCode(value: number, minValue: number, maxValue: number): number {
  return minValue + maxValue - value;
}

/* -------------------------------------------------------------------------- */
/* NORMALITA                                                                  */
/* -------------------------------------------------------------------------- */

export function calculateNormality(
  variable: string,
  rawValues: Array<number | null>,
  alpha = 0.05,
): NormalityResult {
  const values = rawValues.filter(isFiniteNumber);

  if (values.length < 3) {
    return {
      variable,
      valid: values.length,
      method: 'approx-shapiro-jarque-bera',
      statistic: null,
      pValue: null,
      isNormal: null,
      recommendation: 'not-enough-data',
      note: 'Na posúdenie normality nie je dostatok dát.',
    };
  }

  const n = values.length;
  const skew = skewness(values);
  const kurt = kurtosis(values);

  /**
   * Praktická aproximácia:
   * Jarque-Bera štatistika používa šikmosť a špicatosť.
   * Pre df = 2 je p približne exp(-JB / 2).
   *
   * V UI to môžeš zobraziť ako orientačný test normality.
   * Ak chceš presný Shapiro-Wilk, treba neskôr doplniť špecializovanú knižnicu.
   */
  const jb = (n / 6) * (Math.pow(skew, 2) + Math.pow(kurt, 2) / 4);
  const pValue = Math.exp(-jb / 2);

  const isNormal = pValue >= alpha && Math.abs(skew) < 2 && Math.abs(kurt) < 7;

  return {
    variable,
    valid: n,
    method: 'approx-shapiro-jarque-bera',
    statistic: round2(jb),
    pValue: roundP(pValue),
    isNormal,
    recommendation: isNormal ? 'normal' : 'not-normal',
    note: isNormal
      ? 'Dáta možno považovať za približne normálne rozdelené.'
      : 'Normalita dát nie je potvrdená, odporúčame neparametrické testy.',
  };
}

/* -------------------------------------------------------------------------- */
/* KORELÁCIE                                                                  */
/* -------------------------------------------------------------------------- */

export function calculatePairwiseCorrelations(
  scaleScores: ScaleScoreResult[],
  method: CorrelationMethod,
): CorrelationResult[] {
  const results: CorrelationResult[] = [];

  for (let i = 0; i < scaleScores.length; i++) {
    for (let j = i + 1; j < scaleScores.length; j++) {
      results.push(
        calculateCorrelation(
          scaleScores[i].scaleName,
          scaleScores[i].scores,
          scaleScores[j].scaleName,
          scaleScores[j].scores,
          method,
        ),
      );
    }
  }

  return results;
}

export function calculateCorrelation(
  variableA: string,
  valuesA: Array<number | null>,
  variableB: string,
  valuesB: Array<number | null>,
  method: CorrelationMethod,
): CorrelationResult {
  const pairs = pairNumericValues(valuesA, valuesB);

  if (pairs.length < 3) {
    return {
      variableA,
      variableB,
      method,
      n: pairs.length,
      r: null,
      pValue: null,
      significance: '',
      fisherZ: null,
      standardError: null,
      interpretation: 'Nedostatok dát na výpočet korelácie.',
    };
  }

  const x = pairs.map((pair) => pair[0]);
  const y = pairs.map((pair) => pair[1]);

  const finalX = method === 'spearman' ? rankValues(x) : x;
  const finalY = method === 'spearman' ? rankValues(y) : y;

  const r = pearsonCorrelation(finalX, finalY);

  if (r === null) {
    return {
      variableA,
      variableB,
      method,
      n: pairs.length,
      r: null,
      pValue: null,
      significance: '',
      fisherZ: null,
      standardError: null,
      interpretation: 'Koreláciu nie je možné vypočítať.',
    };
  }

  const n = pairs.length;
  const t = r * Math.sqrt((n - 2) / Math.max(1e-12, 1 - r * r));
  const pValue = twoTailedNormalPValue(t);
  const fisherZ = Math.atanh(Math.max(-0.999999, Math.min(0.999999, r)));
  const standardError = n > 3 ? 1 / Math.sqrt(n - 3) : null;

  return {
    variableA,
    variableB,
    method,
    n,
    r: round2(r),
    pValue: roundP(pValue),
    significance: significanceStars(pValue),
    fisherZ: round2(fisherZ),
    standardError: standardError === null ? null : round2(standardError),
    interpretation: interpretCorrelation(r, pValue),
  };
}

/* -------------------------------------------------------------------------- */
/* RELIABILITA – CRONBACH ALFA                                                */
/* -------------------------------------------------------------------------- */

export function calculateReliabilityForScales(
  rows: AnalysisRow[],
  numericColumns: string[],
  scales: ScaleDefinition[],
): ReliabilityResult[] {
  return scales.map((scale) => calculateCronbachAlphaForScale(rows, numericColumns, scale));
}

export function calculateCronbachAlphaForScale(
  rows: AnalysisRow[],
  numericColumns: string[],
  scale: ScaleDefinition,
): ReliabilityResult {
  const minValue = scale.minValue ?? 1;
  const maxValue = scale.maxValue ?? 5;

  const itemColumns = scale.items
    .map((item) => resolveItemColumn(item, numericColumns))
    .filter(Boolean) as string[];

  const reverseItemColumns = (scale.reverseItems ?? [])
    .map((item) => resolveItemColumn(item, numericColumns))
    .filter(Boolean) as string[];

  if (itemColumns.length < 2) {
    return {
      scaleId: scale.id,
      scaleName: scale.name,
      items: itemColumns,
      validRows: 0,
      cronbachAlpha: null,
      interpretation: 'Cronbachovo alfa vyžaduje minimálne dve položky.',
    };
  }

  const matrix: number[][] = [];

  for (const row of rows) {
    const values: number[] = [];

    for (const column of itemColumns) {
      const value = toNumber(row[column]);

      if (value === null) {
        values.length = 0;
        break;
      }

      const shouldReverse =
        reverseItemColumns.includes(column) ||
        /(^|\D)r($|\D)/i.test(String(column)) ||
        String(column).trim().toLowerCase().endsWith('r');

      values.push(shouldReverse ? reverseCode(value, minValue, maxValue) : value);
    }

    if (values.length === itemColumns.length) {
      matrix.push(values);
    }
  }

  if (matrix.length < 3) {
    return {
      scaleId: scale.id,
      scaleName: scale.name,
      items: itemColumns,
      validRows: matrix.length,
      cronbachAlpha: null,
      interpretation: 'Nedostatok kompletných riadkov na výpočet reliability.',
    };
  }

  const itemVariances = itemColumns.map((_, itemIndex) => {
    const itemValues = matrix.map((row) => row[itemIndex]);
    return sampleVariance(itemValues);
  });

  const totalScores = matrix.map((row) => sum(row));
  const totalVariance = sampleVariance(totalScores);

  if (totalVariance === 0) {
    return {
      scaleId: scale.id,
      scaleName: scale.name,
      items: itemColumns,
      validRows: matrix.length,
      cronbachAlpha: null,
      interpretation: 'Celková variancia je nulová, Cronbachovo alfa nie je možné vypočítať.',
    };
  }

  const k = itemColumns.length;
  const alpha = (k / (k - 1)) * (1 - sum(itemVariances) / totalVariance);

  return {
    scaleId: scale.id,
    scaleName: scale.name,
    items: itemColumns,
    validRows: matrix.length,
    cronbachAlpha: round2(alpha),
    interpretation: interpretCronbachAlpha(alpha),
  };
}

/* -------------------------------------------------------------------------- */
/* SKUPINOVÉ TESTY                                                            */
/* -------------------------------------------------------------------------- */

export function calculateIndependentTTest(
  dependentVariable: string,
  groupVariable: string,
  grouped: Record<string, number[]>,
): GroupTestResult {
  const groups = Object.keys(grouped).filter((group) => grouped[group].length > 0);

  if (groups.length !== 2) {
    return emptyGroupTestResult(
      dependentVariable,
      groupVariable,
      'independent-t-test',
      groups,
      'Independent t-test vyžaduje presne dve skupiny.',
    );
  }

  const a = grouped[groups[0]];
  const b = grouped[groups[1]];

  if (a.length < 2 || b.length < 2) {
    return emptyGroupTestResult(
      dependentVariable,
      groupVariable,
      'independent-t-test',
      groups,
      'V každej skupine musia byť aspoň dve hodnoty.',
    );
  }

  const meanA = mean(a);
  const meanB = mean(b);
  const varianceA = sampleVariance(a);
  const varianceB = sampleVariance(b);

  const se = Math.sqrt(varianceA / a.length + varianceB / b.length);

  if (se === 0) {
    return emptyGroupTestResult(
      dependentVariable,
      groupVariable,
      'independent-t-test',
      groups,
      'Štandardná chyba je nulová, test nie je možné vypočítať.',
    );
  }

  const t = (meanA - meanB) / se;
  const pValue = twoTailedNormalPValue(t);

  return {
    dependentVariable,
    groupVariable,
    testType: 'independent-t-test',
    groups,
    nTotal: a.length + b.length,
    statistic: round2(t),
    pValue: roundP(pValue),
    significance: significanceStars(pValue),
    recommendation: pValue < 0.05
      ? 'Rozdiel medzi dvoma skupinami je štatisticky významný.'
      : 'Rozdiel medzi dvoma skupinami nie je štatisticky významný.',
  };
}

export function calculateMannWhitneyUTest(
  dependentVariable: string,
  groupVariable: string,
  grouped: Record<string, number[]>,
): GroupTestResult {
  const groups = Object.keys(grouped).filter((group) => grouped[group].length > 0);

  if (groups.length !== 2) {
    return emptyGroupTestResult(
      dependentVariable,
      groupVariable,
      'mann-whitney-u',
      groups,
      'Mann-Whitney U test vyžaduje presne dve skupiny.',
    );
  }

  const groupA = grouped[groups[0]];
  const groupB = grouped[groups[1]];

  const combined = [
    ...groupA.map((value) => ({ value, group: 'a' })),
    ...groupB.map((value) => ({ value, group: 'b' })),
  ].sort((x, y) => x.value - y.value);

  const ranks = assignRanks(combined.map((item) => item.value));

  let rankSumA = 0;

  for (let index = 0; index < combined.length; index++) {
    if (combined[index].group === 'a') {
      rankSumA += ranks[index];
    }
  }

  const n1 = groupA.length;
  const n2 = groupB.length;

  const u1 = rankSumA - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const u = Math.min(u1, u2);

  const meanU = (n1 * n2) / 2;
  const sdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);

  const z = sdU > 0 ? (u - meanU) / sdU : 0;
  const pValue = twoTailedNormalPValue(z);

  return {
    dependentVariable,
    groupVariable,
    testType: 'mann-whitney-u',
    groups,
    nTotal: n1 + n2,
    statistic: round2(u),
    pValue: roundP(pValue),
    significance: significanceStars(pValue),
    recommendation: pValue < 0.05
      ? 'Rozdiel medzi dvoma skupinami je štatisticky významný podľa Mann-Whitney U testu.'
      : 'Rozdiel medzi dvoma skupinami nie je štatisticky významný podľa Mann-Whitney U testu.',
  };
}

export function calculateOneWayAnova(
  dependentVariable: string,
  groupVariable: string,
  grouped: Record<string, number[]>,
): GroupTestResult {
  const groups = Object.keys(grouped).filter((group) => grouped[group].length > 1);

  if (groups.length < 3) {
    return emptyGroupTestResult(
      dependentVariable,
      groupVariable,
      'anova',
      groups,
      'ANOVA vyžaduje minimálne tri skupiny s dostatkom dát.',
    );
  }

  const allValues = groups.flatMap((group) => grouped[group]);
  const grandMean = mean(allValues);

  let ssBetween = 0;
  let ssWithin = 0;

  for (const group of groups) {
    const values = grouped[group];
    const groupMean = mean(values);

    ssBetween += values.length * Math.pow(groupMean - grandMean, 2);
    ssWithin += values.reduce((acc, value) => acc + Math.pow(value - groupMean, 2), 0);
  }

  const dfBetween = groups.length - 1;
  const dfWithin = allValues.length - groups.length;

  if (dfWithin <= 0) {
    return emptyGroupTestResult(
      dependentVariable,
      groupVariable,
      'anova',
      groups,
      'Nedostatok stupňov voľnosti na výpočet ANOVA.',
    );
  }

  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;

  if (msWithin === 0) {
    return emptyGroupTestResult(
      dependentVariable,
      groupVariable,
      'anova',
      groups,
      'Vnútroskupinová variancia je nulová, ANOVA nie je možné vypočítať.',
    );
  }

  const f = msBetween / msWithin;
  const pValue = approximateFTestPValue(f, dfBetween, dfWithin);

  return {
    dependentVariable,
    groupVariable,
    testType: 'anova',
    groups,
    nTotal: allValues.length,
    statistic: round2(f),
    pValue: roundP(pValue),
    significance: significanceStars(pValue),
    recommendation: pValue < 0.05
      ? 'Medzi skupinami existuje štatisticky významný rozdiel podľa ANOVA.'
      : 'Medzi skupinami nie je štatisticky významný rozdiel podľa ANOVA.',
  };
}

export function calculateKruskalWallisTest(
  dependentVariable: string,
  groupVariable: string,
  grouped: Record<string, number[]>,
): GroupTestResult {
  const groups = Object.keys(grouped).filter((group) => grouped[group].length > 0);

  if (groups.length < 3) {
    return emptyGroupTestResult(
      dependentVariable,
      groupVariable,
      'kruskal-wallis',
      groups,
      'Kruskal-Wallis test vyžaduje minimálne tri skupiny.',
    );
  }

  const combined: Array<{ value: number; group: string }> = [];

  for (const group of groups) {
    for (const value of grouped[group]) {
      combined.push({ value, group });
    }
  }

  combined.sort((a, b) => a.value - b.value);

  const ranks = assignRanks(combined.map((item) => item.value));
  const n = combined.length;

  const rankSums: Record<string, number> = {};
  const groupCounts: Record<string, number> = {};

  for (let index = 0; index < combined.length; index++) {
    const group = combined[index].group;
    rankSums[group] = (rankSums[group] ?? 0) + ranks[index];
    groupCounts[group] = (groupCounts[group] ?? 0) + 1;
  }

  let h = 0;

  for (const group of groups) {
    h += Math.pow(rankSums[group], 2) / groupCounts[group];
  }

  h = (12 / (n * (n + 1))) * h - 3 * (n + 1);

  const df = groups.length - 1;
  const pValue = approximateChiSquarePValue(h, df);

  return {
    dependentVariable,
    groupVariable,
    testType: 'kruskal-wallis',
    groups,
    nTotal: n,
    statistic: round2(h),
    pValue: roundP(pValue),
    significance: significanceStars(pValue),
    recommendation: pValue < 0.05
      ? 'Medzi skupinami existuje štatisticky významný rozdiel podľa Kruskal-Wallis testu.'
      : 'Medzi skupinami nie je štatisticky významný rozdiel podľa Kruskal-Wallis testu.',
  };
}

function emptyGroupTestResult(
  dependentVariable: string,
  groupVariable: string,
  testType: GroupTestType,
  groups: string[],
  recommendation: string,
): GroupTestResult {
  return {
    dependentVariable,
    groupVariable,
    testType,
    groups,
    nTotal: groups.reduce((acc) => acc, 0),
    statistic: null,
    pValue: null,
    significance: '',
    recommendation,
  };
}

/* -------------------------------------------------------------------------- */
/* ODPORÚČANIE PRE ŠTUDENTA                                                   */
/* -------------------------------------------------------------------------- */

function buildAiRecommendation(input: {
  idColumn: string | null;
  respondentCount: number;
  normality: NormalityResult[];
  shouldUseParametric: boolean;
  hasScales: boolean;
  groupColumns: string[];
}): string[] {
  const notes: string[] = [];

  if (input.idColumn) {
    notes.push(
      `Stĺpec "${input.idColumn}" bol rozpoznaný ako ID/respondent a nebol použitý v žiadnych štatistických výpočtoch. Slúži iba na určenie počtu respondentov N = ${input.respondentCount}.`,
    );
  }

  if (!input.hasScales) {
    notes.push(
      'Nie sú zadané definície škál/subškál. Frekvenčná a deskriptívna analýza sa vypočíta po položkách, ale pre odbornú prácu odporúčame doplniť definície škál a subškál štandardizovaného dotazníka.',
    );
  } else {
    notes.push(
      'Deskriptívna štatistika, normalita, korelácie a reliabilita boli pripravené primárne pre škály a subškály, nie iba pre jednotlivé položky.',
    );
  }

  if (input.shouldUseParametric) {
    notes.push(
      'Normalita dát je približne splnená. Pre korelačnú analýzu odporúčame Pearsonovu koreláciu. Pre porovnanie dvoch skupín Independent t-test a pre tri a viac skupín ANOVA.',
    );
  } else {
    notes.push(
      'Normalita dát nie je potvrdená pri všetkých škálach/subškálach. Pre korelačnú analýzu odporúčame Spearmanovu koreláciu. Pre porovnanie dvoch skupín Mann-Whitney U test a pre tri a viac skupín Kruskal-Wallis test.',
    );
  }

  if (input.groupColumns.length === 0) {
    notes.push(
      'Neboli nájdené vhodné skupinové premenné. Ak chceš počítať t-test, ANOVA, Mann-Whitney alebo Kruskal-Wallis, v dátach musí byť stĺpec typu pohlavie, skupina, ročník, trieda alebo experimentálna/kontrolná skupina.',
    );
  }

  return notes;
}

/* -------------------------------------------------------------------------- */
/* POMOCNÉ FUNKCIE                                                            */
/* -------------------------------------------------------------------------- */

function getNumericColumn(rows: AnalysisRow[], column: string): Array<number | null> {
  return rows.map((row) => toNumber(row[column]));
}

function isMissing(value: RawValue): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

function toNumber(value: RawValue): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  const cleaned = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');

  if (cleaned === '') return null;

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isMostlyNumeric(values: RawValue[]): boolean {
  const nonMissing = values.filter((value) => !isMissing(value));

  if (nonMissing.length === 0) return false;

  const numeric = nonMissing.filter((value) => toNumber(value) !== null);

  return numeric.length / nonMissing.length >= 0.8;
}

function hasReasonableGroupCount(values: RawValue[]): boolean {
  const normalized = values
    .map(normalizeGroupValue)
    .filter((value) => value !== '');

  const unique = uniqueStrings(normalized);

  return unique.length >= 2 && unique.length <= 10;
}

function normalizeGroupValue(value: RawValue): string {
  if (value === null || value === undefined) return '';

  return String(value).trim();
}

function buildGroupedValues(
  scores: Array<number | null>,
  groupValues: string[],
): Record<string, number[]> {
  const grouped: Record<string, number[]> = {};

  for (let index = 0; index < scores.length; index++) {
    const score = scores[index];
    const group = groupValues[index];

    if (!isFiniteNumber(score)) continue;
    if (!group) continue;

    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(score);
  }

  return grouped;
}

function pairNumericValues(
  valuesA: Array<number | null>,
  valuesB: Array<number | null>,
): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  const length = Math.min(valuesA.length, valuesB.length);

  for (let index = 0; index < length; index++) {
    const a = valuesA[index];
    const b = valuesB[index];

    if (isFiniteNumber(a) && isFiniteNumber(b)) {
      pairs.push([a, b]);
    }
  }

  return pairs;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function sampleVariance(values: number[]): number {
  if (values.length < 2) return 0;

  const m = mean(values);

  return values.reduce((acc, value) => acc + Math.pow(value - m, 2), 0) / (values.length - 1);
}

function skewness(values: number[]): number {
  const n = values.length;

  if (n < 3) return 0;

  const m = mean(values);
  const sd = Math.sqrt(sampleVariance(values));

  if (sd === 0) return 0;

  const thirdMoment = values.reduce((acc, value) => acc + Math.pow((value - m) / sd, 3), 0);

  return (n / ((n - 1) * (n - 2))) * thirdMoment;
}

function kurtosis(values: number[]): number {
  const n = values.length;

  if (n < 4) return 0;

  const m = mean(values);
  const sd = Math.sqrt(sampleVariance(values));

  if (sd === 0) return 0;

  const fourthMoment = values.reduce((acc, value) => acc + Math.pow((value - m) / sd, 4), 0);

  return (
    ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * fourthMoment -
    (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3))
  );
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;

  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }

  return sorted[base];
}

function calculateMode(values: number[]): number | null {
  if (values.length === 0) return null;

  const counts = new Map<number, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let bestValue = values[0];
  let bestCount = 0;

  for (const [value, count] of counts.entries()) {
    if (count > bestCount) {
      bestValue = value;
      bestCount = count;
    }
  }

  return round2(bestValue);
}

function pearsonCorrelation(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;

  const meanX = mean(x);
  const meanY = mean(y);

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let index = 0; index < x.length; index++) {
    const dx = x[index] - meanX;
    const dy = y[index] - meanY;

    numerator += dx * dy;
    denominatorX += dx * dx;
    denominatorY += dy * dy;
  }

  const denominator = Math.sqrt(denominatorX * denominatorY);

  if (denominator === 0) return null;

  return numerator / denominator;
}

function rankValues(values: number[]): number[] {
  return assignRanks(values);
}

function assignRanks(values: number[]): number[] {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);

  const ranks = new Array(values.length);

  let i = 0;

  while (i < sorted.length) {
    let j = i;

    while (j + 1 < sorted.length && sorted[j + 1].value === sorted[i].value) {
      j++;
    }

    const averageRank = (i + 1 + j + 1) / 2;

    for (let k = i; k <= j; k++) {
      ranks[sorted[k].index] = averageRank;
    }

    i = j + 1;
  }

  return ranks;
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.round(value * 100) / 100;
}

function roundP(value: number): number {
  if (!Number.isFinite(value)) return 1;

  if (value < 0.001) return 0.001;

  return Math.round(value * 1000) / 1000;
}

function significanceStars(pValue: number | null): string {
  if (pValue === null) return '';
  if (pValue < 0.001) return '***';
  if (pValue < 0.01) return '**';
  if (pValue < 0.05) return '*';

  return '';
}

function interpretCorrelation(r: number, pValue: number): string {
  const abs = Math.abs(r);

  let strength = 'zanedbateľný';

  if (abs >= 0.1) strength = 'slabý';
  if (abs >= 0.3) strength = 'stredne silný';
  if (abs >= 0.5) strength = 'silný';
  if (abs >= 0.7) strength = 'veľmi silný';

  const direction = r >= 0 ? 'pozitívny' : 'negatívny';
  const significance = pValue < 0.05 ? 'štatisticky významný' : 'štatisticky nevýznamný';

  return `Vzťah je ${strength}, ${direction} a ${significance}.`;
}

function interpretCronbachAlpha(alpha: number): string {
  if (alpha >= 0.9) return 'Výborná reliabilita.';
  if (alpha >= 0.8) return 'Dobrá reliabilita.';
  if (alpha >= 0.7) return 'Akceptovateľná reliabilita.';
  if (alpha >= 0.6) return 'Otázna reliabilita.';
  if (alpha >= 0.5) return 'Slabá reliabilita.';

  return 'Neakceptovateľná reliabilita.';
}

function twoTailedNormalPValue(zOrT: number): number {
  const z = Math.abs(zOrT);
  const p = 2 * (1 - normalCdf(z));

  return Math.max(0, Math.min(1, p));
}

function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * absX);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-absX * absX));

  return sign * y;
}

function approximateChiSquarePValue(chiSquare: number, df: number): number {
  if (df <= 0) return 1;

  /**
   * Wilson-Hilferty transform – praktická aproximácia.
   */
  const z =
    (Math.pow(chiSquare / df, 1 / 3) - (1 - 2 / (9 * df))) /
    Math.sqrt(2 / (9 * df));

  return 1 - normalCdf(z);
}

function approximateFTestPValue(f: number, df1: number, df2: number): number {
  if (df1 <= 0 || df2 <= 0) return 1;

  /**
   * Praktická aproximácia cez log-transformáciu.
   * Na produkčné vedecké výstupy môžeš neskôr nahradiť presnou F distribúciou.
   */
  const z =
    (Math.log(f) - Math.log(df2 / Math.max(1, df2 - 2))) /
    Math.sqrt(2 / df1 + 2 / df2);

  return 1 - normalCdf(z);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function extractFirstNumber(value: string): number | null {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function extractAllNumbers(value: string): number[] {
  const matches = value.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}