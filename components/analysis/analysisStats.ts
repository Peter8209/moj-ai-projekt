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

export type NormalityMethod = 'approx-shapiro-wilk' | 'approx-shapiro-jarque-bera';

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


export type QuestionnaireMode = 'none' | 'selected' | 'manual' | 'auto-suggest-only';

export interface CustomQuestionnaireScaleDefinition {
  id?: string;
  name?: string;
  items?: ScaleItemReference[];
  reverseItems?: ScaleItemReference[];
  minValue?: number;
  maxValue?: number;
  scoring?: ScaleScoringMode;
  description?: string;
}

export interface CustomQuestionnaireCombinedScaleDefinition {
  id?: string;
  name?: string;
  scaleIds?: string[];
  scoring?: ScaleScoringMode;
  description?: string;
}

export interface CustomQuestionnaireDefinition {
  id?: string;
  name?: string;
  questionnaireId?: string;
  questionnaireName?: string;
  responseMin?: number;
  responseMax?: number;
  scoring?: ScaleScoringMode;
  description?: string;
  scales?: CustomQuestionnaireScaleDefinition[];
  subscales?: CustomQuestionnaireScaleDefinition[];
  combinedScales?: CustomQuestionnaireCombinedScaleDefinition[];
}

export interface ManualAnalysisConfig {
  questionnaireMode?: QuestionnaireMode | string;
  selectedQuestionnaires?: string[];
  customQuestionnairesText?: string;
  manualScalesText?: string;
  manualSubscalesText?: string;
  groupingColumnsText?: string;
}

export interface QuestionnaireConfig {
  mode?: QuestionnaireMode;
  selectedQuestionnaires?: string[];
  customQuestionnaires?: CustomQuestionnaireDefinition[];
  /**
   * Voľný text z Dashboardu: používateľ vie napísať názov dotazníka,
   * položky, škály a subškály. Používa sa hlavne v režime manual.
   */
  customQuestionnairesText?: string;

  /**
   * Textové definície zo sekcie Analýza dát.
   * Formát:
   * Názov škály: položka1, položka2, položka3
   */
  manualScalesText?: string;
  manualSubscalesText?: string;
  groupingColumnsText?: string;
  manualAnalysisConfig?: ManualAnalysisConfig;
}

export interface StatisticalAnalysisOptions {
  idColumn?: string;
  scales?: ScaleDefinition[];
  combinedScales?: CombinedScaleDefinition[];
  groupColumns?: string[];

  /**
   * Manuálne zadané škály/subškály z DashboardClient.tsx.
   * Tieto texty majú prednosť pred automatickým hádaním škál.
   */
  manualScalesText?: string;
  manualSubscalesText?: string;
  groupingColumnsText?: string;
  manualAnalysisConfig?: ManualAnalysisConfig;

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

  /**
   * Ak true, systém automaticky hľadá skupinové premenné pre t-test/ANOVA.
   * Predvolené: true. Filter zároveň bráni tomu, aby sa dotazníkové položky použili ako skupinové premenné.
   */
  autoDetectGroupColumns?: boolean;

  /**
   * Konfigurácia dotazníkov poslaná z Dashboardu.
   * V strict režime sa WEMWBS/JSS a ďalšie pomenované štandardizované dotazníky
   * nepoužijú bez výslovného výberu používateľa.
   */
  questionnaireConfig?: QuestionnaireConfig;
  selectedQuestionnaires?: string[];
  customQuestionnaires?: CustomQuestionnaireDefinition[];

  /** Ak true, známe štandardizované dotazníky sa počítajú iba po potvrdení. */
  strictQuestionnaireMode?: boolean;

  /** Ak false, systém nesmie počítať nepotvrdené WEMWBS/JSS iba podľa názvu stĺpca. */
  allowUnconfirmedStandardizedQuestionnaires?: boolean;
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
  shapiroWilk: number | null;
  pValueOfShapiroWilk: number | null;
  pValueOfShapiroWilkText: string | null;
  minimum: number | null;
  maximum: number | null;
  sum: number | null;
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
  pValueText?: string | null;
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
  pValueText?: string | null;
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
  pValueText?: string | null;
  significance: string;
  recommendation: string;
}

export interface ScaleScoreExportRow {
  respondentIndex: number;
  [scaleName: string]: RawValue;
}

export interface CorrelationMatrixRow {
  variable: string;
  [variableName: string]: RawValue;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  description?: string;
  group?: string;
}

export interface AnalysisChartData {
  frequencyBars: ChartDataPoint[];
  meanBars: ChartDataPoint[];
  scaleScoreBars: ChartDataPoint[];
  subscaleScoreBars: ChartDataPoint[];
  reliabilityBars: ChartDataPoint[];
  correlationBars: ChartDataPoint[];
  normalityBars: ChartDataPoint[];
  groupTestBars: ChartDataPoint[];
  missingValueBars: ChartDataPoint[];
}

export interface AnalysisChartTable {
  key: string;
  title: string;
  rows: Array<Record<string, RawValue>>;
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
    questionnaireMode?: QuestionnaireMode;
    selectedQuestionnaires?: string[];
    customQuestionnairesText?: string;
    manualScalesText?: string;
    manualSubscalesText?: string;
    groupingColumnsText?: string;
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

  /** Definície škál a podškál použité pri výpočte. */
  scaleDefinitions: ScaleDefinition[];
  combinedScaleDefinitions: CombinedScaleDefinition[];

  /** Excel-ready tabuľka: respondent × vypočítané skóre škály/subškály. */
  scaleScoreRows: ScaleScoreExportRow[];

  /** Korelačná matica pre odporúčanú metódu. */
  correlationMatrix: CorrelationMatrixRow[];

  /** Dáta pripravené pre grafy v UI a pre Excel export. */
  chartData: AnalysisChartData;
  chartTables: AnalysisChartTable[];

  /** Aliasové polia pripravené pre staršie komponenty/exportéry. */
  aliases: Record<string, unknown>;

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
  const autoDetectScales = shouldRunAutoScaleDetection(options);
  const fallbackToNumericVariables = options.fallbackToNumericVariables !== false;
  const autoDetectGroupColumns = options.autoDetectGroupColumns !== false;

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

  const autoGroupColumns = autoDetectGroupColumns ? candidateColumns.filter((column) => {
    if (!isLikelyGroupColumnName(column)) return false;
    if (isQuestionnaireItemColumn(column)) return false;
    if (numericColumns.includes(column) && !looksLikeGroupNumeric(cleanRows.map((row) => row[column]))) {
      return false;
    }

    return hasReasonableGroupCount(cleanRows.map((row) => row[column]));
  }) : [];

  const manualGroupingColumns = parseManualGroupingColumns(
    getOptionTextValue(options, 'groupingColumnsText'),
    candidateColumns,
  );

  const groupColumns = uniqueStrings([
    ...(options.groupColumns ?? []),
    ...manualGroupingColumns,
    ...autoGroupColumns,
  ]).filter((column) => {
    if (!columns.includes(column)) return false;
    if (column === idColumn) return false;
    if (isIdColumnName(column)) return false;
    if (isQuestionnaireItemColumn(column) && !(options.groupColumns ?? []).includes(column)) return false;

    return true;
  });

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

  const questionnaireDefinitions = buildQuestionnaireScaleDefinitions(
    numericColumns,
    options,
  );

  const manualDashboardScales = parseManualScaleDefinitionsFromText(
    getOptionTextValue(options, 'manualScalesText'),
    'scale',
  );

  const manualDashboardSubscales = parseManualScaleDefinitionsFromText(
    getOptionTextValue(options, 'manualSubscalesText'),
    'subscale',
  );

  const manualScales = [
    ...(options.scales ?? []),
    ...questionnaireDefinitions.scales,
    ...manualDashboardScales,
    ...manualDashboardSubscales,
  ];

  const autoScales = autoDetectScales
    ? autoDetectScaleDefinitions(numericColumns, options)
    : [];

  const mergedScales = mergeScaleDefinitions(manualScales, autoScales);

  const manualCombinedScales = [
    ...(options.combinedScales ?? []),
    ...questionnaireDefinitions.combinedScales,
  ];

  const autoCombinedScales = autoDetectCombinedScaleDefinitions(
    mergedScales,
    options,
  );

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
  const recommendedCorrelations = calculateRecommendedCorrelationsByNormality(
    analysisScores,
    normality,
  );

  const shouldUseParametric = decideParametricByNormality(normality);
  const normalityLookup = buildNormalityLookup(normality);

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

      if (realGroupCount === 2) {
        const tTest = calculateIndependentTTest(variable.scaleName, groupColumn, grouped);
        const mannWhitney = calculateMannWhitneyUTest(variable.scaleName, groupColumn, grouped);

        parametricGroupTests.push(tTest);
        nonParametricGroupTests.push(mannWhitney);
        recommendedGroupTests.push(
          isVariableNormal(variable.scaleName, normalityLookup) ? tTest : mannWhitney,
        );
      }

      if (realGroupCount >= 3) {
        const anova = calculateOneWayAnova(variable.scaleName, groupColumn, grouped);
        const kruskal = calculateKruskalWallisTest(variable.scaleName, groupColumn, grouped);

        parametricGroupTests.push(anova);
        nonParametricGroupTests.push(kruskal);
        recommendedGroupTests.push(
          isVariableNormal(variable.scaleName, normalityLookup) ? anova : kruskal,
        );
      }
    }
  }

  const exportedPearson = pearson;
  const exportedSpearman = spearman;
  const exportedRecommendedCorrelations = recommendedCorrelations;
  const exportedParametricGroupTests = parametricGroupTests;
  const exportedNonParametricGroupTests = nonParametricGroupTests;
  const exportedRecommendedGroupTests = recommendedGroupTests;

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

  const correlationMatrix = buildCorrelationMatrix(
    exportedRecommendedCorrelations,
  );

  const scaleScoreRows = buildScaleScoreRowsForExport(analysisScores, respondentCount);

  const chartData = buildAnalysisChartData({
    frequencies,
    itemDescriptives,
    scaleScores: analysisScores,
    scaleDescriptives,
    normality,
    reliability,
    correlations: exportedRecommendedCorrelations,
    groupTests: exportedRecommendedGroupTests,
    scaleDefinitions: mergedScales,
    combinedScaleDefinitions: mergedCombinedScales,
  });

  const chartTables = buildAnalysisChartTables(chartData);

  const aliases = buildAnalysisAliases({
    frequencies,
    itemDescriptives,
    scaleScores: analysisScores,
    scaleDescriptives,
    normality,
    reliability,
    pearson: exportedPearson,
    spearman: exportedSpearman,
    recommendedCorrelations: exportedRecommendedCorrelations,
    correlationMatrix,
    parametricGroupTests: exportedParametricGroupTests,
    nonParametricGroupTests: exportedNonParametricGroupTests,
    recommendedGroupTests: exportedRecommendedGroupTests,
    chartData,
    chartTables,
    scaleDefinitions: mergedScales,
    combinedScaleDefinitions: mergedCombinedScales,
    scaleScoreRows,
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
      questionnaireMode: getQuestionnaireMode(options),
      selectedQuestionnaires: Array.from(getSelectedQuestionnaireIds(options)),
      customQuestionnairesText:
        options.questionnaireConfig?.customQuestionnairesText ??
        options.manualAnalysisConfig?.customQuestionnairesText ??
        '',
      manualScalesText: getOptionTextValue(options, 'manualScalesText'),
      manualSubscalesText: getOptionTextValue(options, 'manualSubscalesText'),
      groupingColumnsText: getOptionTextValue(options, 'groupingColumnsText'),
    },

    frequencies,
    itemDescriptives,

    scaleScores: analysisScores,
    scaleDescriptives,
    normality,

    correlations: {
      pearson: exportedPearson,
      spearman: exportedSpearman,
      recommended: exportedRecommendedCorrelations,
      recommendationNote:
        'Odporúčaná korelácia sa vyberá pre každú dvojicu premenných samostatne: ak sú obe premenné približne normálne, použije sa Pearson; ak aspoň jedna premenná nemá potvrdenú normalitu, použije sa Spearman.',
    },

    reliability,

    groupTests: {
      parametric: exportedParametricGroupTests,
      nonParametric: exportedNonParametricGroupTests,
      recommended: exportedRecommendedGroupTests,
      recommendationNote:
        'Odporúčaný test rozdielov sa vyberá podľa normality závislej škály/subškály a počtu skupín: 2 skupiny + normalita = Independent t-test, 2 skupiny + nenormalita = Mann-Whitney U, 3+ skupín + normalita = ANOVA, 3+ skupín + nenormalita = Kruskal-Wallis.',
    },

    scaleDefinitions: mergedScales,
    combinedScaleDefinitions: mergedCombinedScales,
    scaleScoreRows,
    correlationMatrix,
    chartData,
    chartTables,
    aliases,

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
      percent: round3(percent),
      validPercent: round3(validPercent),
      cumulativePercent: round3(Math.min(cumulative, 100)),
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
      shapiroWilk: null,
      pValueOfShapiroWilk: null,
      pValueOfShapiroWilkText: null,
      minimum: null,
      maximum: null,
      sum: null,
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
  const shapiro = approximateShapiroWilk(values);

  return {
    variable,
    valid,
    missing,
    mean: round3(meanValue),
    median: round3(median(values)),
    mode: calculateMode(values),
    standardDeviation: round3(standardDeviationValue),
    variance: round3(varianceValue),
    skewness: round3(skewness(values)),
    standardErrorSkewness: valid > 0 ? round3(Math.sqrt(6 / valid)) : null,
    kurtosis: round3(kurtosis(values)),
    standardErrorKurtosis: valid > 0 ? round3(Math.sqrt(24 / valid)) : null,
    shapiroWilk: shapiro.statistic,
    pValueOfShapiroWilk: shapiro.pValue,
    pValueOfShapiroWilkText: formatPValue(shapiro.pValue),
    minimum: round3(values[0]),
    maximum: round3(values[values.length - 1]),
    sum: round3(sum(values)),
    q1: round3(q1),
    q3: round3(q3),
    iqr: round3(q3 - q1),
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
        return round3(mean(itemValues));
      }

      return round3(sum(itemValues));
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

      scores.push(scoring === 'mean' ? round3(mean(rowValues)) : round3(sum(rowValues)));
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
/* DOTAZNÍKOVÝ REŽIM – ochrana pred chybným WEMWBS/JSS                         */
/* -------------------------------------------------------------------------- */

function normalizeQuestionnaireId(value: unknown): string {
  const raw = String(value ?? '').trim();
  const compact = normalizeText(raw);
  const underscored = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!compact) return '';

  if (
    compact === 'wem' ||
    compact === 'wembs' ||
    compact === 'wemwbs' ||
    compact.includes('warwick') ||
    compact.includes('wellbeing')
  ) {
    return 'wemwbs';
  }

  if (
    compact === 'jss' ||
    compact.includes('jobsatisfaction') ||
    compact.includes('pracovaspokojnost') ||
    compact.includes('pracovnespokojnosti')
  ) {
    return 'jss';
  }

  if (
    compact === 'sehs' ||
    compact === 'sehss' ||
    compact === 'sehss2020' ||
    compact.includes('socialemotionalhealth')
  ) {
    return 'sehs_s_2020';
  }

  if (
    compact === 'resilience' ||
    compact === 'resiliencie' ||
    compact === 'reziliencia' ||
    compact === 'skalareziliencie' ||
    compact === 'resiliencescale' ||
    compact === 'rs' ||
    compact.includes('cdrisc')
  ) {
    return 'resilience_scale';
  }

  if (compact === 'custom' || compact.includes('vlastny') || compact.includes('vlastne')) {
    return 'custom';
  }

  return underscored || compact;
}

function getSelectedQuestionnaireIds(
  options: StatisticalAnalysisOptions = {},
): Set<string> {
  const selected = [
    ...(options.selectedQuestionnaires ?? []),
    ...(options.questionnaireConfig?.selectedQuestionnaires ?? []),
  ];

  return new Set(
    selected
      .map(normalizeQuestionnaireId)
      .filter(Boolean),
  );
}

function getQuestionnaireMode(
  options: StatisticalAnalysisOptions = {},
): QuestionnaireMode {
  return options.questionnaireConfig?.mode ?? 'auto-suggest-only';
}

function isStrictQuestionnaireMode(
  options: StatisticalAnalysisOptions = {},
): boolean {
  return (
    options.strictQuestionnaireMode === true ||
    options.allowUnconfirmedStandardizedQuestionnaires === false ||
    getQuestionnaireMode(options) === 'none' ||
    getQuestionnaireMode(options) === 'selected' ||
    getQuestionnaireMode(options) === 'manual' ||
    getQuestionnaireMode(options) === 'auto-suggest-only'
  );
}

function shouldRunAutoScaleDetection(
  options: StatisticalAnalysisOptions = {},
): boolean {
  if (options.autoDetectScales === false) return false;

  const mode = getQuestionnaireMode(options);

  if (mode === 'none' || mode === 'auto-suggest-only') {
    return false;
  }

  if (mode === 'selected' || mode === 'manual') {
    return true;
  }

  return true;
}

function shouldInferGenericScales(
  options: StatisticalAnalysisOptions = {},
): boolean {
  const mode = getQuestionnaireMode(options);

  if (mode === 'none' || mode === 'auto-suggest-only') return false;

  return mode === 'selected' || mode === 'manual' || options.autoDetectScales === true;
}

function getManualQuestionnaireText(
  options: StatisticalAnalysisOptions = {},
): string {
  return normalizeText(
    [
      options.questionnaireConfig?.customQuestionnairesText,
      getOptionTextValue(options, 'customQuestionnairesText'),
      getOptionTextValue(options, 'manualScalesText'),
      getOptionTextValue(options, 'manualSubscalesText'),
      getOptionTextValue(options, 'groupingColumnsText'),
      ...(options.customQuestionnaires ?? []).map((item) =>
        [
          item.id,
          item.name,
          item.questionnaireId,
          item.questionnaireName,
          item.description,
        ].join(' '),
      ),
      ...(options.questionnaireConfig?.customQuestionnaires ?? []).map((item) =>
        [
          item.id,
          item.name,
          item.questionnaireId,
          item.questionnaireName,
          item.description,
        ].join(' '),
      ),
    ]
      .filter(Boolean)
      .join(' '),
  );
}

function manualTextMentionsQuestionnaire(
  questionnaireId: string,
  options: StatisticalAnalysisOptions = {},
): boolean {
  const text = getManualQuestionnaireText(options);

  if (!text) return false;

  if (questionnaireId === 'wemwbs') {
    return /wem|wembs|wemwbs|warwick|wellbeing|pohod/.test(text);
  }

  if (questionnaireId === 'jss') {
    return /jss|jobsatisfaction|pracovn.*spokoj|spokojnost.*prac/.test(text);
  }

  if (questionnaireId === 'sehs_s_2020') {
    return /sehs|socialemotionalhealth/.test(text);
  }

  if (questionnaireId === 'resilience_scale') {
    return /rezilien|resilien|cdrisc|skalareziliencie/.test(text);
  }

  return false;
}

function shouldComputeQuestionnaire(
  questionnaireId: string,
  options: StatisticalAnalysisOptions = {},
): boolean {
  const selected = getSelectedQuestionnaireIds(options);
  const normalizedId = normalizeQuestionnaireId(questionnaireId);
  const aliases: Record<string, string[]> = {
    wemwbs: ['wemwbs', 'wem', 'warwick_edinburgh', 'warwick_edinburgh_mental_wellbeing_scale'],
    jss: ['jss', 'job_satisfaction_survey'],
    sembu: ['sembu', 's_embu', 'embu'],
    school_inclusion: ['school_inclusion', 'skolska_zaclenenost', 'skolskej_zaclenenosti'],
    work_engagement: ['work_engagement', 'pracovne_zapojenie', 'uwes'],
    resilience_scale: ['resilience_scale', 'skala_reziliencie', 'reziliencia', 'resilience'],
    sehs_s_2020: ['sehs_s_2020', 'sehs', 'sehs_s'],
  };

  const acceptedIds = aliases[normalizedId] ?? [normalizedId];
  const explicitlySelected = acceptedIds.some((id) =>
    selected.has(normalizeQuestionnaireId(id)),
  );

  if (explicitlySelected) return true;

  if (
    getQuestionnaireMode(options) === 'manual' &&
    acceptedIds.some((id) => manualTextMentionsQuestionnaire(id, options))
  ) {
    return true;
  }

  if (isStrictQuestionnaireMode(options)) return false;

  return options.allowUnconfirmedStandardizedQuestionnaires === true;
}


function getOptionTextValue(
  options: StatisticalAnalysisOptions,
  field: keyof ManualAnalysisConfig,
): string {
  const directValue = (options as any)[field];
  const manualConfigValue = options.manualAnalysisConfig?.[field];
  const questionnaireConfigValue = (options.questionnaireConfig as any)?.[field];
  const nestedQuestionnaireManualValue =
    options.questionnaireConfig?.manualAnalysisConfig?.[field];

  return String(
    directValue ??
      manualConfigValue ??
      questionnaireConfigValue ??
      nestedQuestionnaireManualValue ??
      '',
  );
}

function parseManualScaleDefinitionsFromText(
  textValue: string,
  kind: 'scale' | 'subscale',
): ScaleDefinition[] {
  const lines = String(textValue || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line, index): ScaleDefinition | null => {
      const parsed = parseManualDefinitionLine(line, index, kind);
      if (!parsed || parsed.items.length === 0) return null;
      return parsed;
    })
    .filter((definition): definition is ScaleDefinition => Boolean(definition));
}


function parseManualDefinitionLine(
  line: string,
  index: number,
  kind: 'scale' | 'subscale',
): ScaleDefinition | null {
  const normalizedLine = String(line || '').trim();
  if (!normalizedLine) return null;

  const parts = normalizedLine
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  const mainPart = parts[0] || '';
  const separatorCandidates = [
    mainPart.indexOf('='),
    mainPart.indexOf(':'),
  ].filter((value) => value >= 0);

  const separatorIndex =
    separatorCandidates.length > 0
      ? Math.min(...separatorCandidates)
      : -1;

  const rawName =
    separatorIndex >= 0
      ? mainPart.slice(0, separatorIndex).trim()
      : `${kind === 'scale' ? 'Škála' : 'Subškála'} ${index + 1}`;

  const rawItems =
    separatorIndex >= 0
      ? mainPart.slice(separatorIndex + 1).trim()
      : mainPart.trim();

  const optionsMap = parseManualDefinitionOptions(parts.slice(1));

  const items = splitManualItems(rawItems);
  const reverseItems = splitManualItems(
    optionsMap.reverse ||
      optionsMap.reverzne ||
      optionsMap.reverznepolozky ||
      optionsMap.reverseitems ||
      '',
  );

  const minValue = toNumber(optionsMap.min ?? optionsMap.minimum) ?? 1;
  const maxValue = toNumber(optionsMap.max ?? optionsMap.maximum) ?? 5;

  const scoringRaw = normalizeText(
    optionsMap.scoring ||
      optionsMap.vypocet ||
      optionsMap.skore ||
      optionsMap.score ||
      '',
  );

  const scoring: ScaleScoringMode =
    scoringRaw.includes('sum') ||
    scoringRaw.includes('sucet') ||
    scoringRaw.includes('suma')
      ? 'sum'
      : 'mean';

  const safeName =
    rawName && rawName.length > 0
      ? rawName
      : `${kind === 'scale' ? 'Škála' : 'Subškála'} ${index + 1}`;

  const idPrefix = kind === 'scale' ? 'manual_scale' : 'manual_subscale';

  return {
    id: `${idPrefix}_${index + 1}_${slugify(safeName)}`,
    name: safeName,
    items,
    reverseItems,
    minValue,
    maxValue,
    scoring,
    description:
      kind === 'scale'
        ? 'Manuálne zadaná škála pred spustením analýzy dát.'
        : 'Manuálne zadaná subškála pred spustením analýzy dát.',
  };
}


function parseManualDefinitionOptions(parts: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  parts.forEach((part) => {
    const separatorIndex = part.indexOf(':') >= 0 ? part.indexOf(':') : part.indexOf('=');

    if (separatorIndex < 0) return;

    const key = normalizeText(part.slice(0, separatorIndex));
    const value = part.slice(separatorIndex + 1).trim();

    if (!key || !value) return;

    result[key] = value;
  });

  return result;
}


function splitManualItems(value: string): string[] {
  const source = String(value || '').trim();
  if (!source) return [];

  const items: string[] = [];

  const addItem = (item: string) => {
    const cleaned = item
      .trim()
      .replace(/^[\s"'`]+|[\s"'`]+$/g, '')
      .replace(/\s+/g, '');

    if (cleaned && !items.includes(cleaned)) {
      items.push(cleaned);
    }
  };

  const addRange = (prefix: string, from: number, to: number, suffix = '') => {
    if (!prefix || !Number.isFinite(from) || !Number.isFinite(to)) return;

    const step = from <= to ? 1 : -1;
    const maxItems = Math.min(Math.abs(to - from) + 1, 250);

    for (let offset = 0; offset < maxItems; offset += 1) {
      addItem(`${prefix}${from + offset * step}${suffix}`);
    }
  };

  const normalizedSource = source
    .replace(/\bdo\b/gi, ' až ')
    .replace(/\bto\b/gi, ' až ')
    .replace(/\baz\b/gi, ' až ');

  const rangeRegex =
    /([A-Za-zÀ-ž_]+)\s*0*(\d+)\s*(?:až|az|to|do|\.{2,}|-|–|—)\s*(?:\1\s*)?0*(\d+)([Rr])?/gu;

  for (const match of normalizedSource.matchAll(rangeRegex)) {
    const prefix = match[1] || '';
    const from = Number(match[2]);
    const to = Number(match[3]);
    const suffix = match[4] || '';

    addRange(prefix, from, to, suffix);
  }

  const ellipsisRegex =
    /([A-Za-zÀ-ž_]+)\s*0*(\d+)[^,\n;]*\.{2,}[^,\n;]*?(?:\1\s*)?0*(\d+)([Rr])?/gu;

  for (const match of normalizedSource.matchAll(ellipsisRegex)) {
    const prefix = match[1] || '';
    const from = Number(match[2]);
    const to = Number(match[3]);
    const suffix = match[4] || '';

    addRange(prefix, from, to, suffix);
  }

  normalizedSource
    .replace(rangeRegex, ' ')
    .replace(ellipsisRegex, ' ')
    .split(/[,;\n+]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((token) => {
      const compactToken = token.replace(/\s+/g, '');

      if (compactToken === '...' || compactToken === '…') {
        return;
      }

      const directItemMatches = Array.from(
        compactToken.matchAll(/([A-Za-zÀ-ž_]+0*\d+[Rr]?)/gu),
      ).map((match) => match[1]);

      if (directItemMatches.length > 0) {
        directItemMatches.forEach(addItem);
        return;
      }

      addItem(token);
    });

  return items;
}


function parseManualGroupingColumns(
  textValue: string,
  availableColumns: string[],
): string[] {
  const requested = String(textValue || '')
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return uniqueStrings(
    requested
      .map((requestedColumn) => resolveManualColumnName(requestedColumn, availableColumns))
      .filter(Boolean) as string[],
  );
}

function resolveManualColumnName(
  requestedColumn: string,
  availableColumns: string[],
): string | null {
  const requested = String(requestedColumn || '').trim();
  if (!requested) return null;

  const exact = availableColumns.find((column) => column === requested);
  if (exact) return exact;

  const normalizedRequested = normalizeText(requested);

  const normalizedExact = availableColumns.find(
    (column) => normalizeText(column) === normalizedRequested,
  );

  if (normalizedExact) return normalizedExact;

  const partial = availableColumns.find((column) =>
    normalizeText(column).includes(normalizedRequested),
  );

  if (partial) return partial;

  return null;
}


function buildQuestionnaireScaleDefinitions(
  numericColumns: string[],
  options: StatisticalAnalysisOptions = {},
): {
  scales: ScaleDefinition[];
  combinedScales: CombinedScaleDefinition[];
} {
  const configCustom = options.questionnaireConfig?.customQuestionnaires ?? [];
  const directCustom = options.customQuestionnaires ?? [];
  const customQuestionnaires = [...configCustom, ...directCustom];

  const scales: ScaleDefinition[] = [];
  const combinedScales: CombinedScaleDefinition[] = [];

  customQuestionnaires.forEach((questionnaire, questionnaireIndex) => {
    const questionnaireId = normalizeQuestionnaireId(
      questionnaire.id || questionnaire.questionnaireId || `custom_${questionnaireIndex + 1}`,
    );
    const questionnaireName =
      String(questionnaire.name || questionnaire.questionnaireName || questionnaireId || 'Vlastný dotazník').trim();
    const minValue = questionnaire.responseMin ?? 1;
    const maxValue = questionnaire.responseMax ?? 5;
    const scoring = questionnaire.scoring ?? 'mean';

    [...(questionnaire.scales ?? []), ...(questionnaire.subscales ?? [])]
      .forEach((scale, scaleIndex) => {
        const items = (scale.items ?? []).filter((item) =>
          resolveItemColumn(item, numericColumns),
        );

        if (!items.length) return;

        scales.push({
          id: normalizeQuestionnaireId(
            scale.id || `${questionnaireId}_scale_${scaleIndex + 1}`,
          ),
          name: String(scale.name || `${questionnaireName} – škála ${scaleIndex + 1}`),
          items,
          reverseItems: scale.reverseItems ?? [],
          minValue: scale.minValue ?? minValue,
          maxValue: scale.maxValue ?? maxValue,
          scoring: scale.scoring ?? scoring,
          description: scale.description || `Manuálne zadaná škála z dotazníka ${questionnaireName}.`,
        });
      });

    (questionnaire.combinedScales ?? []).forEach((combined, combinedIndex) => {
      const scaleIds = (combined.scaleIds ?? [])
        .map(normalizeQuestionnaireId)
        .filter(Boolean);

      if (scaleIds.length < 2) return;

      combinedScales.push({
        id: normalizeQuestionnaireId(
          combined.id || `${questionnaireId}_combined_${combinedIndex + 1}`,
        ),
        name: String(combined.name || `${questionnaireName} – kombinovaná škála ${combinedIndex + 1}`),
        scaleIds,
        scoring: combined.scoring ?? scoring,
        description: combined.description,
      });
    });
  });

  return {
    scales,
    combinedScales,
  };
}

/* -------------------------------------------------------------------------- */
/* AUTOMATICKÁ DETEKCIA ŠKÁL                                                   */
/* -------------------------------------------------------------------------- */

function autoDetectScaleDefinitions(
  numericColumns: string[],
  options: StatisticalAnalysisOptions = {},
): ScaleDefinition[] {
  const scales: ScaleDefinition[] = [];

  const normalizedColumns = numericColumns.map((column) => ({
    original: column,
    normalized: normalizeText(column),
  }));

  const allowSembu = shouldComputeQuestionnaire('sembu', options);
  const allowSchoolInclusion = shouldComputeQuestionnaire('school_inclusion', options);
  const allowWorkEngagement = shouldComputeQuestionnaire('work_engagement', options);
  const allowGeneric = shouldInferGenericScales(options);

  const wemItems = normalizedColumns
    .filter((item) => /^wem\d+$/.test(item.normalized) || /^wemwbs\d+$/.test(item.normalized))
    .map((item) => item.original);

  if (shouldComputeQuestionnaire('wemwbs', options) && wemItems.length >= 3) {
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

  if (shouldComputeQuestionnaire('jss', options) && jssItems.length >= 3) {
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

  if (shouldComputeQuestionnaire('jss', options) && jssItems.length >= 3) {
    const jssSubscales: Array<{
      id: string;
      name: string;
      itemNumbers: number[];
    }> = [
      {
        id: 'jss_pay',
        name: 'JSS – Mzda',
        itemNumbers: [1, 10, 19, 28],
      },
      {
        id: 'jss_promotion',
        name: 'JSS – Povýšenie',
        itemNumbers: [2, 11, 20, 33],
      },
      {
        id: 'jss_supervision',
        name: 'JSS – Vedenie / nadriadený',
        itemNumbers: [3, 12, 21, 30],
      },
      {
        id: 'jss_benefits',
        name: 'JSS – Benefity',
        itemNumbers: [4, 13, 22, 29],
      },
      {
        id: 'jss_rewards',
        name: 'JSS – Odmeny',
        itemNumbers: [5, 14, 23, 32],
      },
      {
        id: 'jss_operating_conditions',
        name: 'JSS – Pracovné podmienky',
        itemNumbers: [6, 15, 24, 31],
      },
      {
        id: 'jss_coworkers',
        name: 'JSS – Spolupracovníci',
        itemNumbers: [7, 16, 25, 34],
      },
      {
        id: 'jss_nature_of_work',
        name: 'JSS – Povaha práce',
        itemNumbers: [8, 17, 27, 35],
      },
      {
        id: 'jss_communication',
        name: 'JSS – Komunikácia',
        itemNumbers: [9, 18, 26, 36],
      },
    ];

    for (const subscale of jssSubscales) {
      const items = findColumnsByItemNumbers(jssItems, subscale.itemNumbers);

      if (items.length >= 2) {
        scales.push({
          id: subscale.id,
          name: subscale.name,
          items,
          minValue: 1,
          maxValue: 6,
          scoring: 'sum',
          description: `JSS subškála: ${subscale.name}. Položky: ${subscale.itemNumbers.join(', ')}.`,
        });
      }
    }
  }

  const fatherColumns = allowSembu ? numericColumns.filter((column) => {
    const n = normalizeText(column);
    return (
      n.includes('sembuotec') ||
      n.includes('embuotec') ||
      n.includes('otec') ||
      n.includes('father') ||
      n.includes('otc')
    );
  }) : [];

  const motherColumns = allowSembu ? numericColumns.filter((column) => {
    const n = normalizeText(column);
    return (
      n.includes('sembumatka') ||
      n.includes('embumatka') ||
      n.includes('matka') ||
      n.includes('mother') ||
      n.includes('mat')
    );
  }) : [];

  const schoolInclusionColumns = allowSchoolInclusion ? numericColumns.filter((column) => {
    const n = normalizeText(column);
    return (
      n.includes('skolskazaclenenost') ||
      n.includes('skolskejzaclenenosti') ||
      n.includes('zaclenen') ||
      n.includes('zaclenenie') ||
      n.includes('skola') ||
      n.includes('school') ||
      n.includes('inclusion') ||
      /^si\d+$/.test(n)
    );
  }) : [];

  const fatherRejection = findColumnsByItemNumbers(fatherColumns, [1, 4, 7, 13, 15, 16, 21]);
  const fatherWarmth = findColumnsByItemNumbers(fatherColumns, [2, 6, 12, 14, 19, 23]);
  const fatherOverprotection = findColumnsByItemNumbers(fatherColumns, [3, 5, 8, 10, 11, 17, 18, 20, 22]);
  const fatherOverprotectionReverse = findColumnsByItemNumbers(fatherColumns, [17]);

  if (fatherRejection.length >= 2) {
    scales.push({
      id: 'sembu_father_rejection',
      name: 's-EMBU Otec – Odmietanie',
      items: fatherRejection,
      minValue: 1,
      maxValue: 4,
      scoring: 'sum',
      description: 'Súčet položiek 1, 4, 7, 13, 15, 16, 21.',
    });
  }

  if (fatherWarmth.length >= 2) {
    scales.push({
      id: 'sembu_father_warmth',
      name: 's-EMBU Otec – Emočná vrelosť',
      items: fatherWarmth,
      minValue: 1,
      maxValue: 4,
      scoring: 'sum',
      description: 'Súčet položiek 2, 6, 12, 14, 19, 23.',
    });
  }

  if (fatherOverprotection.length >= 2) {
    scales.push({
      id: 'sembu_father_overprotection',
      name: 's-EMBU Otec – Hyperprotektivita',
      items: fatherOverprotection,
      reverseItems: fatherOverprotectionReverse,
      minValue: 1,
      maxValue: 4,
      scoring: 'sum',
      description: 'Súčet položiek 3, 5, 8, 10, 11, 17R, 18, 20, 22.',
    });
  }

  const motherRejection = findColumnsByItemNumbers(motherColumns, [1, 4, 7, 13, 15, 16, 21]);
  const motherWarmth = findColumnsByItemNumbers(motherColumns, [2, 6, 12, 14, 19, 23]);
  const motherOverprotection = findColumnsByItemNumbers(motherColumns, [3, 5, 8, 10, 11, 17, 18, 20, 22]);
  const motherOverprotectionReverse = findColumnsByItemNumbers(motherColumns, [17]);

  if (motherRejection.length >= 2) {
    scales.push({
      id: 'sembu_mother_rejection',
      name: 's-EMBU Matka – Odmietanie',
      items: motherRejection,
      minValue: 1,
      maxValue: 4,
      scoring: 'sum',
      description: 'Súčet položiek 1, 4, 7, 13, 15, 16, 21.',
    });
  }

  if (motherWarmth.length >= 2) {
    scales.push({
      id: 'sembu_mother_warmth',
      name: 's-EMBU Matka – Emočná vrelosť',
      items: motherWarmth,
      minValue: 1,
      maxValue: 4,
      scoring: 'sum',
      description: 'Súčet položiek 2, 6, 12, 14, 19, 23.',
    });
  }

  if (motherOverprotection.length >= 2) {
    scales.push({
      id: 'sembu_mother_overprotection',
      name: 's-EMBU Matka – Hyperprotektivita',
      items: motherOverprotection,
      reverseItems: motherOverprotectionReverse,
      minValue: 1,
      maxValue: 4,
      scoring: 'sum',
      description: 'Súčet položiek 3, 5, 8, 10, 11, 17R, 18, 20, 22.',
    });
  }

  const schoolAcceptance = findColumnsByItemNumbers(schoolInclusionColumns, [1, 3, 5, 7, 9]);
  const schoolExclusion = findColumnsByItemNumbers(schoolInclusionColumns, [2, 4, 6, 8, 10]);

  if (schoolAcceptance.length >= 2) {
    scales.push({
      id: 'school_social_acceptance',
      name: 'Škála školskej začlenenosti – sociálna akceptácia',
      items: schoolAcceptance,
      minValue: 1,
      maxValue: 4,
      scoring: 'sum',
      description: 'Súčet položiek 1, 3, 5, 7, 9.',
    });
  }

  if (schoolExclusion.length >= 2) {
    scales.push({
      id: 'school_social_exclusion_reversed',
      name: 'Škála školskej začlenenosti – sociálne vylúčenie reverzne',
      items: schoolExclusion,
      reverseItems: schoolExclusion,
      minValue: 1,
      maxValue: 4,
      scoring: 'sum',
      description: 'Reverzne kódovaný súčet položiek 2R, 4R, 6R, 8R, 10R.',
    });
  }


  const workEngagement = allowWorkEngagement
    ? detectWorkEngagementColumns(numericColumns)
    : { energy: [], meaningDedication: [], absorption: [], total: [] };

  if (workEngagement.energy.length >= 2) {
    scales.push({
      id: 'work_engagement_energy',
      name: 'Pracovné zapojenie – energia',
      items: workEngagement.energy,
      minValue: 1,
      maxValue: 5,
      scoring: 'mean',
      description:
        'Priemer položiek: V práci sa cítim plný energie; V práci sa cítim silný a plný energie.',
    });
  }

  if (workEngagement.meaningDedication.length >= 2) {
    scales.push({
      id: 'work_engagement_meaning_dedication',
      name: 'Pracovné zapojenie – zmysluplnosť a nadšenie',
      items: workEngagement.meaningDedication,
      minValue: 1,
      maxValue: 5,
      scoring: 'mean',
      description:
        'Priemer položiek: Práca, ktorú vykonávam, považujem za zmysluplnú; Som nadšený zo svojej práce.',
    });
  }

  if (workEngagement.absorption.length >= 1) {
    scales.push({
      id: 'work_engagement_absorption',
      name: 'Pracovné zapojenie – absorpcia',
      items: workEngagement.absorption,
      minValue: 1,
      maxValue: 5,
      scoring: 'mean',
      description:
        'Položka: Keď pracujem, čas rýchlo letí. Pri jednej položke sa Cronbachovo alfa nevypočítava.',
    });
  }

  if (workEngagement.total.length >= 3) {
    scales.push({
      id: 'work_engagement_total',
      name: 'Pracovné zapojenie – celkové skóre',
      items: workEngagement.total,
      minValue: 1,
      maxValue: 5,
      scoring: 'mean',
      description:
        'Priemer piatich položiek pracovného zapojenia na škále 1–5.',
    });
  }



  const specificItems = new Set(
    scales.flatMap((scale) => scale.items.map((item) => String(item))),
  );

  const genericScales = allowGeneric
    ? inferGenericScaleDefinitions(
        numericColumns.filter((column) => !specificItems.has(column)),
      )
    : [];

  for (const genericScale of genericScales) {
    if (!scales.some((scale) => scale.id === genericScale.id)) {
      scales.push(genericScale);
    }
  }

  return scales.filter((scale) => scale.items.length >= 1);
}


function inferGenericScaleDefinitions(numericColumns: string[]): ScaleDefinition[] {
  const grouped = new Map<string, { label: string; columns: string[] }>();

  for (const column of numericColumns) {
    if (isIdColumnName(column)) continue;

    const itemNumber = extractQuestionnaireItemNumber(column) ?? extractFirstNumber(column);
    if (itemNumber === null) continue;

    const prefix = inferScalePrefix(column, itemNumber);
    if (!prefix) continue;

    const key = slugify(prefix);
    if (!key || key === 'variable' || key.length < 2) continue;

    const current = grouped.get(key) ?? {
      label: prefix,
      columns: [],
    };

    if (!current.columns.includes(column)) {
      current.columns.push(column);
    }

    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .filter(([, group]) => group.columns.length >= 3)
    .map(([key, group]) => {
      const reverseItems = group.columns.filter((column) => looksReverseCodedColumn(column));

      return {
        id: `auto_${key}_total`,
        name: `${group.label} – celkové skóre`,
        items: group.columns,
        reverseItems,
        minValue: 1,
        maxValue: 5,
        scoring: 'sum',
        description:
          reverseItems.length > 0
            ? 'Automaticky rozpoznaná všeobecná škála. Položky označené R/reverzne boli reverzne kódované.'
            : 'Automaticky rozpoznaná všeobecná škála podľa spoločného názvu položiek.',
      } satisfies ScaleDefinition;
    });
}

function inferScalePrefix(columnName: string, itemNumber: number): string {
  const raw = String(columnName || '').trim();

  const textualPatterns = [
    new RegExp(`^(.*?)(?:[-–—:])?\\s*(?:položka|polozka|otázka|otazka|item|question)\\s*${itemNumber}.*$`, 'i'),
    new RegExp(`^(.*?)(?:[-–—:])?\\s*${itemNumber}\\s*(?:r)?(?:\\s*[:.)-–—].*)?$`, 'i'),
  ];

  for (const pattern of textualPatterns) {
    const match = raw.match(pattern);
    const prefix = match?.[1]?.trim();
    if (prefix && prefix.length >= 2) return cleanScaleLabel(prefix);
  }

  const normalized = normalizeText(raw);
  const compactPatterns = [
    new RegExp(`^([a-z]+)${itemNumber}r?$`),
    new RegExp(`^([a-z]+)0*${itemNumber}r?$`),
  ];

  for (const pattern of compactPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }

  if (isQuestionnaireItemColumn(raw)) {
    return raw
      .replace(/(?:položka|polozka|otázka|otazka|item|question)\s*\d+.*/i, '')
      .replace(/[-–—:]+$/g, '')
      .trim();
  }

  return '';
}

function cleanScaleLabel(value: string): string {
  const cleaned = String(value || '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[-–—:]+$/g, '')
    .trim();

  if (!cleaned) return 'Automatická škála';

  return cleaned;
}

function looksReverseCodedColumn(columnName: string): boolean {
  const raw = String(columnName || '').trim();
  const normalized = normalizeText(raw);

  return (
    /(^|\D)r($|\D)/i.test(raw) ||
    /\d+\s*r\b/i.test(raw) ||
    normalized.includes('reverzne') ||
    normalized.includes('reverse') ||
    normalized.endsWith('r')
  );
}


function detectWorkEngagementColumns(numericColumns: string[]): {
  energy: string[];
  meaningDedication: string[];
  absorption: string[];
  total: string[];
} {
  const findFirst = (patterns: string[]): string | null => {
    return (
      numericColumns.find((column) => {
        const normalized = normalizeText(column);

        return patterns.every((pattern) => normalized.includes(normalizeText(pattern)));
      }) || null
    );
  };

  const energyPrimary = findFirst(['plny', 'energie']);
  const energyStrong = findFirst(['silny', 'plny', 'energie']);
  const meaningfulWork = findFirst(['praca', 'vykonavam', 'zmysluplnu']);
  const timeFlies = findFirst(['cas', 'rychlo', 'leti']);
  const enthusiasm = findFirst(['nadseny', 'prace']);

  const energy = uniqueStrings([
    energyPrimary,
    energyStrong,
  ].filter(Boolean) as string[]);

  const meaningDedication = uniqueStrings([
    meaningfulWork,
    enthusiasm,
  ].filter(Boolean) as string[]);

  const absorption = uniqueStrings([
    timeFlies,
  ].filter(Boolean) as string[]);

  const total = uniqueStrings([
    ...energy,
    ...meaningDedication,
    ...absorption,
  ]);

  return {
    energy,
    meaningDedication,
    absorption,
    total,
  };
}


function autoDetectCombinedScaleDefinitions(
  scales: ScaleDefinition[],
  options: StatisticalAnalysisOptions = {},
): CombinedScaleDefinition[] {
  const ids = new Set(scales.map((scale) => scale.id));
  const combined: CombinedScaleDefinition[] = [];

  const allowSembu = shouldComputeQuestionnaire('sembu', options);
  const allowSchoolInclusion = shouldComputeQuestionnaire('school_inclusion', options);

  if (allowSembu && ids.has('sembu_father_rejection') && ids.has('sembu_mother_rejection')) {
    combined.push({
      id: 'sembu_total_rejection',
      name: 's-EMBU Celkom – Odmietanie',
      scaleIds: ['sembu_father_rejection', 'sembu_mother_rejection'],
      scoring: 'sum',
    });
  }

  if (allowSembu && ids.has('sembu_father_warmth') && ids.has('sembu_mother_warmth')) {
    combined.push({
      id: 'sembu_total_warmth',
      name: 's-EMBU Celkom – Emočná vrelosť',
      scaleIds: ['sembu_father_warmth', 'sembu_mother_warmth'],
      scoring: 'sum',
    });
  }

  if (allowSembu && ids.has('sembu_father_overprotection') && ids.has('sembu_mother_overprotection')) {
    combined.push({
      id: 'sembu_total_overprotection',
      name: 's-EMBU Celkom – Hyperprotektivita',
      scaleIds: ['sembu_father_overprotection', 'sembu_mother_overprotection'],
      scoring: 'sum',
    });
  }

  if (allowSchoolInclusion && ids.has('school_social_acceptance') && ids.has('school_social_exclusion_reversed')) {
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
  const used = new Set<string>();

  return itemNumbers
    .map((number) => {
      const exact = columns.find((column) => {
        if (used.has(column)) return false;

        return extractQuestionnaireItemNumber(column) === number;
      });

      if (exact) {
        used.add(exact);
        return exact;
      }

      const fallback = columns.find((column) => {
        if (used.has(column)) return false;

        const normalized = normalizeText(column);

        return (
          normalized.includes(`polozka${number}`) ||
          normalized.includes(`pol${number}`) ||
          normalized.includes(`item${number}`) ||
          normalized.includes(`otazka${number}`) ||
          normalized.endsWith(String(number))
        );
      });

      if (fallback) {
        used.add(fallback);
        return fallback;
      }

      return null;
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
      method: 'approx-shapiro-wilk',
      statistic: null,
      pValue: null,
      pValueText: null,
      isNormal: null,
      recommendation: 'not-enough-data',
      note: 'Na posúdenie normality nie je dostatok dát.',
    };
  }

  const shapiro = approximateShapiroWilk(values);
  const pValue = shapiro.pValue;
  const skew = skewness(values);
  const kurt = kurtosis(values);

  const isNormal =
    pValue !== null &&
    pValue >= alpha &&
    Math.abs(skew) < 2 &&
    Math.abs(kurt) < 7;

  return {
    variable,
    valid: values.length,
    method: 'approx-shapiro-wilk',
    statistic: shapiro.statistic,
    pValue,
    pValueText: formatPValue(pValue),
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

function buildNormalityLookup(normality: NormalityResult[]): Map<string, boolean> {
  const lookup = new Map<string, boolean>();

  normality.forEach((item) => {
    if (item.isNormal !== null) {
      lookup.set(item.variable, item.isNormal === true);
    }
  });

  return lookup;
}

function isVariableNormal(
  variableName: string,
  normalityLookup: Map<string, boolean>,
): boolean {
  return normalityLookup.get(variableName) === true;
}

function calculateRecommendedCorrelationsByNormality(
  scaleScores: ScaleScoreResult[],
  normality: NormalityResult[],
): CorrelationResult[] {
  const normalityLookup = buildNormalityLookup(normality);
  const results: CorrelationResult[] = [];

  for (let i = 0; i < scaleScores.length; i++) {
    for (let j = i + 1; j < scaleScores.length; j++) {
      const first = scaleScores[i];
      const second = scaleScores[j];

      const method: CorrelationMethod =
        isVariableNormal(first.scaleName, normalityLookup) &&
        isVariableNormal(second.scaleName, normalityLookup)
          ? 'pearson'
          : 'spearman';

      results.push(
        calculateCorrelation(
          first.scaleName,
          first.scores,
          second.scaleName,
          second.scores,
          method,
        ),
      );
    }
  }

  return results;
}


function approximateShapiroWilk(values: number[]): {
  statistic: number | null;
  pValue: number | null;
} {
  const clean = values.filter(isFiniteNumber).sort((a, b) => a - b);
  const n = clean.length;

  if (n < 3) {
    return {
      statistic: null,
      pValue: null,
    };
  }

  const meanValue = mean(clean);
  const centeredSquareSum = clean.reduce(
    (acc, value) => acc + Math.pow(value - meanValue, 2),
    0,
  );

  if (centeredSquareSum === 0) {
    return {
      statistic: 1,
      pValue: 1,
    };
  }

  /**
   * Praktická aproximácia Shapiro-Wilk:
   * - vypočíta očakávané normálne poradia,
   * - vytvorí váhy podobné Shapiro-Wilk testu,
   * - W je pomer vysvetlenej normálovej zložky k celkovej variabilite.
   *
   * Poznámka:
   * Bez špecializovanej knižnice ide o aproximačný výpočet vhodný pre report,
   * nie o úplnú náhradu JASP/R. Preto v UI odporúčame zobrazovať názov
   * "Shapiro-Wilk aproximácia".
   */
  const expectedNormalOrderStats = clean.map((_, index) => {
    const rank = index + 1;
    const probability = (rank - 0.375) / (n + 0.25);
    return inverseNormalCdf(probability);
  });

  const normalizer = Math.sqrt(
    expectedNormalOrderStats.reduce((acc, value) => acc + value * value, 0),
  );

  if (normalizer === 0) {
    return {
      statistic: null,
      pValue: null,
    };
  }

  const weights = expectedNormalOrderStats.map((value) => value / normalizer);
  const weightedSum = clean.reduce((acc, value, index) => acc + weights[index] * value, 0);
  const w = Math.pow(weightedSum, 2) / centeredSquareSum;

  const boundedW = Math.max(0.000001, Math.min(0.999999, w));

  /**
   * p-hodnota je aproximovaná cez kombináciu:
   * - odchýlky W od 1,
   * - šikmosti,
   * - špicatosti.
   *
   * Cieľ je praktické rozhodnutie: p >= 0.05 približne normálne,
   * p < 0.05 normalita nepotvrdená.
   */
  const skew = Math.abs(skewness(clean));
  const kurt = Math.abs(kurtosis(clean));
  const departure = Math.max(0, 1 - boundedW);
  const z =
    Math.sqrt(n) * departure * 6 +
    Math.max(0, skew - 0.5) * 0.9 +
    Math.max(0, kurt - 1) * 0.25;

  const pValue = Math.max(0.001, Math.min(1, 1 - normalCdf(z)));

  return {
    statistic: round3(boundedW),
    pValue: roundP(pValue),
  };
}

function inverseNormalCdf(probability: number): number {
  const p = Math.max(1e-12, Math.min(1 - 1e-12, probability));

  /**
   * Peter J. Acklam aproximácia inverznej normálovej distribúcie.
   */
  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239,
  ];

  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];

  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ];

  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416,
  ];

  const low = 0.02425;
  const high = 1 - low;

  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  if (p > high) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  const q = p - 0.5;
  const r = q * q;

  return (
    (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
    q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
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
      pValueText: null,
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
      pValueText: null,
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
    pValueText: formatPValue(pValue),
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
    pValueText: formatPValue(pValue),
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
    pValueText: formatPValue(pValue),
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
    pValueText: formatPValue(pValue),
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
    pValueText: formatPValue(pValue),
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
/* EXPORTNÉ ALIASY, SKÓRE, MATICA A GRAFY                                     */
/* -------------------------------------------------------------------------- */

function buildScaleScoreRowsForExport(
  scaleScores: ScaleScoreResult[],
  respondentCount: number,
): ScaleScoreExportRow[] {
  const maxRows = Math.max(
    respondentCount,
    ...scaleScores.map((scale) => scale.scores.length),
    0,
  );

  const rows: ScaleScoreExportRow[] = [];

  for (let index = 0; index < maxRows; index += 1) {
    const row: ScaleScoreExportRow = {
      respondentIndex: index + 1,
    };

    for (const scale of scaleScores) {
      row[scale.scaleName] = scale.scores[index] ?? null;
    }

    rows.push(row);
  }

  return rows;
}

function buildCorrelationMatrix(
  correlations: CorrelationResult[],
): CorrelationMatrixRow[] {
  const variables = uniqueStrings(
    correlations.flatMap((item) => [item.variableA, item.variableB]),
  );

  return variables.map((variable) => {
    const row: CorrelationMatrixRow = { variable };

    for (const otherVariable of variables) {
      if (variable === otherVariable) {
        row[otherVariable] = 1;
        continue;
      }

      const found = correlations.find(
        (item) =>
          (item.variableA === variable && item.variableB === otherVariable) ||
          (item.variableA === otherVariable && item.variableB === variable),
      );

      row[otherVariable] = found?.r ?? null;
    }

    return row;
  });
}

function buildAnalysisChartData(input: {
  frequencies: FrequencyAnalysisResult[];
  itemDescriptives: DescriptiveStatisticsResult[];
  scaleScores: ScaleScoreResult[];
  scaleDescriptives: DescriptiveStatisticsResult[];
  normality: NormalityResult[];
  reliability: ReliabilityResult[];
  correlations: CorrelationResult[];
  groupTests?: GroupTestResult[];
  scaleDefinitions: ScaleDefinition[];
  combinedScaleDefinitions: CombinedScaleDefinition[];
}): AnalysisChartData {
  const frequencyBars = input.frequencies
    .flatMap((frequency) =>
      frequency.values.map((value) => ({
        label: `${frequency.variable}: ${value.value}`,
        value: value.count,
        group: frequency.variable,
        description: `${value.validPercent.toFixed(1)} % validných odpovedí`,
      })),
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  const preferredDescriptives = input.scaleDescriptives.length > 0
    ? input.scaleDescriptives
    : input.itemDescriptives;

  const meanBars = preferredDescriptives
    .filter((item) => isFiniteNumber(item.mean))
    .map((item) => ({
      label: item.variable,
      value: item.mean ?? 0,
      description: `N=${item.valid}, SD=${item.standardDeviation ?? '—'}, missing=${item.missing}`,
    }))
    .slice(0, 50);

  const combinedNames = new Set(input.combinedScaleDefinitions.map((scale) => scale.name));
  const totalLikeNames = new Set(
    input.scaleDefinitions
      .filter((scale) => /celkov|total|overall/i.test(scale.name) || /total/i.test(scale.id))
      .map((scale) => scale.name),
  );

  const isSubscaleName = (name: string): boolean => {
    if (combinedNames.has(name)) return true;
    if (/subšk|subsk|subscale/i.test(name)) return true;
    if (/energia|zmyslupl|nadšen|nadsen|absorp|odmiet|vrelosť|vrelost|hyperprotekt|akcept|vylúčen|vylucen/i.test(name)) return true;
    return !totalLikeNames.has(name) && !/celkov|total|overall/i.test(name);
  };

  const scaleScoreBars = input.scaleDescriptives
    .filter((item) => isFiniteNumber(item.mean) && !isSubscaleName(item.variable))
    .map((item) => ({
      label: item.variable,
      value: item.mean ?? 0,
      description: `Priemer škály, N=${item.valid}, SD=${item.standardDeviation ?? '—'}`,
    }))
    .slice(0, 40);

  const subscaleScoreBars = input.scaleDescriptives
    .filter((item) => isFiniteNumber(item.mean) && isSubscaleName(item.variable))
    .map((item) => ({
      label: item.variable,
      value: item.mean ?? 0,
      description: `Priemer subškály, N=${item.valid}, SD=${item.standardDeviation ?? '—'}`,
    }))
    .slice(0, 40);

  const reliabilityBars = input.reliability
    .filter((item) => isFiniteNumber(item.cronbachAlpha))
    .map((item) => ({
      label: item.scaleName,
      value: item.cronbachAlpha === null ? 0 : round3(item.cronbachAlpha * 100),
      description: `Cronbachovo alfa = ${item.cronbachAlpha}`,
    }));

  const correlationBars = input.correlations
    .filter((item) => isFiniteNumber(item.r))
    .map((item) => ({
      label: `${item.variableA} × ${item.variableB}`,
      value: item.r === null ? 0 : round3(Math.abs(item.r)),
      description: `${item.method}, r=${item.r}, p=${item.pValueText ?? item.pValue ?? '—'}`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  const normalityBars = input.normality
    .filter((item) => isFiniteNumber(item.pValue))
    .map((item) => ({
      label: item.variable,
      value: item.pValue === null ? 0 : item.pValue,
      description: item.note,
    }));

  const missingValueBars = [...input.itemDescriptives, ...input.scaleDescriptives]
    .filter((item) => item.missing > 0)
    .map((item) => ({
      label: item.variable,
      value: item.missing,
      description: `Chýbajúce údaje: ${item.missing}, validné údaje: ${item.valid}`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  return {
    frequencyBars,
    meanBars,
    scaleScoreBars,
    subscaleScoreBars,
    reliabilityBars,
    correlationBars,
    normalityBars,
    groupTestBars: [],

    missingValueBars,
  };
}

function buildAnalysisChartTables(chartData: AnalysisChartData): AnalysisChartTable[] {
  return [
    {
      key: 'chart-frequency-bars',
      title: 'Graf – frekvencie',
      rows: chartData.frequencyBars.map(chartPointToRow),
    },
    {
      key: 'chart-mean-bars',
      title: 'Graf – priemery škál/položiek',
      rows: chartData.meanBars.map(chartPointToRow),
    },
    {
      key: 'chart-scale-score-bars',
      title: 'Graf – priemery celkových škál',
      rows: chartData.scaleScoreBars.map(chartPointToRow),
    },
    {
      key: 'chart-subscale-score-bars',
      title: 'Graf – priemery subškál',
      rows: chartData.subscaleScoreBars.map(chartPointToRow),
    },
    {
      key: 'chart-reliability-bars',
      title: 'Graf – reliabilita',
      rows: chartData.reliabilityBars.map(chartPointToRow),
    },
    {
      key: 'chart-correlation-bars',
      title: 'Graf – korelácie',
      rows: chartData.correlationBars.map(chartPointToRow),
    },
    {
      key: 'chart-normality-bars',
      title: 'Graf – normalita',
      rows: chartData.normalityBars.map(chartPointToRow),
    },
    {
      key: 'chart-missing-value-bars',
      title: 'Graf – chýbajúce údaje',
      rows: chartData.missingValueBars.map(chartPointToRow),
    },
  ].filter((table) => table.rows.length > 0);
}

function chartPointToRow(point: ChartDataPoint): Record<string, RawValue> {
  return {
    label: point.label,
    value: point.value,
    group: point.group ?? null,
    description: point.description ?? null,
  };
}

function flattenFrequenciesForExport(
  frequencies: FrequencyAnalysisResult[],
): Array<Record<string, RawValue>> {
  return frequencies.flatMap((frequency) => [
    ...frequency.values.map((value) => ({
      variable: frequency.variable,
      valid: frequency.valid,
      missing: frequency.missing,
      total: frequency.total,
      value: value.value,
      count: value.count,
      percent: value.percent,
      validPercent: value.validPercent,
      cumulativePercent: value.cumulativePercent,
    })),
    {
      variable: frequency.variable,
      valid: frequency.valid,
      missing: frequency.missing,
      total: frequency.total,
      value: 'Missing',
      count: frequency.missing,
      percent: frequency.total > 0 ? round3((frequency.missing / frequency.total) * 100) : 0,
      validPercent: null,
      cumulativePercent: null,
    },
    {
      variable: frequency.variable,
      valid: frequency.valid,
      missing: frequency.missing,
      total: frequency.total,
      value: 'Total',
      count: frequency.total,
      percent: 100,
      validPercent: null,
      cumulativePercent: null,
    },
  ]);
}

function scaleScoresToDefinitionRows(
  scaleScores: ScaleScoreResult[],
): Array<Record<string, RawValue>> {
  return scaleScores.map((scale) => ({
    scaleId: scale.scaleId,
    scaleName: scale.scaleName,
    itemsUsed: scale.itemsUsed.join(', '),
    itemCount: scale.itemsUsed.length,
    scoring: scale.scoring,
    missingRows: scale.missingRows,
  }));
}

function scaleDefinitionsToRows(
  scales: ScaleDefinition[],
): Array<Record<string, RawValue>> {
  return scales.map((scale) => ({
    scaleId: scale.id,
    scaleName: scale.name,
    itemCount: scale.items.length,
    items: scale.items.map(String).join(', '),
    reverseItems: (scale.reverseItems ?? []).map(String).join(', '),
    minValue: scale.minValue ?? null,
    maxValue: scale.maxValue ?? null,
    scoring: scale.scoring ?? 'sum',
    description: scale.description ?? null,
  }));
}

function combinedScaleDefinitionsToRows(
  combinedScales: CombinedScaleDefinition[],
): Array<Record<string, RawValue>> {
  return combinedScales.map((scale) => ({
    subscaleId: scale.id,
    subscaleName: scale.name,
    sourceScaleIds: scale.scaleIds.join(', '),
    sourceScaleCount: scale.scaleIds.length,
    scoring: scale.scoring ?? 'sum',
    description: scale.description ?? null,
  }));
}

function missingDataToRows(
  itemDescriptives: DescriptiveStatisticsResult[],
  scaleDescriptives: DescriptiveStatisticsResult[],
): Array<Record<string, RawValue>> {
  return [...itemDescriptives, ...scaleDescriptives]
    .filter((item) => item.missing > 0)
    .map((item) => ({
      variable: item.variable,
      valid: item.valid,
      missing: item.missing,
      missingPercent:
        item.valid + item.missing > 0
          ? round3((item.missing / (item.valid + item.missing)) * 100)
          : 0,
    }));
}

function correlationsToRows(correlations: CorrelationResult[]): Array<Record<string, RawValue>> {
  return correlations.map((item) => ({
    variableA: item.variableA,
    variableB: item.variableB,
    method: item.method,
    n: item.n,
    r: item.r,
    pValue: item.pValue,
    pValueText: item.pValueText ?? null,
    significance: item.significance,
    fisherZ: item.fisherZ,
    standardError: item.standardError,
    interpretation: item.interpretation,
  }));
}

function groupTestsToRows(groupTests: GroupTestResult[]): Array<Record<string, RawValue>> {
  return groupTests.map((item) => ({
    dependentVariable: item.dependentVariable,
    groupVariable: item.groupVariable,
    testType: item.testType,
    groups: item.groups.join(' / '),
    nTotal: item.nTotal,
    statistic: item.statistic,
    pValue: item.pValue,
    pValueText: item.pValueText ?? null,
    significance: item.significance,
    recommendation: item.recommendation,
  }));
}

function buildAnalysisAliases(input: {
  frequencies: FrequencyAnalysisResult[];
  itemDescriptives: DescriptiveStatisticsResult[];
  scaleScores: ScaleScoreResult[];
  scaleDescriptives: DescriptiveStatisticsResult[];
  normality: NormalityResult[];
  reliability: ReliabilityResult[];
  pearson: CorrelationResult[];
  spearman: CorrelationResult[];
  recommendedCorrelations: CorrelationResult[];
  correlationMatrix: CorrelationMatrixRow[];
  parametricGroupTests: GroupTestResult[];
  nonParametricGroupTests: GroupTestResult[];
  recommendedGroupTests: GroupTestResult[];
  chartData: AnalysisChartData;
  chartTables: AnalysisChartTable[];
  scaleDefinitions: ScaleDefinition[];
  combinedScaleDefinitions: CombinedScaleDefinition[];
  scaleScoreRows: ScaleScoreExportRow[];
}): Record<string, unknown> {
  const frequencyRows = flattenFrequenciesForExport(input.frequencies);
  const pearsonRows = correlationsToRows(input.pearson);
  const spearmanRows = correlationsToRows(input.spearman);
  const recommendedCorrelationRows = correlationsToRows(input.recommendedCorrelations);
  const allCorrelationRows = [
    ...pearsonRows.map((row) => ({ ...row, odporúčané: false, skupina_testov: 'parametrické' })),
    ...spearmanRows.map((row) => ({ ...row, odporúčané: false, skupina_testov: 'neparametrické' })),
  ];

  const recommendedCorrelationKeys = new Set(
  recommendedCorrelationRows.map((row) => {
    const safeRow = row as Record<string, unknown>;

    return [
      String(safeRow['premenná_1'] ?? safeRow['variableA'] ?? ''),
      String(safeRow['premenná_2'] ?? safeRow['variableB'] ?? ''),
      String(safeRow['metóda'] ?? safeRow['method'] ?? ''),
    ].join('||');
  }),
);

 const allCorrelationRowsWithRecommendation = allCorrelationRows.map((row) => {
  const safeRow = row as Record<string, unknown>;

  const key = [
    String(safeRow['premenná_1'] ?? safeRow['variableA'] ?? ''),
    String(safeRow['premenná_2'] ?? safeRow['variableB'] ?? ''),
    String(safeRow['metóda'] ?? safeRow['method'] ?? ''),
  ].join('||');

  return {
    ...safeRow,
    odporúčané: recommendedCorrelationKeys.has(key),
  };
});

  const parametricRows = groupTestsToRows(input.parametricGroupTests);
  const nonParametricRows = groupTestsToRows(input.nonParametricGroupTests);
  const recommendedGroupRows = groupTestsToRows(input.recommendedGroupTests);
  const allGroupTestRows = [
    ...parametricRows.map((row) => ({ ...row, skupina_testov: 'parametrické' })),
    ...nonParametricRows.map((row) => ({ ...row, skupina_testov: 'neparametrické' })),
  ];

 const recommendedGroupKeys = new Set(
  recommendedGroupRows.map((row) => {
    const safeRow = row as Record<string, unknown>;

    return [
      String(safeRow['závislá_premenná'] ?? safeRow['dependentVariable'] ?? ''),
      String(safeRow['skupinová_premenná'] ?? safeRow['groupVariable'] ?? ''),
      String(safeRow['test'] ?? safeRow['testType'] ?? ''),
    ].join('||');
  }),
);

  const allGroupTestRowsWithRecommendation = allGroupTestRows.map((row) => {
  const safeRow = row as Record<string, unknown>;

  const key = [
    String(safeRow['závislá_premenná'] ?? safeRow['dependentVariable'] ?? ''),
    String(safeRow['skupinová_premenná'] ?? safeRow['groupVariable'] ?? ''),
    String(safeRow['test'] ?? safeRow['testType'] ?? ''),
  ].join('||');

  return {
    ...safeRow,
    odporúčané: recommendedGroupKeys.has(key),
  };
});

  return {
    frequencies: frequencyRows,
    frequencyTables: frequencyRows,
    itemDescriptives: input.itemDescriptives,
    descriptives: input.scaleDescriptives.length > 0 ? input.scaleDescriptives : input.itemDescriptives,
    descriptiveStatistics: input.scaleDescriptives.length > 0 ? input.scaleDescriptives : input.itemDescriptives,
    scaleDefinitions: input.scaleDefinitions,
    scaleDefinitionRows: scaleDefinitionsToRows(input.scaleDefinitions),
    scales: scaleDefinitionsToRows(input.scaleDefinitions),
    subscaleDefinitions: input.combinedScaleDefinitions,
    subscaleDefinitionRows: combinedScaleDefinitionsToRows(input.combinedScaleDefinitions),
    subscales: combinedScaleDefinitionsToRows(input.combinedScaleDefinitions),
    missingData: missingDataToRows(input.itemDescriptives, input.scaleDescriptives),
    missingValues: missingDataToRows(input.itemDescriptives, input.scaleDescriptives),
    scaleScores: input.scaleScores,
    scaleScoreRows: input.scaleScoreRows,
    scaleSubscaleScores: input.scaleScoreRows,
    scaleDescriptives: input.scaleDescriptives,
    scaleSubscaleDescriptives: input.scaleDescriptives,
    normality: input.normality,
    reliability: input.reliability,
    reliabilities: input.reliability,
    cronbachAlpha: input.reliability,
    pearsonCorrelations: pearsonRows,
    spearmanCorrelations: spearmanRows,
    recommendedCorrelations: recommendedCorrelationRows,

    // DÔLEŽITÉ:
    // Používateľ chce v exporte aj parametrické aj neparametrické korelácie.
    // Preto hlavné aliasy correlations/correlationResults obsahujú Pearson aj Spearman.
    // Stĺpec odporúčané označí, ktorú metódu systém odporúča interpretovať podľa normality.
    allCorrelations: allCorrelationRowsWithRecommendation,
    correlations: allCorrelationRowsWithRecommendation,
    correlationResults: allCorrelationRowsWithRecommendation,
    correlationMatrix: input.correlationMatrix,

    parametricGroupTests: parametricRows,
    nonParametricGroupTests: nonParametricRows,
    recommendedGroupTests: recommendedGroupRows,

    // DÔLEŽITÉ:
    // Používateľ chce v exporte všetky testy: t-test, ANOVA, Mann-Whitney aj Kruskal-Wallis.
    // Preto hlavné aliasy statisticalTests/hypothesisTests/testResults obsahujú všetko.
    // Stĺpec odporúčané označí, ktoré testy sú odporúčané podľa normality.
    allGroupTests: allGroupTestRowsWithRecommendation,
    statisticalTests: allGroupTestRowsWithRecommendation,
    hypothesisTests: allGroupTestRowsWithRecommendation,
    testResults: allGroupTestRowsWithRecommendation,
    recommendedTests: recommendedGroupRows,
    chartData: input.chartData,
    chartTables: input.chartTables,
    charts: input.chartTables,
    recommendedCharts: input.chartTables.map((table) => ({
      title: table.title,
      type: table.key,
      rows: table.rows.length,
    })),
  };
}

/**
 * Pomocná funkcia pre route.ts: rozbalí výsledok do top-level polí,
 * ktoré očakávajú staršie komponenty AnalysisResultsModal a AnalysisCharts.
 */
export function expandStatisticalAnalysisForApi(
  analysis: StatisticalAnalysisResult,
): Record<string, unknown> {
  return {
    statisticalAnalysis: analysis,
    ...analysis.aliases,
  };
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

function isLikelyGroupColumnName(columnName: string): boolean {
  const normalized = normalizeText(columnName);

  return (
    normalized.includes('pohlavie') ||
    normalized.includes('gender') ||
    normalized.includes('sex') ||
    normalized.includes('skupina') ||
    normalized.includes('group') ||
    normalized.includes('trieda') ||
    normalized.includes('class') ||
    normalized.includes('rocnik') ||
    normalized.includes('rocnika') ||
    normalized.includes('grade') ||
    normalized.includes('vekova') ||
    normalized.includes('agegroup') ||
    normalized.includes('experiment') ||
    normalized.includes('kontrol') ||
    normalized.includes('control')
  );
}

function isQuestionnaireItemColumn(columnName: string): boolean {
  const normalized = normalizeText(columnName);

  return (
    normalized.includes('polozka') ||
    normalized.includes('otazka') ||
    normalized.includes('question') ||
    normalized.includes('sembu') ||
    normalized.includes('embu') ||
    normalized.includes('zaclenen') ||
    normalized.includes('skolskazaclenenost') ||
    normalized.includes('skolskejzaclenenosti') ||
    /^wem\d+$/.test(normalized) ||
    /^wemwbs\d+$/.test(normalized) ||
    /^jss\d+$/.test(normalized) ||
    /^si\d+$/.test(normalized)
  );
}

function extractQuestionnaireItemNumber(columnName: string): number | null {
  const raw = String(columnName || '');
  const normalized = normalizeText(raw);

  const exactPatterns = [
    /polozka\s*([0-9]+)/i,
    /položka\s*([0-9]+)/i,
    /otazka\s*([0-9]+)/i,
    /otázka\s*([0-9]+)/i,
    /item\s*([0-9]+)/i,
    /question\s*([0-9]+)/i,
  ];

  for (const pattern of exactPatterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }

  const normalizedPatterns = [
    /polozka([0-9]+)/,
    /otazka([0-9]+)/,
    /item([0-9]+)/,
    /question([0-9]+)/,
    /wemwbs([0-9]+)/,
    /wem([0-9]+)/,
    /jss([0-9]+)/,
    /si([0-9]+)/,
  ];

  for (const pattern of normalizedPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }

  return null;
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

  return round3(bestValue);
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

function round3(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.round(value * 1000) / 1000;
}

function roundP(value: number): number {
  if (!Number.isFinite(value)) return 1;

  if (value < 0.001) return 0.001;

  return Math.round(value * 1000) / 1000;
}

function formatPValue(pValue: number | null): string | null {
  if (pValue === null) return null;
  if (pValue < 0.001) return '< .001';
  return pValue.toFixed(3);
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
/* -------------------------------------------------------------------------- */
/* API WRAPPER PRE app/api/analyze-data/route.ts                              */
/* -------------------------------------------------------------------------- */
/**
 * Tento blok dopĺňa serverovú API funkciu, ktorú importuje:
 * app/api/analyze-data/route.ts
 *
 * Route môže používať:
 *
 * import {
 *   analyzeUploadedDataFile,
 *   type AnalyzeDataApiResponse,
 * } from '@/components/analysis/analysisStats';
 *
 * Poznámka:
 * XLSX sa načítava dynamicky iba na serveri, aby sa zbytočne neťahal do UI bundle.
 */

export type AnalyzeDataApiResponse = {
  ok: boolean;
  title: string;
  summary: string;
  dataDescription: string;
  warnings: string[];

  variables: Array<Record<string, unknown>>;
  frequencies: Array<Record<string, unknown>>;
  descriptiveStatistics: Array<Record<string, unknown>>;
  recommendedTests: Array<Record<string, unknown>>;
  recommendedCharts: Array<Record<string, unknown>>;
  hypothesisTests: Array<Record<string, unknown>>;
  excelTables: string[];

  practicalText: string;
  interpretation: string;
  fullText: string;

  meta: {
    filesCount: number;
    extractedChars: number;
    generatedAt: string;
    source?: string;
    sheetName?: string;
    preparedFileName?: string;
    rows?: number;
    columns?: number;
  };

  preparedFile?: {
    fileName?: string;
    rows?: number;
    columns?: number;
    warnings?: string[];
    qualityReport?: unknown[];
  };

  statistics?: StatisticalAnalysisResult;

  message?: string;
  error?: string;
};

type ApiUploadFile = File;

const API_MAX_FILE_SIZE_MB = 30;
const API_MAX_FILE_SIZE_BYTES = API_MAX_FILE_SIZE_MB * 1024 * 1024;

function apiEmptyAnalysisResponse(
  message: string,
  error?: string,
): AnalyzeDataApiResponse {
  return {
    ok: false,
    title: 'Analýza dát',
    summary: '',
    dataDescription: '',
    warnings: [],
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
    meta: {
      filesCount: 0,
      extractedChars: 0,
      generatedAt: new Date().toISOString(),
    },
    message,
    error,
  };
}

function apiIsExcelFileName(fileName: string): boolean {
  return /\.(xlsx|xls|xlsm)$/i.test(fileName);
}

function apiIsCsvFileName(fileName: string): boolean {
  return /\.csv$/i.test(fileName);
}

function apiGetUploadedFiles(formData: FormData): ApiUploadFile[] {
  const files: ApiUploadFile[] = [];

  const singleFile = formData.get('file');

  if (singleFile instanceof File) {
    files.push(singleFile);
  }

  formData.getAll('files').forEach((item) => {
    if (item instanceof File) {
      files.push(item);
    }
  });

  const unique = new Map<string, ApiUploadFile>();

  files.forEach((file) => {
    const key = `${file.name}-${file.size}-${file.type}`;

    if (!unique.has(key)) {
      unique.set(key, file);
    }
  });

  return Array.from(unique.values());
}

function apiNormalizeCellValue(value: unknown): RawValue {
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

  return text ? text : null;
}

function apiIsMissing(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

function apiRemoveDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function apiNormalizeHeader(value: unknown, index: number): string {
  const original = String(value ?? '').trim();

  if (!original) {
    return `STLPEC_${index + 1}`;
  }

  const normalized = apiRemoveDiacritics(original)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || `STLPEC_${index + 1}`;
}

function apiMakeUniqueHeaders(headers: string[]): string[] {
  const used = new Map<string, number>();

  return headers.map((header) => {
    const count = used.get(header) ?? 0;
    used.set(header, count + 1);

    return count === 0 ? header : `${header}_${count + 1}`;
  });
}

function apiDetectHeaderRow(rows: unknown[][]): number {
  const maxRowsToScan = Math.min(rows.length, 15);

  let bestIndex = 0;
  let bestScore = -1;

  for (let rowIndex = 0; rowIndex < maxRowsToScan; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];

    const nonEmptyCount = row.filter((cell) => !apiIsMissing(cell)).length;

    const textCount = row.filter((cell) => {
      if (apiIsMissing(cell)) {
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

function apiRowsToObjects(rows: unknown[][]): {
  rows: AnalysisRow[];
  headers: string[];
} {
  if (!rows.length) {
    return {
      rows: [],
      headers: [],
    };
  }

  const headerRowIndex = apiDetectHeaderRow(rows);
  const rawHeaders = rows[headerRowIndex] ?? [];

  const headers = apiMakeUniqueHeaders(
    rawHeaders.map((header, index) => apiNormalizeHeader(header, index)),
  );

  const dataRows = rows.slice(headerRowIndex + 1);
  const outputRows: AnalysisRow[] = [];

  dataRows.forEach((row) => {
    const outputRow: AnalysisRow = {};
    let nonEmptyCells = 0;

    headers.forEach((header, index) => {
      const value = apiNormalizeCellValue(row[index]);

      if (!apiIsMissing(value)) {
        nonEmptyCells += 1;
      }

      outputRow[header] = value;
    });

    if (nonEmptyCells > 0) {
      outputRows.push(outputRow);
    }
  });

  return {
    rows: outputRows,
    headers,
  };
}

async function apiReadWorkbookFromFile(file: ApiUploadFile): Promise<{
  workbook: import('xlsx').WorkBook;
  xlsx: typeof import('xlsx');
}> {
  if (file.size > API_MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Súbor "${file.name}" je príliš veľký. Maximálna veľkosť je ${API_MAX_FILE_SIZE_MB} MB.`,
    );
  }

  if (!apiIsExcelFileName(file.name) && !apiIsCsvFileName(file.name)) {
    throw new Error(
      `Nepodporovaný typ súboru "${file.name}". Nahrajte .xlsx, .xls, .xlsm alebo .csv.`,
    );
  }

  const xlsx = await import('xlsx');
  const buffer = Buffer.from(await file.arrayBuffer());

  if (apiIsCsvFileName(file.name)) {
    return {
      xlsx,
      workbook: xlsx.read(buffer.toString('utf8'), {
        type: 'string',
        raw: false,
      }),
    };
  }

  return {
    xlsx,
    workbook: xlsx.read(buffer, {
      type: 'buffer',
      cellDates: true,
      raw: false,
    }),
  };
}

function apiReadSheetRows(
  workbook: import('xlsx').WorkBook,
  xlsx: typeof import('xlsx'),
  preferredSheetName?: string,
): unknown[][] {
  const sheetName =
    preferredSheetName && workbook.SheetNames.includes(preferredSheetName)
      ? preferredSheetName
      : workbook.SheetNames.includes('DATA_CLEAN')
        ? 'DATA_CLEAN'
        : workbook.SheetNames[0];

  if (!sheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    return [];
  }

  return xlsx.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });
}

function apiParseJsonArray(value: FormDataEntryValue | null): unknown[] {
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function apiParseStringArray(value: FormDataEntryValue | null): string[] {
  const parsed = apiParseJsonArray(value);

  return parsed
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function apiCreateVariablesFromStatistics(
  statistics: StatisticalAnalysisResult,
): Array<Record<string, unknown>> {
  const allColumns = uniqueStrings([
    ...statistics.meta.numericColumns,
    ...statistics.meta.ordinalNumericColumns,
    ...statistics.meta.continuousNumericColumns,
    ...statistics.meta.groupColumns,
  ]);

  return allColumns.map((column) => ({
    name: column,
    label: column,
    type: statistics.meta.groupColumns.includes(column)
      ? 'kategorizovaná'
      : statistics.meta.ordinalNumericColumns.includes(column)
        ? 'ordinálna / škálová'
        : 'číselná',
    ignored: statistics.meta.ignoredColumns.includes(column),
  }));
}

function apiCreateDefaultExcelTables(): string[] {
  return [
    'Tabuľka 1: Charakteristika výskumného súboru',
    'Tabuľka 2: Frekvenčné rozdelenie kategorizovaných premenných',
    'Tabuľka 3: Deskriptívna štatistika položiek',
    'Tabuľka 4: Deskriptívna štatistika škál a subškál',
    'Tabuľka 5: Test normality',
    'Tabuľka 6: Korelačná matica',
    'Tabuľka 7: Pearsonova korelácia',
    'Tabuľka 8: Spearmanova korelácia',
    'Tabuľka 9: Reliabilita škál – Cronbachovo alfa',
    'Tabuľka 10: Independent t-test / Mann-Whitney U test',
    'Tabuľka 11: ANOVA / Kruskal-Wallis test',
    'Tabuľka 12: Vypočítané skóre škál a subškál',
  ];
}

function apiBuildRecommendedCharts(
  statistics: StatisticalAnalysisResult,
): Array<Record<string, unknown>> {
  const charts: Array<Record<string, unknown>> = [];

  if (statistics.frequencies.length > 0) {
    charts.push({
      title: 'Frekvenčné rozdelenie premenných',
      type: 'bar',
      variables: statistics.frequencies.slice(0, 5).map((item) => item.variable),
      description:
        'Stĺpcový graf početnosti kategorizovaných alebo ordinálnych premenných.',
      reason: 'Vhodné na predstavenie výskumného súboru.',
    });
  }

  if (statistics.scaleDescriptives.length > 0) {
    charts.push({
      title: 'Priemerné hodnoty škál a subškál',
      type: 'bar',
      variables: statistics.scaleDescriptives.map((item) => item.variable),
      description: 'Stĺpcový graf priemerov vypočítaných škál a subškál.',
      reason: 'Vhodné na porovnanie úrovne jednotlivých škál.',
    });
  }

  if (statistics.normality.length > 0) {
    charts.push({
      title: 'Normalita škál',
      type: 'bar',
      variables: statistics.normality.map((item) => item.variable),
      description: 'Graf p-hodnôt alebo rozhodnutia normality.',
      reason:
        'Vhodné na vysvetlenie, prečo sa odporúčajú parametrické alebo neparametrické testy.',
    });
  }

  if (statistics.correlations.recommended.length > 0) {
    charts.push({
      title: 'Odporúčané korelácie',
      type: 'heatmap',
      variables: uniqueStrings(
        statistics.correlations.recommended.flatMap((item) => [
          item.variableA,
          item.variableB,
        ]),
      ),
      description: 'Korelačná matica hlavných škál a subškál.',
      reason: 'Vhodné na zobrazenie vzťahov medzi premennými.',
    });
  }

  if (statistics.reliability.length > 0) {
    charts.push({
      title: 'Reliabilita škál',
      type: 'bar',
      variables: statistics.reliability.map((item) => item.scaleName),
      description: 'Graf Cronbachovej alfy pre škály a subškály.',
      reason: 'Vhodné na posúdenie vnútornej konzistencie dotazníkov.',
    });
  }

  return charts;
}

function apiBuildRecommendedTests(
  statistics: StatisticalAnalysisResult,
): Array<Record<string, unknown>> {
  const tests: Array<Record<string, unknown>> = [];

  if (statistics.correlations.recommended.length > 0) {
    tests.push({
      title: 'Korelačná analýza škál a subškál',
      hypothesis: 'Vzťahy medzi vypočítanými škálami a subškálami.',
      variables: uniqueStrings(
        statistics.correlations.recommended.flatMap((item) => [
          item.variableA,
          item.variableB,
        ]),
      ),
      test:
        statistics.correlations.recommended[0]?.method === 'pearson'
          ? 'Pearsonova korelácia'
          : 'Spearmanova korelácia',
      description:
        'Overenie vzťahov medzi vypočítanými skóre škál a subškál.',
      reason: statistics.correlations.recommendationNote,
      parametric:
        statistics.correlations.recommended[0]?.method === 'pearson',
    });
  }

  if (statistics.reliability.length > 0) {
    tests.push({
      title: 'Vnútorná konzistencia škál',
      hypothesis: 'Reliabilita použitých škál a subškál.',
      variables: statistics.reliability.flatMap((item) => item.items),
      test: 'Cronbachova alfa',
      description:
        'Overenie vnútornej konzistencie dotazníkových škál a subškál.',
      reason:
        'Cronbachovo alfa je vhodné na overenie reliability viacerých položiek tvoriacich jednu škálu.',
      parametric: false,
    });
  }

  if (statistics.groupTests.recommended.length > 0) {
    tests.push({
      title: 'Rozdielové testy podľa skupín',
      hypothesis: 'Rozdiely v skóre škál podľa skupinových premenných.',
      variables: uniqueStrings(
        statistics.groupTests.recommended.flatMap((item) => [
          item.groupVariable,
          item.dependentVariable,
        ]),
      ),
      test: 't-test / Mann-Whitney U / ANOVA / Kruskal-Wallis',
      description:
        'Porovnanie skóre škál a subškál medzi skupinami.',
      reason: statistics.groupTests.recommendationNote,
      parametric: statistics.groupTests.recommended.some((item) =>
        item.testType === 'independent-t-test' || item.testType === 'anova',
      ),
    });
  }

  return tests;
}

function apiBuildPracticalText(statistics: StatisticalAnalysisResult): string {
  return `
V praktickej časti práce sa odporúča postupovať systematicky. Najprv je potrebné predstaviť výskumný súbor. Počet respondentov bol identifikovaný ako N = ${statistics.meta.respondentCount}. ${
    statistics.meta.idColumn
      ? `Stĺpec "${statistics.meta.idColumn}" bol rozpoznaný ako identifikátor respondenta a nebol použitý v štatistických výpočtoch.`
      : ''
  }

Následne sa odporúča uviesť frekvenčnú analýzu kategorizovaných a ordinálnych premenných. Pri každej takejto premennej treba uviesť početnosť, percento, validné percento a kumulatívne percento.

Pri číselných premenných, položkách, škálach a subškálach je vhodné uviesť deskriptívnu štatistiku: počet platných odpovedí, chýbajúce hodnoty, priemer, medián, modus, smerodajnú odchýlku, rozptyl, šikmosť, špicatosť, minimum, maximum, kvartily a interkvartilové rozpätie.

Pri dotazníkových škálach je potrebné uviesť spôsob výpočtu skóre. Tento výstup obsahuje automaticky rozpoznané alebo manuálne zadané škály a subškály. Pri škálach s viacerými položkami sa odporúča overiť reliabilitu pomocou Cronbachovej alfy.

Pred overovaním hypotéz je potrebné vyhodnotiť normalitu dát. Ak normalita nie je potvrdená alebo ide o ordinálne dáta, odporúča sa interpretovať najmä Spearmanovu koreláciu a neparametrické skupinové testy. Pri splnení predpokladov možno použiť Pearsonovu koreláciu, independent t-test alebo ANOVA.
`.trim();
}

function apiBuildInterpretationText(statistics: StatisticalAnalysisResult): string {
  return `
Výsledky interpretujte vo väzbe na výskumné otázky a hypotézy. Pri korelácii uvádzajte použitú metódu, počet párových pozorovaní, korelačný koeficient, p-hodnotu a vecnú interpretáciu sily vzťahu.

Pri reliabilite uvádzajte Cronbachovo alfa pre každú škálu alebo subškálu. Hodnoty nad 0,70 sa zvyčajne interpretujú ako prijateľné, hodnoty nad 0,80 ako dobré a hodnoty nad 0,90 ako veľmi vysoké.

Pri rozdielových testoch uvádzajte závislú premennú, skupinovú premennú, názov testu, testovú štatistiku, p-hodnotu a slovnú interpretáciu. Ak p < 0,05, výsledok možno považovať za štatisticky významný. Ak p ≥ 0,05, štatisticky významný rozdiel alebo vzťah sa nepreukázal.

${statistics.correlations.recommendationNote}

${statistics.groupTests.recommendationNote}
`.trim();
}

function apiBuildFullText(input: {
  title: string;
  summary: string;
  dataDescription: string;
  warnings: string[];
  statistics: StatisticalAnalysisResult;
  recommendedTests: Array<Record<string, unknown>>;
  recommendedCharts: Array<Record<string, unknown>>;
  practicalText: string;
  interpretation: string;
}): string {
  const {
    title,
    summary,
    dataDescription,
    warnings,
    statistics,
    recommendedTests,
    recommendedCharts,
    practicalText,
    interpretation,
  } = input;

  return [
    title,
    '',
    summary,
    '',
    dataDescription,
    '',
    'Prehľad výpočtov:',
    `- Počet respondentov: ${statistics.meta.respondentCount}`,
    `- Počet numerických premenných: ${statistics.meta.numericColumns.length}`,
    `- Počet skupinových premenných: ${statistics.meta.groupColumns.length}`,
    `- Počet vypočítaných škál/subškál: ${statistics.scaleScores.length}`,
    `- Počet testov normality: ${statistics.normality.length}`,
    `- Počet odporúčaných korelácií: ${statistics.correlations.recommended.length}`,
    `- Počet reliabilít: ${statistics.reliability.length}`,
    `- Počet odporúčaných skupinových testov: ${statistics.groupTests.recommended.length}`,
    '',
    'Odporúčané testy:',
    ...recommendedTests.map((item) => `- ${String(item.title || '')}: ${String(item.test || '')}`),
    '',
    'Odporúčané grafy:',
    ...recommendedCharts.map((item) => `- ${String(item.title || '')}: ${String(item.type || '')}`),
    '',
    'Odporúčania systému:',
    ...statistics.aiRecommendation.map((item) => `- ${item}`),
    '',
    'Upozornenia:',
    ...warnings.map((warning) => `- ${warning}`),
    '',
    'Praktická časť:',
    practicalText,
    '',
    'Interpretácia:',
    interpretation,
  ].join('\n');
}

export async function analyzeUploadedDataFile(
  formData: FormData,
): Promise<AnalyzeDataApiResponse> {
  try {
    const prompt = String(formData.get('prompt') || '');
    const source = String(formData.get('source') || '');
    const sheetName = String(formData.get('sheetName') || 'DATA_CLEAN');
    const preparedFileName = String(formData.get('preparedFileName') || '');

    const prepareWarnings = apiParseStringArray(formData.get('prepareWarnings'));
    const prepareQualityReport = apiParseJsonArray(
      formData.get('prepareQualityReport'),
    );

    const files = apiGetUploadedFiles(formData);

    if (!files.length) {
      return apiEmptyAnalysisResponse(
        'Analýza dát zlyhala.',
        'Nebola nahratá žiadna príloha.',
      );
    }

    const file = files[0];
    const { workbook, xlsx } = await apiReadWorkbookFromFile(file);
    const sheetRows = apiReadSheetRows(workbook, xlsx, sheetName);
    const parsed = apiRowsToObjects(sheetRows);

    if (!parsed.rows.length) {
      return apiEmptyAnalysisResponse(
        'Analýza dát zlyhala.',
        'Vybraný hárok neobsahuje dátové riadky. Skontrolujte DATA_CLEAN.',
      );
    }

    const statistics = runFullStatisticalAnalysis(parsed.rows, {
      alpha: 0.05,
      autoDetectScales: true,
      fallbackToNumericVariables: true,
      autoDetectGroupColumns: true,
      includeFrequencies: true,
      includeItemDescriptives: true,
    });

    const variables = apiCreateVariablesFromStatistics(statistics);
    const frequencies = statistics.frequencies as unknown as Array<Record<string, unknown>>;
    const descriptiveStatistics = [
      ...statistics.itemDescriptives,
      ...statistics.scaleDescriptives,
    ] as unknown as Array<Record<string, unknown>>;

    const recommendedTests = apiBuildRecommendedTests(statistics);
    const recommendedCharts = apiBuildRecommendedCharts(statistics);
    const excelTables = apiCreateDefaultExcelTables();

    const warnings = uniqueStrings([
      ...prepareWarnings,
      ...statistics.aiRecommendation,
      statistics.meta.fallbackUsed
        ? 'Neboli rozpoznané samostatné škály, preto boli použité numerické premenné ako náhradné skóre.'
        : '',
      statistics.reliability.length === 0
        ? 'Reliabilita nebola vypočítaná, pretože neboli rozpoznané škály s minimálne dvoma položkami.'
        : '',
      statistics.correlations.recommended.length === 0
        ? 'Neboli vypočítané odporúčané korelácie, pretože nie je dostatok vhodných škál alebo numerických premenných.'
        : '',
      'Pred finálnou interpretáciou treba skontrolovať typy premenných, chýbajúce hodnoty a metodiku výpočtu skóre.',
    ].filter(Boolean));

    const title = 'Výsledky analýzy dát';

    const summary = [
      `Analyzovaný súbor obsahuje ${statistics.meta.totalRows} dátových riadkov a ${parsed.headers.length} premenných.`,
      `Počet respondentov bol určený ako N = ${statistics.meta.respondentCount}.`,
      source === 'prepared'
        ? 'Štatistika bola spustená nad pripraveným súborom podľa vzoru, konkrétne nad listom DATA_CLEAN.'
        : 'Štatistika bola spustená nad nahratým dátovým súborom.',
      prompt ? `Zadanie používateľa: ${prompt}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const dataDescription = [
      'Dáta boli načítané z tabuľkového súboru.',
      `Použitý hárok: ${sheetName || 'prvý dostupný hárok'}.`,
      `Ignorované stĺpce: ${statistics.meta.ignoredColumns.length ? statistics.meta.ignoredColumns.join(', ') : 'žiadne'}.`,
      `Automaticky rozpoznané škály/subškály: ${statistics.meta.autoDetectedScaleCount}.`,
    ].join(' ');

    const practicalText = apiBuildPracticalText(statistics);
    const interpretation = apiBuildInterpretationText(statistics);

    const fullText = apiBuildFullText({
      title,
      summary,
      dataDescription,
      warnings,
      statistics,
      recommendedTests,
      recommendedCharts,
      practicalText,
      interpretation,
    });

    return {
      ok: true,
      title,
      summary,
      dataDescription,
      warnings,
      variables,
      frequencies,
      descriptiveStatistics,
      recommendedTests,
      recommendedCharts,
      hypothesisTests: [
        ...statistics.correlations.recommended,
        ...statistics.groupTests.recommended,
      ] as unknown as Array<Record<string, unknown>>,
      excelTables,
      practicalText,
      interpretation,
      fullText,
      statistics,
      meta: {
        filesCount: files.length,
        extractedChars: fullText.length,
        generatedAt: new Date().toISOString(),
        source,
        sheetName,
        preparedFileName,
        rows: statistics.meta.totalRows,
        columns: parsed.headers.length,
      },
      preparedFile: {
        fileName: preparedFileName || file.name,
        rows: Number(formData.get('preparedRows') || statistics.meta.totalRows),
        columns: Number(formData.get('preparedColumns') || parsed.headers.length),
        warnings: prepareWarnings,
        qualityReport: prepareQualityReport,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Neznáma chyba pri analýze dát.';

    return apiEmptyAnalysisResponse('Analýza dát zlyhala.', message);
  }
}
