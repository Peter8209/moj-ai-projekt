'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  Crown,
  FileCheck2,
  GraduationCap,
  Library,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

type BillingCycle = 'monthly' | 'yearly';

type PlanId =
  | 'free'
  | 'mini'
  | 'month'
  | 'quarter'
  | 'year'
  | 'supervisor'
  | 'audit'
  | 'defense'
  | 'admin-free';

type PricingPlan = {
  id: PlanId;
  name: string;
  subtitle: string;
  priceMonthly: string;
  priceYearly?: string;
  oldPrice?: string;
  badge?: string;
  highlight?: boolean;
  promo?: string;
  button: string;
  description: string;
  features: string[];
};

type FAQ = {
  question: string;
  answer: string;
};

// =====================================================
// PAGE
// =====================================================

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [billing, setBilling] = useState<BillingCycle>('monthly');

  const plans = useMemo<PricingPlan[]>(
    () => [
      {
        id: 'free',
        name: 'Free',
        subtitle: 'Vyskúšanie systému',
        priceMonthly: '0 €',
        badge: 'Štart',
        button: 'Vyskúšať zadarmo',
        description:
          'Základný vstup do aplikácie pre používateľa, ktorý si chce pozrieť rozhranie a vyskúšať AI asistenta.',
        features: [
          'Vstup do používateľského menu',
          'Základné AI písanie',
          'Ukážka práce s profilom práce',
          'Ukážka AI vedúceho',
          'Limitované používanie',
        ],
      },
      {
        id: 'month',
        name: 'Mesačný balík',
        subtitle: 'Najrýchlejší štart',
        priceMonthly: '40 €',
        oldPrice: '49 €',
        badge: 'Mesačne',
        button: 'Kúpiť mesačný balík',
        description:
          'Vhodné pre študenta, ktorý potrebuje pracovať intenzívne počas jedného mesiaca.',
        features: [
          'AI písanie kapitol',
          'Tvorba osnovy a štruktúry',
          'Práca so zdrojmi a citáciami',
          'AI vedúci práce',
          'Export do Word/PDF',
          'História práce v účte',
        ],
      },
      {
        id: 'quarter',
        name: '3 mesiace',
        subtitle: 'Najvýhodnejší študentský balík',
        priceMonthly: '70 €',
        oldPrice: '120 €',
        badge: 'Promo akcia',
        highlight: true,
        promo: 'Ušetríš oproti mesačnému balíku',
        button: 'Kúpiť 3-mesačný balík',
        description:
          'Najlepší balík pre bakalársku alebo diplomovú prácu, kde potrebuješ viac času na úpravy, zdroje a konzultácie.',
        features: [
          'Všetko z mesačného balíka',
          'Dlhší prístup k aplikácii',
          'Pokročilý AI vedúci práce',
          'Kontrola logiky a argumentácie',
          'Príprava na obhajobu',
          'Prioritné používanie AI nástrojov',
        ],
      },
      {
        id: 'year',
        name: 'Ročný balík',
        subtitle: 'Pre dlhodobé používanie',
        priceMonthly: '240 €',
        oldPrice: '480 €',
        badge: 'Ročný prístup',
        button: 'Kúpiť ročný balík',
        description:
          'Pre používateľov, ktorí chcú systém využívať počas celého akademického roka.',
        features: [
          'Ročný prístup do aplikácie',
          'Viac projektov a prác',
          'Pokročilé AI nástroje',
          'AI vedúci, audit a obhajoba',
          'Práca so zdrojmi',
          'Výhodná cena pri dlhodobom používaní',
        ],
      },
    ],
    []
  );

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-slate-950">
      {/* TOP PROMO BAR */}
      <div className="bg-[#065f5b] px-4 py-3 text-center text-sm font-semibold text-white">
        🎓 Promo akcia: 3-mesačný balík za 70 € — vhodné pre bakalársku, diplomovú aj seminárnu prácu.
      </div>

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight">ZEDPERA</div>
              <div className="-mt-1 text-xs font-semibold text-slate-500">
                AI akademický asistent
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-700 lg:flex">
            <a href="#features" className="hover:text-indigo-600">
              Funkcie
            </a>
            <a href="#how" className="hover:text-indigo-600">
              Ako to funguje
            </a>
            <a href="#pricing" className="hover:text-indigo-600">
              Balíčky
            </a>
            <a href="#faq" className="hover:text-indigo-600">
              Otázky
            </a>
            <a href="#contact" className="hover:text-indigo-600">
              Kontakt
            </a>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/login"
              className="rounded-full px-5 py-3 text-sm font800 text-slate-700 hover:bg-slate-100"
            >
              Prihlásiť sa
            </Link>

            <Link
              href="/register"
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
            >
              Chcem svojho asistenta
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-slate-200 p-2 lg:hidden"
            aria-label="Otvoriť menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </nav>

        {mobileOpen && (
          <div className="fixed inset-0 z-[60] bg-slate-950/40 lg:hidden">
            <div className="ml-auto h-full w-[86%] max-w-sm bg-white p-6 shadow-2xl">
              <div className="mb-8 flex items-center justify-between">
                <div className="font-black">ZEDPERA</div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-slate-200 p-2"
                  aria-label="Zavrieť menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 text-base font-semibold">
                <a onClick={() => setMobileOpen(false)} href="#features">
                  Funkcie
                </a>
                <a onClick={() => setMobileOpen(false)} href="#how">
                  Ako to funguje
                </a>
                <a onClick={() => setMobileOpen(false)} href="#pricing">
                  Balíčky
                </a>
                <a onClick={() => setMobileOpen(false)} href="#faq">
                  Otázky
                </a>
                <Link href="/login">Prihlásiť sa</Link>
                <Link
                  href="/register"
                  className="mt-4 rounded-full bg-indigo-600 px-5 py-3 text-center text-white"
                >
                  Chcem svojho asistenta
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute left-0 top-0 h-[480px] w-[480px] rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="absolute right-0 top-16 h-[520px] w-[520px] rounded-full bg-amber-200/70 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              AI nástroj pre písanie, kontrolu a obhajobu odborných prác
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-slate-950 md:text-6xl">
              Napíšte kvalitnú kapitolu, osnovu alebo analýzu s AI asistentom.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
              ZEDPERA pomáha študentom pripraviť odborný text, pracovať so zdrojmi,
              vytvárať citácie, kontrolovať logiku práce a pripraviť sa na obhajobu.
              Systém je navrhnutý ako akademický asistent, nie ako obyčajný chat.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-base font-black text-white shadow-xl shadow-indigo-600/25 transition hover:bg-indigo-700"
              >
                Začať cez registráciu
                <ArrowRight className="h-5 w-5" />
              </Link>

              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-8 py-4 text-base font-black text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                Pozrieť balíčky
              </a>
            </div>

            <div className="mt-8 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" />
                AI vedúci práce
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" />
                Citácie a zdroje
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" />
                Export do Word/PDF
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" />
                Príprava na obhajobu
              </div>
            </div>
          </div>

          {/* HERO APP PREVIEW */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <div className="rounded-full bg-white px-4 py-1 text-xs font-bold text-slate-500">
                zedpera.com
              </div>
              <div className="w-12" />
            </div>

            <div className="rounded-[1.5rem] bg-[#0f1020] p-6 text-white">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-black">AI vedúci práce</div>
                  <div className="text-sm text-white/60">
                    Kontrola kvality a odporúčania
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <PreviewLine label="Logika textu" value="86 %" />
                <PreviewLine label="Argumentácia" value="78 %" />
                <PreviewLine label="Citácie" value="91 %" />
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-sm font-bold text-indigo-200">
                  Odporúčanie AI
                </div>
                <p className="text-sm leading-6 text-white/75">
                  Doplňte presnejšie vymedzenie výskumnej otázky, pridajte zdroj
                  k tvrdeniu v 2. kapitole a upravte záver tak, aby priamo
                  odpovedal na cieľ práce.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                  Osnova
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                  Kapitoly
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                  Zdroje
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                  Obhajoba
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <TrustItem icon={<ShieldCheck />} title="Bezpečný účet" text="Registrácia, prihlásenie a história práce." />
          <TrustItem icon={<Library />} title="Zdroje" text="Práca s odbornými zdrojmi a citáciami." />
          <TrustItem icon={<FileCheck2 />} title="Kontrola kvality" text="Logika, štruktúra, argumentácia." />
          <TrustItem icon={<Crown />} title="Prémiové balíčky" text="Mesačný, 3-mesačný a ročný prístup." />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 text-sm font-black uppercase tracking-wider text-indigo-600">
            Funkcie
          </div>
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            AI systém pre celý proces práce
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Od témy, osnovy a kapitol až po citácie, kontrolu kvality a prípravu na obhajobu.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                {feature.icon}
              </div>
              <h3 className="text-xl font-black">{feature.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-slate-950 px-5 py-20 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 text-sm font-black uppercase tracking-wider text-indigo-300">
              Ako to funguje
            </div>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Od registrácie rovno do menu aplikácie
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/65">
              Používateľ si vytvorí účet, vyberie balík, po úhrade sa mu aktivuje prístup
              a následne sa dostane do dashboardu aplikácie.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <Step number="1" title="Registrácia" text="Používateľ zadá e-mail, vytvorí účet a prihlási sa do ZEDPERA." />
            <Step number="2" title="Výber balíka" text="Vyberie Free, mesačný, 3-mesačný alebo ročný balík." />
            <Step number="3" title="Prístup do menu" text="Po úhrade systém presmeruje používateľa do aplikácie." />
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 text-sm font-black uppercase tracking-wider text-indigo-600">
            Balíčky
          </div>
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            Vyberte si prístup podľa potreby
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Balíčky sú pripravené tak, aby používateľ po registrácii a úhrade získal prístup
            priamo do menu aplikácie.
          </p>

          <div className="mt-8 inline-flex rounded-full bg-slate-100 p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-5 py-2 text-sm font-black ${
                billing === 'monthly'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Mesačne
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`rounded-full px-5 py-2 text-sm font-black ${
                billing === 'yearly'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Ročne · promo
            </button>
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} billing={billing} />
          ))}
        </div>

        {/* ADDONS */}
        <div className="mt-14 rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-indigo-600 px-4 py-1 text-sm font-black text-white">
                Doplnkové služby
              </div>
              <h3 className="text-3xl font-black">Pridaj si AI vedúceho, audit alebo obhajobu</h3>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                Doplnkové služby môžeš predávať samostatne alebo ako súčasť vyšších balíkov.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <AddonButton id="supervisor" name="AI vedúci" price="50 €" />
              <AddonButton id="audit" name="Audit práce" price="50 €" />
              <AddonButton id="defense" name="Obhajoba" price="60 €" />
            </div>
          </div>
        </div>

        {/* ADMIN FREE */}
        <div className="mt-8 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-700">
                <LockKeyhole className="h-4 w-4" />
                Admin univerzálny vstup
              </div>
              <h3 className="text-2xl font-black">Admin Free režim</h3>
              <p className="mt-2 max-w-3xl leading-7 text-slate-700">
                Tento vstup používaj iba pre vlastný admin účet. Finálne odporúčanie:
                povoľ ho len pre konkrétny admin e-mail v databáze alebo cez Supabase role.
              </p>
            </div>

            <button
              onClick={() => enterFree('admin-free')}
              className="rounded-full bg-emerald-600 px-7 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
            >
              Vstúpiť ako admin free
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <div className="mb-3 text-sm font-black uppercase tracking-wider text-indigo-600">
              Otázky a odpovede
            </div>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Časté otázky
            </h2>
          </div>

          <div className="divide-y divide-slate-200 rounded-[2rem] border border-slate-200 bg-white px-6 shadow-sm">
            {faq.map((item) => (
              <FAQItem key={item.question} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="contact" className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 p-10 text-center text-white shadow-2xl shadow-indigo-600/25 md:p-16">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            Začni so ZEDPERA ešte dnes
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/75">
            Vytvor si účet, vyber balík a pokračuj priamo do aplikácie.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="rounded-full bg-white px-8 py-4 text-base font-black text-indigo-700 shadow-lg"
            >
              Vytvoriť účet
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/30 px-8 py-4 text-base font-black text-white"
            >
              Už mám účet
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 text-sm text-slate-500 md:flex-row md:items-center">
          <div>
            <div className="font-black text-slate-950">ZEDPERA</div>
            <div>© 2026 ZEDPERA. AI akademický asistent.</div>
          </div>

          <div className="flex flex-wrap gap-5">
            <Link href="/login" className="hover:text-indigo-600">
              Prihlásenie
            </Link>
            <Link href="/register" className="hover:text-indigo-600">
              Registrácia
            </Link>
            <a href="#pricing" className="hover:text-indigo-600">
              Balíčky
            </a>
            <a href="#faq" className="hover:text-indigo-600">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

// =====================================================
// COMPONENTS
// =====================================================

function PreviewLine({ label, value }: { label: string; value: string }) {
  const numeric = Number(value.replace('%', '').trim());

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-white/65">{label}</span>
        <span className="font-black">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-indigo-400"
          style={{ width: `${numeric}%` }}
        />
      </div>
    </div>
  );
}

function TrustItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1 text-indigo-600 [&_svg]:h-6 [&_svg]:w-6">{icon}</div>
      <div>
        <div className="font-black">{title}</div>
        <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-7">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-xl font-black">
        {number}
      </div>
      <h3 className="text-xl font-black">{title}</h3>
      <p className="mt-3 leading-7 text-white/65">{text}</p>
    </div>
  );
}

function PricingCard({
  plan,
  billing,
}: {
  plan: PricingPlan;
  billing: BillingCycle;
}) {
  const price =
    billing === 'yearly' && plan.priceYearly ? plan.priceYearly : plan.priceMonthly;

  return (
    <div
      className={`relative flex flex-col rounded-[2rem] border p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        plan.highlight
          ? 'border-indigo-300 bg-white ring-4 ring-indigo-100'
          : 'border-slate-200 bg-white'
      }`}
    >
      {plan.badge && (
        <div
          className={`mb-5 inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${
            plan.highlight
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {plan.badge}
        </div>
      )}

      <h3 className="text-2xl font-black">{plan.name}</h3>
      <p className="mt-1 text-sm font-semibold text-slate-500">{plan.subtitle}</p>

      <div className="mt-6">
        <div className="flex items-end gap-3">
          <div className="text-4xl font-black tracking-tight">{price}</div>
          {plan.oldPrice && (
            <div className="pb-1 text-base font-bold text-slate-400 line-through">
              {plan.oldPrice}
            </div>
          )}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {plan.id === 'free' ? 'bez platby' : 'EUR / prístup'}
        </div>
      </div>

      {plan.promo && (
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          {plan.promo}
        </div>
      )}

      <p className="mt-5 min-h-[72px] text-sm leading-6 text-slate-600">
        {plan.description}
      </p>

      <button
        onClick={() => {
          if (plan.id === 'free') {
            enterFree('free');
          } else {
            buy(plan.id);
          }
        }}
        className={`mt-6 rounded-full px-5 py-4 text-sm font-black transition ${
          plan.highlight
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700'
            : 'bg-slate-950 text-white hover:bg-slate-800'
        }`}
      >
        {plan.button}
      </button>

      <div className="mt-7 border-t border-slate-200 pt-6">
        <div className="mb-4 text-sm font-black text-slate-950">
          Obsah balíka:
        </div>

        <div className="space-y-3">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-3 text-sm leading-6">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <span className="text-slate-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddonButton({
  id,
  name,
  price,
}: {
  id: PlanId;
  name: string;
  price: string;
}) {
  return (
    <button
      onClick={() => buy(id)}
      className="rounded-2xl border border-indigo-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="mb-2 flex items-center gap-2 text-indigo-600">
        <Star className="h-4 w-4" />
        <span className="text-xs font-black uppercase">Doplnok</span>
      </div>
      <div className="font-black text-slate-950">{name}</div>
      <div className="mt-1 text-2xl font-black text-indigo-600">{price}</div>
    </button>
  );
}

function FAQItem({ item }: { item: FAQ }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="py-5">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-6 text-left"
      >
        <span className="text-lg font-black">{item.question}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition ${
            open ? 'rotate-180 text-indigo-600' : 'text-slate-500'
          }`}
        />
      </button>

      {open && (
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">{item.answer}</p>
      )}
    </div>
  );
}

// =====================================================
// DATA
// =====================================================

const features = [
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: 'AI písanie odborného textu',
    text: 'Pomoc pri tvorbe osnovy, kapitol, úvodu, záveru, abstraktu a odborných častí práce.',
  },
  {
    icon: <Brain className="h-6 w-6" />,
    title: 'AI vedúci práce',
    text: 'Systém upozorní na slabé miesta, logické chyby, nejasné tvrdenia a odporučí ďalšie kroky.',
  },
  {
    icon: <Library className="h-6 w-6" />,
    title: 'Zdroje a citácie',
    text: 'Pomoc pri práci so zdrojmi, citačnými štýlmi a odbornou argumentáciou.',
  },
  {
    icon: <FileCheck2 className="h-6 w-6" />,
    title: 'Audit kvality',
    text: 'Kontrola štruktúry, duplicít, argumentácie, metodiky a súladu s cieľom práce.',
  },
  {
    icon: <BadgeCheck className="h-6 w-6" />,
    title: 'Príprava na obhajobu',
    text: 'Generovanie otázok, odpovedí a simulácia obhajoby podľa témy práce.',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Rýchly workflow',
    text: 'Používateľ nemusí riešiť zložité prompty — systém ho vedie krok za krokom.',
  },
];

const faq: FAQ[] = [
  {
    question: 'Ako sa používateľ dostane do aplikácie?',
    answer:
      'Používateľ klikne na registráciu, vytvorí si účet, vyberie balík a po úhrade je presmerovaný do používateľského menu aplikácie.',
  },
  {
    question: 'Ako funguje Free balík?',
    answer:
      'Free balík slúži na základné vyskúšanie systému. Používateľ sa dostane do aplikácie s obmedzenými funkciami alebo limitmi.',
  },
  {
    question: 'Ako bude fungovať platený balík?',
    answer:
      'Po kliknutí na kúpu sa vytvorí platobná session cez API /api/payments. Po úspešnej platbe sa používateľovi aktivuje príslušný balík.',
  },
  {
    question: 'Môžem mať admin free vstup?',
    answer:
      'Áno, ale odporúčam ho viazať iba na konkrétny admin e-mail alebo rolu v databáze. Nestačí len tlačidlo na stránke, lebo to by bolo bezpečnostné riziko.',
  },
  {
    question: 'Vie ZEDPERA písať bakalársku alebo diplomovú prácu?',
    answer:
      'ZEDPERA je akademický AI asistent. Pomáha s návrhom, štruktúrou, formuláciami, kontrolou kvality, zdrojmi a prípravou na obhajobu. Finálnu zodpovednosť za obsah má používateľ.',
  },
  {
    question: 'Podporuje systém citácie?',
    answer:
      'Áno. Systém môže pracovať s citačnými štýlmi ako APA, ISO 690, MLA, Chicago alebo podľa nastavenia v profile práce.',
  },
  {
    question: 'Čo je AI vedúci práce?',
    answer:
      'AI vedúci práce kontroluje text podobne ako konzultant: hodnotí logiku, metodiku, štruktúru, argumentáciu a upozorňuje na nejasné alebo slabé časti.',
  },
];

// =====================================================
// ACTIONS
// =====================================================

async function buy(plan: PlanId) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zedpera_selected_plan', plan);
    }

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan,
        currency: 'EUR',
        source: 'homepage',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || 'Platbu sa nepodarilo vytvoriť.');
    }

    if (data?.url) {
      window.location.href = data.url;
      return;
    }

    throw new Error('API nevrátilo platobnú URL.');
  } catch (error) {
    console.error(error);
    alert(
      error instanceof Error
        ? error.message
        : 'Nastala chyba pri vytváraní platby.'
    );
  }
}

function enterFree(plan: 'free' | 'admin-free') {
  if (typeof window === 'undefined') return;

  localStorage.setItem('zedpera_selected_plan', plan);

  if (plan === 'admin-free') {
    localStorage.setItem('zedpera_admin_free', 'true');
    window.location.href = '/dashboard?mode=admin-free';
    return;
  }

  window.location.href = '/register?plan=free';
}