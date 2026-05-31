'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  Crown,
  CreditCard,
  FileCheck2,
  Globe2,
  GraduationCap,
  Loader2,
  Menu,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import {
  languages,
  normalizeLanguage,
  type AppLanguage,
} from '@/lib/i18n';

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

type FeatureIconKey =
  | 'Bot'
  | 'GraduationCap'
  | 'BookOpen'
  | 'FileCheck2'
  | 'ShieldCheck'
  | 'Crown';

type FeatureItem = {
  icon: FeatureIconKey;
  title: string;
  text: string;
};

type TextBlock = {
  title: string;
  text: string;
};

type ComparisonContent = {
  badTitle: string;
  zedperaTitle: string;
  badItems: string[];
  zedperaItems: string[];
};

type FaqItem = {
  question: string;
  answer: string;
};

type ReviewItem = {
  name: string;
  text: string;
};

type CheckoutResponse = {
  ok?: boolean;
  url?: string;
  error?: string;
  message?: string;
  detail?: string;
  displayMessage?: string;
};

type LandingContent = {
  brandSubtitle: string;

  navIntro: string;
  navAbout: string;
  navFeatures: string;
  navReviews: string;
  navPricing: string;
  navFaq: string;
  login: string;
  chooseProgram: string;

  mobileOpenMenu: string;
  mobileCloseMenu: string;

  emailPrompt: string;
  paymentEmailRequired: string;
  paymentFailed: string;
  stripeMissingUrl: string;
  invalidPlanPrefix: string;
  checkoutRedirecting: string;

  heroBadge: string;
  heroTitle: string;
  heroText: string;
  heroCta: string;
  videoLabel: string;

  aboutBadge: string;
  aboutTitle: string;
  aboutText: string;
  aboutStoryTitle: string;
  aboutParagraphs: string[];
  aboutExperienceTitle: string;
  aboutExperienceParagraphs: string[];
  aboutCards: TextBlock[];
  founderBadge: string;
  founderTitle: string;
  founderParagraphs: string[];
  boundariesTitle: string;
  boundariesParagraphs: string[];
  boundariesCta: string;

  introSmallLabel: string;
  introTitle: string;
  introText: string;
  fiveBlocks: TextBlock[];
  tryZedpera: string;

  comparisonTitle: string;
  comparisonText: string;
  comparison: ComparisonContent;

  reviewsBadge: string;
  reviewsTitle: string;
  reviewsText: string;
  reviews: ReviewItem[];
  reviewsCtaTitle: string;
  reviewsCtaText: string;

  featuresTitle: string;
  featuresText: string;
  features: FeatureItem[];

  pricingBadge: string;
  pricingTitle: string;
  pricingText: string;
  packageContent: string;
  plans: Plan[];

  faqTitle: string;
  faqText: string;
  faqItems: FaqItem[];

  whyTitle: string;
  whyItems: string[];

  legalTitle: string;
  legalText: string;
  legalCta: string;

  footerCopyright: string;
  footerSubtitle: string;
  terms: string;
  gdpr: string;
};

const LANGUAGE_STORAGE_KEY = 'zedpera_language';
const LANDING_TRANSLATION_VERSION = 'v2';

const allowedPlans: PlanId[] = [
  'week-mini',
  'week-student',
  'week-pro',
  'monthly',
  'three-months',
  'year-pro',
  'year-max',
];

const languageLabels: Record<AppLanguage, string> = {
  sk: 'Slovenčina',
  cs: 'Čeština',
  en: 'English',
  de: 'Deutsch',
  pl: 'Polski',
  hu: 'Magyar',
};

const languageShortLabels: Record<AppLanguage, string> = {
  sk: 'SK',
  cs: 'CZ',
  en: 'EN',
  de: 'DE',
  pl: 'PL',
  hu: 'HU',
};

function getLanguageLabel(code: AppLanguage) {
  return languageLabels[code] || code.toUpperCase();
}

function getLanguageShortLabel(code: AppLanguage) {
  return languageShortLabels[code] || code.toUpperCase();
}

const featureIconMap = {
  Bot,
  GraduationCap,
  BookOpen,
  FileCheck2,
  ShieldCheck,
  Crown,
};

const baseContent: LandingContent = {
  brandSubtitle: 'AI akademický asistent',

  navIntro: 'Úvod',
  navAbout: 'O nás',
  navFeatures: 'Funkcie',
  navReviews: 'Recenzie',
  navPricing: 'Balíčky',
  navFaq: 'Otázky',
  login: 'Prihlásiť sa',
  chooseProgram: 'Vybrať program',

  mobileOpenMenu: 'Otvoriť menu',
  mobileCloseMenu: 'Zavrieť menu',

  emailPrompt: 'Zadajte e-mail, na ktorý bude naviazaná platba:',
  paymentEmailRequired: 'Pre pokračovanie na platbu je potrebný e-mail.',
  paymentFailed: 'Platbu sa nepodarilo vytvoriť.',
  stripeMissingUrl: 'Stripe nevygeneroval platobnú URL.',
  invalidPlanPrefix: 'Neplatný balík:',
  checkoutRedirecting: 'Presmerovávam...',

  heroBadge: 'Prvý akademický nástroj s AI vedúcim práce',
  heroTitle:
    'Prvý akademický nástroj na písanie prác, ktorý zvládne náročné praktické časti s AI vedúcim bez stresu a chaosu',
  heroText:
    'Vyskúšaj Zedperu, nástroj ktorý ťa prevedie celým procesom od prvého nápadu až po úspešnú obhajobu. AI vedúci práce ťa upozorní na chyby skôr, než ich uvidí školiteľ, je k dispozícii 24/7 a navrhne ti konkrétne opravy, ktoré posunú tvoju prácu na vyšší level.',
  heroCta: 'Začni písať bez stresu už dnes',
  videoLabel: 'Video',

  aboutBadge: 'O nás',
  aboutTitle: 'Zedpera vznikla z reálnych skúseností so študentmi',
  aboutText:
    'Za Zedperou stoja skúsenosti, ktoré nevznikli za pár mesiacov. Vznikali roky pri reálnych študentoch, ich problémoch, termínoch, pochybnostiach, školiteľoch, posudkoch, obhajobách a akademických prácach rôzneho typu.',
  aboutStoryTitle: 'Príbeh, ktorý začal ešte počas štúdia',
  aboutParagraphs: [
    'Pred mnohými rokmi sa stretli dvaja študenti, ktorí brázdili lavice na rovnakej univerzite. Prechádzali skúškami a hľadali cestu, ako celý systém zjednodušiť. Po ukončení štúdia vymysleli jednoduchý projekt a vôbec netušili, do čoho idú.',
    'Vytvorili sme službu, ktorá pomáha študentom pri písaní vysokoškolských prác a úspešne funguje 20 rokov. Za toto obdobie sme nazbierali množstvo reálnych skúseností a zistili, čo študentov najviac trápi.',
    'Vypočuli sme si veľa životných osudov a príbehov. Naši klienti sa pre nás stali viac než len zákazníkmi. S mnohými sme spolupracovali roky počas celého štúdia. Dennodenne sme riešili telefonáty, konzultácie, pripomienky, termíny, stres aj neistotu.',
    'Rukami nám prešli tisíce študentov denného aj externého štúdia. Práve preto sme hľadali cestu, ako celý proces zjednodušiť. Rozhodli sme sa využiť všetky skúsenosti, ktoré sme získali, a premeniť ich na systém, ktorý tento problém rieši komplexne, nie iba čiastočne.',
  ],
  aboutExperienceTitle: '20 rokov skúseností v jednom systéme',
  aboutExperienceParagraphs: [
    'Problém každého študenta nie je len zdĺhavé písanie práce. Často je to aj nefungujúci systém v školách, nedostatok času, ignorácia zo strany školiteľa alebo chýbajúca spätná väzba.',
    'Preto sme vytvorili službu, ktorá pokrýva všetko, čo bežný študent potrebuje: písanie práce, praktickú časť, zdroje, citácie, orientačnú kontrolu originality, spätnú väzbu, opravy, návrhy riešení aj prípravu na obhajobu.',
  ],
  aboutCards: [
    {
      title: 'Komplexná pomoc študentovi',
      text: 'Zedpera Vám pomôže s napísaním práce, praktickou časťou, vyhľadá zdroje, pomôže s citáciami, overí riziko zhody, bude Vašim školiteľom aj oponentom, opraví chyby, navrhne riešenia a pripraví Vás na obhajobu na základe posudkov.',
    },
    {
      title: 'Testované akademickou praxou',
      text: 'Zhrnuli sme do jedného projektu naše 20-ročné skúsenosti. Celý systém testovali stovky reálnych autorov, ktorí pôsobia priamo na akademickej pôde. Zedpera je trénovaná na rôzne typy prác od humanitných až po technické odbory.',
    },
    {
      title: 'Viac než generovanie textu',
      text: 'Nechceli sme vytvoriť iba ďalší nástroj na generovanie textov. Cieľom bolo vytvoriť systém, ktorý rozumie procesu písania, vie upozorniť na slabé miesta a pomáha študentovi premýšľať nad vlastnou prácou.',
    },
  ],
  founderBadge: 'Zakladateľka Martina',
  founderTitle: 'Skúsenosti zo štúdia, mentoringu aj akademického prostredia',
  founderParagraphs: [
    'Po ukončení vysokej školy založila spoločnosť, ktorá už 20 rokov pomáha študentom s písaním vysokoškolských prác. Zároveň sa venovala mentoringu v oblasti vzdelávania.',
    'Medzičasom pokračovala v rozširovaní vedomostí na ďalších univerzitách a sama pôsobila niekoľko rokov na akademickej pôde.',
    'Aktuálne sa venuje vývoju nových typov umelej inteligencie, ktoré sa dajú využiť v akademickom prostredí a pri podpore študentov počas celého procesu tvorby práce.',
  ],
  boundariesTitle: 'Neustále posúvame hranice',
  boundariesParagraphs: [
    'Zedpera nevznikla ako odpoveď na trend, ale ako reakcia na realitu, stres, časový tlak a pocit, že akademická práca je často skôr boj so systémom než proces učenia.',
    'Od začiatku sme vedeli, že nebudeme vyvíjať len ďalší nástroj na generovanie textu. Chceli sme vytvoriť systém, ktorý rozumie tomu, čo sa deje medzi riadkami, keď študent hľadá správny smer, zasekne sa a potrebuje spätnú väzbu, nie iba výsledok.',
    'Preto Zedpera nerastie len vo funkciách, ale hlavne v spôsobe, akým premýšľa. Neučíme ju len písať texty. Učíme ju rozumieť procesu.',
    'A práve preto ju neustále posúvame ďalej. Nie iba ako produkt, ale ako nový spôsob, akým sa dá pristupovať k učeniu, písaniu a premýšľaniu.',
  ],
  boundariesCta: 'Chcem začať so Zedperou',

  introSmallLabel: 'Úvodný text',
  introTitle: 'Inteligentný nástroj novej generácie pre akademické písanie',
  introText:
    'Predstavujeme vám inteligentný nástroj novej generácie, ktorý zásadne mení spôsob písania akademických prác. Zedpera ti pomáha premýšľať a zlepšovať tvoju prácu krok za krokom. Vďaka nej presne vieš, čo máš robiť ďalej bez zbytočného stresu alebo neistoty.',
  fiveBlocks: [
    {
      title: 'Rýchle vytvorenie práce',
      text: 'Zadaj tému, vyplň profil a získaj kvalitný odborný text prispôsobený tvojim požiadavkám a zdrojom. Systém nehalucinuje ako bežné AI nástroje, ale vychádza výhradne z tvojich zdrojov. Využíva pritom viacero najnovších AI modelov. Cituje presne podľa noriem, takže sa nemusíš báť plagiátorstva. Dokonca zvládne aj výpočty pri praktickej časti. Už nemusíš hľadať žiadneho štatistu alebo pracovať v programoch, ktorým nerozumieš.',
    },
    {
      title: 'AI kritik',
      text: 'Asistent zanalyzuje tvoju prácu, upozorní ťa na nedostatky a zároveň navrhne konkrétne úpravy. Získaj okamžitú spätnú väzbu. Zároveň zobrazí skóre kvality napísanej práce.',
    },
    {
      title: 'AI vedúci práce dostupný 24/7',
      text: 'Sprevádza ťa celým procesom písania, kontroluje tvoj text, navrhuje vylepšenia a ukazuje ti, ako ho posunúť na vyššiu úroveň. Keď dostaneš pripomienky od školiteľa, pomôže ti ich jednoducho zapracovať. Je ti k dispozícii nonstop a vždy sa sústredí len na tvoju prácu.',
    },
    {
      title: 'Kontrola originality',
      text: 'Získaj prehľad o originalite práce a minimalizuj riziko problémov s plagiátorstvom. Zedpera celý text skontroluje a vyhodnotí percento zhody. Overenie prebieha bezpečne a bez ukladania obsahu do verejných databáz, takže sa nemusíš obávať nežiaducich zhôd pri následnom odovzdaní práce do školského systému. Výsledok ti poskytne orientačný prehľad o miere originality a pomôže identifikovať časti, ktoré je vhodné upraviť.',
    },
    {
      title: 'Príprava na obhajobu',
      text: 'Po dokončení práce systém vygeneruje obhajobu, pripraví ti prezentáciu, odpovede na otázky vedúceho aj oponenta na základe posudkov spolu so sprievodným textom.',
    },
  ],
  tryZedpera: 'Chcem vyskúšať Zedperu',

  comparisonTitle: 'Prečo nestačí bežná AI alebo LLM nástroj?',
  comparisonText:
    'Bežné AI nástroje často generujú všeobecné texty, môžu uvádzať nepresné zdroje a nepoznajú celý kontext práce. Zedpera funguje inak. Namiesto univerzálnych odpovedí dostaneš výstup, ktorý súvisí s tvojou prácou, zdrojmi a celým procesom písania.',
  comparison: {
    badTitle: 'Bežná AI',
    zedperaTitle: 'Zedpera',
    badItems: [
      'Píše všeobecné texty a omáčky. Obsah môže byť síce dlhý, ale nemá žiadnu výpovednú hodnotu. Robí faktické chyby.',
      'Bežná AI si nepamätá Vašu tému, preto jej musíte neustále opakovať všetky informácie a zadávať dlhé prompty.',
      'Text je potrebné zdĺhavo upravovať.',
      'Vymýšľa si zdroje.',
      'Nechráni Vaše súkromie.',
      'Nedokáže upozorniť na chyby.',
      'Nerozumie pripomienkam od školiteľa.',
      'Nepomôže ti s výpočtami a praktickou časťou.',
      'Neoverí zhodu.',
      'Nedokáže reagovať na posudky.',
    ],
    zedperaItems: [
      'Pozná Vašu prácu. Dokonale si pamätá celú tému vrátane anotácie, cieľa, metodiky, hypotéz, spôsobu citovania, praktickej časti a kľúčových slov.',
      'Pozná celú históriu, dokonca aj komunikáciu. Nemusíte jej nič opakovať.',
      'Cituje presne podľa Vami zvolenej normy.',
      'Vychádza z Vašich zdrojov.',
      'Údaje sú chránené.',
      'Zanalyzuje prácu a upozorní na problémové časti.',
      'Sprevádza ťa celým procesom písania, kontroluje tvoj text, navrhuje vylepšenia a ukazuje ti, ako ho posunúť na vyššiu úroveň. Zároveň dokáže pomôcť s pripomienkami od vedúceho.',
      'Dokáže ti pripraviť praktickú časť vrátane analýz a výpočtov.',
      'Overí zhodu.',
      'Pomôže s obhajobou na základe posudkov.',
    ],
  },

  reviewsBadge: 'Recenzie',
  reviewsTitle: 'Skúsenosti študentov so Zedperou',
  reviewsText:
    'Skúsenosti používateľov, ktorí využili Zedperu pri seminárnych, bakalárskych, diplomových, rigoróznych a ďalších akademických prácach.',
  reviews: [
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
  ],
  reviewsCtaTitle: 'Chceš si Zedperu vyskúšať aj ty?',
  reviewsCtaText:
    'Vyber si program podľa rozsahu práce a začni pracovať s AI vedúcim, zdrojmi, citáciami, kontrolou kvality a prípravou na obhajobu.',

  featuresTitle: 'Funkcie aplikácie',
  featuresText:
    'Zedpera spája písanie, kontrolu kvality, citácie, obhajobu a odbornú spätnú väzbu v jednom rozhraní.',
  features: [
    {
      icon: 'Bot',
      title: 'AI písanie',
      text: 'Generovanie odborných kapitol, úvodov, záverov a akademických textov podľa profilu práce.',
    },
    {
      icon: 'GraduationCap',
      title: 'AI vedúci práce',
      text: 'Kritická spätná väzba k logike, metodológii, argumentácii, štruktúre a celkovej kvalite práce.',
    },
    {
      icon: 'BookOpen',
      title: 'Zdroje a citácie',
      text: 'Pomoc pri práci so zdrojmi, rešeršou, citáciami, bibliografiou a odborným aparátom.',
    },
    {
      icon: 'FileCheck2',
      title: 'Audit kvality',
      text: 'Kontrola slabých miest textu, rozporov, štylistiky, metodológie a akademickej presnosti.',
    },
    {
      icon: 'ShieldCheck',
      title: 'Originalita',
      text: 'Predbežná orientačná kontrola originality, rizikových pasáží a miest, kde treba doplniť citácie.',
    },
    {
      icon: 'Crown',
      title: 'Obhajoba',
      text: 'Príprava otázok, odpovedí, argumentácie, reakcií na posudok a prezentácie pred obhajobou.',
    },
  ],

  pricingBadge: 'Balíčky a platobná brána',
  pricingTitle: 'Vyber si program a prejdi na platbu',
  pricingText:
    'Tu si klient vyberie program podľa rozsahu práce. Po kliknutí na tlačidlo bude presmerovaný na platobnú bránu.',
  packageContent: 'Obsah balíka:',
  plans: [
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
  ],

  faqTitle: 'Často kladené otázky',
  faqText:
    'Najčastejšie otázky k používaniu Zedpery, AI vedúcemu, obhajobe, zdrojom a predplatnému.',
  faqItems: [
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
  ],

  whyTitle: 'Prečo písať prácu so Zedperou',
  whyItems: [
    'Ušetrí ti mnoho času, nemusíš hľadať najnovšie zdroje v knižniciach, v našej databáze nájdeš všetko, čo potrebuješ.',
    'Pozná tvoju tému, uvádza relevantné zdroje a vychádza z tvojich zdrojov.',
    'K dispozícií máš AI vedúceho a kritika zároveň, prevedú ťa celým procesom a sú k dispozícií 24/7.',
    'Zvládne aj praktickú časť vrátane výpočtov.',
    'Overí originalitu a zároveň ťa pripraví k obhajobe.',
  ],

  legalTitle: 'Je používanie Zedpery legálne?',
  legalText:
    'Áno, používanie Zedpery je úplne legálne a etické. Nekopíruješ texty umelej inteligencie, ale ty sám ich tvoríš. Prechádzaš jednotlivými kapitolami a Zedpera ti pomáha napísať celú prácu za minimum času. Stačí keď doplníš do čestného prehlásenia svojej práce, že pri niektorých častiach bola použitá umelá inteligencia.',
  legalCta: 'Začni písať bez stresu už dnes',

  footerCopyright: '© 2026 Zedpera',
  footerSubtitle: 'AI akademický asistent',
  terms: 'Obchodné podmienky',
  gdpr: 'GDPR',
};

function getCheckoutError(data: CheckoutResponse | null, fallback: string) {
  return (
    data?.displayMessage ||
    data?.message ||
    data?.detail ||
    data?.error ||
    fallback
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function cleanUiString(value: string) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldSkipLandingText(value: string, key = '') {
  const text = cleanUiString(value);
  const normalizedKey = key.toLowerCase();

  if (!text) return true;
  if (text.length < 2) return true;

  if (
    normalizedKey === 'id' ||
    normalizedKey === 'icon' ||
    normalizedKey === 'price' ||
    normalizedKey === 'oldprice' ||
    normalizedKey === 'highlighted'
  ) {
    return true;
  }

  if (/^https?:\/\//i.test(text)) return true;
  if (/^[\d\s.,€%+\-/:()]+$/.test(text)) return true;
  if (/^[A-Z0-9_-]{2,20}$/.test(text) && text !== 'GDPR') return true;

  return false;
}

function collectTranslatableTexts(value: unknown, key = ''): string[] {
  if (typeof value === 'string') {
    const cleaned = cleanUiString(value);
    return shouldSkipLandingText(cleaned, key) ? [] : [cleaned];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTranslatableTexts(item, key));
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([entryKey, entryValue]) =>
      collectTranslatableTexts(entryValue, entryKey),
    );
  }

  return [];
}

function uniqueTranslatableTexts(value: unknown) {
  return Array.from(new Set(collectTranslatableTexts(value)));
}

function applyAiTranslations<T>(value: T, translations: Record<string, string>, key = ''): T {
  if (typeof value === 'string') {
    const cleaned = cleanUiString(value);
    const translated = translations[cleaned];

    if (!translated || shouldSkipLandingText(cleaned, key)) {
      return value;
    }

    return translated as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => applyAiTranslations(item, translations, key)) as T;
  }

  if (isRecord(value)) {
    const nextObject: Record<string, unknown> = {};

    Object.entries(value).forEach(([entryKey, entryValue]) => {
      nextObject[entryKey] = applyAiTranslations(entryValue, translations, entryKey);
    });

    return nextObject as T;
  }

  return value;
}

function mergeContent(base: LandingContent, translated: unknown): LandingContent {
  if (!isRecord(translated)) return base;

  return {
    ...base,
    ...(translated as Partial<LandingContent>),
    comparison: {
      ...base.comparison,
      ...(isRecord(translated.comparison)
        ? (translated.comparison as Partial<ComparisonContent>)
        : {}),
    },
    plans: Array.isArray(translated.plans)
      ? (translated.plans as Plan[]).map((plan, index) => ({
          ...base.plans[index],
          ...plan,
          id: base.plans[index]?.id || plan.id,
          price: base.plans[index]?.price || plan.price,
          oldPrice: base.plans[index]?.oldPrice || plan.oldPrice,
          highlighted: base.plans[index]?.highlighted || plan.highlighted,
        }))
      : base.plans,
    features: Array.isArray(translated.features)
      ? (translated.features as FeatureItem[]).map((feature, index) => ({
          ...base.features[index],
          ...feature,
          icon: base.features[index]?.icon || feature.icon,
        }))
      : base.features,
    fiveBlocks: Array.isArray(translated.fiveBlocks)
      ? (translated.fiveBlocks as TextBlock[])
      : base.fiveBlocks,
    faqItems: Array.isArray(translated.faqItems)
      ? (translated.faqItems as FaqItem[])
      : base.faqItems,
    reviews: Array.isArray(translated.reviews)
      ? (translated.reviews as ReviewItem[])
      : base.reviews,
    aboutCards: Array.isArray(translated.aboutCards)
      ? (translated.aboutCards as TextBlock[])
      : base.aboutCards,
    aboutParagraphs: Array.isArray(translated.aboutParagraphs)
      ? (translated.aboutParagraphs as string[])
      : base.aboutParagraphs,
    aboutExperienceParagraphs: Array.isArray(translated.aboutExperienceParagraphs)
      ? (translated.aboutExperienceParagraphs as string[])
      : base.aboutExperienceParagraphs,
    founderParagraphs: Array.isArray(translated.founderParagraphs)
      ? (translated.founderParagraphs as string[])
      : base.founderParagraphs,
    boundariesParagraphs: Array.isArray(translated.boundariesParagraphs)
      ? (translated.boundariesParagraphs as string[])
      : base.boundariesParagraphs,
    whyItems: Array.isArray(translated.whyItems)
      ? (translated.whyItems as string[])
      : base.whyItems,
  };
}

async function translateTextChunk(language: AppLanguage, texts: string[]) {
  if (!texts.length) return {} as Record<string, string>;

  const res = await fetch('/api/translate-ui', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language,
      texts,
    }),
  });

  if (!res.ok) {
    throw new Error('Preklad stránky sa nepodarilo načítať.');
  }

  const data = await res.json();

  if (!data?.ok || !isRecord(data.translations)) {
    throw new Error('Preklad stránky nevrátil platnú mapu prekladov.');
  }

  return data.translations as Record<string, string>;
}

async function translateLandingContent(language: AppLanguage) {
  if (language === 'sk') {
    return baseContent;
  }

  const cacheKey = `zedpera_landing_${LANDING_TRANSLATION_VERSION}_${language}`;

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        return mergeContent(baseContent, JSON.parse(cached));
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }
  }

  const uniqueTexts = uniqueTranslatableTexts(baseContent);
  const chunks: string[][] = [];
  const chunkSize = 80;

  for (let index = 0; index < uniqueTexts.length; index += chunkSize) {
    chunks.push(uniqueTexts.slice(index, index + chunkSize));
  }

  const translationEntries = await Promise.all(
    chunks.map((chunk) => translateTextChunk(language, chunk)),
  );

  const translations = Object.assign({}, ...translationEntries) as Record<string, string>;
  const translatedObject = applyAiTranslations(baseContent, translations);
  const merged = mergeContent(baseContent, translatedObject);

  if (typeof window !== 'undefined') {
    localStorage.setItem(cacheKey, JSON.stringify(merged));
  }

  return merged;
}
  


function ClickableLanguageMenu({
  language,
  onChange,
  compact = false,
}: {
  language: AppLanguage;
  onChange: (language: AppLanguage) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-1 shadow-sm ${
        compact ? 'w-full' : ''
      }`}
      aria-label="Výber jazyka"
    >
      <div
        className={
          compact
            ? 'grid grid-cols-3 gap-1 sm:grid-cols-6'
            : 'flex items-center gap-1'
        }
      >
        {!compact && (
          <div className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <Globe2 size={17} />
          </div>
        )}

        {languages.map((item) => {
          const code = item.code as AppLanguage;
          const active = language === code;

          return (
            <button
              key={code}
              type="button"
              onClick={() => onChange(code)}
              title={getLanguageLabel(code)}
              aria-label={`Zmeniť jazyk na ${getLanguageLabel(code)}`}
              aria-pressed={active}
              className={`min-h-[38px] rounded-xl px-3 text-xs font-black tracking-wide transition ${
                active
                  ? 'bg-gradient-to-r from-violet-700 to-indigo-700 text-white shadow-lg shadow-violet-900/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              } ${compact ? 'w-full' : ''}`}
            >
              {getLanguageShortLabel(code)}
            </button>
          );
        })}
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
  const [content, setContent] = useState<LandingContent>(baseContent);

  useEffect(() => {
    const savedLanguage =
      typeof window !== 'undefined'
        ? normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
        : 'sk';

    setLanguage(savedLanguage);
    document.documentElement.lang = savedLanguage;

    if (savedLanguage !== 'sk') {
      void handleLanguageChange(savedLanguage, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLanguageChange = async (
    nextLanguage: AppLanguage,
    persist = true,
  ) => {
    try {
      setLanguage(nextLanguage);

      if (persist && typeof window !== 'undefined') {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
        localStorage.setItem('zedpera_system_language', nextLanguage);
        localStorage.setItem('zedpera_work_language', nextLanguage);
      }

      if (typeof document !== 'undefined') {
        document.documentElement.lang = nextLanguage;
        document.documentElement.setAttribute('data-language', nextLanguage);
        document.documentElement.setAttribute('data-system-language', nextLanguage);
        document.documentElement.setAttribute('data-work-language', nextLanguage);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('zedpera-language-change', {
            detail: nextLanguage,
          }),
        );
      }

      if (nextLanguage === 'sk') {
        setContent(baseContent);
        return;
      }

      const translatedContent = await translateLandingContent(nextLanguage);
      setContent(translatedContent);
    } catch (error) {
      console.warn('LANDING_TRANSLATION_WARNING:', error);
      setContent(baseContent);
    }
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
      const enteredEmail = window.prompt(content.emailPrompt);

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
          `${content.invalidPlanPrefix} ${planId}. ${allowedPlans.join(', ')}`,
        );
      }

      const email = await getEmailForCheckout();

      if (!email) {
        throw new Error(content.paymentEmailRequired);
      }

      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';

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

      const data = (await res.json().catch(() => null)) as
        | CheckoutResponse
        | null;

      if (!res.ok) {
        console.error('CHECKOUT ERROR:', data);
        throw new Error(getCheckoutError(data, content.paymentFailed));
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error(content.stripeMissingUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : content.paymentFailed;

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
    <main
      className="zedpera-public-page min-h-screen overflow-x-hidden bg-[#f8fafc] text-slate-950"
      style={{ backgroundColor: '#f8fafc', color: '#0f172a', opacity: 1 }}
    >
      <style jsx global>{`
        html,
        body {
          background: #f8fafc !important;
        }

        .zedpera-public-page,
        .zedpera-public-page section,
        .zedpera-public-page div,
        .zedpera-public-page article,
        .zedpera-public-page header,
        .zedpera-public-page footer {
          opacity: 1 !important;
        }

        .zedpera-public-page {
          background: #f8fafc !important;
          color: #0f172a !important;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        .zedpera-public-page header {
          background: rgba(2, 6, 23, 0.98) !important;
          color: #ffffff !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 18px 55px rgba(15, 23, 42, 0.2);
        }

        .zedpera-public-page header .text-slate-950,
        .zedpera-public-page header .text-slate-800,
        .zedpera-public-page header .text-slate-700 {
          color: #ffffff !important;
        }

        .zedpera-public-page header .text-slate-600,
        .zedpera-public-page header .text-slate-500 {
          color: #cbd5e1 !important;
        }

        .zedpera-public-page header nav a {
          color: #ede9fe !important;
        }

        .zedpera-public-page header nav a:hover {
          color: #c4b5fd !important;
        }


        .zedpera-public-page header [aria-label="Výber jazyka"] {
          background: #ffffff !important;
          color: #0f172a !important;
        }

        .zedpera-public-page header [aria-label="Výber jazyka"] .text-slate-600 {
          color: #475569 !important;
        }

        .zedpera-public-page header [aria-label="Výber jazyka"] .text-slate-950 {
          color: #0f172a !important;
        }

        .zedpera-public-page #intro {
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 52%, #ffffff 100%) !important;
        }

        .zedpera-public-page #intro,
        .zedpera-public-page .zedpera-visible-hero {
          position: relative !important;
          isolation: isolate !important;
          background: #ffffff !important;
          background-image: linear-gradient(180deg, #ffffff 0%, #f8f7ff 45%, #ffffff 100%) !important;
          color: #020617 !important;
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }

        .zedpera-public-page .zedpera-hero-content {
          position: relative !important;
          z-index: 20 !important;
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }

        .zedpera-public-page .zedpera-hero-title,
        .zedpera-public-page .zedpera-hero-title * {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.95) !important;
        }

        .zedpera-public-page .zedpera-hero-text,
        .zedpera-public-page .zedpera-hero-text * {
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }

        .zedpera-public-page .zedpera-hero-cta {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          opacity: 1 !important;
        }

        .zedpera-public-page .zedpera-hero-bg {
          opacity: 0.22 !important;
          z-index: 0 !important;
          pointer-events: none !important;
        }


        .zedpera-public-page #intro h1 {
          color: #0f172a !important;
          opacity: 1 !important;
          text-shadow: none !important;
        }

        .zedpera-public-page #intro p {
          color: #334155 !important;
          opacity: 1 !important;
          font-weight: 650;
        }

        .zedpera-public-page #intro .hero-visible-badge {
          color: #5b21b6 !important;
          background: #ffffff !important;
          border-color: #c4b5fd !important;
          box-shadow: 0 12px 35px rgba(124, 58, 237, 0.16);
        }

        .zedpera-public-page h1,
        .zedpera-public-page h2,
        .zedpera-public-page h3 {
          letter-spacing: -0.03em;
        }

        .zedpera-public-page section:not(.bg-slate-950) h2,
        .zedpera-public-page section:not(.bg-slate-950) h3 {
          color: #0f172a;
        }

        .zedpera-public-page section:not(.bg-slate-950) p,
        .zedpera-public-page section:not(.bg-slate-950) li {
          color: #334155;
        }

        .zedpera-public-page .bg-slate-950 h2,
        .zedpera-public-page .bg-slate-950 h3,
        .zedpera-public-page .bg-slate-950 .text-white {
          color: #ffffff !important;
        }

        .zedpera-public-page .bg-slate-950 p,
        .zedpera-public-page .bg-slate-950 li,
        .zedpera-public-page .bg-slate-950 .text-slate-300 {
          color: #cbd5e1 !important;
        }

        .zedpera-public-page a,
        .zedpera-public-page button {
          opacity: 1 !important;
        }

        @media (max-width: 768px) {
          .zedpera-public-page #intro h1 {
            font-size: 2.25rem !important;
            line-height: 1.12 !important;
          }

          .zedpera-public-page #intro p {
            font-size: 1rem !important;
            line-height: 1.7 !important;
          }
        }
      `}</style>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 text-white backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 py-3 lg:px-8">
          {/* PRVÝ RIADOK: logo + jazyková lišta + akčné tlačidlá */}
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg">
                <GraduationCap size={26} />
              </div>

              <div className="min-w-0 text-left">
                <div className="truncate text-2xl font-black tracking-tight text-white">
                  ZEDPERA
                </div>
                <div className="-mt-1 truncate text-sm font-semibold text-slate-300">
                  {content.brandSubtitle}
                </div>
              </div>
            </Link>

            <div className="hidden items-center gap-3 lg:flex">
              <ClickableLanguageMenu
                language={language}
                onChange={(nextLanguage) => {
                  void handleLanguageChange(nextLanguage);
                }}
              />


              <Link
                href="/login"
                className="relative z-50 rounded-2xl px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                {content.login}
              </Link>

              <a
                href="#pricing"
                className="relative z-50 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-6 py-3 text-sm font-black text-white shadow-xl shadow-violet-900/20 transition hover:opacity-90"
              >
                {content.chooseProgram}
              </a>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white lg:hidden"
              aria-label={content.mobileOpenMenu}
            >
              <Menu size={22} />
            </button>
          </div>

          {/* Mobil: jazyková lišta je hneď pod logom, ale stále v hornej časti hlavičky */}
          <div className="mt-3 flex items-center gap-2 lg:hidden">
            <div className="min-w-0 flex-1">
              <ClickableLanguageMenu
                language={language}
                compact
                onChange={(nextLanguage) => {
                  void handleLanguageChange(nextLanguage);
                }}
              />
            </div>


          </div>

          {/* DRUHÝ RIADOK: hlavná menu lišta */}
          <div className="mt-3 hidden border-t border-white/10 pt-3 lg:block">
            <nav className="flex items-center justify-center gap-8 text-sm font-bold text-violet-100">
              <a href="#intro" className="transition hover:text-violet-700">
                {content.navIntro}
              </a>

              <a href="#about" className="transition hover:text-violet-700">
                {content.navAbout}
              </a>

              <a href="#features" className="transition hover:text-violet-700">
                {content.navFeatures}
              </a>

              <a href="#reviews" className="transition hover:text-violet-700">
                {content.navReviews}
              </a>

              <a href="#pricing" className="transition hover:text-violet-700">
                {content.navPricing}
              </a>

              <a href="#faq" className="transition hover:text-violet-700">
                {content.navFaq}
              </a>
            </nav>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm lg:hidden">
          <div className="absolute right-0 top-0 h-full w-[86%] max-w-sm overflow-y-auto bg-white p-5 text-slate-950 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="text-xl font-black">ZEDPERA</div>

              <button
                type="button"
                onClick={closeMobileMenu}
                className="rounded-xl bg-slate-100 p-2"
                aria-label={content.mobileCloseMenu}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <div className="mb-3">
                  <div className="mb-2 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    <Globe2 size={15} className="text-violet-700" />
                    Jazyk
                  </div>

                  <ClickableLanguageMenu
                    language={language}
                    compact
                    onChange={(nextLanguage) => {
                      void handleLanguageChange(nextLanguage);
                    }}
                  />
                </div>


              </div>

              <a
                href="#intro"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold text-slate-800"
              >
                {content.navIntro}
              </a>

              <a
                href="#about"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold text-slate-800"
              >
                {content.navAbout}
              </a>

              <a
                href="#features"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                {content.navFeatures}
              </a>

              <a
                href="#reviews"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                {content.navReviews}
              </a>

              <a
                href="#pricing"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                {content.navPricing}
              </a>

              <a
                href="#faq"
                onClick={closeMobileMenu}
                className="block rounded-2xl bg-slate-100 px-4 py-3 font-bold"
              >
                {content.navFaq}
              </a>

              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-left font-bold"
              >
                {content.login}
              </Link>

              <a
                href="#pricing"
                onClick={closeMobileMenu}
                className="block w-full rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-4 py-3 text-left font-black text-white"
              >
                {content.chooseProgram}
              </a>
            </div>
          </div>
        </div>
      )}

      <section id="intro" className="zedpera-visible-hero relative isolate overflow-hidden bg-white">
       <div className="zedpera-hero-bg pointer-events-none absolute left-1/2 top-0 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-violet-100/30 blur-2xl" />

        <div className="zedpera-hero-content relative z-20 mx-auto max-w-7xl px-5 py-20 text-center lg:px-8 lg:py-28">
          <div className="hero-visible-badge mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800">
            <Sparkles size={17} />
            {content.heroBadge}
          </div>

          <h1
            className="zedpera-hero-title mx-auto max-w-5xl text-4xl font-black leading-[1.08] tracking-tight md:text-6xl"
            style={{ color: "#020617", WebkitTextFillColor: "#020617", opacity: 1, filter: "none" }}
          >
            {content.heroTitle}
          </h1>

          <p
            className="zedpera-hero-text mx-auto mt-6 max-w-3xl text-lg font-semibold leading-8 md:text-xl"
            style={{ color: "#1e293b", WebkitTextFillColor: "#1e293b", opacity: 1, filter: "none" }}
          >
            {content.heroText}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="#pricing"
              className="zedpera-hero-cta inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-7 py-4 text-base font-black text-white shadow-2xl shadow-violet-900/25 transition hover:opacity-90"
            >
              {content.heroCta}
              <ArrowRight size={20} />
            </a>
          </div>

          <div className="mx-auto mt-14 max-w-5xl">
            <div className="mb-4 text-sm font-black uppercase tracking-[0.25em] text-slate-500">
              {content.videoLabel}
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

      <section id="about" className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto mb-14 max-w-4xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-black text-violet-200">
              <Sparkles size={17} />
              {content.aboutBadge}
            </div>

            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              {content.aboutTitle}
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-300">
              {content.aboutText}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl shadow-black/20">
              <h3 className="text-2xl font-black text-white">
                {content.aboutStoryTitle}
              </h3>

              <div className="mt-5 space-y-5 text-base leading-8 text-slate-300">
                {content.aboutParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-indigo-600/20 p-7 shadow-2xl shadow-black/20">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-100">
                <GraduationCap size={30} />
              </div>

              <h3 className="text-2xl font-black text-white">
                {content.aboutExperienceTitle}
              </h3>

              {content.aboutExperienceParagraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-5 text-base leading-8 text-slate-300"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {content.aboutCards.map((item) => (
              <div
                key={item.title}
                className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20"
              >
                <h3 className="text-xl font-black text-white">{item.title}</h3>

                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-[2rem] border border-emerald-400/20 bg-emerald-500/10 p-7">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-200">
                  <Crown size={17} />
                  {content.founderBadge}
                </div>

                <h3 className="text-3xl font-black text-white">
                  {content.founderTitle}
                </h3>
              </div>

              <div className="space-y-5 text-base leading-8 text-slate-300">
                {content.founderParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-[2rem] border border-violet-400/20 bg-white/[0.04] p-7">
            <div className="mx-auto max-w-5xl text-center">
              <h3 className="text-3xl font-black text-white">
                {content.boundariesTitle}
              </h3>

              <div className="mt-6 space-y-5 text-base leading-8 text-slate-300">
                {content.boundariesParagraphs.map((paragraph, index) => (
                  <p
                    key={paragraph}
                    className={
                      index === content.boundariesParagraphs.length - 1
                        ? 'font-semibold text-white'
                        : ''
                    }
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="mt-8">
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-950 shadow-xl transition hover:bg-violet-50"
                >
                  {content.boundariesCta}
                  <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

     <section className="bg-[#f8fafc] py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto mb-12 max-w-4xl text-center">
            <div className="mb-4 text-sm font-black uppercase tracking-[0.25em] text-violet-700">
              {content.introSmallLabel}
            </div>

            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              {content.introTitle}
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              {content.introText}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {content.fiveBlocks.map((item) => (
              <InfoPanel key={item.title} title={item.title} text={item.text} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-300 bg-white px-7 py-4 text-sm font-black text-violet-800 shadow-xl shadow-slate-200/70 transition hover:bg-violet-50"
            >
              {content.tryZedpera}
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto mb-10 max-w-4xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              {content.comparisonTitle}
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              {content.comparisonText}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ComparisonBox
              title={content.comparison.badTitle}
              items={content.comparison.badItems}
              negative
            />

            <ComparisonBox
              title={content.comparison.zedperaTitle}
              items={content.comparison.zedperaItems}
            />
          </div>

          <div className="mt-10 text-center">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-7 py-4 text-sm font-black text-white shadow-2xl shadow-violet-900/25 transition hover:opacity-90"
            >
              {content.tryZedpera}
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
              {content.reviewsBadge}
            </div>

            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              {content.reviewsTitle}
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-300">
              {content.reviewsText}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {content.reviews.map((review, index) => (
              <ReviewCard
                key={`${review.name}-${index}`}
                name={review.name}
                text={review.text}
              />
            ))}
          </div>

          <div className="mt-12 rounded-[2rem] border border-violet-400/20 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-indigo-600/20 p-7 text-center">
            <h3 className="text-2xl font-black">{content.reviewsCtaTitle}</h3>

            <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              {content.reviewsCtaText}
            </p>

            <div className="mt-6">
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-950 shadow-xl transition hover:bg-violet-50"
              >
                {content.chooseProgram}
                <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-10">
          <h2 className="text-4xl font-black tracking-tight text-slate-950">
            {content.featuresTitle}
          </h2>

          <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
            {content.featuresText}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {content.features.map((item) => {
            const Icon = featureIconMap[item.icon] || Bot;

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
              {content.pricingBadge}
            </div>

            <h2 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              {content.pricingTitle}
            </h2>

            <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
              {content.pricingText}
            </p>
          </div>

          {paymentError && (
            <div className="mb-6 whitespace-pre-wrap rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold leading-6 text-red-700">
              {paymentError}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {content.plans.map((plan) => {
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
                        {content.checkoutRedirecting}
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
                      {content.packageContent}
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
              {content.faqTitle}
            </h2>

            <p className="mt-3 text-lg leading-8 text-slate-600">
              {content.faqText}
            </p>
          </div>

          <div className="space-y-4">
            {content.faqItems.map((item, index) => (
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
            {content.whyTitle}
          </h2>

          <ul className="mx-auto mt-8 max-w-3xl space-y-3 text-left text-base leading-7 text-slate-700">
            {content.whyItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="mt-8">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-300 bg-white px-7 py-4 text-sm font-black text-violet-800 shadow-xl shadow-slate-200/70 transition hover:bg-violet-50"
            >
              {content.tryZedpera}
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-5 text-center lg:px-8">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            {content.legalTitle}
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            {content.legalText}
          </p>

          <div className="mt-8">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-7 py-4 text-base font-black text-white shadow-2xl shadow-violet-900/25 transition hover:opacity-90"
            >
              {content.legalCta}
              <ArrowRight size={20} />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>
            <div>{content.footerCopyright}</div>
            <div className="mt-1">{content.footerSubtitle}</div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/obchodne-podmienky"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {content.terms}
            </Link>

            <Link
              href="/gdpr"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {content.gdpr}
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
