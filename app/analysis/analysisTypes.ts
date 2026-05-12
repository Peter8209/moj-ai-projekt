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

export type RecommendedChart = {
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

export type RecommendedTest = {
  title: string;
  description: string;
};

export type AnalysisRecommendation = {
  title: string;
  description: string;
};

export type AnalysisResult = {
  ok: boolean;
  title: string;
  summary: string;
  dataDescription: string;

  selectedAnalyses: AnalysisRecommendation[];
  descriptiveStatistics: AnalysisTable[];
  recommendedCharts: RecommendedChart[];
  excelTables: AnalysisTable[];
  hypothesisTests: RecommendedTest[];

  practicalText: string;
  interpretation: string;
  warnings: string[];
  fullText: string;

  meta?: {
    filesCount?: number;
    extractedChars?: number;
    generatedAt?: string;
    profileTitle?: string;
  };
};