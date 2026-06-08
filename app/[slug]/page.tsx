'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  Download,
  PlayCircle,
} from 'lucide-react';

import { useLanguage } from '@/components/LanguageProvider';
import { getLocalizedVideoManualBySlug } from '@/lib/videoManuals';

const detailCopy = {
  sk: {
    back: 'Späť na video manuály',
    guide: 'Video manuál',
    durationFallback: 'Krátky návod',
    notFound: 'Video manuál sa nenašiel',
    notFoundDescription:
      'Skontrolujte, či existuje zvolený manuál a či nie je skrytý.',
    downloadVideo: 'Stiahnuť video',
    scenarioTitle: 'Scenár a postup manuálu',
    step: 'Krok',
    browserUnsupported: 'Váš prehliadač nepodporuje prehrávanie videa.',
    videoNotFound: 'Video súbor sa nenašiel',
    videoNotFoundDescription:
      'Skontrolujte, či je MP4 uložené v správnom priečinku:',
    noVideoUrl: 'K tomuto manuálu nie je priradená video URL.',
  },
  cs: {
    back: 'Zpět na video návody',
    guide: 'Video návod',
    durationFallback: 'Krátký návod',
    notFound: 'Video návod nebyl nalezen',
    notFoundDescription:
      'Zkontrolujte, zda zvolený návod existuje a není skrytý.',
    downloadVideo: 'Stáhnout video',
    scenarioTitle: 'Scénář a postup návodu',
    step: 'Krok',
    browserUnsupported: 'Váš prohlížeč nepodporuje přehrávání videa.',
    videoNotFound: 'Video soubor nebyl nalezen',
    videoNotFoundDescription:
      'Zkontrolujte, zda je MP4 uložené ve správné složce:',
    noVideoUrl: 'K tomuto návodu není přiřazená video URL.',
  },
  en: {
    back: 'Back to video guides',
    guide: 'Video guide',
    durationFallback: 'Short guide',
    notFound: 'Video guide not found',
    notFoundDescription:
      'Check whether the selected guide exists and is not hidden.',
    downloadVideo: 'Download video',
    scenarioTitle: 'Manual scenario and steps',
    step: 'Step',
    browserUnsupported: 'Your browser does not support video playback.',
    videoNotFound: 'Video file was not found',
    videoNotFoundDescription:
      'Check whether the MP4 file is stored in the correct folder:',
    noVideoUrl: 'No video URL is assigned to this guide.',
  },
  de: {
    back: 'Zurück zu den Videoanleitungen',
    guide: 'Videoanleitung',
    durationFallback: 'Kurze Anleitung',
    notFound: 'Videoanleitung wurde nicht gefunden',
    notFoundDescription:
      'Prüfen Sie, ob die ausgewählte Anleitung existiert und nicht ausgeblendet ist.',
    downloadVideo: 'Video herunterladen',
    scenarioTitle: 'Szenario und Schritte der Anleitung',
    step: 'Schritt',
    browserUnsupported: 'Ihr Browser unterstützt die Videowiedergabe nicht.',
    videoNotFound: 'Videodatei wurde nicht gefunden',
    videoNotFoundDescription:
      'Prüfen Sie, ob die MP4-Datei im richtigen Ordner gespeichert ist:',
    noVideoUrl: 'Für diese Anleitung ist keine Video-URL hinterlegt.',
  },
  pl: {
    back: 'Wróć do instrukcji wideo',
    guide: 'Instrukcja wideo',
    durationFallback: 'Krótka instrukcja',
    notFound: 'Nie znaleziono instrukcji wideo',
    notFoundDescription:
      'Sprawdź, czy wybrana instrukcja istnieje i nie jest ukryta.',
    downloadVideo: 'Pobierz wideo',
    scenarioTitle: 'Scenariusz i kroki instrukcji',
    step: 'Krok',
    browserUnsupported: 'Twoja przeglądarka nie obsługuje odtwarzania wideo.',
    videoNotFound: 'Nie znaleziono pliku wideo',
    videoNotFoundDescription:
      'Sprawdź, czy plik MP4 jest zapisany we właściwym folderze:',
    noVideoUrl: 'Do tej instrukcji nie przypisano adresu URL wideo.',
  },
  hu: {
    back: 'Vissza a videó útmutatókhoz',
    guide: 'Videó útmutató',
    durationFallback: 'Rövid útmutató',
    notFound: 'A videó útmutató nem található',
    notFoundDescription:
      'Ellenőrizze, hogy a kiválasztott útmutató létezik-e, és nincs-e elrejtve.',
    downloadVideo: 'Videó letöltése',
    scenarioTitle: 'Útmutató forgatókönyve és lépései',
    step: 'Lépés',
    browserUnsupported: 'A böngésző nem támogatja a videó lejátszását.',
    videoNotFound: 'A videófájl nem található',
    videoNotFoundDescription:
      'Ellenőrizze, hogy az MP4 fájl a megfelelő mappában van-e:',
    noVideoUrl: 'Ehhez az útmutatóhoz nincs videó URL rendelve.',
  },
};

type PageLanguage = keyof typeof detailCopy;

type ManualForDetailPage = {
  slug: string;
  title?: string;
  description?: string;
  category?: string;
  duration?: string;
  thumbnail?: string;
  videoUrl?: string;
  steps?: string[];
};

function normalizePageLanguage(language: unknown): PageLanguage {
  const value = String(language || 'sk');

  if (value === 'cs') return 'cs';
  if (value === 'en') return 'en';
  if (value === 'de') return 'de';
  if (value === 'pl') return 'pl';
  if (value === 'hu') return 'hu';

  return 'sk';
}

function getSafeString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getSafeSteps(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function VideoManualDetailPage() {
  const params = useParams<{ slug?: string }>();
  const { language } = useLanguage();
  const [videoError, setVideoError] = useState(false);

  const pageLanguage = normalizePageLanguage(language);
  const copy = detailCopy[pageLanguage];

  const slug = getSafeString(params?.slug);

  const manual = useMemo<ManualForDetailPage | null>(() => {
    if (!slug) {
      return null;
    }

    const localizedManual = getLocalizedVideoManualBySlug(slug, language);

    if (!localizedManual) {
      return null;
    }

    return localizedManual as unknown as ManualForDetailPage;
  }, [slug, language]);

  if (!manual) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#020617] px-4 text-white">
        <div className="max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/30">
          <Bot className="mx-auto mb-4 h-12 w-12 text-purple-300" />

          <h1 className="text-2xl font-black text-white">{copy.notFound}</h1>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
            {copy.notFoundDescription}
          </p>

          <Link
            href="/videos"
            className="mt-6 inline-flex rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-500"
          >
            {copy.back}
          </Link>
        </div>
      </main>
    );
  }

  const category = getSafeString(manual.category, copy.guide);
  const duration = getSafeString(manual.duration, copy.durationFallback);
  const title = getSafeString(manual.title, copy.guide);
  const description = getSafeString(manual.description);
  const videoUrl = getSafeString(manual.videoUrl);
  const thumbnail = getSafeString(manual.thumbnail);
  const steps = getSafeSteps(manual.steps);

  return (
    <main className="min-h-dvh bg-[#020617] px-4 py-8 text-white sm:px-6 lg:px-10">
      <section className="mx-auto max-w-5xl">
        <Link
          href="/videos"
          className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/[0.1]"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>

        <article className="rounded-[2rem] border border-white/10 bg-[#0f172a] p-4 shadow-2xl shadow-black/30 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-black text-purple-200">
              <PlayCircle className="h-4 w-4" />
              {category}
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-black text-slate-200">
              <Clock className="h-4 w-4" />
              {duration}
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-300 sm:text-base">
              {description}
            </p>
          ) : null}

          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-black">
            {videoUrl && !videoError ? (
              <video
                key={videoUrl}
                controls
                playsInline
                preload="metadata"
                poster={thumbnail || undefined}
                className="aspect-video w-full bg-black object-contain"
                onLoadedData={() => setVideoError(false)}
                onCanPlay={() => setVideoError(false)}
                onError={() => setVideoError(true)}
              >
                <source src={videoUrl} type="video/mp4" />
                {copy.browserUnsupported}
              </video>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-[#050816] p-8 text-center">
                <div>
                  <Bot className="mx-auto mb-4 h-12 w-12 text-purple-300" />

                  <p className="text-xl font-black text-white">
                    {videoUrl ? copy.videoNotFound : copy.noVideoUrl}
                  </p>

                  <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-400">
                    {copy.videoNotFoundDescription}
                  </p>

                  {videoUrl ? (
                    <code className="mt-4 inline-block rounded-xl bg-black/50 px-4 py-3 text-xs font-bold text-purple-200">
                      {videoUrl}
                    </code>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {videoUrl ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={videoUrl}
                download
                className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-purple-950/40 transition hover:bg-purple-500"
              >
                <Download className="h-4 w-4" />
                {copy.downloadVideo}
              </a>

              <code className="inline-flex items-center rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs font-bold text-purple-100">
                {videoUrl}
              </code>
            </div>
          ) : null}

          <div className="mt-8 rounded-3xl border border-white/10 bg-black/30 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-white">
              <BookOpen className="h-5 w-5 text-purple-400" />
              {copy.scenarioTitle}
            </h2>

            {steps.length > 0 ? (
              <ol className="space-y-3">
                {steps.map((step, index) => (
                  <li
                    key={`${manual.slug}-${index}`}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold leading-6 text-slate-200"
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
              </ol>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold leading-6 text-slate-400">
                {description || copy.notFoundDescription}
              </p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}