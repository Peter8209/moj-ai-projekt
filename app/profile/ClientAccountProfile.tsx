'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Crown,
  FileText,
  Loader2,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  UserCircle,
  WalletCards,
} from 'lucide-react';

type JsonRecord = Record<string, unknown>;

type ClientProfile = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  selectedPlan: string;
  accountStatus: string;
  packageName: string;
  packageLabel: string;
  credits: number | null;
  usedCredits: number | null;
  remainingCredits: number | null;
  maxProjects: number | null;
  projectsCount: number | null;
  activeServices: string[];
  activatedFeatures: string[];
  subscriptionStatus: string;
  subscriptionStartedAt: string;
  subscriptionEndsAt: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  language: string;
  source: string;
  raw: JsonRecord;
};

type ApiLoadState = 'idle' | 'loading' | 'success' | 'error';

const PROFILE_ENDPOINTS = ['/api/profile/me', '/api/profile', '/api/profile/get'];

function cleanText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();

  return text || fallback;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const parsed = Number(String(value || '').replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : null;
}

function asArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function pickRecord(data: unknown): JsonRecord {
  if (!isRecord(data)) return {};

  if (isRecord(data.profile)) return data.profile;
  if (isRecord(data.user)) return data.user;
  if (isRecord(data.account)) return data.account;
  if (isRecord(data.data)) return data.data;
  if (isRecord(data.client)) return data.client;

  return data;
}

function readFromLocalStorage(): Partial<ClientProfile> {
  if (typeof window === 'undefined') return {};

  return {
    name:
      localStorage.getItem('zedpera_user_name') ||
      localStorage.getItem('user_name') ||
      '',
    email:
      localStorage.getItem('zedpera_user_email') ||
      localStorage.getItem('user_email') ||
      '',
    role:
      localStorage.getItem('zedpera_user_role') ||
      localStorage.getItem('user_role') ||
      '',
    plan:
      localStorage.getItem('zedpera_user_plan') ||
      localStorage.getItem('zedpera_selected_plan') ||
      '',
    selectedPlan:
      localStorage.getItem('zedpera_selected_plan') ||
      localStorage.getItem('zedpera_user_plan') ||
      '',
    language:
      localStorage.getItem('zedpera_language') ||
      localStorage.getItem('language') ||
      'sk',
  };
}

function normalizeClientProfile(apiData: unknown, source: string): ClientProfile {
  const data = pickRecord(apiData);
  const local = readFromLocalStorage();

  const plan =
    cleanText(data.plan) ||
    cleanText(data.user_plan) ||
    cleanText(data.package) ||
    cleanText(data.packageName) ||
    cleanText(data.selectedPlan) ||
    cleanText(local.plan) ||
    'free';

  const selectedPlan =
    cleanText(data.selectedPlan) ||
    cleanText(data.selected_plan) ||
    cleanText(data.package) ||
    cleanText(data.packageName) ||
    cleanText(local.selectedPlan) ||
    plan;

  const credits =
    asNumber(data.credits) ??
    asNumber(data.totalCredits) ??
    asNumber(data.creditLimit) ??
    asNumber(data.limit) ??
    null;

  const usedCredits =
    asNumber(data.usedCredits) ??
    asNumber(data.creditsUsed) ??
    asNumber(data.used_tokens) ??
    asNumber(data.usage) ??
    null;

  const remainingCredits =
    asNumber(data.remainingCredits) ??
    asNumber(data.creditsRemaining) ??
    (credits !== null && usedCredits !== null
      ? Math.max(credits - usedCredits, 0)
      : null);

  const activeServices = [
    ...asArray(data.activeServices),
    ...asArray(data.services),
    ...asArray(data.activatedServices),
  ];

  const activatedFeatures = [
    ...asArray(data.activatedFeatures),
    ...asArray(data.features),
    ...asArray(data.modules),
  ];

  return {
    id:
      cleanText(data.id) ||
      cleanText(data.profile_id) ||
      cleanText(data.uuid) ||
      'nezistené',
    userId:
      cleanText(data.userId) ||
      cleanText(data.user_id) ||
      cleanText(data.owner_id) ||
      'nezistené',
    name:
      cleanText(data.name) ||
      cleanText(data.fullName) ||
      cleanText(data.full_name) ||
      cleanText(data.displayName) ||
      cleanText(local.name) ||
      'Klient Zedpera',
    email:
      cleanText(data.email) ||
      cleanText(data.userEmail) ||
      cleanText(data.user_email) ||
      cleanText(local.email) ||
      'nezistené',
    role:
      cleanText(data.role) ||
      cleanText(data.userRole) ||
      cleanText(data.user_role) ||
      cleanText(local.role) ||
      'klient',
    plan,
    selectedPlan,
    accountStatus:
      cleanText(data.accountStatus) ||
      cleanText(data.status) ||
      cleanText(data.account_status) ||
      'aktívny',
    packageName:
      cleanText(data.packageName) ||
      cleanText(data.package_name) ||
      cleanText(data.package) ||
      selectedPlan,
    packageLabel:
      cleanText(data.packageLabel) ||
      cleanText(data.package_label) ||
      cleanText(data.planLabel) ||
      selectedPlan,
    credits,
    usedCredits,
    remainingCredits,
    maxProjects:
      asNumber(data.maxProjects) ??
      asNumber(data.projectLimit) ??
      asNumber(data.max_projects) ??
      null,
    projectsCount:
      asNumber(data.projectsCount) ??
      asNumber(data.projectCount) ??
      asNumber(data.projects_count) ??
      null,
    activeServices: Array.from(new Set(activeServices)),
    activatedFeatures: Array.from(new Set(activatedFeatures)),
    subscriptionStatus:
      cleanText(data.subscriptionStatus) ||
      cleanText(data.subscription_status) ||
      cleanText(data.billingStatus) ||
      'nezistené',
    subscriptionStartedAt:
      cleanText(data.subscriptionStartedAt) ||
      cleanText(data.subscription_started_at) ||
      cleanText(data.planStartedAt) ||
      '',
    subscriptionEndsAt:
      cleanText(data.subscriptionEndsAt) ||
      cleanText(data.subscription_ends_at) ||
      cleanText(data.planEndsAt) ||
      cleanText(data.validUntil) ||
      '',
    createdAt: cleanText(data.createdAt) || cleanText(data.created_at) || '',
    updatedAt: cleanText(data.updatedAt) || cleanText(data.updated_at) || '',
    lastLoginAt:
      cleanText(data.lastLoginAt) || cleanText(data.last_login_at) || '',
    language:
      cleanText(data.language) ||
      cleanText(data.locale) ||
      cleanText(local.language) ||
      'sk',
    source,
    raw: data,
  };
}

function formatDate(value: string) {
  if (!value) return 'Nezadané';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Nezadané';

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'Nezadané';
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function labelPlan(plan: string) {
  const value = plan.toLowerCase();

  if (value.includes('admin')) return 'Admin prístup';
  if (value.includes('premium')) return 'Premium balíček';
  if (value.includes('pro')) return 'Pro balíček';
  if (value.includes('basic')) return 'Basic balíček';
  if (value.includes('free')) return 'Free balíček';

  return plan || 'Nezadaný balíček';
}

function getUsagePercent(profile: ClientProfile) {
  if (
    profile.credits === null ||
    profile.usedCredits === null ||
    profile.credits <= 0
  ) {
    return null;
  }

  return Math.min(Math.round((profile.usedCredits / profile.credits) * 100), 100);
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="group rounded-[1.6rem] border border-white/10 bg-white/[0.065] p-5 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-white/[0.09]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-100 transition group-hover:bg-violet-600/30">
          <Icon size={22} />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </div>

          <div className="mt-2 break-words text-xl font-black text-white">
            {value}
          </div>

          {helper ? (
            <div className="mt-1 text-sm font-bold leading-5 text-slate-400">
              {helper}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid gap-2 border-b border-white/10 py-3 last:border-b-0 sm:grid-cols-[230px_minmax(0,1fr)]">
      <div className="text-sm font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>

      <div className="min-w-0 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-100">
        {formatValue(value)}
      </div>
    </div>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1.5 text-xs font-black text-violet-100 transition hover:border-violet-300/60 hover:bg-violet-500/25">
      <CheckCircle2 size={14} />
      {children}
    </span>
  );
}

export default function ClientAccountProfile() {
  const router = useRouter();

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [state, setState] = useState<ApiLoadState>('idle');
  const [error, setError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState('');

  const loadProfile = useCallback(async () => {
    setState('loading');
    setError('');

    let lastError = '';

    for (const endpoint of PROFILE_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          lastError =
            cleanText((data as JsonRecord | null)?.error) ||
            cleanText((data as JsonRecord | null)?.message) ||
            'Klientsky profil sa nepodarilo načítať.';
          continue;
        }

        const normalized = normalizeClientProfile(data, endpoint);

        setProfile(normalized);
        setLastLoadedAt(new Date().toISOString());
        setState('success');
        return;
      } catch (err) {
        lastError =
          err instanceof Error
            ? err.message
            : 'Klientsky profil sa nepodarilo načítať.';
      }
    }

    const fallback = normalizeClientProfile({}, 'lokálne údaje');

    setProfile(fallback);
    setLastLoadedAt(new Date().toISOString());
    setError(
      lastError ||
        'Klientsky profil sa nepodarilo načítať. Zobrazujem aspoň lokálne uložené údaje.',
    );
    setState('error');
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const usagePercent = useMemo(() => {
    return profile ? getUsagePercent(profile) : null;
  }, [profile]);

  function goToMenu() {
    router.push('/dashboard');
  }

  return (
    <main className="client-account-profile min-h-screen bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-700/25 blur-3xl" />
        <div className="absolute right-[-140px] top-40 h-[440px] w-[440px] rounded-full bg-blue-700/20 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-120px] h-[460px] w-[460px] rounded-full bg-fuchsia-700/15 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-[2rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-xl shadow-violet-950/40">
                <UserCircle size={30} />
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-violet-100">
                  <ShieldCheck size={13} />
                  Účet klienta
                </div>

                <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Klientsky účet a služby
                </h1>

                <p className="mt-1 max-w-3xl text-sm font-bold leading-6 text-slate-400">
                  Klientsky profil zobrazuje účet, balíček, stav služieb,
                  kredity, projekty, predplatné a dátumy prístupov.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <button
                type="button"
                onClick={goToMenu}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-5 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-violet-300/50 hover:bg-white/[0.14]"
              >
                <ArrowLeft size={18} />
                Návrat do menu
              </button>

              <button
                type="button"
                onClick={loadProfile}
                disabled={state === 'loading'}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-xl shadow-violet-950/40 transition hover:-translate-y-0.5 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCcw className="h-5 w-5" />
                )}
                Obnoviť údaje
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="mb-6 rounded-[1.5rem] border border-amber-400/25 bg-amber-500/10 p-5 text-sm font-bold leading-6 text-amber-100 shadow-xl shadow-black/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>{error}</div>
            </div>
          </section>
        ) : null}

        {state === 'loading' && !profile ? (
          <section className="rounded-[2rem] border border-white/10 bg-[#0b1020]/95 p-8 shadow-xl shadow-black/30">
            <div className="flex items-center gap-4">
              <Loader2 className="h-7 w-7 animate-spin text-violet-200" />

              <div>
                <div className="text-lg font-black text-white">
                  Načítavam klientsky profil...
                </div>

                <div className="mt-1 text-sm font-bold text-slate-400">
                  Pripravujem údaje klienta a jeho služieb.
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {profile ? (
          <div className="space-y-6">
            <section className="grid gap-5 lg:grid-cols-4">
              <StatCard
                icon={UserCircle}
                label="Klient"
                value={profile.name}
                helper={profile.email}
              />

              <StatCard
                icon={Crown}
                label="Balíček"
                value={labelPlan(profile.selectedPlan || profile.plan)}
                helper={`Stav účtu: ${profile.accountStatus}`}
              />

              <StatCard
                icon={WalletCards}
                label="Kredity"
                value={
                  profile.remainingCredits !== null
                    ? `${profile.remainingCredits} zostáva`
                    : 'Nezadané'
                }
                helper={
                  profile.credits !== null
                    ? `Celkom: ${profile.credits}${
                        profile.usedCredits !== null
                          ? ` · použité: ${profile.usedCredits}`
                          : ''
                      }`
                    : 'Limit nie je uvedený'
                }
              />

              <StatCard
                icon={FileText}
                label="Projekty"
                value={
                  profile.projectsCount !== null
                    ? `${profile.projectsCount}`
                    : 'Nezadané'
                }
                helper={
                  profile.maxProjects !== null
                    ? `Limit: ${profile.maxProjects}`
                    : 'Limit projektov nie je uvedený'
                }
              />
            </section>

            {usagePercent !== null ? (
              <section className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-white">
                      Využitie balíčka
                    </h2>

                    <p className="mt-1 text-sm font-bold text-slate-400">
                      Prehľad čerpania kreditov v klientskom účte.
                    </p>
                  </div>

                  <div className="text-2xl font-black text-white">
                    {usagePercent} %
                  </div>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </section>
            ) : null}

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-100">
                    <BriefcaseBusiness size={22} />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-white">
                      Údaje klienta
                    </h2>

                    <p className="text-sm font-bold text-slate-400">
                      Základné údaje účtu, balíčka a nastavení klienta.
                    </p>
                  </div>
                </div>

                <DetailRow label="Meno" value={profile.name} />
                <DetailRow label="Email" value={profile.email} />
                <DetailRow label="Rola" value={profile.role} />
                <DetailRow label="Jazyk" value={profile.language} />
                <DetailRow label="Stav účtu" value={profile.accountStatus} />
                <DetailRow
                  label="Balíček"
                  value={profile.packageLabel || profile.packageName}
                />
                <DetailRow label="Vybraný plán" value={profile.selectedPlan} />
                <DetailRow label="Predplatné" value={profile.subscriptionStatus} />
                <DetailRow
                  label="Posledné načítanie"
                  value={formatDate(lastLoadedAt)}
                />
              </div>

              <div className="space-y-6">
                <section className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-100">
                      <BadgeCheck size={22} />
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-white">
                        Aktivované služby
                      </h2>

                      <p className="text-sm font-bold text-slate-400">
                        Moduly a služby dostupné pre klienta.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {profile.activeServices.length ? (
                      profile.activeServices.map((service) => (
                        <Pill key={service}>{service}</Pill>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-slate-300">
                        Zoznam aktivovaných služieb zatiaľ nie je dostupný.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-100">
                      <Sparkles size={22} />
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-white">
                        Aktivované funkcie
                      </h2>

                      <p className="text-sm font-bold text-slate-400">
                        Funkcie dostupné pre tento klientsky účet.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {profile.activatedFeatures.length ? (
                      profile.activatedFeatures.map((feature) => (
                        <Pill key={feature}>{feature}</Pill>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-slate-300">
                        Zoznam aktivovaných funkcií zatiaľ nie je dostupný.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-100">
                      <CalendarClock size={22} />
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-white">
                        Platnosť a prístupy
                      </h2>

                      <p className="text-sm font-bold text-slate-400">
                        Dátumy predplatného a posledného prístupu.
                      </p>
                    </div>
                  </div>

                  <DetailRow
                    label="Predplatné od"
                    value={formatDate(profile.subscriptionStartedAt)}
                  />
                  <DetailRow
                    label="Predplatné do"
                    value={formatDate(profile.subscriptionEndsAt)}
                  />
                  <DetailRow
                    label="Vytvorené"
                    value={formatDate(profile.createdAt)}
                  />
                  <DetailRow
                    label="Upravené"
                    value={formatDate(profile.updatedAt)}
                  />
                  <DetailRow
                    label="Posledné prihlásenie"
                    value={formatDate(profile.lastLoginAt)}
                  />
                </section>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-3">
              <StatCard
                icon={Mail}
                label="Kontakt"
                value={profile.email}
                helper="Email klienta"
              />

              <StatCard
                icon={ShieldCheck}
                label="Prístup"
                value={profile.role}
                helper="Rola klienta v systéme"
              />

              <StatCard
                icon={Clock3}
                label="Aktualizované"
                value={formatDate(profile.updatedAt)}
                helper={`Načítané: ${formatDate(lastLoadedAt)}`}
              />
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}