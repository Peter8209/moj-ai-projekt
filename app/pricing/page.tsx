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
} from 'lucide-react';

type PackagePlan = {
  id:
    | 'week-mini'
    | 'week-student'
    | 'week-pro'
    | 'monthly'
    | 'three-months'
    | 'year-pro'
    | 'year-max';
  name: string;
  price: string;
  oldPrice?: string;
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
    | 'ai-supervisor'
    | 'quality-audit'
    | 'defense'
    | 'originality'
    | 'extra-50'
    | 'extra-100'
    | 'premium-model'
    | 'express';
  name: string;
  price: string;
  oldPrice?: string;
  description: string;
};

const packagePlans: PackagePlan[] = [
  {
    id: 'week-mini',
    name: 'Týždeň MINI',
    price: '13,20 €',
    oldPrice: '15,84 €',
    period: '7 dní',
    pages: '25 strán',
    works: '1 práca',
    supervisor: '2 kontroly',
    audit: '1 audit',
    defense: 'Bez obhajoby',
    badge: 'Rýchly štart',
    description: 'Vhodné na seminárnu prácu, kapitolu alebo rýchlu úpravu textu.',
    features: [
      'Základné AI písanie',
      'Profil práce a zadania',
      'Základná spätná väzba',
      'Export textového výstupu',
    ],
  },
  {
    id: 'week-student',
    name: 'Týždeň ŠTUDENT',
    price: '26,50 €',
    oldPrice: '31,80 €',
    period: '7 dní',
    pages: '50 strán',
    works: '2 práce',
    supervisor: '5 kontrol',
    audit: '2 audity',
    defense: 'Bez obhajoby',
    badge: 'Študentský balík',
    description: 'Vhodné na seminárku, ročníkovú prácu alebo väčšiu kapitolu.',
    features: [
      'AI písanie práce',
      'AI vedúci práce',
      'Audit kvality textu',
      'Zdroje a citácie',
    ],
  },
  {
    id: 'week-pro',
    name: 'Týždeň PRO',
    price: '39,90 €',
    oldPrice: '47,88 €',
    period: '7 dní',
    pages: '100 strán',
    works: '3 práce',
    supervisor: '10 kontrol',
    audit: '4 audity',
    defense: '1 obhajoba',
    badge: 'Pred odovzdaním',
    description: 'Pre intenzívnu prácu pred odovzdaním alebo obhajobou.',
    features: [
      'AI písanie práce',
      'AI vedúci práce',
      'Audit kvality',
      'Obhajoba + otázky',
      'Prezentácia k obhajobe',
    ],
  },
  {
    id: 'monthly',
    name: 'Mesačný START',
    price: '53,20 €',
    oldPrice: '63,84 €',
    period: '1 mesiac',
    pages: '150 strán',
    works: '5 prác',
    supervisor: '15 kontrol',
    audit: '5 auditov',
    defense: '1 obhajoba',
    badge: 'Hlavný balík',
    description: 'Základný hlavný plán pre priebežnú prácu počas mesiaca.',
    features: [
      '150 strán mesačne',
      'AI písanie práce',
      'AI vedúci práce',
      'Audit kvality',
      'Obhajoba a prezentácia',
      'Plánovanie a emaily',
    ],
  },
  {
    id: 'three-months',
    name: '3 mesiace ŠTUDENT',
    price: '93,30 €',
    oldPrice: '111,96 €',
    period: '3 mesiace',
    pages: '350 strán',
    works: '10 prác',
    supervisor: '35 kontrol',
    audit: '12 auditov',
    defense: '3 obhajoby',
    badge: 'Najvýhodnejší',
    description: 'Najlepší pomer ceny a výkonu pre bakalársku alebo diplomovú prácu.',
    features: [
      '350 strán na 3 mesiace',
      'AI písanie a zdroje',
      'AI vedúci práce',
      'Audit kvality',
      '3 obhajoby',
      'Dlhšie plánovanie práce',
    ],
  },
  {
    id: 'year-pro',
    name: 'Ročný PRO',
    price: '320 €',
    oldPrice: '384 €',
    period: '12 mesiacov',
    pages: '1 500 strán',
    works: 'Neobmedzené projekty',
    supervisor: '150 kontrol',
    audit: '50 auditov',
    defense: '10 obhajôb',
    badge: 'Dlhodobé používanie',
    description: 'Ročný balík pre študentov, konzultantov alebo intenzívne používanie.',
    features: [
      '1 500 strán ročne',
      'Všetky hlavné moduly',
      'AI vedúci práce',
      'Audit kvality',
      '10 obhajôb',
      'Vhodné na celý akademický rok',
    ],
  },
  {
    id: 'year-max',
    name: 'Ročný MAX',
    price: '532 €',
    oldPrice: '638,40 €',
    period: '12 mesiacov',
    pages: '2 000 strán',
    works: 'Neobmedzené projekty',
    supervisor: '250 kontrol',
    audit: '80 auditov',
    defense: '15 obhajôb',
    badge: 'Prémiový plán',
    description: 'Pre náročných používateľov, ktorí chcú vyššie limity a prémiové moduly.',
    features: [
      '2 000 strán ročne',
      'Vyššie limity',
      'Prémiové AI modely podľa dostupnosti',
      '15 obhajôb',
      'Rozšírený audit',
      'Vhodné aj pre mentoring',
    ],
  },
];

const addonServices: AddonService[] = [
  {
    id: 'ai-supervisor',
    name: 'AI vedúci práce',
    price: '39,90 €',
    oldPrice: '47,88 €',
    description: 'Detailná spätná väzba do 100 strán.',
  },
  {
    id: 'quality-audit',
    name: 'Kontrola kvality práce',
    price: '39,90 €',
    oldPrice: '47,88 €',
    description: 'Audit logiky, metodológie, argumentácie a štruktúry.',
  },
  {
    id: 'defense',
    name: 'Obhajoba + prezentácia',
    price: '53,20 €',
    oldPrice: '63,84 €',
    description: 'Prezentácia, otázky komisie a návrhy odpovedí.',
  },
  {
    id: 'originality',
    name: 'Kontrola originality',
    price: '16 €',
    oldPrice: '19,20 €',
    description: 'Orientačný report originality a rizikových pasáží.',
  },
  {
    id: 'extra-50',
    name: 'Extra 50 strán',
    price: '13,20 €',
    oldPrice: '15,84 €',
    description: 'Doplnenie limitu o 50 strán.',
  },
  {
    id: 'extra-100',
    name: 'Extra 100 strán',
    price: '26,50 €',
    oldPrice: '31,80 €',
    description: 'Doplnenie limitu o 100 strán.',
  },
  {
    id: 'premium-model',
    name: 'Prémiový model Claude/Grok',
    price: '13,20 €',
    oldPrice: '15,84 €',
    description: 'Kvalitnejšia kritika, audit a odborné hodnotenie.',
  },
  {
    id: 'express',
    name: 'Expresné spracovanie',
    price: '26,50 €',
    oldPrice: '31,80 €',
    description: 'Prednostné spracovanie požiadaviek.',
  },
];

export default function PackagesPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<PackagePlan['id']>('monthly');
  const [selectedAddons, setSelectedAddons] = useState<AddonService['id'][]>([]);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const selectedPlanData = useMemo(() => {
    return packagePlans.find((plan) => plan.id === selectedPlan) || packagePlans[0];
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

  const handleCheckout = async () => {
    try {
      setLoadingPayment(true);
      setPaymentError('');

      let email = '';

      if (typeof window !== 'undefined') {
        email =
          window.localStorage.getItem('zedpera_email') ||
          window.localStorage.getItem('user_email') ||
          '';
      }

      if (!email && typeof window !== 'undefined') {
        const enteredEmail = window.prompt(
          'Zadajte e-mail, na ktorý bude naviazaná platba:',
        );

        email = enteredEmail?.trim() || '';
      }

      if (!email) {
        setPaymentError('Pre pokračovanie na platbu je potrebný e-mail.');
        return;
      }

      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlanData.id,
          addons: selectedAddons,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok || !data.url) {
        throw new Error(
          data.detail ||
            data.message ||
            data.error ||
            'Platbu sa nepodarilo spustiť.',
        );
      }

      window.location.href = data.url;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Platbu sa nepodarilo spustiť.';

      console.error('PAYMENT ERROR:', error);
      setPaymentError(message);
    } finally {
      setLoadingPayment(false);
    }
  };

  return (
    <div
      ref={pageRef}
      className="fixed inset-0 h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-[#020617] text-white"
    >
      {/* TOP MENU */}
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
            Dashboard
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
              Vyber si plán podľa rozsahu práce. Doplnky môžeš pridať pred platbou.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {packagePlans.map((plan) => {
              const selected = selectedPlan === plan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlan(plan.id);
                    setPaymentError('');
                  }}
                  className={`relative flex min-h-[520px] flex-col rounded-3xl border p-6 text-left shadow-xl transition ${
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

                    {plan.oldPrice && (
                      <div className="pb-1 text-sm text-gray-400 line-through">
                        {plan.oldPrice}
                      </div>
                    )}
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

                  <ul className="mt-5 space-y-2 text-sm text-gray-200">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </button>
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
              Doplnky môžeš pridať k vybranému balíku pred platbou.
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

                    {addon.oldPrice && (
                      <div className="text-right text-xs font-semibold text-gray-400 line-through">
                        {addon.oldPrice}
                      </div>
                    )}
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
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
              {paymentError}
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={loadingPayment}
            className="mt-6 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 text-center text-lg font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingPayment ? 'Presmerovávam na Stripe...' : 'Pokračovať na platbu'}
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
          <strong>Poznámka k limitom:</strong> Limity strán sú orientačné a
          zahŕňajú AI písanie, audit, prácu s profilom, obhajobu, plánovanie,
          emaily a pomocné výstupy. Pri náročných alebo opakovaných požiadavkách
          môže byť spotreba vyššia.
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