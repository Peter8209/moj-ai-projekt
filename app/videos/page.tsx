'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  Home,
  Menu,
  MousePointerClick,
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

const pageCopy = {
  sk: {
    menu: 'Menu',
    backToMenu: 'Späť do menu',
    headerSmall: 'Profesionálne manuály Zedpera',
    badge: 'Video manuály s AI sprievodcom',
    title: 'Video návody Zedpera',
    description:
      'Každý manuál sa automaticky zobrazí v aktuálne nastavenom jazyku dashboardu. Video, text sprievodcu, kategórie aj scenár sa prepnú podľa jazyka systému.',
    nowPlaying: 'Práve prehrávate',
    listTitle: 'Zoznam návodov',
    listDescription:
      'Kliknite na manuál. Video sa spustí vo vybranom jazyku a zobrazí sa jeho scenár.',
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
      'Skontrolujte, či je MP4 uložené v správnom jazykovom priečinku a či názov súboru presne zodpovedá odkazu:',
    browserUnsupported: 'Váš prehliadač nepodporuje prehrávanie videa.',
    aiGuide: 'AI sprievodca',
    botName: 'Zedpera Bot',
    botDescription: 'vedie používateľa krok za krokom',
    allCategories: 'Všetko',
    categoryLabel: 'Kategória',
    languageLabel: 'Jazyk videa',
  },
  cs: {
    menu: 'Menu',
    backToMenu: 'Zpět do menu',
    headerSmall: 'Profesionální manuály Zedpera',
    badge: 'Video návody s AI průvodcem',
    title: 'Video návody Zedpera',
    description:
      'Každý návod se automaticky zobrazí v aktuálně nastaveném jazyce dashboardu. Video, text průvodce, kategorie i scénář se přepnou podle jazyka systému.',
    nowPlaying: 'Právě přehráváte',
    listTitle: 'Seznam návodů',
    listDescription:
      'Klikněte na návod. Video se spustí ve vybraném jazyce a zobrazí se jeho scénář.',
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
      'Zkontrolujte, zda je MP4 uložené ve správné jazykové složce a zda název souboru přesně odpovídá odkazu:',
    browserUnsupported: 'Váš prohlížeč nepodporuje přehrávání videa.',
    aiGuide: 'AI průvodce',
    botName: 'Zedpera Bot',
    botDescription: 'vede uživatele krok za krokem',
    allCategories: 'Vše',
    categoryLabel: 'Kategorie',
    languageLabel: 'Jazyk videa',
  },
  en: {
    menu: 'Menu',
    backToMenu: 'Back to menu',
    headerSmall: 'Professional Zedpera manuals',
    badge: 'Video guides with AI assistant',
    title: 'Zedpera Video Guides',
    description:
      'Each manual is displayed automatically in the current dashboard language. The video, guide text, categories, and scenario switch according to the system language.',
    nowPlaying: 'Now playing',
    listTitle: 'Guide list',
    listDescription:
      'Click a guide. The video in the selected language will start and its scenario will be displayed.',
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
      'Check whether the MP4 file is stored in the correct language folder and whether the filename matches this link exactly:',
    browserUnsupported: 'Your browser does not support video playback.',
    aiGuide: 'AI guide',
    botName: 'Zedpera Bot',
    botDescription: 'guides the user step by step',
    allCategories: 'All',
    categoryLabel: 'Category',
    languageLabel: 'Video language',
  },
  de: {
    menu: 'Menü',
    backToMenu: 'Zurück zum Menü',
    headerSmall: 'Professionelle Zedpera-Anleitungen',
    badge: 'Videoanleitungen mit KI-Begleiter',
    title: 'Zedpera Videoanleitungen',
    description:
      'Jede Anleitung wird automatisch in der aktuell eingestellten Dashboard-Sprache angezeigt. Video, Begleittext, Kategorien und Szenario wechseln entsprechend der Systemsprache.',
    nowPlaying: 'Wird gerade abgespielt',
    listTitle: 'Liste der Anleitungen',
    listDescription:
      'Klicken Sie auf eine Anleitung. Das Video startet in der gewählten Sprache und das Szenario wird angezeigt.',
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
      'Prüfen Sie, ob die MP4-Datei im richtigen Sprachordner gespeichert ist und der Dateiname exakt diesem Link entspricht:',
    browserUnsupported: 'Ihr Browser unterstützt die Videowiedergabe nicht.',
    aiGuide: 'KI-Begleiter',
    botName: 'Zedpera Bot',
    botDescription: 'führt den Benutzer Schritt für Schritt',
    allCategories: 'Alles',
    categoryLabel: 'Kategorie',
    languageLabel: 'Videosprache',
  },
  pl: {
    menu: 'Menu',
    backToMenu: 'Powrót do menu',
    headerSmall: 'Profesjonalne instrukcje Zedpera',
    badge: 'Instrukcje wideo z asystentem AI',
    title: 'Instrukcje wideo Zedpera',
    description:
      'Każda instrukcja automatycznie wyświetla się w aktualnie ustawionym języku dashboardu. Wideo, tekst przewodnika, kategorie i scenariusz przełączają się zgodnie z językiem systemu.',
    nowPlaying: 'Teraz odtwarzane',
    listTitle: 'Lista instrukcji',
    listDescription:
      'Kliknij instrukcję. Wideo uruchomi się w wybranym języku i wyświetli się jego scenariusz.',
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
      'Sprawdź, czy plik MP4 jest zapisany we właściwym folderze językowym i czy nazwa pliku dokładnie odpowiada temu linkowi:',
    browserUnsupported: 'Twoja przeglądarka nie obsługuje odtwarzania wideo.',
    aiGuide: 'Przewodnik AI',
    botName: 'Zedpera Bot',
    botDescription: 'prowadzi użytkownika krok po kroku',
    allCategories: 'Wszystko',
    categoryLabel: 'Kategoria',
    languageLabel: 'Język wideo',
  },
  hu: {
    menu: 'Menü',
    backToMenu: 'Vissza a menübe',
    headerSmall: 'Professzionális Zedpera útmutatók',
    badge: 'Videó útmutatók AI kísérővel',
    title: 'Zedpera videó útmutatók',
    description:
      'Minden útmutató automatikusan az irányítópulton beállított aktuális nyelven jelenik meg. A videó, a kísérőszöveg, a kategóriák és a forgatókönyv a rendszer nyelvéhez igazodik.',
    nowPlaying: 'Most lejátszás alatt',
    listTitle: 'Útmutatók listája',
    listDescription:
      'Kattintson egy útmutatóra. A videó elindul a kiválasztott nyelven, és megjelenik a forgatókönyv.',
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
      'Ellenőrizze, hogy az MP4 fájl a megfelelő nyelvi mappában van-e, és a fájlnév pontosan megegyezik-e ezzel a hivatkozással:',
    browserUnsupported: 'A böngésző nem támogatja a videó lejátszását.',
    aiGuide: 'AI kísérő',
    botName: 'Zedpera Bot',
    botDescription: 'lépésről lépésre vezeti a felhasználót',
    allCategories: 'Összes',
    categoryLabel: 'Kategória',
    languageLabel: 'Videó nyelve',
  },
};

type PageLanguage = keyof typeof pageCopy;

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

function normalizeVideoLanguage(value: unknown): PageLanguage | null {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace('_', '-')
    .split('-')[0];

  if (!normalized) return null;

  if (normalized === 'cz') return 'cs';
  if (normalized === 'cze') return 'cs';
  if (normalized === 'czech') return 'cs';
  if (normalized === 'slovak') return 'sk';
  if (normalized === 'english') return 'en';
  if (normalized === 'german') return 'de';
  if (normalized === 'polish') return 'pl';
  if (normalized === 'hungarian') return 'hu';

  return supportedPageLanguages.includes(normalized as PageLanguage)
    ? (normalized as PageLanguage)
    : null;
}

function normalizePageLanguage(value: unknown): PageLanguage {
  return normalizeVideoLanguage(value) || 'sk';
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

function forcePublicVideoManualLanguagePath(
  value: string | undefined,
  language: PageLanguage,
) {
  if (!value) return '';

  if (/^(https?:|blob:|data:)/i.test(value)) {
    return value;
  }

  const cleanValue = value.replace(/\\/g, '/');

  if (cleanValue.includes('/video-manualy/')) {
    return cleanValue.replace(
      /\/video-manualy\/(sk|cs|cz|en|de|pl|hu)\//i,
      `/video-manualy/${language}/`,
    );
  }

  const fileName = cleanValue.split('/').filter(Boolean).pop() || cleanValue;

  return `/video-manualy/${language}/${fileName}`;
}

function normalizeVideoManualForLanguage(
  video: LocalizedVideoManual,
  language: PageLanguage,
): LocalizedVideoManual {
  return {
    ...video,
    videoUrl: forcePublicVideoManualLanguagePath(video.videoUrl, language),
    thumbnail: video.thumbnail
      ? forcePublicVideoManualLanguagePath(video.thumbnail, language)
      : video.thumbnail,
  };
}

function getSubtitleUrl(videoUrl: string) {
  if (!videoUrl) return '';

  return videoUrl.replace(/\.mp4($|\?)/i, '.srt$1');
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

  useEffect(() => {
    setSelectedCategory(copy.allCategories);
    setSearch('');
    setVideoError(false);

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
        [item.title, item.category, item.description, ...item.steps]
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

    window.setTimeout(() => {
      topRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {
          // Prehliadač môže blokovať automatické prehrávanie.
        });
      }
    }, 120);
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
            <span className="hidden xs:inline">{copy.menu}</span>
            <span className="xs:hidden">{copy.menu}</span>
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
        <div className="mb-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 sm:mb-7 sm:p-6 lg:p-7">
          <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1.5 text-[11px] font-black text-purple-200 sm:text-sm">
            <Video size={15} className="shrink-0" />
            <span className="truncate">{copy.badge}</span>
          </div>

          <h1 className="max-w-4xl text-[26px] font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {copy.title}
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300 sm:text-base sm:leading-7">
            {copy.description}
          </p>
        </div>

        <section className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.1fr)_380px]">
          <div className="order-1 min-w-0 rounded-3xl border border-white/10 bg-[#0f172a] p-3 shadow-2xl shadow-black/30 sm:p-5">
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

            <ProfessionalVideoPlayer
              video={selectedVideo}
              videoRef={videoRef}
              videoError={videoError}
              copy={copy}
              pageLanguage={pageLanguage}
              onVideoLoaded={() => setVideoError(false)}
              onVideoError={() => setVideoError(true)}
            />

            <ScenarioPanel video={selectedVideo} copy={copy} />
          </div>

          <aside className="order-2 min-w-0 rounded-3xl border border-white/10 bg-[#050816] p-3 shadow-2xl shadow-black/30 sm:p-5 xl:sticky xl:top-[76px] xl:self-start">
            <div className="mb-4">
              <h3 className="text-xl font-black text-white sm:text-2xl">
                {copy.listTitle}
              </h3>

              <p className="mt-2 text-xs font-semibold leading-5 text-slate-400 sm:text-sm sm:leading-6">
                {copy.listDescription}
              </p>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3 pl-11 pr-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-purple-400 focus:bg-white/[0.08]"
              />
            </div>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`min-h-[38px] shrink-0 rounded-full border px-3 py-2 text-[11px] font-black transition active:scale-95 sm:text-xs ${
                    selectedCategory === category
                      ? 'border-purple-400 bg-purple-600 text-white shadow-lg shadow-purple-950/30'
                      : 'border-white/10 bg-white/[0.05] text-slate-300 hover:border-purple-400/50 hover:bg-purple-600/20'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="space-y-3 overflow-visible pr-0 xl:max-h-[calc(100dvh-230px)] xl:overflow-y-auto xl:pr-1">
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
                      className={`w-full rounded-2xl border p-3 text-left transition active:scale-[0.99] sm:p-4 ${
                        active
                          ? 'border-purple-400 bg-purple-600/20 shadow-lg shadow-purple-950/30'
                          : 'border-white/10 bg-[#0f172a] hover:border-purple-400/50 hover:bg-[#111827]'
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

                if (firstVideo) {
                  playVideo(firstVideo);
                }
              }}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-500 active:scale-95"
            >
              <Home size={18} />
              {copy.startFromBeginning}
            </button>
          </div>
        </section>
      </section>
    </main>
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
  copy: (typeof pageCopy)[PageLanguage];
  pageLanguage: PageLanguage;
  onVideoLoaded: () => void;
  onVideoError: () => void;
}) {
  const subtitleUrl = getSubtitleUrl(video.videoUrl);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl shadow-black/30 sm:rounded-3xl">
      <div className="relative aspect-video min-h-[180px] overflow-hidden bg-[#020617] sm:min-h-[260px] lg:max-h-[540px]">
        {!videoError ? (
          <video
            key={`${pageLanguage}-${video.videoUrl}`}
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            poster={video.thumbnail}
            className="h-full w-full bg-black object-contain"
            onLoadedData={onVideoLoaded}
            onCanPlay={onVideoLoaded}
            onError={onVideoError}
          >
            <source src={video.videoUrl} type="video/mp4" />

            {subtitleUrl ? (
              <track
                key={`${pageLanguage}-${subtitleUrl}`}
                src={subtitleUrl}
                kind="subtitles"
                srcLang={pageLanguage}
                label={pageLanguage.toUpperCase()}
                default
              />
            ) : null}

            {copy.browserUnsupported}
          </video>
        ) : (
          <div className="flex h-full min-h-[220px] w-full items-center justify-center bg-[#050816] p-5 text-center sm:p-8">
            <div>
              <Bot className="mx-auto mb-4 h-10 w-10 text-purple-300 sm:h-12 sm:w-12" />

              <p className="text-lg font-black text-white sm:text-xl">
                {copy.videoNotFound}
              </p>

              <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">
                {copy.videoNotFoundDescription}
              </p>

              <code className="mt-4 inline-block max-w-full break-all rounded-xl bg-black/50 px-3 py-2 text-[11px] font-bold text-purple-200 sm:px-4 sm:py-3 sm:text-xs">
                {video.videoUrl}
              </code>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute left-2 top-2 z-20 max-w-[calc(100%-1rem)] rounded-xl border border-white/10 bg-black/55 px-2.5 py-2 backdrop-blur-xl sm:left-4 sm:top-4 sm:max-w-md sm:rounded-2xl sm:px-4 sm:py-3">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-purple-200 sm:text-xs sm:tracking-[0.22em]">
            {copy.aiGuide}
          </div>

          <div className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-white sm:line-clamp-3 sm:text-sm sm:leading-5">
            {video.description}
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 top-4 z-20 hidden items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 backdrop-blur-xl lg:flex">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-purple-950/40">
            <Bot className="h-5 w-5 text-white" />
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-emerald-400" />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
              {copy.botName}
            </p>

            <p className="text-xs font-bold text-slate-200">
              {copy.botDescription}
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute left-[40%] top-[58%] z-30 hidden animate-cursor lg:block">
          <MousePointerClick className="h-8 w-8 text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.8)]" />
        </div>
      </div>

      <style jsx>{`
        @keyframes cursorMove {
          0% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(70px, -34px) scale(1.05);
          }
          50% {
            transform: translate(140px, 14px) scale(1);
          }
          75% {
            transform: translate(200px, -38px) scale(1.05);
          }
          100% {
            transform: translate(0, 0) scale(1);
          }
        }

        .animate-cursor {
          animation: cursorMove 7s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function ScenarioPanel({
  video,
  copy,
}: {
  video: LocalizedVideoManual;
  copy: (typeof pageCopy)[PageLanguage];
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
        {video.steps.map((step, index) => (
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