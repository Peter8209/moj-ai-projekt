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
      'Kliknite na manuál. Vľavo sa spustí video vo vybranom jazyku a zobrazí sa jeho scenár.',
    searchPlaceholder: 'Hľadať video návod...',
    noResults: 'Nenašiel sa žiadny video návod.',
    recommendedTitle: 'Odporúčaný postup pre nového používateľa',
    recommendedDescription:
      'Najskôr si pozrite Hlavné menu, Profil používateľa, Novú prácu, AI Chat, AI školiteľa a Obhajobu.',
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
      'Klikněte na návod. Vlevo se spustí video ve vybraném jazyce a zobrazí se jeho scénář.',
    searchPlaceholder: 'Hledat video návod...',
    noResults: 'Nebyl nalezen žádný video návod.',
    recommendedTitle: 'Doporučený postup pro nového uživatele',
    recommendedDescription:
      'Nejprve si prohlédněte Hlavní menu, Profil uživatele, Novou práci, AI Chat, AI školitele a Obhajobu.',
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
      'Click a guide. The video in the selected language will start on the left and its scenario will be displayed.',
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
      'Klicken Sie auf eine Anleitung. Links startet das Video in der gewählten Sprache und das Szenario wird angezeigt.',
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
      'Kliknij instrukcję. Po lewej uruchomi się wideo w wybranym języku i wyświetli się jego scenariusz.',
    searchPlaceholder: 'Szukaj instrukcji wideo...',
    noResults: 'Nie znaleziono żadnej instrukcji wideo.',
    recommendedTitle: 'Zalecana ścieżka dla nowego użytkownika',
    recommendedDescription:
      'Najpierw obejrzyj Menu główne, Profil użytkownika, Nową pracę, AI Chat, Opiekuna AI i Obronę.',
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
      'Kattintson egy útmutatóra. Bal oldalon elindul a kiválasztott nyelvű videó, és megjelenik a forgatókönyv.',
    searchPlaceholder: 'Videó útmutató keresése...',
    noResults: 'Nem található videó útmutató.',
    recommendedTitle: 'Ajánlott folyamat új felhasználónak',
    recommendedDescription:
      'Először nézze meg a Főmenüt, Felhasználói profilt, Új munkát, AI Chatet, AI témavezetőt és Védést.',
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

function normalizePageLanguage(value: unknown): PageLanguage {
  return supportedPageLanguages.includes(value as PageLanguage)
    ? (value as PageLanguage)
    : 'sk';
}

function getSubtitleUrl(videoUrl: string) {
  if (!videoUrl) return '';

  return videoUrl.replace(/\.mp4($|\?)/i, '.srt$1');
}

export default function VideoNavodPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const pageLanguage = normalizePageLanguage(language);
  const copy = pageCopy[pageLanguage];

  const topRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const localizedVideos = useMemo(() => {
    return getLocalizedVisibleVideoManuals(pageLanguage);
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

  const goToMenu = () => {
    router.push('/dashboard');
  };

  const playVideo = (video: LocalizedVideoManual) => {
    setSelectedVideoId(video.slug);
    setVideoError(false);

    setTimeout(() => {
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
  };

  if (!selectedVideo) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#020617] px-4 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="text-lg font-black">{copy.noResults}</p>

          <button
            type="button"
            onClick={goToMenu}
            className="mt-5 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-500"
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
        className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={goToMenu}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20"
          >
            <Menu size={18} />
            {copy.menu}
          </button>

          <div className="hidden text-sm font-semibold text-slate-400 sm:block">
            {copy.headerSmall}
          </div>

          <button
            type="button"
            onClick={goToMenu}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-purple-400/30 bg-purple-600/20 px-4 py-2 text-sm font-black text-purple-100 transition hover:bg-purple-600/30"
          >
            <ArrowLeft size={18} />
            {copy.backToMenu}
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-black text-purple-200">
            <Video size={16} />
            {copy.badge}
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            {copy.title}
          </h1>

          <p className="mt-3 max-w-3xl text-lg font-semibold leading-8 text-slate-300">
            {copy.description}
          </p>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[#0f172a] p-4 shadow-2xl shadow-black/30 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-black uppercase tracking-wide text-purple-300">
                  {copy.nowPlaying}
                </div>

                <h2 className="mt-1 text-2xl font-black text-white">
                  {selectedVideo.title}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-300">
                  {selectedVideo.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-100">
                    {copy.categoryLabel}: {selectedVideo.category}
                  </span>

                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-100">
                    {copy.languageLabel}: {pageLanguage.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-black text-slate-200">
                <Clock size={16} />
                {selectedVideo.duration}
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

          <aside className="rounded-[2rem] border border-white/10 bg-[#050816] p-4 shadow-2xl shadow-black/30 sm:p-6">
            <div className="mb-4">
              <h3 className="text-2xl font-black text-white">
                {copy.listTitle}
              </h3>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                {copy.listDescription}
              </p>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-4 pl-12 pr-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-purple-400"
              />
            </div>

            <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                    selectedCategory === category
                      ? 'border-purple-400 bg-purple-600 text-white'
                      : 'border-white/10 bg-white/[0.05] text-slate-300 hover:border-purple-400/50 hover:bg-purple-600/20'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="max-h-[760px] space-y-3 overflow-y-auto pr-1">
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
                      className={`w-full rounded-2xl border p-4 text-left transition ${
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
                          <PlayCircle size={21} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="font-black text-white">
                              {video.title}
                            </div>

                            <div className="shrink-0 rounded-full bg-black/30 px-2 py-1 text-[11px] font-bold text-slate-300">
                              {video.duration}
                            </div>
                          </div>

                          <div className="mt-1 text-xs font-semibold text-purple-200">
                            {video.category}
                          </div>

                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
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

        <section className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">
                {copy.recommendedTitle}
              </h2>

              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-purple-100">
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-4 text-sm font-black text-white transition hover:bg-purple-500"
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
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
      <div className="relative aspect-video overflow-hidden bg-[#020617]">
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
          <div className="flex h-full w-full items-center justify-center bg-[#050816] p-8 text-center">
            <div>
              <Bot className="mx-auto mb-4 h-12 w-12 text-purple-300" />

              <p className="text-xl font-black text-white">
                {copy.videoNotFound}
              </p>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                {copy.videoNotFoundDescription}
              </p>

              <code className="mt-4 inline-block max-w-full break-all rounded-xl bg-black/50 px-4 py-3 text-xs font-bold text-purple-200">
                {video.videoUrl}
              </code>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute left-4 top-4 z-20 max-w-[calc(100%-2rem)] rounded-2xl border border-white/10 bg-black/45 px-4 py-3 backdrop-blur-xl md:max-w-md">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-purple-200">
            {copy.aiGuide}
          </div>

          <div className="mt-1 line-clamp-3 text-sm font-bold leading-5 text-white">
            {video.description}
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 top-4 z-20 hidden items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 backdrop-blur-xl md:flex">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-purple-950/40">
            <Bot className="h-6 w-6 text-white" />
            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-400" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              {copy.botName}
            </p>

            <p className="text-xs font-bold text-slate-200">
              {copy.botDescription}
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute left-[40%] top-[58%] z-30 hidden animate-cursor md:block">
          <MousePointerClick className="h-10 w-10 text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.8)]" />
        </div>
      </div>

      <style jsx>{`
        @keyframes cursorMove {
          0% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(80px, -42px) scale(1.05);
          }
          50% {
            transform: translate(170px, 18px) scale(1);
          }
          75% {
            transform: translate(245px, -50px) scale(1.05);
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
    <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-5">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="text-purple-400" size={22} />

        <h3 className="text-xl font-black text-white">
          {copy.scenarioTitle}
        </h3>
      </div>

      <p className="text-sm font-semibold leading-7 text-slate-300">
        {video.description}
      </p>

      <ul className="mt-4 space-y-3">
        {video.steps.map((step, index) => (
          <li
            key={`${video.slug}-${index}`}
            className="flex gap-3 text-sm text-slate-200"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>

          <div>
            <p className="font-black text-white">{copy.guideText}</p>

            <p className="mt-1 text-sm font-semibold leading-6 text-purple-100">
              {video.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}