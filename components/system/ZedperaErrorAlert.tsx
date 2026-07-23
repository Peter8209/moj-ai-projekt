"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  Clipboard,
  CloudOff,
  Database,
  FileWarning,
  Info,
  LockKeyhole,
  Paperclip,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getZedperaUiLabels,
  normalizeZedperaLanguage,
  type ZedperaErrorInfo,
  type ZedperaLanguage,
} from "@/lib/api-error-messages";

export type ZedperaErrorDisplayVariant =
  | "inline"
  | "toast"
  | "modal";

export type ZedperaErrorAlertProps = {
  error: ZedperaErrorInfo | null;
  language?: ZedperaLanguage | string | null;
  variant?: ZedperaErrorDisplayVariant;

  onClose?: () => void;
  onRetry?: () => void | Promise<void>;
  onSwitchModel?: () => void;
  onPrimaryAction?: (
    error: ZedperaErrorInfo,
  ) => void | Promise<void>;

  showAdminDetails?: boolean;
  showTechnicalDetails?: boolean;
  compact?: boolean;
  className?: string;
};

type Palette = {
  root: string;
  glow: string;
  icon: string;
  title: string;
  text: string;
  muted: string;
  primaryButton: string;
  focusRing: string;
  progress: string;
};

function paletteFor(
  error: ZedperaErrorInfo,
): Palette {
  if (error.severity === "critical") {
    return {
      root:
        "border-rose-400/30 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.20),transparent_36%),linear-gradient(135deg,rgba(76,5,25,0.94),rgba(15,23,42,0.96))] shadow-[0_32px_90px_rgba(76,5,25,0.42)]",
      glow:
        "from-rose-300/80 via-fuchsia-300/35 to-transparent",
      icon:
        "border-rose-300/25 bg-rose-300/15 text-rose-100 shadow-[0_12px_30px_rgba(244,63,94,0.22)]",
      title: "text-rose-50",
      text: "text-rose-50/84",
      muted: "text-rose-100/58",
      primaryButton:
        "bg-rose-300 text-slate-950 hover:bg-rose-200",
      focusRing: "focus-visible:ring-rose-300",
      progress: "from-rose-300 to-fuchsia-300",
    };
  }

  if (error.severity === "warning") {
    return {
      root:
        "border-amber-300/30 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_38%),linear-gradient(135deg,rgba(69,26,3,0.94),rgba(15,23,42,0.96))] shadow-[0_32px_90px_rgba(69,26,3,0.34)]",
      glow:
        "from-amber-200/80 via-orange-300/35 to-transparent",
      icon:
        "border-amber-200/25 bg-amber-200/15 text-amber-50 shadow-[0_12px_30px_rgba(251,191,36,0.20)]",
      title: "text-amber-50",
      text: "text-amber-50/84",
      muted: "text-amber-100/58",
      primaryButton:
        "bg-amber-200 text-slate-950 hover:bg-amber-100",
      focusRing: "focus-visible:ring-amber-200",
      progress: "from-amber-200 to-orange-300",
    };
  }

  if (error.severity === "info") {
    return {
      root:
        "border-sky-300/25 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_38%),linear-gradient(135deg,rgba(8,47,73,0.94),rgba(15,23,42,0.96))] shadow-[0_32px_90px_rgba(8,47,73,0.34)]",
      glow:
        "from-sky-200/80 via-cyan-300/35 to-transparent",
      icon:
        "border-sky-200/25 bg-sky-200/15 text-sky-50 shadow-[0_12px_30px_rgba(56,189,248,0.20)]",
      title: "text-sky-50",
      text: "text-sky-50/84",
      muted: "text-sky-100/58",
      primaryButton:
        "bg-sky-200 text-slate-950 hover:bg-sky-100",
      focusRing: "focus-visible:ring-sky-200",
      progress: "from-sky-200 to-cyan-300",
    };
  }

  return {
    root:
      "border-violet-300/25 bg-[radial-gradient(circle_at_top_left,rgba(167,139,250,0.20),transparent_38%),linear-gradient(135deg,rgba(46,16,101,0.94),rgba(15,23,42,0.96))] shadow-[0_32px_90px_rgba(46,16,101,0.38)]",
    glow:
      "from-violet-200/80 via-fuchsia-300/35 to-transparent",
    icon:
      "border-violet-200/25 bg-violet-200/15 text-violet-50 shadow-[0_12px_30px_rgba(167,139,250,0.20)]",
    title: "text-white",
    text: "text-slate-100/84",
    muted: "text-slate-300/58",
    primaryButton:
      "bg-white text-slate-950 hover:bg-slate-100",
    focusRing: "focus-visible:ring-violet-200",
    progress: "from-violet-200 to-fuchsia-300",
  };
}

function iconFor(
  error: ZedperaErrorInfo,
) {
  if (error.category === "attachment") {
    return error.canonicalCode ===
      "ATTACHMENT_LIMIT_REACHED"
      ? Paperclip
      : FileWarning;
  }

  if (
    error.category === "authentication" ||
    error.category === "authorization"
  ) {
    return LockKeyhole;
  }

  if (error.category === "database") {
    return Database;
  }

  if (
    error.category === "network" ||
    error.canonicalCode === "API_UNAVAILABLE"
  ) {
    return CloudOff;
  }

  if (error.category === "provider") {
    return Sparkles;
  }

  if (error.severity === "critical") {
    return ShieldAlert;
  }

  if (error.severity === "warning") {
    return AlertTriangle;
  }

  if (error.severity === "info") {
    return Info;
  }

  return CircleAlert;
}

function percentage(
  used: number | null | undefined,
  limit: number | null | undefined,
): number | null {
  if (
    used === null ||
    used === undefined ||
    limit === null ||
    limit === undefined ||
    limit <= 0
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.min(100, (used / limit) * 100),
  );
}

function ProgressMetric({
  label,
  limit,
  used,
  remaining,
  progressClassName,
  remainingLabel,
}: {
  label: string;
  limit: number | null | undefined;
  used: number | null | undefined;
  remaining: number | null | undefined;
  progressClassName: string;
  remainingLabel: string;
}) {
  if (
    limit === null ||
    limit === undefined
  ) {
    return null;
  }

  const progress = percentage(used, limit);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/48">
          {label}
        </span>

        <span className="text-sm font-black text-white">
          {used ?? 0} / {limit}
        </span>
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={[
            "h-full rounded-full bg-gradient-to-r transition-[width] duration-500",
            progressClassName,
          ].join(" ")}
          style={{
            width: `${progress ?? 0}%`,
          }}
        />
      </div>

      {remaining !== null &&
      remaining !== undefined ? (
        <div className="mt-2 text-xs font-semibold text-white/52">
          {remainingLabel}: {remaining}
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/48">
        {icon}
        {title}
      </div>

      <div className="mt-2 text-sm font-semibold leading-6 text-white/76">
        {children}
      </div>
    </div>
  );
}

function TechnicalRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-white/5 py-2 last:border-b-0">
      <div className="text-white/38">
        {label}
      </div>
      <div className="break-all text-white/72">
        {value}
      </div>
    </div>
  );
}

export default function ZedperaErrorAlert({
  error,
  language,
  variant = "inline",
  onClose,
  onRetry,
  onSwitchModel,
  onPrimaryAction,
  showAdminDetails = false,
  showTechnicalDetails = true,
  compact = false,
  className = "",
}: ZedperaErrorAlertProps) {
  const [technicalOpen, setTechnicalOpen] =
    useState(false);
  const [referenceCopied, setReferenceCopied] =
    useState(false);

  const normalizedLanguage =
    normalizeZedperaLanguage(language);
  const labels =
    getZedperaUiLabels(normalizedLanguage);

  const visual = useMemo(() => {
    if (!error) return null;

    return {
      Icon: iconFor(error),
      palette: paletteFor(error),
    };
  }, [error]);

  if (!error || !visual) return null;

  const { Icon, palette } = visual;

  const referenceId =
    error.requestId || error.errorId || "";

  const hasUsage =
    error.attachmentLimit !== null ||
    error.promptLimit !== null ||
    error.pageLimit !== null;

  const hasTechnicalContent =
    Boolean(
      referenceId ||
        error.endpoint ||
        error.module ||
        error.technicalCode ||
        (showAdminDetails && error.adminAction) ||
        (showAdminDetails &&
          error.technicalDetail),
    );

  const rootRadius =
    variant === "toast"
      ? "rounded-[1.35rem]"
      : "rounded-[1.75rem]";

  async function copyReference() {
    if (!referenceId) return;

    try {
      await navigator.clipboard.writeText(
        referenceId,
      );
      setReferenceCopied(true);

      window.setTimeout(() => {
        setReferenceCopied(false);
      }, 1800);
    } catch {
      setReferenceCopied(false);
    }
  }

  async function primaryAction() {
    /**
     * `error` je prop typu `ZedperaErrorInfo | null`.
     *
     * Hoci komponent vyššie vracia `null`, keď chyba neexistuje,
     * TypeScript nezachová toto zúženie typu vo vnútri asynchrónnej
     * vnorenej funkcie. Medzi vykreslením a kliknutím sa totiž prop
     * teoreticky môže zmeniť.
     *
     * Preto si pri každom spustení akcie vytvoríme lokálnu, bezpečne
     * zúženú referenciu.
     */
    const activeError = error;

    if (!activeError) {
      return;
    }

    if (onPrimaryAction) {
      await onPrimaryAction(activeError);
      return;
    }

    if (
      activeError.actionKind === "switch-model" &&
      onSwitchModel
    ) {
      onSwitchModel();
      return;
    }

    if (
      activeError.actionKind === "retry" &&
      onRetry
    ) {
      await onRetry();
    }
  }

  const interactiveActionWithoutUrl =
    Boolean(
      error.actionLabel &&
        !error.actionUrl &&
        (onPrimaryAction ||
          (error.actionKind === "switch-model" &&
            onSwitchModel) ||
          (error.actionKind === "retry" &&
            onRetry)),
    );

  return (
    <section
      role={
        variant === "modal"
          ? "alertdialog"
          : "alert"
      }
      aria-live={
        error.severity === "critical"
          ? "assertive"
          : "polite"
      }
      aria-modal={
        variant === "modal"
          ? true
          : undefined
      }
      data-zedpera-error-code={error.code}
      data-zedpera-error-severity={
        error.severity
      }
      data-zedpera-error-blocking={
        error.blocking ? "true" : "false"
      }
      className={[
        "relative isolate overflow-hidden border backdrop-blur-2xl",
        rootRadius,
        compact ? "p-4" : "p-5 sm:p-6",
        palette.root,
        className,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "absolute inset-x-12 top-0 h-px bg-gradient-to-r",
          palette.glow,
        ].join(" ")}
      />

      <div
        aria-hidden="true"
        className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-white/[0.04] blur-3xl"
      />

      <div className="relative flex items-start gap-4">
        <div
          className={[
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border sm:h-14 sm:w-14",
            palette.icon,
          ].join(" ")}
        >
          <Icon
            className="h-6 w-6 sm:h-7 sm:w-7"
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.17em] text-white/58">
                  ZEDPERA · {error.technicalCode}
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white/55">
                  {error.category}
                </span>

                {error.blocking ? (
                  <span className="rounded-full border border-white/12 bg-white/[0.10] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white/78">
                    {labels.blockingError}
                  </span>
                ) : null}
              </div>

              <h2
                className={[
                  "mt-3 font-black tracking-[-0.025em]",
                  compact
                    ? "text-lg"
                    : "text-xl sm:text-2xl",
                  palette.title,
                ].join(" ")}
              >
                {error.title}
              </h2>
            </div>

            {onClose && !error.blocking ? (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-xl border border-white/10 bg-black/15 p-2.5 text-white/55 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label={labels.close}
                title={labels.close}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <p
            className={[
              "mt-3 font-semibold leading-6",
              compact
                ? "text-sm"
                : "text-sm sm:text-[15px]",
              palette.text,
            ].join(" ")}
          >
            {error.message}
          </p>

          {error.detail ? (
            <p
              className={[
                "mt-2 text-sm font-medium leading-6",
                palette.muted,
              ].join(" ")}
            >
              {error.detail}
            </p>
          ) : null}

          {!compact ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Section
                title={labels.whatHappened}
                icon={
                  <CircleAlert className="h-3.5 w-3.5" />
                }
              >
                {error.reason}
              </Section>

              <Section
                title={labels.howToContinue}
                icon={
                  <RefreshCcw className="h-3.5 w-3.5" />
                }
              >
                {error.solution}
              </Section>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/48">
              {labels.recommendedAction}
            </div>
            <div className="mt-1.5 text-sm font-bold leading-6 text-white/82">
              {error.userAction}
            </div>
          </div>

          {hasUsage && !compact ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <ProgressMetric
                label={labels.attachmentLimit}
                limit={error.attachmentLimit}
                used={error.attachmentsUsed}
                remaining={
                  error.attachmentsRemaining
                }
                progressClassName={
                  palette.progress
                }
                remainingLabel={
                  labels.remaining
                }
              />

              <ProgressMetric
                label={labels.promptLimit}
                limit={error.promptLimit}
                used={error.promptsUsed}
                remaining={
                  error.promptsRemaining
                }
                progressClassName={
                  palette.progress
                }
                remainingLabel={
                  labels.remaining
                }
              />

              <ProgressMetric
                label={labels.pageLimit}
                limit={error.pageLimit}
                used={error.pagesUsed}
                remaining={
                  error.pagesRemaining
                }
                progressClassName={
                  palette.progress
                }
                remainingLabel={
                  labels.remaining
                }
              />

              {error.receivedAttachments !== null &&
              error.receivedAttachments !==
                undefined ? (
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3.5">
                  <div className="text-[11px] font-black uppercase tracking-[0.15em] text-white/48">
                    {labels.inRequest}
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">
                    {error.receivedAttachments}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-white/48">
                    prijatých súborov
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {error.actionUrl &&
            error.actionLabel ? (
              <Link
                href={error.actionUrl}
                className={[
                  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                  palette.primaryButton,
                  palette.focusRing,
                ].join(" ")}
              >
                {error.actionKind === "back" ? (
                  <ArrowLeft className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
                {error.actionLabel}
              </Link>
            ) : null}

            {interactiveActionWithoutUrl ? (
              <button
                type="button"
                onClick={() =>
                  void primaryAction()
                }
                className={[
                  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                  palette.primaryButton,
                  palette.focusRing,
                ].join(" ")}
              >
                {error.actionKind === "retry" ? (
                  <RefreshCcw className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {error.actionLabel}
              </button>
            ) : null}

            {error.retryable &&
            onRetry &&
            error.actionKind !== "retry" ? (
              <button
                type="button"
                onClick={() => void onRetry()}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/14 bg-white/[0.07] px-4 py-2.5 text-sm font-black text-white transition hover:border-white/25 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <RefreshCcw className="h-4 w-4" />
                {labels.retry}
              </button>
            ) : null}

            {referenceId ? (
              <button
                type="button"
                onClick={() =>
                  void copyReference()
                }
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/15 px-4 py-2.5 text-xs font-black text-white/65 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                title={labels.copyReference}
              >
                {referenceCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Clipboard className="h-4 w-4" />
                )}
                {referenceCopied
                  ? labels.copied
                  : labels.copyReference}
              </button>
            ) : null}

            {showTechnicalDetails &&
            hasTechnicalContent ? (
              <button
                type="button"
                onClick={() =>
                  setTechnicalOpen(
                    (current) => !current,
                  )
                }
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/15 px-4 py-2.5 text-xs font-black text-white/60 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              >
                <ChevronDown
                  className={[
                    "h-4 w-4 transition-transform",
                    technicalOpen
                      ? "rotate-180"
                      : "",
                  ].join(" ")}
                />
                {technicalOpen
                  ? labels.hideDetails
                  : labels.details}
              </button>
            ) : null}
          </div>

          {technicalOpen &&
          hasTechnicalContent ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/25">
              <div className="border-b border-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/48">
                {labels.technicalInformation}
              </div>

              <div className="px-4 py-2 font-mono text-[11px] leading-5">
                <TechnicalRow
                  label="code"
                  value={error.code}
                />
                <TechnicalRow
                  label="status"
                  value={error.status}
                />
                <TechnicalRow
                  label="requestId"
                  value={error.requestId}
                />
                <TechnicalRow
                  label="errorId"
                  value={error.errorId}
                />
                <TechnicalRow
                  label="endpoint"
                  value={error.endpoint}
                />
                <TechnicalRow
                  label="module"
                  value={error.module}
                />
              </div>

              {showAdminDetails &&
              error.adminAction ? (
                <div className="border-t border-white/10 px-4 py-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
                    Administrátorský postup
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-white/58">
                    {error.adminAction}
                  </p>
                </div>
              ) : null}

              {showAdminDetails &&
              error.technicalDetail ? (
                <div className="border-t border-white/10 px-4 py-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
                    Raw technický detail
                  </div>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-5 text-white/48">
                    {error.technicalDetail}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
