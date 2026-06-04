import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

type BlogSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type BlogArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  icon: LucideIcon;
  content: {
    intro: string;
    sections: BlogSection[];
    conclusion: string;
  };
};

const blogArticles: BlogArticle[] = [
  {
    slug: 'ako-ai-pomaha-pri-zaverecnej-praci',
    title: 'Ako AI pomáha pri záverečnej práci',
    excerpt:
      'Praktický pohľad na to, ako môže študent bezpečne a efektívne využiť AI pri príprave bakalárskej, diplomovej alebo seminárnej práce.',
    category: 'AI a štúdium',
    date: '2026',
    readTime: '6 min čítania',
    icon: Sparkles,
    content: {
      intro:
        'Umelá inteligencia dnes dokáže výrazne zrýchliť prípravu odbornej práce, ale musí sa používať správne. Najväčšiu hodnotu má pri plánovaní, kontrole štruktúry, formulovaní textu, práci so zdrojmi a príprave obhajoby.',
      sections: [
        {
          title: 'AI ako odborný asistent, nie ako náhrada študenta',
          paragraphs: [
            'AI má pomáhať s organizáciou práce, návrhom osnovy, kontrolou logiky textu a jazykovou úpravou. Študent však musí rozumieť téme, vedieť obhájiť svoje tvrdenia a overiť použité zdroje.',
            'Najlepšie výsledky vznikajú vtedy, keď AI pracuje s konkrétnym zadaním, profilom študenta, požiadavkami školy a nahratými materiálmi. Vtedy vie výstup prispôsobiť odboru, stupňu štúdia a očakávaniam školy.',
          ],
          bullets: [
            'návrh osnovy práce',
            'kontrola cieľov a výskumných otázok',
            'jazyková a štylistická úprava',
            'príprava argumentov na obhajobu',
          ],
        },
        {
          title: 'Kde AI šetrí najviac času',
          paragraphs: [
            'Najviac času AI šetrí pri prvotnom triedení myšlienok, tvorbe štruktúry, návrhu kapitol a kontrole konzistentnosti textu.',
            'Veľmi užitočná je aj pri príprave prezentácie na obhajobu. Z textu práce dokáže vytvoriť logickú osnovu slidov, návrh hovoreného prejavu a prehľad najdôležitejších výsledkov.',
          ],
          bullets: [
            'rýchle spracovanie dlhého textu',
            'odhalenie chýbajúcich častí',
            'návrh lepších formulácií',
            'tvorba prezentácie k obhajobe',
          ],
        },
        {
          title: 'Na čo si dať pozor',
          paragraphs: [
            'AI nesmie nahrádzať odborné zdroje ani vlastné pochopenie témy. Každé tvrdenie, ktoré sa opiera o fakty, štatistiky alebo odborné poznatky, musí byť overené.',
            'Dôležitá je aj transparentnosť. Študent by mal poznať pravidlá svojej školy a vedieť, v akej miere môže AI nástroje používať.',
          ],
          bullets: [
            'kontrola citácií',
            'overovanie faktov',
            'dodržanie pravidiel školy',
            'vlastné porozumenie téme',
          ],
        },
      ],
      conclusion:
        'AI je silný pomocník pri záverečnej práci, ak sa používa zodpovedne. Najväčší prínos má vtedy, keď pomáha študentovi lepšie rozmýšľať, nie keď rozmýšľa namiesto neho.',
    },
  },
  {
    slug: 'kontrola-kvality-zaverecnej-prace',
    title: 'Kontrola kvality záverečnej práce pred odovzdaním',
    excerpt:
      'Prehľad najdôležitejších bodov, ktoré treba skontrolovať pred finálnym odovzdaním práce.',
    category: 'Kvalita práce',
    date: '2026',
    readTime: '5 min čítania',
    icon: ShieldCheck,
    content: {
      intro:
        'Pred odovzdaním práce nestačí skontrolovať iba pravopis. Dôležitá je štruktúra, ciele, metodika, zdroje, formátovanie, logika textu a pripravenosť na obhajobu.',
      sections: [
        {
          title: 'Štruktúra a logika práce',
          paragraphs: [
            'Každá kapitola by mala mať jasný účel. Úvod musí vysvetliť problém, jadro práce musí problém riešiť a záver má zhrnúť výsledky.',
            'Častou chybou je, že práca obsahuje veľa textu, ale málo jasnej argumentácie. Text musí smerovať k cieľu práce a jednotlivé kapitoly majú na seba logicky nadväzovať.',
          ],
          bullets: [
            'jasný cieľ práce',
            'logické poradie kapitol',
            'prepojenie teórie a praxe',
            'záver odpovedá na cieľ práce',
          ],
        },
        {
          title: 'Citácie a zdroje',
          paragraphs: [
            'Zdroje musia byť dôveryhodné, aktuálne a jednotne citované. Pri odbornej práci nestačí uviesť len zoznam literatúry. Citácie musia byť priamo previazané s textom.',
            'Pri kontrole zdrojov je potrebné sledovať, či sa všetky citované práce nachádzajú aj v zozname bibliografie a či bibliografia neobsahuje zdroje, ktoré sa v texte vôbec nepoužili.',
          ],
          bullets: [
            'jednotný citačný štýl',
            'aktuálne odborné zdroje',
            'citácie v texte',
            'zhoda medzi citáciami a bibliografiou',
          ],
        },
        {
          title: 'Formálna úprava',
          paragraphs: [
            'Formálna stránka práce často rozhoduje o prvom dojme. Nadpisy, číslovanie, tabuľky, obrázky a prílohy musia byť spracované jednotne.',
            'Treba si skontrolovať aj titulnú stranu, obsah, zoznam skratiek, zoznam obrázkov, zoznam tabuliek a prílohy podľa požiadaviek školy.',
          ],
          bullets: [
            'číslovanie kapitol',
            'zoznam obrázkov a tabuliek',
            'správne prílohy',
            'jednotné formátovanie',
          ],
        },
      ],
      conclusion:
        'Kvalitná kontrola pred odovzdaním dokáže odhaliť slabé miesta práce ešte pred tým, ako ich nájde vedúci alebo komisia.',
    },
  },
  {
    slug: 'ako-sa-pripravit-na-obhajobu',
    title: 'Ako sa pripraviť na obhajobu práce',
    excerpt:
      'Praktický návod, ako si pripraviť prezentáciu, hovorený prejav a odpovede na otázky komisie.',
    category: 'Obhajoba',
    date: '2026',
    readTime: '7 min čítania',
    icon: GraduationCap,
    content: {
      intro:
        'Obhajoba nie je len prezentácia slidov. Je to schopnosť jasne vysvetliť, čo bolo cieľom práce, ako študent postupoval, čo zistil a prečo sú výsledky dôležité.',
      sections: [
        {
          title: 'Dobrá prezentácia má jasnú štruktúru',
          paragraphs: [
            'Prezentácia by nemala kopírovať celú prácu. Má ukázať najdôležitejšie body: tému, cieľ, metodiku, výsledky, prínos a záver.',
            'Na každom slide by malo byť iba toľko textu, koľko študent dokáže rýchlo vysvetliť. Prezentácia má podporovať hovorený prejav, nie ho úplne nahrádzať.',
          ],
          bullets: [
            'téma a problém',
            'cieľ práce',
            'metodika',
            'hlavné výsledky',
            'prínos práce',
          ],
        },
        {
          title: 'Hovorený prejav',
          paragraphs: [
            'Študent by nemal čítať celé slidy. Lepšie je mať krátke body na slide a hovorené poznámky pripravené zvlášť.',
            'Dôležité je hovoriť pokojne, vecne a držať sa času. Prejav by mal byť nacvičený tak, aby pôsobil prirodzene, nie mechanicky.',
          ],
          bullets: [
            'nečítať celé slidy',
            'hovoriť vlastnými slovami',
            'nacvičiť čas',
            'pripraviť si odpovede',
          ],
        },
        {
          title: 'Otázky komisie',
          paragraphs: [
            'Komisia sa často pýta na výber metódy, zdroje, výsledky, obmedzenia práce a praktické využitie. Odpovede by mali byť stručné a vecné.',
            'Dobrá príprava znamená, že študent si vopred pripraví odpovede na slabšie miesta práce a vie vysvetliť, prečo postupoval práve zvoleným spôsobom.',
          ],
          bullets: [
            'prečo bola zvolená téma',
            'aké boli hlavné výsledky',
            'aké sú limity práce',
            'ako sa dá práca využiť v praxi',
          ],
        },
      ],
      conclusion:
        'Dobrá obhajoba stojí na pochopení vlastnej práce. Prezentácia má študentovi pomôcť vysvetliť podstatu, nie zakryť nejasnosti.',
    },
  },
  {
    slug: 'preco-je-dolezity-profil-studenta',
    title: 'Prečo je dôležitý profil študenta pri AI výstupe',
    excerpt:
      'AI výstup je kvalitnejší, keď pracuje s odborom, stupňom štúdia, témou, požiadavkami školy a cieľom práce.',
    category: 'Personalizácia',
    date: '2026',
    readTime: '4 min čítania',
    icon: Users,
    content: {
      intro:
        'Rovnaká téma môže vyzerať inak na strednej škole, bakalárskom štúdiu, diplomovej práci alebo odbornom kurze. Preto je profil študenta dôležitý pre presnosť AI výstupu.',
      sections: [
        {
          title: 'Odbor a úroveň štúdia',
          paragraphs: [
            'AI potrebuje vedieť, pre aký odbor a úroveň štúdia pripravuje výstup. Iný štýl vyžaduje pedagogika, manažment, technika, zdravotníctvo alebo informatika.',
            'Bez týchto údajov môže byť výstup príliš všeobecný, príliš náročný alebo naopak príliš jednoduchý.',
          ],
          bullets: [
            'typ školy',
            'odbor',
            'stupeň štúdia',
            'požadovaný rozsah',
          ],
        },
        {
          title: 'Téma a cieľ práce',
          paragraphs: [
            'Bez jasného cieľa môže byť text všeobecný. Keď je cieľ presný, AI vie lepšie navrhnúť kapitoly, otázky, metodiku a záver.',
            'Profil študenta pomáha nastaviť správnu mieru odbornosti a praktickosti výstupu.',
          ],
          bullets: [
            'téma práce',
            'cieľ práce',
            'výskumné otázky',
            'praktická časť',
          ],
        },
        {
          title: 'Nahraté materiály',
          paragraphs: [
            'Najlepšie výsledky vznikajú vtedy, keď AI pracuje s reálnym dokumentom, pokynmi školy alebo poznámkami študenta.',
            'Vďaka tomu dokáže systém lepšie identifikovať, čo už je v práci hotové a čo ešte chýba.',
          ],
          bullets: [
            'zadanie práce',
            'školská šablóna',
            'rozpracovaný dokument',
            'poznámky od vedúceho',
          ],
        },
      ],
      conclusion:
        'Profil študenta pomáha AI vytvoriť výstup, ktorý je presnejší, odbornejší a lepšie použiteľný pre konkrétnu prácu.',
    },
  },
  {
    slug: 'ako-spravne-pracovat-so-zdrojmi',
    title: 'Ako správne pracovať so zdrojmi v odbornej práci',
    excerpt:
      'Zdroje rozhodujú o dôveryhodnosti práce. Dôležité je vedieť ich vybrať, overiť, citovať a prepojiť s vlastným textom.',
    category: 'Zdroje a citácie',
    date: '2026',
    readTime: '6 min čítania',
    icon: BookOpen,
    content: {
      intro:
        'Odborná práca stojí na kvalitných zdrojoch. Nestačí ich iba zozbierať. Študent musí vedieť, prečo ich používa, čo z nich vyplýva a ako ich správne zapracovať do textu.',
      sections: [
        {
          title: 'Výber vhodných zdrojov',
          paragraphs: [
            'Kvalitný zdroj by mal byť dôveryhodný, relevantný a primeraný téme. Pri akademickej práci majú prednosť odborné knihy, vedecké články, normy, zákony, metodiky a overené inštitucionálne dokumenty.',
            'Webové články môžu byť doplnkové, ale nemali by tvoriť základ celej odbornej práce.',
          ],
          bullets: [
            'odborné knihy',
            'vedecké články',
            'zákony a normy',
            'overené metodiky',
          ],
        },
        {
          title: 'Prepojenie zdrojov s textom',
          paragraphs: [
            'Zdroj má podporovať konkrétne tvrdenie. Citácia bez jasnej súvislosti pôsobí formálne a neprináša práci skutočnú hodnotu.',
            'Dobrý text nevzniká kopírovaním zdrojov, ale ich pochopením, porovnaním a vlastným vysvetlením.',
          ],
          bullets: [
            'citácia pri konkrétnom tvrdení',
            'vlastné vysvetlenie',
            'porovnanie autorov',
            'kritické zhodnotenie',
          ],
        },
        {
          title: 'Najčastejšie chyby',
          paragraphs: [
            'Medzi najčastejšie chyby patrí nejednotný citačný štýl, chýbajúce citácie v texte, neúplný zoznam literatúry a používanie neoverených internetových zdrojov.',
            'Pred odovzdaním práce treba skontrolovať, či každá citácia v texte má zodpovedajúci záznam v bibliografii.',
          ],
          bullets: [
            'nejednotný citačný štýl',
            'neúplné bibliografické údaje',
            'chýbajúce citácie v texte',
            'neoverené zdroje',
          ],
        },
      ],
      conclusion:
        'Správna práca so zdrojmi zvyšuje dôveryhodnosť celej práce. Dobrý zdroj nie je len formálna povinnosť, ale základ odborného argumentu.',
    },
  },
  {
    slug: 'najcastejsie-chyby-v-zaverecnych-pracach',
    title: 'Najčastejšie chyby v záverečných prácach',
    excerpt:
      'Prehľad chýb, ktoré sa opakujú pri bakalárskych, diplomových a seminárnych prácach.',
    category: 'Chyby v práci',
    date: '2026',
    readTime: '6 min čítania',
    icon: ClipboardCheck,
    content: {
      intro:
        'Mnohé záverečné práce nemajú problém v téme, ale v spracovaní. Chýba im jasný cieľ, jednotná štruktúra, prepojenie teórie s praxou alebo dôkladná kontrola zdrojov.',
      sections: [
        {
          title: 'Nejasný cieľ práce',
          paragraphs: [
            'Cieľ práce musí byť konkrétny a overiteľný. Ak je cieľ príliš všeobecný, celá práca pôsobí nepresvedčivo.',
            'Cieľ by sa mal premietnuť do štruktúry práce, metodiky aj záveru.',
          ],
          bullets: [
            'cieľ je príliš všeobecný',
            'cieľ nesúvisí so záverom',
            'chýbajú výskumné otázky',
            'metodika neoveruje cieľ',
          ],
        },
        {
          title: 'Slabá metodika',
          paragraphs: [
            'Metodika vysvetľuje, ako študent postupoval. Ak je opísaná povrchne, čitateľ nevie posúdiť, či sú výsledky práce dôveryhodné.',
            'Aj pri teoretickej práci je potrebné vysvetliť spôsob výberu literatúry, porovnania zdrojov a spracovania poznatkov.',
          ],
          bullets: [
            'nejasný postup',
            'chýba vzorka alebo materiál',
            'neopísané kritériá výberu',
            'slabé vysvetlenie výsledkov',
          ],
        },
        {
          title: 'Formálne nedostatky',
          paragraphs: [
            'Formálne chyby znižujú profesionálny dojem z práce. Ide najmä o nesprávne nadpisy, nejednotné tabuľky, chýbajúce popisy obrázkov a neúplné prílohy.',
            'Tieto chyby sa dajú odstrániť dôkladnou záverečnou kontrolou.',
          ],
          bullets: [
            'nečíslované obrázky',
            'neúplný obsah',
            'nejednotné nadpisy',
            'chýbajúce prílohy',
          ],
        },
      ],
      conclusion:
        'Väčšine chýb sa dá predísť, ak sa práca kontroluje priebežne. Najhoršie je riešiť štruktúru, zdroje a formátovanie až tesne pred odovzdaním.',
    },
  },
  {
    slug: 'ako-si-naplanovat-pisanie-prace',
    title: 'Ako si naplánovať písanie práce bez stresu',
    excerpt:
      'Jednoduchý plán, ako si rozložiť prípravu práce na zvládnuteľné kroky a neodkladať všetko na poslednú chvíľu.',
    category: 'Plánovanie',
    date: '2026',
    readTime: '5 min čítania',
    icon: CalendarDays,
    content: {
      intro:
        'Najväčší problém pri písaní práce často nie je samotná téma, ale zlé plánovanie. Keď si študent rozdelí prácu na menšie úlohy, celý proces je prehľadnejší a menej stresujúci.',
      sections: [
        {
          title: 'Rozdelenie práce na fázy',
          paragraphs: [
            'Prípravu práce je vhodné rozdeliť na fázu zadania, zberu zdrojov, tvorby osnovy, písania kapitol, kontroly a prípravy obhajoby.',
            'Každá fáza má mať konkrétny výstup. Napríklad zoznam zdrojov, hotovú osnovu, prvú verziu teoretickej časti alebo finálnu prezentáciu.',
          ],
          bullets: [
            'zadanie a cieľ',
            'zber zdrojov',
            'osnova',
            'písanie kapitol',
            'kontrola a obhajoba',
          ],
        },
        {
          title: 'Priebežná kontrola',
          paragraphs: [
            'Prácu je lepšie kontrolovať priebežne než až na konci. Včasná spätná väzba pomáha odhaliť problémy so štruktúrou, metodikou alebo citáciami.',
            'Priebežná kontrola šetrí čas, pretože menšie opravy sú jednoduchšie ako rozsiahle prepisovanie celej práce.',
          ],
          bullets: [
            'kontrola osnovy',
            'kontrola každej kapitoly',
            'priebežná spätná väzba',
            'záverečná kontrola',
          ],
        },
        {
          title: 'Rezerva pred odovzdaním',
          paragraphs: [
            'Posledný týždeň pred odovzdaním by nemal byť určený na písanie hlavného textu, ale na úpravy, kontrolu, formátovanie a prípravu príloh.',
            'Rezerva je dôležitá aj pre technické veci, ako je export do PDF, tlač, nahratie do systému alebo kontrola zhody so šablónou školy.',
          ],
          bullets: [
            'čas na formátovanie',
            'čas na jazykovú kontrolu',
            'čas na export a tlač',
            'čas na opravu pripomienok',
          ],
        },
      ],
      conclusion:
        'Dobrý plán robí z veľkej úlohy sériu menších krokov. Študent tak vie, čo má robiť dnes, čo zajtra a čo musí byť hotové pred odovzdaním.',
    },
  },
  {
    slug: 'ako-vyuzit-ai-pri-kontrole-plagiatorstva',
    title: 'Ako využiť AI pri kontrole originality a rizikových miest',
    excerpt:
      'AI môže pomôcť odhaliť nejasné formulácie, slabé parafrázy a miesta, ktoré potrebujú lepšie citovanie.',
    category: 'Originalita',
    date: '2026',
    readTime: '5 min čítania',
    icon: Search,
    content: {
      intro:
        'Originalita práce neznamená iba nízke percento zhody. Dôležité je, aby text mal vlastnú logiku, správne citácie, kvalitné parafrázy a jasne odlíšené vlastné tvrdenia od prevzatých poznatkov.',
      sections: [
        {
          title: 'Rizikové miesta v texte',
          paragraphs: [
            'AI dokáže upozorniť na časti textu, ktoré pôsobia príliš všeobecne, neprirodzene alebo pripomínajú nekvalitnú parafrázu.',
            'Takéto miesta je vhodné prepracovať, doplniť citáciu alebo vysvetliť vlastnými slovami.',
          ],
          bullets: [
            'slabé parafrázy',
            'nejasný zdroj tvrdenia',
            'príliš všeobecné odseky',
            'opakujúce sa formulácie',
          ],
        },
        {
          title: 'Citovanie a parafrázovanie',
          paragraphs: [
            'Parafráza nie je iba výmena slov. Znamená pochopenie myšlienky a jej vysvetlenie vlastným spôsobom pri zachovaní odkazu na zdroj.',
            'Pri každej prevzatej myšlienke musí byť jasné, odkiaľ pochádza.',
          ],
          bullets: [
            'uviesť zdroj myšlienky',
            'nepreberať vetnú štruktúru',
            'doplniť vlastné vysvetlenie',
            'kontrolovať bibliografiu',
          ],
        },
        {
          title: 'Originalita ako kvalita práce',
          paragraphs: [
            'Originálna práca nemusí prinášať úplne nový vedecký objav. Musí však ukázať, že študent téme rozumie, vie pracovať so zdrojmi a dokáže vytvoriť vlastný odborný text.',
            'AI môže pomôcť zlepšiť zrozumiteľnosť a argumentáciu, ale výsledný text musí zostať kontrolovaný študentom.',
          ],
          bullets: [
            'vlastná argumentácia',
            'jasné závery',
            'správne citácie',
            'zrozumiteľný odborný štýl',
          ],
        },
      ],
      conclusion:
        'AI je užitočný nástroj na kontrolu rizikových miest, ale nenahrádza oficiálnu kontrolu originality ani zodpovednosť študenta za finálny text.',
    },
  },
  {
    slug: 'preco-je-dolezita-anotacia-a-klucove-slova',
    title: 'Prečo je dôležitá anotácia a kľúčové slová',
    excerpt:
      'Anotácia a kľúčové slová sú krátke časti práce, ale často rozhodujú o tom, ako rýchlo čitateľ pochopí jej obsah.',
    category: 'Štruktúra práce',
    date: '2026',
    readTime: '4 min čítania',
    icon: FileText,
    content: {
      intro:
        'Anotácia a kľúčové slová patria medzi prvé časti, ktoré čitateľ vidí. Majú stručne vysvetliť tému, cieľ, postup a výsledok práce.',
      sections: [
        {
          title: 'Čo má obsahovať anotácia',
          paragraphs: [
            'Dobrá anotácia stručne predstaví problém, cieľ práce, použitý postup a hlavné zistenia. Nemá byť príliš všeobecná ani príliš dlhá.',
            'Anotácia má byť zrozumiteľná aj pre čitateľa, ktorý ešte nepozná celý obsah práce.',
          ],
          bullets: [
            'téma práce',
            'cieľ práce',
            'metóda alebo postup',
            'hlavný výsledok',
          ],
        },
        {
          title: 'Výber kľúčových slov',
          paragraphs: [
            'Kľúčové slová majú vystihovať hlavné pojmy práce. Mali by byť konkrétne a odborné, nie príliš všeobecné.',
            'Pri výbere je vhodné myslieť na to, podľa akých slov by niekto prácu vyhľadával.',
          ],
          bullets: [
            'odborné pojmy',
            'hlavná téma',
            'metóda alebo oblasť',
            'praktický kontext',
          ],
        },
        {
          title: 'Najčastejšie chyby',
          paragraphs: [
            'Chybou je, keď anotácia iba opakuje názov práce alebo keď nehovorí nič o výsledkoch. Pri kľúčových slovách je problémom príliš všeobecný výber slov.',
            'Anotáciu je najlepšie finalizovať až po dokončení celej práce.',
          ],
          bullets: [
            'anotácia bez výsledku',
            'príliš všeobecné slová',
            'nezhoda s obsahom práce',
            'príliš dlhý text',
          ],
        },
      ],
      conclusion:
        'Anotácia a kľúčové slová sú krátke, ale veľmi dôležité. Pomáhajú rýchlo pochopiť, o čom práca je a aký má odborný prínos.',
    },
  },
];

function getBlogArticle(slug: string) {
  return blogArticles.find((article) => article.slug === slug);
}

export function generateStaticParams() {
  return blogArticles.map((article) => ({
    slug: article.slug,
  }));
}

type BlogArticlePageProps = {
  params:
    | {
        slug: string;
      }
    | Promise<{
        slug: string;
      }>;
};

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const resolvedParams = await Promise.resolve(params);
  const article = getBlogArticle(resolvedParams.slug);

  if (!article) {
    notFound();
  }

  const Icon = article.icon;
  const relatedArticles = blogArticles.filter(
    (item) => item.slug !== resolvedParams.slug,
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-violet-700/30 blur-3xl" />
        <div className="absolute right-[-180px] top-40 h-[460px] w-[460px] rounded-full bg-blue-700/20 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[520px] w-[520px] rounded-full bg-fuchsia-700/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-black px-4 py-3 text-sm font-black text-white shadow-lg shadow-black/30 transition hover:border-violet-400/70 hover:bg-zinc-900"
          >
            <ArrowLeft size={18} />
            Späť na blog
          </Link>

          <div className="flex items-center gap-2 rounded-2xl border border-violet-400/40 bg-violet-600/20 px-4 py-3 text-sm font-black text-violet-100 shadow-lg shadow-black/30">
            <Icon size={18} />
            {article.category}
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-5 py-12">
        <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#090d1a]/95 shadow-[0_30px_120px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <div className="border-b border-white/10 bg-gradient-to-br from-violet-950/45 via-black to-black p-6 md:p-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-600/20 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-100">
              <Icon size={15} />
              {article.category}
            </div>

            <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">
              {article.title}
            </h1>

            <p className="mt-6 max-w-3xl text-base font-bold leading-8 text-slate-200 md:text-lg">
              {article.excerpt}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-[0.14em] text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2">
                <CalendarDays size={15} />
                {article.date}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2">
                <BookOpen size={15} />
                {article.readTime}
              </span>
            </div>
          </div>

          <div className="p-6 md:p-10">
            <p className="rounded-[1.5rem] border border-violet-400/25 bg-violet-600/10 p-5 text-lg font-bold leading-9 text-slate-100">
              {article.content.intro}
            </p>

            <div className="mt-10 space-y-8">
              {article.content.sections.map((section, index) => (
                <section
                  key={section.title}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 md:p-7"
                >
                  <div className="mb-5 flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600/25 text-violet-100">
                      {index + 1}
                    </div>

                    <h2 className="text-2xl font-black leading-tight text-white md:text-3xl">
                      {section.title}
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {section.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-base font-semibold leading-8 text-slate-200"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {section.bullets?.length ? (
                    <ul className="mt-6 grid gap-3 md:grid-cols-2">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 text-sm font-bold leading-6 text-slate-100"
                        >
                          <CheckCircle2
                            size={18}
                            className="mt-0.5 shrink-0 text-violet-300"
                          />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>

            <div className="mt-10 rounded-[1.5rem] border border-violet-400/30 bg-violet-600/15 p-6">
              <h2 className="text-2xl font-black text-white">Záver</h2>

              <p className="mt-4 text-base font-semibold leading-8 text-slate-100">
                {article.content.conclusion}
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row">
              <Link
                href="/blog"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black px-6 py-4 text-sm font-black text-white shadow-xl shadow-black/40 transition hover:border-violet-400/60 hover:bg-zinc-900"
              >
                <ArrowLeft size={18} />
                Späť na všetky články
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black px-6 py-4 text-sm font-black text-white shadow-xl shadow-black/40 transition hover:border-violet-400/60 hover:bg-zinc-900"
              >
                Prejsť do aplikácie
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </article>

        <section className="mt-12">
          <h2 className="mb-6 text-2xl font-black text-white">
            Ďalšie články
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            {relatedArticles.map((item) => {
              const RelatedIcon = item.icon;

              return (
                <Link
                  key={item.slug}
                  href={`/${item.slug}`}
                  className="group rounded-[1.5rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/30 transition hover:-translate-y-1 hover:border-violet-400/50 hover:bg-[#10162a]"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600/25 text-violet-100">
                      <RelatedIcon size={21} />
                    </div>

                    <ChevronRight
                      size={20}
                      className="text-slate-500 transition group-hover:text-violet-300"
                    />
                  </div>

                  <div className="text-xs font-black uppercase tracking-[0.14em] text-violet-300">
                    {item.category}
                  </div>

                  <h3 className="mt-2 text-lg font-black leading-tight text-white">
                    {item.title}
                  </h3>

                  <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-slate-300">
                    {item.excerpt}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}