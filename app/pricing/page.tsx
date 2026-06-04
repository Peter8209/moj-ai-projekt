'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  CheckCircle2,
  Crown,
  Sparkles,
  Menu,
  ArrowLeft,
  ArrowUp,
  CreditCard,
  Loader2,
} from 'lucide-react';

type PackagePlan = {
  id:
    | 'start-basic'
    | 'student-plus'
    | 'pro-thesis'
    | 'elite-academic'
    | 'year-max';
  name: string;
  price: string;
  period: string;
  pages: string;
  works: string;
  supervisor: string;
  audit: string;
  defense: string;
  badge?: string;
  description: string;
  features: string[];
};

type AddonService = {
  id:
    | 'extra-50'
    | 'extra-100'
    | 'ai-supervisor'
    | 'quality-audit'
    | 'defense-presentation'
    | 'originality-check'
    | 'premium-ai-mode'
    | 'express-processing'
    | 'express';
  name: string;
  price: string;
  description: string;
};

type CheckoutResponse = {
  ok?: boolean;
  url?: string;
  error?: string;
  message?: string;
  detail?: string;
  reason?: string;
  solution?: string;
  technicalCode?: string;
  displayMessage?: string;
  receivedPlan?: string;
};

const VALID_PLAN_IDS: PackagePlan['id'][] = [
  'start-basic',
  'student-plus',
  'pro-thesis',
  'elite-academic',
];

const packagePlans: PackagePlan[] = [
  {
    id: 'start-basic',
    name: 'START BASIC',
    price: '29 €',
    period: 'mesiac',
    pages: '60 strán / mesiac',
    works: '1 aktívna práca',
    supervisor: '2 kontroly AI vedúceho',
    audit: '1 audit',
    defense: 'Bez obhajoby',
    badge: 'Základný štart',
    description:
      'Základný mesačný plán pre jednu aktívnu prácu, písanie menších rozsahov a základnú AI podporu.',
    features: [
      '60 strán / mesiac',
      '1 aktívna práca',
      'Základný AI model',
      '2 kontroly AI vedúceho',
      '1 audit',
      'Bez obhajoby',
      'Bez premium modelu',
    ],
  },
  {
    id: 'student-plus',
    name: 'ŠTUDENT PLUS',
    price: '59 €',
    period: 'mesiac',
    pages: '130 strán / mesiac',
    works: '3 aktívne práce',
    supervisor: '10 AI kontrol',
    audit: '3 audity',
    defense: '1 obhajoba',
    badge: 'Najlepší pre študenta',
    description:
      'Mesačný plán pre študentov, ktorí potrebujú viac strán, viac aktívnych prác, citácie, zdroje a jednu obhajobu.',
    features: [
      '130 strán / mesiac',
      '3 aktívne práce',
      '10 AI kontrol',
      '3 audity',
      '1 obhajoba',
      'Citácie + zdroje',
      'Štandard AI model',
    ],
  },
  {
    id: 'pro-thesis',
    name: 'PRO THESIS',
    price: '99 €',
    period: 'mesiac',
    pages: '270 strán / mesiac',
    works: '5 prác',
    supervisor: '20 AI kontrol',
    audit: '6 auditov',
    defense: '2 obhajoby',
    badge: 'Pre diplomovku / záverečnú prácu',
    description:
      'Výkonný mesačný plán pre rozsiahlejšiu záverečnú prácu, prioritné spracovanie, premium AI model a prezentáciu.',
    features: [
      '270 strán / mesiac',
      '5 prác',
      '20 AI kontrol',
      '6 auditov',
      '2 obhajoby',
      'Prioritné spracovanie',
      'Premium AI model Claude/Grok tier',
      'Prezentácia',
    ],
  },
  {
    id: 'elite-academic',
    name: 'ELITE ACADEMIC',
    price: '149 €',
    period: 'mesiac',
    pages: '400 strán / mesiac',
    works: '10 prác',
    supervisor: '40 AI kontrol',
    audit: '10 auditov',
    defense: '3 obhajoby',
    badge: 'Najvyšší akademický plán',
    description:
      'Najvyšší mesačný plán pre náročné akademické použitie, viacero prác, vysoké limity a plnú prémiovú AI kapacitu.',
    features: [
      '400 strán / mesiac',
      '10 prác',
      '40 AI kontrol',
      '10 auditov',
      '3 obhajoby',
      'Full premium AI',
      'Prioritná kapacita',
    ],
  },
];

const addonServices: AddonService[] = [
  {
    id: 'extra-50',
    name: 'Extra 50 strán',
    price: '19 €',
    description: 'Doplnenie mesačného limitu o 50 strán.',
  },
  {
    id: 'extra-100',
    name: 'Extra 100 strán',
    price: '35 €',
    description: 'Doplnenie mesačného limitu o 100 strán.',
  },
  {
    id: 'ai-supervisor',
    name: 'AI vedúci',
    price: '59 €',
    description: 'Samostatná služba AI vedúceho práce a detailnej spätnej väzby.',
  },
  {
    id: 'quality-audit',
    name: 'Audit kvality',
    price: '59 €',
    description: 'Kontrola kvality, logiky, štruktúry, metodológie a argumentácie.',
  },
  {
    id: 'defense-presentation',
    name: 'Obhajoba + prezentácia',
    price: '79 €',
    description: 'Príprava obhajoby, otázok komisie, odpovedí a prezentácie.',
  },
  {
    id: 'originality-check',
    name: 'Kontrola originality',
    price: '25 €',
    description: 'Orientačná kontrola originality a rizikových pasáží.',
  },
  {
    id: 'premium-ai-mode',
    name: 'Premium AI mode',
    price: '19 €',
    description: 'Použitie prémiového AI režimu pre náročnejšie výstupy.',
  },
  {
    id: 'express-processing',
    name: 'Expresné spracovanie',
    price: '29 €',
    description: 'Prednostné spracovanie požiadaviek.',
  },
];

function isValidPlanId(value: string): value is PackagePlan['id'] {
  return VALID_PLAN_IDS.includes(value as PackagePlan['id']);
}

function getFriendlyCheckoutError(data: CheckoutResponse, fallback: string) {
  if (data?.displayMessage) return data.displayMessage;

  if (data?.error === 'INVALID_PLAN') {
    return [
      'Backend odmietol balík ako INVALID_PLAN.',
      '',
      `Odoslaný plán: ${data.receivedPlan || 'nezistené'}`,
      '',
      'Skontroluj, či má backend v app/api/payments/checkout/route.ts rovnaké ID balíkov:',
      VALID_PLAN_IDS.join(', '),
    ].join('\n');
  }

  const message = [
    data?.error,
    data?.message,
    data?.detail,
    data?.reason ? `Dôvod: ${data.reason}` : '',
    data?.solution ? `Riešenie: ${data.solution}` : '',
    data?.technicalCode ? `Technický kód: ${data.technicalCode}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return message || fallback;
}

async function postCheckout(endpoint: string, payload: unknown) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as CheckoutResponse;

  return {
    response,
    data,
  };
}

export default function PackagesPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<PackagePlan['id']>('student-plus');
  const [selectedAddons, setSelectedAddons] = useState<AddonService['id'][]>([]);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<PackagePlan['id'] | null>(
    null,
  );
  const [paymentError, setPaymentError] = useState('');

  const selectedPlanData = useMemo(() => {
    return (
      packagePlans.find((plan) => plan.id === selectedPlan) || packagePlans[0]
    );
  }, [selectedPlan]);

  const selectedAddonData = useMemo(() => {
    return addonServices.filter((addon) => selectedAddons.includes(addon.id));
  }, [selectedAddons]);

  const goToMenu = () => {
    router.push('/dashboard');
  };

  const scrollToTop = () => {
    pageRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const toggleAddon = (addonId: AddonService['id']) => {
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
        window.localStorage.getItem('zedpera_user_email') ||
        window.localStorage.getItem('zedpera_email') ||
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
        window.localStorage.setItem('zedpera_email', email);
      }
    }

    return email.trim();
  };

  const handleCheckout = async (planId?: PackagePlan['id']) => {
    const checkoutPlanId = planId || selectedPlan;

    if (!isValidPlanId(checkoutPlanId)) {
      setPaymentError(
        `Neplatný balík: ${checkoutPlanId}. Skontroluj ID balíka vo frontende.`,
      );
      return;
    }

    const checkoutPlan =
      packagePlans.find((plan) => plan.id === checkoutPlanId) ||
      selectedPlanData;

    try {
      setLoadingPayment(true);
      setLoadingPlanId(checkoutPlanId);
      setPaymentError('');

      const email = await getEmailForCheckout();

      if (!email) {
        setPaymentError('Pre pokračovanie na platbu je potrebný e-mail.');
        return;
      }

      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('zedpera_selected_plan', checkoutPlan.id);
        window.localStorage.setItem('zedpera_user_plan', checkoutPlan.id);
      }

      const payload = {
        plan: checkoutPlan.id,
        planId: checkoutPlan.id,
        selectedPlan: checkoutPlan.id,
        planName: checkoutPlan.name,
        price: checkoutPlan.price,
        period: checkoutPlan.period,

        addons: selectedAddons,
        addOns: selectedAddons,
        selectedAddons,

        email,
        customerEmail: email,

        successUrl: `${origin}/dashboard?success=1&payment=success&plan=${checkoutPlan.id}`,
        cancelUrl: `${origin}/pricing?canceled=1&plan=${checkoutPlan.id}`,
      };

      const firstTry = await postCheckout('/api/payments/checkout', payload);

      if (firstTry.response.ok && firstTry.data?.ok && firstTry.data?.url) {
        window.location.assign(firstTry.data.url);
        return;
      }

      const secondTry = await postCheckout('/api/checkout', payload);

      if (secondTry.response.ok && secondTry.data?.ok && secondTry.data?.url) {
        window.location.assign(secondTry.data.url);
        return;
      }

      const firstError = getFriendlyCheckoutError(
        firstTry.data,
        'Platobnú bránu sa nepodarilo spustiť cez /api/payments/checkout.',
      );

      const secondError = getFriendlyCheckoutError(
        secondTry.data,
        'Platobnú bránu sa nepodarilo spustiť ani cez /api/checkout.',
      );

      throw new Error(
        [
          'Stripe platbu sa nepodarilo spustiť.',
          '',
          'Odoslaný balík:',
          checkoutPlan.id,
          '',
          'Prvý pokus:',
          firstError,
          '',
          'Druhý pokus:',
          secondError,
          '',
          'Dôležité: backend musí mať rovnaké ID balíkov ako frontend.',
        ].join('\n'),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Platbu sa nepodarilo spustiť.';

      console.error('PAYMENT ERROR:', error);
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
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={goToMenu}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
          >
            <Menu size={18} />
            Menu
          </button>

          <div className="hidden text-sm font-semibold text-gray-400 sm:block">
            Balíčky a doplnky
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

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-10 pb-32 sm:px-6 lg:px-8">
        <section>
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200">
              <Crown size={16} />
              Predplatné a doplnkové služby
            </div>

            <h1 className="text-4xl font-black text-white sm:text-5xl lg:text-6xl">
              Balíčky a doplnky
            </h1>

            <p className="mt-3 max-w-3xl text-lg text-gray-300 sm:text-xl">
              Vyber si mesačný plán podľa rozsahu práce. Každý balík má mesačný limit strán, počet aktívnych prác, AI kontroly, audity a obhajoby podľa zvoleného programu.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {packagePlans.map((plan) => {
              const selected = selectedPlan === plan.id;
              const isLoadingThisPlan = loadingPlanId === plan.id;

              return (
                <article
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlan(plan.id);
                    setPaymentError('');
                  }}
                  className={`relative flex min-h-[610px] cursor-pointer flex-col rounded-3xl border p-6 text-left shadow-xl transition ${
                    selected
                      ? 'border-purple-400 bg-purple-600/20 shadow-purple-950/40'
                      : 'border-white/10 bg-[#0f172a] hover:border-purple-400/50 hover:bg-[#111c33]'
                  }`}
                >
                  {plan.badge && (
                    <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-purple-600/40 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-100">
                      <Crown size={14} />
                      {plan.badge}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black text-white">
                        {plan.name}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-gray-300">
                        {plan.description}
                      </p>
                    </div>

                    {selected && (
                      <div className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-300">
                        Vybrané
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap items-end gap-3">
                    <div className="text-4xl font-black text-white">
                      {plan.price}
                    </div>
                  </div>

                  <div className="mt-1 text-sm text-gray-300">
                    {plan.period}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                    <PackageInfo label="Limit" value={plan.pages} />
                    <PackageInfo label="Práce" value={plan.works} />
                    <PackageInfo label="AI vedúci" value={plan.supervisor} />
                    <PackageInfo label="Audit" value={plan.audit} />
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm">
                    <div className="text-gray-400">Obhajoba</div>
                    <div className="font-bold text-white">{plan.defense}</div>
                  </div>

                  <ul className="mt-5 flex-1 space-y-2 text-sm text-gray-200">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedPlan(plan.id);
                      void handleCheckout(plan.id);
                    }}
                    disabled={loadingPayment}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingThisPlan ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Presmerovávam...
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

        <section className="rounded-3xl border border-white/10 bg-[#050816] p-6 shadow-xl">
          <div className="mb-5">
            <h2 className="text-2xl font-black text-white">
              Doplnkové služby
            </h2>

            <p className="mt-2 text-sm text-gray-300">
              Doplnkové služby je možné dokúpiť samostatne alebo pridať k vybranému balíku pred platbou.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {addonServices.map((addon) => {
              const selected = selectedAddons.includes(addon.id);

              return (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() => {
                    toggleAddon(addon.id);
                    setPaymentError('');
                  }}
                  className={`flex items-center justify-between gap-4 rounded-2xl border p-5 text-left transition ${
                    selected
                      ? 'border-purple-400 bg-purple-600/20'
                      : 'border-white/10 bg-[#0f172a] hover:bg-[#111c33]'
                  }`}
                >
                  <div>
                    <div className="text-lg font-bold text-white">
                      {addon.name}
                    </div>

                    <div className="mt-1 text-sm text-gray-300">
                      {addon.description}
                    </div>
                  </div>

                  <div className="shrink-0 text-xl font-black text-white">
                    <div>{addon.price}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-bold uppercase tracking-wide text-purple-300">
                  Vybraný balík
                </div>

                <div className="mt-1 text-2xl font-black text-white">
                  {selectedPlanData.name} – {selectedPlanData.price}
                </div>

                <div className="mt-1 text-sm text-gray-300">
                  {selectedPlanData.period} · {selectedPlanData.pages} ·{' '}
                  {selectedPlanData.works}
                </div>
              </div>

              {selectedAddonData.length > 0 && (
                <div className="max-w-xl text-sm text-gray-200">
                  <div className="font-bold text-white">Doplnky:</div>
                  <div className="mt-1">
                    {selectedAddonData
                      .map((addon) => `${addon.name} (${addon.price})`)
                      .join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {paymentError && (
            <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold leading-6 text-red-200">
              {paymentError}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleCheckout()}
            disabled={loadingPayment}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 text-center text-lg font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingPayment ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Presmerovávam na Stripe...
              </>
            ) : (
              <>
                <CreditCard size={20} />
                Pokračovať na platbu
              </>
            )}
          </button>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0f172a] p-6 shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="text-purple-400" size={24} />

                <h2 className="text-2xl font-black text-white">
                  Akademický pracovník + mentoring
                </h2>
              </div>

              <p className="mt-2 text-gray-300">
                Potrebuješ pomoc od reálneho experta? Klikni podľa krajiny a
                otvorí sa webová stránka.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <a
                  href="https://www.zaverecneprace.sk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-green-400/50 hover:bg-green-500/10"
                >
                  <div className="text-sm text-gray-400">Slovensko</div>

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
                  <div className="text-sm text-gray-400">Česko</div>

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
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-500"
              >
                <ExternalLink size={18} />
                Slovensko
              </a>

              <a
                href="https://www.zaverecne-prace.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500"
              >
                <ExternalLink size={18} />
                Česko
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm leading-6 text-yellow-100">
          <strong>Poznámka k limitom:</strong> Limity strán sú mesačné a
          predstavujú rozsah práce v rámci vybraného balíka. AI credits budú
          riešené samostatne a ich hodnoty budú nastavené podľa finálneho
          kreditového modelu.
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

function PackageInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="text-gray-400">{label}</div>
      <div className="font-bold text-white">{value}</div>
    </div>
  );
}