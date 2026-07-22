"use client";

import {
  Copy,
  Download,
  FileDown,
  FileText,
  Paperclip,
  RefreshCcw,
  Send,
  Trash2,
  UploadCloud,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

import type {
  AcademicModuleFrontendProps,
  AcademicModuleKey,
  ModuleApiResponse,
} from "./types";

export type ModuleTone =
  | "violet"
  | "emerald"
  | "purple"
  | "sky"
  | "cyan"
  | "amber"
  | "pink"
  | "fuchsia";

export type AcademicModuleFrontendInternalProps =
  AcademicModuleFrontendProps & {
    moduleKey: AcademicModuleKey;
    apiEndpoint: string;
    title: string;
    description: string;
    inputLabel?: string;
    placeholder: string;
    buttonLabel: string;
    loadingLabel: string;
    resultTitle?: string;
    defaultInstruction: string;
    icon: LucideIcon;
    tone: ModuleTone;
    storageKey: string;
    controls?: ReactNode;
    extraFields?: Record<string, string | number | boolean | null | undefined>;
    requestMode?: "formData" | "json";
    allowAttachments?: boolean;
    allowedExtensions?: string[];
    maxFileSizeMb?: number;
  };

type AttachedModuleFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
};

const DEFAULT_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".rtf",
  ".odt",
  ".md",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".xls",
  ".xlsx",
  ".xlsm",
  ".csv",
  ".ppt",
  ".pptx",
];

const CLIENT_TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".rtf"]);

const toneClasses: Record<
  ModuleTone,
  {
    shell: string;
    icon: string;
    button: string;
    focus: string;
  }
> = {
  violet: {
    shell:
      "border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10",
    icon: "bg-violet-500/20 text-violet-100 ring-violet-300/30",
    button:
      "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:brightness-110 shadow-violet-950/40",
    focus: "focus:border-violet-400/60 focus:ring-violet-500/10",
  },
  emerald: {
    shell:
      "border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10",
    icon: "bg-emerald-500/20 text-emerald-100 ring-emerald-300/30",
    button:
      "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 shadow-emerald-950/40",
    focus: "focus:border-emerald-400/60 focus:ring-emerald-500/10",
  },
  purple: {
    shell:
      "border-purple-400/20 bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-indigo-500/10",
    icon: "bg-purple-500/20 text-purple-100 ring-purple-300/30",
    button:
      "bg-gradient-to-r from-purple-700 via-violet-700 to-indigo-700 hover:brightness-110 shadow-purple-950/40",
    focus: "focus:border-purple-400/60 focus:ring-purple-500/10",
  },
  sky: {
    shell:
      "border-sky-400/20 bg-gradient-to-br from-sky-500/10 via-cyan-500/5 to-blue-500/10",
    icon: "bg-sky-500/20 text-sky-100 ring-sky-300/30",
    button:
      "bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 hover:brightness-110 shadow-sky-950/40",
    focus: "focus:border-sky-400/60 focus:ring-sky-500/10",
  },
  cyan: {
    shell:
      "border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-indigo-500/10",
    icon: "bg-cyan-500/20 text-cyan-100 ring-cyan-300/30",
    button:
      "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:brightness-110 shadow-cyan-950/40",
    focus: "focus:border-cyan-400/60 focus:ring-cyan-500/10",
  },
  amber: {
    shell:
      "border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10",
    icon: "bg-amber-500/20 text-amber-100 ring-amber-300/30",
    button:
      "bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:brightness-110 shadow-amber-950/40",
    focus: "focus:border-amber-400/60 focus:ring-amber-500/10",
  },
  pink: {
    shell:
      "border-pink-400/20 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-fuchsia-500/10",
    icon: "bg-pink-500/20 text-pink-100 ring-pink-300/30",
    button:
      "bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 hover:brightness-110 shadow-pink-950/40",
    focus: "focus:border-pink-400/60 focus:ring-pink-500/10",
  },
  fuchsia: {
    shell:
      "border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/5 to-violet-500/10",
    icon: "bg-fuchsia-500/20 text-fuchsia-100 ring-fuchsia-300/30",
    button:
      "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-600 hover:brightness-110 shadow-fuchsia-950/40",
    focus: "focus:border-fuchsia-400/60 focus:ring-fuchsia-500/10",
  },
};

function getExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

function createRequestId(moduleKey: AcademicModuleKey): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${moduleKey}-${globalThis.crypto.randomUUID()}`;
  }

  return `${moduleKey}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyUnknown(item))
      .filter(Boolean)
      .join("\n");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    const preferred =
      stringifyUnknown(record.fullText) ||
      stringifyUnknown(record.practicalText) ||
      stringifyUnknown(record.interpretation) ||
      stringifyUnknown(record.summary) ||
      stringifyUnknown(record.output) ||
      stringifyUnknown(record.result) ||
      stringifyUnknown(record.text) ||
      stringifyUnknown(record.answer) ||
      stringifyUnknown(record.content) ||
      stringifyUnknown(record.response) ||
      stringifyUnknown(record.message) ||
      stringifyUnknown(record.analysis);

    if (preferred) return preferred;

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  }

  return "";
}

/**
 * Moduly dashboardu nesmú zobrazovať ani ukladať sekcie zdrojov.
 * Zdroje patria výhradne do samostatného AI Chatu na /chat.
 */
function stripSourceSections(value: string): string {
  let output = String(value || "").trim();

  const headings = [
    "Primárne zdroje",
    "Sekundárne zdroje",
    "Použité zdroje",
    "Zdroje",
    "Bibliografia",
    "Zoznam literatúry",
    "Primary sources",
    "Secondary sources",
    "Used sources",
    "Sources",
    "Bibliography",
    "References",
  ];

  for (const heading of headings) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sectionPattern = new RegExp(
      `(?:^|\\n)\\s*(?:#{1,6}\\s*)?${escaped}\\s*[:\\-–—]?\\s*\\n[\\s\\S]*?(?=\\n\\s*(?:#{1,6}\\s*)?[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][^\\n]{1,100}\\n|$)`,
      "gi",
    );
    output = output.replace(sectionPattern, "\n");
  }

  return output.replace(/\n{3,}/g, "\n\n").trim();
}

function extractOutput(data: ModuleApiResponse): string {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const firstChoice = choices[0] as
    | { message?: { content?: unknown }; text?: unknown }
    | undefined;

  return stripSourceSections(
    stringifyUnknown(data.output) ||
      stringifyUnknown(data.result) ||
      stringifyUnknown(data.fullText) ||
      stringifyUnknown(data.practicalText) ||
      stringifyUnknown(data.interpretation) ||
      stringifyUnknown(data.text) ||
      stringifyUnknown(data.answer) ||
      stringifyUnknown(data.content) ||
      stringifyUnknown(data.response) ||
      stringifyUnknown(firstChoice?.message?.content) ||
      stringifyUnknown(firstChoice?.text) ||
      stringifyUnknown(data.message) ||
      stringifyUnknown(data.analysis),
  );
}

function getApiErrorMessage(
  data: ModuleApiResponse | null,
  status: number,
): string {
  if (!data) return `API vrátilo chybu ${status}.`;

  return (
    stringifyUnknown(data.message) ||
    stringifyUnknown(data.error) ||
    stringifyUnknown(data.detail) ||
    stringifyUnknown(data.details) ||
    `API vrátilo chybu ${status}.`
  );
}

function readAttachmentCount(value: unknown, ...keys: string[]): number | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  for (const key of keys) {
    const candidate = Number(record[key]);
    if (Number.isFinite(candidate)) return candidate;
  }

  return null;
}

function createWordDocument(title: string, output: string): string {
  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const paragraphs = (value: string) =>
    escapeHtml(value)
      .split("\n")
      .map((line) => (line.trim() ? `<p>${line}</p>` : "<p>&nbsp;</p>"))
      .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; padding: 40px; color: #111827; }
    h1 { font-size: 22pt; margin-bottom: 24px; }
    p { margin: 0 0 10px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${paragraphs(output)}
</body>
</html>`;
}

function downloadBlob(content: BlobPart, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function readClientTextFallback(files: AttachedModuleFile[]): Promise<string> {
  const blocks: string[] = [];

  for (const item of files) {
    if (!CLIENT_TEXT_EXTENSIONS.has(getExtension(item.name))) continue;

    try {
      const text = (await item.file.text()).trim();
      if (text) {
        blocks.push(`PRÍLOHA: ${item.name}\n\n${text.slice(0, 30_000)}`);
      }
    } catch {
      // Server stále dostane pôvodný File objekt.
    }
  }

  return blocks.join("\n\n------------------------------\n\n").slice(0, 80_000);
}

async function postModuleRequest(
  endpoint: string,
  payload: FormData | Record<string, unknown>,
  requestId: string,
  requestMode: "formData" | "json",
): Promise<Response> {
  const isJson = requestMode === "json";

  return fetch(endpoint, {
    method: "POST",
    body: isJson ? JSON.stringify(payload) : (payload as FormData),
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json, text/plain, text/event-stream",
      "X-Request-Id": requestId,
      ...(isJson ? { "Content-Type": "application/json; charset=utf-8" } : {}),
    },
  });
}

export default function AcademicModuleFrontend({
  moduleKey,
  apiEndpoint,
  title,
  description,
  inputLabel = "Zadanie",
  placeholder,
  buttonLabel,
  loadingLabel,
  resultTitle = "Výstup",
  defaultInstruction,
  icon: Icon,
  tone,
  storageKey,
  controls,
  extraFields,
  requestMode = "formData",
  allowAttachments = true,
  allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
  maxFileSizeMb = 30,
  profile,
  language,
  attachmentLimit,
  unlimited,
  disabled = false,
  onAttachmentCountChange,
  onEntitlements,
  onPageQuota,
  onUsageChanged,
}: AcademicModuleFrontendInternalProps) {
  const classes = toneClasses[tone];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<AttachedModuleFile[]>([]);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const extensionSet = useMemo(
    () => new Set(allowedExtensions.map((value) => value.toLowerCase())),
    [allowedExtensions],
  );
  const acceptedFiles = useMemo(
    () => Array.from(extensionSet).join(","),
    [extensionSet],
  );
  const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

  const safeLimit = unlimited
    ? Math.max(1, attachmentLimit || 24)
    : Math.max(0, attachmentLimit || 0);

  useEffect(() => {
    onAttachmentCountChange?.(files.length);
  }, [files.length, onAttachmentCountChange]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;

      const parsed = JSON.parse(saved) as {
        input?: unknown;
        output?: unknown;
      };

      if (typeof parsed.input === "string") setInput(parsed.input);
      if (typeof parsed.output === "string") {
        setOutput(stripSourceSections(parsed.output));
      }
    } catch {
      // Modul funguje aj bez localStorage.
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          input,
          output,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Modul funguje aj bez localStorage.
    }
  }, [input, output, storageKey]);

  const canSubmit = useMemo(
    () =>
      !disabled &&
      !isLoading &&
      (input.trim().length > 0 || (allowAttachments && files.length > 0)),
    [allowAttachments, disabled, files.length, input, isLoading],
  );

  const addFiles = useCallback(
    (selectedFiles: File[]) => {
      if (!allowAttachments) return;
      setError("");

      const valid: AttachedModuleFile[] = [];

      for (const file of selectedFiles) {
        const extension = getExtension(file.name);

        if (!extensionSet.has(extension)) {
          setError(`Súbor ${file.name} má nepodporovaný formát.`);
          continue;
        }

        if (file.size > maxFileSizeBytes) {
          setError(`Súbor ${file.name} presahuje limit ${maxFileSizeMb} MB.`);
          continue;
        }

        valid.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
        });
      }

      setFiles((current) => {
        const existing = new Set(current.map((item) => item.id));
        const unique = valid.filter((item) => !existing.has(item.id));
        const combined = [...current, ...unique];

        if (combined.length > safeLimit) {
          setError(
            `V tomto module je možné priložiť najviac ${safeLimit} súborov.`,
          );
        }

        return combined.slice(0, safeLimit);
      });
    },
    [allowAttachments, extensionSet, maxFileSizeBytes, maxFileSizeMb, safeLimit],
  );

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files || []));
  };

  const removeFile = (id: string) => {
    setFiles((current) => current.filter((item) => item.id !== id));
  };

  const clearModule = () => {
    setInput("");
    setFiles([]);
    setOutput("");
    setError("");

    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Bez localStorage sa vyčistí iba React stav.
    }
  };

  const submit = async () => {
    if (!canSubmit) return;

    setIsLoading(true);
    setError("");

    const requestId = createRequestId(moduleKey);
    const userInstruction = input.trim() || defaultInstruction;
    const clientExtractedText = await readClientTextFallback(files);
    const formData = new FormData();

    formData.append("requestId", requestId);
    formData.append("module", moduleKey);
    formData.append("activeModule", moduleKey);
    formData.append("action", moduleKey);
    formData.append("prompt", userInstruction);
    formData.append("input", userInstruction);
    formData.append("text", userInstruction);
    formData.append("message", userInstruction);
    formData.append("question", userInstruction);
    formData.append(
      "messages",
      JSON.stringify([{ role: "user", content: userInstruction }]),
    );

    formData.append("profile", JSON.stringify(profile || null));
    formData.append("activeProfile", JSON.stringify(profile || null));
    formData.append("profileSnapshot", JSON.stringify(profile || null));

    if (profile?.id) {
      formData.append("projectId", String(profile.id));
      formData.append("profileId", String(profile.id));
    }

    const outputLanguage =
      String(profile?.workLanguage || profile?.language || language || "sk").trim() ||
      "sk";

    formData.append("language", outputLanguage);
    formData.append("outputLanguage", outputLanguage);
    formData.append("workLanguage", outputLanguage);
    formData.append(
      "citation",
      String(profile?.citationStyle || profile?.citation || "ISO 690"),
    );

    // Zdroje sú pre dashboardové moduly pevne vypnuté.
    formData.append("sourceMode", "none");
    formData.append("requireSourceList", "false");
    formData.append("includeSources", "false");
    formData.append("includePrimarySources", "false");
    formData.append("includeSecondarySources", "false");
    formData.append("useExternalAcademicSources", "false");
    formData.append("useSemanticScholar", "false");
    formData.append("useCrossref", "false");
    formData.append("appendBibliography", "false");
    formData.append("returnSources", "false");

    // Prílohy sa môžu použiť ako vstupný obsah, nie ako blok zdrojov.
    formData.append("validateAttachmentsAgainstProfile", "false");
    formData.append("allowAiKnowledgeFallback", "true");
    formData.append("extractUploadedText", "true");
    formData.append("useExtractedTextFirst", "true");
    formData.append("returnExtractedFilesInfo", "true");

    if (clientExtractedText) {
      formData.append("clientExtractedText", clientExtractedText);
      formData.append("extractedText", clientExtractedText);
      formData.append("attachmentText", clientExtractedText);
    }

    for (const [key, value] of Object.entries(extraFields || {})) {
      if (value === undefined || value === null) continue;
      formData.append(key, String(value));
    }

    formData.append(
      "moduleSettings",
      JSON.stringify({ moduleKey, ...(extraFields || {}) }),
    );

    formData.append(
      "filesMetadata",
      JSON.stringify(
        files.map((item) => ({
          name: item.name,
          size: item.size,
          type: item.type,
          extension: getExtension(item.name),
        })),
      ),
    );

    for (const item of files) {
      formData.append("files", item.file, item.name);
    }

    const jsonPayload: Record<string, unknown> = {
      requestId,
      module: moduleKey,
      activeModule: moduleKey,
      action: moduleKey,
      prompt: userInstruction,
      instruction: userInstruction,
      input: userInstruction,
      text: userInstruction,
      message: userInstruction,
      question: userInstruction,
      messages: [{ role: "user", content: userInstruction }],
      profile: profile || null,
      activeProfile: profile || null,
      profileSnapshot: profile || null,
      projectId: profile?.id ? String(profile.id) : undefined,
      profileId: profile?.id ? String(profile.id) : undefined,
      language: outputLanguage,
      outputLanguage,
      workLanguage: outputLanguage,
      citation: String(profile?.citationStyle || profile?.citation || "ISO 690"),
      sourceMode: "none",
      requireSourceList: false,
      includeSources: false,
      includePrimarySources: false,
      includeSecondarySources: false,
      useExternalAcademicSources: false,
      useSemanticScholar: false,
      useCrossref: false,
      appendBibliography: false,
      returnSources: false,
      ...(extraFields || {}),
      moduleSettings: { moduleKey, ...(extraFields || {}) },
    };

    try {
      const response = await postModuleRequest(
        apiEndpoint,
        requestMode === "json" ? jsonPayload : formData,
        requestId,
        requestMode,
      );

      const contentType = response.headers.get("content-type") || "";
      let data: ModuleApiResponse | null = null;
      let nextOutput = "";

      if (contentType.includes("application/json")) {
        data = (await response.json()) as ModuleApiResponse;

        if (!response.ok || data.ok === false || data.success === false) {
          throw new Error(getApiErrorMessage(data, response.status));
        }

        nextOutput = extractOutput(data);

        onEntitlements?.(data.entitlements);
        onPageQuota?.(
          data.pageUsage ?? data.pageQuota ?? data.quota ?? data.usage ?? data,
        );

        if (files.length > 0 && data.attachmentProcessing) {
          const receivedFiles = readAttachmentCount(
            data.attachmentProcessing,
            "receivedFiles",
            "received_files",
          );
          const successfullyReadFiles = readAttachmentCount(
            data.attachmentProcessing,
            "successfullyReadFiles",
            "successfully_read_files",
          );

          if (receivedFiles !== null && receivedFiles < files.length) {
            throw new Error(
              `API prijalo iba ${receivedFiles} z ${files.length} príloh.`,
            );
          }

          if (
            successfullyReadFiles !== null &&
            successfullyReadFiles < files.length
          ) {
            throw new Error(
              `API prečítalo iba ${successfullyReadFiles} z ${files.length} príloh.`,
            );
          }
        }
      } else {
        const responseText = await response.text();

        if (!response.ok) {
          throw new Error(
            responseText.trim() || `API vrátilo chybu ${response.status}.`,
          );
        }

        nextOutput = stripSourceSections(
          responseText
            .replace(/^data:\s*/gm, "")
            .replace(/\[DONE\]/g, "")
            .trim(),
        );
      }

      if (!nextOutput) {
        throw new Error(
          `Endpoint ${apiEndpoint} nevrátil použiteľný textový výstup.`,
        );
      }

      setOutput(nextOutput);
      setFiles([]);
      await onUsageChanged?.();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Požiadavku sa nepodarilo spracovať.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(output);
  };

  const downloadWord = () => {
    const html = createWordDocument(title, output);
    downloadBlob(
      html,
      `${moduleKey}-vystup.doc`,
      "application/msword;charset=utf-8",
    );
  };

  const printPdf = () => {
    const popup = window.open("", "_blank");
    if (!popup) {
      setError("Prehliadač zablokoval okno pre PDF. Povoľte vyskakovacie okná.");
      return;
    }

    popup.opener = null;
    popup.document.open();
    popup.document.write(createWordDocument(title, output));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <section
      className={`rounded-[32px] border p-4 shadow-2xl shadow-black/20 sm:p-6 ${classes.shell}`}
      aria-label={title}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${classes.icon}`}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <h1 className="text-xl font-black text-white sm:text-2xl">{title}</h1>
          <p className="mt-1 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
            {description}
          </p>

          {profile?.title || profile?.topic ? (
            <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Aktívny profil: {String(profile.title || profile.topic)}
            </p>
          ) : null}
        </div>
      </div>

      {controls ? <div className="mt-5">{controls}</div> : null}

      {allowAttachments ? (
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={[
            "mt-5 rounded-3xl border border-dashed p-4 transition",
            isDragging
              ? "border-white/60 bg-white/10"
              : "border-white/15 bg-black/20",
          ].join(" ")}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedFiles}
            onChange={onFileInputChange}
            className="hidden"
            disabled={disabled || isLoading || files.length >= safeLimit}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                Prílohy
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Povolené formáty: {allowedExtensions.join(", ")}. Limit jedného
                súboru je {maxFileSizeMb} MB.
              </p>
              <p className="mt-1 text-xs font-bold text-slate-300">
                Počet: {files.length} / {safeLimit}
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading || files.length >= safeLimit}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4" aria-hidden="true" />
              Priložiť súbor
            </button>
          </div>

          {files.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {files.map((item) => (
                <div
                  key={item.id}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0 text-slate-300" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">
                        {item.name}
                      </p>
                      <p className="text-xs font-semibold text-slate-400">
                        {formatBytes(item.size)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFile(item.id)}
                    disabled={isLoading}
                    className="rounded-xl border border-red-400/20 bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                    aria-label={`Odstrániť ${item.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="mt-5 block text-sm font-black text-slate-200">
        {inputLabel}
      </label>
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className={`mt-2 min-h-[240px] w-full resize-y rounded-3xl border border-white/10 bg-[#070b18] px-5 py-5 text-sm font-semibold leading-7 text-white placeholder:text-slate-500 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${classes.focus}`}
      />

      {error ? (
        <div
          className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold leading-6 text-red-100"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-black text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${classes.button}`}
        >
          {isLoading ? (
            <>
              <RefreshCcw className="h-4 w-4 animate-spin" />
              {loadingLabel}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {buttonLabel}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={clearModule}
          disabled={isLoading}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Vyčistiť
        </button>
      </div>

      {output ? (
        <article className="mt-6 rounded-3xl border border-white/10 bg-[#070b18] p-5 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-black text-white">{resultTitle}</h2>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyAll}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-white/[0.12]"
              >
                <Copy className="h-4 w-4" />
                Kopírovať
              </button>

              <button
                type="button"
                onClick={downloadWord}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-white/[0.12]"
              >
                <Download className="h-4 w-4" />
                Word
              </button>

              <button
                type="button"
                onClick={printPdf}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-white/[0.12]"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>

          <div className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-100">
            {output}
          </div>
        </article>
      ) : null}
    </section>
  );
}
