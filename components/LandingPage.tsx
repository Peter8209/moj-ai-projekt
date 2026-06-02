'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  Crown,
  CreditCard,
  FileCheck2,
  Globe2,
  HelpCircle,
  GraduationCap,
  Loader2,
  Menu,
  MessageCircle,
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
  





function DropdownLanguageMenu({
  language,
  onChange,
  compact = false,
}: {
  language: AppLanguage;
  onChange: (language: AppLanguage) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (nextLanguage: AppLanguage) => {
    setOpen(false);
    onChange(nextLanguage);
  };

  return (
    <div
      className={`zedpera-language-menu relative ${compact ? 'w-full' : 'min-w-[320px]'}`}
      aria-label="Výber jazyka"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`zedpera-language-trigger group flex min-h-[64px] w-full items-center justify-between gap-4 rounded-[1.35rem] border-2 px-4 py-3 text-left transition ${
          compact ? 'w-full' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="zedpera-language-globe flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            <Globe2 size={25} strokeWidth={3} />
          </span>

          <span className="zedpera-language-code flex h-10 min-w-14 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-black">
            {getLanguageShortLabel(language)}
          </span>

          <span className="min-w-0">
            <span className="zedpera-language-label block truncate text-[11px] font-black uppercase tracking-[0.18em]">
              Jazyk stránky
            </span>
            <span className="zedpera-language-name block truncate text-base font-black">
              {getLanguageLabel(language)}
            </span>
          </span>
        </span>

        <span className="zedpera-language-chevron flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <ChevronDown
            size={22}
            strokeWidth={3}
            className={`transition ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <div
          className="zedpera-language-dropdown absolute right-0 top-[calc(100%+0.7rem)] z-[99999] max-h-[430px] w-full min-w-[360px] overflow-y-auto rounded-[1.35rem] border-2 p-2"
          role="listbox"
        >
          {languages.map((item) => {
            const code = item.code as AppLanguage;
            const active = language === code;

            return (
              <button
                key={code}
                type="button"
                onClick={() => handleSelect(code)}
                className={`zedpera-language-option flex min-h-[62px] w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  active ? 'zedpera-language-option-active' : 'zedpera-language-option-inactive'
                }`}
                role="option"
                aria-selected={active}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={`zedpera-language-option-code flex h-10 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                      active ? 'is-active' : ''
                    }`}
                  >
                    {getLanguageShortLabel(code)}
                  </span>

                  <span className="min-w-0">
                    <span className="zedpera-language-option-name block truncate text-base font-black">
                      {getLanguageLabel(code)}
                    </span>
                    <span className="zedpera-language-option-hint block truncate text-xs font-black">
                      {active ? 'Aktuálne zvolený jazyk' : 'Prepnúť jazyk stránky'}
                    </span>
                  </span>
                </span>

                {active ? (
                  <CheckCircle2 size={23} className="shrink-0" />
                ) : (
                  <ArrowRight size={20} className="shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const [language, setLanguage] = useState<AppLanguage>('sk');
  const [content, setContent] = useState<LandingContent>(baseContent);

  useEffect(() => {
    const resolveStoredLanguage = () => {
      if (typeof window === 'undefined') {
        return 'sk' as AppLanguage;
      }

      return normalizeLanguage(
        localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
          localStorage.getItem('zedpera_system_language') ||
          localStorage.getItem('zedpera_work_language') ||
          localStorage.getItem('app_language') ||
          'sk',
      );
    };

    const syncLanguage = (nextLanguage: AppLanguage, persist = false) => {
      void handleLanguageChange(nextLanguage, persist);
    };

    syncLanguage(resolveStoredLanguage(), false);

    const handleStorageLanguageChange = () => {
      syncLanguage(resolveStoredLanguage(), false);
    };

    const handleCustomLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppLanguage | { language?: AppLanguage }>;
      const detail = customEvent.detail;
      const nextLanguage =
        typeof detail === 'string'
          ? normalizeLanguage(detail)
          : normalizeLanguage(detail?.language || resolveStoredLanguage());

      syncLanguage(nextLanguage, false);
    };

    window.addEventListener('storage', handleStorageLanguageChange);
    window.addEventListener('zedpera-language-change', handleCustomLanguageChange);

    return () => {
      window.removeEventListener('storage', handleStorageLanguageChange);
      window.removeEventListener('zedpera-language-change', handleCustomLanguageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 520);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const scrollToSection = (target: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    const element = document.querySelector(target);

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
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
    <main className="zedpera-public-page min-h-screen overflow-x-hidden bg-[#05040a] text-white">
      <style jsx global>{`
        html,
        body {
          background: #05040a !important;
          color: #ffffff !important;
          scroll-behavior: smooth;
        }

        .zedpera-public-page,
        .zedpera-public-page * {
          opacity: 1 !important;
          visibility: visible !important;
          text-rendering: geometricPrecision !important;
          -webkit-font-smoothing: antialiased !important;
          text-shadow: none !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }

        .zedpera-public-page {
          background:
            radial-gradient(circle at 15% 8%, rgba(124, 58, 237, 0.34), transparent 28%),
            radial-gradient(circle at 82% 18%, rgba(59, 130, 246, 0.22), transparent 28%),
            radial-gradient(circle at 52% 72%, rgba(168, 85, 247, 0.16), transparent 32%),
            linear-gradient(180deg, #05040a 0%, #080716 42%, #05040a 100%) !important;
        }

        .zedpera-public-page :where(h1, h2, h3, h4, h5, h6, strong, b) {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
          letter-spacing: -0.035em;
        }

        .zedpera-public-page :where(p, li, span, div, label, small) {
          color: #dbeafe !important;
          -webkit-text-fill-color: #dbeafe !important;
          font-weight: 700 !important;
        }

        .zedpera-public-page a,
        .zedpera-public-page button {
          font-weight: 950 !important;
        }

        .zedpera-clickable,
        .zedpera-card,
        .zedpera-glass,
        .zedpera-plan-card,
        .zedpera-feature-card,
        .zedpera-about-card,
        .zedpera-review-card,
        .zedpera-comparison-card,
        .zedpera-mini-dashboard-card {
          cursor: pointer !important;
          user-select: none;
        }

        .zedpera-clickable:focus-visible,
        .zedpera-card:focus-visible,
        .zedpera-glass:focus-visible,
        .zedpera-plan-card:focus-visible,
        .zedpera-feature-card:focus-visible,
        .zedpera-about-card:focus-visible,
        .zedpera-review-card:focus-visible,
        .zedpera-comparison-card:focus-visible,
        .zedpera-mini-dashboard-card:focus-visible {
          outline: 3px solid rgba(168, 85, 247, 0.95) !important;
          outline-offset: 4px !important;
        }

        .zedpera-clickable:hover,
        .zedpera-feature-card:hover,
        .zedpera-about-card:hover,
        .zedpera-review-card:hover,
        .zedpera-comparison-card:hover,
        .zedpera-mini-dashboard-card:hover {
          transform: translateY(-3px);
          border-color: rgba(168, 85, 247, 0.58) !important;
          box-shadow: 0 28px 90px rgba(124, 58, 237, 0.22) !important;
        }

        .zedpera-public-page :where(.zedpera-card, .zedpera-glass, .zedpera-plan-card, .zedpera-feature-card, .zedpera-about-card, .zedpera-review-card, .zedpera-comparison-card) :where(p, li, span, div, label, small) {
          color: #eaf2ff !important;
          -webkit-text-fill-color: #eaf2ff !important;
          font-weight: 850 !important;
        }

        .zedpera-public-page :where(.zedpera-card, .zedpera-glass, .zedpera-plan-card, .zedpera-feature-card, .zedpera-about-card, .zedpera-review-card, .zedpera-comparison-card) :where(h1, h2, h3, h4, h5, h6, strong, b) {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
        }

        .zedpera-glass {
          background: rgba(13, 12, 28, 0.78) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35) !important;
          backdrop-filter: blur(18px);
        }

        .zedpera-card {
          background: linear-gradient(180deg, rgba(18, 17, 38, 0.96), rgba(9, 8, 23, 0.96)) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35) !important;
        }

        .zedpera-card:hover {
          transform: translateY(-3px);
          border-color: rgba(168, 85, 247, 0.55) !important;
          box-shadow: 0 28px 90px rgba(124, 58, 237, 0.20) !important;
        }

        .zedpera-pill {
          background: rgba(124, 58, 237, 0.14) !important;
          border: 1px solid rgba(168, 85, 247, 0.42) !important;
          color: #e9d5ff !important;
          -webkit-text-fill-color: #e9d5ff !important;
        }

        .zedpera-primary-btn {
          background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%) !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          box-shadow: 0 18px 50px rgba(124, 58, 237, 0.38) !important;
        }

        .zedpera-secondary-btn {
          background: rgba(255, 255, 255, 0.06) !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
        }

        .zedpera-public-page header,
        .zedpera-public-page header * {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
        }

        .zedpera-public-page .zedpera-wordmark,
        .zedpera-public-page .zedpera-wordmark * {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-brand-icon {
          display: none !important;
        }

        .zedpera-language-menu {
          z-index: 100000 !important;
        }

        .zedpera-language-trigger {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(37, 99, 235, 0.18)) !important;
          border-color: rgba(196, 181, 253, 0.95) !important;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.08) inset,
            0 18px 50px rgba(0, 0, 0, 0.28),
            0 0 35px rgba(124, 58, 237, 0.35) !important;
        }

        .zedpera-language-trigger:hover {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.38), rgba(37, 99, 235, 0.26)) !important;
          border-color: #ffffff !important;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.18) inset,
            0 22px 60px rgba(0, 0, 0, 0.35),
            0 0 46px rgba(168, 85, 247, 0.55) !important;
        }

        .zedpera-language-trigger,
        .zedpera-language-trigger * {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
        }

        .zedpera-language-globe,
        .zedpera-language-globe * {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          stroke: #ffffff !important;
          opacity: 1 !important;
          visibility: visible !important;
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.35)) !important;
        }

        .zedpera-language-code {
          background: linear-gradient(135deg, #7c3aed, #2563eb) !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.22) !important;
        }

        .zedpera-language-dropdown {
          background: #0b0a18 !important;
          border-color: rgba(168, 85, 247, 0.65) !important;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55) !important;
        }

        .zedpera-language-option:not([aria-selected='true']) {
          background: transparent !important;
        }

        .zedpera-language-option,
        .zedpera-language-option * {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
        }

        .zedpera-language-option[aria-selected='true'] {
          background: linear-gradient(135deg, #7c3aed, #2563eb) !important;
        }

        .zedpera-public-page input,
        .zedpera-public-page textarea,
        .zedpera-public-page select {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          font-weight: 900 !important;
        }

        .zedpera-public-page input::placeholder,
        .zedpera-public-page textarea::placeholder {
          color: #cbd5e1 !important;
          -webkit-text-fill-color: #cbd5e1 !important;
          opacity: 1 !important;
        }

        .zedpera-template-line {
          background: linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.95), transparent);
          height: 1px;
        }

        .zedpera-mock-grid {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
          background-size: 22px 22px;
        }



        .zedpera-language-trigger {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.44), rgba(37, 99, 235, 0.28)) !important;
          border-color: rgba(221, 214, 254, 0.95) !important;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.16) inset,
            0 20px 60px rgba(0, 0, 0, 0.42),
            0 0 42px rgba(124, 58, 237, 0.42) !important;
        }

        .zedpera-language-trigger:hover,
        .zedpera-language-trigger:focus-visible {
          transform: translateY(-1px);
          background: linear-gradient(135deg, rgba(147, 51, 234, 0.60), rgba(37, 99, 235, 0.38)) !important;
          border-color: #ffffff !important;
          outline: none !important;
          box-shadow:
            0 0 0 2px rgba(255, 255, 255, 0.20) inset,
            0 24px 70px rgba(0, 0, 0, 0.48),
            0 0 60px rgba(168, 85, 247, 0.72) !important;
        }

        .zedpera-language-globe {
          background: radial-gradient(circle at 30% 20%, #ffffff 0%, #ddd6fe 28%, #8b5cf6 58%, #2563eb 100%) !important;
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
          border: 2px solid rgba(255, 255, 255, 0.92) !important;
          box-shadow:
            0 0 0 4px rgba(124, 58, 237, 0.18),
            0 14px 34px rgba(124, 58, 237, 0.48) !important;
        }

        .zedpera-language-globe svg {
          color: #111827 !important;
          stroke: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
          filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.65)) !important;
        }

        .zedpera-language-code {
          background: #ffffff !important;
          color: #4c1d95 !important;
          -webkit-text-fill-color: #4c1d95 !important;
          border: 2px solid rgba(196, 181, 253, 0.95) !important;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22) !important;
        }

        .zedpera-language-label {
          color: #c4b5fd !important;
          -webkit-text-fill-color: #c4b5fd !important;
        }

        .zedpera-language-name,
        .zedpera-language-chevron,
        .zedpera-language-chevron svg {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          stroke: #ffffff !important;
        }

        .zedpera-language-chevron {
          background: rgba(255, 255, 255, 0.10) !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
        }

        .zedpera-language-dropdown {
          background: rgba(8, 7, 21, 0.98) !important;
          border-color: rgba(221, 214, 254, 0.72) !important;
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.70),
            0 0 55px rgba(124, 58, 237, 0.42) !important;
          backdrop-filter: blur(20px) !important;
        }

        .zedpera-language-option {
          border: 1px solid transparent !important;
        }

        .zedpera-language-option-inactive {
          background: rgba(255, 255, 255, 0.045) !important;
          color: #ffffff !important;
        }

        .zedpera-language-option-inactive:hover {
          background: rgba(124, 58, 237, 0.18) !important;
          border-color: rgba(196, 181, 253, 0.42) !important;
        }

        .zedpera-language-option-active {
          background: linear-gradient(135deg, #7c3aed, #2563eb) !important;
          border-color: rgba(255, 255, 255, 0.26) !important;
          box-shadow: 0 16px 38px rgba(37, 99, 235, 0.35) !important;
        }

        .zedpera-language-option-code {
          background: #ffffff !important;
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
          border: 1px solid rgba(255, 255, 255, 0.25) !important;
        }

        .zedpera-language-option-code.is-active {
          color: #4c1d95 !important;
          -webkit-text-fill-color: #4c1d95 !important;
        }

        .zedpera-language-option-name {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
        }

        .zedpera-language-option-hint {
          color: #cbd5e1 !important;
          -webkit-text-fill-color: #cbd5e1 !important;
        }

        .zedpera-founder-card,
        .zedpera-founder-visual {
          cursor: pointer !important;
        }

        .zedpera-founder-visual:hover,
        .zedpera-founder-card:hover {
          transform: translateY(-4px);
          border-color: rgba(196, 181, 253, 0.72) !important;
          box-shadow: 0 32px 96px rgba(124, 58, 237, 0.26) !important;
        }

        .zedpera-founder-avatar,
        .zedpera-founder-avatar * {
          color: #4c1d95 !important;
          -webkit-text-fill-color: #4c1d95 !important;
        }

        @media (max-width: 768px) {
          .zedpera-language-dropdown {
            left: 0 !important;
            right: auto !important;
            min-width: 100% !important;
          }
        }
      `}</style>

      <header className="sticky top-0 z-[9999] border-b border-white/10 bg-[#05040a]/82 px-5 py-4 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="#intro" className="zedpera-wordmark flex min-w-0 items-center gap-3">
            <span className="zedpera-brand-icon flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl">
              <Sparkles size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-black tracking-tight">ZEDPERA</span>
              <span className="block text-xs font-black uppercase tracking-[0.22em] text-violet-200">
                {content.brandSubtitle}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {[
              [content.navIntro, '#intro'],
              [content.navAbout, '#about'],
              [content.navFeatures, '#features'],
              [content.navReviews, '#reviews'],
              [content.navPricing, '#pricing'],
              [content.navFaq, '#faq'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-2xl px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <DropdownLanguageMenu language={language} onChange={handleLanguageChange} />
            <Link href="/login" className="zedpera-secondary-btn rounded-2xl px-5 py-3 text-sm font-black">
              {content.login}
            </Link>
            <a href="#pricing" className="zedpera-primary-btn rounded-2xl px-5 py-3 text-sm font-black">
              {content.chooseProgram}
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="zedpera-secondary-btn inline-flex h-12 w-12 items-center justify-center rounded-2xl xl:hidden"
            aria-label={content.mobileOpenMenu}
          >
            <Menu size={22} />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[100000] bg-black/70 p-4 backdrop-blur-xl xl:hidden">
            <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-[#0b0a18] p-5 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div className="text-xl font-black text-white">ZEDPERA</div>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="rounded-2xl bg-white/10 p-3 text-white"
                  aria-label={content.mobileCloseMenu}
                >
                  <X size={22} />
                </button>
              </div>

              <div className="mb-4">
                <DropdownLanguageMenu
                  language={language}
                  onChange={handleLanguageChange}
                  compact
                />
              </div>

              <div className="grid gap-2">
                {[
                  [content.navIntro, '#intro'],
                  [content.navAbout, '#about'],
                  [content.navFeatures, '#features'],
                  [content.navReviews, '#reviews'],
                  [content.navPricing, '#pricing'],
                  [content.navFaq, '#faq'],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={closeMobileMenu}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-sm font-black text-white"
                  >
                    {label}
                  </a>
                ))}
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="zedpera-secondary-btn rounded-2xl px-4 py-4 text-center text-sm font-black"
                >
                  {content.login}
                </Link>
                <a
                  href="#pricing"
                  onClick={closeMobileMenu}
                  className="zedpera-primary-btn rounded-2xl px-4 py-4 text-center text-sm font-black"
                >
                  {content.chooseProgram}
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      <section id="intro" className="relative isolate overflow-hidden px-5 pb-20 pt-20 lg:px-8 lg:pb-28 lg:pt-28">
        <div className="absolute inset-0 -z-10 zedpera-mock-grid opacity-70" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.04fr_0.96fr]">
          <div className="zedpera-hero-content">
            <div className="zedpera-pill mb-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black">
              <Sparkles size={18} />
              {content.heroBadge}
            </div>

            <h1 className="zedpera-hero-title max-w-5xl text-5xl font-black leading-[0.92] tracking-[-0.06em] text-white md:text-7xl xl:text-8xl">
              {content.heroTitle}
            </h1>

            <p className="zedpera-hero-text mt-7 max-w-3xl text-lg font-bold leading-9 text-slate-300 md:text-xl">
              {content.heroText}
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                href="#pricing"
                className="zedpera-primary-btn inline-flex items-center justify-center gap-3 rounded-2xl px-7 py-5 text-base font-black"
              >
                {content.heroCta}
                <ArrowRight size={20} />
              </a>
              <a
                href="#features"
                className="zedpera-secondary-btn inline-flex items-center justify-center gap-3 rounded-2xl px-7 py-5 text-base font-black"
              >
                {content.navFeatures}
                <Sparkles size={20} />
              </a>
            </div>

            <div className="mt-10 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['20', 'rokov skúseností'],
                ['100+', 'akademických tém'],
                ['24/7', 'AI vedúci'],
                ['1', 'platforma'],
              ].map(([value, label]) => (
                <div key={label} role="button" tabIndex={0} onClick={() => scrollToSection('#features')} className="zedpera-glass zedpera-clickable rounded-3xl p-5 text-center">
                  <div className="text-3xl font-black text-white">{value}</div>
                  <div className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-violet-200">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-full bg-violet-600/25 blur-3xl" />
            <div className="zedpera-glass overflow-hidden rounded-[2rem] p-4">
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-300" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-200">
                  AI vedúci aktívny
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-[160px_1fr]">
                <aside className="rounded-3xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-violet-200">
                    Menu
                  </div>
                  {['AI Chat', 'Moje práce', 'Zdroje', 'Audit', 'Obhajoba'].map((item, index) => (
                    <div
                      key={item}
                      className={`mb-2 rounded-2xl px-3 py-3 text-xs font-black ${
                        index === 0 ? 'bg-violet-600 text-white' : 'bg-white/[0.05] text-slate-300'
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </aside>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">
                        Dashboard práce
                      </div>
                      <div className="mt-2 text-2xl font-black text-white">
                        AI vedúci práce
                      </div>
                    </div>
                    <div className="rounded-2xl bg-violet-600/20 p-3 text-violet-200">
                      <Bot size={24} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {content.fiveBlocks.slice(0, 4).map((block, index) => (
                      <button
                        key={block.title}
                        type="button"
                        onClick={() => scrollToSection('#features')}
                        className="zedpera-mini-dashboard-card w-full rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left transition"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600 text-xs font-black text-white">
                            {index + 1}
                          </span>
                          <h3 className="text-sm font-black text-white">{block.title}</h3>
                        </div>
                        <p className="line-clamp-2 text-xs font-bold leading-6 text-slate-300">
                          {block.text}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-4xl">
            <div className="zedpera-pill mb-5 inline-flex rounded-full px-5 py-3 text-sm font-black">
              {content.aboutBadge}
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white md:text-6xl">
              {content.aboutTitle}
            </h2>
            <p className="mt-5 text-lg font-bold leading-9 text-slate-300">
              {content.aboutText}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {content.aboutCards.map((card) => (
              <article
                key={card.title}
                role="button"
                tabIndex={0}
                onClick={() => scrollToSection('#pricing')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    scrollToSection('#pricing');
                  }
                }}
                className="zedpera-card zedpera-about-card rounded-[2rem] p-7 transition"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-200">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-2xl font-black text-white">{card.title}</h3>
                <p className="mt-4 text-sm font-bold leading-8 text-slate-300">{card.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div
              role="button"
              tabIndex={0}
              onClick={() => scrollToSection('#pricing')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  scrollToSection('#pricing');
                }
              }}
              className="zedpera-card zedpera-founder-card rounded-[2rem] p-7 transition"
            >
              <div className="zedpera-pill mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black">
                <Crown size={16} />
                {content.founderBadge}
              </div>
              <h3 className="text-3xl font-black text-white">{content.founderTitle}</h3>
              <div className="mt-5 space-y-4">
                {content.founderParagraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm font-bold leading-8 text-slate-300">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <div className="zedpera-card rounded-[2rem] p-7">
              <h3 className="text-3xl font-black text-white">{content.boundariesTitle}</h3>
              <div className="mt-5 space-y-4">
                {content.boundariesParagraphs.slice(0, 3).map((paragraph) => (
                  <p key={paragraph} className="text-sm font-bold leading-8 text-slate-300">
                    {paragraph}
                  </p>
                ))}
              </div>
              <a href="#pricing" className="zedpera-primary-btn mt-7 inline-flex items-center gap-2 rounded-2xl px-6 py-4 text-sm font-black">
                {content.boundariesCta}
                <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-4xl text-center">
            <h2 className="text-4xl font-black tracking-tight text-white md:text-6xl">
              {content.featuresTitle}
            </h2>
            <p className="mt-5 text-lg font-bold leading-9 text-slate-300">
              {content.featuresText}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {content.features.map((feature) => {
              const Icon = featureIconMap[feature.icon] || Sparkles;
              return (
                <article
                  key={feature.title}
                  role="button"
                  tabIndex={0}
                  onClick={() => scrollToSection('#pricing')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      scrollToSection('#pricing');
                    }
                  }}
                  className="zedpera-card zedpera-feature-card rounded-[2rem] p-7 transition"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-200">
                    <Icon size={26} />
                  </div>
                  <h3 className="text-2xl font-black text-white">{feature.title}</h3>
                  <p className="mt-4 text-sm font-bold leading-8 text-slate-300">{feature.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-10 max-w-4xl text-center">
            <h2 className="text-4xl font-black tracking-tight text-white md:text-6xl">
              {content.comparisonTitle}
            </h2>
            <p className="mt-5 text-lg font-bold leading-9 text-slate-300">
              {content.comparisonText}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => scrollToSection('#pricing')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  scrollToSection('#pricing');
                }
              }}
              className="zedpera-card zedpera-comparison-card rounded-[2rem] p-7 transition"
            >
              <h3 className="mb-6 text-3xl font-black text-white">{content.comparison.badTitle}</h3>
              <ul className="space-y-3">
                {content.comparison.badItems.slice(0, 8).map((item) => (
                  <li key={item} className="flex gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold leading-7 text-slate-300">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-200">!</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => scrollToSection('#pricing')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  scrollToSection('#pricing');
                }
              }}
              className="zedpera-comparison-card rounded-[2rem] border border-violet-400/40 bg-violet-600/10 p-7 shadow-2xl shadow-violet-900/30 transition"
            >
              <h3 className="mb-6 text-3xl font-black text-white">{content.comparison.zedperaTitle}</h3>
              <ul className="space-y-3">
                {content.comparison.zedperaItems.slice(0, 8).map((item) => (
                  <li key={item} className="flex gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm font-bold leading-7 text-slate-200">
                    <CheckCircle2 className="mt-1 shrink-0 text-emerald-300" size={22} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="founder" className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-stretch gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <article
              role="button"
              tabIndex={0}
              onClick={() => scrollToSection('#pricing')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  scrollToSection('#pricing');
                }
              }}
              className="zedpera-founder-visual zedpera-clickable relative overflow-hidden rounded-[2.2rem] border border-violet-400/40 bg-gradient-to-br from-violet-950 via-[#0b0a18] to-blue-950 p-8 shadow-2xl shadow-violet-950/40 transition"
            >
              <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-500/30 blur-3xl" />
              <div className="absolute -bottom-20 left-8 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />

              <div className="relative z-10 flex h-full min-h-[360px] flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-100">
                    <Crown size={17} />
                    {content.founderBadge}
                  </div>

                  <h2 className="mt-7 max-w-xl text-4xl font-black tracking-tight text-white md:text-6xl">
                    Martina a 20 rokov skúseností v akademickej praxi
                  </h2>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-[170px_1fr] sm:items-end">
                  <div className="zedpera-founder-avatar flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-violet-500/40 to-blue-500/30 shadow-2xl shadow-black/30">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-4xl font-black text-violet-900 shadow-2xl">
                      M
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-white/12 bg-black/25 p-5 backdrop-blur-xl">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-violet-200">
                      O nás
                    </div>
                    <p className="mt-3 text-base font-bold leading-8 text-slate-200">
                      Za Zedperou stoja reálne skúsenosti so študentmi, školiteľmi,
                      posudkami, obhajobami a akademickým prostredím. Preto systém
                      nerieši iba text, ale celý proces práce.
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <article
              role="button"
              tabIndex={0}
              onClick={() => scrollToSection('#pricing')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  scrollToSection('#pricing');
                }
              }}
              className="zedpera-card zedpera-clickable rounded-[2.2rem] p-8 transition"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                <ShieldCheck size={17} />
                Prečo dôverovať Zedpere?
              </div>

              <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                {content.founderTitle}
              </h2>

              <div className="mt-6 space-y-4">
                {content.founderParagraphs.map((paragraph, index) => (
                  <div
                    key={`${paragraph}-${index}`}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.055] p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-black text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm font-bold leading-8 text-slate-200">
                      {paragraph}
                    </p>
                  </div>
                ))}
              </div>

              <a
                href="#pricing"
                onClick={(event) => event.stopPropagation()}
                className="zedpera-primary-btn mt-7 inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-sm font-black"
              >
                {content.boundariesCta}
                <ArrowRight size={18} />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section id="reviews" className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-4xl text-center">
            <div className="zedpera-pill mb-5 inline-flex rounded-full px-5 py-3 text-sm font-black">
              {content.reviewsBadge}
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white md:text-6xl">
              {content.reviewsTitle}
            </h2>
            <p className="mt-5 text-lg font-bold leading-9 text-slate-300">
              {content.reviewsText}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {content.reviews.slice(0, 6).map((review) => (
              <ReviewCard
                key={`${review.name}-${review.text}`}
                name={review.name}
                text={review.text}
                onClick={() => scrollToSection('#pricing')}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-4xl text-center">
            <div className="zedpera-pill mb-5 inline-flex rounded-full px-5 py-3 text-sm font-black">
              {content.pricingBadge}
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white md:text-6xl">
              {content.pricingTitle}
            </h2>
            <p className="mt-5 text-lg font-bold leading-9 text-slate-300">
              {content.pricingText}
            </p>
          </div>

          {paymentError && (
            <div className="mx-auto mb-8 max-w-3xl rounded-3xl border border-red-400/40 bg-red-500/10 p-5 text-center text-sm font-black text-red-100">
              {paymentError}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-3">
            {content.plans.map((plan) => (
              <article
                key={plan.id}
                role="button"
                tabIndex={0}
                onClick={() => void buy(plan.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void buy(plan.id);
                  }
                }}
                className={`zedpera-plan-card relative rounded-[2rem] border p-7 transition ${
                  plan.highlighted
                    ? 'border-violet-400/70 bg-violet-600/14 shadow-2xl shadow-violet-900/35'
                    : 'zedpera-card'
                }`}
              >
                {plan.badge && (
                  <div className="mb-5 inline-flex rounded-full border border-violet-400/40 bg-violet-500/16 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-violet-100">
                    {plan.badge}
                  </div>
                )}
                <h3 className="text-3xl font-black text-white">{plan.name}</h3>
                <p className="mt-2 text-sm font-black text-violet-200">{plan.subtitle}</p>
                <div className="mt-6 flex items-end gap-3">
                  <span className="text-5xl font-black text-white">{plan.price}</span>
                  {plan.oldPrice && <span className="pb-2 text-lg font-black text-slate-500 line-through">{plan.oldPrice}</span>}
                </div>
                <div className="mt-2 text-sm font-black text-slate-300">{plan.period}</div>
                <p className="mt-5 min-h-[72px] text-sm font-bold leading-7 text-slate-300">{plan.description}</p>
                <div className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-violet-200">
                  {content.packageContent}
                </div>
                <ul className="mt-4 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm font-bold text-slate-200">
                      <CheckCircle2 className="shrink-0 text-emerald-300" size={20} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void buy(plan.id);
                  }}
                  disabled={loadingPlan === plan.id}
                  className="zedpera-primary-btn mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loadingPlan === plan.id ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                  {loadingPlan === plan.id ? content.checkoutRedirecting : plan.button}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-black tracking-tight text-white md:text-6xl">{content.faqTitle}</h2>
            <p className="mt-5 text-lg font-bold leading-9 text-slate-300">{content.faqText}</p>
          </div>
          <div className="space-y-4">
            {content.faqItems.map((item, index) => (
              <div key={`${item.question}-${index}`} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/20">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-base font-black text-white md:text-lg">{item.question}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-violet-200 transition ${openFaqIndex === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaqIndex === index && (
                  <div className="border-t border-white/10 px-6 pb-6 pt-1">
                    <p className="text-sm font-bold leading-8 text-slate-300">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-violet-400/40 bg-violet-600/15 p-8 text-center shadow-2xl shadow-violet-900/35 md:p-12">
          <h2 className="text-4xl font-black tracking-tight text-white md:text-6xl">
            {content.legalTitle}
          </h2>
          <p className="mx-auto mt-6 max-w-4xl text-lg font-bold leading-9 text-slate-200">
            {content.legalText}
          </p>
          <a href="#pricing" className="zedpera-primary-btn mt-8 inline-flex items-center justify-center gap-3 rounded-2xl px-8 py-5 text-base font-black">
            {content.legalCta}
            <ArrowRight size={20} />
          </a>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-black text-white">{content.footerCopyright}</div>
            <div className="mt-1 text-sm font-bold text-slate-400">{content.footerSubtitle}</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/obchodne-podmienky" className="zedpera-secondary-btn rounded-2xl px-5 py-3 text-sm font-black">
              {content.terms}
            </Link>
            <Link href="/gdpr" className="zedpera-secondary-btn rounded-2xl px-5 py-3 text-sm font-black">
              {content.gdpr}
            </Link>
          </div>
        </div>
      </footer>

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="zedpera-primary-btn fixed bottom-6 right-6 z-[99999] inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-4 text-base font-black"
          aria-label="Návrat hore"
          title="Návrat hore"
        >
          <ArrowUp size={24} />
          <span className="hidden sm:inline">Hore</span>
        </button>
      )}
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

function ReviewCard({
  name,
  text,
  onClick,
}: {
  name: string;
  text: string;
  onClick?: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onClick) {
          event.preventDefault();
          onClick();
        }
      }}
      className="zedpera-review-card flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 transition"
    >
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
