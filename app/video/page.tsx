'use client';

import { useMemo, useRef, useState, type RefObject } from 'react';
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

type VideoTutorial = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  category: string;
  duration: string;
  src: string;
  poster: string;
  description: string;
  avatarLine: string;
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
    poster: '/videos/zedpera/01_hlavne_menu.png',
    description:
      'Profesionálny úvod do hlavného menu Zedpera. Používateľ sa naučí, kde nájde dashboard, profil, AI moduly, práce, zdroje, balíčky, históriu a videonávody.',
    avatarLine:
      'Vitajte v Zedpere. Ukážem vám, kde sa nachádzajú hlavné časti systému a ako sa v aplikácii pohybovať.',
    steps: [
      'Otvorte aplikáciu Zedpera a prihláste sa.',
      'Po prihlásení sa zobrazí hlavný dashboard.',
      'V hlavnom menu nájdete sekcie Profil, AI Chat, Moje práce, Zdroje, Balíčky, História a Video návod.',
      'Kliknutím na jednotlivé položky sa presúvate medzi časťami systému.',
      'Ak chcete pracovať s AI modulmi, vráťte sa na dashboard.',
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
    poster: '/videos/zedpera/02_profil.png',
    description:
      'Manuál vysvetľuje, kde sa nachádza profil používateľa, ako skontrolovať údaje účtu, aktívny balík a základné nastavenia.',
    avatarLine:
      'Profil používateľa je dôležitý pre správne nastavenie účtu, balíka a personalizáciu práce so systémom.',
    steps: [
      'Kliknite na položku Profil.',
      'Skontrolujte základné údaje používateľa.',
      'Overte aktívny balík a dostupné limity.',
      'Doplňte alebo upravte chýbajúce údaje.',
      'Po kontrole sa vráťte späť na dashboard.',
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
    poster: '/videos/zedpera/03_ai_chat.png',
    description:
      'AI Chat pomáha vytvárať odborný text, osnovy, kapitoly, návrhy, úpravy a vysvetlenia podľa zadania používateľa.',
    avatarLine:
      'Do AI chatu vždy píšte presné zadanie. Čím lepší kontext zadáte, tým kvalitnejší výstup získate.',
    steps: [
      'Otvorte sekciu AI Chat.',
      'Do textového poľa vložte presné zadanie.',
      'Uveďte, aký typ textu chcete vytvoriť.',
      'Ak máte vyplnený profil práce, AI odpoveď prispôsobí téme.',
      'Odošlite zadanie a počkajte na odpoveď.',
    ],
  },
  {
    id: 'moje-prace',
    order: 4,
    title: 'Moje práce',
    subtitle: 'Správa rozpracovaných prác',
    category: 'Práce',
    duration: '60 sekúnd',
    src: '/videos/zedpera/04_moje_prace.mp4',
    poster: '/videos/zedpera/04_moje_prace.png',
    description:
      'Používateľ sa naučí spravovať uložené práce, vybrať aktívnu prácu a pokračovať v rozpracovanom projekte.',
    avatarLine:
      'V sekcii Moje práce si vyberáte, s ktorou prácou bude Zedpera ďalej pracovať.',
    steps: [
      'Kliknite na Moje práce.',
      'Pozrite si zoznam uložených prác.',
      'Vyberte prácu, s ktorou chcete pokračovať.',
      'Skontrolujte, či je označená ako aktívna.',
      'Po návrate na dashboard budú moduly používať vybraný profil.',
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
    poster: '/videos/zedpera/05_nova_praca.png',
    description:
      'Detailný postup vytvorenia novej akademickej práce vrátane názvu, témy, cieľa, metodológie, jazyka, citácií a kľúčových slov.',
    avatarLine:
      'Profil práce je základ. Podľa neho sa budú správať všetky AI moduly v systéme.',
    steps: [
      'Kliknite na Nová práca.',
      'Vyberte typ práce.',
      'Doplňte názov, tému, odbor a jazyk práce.',
      'Vyplňte cieľ práce, metodológiu, hypotézy alebo výskumné otázky.',
      'Vyberte citačnú normu.',
      'Profil práce uložte.',
    ],
  },
  {
    id: 'ai-veduci',
    order: 6,
    title: 'AI školiteľ',
    subtitle: 'Odborná spätná väzba',
    category: 'AI nástroje',
    duration: '75 sekúnd',
    src: '/videos/zedpera/06_ai_veduci.mp4',
    poster: '/videos/zedpera/06_ai_veduci.png',
    description:
      'AI školiteľ kontroluje logiku, štruktúru, nadväznosť, metodológiu, cieľ práce a odbornú kvalitu textu.',
    avatarLine:
      'AI školiteľ vám pomôže nájsť slabé miesta práce a navrhne konkrétne zlepšenia.',
    steps: [
      'Na dashboarde vyberte modul AI školiteľ.',
      'Skontrolujte aktívny profil práce.',
      'Vložte text alebo priložte dokument.',
      'Spustite kontrolu.',
      'Prečítajte si silné stránky, slabé stránky a odporúčané úpravy.',
    ],
  },
  {
    id: 'audit-kvality',
    order: 7,
    title: 'Audit kvality',
    subtitle: 'Kontrola akademického textu',
    category: 'Kontrola',
    duration: '75 sekúnd',
    src: '/videos/zedpera/07_audit_kvality.mp4',
    poster: '/videos/zedpera/07_audit_kvality.png',
    description:
      'Audit kvality kontroluje štylistiku, citácie, logiku, metodológiu, odbornú presnosť a celkovú úroveň práce.',
    avatarLine:
      'Audit kvality používajte pred odovzdaním textu alebo pri väčších úpravách práce.',
    steps: [
      'Kliknite na Audit kvality.',
      'Vyberte typ kontroly.',
      'Vložte text alebo nahrajte dokument.',
      'Spustite audit.',
      'Prejdite nájdené problémy a odporúčané opravy.',
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
    poster: '/videos/zedpera/08_obhajoba.png',
    description:
      'Modul Obhajoba pripraví podklady na prezentáciu, sprievodný text, otázky komisie a odporúčané odpovede.',
    avatarLine:
      'Pri obhajobe je dôležité vedieť stručne vysvetliť cieľ, metodológiu, výsledky a prínos práce.',
    steps: [
      'Otvorte modul Obhajoba.',
      'Skontrolujte, či máte vyplnený profil práce.',
      'Vložte obsah práce alebo nahrajte dokument.',
      'Spustite generovanie podkladov.',
      'Skontrolujte otázky komisie a odporúčané odpovede.',
      'Výstup exportujte do Wordu, PDF alebo PPTX.',
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
    poster: '/videos/zedpera/09_preklad.png',
    description:
      'Preklad umožňuje prekladať odborné, akademické a formálne texty podľa zvoleného jazyka a štýlu.',
    avatarLine:
      'Pri preklade si vždy vyberte zdrojový jazyk, cieľový jazyk a štýl prekladu.',
    steps: [
      'Otvorte modul Preklad.',
      'Vyberte jazyk, z ktorého sa prekladá.',
      'Vyberte cieľový jazyk.',
      'Zvoľte štýl prekladu.',
      'Vložte text a spustite preklad.',
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
    poster: '/videos/zedpera/10_analyza_dat.png',
    description:
      'Analýza dát pomáha spracovať tabuľky, dotazníky, premenné, grafy a štatistické výsledky.',
    avatarLine:
      'Nahrajte Excel alebo CSV a Zedpera pripraví interpretáciu, tabuľky a odporúčané testy.',
    steps: [
      'Otvorte modul Analýza dát.',
      'Nahrajte Excel, CSV alebo iný podporovaný súbor.',
      'Doplňte, čo chcete analyzovať.',
      'Spustite spracovanie.',
      'Pozrite si premenné, tabuľky a odporúčané testy.',
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
    poster: '/videos/zedpera/11_planovanie.png',
    description:
      'Plánovanie vytvorí harmonogram písania práce, rozdelí úlohy a pomôže kontrolovať termíny.',
    avatarLine:
      'Zadajte termín odovzdania a aktuálny stav práce. Systém navrhne realistický plán.',
    steps: [
      'Otvorte modul Plánovanie.',
      'Zadajte termín odovzdania.',
      'Doplňte aktuálny stav práce.',
      'Spustite vytvorenie harmonogramu.',
      'Skontrolujte navrhnuté úlohy a dátumy.',
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
    poster: '/videos/zedpera/12_emaily.png',
    description:
      'Modul Emaily pripraví profesionálne emaily pre vedúceho práce, vyučujúceho, školu alebo administratívu.',
    avatarLine:
      'Vyberte typ emailu, tón komunikácie a napíšte, čo potrebujete oznámiť.',
    steps: [
      'Otvorte modul Emaily.',
      'Vyberte typ emailu.',
      'Vyberte tón komunikácie.',
      'Napíšte obsah požiadavky.',
      'Spustite generovanie a skopírujte výsledok.',
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
    poster: '/videos/zedpera/13_originalita_prace.png',
    description:
      'Originalita práce pomáha nájsť rizikové, všeobecné alebo nedostatočne odcitované pasáže.',
    avatarLine:
      'Tento modul slúži ako orientačná pomôcka pri kontrole textu a citácií.',
    steps: [
      'Otvorte Originalitu práce.',
      'Vložte text.',
      'Spustite kontrolu.',
      'Skontrolujte rizikové pasáže.',
      'Doplňte alebo opravte citácie.',
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
    poster: '/videos/zedpera/14_humanizacia_textu.png',
    description:
      'Humanizácia upraví text tak, aby pôsobil prirodzenejšie, čitateľnejšie a menej strojovo.',
    avatarLine:
      'Vložte text a nechajte systém upraviť jeho plynulosť, prirodzenosť a akademický tón.',
    steps: [
      'Otvorte Humanizáciu textu.',
      'Vložte text, ktorý chcete upraviť.',
      'Vyberte štýl úpravy.',
      'Spustite humanizáciu.',
      'Porovnajte pôvodný a upravený text.',
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
    poster: '/videos/zedpera/15_zdroje_citacie.png',
    description:
      'Sekcia Zdroje slúži na prácu s literatúrou, odbornými článkami, citáciami a bibliografickými údajmi.',
    avatarLine:
      'Pri práci so zdrojmi si vždy overte autora, rok, názov, vydavateľa a citačnú normu.',
    steps: [
      'Kliknite na Zdroje.',
      'Zadajte tému alebo kľúčové slová.',
      'Vyberte vhodné odborné zdroje.',
      'Skontrolujte bibliografické údaje.',
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
    poster: '/videos/zedpera/16_balicky.png',
    description:
      'Balíčky určujú mesačné limity strán, AI kontroly, audity, obhajoby a dostupné funkcie.',
    avatarLine:
      'Vyberte si balík podľa toho, koľko prác, strán, auditov a obhajob potrebujete.',
    steps: [
      'Otvorte sekciu Balíčky.',
      'Porovnajte dostupné programy.',
      'Skontrolujte limity strán, auditov a obhajob.',
      'Vyberte vhodný balíček.',
      'Pokračujte podľa pokynov systému.',
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
    poster: '/videos/zedpera/17_historia_chatu.png',
    description:
      'História chatu uchováva staršie odpovede, osnovy, kapitoly, audity a pripravené výstupy.',
    avatarLine:
      'História vám umožní vrátiť sa k starším výstupom bez straty kontextu.',
    steps: [
      'Kliknite na História chatu.',
      'Vyhľadajte staršiu konverzáciu.',
      'Otvorte konkrétny výstup.',
      'Skopírujte alebo znova použite uložený text.',
      'Pokračujte v práci.',
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
    poster: '/videos/zedpera/18_video_navod.png',
    description:
      'Sekcia Video návod obsahuje jednoduché návody ku všetkým hlavným funkciám aplikácie.',
    avatarLine:
      'Tu nájdete všetky návody na jednom mieste. Vyberte sekciu, ktorú chcete vysvetliť.',
    steps: [
      'Otvorte Video návod.',
      'Vyberte požadovanú časť aplikácie.',
      'Pozrite si krátky postup používania.',
      'Postupujte podľa krokov pod videom.',
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
    poster: '/videos/zedpera/19_vzhlad_aplikacie.png',
    description:
      'Návod ukazuje prepínanie medzi svetlým a tmavým režimom aplikácie.',
    avatarLine:
      'Vyberte režim, ktorý je pre vás najčitateľnejší a najpohodlnejší.',
    steps: [
      'Nájdite ikonu vzhľadu aplikácie.',
      'Kliknutím prepnite režim.',
      'Vyberte svetlý alebo tmavý režim.',
      'Skontrolujte čitateľnosť obrazovky.',
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
    poster: '/videos/zedpera/20_odhlasenie.png',
    description:
      'Odhlásenie bezpečne ukončí prácu v účte, najmä pri používaní školského alebo zdieľaného počítača.',
    avatarLine:
      'Po ukončení práce sa vždy odhláste, najmä ak používate zdieľané zariadenie.',
    steps: [
      'Kliknite na používateľské menu alebo profil.',
      'Vyberte možnosť Odhlásiť sa.',
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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial>(
    videoTutorials[0],
  );
  const [selectedCategory, setSelectedCategory] = useState('Všetko');
  const [search, setSearch] = useState('');
  const [videoError, setVideoError] = useState(false);

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
          item.avatarLine,
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
    setVideoError(false);

    setTimeout(() => {
      topRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {
          // Autoplay môže byť blokovaný prehliadačom.
        });
      }
    }, 120);
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
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20"
          >
            <Menu size={18} />
            Menu
          </button>

          <div className="hidden text-sm font-semibold text-slate-400 sm:block">
            Profesionálne manuály Zedpera
          </div>

          <button
            type="button"
            onClick={goToMenu}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-purple-400/30 bg-purple-600/20 px-4 py-2 text-sm font-black text-purple-100 transition hover:bg-purple-600/30"
          >
            <ArrowLeft size={18} />
            Späť do menu
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-black text-purple-200">
            <Video size={16} />
            Video manuály s AI sprievodcom
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Video návody Zedpera
          </h1>

          <p className="mt-3 max-w-3xl text-lg font-semibold leading-8 text-slate-300">
            Každý manuál obsahuje správne priradené video, farebného AI
            sprievodcu, pohybujúci sa kurzor a detailný scenár práce so
            Zedperou krok za krokom.
          </p>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[#0f172a] p-4 shadow-2xl shadow-black/30 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-black uppercase tracking-wide text-purple-300">
                  Práve prehrávate
                </div>

                <h2 className="mt-1 text-2xl font-black text-white">
                  {selectedVideo.order}. {selectedVideo.title}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-300">
                  {selectedVideo.subtitle}
                </p>
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
              onVideoError={() => setVideoError(true)}
            />

            <ScenarioPanel video={selectedVideo} />
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-[#050816] p-4 shadow-2xl shadow-black/30 sm:p-6">
            <div className="mb-4">
              <h3 className="text-2xl font-black text-white">
                Zoznam návodov
              </h3>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                Kliknite na manuál. Vľavo sa spustí správne video a zobrazí sa
                jeho profesionálny scenár.
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

              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-purple-100">
                Najskôr si pozrite Hlavné menu, Profil používateľa, Novú prácu,
                AI Chat, AI školiteľa a Obhajobu. Tieto návody vysvetľujú
                základný spôsob práce so Zedperou.
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

function ProfessionalVideoPlayer({
  video,
  videoRef,
  videoError,
  onVideoError,
}: {
  video: VideoTutorial;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoError: boolean;
  onVideoError: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
      <div className="relative aspect-video overflow-hidden bg-[#020617]">
        {!videoError ? (
          <video
            key={video.src}
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            poster={video.poster}
            className="h-full w-full bg-black object-contain"
            onError={onVideoError}
          >
            <source src={video.src} type="video/mp4" />
            Váš prehliadač nepodporuje prehrávanie videa.
          </video>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#050816] p-8 text-center">
            <div>
              <Bot className="mx-auto mb-4 h-12 w-12 text-purple-300" />

              <p className="text-xl font-black text-white">
                Video súbor sa nenašiel
              </p>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Skontrolujte, či je MP4 uložené v priečinku
                public/videos/zedpera a či názov súboru presne zodpovedá tomuto
                odkazu:
              </p>

              <code className="mt-4 inline-block rounded-xl bg-black/50 px-4 py-3 text-xs font-bold text-purple-200">
                {video.src}
              </code>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 backdrop-blur-xl">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-purple-200">
            AI sprievodca
          </div>

          <div className="mt-1 max-w-md text-sm font-bold leading-5 text-white">
            {video.avatarLine}
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 top-4 z-20 flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 backdrop-blur-xl">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-purple-950/40">
            <Bot className="h-6 w-6 text-white" />
            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-400" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              Zedpera Bot
            </p>

            <p className="text-xs font-bold text-slate-200">
              vedie používateľa krok za krokom
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

function ScenarioPanel({ video }: { video: VideoTutorial }) {
  return (
    <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-5">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="text-purple-400" size={22} />

        <h3 className="text-xl font-black text-white">
          Scenár a postup manuálu
        </h3>
      </div>

      <p className="text-sm font-semibold leading-7 text-slate-300">
        {video.description}
      </p>

      <ul className="mt-4 space-y-3">
        {video.steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-slate-200">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />

            <span>
              <strong className="text-white">Krok {index + 1}: </strong>
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
            <p className="font-black text-white">
              Text sprievodcu
            </p>

            <p className="mt-1 text-sm font-semibold leading-6 text-purple-100">
              {video.avatarLine}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}