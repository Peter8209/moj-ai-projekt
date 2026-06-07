'use client';

import {
  BookOpen,
  ChevronDown,
  FileText,
  Menu,
  PlayCircle,
  Search,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type MobileDashboardModuleInfo = {
  key: string;
  translationKey: string;
};

type MobileDashboardNavigationProps = {
  activeModule: string;
  activeModuleLabel: string;
  activeModuleSubtitle?: string;
  activeProfileTitle?: string;
  activeProfileType?: string;
  moduleInfos: MobileDashboardModuleInfo[];
  t: any;
  onSelectModule: (moduleKey: string) => void;
  onNavigate: (path: string) => void;
};

function normalizeModuleLabel(label: string) {
  const value = String(label || '').trim();

  if (!value) return 'AI nástroj';

  return value
    .replace(/AI\s*supervisor/gi, 'AI školiteľ')
    .replace(/AI\s*supervízor/gi, 'AI školiteľ')
    .replace(/AI\s*vedúci/gi, 'AI školiteľ');
}

export default function MobileDashboardNavigation({
  activeModule,
  activeModuleLabel,
  activeModuleSubtitle,
  activeProfileTitle,
  activeProfileType,
  moduleInfos,
  t,
  onSelectModule,
  onNavigate,
}: MobileDashboardNavigationProps) {
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);

  const cleanActiveModuleLabel = useMemo(() => {
    return normalizeModuleLabel(activeModuleLabel);
  }, [activeModuleLabel]);

  const closeMenus = () => {
    setMainMenuOpen(false);
    setModuleMenuOpen(false);
  };

  const handleNavigate = (path: string) => {
    closeMenus();
    onNavigate(path);
  };

  const handleSelectModule = (moduleKey: string) => {
    closeMenus();
    onSelectModule(moduleKey);
  };

  return (
    <nav className="xl:hidden">
      <div className="space-y-3">
        {/* HLAVNÉ OVLÁDANIE */}
        <div className="rounded-[1.6rem] border border-white/10 bg-[#070b16] p-3 shadow-2xl shadow-black/30">
          <div className="grid grid-cols-[1fr_54px] gap-3">
            <button
              type="button"
              onClick={() => {
                setMainMenuOpen((value) => !value);
                setModuleMenuOpen(false);
              }}
              className="flex min-h-[56px] min-w-0 items-center justify-between rounded-2xl border border-white/10 bg-[#0d1324] px-4 py-3 text-left text-white transition hover:bg-[#121a30]"
              aria-expanded={mainMenuOpen}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white">
                  {mainMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </span>

                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">
                    Menu
                  </span>
                  <span className="block truncate text-[11px] font-bold text-slate-400">
                    Práce, zdroje, profil, videá
                  </span>
                </span>
              </span>

              <ChevronDown
                className={`h-5 w-5 shrink-0 text-violet-300 transition ${
                  mainMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/profile')}
              className="flex h-[56px] w-[54px] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#0d1324] text-white transition hover:bg-[#121a30]"
              aria-label="Profil"
            >
              <User className="h-5 w-5" />
            </button>
          </div>

          {mainMenuOpen ? (
            <div className="mt-3 rounded-3xl border border-white/10 bg-[#050814] p-3">
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => handleNavigate('/dashboard')}
                  className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-violet-600 px-4 py-3 text-left text-sm font-black text-white transition hover:bg-violet-500"
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className="truncate">Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/projects?new=1')}
                  className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-left text-sm font-black text-slate-100 transition hover:bg-white/[0.1]"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">Nová práca</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/projects')}
                  className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-left text-sm font-black text-slate-100 transition hover:bg-white/[0.1]"
                >
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <span className="truncate">Moje práce</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/sources')}
                  className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-left text-sm font-black text-slate-100 transition hover:bg-white/[0.1]"
                >
                  <Search className="h-4 w-4 shrink-0" />
                  <span className="truncate">Zdroje</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/video')}
                  className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-left text-sm font-black text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  <PlayCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">Videonávody</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* AKTÍVNY NÁSTROJ */}
        <div className="rounded-[1.6rem] border border-white/10 bg-[#070b16] p-3 shadow-2xl shadow-black/30">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
                Aktívny nástroj
              </p>

              <p className="mt-1 truncate text-base font-black text-white">
                {cleanActiveModuleLabel}
              </p>
            </div>

            <span className="shrink-0 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-violet-200">
              AI
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setModuleMenuOpen((value) => !value);
              setMainMenuOpen(false);
            }}
            className="flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d1324] px-4 py-3 text-left transition hover:bg-[#121a30]"
            aria-expanded={moduleMenuOpen}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-white">
                Vybrať nástroj
              </span>

              <span className="mt-0.5 block truncate text-[11px] font-bold text-slate-400">
                Preklad, audit, obhajoba, dáta, emaily
              </span>
            </span>

            <ChevronDown
              className={`h-5 w-5 shrink-0 text-violet-300 transition ${
                moduleMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {moduleMenuOpen ? (
            <div className="mt-3 rounded-3xl border border-white/10 bg-[#050814] p-3">
              <p className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                AI nástroje
              </p>

              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {moduleInfos.map((item) => {
                  const active = activeModule === item.key;
                  const rawLabel =
                    t?.dashboardTools?.tools?.[item.translationKey] ||
                    item.translationKey;

                  const label = normalizeModuleLabel(rawLabel);

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelectModule(item.key)}
                      className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                        active
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                          : 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {label}
                      </span>

                      {active ? (
                        <span className="shrink-0 rounded-full bg-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                          Aktívne
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* AKTÍVNA PRÁCA */}
        <div className="rounded-[1.4rem] border border-white/10 bg-[#070b16] px-4 py-3 shadow-lg shadow-black/20">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Aktívna práca
          </p>

          <p className="mt-2 truncate text-sm font-black leading-5 text-white">
            {activeProfileTitle || 'Nie je vybraná žiadna práca'}
          </p>

          {activeProfileType ? (
            <p className="mt-1 truncate text-xs font-semibold text-slate-400">
              {activeProfileType}
            </p>
          ) : null}
        </div>
      </div>
    </nav>
  );
}