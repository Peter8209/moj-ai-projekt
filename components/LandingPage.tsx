'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cookie,
  Crown,
  FileText,
  HelpCircle,
  Languages,
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

type Translation = {
  meta: {
    documentLang: string;
  };
  nav: {
    features: string;
    comparison: string;
    pricing: string;
    reviews: string;
    faq: string;
  };
  common: {
    login: string;
    startFree: string;
    language: string;
    currentLanguage: string;
    switchLanguage: string;
    showAllPackages: string;
    safePayments: string;
    instantAccess: string;
    satisfactionGuarantee: string;
    cancelAnytime: string;
    securePlatform: string;
    rights: string;
    redirecting: string;
  };
  hero: {
    badge: string;
    title1: string;
    title2: string;
    title3: string;
    subtitle: string;
    primary: string;
    secondary: string;
    benefits: string[];
    stats: Array<[string, string]>;
  };
  preview: {
    logo: string;
    online: string;
    sidebar: string[];
    title: string;
    analyzed: string;
    statusLabel: string;
    active: string;
    recommendation: string;
    quality: string;
    ask: string;
    metrics: Array<[string, string]>;
  };
  features: {
    title: string;
    items: Array<{
      title: string;
      text: string;
    }>;
  };
  comparison: {
    title: string;
    subtitle: string;
    badTitle: string;
    goodTitle: string;
    badItems: string[];
    goodItems: string[];
  };
  process: {
    title: string;
    steps: Array<{
      step: string;
      title: string;
      text: string;
    }>;
  };
  about: {
    badge: string;
    title: string;
    highlighted: string;
    p1: string;
    p2: string;
    founderBadge: string;
    founderName: string;
    founderTitle: string;
    founderText: string;
    experience: string;
    students: string;
  };
  reviews: {
    title: string;
    items: Array<{
      text: string;
      name: string;
    }>;
  };
  pricing: {
    title: string;
    fullOfferText: string;
    fullOfferHint: string;
    emailPrompt: string;
    emailRequired: string;
    invalidPlan: string;
    checkoutFailed: string;
    noStripeUrl: string;
    plans: Plan[];
  };
  faq: {
    title: string;
    items: FaqItem[];
  };
  cta: {
    title: string;
    subtitle: string;
    button: string;
  };
  footer: {
    description: string;
    links: {
      blog: string;
      gdpr: string;
      terms: string;
      cookies: string;
    };
  };
};

const LANGUAGE_STORAGE_KEY = 'zedpera_language';

const MODERN_WOMAN_IMAGE_URL = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=2400&q=100&dpr=2';

const FOUNDER_MARTINA_IMAGE_URL = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1800&q=100&dpr=2';

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

const translations: Record<AppLanguage, Translation> = {
  sk: {
    meta: { documentLang: 'sk' },
    nav: {
      features: 'Funkcie',
      comparison: 'Porovnanie',
      pricing: 'Cenník',
      reviews: 'Recenzie',
      faq: 'FAQ',
    },
    common: {
      login: 'Prihlásiť sa',
      startFree: 'Začať so Zedperou',
      language: 'Jazyk stránky',
      currentLanguage: 'Aktuálne zvolený jazyk',
      switchLanguage: 'Prepnúť jazyk stránky',
      showAllPackages: 'Zobraziť všetky balíčky a možnosti',
      safePayments: 'Bezpečné platby',
      instantAccess: 'Okamžitý prístup',
      satisfactionGuarantee: 'Záruka spokojnosti',
      cancelAnytime: 'Možnosť zrušenia kedykoľvek',
      securePlatform: 'Bezpečná akademická AI platforma',
      rights: 'Všetky práva vyhradené.',
      redirecting: 'Presmerovávam...',
    },
    hero: {
      badge: 'Akademický asistent novej generácie',
      title1: 'Prvý AI vedúci práce,',
      title2: 'ktorý vás prevedie',
      title3: 'od zadania až po obhajobu',
      subtitle:
        'Zedpera spája AI písanie, odbornú spätnú väzbu, kontrolu kvality, zdroje, citácie, praktickú časť aj prípravu na obhajobu v jednom systéme.',
      primary: 'Začať',
      secondary: 'Pozrieť ukážku',
      benefits: [
        'AI vedúci 24/7',
        'Praktická časť vrátane výpočtov',
        'Citácie a zdroje',
        'Príprava na obhajobu',
      ],
      stats: [
        ['20', 'rokov skúseností'],
        ['1000+', 'študentov'],
        ['24/7', 'AI vedúci'],
        ['1', 'platforma pre celý proces'],
      ],
    },
    preview: {
      logo: 'Zedpera',
      online: 'Online 24/7',
      sidebar: [
        'Prehľad',
        'Projekt',
        'Kapitoly',
        'AI vedúci',
        'Zdroje',
        'Kontrola',
        'Obhajoba',
        'Nastavenia',
      ],
      title: 'AI vedúci práce',
      analyzed: 'Analyzoval som kapitolu 3. Tu sú moje odporúčania:',
      statusLabel: 'Stav',
      active: 'Aktívny',
      recommendation:
        'Kapitola 3 obsahuje metodologický problém v popise výskumného postupu. Navrhujem doplniť informácie o výskumnom nástroji a vzorke.',
      quality: 'Skóre kvality práce',
      ask: 'Opýtať sa AI vedúceho...',
      metrics: [
        ['92%', 'Kvalita zdrojov'],
        ['89/100', 'Kvalita textu'],
        ['85%', 'Pripravenosť na obhajobu'],
      ],
    },
    features: {
      title: 'Všetko, čo potrebujete na úspešnú prácu',
      items: [
        {
          title: 'AI vedúci práce',
          text: 'Kontroluje logiku, metodológiu a upozorňuje na slabé miesta.',
        },
        {
          title: 'AI kritik',
          text: 'Okamžitá spätná väzba a skóre kvality písomného výstupu.',
        },
        {
          title: 'AI písanie',
          text: 'Napíše kapitolu, pripraví osnovu, úvod, záver a akýkoľvek odborný text na základe požiadaviek.',
        },
        {
          title: 'Zdroje a citácie',
          text: 'Pomoc pri rešerši, citáciách a zozname literatúry.',
        },
        {
          title: 'Analýza dát',
          text: 'Príprava praktickej časti vrátane štatistík.',
        },
        {
          title: 'Obhajoba',
          text: 'Príprava prezentácie, otázok, odpovedí a reakcií na posudky.',
        },
      ],
    },
    comparison: {
      title: 'Prečo nestačí bežná AI alebo LLM nástroj?',
      subtitle:
        'Zedpera funguje inak. Namiesto univerzálnych odpovedí dostanete výstup, ktorý súvisí s vašou prácou, zdrojmi a celým procesom písania.',
      badTitle: 'Bežná AI',
      goodTitle: 'Zedpera',
      badItems: [
        'Píše všeobecné texty a omáčky.',
        'Nepamätá si tvoju prácu ani dôležité informácie.',
        'Vymýšľa si zdroje.',
        'Text je potrebné zdĺhavo upravovať.',
        'Nedokáže upozorniť na chyby.',
        'Nerozumie pripomienkam od školiteľa.',
        'Nepomôže s praktickou časťou.',
        'Nedokáže reagovať na posudky.',
      ],
      goodItems: [
        'Pozná tvoju prácu a celý kontext.',
        'Pamätá si históriu aj komunikáciu.',
        'Cituje presne podľa zvolenej normy a používa tvoje zdroje.',
        'Analyzuje prácu a upozorní na problémové časti.',
        'Spracúva kapitoly, praktickú časť aj výpočty.',
        'Dokáže pripraviť otázky, odpovede a obhajobu.',
        'Nahradí vedúceho práce a je k dispozícii 24/7.',
        'Pomôže s obhajobou na základe posudkov.',
      ],
    },
    process: {
      title: 'Ako funguje Zedpera?',
      steps: [
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
      ],
    },
    about: {
      badge: 'O nás',
      title: '20 rokov skúseností',
      highlighted: 'v jednom systéme',
      p1:
        'Za Zedperou stojí skúsený tím, ktorý už viac než 20 rokov pomáha pri tvorbe akademických prác.',
      p2:
        'Skúsenosti zo skutočnej praxe sme spojili s umelou inteligenciou, aby sme priniesli komplexnú podporu počas celého procesu písania.',
      founderBadge: '',
      founderName: 'Martina',
      founderTitle: '',
      founderText:
        'Zedpera nevznikla ako odpoveď na trend, ale ako reakcia na realitu, stres, časový tlak a pocit, že akademická práca je často skôr boj so systémom než proces učenia.',
      experience: '20+ rokov',
      students: '1000+ študentov',
    },
    reviews: {
      title: 'Skúsenosti študentov so Zedperou',
      items: [
        {
          text: 'AI vedúci mi pomohol pri pripomienkach od školiteľa a smeroval ma. Zedpera mi ušetrila neskutočne veľa času a stresu.',
          name: 'Študentka diplomovej práce',
        },
        {
          text: 'Zdroje som našiel priamo v systéme a práca bola hotová za pár dní. Veľmi mi pomohla praktická časť aj citácie.',
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
      ],
    },
    pricing: {
      title: 'Vyberte si program podľa rozsahu práce',
      fullOfferText: 'Zobraziť všetky balíčky a možnosti',
      fullOfferHint: 'Pozrite si kompletnú ponuku mesačných a ročných balíčkov.',
      emailPrompt: 'Zadajte e-mail, na ktorý bude naviazaná platba:',
      emailRequired: 'Pre pokračovanie na platbu je potrebný e-mail.',
      invalidPlan: 'Neplatný balík',
      checkoutFailed: 'Platbu sa nepodarilo vytvoriť.',
      noStripeUrl: 'Stripe nevygeneroval platobnú URL.',
      plans: [
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
      ],
    },
    faq: {
      title: 'Často kladené otázky',
      items: [
        {
          question: 'Je používanie Zedpery legálne?',
          answer:
            'Áno, používanie Zedpery je legálne. Systém slúži ako akademický asistent, ktorý pomáha s návrhom, štruktúrou, zdrojmi, kontrolou kvality a prípravou na obhajobu.',
        },
        {
          question: 'Zvládne ZEDPERA každý odbor?',
          answer:
            'Áno. ZEDPERA dokáže pracovať s akýmikoľvek materiálmi. Ak si chcete zjednodušiť prácu, môžete si stiahnuť zdroje z našej vedeckej databázy, ktorej súčasťou sú tisícky článkov, kníh, vedeckých publikácií a najnovších výskumov, alebo nahrať vlastné poznámky, súbory prípadne požiadavky školiteľa.',
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
          question: 'Čo je AI Vedúci práce a AI kritik?',
          answer:
            'AI vedúci práce je školiteľ, ktorý vám pomáha pri písaní akademickej práce od prvotných návrhov až po finálnu verziu. AI kritik dokáže identifikovať chyby, upozorniť na nedostatky v texte a zároveň navrhnúť ich konkrétne opravy. Slúžia ako podpora počas celého procesu písania a pomáhajú zlepšiť kvalitu vašej práce, aby bola prehľadná, logická a správne štylisticky spracovaná. Zároveň ich môžete využiť v prípade, že školiteľ s Vami nekomunikuje a chýba Vám spätná väzba.',
        },
      ],
    },
    cta: {
      title: 'Začni písať bez stresu už dnes',
      subtitle:
        'AI vedúci, zdroje, citácie, kontrola kvality, praktická časť aj obhajoba v jednom systéme.',
      button: 'Začať so Zedperou',
    },
    footer: {
      description:
        'AI vedúci, zdroje, citácie, kontrola kvality, praktická časť aj obhajoba v jednom akademickom systéme.',
      links: {
        blog: 'Blog',
        gdpr: 'GDPR',
        terms: 'Obchodné podmienky',
        cookies: 'Cookies',
      },
    },
  },

  cs: {
    meta: { documentLang: 'cs' },
    nav: {
      features: 'Funkce',
      comparison: 'Porovnání',
      pricing: 'Ceník',
      reviews: 'Recenze',
      faq: 'FAQ',
    },
    common: {
      login: 'Přihlásit se',
      startFree: 'Začít',
      language: 'Jazyk stránky',
      currentLanguage: 'Aktuálně zvolený jazyk',
      switchLanguage: 'Přepnout jazyk stránky',
      showAllPackages: 'Zobrazit všechny balíčky a možnosti',
      safePayments: 'Bezpečné platby',
      instantAccess: 'Okamžitý přístup',
      satisfactionGuarantee: 'Záruka spokojenosti',
      cancelAnytime: 'Možnost kdykoli zrušit',
      securePlatform: 'Bezpečná akademická AI platforma',
      rights: 'Všechna práva vyhrazena.',
      redirecting: 'Přesměrovávám...',
    },
    hero: {
      badge: 'Akademický asistent nové generace',
      title1: 'První AI vedoucí práce,',
      title2: 'který vás provede',
      title3: 'od zadání až po obhajobu',
      subtitle:
        'Zedpera spojuje AI psaní, odbornou zpětnou vazbu, kontrolu kvality, zdroje, citace, praktickou část i přípravu na obhajobu v jednom systému.',
      primary: 'Začít',
      secondary: 'Podívat se na ukázku',
      benefits: [
        'AI vedoucí 24/7',
        'Praktická část včetně výpočtů',
        'Citace a zdroje',
        'Příprava na obhajobu',
      ],
      stats: [
        ['20', 'let zkušeností'],
        ['1000+', 'studentů'],
        ['24/7', 'AI vedoucí'],
        ['1', 'platforma pro celý proces'],
      ],
    },
    preview: {
      logo: 'Zedpera',
      online: 'Online 24/7',
      sidebar: [
        'Přehled',
        'Projekt',
        'Kapitoly',
        'AI vedoucí',
        'Zdroje',
        'Kontrola',
        'Obhajoba',
        'Nastavení',
      ],
      title: 'AI vedoucí práce',
      analyzed: 'Analyzoval jsem kapitolu 3. Tady jsou moje doporučení:',
      statusLabel: 'Stav',
      active: 'Aktivní',
      recommendation:
        'Kapitola 3 obsahuje metodologický problém v popisu výzkumného postupu. Navrhuji doplnit informace o výzkumném nástroji a vzorku.',
      quality: 'Skóre kvality práce',
      ask: 'Zeptat se AI vedoucího...',
      metrics: [
        ['92%', 'Kvalita zdrojov'],
        ['89/100', 'Kvalita textu'],
        ['85%', 'Připravenost k obhajobě'],
      ],
    },
    features: {
      title: 'Vše, co potřebujete pro úspěšnou práci',
      items: [
        {
          title: 'AI vedoucí práce',
          text: 'Kontroluje logiku, metodologii a upozorňuje na slabá místa.',
        },
        {
          title: 'AI kritik',
          text: 'Okamžitá zpětná vazba a skóre kvality písemného výstupu.',
        },
        {
          title: 'AI psaní',
          text: 'Napíše kapitolu, připraví osnovu, úvod, závěr a jakýkoli odborný text podle požadavků.',
        },
        {
          title: 'Zdroje a citace',
          text: 'Pomoc s rešerší, citacemi a seznamem literatury.',
        },
        {
          title: 'Analýza dat',
          text: 'Příprava praktické části včetně statistik.',
        },
        {
          title: 'Obhajoba',
          text: 'Příprava prezentace, otázek, odpovědí a reakcí na posudky.',
        },
      ],
    },
    comparison: {
      title: 'Proč nestačí běžná AI nebo LLM nástroj?',
      subtitle:
        'Zedpera funguje jinak. Namísto univerzálních odpovědí dostanete výstup, který souvisí s vaší prací, zdroji a celým procesem psaní.',
      badTitle: 'Běžná AI',
      goodTitle: 'Zedpera',
      badItems: [
        'Píše obecné texty a omáčky.',
        'Nepamatuje si vaši práci ani důležité informace.',
        'Vymýšlí si zdroje.',
        'Text je nutné zdlouhavě upravovat.',
        'Nedokáže upozornit na chyby.',
        'Nerozumí připomínkám od školitele.',
        'Nepomůže s praktickou částí.',
        'Nedokáže reagovat na posudky.',
      ],
      goodItems: [
        'Zná vaši práci a celý kontext.',
        'Pamatuje si historii i komunikaci.',
        'Cituje podle zvolené normy a používá vaše zdroje.',
        'Analyzuje práci a upozorňuje na problémové části.',
        'Zpracuje kapitoly, praktickou část i výpočty.',
        'Dokáže připravit otázky, odpovědi a obhajobu.',
        'Nahradí vedoucího práce a je k dispozici 24/7.',
        'Pomůže s obhajobou podle posudků.',
      ],
    },
    process: {
      title: 'Jak funguje Zedpera?',
      steps: [
        {
          step: '01',
          title: 'Vytvoříte projekt',
          text: 'Zadáte téma, typ práce, školu, požadavky a cíle.',
        },
        {
          step: '02',
          title: 'AI vedoucí vás vede',
          text: 'Pomáhá s osnovou, textem a upozorňuje na chyby.',
        },
        {
          step: '03',
          title: 'Dokončíte a obhájíte',
          text: 'Zkontrolujete kvalitu, originalitu, zdroje a metodiku a připravíte se na obhajobu.',
        },
      ],
    },
    about: {
      badge: 'O nás',
      title: '20 let zkušeností',
      highlighted: 'v jednom systému',
      p1:
        'Za Zedperou stojí zkušený tým, který už více než 20 let pomáhá při tvorbě akademických prací.',
      p2:
        'Zkušenosti ze skutečné praxe jsme spojili s umělou inteligencí, abychom přinesli komplexní podporu během celého procesu psaní.',
      founderBadge: '',
      founderName: 'Martina',
      founderTitle: '',
      founderText:
        'Zedpera nevznikla jako odpověď na trend, ale jako reakce na realitu, stres, časový tlak a pocit, že akademická práce je často spíše boj se systémem než proces učení.',
      experience: '20+ let',
      students: '1000+ studentů',
    },
    reviews: {
      title: 'Zkušenosti studentů se Zedperou',
      items: [
        {
          text: 'AI vedoucí mi pomohl s připomínkami od školitele a nasměroval mě. Zedpera mi ušetřila spoustu času a stresu.',
          name: 'Studentka diplomové práce',
        },
        {
          text: 'Zdroje jsem našel přímo v systému a práce byla hotová za pár dní. Velmi mi pomohla praktická část i citace.',
          name: 'Student bakalářské práce',
        },
        {
          text: 'Běžná AI mi dávala jen obecné texty. Zedpera mi po vyplnění profilu vygenerovala relevantní kapitoly za pár minut.',
          name: 'Studentka po zkušenosti s AI',
        },
        {
          text: 'Studuji externě při práci a rodině. Díky Zedpeře vše stíhám. Seminárky mám rychle hotové.',
          name: 'Externí studentka',
        },
      ],
    },
    pricing: {
      title: 'Vyberte si program podle rozsahu práce',
      fullOfferText: 'Zobrazit všechny balíčky a možnosti',
      fullOfferHint: 'Podívejte se na kompletní nabídku měsíčních a ročních balíčků.',
      emailPrompt: 'Zadejte e-mail, ke kterému bude navázána platba:',
      emailRequired: 'Pro pokračování k platbě je potřeba e-mail.',
      invalidPlan: 'Neplatný balíček',
      checkoutFailed: 'Platbu se nepodařilo vytvořit.',
      noStripeUrl: 'Stripe nevygeneroval platební URL.',
      plans: [
        {
          id: 'week-mini',
          label: 'MINI',
          name: 'Na menší úpravy',
          price: '13,20 €',
          period: '7 dní',
          description:
            'Vhodné na seminární práci, jednu kapitolu nebo rychlou úpravu.',
          button: 'Koupit MINI',
        },
        {
          id: 'week-student',
          label: 'STUDENT',
          name: 'Na větší kapitolu',
          price: '26,50 €',
          period: '7 dní',
          description:
            'Vhodné na seminárku, ročníkovou práci nebo rozsáhlejší kapitolu.',
          button: 'Koupit STUDENT',
          highlighted: true,
        },
        {
          id: 'week-pro',
          label: 'PRO',
          name: 'Intenzivní práce',
          price: '39,90 €',
          period: '7 dní',
          description:
            'Pro intenzivní práci těsně před odevzdáním nebo před obhajobou.',
          button: 'Koupit PRO',
        },
      ],
    },
    faq: {
      title: 'Často kladené otázky',
      items: [
        {
          question: 'Je používání Zedpery legální?',
          answer:
            'Ano, používání Zedpery je legální. Systém slouží jako akademický asistent, který pomáhá s návrhem, strukturou, zdroji, kontrolou kvality a přípravou na obhajobu.',
        },
        {
          question: 'Zvládne ZEDPERA každý obor?',
          answer:
            'Ano. ZEDPERA dokáže pracovat s jakýmikoli materiály. Pro zjednodušení práce můžete využít zdroje z vědecké databáze nebo nahrát vlastní poznámky, soubory a požadavky školitele.',
        },
        {
          question: 'Mohu službu použít na více prací?',
          answer:
            'Ano. Podle zvoleného balíčku můžete pracovat s jednou nebo více pracemi, ukládat historii, upravovat profil a pokračovat v dalších výstupech.',
        },
        {
          question: 'Jaký je rozdíl mezi ChatGPT, Gemini a Zedperou?',
          answer:
            'Zedpera je přizpůsobena akademickému psaní. Pracuje s profilem práce, strukturou, zdroji, citacemi, auditem kvality a obhajobou.',
        },
        {
          question: 'V jakých jazycích mohu vytvořit práci?',
          answer:
            'Systém podporuje více jazyků a umožňuje přizpůsobit styl, odbornost a výstup podle požadavků práce.',
        },
        {
          question: 'Co je AI vedoucí práce a AI kritik?',
          answer:
            'AI vedoucí práce pomáhá při psaní akademické práce od prvních návrhů až po finální verzi. AI kritik identifikuje chyby, upozorní na nedostatky a navrhne konkrétní opravy.',
        },
      ],
    },
    cta: {
      title: 'Začněte psát bez stresu už dnes',
      subtitle:
        'AI vedoucí, zdroje, citace, kontrola kvality, praktická část i obhajoba v jednom systému.',
      button: 'Začít se Zedperou',
    },
    footer: {
      description:
        'AI vedoucí, zdroje, citace, kontrola kvality, praktická část i obhajoba v jednom akademickém systému.',
      links: {
        blog: 'Blog',
        gdpr: 'GDPR',
        terms: 'Obchodní podmínky',
        cookies: 'Cookies',
      },
    },
  },

  en: {
    meta: { documentLang: 'en' },
    nav: {
      features: 'Features',
      comparison: 'Comparison',
      pricing: 'Pricing',
      reviews: 'Reviews',
      faq: 'FAQ',
    },
    common: {
      login: 'Log in',
      startFree: 'Start',
      language: 'Page language',
      currentLanguage: 'Current language',
      switchLanguage: 'Switch page language',
      showAllPackages: 'Show all packages and options',
      safePayments: 'Secure payments',
      instantAccess: 'Instant access',
      satisfactionGuarantee: 'Satisfaction guarantee',
      cancelAnytime: 'Cancel anytime',
      securePlatform: 'Secure academic AI platform',
      rights: 'All rights reserved.',
      redirecting: 'Redirecting...',
    },
    hero: {
      badge: 'Next-generation academic assistant',
      title1: 'The first AI thesis supervisor,',
      title2: 'guiding you',
      title3: 'from assignment to defense',
      subtitle:
        'Zedpera combines AI writing, expert feedback, quality checks, sources, citations, practical work and defense preparation in one system.',
      primary: 'Start',
      secondary: 'See demo',
      benefits: [
        'AI supervisor 24/7',
        'Practical part including calculations',
        'Citations and sources',
        'Defense preparation',
      ],
      stats: [
        ['20', 'years of experience'],
        ['1000+', 'students'],
        ['24/7', 'AI supervisor'],
        ['1', 'platform for the whole process'],
      ],
    },
    preview: {
      logo: 'Zedpera',
      online: 'Online 24/7',
      sidebar: [
        'Overview',
        'Project',
        'Chapters',
        'AI supervisor',
        'Sources',
        'Check',
        'Defense',
        'Settings',
      ],
      title: 'AI thesis supervisor',
      analyzed: 'I analyzed chapter 3. Here are my recommendations:',
      statusLabel: 'Status',
      active: 'Active',
      recommendation:
        'Chapter 3 contains a methodological issue in the description of the research process. I recommend adding information about the research instrument and sample.',
      quality: 'Work quality score',
      ask: 'Ask the AI supervisor...',
      metrics: [
        ['92%', 'Source quality'],
        ['89/100', 'Text quality'],
        ['85%', 'Defense readiness'],
      ],
    },
    features: {
      title: 'Everything you need for a successful thesis',
      items: [
        {
          title: 'AI thesis supervisor',
          text: 'Checks logic, methodology and highlights weak spots.',
        },
        {
          title: 'AI critic',
          text: 'Instant feedback and quality score for your written output.',
        },
        {
          title: 'AI writing',
          text: 'Writes chapters, prepares outlines, introductions, conclusions and any academic text based on requirements.',
        },
        {
          title: 'Sources and citations',
          text: 'Helps with research, citations and bibliography.',
        },
        {
          title: 'Data analysis',
          text: 'Preparation of the practical part including statistics.',
        },
        {
          title: 'Defense',
          text: 'Prepares presentation, questions, answers and reactions to reviews.',
        },
      ],
    },
    comparison: {
      title: 'Why ordinary AI or an LLM tool is not enough?',
      subtitle:
        'Zedpera works differently. Instead of generic answers, you get output connected to your work, sources and the entire writing process.',
      badTitle: 'Generic AI',
      goodTitle: 'Zedpera',
      badItems: [
        'Writes generic text.',
        'Does not remember your work or key information.',
        'Invents sources.',
        'Text needs lengthy editing.',
        'Cannot reliably point out mistakes.',
        'Does not understand supervisor feedback.',
        'Does not help with the practical part.',
        'Cannot react to reviews.',
      ],
      goodItems: [
        'Knows your work and full context.',
        'Remembers history and communication.',
        'Cites according to your selected standard and uses your sources.',
        'Analyzes the work and flags problem areas.',
        'Processes chapters, practical parts and calculations.',
        'Can prepare questions, answers and defense.',
        'Replaces the thesis supervisor and is available 24/7.',
        'Helps with defense based on reviews.',
      ],
    },
    process: {
      title: 'How Zedpera works',
      steps: [
        {
          step: '01',
          title: 'Create a project',
          text: 'Enter the topic, type of work, school, requirements and goals.',
        },
        {
          step: '02',
          title: 'AI supervisor guides you',
          text: 'Helps with the outline, text and warns you about mistakes.',
        },
        {
          step: '03',
          title: 'Finish and defend',
          text: 'Check quality, originality, sources and methodology and prepare for defense.',
        },
      ],
    },
    about: {
      badge: 'About us',
      title: '20 years of experience',
      highlighted: 'in one system',
      p1:
        'Behind Zedpera is an experienced team that has helped with academic writing for more than 20 years.',
      p2:
        'We combined real-world experience with artificial intelligence to provide comprehensive support throughout the writing process.',
      founderBadge: '',
      founderName: 'Martina',
      founderTitle: '',
      founderText:
        'Zedpera was not created as a response to a trend, but as a reaction to reality, stress, time pressure and the feeling that academic work is often more of a fight with the system than a learning process.',
      experience: '20+ years',
      students: '1000+ students',
    },
    reviews: {
      title: 'Students’ experience with Zedpera',
      items: [
        {
          text: 'The AI supervisor helped me with my supervisor’s comments and gave me direction. Zedpera saved me a lot of time and stress.',
          name: 'Master thesis student',
        },
        {
          text: 'I found sources directly in the system and finished the work in a few days. The practical part and citations helped me a lot.',
          name: 'Bachelor thesis student',
        },
        {
          text: 'Generic AI gave me only broad texts. After filling in the profile, Zedpera generated relevant chapters in minutes.',
          name: 'Student after trying AI',
        },
        {
          text: 'I study externally while working and taking care of family. Thanks to Zedpera, I can keep up.',
          name: 'External student',
        },
      ],
    },
    pricing: {
      title: 'Choose a program by work scope',
      fullOfferText: 'Show all packages and options',
      fullOfferHint: 'See the complete offer of monthly and yearly packages.',
      emailPrompt: 'Enter the email address linked to the payment:',
      emailRequired: 'An email is required to continue to payment.',
      invalidPlan: 'Invalid package',
      checkoutFailed: 'Payment could not be created.',
      noStripeUrl: 'Stripe did not generate a payment URL.',
      plans: [
        {
          id: 'week-mini',
          label: 'MINI',
          name: 'For smaller edits',
          price: '13.20 €',
          period: '7 days',
          description:
            'Suitable for a seminar paper, one chapter or a quick edit.',
          button: 'Buy MINI',
        },
        {
          id: 'week-student',
          label: 'STUDENT',
          name: 'For a larger chapter',
          price: '26.50 €',
          period: '7 days',
          description:
            'Suitable for a seminar paper, yearly paper or a larger chapter.',
          button: 'Buy STUDENT',
          highlighted: true,
        },
        {
          id: 'week-pro',
          label: 'PRO',
          name: 'Intensive work',
          price: '39.90 €',
          period: '7 days',
          description:
            'For intensive work shortly before submission or defense.',
          button: 'Buy PRO',
        },
      ],
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          question: 'Is using Zedpera legal?',
          answer:
            'Yes, using Zedpera is legal. The system is an academic assistant helping with structure, sources, quality checks and defense preparation.',
        },
        {
          question: 'Can ZEDPERA handle every field?',
          answer:
            'Yes. ZEDPERA can work with different materials. You can use sources from the scientific database or upload your own notes, files and supervisor requirements.',
        },
        {
          question: 'Can I use it for multiple works?',
          answer:
            'Yes. Depending on the package, you can work with one or more projects, save history, edit profiles and continue with outputs.',
        },
        {
          question: 'What is the difference between ChatGPT, Gemini and Zedpera?',
          answer:
            'Zedpera is adapted to academic writing. It works with work profiles, structure, sources, citations, quality audits and defense.',
        },
        {
          question: 'In which languages can I create my work?',
          answer:
            'The system supports multiple languages and lets you adjust style, expertise and outputs according to the work requirements.',
        },
        {
          question: 'What are the AI thesis supervisor and AI critic?',
          answer:
            'The AI thesis supervisor helps with academic writing from the first drafts to the final version. The AI critic identifies mistakes, points out weaknesses and suggests specific improvements.',
        },
      ],
    },
    cta: {
      title: 'Start writing without stress today',
      subtitle:
        'AI supervisor, sources, citations, quality checks, practical part and defense in one system.',
      button: 'Start with Zedpera',
    },
    footer: {
      description:
        'AI supervisor, sources, citations, quality checks, practical part and defense in one academic system.',
      links: {
        blog: 'Blog',
        gdpr: 'GDPR',
        terms: 'Terms and conditions',
        cookies: 'Cookies',
      },
    },
  },

  de: {
    meta: { documentLang: 'de' },
    nav: {
      features: 'Funktionen',
      comparison: 'Vergleich',
      pricing: 'Preise',
      reviews: 'Bewertungen',
      faq: 'FAQ',
    },
    common: {
      login: 'Einloggen',
      startFree: 'Starten',
      language: 'Seitensprache',
      currentLanguage: 'Aktuelle Sprache',
      switchLanguage: 'Seitensprache wechseln',
      showAllPackages: 'Alle Pakete und Optionen anzeigen',
      safePayments: 'Sichere Zahlungen',
      instantAccess: 'Sofortiger Zugriff',
      satisfactionGuarantee: 'Zufriedenheitsgarantie',
      cancelAnytime: 'Jederzeit kündbar',
      securePlatform: 'Sichere akademische KI-Plattform',
      rights: 'Alle Rechte vorbehalten.',
      redirecting: 'Weiterleitung...',
    },
    hero: {
      badge: 'Akademischer Assistent der neuen Generation',
      title1: 'Der erste KI-Betreuer,',
      title2: 'der Sie begleitet',
      title3: 'von der Aufgabenstellung bis zur Verteidigung',
      subtitle:
        'Zedpera verbindet KI-Schreiben, fachliches Feedback, Qualitätskontrolle, Quellen, Zitationen, praktische Teile und Verteidigungsvorbereitung in einem System.',
      primary: 'Starten',
      secondary: 'Demo ansehen',
      benefits: [
        'KI-Betreuer 24/7',
        'Praktischer Teil inklusive Berechnungen',
        'Zitationen und Quellen',
        'Vorbereitung auf die Verteidigung',
      ],
      stats: [
        ['20', 'Jahre Erfahrung'],
        ['1000+', 'Studierende'],
        ['24/7', 'KI-Betreuer'],
        ['1', 'Plattform für den gesamten Prozess'],
      ],
    },
    preview: {
      logo: 'Zedpera',
      online: 'Online 24/7',
      sidebar: [
        'Übersicht',
        'Projekt',
        'Kapitel',
        'KI-Betreuer',
        'Quellen',
        'Kontrolle',
        'Verteidigung',
        'Einstellungen',
      ],
      title: 'KI-Betreuer der Arbeit',
      analyzed: 'Ich habe Kapitel 3 analysiert. Hier sind meine Empfehlungen:',
      statusLabel: 'Status',
      active: 'Aktiv',
      recommendation:
        'Kapitel 3 enthält ein methodisches Problem in der Beschreibung des Forschungsprozesses. Ich empfehle, Informationen zum Forschungsinstrument und zur Stichprobe zu ergänzen.',
      quality: 'Qualitätspunktzahl',
      ask: 'KI-Betreuer fragen...',
      metrics: [
        ['92%', 'Quellenqualität'],
        ['89/100', 'Textqualität'],
        ['85%', 'Verteidigungsreife'],
      ],
    },
    features: {
      title: 'Alles, was Sie für eine erfolgreiche Arbeit brauchen',
      items: [
        {
          title: 'KI-Betreuer',
          text: 'Prüft Logik, Methodik und weist auf Schwachstellen hin.',
        },
        {
          title: 'KI-Kritiker',
          text: 'Sofortiges Feedback und Qualitätsbewertung des Textes.',
        },
        {
          title: 'KI-Schreiben',
          text: 'Schreibt Kapitel, erstellt Gliederungen, Einleitungen, Fazits und fachliche Texte nach Anforderungen.',
        },
        {
          title: 'Quellen und Zitate',
          text: 'Hilfe bei Recherche, Zitaten und Literaturverzeichnis.',
        },
        {
          title: 'Datenanalyse',
          text: 'Vorbereitung des praktischen Teils einschließlich Statistiken.',
        },
        {
          title: 'Verteidigung',
          text: 'Vorbereitung von Präsentation, Fragen, Antworten und Reaktionen auf Gutachten.',
        },
      ],
    },
    comparison: {
      title: 'Warum reicht normale KI oder ein LLM-Tool nicht aus?',
      subtitle:
        'Zedpera funktioniert anders. Statt allgemeiner Antworten erhalten Sie Ergebnisse, die mit Ihrer Arbeit, Ihren Quellen und dem gesamten Schreibprozess verbunden sind.',
      badTitle: 'Normale KI',
      goodTitle: 'Zedpera',
      badItems: [
        'Schreibt allgemeine Texte.',
        'Merkt sich Ihre Arbeit und wichtige Informationen nicht.',
        'Erfindet Quellen.',
        'Texte müssen lange bearbeitet werden.',
        'Kann Fehler nicht zuverlässig anzeigen.',
        'Versteht Kommentare des Betreuers nicht.',
        'Hilft nicht beim praktischen Teil.',
        'Kann nicht auf Gutachten reagieren.',
      ],
      goodItems: [
        'Kennt Ihre Arbeit und den gesamten Kontext.',
        'Merkt sich Verlauf und Kommunikation.',
        'Zitiert nach gewähltem Standard und nutzt Ihre Quellen.',
        'Analysiert die Arbeit und markiert Problemstellen.',
        'Bearbeitet Kapitel, praktische Teile und Berechnungen.',
        'Bereitet Fragen, Antworten und Verteidigung vor.',
        'Ersetzt den Betreuer und ist 24/7 verfügbar.',
        'Hilft bei der Verteidigung anhand von Gutachten.',
      ],
    },
    process: {
      title: 'Wie Zedpera funktioniert',
      steps: [
        {
          step: '01',
          title: 'Projekt erstellen',
          text: 'Thema, Arbeitstyp, Schule, Anforderungen und Ziele eingeben.',
        },
        {
          step: '02',
          title: 'KI-Betreuer führt Sie',
          text: 'Hilft mit Gliederung, Text und weist auf Fehler hin.',
        },
        {
          step: '03',
          title: 'Fertigstellen und verteidigen',
          text: 'Qualität, Quellen und Methodik prüfen und Verteidigung vorbereiten.',
        },
      ],
    },
    about: {
      badge: 'Über uns',
      title: '20 Jahre Erfahrung',
      highlighted: 'in einem System',
      p1:
        'Hinter Zedpera steht ein erfahrenes Team, das seit mehr als 20 Jahren bei akademischen Arbeiten hilft.',
      p2:
        'Wir haben praktische Erfahrung mit künstlicher Intelligenz verbunden, um umfassende Unterstützung im gesamten Schreibprozess zu bieten.',
      founderBadge: '',
      founderName: 'Martina',
      founderTitle: '',
      founderText:
        'Zedpera entstand nicht als Antwort auf einen Trend, sondern als Reaktion auf Realität, Stress, Zeitdruck und das Gefühl, dass akademische Arbeit oft eher ein Kampf mit dem System als ein Lernprozess ist.',
      experience: '20+ Jahre',
      students: '1000+ Studierende',
    },
    reviews: {
      title: 'Erfahrungen von Studierenden mit Zedpera',
      items: [
        {
          text: 'Der KI-Betreuer half mir mit Kommentaren meines Betreuers und gab mir Richtung. Zedpera sparte mir viel Zeit und Stress.',
          name: 'Masterstudentin',
        },
        {
          text: 'Ich fand Quellen direkt im System und die Arbeit war in wenigen Tagen fertig. Der praktische Teil und die Zitate halfen mir sehr.',
          name: 'Bachelorstudent',
        },
        {
          text: 'Normale KI gab mir nur allgemeine Texte. Nach dem Profil erstellte Zedpera relevante Kapitel in Minuten.',
          name: 'Studentin nach KI-Erfahrung',
        },
        {
          text: 'Ich studiere extern neben Arbeit und Familie. Dank Zedpera schaffe ich alles.',
          name: 'Externe Studentin',
        },
      ],
    },
    pricing: {
      title: 'Wählen Sie ein Programm nach Umfang der Arbeit',
      fullOfferText: 'Alle Pakete und Optionen anzeigen',
      fullOfferHint: 'Sehen Sie das komplette Angebot monatlicher und jährlicher Pakete.',
      emailPrompt: 'Geben Sie die E-Mail-Adresse für die Zahlung ein:',
      emailRequired: 'Für die Zahlung ist eine E-Mail-Adresse erforderlich.',
      invalidPlan: 'Ungültiges Paket',
      checkoutFailed: 'Zahlung konnte nicht erstellt werden.',
      noStripeUrl: 'Stripe hat keine Zahlungs-URL generiert.',
      plans: [
        {
          id: 'week-mini',
          label: 'MINI',
          name: 'Für kleinere Korrekturen',
          price: '13,20 €',
          period: '7 Tage',
          description:
            'Geeignet für Seminararbeit, ein Kapitel oder schnelle Bearbeitung.',
          button: 'MINI kaufen',
        },
        {
          id: 'week-student',
          label: 'STUDENT',
          name: 'Für ein größeres Kapitel',
          price: '26,50 €',
          period: '7 Tage',
          description:
            'Geeignet für Seminararbeit, Jahresarbeit oder umfangreicheres Kapitel.',
          button: 'STUDENT kaufen',
          highlighted: true,
        },
        {
          id: 'week-pro',
          label: 'PRO',
          name: 'Intensive Arbeit',
          price: '39,90 €',
          period: '7 Tage',
          description:
            'Für intensive Arbeit kurz vor Abgabe oder Verteidigung.',
          button: 'PRO kaufen',
        },
      ],
    },
    faq: {
      title: 'Häufige Fragen',
      items: [
        {
          question: 'Ist die Nutzung von Zedpera legal?',
          answer:
            'Ja, die Nutzung von Zedpera ist legal. Das System dient als akademischer Assistent und hilft mit Struktur, Quellen, Qualitätskontrolle und Verteidigungsvorbereitung.',
        },
        {
          question: 'Kann ZEDPERA jedes Fachgebiet bearbeiten?',
          answer:
            'Ja. ZEDPERA kann mit unterschiedlichen Materialien arbeiten. Sie können Quellen aus der wissenschaftlichen Datenbank nutzen oder eigene Notizen, Dateien und Anforderungen des Betreuers hochladen.',
        },
        {
          question: 'Kann ich den Dienst für mehrere Arbeiten nutzen?',
          answer:
            'Ja. Je nach Paket können Sie mit einem oder mehreren Projekten arbeiten, Verlauf speichern, Profile bearbeiten und Ausgaben fortsetzen.',
        },
        {
          question: 'Was ist der Unterschied zwischen ChatGPT, Gemini und Zedpera?',
          answer:
            'Zedpera ist auf akademisches Schreiben angepasst und arbeitet mit Profilen, Struktur, Quellen, Zitaten, Qualitätsaudit und Verteidigung.',
        },
        {
          question: 'In welchen Sprachen kann ich meine Arbeit erstellen?',
          answer:
            'Das System unterstützt mehrere Sprachen und passt Stil, Fachlichkeit und Ausgabe an die Anforderungen an.',
        },
        {
          question: 'Was sind der KI-Betreuer und der KI-Kritiker?',
          answer:
            'Der KI-Betreuer unterstützt beim Schreiben von den ersten Entwürfen bis zur finalen Version. Der KI-Kritiker erkennt Fehler, weist auf Schwächen hin und schlägt konkrete Verbesserungen vor.',
        },
      ],
    },
    cta: {
      title: 'Beginnen Sie heute stressfrei zu schreiben',
      subtitle:
        'KI-Betreuer, Quellen, Zitate, Qualitätskontrolle, praktischer Teil und Verteidigung in einem System.',
      button: 'Mit Zedpera starten',
    },
    footer: {
      description:
        'KI-Betreuer, Quellen, Zitate, Qualitätskontrolle, praktischer Teil und Verteidigung in einem akademischen System.',
      links: {
        blog: 'Blog',
        gdpr: 'DSGVO',
        terms: 'Geschäftsbedingungen',
        cookies: 'Cookies',
      },
    },
  },

  pl: {
    meta: { documentLang: 'pl' },
    nav: {
      features: 'Funkcje',
      comparison: 'Porównanie',
      pricing: 'Cennik',
      reviews: 'Opinie',
      faq: 'FAQ',
    },
    common: {
      login: 'Zaloguj się',
      startFree: 'Zacznij',
      language: 'Język strony',
      currentLanguage: 'Aktualnie wybrany język',
      switchLanguage: 'Zmień język strony',
      showAllPackages: 'Pokaż wszystkie pakiety i opcje',
      safePayments: 'Bezpieczne płatności',
      instantAccess: 'Natychmiastowy dostęp',
      satisfactionGuarantee: 'Gwarancja satysfakcji',
      cancelAnytime: 'Możliwość anulowania w każdej chwili',
      securePlatform: 'Bezpieczna akademicka platforma AI',
      rights: 'Wszelkie prawa zastrzeżone.',
      redirecting: 'Przekierowanie...',
    },
    hero: {
      badge: 'Akademicki asystent nowej generacji',
      title1: 'Pierwszy opiekun pracy AI,',
      title2: 'który przeprowadzi Cię',
      title3: 'od tematu aż po obronę',
      subtitle:
        'Zedpera łączy pisanie AI, ekspercką informację zwrotną, kontrolę jakości, źródła, cytowania, część praktyczną i przygotowanie do obrony w jednym systemie.',
      primary: 'Zacznij',
      secondary: 'Zobacz demo',
      benefits: [
        'Opiekun AI 24/7',
        'Część praktyczna z obliczeniami',
        'Cytowania i źródła',
        'Przygotowanie do obrony',
      ],
      stats: [
        ['20', 'lat doświadczenia'],
        ['1000+', 'studentów'],
        ['24/7', 'opiekun AI'],
        ['1', 'platforma dla całego procesu'],
      ],
    },
    preview: {
      logo: 'Zedpera',
      online: 'Online 24/7',
      sidebar: [
        'Przegląd',
        'Projekt',
        'Rozdziały',
        'Opiekun AI',
        'Źródła',
        'Kontrola',
        'Obrona',
        'Ustawienia',
      ],
      title: 'Opiekun pracy AI',
      analyzed: 'Przeanalizowałem rozdział 3. Oto moje rekomendacje:',
      statusLabel: 'Status',
      active: 'Aktywny',
      recommendation:
        'Rozdział 3 zawiera problem metodologiczny w opisie procedury badawczej. Zalecam uzupełnienie informacji o narzędziu badawczym i próbie.',
      quality: 'Wynik jakości pracy',
      ask: 'Zapytaj opiekuna AI...',
      metrics: [
        ['92%', 'Jakość źródeł'],
        ['89/100', 'Jakość tekstu'],
        ['85%', 'Gotowość do obrony'],
      ],
    },
    features: {
      title: 'Wszystko, czego potrzebujesz do udanej pracy',
      items: [
        {
          title: 'Opiekun pracy AI',
          text: 'Sprawdza logikę, metodologię i wskazuje słabe miejsca.',
        },
        {
          title: 'Krytyk AI',
          text: 'Natychmiastowa informacja zwrotna i ocena jakości tekstu.',
        },
        {
          title: 'Pisanie AI',
          text: 'Pisze rozdziały, przygotowuje konspekt, wstęp, zakończenie i dowolny tekst naukowy zgodnie z wymaganiami.',
        },
        {
          title: 'Źródła i cytowania',
          text: 'Pomoc w researchu, cytowaniach i bibliografii.',
        },
        {
          title: 'Analiza danych',
          text: 'Przygotowanie części praktycznej wraz ze statystykami.',
        },
        {
          title: 'Obrona',
          text: 'Przygotowanie prezentacji, pytań, odpowiedzi i reakcji na recenzje.',
        },
      ],
    },
    comparison: {
      title: 'Dlaczego zwykła AI lub narzędzie LLM nie wystarczy?',
      subtitle:
        'Zedpera działa inaczej. Zamiast ogólnych odpowiedzi otrzymujesz wynik związany z Twoją pracą, źródłami i całym procesem pisania.',
      badTitle: 'Zwykła AI',
      goodTitle: 'Zedpera',
      badItems: [
        'Pisze ogólne teksty.',
        'Nie pamięta Twojej pracy ani ważnych informacji.',
        'Wymyśla źródła.',
        'Tekst trzeba długo poprawiać.',
        'Nie potrafi dobrze wskazać błędów.',
        'Nie rozumie uwag promotora.',
        'Nie pomaga w części praktycznej.',
        'Nie reaguje na recenzje.',
      ],
      goodItems: [
        'Zna Twoją pracę i cały kontekst.',
        'Pamięta historię i komunikację.',
        'Cytuje według wybranej normy i korzysta z Twoich źródeł.',
        'Analizuje pracę i wskazuje problemy.',
        'Opracowuje rozdziały, część praktyczną i obliczenia.',
        'Przygotowuje pytania, odpowiedzi i obronę.',
        'Zastępuje promotora i jest dostępna 24/7.',
        'Pomaga w obronie na podstawie recenzji.',
      ],
    },
    process: {
      title: 'Jak działa Zedpera?',
      steps: [
        {
          step: '01',
          title: 'Tworzysz projekt',
          text: 'Podajesz temat, typ pracy, szkołę, wymagania i cele.',
        },
        {
          step: '02',
          title: 'Opiekun AI prowadzi Cię',
          text: 'Pomaga z planem, tekstem i ostrzega przed błędami.',
        },
        {
          step: '03',
          title: 'Kończysz i bronisz',
          text: 'Sprawdzasz jakość, oryginalność, źródła i metodologię oraz przygotowujesz się do obrony.',
        },
      ],
    },
    about: {
      badge: 'O nas',
      title: '20 lat doświadczenia',
      highlighted: 'w jednym systemie',
      p1:
        'Za Zedperą stoi doświadczony zespół, który od ponad 20 lat pomaga w tworzeniu prac akademickich.',
      p2:
        'Połączyliśmy praktyczne doświadczenie ze sztuczną inteligencją, aby zapewnić kompleksowe wsparcie w całym procesie pisania.',
      founderBadge: '',
      founderName: 'Martina',
      founderTitle: '',
      founderText:
        'Zedpera nie powstała jako odpowiedź na trend, ale jako reakcja na rzeczywistość, stres, presję czasu i poczucie, że praca akademicka jest często bardziej walką z systemem niż procesem uczenia się.',
      experience: '20+ lat',
      students: '1000+ studentów',
    },
    reviews: {
      title: 'Doświadczenia studentów z Zedperą',
      items: [
        {
          text: 'Opiekun AI pomógł mi z uwagami promotora i wskazał kierunek. Zedpera oszczędziła mi dużo czasu i stresu.',
          name: 'Studentka pracy magisterskiej',
        },
        {
          text: 'Źródła znalazłem bezpośrednio w systemie, a praca była gotowa w kilka dni. Bardzo pomogła mi część praktyczna i cytowania.',
          name: 'Student pracy licencjackiej',
        },
        {
          text: 'Zwykła AI dawała mi tylko ogólne teksty. Po wypełnieniu profilu Zedpera wygenerowała trafne rozdziały w kilka minut.',
          name: 'Studentka po doświadczeniu z AI',
        },
        {
          text: 'Studiuję zaocznie, pracuję i mam rodzinę. Dzięki Zedperze nadążam ze wszystkim.',
          name: 'Studentka zaoczna',
        },
      ],
    },
    pricing: {
      title: 'Wybierz program według zakresu pracy',
      fullOfferText: 'Pokaż wszystkie pakiety i opcje',
      fullOfferHint: 'Zobacz pełną ofertę pakietów miesięcznych i rocznych.',
      emailPrompt: 'Podaj e-mail powiązany z płatnością:',
      emailRequired: 'E-mail jest wymagany, aby przejść do płatności.',
      invalidPlan: 'Nieprawidłowy pakiet',
      checkoutFailed: 'Nie udało się utworzyć płatności.',
      noStripeUrl: 'Stripe nie wygenerował adresu płatności.',
      plans: [
        {
          id: 'week-mini',
          label: 'MINI',
          name: 'Do mniejszych poprawek',
          price: '13,20 €',
          period: '7 dni',
          description:
            'Odpowiedni do pracy semestralnej, jednego rozdziału lub szybkiej poprawki.',
          button: 'Kup MINI',
        },
        {
          id: 'week-student',
          label: 'STUDENT',
          name: 'Do większego rozdziału',
          price: '26,50 €',
          period: '7 dni',
          description:
            'Odpowiedni do pracy semestralnej, rocznej lub większego rozdziału.',
          button: 'Kup STUDENT',
          highlighted: true,
        },
        {
          id: 'week-pro',
          label: 'PRO',
          name: 'Intensywna praca',
          price: '39,90 €',
          period: '7 dni',
          description:
            'Do intensywnej pracy tuż przed oddaniem lub obroną.',
          button: 'Kup PRO',
        },
      ],
    },
    faq: {
      title: 'Najczęstsze pytania',
      items: [
        {
          question: 'Czy korzystanie z Zedpery jest legalne?',
          answer:
            'Tak, korzystanie z Zedpery jest legalne. System działa jako asystent akademicki pomagający w strukturze, źródłach, kontroli jakości i przygotowaniu do obrony.',
        },
        {
          question: 'Czy ZEDPERA poradzi sobie z każdą dziedziną?',
          answer:
            'Tak. ZEDPERA potrafi pracować z różnymi materiałami. Możesz skorzystać ze źródeł z bazy naukowej albo przesłać własne notatki, pliki i wymagania promotora.',
        },
        {
          question: 'Czy mogę używać usługi do wielu prac?',
          answer:
            'Tak. W zależności od pakietu można pracować z jednym lub wieloma projektami, zapisywać historię i kontynuować pracę.',
        },
        {
          question: 'Jaka jest różnica między ChatGPT, Gemini i Zedperą?',
          answer:
            'Zedpera jest dostosowana do pisania akademickiego i pracuje z profilem pracy, strukturą, źródłami, cytowaniami, audytem jakości i obroną.',
        },
        {
          question: 'W jakich językach mogę tworzyć pracę?',
          answer:
            'System obsługuje wiele języków i pozwala dostosować styl, poziom merytoryczny oraz wynik do wymagań pracy.',
        },
        {
          question: 'Czym są AI promotor pracy i AI krytyk?',
          answer:
            'AI promotor pracy pomaga w pisaniu od pierwszych propozycji aż po wersję finalną. AI krytyk identyfikuje błędy, wskazuje braki i proponuje konkretne poprawki.',
        },
      ],
    },
    cta: {
      title: 'Zacznij pisać bez stresu już dziś',
      subtitle:
        'Opiekun AI, źródła, cytowania, kontrola jakości, część praktyczna i obrona w jednym systemie.',
      button: 'Zacznij z Zedperą',
    },
    footer: {
      description:
        'Opiekun AI, źródła, cytowania, kontrola jakości, część praktyczna i obrona w jednym akademickim systemie.',
      links: {
        blog: 'Blog',
        gdpr: 'RODO',
        terms: 'Warunki handlowe',
        cookies: 'Cookies',
      },
    },
  },

  hu: {
    meta: { documentLang: 'hu' },
    nav: {
      features: 'Funkciók',
      comparison: 'Összehasonlítás',
      pricing: 'Árak',
      reviews: 'Vélemények',
      faq: 'GYIK',
    },
    common: {
      login: 'Bejelentkezés',
      startFree: 'Kezdés',
      language: 'Oldal nyelve',
      currentLanguage: 'Aktuális nyelv',
      switchLanguage: 'Oldal nyelvének váltása',
      showAllPackages: 'Összes csomag és lehetőség',
      safePayments: 'Biztonságos fizetés',
      instantAccess: 'Azonnali hozzáférés',
      satisfactionGuarantee: 'Elégedettségi garancia',
      cancelAnytime: 'Bármikor lemondható',
      securePlatform: 'Biztonságos akadémiai AI platform',
      rights: 'Minden jog fenntartva.',
      redirecting: 'Átirányítás...',
    },
    hero: {
      badge: 'Új generációs akadémiai asszisztens',
      title1: 'Az első AI témavezető,',
      title2: 'amely végigvezet',
      title3: 'a feladattól a védésig',
      subtitle:
        'A Zedpera egy rendszerben egyesíti az AI írást, szakmai visszajelzést, minőségellenőrzést, forrásokat, hivatkozásokat, gyakorlati részt és védésre készülést.',
      primary: 'Kezdés',
      secondary: 'Demó megtekintése',
      benefits: [
        'AI témavezető 24/7',
        'Gyakorlati rész számításokkal',
        'Hivatkozások és források',
        'Felkészülés a védésre',
      ],
      stats: [
        ['20', 'év tapasztalat'],
        ['1000+', 'hallgató'],
        ['24/7', 'AI témavezető'],
        ['1', 'platform az egész folyamathoz'],
      ],
    },
    preview: {
      logo: 'Zedpera',
      online: 'Online 24/7',
      sidebar: [
        'Áttekintés',
        'Projekt',
        'Fejezetek',
        'AI témavezető',
        'Források',
        'Ellenőrzés',
        'Védés',
        'Beállítások',
      ],
      title: 'AI témavezető',
      analyzed: 'Elemeztem a 3. fejezetet. Ezek a javaslataim:',
      statusLabel: 'Állapot',
      active: 'Aktív',
      recommendation:
        'A 3. fejezet módszertani problémát tartalmaz a kutatási folyamat leírásában. Javaslom a kutatási eszköz és a minta pontosítását.',
      quality: 'Munka minőségi pontszáma',
      ask: 'Kérdezd az AI témavezetőt...',
      metrics: [
        ['92%', 'Forrásminőség'],
        ['89/100', 'Szövegminőség'],
        ['85%', 'Védésre készültség'],
      ],
    },
    features: {
      title: 'Minden, amire szükséged van a sikeres munkához',
      items: [
        {
          title: 'AI témavezető',
          text: 'Ellenőrzi a logikát, módszertant és jelzi a gyenge pontokat.',
        },
        {
          title: 'AI kritikus',
          text: 'Azonnali visszajelzés és minőségi pontszám az írott szöveghez.',
        },
        {
          title: 'AI írás',
          text: 'Fejezetet ír, vázlatot, bevezetést, lezárást és bármilyen szakmai szöveget készít a követelmények alapján.',
        },
        {
          title: 'Források és hivatkozások',
          text: 'Segít kutatásban, hivatkozásokban és bibliográfiában.',
        },
        {
          title: 'Adatelemzés',
          text: 'A gyakorlati rész előkészítése statisztikákkal együtt.',
        },
        {
          title: 'Védés',
          text: 'Prezentáció, kérdések, válaszok és bírálatokra adott reakciók előkészítése.',
        },
      ],
    },
    comparison: {
      title: 'Miért nem elég egy általános AI vagy LLM eszköz?',
      subtitle:
        'A Zedpera másképp működik. Általános válaszok helyett a munkádhoz, forrásaidhoz és az egész írási folyamathoz kapcsolódó eredményt kapsz.',
      badTitle: 'Általános AI',
      goodTitle: 'Zedpera',
      badItems: [
        'Általános szövegeket ír.',
        'Nem emlékszik a munkádra és fontos információkra.',
        'Kitalál forrásokat.',
        'A szöveget sokáig kell javítani.',
        'Nem jelzi megbízhatóan a hibákat.',
        'Nem érti a témavezető megjegyzéseit.',
        'Nem segít a gyakorlati részben.',
        'Nem reagál bírálatokra.',
      ],
      goodItems: [
        'Ismeri a munkádat és a teljes kontextust.',
        'Megőrzi az előzményeket és kommunikációt.',
        'A választott szabvány szerint hivatkozik és a forrásaidat használja.',
        'Elemzi a munkát és jelzi a problémás részeket.',
        'Fejezeteket, gyakorlati részt és számításokat dolgoz fel.',
        'Kérdéseket, válaszokat és védést készít elő.',
        'Helyettesíti a témavezetőt és 24/7 elérhető.',
        'Segít a védésben a bírálatok alapján.',
      ],
    },
    process: {
      title: 'Hogyan működik a Zedpera?',
      steps: [
        {
          step: '01',
          title: 'Projekt létrehozása',
          text: 'Megadod a témát, munkatípust, iskolát, követelményeket és célokat.',
        },
        {
          step: '02',
          title: 'Az AI témavezető vezet',
          text: 'Segít a vázlatban, szövegben és figyelmeztet a hibákra.',
        },
        {
          step: '03',
          title: 'Befejezés és védés',
          text: 'Ellenőrzöd a minőséget, eredetiséget, forrásokat és módszertant, majd felkészülsz a védésre.',
        },
      ],
    },
    about: {
      badge: 'Rólunk',
      title: '20 év tapasztalat',
      highlighted: 'egy rendszerben',
      p1:
        'A Zedpera mögött tapasztalt csapat áll, amely több mint 20 éve segít akadémiai munkák elkészítésében.',
      p2:
        'A valós tapasztalatot mesterséges intelligenciával kapcsoltuk össze, hogy teljes támogatást nyújtsunk az írás egész folyamata során.',
      founderBadge: '',
      founderName: 'Martina',
      founderTitle: '',
      founderText:
        'A Zedpera nem egy trendre adott válaszként jött létre, hanem a valóságra, a stresszre, az időnyomásra és arra az érzésre adott reakcióként, hogy az akadémiai munka gyakran inkább küzdelem a rendszerrel, mint tanulási folyamat.',
      experience: '20+ év',
      students: '1000+ hallgató',
    },
    reviews: {
      title: 'Hallgatói tapasztalatok a Zedperával',
      items: [
        {
          text: 'Az AI témavezető segített a témavezetői megjegyzésekben és irányt adott. Sok időt és stresszt spóroltam.',
          name: 'Mesterképzéses hallgató',
        },
        {
          text: 'A forrásokat közvetlenül a rendszerben találtam meg, és a munka pár nap alatt kész lett. Nagyon jó.',
          name: 'Alapképzéses hallgató',
        },
        {
          text: 'Az általános AI csak általános szöveget adott. A profil után a Zedpera releváns fejezeteket készített percek alatt.',
          name: 'Hallgató AI tapasztalattal',
        },
        {
          text: 'Munka és család mellett tanulok. A Zedperának köszönhetően mindent időben teljesítek.',
          name: 'Levelező hallgató',
        },
      ],
    },
    pricing: {
      title: 'Válassz programot a munka terjedelme szerint',
      fullOfferText: 'Összes csomag és lehetőség megtekintése',
      fullOfferHint: 'Tekintsd meg a havi és éves csomagok teljes kínálatát.',
      emailPrompt: 'Add meg a fizetéshez kapcsolódó e-mail címet:',
      emailRequired: 'A fizetés folytatásához e-mail szükséges.',
      invalidPlan: 'Érvénytelen csomag',
      checkoutFailed: 'A fizetést nem sikerült létrehozni.',
      noStripeUrl: 'A Stripe nem generált fizetési URL-t.',
      plans: [
        {
          id: 'week-mini',
          label: 'MINI',
          name: 'Kisebb javításokra',
          price: '13,20 €',
          period: '7 nap',
          description:
            'Alkalmas szemináriumi munkához, egy fejezethez vagy gyors javításhoz.',
          button: 'MINI vásárlása',
        },
        {
          id: 'week-student',
          label: 'HALLGATÓ',
          name: 'Nagyobb fejezethez',
          price: '26,50 €',
          period: '7 nap',
          description:
            'Alkalmas szemináriumi, évfolyamdolgozathoz vagy nagyobb fejezethez.',
          button: 'HALLGATÓ vásárlása',
          highlighted: true,
        },
        {
          id: 'week-pro',
          label: 'PRO',
          name: 'Intenzív munka',
          price: '39,90 €',
          period: '7 nap',
          description:
            'Intenzív munkához közvetlenül leadás vagy védés előtt.',
          button: 'PRO vásárlása',
        },
      ],
    },
    faq: {
      title: 'Gyakran ismételt kérdések',
      items: [
        {
          question: 'Legális a Zedpera használata?',
          answer:
            'Igen, a Zedpera használata legális. A rendszer akadémiai asszisztensként segít struktúrában, forrásokban, minőségellenőrzésben és védésre felkészülésben.',
        },
        {
          question: 'A ZEDPERA minden szakterülettel megbirkózik?',
          answer:
            'Igen. A ZEDPERA különféle anyagokkal tud dolgozni. Használhatsz forrásokat a tudományos adatbázisból, vagy feltöltheted saját jegyzeteidet, fájljaidat és a témavezető követelményeit.',
        },
        {
          question: 'Több munkához is használhatom?',
          answer:
            'Igen. A választott csomagtól függően egy vagy több projekttel dolgozhatsz, előzményeket menthetsz és folytathatod a munkát.',
        },
        {
          question: 'Mi a különbség a ChatGPT, Gemini és Zedpera között?',
          answer:
            'A Zedpera akadémiai írásra készült: profillal, struktúrával, forrásokkal, hivatkozásokkal, minőségellenőrzéssel és védéssel dolgozik.',
        },
        {
          question: 'Milyen nyelveken készíthetem a munkát?',
          answer:
            'A rendszer több nyelvet támogat, és a stílust, szakmaiságot és kimenetet a követelményekhez igazítja.',
        },
        {
          question: 'Mi az AI témavezető és az AI kritikus?',
          answer:
            'Az AI témavezető a kezdeti javaslatoktól a végleges verzióig segít az akadémiai munka írásában. Az AI kritikus hibákat azonosít, hiányosságokra figyelmeztet és konkrét javításokat javasol.',
        },
      ],
    },
    cta: {
      title: 'Kezdj el stressz nélkül írni még ma',
      subtitle:
        'AI témavezető, források, hivatkozások, minőségellenőrzés, gyakorlati rész és védés egy rendszerben.',
      button: 'Kezdés a Zedperával',
    },
    footer: {
      description:
        'AI témavezető, források, hivatkozások, minőségellenőrzés, gyakorlati rész és védés egy akadémiai rendszerben.',
      links: {
        blog: 'Blog',
        gdpr: 'GDPR',
        terms: 'Általános feltételek',
        cookies: 'Cookies',
      },
    },
  },
};

const featureIcons = [Bot, MessageCircle, PenTool, BookOpen, ShieldCheck, Crown];


function applyLanguageToDocument(nextLanguage: AppLanguage) {
  if (typeof document === 'undefined') return;

  const lang = translations[nextLanguage]?.meta.documentLang || 'sk';

  document.documentElement.lang = lang;
  document.documentElement.setAttribute('data-language', nextLanguage);
  document.documentElement.setAttribute('data-system-language', nextLanguage);
  document.documentElement.setAttribute('data-work-language', nextLanguage);
  document.body.setAttribute('data-language', nextLanguage);
}

function saveLanguageToStorage(nextLanguage: AppLanguage) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  localStorage.setItem('zedpera_system_language', nextLanguage);
  localStorage.setItem('zedpera_work_language', nextLanguage);
  localStorage.setItem('app_language', nextLanguage);
}

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

function scrollToHash(hash: string) {
  if (typeof document === 'undefined') return;

  const id = hash.replace('#', '');
  const element = document.getElementById(id);

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function LanguageDropdown({
  language,
  labels,
  onChange,
}: {
  language: AppLanguage;
  labels: Translation['common'];
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
        className="flex h-[42px] min-w-[235px] items-center justify-between gap-3 rounded-md border border-white/10 bg-[#080816] px-4 text-[13px] font-black text-white shadow-[0_0_24px_rgba(124,58,237,0.16)] transition hover:border-violet-500/70 hover:bg-[#101026]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex items-center gap-3">
          <span className={`language-chip language-${current.code}`}>
            {current.short}
          </span>

          <span className="flex flex-col leading-tight">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">
              {labels.language}
            </span>
            <span className="text-[14px] font-black text-white">
              {current.label}
            </span>
          </span>
        </span>

        <ChevronDown
          size={16}
          className={`text-violet-200 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+0.55rem)] z-[100] w-[275px] overflow-hidden rounded-xl border border-violet-500/40 bg-[#090918] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.7),0_0_35px_rgba(124,58,237,0.28)]"
          role="listbox"
        >
          {languages.map((item) => {
            const active = item.code === language;

            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelect(item.code)}
                className={`flex min-h-[52px] w-full items-center justify-between rounded-lg px-3 text-left text-[13px] font-black transition ${
                  active
                    ? 'bg-violet-700 text-white'
                    : 'text-white hover:bg-white/5 hover:text-white'
                }`}
                role="option"
                aria-selected={active}
              >
                <span className="flex items-center gap-3">
                  <span className={`language-chip language-${item.code}`}>
                    {item.short}
                  </span>

                  <span>
                    <span className="block text-[14px] font-black text-white">
                      {item.label}
                    </span>
                    <span className="block text-[11px] font-bold text-violet-200">
                      {active ? labels.currentLanguage : labels.switchLanguage}
                    </span>
                  </span>
                </span>

                {active ? <CheckCircle2 size={17} /> : <ArrowRight size={16} />}
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
  labels,
  onChange,
}: {
  language: AppLanguage;
  labels: Translation['common'];
  onChange: (language: AppLanguage) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-2">
      <div className="mb-2 flex items-center gap-2 px-2 text-xs font-black uppercase tracking-[0.16em] text-white">
        <Languages size={15} className="text-violet-300" />
        {labels.language}
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
                  : 'bg-white/5 text-white'
              }`}
            >
              <span className={`language-chip language-${item.code} mr-2`}>
                {item.short}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AiLeaderPreview({ t }: { t: Translation }) {
  return (
    <div className="relative z-20 mt-10 flex min-h-[520px] w-full items-center xl:mt-0">
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
                {t.preview.logo}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-[12px] font-black text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.95)]" />
              {t.preview.online}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[178px_1fr]">
            <aside className="hidden rounded-2xl border border-white/5 bg-black/25 p-3 lg:block">
              {t.preview.sidebar.map((item) => {
                const active =
                  item === t.preview.sidebar[3] ||
                  item.toLowerCase().includes('ai');

                return (
                  <div
                    key={item}
                    className={`mb-1.5 flex min-h-[39px] items-center gap-3 rounded-lg px-4 text-[13px] font-black transition ${
                      active
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-700/35'
                        : 'text-white'
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
                    {t.preview.title}
                  </h3>

                  <p className="mt-3 text-[14px] font-semibold text-white">
                    {t.preview.analyzed}
                  </p>
                </div>

                <div className="hidden rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-2 text-right xl:block">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">
                    {t.preview.statusLabel}
                  </div>

                  <div className="mt-1 text-sm font-black text-white">
                    {t.preview.active}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-5">
                <p className="text-[16px] font-semibold leading-8 text-white">
                  {t.preview.recommendation}
                </p>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div className="text-[14px] font-black text-white">
                    {t.preview.quality}
                  </div>

                  <div className="text-[31px] font-black leading-none text-emerald-400">
                    88
                    <span className="text-sm text-white">/100</span>
                  </div>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-violet-500 via-purple-400 to-emerald-400 shadow-[0_0_24px_rgba(124,58,237,0.75)]" />
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-black text-white">
                    {t.preview.ask}
                  </span>

                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-white shadow-lg shadow-violet-700/30 transition hover:bg-violet-500"
                    aria-label={t.preview.ask}
                  >
                    <Send size={17} />
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {t.preview.metrics.map(([number, label], index) => {
                  const config = [
                    ['text-emerald-400', 'bg-emerald-500/10', 'border-emerald-400/15'],
                    ['text-emerald-300', 'bg-violet-500/10', 'border-violet-400/15'],
                    ['text-yellow-300', 'bg-orange-500/10', 'border-orange-400/15'],
                  ][index];

                  const [numberClass, bgClass, borderClass] = config;

                  return (
                    <div
                      key={label}
                      className={`rounded-xl border ${borderClass} ${bgClass} p-4`}
                    >
                      <div className={`text-2xl font-black ${numberClass}`}>
                        {number}
                      </div>

                      <div className="mt-1 text-[12px] font-bold leading-5 text-white">
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function FounderPortrait({ t }: { t: Translation }) {
  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-violet-500/35 bg-[#050511] p-4 shadow-[0_0_90px_rgba(124,58,237,0.24)] sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.34),transparent_38%),radial-gradient(circle_at_85%_70%,rgba(37,99,235,0.18),transparent_36%)]" />

      <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-black shadow-[0_32px_90px_rgba(0,0,0,0.62)]">
        <div className="relative h-[520px] sm:h-[620px]">
          <Image
            src={FOUNDER_MARTINA_IMAGE_URL}
            alt="Zedpera"
            fill
            priority={false}
            quality={100}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 44vw"
            className="select-none object-cover object-[50%_28%] transition duration-700 hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/38 via-transparent to-transparent" />
        </div>
      </div>

      <div className="relative mt-5 rounded-[1.7rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-7">
        <p className="text-base font-bold leading-8 text-white sm:text-lg">
          {t.about.founderText}
        </p>
      </div>
    </div>
  );
}


function ModernWomanHeroCard() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-violet-950/40 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-indigo-500/20" />

      <div className="relative rounded-[1.7rem] border border-white/10 bg-[#0b1020]/95 p-6 shadow-2xl shadow-black/40 sm:p-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/35 bg-violet-600/20 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-100">
          <Sparkles size={15} className="text-violet-200" />
          Zedpera
        </div>

        <h3 className="text-3xl font-black leading-tight text-white sm:text-4xl">
          Akademická podpora
        </h3>

        <p className="mt-3 text-base font-black leading-7 text-violet-100 sm:text-lg">
          Podpora pri písaní od zadania až po obhajobu
        </p>

        <p className="mt-5 text-sm font-bold leading-7 text-slate-200 sm:text-base">
          Zedpera spája praktické skúsenosti, odbornú spätnú väzbu a AI podporu do jedného prehľadného systému.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
            
            <div className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              rokov skúseností
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
            <div className="text-3xl font-black text-white">1000+</div>
          
          </div>
        </div>

        <div className="mt-7 rounded-[1.4rem] border border-violet-400/25 bg-violet-600/15 p-5">
          <p className="text-sm font-bold leading-7 text-slate-100">
            Skúsenosti z praxe sú spojené s AI technológiou, aby študent získal
            odbornú podporu pri písaní práce od zadania až po obhajobu.
          </p>
        </div>
      </div>
    </div>
  );
}
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [language, setLanguage] = useState<AppLanguage>('sk');
  const [translationVersion, setTranslationVersion] = useState(0);

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

  const t = useMemo(() => {
    return translations[language] || translations.sk;
  }, [language, translationVersion]);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';

    const storedLanguage =
      localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
      localStorage.getItem('zedpera_system_language') ||
      localStorage.getItem('zedpera_work_language') ||
      localStorage.getItem('app_language');

    const nextLanguage = normalizeLanguage(storedLanguage);

    setLanguage(nextLanguage);
    applyLanguageToDocument(nextLanguage);

    const handleExternalLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppLanguage>;
      const next = normalizeLanguage(String(customEvent.detail || ''));

      setLanguage(next);
      setTranslationVersion((version) => version + 1);
      applyLanguageToDocument(next);
    };

    const handleStorageLanguageChange = (event: StorageEvent) => {
      if (
        event.key !== LANGUAGE_STORAGE_KEY &&
        event.key !== 'zedpera_system_language' &&
        event.key !== 'zedpera_work_language' &&
        event.key !== 'app_language'
      ) {
        return;
      }

      const next = normalizeLanguage(event.newValue);

      setLanguage(next);
      setTranslationVersion((version) => version + 1);
      applyLanguageToDocument(next);
    };

    window.addEventListener('zedpera-language-change', handleExternalLanguageChange as EventListener);
    window.addEventListener('storage', handleStorageLanguageChange);

    return () => {
      document.documentElement.style.scrollBehavior = '';
      window.removeEventListener('zedpera-language-change', handleExternalLanguageChange as EventListener);
      window.removeEventListener('storage', handleStorageLanguageChange);
    };
  }, []);

  useEffect(() => {
    applyLanguageToDocument(language);
  }, [language]);

  function handleLanguageChange(nextLanguage: AppLanguage) {
    const normalizedLanguage = normalizeLanguage(nextLanguage);

    setLanguage(normalizedLanguage);
    setTranslationVersion((version) => version + 1);
    saveLanguageToStorage(normalizedLanguage);
    applyLanguageToDocument(normalizedLanguage);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('zedpera-language-change', {
          detail: normalizedLanguage,
        }),
      );
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
      const enteredEmail = window.prompt(t.pricing.emailPrompt);

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
        throw new Error(`${t.pricing.invalidPlan}: ${planId}`);
      }

      const email = await getEmailForCheckout();

      if (!email) {
        throw new Error(t.pricing.emailRequired);
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
          getCheckoutError(data, t.pricing.checkoutFailed),
        );
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error(t.pricing.noStripeUrl);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t.pricing.checkoutFailed;

      setPaymentError(message);

      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setLoadingPlan(null);
    }
  }

  const navItems = [
    { href: '#features', label: t.nav.features, icon: Sparkles },
    { href: '#comparison', label: t.nav.comparison, icon: ShieldCheck },
    { href: '#pricing', label: t.nav.pricing, icon: Crown },
    { href: '#reviews', label: t.nav.reviews, icon: Star },
    { href: '#faq', label: t.nav.faq, icon: HelpCircle },
  ];

  const footerLinks = [
    { href: '/gdpr', label: t.footer.links.gdpr, icon: ShieldCheck },
    { href: '/obchodne-podmienky', label: t.footer.links.terms, icon: FileText },
    { href: '/cookies', label: t.footer.links.cookies, icon: Cookie },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <style jsx global>{`
        html,
        body {
          background: #000000 !important;
        }

        .zedpera-template {
          color-scheme: dark;
          background: #000000;
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

        .zedpera-template,
        .zedpera-template * {
          color: inherit;
        }

        .zedpera-template p,
        .zedpera-template span,
        .zedpera-template a,
        .zedpera-template button,
        .zedpera-template div,
        .zedpera-template li {
          font-weight: 700;
        }

        .zedpera-template h1,
        .zedpera-template h2,
        .zedpera-template h3,
        .zedpera-template strong,
        .zedpera-template .font-black {
          font-weight: 900;
        }

        .language-chip {
          display: inline-flex;
          min-width: 40px;
          height: 28px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.32);
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.26);
        }

        .language-sk {
          background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
        }

        .language-cs {
          background: linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%);
        }

        .language-en {
          background: linear-gradient(135deg, #06b6d4 0%, #2563eb 100%);
        }

        .language-de {
          background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
        }

        .language-pl {
          background: linear-gradient(135deg, #fb7185 0%, #e11d48 100%);
        }

        .language-hu {
          background: linear-gradient(135deg, #10b981 0%, #16a34a 100%);
        }
      `}</style>

      <div
        key={`landing-${language}-${translationVersion}`}
        className="zedpera-template relative min-h-screen"
      >
        <div className="pointer-events-none fixed inset-0 z-0 zedpera-grid-bg opacity-45" />
        <div className="pointer-events-none fixed left-1/2 top-0 z-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[120px]" />

        <header className="sticky top-0 z-50 border-b border-white/10 bg-black/92 backdrop-blur-2xl">
          <div className="mx-auto flex h-[72px] max-w-[1920px] items-center px-8">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-violet-600 to-fuchsia-500 text-2xl font-black text-white shadow-[0_0_28px_rgba(80,90,255,0.55)]">
                Z
              </div>

              <div className="text-[21px] font-black uppercase tracking-[0.12em] text-white">
                Zedpera
              </div>
            </Link>

            <nav className="ml-10 hidden items-center gap-6 text-[15px] font-black text-white xl:flex">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(event) => {
                      if (item.href.startsWith('#')) {
                        event.preventDefault();
                        scrollToHash(item.href);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-md px-2 py-2 font-black text-white transition hover:text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/70"
                  >
                    <Icon size={17} className="text-violet-300" />
                    {item.label}
                  </a>
                );
              })}
            </nav>

            <div className="ml-auto hidden shrink-0 items-center gap-3 xl:flex">
              <LanguageDropdown
                language={language}
                labels={t.common}
                onChange={handleLanguageChange}
              />

              <Link
                href="/login"
                className="inline-flex h-[42px] min-w-[138px] items-center justify-center rounded-md border border-white/10 bg-[#080816] px-5 text-[14px] font-black text-white transition hover:border-violet-500/70 hover:bg-[#101026]"
              >
                {t.common.login}
              </Link>

              <a
                href="#pricing"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToHash('#pricing');
                }}
                className="inline-flex h-[42px] min-w-[158px] items-center justify-center rounded-md bg-violet-600 px-6 text-[14px] font-black text-white shadow-lg shadow-violet-700/40 transition hover:bg-violet-500"
              >
                {t.common.startFree}
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
            <div className="border-t border-white/10 bg-black px-5 py-4 xl:hidden">
              <div className="grid gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={(event) => {
                        setMobileMenuOpen(false);

                        if (item.href.startsWith('#')) {
                          event.preventDefault();
                          scrollToHash(item.href);
                        }
                      }}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-black text-white hover:bg-white/5"
                    >
                      <Icon size={17} className="text-violet-300" />
                      {item.label}
                    </a>
                  );
                })}

                <MobileLanguageDropdown
                  language={language}
                  labels={t.common}
                  onChange={handleLanguageChange}
                />

                <Link
                  href="/login"
                  className="mt-2 rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-black text-white"
                >
                  {t.common.login}
                </Link>

                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-black text-white"
                >
                  {t.common.startFree}
                </a>
              </div>
            </div>
          ) : null}
        </header>

        <section className="relative z-10 mx-auto max-w-[1860px] px-5 pb-8 pt-8 lg:px-10">
          <div className="grid min-h-[560px] items-center gap-10 xl:grid-cols-[0.36fr_0.64fr]">
            <div className="relative z-20 max-w-[720px] pt-1">
              <div className="mb-8 inline-flex items-center rounded-full border border-violet-500/35 bg-violet-500/10 px-5 py-2 text-[13px] font-black uppercase tracking-[0.22em] text-violet-100">
                {t.hero.badge}
              </div>

              <h1 className="text-[34px] font-black leading-[1.15] tracking-[-0.035em] text-white sm:text-[42px] lg:text-[48px] xl:text-[54px]">
                {t.hero.title1}
                <br />
                {t.hero.title2}
                <br />
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-purple-200 bg-clip-text text-transparent">
                  {t.hero.title3}
                </span>
              </h1>

              <p className="mt-9 max-w-2xl text-[17px] font-bold leading-8 text-white">
                {t.hero.subtitle}
              </p>

              <div className="mt-10 flex flex-col gap-5 sm:flex-row">
                <a
                  href="#pricing"
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToHash('#pricing');
                  }}
                  className="inline-flex min-h-[64px] min-w-[225px] items-center justify-center gap-4 rounded-xl bg-violet-600 px-9 text-[17px] font-black text-white shadow-2xl shadow-violet-700/35 transition hover:-translate-y-0.5 hover:bg-violet-500"
                >
                  {t.hero.primary}
                  <ArrowRight size={23} />
                </a>

                <a
                  href="#features"
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToHash('#features');
                  }}
                  className="inline-flex min-h-[64px] min-w-[240px] items-center justify-center gap-4 rounded-xl border border-white/15 bg-white/5 px-9 text-[17px] font-black text-white transition hover:-translate-y-0.5 hover:border-violet-400 hover:bg-white/10"
                >
                  {t.hero.secondary}
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm">
                    ▶
                  </span>
                </a>
              </div>

              <div className="mt-10 grid max-w-[760px] grid-cols-2 gap-5 text-[15px] font-black text-white sm:grid-cols-4">
                {[Bot, Sparkles, BookOpen, Crown].map((Icon, index) => (
                  <div key={t.hero.benefits[index]} className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-violet-300" />
                    {t.hero.benefits[index]}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6">
  <AiLeaderPreview t={t} />
</div>
          </div>

          <div className="mt-16 grid overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/30 sm:grid-cols-4">
            {t.hero.stats.map(([number, label]) => (
              <div
                key={label}
                className="border-b border-white/10 px-5 py-5 text-center last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                <div className="text-3xl font-black text-violet-400">
                  {number}
                </div>

                <div className="mt-1 text-xs font-black uppercase tracking-wider text-white">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="features"
          className="relative z-10 mx-auto max-w-[1460px] px-5 py-24 lg:px-8"
        >
          <h2 className="zedpera-section-title text-center text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            {t.features.title}
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.items.map((feature, index) => {
              const Icon = featureIcons[index];

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
                  <p className="text-sm font-semibold leading-relaxed text-white">
                    {feature.text}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="comparison" className="relative z-10 mx-auto max-w-[1260px] px-5 py-24 lg:px-8">
          <div className="text-center">
            <h2 className="zedpera-section-title text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              {t.comparison.title}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg font-bold text-white">
              {t.comparison.subtitle}
            </p>
          </div>

          <div className="mt-16 grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 shadow-[0_0_40px_rgba(239,68,68,0.05)]">
              <h3 className="mb-6 text-2xl font-black text-red-400">
                {t.comparison.badTitle}
              </h3>
              <ul className="space-y-4">
                {t.comparison.badItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <X className="mt-0.5 shrink-0 text-red-400" size={20} />
                    <span className="text-sm font-semibold text-white">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#101026] text-xl font-black text-white shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                VS
              </div>
            </div>

            <div className="zedpera-glow-border relative overflow-hidden rounded-3xl bg-violet-600/10 p-8 shadow-[0_0_50px_rgba(124,58,237,0.15)]">
              <div className="absolute right-0 top-0 p-4">
                <Crown className="text-violet-400 opacity-50" size={40} />
              </div>
              <h3 className="mb-6 text-2xl font-black text-violet-300">
                {t.comparison.goodTitle}
              </h3>
              <ul className="relative z-10 space-y-4">
                {t.comparison.goodItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
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

        <section id="process" className="relative z-10 mx-auto max-w-[1260px] px-5 py-24 lg:px-8">
          <h2 className="zedpera-section-title text-center text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            {t.process.title}
          </h2>

          <div className="relative mt-16 grid gap-8 md:grid-cols-3">
            <div className="absolute left-0 top-1/2 z-0 hidden h-0.5 w-full -translate-y-1/2 bg-gradient-to-r from-violet-600/0 via-violet-600/50 to-violet-600/0 md:block" />

            {t.process.steps.map((item) => (
              <div key={item.step} className="relative z-10 flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-black bg-violet-600 text-2xl font-black text-white shadow-[0_0_30px_rgba(124,58,237,0.4)]">
                  {item.step}
                </div>
                <h3 className="mt-6 text-xl font-black text-white">{item.title}</h3>
                <p className="mt-3 max-w-[260px] text-sm font-semibold text-white">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="relative z-10 mx-auto max-w-[1460px] px-5 py-24 lg:px-8">
          <div className="zedpera-glow-border relative overflow-hidden rounded-3xl bg-white/[0.02] p-8 lg:p-12">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-violet-900/20 to-transparent" />
            <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <div className="mb-6 inline-flex items-center rounded-full border border-violet-500/35 bg-violet-500/10 px-4 py-1.5 text-[12px] font-black uppercase tracking-[0.2em] text-violet-200">
                  {t.about.badge}
                </div>
                <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                  {t.about.title}
                  <br />
                  <span className="text-violet-400">{t.about.highlighted}</span>
                </h2>
                <p className="mt-6 text-lg font-semibold text-white">
                  {t.about.p1}
                </p>
                <p className="mt-4 text-lg font-semibold text-white">
                  {t.about.p2}
                </p>
              </div>

              <FounderPortrait t={t} />
            </div>
          </div>
        </section>

        <section id="reviews" className="relative z-10 mx-auto max-w-[1460px] px-5 py-24 lg:px-8">
          <h2 className="zedpera-section-title text-center text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            {t.reviews.title}
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.reviews.items.map((review) => (
              <div key={review.name} className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-lg">
                <div>
                  <div className="mb-4 flex gap-1 text-yellow-400">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} size={18} fill="currentColor" />
                    ))}
                  </div>
                  <p className="mb-6 text-sm font-semibold italic text-white">
                    &quot;{review.text}&quot;
                  </p>
                </div>
                <div className="text-[13px] font-black uppercase tracking-wider text-violet-300">
                  {review.name}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="relative z-10 mx-auto max-w-[1260px] px-5 py-24 lg:px-8">
          <div className="text-center">
            <h2 className="zedpera-section-title text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              {t.pricing.title}
            </h2>
          </div>

          <div className="mx-auto mt-16 grid max-w-[1000px] gap-8 sm:grid-cols-3">
            {t.pricing.plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl p-8 ${
                  plan.highlighted
                    ? 'zedpera-glow-border z-10 scale-105 bg-violet-900/20'
                    : 'border border-white/10 bg-white/[0.02]'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-4 py-1 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-violet-500/50">
                    TOP
                  </div>
                )}

                <div className="mb-2 text-sm font-black uppercase tracking-wider text-violet-400">
                  {plan.label}
                </div>
                <h3 className="mb-6 text-xl font-bold text-white">
                  {plan.name}
                </h3>
                <div className="mb-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-sm font-semibold text-white">/ {plan.period}</span>
                </div>
                <p className="mb-8 min-h-[60px] text-sm font-semibold text-white">
                  {plan.description}
                </p>

                <button
                  type="button"
                  onClick={() => buy(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-black transition ${
                    plan.highlighted
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {loadingPlan === plan.id ? <Loader2 className="animate-spin" size={18} /> : null}
                  {loadingPlan === plan.id ? t.common.redirecting : plan.button}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/pricing" className="inline-flex items-center gap-2 text-sm font-black text-violet-400 transition hover:text-violet-300">
              {t.pricing.fullOfferText} <ArrowRight size={16} />
            </Link>
            <p className="mt-2 text-xs font-semibold text-white">
              {t.pricing.fullOfferHint}
            </p>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-6 text-xs font-bold uppercase tracking-widest text-white">
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-violet-400"/> {t.common.safePayments}</span>
            <span className="flex items-center gap-2"><Zap size={16} className="text-violet-400"/> {t.common.instantAccess}</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-violet-400"/> {t.common.satisfactionGuarantee}</span>
            <span className="flex items-center gap-2"><X size={16} className="text-violet-400"/> {t.common.cancelAnytime}</span>
          </div>

          {paymentError && (
            <div className="mx-auto mt-8 max-w-md rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-bold text-red-400">
              {paymentError}
            </div>
          )}
        </section>

        <section id="faq" className="relative z-10 mx-auto max-w-[860px] px-5 py-24 lg:px-8">
          <h2 className="zedpera-section-title mb-12 text-center text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            {t.faq.title}
          </h2>

          <div className="space-y-4">
            {t.faq.items.map((faq, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <div key={faq.question} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-6 text-left"
                  >
                    <span className="pr-4 text-base font-bold text-white">{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="shrink-0 text-violet-400" size={20} />
                    ) : (
                      <ChevronDown className="shrink-0 text-white" size={20} />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm font-semibold leading-relaxed text-white">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-[1260px] px-5 py-24 lg:px-8">
          <div className="zedpera-glow-border relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-900/40 to-blue-900/20 p-12 text-center shadow-2xl">
            <h2 className="relative z-10 mb-6 text-3xl font-black text-white sm:text-5xl">
              {t.cta.title}
            </h2>
            <p className="relative z-10 mx-auto mb-10 max-w-2xl text-lg font-bold text-violet-200">
              {t.cta.subtitle}
            </p>
            <a
              href="#pricing"
              onClick={(event) => {
                event.preventDefault();
                scrollToHash('#pricing');
              }}
              className="relative z-10 inline-flex h-[68px] min-w-[270px] items-center justify-center gap-4 rounded-2xl border border-violet-300/40 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-blue-600 px-8 text-[18px] font-black text-white shadow-[0_0_45px_rgba(124,58,237,0.55)] transition hover:scale-105 hover:shadow-[0_0_70px_rgba(124,58,237,0.75)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-black/25 text-white shadow-inner">
                <Sparkles size={22} />
              </span>
              {t.cta.button}
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-white">
                <ArrowRight size={21} />
              </span>
            </a>
          </div>
        </section>

        <footer className="relative z-10 mt-12 border-t border-white/10 bg-black px-5 py-14 text-white lg:px-8">
          <div className="mx-auto max-w-[1260px]">
            <div className="grid gap-10 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-violet-600 to-fuchsia-500 text-base font-black text-white shadow-[0_0_28px_rgba(80,90,255,0.55)]">
                    Z
                  </div>
                  <div>
                    <div className="text-xl font-black uppercase tracking-[0.16em] text-white">
                      Zedpera
                    </div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
                      AI akademický asistent
                    </div>
                  </div>
                </div>

                <p className="max-w-xl text-sm font-bold leading-7 text-white">
                  {t.footer.description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {footerLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-black text-white transition hover:border-violet-400/70 hover:bg-violet-600/15"
                    >
                      <Icon size={18} className="text-violet-300" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm font-bold text-white sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()}{' '}Zedpera. {t.common.rights}</span>
              <span className="flex items-center gap-2 text-violet-300">
                <ShieldCheck size={16} />
                {t.common.securePlatform}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
