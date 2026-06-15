export type PrimitiveValue = string | number | boolean | null | undefined;

export type TableCellValue =
  | PrimitiveValue
  | PrimitiveValue[]
  | Record<string, unknown>;

export type AnalysisTableRow = Record<string, TableCellValue>;

export type VariableRole =
  | 'id'
  | 'identifier'
  | 'demographic'
  | 'grouping'
  | 'item'
  | 'scale'
  | 'subscale'
  | 'dependent'
  | 'independent'
  | 'control'
  | 'text'
  | 'date'
  | 'unknown'
  | string;

export type VariableKind =
  | 'numeric'
  | 'categorical'
  | 'ordinal'
  | 'likert'
  | 'text'
  | 'date'
  | 'boolean'
  | 'empty'
  | 'unknown'
  | string;

export type MeasurementLevel =
  | 'nominal'
  | 'ordinal'
  | 'scale'
  | 'interval'
  | 'ratio'
  | 'unknown'
  | string;

export type AnalysisVariable = {
  name?: string;
  variable?: string;
  label?: string;

  originalName?: string;
  displayName?: string;

  type?: string;
  dataType?: string;
  kind?: VariableKind;

  measurementLevel?: MeasurementLevel;

  role?: VariableRole;

  description?: string;

  valid?: number;
  validValues?: number;
  validCount?: number;
  nonMissing?: number;

  missing?: number;
  missingValues?: number;
  missingCount?: number;

  uniqueValues?: number;
  uniqueCount?: number;

  min?: number;
  max?: number;

  examples?: Array<string | number>;
  categories?: Array<string | number>;

  scaleGroup?: string | null;
  reverseScored?: boolean;

  recommendedUse?: string;
  warning?: string;
  notes?: string;

  [key: string]: unknown;
};

export type PreparedRawDataRow = Record<string, PrimitiveValue>;

export type ScaleDefinition = {
  name: string;
  label: string;
  type?: 'scale' | 'subscale' | string;
  items: string[];
  scoring?: 'mean' | 'sum' | string;
  reverseItems?: string[];
  description?: string;
};

export type PreparedDatasetQuality = {
  sourceFileName?: string;
  selectedSheetName?: string;
  headerRowIndex?: number;

  originalRowCount?: number;
  rowCount?: number;

  originalColumnCount?: number;
  variableCount?: number;

  removedEmptyRows?: number;
  removedDuplicateRows?: number;

  scaleCount?: number;
  subscaleCount?: number;

  warnings?: string[];
  notes?: string[];

  [key: string]: unknown;
};

export type PreparedDataset = {
  sourceFileName?: string;
  selectedSheetName?: string;

  originalHeaders: string[];
  headers: string[];

  demographicColumns: string[];
  groupingColumns: string[];
  itemColumns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  textColumns: string[];
  dateColumns: string[];

  scaleDefinitions: ScaleDefinition[];
  subscaleDefinitions: ScaleDefinition[];

  variables: AnalysisVariable[];

  rows: PreparedRawDataRow[];

  rawDataSheet: unknown[][];
  variableMapSheet: unknown[][];
  dataQualitySheet: unknown[][];

  quality: PreparedDatasetQuality;

  [key: string]: unknown;
};

export type DescriptiveStatistic = {
  name?: string;
  variable?: string;
  label?: string;

  valid?: number;
  n?: number;
  count?: number;

  missing?: number;
  missingValues?: number;

  mean?: number;
  M?: number;
  average?: number;

  median?: number;
  Md?: number;

  mode?: number | string;

  stdDeviation?: number;
  standardDeviation?: number;
  stdDev?: number;
  std?: number;
  sd?: number;
  SD?: number;

  minimum?: number;
  min?: number;

  maximum?: number;
  max?: number;

  range?: number;
  variance?: number;
  sum?: number;

  skewness?: number;
  kurtosis?: number;

  q1?: number;
  q3?: number;
  iqr?: number;

  confidenceIntervalLower?: number;
  confidenceIntervalUpper?: number;

  interpretation?: string;
  warning?: string;

  [key: string]: unknown;
};

export type FrequencyItem = {
  variable?: string;
  name?: string;
  label?: string;

  value?: string | number;
  category?: string | number;

  count?: number;
  frequency?: number;
  n?: number;

  percent?: number;
  percentage?: number;

  validPercent?: number;
  cumulativePercent?: number;

  missing?: boolean;

  interpretation?: string;

  [key: string]: unknown;
};

export type FrequencyTable = {
  variable?: string;
  name?: string;
  title?: string;
  description?: string;

  rows?: FrequencyItem[];
  items?: FrequencyItem[];
  data?: FrequencyItem[];

  total?: number;
  validTotal?: number;
  missingTotal?: number;

  interpretation?: string;

  [key: string]: unknown;
};

export type ReliabilityResult = {
  scale?: string;
  name?: string;
  label?: string;

  items?: string[];
  itemCount?: number;

  validN?: number;
  n?: number;

  cronbachAlpha?: number | null;
  alpha?: number | null;

  interpretation?: string;
  warning?: string;

  [key: string]: unknown;
};

export type CorrelationResult = {
  name?: string;
  test?: 'Pearson' | 'Spearman' | string;

  variable1?: string;
  variable2?: string;
  variableX?: string;
  variableY?: string;
  variables?: string[];

  coefficient?: number;
  r?: number;
  rho?: number;
  pearsonR?: number;
  spearmanRho?: number;

  pValue?: number;
  p?: number;

  n?: number;
  sampleSize?: number;

  strength?: string;
  direction?: 'positive' | 'negative' | 'none' | string;

  significant?: boolean;

  interpretation?: string;
  conclusion?: string;

  [key: string]: unknown;
};

export type TTestResult = {
  name?: string;
  test?: string;

  dependentVariable?: string;
  independentVariable?: string;
  groupVariable?: string;

  group1?: string | number;
  group2?: string | number;

  mean1?: number;
  mean2?: number;

  sd1?: number;
  sd2?: number;

  n1?: number;
  n2?: number;

  statistic?: number;
  t?: number;

  df?: number;
  degreesOfFreedom?: number;

  pValue?: number;
  p?: number;

  meanDifference?: number;
  confidenceIntervalLower?: number;
  confidenceIntervalUpper?: number;

  effectSize?: number;
  cohensD?: number;

  significant?: boolean;

  interpretation?: string;
  conclusion?: string;

  [key: string]: unknown;
};

export type StatisticalTestName =
  | 't-test'
  | 'ANOVA'
  | 'Mann-Whitney U'
  | 'Kruskal-Wallis'
  | 'Pearson'
  | 'Spearman'
  | 'Chi-square'
  | string;

export type StatisticalTestResult = {
  name?: string;
  test?: StatisticalTestName;

  variable?: string;
  variables?: string[];

  dependentVariable?: string;
  independentVariable?: string;
  groupingVariable?: string;
  groupVariable?: string;

  groups?: string;

  statistic?: number | null;
  value?: number | null;

  t?: number;
  r?: number;
  rho?: number;
  chiSquare?: number;
  f?: number;
  u?: number;
  h?: number;

  pValue?: number | null;
  p?: number | null;

  df?: number;
  df1?: number;
  df2?: number;
  degreesOfFreedom?: number;

  result?: string;
  interpretation?: string;
  conclusion?: string;

  significant?: boolean;
  alpha?: number;

  effectSize?: number;

  [key: string]: unknown;
};

export type HypothesisTest = StatisticalTestResult;

export type RecommendedTest = {
  name?: string;
  test?: string;

  reason?: string;
  hypothesis?: string;

  variables?: string[];

  dependentVariable?: string;
  independentVariable?: string;
  groupingVariable?: string;

  assumptions?: string[];

  whenToUse?: string;
  interpretation?: string;
  warning?: string;

  [key: string]: unknown;
};

export type RecommendedChart = {
  name?: string;
  chart?: string;
  title?: string;

  type?:
    | 'bar'
    | 'pie'
    | 'histogram'
    | 'boxplot'
    | 'line'
    | 'scatter'
    | 'heatmap'
    | string;

  chartType?: string;

  variable?: string;
  variables?: string[];

  x?: string;
  y?: string;
  groupBy?: string;

  reason?: string;
  description?: string;
  interpretation?: string;

  data?: AnalysisTableRow[];

  [key: string]: unknown;
};

export type ExcelTable = {
  title?: string;
  name?: string;
  sheetName?: string;

  description?: string;

  headers?: string[];
  columns?: string[];

  rows?: unknown[][];
  data?: AnalysisTableRow[] | unknown;

  interpretation?: string;

  [key: string]: unknown;
};

export type ExtractedFile = {
  id?: string;
  name?: string;
  fileName?: string;
  filename?: string;

  type?: string;
  mimeType?: string;

  size?: number;
  sizeBytes?: number;

  rows?: number;
  columns?: number;

  status?: string;
  message?: string;

  extractedText?: string;
  preview?: string;

  [key: string]: unknown;
};

export type AnalysisWarning = {
  type?: string;
  code?: string;
  message?: string;
  variable?: string;
  severity?: 'info' | 'warning' | 'error' | string;

  [key: string]: unknown;
};

export type SelectedAnalysis =
  | 'frequency'
  | 'descriptive'
  | 'correlation'
  | 'pearson'
  | 'spearman'
  | 'ttest'
  | 'anova'
  | 'mann-whitney'
  | 'kruskal-wallis'
  | 'reliability'
  | 'cronbach-alpha'
  | 'charts'
  | 'interpretation'
  | string;

export type AnalysisExportPayload = {
  title?: string;
  summary?: string;

  preparedDataset?: PreparedDataset;

  variables?: AnalysisVariable[];

  frequencies?: FrequencyItem[] | FrequencyTable[];
  frequencyTables?: FrequencyItem[] | FrequencyTable[];

  descriptiveStatistics?: DescriptiveStatistic[];
  descriptives?: DescriptiveStatistic[];

  reliabilities?: ReliabilityResult[];
  reliability?: ReliabilityResult[];

  correlations?: CorrelationResult[];
  pearsonCorrelations?: CorrelationResult[];
  spearmanCorrelations?: CorrelationResult[];

  tTests?: TTestResult[];
  hypothesisTests?: HypothesisTest[];
  statisticalTests?: StatisticalTestResult[];

  recommendedTests?: RecommendedTest[];
  recommendedCharts?: RecommendedChart[];

  excelTables?: ExcelTable[];

  practicalText?: string;
  interpretation?: string;
  fullText?: string;

  warnings?: string[] | AnalysisWarning[] | string;

  [key: string]: unknown;
};

export type AnalysisResult = {
  ok?: boolean;
  success?: boolean;

  title?: string;
  summary?: string;

  warnings?: string[] | AnalysisWarning[] | string;

  dataDescription?: string;
  data_description?: string;

  selectedAnalyses?: SelectedAnalysis[] | string[] | string;
  selected_analyses?: SelectedAnalysis[] | string[] | string;

  preparedDataset?: PreparedDataset;
  rawDataWorkbookBase64?: string;
  rawDataFileName?: string;

  variables?: AnalysisVariable[];
  detectedVariables?: AnalysisVariable[];
  columns?: AnalysisVariable[];

  frequencies?: FrequencyItem[] | FrequencyTable[];
  frequencyTables?: FrequencyItem[] | FrequencyTable[];
  frequency_tables?: FrequencyItem[] | FrequencyTable[];

  descriptiveStatistics?: DescriptiveStatistic[] | Record<string, unknown>;
  descriptive_statistics?: DescriptiveStatistic[] | Record<string, unknown>;
  descriptives?: DescriptiveStatistic[];
  statistics?: DescriptiveStatistic[] | Record<string, unknown>;

  reliabilities?: ReliabilityResult[];
  reliability?: ReliabilityResult[];
  cronbachAlpha?: ReliabilityResult[];

  correlations?: CorrelationResult[];
  correlationResults?: CorrelationResult[];

  pearsonCorrelations?: CorrelationResult[];
  pearson?: CorrelationResult[];

  spearmanCorrelations?: CorrelationResult[];
  spearman?: CorrelationResult[];

  tTests?: TTestResult[];
  t_tests?: TTestResult[];

  statisticalTests?: StatisticalTestResult[];
  statistical_tests?: StatisticalTestResult[];

  hypothesisTests?: HypothesisTest[] | Record<string, unknown>;
  hypothesis_tests?: HypothesisTest[] | Record<string, unknown>;
  testResults?: HypothesisTest[] | Record<string, unknown>;

  recommendedTests?: RecommendedTest[];
  recommended_tests?: RecommendedTest[];
  tests?: RecommendedTest[];

  recommendedCharts?: RecommendedChart[];
  recommended_charts?: RecommendedChart[];
  charts?: RecommendedChart[];

  excelTables?: ExcelTable[];
  excel_tables?: ExcelTable[];
  tables?: ExcelTable[];

  files?: ExtractedFile[];
  extractedFiles?: ExtractedFile[];
  attachments?: ExtractedFile[];

  practicalText?: string;
  practical_text?: string;

  fullText?: string;
  fullResult?: string;

  interpretation?: string;

  output?: string;
  result?: string;
  message?: string;
  text?: string;
  answer?: string;

  score?: number;
  qualityScore?: number;

  exportedAt?: string;
  generatedAt?: string;

  [key: string]: unknown;
};

export type AnalyzeDataApiResponse = {
  success: boolean;
  ok?: boolean;

  fileName?: string;
  rawDataFileName?: string;
  rawDataWorkbookBase64?: string;

  analysis?: AnalysisResult;

  error?: string;
  message?: string;

  [key: string]: unknown;
};

export type ExportAnalysisRequest = {
  analysis?: AnalysisResult;
  fileName?: string;
  type?: 'full' | 'raw' | 'statistics' | string;
};

export type ExportSheetDefinition = {
  sheetName: string;
  rows: unknown[][];
};

export type WorkbookReadResult = {
  fileName?: string;
  selectedSheetName: string;
  rows: unknown[][];
  sheetNames: string[];
};