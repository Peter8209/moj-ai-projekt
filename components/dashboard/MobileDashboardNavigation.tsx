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
import { useState } from 'react';

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
    <div className="xl:hidden">
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <button
            type="button"
            onClick={() => {
              setMainMenuOpen((value) => !value);
              setModuleMenuOpen(false);
            }}
            className="flex min-h-[58px] items-center justify-between rounded-2xl border border-white/10 bg-[#0b1020] px-4 py-3 text-left text-white shadow-lg shadow-black/30"
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
                <span className="block truncate text-base font-black">
                  Hlavné menu
                </span>
                <span className="block truncate text-xs font-bold text-slate-400">
                  Navigácia, profil, práce a videonávody
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
            className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#0b1020] text-white shadow-lg shadow-black/30"
            aria-label="Profil"
          >
            <User className="h-5 w-5" />
          </button>
        </div>

        {mainMenuOpen && (
          <div className="rounded-3xl border border-white/10 bg-[#070b16] p-3 shadow-2xl shadow-black/40">
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => handleNavigate('/dashboard')}
                className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-violet-600 px-4 py-3 text-left text-sm font-black text-white"
              >
                <Sparkles className="h-4 w-4" />
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/projects?new=1')}
                className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-left text-sm font-black text-slate-100"
              >
                <FileText className="h-4 w-4" />
                Nová práca
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/projects')}
                className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-left text-sm font-black text-slate-100"
              >
                <BookOpen className="h-4 w-4" />
                Moje práce
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/sources')}
                className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-left text-sm font-black text-slate-100"
              >
                <Search className="h-4 w-4" />
                Zdroje
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/video')}
                className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-left text-sm font-black text-cyan-100"
              >
                <PlayCircle className="h-4 w-4" />
                Videonávody
              </button>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-[#0b1020] p-4 shadow-lg shadow-black/30">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-300">
            Aktívny modul
          </p>

          <button
            type="button"
            onClick={() => {
              setModuleMenuOpen((value) => !value);
              setMainMenuOpen(false);
            }}
            className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-left"
          >
            <span className="min-w-0">
              <span className="block truncate text-lg font-black text-white">
                {activeModuleLabel}
              </span>

              <span className="mt-1 block line-clamp-2 text-xs font-bold leading-5 text-slate-400">
                {activeModuleSubtitle ||
                  'Vyberte AI nástroj, s ktorým chcete pracovať.'}
              </span>
            </span>

            <ChevronDown
              className={`h-5 w-5 shrink-0 text-violet-300 transition ${
                moduleMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {moduleMenuOpen && (
            <div className="mt-3 rounded-3xl border border-white/10 bg-[#070b16] p-3">
              <p className="mb-3 px-2 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                AI moduly
              </p>

              <div className="grid gap-2">
                {moduleInfos.map((item) => {
                  const active = activeModule === item.key;
                  const label =
                    t?.dashboardTools?.tools?.[item.translationKey] ||
                    item.translationKey;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelectModule(item.key)}
                      className={`flex min-h-[54px] items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                        active
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                          : 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]'
                      }`}
                    >
                      <span className="pr-3">{label}</span>

                      {active && (
                        <span className="shrink-0 rounded-full bg-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                          Aktívne
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b1020] px-4 py-3 shadow-lg shadow-black/20">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Aktívna práca
          </p>

          <p className="mt-2 line-clamp-2 text-sm font-black leading-5 text-white">
            {activeProfileTitle || 'Nie je vybraná žiadna práca'}
          </p>

          {activeProfileType ? (
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">
              {activeProfileType}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}