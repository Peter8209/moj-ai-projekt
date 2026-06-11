'use client';

import {
  BarChart3,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  CreditCard,
  GraduationCap,
  History,
  Home,
  Mail,
  Menu,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserCircle,
  Video,
  WandSparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type MobileDashboardTab = 'main' | 'ai' | 'module';

type SupportedVideoLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

type MobileDashboardModuleInfo = {
  key: string;
  translationKey: string;
};

type MobileDashboardNavigationProps = {
  activeModule: string;
  activeModuleLabel: string;
  activeModuleSubtitle?: string;
  activeProfileTitle?: string;
  activeProfileSubtitle?: string;
  activeProfileType?: string;
  moduleInfos: MobileDashboardModuleInfo[];
  t?: any;
  onSelectModule: (moduleKey: string) => void;
  onNavigate?: (path: string) => void;
};

type MobileMenuCopy = {
  mainTitle: string;
  mainDescription: string;
  aiTitle: string;
  aiDescription: string;
  mobileApp: string;
  openedModule: string;
  menu: string;
  aiTools: string;
  module: string;
  panel: string;
  back: string;
  continueToAiTools: string;
  mainMenu: string;
  mainMenuDescription: string;
  basicSections: string;
  selectToolDescription: string;
  noAiTools: string;
  items: {
    menu: string;
    menuDescription: string;
    profile: string;
    profileDescription: string;
    aiChat: string;
    aiChatDescription: string;
    projects: string;
    projectsDescription: string;
    sources: string;
    sourcesDescription: string;
    pricing: string;
    pricingDescription: string;
    history: string;
    historyDescription: string;
    videos: string;
    videosDescription: string;
  };
};

const mobileCopyByLanguage: Record<SupportedVideoLanguage, MobileMenuCopy> = {
  sk: {
    mainTitle: 'Hlavné menu',
    mainDescription: 'Prvá stránka obsahuje iba hlavné menu systému.',
    aiTitle: 'AI nástroje',
    aiDescription: 'Druhá stránka obsahuje iba výber AI nástrojov.',
    mobileApp: 'Mobilná aplikácia',
    openedModule: 'Otvorený modul',
    menu: 'Menu',
    aiTools: 'AI nástroje',
    module: 'Modul',
    panel: 'Panel',
    back: 'Späť',
    continueToAiTools: 'Pokračovať na AI nástroje',
    mainMenu: 'Hlavné menu',
    mainMenuDescription: 'Základné sekcie systému',
    basicSections: 'Základné sekcie systému',
    selectToolDescription:
      'Vyberte nástroj a otvorí sa pracovná stránka modulu.',
    noAiTools: 'AI nástroje nie sú dostupné.',
    items: {
      menu: 'Menu',
      menuDescription: 'Úvodná obrazovka',
      profile: 'Profil',
      profileDescription: 'Účet klienta',
      aiChat: 'AI Chat',
      aiChatDescription: 'Samostatný chat',
      projects: 'Moje práce',
      projectsDescription: 'Zoznam rozpracovaných prác',
      sources: 'Zdroje',
      sourcesDescription: 'Literatúra a citácie',
      pricing: 'Balíčky',
      pricingDescription: 'Predplatné a doplnky',
      history: 'História',
      historyDescription: 'História výstupov',
      videos: 'Video návody',
      videosDescription: 'Video manuály podľa jazyka',
    },
  },
  cs: {
    mainTitle: 'Hlavní menu',
    mainDescription: 'První stránka obsahuje pouze hlavní menu systému.',
    aiTitle: 'AI nástroje',
    aiDescription: 'Druhá stránka obsahuje pouze výběr AI nástrojů.',
    mobileApp: 'Mobilní aplikace',
    openedModule: 'Otevřený modul',
    menu: 'Menu',
    aiTools: 'AI nástroje',
    module: 'Modul',
    panel: 'Panel',
    back: 'Zpět',
    continueToAiTools: 'Pokračovat na AI nástroje',
    mainMenu: 'Hlavní menu',
    mainMenuDescription: 'Základní sekce systému',
    basicSections: 'Základní sekce systému',
    selectToolDescription:
      'Vyberte nástroj a otevře se pracovní stránka modulu.',
    noAiTools: 'AI nástroje nejsou dostupné.',
    items: {
      menu: 'Menu',
      menuDescription: 'Úvodní obrazovka',
      profile: 'Profil',
      profileDescription: 'Účet klienta',
      aiChat: 'AI Chat',
      aiChatDescription: 'Samostatný chat',
      projects: 'Moje práce',
      projectsDescription: 'Seznam rozpracovaných prací',
      sources: 'Zdroje',
      sourcesDescription: 'Literatura a citace',
      pricing: 'Balíčky',
      pricingDescription: 'Předplatné a doplňky',
      history: 'Historie',
      historyDescription: 'Historie výstupů',
      videos: 'Video návody',
      videosDescription: 'Video manuály podle jazyka',
    },
  },
  en: {
    mainTitle: 'Main menu',
    mainDescription: 'The first page contains only the main system menu.',
    aiTitle: 'AI tools',
    aiDescription: 'The second page contains only the AI tool selection.',
    mobileApp: 'Mobile application',
    openedModule: 'Opened module',
    menu: 'Menu',
    aiTools: 'AI tools',
    module: 'Module',
    panel: 'Panel',
    back: 'Back',
    continueToAiTools: 'Continue to AI tools',
    mainMenu: 'Main menu',
    mainMenuDescription: 'Basic system sections',
    basicSections: 'Basic system sections',
    selectToolDescription:
      'Select a tool and the module workspace will open.',
    noAiTools: 'AI tools are not available.',
    items: {
      menu: 'Menu',
      menuDescription: 'Home screen',
      profile: 'Profile',
      profileDescription: 'Client account',
      aiChat: 'AI Chat',
      aiChatDescription: 'Standalone chat',
      projects: 'My works',
      projectsDescription: 'List of works in progress',
      sources: 'Sources',
      sourcesDescription: 'Literature and citations',
      pricing: 'Packages',
      pricingDescription: 'Subscriptions and add-ons',
      history: 'History',
      historyDescription: 'Output history',
      videos: 'Video guides',
      videosDescription: 'Video manuals by language',
    },
  },
  de: {
    mainTitle: 'Hauptmenü',
    mainDescription: 'Die erste Seite enthält nur das Hauptmenü des Systems.',
    aiTitle: 'KI-Werkzeuge',
    aiDescription: 'Die zweite Seite enthält nur die Auswahl der KI-Werkzeuge.',
    mobileApp: 'Mobile Anwendung',
    openedModule: 'Geöffnetes Modul',
    menu: 'Menü',
    aiTools: 'KI-Werkzeuge',
    module: 'Modul',
    panel: 'Panel',
    back: 'Zurück',
    continueToAiTools: 'Weiter zu KI-Werkzeugen',
    mainMenu: 'Hauptmenü',
    mainMenuDescription: 'Grundlegende Systembereiche',
    basicSections: 'Grundlegende Systembereiche',
    selectToolDescription:
      'Wählen Sie ein Werkzeug aus und der Arbeitsbereich des Moduls wird geöffnet.',
    noAiTools: 'KI-Werkzeuge sind nicht verfügbar.',
    items: {
      menu: 'Menü',
      menuDescription: 'Startbildschirm',
      profile: 'Profil',
      profileDescription: 'Kundenkonto',
      aiChat: 'KI-Chat',
      aiChatDescription: 'Eigenständiger Chat',
      projects: 'Meine Arbeiten',
      projectsDescription: 'Liste laufender Arbeiten',
      sources: 'Quellen',
      sourcesDescription: 'Literatur und Zitationen',
      pricing: 'Pakete',
      pricingDescription: 'Abonnements und Add-ons',
      history: 'Verlauf',
      historyDescription: 'Ausgabeverlauf',
      videos: 'Videoanleitungen',
      videosDescription: 'Videomanuale nach Sprache',
    },
  },
  pl: {
    mainTitle: 'Menu główne',
    mainDescription: 'Pierwsza strona zawiera tylko główne menu systemu.',
    aiTitle: 'Narzędzia AI',
    aiDescription: 'Druga strona zawiera tylko wybór narzędzi AI.',
    mobileApp: 'Aplikacja mobilna',
    openedModule: 'Otwarty moduł',
    menu: 'Menu',
    aiTools: 'Narzędzia AI',
    module: 'Moduł',
    panel: 'Panel',
    back: 'Wstecz',
    continueToAiTools: 'Przejdź do narzędzi AI',
    mainMenu: 'Menu główne',
    mainMenuDescription: 'Podstawowe sekcje systemu',
    basicSections: 'Podstawowe sekcje systemu',
    selectToolDescription:
      'Wybierz narzędzie, a otworzy się strona robocza modułu.',
    noAiTools: 'Narzędzia AI nie są dostępne.',
    items: {
      menu: 'Menu',
      menuDescription: 'Ekran główny',
      profile: 'Profil',
      profileDescription: 'Konto klienta',
      aiChat: 'AI Chat',
      aiChatDescription: 'Samodzielny chat',
      projects: 'Moje prace',
      projectsDescription: 'Lista prac w toku',
      sources: 'Źródła',
      sourcesDescription: 'Literatura i cytowania',
      pricing: 'Pakiety',
      pricingDescription: 'Subskrypcje i dodatki',
      history: 'Historia',
      historyDescription: 'Historia wyników',
      videos: 'Instrukcje wideo',
      videosDescription: 'Wideo instrukcje według języka',
    },
  },
  hu: {
    mainTitle: 'Főmenü',
    mainDescription: 'Az első oldal csak a rendszer főmenüjét tartalmazza.',
    aiTitle: 'AI eszközök',
    aiDescription: 'A második oldal csak az AI eszközök kiválasztását tartalmazza.',
    mobileApp: 'Mobilalkalmazás',
    openedModule: 'Megnyitott modul',
    menu: 'Menü',
    aiTools: 'AI eszközök',
    module: 'Modul',
    panel: 'Panel',
    back: 'Vissza',
    continueToAiTools: 'Tovább az AI eszközökhöz',
    mainMenu: 'Főmenü',
    mainMenuDescription: 'Alapvető rendszerszekciók',
    basicSections: 'Alapvető rendszerszekciók',
    selectToolDescription:
      'Válasszon eszközt, és megnyílik a modul munkafelülete.',
    noAiTools: 'Az AI eszközök nem elérhetők.',
    items: {
      menu: 'Menü',
      menuDescription: 'Kezdőképernyő',
      profile: 'Profil',
      profileDescription: 'Ügyfélfiók',
      aiChat: 'AI Chat',
      aiChatDescription: 'Önálló chat',
      projects: 'Munkáim',
      projectsDescription: 'Folyamatban lévő munkák listája',
      sources: 'Források',
      sourcesDescription: 'Irodalom és hivatkozások',
      pricing: 'Csomagok',
      pricingDescription: 'Előfizetések és kiegészítők',
      history: 'Előzmények',
      historyDescription: 'Kimenetek előzményei',
      videos: 'Videó útmutatók',
      videosDescription: 'Videó manuálok nyelv szerint',
    },
  },
};

function normalizeVideoLanguage(value: unknown): SupportedVideoLanguage {
  const normalized = String(value || '').trim().toLowerCase();

  if (
    normalized === 'sk' ||
    normalized === 'slovak' ||
    normalized === 'slovenčina' ||
    normalized === 'slovencina'
  ) {
    return 'sk';
  }

  if (
    normalized === 'cs' ||
    normalized === 'cz' ||
    normalized === 'czech' ||
    normalized === 'čeština' ||
    normalized === 'cestina'
  ) {
    return 'cs';
  }

  if (
    normalized === 'en' ||
    normalized === 'eng' ||
    normalized === 'english' ||
    normalized === 'angličtina' ||
    normalized === 'anglictina'
  ) {
    return 'en';
  }

  if (
    normalized === 'de' ||
    normalized === 'ger' ||
    normalized === 'german' ||
    normalized === 'deutsch' ||
    normalized === 'nemčina' ||
    normalized === 'nemcina'
  ) {
    return 'de';
  }

  if (
    normalized === 'pl' ||
    normalized === 'polish' ||
    normalized === 'polski' ||
    normalized === 'poľština' ||
    normalized === 'polstina'
  ) {
    return 'pl';
  }

  if (
    normalized === 'hu' ||
    normalized === 'hungarian' ||
    normalized === 'magyar' ||
    normalized === 'maďarčina' ||
    normalized === 'madarcina'
  ) {
    return 'hu';
  }

  return 'sk';
}

function getStoredVideoLanguage(): SupportedVideoLanguage {
  if (typeof window === 'undefined') return 'sk';

  const htmlLanguage =
    document.documentElement.getAttribute('data-language') ||
    document.documentElement.getAttribute('data-system-language') ||
    document.documentElement.getAttribute('lang') ||
    '';

  const storedLanguage =
    localStorage.getItem('zedpera_language') ||
    localStorage.getItem('zedpera_system_language') ||
    localStorage.getItem('zedpera_selected_language') ||
    localStorage.getItem('zedpera_interface_language') ||
    localStorage.getItem('zedpera_work_language') ||
    htmlLanguage ||
    'sk';

  return normalizeVideoLanguage(storedLanguage);
}

function persistVideoLanguage(language: SupportedVideoLanguage) {
  if (typeof window === 'undefined') return;

  localStorage.setItem('zedpera_language', language);
  localStorage.setItem('zedpera_system_language', language);
  localStorage.setItem('zedpera_selected_language', language);
  localStorage.setItem('zedpera_interface_language', language);

  document.documentElement.lang = language;
  document.documentElement.setAttribute('data-language', language);
  document.documentElement.setAttribute('data-system-language', language);
}

function createVideoManualsHref(language: SupportedVideoLanguage) {
  return `/videos?lang=${language}`;
}

function createMobileMainMenuItems(
  copy: MobileMenuCopy,
  language: SupportedVideoLanguage,
) {
  return [
    {
      label: copy.items.menu,
      description: copy.items.menuDescription,
      href: '/dashboard',
      icon: Home,
    },
    {
      label: copy.items.profile,
      description: copy.items.profileDescription,
      href: '/profile?tab=account',
      icon: UserCircle,
    },
    {
      label: copy.items.aiChat,
      description: copy.items.aiChatDescription,
      href: '/chat',
      icon: Bot,
    },
    {
      label: copy.items.projects,
      description: copy.items.projectsDescription,
      href: '/projects?view=list',
      icon: BriefcaseBusiness,
    },
    {
      label: copy.items.sources,
      description: copy.items.sourcesDescription,
      href: '/sources',
      icon: BookOpen,
    },
    {
      label: copy.items.pricing,
      description: copy.items.pricingDescription,
      href: '/pricing',
      icon: CreditCard,
    },
    {
      label: copy.items.history,
      description: copy.items.historyDescription,
      href: '/history',
      icon: History,
    },
    {
      label: copy.items.videos,
      description: copy.items.videosDescription,
      href: createVideoManualsHref(language),
      icon: Video,
      isVideoManual: true,
    },
  ];
}

function normalizeModuleLabel(label: string) {
  const value = String(label || '').trim();

  if (!value) return 'AI nástroj';

  return value
    .replace(/AI\s*supervisor/gi, 'AI školiteľ')
    .replace(/AI\s*supervízor/gi, 'AI školiteľ')
    .replace(/AI\s*vedúci/gi, 'AI školiteľ')
    .replace(/AI\s*veduci/gi, 'AI školiteľ')
    .replace(/Preklad/gi, 'Translator')
    .replace(/Translation/gi, 'Translator')
    .replace(/Originalita/gi, 'Kontrola originality');
}

function getModuleIcon(moduleKey: string) {
  switch (moduleKey) {
    case 'supervisor':
      return <GraduationCap className="h-4 w-4" />;

    case 'quality':
      return <ShieldCheck className="h-4 w-4" />;

    case 'defense':
      return <PlayCircle className="h-4 w-4" />;

    case 'translation':
      return <Sparkles className="h-4 w-4" />;

    case 'data':
      return <BarChart3 className="h-4 w-4" />;

    case 'planning':
      return <CalendarDays className="h-4 w-4" />;

    case 'emails':
      return <Mail className="h-4 w-4" />;

    case 'humanizer':
      return <WandSparkles className="h-4 w-4" />;

    case 'originality':
      return <ShieldCheck className="h-4 w-4" />;

    default:
      return <Sparkles className="h-4 w-4" />;
  }
}

function getShortModuleLabel(moduleKey: string, label: string) {
  const normalized = normalizeModuleLabel(label);

  switch (moduleKey) {
    case 'supervisor':
      return 'AI školiteľ';

    case 'quality':
      return 'Audit';

    case 'defense':
      return 'Obhajoba';

    case 'translation':
      return 'Translator';

    case 'data':
      return 'Analýza dát';

    case 'planning':
      return 'Plánovanie';

    case 'emails':
      return 'Emaily';

    case 'humanizer':
      return 'Humanizér';

    case 'originality':
      return 'Originalita';

    default:
      return normalized;
  }
}

function getModuleDescription(moduleKey: string) {
  switch (moduleKey) {
    case 'supervisor':
      return 'Odborné vedenie práce';

    case 'quality':
      return 'Kontrola kvality práce';

    case 'defense':
      return 'Príprava obhajoby';

    case 'translation':
      return 'Odborný preklad textu';

    case 'data':
      return 'Tabuľky, výpočty a grafy';

    case 'planning':
      return 'Plánovanie termínov';

    case 'emails':
      return 'Profesionálne písanie emailov';

    case 'humanizer':
      return 'Prirodzený štýl textu';

    case 'originality':
      return 'Kontrola originality textu';

    default:
      return 'AI nástroj';
  }
}

function scrollToTop() {
  if (typeof window === 'undefined') return;

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}

export default function MobileDashboardNavigation({
  activeModule,
  activeModuleLabel,
  activeModuleSubtitle,
  activeProfileTitle,
  activeProfileSubtitle,
  activeProfileType,
  moduleInfos,
  t,
  onSelectModule,
  onNavigate,
}: MobileDashboardNavigationProps) {
  const [activeTab, setActiveTab] = useState<MobileDashboardTab>('main');
  const [selectedMobileModuleKey, setSelectedMobileModuleKey] =
    useState<string>(activeModule);
  const [videoLanguage, setVideoLanguage] =
    useState<SupportedVideoLanguage>('sk');

  const copy = useMemo(() => {
    return mobileCopyByLanguage[videoLanguage] || mobileCopyByLanguage.sk;
  }, [videoLanguage]);

  const mobileMainMenuItems = useMemo(() => {
    return createMobileMainMenuItems(copy, videoLanguage);
  }, [copy, videoLanguage]);

  const cleanActiveModuleLabel = useMemo(() => {
    if (activeModule === 'translation') {
      return 'Translator';
    }

    if (activeModule === 'planning') {
      return 'Plánovanie termínov';
    }

    if (activeModule === 'emails') {
      return 'Profesionálne písanie emailov';
    }

    return normalizeModuleLabel(activeModuleLabel);
  }, [activeModule, activeModuleLabel]);

  const visibleModules = useMemo(() => {
    if (!Array.isArray(moduleInfos)) {
      return [];
    }

    return moduleInfos.filter((item) => item.key !== 'originality');
  }, [moduleInfos]);

  const selectedMobileModule = useMemo(() => {
    return (
      visibleModules.find((item) => item.key === selectedMobileModuleKey) ||
      visibleModules.find((item) => item.key === activeModule) ||
      visibleModules[0]
    );
  }, [activeModule, selectedMobileModuleKey, visibleModules]);

  const selectedMobileModuleRawLabel = selectedMobileModule
    ? t?.dashboardTools?.tools?.[selectedMobileModule.translationKey] ||
      selectedMobileModule.translationKey
    : cleanActiveModuleLabel;

  const selectedMobileModuleLabel = selectedMobileModule
    ? getShortModuleLabel(selectedMobileModule.key, selectedMobileModuleRawLabel)
    : cleanActiveModuleLabel;

  const selectedMobileModuleDescription = selectedMobileModule
    ? getModuleDescription(selectedMobileModule.key)
    : activeModuleSubtitle || 'AI nástroj';

  useEffect(() => {
    setVideoLanguage(getStoredVideoLanguage());

    function syncLanguageFromStorage() {
      setVideoLanguage(getStoredVideoLanguage());
    }

    window.addEventListener('storage', syncLanguageFromStorage);
    window.addEventListener('zedpera-language-change', syncLanguageFromStorage);

    const interval = window.setInterval(syncLanguageFromStorage, 700);

    return () => {
      window.removeEventListener('storage', syncLanguageFromStorage);
      window.removeEventListener(
        'zedpera-language-change',
        syncLanguageFromStorage,
      );
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (activeModule) {
      setSelectedMobileModuleKey(activeModule);
    }
  }, [activeModule]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.setAttribute(
      'data-zedpera-mobile-dashboard-tab',
      activeTab,
    );

    document.body.setAttribute(
      'data-zedpera-mobile-dashboard-tab',
      activeTab,
    );

    if (activeModule) {
      document.documentElement.setAttribute(
        'data-zedpera-active-module',
        activeModule,
      );

      document.body.setAttribute('data-zedpera-active-module', activeModule);
    }

    return () => {
      document.documentElement.removeAttribute(
        'data-zedpera-mobile-dashboard-tab',
      );

      document.body.removeAttribute('data-zedpera-mobile-dashboard-tab');
      document.documentElement.removeAttribute('data-zedpera-active-module');
      document.body.removeAttribute('data-zedpera-active-module');
    };
  }, [activeTab, activeModule]);

  function scrollToDashboardToolPanel() {
    window.setTimeout(() => {
      const dashboardPanel =
        document.getElementById('dashboard-tool-panel') ||
        document.querySelector('[data-dashboard-tool-panel="true"]');

      dashboardPanel?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 140);
  }

  function openMainPage() {
    setActiveTab('main');
    scrollToTop();
  }

  function openAiPage() {
    setActiveTab('ai');
    scrollToTop();
  }

  function openModulePage() {
    setActiveTab('module');
    scrollToDashboardToolPanel();
  }

  function handleSelectModule(moduleKey: string) {
    setSelectedMobileModuleKey(moduleKey);
    setActiveTab('module');
    onSelectModule(moduleKey);

    window.setTimeout(() => {
      scrollToDashboardToolPanel();
    }, 200);
  }

  function handleNavigate(path: string) {
    if (typeof window !== 'undefined' && path.startsWith('/projects')) {
      localStorage.removeItem('zedpera_new_project_mode');
      localStorage.removeItem('zedpera_open_identity');
      localStorage.removeItem('zedpera_open_project_identity');
      localStorage.removeItem('zedpera_continue_project_identity');
      localStorage.removeItem('zedpera_last_project_identity');
      localStorage.removeItem('zedpera_selected_project_identity');
    }

    let nextPath = path;

    if (typeof window !== 'undefined' && path.startsWith('/videos')) {
      const currentLanguage = getStoredVideoLanguage();

      persistVideoLanguage(currentLanguage);

      nextPath = createVideoManualsHref(currentLanguage);
    }

    if (onNavigate) {
      onNavigate(nextPath);
      return;
    }

    window.location.href = nextPath;
  }

  return (
    <>
      <style jsx global>{`
        @media (max-width: 1279px) {
          html,
          body {
            min-height: 100%;
            width: 100%;
            overflow-x: hidden !important;
            background: #020617 !important;
          }

          html[data-zedpera-mobile-dashboard-tab='main'],
          body[data-zedpera-mobile-dashboard-tab='main'],
          html[data-zedpera-mobile-dashboard-tab='ai'],
          body[data-zedpera-mobile-dashboard-tab='ai'],
          html[data-zedpera-mobile-dashboard-tab='module'],
          body[data-zedpera-mobile-dashboard-tab='module'] {
            background: #020617 !important;
          }

          html[data-zedpera-mobile-dashboard-tab='main']
            #dashboard-tool-panel,
          html[data-zedpera-mobile-dashboard-tab='main']
            [data-dashboard-tool-panel='true'],
          html[data-zedpera-mobile-dashboard-tab='main']
            [data-mobile-dashboard-hidden-on-menu='true'],
          html[data-zedpera-mobile-dashboard-tab='ai'] #dashboard-tool-panel,
          html[data-zedpera-mobile-dashboard-tab='ai']
            [data-dashboard-tool-panel='true'],
          html[data-zedpera-mobile-dashboard-tab='ai']
            [data-mobile-dashboard-hidden-on-menu='true'] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            #dashboard-tool-panel,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-dashboard-tool-panel='true'] {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            [data-mobile-dashboard-hidden-on-menu='true'] {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            #dashboard-tool-panel
            *,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-dashboard-tool-panel='true']
            * {
            box-sizing: border-box !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            [data-zedpera-active-module='data']
            #dashboard-tool-panel,
          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel,
          body[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel {
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
          }

          /*
            ANALÝZA DÁT - hlavný mobilný fix:
            - výsledky sa nesmú odrezať,
            - stránka roluje zvislo,
            - tabuľky a grafy majú samostatné vodorovné rolovanie,
            - karty sa na mobile skladajú pod seba.
          */

          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            section,
          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            article,
          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            div {
            min-width: 0 !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            [class*='max-h-'],
          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            [class*='h-['],
          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            [class*='overflow-hidden'] {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            [class*='grid-cols-2'],
          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            [class*='grid-cols-3'],
          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            [class*='grid-cols-4'],
          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            [class*='grid-cols-5'],
          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            [class*='lg:grid-cols-'],
          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            [class*='xl:grid-cols-'] {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            .recharts-wrapper,
          html[data-zedpera-mobile-dashboard-tab='module'][data-zedpera-active-module='data']
            #dashboard-tool-panel
            .recharts-surface {
            width: 100% !important;
            max-width: 100% !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-results='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-result='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-panel='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-content='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            .analysis-results,
          html[data-zedpera-mobile-dashboard-tab='module']
            .analysis-result,
          html[data-zedpera-mobile-dashboard-tab='module']
            .analysis-panel {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            -webkit-overflow-scrolling: touch !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-results='true'] *,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-result='true'] *,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-panel='true'] *,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-content='true'] * {
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-table='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-table-wrapper='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            .analysis-table,
          html[data-zedpera-mobile-dashboard-tab='module']
            .analysis-table-wrapper,
          html[data-zedpera-mobile-dashboard-tab='module']
            .overflow-x-auto {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            overflow-y: visible !important;
            -webkit-overflow-scrolling: touch !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-results='true']
            table,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-result='true']
            table,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-panel='true']
            table,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-content='true']
            table,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-table='true']
            table,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-table-wrapper='true']
            table {
            display: table !important;
            width: max-content !important;
            min-width: 100% !important;
            max-width: none !important;
            border-collapse: collapse !important;
          }

          /*
            MODAL VÝSLEDKOV ANALÝZY:
            V mobile musí ísť rolovať celé okno.
          */

          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-modal='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [role='dialog'][data-analysis-modal='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [aria-modal='true'][data-analysis-modal='true'] {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            max-width: 100vw !important;
            height: auto !important;
            max-height: 100dvh !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch !important;
            overscroll-behavior: contain !important;
            touch-action: pan-y !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            [role='dialog'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [aria-modal='true'] {
            max-height: 100dvh !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch !important;
            overscroll-behavior: contain !important;
            touch-action: pan-y !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            [role='dialog']
            > *,
          html[data-zedpera-mobile-dashboard-tab='module']
            [aria-modal='true']
            > * {
            max-width: calc(100vw - 16px) !important;
            max-height: calc(100dvh - 16px) !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch !important;
          }

          /*
            Zvýraznenie bieleho tlačidla v module Analýza dát.
            Toto rieši biele nevýrazné tlačidlo z obrázka.
          */

          html[data-zedpera-mobile-dashboard-tab='module']
            button[class*='bg-white'],
          html[data-zedpera-mobile-dashboard-tab='module']
            a[class*='bg-white'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-export-button='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-export-button='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-open-analysis-results='true'] {
            color: #ffffff !important;
            border: 1px solid rgba(216, 180, 254, 0.95) !important;
            background: linear-gradient(
              135deg,
              #7c3aed 0%,
              #9333ea 45%,
              #db2777 100%
            ) !important;
            box-shadow:
              0 16px 40px rgba(124, 58, 237, 0.45),
              inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
            font-weight: 900 !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            button[class*='bg-white']:hover,
          html[data-zedpera-mobile-dashboard-tab='module']
            a[class*='bg-white']:hover,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-export-button='true']:hover,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-export-button='true']:hover,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-open-analysis-results='true']:hover {
            background: linear-gradient(
              135deg,
              #8b5cf6 0%,
              #a855f7 45%,
              #ec4899 100%
            ) !important;
            transform: translateY(-1px);
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            button,
          html[data-zedpera-mobile-dashboard-tab='module']
            a {
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>

      <section className="relative z-[70] -mx-4 border-b border-white/10 bg-[#020617]/98 px-4 pb-4 pt-4 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl xl:hidden">
        {activeTab === 'module' ? (
          <div className="rounded-3xl border border-violet-400/20 bg-[#070b18] p-3 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-950/40">
                  {selectedMobileModule ? (
                    getModuleIcon(selectedMobileModule.key)
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                </span>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
                    {copy.openedModule}
                  </p>

                  <h3 className="line-clamp-1 text-base font-black text-white">
                    {selectedMobileModuleLabel}
                  </h3>

                  <p className="line-clamp-1 text-[11px] font-semibold text-slate-400">
                    {selectedMobileModuleDescription}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openAiPage}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white active:scale-95"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {copy.aiTools}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={openMainPage}
                className="flex min-h-[46px] items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[10px] font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white active:scale-[0.98]"
              >
                <Menu className="h-3.5 w-3.5" />
                {copy.menu}
              </button>

              <button
                type="button"
                onClick={openAiPage}
                className="flex min-h-[46px] items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[10px] font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white active:scale-[0.98]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {copy.aiTools}
              </button>

              <button
                type="button"
                onClick={scrollToDashboardToolPanel}
                className="flex min-h-[46px] items-center justify-center gap-1 rounded-2xl bg-violet-600 px-2 py-2 text-[10px] font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.98]"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                {copy.panel}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[calc(100dvh-2rem)] flex-col">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
                {copy.mobileApp}
              </p>

              <h2 className="mt-1 line-clamp-1 text-xl font-black leading-tight text-white">
                {activeTab === 'main' ? copy.mainTitle : copy.aiTitle}
              </h2>

              <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">
                {activeTab === 'main'
                  ? copy.mainDescription
                  : copy.aiDescription}
              </p>
            </div>

            {activeProfileTitle ||
            activeProfileSubtitle ||
            activeProfileType ? (
              <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                <p className="line-clamp-1 text-[11px] font-black text-white">
                  {activeProfileTitle || 'Profil práce'}
                </p>

                {activeProfileSubtitle ? (
                  <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-slate-400">
                    {activeProfileSubtitle}
                  </p>
                ) : null}

                {activeProfileType ? (
                  <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-violet-300">
                    {activeProfileType}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mb-4 grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-[#070b18] p-2 shadow-2xl shadow-black/40">
              <button
                type="button"
                onClick={openMainPage}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black transition active:scale-[0.98] ${
                  activeTab === 'main'
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                    : 'border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                }`}
                aria-pressed={activeTab === 'main'}
              >
                <Menu className="h-4 w-4" />
                {copy.menu}
              </button>

              <button
                type="button"
                onClick={openAiPage}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black transition active:scale-[0.98] ${
                  activeTab === 'ai'
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                    : 'border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                }`}
                aria-pressed={activeTab === 'ai'}
              >
                <Sparkles className="h-4 w-4" />
                {copy.aiTools}
              </button>

              <button
                type="button"
                onClick={openModulePage}
                className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[10px] font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white active:scale-[0.98]"
              >
                {selectedMobileModule ? (
                  getModuleIcon(selectedMobileModule.key)
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                {copy.module}
              </button>
            </div>

            {activeTab === 'main' ? (
              <div className="flex-1 rounded-3xl border border-white/10 bg-[#070b18] p-3 shadow-2xl shadow-black/40">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600/20 text-violet-200">
                    <Menu className="h-4 w-4" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                      {copy.mainMenu}
                    </p>

                    <p className="line-clamp-1 text-[11px] font-semibold text-slate-500">
                      {copy.basicSections}
                    </p>
                  </div>
                </div>

                <div className="max-h-[calc(100dvh-260px)] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="grid grid-cols-2 gap-2">
                    {mobileMainMenuItems.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={`${item.href}-${item.label}`}
                          type="button"
                          onClick={() => handleNavigate(item.href)}
                          className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-white transition hover:border-violet-300/40 hover:bg-violet-600/20 active:scale-[0.98]"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/30 text-violet-200">
                            <Icon className="h-4 w-4" />
                          </span>

                          <span className="min-w-0">
                            <span className="block truncate text-xs font-black">
                              {item.label}
                            </span>

                            <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-500">
                              {item.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openAiPage}
                  className="mt-3 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" />
                  {copy.continueToAiTools}
                </button>
              </div>
            ) : null}

            {activeTab === 'ai' ? (
              <div className="flex-1 rounded-3xl border border-white/10 bg-[#070b18] p-3 shadow-2xl shadow-black/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200">
                      <Sparkles className="h-4 w-4" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                        {copy.aiTools}
                      </p>

                      <p className="line-clamp-1 text-[11px] font-semibold text-slate-500">
                        {copy.selectToolDescription}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openMainPage}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white active:scale-95"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {copy.back}
                  </button>
                </div>

                {visibleModules.length > 0 ? (
                  <div className="max-h-[calc(100dvh-260px)] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="grid grid-cols-2 gap-2">
                      {visibleModules.map((item) => {
                        const active = activeModule === item.key;

                        const rawLabel =
                          t?.dashboardTools?.tools?.[item.translationKey] ||
                          item.translationKey;

                        const label = getShortModuleLabel(item.key, rawLabel);

                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleSelectModule(item.key)}
                            className={`flex min-h-[68px] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition active:scale-[0.98] ${
                              active
                                ? 'border-violet-300 bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                                : 'border-white/10 bg-white/[0.06] text-white hover:border-violet-300/40 hover:bg-violet-600/20'
                            }`}
                            title={getModuleDescription(item.key)}
                            aria-pressed={active}
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                active
                                  ? 'bg-white/20 text-white'
                                  : 'bg-black/30 text-violet-200'
                              }`}
                            >
                              {getModuleIcon(item.key)}
                            </span>

                            <span className="min-w-0">
                              <span className="block truncate text-xs font-black">
                                {label}
                              </span>

                              <span
                                className={`mt-0.5 block truncate text-[10px] font-semibold ${
                                  active ? 'text-violet-100' : 'text-slate-500'
                                }`}
                              >
                                {getModuleDescription(item.key)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                    <p className="text-xs font-bold text-slate-400">
                      {copy.noAiTools}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}