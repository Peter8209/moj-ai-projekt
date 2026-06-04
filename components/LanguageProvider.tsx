'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  languages,
  getTranslation,
  normalizeLanguage,
  type AppLanguage,
} from '@/lib/i18n';

type DashboardToolTranslations = {
  common: {
    assignmentLabel: string;
    attachments: string;
    attachmentsHelp: string;
    attachFile: string;
    dictate: string;
    canvas: string;
    clear: string;
    infoText: string;
  };
  tools: {
    aiSupervisor: string;
    qualityAudit: string;
    defense: string;
    translation: string;
    dataAnalysis: string;
    planning: string;
    emails: string;
    originalityCheck: string;
    textHumanization: string;
  };
  buttons: {
    aiSupervisor: string;
    qualityAudit: string;
    defense: string;
    translation: string;
    dataAnalysis: string;
    planning: string;
    emails: string;
    originalityCheck: string;
    textHumanization: string;
  };
  placeholders: {
    aiSupervisor: string;
    qualityAudit: string;
    defense: string;
    translation: string;
    dataAnalysis: string;
    planning: string;
    emails: string;
    originalityCheck: string;
    textHumanization: string;
  };
  qualityAudit: {
    review: string;
    output: string;
    citationStyle: string;
    stylistics: string;
    citations: string;
    logic: string;
    fullAudit: string;
    detailedReport: string;
    shortReport: string;
  };
  emails: {
    emailType: string;
    tone: string;
    emailSupervisor: string;
    consultationRequest: string;
    apology: string;
    documentsSubmission: string;
    generalAcademicEmail: string;
    professionalPolite: string;
    formal: string;
    friendly: string;
    brief: string;
  };
  planning: {
    todaysDate: string;
  };
};

type AppTranslation = ReturnType<typeof getTranslation> & {
  dashboardTools: DashboardToolTranslations;
};

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: AppTranslation;
  appLanguages: typeof languages;
  isTranslatingInterface: boolean;
  translationProgress: number;
  languageVersion: number;
};

type StoredProfile = {
  id?: string;
  interfaceLanguage?: AppLanguage;
  workLanguage?: AppLanguage;
  updatedAt?: string;
  [key: string]: unknown;
};

const LANGUAGE_STORAGE_KEY = 'zedpera_language';
const SYSTEM_LANGUAGE_STORAGE_KEY = 'zedpera_system_language';
const WORK_LANGUAGE_STORAGE_KEY = 'zedpera_work_language';

const ACTIVE_PROFILE_KEY = 'active_profile';
const LEGACY_PROFILE_KEY = 'profile';
const PROFILES_FULL_KEY = 'profiles_full';

const LANGUAGE_USER_SELECTED_KEY = 'zedpera_language_user_selected';

const LANGUAGE_EVENTS = [
  'zedpera-language-change',
  'zedpera-language-updated',
  'zedpera-interface-language-change',
  'zedpera-force-language-refresh',
];

const dashboardToolTranslations: Record<AppLanguage, DashboardToolTranslations> = {
  sk: {
    common: {
      assignmentLabel: 'Zadanie alebo text',
      attachments: 'Prílohy',
      attachmentsHelp:
        'Nahraj PDF, DOCX, TXT, Excel, CSV, PPT alebo obrázky. Pri analýze dát systém otvorí výsledky v samostatnom okne.',
      attachFile: 'Priložiť súbor',
      dictate: 'Diktovať',
      canvas: 'Canvas',
      clear: 'Vymazať',
      infoText:
        'Vložte text práce alebo otázku. Systém pripraví odborné odporúčania, komentáre a návrhy na zlepšenie.',
    },
    tools: {
      aiSupervisor: 'AI supervízor',
      qualityAudit: 'Audit kvality',
      defense: 'Obhajoba',
      translation: 'Preklad',
      dataAnalysis: 'Analýza dát',
      planning: 'Plánovanie',
      emails: 'Emaily',
      originalityCheck: 'Kontrola originality',
      textHumanization: 'Humanizácia textu',
    },
    buttons: {
      aiSupervisor: 'Spustiť AI supervízora',
      qualityAudit: 'Spustiť audit kvality',
      defense: 'Pripraviť obhajobu',
      translation: 'Preložiť text',
      dataAnalysis: 'Spustiť analýzu dát',
      planning: 'Spustiť plánovanie',
      emails: 'Vygenerovať email',
      originalityCheck: 'Spustiť kontrolu originality',
      textHumanization: 'Spustiť humanizáciu textu',
    },
    placeholders: {
      aiSupervisor:
        'Vložte prácu, otázku alebo časť, ktorú chcete skontrolovať.',
      qualityAudit:
        'Vložte text práce, kapitolu, úvod, záver alebo časť, ktorú chcete odborne skontrolovať.',
      defense:
        'Vložte text práce, abstrakt, záver alebo otázky k obhajobe.',
      translation:
        'Vložte text, ktorý chcete preložiť do zvoleného jazyka.',
      dataAnalysis:
        'Napíšte, čo má systém s dátami urobiť. Napríklad: priprav frekvenčnú analýzu, deskriptívnu štatistiku, grafy, korelácie Pearson/Spearman, testy a interpretáciu výsledkov do práce.',
      planning:
        'Napíšte termín odovzdania, aktuálny stav práce a požadovaný plán. Termín nesmie byť v minulosti.',
      emails:
        'Napíšte, komu má byť email určený a čo má obsahovať. Stačí stručne.',
      originalityCheck:
        'Nahrajte alebo vložte text práce. Systém pripraví orientačný protokol kontroly originality.',
      textHumanization:
        'Vložte text, ktorý chcete upraviť do prirodzenejšej, plynulejšej a menej strojovej podoby.',
    },
    qualityAudit: {
      review: 'Kontrola',
      output: 'Výstup',
      citationStyle: 'Citačný štýl',
      stylistics: 'Štylistika',
      citations: 'Citácie',
      logic: 'Logika a nadväznosť',
      fullAudit: 'Celkový audit',
      detailedReport: 'Detailná správa',
      shortReport: 'Stručná správa',
    },
    emails: {
      emailType: 'Typ emailu',
      tone: 'Tón',
      emailSupervisor: 'Email vedúcemu',
      consultationRequest: 'Žiadosť o konzultáciu',
      apology: 'Ospravedlnenie',
      documentsSubmission: 'Doplnenie podkladov',
      generalAcademicEmail: 'Všeobecný akademický email',
      professionalPolite: 'Profesionálny a slušný',
      formal: 'Formálny',
      friendly: 'Priateľský',
      brief: 'Stručný',
    },
    planning: {
      todaysDate: 'Dnešný dátum',
    },
  },

  cs: {
    common: {
      assignmentLabel: 'Zadání nebo text',
      attachments: 'Přílohy',
      attachmentsHelp:
        'Nahrajte PDF, DOCX, TXT, Excel, CSV, PPT nebo obrázky. Při analýze dat systém otevře výsledky v samostatném okně.',
      attachFile: 'Přiložit soubor',
      dictate: 'Diktovat',
      canvas: 'Canvas',
      clear: 'Vymazat',
      infoText:
        'Vložte text práce nebo otázku. Systém připraví odborná doporučení, komentáře a návrhy na zlepšení.',
    },
    tools: {
      aiSupervisor: 'AI supervizor',
      qualityAudit: 'Audit kvality',
      defense: 'Obhajoba',
      translation: 'Překlad',
      dataAnalysis: 'Analýza dat',
      planning: 'Plánování',
      emails: 'Emaily',
      originalityCheck: 'Kontrola originality',
      textHumanization: 'Humanizace textu',
    },
    buttons: {
      aiSupervisor: 'Spustit AI supervizora',
      qualityAudit: 'Spustit audit kvality',
      defense: 'Připravit obhajobu',
      translation: 'Přeložit text',
      dataAnalysis: 'Spustit analýzu dat',
      planning: 'Spustit plánování',
      emails: 'Vygenerovat email',
      originalityCheck: 'Spustit kontrolu originality',
      textHumanization: 'Spustit humanizaci textu',
    },
    placeholders: {
      aiSupervisor:
        'Vložte práci, otázku nebo část, kterou chcete zkontrolovat.',
      qualityAudit:
        'Vložte text práce, kapitolu, úvod, závěr nebo část, kterou chcete odborně zkontrolovat.',
      defense:
        'Vložte text práce, abstrakt, závěr nebo otázky k obhajobě.',
      translation:
        'Vložte text, který chcete přeložit do zvoleného jazyka.',
      dataAnalysis:
        'Napište, co má systém s daty udělat. Například: připrav frekvenční analýzu, deskriptivní statistiku, grafy, korelace Pearson/Spearman, testy a interpretaci výsledků do práce.',
      planning:
        'Napište termín odevzdání, aktuální stav práce a požadovaný plán. Termín nesmí být v minulosti.',
      emails:
        'Napište, komu má být email určen a co má obsahovat. Stačí stručně.',
      originalityCheck:
        'Nahrajte nebo vložte text práce. Systém připraví orientační protokol kontroly originality.',
      textHumanization:
        'Vložte text, který chcete upravit do přirozenější, plynulejší a méně strojové podoby.',
    },
    qualityAudit: {
      review: 'Kontrola',
      output: 'Výstup',
      citationStyle: 'Citační styl',
      stylistics: 'Stylistika',
      citations: 'Citace',
      logic: 'Logika a návaznost',
      fullAudit: 'Celkový audit',
      detailedReport: 'Detailní zpráva',
      shortReport: 'Stručná zpráva',
    },
    emails: {
      emailType: 'Typ emailu',
      tone: 'Tón',
      emailSupervisor: 'Email vedoucímu',
      consultationRequest: 'Žádost o konzultaci',
      apology: 'Omluva',
      documentsSubmission: 'Doplnění podkladů',
      generalAcademicEmail: 'Obecný akademický email',
      professionalPolite: 'Profesionální a slušný',
      formal: 'Formální',
      friendly: 'Přátelský',
      brief: 'Stručný',
    },
    planning: {
      todaysDate: 'Dnešní datum',
    },
  },

  en: {
    common: {
      assignmentLabel: 'Assignment or text',
      attachments: 'Attachments',
      attachmentsHelp:
        'Upload PDF, DOCX, TXT, Excel, CSV, PPT or images. For data analysis, the results will open in a separate modal window.',
      attachFile: 'Attach file',
      dictate: 'Dictate',
      canvas: 'Canvas',
      clear: 'Clear',
      infoText:
        'Enter your paper text or question. The system will prepare expert recommendations, comments, and suggestions for improvement.',
    },
    tools: {
      aiSupervisor: 'AI Supervisor',
      qualityAudit: 'Quality Audit',
      defense: 'Defense',
      translation: 'Translation',
      dataAnalysis: 'Data Analysis',
      planning: 'Planning',
      emails: 'Emails',
      originalityCheck: 'Originality Check',
      textHumanization: 'Text Humanization',
    },
    buttons: {
      aiSupervisor: 'Run AI Supervisor',
      qualityAudit: 'Run Quality Audit',
      defense: 'Prepare Defense',
      translation: 'Translate Text',
      dataAnalysis: 'Run Data Analysis',
      planning: 'Start Planning',
      emails: 'Generate Email',
      originalityCheck: 'Run Originality Check',
      textHumanization: 'Run Text Humanization',
    },
    placeholders: {
      aiSupervisor:
        'Insert your paper, question, or section you want to review.',
      qualityAudit:
        'Insert your thesis text, chapter, introduction, conclusion, or any section you want to review.',
      defense:
        'Insert your thesis text, abstract, conclusion, or defense questions.',
      translation:
        'Insert the text you want to translate into the selected language.',
      dataAnalysis:
        'Describe what the system should do with the data. For example: prepare frequency analysis, descriptive statistics, charts, Pearson/Spearman correlations, tests, and interpretation of results for the thesis.',
      planning:
        'Enter the submission deadline, current state of the paper, and the required plan. The deadline must not be in the past.',
      emails:
        'Write who the email is for and what it should contain. A short instruction is enough.',
      originalityCheck:
        'Upload or paste your paper text. The system will prepare an indicative originality check protocol.',
      textHumanization:
        'Insert the text you want to rewrite into a more natural, fluent, and less machine-like form.',
    },
    qualityAudit: {
      review: 'Review',
      output: 'Output',
      citationStyle: 'Citation Style',
      stylistics: 'Stylistics',
      citations: 'Citations',
      logic: 'Logic and coherence',
      fullAudit: 'Full audit',
      detailedReport: 'Detailed report',
      shortReport: 'Short report',
    },
    emails: {
      emailType: 'Email Type',
      tone: 'Tone',
      emailSupervisor: 'Email to supervisor',
      consultationRequest: 'Consultation request',
      apology: 'Apology',
      documentsSubmission: 'Document submission',
      generalAcademicEmail: 'General academic email',
      professionalPolite: 'Professional and polite',
      formal: 'Formal',
      friendly: 'Friendly',
      brief: 'Brief',
    },
    planning: {
      todaysDate: "Today's date",
    },
  },

  de: {
    common: {
      assignmentLabel: 'Aufgabe oder Text',
      attachments: 'Anhänge',
      attachmentsHelp:
        'Laden Sie PDF, DOCX, TXT, Excel, CSV, PPT oder Bilder hoch. Bei der Datenanalyse werden die Ergebnisse in einem separaten Fenster geöffnet.',
      attachFile: 'Datei anhängen',
      dictate: 'Diktieren',
      canvas: 'Canvas',
      clear: 'Löschen',
      infoText:
        'Geben Sie Ihren Arbeitstext oder Ihre Frage ein. Das System erstellt fachliche Empfehlungen, Kommentare und Verbesserungsvorschläge.',
    },
    tools: {
      aiSupervisor: 'KI-Betreuer',
      qualityAudit: 'Qualitätsaudit',
      defense: 'Verteidigung',
      translation: 'Übersetzung',
      dataAnalysis: 'Datenanalyse',
      planning: 'Planung',
      emails: 'E-Mails',
      originalityCheck: 'Originalitätsprüfung',
      textHumanization: 'Text-Humanisierung',
    },
    buttons: {
      aiSupervisor: 'KI-Betreuer starten',
      qualityAudit: 'Qualitätsaudit starten',
      defense: 'Verteidigung vorbereiten',
      translation: 'Text übersetzen',
      dataAnalysis: 'Datenanalyse starten',
      planning: 'Planung starten',
      emails: 'E-Mail generieren',
      originalityCheck: 'Originalitätsprüfung starten',
      textHumanization: 'Text humanisieren',
    },
    placeholders: {
      aiSupervisor:
        'Fügen Sie Ihre Arbeit, Frage oder den Abschnitt ein, den Sie prüfen möchten.',
      qualityAudit:
        'Fügen Sie den Text Ihrer Arbeit, ein Kapitel, eine Einleitung, einen Schluss oder einen Abschnitt ein.',
      defense:
        'Fügen Sie den Text Ihrer Arbeit, Abstract, Schluss oder Fragen zur Verteidigung ein.',
      translation:
        'Fügen Sie den Text ein, den Sie in die gewählte Sprache übersetzen möchten.',
      dataAnalysis:
        'Beschreiben Sie, was das System mit den Daten machen soll. Zum Beispiel: Häufigkeitsanalyse, deskriptive Statistik, Diagramme, Pearson/Spearman-Korrelationen, Tests und Interpretation.',
      planning:
        'Geben Sie Abgabetermin, aktuellen Stand der Arbeit und den gewünschten Plan ein. Der Termin darf nicht in der Vergangenheit liegen.',
      emails:
        'Schreiben Sie, an wen die E-Mail gerichtet ist und was sie enthalten soll.',
      originalityCheck:
        'Laden Sie den Text hoch oder fügen Sie ihn ein. Das System erstellt ein orientierendes Originalitätsprotokoll.',
      textHumanization:
        'Fügen Sie den Text ein, der natürlicher, flüssiger und weniger maschinell wirken soll.',
    },
    qualityAudit: {
      review: 'Prüfung',
      output: 'Ausgabe',
      citationStyle: 'Zitationsstil',
      stylistics: 'Stilistik',
      citations: 'Zitate',
      logic: 'Logik und Kohärenz',
      fullAudit: 'Vollständiges Audit',
      detailedReport: 'Detaillierter Bericht',
      shortReport: 'Kurzer Bericht',
    },
    emails: {
      emailType: 'E-Mail-Typ',
      tone: 'Ton',
      emailSupervisor: 'E-Mail an Betreuer',
      consultationRequest: 'Beratungsanfrage',
      apology: 'Entschuldigung',
      documentsSubmission: 'Unterlagen ergänzen',
      generalAcademicEmail: 'Allgemeine akademische E-Mail',
      professionalPolite: 'Professionell und höflich',
      formal: 'Formell',
      friendly: 'Freundlich',
      brief: 'Kurz',
    },
    planning: {
      todaysDate: 'Heutiges Datum',
    },
  },

  pl: {
    common: {
      assignmentLabel: 'Zadanie lub tekst',
      attachments: 'Załączniki',
      attachmentsHelp:
        'Prześlij PDF, DOCX, TXT, Excel, CSV, PPT lub obrazy. Przy analizie danych wyniki otworzą się w osobnym oknie.',
      attachFile: 'Dołącz plik',
      dictate: 'Dyktuj',
      canvas: 'Canvas',
      clear: 'Wyczyść',
      infoText:
        'Wprowadź tekst pracy lub pytanie. System przygotuje eksperckie rekomendacje, komentarze i sugestie ulepszeń.',
    },
    tools: {
      aiSupervisor: 'Opiekun AI',
      qualityAudit: 'Audyt jakości',
      defense: 'Obrona',
      translation: 'Tłumaczenie',
      dataAnalysis: 'Analiza danych',
      planning: 'Planowanie',
      emails: 'E-maile',
      originalityCheck: 'Kontrola oryginalności',
      textHumanization: 'Humanizacja tekstu',
    },
    buttons: {
      aiSupervisor: 'Uruchom opiekuna AI',
      qualityAudit: 'Uruchom audyt jakości',
      defense: 'Przygotuj obronę',
      translation: 'Przetłumacz tekst',
      dataAnalysis: 'Uruchom analizę danych',
      planning: 'Uruchom planowanie',
      emails: 'Wygeneruj e-mail',
      originalityCheck: 'Uruchom kontrolę oryginalności',
      textHumanization: 'Humanizuj tekst',
    },
    placeholders: {
      aiSupervisor:
        'Wklej pracę, pytanie lub część, którą chcesz sprawdzić.',
      qualityAudit:
        'Wklej tekst pracy, rozdział, wstęp, zakończenie lub część do sprawdzenia.',
      defense:
        'Wklej tekst pracy, abstrakt, zakończenie lub pytania do obrony.',
      translation:
        'Wklej tekst, który chcesz przetłumaczyć na wybrany język.',
      dataAnalysis:
        'Opisz, co system ma zrobić z danymi. Na przykład: analiza częstotliwości, statystyka opisowa, wykresy, korelacje Pearson/Spearman, testy i interpretacja wyników.',
      planning:
        'Podaj termin oddania, aktualny stan pracy i wymagany plan. Termin nie może być w przeszłości.',
      emails:
        'Napisz, do kogo ma być e-mail i co powinien zawierać.',
      originalityCheck:
        'Prześlij lub wklej tekst pracy. System przygotuje orientacyjny protokół oryginalności.',
      textHumanization:
        'Wklej tekst, który chcesz zmienić na bardziej naturalny i płynny.',
    },
    qualityAudit: {
      review: 'Kontrola',
      output: 'Wynik',
      citationStyle: 'Styl cytowania',
      stylistics: 'Stylistyka',
      citations: 'Cytowania',
      logic: 'Logika i spójność',
      fullAudit: 'Pełny audyt',
      detailedReport: 'Raport szczegółowy',
      shortReport: 'Raport krótki',
    },
    emails: {
      emailType: 'Typ e-maila',
      tone: 'Ton',
      emailSupervisor: 'E-mail do promotora',
      consultationRequest: 'Prośba o konsultację',
      apology: 'Przeprosiny',
      documentsSubmission: 'Uzupełnienie dokumentów',
      generalAcademicEmail: 'Ogólny e-mail akademicki',
      professionalPolite: 'Profesjonalny i uprzejmy',
      formal: 'Formalny',
      friendly: 'Przyjazny',
      brief: 'Krótki',
    },
    planning: {
      todaysDate: 'Dzisiejsza data',
    },
  },

  hu: {
    common: {
      assignmentLabel: 'Feladat vagy szöveg',
      attachments: 'Mellékletek',
      attachmentsHelp:
        'Tölts fel PDF, DOCX, TXT, Excel, CSV, PPT vagy képfájlokat. Adatelemzésnél az eredmények külön ablakban nyílnak meg.',
      attachFile: 'Fájl csatolása',
      dictate: 'Diktálás',
      canvas: 'Canvas',
      clear: 'Törlés',
      infoText:
        'Írd be a dolgozat szövegét vagy kérdésedet. A rendszer szakmai ajánlásokat, megjegyzéseket és javítási javaslatokat készít.',
    },
    tools: {
      aiSupervisor: 'AI témavezető',
      qualityAudit: 'Minőségi audit',
      defense: 'Védés',
      translation: 'Fordítás',
      dataAnalysis: 'Adatelemzés',
      planning: 'Tervezés',
      emails: 'E-mailek',
      originalityCheck: 'Eredetiség ellenőrzése',
      textHumanization: 'Szöveg humanizálása',
    },
    buttons: {
      aiSupervisor: 'AI témavezető indítása',
      qualityAudit: 'Minőségi audit indítása',
      defense: 'Védés előkészítése',
      translation: 'Szöveg fordítása',
      dataAnalysis: 'Adatelemzés indítása',
      planning: 'Tervezés indítása',
      emails: 'E-mail generálása',
      originalityCheck: 'Eredetiség ellenőrzése',
      textHumanization: 'Szöveg humanizálása',
    },
    placeholders: {
      aiSupervisor:
        'Illeszd be a dolgozatot, kérdést vagy ellenőrizendő részt.',
      qualityAudit:
        'Illeszd be a dolgozat szövegét, fejezetét, bevezetését, zárását vagy egy ellenőrizendő részt.',
      defense:
        'Illeszd be a dolgozat szövegét, absztraktját, zárását vagy védési kérdéseket.',
      translation:
        'Illeszd be a szöveget, amelyet a kiválasztott nyelvre szeretnél fordítani.',
      dataAnalysis:
        'Írd le, mit tegyen a rendszer az adatokkal. Például: gyakorisági elemzés, leíró statisztika, grafikonok, Pearson/Spearman korrelációk, tesztek és értelmezés.',
      planning:
        'Add meg a leadási határidőt, a dolgozat aktuális állapotát és a szükséges tervet. A határidő nem lehet múltbeli.',
      emails:
        'Írd le, kinek szóljon az e-mail és mit tartalmazzon.',
      originalityCheck:
        'Töltsd fel vagy illeszd be a dolgozat szövegét. A rendszer tájékoztató eredetiségellenőrzési protokollt készít.',
      textHumanization:
        'Illeszd be a szöveget, amelyet természetesebbé és gördülékenyebbé szeretnél tenni.',
    },
    qualityAudit: {
      review: 'Ellenőrzés',
      output: 'Kimenet',
      citationStyle: 'Hivatkozási stílus',
      stylistics: 'Stilisztika',
      citations: 'Hivatkozások',
      logic: 'Logika és koherencia',
      fullAudit: 'Teljes audit',
      detailedReport: 'Részletes jelentés',
      shortReport: 'Rövid jelentés',
    },
    emails: {
      emailType: 'E-mail típusa',
      tone: 'Hangnem',
      emailSupervisor: 'E-mail a témavezetőnek',
      consultationRequest: 'Konzultációs kérés',
      apology: 'Bocsánatkérés',
      documentsSubmission: 'Dokumentumok kiegészítése',
      generalAcademicEmail: 'Általános akadémiai e-mail',
      professionalPolite: 'Professzionális és udvarias',
      formal: 'Formális',
      friendly: 'Barátságos',
      brief: 'Rövid',
    },
    planning: {
      todaysDate: 'Mai dátum',
    },
  },
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isValidLanguage(value: unknown): value is AppLanguage {
  return (
    value === 'sk' ||
    value === 'cs' ||
    value === 'en' ||
    value === 'de' ||
    value === 'pl' ||
    value === 'hu'
  );
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeStoredLanguage(value: unknown): AppLanguage | null {
  if (isValidLanguage(value)) return value;

  if (typeof value !== 'string') return null;

  const normalized = normalizeLanguage(value);

  return isValidLanguage(normalized) ? normalized : null;
}

function getLanguageFromPath(): AppLanguage | null {
  if (typeof window === 'undefined') return null;

  const firstSegment = window.location.pathname
    .split('/')
    .filter(Boolean)[0];

  if (isValidLanguage(firstSegment)) return firstSegment;

  return null;
}

function getStoredLanguage(): AppLanguage | null {
  if (typeof window === 'undefined') return null;

  const savedLanguage =
    window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
    window.localStorage.getItem(SYSTEM_LANGUAGE_STORAGE_KEY) ||
    window.localStorage.getItem(WORK_LANGUAGE_STORAGE_KEY);

  return normalizeStoredLanguage(savedLanguage);
}

function getInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'sk';

  const languageFromPath = getLanguageFromPath();

  if (languageFromPath) return languageFromPath;

  const userSelectedLanguage =
    window.localStorage.getItem(LANGUAGE_USER_SELECTED_KEY) === 'true';

  const storedLanguage = getStoredLanguage();

  if (userSelectedLanguage && storedLanguage) return storedLanguage;
  if (storedLanguage) return storedLanguage;

  return 'sk';
}

function updateProfileInterfaceLanguage(
  nextLanguage: AppLanguage,
  updateWorkLanguage = false,
) {
  if (typeof window === 'undefined') return;

  const now = new Date().toISOString();

  const activeProfile = safeJsonParse<StoredProfile>(
    window.localStorage.getItem(ACTIVE_PROFILE_KEY),
  );

  if (activeProfile?.id) {
    const updatedProfile: StoredProfile = {
      ...activeProfile,
      interfaceLanguage: nextLanguage,
      updatedAt: now,
    };

    if (updateWorkLanguage) {
      updatedProfile.workLanguage = nextLanguage;
    }

    window.localStorage.setItem(
      ACTIVE_PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );

    window.localStorage.setItem(
      LEGACY_PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );

    const profilesFull = safeJsonParse<StoredProfile[]>(
      window.localStorage.getItem(PROFILES_FULL_KEY),
    );

    if (Array.isArray(profilesFull)) {
      const updatedProfiles = profilesFull.map((profile) => {
        if (profile.id === updatedProfile.id) {
          return {
            ...profile,
            interfaceLanguage: nextLanguage,
            ...(updateWorkLanguage ? { workLanguage: nextLanguage } : {}),
            updatedAt: now,
          };
        }

        return profile;
      });

      window.localStorage.setItem(
        PROFILES_FULL_KEY,
        JSON.stringify(updatedProfiles),
      );
    }

    return;
  }

  const legacyProfile = safeJsonParse<StoredProfile>(
    window.localStorage.getItem(LEGACY_PROFILE_KEY),
  );

  if (legacyProfile?.id) {
    const updatedProfile: StoredProfile = {
      ...legacyProfile,
      interfaceLanguage: nextLanguage,
      updatedAt: now,
    };

    if (updateWorkLanguage) {
      updatedProfile.workLanguage = nextLanguage;
    }

    window.localStorage.setItem(
      LEGACY_PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );

    window.localStorage.setItem(
      ACTIVE_PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );
  }
}

function ensureNoTranslateMetaTag() {
  if (typeof document === 'undefined') return;

  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="google"][content="notranslate"]',
  );

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'google';
    meta.content = 'notranslate';
    document.head.appendChild(meta);
  }
}

function applyLanguageToDocument(nextLanguage: AppLanguage) {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = nextLanguage;
  document.documentElement.setAttribute('data-language', nextLanguage);
  document.documentElement.setAttribute('data-system-language', nextLanguage);
  document.documentElement.setAttribute('data-work-language', nextLanguage);
  document.documentElement.setAttribute('translate', 'no');
  document.documentElement.classList.add('notranslate');

  if (document.body) {
    document.body.setAttribute('data-language', nextLanguage);
    document.body.setAttribute('data-system-language', nextLanguage);
    document.body.setAttribute('data-work-language', nextLanguage);
    document.body.setAttribute('translate', 'no');
    document.body.classList.add('notranslate');
  }

  ensureNoTranslateMetaTag();
}

function persistLanguage(
  nextLanguage: AppLanguage,
  options?: {
    markAsUserSelected?: boolean;
    updateProfile?: boolean;
    updateWorkLanguage?: boolean;
  },
) {
  if (typeof window === 'undefined') return;

  const markAsUserSelected = options?.markAsUserSelected ?? false;
  const updateProfile = options?.updateProfile ?? true;
  const updateWorkLanguage = options?.updateWorkLanguage ?? false;

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  window.localStorage.setItem(SYSTEM_LANGUAGE_STORAGE_KEY, nextLanguage);

  if (markAsUserSelected || updateWorkLanguage) {
    window.localStorage.setItem(WORK_LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  if (markAsUserSelected) {
    window.localStorage.setItem(LANGUAGE_USER_SELECTED_KEY, 'true');
  }

  if (updateProfile) {
    updateProfileInterfaceLanguage(nextLanguage, updateWorkLanguage);
  }

  applyLanguageToDocument(nextLanguage);
}

function dispatchLanguageChange(nextLanguage: AppLanguage) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<AppLanguage>('zedpera-language-change', {
      detail: nextLanguage,
    }),
  );

  window.dispatchEvent(
    new CustomEvent<{ language: AppLanguage }>('zedpera-language-updated', {
      detail: { language: nextLanguage },
    }),
  );

  window.dispatchEvent(
    new CustomEvent<{ language: AppLanguage }>(
      'zedpera-interface-language-change',
      {
        detail: { language: nextLanguage },
      },
    ),
  );

  window.dispatchEvent(
    new CustomEvent<{ language: AppLanguage }>('zedpera-force-language-refresh', {
      detail: { language: nextLanguage },
    }),
  );
}

function readLanguageFromCustomEvent(event: Event): AppLanguage | null {
  const customEvent = event as CustomEvent<
    AppLanguage | { language?: AppLanguage; nextLanguage?: AppLanguage }
  >;

  const detail = customEvent.detail;

  if (typeof detail === 'string') {
    return normalizeStoredLanguage(detail);
  }

  return normalizeStoredLanguage(detail?.language || detail?.nextLanguage);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('sk');
  const [isReady, setIsReady] = useState(false);
  const [languageVersion, setLanguageVersion] = useState(0);

  const applyLanguage = useCallback(
    (
      nextLanguage: AppLanguage,
      options?: {
        shouldDispatch?: boolean;
        markAsUserSelected?: boolean;
        updateProfile?: boolean;
        updateWorkLanguage?: boolean;
        forceVersionUpdate?: boolean;
      },
    ) => {
      if (!isValidLanguage(nextLanguage)) return;

      const shouldDispatch = options?.shouldDispatch ?? true;
      const markAsUserSelected = options?.markAsUserSelected ?? false;
      const updateProfile = options?.updateProfile ?? true;
      const updateWorkLanguage = options?.updateWorkLanguage ?? false;
      const forceVersionUpdate = options?.forceVersionUpdate ?? true;

      setLanguageState(nextLanguage);

      if (forceVersionUpdate) {
        setLanguageVersion((version) => version + 1);
      }

      persistLanguage(nextLanguage, {
        markAsUserSelected,
        updateProfile,
        updateWorkLanguage,
      });

      if (shouldDispatch) {
        dispatchLanguageChange(nextLanguage);
      }
    },
    [],
  );

  useEffect(() => {
    const initialLanguage = getInitialLanguage();

    setLanguageState(initialLanguage);
    setLanguageVersion((version) => version + 1);

    persistLanguage(initialLanguage, {
      markAsUserSelected: false,
      updateProfile: false,
      updateWorkLanguage: false,
    });

    setIsReady(true);
    dispatchLanguageChange(initialLanguage);
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key !== LANGUAGE_STORAGE_KEY &&
        event.key !== SYSTEM_LANGUAGE_STORAGE_KEY &&
        event.key !== WORK_LANGUAGE_STORAGE_KEY
      ) {
        return;
      }

      const nextLanguage = normalizeStoredLanguage(event.newValue);

      if (!nextLanguage) return;

      applyLanguage(nextLanguage, {
        shouldDispatch: true,
        markAsUserSelected: false,
        updateProfile: false,
        updateWorkLanguage: false,
        forceVersionUpdate: true,
      });
    };

    const handleCustomLanguageChange = (event: Event) => {
      const nextLanguage = readLanguageFromCustomEvent(event);

      if (!nextLanguage) return;

      applyLanguage(nextLanguage, {
        shouldDispatch: false,
        markAsUserSelected: true,
        updateProfile: true,
        updateWorkLanguage: true,
        forceVersionUpdate: true,
      });
    };

    const handleProfileChange = () => {
      const storedLanguage = getStoredLanguage();

      applyLanguage(storedLanguage || 'sk', {
        shouldDispatch: true,
        markAsUserSelected: false,
        updateProfile: false,
        updateWorkLanguage: false,
        forceVersionUpdate: true,
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('zedpera-profile-change', handleProfileChange);

    LANGUAGE_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleCustomLanguageChange);
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('zedpera-profile-change', handleProfileChange);

      LANGUAGE_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleCustomLanguageChange);
      });
    };
  }, [applyLanguage]);

  const setLanguage = useCallback(
    (nextLanguage: AppLanguage) => {
      if (!isValidLanguage(nextLanguage)) return;

      applyLanguage(nextLanguage, {
        shouldDispatch: true,
        markAsUserSelected: true,
        updateProfile: true,
        updateWorkLanguage: true,
        forceVersionUpdate: true,
      });
    },
    [applyLanguage],
  );

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage,
      t: {
        ...getTranslation(language),
        dashboardTools: dashboardToolTranslations[language],
      } as AppTranslation,
      appLanguages: languages,
      isTranslatingInterface: false,
      translationProgress: 100,
      languageVersion,
    };
  }, [language, setLanguage, languageVersion]);

  return (
    <LanguageContext.Provider value={value}>
      {isReady ? children : null}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage musí byť použitý vo vnútri LanguageProvider.');
  }

  return context;
}