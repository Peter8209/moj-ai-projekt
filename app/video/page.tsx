'use client';

import { useRouter } from 'next/navigation';
import {
  Bot,
  FileCheck2,
  FileText,
  GraduationCap,
  Library,
  Menu,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';

export default function VideoPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* ================= TOP BAR ================= */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
            Menu
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-600/20">
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="leading-tight">
              <div className="text-lg font-black">Zedpera</div>
              <div className="text-xs text-gray-400">
                Akademická AI platforma
              </div>
            </div>
          </div>

          <div className="hidden h-11 w-[92px] sm:block" />
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="min-h-screen w-full p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* ================= HEADER ================= */}
          <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-200">
              <PlayCircle className="h-4 w-4" />
              Návod na používanie platformy
            </div>

            <h1 className="mb-3 text-3xl font-black tracking-tight sm:text-4xl">
              Ako používať Zedpera
            </h1>

            <p className="max-w-3xl text-base text-gray-400 sm:text-lg">
              Pozri si krátke video a prejdi si základné kroky, ako začať písať,
              kontrolovať a pripravovať akademickú prácu pomocou AI.
            </p>
          </div>

          {/* ================= VIDEO ================= */}
          <div className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/20">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="text-lg font-black">Video návod</h2>

              <p className="mt-1 text-sm text-gray-400">
                Tu môžeš vložiť vlastné prezentačné alebo školiteľské video.
              </p>
            </div>

            <iframe
              className="h-[260px] w-full sm:h-[420px] lg:h-[520px]"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="Zedpera návod"
              allowFullScreen
            />
          </div>

          {/* ================= KROKY ================= */}
          <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Step
              number="1"
              title="Vyplň profil práce"
              text="Zadaj tému, typ práce, metodológiu, jazyk, citačný štýl a ďalšie základné údaje."
              action={() => router.push('/profile')}
              button="Prejsť do profilu"
              icon={User}
            />

            <Step
              number="2"
              title="Nahraj zdroje"
              text="Pridaj PDF, články, poznámky alebo vlastné materiály, z ktorých má AI vychádzať."
              action={() => router.push('/sources')}
              button="Nahrať zdroje"
              icon={Library}
            />

            <Step
              number="3"
              title="Generuj text"
              text="Napíš zadanie a AI vytvorí text v akademickom štýle podľa profilu tvojej práce."
              action={() => router.push('/chat')}
              button="Začať písať"
              icon={Bot}
            />

            <Step
              number="4"
              title="AI vedúci práce"
              text="Získaj spätnú väzbu k logike, metodológii, argumentácii a kvalite spracovania."
              action={() => router.push('/chat?mode=supervisor')}
              button="Skontrolovať prácu"
              icon={GraduationCap}
            />

            <Step
              number="5"
              title="Obhajoba"
              text="Trénuj otázky komisie, odpovede a argumentáciu pred samotnou obhajobou."
              action={() => router.push('/chat?mode=defense')}
              button="Tréning obhajoby"
              icon={ShieldCheck}
            />

            <Step
              number="6"
              title="Kontrola plagiátorstva"
              text="Skontroluj originalitu a rizikové pasáže textu pred finálnym odovzdaním."
              action={() => router.push('/chat?mode=audit')}
              button="Skontrolovať text"
              icon={Search}
            />
          </div>

          {/* ================= CTA ================= */}
          <div className="rounded-3xl border border-violet-400/20 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-blue-600/20 p-6 text-center">
            <h2 className="mb-2 text-2xl font-black">Pripravený začať?</h2>

            <p className="mx-auto mb-6 max-w-2xl text-gray-300">
              Prejdi do AI chatu alebo si najskôr nastav profil práce, aby boli
              výstupy presnejšie a profesionálnejšie.
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push('/profile')}
                className="rounded-2xl border border-white/10 bg-white/10 px-7 py-4 font-bold text-white transition hover:bg-white/15"
              >
                Nastaviť profil práce
              </button>

              <button
                type="button"
                onClick={() => router.push('/chat')}
                className="rounded-2xl bg-violet-600 px-8 py-4 font-bold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500"
              >
                Začať pracovať
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ================= STEP COMPONENT =================

function Step({
  number,
  title,
  text,
  action,
  button,
  icon: Icon,
}: {
  number: string;
  title: string;
  text: string;
  action: () => void;
  button: string;
  icon: any;
}) {
  return (
    <div className="group rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-400/40 hover:bg-white/[0.06]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-300">
          <Icon className="h-6 w-6" />
        </div>

        <div className="text-2xl font-black text-violet-400">{number}.</div>
      </div>

      <h3 className="text-xl font-black">{title}</h3>

      <p className="mt-3 min-h-[54px] text-sm leading-relaxed text-gray-400">
        {text}
      </p>

      <button
        type="button"
        onClick={action}
        className="mt-5 rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-600"
      >
        {button}
      </button>
    </div>
  );
}