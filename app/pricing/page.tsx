'use client';

import {
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Crown,
  FilePlus2,
  FileText,
  Gift,
  Loader2,
  Menu,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import {
  ADDONS,
  PLANS,
  type AddonId,
  type PlanId,
} from '@/lib/billing/catalog';

type PaidPlanId = Exclude<PlanId, 'free' | 'admin'>;

type PlanVisibility = {
  isPublic?: boolean;
  isPurchasable?: boolean;
};

type MainPlan = {
  id: PlanId;
  name: string;
  priceCents: number;
  period: string;
  scope: string;
  badge?: string;
  description: string;
  features: string[];
  isFree?: boolean;
  highlighted?: boolean;
};

type OneTimeAddon = {
  id: AddonId;
  name: string;
  priceCents: number;
  period: string;
  description: string;
  features: string[];
  badge?: string;
};

type CheckoutResponse = {
  ok?: boolean;
  url?: string;
  code?: string;
  error?: string;
  message?: string;
  detail?: string;
  reason?: string;
  solution?: string;
  technicalCode?: string;
  displayMessage?: string;
  receivedPlan?: string;
  receivedAddon?: string;
};

type PlanCheckoutPayload = {
  checkoutType: 'plan';
  plan: PaidPlanId;
  planId: PaidPlanId;
  addons: AddonId[];
  addonIds: AddonId[];
  locale: 'sk';
  requestId: string;
  checkoutRequestId: string;
};

type AddonCheckoutPayload = {
  checkoutType: 'addon';
  addon: AddonId;
  addonId: AddonId;
  addons: AddonId[];
  addonIds: AddonId[];
  locale: 'sk';
  requestId: string;
  checkoutRequestId: string;
};

type CheckoutPayload = PlanCheckoutPayload | AddonCheckoutPayload;

const publicPlans = Object.values(PLANS).filter((plan) => {
  /*
   * Hodnoty v PLANS sú deklarované pomocou `as const`, preto TypeScript
   * pri verejných plánoch odvodzuje isPublic/isPurchasable ako literál `true`.
   * Rozšírenie iba týchto dvoch príznakov na voliteľný boolean zachováva
   * podporu budúcich skrytých plánov bez neplatného porovnania true !== false.
   */
  const visibility = plan as PlanVisibility;

  return (
    plan.id !== 'admin' &&
    visibility.isPublic !== false &&
    visibility.isPurchasable !== false
  );
});

const PAID_PLAN_IDS: PaidPlanId[] = publicPlans
  .map((plan) => plan.id)
  .filter(
    (planId): planId is PaidPlanId =>
      planId !== 'free' && planId !== 'admin',
  );

const ADDON_IDS: AddonId[] = [
  'data-analysis',
  'extra-20',
  'extra-40',
  'extra-60',
];

const STORAGE_SELECTED_PLAN = 'zedpera_selected_plan';
const STORAGE_SELECTED_ADDONS = 'zedpera_selected_addons';


const mainPlans: MainPlan[] = [
  {
    id: 'free',
    name: 'FREE VERZIA',
    priceCents: 0,
    period: 'bez platby',
    scope: `${PLANS.free.pageLimit} strany · ${PLANS.free.attachmentLimit} príloha · ${PLANS.free.promptLimit ?? 0} AI prompty`,
    badge: 'Bezplatné vyskúšanie',
    description:
      'Základná verzia na vyskúšanie systému bez platobnej karty a bez aktivácie predplatného.',
    isFree: true,
    features: [
      `${PLANS.free.pageLimit} strany spracovaného výstupu`,
      `${PLANS.free.attachmentLimit} nahraná príloha`,
      `${PLANS.free.promptLimit ?? 0} skúšobné AI prompty`,
      'Základné vyskúšanie AI chatu',
      'Bez platobnej karty',
    ],
  },
  {
    id: 'seminar-work',
    name: 'SEMINÁRNA PRÁCA',
    priceCents: 3900,
    period: 'mesačne',
    scope: `Rozsah do ${PLANS['seminar-work'].pageLimit} strán`,
    badge: 'Pre kratšie akademické práce',
    description:
      'Mesačný balík pre seminárne, ročníkové, zápočtové a kratšie odborné práce.',
    features: [
      'AI pomoc pri písaní jednotlivých kapitol',
      'Návrh štruktúry a osnovy',
      'Metodické vedenie počas spracovania',
      'Kontrola kvality a logiky textu',
      'Humanizácia textu',
      'Pomoc s citáciami a zdrojmi',
      'Plánovanie práce a termínov',
      'Príprava e-mailov pre vyučujúceho',
    ],
  },
  {
    id: 'bachelor-thesis',
    name: 'BAKALÁRSKA PRÁCA',
    priceCents: 14900,
    period: 'mesačne',
    scope: `Rozsah do ${PLANS['bachelor-thesis'].pageLimit} strán`,
    badge: 'Najobľúbenejší balík',
    description:
      'Kompletná mesačná podpora od zadania a osnovy až po prípravu na obhajobu bakalárskej práce.',
    highlighted: true,
    features: [
      'Tvorba a úprava jednotlivých kapitol',
      'Metodické vedenie počas celého písania',
      'Kontrola kvality, logiky a konzistentnosti',
      'Humanizácia odborného textu',
      'Pomoc so zdrojmi a citáciami',
      'Spracovanie dotazníkov a štatistiky',
      'Tvorba grafov a tabuliek',
      'Príprava prezentácie na obhajobu',
      'Príprava odpovedí na otázky komisie',
    ],
  },
  {
    id: 'master-thesis',
    name: 'DIPLOMOVÁ / MAGISTERSKÁ PRÁCA',
    priceCents: 18900,
    period: 'mesačne',
    scope: `Rozsah do ${PLANS['master-thesis'].pageLimit} strán`,
    badge: 'Najkomplexnejší balík',
    description:
      'Najvyšší mesačný balík pre rozsiahle záverečné práce, pokročilú metodiku, analýzu dát a obhajobu.',
    features: [
      'Tvorba a úprava celej záverečnej práce',
      'Pokročilé metodické vedenie',
      'Kontrola odbornosti a konzistentnosti',
      'Humanizácia odborného textu',
      'Komplexná práca so zdrojmi a citáciami',
      'Deskriptívna a inferenčná štatistika',
      'Testovanie hypotéz a normality dát',
      'Korelačné a neparametrické analýzy',
      'Tvorba grafov, tabuliek a interpretácií',
      'Príprava prezentácie a simulácia obhajoby',
    ],
  },
];

const oneTimeAddons: OneTimeAddon[] = [
  {
    id: 'data-analysis',
    name: 'ANALÝZA DÁT',
    priceCents: ADDONS['data-analysis'].priceCents,
    period: 'jednorazová platba',
    badge: 'Samostatná analytická služba',
    description:
      'Jednorazové sprístupnenie nástrojov na prípravu, štatistické spracovanie, vizualizáciu a export dát.',
    features: [
      'Čistenie a príprava dát',
      'Spracovanie dotazníkov',
      'Deskriptívna štatistika',
      'Frekvenčné tabuľky',
      'Testovanie normality',
      'Korelačné analýzy',
      'Parametrické a neparametrické testy',
      'Grafy, tabuľky a export výsledkov',
    ],
  },
  {
    id: 'extra-20',
    name: 'EXTRA 20 STRÁN',
    priceCents: ADDONS['extra-20'].priceCents,
    period: 'jednorazová platba',
    description:
      'Jednorazové navýšenie dostupného rozsahu aktuálneho projektu o ďalších 20 strán.',
    features: [
      `Navýšenie limitu o ${ADDONS['extra-20'].extraPages} strán`,
      'Použitie v aktuálnom projekte',
      'Bez zmeny hlavného mesačného plánu',
    ],
  },
  {
    id: 'extra-40',
    name: 'EXTRA 40 STRÁN',
    priceCents: ADDONS['extra-40'].priceCents,
    period: 'jednorazová platba',
    description:
      'Jednorazové navýšenie dostupného rozsahu aktuálneho projektu o ďalších 40 strán.',
    features: [
      `Navýšenie limitu o ${ADDONS['extra-40'].extraPages} strán`,
      'Použitie v aktuálnom projekte',
      'Bez zmeny hlavného mesačného plánu',
    ],
  },
  {
    id: 'extra-60',
    name: 'EXTRA 60 STRÁN',
    priceCents: ADDONS['extra-60'].priceCents,
    period: 'jednorazová platba',
    description:
      'Jednorazové navýšenie dostupného rozsahu aktuálneho projektu o ďalších 60 strán.',
    features: [
      `Navýšenie limitu o ${ADDONS['extra-60'].extraPages} strán`,
      'Použitie v aktuálnom projekte',
      'Bez zmeny hlavného mesačného plánu',
    ],
  },
];

const visibleMainPlans = mainPlans.filter(
  (plan) =>
    plan.isFree ||
    publicPlans.some((publicPlan) => publicPlan.id === plan.id),
);

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

function isPaidPlanId(value: string): value is PaidPlanId {
  return PAID_PLAN_IDS.includes(value as PaidPlanId);
}

function isAddonId(value: string): value is AddonId {
  return ADDON_IDS.includes(value as AddonId);
}

function getFriendlyCheckoutError(
  data: CheckoutResponse,
  fallback: string,
) {
  if (data.displayMessage) return data.displayMessage;

  if (data.error === 'INVALID_PLAN' || data.code === 'INVALID_PLAN') {
    return [
      'Platobná brána odmietla identifikátor hlavného plánu.',
      '',
      `Odoslaný plán: ${data.receivedPlan || 'nezistené'}`,
      '',
      `Povolené ID plánov: ${PAID_PLAN_IDS.join(', ')}`,
    ].join('\n');
  }

  if (data.error === 'INVALID_ADDON' || data.code === 'INVALID_ADDON') {
    return [
      'Platobná brána odmietla identifikátor jednorazového doplnku.',
      '',
      `Odoslaný doplnok: ${data.receivedAddon || 'nezistené'}`,
      '',
      `Povolené ID doplnkov: ${ADDON_IDS.join(', ')}`,
    ].join('\n');
  }

  const message = [
    data.error,
    data.message,
    data.detail,
    data.reason ? `Dôvod: ${data.reason}` : '',
    data.solution ? `Riešenie: ${data.solution}` : '',
    data.technicalCode
      ? `Technický kód: ${data.technicalCode}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return message || fallback;
}

async function postCheckout(payload: CheckoutPayload) {
  const response = await fetch('/api/payments/checkout', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Idempotency-Key': payload.requestId,
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  let data: CheckoutResponse = {};

  if (rawBody) {
    try {
      data = JSON.parse(rawBody) as CheckoutResponse;
    } catch {
      data = {
        error: rawBody,
      };
    }
  }

  return {
    response,
    data,
  };
}

export default function PricingPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  const scrollToTop = () => {
    pageRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const activateFreePlan = () => {
    setCheckoutError('');

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_SELECTED_PLAN, 'free');
      window.localStorage.removeItem(STORAGE_SELECTED_ADDONS);
    }

    router.push('/dashboard?plan=free&source=pricing');
  };

  const startPlanCheckout = async (planId: PaidPlanId) => {
    if (!isPaidPlanId(planId)) {
      setCheckoutError(
        `Neplatný hlavný plán: ${planId}.`,
      );
      return;
    }

    const loadingKey = `plan:${planId}`;

    try {
      setLoadingCheckout(loadingKey);
      setCheckoutError('');

      if (typeof window === 'undefined') {
        throw new Error(
          'Platbu je možné spustiť iba v internetovom prehliadači.',
        );
      }

      window.localStorage.setItem(STORAGE_SELECTED_PLAN, planId);
      window.localStorage.removeItem(STORAGE_SELECTED_ADDONS);

      const requestId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `pricing-plan-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const payload: PlanCheckoutPayload = {
        checkoutType: 'plan',
        plan: planId,
        planId,
        addons: [],
        addonIds: [],
        locale: 'sk',
        requestId,
        checkoutRequestId: requestId,
      };

      const { response, data } = await postCheckout(payload);

      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error(
        getFriendlyCheckoutError(
          data,
          `Platobnú bránu sa nepodarilo spustiť. HTTP ${response.status}.`,
        ),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Platbu hlavného plánu sa nepodarilo spustiť.';

      console.error('PLAN CHECKOUT ERROR:', error);
      setCheckoutError(message);
    } finally {
      setLoadingCheckout(null);
    }
  };

  const startAddonCheckout = async (addonId: AddonId) => {
    if (!isAddonId(addonId)) {
      setCheckoutError(
        `Neplatný jednorazový doplnok: ${addonId}.`,
      );
      return;
    }

    const loadingKey = `addon:${addonId}`;

    try {
      setLoadingCheckout(loadingKey);
      setCheckoutError('');

      if (typeof window === 'undefined') {
        throw new Error(
          'Platbu je možné spustiť iba v internetovom prehliadači.',
        );
      }

      window.localStorage.setItem(
        STORAGE_SELECTED_ADDONS,
        JSON.stringify([addonId]),
      );

      const requestId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `pricing-addon-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const payload: AddonCheckoutPayload = {
        checkoutType: 'addon',
        addon: addonId,
        addonId,
        addons: [addonId],
        addonIds: [addonId],
        locale: 'sk',
        requestId,
        checkoutRequestId: requestId,
      };

      const { response, data } = await postCheckout(payload);

      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error(
        getFriendlyCheckoutError(
          data,
          `Platobnú bránu sa nepodarilo spustiť. HTTP ${response.status}.`,
        ),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Platbu jednorazového doplnku sa nepodarilo spustiť.';

      console.error('ADDON CHECKOUT ERROR:', error);
      setCheckoutError(message);
    } finally {
      setLoadingCheckout(null);
    }
  };

  return (
    <div
      ref={pageRef}
      className="fixed inset-0 h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-[#020617] text-white"
    >
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={goToDashboard}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
          >
            <Menu size={18} />
            Menu
          </button>

          <div className="hidden text-sm font-semibold text-slate-400 sm:block">
            Mesačné plány a jednorazové doplnky
          </div>

          <button
            type="button"
            onClick={goToDashboard}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-purple-400/30 bg-purple-600/20 px-4 py-2 text-sm font-bold text-purple-100 transition hover:bg-purple-600/30"
          >
            <ArrowLeft size={18} />
            Späť do menu
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-10 pb-32 sm:px-6 lg:px-8">
        <section>
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200">
              <Crown size={16} />
              Cenník ZEDPERA
            </div>

            <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Vyberte hlavný mesačný plán alebo samostatný jednorazový doplnok
            </h1>

            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-300 sm:text-lg">
              Hlavné akademické plány fungujú ako mesačné predplatné. Analýza dát
              a balíky Extra 20, 40 alebo 60 strán sa nakupujú samostatne ako
              jednorazové doplnky a nepridávajú sa do ceny mesačného plánu.
            </p>

            <div className="mt-6 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-3">
              <HeroInfo
                icon={<ShieldCheck size={18} />}
                title="Jasné oddelenie platieb"
                text="Mesačný plán a jednorazový doplnok majú samostatný checkout."
              />

              <HeroInfo
                icon={<FileText size={18} />}
                title="Rozsah podľa balíka"
                text="Každý hlavný plán má vlastný limit spracovaných strán."
              />

              <HeroInfo
                icon={<Sparkles size={18} />}
                title="Flexibilné rozšírenia"
                text="Analýzu dát alebo extra strany môžete kúpiť samostatne."
              />
            </div>
          </div>

          <div className="rounded-3xl border border-purple-400/20 bg-purple-500/10 p-5 text-sm font-semibold leading-6 text-purple-100 shadow-xl sm:p-6">
            Po kliknutí na platený balík alebo doplnok budete okamžite
            presmerovaný na zabezpečenú platobnú stránku Stripe. E-mail zadáte
            priamo v Stripe Checkout.
          </div>
        </section>

        <section>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-purple-300">
                <Crown size={21} />
                <h2 className="text-2xl font-black text-white sm:text-3xl">
                  Hlavné mesačné plány
                </h2>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Vyberte jeden hlavný plán. Platené balíky sa účtujú mesačne
                prostredníctvom Stripe predplatného.
              </p>
            </div>

            <div className="rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-100">
              Samostatný checkout pre každý plán
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {visibleMainPlans.map((plan) => {
              const loadingKey = plan.isFree
                ? null
                : `plan:${plan.id}`;
              const isLoading = loadingCheckout === loadingKey;

              return (
                <article
                  key={plan.id}
                  className={[
                    'relative flex flex-col rounded-3xl border p-6 text-left shadow-xl transition hover:-translate-y-1',
                    plan.highlighted
                      ? 'border-fuchsia-400/60 bg-gradient-to-b from-purple-700/30 to-[#0f172a] ring-1 ring-fuchsia-400/30 shadow-purple-950/50'
                      : 'border-white/10 bg-[#0f172a] hover:border-purple-400/50 hover:bg-[#111c33]',
                  ].join(' ')}
                >
                  {plan.badge && (
                    <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-purple-600/40 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-100">
                      {plan.isFree ? (
                        <Gift size={14} />
                      ) : (
                        <Crown size={14} />
                      )}
                      {plan.badge}
                    </div>
                  )}

                  <h3 className="text-xl font-black leading-7 text-white">
                    {plan.name}
                  </h3>

                  <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-300">
                    {plan.description}
                  </p>

                  <div className="mt-6">
                    <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                      <span className="text-4xl font-black text-white">
                        {formatPrice(plan.priceCents)}
                      </span>

                      {!plan.isFree && (
                        <span className="pb-1 text-sm font-bold text-slate-400">
                          / mesiac
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm font-semibold text-slate-400">
                      {plan.period}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-purple-200">
                      Rozsah balíka
                    </div>

                    <div className="mt-2 text-base font-black text-white">
                      {plan.scope}
                    </div>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3 text-sm leading-6 text-slate-200">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-purple-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => {
                      if (plan.isFree) {
                        activateFreePlan();
                        return;
                      }

                      void startPlanCheckout(plan.id as PaidPlanId);
                    }}
                    disabled={loadingCheckout !== null}
                    className={[
                      'mt-7 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-4',
                      'text-sm font-black text-white transition',
                      'disabled:cursor-not-allowed disabled:opacity-60',
                      plan.isFree
                        ? 'border border-emerald-400/30 bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:opacity-90',
                    ].join(' ')}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Presmerovávam...
                      </>
                    ) : plan.isFree ? (
                      <>
                        <Gift size={18} />
                        Pokračovať zadarmo
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        Aktivovať mesačný plán
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#050816] p-5 shadow-xl sm:p-7">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-purple-300">
                <BarChart3 size={21} />
                <h2 className="text-2xl font-black text-white sm:text-3xl">
                  Jednorazové doplnky
                </h2>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Doplnky sa nekombinujú s mesačným plánom v jednom nákupe.
                Každý doplnok otvorí vlastnú jednorazovú Stripe platbu.
              </p>
            </div>

            <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-100">
              Bez mesačného predplatného
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {oneTimeAddons.map((addon) => {
              const loadingKey = `addon:${addon.id}`;
              const isLoading = loadingCheckout === loadingKey;

              return (
                <article
                  key={addon.id}
                  className="flex flex-col rounded-3xl border border-white/10 bg-[#0f172a] p-5 transition hover:border-purple-400/40 hover:bg-[#111c33] sm:p-6"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      {addon.badge && (
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-100">
                          <Sparkles size={13} />
                          {addon.badge}
                        </div>
                      )}

                      <h3 className="text-xl font-black text-white">
                        {addon.name}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {addon.description}
                      </p>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <div className="text-3xl font-black text-white">
                        {formatPrice(addon.priceCents)}
                      </div>

                      <div className="mt-1 text-xs font-bold uppercase tracking-wide text-emerald-300">
                        {addon.period}
                      </div>
                    </div>
                  </div>

                  <ul className="mt-5 flex-1 space-y-2.5 text-sm leading-6 text-slate-300">
                    {addon.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-purple-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => void startAddonCheckout(addon.id)}
                    disabled={loadingCheckout !== null}
                    className="mt-6 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-purple-400/30 bg-purple-600/20 px-5 py-3 text-sm font-black text-purple-50 transition hover:bg-purple-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Presmerovávam...
                      </>
                    ) : (
                      <>
                        <FilePlus2 size={18} />
                        Kúpiť jednorazovo
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        {checkoutError && (
          <section
            role="alert"
            className="whitespace-pre-wrap rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold leading-6 text-red-200"
          >
            {checkoutError}
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-center sm:p-7">
          <h2 className="text-xl font-black text-white">
            Dôležité informácie k platbe
          </h2>

          <p className="mx-auto mt-3 max-w-4xl text-sm leading-6 text-slate-400">
            Hlavný platený plán je mesačné predplatné. Analýza dát a Extra
            20/40/60 strán sú jednorazové položky. Cenu, Stripe Price ID a režim
            platby musí vždy určiť serverový katalóg v API; klient neposiela cenu
            ako dôveryhodný údaj.
          </p>

          <p className="mx-auto mt-3 max-w-4xl text-xs leading-5 text-slate-500">
            AI systém poskytuje odbornú podporu pri príprave akademickej práce.
            Používateľ zodpovedá za kontrolu výsledku, správnosť údajov, konečnú
            úpravu a dodržanie pravidiel svojej školy.
          </p>
        </section>
      </main>

      <button
        type="button"
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-purple-600 text-white shadow-2xl shadow-purple-950/50 transition hover:bg-purple-500"
        aria-label="Späť hore"
      >
        <ArrowUp size={20} />
      </button>
    </div>
  );
}

function HeroInfo({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-purple-300">
        {icon}
        <div className="text-sm font-black text-white">
          {title}
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {text}
      </p>
    </div>
  );
}
