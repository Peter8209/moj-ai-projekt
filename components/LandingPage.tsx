'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Crown,
  CreditCard,
  FileCheck2,
  GraduationCap,
  Loader2,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

type PlanId =
  | 'week-mini'
  | 'week-student'
  | 'week-pro'
  | 'monthly'
  | 'three-months'
  | 'year-pro'
  | 'year-max';

type Plan = {
  id: PlanId;
  badge?: string;
  name: string;
  subtitle: string;
  price: string;
  oldPrice?: string;
  period: string;
  description: string;
  button: string;
  features: string[];
  highlighted?: boolean;
};

type CheckoutResponse = {
  ok?: boolean;
  url?: string;
  error?: string;
  message?: string;
  detail?: string;
  displayMessage?: string;
};

const plans: Plan[] = [
  {
    id: 'week-mini',
    badge: 'Rýchly štart',
    name: 'Týždeň MINI',
    subtitle: 'Na menšie úpravy',
    price: '13,20 €',
    oldPrice: '15,84 €',
    period: '7 dní',
    description:
      'Vhodné na seminárnu prácu, jednu kapitolu alebo rýchlu úpravu textu.',
    button: 'Kúpiť Týždeň MINI',
    features: [
      '25 strán',
      '1 práca',
      'Základné AI písanie',
      '2 kontroly AI vedúceho',
      '1 audit kvality',
    ],
  },
  {
    id: 'week-student',
    badge: 'Študent',
    name: 'Týždeň ŠTUDENT',
    subtitle: 'Na väčšiu kapitolu',
    price: '26,50 €',
    oldPrice: '31,80 €',
    period: '7 dní',
    description:
      'Vhodné na seminárku, ročníkovú prácu alebo rozsiahlejšiu kapitolu.',
    button: 'Kúpiť Týždeň ŠTUDENT',
    features: [
      '50 strán',
      '2 práce',
      'AI písanie práce',
      'AI vedúci práce',
      'Audit kvality textu',
      'Zdroje a citácie',
    ],
  },
  {
    id: 'week-pro',
    badge: 'Pred odovzdaním',
    name: 'Týždeň PRO',
    subtitle: 'Intenzívna práca',
    price: '39,90 €',
    oldPrice: '47,88 €',
    period: '7 dní',
    description:
      'Pre intenzívnu prácu tesne pred odovzdaním alebo pred obhajobou.',
    button: 'Kúpiť Týždeň PRO',
    features: [
      '100 strán',
      '3 práce',
      '10 kontrol AI vedúceho',
      '4 audity kvality',
      '1 obhajoba',
      'Prezentácia k obhajobe',
    ],
  },
  {
    id: 'monthly',
    badge: 'Hlavný balík',
    name: 'Mesačný START',
    subtitle: 'Najrýchlejší štart',
    price: '53,20 €',
    oldPrice: '63,84 €',
    period: '1 mesiac',
    description:
      'Vhodné pre používateľa, ktorý potrebuje intenzívne pracovať počas jedného mesiaca.',
    button: 'Kúpiť mesačný balík',
    highlighted: true,
    features: [
      '150 strán mesačne',
      '5 prác',
      'AI písanie kapitol',
      'Tvorba osnovy a štruktúry',
      'Práca so zdrojmi a citáciami',
      'AI vedúci práce',
      'Audit kvality',
      '1 obhajoba',
    ],
  },
  {
    id: 'three-months',
    badge: 'Najvýhodnejší',
    name: '3 mesiace ŠTUDENT',
    subtitle: 'Najvýhodnejší balík',
    price: '93,30 €',
    oldPrice: '111,96 €',
    period: '3 mesiace',
    description:
      'Najlepší balík pre bakalársku alebo diplomovú prácu, kde je viac času na úpravy.',
    button: 'Kúpiť 3-mesačný balík',
    highlighted: true,
    features: [
      '350 strán na 3 mesiace',
      '10 prác',
      'Všetko z mesačného balíka',
      'Dlhší prístup k aplikácii',
      'Pokročilý AI vedúci práce',
      'Kontrola logiky a argumentácie',
      '12 auditov',
      '3 obhajoby',
    ],
  },
  {
    id: 'year-pro',
    badge: 'Ročný prístup',
    name: 'Ročný PRO',
    subtitle: 'Pre dlhodobé používanie',
    price: '320 €',
    oldPrice: '384 €',
    period: '12 mesiacov',
    description:
      'Pre študentov, konzultantov alebo používateľov, ktorí chcú systém využívať počas celého akademického roka.',
    button: 'Kúpiť ročný PRO',
    features: [
      '1 500 strán ročne',
      'Neobmedzené projekty',
      'Všetky hlavné moduly',
      'AI vedúci práce',
      'Audit kvality',
      '10 obhajôb',
      'Vhodné na celý akademický rok',
    ],
  },
  {
    id: 'year-max',
    badge: 'Prémiový plán',
    name: 'Ročný MAX',
    subtitle: 'Najvyššie limity',
    price: '532 €',
    oldPrice: '638,40 €',
    period: '12 mesiacov',
    description:
      'Pre náročných používateľov, ktorí chcú vyššie limity a prémiové moduly.',
    button: 'Kúpiť ročný MAX',
    features: [
      '2 000 strán ročne',
      'Neobmedzené projekty',
      'Vyššie limity',
      'Prémiové AI modely podľa dostupnosti',
      'Rozšírený audit',
      '15 obhajôb',
      'Vhodné aj pre mentoring',
    ],
  },
];

const features = [
  {
    icon: Bot,
    title: 'AI písanie',
    text: 'Generovanie odborných kapitol, úvodov, záverov a akademických textov podľa profilu práce.',
  },
  {
    icon: GraduationCap,
    title: 'AI vedúci práce',
    text: 'Kritická spätná väzba k logike, metodológii, argumentácii, štruktúre a celkovej kvalite práce.',
  },
  {
    icon: BookOpen,
    title: 'Zdroje a citácie',
    text: 'Pomoc pri práci so zdrojmi, rešeršou, citáciami, bibliografiou a odborným aparátom.',
  },
  {
    icon: FileCheck2,
    title: 'Audit kvality',
    text: 'Kontrola slabých miest textu, rozporov, štylistiky, metodológie a akademickej presnosti.',
  },
  {
    icon: ShieldCheck,
    title: 'Originalita',
    text: 'Predbežná orientačná kontrola originality, rizikových pasáží a miest, kde treba doplniť citácie.',
  },
  {
    icon: Crown,
    title: 'Obhajoba',
    text: 'Príprava otázok, odpovedí, argumentácie, reakcií na posudok a prezentácie pred obhajobou.',
  },
];

const allowedPlans: PlanId[] = [
  'week-mini',
  'week-student',
  'week-pro',
  'monthly',
  'three-months',
  'year-pro',
  'year-max',
];

function getCheckoutError(data: CheckoutResponse | null) {
  return (
    data?.displayMessage ||
    data?.message ||
    data?.detail ||
    data?.error ||
    'Platbu sa nepodarilo vytvoriť.'
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [paymentError, setPaymentError] = useState('');

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const getEmailForCheckout = async () => {
    let email = '';

    if (typeof window !== 'undefined') {
      email =
        localStorage.getItem('zedpera_user_email') ||
        localStorage.getItem('zedpera_email') ||
        localStorage.getItem('user_email') ||
        localStorage.getItem('email') ||
        '';
    }

    if (!email && typeof window !== 'undefined') {
      const enteredEmail = window.prompt(
        'Zadajte e-mail, na ktorý bude naviazaná platba:',
      );

      email = enteredEmail?.trim() || '';

      if (email) {
        localStorage.setItem('zedpera_user_email', email);
        localStorage.setItem('zedpera_email', email);
      }
    }

    return email.trim().toLowerCase();
  };

  const buy = async (planId: PlanId) => {
    try {
      setLoadingPlan(planId);
      setPaymentError('');

      if (!allowedPlans.includes(planId)) {
        throw new Error(
          `Neplatný balík: ${planId}. Povolené balíky sú: ${allowedPlans.join(
            ', ',
          )}`,
        );
      }

      const email = await getEmailForCheckout();

      if (!email) {
        throw new Error('Pre pokračovanie na platbu je potrebný e-mail.');
      }

      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';

      const payload = {
        plan: planId,
        planId,
        addons: [],
        email,
        successUrl: `${origin}/dashboard?payment=success&plan=${planId}`,
        cancelUrl: `${origin}/pricing?payment=cancel&plan=${planId}`,
      };

      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as CheckoutResponse | null;

      if (!res.ok) {
        console.error('CHECKOUT ERROR:', data);
        throw new Error(getCheckoutError(data));
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error('Stripe nevygeneroval platobnú URL.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Platbu sa nepodarilo vytvoriť.';

      console.error('BUY ERROR:', error);
      setPaymentError(message);

      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8fafc] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg">
              <GraduationCap size={26} />
            </div>

            <div className="text-left">
              <div className="text-2xl font-black tracking-tight">ZEDPERA</div>
              <div className="-mt-1 text-sm font-semibold text-slate-500">
                AI akademický asistent
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-700 lg:flex">
            <a href="#about" className="transition hover:text-violet-700">
              O nás
            </a>

            <a href="#features" className="transition hover:text-violet-700">
              Funkcie
            </a>

            <a href="#pricing" className="transition hover:text-violet-700">
              Balíčky
            </a>

            <a href="#how-it-works" className="transition hover:text-violet-700">
              Ako to funguje
            </a>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/login"
              className="relative z-50 rounded-2xl px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
            >
              Prihlásiť sa
            </Link>

            <Link
              href="/dashboard"
              className="relative z-50 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-6 py-3 text-sm font-black text-white shadow-xl shadow-violet-900/20 transition hover:opacity-90"
            >
              Vyskúšať Zedperu
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-2xl border border-slate-200 bg-white p-3 lg:hidden"
            aria-label="Otvoriť menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm lg:hidden">
          <div className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-white p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="text-xl font-black">ZEDPERA</div>

              <button
                type="button"
                onClick={closeMobileMenu}
                className="rounded-xl bg-slate-100 p-2"
                aria-label="Zavrieť menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <a
                href="#about"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                O nás
              </a>

              <a
                href="#features"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                Funkcie
              </a>

              <a
                href="#pricing"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                Balíčky
              </a>

              <a
                href="#how-it-works"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                Ako to funguje
              </a>

              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-left font-bold"
              >
                Prihlásiť sa
              </Link>

              <Link
                href="/dashboard"
                onClick={closeMobileMenu}
                className="block w-full rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-4 py-3 text-left font-black text-white"
              >
                Vyskúšať Zedperu
              </Link>
            </div>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800">
              <Sparkles size={17} />
              AI asistent pre akademické písanie
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-tight text-slate-950 md:text-7xl">
              Akademická práca bez chaosu, stresu a nejasností.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              Zedpera spája viac ako 20 rokov skúseností s akademickým
              písaním a modernú umelú inteligenciu do jedného systému, ktorý
              pomáha študentom písať, kontrolovať, upravovať a obhajovať prácu
              krok za krokom.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-7 py-4 text-base font-black text-white shadow-2xl shadow-violet-900/25 transition hover:opacity-90"
              >
                Začať používať
                <ArrowRight size={20} />
              </Link>

              <a
                href="#about"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-black text-slate-900 transition hover:bg-slate-50"
              >
                Prečítať náš príbeh
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="font-black">AI kontrola práce</div>
              <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">
                DEMO
              </div>
            </div>

            <div className="space-y-4">
              <DemoScore label="Logika" value="82%" />
              <DemoScore label="Metodológia" value="74%" />
              <DemoScore label="Argumentácia" value="69%" />
              <DemoScore label="Akademický štýl" value="88%" />
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-black text-violet-200">
                Kritická spätná väzba
              </div>

              <p className="mt-2 text-sm leading-7 text-slate-300">
                Text má dobrý základ, ale chýba jasnejšie prepojenie cieľa,
                metodológie a výsledkov. Odporúčam doplniť presnú interpretáciu
                hlavnej hypotézy a zjednotiť terminológiu v celej práci.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-12 max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-black text-violet-200">
              <Sparkles size={17} />
              O nás
            </div>

            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Zedpera vznikla z reálnej skúsenosti so študentmi.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-300">
              Pred mnohými rokmi sa stretli dvaja študenti, ktorí sedeli v
              laviciach tej istej univerzity. Prechádzali skúškami, seminármi,
              zápočtami, konzultáciami a postupne zisťovali, že akademický
              systém vie byť pre študenta často zbytočne zložitý, neprehľadný
              a stresujúci.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <AboutCard
              title="20 rokov skúseností"
              text="Po ukončení štúdia vznikol jednoduchý nápad: vytvoriť službu, ktorá študentom pomôže lepšie zvládnuť proces prípravy vysokoškolských prác. Dnes za sebou máme viac ako 20 rokov skúseností v oblasti akademickej podpory, konzultácií, metodológie, štruktúry záverečných prác a prípravy na obhajobu."
            />

            <AboutCard
              title="Poznáme skutočné problémy"
              text="Za roky praxe sme spoznali tisíce študentov denného aj externého štúdia. Zistili sme, že problém študenta nie je iba samotné písanie práce. Často ide o nejasné zadanie, nedostatok času, slabú spätnú väzbu, problém so školiteľom, metodológiou, zdrojmi alebo obhajobou."
            />

            <AboutCard
              title="Komplexný systém"
              text="Preto vznikla Zedpera. Nie ako ďalší nástroj na generovanie textu, ale ako komplexná akademická AI platforma, ktorá pomáha študentovi postupovať krok za krokom – od profilu práce, cez tvorbu obsahu, kontrolu kvality, originalitu až po prípravu na obhajobu."
            />
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                <GraduationCap size={28} />
              </div>

              <h3 className="text-2xl font-black">
                Zakladateľka Martina
              </h3>

              <p className="mt-4 text-sm leading-7 text-slate-300">
                Martina po ukončení vysokej školy založila spoločnosť, ktorá
                už viac ako 20 rokov pomáha študentom lepšie zvládnuť proces
                prípravy vysokoškolských a odborných prác.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-300">
                Počas svojej praxe sa venovala akademickému mentoringu,
                konzultáciám, práci so študentmi, metodickému vedeniu a podpore
                v oblasti vzdelávania. Medzičasom pokračovala v ďalšom štúdiu,
                rozširovaní odborných vedomostí a niekoľko rokov pôsobila aj v
                akademickom prostredí.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-300">
                Aktuálne sa venuje vývoju nových riešení umelej inteligencie,
                ktoré môžu študentom pomôcť pracovať efektívnejšie,
                samostatnejšie a s väčšou istotou.
              </p>
            </div>

            <div className="rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-indigo-600/20 p-7">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-violet-100">
                <Crown size={28} />
              </div>

              <h3 className="text-2xl font-black">
                Neustále posúvame hranice
              </h3>

              <p className="mt-4 text-sm leading-7 text-slate-200">
                Zedpera nevznikla ako reakcia na trend. Vznikla ako odpoveď na
                realitu, ktorú poznáme z praxe. Vieme, že akademická práca je
                pre mnohých študentov spojená so stresom, časovým tlakom,
                nejasnými požiadavkami a pocitom, že namiesto učenia často
                bojujú so systémom.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-200">
                Preto sme nechceli vytvoriť iba ďalší nástroj, ktorý vygeneruje
                text. Chceli sme vytvoriť systém, ktorý rozumie celému procesu:
                téme, cieľu, metodológii, štruktúre, zdrojom, spätnej väzbe aj
                obhajobe.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-200">
                Neučíme Zedperu iba písať texty. Učíme ju rozumieť súvislostiam,
                akademickej logike, spätnej väzbe a procesu tvorby práce.
                Preto ju neustále posúvame ďalej – ako nový spôsob, akým môže
                študent pristupovať k učeniu, písaniu a premýšľaniu.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-10">
          <h2 className="text-4xl font-black tracking-tight text-slate-950">
            Funkcie aplikácie
          </h2>

          <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
            Zedpera spája písanie, kontrolu kvality, citácie, obhajobu a
            odbornú spätnú väzbu v jednom rozhraní.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Icon size={28} />
                </div>

                <h3 className="text-xl font-black text-slate-950">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="pricing" className="bg-slate-100 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-black text-violet-800">
              <Crown size={17} />
              Balíčky
            </div>

            <h2 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              Vyber si plán podľa rozsahu práce
            </h2>

            <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
              Vyber si balík podľa toho, či potrebuješ rýchlu úpravu, intenzívnu
              prácu pred odovzdaním alebo dlhodobý prístup počas akademického
              roka.
            </p>
          </div>

          {paymentError && (
            <div className="mb-6 whitespace-pre-wrap rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold leading-6 text-red-700">
              {paymentError}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => {
              const isLoading = loadingPlan === plan.id;

              return (
                <article
                  key={plan.id}
                  className={`flex min-h-[620px] flex-col rounded-[2rem] border p-6 shadow-xl transition ${
                    plan.highlighted
                      ? 'border-violet-300 bg-white shadow-violet-200/70'
                      : 'border-slate-200 bg-white shadow-slate-200/70'
                  }`}
                >
                  {plan.badge && (
                    <div
                      className={`mb-4 w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                        plan.highlighted
                          ? 'bg-violet-100 text-violet-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <h3 className="text-3xl font-black text-slate-950">
                    {plan.name}
                  </h3>

                  <p className="mt-1 font-bold text-slate-500">
                    {plan.subtitle}
                  </p>

                  <div className="mt-6 flex items-end gap-3">
                    <div className="text-5xl font-black tracking-tight text-slate-950">
                      {plan.price}
                    </div>

                    {plan.oldPrice && (
                      <div className="pb-2 text-lg font-bold text-slate-400 line-through">
                        {plan.oldPrice}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-sm font-semibold text-slate-500">
                    {plan.period}
                  </div>

                  <p className="mt-6 min-h-[78px] text-base leading-7 text-slate-700">
                    {plan.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => void buy(plan.id)}
                    disabled={loadingPlan !== null}
                    className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-violet-700 to-indigo-700 shadow-xl shadow-violet-900/20 hover:opacity-90'
                        : 'bg-slate-950 hover:bg-slate-800'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Presmerovávam...
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        {plan.button}
                      </>
                    )}
                  </button>

                  <div className="mt-7 border-t border-slate-200 pt-6">
                    <div className="mb-4 font-black text-slate-950">
                      Obsah balíka:
                    </div>

                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex gap-3 text-sm leading-6 text-slate-700"
                        >
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="rounded-[2rem] bg-slate-950 p-8 text-white md:p-12">
          <h2 className="text-4xl font-black">Ako to funguje</h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Step
              number="1"
              title="Vytvoríš profil práce"
              text="Zadáš názov, cieľ, metodológiu, jazyk, typ práce, odbor a citačnú normu."
            />

            <Step
              number="2"
              title="Pracuješ s AI modulmi"
              text="Generuješ text, kontroluješ kvalitu, pripravuješ obhajobu, hodnotíš argumentáciu a pracuješ so zdrojmi."
            />

            <Step
              number="3"
              title="Dostaneš spätnú väzbu"
              text="AI vedúci práce upozorní na slabé miesta, rozpory, chýbajúce časti a odporúčané opravy."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© 2026 Zedpera</div>
          <div>AI akademický asistent</div>
        </div>
      </footer>
    </main>
  );
}

function DemoScore({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-300">{label}</span>
        <span className="font-black text-white">{value}</span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          style={{ width: value }}
        />
      </div>
    </div>
  );
}

function AboutCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
        <CheckCircle2 size={24} />
      </div>

      <h3 className="text-xl font-black text-white">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
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
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-xl font-black">
        {number}
      </div>

      <h3 className="text-xl font-black">{title}</h3>

      <p className="mt-2 text-sm leading-7 text-slate-300">{text}</p>
    </div>
  );
}