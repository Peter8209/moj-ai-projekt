'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Home,
  Menu,
  PlayCircle,
  Search,
  Sparkles,
  Video,
} from 'lucide-react';

import { useLanguage } from '@/components/LanguageProvider';
import {
  getLocalizedVisibleVideoManuals,
  type LocalizedVideoManual,
} from '@/lib/videoManuals';

type PageLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

type PageCopy = {
  menu: string;
  backToMenu: string;
  headerSmall: string;
  badge: string;
  title: string;
  description: string;
  nowPlaying: string;
  listTitle: string;
  listDescription: string;
  searchPlaceholder: string;
  noResults: string;
  recommendedTitle: string;
  recommendedDescription: string;
  startFromBeginning: string;
  scenarioTitle: string;
  guideText: string;
  step: string;
  videoNotFound: string;
  videoNotFoundDescription: string;
  browserUnsupported: string;
  presentationMode: string;
  allCategories: string;
  categoryLabel: string;
  languageLabel: string;
  videoSourceLabel: string;
  subtitlesLabel: string;
  openVideo: string;
  closeVideo: string;
  openInWindow: string;
};

const PRESENTATION_VIDEO_ROOT = '/video-manualy';

const pageCopy: Record<PageLanguage, PageCopy> = {
  sk: {
    menu: 'Menu',
    backToMenu: 'Späť do menu',
    headerSmall: 'Profesionálne manuály Zedpera',
    badge: 'Tiché prezentačné video manuály',
    title: 'Video návody Zedpera',
    description:
      'Manuály sú napojené na novo vygenerované prezentačné videá. Každé video sa načíta z jazykového priečinka podľa aktuálne nastaveného jazyka stránky.',
    nowPlaying: 'Práve prehrávate',
    listTitle: 'Zoznam návodov',
    listDescription:
      'Kliknite na manuál. Spustí sa moderná tichá prezentácia vo vybranom jazyku.',
    searchPlaceholder: 'Hľadať video návod...',
    noResults: 'Nenašiel sa žiadny video návod.',
    recommendedTitle: 'Odporúčaný postup pre nového používateľa',
    recommendedDescription:
      'Najskôr si pozrite hlavné menu, profil používateľa, novú prácu, AI Chat, AI školiteľa a obhajobu.',
    startFromBeginning: 'Spustiť od začiatku',
    scenarioTitle: 'Scenár a postup manuálu',
    guideText: 'Text sprievodcu',
    step: 'Krok',
    videoNotFound: 'Video súbor sa nenašiel',
    videoNotFoundDescription:
      'Skontrolujte, či je MP4 uložené v správnom priečinku public/video-manualy a či názov súboru presne zodpovedá odkazu:',
    browserUnsupported: 'Váš prehliadač nepodporuje prehrávanie videa.',
    presentationMode: 'Prezentačný režim bez hovoreného slova',
    allCategories: 'Všetko',
    categoryLabel: 'Kategória',
    languageLabel: 'Jazyk videa',
    videoSourceLabel: 'Zdroj videa',
    subtitlesLabel: 'Titulky',
    openVideo: 'Otvoriť video',
    closeVideo: 'Zavrieť video',
    openInWindow: 'Spustiť v samostatnom okne',
  },
  cs: {
    menu: 'Menu',
    backToMenu: 'Zpět do menu',
    headerSmall: 'Profesionální manuály Zedpera',
    badge: 'Tiché prezentační video návody',
    title: 'Video návody Zedpera',
    description:
      'Návody jsou napojené na nově vygenerovaná prezentační videa. Každé video se načte z jazykové složky podle aktuálně nastaveného jazyka stránky.',
    nowPlaying: 'Právě přehráváte',
    listTitle: 'Seznam návodů',
    listDescription:
      'Klikněte na návod. Spustí se moderní tichá prezentace ve vybraném jazyce.',
    searchPlaceholder: 'Hledat video návod...',
    noResults: 'Nebyl nalezen žádný video návod.',
    recommendedTitle: 'Doporučený postup pro nového uživatele',
    recommendedDescription:
      'Nejprve si prohlédněte hlavní menu, profil uživatele, novou práci, AI Chat, AI školitele a obhajobu.',
    startFromBeginning: 'Spustit od začátku',
    scenarioTitle: 'Scénář a postup návodu',
    guideText: 'Text průvodce',
    step: 'Krok',
    videoNotFound: 'Video soubor nebyl nalezen',
    videoNotFoundDescription:
      'Zkontrolujte, zda je MP4 uložené ve správné složce public/video-manualy a zda název souboru přesně odpovídá odkazu:',
    browserUnsupported: 'Váš prohlížeč nepodporuje přehrávání videa.',
    presentationMode: 'Prezentační režim bez mluveného slova',
    allCategories: 'Vše',
    categoryLabel: 'Kategorie',
    languageLabel: 'Jazyk videa',
    videoSourceLabel: 'Zdroj videa',
    subtitlesLabel: 'Titulky',
    openVideo: 'Otevřít video',
    closeVideo: 'Zavřít video',
    openInWindow: 'Spustit v samostatném okně',
  },
  en: {
    menu: 'Menu',
    backToMenu: 'Back to menu',
    headerSmall: 'Professional Zedpera manuals',
    badge: 'Silent presentation video guides',
    title: 'Zedpera Video Guides',
    description:
      'The manuals are connected to the newly generated presentation videos. Each video is loaded from the language folder that matches the current page language.',
    nowPlaying: 'Now playing',
    listTitle: 'Guide list',
    listDescription:
      'Click a guide. A modern silent presentation will start in the selected language.',
    searchPlaceholder: 'Search video guide...',
    noResults: 'No video guide found.',
    recommendedTitle: 'Recommended path for a new user',
    recommendedDescription:
      'Start with Main Menu, User Profile, New Work, AI Chat, AI Supervisor, and Defense.',
    startFromBeginning: 'Start from the beginning',
    scenarioTitle: 'Manual scenario and steps',
    guideText: 'Guide text',
    step: 'Step',
    videoNotFound: 'Video file was not found',
    videoNotFoundDescription:
      'Check whether the MP4 file is stored in the correct public/video-manualy folder and whether the filename exactly matches this link:',
    browserUnsupported: 'Your browser does not support video playback.',
    presentationMode: 'Silent presentation mode',
    allCategories: 'All',
    categoryLabel: 'Category',
    languageLabel: 'Video language',
    videoSourceLabel: 'Video source',
    subtitlesLabel: 'Subtitles',
    openVideo: 'Open video',
    closeVideo: 'Close video',
    openInWindow: 'Open in separate window',
  },
  de: {
    menu: 'Menü',
    backToMenu: 'Zurück zum Menü',
    headerSmall: 'Professionelle Zedpera-Anleitungen',
    badge: 'Stille Präsentations-Videoanleitungen',
    title: 'Zedpera Videoanleitungen',
    description:
      'Die Anleitungen sind mit den neu generierten Präsentationsvideos verbunden. Jedes Video wird aus dem Sprachordner geladen, der zur aktuellen Seitensprache passt.',
    nowPlaying: 'Wird gerade abgespielt',
    listTitle: 'Liste der Anleitungen',
    listDescription:
      'Klicken Sie auf eine Anleitung. Eine moderne stille Präsentation startet in der gewählten Sprache.',
    searchPlaceholder: 'Videoanleitung suchen...',
    noResults: 'Keine Videoanleitung gefunden.',
    recommendedTitle: 'Empfohlener Ablauf für neue Benutzer',
    recommendedDescription:
      'Beginnen Sie mit Hauptmenü, Benutzerprofil, Neue Arbeit, AI Chat, KI-Betreuer und Verteidigung.',
    startFromBeginning: 'Von Anfang an starten',
    scenarioTitle: 'Szenario und Schritte der Anleitung',
    guideText: 'Begleittext',
    step: 'Schritt',
    videoNotFound: 'Videodatei wurde nicht gefunden',
    videoNotFoundDescription:
      'Prüfen Sie, ob die MP4-Datei im richtigen Ordner public/video-manualy gespeichert ist und der Dateiname exakt diesem Link entspricht:',
    browserUnsupported: 'Ihr Browser unterstützt die Videowiedergabe nicht.',
    presentationMode: 'Stiller Präsentationsmodus',
    allCategories: 'Alles',
    categoryLabel: 'Kategorie',
    languageLabel: 'Videosprache',
    videoSourceLabel: 'Videoquelle',
    subtitlesLabel: 'Untertitel',
    openVideo: 'Video öffnen',
    closeVideo: 'Video schließen',
    openInWindow: 'In separatem Fenster starten',
  },
  pl: {
    menu: 'Menu',
    backToMenu: 'Powrót do menu',
    headerSmall: 'Profesjonalne instrukcje Zedpera',
    badge: 'Ciche prezentacyjne instrukcje wideo',
    title: 'Instrukcje wideo Zedpera',
    description:
      'Instrukcje są połączone z nowo wygenerowanymi filmami prezentacyjnymi. Każde wideo ładuje się z folderu językowego zgodnego z aktualnym językiem strony.',
    nowPlaying: 'Teraz odtwarzane',
    listTitle: 'Lista instrukcji',
    listDescription:
      'Kliknij instrukcję. Uruchomi się nowoczesna cicha prezentacja w wybranym języku.',
    searchPlaceholder: 'Szukaj instrukcji wideo...',
    noResults: 'Nie znaleziono żadnej instrukcji wideo.',
    recommendedTitle: 'Zalecana ścieżka dla nowego użytkownika',
    recommendedDescription:
      'Najpierw obejrzyj menu główne, profil użytkownika, nową pracę, AI Chat, opiekuna AI i obronę.',
    startFromBeginning: 'Uruchom od początku',
    scenarioTitle: 'Scenariusz i kroki instrukcji',
    guideText: 'Tekst przewodnika',
    step: 'Krok',
    videoNotFound: 'Nie znaleziono pliku wideo',
    videoNotFoundDescription:
      'Sprawdź, czy plik MP4 znajduje się we właściwym folderze public/video-manualy i czy nazwa pliku dokładnie odpowiada temu linkowi:',
    browserUnsupported: 'Twoja przeglądarka nie obsługuje odtwarzania wideo.',
    presentationMode: 'Tryb cichej prezentacji',
    allCategories: 'Wszystko',
    categoryLabel: 'Kategoria',
    languageLabel: 'Język wideo',
    videoSourceLabel: 'Źródło wideo',
    subtitlesLabel: 'Napisy',
    openVideo: 'Otwórz wideo',
    closeVideo: 'Zamknij wideo',
    openInWindow: 'Uruchom w osobnym oknie',
  },
  hu: {
    menu: 'Menü',
    backToMenu: 'Vissza a menübe',
    headerSmall: 'Professzionális Zedpera útmutatók',
    badge: 'Csendes prezentációs videó útmutatók',
    title: 'Zedpera videó útmutatók',
    description:
      'Az útmutatók az újonnan generált prezentációs videókhoz kapcsolódnak. Minden videó az aktuális oldalnyelvnek megfelelő nyelvi mappából töltődik be.',
    nowPlaying: 'Most lejátszás alatt',
    listTitle: 'Útmutatók listája',
    listDescription:
      'Kattintson egy útmutatóra. Elindul egy modern, csendes prezentáció a kiválasztott nyelven.',
    searchPlaceholder: 'Videó útmutató keresése...',
    noResults: 'Nem található videó útmutató.',
    recommendedTitle: 'Ajánlott folyamat új felhasználónak',
    recommendedDescription:
      'Először nézze meg a főmenüt, felhasználói profilt, új munkát, AI Chatet, AI témavezetőt és védést.',
    startFromBeginning: 'Indítás az elejétől',
    scenarioTitle: 'Útmutató forgatókönyve és lépései',
    guideText: 'Kísérőszöveg',
    step: 'Lépés',
    videoNotFound: 'A videófájl nem található',
    videoNotFoundDescription:
      'Ellenőrizze, hogy az MP4 fájl a megfelelő public/video-manualy mappában van-e, és a fájlnév pontosan megegyezik-e ezzel a hivatkozással:',
    browserUnsupported: 'A böngésző nem támogatja a videó lejátszását.',
    presentationMode: 'Csendes prezentációs mód',
    allCategories: 'Összes',
    categoryLabel: 'Kategória',
    languageLabel: 'Videó nyelve',
    videoSourceLabel: 'Videó forrása',
    subtitlesLabel: 'Feliratok',
    openVideo: 'Videó megnyitása',
    closeVideo: 'Videó bezárása',
    openInWindow: 'Megnyitás külön ablakban',
  },
};

const supportedPageLanguages: PageLanguage[] = [
  'sk',
  'cs',
  'en',
  'de',
  'pl',
  'hu',
];

const VIDEO_LANGUAGE_STORAGE_KEYS = [
  'zedpera_language',
  'zedpera_system_language',
  'zedpera_interface_language',
  'zedpera_work_language',
  'language',
];

type VideoSourceCandidate = {
  src: string;
  label: string;
};

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeVideoLanguage(value: unknown): PageLanguage | null {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace('_', '-')
    .split('-')[0];

  if (!normalized) return null;
  if (normalized === 'cz' || normalized === 'cze' || normalized === 'czech') return 'cs';
  if (normalized === 'slovak') return 'sk';
  if (normalized === 'english') return 'en';
  if (normalized === 'german') return 'de';
  if (normalized === 'polish') return 'pl';
  if (normalized === 'hungarian') return 'hu';

  return supportedPageLanguages.includes(normalized as PageLanguage)
    ? (normalized as PageLanguage)
    : null;
}

function getStoredVideoLanguage(): PageLanguage {
  if (typeof window === 'undefined') return 'sk';

  for (const key of VIDEO_LANGUAGE_STORAGE_KEYS) {
    const storedLanguage = normalizeVideoLanguage(window.localStorage.getItem(key));
    if (storedLanguage) return storedLanguage;
  }

  const html = document.documentElement;

  return (
    normalizeVideoLanguage(html.lang) ||
    normalizeVideoLanguage(html.getAttribute('data-language')) ||
    normalizeVideoLanguage(html.getAttribute('data-system-language')) ||
    normalizeVideoLanguage(html.getAttribute('data-work-language')) ||
    'sk'
  );
}

function getVideoFileNameFromUrl(value: string | undefined): string {
  if (!value) return '';

  const cleanValue = value.split('?')[0].replace(/\\/g, '/');

  return cleanValue.split('/').filter(Boolean).pop() || '';
}

function getVideoBaseName(value: string | undefined, fallback: string): string {
  const fileName = getVideoFileNameFromUrl(value);
  const baseName = fileName.replace(/\.(mp4|webm|mov|m4v)$/i, '');

  return baseName || fallback;
}

function forcePresentationVideoLanguagePath(
  value: string | undefined,
  language: PageLanguage,
  slug: string,
): string {
  const fileName = getVideoFileNameFromUrl(value) || `${slug}.mp4`;
  const baseName = fileName.replace(/\.(mp4|webm|mov|m4v)$/i, '') || slug;

  return `${PRESENTATION_VIDEO_ROOT}/${language}/${baseName}.mp4`;
}

function normalizeVideoManualForLanguage(
  video: LocalizedVideoManual,
  language: PageLanguage,
): LocalizedVideoManual {
  return {
    ...video,
    videoUrl: forcePresentationVideoLanguagePath(video.videoUrl, language, video.slug),

    // DÔLEŽITÁ OPRAVA:
    // thumbnail nesmie byť undefined, pretože typ LocalizedVideoManual ho má ako string.
    // Ak thumbnail neexistuje, nastaví sa prázdny string.
    thumbnail: video.thumbnail ?? '',
  };
}

function getSubtitleUrl(videoUrl: string): string {
  if (!videoUrl) return '';

  return videoUrl.replace(/\.mp4($|\?)/i, '.vtt$1');
}

function getAlternativeLanguageCodes(language: PageLanguage): PageLanguage[] {
  if (language === 'cs') return ['cs', 'sk', 'en'];
  if (language === 'sk') return ['sk', 'cs', 'en'];

  return uniqueValues<PageLanguage>([language, 'en', 'sk']);
}

function buildVideoSourceCandidates(
  video: LocalizedVideoManual,
  language: PageLanguage,
): VideoSourceCandidate[] {
  const baseName = getVideoBaseName(video.videoUrl, video.slug);
  const languageCodes = getAlternativeLanguageCodes(language);

  const rawSources: VideoSourceCandidate[] = [
    {
      src: `${PRESENTATION_VIDEO_ROOT}/${language}/${video.slug}.mp4`,
      label: `${language.toUpperCase()} – prezentácia podľa slug`,
    },
    {
      src: `${PRESENTATION_VIDEO_ROOT}/${language}/${baseName}.mp4`,
      label: `${language.toUpperCase()} – prezentácia podľa názvu súboru`,
    },
  ];

  languageCodes
    .filter((item) => item !== language)
    .forEach((fallbackLanguage) => {
      rawSources.push(
        {
          src: `${PRESENTATION_VIDEO_ROOT}/${fallbackLanguage}/${video.slug}.mp4`,
          label: `${fallbackLanguage.toUpperCase()} – záložná prezentácia`,
        },
        {
          src: `${PRESENTATION_VIDEO_ROOT}/${fallbackLanguage}/${baseName}.mp4`,
          label: `${fallbackLanguage.toUpperCase()} – záložný názov súboru`,
        },
      );
    });

  const seen = new Set<string>();

  return rawSources
    .map((source) => ({
      ...source,
      src: source.src.replace(/\/{2,}/g, '/'),
    }))
    .filter((source) => {
      if (!source.src) return false;

      const key = source.src.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);

      return true;
    });
}

export default function VideoNavodPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const [storedVideoLanguage, setStoredVideoLanguage] = useState<PageLanguage>(() =>
    getStoredVideoLanguage(),
  );

  useEffect(() => {
    function syncVideoLanguageFromStorage() {
      setStoredVideoLanguage(getStoredVideoLanguage());
    }

    syncVideoLanguageFromStorage();

    window.addEventListener('storage', syncVideoLanguageFromStorage);
    window.addEventListener('focus', syncVideoLanguageFromStorage);

    return () => {
      window.removeEventListener('storage', syncVideoLanguageFromStorage);
      window.removeEventListener('focus', syncVideoLanguageFromStorage);
    };
  }, []);

  const pageLanguage = useMemo(() => {
    return normalizeVideoLanguage(language) || storedVideoLanguage || 'sk';
  }, [language, storedVideoLanguage]);

  const copy = pageCopy[pageLanguage];

  const topRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const localizedVideos = useMemo(() => {
    return getLocalizedVisibleVideoManuals(pageLanguage).map((video) =>
      normalizeVideoManualForLanguage(video, pageLanguage),
    );
  }, [pageLanguage]);

  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(copy.allCategories);
  const [search, setSearch] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  useEffect(() => {
    setSelectedCategory(copy.allCategories);
    setSearch('');
    setVideoError(false);
    setVideoModalOpen(false);

    setSelectedVideoId((currentSlug) => {
      const currentExists = localizedVideos.some(
        (video) => video.slug === currentSlug,
      );

      if (currentExists) return currentSlug;

      return localizedVideos[0]?.slug || '';
    });
  }, [copy.allCategories, localizedVideos]);

  const selectedVideo =
    localizedVideos.find((video) => video.slug === selectedVideoId) ||
    localizedVideos[0];

  const categories = useMemo(() => {
    return [
      copy.allCategories,
      ...Array.from(new Set(localizedVideos.map((item) => item.category))),
    ];
  }, [copy.allCategories, localizedVideos]);

  const filteredVideos = useMemo(() => {
    const q = search.trim().toLowerCase();

    return localizedVideos.filter((item) => {
      const matchesCategory =
        selectedCategory === copy.allCategories ||
        item.category === selectedCategory;

      const matchesSearch =
        !q ||
        [item.title, item.category, item.description, ...safeArray<string>(item.steps)]
          .join(' ')
          .toLowerCase()
          .includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [copy.allCategories, localizedVideos, selectedCategory, search]);

  function goToMenu() {
    router.push('/dashboard');
  }

  function playVideo(video: LocalizedVideoManual) {
    setSelectedVideoId(video.slug);
    setVideoError(false);
    setVideoModalOpen(true);

    window.setTimeout(() => {
      topRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }

  if (!selectedVideo) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#020617] px-4 py-10 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl shadow-black/30 sm:p-8">
          <p className="text-lg font-black">{copy.noResults}</p>

          <button
            type="button"
            onClick={goToMenu}
            className="mt-5 min-h-[46px] rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-500 active:scale-95"
          >
            {copy.backToMenu}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#020617] text-white">
      <div
        ref={topRef}
        className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/95 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:px-5 sm:py-3 lg:px-6">
          <button
            type="button"
            onClick={goToMenu}
            className="inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-white transition hover:bg-white/15 active:scale-95 sm:text-sm"
          >
            <Menu size={16} />
            <span>{copy.menu}</span>
          </button>

          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-purple-200 sm:hidden">
              {copy.headerSmall}
            </div>

            <div className="hidden truncate text-xs font-bold text-slate-400 sm:block">
              {copy.headerSmall}
            </div>
          </div>

          <button
            type="button"
            onClick={goToMenu}
            className="inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-2xl border border-purple-400/30 bg-purple-600/20 px-3 py-2 text-xs font-black text-purple-100 transition hover:bg-purple-600/30 active:scale-95 sm:text-sm"
          >
            <ArrowLeft size={16} />
            <span className="hidden min-[390px]:inline">{copy.backToMenu}</span>
            <span className="min-[390px]:hidden">Späť</span>
          </button>
        </div>
      </div>

      <section className="mx-auto w-full max-w-6xl px-3 py-4 pb-24 sm:px-5 sm:py-7 lg:px-6">
        <section className="grid gap-4 lg:gap-5">
          <div className="min-w-0 rounded-3xl border border-white/10 bg-[#0f172a] p-3 shadow-2xl shadow-black/30 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-wide text-purple-300 sm:text-xs">
                  {copy.nowPlaying}
                </div>

                <h2 className="mt-1 text-xl font-black leading-tight text-white sm:text-2xl">
                  {selectedVideo.title}
                </h2>

                <p className="mt-2 text-xs font-semibold leading-5 text-slate-300 sm:text-sm sm:leading-6">
                  {selectedVideo.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="max-w-full rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-[11px] font-black text-purple-100 sm:text-xs">
                    {copy.categoryLabel}: {selectedVideo.category}
                  </span>

                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-black text-cyan-100 sm:text-xs">
                    {copy.languageLabel}: {pageLanguage.toUpperCase()}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-black text-slate-200 sm:text-xs">
                    <Clock size={13} />
                    {selectedVideo.duration}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-3xl border border-purple-400/20 bg-purple-500/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-sm font-black text-white sm:text-base">
                  {copy.openInWindow}
                </p>

                <p className="mt-1 text-xs font-semibold leading-5 text-purple-100 sm:text-sm">
                  {selectedVideo.title} · {pageLanguage.toUpperCase()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setVideoModalOpen(true)}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-500 active:scale-95"
              >
                <PlayCircle size={18} />
                {copy.openVideo}
              </button>
            </div>

            <ScenarioPanel video={selectedVideo} copy={copy} />
          </div>

          <aside className="min-w-0 rounded-3xl border border-white/10 bg-[#050816] p-3 shadow-2xl shadow-black/30 sm:p-5">
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3 pl-11 pr-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-purple-400 focus:bg-white/[0.08]"
              />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`min-h-[38px] rounded-full border px-3 py-2 text-[11px] font-black transition active:scale-95 sm:text-xs ${
                    selectedCategory === category
                      ? 'border-purple-400 bg-purple-600 text-white shadow-lg shadow-purple-950/30'
                      : 'border-white/10 bg-white/[0.05] text-slate-300 hover:border-purple-400/50 hover:bg-purple-600/20'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredVideos.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center text-sm text-slate-400">
                  {copy.noResults}
                </div>
              ) : (
                filteredVideos.map((video) => {
                  const active = selectedVideo.slug === video.slug;

                  return (
                    <button
                      key={video.slug}
                      type="button"
                      onClick={() => playVideo(video)}
                      className={`group w-full rounded-[1.75rem] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-2xl active:scale-[0.99] sm:p-5 ${
                        active
                          ? 'border-purple-400 bg-gradient-to-br from-purple-600/25 via-fuchsia-500/10 to-cyan-500/10 shadow-lg shadow-purple-950/30'
                          : 'border-white/10 bg-gradient-to-br from-[#0f172a] via-[#0b1120] to-[#111827] hover:border-purple-400/50 hover:bg-[#111827]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                            active
                              ? 'bg-purple-600 text-white'
                              : 'bg-white/10 text-purple-300'
                          }`}
                        >
                          <PlayCircle size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 text-sm font-black leading-5 text-white">
                              {video.title}
                            </div>

                            <div className="shrink-0 rounded-full bg-black/30 px-2 py-1 text-[10px] font-bold text-slate-300">
                              {video.duration}
                            </div>
                          </div>

                          <div className="mt-1 text-[11px] font-semibold text-purple-200">
                            {video.category}
                          </div>

                          <p className="mt-2 text-xs leading-5 text-slate-400">
                            {video.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </section>

        <section className="mt-5 rounded-3xl border border-purple-400/20 bg-purple-500/10 p-4 shadow-xl shadow-black/20 sm:mt-6 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black leading-tight text-white sm:text-2xl">
                {copy.recommendedTitle}
              </h2>

              <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-purple-100 sm:text-sm sm:leading-6">
                {copy.recommendedDescription}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const firstVideo = localizedVideos[0];
                if (firstVideo) playVideo(firstVideo);
              }}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-500 active:scale-95"
            >
              <Home size={18} />
              {copy.startFromBeginning}
            </button>
          </div>
        </section>

        {videoModalOpen ? (
          <VideoModal
            video={selectedVideo}
            videoRef={videoRef}
            videoError={videoError}
            copy={copy}
            pageLanguage={pageLanguage}
            onClose={() => setVideoModalOpen(false)}
            onBackToMenu={goToMenu}
            onVideoLoaded={() => setVideoError(false)}
            onVideoError={() => setVideoError(true)}
          />
        ) : null}
      </section>
    </main>
  );
}

function VideoModal({
  video,
  videoRef,
  videoError,
  copy,
  pageLanguage,
  onClose,
  onBackToMenu,
  onVideoLoaded,
  onVideoError,
}: {
  video: LocalizedVideoManual;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoError: boolean;
  copy: PageCopy;
  pageLanguage: PageLanguage;
  onClose: () => void;
  onBackToMenu: () => void;
  onVideoLoaded: () => void;
  onVideoError: () => void;
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 px-3 py-4 backdrop-blur-xl sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
    >
      <button
        type="button"
        aria-label={copy.closeVideo}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#050816] shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/[0.04] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-purple-200">
              {copy.presentationMode}
            </p>

            <h2 className="mt-1 truncate text-xl font-black text-white sm:text-2xl">
              {video.title}
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-400 sm:text-sm">
              {copy.languageLabel}: {pageLanguage.toUpperCase()}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onBackToMenu}
              className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-600/20 px-4 py-2 text-sm font-black text-purple-100 transition hover:bg-purple-600/30"
            >
              {copy.backToMenu}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-white transition hover:bg-white/[0.12]"
            >
              {copy.closeVideo}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          <ProfessionalVideoPlayer
            video={video}
            videoRef={videoRef}
            videoError={videoError}
            copy={copy}
            pageLanguage={pageLanguage}
            onVideoLoaded={onVideoLoaded}
            onVideoError={onVideoError}
          />

          <div className="mt-4">
            <ScenarioPanel video={video} copy={copy} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfessionalVideoPlayer({
  video,
  videoRef,
  videoError,
  copy,
  pageLanguage,
  onVideoLoaded,
  onVideoError,
}: {
  video: LocalizedVideoManual;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoError: boolean;
  copy: PageCopy;
  pageLanguage: PageLanguage;
  onVideoLoaded: () => void;
  onVideoError: () => void;
}) {
  const [sourceIndex, setSourceIndex] = useState(0);

  const sourceCandidates = useMemo(
    () => buildVideoSourceCandidates(video, pageLanguage),
    [pageLanguage, video],
  );

  const activeSource = sourceCandidates[sourceIndex] || sourceCandidates[0];
  const activeSourceUrl = activeSource?.src || video.videoUrl;
  const subtitleUrl = getSubtitleUrl(activeSourceUrl);

  useEffect(() => {
    setSourceIndex(0);
  }, [pageLanguage, video.slug, video.videoUrl]);

  useEffect(() => {
    const element = videoRef.current;

    if (!element) return;

    element.load();
  }, [activeSourceUrl, videoRef]);

  function tryNextVideoSource(reason: string) {
    if (sourceIndex < sourceCandidates.length - 1) {
      setSourceIndex((current) => current + 1);
      return;
    }

    console.warn('ZEDPERA_PRESENTATION_VIDEO_SOURCE_ERROR', {
      reason,
      language: pageLanguage,
      video: video.slug,
      triedSources: sourceCandidates.map((source) => source.src),
    });

    onVideoError();
  }

  function handleLoadedMetadata() {
    const element = videoRef.current;

    if (!element) {
      onVideoLoaded();
      return;
    }

    const hasVideoTrack =
      element.videoWidth > 0 &&
      element.videoHeight > 0 &&
      !Number.isNaN(element.videoWidth) &&
      !Number.isNaN(element.videoHeight);

    if (!hasVideoTrack) {
      tryNextVideoSource('Súbor sa načítal, ale neobsahuje obrazovú stopu.');
      return;
    }

    onVideoLoaded();
  }

  function handleVideoError() {
    tryNextVideoSource('Video súbor sa nepodarilo načítať.');
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl shadow-black/30 sm:rounded-3xl">
      <div className="relative aspect-video min-h-[180px] overflow-hidden bg-[#020617] sm:min-h-[260px] lg:max-h-[540px]">
        {!videoError ? (
          <video
            key={`${pageLanguage}-${video.slug}-${activeSourceUrl}`}
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full bg-black object-contain"
            onLoadedMetadata={handleLoadedMetadata}
            onLoadedData={onVideoLoaded}
            onCanPlay={onVideoLoaded}
            onError={handleVideoError}
          >
            <source
              src={activeSourceUrl}
              type={activeSourceUrl.endsWith('.webm') ? 'video/webm' : 'video/mp4'}
            />

            {subtitleUrl ? (
              <track
                key={`${pageLanguage}-${subtitleUrl}`}
                src={subtitleUrl}
                kind="subtitles"
                srcLang={pageLanguage}
                label={`${copy.subtitlesLabel} ${pageLanguage.toUpperCase()}`}
                default
              />
            ) : null}

            {copy.browserUnsupported}
          </video>
        ) : (
          <div className="flex h-full min-h-[220px] w-full items-center justify-center bg-[#050816] p-5 text-center sm:p-8">
            <div>
              <Video className="mx-auto mb-4 h-10 w-10 text-purple-300 sm:h-12 sm:w-12" />

              <p className="text-lg font-black text-white sm:text-xl">
                {copy.videoNotFound}
              </p>

              <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">
                {copy.videoNotFoundDescription}
              </p>

              <code className="mt-4 inline-block max-w-full break-all rounded-xl bg-black/50 px-3 py-2 text-[11px] font-bold text-purple-200 sm:px-4 sm:py-3 sm:text-xs">
                {activeSourceUrl}
              </code>

              {sourceCandidates.length > 1 ? (
                <div className="mt-4 max-h-36 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3 text-left text-[11px] leading-5 text-slate-300">
                  {sourceCandidates.map((source, index) => (
                    <div key={`${source.src}-${index}`}>
                      {index + 1}. {source.label}: {source.src}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {!videoError ? (
          <div className="pointer-events-none absolute left-2 top-2 z-20 max-w-[calc(100%-1rem)] rounded-xl border border-white/10 bg-black/55 px-2.5 py-2 backdrop-blur-xl sm:left-4 sm:top-4 sm:max-w-md sm:rounded-2xl sm:px-4 sm:py-3">
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-purple-200 sm:text-xs sm:tracking-[0.22em]">
              {copy.presentationMode}
            </div>

            <div className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-white sm:line-clamp-3 sm:text-sm sm:leading-5">
              {video.title}
            </div>

            <div className="mt-2 hidden rounded-xl bg-white/10 px-2 py-1 text-[10px] font-black text-cyan-100 sm:inline-flex">
              {copy.videoSourceLabel}: {activeSource?.label || pageLanguage.toUpperCase()}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/10 bg-[#050816] px-3 py-3 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
            {copy.presentationMode}
          </div>

          <div className="max-w-full break-all rounded-xl bg-white/[0.04] px-3 py-2 text-[11px] font-bold text-slate-300">
            {activeSourceUrl}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenarioPanel({
  video,
  copy,
}: {
  video: LocalizedVideoManual;
  copy: PageCopy;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 sm:mt-5 sm:rounded-3xl sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-5 w-5 shrink-0 text-purple-400" />

        <h3 className="text-lg font-black leading-tight text-white sm:text-xl">
          {copy.scenarioTitle}
        </h3>
      </div>

      <p className="text-xs font-semibold leading-6 text-slate-300 sm:text-sm sm:leading-7">
        {video.description}
      </p>

      <ul className="mt-4 space-y-3">
        {safeArray<string>(video.steps).map((step, index) => (
          <li
            key={`${video.slug}-${index}`}
            className="flex gap-3 text-xs leading-5 text-slate-200 sm:text-sm sm:leading-6"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-400 sm:h-5 sm:w-5" />

            <span>
              <strong className="text-white">
                {copy.step} {index + 1}:{' '}
              </strong>
              {step}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-2xl border border-purple-400/20 bg-purple-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white sm:h-10 sm:w-10 sm:rounded-2xl">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-black text-white sm:text-base">
              {copy.guideText}
            </p>

            <p className="mt-1 text-xs font-semibold leading-5 text-purple-100 sm:text-sm sm:leading-6">
              {video.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}