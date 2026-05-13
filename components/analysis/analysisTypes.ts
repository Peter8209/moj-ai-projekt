export type AnalysisTableColumn = {
  key: string;
  label: string;
};

export type AnalysisTableRow = Record<string, string | number | null>;

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

export type AnalysisFrequency = {
  variable?: string;
  name?: string;
  value?: string | number;
  count?: number;
  percent?: number;
  percentage?: number;
  [key: string]: unknown;
};

export type AnalysisResult = {
  ok: boolean;
  title: string;
  summary: string;

  dataDescription: string;
  selectedAnalyses: AnalysisRecommendation[];
  descriptiveStatistics: AnalysisTable[];
  hypothesisTests: AnalysisRecommendation[];
  interpretation: string;

  /**
   * Doplnkové polia, ktoré používa DashboardClient.tsx.
   * Bez nich padá TypeScript chyba:
   * Property 'variables' does not exist on type 'AnalysisResult'.
   */
  variables?: AnalysisVariable[];
  frequencies?: AnalysisFrequency[];

  recommendedTests?: AnalysisRecommendation[];
  recommendedCharts: AnalysisChart[];
  excelTables: AnalysisTable[];

  practicalText: string;
  warnings: string[];
  fullText: string;

  meta?: {
    filesCount?: number;
    extractedChars?: number;
    generatedAt?: string;
    profileTitle?: string;
    [key: string]: unknown;
  };

  /**
   * Bezpečnostná rezerva pre ďalšie polia z API,
   * aby build nepadal pri rozšírenom JSON výstupe.
   */
  [key: string]: unknown;
};