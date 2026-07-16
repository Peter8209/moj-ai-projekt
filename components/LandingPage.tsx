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
  | 'free'
  | 'seminar-work'
  | 'bachelor-thesis'
  | 'master-thesis'
  | 'data-analysis'
  | 'extra-20'
  | 'extra-40'
  | 'extra-60';
type AppLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

type PlanKind = 'free' | 'plan' | 'addon';

type Plan = {
  id: PlanId;
  kind: PlanKind;
  label: string;
  name: string;
  price: string;
  period: string;
  description: string;
  button: string;
  features: string[];
  highlighted?: boolean;
  pageLimit?: number;
  extraPages?: number;
  attachmentLimit?: number;
  promptLimit?: number | null;
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
    closing: string;
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
        'Písanie záverečnej práce nemusí znamenať mesiace stresu. ZEDPERA vás krok za krokom prevedie celým procesom od výberu témy, cez písanie, metodiku, citácie a spracovanie dát až po úspešnú obhajobu. Ušetrite desiatky hodín práce, odhaľte chyby skôr, než ich nájde školiteľ, a majte istotu, že je vaša práca pripravená na odovzdanie.',
      primary: 'Začať',
      secondary: 'Pozrieť ukážku',
      benefits: [
        'Osobný konzultant 24/7',
        'Praktická časť a štatistika',
        'Citácie a zdroje',
        'Príprava na obhajobu',
      ],
      stats: [
        ['20', 'rokov skúseností'],
        ['1000+', 'študentov'],
        ['24/7', 'akademická podpora'],
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
      title: 'Všetko, čo potrebujete pre úspešnú prácu',
      items: [
        {
          title: 'Osobný akademický konzultant',
          text: 'Vedie vás počas celej práce, kontroluje logiku a metodiku a upozorňuje na slabé miesta.',
        },
        {
          title: 'Kritik',
          text: 'Poskytuje okamžitú spätnú väzbu, hodnotenie kvality a konkrétne odporúčania na zlepšenie.',
        },
        {
          title: 'Písanie práce',
          text: 'Pomáha vytvoriť osnovu, kapitoly, úvod, záver a odborný text podľa zadania a profilu práce.',
        },
        {
          title: 'Zdroje a citácie',
          text: 'Pomáha pri rešerši, práci so zdrojmi, citovaní a zostavení zoznamu použitej literatúry.',
        },
        {
          title: 'Analýza dát',
          text: 'Spracovanie dotazníkov, deskriptívna štatistika, testovanie normality, korelačné analýzy, frekvenčné tabuľky, tvorba škál a subškál a grafy.',
        },
        {
          title: 'Obhajoba',
          text: 'Pripraví prezentáciu, sprievodný text, možné otázky komisie, odpovede a reakcie na posudky.',
        },
      ],
    },
    comparison: {
      title: 'Prečo nestačí ChatGPT alebo iná AI?',
      subtitle:
        'ChatGPT odpovedá na otázky. ZEDPERA vás dovedie až k úspešne odovzdanej práci.',
      badTitle: 'Bežná AI',
      goodTitle: 'ZEDPERA',
      badItems: [
        'Odpovedá na jednotlivé otázky.',
        'Nepozná vašu prácu ani jej históriu.',
        'Každý nový chat začína takmer odznova.',
        'Vyžaduje, aby ste vedeli, čo sa opýtať.',
        'Vytvorí text, ale neskontroluje kvalitu celej práce.',
        'Neposkytne vám spätnú väzbu ako vedúci práce.',
        'Nevytvorí praktickú časť.',
        'Nepripraví vás na obhajobu.',
        'Musíte používať viacero nástrojov.',
      ],
      goodItems: [
        'Vedie vás počas celej práce od zadania až po obhajobu.',
        'Pamätá si celý projekt, všetky kapitoly a predchádzajúce úpravy.',
        'Celý projekt zostáva v jednom prostredí a pozná jeho kontext.',
        'Sama upozorní na metodické chyby, slabé miesta a nelogickosti.',
        'Priebežne hodnotí kvalitu práce a odporúča konkrétne zlepšenia.',
        'Simuluje skúseného vedúceho práce a poskytuje metodické vedenie.',
        'Pripraví kompletnú štatistiku, grafy aj tabuľky, ktoré vložíte priamo do práce. Nemusíte platiť štatistu.',
        'Vytvorí prezentáciu a kompletný sprievodný text k obhajobe.',
        'Všetko vybavíte v jednom systéme.',
      ],
      closing:
        'ChatGPT je výborný pomocník. ZEDPERA je kompletný systém na tvorbu záverečných prác.',
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
          text: 'Skontrolujete kvalitu, zdroje, metodiku a pripravíte sa na obhajobu.',
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
      title: 'Skúsenosti študentov so ZEDPEROU',
      items: [
        {
          text: 'Školiteľ mi vrátil bakalársku prácu s viac ako 20 pripomienkami. ZEDPERA mi ich pomohla zapracovať za jeden večer a zároveň vysvetlila, prečo sú potrebné. Ušetrila mi obrovské množstvo času.',
          name: 'Študent bakalárskej práce',
        },
        {
          text: 'Najviac som sa bál praktickej časti. Nahral som dotazník a ZEDPERA pripravila tabuľky, grafy aj interpretáciu výsledkov. To, čo by mi trvalo niekoľko dní, som mal hotové za približne hodinu.',
          name: 'Študent praktickej časti',
        },
        {
          text: 'Skúšal som ChatGPT, ale pri každej otázke som musel znova vysvetľovať tému práce. V ZEDPERE AI poznala celý môj projekt, pamätala si všetky kapitoly a odporúčania na seba nadväzovali.',
          name: 'Študent po skúsenosti s ChatGPT',
        },
        {
          text: 'Najväčšou pomocou bola kontrola kvality. Pred odovzdaním mi ZEDPERA našla nelogické časti metodiky aj chýbajúce citácie. Vďaka tomu som odovzdával prácu s oveľa väčšou istotou.',
          name: 'Študent pred odovzdaním',
        },
        {
          text: 'Obhajoby som sa bál viac ako samotného písania. ZEDPERA mi pripravila prezentáciu, možné otázky komisie aj návrhy odpovedí. Na obhajobu som išiel oveľa pokojnejší.',
          name: 'Študent pred obhajobou',
        },
        {
          text: 'Popri práci a dvoch deťoch som nemal čas sedieť celé večery nad diplomovkou. ZEDPERA mi pomohla naplánovať jednotlivé kapitoly a vždy som presne vedel, čo mám robiť ďalej.',
          name: 'Externý študent a rodič',
        },
      ],
    },
    pricing: {
      title: 'Vyberte si balík podľa typu a rozsahu práce',
      fullOfferText: 'Zobraziť kompletný cenník',
      fullOfferHint: 'Jednorazové balíky bez automatického mesačného obnovovania.',
      emailPrompt: 'Zadajte e-mail, na ktorý bude naviazaná platba:',
      emailRequired: 'Pre pokračovanie na platbu je potrebný e-mail.',
      invalidPlan: 'Neplatný balík alebo doplnková služba',
      checkoutFailed: 'Platbu sa nepodarilo vytvoriť.',
      noStripeUrl: 'Stripe nevygeneroval platobnú URL.',
      plans: [
        {
          id: 'free',
          kind: 'free',
          label: 'FREE',
          name: 'Bezplatná verzia',
          price: '0 €',
          period: 'navždy',
          description: 'Vyskúšajte základnú akademickú pomoc bez platby.',
          button: 'Začať zadarmo',
          pageLimit: 3,
          attachmentLimit: 1,
          promptLimit: 3,
          features: [
            '1 príloha',
            '2–3 prompty',
            'Základná pomoc osobného akademického konzultanta',
          ],
        },
        {
          id: 'seminar-work',
          kind: 'plan',
          label: 'SEMINÁRNA PRÁCA',
          name: 'Seminárna, ročníková alebo zápočtová práca',
          price: '39 €',
          period: 'jednorazovo',
          description: 'Ideálne riešenie pre seminárne, ročníkové a zápočtové práce do 15 strán.',
          button: 'Kúpiť seminárnu prácu',
          pageLimit: 15,
          attachmentLimit: 12,
          promptLimit: null,
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
          kind: 'plan',
          label: 'BAKALÁRSKA PRÁCA',
          name: 'Kompletné riešenie bakalárskej práce',
          price: '149 €',
          period: 'jednorazovo',
          description: 'Kompletné riešenie od prvého zadania až po úspešnú obhajobu bakalárskej práce.',
          button: 'Kúpiť bakalársku prácu',
          highlighted: true,
          pageLimit: 50,
          attachmentLimit: 12,
          promptLimit: null,
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
          kind: 'plan',
          label: 'DIPLOMOVÁ / MAGISTERSKÁ PRÁCA',
          name: 'Najkomplexnejší balík záverečnej práce',
          price: '189 €',
          period: 'jednorazovo',
          description: 'Najkomplexnejší balík pre náročné záverečné práce s pokročilou metodikou a analýzou dát.',
          button: 'Kúpiť diplomovú prácu',
          pageLimit: 70,
          attachmentLimit: 12,
          promptLimit: null,
          features: [
            'Vytvorenie celej diplomovej práce',
            'Metodické vedenie počas celého procesu',
            'Kontrola kvality a odbornosti textu',
            'Humanizácia textu',
            'Pomoc so zdrojmi a citáciami',
            'Komplexné spracovanie štatistiky',
            'Deskriptívna štatistika',
            'Testovanie hypotéz',
            'Korelačné analýzy',
            'Normalita dát',
            'Tvorba grafov a tabuliek',
            'Príprava prezentácie na obhajobu',
            'Simulácia otázok komisie',
            'Plánovanie celej práce',
            'Komunikácia so školiteľom',
            'Všetko v jednom systéme',
          ],
        },
        {
          id: 'data-analysis',
          kind: 'addon',
          label: 'DOPLNKOVÁ SLUŽBA',
          name: 'Analýza dát',
          price: '89 €',
          period: 'jednorazovo',
          description: 'Kompletné spracovanie štatistickej časti práce.',
          button: 'Kúpiť analýzu dát',
          features: [
            'Spracovanie dotazníkov',
            'Čistenie dát',
            'Deskriptívna štatistika',
            'Testovanie normality',
            'Korelačné analýzy',
            'Frekvenčné tabuľky',
            'Tvorba škál a subškál',
            'Grafy',
          ],
        },
        {
          id: 'extra-20',
          kind: 'addon',
          label: 'EXTRA ROZSAH',
          name: 'Extra 20 strán',
          price: '49 €',
          period: 'jednorazovo',
          description: 'Rozšírenie aktuálneho projektu a používateľského balíka o ďalších 20 normostrán.',
          button: 'Dokúpiť 20 strán',
          extraPages: 20,
          features: ['Ďalších 20 normostrán pre aktuálny projekt'],
        },
        {
          id: 'extra-40',
          kind: 'addon',
          label: 'EXTRA ROZSAH',
          name: 'Extra 40 strán',
          price: '89 €',
          period: 'jednorazovo',
          description: 'Rozšírenie aktuálneho projektu a používateľského balíka o ďalších 40 normostrán.',
          button: 'Dokúpiť 40 strán',
          extraPages: 40,
          features: ['Ďalších 40 normostrán pre aktuálny projekt'],
        },
        {
          id: 'extra-60',
          kind: 'addon',
          label: 'EXTRA ROZSAH',
          name: 'Extra 60 strán',
          price: '129 €',
          period: 'jednorazovo',
          description: 'Rozšírenie aktuálneho projektu a používateľského balíka o ďalších 60 normostrán.',
          button: 'Dokúpiť 60 strán',
          extraPages: 60,
          features: ['Ďalších 60 normostrán pre aktuálny projekt'],
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
        'Psaní závěrečné práce nemusí znamenat měsíce stresu. ZEDPERA vás krok za krokem provede celým procesem od výběru tématu přes psaní, metodiku, citace a zpracování dat až po úspěšnou obhajobu. Ušetřete desítky hodin práce, odhalte chyby dříve než školitel a mějte jistotu, že je práce připravena k odevzdání.',
      primary: 'Začít',
      secondary: 'Podívat se na ukázku',
      benefits: ['Osobní konzultant 24/7', 'Praktická část a statistika', 'Citace a zdroje', 'Příprava na obhajobu'],
      stats: [['20', 'let zkušeností'], ['1000+', 'studentů'], ['24/7', 'akademická podpora'], ['1', 'platforma pro celý proces']],
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
        { title: 'Osobní akademický konzultant', text: 'Provází vás celou prací, kontroluje logiku a metodiku a upozorňuje na slabá místa.' },
        { title: 'Kritik', text: 'Poskytuje okamžitou zpětnou vazbu, hodnocení kvality a konkrétní doporučení.' },
        { title: 'Psaní práce', text: 'Pomáhá vytvořit osnovu, kapitoly, úvod, závěr a odborný text podle zadání.' },
        { title: 'Zdroje a citace', text: 'Pomáhá s rešerší, zdroji, citováním a seznamem literatury.' },
        { title: 'Analýza dat', text: 'Zpracování dotazníků, deskriptivní statistika, testování normality, korelace, frekvenční tabulky, škály, subškály a grafy.' },
        { title: 'Obhajoba', text: 'Připraví prezentaci, doprovodný text, otázky komise, odpovědi a reakce na posudky.' },
      ],
    },
    comparison: {
      title: 'Proč nestačí ChatGPT nebo jiná AI?',
      subtitle: 'ChatGPT odpovídá na otázky. ZEDPERA vás dovede až k úspěšně odevzdané práci.',
      badTitle: 'Běžná AI',
      goodTitle: 'ZEDPERA',
      badItems: ['Odpovídá na jednotlivé otázky.', 'Nezná vaši práci ani její historii.', 'Každý nový chat začíná téměř od začátku.', 'Vyžaduje, abyste věděli, na co se zeptat.', 'Vytvoří text, ale nezkontroluje kvalitu celé práce.', 'Neposkytne zpětnou vazbu jako vedoucí práce.', 'Nevytvoří praktickou část.', 'Nepřipraví vás na obhajobu.', 'Musíte používat více nástrojů.'],
      goodItems: ['Provází vás celou prací od zadání až po obhajobu.', 'Pamatuje si celý projekt, kapitoly a předchozí úpravy.', 'Celý projekt zůstává v jednom prostředí a zná jeho kontext.', 'Sama upozorní na metodické chyby, slabá místa a nelogičnosti.', 'Průběžně hodnotí kvalitu práce a doporučuje konkrétní zlepšení.', 'Simuluje zkušeného vedoucího práce a poskytuje metodické vedení.', 'Připraví kompletní statistiku, grafy a tabulky přímo do práce.', 'Vytvoří prezentaci a kompletní doprovodný text k obhajobě.', 'Vše vyřešíte v jednom systému.'],
      closing: 'ChatGPT je výborný pomocník. ZEDPERA je kompletní systém pro tvorbu závěrečných prací.',
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
          text: 'Zkontrolujete kvalitu, zdroje, metodiku a připravíte se na obhajobu.',
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
      title: 'Zkušenosti studentů se ZEDPEROU',
      items: [
        { text: 'Školitel mi vrátil bakalářskou práci s více než 20 připomínkami. ZEDPERA mi je pomohla zapracovat za jeden večer a vysvětlila, proč jsou potřeba.', name: 'Student bakalářské práce' },
        { text: 'Nejvíce jsem se bál praktické části. Nahrál jsem dotazník a ZEDPERA připravila tabulky, grafy i interpretaci výsledků přibližně za hodinu.', name: 'Student praktické části' },
        { text: 'V ChatGPT jsem musel stále znovu vysvětlovat téma. ZEDPERA znala celý projekt, pamatovala si kapitoly a doporučení na sebe navazovala.', name: 'Student po zkušenosti s ChatGPT' },
        { text: 'Před odevzdáním mi ZEDPERA našla nelogické části metodiky i chybějící citace. Práci jsem odevzdával s mnohem větší jistotou.', name: 'Student před odevzdáním' },
        { text: 'ZEDPERA mi připravila prezentaci, možné otázky komise i návrhy odpovědí. Na obhajobu jsem šel mnohem klidnější.', name: 'Student před obhajobou' },
        { text: 'Při práci a péči o dvě děti mi ZEDPERA pomohla naplánovat kapitoly a vždy jsem přesně věděl, co dělat dál.', name: 'Externí student a rodič' },
      ],
    },
    pricing: {
      title: 'Vyberte si balíček podle typu a rozsahu práce',
      fullOfferText: 'Zobrazit kompletní ceník',
      fullOfferHint: 'Jednorázové balíčky bez automatického měsíčního obnovení.',
      emailPrompt: 'Zadejte e-mail, ke kterému bude platba přiřazena:',
      emailRequired: 'Pro pokračování k platbě je potřeba e-mail.',
      invalidPlan: 'Neplatný balíček nebo doplňková služba',
      checkoutFailed: 'Platbu se nepodařilo vytvořit.',
      noStripeUrl: 'Stripe nevygeneroval platební URL.',
      plans: [
        { id: 'free', kind: 'free', label: 'FREE', name: 'Bezplatná verze', price: '0 €', period: 'navždy', description: 'Vyzkoušejte základní akademickou pomoc bez platby.', button: 'Začít zdarma', pageLimit: 3, attachmentLimit: 1, promptLimit: 3, features: ['1 příloha', '2–3 prompty', 'Základní pomoc osobního akademického konzultanta'] },
        { id: 'seminar-work', kind: 'plan', label: 'SEMINÁRNÍ PRÁCE', name: 'Seminární, ročníková nebo zápočtová práce', price: '39 €', period: 'jednorázově', description: 'Ideální řešení pro seminární, ročníkové a zápočtové práce do 15 stran.', button: 'Koupit seminární práci', pageLimit: 15, attachmentLimit: 12, promptLimit: null, features: ['Vytvoření celé seminární práce', 'Pomoc při psaní jednotlivých kapitol', 'Metodické vedení během celé práce', 'Kontrola kvality a logiky textu', 'Humanizace textu', 'Návrh struktury a osnovy', 'Pomoc s citacemi a zdroji', 'Plánování práce', 'Příprava e-mailů pro vyučujícího', 'Vše v jednom systému'] },
        { id: 'bachelor-thesis', kind: 'plan', label: 'BAKALÁŘSKÁ PRÁCE', name: 'Kompletní řešení bakalářské práce', price: '149 €', period: 'jednorázově', description: 'Kompletní řešení od prvního zadání až po úspěšnou obhajobu bakalářské práce.', button: 'Koupit bakalářskou práci', highlighted: true, pageLimit: 50, attachmentLimit: 12, promptLimit: null, features: ['Vytvoření celé bakalářské práce', 'Metodické vedení během celého psaní', 'Kontrola kvality, logiky a konzistence textu', 'Humanizace textu', 'Pomoc se správnými citacemi a zdroji', 'Zpracování dotazníků a statistiky', 'Tvorba grafů a tabulek', 'Příprava prezentace k obhajobě', 'Příprava odpovědí na otázky komise', 'Plánování práce a termínů', 'Návrhy e-mailů pro školitele', 'Vše v jednom systému'] },
        { id: 'master-thesis', kind: 'plan', label: 'DIPLOMOVÁ / MAGISTERSKÁ PRÁCE', name: 'Nejkomplexnější balíček závěrečné práce', price: '189 €', period: 'jednorázově', description: 'Nejkomplexnější balíček pro náročné závěrečné práce s pokročilou metodikou a analýzou dat.', button: 'Koupit diplomovou práci', pageLimit: 70, attachmentLimit: 12, promptLimit: null, features: ['Vytvoření celé diplomové práce', 'Metodické vedení během celého procesu', 'Kontrola kvality a odbornosti textu', 'Humanizace textu', 'Pomoc se zdroji a citacemi', 'Komplexní zpracování statistiky', 'Deskriptivní statistika', 'Testování hypotéz', 'Korelační analýzy', 'Normalita dat', 'Tvorba grafů a tabulek', 'Příprava prezentace k obhajobě', 'Simulace otázek komise', 'Plánování celé práce', 'Komunikace se školitelem', 'Vše v jednom systému'] },
        { id: 'data-analysis', kind: 'addon', label: 'DOPLŇKOVÁ SLUŽBA', name: 'Analýza dat', price: '89 €', period: 'jednorázově', description: 'Kompletní zpracování statistické části práce.', button: 'Koupit analýzu dat', features: ['Zpracování dotazníků', 'Čištění dat', 'Deskriptivní statistika', 'Testování normality', 'Korelační analýzy', 'Frekvenční tabulky', 'Tvorba škál a subškál', 'Grafy'] },
        { id: 'extra-20', kind: 'addon', label: 'EXTRA ROZSAH', name: 'Extra 20 stran', price: '49 €', period: 'jednorázově', description: 'Rozšíření aktuálního projektu a balíčku o dalších 20 normostran.', button: 'Dokoupit 20 stran', extraPages: 20, features: ['Dalších 20 normostran pro aktuální projekt'] },
        { id: 'extra-40', kind: 'addon', label: 'EXTRA ROZSAH', name: 'Extra 40 stran', price: '89 €', period: 'jednorázově', description: 'Rozšíření aktuálního projektu a balíčku o dalších 40 normostran.', button: 'Dokoupit 40 stran', extraPages: 40, features: ['Dalších 40 normostran pro aktuální projekt'] },
        { id: 'extra-60', kind: 'addon', label: 'EXTRA ROZSAH', name: 'Extra 60 stran', price: '129 €', period: 'jednorázově', description: 'Rozšíření aktuálního projektu a balíčku o dalších 60 normostran.', button: 'Dokoupit 60 stran', extraPages: 60, features: ['Dalších 60 normostran pro aktuální projekt'] },
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
      subtitle: 'Writing a thesis does not have to mean months of stress. ZEDPERA guides you step by step from choosing a topic through writing, methodology, citations and data processing to a successful defense. Save dozens of hours, detect problems before your supervisor does and submit your work with confidence.',
      primary: 'Start',
      secondary: 'See demo',
      benefits: ['Personal consultant 24/7', 'Practical section and statistics', 'Citations and sources', 'Defense preparation'],
      stats: [['20', 'years of experience'], ['1000+', 'students'], ['24/7', 'academic support'], ['1', 'platform for the whole process']],
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
        { title: 'Personal academic consultant', text: 'Guides you throughout the project, checks logic and methodology and highlights weak points.' },
        { title: 'Critic', text: 'Provides immediate feedback, quality assessment and specific recommendations.' },
        { title: 'Thesis writing', text: 'Helps create the outline, chapters, introduction, conclusion and academic text based on your requirements.' },
        { title: 'Sources and citations', text: 'Helps with research, sources, citation formatting and the bibliography.' },
        { title: 'Data analysis', text: 'Questionnaire processing, descriptive statistics, normality testing, correlations, frequency tables, scales, subscales and charts.' },
        { title: 'Defense', text: 'Prepares the presentation, speaking notes, committee questions, answers and responses to reviews.' },
      ],
    },
    comparison: {
      title: 'Why are ChatGPT or other AI tools not enough?',
      subtitle: 'ChatGPT answers questions. ZEDPERA takes you all the way to a successfully submitted thesis.',
      badTitle: 'Generic AI',
      goodTitle: 'ZEDPERA',
      badItems: ['Answers individual questions.', 'Does not know your thesis or its history.', 'Every new chat starts almost from scratch.', 'Requires you to know what to ask.', 'Creates text but does not check the quality of the whole thesis.', 'Does not provide feedback like a thesis supervisor.', 'Does not create the practical section.', 'Does not prepare you for the defense.', 'Requires several separate tools.'],
      goodItems: ['Guides you from the assignment to the defense.', 'Remembers the entire project, all chapters and previous edits.', 'Keeps the whole project in one environment and understands its context.', 'Proactively flags methodological errors, weak points and inconsistencies.', 'Continuously assesses quality and recommends concrete improvements.', 'Simulates an experienced supervisor and provides methodological guidance.', 'Prepares complete statistics, charts and tables ready for the thesis.', 'Creates the presentation and complete defense speaking notes.', 'Everything is handled in one system.'],
      closing: 'ChatGPT is an excellent helper. ZEDPERA is a complete system for creating final theses.',
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
          text: 'Check quality, sources and methodology and prepare for defense.',
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
      title: 'Student experiences with ZEDPERA',
      items: [
        { text: 'My supervisor returned my bachelor thesis with more than 20 comments. ZEDPERA helped me address them in one evening and explained why each change was needed.', name: 'Bachelor thesis student' },
        { text: 'I feared the practical section most. I uploaded my questionnaire and ZEDPERA prepared tables, charts and an interpretation of the results in about an hour.', name: 'Practical-section student' },
        { text: 'With ChatGPT I had to explain the topic again for every question. ZEDPERA knew my whole project, remembered every chapter and kept its recommendations connected.', name: 'Student after using ChatGPT' },
        { text: 'Before submission ZEDPERA found illogical parts of my methodology and missing citations. I submitted the thesis with much more confidence.', name: 'Student before submission' },
        { text: 'ZEDPERA prepared my presentation, likely committee questions and suggested answers. I went into the defense feeling much calmer.', name: 'Student before defense' },
        { text: 'While working and caring for two children, ZEDPERA helped me plan every chapter so I always knew exactly what to do next.', name: 'Part-time student and parent' },
      ],
    },
    pricing: {
      title: 'Choose a package by thesis type and scope',
      fullOfferText: 'View the complete pricing',
      fullOfferHint: 'One-time packages without automatic monthly renewal.',
      emailPrompt: 'Enter the email address linked to the payment:',
      emailRequired: 'An email is required to continue to payment.',
      invalidPlan: 'Invalid package or add-on',
      checkoutFailed: 'Payment could not be created.',
      noStripeUrl: 'Stripe did not generate a payment URL.',
      plans: [
        { id: 'free', kind: 'free', label: 'FREE', name: 'Free version', price: '0 €', period: 'forever', description: 'Try basic academic support without payment.', button: 'Start free', pageLimit: 3, attachmentLimit: 1, promptLimit: 3, features: ['1 attachment', '2–3 prompts', 'Basic support from a personal academic consultant'] },
        { id: 'seminar-work', kind: 'plan', label: 'SEMINAR PAPER', name: 'Seminar, course or credit paper', price: '39 €', period: 'one-time', description: 'An ideal solution for seminar, course and credit papers up to 15 pages.', button: 'Buy seminar package', pageLimit: 15, attachmentLimit: 12, promptLimit: null, features: ['Creation of the complete seminar paper', 'Help with writing individual chapters', 'Methodological guidance throughout the work', 'Quality and logic checks', 'Text humanization', 'Structure and outline proposal', 'Help with citations and sources', 'Work planning', 'Draft emails for the lecturer', 'Everything in one system'] },
        { id: 'bachelor-thesis', kind: 'plan', label: 'BACHELOR THESIS', name: 'Complete bachelor thesis solution', price: '149 €', period: 'one-time', description: 'A complete solution from the first assignment to a successful bachelor thesis defense.', button: 'Buy bachelor package', highlighted: true, pageLimit: 50, attachmentLimit: 12, promptLimit: null, features: ['Creation of the complete bachelor thesis', 'Methodological guidance throughout writing', 'Quality, logic and consistency checks', 'Text humanization', 'Correct citations and sources', 'Questionnaire and statistical processing', 'Charts and tables', 'Defense presentation preparation', 'Answers to committee questions', 'Planning and deadlines', 'Draft emails for the supervisor', 'Everything in one system'] },
        { id: 'master-thesis', kind: 'plan', label: 'MASTER THESIS', name: 'The most comprehensive final-thesis package', price: '189 €', period: 'one-time', description: 'The most comprehensive package for demanding final theses with advanced methodology and data analysis.', button: 'Buy master package', pageLimit: 70, attachmentLimit: 12, promptLimit: null, features: ['Creation of the complete master thesis', 'Methodological guidance throughout the process', 'Quality and academic rigor checks', 'Text humanization', 'Sources and citations', 'Comprehensive statistical processing', 'Descriptive statistics', 'Hypothesis testing', 'Correlation analyses', 'Data normality', 'Charts and tables', 'Defense presentation preparation', 'Committee-question simulation', 'Complete work planning', 'Supervisor communication', 'Everything in one system'] },
        { id: 'data-analysis', kind: 'addon', label: 'ADD-ON SERVICE', name: 'Data analysis', price: '89 €', period: 'one-time', description: 'Complete processing of the statistical part of the thesis.', button: 'Buy data analysis', features: ['Questionnaire processing', 'Data cleaning', 'Descriptive statistics', 'Normality testing', 'Correlation analyses', 'Frequency tables', 'Scales and subscales', 'Charts'] },
        { id: 'extra-20', kind: 'addon', label: 'EXTRA SCOPE', name: 'Extra 20 pages', price: '49 €', period: 'one-time', description: 'Extend the current project and package by another 20 standard pages.', button: 'Add 20 pages', extraPages: 20, features: ['20 additional standard pages for the current project'] },
        { id: 'extra-40', kind: 'addon', label: 'EXTRA SCOPE', name: 'Extra 40 pages', price: '89 €', period: 'one-time', description: 'Extend the current project and package by another 40 standard pages.', button: 'Add 40 pages', extraPages: 40, features: ['40 additional standard pages for the current project'] },
        { id: 'extra-60', kind: 'addon', label: 'EXTRA SCOPE', name: 'Extra 60 pages', price: '129 €', period: 'one-time', description: 'Extend the current project and package by another 60 standard pages.', button: 'Add 60 pages', extraPages: 60, features: ['60 additional standard pages for the current project'] },
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
      subtitle: 'Das Schreiben einer Abschlussarbeit muss nicht monatelangen Stress bedeuten. ZEDPERA begleitet Sie Schritt für Schritt von der Themenwahl über Schreiben, Methodik, Zitate und Datenverarbeitung bis zur erfolgreichen Verteidigung. Sparen Sie viele Stunden und erkennen Sie Fehler, bevor Ihr Betreuer sie findet.',
      primary: 'Starten',
      secondary: 'Demo ansehen',
      benefits: ['Persönlicher Berater 24/7', 'Praxisteil und Statistik', 'Zitate und Quellen', 'Vorbereitung auf die Verteidigung'],
      stats: [['20', 'Jahre Erfahrung'], ['1000+', 'Studierende'], ['24/7', 'akademische Unterstützung'], ['1', 'Plattform für den gesamten Prozess']],
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
        { title: 'Persönlicher akademischer Berater', text: 'Begleitet Sie durch die gesamte Arbeit, prüft Logik und Methodik und weist auf Schwächen hin.' },
        { title: 'Kritiker', text: 'Bietet sofortiges Feedback, Qualitätsbewertung und konkrete Empfehlungen.' },
        { title: 'Schreiben der Arbeit', text: 'Hilft bei Gliederung, Kapiteln, Einleitung, Schluss und fachlichem Text.' },
        { title: 'Quellen und Zitate', text: 'Unterstützt Recherche, Quellenarbeit, Zitation und Literaturverzeichnis.' },
        { title: 'Datenanalyse', text: 'Fragebogenauswertung, deskriptive Statistik, Normalitätstests, Korrelationen, Häufigkeitstabellen, Skalen, Subskalen und Diagramme.' },
        { title: 'Verteidigung', text: 'Erstellt Präsentation, Sprechtext, mögliche Kommissionsfragen, Antworten und Reaktionen auf Gutachten.' },
      ],
    },
    comparison: {
      title: 'Warum reichen ChatGPT oder andere KI-Tools nicht aus?',
      subtitle: 'ChatGPT beantwortet Fragen. ZEDPERA begleitet Sie bis zur erfolgreich eingereichten Arbeit.',
      badTitle: 'Allgemeine KI',
      goodTitle: 'ZEDPERA',
      badItems: ['Beantwortet einzelne Fragen.', 'Kennt Ihre Arbeit und deren Verlauf nicht.', 'Jeder neue Chat beginnt fast von vorne.', 'Sie müssen selbst wissen, was Sie fragen sollen.', 'Erstellt Text, prüft aber nicht die Qualität der gesamten Arbeit.', 'Gibt kein Feedback wie ein Betreuer.', 'Erstellt keinen praktischen Teil.', 'Bereitet Sie nicht auf die Verteidigung vor.', 'Sie benötigen mehrere Werkzeuge.'],
      goodItems: ['Begleitet Sie von der Aufgabenstellung bis zur Verteidigung.', 'Merkt sich das gesamte Projekt, alle Kapitel und Änderungen.', 'Das Projekt bleibt in einer Umgebung und der Kontext bleibt erhalten.', 'Weist selbstständig auf methodische Fehler, Schwächen und Widersprüche hin.', 'Bewertet laufend die Qualität und empfiehlt konkrete Verbesserungen.', 'Simuliert einen erfahrenen Betreuer und bietet methodische Führung.', 'Erstellt vollständige Statistiken, Diagramme und Tabellen für die Arbeit.', 'Erstellt Präsentation und vollständigen Begleittext zur Verteidigung.', 'Alles wird in einem System erledigt.'],
      closing: 'ChatGPT ist ein hervorragender Helfer. ZEDPERA ist ein vollständiges System zur Erstellung von Abschlussarbeiten.',
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
      title: 'Erfahrungen von Studierenden mit ZEDPERA',
      items: [
        { text: 'Mein Betreuer gab meine Bachelorarbeit mit mehr als 20 Anmerkungen zurück. ZEDPERA half mir, sie an einem Abend einzuarbeiten und erklärte die Gründe.', name: 'Bachelorstudent' },
        { text: 'Ich hatte am meisten Angst vor dem praktischen Teil. Nach dem Upload des Fragebogens erstellte ZEDPERA Tabellen, Diagramme und die Ergebnisinterpretation.', name: 'Student im Praxisteil' },
        { text: 'Bei ChatGPT musste ich das Thema ständig neu erklären. ZEDPERA kannte mein gesamtes Projekt und verband alle Empfehlungen miteinander.', name: 'Student nach ChatGPT-Erfahrung' },
        { text: 'Vor der Abgabe fand ZEDPERA unlogische Teile der Methodik und fehlende Zitate. Dadurch war ich bei der Abgabe viel sicherer.', name: 'Student vor der Abgabe' },
        { text: 'ZEDPERA bereitete Präsentation, mögliche Kommissionsfragen und Antwortvorschläge vor. Ich ging viel ruhiger in die Verteidigung.', name: 'Student vor der Verteidigung' },
        { text: 'Neben Arbeit und zwei Kindern half mir ZEDPERA bei der Kapitelplanung, sodass ich immer genau wusste, was als Nächstes zu tun war.', name: 'Berufsbegleitender Student und Elternteil' },
      ],
    },
    pricing: {
      title: 'Wählen Sie ein Paket nach Art und Umfang der Arbeit',
      fullOfferText: 'Vollständige Preise anzeigen',
      fullOfferHint: 'Einmalige Pakete ohne automatische monatliche Verlängerung.',
      emailPrompt: 'Geben Sie die E-Mail-Adresse für die Zahlung ein:',
      emailRequired: 'Für die Zahlung ist eine E-Mail-Adresse erforderlich.',
      invalidPlan: 'Ungültiges Paket oder Zusatzleistung',
      checkoutFailed: 'Zahlung konnte nicht erstellt werden.',
      noStripeUrl: 'Stripe hat keine Zahlungs-URL generiert.',
      plans: [
        { id: 'free', kind: 'free', label: 'FREE', name: 'Kostenlose Version', price: '0 €', period: 'dauerhaft', description: 'Testen Sie die grundlegende akademische Unterstützung kostenlos.', button: 'Kostenlos starten', pageLimit: 3, attachmentLimit: 1, promptLimit: 3, features: ['1 Anhang', '2–3 Prompts', 'Grundlegende Unterstützung durch einen persönlichen akademischen Berater'] },
        { id: 'seminar-work', kind: 'plan', label: 'SEMINARARBEIT', name: 'Seminar-, Jahres- oder Leistungsarbeit', price: '39 €', period: 'einmalig', description: 'Ideal für Seminar-, Jahres- und Leistungsarbeiten bis 15 Seiten.', button: 'Seminarpaket kaufen', pageLimit: 15, attachmentLimit: 12, promptLimit: null, features: ['Erstellung der vollständigen Seminararbeit', 'Hilfe beim Schreiben einzelner Kapitel', 'Methodische Begleitung', 'Qualitäts- und Logikprüfung', 'Humanisierung des Textes', 'Struktur- und Gliederungsvorschlag', 'Quellen und Zitate', 'Arbeitsplanung', 'E-Mail-Entwürfe für Lehrende', 'Alles in einem System'] },
        { id: 'bachelor-thesis', kind: 'plan', label: 'BACHELORARBEIT', name: 'Komplettlösung für die Bachelorarbeit', price: '149 €', period: 'einmalig', description: 'Komplette Unterstützung von der ersten Aufgabe bis zur erfolgreichen Verteidigung.', button: 'Bachelorpaket kaufen', highlighted: true, pageLimit: 50, attachmentLimit: 12, promptLimit: null, features: ['Erstellung der vollständigen Bachelorarbeit', 'Methodische Begleitung während des Schreibens', 'Qualitäts-, Logik- und Konsistenzprüfung', 'Humanisierung des Textes', 'Korrekte Zitate und Quellen', 'Fragebogen- und Statistikverarbeitung', 'Diagramme und Tabellen', 'Präsentation zur Verteidigung', 'Antworten auf Kommissionsfragen', 'Planung und Termine', 'E-Mail-Entwürfe für den Betreuer', 'Alles in einem System'] },
        { id: 'master-thesis', kind: 'plan', label: 'MASTERARBEIT', name: 'Das umfassendste Abschlussarbeitspaket', price: '189 €', period: 'einmalig', description: 'Das umfassendste Paket für anspruchsvolle Arbeiten mit fortgeschrittener Methodik und Datenanalyse.', button: 'Masterpaket kaufen', pageLimit: 70, attachmentLimit: 12, promptLimit: null, features: ['Erstellung der vollständigen Masterarbeit', 'Methodische Begleitung des gesamten Prozesses', 'Qualitäts- und Fachlichkeitsprüfung', 'Humanisierung des Textes', 'Quellen und Zitate', 'Umfassende statistische Verarbeitung', 'Deskriptive Statistik', 'Hypothesentests', 'Korrelationsanalysen', 'Daten-Normalität', 'Diagramme und Tabellen', 'Präsentation zur Verteidigung', 'Simulation von Kommissionsfragen', 'Vollständige Arbeitsplanung', 'Kommunikation mit dem Betreuer', 'Alles in einem System'] },
        { id: 'data-analysis', kind: 'addon', label: 'ZUSATZLEISTUNG', name: 'Datenanalyse', price: '89 €', period: 'einmalig', description: 'Vollständige Bearbeitung des statistischen Teils der Arbeit.', button: 'Datenanalyse kaufen', features: ['Fragebogenauswertung', 'Datenbereinigung', 'Deskriptive Statistik', 'Normalitätstests', 'Korrelationsanalysen', 'Häufigkeitstabellen', 'Skalen und Subskalen', 'Diagramme'] },
        { id: 'extra-20', kind: 'addon', label: 'EXTRA-UMFANG', name: 'Extra 20 Seiten', price: '49 €', period: 'einmalig', description: 'Erweiterung des aktuellen Projekts um weitere 20 Normseiten.', button: '20 Seiten hinzufügen', extraPages: 20, features: ['20 zusätzliche Normseiten für das aktuelle Projekt'] },
        { id: 'extra-40', kind: 'addon', label: 'EXTRA-UMFANG', name: 'Extra 40 Seiten', price: '89 €', period: 'einmalig', description: 'Erweiterung des aktuellen Projekts um weitere 40 Normseiten.', button: '40 Seiten hinzufügen', extraPages: 40, features: ['40 zusätzliche Normseiten für das aktuelle Projekt'] },
        { id: 'extra-60', kind: 'addon', label: 'EXTRA-UMFANG', name: 'Extra 60 Seiten', price: '129 €', period: 'einmalig', description: 'Erweiterung des aktuellen Projekts um weitere 60 Normseiten.', button: '60 Seiten hinzufügen', extraPages: 60, features: ['60 zusätzliche Normseiten für das aktuelle Projekt'] },
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
      subtitle: 'Pisanie pracy dyplomowej nie musi oznaczać miesięcy stresu. ZEDPERA prowadzi krok po kroku od wyboru tematu przez pisanie, metodologię, cytowania i analizę danych aż po udaną obronę. Oszczędź dziesiątki godzin i wykryj błędy, zanim zrobi to promotor.',
      primary: 'Zacznij',
      secondary: 'Zobacz demo',
      benefits: ['Osobisty konsultant 24/7', 'Część praktyczna i statystyka', 'Cytowania i źródła', 'Przygotowanie do obrony'],
      stats: [['20', 'lat doświadczenia'], ['1000+', 'studentów'], ['24/7', 'wsparcie akademickie'], ['1', 'platforma dla całego procesu']],
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
        { title: 'Osobisty konsultant akademicki', text: 'Prowadzi przez całą pracę, sprawdza logikę i metodologię oraz wskazuje słabe miejsca.' },
        { title: 'Krytyk', text: 'Zapewnia natychmiastową informację zwrotną, ocenę jakości i konkretne zalecenia.' },
        { title: 'Pisanie pracy', text: 'Pomaga stworzyć plan, rozdziały, wstęp, zakończenie i tekst naukowy.' },
        { title: 'Źródła i cytowania', text: 'Pomaga w researchu, pracy ze źródłami, cytowaniu i bibliografii.' },
        { title: 'Analiza danych', text: 'Opracowanie ankiet, statystyka opisowa, testy normalności, korelacje, tabele częstości, skale, podskale i wykresy.' },
        { title: 'Obrona', text: 'Przygotowuje prezentację, tekst wystąpienia, pytania komisji, odpowiedzi i reakcje na recenzje.' },
      ],
    },
    comparison: {
      title: 'Dlaczego ChatGPT lub inne AI nie wystarczą?',
      subtitle: 'ChatGPT odpowiada na pytania. ZEDPERA prowadzi aż do pomyślnie oddanej pracy.',
      badTitle: 'Zwykła AI',
      goodTitle: 'ZEDPERA',
      badItems: ['Odpowiada na pojedyncze pytania.', 'Nie zna Twojej pracy ani jej historii.', 'Każdy nowy czat zaczyna prawie od początku.', 'Musisz wiedzieć, o co zapytać.', 'Tworzy tekst, ale nie sprawdza jakości całej pracy.', 'Nie daje informacji zwrotnej jak promotor.', 'Nie tworzy części praktycznej.', 'Nie przygotowuje do obrony.', 'Musisz używać wielu narzędzi.'],
      goodItems: ['Prowadzi od zadania aż po obronę.', 'Pamięta cały projekt, wszystkie rozdziały i wcześniejsze zmiany.', 'Projekt pozostaje w jednym środowisku i zachowuje kontekst.', 'Samodzielnie wskazuje błędy metodologiczne, słabe miejsca i niespójności.', 'Na bieżąco ocenia jakość i zaleca konkretne ulepszenia.', 'Symuluje doświadczonego promotora i zapewnia wsparcie metodologiczne.', 'Przygotowuje pełne statystyki, wykresy i tabele gotowe do pracy.', 'Tworzy prezentację i pełny tekst wystąpienia na obronę.', 'Wszystko załatwisz w jednym systemie.'],
      closing: 'ChatGPT jest świetnym pomocnikiem. ZEDPERA to kompletny system do tworzenia prac dyplomowych.',
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
          text: 'Sprawdzasz jakość, źródła i metodologię oraz przygotowujesz się do obrony.',
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
      title: 'Doświadczenia studentów z ZEDPERĄ',
      items: [
        { text: 'Promotor zwrócił moją pracę licencjacką z ponad 20 uwagami. ZEDPERA pomogła mi je wdrożyć w jeden wieczór i wyjaśniła, dlaczego są potrzebne.', name: 'Student pracy licencjackiej' },
        { text: 'Najbardziej obawiałem się części praktycznej. Po przesłaniu ankiety ZEDPERA przygotowała tabele, wykresy i interpretację wyników.', name: 'Student części praktycznej' },
        { text: 'W ChatGPT musiałem za każdym razem ponownie tłumaczyć temat. ZEDPERA znała cały projekt i pamiętała wszystkie rozdziały.', name: 'Student po korzystaniu z ChatGPT' },
        { text: 'Przed oddaniem ZEDPERA znalazła nielogiczne fragmenty metodologii i brakujące cytowania. Oddawałem pracę z dużo większą pewnością.', name: 'Student przed oddaniem' },
        { text: 'ZEDPERA przygotowała prezentację, możliwe pytania komisji i propozycje odpowiedzi. Na obronę poszedłem znacznie spokojniejszy.', name: 'Student przed obroną' },
        { text: 'Przy pracy i dwójce dzieci ZEDPERA pomogła mi zaplanować rozdziały, dzięki czemu zawsze wiedziałem, co robić dalej.', name: 'Student zaoczny i rodzic' },
      ],
    },
    pricing: {
      title: 'Wybierz pakiet według typu i zakresu pracy',
      fullOfferText: 'Zobacz pełny cennik',
      fullOfferHint: 'Pakiety jednorazowe bez automatycznego odnawiania co miesiąc.',
      emailPrompt: 'Podaj e-mail powiązany z płatnością:',
      emailRequired: 'E-mail jest wymagany, aby przejść do płatności.',
      invalidPlan: 'Nieprawidłowy pakiet lub dodatek',
      checkoutFailed: 'Nie udało się utworzyć płatności.',
      noStripeUrl: 'Stripe nie wygenerował adresu płatności.',
      plans: [
        { id: 'free', kind: 'free', label: 'FREE', name: 'Wersja bezpłatna', price: '0 €', period: 'na zawsze', description: 'Wypróbuj podstawowe wsparcie akademickie bez opłat.', button: 'Zacznij bezpłatnie', pageLimit: 3, attachmentLimit: 1, promptLimit: 3, features: ['1 załącznik', '2–3 prompty', 'Podstawowa pomoc osobistego konsultanta akademickiego'] },
        { id: 'seminar-work', kind: 'plan', label: 'PRACA SEMESTRALNA', name: 'Praca semestralna, roczna lub zaliczeniowa', price: '39 €', period: 'jednorazowo', description: 'Idealne rozwiązanie dla prac semestralnych, rocznych i zaliczeniowych do 15 stron.', button: 'Kup pakiet semestralny', pageLimit: 15, attachmentLimit: 12, promptLimit: null, features: ['Utworzenie całej pracy semestralnej', 'Pomoc przy pisaniu rozdziałów', 'Wsparcie metodologiczne', 'Kontrola jakości i logiki', 'Humanizacja tekstu', 'Propozycja struktury i planu', 'Cytowania i źródła', 'Planowanie pracy', 'Projekty e-maili do wykładowcy', 'Wszystko w jednym systemie'] },
        { id: 'bachelor-thesis', kind: 'plan', label: 'PRACA LICENCJACKA', name: 'Kompletne rozwiązanie pracy licencjackiej', price: '149 €', period: 'jednorazowo', description: 'Kompletna pomoc od pierwszego zadania aż po udaną obronę pracy licencjackiej.', button: 'Kup pakiet licencjacki', highlighted: true, pageLimit: 50, attachmentLimit: 12, promptLimit: null, features: ['Utworzenie całej pracy licencjackiej', 'Wsparcie metodologiczne przez cały proces', 'Kontrola jakości, logiki i spójności', 'Humanizacja tekstu', 'Poprawne cytowania i źródła', 'Opracowanie ankiet i statystyki', 'Wykresy i tabele', 'Prezentacja na obronę', 'Odpowiedzi na pytania komisji', 'Planowanie i terminy', 'Projekty e-maili do promotora', 'Wszystko w jednym systemie'] },
        { id: 'master-thesis', kind: 'plan', label: 'PRACA MAGISTERSKA', name: 'Najbardziej kompleksowy pakiet pracy dyplomowej', price: '189 €', period: 'jednorazowo', description: 'Najbardziej kompleksowy pakiet dla wymagających prac z zaawansowaną metodologią i analizą danych.', button: 'Kup pakiet magisterski', pageLimit: 70, attachmentLimit: 12, promptLimit: null, features: ['Utworzenie całej pracy magisterskiej', 'Wsparcie metodologiczne przez cały proces', 'Kontrola jakości i poziomu naukowego', 'Humanizacja tekstu', 'Źródła i cytowania', 'Kompleksowa analiza statystyczna', 'Statystyka opisowa', 'Testowanie hipotez', 'Analizy korelacyjne', 'Normalność danych', 'Wykresy i tabele', 'Prezentacja na obronę', 'Symulacja pytań komisji', 'Planowanie całej pracy', 'Komunikacja z promotorem', 'Wszystko w jednym systemie'] },
        { id: 'data-analysis', kind: 'addon', label: 'USŁUGA DODATKOWA', name: 'Analiza danych', price: '89 €', period: 'jednorazowo', description: 'Kompletne opracowanie części statystycznej pracy.', button: 'Kup analizę danych', features: ['Opracowanie ankiet', 'Czyszczenie danych', 'Statystyka opisowa', 'Testowanie normalności', 'Analizy korelacyjne', 'Tabele częstości', 'Skale i podskale', 'Wykresy'] },
        { id: 'extra-20', kind: 'addon', label: 'DODATKOWY ZAKRES', name: 'Extra 20 stron', price: '49 €', period: 'jednorazowo', description: 'Rozszerzenie aktualnego projektu o kolejne 20 stron standardowych.', button: 'Dodaj 20 stron', extraPages: 20, features: ['20 dodatkowych stron dla aktualnego projektu'] },
        { id: 'extra-40', kind: 'addon', label: 'DODATKOWY ZAKRES', name: 'Extra 40 stron', price: '89 €', period: 'jednorazowo', description: 'Rozszerzenie aktualnego projektu o kolejne 40 stron standardowych.', button: 'Dodaj 40 stron', extraPages: 40, features: ['40 dodatkowych stron dla aktualnego projektu'] },
        { id: 'extra-60', kind: 'addon', label: 'DODATKOWY ZAKRES', name: 'Extra 60 stron', price: '129 €', period: 'jednorazowo', description: 'Rozszerzenie aktualnego projektu o kolejne 60 stron standardowych.', button: 'Dodaj 60 stron', extraPages: 60, features: ['60 dodatkowych stron dla aktualnego projektu'] },
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
      title2: 'amely végigkísér',
      title3: 'a feladattól a védésig',
      subtitle: 'A szakdolgozatírásnak nem kell hónapokig tartó stresszt jelentenie. A ZEDPERA lépésről lépésre végigvezet a témaválasztástól az íráson, módszertanon, hivatkozásokon és adatelemzésen át a sikeres védésig. Takaríts meg több tucat munkaórát, és találd meg a hibákat még a témavezetőd előtt.',
      primary: 'Kezdés',
      secondary: 'Bemutató',
      benefits: ['Személyes tanácsadó 24/7', 'Gyakorlati rész és statisztika', 'Hivatkozások és források', 'Felkészülés a védésre'],
      stats: [['20', 'év tapasztalat'], ['1000+', 'hallgató'], ['24/7', 'akadémiai támogatás'], ['1', 'platform a teljes folyamathoz']],
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
      title: 'Minden, ami a sikeres dolgozathoz szükséges',
      items: [
        { title: 'Személyes akadémiai tanácsadó', text: 'Végigvezet a teljes munkán, ellenőrzi a logikát és módszertant, és jelzi a gyenge pontokat.' },
        { title: 'Kritikus', text: 'Azonnali visszajelzést, minőségi értékelést és konkrét javaslatokat ad.' },
        { title: 'Dolgozatírás', text: 'Segít a vázlat, fejezetek, bevezetés, összegzés és szakmai szöveg elkészítésében.' },
        { title: 'Források és hivatkozások', text: 'Segít a kutatásban, forráskezelésben, hivatkozásban és bibliográfiában.' },
        { title: 'Adatelemzés', text: 'Kérdőívek feldolgozása, leíró statisztika, normalitásvizsgálat, korrelációk, gyakorisági táblák, skálák, alskálák és grafikonok.' },
        { title: 'Védés', text: 'Elkészíti a prezentációt, előadói szöveget, bizottsági kérdéseket, válaszokat és bírálati reakciókat.' },
      ],
    },
    comparison: {
      title: 'Miért nem elég a ChatGPT vagy más AI?',
      subtitle: 'A ChatGPT kérdésekre válaszol. A ZEDPERA elvezet a sikeresen beadott dolgozatig.',
      badTitle: 'Általános AI',
      goodTitle: 'ZEDPERA',
      badItems: ['Egyedi kérdésekre válaszol.', 'Nem ismeri a dolgozatodat és annak előzményeit.', 'Minden új beszélgetés majdnem elölről indul.', 'Neked kell tudnod, mit kérdezz.', 'Szöveget készít, de nem ellenőrzi a teljes dolgozat minőségét.', 'Nem ad témavezetői visszajelzést.', 'Nem készíti el a gyakorlati részt.', 'Nem készít fel a védésre.', 'Több külön eszközt kell használnod.'],
      goodItems: ['A feladattól a védésig végigvezet.', 'Emlékszik a teljes projektre, fejezetekre és korábbi módosításokra.', 'A projekt egy környezetben marad, és ismeri a kontextust.', 'Önállóan jelzi a módszertani hibákat, gyenge pontokat és ellentmondásokat.', 'Folyamatosan értékeli a minőséget és konkrét fejlesztéseket javasol.', 'Tapasztalt témavezetőt szimulál és módszertani útmutatást ad.', 'Teljes statisztikát, grafikonokat és táblázatokat készít a dolgozathoz.', 'Elkészíti a prezentációt és a teljes védési előadói szöveget.', 'Mindent egy rendszerben intézhetsz.'],
      closing: 'A ChatGPT kiváló segítő. A ZEDPERA teljes rendszer a szakdolgozatok elkészítéséhez.',
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
          text: 'Ellenőrzöd a minőséget, forrásokat és módszertant, majd felkészülsz a védésre.',
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
      title: 'Hallgatói tapasztalatok a ZEDPERÁVAL',
      items: [
        { text: 'A témavezetőm több mint 20 megjegyzéssel küldte vissza a dolgozatomat. A ZEDPERA egy este alatt segített beépíteni őket és elmagyarázta az okokat.', name: 'Alapképzéses hallgató' },
        { text: 'A gyakorlati résztől féltem a legjobban. A kérdőív feltöltése után a ZEDPERA táblázatokat, grafikonokat és eredményértelmezést készített.', name: 'Gyakorlati részt készítő hallgató' },
        { text: 'A ChatGPT-ben minden kérdésnél újra el kellett magyaráznom a témát. A ZEDPERA ismerte az egész projektet és emlékezett a fejezetekre.', name: 'Hallgató ChatGPT-tapasztalattal' },
        { text: 'Beadás előtt a ZEDPERA logikátlan módszertani részeket és hiányzó hivatkozásokat talált. Sokkal magabiztosabban adtam be.', name: 'Hallgató beadás előtt' },
        { text: 'A ZEDPERA elkészítette a prezentációt, a lehetséges kérdéseket és válaszjavaslatokat. Sokkal nyugodtabban mentem a védésre.', name: 'Hallgató védés előtt' },
        { text: 'Munka és két gyermek mellett a ZEDPERA segített megtervezni a fejezeteket, így mindig pontosan tudtam, mi a következő lépés.', name: 'Levelezős hallgató és szülő' },
      ],
    },
    pricing: {
      title: 'Válassz csomagot a dolgozat típusa és terjedelme szerint',
      fullOfferText: 'Teljes árlista megtekintése',
      fullOfferHint: 'Egyszeri csomagok automatikus havi megújítás nélkül.',
      emailPrompt: 'Add meg a fizetéshez tartozó e-mail-címet:',
      emailRequired: 'A fizetés folytatásához e-mail-cím szükséges.',
      invalidPlan: 'Érvénytelen csomag vagy kiegészítő',
      checkoutFailed: 'A fizetés létrehozása sikertelen.',
      noStripeUrl: 'A Stripe nem hozott létre fizetési URL-t.',
      plans: [
        { id: 'free', kind: 'free', label: 'FREE', name: 'Ingyenes verzió', price: '0 €', period: 'örökre', description: 'Próbáld ki az alapvető akadémiai támogatást fizetés nélkül.', button: 'Ingyenes kezdés', pageLimit: 3, attachmentLimit: 1, promptLimit: 3, features: ['1 melléklet', '2–3 prompt', 'Alapvető személyes akadémiai tanácsadás'] },
        { id: 'seminar-work', kind: 'plan', label: 'SZEMINÁRIUMI DOLGOZAT', name: 'Szemináriumi, évfolyam- vagy beszámoló dolgozat', price: '39 €', period: 'egyszeri', description: 'Ideális megoldás legfeljebb 15 oldalas szemináriumi és évfolyamdolgozatokhoz.', button: 'Szemináriumi csomag megvásárlása', pageLimit: 15, attachmentLimit: 12, promptLimit: null, features: ['A teljes szemináriumi dolgozat elkészítése', 'Segítség az egyes fejezetek írásában', 'Módszertani támogatás', 'Minőség- és logikaellenőrzés', 'Szöveghumanizálás', 'Szerkezet- és vázlatjavaslat', 'Források és hivatkozások', 'Munkatervezés', 'E-mail-tervezetek az oktatónak', 'Minden egy rendszerben'] },
        { id: 'bachelor-thesis', kind: 'plan', label: 'ALAPKÉPZÉSES SZAKDOLGOZAT', name: 'Teljes megoldás az alapképzéses szakdolgozathoz', price: '149 €', period: 'egyszeri', description: 'Teljes támogatás az első feladattól a sikeres védésig.', button: 'Alapképzéses csomag megvásárlása', highlighted: true, pageLimit: 50, attachmentLimit: 12, promptLimit: null, features: ['A teljes szakdolgozat elkészítése', 'Módszertani támogatás az írás során', 'Minőség-, logika- és konzisztenciaellenőrzés', 'Szöveghumanizálás', 'Helyes hivatkozások és források', 'Kérdőívek és statisztika feldolgozása', 'Grafikonok és táblázatok', 'Védési prezentáció', 'Válaszok a bizottság kérdéseire', 'Tervezés és határidők', 'E-mail-tervezetek a témavezetőnek', 'Minden egy rendszerben'] },
        { id: 'master-thesis', kind: 'plan', label: 'MESTERKÉPZÉSES SZAKDOLGOZAT', name: 'A legteljesebb záródolgozati csomag', price: '189 €', period: 'egyszeri', description: 'A legátfogóbb csomag fejlett módszertant és adatelemzést igénylő dolgozatokhoz.', button: 'Mesterképzéses csomag megvásárlása', pageLimit: 70, attachmentLimit: 12, promptLimit: null, features: ['A teljes mesterszakos dolgozat elkészítése', 'Módszertani támogatás a teljes folyamatban', 'Minőségi és szakmai ellenőrzés', 'Szöveghumanizálás', 'Források és hivatkozások', 'Komplex statisztikai feldolgozás', 'Leíró statisztika', 'Hipotézisvizsgálat', 'Korrelációelemzés', 'Adatnormalitás', 'Grafikonok és táblázatok', 'Védési prezentáció', 'Bizottsági kérdések szimulációja', 'A teljes munka megtervezése', 'Kommunikáció a témavezetővel', 'Minden egy rendszerben'] },
        { id: 'data-analysis', kind: 'addon', label: 'KIEGÉSZÍTŐ SZOLGÁLTATÁS', name: 'Adatelemzés', price: '89 €', period: 'egyszeri', description: 'A dolgozat statisztikai részének teljes feldolgozása.', button: 'Adatelemzés megvásárlása', features: ['Kérdőívek feldolgozása', 'Adattisztítás', 'Leíró statisztika', 'Normalitásvizsgálat', 'Korrelációelemzés', 'Gyakorisági táblák', 'Skálák és alskálák', 'Grafikonok'] },
        { id: 'extra-20', kind: 'addon', label: 'EXTRA TERJEDELEM', name: 'Extra 20 oldal', price: '49 €', period: 'egyszeri', description: 'Az aktuális projekt bővítése további 20 szabványoldallal.', button: '20 oldal hozzáadása', extraPages: 20, features: ['20 további szabványoldal az aktuális projekthez'] },
        { id: 'extra-40', kind: 'addon', label: 'EXTRA TERJEDELEM', name: 'Extra 40 oldal', price: '89 €', period: 'egyszeri', description: 'Az aktuális projekt bővítése további 40 szabványoldallal.', button: '40 oldal hozzáadása', extraPages: 40, features: ['40 további szabványoldal az aktuális projekthez'] },
        { id: 'extra-60', kind: 'addon', label: 'EXTRA TERJEDELEM', name: 'Extra 60 oldal', price: '129 €', period: 'egyszeri', description: 'Az aktuális projekt bővítése további 60 szabványoldallal.', button: '60 oldal hozzáadása', extraPages: 60, features: ['60 további szabványoldal az aktuális projekthez'] },
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


type BlogCopy = {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyText: string;
  button: string;
};

const blogCopies: Record<AppLanguage, BlogCopy> = {
  sk: {
    title: 'Blog',
    subtitle: 'Praktické články k akademickému písaniu, práci so zdrojmi, metodike a obhajobe.',
    emptyTitle: 'Prvý článok pripravujeme',
    emptyText: 'Sekcia blog je pripravená. Články zobrazíme až vtedy, keď budú finálne napísané a schválené.',
    button: 'Otvoriť blog',
  },
  cs: {
    title: 'Blog',
    subtitle: 'Praktické články k akademickému psaní, práci se zdroji, metodice a obhajobě.',
    emptyTitle: 'První článek připravujeme',
    emptyText: 'Sekce blog je připravena. Články zobrazíme až tehdy, když budou finálně napsané a schválené.',
    button: 'Otevřít blog',
  },
  en: {
    title: 'Blog',
    subtitle: 'Practical articles about academic writing, sources, methodology and defense preparation.',
    emptyTitle: 'The first article is being prepared',
    emptyText: 'The blog section is ready. Articles will appear only after they are fully written and approved.',
    button: 'Open blog',
  },
  de: {
    title: 'Blog',
    subtitle: 'Praktische Artikel zu akademischem Schreiben, Quellen, Methodik und Verteidigung.',
    emptyTitle: 'Der erste Artikel wird vorbereitet',
    emptyText: 'Der Blogbereich ist vorbereitet. Artikel werden erst angezeigt, wenn sie vollständig geschrieben und freigegeben sind.',
    button: 'Blog öffnen',
  },
  pl: {
    title: 'Blog',
    subtitle: 'Praktyczne artykuły o pisaniu akademickim, źródłach, metodologii i obronie.',
    emptyTitle: 'Pierwszy artykuł jest przygotowywany',
    emptyText: 'Sekcja blog jest gotowa. Artykuły pokażemy dopiero wtedy, gdy będą finalnie napisane i zatwierdzone.',
    button: 'Otwórz blog',
  },
  hu: {
    title: 'Blog',
    subtitle: 'Gyakorlati cikkek az akadémiai írásról, forrásokról, módszertanról és védésről.',
    emptyTitle: 'Az első cikk készül',
    emptyText: 'A blog szekció készen áll. A cikkek csak akkor jelennek meg, amikor véglegesek és jóváhagyottak.',
    button: 'Blog megnyitása',
  },
};


type PricingUiCopy = {
  badge: string;
  intro: string;
  mainLabel: string;
  mainTitle: string;
  addonLabel: string;
  addonTitle: string;
  addonSubtitle: string;
  range: (pages: number) => string;
  extra: (pages: number) => string;
  attachments: (count: number) => string;
  unlimitedPrompts: string;
  prompts: (count: number) => string;
};

const pricingUiCopies: Record<AppLanguage, PricingUiCopy> = {
  sk: { badge: 'ZEDPERA cenník', intro: 'Začnite bezplatne alebo si vyberte jednorazový balík presne podľa typu a rozsahu vašej práce.', mainLabel: 'Hlavné balíky', mainTitle: 'Kompletná podpora pre akademickú prácu', addonLabel: 'Doplnkové služby', addonTitle: 'Analýza dát a extra rozsah práce', addonSubtitle: 'Doplnky rozšíria aktuálny projekt o štatistické spracovanie alebo ďalšie normostrany.', range: (n) => `Rozsah do ${n} strán`, extra: (n) => `+${n} strán`, attachments: (n) => `${n} príloh`, unlimitedPrompts: 'Neobmedzené prompty', prompts: (n) => `${n} prompty` },
  cs: { badge: 'Ceník ZEDPERA', intro: 'Začněte zdarma nebo si vyberte jednorázový balíček podle typu a rozsahu práce.', mainLabel: 'Hlavní balíčky', mainTitle: 'Kompletní podpora pro akademickou práci', addonLabel: 'Doplňkové služby', addonTitle: 'Analýza dat a extra rozsah práce', addonSubtitle: 'Doplňky rozšíří aktuální projekt o statistické zpracování nebo další normostrany.', range: (n) => `Rozsah do ${n} stran`, extra: (n) => `+${n} stran`, attachments: (n) => `${n} příloh`, unlimitedPrompts: 'Neomezené prompty', prompts: (n) => `${n} prompty` },
  en: { badge: 'ZEDPERA pricing', intro: 'Start free or choose a one-time package based on your thesis type and scope.', mainLabel: 'Main packages', mainTitle: 'Complete support for academic work', addonLabel: 'Add-on services', addonTitle: 'Data analysis and extra work scope', addonSubtitle: 'Add-ons extend the current project with statistical processing or additional standard pages.', range: (n) => `Up to ${n} pages`, extra: (n) => `+${n} pages`, attachments: (n) => `${n} attachments`, unlimitedPrompts: 'Unlimited prompts', prompts: (n) => `${n} prompts` },
  de: { badge: 'ZEDPERA Preise', intro: 'Starten Sie kostenlos oder wählen Sie ein einmaliges Paket nach Art und Umfang Ihrer Arbeit.', mainLabel: 'Hauptpakete', mainTitle: 'Komplette Unterstützung für akademische Arbeiten', addonLabel: 'Zusatzleistungen', addonTitle: 'Datenanalyse und zusätzlicher Umfang', addonSubtitle: 'Zusätze erweitern das aktuelle Projekt um Statistik oder zusätzliche Normseiten.', range: (n) => `Bis zu ${n} Seiten`, extra: (n) => `+${n} Seiten`, attachments: (n) => `${n} Anhänge`, unlimitedPrompts: 'Unbegrenzte Prompts', prompts: (n) => `${n} Prompts` },
  pl: { badge: 'Cennik ZEDPERA', intro: 'Zacznij bezpłatnie lub wybierz pakiet jednorazowy zgodnie z typem i zakresem pracy.', mainLabel: 'Główne pakiety', mainTitle: 'Kompletne wsparcie pracy akademickiej', addonLabel: 'Usługi dodatkowe', addonTitle: 'Analiza danych i dodatkowy zakres', addonSubtitle: 'Dodatki rozszerzają projekt o analizę statystyczną lub kolejne strony.', range: (n) => `Zakres do ${n} stron`, extra: (n) => `+${n} stron`, attachments: (n) => `${n} załączników`, unlimitedPrompts: 'Nielimitowane prompty', prompts: (n) => `${n} prompty` },
  hu: { badge: 'ZEDPERA árak', intro: 'Kezdj ingyenesen, vagy válassz egyszeri csomagot a dolgozat típusa és terjedelme szerint.', mainLabel: 'Fő csomagok', mainTitle: 'Teljes támogatás az akadémiai munkához', addonLabel: 'Kiegészítő szolgáltatások', addonTitle: 'Adatelemzés és extra terjedelem', addonSubtitle: 'A kiegészítők statisztikai feldolgozással vagy további oldalakkal bővítik a projektet.', range: (n) => `Legfeljebb ${n} oldal`, extra: (n) => `+${n} oldal`, attachments: (n) => `${n} melléklet`, unlimitedPrompts: 'Korlátlan promptok', prompts: (n) => `${n} prompt` },
};

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
  onClose,
}: {
  language: AppLanguage;
  labels: Translation['common'];
  onChange: (language: AppLanguage) => void;
  onClose?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#080d1c] p-3">
      <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-black uppercase tracking-[0.20em] text-slate-300">
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
              onClick={() => {
                onChange(item.code);
                onClose?.();
              }}
              className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm font-black transition ${
                active
                  ? 'border-violet-400 bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                  : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
              }`}
            >
              <span
                className={`flex h-8 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {item.short}
              </span>

              <span className="min-w-0 truncate">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MobileHeaderLanguageSelector({
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
    onChange(nextLanguage);
    setOpen(false);
  }

  return (
    <div className="relative z-[140] xl:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mobile-language-trigger mobile-language-trigger-wide flex h-11 min-w-[168px] items-center justify-between gap-2 rounded-2xl border border-violet-400/45 bg-[#080816] px-3 text-white shadow-[0_0_24px_rgba(124,58,237,0.25)]"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={labels.language}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className={`language-chip language-${current.code}`}>
            {current.short}
          </span>

          <span className="min-w-0 text-left leading-tight">
            <span className="block truncate text-[9px] font-black uppercase tracking-[0.18em] text-violet-100">
              {labels.language}
            </span>

            <span className="block truncate text-[12px] font-black text-white">
              {current.label}
            </span>
          </span>
        </span>

        <ChevronDown
          size={14}
          className={`shrink-0 text-violet-200 transition ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+0.55rem)] z-[150] w-[285px] overflow-hidden rounded-2xl border border-violet-500/40 bg-[#050711] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.82),0_0_35px_rgba(124,58,237,0.28)]"
          role="listbox"
        >
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-violet-100">
            <Languages size={15} className="text-violet-300" />
            {labels.language}
          </div>

          {languages.map((item) => {
            const active = item.code === language;

            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelect(item.code)}
                className={`flex min-h-[52px] w-full items-center justify-between rounded-xl px-3 text-left text-[13px] font-black transition ${
                  active
                    ? 'bg-violet-700 text-white'
                    : 'text-white hover:bg-white/5 hover:text-white'
                }`}
                role="option"
                aria-selected={active}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`language-chip language-${item.code}`}>
                    {item.short}
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-black text-white">
                      {item.label}
                    </span>

                    <span className="block truncate text-[11px] font-bold text-violet-200">
                      {active
                        ? labels.currentLanguage
                        : labels.switchLanguage}
                    </span>
                  </span>
                </span>

                {active ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <ArrowRight size={16} />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
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
    <div className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-[2rem] border border-violet-500/35 bg-[#050511] p-3 shadow-[0_0_70px_rgba(124,58,237,0.2)] sm:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.34),transparent_38%),radial-gradient(circle_at_85%_70%,rgba(37,99,235,0.18),transparent_36%)]" />

      <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-black shadow-[0_32px_90px_rgba(0,0,0,0.62)]">
        <div className="relative h-[300px] sm:h-[360px] lg:h-[400px]">
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

      <div className="relative mt-4 rounded-[1.4rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-6">
        <p className="text-sm font-bold leading-7 text-white sm:text-base">
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

function PricingCard({
  plan,
  loading,
  redirectingLabel,
  onBuy,
  copy,
}: {
  plan: Plan;
  loading: boolean;
  redirectingLabel: string;
  onBuy: (planId: PlanId) => void | Promise<void>;
  copy: PricingUiCopy;
}) {
  const isFree = plan.kind === 'free';
  const isAddon = plan.kind === 'addon';

  return (
    <article
      className={[
        'relative flex h-full flex-col overflow-hidden rounded-3xl border p-7 shadow-2xl transition hover:-translate-y-1',
        plan.highlighted
          ? 'zedpera-glow-border border-violet-400/45 bg-violet-900/25 shadow-violet-950/35'
          : isFree
            ? 'border-emerald-400/30 bg-emerald-500/[0.07] shadow-emerald-950/20'
            : isAddon
              ? 'border-blue-400/20 bg-blue-500/[0.05] shadow-blue-950/20'
              : 'border-white/10 bg-white/[0.025] shadow-black/25',
      ].join(' ')}
    >
      {plan.highlighted ? (
        <div className="absolute right-5 top-5 rounded-full bg-violet-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
          TOP
        </div>
      ) : null}

      <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
        {plan.label}
      </div>

      <h3 className="mt-3 pr-12 text-2xl font-black leading-tight text-white">
        {plan.name}
      </h3>

      <div className="mt-5 flex flex-wrap items-baseline gap-2">
        <span className="text-4xl font-black tracking-tight text-white">
          {plan.price}
        </span>
        <span className="text-sm font-bold text-slate-300">/ {plan.period}</span>
      </div>

      <p className="mt-5 text-sm font-bold leading-6 text-slate-200">
        {plan.description}
      </p>

      {plan.pageLimit || plan.extraPages || plan.attachmentLimit || plan.promptLimit !== undefined ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {plan.pageLimit ? (
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-white">
              {copy.range(plan.pageLimit)}
            </span>
          ) : null}
          {plan.extraPages ? (
            <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1.5 text-xs font-black text-blue-100">
              {copy.extra(plan.extraPages)}
            </span>
          ) : null}
          {plan.attachmentLimit ? (
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-white">
              {copy.attachments(plan.attachmentLimit)}
            </span>
          ) : null}
          {plan.promptLimit === null ? (
            <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs font-black text-violet-100">
              {copy.unlimitedPrompts}
            </span>
          ) : plan.promptLimit !== undefined ? (
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-white">
              {copy.prompts(plan.promptLimit)}
            </span>
          ) : null}
        </div>
      ) : null}

      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm font-bold leading-6 text-slate-100">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-violet-400" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onBuy(plan.id)}
        disabled={loading}
        className={[
          'mt-7 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60',
          plan.highlighted
            ? 'bg-violet-600 text-white shadow-xl shadow-violet-950/35 hover:bg-violet-500'
            : isFree
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'border border-violet-400/30 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20',
        ].join(' ')}
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : null}
        {loading ? redirectingLabel : plan.button}
      </button>
    </article>
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
      'free',
      'seminar-work',
      'bachelor-thesis',
      'master-thesis',
      'data-analysis',
      'extra-20',
      'extra-40',
      'extra-60',
    ],
    [],
  );

  const t = useMemo(() => {
    return translations[language] || translations.sk;
  }, [language, translationVersion]);

  const blogCopy = blogCopies[language] || blogCopies.sk;
  const pricingUi = pricingUiCopies[language] || pricingUiCopies.sk;


const mobileMenuItems = useMemo(
  () => [
    {
      href: '#features',
      label: t.nav.features,
      icon: Sparkles,
    },
    {
      href: '#comparison',
      label: t.nav.comparison,
      icon: ShieldCheck,
    },
    {
      href: '#pricing',
      label: t.nav.pricing,
      icon: Crown,
    },
    {
      href: '#reviews',
      label: t.nav.reviews,
      icon: Star,
    },
    {
      href: '#faq',
      label: t.nav.faq,
      icon: HelpCircle,
    },
    {
      href: '/blog',
      label: t.footer.links.blog || 'Blog',
      icon: BookOpen,
    },
  ],
  [
    t.nav.features,
    t.nav.comparison,
    t.nav.pricing,
    t.nav.reviews,
    t.nav.faq,
    t.footer.links.blog,
  ],
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

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const originalOverflow = document.body.style.overflow;

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

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

      if (planId === 'free') {
        window.location.href = '/login?mode=register&plan=free';
        return;
      }

      const email = await getEmailForCheckout();

      if (!email) {
        throw new Error(t.pricing.emailRequired);
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const addonIds: PlanId[] = [
        'data-analysis',
        'extra-20',
        'extra-40',
        'extra-60',
      ];
      const isAddon = addonIds.includes(planId);

      const payload = {
        itemId: planId,
        catalogId: planId,
        productId: planId,
        plan: isAddon ? undefined : planId,
        planId: isAddon ? undefined : planId,
        addon: isAddon ? planId : undefined,
        addonId: isAddon ? planId : undefined,
        addons: isAddon ? [planId] : [],
        email,
        successUrl: `${origin}/payment/success?item=${planId}`,
        cancelUrl: `${origin}/pricing?payment=cancel&item=${planId}`,
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
        throw new Error(getCheckoutError(data, t.pricing.checkoutFailed));
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error(t.pricing.noStripeUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t.pricing.checkoutFailed;

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
    { href: '#blog', label: t.footer.links.blog, icon: PenTool },
    { href: '#reviews', label: t.nav.reviews, icon: Star },
    { href: '#faq', label: t.nav.faq, icon: HelpCircle },
  ];

  const footerLinks = [
    { href: '/blog', label: t.footer.links.blog, icon: PenTool },
    { href: '/gdpr', label: t.footer.links.gdpr, icon: ShieldCheck },
    { href: '/obchodne-podmienky', label: t.footer.links.terms, icon: FileText },
    { href: '/cookies', label: t.footer.links.cookies, icon: Cookie },
  ];

  const freePlan = t.pricing.plans.find((plan) => plan.kind === 'free');
  const mainPlans = t.pricing.plans.filter((plan) => plan.kind === 'plan');
  const addonPlans = t.pricing.plans.filter((plan) => plan.kind === 'addon');

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

        /* =========================================================
           MOBILE ONLY - profesionálna mobilná verzia
           Desktop/web ostáva pôvodný. Mobil má tmavé okná a biele písmo.
        ========================================================= */

        @media (max-width: 1279px) {
          html,
          body {
            overflow-x: hidden !important;
            background: #000000 !important;
          }

          .zedpera-template {
            min-height: 100vh;
            overflow-x: hidden !important;
            background:
              radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.22), transparent 34rem),
              linear-gradient(180deg, #080014 0%, #000000 46%, #000000 100%) !important;
            color: #ffffff !important;
          }

          .zedpera-template *,
          .zedpera-template p,
          .zedpera-template span,
          .zedpera-template div,
          .zedpera-template li,
          .zedpera-template a,
          .zedpera-template button,
          .zedpera-template label,
          .zedpera-template small,
          .zedpera-template h1,
          .zedpera-template h2,
          .zedpera-template h3,
          .zedpera-template h4,
          .zedpera-template h5,
          .zedpera-template h6 {
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            opacity: 1 !important;
            text-shadow: none;
          }

          .zedpera-template header {
            position: sticky !important;
            top: 0 !important;
            z-index: 100 !important;
            background: rgba(0, 0, 0, 0.96) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
            backdrop-filter: blur(22px);
          }

          .zedpera-template header > div {
            height: 64px !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .zedpera-template header a[href='/'] {
            min-width: 0 !important;
          }

          .zedpera-template header a[href='/'] > div:first-child {
            height: 40px !important;
            width: 40px !important;
            border-radius: 14px !important;
            font-size: 18px !important;
          }

          .zedpera-template header a[href='/'] > div:last-child {
            display: none !important;
          }

          .mobile-language-trigger,
          .mobile-language-popover,
          .mobile-language-popover *,
          .zedpera-template header button,
          .zedpera-template header [role='listbox'],
          .zedpera-template header [role='option'] {
            background-color: #050711 !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            border-color: rgba(255, 255, 255, 0.14) !important;
          }

          .mobile-language-trigger {
            min-width: 90px !important;
            background: linear-gradient(180deg, #11172a 0%, #070a16 100%) !important;
          }

          .mobile-language-popover {
            max-height: calc(100vh - 92px);
            overflow-y: auto;
          }

          .zedpera-template header + div,
          .zedpera-template header div[class*='border-t'] {
            background: #03040a !important;
            border-color: rgba(255, 255, 255, 0.12) !important;
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.78) !important;
          }

          .zedpera-template header div[class*='border-t'] a,
          .zedpera-template header div[class*='border-t'] button,
          .zedpera-template header div[class*='border-t'] > div > div,
          .zedpera-template header div[class*='border-t'] [class*='rounded'] {
            background: #0b1020 !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
          }

          .zedpera-template section {
            padding-left: 18px !important;
            padding-right: 18px !important;
          }

          .zedpera-template h1 {
            font-size: clamp(2.05rem, 11vw, 3.15rem) !important;
            line-height: 1.04 !important;
            letter-spacing: -0.045em !important;
          }

          .zedpera-template h2 {
            font-size: clamp(1.8rem, 8vw, 2.55rem) !important;
            line-height: 1.08 !important;
            letter-spacing: -0.035em !important;
          }

          .zedpera-template p {
            font-size: 0.98rem !important;
            line-height: 1.72 !important;
          }

          .zedpera-template [class*='min-h-[560px]'] {
            min-height: auto !important;
          }

          .zedpera-template [class*='grid'] {
            max-width: 100% !important;
          }

          .zedpera-template img,
          .zedpera-template video,
          .zedpera-template canvas,
          .zedpera-template svg {
            max-width: 100% !important;
          }

          .zedpera-template [class*='bg-white'],
          .zedpera-template [class*='bg-white/'],
          .zedpera-template [class*='bg-slate-50'],
          .zedpera-template [class*='bg-slate-100'],
          .zedpera-template [class*='bg-slate-200'],
          .zedpera-template [class*='bg-gray-50'],
          .zedpera-template [class*='bg-gray-100'],
          .zedpera-template [class*='bg-gray-200'],
          .zedpera-template [class*='bg-zinc-50'],
          .zedpera-template [class*='bg-zinc-100'],
          .zedpera-template [class*='bg-zinc-200'],
          .zedpera-template [class*='bg-neutral-50'],
          .zedpera-template [class*='bg-neutral-100'],
          .zedpera-template [class*='bg-neutral-200'],
          .zedpera-template [class*='bg-stone-50'],
          .zedpera-template [class*='bg-stone-100'],
          .zedpera-template [class*='bg-violet-50'],
          .zedpera-template [class*='bg-purple-50'],
          .zedpera-template [class*='bg-indigo-50'] {
            background: linear-gradient(180deg, #11172a 0%, #070a16 100%) !important;
            background-color: #0b1020 !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            border-color: rgba(255, 255, 255, 0.14) !important;
            box-shadow: 0 18px 48px rgba(0, 0, 0, 0.42) !important;
          }

          .zedpera-template [class*='bg-white'] *,
          .zedpera-template [class*='bg-white/'] *,
          .zedpera-template [class*='bg-slate-50'] *,
          .zedpera-template [class*='bg-slate-100'] *,
          .zedpera-template [class*='bg-slate-200'] *,
          .zedpera-template [class*='bg-gray-50'] *,
          .zedpera-template [class*='bg-gray-100'] *,
          .zedpera-template [class*='bg-gray-200'] *,
          .zedpera-template [class*='bg-zinc-50'] *,
          .zedpera-template [class*='bg-zinc-100'] *,
          .zedpera-template [class*='bg-zinc-200'] *,
          .zedpera-template [class*='bg-neutral-50'] *,
          .zedpera-template [class*='bg-neutral-100'] *,
          .zedpera-template [class*='bg-neutral-200'] *,
          .zedpera-template [class*='bg-stone-50'] *,
          .zedpera-template [class*='bg-stone-100'] *,
          .zedpera-template [class*='bg-violet-50'] *,
          .zedpera-template [class*='bg-purple-50'] *,
          .zedpera-template [class*='bg-indigo-50'] * {
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            opacity: 1 !important;
          }

          .zedpera-template input,
          .zedpera-template textarea,
          .zedpera-template select {
            min-height: 48px !important;
            background: #0b1020 !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.14) !important;
            border-radius: 16px !important;
          }

          .zedpera-template input::placeholder,
          .zedpera-template textarea::placeholder {
            color: #cbd5e1 !important;
            -webkit-text-fill-color: #cbd5e1 !important;
            opacity: 1 !important;
          }

          .zedpera-template a,
          .zedpera-template button {
            min-height: 44px;
            touch-action: manipulation;
          }

          .zedpera-template [class*='rounded'] {
            border-color: rgba(255, 255, 255, 0.12) !important;
          }

          .language-chip {
            background-clip: padding-box !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
          }
        }


          /* =========================================================
             FIX: MOBIL NIKDY NESMIE ZBELIEŤ ANI KEĎ THEMEPROVIDER
             ALEBO LOCALSTORAGE DRŽÍ LIGHT REŽIM.
             Prepíše aj bg-[#...], bg-[...], inline background a biele karty.
          ========================================================= */

          html[data-theme='light'] body .zedpera-template,
          html[data-theme='dark'] body .zedpera-template,
          body .zedpera-template {
            background:
              radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.24), transparent 34rem),
              linear-gradient(180deg, #080014 0%, #000000 46%, #000000 100%) !important;
            color: #ffffff !important;
          }

          html[data-theme='light'] body .zedpera-template [class*='bg-[#'],
          html[data-theme='light'] body .zedpera-template [class*='bg-['],
          html[data-theme='light'] body .zedpera-template [class*='bg-white'],
          html[data-theme='light'] body .zedpera-template [class*='bg-slate-50'],
          html[data-theme='light'] body .zedpera-template [class*='bg-slate-100'],
          html[data-theme='light'] body .zedpera-template [class*='bg-slate-200'],
          html[data-theme='light'] body .zedpera-template [class*='bg-gray-50'],
          html[data-theme='light'] body .zedpera-template [class*='bg-gray-100'],
          html[data-theme='light'] body .zedpera-template [class*='bg-gray-200'],
          html[data-theme='light'] body .zedpera-template [class*='bg-zinc-50'],
          html[data-theme='light'] body .zedpera-template [class*='bg-zinc-100'],
          html[data-theme='light'] body .zedpera-template [class*='bg-neutral-50'],
          html[data-theme='light'] body .zedpera-template [class*='bg-neutral-100'],
          html[data-theme='dark'] body .zedpera-template [class*='bg-white'],
          html[data-theme='dark'] body .zedpera-template [class*='bg-slate-50'],
          html[data-theme='dark'] body .zedpera-template [class*='bg-gray-50'],
          html[data-theme='dark'] body .zedpera-template [class*='bg-zinc-50'],
          html[data-theme='dark'] body .zedpera-template [class*='bg-neutral-50'] {
            background: linear-gradient(180deg, #11172a 0%, #070a16 100%) !important;
            background-color: #0b1020 !important;
            background-image: linear-gradient(180deg, #11172a 0%, #070a16 100%) !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            border-color: rgba(255,255,255,0.14) !important;
            box-shadow: 0 18px 48px rgba(0,0,0,0.48) !important;
          }

          html[data-theme='light'] body .zedpera-template [class*='bg-[#'] *,
          html[data-theme='light'] body .zedpera-template [class*='bg-['] *,
          html[data-theme='light'] body .zedpera-template [class*='bg-white'] *,
          html[data-theme='light'] body .zedpera-template [class*='bg-slate-50'] *,
          html[data-theme='light'] body .zedpera-template [class*='bg-slate-100'] *,
          html[data-theme='light'] body .zedpera-template [class*='bg-gray-50'] *,
          html[data-theme='light'] body .zedpera-template [class*='bg-gray-100'] *,
          html[data-theme='light'] body .zedpera-template [class*='bg-zinc-50'] *,
          html[data-theme='light'] body .zedpera-template [class*='bg-neutral-50'] *,
          html[data-theme='dark'] body .zedpera-template [class*='bg-white'] *,
          html[data-theme='dark'] body .zedpera-template [class*='bg-slate-50'] *,
          html[data-theme='dark'] body .zedpera-template [class*='bg-gray-50'] *,
          html[data-theme='dark'] body .zedpera-template [class*='bg-zinc-50'] *,
          html[data-theme='dark'] body .zedpera-template [class*='bg-neutral-50'] * {
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            opacity: 1 !important;
          }

          html[data-theme='light'] body .zedpera-template :where(div, section, article, aside, header, footer, form)[style*='background'],
          html[data-theme='dark'] body .zedpera-template :where(div, section, article, aside, header, footer, form)[style*='background'] {
            background: linear-gradient(180deg, #11172a 0%, #070a16 100%) !important;
            background-color: #0b1020 !important;
            background-image: linear-gradient(180deg, #11172a 0%, #070a16 100%) !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            border-color: rgba(255,255,255,0.14) !important;
          }

          html[data-theme='light'] body .zedpera-template :where(input, textarea, select),
          html[data-theme='dark'] body .zedpera-template :where(input, textarea, select),
          body .zedpera-template :where(input, textarea, select) {
            background: #0b1020 !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            border: 1px solid rgba(255,255,255,0.16) !important;
          }

          html[data-theme='light'] body .zedpera-template .mobile-bottom-nav,
          html[data-theme='light'] body .zedpera-template .mobile-bottom-nav *,
          html[data-theme='dark'] body .zedpera-template .mobile-bottom-nav,
          html[data-theme='dark'] body .zedpera-template .mobile-bottom-nav * {
            background-color: #050711 !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            border-color: rgba(255,255,255,0.16) !important;
          }

        @media (max-width: 480px) {
          .zedpera-template section {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .zedpera-template [class*='rounded-[2.5rem]'],
          .zedpera-template [class*='rounded-[2rem]'] {
            border-radius: 1.45rem !important;
          }

          .zedpera-template [class*='p-12'] {
            padding: 1.35rem !important;
          }

          .zedpera-template [class*='px-8'] {
            padding-left: 1.1rem !important;
            padding-right: 1.1rem !important;
          }

          .zedpera-template [class*='gap-10'] {
            gap: 1.5rem !important;
          }
        }


/* =========================================================
   MOBILE LANDING MENU - PROFESSIONAL FINAL
   Upravuje iba mobilnú landing page.
   Desktop verzia ostáva nezmenená.
========================================================= */

@media (max-width: 1279px) {
  .zedpera-template header {
    position: sticky !important;
    top: 0 !important;
    z-index: 120 !important;
    background: rgba(0, 0, 0, 0.96) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
    backdrop-filter: blur(22px) saturate(150%) !important;
  }

  .zedpera-template header > div {
    min-height: 66px !important;
    padding-left: 14px !important;
    padding-right: 14px !important;
  }

  .zedpera-template .mobile-header-login,
  .zedpera-template .mobile-header-menu-button,
  .zedpera-template .mobile-language-trigger {
    height: 44px !important;
    background: linear-gradient(180deg, #11172a 0%, #050711 100%) !important;
    border: 1px solid rgba(167, 139, 250, 0.24) !important;
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    box-shadow:
      0 12px 32px rgba(0, 0, 0, 0.42),
      0 0 20px rgba(124, 58, 237, 0.16) !important;
  }

  .zedpera-template .mobile-header-menu-button {
    min-width: 82px !important;
  }

  .zedpera-template .mobile-header-login {
    max-width: 116px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .zedpera-template .mobile-menu-backdrop {
    position: fixed !important;
    inset: 66px 0 0 0 !important;
    z-index: 105 !important;
    display: block !important;
    width: 100vw !important;
    min-height: calc(100dvh - 66px) !important;
    border: 0 !important;
    background: rgba(0, 0, 0, 0.76) !important;
    backdrop-filter: blur(10px) !important;
  }

  .zedpera-template .mobile-main-menu {
    position: fixed !important;
    left: 12px !important;
    right: 12px !important;
    top: 76px !important;
    z-index: 115 !important;
    max-height: calc(100dvh - 90px) !important;
    overflow: hidden !important;
    border-radius: 28px !important;
    border: 1px solid rgba(167, 139, 250, 0.24) !important;
    background:
      radial-gradient(circle at top left, rgba(124, 58, 237, 0.26), transparent 20rem),
      linear-gradient(180deg, rgba(9, 13, 28, 0.98) 0%, rgba(3, 5, 14, 0.98) 100%) !important;
    box-shadow:
      0 32px 95px rgba(0, 0, 0, 0.86),
      inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
    backdrop-filter: blur(24px) saturate(160%) !important;
  }

  .zedpera-template .mobile-main-menu-scroll {
    max-height: calc(100dvh - 90px) !important;
    overflow-y: auto !important;
    padding: 14px !important;
    overscroll-behavior: contain !important;
  }

  .zedpera-template .mobile-main-menu-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    margin-bottom: 12px !important;
    padding: 4px 2px 10px !important;
  }

  .zedpera-template .mobile-main-menu-brand {
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 10px !important;
  }

  .zedpera-template .mobile-main-menu-logo {
    display: flex !important;
    height: 42px !important;
    width: 42px !important;
    flex-shrink: 0 !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 16px !important;
    background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%) !important;
    color: #ffffff !important;
    box-shadow: 0 16px 36px rgba(124, 58, 237, 0.32) !important;
  }

  .zedpera-template .mobile-main-menu-eyebrow {
    margin: 0 !important;
    color: #c4b5fd !important;
    -webkit-text-fill-color: #c4b5fd !important;
    font-size: 10px !important;
    font-weight: 950 !important;
    letter-spacing: 0.18em !important;
    text-transform: uppercase !important;
  }

  .zedpera-template .mobile-main-menu-heading {
    margin: 2px 0 0 !important;
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    font-size: 18px !important;
    font-weight: 950 !important;
    line-height: 1.1 !important;
  }

  .zedpera-template .mobile-main-menu-close {
    display: flex !important;
    height: 42px !important;
    width: 42px !important;
    flex-shrink: 0 !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 16px !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    background: rgba(255, 255, 255, 0.07) !important;
    color: #ffffff !important;
  }

  .zedpera-template .mobile-main-menu-section {
    margin-bottom: 12px !important;
    border-radius: 22px !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    background: rgba(10, 16, 32, 0.78) !important;
    padding: 12px !important;
  }

  .zedpera-template .mobile-main-menu-title {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    margin-bottom: 10px !important;
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    font-size: 12px !important;
    font-weight: 950 !important;
    letter-spacing: 0.14em !important;
    text-transform: uppercase !important;
  }

  .zedpera-template .mobile-main-menu-grid {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 9px !important;
  }

  .zedpera-template .mobile-main-menu-card {
    display: flex !important;
    min-height: 76px !important;
    min-width: 0 !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    justify-content: center !important;
    gap: 8px !important;
    border-radius: 18px !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.035)) !important;
    padding: 12px !important;
    text-decoration: none !important;
    transition:
      transform 0.16s ease,
      border-color 0.16s ease,
      background 0.16s ease !important;
  }

  .zedpera-template .mobile-main-menu-card:active {
    transform: scale(0.97) !important;
  }

  .zedpera-template .mobile-main-menu-card:hover {
    border-color: rgba(167, 139, 250, 0.5) !important;
    background: rgba(124, 58, 237, 0.16) !important;
  }

  .zedpera-template .mobile-main-menu-icon {
    display: flex !important;
    height: 32px !important;
    width: 32px !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 14px !important;
    background: rgba(124, 58, 237, 0.18) !important;
    color: #c4b5fd !important;
  }

  .zedpera-template .mobile-main-menu-label {
    display: block !important;
    max-width: 100% !important;
    overflow: hidden !important;
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    font-size: 13px !important;
    font-weight: 950 !important;
    line-height: 1.2 !important;
  }

  .zedpera-template .mobile-language-grid {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 9px !important;
  }

  .zedpera-template .mobile-language-card {
    display: flex !important;
    min-height: 52px !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 9px !important;
    border-radius: 17px !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    background: rgba(255, 255, 255, 0.055) !important;
    padding: 9px !important;
    color: #ffffff !important;
    text-align: left !important;
  }

  .zedpera-template .mobile-language-card-active {
    border-color: rgba(34, 211, 238, 0.55) !important;
    background: rgba(8, 145, 178, 0.22) !important;
  }

  .zedpera-template .mobile-language-label {
    min-width: 0 !important;
    flex: 1 !important;
    overflow: hidden !important;
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    font-size: 12px !important;
    font-weight: 900 !important;
  }

  .zedpera-template .mobile-main-menu-action-section {
    display: grid !important;
    gap: 9px !important;
  }

  .zedpera-template .mobile-main-menu-primary,
  .zedpera-template .mobile-main-menu-secondary {
    display: flex !important;
    min-height: 50px !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    border-radius: 18px !important;
    text-decoration: none !important;
    font-size: 13px !important;
    font-weight: 950 !important;
  }

  .zedpera-template .mobile-main-menu-primary {
    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%) !important;
    color: #ffffff !important;
    box-shadow: 0 18px 42px rgba(124, 58, 237, 0.32) !important;
  }

  .zedpera-template .mobile-main-menu-secondary {
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    background: rgba(255, 255, 255, 0.07) !important;
    color: #ffffff !important;
  }
}

@media (max-width: 390px) {
  .zedpera-template .mobile-header-login {
    display: none !important;
  }

  .zedpera-template .mobile-header-menu-button {
    min-width: 76px !important;
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  .zedpera-template .mobile-main-menu-grid,
  .zedpera-template .mobile-language-grid {
    grid-template-columns: 1fr !important;
  }
}


        /* =========================================================
           PROFESIONÁLNA MOBILNÁ VERZIA - FINÁLNE PREPÍSANIE
           Jazyk je samostatné tlačidlo, menu je samostatné tlačidlo.
           Všetky mobilné okná ostávajú čierne, čitateľné a klikateľné.
        ========================================================= */
        @media (max-width: 1279px) {
          .zedpera-template header {
            position: sticky !important;
            top: 0 !important;
            z-index: 120 !important;
            background: rgba(0, 0, 0, 0.94) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
            backdrop-filter: blur(22px) saturate(150%) !important;
          }

          .zedpera-template header > div {
            height: 66px !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .zedpera-template .mobile-header-login,
          .zedpera-template .mobile-header-menu-button,
          .zedpera-template .mobile-language-trigger {
            background: linear-gradient(180deg, #11172a 0%, #050711 100%) !important;
            border: 1px solid rgba(167, 139, 250, 0.24) !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.42), 0 0 20px rgba(124, 58, 237, 0.16) !important;
          }

          .zedpera-template .mobile-menu-backdrop {
            position: fixed !important;
            inset: 66px 0 0 0 !important;
            z-index: 105 !important;
            display: block !important;
            width: 100vw !important;
            min-height: calc(100dvh - 66px) !important;
            border: 0 !important;
            background: rgba(0, 0, 0, 0.72) !important;
            backdrop-filter: blur(10px) !important;
          }

          .zedpera-template .mobile-main-menu {
            position: fixed !important;
            left: 12px !important;
            right: 12px !important;
            top: 76px !important;
            z-index: 115 !important;
            max-height: calc(100dvh - 90px) !important;
            overflow: hidden !important;
            border-radius: 28px !important;
            border: 1px solid rgba(167, 139, 250, 0.24) !important;
            background: linear-gradient(180deg, rgba(9, 13, 28, 0.99) 0%, rgba(3, 5, 14, 0.99) 100%) !important;
            box-shadow: 0 34px 120px rgba(0, 0, 0, 0.88), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
          }

          .zedpera-template .mobile-main-menu-scroll {
            max-height: calc(100dvh - 90px) !important;
            overflow-y: auto !important;
            padding: 14px !important;
            overscroll-behavior: contain !important;
          }

          .zedpera-template .mobile-main-menu-section {
            margin-bottom: 12px !important;
            border-radius: 22px !important;
            border: 1px solid rgba(255, 255, 255, 0.11) !important;
            background: rgba(8, 13, 28, 0.92) !important;
            padding: 13px !important;
          }

          .zedpera-template .mobile-main-menu-title {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            margin-bottom: 11px !important;
            font-size: 11px !important;
            font-weight: 950 !important;
            letter-spacing: 0.18em !important;
            text-transform: uppercase !important;
            color: #ddd6fe !important;
            -webkit-text-fill-color: #ddd6fe !important;
          }

          .zedpera-template .mobile-main-menu-grid,
          .zedpera-template .mobile-language-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }

          .zedpera-template .mobile-main-menu-card,
          .zedpera-template .mobile-language-option {
            display: flex !important;
            min-height: 56px !important;
            align-items: center !important;
            gap: 10px !important;
            border-radius: 18px !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            background: linear-gradient(180deg, #11172a 0%, #0a0f20 100%) !important;
            padding: 10px 11px !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            text-decoration: none !important;
            cursor: pointer !important;
            touch-action: manipulation !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
          }

          .zedpera-template .mobile-main-menu-card:hover,
          .zedpera-template .mobile-language-option:hover {
            border-color: rgba(167, 139, 250, 0.52) !important;
            background: linear-gradient(180deg, #171f38 0%, #0d1328 100%) !important;
          }

          .zedpera-template .mobile-main-menu-icon {
            display: flex !important;
            height: 34px !important;
            width: 34px !important;
            flex-shrink: 0 !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 14px !important;
            background: rgba(124, 58, 237, 0.25) !important;
            color: #c4b5fd !important;
            -webkit-text-fill-color: #c4b5fd !important;
          }

          .zedpera-template .mobile-main-menu-label,
          .zedpera-template .mobile-language-label {
            min-width: 0 !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            font-size: 13px !important;
            font-weight: 950 !important;
          }

          .zedpera-template .mobile-language-option-active {
            border-color: rgba(196, 181, 253, 0.84) !important;
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.72) 0%, rgba(37, 99, 235, 0.48) 100%) !important;
            box-shadow: 0 0 0 1px rgba(196, 181, 253, 0.24), 0 16px 34px rgba(91, 33, 182, 0.28) !important;
          }

          .zedpera-template .mobile-main-menu-actions {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          .zedpera-template .mobile-main-menu-login,
          .zedpera-template .mobile-main-menu-start {
            min-height: 54px !important;
            border-radius: 18px !important;
            font-size: 14px !important;
            font-weight: 950 !important;
          }

          .zedpera-template .mobile-main-menu-start {
            background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%) !important;
            box-shadow: 0 20px 48px rgba(91, 33, 182, 0.45) !important;
          }

          .zedpera-template section:first-of-type {
            padding-top: 22px !important;
          }

          .zedpera-template section:first-of-type > div {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 28px !important;
            min-height: auto !important;
          }

          .zedpera-template section:first-of-type h1 {
            font-size: clamp(2.25rem, 10.5vw, 3.35rem) !important;
            line-height: 1.02 !important;
            letter-spacing: -0.055em !important;
          }

          .zedpera-template section:first-of-type p {
            max-width: 100% !important;
            font-size: 1rem !important;
            line-height: 1.72 !important;
          }

          .zedpera-template section:first-of-type a[href='#pricing'],
          .zedpera-template section:first-of-type a[href='#features'] {
            width: 100% !important;
            min-width: 0 !important;
          }
        }

        @media (max-width: 420px) {
          .zedpera-template .mobile-main-menu-grid,
          .zedpera-template .mobile-language-grid {
            grid-template-columns: 1fr !important;
          }

          .zedpera-template .mobile-main-menu {
            left: 10px !important;
            right: 10px !important;
            border-radius: 24px !important;
          }
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

      <div className="hidden text-[21px] font-black uppercase tracking-[0.12em] text-white sm:block">
        Zedpera
      </div>
    </Link>

    {/* DESKTOP MENU */}
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

    {/* DESKTOP ACTIONS */}
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

{/* MOBILE HEADER ACTIONS */}
<div className="relative ml-auto flex items-center gap-2 xl:hidden">
  <MobileHeaderLanguageSelector
    language={language}
    labels={t.common}
    onChange={handleLanguageChange}
  />

  <button
    type="button"
    onClick={() => setMobileMenuOpen((value) => !value)}
    className="mobile-header-menu-button inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#080816] px-3 text-[12px] font-black text-white shadow-[0_0_18px_rgba(124,58,237,0.16)]"
    aria-label="Menu"
    aria-expanded={mobileMenuOpen}
    aria-controls="mobile-main-menu"
  >
    {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
    <span className="hidden min-[390px]:inline">Menu</span>
  </button>
</div>


  {/* MOBILNÉ MENU AKO JAZYKOVÁ MUTÁCIA - DROPDOWN */}
  {mobileMenuOpen ? (
    <div
      id="mobile-main-menu"
      className="absolute right-0 top-[calc(100%+0.65rem)] z-[130] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-violet-400/40 bg-[#050711] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_34px_rgba(124,58,237,0.28)] xl:hidden"
      role="menu"
      aria-label="Mobilné menu Zedpera"
    >
      <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white">
        <span className="inline-flex items-center gap-2">
          <Menu size={15} className="text-violet-300" />
          Menu
        </span>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/[0.12]"
          aria-label="Zavrieť menu"
        >
          <X size={15} />
        </button>
      </div>

      <div className="grid gap-2">
        {mobileMenuItems.map((item) => {
          const Icon = item.icon;
          const isHashLink = item.href.startsWith('#');
          const itemClassName =
            'flex min-h-[50px] w-full items-center justify-between rounded-xl border border-white/10 bg-[#0b1020] px-3 text-left text-[13px] font-black text-white transition hover:border-violet-400/50 hover:bg-[#11172a]';

          if (isHashLink) {
            return (
              <a
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={(event) => {
                  event.preventDefault();
                  setMobileMenuOpen(false);

                  window.setTimeout(() => {
                    scrollToHash(item.href);
                  }, 80);
                }}
                className={itemClassName}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/20">
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="truncate">{item.label}</span>
                </span>

                <ArrowRight className="h-4 w-4 shrink-0 text-violet-300" />
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setMobileMenuOpen(false)}
              className={itemClassName}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/20">
                  <Icon className="h-4 w-4" />
                </span>

                <span className="truncate">{item.label}</span>
              </span>

              <ArrowRight className="h-4 w-4 shrink-0 text-violet-300" />
            </Link>
          );
        })}
      </div>

      <div className="mt-2 rounded-xl border border-white/10 bg-[#0b1020] p-2">
        <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
          <Languages size={14} className="text-cyan-300" />
          {t.common.language}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {languages.map((item) => {
            const active = language === item.code;

            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  handleLanguageChange(item.code);
                  setMobileMenuOpen(false);
                }}
                className={`flex min-h-[42px] items-center justify-center gap-2 rounded-xl border px-2 text-[12px] font-black transition ${
                  active
                    ? 'border-violet-400 bg-violet-700 text-white shadow-[0_0_24px_rgba(124,58,237,0.35)]'
                    : 'border-white/10 bg-[#050711] text-white hover:border-violet-400/50 hover:bg-[#11172a]'
                }`}
                aria-pressed={active}
              >
                <span className={`language-chip language-${item.code}`}>
                  {item.short}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 grid gap-2">
        <Link
          href="/login"
          role="menuitem"
          onClick={() => setMobileMenuOpen(false)}
          className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-[13px] font-black text-white transition hover:bg-white/[0.12]"
        >
          <Bot className="h-4 w-4" />
          {t.common.login}
        </Link>

        <a
          href="#pricing"
          role="menuitem"
          onClick={(event) => {
            event.preventDefault();
            setMobileMenuOpen(false);

            window.setTimeout(() => {
              scrollToHash('#pricing');
            }, 80);
          }}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-[13px] font-black text-white shadow-lg shadow-violet-700/40 transition hover:bg-violet-500"
        >
          {t.common.startFree}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  ) : null}

</div>
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

          <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-violet-400/30 bg-violet-500/10 px-6 py-5 text-center text-base font-black leading-7 text-violet-100 shadow-xl shadow-violet-950/20">
            {t.comparison.closing}
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

        <section id="about" className="relative z-10 mx-auto max-w-[1260px] px-5 py-20 lg:px-8">
          <div className="zedpera-glow-border relative overflow-hidden rounded-3xl bg-white/[0.02] p-8 lg:p-12">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-violet-900/20 to-transparent" />
            <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_0.82fr]">
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

          <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
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


        <section id="blog" className="relative z-10 mx-auto max-w-[1260px] px-5 py-20 lg:px-8">
          <div className="rounded-[2.2rem] border border-white/10 bg-[#070716] p-6 shadow-2xl shadow-black/35 sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-violet-200">
                  <PenTool size={15} />
                  {blogCopy.title}
                </div>

                <h2 className="zedpera-section-title text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                  {blogCopy.title}
                </h2>

                <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-white sm:text-lg">
                  {blogCopy.subtitle}
                </p>
              </div>

              <Link
                href="/blog"
                className="inline-flex min-h-[54px] items-center justify-center gap-3 rounded-2xl border border-violet-300/35 bg-violet-600 px-6 text-sm font-black text-white shadow-lg shadow-violet-950/35 transition hover:bg-violet-500"
              >
                {blogCopy.button}
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="mt-8 rounded-[1.7rem] border border-dashed border-violet-400/30 bg-black/30 p-6 text-center sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-300">
                <FileText size={26} />
              </div>

              <h3 className="mt-5 text-2xl font-black text-white">
                {blogCopy.emptyTitle}
              </h3>

              <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-300">
                {blogCopy.emptyText}
              </p>
            </div>
          </div>
        </section>

        <section id="pricing" className="relative z-10 mx-auto max-w-[1460px] px-5 py-24 lg:px-8">
          <div className="text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-violet-200">
              <Crown size={16} />
              {pricingUi.badge}
            </div>
            <h2 className="zedpera-section-title mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              {t.pricing.title}
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base font-bold leading-7 text-slate-300">
              {pricingUi.intro}
            </p>
          </div>

          {freePlan ? (
            <div className="mx-auto mt-12 max-w-4xl">
              <PricingCard
                plan={freePlan}
                loading={loadingPlan === freePlan.id}
                redirectingLabel={t.common.redirecting}
                onBuy={buy}
                copy={pricingUi}
              />
            </div>
          ) : null}

          <div className="mt-20">
            <div className="text-center">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
                {pricingUi.mainLabel}
              </div>
              <h3 className="mt-2 text-3xl font-black text-white">
                {pricingUi.mainTitle}
              </h3>
            </div>

            <div className="mt-10 grid gap-7 lg:grid-cols-3">
              {mainPlans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  loading={loadingPlan === plan.id}
                  redirectingLabel={t.common.redirecting}
                  onBuy={buy}
                  copy={pricingUi}
                />
              ))}
            </div>
          </div>

          <div id="doplnkove-sluzby" className="mt-24 scroll-mt-24">
            <div className="text-center">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                {pricingUi.addonLabel}
              </div>
              <h3 className="mt-2 text-3xl font-black text-white">
                {pricingUi.addonTitle}
              </h3>
              <p className="mx-auto mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-300">
                {pricingUi.addonSubtitle}
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {addonPlans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  loading={loadingPlan === plan.id}
                  redirectingLabel={t.common.redirecting}
                  onBuy={buy}
                  copy={pricingUi}
                />
              ))}
            </div>
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
          </div>

          {paymentError ? (
            <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-center text-sm font-bold text-red-200">
              {paymentError}
            </div>
          ) : null}
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
