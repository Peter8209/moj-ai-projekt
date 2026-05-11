'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  Crown,
  CreditCard,
  FileCheck2,
  GraduationCap,
  Loader2,
  Menu,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
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

type FaqItem = {
  question: string;
  answer: string;
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
      'Vhodné na seminárnu prácu, jednu kapitolu alebo rýchlu úpravu textu',
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

const fiveBlocks = [
  {
    title: 'Rýchle vytvorenie práce',
    text: `Zadaj tému, vyplň profil a získaj kvalitný odborný text prispôsobený tvojim požiadavkám a zdrojom. Systém nehalucinuje ako bežné AI nástroje, ale vychádza výhradne z tvojich zdrojov. Využíva pritom viacero najnovších AI modelov. Cituje presne podľa noriem, takže sa nemusíš báť plagiátorstva. Dokonca zvládne aj výpočty pri praktickej časti. Už nemusíš hľadať žiadneho štatistu alebo pracovať v programoch, ktorým nerozumieš.`,
  },
  {
    title: 'AI kritik',
    text: `Asistent zanalyzuje tvoju prácu, upozorní ťa na nedostatky a zároveň navrhne konkrétne úpravy. Získaj okamžitú spätnú väzbu. Zároveň zobrazí skóre kvality napísanej práce.`,
  },
  {
    title: 'AI vedúci práce dostupný 24/7',
    text: `Sprevádza ťa celým procesom písania, kontroluje tvoj text, navrhuje vylepšenia a ukazuje ti, ako ho posunúť na vyššiu úroveň. Keď dostaneš pripomienky od školiteľa, pomôže ti ich jednoducho zapracovať. Je ti k dispozícii nonstop a vždy sa sústredí len na tvoju prácu.`,
  },
  {
    title: 'Kontrola originality',
    text: `Získaj prehľad o originalite práce a minimalizuj riziko problémov s plagiátorstvom. Zedpera celý text skontroluje a vyhodnotí percento zhody. Overenie prebieha bezpečne a bez ukladania obsahu do verejných databáz, takže sa nemusíš obávať nežiaducich zhôd pri následnom odovzdaní práce do školského systému. Výsledok ti poskytne orientačný prehľad o miere originality a pomôže identifikovať časti, ktoré je vhodné upraviť.`,
  },
  {
    title: 'Príprava na obhajobu',
    text: `Po dokončení práce systém vygeneruje obhajobu, pripraví ti prezentáciu, odpovede na otázky vedúceho aj oponenta na základe posudkov spolu so sprievodným textom.`,
  },
];

const badAiItems = [
  `Píše všeobecné texty a omáčky. Obsah môže byť síce dlhý, ale nemá žiadnu výpovednú hodnotu. Robí faktické chyby.`,
  `Bežná AI si nepamätá Vašu tému, preto jej musíte neustále opakovať všetky informácie a zadávať dlhé prompty.`,
  'Text je potrebné zdĺhavo upravovať.',
  'Vymýšľa si zdroje.',
  'Nechráni Vaše súkromie.',
  'Nedokáže upozorniť na chyby.',
  'Nerozumie pripomienkam od školiteľa.',
  'Nepomôže ti s výpočtami a praktickou časťou.',
  'Neoverí zhodu.',
  'Nedokáže reagovať na posudky.',
];

const zedperaItems = [
  `Pozná Vašu prácu. Dokonale si pamätá celú tému vrátane anotácie, cieľa, metodiky, hypotéz, spôsobu citovania, praktickej časti a kľúčových slov.`,
  `Pozná celú históriu, dokonca aj komunikáciu. Nemusíte jej nič opakovať.`,
  'Cituje presne podľa Vami zvolenej normy.',
  'Vychádza z Vašich zdrojov.',
  'Údaje sú chránené.',
  'Zanalyzuje prácu a upozorní na problémové časti.',
  `Sprevádza ťa celým procesom písania, kontroluje tvoj text, navrhuje vylepšenia a ukazuje ti, ako ho posunúť na vyššiu úroveň. Zároveň dokáže pomôcť s pripomienkami od vedúceho.`,
  'Dokáže ti pripraviť praktickú časť vrátane analýz a výpočtov.',
  'Overí zhodu.',
  'Pomôže s obhajobou na základe posudkov.',
];

const faqItems: FaqItem[] = [
  {
    question: 'Môžem službu používať počas celého štúdia na viacero prác?',
    answer:
      'Áno. Službu môžete využívať opakovane počas štúdia na rôzne typy akademických prác od seminárnych až po bakalárske, diplomové, dizertačné či rigorózne práce. Pre každé nové zadanie si jednoducho nastavíte nový projekt vo svojom profile.',
  },
  {
    question: 'Zvládne ZEDPERA každý odbor?',
    answer:
      'Áno. ZEDPERA dokáže pracovať s akýmikoľvek materiálmi. Ak si chcete zjednodušiť prácu, môžete si stiahnuť zdroje z našej vedeckej databázy, alebo nahrať vlastné poznámky, súbory prípadne požiadavky školiteľa.',
  },
  {
    question: 'Aký je rozdiel medzi ChatGPT, Gemini a ZEDPEROU?',
    answer:
      'ZEDPERA je vytvorená priamo pre akademické písanie. Na rozdiel od všeobecných nástrojov, ako ChatGPT alebo Gemini, pracuje s vaším konkrétnym zadaním. Nevymýšľa si. Celý systém sme navrhli tak, aby minimalizoval nepresnosti a uvádzal len relevantné zdroje. Využíva viacero špecializovaných modulov pre rôzne časti práce, ktoré boli vyvíjané tímom odborníkov s cieľom zjednodušiť a zrýchliť proces písania.',
  },
  {
    question: 'Čo je AI vedúci práce a AI kritik?',
    answer:
      'AI vedúci práce pomáha pri písaní akademickej práce od prvotných návrhov až po finálnu verziu. AI kritik identifikuje chyby, upozorní na nedostatky v texte a navrhne konkrétne opravy.',
  },
  {
    question: 'Čo je AI obhajoba?',
    answer:
      'AI obhajoba je nástroj, ktorý vám pomôže profesionálne pripraviť obhajobu. Na základe hotovej práce a posudkov vám spracuje prezentáciu, návrh obhajoby a poskytne odporúčania, ako všetko odprezentovať jasne a sebavedomo.',
  },
  {
    question: 'Ako funguje overenie zhody?',
    answer:
      'Po dokončení práce si môžete jednoducho overiť jej originalitu priamo v systéme. Stačí vložiť celý text a ZEDPERA analyzuje jeho zhodu. Overenie prebieha bezpečne a bez ukladania obsahu do verejných databáz.',
  },
  {
    question: 'Môžem použiť Zedperu len na vyhľadávanie zdrojov?',
    answer:
      'Áno, ak sa Vám nechce hľadať zdroje a čerpať z knižníc. V našej databáze nájdete množstvo najnovších článkov, kníh a publikácií.',
  },
  {
    question: 'V akých jazykoch môžem vytvoriť prácu?',
    answer:
      'Služba je trénovaná na viacero jazykov, takže môžete písať akademické práce v rôznych jazykových variantoch a prispôsobiť štýl aj odbornú úroveň podľa zvoleného jazyka.',
  },
  {
    question: 'Je používanie služby legálne?',
    answer:
      'Používanie umelej inteligencie pri písaní akademických prác nie je vo všeobecnosti zakázané, no školy kladú dôraz na transparentnosť. Odporúča sa preto uviesť využitie AI napríklad v metodológii alebo v prehlásení o použitých nástrojoch.',
  },
  {
    question: 'Môžem predplatné kedykoľvek zrušiť?',
    answer:
      'Áno. Predplatné nie je viazané a môžete ho kedykoľvek zrušiť. Ak ho nezrušíte, automaticky sa obnoví a platba bude účtovaná aj počas ďalšieho obdobia podľa aktuálne zvoleného programu.',
  },
];

const reviews = [
  {
    name: 'Študentka diplomovej práce',
    text: 'Zedperu používam niekoľko týždňov a fakt ma to s ňou baví. Školiteľka nechápe, ako je možné, že každý týždeň prídem na konzultáciu s novou kapitolou. Keď dá pripomienky, použijem AI vedúceho a obratom ich viem zapracovať. Sme iba v polovici, ale už z toho nemám strach.',
  },
  {
    name: 'Používateľ seminárnych prác',
    text: 'Chcem Vám poďakovať. Predplatil som si Zedperu a teraz viem pripraviť seminárku výrazne rýchlejšie. Nemusím strácať hodiny hľadaním zdrojov a parafrázovaním textov. Výstup si ešte upravím podľa seba, ale základ mám hotový veľmi rýchlo.',
  },
  {
    name: 'Študentka po skúsenosti s bežnou AI',
    text: 'Niekoľko týždňov som sa trápila s písaním práce pomocou bežných AI nástrojov. Zdroje boli nedohľadateľné, stále len všeobecné texty a nič konkrétne. Po vyplnení profilu v Zedpere som konečne videla relevantné zdroje a prvá kapitola vrátane úvodu bola hotová za pár minút.',
  },
  {
    name: 'Študent bakalárskej práce',
    text: 'Chcel som to len vyskúšať, lebo som nemal čas na písanie práce. Veľmi mi to uľahčilo život. Zdroje som našiel priamo v systéme a nemusel som behať po školskej knižnici. Práca bola hotová za pár dní a orientačná kontrola originality ukázala veľmi nízku zhodu.',
  },
  {
    name: 'Používateľ AI vedúceho',
    text: 'Veľkou výhodou je, že Zedpera si pamätá všetky informácie o mojej práci. Vedúci mi viackrát menil cieľ, ale stačilo ho zmeniť v profile a kapitoly som mal upravené v priebehu niekoľkých minút. Najviac mi pomohla funkcia AI vedúceho.',
  },
  {
    name: 'Externá študentka',
    text: 'Študujem externe druhú vysokú školu a popri práci a rodine je veľmi ťažké všetko stíhať. Zedperu mi odporučila spolužiačka. Konečne som mala seminárku hotovú za pár minút a nemusela som nad ňou stráviť celý víkend.',
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-700 lg:flex">
            <a href="#intro" className="transition hover:text-violet-700">
              Úvod
            </a>

            <a href="#features" className="transition hover:text-violet-700">
              Funkcie
            </a>

            <a href="#reviews" className="transition hover:text-violet-700">
              Recenzie
            </a>

            <a href="#pricing" className="transition hover:text-violet-700">
              Balíčky
            </a>

            <a href="#faq" className="transition hover:text-violet-700">
              Otázky
            </a>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/login"
              className="relative z-50 rounded-2xl px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
            >
              Prihlásiť sa
            </Link>

            <a
              href="#pricing"
              className="relative z-50 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-6 py-3 text-sm font-black text-white shadow-xl shadow-violet-900/20 transition hover:opacity-90"
            >
              Vybrať program
            </a>
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
                href="#intro"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                Úvod
              </a>

              <a
                href="#features"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                Funkcie
              </a>

              <a
                href="#reviews"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                Recenzie
              </a>

              <a
                href="#pricing"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                Balíčky
              </a>

              <a
                href="#faq"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                Otázky
              </a>

              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-left font-bold"
              >
                Prihlásiť sa
              </Link>

              <a
                href="#pricing"
                onClick={closeMobileMenu}
                className="block w-full rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-4 py-3 text-left font-black text-white"
              >
                Vybrať program
              </a>
            </div>
          </div>
        </div>
      )}

      <section id="intro" className="relative overflow-hidden bg-white">
        <div className="absolute left-1/2 top-0 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center lg:px-8 lg:py-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800">
            <Sparkles size={17} />
            Prvý akademický nástroj s AI vedúcim práce
          </div>

          <h1 className="mx-auto max-w-5xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 md:text-6xl">
            Prvý akademický nástroj na písanie prác, ktorý zvládne náročné
            praktické časti s AI vedúcim bez stresu a chaosu
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
            Vyskúšaj Zedperu, nástroj ktorý ťa prevedie celým procesom od
            prvého nápadu až po úspešnú obhajobu. AI vedúci práce ťa upozorní
            na chyby skôr, než ich uvidí školiteľ, je k dispozícii 24/7 a
            navrhne ti konkrétne opravy, ktoré posunú tvoju prácu na vyšší
            level.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-7 py-4 text-base font-black text-white shadow-2xl shadow-violet-900/25 transition hover:opacity-90"
            >
              Začni písať bez stresu už dnes
              <ArrowRight size={20} />
            </a>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-black text-slate-900 transition hover:bg-slate-50"
            >
              Otvoriť aplikáciu
            </Link>
          </div>

          <div className="mx-auto mt-14 max-w-5xl">
            <div className="mb-4 text-sm font-black uppercase tracking-[0.25em] text-slate-500">
              Video
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-2xl shadow-slate-300/60">
              <iframe
                className="h-[260px] w-full md:h-[460px]"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="Zedpera video"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto mb-12 max-w-4xl text-center">
            <div className="mb-4 text-sm font-black uppercase tracking-[0.25em] text-violet-700">
              Úvodný text
            </div>

            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Inteligentný nástroj novej generácie pre akademické písanie.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Predstavujeme vám inteligentný nástroj novej generácie, ktorý
              zásadne mení spôsob písania akademických prác. Zedpera ti pomáha
              premýšľať a zlepšovať tvoju prácu krok za krokom. Vďaka nej
              presne vieš, čo máš robiť ďalej bez zbytočného stresu alebo
              neistoty.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {fiveBlocks.map((item) => (
              <InfoPanel key={item.title} title={item.title} text={item.text} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-300 bg-white px-7 py-4 text-sm font-black text-violet-800 shadow-xl shadow-slate-200/70 transition hover:bg-violet-50"
            >
              Chcem vyskúšať Zedperu
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto mb-10 max-w-4xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Prečo nestačí bežná AI alebo LLM nástroj?
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Bežné AI nástroje často generujú všeobecné texty, môžu uvádzať
              nepresné zdroje a nepoznajú celý kontext práce. Zedpera funguje
              inak. Namiesto univerzálnych odpovedí dostaneš výstup, ktorý
              súvisí s tvojou prácou, zdrojmi a celým procesom písania.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ComparisonBox title="Bežná AI" items={badAiItems} negative />
            <ComparisonBox title="Zedpera" items={zedperaItems} />
          </div>

          <div className="mt-10 text-center">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-7 py-4 text-sm font-black text-white shadow-2xl shadow-violet-900/25 transition hover:opacity-90"
            >
              Chcem vyskúšať Zedperu
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <section id="reviews" className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-12 max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-black text-violet-200">
              <Star size={17} />
              Recenzie
            </div>

            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Skúsenosti študentov so Zedperou
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-300">
              Skúsenosti používateľov, ktorí využili Zedperu pri seminárnych,
              bakalárskych, diplomových, rigoróznych a ďalších akademických
              prácach.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {reviews.map((review, index) => (
              <ReviewCard
                key={`${review.name}-${index}`}
                name={review.name}
                text={review.text}
              />
            ))}
          </div>

          <div className="mt-12 rounded-[2rem] border border-violet-400/20 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-indigo-600/20 p-7 text-center">
            <h3 className="text-2xl font-black">
              Chceš si Zedperu vyskúšať aj ty?
            </h3>

            <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Vyber si program podľa rozsahu práce a začni pracovať s AI
              vedúcim, zdrojmi, citáciami, kontrolou kvality a prípravou na
              obhajobu.
            </p>

            <div className="mt-6">
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-950 shadow-xl transition hover:bg-violet-50"
              >
                Vybrať program
                <ArrowRight size={18} />
              </a>
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
              Balíčky a platobná brána
            </div>

            <h2 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              Vyber si program a prejdi na platbu
            </h2>

            <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
              Tu si klient vyberie program podľa rozsahu práce. Po kliknutí na
              tlačidlo bude presmerovaný na platobnú bránu.
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

      <section id="faq" className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-black tracking-tight text-slate-950">
              Často kladené otázky
            </h2>

            <p className="mt-3 text-lg leading-8 text-slate-600">
              Najčastejšie otázky k používaniu Zedpery, AI vedúcemu, obhajobe,
              zdrojom a predplatnému.
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <FaqRow
                key={`${item.question}-${index}`}
                item={item}
                open={openFaqIndex === index}
                onClick={() =>
                  setOpenFaqIndex(openFaqIndex === index ? null : index)
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] py-20">
        <div className="mx-auto max-w-5xl px-5 text-center lg:px-8">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            Prečo písať prácu so Zedperou
          </h2>

          <ul className="mx-auto mt-8 max-w-3xl space-y-3 text-left text-base leading-7 text-slate-700">
            <li>
              Ušetrí ti mnoho času, nemusíš hľadať najnovšie zdroje v
              knižniciach, v našej databáze nájdeš všetko, čo potrebuješ.
            </li>
            <li>
              Pozná tvoju tému, uvádza relevantné zdroje a vychádza z tvojich
              zdrojov.
            </li>
            <li>
              K dispozícií máš AI vedúceho a kritika zároveň, prevedú ťa celým
              procesom a sú k dispozícií 24/7.
            </li>
            <li>Zvládne aj praktickú časť vrátane výpočtov.</li>
            <li>Overí originalitu a zároveň ťa pripraví k obhajobe.</li>
          </ul>

          <div className="mt-8">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-300 bg-white px-7 py-4 text-sm font-black text-violet-800 shadow-xl shadow-slate-200/70 transition hover:bg-violet-50"
            >
              Chcem vyskúšať Zedperu
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-5 text-center lg:px-8">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            Je používanie Zedpery legálne?
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Áno, používanie Zedpery je úplne legálne a etické. Nekopíruješ
            texty umelej inteligencie, ale ty sám ich tvoríš. Prechádzaš
            jednotlivými kapitolami a Zedpera ti pomáha napísať celú prácu za
            minimum času. Stačí keď doplníš do čestného prehlásenia svojej
            práce, že pri niektorých častiach bola použitá umelá inteligencia.
          </p>

          <div className="mt-8">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-7 py-4 text-base font-black text-white shadow-2xl shadow-violet-900/25 transition hover:opacity-90"
            >
              Začni písať bez stresu už dnes
              <ArrowRight size={20} />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>
            <div>© 2026 Zedpera</div>
            <div className="mt-1">AI akademický asistent</div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/obchodne-podmienky"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Obchodné podmienky
            </Link>

            <Link
              href="/gdpr"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              GDPR
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-emerald-300 bg-white p-5 shadow-xl shadow-slate-200/70">
      <h3 className="text-base font-black text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-700">{text}</p>
    </div>
  );
}

function ComparisonBox({
  title,
  items,
  negative = false,
}: {
  title: string;
  items: string[];
  negative?: boolean;
}) {
  return (
    <div
      className={`rounded-[2rem] border p-6 shadow-xl ${
        negative
          ? 'border-slate-200 bg-white shadow-slate-200/60'
          : 'border-emerald-300 bg-emerald-50 shadow-emerald-100'
      }`}
    >
      <h3 className="mb-5 text-center text-2xl font-black text-slate-950">
        {title}
      </h3>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-7 text-slate-700">
            <span
              className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-black ${
                negative
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {negative ? '!' : '✓'}
            </span>

            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewCard({ name, text }: { name: string; text: string }) {
  return (
    <article className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
            <Quote size={22} />
          </div>

          <div>
            <h3 className="text-sm font-black text-white">{name}</h3>

            <div className="mt-1 flex items-center gap-1 text-amber-300">
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm leading-7 text-slate-300">{text}</p>
    </article>
  );
}

function FaqRow({
  item,
  open,
  onClick,
}: {
  item: FaqItem;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-base font-black text-slate-950 md:text-lg">
          {item.question}
        </span>

        <ChevronDown
          className={`h-5 w-5 shrink-0 text-violet-700 transition ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-6 pb-6 pt-1">
          <p className="text-sm leading-7 text-slate-600">{item.answer}</p>
        </div>
      )}
    </div>
  );
}