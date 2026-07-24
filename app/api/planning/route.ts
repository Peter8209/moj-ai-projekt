import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 120;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 20_000,
      maxRetries: 0,
    })
  : null;

const MODEL = process.env.OPENAI_PLANNING_MODEL || "gpt-4.1-mini";
const MAX_ATTACHMENT_BYTES = 30 * 1024 * 1024;
const MAX_ATTACHMENT_TEXT_CHARS = 80_000;
const MAX_TOTAL_ATTACHMENT_TEXT_CHARS = 160_000;

type PlanningTaskStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "not-applicable";

type PlanningWorkType =
  | "seminar"
  | "bachelor"
  | "master"
  | "project"
  | "other";

type PreferredTime = "morning" | "afternoon" | "evening" | "custom";

type PlanningStatusKey =
  | "topicApproval"
  | "assignmentApproval"
  | "outline"
  | "sources"
  | "theoreticalPart"
  | "practicalPart"
  | "research"
  | "dataAnalysis"
  | "discussion"
  | "conclusion"
  | "citations"
  | "formatting"
  | "proofreading";

type SavedProfile = {
  id?: string;
  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;
  expertise?: string;
  workExpertise?: string;
  specializationLevel?: string;
  supervisor?: string;
  citation?: string;
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
  sourcesRequirement?: string;
  keywords?: string[];
  keywordsList?: string[];
};

type PlanningRequest = {
  action?: "generate-plan" | "regenerate-task";
  requestId?: string;
  projectId?: string;
  title: string;
  workType: PlanningWorkType;
  language: string;
  deadline: string;
  deadlineTime?: string;
  targetPages: number;
  completedPages: number;
  currentStatus: Record<PlanningStatusKey, PlanningTaskStatus>;
  capacity: {
    hoursPerDay: number;
    daysPerWeek: number;
    availableWeekdays: number[];
    unavailableDates: string[];
    preferredTime: PreferredTime;
    maxBlockHours: number;
  };
  priorities: string[];
  constraints?: string;
  additionalInstructions?: string;
  activeProfile?: SavedProfile | null;
  attachmentIds?: string[];
  attachmentMetadata?: Array<{
    id?: string;
    name: string;
    size?: number;
    type?: string;
  }>;
};

type PlanningCalculation = {
  today: string;
  deadline: string;
  calendarDays: number;
  availableDates: string[];
  productiveDates: string[];
  reserveDates: string[];
  availableDays: number;
  productiveDays: number;
  reserveDays: number;
  availableHours: number;
  productiveHours: number;
  remainingPages: number;
  requiredHours: number;
  hoursPerDay: number;
  pagesPerDay: number;
  workloadRatio: number;
  feasibility: "realistic" | "intensive" | "high-risk" | "unrealistic";
  riskLevel: "low" | "medium" | "high" | "critical";
};

type PlanningTask = {
  id: string;
  time: string;
  title: string;
  deliverable: string;
  checkpoint: string;
};

type PlanningResponse = {
  summary: {
    availableDays: number;
    productiveDays: number;
    availableHours: number;
    productiveHours: number;
    requiredHours: number;
    remainingPages: number;
    reserveDays: number;
    pagesPerDay: number;
    progressPercent: number;
    feasibility: PlanningCalculation["feasibility"];
    riskLevel: PlanningCalculation["riskLevel"];
    explanation: string;
  };
  phases: Array<{
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    estimatedHours: number;
    expectedOutput: string;
    priority: "low" | "medium" | "high" | "critical";
    dependencies: string[];
    status: PlanningTaskStatus;
  }>;
  dailySchedule: Array<{
    date: string;
    dayGoal: string;
    targetPages: number;
    tasks: PlanningTask[];
  }>;
  milestones: Array<{
    id: string;
    title: string;
    date: string;
    acceptanceCriteria: string;
  }>;
  risks: Array<{
    id: string;
    level: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    mitigation: string;
  }>;
  recommendations: string[];
};

type AttachmentExtraction = {
  name: string;
  type: string;
  size: number;
  extractedText: string;
  status: "read" | "metadata-only" | "failed";
  warning?: string;
};

type RegenerateTaskRequest = {
  action: "regenerate-task";
  language?: string;
  workTitle?: string;
  day?: {
    date?: string;
    dayGoal?: string;
  };
  task?: Partial<PlanningTask>;
  summary?: Partial<PlanningResponse["summary"]>;
  activeProfile?: SavedProfile | null;
};

const STATUS_KEYS: PlanningStatusKey[] = [
  "topicApproval",
  "assignmentApproval",
  "outline",
  "sources",
  "theoreticalPart",
  "practicalPart",
  "research",
  "dataAnalysis",
  "discussion",
  "conclusion",
  "citations",
  "formatting",
  "proofreading",
];

const STATUS_VALUES = new Set<PlanningTaskStatus>([
  "not-started",
  "in-progress",
  "completed",
  "not-applicable",
]);

const WORK_TYPES = new Set<PlanningWorkType>([
  "seminar",
  "bachelor",
  "master",
  "project",
  "other",
]);

const PREFERRED_TIMES = new Set<PreferredTime>([
  "morning",
  "afternoon",
  "evening",
  "custom",
]);

const STATUS_HOUR_WEIGHTS: Record<PlanningStatusKey, number> = {
  topicApproval: 2,
  assignmentApproval: 2,
  outline: 4,
  sources: 8,
  theoreticalPart: 14,
  practicalPart: 18,
  research: 16,
  dataAnalysis: 14,
  discussion: 7,
  conclusion: 5,
  citations: 8,
  formatting: 6,
  proofreading: 7,
};

const STATUS_LABELS_SK: Record<PlanningStatusKey, string> = {
  topicApproval: "schválenie témy",
  assignmentApproval: "schválenie zadania",
  outline: "osnova",
  sources: "odborné zdroje",
  theoreticalPart: "teoretická časť",
  practicalPart: "praktická časť",
  research: "výskum alebo zber dát",
  dataAnalysis: "analýza dát",
  discussion: "diskusia",
  conclusion: "záver",
  citations: "citácie a bibliografia",
  formatting: "formátovanie",
  proofreading: "jazyková korektúra",
};

type PlanningDefaults = {
  title: string;
  targetPages: number;
  hoursPerDay: number;
  daysPerWeek: number;
  availableWeekdays: number[];
  preferredTime: PreferredTime;
  maxBlockHours: number;
  priorities: string[];
};

const PLANNING_DEFAULTS: Record<PlanningWorkType, PlanningDefaults> = {
  seminar: {
    title: "Seminar paper",
    targetPages: 15,
    hoursPerDay: 1.5,
    daysPerWeek: 5,
    availableWeekdays: [1, 2, 3, 4, 5],
    preferredTime: "evening",
    maxBlockHours: 1.5,
    priorities: [
      "Meet the submission deadline",
      "Maintain academic quality",
      "Verify citations and bibliography",
      "Create a reserve before submission",
    ],
  },
  bachelor: {
    title: "Bachelor thesis",
    targetPages: 50,
    hoursPerDay: 2,
    daysPerWeek: 5,
    availableWeekdays: [1, 2, 3, 4, 5],
    preferredTime: "evening",
    maxBlockHours: 1.5,
    priorities: [
      "Meet the submission deadline",
      "Maintain academic quality",
      "Complete the practical part",
      "Complete research and analysis",
      "Verify citations and bibliography",
      "Create a reserve before submission",
    ],
  },
  master: {
    title: "Master thesis",
    targetPages: 70,
    hoursPerDay: 2.5,
    daysPerWeek: 6,
    availableWeekdays: [1, 2, 3, 4, 5, 6],
    preferredTime: "evening",
    maxBlockHours: 2,
    priorities: [
      "Meet the submission deadline",
      "Maintain academic quality",
      "Complete the practical part",
      "Complete research and analysis",
      "Verify citations and bibliography",
      "Create a reserve before submission",
    ],
  },
  project: {
    title: "Academic project",
    targetPages: 35,
    hoursPerDay: 2,
    daysPerWeek: 5,
    availableWeekdays: [1, 2, 3, 4, 5],
    preferredTime: "afternoon",
    maxBlockHours: 2,
    priorities: [
      "Meet the submission deadline",
      "Maintain academic quality",
      "Complete implementation and documentation",
      "Create a reserve before submission",
    ],
  },
  other: {
    title: "Academic work",
    targetPages: 30,
    hoursPerDay: 2,
    daysPerWeek: 5,
    availableWeekdays: [1, 2, 3, 4, 5],
    preferredTime: "evening",
    maxBlockHours: 1.5,
    priorities: [
      "Meet the submission deadline",
      "Maintain academic quality",
      "Create a reserve before submission",
    ],
  },
};

function inferPlanningWorkType(
  value: unknown,
  profile?: SavedProfile | null,
): PlanningWorkType {
  const candidate = cleanText(value, 60).toLowerCase();

  if (WORK_TYPES.has(candidate as PlanningWorkType)) {
    return candidate as PlanningWorkType;
  }

  const profileType = cleanText(
    profile?.type || profile?.level,
    100,
  ).toLowerCase();

  if (profileType.includes("semin")) return "seminar";
  if (profileType.includes("bak") || profileType.includes("bachelor")) {
    return "bachelor";
  }
  if (
    profileType.includes("dipl") ||
    profileType.includes("mag") ||
    profileType.includes("master")
  ) {
    return "master";
  }
  if (profileType.includes("projekt") || profileType.includes("project")) {
    return "project";
  }

  return "other";
}

function createAutomaticPlanningStatus(): Record<
  PlanningStatusKey,
  PlanningTaskStatus
> {
  return {
    topicApproval: "completed",
    assignmentApproval: "completed",
    outline: "in-progress",
    sources: "in-progress",
    theoreticalPart: "not-started",
    practicalPart: "not-started",
    research: "not-started",
    dataAnalysis: "not-started",
    discussion: "not-started",
    conclusion: "not-started",
    citations: "not-started",
    formatting: "not-started",
    proofreading: "not-started",
  };
}

const RESPONSE_SCHEMA = {
  name: "academic_planning_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "summary",
      "phases",
      "dailySchedule",
      "milestones",
      "risks",
      "recommendations",
    ],
    properties: {
      summary: {
        type: "object",
        additionalProperties: false,
        required: ["explanation"],
        properties: {
          explanation: { type: "string" },
        },
      },
      phases: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "title",
            "startDate",
            "endDate",
            "estimatedHours",
            "expectedOutput",
            "priority",
            "dependencies",
            "status",
          ],
          properties: {
            title: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            estimatedHours: { type: "number" },
            expectedOutput: { type: "string" },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
            dependencies: {
              type: "array",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: [
                "not-started",
                "in-progress",
                "completed",
                "not-applicable",
              ],
            },
          },
        },
      },
      dailySchedule: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["date", "dayGoal", "targetPages", "tasks"],
          properties: {
            date: { type: "string" },
            dayGoal: { type: "string" },
            targetPages: { type: "number" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["time", "title", "deliverable", "checkpoint"],
                properties: {
                  time: { type: "string" },
                  title: { type: "string" },
                  deliverable: { type: "string" },
                  checkpoint: { type: "string" },
                },
              },
            },
          },
        },
      },
      milestones: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "date", "acceptanceCriteria"],
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            acceptanceCriteria: { type: "string" },
          },
        },
      },
      risks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["level", "title", "description", "mitigation"],
          properties: {
            level: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
            title: { type: "string" },
            description: { type: "string" },
            mitigation: { type: "string" },
          },
        },
      },
      recommendations: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
} as const;

const TASK_RESPONSE_SCHEMA = {
  name: "academic_planning_task",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["task"],
    properties: {
      task: {
        type: "object",
        additionalProperties: false,
        required: ["time", "title", "deliverable", "checkpoint"],
        properties: {
          time: { type: "string" },
          title: { type: "string" },
          deliverable: { type: "string" },
          checkpoint: { type: "string" },
        },
      },
    },
  },
} as const;

function cleanText(value: unknown, maxLength = 20_000): string {
  return String(value ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function cleanStringArray(value: unknown, maxItems = 30): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanText(item, 500))
    .filter(Boolean)
    .slice(0, maxItems);
}

function safeNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJson<T>(value: unknown): T | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toIsoDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIsoDateUtc(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function getTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function differenceInCalendarDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function normalizeLanguage(value: unknown): string {
  const normalized = cleanText(value, 20).toLowerCase();

  if (["sk", "slovak", "slovenčina", "slovencina"].includes(normalized)) {
    return "sk";
  }
  if (["cs", "cz", "czech", "čeština", "cestina"].includes(normalized)) {
    return "cs";
  }
  if (["en", "english", "angličtina", "anglictina"].includes(normalized)) {
    return "en";
  }
  if (["de", "german", "deutsch", "nemčina", "nemcina"].includes(normalized)) {
    return "de";
  }
  if (["pl", "polish", "polski", "poľština", "polstina"].includes(normalized)) {
    return "pl";
  }
  if (["hu", "hungarian", "magyar", "maďarčina", "madarcina"].includes(normalized)) {
    return "hu";
  }

  return normalized || "sk";
}

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    sk: "Slovak",
    cs: "Czech",
    en: "English",
    de: "German",
    pl: "Polish",
    hu: "Hungarian",
  };

  return names[normalizeLanguage(code)] || code || "Slovak";
}

function getProfileKeywords(profile?: SavedProfile | null): string {
  const keywords = profile?.keywordsList?.length
    ? profile.keywordsList
    : profile?.keywords;

  return Array.isArray(keywords) && keywords.length
    ? keywords.join(", ")
    : "not specified";
}

function normalizeStatus(value: unknown): PlanningTaskStatus {
  const status = cleanText(value, 40) as PlanningTaskStatus;
  return STATUS_VALUES.has(status) ? status : "not-started";
}

function normalizePlanningRequest(value: unknown): PlanningRequest {
  const root = isRecord(value) ? value : {};
  const activeProfile = isRecord(root.activeProfile)
    ? (root.activeProfile as SavedProfile)
    : isRecord(root.profile)
      ? (root.profile as SavedProfile)
      : null;

  const workType = inferPlanningWorkType(root.workType, activeProfile);
  const defaults = PLANNING_DEFAULTS[workType];
  const currentStatusSource = isRecord(root.currentStatus)
    ? root.currentStatus
    : {};
  const capacitySource = isRecord(root.capacity) ? root.capacity : {};
  const automaticStatus = createAutomaticPlanningStatus();

  const currentStatus = {} as Record<PlanningStatusKey, PlanningTaskStatus>;
  STATUS_KEYS.forEach((key) => {
    currentStatus[key] =
      key in currentStatusSource
        ? normalizeStatus(currentStatusSource[key])
        : automaticStatus[key];
  });

  const preferredTimeCandidate = cleanText(
    capacitySource.preferredTime,
    30,
  ) as PreferredTime;

  const requestedWeekdays = Array.isArray(capacitySource.availableWeekdays)
    ? Array.from(
        new Set(
          capacitySource.availableWeekdays
            .map((day) => Math.trunc(safeNumber(day, -1)))
            .filter((day) => day >= 0 && day <= 6),
        ),
      ).sort((a, b) => a - b)
    : [];

  const availableWeekdays =
    requestedWeekdays.length > 0
      ? requestedWeekdays
      : [...defaults.availableWeekdays];

  const unavailableDates = Array.isArray(capacitySource.unavailableDates)
    ? capacitySource.unavailableDates
        .map((date) => cleanText(date, 20))
        .filter((date) => Boolean(parseIsoDateUtc(date)))
    : [];

  const requestedTargetPages = Math.trunc(safeNumber(root.targetPages, 0));
  const targetPages =
    requestedTargetPages > 0
      ? requestedTargetPages
      : defaults.targetPages;

  const requestedCompletedPages = Math.trunc(
    safeNumber(root.completedPages, 0),
  );
  const completedPages = clamp(
    requestedCompletedPages,
    0,
    targetPages,
  );

  const requestedHoursPerDay = safeNumber(capacitySource.hoursPerDay, 0);
  const hoursPerDay =
    requestedHoursPerDay > 0
      ? clamp(requestedHoursPerDay, 0.5, 16)
      : defaults.hoursPerDay;

  const requestedDaysPerWeek = Math.trunc(
    safeNumber(capacitySource.daysPerWeek, 0),
  );
  const daysPerWeek = clamp(
    requestedDaysPerWeek > 0
      ? requestedDaysPerWeek
      : defaults.daysPerWeek,
    1,
    availableWeekdays.length,
  );

  const requestedMaxBlockHours = safeNumber(
    capacitySource.maxBlockHours,
    0,
  );
  const maxBlockHours = clamp(
    requestedMaxBlockHours > 0
      ? requestedMaxBlockHours
      : defaults.maxBlockHours,
    0.5,
    hoursPerDay,
  );

  const priorities = cleanStringArray(root.priorities, 12);

  return {
    action:
      root.action === "regenerate-task"
        ? "regenerate-task"
        : "generate-plan",
    requestId: cleanText(root.requestId, 200) || undefined,
    projectId:
      cleanText(root.projectId, 200) ||
      cleanText(root.profileId, 200) ||
      activeProfile?.id ||
      undefined,
    title:
      cleanText(root.title, 500) ||
      cleanText(activeProfile?.title, 500) ||
      cleanText(activeProfile?.topic, 500) ||
      defaults.title,
    workType,
    language: normalizeLanguage(
      root.language ||
        root.workLanguage ||
        activeProfile?.workLanguage ||
        activeProfile?.language,
    ),
    deadline: cleanText(
      root.deadline || root.submissionDate || root.dueDate,
      20,
    ),
    deadlineTime: cleanText(root.deadlineTime, 10) || "23:59",
    targetPages,
    completedPages,
    currentStatus,
    capacity: {
      hoursPerDay,
      daysPerWeek,
      availableWeekdays,
      unavailableDates,
      preferredTime: PREFERRED_TIMES.has(preferredTimeCandidate)
        ? preferredTimeCandidate
        : defaults.preferredTime,
      maxBlockHours,
    },
    priorities:
      priorities.length > 0
        ? priorities
        : [...defaults.priorities],
    constraints: cleanText(root.constraints, 5_000) || undefined,
    additionalInstructions:
      cleanText(
        root.additionalInstructions ||
          root.currentState ||
          root.input ||
          root.message,
        10_000,
      ) || undefined,
    activeProfile,
    attachmentIds: cleanStringArray(root.attachmentIds, 24),
    attachmentMetadata: Array.isArray(root.attachmentMetadata)
      ? root.attachmentMetadata
          .filter(isRecord)
          .map((item) => ({
            id: cleanText(item.id, 200) || undefined,
            name: cleanText(item.name, 500),
            size: safeNumber(item.size, 0),
            type: cleanText(item.type, 200) || undefined,
          }))
          .filter((item) => item.name)
          .slice(0, 24)
      : [],
  };
}

function createLegacyPlanningRequest(value: unknown): PlanningRequest {
  const root = isRecord(value) ? value : {};
  const profile = isRecord(root.activeProfile)
    ? (root.activeProfile as SavedProfile)
    : null;
  const currentState = cleanText(root.currentState || root.input || root.message);
  const deadline = cleanText(root.deadline, 20);

  const statuses = {} as Record<PlanningStatusKey, PlanningTaskStatus>;
  STATUS_KEYS.forEach((key) => {
    statuses[key] = "not-started";
  });

  return normalizePlanningRequest({
    title: profile?.title || profile?.topic || "Academic work",
    workType: "other",
    language: profile?.workLanguage || profile?.language || "sk",
    deadline,
    targetPages: 30,
    completedPages: 0,
    currentStatus: statuses,
    capacity: {
      hoursPerDay: 2,
      daysPerWeek: 5,
      availableWeekdays: [1, 2, 3, 4, 5],
      unavailableDates: [],
      preferredTime: "evening",
      maxBlockHours: 1.5,
    },
    priorities: [cleanText(root.priority, 500) || "Complete the work on time"],
    constraints: cleanText(root.availableTime, 2_000),
    additionalInstructions: currentState,
    activeProfile: profile,
  });
}

function validatePlanningRequest(request: PlanningRequest): string[] {
  const errors: string[] = [];
  const today = getTodayUtc();
  const deadline = parseIsoDateUtc(request.deadline);

  if (!request.title || request.title.length < 3) {
    errors.push("Chýba názov akademickej práce alebo profil práce.");
  }

  if (!WORK_TYPES.has(request.workType)) {
    errors.push("Vyberte platný druh akademickej práce.");
  }

  if (!deadline) {
    errors.push("Vyberte platný termín odovzdania.");
  } else if (deadline.getTime() <= today.getTime()) {
    errors.push("Termín odovzdania musí byť neskorší ako dnešný dátum.");
  }

  if (!Number.isInteger(request.targetPages) || request.targetPages < 1) {
    errors.push("The target page count must be at least 1.");
  }

  if (
    !Number.isInteger(request.completedPages) ||
    request.completedPages < 0 ||
    request.completedPages > request.targetPages
  ) {
    errors.push("Completed pages must be between 0 and the target page count.");
  }

  if (
    !Number.isFinite(request.capacity.hoursPerDay) ||
    request.capacity.hoursPerDay <= 0 ||
    request.capacity.hoursPerDay > 16
  ) {
    errors.push("Daily capacity must be between 0.5 and 16 hours.");
  }

  if (
    !Number.isInteger(request.capacity.daysPerWeek) ||
    request.capacity.daysPerWeek < 1 ||
    request.capacity.daysPerWeek > 7
  ) {
    errors.push("The number of working days per week must be between 1 and 7.");
  }

  if (request.capacity.availableWeekdays.length === 0) {
    errors.push("Select at least one available day of the week.");
  }

  if (request.capacity.availableWeekdays.length < request.capacity.daysPerWeek) {
    errors.push(
      "The selected weekdays are fewer than the declared working days per week.",
    );
  }

  if (
    !Number.isFinite(request.capacity.maxBlockHours) ||
    request.capacity.maxBlockHours < 0.5 ||
    request.capacity.maxBlockHours > request.capacity.hoursPerDay
  ) {
    errors.push(
      "The maximum work block must be between 0.5 hour and the daily capacity.",
    );
  }

  if (request.priorities.length === 0) {
    errors.push("Select at least one planning priority.");
  }

  return errors;
}

function calculateRequiredHours(request: PlanningRequest): number {
  const remainingPages = Math.max(0, request.targetPages - request.completedPages);

  const pageWritingHours = remainingPages * 1.15;
  const statusHours = STATUS_KEYS.reduce((total, key) => {
    const status = request.currentStatus[key];
    const weight = STATUS_HOUR_WEIGHTS[key];

    if (status === "completed" || status === "not-applicable") return total;
    if (status === "in-progress") return total + weight * 0.45;
    return total + weight;
  }, 0);

  return Math.round((pageWritingHours + statusHours) * 10) / 10;
}

function calculatePlanning(request: PlanningRequest): PlanningCalculation {
  const today = getTodayUtc();
  const deadline = parseIsoDateUtc(request.deadline);

  if (!deadline) {
    throw new Error("Invalid deadline.");
  }

  const unavailable = new Set(request.capacity.unavailableDates);
  const availableWeekdays = new Set(request.capacity.availableWeekdays);
  const availableDates: string[] = [];

  for (let current = today; current.getTime() <= deadline.getTime(); current = addUtcDays(current, 1)) {
    const iso = toIsoDateUtc(current);
    const weekday = current.getUTCDay();

    if (availableWeekdays.has(weekday) && !unavailable.has(iso)) {
      availableDates.push(iso);
    }
  }

  if (availableDates.length === 0) {
    throw new Error(
      "No available working day remains before the selected deadline.",
    );
  }

  const reserveDays = Math.min(
    Math.max(1, Math.ceil(availableDates.length * 0.1)),
    Math.max(1, availableDates.length - 1),
  );
  const productiveDays = Math.max(1, availableDates.length - reserveDays);
  const productiveDates = availableDates.slice(0, productiveDays);
  const reserveDates = availableDates.slice(productiveDays);
  const availableHours = availableDates.length * request.capacity.hoursPerDay;
  const productiveHours = productiveDays * request.capacity.hoursPerDay;
  const remainingPages = Math.max(0, request.targetPages - request.completedPages);
  const requiredHours = calculateRequiredHours(request);
  const workloadRatio = productiveHours > 0 ? requiredHours / productiveHours : 99;
  const pagesPerDay = productiveDays > 0 ? remainingPages / productiveDays : remainingPages;

  let feasibility: PlanningCalculation["feasibility"];
  let riskLevel: PlanningCalculation["riskLevel"];

  if (workloadRatio <= 0.75 && productiveDays >= 7) {
    feasibility = "realistic";
    riskLevel = "low";
  } else if (workloadRatio <= 1) {
    feasibility = "intensive";
    riskLevel = productiveDays < 5 ? "high" : "medium";
  } else if (workloadRatio <= 1.25) {
    feasibility = "high-risk";
    riskLevel = "high";
  } else {
    feasibility = "unrealistic";
    riskLevel = "critical";
  }

  return {
    today: toIsoDateUtc(today),
    deadline: request.deadline,
    calendarDays: differenceInCalendarDays(today, deadline) + 1,
    availableDates,
    productiveDates,
    reserveDates,
    availableDays: availableDates.length,
    productiveDays,
    reserveDays,
    availableHours: Math.round(availableHours * 10) / 10,
    productiveHours: Math.round(productiveHours * 10) / 10,
    remainingPages,
    requiredHours,
    hoursPerDay: request.capacity.hoursPerDay,
    pagesPerDay: Math.round(pagesPerDay * 10) / 10,
    workloadRatio: Math.round(workloadRatio * 100) / 100,
    feasibility,
    riskLevel,
  };
}

function getIncompleteStatusSummary(request: PlanningRequest): string {
  return STATUS_KEYS.map((key) => {
    const status = request.currentStatus[key];
    return `- ${STATUS_LABELS_SK[key]}: ${status}`;
  }).join("\n");
}

function buildProfileBlock(profile?: SavedProfile | null): string {
  if (!profile) return "No active profile was provided.";

  return [
    `Title: ${profile.title || "not specified"}`,
    `Topic: ${profile.topic || "not specified"}`,
    `Type: ${profile.type || profile.level || "not specified"}`,
    `Field: ${profile.field || "not specified"}`,
    `Expertise: ${
      profile.expertise ||
      profile.workExpertise ||
      profile.specializationLevel ||
      "not specified"
    }`,
    `Supervisor: ${profile.supervisor || "not specified"}`,
    `Citation style: ${profile.citation || "not specified"}`,
    `Goal: ${profile.goal || "not specified"}`,
    `Research problem: ${profile.problem || "not specified"}`,
    `Methodology: ${profile.methodology || "not specified"}`,
    `Research questions: ${profile.researchQuestions || "not specified"}`,
    `Hypotheses: ${profile.hypotheses || "not specified"}`,
    `Practical part: ${profile.practicalPart || "not specified"}`,
    `Sources requirement: ${profile.sourcesRequirement || "not specified"}`,
    `Keywords: ${getProfileKeywords(profile)}`,
  ].join("\n");
}

async function extractAttachment(file: File): Promise<AttachmentExtraction> {
  const name = cleanText(file.name, 500) || "attachment";
  const type = cleanText(file.type, 200) || "application/octet-stream";
  const extension = name.toLowerCase().match(/\.[^.]+$/)?.[0] || "";

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      name,
      type,
      size: file.size,
      extractedText: "",
      status: "failed",
      warning: "The attachment exceeds the 30 MB server limit.",
    };
  }

  try {
    if ([".txt", ".md", ".csv", ".rtf"].includes(extension)) {
      let text = cleanText(await file.text(), MAX_ATTACHMENT_TEXT_CHARS);

      if (extension === ".rtf") {
        text = text
          .replace(/\\par[d]?/g, "\n")
          .replace(/\\'[0-9a-fA-F]{2}/g, " ")
          .replace(/\\[a-zA-Z]+\d* ?/g, "")
          .replace(/[{}]/g, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
          .slice(0, MAX_ATTACHMENT_TEXT_CHARS);
      }

      return {
        name,
        type,
        size: file.size,
        extractedText: text,
        status: text ? "read" : "metadata-only",
        warning: text ? undefined : "The text attachment was empty.",
      };
    }

    if ([".xlsx", ".xls", ".xlsm"].includes(extension)) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });

      const sheetTexts = workbook.SheetNames.slice(0, 5).map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
        return `SHEET: ${sheetName}\n${csv}`;
      });

      const extractedText = cleanText(
        sheetTexts.join("\n\n"),
        MAX_ATTACHMENT_TEXT_CHARS,
      );

      return {
        name,
        type,
        size: file.size,
        extractedText,
        status: extractedText ? "read" : "metadata-only",
        warning: extractedText
          ? undefined
          : "The spreadsheet did not contain readable cells.",
      };
    }

    return {
      name,
      type,
      size: file.size,
      extractedText: "",
      status: "metadata-only",
      warning:
        "The file was received and listed in the planning context, but this route does not extract binary PDF/DOCX text without the project's shared attachment extractor.",
    };
  } catch (error) {
    return {
      name,
      type,
      size: file.size,
      extractedText: "",
      status: "failed",
      warning:
        error instanceof Error
          ? `Attachment extraction failed: ${error.message}`
          : "Attachment extraction failed.",
    };
  }
}

async function parseRequest(
  req: NextRequest,
): Promise<{
  payload: PlanningRequest | RegenerateTaskRequest;
  attachments: AttachmentExtraction[];
}> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const rawPayload =
      parseJson<Record<string, unknown>>(formData.get("payload")) ||
      parseJson<Record<string, unknown>>(formData.get("planningRequest")) ||
      Object.fromEntries(
        Array.from(formData.entries()).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );

    const action = cleanText(rawPayload.action, 50);
    const payload =
      action === "regenerate-task"
        ? ({ ...rawPayload, action: "regenerate-task" } as RegenerateTaskRequest)
        : normalizePlanningRequest(rawPayload);

    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File)
      .slice(0, 24);

    const attachments = await Promise.all(files.map(extractAttachment));

    return { payload, attachments };
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.action === "regenerate-task") {
    return {
      payload: body as RegenerateTaskRequest,
      attachments: [],
    };
  }

  // Všetky plánovacie požiadavky používajú jednu normalizačnú vrstvu.
  // Minimalistický frontend môže poslať iba workType, deadline a profil;
  // server doplní odborné predvoľby pre rozsah, kapacitu, etapy a priority.
  const structured = normalizePlanningRequest(body);

  return { payload: structured, attachments: [] };
}

function buildAttachmentContext(attachments: AttachmentExtraction[]): string {
  if (!attachments.length) {
    return "No attachments were supplied.";
  }

  let usedCharacters = 0;

  return attachments
    .map((attachment, index) => {
      const remaining = Math.max(
        0,
        MAX_TOTAL_ATTACHMENT_TEXT_CHARS - usedCharacters,
      );
      const text = attachment.extractedText.slice(0, remaining);
      usedCharacters += text.length;

      return [
        `Attachment ${index + 1}: ${attachment.name}`,
        `Type: ${attachment.type}`,
        `Size: ${attachment.size} bytes`,
        `Status: ${attachment.status}`,
        attachment.warning ? `Warning: ${attachment.warning}` : "",
        text ? `Extracted content:\n${text}` : "No extracted content available.",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n------------------------------\n\n");
}

function buildPlanningPrompt(
  request: PlanningRequest,
  calculation: PlanningCalculation,
  attachments: AttachmentExtraction[],
): string {
  const languageName = getLanguageName(request.language);
  const statusSummary = getIncompleteStatusSummary(request);

  return `
You are a senior academic project planner, thesis supervisor and project manager.
Create a concrete, mathematically feasible academic work plan.

OUTPUT LANGUAGE
Write every user-facing sentence in ${languageName}.
Keep ISO dates in YYYY-MM-DD format.
Return JSON only and follow the supplied JSON schema exactly.

NON-NEGOTIABLE CALCULATION
The following figures were calculated by the server. Do not alter, recalculate or contradict them:
- Today: ${calculation.today}
- Submission deadline: ${calculation.deadline}
- Calendar days including today and deadline: ${calculation.calendarDays}
- Available working dates: ${calculation.availableDates.join(", ")}
- Productive working dates: ${calculation.productiveDates.join(", ")}
- Reserve dates: ${calculation.reserveDates.join(", ") || "none"}
- Available working days: ${calculation.availableDays}
- Productive days before reserve: ${calculation.productiveDays}
- Reserve days: ${calculation.reserveDays}
- Total available hours: ${calculation.availableHours}
- Productive hours before reserve: ${calculation.productiveHours}
- Estimated required hours: ${calculation.requiredHours}
- Remaining pages: ${calculation.remainingPages}
- Required average pages per productive day: ${calculation.pagesPerDay}
- Workload ratio: ${calculation.workloadRatio}
- Feasibility: ${calculation.feasibility}
- Risk level: ${calculation.riskLevel}

ACADEMIC WORK
- Title: ${request.title}
- Work type: ${request.workType}
- Target pages: ${request.targetPages}
- Completed pages: ${request.completedPages}
- Preferred work time: ${request.capacity.preferredTime}
- Maximum work block: ${request.capacity.maxBlockHours} hours
- Priorities: ${request.priorities.join("; ")}
- Constraints: ${request.constraints || "none stated"}
- Additional instructions: ${request.additionalInstructions || "none stated"}

CURRENT STATUS
${statusSummary}

ACTIVE PROFILE
${buildProfileBlock(request.activeProfile)}

ATTACHMENTS
${buildAttachmentContext(attachments)}

PLANNING RULES
1. Use only productive working dates for writing, research and analysis tasks.
2. Use reserve dates for final review, citation control, formatting, export, technical problems and submission.
3. Do not create any date before ${calculation.today} or after ${calculation.deadline}.
4. The final day must not be dedicated entirely to new writing.
5. Each phase must have a measurable expected output and realistic dependency.
6. Daily tasks must fit within ${request.capacity.hoursPerDay} hours and individual blocks should normally not exceed ${request.capacity.maxBlockHours} hours.
7. Daily target pages must be realistic and sum approximately to the remaining page count where writing is still needed.
8. If feasibility is high-risk or unrealistic, state this clearly and recommend a concrete adjustment: increase capacity, reduce scope, move deadline, obtain help or remove non-essential work.
9. Include milestones for outline, theory, practical/research work, results, discussion, citations, proofreading, formatting and submission only when relevant to the current status.
10. Do not invent sources, research results, supervisor approvals or completed work.
11. Make the plan operational: every task needs a deliverable and checkpoint.
12. Provide at least three phases, at least three milestones, at least two risks and at least three recommendations.
13. Create one daily schedule entry for every productive working date. Create reserve-day entries as well, but only for review, correction, export and submission activities.
14. If the date range is long, keep each day concise while preserving a complete schedule.

SUMMARY EXPLANATION
The summary explanation must accurately explain the fixed feasibility and risk values. It may not claim that the plan is realistic when the fixed feasibility is high-risk or unrealistic.
`.trim();
}

function parseModelJson(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

function safePriority(value: unknown): "low" | "medium" | "high" | "critical" {
  return ["low", "medium", "high", "critical"].includes(String(value))
    ? (value as "low" | "medium" | "high" | "critical")
    : "medium";
}

function ensureAllowedDate(
  value: unknown,
  calculation: PlanningCalculation,
  fallback: string,
): string {
  const date = cleanText(value, 20);
  const parsed = parseIsoDateUtc(date);
  const today = parseIsoDateUtc(calculation.today);
  const deadline = parseIsoDateUtc(calculation.deadline);

  if (!parsed || !today || !deadline) return fallback;
  if (parsed.getTime() < today.getTime() || parsed.getTime() > deadline.getTime()) {
    return fallback;
  }

  return date;
}

function normalizePlan(
  raw: unknown,
  request: PlanningRequest,
  calculation: PlanningCalculation,
): PlanningResponse {
  if (!isRecord(raw)) {
    throw new Error("The AI response is not a JSON object.");
  }

  const rawSummary = isRecord(raw.summary) ? raw.summary : {};
  const phaseSource = Array.isArray(raw.phases) ? raw.phases : [];
  const daySource = Array.isArray(raw.dailySchedule) ? raw.dailySchedule : [];
  const milestoneSource = Array.isArray(raw.milestones) ? raw.milestones : [];
  const riskSource = Array.isArray(raw.risks) ? raw.risks : [];

  const phases = phaseSource
    .filter(isRecord)
    .map((phase, index) => {
      const fallbackStart =
        calculation.productiveDates[Math.min(index, calculation.productiveDates.length - 1)] ||
        calculation.today;
      const fallbackEnd =
        calculation.productiveDates[
          Math.min(index + 1, calculation.productiveDates.length - 1)
        ] || fallbackStart;

      return {
        id: `phase-${index + 1}`,
        title: cleanText(phase.title, 500) || `Phase ${index + 1}`,
        startDate: ensureAllowedDate(phase.startDate, calculation, fallbackStart),
        endDate: ensureAllowedDate(phase.endDate, calculation, fallbackEnd),
        estimatedHours: Math.max(0.5, safeNumber(phase.estimatedHours, 1)),
        expectedOutput:
          cleanText(phase.expectedOutput, 2_000) || "A measurable academic output.",
        priority: safePriority(phase.priority),
        dependencies: cleanStringArray(phase.dependencies, 10),
        status: normalizeStatus(phase.status),
      };
    })
    .slice(0, 12);

  const dailySchedule = daySource
    .filter(isRecord)
    .map((day, dayIndex) => {
      const fallbackDate =
        calculation.availableDates[
          Math.min(dayIndex, calculation.availableDates.length - 1)
        ] || calculation.deadline;
      const date = ensureAllowedDate(day.date, calculation, fallbackDate);
      const taskSource = Array.isArray(day.tasks) ? day.tasks : [];

      return {
        date,
        dayGoal: cleanText(day.dayGoal, 1_000) || "Complete the planned daily output.",
        targetPages: Math.max(0, safeNumber(day.targetPages, 0)),
        tasks: taskSource
          .filter(isRecord)
          .map((task, taskIndex): PlanningTask => ({
            id: `task-${date}-${taskIndex + 1}`,
            time: cleanText(task.time, 100) || "Flexible block",
            title: cleanText(task.title, 1_000) || `Task ${taskIndex + 1}`,
            deliverable:
              cleanText(task.deliverable, 1_500) || "Completed planned output.",
            checkpoint:
              cleanText(task.checkpoint, 1_500) || "Verify completion and quality.",
          }))
          .slice(0, 8),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const milestones = milestoneSource
    .filter(isRecord)
    .map((milestone, index) => ({
      id: `milestone-${index + 1}`,
      title: cleanText(milestone.title, 500) || `Milestone ${index + 1}`,
      date: ensureAllowedDate(
        milestone.date,
        calculation,
        calculation.availableDates[
          Math.min(index, calculation.availableDates.length - 1)
        ] || calculation.deadline,
      ),
      acceptanceCriteria:
        cleanText(milestone.acceptanceCriteria, 1_500) ||
        "The planned output is complete and quality-checked.",
    }))
    .slice(0, 20);

  const risks = riskSource
    .filter(isRecord)
    .map((risk, index) => ({
      id: `risk-${index + 1}`,
      level: safePriority(risk.level),
      title: cleanText(risk.title, 500) || `Risk ${index + 1}`,
      description: cleanText(risk.description, 1_500) || "Planning risk.",
      mitigation:
        cleanText(risk.mitigation, 1_500) || "Review capacity and update the plan.",
    }))
    .slice(0, 12);

  const recommendations = cleanStringArray(raw.recommendations, 20);

  if (phases.length < 1 || dailySchedule.length < 1 || milestones.length < 1) {
    throw new Error(
      "The AI response is incomplete: phases, daily schedule or milestones are missing.",
    );
  }

  return {
    summary: {
      availableDays: calculation.availableDays,
      productiveDays: calculation.productiveDays,
      availableHours: calculation.availableHours,
      productiveHours: calculation.productiveHours,
      requiredHours: calculation.requiredHours,
      remainingPages: calculation.remainingPages,
      reserveDays: calculation.reserveDays,
      pagesPerDay: calculation.pagesPerDay,
      progressPercent:
        request.targetPages > 0
          ? Math.round(
              (Math.min(request.completedPages, request.targetPages) /
                request.targetPages) *
                100,
            )
          : 0,
      feasibility: calculation.feasibility,
      riskLevel: calculation.riskLevel,
      explanation:
        cleanText(rawSummary.explanation, 3_000) ||
        "The feasibility assessment is based on the calculated workload and available capacity.",
    },
    phases,
    dailySchedule,
    milestones,
    risks,
    recommendations:
      recommendations.length > 0
        ? recommendations
        : [
            "Review progress after each working block.",
            "Keep the reserve days free for final control and submission.",
            "Consult unresolved methodological issues before they block later phases.",
          ],
  };
}


type PlanningPhaseDefinition = {
  key: string;
  title: string;
  expectedOutput: string;
  keys: PlanningStatusKey[];
  priority: "low" | "medium" | "high" | "critical";
};

function getFallbackPlanningCopy(languageValue: string) {
  const language = normalizeLanguage(languageValue);
  const slovak = language === "sk";
  const czech = language === "cs";

  if (slovak || czech) {
    const sk = slovak;

    return {
      summaryRealistic: sk
        ? "Plán vychádza z reálnej kapacity, zostávajúceho rozsahu a aktuálneho stavu práce. Produktívne dni sú oddelené od rezervy na kontrolu a odovzdanie."
        : "Plán vychází z reálné kapacity, zbývajícího rozsahu a aktuálního stavu práce. Produktivní dny jsou odděleny od rezervy na kontrolu a odevzdání.",
      summaryIntensive: sk
        ? "Plán je realizovateľný iba pri disciplinovanom využití dostupnej kapacity. Každý pracovný blok musí skončiť merateľným výstupom."
        : "Plán je proveditelný pouze při disciplinovaném využití dostupné kapacity. Každý pracovní blok musí skončit měřitelným výstupem.",
      summaryRisk: sk
        ? "Plán má vysoké časové riziko. Odporúča sa zvýšiť dennú kapacitu, znížiť rozsah alebo posunúť termín."
        : "Plán má vysoké časové riziko. Doporučuje se zvýšit denní kapacitu, snížit rozsah nebo posunout termín.",
      summaryUnrealistic: sk
        ? "Aktuálny rozsah nie je pri zadanej kapacite realisticky dokončiteľný. Bez zmeny termínu, kapacity alebo rozsahu hrozí nedokončenie práce."
        : "Aktuální rozsah není při zadané kapacitě realisticky dokončitelný. Bez změny termínu, kapacity nebo rozsahu hrozí nedokončení práce.",
      phases: {
        setup: sk
          ? "Zadanie, osnova a odborné zdroje"
          : "Zadání, osnova a odborné zdroje",
        theory: sk ? "Teoretická časť" : "Teoretická část",
        research: sk
          ? "Praktická časť, výskum a analýza"
          : "Praktická část, výzkum a analýza",
        synthesis: sk
          ? "Diskusia, záver a odborná syntéza"
          : "Diskuse, závěr a odborná syntéza",
        finalization: sk
          ? "Citácie, formátovanie a korektúra"
          : "Citace, formátování a korektura",
      },
      outputs: {
        setup: sk
          ? "Schválená a logicky usporiadaná osnova s pripraveným zoznamom relevantných odborných zdrojov."
          : "Schválená a logicky uspořádaná osnova s připraveným seznamem relevantních odborných zdrojů.",
        theory: sk
          ? "Ucelená teoretická časť s odbornou argumentáciou a priebežnými citáciami."
          : "Ucelená teoretická část s odbornou argumentací a průběžnými citacemi.",
        research: sk
          ? "Dokončená metodika, praktická časť, zber alebo spracovanie dát a overiteľné analytické výstupy."
          : "Dokončená metodika, praktická část, sběr nebo zpracování dat a ověřitelné analytické výstupy.",
        synthesis: sk
          ? "Diskusia výsledkov, odpovede na ciele alebo výskumné otázky a vecne formulovaný záver."
          : "Diskuse výsledků, odpovědi na cíle nebo výzkumné otázky a věcně formulovaný závěr.",
        finalization: sk
          ? "Kompletný dokument s jednotnými citáciami, bibliografiou, formátovaním a jazykovou korektúrou."
          : "Kompletní dokument s jednotnými citacemi, bibliografií, formátováním a jazykovou korekturou.",
      },
      milestone: sk ? "Kontrolný bod" : "Kontrolní bod",
      accepted: sk
        ? "Výstup je dokončený, skontrolovaný a pripravený na nadväzujúcu etapu."
        : "Výstup je dokončený, zkontrolovaný a připravený na navazující etapu.",
      dayGoal: sk
        ? "Dokončiť plánovaný merateľný výstup etapy"
        : "Dokončit plánovaný měřitelný výstup etapy",
      writingTask: sk
        ? "Spracovať prioritnú časť akademického textu"
        : "Zpracovat prioritní část akademického textu",
      writingDeliverable: sk
        ? "Hotový a uložený text v plánovanom rozsahu"
        : "Hotový a uložený text v plánovaném rozsahu",
      writingCheckpoint: sk
        ? "Text je odborne súvislý, neobsahuje zjavné duplicity a nadväzuje na osnovu"
        : "Text je odborně souvislý, neobsahuje zjevné duplicity a navazuje na osnovu",
      reviewTask: sk
        ? "Skontrolovať formátovanie, citácie, súbory a pripravenosť odovzdania"
        : "Zkontrolovat formátování, citace, soubory a připravenost odevzdání",
      reviewDeliverable: sk
        ? "Verzia akademickej práce pripravená na odovzdanie"
        : "Verze akademické práce připravená k odevzdání",
      reviewCheckpoint: sk
        ? "Všetky povinné súbory sa správne otvárajú a finálna verzia je pripravená na odovzdanie"
        : "Všechny povinné soubory se správně otevírají a finální verze je připravena k odevzdání",
      reserveGoal: sk
        ? "Finálna kontrola, export a príprava odovzdania"
        : "Finální kontrola, export a příprava odevzdání",
      submission: sk
        ? "Finálna kontrola a odovzdanie"
        : "Finální kontrola a odevzdání",
      risks: {
        capacityTitle: sk
          ? "Nedostatočná časová kapacita"
          : "Nedostatečná časová kapacita",
        capacityDescription: sk
          ? "Požadovaný rozsah práce presahuje produktívny čas dostupný do termínu."
          : "Požadovaný rozsah práce přesahuje produktivní čas dostupný do termínu.",
        capacityMitigation: sk
          ? "Zvýšte dennú kapacitu, znížte rozsah alebo posuňte termín odovzdania."
          : "Zvyšte denní kapacitu, snižte rozsah nebo posuňte termín odevzdání.",
        delayTitle: sk ? "Posun kľúčovej etapy" : "Posun klíčové etapy",
        delayDescription: sk
          ? "Oneskorenie výskumu, analýzy alebo teoretickej časti skráti rezervu na kontrolu."
          : "Zpoždění výzkumu, analýzy nebo teoretické části zkrátí rezervu na kontrolu.",
        delayMitigation: sk
          ? "Po každom pracovnom dni aktualizujte stav etáp a rizikovú etapu riešte ako prvú."
          : "Po každém pracovním dni aktualizujte stav etap a rizikovou etapu řešte jako první.",
        qualityTitle: sk
          ? "Pokles odbornej kvality pri zrýchlení"
          : "Pokles odborné kvality při zrychlení",
        qualityDescription: sk
          ? "Pri časovom tlaku môže vzniknúť nejednotná argumentácia, slabé citácie alebo formálne chyby."
          : "Při časovém tlaku může vzniknout nejednotná argumentace, slabé citace nebo formální chyby.",
        qualityMitigation: sk
          ? "Dodržte kontrolné body, priebežne kontrolujte citácie a rezervné dni nepoužívajte na nové písanie."
          : "Dodržte kontrolní body, průběžně kontrolujte citace a rezervní dny nepoužívejte na nové psaní.",
      },
      recommendations: sk
        ? [
            "Na konci každého pracovného bloku zapíšte hotový výstup a aktualizujte stav etapy.",
            "Najrizikovejšiu alebo závislú etapu začnite skôr, než je uvedené v minimálnom harmonograme.",
            "Rezervné dni ponechajte iba na korektúru, formátovanie, export a technické odovzdanie.",
            "Nejasné metodické otázky konzultujte skôr, ako zablokujú zber dát alebo analýzu.",
          ]
        : [
            "Po každém pracovním bloku zapište hotový výstup a aktualizujte stav etapy.",
            "Nejrizikovější nebo závislou etapu začněte co nejdříve.",
            "Rezervní dny ponechte pouze na korekturu, formátování, export a odevzdání.",
            "Nejasné metodické otázky konzultujte dříve, než zablokují výzkum nebo analýzu.",
          ],
    };
  }

  return {
    summaryRealistic:
      "The plan is based on the available capacity, remaining scope and current progress. Productive days are separated from the final review reserve.",
    summaryIntensive:
      "The plan is achievable only with disciplined use of the available capacity.",
    summaryRisk:
      "The plan carries a high schedule risk. Increase capacity, reduce scope or move the deadline.",
    summaryUnrealistic:
      "The current scope cannot realistically be completed with the stated capacity.",
    phases: {
      setup: "Assignment, outline and academic sources",
      theory: "Theoretical part",
      research: "Practical part, research and analysis",
      synthesis: "Discussion, conclusion and synthesis",
      finalization: "Citations, formatting and proofreading",
    },
    outputs: {
      setup: "Approved outline and a prepared list of relevant academic sources.",
      theory: "Complete theoretical section with coherent structure and citations.",
      research: "Completed methodology, practical work and verifiable analytical outputs.",
      synthesis: "Discussion of results and a clear evidence-based conclusion.",
      finalization: "Submission-ready document with citations, bibliography and proofreading.",
    },
    milestone: "Milestone",
    accepted: "The output is complete, quality-checked and ready for the next phase.",
    dayGoal: "Complete the measurable output planned for the phase",
    writingTask: "Complete the priority academic writing block",
    writingDeliverable: "Saved academic text in the planned scope",
    writingCheckpoint: "The text is coherent, evidence-based and follows the outline",
    reviewTask: "Review formatting, citations, files and submission readiness",
    reviewDeliverable: "Submission-ready version of the academic work",
    reviewCheckpoint: "All mandatory files are ready for submission",
    reserveGoal: "Final review, export and submission preparation",
    submission: "Final review and submission",
    risks: {
      capacityTitle: "Insufficient time capacity",
      capacityDescription: "The required scope exceeds the productive time available.",
      capacityMitigation: "Increase capacity, reduce scope or move the deadline.",
      delayTitle: "Delay of a critical phase",
      delayDescription: "A delay in a dependent phase reduces the final review reserve.",
      delayMitigation: "Update progress daily and prioritize the at-risk phase.",
      qualityTitle: "Quality loss under time pressure",
      qualityDescription: "Time pressure can create citation, logic and formatting defects.",
      qualityMitigation: "Use checkpoints and preserve reserve days for quality control.",
    },
    recommendations: [
      "Update the phase status after every work block.",
      "Start the highest-risk dependent phase as early as possible.",
      "Keep reserve days for review, export and submission only.",
      "Resolve methodological questions before they block research or analysis.",
    ],
  };
}

function calculatePhaseStatus(
  request: PlanningRequest,
  keys: PlanningStatusKey[],
): PlanningTaskStatus {
  const statuses = keys.map((key) => request.currentStatus[key]);

  if (
    statuses.every(
      (status) => status === "completed" || status === "not-applicable",
    )
  ) {
    return "completed";
  }

  if (statuses.some((status) => status === "in-progress")) {
    return "in-progress";
  }

  return "not-started";
}

function calculatePhaseHours(
  request: PlanningRequest,
  keys: PlanningStatusKey[],
): number {
  return Math.max(
    1,
    Math.round(
      keys.reduce((total, key) => {
        const status = request.currentStatus[key];
        const weight = STATUS_HOUR_WEIGHTS[key];

        if (status === "completed" || status === "not-applicable") {
          return total;
        }

        if (status === "in-progress") {
          return total + weight * 0.45;
        }

        return total + weight;
      }, 0) * 10,
    ) / 10,
  );
}

function createDeterministicPlan(
  request: PlanningRequest,
  calculation: PlanningCalculation,
): PlanningResponse {
  const copy = getFallbackPlanningCopy(request.language);
  const definitions: PlanningPhaseDefinition[] = [
    {
      key: "setup",
      title: copy.phases.setup,
      expectedOutput: copy.outputs.setup,
      keys: ["topicApproval", "assignmentApproval", "outline", "sources"],
      priority: "high",
    },
    {
      key: "theory",
      title: copy.phases.theory,
      expectedOutput: copy.outputs.theory,
      keys: ["theoreticalPart"],
      priority: "high",
    },
    {
      key: "research",
      title: copy.phases.research,
      expectedOutput: copy.outputs.research,
      keys: ["practicalPart", "research", "dataAnalysis"],
      priority: "critical",
    },
    {
      key: "synthesis",
      title: copy.phases.synthesis,
      expectedOutput: copy.outputs.synthesis,
      keys: ["discussion", "conclusion"],
      priority: "high",
    },
    {
      key: "finalization",
      title: copy.phases.finalization,
      expectedOutput: copy.outputs.finalization,
      keys: ["citations", "formatting", "proofreading"],
      priority: "medium",
    },
  ];

  let activeDefinitions = definitions.filter(
    (definition) =>
      calculatePhaseStatus(request, definition.keys) !== "completed",
  );

  if (activeDefinitions.length < 3) {
    activeDefinitions = definitions.slice(-3);
  }

  const productiveDates =
    calculation.productiveDates.length > 0
      ? calculation.productiveDates
      : calculation.availableDates;
  const phaseWeights = activeDefinitions.map((definition) =>
    calculatePhaseHours(request, definition.keys),
  );
  const totalWeight = Math.max(
    1,
    phaseWeights.reduce((total, value) => total + value, 0),
  );

  let dateCursor = 0;
  const phases = activeDefinitions.map((definition, index) => {
    const remainingPhases = activeDefinitions.length - index;
    const remainingDates = Math.max(1, productiveDates.length - dateCursor);
    const proportionalCount =
      index === activeDefinitions.length - 1
        ? remainingDates
        : Math.max(
            1,
            Math.round(
              (productiveDates.length * phaseWeights[index]) / totalWeight,
            ),
          );
    const maximumForThisPhase = Math.max(
      1,
      remainingDates - Math.max(0, remainingPhases - 1),
    );
    const phaseDateCount = Math.min(proportionalCount, maximumForThisPhase);
    const startDate =
      productiveDates[Math.min(dateCursor, productiveDates.length - 1)] ||
      calculation.today;
    const endIndex = Math.min(
      productiveDates.length - 1,
      dateCursor + phaseDateCount - 1,
    );
    const endDate = productiveDates[endIndex] || startDate;

    dateCursor = Math.min(productiveDates.length, endIndex + 1);

    return {
      id: `phase-${index + 1}`,
      title: definition.title,
      startDate,
      endDate,
      estimatedHours: phaseWeights[index],
      expectedOutput: definition.expectedOutput,
      priority: definition.priority,
      dependencies:
        index > 0 ? [activeDefinitions[index - 1].title] : [],
      status: calculatePhaseStatus(request, definition.keys),
    };
  });

  const remainingPages = calculation.remainingPages;
  const productiveDayCount = Math.max(1, productiveDates.length);
  let assignedPages = 0;

  const dailySchedule = calculation.availableDates.map((date, dayIndex) => {
    const isReserve = calculation.reserveDates.includes(date);

    if (isReserve) {
      return {
        date,
        dayGoal: copy.reserveGoal,
        targetPages: 0,
        tasks: [
          {
            id: `task-${date}-1`,
            time: request.capacity.preferredTime,
            title: copy.reviewTask,
            deliverable: copy.reviewDeliverable,
            checkpoint: copy.reviewCheckpoint,
          },
        ],
      };
    }

    const phase =
      phases.find(
        (item) => date >= item.startDate && date <= item.endDate,
      ) || phases[Math.min(dayIndex, phases.length - 1)];
    const productiveIndex = productiveDates.indexOf(date);
    const isLastProductiveDay =
      productiveIndex === productiveDates.length - 1;
    const targetPages =
      remainingPages > 0
        ? isLastProductiveDay
          ? Math.max(0, Math.round((remainingPages - assignedPages) * 10) / 10)
          : Math.max(
              0,
              Math.round((remainingPages / productiveDayCount) * 10) / 10,
            )
        : 0;

    assignedPages = Math.round((assignedPages + targetPages) * 10) / 10;

    const blockCount = Math.max(
      1,
      Math.ceil(
        request.capacity.hoursPerDay /
          Math.max(0.5, request.capacity.maxBlockHours),
      ),
    );
    const tasks: PlanningTask[] = Array.from(
      { length: Math.min(3, blockCount) },
      (_, taskIndex) => ({
        id: `task-${date}-${taskIndex + 1}`,
        time:
          request.capacity.preferredTime === "custom"
            ? `Block ${taskIndex + 1}`
            : `${request.capacity.preferredTime} · block ${taskIndex + 1}`,
        title:
          taskIndex === 0
            ? `${copy.writingTask}: ${phase.title}`
            : taskIndex === 1
              ? `${copy.milestone}: ${phase.title}`
              : copy.reviewTask,
        deliverable:
          taskIndex === 0
            ? `${copy.writingDeliverable}${
                targetPages > 0 ? ` (${targetPages} pages)` : ""
              }`
            : taskIndex === 1
              ? phase.expectedOutput
              : copy.reviewDeliverable,
        checkpoint:
          taskIndex === 0
            ? copy.writingCheckpoint
            : taskIndex === 1
              ? copy.accepted
              : copy.reviewCheckpoint,
      }),
    );

    return {
      date,
      dayGoal: `${copy.dayGoal}: ${phase.title}`,
      targetPages,
      tasks,
    };
  });

  const milestones = phases.map((phase, index) => ({
    id: `milestone-${index + 1}`,
    title: `${copy.milestone} ${index + 1}: ${phase.title}`,
    date: phase.endDate,
    acceptanceCriteria: copy.accepted,
  }));

  if (
    milestones.length === 0 ||
    milestones[milestones.length - 1].date !== calculation.deadline
  ) {
    milestones.push({
      id: `milestone-${milestones.length + 1}`,
      title: copy.submission,
      date: calculation.deadline,
      acceptanceCriteria: copy.reviewCheckpoint,
    });
  }

  const risks: PlanningResponse["risks"] = [
    {
      id: "risk-capacity",
      level:
        calculation.riskLevel === "critical"
          ? "critical"
          : calculation.riskLevel === "high"
            ? "high"
            : "medium",
      title: copy.risks.capacityTitle,
      description: copy.risks.capacityDescription,
      mitigation: copy.risks.capacityMitigation,
    },
    {
      id: "risk-delay",
      level: calculation.productiveDays < 7 ? "high" : "medium",
      title: copy.risks.delayTitle,
      description: copy.risks.delayDescription,
      mitigation: copy.risks.delayMitigation,
    },
    {
      id: "risk-quality",
      level:
        calculation.feasibility === "unrealistic" ||
        calculation.feasibility === "high-risk"
          ? "high"
          : "medium",
      title: copy.risks.qualityTitle,
      description: copy.risks.qualityDescription,
      mitigation: copy.risks.qualityMitigation,
    },
  ];

  const explanation =
    calculation.feasibility === "realistic"
      ? copy.summaryRealistic
      : calculation.feasibility === "intensive"
        ? copy.summaryIntensive
        : calculation.feasibility === "high-risk"
          ? copy.summaryRisk
          : copy.summaryUnrealistic;

  return {
    summary: {
      availableDays: calculation.availableDays,
      productiveDays: calculation.productiveDays,
      availableHours: calculation.availableHours,
      productiveHours: calculation.productiveHours,
      requiredHours: calculation.requiredHours,
      remainingPages: calculation.remainingPages,
      reserveDays: calculation.reserveDays,
      pagesPerDay: calculation.pagesPerDay,
      progressPercent:
        request.targetPages > 0
          ? Math.round(
              (Math.min(request.completedPages, request.targetPages) /
                request.targetPages) *
                100,
            )
          : 0,
      feasibility: calculation.feasibility,
      riskLevel: calculation.riskLevel,
      explanation,
    },
    phases,
    dailySchedule,
    milestones,
    risks,
    recommendations: copy.recommendations,
  };
}

function getSerializationLabels(languageValue: string) {
  const language = normalizeLanguage(languageValue);

  if (language === "sk") {
    return {
      feasibility: "Realizovateľnosť",
      risk: "Úroveň rizika",
      availableDays: "Dostupné dni",
      availableHours: "Dostupné hodiny",
      requiredHours: "Potrebné hodiny",
      remainingPages: "Zostávajúce strany",
      reserveDays: "Rezervné dni",
      phases: "ETAPY",
      output: "Výstup",
      dependencies: "Závislosti",
      none: "žiadne",
      daily: "DENNÝ HARMONOGRAM",
      deliverable: "Výstup",
      checkpoint: "Kontrola",
      milestones: "MÍĽNIKY",
      acceptance: "Akceptačné kritérium",
      risks: "RIZIKÁ",
      mitigation: "Opatrenie",
      recommendations: "ODPORÚČANIA",
    };
  }

  if (language === "cs") {
    return {
      feasibility: "Realizovatelnost",
      risk: "Úroveň rizika",
      availableDays: "Dostupné dny",
      availableHours: "Dostupné hodiny",
      requiredHours: "Potřebné hodiny",
      remainingPages: "Zbývající strany",
      reserveDays: "Rezervní dny",
      phases: "ETAPY",
      output: "Výstup",
      dependencies: "Závislosti",
      none: "žádné",
      daily: "DENNÍ HARMONOGRAM",
      deliverable: "Výstup",
      checkpoint: "Kontrola",
      milestones: "MILNÍKY",
      acceptance: "Akceptační kritérium",
      risks: "RIZIKA",
      mitigation: "Opatření",
      recommendations: "DOPORUČENÍ",
    };
  }

  return {
    feasibility: "Feasibility",
    risk: "Risk level",
    availableDays: "Available days",
    availableHours: "Available hours",
    requiredHours: "Required hours",
    remainingPages: "Remaining pages",
    reserveDays: "Reserve days",
    phases: "PHASES",
    output: "Output",
    dependencies: "Dependencies",
    none: "none",
    daily: "DAILY SCHEDULE",
    deliverable: "Deliverable",
    checkpoint: "Checkpoint",
    milestones: "MILESTONES",
    acceptance: "Acceptance criteria",
    risks: "RISKS",
    mitigation: "Mitigation",
    recommendations: "RECOMMENDATIONS",
  };
}


function serializePlan(plan: PlanningResponse, request: PlanningRequest): string {
  const labels = getSerializationLabels(request.language);
  const lines: string[] = [
    request.title,
    "",
    `${labels.feasibility}: ${plan.summary.feasibility}`,
    `${labels.risk}: ${plan.summary.riskLevel}`,
    `${labels.availableDays}: ${plan.summary.availableDays}`,
    `${labels.availableHours}: ${plan.summary.availableHours}`,
    `${labels.requiredHours}: ${plan.summary.requiredHours}`,
    `${labels.remainingPages}: ${plan.summary.remainingPages}`,
    `${labels.reserveDays}: ${plan.summary.reserveDays}`,
    "",
    plan.summary.explanation,
    "",
    labels.phases,
  ];

  plan.phases.forEach((phase, index) => {
    lines.push(
      `${index + 1}. ${phase.title}`,
      `${phase.startDate} – ${phase.endDate} | ${phase.estimatedHours} h | ${phase.priority}`,
      `${labels.output}: ${phase.expectedOutput}`,
      `${labels.dependencies}: ${phase.dependencies.join(", ") || labels.none}`,
      "",
    );
  });

  lines.push(labels.daily);
  plan.dailySchedule.forEach((day) => {
    lines.push(`${day.date} — ${day.dayGoal}`);
    day.tasks.forEach((task) => {
      lines.push(
        `- ${task.time}: ${task.title}`,
        `  ${labels.deliverable}: ${task.deliverable}`,
        `  ${labels.checkpoint}: ${task.checkpoint}`,
      );
    });
    lines.push("");
  });

  lines.push(labels.milestones);
  plan.milestones.forEach((milestone) => {
    lines.push(
      `- ${milestone.date}: ${milestone.title}`,
      `  ${labels.acceptance}: ${milestone.acceptanceCriteria}`,
    );
  });

  lines.push("", labels.risks);
  plan.risks.forEach((risk) => {
    lines.push(
      `- ${risk.level.toUpperCase()}: ${risk.title}`,
      `  ${risk.description}`,
      `  ${labels.mitigation}: ${risk.mitigation}`,
    );
  });

  lines.push("", labels.recommendations);
  plan.recommendations.forEach((recommendation, index) => {
    lines.push(`${index + 1}. ${recommendation}`);
  });

  return lines.join("\n").trim();
}

async function regenerateTask(
  request: RegenerateTaskRequest,
): Promise<PlanningTask> {
  const languageName = getLanguageName(request.language || "sk");
  const task = request.task || {};

  if (!openai) {
    return {
      id: cleanText(task.id, 200) || `task-${Date.now()}`,
      time: cleanText(task.time, 100) || "Flexible block",
      title:
        cleanText(task.title, 1_000) ||
        "Complete the planned academic work block",
      deliverable:
        cleanText(task.deliverable, 1_500) ||
        "A measurable and saved academic output",
      checkpoint:
        cleanText(task.checkpoint, 1_500) ||
        "Verify completeness, academic quality and alignment with the plan",
    };
  }

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: TASK_RESPONSE_SCHEMA,
    },
    messages: [
      {
        role: "system",
        content:
          "You are an academic project planner. Return only JSON that follows the schema.",
      },
      {
        role: "user",
        content: `
Rewrite one academic planning task so it is more concrete, measurable and realistic.
Write all user-facing text in ${languageName}.
Keep the task within the same day and do not invent completed work or research results.

Work title: ${cleanText(request.workTitle, 500) || "Academic work"}
Date: ${cleanText(request.day?.date, 20) || "not specified"}
Day goal: ${cleanText(request.day?.dayGoal, 1_000) || "not specified"}
Current time block: ${cleanText(task.time, 100) || "flexible"}
Current task: ${cleanText(task.title, 1_000) || "not specified"}
Current deliverable: ${cleanText(task.deliverable, 1_500) || "not specified"}
Current checkpoint: ${cleanText(task.checkpoint, 1_500) || "not specified"}
`.trim(),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("AI did not return a regenerated task.");

  const parsed = parseModelJson(content);
  if (!isRecord(parsed) || !isRecord(parsed.task)) {
    throw new Error("The regenerated task response has an invalid format.");
  }

  return {
    id: cleanText(task.id, 200) || `task-${Date.now()}`,
    time: cleanText(parsed.task.time, 100) || cleanText(task.time, 100) || "Flexible block",
    title: cleanText(parsed.task.title, 1_000) || cleanText(task.title, 1_000),
    deliverable:
      cleanText(parsed.task.deliverable, 1_500) ||
      cleanText(task.deliverable, 1_500),
    checkpoint:
      cleanText(parsed.task.checkpoint, 1_500) ||
      cleanText(task.checkpoint, 1_500),
  };
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  detail?: string,
) {
  return NextResponse.json(
    {
      ok: false,
      code,
      message,
      error: message,
      detail,
    },
    { status },
  );
}

export async function POST(req: NextRequest) {
  const requestId =
    cleanText(req.headers.get("x-request-id"), 200) || `planning-${Date.now()}`;

  try {
    const { payload, attachments } = await parseRequest(req);

    if (payload.action === "regenerate-task") {
      const task = await regenerateTask(payload as RegenerateTaskRequest);

      return NextResponse.json({
        ok: true,
        requestId,
        task,
      });
    }

    const planningRequest = payload as PlanningRequest;
    const validationErrors = validatePlanningRequest(planningRequest);

    if (validationErrors.length > 0) {
      return errorResponse(
        400,
        "PLANNING_VALIDATION_FAILED",
        "Plán nie je možné vytvoriť, pretože chýba platný druh práce alebo termín odovzdania.",
        validationErrors.join(" "),
      );
    }

    let calculation: PlanningCalculation;

    try {
      calculation = calculatePlanning(planningRequest);
    } catch (error) {
      return errorResponse(
        400,
        "PLANNING_CAPACITY_INVALID",
        "Zvolený termín neposkytuje použiteľné obdobie na vytvorenie harmonogramu.",
        error instanceof Error ? error.message : undefined,
      );
    }

    const prompt = buildPlanningPrompt(
      planningRequest,
      calculation,
      attachments,
    );

    let plan = createDeterministicPlan(
      planningRequest,
      calculation,
    );
    let generationMode: "ai" | "deterministic-fallback" =
      "deterministic-fallback";
    let fallbackReason: string | null = openai
      ? null
      : "OPENAI_API_KEY is not configured; the guaranteed calculation planner was used.";

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: MODEL,
          temperature: 0.2,
          response_format: {
            type: "json_schema",
            json_schema: RESPONSE_SCHEMA,
          },
          messages: [
            {
              role: "system",
              content:
                "You are a senior academic planner and thesis supervisor. Follow the server calculations exactly. Return only valid JSON matching the schema.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const content = completion.choices[0]?.message?.content;

        if (!content) {
          throw new Error(
            "The AI service returned an empty planning response.",
          );
        }

        const parsed = parseModelJson(content);
        plan = normalizePlan(parsed, planningRequest, calculation);
        generationMode = "ai";
        fallbackReason = null;
      } catch (error) {
        fallbackReason =
          error instanceof Error
            ? error.message
            : "The AI planning response failed and the guaranteed calculation planner was used.";

        console.warn("PLANNING_AI_FALLBACK", {
          requestId,
          model: MODEL,
          reason: fallbackReason,
        });
      }
    }

    const output = serializePlan(plan, planningRequest);
    const attachmentWarnings = attachments
      .filter((attachment) => attachment.warning)
      .map((attachment) => `${attachment.name}: ${attachment.warning}`);

    return NextResponse.json({
      ok: true,
      requestId,
      plan,
      output,
      result: output,
      meta: {
        model:
          generationMode === "ai"
            ? MODEL
            : "zedpera-deterministic-planner-v2",
        generationMode,
        fallbackReason,
        generatedAt: new Date().toISOString(),
        title: planningRequest.title,
        deadline: planningRequest.deadline,
        language: planningRequest.language,
        interfaceMode: "work-type-and-deadline-only",
        automaticDefaultsApplied: true,
        calculation,
        gantt: {
          startDate: calculation.today,
          endDate: calculation.deadline,
          totalDays: calculation.calendarDays,
          phases: plan.phases.map((phase) => ({
            id: phase.id,
            title: phase.title,
            startDate: phase.startDate,
            endDate: phase.endDate,
            priority: phase.priority,
            status: phase.status,
          })),
          milestones: plan.milestones,
        },
        attachmentProcessing: {
          receivedFiles: attachments.length,
          successfullyReadFiles: attachments.filter(
            (attachment) => attachment.status === "read",
          ).length,
          metadataOnlyFiles: attachments.filter(
            (attachment) => attachment.status === "metadata-only",
          ).length,
          failedFiles: attachments.filter(
            (attachment) => attachment.status === "failed",
          ).length,
          extractedCharacters: attachments.reduce(
            (total, attachment) => total + attachment.extractedText.length,
            0,
          ),
          warnings: attachmentWarnings,
        },
      },
    });
  } catch (error) {
    console.error("PLANNING_ERROR", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return errorResponse(
      500,
      "PLANNING_INTERNAL_ERROR",
      "The academic plan could not be created at this time. Your form data can remain saved in the browser and the request can be retried.",
      error instanceof Error ? error.message : undefined,
    );
  }
}
