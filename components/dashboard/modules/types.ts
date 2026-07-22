export type AcademicModuleKey =
  | "supervisor"
  | "quality"
  | "defense"
  | "translation"
  | "data"
  | "planning"
  | "emails"
  | "humanizer";

export type AcademicModuleProfile = {
  id?: string;
  title?: string;
  topic?: string;
  type?: string;
  level?: string;
  field?: string;
  expertise?: string;
  workExpertise?: string;
  specializationLevel?: string;
  supervisor?: string;
  citation?: string;
  citationStyle?: string;
  language?: string;
  interfaceLanguage?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  problem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;
  businessProblem?: string;
  businessGoal?: string;
  implementation?: string;
  caseStudy?: string;
  reflection?: string;
  sourcesRequirement?: string;
  keywordsList?: string[];
  keywords?: string[];
  savedAt?: string;
  schema?: {
    label?: string;
    description?: string;
    recommendedLength?: string;
    structure?: string[];
    requiredSections?: string[];
    aiInstruction?: string;
  };
  [key: string]: unknown;
};

export type ModuleApiResponse = {
  ok?: boolean;
  success?: boolean;
  output?: unknown;
  result?: unknown;
  text?: unknown;
  answer?: unknown;
  content?: unknown;
  response?: unknown;
  message?: unknown;
  summary?: unknown;
  fullText?: unknown;
  practicalText?: unknown;
  interpretation?: unknown;
  analysis?: unknown;
  error?: unknown;
  detail?: unknown;
  details?: unknown;
  choices?: unknown;
  entitlements?: unknown;
  pageUsage?: unknown;
  pageQuota?: unknown;
  quota?: unknown;
  usage?: unknown;
  attachmentProcessing?: unknown;
  extractedFilesInfo?: unknown;
  [key: string]: unknown;
};

export type AcademicModuleFrontendProps = {
  profile: AcademicModuleProfile | null;
  language: string;
  attachmentLimit: number;
  unlimited: boolean;
  disabled?: boolean;
  onAttachmentCountChange?: (count: number) => void;
  onEntitlements?: (value: unknown) => void;
  onPageQuota?: (value: unknown) => void;
  onUsageChanged?: () => void | Promise<void>;
};
