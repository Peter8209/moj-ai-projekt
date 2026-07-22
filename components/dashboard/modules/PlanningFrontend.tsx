"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Languages,
  Mail,
  Menu,
  Mic,
  Paintbrush,
  Paperclip,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  X,
} from "lucide-react";

import AnalysisResultsModal from "@/components/analysis/AnalysisResultsModal";
import type { AnalysisResult } from "@/components/analysis/analysisTypes";

import {
  runFullStatisticalAnalysis,
  type AnalysisRow,
} from "@/components/analysis/analysisStats";

import type { AddonId, FeatureKey, PlanId } from "@/lib/billing/catalog";

import { useLanguage } from "@/components/LanguageProvider";
import ImprovementBox from "@/components/ImprovementBox";
import MobileDashboardNavigation from "@/components/dashboard/MobileDashboardNavigation";
import { useRouter, useSearchParams } from "next/navigation";

// ================= TYPES =================

type ModuleKey =
  | "supervisor"
  | "quality"
  | "defense"
  | "translation"
  | "data"
  | "planning"
  | "emails"
  | "originality"
  | "humanizer";

type Agent = "openai" | "claude" | "gemini" | "grok" | "mistral";
type LanguageCode = "sk" | "cs" | "en" | "de" | "pl" | "hu";

type DashboardEntitlements = {
  ok?: boolean;

  userId: string;
  email: string | null;

  planId: PlanId;
  planName: string;
  planPriceCents: number;

  isAdmin: boolean;
  isUnlimited: boolean;
  hasUnlimitedAccess: boolean;

  pageLimit: number | null;
  basePageLimit: number | null;
  extraPageLimit: number;
  totalPageLimit: number | null;
  pagesUsed: number;
  pagesRemaining: number | null;
  pageLimitReached: boolean;

  addonIds: AddonId[];
  addonNames: string[];
  features: FeatureKey[];

  promptLimit: number | null;
  promptsUsed: number;
  promptsRemaining: number | null;
  promptLimitReached: boolean;

  attachmentLimit: number | null;
  billingStatus: string;

  activatedAt: string | null;
  validUntil: string | null;
  updatedAt: string | null;
};

type DashboardPageQuota = {
  ok?: boolean;
  planId: string;

  /**
   * null znamená neobmedzenú hodnotu. Nesmie sa prevádzať na 0,
   * pretože ADMIN by sa potom na frontende tváril ako vyčerpaný FREE účet.
   */
  isAdmin: boolean;
  isUnlimited: boolean;
  hasUnlimitedAccess: boolean;

  basePageLimit: number | null;
  extraPageLimit: number;
  pageLimit: number | null;
  pagesUsed: number;
  pagesRemaining: number | null;
  pageLimitReached: boolean;
};

type BillingNotice = {
  code: string;
  message: string;
  detail?: string;
  purchaseUrl: string;

  /**
   * Modulové chyby musia byť naviazané na modul, v ktorom vznikli.
   * Bez tohto údaja by sa po prepnutí mohla zobraziť stará hláška
   * napríklad pre Obhajobu v sekcii AI školiteľ.
   */
  scope?: "global" | "module";
  moduleKey?: ModuleKey;
  feature?: FeatureKey;
};

type DashboardApiErrorParams = {
  status: number;
  code: string;
  message: string;
  detail?: string;
  purchaseUrl?: string;
};

class DashboardApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: string;
  readonly purchaseUrl?: string;

  constructor({
    status,
    code,
    message,
    detail,
    purchaseUrl,
  }: DashboardApiErrorParams) {
    super(message);
    this.name = "DashboardApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.purchaseUrl = purchaseUrl;
  }
}

type TranslationStyle = "academic" | "formal" | "natural" | "simple";

type EmailType =
  | "supervisor"
  | "teacher"
  | "consultation"
  | "deadline"
  | "request"
  | "apology"
  | "business"
  | "other";

type EmailTone =
  "professional" | "formal" | "friendly" | "polite" | "urgent" | "short";

type QuestionnaireMode = "none" | "selected" | "manual" | "auto-suggest-only";

type QuestionnaireOptionId = "" | "none" | "custom";

type ManualScaleDefinition = {
  id: string;
  name: string;
  itemsText: string;
  reverseItemsText: string;
  min: number;
  max: number;
  scoring: "sum" | "mean";
};

type ManualSubscaleDefinition = {
  id: string;
  scaleName: string;
  name: string;
  itemsText: string;
  reverseItemsText: string;
  min: number;
  max: number;
  scoring: "sum" | "mean";
};

type QuestionnaireConfig = {
  mode: QuestionnaireMode;
  selectedQuestionnaires: string[];
  customQuestionnairesText: string;

  manualScalesText: string;
  manualSubscalesText: string;
  groupingColumnsText: string;
};

type QuestionnaireOption = {
  value: QuestionnaireOptionId;
  label: string;
  description: string;
};

type QuestionnaireLanguage = "sk" | "cs" | "en" | "de" | "pl" | "hu";

type QuestionnaireText = {
  eyebrow: string;
  title: string;
  description: string;
  options: QuestionnaireOption[];

  customLabel: string;
  customDescription: string;
  customPlaceholder: string;

  manualScalesLabel: string;
  manualScalesDescription: string;
  manualScalesPlaceholder: string;

  manualSubscalesLabel: string;
  manualSubscalesDescription: string;
  manualSubscalesPlaceholder: string;

  groupingColumnsLabel: string;
  groupingColumnsDescription: string;
  groupingColumnsPlaceholder: string;

  outputTitle: string;
  outputDescription: string;
};

function normalizeQuestionnaireLanguage(value: unknown): QuestionnaireLanguage {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "cz") return "cs";

  if (
    normalized === "sk" ||
    normalized === "cs" ||
    normalized === "en" ||
    normalized === "de" ||
    normalized === "pl" ||
    normalized === "hu"
  ) {
    return normalized;
  }

  return "sk";
}

const QUESTIONNAIRE_TEXTS: Record<QuestionnaireLanguage, QuestionnaireText> = {
  sk: {
    eyebrow: "Manuálne škály a subškály",
    title: "Zadajte škály, subškály a skupinové premenné",
    description:
      "Štandardizovaných dotazníkov je veľa, preto nepoužívame pevné kartičky dotazníkov. Zadajte vlastné škály, subškály a skupinové premenné nižšie.",
    options: [],

    customLabel: "Vlastná metodika / poznámka k škálam",
    customDescription:
      "Voliteľne vpíšte krátky popis metodiky, názvy škál alebo poznámku k položkám.",
    customPlaceholder:
      "Príklad: V práci používam vlastné škály a subškály. Presné položky sú uvedené v troch kolónkach nižšie.",
    manualScalesLabel: "Manuálne škály",
    manualScalesDescription:
      "Sem napíšte celkové škály, ktoré sa majú vypočítať.",
    manualScalesPlaceholder:
      "Príklad: celkové skóre_skore = WEM1 + WEM2 + ... + WEM14; pracovná spokojnosť_skore = pracovná spokojnosť1 až pracovná spokojnosť36.",
    manualSubscalesLabel: "Manuálne subškály",
    manualSubscalesDescription: "Sem napíšte subškály a položky.",
    manualSubscalesPlaceholder:
      "Príklad: Mzda = pracovná spokojnosť1, pracovná spokojnosť10, pracovná spokojnosť19, pracovná spokojnosť28; Povýšenie = pracovná spokojnosť2, pracovná spokojnosť11, pracovná spokojnosť20, pracovná spokojnosť33.",
    groupingColumnsLabel: "Skupinové premenné",
    groupingColumnsDescription:
      "Sem napíšte premenné pre t-test, ANOVA, Mann-Whitney alebo Kruskal-Wallis.",
    groupingColumnsPlaceholder:
      "Príklad: pohlavie, typ školy, ročník, rodinný stav, typ podniku.",
    outputTitle: "Výstup analýzy",
    outputDescription:
      "Výsledok sa zobrazí v prehľadnom modálnom okne a následne ho bude možné exportovať do Word, PDF alebo Excel.",
  },

  en: {
    eyebrow: "Standardized questionnaire",
    title: "Which questionnaire does the work use?",
    description:
      "Select one or more manual scales only if the dataset truly contains them. Without confirmation, celkové skóre and pracovná spokojnosť will not be calculated automatically.",
    options: [
      {
        value: "",
        label: "I don't know / Suggest only",
        description:
          "The system can suggest a similar questionnaire, but it will not calculate it automatically.",
      },
      {
        value: "none",
        label: "Without a manual scale",
        description:
          "Only item frequency analysis and general statistics will be used, without questionnaire scales.",
      },
      {
        value: "custom",
        label: "Custom questionnaire / custom scales",
        description:
          "Use this when the work contains another questionnaire or manually defined scales.",
      },
    ],
    customLabel: "Custom manual scales / subscales",
    customDescription:
      "If the student uses another questionnaire, enter its name, items, scales, and subscales.",
    customPlaceholder:
      "Example: I use pracovná spokojnosť – 36 items, 9 subscales: pay, promotion, supervision, benefits, rewards, operating conditions, coworkers, nature of work, communication. Second questionnaire: celkové skóre – total score.",
    manualScalesLabel: "Manual scales",
    manualScalesDescription:
      "Enter the total scales that should be calculated.",
    manualScalesPlaceholder:
      "Example: celkové skóre_score = WEM1 + WEM2 + ... + WEM14; pracovná spokojnosť_score = pracovná spokojnosť1 to pracovná spokojnosť36.",
    manualSubscalesLabel: "Manual subscales",
    manualSubscalesDescription: "Enter subscales and their items.",
    manualSubscalesPlaceholder:
      "Example: Pay = pracovná spokojnosť1, pracovná spokojnosť10, pracovná spokojnosť19, pracovná spokojnosť28; Promotion = pracovná spokojnosť2, pracovná spokojnosť11, pracovná spokojnosť20, pracovná spokojnosť33.",
    groupingColumnsLabel: "Grouping variables",
    groupingColumnsDescription:
      "Enter variables for t-test, ANOVA, Mann-Whitney, or Kruskal-Wallis.",
    groupingColumnsPlaceholder:
      "Example: gender, school type, grade, marital status, company type.",
    outputTitle: "Analysis output",
    outputDescription:
      "The result will be displayed in a clear modal window and can then be exported to Word, PDF, or Excel.",
  },

  cs: {
    eyebrow: "Standardizovaný dotazník",
    title: "Jaký dotazník práce používá?",
    description:
      "Vyberte jeden nebo více manuálních škál pouze tehdy, pokud je datový soubor skutečně obsahuje. Bez potvrzení se celkové skóre ani pracovná spokojnosť nebudou počítat automaticky.",
    options: [
      {
        value: "",
        label: "Nevím / pouze navrhnout",
        description:
          "Systém může navrhnout podobný dotazník, ale nebude ho automaticky počítat.",
      },
      {
        value: "none",
        label: "Bez standardizovaného dotazníku",
        description:
          "Použije se pouze frekvenční analýza položek a obecná statistika bez dotazníkových škál.",
      },
      {
        value: "custom",
        label: "Vlastní dotazník / vlastní škály",
        description:
          "Použijte u jiného dotazníku nebo u ručně definovaných škál.",
      },
    ],
    customLabel: "Vlastní manuální škály / subškály",
    customDescription:
      "Pokud student používá jiný dotazník, zadejte jeho název, položky, škály a subškály.",
    customPlaceholder:
      "Příklad: Používám pracovná spokojnosť – 36 položek, 9 subškál: mzda, povýšení, vedení, benefity, odměny, pracovní podmínky, spolupracovníci, povaha práce, komunikace.",
    manualScalesLabel: "Manuální škály",
    manualScalesDescription: "Zadejte celkové škály, které se mají vypočítat.",
    manualScalesPlaceholder:
      "Příklad: celkové skóre_score = WEM1 + WEM2 + ... + WEM14; pracovná spokojnosť_score = pracovná spokojnosť1 až pracovná spokojnosť36.",
    manualSubscalesLabel: "Manuální subškály",
    manualSubscalesDescription: "Zadejte subškály a jejich položky.",
    manualSubscalesPlaceholder:
      "Příklad: Mzda = pracovná spokojnosť1, pracovná spokojnosť10, pracovná spokojnosť19, pracovná spokojnosť28; Povýšení = pracovná spokojnosť2, pracovná spokojnosť11, pracovná spokojnosť20, pracovná spokojnosť33.",
    groupingColumnsLabel: "Skupinové proměnné",
    groupingColumnsDescription:
      "Zadejte proměnné pro t-test, ANOVA, Mann-Whitney nebo Kruskal-Wallis.",
    groupingColumnsPlaceholder:
      "Příklad: pohlaví, typ školy, ročník, rodinný stav, typ podniku.",
    outputTitle: "Výstup analýzy",
    outputDescription:
      "Výsledek se zobrazí v přehledném modálním okně a následně jej bude možné exportovat do Wordu, PDF nebo Excelu.",
  },

  de: {
    eyebrow: "Standardisierter Fragebogen",
    title: "Welchen Fragebogen verwendet die Arbeit?",
    description:
      "Wählen Sie einen oder mehrere standardisierte Fragebögen nur dann aus, wenn der Datensatz sie tatsächlich enthält. Ohne Bestätigung werden celkové skóre und pracovná spokojnosť nicht automatisch berechnet.",
    options: [
      {
        value: "",
        label: "Ich weiß es nicht / nur vorschlagen",
        description:
          "Das System kann einen ähnlichen Fragebogen vorschlagen, berechnet ihn aber nicht automatisch.",
      },
      {
        value: "none",
        label: "Ohne manuelle Skala",
        description:
          "Es werden nur Häufigkeitsanalysen der Items und allgemeine Statistiken ohne Fragebogenskalen verwendet.",
      },
      {
        value: "custom",
        label: "Eigener Fragebogen / eigene Skalen",
        description:
          "Verwenden, wenn die Arbeit einen anderen Fragebogen oder manuell definierte Skalen enthält.",
      },
    ],
    customLabel: "Eigene standardisierte Fragebögen / Subskalen",
    customDescription:
      "Wenn ein anderer Fragebogen verwendet wird, geben Sie Namen, Items, Skalen und Subskalen ein.",
    customPlaceholder:
      "Beispiel: pracovná spokojnosť – 36 Items, 9 Subskalen: Gehalt, Beförderung, Führung, Zusatzleistungen, Belohnungen, Arbeitsbedingungen, Kollegen, Art der Arbeit, Kommunikation.",
    manualScalesLabel: "Manuelle Skalen",
    manualScalesDescription:
      "Geben Sie die Gesamtskalen ein, die berechnet werden sollen.",
    manualScalesPlaceholder:
      "Beispiel: celkové skóre_score = WEM1 + WEM2 + ... + WEM14; pracovná spokojnosť_score = pracovná spokojnosť1 bis pracovná spokojnosť36.",
    manualSubscalesLabel: "Manuelle Subskalen",
    manualSubscalesDescription: "Geben Sie Subskalen und deren Items ein.",
    manualSubscalesPlaceholder:
      "Beispiel: Gehalt = pracovná spokojnosť1, pracovná spokojnosť10, pracovná spokojnosť19, pracovná spokojnosť28; Beförderung = pracovná spokojnosť2, pracovná spokojnosť11, pracovná spokojnosť20, pracovná spokojnosť33.",
    groupingColumnsLabel: "Gruppierungsvariablen",
    groupingColumnsDescription:
      "Geben Sie Variablen für t-Test, ANOVA, Mann-Whitney oder Kruskal-Wallis ein.",
    groupingColumnsPlaceholder:
      "Beispiel: Geschlecht, Schultyp, Jahrgang, Familienstand, Unternehmenstyp.",
    outputTitle: "Analyseausgabe",
    outputDescription:
      "Das Ergebnis wird in einem übersichtlichen modalen Fenster angezeigt und kann anschließend nach Word, PDF oder Excel exportiert werden.",
  },

  pl: {
    eyebrow: "Standaryzowany kwestionariusz",
    title: "Jakiego kwestionariusza używa praca?",
    description:
      "Wybierz jeden lub więcej ręcznych skal tylko wtedy, gdy zestaw danych faktycznie je zawiera. Bez potwierdzenia celkové skóre i pracovná spokojnosť nie będą obliczane automatycznie.",
    options: [
      {
        value: "",
        label: "Nie wiem / tylko zasugeruj",
        description:
          "System może zasugerować podobny kwestionariusz, ale nie obliczy go automatycznie.",
      },
      {
        value: "none",
        label: "Bez standaryzowanego kwestionariusza",
        description:
          "Zostanie użyta tylko analiza częstości pozycji i ogólne statystyki bez skal kwestionariusza.",
      },
      {
        value: "custom",
        label: "Własny kwestionariusz / własne skale",
        description:
          "Użyj, gdy praca zawiera inny kwestionariusz lub ręcznie zdefiniowane skale.",
      },
    ],
    customLabel: "Własne standaryzowane kwestionariusze / podskale",
    customDescription:
      "Jeśli student używa innego kwestionariusza, wpisz jego nazwę, pozycje, skale i podskale.",
    customPlaceholder:
      "Przykład: pracovná spokojnosť – 36 pozycji, 9 podskal: wynagrodzenie, awans, nadzór, benefity, nagrody, warunki pracy, współpracownicy, charakter pracy, komunikacja.",
    manualScalesLabel: "Skale ręczne",
    manualScalesDescription:
      "Wpisz skale całkowite, które mają zostać obliczone.",
    manualScalesPlaceholder:
      "Przykład: celkové skóre_score = WEM1 + WEM2 + ... + WEM14; pracovná spokojnosť_score = pracovná spokojnosť1 do pracovná spokojnosť36.",
    manualSubscalesLabel: "Podskale ręczne",
    manualSubscalesDescription: "Wpisz podskale i ich pozycje.",
    manualSubscalesPlaceholder:
      "Przykład: Wynagrodzenie = pracovná spokojnosť1, pracovná spokojnosť10, pracovná spokojnosť19, pracovná spokojnosť28; Awans = pracovná spokojnosť2, pracovná spokojnosť11, pracovná spokojnosť20, pracovná spokojnosť33.",
    groupingColumnsLabel: "Zmienne grupujące",
    groupingColumnsDescription:
      "Wpisz zmienne dla testu t, ANOVA, Mann-Whitney lub Kruskal-Wallis.",
    groupingColumnsPlaceholder:
      "Przykład: płeć, typ szkoły, rok, stan cywilny, typ firmy.",
    outputTitle: "Wynik analizy",
    outputDescription:
      "Wynik zostanie wyświetlony w przejrzystym oknie modalnym, a następnie będzie można go wyeksportować do Word, PDF lub Excel.",
  },

  hu: {
    eyebrow: "Standardizált kérdőív",
    title: "Milyen kérdőívet használ a munka?",
    description:
      "Csak akkor válasszon ki egy vagy több manuális skálát, ha az adatkészlet valóban tartalmazza azokat. Megerősítés nélkül a celkové skóre és a pracovná spokojnosť nem kerül automatikus kiszámításra.",
    options: [
      {
        value: "",
        label: "Nem tudom / csak javaslat",
        description:
          "A rendszer javasolhat hasonló kérdőívet, de nem számítja ki automatikusan.",
      },
      {
        value: "none",
        label: "Standardizált kérdőív nélkül",
        description:
          "Csak tételgyakorisági elemzés és általános statisztika készül kérdőívskálák nélkül.",
      },
      {
        value: "custom",
        label: "Saját kérdőív / saját skálák",
        description:
          "Akkor használja, ha a munka más kérdőívet vagy manuálisan megadott skálákat tartalmaz.",
      },
    ],
    customLabel: "Saját manuális skálaek / alskálák",
    customDescription:
      "Ha a hallgató más kérdőívet használ, adja meg annak nevét, tételeit, skáláit és alskáláit.",
    customPlaceholder:
      "Példa: pracovná spokojnosť – 36 tétel, 9 alskála: fizetés, előléptetés, vezetés, juttatások, jutalmak, munkakörülmények, munkatársak, munka jellege, kommunikáció.",
    manualScalesLabel: "Manuális skálák",
    manualScalesDescription: "Adja meg a kiszámítandó összskálákat.",
    manualScalesPlaceholder:
      "Példa: celkové skóre_score = WEM1 + WEM2 + ... + WEM14; pracovná spokojnosť_score = pracovná spokojnosť1–pracovná spokojnosť36.",
    manualSubscalesLabel: "Manuális alskálák",
    manualSubscalesDescription: "Adja meg az alskálákat és azok tételeit.",
    manualSubscalesPlaceholder:
      "Példa: Fizetés = pracovná spokojnosť1, pracovná spokojnosť10, pracovná spokojnosť19, pracovná spokojnosť28; Előléptetés = pracovná spokojnosť2, pracovná spokojnosť11, pracovná spokojnosť20, pracovná spokojnosť33.",
    groupingColumnsLabel: "Csoportosító változók",
    groupingColumnsDescription:
      "Adja meg a t-próbához, ANOVA-hoz, Mann-Whitney vagy Kruskal-Wallis teszthez használt változókat.",
    groupingColumnsPlaceholder:
      "Példa: nem, iskola típusa, évfolyam, családi állapot, vállalattípus.",
    outputTitle: "Elemzési kimenet",
    outputDescription:
      "Az eredmény áttekinthető modális ablakban jelenik meg, majd Word, PDF vagy Excel formátumba exportálható.",
  },
};

function getQuestionnaireText(languageValue: unknown): QuestionnaireText {
  const questionnaireLanguage = normalizeQuestionnaireLanguage(languageValue);
  return QUESTIONNAIRE_TEXTS[questionnaireLanguage] ?? QUESTIONNAIRE_TEXTS.sk;
}

type SelectOption<T extends string = string> = {
  value: T;
  labelKey: string;
};

type ClickableChoice<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

type DashboardSelectorTranslations = {
  translationFrom: string;
  translationTo: string;
  translationStyle: string;
  emailType: string;
  emailTone: string;

  languages: {
    slovak: string;
    czech: string;
    english: string;
    german: string;
    polish: string;
    hungarian: string;
  };

  translationStyles: {
    academic: string;
    formal: string;
    natural: string;
    simple: string;
  };

  emailTypes: {
    supervisor: string;
    teacher: string;
    consultation: string;
    deadline: string;
    request: string;
    apology: string;
    business: string;
    other: string;
  };

  emailTones: {
    professional: string;
    formal: string;
    friendly: string;
    polite: string;
    urgent: string;
    short: string;
  };
};

function getDashboardSelectorTranslations(
  t: any,
): DashboardSelectorTranslations {
  const fallback: DashboardSelectorTranslations = {
    translationFrom: "Preložiť z jazyka",
    translationTo: "Preložiť do jazyka",
    translationStyle: "Štýl prekladu",
    emailType: "Typ emailu",
    emailTone: "Tón emailu",

    languages: {
      slovak: "Slovenčina",
      czech: "Čeština",
      english: "Angličtina",
      german: "Nemčina",
      polish: "Poľština",
      hungarian: "Maďarčina",
    },

    translationStyles: {
      academic: "Akademický",
      formal: "Formálny",
      natural: "Prirodzený",
      simple: "Jednoduchý",
    },

    emailTypes: {
      supervisor: "Email vedúcemu práce",
      teacher: "Email vyučujúcemu",
      consultation: "Žiadosť o konzultáciu",
      deadline: "Termín / odovzdanie",
      request: "Žiadosť",
      apology: "Ospravedlnenie",
      business: "Obchodný email",
      other: "Iný email",
    },

    emailTones: {
      professional: "Profesionálny",
      formal: "Formálny",
      friendly: "Priateľský",
      polite: "Zdvorilý",
      urgent: "Urgentný",
      short: "Krátky a vecný",
    },
  };

  return {
    ...fallback,
    ...(t?.dashboardTools?.selectors || {}),

    languages: {
      ...fallback.languages,
      ...(t?.dashboardTools?.selectors?.languages || {}),
    },

    translationStyles: {
      ...fallback.translationStyles,
      ...(t?.dashboardTools?.selectors?.translationStyles || {}),
    },

    emailTypes: {
      ...fallback.emailTypes,
      ...(t?.dashboardTools?.selectors?.emailTypes || {}),
    },

    emailTones: {
      ...fallback.emailTones,
      ...(t?.dashboardTools?.selectors?.emailTones || {}),
    },
  };
}

function createLanguageSelectOptions(
  selectorTranslations: DashboardSelectorTranslations,
): Array<ClickableChoice<LanguageCode>> {
  return [
    {
      value: "sk",
      label: selectorTranslations.languages.slovak,
      description: "Slovak",
    },
    {
      value: "cs",
      label: selectorTranslations.languages.czech,
      description: "Czech",
    },
    {
      value: "en",
      label: selectorTranslations.languages.english,
      description: "English",
    },
    {
      value: "de",
      label: selectorTranslations.languages.german,
      description: "German",
    },
    {
      value: "pl",
      label: selectorTranslations.languages.polish,
      description: "Polish",
    },
    {
      value: "hu",
      label: selectorTranslations.languages.hungarian,
      description: "Hungarian",
    },
  ];
}

function createTranslationStyleOptions(
  selectorTranslations: DashboardSelectorTranslations,
): Array<ClickableChoice<TranslationStyle>> {
  return [
    {
      value: "academic",
      label: selectorTranslations.translationStyles.academic,
      description: "Odborný štýl pre akademické práce",
    },
    {
      value: "formal",
      label: selectorTranslations.translationStyles.formal,
      description: "Oficiálny a profesionálny štýl",
    },
    {
      value: "natural",
      label: selectorTranslations.translationStyles.natural,
      description: "Plynulý a prirodzený jazyk",
    },
    {
      value: "simple",
      label: selectorTranslations.translationStyles.simple,
      description: "Jednoduchý a zrozumiteľný text",
    },
  ];
}

function createEmailTypeOptions(
  selectorTranslations: DashboardSelectorTranslations,
): Array<ClickableChoice<EmailType>> {
  return [
    {
      value: "supervisor",
      label: selectorTranslations.emailTypes.supervisor,
      description: "Správa pre školiteľa alebo konzultanta",
    },
    {
      value: "teacher",
      label: selectorTranslations.emailTypes.teacher,
      description: "Formálna správa pre pedagóga",
    },
    {
      value: "consultation",
      label: selectorTranslations.emailTypes.consultation,
      description: "Dohodnutie termínu konzultácie",
    },
    {
      value: "deadline",
      label: selectorTranslations.emailTypes.deadline,
      description: "Komunikácia k termínu práce",
    },
    {
      value: "request",
      label: selectorTranslations.emailTypes.request,
      description: "Formálna alebo administratívna žiadosť",
    },
    {
      value: "apology",
      label: selectorTranslations.emailTypes.apology,
      description: "Slušné a profesionálne ospravedlnenie",
    },
    {
      value: "business",
      label: selectorTranslations.emailTypes.business,
      description: "Profesionálna obchodná komunikácia",
    },
    {
      value: "other",
      label: selectorTranslations.emailTypes.other,
      description: "Vlastný typ emailovej správy",
    },
  ];
}

function createEmailToneOptions(
  selectorTranslations: DashboardSelectorTranslations,
): Array<ClickableChoice<EmailTone>> {
  return [
    {
      value: "professional",
      label: selectorTranslations.emailTones.professional,
      description: "Vecný a reprezentatívny tón",
    },
    {
      value: "formal",
      label: selectorTranslations.emailTones.formal,
      description: "Úradný a presný tón komunikácie",
    },
    {
      value: "friendly",
      label: selectorTranslations.emailTones.friendly,
      description: "Milý, ale stále slušný prejav",
    },
    {
      value: "polite",
      label: selectorTranslations.emailTones.polite,
      description: "Rešpektujúci a kultivovaný tón",
    },
    {
      value: "urgent",
      label: selectorTranslations.emailTones.urgent,
      description: "Dôrazný email s jasnou prioritou",
    },
    {
      value: "short",
      label: selectorTranslations.emailTones.short,
      description: "Stručná správa bez zbytočností",
    },
  ];
}

type AttachedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt?: string;

  /**
   * Textový fallback pre TXT/MD/CSV/RTF. PDF a DOCX sa čítajú na serveri,
   * aby AI chat nebol závislý od klientského PDF.js workera.
   */
  text?: string;
  content?: string;

  /**
   * Skutočný binárny súbor. Do /api/chat a /api/analyze-data/prepare
   * sa vždy posiela tento objekt, nie iba názov alebo metadáta.
   */
  file?: File;

  extractionStatus?: "pending" | "server" | "client" | "failed";
  extractedChars?: number;
  extractionMessage?: string;
};

type SavedProfile = {
  id?: string;
  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;

  // odbornosť výstupu: akademická, vysoko odborná, štandardná...
  expertise?: string;
  workExpertise?: string;
  specializationLevel?: string;

  supervisor?: string;
  citation?: string;
  language?: string;

  // jazyk rozhrania
  interfaceLanguage?: string;

  // jazyk práce / jazyk výstupu
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
};

type SlideContent = {
  title: string;
  body: string[];
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

// ================= CONFIG =================

const defaultAgent: Agent = "openai";

type DirectModuleRequestMode = "formData" | "json";

type DirectModuleApiConfig = {
  endpoint: string;
  mode: DirectModuleRequestMode;
};

/**
 * Každý samostatný frontend modulu komunikuje so svojím vlastným API.
 * Dashboard ani AI Chat sa pri spustení týchto modulov nepoužívajú.
 */
const DIRECT_MODULE_API: Partial<Record<ModuleKey, DirectModuleApiConfig>> = {
  supervisor: { endpoint: "/api/supervisor", mode: "formData" },
  quality: { endpoint: "/api/audit", mode: "json" },
  defense: { endpoint: "/api/defense", mode: "formData" },
  translation: { endpoint: "/api/translate", mode: "json" },
  planning: { endpoint: "/api/planning", mode: "json" },
  emails: { endpoint: "/api/write", mode: "json" },
};

const ORIGINALITY_PROTOCOL_STORAGE_KEY = "zedpera_originality_protocol_result";

const allowedFileExtensions = [
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
  ".csv",
  ".ppt",
  ".pptx",
];

const allowedFileAccept = allowedFileExtensions.join(",");

const maxStandardFilesCount = 12;

/**
 * ADMIN nemá balíkový limit príloh. Hodnota nižšie je iba technický
 * bezpečnostný limit jednej HTTP požiadavky a je zosúladená s /api/chat.
 */
const maxUnlimitedFilesPerRequest = 24;
const maxDataFilesPerRequest = 1;

const maxFileSizeMb = 30;
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

/**
 * Toto je iba UI fallback nad e-mailom, ktorý vráti serverový endpoint
 * /api/entitlements/me pre aktuálne prihlásenú Supabase reláciu.
 * Skutočné oprávnenie musí vždy potvrdiť server v lib/entitlements.ts.
 * Heslo sa nikdy nesmie zapisovať do frontendového kódu.
 */
const ADMIN_DASHBOARD_EMAILS = new Set<string>([
  "admin@zedpera.com",
]);

const dataFileExtensions = new Set([".xlsx", ".xls", ".xlsm", ".csv"]);

const moduleInfos: {
  key: ModuleKey;
  translationKey:
    | "aiSupervisor"
    | "qualityAudit"
    | "defense"
    | "translation"
    | "dataAnalysis"
    | "planning"
    | "emails"
    | "originalityCheck"
    | "textHumanization";
  infoClassName: string;
}[] = [
  {
    key: "supervisor",
    translationKey: "aiSupervisor",
    infoClassName:
      "mb-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100",
  },
  {
    key: "quality",
    translationKey: "qualityAudit",
    infoClassName:
      "mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100",
  },
  {
    key: "defense",
    translationKey: "defense",
    infoClassName:
      "mb-4 rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-100",
  },
  {
    key: "translation",
    translationKey: "translation",
    infoClassName:
      "mb-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100",
  },
  {
    key: "data",
    translationKey: "dataAnalysis",
    infoClassName:
      "mb-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100",
  },
  {
    key: "planning",
    translationKey: "planning",
    infoClassName:
      "mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100",
  },
  {
    key: "emails",
    translationKey: "emails",
    infoClassName:
      "mb-4 rounded-2xl border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-sm text-pink-100",
  },

  // {
  //   key: 'originality',
  //   translationKey: 'originalityCheck',
  //   infoClassName:
  //     'mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100',
  // },

  {
    key: "humanizer",
    translationKey: "textHumanization",
    infoClassName:
      "mb-4 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-100",
  },
];

type ModuleUiText = {
  label: string;
  shortLabel: string;
  button: string;
  inputLabel: string;
  placeholder: string;
  intro: string;
  resultTitle: string;
};

type ModuleUiTranslations = Record<ModuleKey, ModuleUiText>;

const fixedModuleUiByLanguage: Record<LanguageCode, ModuleUiTranslations> = {
  sk: {
    supervisor: {
      label: "AI školiteľ",
      shortLabel: "AI školiteľ",
      button: "Spustiť AI školiteľa",
      inputLabel: "Text alebo zadanie pre AI školiteľa",
      placeholder:
        "Vložte text práce, kapitolu, zadanie, otázku alebo časť, ktorú má AI školiteľ skontrolovať.",
      intro:
        "AI školiteľ skontroluje štruktúru, logiku, cieľ, metodológiu, argumentáciu a odbornú kvalitu práce.",
      resultTitle: "Výstup AI školiteľa",
    },
    quality: {
      label: "Audit kvality",
      shortLabel: "Audit kvality",
      button: "Spustiť audit kvality",
      inputLabel: "Text alebo zadanie pre audit kvality",
      placeholder:
        "Vložte text práce, kapitolu, úvod, záver alebo časť, ktorú chcete odborne skontrolovať.",
      intro:
        "Audit kvality overí štylistiku, logiku, citácie, nadväznosť kapitol, metodológiu a celkovú kvalitu textu.",
      resultTitle: "Výstup auditu kvality",
    },
    defense: {
      label: "Obhajoba",
      shortLabel: "Obhajoba",
      button: "Pripraviť obhajobu",
      inputLabel: "Text alebo podklady k obhajobe",
      placeholder:
        "Vložte text práce, abstrakt, záver, otázky komisie alebo požiadavky k obhajobe.",
      intro:
        "Obhajoba pripraví otázky, odpovede, osnovu prezentácie a podklady pre profesionálne vystúpenie.",
      resultTitle: "Výstup k obhajobe",
    },
    translation: {
      label: "Preklad",
      shortLabel: "Preklad",
      button: "Preložiť text",
      inputLabel: "Text na preklad",
      placeholder:
        "Vložte text, ktorý chcete preložiť do zvoleného cieľového jazyka.",
      intro:
        "Preklad preloží odborný text do zvoleného jazyka so zachovaním významu, štýlu a terminológie.",
      resultTitle: "Výstup prekladu",
    },
    data: {
      label: "Analýza dát",
      shortLabel: "Analýza dát",
      button: "Spustiť analýzu dát",
      inputLabel: "Zadanie k analýze dát",
      placeholder:
        "Popíšte, čo má systém spraviť s dátami. Napríklad frekvenčná analýza, deskriptívna štatistika, grafy, korelácie, testy a interpretácia.",
      intro:
        "Analýza dát pripraví tabuľky, grafy, testy, interpretáciu a odporúčania pre praktickú časť práce.",
      resultTitle: "Výsledky analýzy dát",
    },
    planning: {
      label: "Plánovanie",
      shortLabel: "Plánovanie",
      button: "Spustiť plánovanie",
      inputLabel: "Zadanie pre plánovanie",
      placeholder:
        "Napíšte termín odovzdania, aktuálny stav práce a požadovaný plán. Termín nesmie byť v minulosti.",
      intro:
        "Plánovanie rozdelí prácu na kroky, termíny a priority podľa dátumu odovzdania a aktuálneho stavu.",
      resultTitle: "Výstup plánovania",
    },
    emails: {
      label: "Emaily",
      shortLabel: "Emaily",
      button: "Vygenerovať email",
      inputLabel: "Zadanie pre email",
      placeholder:
        "Napíšte, komu má byť email určený a čo má obsahovať. Stačí stručne.",
      intro:
        "Emaily pripravia profesionálnu správu pre školiteľa, školu, vyučujúceho alebo konzultanta.",
      resultTitle: "Vygenerovaný email",
    },
    originality: {
      label: "Kontrola originality",
      shortLabel: "Originalita",
      button: "Spustiť kontrolu originality",
      inputLabel: "Text na kontrolu originality",
      placeholder:
        "Vložte alebo nahrajte text práce na orientačnú kontrolu originality.",
      intro:
        "Kontrola originality pripraví orientačný protokol rizikových alebo nedostatočne odcitovaných pasáží.",
      resultTitle: "Výstup kontroly originality",
    },
    humanizer: {
      label: "Humanizátor",
      shortLabel: "Humanizátor",
      button: "Spustiť humanizáciu textu",
      inputLabel: "Text na humanizáciu",
      placeholder:
        "Vložte text, ktorý chcete upraviť do prirodzenejšej, plynulejšej a menej strojovej podoby.",
      intro:
        "Humanizátor upraví text tak, aby pôsobil prirodzenejšie, plynulejšie a akademicky.",
      resultTitle: "Humanizovaný text",
    },
  },

  en: {
    supervisor: {
      label: "AI Supervisor",
      shortLabel: "AI Supervisor",
      button: "Run AI Supervisor",
      inputLabel: "Text or prompt for AI Supervisor",
      placeholder:
        "Insert your paper text, chapter, assignment, question, or section that the AI Supervisor should review.",
      intro:
        "The AI Supervisor checks structure, logic, objective, methodology, argumentation, and academic quality.",
      resultTitle: "AI Supervisor output",
    },
    quality: {
      label: "Quality Audit",
      shortLabel: "Quality Audit",
      button: "Run quality audit",
      inputLabel: "Text or prompt for quality audit",
      placeholder:
        "Insert a chapter, introduction, conclusion, or full paper section you want to review.",
      intro:
        "The quality audit checks style, logic, citations, chapter continuity, methodology, and overall text quality.",
      resultTitle: "Quality audit output",
    },
    defense: {
      label: "Defense",
      shortLabel: "Defense",
      button: "Prepare defense",
      inputLabel: "Text or materials for defense",
      placeholder:
        "Insert your thesis text, abstract, conclusion, committee questions, or defense requirements.",
      intro:
        "The defense module prepares questions, answers, presentation outline, and professional speaking materials.",
      resultTitle: "Defense output",
    },
    translation: {
      label: "Translation",
      shortLabel: "Translation",
      button: "Translate text",
      inputLabel: "Text for translation",
      placeholder:
        "Insert the text you want to translate into the selected target language.",
      intro:
        "Translation converts academic text into the selected language while preserving meaning, style, and terminology.",
      resultTitle: "Translation output",
    },
    data: {
      label: "Data Analysis",
      shortLabel: "Data Analysis",
      button: "Run data analysis",
      inputLabel: "Data analysis assignment",
      placeholder:
        "Describe what the system should do with the data, such as frequency analysis, descriptive statistics, charts, correlations, tests, and interpretation.",
      intro:
        "Data analysis prepares tables, charts, tests, interpretation, and recommendations for the practical part of the paper.",
      resultTitle: "Data analysis results",
    },
    planning: {
      label: "Planning",
      shortLabel: "Planning",
      button: "Run planning",
      inputLabel: "Planning assignment",
      placeholder:
        "Enter the submission deadline, current progress, and requested plan. The deadline must not be in the past.",
      intro:
        "Planning divides the work into steps, deadlines, and priorities according to the submission date and current progress.",
      resultTitle: "Planning output",
    },
    emails: {
      label: "Emails",
      shortLabel: "Emails",
      button: "Generate email",
      inputLabel: "Email assignment",
      placeholder:
        "Write who the email is for and what it should contain. A short description is enough.",
      intro:
        "Emails prepare professional messages for a supervisor, school, teacher, or consultant.",
      resultTitle: "Generated email",
    },
    originality: {
      label: "Originality Check",
      shortLabel: "Originality",
      button: "Run originality check",
      inputLabel: "Text for originality check",
      placeholder:
        "Insert or upload the text of your paper for an indicative originality check.",
      intro:
        "The originality check prepares an indicative protocol of risky or insufficiently cited passages.",
      resultTitle: "Originality check output",
    },
    humanizer: {
      label: "Text Humanization",
      shortLabel: "Humanization",
      button: "Humanize text",
      inputLabel: "Text for humanization",
      placeholder:
        "Insert text that you want to make more natural, fluent, and less machine-like.",
      intro:
        "Text humanization rewrites the text so it sounds more natural, fluent, and academic.",
      resultTitle: "Humanized text",
    },
  },

  cs: {
    supervisor: {
      label: "AI vedoucí",
      shortLabel: "AI vedoucí",
      button: "Spustit AI vedoucího",
      inputLabel: "Text nebo zadání pro AI vedoucího",
      placeholder:
        "Vložte text práce, kapitolu, zadání, otázku nebo část, kterou má AI vedoucí zkontrolovat.",
      intro:
        "AI vedoucí zkontroluje strukturu, logiku, cíl, metodologii, argumentaci a odbornou kvalitu práce.",
      resultTitle: "Výstup AI vedoucího",
    },
    quality: {
      label: "Audit kvality",
      shortLabel: "Audit kvality",
      button: "Spustit audit kvality",
      inputLabel: "Text nebo zadání pro audit kvality",
      placeholder:
        "Vložte text práce, kapitolu, úvod, závěr nebo část, kterou chcete odborně zkontrolovat.",
      intro:
        "Audit kvality ověří stylistiku, logiku, citace, návaznost kapitol, metodologii a celkovou kvalitu textu.",
      resultTitle: "Výstup auditu kvality",
    },
    defense: {
      label: "Obhajoba",
      shortLabel: "Obhajoba",
      button: "Připravit obhajobu",
      inputLabel: "Text nebo podklady k obhajobě",
      placeholder:
        "Vložte text práce, abstrakt, závěr, otázky komise nebo požadavky k obhajobě.",
      intro:
        "Obhajoba připraví otázky, odpovědi, osnovu prezentace a podklady pro profesionální vystoupení.",
      resultTitle: "Výstup k obhajobě",
    },
    translation: {
      label: "Překlad",
      shortLabel: "Překlad",
      button: "Přeložit text",
      inputLabel: "Text k překladu",
      placeholder:
        "Vložte text, který chcete přeložit do zvoleného cílového jazyka.",
      intro:
        "Překlad převede odborný text do zvoleného jazyka se zachováním významu, stylu a terminologie.",
      resultTitle: "Výstup překladu",
    },
    data: {
      label: "Analýza dat",
      shortLabel: "Analýza dat",
      button: "Spustit analýzu dat",
      inputLabel: "Zadání k analýze dat",
      placeholder:
        "Popište, co má systém s daty udělat. Například frekvenční analýzu, deskriptivní statistiku, grafy, korelace, testy a interpretaci.",
      intro:
        "Analýza dat připraví tabulky, grafy, testy, interpretaci a doporučení pro praktickou část práce.",
      resultTitle: "Výsledky analýzy dat",
    },
    planning: {
      label: "Plánování",
      shortLabel: "Plánování",
      button: "Spustit plánování",
      inputLabel: "Zadání pro plánování",
      placeholder:
        "Napište termín odevzdání, aktuální stav práce a požadovaný plán. Termín nesmí být v minulosti.",
      intro:
        "Plánování rozdělí práci na kroky, termíny a priority podle data odevzdání a aktuálního stavu.",
      resultTitle: "Výstup plánování",
    },
    emails: {
      label: "Emaily",
      shortLabel: "Emaily",
      button: "Vygenerovat email",
      inputLabel: "Zadání pro email",
      placeholder:
        "Napište, komu má být email určen a co má obsahovat. Stačí stručně.",
      intro:
        "Emaily připraví profesionální zprávu pro vedoucího, školu, vyučujícího nebo konzultanta.",
      resultTitle: "Vygenerovaný email",
    },
    originality: {
      label: "Kontrola originality",
      shortLabel: "Originalita",
      button: "Spustit kontrolu originality",
      inputLabel: "Text ke kontrole originality",
      placeholder:
        "Vložte nebo nahrajte text práce pro orientační kontrolu originality.",
      intro:
        "Kontrola originality připraví orientační protokol rizikových nebo nedostatečně citovaných pasáží.",
      resultTitle: "Výstup kontroly originality",
    },
    humanizer: {
      label: "Humanizátor",
      shortLabel: "Humanizátor",
      button: "Spustit humanizaci textu",
      inputLabel: "Text k humanizaci",
      placeholder:
        "Vložte text, který chcete upravit do přirozenější, plynulejší a méně strojové podoby.",
      intro:
        "Humanizátor upraví text tak, aby působil přirozeněji, plynuleji a akademicky.",
      resultTitle: "Humanizovaný text",
    },
  },

  de: {
    supervisor: {
      label: "KI-Betreuer",
      shortLabel: "KI-Betreuer",
      button: "KI-Betreuer starten",
      inputLabel: "Text oder Aufgabe für den KI-Betreuer",
      placeholder:
        "Fügen Sie den Text der Arbeit, ein Kapitel, eine Aufgabe, eine Frage oder einen Abschnitt ein, den der KI-Betreuer prüfen soll.",
      intro:
        "Der KI-Betreuer prüft Struktur, Logik, Ziel, Methodik, Argumentation und fachliche Qualität der Arbeit.",
      resultTitle: "Ausgabe des KI-Betreuers",
    },
    quality: {
      label: "Qualitätsaudit",
      shortLabel: "Qualitätsaudit",
      button: "Qualitätsaudit starten",
      inputLabel: "Text oder Aufgabe für das Qualitätsaudit",
      placeholder:
        "Fügen Sie den Text der Arbeit, ein Kapitel, die Einleitung, den Schluss oder einen Abschnitt ein, den Sie fachlich prüfen möchten.",
      intro:
        "Das Qualitätsaudit prüft Stil, Logik, Zitationen, Kapitelanschlüsse, Methodik und die Gesamtqualität des Textes.",
      resultTitle: "Ausgabe des Qualitätsaudits",
    },
    defense: {
      label: "Verteidigung",
      shortLabel: "Verteidigung",
      button: "Verteidigung vorbereiten",
      inputLabel: "Text oder Unterlagen zur Verteidigung",
      placeholder:
        "Fügen Sie den Text der Arbeit, Abstract, Schluss, Fragen der Kommission oder Anforderungen zur Verteidigung ein.",
      intro:
        "Die Verteidigung bereitet Fragen, Antworten, Präsentationsstruktur und Unterlagen für einen professionellen Auftritt vor.",
      resultTitle: "Ausgabe zur Verteidigung",
    },
    translation: {
      label: "Übersetzung",
      shortLabel: "Übersetzung",
      button: "Text übersetzen",
      inputLabel: "Text zur Übersetzung",
      placeholder:
        "Fügen Sie den Text ein, den Sie in die ausgewählte Zielsprache übersetzen möchten.",
      intro:
        "Die Übersetzung überträgt fachlichen Text in die ausgewählte Sprache und bewahrt Bedeutung, Stil und Terminologie.",
      resultTitle: "Übersetzungsausgabe",
    },
    data: {
      label: "Datenanalyse",
      shortLabel: "Datenanalyse",
      button: "Datenanalyse starten",
      inputLabel: "Aufgabe zur Datenanalyse",
      placeholder:
        "Beschreiben Sie, was das System mit den Daten tun soll, z. B. Häufigkeitsanalyse, deskriptive Statistik, Diagramme, Korrelationen, Tests und Interpretation.",
      intro:
        "Die Datenanalyse erstellt Tabellen, Diagramme, Tests, Interpretationen und Empfehlungen für den praktischen Teil der Arbeit.",
      resultTitle: "Ergebnisse der Datenanalyse",
    },
    planning: {
      label: "Planung",
      shortLabel: "Planung",
      button: "Planung starten",
      inputLabel: "Aufgabe für die Planung",
      placeholder:
        "Geben Sie Abgabefrist, aktuellen Stand und gewünschten Plan ein. Die Frist darf nicht in der Vergangenheit liegen.",
      intro:
        "Die Planung teilt die Arbeit in Schritte, Termine und Prioritäten nach Abgabedatum und aktuellem Stand ein.",
      resultTitle: "Planungsausgabe",
    },
    emails: {
      label: "E-Mails",
      shortLabel: "E-Mails",
      button: "E-Mail generieren",
      inputLabel: "Aufgabe für die E-Mail",
      placeholder:
        "Schreiben Sie, an wen die E-Mail gerichtet ist und was sie enthalten soll. Eine kurze Beschreibung reicht.",
      intro:
        "E-Mails erstellen professionelle Nachrichten an Betreuer, Schule, Lehrende oder Berater.",
      resultTitle: "Generierte E-Mail",
    },
    originality: {
      label: "Originalitätsprüfung",
      shortLabel: "Originalität",
      button: "Originalitätsprüfung starten",
      inputLabel: "Text zur Originalitätsprüfung",
      placeholder:
        "Fügen Sie den Text der Arbeit ein oder laden Sie ihn hoch, um eine orientierende Originalitätsprüfung durchzuführen.",
      intro:
        "Die Originalitätsprüfung erstellt ein orientierendes Protokoll riskanter oder unzureichend zitierter Passagen.",
      resultTitle: "Ausgabe der Originalitätsprüfung",
    },
    humanizer: {
      label: "Text-Humanisierung",
      shortLabel: "Humanisierung",
      button: "Text humanisieren",
      inputLabel: "Text zur Humanisierung",
      placeholder:
        "Fügen Sie Text ein, der natürlicher, flüssiger und weniger maschinell wirken soll.",
      intro:
        "Die Humanisierung überarbeitet den Text, damit er natürlicher, flüssiger und akademischer wirkt.",
      resultTitle: "Humanisierter Text",
    },
  },

  pl: {
    supervisor: {
      label: "Opiekun AI",
      shortLabel: "Opiekun AI",
      button: "Uruchom opiekuna AI",
      inputLabel: "Tekst lub zadanie dla opiekuna AI",
      placeholder:
        "Wklej tekst pracy, rozdział, zadanie, pytanie lub fragment, który opiekun AI ma sprawdzić.",
      intro:
        "Opiekun AI sprawdza strukturę, logikę, cel, metodologię, argumentację i jakość merytoryczną pracy.",
      resultTitle: "Wynik opiekuna AI",
    },
    quality: {
      label: "Audyt jakości",
      shortLabel: "Audyt jakości",
      button: "Uruchom audyt jakości",
      inputLabel: "Tekst lub zadanie do audytu jakości",
      placeholder:
        "Wklej tekst pracy, rozdział, wstęp, zakończenie lub fragment, który chcesz profesjonalnie sprawdzić.",
      intro:
        "Audyt jakości sprawdza styl, logikę, cytowania, spójność rozdziałów, metodologię i ogólną jakość tekstu.",
      resultTitle: "Wynik audytu jakości",
    },
    defense: {
      label: "Obrona",
      shortLabel: "Obrona",
      button: "Przygotuj obronę",
      inputLabel: "Tekst lub materiały do obrony",
      placeholder:
        "Wklej tekst pracy, abstrakt, zakończenie, pytania komisji lub wymagania dotyczące obrony.",
      intro:
        "Moduł obrony przygotowuje pytania, odpowiedzi, konspekt prezentacji i materiały do profesjonalnego wystąpienia.",
      resultTitle: "Wynik przygotowania do obrony",
    },
    translation: {
      label: "Tłumaczenie",
      shortLabel: "Tłumaczenie",
      button: "Przetłumacz tekst",
      inputLabel: "Tekst do tłumaczenia",
      placeholder:
        "Wklej tekst, który chcesz przetłumaczyć na wybrany język docelowy.",
      intro:
        "Tłumaczenie przekłada tekst specjalistyczny na wybrany język, zachowując znaczenie, styl i terminologię.",
      resultTitle: "Wynik tłumaczenia",
    },
    data: {
      label: "Analiza danych",
      shortLabel: "Analiza danych",
      button: "Uruchom analizę danych",
      inputLabel: "Zadanie do analizy danych",
      placeholder:
        "Opisz, co system ma zrobić z danymi, np. analizę częstości, statystykę opisową, wykresy, korelacje, testy i interpretację.",
      intro:
        "Analiza danych przygotuje tabele, wykresy, testy, interpretację i rekomendacje do części praktycznej pracy.",
      resultTitle: "Wyniki analizy danych",
    },
    planning: {
      label: "Planowanie",
      shortLabel: "Planowanie",
      button: "Uruchom planowanie",
      inputLabel: "Zadanie do planowania",
      placeholder:
        "Podaj termin oddania, aktualny stan pracy i oczekiwany plan. Termin nie może być w przeszłości.",
      intro:
        "Planowanie dzieli pracę na kroki, terminy i priorytety zgodnie z datą oddania i aktualnym stanem.",
      resultTitle: "Wynik planowania",
    },
    emails: {
      label: "E-maile",
      shortLabel: "E-maile",
      button: "Wygeneruj e-mail",
      inputLabel: "Zadanie do e-maila",
      placeholder:
        "Napisz, do kogo ma być skierowany e-mail i co ma zawierać. Wystarczy krótki opis.",
      intro:
        "E-maile przygotowują profesjonalne wiadomości do promotora, szkoły, wykładowcy lub konsultanta.",
      resultTitle: "Wygenerowany e-mail",
    },
    originality: {
      label: "Kontrola oryginalności",
      shortLabel: "Oryginalność",
      button: "Uruchom kontrolę oryginalności",
      inputLabel: "Tekst do kontroli oryginalności",
      placeholder:
        "Wklej lub prześlij tekst pracy do orientacyjnej kontroli oryginalności.",
      intro:
        "Kontrola oryginalności przygotuje orientacyjny protokół ryzykownych lub niedostatecznie cytowanych fragmentów.",
      resultTitle: "Wynik kontroli oryginalności",
    },
    humanizer: {
      label: "Humanizator",
      shortLabel: "Humanizator",
      button: "Humanizuj tekst",
      inputLabel: "Tekst do humanizacji",
      placeholder:
        "Wklej tekst, który chcesz przeredagować na bardziej naturalny, płynny i mniej maszynowy.",
      intro:
        "Humanizator przerabia tekst tak, aby brzmiał bardziej naturalnie, płynnie i akademicko.",
      resultTitle: "Zhumanizowany tekst",
    },
  },

  hu: {
    supervisor: {
      label: "AI témavezető",
      shortLabel: "AI témavezető",
      button: "AI témavezető indítása",
      inputLabel: "Szöveg vagy feladat az AI témavezetőnek",
      placeholder:
        "Illeszd be a dolgozat szövegét, fejezetet, feladatot, kérdést vagy részt, amelyet az AI témavezető ellenőrizzen.",
      intro:
        "Az AI témavezető ellenőrzi a struktúrát, logikát, célt, módszertant, érvelést és szakmai minőséget.",
      resultTitle: "AI témavezető eredménye",
    },
    quality: {
      label: "Minőségi audit",
      shortLabel: "Minőségi audit",
      button: "Minőségi audit indítása",
      inputLabel: "Szöveg vagy feladat minőségi audithoz",
      placeholder:
        "Illeszd be a dolgozat szövegét, fejezetet, bevezetést, lezárást vagy részt, amelyet szakmailag ellenőrizni szeretnél.",
      intro:
        "A minőségi audit ellenőrzi a stílust, logikát, hivatkozásokat, fejezetek kapcsolódását, módszertant és az általános minőséget.",
      resultTitle: "Minőségi audit eredménye",
    },
    defense: {
      label: "Védés",
      shortLabel: "Védés",
      button: "Védés előkészítése",
      inputLabel: "Szöveg vagy anyag a védéshez",
      placeholder:
        "Illeszd be a dolgozat szövegét, absztraktot, lezárást, bizottsági kérdéseket vagy védési követelményeket.",
      intro:
        "A védési modul kérdéseket, válaszokat, prezentációs vázlatot és professzionális előadási anyagokat készít.",
      resultTitle: "Védési eredmény",
    },
    translation: {
      label: "Fordítás",
      shortLabel: "Fordítás",
      button: "Szöveg fordítása",
      inputLabel: "Fordítandó szöveg",
      placeholder:
        "Illeszd be a szöveget, amelyet a kiválasztott célnyelvre szeretnél fordítani.",
      intro:
        "A fordítás a szakmai szöveget a kiválasztott nyelvre fordítja, megőrizve a jelentést, stílust és terminológiát.",
      resultTitle: "Fordítás eredménye",
    },
    data: {
      label: "Adatelemzés",
      shortLabel: "Adatelemzés",
      button: "Adatelemzés indítása",
      inputLabel: "Adatelemzési feladat",
      placeholder:
        "Írd le, mit végezzen a rendszer az adatokkal, például gyakorisági elemzést, leíró statisztikát, grafikonokat, korrelációkat, teszteket és értelmezést.",
      intro:
        "Az adatelemzés táblákat, grafikonokat, teszteket, értelmezést és ajánlásokat készít a gyakorlati részhez.",
      resultTitle: "Adatelemzés eredményei",
    },
    planning: {
      label: "Tervezés",
      shortLabel: "Tervezés",
      button: "Tervezés indítása",
      inputLabel: "Tervezési feladat",
      placeholder:
        "Add meg a leadási határidőt, az aktuális állapotot és a kért tervet. A határidő nem lehet múltbeli.",
      intro:
        "A tervezés lépésekre, határidőkre és prioritásokra bontja a munkát a leadási dátum és aktuális állapot alapján.",
      resultTitle: "Tervezési eredmény",
    },
    emails: {
      label: "E-mailek",
      shortLabel: "E-mailek",
      button: "E-mail generálása",
      inputLabel: "E-mail feladat",
      placeholder:
        "Írd le, kinek szól az e-mail és mit tartalmazzon. Rövid leírás is elég.",
      intro:
        "Az e-mail modul professzionális üzenetet készít témavezetőnek, iskolának, oktatónak vagy konzultánsnak.",
      resultTitle: "Generált e-mail",
    },
    originality: {
      label: "Eredetiség-ellenőrzés",
      shortLabel: "Eredetiség",
      button: "Eredetiség ellenőrzése",
      inputLabel: "Szöveg eredetiség-ellenőrzéshez",
      placeholder:
        "Illeszd be vagy töltsd fel a dolgozat szövegét tájékoztató eredetiség-ellenőrzéshez.",
      intro:
        "Az eredetiség-ellenőrzés tájékoztató protokollt készít kockázatos vagy nem megfelelően hivatkozott részekről.",
      resultTitle: "Eredetiség-ellenőrzés eredménye",
    },
    humanizer: {
      label: "Humanizátor",
      shortLabel: "Humanizátor",
      button: "Szöveg humanizálása",
      inputLabel: "Humanizálandó szöveg",
      placeholder:
        "Illeszd be a szöveget, amelyet természetesebbé, gördülékenyebbé és kevésbé gépi hangzásúvá szeretnél alakítani.",
      intro:
        "A humanizátor természetesebb, gördülékenyebb és akadémikusabb szöveggé alakítja az anyagot.",
      resultTitle: "Humanizált szöveg",
    },
  },
};

function getFixedModuleUi(language?: string): ModuleUiTranslations {
  const safeLanguage: LanguageCode =
    language === "cs" ||
    language === "en" ||
    language === "de" ||
    language === "pl" ||
    language === "hu" ||
    language === "sk"
      ? language
      : "sk";

  return fixedModuleUiByLanguage[safeLanguage] || fixedModuleUiByLanguage.sk;
}

const dashboardModuleOrder: ModuleKey[] = [
  "supervisor",
  "quality",
  "defense",
  "translation",
  "data",
  "planning",
  "emails",
  "humanizer",
];

const MODULE_REQUIRED_FEATURE: Record<ModuleKey, FeatureKey> = {
  supervisor: "ai-supervisor",
  quality: "quality-audit",
  defense: "defense",
  translation: "translation",
  data: "data-prepare",
  planning: "planning",
  emails: "emails",
  originality: "originality",
  humanizer: "humanizer",
};

/**
 * Jediný zdroj pravdy pre priebeh a vzhľad akčného tlačidla.
 *
 * Názov tlačidla sa vždy berie z fixedModuleUiByLanguage[language][module].
 * Tieto mapy určujú iba všeobecný priebehový text a farebný variant.
 * Vďaka tomu sa po prepnutí modulu nemôže ponechať názov predchádzajúcej
 * sekcie, napríklad „Spustiť AI školiteľa“ v Audite kvality.
 */
const MODULE_PROCESSING_PREFIX: Record<LanguageCode, string> = {
  sk: "Spracúvam",
  cs: "Zpracovávám",
  en: "Processing",
  de: "Verarbeitung",
  pl: "Przetwarzanie",
  hu: "Feldolgozás",
};

const MODULE_ACTION_CLASS_NAMES: Record<ModuleKey, string> = {
  supervisor:
    "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 shadow-violet-900/30 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500",
  quality:
    "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-emerald-900/30 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500",
  defense:
    "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 shadow-purple-900/30 hover:from-purple-500 hover:via-violet-500 hover:to-indigo-500",
  translation:
    "bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 shadow-sky-900/30 hover:from-sky-500 hover:via-cyan-500 hover:to-blue-500",
  data:
    "bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 shadow-cyan-950/50 hover:from-emerald-400 hover:via-cyan-400 hover:to-blue-500",
  planning:
    "bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 shadow-amber-900/30 hover:from-amber-500 hover:via-orange-500 hover:to-rose-500",
  emails:
    "bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 shadow-pink-900/30 hover:from-pink-500 hover:via-rose-500 hover:to-fuchsia-500",
  originality:
    "bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 shadow-red-900/30 hover:from-red-500 hover:via-rose-500 hover:to-orange-500",
  humanizer:
    "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-600 shadow-fuchsia-900/30 hover:from-fuchsia-500 hover:via-purple-500 hover:to-violet-500",
};

type ModuleAccessNoticeCopy = {
  message: (moduleLabel: string, planName: string) => string;
  detail: (moduleLabel: string) => string;
};

const MODULE_ACCESS_NOTICE_COPY: Record<LanguageCode, ModuleAccessNoticeCopy> =
  {
    sk: {
      message: (moduleLabel, planName) =>
        `Sekcia „${moduleLabel}“ nie je súčasťou aktívneho balíka „${planName}“.`,
      detail: (moduleLabel) =>
        `Na používanie sekcie „${moduleLabel}“ si vyberte balík, ktorý túto sekciu obsahuje.`,
    },
    cs: {
      message: (moduleLabel, planName) =>
        `Sekce „${moduleLabel}“ není součástí aktivního balíčku „${planName}“.`,
      detail: (moduleLabel) =>
        `Pro používání sekce „${moduleLabel}“ vyberte balíček, který tuto sekci obsahuje.`,
    },
    en: {
      message: (moduleLabel, planName) =>
        `The “${moduleLabel}” section is not included in the active “${planName}” plan.`,
      detail: (moduleLabel) =>
        `Choose a plan that includes the “${moduleLabel}” section to continue.`,
    },
    de: {
      message: (moduleLabel, planName) =>
        `Der Bereich „${moduleLabel}“ ist im aktiven Paket „${planName}“ nicht enthalten.`,
      detail: (moduleLabel) =>
        `Wählen Sie ein Paket, das den Bereich „${moduleLabel}“ enthält.`,
    },
    pl: {
      message: (moduleLabel, planName) =>
        `Sekcja „${moduleLabel}“ nie jest dostępna w aktywnym pakiecie „${planName}“.`,
      detail: (moduleLabel) =>
        `Aby korzystać z sekcji „${moduleLabel}“, wybierz pakiet, który ją zawiera.`,
    },
    hu: {
      message: (moduleLabel, planName) =>
        `A(z) „${moduleLabel}“ szakasz nem része az aktív „${planName}“ csomagnak.`,
      detail: (moduleLabel) =>
        `A(z) „${moduleLabel}“ használatához válasszon olyan csomagot, amely tartalmazza ezt a szakaszt.`,
    },
  };

function createModuleAccessNotice({
  language,
  moduleKey,
  moduleLabel,
  planName,
  feature,
}: {
  language: LanguageCode;
  moduleKey: ModuleKey;
  moduleLabel: string;
  planName: string;
  feature: FeatureKey;
}): BillingNotice {
  const copy =
    MODULE_ACCESS_NOTICE_COPY[language] || MODULE_ACCESS_NOTICE_COPY.sk;

  return {
    code: "FEATURE_NOT_INCLUDED",
    message: copy.message(moduleLabel, planName),
    detail: copy.detail(moduleLabel),
    purchaseUrl: "/pricing",
    scope: "module",
    moduleKey,
    feature,
  };
}

const MODULE_ACCESS_ERROR_CODES = new Set([
  "FEATURE_NOT_INCLUDED",
  "REQUIRED_FEATURES_MISSING",
  "NO_REQUIRED_FEATURE_INCLUDED",
]);

const BILLING_ERROR_CODES = new Set([
  "PAGE_LIMIT_REACHED",
  "PROMPT_LIMIT_REACHED",
  "FEATURE_NOT_INCLUDED",
  "REQUIRED_FEATURES_MISSING",
  "NO_REQUIRED_FEATURE_INCLUDED",
  "ATTACHMENT_LIMIT_REACHED",
]);

function isModuleKey(value: string): value is ModuleKey {
  return (
    value === "supervisor" ||
    value === "quality" ||
    value === "defense" ||
    value === "translation" ||
    value === "data" ||
    value === "planning" ||
    value === "emails" ||
    value === "originality" ||
    value === "humanizer"
  );
}

function normalizeDashboardModuleKey(value: unknown): ModuleKey | null {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "coach") return "supervisor";
  if (normalized === "audit") return "quality";

  return isModuleKey(normalized) ? normalized : null;
}

// ================= BILLING NORMALIZATION =================

type UnknownRecord = Record<string, unknown>;

const DASHBOARD_PLAN_DEFAULTS: Record<
  PlanId,
  {
    name: string;
    priceCents: number;
    pageLimit: number | null;
    promptLimit: number | null;
    attachmentLimit: number | null;
  }
> = {
  free: {
    name: "FREE",
    priceCents: 0,
    pageLimit: 3,
    promptLimit: 3,
    attachmentLimit: 1,
  },
  "seminar-work": {
    name: "Seminárna práca",
    priceCents: 3900,
    pageLimit: 15,
    promptLimit: null,
    attachmentLimit: 12,
  },
  "bachelor-thesis": {
    name: "Bakalárska práca",
    priceCents: 14900,
    pageLimit: 50,
    promptLimit: null,
    attachmentLimit: 12,
  },
  "master-thesis": {
    name: "Diplomová / magisterská práca",
    priceCents: 18900,
    pageLimit: 70,
    promptLimit: null,
    attachmentLimit: 12,
  },
  admin: {
    name: "ADMIN",
    priceCents: 0,
    pageLimit: null,
    promptLimit: null,
    attachmentLimit: null,
  },
};

const DASHBOARD_ADDON_LABELS: Record<AddonId, string> = {
  "data-analysis": "Analýza dát",
  "extra-20": "Extra 20 strán",
  "extra-40": "Extra 40 strán",
  "extra-60": "Extra 60 strán",
};

const DASHBOARD_PLAN_IDS = new Set<PlanId>([
  "free",
  "seminar-work",
  "bachelor-thesis",
  "master-thesis",
  "admin",
]);

const DASHBOARD_ADDON_IDS = new Set<AddonId>([
  "data-analysis",
  "extra-20",
  "extra-40",
  "extra-60",
]);

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapApiPayload(value: unknown): UnknownRecord | null {
  if (!isUnknownRecord(value)) return null;

  if (isUnknownRecord(value.data)) return value.data;
  if (isUnknownRecord(value.entitlements)) return value.entitlements;
  if (isUnknownRecord(value.quota)) return value.quota;

  return value;
}

function readString(record: UnknownRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function readNullableString(
  record: UnknownRecord,
  ...keys: string[]
): string | null {
  const value = readString(record, ...keys);
  return value || null;
}

function readNumber(record: UnknownRecord, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function readBoolean(
  record: UnknownRecord,
  fallback: boolean,
  ...keys: string[]
): boolean {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();

      if (["true", "1", "yes", "ano", "áno"].includes(normalized)) {
        return true;
      }

      if (["false", "0", "no", "nie"].includes(normalized)) {
        return false;
      }
    }
  }

  return fallback;
}

function readStringArray(record: UnknownRecord, ...keys: string[]): string[] {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return Array.from(
        new Set(value.map((item) => String(item ?? "").trim()).filter(Boolean)),
      );
    }

    if (typeof value === "string" && value.trim()) {
      return Array.from(
        new Set(
          value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      );
    }
  }

  return [];
}

function normalizeDashboardPlanIdOrNull(value: unknown): PlanId | null {
  const candidate = String(value ?? "").trim() as PlanId;
  return DASHBOARD_PLAN_IDS.has(candidate) ? candidate : null;
}

function normalizeDashboardAddonIds(values: string[]): AddonId[] {
  return values.filter((value): value is AddonId =>
    DASHBOARD_ADDON_IDS.has(value as AddonId),
  );
}

function normalizeDashboardEntitlements(
  value: unknown,
): DashboardEntitlements | null {
  const root = isUnknownRecord(value) ? value : null;
  const data = unwrapApiPayload(value);

  if (!data) return null;

  /**
   * ADMIN sa musí rozpoznať ešte pred fallbackom na FREE. Inak by neznáma
   * alebo dočasne chýbajúca hodnota planId prepla admina na plán free.
   */
  const storedPlanId = normalizeDashboardPlanIdOrNull(
    data.planId ?? data.plan_id,
  );

  const billingStatus = readString(
    data,
    "billingStatus",
    "billing_status",
  ).toLowerCase();

  const explicitAdmin = readBoolean(
    data,
    false,
    "isAdmin",
    "is_admin",
    "adminAccess",
    "admin_access",
  );

  const explicitUnlimited = readBoolean(
    data,
    false,
    "hasUnlimitedAccess",
    "has_unlimited_access",
    "isUnlimited",
    "is_unlimited",
  );

  const accountEmail = readNullableString(data, "email");
  const normalizedAccountEmail = accountEmail?.trim().toLowerCase() || "";
  const authenticatedAdminEmail =
    normalizedAccountEmail.length > 0 &&
    ADMIN_DASHBOARD_EMAILS.has(normalizedAccountEmail);

  const isAdmin =
    explicitAdmin ||
    storedPlanId === "admin" ||
    billingStatus === "admin" ||
    authenticatedAdminEmail;

  const hasUnlimitedAccess =
    isAdmin ||
    explicitUnlimited;

  const isUnlimited = hasUnlimitedAccess;

  const planId: PlanId = isAdmin
    ? "admin"
    : storedPlanId ?? "free";

  const planDefaults = DASHBOARD_PLAN_DEFAULTS[planId];

  const addonIds = normalizeDashboardAddonIds(
    readStringArray(data, "addonIds", "addon_ids"),
  );

  const explicitAddonNames = readStringArray(
    data,
    "addonNames",
    "addon_names",
  );

  const addonNames = explicitAddonNames.length
    ? explicitAddonNames
    : addonIds.map((addonId) => DASHBOARD_ADDON_LABELS[addonId]);

  const features = readStringArray(
    data,
    "features",
    "featureList",
    "feature_list",
  ) as FeatureKey[];

  const basePageLimit = hasUnlimitedAccess
    ? null
    : Math.max(
        0,
        readNumber(
          data,
          "basePageLimit",
          "base_page_limit",
        ) ??
          planDefaults.pageLimit ??
          0,
      );

  const extraPageLimit = hasUnlimitedAccess
    ? 0
    : Math.max(
        0,
        readNumber(
          data,
          "extraPageLimit",
          "extra_page_limit",
        ) ?? 0,
      );

  const calculatedTotalPageLimit =
    basePageLimit === null
      ? null
      : basePageLimit + extraPageLimit;

  const totalPageLimit = hasUnlimitedAccess
    ? null
    : Math.max(
        0,
        readNumber(
          data,
          "totalPageLimit",
          "total_page_limit",
          "pageLimit",
          "page_limit",
        ) ??
          calculatedTotalPageLimit ??
          0,
      );

  const pagesUsedRaw = Math.max(
    0,
    readNumber(data, "pagesUsed", "pages_used") ?? 0,
  );

  const pagesRemainingFromApi = readNumber(
    data,
    "pagesRemaining",
    "pages_remaining",
  );

  const pagesRemaining = hasUnlimitedAccess
    ? null
    : Math.max(
        0,
        Math.min(
          pagesRemainingFromApi ??
            Math.max((totalPageLimit ?? 0) - pagesUsedRaw, 0),
          Math.max((totalPageLimit ?? 0) - pagesUsedRaw, 0),
        ),
      );

  const promptLimitFromApi = readNumber(
    data,
    "promptLimit",
    "prompt_limit",
  );

  const promptLimit = hasUnlimitedAccess
    ? null
    : promptLimitFromApi ?? planDefaults.promptLimit;

  const promptsUsedRaw = Math.max(
    0,
    readNumber(data, "promptsUsed", "prompts_used") ?? 0,
  );

  const promptsRemainingFromApi = readNumber(
    data,
    "promptsRemaining",
    "prompts_remaining",
  );

  const promptsRemaining = hasUnlimitedAccess || promptLimit === null
    ? null
    : Math.max(
        0,
        Math.min(
          promptsRemainingFromApi ??
            Math.max(promptLimit - promptsUsedRaw, 0),
          Math.max(promptLimit - promptsUsedRaw, 0),
        ),
      );

  const attachmentLimit = hasUnlimitedAccess
    ? null
    : Math.max(
        0,
        readNumber(
          data,
          "attachmentLimit",
          "attachment_limit",
        ) ??
          planDefaults.attachmentLimit ??
          0,
      );

  return {
    ok: readBoolean(root ?? data, true, "ok", "success"),

    userId: readString(data, "userId", "user_id"),
    email: accountEmail,

    planId,
    planName: isAdmin
      ? "ADMIN"
      : readString(data, "planName", "plan_name") || planDefaults.name,

    planPriceCents: isAdmin
      ? 0
      : readNumber(
          data,
          "planPriceCents",
          "plan_price_cents",
        ) ?? planDefaults.priceCents,

    isAdmin,
    isUnlimited,
    hasUnlimitedAccess,

    pageLimit: totalPageLimit,
    basePageLimit,
    extraPageLimit,
    totalPageLimit,
    pagesUsed: hasUnlimitedAccess ? 0 : pagesUsedRaw,
    pagesRemaining,
    pageLimitReached: hasUnlimitedAccess
      ? false
      : readBoolean(
          data,
          (pagesRemaining ?? 0) <= 0,
          "pageLimitReached",
          "page_limit_reached",
        ),

    addonIds,
    addonNames,
    features,

    promptLimit,
    promptsUsed: hasUnlimitedAccess ? 0 : promptsUsedRaw,
    promptsRemaining,
    promptLimitReached:
      hasUnlimitedAccess || promptLimit === null
        ? false
        : readBoolean(
            data,
            promptsUsedRaw >= promptLimit,
            "promptLimitReached",
            "prompt_limit_reached",
          ),

    attachmentLimit,
    billingStatus: isAdmin
      ? "admin"
      : billingStatus || "active",

    activatedAt: readNullableString(
      data,
      "activatedAt",
      "activated_at",
    ),

    validUntil: hasUnlimitedAccess
      ? null
      : readNullableString(
          data,
          "validUntil",
          "valid_until",
        ),

    updatedAt: readNullableString(
      data,
      "updatedAt",
      "updated_at",
    ),
  };
}

function normalizeDashboardPageQuota(
  value: unknown,
): DashboardPageQuota | null {
  const root = isUnknownRecord(value) ? value : null;

  /**
   * Niektoré API route vracajú kvótu priamo, iné pod pageUsage,
   * pageQuota, quota alebo usage.
   */
  const pageQuotaPayload =
    root && isUnknownRecord(root.pageUsage)
      ? root.pageUsage
      : root && isUnknownRecord(root.pageQuota)
        ? root.pageQuota
        : root && isUnknownRecord(root.quota)
          ? root.quota
          : root && isUnknownRecord(root.usage)
            ? root.usage
            : value;

  const data = unwrapApiPayload(pageQuotaPayload);

  if (!data) return null;

  const storedPlanId =
    normalizeDashboardPlanIdOrNull(
      data.planId ?? data.plan_id,
    );

  const explicitAdmin = readBoolean(
    data,
    false,
    "isAdmin",
    "is_admin",
    "adminAccess",
    "admin_access",
  );

  const explicitUnlimited = readBoolean(
    data,
    false,
    "isUnlimited",
    "is_unlimited",
    "hasUnlimitedAccess",
    "has_unlimited_access",
  );

  const isAdmin =
    explicitAdmin ||
    storedPlanId === "admin";

  const hasUnlimitedAccess =
    isAdmin ||
    explicitUnlimited;

  const isUnlimited = hasUnlimitedAccess;

  if (isUnlimited) {
    return {
      ok: readBoolean(root ?? data, true, "ok", "success"),
      planId: isAdmin ? "admin" : storedPlanId ?? "admin",
      isAdmin,
      isUnlimited: true,
      hasUnlimitedAccess: true,
      basePageLimit: null,
      extraPageLimit: 0,
      pageLimit: null,
      pagesUsed: 0,
      pagesRemaining: null,
      pageLimitReached: false,
    };
  }

  const planId = storedPlanId ?? "free";
  const planDefaults = DASHBOARD_PLAN_DEFAULTS[planId];

  const basePageLimit = Math.max(
    0,
    readNumber(
      data,
      "basePageLimit",
      "base_page_limit",
      "planPageLimit",
      "plan_page_limit",
    ) ??
      planDefaults.pageLimit ??
      0,
  );

  const extraPageLimit = Math.max(
    0,
    readNumber(
      data,
      "extraPageLimit",
      "extra_page_limit",
      "extraPages",
      "extra_pages",
    ) ?? 0,
  );

  const calculatedPageLimit =
    basePageLimit + extraPageLimit;

  const pageLimit = Math.max(
    0,
    readNumber(
      data,
      "pageLimit",
      "page_limit",
      "totalPageLimit",
      "total_page_limit",
      "totalPages",
      "total_pages",
    ) ?? calculatedPageLimit,
  );

  const pagesUsed = Math.max(
    0,
    readNumber(
      data,
      "pagesUsed",
      "pages_used",
      "usedPages",
      "used_pages",
    ) ?? 0,
  );

  const calculatedPagesRemaining =
    Math.max(pageLimit - pagesUsed, 0);

  const pagesRemainingFromApi = readNumber(
    data,
    "pagesRemaining",
    "pages_remaining",
    "remainingPages",
    "remaining_pages",
  );

  const pagesRemaining = Math.min(
    Math.max(
      0,
      pagesRemainingFromApi ??
        calculatedPagesRemaining,
    ),
    calculatedPagesRemaining,
  );

  const pageLimitReached = readBoolean(
    data,
    pageLimit > 0 && pagesRemaining <= 0,
    "pageLimitReached",
    "page_limit_reached",
    "limitReached",
    "limit_reached",
  );

  return {
    ok: readBoolean(root ?? data, true, "ok", "success"),
    planId,
    isAdmin: false,
    isUnlimited: false,
    hasUnlimitedAccess: false,
    basePageLimit,
    extraPageLimit,
    pageLimit,
    pagesUsed,
    pagesRemaining,
    pageLimitReached,
  };
}

function isUnlimitedDashboardAccess(
  entitlements: DashboardEntitlements | null | undefined,
  quota?: DashboardPageQuota | null,
): boolean {
  const normalizedEmail =
    entitlements?.email?.trim().toLowerCase() || "";

  return Boolean(
    entitlements?.isAdmin ||
      entitlements?.planId === "admin" ||
      ADMIN_DASHBOARD_EMAILS.has(normalizedEmail) ||
      entitlements?.isUnlimited ||
      entitlements?.hasUnlimitedAccess ||
      quota?.isAdmin ||
      quota?.planId === "admin" ||
      quota?.isUnlimited ||
      quota?.hasUnlimitedAccess,
  );
}

function reconcileDashboardBillingState(
  entitlements: DashboardEntitlements,
  quota: DashboardPageQuota,
): {
  entitlements: DashboardEntitlements;
  pageQuota: DashboardPageQuota;
} {
  const unlimited = isUnlimitedDashboardAccess(
    entitlements,
    quota,
  );

  if (!unlimited) {
    return {
      entitlements,
      pageQuota: quota,
    };
  }

  const normalizedEmail =
    entitlements.email?.trim().toLowerCase() || "";

  const admin =
    entitlements.isAdmin ||
    entitlements.planId === "admin" ||
    ADMIN_DASHBOARD_EMAILS.has(normalizedEmail) ||
    quota.isAdmin ||
    quota.planId === "admin";

  return {
    entitlements: {
      ...entitlements,
      planId: admin ? "admin" : entitlements.planId,
      planName: admin ? "ADMIN" : entitlements.planName,
      planPriceCents: admin ? 0 : entitlements.planPriceCents,
      isAdmin: admin,
      isUnlimited: true,
      hasUnlimitedAccess: true,
      pageLimit: null,
      basePageLimit: null,
      extraPageLimit: 0,
      totalPageLimit: null,
      pagesUsed: 0,
      pagesRemaining: null,
      pageLimitReached: false,
      promptLimit: null,
      promptsUsed: 0,
      promptsRemaining: null,
      promptLimitReached: false,
      attachmentLimit: null,
      billingStatus: admin ? "admin" : entitlements.billingStatus,
      validUntil: null,
    },
    pageQuota: {
      ...quota,
      planId: admin ? "admin" : quota.planId,
      isAdmin: admin,
      isUnlimited: true,
      hasUnlimitedAccess: true,
      basePageLimit: null,
      extraPageLimit: 0,
      pageLimit: null,
      pagesUsed: 0,
      pagesRemaining: null,
      pageLimitReached: false,
    },
  };
}

// ================= HELPERS =================

function base64ToBlob(base64: string, mimeType: string): Blob {
  const cleanedBase64 = String(base64 || "")
    .replace(/^data:.*?;base64,/i, "")
    .replace(/\s/g, "");

  if (!cleanedBase64) {
    return new Blob([], { type: mimeType });
  }

  const byteCharacters = atob(cleanedBase64);
  const arrayBuffers: ArrayBuffer[] = [];
  const sliceSize = 1024;

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array<number>(slice.length);

    for (let index = 0; index < slice.length; index += 1) {
      byteNumbers[index] = slice.charCodeAt(index);
    }

    const byteArray = new Uint8Array(byteNumbers);

    const arrayBuffer = byteArray.buffer.slice(
      byteArray.byteOffset,
      byteArray.byteOffset + byteArray.byteLength,
    ) as ArrayBuffer;

    arrayBuffers.push(arrayBuffer);
  }

  return new Blob(arrayBuffers, { type: mimeType });
}

function downloadBase64File(
  base64: string,
  fileName: string,
  mimeType: string,
): void {
  const blob = base64ToBlob(base64, mimeType);

  if (blob.size === 0) {
    console.error(
      "Súbor sa nepodarilo stiahnuť, pretože base64 obsah je prázdny.",
    );
    alert("Súbor sa nepodarilo stiahnuť, pretože export je prázdny.");
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  if (index === -1) return "";
  return fileName.slice(index).toLowerCase();
}

function isAllowedUploadFile(file: File) {
  return allowedFileExtensions.includes(getFileExtension(file.name));
}

function createFileId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

type SystemLanguage = "sk" | "cs" | "en" | "de" | "pl" | "hu";

function isValidSystemLanguage(value: unknown): value is SystemLanguage {
  return (
    value === "sk" ||
    value === "cs" ||
    value === "en" ||
    value === "de" ||
    value === "pl" ||
    value === "hu"
  );
}

function getStoredSystemLanguage(): SystemLanguage {
  if (typeof window === "undefined") return "sk";

  const stored =
    localStorage.getItem("zedpera_language") ||
    localStorage.getItem("zedpera_system_language") ||
    "sk";

  return isValidSystemLanguage(stored) ? stored : "sk";
}

function withSystemLanguageProfile(
  profile: SavedProfile | null,
  systemLanguage: SystemLanguage,
): SavedProfile | null {
  if (!profile) {
    return {
      language: systemLanguage,
      interfaceLanguage: systemLanguage,
      workLanguage: systemLanguage,
    };
  }

  return {
    ...profile,

    // language necháme podľa profilu, ak existuje
    language: profile.language || systemLanguage,

    // interfaceLanguage je jazyk rozhrania
    interfaceLanguage: systemLanguage,

    // workLanguage NESMIE prepísať jazyk rozhrania
    workLanguage: profile.workLanguage || profile.language || systemLanguage,
  };
}

function prepareProfileForApi(
  profile: SavedProfile | null,
  systemLanguage: SystemLanguage,
): SavedProfile | null {
  if (!profile) return null;

  return {
    ...profile,
    language: profile.language || systemLanguage,
    interfaceLanguage: systemLanguage,
    workLanguage: profile.workLanguage || profile.language || systemLanguage,
  };
}

function persistSystemLanguage(systemLanguage: SystemLanguage) {
  if (typeof window === "undefined") return;

  localStorage.setItem("zedpera_language", systemLanguage);
  localStorage.setItem("zedpera_system_language", systemLanguage);

  document.documentElement.lang = systemLanguage;
  document.documentElement.setAttribute("data-language", systemLanguage);
  document.documentElement.setAttribute("data-system-language", systemLanguage);
  document.documentElement.setAttribute("data-work-language", systemLanguage);
}

function normalizeProfile(raw: any): SavedProfile | null {
  if (!raw || typeof raw !== "object") return null;

  if (raw.profile && typeof raw.profile === "object") {
    return {
      ...raw.profile,
      schema: raw.schema || raw.profile.schema,
      language: raw.language || raw.profile.language,
      interfaceLanguage: raw.interfaceLanguage || raw.profile.interfaceLanguage,
      workLanguage: raw.workLanguage || raw.profile.workLanguage,
      savedAt: raw.savedAt || raw.generatedAt || raw.profile.savedAt,
    };
  }

  return raw as SavedProfile;
}

function fixEncodingArtifacts(text: string) {
  return String(text || "")
    .replace(/\uFFFD/g, "")
    .replace(/Â/g, "")
    .replace(/Ã¡/g, "á")
    .replace(/Ã¤/g, "ä")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ã½/g, "ý")
    .replace(/Ã´/g, "ô")
    .replace(/Ã„/g, "Ä")
    .replace(/Ã‰/g, "É")
    .replace(/Ã/g, "Á")
    .replace(/Ä/g, "č")
    .replace(/Ä/g, "ď")
    .replace(/Ä¾/g, "ľ")
    .replace(/Ä˝/g, "Ľ")
    .replace(/Äº/g, "ĺ")
    .replace(/Å¡/g, "š")
    .replace(/Å /g, "Š")
    .replace(/Å¾/g, "ž")
    .replace(/Å½/g, "Ž")
    .replace(/Å¥/g, "ť")
    .replace(/Å¤/g, "Ť")
    .replace(/Åˆ/g, "ň")
    .replace(/Å‡/g, "Ň")
    .replace(/Å•/g, "ŕ")
    .replace(/Å”/g, "Ŕ")
    .replace(/Å/g, "")
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€¦/g, "...")
    .replace(/â€˘/g, "•")
    .replace(/ðŸ“„/g, "")
    .replace(/ðŸ“Š/g, "")
    .replace(/ðŸ“š/g, "")
    .replace(/ðŸ¤–/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function removeBadGeneratedPrefix(text: string) {
  return String(text || "")
    .replace(/^\s*AI\s+vedúci\s+práce\s*[-–—:]*\s*/i, "")
    .replace(/^\s*AI\s+vedúci\s*[-–—:]*\s*/i, "")
    .replace(/^\s*AI\s+veduci\s+prace\s*[-–—:]*\s*/i, "")
    .replace(/^\s*AI\s+veduci\s*[-–—:]*\s*/i, "")
    .replace(/^\s*Ako\s+AI\s+vedúci\s*[-–—:]*\s*/i, "")
    .replace(/^\s*Ako\s+AI\s+veduci\s*[-–—:]*\s*/i, "")
    .replace(
      /^\s*Výstup\s+nebude\s+začínať\s+textom\s+AI\s*Vedúci\s*[-–—:]*\s*/i,
      "",
    )
    .replace(/^\s*Toto\s+je\s+systémová\s+informácia\s*[-–—:]*\s*/i, "")
    .replace(/^\s*Systémová\s+inštrukcia\s*[-–—:]*\s*/i, "")
    .replace(/^\s*Interná\s+poznámka\s*[-–—:]*\s*/i, "")
    .replace(/^\s*Audit\s+kvality\s*[-–—:]*\s*/i, "")
    .replace(/^\s*Obhajoba\s*[-–—:]*\s*/i, "")
    .replace(/^\s*Výstup\s*[-–—:]*\s*/i, "")
    .replace(
      /^\s*Prezentácia\s*[-–—:]*\s*(?=Názov práce|Cieľ práce|Úvod|Slide|Snímka)/i,
      "",
    );
}

function cleanAiOutput(text: string) {
  return fixEncodingArtifacts(String(text || ""))
    .replace(/\uFEFF/g, "")
    .replace(/\u200B/g, "")
    .replace(/\u200C/g, "")
    .replace(/\u200D/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/```[a-zA-Z]*\n?/g, "")
    .replace(/```/g, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function normalizeVerificationNotices(text: string): string {
  return String(text || "")
    .replace(
      /\bÚdaj(?:e)?\s+nie\s+(?:je|sú)\s+potrebn(?:é|ý)\s+overiť\.?/gi,
      "Údaje sú potrebné overiť.",
    )
    .replace(
      /\bÚdaj(?:e)?\s+(?:je|sú)\s+potrebn(?:é|ý)\s+overiť\.?/gi,
      "Údaje sú potrebné overiť.",
    )
    .replace(
      /\bÚdaj(?:e)?\s+treba\s+overiť\.?/gi,
      "Údaje sú potrebné overiť.",
    )
    .replace(
      /\búdaj(?:e)?\s+nie\s+(?:je|sú)\s+potrebn(?:é|ý)\s+overiť\.?/gi,
      "Údaje sú potrebné overiť.",
    )
    .replace(
      /\búdaj(?:e)?\s+(?:je|sú)\s+potrebn(?:é|ý)\s+overiť\.?/gi,
      "Údaje sú potrebné overiť.",
    );
}

function cleanFinalOutput(text: string) {
  return normalizeVerificationNotices(
    removeBadGeneratedPrefix(cleanAiOutput(text)),
  )
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

function stripModuleExtraSections(text: string, moduleKey: ModuleKey) {
  let cleaned = cleanFinalOutput(text);

  const moduleName = String(moduleKey);

  // Spoločné čistenie pre všetky moduly
  cleaned = cleaned
    .replace(/\n*\s*Interná poznámka\s*:?[\s\S]*$/i, "")
    .replace(/\n*\s*Systémová inštrukcia\s*:?[\s\S]*$/i, "")
    .replace(/\n*\s*Toto je systémová informácia\s*:?[\s\S]*$/i, "")
    .replace(/\bpodľa nahratého súboru\b/gi, "")
    .replace(/\bpodľa prílohy\b/gi, "")
    .replace(/\bpoužívateľ nahral súbor\b/gi, "")
    .replace(/\bdokument obsahuje\b/gi, "")
    .replace(/\bprompt\b/gi, "")
    .replace(/\bmodel\b/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // AI vedúci, Audit kvality, Obhajoba
  if (["supervisor", "quality", "audit", "defense"].includes(moduleName)) {
    cleaned = cleaned
      .replace(/^\s*AI\s+vedúci\s*[-–—:]*\s*/i, "")
      .replace(/^\s*AI\s+veduci\s*[-–—:]*\s*/i, "")
      .replace(/^\s*Ako\s+AI\s+vedúci\s*[-–—:]*\s*/i, "")
      .replace(/^\s*Ako\s+AI\s+veduci\s*[-–—:]*\s*/i, "")
      .replace(/^\s*Audit\s+kvality\s*[-–—:]*\s*/i, "")
      .replace(/^\s*Obhajoba\s*[-–—:]*\s*/i, "")
      .replace(/^\s*Výstup\s*[-–—:]*\s*/i, "")
      .replace(/^\s*Výsledok\s*[-–—:]*\s*/i, "")
      .replace(/^\s*Tu je výstup\s*[-–—:]*\s*/i, "")
      .replace(/^\s*Tu je výsledok\s*[-–—:]*\s*/i, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return cleaned;
  }

  // Preklad
  if (moduleName === "translation") {
    cleaned = cleaned
      .replace(/\n*\s*={2,}\s*ANAL[ÝY]ZA\s*={2,}[\s\S]*$/i, "")
      .replace(/\n*\s*={2,}\s*SK[ÓO]RE\s*={2,}[\s\S]*$/i, "")
      .replace(/\n*\s*={2,}\s*ODPOR[ÚU]ČANIE\s*={2,}[\s\S]*$/i, "")
      .replace(/\n*\s*ANAL[ÝY]ZA\s*:?[\s\S]*$/i, "")
      .replace(/\n*\s*SK[ÓO]RE\s*:?[\s\S]*$/i, "")
      .replace(/\n*\s*ODPOR[ÚU]ČANIE\s*:?[\s\S]*$/i, "")
      .replace(/\n*\s*Koment[áa]r\s*:?[\s\S]*$/i, "")
      .replace(/\n*\s*Vysvetlenie\s*:?[\s\S]*$/i, "")
      .replace(/^\s*Preložený text\s*[:\-–—]*\s*/i, "")
      .replace(/^\s*Preklad\s*[:\-–—]*\s*/i, "")
      .replace(/^\s*Tu je preklad\s*[:\-–—]*\s*/i, "")
      .replace(/^\s*Výsledok prekladu\s*[:\-–—]*\s*/i, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return cleaned;
  }

  // Emailový modul
  if (moduleName === "emails") {
    cleaned = cleaned
      .replace(/\n*\s*={2,}\s*ANAL[ÝY]ZA\s*={2,}[\s\S]*$/i, "")
      .replace(/\n*\s*={2,}\s*SK[ÓO]RE\s*={2,}[\s\S]*$/i, "")
      .replace(/\n*\s*={2,}\s*ODPOR[ÚU]ČANIE\s*={2,}[\s\S]*$/i, "")
      .replace(/\n*\s*ANAL[ÝY]ZA\s*:?[\s\S]*$/i, "")
      .replace(/\n*\s*SK[ÓO]RE\s*:?[\s\S]*$/i, "")
      .replace(/\n*\s*ODPOR[ÚU]ČANIE\s*:?[\s\S]*$/i, "")
      .replace(/\n*\s*Koment[áa]r\s*:?[\s\S]*$/i, "")
      .replace(/\n*\s*Vysvetlenie\s*:?[\s\S]*$/i, "")
      .replace(/^\s*Vytvorený email\s*[:\-–—]*\s*/i, "")
      .replace(/^\s*Email\s*[:\-–—]*\s*/i, "")
      .replace(/^\s*Tu je profesionálny email\s*[:\-–—]*\s*/i, "")
      .replace(/^\s*Tu je návrh emailu\s*[:\-–—]*\s*/i, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const subjectIndex = cleaned.search(/(^|\n)\s*Predmet\s*:/i);

    if (subjectIndex > 0) {
      cleaned = cleaned.slice(subjectIndex).trim();
    }

    return cleaned;
  }

  return cleaned;
}

function sanitizeFileName(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "zedpera-vystup"
  );
}

function htmlEscape(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createDocHtml(title: string, text: string) {
  const paragraphs = cleanFinalOutput(text)
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "<p>&nbsp;</p>";
      return `<p>${htmlEscape(line)}</p>`;
    })
    .join("");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${htmlEscape(title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111827;
      padding: 40px;
    }
    h1 {
      font-size: 20pt;
      margin-bottom: 24px;
    }
    p {
      margin: 0 0 11px 0;
    }
  </style>
</head>
<body>
  <h1>${htmlEscape(title)}</h1>
  ${paragraphs}
</body>
</html>
`;
}

function splitTextToSlides(text: string): SlideContent[] {
  const cleaned = cleanFinalOutput(text);

  if (!cleaned.trim()) return [];

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const slides: SlideContent[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    const isSlideTitle =
      /^snímka\s*\d+/i.test(line) ||
      /^slide\s*\d+/i.test(line) ||
      /^časť\s+[a-z]/i.test(line) ||
      /^[0-9]+\.\s+/.test(line);

    if (isSlideTitle) {
      if (currentTitle || currentBody.length) {
        slides.push({
          title: currentTitle || "Snímka",
          body: currentBody,
        });
      }

      currentTitle = line;
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  if (currentTitle || currentBody.length) {
    slides.push({
      title: currentTitle || "Prezentácia",
      body: currentBody,
    });
  }

  if (slides.length === 0) {
    return [
      {
        title: "Prezentácia",
        body: lines,
      },
    ];
  }

  return slides;
}

function splitLongTextLine(line: string, maxLength = 180) {
  const value = String(line || "").trim();

  if (value.length <= maxLength) return [value];

  const parts: string[] = [];
  let rest = value;

  while (rest.length > maxLength) {
    let cutIndex = rest.lastIndexOf(" ", maxLength);

    if (cutIndex < 80) {
      cutIndex = maxLength;
    }

    parts.push(rest.slice(0, cutIndex).trim());
    rest = rest.slice(cutIndex).trim();
  }

  if (rest) {
    parts.push(rest);
  }

  return parts;
}

function expandSlideBody(body: string[]) {
  const expanded: string[] = [];

  body.forEach((line) => {
    splitLongTextLine(line, 180).forEach((part) => {
      if (part.trim()) expanded.push(part.trim());
    });
  });

  return expanded;
}

function paginateSlideBody(body: string[], maxItemsPerSlide = 6) {
  const expanded = expandSlideBody(body);
  const pages: string[][] = [];

  for (let index = 0; index < expanded.length; index += maxItemsPerSlide) {
    pages.push(expanded.slice(index, index + maxItemsPerSlide));
  }

  return pages.length ? pages : [[]];
}

function downloadBlob({
  content,
  fileName,
  mimeType,
}: {
  content: BlobPart;
  fileName: string;
  mimeType: string;
}) {
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

function getWorkType(profile: SavedProfile | null) {
  return profile?.type || profile?.schema?.label || "Neuvedené";
}

function getExpertise(profile: SavedProfile | null) {
  return (
    profile?.expertise ||
    profile?.workExpertise ||
    profile?.specializationLevel ||
    "Neuvedené"
  );
}
function getCitationStyle(profile: SavedProfile | null) {
  return profile?.citation || "ISO 690";
}

function getWorkLanguage(profile: SavedProfile | null) {
  return (
    profile?.workLanguage || profile?.language || getStoredSystemLanguage()
  );
}

function buildProfileBlock(profile: SavedProfile | null) {
  if (!profile) {
    return "Profil práce nebol vybraný.";
  }

  const keywords =
    profile.keywordsList && profile.keywordsList.length > 0
      ? profile.keywordsList
      : profile.keywords || [];

  return `
Názov práce: ${profile.title || "Neuvedené"}
Téma práce: ${profile.topic || "Neuvedené"}
Typ práce: ${getWorkType(profile)}
Odbornosť výstupu: ${getExpertise(profile)}
Odbor: ${profile.field || "Neuvedené"}
Vedúci práce: ${profile.supervisor || "Neuvedené"}
Citačná norma: ${getCitationStyle(profile)}
Jazyk práce: ${getWorkLanguage(profile)}
Cieľ práce: ${profile.goal || "Neuvedené"}
Výskumný problém: ${profile.problem || "Neuvedené"}
Metodológia: ${profile.methodology || "Neuvedené"}
Výskumné otázky: ${profile.researchQuestions || "Neuvedené"}
Hypotézy: ${profile.hypotheses || "Neuvedené"}
Praktická časť: ${profile.practicalPart || "Neuvedené"}
Vedecký prínos: ${profile.scientificContribution || "Neuvedené"}
Požiadavky na zdroje: ${profile.sourcesRequirement || "Neuvedené"}
Kľúčové slová: ${keywords.length ? keywords.join(", ") : "Neuvedené"}
`.trim();
}

function isBrowserFileLike(value: unknown): value is File {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<File> & {
    arrayBuffer?: unknown;
  };

  return (
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.size === "number" &&
    candidate.size >= 0 &&
    typeof candidate.type === "string" &&
    typeof candidate.arrayBuffer === "function"
  );
}

function createClientRequestId(prefix = "planning"): string {
  const id =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${id}`;
}

function isDataFileName(fileName: string): boolean {
  return dataFileExtensions.has(getFileExtension(fileName));
}

async function readClientTextFallback(file: File): Promise<string> {
  const extension = getFileExtension(file.name);

  if (![".txt", ".md", ".csv", ".rtf"].includes(extension)) {
    return "";
  }

  try {
    const text = await file.text();

    if (extension !== ".rtf") {
      return text.slice(0, 60_000);
    }

    return text
      .replace(/\\par[d]?/g, "\n")
      .replace(/\\'[0-9a-fA-F]{2}/g, " ")
      .replace(/\\[a-zA-Z]+\d* ?/g, "")
      .replace(/[{}]/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 60_000);
  } catch {
    return "";
  }
}

function buildPreparedFilesMetadata(files: AttachedFile[]) {
  return files.map((file) => {
    const extractedText =
      String(file.text || file.content || "").trim();

    return {
      originalId: file.id,
      originalName: file.name,
      originalSize: file.size,
      originalType: file.type,
      preparedName: file.name,
      preparedSize: file.size,
      preparedType: file.type,
      extractionStatus:
        file.extractionStatus ||
        (extractedText ? "client" : "pending"),
      extractionMethod: extractedText
        ? "browser-text-fallback"
        : "server-extraction-required",
      extractionMessage: file.extractionMessage || "",
      extractedText,
    };
  });
}

function buildAttachmentBlock(files: AttachedFile[]) {
  if (!files.length) {
    return "Používateľ nepriložil žiadne súbory.";
  }

  return files
    .map((file, index) => {
      const extractedText =
        String(file.text || file.content || "").trim();

      return [
        `${index + 1}. ${file.name}`,
        `Typ: ${file.type || "neznámy typ"}`,
        `Veľkosť: ${formatBytes(file.size)}`,
        extractedText
          ? `Klientský textový fallback: ${extractedText.length} znakov`
          : "Obsah sa načíta na serveri z binárneho súboru.",
      ].join(" | ");
    })
    .join("\n");
}

async function readApiErrorResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const data = await res.json();

      return String(
        data?.message ||
          data?.error ||
          data?.detail ||
          data?.details ||
          `API error ${res.status}`,
      );
    }

    const text = await res.text();
    const cleaned = text.trim();

    if (!cleaned) return `API error ${res.status}`;

    if (
      cleaned.startsWith("<!DOCTYPE") ||
      cleaned.startsWith("<html") ||
      cleaned.includes("__next_error__")
    ) {
      return `Server vrátil chybu ${res.status}. Detail pozri v termináli.`;
    }

    return cleaned.length > 1200 ? `${cleaned.slice(0, 1200)}...` : cleaned;
  } catch {
    return `API error ${res.status}`;
  }
}

async function readDashboardApiError(
  response: Response,
): Promise<DashboardApiError> {
  const contentType =
    response.headers.get("content-type") || "";

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    const data = await response
      .json()
      .catch(() => null);

    const root = isUnknownRecord(data)
      ? data
      : null;

    const nestedError =
      root &&
      isUnknownRecord(root.error)
        ? root.error
        : null;

    const stringError =
      root &&
      typeof root.error === "string"
        ? root.error
        : "";

    const code =
      (root &&
        readString(root, "code")) ||
      (nestedError &&
        readString(
          nestedError,
          "code",
        )) ||
      `HTTP_${response.status}`;

    const message =
      (root &&
        readString(root, "message")) ||
      (nestedError &&
        readString(
          nestedError,
          "message",
        )) ||
      stringError ||
      `Požiadavka zlyhala s HTTP stavom ${response.status}.`;

    const detail =
      (root &&
        readString(
          root,
          "detail",
          "details",
        )) ||
      (nestedError &&
        readString(
          nestedError,
          "detail",
          "details",
        )) ||
      undefined;

    const purchaseUrl =
      (root &&
        readString(
          root,
          "purchaseUrl",
          "purchase_url",
        )) ||
      (nestedError &&
        readString(
          nestedError,
          "purchaseUrl",
          "purchase_url",
        )) ||
      undefined;

    return new DashboardApiError({
      status: response.status,
      code,
      message,
      detail,
      purchaseUrl,
    });
  }

  return new DashboardApiError({
    status: response.status,
    code: `HTTP_${response.status}`,
    message:
      await readApiErrorResponse(
        response,
      ),
  });
}

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getTodaySkDate() {
  const today = new Date();
  return today.toLocaleDateString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeYear(year: string) {
  if (year.length === 2) {
    const numeric = Number(year);
    return numeric >= 70 ? 1900 + numeric : 2000 + numeric;
  }

  return Number(year);
}

function extractDatesFromText(text: string) {
  const value = String(text || "");
  const dates: Date[] = [];

  const dotRegex = /\b(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{2,4})\b/g;
  const isoRegex = /\b(\d{4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\b/g;

  let match: RegExpExecArray | null;

  while ((match = dotRegex.exec(value)) !== null) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = normalizeYear(match[3]);

    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      dates.push(date);
    }
  }

  while ((match = isoRegex.exec(value)) !== null) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      dates.push(date);
    }
  }

  return dates;
}

function validatePlanningDatesNoPast(text: string) {
  const dates = extractDatesFromText(text);
  const today = getTodayStart();

  const pastDates = dates.filter((date) => date.getTime() < today.getTime());

  if (pastDates.length === 0) {
    return {
      ok: true,
      message: "",
    };
  }

  const uniquePastDates = Array.from(
    new Set(
      pastDates.map((date) =>
        date.toLocaleDateString("sk-SK", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      ),
    ),
  );

  return {
    ok: false,
    message: `Plánovanie nemôže obsahovať dátum v minulosti. Dnes je ${getTodaySkDate()}. Uprav tieto dátumy: ${uniquePastDates.join(
      ", ",
    )}.`,
  };
}

function createTextFileFromInput(text: string) {
  const cleaned = cleanFinalOutput(text);

  return new File([cleaned], "vlozene-data-alebo-vysledky.txt", {
    type: "text/plain;charset=utf-8",
  });
}

function createAnalysisSummary({
  variablesCount,
  frequenciesCount,
  filesCount,
  warningsCount,
}: {
  variablesCount: number;
  frequenciesCount: number;
  filesCount: number;
  warningsCount: number;
}) {
  return [
    `Spracovaných súborov: ${filesCount}.`,
    `Identifikovaných premenných: ${variablesCount}.`,
    `Vytvorených frekvenčných tabuliek: ${frequenciesCount}.`,
    warningsCount > 0
      ? `Počas spracovania vzniklo ${warningsCount} upozornení.`
      : "Spracovanie prebehlo bez zásadných upozornení.",
  ].join("\n");
}

function createAnalysisOutputText(data: AnalysisResult) {
  const warningItems = Array.isArray(data.warnings)
    ? data.warnings.map((item) => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;

          return String(
            record.message ||
              record.text ||
              record.warning ||
              record.title ||
              JSON.stringify(record),
          );
        }

        return String(item);
      })
    : typeof data.warnings === "string" && data.warnings.trim()
      ? [data.warnings.trim()]
      : [];

  const warningsBlock =
    warningItems.length > 0
      ? `Upozornenia:\n${warningItems.map((item) => `- ${item}`).join("\n")}`
      : "";

  const variablesBlock =
    data.variables && data.variables.length > 0
      ? `Identifikované premenné:\n${data.variables
          .map((item: any) => {
            const name = item.name || item.variable || "Premenná";
            const valid = item.valid ?? "neuvedené";
            const mean = item.mean ?? "neuvedené";
            const sd = item.stdDeviation ?? item.std ?? "neuvedené";

            return `- ${name}: validné hodnoty ${valid}, priemer ${mean}, SD ${sd}`;
          })
          .join("\n")}`
      : "";

  const descriptiveStatisticsItems = Array.isArray(data.descriptiveStatistics)
    ? data.descriptiveStatistics
    : Array.isArray((data as any).descriptives)
      ? (data as any).descriptives
      : Array.isArray((data as any).statistics)
        ? (data as any).statistics
        : [];

  const descriptiveBlock =
    descriptiveStatisticsItems.length > 0
      ? `Deskriptívna štatistika:\n${descriptiveStatisticsItems
          .map((item: unknown) => {
            if (!item || typeof item !== "object") {
              return `- ${String(item)}`;
            }

            const record = item as Record<string, unknown>;

            const name =
              record.name ||
              record.variable ||
              record.premenna ||
              record.label ||
              "Premenná";

            const mean =
              record.mean ??
              record.priemer ??
              record.M ??
              record.average ??
              "—";

            const sd =
              record.sd ??
              record.standardDeviation ??
              record.stdDeviation ??
              record.SD ??
              "—";

            const n =
              record.n ?? record.N ?? record.valid ?? record.validN ?? "—";

            return `- ${String(name)}: N=${String(n)}, M=${String(mean)}, SD=${String(sd)}`;
          })
          .join("\n")}`
      : "";

  const hypothesisTestItems = Array.isArray(data.hypothesisTests)
    ? data.hypothesisTests
    : Array.isArray((data as any).hypothesis_tests)
      ? (data as any).hypothesis_tests
      : Array.isArray((data as any).statisticalTests)
        ? (data as any).statisticalTests
        : Array.isArray((data as any).statistical_tests)
          ? (data as any).statistical_tests
          : Array.isArray((data as any).testResults)
            ? (data as any).testResults
            : Array.isArray((data as any).tTests)
              ? (data as any).tTests
              : [];

  const hypothesisTestsBlock =
    hypothesisTestItems.length > 0
      ? `Výsledky štatistických testov:\n${hypothesisTestItems
          .map((item: unknown) => {
            if (!item || typeof item !== "object") {
              return `- ${String(item)}`;
            }

            const record = item as Record<string, unknown>;

            const test =
              record.test ||
              record.testType ||
              record.name ||
              record.title ||
              "Štatistický test";

            const p = record.p ?? record.pValue ?? record.p_hodnota ?? "—";

            const statistic =
              record.statistic ??
              record.t ??
              record.f ??
              record.u ??
              record.h ??
              "";

            const result =
              record.result ||
              record.interpretation ||
              record.description ||
              record.recommendation ||
              "";

            const statisticText =
              statistic !== null &&
              statistic !== undefined &&
              String(statistic) !== ""
                ? `, štatistika=${String(statistic)}`
                : "";

            const resultText = result ? `, ${String(result)}` : "";

            return `- ${String(test)}: p=${String(p)}${statisticText}${resultText}`;
          })
          .join("\n")}`
      : "";

  const chartsBlock =
    data.recommendedCharts && data.recommendedCharts.length > 0
      ? `Odporúčané grafy:\n${data.recommendedCharts
          .map(
            (item: any) =>
              `- ${item.title || "Graf"} (${item.type || "typ neuvedený"}): ${
                item.reason || "vhodné na vizualizáciu výsledkov"
              }`,
          )
          .join("\n")}`
      : "";

  const testsBlock =
    data.recommendedTests && data.recommendedTests.length > 0
      ? `Odporúčané štatistické testy:\n${data.recommendedTests
          .map(
            (item: any) =>
              `- ${item.test || "Test"}: ${
                item.hypothesis || item.reason || "overenie hypotézy"
              }`,
          )
          .join("\n")}`
      : "";

  const tablesBlock =
    data.excelTables && data.excelTables.length > 0
      ? `Odporúčané tabuľky do práce:\n${data.excelTables
          .map((item) => `- ${item}`)
          .join("\n")}`
      : "";

  return cleanFinalOutput(
    [
      data.title || "Výsledky analýzy",
      "",
      data.summary || "",
      "",
      warningsBlock,
      "",
      variablesBlock,
      "",
      descriptiveBlock,
      "",
      chartsBlock,
      "",
      testsBlock,
      "",
      hypothesisTestsBlock,
      "",
      tablesBlock,
      "",
      data.practicalText || "",
      "",
      data.fullText || "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

type ClickableOptionGroupProps<T extends string> = {
  label: string;
  value: T;
  options: ClickableChoice<T>[];
  onChange: (value: T) => void;
  columns?: "languages" | "styles" | "emails";
};

function ClickableOptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = "languages",
}: ClickableOptionGroupProps<T>) {
  const gridClass =
    columns === "styles"
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === "emails"
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[#03111f]/95 p-5 shadow-inner shadow-black/40">
      <div className="mb-5 flex items-center gap-3">
        <p className="shrink-0 text-xs font-black uppercase tracking-[0.24em] text-slate-100">
          {label}
        </p>

        <div className="h-px flex-1 bg-gradient-to-r from-white/20 via-white/10 to-transparent" />
      </div>

      <div className={`grid ${gridClass} gap-3`}>
        {options.map((option) => {
          const isActive = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              title={option.label}
              className={[
                "group relative min-h-[74px] w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-[#020617]",
                isActive
                  ? "border-violet-300 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-xl shadow-violet-950/60"
                  : "border-white/10 bg-[#050b16] text-white shadow-lg shadow-black/25 hover:-translate-y-0.5 hover:border-violet-300/60 hover:bg-[#0b1224]",
              ].join(" ")}
            >
              <span
                className={[
                  "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200",
                  isActive
                    ? "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.32),transparent_38%)] opacity-100"
                    : "group-hover:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.25),transparent_40%)] group-hover:opacity-100",
                ].join(" ")}
              />

              <span className="relative z-10 flex min-w-0 items-center justify-between gap-4">
                <span className="min-w-0 flex-1">
                  <span className="block whitespace-normal break-words text-[15px] font-black leading-5 text-white">
                    {option.label}
                  </span>

                  {option.description ? (
                    <span
                      className={[
                        "mt-1 block whitespace-normal break-words text-xs font-bold leading-5",
                        isActive ? "text-violet-50" : "text-slate-400",
                      ].join(" ")}
                    >
                      {option.description}
                    </span>
                  ) : null}
                </span>

                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
                    isActive
                      ? "border-white bg-white"
                      : "border-white/20 bg-white/5 group-hover:border-violet-300",
                  ].join(" ")}
                >
                  {isActive ? (
                    <span className="h-3 w-3 rounded-full bg-violet-600" />
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================= PAGE =================

/**
 * Úplne samostatný frontend modulu „Plánovanie“.
 *
 * Tento súbor obsahuje vlastný stav, profil práce, entitlementy, limity,
 * prílohy, diktovanie, prompt, priame API volanie, históriu, Canvas a exporty.
 * Nie je závislý od DashboardModuleWorkspace.tsx ani od iného frontendového
 * modulu. Modul je pevne nastavený na hodnotu „planning“.
 */
export type PlanningFrontendProps = {
  readonly profile?: unknown;
  readonly language?: string;
  readonly attachmentLimit?: number | null;
  readonly unlimited?: boolean;
  readonly disabled?: boolean;

  readonly onAttachmentCountChange?: (count: number) => void;
  readonly onEntitlements?: (value: unknown) => void;
  readonly onPageQuota?: (value: unknown) => void;
  readonly onUsage?: (value: unknown) => void;
  readonly onRefresh?: () => void | Promise<void>;

  /**
   * Zachováva kompatibilitu so spoločným useModuleRuntime aj pri doplnení
   * ďalších frontendových vlastností v budúcnosti.
   */
  readonly [key: string]: unknown;
};

export default function PlanningFrontend(
  _runtimeProps: PlanningFrontendProps = {},
) {
  const moduleKey: ModuleKey = "planning";
  const router = useRouter();
  const searchParams = useSearchParams();
  const agent = defaultAgent;
  const { t } = useLanguage();

  const [activeModule, setActiveModule] = useState<ModuleKey>(moduleKey);

  /**
   * Ref sa aktualizuje okamžite pri kliknutí. Asynchrónna požiadavka tak
   * zostane naviazaná na modul, z ktorého bola spustená, aj keď používateľ
   * počas spracovania prepne na inú sekciu.
   */
  const activeModuleRef = useRef<ModuleKey>(activeModule);
  const moduleRunRequestRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeModuleRef.current === moduleKey && activeModule === moduleKey) {
      return;
    }

    activeModuleRef.current = moduleKey;
    moduleRunRequestRef.current = null;
    setActiveModule(moduleKey);

    try {
      localStorage.setItem("zedpera_active_dashboard_module", moduleKey);
    } catch {
      // Modul funguje aj pri zablokovanom localStorage.
    }
  }, [activeModule, moduleKey]);

  const [activeProfile, setActiveProfile] = useState<SavedProfile | null>(null);

  const [input, setInput] = useState("");
  const [secondaryInput, setSecondaryInput] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [activeAttachmentText, setActiveAttachmentText] = useState("");

  /**
   * AI školiteľ, Audit kvality a Obhajoba majú vlastné frontendové komponenty.
   * Dashboard sleduje iba ich aktuálny počet príloh pre informačný panel balíka.
   */

  useEffect(() => {
    const fallbackText = attachedFiles
      .map((file) =>
        String(
          file.text ||
            file.content ||
            "",
        ).trim(),
      )
      .filter(Boolean)
      .join(
        "\n\n-----------------\n\n",
      )
      .slice(0, 120_000);

    setActiveAttachmentText((current) => {
      if (fallbackText) return fallbackText;
      if (attachedFiles.length === 0) return "";
      return current;
    });
  }, [attachedFiles]);

  const [isListening, setIsListening] = useState(false);

  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasText, setCanvasText] = useState("");

  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );

  const [entitlements, setEntitlements] =
    useState<DashboardEntitlements | null>(null);
  const [pageQuota, setPageQuota] = useState<DashboardPageQuota | null>(null);

  const entitlementsRef = useRef<DashboardEntitlements | null>(null);
  const pageQuotaRef = useRef<DashboardPageQuota | null>(null);

  const [billingLoading, setBillingLoading] = useState(true);
  const [billingNotice, setBillingNotice] = useState<BillingNotice | null>(
    null,
  );

  const [systemLanguage, setSystemLanguage] = useState<LanguageCode>("sk");

  const commitBillingState = useCallback(
    (
      nextEntitlements: DashboardEntitlements,
      nextPageQuota: DashboardPageQuota,
    ) => {
      const reconciled = reconcileDashboardBillingState(
        nextEntitlements,
        nextPageQuota,
      );

      entitlementsRef.current = reconciled.entitlements;
      pageQuotaRef.current = reconciled.pageQuota;

      setEntitlements(reconciled.entitlements);
      setPageQuota(reconciled.pageQuota);

      return reconciled;
    },
    [],
  );

  const mergeEntitlementsFromResponse = useCallback(
    (value: unknown) => {
      const normalized = normalizeDashboardEntitlements(value);

      if (!normalized) return;

      const currentQuota = pageQuotaRef.current;

      if (currentQuota) {
        commitBillingState(normalized, currentQuota);
        return;
      }

      entitlementsRef.current = normalized;
      setEntitlements(normalized);
    },
    [commitBillingState],
  );

  const mergePageQuotaFromResponse = useCallback(
    (value: unknown) => {
      const normalized = normalizeDashboardPageQuota(value);

      if (!normalized) return;

      const currentEntitlements = entitlementsRef.current;

      if (currentEntitlements) {
        commitBillingState(currentEntitlements, normalized);
        return;
      }

      pageQuotaRef.current = normalized;
      setPageQuota(normalized);
    },
    [commitBillingState],
  );

  const loadBillingState = useCallback(async () => {
    const existingEntitlements = entitlementsRef.current;
    const existingQuota = pageQuotaRef.current;
    const existingAdmin = Boolean(
      existingEntitlements &&
        (existingEntitlements.isAdmin ||
          existingEntitlements.planId === "admin" ||
          ADMIN_DASHBOARD_EMAILS.has(
            existingEntitlements.email?.trim().toLowerCase() || "",
          )),
    );

    // Pri už potvrdenom ADMIN účte sa nezobrazuje ani interný loading stav.
    setBillingLoading(!existingAdmin);

    try {
      const requestId = createClientRequestId("billing");

      /**
       * Najprv načítame iba autoritatívne entitlementy. Ak server potvrdí
       * ADMIN, stránkový endpoint sa vôbec nevolá a vytvorí sa kanonická
       * neobmedzená kvóta. Bežné účty následne načítajú /api/usage/pages.
       */
      const entitlementResponse = await fetch("/api/entitlements/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Request-Id": requestId,
        },
      });

      if (entitlementResponse.status === 401) {
        router.replace("/login?returnTo=/dashboard");
        return null;
      }

      if (!entitlementResponse.ok) {
        throw await readDashboardApiError(entitlementResponse);
      }

      const entitlementData = await entitlementResponse.json();
      const normalizedEntitlements =
        normalizeDashboardEntitlements(entitlementData);

      if (!normalizedEntitlements) {
        throw new DashboardApiError({
          status: 500,
          code: "INVALID_ENTITLEMENTS_RESPONSE",
          message: "Server vrátil neplatný formát oprávnení používateľa.",
          detail:
            "Odpoveď /api/entitlements/me nebolo možné normalizovať.",
          purchaseUrl: "/pricing",
        });
      }

      const authenticatedAdmin = Boolean(
        normalizedEntitlements.isAdmin ||
          normalizedEntitlements.planId === "admin" ||
          ADMIN_DASHBOARD_EMAILS.has(
            normalizedEntitlements.email?.trim().toLowerCase() || "",
          ),
      );

      let normalizedPageQuota: DashboardPageQuota | null = null;

      if (authenticatedAdmin) {
        // ADMIN nepoužíva balík ani kvótu a /api/usage/pages sa nevolá.
        normalizedPageQuota = {
          ok: true,
          planId: "admin",
          isAdmin: true,
          isUnlimited: true,
          hasUnlimitedAccess: true,
          basePageLimit: null,
          extraPageLimit: 0,
          pageLimit: null,
          pagesUsed: 0,
          pagesRemaining: null,
          pageLimitReached: false,
        };
      } else {
        const pageQuotaResponse = await fetch("/api/usage/pages", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-Request-Id": requestId,
          },
        });

        if (pageQuotaResponse.status === 401) {
          router.replace("/login?returnTo=/dashboard");
          return null;
        }

        if (!pageQuotaResponse.ok) {
          throw await readDashboardApiError(pageQuotaResponse);
        }

        const pageQuotaData = await pageQuotaResponse.json();
        normalizedPageQuota =
          normalizeDashboardPageQuota(pageQuotaData);
      }

      if (!normalizedPageQuota) {
        throw new DashboardApiError({
          status: 500,
          code: "INVALID_PAGE_QUOTA_RESPONSE",
          message: "Server vrátil neplatný formát stránkového limitu.",
          detail:
            "Odpoveď /api/usage/pages nebolo možné normalizovať.",
          purchaseUrl: "/pricing#doplnkove-sluzby",
        });
      }

      const reconciled = commitBillingState(
        normalizedEntitlements,
        normalizedPageQuota,
      );

      setBillingNotice((current) => {
        if (
          isUnlimitedDashboardAccess(
            reconciled.entitlements,
            reconciled.pageQuota,
          )
        ) {
          return null;
        }

        if (!current) return null;

        if (
          current.scope === "module" ||
          MODULE_ACCESS_ERROR_CODES.has(current.code)
        ) {
          return null;
        }

        if (
          current.code === "BILLING_STATE_LOAD_FAILED" ||
          current.code === "BILLING_STATE_UNAVAILABLE"
        ) {
          return null;
        }

        if (
          current.code === "PROMPT_LIMIT_REACHED" &&
          !reconciled.entitlements.promptLimitReached
        ) {
          return null;
        }

        if (
          current.code === "PAGE_LIMIT_REACHED" &&
          (reconciled.pageQuota.isUnlimited ||
            !reconciled.pageQuota.pageLimitReached)
        ) {
          return null;
        }

        return current;
      });

      return reconciled;
    } catch (error: unknown) {
      if (process.env.NODE_ENV === "development") {
        console.info("DASHBOARD_BILLING_LOAD_ERROR", {
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : String(error),
          status:
            error instanceof DashboardApiError ? error.status : undefined,
          code:
            error instanceof DashboardApiError ? error.code : undefined,
          detail:
            error instanceof DashboardApiError ? error.detail : undefined,
        });
      }

      const currentEntitlements = entitlementsRef.current;
      const currentPageQuota = pageQuotaRef.current;

      if (
        currentEntitlements &&
        currentPageQuota &&
        isUnlimitedDashboardAccess(
          currentEntitlements,
          currentPageQuota,
        )
      ) {
        setBillingNotice(null);

        return {
          entitlements: currentEntitlements,
          pageQuota: currentPageQuota,
        };
      }

      if (error instanceof DashboardApiError) {
        setBillingNotice({
          code: error.code,
          message: error.message,
          detail: error.detail,
          purchaseUrl: error.purchaseUrl || "/pricing",
        });
      } else {
        setBillingNotice({
          code: "BILLING_STATE_LOAD_FAILED",
          message:
            "Aktívny balík a limity sa nepodarilo načítať. Obnovte stránku alebo skúste požiadavku znova.",
          detail: error instanceof Error ? error.message : String(error),
          purchaseUrl: "/pricing",
        });
      }

      return null;
    } finally {
      setBillingLoading(false);
    }
  }, [commitBillingState, router]);

  useEffect(() => {
    void loadBillingState();

    const refreshBillingState = () => {
      void loadBillingState();
    };

    window.addEventListener("focus", refreshBillingState);
    window.addEventListener("zedpera:billing-updated", refreshBillingState);

    return () => {
      window.removeEventListener("focus", refreshBillingState);
      window.removeEventListener(
        "zedpera:billing-updated",
        refreshBillingState,
      );
    };
  }, [loadBillingState]);

  useEffect(() => {
    const syncLanguage = () => {
      const stored =
        localStorage.getItem("zedpera_language") ||
        localStorage.getItem("zedpera_system_language") ||
        "sk";

      const safeLanguage: LanguageCode =
        stored === "cs" ||
        stored === "en" ||
        stored === "de" ||
        stored === "pl" ||
        stored === "hu" ||
        stored === "sk"
          ? stored
          : "sk";

      setSystemLanguage(safeLanguage);
    };

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("zedpera:language-changed", syncLanguage);
    window.addEventListener("zedpera:system-language-changed", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("zedpera:language-changed", syncLanguage);
      window.removeEventListener(
        "zedpera:system-language-changed",
        syncLanguage,
      );
    };
  }, []);

  /**
   * Udržuje ref synchronizovaný aj pri zmene modulu cez históriu prehliadača.
   * Zároveň odstráni iba starú modulovú hlášku; globálne limity ostávajú.
   */
  useEffect(() => {
    activeModuleRef.current = activeModule;
    moduleRunRequestRef.current = null;

    setBillingNotice((current) => {
      if (!current) return null;

      return current.scope === "module" ||
        MODULE_ACCESS_ERROR_CODES.has(current.code)
        ? null
        : current;
    });
  }, [activeModule]);

  /**
   * Samostatný frontend má modul pevne určený názvom súboru a route.
   * URL parameter `module` sa preto zámerne ignoruje.
   */

  const [questionnaireMode, setQuestionnaireMode] =
    useState<QuestionnaireMode>("manual");

  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<
    string[]
  >([]);

  const questionnaireText = useMemo(
    () => getQuestionnaireText(systemLanguage),
    [systemLanguage],
  );

  const questionnaireOptions = questionnaireText.options;

  const [customQuestionnairesText, setCustomQuestionnairesText] = useState("");

  const [manualScalesText, setManualScalesText] = useState("");
  const [manualSubscalesText, setManualSubscalesText] = useState("");
  const [groupingColumnsText, setGroupingColumnsText] = useState("");

  const questionnaireConfig = useMemo<QuestionnaireConfig>(() => {
    const hasManualSetup =
      manualScalesText.trim().length > 0 ||
      manualSubscalesText.trim().length > 0 ||
      groupingColumnsText.trim().length > 0 ||
      customQuestionnairesText.trim().length > 0;

    return {
      mode: hasManualSetup ? "manual" : questionnaireMode,
      selectedQuestionnaires: [],
      customQuestionnairesText,
      manualScalesText,
      manualSubscalesText,
      groupingColumnsText,
    };
  }, [
    questionnaireMode,
    customQuestionnairesText,
    manualScalesText,
    manualSubscalesText,
    groupingColumnsText,
  ]);

  function handleQuestionnaireChange(value: QuestionnaireOptionId) {
    if (!value) {
      setQuestionnaireMode("auto-suggest-only");
      setSelectedQuestionnaires([]);
      setCustomQuestionnairesText("");
      setManualScalesText("");
      setManualSubscalesText("");
      setGroupingColumnsText("");
      return;
    }

    if (value === "none") {
      setQuestionnaireMode("none");
      setSelectedQuestionnaires([]);
      setCustomQuestionnairesText("");
      setManualScalesText("");
      setManualSubscalesText("");
      setGroupingColumnsText("");
      return;
    }

    if (value === "custom") {
      setQuestionnaireMode("manual");
      setSelectedQuestionnaires([]);
      return;
    }

    setQuestionnaireMode("selected");
    setCustomQuestionnairesText("");

    setSelectedQuestionnaires((current) => {
      const alreadySelected = current.includes(value);

      if (alreadySelected) {
        const next = current.filter((item) => item !== value);

        if (next.length === 0) {
          setQuestionnaireMode("auto-suggest-only");
        }

        return next;
      }

      return [...current, value];
    });
  }

  /**
   * Pripravený Excel súbor pre modul Analýza dát.
   *
   * Tento stav sa naplní až po úspešnom volaní:
   * /api/analyze-data/prepare
   *
   * Obsahuje nový Excel súbor podľa vzoru:
   * - DATA_RAW
   * - DATA_CLEAN
   * - VARIABLE_DICTIONARY
   * - SCORING
   * - QUALITY_REPORT
   * - README
   *
   * Tento súbor sa dá následne stiahnuť a zároveň sa z neho spúšťa štatistika.
   */
  const [preparedDataFile, setPreparedDataFile] = useState<{
    fileName: string;
    base64: string;
    mimeType: string;
    rows?: number;
    columns?: number;
    warnings?: string[];
    sheets?: string[];
    qualityReport?: Array<{
      kontrola?: string;
      vysledok?: string | number;
      stav?: "ok" | "warning" | "error";
      poznamka?: string;
    }>;
  } | null>(null);

  const [qualityMode, setQualityMode] = useState("style");
  const [outputMode, setOutputMode] = useState("detailed");
  const [translationFrom, setTranslationFrom] = useState<LanguageCode>("sk");
  const [translationTo, setTranslationTo] = useState<LanguageCode>("hu");
  const [translationStyle, setTranslationStyle] =
    useState<TranslationStyle>("academic");

  const [emailType, setEmailType] = useState<EmailType>("supervisor");
  const [emailTone, setEmailTone] = useState<EmailTone>("professional");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const mobileToolPanelRef = useRef<HTMLDivElement | null>(null);

  const activeModuleInfo = useMemo(() => {
    return (
      moduleInfos.find((item) => item.key === activeModule) || moduleInfos[0]
    );
  }, [activeModule]);
  const activeTranslationKey = activeModuleInfo.translationKey;

  const currentFixedModuleUi = getFixedModuleUi(systemLanguage);
  const fixedUi = currentFixedModuleUi[activeModule];

  /**
   * Desktopové moduly zostávajú v pôvodnom rozložení 4 × 2:
   *
   * ľavý stĺpec:  AI školiteľ, Audit kvality, Obhajoba, Preklad
   * pravý stĺpec: Analýza dát, Plánovanie, Emaily, Humanizátor
   *
   * Samostatné frontendové komponenty AI školiteľa, Auditu kvality a
   * Obhajoby nemenia poradie navigácie. Dashboard ich iba načítava.
   */
  const desktopModuleItems = dashboardModuleOrder.filter(
    (moduleKey) => moduleKey !== "originality",
  );
  const desktopModuleSplitIndex = 4;

  const isAdminDashboardSession = Boolean(
    entitlements &&
      (entitlements.isAdmin ||
        entitlements.planId === "admin" ||
        ADMIN_DASHBOARD_EMAILS.has(
          entitlements.email?.trim().toLowerCase() || "",
        )),
  );

  const hasUnlimitedAccess =
    isAdminDashboardSession ||
    isUnlimitedDashboardAccess(
      entitlements,
      pageQuota,
    );

  const hasFeature = useCallback(
    (feature: FeatureKey) => {
      if (
        isUnlimitedDashboardAccess(
          entitlements,
          pageQuota,
        )
      ) {
        return true;
      }

      return Boolean(
        entitlements?.features.includes(
          feature,
        ),
      );
    },
    [entitlements, pageQuota],
  );

  const activeModuleFeature =
    MODULE_REQUIRED_FEATURE[activeModule];

  const activeModuleAllowed =
    Boolean(entitlements) &&
    hasFeature(activeModuleFeature);

  const effectiveAttachmentLimit =
    hasUnlimitedAccess
      ? maxUnlimitedFilesPerRequest
      : Math.max(
          0,
          Math.min(
            maxStandardFilesCount,
            entitlements?.attachmentLimit ??
              1,
          ),
        );

  const activeUploadLimit =
    activeModule === "data"
      ? maxDataFilesPerRequest
      : effectiveAttachmentLimit;

  const generationBlocked =
    isLoading ||
    billingLoading ||
    !entitlements ||
    !pageQuota ||
    !activeModuleAllowed ||
    (!hasUnlimitedAccess &&
      entitlements.promptLimitReached) ||
    (!hasUnlimitedAccess &&
      pageQuota.pageLimitReached);

  /**
   * AI školiteľ, Audit kvality aj Obhajoba sa vykresľujú priamo v tomto
   * DashboardClient súbore. Tým nevzniká závislosť od voliteľných komponentov
   * v components/dashboard/modules, ktoré v projekte nemusia existovať.
   *
   * Všetky moduly používajú rovnaké:
   * - prílohy,
   * - aktívny profil práce,
   * - serverové entitlementy,
   * - stránkové a promptové limity,
   * - volanie /api/chat cez runModule().
   */
  const visibleAttachmentCount = attachedFiles.length;

  const activeModuleLabel = fixedUi.label;

  const activeModuleButtonLabel = fixedUi.button;

  const fixedActiveModuleUi = fixedUi;

  const activeModuleInputLabel = fixedUi.inputLabel;

  const activeModulePlaceholder = fixedUi.placeholder;

  const activeModuleCard = t?.dashboardTools?.cards?.[activeTranslationKey];

  const activeDashboardModuleTexts =
    t?.dashboardTools?.modules?.[activeTranslationKey];

  const activeModuleIntro = fixedUi.intro;

  const activeModuleInputHelp = "";

  const activeModuleResultHelp = activeDashboardModuleTexts?.resultHelp || "";

  const activeModuleEmptyState =
    activeDashboardModuleTexts?.emptyState ||
    "Zatiaľ nie je vložený žiadny text.";

  const activeModuleCardTitle = fixedUi.label;

  const activeModuleCardSubtitle = fixedUi.shortLabel;

  const activeModuleCardDescription = fixedUi.intro;

  const activeModuleResultTitle = fixedUi.resultTitle;

  /**
   * Všetky dynamické prvky pracovnej plochy sú odvodené priamo z activeModule.
   * Žiadny názov, aria-label ani akčné tlačidlo nepoužíva poslednú hodnotu
   * uloženú v inom stave alebo prekladovej karte.
   */
  const dashboardInputId = `dashboard-module-input-${activeModule}`;
  const activeModuleLoadingLabel = `${
    MODULE_PROCESSING_PREFIX[systemLanguage] || MODULE_PROCESSING_PREFIX.sk
  }: ${activeModuleLabel}...`;
  const activeModuleActionClassName =
    MODULE_ACTION_CLASS_NAMES[activeModule] ||
    MODULE_ACTION_CLASS_NAMES.supervisor;

  const ActiveModuleActionIcon =
    activeModule === "translation"
      ? Languages
      : activeModule === "data"
        ? BarChart3
        : activeModule === "emails"
          ? Mail
          : activeModule === "humanizer"
            ? Paintbrush
            : activeModule === "defense"
              ? BookOpen
              : activeModule === "planning"
                ? Sparkles
                : Send;

  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousTitle = document.title;
    document.title = `${activeModuleLabel} | ZEDPERA`;
    document.documentElement.dataset.dashboardModule = activeModule;

    return () => {
      document.title = previousTitle;
      delete document.documentElement.dataset.dashboardModule;
    };
  }, [activeModule, activeModuleLabel]);

  const activeModuleAccessNotice = useMemo<BillingNotice | null>(() => {
    if (billingLoading || !entitlements || activeModuleAllowed) {
      return null;
    }

    return createModuleAccessNotice({
      language: systemLanguage,
      moduleKey: activeModule,
      moduleLabel: activeModuleLabel,
      planName: entitlements.planName,
      feature: activeModuleFeature,
    });
  }, [
    activeModule,
    activeModuleAllowed,
    activeModuleFeature,
    activeModuleLabel,
    billingLoading,
    entitlements,
    systemLanguage,
  ]);

  /**
   * Modulová hláška sa nikdy nezobrazuje zo starého textu uloženého v stave.
   * Vždy sa vytvorí nanovo z activeModule, jeho fixného názvu a jeho funkcie.
   */
  const visibleBillingNotice = useMemo<BillingNotice | null>(() => {
    if (hasUnlimitedAccess) {
      return null;
    }

    if (activeModuleAccessNotice) {
      return activeModuleAccessNotice;
    }

    if (!billingNotice) {
      return null;
    }

    const isModuleNotice =
      billingNotice.scope === "module" ||
      MODULE_ACCESS_ERROR_CODES.has(
        billingNotice.code,
      );

    if (isModuleNotice) {
      return null;
    }

    return billingNotice;
  }, [
    activeModuleAccessNotice,
    billingNotice,
    hasUnlimitedAccess,
  ]);

  const exportTitle = useMemo(() => {
    return `${activeModuleLabel} - ${activeProfile?.title || "output"}`.trim();
  }, [activeModuleLabel, activeProfile]);

  const selectorTranslations = getDashboardSelectorTranslations(t);

  const languageSelectOptions =
    createLanguageSelectOptions(selectorTranslations);

  const translationStyleOptions =
    createTranslationStyleOptions(selectorTranslations);

  const emailTypeOptions = createEmailTypeOptions(selectorTranslations);

  const emailToneOptions = createEmailToneOptions(selectorTranslations);

  const getLanguageLabel = (value: LanguageCode): string => {
    const option = languageSelectOptions.find(
      (languageOption) => languageOption.value === value,
    );

    return option?.label ?? value;
  };

  const getTranslationStyleLabel = (value: TranslationStyle): string => {
    const option = translationStyleOptions.find(
      (styleOption) => styleOption.value === value,
    );

    return option?.label ?? value;
  };

  const getEmailTypeLabel = (value: EmailType): string => {
    const option = emailTypeOptions.find(
      (emailTypeOption) => emailTypeOption.value === value,
    );

    return option?.label ?? value;
  };

  const getEmailToneLabel = (value: EmailTone): string => {
    const option = emailToneOptions.find(
      (emailToneOption) => emailToneOption.value === value,
    );

    return option?.label ?? value;
  };

  const startNewWork = useCallback(() => {
    activeModuleRef.current = moduleKey;
    moduleRunRequestRef.current = null;
    setActiveProfile(null);
    setActiveModule(moduleKey);
    setBillingNotice((current) =>
      current &&
      (current.scope === "module" ||
        MODULE_ACCESS_ERROR_CODES.has(current.code))
        ? null
        : current,
    );
    setInput("");
    setSecondaryInput("");
    setResult("");
    setCanvasText("");
    setAttachedFiles([]);
    setActiveAttachmentText("");
    setAnalysisResult(null);
    setAnalysisModalOpen(false);

    try {
      localStorage.removeItem("active_profile");
      localStorage.removeItem("profile");
      localStorage.removeItem("latest_generated_work_text");
      localStorage.removeItem("last_ai_output");
      localStorage.setItem("zedpera_active_dashboard_module", moduleKey);
    } catch {
      // localStorage nemusí byť dostupný
    }

    window.dispatchEvent(
      new CustomEvent("zedpera:active-profile-changed", {
        detail: null,
      }),
    );

    router.replace("/dashboard?module=supervisor", {
      scroll: false,
    });

    setTimeout(() => {
      mobileToolPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }, [router]);

  function SelectField<T extends string>({
    label,
    value,
    options,
    labels,
    onChange,
  }: {
    label: string;
    value: T;
    options: SelectOption<T>[];
    labels: Record<string, string>;
    onChange: (value: T) => void;
  }) {
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-black text-white">
          {label}
        </span>

        <div className="relative">
          <select
            value={value}
            onChange={(event) => onChange(event.target.value as T)}
            className="w-full cursor-pointer appearance-none rounded-2xl border border-white/15 bg-black px-4 py-3 pr-11 text-sm font-bold text-white outline-none transition hover:border-white/30 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-black text-white"
              >
                {labels?.[option.labelKey] || option.value}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
        </div>
      </label>
    );
  }

  useEffect(() => {
    function handleActiveProfileChanged(event: Event) {
      const customEvent = event as CustomEvent<SavedProfile>;

      if (!customEvent.detail) return;

      const systemLanguage = getStoredSystemLanguage();

      const normalizedProfile = prepareProfileForApi(
        customEvent.detail,
        systemLanguage,
      );

      if (!normalizedProfile) return;

      setActiveProfile(normalizedProfile);

      try {
        localStorage.setItem(
          "active_profile",
          JSON.stringify(normalizedProfile),
        );
        localStorage.setItem("profile", JSON.stringify(normalizedProfile));
      } catch {
        // localStorage nemusí byť dostupný
      }
    }

    window.addEventListener(
      "zedpera:active-profile-changed",
      handleActiveProfileChanged,
    );

    return () => {
      window.removeEventListener(
        "zedpera:active-profile-changed",
        handleActiveProfileChanged,
      );
    };
  }, []);

  useEffect(() => {
    const systemLanguage = getStoredSystemLanguage();
    persistSystemLanguage(systemLanguage);

    const activeRaw = localStorage.getItem("active_profile");
    const profileRaw = localStorage.getItem("profile");
    const active = normalizeProfile(safeJsonParse<any>(activeRaw));
    const profile = normalizeProfile(safeJsonParse<any>(profileRaw));

    const selectedProfile = active || profile || null;

    const profileWithLanguage = prepareProfileForApi(
      selectedProfile,
      systemLanguage,
    );

    setActiveProfile(profileWithLanguage);

    if (profileWithLanguage) {
      localStorage.setItem(
        "active_profile",
        JSON.stringify(profileWithLanguage),
      );
      localStorage.setItem("profile", JSON.stringify(profileWithLanguage));
    }
  }, []);

  useEffect(() => {
    setInput("");
    setSecondaryInput("");
    setResult("");
    setAttachedFiles([]);
    setActiveAttachmentText("");
    setCanvasText("");
    setAnalysisResult(null);
    setAnalysisModalOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [activeModule]);

  useEffect(() => {
    if (!isLoading && canvasText.trim().length > 0) {
      setCanvasOpen(true);
    }
  }, [canvasText, isLoading]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const requestedModule =
      activeModuleRef.current;

    const incomingFiles =
      Array.from(files);

    const validFiles: AttachedFile[] = [];

    for (const file of incomingFiles) {
      if (!isAllowedUploadFile(file)) {
        alert(
          `Súbor "${file.name}" má nepodporovaný formát. Povolené sú PDF, Word, TXT, RTF, ODT, obrázky, Excel, CSV a PowerPoint.`,
        );
        continue;
      }

      if (
        requestedModule === "data" &&
        !isDataFileName(file.name)
      ) {
        alert(
          `Súbor "${file.name}" nie je možné použiť v Analýze dát. Nahrajte XLSX, XLS, XLSM alebo CSV súbor.`,
        );
        continue;
      }

      if (file.size > maxFileSizeBytes) {
        alert(
          `Súbor "${file.name}" je príliš veľký. Maximum je ${maxFileSizeMb} MB.`,
        );
        continue;
      }

      const clientText =
        await readClientTextFallback(file);

      validFiles.push({
        id: createFileId(),
        name: file.name,
        size: file.size,
        type:
          file.type ||
          "application/octet-stream",
        file,
        text: clientText || undefined,
        extractionStatus: clientText
          ? "client"
          : "pending",
        extractedChars:
          clientText.length,
        extractionMessage: clientText
          ? "Textový fallback bol načítaný v prehliadači."
          : "Obsah prílohy sa načítava.",
      });

      /**
       * Analýza dát spracúva jeden samostatný dataset na požiadavku.
       * Ďalší súbor používateľ spustí ako novú analýzu.
       */
      if (
        requestedModule === "data" &&
        validFiles.length >=
          maxDataFilesPerRequest
      ) {
        break;
      }
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (
      activeModuleRef.current !==
      requestedModule
    ) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    const uploadLimit =
      requestedModule === "data"
        ? maxDataFilesPerRequest
        : effectiveAttachmentLimit;

    const nextFiles =
      requestedModule === "data"
        ? []
        : [...attachedFiles];

    let limitReached = false;

    for (const file of validFiles) {
      if (nextFiles.length >= uploadLimit) {
        limitReached = true;
        break;
      }

      const duplicate = nextFiles.some(
        (item) =>
          item.name === file.name &&
          item.size === file.size &&
          item.type === file.type,
      );

      if (!duplicate) {
        nextFiles.push(file);
      }
    }

    setAttachedFiles(nextFiles);

    if (limitReached) {
      setBillingNotice({
        code: hasUnlimitedAccess
          ? "ATTACHMENT_REQUEST_SAFETY_LIMIT_REACHED"
          : "ATTACHMENT_LIMIT_REACHED",
        message: hasUnlimitedAccess
          ? `V jednej požiadavke je možné technicky spracovať maximálne ${uploadLimit} príloh. ADMIN nemá balíkový limit.`
          : uploadLimit === 1
            ? "Váš balík povoľuje maximálne 1 prílohu."
            : `Váš balík povoľuje maximálne ${uploadLimit} príloh.`,
        purchaseUrl: hasUnlimitedAccess
          ? "/dashboard"
          : "/pricing",
      });
    } else {
      setBillingNotice((current) => {
        if (!current) return null;

        return current.code ===
          "ATTACHMENT_LIMIT_REACHED" ||
          current.code ===
            "ATTACHMENT_REQUEST_SAFETY_LIMIT_REACHED"
          ? null
          : current;
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (id: string) => {
    setAttachedFiles((previousFiles) =>
      previousFiles.filter(
        (file) => file.id !== id,
      ),
    );

    setBillingNotice((current) => {
      if (!current) return null;

      return current.code ===
        "ATTACHMENT_LIMIT_REACHED" ||
        current.code ===
          "ATTACHMENT_REQUEST_SAFETY_LIMIT_REACHED"
        ? null
        : current;
    });
  };

  const resetCurrentModule = () => {
    setInput("");
    setSecondaryInput("");
    setResult("");
    setCanvasText("");
    setAttachedFiles([]);
    setActiveAttachmentText("");
    setAnalysisResult(null);
    setAnalysisModalOpen(false);
  };

  useEffect(() => {
    if (searchParams.get("newWork") === "1") {
      startNewWork();
    }
  }, [searchParams, startNewWork]);

  async function saveHistoryItem(inputData: {
    module: ModuleKey;
    title: string;
    userMessage: string;
    assistantMessage: string;
    result?: Record<string, unknown>;
  }) {
    if (!inputData.assistantMessage.trim()) return;

    const localItem = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `history_${Date.now()}`,
      profile_id: activeProfile?.id || null,
      module: inputData.module,
      title: inputData.title,
      user_message: inputData.userMessage,
      assistant_message: inputData.assistantMessage,
      result: inputData.result || {},
      created_at: new Date().toISOString(),
    };

    try {
      const raw = localStorage.getItem("chat_history");
      const existing = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(existing) ? existing : [];

      /**
       * Do localStorage neukladáme celý result analýzy.
       * Kompletný výsledok sa ďalej uloží cez /api/history.
       */
      const localItemForStorage = {
        ...localItem,

        user_message: String(inputData.userMessage || "").slice(0, 10_000),

        assistant_message: String(inputData.assistantMessage || "").slice(
          0,
          40_000,
        ),

        result: {
          module: inputData.module,
          title: inputData.title,
          hasResult: Boolean(inputData.result),
        },
      };

      /**
       * Pôvodne sa ukladalo 300 záznamov.
       * V localStorage ponecháme maximálne 40 ľahkých záznamov.
       */
      let nextItems = [localItemForStorage, ...list].slice(0, 40);

      let saved = false;

      while (nextItems.length > 0 && !saved) {
        try {
          localStorage.setItem("chat_history", JSON.stringify(nextItems));

          saved = true;
        } catch (storageError) {
          const quotaExceeded =
            storageError instanceof DOMException &&
            (storageError.name === "QuotaExceededError" ||
              storageError.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
              storageError.code === 22 ||
              storageError.code === 1014);

          if (!quotaExceeded) {
            throw storageError;
          }

          // Pri plnom úložisku odstránime najstarší záznam.
          nextItems = nextItems.slice(0, -1);
        }
      }

      if (!saved) {
        localStorage.removeItem("chat_history");
      }
    } catch (error) {
      console.warn(
        "Lokálna história sa neuložila:",
        error instanceof Error ? error.message : String(error),
      );
    }

    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          profileId: activeProfile?.id || null,
          module: inputData.module,
          title: inputData.title,
          userMessage: inputData.userMessage,
          assistantMessage: inputData.assistantMessage,
          result: inputData.result || {},
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        console.warn(
          "História sa neuložila do databázy:",
          data?.error || `HTTP ${res.status}`,
        );
      }
    } catch (error) {
      console.warn("História sa neuložila do databázy:", error);
    }
  }

  const startDictation = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Diktovanie nie je podporované. Skús Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();

    const systemLanguage = getStoredSystemLanguage();

    const speechLanguageMap: Record<SystemLanguage, string> = {
      sk: "sk-SK",
      cs: "cs-CZ",
      en: "en-US",
      de: "de-DE",
      pl: "pl-PL",
      hu: "hu-HU",
    };

    recognition.lang = speechLanguageMap[systemLanguage] || "sk-SK";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";

      if (transcript) {
        setInput((prev) => `${prev}${prev.trim() ? " " : ""}${transcript}`);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const buildModulePrompt = (moduleOverride: ModuleKey = activeModule) => {
    const moduleKey = String(moduleOverride);
    const systemLanguage = getStoredSystemLanguage();
    const profileForPrompt = prepareProfileForApi(
      activeProfile,
      systemLanguage,
    );
    const profileBlock = buildProfileBlock(profileForPrompt);
    const citationStyle = getCitationStyle(profileForPrompt);
    const workLanguage = getWorkLanguage(profileForPrompt);
    const attachmentBlock = buildAttachmentBlock(attachedFiles);

    const baseRules = `
PROFIL PRÁCE:
${profileBlock}

PRILOŽENÉ SÚBORY:
${attachmentBlock}

DÔLEŽITÉ PRAVIDLÁ PRE VŠETKY MODULY:
- Hlavný jazyk celého systému je: ${workLanguage}.
- Výstup musí byť v jazyku práce: ${workLanguage}.
- Všetky odpovede, nadpisy, vysvetlenia, tabuľky, odporúčania a texty musia byť v tomto jazyku.
- Výstup píš ako čistý text vhodný do Wordu.
- Nepíš Markdown znaky ako #, ##, ###, **, *, --- ani kódové bloky.
- Nevkladaj na úplný začiatok technické nadpisy typu „AI vedúci“, „Audit kvality“, „Obhajoba“, „Výstup“ ani názov modulu.
- Nepoužívaj poškodené znaky, kódovanie ani nečitateľné symboly.
- Nevymýšľaj zdroje, autorov, DOI, URL, roky ani vydavateľov.
- Ak chýba alebo nie je možné bezpečne potvrdiť údaj, napíš presne: Údaje sú potrebné overiť.
- Ak sú priložené súbory, najprv over, či súvisia s aktívnym profilom práce.
- Ak priložený dokument pravdepodobne nesúvisí s profilom práce, uveď upozornenie, ale pri výslovnej požiadavke používateľa dokument napriek tomu prečítaj a spracuj.
- Ak príloha súvisí s profilom práce, použi jej extrahovaný text ako hlavný podklad.
- Ak sú priložené súbory, v závere uveď, z ktorých príloh sa čerpalo.
- Citačná norma: ${citationStyle}.
`.trim();

    if (moduleKey === "supervisor") {
      return `
${baseRules}

ÚLOHA:
Správaj sa ako odborný vedúci akademickej práce. Skontroluj logiku, cieľ, výskumný problém, metodológiu, štruktúru, argumentáciu a nadväznosť práce.

TEXT NA KONTROLU:
${input || "Použi text z priložených dokumentov, ak je dostupný."}

ZAČIATOK ODPOVEDE:
Začni priamo nadpisom:
Hodnotenie práce: ${activeProfile?.title || "bez názvu"}

POVINNÁ ŠTRUKTÚRA:
1. Celkové hodnotenie práce
2. Silné stránky
3. Slabé stránky
4. Logika a nadväznosť textu
5. Cieľ, výskumný problém a metodológia
6. Chýbajúce časti alebo nedostatočne rozpracované miesta
7. Konkrétne pripomienky vedúceho práce
8. Odporúčané opravy
9. Otázky na konzultáciu
10. Skóre kvality 0–100
`.trim();
    }

    if (moduleKey === "quality") {
      const modeInstruction =
        qualityMode === "style"
          ? `
Kontroluj výhradne štylistiku, jazyk, akademickosť, plynulosť viet, nevhodné formulácie, zrozumiteľnosť a formálnosť textu.
Nehodnoť obsah práce ako celok.
Pri každej slabej alebo neakademickej formulácii uveď aj konkrétnu prepísanú verziu.
`.trim()
          : qualityMode === "citations"
            ? `
Kontroluj výhradne citácie, odkazy v texte, zoznam literatúry, úplnosť bibliografických údajov a súlad s citačnou normou.
Nehodnoť celú prácu obsahovo.
Ak zistíš problém s citáciou, uveď aj návrh, ako má byť citácia alebo odkaz opravený.
Nevymýšľaj neexistujúce zdroje, autorov, DOI, URL ani vydavateľov.
`.trim()
            : qualityMode === "logic"
              ? `
Kontroluj logiku, nadväznosť, argumentáciu, duplicity, vnútornú súdržnosť textu a prepojenie cieľa, problému, metodológie a záverov.
Pri každom logickom probléme uveď aj návrh opravy alebo odporúčanú preformulovanú verziu.
`.trim()
              : `
Urob celkový audit kvality akademickej práce.
Jasne oddeľ štylistiku, logiku, citácie, metodológiu, odbornú presnosť a praktické odporúčania.
Výstup nesmie byť iba kritika. Musí obsahovať aj konkrétne prepísané vety a zapracovanú upravenú verziu textu.
`.trim();

      return `
${baseRules}

ÚLOHA:
Urob audit kvality akademickej práce.

Cieľom nie je iba kritizovať text. Cieľom je používateľovi prakticky pomôcť text zlepšiť.

REŽIM KONTROLY:
${qualityMode}

PRESNÁ INŠTRUKCIA:
${modeInstruction}

TEXT NA KONTROLU:
${input || "Použi text z priložených dokumentov, ak je dostupný."}

ZAČIATOK ODPOVEDE:
Začni priamo nadpisom:
${activeProfile?.title || "Audit kontrolovaného textu"}

POVINNÁ ŠTRUKTÚRA:

1. Stručné hodnotenie kvality textu
Uveď 3 až 5 viet. Zhodnoť odbornú úroveň, akademickosť, zrozumiteľnosť a celkovú použiteľnosť textu.

2. Nájdené problémy
Vypíš konkrétne problémy v texte.
Nepíš všeobecné frázy.
Pri každom probléme uveď, prečo je problém dôležitý.

3. Konkrétne pripomienky
Uveď praktické pripomienky k textu.
Zameraj sa na:
- nepresné formulácie,
- slabé alebo neakademické vety,
- nelogické nadväznosti,
- chýbajúce vysvetlenia,
- duplicity,
- odborné nepresnosti,
- problémy s citáciami, ak sa v texte nachádzajú.

4. Prepísané vety
Táto časť je povinná.

Pri každej úprave použi presný formát:

Pôvodná veta:
Problém:
Opravená veta:

Ak text obsahuje viac slabých viet, vyber minimálne 5 najdôležitejších viet a prepíš ich.
Ak text obsahuje menej viet, prepíš všetky problematické vety.

5. Zapracovaná upravená verzia textu
Táto časť je povinná.

Prepíš celý kontrolovaný text do lepšej akademickej podoby.
Zachovaj pôvodný význam.
Zlepši:
- štylistiku,
- odborný jazyk,
- logickú nadväznosť,
- plynulosť,
- formálnosť,
- presnosť formulácií.

Ak niektoré údaje chýbajú, nevymýšľaj ich. Napíš: údaj je potrebné doplniť.

6. Skóre kvality od 0 do 100
Uveď číselné skóre a krátke vysvetlenie, prečo bolo pridelené.

7. Odporúčané ďalšie kroky
Uveď konkrétne kroky, ktoré má používateľ urobiť ďalej.

DÔLEŽITÉ PRAVIDLÁ:
- Nepíš iba kritiku.
- Každý zásadný problém musí mať aj návrh opravy.
- Ak označíš vetu ako slabú, musíš ju aj prepísať.
- Výstup musí byť prakticky použiteľný pre študenta.
- Nevymýšľaj zdroje, autorov, DOI, URL, roky ani vydavateľov.
- Nepoužívaj markdown znaky ako #, ##, **, --- ani kódové bloky.
- Nepíš technický úvod.
- Nezačínaj odpoveď slovami „Audit kvality“ ani „Tu je audit“.
`.trim();
    }

    if (moduleKey === "defense") {
      return `
${baseRules}

ÚLOHA:
Priprav kompletnú obhajobu práce. Musí vzniknúť aj prezentácia, aj sprievodný text, aj otázky a odpovede.

TEXT / PODKLAD:
${input || "Použi aktívny profil práce a priložené dokumenty."}

ZAČIATOK ODPOVEDE:
Začni priamo názvom práce:
${activeProfile?.title || "Prezentácia k obhajobe práce"}

POVINNÁ ŠTRUKTÚRA VÝSTUPU:
ČASŤ A: PREZENTÁCIA – OBSAH SNÍMOK
ČASŤ B: SPRIEVODNÝ TEXT K PREZENTÁCII
ČASŤ C: OTÁZKY KOMISIE A VZOROVÉ ODPOVEDE
ČASŤ D: SLABÉ MIESTA PRÁCE
ČASŤ E: KRÁTKA VERZIA OBHAJOBY NA 3–5 MINÚT
ČASŤ F: KONTROLA PRÍLOH

DÔLEŽITÉ:
- Prezentáciu priprav tak, aby sa dala exportovať do PPTX.
- Každú snímku označ ako „Snímka 1“, „Snímka 2“, „Snímka 3“.
- Pri každej snímke uveď krátke body vhodné do prezentácie.
- Vypíš celý obsah, neskracuj odpoveď.
`.trim();
    }

    if (moduleKey === "translation") {
      return `
${baseRules}

ÚLOHA:
Prelož text akademicky, prirodzene a presne.

Zo jazyka: ${getLanguageLabel(translationFrom)}
Do jazyka: ${getLanguageLabel(translationTo)}
Štýl prekladu: ${getTranslationStyleLabel(translationStyle)}

TEXT NA PREKLAD:
${input}

PRÍSNE PRAVIDLÁ PRE VÝSTUP:
- Vráť iba samotný preložený text.
- Nepíš nadpis „Preklad“.
- Nepíš „Preložený text“.
- Nepíš analýzu.
- Nepíš skóre.
- Nepíš komentár k prekladu.
- Nepíš vysvetlenie.
- Nepíš hodnotenie.
- Nepíš odporúčania.
- Nepíš časti ako „ANALÝZA“, „SKÓRE“, „ODPORÚČANIE“.
- Neuvádzaj, že text bol preložený.
- Začni priamo prvým slovom preloženého textu.
`.trim();
    }

    if (moduleKey === "data") {
      return `
${baseRules}

ÚLOHA:
Používateľ spustil modul Analýza dát.

Správny tok analýzy:
1. pôvodný XLSX/XLS/XLSM/CSV súbor sa odošle do /api/analyze-data/prepare,
2. prepare endpoint vytvorí prepared raw data Excel,
3. DashboardClient.tsx z prepared súboru načíta hárok DATA_CLEAN,
4. štatistika sa vypočíta v components/analysis/analysisStats.ts,
5. výsledky sa zobrazia v components/analysis/AnalysisResultsModal.tsx,
6. export výsledkov robí AnalysisResultsModal.tsx.

ZADANIE POUŽÍVATEĽA:
${input || "Použi priložené dátové súbory, ak sú dostupné."}

PRAVIDLÁ:
- Nevymýšľaj štatistické výsledky.
- Nevytváraj fiktívne hodnoty, tabuľky ani grafy.
- Raw dáta sa musia najprv pripraviť cez /api/analyze-data/prepare.
- Štatistika sa musí počítať až z prepared raw dát z hárku DATA_CLEAN.
- Výpočty patria do components/analysis/analysisStats.ts.
- Export výsledkov patrí do AnalysisResultsModal.tsx.
- Hlavný app/api/analyze-data/route.ts sa nepoužíva.
`.trim();
    }

    if (moduleKey === "planning") {
      return `
${baseRules}

ÚLOHA:
Vytvor iba predbežný a orientačný plán práce bez markdown znakov.

DNEŠNÝ DÁTUM:
${getTodaySkDate()}

ZADANIE:
${input}

PRAVIDLÁ PRE PLÁNOVANIE:
- Plánovanie nesmie obsahovať termíny v minulosti.
- Všetky dátumy musia byť od dnešného dátumu alebo v budúcnosti.
- Harmonogram musí byť označený ako predbežný / orientačný.
- Ak používateľ zadal termín odovzdania, rozvrhni etapy spätne iba v rozsahu, ktorý nezasahuje do minulosti.
- Ak je termín príliš blízko, upozorni, že plán je rizikový.
- Nepíš, že ide o záväzný termínový plán.
- Použi formulácie: predbežne, orientačne, odporúčané, navrhovaný harmonogram.

VÝSTUP:
1. Predbežné upozornenie
2. Orientačný harmonogram
3. Etapy práce
4. Kontrolné body
5. Riziká pri nedodržaní termínov
6. Odporúčanie na ďalší postup
`.trim();
    }

    if (moduleKey === "emails") {
      return `
${baseRules}

ÚLOHA:
Vytvor profesionálny email.

Typ emailu: ${getEmailTypeLabel(emailType)}
Tón: ${getEmailToneLabel(emailTone)}

ČO MÁ EMAIL RIEŠIŤ:
${input}

PRÍSNE PRAVIDLÁ PRE VÝSTUP:
- Vráť iba hotový email.
- Nepíš analýzu.
- Nepíš skóre.
- Nepíš komentár.
- Nepíš odporúčania.
- Nepíš vysvetlenie.
- Nepíš časti ako „ANALÝZA“, „SKÓRE“, „ODPORÚČANIE“.
- Nepíš text typu „Tu je návrh emailu“.
- Nepíš žiadny text pred predmetom.
- Nepíš žiadny text po emaile.
- Výstup musí obsahovať iba:
Predmet:
Text emailu:

POVINNÝ FORMÁT:
Predmet: ...

Text emailu:
...
`.trim();
    }

    return input;
  };

  function normalizeDashboardCellValue(value: unknown): string | number | null {
    if (value === null || value === undefined) return null;

    const text = String(value).trim();

    if (!text) return null;

    const numeric = Number(
      text.replace(/\s/g, "").replace(",", ".").replace("%", ""),
    );

    if (Number.isFinite(numeric)) {
      return numeric;
    }

    return text;
  }

  async function readPreparedExcelCleanRows(
    file: File,
  ): Promise<AnalysisRow[]> {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    const preferredSheetName = workbook.SheetNames.find(
      (sheetName) => sheetName.toUpperCase() === "DATA_CLEAN",
    );

    const sheetName = preferredSheetName || workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("Prepared Excel neobsahuje žiadny hárok.");
    }

    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });

    return rows
      .map((row) => {
        const normalizedRow: AnalysisRow = {};

        Object.entries(row).forEach(([key, value]) => {
          const header = String(key || "").trim();

          if (!header || header.startsWith("__EMPTY")) return;

          normalizedRow[header] = normalizeDashboardCellValue(value);
        });

        return normalizedRow;
      })
      .filter((row) => Object.keys(row).length > 0);
  }

  function getDashboardColumnNames(rows: AnalysisRow[]): string[] {
    const columns = new Set<string>();

    rows.forEach((row) => {
      Object.keys(row || {}).forEach((key) => {
        if (key.trim()) columns.add(key);
      });
    });

    return Array.from(columns);
  }

  const runModule = async () => {
    if (isLoading || billingLoading) return;

    const requestedModule =
      activeModuleRef.current;

    const moduleRunRequestId =
      createClientRequestId(
        `module-${requestedModule}`,
      );

    moduleRunRequestRef.current =
      moduleRunRequestId;

    const isCurrentModuleRun = () =>
      moduleRunRequestRef.current ===
        moduleRunRequestId &&
      activeModuleRef.current ===
        requestedModule;

    const requestedModuleUi = getFixedModuleUi(systemLanguage)[requestedModule];
    const requestedModuleLabel = requestedModuleUi.label;
    const requestedModuleResultTitle = requestedModuleUi.resultTitle;

    setBillingNotice(null);

    let currentEntitlements = entitlements;
    let currentPageQuota = pageQuota;

    if (!currentEntitlements || !currentPageQuota) {
      const loadedBillingState = await loadBillingState();

      currentEntitlements = loadedBillingState?.entitlements || null;
      currentPageQuota = loadedBillingState?.pageQuota || null;
    }

    if (!currentEntitlements || !currentPageQuota) {
      setBillingNotice({
        code: "BILLING_STATE_UNAVAILABLE",
        message:
          "Aktívny balík a limity nie sú dostupné. Obnovte stránku a skúste požiadavku znova.",
        purchaseUrl: "/pricing",
      });
      return;
    }

    const requiredFeature = MODULE_REQUIRED_FEATURE[requestedModule];
    const currentHasUnlimitedAccess =
      isUnlimitedDashboardAccess(
        currentEntitlements,
        currentPageQuota,
      );

    if (
      !currentHasUnlimitedAccess &&
      !currentEntitlements.features.includes(requiredFeature)
    ) {
      setBillingNotice({
        code: "FEATURE_NOT_INCLUDED",
        message: `Funkcia „${requestedModuleLabel}“ nie je súčasťou aktivovaného balíka.`,
        detail: requiredFeature,
        purchaseUrl: "/pricing",
        scope: "module",
        moduleKey: requestedModule,
        feature: requiredFeature,
      });
      return;
    }

    if (!currentHasUnlimitedAccess && currentEntitlements.promptLimitReached) {
      setBillingNotice({
        code: "PROMPT_LIMIT_REACHED",
        message:
          "Limit dostupných promptov bol vyčerpaný. Pre pokračovanie si aktivujte platený balík.",
        purchaseUrl: "/pricing",
      });
      return;
    }

    if (
      !currentHasUnlimitedAccess &&
      currentPageQuota.pageLimitReached
    ) {
      setBillingNotice({
        code: "PAGE_LIMIT_REACHED",
        message:
          "Stránkový limit bol vyčerpaný. Pre pokračovanie si dokúpte ďalšie strany.",
        purchaseUrl: "/pricing#doplnkove-sluzby",
      });
      return;
    }

    if (
      !currentEntitlements.hasUnlimitedAccess &&
      !currentEntitlements.isAdmin &&
      currentEntitlements.attachmentLimit !== null &&
      attachedFiles.length > currentEntitlements.attachmentLimit
    ) {
      setBillingNotice({
        code: "ATTACHMENT_LIMIT_REACHED",
        message: `Váš balík povoľuje maximálne ${currentEntitlements.attachmentLimit} príloh.`,
        purchaseUrl: "/pricing",
      });

      return;
    }

    if (
      currentHasUnlimitedAccess &&
      requestedModule !== "data" &&
      attachedFiles.length >
        maxUnlimitedFilesPerRequest
    ) {
      setBillingNotice({
        code:
          "ATTACHMENT_REQUEST_SAFETY_LIMIT_REACHED",
        message:
          `V jednej požiadavke je možné technicky spracovať maximálne ${maxUnlimitedFilesPerRequest} príloh. ADMIN nemá balíkový limit.`,
        purchaseUrl: "/dashboard",
      });

      return;
    }

    if (
      requestedModule === "data" &&
      attachedFiles.length >
        maxDataFilesPerRequest
    ) {
      alert(
        "Analýza dát spracúva v jednej požiadavke jeden XLSX, XLS, XLSM alebo CSV súbor.",
      );
      return;
    }

    const userText = input.trim();
    const secondaryText = secondaryInput.trim();

    const hasUsableProfile = Boolean(
      activeProfile &&
      (activeProfile.id ||
        activeProfile.title ||
        activeProfile.topic ||
        activeProfile.type ||
        activeProfile.schema?.label),
    );

    const hasAnyInput = Boolean(
      userText || secondaryText || attachedFiles.length > 0 || hasUsableProfile,
    );

    if (!hasAnyInput) {
      alert(
        "Najskôr vložte zadanie, text, prílohu alebo vyberte profil práce.",
      );
      return;
    }

    if (requestedModule === "planning") {
      const validation = validatePlanningDatesNoPast(userText || secondaryText);

      if (!validation.ok) {
        alert(validation.message);
        return;
      }
    }

    setIsLoading(true);
    setResult("");
    setCanvasText("");
    setAnalysisResult(null);
    setAnalysisModalOpen(false);

    // Analýza dát sa zobrazuje výhradne v AnalysisResultsModal.
    // Pri novom spustení preto zatvoríme prípadný Canvas z iného modulu.
    if (requestedModule === "data") {
      setCanvasOpen(false);
    }

    try {
      const systemLanguage = getStoredSystemLanguage();
      persistSystemLanguage(systemLanguage);

      const profileForApi = prepareProfileForApi(activeProfile, systemLanguage);

      const finalWorkLanguage = getWorkLanguage(profileForApi);
      const prompt = buildModulePrompt(requestedModule);

      if (requestedModule === "data") {
        const dataFiles = attachedFiles.filter(
          (item) =>
            isBrowserFileLike(item.file),
        );

        if (!dataFiles.length) {
          alert("Najprv nahraj XLSX, XLS, XLSM alebo CSV súbor s dátami.");
          return;
        }

        const allowedDataFiles = dataFiles.filter((item) => {
          const extension = getFileExtension(
            item.name || item.file?.name || "",
          );

          return dataFileExtensions.has(
            extension,
          );
        });

        if (!allowedDataFiles.length) {
          alert("Pre analýzu dát nahraj XLSX, XLS, XLSM alebo CSV súbor.");
          return;
        }

        const workLanguage =
          finalWorkLanguage ||
          profileForApi?.workLanguage ||
          profileForApi?.language ||
          systemLanguage;

        const promptText =
          prompt ||
          userText ||
          "Priprav raw dáta a vykonaj štatistickú analýzu.";

        const dataRequestId =
          `${moduleRunRequestId}-data-prepare`;

        const prepareFormData =
          new FormData();

        prepareFormData.append(
          "requestId",
          dataRequestId,
        );
        prepareFormData.append("module", "data");
        prepareFormData.append(
          "featureKey",
          MODULE_REQUIRED_FEATURE.data,
        );
        prepareFormData.append("prompt", promptText);
        prepareFormData.append("assignment", userText || "");
        prepareFormData.append("analysisGoal", userText || "");
        prepareFormData.append("dataDescription", userText || "");

        prepareFormData.append("language", workLanguage);
        prepareFormData.append("outputLanguage", workLanguage);
        prepareFormData.append("systemLanguage", systemLanguage);
        prepareFormData.append("interfaceLanguage", systemLanguage);
        prepareFormData.append("workLanguage", workLanguage);

        prepareFormData.append("profile", JSON.stringify(profileForApi || {}));
        prepareFormData.append(
          "activeProfile",
          JSON.stringify(profileForApi || {}),
        );
        prepareFormData.append(
          "profileContext",
          buildProfileBlock(profileForApi),
        );

        prepareFormData.append(
          "questionnaireConfig",
          JSON.stringify(questionnaireConfig),
        );

        prepareFormData.append("questionnaireMode", questionnaireConfig.mode);

        prepareFormData.append(
          "selectedQuestionnaires",
          JSON.stringify(questionnaireConfig.selectedQuestionnaires),
        );

        prepareFormData.append("manualScalesText", manualScalesText);
        prepareFormData.append("manualSubscalesText", manualSubscalesText);
        prepareFormData.append("groupingColumnsText", groupingColumnsText);

        prepareFormData.append(
          "manualAnalysisConfig",
          JSON.stringify({
            questionnaireMode,
            selectedQuestionnaires,
            customQuestionnairesText,
            manualScalesText,
            manualSubscalesText,
            groupingColumnsText,
          }),
        );

        if (profileForApi?.id) {
          prepareFormData.append("projectId", profileForApi.id);
        }

        const selectedDataFile =
          allowedDataFiles[0];

        if (
          !selectedDataFile ||
          !isBrowserFileLike(
            selectedDataFile.file,
          )
        ) {
          throw new Error(
            "Vybraný dátový súbor nie je dostupný ako binárny File objekt.",
          );
        }

        /**
         * Súbor sa odosiela iba raz. Staršia verzia ho posielala súčasne
         * pod file aj files, čo mohlo vyvolať MULTIPLE_FILES_NOT_SUPPORTED.
         */
        prepareFormData.append(
          "file",
          selectedDataFile.file,
          selectedDataFile.name ||
            selectedDataFile.file.name,
        );

        const prepareResponse = await fetch(
          "/api/analyze-data/prepare",
          {
            method: "POST",
            body: prepareFormData,
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept: "application/json",
              "X-Request-Id":
                dataRequestId,
            },
          },
        );

        if (!prepareResponse.ok) {
          throw await readDashboardApiError(prepareResponse);
        }

        const prepareResult = await prepareResponse.json();

        if (prepareResult?.ok === false) {
          throw new Error(
            prepareResult?.error ||
              prepareResult?.message ||
              "Príprava raw dát zlyhala.",
          );
        }

        const preparedFileBase64 = String(
          prepareResult?.preparedFileBase64 || "",
        );

        const preparedFileName = String(
          prepareResult?.preparedFileName ||
            prepareResult?.fileName ||
            "prepared-raw-data.xlsx",
        );

        const preparedMimeType = String(
          prepareResult?.mimeType ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );

        if (!preparedFileBase64) {
          throw new Error(
            "Prepare endpoint nevrátil preparedFileBase64. Skontroluj app/api/analyze-data/prepare/route.ts.",
          );
        }

        setPreparedDataFile({
          fileName: preparedFileName,
          base64: preparedFileBase64,
          mimeType: preparedMimeType,
          rows:
            typeof prepareResult?.rows === "number"
              ? prepareResult.rows
              : undefined,
          columns:
            typeof prepareResult?.columns === "number"
              ? prepareResult.columns
              : undefined,
          sheets: Array.isArray(prepareResult?.sheets)
            ? prepareResult.sheets
            : [],
          warnings: Array.isArray(prepareResult?.warnings)
            ? prepareResult.warnings
            : [],
          qualityReport: Array.isArray(prepareResult?.qualityReport)
            ? prepareResult.qualityReport
            : [],
        });

        const preparedBlob = base64ToBlob(preparedFileBase64, preparedMimeType);

        const preparedFile = new File([preparedBlob], preparedFileName, {
          type: preparedMimeType,
        });

        const cleanRows = await readPreparedExcelCleanRows(preparedFile);

        if (!cleanRows.length) {
          throw new Error(
            "Z pripraveného súboru sa nepodarilo načítať hárok DATA_CLEAN alebo hárok neobsahuje žiadne riadky.",
          );
        }

        const columns = getDashboardColumnNames(cleanRows);

        const hasManualScales =
          Boolean(manualScalesText.trim()) ||
          Boolean(manualSubscalesText.trim());

        const hasGroupingColumns = Boolean(groupingColumnsText.trim());

        const canDataDescriptive =
          currentHasUnlimitedAccess ||
          currentEntitlements.features.includes("data-descriptive");
        const canDataQuestionnaires =
          currentHasUnlimitedAccess ||
          currentEntitlements.features.includes("data-questionnaires");
        const canDataReliability =
          currentHasUnlimitedAccess ||
          currentEntitlements.features.includes("data-reliability");
        const canDataNormality =
          currentHasUnlimitedAccess ||
          currentEntitlements.features.includes("data-normality");
        const canDataCorrelations =
          currentHasUnlimitedAccess ||
          currentEntitlements.features.includes("data-correlations");
        const canDataParametric =
          currentHasUnlimitedAccess ||
          currentEntitlements.features.includes("data-parametric-tests");
        const canDataNonParametric =
          currentHasUnlimitedAccess ||
          currentEntitlements.features.includes("data-nonparametric-tests");

        const statisticalAnalysis = runFullStatisticalAnalysis(cleanRows, {
          alpha: 0.05,
          language: workLanguage,
          profile: profileForApi || {},
          assignment: userText || "",
          source: "prepared-raw-data",
          sheetName: "DATA_CLEAN",

          // Každý štatistický blok sa zapne iba vtedy,
          // keď ho obsahuje aktívny plán alebo doplnok.
          includeFrequencies: canDataDescriptive,
          includeItemDescriptives: canDataDescriptive,
          includeNormality: canDataNormality,
          includeCorrelations: canDataCorrelations,
          includeRecommendedCorrelations: canDataCorrelations,

          includeScaleScores: hasManualScales && canDataQuestionnaires,
          includeScaleDescriptives: hasManualScales && canDataDescriptive,
          includeReliability: hasManualScales && canDataReliability,

          includeGroupTests:
            hasGroupingColumns && (canDataParametric || canDataNonParametric),
          includeParametricTests: hasGroupingColumns && canDataParametric,
          includeNonParametricTests: hasGroupingColumns && canDataNonParametric,
          includeRecommendedGroupTests:
            hasGroupingColumns && (canDataParametric || canDataNonParametric),

          // Toto musí byť TRUE, inak sa pri manuálnom režime
          // nepoužijú numerické premenné z prepared raw data.
          fallbackToNumericVariables: true,

          // Manuálne škály sa rozpoznávajú iba vtedy,
          // keď sú naozaj zadané.
          autoDetectScales: hasManualScales,

          questionnaireConfig,
          selectedQuestionnaires: questionnaireConfig.selectedQuestionnaires,
          customQuestionnaires: [],

          manualScalesText,
          manualSubscalesText,
          groupingColumnsText,

          manualAnalysisConfig: {
            questionnaireMode,
            selectedQuestionnaires,
            customQuestionnairesText,
            manualScalesText,
            manualSubscalesText,
            groupingColumnsText,
          },

          strictQuestionnaireMode: true,
          allowUnconfirmedStandardizedQuestionnaires: false,
        } as any);

        const normalized = {
          ok: true,
          title: "Výsledky analýzy dát",

          summary: [
            `Raw dáta boli najprv pripravené do súboru: ${preparedFileName}.`,
            "Štatistika bola vypočítaná z hárku DATA_CLEAN.",
            `Počet riadkov: ${cleanRows.length}.`,
            `Počet premenných/stĺpcov: ${columns.length}.`,
            `Frekvenčné tabuľky: ${
              Array.isArray((statisticalAnalysis as any)?.frequencies)
                ? (statisticalAnalysis as any).frequencies.length
                : 0
            }.`,
            `Reliabilita: ${
              Array.isArray((statisticalAnalysis as any)?.reliability)
                ? (statisticalAnalysis as any).reliability.length
                : 0
            }.`,
            `Spearmanove korelácie: ${
              Array.isArray(
                (statisticalAnalysis as any)?.correlations?.spearman,
              )
                ? (statisticalAnalysis as any).correlations.spearman.length
                : 0
            }.`,
          ].join("\n"),

          dataDescription: `Pripravený dátový súbor obsahuje ${cleanRows.length} riadkov a ${columns.length} stĺpcov.`,

          variables: columns.map((column) => ({
            name: column,
            variable: column,
          })),

          frequencies: (statisticalAnalysis as any)?.frequencies || [],
          frequencyTables: (statisticalAnalysis as any)?.frequencies || [],

          itemDescriptives:
            (statisticalAnalysis as any)?.itemDescriptives || [],
          scaleScores: (statisticalAnalysis as any)?.scaleScores || [],
          scaleDescriptives:
            (statisticalAnalysis as any)?.scaleDescriptives || [],
          normality: (statisticalAnalysis as any)?.normality || [],
          reliability: (statisticalAnalysis as any)?.reliability || [],

          pearsonCorrelations:
            (statisticalAnalysis as any)?.correlations?.pearson || [],
          spearmanCorrelations:
            (statisticalAnalysis as any)?.correlations?.spearman || [],
          recommendedCorrelations:
            (statisticalAnalysis as any)?.correlations?.recommended || [],

          parametricGroupTests:
            (statisticalAnalysis as any)?.groupTests?.parametric || [],
          nonParametricGroupTests:
            (statisticalAnalysis as any)?.groupTests?.nonParametric || [],
          recommendedGroupTests:
            (statisticalAnalysis as any)?.groupTests?.recommended || [],

          statisticalAnalysis,

          practicalText: [
            "Raw dáta boli najprv pripravené a vyčistené do samostatného Excel súboru.",
            "Štatistická analýza bola následne vypočítaná až z pripraveného hárku DATA_CLEAN.",
            `Analyzované súbory: ${allowedDataFiles.map((file) => file.name).join(", ")}.`,
            `Počet riadkov v pripravených dátach: ${cleanRows.length}.`,
            `Počet premenných: ${columns.length}.`,
          ].join("\n"),

          interpretation: [
            "Výsledky analýzy vychádzajú z pripravených raw dát.",
            "Do praktickej časti je vhodné vložiť frekvenčné tabuľky, deskriptívnu štatistiku, reliabilitu škál, korelačnú analýzu a skupinové testy podľa charakteru premenných.",
          ].join("\n"),

          warnings: [
            ...(Array.isArray(prepareResult?.warnings)
              ? prepareResult.warnings
              : []),
            ...(Array.isArray((statisticalAnalysis as any)?.warnings)
              ? (statisticalAnalysis as any).warnings
              : []),
          ],

          preparedFile: {
            fileName: preparedFileName,
            base64: preparedFileBase64,
            mimeType: preparedMimeType,
            rows: prepareResult?.rows || cleanRows.length,
            columns: prepareResult?.columns || columns.length,
            sheets: prepareResult?.sheets || [],
            qualityReport: prepareResult?.qualityReport || [],
            warnings: prepareResult?.warnings || [],
          },

          files: allowedDataFiles.map((file) => ({
            fileName: file.name,
            size: file.size,
            type: file.type,
          })),

          extractedFiles: allowedDataFiles.map((file) => file.name),

          meta: {
            rows: cleanRows.length,
            columns: columns.length,
            source: "prepared-raw-data",
            preparedFileName,
            preparedSheetName: "DATA_CLEAN",
            generatedAt: new Date().toISOString(),
            profileTitle: profileForApi?.title || "",
            profileId: profileForApi?.id || null,
          },
        } as unknown as AnalysisResult;

        const outputText = createAnalysisOutputText(normalized);

        if (!outputText.trim()) {
          throw new Error("Analýza dát nevrátila žiadny výstup.");
        }

        if (!isCurrentModuleRun()) {
          await loadBillingState();
          return;
        }

        // Analýza dát patrí výhradne do samostatného výsledkového modalu.
        // Dashboard negeneruje ani neotvára Canvas a nerieši výsledkové exporty.
        // Export Word/PDF/Excel/RAW zostáva v AnalysisResultsModal a jeho
        // samostatných exportných súboroch.
        setAnalysisResult(normalized);
        setAnalysisModalOpen(true);
        setResult("");
        setCanvasText("");
        setCanvasOpen(false);

        try {
          localStorage.setItem(
            "zedpera_last_prepared_data",
            JSON.stringify({
              fileName: preparedFileName,
              mimeType: preparedMimeType,
              rows: cleanRows.length,
              columns: columns.length,
              sheets: prepareResult?.sheets || [],
              warnings: prepareResult?.warnings || [],
              qualityReport: prepareResult?.qualityReport || [],
            }),
          );
        } catch {
          // localStorage nemusí byť dostupný
        }

        await saveHistoryItem({
          module: requestedModule,
          title: "Výsledky analýzy dát",
          userMessage: userText || "Analýza priložených dát.",
          assistantMessage: outputText,
          result: {
            analysis: normalized as unknown as Record<string, unknown>,
            preparedFile: {
              fileName: preparedFileName,
              mimeType: preparedMimeType,
              rows: cleanRows.length,
              columns: columns.length,
              sheets: prepareResult?.sheets || [],
              warnings: prepareResult?.warnings || [],
              qualityReport: prepareResult?.qualityReport || [],
            },
            profileTitle: profileForApi?.title || "",
            profileId: profileForApi?.id || null,
            attachedFiles: allowedDataFiles.map((file) => ({
              name: file.name,
              size: file.size,
              type: file.type,
            })),
          },
        });

        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 150);

        await loadBillingState();
        return;
      }

      // =====================================================
      // HUMANIZÁTOR
      // =====================================================
      if (requestedModule === "humanizer") {
        if (!userText) {
          alert("Najprv vlož text, ktorý chceš humanizovať.");
          return;
        }

        if (userText.length < 20) {
          alert("Text na humanizáciu musí mať aspoň 20 znakov.");
          return;
        }

        const response = await fetch("/api/humanizer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            text: userText,
            language: finalWorkLanguage,
            outputLanguage: finalWorkLanguage,
            systemLanguage,
            profile: profileForApi || null,
          }),
        });

        if (!response.ok) {
          throw await readDashboardApiError(response);
        }

        const data = await response.json();

        mergeEntitlementsFromResponse(data?.entitlements);
        mergePageQuotaFromResponse(
          data?.pageUsage ??
            data?.pageQuota ??
            data?.quota ??
            data?.usage ??
            data,
        );

        if (data?.ok === false) {
          throw new Error(
            data?.message || data?.error || "Humanizácia textu zlyhala.",
          );
        }

        const output = cleanFinalOutput(
          data.humanizedText ||
            data.output ||
            data.result ||
            data.text ||
            data.message ||
            "",
        );

        if (!output.trim()) {
          throw new Error("Humanizátor nevrátil žiadny text.");
        }

        if (!isCurrentModuleRun()) {
          await loadBillingState();
          return;
        }

        setResult(output);
        setCanvasText(output);
        setCanvasOpen(true);

        try {
          localStorage.setItem("latest_generated_work_text", output);
          localStorage.setItem("last_ai_output", output);
        } catch {
          // localStorage nemusí byť dostupný
        }

        await saveHistoryItem({
          module: "humanizer",
          title: requestedModuleResultTitle,
          userMessage: userText,
          assistantMessage: output,
          result: {
            profileTitle: profileForApi?.title || "",
            profileId: profileForApi?.id || null,
          },
        });

        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 150);

        await loadBillingState();
        return;
      }

      // =====================================================
      // SAMOSTATNÉ PRIAME API MODULY:
      // AI školiteľ, Audit, Obhajoba, Preklad, Plánovanie, Emaily
      // =====================================================
      const chatRequestId =
        `${moduleRunRequestId}-chat`;

      const formData = new FormData();

      formData.append(
        "requestId",
        chatRequestId,
      );
      formData.append("agent", agent);
      formData.append("model", agent);
      formData.append("module", requestedModule);
      formData.append(
        "featureKey",
        requiredFeature,
      );

      formData.append("language", finalWorkLanguage);
      formData.append("outputLanguage", finalWorkLanguage);
      formData.append("systemLanguage", systemLanguage);
      formData.append("interfaceLanguage", systemLanguage);
      formData.append("workLanguage", finalWorkLanguage);

      formData.append("message", userText || secondaryText || prompt);
      formData.append("prompt", prompt);
      formData.append("input", userText);
      formData.append("secondaryInput", secondaryText);

      formData.append("profile", JSON.stringify(profileForApi || {}));
      formData.append("activeProfile", JSON.stringify(profileForApi || {}));
      formData.append("profileContext", buildProfileBlock(profileForApi));
      formData.append(
        "attachmentsContext",
        buildAttachmentBlock(attachedFiles),
      );

      const preparedFilesMetadata =
        buildPreparedFilesMetadata(
          attachedFiles,
        );

      formData.append(
        "preparedFilesMetadata",
        JSON.stringify(
          preparedFilesMetadata,
        ),
      );

      const clientExtractedText =
        attachedFiles
          .map((file) =>
            String(
              file.text ||
                file.content ||
                "",
            ).trim(),
          )
          .filter(Boolean)
          .join(
            "\n\n-----------------\n\n",
          )
          .slice(0, 120_000);

      if (clientExtractedText) {
        formData.append(
          "clientExtractedText",
          clientExtractedText,
        );
        formData.append(
          "extractedText",
          clientExtractedText,
        );
      }

      formData.append(
        "messages",
        JSON.stringify([
          {
            role: "user",
            content: prompt,
          },
        ]),
      );

      formData.append(
        "moduleSettings",
        JSON.stringify({
          activeModule: requestedModule,
          qualityMode,
          outputMode,
          translationFrom,
          translationTo,
          translationStyle,
          emailType,
          emailTone,
          translationFromLabel: getLanguageLabel(translationFrom),
          translationToLabel: getLanguageLabel(translationTo),
          translationStyleLabel: getTranslationStyleLabel(translationStyle),
          emailTypeLabel: getEmailTypeLabel(emailType),
          emailToneLabel: getEmailToneLabel(emailTone),
        }),
      );

      formData.append(
        "profileSnapshot",
        JSON.stringify({
          id: profileForApi?.id || null,
          title: profileForApi?.title || "",
          topic: profileForApi?.topic || "",
          type: getWorkType(profileForApi),
          expertise: getExpertise(profileForApi),
          workLanguage: finalWorkLanguage,
          citation: getCitationStyle(profileForApi),
        }),
      );

      formData.append("citation", getCitationStyle(profileForApi));
      formData.append("useSemanticScholar", "false");
      formData.append("sourceMode", "none");
      formData.append("validateAttachmentsAgainstProfile", "false");
      formData.append("requireSourceList", "false");
      formData.append("allowAiKnowledgeFallback", "true");
      formData.append("extractUploadedText", "true");
      formData.append("useExtractedTextFirst", "true");
      formData.append("returnExtractedFilesInfo", "true");
      formData.append("contextaCitationFormat", "false");
      formData.append("includeSources", "false");
      formData.append("includePrimarySources", "false");
      formData.append("includeSecondarySources", "false");
      formData.append("useExternalAcademicSources", "false");
      formData.append("useCrossref", "false");
      formData.append("appendBibliography", "false");
      formData.append("returnSources", "false");

      formData.append(
        "filesMetadata",
        JSON.stringify(
          attachedFiles.map((item) => ({
            name: item.name,
            size: item.size,
            type: item.type,
            extension: getFileExtension(item.name),
          })),
        ),
      );

      if (profileForApi?.id) {
        formData.append("projectId", profileForApi.id);
      }

      attachedFiles.forEach((item) => {
        if (!isBrowserFileLike(item.file)) {
          return;
        }

        /**
         * Skutočný File objekt sa odosiela pod jednotným poľom files.
         * /api/chat prechádza všetky FormData položky, takže obsah dostanú
         * Claude, OpenAI, Gemini, Mistral aj Grok cez rovnakú extrakciu.
         */
        formData.append(
          "files",
          item.file,
          item.name || item.file.name,
        );
      });

      const directApi = DIRECT_MODULE_API[requestedModule];

      if (!directApi) {
        throw new Error(
          `Pre modul ${requestedModule} nie je nastavený samostatný API endpoint.`,
        );
      }

      const directJsonPayload: Record<string, unknown> = {
        requestId: chatRequestId,
        module: requestedModule,
        activeModule: requestedModule,
        action: requestedModule,
        featureKey: requiredFeature,
        agent,
        model: agent,
        prompt,
        instruction: prompt,
        input: userText,
        text: userText || clientExtractedText || prompt,
        message: userText || secondaryText || prompt,
        question: userText || secondaryText || prompt,
        secondaryInput: secondaryText,
        messages: [{ role: "user", content: prompt }],
        language: finalWorkLanguage,
        outputLanguage: finalWorkLanguage,
        systemLanguage,
        interfaceLanguage: systemLanguage,
        workLanguage: finalWorkLanguage,
        profile: profileForApi || null,
        activeProfile: profileForApi || null,
        profileSnapshot: {
          id: profileForApi?.id || null,
          title: profileForApi?.title || "",
          topic: profileForApi?.topic || "",
          type: getWorkType(profileForApi),
          expertise: getExpertise(profileForApi),
          workLanguage: finalWorkLanguage,
          citation: getCitationStyle(profileForApi),
        },
        profileContext: buildProfileBlock(profileForApi),
        projectId: profileForApi?.id || undefined,
        profileId: profileForApi?.id || undefined,
        title: profileForApi?.title || "",
        workType: getWorkType(profileForApi),
        citation: getCitationStyle(profileForApi),
        citationStyle: getCitationStyle(profileForApi),
        attachmentText: clientExtractedText || activeAttachmentText || "",
        extractedText: clientExtractedText || activeAttachmentText || "",
        clientExtractedText: clientExtractedText || activeAttachmentText || "",
        qualityMode,
        outputMode,
        translationFrom,
        translationTo,
        translationStyle,
        emailType,
        emailTone,
        translationFromLabel: getLanguageLabel(translationFrom),
        translationToLabel: getLanguageLabel(translationTo),
        translationStyleLabel: getTranslationStyleLabel(translationStyle),
        emailTypeLabel: getEmailTypeLabel(emailType),
        emailToneLabel: getEmailToneLabel(emailTone),
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
        validateAttachmentsAgainstProfile: false,
        allowAiKnowledgeFallback: true,
        extractUploadedText: true,
        useExtractedTextFirst: true,
        returnExtractedFilesInfo: true,
        moduleSettings: {
          activeModule: requestedModule,
          qualityMode,
          outputMode,
          translationFrom,
          translationTo,
          translationStyle,
          emailType,
          emailTone,
        },
      };

      const response = await fetch(directApi.endpoint, {
        method: "POST",
        body:
          directApi.mode === "json"
            ? JSON.stringify(directJsonPayload)
            : formData,
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json, text/plain, text/event-stream",
          "X-Request-Id": chatRequestId,
          ...(directApi.mode === "json"
            ? { "Content-Type": "application/json; charset=utf-8" }
            : {}),
        },
      });

      if (!response.ok) {
        throw await readDashboardApiError(response);
      }

      const contentType = response.headers.get("content-type") || "";
      let fullText = "";

      if (contentType.includes("application/json")) {
        const data = await response.json();

        mergeEntitlementsFromResponse(data?.entitlements);
        mergePageQuotaFromResponse(
          data?.pageUsage ??
            data?.pageQuota ??
            data?.quota ??
            data?.usage ??
            data,
        );

        const attachmentProcessing =
          isUnknownRecord(
            data?.attachmentProcessing,
          )
            ? data.attachmentProcessing
            : null;

        if (
          attachedFiles.length > 0 &&
          attachmentProcessing &&
          isCurrentModuleRun()
        ) {
          const receivedFiles =
            readNumber(
              attachmentProcessing,
              "receivedFiles",
              "received_files",
            ) ?? 0;

          const successfullyReadFiles =
            readNumber(
              attachmentProcessing,
              "successfullyReadFiles",
              "successfully_read_files",
            ) ?? 0;

          const extractedCharacters =
            readNumber(
              attachmentProcessing,
              "extractedCharacters",
              "extracted_characters",
            ) ?? 0;

          if (receivedFiles <= 0) {
            throw new DashboardApiError({
              status: 422,
              code:
                "ATTACHMENT_NOT_RECEIVED",
              message:
                "AI chat neprijal priložený súbor.",
              detail:
                "Frontend odoslal požiadavku, ale /api/chat eviduje receivedFiles = 0.",
            });
          }

          if (
            successfullyReadFiles <= 0 &&
            !clientExtractedText
          ) {
            throw new DashboardApiError({
              status: 422,
              code:
                "ATTACHMENT_EXTRACTION_FAILED",
              message:
                "Príloha bola prijatá, ale jej obsah sa nepodarilo načítať.",
              detail:
                "Skontrolujte serverovú extrakciu PDF/DOCX alebo textový fallback.",
            });
          }

          setAttachedFiles(
            (currentFiles) =>
              currentFiles.map(
                (file) => ({
                  ...file,
                  extractionStatus:
                    successfullyReadFiles > 0
                      ? "server"
                      : file.extractionStatus,
                  extractedChars:
                    extractedCharacters > 0
                      ? extractedCharacters
                      : file.extractedChars,
                  extractionMessage:
                    successfullyReadFiles > 0
                      ? "Obsah prílohy bol načítaný na serveri a vložený do AI kontextu."
                      : file.extractionMessage,
                }),
              ),
          );

          setActiveAttachmentText(
            clientExtractedText ||
              `Server načítal ${successfullyReadFiles} z ${receivedFiles} príloh a extrahoval ${extractedCharacters} znakov.`,
          );
        }

        fullText =
          data.output ||
          data.result ||
          data.message ||
          data.text ||
          data.answer ||
          data.content ||
          data.response ||
          data?.choices?.[0]?.message?.content ||
          "";

        if (!fullText && data.ok === false) {
          throw new Error(
            data.message || data.error || "API nevrátilo výstup.",
          );
        }
      } else {
        if (!response.body) {
          throw new Error("API nevrátilo odpoveď.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          const liveCleaned = stripModuleExtraSections(
            fullText.replace(/^data:\s*/gm, "").replace(/\[DONE\]/g, ""),
            requestedModule,
          );

          if (liveCleaned.trim()) {
            setResult(liveCleaned);
          }
        }
      }

      let cleaned = stripModuleExtraSections(
        fullText.replace(/^data:\s*/gm, "").replace(/\[DONE\]/g, ""),
        requestedModule,
      );

      if (!cleaned.trim()) {
        throw new Error(
          "API odpovedalo, ale výstup bol prázdny. Skontrolujte samostatný endpoint modulu a polia output/result/message/text.",
        );
      }

      if (requestedModule === "planning") {
        cleaned = cleanFinalOutput(
          [
            "Predbežný orientačný harmonogram",
            "",
            "Upozornenie: Tento plán je len predbežný a orientačný. Nejde o záväzný termínový plán. Termíny je potrebné priebežne upravovať podľa reálneho stavu práce.",
            "",
            cleaned,
          ].join("\n"),
        );
      }

      cleaned = stripModuleExtraSections(cleaned, requestedModule);

      if (!isCurrentModuleRun()) {
        await loadBillingState();
        return;
      }

      setResult(cleaned);
      setCanvasText(cleaned);
      setCanvasOpen(true);

      try {
        localStorage.setItem("latest_generated_work_text", cleaned);
        localStorage.setItem("last_ai_output", cleaned);
      } catch {
        // localStorage nemusí byť dostupný
      }

      await saveHistoryItem({
        module: requestedModule,
        title: requestedModuleResultTitle,
        userMessage: userText || secondaryText || "Bez textového zadania.",
        assistantMessage: cleaned,
        result: {
          profileTitle: profileForApi?.title || "",
          profileId: profileForApi?.id || null,
          activeModule: requestedModule,
          attachedFiles: attachedFiles.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        },
      });

      await loadBillingState();

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } catch (error) {
      if (error instanceof DashboardApiError) {
        // Očakávané API chyby nezapisujeme do konzoly ako Error objekt.
        // Next.js development overlay interpretuje console.error(Error)
        // ako neodchytenú runtime chybu a prekryje celý dashboard.
        console.warn("RUN_MODULE_API_WARNING:", {
          status: error.status,
          code: error.code,
          message: error.message,
          detail: error.detail,
        });
      } else {
        console.error("RUN_MODULE_ERROR:", error);
      }

      if (error instanceof DashboardApiError) {
        if (error.status === 401) {
          router.replace("/login?returnTo=/dashboard");
          return;
        }

        if (!isCurrentModuleRun()) {
          await loadBillingState();
          return;
        }

        if (
          error.code ===
            "ATTACHMENT_EXTRACTION_FAILED" ||
          error.code ===
            "ATTACHMENT_NOT_RECEIVED"
        ) {
          setAttachedFiles(
            (currentFiles) =>
              currentFiles.map(
                (file) => ({
                  ...file,
                  extractionStatus:
                    "failed",
                  extractionMessage:
                    error.message,
                }),
              ),
          );

          setBillingNotice(null);
          setResult(
            [
              "Prílohu sa nepodarilo spracovať.",
              error.message,
              error.detail || "",
              "",
              "Skontrolujte serverový terminál pri logu CHAT_ATTACHMENT_EXTRACTION_DEBUG.",
            ]
              .filter(Boolean)
              .join("\n"),
          );
          setCanvasText("");
          setCanvasOpen(false);
          return;
        }

        if (
          currentHasUnlimitedAccess &&
          (error.status === 402 ||
            error.status === 403 ||
            BILLING_ERROR_CODES.has(
              error.code,
            ))
        ) {
          setBillingNotice(null);
          setResult(
            [
              "Chyba konfigurácie ADMIN prístupu.",
              "Frontend má potvrdený neobmedzený režim, ale serverová route vrátila blokáciu balíka alebo limitu.",
              `Kód: ${error.code}`,
              error.message,
            ].join("\n"),
          );
          await loadBillingState();
          return;
        }

        if (
          error.status === 402 ||
          error.status === 403 ||
          BILLING_ERROR_CODES.has(error.code)
        ) {
          setBillingNotice({
            code: error.code,
            message: error.message,
            detail: error.detail,
            purchaseUrl:
              error.purchaseUrl ||
              (error.code === "PAGE_LIMIT_REACHED"
                ? "/pricing#doplnkove-sluzby"
                : "/pricing"),
            ...(MODULE_ACCESS_ERROR_CODES.has(error.code)
              ? {
                  scope: "module" as const,
                  moduleKey: requestedModule,
                  feature: MODULE_REQUIRED_FEATURE[requestedModule],
                }
              : {}),
          });

          setResult("");
          setCanvasText("");
          await loadBillingState();
          return;
        }
      }

      if (!isCurrentModuleRun()) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Nastala chyba pri spracovaní požiadavky.";

      setResult(
        `Chyba:\n${cleanFinalOutput(
          message,
        )}`,
      );
    } finally {
      if (
        moduleRunRequestRef.current ===
        moduleRunRequestId
      ) {
        moduleRunRequestRef.current =
          null;
      }

      setIsLoading(false);
    }
  };

  /**
   * Otvorí samostatný frontend AI chatu.
   *
   * Samostatný modul zostáva oddelený od AI Chatu. Do /chat sa
   * prenesie iba kontext aktuálneho profilu, jazyk rozhrania a zvolený agent.
   * Samotný frontend chatu následne komunikuje výhradne s /api/chat.
   */
  const openAiChat = useCallback(() => {
    const params = new URLSearchParams();

    if (activeProfile?.id) {
      params.set("projectId", activeProfile.id);
      params.set("profileId", activeProfile.id);
    }

    params.set("agent", agent);
    params.set("language", systemLanguage);
    params.set("interfaceLanguage", systemLanguage);
    params.set("workLanguage",
      activeProfile?.workLanguage ||
        activeProfile?.language ||
        systemLanguage,
    );
    params.set("from", "dashboard");

    const query = params.toString();
    router.push(query ? `/chat?${query}` : "/chat");
  }, [activeProfile, agent, router, systemLanguage]);

  const selectDashboardModule = useCallback(
    (moduleKey: ModuleKey) => {
      if (!isModuleKey(moduleKey)) return;

      // Ref sa prepne ešte pred React renderom. Všetky ďalšie kontroly tak
      // používajú presne modul, na ktorý používateľ práve klikol.
      activeModuleRef.current = moduleKey;
      moduleRunRequestRef.current = null;

      setBillingNotice((current) => {
        if (!current) return null;

        return current.scope === "module" ||
          MODULE_ACCESS_ERROR_CODES.has(current.code)
          ? null
          : current;
      });

      /**
       * Pracovná plocha sa prepne na nový kľúč a následne sa v JSX remountne
       * cez key={`dashboard-workspace-${moduleKey}`}. Tým sa odstráni aj
       * prípadný starý názov tlačidla alebo aria-label z predchádzajúceho modulu.
       */
      setActiveModule(moduleKey);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("zedpera_active_dashboard_module", moduleKey);
        } catch {
          // localStorage môže byť zablokovaný alebo nedostupný
        }
      }

      router.replace(`/dashboard?module=${moduleKey}`, {
        scroll: false,
      });

      window.setTimeout(() => {
        mobileToolPanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    },
    [router],
  );

  const downloadPdf = () => {
    const text = stripModuleExtraSections(canvasText || result, activeModule);

    if (!text.trim()) {
      alert("Najprv vygenerujte výstup, až potom je možné vytvoriť PDF.");
      return;
    }

    const title =
      activeModule === "defense"
        ? "Prezentácia, sprievodný text a obhajoba"
        : exportTitle || "ZEDPERA výstup";

    const html = createDocHtml(title, text);

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert(
        "Prehliadač zablokoval otvorenie PDF okna. Povoľte vyskakovacie okná.",
      );
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const downloadDoc = () => {
    const text = stripModuleExtraSections(canvasText || result, activeModule);

    if (!text.trim()) return;

    const fileBase = sanitizeFileName(exportTitle);
    const html = createDocHtml(exportTitle, text);

    downloadBlob({
      content: html,
      fileName: `${fileBase}.doc`,
      mimeType: "application/msword;charset=utf-8",
    });
  };

  const downloadAnalysisExport = async (format: "word" | "pdf" | "xlsx") => {
    if (!analysisResult) {
      alert("Najskôr musí byť vytvorený výsledok analýzy.");
      return;
    }

    const safeText = (value: unknown): string => {
      if (value === null || value === undefined) return "";

      if (typeof value === "string") return value;

      if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
      }

      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    };

    const escapeHtml = (value: unknown): string => {
      return safeText(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    };

    const normalizeRows = (value: unknown): Array<Record<string, unknown>> => {
      if (!Array.isArray(value)) return [];

      return value
        .map((item) => {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            return item as Record<string, unknown>;
          }

          return {
            hodnota: item,
          };
        })
        .filter((row) => Object.keys(row).length > 0);
    };

    const collectExportTables = (): Array<{
      title: string;
      rows: Array<Record<string, unknown>>;
    }> => {
      const result = analysisResult as any;

      const tables: Array<{
        title: string;
        rows: Array<Record<string, unknown>>;
      }> = [];

      const pushTable = (title: string, rowsValue: unknown) => {
        const rows = normalizeRows(rowsValue);

        if (rows.length > 0) {
          tables.push({
            title,
            rows,
          });
        }
      };

      pushTable("Premenné", result.variables);
      pushTable(
        "Frekvenčné tabuľky",
        result.frequencies || result.frequencyTables,
      );
      pushTable("Deskriptívna štatistika položiek", result.itemDescriptives);
      pushTable("Skóre škál a subškál", result.scaleScores);
      pushTable("Deskriptívna štatistika škál", result.scaleDescriptives);
      pushTable("Normalita dát", result.normality);
      pushTable("Reliabilita škál", result.reliability);
      pushTable("Pearsonove korelácie", result.pearsonCorrelations);
      pushTable("Spearmanove korelácie", result.spearmanCorrelations);
      pushTable("Odporúčané korelácie", result.recommendedCorrelations);
      pushTable("Parametrické skupinové testy", result.parametricGroupTests);
      pushTable(
        "Neparametrické skupinové testy",
        result.nonParametricGroupTests,
      );
      pushTable("Odporúčané skupinové testy", result.recommendedGroupTests);
      pushTable(
        "Štatistické testy",
        result.statisticalTests || result.hypothesisTests,
      );
      pushTable("Upozornenia", result.warnings);

      if (result.statisticalAnalysis) {
        pushTable(
          "Statistical Analysis - Frequencies",
          result.statisticalAnalysis.frequencies,
        );

        pushTable(
          "Statistical Analysis - Item Descriptives",
          result.statisticalAnalysis.itemDescriptives,
        );

        pushTable(
          "Statistical Analysis - Scale Scores",
          result.statisticalAnalysis.scaleScores,
        );

        pushTable(
          "Statistical Analysis - Scale Descriptives",
          result.statisticalAnalysis.scaleDescriptives,
        );

        pushTable(
          "Statistical Analysis - Normality",
          result.statisticalAnalysis.normality,
        );

        pushTable(
          "Statistical Analysis - Reliability",
          result.statisticalAnalysis.reliability,
        );

        pushTable(
          "Statistical Analysis - Pearson",
          result.statisticalAnalysis.correlations?.pearson,
        );

        pushTable(
          "Statistical Analysis - Spearman",
          result.statisticalAnalysis.correlations?.spearman,
        );

        pushTable(
          "Statistical Analysis - Recommended Correlations",
          result.statisticalAnalysis.correlations?.recommended,
        );

        pushTable(
          "Statistical Analysis - Parametric Tests",
          result.statisticalAnalysis.groupTests?.parametric,
        );

        pushTable(
          "Statistical Analysis - Nonparametric Tests",
          result.statisticalAnalysis.groupTests?.nonParametric,
        );

        pushTable(
          "Statistical Analysis - Recommended Tests",
          result.statisticalAnalysis.groupTests?.recommended,
        );
      }

      const seen = new Set<string>();

      return tables.filter((table) => {
        const signature = `${table.title}-${table.rows.length}-${Object.keys(
          table.rows[0] || {},
        ).join("|")}`;

        if (seen.has(signature)) return false;

        seen.add(signature);
        return true;
      });
    };

    const createHtmlTable = (
      title: string,
      rows: Array<Record<string, unknown>>,
    ): string => {
      if (!rows.length) return "";

      const columns = Array.from(
        new Set(rows.flatMap((row) => Object.keys(row))),
      );

      const headerHtml = columns
        .map((column) => `<th>${escapeHtml(column)}</th>`)
        .join("");

      const rowsHtml = rows
        .map((row) => {
          const cellsHtml = columns
            .map((column) => `<td>${escapeHtml(row[column])}</td>`)
            .join("");

          return `<tr>${cellsHtml}</tr>`;
        })
        .join("");

      return `
      <h2>${escapeHtml(title)}</h2>
      <table>
        <thead>
          <tr>${headerHtml}</tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
    };

    const createFullHtml = (): string => {
      const result = analysisResult as any;
      const tables = collectExportTables();

      const summary = safeText(result.summary);
      const dataDescription = safeText(result.dataDescription);
      const practicalText = safeText(result.practicalText);
      const interpretation = safeText(result.interpretation);
      const fullText = safeText(result.fullText);

      const tablesHtml = tables
        .map((table) => createHtmlTable(table.title, table.rows))
        .join("\n");

      return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(result.title || "Výsledky analýzy dát")}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #111827;
      padding: 36px;
    }

    h1 {
      font-size: 22pt;
      margin: 0 0 18px 0;
      color: #0f172a;
    }

    h2 {
      margin-top: 28px;
      margin-bottom: 10px;
      font-size: 15pt;
      color: #1e3a8a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
    }

    h3 {
      margin-top: 18px;
      font-size: 12pt;
      color: #334155;
    }

    p {
      margin: 0 0 10px 0;
      white-space: pre-wrap;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 22px 0;
      page-break-inside: auto;
      font-size: 9pt;
    }

    th {
      background: #1e293b;
      color: white;
      font-weight: 700;
      text-align: left;
      padding: 7px;
      border: 1px solid #94a3b8;
    }

    td {
      padding: 6px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    .box {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 14px;
      border-radius: 10px;
      margin-bottom: 16px;
      white-space: pre-wrap;
    }

    @media print {
      body {
        padding: 18mm;
      }

      table {
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      thead {
        display: table-header-group;
      }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(result.title || "Výsledky analýzy dát")}</h1>

  <h2>Súhrn</h2>
  <div class="box">${escapeHtml(summary || "Súhrn nie je dostupný.")}</div>

  ${
    dataDescription
      ? `
  <h2>Opis dát</h2>
  <div class="box">${escapeHtml(dataDescription)}</div>
  `
      : ""
  }

  ${
    practicalText
      ? `
  <h2>Text do praktickej časti</h2>
  <div class="box">${escapeHtml(practicalText)}</div>
  `
      : ""
  }

  ${
    interpretation
      ? `
  <h2>Interpretácia</h2>
  <div class="box">${escapeHtml(interpretation)}</div>
  `
      : ""
  }

  ${tablesHtml}

  ${
    fullText
      ? `
  <h2>Kompletný textový výstup</h2>
  <div class="box">${escapeHtml(fullText)}</div>
  `
      : ""
  }
</body>
</html>
`;
    };

    const triggerDownload = (blob: Blob, fileName: string) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;
      link.rel = "noopener";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    };

    try {
      const fileBase = "vysledky-analyzy-dat";

      if (format === "word") {
        const html = createFullHtml();

        const blob = new Blob([html], {
          type: "application/msword;charset=utf-8",
        });

        triggerDownload(blob, `${fileBase}.doc`);
        return;
      }

      if (format === "pdf") {
        const html = createFullHtml();
        const printWindow = window.open("", "_blank");

        if (!printWindow) {
          alert(
            "Prehliadač zablokoval otvorenie PDF okna. Povoľte vyskakovacie okná.",
          );
          return;
        }

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();

        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };

        return;
      }

      if (format === "xlsx") {
        const XLSX = await import("xlsx");

        const workbook = XLSX.utils.book_new();
        const result = analysisResult as any;
        const tables = collectExportTables();

        const summaryRows = [
          {
            položka: "Názov",
            hodnota: result.title || "Výsledky analýzy dát",
          },
          {
            položka: "Súhrn",
            hodnota: safeText(result.summary),
          },
          {
            položka: "Opis dát",
            hodnota: safeText(result.dataDescription),
          },
          {
            položka: "Text do praktickej časti",
            hodnota: safeText(result.practicalText),
          },
          {
            položka: "Interpretácia",
            hodnota: safeText(result.interpretation),
          },
          {
            položka: "Vygenerované",
            hodnota: new Date().toLocaleString("sk-SK"),
          },
        ];

        const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Súhrn");

        tables.forEach((table, index) => {
          const sheetNameBase =
            table.title
              .replace(/[\\/?*[\]:]/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 28) || `Tabuľka ${index + 1}`;

          const safeSheetName =
            sheetNameBase.length > 0 ? sheetNameBase : `Tabuľka ${index + 1}`;

          const worksheet = XLSX.utils.json_to_sheet(table.rows);

          XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            `${safeSheetName}`.slice(0, 31),
          );
        });

        const excelBuffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });

        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        triggerDownload(blob, `${fileBase}.xlsx`);
      }
    } catch (error) {
      console.error("ANALYSIS_EXPORT_ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Export analýzy sa nepodarilo vytvoriť.",
      );
    }
  };

  function downloadPreparedDataFile(): void {
    if (!preparedDataFile?.base64) {
      alert(
        "Prepared raw data ešte neboli vytvorené. Najprv spusti analýzu dát.",
      );
      return;
    }

    downloadBase64File(
      preparedDataFile.base64,
      preparedDataFile.fileName || "prepared-data.xlsx",
      preparedDataFile.mimeType ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }

  const downloadExcel = () => {
    const text = stripModuleExtraSections(
      canvasText || result || "",
      activeModule,
    );

    if (!text.trim()) {
      alert("Nie je čo exportovať do Excelu.");
      return;
    }

    const rows = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({
        poradie: index + 1,
        text: line,
      }));

    const escapeCell = (value: string | number) => {
      const stringValue = String(value ?? "");
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const csv = [
      ["Poradie", "Text"].map(escapeCell).join(";"),
      ...rows.map((row) => [row.poradie, row.text].map(escapeCell).join(";")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${activeModule || "zedpera"}-vystup.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const downloadPpt = async () => {
    let currentEntitlements = entitlements;

    if (!currentEntitlements) {
      const loadedBillingState = await loadBillingState();
      currentEntitlements = loadedBillingState?.entitlements || null;
    }

    if (
      !currentEntitlements?.hasUnlimitedAccess &&
      !currentEntitlements?.isAdmin &&
      !currentEntitlements?.features.includes("defense-presentation")
    ) {
      setBillingNotice({
        code: "FEATURE_NOT_INCLUDED",
        message: "Prezentácia na obhajobu nie je súčasťou aktivovaného balíka.",
        detail: "defense-presentation",
        purchaseUrl: "/pricing",
      });
      return;
    }

    const text = stripModuleExtraSections(canvasText || result, activeModule);

    if (!text.trim()) {
      alert(
        "Najprv vygenerujte obhajobu alebo výstup, až potom je možné stiahnuť PPTX.",
      );
      return;
    }

    const pptTitle =
      activeProfile?.title ||
      activeProfile?.topic ||
      "Obhajoba záverečnej práce";

    const defenseType =
      activeProfile?.type ||
      activeProfile?.schema?.label ||
      "Obhajoba záverečnej práce";

    const slides = [
      {
        title: pptTitle,
        layout: "section",
        bullets: [
          defenseType,
          activeProfile?.field || "Odbor je potrebné doplniť",
          activeProfile?.topic || "Téma práce je potrebné doplniť",
        ],
        speakerNotes:
          "Na úvod stručne predstavte názov práce, odbor, typ práce a dôvod výberu témy.",
        visualSuggestion:
          "Titulný slide s názvom práce a moderným akademickým pozadím.",
      },
      {
        title: "Význam a aktuálnosť témy",
        layout: "bullets",
        bullets: [
          activeProfile?.annotation ||
            "Téma je významná z odborného alebo praktického hľadiska.",
          "Práca reaguje na konkrétny problém v danej oblasti.",
          "Zvolená téma má priamu väzbu na odbor a prax.",
        ],
        speakerNotes:
          "Vysvetlite, prečo je téma dôležitá a aký problém práca rieši.",
        visualSuggestion: "Schéma kontextu témy alebo karta s problémom.",
      },
      {
        title: "Cieľ práce",
        layout: "quote",
        bullets: [
          activeProfile?.goal ||
            "Cieľ práce je potrebné doplniť podľa finálneho zadania.",
        ],
        speakerNotes: "Cieľ povedzte jasne, jednou až dvomi vetami.",
        visualSuggestion: "Veľká karta s hlavným cieľom práce.",
      },
      {
        title: "Výskumný problém, otázky a hypotézy",
        layout: "split",
        bullets: [
          activeProfile?.problem ||
            activeProfile?.researchQuestions ||
            "Výskumný problém alebo výskumné otázky je potrebné doplniť.",
          activeProfile?.hypotheses ||
            "Hypotézy je potrebné doplniť, ak boli súčasťou práce.",
          "Otázky a hypotézy majú byť prepojené s cieľom práce.",
        ],
        speakerNotes: "Ukážte, čo práca skúmala, overovala alebo analyzovala.",
        visualSuggestion: "Dvojstĺpcové rozloženie: otázky a hypotézy.",
      },
      {
        title: "Teoretické východiská",
        layout: "bullets",
        bullets: [
          "Teoretická časť vysvetľuje hlavné pojmy a odborné súvislosti.",
          "Použité zdroje vytvárajú základ pre praktickú alebo analytickú časť.",
          "Teória je prepojená s cieľom a riešeným problémom práce.",
        ],
        speakerNotes:
          "Nevymenúvajte celú teóriu. Vyberte iba pojmy dôležité pre cieľ práce.",
        visualSuggestion: "Schéma hlavných pojmov alebo konceptov.",
      },
      {
        title: "Metodológia práce",
        layout: "bullets",
        bullets: [
          activeProfile?.methodology ||
            "Metodologický postup je potrebné doplniť podľa finálnej práce.",
          "Metódy boli zvolené podľa cieľa a charakteru skúmanej témy.",
          "Postup spracovania má umožniť zodpovedať výskumné otázky alebo overiť hypotézy.",
        ],
        speakerNotes:
          "Vysvetlite, ako bola práca spracovaná a prečo boli zvolené dané metódy.",
        visualSuggestion: "Procesná schéma krokov metodiky.",
      },
      {
        title: "Praktická časť práce",
        layout: "bullets",
        bullets: [
          activeProfile?.practicalPart ||
            "Praktická časť je potrebné doplniť podľa obsahu práce.",
          "Táto časť prepája teoretické poznatky s vlastným spracovaním témy.",
          "Dôležité je vysvetliť zdroj dát, postup a spôsob vyhodnotenia.",
        ],
        speakerNotes: "Stručne predstavte, čo tvorilo praktickú časť práce.",
        visualSuggestion: "Karta s dátami, vzorkou alebo postupom.",
      },
      {
        title: "Hlavné výsledky práce",
        layout: "chart",
        bullets: [
          "Výsledky je potrebné predstaviť vecne a priamo vo vzťahu k cieľu práce.",
          "Najdôležitejšie zistenia majú byť podložené údajmi alebo argumentáciou.",
          "Výsledky tvoria základ pre diskusiu a odporúčania.",
        ],
        speakerNotes:
          "Pri výsledkoch hovorte konkrétne. Vyberte iba najdôležitejšie zistenia.",
        visualSuggestion: "Graf alebo tabuľka s najdôležitejšími výsledkami.",
      },
      {
        title: "Interpretácia výsledkov",
        layout: "split",
        bullets: [
          "Výsledky je potrebné interpretovať vo vzťahu k cieľu práce.",
          "Diskusia ukazuje, čo zistenia znamenajú pre riešený problém.",
          "Interpretácia prepája výsledky s teoretickými východiskami.",
        ],
        speakerNotes: "Neopakujte iba výsledky. Vysvetlite ich význam a dopad.",
        visualSuggestion: "Porovnanie: výsledok a význam pre prácu.",
      },
      {
        title: "Prínos práce",
        layout: "quote",
        bullets: [
          activeProfile?.scientificContribution ||
            "Prínos práce je potrebné pomenovať podľa výsledkov a cieľa práce.",
          "Práca môže byť využiteľná v odbornej praxi alebo ďalšom výskume.",
          "Vlastný prínos autora spočíva v spracovaní, analýze a vyhodnotení témy.",
        ],
        speakerNotes:
          "Zdôraznite, čo práca prináša a komu môžu byť výsledky užitočné.",
        visualSuggestion: "Dve karty: prínos pre prax a prínos pre odbor.",
      },
      {
        title: "Limity práce",
        layout: "bullets",
        bullets: [
          "Každá práca má obmedzenia, ktoré je vhodné pomenovať vecne a odborne.",
          "Limity môžu súvisieť s rozsahom, dátami, vzorkou, metódou alebo dostupnosťou zdrojov.",
          "Ich pomenovanie ukazuje odbornú zrelosť autora.",
        ],
        speakerNotes:
          "Limity nepôsobia negatívne, ak ich vysvetlíte pokojne a odborne.",
        visualSuggestion: "Tri krátke karty s limitmi práce.",
      },
      {
        title: "Otázky komisie a pripravené odpovede",
        layout: "bullets",
        bullets: [
          "Prečo ste si vybrali túto tému?",
          "Ako cieľ práce súvisí s použitou metodológiou?",
          "Aký je hlavný prínos práce?",
          "Aké boli najväčšie limity spracovania?",
          "Ako by bolo možné vo výskume pokračovať?",
        ],
        speakerNotes: "Na otázky odpovedajte stručne, priamo a odborne.",
        visualSuggestion: "Slide s ikonou otázok a odpovedí.",
      },
      {
        title: "Záver obhajoby",
        layout: "closing",
        bullets: [
          "Práca sa zamerala na riešenie stanovenej témy a cieľa.",
          "Výsledky poskytujú podklad pre odborné zhodnotenie a odporúčania.",
          "Ďakujem za pozornosť a som pripravený/pripravená odpovedať na otázky.",
        ],
        speakerNotes: "Záver má byť krátky, sebavedomý a vecný.",
        visualSuggestion: "Čistý záverečný slide s poďakovaním.",
      },
    ];

    try {
      const response = await fetch("/api/defense/pptx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: pptTitle,
          workTitle: pptTitle,
          defenseType,
          theme: "academic",
          slides,
          sourceText: [
            activeProfile ? buildProfileBlock(activeProfile) : "",
            "",
            text,
          ]
            .filter(Boolean)
            .join("\n\n"),
          extractedWorkText: text,
          attachmentText: activeAttachmentText || "",
          text,
        }),
      });

      if (!response.ok) {
        throw await readDashboardApiError(response);
      }

      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error("Server vrátil prázdny PPTX súbor.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${sanitizeFileName(pptTitle)}.pptx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
      await loadBillingState();
    } catch (error) {
      console.error("PPTX_EXPORT_ERROR:", error);

      if (error instanceof DashboardApiError && error.status === 401) {
        router.replace("/login?returnTo=/dashboard");
        return;
      }

      if (
        error instanceof DashboardApiError &&
        (error.status === 402 ||
          error.status === 403 ||
          BILLING_ERROR_CODES.has(error.code))
      ) {
        setBillingNotice({
          code: error.code,
          message: error.message,
          detail: error.detail,
          purchaseUrl: error.purchaseUrl || "/pricing",
        });
        return;
      }

      alert(
        error instanceof Error
          ? error.message
          : "Prezentáciu sa nepodarilo vytvoriť.",
      );
    }
  };

  return (
    <>
      <style jsx global>{`
        html,
        body {
          min-height: 100%;
          overflow-x: hidden;
          overflow-y: auto;
        }

        html {
          background: #f8fafc;
        }

        html.dark {
          background: #050711;
        }

        body {
          background: #f8fafc;
        }

        html.dark body {
          background: #050711;
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 92, 246, 0.7) rgba(15, 23, 42, 0.12);
        }

        html.dark * {
          scrollbar-color: rgba(139, 92, 246, 0.7) rgba(255, 255, 255, 0.06);
        }

        *::-webkit-scrollbar {
          width: 10px;
          height: 8px;
        }

        *::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.08);
          border-radius: 999px;
        }

        html.dark *::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
        }

        *::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.75);
          border-radius: 999px;
        }

        *::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.95);
        }

        .no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .no-scrollbar::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }
      `}</style>

      <main className="flex min-h-screen w-full bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-[#050711] dark:text-white">
        <section className="flex min-h-screen min-w-0 flex-1 flex-col pb-24 xl:pb-0">
          {/* Samostatná route má pevný modul, prepínač sa nevykresľuje. */}
          {false ? (
          <header className="sticky top-0 z-40 hidden shrink-0 border-b border-white/10 bg-[#050711]/95 px-4 py-3 backdrop-blur-xl xl:block">
            <div className="w-full">
              {/* AI MODULY - pôvodné dvojstĺpcové rozloženie 4 × 2 */}
              <nav
                aria-label="AI moduly dashboardu"
                className="grid w-full grid-cols-2 gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-2 shadow-inner shadow-black/30"
              >
                {/* ĽAVÝ STĹPEC */}
                <div className="flex min-w-0 flex-col gap-2">
                  {desktopModuleItems
                    .slice(0, desktopModuleSplitIndex)
                    .map((moduleKey) => {
                      const active = activeModule === moduleKey;
                      const label = currentFixedModuleUi[moduleKey].shortLabel;

                      return (
                        <button
                          key={moduleKey}
                          type="button"
                          onClick={() => selectDashboardModule(moduleKey)}
                          title={label}
                          aria-label={label}
                          aria-pressed={active}
                          aria-current={active ? "page" : undefined}
                          data-module-key={moduleKey}
                          data-module-active={active ? "true" : "false"}
                          className={[
                            "inline-flex h-[36px] w-full min-w-0 items-center justify-center rounded-2xl border px-4 text-[13px] font-black tracking-tight transition-all duration-200",
                            "focus:outline-none focus:ring-2 focus:ring-violet-400/80 focus:ring-offset-2 focus:ring-offset-[#050711]",
                            active
                              ? "border-violet-300/70 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-violet-950/50"
                              : "border-white/10 bg-white/[0.055] text-slate-200 hover:-translate-y-0.5 hover:border-violet-300/50 hover:bg-white/[0.10] hover:text-white",
                          ].join(" ")}
                        >
                          <span className="block w-full truncate text-center">
                            {label}
                          </span>
                        </button>
                      );
                    })}
                </div>

                {/* PRAVÝ STĹPEC */}
                <div className="flex min-w-0 flex-col gap-2">
                  {desktopModuleItems
                    .slice(desktopModuleSplitIndex)
                    .map((moduleKey) => {
                      const active = activeModule === moduleKey;
                      const label = currentFixedModuleUi[moduleKey].shortLabel;

                      return (
                        <button
                          key={moduleKey}
                          type="button"
                          onClick={() => selectDashboardModule(moduleKey)}
                          title={label}
                          aria-label={label}
                          aria-pressed={active}
                          aria-current={active ? "page" : undefined}
                          data-module-key={moduleKey}
                          data-module-active={active ? "true" : "false"}
                          className={[
                            "inline-flex h-[36px] w-full min-w-0 items-center justify-center rounded-2xl border px-4 text-[13px] font-black tracking-tight transition-all duration-200",
                            "focus:outline-none focus:ring-2 focus:ring-violet-400/80 focus:ring-offset-2 focus:ring-offset-[#050711]",
                            active
                              ? "border-violet-300/70 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-violet-950/50"
                              : "border-white/10 bg-white/[0.055] text-slate-200 hover:-translate-y-0.5 hover:border-violet-300/50 hover:bg-white/[0.10] hover:text-white",
                          ].join(" ")}
                        >
                          <span className="block w-full truncate text-center">
                            {label}
                          </span>
                        </button>
                      );
                    })}
                </div>

              </nav>
            </div>
          </header>
          ) : null}

          {/* MOBILNÁ AI LIŠTA - zobrazuje sa iba na mobile ako spodná fixná lišta */}
          {false ? (
          <MobileDashboardNavigation
            key={`mobile-dashboard-navigation-${activeModule}-${systemLanguage}`}
            activeModule={activeModule}
            activeModuleLabel={activeModuleLabel}
            activeModuleSubtitle={activeModuleCardSubtitle}
            activeProfileTitle={activeProfile?.title || "Profil práce"}
            activeProfileSubtitle={
              activeProfile?.field || activeProfile?.level || ""
            }
            activeProfileType={activeProfile?.type || ""}
            moduleInfos={moduleInfos}
            t={t}
            onSelectModule={(moduleKey: string) => {
              if (isModuleKey(moduleKey)) {
                selectDashboardModule(moduleKey);
              }
            }}
            onNavigate={(path) => router.push(path)}
          />
          ) : null}

          <div className="px-4 pt-4 sm:px-6 xl:px-8">
            {false ? (
            <button
              type="button"
              onClick={openAiChat}
              className="mb-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-violet-300/60 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-violet-300 xl:hidden"
              title="Otvoriť samostatný AI chat"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Otvoriť AI Chat</span>
            </button>
            ) : null}

            {/* Billing sa načítava na pozadí. ADMINovi ani bežnému používateľovi
                nezobrazujeme samostatný loading panel balíka. */}

            {entitlements && pageQuota && !isAdminDashboardSession ? (
              <section className="mb-4 min-w-0 max-w-full overflow-hidden rounded-3xl border border-white/10 bg-[#070b18] p-4 shadow-xl shadow-black/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                      Aktívny balík
                    </p>
                    <h2 className="mt-1 break-words text-lg font-black leading-tight text-white">
                      {entitlements.planName}
                    </h2>
                    {(entitlements.addonNames ?? []).length > 0 ? (
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Doplnky: {(entitlements.addonNames ?? []).join(", ")}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/pricing")}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-violet-500 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-400"
                  >
                    Zobraziť balíky
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold text-slate-400">Strany</p>
                    <p className="mt-1 font-black text-white">
                      {hasUnlimitedAccess
                        ? "Neobmedzené"
                        : `${pageQuota.pagesRemaining ?? 0} zostáva z ${pageQuota.pageLimit ?? 0}`}
                    </p>
                    {pageQuota.extraPageLimit > 0 ? (
                      <p className="mt-1 text-xs font-bold text-emerald-300">
                        Extra strany: +{pageQuota.extraPageLimit}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold text-slate-400">Prompty</p>
                    <p className="mt-1 font-black text-white">
                      {hasUnlimitedAccess || entitlements.promptLimit === null
                        ? "Neobmedzené"
                        : `${entitlements.promptsRemaining ?? 0} zostáva z ${entitlements.promptLimit}`}
                    </p>
                  </div>

                  <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold text-slate-400">Prílohy</p>

                    <p className="mt-1 font-black text-white">
                      {hasUnlimitedAccess
                        ? "Neobmedzené"
                        : `${visibleAttachmentCount} / ${effectiveAttachmentLimit}`}
                    </p>

                    {hasUnlimitedAccess ? (
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        Aktuálne nahrané: {visibleAttachmentCount}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {visibleBillingNotice ? (
              <section
                key={`${activeModule}:${visibleBillingNotice.code}`}
                className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4"
                aria-live="polite"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black text-amber-100">
                      {visibleBillingNotice.message}
                    </p>
                    {visibleBillingNotice.detail ? (
                      <p className="mt-1 text-sm font-bold text-amber-100/70">
                        {visibleBillingNotice.detail}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(visibleBillingNotice.purchaseUrl)
                    }
                    className="shrink-0 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-amber-300"
                  >
                    {visibleBillingNotice.code === "PAGE_LIMIT_REACHED"
                      ? "Dokúpiť strany"
                      : "Vybrať balík"}
                  </button>
                </div>
              </section>
            ) : null}
          </div>

          {activeModule === "planning" && (
            <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Dnešný dátum: {getTodaySkDate()}.
            </div>
          )}

          {activeModule === "translation" && (
            <div className="mb-5 rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Languages className="h-5 w-5 text-sky-200" />
                <h3 className="text-lg font-black text-white">
                  {activeModuleLabel}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <ClickableOptionGroup<LanguageCode>
                  label={
                    selectorTranslations.translationFrom || "Source language"
                  }
                  value={translationFrom}
                  options={languageSelectOptions}
                  onChange={setTranslationFrom}
                />

                <ClickableOptionGroup<LanguageCode>
                  label={
                    selectorTranslations.translationTo || "Target language"
                  }
                  value={translationTo}
                  options={languageSelectOptions}
                  onChange={setTranslationTo}
                />

                <ClickableOptionGroup<TranslationStyle>
                  label={
                    selectorTranslations.translationStyle || "Translation style"
                  }
                  value={translationStyle}
                  options={translationStyleOptions}
                  onChange={setTranslationStyle}
                />
              </div>
            </div>
          )}

          {activeModule === "emails" && (
            <div className="mb-5 rounded-3xl border border-pink-400/20 bg-pink-500/10 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-pink-200" />
                <h3 className="text-lg font-black text-white">
                  {activeModuleLabel}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <ClickableOptionGroup<EmailType>
                  label={selectorTranslations.emailType || "Email type"}
                  value={emailType}
                  options={emailTypeOptions}
                  onChange={setEmailType}
                />

                <ClickableOptionGroup<EmailTone>
                  label={selectorTranslations.emailTone || "Email tone"}
                  value={emailTone}
                  options={emailToneOptions}
                  onChange={setEmailTone}
                />
              </div>
            </div>
          )}

          {activeModule !== "humanizer" && (
            <FileUploadBox
              files={attachedFiles}
              fileInputRef={fileInputRef}
              onFiles={handleFiles}
              onRemove={removeFile}
              limit={activeUploadLimit}
              unlimited={hasUnlimitedAccess}
              dataMode={
                activeModule === "data"
              }
              disabled={
                (billingLoading && !isAdminDashboardSession) ||
                !activeModuleAllowed ||
                Boolean(
                  !hasUnlimitedAccess &&
                    entitlements?.promptLimitReached,
                ) ||
                Boolean(
                  pageQuota &&
                    !hasUnlimitedAccess &&
                    pageQuota.pageLimitReached,
                ) ||
                attachedFiles.length >=
                  activeUploadLimit
              }
            />
          )}

          <div
            ref={mobileToolPanelRef}
            key={`dashboard-workspace-${activeModule}-${systemLanguage}`}
            data-active-module={activeModule}
            className="mt-4 pb-28 lg:pb-0"
          >
            <section
              className={activeModuleInfo.infoClassName}
              aria-labelledby={`dashboard-module-title-${activeModule}`}
              data-module-heading={activeModule}
            >
              <p
                id={`dashboard-module-title-${activeModule}`}
                className="text-base font-black text-white sm:text-lg"
              >
                {activeModuleLabel}
              </p>
              <p className="mt-1 font-semibold leading-6">
                {activeModuleIntro}
              </p>
            </section>

            <label
              htmlFor={dashboardInputId}
              className="mb-2 block text-sm font-black text-slate-200"
            >
              {activeModuleInputLabel}
            </label>

            <textarea
              key={`dashboard-textarea-${activeModule}`}
              id={dashboardInputId}
              name={dashboardInputId}
              data-module-input={activeModule}
              aria-label={activeModuleInputLabel}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={activeModulePlaceholder}
              className="min-h-[240px] w-full resize-y rounded-3xl border border-white/10 bg-[#070b18] px-5 py-5 text-sm font-semibold text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10"
            />

            {activeModule !== "data" && (
              <button
                key={`dashboard-action-${activeModule}`}
                type="button"
                onClick={runModule}
                disabled={generationBlocked}
                aria-label={activeModuleButtonLabel}
                data-module-action={activeModule}
                className={[
                  "mt-3 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-black text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:mr-3 sm:w-auto",
                  activeModuleActionClassName,
                ].join(" ")}
              >
                {isLoading ? (
                  <>
                    <RefreshCcw className="h-4 w-4 animate-spin" />
                    <span>{activeModuleLoadingLabel}</span>
                  </>
                ) : (
                  <>
                    <ActiveModuleActionIcon className="h-4 w-4" />
                    <span>{activeModuleButtonLabel}</span>
                  </>
                )}
              </button>
            )}

            {activeModule === "data" && (
              <div className="mt-4 rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-violet-500/10 p-4 shadow-2xl shadow-cyan-950/30">
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-300/30">
                    <BarChart3 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-white sm:text-base">
                      {activeModuleLabel}
                    </h3>

                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-300 sm:text-sm">
                      Spustí spracovanie tabuľky, premenných, štatistík, grafov
                      a otvorí výsledky v samostatnom okne.
                    </p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-blue-300/20 bg-blue-500/10 p-5 shadow-2xl shadow-blue-950/20">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
                      Manuálne škály a subškály
                    </p>

                    <h3 className="text-lg font-black text-white">
                      Zadajte škály, subškály a skupinové premenné
                    </h3>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {questionnaireOptions.map((option) => {
                      const isActive =
                        option.value === ""
                          ? questionnaireMode === "auto-suggest-only"
                          : option.value === "none"
                            ? questionnaireMode === "none"
                            : option.value === "custom"
                              ? questionnaireMode === "manual"
                              : selectedQuestionnaires.includes(option.value);

                      return (
                        <button
                          key={option.value || "auto-suggest-only"}
                          type="button"
                          onClick={() =>
                            handleQuestionnaireChange(option.value)
                          }
                          className={[
                            "rounded-2xl border p-4 text-left transition",
                            isActive
                              ? "border-blue-300 bg-blue-500/20 shadow-lg shadow-blue-950/30"
                              : "border-white/10 bg-white/5 hover:border-blue-300/50 hover:bg-white/10",
                          ].join(" ")}
                        >
                          <span className="flex items-center gap-2 text-sm font-black text-white">
                            <span
                              className={[
                                "flex h-5 w-5 items-center justify-center rounded-md border text-[10px]",
                                isActive
                                  ? "border-blue-200 bg-blue-400 text-slate-950"
                                  : "border-white/20 bg-white/5 text-transparent",
                              ].join(" ")}
                            >
                              ✓
                            </span>

                            {option.label}
                          </span>

                          <span className="mt-2 block text-xs font-bold leading-5 text-slate-300">
                            {option.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <label className="block text-sm font-black text-white">
                      Vlastná metodika / poznámka k škálam
                    </label>

                    <p className="mt-1 text-xs font-bold leading-5 text-slate-300">
                      Voliteľne vpíšte krátky popis metodiky, názvy škál alebo
                      poznámku k položkám.
                    </p>

                    <textarea
                      value={customQuestionnairesText}
                      onChange={(event) => {
                        setQuestionnaireMode("manual");
                        setSelectedQuestionnaires([]);
                        setCustomQuestionnairesText(event.target.value);
                      }}
                      rows={4}
                      placeholder="Príklad: V práci používam vlastné škály a subškály. Presné položky sú uvedené v troch kolónkach nižšie."
                      className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-blue-300"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                    Výstup analýzy
                  </p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                    Výsledok sa zobrazí v prehľadnom modálnom okne a následne ho
                    bude možné exportovať do Word, PDF alebo Excel.
                  </p>
                </div>

                <div className="mt-5 rounded-3xl border border-blue-300/20 bg-blue-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 rounded-2xl bg-blue-400/20 p-2 text-blue-100">
                      <BarChart3 className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-white">
                        Manuálne zadanie škál a subškál pred analýzou
                      </h4>

                      <p className="mt-1 text-xs font-semibold leading-5 text-blue-100/80">
                        Používateľ pred spustením analýzy presne zadá, ktoré
                        stĺpce patria do škál, subškál a podľa ktorých
                        premenných sa majú robiť testy rozdielov.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                      <label className="block text-sm font-black text-white">
                        Škály
                      </label>

                      <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                        Každú škálu zadajte na nový riadok vo formáte: názov
                        škály = položka1, položka2 alebo položka1 až položka10
                      </p>

                      <textarea
                        value={manualScalesText}
                        onChange={(event) => {
                          setQuestionnaireMode("manual");
                          setSelectedQuestionnaires([]);
                          setManualScalesText(event.target.value);
                        }}
                        rows={9}
                        placeholder={`Príklad:
Celkové skóre = P1 až P25
Psychická pohoda = W1 až W14
Pracovná spokojnosť = J1 až J36`}
                        className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-blue-300"
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                      <label className="block text-sm font-black text-white">
                        Subškály
                      </label>

                      <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                        Každú subškálu zadajte na nový riadok vo formáte: názov
                        subškály = položka1, položka2 alebo položka1 až
                        položka10
                      </p>

                      <textarea
                        value={manualSubscalesText}
                        onChange={(event) => {
                          setQuestionnaireMode("manual");
                          setSelectedQuestionnaires([]);
                          setManualSubscalesText(event.target.value);
                        }}
                        rows={9}
                        placeholder={`Príklad:
Vyrovnanosť = P1, P2, P3, P4
Sebestačnosť = P5, P6, P7, P8
Mzda = J1, J10, J19, J28
Povýšenie = J2, J11, J20, J33`}
                        className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-blue-300"
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                      <label className="block text-sm font-black text-white">
                        Skupinové premenné
                      </label>

                      <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                        Zadajte premenné, podľa ktorých sa majú robiť t-testy,
                        ANOVA, Mann-Whitney alebo Kruskal-Wallis.
                      </p>

                      <textarea
                        value={groupingColumnsText}
                        onChange={(event) => {
                          setQuestionnaireMode("manual");
                          setSelectedQuestionnaires([]);
                          setGroupingColumnsText(event.target.value);
                        }}
                        rows={9}
                        placeholder={`Príklad:
pohlavie
typ_skoly
rocnik
druh_sportu
uroven_sportu`}
                        className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-blue-300"
                      />
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-xs font-bold leading-5 text-amber-50">
                    Dôležité: Ak používateľ nezadá škály a subškály, systém má
                    spraviť iba základnú frekvenčnú a deskriptívnu analýzu
                    položiek. Reliabilita, korelácie a testovanie rozdielov sa
                    majú počítať až zo zadaných škál a subškál.
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    key={`dashboard-action-${activeModule}`}
                    type="button"
                    onClick={runModule}
                    disabled={generationBlocked}
                    aria-label={activeModuleButtonLabel}
                    data-module-action={activeModule}
                    className={[
                      "group relative inline-flex min-h-[58px] w-full items-center justify-center overflow-hidden rounded-2xl px-6 py-4 text-sm font-black text-white shadow-2xl ring-2 ring-cyan-300/50 transition hover:ring-cyan-200/80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto",
                      activeModuleActionClassName,
                    ].join(" ")}
                  >
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_38%)] opacity-70 transition group-hover:opacity-100" />

                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <RefreshCcw className="h-5 w-5 animate-spin" />
                          <span>{activeModuleLoadingLabel}</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          <span>{activeModuleButtonLabel}</span>
                        </>
                      )}
                    </span>
                  </button>

                  {preparedDataFile ? (
                    <button
                      type="button"
                      onClick={downloadPreparedDataFile}
                      className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100 transition hover:bg-blue-500/20 sm:w-auto"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Stiahnuť prepared raw data</span>
                    </button>
                  ) : null}

                  {analysisResult ? (
                    <button
                      type="button"
                      onClick={() => setAnalysisModalOpen(true)}
                      className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 sm:w-auto"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Otvoriť výsledky analýzy</span>
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={startDictation}
              className={`mt-3 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition sm:mr-3 sm:w-auto ${
                isListening
                  ? "border-red-400/50 bg-red-500 text-white"
                  : "border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]"
              }`}
            >
              <Mic className="h-4 w-4" />
              Diktovať
            </button>

            <button
              type="button"
              onClick={() => setCanvasOpen(true)}
              className="mt-3 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.1] sm:mr-3 sm:w-auto"
            >
              <Paintbrush className="h-4 w-4" />
              Canvas
            </button>

            {(result || canvasText) && (
              <>
                <button
                  type="button"
                  onClick={downloadPdf}
                  className="mt-3 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.1] sm:mr-3 sm:w-auto"
                >
                  <FileDown className="h-4 w-4" />
                  PDF
                </button>

                <button
                  type="button"
                  onClick={downloadDoc}
                  className="mt-3 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.1] sm:mr-3 sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  Word
                </button>
              </>
            )}

            <button
              type="button"
              onClick={resetCurrentModule}
              className="mt-3 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/20 sm:mr-3 sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              Vyčistiť
            </button>

            {activeModule === "data" && analysisResult ? (
              <button
                type="button"
                onClick={() => setAnalysisModalOpen(true)}
                className="mt-3 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100 transition hover:bg-blue-500/20 sm:mr-3 sm:w-auto"
              >
                <Search className="h-4 w-4" />
                <span>Otvoriť výsledky analýzy</span>
              </button>
            ) : null}
          </div>
        </section>
      </main>

      {canvasOpen ? (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-white">Canvas</h2>
                <p className="text-sm font-semibold text-slate-400">
                  Upravte alebo skopírujte výsledný text.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCanvasOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-white transition hover:bg-white/[0.12]"
                aria-label="Zavrieť canvas"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <textarea
              value={canvasText}
              onChange={(event) => setCanvasText(event.target.value)}
              className="min-h-0 flex-1 resize-none border-0 bg-[#050814] p-6 text-sm font-semibold leading-7 text-white outline-none"
            />

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(canvasText || "");
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.12]"
              >
                Kopírovať
              </button>

              <button
                type="button"
                onClick={downloadPdf}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.12]"
              >
                <FileDown className="h-4 w-4" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={downloadDoc}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.12]"
              >
                <Download className="h-4 w-4" />
                <span>Word</span>
              </button>

              <button
                type="button"
                onClick={() => setCanvasOpen(false)}
                className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-500"
              >
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AnalysisResultsModal
        open={analysisModalOpen}
        result={analysisResult}
        preparedDataFile={preparedDataFile}
        onClose={() => setAnalysisModalOpen(false)}
      />
    </>
  );
}

// ================= COMPONENTS =================

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-300">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option
            key={optionValue}
            value={optionValue}
            className="bg-[#070a16]"
          >
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function FileUploadBox({
  files,
  fileInputRef,
  onFiles,
  onRemove,
  dataMode,
  disabled,
}: {
  files: AttachedFile[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void | Promise<void>;
  onRemove: (id: string) => void;
  limit: number;
  unlimited: boolean;
  dataMode: boolean;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={dataMode ? ".xlsx,.xls,.xlsm,.csv" : allowedFileAccept}
        multiple
        disabled={disabled}
        className="hidden"
        onChange={(event) => onFiles(event.target.files)}
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-200">
            <UploadCloud className="h-4 w-4 text-violet-300" />
            Prílohy
          </div>

          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-400">
            {dataMode
              ? "Načítavané súbory: XLSX, XLS, XLSM a CSV."
              : "Načítavané súbory: PDF, DOCX, TXT, RTF, ODT, JPG, JPEG, PNG, WEBP, GIF, XLS, XLSX, CSV, PPT a PPTX."}
          </p>

          <p className="mt-1 text-xs font-black text-violet-200">
            Počet nahraných príloh: {files.length}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm font-black text-violet-100 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Paperclip className="h-4 w-4" />
          Priložiť súbor
        </button>
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs text-violet-100"
            >
              <FileText className="h-4 w-4 shrink-0" />

              <span className="max-w-[240px] truncate font-bold">
                {file.name}
              </span>

              <span className="shrink-0 text-violet-200/70">
                {formatBytes(file.size)}
              </span>

              {file.extractionStatus ? (
                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-1 text-[10px] font-black",
                    file.extractionStatus === "failed"
                      ? "bg-red-500/20 text-red-200"
                      : file.extractionStatus === "server" ||
                          file.extractionStatus === "client"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-amber-500/20 text-amber-200",
                  ].join(" ")}
                  title={
                    file.extractionMessage ||
                    "Stav načítania obsahu prílohy"
                  }
                >
                  {file.extractionStatus === "server"
                    ? "Načítané serverom"
                    : file.extractionStatus === "client"
                      ? "Text pripravený"
                      : file.extractionStatus === "failed"
                        ? "Chyba čítania"
                        : "Načítava"}
                </span>
              ) : null}

              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="shrink-0 rounded-full p-1 text-violet-100 hover:bg-white/10"
                title="Odstrániť súbor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
