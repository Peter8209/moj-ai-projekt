'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Crown,
  ExternalLink,
  FileText,
  Gift,
  Loader2,
  Menu,
  Paperclip,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import {
  ADDONS,
  PLANS,
  type AddonId,
  type PlanId,
} from '@/lib/billing/catalog';



type PackagePlan = {
  id: PlanId;
  name: string;
  price: string;
  priceAmount: number;
  period: string;
  scope: string;
  badge?: string;
  description: string;
  features: string[];
  isFree?: boolean;
  highlighted?: boolean;
};

type AddonService = {
  id: AddonId;
  name: string;
  price: string;
  priceAmount: number;
  description: string;
  features: string[];
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
};

const VALID_PLAN_IDS = Object.keys(PLANS) as PlanId[];

const VALID_PAID_PLAN_IDS = VALID_PLAN_IDS.filter(
  (planId): planId is Exclude<PlanId, 'free'> => planId !== 'free',
);

const VALID_ADDON_IDS = Object.keys(ADDONS) as AddonId[];

const DEFAULT_PLAN_ID: PlanId = 'bachelor-thesis';

const STORAGE_SELECTED_PLAN = 'zedpera_selected_plan';
const STORAGE_SELECTED_ADDONS = 'zedpera_selected_addons';

function formatCatalogPrice(priceCents: number) {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

const packagePlans: PackagePlan[] = [
  {
    id: 'free',
    name: 'FREE VERZIA',
    price: formatCatalogPrice(PLANS.free.priceCents),
    priceAmount: PLANS.free.priceCents / 100,
    period: 'bez platby',
    scope: `${PLANS.free.pageLimit} strany · ${PLANS.free.attachmentLimit} príloha · ${PLANS.free.promptLimit ?? 0} skúšobné prompty`,
    badge: 'Bezplatné vyskúšanie',
    description:
      'Základná skúšobná verzia na overenie fungovania AI chatu a práce s jednou prílohou.',
    isFree: true,
    features: [
      `${PLANS.free.attachmentLimit} nahraná príloha`,
      `${PLANS.free.promptLimit ?? 0} skúšobné AI prompty`,
      'Základné vyskúšanie AI chatu',
      'Bez platobnej karty',
      'Obmedzený skúšobný režim',
    ],
  },
  {
    id: 'seminar-work',
    name: 'SEMINÁRNA PRÁCA',
    price: formatCatalogPrice(PLANS['seminar-work'].priceCents),
    priceAmount: PLANS['seminar-work'].priceCents / 100,
    period: 'jednorazovo',
    scope: `Rozsah do ${PLANS['seminar-work'].pageLimit} strán`,
    badge: 'Pre kratšie akademické práce',
    description:
      `Ideálne riešenie pre seminárne, ročníkové a zápočtové práce do ${PLANS['seminar-work'].pageLimit} strán.`,
    features: [
      'Vytvorenie celej seminárnej práce',
      'AI pomoc pri písaní jednotlivých kapitol',
      'Metodické vedenie počas celej práce',
      'Kontrola kvality a logiky textu',
      'Humanizácia textu',
      'Návrh štruktúry a osnovy',
      'Pomoc s citáciami a zdrojmi',
      'Plánovanie práce',
      'Príprava e-mailov pre vyučujúceho',
      'Všetko v jednom systéme',
    ],
  },
  {
    id: 'bachelor-thesis',
    name: 'BAKALÁRSKA PRÁCA',
    price: formatCatalogPrice(PLANS['bachelor-thesis'].priceCents),
    priceAmount: PLANS['bachelor-thesis'].priceCents / 100,
    period: 'jednorazovo',
    scope: `Rozsah do ${PLANS['bachelor-thesis'].pageLimit} strán`,
    badge: 'Najobľúbenejší balík',
    description:
      'Kompletné riešenie od prvého zadania až po prípravu na úspešnú obhajobu bakalárskej práce.',
    highlighted: true,
    features: [
      'Vytvorenie celej bakalárskej práce',
      'Metodické vedenie počas celého písania',
      'Kontrola kvality, logiky a konzistentnosti textu',
      'Humanizácia textu',
      'Pomoc so správnymi citáciami a zdrojmi',
      'Spracovanie dotazníkov a štatistiky',
      'Tvorba grafov a tabuliek',
      'Príprava prezentácie na obhajobu',
      'Príprava odpovedí na otázky komisie',
      'Plánovanie práce a termínov',
      'Návrhy e-mailov pre školiteľa',
      'Všetko v jednom systéme',
    ],
  },
  {
    id: 'master-thesis',
    name: 'DIPLOMOVÁ / MAGISTERSKÁ PRÁCA',
    price: formatCatalogPrice(PLANS['master-thesis'].priceCents),
    priceAmount: PLANS['master-thesis'].priceCents / 100,
    period: 'jednorazovo',
    scope: `Rozsah do ${PLANS['master-thesis'].pageLimit} strán`,
    badge: 'Najkomplexnejší balík',
    description:
      'Najkomplexnejší balík pre náročné záverečné práce s pokročilou metodikou a analýzou dát.',
    features: [
      'Vytvorenie celej diplomovej alebo magisterskej práce',
      'Metodické vedenie počas celého procesu',
      'Kontrola kvality a odbornosti textu',
      'Humanizácia textu',
      'Pomoc so zdrojmi a citáciami',
      'Komplexné spracovanie štatistiky',
      'Deskriptívna štatistika',
      'Testovanie hypotéz',
      'Korelačné analýzy',
      'Testovanie normality dát',
      'Tvorba grafov a tabuliek',
      'Príprava prezentácie na obhajobu',
      'Simulácia otázok komisie',
      'Plánovanie celej práce',
      'Podklady pre komunikáciu so školiteľom',
      'Všetko v jednom systéme',
    ],
  },
];

const addonServices: AddonService[] = [
  {
    id: 'data-analysis',
    name: 'Analýza dát',
    price: formatCatalogPrice(ADDONS['data-analysis'].priceCents),
    priceAmount: ADDONS['data-analysis'].priceCents / 100,
    description:
      'Kompletné spracovanie štatistickej a analytickej časti práce.',
    features: [
      'Spracovanie dotazníkov',
      'Čistenie a príprava dát',
      'Deskriptívna štatistika',
      'Testovanie normality',
      'Korelačné analýzy',
      'Frekvenčné tabuľky',
      'Tvorba škál a subškál',
      'Grafy a tabuľky',
    ],
  },
  {
    id: 'extra-20',
    name: 'Extra 20 strán',
    price: formatCatalogPrice(ADDONS['extra-20'].priceCents),
    priceAmount: ADDONS['extra-20'].priceCents / 100,
    description:
      'Rozšírenie vybraného projektu o ďalších 20 spracovaných strán.',
    features: [
      `Rozšírenie rozsahu o ${ADDONS['extra-20'].extraPages} strán`,
      'Zachovanie štýlu a štruktúry práce',
      'Kontrola nadväznosti nového obsahu',
    ],
  },
  {
    id: 'extra-40',
    name: 'Extra 40 strán',
    price: formatCatalogPrice(ADDONS['extra-40'].priceCents),
    priceAmount: ADDONS['extra-40'].priceCents / 100,
    description:
      'Rozšírenie vybraného projektu o ďalších 40 spracovaných strán.',
    features: [
      `Rozšírenie rozsahu o ${ADDONS['extra-40'].extraPages} strán`,
      'Zachovanie štýlu a štruktúry práce',
      'Kontrola nadväznosti nového obsahu',
    ],
  },
  {
    id: 'extra-60',
    name: 'Extra 60 strán',
    price: formatCatalogPrice(ADDONS['extra-60'].priceCents),
    priceAmount: ADDONS['extra-60'].priceCents / 100,
    description:
      'Rozšírenie vybraného projektu o ďalších 60 spracovaných strán.',
    features: [
      `Rozšírenie rozsahu o ${ADDONS['extra-60'].extraPages} strán`,
      'Zachovanie štýlu a štruktúry práce',
      'Kontrola nadväznosti nového obsahu',
    ],
  },
];

function isValidPlanId(value: unknown): value is PlanId {
  return (
    typeof value === 'string' &&
    VALID_PLAN_IDS.includes(value as PlanId)
  );
}

function isValidAddonId(value: unknown): value is AddonId {
  return (
    typeof value === 'string' &&
    VALID_ADDON_IDS.includes(value as AddonId)
  );
}

function parseStoredAddonIds(raw: string | null): AddonId[] {
  if (!raw) return [];

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = raw.split(',').map((value) => value.trim());
  }

  if (!Array.isArray(parsed)) return [];

  return Array.from(new Set(parsed.filter(isValidAddonId)));
}

function isValidPaidPlanId(
  value: string,
): value is Exclude<PlanId, 'free'> {
  return VALID_PAID_PLAN_IDS.includes(
    value as Exclude<PlanId, 'free'>,
  );
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getFriendlyCheckoutError(
  data: CheckoutResponse,
  fallback: string,
) {
  if (data?.displayMessage) return data.displayMessage;

  if (data?.error === 'INVALID_PLAN' || data?.code === 'INVALID_PLAN') {
    return [
      'Backend odmietol balík ako INVALID_PLAN.',
      '',
      `Odoslaný plán: ${data.receivedPlan || 'nezistené'}`,
      '',
      'V súbore app/api/payments/checkout/route.ts musia byť povolené tieto ID platených balíkov:',
      VALID_PAID_PLAN_IDS.join(', '),
    ].join('\n');
  }

  const message = [
    data?.error,
    data?.message,
    data?.detail,
    data?.reason ? `Dôvod: ${data.reason}` : '',
    data?.solution ? `Riešenie: ${data.solution}` : '',
    data?.technicalCode
      ? `Technický kód: ${data.technicalCode}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return message || fallback;
}

async function postCheckout(payload: unknown) {
  const response = await fetch('/api/payments/checkout', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response
    .json()
    .catch(() => ({}))) as CheckoutResponse;

  return {
    response,
    data,
  };
}

export default function PackagesPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement | null>(null);

  const [selectedPlan, setSelectedPlan] =
    useState<PlanId>(DEFAULT_PLAN_ID);

  const [selectedAddons, setSelectedAddons] =
    useState<AddonId[]>([]);

  const [loadingPayment, setLoadingPayment] =
    useState(false);

  const [loadingPlanId, setLoadingPlanId] =
    useState<PlanId | null>(null);

  const [paymentError, setPaymentError] =
    useState('');


  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedPlan = window.localStorage.getItem(
      STORAGE_SELECTED_PLAN,
    );

    if (isValidPlanId(storedPlan)) {
      setSelectedPlan(storedPlan);
    } else if (storedPlan) {
      window.localStorage.removeItem(STORAGE_SELECTED_PLAN);
    }

    const storedAddons = parseStoredAddonIds(
      window.localStorage.getItem(STORAGE_SELECTED_ADDONS),
    );

    setSelectedAddons(storedAddons);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      STORAGE_SELECTED_PLAN,
      selectedPlan,
    );

    if (selectedPlan === 'free') {
      if (selectedAddons.length > 0) {
        setSelectedAddons([]);
      }

      window.localStorage.removeItem(STORAGE_SELECTED_ADDONS);
      return;
    }

    window.localStorage.setItem(
      STORAGE_SELECTED_ADDONS,
      JSON.stringify(selectedAddons.filter(isValidAddonId)),
    );
  }, [selectedPlan, selectedAddons]);

  const selectedPlanData = useMemo(() => {
    return (
      packagePlans.find(
        (plan) => plan.id === selectedPlan,
      ) || packagePlans[0]
    );
  }, [selectedPlan]);

  const selectedAddonData = useMemo(() => {
    return addonServices.filter((addon) =>
      selectedAddons.includes(addon.id),
    );
  }, [selectedAddons]);

  const addonsTotal = useMemo(() => {
    return selectedAddonData.reduce(
      (sum, addon) => sum + addon.priceAmount,
      0,
    );
  }, [selectedAddonData]);

  const totalAmount =
    selectedPlanData.priceAmount + addonsTotal;

  const goToMenu = () => {
    router.push('/dashboard');
  };

  const scrollToTop = () => {
    pageRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const activateFreePlan = () => {
    setSelectedPlan('free');
    setSelectedAddons([]);
    setPaymentError('');

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        STORAGE_SELECTED_PLAN,
        'free',
      );
      window.localStorage.removeItem(STORAGE_SELECTED_ADDONS);
    }

    // Serverové entitlements zostávajú jediným zdrojom oprávnení.
    router.push('/dashboard?plan=free');
  };

  const toggleAddon = (addonId: AddonId) => {
    if (!isValidAddonId(addonId)) {
      setPaymentError(
        'Vybraný doplnok nie je súčasťou aktuálneho billing katalógu.',
      );
      return;
    }

    if (selectedPlan === 'free') {
      setPaymentError(
        'Doplnkové služby je možné pridať k platenému balíku. Najskôr vyberte seminárnu, bakalársku alebo diplomovú prácu.',
      );
      return;
    }

    setPaymentError('');

    setSelectedAddons((current) =>
      current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId],
    );
  };

  const getEmailForCheckout = async () => {
    let email = '';

    if (typeof window !== 'undefined') {
      email =
        window.localStorage.getItem(
          'zedpera_user_email',
        ) ||
        window.localStorage.getItem(
          'zedpera_email',
        ) ||
        window.localStorage.getItem('user_email') ||
        window.localStorage.getItem('email') ||
        '';
    }

    if (!email && typeof window !== 'undefined') {
      const enteredEmail = window.prompt(
        'Zadajte e-mail, na ktorý bude naviazaná platba:',
      );

      email = enteredEmail?.trim() || '';

      if (email) {
        window.localStorage.setItem(
          'zedpera_email',
          email,
        );
      }
    }

    email = email.trim().toLowerCase();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Zadajte platnú e-mailovú adresu.');
    }

    return email;
  };

  const handleCheckout = async (
    planId?: PlanId,
  ) => {
    const checkoutPlanId =
      planId || selectedPlan;

    if (checkoutPlanId === 'free') {
      activateFreePlan();
      return;
    }

    if (!isValidPaidPlanId(checkoutPlanId)) {
      setPaymentError(
        `Neplatný balík: ${checkoutPlanId}. Skontrolujte ID balíka vo frontende a na backende.`,
      );
      return;
    }

    const checkoutPlan = packagePlans.find(
      (plan) => plan.id === checkoutPlanId,
    );

    if (!checkoutPlan) {
      setPaymentError(
        'Vybraný balík sa nenašiel v aktuálnom pricing katalógu.',
      );
      return;
    }

    try {
      setLoadingPayment(true);
      setLoadingPlanId(checkoutPlanId);
      setPaymentError('');

      const email = await getEmailForCheckout();

      if (!email) {
        setPaymentError(
          'Pre pokračovanie na platbu je potrebný e-mail.',
        );
        return;
      }

      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : '';

      const validAddonIds = selectedAddons.filter(isValidAddonId);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          STORAGE_SELECTED_PLAN,
          checkoutPlan.id,
        );

        window.localStorage.setItem(
          STORAGE_SELECTED_ADDONS,
          JSON.stringify(validAddonIds),
        );
      }

      /*
       * Klient posiela iba kanonické ID balíka a doplnkov.
       * Backend musí cenu a Stripe Price ID načítať zo serverového katalógu.
       */
      const payload = {
        plan: checkoutPlan.id,
        planId: checkoutPlan.id,
        addons: validAddonIds,
        addonIds: validAddonIds,
        email,
        customerEmail: email,
        successUrl: `${origin}/dashboard?success=1&payment=success&plan=${encodeURIComponent(
          checkoutPlan.id,
        )}`,
        cancelUrl: `${origin}/pricing?canceled=1&plan=${encodeURIComponent(
          checkoutPlan.id,
        )}`,
      };

      const checkoutResult = await postCheckout(payload);

      if (
        checkoutResult.response.ok &&
        checkoutResult.data?.url
      ) {
        window.location.assign(checkoutResult.data.url);
        return;
      }

      throw new Error(
        getFriendlyCheckoutError(
          checkoutResult.data,
          `Platobnú bránu sa nepodarilo spustiť. HTTP ${checkoutResult.response.status}.`,
        ),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Platbu sa nepodarilo spustiť.';

      console.error(
        'PAYMENT ERROR:',
        error,
      );

      setPaymentError(message);
    } finally {
      setLoadingPayment(false);
      setLoadingPlanId(null);
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
            onClick={goToMenu}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
          >
            <Menu size={18} />
            Menu
          </button>

          <div className="hidden text-sm font-semibold text-slate-400 sm:block">
            Jednorazové akademické balíky
          </div>

          <button
            type="button"
            onClick={goToMenu}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-purple-400/30 bg-purple-600/20 px-4 py-2 text-sm font-bold text-purple-100 transition hover:bg-purple-600/30"
          >
            <ArrowLeft size={18} />
            Späť do menu
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-10 pb-32 sm:px-6 lg:px-8">
        <section>
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200">
              <Crown size={16} />
              Akademické balíky a doplnkové služby
            </div>

            <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Vyberte si riešenie podľa typu a rozsahu práce
            </h1>

            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-300 sm:text-lg">
              Platené balíky sú jednorazové. Zahŕňajú AI podporu, metodické vedenie,
              kontrolu kvality, prácu so zdrojmi, plánovanie a ďalšie funkcie podľa
              zvoleného typu akademickej práce.
            </p>

            <div className="mt-5 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
              <HeroInfo
                icon={<ShieldCheck size={18} />}
                title="Jednorazová platba"
                text="Bez automatického mesačného predplatného."
              />

              <HeroInfo
                icon={<FileText size={18} />}
                title="Rozsah podľa balíka"
                text="Jasne určený maximálny rozsah práce."
              />

              <HeroInfo
                icon={<Sparkles size={18} />}
                title="Všetko v jednom"
                text="Písanie, kontrola, zdroje, plánovanie aj obhajoba."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {packagePlans.map((plan) => {
              const selected =
                selectedPlan === plan.id;

              const isLoadingThisPlan =
                loadingPlanId === plan.id;

              return (
                <article
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlan(plan.id);
                    setPaymentError('');

                    if (plan.isFree) {
                      setSelectedAddons([]);
                    }
                  }}
                  className={[
                    'relative flex cursor-pointer flex-col rounded-3xl border p-6 text-left shadow-xl transition',
                    'hover:-translate-y-1',
                    selected
                      ? 'border-purple-400 bg-purple-600/20 shadow-purple-950/40'
                      : 'border-white/10 bg-[#0f172a] hover:border-purple-400/50 hover:bg-[#111c33]',
                    plan.highlighted
                      ? 'ring-1 ring-fuchsia-400/30'
                      : '',
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

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black leading-7 text-white">
                        {plan.name}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {plan.description}
                      </p>
                    </div>

                    {selected && (
                      <div className="shrink-0 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                        Vybrané
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <div className="text-4xl font-black text-white">
                      {plan.price}
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
                    {plan.features.map(
                      (feature) => (
                        <li
                          key={feature}
                          className="flex gap-2"
                        >
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-purple-400" />
                          <span>{feature}</span>
                        </li>
                      ),
                    )}
                  </ul>

                  <button
                    type="button"
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                      event.stopPropagation();
                      setSelectedPlan(plan.id);
                      setPaymentError('');

                      if (plan.isFree) {
                        activateFreePlan();
                        return;
                      }

                      void handleCheckout(plan.id);
                    }}
                    disabled={loadingPayment}
                    className={[
                      'mt-7 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-4',
                      'text-sm font-black text-white transition',
                      'disabled:cursor-not-allowed disabled:opacity-60',
                      plan.isFree
                        ? 'border border-emerald-400/30 bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:opacity-90',
                    ].join(' ')}
                  >
                    {isLoadingThisPlan ? (
                      <>
                        <Loader2
                          className="animate-spin"
                          size={18}
                        />
                        Presmerovávam...
                      </>
                    ) : plan.isFree ? (
                      <>
                        <Gift size={18} />
                        Vyskúšať zadarmo
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        Vybrať a zaplatiť
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#050816] p-5 shadow-xl sm:p-7">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 text-purple-300">
              <BarChart3 size={21} />

              <h2 className="text-2xl font-black text-white">
                Doplnkové služby
              </h2>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Doplnkové služby môžete pridať k seminárnej, bakalárskej alebo
              diplomovej práci. Pri zvolenej FREE verzii nie sú doplnky dostupné.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {addonServices.map((addon) => {
              const selected =
                selectedAddons.includes(addon.id);

              const disabled =
                selectedPlan === 'free';

              return (
                <button
                  key={addon.id}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    toggleAddon(addon.id)
                  }
                  className={[
                    'flex min-h-[170px] flex-col justify-between gap-5 rounded-2xl border p-5 text-left transition sm:flex-row',
                    disabled
                      ? 'cursor-not-allowed border-white/5 bg-white/[0.03] opacity-50'
                      : selected
                        ? 'border-purple-400 bg-purple-600/20'
                        : 'border-white/10 bg-[#0f172a] hover:border-purple-400/40 hover:bg-[#111c33]',
                  ].join(' ')}
                >
                  <div>
                    <div className="text-lg font-black text-white">
                      {addon.name}
                    </div>

                    <div className="mt-1 text-sm leading-6 text-slate-300">
                      {addon.description}
                    </div>

                    <ul className="mt-3 space-y-1.5 text-xs leading-5 text-slate-400">
                      {addon.features.map(
                        (feature) => (
                          <li
                            key={feature}
                            className="flex gap-2"
                          >
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400" />
                            <span>{feature}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  <div className="shrink-0 text-2xl font-black text-white">
                    {addon.price}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-7 rounded-3xl border border-white/10 bg-black/30 p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-purple-300">
                  Vybraný balík
                </div>

                <div className="mt-1 text-2xl font-black text-white">
                  {selectedPlanData.name}
                </div>

                <div className="mt-1 text-sm leading-6 text-slate-300">
                  {selectedPlanData.price} ·{' '}
                  {selectedPlanData.period} ·{' '}
                  {selectedPlanData.scope}
                </div>
              </div>

              <div className="xl:text-right">
                <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Celková cena
                </div>

                <div className="mt-1 text-4xl font-black text-white">
                  {formatPrice(totalAmount)}
                </div>
              </div>
            </div>

            {selectedAddonData.length > 0 && (
              <div className="mt-5 border-t border-white/10 pt-5">
                <div className="text-sm font-bold text-white">
                  Vybrané doplnkové služby
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedAddonData.map(
                    (addon) => (
                      <span
                        key={addon.id}
                        className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-100"
                      >
                        {addon.name} ({addon.price})
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          {paymentError && (
            <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold leading-6 text-red-200">
              {paymentError}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              void handleCheckout()
            }
            disabled={loadingPayment}
            className={[
              'mt-6 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-6 py-4',
              'text-center text-base font-black text-white transition sm:text-lg',
              'disabled:cursor-not-allowed disabled:opacity-60',
              selectedPlanData.isFree
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:opacity-90',
            ].join(' ')}
          >
            {loadingPayment ? (
              <>
                <Loader2
                  className="animate-spin"
                  size={20}
                />
                Presmerovávam na platbu...
              </>
            ) : selectedPlanData.isFree ? (
              <>
                <Gift size={20} />
                Pokračovať do FREE verzie
              </>
            ) : (
              <>
                <CreditCard size={20} />
                Zaplatiť {formatPrice(totalAmount)}
              </>
            )}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            AI systém poskytuje odbornú podporu pri príprave akademickej práce.
            Používateľ je zodpovedný za kontrolu, konečnú úpravu, správnosť údajov
            a dodržanie pravidiel svojej školy.
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0f172a] p-6 shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Paperclip
                  className="text-purple-400"
                  size={24}
                />

                <h2 className="text-2xl font-black text-white">
                  Akademický pracovník a individuálny mentoring
                </h2>
              </div>

              <p className="mt-2 max-w-3xl leading-7 text-slate-300">
                Potrebujete individuálnu pomoc od odborníka? Vyberte si krajinu
                a pokračujte na stránku partnerskej služby.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <a
                  href="https://www.zaverecneprace.sk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-green-400/50 hover:bg-green-500/10"
                >
                  <div className="text-sm text-slate-400">
                    Slovensko
                  </div>

                  <div className="mt-1 font-bold text-white">
                    www.zaverecneprace.sk
                  </div>
                </a>

                <a
                  href="https://www.zaverecne-prace.cz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-blue-400/50 hover:bg-blue-500/10"
                >
                  <div className="text-sm text-slate-400">
                    Česko
                  </div>

                  <div className="mt-1 font-bold text-white">
                    www.zaverecne-prace.cz
                  </div>
                </a>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
              <a
                href="https://www.zaverecneprace.sk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-500"
              >
                <ExternalLink size={18} />
                Slovensko
              </a>

              <a
                href="https://www.zaverecne-prace.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500"
              >
                <ExternalLink size={18} />
                Česko
              </a>
            </div>
          </div>
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
  icon: React.ReactNode;
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
