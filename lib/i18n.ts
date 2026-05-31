export type AppLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

export type AppLanguageItem = {
  code: AppLanguage;
  label: string;
  short: string;
  shortLabel: string;
};

export const languages: AppLanguageItem[] = [
  {
    code: 'sk',
    label: 'Slovenčina',
    short: 'SK',
    shortLabel: 'SK',
  },
  {
    code: 'cs',
    label: 'Čeština',
    short: 'CZ',
    shortLabel: 'CZ',
  },
  {
    code: 'en',
    label: 'English',
    short: 'EN',
    shortLabel: 'EN',
  },
  {
    code: 'de',
    label: 'Deutsch',
    short: 'DE',
    shortLabel: 'DE',
  },
  {
    code: 'pl',
    label: 'Polski',
    short: 'PL',
    shortLabel: 'PL',
  },
  {
    code: 'hu',
    label: 'Magyar',
    short: 'HU',
    shortLabel: 'HU',
  },
];

export type Translation = {
  nav: {
    features: string;
    pricing: string;
    faq: string;
    login: string;
    dashboard: string;
    menu: string;
  };

  common: {
    appName: string;
    loading: string;
    save: string;
    saving: string;
    saved: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    continue: string;
    yes: string;
    no: string;
    search: string;
    download: string;
    upload: string;
    language: string;
    profile: string;
    settings: string;
    logout: string;
    login: string;
    register: string;
    email: string;
    password: string;
  };

  landing: {
    badge: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    trust: string;
    featuresTitle: string;
    pricingTitle: string;
    faqTitle: string;
  };

  dashboard: {
    title: string;
    subtitle: string;
    menu: string;
    profile: string;
    chat: string;
    history: string;
    sources: string;
    originality: string;
    analysis: string;
    supervisor: string;
    audit: string;
    defense: string;
    translation: string;
    planning: string;
    emails: string;
  };

  profile: {
    title: string;
    description: string;
    myWorks: string;
    workTitle: string;
    topic: string;
    workType: string;
    field: string;
    supervisor: string;
    citationStyle: string;
    interfaceLanguage: string;
    workLanguage: string;
    goal: string;
    methodology: string;
    hypotheses: string;
    researchQuestions: string;
    sourcesRequirement: string;
    saveProfile: string;
  };
};

const sk: Translation = {
  nav: {
    features: 'Funkcie',
    pricing: 'Cenník',
    faq: 'FAQ',
    login: 'Prihlásenie',
    dashboard: 'Dashboard',
    menu: 'Menu',
  },

  common: {
    appName: 'Zedpera',
    loading: 'Načítavam...',
    save: 'Uložiť',
    saving: 'Ukladám...',
    saved: 'Uložené',
    cancel: 'Zrušiť',
    delete: 'Vymazať',
    edit: 'Upraviť',
    close: 'Zavrieť',
    back: 'Späť',
    continue: 'Pokračovať',
    yes: 'Áno',
    no: 'Nie',
    search: 'Hľadať',
    download: 'Stiahnuť',
    upload: 'Nahrať',
    language: 'Jazyk',
    profile: 'Profil',
    settings: 'Nastavenia',
    logout: 'Odhlásiť sa',
    login: 'Prihlásiť sa',
    register: 'Registrovať sa',
    email: 'E-mail',
    password: 'Heslo',
  },

  landing: {
    badge: 'AI platforma pre akademické písanie',
    title: 'Zedpera pomáha písať, analyzovať a kontrolovať akademické práce',
    subtitle:
      'Vytvárajte texty, pracujte so zdrojmi, kontrolujte kvalitu a pripravte sa na obhajobu v jednom systéme.',
    primaryCta: 'Začať používať',
    secondaryCta: 'Pozrieť funkcie',
    trust: 'Všetko v jednom akademickom pracovnom priestore',
    featuresTitle: 'Funkcie',
    pricingTitle: 'Cenník',
    faqTitle: 'Často kladené otázky',
  },

  dashboard: {
    title: 'Menu',
    subtitle: 'Vyberte modul, s ktorým chcete pracovať.',
    menu: 'Menu',
    profile: 'Profil',
    chat: 'AI chat',
    history: 'História',
    sources: 'Zdroje',
    originality: 'Originalita',
    analysis: 'Analýza dát',
    supervisor: 'AI vedúci',
    audit: 'Audit kvality',
    defense: 'Obhajoba',
    translation: 'Preklad',
    planning: 'Plánovanie',
    emails: 'Formálne správy',
  },

  profile: {
    title: 'Profil používateľa',
    description:
      'Profil používateľa a profil práce, podľa ktorého sa generujú výstupy.',
    myWorks: 'Moje práce',
    workTitle: 'Názov práce',
    topic: 'Téma práce',
    workType: 'Typ práce',
    field: 'Odbor',
    supervisor: 'Vedúci práce',
    citationStyle: 'Citačná norma',
    interfaceLanguage: 'Jazyk rozhrania',
    workLanguage: 'Jazyk práce',
    goal: 'Cieľ práce',
    methodology: 'Metodológia',
    hypotheses: 'Hypotézy',
    researchQuestions: 'Výskumné otázky',
    sourcesRequirement: 'Požiadavky na zdroje',
    saveProfile: 'Uložiť profil práce',
  },
};

const cs: Translation = {
  ...sk,
  nav: {
    features: 'Funkce',
    pricing: 'Ceník',
    faq: 'FAQ',
    login: 'Přihlášení',
    dashboard: 'Dashboard',
    menu: 'Menu',
  },
  common: {
    ...sk.common,
    loading: 'Načítám...',
    save: 'Uložit',
    saving: 'Ukládám...',
    saved: 'Uloženo',
    cancel: 'Zrušit',
    delete: 'Smazat',
    edit: 'Upravit',
    close: 'Zavřít',
    back: 'Zpět',
    continue: 'Pokračovat',
    yes: 'Ano',
    no: 'Ne',
    search: 'Hledat',
    download: 'Stáhnout',
    upload: 'Nahrát',
    logout: 'Odhlásit se',
    login: 'Přihlásit se',
    register: 'Registrovat se',
  },
  landing: {
    badge: 'AI platforma pro akademické psaní',
    title: 'Zedpera pomáhá psát, analyzovat a kontrolovat akademické práce',
    subtitle:
      'Vytvářejte texty, pracujte se zdroji, kontrolujte kvalitu a připravte se na obhajobu v jednom systému.',
    primaryCta: 'Začít používat',
    secondaryCta: 'Zobrazit funkce',
    trust: 'Vše v jednom akademickém pracovním prostoru',
    featuresTitle: 'Funkce',
    pricingTitle: 'Ceník',
    faqTitle: 'Často kladené otázky',
  },
  dashboard: {
    title: 'Menu',
    subtitle: 'Vyberte modul, se kterým chcete pracovat.',
    menu: 'Menu',
    profile: 'Profil',
    chat: 'AI chat',
    history: 'Historie',
    sources: 'Zdroje',
    originality: 'Originalita',
    analysis: 'Analýza dat',
    supervisor: 'AI vedoucí',
    audit: 'Audit kvality',
    defense: 'Obhajoba',
    translation: 'Překlad',
    planning: 'Plánování',
    emails: 'Formální zprávy',
  },
  profile: {
    title: 'Profil uživatele',
    description:
      'Profil uživatele a profil práce, podle kterého se generují výstupy.',
    myWorks: 'Moje práce',
    workTitle: 'Název práce',
    topic: 'Téma práce',
    workType: 'Typ práce',
    field: 'Obor',
    supervisor: 'Vedoucí práce',
    citationStyle: 'Citační norma',
    interfaceLanguage: 'Jazyk rozhraní',
    workLanguage: 'Jazyk práce',
    goal: 'Cíl práce',
    methodology: 'Metodologie',
    hypotheses: 'Hypotézy',
    researchQuestions: 'Výzkumné otázky',
    sourcesRequirement: 'Požadavky na zdroje',
    saveProfile: 'Uložit profil práce',
  },
};

const en: Translation = {
  nav: {
    features: 'Features',
    pricing: 'Pricing',
    faq: 'FAQ',
    login: 'Login',
    dashboard: 'Dashboard',
    menu: 'Menu',
  },

  common: {
    appName: 'Zedpera',
    loading: 'Loading...',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Saved',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    continue: 'Continue',
    yes: 'Yes',
    no: 'No',
    search: 'Search',
    download: 'Download',
    upload: 'Upload',
    language: 'Language',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Log out',
    login: 'Log in',
    register: 'Register',
    email: 'Email',
    password: 'Password',
  },

  landing: {
    badge: 'AI platform for academic writing',
    title: 'Zedpera helps write, analyze and review academic work',
    subtitle:
      'Create texts, work with sources, review quality and prepare for defense in one system.',
    primaryCta: 'Get started',
    secondaryCta: 'View features',
    trust: 'Everything in one academic workspace',
    featuresTitle: 'Features',
    pricingTitle: 'Pricing',
    faqTitle: 'Frequently asked questions',
  },

  dashboard: {
    title: 'Menu',
    subtitle: 'Choose the module you want to work with.',
    menu: 'Menu',
    profile: 'Profile',
    chat: 'AI chat',
    history: 'History',
    sources: 'Sources',
    originality: 'Originality',
    analysis: 'Data analysis',
    supervisor: 'AI supervisor',
    audit: 'Quality audit',
    defense: 'Defense',
    translation: 'Translation',
    planning: 'Planning',
    emails: 'Formal messages',
  },

  profile: {
    title: 'User profile',
    description:
      'User profile and work profile used for generating outputs.',
    myWorks: 'My works',
    workTitle: 'Work title',
    topic: 'Work topic',
    workType: 'Work type',
    field: 'Field',
    supervisor: 'Supervisor',
    citationStyle: 'Citation style',
    interfaceLanguage: 'Interface language',
    workLanguage: 'Language of the work',
    goal: 'Work objective',
    methodology: 'Methodology',
    hypotheses: 'Hypotheses',
    researchQuestions: 'Research questions',
    sourcesRequirement: 'Source requirements',
    saveProfile: 'Save work profile',
  },
};

const de: Translation = {
  ...en,
  nav: {
    features: 'Funktionen',
    pricing: 'Preise',
    faq: 'FAQ',
    login: 'Anmelden',
    dashboard: 'Dashboard',
    menu: 'Menü',
  },
  common: {
    ...en.common,
    loading: 'Wird geladen...',
    save: 'Speichern',
    saving: 'Speichern...',
    saved: 'Gespeichert',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    close: 'Schließen',
    back: 'Zurück',
    continue: 'Fortfahren',
    yes: 'Ja',
    no: 'Nein',
    search: 'Suchen',
    download: 'Herunterladen',
    upload: 'Hochladen',
    language: 'Sprache',
    profile: 'Profil',
    settings: 'Einstellungen',
    logout: 'Abmelden',
    login: 'Anmelden',
    register: 'Registrieren',
    email: 'E-Mail',
    password: 'Passwort',
  },
  landing: {
    badge: 'AI-Plattform für akademisches Schreiben',
    title:
      'Zedpera hilft beim Schreiben, Analysieren und Prüfen akademischer Arbeiten',
    subtitle:
      'Erstellen Sie Texte, arbeiten Sie mit Quellen, prüfen Sie die Qualität und bereiten Sie sich auf die Verteidigung vor.',
    primaryCta: 'Loslegen',
    secondaryCta: 'Funktionen ansehen',
    trust: 'Alles in einem akademischen Arbeitsbereich',
    featuresTitle: 'Funktionen',
    pricingTitle: 'Preise',
    faqTitle: 'Häufige Fragen',
  },
  dashboard: {
    ...en.dashboard,
    title: 'Menü',
    subtitle: 'Wählen Sie das Modul aus, mit dem Sie arbeiten möchten.',
    menu: 'Menü',
  },
  profile: {
    ...en.profile,
    title: 'Benutzerprofil',
    description:
      'Benutzerprofil und Arbeitsprofil, nach dem die Ausgaben generiert werden.',
    myWorks: 'Meine Arbeiten',
    workTitle: 'Titel der Arbeit',
    topic: 'Thema der Arbeit',
    workType: 'Art der Arbeit',
    field: 'Fachbereich',
    supervisor: 'Betreuer',
    citationStyle: 'Zitationsstil',
    interfaceLanguage: 'Sprache der Benutzeroberfläche',
    workLanguage: 'Sprache der Arbeit',
    goal: 'Ziel der Arbeit',
    methodology: 'Methodik',
    hypotheses: 'Hypothesen',
    researchQuestions: 'Forschungsfragen',
    sourcesRequirement: 'Anforderungen an Quellen',
    saveProfile: 'Arbeitsprofil speichern',
  },
};

const pl: Translation = {
  ...en,
  nav: {
    features: 'Funkcje',
    pricing: 'Cennik',
    faq: 'FAQ',
    login: 'Logowanie',
    dashboard: 'Panel',
    menu: 'Menu',
  },
  common: {
    ...en.common,
    loading: 'Ładowanie...',
    save: 'Zapisz',
    saving: 'Zapisywanie...',
    saved: 'Zapisano',
    cancel: 'Anuluj',
    delete: 'Usuń',
    edit: 'Edytuj',
    close: 'Zamknij',
    back: 'Wstecz',
    continue: 'Kontynuuj',
    yes: 'Tak',
    no: 'Nie',
    search: 'Szukaj',
    download: 'Pobierz',
    upload: 'Prześlij',
    language: 'Język',
    profile: 'Profil',
    settings: 'Ustawienia',
    logout: 'Wyloguj',
    login: 'Zaloguj',
    register: 'Zarejestruj',
    email: 'E-mail',
    password: 'Hasło',
  },
  landing: {
    badge: 'Platforma AI do pisania akademickiego',
    title: 'Zedpera pomaga pisać, analizować i sprawdzać prace akademickie',
    subtitle:
      'Twórz teksty, pracuj ze źródłami, sprawdzaj jakość i przygotuj się do obrony w jednym systemie.',
    primaryCta: 'Rozpocznij',
    secondaryCta: 'Zobacz funkcje',
    trust: 'Wszystko w jednej akademickiej przestrzeni pracy',
    featuresTitle: 'Funkcje',
    pricingTitle: 'Cennik',
    faqTitle: 'Najczęstsze pytania',
  },
  dashboard: {
    ...en.dashboard,
    title: 'Menu',
    subtitle: 'Wybierz moduł, z którym chcesz pracować.',
    profile: 'Profil',
    history: 'Historia',
    sources: 'Źródła',
  },
  profile: {
    ...en.profile,
    title: 'Profil użytkownika',
    description:
      'Profil użytkownika i profil pracy używany do generowania wyników.',
    myWorks: 'Moje prace',
    workTitle: 'Tytuł pracy',
    topic: 'Temat pracy',
    workType: 'Typ pracy',
    field: 'Dziedzina',
    supervisor: 'Promotor',
    citationStyle: 'Styl cytowania',
    interfaceLanguage: 'Język interfejsu',
    workLanguage: 'Język pracy',
    goal: 'Cel pracy',
    methodology: 'Metodologia',
    hypotheses: 'Hipotezy',
    researchQuestions: 'Pytania badawcze',
    sourcesRequirement: 'Wymagania dotyczące źródeł',
    saveProfile: 'Zapisz profil pracy',
  },
};

const hu: Translation = {
  ...en,
  nav: {
    features: 'Funkciók',
    pricing: 'Árak',
    faq: 'GYIK',
    login: 'Bejelentkezés',
    dashboard: 'Vezérlőpult',
    menu: 'Menü',
  },
  common: {
    ...en.common,
    loading: 'Betöltés...',
    save: 'Mentés',
    saving: 'Mentés...',
    saved: 'Mentve',
    cancel: 'Mégse',
    delete: 'Törlés',
    edit: 'Szerkesztés',
    close: 'Bezárás',
    back: 'Vissza',
    continue: 'Folytatás',
    yes: 'Igen',
    no: 'Nem',
    search: 'Keresés',
    download: 'Letöltés',
    upload: 'Feltöltés',
    language: 'Nyelv',
    profile: 'Profil',
    settings: 'Beállítások',
    logout: 'Kijelentkezés',
    login: 'Bejelentkezés',
    register: 'Regisztráció',
    email: 'E-mail',
    password: 'Jelszó',
  },
  landing: {
    badge: 'AI platform akadémiai íráshoz',
    title: 'A Zedpera segít akadémiai munkák írásában és elemzésében',
    subtitle:
      'Készítsen szövegeket, dolgozzon forrásokkal, ellenőrizze a minőséget és készüljön fel a védésre egy rendszerben.',
    primaryCta: 'Kezdés',
    secondaryCta: 'Funkciók megtekintése',
    trust: 'Minden egy akadémiai munkaterületen',
    featuresTitle: 'Funkciók',
    pricingTitle: 'Árak',
    faqTitle: 'Gyakori kérdések',
  },
  dashboard: {
    ...en.dashboard,
    title: 'Menü',
    subtitle: 'Válassza ki a modult, amellyel dolgozni szeretne.',
    menu: 'Menü',
  },
  profile: {
    ...en.profile,
    title: 'Felhasználói profil',
    description:
      'Felhasználói profil és munkaprofil, amely alapján a kimenetek generálódnak.',
    myWorks: 'Munkáim',
    workTitle: 'Munka címe',
    topic: 'Munka témája',
    workType: 'Munka típusa',
    field: 'Szakterület',
    supervisor: 'Témavezető',
    citationStyle: 'Hivatkozási stílus',
    interfaceLanguage: 'Felület nyelve',
    workLanguage: 'Munka nyelve',
    goal: 'Munka célja',
    methodology: 'Módszertan',
    hypotheses: 'Hipotézisek',
    researchQuestions: 'Kutatási kérdések',
    sourcesRequirement: 'Forráskövetelmények',
    saveProfile: 'Munkaprofil mentése',
  },
};

const translations: Record<AppLanguage, Translation> = {
  sk,
  cs,
  en,
  de,
  pl,
  hu,
};

export function normalizeLanguage(value: string | null | undefined): AppLanguage {
  if (!value) return 'sk';

  const normalized = value.toLowerCase();

  if (normalized.startsWith('sk')) return 'sk';
  if (normalized.startsWith('cs') || normalized.startsWith('cz')) return 'cs';
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('de')) return 'de';
  if (normalized.startsWith('pl')) return 'pl';
  if (normalized.startsWith('hu')) return 'hu';

  return 'sk';
}

export function getTranslation(language: AppLanguage): Translation {
  return translations[language] || translations.sk;
}
