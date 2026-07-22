"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Languages,
  Mail,
  Paintbrush,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import type { AppLanguage } from "@/lib/i18n";

/**
 * Dashboard je navigačný rozcestník.
 *
 * Jazyk rozhrania sa načíta automaticky z URL, uloženého nastavenia
 * alebo z LanguageProvider a prenesie sa do samostatných modulov.
 * Dashboard nezobrazuje vlastný výber jazyka.
 *
 * Funkcionalita jednotlivých nástrojov zostáva v samostatných routach:
 * app/dashboard/modules/<modul>/page.tsx
 *
 * Dashboard:
 * - nezobrazuje počítadlá príloh,
 * - nevykonáva klientsky odpočet kreditov,
 * - vytvorí stabilný requestId a odovzdá ho zvolenému modulu,
 * - neposiela súbory ani negeneruje výstupy.
 *
 * Samotný modul odošle requestId a všetky File objekty do /api/chat.
 * Server v /api/chat centrálne zaeviduje prijaté prílohy, overí limit
 * a vráti jednotnú chybu. Analýza dát musí rovnakú evidenciu volať
 * vo vlastnej serverovej route, pretože /api/chat obchádza.
 */

type DashboardModuleKey =
  | "supervisor"
  | "quality"
  | "defense"
  | "translation"
  | "data"
  | "planning"
  | "emails"
  | "humanizer";

type DashboardModuleDefinition = {
  key: DashboardModuleKey;
  href: string;
  icon: LucideIcon;
  iconClassName: string;
  cardClassName: string;
  buttonClassName: string;
};

type DashboardModuleCopy = {
  title: string;
  description: string;
};

type DashboardLanguageCopy = {
  moduleNavigationLabel: string;
  openModule: string;
  openModuleAria: string;
  modules: Record<DashboardModuleKey, DashboardModuleCopy>;
};

const LANGUAGE_STORAGE_KEYS = [
  "zedpera_language",
  "zedpera_system_language",
  "zedpera_interface_language",
] as const;

const DASHBOARD_REQUEST_ID_STORAGE_KEY =
  "zedpera_dashboard_request_id";

const SUPPORTED_LANGUAGES: Array<{
  code: AppLanguage;
  shortLabel: string;
  nativeLabel: string;
}> = [
  {
    code: "sk",
    shortLabel: "SK",
    nativeLabel: "Slovenčina",
  },
  {
    code: "cs",
    shortLabel: "CZ",
    nativeLabel: "Čeština",
  },
  {
    code: "en",
    shortLabel: "EN",
    nativeLabel: "English",
  },
  {
    code: "de",
    shortLabel: "DE",
    nativeLabel: "Deutsch",
  },
  {
    code: "pl",
    shortLabel: "PL",
    nativeLabel: "Polski",
  },
  {
    code: "hu",
    shortLabel: "HU",
    nativeLabel: "Magyar",
  },
];

const DASHBOARD_MODULES: DashboardModuleDefinition[] = [
  {
    key: "supervisor",
    href: "/dashboard/modules/supervisor",
    icon: GraduationCap,
    iconClassName: "text-violet-200",
    cardClassName:
      "border-violet-400/20 bg-violet-500/10 hover:border-violet-300/50 hover:bg-violet-500/15",
    buttonClassName:
      "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600",
  },
  {
    key: "quality",
    href: "/dashboard/modules/quality",
    icon: ShieldCheck,
    iconClassName: "text-emerald-200",
    cardClassName:
      "border-emerald-400/20 bg-emerald-500/10 hover:border-emerald-300/50 hover:bg-emerald-500/15",
    buttonClassName:
      "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600",
  },
  {
    key: "defense",
    href: "/dashboard/modules/defense",
    icon: BookOpen,
    iconClassName: "text-purple-200",
    cardClassName:
      "border-purple-400/20 bg-purple-500/10 hover:border-purple-300/50 hover:bg-purple-500/15",
    buttonClassName:
      "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600",
  },
  {
    key: "translation",
    href: "/dashboard/modules/translation",
    icon: Languages,
    iconClassName: "text-sky-200",
    cardClassName:
      "border-sky-400/20 bg-sky-500/10 hover:border-sky-300/50 hover:bg-sky-500/15",
    buttonClassName:
      "bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600",
  },
  {
    key: "data",
    href: "/dashboard/modules/data",
    icon: BarChart3,
    iconClassName: "text-cyan-200",
    cardClassName:
      "border-cyan-400/20 bg-cyan-500/10 hover:border-cyan-300/50 hover:bg-cyan-500/15",
    buttonClassName:
      "bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600",
  },
  {
    key: "planning",
    href: "/dashboard/modules/planning",
    icon: CalendarDays,
    iconClassName: "text-amber-200",
    cardClassName:
      "border-amber-400/20 bg-amber-500/10 hover:border-amber-300/50 hover:bg-amber-500/15",
    buttonClassName:
      "bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600",
  },
  {
    key: "emails",
    href: "/dashboard/modules/emails",
    icon: Mail,
    iconClassName: "text-pink-200",
    cardClassName:
      "border-pink-400/20 bg-pink-500/10 hover:border-pink-300/50 hover:bg-pink-500/15",
    buttonClassName:
      "bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600",
  },
  {
    key: "humanizer",
    href: "/dashboard/modules/humanizer",
    icon: Paintbrush,
    iconClassName: "text-fuchsia-200",
    cardClassName:
      "border-fuchsia-400/20 bg-fuchsia-500/10 hover:border-fuchsia-300/50 hover:bg-fuchsia-500/15",
    buttonClassName:
      "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-600",
  },
];

const DASHBOARD_COPY: Record<AppLanguage, DashboardLanguageCopy> = {
  sk: {
    moduleNavigationLabel: "Moduly aplikácie ZEDPERA",
    openModule: "Otvoriť modul",
    openModuleAria: "Otvoriť modul",
    modules: {
      supervisor: {
        title: "AI školiteľ",
        description:
          "Odborné vedenie, hodnotenie a konkrétne odporúčania k akademickej práci.",
      },
      quality: {
        title: "Audit kvality",
        description:
          "Kontrola textu, štruktúry, metodológie, logiky a celkovej odbornej kvality.",
      },
      defense: {
        title: "Obhajoba",
        description:
          "Príprava obhajoby, prezentácie, odpovedí a otázok skúšobnej komisie.",
      },
      translation: {
        title: "Preklad",
        description:
          "Odborný preklad so zachovaním významu, terminológie a akademického štýlu.",
      },
      data: {
        title: "Analýza dát",
        description:
          "Príprava dát, štatistické testy, tabuľky, grafy a odborná interpretácia.",
      },
      planning: {
        title: "Plánovanie",
        description:
          "Kroky, termíny a priority práce podľa aktuálneho stavu a dátumu odovzdania.",
      },
      emails: {
        title: "Emaily",
        description:
          "Profesionálna akademická, školská a obchodná e-mailová komunikácia.",
      },
      humanizer: {
        title: "Humanizátor",
        description:
          "Prirodzenejšia, plynulejšia a akademická úprava vytvoreného textu.",
      },
    },
  },
  cs: {
    moduleNavigationLabel: "Moduly aplikace ZEDPERA",
    openModule: "Otevřít modul",
    openModuleAria: "Otevřít modul",
    modules: {
      supervisor: {
        title: "AI vedoucí",
        description:
          "Odborné vedení, hodnocení a konkrétní doporučení k akademické práci.",
      },
      quality: {
        title: "Audit kvality",
        description:
          "Kontrola textu, struktury, metodologie, logiky a celkové odborné kvality.",
      },
      defense: {
        title: "Obhajoba",
        description:
          "Příprava obhajoby, prezentace, odpovědí a otázek zkušební komise.",
      },
      translation: {
        title: "Překlad",
        description:
          "Odborný překlad se zachováním významu, terminologie a akademického stylu.",
      },
      data: {
        title: "Analýza dat",
        description:
          "Příprava dat, statistické testy, tabulky, grafy a odborná interpretace.",
      },
      planning: {
        title: "Plánování",
        description:
          "Kroky, termíny a priority práce podle aktuálního stavu a data odevzdání.",
      },
      emails: {
        title: "E-maily",
        description:
          "Profesionální akademická, školní a obchodní e-mailová komunikace.",
      },
      humanizer: {
        title: "Humanizátor",
        description:
          "Přirozenější, plynulejší a akademická úprava vytvořeného textu.",
      },
    },
  },
  en: {
    moduleNavigationLabel: "ZEDPERA application modules",
    openModule: "Open module",
    openModuleAria: "Open module",
    modules: {
      supervisor: {
        title: "AI Supervisor",
        description:
          "Academic guidance, professional evaluation, and actionable recommendations for your paper.",
      },
      quality: {
        title: "Quality Audit",
        description:
          "Review of text, structure, methodology, logic, and overall academic quality.",
      },
      defense: {
        title: "Defense",
        description:
          "Preparation of the defense, presentation, answers, and committee questions.",
      },
      translation: {
        title: "Translation",
        description:
          "Academic translation that preserves meaning, terminology, and professional style.",
      },
      data: {
        title: "Data Analysis",
        description:
          "Data preparation, statistical tests, tables, charts, and professional interpretation.",
      },
      planning: {
        title: "Planning",
        description:
          "Tasks, deadlines, and priorities based on current progress and submission date.",
      },
      emails: {
        title: "Emails",
        description:
          "Professional academic, institutional, and business email communication.",
      },
      humanizer: {
        title: "Humanizer",
        description:
          "A more natural, fluent, and academically appropriate version of the generated text.",
      },
    },
  },
  de: {
    moduleNavigationLabel: "ZEDPERA-Anwendungsmodule",
    openModule: "Modul öffnen",
    openModuleAria: "Modul öffnen",
    modules: {
      supervisor: {
        title: "KI-Betreuer",
        description:
          "Fachliche Betreuung, Bewertung und konkrete Empfehlungen für die wissenschaftliche Arbeit.",
      },
      quality: {
        title: "Qualitätsaudit",
        description:
          "Prüfung von Text, Struktur, Methodik, Logik und wissenschaftlicher Gesamtqualität.",
      },
      defense: {
        title: "Verteidigung",
        description:
          "Vorbereitung der Verteidigung, Präsentation, Antworten und Kommissionsfragen.",
      },
      translation: {
        title: "Übersetzung",
        description:
          "Fachübersetzung unter Beibehaltung von Bedeutung, Terminologie und akademischem Stil.",
      },
      data: {
        title: "Datenanalyse",
        description:
          "Datenaufbereitung, statistische Tests, Tabellen, Diagramme und fachliche Interpretation.",
      },
      planning: {
        title: "Planung",
        description:
          "Arbeitsschritte, Termine und Prioritäten nach aktuellem Stand und Abgabetermin.",
      },
      emails: {
        title: "E-Mails",
        description:
          "Professionelle akademische, institutionelle und geschäftliche E-Mail-Kommunikation.",
      },
      humanizer: {
        title: "Humanisierung",
        description:
          "Natürlichere, flüssigere und akademisch angemessene Überarbeitung des Textes.",
      },
    },
  },
  pl: {
    moduleNavigationLabel: "Moduły aplikacji ZEDPERA",
    openModule: "Otwórz moduł",
    openModuleAria: "Otwórz moduł",
    modules: {
      supervisor: {
        title: "Opiekun AI",
        description:
          "Merytoryczne prowadzenie, ocena i konkretne zalecenia dotyczące pracy akademickiej.",
      },
      quality: {
        title: "Audyt jakości",
        description:
          "Kontrola tekstu, struktury, metodologii, logiki i ogólnej jakości akademickiej.",
      },
      defense: {
        title: "Obrona",
        description:
          "Przygotowanie obrony, prezentacji, odpowiedzi i pytań komisji.",
      },
      translation: {
        title: "Tłumaczenie",
        description:
          "Tłumaczenie specjalistyczne z zachowaniem znaczenia, terminologii i stylu akademickiego.",
      },
      data: {
        title: "Analiza danych",
        description:
          "Przygotowanie danych, testy statystyczne, tabele, wykresy i interpretacja.",
      },
      planning: {
        title: "Planowanie",
        description:
          "Kroki, terminy i priorytety według aktualnego postępu i daty oddania.",
      },
      emails: {
        title: "E-maile",
        description:
          "Profesjonalna komunikacja akademicka, instytucjonalna i biznesowa.",
      },
      humanizer: {
        title: "Humanizator",
        description:
          "Bardziej naturalna, płynna i akademicka redakcja wygenerowanego tekstu.",
      },
    },
  },
  hu: {
    moduleNavigationLabel: "A ZEDPERA alkalmazás moduljai",
    openModule: "Modul megnyitása",
    openModuleAria: "Modul megnyitása",
    modules: {
      supervisor: {
        title: "AI témavezető",
        description:
          "Szakmai iránymutatás, értékelés és konkrét javaslatok a tudományos munkához.",
      },
      quality: {
        title: "Minőségellenőrzés",
        description:
          "A szöveg, a szerkezet, a módszertan, a logika és a szakmai minőség ellenőrzése.",
      },
      defense: {
        title: "Védés",
        description:
          "A védés, a prezentáció, a válaszok és a bizottsági kérdések előkészítése.",
      },
      translation: {
        title: "Fordítás",
        description:
          "Szakmai fordítás a jelentés, a terminológia és az akadémiai stílus megőrzésével.",
      },
      data: {
        title: "Adatelemzés",
        description:
          "Adatelőkészítés, statisztikai tesztek, táblázatok, diagramok és szakmai értelmezés.",
      },
      planning: {
        title: "Tervezés",
        description:
          "Feladatok, határidők és prioritások az aktuális állapot és a beadási idő alapján.",
      },
      emails: {
        title: "E-mailek",
        description:
          "Professzionális akadémiai, intézményi és üzleti e-mail-kommunikáció.",
      },
      humanizer: {
        title: "Humanizálás",
        description:
          "A létrehozott szöveg természetesebb, gördülékenyebb és akadémikusabb átdolgozása.",
      },
    },
  },
};

function isSupportedLanguage(value: unknown): value is AppLanguage {
  return SUPPORTED_LANGUAGES.some(
    (language) => language.code === value,
  );
}

function readLanguageFromUrl(): AppLanguage | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const language = url.searchParams.get("lang");

  return isSupportedLanguage(language) ? language : null;
}

function readPersistedLanguage(): AppLanguage | null {
  if (typeof window === "undefined") return null;

  for (const key of LANGUAGE_STORAGE_KEYS) {
    const value = window.localStorage.getItem(key);

    if (isSupportedLanguage(value)) {
      return value;
    }
  }

  const documentLanguage =
    document.documentElement.getAttribute("data-language") ||
    document.documentElement.lang;

  return isSupportedLanguage(documentLanguage)
    ? documentLanguage
    : null;
}

function persistInterfaceLanguage(language: AppLanguage) {
  if (typeof window === "undefined") return;

  for (const key of LANGUAGE_STORAGE_KEYS) {
    window.localStorage.setItem(key, language);
  }

  document.documentElement.lang = language;
  document.documentElement.setAttribute(
    "data-language",
    language,
  );
  document.documentElement.setAttribute(
    "data-system-language",
    language,
  );
  document.documentElement.setAttribute(
    "data-interface-language",
    language,
  );
}

function writeLanguageToCurrentUrl(language: AppLanguage) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set("lang", language);

  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function normalizeRequestId(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 128);
}

function createRequestId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    "req",
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 12),
  ].join("_");
}

function getOrCreateStableRequestId(): string {
  if (typeof window === "undefined") return "";

  const requestIdFromUrl = normalizeRequestId(
    new URL(window.location.href).searchParams.get("requestId"),
  );

  if (requestIdFromUrl) {
    window.sessionStorage.setItem(
      DASHBOARD_REQUEST_ID_STORAGE_KEY,
      requestIdFromUrl,
    );

    return requestIdFromUrl;
  }

  const storedRequestId = normalizeRequestId(
    window.sessionStorage.getItem(
      DASHBOARD_REQUEST_ID_STORAGE_KEY,
    ),
  );

  if (storedRequestId) {
    return storedRequestId;
  }

  const requestId = createRequestId();

  window.sessionStorage.setItem(
    DASHBOARD_REQUEST_ID_STORAGE_KEY,
    requestId,
  );

  return requestId;
}

function createModuleHref({
  href,
  language,
  requestId,
}: {
  href: string;
  language: AppLanguage;
  requestId: string;
}): string {
  const url = new URL(href, "https://zedpera.local");

  url.searchParams.set("lang", language);

  if (requestId) {
    url.searchParams.set("requestId", requestId);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export default function DashboardClient() {
  const {
    language,
    setLanguage,
  } = useLanguage();

  const [requestId, setRequestId] = useState("");

  const copy = useMemo(
    () => DASHBOARD_COPY[language] ?? DASHBOARD_COPY.sk,
    [language],
  );

  const applyLanguage = useCallback(
    (
      nextLanguage: AppLanguage,
      {
        updateCurrentUrl = true,
        dispatchEvent = true,
      }: {
        updateCurrentUrl?: boolean;
        dispatchEvent?: boolean;
      } = {},
    ) => {
      persistInterfaceLanguage(nextLanguage);
      setLanguage(nextLanguage);

      if (updateCurrentUrl) {
        writeLanguageToCurrentUrl(nextLanguage);
      }

      if (
        dispatchEvent &&
        typeof window !== "undefined"
      ) {
        window.dispatchEvent(
          new CustomEvent<AppLanguage>(
            "zedpera-language-change",
            {
              detail: nextLanguage,
            },
          ),
        );
      }
    },
    [setLanguage],
  );

  useEffect(() => {
    const initialLanguage =
      readLanguageFromUrl() ||
      readPersistedLanguage() ||
      language ||
      "sk";

    applyLanguage(initialLanguage, {
      updateCurrentUrl: true,
      dispatchEvent: true,
    });
  }, [applyLanguage, language]);

  useEffect(() => {
    setRequestId(getOrCreateStableRequestId());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLanguageChange = (event: Event) => {
      const customEvent =
        event as CustomEvent<AppLanguage>;

      if (!isSupportedLanguage(customEvent.detail)) {
        return;
      }

      persistInterfaceLanguage(customEvent.detail);
    };

    const handleStorageChange = (
      event: StorageEvent,
    ) => {
      if (
        !event.key ||
        !LANGUAGE_STORAGE_KEYS.includes(
          event.key as (typeof LANGUAGE_STORAGE_KEYS)[number],
        ) ||
        !isSupportedLanguage(event.newValue)
      ) {
        return;
      }

      setLanguage(event.newValue);
    };

    window.addEventListener(
      "zedpera-language-change",
      handleLanguageChange,
    );
    window.addEventListener(
      "storage",
      handleStorageChange,
    );

    return () => {
      window.removeEventListener(
        "zedpera-language-change",
        handleLanguageChange,
      );
      window.removeEventListener(
        "storage",
        handleStorageChange,
      );
    };
  }, [setLanguage]);

  return (
    <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-950 transition-colors duration-300 dark:bg-[#050711] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <nav
          aria-label={copy.moduleNavigationLabel}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {DASHBOARD_MODULES.map((module) => {
            const Icon = module.icon;
            const moduleCopy =
              copy.modules[module.key];

            return (
              <Link
                key={module.key}
                href={createModuleHref({
                  href: module.href,
                  language,
                  requestId,
                })}
                prefetch={false}
                hrefLang={language}
                className={[
                  "group flex min-h-[250px] min-w-0 flex-col overflow-hidden rounded-[1.75rem] border p-5 shadow-lg shadow-slate-200/30 transition duration-200",
                  "hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2",
                  "dark:shadow-black/20 dark:focus:ring-offset-[#050711]",
                  module.cardClassName,
                ].join(" ")}
                aria-label={`${copy.openModuleAria}: ${moduleCopy.title}`}
                data-dashboard-module={module.key}
                data-language={language}
                data-request-id={requestId || undefined}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/10 dark:bg-black/20">
                    <Icon
                      className={`h-6 w-6 ${module.iconClassName}`}
                      aria-hidden="true"
                    />
                  </span>

                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-white"
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-5 min-w-0 flex-1">
                  <h2 className="break-words text-lg font-black tracking-tight text-slate-950 dark:text-white">
                    {moduleCopy.title}
                  </h2>

                  <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {moduleCopy.description}
                  </p>
                </div>

                <span
                  className={[
                    "mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black text-white shadow-md transition group-hover:brightness-110",
                    module.buttonClassName,
                  ].join(" ")}
                >
                  {copy.openModule}
                  <ArrowRight
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
