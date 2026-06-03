'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Crown,
  HelpCircle,
  Loader2,
  Menu,
  MessageCircle,
  PenTool,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react';

type PlanId =
  | 'week-mini'
  | 'week-student'
  | 'week-pro'
  | 'monthly'
  | 'three-months'
  | 'year-pro'
  | 'year-max';

type AppLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

type Plan = {
  id: PlanId;
  label: string;
  name: string;
  price: string;
  period: string;
  description: string;
  button: string;
  highlighted?: boolean;
};

type FaqItem = {
  question: string;
  answer: string;
};

type CheckoutResponse = {
  ok?: boolean;
  url?: string;
  error?: string;
  message?: string;
  detail?: string;
  displayMessage?: string;
};

const LANGUAGE_STORAGE_KEY = 'zedpera_language';

const languages: Array<{
  code: AppLanguage;
  label: string;
  short: string;
}> = [
  { code: 'sk', label: 'Slovenčina', short: 'SK' },
  { code: 'cs', label: 'Čeština', short: 'CZ' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'pl', label: 'Polski', short: 'PL' },
  { code: 'hu', label: 'Magyar', short: 'HU' },
];

const plans: Plan[] = [
  {
    id: 'week-mini',
    label: 'MINI',
    name: 'Na menšie úpravy',
    price: '13,20 €',
    period: '7 dní',
    description:
      'Vhodné na seminárnu prácu, jednu kapitolu alebo rýchlu úpravu.',
    button: 'Kúpiť MINI',
  },
  {
    id: 'week-student',
    label: 'ŠTUDENT',
    name: 'Na väčšiu kapitolu',
    price: '26,50 €',
    period: '7 dní',
    description:
      'Vhodné na seminárku, ročníkovú prácu alebo rozsiahlejšiu kapitolu.',
    button: 'Kúpiť ŠTUDENT',
    highlighted: true,
  },
  {
    id: 'week-pro',
    label: 'PRO',
    name: 'Intenzívna práca',
    price: '39,90 €',
    period: '7 dní',
    description:
      'Pre intenzívnu prácu tesne pred odovzdaním alebo pred obhajobou.',
    button: 'Kúpiť PRO',
  },
];

const faqItems: FaqItem[] = [
  {
    question: 'Je používanie Zedpery legálne?',
    answer:
      'Áno, používanie Zedpery je legálne. Systém slúži ako akademický asistent, ktorý pomáha s návrhom, štruktúrou, zdrojmi, kontrolou kvality a prípravou na obhajobu.',
  },
  {
    question: 'Ako funguje overenie zhody?',
    answer:
      'Zedpera poskytuje orientačnú kontrolu originality a upozorní na časti, ktoré môžu vyžadovať úpravu, parafrázu alebo doplnenie citácie.',
  },
  {
    question: 'Môžem službu použiť na viacero prác?',
    answer:
      'Áno. Podľa zvoleného balíka môžeš pracovať s jednou alebo viacerými prácami, ukladať históriu, upravovať profil a pokračovať v ďalších výstupoch.',
  },
  {
    question: 'Aký je rozdiel medzi ChatGPT, Gemini a Zedperou?',
    answer:
      'Zedpera je prispôsobená na akademické písanie. Pracuje s profilom práce, štruktúrou, zdrojmi, citáciami, auditom kvality a obhajobou.',
  },
  {
    question: 'V akých jazykoch môžem vytvoriť prácu?',
    answer:
      'Systém podporuje viacero jazykov a umožňuje prispôsobiť štýl, odbornosť a výstup podľa požiadaviek práce.',
  },
  {
    question: 'Je Zedpera plagiátorstvo?',
    answer:
      'Nie. Zedpera je podporný nástroj. Výstup je potrebné skontrolovať, upraviť podľa vlastného zadania a používať v súlade s pravidlami školy.',
  },
];

const features = [
  {
    icon: Bot,
    title: 'AI vedúci práce',
    text: 'Kontroluje logiku, metodológiu a upozorňuje na slabé miesta.',
  },
  {
    icon: MessageCircle,
    title: 'AI kritik',
    text: 'Okamžitá spätná väzba a skóre kvality písomného výstupu.',
  },
  {
    icon: PenTool,
    title: 'AI písanie',
    text: 'Generuje kapitoly, osnovy, úvody, závery a odborný text.',
  },
  {
    icon: BookOpen,
    title: 'Zdroje a citácie',
    text: 'Pomoc pri rešerši, citáciách a zozname literatúry.',
  },
  {
    icon: ShieldCheck,
    title: 'Originalita',
    text: 'Orientačná kontrola zhody a rizikových pasáží.',
  },
  {
    icon: Crown,
    title: 'Obhajoba',
    text: 'Príprava prezentácie, otázok, odpovedí a reakcií na posudky.',
  },
];

const badAiItems = [
  'Píše všeobecné texty a omáčky.',
  'Nepamätá si tvoju prácu ani dôležité informácie.',
  'Vymýšľa si zdroje.',
  'Text je potrebné zdĺhavo upravovať.',
  'Nedokáže upozorniť na chyby.',
  'Nerozumie pripomienkam od školiteľa.',
  'Nepomôže s praktickou časťou.',
  'Nedokáže reagovať na posudky.',
];

const zedperaItems = [
  'Pozná tvoju prácu a celý kontext.',
  'Pamätá si históriu aj komunikáciu.',
  'Cituje presne podľa zvolenej normy a používa tvoje zdroje.',
  'Analyzuje prácu a upozorní na problémové časti.',
  'Spracúva kapitoly, praktickú časť aj výpočty.',
  'Dokáže pripraviť otázky, odpovede a obhajobu.',
  'Overí zhodu a rizikové časti textu.',
  'Pomôže s obhajobou na základe posudkov.',
];

const reviews = [
  {
    text: 'AI vedúci mi pomohol pri pripomienkach od školiteľa a smeroval ma. Zedpera mi ušetrila neskutočne veľa času a stresu.',
    name: 'Študentka diplomovej práce',
  },
  {
    text: 'Zdroje som našiel priamo v systéme a práca bola hotová za pár dní. Originalita bola veľmi nízka. Super.',
    name: 'Študent bakalárskej práce',
  },
  {
    text: 'Bežné AI mi dávali len všeobecné texty. Zedpera mi po vyplnení profilu vygenerovala relevantné kapitoly za pár minút.',
    name: 'Študentka po skúsenosti AI',
  },
  {
    text: 'Študujem externe popri práci a rodine. Vďaka Zedpere stíham všetko. Seminárky mám rýchlo hotové.',
    name: 'Externá študentka',
  },
];

function normalizeLanguage(value: string | null): AppLanguage {
  const language = String(value || '').toLowerCase();

  if (language === 'cs' || language === 'cz') return 'cs';
  if (language === 'en') return 'en';
  if (language === 'de') return 'de';
  if (language === 'pl') return 'pl';
  if (language === 'hu') return 'hu';

  return 'sk';
}

function getCheckoutError(data: CheckoutResponse | null, fallback: string) {
  return (
    data?.displayMessage ||
    data?.message ||
    data?.detail ||
    data?.error ||
    fallback
  );
}

function LanguageDropdown({
  language,
  onChange,
}: {
  language: AppLanguage;
  onChange: (language: AppLanguage) => void;
}) {
  const [open, setOpen] = useState(false);
  const current =
    languages.find((item) => item.code === language) || languages[0];

  function handleSelect(nextLanguage: AppLanguage) {
    setOpen(false);
    onChange(nextLanguage);
  }

  return (
    <div className="relative z-[90] hidden xl:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-[42px] min-w-[205px] items-center justify-between gap-3 rounded-md border border-white/10 bg-[#080816] px-4 text-[13px] font-black text-white shadow-[0_0_24px_rgba(124,58,237,0.16)] transition hover:border-violet-500/70 hover:bg-[#101026]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-[28px] min-w-[40px] items-center justify-center rounded bg-violet-700 px-2 text-[12px] font-black text-white">
            {current.short}
          </span>

          <span className="text-[14px] font-black text-white">
            {current.label}
          </span>
        </span>

        <ChevronDown
          size={16}
          className={`text-violet-200 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+0.55rem)] z-[100] w-[205px] overflow-hidden rounded-xl border border-violet-500/40 bg-[#090918] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.7),0_0_35px_rgba(124,58,237,0.28)]"
          role="listbox"
        >
          {languages.map((item) => {
            const active = item.code === language;

            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelect(item.code)}
                className={`flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 text-left text-[13px] font-black transition ${
                  active
                    ? 'bg-violet-700 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
                role="option"
                aria-selected={active}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`flex h-7 min-w-[40px] items-center justify-center rounded px-2 text-[12px] font-black ${
                      active
                        ? 'bg-white/15 text-white'
                        : 'bg-white/5 text-violet-200'
                    }`}
                  >
                    {item.short}
                  </span>

                  {item.label}
                </span>

                {active ? <CheckCircle2 size={15} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function MobileLanguageDropdown({
  language,
  onChange,
}: {
  language: AppLanguage;
  onChange: (language: AppLanguage) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-2">
      <div className="mb-2 px-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        Jazyk
      </div>

      <div className="grid grid-cols-2 gap-2">
        {languages.map((item) => {
          const active = item.code === language;

          return (
            <button
              key={item.code}
              type="button"
              onClick={() => onChange(item.code)}
              className={`rounded-lg px-3 py-3 text-sm font-black ${
                active
                  ? 'bg-violet-700 text-white'
                  : 'bg-white/5 text-slate-300'
              }`}
            >
              {item.short} · {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AiLeaderPreview() {
  const sidebar = [
    'Prehľad',
    'Projekt',
    'Kapitoly',
    'AI vedúci',
    'Zdroje',
    'Kontrola',
    'Obhajoba',
    'Nastavenia',
  ];

  return (
    <div className="relative z-20 flex min-h-[520px] w-full items-center mt-10 xl:mt-0">
      <div className="absolute -inset-8 rounded-[2rem] bg-violet-700/20 blur-3xl" />
      <div className="absolute left-0 top-10 h-[440px] w-[90px] rounded-full bg-violet-600/25 blur-3xl" />

      <div className="relative w-full overflow-hidden rounded-[1.55rem] border border-violet-500/35 bg-[#070714] p-3 shadow-[0_0_110px_rgba(124,58,237,0.33)]">
        <div className="rounded-[1.25rem] border border-white/10 bg-[#0b0b1e]/95 p-5 shadow-inner shadow-black/40">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-violet-600 to-fuchsia-500 text-base font-black text-white shadow-[0_0_26px_rgba(124,58,237,0.6)]">
                Z
              </div>

              <span className="text-[16px] font-black uppercase tracking-[0.22em] text-white">
                Zedpera
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-[12px] font-black text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.95)]" />
              Online 24/7
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[178px_1fr]">
            <aside className="hidden rounded-2xl border border-white/5 bg-black/25 p-3 lg:block">
              {sidebar.map((item) => {
                const active = item === 'AI vedúci';

                return (
                  <div
                    key={item}
                    className={`mb-1.5 flex min-h-[39px] items-center gap-3 rounded-lg px-4 text-[13px] font-black transition ${
                      active
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-700/35'
                        : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        active ? 'bg-white' : 'bg-slate-700'
                      }`}
                    />
                    {item}
                  </div>
                );
              })}
            </aside>

            <section className="rounded-2xl border border-white/10 bg-[#101026] p-6 shadow-inner shadow-black/30">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h3 className="text-[29px] font-black leading-tight text-white">
                    AI vedúci práce
                  </h3>

                  <p className="mt-3 text-[14px] font-semibold text-slate-400">
                    Analyzoval som kapitolu 3. Tu sú moje odporúčania:
                  </p>
                </div>

                <div className="hidden rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-2 text-right xl:block">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">
                    Stav
                  </div>

                  <div className="mt-1 text-sm font-black text-white">
                    Aktívny
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-5">
                <p className="text-[16px] font-semibold leading-8 text-slate-100">
                  Kapitola 3 obsahuje metodologický problém v popise výskumného
                  postupu. Navrhujem doplniť informácie o výskumnom nástroji a
                  vzorke.
                </p>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div className="text-[14px] font-black text-slate-300">
                    Skóre kvality práce
                  </div>

                  <div className="text-[31px] font-black leading-none text-emerald-400">
                    88
                    <span className="text-sm text-slate-400">/100</span>
                  </div>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-violet-500 via-purple-400 to-emerald-400 shadow-[0_0_24px_rgba(124,58,237,0.75)]" />
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-black text-slate-400">
                    Opýtať sa AI vedúceho...
                  </span>

                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-white shadow-lg shadow-violet-700/30 transition hover:bg-violet-500"
                    aria-label="Odoslať otázku"
                  >
                    <Send size={17} />
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  [
                    '92%',
                    'Originalita',
                    'text-emerald-400',
                    'bg-emerald-500/10',
                    'border-emerald-400/15',
                  ],
                  [
                    '89/100',
                    'Kvalita textu',
                    'text-emerald-300',
                    'bg-violet-500/10',
                    'border-violet-400/15',
                  ],
                  [
                    '85%',
                    'Pripravenosť na obhajobu',
                    'text-yellow-300',
                    'bg-orange-500/10',
                    'border-orange-400/15',
                  ],
                ].map(([number, label, numberClass, bgClass, borderClass]) => (
                  <div
                    key={label}
                    className={`rounded-xl border ${borderClass} ${bgClass} p-4`}
                  >
                    <div className={`text-2xl font-black ${numberClass}`}>
                      {number}
                    </div>

                    <div className="mt-1 text-[12px] font-bold leading-5 text-slate-400">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [language, setLanguage] = useState<AppLanguage>('sk');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const allowedPlans = useMemo<PlanId[]>(
    () => [
      'week-mini',
      'week-student',
      'week-pro',
      'monthly',
      'three-months',
      'year-pro',
      'year-max',
    ],
    [],
  );

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';

    const storedLanguage =
      localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
      localStorage.getItem('zedpera_system_language') ||
      localStorage.getItem('zedpera_work_language') ||
      localStorage.getItem('app_language');

    const nextLanguage = normalizeLanguage(storedLanguage);

    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;

    // Sledovanie scrollovania pre tlačidlo Hore
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      document.documentElement.style.scrollBehavior = '';
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  function handleLanguageChange(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage);

    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      localStorage.setItem('zedpera_system_language', nextLanguage);
      localStorage.setItem('zedpera_work_language', nextLanguage);
      localStorage.setItem('app_language', nextLanguage);

      window.dispatchEvent(
        new CustomEvent('zedpera-language-change', {
          detail: nextLanguage,
        }),
      );
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = nextLanguage;
      document.documentElement.setAttribute('data-language', nextLanguage);
      document.documentElement.setAttribute('data-system-language', nextLanguage);
      document.documentElement.setAttribute('data-work-language', nextLanguage);
    }
  }

  async function getEmailForCheckout() {
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
  }

  async function buy(planId: PlanId) {
    try {
      setLoadingPlan(planId);
      setPaymentError('');

      if (!allowedPlans.includes(planId)) {
        throw new Error(`Neplatný balík: ${planId}`);
      }

      const email = await getEmailForCheckout();

      if (!email) {
        throw new Error('Pre pokračovanie na platbu je potrebný e-mail.');
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      const payload = {
        plan: planId,
        planId,
        addons: [],
        email,
        successUrl: `${origin}/payment/success?plan=${planId}`,
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
        throw new Error(
          getCheckoutError(data, 'Platbu sa nepodarilo vytvoriť.'),
        );
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

      setPaymentError(message);

      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setLoadingPlan(null);
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = [
    { href: '#features', label: 'Funkcie' },
    { href: '#pricing', label: 'Cenník' },
    { href: '#about', label: 'O nás' },
    { href: '#reviews', label: 'Recenzie' },
    { href: '#faq', label: 'FAQ' },
    { href: '#blog', label: 'Blog' },
    { href: '/gdpr', label: 'GDPR' },
    { href: '/obchodne-podmienky', label: 'Obchodné podmienky' },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050511] text-white">
      <style jsx global>{`
        html,
        body {
          background: #050511 !important;
        }

        .zedpera-template {
          color-scheme: dark;
          background:
            radial-gradient(
              circle at 13% 8%,
              rgba(124, 58, 237, 0.3),
              transparent 27%
            ),
            radial-gradient(
              circle at 77% 4%,
              rgba(59, 130, 246, 0.16),
              transparent 25%
            ),
            radial-gradient(
              circle at 72% 68%,
              rgba(124, 58, 237, 0.22),
              transparent 36%
            ),
            #050511;
        }

        .zedpera-grid-bg {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.032) 1px, transparent 1px),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.032) 1px,
              transparent 1px
            );
          background-size: 42px 42px;
        }

        .zedpera-glow-border {
          border: 1px solid rgba(139, 92, 246, 0.34);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 0 0 1px rgba(255, 255, 255, 0.03),
            0 20px 70px rgba(0, 0, 0, 0.45);
        }

        .zedpera-section-title {
          text-shadow: 0 0 28px rgba(124, 58, 237, 0.32);
        }
      `}</style>

      <div className="zedpera-template relative min-h-screen">
        <div className="pointer-events-none fixed inset-0 z-0 zedpera-grid-bg opacity-45" />
        <div className="pointer-events-none fixed left-1/2 top-0 z-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[120px]" />

        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050511]/92 backdrop-blur-2xl">
          <div className="mx-auto flex h-[72px] max-w-[1920px] items-center px-8">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-violet-600 to-fuchsia-500 text-2xl font-black text-white shadow-[0_0_28px_rgba(80,90,255,0.55)]">
                Z
              </div>

              <div className="text-[21px] font-black uppercase tracking-[0.12em] text-white">
                Zedpera
              </div>
            </Link>

            <nav className="ml-10 hidden items-center gap-4 text-[14px] font-black text-white xl:flex">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2 py-2 transition hover:text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/70"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="ml-auto hidden shrink-0 items-center gap-3 xl:flex">
              <LanguageDropdown
                language={language}
                onChange={handleLanguageChange}
              />

              <Link
                href="/login"
                className="inline-flex h-[42px] min-w-[138px] items-center justify-center rounded-md border border-white/10 bg-[#080816] px-5 text-[14px] font-black text-white transition hover:border-violet-500/70 hover:bg-[#101026]"
              >
                Prihlásiť sa
              </Link>

              <a
                href="#pricing"
                className="inline-flex h-[42px] min-w-[158px] items-center justify-center rounded-md bg-violet-600 px-6 text-[14px] font-black text-white shadow-lg shadow-violet-700/40 transition hover:bg-violet-500"
              >
                Začať zdarma
              </a>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white xl:hidden"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {mobileMenuOpen ? (
            <div className="border-t border-white/10 bg-[#070716] px-5 py-4 xl:hidden shadow-xl">
              <div className="grid gap-2">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/5"
                  >
                    {item.label}
                  </a>
                ))}

                <MobileLanguageDropdown
                  language={language}
                  onChange={handleLanguageChange}
                />

                <Link
                  href="/login"
                  className="mt-2 rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-black text-white"
                >
                  Prihlásiť sa
                </Link>

                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-black text-white"
                >
                  Začať zdarma
                </a>
              </div>
            </div>
          ) : null}
        </header>

        <section className="relative z-10 mx-auto max-w-[1860px] px-5 pb-8 pt-8 lg:px-10">
          <div className="grid min-h-[560px] items-center gap-10 xl:grid-cols-[0.41fr_0.59fr]">
            <div className="relative z-20 max-w-[720px] pt-1">
              <div className="mb-8 inline-flex items-center rounded-full border border-violet-500/35 bg-violet-500/10 px-5 py-2 text-[13px] font-black uppercase tracking-[0.22em] text-violet-100">
                Akademický asistent novej generácie
              </div>

              <h1 className="text-[34px] font-black leading-[1.15] tracking-[-0.035em] text-white sm:text-[42px] lg:text-[48px] xl:text-[54px]">
                Prvý AI vedúci práce,
                <br />
                ktorý vás prevedie
                <br />
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-purple-200 bg-clip-text text-transparent">
                  od zadania až po obhajobu
                </span>
              </h1>

              <p className="mt-9 max-w-2xl text-[17px] font-bold leading-8 text-slate-300">
                Zedpera spája AI písanie, odbornú spätnú väzbu, kontrolu
                kvality, zdroje, citácie, praktickú časť aj prípravu na
                obhajobu v jednom systéme.
              </p>

              <div className="mt-10 flex flex-col gap-5 sm:flex-row">
                <a
                  href="#pricing"
                  className="inline-flex min-h-[64px] min-w-[225px] items-center justify-center gap-4 rounded-xl bg-violet-600 px-9 text-[17px] font-black text-white shadow-2xl shadow-violet-700/35 transition hover:-translate-y-0.5 hover:bg-violet-500"
                >
                  Začať zdarma
                  <ArrowRight size={23} />
                </a>

                <a
                  href="#features"
                  className="inline-flex min-h-[64px] min-w-[240px] items-center justify-center gap-4 rounded-xl border border-white/15 bg-white/5 px-9 text-[17px] font-black text-white transition hover:-translate-y-0.5 hover:border-violet-400 hover:bg-white/10"
                >
                  Pozrieť ukážku
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm">
                    ▶
                  </span>
                </a>
              </div>

              <div className="mt-10 grid max-w-[760px] grid-cols-2 gap-5 text-[15px] font-black text-slate-100 sm:grid-cols-4">
                <div className="flex items-center gap-3">
                  <Bot className="h-6 w-6 text-violet-300" />
                  AI vedúci 24/7
                </div>

                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-violet-300" />
                  Praktická časť vrátane výpočtov
                </div>

                <div className="flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-violet-300" />
                  Citácie a zdroje
                </div>

                <div className="flex items-center gap-3">
                  <Crown className="h-6 w-6 text-violet-300" />
                  Príprava na obhajobu
                </div>
              </div>
            </div>

            <AiLeaderPreview />
          </div>

          <div className="mt-16 grid overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/30 sm:grid-cols-4">
            {[
              ['20', 'rokov skúseností'],
              ['1000+', 'študentov'],
              ['24/7', 'AI vedúci'],
              ['1', 'platforma pre celý proces'],
            ].map(([number, label]) => (
              <div
                key={label}
                className="border-b border-white/10 px-5 py-5 text-center last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                <div className="text-3xl font-black text-violet-400">
                  {number}
                </div>

                <div className="mt-1 text-xs font-black uppercase tracking-wider text-slate-300">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- Funkcie --- */}
        <section
          id="features"
          className="relative z-10 mx-auto max-w-[1460px] px-5 py-24 lg:px-8"
        >
          <h2 className="zedpera-section-title text-center text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Všetko, čo potrebujete na úspešnú prácu
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="zedpera-glow-border flex flex-col items-start gap-4 rounded-2xl bg-white/[0.02] p-8 transition hover:bg-white/[0.04]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.15)]">
                    <Icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm font-semibold leading-relaxed text-slate-400">
                    {feature.text}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* --- Porovnanie (VS) --- */}
        <section className="relative z-10 mx-auto max-w-[1260px] px-5 py-24 lg:px-8">
          <div className="text-center">
            <h2 className="zedpera-section-title text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Prečo nestačí bežná AI alebo LLM nástroj?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg font-bold text-slate-400">
              Zedpera funguje inak. Namiesto univerzálnych odpovedí dostanete
              výstup, ktorý súvisí s vašou prácou, zdrojmi a celým procesom
              písania.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_auto_1fr] items-center">
            {/* Bad AI */}
            <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 shadow-[0_0_40px_rgba(239,68,68,0.05)]">
              <h3 className="mb-6 text-2xl font-black text-red-400">Bežná AI</h3>
              <ul className="space-y-4">
                {badAiItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <X className="mt-0.5 shrink-0 text-red-400" size={20} />
                    <span className="text-sm font-semibold text-slate-300">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* VS Badge */}
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#101026] text-xl font-black text-slate-400 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                VS
              </div>
            </div>

            {/* Zedpera AI */}
            <div className="zedpera-glow-border rounded-3xl bg-violet-600/10 p-8 shadow-[0_0_50px_rgba(124,58,237,0.15)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Crown className="text-violet-400 opacity-50" size={40} />
              </div>
              <h3 className="mb-6 text-2xl font-black text-violet-300">Zedpera</h3>
              <ul className="space-y-4 relative z-10">
                {zedperaItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-violet-400" size={20} />
                    <span className="text-sm font-semibold text-white">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* --- Ako funguje Zedpera? --- */}
        <section className="relative z-10 mx-auto max-w-[1260px] px-5 py-24 lg:px-8">
          <h2 className="zedpera-section-title text-center text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Ako funguje Zedpera?
          </h2>

          <div className="mt-16 grid gap-8 md:grid-cols-3 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-violet-600/0 via-violet-600/50 to-violet-600/0 -translate-y-1/2 z-0" />
            
            {[
              {
                step: '01',
                title: 'Vytvoríte projekt',
                text: 'Zadáte tému, typ práce, školu, požiadavky a ciele.',
              },
              {
                step: '02',
                title: 'AI vedúci vás vedie',
                text: 'Pomáha s osnovou, textom a upozorňuje na chyby.',
              },
              {
                step: '03',
                title: 'Dokončíte a obhájite',
                text: 'Skontrolujete kvalitu, originalitu, zdroje a metodiku a pripravíte sa na obhajobu.',
              },
            ].map((item, index) => (
              <div key={index} className="relative z-10 flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#050511] bg-violet-600 text-2xl font-black text-white shadow-[0_0_30px_rgba(124,58,237,0.4)]">
                  {item.step}
                </div>
                <h3 className="mt-6 text-xl font-black text-white">{item.title}</h3>
                <p className="mt-3 text-sm font-semibold text-slate-400 max-w-[260px]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* --- O nás (20 rokov skúseností) --- */}
        <section id="about" className="relative z-10 mx-auto max-w-[1460px] px-5 py-24 lg:px-8">
          <div className="zedpera-glow-border rounded-3xl bg-white/[0.02] p-8 lg:p-12 overflow-hidden relative">
            <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-violet-900/20 to-transparent pointer-events-none" />
            <div className="grid gap-12 lg:grid-cols-2 items-center relative z-10">
              <div>
                <div className="mb-6 inline-flex items-center rounded-full border border-violet-500/35 bg-violet-500/10 px-4 py-1.5 text-[12px] font-black uppercase tracking-[0.2em] text-violet-200">
                  O nás
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  20 rokov skúseností<br />
                  <span className="text-violet-400">v jednom systéme</span>
                </h2>
                <p className="mt-6 text-lg font-semibold text-slate-300">
                  Za Zedperou stojí skúsený tím, ktorý už viac než 20 rokov pomáha
                  študentom pri tvorbe akademických prác.
                </p>
                <p className="mt-4 text-lg font-semibold text-slate-400">
                  Naše skúsenosti zo skutočnej praxe sme spojili s umelou
                  inteligenciou, aby sme vám priniesli komplexnú podporu počas
                  celého procesu písania.
                </p>
              </div>
              <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center group border border-white/10">
                 <img 
                   src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800&h=1000" 
                   alt="Fotografia tímu" 
                   className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#050511] via-[#050511]/30 to-transparent z-10 opacity-90" />
              </div>
            </div>
          </div>
        </section>

        {/* --- Recenzie --- */}
        <section id="reviews" className="relative z-10 mx-auto max-w-[1460px] px-5 py-24 lg:px-8">
           <h2 className="zedpera-section-title text-center text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Skúsenosti študentov so Zedperou
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {reviews.map((review, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 text-yellow-400 mb-4">
                    <Star size={18} fill="currentColor" />
                    <Star size={18} fill="currentColor" />
                    <Star size={18} fill="currentColor" />
                    <Star size={18} fill="currentColor" />
                    <Star size={18} fill="currentColor" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300 italic mb-6">
                    &quot;{review.text}&quot;
                  </p>
                </div>
                <div className="text-[13px] font-black text-violet-300 uppercase tracking-wider">
                  {review.name}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- Cenník --- */}
        <section id="pricing" className="relative z-10 mx-auto max-w-[1260px] px-5 py-24 lg:px-8">
          <div className="text-center">
            <h2 className="zedpera-section-title text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Vyberte si program podľa rozsahu práce
            </h2>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3 max-w-[1000px] mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl p-8 ${
                  plan.highlighted
                    ? 'zedpera-glow-border bg-violet-900/20 scale-105 z-10'
                    : 'border border-white/10 bg-white/[0.02]'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-4 py-1 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-violet-500/50">
                    Najobľúbenejšie
                  </div>
                )}
                
                <div className="text-sm font-black uppercase tracking-wider text-violet-400 mb-2">
                  {plan.label}
                </div>
                <h3 className="text-xl font-bold text-white mb-6">
                  {plan.name}
                </h3>
                <div className="mb-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-sm font-semibold text-slate-400">/ {plan.period}</span>
                </div>
                <p className="text-sm font-semibold text-slate-400 mb-8 min-h-[60px]">
                  {plan.description}
                </p>
                
                <button
                  onClick={() => buy(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`mt-auto w-full rounded-xl py-4 text-sm font-black transition flex items-center justify-center gap-2 ${
                    plan.highlighted
                      ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-600/30'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {loadingPlan === plan.id ? <Loader2 className="animate-spin" size={18} /> : null}
                  {plan.button}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
             <Link href="/pricing" className="inline-flex items-center gap-2 text-sm font-black text-violet-400 hover:text-violet-300 transition">
               Zobraziť všetky balíčky a možnosti <ArrowRight size={16} />
             </Link>
             <p className="mt-2 text-xs font-semibold text-slate-500">
               Pozrite si kompletnú ponuku mesačných a ročných balíčkov.
             </p>
          </div>
          
          {/* Guarantees */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-violet-400"/> Bezpečné platby</span>
            <span className="flex items-center gap-2"><Zap size={16} className="text-violet-400"/> Okamžitý prístup</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-violet-400"/> Záruka spokojnosti</span>
            <span className="flex items-center gap-2"><X size={16} className="text-violet-400"/> Možnosť zrušenia kedykoľvek</span>
          </div>

          {paymentError && (
            <div className="mt-8 rounded-lg bg-red-500/10 p-4 text-center text-sm font-bold text-red-400 border border-red-500/20 max-w-md mx-auto">
              {paymentError}
            </div>
          )}
        </section>

        {/* --- FAQ --- */}
        <section id="faq" className="relative z-10 mx-auto max-w-[860px] px-5 py-24 lg:px-8">
           <h2 className="zedpera-section-title text-center text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl mb-12">
            Najčastejšie otázky
          </h2>

          <div className="space-y-4">
            {faqItems.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-6 text-left hover:bg-white/[0.02] transition"
                  >
                    <span className="text-base font-bold text-white pr-4">{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="shrink-0 text-violet-400" size={20} />
                    ) : (
                      <ChevronDown className="shrink-0 text-slate-500" size={20} />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm font-semibold leading-relaxed text-slate-400">
                      {faq.answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* --- CTA / Footer --- */}
        <section className="relative z-10 mx-auto max-w-[1260px] px-5 py-24 lg:px-8">
          <div className="zedpera-glow-border rounded-[2.5rem] bg-gradient-to-br from-violet-900/40 to-blue-900/20 p-12 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
            <h2 className="text-3xl font-black text-white sm:text-5xl mb-6 relative z-10">
              Začni písať bez stresu už dnes
            </h2>
            <p className="text-lg font-bold text-violet-200 max-w-2xl mx-auto mb-10 relative z-10">
              AI vedúci, zdroje, citácie, kontrola kvality, praktická časť aj obhajoba v jednom systéme.
            </p>
            <a
              href="#pricing"
              className="inline-flex h-[60px] min-w-[240px] items-center justify-center gap-3 rounded-xl bg-white text-[17px] font-black text-violet-900 shadow-xl shadow-white/10 transition hover:scale-105 relative z-10"
            >
              Začať so Zedperou
              <ArrowRight size={20} />
            </a>
          </div>
        </section>

        <footer className="border-t border-white/10 py-12 text-center text-sm font-semibold text-slate-500 relative z-10 bg-[#020208]/50 mt-12">
           <div className="flex justify-center items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-violet-600 to-fuchsia-500 text-sm font-black text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                Z
              </div>
              <span className="text-lg font-black uppercase tracking-widest text-white">Zedpera</span>
           </div>
           <p>© {new Date().getFullYear()} Zedpera. Všetky práva vyhradené.</p>
        </footer>
      </div>

      {/* Floating Scroll to Top Button */}
      <button
        type="button"
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 hover:scale-110 hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 ${
          showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
        aria-label="Návrat nahor"
      >
        <ChevronUp size={28} />
      </button>
    </main>
  );
}