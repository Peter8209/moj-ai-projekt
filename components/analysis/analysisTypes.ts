/* components/analysis/analysisTypes.ts */

export type AnalysisPrimitive = string | number | boolean | null;

export type AnalysisTableColumn = {
  key: string;
  label: string;
};

export type AnalysisTableRow = Record<string, string | number | boolean | null>;

export type AnalysisTable = {
  title: string;
  description?: string;
  columns: AnalysisTableColumn[];
  rows: AnalysisTableRow[];
};

export type AnalysisChart = {
  title: string;
  type:
    | 'bar'
    | 'line'
    | 'pie'
    | 'histogram'
    | 'boxplot'
    | 'scatter'
    | 'heatmap'
    | 'other';
  description: string;
  variables?: string[];
};

export type AnalysisRecommendation = {
  title: string;
  description: string;
};

export type AnalysisVariable = {
  name?: string;
  variable?: string;
  type?: string;
  role?: string;
  description?: string;
  values?: Array<string | number>;
  missingValues?: number;
  uniqueValues?: number;
  [key: string]: unknown;
};

export type AnalysisFrequencyValue = {
  value: string | number;
  count: number;
  frequency?: number;
  percent?: number;
  percentage?: number;
  validPercent?: number;
  cumulativePercent?: number;
  [key: string]: unknown;
};

export type AnalysisFrequency = {
  variable?: string;
  name?: string;
  title?: string;
  valid?: number;
  missing?: number;
  total?: number;
  value?: string | number;
  count?: number;
  frequency?: number;
  percent?: number;
  percentage?: number;
  validPercent?: number;
  cumulativePercent?: number;
  values?: AnalysisFrequencyValue[];
  rows?: AnalysisFrequencyValue[];
  data?: AnalysisFrequencyValue[];
  items?: AnalysisFrequencyValue[];
  [key: string]: unknown;
};

export type AnalysisDescriptiveStatistic = {
  variable: string;
  valid?: number;
  missing?: number;
  mean?: number | null;
  M?: number | null;
  median?: number | null;
  Md?: number | null;
  mode?: number | string | null;
  standardDeviation?: number | null;
  stdDeviation?: number | null;
  SD?: number | null;
  variance?: number | null;
  skewness?: number | null;
  standardErrorSkewness?: number | null;
  kurtosis?: number | null;
  standardErrorKurtosis?: number | null;
  minimum?: number | null;
  min?: number | null;
  maximum?: number | null;
  max?: number | null;
  q1?: number | null;
  q3?: number | null;
  iqr?: number | null;
  [key: string]: unknown;
};

export type AnalysisScaleScore = {
  scaleId: string;
  scaleName: string;
  scores?: Array<number | null>;
  itemsUsed?: string[];
  missingRows?: number;
  scoring?: 'sum' | 'mean';
  description?: string;
  [key: string]: unknown;
};

export type AnalysisNormality = {
  variable: string;
  valid?: number;
  method?: string;
  statistic?: number | null;
  pValue?: number | null;
  p?: number | null;
  isNormal?: boolean | null;
  recommendation?: 'normal' | 'not-normal' | 'not-enough-data' | string;
  note?: string;
  [key: string]: unknown;
};

export type AnalysisCorrelationMethod = 'pearson' | 'spearman' | string;

export type AnalysisCorrelation = {
  variableA?: string;
  variableB?: string;
  variable1?: string;
  variable2?: string;
  method?: AnalysisCorrelationMethod;
  n?: number;
  r?: number | null;
  rho?: number | null;
  coefficient?: number | null;
  pValue?: number | null;
  p?: number | null;
  significance?: string;
  fisherZ?: number | null;
  standardError?: number | null;
  interpretation?: string;
  [key: string]: unknown;
};

export type AnalysisReliability = {
  scaleId?: string;
  scaleName?: string;
  variable?: string;
  items?: string[];
  validRows?: number;
  cronbachAlpha?: number | null;
  alpha?: number | null;
  interpretation?: string;
  [key: string]: unknown;
};

export type AnalysisGroupTestType =
  | 'independent-t-test'
  | 'mann-whitney-u'
  | 'anova'
  | 'kruskal-wallis'
  | string;

export type AnalysisGroupTest = {
  dependentVariable?: string;
  independentVariable?: string;
  groupVariable?: string;
  testType?: AnalysisGroupTestType;
  test?: string;
  groups?: string[];
  nTotal?: number;
  n?: number;
  statistic?: number | null;
  t?: number | null;
  pValue?: number | null;
  p?: number | null;
  significance?: string;
  recommendation?: string;
  interpretation?: string;
  [key: string]: unknown;
};

export type StatisticalAnalysisMeta = {
  totalRows?: number;
  respondentCount?: number;
  idColumn?: string | null;
  ignoredColumns?: string[];
  numericColumns?: string[];
  groupColumns?: string[];
  alpha?: number;
  filesCount?: number;
  extractedChars?: number;
  generatedAt?: string;
  profileTitle?: string;
  [key: string]: unknown;
};

export type StatisticalAnalysisResult = {
  meta?: StatisticalAnalysisMeta;

  frequencies?: AnalysisFrequency[];
  itemDescriptives?: AnalysisDescriptiveStatistic[];

  scaleScores?: AnalysisScaleScore[];
  scaleDescriptives?: AnalysisDescriptiveStatistic[];
  normality?: AnalysisNormality[];

  correlations?: {
    pearson?: AnalysisCorrelation[];
    spearman?: AnalysisCorrelation[];
    recommended?: AnalysisCorrelation[];
    recommendationNote?: string;
    [key: string]: unknown;
  };

  reliability?: AnalysisReliability[];

  groupTests?: {
    parametric?: AnalysisGroupTest[];
    nonParametric?: AnalysisGroupTest[];
    recommended?: AnalysisGroupTest[];
    recommendationNote?: string;
    [key: string]: unknown;
  };

  aiRecommendation?: string[];
  warnings?: string[];

  [key: string]: unknown;
};

export type AnalysisResult = {
  ok: boolean;
  title: string;
  summary: string;

  dataDescription: string;
  selectedAnalyses: AnalysisRecommendation[];

  /**
   * Starší formát – ponechané kvôli DashboardClient.tsx a exportu.
   */
  descriptiveStatistics: AnalysisTable[];
  hypothesisTests: AnalysisRecommendation[];
  interpretation: string;

  /**
   * Nový štatistický výstup z analysisStats.ts.
   */
  statisticalAnalysis?: StatisticalAnalysisResult;
  stats?: StatisticalAnalysisResult;
  analysisStats?: StatisticalAnalysisResult;

  /**
   * Premenné a frekvencie.
   */
  variables?: AnalysisVariable[];
  detectedVariables?: AnalysisVariable[];
  columns?: AnalysisVariable[];

  frequencies?: AnalysisFrequency[];
  frequencyTables?: AnalysisFrequency[];
  frequency_tables?: AnalysisFrequency[];

  /**
   * Deskriptívna štatistika po položkách a po škálach/subškálach.
   */
  itemDescriptives?: AnalysisDescriptiveStatistic[];
  scaleScores?: AnalysisScaleScore[];
  scaleDescriptives?: AnalysisDescriptiveStatistic[];
  scale_descriptives?: AnalysisDescriptiveStatistic[];
  scalesDescriptiveStatistics?: AnalysisDescriptiveStatistic[];

  /**
   * Normalita dát.
   */
  normality?: AnalysisNormality[];

  /**
   * Korelácie.
   */
  correlations?: AnalysisCorrelation[];
  pearsonCorrelations?: AnalysisCorrelation[];
  pearson_correlations?: AnalysisCorrelation[];
  spearmanCorrelations?: AnalysisCorrelation[];
  spearman_correlations?: AnalysisCorrelation[];
  recommendedCorrelations?: AnalysisCorrelation[];
  correlationRecommendationNote?: string;

  /**
   * Reliabilita.
   */
  reliability?: AnalysisReliability[];
  cronbachAlpha?: AnalysisReliability[];

  /**
   * Testovanie rozdielov medzi skupinami.
   */
  tTests?: AnalysisGroupTest[];
  t_tests?: AnalysisGroupTest[];

  parametricGroupTests?: AnalysisGroupTest[];
  parametricTests?: AnalysisGroupTest[];

  nonParametricGroupTests?: AnalysisGroupTest[];
  nonParametricTests?: AnalysisGroupTest[];

  recommendedGroupTests?: AnalysisGroupTest[];
  groupTestsRecommendationNote?: string;

  recommendedTests?: AnalysisRecommendation[] | AnalysisGroupTest[];
  recommended_tests?: AnalysisRecommendation[] | AnalysisGroupTest[];

  testResults?: AnalysisRecommendation[] | AnalysisGroupTest[];

  /**
   * Grafy a tabuľky.
   */
  recommendedCharts: AnalysisChart[];
  recommended_charts?: AnalysisChart[];

  excelTables: AnalysisTable[];
  excel_tables?: AnalysisTable[];
  tables?: AnalysisTable[];

  /**
   * Textové výstupy.
   */
  practicalText: string;
  warnings: string[];
  fullText: string;
  aiRecommendation?: string[];

  /**
   * Súbory.
   */
  files?: Array<Record<string, unknown>>;
  extractedFiles?: Array<Record<string, unknown>>;
  attachments?: Array<Record<string, unknown>>;

  meta?: StatisticalAnalysisMeta;

  /**
   * Bezpečnostná rezerva pre ďalšie polia z API,
   * aby build nepadal pri rozšírenom JSON výstupe.
   */
  [key: string]: unknown;
};