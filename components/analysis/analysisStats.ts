/* components/analysis/analysisStats.ts */

/**
 * ZEDPERA – štatistické výpočty pre modul Analýza dát
 *
 * Tento súbor rieši:
 * - automatické ignorovanie ID stĺpca,
 * - počet respondentov N,
 * - frekvenčnú analýzu po položkách,
 * - deskriptívnu štatistiku po položkách,
 * - automatické aj manuálne škály a subškály,
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
  id: string;
  name: string;
  items: ScaleItemReference[];
  reverseItems?: ScaleItemReference[];
  minValue?: number;
  maxValue?: number;
  scoring?: ScaleScoringMode;
  description?: string;
}

export interface CombinedScaleDefinition {
  id: string;
  name: string;
  scaleIds: string[];
  scoring?: ScaleScoringMode;
  description?: string;
}

export interface StatisticalAnalysisOptions {
  idColumn?: string;
  scales?: ScaleDefinition[];
  combinedScales?: CombinedScaleDefinition[];
  groupColumns?: string[];
  alpha?: number;
  includeItemDescriptives?: boolean;
  includeFrequencies?: boolean;

  /**
   * Ak true, systém sa pokúsi automaticky rozpoznať známe škály:
   * - WEM / WEMWBS,
   * - JSS,
   * - s-EMBU,
   * - školská začlenenosť.
   *
   * Predvolené: true.
   */
  autoDetectScales?: boolean;

  /**
   * Ak true, pri absencii škál sa pre normalitu, korelácie a skupinové testy
   * použijú numerické premenné ako náhradné skóre.
   *
   * Predvolené: true.
   */
  fallbackToNumericVariables?: boolean;
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
    ordinalNumericColumns: string[];
    continuousNumericColumns: string[];
    groupColumns: string[];
    alpha: number;
    autoDetectedScaleCount: number;
    manualScaleCount: number;
    fallbackUsed: boolean;
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
  const autoDetectScales = options.autoDetectScales !== false;
  const fallbackToNumericVariables = options.fallbackToNumericVariables !== false;

  const cleanRows = normalizeRows(rows);
  const columns = getColumns(cleanRows);

  const idColumn = options.idColumn ?? detectIdColumn(columns, cleanRows);
  const ignoredColumns = idColumn ? [idColumn] : [];

  const candidateColumns = columns.filter((column) => {
    if (ignoredColumns.includes(column)) return false;
    if (isIdColumnName(column)) return false;

    return true;
  });

  const numericColumns = candidateColumns.filter((column) =>
    isMostlyNumeric(cleanRows.map((row) => row[column])),
  );

  const ordinalNumericColumns = numericColumns.filter((column) =>
    looksOrdinalOrLikert(cleanRows.map((row) => row[column])),
  );

  const continuousNumericColumns = numericColumns.filter(
    (column) => !ordinalNumericColumns.includes(column),
  );

  const autoGroupColumns = candidateColumns.filter((column) => {
    if (numericColumns.includes(column) && !looksLikeGroupNumeric(cleanRows.map((row) => row[column]))) {
      return false;
    }

    return hasReasonableGroupCount(cleanRows.map((row) => row[column]));
  });

  const groupColumns = uniqueStrings([
    ...(options.groupColumns ?? []),
    ...autoGroupColumns,
  ]).filter((column) => columns.includes(column) && column !== idColumn && !isIdColumnName(column));

  const respondentCount = countRespondents(cleanRows, idColumn);

  const frequencies =
    options.includeFrequencies === false
      ? []
      : candidateColumns
          .filter((column) => {
            const values = cleanRows.map((row) => row[column]);

            return (
              hasReasonableFrequencyCount(values) ||
              ordinalNumericColumns.includes(column)
            );
          })
          .map((column) => calculateFrequencyAnalysis(cleanRows, column));

  const itemDescriptives =
    options.includeItemDescriptives === false
      ? []
      : numericColumns.map((column) =>
          calculateDescriptiveStatistics(column, getNumericColumn(cleanRows, column)),
        );

  const manualScales = options.scales ?? [];
  const autoScales = autoDetectScales
    ? autoDetectScaleDefinitions(numericColumns)
    : [];

  const mergedScales = mergeScaleDefinitions(manualScales, autoScales);

  const manualCombinedScales = options.combinedScales ?? [];
  const autoCombinedScales = autoDetectCombinedScaleDefinitions(mergedScales);

  const mergedCombinedScales = mergeCombinedScaleDefinitions(
    manualCombinedScales,
    autoCombinedScales,
  );

  const baseScaleScores = calculateScaleScores(cleanRows, numericColumns, mergedScales);
  const combinedScaleScores = calculateCombinedScaleScores(
    baseScaleScores,
    mergedCombinedScales,
  );

  const allScaleScores = [...baseScaleScores, ...combinedScaleScores].filter(
    (scale) => scale.itemsUsed.length > 0 || scale.scores.some(isFiniteNumber),
  );

  const fallbackScores: ScaleScoreResult[] =
    allScaleScores.length === 0 && fallbackToNumericVariables
      ? numericColumns.map((column) => ({
          scaleId: `numeric_${slugify(column)}`,
          scaleName: column,
          scores: getNumericColumn(cleanRows, column),
          itemsUsed: [column],
          missingRows: getNumericColumn(cleanRows, column).filter((value) => value === null).length,
          scoring: 'sum',
        }))
      : [];

  const analysisScores = allScaleScores.length > 0 ? allScaleScores : fallbackScores;
  const fallbackUsed = allScaleScores.length === 0 && fallbackScores.length > 0;

  const scaleDescriptives = analysisScores.map((scale) =>
    calculateDescriptiveStatistics(scale.scaleName, scale.scores),
  );

  const normality = analysisScores.map((scale) =>
    calculateNormality(scale.scaleName, scale.scores, alpha),
  );

  const pearson = calculatePairwiseCorrelations(analysisScores, 'pearson');
  const spearman = calculatePairwiseCorrelations(analysisScores, 'spearman');

  const shouldUseParametric = decideParametricByNormality(normality);
  const recommendedCorrelations = shouldUseParametric ? pearson : spearman;

  const reliability = calculateReliabilityForScales(cleanRows, numericColumns, mergedScales);

  const groupTestInput = analysisScores;

  const parametricGroupTests: GroupTestResult[] = [];
  const nonParametricGroupTests: GroupTestResult[] = [];
  const recommendedGroupTests: GroupTestResult[] = [];

  for (const groupColumn of groupColumns) {
    const groupValues = cleanRows.map((row) => normalizeGroupValue(row[groupColumn]));
    const groupCount = uniqueStrings(groupValues.filter(Boolean)).length;

    if (groupCount < 2) continue;

    for (const variable of groupTestInput) {
      const grouped = buildGroupedValues(variable.scores, groupValues);
      const realGroupCount = Object.values(grouped).filter((values) => values.length > 0).length;

      if (realGroupCount < 2) continue;

      const variableNormality = normality.find((item) => item.variable === variable.scaleName);
      const variableIsNormal = variableNormality?.isNormal === true;

      if (realGroupCount === 2) {
        const tTest = calculateIndependentTTest(variable.scaleName, groupColumn, grouped);
        const mannWhitney = calculateMannWhitneyUTest(variable.scaleName, groupColumn, grouped);

        parametricGroupTests.push(tTest);
        nonParametricGroupTests.push(mannWhitney);
        recommendedGroupTests.push(variableIsNormal ? tTest : mannWhitney);
      }

      if (realGroupCount >= 3) {
        const anova = calculateOneWayAnova(variable.scaleName, groupColumn, grouped);
        const kruskal = calculateKruskalWallisTest(variable.scaleName, groupColumn, grouped);

        parametricGroupTests.push(anova);
        nonParametricGroupTests.push(kruskal);
        recommendedGroupTests.push(variableIsNormal ? anova : kruskal);
      }
    }
  }

  const aiRecommendation = buildAiRecommendation({
    idColumn,
    respondentCount,
    normality,
    shouldUseParametric,
    hasScales: allScaleScores.length > 0,
    fallbackUsed,
    groupColumns,
    manualScaleCount: manualScales.length,
    autoDetectedScaleCount: autoScales.length,
  });

  return {
    meta: {
      totalRows: cleanRows.length,
      respondentCount,
      idColumn,
      ignoredColumns,
      numericColumns,
      ordinalNumericColumns,
      continuousNumericColumns,
      groupColumns,
      alpha,
      autoDetectedScaleCount: autoScales.length,
      manualScaleCount: manualScales.length,
      fallbackUsed,
    },

    frequencies,
    itemDescriptives,

    scaleScores: analysisScores,
    scaleDescriptives,
    normality,

    correlations: {
      pearson,
      spearman,
      recommended: recommendedCorrelations,
      recommendationNote: shouldUseParametric
        ? 'Na základe kontroly normality odporúčame interpretovať Pearsonovu koreláciu. Pri ordinálnych položkách alebo pochybnej normalite je bezpečnejší Spearman.'
        : 'Na základe kontroly normality odporúčame interpretovať Spearmanovu koreláciu, pretože normalita nie je potvrdená alebo ide o ordinálne/škálové dáta.',
    },

    reliability,

    groupTests: {
      parametric: parametricGroupTests,
      nonParametric: nonParametricGroupTests,
      recommended: recommendedGroupTests,
      recommendationNote: shouldUseParametric
        ? 'Pre premenné s približne normálnym rozdelením odporúčame parametrické testy: Independent t-test pri dvoch skupinách a ANOVA pri troch a viacerých skupinách.'
        : 'Ak normalita nie je potvrdená, odporúčame neparametrické testy: Mann-Whitney U pri dvoch skupinách a Kruskal-Wallis pri troch a viacerých skupinách.',
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

function isIdColumnName(columnName: string): boolean {
  const normalized = normalizeText(columnName);

  return (
    normalized === 'id' ||
    normalized === 'respondent' ||
    normalized === 'respondentid' ||
    normalized === 'cislo' ||
    normalized === 'poradie' ||
    normalized === 'index' ||
    normalized === 'row' ||
    normalized === 'riadok' ||
    normalized === 'cisloriadku' ||
    normalized === 'respondentcislo'
  );
}

function detectIdColumn(columns: string[], rows: AnalysisRow[]): string | null {
  const direct = columns.find((column) => isIdColumnName(column));
  if (direct) return direct;

  const firstColumn = columns[0];

  if (!firstColumn) return null;

  const normalizedFirst = normalizeText(firstColumn);

  if (normalizedFirst.includes('id') || normalizedFirst.includes('respondent')) {
    return firstColumn;
  }

  const firstValues = rows.map((row) => row[firstColumn]);
  const numericValues = firstValues
    .filter((value) => !isMissing(value))
    .map(toNumber)
    .filter(isFiniteNumber);

  if (numericValues.length >= Math.max(3, Math.floor(rows.length * 0.8))) {
    const looksSequential = numericValues.every((value, index) => {
      return value === index + 1 || value === index;
    });

    if (looksSequential) {
      return firstColumn;
    }
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
      cumulativePercent: round2(Math.min(cumulative, 100)),
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
    standardErrorSkewness: valid > 0 ? round2(Math.sqrt(6 / valid)) : null,
    kurtosis: round2(kurtosis(values)),
    standardErrorKurtosis: valid > 0 ? round2(Math.sqrt(24 / valid)) : null,
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

    const preferred = numberMatches.find((column) => {
      const normalized = normalizeText(column);

      return (
        normalized.includes(`polozka${itemNumber}`) ||
        normalized.includes(`item${itemNumber}`) ||
        normalized.includes(`otazka${itemNumber}`) ||
        normalized.endsWith(String(itemNumber))
      );
    });

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
/* AUTOMATICKÁ DETEKCIA ŠKÁL                                                   */
/* -------------------------------------------------------------------------- */

function autoDetectScaleDefinitions(numericColumns: string[]): ScaleDefinition[] {
  const scales: ScaleDefinition[] = [];

  const normalizedColumns = numericColumns.map((column) => ({
    original: column,
    normalized: normalizeText(column),
  }));

  const wemItems = normalizedColumns
    .filter((item) => /^wem\d+$/.test(item.normalized) || /^wemwbs\d+$/.test(item.normalized))
    .map((item) => item.original);

  if (wemItems.length >= 3) {
    scales.push({
      id: 'wemwbs_total',
      name: 'WEMWBS – celkové skóre',
      items: wemItems,
      minValue: 1,
      maxValue: 5,
      scoring: 'sum',
      description: 'Automaticky rozpoznaná škála WEM/WEMWBS.',
    });
  }

  const jssItems = normalizedColumns
    .filter((item) => /^jss\d+$/.test(item.normalized))
    .map((item) => item.original);

  if (jssItems.length >= 3) {
    scales.push({
      id: 'jss_total',
      name: 'JSS – celkové skóre',
      items: jssItems,
      minValue: 1,
      maxValue: 6,
      scoring: 'sum',
      description: 'Automaticky rozpoznaná škála JSS.',
    });
  }

  const fatherColumns = numericColumns.filter((column) => {
    const n = normalizeText(column);
    return n.includes('otec') || n.includes('father') || n.includes('otc');
  });

  const motherColumns = numericColumns.filter((column) => {
    const n = normalizeText(column);
    return n.includes('matka') || n.includes('mother') || n.includes('mat');
  });

  if (fatherColumns.length >= 6) {
    scales.push(
      {
        id: 'sembu_father_rejection',
        name: 's-EMBU Otec – Odmietanie',
        items: findColumnsByItemNumbers(fatherColumns, [1, 4, 7, 13, 15, 16, 21]),
        minValue: 1,
        maxValue: 4,
        scoring: 'sum',
      },
      {
        id: 'sembu_father_warmth',
        name: 's-EMBU Otec – Emočná vrelosť',
        items: findColumnsByItemNumbers(fatherColumns, [2, 6, 12, 14, 19, 23]),
        minValue: 1,
        maxValue: 4,
        scoring: 'sum',
      },
      {
        id: 'sembu_father_overprotection',
        name: 's-EMBU Otec – Hyperprotektivita',
        items: findColumnsByItemNumbers(fatherColumns, [3, 5, 8, 10, 11, 17, 18, 20, 22]),
        reverseItems: findColumnsByItemNumbers(fatherColumns, [17]),
        minValue: 1,
        maxValue: 4,
        scoring: 'sum',
      },
    );
  }

  if (motherColumns.length >= 6) {
    scales.push(
      {
        id: 'sembu_mother_rejection',
        name: 's-EMBU Matka – Odmietanie',
        items: findColumnsByItemNumbers(motherColumns, [1, 4, 7, 13, 15, 16, 21]),
        minValue: 1,
        maxValue: 4,
        scoring: 'sum',
      },
      {
        id: 'sembu_mother_warmth',
        name: 's-EMBU Matka – Emočná vrelosť',
        items: findColumnsByItemNumbers(motherColumns, [2, 6, 12, 14, 19, 23]),
        minValue: 1,
        maxValue: 4,
        scoring: 'sum',
      },
      {
        id: 'sembu_mother_overprotection',
        name: 's-EMBU Matka – Hyperprotektivita',
        items: findColumnsByItemNumbers(motherColumns, [3, 5, 8, 10, 11, 17, 18, 20, 22]),
        reverseItems: findColumnsByItemNumbers(motherColumns, [17]),
        minValue: 1,
        maxValue: 4,
        scoring: 'sum',
      },
    );
  }

  const schoolInclusionColumns = numericColumns.filter((column) => {
    const n = normalizeText(column);
    return (
      n.includes('zaclenen') ||
      n.includes('skola') ||
      n.includes('school') ||
      n.includes('inclusion') ||
      /^si\d+$/.test(n)
    );
  });

  if (schoolInclusionColumns.length >= 6) {
    scales.push(
      {
        id: 'school_social_acceptance',
        name: 'Škála školskej začlenenosti – sociálna akceptácia',
        items: findColumnsByItemNumbers(schoolInclusionColumns, [1, 3, 5, 7, 9]),
        minValue: 1,
        maxValue: 4,
        scoring: 'sum',
      },
      {
        id: 'school_social_exclusion_reversed',
        name: 'Škála školskej začlenenosti – sociálne vylúčenie reverzne',
        items: findColumnsByItemNumbers(schoolInclusionColumns, [2, 4, 6, 8, 10]),
        reverseItems: findColumnsByItemNumbers(schoolInclusionColumns, [2, 4, 6, 8, 10]),
        minValue: 1,
        maxValue: 4,
        scoring: 'sum',
      },
    );
  }

  return scales.filter((scale) => scale.items.length > 0);
}

function autoDetectCombinedScaleDefinitions(
  scales: ScaleDefinition[],
): CombinedScaleDefinition[] {
  const ids = new Set(scales.map((scale) => scale.id));
  const combined: CombinedScaleDefinition[] = [];

  if (ids.has('sembu_father_rejection') && ids.has('sembu_mother_rejection')) {
    combined.push({
      id: 'sembu_total_rejection',
      name: 's-EMBU Celkom – Odmietanie',
      scaleIds: ['sembu_father_rejection', 'sembu_mother_rejection'],
      scoring: 'sum',
    });
  }

  if (ids.has('sembu_father_warmth') && ids.has('sembu_mother_warmth')) {
    combined.push({
      id: 'sembu_total_warmth',
      name: 's-EMBU Celkom – Emočná vrelosť',
      scaleIds: ['sembu_father_warmth', 'sembu_mother_warmth'],
      scoring: 'sum',
    });
  }

  if (ids.has('sembu_father_overprotection') && ids.has('sembu_mother_overprotection')) {
    combined.push({
      id: 'sembu_total_overprotection',
      name: 's-EMBU Celkom – Hyperprotektivita',
      scaleIds: ['sembu_father_overprotection', 'sembu_mother_overprotection'],
      scoring: 'sum',
    });
  }

  if (ids.has('school_social_acceptance') && ids.has('school_social_exclusion_reversed')) {
    combined.push({
      id: 'school_inclusion_total',
      name: 'Škála školskej začlenenosti – celkové skóre',
      scaleIds: ['school_social_acceptance', 'school_social_exclusion_reversed'],
      scoring: 'sum',
    });
  }

  return combined;
}

function findColumnsByItemNumbers(columns: string[], itemNumbers: number[]): string[] {
  return itemNumbers
    .map((number) => {
      return columns.find((column) => extractAllNumbers(column).includes(number));
    })
    .filter(Boolean) as string[];
}

function mergeScaleDefinitions(
  manualScales: ScaleDefinition[],
  autoScales: ScaleDefinition[],
): ScaleDefinition[] {
  const map = new Map<string, ScaleDefinition>();

  for (const scale of autoScales) {
    map.set(scale.id, scale);
  }

  for (const scale of manualScales) {
    map.set(scale.id, scale);
  }

  return Array.from(map.values());
}

function mergeCombinedScaleDefinitions(
  manualCombined: CombinedScaleDefinition[],
  autoCombined: CombinedScaleDefinition[],
): CombinedScaleDefinition[] {
  const map = new Map<string, CombinedScaleDefinition>();

  for (const scale of autoCombined) {
    map.set(scale.id, scale);
  }

  for (const scale of manualCombined) {
    map.set(scale.id, scale);
  }

  return Array.from(map.values());
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

function decideParametricByNormality(normality: NormalityResult[]): boolean {
  const validNormality = normality.filter((item) => item.isNormal !== null);

  if (validNormality.length === 0) return false;

  return validNormality.every((item) => item.isNormal === true);
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
    nTotal: groups.length,
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
  fallbackUsed: boolean;
  groupColumns: string[];
  manualScaleCount: number;
  autoDetectedScaleCount: number;
}): string[] {
  const notes: string[] = [];

  if (input.idColumn) {
    notes.push(
      `Stĺpec "${input.idColumn}" bol rozpoznaný ako ID/respondent a nebol použitý v žiadnych štatistických výpočtoch. Slúži iba na určenie počtu respondentov N = ${input.respondentCount}.`,
    );
  }

  if (input.manualScaleCount > 0) {
    notes.push(
      `Boli použité manuálne zadané definície škál/subškál: ${input.manualScaleCount}.`,
    );
  }

  if (input.autoDetectedScaleCount > 0) {
    notes.push(
      `Systém automaticky rozpoznal možné škály/subškály: ${input.autoDetectedScaleCount}. Odporúčame skontrolovať, či položky zodpovedajú metodike dotazníka.`,
    );
  }

  if (!input.hasScales && input.fallbackUsed) {
    notes.push(
      'Neboli zadané ani spoľahlivo rozpoznané škály/subškály. Systém preto použil numerické premenné ako náhradné skóre. Pre odbornú prácu odporúčame doplniť presné definície škál a subškál štandardizovaného dotazníka.',
    );
  }

  if (input.hasScales) {
    notes.push(
      'Deskriptívna štatistika, normalita, korelácie a reliabilita boli pripravené primárne pre škály a subškály, nie iba pre jednotlivé položky.',
    );
  }

  if (input.shouldUseParametric) {
    notes.push(
      'Normalita dát je približne splnená. Pre korelačnú analýzu možno interpretovať Pearsonovu koreláciu. Pre porovnanie dvoch skupín možno použiť Independent t-test a pre tri a viac skupín ANOVA.',
    );
  } else {
    notes.push(
      'Normalita dát nie je potvrdená pri všetkých premenných. Pre korelačnú analýzu je bezpečnejšie použiť Spearmanovu koreláciu. Pre porovnanie dvoch skupín odporúčame Mann-Whitney U test a pre tri a viac skupín Kruskal-Wallis test.',
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
    .replace('%', '')
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

function looksOrdinalOrLikert(values: RawValue[]): boolean {
  const numeric = values
    .filter((value) => !isMissing(value))
    .map(toNumber)
    .filter(isFiniteNumber);

  if (numeric.length === 0) return false;

  const unique = uniqueNumbers(numeric);
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);

  return unique.length <= 10 && min >= 0 && max <= 10;
}

function looksLikeGroupNumeric(values: RawValue[]): boolean {
  const numeric = values
    .filter((value) => !isMissing(value))
    .map(toNumber)
    .filter(isFiniteNumber);

  if (numeric.length === 0) return false;

  const unique = uniqueNumbers(numeric);

  return unique.length >= 2 && unique.length <= 6;
}

function hasReasonableFrequencyCount(values: RawValue[]): boolean {
  const normalized = values
    .filter((value) => !isMissing(value))
    .map((value) => String(value).trim());

  const unique = uniqueStrings(normalized);

  return unique.length >= 1 && unique.length <= 30;
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

  const z =
    (Math.pow(chiSquare / df, 1 / 3) - (1 - 2 / (9 * df))) /
    Math.sqrt(2 / (9 * df));

  return 1 - normalCdf(z);
}

function approximateFTestPValue(f: number, df1: number, df2: number): number {
  if (df1 <= 0 || df2 <= 0) return 1;

  const z =
    (Math.log(Math.max(f, 1e-12)) - Math.log(df2 / Math.max(1, df2 - 2))) /
    Math.sqrt(2 / df1 + 2 / df2);

  return 1 - normalCdf(z);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function uniqueNumbers(values: number[]): number[] {
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

function slugify(value: string): string {
  return normalizeText(value) || 'variable';
}