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
      className={`zedpera-language-menu relative ${compact ? 'w-full' : 'min-w-[280px]'}`}
      aria-label="Výber jazyka"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`zedpera-language-trigger flex min-h-[58px] w-full items-center justify-between gap-3 rounded-2xl border-2 border-violet-300 bg-white px-5 py-3 text-left text-slate-950 shadow-xl shadow-violet-200/60 transition hover:border-violet-700 hover:bg-violet-50 ${
          compact ? 'w-full' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="zedpera-language-code flex h-9 min-w-12 shrink-0 items-center justify-center rounded-xl bg-violet-700 px-3 text-sm font-black text-white shadow-md shadow-violet-900/20">
            {getLanguageShortLabel(language)}
          </span>

          <span className="truncate text-base font-black text-slate-950">
            {getLanguageLabel(language)}
          </span>
        </span>

        <ChevronDown
          size={20}
          className={`shrink-0 text-violet-800 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="zedpera-language-dropdown absolute right-0 top-[calc(100%+0.65rem)] z-[99999] max-h-[390px] w-full min-w-[330px] overflow-y-auto rounded-2xl border-2 border-violet-300 bg-white p-2 text-slate-950 shadow-2xl shadow-violet-300/70"
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
                className={`zedpera-language-option flex min-h-[54px] w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition ${
                  active
                    ? 'bg-violet-700 text-white shadow-lg shadow-violet-900/20'
                    : 'bg-white text-slate-950 hover:bg-violet-50'
                }`}
                role="option"
                aria-selected={active}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-9 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                      active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-950'
                    }`}
                  >
                    {getLanguageShortLabel(code)}
                  </span>

                  <span className="truncate text-base font-black">
                    {getLanguageLabel(code)}
                  </span>
                </span>

                {active && <CheckCircle2 size={20} className="shrink-0 text-white" />}
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


        /* PROFESIONÁLNE ZVÝRAZNENIE TEXTU NA CELEJ VEREJNEJ STRÁNKE */
        .zedpera-public-page,
        .zedpera-public-page * {
          opacity: 1 !important;
          text-rendering: geometricPrecision !important;
          -webkit-font-smoothing: antialiased !important;
          text-shadow: none !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }

        .zedpera-public-page :where(
          h1,
          h2,
          h3,
          h4,
          h5,
          h6,
          strong,
          b
        ) {
          color: #020617 !important;
          font-weight: 950 !important;
          letter-spacing: -0.025em;
        }

        .zedpera-public-page :where(
          p,
          li,
          span,
          div,
          label,
          small,
          a,
          button
        ) {
          color: #0f172a !important;
          font-weight: 750 !important;
        }

        .zedpera-public-page :where(
          .text-slate-300,
          .text-slate-400,
          .text-slate-500,
          .text-slate-600,
          .text-gray-300,
          .text-gray-400,
          .text-gray-500,
          .text-gray-600,
          .text-zinc-300,
          .text-zinc-400,
          .text-zinc-500,
          .text-zinc-600
        ) {
          color: #1e293b !important;
          font-weight: 800 !important;
        }

        .zedpera-public-page :where(
          .opacity-10,
          .opacity-20,
          .opacity-30,
          .opacity-40,
          .opacity-50,
          .opacity-60,
          .opacity-70,
          .opacity-75
        ) {
          opacity: 1 !important;
        }

        .zedpera-public-page :where(
          section,
          article,
          div,
          footer
        )[class*="bg-slate-950"],
        .zedpera-public-page :where(
          section,
          article,
          div,
          footer
        )[class*="bg-[#"],
        .zedpera-public-page :where(
          section,
          article,
          div,
          footer
        )[class*="bg-black"] {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          color: #020617 !important;
          border-color: #cbd5e1 !important;
        }

        .zedpera-public-page :where(
          section,
          article,
          div,
          footer
        )[class*="bg-slate-950"] *,
        .zedpera-public-page :where(
          section,
          article,
          div,
          footer
        )[class*="bg-[#"] *,
        .zedpera-public-page :where(
          section,
          article,
          div,
          footer
        )[class*="bg-black"] * {
          color: #020617 !important;
          opacity: 1 !important;
          font-weight: 800 !important;
        }

        .zedpera-public-page :where(
          input,
          textarea,
          select
        ) {
          background: #ffffff !important;
          color: #020617 !important;
          border-color: #cbd5e1 !important;
          font-weight: 800 !important;
        }

        .zedpera-public-page :where(
          input,
          textarea
        )::placeholder {
          color: #475569 !important;
          opacity: 1 !important;
          font-weight: 750 !important;
        }

        .zedpera-public-page .zedpera-language-status,
        .zedpera-public-page .zedpera-language-status * {
          color: #0f172a !important;
          opacity: 1 !important;
          font-weight: 900 !important;
        }

        .zedpera-public-page .bg-gradient-to-r,
        .zedpera-public-page .bg-gradient-to-br,
        .zedpera-public-page [class*="bg-violet-"],
        .zedpera-public-page [class*="bg-purple-"],
        .zedpera-public-page [class*="bg-indigo-"],
        .zedpera-public-page [class*="bg-blue-"],
        .zedpera-public-page [class*="bg-red-"] {
          color: #ffffff !important;
        }

        .zedpera-public-page .bg-gradient-to-r *,
        .zedpera-public-page .bg-gradient-to-br *,
        .zedpera-public-page [class*="bg-violet-"] *,
        .zedpera-public-page [class*="bg-purple-"] *,
        .zedpera-public-page [class*="bg-indigo-"] *,
        .zedpera-public-page [class*="bg-blue-"] *,
        .zedpera-public-page [class*="bg-red-"] * {
          color: #ffffff !important;
          font-weight: 900 !important;
        }

        .zedpera-public-page header,
        .zedpera-public-page header *,
        .zedpera-public-page .mobile-menu-panel,
        .zedpera-public-page .mobile-menu-panel * {
          color: inherit;
        }

        .zedpera-public-page header {
          background: rgba(255, 255, 255, 0.97) !important;
          color: #020617 !important;
          border-color: #cbd5e1 !important;
          box-shadow: 0 18px 55px rgba(15, 23, 42, 0.10);
        }

        .zedpera-public-page header .text-white,
        .zedpera-public-page header .text-slate-950,
        .zedpera-public-page header .text-slate-800,
        .zedpera-public-page header .text-slate-700 {
          color: #020617 !important;
        }

        .zedpera-public-page header .text-slate-600,
        .zedpera-public-page header .text-slate-500,
        .zedpera-public-page header .text-slate-300 {
          color: #1e293b !important;
        }

        .zedpera-public-page header nav a {
          color: #111827 !important;
          font-weight: 900 !important;
        }

        .zedpera-public-page header nav a:hover {
          color: #6d28d9 !important;
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


        /* FINÁLNE PROFESIONÁLNE ZVÝRAZNENIE - VIDITEĽNÉ VŠADE */
        .zedpera-public-page {
          background: #f8fafc !important;
          color: #020617 !important;
        }

        .zedpera-public-page section,
        .zedpera-public-page article,
        .zedpera-public-page footer,
        .zedpera-public-page .rounded-2xl,
        .zedpera-public-page .rounded-\\[2rem\\] {
          color: #020617 !important;
        }

        .zedpera-public-page section :where(h1, h2, h3, h4, h5, h6, strong, b),
        .zedpera-public-page article :where(h1, h2, h3, h4, h5, h6, strong, b),
        .zedpera-public-page footer :where(h1, h2, h3, h4, h5, h6, strong, b) {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          opacity: 1 !important;
          font-weight: 950 !important;
          text-shadow: none !important;
        }

        .zedpera-public-page section :where(p, li, span, div, label, small),
        .zedpera-public-page article :where(p, li, span, div, label, small),
        .zedpera-public-page footer :where(p, li, span, div, label, small) {
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          opacity: 1 !important;
          font-weight: 800 !important;
          text-shadow: none !important;
        }

        .zedpera-public-page section :where(.text-white, .text-slate-100, .text-slate-200, .text-slate-300, .text-slate-400, .text-slate-500, .text-slate-600),
        .zedpera-public-page article :where(.text-white, .text-slate-100, .text-slate-200, .text-slate-300, .text-slate-400, .text-slate-500, .text-slate-600),
        .zedpera-public-page footer :where(.text-white, .text-slate-100, .text-slate-200, .text-slate-300, .text-slate-400, .text-slate-500, .text-slate-600) {
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          opacity: 1 !important;
          font-weight: 850 !important;
        }

        .zedpera-public-page section[class*="bg-slate-950"],
        .zedpera-public-page div[class*="bg-white/"],
        .zedpera-public-page div[class*="bg-emerald-"],
        .zedpera-public-page div[class*="bg-violet-500/"],
        .zedpera-public-page div[class*="bg-gradient-to-br"] {
          background-color: #ffffff !important;
          background-image: none !important;
          color: #020617 !important;
          border-color: #cbd5e1 !important;
        }

        .zedpera-public-page .zedpera-language-menu,
        .zedpera-public-page .zedpera-language-menu *,
        .zedpera-public-page .zedpera-language-dropdown,
        .zedpera-public-page .zedpera-language-dropdown * {
          opacity: 1 !important;
          text-shadow: none !important;
          filter: none !important;
        }

        .zedpera-public-page .zedpera-language-trigger,
        .zedpera-public-page .zedpera-language-trigger * {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          font-weight: 900 !important;
        }

        .zedpera-public-page .zedpera-language-dropdown {
          background: #ffffff !important;
          color: #020617 !important;
          border-color: #cbd5e1 !important;
        }

        .zedpera-public-page .zedpera-language-dropdown button:not([aria-selected='true']),
        .zedpera-public-page .zedpera-language-dropdown button:not([aria-selected='true']) * {
          background: #ffffff !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          font-weight: 900 !important;
        }

        .zedpera-public-page .zedpera-language-dropdown button[aria-selected='true'],
        .zedpera-public-page .zedpera-language-dropdown button[aria-selected='true'] * {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page :where(a, button)[class*="bg-gradient"],
        .zedpera-public-page :where(a, button)[class*="bg-violet-"],
        .zedpera-public-page :where(a, button)[class*="bg-purple-"],
        .zedpera-public-page :where(a, button)[class*="bg-indigo-"],
        .zedpera-public-page :where(a, button)[class*="bg-blue-"],
        .zedpera-public-page :where(a, button)[class*="bg-red-"] {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page :where(a, button)[class*="bg-gradient"] *,
        .zedpera-public-page :where(a, button)[class*="bg-violet-"] *,
        .zedpera-public-page :where(a, button)[class*="bg-purple-"] *,
        .zedpera-public-page :where(a, button)[class*="bg-indigo-"] *,
        .zedpera-public-page :where(a, button)[class*="bg-blue-"] *,
        .zedpera-public-page :where(a, button)[class*="bg-red-"] * {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page header,
        .zedpera-public-page header * {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
        }

        .zedpera-public-page header a[class*="bg-gradient"],
        .zedpera-public-page header a[class*="bg-gradient"] *,
        .zedpera-public-page header div[class*="bg-gradient"],
        .zedpera-public-page header div[class*="bg-gradient"] * {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
        }


        /* FINAL V3: BEZ LOGO IKONY, BEZ TEXTU "JAZYK STRÁNKY", MAXIMÁLNA VIDITEĽNOSŤ */
        .zedpera-public-page header,
        .zedpera-public-page header > div,
        .zedpera-public-page header .mx-auto,
        .zedpera-public-page header .flex {
          overflow: visible !important;
        }

        .zedpera-public-page .zedpera-wordmark,
        .zedpera-public-page .zedpera-wordmark * {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          opacity: 1 !important;
          filter: none !important;
          text-shadow: none !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-wordmark div:last-child {
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          font-weight: 900 !important;
        }

        .zedpera-public-page .zedpera-brand-icon {
          display: none !important;
        }

        .zedpera-public-page .zedpera-language-menu {
          position: relative !important;
          z-index: 100000 !important;
          overflow: visible !important;
          min-width: 260px !important;
        }

        .zedpera-public-page .zedpera-language-trigger {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          border: 2px solid #c4b5fd !important;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12) !important;
          opacity: 1 !important;
          min-height: 54px !important;
        }

        .zedpera-public-page .zedpera-language-trigger,
        .zedpera-public-page .zedpera-language-trigger * {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          opacity: 1 !important;
          font-weight: 950 !important;
          filter: none !important;
          text-shadow: none !important;
        }

        .zedpera-public-page .zedpera-language-trigger:hover {
          background: #f5f3ff !important;
          border-color: #7c3aed !important;
        }

        .zedpera-public-page .zedpera-language-code {
          background: #6d28d9 !important;
          background-color: #6d28d9 !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-language-trigger svg {
          color: #6d28d9 !important;
          stroke: #6d28d9 !important;
          opacity: 1 !important;
          stroke-width: 2.7 !important;
        }

        .zedpera-public-page .zedpera-language-dropdown {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 1000000 !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          border: 2px solid #cbd5e1 !important;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24) !important;
          max-height: 360px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }

        .zedpera-public-page .zedpera-language-dropdown::-webkit-scrollbar {
          width: 10px;
        }

        .zedpera-public-page .zedpera-language-dropdown::-webkit-scrollbar-track {
          background: #eef2ff;
          border-radius: 999px;
        }

        .zedpera-public-page .zedpera-language-dropdown::-webkit-scrollbar-thumb {
          background: #8b5cf6;
          border-radius: 999px;
        }

        .zedpera-public-page .zedpera-language-option {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          border: 1px solid transparent !important;
          opacity: 1 !important;
          font-weight: 950 !important;
          min-height: 54px !important;
        }

        .zedpera-public-page .zedpera-language-option:hover {
          background: #f5f3ff !important;
          border-color: #ddd6fe !important;
        }

        .zedpera-public-page .zedpera-language-option,
        .zedpera-public-page .zedpera-language-option * {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          opacity: 1 !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-language-option[aria-selected='true'] {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%) !important;
          background-color: #6d28d9 !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          border-color: #6d28d9 !important;
          box-shadow: 0 12px 26px rgba(109, 40, 217, 0.28) !important;
        }

        .zedpera-public-page .zedpera-language-option[aria-selected='true'],
        .zedpera-public-page .zedpera-language-option[aria-selected='true'] * {
          color: #ffffff !important;
          stroke: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          opacity: 1 !important;
          font-weight: 950 !important;
        }

        /* Farebné ikony v kartách - nech nezaniknú */
        .zedpera-public-page article svg,
        .zedpera-public-page section svg {
          opacity: 1 !important;
          filter: none !important;
          visibility: visible !important;
          stroke-width: 2.6 !important;
        }

        .zedpera-public-page article [class*="bg-violet-50"],
        .zedpera-public-page article [class*="bg-purple-50"],
        .zedpera-public-page article [class*="bg-indigo-50"],
        .zedpera-public-page article [class*="bg-slate-100"] {
          background: #ede9fe !important;
          background-color: #ede9fe !important;
          color: #6d28d9 !important;
          border: 1px solid #ddd6fe !important;
        }

        .zedpera-public-page article [class*="bg-violet-50"] svg,
        .zedpera-public-page article [class*="bg-purple-50"] svg,
        .zedpera-public-page article [class*="bg-indigo-50"] svg,
        .zedpera-public-page article [class*="bg-slate-100"] svg {
          color: #6d28d9 !important;
          stroke: #6d28d9 !important;
        }

        /* Balíčky musia byť farebné, čitateľné a výrazné */
        .zedpera-public-page #pricing article,
        .zedpera-public-page #pricing .rounded-\\[2rem\\] {
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%) !important;
          border: 2px solid #ddd6fe !important;
          box-shadow: 0 18px 45px rgba(109, 40, 217, 0.12) !important;
          color: #020617 !important;
        }

        .zedpera-public-page #pricing article:nth-of-type(2n),
        .zedpera-public-page #pricing .grid > div:nth-child(2n) {
          background: linear-gradient(180deg, #ffffff 0%, #eef2ff 100%) !important;
          border-color: #bfdbfe !important;
          box-shadow: 0 18px 45px rgba(37, 99, 235, 0.10) !important;
        }

        .zedpera-public-page #pricing article:nth-of-type(3n),
        .zedpera-public-page #pricing .grid > div:nth-child(3n) {
          background: linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%) !important;
          border-color: #a7f3d0 !important;
          box-shadow: 0 18px 45px rgba(5, 150, 105, 0.10) !important;
        }

        .zedpera-public-page #pricing article *,
        .zedpera-public-page #pricing .rounded-\\[2rem\\] * {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          opacity: 1 !important;
          font-weight: 850 !important;
        }

        .zedpera-public-page #pricing article h3,
        .zedpera-public-page #pricing article .text-4xl,
        .zedpera-public-page #pricing article .text-5xl {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page #pricing article button,
        .zedpera-public-page #pricing article a,
        .zedpera-public-page #pricing .rounded-\\[2rem\\] button,
        .zedpera-public-page #pricing .rounded-\\[2rem\\] a {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%) !important;
          background-color: #7c3aed !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          border: 0 !important;
          box-shadow: 0 14px 30px rgba(79, 70, 229, 0.24) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page #pricing article button *,
        .zedpera-public-page #pricing article a *,
        .zedpera-public-page #pricing .rounded-\\[2rem\\] button *,
        .zedpera-public-page #pricing .rounded-\\[2rem\\] a * {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          stroke: #ffffff !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page #pricing article [class*="badge"],
        .zedpera-public-page #pricing article [class*="rounded-full"],
        .zedpera-public-page #pricing .rounded-\\[2rem\\] [class*="rounded-full"] {
          background: #ede9fe !important;
          color: #5b21b6 !important;
          -webkit-text-fill-color: #5b21b6 !important;
          border-color: #c4b5fd !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page #features article,
        .zedpera-public-page #features .rounded-\\[2rem\\] {
          background: #ffffff !important;
          border: 2px solid #e2e8f0 !important;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08) !important;
        }

        .zedpera-public-page img,
        .zedpera-public-page picture,
        .zedpera-public-page video,
        .zedpera-public-page iframe,
        .zedpera-public-page svg {
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
          visibility: visible !important;
        }


        /* =========================================================
           ZEDPERA FINAL PREMIUM DESIGN SYSTEM
           - všetky tlačidlá majú čierny text
           - biely/svetlý moderný podklad
           - farebné balíčky, ikony, znaky a dropdown
           - maximálna čitateľnosť a kontrast
        ========================================================= */

        :root {
          --zed-ink: #020617;
          --zed-ink-soft: #0f172a;
          --zed-muted: #334155;
          --zed-line: #dbe3ef;
          --zed-line-strong: #b8c4d6;
          --zed-card: rgba(255, 255, 255, 0.92);
          --zed-violet: #7c3aed;
          --zed-indigo: #4f46e5;
          --zed-blue: #2563eb;
          --zed-cyan: #0891b2;
          --zed-emerald: #059669;
          --zed-amber: #d97706;
          --zed-rose: #e11d48;
        }

        html,
        body {
          background: #f8fafc !important;
          color: var(--zed-ink) !important;
        }

        .zedpera-public-page,
        .zedpera-public-page * {
          opacity: 1 !important;
          visibility: visible !important;
          filter: none !important;
          mix-blend-mode: normal !important;
          text-shadow: none !important;
          -webkit-font-smoothing: antialiased !important;
          text-rendering: geometricPrecision !important;
        }

        .zedpera-public-page {
          background:
            radial-gradient(circle at 12% 0%, rgba(124, 58, 237, 0.12), transparent 28%),
            radial-gradient(circle at 88% 8%, rgba(37, 99, 235, 0.10), transparent 30%),
            radial-gradient(circle at 50% 48%, rgba(16, 185, 129, 0.07), transparent 34%),
            linear-gradient(180deg, #ffffff 0%, #f8fafc 42%, #eef4ff 100%) !important;
          color: var(--zed-ink) !important;
        }

        .zedpera-public-page :where(h1, h2, h3, h4, h5, h6, strong, b) {
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          font-weight: 950 !important;
          letter-spacing: -0.035em !important;
        }

        .zedpera-public-page :where(p, li, span, div, label, small) {
          color: var(--zed-ink-soft) !important;
          -webkit-text-fill-color: var(--zed-ink-soft) !important;
          font-weight: 850 !important;
        }

        .zedpera-public-page :where(
          .text-white,
          .text-slate-100,
          .text-slate-200,
          .text-slate-300,
          .text-slate-400,
          .text-slate-500,
          .text-slate-600,
          .text-gray-300,
          .text-gray-400,
          .text-gray-500,
          .text-zinc-400,
          .text-zinc-500
        ) {
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          font-weight: 900 !important;
        }

        /* HEADER */
        .zedpera-public-page header {
          position: sticky !important;
          z-index: 99990 !important;
          overflow: visible !important;
          background: rgba(255, 255, 255, 0.94) !important;
          backdrop-filter: blur(20px) saturate(180%) !important;
          border-bottom: 1px solid rgba(148, 163, 184, 0.35) !important;
          box-shadow: 0 16px 48px rgba(15, 23, 42, 0.10) !important;
        }

        .zedpera-public-page header > div,
        .zedpera-public-page header .mx-auto,
        .zedpera-public-page header .flex {
          overflow: visible !important;
        }

        .zedpera-public-page .zedpera-wordmark,
        .zedpera-public-page .zedpera-wordmark * {
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          opacity: 1 !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-wordmark div:first-child {
          font-size: 2rem !important;
          line-height: 1 !important;
          letter-spacing: -0.04em !important;
        }

        .zedpera-public-page .zedpera-wordmark div:last-child {
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          font-size: 1rem !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-brand-icon {
          display: none !important;
        }

        /* VŠETKY TLAČIDLÁ: ČIERNY TEXT, MODERNÝ SVETLÝ PODKLAD */
        .zedpera-public-page button,
        .zedpera-public-page a[role='button'],
        .zedpera-public-page a[class*="rounded"],
        .zedpera-public-page .zedpera-plan-button,
        .zedpera-public-page .zedpera-hero-cta {
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.96) 100%) !important;
          border: 1px solid rgba(148, 163, 184, 0.45) !important;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95) inset,
            0 16px 34px rgba(15, 23, 42, 0.10) !important;
          font-weight: 950 !important;
          opacity: 1 !important;
        }

        .zedpera-public-page button *,
        .zedpera-public-page a[role='button'] *,
        .zedpera-public-page a[class*="rounded"] *,
        .zedpera-public-page .zedpera-plan-button *,
        .zedpera-public-page .zedpera-hero-cta * {
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          stroke: var(--zed-ink) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page button:hover,
        .zedpera-public-page a[role='button']:hover,
        .zedpera-public-page a[class*="rounded"]:hover,
        .zedpera-public-page .zedpera-plan-button:hover,
        .zedpera-public-page .zedpera-hero-cta:hover {
          transform: translateY(-1px);
          background:
            linear-gradient(135deg, rgba(237, 233, 254, 0.98) 0%, rgba(219, 234, 254, 0.98) 100%) !important;
          border-color: rgba(124, 58, 237, 0.42) !important;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95) inset,
            0 20px 44px rgba(79, 70, 229, 0.16) !important;
        }

        .zedpera-public-page button:disabled,
        .zedpera-public-page button:disabled * {
          color: #475569 !important;
          -webkit-text-fill-color: #475569 !important;
          stroke: #475569 !important;
          opacity: 0.9 !important;
        }

        /* JAZYKOVÉ MENU */
        .zedpera-public-page .zedpera-language-menu {
          position: relative !important;
          z-index: 100000 !important;
          overflow: visible !important;
          min-width: 280px !important;
        }

        .zedpera-public-page .zedpera-language-trigger {
          min-height: 58px !important;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(245,243,255,0.98) 100%) !important;
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          border: 2px solid #a78bfa !important;
          box-shadow: 0 18px 42px rgba(124, 58, 237, 0.18) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-language-trigger,
        .zedpera-public-page .zedpera-language-trigger * {
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-language-code {
          background:
            linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          border: 1px solid #c4b5fd !important;
          box-shadow: 0 10px 24px rgba(79, 70, 229, 0.14) !important;
        }

        .zedpera-public-page .zedpera-language-trigger svg {
          color: var(--zed-ink) !important;
          stroke: var(--zed-ink) !important;
          stroke-width: 3 !important;
        }

        .zedpera-public-page .zedpera-language-dropdown {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 1000000 !important;
          max-height: 390px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          background: rgba(255,255,255,0.98) !important;
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          border: 2px solid #a78bfa !important;
          box-shadow: 0 32px 90px rgba(15, 23, 42, 0.28) !important;
          backdrop-filter: blur(18px) saturate(170%) !important;
        }

        .zedpera-public-page .zedpera-language-dropdown::-webkit-scrollbar {
          width: 11px;
        }

        .zedpera-public-page .zedpera-language-dropdown::-webkit-scrollbar-track {
          background: #eef2ff;
          border-radius: 999px;
        }

        .zedpera-public-page .zedpera-language-dropdown::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #7c3aed, #2563eb);
          border-radius: 999px;
        }

        .zedpera-public-page .zedpera-language-option {
          min-height: 56px !important;
          background: #ffffff !important;
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          border: 1px solid transparent !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-language-option:hover {
          background: #f5f3ff !important;
          border-color: #c4b5fd !important;
        }

        .zedpera-public-page .zedpera-language-option,
        .zedpera-public-page .zedpera-language-option * {
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-language-option[aria-selected='true'] {
          background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          border-color: #8b5cf6 !important;
          box-shadow: 0 12px 28px rgba(109, 40, 217, 0.16) !important;
        }

        .zedpera-public-page .zedpera-language-option[aria-selected='true'],
        .zedpera-public-page .zedpera-language-option[aria-selected='true'] * {
          color: var(--zed-ink) !important;
          stroke: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          font-weight: 950 !important;
        }

        /* KARTY A FUNKCIE */
        .zedpera-public-page #features article,
        .zedpera-public-page article {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.96) 100%) !important;
          border: 1px solid rgba(148, 163, 184, 0.28) !important;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08) !important;
        }

        .zedpera-public-page .zedpera-feature-icon {
          color: var(--zed-ink) !important;
          background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          border: 1px solid #c4b5fd !important;
          box-shadow: 0 16px 34px rgba(124, 58, 237, 0.16) !important;
        }

        .zedpera-public-page .zedpera-feature-icon svg {
          color: var(--zed-ink) !important;
          stroke: var(--zed-ink) !important;
          stroke-width: 2.8 !important;
        }

        .zedpera-public-page #features .grid > div:nth-child(2) .zedpera-feature-icon,
        .zedpera-public-page #features article:nth-child(2) .zedpera-feature-icon {
          background: linear-gradient(135deg, #dbeafe 0%, #cffafe 100%) !important;
          border-color: #93c5fd !important;
        }

        .zedpera-public-page #features .grid > div:nth-child(3) .zedpera-feature-icon,
        .zedpera-public-page #features article:nth-child(3) .zedpera-feature-icon {
          background: linear-gradient(135deg, #d1fae5 0%, #ccfbf1 100%) !important;
          border-color: #6ee7b7 !important;
        }

        .zedpera-public-page #features .grid > div:nth-child(4) .zedpera-feature-icon,
        .zedpera-public-page #features article:nth-child(4) .zedpera-feature-icon {
          background: linear-gradient(135deg, #ffedd5 0%, #fee2e2 100%) !important;
          border-color: #fdba74 !important;
        }

        .zedpera-public-page #features .grid > div:nth-child(5) .zedpera-feature-icon,
        .zedpera-public-page #features article:nth-child(5) .zedpera-feature-icon {
          background: linear-gradient(135deg, #fce7f3 0%, #ede9fe 100%) !important;
          border-color: #f0abfc !important;
        }

        .zedpera-public-page #features .grid > div:nth-child(6) .zedpera-feature-icon,
        .zedpera-public-page #features article:nth-child(6) .zedpera-feature-icon {
          background: linear-gradient(135deg, #fef3c7 0%, #ffedd5 100%) !important;
          border-color: #fcd34d !important;
        }

        /* BALÍČKY - FAREBNÉ, ALE TLAČIDLÁ S ČIERNYM TEXTOM */
        .zedpera-public-page #pricing {
          background:
            radial-gradient(circle at 12% 0%, rgba(124, 58, 237, 0.16), transparent 32%),
            radial-gradient(circle at 88% 12%, rgba(37, 99, 235, 0.14), transparent 30%),
            linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%) !important;
        }

        .zedpera-public-page .zedpera-plan-card {
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%) !important;
          border: 2px solid #ddd6fe !important;
          box-shadow: 0 26px 65px rgba(124, 58, 237, 0.15) !important;
          color: var(--zed-ink) !important;
        }

        .zedpera-public-page #pricing .grid > article:nth-child(2n) {
          background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%) !important;
          border-color: #bfdbfe !important;
          box-shadow: 0 26px 65px rgba(37, 99, 235, 0.14) !important;
        }

        .zedpera-public-page #pricing .grid > article:nth-child(3n) {
          background: linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%) !important;
          border-color: #a7f3d0 !important;
          box-shadow: 0 26px 65px rgba(5, 150, 105, 0.14) !important;
        }

        .zedpera-public-page .zedpera-plan-card,
        .zedpera-public-page .zedpera-plan-card * {
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          opacity: 1 !important;
          font-weight: 900 !important;
        }

        .zedpera-public-page .zedpera-plan-card h3,
        .zedpera-public-page .zedpera-plan-card .text-5xl,
        .zedpera-public-page .zedpera-plan-card .text-4xl {
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-plan-badge {
          background: #ede9fe !important;
          color: #5b21b6 !important;
          -webkit-text-fill-color: #5b21b6 !important;
          border: 1px solid #c4b5fd !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page #pricing .grid > article:nth-child(2n) .zedpera-plan-badge {
          background: #dbeafe !important;
          color: #1d4ed8 !important;
          -webkit-text-fill-color: #1d4ed8 !important;
          border-color: #93c5fd !important;
        }

        .zedpera-public-page #pricing .grid > article:nth-child(3n) .zedpera-plan-badge {
          background: #d1fae5 !important;
          color: #047857 !important;
          -webkit-text-fill-color: #047857 !important;
          border-color: #6ee7b7 !important;
        }

        .zedpera-public-page .zedpera-plan-button {
          background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          color: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          border: 1px solid #a78bfa !important;
          box-shadow: 0 18px 40px rgba(79, 70, 229, 0.20) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page #pricing .grid > article:nth-child(2n) .zedpera-plan-button {
          background: linear-gradient(135deg, #dbeafe 0%, #cffafe 100%) !important;
          border-color: #93c5fd !important;
          box-shadow: 0 18px 40px rgba(37, 99, 235, 0.18) !important;
        }

        .zedpera-public-page #pricing .grid > article:nth-child(3n) .zedpera-plan-button {
          background: linear-gradient(135deg, #d1fae5 0%, #ccfbf1 100%) !important;
          border-color: #6ee7b7 !important;
          box-shadow: 0 18px 40px rgba(5, 150, 105, 0.18) !important;
        }

        .zedpera-public-page .zedpera-plan-button,
        .zedpera-public-page .zedpera-plan-button *,
        .zedpera-public-page .zedpera-plan-button svg {
          color: var(--zed-ink) !important;
          stroke: var(--zed-ink) !important;
          -webkit-text-fill-color: var(--zed-ink) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page img,
        .zedpera-public-page picture,
        .zedpera-public-page video,
        .zedpera-public-page iframe,
        .zedpera-public-page svg {
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
          visibility: visible !important;
        }

        .zedpera-public-page svg {
          stroke-width: 2.45 !important;
        }


        /* =========================================================
           FINAL HEADER + MENU FIX
           - hlavné menu je celé viditeľné
           - všetky tlačidlá majú čierny text
           - CTA aj balíčky sú svetlé, moderné, výrazné
        ========================================================= */

        .zedpera-public-page header {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%) !important;
          border-bottom: 1px solid rgba(203, 213, 225, 0.95) !important;
          box-shadow: 0 18px 55px rgba(15, 23, 42, 0.10) !important;
          overflow: visible !important;
        }

        .zedpera-public-page header,
        .zedpera-public-page header *,
        .zedpera-public-page .zedpera-menu-row,
        .zedpera-public-page .zedpera-main-nav,
        .zedpera-public-page .zedpera-main-nav * {
          opacity: 1 !important;
          visibility: visible !important;
          filter: none !important;
          mix-blend-mode: normal !important;
          text-shadow: none !important;
        }

        .zedpera-public-page .zedpera-menu-row {
          background: transparent !important;
          border-color: #dbe3ef !important;
        }

        .zedpera-public-page .zedpera-main-nav {
          background: transparent !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
        }

        .zedpera-public-page .zedpera-menu-link {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 44px !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.98) 100%) !important;
          border: 1px solid #dbe3ef !important;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.95) inset,
            0 10px 24px rgba(15, 23, 42, 0.07) !important;
          font-weight: 950 !important;
          letter-spacing: -0.01em !important;
        }

        .zedpera-public-page .zedpera-menu-link:hover {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          border-color: #a78bfa !important;
          box-shadow: 0 16px 34px rgba(124, 58, 237, 0.14) !important;
          transform: translateY(-1px);
        }

        .zedpera-public-page .zedpera-header-login,
        .zedpera-public-page .zedpera-header-cta {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%) !important;
          border: 1px solid #dbe3ef !important;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.95) inset,
            0 14px 32px rgba(15, 23, 42, 0.10) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-header-cta {
          border-color: #a78bfa !important;
          background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          box-shadow: 0 16px 38px rgba(124, 58, 237, 0.18) !important;
        }

        .zedpera-public-page .zedpera-header-login:hover,
        .zedpera-public-page .zedpera-header-cta:hover {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          background: linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%) !important;
          border-color: #7c3aed !important;
          transform: translateY(-1px);
        }

        .zedpera-public-page .zedpera-header-login *,
        .zedpera-public-page .zedpera-header-cta *,
        .zedpera-public-page .zedpera-menu-link * {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          stroke: #020617 !important;
          font-weight: 950 !important;
        }

        /* Absolútne všetky tlačidlá/link-tlačidlá vo verejnej stránke majú čierny text. */
        .zedpera-public-page button,
        .zedpera-public-page a[class*="rounded"],
        .zedpera-public-page a[role="button"],
        .zedpera-public-page .zedpera-plan-button {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page button *,
        .zedpera-public-page a[class*="rounded"] *,
        .zedpera-public-page a[role="button"] *,
        .zedpera-public-page .zedpera-plan-button * {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          stroke: #020617 !important;
          font-weight: 950 !important;
        }

        /* Výnimka: iba aktívny riadok v rozbaľovacom jazykovom menu môže byť fialový, ale text stále ostáva čierny. */
        .zedpera-public-page .zedpera-language-option[aria-selected="true"],
        .zedpera-public-page .zedpera-language-option[aria-selected="true"] * {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          stroke: #020617 !important;
        }

        .zedpera-public-page .zedpera-language-option[aria-selected="true"] {
          background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          border-color: #8b5cf6 !important;
        }


        /* =========================================================
           ZEDPERA x THESIS.AI PREMIUM VISUAL SYSTEM
           Finálny dizajn:
           - farebne rozlíšené menu ako moderné akademické SaaS
           - všetky tlačidlá majú čierny text
           - biely / jemne krémový akademický podklad
           - farebné karty, balíčky, ikony a znaky
           - maximálna čitateľnosť
        ========================================================= */

        :root {
          --zdp-ink: #020617;
          --zdp-ink-2: #0f172a;
          --zdp-muted: #334155;
          --zdp-border: #d9e2ef;
          --zdp-border-strong: #aebbd0;
          --zdp-paper: #fffdf8;
          --zdp-paper-2: #f8fafc;
          --zdp-violet: #7c3aed;
          --zdp-blue: #2563eb;
          --zdp-cyan: #0891b2;
          --zdp-emerald: #059669;
          --zdp-amber: #d97706;
          --zdp-rose: #e11d48;
        }

        html,
        body {
          background: #fffdf8 !important;
          color: var(--zdp-ink) !important;
        }

        .zedpera-public-page {
          position: relative;
          background:
            radial-gradient(circle at 18% 4%, rgba(124, 58, 237, 0.10), transparent 30%),
            radial-gradient(circle at 82% 8%, rgba(37, 99, 235, 0.09), transparent 32%),
            radial-gradient(circle at 50% 52%, rgba(5, 150, 105, 0.06), transparent 34%),
            linear-gradient(180deg, #fffdf8 0%, #ffffff 40%, #f3f7ff 100%) !important;
          color: var(--zdp-ink) !important;
        }

        .zedpera-public-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.34;
          background-image:
            radial-gradient(circle, rgba(15, 23, 42, 0.14) 1px, transparent 1px);
          background-size: 22px 22px;
          mask-image: linear-gradient(180deg, black 0%, transparent 72%);
        }

        .zedpera-public-page > * {
          position: relative;
          z-index: 1;
        }

        .zedpera-public-page,
        .zedpera-public-page * {
          opacity: 1 !important;
          visibility: visible !important;
          filter: none !important;
          mix-blend-mode: normal !important;
          text-shadow: none !important;
          -webkit-font-smoothing: antialiased !important;
          text-rendering: geometricPrecision !important;
        }

        .zedpera-public-page :where(h1, h2, h3, h4, h5, h6, strong, b) {
          color: var(--zdp-ink) !important;
          -webkit-text-fill-color: var(--zdp-ink) !important;
          font-weight: 950 !important;
          letter-spacing: -0.04em !important;
        }

        .zedpera-public-page :where(p, li, span, div, label, small) {
          color: var(--zdp-ink-2) !important;
          -webkit-text-fill-color: var(--zdp-ink-2) !important;
          font-weight: 850 !important;
        }

        .zedpera-public-page :where(
          .text-white,
          .text-slate-100,
          .text-slate-200,
          .text-slate-300,
          .text-slate-400,
          .text-slate-500,
          .text-slate-600,
          .text-gray-300,
          .text-gray-400,
          .text-gray-500,
          .text-zinc-400,
          .text-zinc-500
        ) {
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          font-weight: 900 !important;
        }

        /* HEADER */
        .zedpera-public-page header {
          z-index: 99990 !important;
          overflow: visible !important;
          background: rgba(255, 253, 248, 0.92) !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
          border-bottom: 1px solid rgba(148, 163, 184, 0.34) !important;
          box-shadow: 0 18px 55px rgba(15, 23, 42, 0.10) !important;
        }

        .zedpera-public-page header > div,
        .zedpera-public-page header .mx-auto,
        .zedpera-public-page header .flex {
          overflow: visible !important;
        }

        .zedpera-public-page .zedpera-wordmark,
        .zedpera-public-page .zedpera-wordmark * {
          color: var(--zdp-ink) !important;
          -webkit-text-fill-color: var(--zdp-ink) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-wordmark div:first-child {
          font-size: 2.15rem !important;
          line-height: 1 !important;
          letter-spacing: -0.045em !important;
        }

        .zedpera-public-page .zedpera-wordmark div:last-child {
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          font-size: 1rem !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-brand-icon {
          display: none !important;
        }

        /* LANGUAGE MENU */
        .zedpera-public-page .zedpera-language-menu {
          position: relative !important;
          z-index: 100000 !important;
          min-width: 280px !important;
          overflow: visible !important;
        }

        .zedpera-public-page .zedpera-language-trigger {
          min-height: 58px !important;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(245,243,255,0.98) 100%) !important;
          border: 2px solid #c4b5fd !important;
          border-radius: 1.25rem !important;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.95) inset,
            0 20px 48px rgba(124, 58, 237, 0.16) !important;
        }

        .zedpera-public-page .zedpera-language-trigger,
        .zedpera-public-page .zedpera-language-trigger * {
          color: var(--zdp-ink) !important;
          -webkit-text-fill-color: var(--zdp-ink) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-language-code {
          background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          color: var(--zdp-ink) !important;
          -webkit-text-fill-color: var(--zdp-ink) !important;
          border: 1px solid #a78bfa !important;
          box-shadow: 0 10px 24px rgba(79, 70, 229, 0.16) !important;
        }

        .zedpera-public-page .zedpera-language-trigger svg {
          color: var(--zdp-ink) !important;
          stroke: var(--zdp-ink) !important;
          stroke-width: 3 !important;
        }

        .zedpera-public-page .zedpera-language-dropdown {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 1000000 !important;
          max-height: 390px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          background: rgba(255, 255, 255, 0.98) !important;
          color: var(--zdp-ink) !important;
          -webkit-text-fill-color: var(--zdp-ink) !important;
          border: 2px solid #c4b5fd !important;
          box-shadow: 0 32px 90px rgba(15, 23, 42, 0.28) !important;
          backdrop-filter: blur(18px) saturate(170%) !important;
        }

        .zedpera-public-page .zedpera-language-dropdown::-webkit-scrollbar {
          width: 11px;
        }

        .zedpera-public-page .zedpera-language-dropdown::-webkit-scrollbar-track {
          background: #eef2ff;
          border-radius: 999px;
        }

        .zedpera-public-page .zedpera-language-dropdown::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #7c3aed, #2563eb);
          border-radius: 999px;
        }

        .zedpera-public-page .zedpera-language-option {
          min-height: 56px !important;
          background: #ffffff !important;
          color: var(--zdp-ink) !important;
          -webkit-text-fill-color: var(--zdp-ink) !important;
          border: 1px solid transparent !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-language-option:hover,
        .zedpera-public-page .zedpera-language-option[aria-selected="true"] {
          background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          border-color: #8b5cf6 !important;
        }

        .zedpera-public-page .zedpera-language-option,
        .zedpera-public-page .zedpera-language-option * {
          color: var(--zdp-ink) !important;
          stroke: var(--zdp-ink) !important;
          -webkit-text-fill-color: var(--zdp-ink) !important;
          font-weight: 950 !important;
        }

        /* MENU LINKS - farebne odlíšené thesis.ai štýl */
        .zedpera-public-page .zedpera-menu-row {
          background: transparent !important;
          border-color: #dbe3ef !important;
        }

        .zedpera-public-page .zedpera-main-nav {
          background: transparent !important;
          color: var(--zdp-ink) !important;
          -webkit-text-fill-color: var(--zdp-ink) !important;
        }

        .zedpera-public-page .zedpera-menu-link {
          display: inline-flex !important;
          min-height: 46px !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 1.25rem !important;
          color: var(--zdp-ink) !important;
          -webkit-text-fill-color: var(--zdp-ink) !important;
          border: 1px solid rgba(148, 163, 184, 0.38) !important;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.95) inset,
            0 12px 28px rgba(15, 23, 42, 0.08) !important;
          font-weight: 950 !important;
          letter-spacing: -0.012em !important;
        }

        .zedpera-public-page .zedpera-main-nav .zedpera-menu-link:nth-child(1) {
          background: linear-gradient(135deg, #ede9fe 0%, #ffffff 100%) !important;
          border-color: #c4b5fd !important;
        }

        .zedpera-public-page .zedpera-main-nav .zedpera-menu-link:nth-child(2) {
          background: linear-gradient(135deg, #dbeafe 0%, #ffffff 100%) !important;
          border-color: #93c5fd !important;
        }

        .zedpera-public-page .zedpera-main-nav .zedpera-menu-link:nth-child(3) {
          background: linear-gradient(135deg, #d1fae5 0%, #ffffff 100%) !important;
          border-color: #6ee7b7 !important;
        }

        .zedpera-public-page .zedpera-main-nav .zedpera-menu-link:nth-child(4) {
          background: linear-gradient(135deg, #ffedd5 0%, #ffffff 100%) !important;
          border-color: #fdba74 !important;
        }

        .zedpera-public-page .zedpera-main-nav .zedpera-menu-link:nth-child(5) {
          background: linear-gradient(135deg, #fce7f3 0%, #ffffff 100%) !important;
          border-color: #f0abfc !important;
        }

        .zedpera-public-page .zedpera-main-nav .zedpera-menu-link:nth-child(6) {
          background: linear-gradient(135deg, #fef3c7 0%, #ffffff 100%) !important;
          border-color: #fcd34d !important;
        }

        .zedpera-public-page .zedpera-menu-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 20px 44px rgba(79, 70, 229, 0.14) !important;
        }

        /* ALL BUTTONS BLACK TEXT */
        .zedpera-public-page button,
        .zedpera-public-page a[class*="rounded"],
        .zedpera-public-page a[role="button"],
        .zedpera-public-page .zedpera-header-login,
        .zedpera-public-page .zedpera-header-cta,
        .zedpera-public-page .zedpera-plan-button {
          color: var(--zdp-ink) !important;
          -webkit-text-fill-color: var(--zdp-ink) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page button *,
        .zedpera-public-page a[class*="rounded"] *,
        .zedpera-public-page a[role="button"] *,
        .zedpera-public-page .zedpera-header-login *,
        .zedpera-public-page .zedpera-header-cta *,
        .zedpera-public-page .zedpera-plan-button * {
          color: var(--zdp-ink) !important;
          -webkit-text-fill-color: var(--zdp-ink) !important;
          stroke: var(--zdp-ink) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-header-login,
        .zedpera-public-page .zedpera-header-cta {
          background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%) !important;
          border: 1px solid #dbe3ef !important;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.95) inset,
            0 14px 32px rgba(15, 23, 42, 0.10) !important;
        }

        .zedpera-public-page .zedpera-header-cta {
          background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          border-color: #a78bfa !important;
          box-shadow: 0 18px 40px rgba(124, 58, 237, 0.18) !important;
        }

        /* CARDS + ICONS */
        .zedpera-public-page article,
        .zedpera-public-page #features article {
          background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.96) 100%) !important;
          border: 1px solid rgba(148, 163, 184, 0.28) !important;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08) !important;
        }

        .zedpera-public-page .zedpera-feature-icon {
          color: var(--zdp-ink) !important;
          background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          border: 1px solid #c4b5fd !important;
          box-shadow: 0 16px 34px rgba(124, 58, 237, 0.16) !important;
        }

        .zedpera-public-page .zedpera-feature-icon svg {
          color: var(--zdp-ink) !important;
          stroke: var(--zdp-ink) !important;
          stroke-width: 2.8 !important;
        }

        .zedpera-public-page #features .grid > div:nth-child(2) .zedpera-feature-icon,
        .zedpera-public-page #features article:nth-child(2) .zedpera-feature-icon {
          background: linear-gradient(135deg, #dbeafe 0%, #cffafe 100%) !important;
          border-color: #93c5fd !important;
        }

        .zedpera-public-page #features .grid > div:nth-child(3) .zedpera-feature-icon,
        .zedpera-public-page #features article:nth-child(3) .zedpera-feature-icon {
          background: linear-gradient(135deg, #d1fae5 0%, #ccfbf1 100%) !important;
          border-color: #6ee7b7 !important;
        }

        .zedpera-public-page #features .grid > div:nth-child(4) .zedpera-feature-icon,
        .zedpera-public-page #features article:nth-child(4) .zedpera-feature-icon {
          background: linear-gradient(135deg, #ffedd5 0%, #fee2e2 100%) !important;
          border-color: #fdba74 !important;
        }

        .zedpera-public-page #features .grid > div:nth-child(5) .zedpera-feature-icon,
        .zedpera-public-page #features article:nth-child(5) .zedpera-feature-icon {
          background: linear-gradient(135deg, #fce7f3 0%, #ede9fe 100%) !important;
          border-color: #f0abfc !important;
        }

        .zedpera-public-page #features .grid > div:nth-child(6) .zedpera-feature-icon,
        .zedpera-public-page #features article:nth-child(6) .zedpera-feature-icon {
          background: linear-gradient(135deg, #fef3c7 0%, #ffedd5 100%) !important;
          border-color: #fcd34d !important;
        }

        /* PRICING */
        .zedpera-public-page #pricing {
          background:
            radial-gradient(circle at 12% 0%, rgba(124, 58, 237, 0.16), transparent 32%),
            radial-gradient(circle at 88% 12%, rgba(37, 99, 235, 0.14), transparent 30%),
            linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%) !important;
        }

        .zedpera-public-page .zedpera-plan-card {
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%) !important;
          border: 2px solid #ddd6fe !important;
          box-shadow: 0 26px 65px rgba(124, 58, 237, 0.15) !important;
          color: var(--zdp-ink) !important;
        }

        .zedpera-public-page #pricing .grid > article:nth-child(2n) {
          background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%) !important;
          border-color: #bfdbfe !important;
          box-shadow: 0 26px 65px rgba(37, 99, 235, 0.14) !important;
        }

        .zedpera-public-page #pricing .grid > article:nth-child(3n) {
          background: linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%) !important;
          border-color: #a7f3d0 !important;
          box-shadow: 0 26px 65px rgba(5, 150, 105, 0.14) !important;
        }

        .zedpera-public-page .zedpera-plan-card,
        .zedpera-public-page .zedpera-plan-card * {
          color: var(--zdp-ink) !important;
          -webkit-text-fill-color: var(--zdp-ink) !important;
          font-weight: 900 !important;
        }

        .zedpera-public-page .zedpera-plan-badge {
          background: #ede9fe !important;
          color: #5b21b6 !important;
          -webkit-text-fill-color: #5b21b6 !important;
          border: 1px solid #c4b5fd !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page #pricing .grid > article:nth-child(2n) .zedpera-plan-badge {
          background: #dbeafe !important;
          color: #1d4ed8 !important;
          -webkit-text-fill-color: #1d4ed8 !important;
          border-color: #93c5fd !important;
        }

        .zedpera-public-page #pricing .grid > article:nth-child(3n) .zedpera-plan-badge {
          background: #d1fae5 !important;
          color: #047857 !important;
          -webkit-text-fill-color: #047857 !important;
          border-color: #6ee7b7 !important;
        }

        .zedpera-public-page .zedpera-plan-button {
          background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          border: 1px solid #a78bfa !important;
          box-shadow: 0 18px 40px rgba(79, 70, 229, 0.20) !important;
        }

        .zedpera-public-page #pricing .grid > article:nth-child(2n) .zedpera-plan-button {
          background: linear-gradient(135deg, #dbeafe 0%, #cffafe 100%) !important;
          border-color: #93c5fd !important;
        }

        .zedpera-public-page #pricing .grid > article:nth-child(3n) .zedpera-plan-button {
          background: linear-gradient(135deg, #d1fae5 0%, #ccfbf1 100%) !important;
          border-color: #6ee7b7 !important;
        }

        .zedpera-public-page img,
        .zedpera-public-page picture,
        .zedpera-public-page video,
        .zedpera-public-page iframe,
        .zedpera-public-page svg {
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
          visibility: visible !important;
        }


        /* =========================================================
           BACK TO TOP - NÁVRAT HORE VŠADE
           Viditeľné, profesionálne a s čiernym textom/ikonou.
        ========================================================= */

        .zedpera-public-page .zedpera-back-to-top {
          background:
            linear-gradient(135deg, #ffffff 0%, #f5f3ff 54%, #dbeafe 100%) !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          border: 2px solid #a78bfa !important;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95) inset,
            0 22px 55px rgba(124, 58, 237, 0.28) !important;
          opacity: 1;
          backdrop-filter: blur(18px) saturate(170%) !important;
        }

        .zedpera-public-page .zedpera-back-to-top svg {
          color: #020617 !important;
          stroke: #020617 !important;
          stroke-width: 3 !important;
          opacity: 1 !important;
        }

        .zedpera-public-page .zedpera-back-to-top:hover {
          background:
            linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          border-color: #7c3aed !important;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95) inset,
            0 28px 70px rgba(79, 70, 229, 0.34) !important;
        }

        .zedpera-public-page .zedpera-back-to-top:focus-visible {
          outline: 4px solid rgba(124, 58, 237, 0.28) !important;
          outline-offset: 4px !important;
        }

        @media (max-width: 768px) {
          .zedpera-public-page .zedpera-back-to-top {
            right: 1rem !important;
            bottom: 1rem !important;
            height: 3.5rem !important;
            width: 3.5rem !important;
            border-radius: 1.1rem !important;
          }
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

        /* =========================================================
           NÁVRAT HORE - VÝRAZNÝ A STÁLE VIDITEĽNÝ
           Tlačidlo je vložené priamo do landing stránky a je nad všetkým.
        ========================================================= */

        .zedpera-public-page .zedpera-back-to-top {
          position: fixed !important;
          right: 1.5rem !important;
          bottom: 1.5rem !important;
          z-index: 999999 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.75rem !important;
          min-width: 132px !important;
          min-height: 68px !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          transform: translateY(0) !important;
          background:
            linear-gradient(135deg, #ffffff 0%, #f5f3ff 45%, #dbeafe 100%) !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          border: 2px solid #a78bfa !important;
          border-radius: 1.25rem !important;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95) inset,
            0 24px 70px rgba(79, 70, 229, 0.35),
            0 0 0 7px rgba(124, 58, 237, 0.10) !important;
          backdrop-filter: blur(18px) saturate(170%) !important;
          font-weight: 950 !important;
        }

        .zedpera-public-page .zedpera-back-to-top,
        .zedpera-public-page .zedpera-back-to-top * {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          opacity: 1 !important;
          visibility: visible !important;
          font-weight: 950 !important;
          text-shadow: none !important;
          filter: none !important;
        }

        .zedpera-public-page .zedpera-back-to-top-icon {
          background: linear-gradient(135deg, #ede9fe 0%, #bfdbfe 100%) !important;
          border: 1px solid #c4b5fd !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          box-shadow: 0 12px 26px rgba(124, 58, 237, 0.18) !important;
        }

        .zedpera-public-page .zedpera-back-to-top svg {
          color: #020617 !important;
          stroke: #020617 !important;
          stroke-width: 3.25 !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        .zedpera-public-page .zedpera-back-to-top:hover {
          transform: translateY(-4px) !important;
          background:
            linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          border-color: #7c3aed !important;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95) inset,
            0 30px 85px rgba(79, 70, 229, 0.42),
            0 0 0 9px rgba(124, 58, 237, 0.14) !important;
        }

        .zedpera-public-page .zedpera-back-to-top:focus-visible {
          outline: 4px solid rgba(124, 58, 237, 0.30) !important;
          outline-offset: 4px !important;
        }

        @media (max-width: 768px) {
          .zedpera-public-page .zedpera-back-to-top {
            right: 1rem !important;
            bottom: 1rem !important;
            min-width: 64px !important;
            min-height: 64px !important;
            padding: 0.65rem !important;
            border-radius: 1.1rem !important;
          }

          .zedpera-public-page .zedpera-back-to-top-icon {
            height: 2.75rem !important;
            width: 2.75rem !important;
          }
        }



        /* =========================================================
           MOBILE KONTEXTA STYLE - PRESNÁ MOBILNÁ ÚPRAVA
           Cieľ podľa videa: kompaktná horná lišta, ikony vpravo,
           čistý drawer, žiadne presahy a čitateľný obsah.
        ========================================================= */

        @media (max-width: 1023px) {
          html,
          body {
            overflow-x: hidden !important;
            background: #ffffff !important;
          }

          .zedpera-public-page {
            overflow-x: hidden !important;
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 45%, #eef4ff 100%) !important;
          }

          .zedpera-public-page .zedpera-header {
            position: sticky !important;
            top: 0 !important;
            z-index: 99990 !important;
            background: rgba(255, 255, 255, 0.98) !important;
            border-bottom: 1px solid #dbe3ef !important;
            box-shadow: 0 12px 34px rgba(15, 23, 42, 0.10) !important;
            backdrop-filter: blur(18px) saturate(180%) !important;
          }

          .zedpera-public-page .zedpera-header .mx-auto {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
          }

          .zedpera-public-page .zedpera-mobile-topbar {
            min-height: 48px !important;
          }

          .zedpera-public-page .zedpera-mobile-brand,
          .zedpera-public-page .zedpera-mobile-brand * {
            color: #020617 !important;
            -webkit-text-fill-color: #020617 !important;
            opacity: 1 !important;
            font-weight: 950 !important;
          }

          .zedpera-public-page .zedpera-mobile-actions {
            gap: 0.45rem !important;
          }

          .zedpera-public-page .zedpera-mobile-icon-button,
          .zedpera-public-page .zedpera-mobile-close-button {
            display: inline-flex !important;
            height: 44px !important;
            width: 44px !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 1rem !important;
            border: 1px solid #dbe3ef !important;
            background: #ffffff !important;
            color: #020617 !important;
            -webkit-text-fill-color: #020617 !important;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08) !important;
          }

          .zedpera-public-page .zedpera-mobile-icon-button svg,
          .zedpera-public-page .zedpera-mobile-close-button svg {
            color: #020617 !important;
            stroke: #020617 !important;
            opacity: 1 !important;
            stroke-width: 2.8 !important;
          }

          .zedpera-public-page .zedpera-mobile-chat-button {
            background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
            border-color: #c4b5fd !important;
          }

          .zedpera-public-page .zedpera-mobile-quickbar {
            align-items: stretch !important;
          }

          .zedpera-public-page .zedpera-mobile-quickbar .zedpera-language-menu {
            min-width: 0 !important;
            width: 100% !important;
          }

          .zedpera-public-page .zedpera-mobile-quickbar .zedpera-language-trigger {
            min-height: 46px !important;
            border-radius: 1rem !important;
            padding: 0.55rem 0.75rem !important;
          }

          .zedpera-public-page .zedpera-mobile-quickbar .zedpera-language-trigger .zedpera-language-code {
            height: 32px !important;
            min-width: 42px !important;
            font-size: 0.78rem !important;
          }

          .zedpera-public-page .zedpera-mobile-quickbar .zedpera-language-trigger span.truncate {
            max-width: 112px !important;
            font-size: 0.9rem !important;
          }

          .zedpera-public-page .zedpera-language-dropdown {
            left: 0 !important;
            right: auto !important;
            width: min(330px, calc(100vw - 2rem)) !important;
            min-width: min(330px, calc(100vw - 2rem)) !important;
            max-height: min(390px, calc(100vh - 140px)) !important;
            z-index: 1000000 !important;
          }

          .zedpera-public-page .zedpera-mobile-program-button {
            min-height: 46px !important;
            color: #020617 !important;
            -webkit-text-fill-color: #020617 !important;
            background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
            border-color: #c4b5fd !important;
            box-shadow: 0 10px 26px rgba(124, 58, 237, 0.14) !important;
            font-weight: 950 !important;
          }

          .zedpera-public-page .zedpera-mobile-overlay {
            z-index: 999998 !important;
          }

          .zedpera-public-page .zedpera-mobile-drawer {
            background: #ffffff !important;
            color: #020617 !important;
            border-left: 1px solid #dbe3ef !important;
            box-shadow: -24px 0 70px rgba(15, 23, 42, 0.20) !important;
          }

          .zedpera-public-page .zedpera-mobile-drawer,
          .zedpera-public-page .zedpera-mobile-drawer * {
            color: #020617 !important;
            -webkit-text-fill-color: #020617 !important;
            opacity: 1 !important;
            font-weight: 850 !important;
          }

          .zedpera-public-page .zedpera-mobile-nav-item {
            display: flex !important;
            align-items: center !important;
            gap: 0.8rem !important;
            min-height: 52px !important;
            border-radius: 1.15rem !important;
            border: 1px solid #e2e8f0 !important;
            background: #f8fafc !important;
            padding: 0.85rem 1rem !important;
            color: #020617 !important;
            -webkit-text-fill-color: #020617 !important;
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05) !important;
            font-weight: 950 !important;
          }

          .zedpera-public-page .zedpera-mobile-nav-item:nth-child(1) { background: #f5f3ff !important; border-color: #ddd6fe !important; }
          .zedpera-public-page .zedpera-mobile-nav-item:nth-child(2) { background: #eff6ff !important; border-color: #bfdbfe !important; }
          .zedpera-public-page .zedpera-mobile-nav-item:nth-child(3) { background: #ecfdf5 !important; border-color: #a7f3d0 !important; }
          .zedpera-public-page .zedpera-mobile-nav-item:nth-child(4) { background: #fff7ed !important; border-color: #fed7aa !important; }
          .zedpera-public-page .zedpera-mobile-nav-item:nth-child(5) { background: #fdf2f8 !important; border-color: #fbcfe8 !important; }
          .zedpera-public-page .zedpera-mobile-nav-item:nth-child(6) { background: #fefce8 !important; border-color: #fde68a !important; }

          .zedpera-public-page .zedpera-mobile-nav-item svg {
            color: #020617 !important;
            stroke: #020617 !important;
            stroke-width: 2.7 !important;
          }

          .zedpera-public-page .zedpera-mobile-drawer-button {
            display: flex !important;
            min-height: 52px !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 1.15rem !important;
            border: 1px solid #dbe3ef !important;
            background: #ffffff !important;
            color: #020617 !important;
            -webkit-text-fill-color: #020617 !important;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08) !important;
            font-weight: 950 !important;
          }

          .zedpera-public-page .zedpera-mobile-drawer-button-primary {
            background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
            border-color: #c4b5fd !important;
          }

          .zedpera-public-page #intro {
            padding-top: 0 !important;
          }

          .zedpera-public-page .zedpera-hero-content {
            padding-top: 3.25rem !important;
            padding-bottom: 3.5rem !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }

          .zedpera-public-page .zedpera-hero-content h1 {
            font-size: clamp(2.45rem, 12vw, 4.2rem) !important;
            line-height: 0.98 !important;
            letter-spacing: -0.055em !important;
            max-width: 100% !important;
            overflow-wrap: break-word !important;
          }

          .zedpera-public-page .zedpera-hero-content p {
            font-size: 1.02rem !important;
            line-height: 1.75 !important;
            max-width: 100% !important;
          }

          .zedpera-public-page .hero-visible-badge {
            max-width: 100% !important;
            white-space: normal !important;
            text-align: center !important;
          }

          .zedpera-public-page section {
            overflow-x: hidden !important;
          }

          .zedpera-public-page .grid {
            max-width: 100% !important;
          }

          .zedpera-public-page #features article,
          .zedpera-public-page #pricing article,
          .zedpera-public-page article {
            border-radius: 1.45rem !important;
            padding: 1.25rem !important;
          }

          .zedpera-public-page #pricing .zedpera-plan-card {
            min-height: auto !important;
          }

          .zedpera-public-page .zedpera-back-to-top {
            right: 1rem !important;
            bottom: 1rem !important;
            min-width: 64px !important;
            min-height: 64px !important;
          }
        }

      `}</style>
      <header className="zedpera-header sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-slate-950 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 lg:px-8">
          {/* DESKTOP HLAVIČKA */}
          <div className="hidden items-center justify-between gap-4 lg:flex">
            <Link href="/" className="zedpera-wordmark flex min-w-0 items-center">
              <div className="min-w-0 text-left">
                <div className="truncate text-3xl font-black tracking-tight text-slate-950">
                  ZEDPERA
                </div>
                <div className="-mt-1 truncate text-base font-black text-slate-800">
                  {content.brandSubtitle}
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <DropdownLanguageMenu
                language={language}
                onChange={(nextLanguage) => {
                  void handleLanguageChange(nextLanguage);
                }}
              />

              <Link
                href="/login"
                className="zedpera-header-login relative z-50 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
              >
                {content.login}
              </Link>

              <a
                href="#pricing"
                className="zedpera-header-cta relative z-50 rounded-2xl border border-violet-200 bg-white px-6 py-3 text-sm font-black text-slate-950 shadow-xl shadow-violet-200/70 transition hover:border-violet-400 hover:bg-violet-50"
              >
                {content.chooseProgram}
              </a>
            </div>
          </div>

          {/* MOBILNÁ HLAVIČKA PODĽA ŠTÝLU KONTEXTA */}
          <div className="zedpera-mobile-topbar flex items-center justify-between gap-3 lg:hidden">
            <Link href="/" className="zedpera-mobile-brand min-w-0">
              <div className="truncate text-[22px] font-black leading-none tracking-tight text-slate-950">
                ZEDPERA
              </div>
              <div className="mt-0.5 truncate text-[12px] font-black leading-none text-slate-700">
                {content.brandSubtitle}
              </div>
            </Link>

            <div className="zedpera-mobile-actions flex shrink-0 items-center gap-2">
              <a
                href="#faq"
                className="zedpera-mobile-icon-button"
                aria-label={content.navFaq}
              >
                <HelpCircle size={20} />
              </a>

              <a
                href="/login"
                className="zedpera-mobile-icon-button zedpera-mobile-chat-button"
                aria-label={content.login}
              >
                <MessageCircle size={20} />
              </a>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="zedpera-mobile-icon-button"
                aria-label={content.mobileOpenMenu}
              >
                <Menu size={22} />
              </button>
            </div>
          </div>

          {/* MOBIL: KOMPAKTNÝ JAZYK A PROGRAM */}
          <div className="zedpera-mobile-quickbar mt-3 grid grid-cols-[1fr_auto] gap-2 lg:hidden">
            <DropdownLanguageMenu
              language={language}
              compact
              onChange={(nextLanguage) => {
                void handleLanguageChange(nextLanguage);
              }}
            />

            <a
              href="#pricing"
              className="zedpera-mobile-program-button inline-flex items-center justify-center rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-sm"
            >
              Program
            </a>
          </div>

          {/* DESKTOP MENU */}
          <div className="zedpera-menu-row mt-4 hidden border-t border-slate-200 pt-4 lg:block">
            <nav className="zedpera-main-nav flex items-center justify-center gap-3 text-sm font-black text-slate-950">
              <a href="#intro" className="zedpera-menu-link rounded-2xl border border-slate-200 bg-white px-5 py-3 text-slate-950 shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
                {content.navIntro}
              </a>

              <a href="#about" className="zedpera-menu-link rounded-2xl border border-slate-200 bg-white px-5 py-3 text-slate-950 shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
                {content.navAbout}
              </a>

              <a href="#features" className="zedpera-menu-link rounded-2xl border border-slate-200 bg-white px-5 py-3 text-slate-950 shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
                {content.navFeatures}
              </a>

              <a href="#reviews" className="zedpera-menu-link rounded-2xl border border-slate-200 bg-white px-5 py-3 text-slate-950 shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
                {content.navReviews}
              </a>

              <a href="#pricing" className="zedpera-menu-link rounded-2xl border border-slate-200 bg-white px-5 py-3 text-slate-950 shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
                {content.navPricing}
              </a>

              <a href="#faq" className="zedpera-menu-link rounded-2xl border border-slate-200 bg-white px-5 py-3 text-slate-950 shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
                {content.navFaq}
              </a>
            </nav>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="zedpera-mobile-overlay fixed inset-0 z-[999998] bg-slate-950/45 backdrop-blur-sm lg:hidden">
          <div className="zedpera-mobile-drawer absolute right-0 top-0 h-full w-[88%] max-w-[360px] overflow-y-auto bg-white p-4 text-slate-950 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-2xl font-black leading-none tracking-tight text-slate-950">
                  ZEDPERA
                </div>
                <div className="mt-1 text-xs font-black text-slate-600">
                  {content.brandSubtitle}
                </div>
              </div>

              <button
                type="button"
                onClick={closeMobileMenu}
                className="zedpera-mobile-close-button"
                aria-label={content.mobileCloseMenu}
              >
                <X size={22} />
              </button>
            </div>

            <div className="mb-4 rounded-3xl border border-violet-100 bg-violet-50/70 p-3">
              <DropdownLanguageMenu
                language={language}
                compact
                onChange={(nextLanguage) => {
                  void handleLanguageChange(nextLanguage);
                }}
              />
            </div>

            <div className="space-y-2">
              <a href="#intro" onClick={closeMobileMenu} className="zedpera-mobile-nav-item">
                <Sparkles size={19} />
                <span>{content.navIntro}</span>
              </a>

              <a href="#about" onClick={closeMobileMenu} className="zedpera-mobile-nav-item">
                <BookOpen size={19} />
                <span>{content.navAbout}</span>
              </a>

              <a href="#features" onClick={closeMobileMenu} className="zedpera-mobile-nav-item">
                <Bot size={19} />
                <span>{content.navFeatures}</span>
              </a>

              <a href="#reviews" onClick={closeMobileMenu} className="zedpera-mobile-nav-item">
                <Star size={19} />
                <span>{content.navReviews}</span>
              </a>

              <a href="#pricing" onClick={closeMobileMenu} className="zedpera-mobile-nav-item">
                <CreditCard size={19} />
                <span>{content.navPricing}</span>
              </a>

              <a href="#faq" onClick={closeMobileMenu} className="zedpera-mobile-nav-item">
                <HelpCircle size={19} />
                <span>{content.navFaq}</span>
              </a>
            </div>

            <div className="mt-5 grid gap-2">
              <Link href="/login" onClick={closeMobileMenu} className="zedpera-mobile-drawer-button">
                {content.login}
              </Link>

              <a href="#pricing" onClick={closeMobileMenu} className="zedpera-mobile-drawer-button zedpera-mobile-drawer-button-primary">
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
                <div className="zedpera-feature-icon mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
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
                  className={`zedpera-plan-card flex min-h-[620px] flex-col rounded-[2rem] border p-6 shadow-xl transition ${
                    plan.highlighted
                     ? 'border-violet-300 bg-white shadow-violet-200/70'
: 'border-slate-200 bg-white shadow-slate-200/70'
                  }`}
                >
                  {plan.badge && (
                    <div
                      className={`zedpera-plan-badge mb-4 w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
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
                    className={`zedpera-plan-button mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-violet-700 to-indigo-700 shadow-xl shadow-violet-900/20 hover:opacity-90'
                        : 'bg-gradient-to-r from-violet-100 to-blue-100 hover:from-violet-200 hover:to-blue-200'
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
      <button
        type="button"
        onClick={scrollToTop}
        className="zedpera-back-to-top fixed bottom-6 right-6 z-[999999] inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-violet-300 bg-white px-5 py-4 text-base font-black text-slate-950 shadow-2xl shadow-violet-400/60 transition-all duration-300 hover:-translate-y-1 hover:border-violet-700 hover:bg-violet-50"
        aria-label="Návrat hore"
        title="Návrat hore"
      >
        <span className="zedpera-back-to-top-icon flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-slate-950">
          <ArrowUp size={28} />
        </span>
        <span className="hidden text-slate-950 sm:inline">Hore</span>
      </button>
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
