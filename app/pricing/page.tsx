'use client';

import {
  useEffect,
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
  Mail,
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

type PaidPlanId = Exclude<PlanId, 'free'>;
type CheckoutKind = 'plan' | 'addon';

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
  email: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

type AddonCheckoutPayload = {
  checkoutType: 'addon';
  addon: AddonId;
  addonId: AddonId;
  addons: AddonId[];
  addonIds: AddonId[];
  email: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

type CheckoutPayload = PlanCheckoutPayload | AddonCheckoutPayload;

const PAID_PLAN_IDS: PaidPlanId[] = [
  'seminar-work',
  'bachelor-thesis',
  'master-thesis',
];

const ADDON_IDS: AddonId[] = [
  'data-analysis',
  'extra-20',
  'extra-40',
  'extra-60',
];

const STORAGE_SELECTED_PLAN = 'zedpera_selected_plan';
const STORAGE_SELECTED_ADDONS = 'zedpera_selected_addons';
const STORAGE_EMAIL_KEYS = [
  'zedpera_user_email',
  'zedpera_email',
  'user_email',
  'email',
] as const;

const mainPlans: MainPlan[] = [
  {
    id: 'free',
    name: 'FREE VERZIA',
    priceCents: 0,
    period: 'bez platby',
    scope: `${PLANS.free.pageLimit} strany Â· ${PLANS.free.attachmentLimit} prĂ­loha Â· ${PLANS.free.promptLimit ?? 0} AI prompty`,
    badge: 'BezplatnĂ© vyskĂşĹˇanie',
    description:
      'ZĂˇkladnĂˇ verzia na vyskĂşĹˇanie systĂ©mu bez platobnej karty a bez aktivĂˇcie predplatnĂ©ho.',
    isFree: true,
    features: [
      `${PLANS.free.pageLimit} strany spracovanĂ©ho vĂ˝stupu`,
      `${PLANS.free.attachmentLimit} nahranĂˇ prĂ­loha`,
      `${PLANS.free.promptLimit ?? 0} skĂşĹˇobnĂ© AI prompty`,
      'ZĂˇkladnĂ© vyskĂşĹˇanie AI chatu',
      'Bez platobnej karty',
    ],
  },
  {
    id: 'seminar-work',
    name: 'SEMINĂRNA PRĂCA',
    priceCents: 3900,
    period: 'mesaÄŤne',
    scope: `Rozsah do ${PLANS['seminar-work'].pageLimit} strĂˇn`,
    badge: 'Pre kratĹˇie akademickĂ© prĂˇce',
    description:
      'MesaÄŤnĂ˝ balĂ­k pre seminĂˇrne, roÄŤnĂ­kovĂ©, zĂˇpoÄŤtovĂ© a kratĹˇie odbornĂ© prĂˇce.',
    features: [
      'AI pomoc pri pĂ­sanĂ­ jednotlivĂ˝ch kapitol',
      'NĂˇvrh ĹˇtruktĂşry a osnovy',
      'MetodickĂ© vedenie poÄŤas spracovania',
      'Kontrola kvality a logiky textu',
      'HumanizĂˇcia textu',
      'Pomoc s citĂˇciami a zdrojmi',
      'PlĂˇnovanie prĂˇce a termĂ­nov',
      'PrĂ­prava e-mailov pre vyuÄŤujĂşceho',
    ],
  },
  {
    id: 'bachelor-thesis',
    name: 'BAKALĂRSKA PRĂCA',
    priceCents: 14900,
    period: 'mesaÄŤne',
    scope: `Rozsah do ${PLANS['bachelor-thesis'].pageLimit} strĂˇn`,
    badge: 'NajobÄľĂşbenejĹˇĂ­ balĂ­k',
    description:
      'KompletnĂˇ mesaÄŤnĂˇ podpora od zadania a osnovy aĹľ po prĂ­pravu na obhajobu bakalĂˇrskej prĂˇce.',
    highlighted: true,
    features: [
      'Tvorba a Ăşprava jednotlivĂ˝ch kapitol',
      'MetodickĂ© vedenie poÄŤas celĂ©ho pĂ­sania',
      'Kontrola kvality, logiky a konzistentnosti',
      'HumanizĂˇcia odbornĂ©ho textu',
      'Pomoc so zdrojmi a citĂˇciami',
      'Spracovanie dotaznĂ­kov a Ĺˇtatistiky',
      'Tvorba grafov a tabuliek',
      'PrĂ­prava prezentĂˇcie na obhajobu',
      'PrĂ­prava odpovedĂ­ na otĂˇzky komisie',
    ],
  },
  {
    id: 'master-thesis',
    name: 'DIPLOMOVĂ / MAGISTERSKĂ PRĂCA',
    priceCents: 18900,
    period: 'mesaÄŤne',
    scope: `Rozsah do ${PLANS['master-thesis'].pageLimit} strĂˇn`,
    badge: 'NajkomplexnejĹˇĂ­ balĂ­k',
    description:
      'NajvyĹˇĹˇĂ­ mesaÄŤnĂ˝ balĂ­k pre rozsiahle zĂˇvereÄŤnĂ© prĂˇce, pokroÄŤilĂş metodiku, analĂ˝zu dĂˇt a obhajobu.',
    features: [
      'Tvorba a Ăşprava celej zĂˇvereÄŤnej prĂˇce',
      'PokroÄŤilĂ© metodickĂ© vedenie',
      'Kontrola odbornosti a konzistentnosti',
      'HumanizĂˇcia odbornĂ©ho textu',
      'KomplexnĂˇ prĂˇca so zdrojmi a citĂˇciami',
      'DeskriptĂ­vna a inferenÄŤnĂˇ Ĺˇtatistika',
      'Testovanie hypotĂ©z a normality dĂˇt',
      'KorelaÄŤnĂ© a neparametrickĂ© analĂ˝zy',
      'Tvorba grafov, tabuliek a interpretĂˇciĂ­',
      'PrĂ­prava prezentĂˇcie a simulĂˇcia obhajoby',
    ],
  },
];

const oneTimeAddons: OneTimeAddon[] = [
  {
    id: 'data-analysis',
    name: 'ANALĂťZA DĂT',
    priceCents: ADDONS['data-analysis'].priceCents,
    period: 'jednorazovĂˇ platba',
    badge: 'SamostatnĂˇ analytickĂˇ sluĹľba',
    description:
      'JednorazovĂ© sprĂ­stupnenie nĂˇstrojov na prĂ­pravu, ĹˇtatistickĂ© spracovanie, vizualizĂˇciu a export dĂˇt.',
    features: [
      'ÄŚistenie a prĂ­prava dĂˇt',
      'Spracovanie dotaznĂ­kov',
      'DeskriptĂ­vna Ĺˇtatistika',
      'FrekvenÄŤnĂ© tabuÄľky',
      'Testovanie normality',
      'KorelaÄŤnĂ© analĂ˝zy',
      'ParametrickĂ© a neparametrickĂ© testy',
      'Grafy, tabuÄľky a export vĂ˝sledkov',
    ],
  },
  {
    id: 'extra-20',
    name: 'EXTRA 20 STRĂN',
    priceCents: ADDONS['extra-20'].priceCents,
    period: 'jednorazovĂˇ platba',
    description:
      'JednorazovĂ© navĂ˝Ĺˇenie dostupnĂ©ho rozsahu aktuĂˇlneho projektu o ÄŹalĹˇĂ­ch 20 strĂˇn.',
    features: [
      `NavĂ˝Ĺˇenie limitu o ${ADDONS['extra-20'].extraPages} strĂˇn`,
      'PouĹľitie v aktuĂˇlnom projekte',
      'Bez zmeny hlavnĂ©ho mesaÄŤnĂ©ho plĂˇnu',
    ],
  },
  {
    id: 'extra-40',
    name: 'EXTRA 40 STRĂN',
    priceCents: ADDONS['extra-40'].priceCents,
    period: 'jednorazovĂˇ platba',
    description:
      'JednorazovĂ© navĂ˝Ĺˇenie dostupnĂ©ho rozsahu aktuĂˇlneho projektu o ÄŹalĹˇĂ­ch 40 strĂˇn.',
    features: [
      `NavĂ˝Ĺˇenie limitu o ${ADDONS['extra-40'].extraPages} strĂˇn`,
      'PouĹľitie v aktuĂˇlnom projekte',
      'Bez zmeny hlavnĂ©ho mesaÄŤnĂ©ho plĂˇnu',
    ],
  },
  {
    id: 'extra-60',
    name: 'EXTRA 60 STRĂN',
    priceCents: ADDONS['extra-60'].priceCents,
    period: 'jednorazovĂˇ platba',
    description:
      'JednorazovĂ© navĂ˝Ĺˇenie dostupnĂ©ho rozsahu aktuĂˇlneho projektu o ÄŹalĹˇĂ­ch 60 strĂˇn.',
    features: [
      `NavĂ˝Ĺˇenie limitu o ${ADDONS['extra-60'].extraPages} strĂˇn`,
      'PouĹľitie v aktuĂˇlnom projekte',
      'Bez zmeny hlavnĂ©ho mesaÄŤnĂ©ho plĂˇnu',
    ],
  },
];

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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getFriendlyCheckoutError(
  data: CheckoutResponse,
  fallback: string,
) {
  if (data.displayMessage) return data.displayMessage;

  if (data.error === 'INVALID_PLAN' || data.code === 'INVALID_PLAN') {
    return [
      'PlatobnĂˇ brĂˇna odmietla identifikĂˇtor hlavnĂ©ho plĂˇnu.',
      '',
      `OdoslanĂ˝ plĂˇn: ${data.receivedPlan || 'nezistenĂ©'}`,
      '',
      `PovolenĂ© ID plĂˇnov: ${PAID_PLAN_IDS.join(', ')}`,
    ].join('\n');
  }

  if (data.error === 'INVALID_ADDON' || data.code === 'INVALID_ADDON') {
    return [
      'PlatobnĂˇ brĂˇna odmietla identifikĂˇtor jednorazovĂ©ho doplnku.',
      '',
      `OdoslanĂ˝ doplnok: ${data.receivedAddon || 'nezistenĂ©'}`,
      '',
      `PovolenĂ© ID doplnkov: ${ADDON_IDS.join(', ')}`,
    ].join('\n');
  }

  const message = [
    data.error,
    data.message,
    data.detail,
    data.reason ? `DĂ´vod: ${data.reason}` : '',
    data.solution ? `RieĹˇenie: ${data.solution}` : '',
    data.technicalCode
      ? `TechnickĂ˝ kĂłd: ${data.technicalCode}`
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
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    for (const key of STORAGE_EMAIL_KEYS) {
      const storedEmail = window.localStorage.getItem(key);

      if (storedEmail) {
        setCheckoutEmail(storedEmail);
        break;
      }
    }
  }, []);

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  const scrollToTop = () => {
    pageRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const getRequiredEmail = () => {
    const email = normalizeEmail(checkoutEmail);

    if (!email) {
      setCheckoutError(
        'Pred pokraÄŤovanĂ­m na platbu zadajte e-mailovĂş adresu.',
      );
      emailInputRef.current?.focus();
      return null;
    }

    if (!isValidEmail(email)) {
      setCheckoutError('Zadajte platnĂş e-mailovĂş adresu.');
      emailInputRef.current?.focus();
      return null;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('zedpera_email', email);
    }

    return email;
  };

  const activateFreePlan = () => {
    setCheckoutError('');

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_SELECTED_PLAN, 'free');
      window.localStorage.removeItem(STORAGE_SELECTED_ADDONS);
    }

    router.push('/register?plan=free&source=pricing');
  };

  const startPlanCheckout = async (planId: PaidPlanId) => {
    if (!isPaidPlanId(planId)) {
      setCheckoutError(
        `NeplatnĂ˝ hlavnĂ˝ plĂˇn: ${planId}.`,
      );
      return;
    }

    const email = getRequiredEmail();
    if (!email) return;

    const loadingKey = `plan:${planId}`;

    try {
      setLoadingCheckout(loadingKey);
      setCheckoutError('');

      if (typeof window === 'undefined') {
        throw new Error(
          'Platbu je moĹľnĂ© spustiĹĄ iba v internetovom prehliadaÄŤi.',
        );
      }

      window.localStorage.setItem(STORAGE_SELECTED_PLAN, planId);
      window.localStorage.removeItem(STORAGE_SELECTED_ADDONS);

      const origin = window.location.origin;

      const payload: PlanCheckoutPayload = {
        checkoutType: 'plan',
        plan: planId,
        planId,
        addons: [],
        addonIds: [],
        email,
        customerEmail: email,
        successUrl: `${origin}/dashboard?payment=success&checkoutType=plan&plan=${encodeURIComponent(
          planId,
        )}`,
        cancelUrl: `${origin}/pricing?payment=canceled&checkoutType=plan&plan=${encodeURIComponent(
          planId,
        )}`,
      };

      const { response, data } = await postCheckout(payload);

      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error(
        getFriendlyCheckoutError(
          data,
          `PlatobnĂş brĂˇnu sa nepodarilo spustiĹĄ. HTTP ${response.status}.`,
        ),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Platbu hlavnĂ©ho plĂˇnu sa nepodarilo spustiĹĄ.';

      console.error('PLAN CHECKOUT ERROR:', error);
      setCheckoutError(message);
    } finally {
      setLoadingCheckout(null);
    }
  };

  const startAddonCheckout = async (addonId: AddonId) => {
    if (!isAddonId(addonId)) {
      setCheckoutError(
        `NeplatnĂ˝ jednorazovĂ˝ doplnok: ${addonId}.`,
      );
      return;
    }

    const email = getRequiredEmail();
    if (!email) return;

    const loadingKey = `addon:${addonId}`;

    try {
      setLoadingCheckout(loadingKey);
      setCheckoutError('');

      if (typeof window === 'undefined') {
        throw new Error(
          'Platbu je moĹľnĂ© spustiĹĄ iba v internetovom prehliadaÄŤi.',
        );
      }

      window.localStorage.setItem(
        STORAGE_SELECTED_ADDONS,
        JSON.stringify([addonId]),
      );

      const origin = window.location.origin;

      const payload: AddonCheckoutPayload = {
        checkoutType: 'addon',
        addon: addonId,
        addonId,
        addons: [addonId],
        addonIds: [addonId],
        email,
        customerEmail: email,
        successUrl: `${origin}/dashboard?payment=success&checkoutType=addon&addon=${encodeURIComponent(
          addonId,
        )}`,
        cancelUrl: `${origin}/pricing?payment=canceled&checkoutType=addon&addon=${encodeURIComponent(
          addonId,
        )}`,
      };

      const { response, data } = await postCheckout(payload);

      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error(
        getFriendlyCheckoutError(
          data,
          `PlatobnĂş brĂˇnu sa nepodarilo spustiĹĄ. HTTP ${response.status}.`,
        ),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Platbu jednorazovĂ©ho doplnku sa nepodarilo spustiĹĄ.';

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
            MesaÄŤnĂ© plĂˇny a jednorazovĂ© doplnky
          </div>

          <button
            type="button"
            onClick={goToDashboard}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-purple-400/30 bg-purple-600/20 px-4 py-2 text-sm font-bold text-purple-100 transition hover:bg-purple-600/30"
          >
            <ArrowLeft size={18} />
            SpĂ¤ĹĄ do menu
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-10 pb-32 sm:px-6 lg:px-8">
        <section>
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200">
              <Crown size={16} />
              CennĂ­k ZEDPERA
            </div>

            <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Vyberte hlavnĂ˝ mesaÄŤnĂ˝ plĂˇn alebo samostatnĂ˝ jednorazovĂ˝ doplnok
            </h1>

            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-300 sm:text-lg">
              HlavnĂ© akademickĂ© plĂˇny fungujĂş ako mesaÄŤnĂ© predplatnĂ©. AnalĂ˝za dĂˇt
              a balĂ­ky Extra 20, 40 alebo 60 strĂˇn sa nakupujĂş samostatne ako
              jednorazovĂ© doplnky a nepridĂˇvajĂş sa do ceny mesaÄŤnĂ©ho plĂˇnu.
            </p>

            <div className="mt-6 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-3">
              <HeroInfo
                icon={<ShieldCheck size={18} />}
                title="JasnĂ© oddelenie platieb"
                text="MesaÄŤnĂ˝ plĂˇn a jednorazovĂ˝ doplnok majĂş samostatnĂ˝ checkout."
              />

              <HeroInfo
                icon={<FileText size={18} />}
                title="Rozsah podÄľa balĂ­ka"
                text="KaĹľdĂ˝ hlavnĂ˝ plĂˇn mĂˇ vlastnĂ˝ limit spracovanĂ˝ch strĂˇn."
              />

              <HeroInfo
                icon={<Sparkles size={18} />}
                title="FlexibilnĂ© rozĹˇĂ­renia"
                text="AnalĂ˝zu dĂˇt alebo extra strany mĂ´Ĺľete kĂşpiĹĄ samostatne."
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl sm:p-6">
            <label
              htmlFor="checkout-email"
              className="flex items-center gap-2 text-sm font-black text-white"
            >
              <Mail size={18} className="text-purple-300" />
              E-mail pre platbu a aktivĂˇciu sluĹľby
            </label>

            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
              <input
                ref={emailInputRef}
                id="checkout-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={checkoutEmail}
                onChange={(event) => {
                  setCheckoutEmail(event.target.value);
                  setCheckoutError('');
                }}
                placeholder="vas@email.sk"
                className="min-h-[50px] w-full rounded-2xl border border-white/10 bg-[#0f172a] px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
              />

              <p className="text-xs leading-5 text-slate-400 lg:max-w-md">
                Platba a nĂˇslednĂˇ aktivĂˇcia balĂ­ka alebo doplnku budĂş naviazanĂ©
                na tĂşto e-mailovĂş adresu.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-purple-300">
                <Crown size={21} />
                <h2 className="text-2xl font-black text-white sm:text-3xl">
                  HlavnĂ© mesaÄŤnĂ© plĂˇny
                </h2>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Vyberte jeden hlavnĂ˝ plĂˇn. PlatenĂ© balĂ­ky sa ĂşÄŤtujĂş mesaÄŤne
                prostrednĂ­ctvom Stripe predplatnĂ©ho.
              </p>
            </div>

            <div className="rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-100">
              SamostatnĂ˝ checkout pre kaĹľdĂ˝ plĂˇn
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {mainPlans.map((plan) => {
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
                      Rozsah balĂ­ka
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
                        PresmerovĂˇvam...
                      </>
                    ) : plan.isFree ? (
                      <>
                        <Gift size={18} />
                        PokraÄŤovaĹĄ zadarmo
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        AktivovaĹĄ mesaÄŤnĂ˝ plĂˇn
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
                  JednorazovĂ© doplnky
                </h2>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Doplnky sa nekombinujĂş s mesaÄŤnĂ˝m plĂˇnom v jednom nĂˇkupe.
                KaĹľdĂ˝ doplnok otvorĂ­ vlastnĂş jednorazovĂş Stripe platbu.
              </p>
            </div>

            <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-100">
              Bez mesaÄŤnĂ©ho predplatnĂ©ho
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
                        PresmerovĂˇvam...
                      </>
                    ) : (
                      <>
                        <FilePlus2 size={18} />
                        KĂşpiĹĄ jednorazovo
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
            DĂ´leĹľitĂ© informĂˇcie k platbe
          </h2>

          <p className="mx-auto mt-3 max-w-4xl text-sm leading-6 text-slate-400">
            HlavnĂ˝ platenĂ˝ plĂˇn je mesaÄŤnĂ© predplatnĂ©. AnalĂ˝za dĂˇt a Extra
            20/40/60 strĂˇn sĂş jednorazovĂ© poloĹľky. Cenu, Stripe Price ID a reĹľim
            platby musĂ­ vĹľdy urÄŤiĹĄ serverovĂ˝ katalĂłg v API; klient neposiela cenu
            ako dĂ´veryhodnĂ˝ Ăşdaj.
          </p>

          <p className="mx-auto mt-3 max-w-4xl text-xs leading-5 text-slate-500">
            AI systĂ©m poskytuje odbornĂş podporu pri prĂ­prave akademickej prĂˇce.
            PouĹľĂ­vateÄľ zodpovedĂˇ za kontrolu vĂ˝sledku, sprĂˇvnosĹĄ Ăşdajov, koneÄŤnĂş
            Ăşpravu a dodrĹľanie pravidiel svojej Ĺˇkoly.
          </p>
        </section>
      </main>

      <button
        type="button"
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-purple-600 text-white shadow-2xl shadow-purple-950/50 transition hover:bg-purple-500"
        aria-label="SpĂ¤ĹĄ hore"
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


