'use client';

import { useMemo, useRef, useState } from 'react';
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
  Video,
} from 'lucide-react';

type VideoTutorial = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  category: string;
  duration: string;
  src: string;
  description: string;
  steps: string[];
};

const videoTutorials: VideoTutorial[] = [
  {
    id: 'hlavne-menu',
    order: 1,
    title: 'Hlavné menu Zedpera',
    subtitle: 'Orientácia v aplikácii',
    category: 'Základy',
    duration: '45 sekúnd',
    src: '/videos/zedpera/01_hlavne_menu.mp4',
    description:
      'Ukážka hlavného menu, bočnej navigácie a základných častí aplikácie Zedpera.',
    steps: [
      'Otvorte hlavný dashboard.',
      'Pozrite si ľavé menu aplikácie.',
      'Prejdite jednotlivé sekcie: Profil, AI Chat, Moje práce, Zdroje, Balíčky a História.',
    ],
  },
  {
    id: 'profil',
    order: 2,
    title: 'Profil používateľa',
    subtitle: 'Účet, balík a nastavenia',
    category: 'Profil',
    duration: '60 sekúnd',
    src: '/videos/zedpera/02_profil.mp4',
    description:
      'Návod vysvetľuje, kde sa nachádza profil používateľa a prečo je dôležitý.',
    steps: [
      'Kliknite na položku Profil.',
      'Skontrolujte údaje používateľa.',
      'Overte aktívny balík a základné nastavenia.',
    ],
  },
  {
    id: 'ai-chat',
    order: 3,
    title: 'AI Chat',
    subtitle: 'Písanie a úprava textu',
    category: 'AI nástroje',
    duration: '75 sekúnd',
    src: '/videos/zedpera/03_ai_chat.mp4',
    description:
      'Ukážka používania AI chatu na vytváranie odborného textu, kapitol a úprav.',
    steps: [
      'Otvorte sekciu AI Chat.',
      'Do poľa vložte presné zadanie.',
      'Použite výstup ako základ pre odborný text.',
    ],
  },
  {
    id: 'moje-prace',
    order: 4,
    title: 'Moje práce',
    subtitle: 'Zoznam rozpracovaných prác',
    category: 'Práce',
    duration: '60 sekúnd',
    src: '/videos/zedpera/04_moje_prace.mp4',
    description:
      'Návod ukazuje správu uložených, rozpracovaných a aktívnych prác.',
    steps: [
      'Kliknite na Moje práce.',
      'Vyberte existujúcu prácu.',
      'Alebo vytvorte novú prácu.',
    ],
  },
  {
    id: 'nova-praca',
    order: 5,
    title: 'Nová práca',
    subtitle: 'Vytvorenie profilu práce',
    category: 'Práce',
    duration: '90 sekúnd',
    src: '/videos/zedpera/05_nova_praca.mp4',
    description:
      'Návod vysvetľuje vytvorenie novej akademickej práce krok za krokom.',
    steps: [
      'Kliknite na Nová práca.',
      'Vyberte typ práce.',
      'Doplňte názov, odbor, jazyk, cieľ, metodológiu a kľúčové slová.',
    ],
  },
  {
    id: 'ai-veduci',
    order: 6,
    title: 'AI vedúci',
    subtitle: 'Odborná spätná väzba',
    category: 'AI nástroje',
    duration: '75 sekúnd',
    src: '/videos/zedpera/06_ai_veduci.mp4',
    description:
      'AI vedúci pomáha kontrolovať logiku, štýl, nadväznosť a kvalitu textu.',
    steps: [
      'Otvorte funkciu AI vedúci.',
      'Vložte text alebo kapitolu práce.',
      'Prečítajte si odporúčania a zapracujte úpravy.',
    ],
  },
  {
    id: 'audit-kvality',
    order: 7,
    title: 'Audit kvality',
    subtitle: 'Kontrola celej práce',
    category: 'Kontrola',
    duration: '75 sekúnd',
    src: '/videos/zedpera/07_audit_kvality.mp4',
    description:
      'Audit kvality kontroluje štruktúru, cieľ, metodológiu, logiku a odbornú úroveň práce.',
    steps: [
      'Kliknite na Audit kvality.',
      'Vložte text alebo dokument.',
      'Spustite kontrolu a prejdite odporúčania.',
    ],
  },
  {
    id: 'obhajoba',
    order: 8,
    title: 'Obhajoba',
    subtitle: 'Prezentácia, otázky a odpovede',
    category: 'Obhajoba',
    duration: '90 sekúnd',
    src: '/videos/zedpera/08_obhajoba.mp4',
    description:
      'Návod ukazuje prípravu sprievodného textu, otázok komisie a podkladov k prezentácii.',
    steps: [
      'Otvorte sekciu Obhajoba.',
      'Vložte obsah práce alebo nahrajte dokument.',
      'Vygenerujte sprievodný text prezentácie.',
    ],
  },
  {
    id: 'preklad',
    order: 9,
    title: 'Preklad',
    subtitle: 'Preklad odborného textu',
    category: 'AI nástroje',
    duration: '60 sekúnd',
    src: '/videos/zedpera/09_preklad.mp4',
    description:
      'Preklad slúži na odborný, akademický alebo formálny preklad textov.',
    steps: [
      'Otvorte sekciu Preklad.',
      'Vložte text.',
      'Zadajte cieľový jazyk a štýl prekladu.',
    ],
  },
  {
    id: 'analyza-dat',
    order: 10,
    title: 'Analýza dát',
    subtitle: 'Tabuľky, grafy a výsledky',
    category: 'Výskum',
    duration: '75 sekúnd',
    src: '/videos/zedpera/10_analyza_dat.mp4',
    description:
      'Analýza dát pomáha interpretovať tabuľky, dotazníky, grafy a štatistické výstupy.',
    steps: [
      'Otvorte Analýzu dát.',
      'Vložte údaje alebo výsledky.',
      'Použite výstup do praktickej alebo výskumnej časti.',
    ],
  },
  {
    id: 'planovanie',
    order: 11,
    title: 'Plánovanie',
    subtitle: 'Harmonogram písania práce',
    category: 'Organizácia',
    duration: '60 sekúnd',
    src: '/videos/zedpera/11_planovanie.mp4',
    description:
      'Plánovanie pomáha rozdeliť písanie práce na kapitoly, úlohy a termíny.',
    steps: [
      'Otvorte Plánovanie.',
      'Zadajte termín odovzdania.',
      'Vytvorte plán písania práce.',
    ],
  },
  {
    id: 'emaily',
    order: 12,
    title: 'Emaily',
    subtitle: 'Profesionálna komunikácia',
    category: 'Komunikácia',
    duration: '60 sekúnd',
    src: '/videos/zedpera/12_emaily.mp4',
    description:
      'Sekcia Emaily pripraví formálnu komunikáciu pre vedúceho práce alebo školu.',
    steps: [
      'Otvorte Emaily.',
      'Napíšte komu má byť e-mail určený.',
      'Doplňte, čo potrebujete oznámiť.',
    ],
  },
  {
    id: 'originalita-prace',
    order: 13,
    title: 'Originalita práce',
    subtitle: 'Orientačná kontrola textu',
    category: 'Kontrola',
    duration: '60 sekúnd',
    src: '/videos/zedpera/13_originalita_prace.mp4',
    description:
      'Originalita práce pomáha nájsť rizikové, všeobecné alebo nedostatočne odcitované pasáže.',
    steps: [
      'Otvorte Originalitu práce.',
      'Vložte text.',
      'Skontrolujte rizikové pasáže a odporúčania.',
    ],
  },
  {
    id: 'humanizacia-textu',
    order: 14,
    title: 'Humanizácia textu',
    subtitle: 'Prirodzenejší akademický štýl',
    category: 'AI nástroje',
    duration: '60 sekúnd',
    src: '/videos/zedpera/14_humanizacia_textu.mp4',
    description:
      'Humanizácia upraví text tak, aby pôsobil prirodzenejšie a čitateľnejšie.',
    steps: [
      'Otvorte Humanizáciu textu.',
      'Vložte text.',
      'Vyberte odborný, akademický alebo formálny štýl.',
    ],
  },
  {
    id: 'zdroje-citacie',
    order: 15,
    title: 'Zdroje a citácie',
    subtitle: 'Literatúra a citačné záznamy',
    category: 'Zdroje',
    duration: '75 sekúnd',
    src: '/videos/zedpera/15_zdroje_citacie.mp4',
    description:
      'Sekcia Zdroje slúži na prácu s literatúrou, citáciami a použitými zdrojmi.',
    steps: [
      'Kliknite na Zdroje.',
      'Doplňte knihu, článok, web alebo legislatívu.',
      'Použite zdroje v texte práce.',
    ],
  },
  {
    id: 'balicky',
    order: 16,
    title: 'Balíčky',
    subtitle: 'Predplatné a doplnkové služby',
    category: 'Platby',
    duration: '75 sekúnd',
    src: '/videos/zedpera/16_balicky.mp4',
    description:
      'Balíčky určujú mesačné limity strán, AI kontroly, audity, obhajoby a AI kredity.',
    steps: [
      'Otvorte Balíčky.',
      'Vyberte mesačný plán.',
      'Podľa potreby pridajte doplnkovú službu.',
    ],
  },
  {
    id: 'historia-chatu',
    order: 17,
    title: 'História chatu',
    subtitle: 'Uložené konverzácie a výstupy',
    category: 'História',
    duration: '60 sekúnd',
    src: '/videos/zedpera/17_historia_chatu.mp4',
    description:
      'História chatu uchováva staršie odpovede, osnovy, kapitoly a pripravené výstupy.',
    steps: [
      'Kliknite na História chatu.',
      'Vyberte staršiu konverzáciu.',
      'Pokračujte v práci s uloženým výstupom.',
    ],
  },
  {
    id: 'video-navod',
    order: 18,
    title: 'Video návod',
    subtitle: 'Postupy používania aplikácie',
    category: 'Pomoc',
    duration: '30 sekúnd',
    src: '/videos/zedpera/18_video_navod.mp4',
    description:
      'Sekcia Video návod obsahuje jednoduché návody ku všetkým hlavným funkciám aplikácie.',
    steps: [
      'Otvorte Video návod.',
      'Vyberte požadovanú časť aplikácie.',
      'Pozrite si krátky postup používania.',
    ],
  },
  {
    id: 'vzhlad-aplikacie',
    order: 19,
    title: 'Svetlý a tmavý režim',
    subtitle: 'Prepnutie vzhľadu aplikácie',
    category: 'Nastavenia',
    duration: '30 sekúnd',
    src: '/videos/zedpera/19_vzhlad_aplikacie.mp4',
    description:
      'Návod ukazuje prepínanie medzi svetlým a tmavým režimom aplikácie.',
    steps: [
      'Nájdite ikonu slnka alebo mesiaca.',
      'Kliknutím prepnite vzhľad.',
      'Vyberte režim, ktorý vám vyhovuje.',
    ],
  },
  {
    id: 'odhlasenie',
    order: 20,
    title: 'Odhlásenie',
    subtitle: 'Bezpečné ukončenie práce',
    category: 'Účet',
    duration: '30 sekúnd',
    src: '/videos/zedpera/20_odhlasenie.mp4',
    description:
      'Odhlásenie bezpečne ukončí účet, najmä pri používaní školského alebo zdieľaného počítača.',
    steps: [
      'Kliknite na Odhlásiť sa.',
      'Počkajte na ukončenie relácie.',
      'Účet je bezpečne odhlásený.',
    ],
  },
];

const categories = [
  'Všetko',
  'Základy',
  'Profil',
  'Práce',
  'AI nástroje',
  'Kontrola',
  'Obhajoba',
  'Výskum',
  'Organizácia',
  'Komunikácia',
  'Zdroje',
  'Platby',
  'História',
  'Pomoc',
  'Nastavenia',
  'Účet',
];

export default function VideoNavodPage() {
  const router = useRouter();
  const topRef = useRef<HTMLDivElement | null>(null);

  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial>(
    videoTutorials[0],
  );
  const [selectedCategory, setSelectedCategory] = useState('Všetko');
  const [search, setSearch] = useState('');

  const filteredVideos = useMemo(() => {
    const q = search.trim().toLowerCase();

    return videoTutorials.filter((item) => {
      const matchesCategory =
        selectedCategory === 'Všetko' || item.category === selectedCategory;

      const matchesSearch =
        !q ||
        [
          item.title,
          item.subtitle,
          item.category,
          item.description,
          ...item.steps,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, search]);

  const goToMenu = () => {
    router.push('/dashboard');
  };

  const playVideo = (video: VideoTutorial) => {
    setSelectedVideo(video);

    setTimeout(() => {
      topRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  };

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
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
          >
            <Menu size={18} />
            Menu
          </button>

          <div className="hidden text-sm font-semibold text-slate-400 sm:block">
            Video návody Zedpera
          </div>

          <button
            type="button"
            onClick={goToMenu}
            className="inline-flex items-center gap-2 rounded-2xl border border-purple-400/30 bg-purple-600/20 px-4 py-2 text-sm font-bold text-purple-100 transition hover:bg-purple-600/30"
          >
            <ArrowLeft size={18} />
            Späť do menu
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200">
            <Video size={16} />
            Postup používania aplikácie
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Video návody
          </h1>

          <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-300">
            Krátke a jednoduché návody ku každej hlavnej časti Zedpery.
            Vyberte si funkciu, pozrite video a postupujte podľa krokov.
          </p>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[#0f172a] p-4 shadow-2xl shadow-black/30 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-bold uppercase tracking-wide text-purple-300">
                  Práve prehrávate
                </div>

                <h2 className="mt-1 text-2xl font-black text-white">
                  {selectedVideo.order}. {selectedVideo.title}
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  {selectedVideo.subtitle}
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-bold text-slate-200">
                <Clock size={16} />
                {selectedVideo.duration}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
              <video
                key={selectedVideo.src}
                controls
                preload="metadata"
                className="aspect-video w-full bg-black"
              >
                <source src={selectedVideo.src} type="video/mp4" />
                Váš prehliadač nepodporuje prehrávanie videa.
              </video>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="mb-3 flex items-center gap-2">
                <BookOpen className="text-purple-400" size={22} />

                <h3 className="text-xl font-black text-white">
                  Čo sa v tomto návode naučíte
                </h3>
              </div>

              <p className="text-sm leading-7 text-slate-300">
                {selectedVideo.description}
              </p>

              <ul className="mt-4 space-y-3">
                {selectedVideo.steps.map((step) => (
                  <li key={step} className="flex gap-3 text-sm text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-[#050816] p-4 shadow-2xl shadow-black/30 sm:p-6">
            <div className="mb-4">
              <h3 className="text-2xl font-black text-white">
                Zoznam návodov
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Kliknite na video, ktoré chcete prehrať.
              </p>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Hľadať video návod..."
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
                  Nenašiel sa žiadny video návod.
                </div>
              ) : (
                filteredVideos.map((video) => {
                  const active = selectedVideo.id === video.id;

                  return (
                    <button
                      key={video.id}
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
                              {video.order}. {video.title}
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
                Odporúčaný postup pre nového používateľa
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-purple-100">
                Najskôr si pozrite Hlavné menu, Profil používateľa, Novú prácu,
                AI Chat a Obhajobu. Tieto návody vysvetľujú základný spôsob
                práce so Zedperou.
              </p>
            </div>

            <button
              type="button"
              onClick={() => playVideo(videoTutorials[0])}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-4 text-sm font-black text-white transition hover:bg-purple-500"
            >
              <Home size={18} />
              Spustiť od začiatku
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}