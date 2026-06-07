'use client';

import {
  Bot,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  MousePointerClick,
  PlayCircle,
  Sparkles,
  UserCircle2,
} from 'lucide-react';

type AnimatedManualVideoProps = {
  title: string;
  description: string;
  steps: string[];
};

export default function AnimatedManualVideo({
  title,
  description,
  steps,
}: AnimatedManualVideoProps) {
  const safeSteps =
    steps.length > 0
      ? steps
      : [
          'Otvorte aplikáciu Zedpera.',
          'Prejdite do hlavného dashboardu.',
          'Vyberte požadovaný modul.',
          'Vložte zadanie alebo priložte dokument.',
          'Spustite spracovanie.',
        ];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#050711] shadow-2xl shadow-black/50">
      <div className="relative aspect-video w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.20),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_30%),linear-gradient(180deg,#040711_0%,#070b16_100%)]">
        {/* HEADER */}
        <div className="absolute left-6 top-6 z-20 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-950/40">
            <PlayCircle className="h-5 w-5" />
          </span>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">
              AI video manuál
            </p>
            <h2 className="text-base font-black text-white">{title}</h2>
          </div>
        </div>

        <div className="absolute right-6 top-6 z-20 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
          Automatický animovaný režim
        </div>

        {/* LEFT PANEL - APP */}
        <div className="absolute left-[5%] top-[18%] z-10 h-[62%] w-[40%] animate-float-slow rounded-[2rem] border border-white/10 bg-[#0b1020] p-5 shadow-2xl shadow-black/40">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white">
              <LayoutDashboard className="h-5 w-5" />
            </span>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Zedpera
              </p>
              <p className="text-lg font-black text-white">Dashboard</p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="animate-pulse-card rounded-2xl border border-violet-400/30 bg-violet-600 px-4 py-3 text-sm font-black text-white">
              Menu
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-200">
              Profil
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-200">
              AI Chat
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-200">
              Moje práce
            </div>

            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-100">
              Videonávody
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Popis
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
              {description}
            </p>
          </div>
        </div>

        {/* RIGHT PANEL - AI GUIDE */}
        <div className="absolute right-[5%] top-[15%] z-10 h-[68%] w-[46%] animate-float rounded-[2rem] border border-white/10 bg-[#0b1020] p-5 shadow-2xl shadow-black/40">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500 text-white">
                <Bot className="h-5 w-5" />
              </span>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  AI asistent
                </p>
                <p className="text-lg font-black text-white">Sprievodca postupom</p>
              </div>
            </div>

            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
              krok za krokom
            </span>
          </div>

          <div className="space-y-3">
            {safeSteps.slice(0, 6).map((step, index) => (
              <div
                key={`${step}-${index}`}
                className="animate-step rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3"
                style={{
                  animationDelay: `${index * 0.7}s`,
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Krok {index + 1}
                    </p>
                    <p className="mt-1 text-sm font-bold leading-5 text-slate-100">
                      {step}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="mb-2 flex items-center gap-2">
                <UserCircle2 className="h-4 w-4 text-violet-300" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">
                  Používateľ
                </p>
              </div>
              <p className="text-sm font-semibold leading-6 text-slate-300">
                Postupuje podľa krokov a klikaním sa učí používať Zedperu.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  AI pomoc
                </p>
              </div>
              <p className="text-sm font-semibold leading-6 text-slate-300">
                Vysvetľuje jednotlivé časti práce a odporúča ďalší krok.
              </p>
            </div>
          </div>
        </div>

        {/* CURSOR */}
        <div className="absolute left-[36%] top-[48%] z-30 animate-cursor">
          <div className="relative">
            <MousePointerClick className="h-11 w-11 text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.65)]" />
            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-violet-400" />
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="absolute bottom-0 left-0 right-0 z-30 h-24 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-5 left-6 right-6 z-40 flex items-center gap-4">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full animate-progress rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
          </div>

          <span className="text-xs font-black text-white">AUTO PLAY</span>
        </div>
      </div>

      <div className="grid gap-3 border-t border-white/10 bg-[#070b16] p-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <LayoutDashboard className="mb-3 h-5 w-5 text-violet-300" />
          <p className="text-sm font-black text-white">Otvorenie dashboardu</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
            Ukáže hlavné menu, navigáciu a základný vstup do systému.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <FileText className="mb-3 h-5 w-5 text-cyan-300" />
          <p className="text-sm font-black text-white">Práca s modulom</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
            Vyberie správny modul a vysvetlí, čo sa doň zadáva.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <Bot className="mb-3 h-5 w-5 text-emerald-300" />
          <p className="text-sm font-black text-white">AI sprievodca</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
            Animovane vedie používateľa krok po kroku cez Zedperu.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes floatSlow {
          0%,
          100% {
            transform: translateY(0) rotate(-1deg);
          }
          50% {
            transform: translateY(8px) rotate(1deg);
          }
        }

        @keyframes cursorMove {
          0% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(70px, -30px) scale(1.04);
          }
          50% {
            transform: translate(160px, 20px) scale(1);
          }
          75% {
            transform: translate(260px, -40px) scale(1.05);
          }
          100% {
            transform: translate(0, 0) scale(1);
          }
        }

        @keyframes progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }

        @keyframes stepFade {
          0% {
            opacity: 0.25;
            transform: translateX(8px);
          }
          20%,
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulseCard {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.55);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(139, 92, 246, 0);
          }
        }

        .animate-float {
          animation: float 5s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: floatSlow 6s ease-in-out infinite;
        }

        .animate-cursor {
          animation: cursorMove 8s ease-in-out infinite;
        }

        .animate-progress {
          animation: progress 8s linear infinite;
        }

        .animate-step {
          animation: stepFade 4s ease-in-out infinite;
        }

        .animate-pulse-card {
          animation: pulseCard 2.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}