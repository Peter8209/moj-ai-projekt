'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, CheckCircle2, Crown, Sparkles } from 'lucide-react';

type PackagePlan = {
  id: string;
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
  id: string;
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
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const selectedPlanData = useMemo(() => {
    return packagePlans.find((plan) => plan.id === selectedPlan) || packagePlans[0];
  }, [selectedPlan]);

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((current) =>
      current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId],
    );
  };

  const createPaymentUrl = () => {
    const params = new URLSearchParams();

    params.set('plan', selectedPlanData.id);
    params.set('planName', selectedPlanData.name);
    params.set('price', selectedPlanData.price);

    if (selectedAddons.length > 0) {
      params.set('addons', selectedAddons.join(','));
    }

    return `/api/checkout?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <section>
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white">
            Balíčky a doplnky
          </h1>

          <p className="mt-3 text-lg text-gray-400">
            Vyber si plán podľa rozsahu práce. Doplnky môžeš pridať pred platbou.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {packagePlans.map((plan) => {
            const selected = selectedPlan === plan.id;

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative flex min-h-[360px] flex-col rounded-3xl border p-6 text-left transition ${
                  selected
                    ? 'border-purple-400 bg-purple-600/15 shadow-2xl shadow-purple-950/40'
                    : 'border-white/10 bg-white/5 hover:border-purple-400/50 hover:bg-white/10'
                }`}
              >
                {plan.badge && (
                  <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-purple-600/30 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-100">
                    <Crown size={14} />
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      {plan.name}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {plan.description}
                    </p>
                  </div>

                  {selected && (
                    <div className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-300">
                      Vybrané
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-end gap-3">
                  <div className="text-4xl font-black text-white">
                    {plan.price}
                  </div>

                  {plan.oldPrice && (
                    <div className="pb-1 text-sm text-gray-500 line-through">
                      {plan.oldPrice}
                    </div>
                  )}
                </div>

                <div className="mt-1 text-sm text-gray-400">{plan.period}</div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <PackageInfo label="Limit" value={plan.pages} />
                  <PackageInfo label="Práce" value={plan.works} />
                  <PackageInfo label="AI vedúci" value={plan.supervisor} />
                  <PackageInfo label="Audit" value={plan.audit} />
                </div>

                <div className="mt-5 rounded-2xl bg-black/20 p-3 text-sm">
                  <div className="text-gray-500">Obhajoba</div>
                  <div className="font-bold text-white">{plan.defense}</div>
                </div>

                <ul className="mt-5 space-y-2 text-sm text-gray-300">
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

      <section className="rounded-3xl border border-white/10 bg-[#050816] p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-black text-white">
            Doplnkové služby
          </h2>

          <p className="mt-2 text-sm text-gray-400">
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
                onClick={() => toggleAddon(addon.id)}
                className={`flex items-center justify-between gap-4 rounded-2xl border p-5 text-left transition ${
                  selected
                    ? 'border-purple-400 bg-purple-600/20'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="text-lg font-bold text-white">
                    {addon.name}
                  </div>

                  <div className="mt-1 text-sm text-gray-400">
                    {addon.description}
                  </div>
                </div>

                <div className="shrink-0 text-xl font-black text-white">
                  <div>{addon.price}</div>

                  {addon.oldPrice && (
                    <div className="text-right text-xs font-semibold text-gray-500 line-through">
                      {addon.oldPrice}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <a
          href={createPaymentUrl()}
          className="mt-6 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 text-center text-lg font-black text-white transition hover:opacity-90"
        >
          Pokračovať na platbu
        </a>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-400" size={24} />
              <h2 className="text-2xl font-black text-white">
                Akademický pracovník + mentoring
              </h2>
            </div>

            <p className="mt-2 text-gray-400">
              Potrebuješ pomoc od reálneho experta? Klikni podľa krajiny a otvorí sa webová stránka.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <a
                href="https://www.zaverecneprace.sk"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-green-400/50 hover:bg-green-500/10"
              >
                <div className="text-sm text-gray-500">Slovensko</div>
                <div className="mt-1 font-bold text-white">
                  www.zaverecneprace.sk
                </div>
              </a>

              <a
                href="https://www.zaverecne-prace.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-blue-400/50 hover:bg-blue-500/10"
              >
                <div className="text-sm text-gray-500">Česko</div>
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
    </div>
  );
}

function PackageInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <div className="text-gray-500">{label}</div>
      <div className="font-bold text-white">{value}</div>
    </div>
  );
}