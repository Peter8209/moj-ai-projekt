export type AppLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

export type AppLanguageItem = {
  code: AppLanguage;
  label: string;
  shortLabel: string;
  short: string;
};

export const languages: AppLanguageItem[] = [
  { code: 'sk', label: 'Slovenčina', shortLabel: 'SK', short: 'SK' },
  { code: 'cs', label: 'Čeština', shortLabel: 'CZ', short: 'CZ' },
  { code: 'en', label: 'English', shortLabel: 'EN', short: 'EN' },
  { code: 'de', label: 'Deutsch', shortLabel: 'DE', short: 'DE' },
  { code: 'pl', label: 'Polski', shortLabel: 'PL', short: 'PL' },
  { code: 'hu', label: 'Magyar', shortLabel: 'HU', short: 'HU' },
];

// Alias pre staršie časti aplikácie, ktoré importujú appLanguages
export const appLanguages = languages;

export const LANGUAGE_STORAGE_KEY = 'zedpera_language';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return (
    value === 'sk' ||
    value === 'cs' ||
    value === 'en' ||
    value === 'de' ||
    value === 'pl' ||
    value === 'hu'
  );
}

export function normalizeLanguage(value: unknown): AppLanguage {
  const lang = String(value || '').toLowerCase().trim();

  if (
    lang === 'sk' ||
    lang === 'sk-sk' ||
    lang.startsWith('sk') ||
    lang === 'slovak' ||
    lang === 'slovenčina' ||
    lang === 'slovencina'
  ) {
    return 'sk';
  }

  if (
    lang === 'cs' ||
    lang === 'cs-cz' ||
    lang === 'cz' ||
    lang.startsWith('cs') ||
    lang === 'czech' ||
    lang === 'čeština' ||
    lang === 'cestina'
  ) {
    return 'cs';
  }

  if (
    lang === 'en' ||
    lang === 'en-us' ||
    lang === 'en-gb' ||
    lang.startsWith('en') ||
    lang === 'english' ||
    lang === 'angličtina' ||
    lang === 'anglictina'
  ) {
    return 'en';
  }

  if (
    lang === 'de' ||
    lang === 'de-de' ||
    lang === 'de-at' ||
    lang.startsWith('de') ||
    lang === 'german' ||
    lang === 'deutsch' ||
    lang === 'nemčina' ||
    lang === 'nemcina'
  ) {
    return 'de';
  }

  if (
    lang === 'pl' ||
    lang === 'pl-pl' ||
    lang.startsWith('pl') ||
    lang === 'polish' ||
    lang === 'polski' ||
    lang === 'poľština' ||
    lang === 'polstina'
  ) {
    return 'pl';
  }

  if (
    lang === 'hu' ||
    lang === 'hu-hu' ||
    lang.startsWith('hu') ||
    lang === 'hungarian' ||
    lang === 'magyar' ||
    lang === 'maďarčina' ||
    lang === 'madarcina'
  ) {
    return 'hu';
  }

  return 'sk';
}

export function getLanguageName(language: AppLanguage): string {
  const names: Record<AppLanguage, string> = {
    sk: 'slovenčina',
    cs: 'čeština',
    en: 'angličtina',
    de: 'nemčina',
    pl: 'poľština',
    hu: 'maďarčina',
  };

  return names[language] || names.sk;
}

export type HomepageTranslationKey =
  | 'navFeatures'
  | 'navPricing'
  | 'navLogin'
  | 'navStart'
  | 'heroBadge'
  | 'heroTitle'
  | 'heroText'
  | 'heroPrimary'
  | 'heroSecondary'
  | 'featuresTitle'
  | 'featureChatTitle'
  | 'featureChatText'
  | 'featureSourcesTitle'
  | 'featureSourcesText'
  | 'featureSupervisorTitle'
  | 'featureSupervisorText'
  | 'pricingTitle'
  | 'footerText';

export type HomepageTranslations = Record<HomepageTranslationKey, string>;

export type TranslationDictionary = {
  appName: string;
  home: string;
  aiChat: string;
  dashboard: string;
  sources: string;
  pricing: string;
  login: string;
  logout: string;
  register: string;
  profile: string;
  createProfile: string;
  selectProfile: string;
  activeProfile: string;
  noProfile: string;
  send: string;
  stop: string;
  uploadFile: string;
  attachedFiles: string;
  writeMessage: string;
  lightMode: string;
  darkMode: string;
  language: string;
  workLanguage: string;
  citationStyle: string;
  save: string;
  cancel: string;
  close: string;
  loading: string;
  error: string;
  tryAgain: string;
  publicHeroTitle: string;
  publicHeroSubtitle: string;
  choosePlan: string;
  monthly: string;
  yearly: string;
  homepage: HomepageTranslations;
};

export type TranslationKey = Exclude<keyof TranslationDictionary, 'homepage'>;

export const translations = {
  sk: {
    appName: 'Zedpera',
    home: 'Domov',
    aiChat: 'AI Chat',
    dashboard: 'Dashboard',
    sources: 'Zdroje',
    pricing: 'Cenník',
    login: 'Prihlásenie',
    logout: 'Odhlásiť sa',
    register: 'Registrácia',
    profile: 'Profil',
    createProfile: 'Vytvoriť profil',
    selectProfile: 'Vybrať profil',
    activeProfile: 'Aktívny profil',
    noProfile: 'Najskôr si vyber alebo vytvor profil práce.',
    send: 'Odoslať',
    stop: 'Zastaviť',
    uploadFile: 'Nahrať súbor',
    attachedFiles: 'Priložené súbory',
    writeMessage: 'Napíš požiadavku...',
    lightMode: 'Svetlý režim',
    darkMode: 'Tmavý režim',
    language: 'Jazyk',
    workLanguage: 'Jazyk práce',
    citationStyle: 'Citačná norma',
    save: 'Uložiť',
    cancel: 'Zrušiť',
    close: 'Zavrieť',
    loading: 'Spracúvam...',
    error: 'Nastala chyba.',
    tryAgain: 'Skúsiť znova',
    publicHeroTitle: 'AI platforma pre akademické a odborné práce',
    publicHeroSubtitle:
      'Vytvárajte odborné texty, kapitoly, zdroje, analýzy a výstupy podľa profilu práce.',
    choosePlan: 'Vybrať balík',
    monthly: 'Mesačne',
    yearly: 'Ročne',
    homepage: {
      navFeatures: 'Funkcie',
      navPricing: 'Cenník',
      navLogin: 'Prihlásenie',
      navStart: 'Začať písať',
      heroBadge: 'AI akademická platforma',
      heroTitle:
        'Píšte akademické a odborné práce rýchlejšie, kvalitnejšie a prehľadnejšie.',
      heroText:
        'Zedpera pomáha s tvorbou textov, zdrojmi, citáciami, kontrolou kvality, obhajobou a plánovaním akademickej práce.',
      heroPrimary: 'Začať novú prácu',
      heroSecondary: 'Pozrieť balíčky',
      featuresTitle: 'Funkcie platformy',
      featureChatTitle: 'AI Chat',
      featureChatText: 'Pomoc pri písaní, úpravách a štruktúrovaní textu.',
      featureSourcesTitle: 'Zdroje a citácie',
      featureSourcesText: 'Vyhľadávanie zdrojov a práca s citáciami.',
      featureSupervisorTitle: 'AI vedúci práce',
      featureSupervisorText:
        'Kontrola logiky, argumentácie, štruktúry a kvality práce.',
      pricingTitle: 'Vyberte si balík',
      footerText: 'Zedpera – AI akademický asistent.',
    },
  },

  cs: {
    appName: 'Zedpera',
    home: 'Domů',
    aiChat: 'AI Chat',
    dashboard: 'Dashboard',
    sources: 'Zdroje',
    pricing: 'Ceník',
    login: 'Přihlášení',
    logout: 'Odhlásit se',
    register: 'Registrace',
    profile: 'Profil',
    createProfile: 'Vytvořit profil',
    selectProfile: 'Vybrat profil',
    activeProfile: 'Aktivní profil',
    noProfile: 'Nejprve si vyberte nebo vytvořte profil práce.',
    send: 'Odeslat',
    stop: 'Zastavit',
    uploadFile: 'Nahrát soubor',
    attachedFiles: 'Přiložené soubory',
    writeMessage: 'Napište požadavek...',
    lightMode: 'Světlý režim',
    darkMode: 'Tmavý režim',
    language: 'Jazyk',
    workLanguage: 'Jazyk práce',
    citationStyle: 'Citační norma',
    save: 'Uložit',
    cancel: 'Zrušit',
    close: 'Zavřít',
    loading: 'Zpracovávám...',
    error: 'Došlo k chybě.',
    tryAgain: 'Zkusit znovu',
    publicHeroTitle: 'AI platforma pro akademické a odborné práce',
    publicHeroSubtitle:
      'Vytvářejte odborné texty, kapitoly, zdroje, analýzy a výstupy podle profilu práce.',
    choosePlan: 'Vybrat balíček',
    monthly: 'Měsíčně',
    yearly: 'Ročně',
    homepage: {
      navFeatures: 'Funkce',
      navPricing: 'Ceník',
      navLogin: 'Přihlášení',
      navStart: 'Začít psát',
      heroBadge: 'AI akademická platforma',
      heroTitle:
        'Pište akademické a odborné práce rychleji, kvalitněji a přehledněji.',
      heroText:
        'Zedpera pomáhá s tvorbou textů, zdroji, citacemi, kontrolou kvality, obhajobou a plánováním akademické práce.',
      heroPrimary: 'Začít novou práci',
      heroSecondary: 'Zobrazit balíčky',
      featuresTitle: 'Funkce platformy',
      featureChatTitle: 'AI Chat',
      featureChatText: 'Pomoc při psaní, úpravách a strukturování textu.',
      featureSourcesTitle: 'Zdroje a citace',
      featureSourcesText: 'Vyhledávání zdrojů a práce s citacemi.',
      featureSupervisorTitle: 'AI vedoucí práce',
      featureSupervisorText:
        'Kontrola logiky, argumentace, struktury a kvality práce.',
      pricingTitle: 'Vyberte si balíček',
      footerText: 'Zedpera – AI akademický asistent.',
    },
  },

  en: {
    appName: 'Zedpera',
    home: 'Home',
    aiChat: 'AI Chat',
    dashboard: 'Dashboard',
    sources: 'Sources',
    pricing: 'Pricing',
    login: 'Login',
    logout: 'Log out',
    register: 'Register',
    profile: 'Profile',
    createProfile: 'Create profile',
    selectProfile: 'Select profile',
    activeProfile: 'Active profile',
    noProfile: 'Please select or create a work profile first.',
    send: 'Send',
    stop: 'Stop',
    uploadFile: 'Upload file',
    attachedFiles: 'Attached files',
    writeMessage: 'Write your request...',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    language: 'Language',
    workLanguage: 'Work language',
    citationStyle: 'Citation style',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    loading: 'Processing...',
    error: 'An error occurred.',
    tryAgain: 'Try again',
    publicHeroTitle: 'AI platform for academic and professional writing',
    publicHeroSubtitle:
      'Create academic text, chapters, sources, analyses and outputs based on your work profile.',
    choosePlan: 'Choose plan',
    monthly: 'Monthly',
    yearly: 'Yearly',
    homepage: {
      navFeatures: 'Features',
      navPricing: 'Pricing',
      navLogin: 'Login',
      navStart: 'Start writing',
      heroBadge: 'AI academic platform',
      heroTitle:
        'Write academic and professional papers faster, better and more clearly.',
      heroText:
        'Zedpera helps with writing, sources, citations, quality review, thesis defense preparation and academic planning.',
      heroPrimary: 'Start new work',
      heroSecondary: 'View pricing',
      featuresTitle: 'Platform features',
      featureChatTitle: 'AI Chat',
      featureChatText: 'Support with writing, editing and structuring text.',
      featureSourcesTitle: 'Sources and citations',
      featureSourcesText: 'Search for sources and work with citations.',
      featureSupervisorTitle: 'AI thesis supervisor',
      featureSupervisorText:
        'Review of logic, argumentation, structure and overall quality.',
      pricingTitle: 'Choose your plan',
      footerText: 'Zedpera – AI academic assistant.',
    },
  },

  de: {
    appName: 'Zedpera',
    home: 'Startseite',
    aiChat: 'AI Chat',
    dashboard: 'Dashboard',
    sources: 'Quellen',
    pricing: 'Preise',
    login: 'Anmelden',
    logout: 'Abmelden',
    register: 'Registrieren',
    profile: 'Profil',
    createProfile: 'Profil erstellen',
    selectProfile: 'Profil auswählen',
    activeProfile: 'Aktives Profil',
    noProfile: 'Bitte wählen oder erstellen Sie zuerst ein Arbeitsprofil.',
    send: 'Senden',
    stop: 'Stopp',
    uploadFile: 'Datei hochladen',
    attachedFiles: 'Angehängte Dateien',
    writeMessage: 'Schreiben Sie Ihre Anfrage...',
    lightMode: 'Heller Modus',
    darkMode: 'Dunkler Modus',
    language: 'Sprache',
    workLanguage: 'Sprache der Arbeit',
    citationStyle: 'Zitierstil',
    save: 'Speichern',
    cancel: 'Abbrechen',
    close: 'Schließen',
    loading: 'Wird verarbeitet...',
    error: 'Ein Fehler ist aufgetreten.',
    tryAgain: 'Erneut versuchen',
    publicHeroTitle: 'AI-Plattform für akademische und professionelle Arbeiten',
    publicHeroSubtitle:
      'Erstellen Sie Fachtexte, Kapitel, Quellen, Analysen und Ausgaben nach Ihrem Arbeitsprofil.',
    choosePlan: 'Paket auswählen',
    monthly: 'Monatlich',
    yearly: 'Jährlich',
    homepage: {
      navFeatures: 'Funktionen',
      navPricing: 'Preise',
      navLogin: 'Anmelden',
      navStart: 'Schreiben starten',
      heroBadge: 'KI-Akademieplattform',
      heroTitle:
        'Schreiben Sie akademische und professionelle Arbeiten schneller, besser und übersichtlicher.',
      heroText:
        'Zedpera hilft beim Schreiben, bei Quellen, Zitaten, Qualitätsprüfung, Verteidigungsvorbereitung und Planung akademischer Arbeiten.',
      heroPrimary: 'Neue Arbeit starten',
      heroSecondary: 'Pakete ansehen',
      featuresTitle: 'Funktionen der Plattform',
      featureChatTitle: 'KI-Chat',
      featureChatText:
        'Unterstützung beim Schreiben, Bearbeiten und Strukturieren von Texten.',
      featureSourcesTitle: 'Quellen und Zitate',
      featureSourcesText: 'Quellensuche und Arbeit mit Zitaten.',
      featureSupervisorTitle: 'KI-Betreuer',
      featureSupervisorText:
        'Prüfung von Logik, Argumentation, Struktur und Qualität.',
      pricingTitle: 'Wählen Sie Ihr Paket',
      footerText: 'Zedpera – KI-akademischer Assistent.',
    },
  },

  pl: {
    appName: 'Zedpera',
    home: 'Strona główna',
    aiChat: 'AI Chat',
    dashboard: 'Panel',
    sources: 'Źródła',
    pricing: 'Cennik',
    login: 'Logowanie',
    logout: 'Wyloguj',
    register: 'Rejestracja',
    profile: 'Profil',
    createProfile: 'Utwórz profil',
    selectProfile: 'Wybierz profil',
    activeProfile: 'Aktywny profil',
    noProfile: 'Najpierw wybierz lub utwórz profil pracy.',
    send: 'Wyślij',
    stop: 'Zatrzymaj',
    uploadFile: 'Prześlij plik',
    attachedFiles: 'Załączone pliki',
    writeMessage: 'Napisz swoje polecenie...',
    lightMode: 'Tryb jasny',
    darkMode: 'Tryb ciemny',
    language: 'Język',
    workLanguage: 'Język pracy',
    citationStyle: 'Styl cytowania',
    save: 'Zapisz',
    cancel: 'Anuluj',
    close: 'Zamknij',
    loading: 'Przetwarzanie...',
    error: 'Wystąpił błąd.',
    tryAgain: 'Spróbuj ponownie',
    publicHeroTitle: 'Platforma AI do prac akademickich i profesjonalnych',
    publicHeroSubtitle:
      'Twórz teksty, rozdziały, źródła, analizy i wyniki według profilu pracy.',
    choosePlan: 'Wybierz pakiet',
    monthly: 'Miesięcznie',
    yearly: 'Rocznie',
    homepage: {
      navFeatures: 'Funkcje',
      navPricing: 'Cennik',
      navLogin: 'Logowanie',
      navStart: 'Zacznij pisać',
      heroBadge: 'Platforma akademicka AI',
      heroTitle:
        'Pisz prace akademickie i profesjonalne szybciej, lepiej i czytelniej.',
      heroText:
        'Zedpera pomaga w pisaniu, źródłach, cytowaniach, kontroli jakości, przygotowaniu do obrony i planowaniu pracy akademickiej.',
      heroPrimary: 'Rozpocznij nową pracę',
      heroSecondary: 'Zobacz pakiety',
      featuresTitle: 'Funkcje platformy',
      featureChatTitle: 'AI Chat',
      featureChatText: 'Pomoc w pisaniu, edycji i strukturyzowaniu tekstu.',
      featureSourcesTitle: 'Źródła i cytowania',
      featureSourcesText: 'Wyszukiwanie źródeł i praca z cytowaniami.',
      featureSupervisorTitle: 'Promotor AI',
      featureSupervisorText:
        'Kontrola logiki, argumentacji, struktury i jakości pracy.',
      pricingTitle: 'Wybierz pakiet',
      footerText: 'Zedpera – akademicki asystent AI.',
    },
  },

  hu: {
    appName: 'Zedpera',
    home: 'Főoldal',
    aiChat: 'AI Chat',
    dashboard: 'Vezérlőpult',
    sources: 'Források',
    pricing: 'Árak',
    login: 'Bejelentkezés',
    logout: 'Kijelentkezés',
    register: 'Regisztráció',
    profile: 'Profil',
    createProfile: 'Profil létrehozása',
    selectProfile: 'Profil kiválasztása',
    activeProfile: 'Aktív profil',
    noProfile: 'Először válasszon vagy hozzon létre egy munkaprofilt.',
    send: 'Küldés',
    stop: 'Leállítás',
    uploadFile: 'Fájl feltöltése',
    attachedFiles: 'Csatolt fájlok',
    writeMessage: 'Írja be a kérését...',
    lightMode: 'Világos mód',
    darkMode: 'Sötét mód',
    language: 'Nyelv',
    workLanguage: 'Munka nyelve',
    citationStyle: 'Hivatkozási stílus',
    save: 'Mentés',
    cancel: 'Mégse',
    close: 'Bezárás',
    loading: 'Feldolgozás...',
    error: 'Hiba történt.',
    tryAgain: 'Próbálja újra',
    publicHeroTitle: 'AI platform tudományos és szakmai munkákhoz',
    publicHeroSubtitle:
      'Készítsen szakmai szövegeket, fejezeteket, forrásokat, elemzéseket és kimeneteket a munkaprofil alapján.',
    choosePlan: 'Csomag kiválasztása',
    monthly: 'Havonta',
    yearly: 'Évente',
    homepage: {
      navFeatures: 'Funkciók',
      navPricing: 'Árak',
      navLogin: 'Bejelentkezés',
      navStart: 'Írás indítása',
      heroBadge: 'AI akadémiai platform',
      heroTitle:
        'Írjon tudományos és szakmai dolgozatokat gyorsabban, jobban és átláthatóbban.',
      heroText:
        'A Zedpera segít a szövegírásban, forrásokban, hivatkozásokban, minőségellenőrzésben, védésre való felkészülésben és tervezésben.',
      heroPrimary: 'Új munka indítása',
      heroSecondary: 'Csomagok megtekintése',
      featuresTitle: 'Platform funkciók',
      featureChatTitle: 'AI Chat',
      featureChatText: 'Segítség az írásban, szerkesztésben és strukturálásban.',
      featureSourcesTitle: 'Források és hivatkozások',
      featureSourcesText: 'Forráskeresés és hivatkozások kezelése.',
      featureSupervisorTitle: 'AI témavezető',
      featureSupervisorText:
        'A logika, érvelés, struktúra és minőség ellenőrzése.',
      pricingTitle: 'Válasszon csomagot',
      footerText: 'Zedpera – AI akadémiai asszisztens.',
    },
  },
} satisfies Record<AppLanguage, TranslationDictionary>;

export type AppTranslations = TranslationDictionary;

export function getTranslations(language: AppLanguage): TranslationDictionary {
  return translations[language] || translations.sk;
}

// Alias pre časti aplikácie, ktoré importujú getTranslation
export const getTranslation = getTranslations;

export function translate(
  language: AppLanguage,
  key: TranslationKey,
  fallback?: string,
): string {
  const dictionary = getTranslations(language);
  const value = dictionary[key];

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  const slovakValue = translations.sk[key];

  if (typeof slovakValue === 'string' && slovakValue.trim()) {
    return slovakValue;
  }

  return fallback || String(key);
}

export function getHomepageTranslations(language: AppLanguage): HomepageTranslations {
  return getTranslations(language).homepage || translations.sk.homepage;
}

export function translateHomepage(
  language: AppLanguage,
  key: HomepageTranslationKey,
  fallback?: string,
): string {
  const dictionary = getHomepageTranslations(language);
  const value = dictionary[key];

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  const slovakValue = translations.sk.homepage[key];

  if (typeof slovakValue === 'string' && slovakValue.trim()) {
    return slovakValue;
  }

  return fallback || String(key);
}