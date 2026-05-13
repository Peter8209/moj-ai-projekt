export type AnalysisVariable = {
  name?: string;
  variable?: string;
  label?: string;
  type?: string;
  measurementLevel?: string;
  role?: string;
  description?: string;
  missingValues?: number;
  validValues?: number;
  [key: string]: unknown;
};

export type DescriptiveStatistic = {
  variable?: string;
  name?: string;
  count?: number;
  mean?: number;
  median?: number;
  mode?: number | string;
  min?: number;
  max?: number;
  range?: number;
  variance?: number;
  standardDeviation?: number;
  stdDev?: number;
  skewness?: number;
  kurtosis?: number;
  interpretation?: string;
  [key: string]: unknown;
};

export type FrequencyItem = {
  variable?: string;
  name?: string;
  value?: string | number;
  category?: string | number;
  count?: number;
  frequency?: number;
  percent?: number;
  percentage?: number;
  validPercent?: number;
  cumulativePercent?: number;
  [key: string]: unknown;
};

export type HypothesisTest = {
  name?: string;
  test?: string;
  variable?: string;
  variables?: string[];
  statistic?: number;
  pValue?: number;
  p?: number;
  df?: number;
  result?: string;
  interpretation?: string;
  significant?: boolean;
  [key: string]: unknown;
};

export type RecommendedTest = {
  name?: string;
  test?: string;
  reason?: string;
  variables?: string[];
  assumptions?: string[];
  interpretation?: string;
  [key: string]: unknown;
};

export type RecommendedChart = {
  name?: string;
  chart?: string;
  type?: string;
  reason?: string;
  variables?: string[];
  description?: string;
  [key: string]: unknown;
};

export type ExcelTable = {
  title?: string;
  name?: string;
  headers?: string[];
  rows?: unknown[][];
  data?: unknown;
  description?: string;
  [key: string]: unknown;
};

export type AnalysisResult = {
  ok?: boolean;

  title?: string;
  summary?: string;
  warnings?: string[] | string;

  dataDescription?: string;
  selectedAnalyses?: string[] | string;

  variables?: AnalysisVariable[];
  frequencies?: FrequencyItem[];
  recommendedTests?: RecommendedTest[];
  recommendedCharts?: RecommendedChart[];
  excelTables?: ExcelTable[];

  descriptiveStatistics?: DescriptiveStatistic[] | Record<string, unknown>;
  hypothesisTests?: HypothesisTest[] | Record<string, unknown>;

  practicalText?: string;
  fullText?: string;
  interpretation?: string;

  output?: string;
  result?: string;
  message?: string;
  text?: string;
  answer?: string;

  [key: string]: unknown;
};