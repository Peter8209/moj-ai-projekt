import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  FileCheck2,
  FileText,
  GraduationCap,
  LibraryBig,
  PenTool,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';

export type BlogArticle = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  icon: LucideIcon;
  content: {
    intro: string;
    sections: {
      title: string;
      paragraphs: string[];
      bullets?: string[];
    }[];
    conclusion: string;
  };
};

export const blogArticles: BlogArticle[] = [
  {
    slug: 'ako-zacat-pisat-zaverecnu-pracu-bez-stresu',
    category: 'Začíname s prácou',
    title: 'Ako začať písať záverečnú prácu bez stresu',
    excerpt:
      'Podrobný návod, ako začať s bakalárskou, diplomovou alebo seminárnou prácou tak, aby ste mali jasnú tému, cieľ, osnovu, zdroje a plán práce.',
    date: '30. 4. 2026',
    readTime: '8 min čítania',
    icon: PenTool,
    content: {
      intro:
        'Začiatok písania záverečnej práce je pre mnohých študentov najťažší. Často nejde o to, že by študent nevedel písať, ale skôr o to, že nevie, kde začať, ako si rozložiť jednotlivé kroky a ako si vytvoriť systém práce. Dobrá príprava dokáže výrazne znížiť stres a zároveň zlepšiť kvalitu výsledného textu.',
      sections: [
        {
          title: 'Ujasnite si tému, nie iba názov práce',
          paragraphs: [
            'Názov práce je iba vonkajšia forma témy. Skutočná téma musí byť jasne pochopená. Študent by mal vedieť vlastnými slovami vysvetliť, čomu sa bude venovať, prečo je téma dôležitá a aký problém chce riešiť.',
            'Ak je téma príliš široká, práca sa rýchlo zmení na všeobecný text bez jasného smerovania. Ak je naopak príliš úzka, môže byť problém nájsť dostatok zdrojov alebo vytvoriť praktickú časť.',
            'Dobrým riešením je napísať si tému jednou vetou a následne ju doplniť o hlavný problém, ktorý sa bude riešiť. Tak vznikne základ pre cieľ práce aj výskumné otázky.',
          ],
          bullets: [
            'napíšte si tému jednou jednoduchou vetou',
            'určite, aký problém práca rieši',
            'overte, či existujú dostupné odborné zdroje',
            'zistite, či sa dá k téme pripraviť praktická alebo analytická časť',
          ],
        },
        {
          title: 'Stanovte si hlavný cieľ práce',
          paragraphs: [
            'Cieľ práce je základný bod, ku ktorému sa bude viazať úvod, metodika, praktická časť aj záver. Ak cieľ nie je jasný, práca bude pôsobiť nepresne a študent sa môže počas písania stratiť.',
            'Cieľ by nemal byť formulovaný všeobecne, napríklad „opísať problematiku“. Lepšie je použiť formulácie ako analyzovať, zhodnotiť, porovnať, navrhnúť, overiť alebo identifikovať.',
            'Hlavný cieľ je vhodné doplniť o čiastkové ciele. Tie pomáhajú rozdeliť prácu na menšie logické kroky a zároveň uľahčujú tvorbu kapitol.',
          ],
          bullets: [
            'hlavný cieľ musí byť konkrétny',
            'čiastkové ciele majú podporovať hlavný cieľ',
            'cieľ musí byť overiteľný v závere práce',
            'praktická časť má smerovať k naplneniu cieľa',
          ],
        },
        {
          title: 'Vytvorte pracovnú osnovu',
          paragraphs: [
            'Osnova nemusí byť na začiatku dokonalá. Jej úlohou je pomôcť študentovi rozdeliť prácu do kapitol a vytvoriť logický postup od teórie k praktickej časti.',
            'Základná štruktúra akademickej práce zvyčajne obsahuje úvod, teoretickú časť, metodiku, praktickú alebo analytickú časť, diskusiu, záver a zoznam literatúry.',
            'Pri tvorbe osnovy je dobré ku každej kapitole napísať jednu vetu, čo má daná kapitola vysvetliť. Tak sa dá rýchlo odhaliť, či niektorá časť chýba alebo sa opakuje.',
          ],
        },
        {
          title: 'Začnite so zdrojmi skôr ako s písaním',
          paragraphs: [
            'Veľkou chybou je začať písať bez odbornej literatúry. Takýto text býva všeobecný, slabý a často bez citácií. Zdroje by mali byť základom argumentácie.',
            'Na začiatku stačí pripraviť základnú rešerš. Študent si vyberie knihy, odborné články, zákony, normy, štatistiky alebo dôveryhodné webové zdroje, ktoré priamo súvisia s témou.',
            'Pri každom zdroji je vhodné hneď uložiť autora, názov, rok, vydavateľa, URL alebo DOI. Neskôr to výrazne zjednoduší tvorbu zoznamu literatúry.',
          ],
          bullets: [
            'zbierajte zdroje priebežne',
            'ku každému zdroju si zapíšte poznámku',
            'rozdeľte zdroje podľa kapitol',
            'nepoužívajte neoverené zdroje bez kontroly',
          ],
        },
      ],
      conclusion:
        'Písanie záverečnej práce je zvládnuteľné, ak má študent jasnú tému, konkrétny cieľ, pracovnú osnovu a základné zdroje. Najdôležitejšie je nezačať chaoticky, ale postupovať po menších krokoch. Tak sa práca stáva prehľadnejšou, odbornejšou a menej stresujúcou.',
    },
  },
  {
    slug: 'ako-spravne-pouzit-ai-pri-pisani-prace',
    category: 'AI a akademické písanie',
    title: 'Ako správne používať AI pri písaní akademickej práce',
    excerpt:
      'Detailný článok o tom, ako používať AI ako akademického asistenta, nie ako náhradu vlastnej práce. Vysvetľuje etiku, citácie, zdroje, kontrolu textu a zodpovednosť študenta.',
    date: '30. 4. 2026',
    readTime: '9 min čítania',
    icon: Sparkles,
    content: {
      intro:
        'Umelá inteligencia sa stala bežnou súčasťou štúdia. Vie pomôcť s návrhom osnovy, formuláciou odborných viet, vysvetlením témy, kontrolou štylistiky alebo prípravou na obhajobu. Zároveň však platí, že AI výstup nie je automaticky správny, odborný ani vhodný na odovzdanie bez kontroly. Preto je dôležité používať AI zodpovedne.',
      sections: [
        {
          title: 'AI má byť pomocník, nie autor práce',
          paragraphs: [
            'Najväčším rizikom je používať AI tak, že študent zadá tému a bez kontroly prevezme celý text. Takýto postup je nebezpečný, pretože text môže obsahovať nepresnosti, všeobecné tvrdenia, slabú argumentáciu alebo nesprávne zdroje.',
            'Správne používanie AI znamená, že študent zostáva autorom práce. AI mu pomáha rozmýšľať, navrhovať štruktúru, zlepšovať jazyk a kontrolovať slabé miesta, ale konečné rozhodnutie a zodpovednosť zostávajú na študentovi.',
            'AI je vhodné používať napríklad na návrh osnovy, preformulovanie odsekov, kontrolu logiky, prípravu otázok na obhajobu alebo vysvetlenie zložitej témy jednoduchším jazykom.',
          ],
          bullets: [
            'neodovzdávajte AI text bez vlastnej kontroly',
            'upravte text podľa vlastného štýlu a požiadaviek školy',
            'overujte odborné tvrdenia v literatúre',
            'AI používajte ako asistenta, nie ako náhradu autora',
          ],
        },
        {
          title: 'Zadávajte AI presný kontext',
          paragraphs: [
            'Kvalita výstupu závisí od kvality zadania. Ak študent napíše iba všeobecný pokyn, dostane všeobecný text. Ak však zadá tému, cieľ práce, odbor, typ práce, požadovanú štruktúru a zdroje, výstup bude výrazne lepší.',
            'Pri akademickom texte je dôležité uviesť aj úroveň práce. Inak sa píše seminárna práca, inak bakalárska a inak diplomová práca. AI musí poznať aj jazyk, citačný štýl a požadovaný rozsah.',
            'Dobré zadanie môže obsahovať informáciu, čo má byť výsledkom: návrh kapitoly, odborný odsek, kontrola textu, zhrnutie literatúry alebo návrh otázok na obhajobu.',
          ],
        },
        {
          title: 'Pozor na zdroje a citácie',
          paragraphs: [
            'AI môže pomôcť s formulovaním textu, ale zdroje treba vždy overiť. Niektoré AI modely môžu vytvoriť zdroj, ktorý vyzerá dôveryhodne, ale v skutočnosti nemusí existovať.',
            'Každý zdroj treba skontrolovať podľa autora, názvu, roka, vydavateľa, časopisu, DOI alebo URL adresy. Ak zdroj nie je možné dohľadať, nemal by byť použitý v akademickej práci.',
            'Citácie musia byť prepojené s textom. Nestačí mať zoznam literatúry na konci práce. Každé tvrdenie prevzaté z literatúry musí byť označené priamo v texte.',
          ],
          bullets: [
            'overte existenciu každého zdroja',
            'skontrolujte DOI alebo URL',
            'zdroje v texte musia byť v literatúre',
            'literatúra má zodpovedať skutočne použitým zdrojom',
          ],
        },
        {
          title: 'AI text treba odborne upraviť',
          paragraphs: [
            'AI výstup často pôsobí plynulo, ale môže byť príliš všeobecný. Akademická práca však potrebuje konkrétnosť, argumentáciu, citácie a prepojenie s cieľom práce.',
            'Študent by mal text doplniť vlastnými poznatkami, odbornými zdrojmi, výsledkami výskumu a formuláciami, ktorým rozumie a ktoré vie obhájiť.',
            'Ak študent nevie vysvetliť text, ktorý odovzdáva, môže mať problém pri obhajobe. Preto musí každú časť práce pochopiť a vedieť obhájiť.',
          ],
        },
      ],
      conclusion:
        'AI môže byť veľmi užitočný akademický pomocník, ak sa používa rozumne a eticky. Pomáha zrýchliť prípravu, zlepšiť jazyk, nájsť slabé miesta a pripraviť sa na obhajobu. Výslednú zodpovednosť za prácu však vždy nesie študent.',
    },
  },
  {
    slug: 'ai-veduci-prace-ako-digitalny-konzultant',
    category: 'AI vedúci práce',
    title: 'AI vedúci práce ako digitálny konzultant počas celého štúdia',
    excerpt:
      'Ako môže AI vedúci práce pomáhať pri štruktúre, metodike, citáciách, spätnej väzbe, kontrole kvality a príprave na obhajobu.',
    date: '30. 4. 2026',
    readTime: '8 min čítania',
    icon: UserCheck,
    content: {
      intro:
        'AI vedúci práce je digitálny konzultant, ktorý pomáha študentovi počas celého procesu tvorby akademickej práce. Nenahrádza školiteľa ani odborného konzultanta, ale poskytuje priebežnú podporu medzi konzultáciami. Vie upozorniť na slabé miesta, navrhnúť úpravy a pomôcť študentovi lepšie porozumieť vlastnej práci.',
      sections: [
        {
          title: 'Pomoc pri tvorbe štruktúry',
          paragraphs: [
            'Jednou z najdôležitejších úloh AI vedúceho je kontrola štruktúry práce. Práca musí mať logický postup od úvodu cez teóriu a metodiku až po praktickú časť a záver.',
            'AI vedúci môže upozorniť, že niektorá kapitola je príliš všeobecná, že chýba metodika alebo že praktická časť nie je dostatočne prepojená s cieľom práce.',
            'Takáto kontrola je užitočná hlavne vtedy, keď študent nevie, či jeho text pôsobí odborne a či jednotlivé kapitoly na seba nadväzujú.',
          ],
          bullets: [
            'kontrola logiky kapitol',
            'návrh lepšieho členenia práce',
            'upozornenie na chýbajúce časti',
            'prepojenie cieľa, teórie a praktickej časti',
          ],
        },
        {
          title: 'Spätná väzba k metodike',
          paragraphs: [
            'Metodika je časť práce, ktorá často rozhoduje o jej odbornej kvalite. Študent musí vysvetliť, ako postupoval, aké metódy použil a prečo sú vhodné pre danú tému.',
            'AI vedúci môže skontrolovať, či je uvedený výskumný problém, výskumné otázky, hypotézy, vzorka, spôsob zberu dát a metóda vyhodnotenia.',
            'Ak metodika nie je dostatočne vysvetlená, práca môže pôsobiť nepresvedčivo. AI vedúci vie navrhnúť, ktoré časti treba doplniť.',
          ],
        },
        {
          title: 'Kontrola citácií a odbornej opory',
          paragraphs: [
            'AI vedúci môže pomôcť odhaliť miesta, kde text obsahuje odborné tvrdenia bez citácie. To je dôležité hlavne pri teoretickej časti práce.',
            'Zároveň môže upozorniť, či citácie v texte zodpovedajú zoznamu literatúry a či sú zdroje použité v správnych častiach práce.',
            'Cieľom nie je iba formálne doplniť zdroje, ale zabezpečiť, aby argumentácia práce stála na odbornej literatúre.',
          ],
        },
        {
          title: 'Príprava na obhajobu',
          paragraphs: [
            'AI vedúci môže pripraviť možné otázky komisie, odpovede na posudky a stručné vysvetlenie cieľa, metodiky a výsledkov práce.',
            'Študent sa tak môže lepšie pripraviť na odbornú diskusiu. Vie si nacvičiť reakcie a zistiť, ktorým častiam práce ešte nerozumie dostatočne.',
            'Dobrá príprava na obhajobu nie je o memorovaní viet, ale o pochopení vlastnej práce.',
          ],
          bullets: [
            'otázky k cieľu práce',
            'otázky k metodike',
            'otázky k výsledkom',
            'odpovede na posudky',
            'stručné vysvetlenie prínosu práce',
          ],
        },
      ],
      conclusion:
        'AI vedúci práce je praktický nástroj, ktorý pomáha študentovi pracovať systematicky. Poskytuje spätnú väzbu, kontroluje štruktúru, metodiku, citácie a pripravuje študenta na obhajobu. Najväčší prínos má vtedy, keď ho študent používa priebežne, nie až tesne pred odovzdaním.',
    },
  },
  {
    slug: 'kontrola-kvality-zaverecnej-prace',
    category: 'Audit kvality',
    title: 'Čo má obsahovať kvalitný audit záverečnej práce',
    excerpt:
      'Komplexný audit práce má preveriť cieľ, štruktúru, metodiku, citácie, jazyk, originalitu, logiku argumentácie a pripravenosť na odovzdanie.',
    date: '30. 4. 2026',
    readTime: '9 min čítania',
    icon: ShieldCheck,
    content: {
      intro:
        'Audit záverečnej práce je podrobná kontrola textu pred odovzdaním. Nemá sa zameriavať iba na gramatiku, ale aj na odbornú logiku, metodiku, citácie, štruktúru, nadväznosť kapitol a celkovú kvalitu argumentácie. Dobrý audit dokáže odhaliť chyby, ktoré si študent pri vlastnom texte často nevšimne.',
      sections: [
        {
          title: 'Kontrola cieľa a výskumného problému',
          paragraphs: [
            'Cieľ práce musí byť jasný, konkrétny a overiteľný. Ak je cieľ napísaný všeobecne, čitateľ nevie, čo má práca dosiahnuť.',
            'Audit by mal preveriť, či sa cieľ objavuje v úvode, či naň nadväzuje metodika a či záver naozaj odpovedá na to, čo bolo cieľom práce.',
            'Výskumný problém alebo výskumné otázky majú byť formulované tak, aby sa dali v práci riešiť. Nemali by byť iba formálne doplnené bez skutočného použitia.',
          ],
          bullets: [
            'jasne formulovaný cieľ',
            'cieľ prepojený s metodikou',
            'výskumné otázky nadväzujúce na cieľ',
            'záver odpovedajúci na cieľ práce',
          ],
        },
        {
          title: 'Kontrola štruktúry a nadväznosti kapitol',
          paragraphs: [
            'Kapitoly práce musia tvoriť logický celok. Teoretická časť má pripraviť odborný základ pre praktickú alebo analytickú časť.',
            'Ak sa v praktickej časti rieši niečo, čo nebolo vysvetlené v teórii, práca môže pôsobiť nesúrodo. Rovnako je problém, ak teória obsahuje veľa informácií, ktoré sa neskôr vôbec nepoužijú.',
            'Audit má upozorniť aj na opakovanie rovnakých myšlienok, neprimerane dlhé kapitoly alebo chýbajúce prechody medzi časťami práce.',
          ],
        },
        {
          title: 'Kontrola metodiky',
          paragraphs: [
            'Metodika musí vysvetliť, ako študent postupoval. Čitateľ má vedieť, aké údaje boli použité, odkiaľ pochádzajú, ako boli spracované a prečo bola zvolená daná metóda.',
            'Pri výskume treba opísať vzorku, výskumný nástroj, spôsob zberu údajov a postup vyhodnotenia. Pri analytickej práci treba vysvetliť zdroje dát a spôsob analýzy.',
            'Slabá metodika je jedným z najčastejších dôvodov kritických pripomienok pri obhajobe.',
          ],
          bullets: [
            'výber metódy',
            'opis vzorky alebo dát',
            'postup zberu údajov',
            'postup vyhodnotenia',
            'limity výskumu',
          ],
        },
        {
          title: 'Kontrola citácií a literatúry',
          paragraphs: [
            'Každý zdroj použitý v texte musí byť uvedený v zozname literatúry. Zároveň by sa v literatúre nemali nachádzať zdroje, ktoré neboli v texte použité.',
            'Audit má preveriť, či sú citácie jednotné, či zodpovedajú požadovanej norme a či sa pri odborných tvrdeniach nachádza odkaz na zdroj.',
            'Citácie nie sú iba formálnou povinnosťou. Ukazujú, že študent vie pracovať s literatúrou a že jeho tvrdenia majú odbornú oporu.',
          ],
        },
      ],
      conclusion:
        'Kvalitný audit záverečnej práce pomáha odhaliť odborné, logické aj formálne nedostatky. Pred odovzdaním by mal študent skontrolovať cieľ, štruktúru, metodiku, citácie, jazyk, záver a pripravenosť na obhajobu.',
    },
  },
  {
    slug: 'citacie-zdroje-a-originalita',
    category: 'Citácie a originalita',
    title: 'Citácie, zdroje a originalita: najčastejšie chyby študentov',
    excerpt:
      'Prečo nestačí mať zdroje iba na konci práce, ako správne citovať, ako parafrázovať a ako predísť problémom pri kontrole originality.',
    date: '30. 4. 2026',
    readTime: '9 min čítania',
    icon: FileText,
    content: {
      intro:
        'Citácie, zdroje a originalita patria medzi najdôležitejšie oblasti akademickej práce. Správne citovanie ukazuje, že študent vie pracovať s odbornou literatúrou, rozlišuje vlastné myšlienky od prevzatých a rešpektuje akademickú etiku.',
      sections: [
        {
          title: 'Zdroje musia byť prepojené s textom',
          paragraphs: [
            'Nestačí vložiť zoznam literatúry na koniec práce. Každý zdroj, ktorý sa v práci použije, musí byť jasne označený priamo v texte.',
            'Ak študent uvedie v texte definíciu, odborné tvrdenie, štatistiku alebo záver iného autora, musí byť jasné, odkiaľ informácia pochádza.',
            'Zoznam literatúry má byť výsledkom skutočne použitých zdrojov, nie iba náhodným zoznamom kníh a článkov.',
          ],
        },
        {
          title: 'Parafráza stále potrebuje citáciu',
          paragraphs: [
            'Mnohí študenti si myslia, že ak text prepíšu vlastnými slovami, citácia už nie je potrebná. To je chyba. Ak je myšlienka prevzatá od iného autora, musí byť citovaná aj pri parafráze.',
            'Parafráza má byť vlastné spracovanie cudzej myšlienky. Nemá ísť iba o mechanickú výmenu slov alebo zmenu poradia viet.',
            'Dobrá parafráza ukazuje, že študent téme rozumie a vie ju vysvetliť vlastným odborným jazykom.',
          ],
          bullets: [
            'citujte pri doslovnom texte',
            'citujte aj pri parafráze',
            'uvádzajte zdroj pri odborných tvrdeniach',
            'nepreberajte text bez pochopenia',
          ],
        },
        {
          title: 'Originalita neznamená absenciu zdrojov',
          paragraphs: [
            'Originálna práca nemusí znamenať, že študent nepoužíva literatúru. Práve naopak, kvalitná akademická práca sa opiera o odborné zdroje.',
            'Originalita spočíva v tom, ako študent zdroje spracuje, porovná, vysvetlí a použije pri riešení vlastného cieľa.',
            'Práca môže mať veľa citácií a zároveň byť originálna, ak študent prináša vlastné usporiadanie, analýzu, interpretáciu alebo návrh riešenia.',
          ],
        },
        {
          title: 'Najčastejšie chyby pri literatúre',
          paragraphs: [
            'Častou chybou je nejednotný citačný štýl. V jednej práci sa niekedy miešajú rôzne formáty citácií, čo pôsobí neprofesionálne.',
            'Ďalšou chybou je, že zdroj je uvedený v literatúre, ale nikde v texte sa nepoužíva. Rovnako problémové je, ak je v texte citácia, ale zdroj chýba v zozname literatúry.',
            'Kontrola pred odovzdaním by mala preveriť vzťah medzi citáciami v texte a zoznamom literatúry.',
          ],
          bullets: [
            'neúplné bibliografické údaje',
            'chýbajúce citácie v texte',
            'zdroje v literatúre bez použitia',
            'neexistujúce alebo neoverené zdroje',
            'miešanie citačných štýlov',
          ],
        },
      ],
      conclusion:
        'Správne citovanie chráni študenta pred podozrením z plagiátorstva a zároveň zvyšuje odbornú kvalitu práce. Každý zdroj musí byť overený, správne uvedený a zmysluplne zapojený do textu.',
    },
  },
  {
    slug: 'ako-napisat-dobru-anotaciu-a-klucove-slova',
    category: 'Profil práce',
    title: 'Ako napísať dobrú anotáciu a správne kľúčové slová',
    excerpt:
      'Anotácia a kľúčové slová sú krátke časti práce, ale výrazne ovplyvňujú prvý dojem. Článok vysvetľuje, čo majú obsahovať a čomu sa vyhnúť.',
    date: '30. 4. 2026',
    readTime: '6 min čítania',
    icon: BookOpen,
    content: {
      intro:
        'Anotácia a kľúčové slová patria medzi prvé časti práce, ktoré čitateľ vidí. Hoci sú krátke, majú veľký význam. Pomáhajú rýchlo pochopiť tému, cieľ, metodiku a prínos práce.',
      sections: [
        {
          title: 'Čo má obsahovať anotácia',
          paragraphs: [
            'Anotácia má stručne vysvetliť, čomu sa práca venuje. Nemá byť iba opakovaním názvu práce, ale krátkym odborným zhrnutím celého obsahu.',
            'Dobrá anotácia zvyčajne obsahuje tému, cieľ práce, použitú metodiku a hlavný výsledok alebo prínos.',
            'Anotácia by mala byť vecná, jasná a bez zbytočných všeobecných fráz. Čitateľ má po jej prečítaní rozumieť, čo práca rieši.',
          ],
          bullets: [
            'téma práce',
            'hlavný cieľ',
            'použitá metodika',
            'hlavné výsledky',
            'prínos práce',
          ],
        },
        {
          title: 'Ako vybrať kľúčové slová',
          paragraphs: [
            'Kľúčové slová majú vystihovať hlavné odborné pojmy práce. Nemali by byť príliš všeobecné ani náhodné.',
            'Ak je práca napríklad o využití umelej inteligencie v akademickom písaní, kľúčové slová by mali pomenovať AI, akademické písanie, citácie, kvalitu textu alebo obhajobu.',
            'Dobré kľúčové slová pomáhajú pri vyhľadávaní práce a zároveň ukazujú, do akej oblasti práca patrí.',
          ],
        },
        {
          title: 'Najčastejšie chyby v anotácii',
          paragraphs: [
            'Častou chybou je príliš všeobecná anotácia, ktorá nič konkrétne nehovorí. Napríklad veta, že práca sa zaoberá danou problematikou, nestačí.',
            'Ďalšou chybou je, že anotácia obsahuje informácie, ktoré sa v práci vôbec nenachádzajú. Anotácia má zodpovedať skutočnému obsahu práce.',
            'Problémom je aj príliš reklamný alebo neodborný štýl. Anotácia má byť akademická, vecná a presná.',
          ],
        },
      ],
      conclusion:
        'Dobrá anotácia a správne kľúčové slová zvyšujú odborný dojem z práce. Mali by byť stručné, presné a priamo prepojené s cieľom, metodikou a obsahom práce.',
    },
  },
  {
    slug: 'prakticka-cast-prace-a-vyskum',
    category: 'Praktická časť',
    title: 'Praktická časť práce: ako ju pripraviť zrozumiteľne a odborne',
    excerpt:
      'Praktická časť ukazuje, či študent vie použiť teóriu na konkrétny problém. Článok vysvetľuje metodiku, dáta, výsledky a interpretáciu.',
    date: '30. 4. 2026',
    readTime: '8 min čítania',
    icon: FileCheck2,
    content: {
      intro:
        'Praktická časť je jednou z najdôležitejších častí akademickej práce. Ukazuje, či študent dokáže aplikovať teoretické poznatky na konkrétny problém, spracovať údaje, pripraviť analýzu alebo navrhnúť riešenie.',
      sections: [
        {
          title: 'Praktická časť musí nadväzovať na cieľ práce',
          paragraphs: [
            'Každá praktická časť by mala priamo súvisieť s hlavným cieľom práce. Ak cieľ hovorí o analýze určitého javu, praktická časť musí tento jav skutočne analyzovať.',
            'Praktická časť nemá byť náhodným súborom tabuliek, grafov alebo odpovedí. Musí mať jasný postup a logické vysvetlenie.',
            'Pred písaním praktickej časti je vhodné skontrolovať, či je cieľ práce dostatočne konkrétny a či metodika umožňuje tento cieľ naplniť.',
          ],
        },
        {
          title: 'Metodika ako základ praktickej časti',
          paragraphs: [
            'Metodika vysvetľuje, ako študent postupoval. Čitateľ musí vedieť, odkiaľ pochádzajú údaje, ako boli získané a ako boli spracované.',
            'Ak ide o dotazník, treba opísať vzorku respondentov, otázky, spôsob zberu odpovedí a vyhodnotenie. Ak ide o analýzu dát, treba uviesť zdroj dát, obdobie, premenné a metódy spracovania.',
            'Bez metodiky praktická časť pôsobí nepresvedčivo, pretože čitateľ nevie posúdiť, či sú výsledky dôveryhodné.',
          ],
          bullets: [
            'zdroj údajov',
            'výber vzorky',
            'použité metódy',
            'postup zberu údajov',
            'postup vyhodnotenia',
          ],
        },
        {
          title: 'Výsledky nestačí iba uviesť',
          paragraphs: [
            'Mnoho študentov vloží do praktickej časti tabuľky alebo grafy, ale nevysvetlí ich význam. To je chyba. Každý výsledok musí byť interpretovaný.',
            'Interpretácia znamená vysvetliť, čo výsledok ukazuje, ako súvisí s cieľom práce a čo z neho vyplýva.',
            'Ak sa v práci používajú grafy, mali by byť pomenované, očíslované a doplnené krátkym komentárom.',
          ],
        },
        {
          title: 'Diskusia a limity výsledkov',
          paragraphs: [
            'Kvalitná praktická časť obsahuje aj diskusiu. V nej študent vysvetľuje, čo výsledky znamenajú, či potvrdili očakávania a ako súvisia s odbornou literatúrou.',
            'Je vhodné uviesť aj limity práce. Napríklad obmedzený počet respondentov, krátke sledované obdobie alebo obmedzenú dostupnosť dát.',
            'Uvedenie limitov neoslabuje prácu. Naopak, ukazuje, že študent chápe hranice svojho výskumu.',
          ],
        },
      ],
      conclusion:
        'Kvalitná praktická časť musí byť prepojená s cieľom práce, opierať sa o jasnú metodiku a obsahovať interpretované výsledky. Nestačí ukázať dáta, treba vysvetliť ich význam.',
    },
  },
  {
    slug: 'obhajoba-prace-priprava',
    category: 'Obhajoba',
    title: 'Ako sa pripraviť na obhajobu práce profesionálne',
    excerpt:
      'Obhajoba nie je iba prezentácia. Je to schopnosť vysvetliť cieľ, metodiku, výsledky, prínos práce a reagovať na otázky komisie.',
    date: '30. 4. 2026',
    readTime: '8 min čítania',
    icon: GraduationCap,
    content: {
      intro:
        'Obhajoba práce je posledný krok akademického procesu. Študent pri nej ukazuje, že svojej práci rozumie, vie vysvetliť svoj postup a dokáže reagovať na otázky komisie. Dobrá obhajoba nie je o memorovaní textu, ale o pochopení vlastnej práce.',
      sections: [
        {
          title: 'Prezentácia musí byť stručná a jasná',
          paragraphs: [
            'Prezentácia k obhajobe nemá kopírovať celé odseky z práce. Jej úlohou je predstaviť najdôležitejšie informácie v krátkom čase.',
            'Najčastejšie by mala obsahovať názov práce, cieľ, metodiku, hlavné výsledky, prínos práce a odpovede na otázky z posudkov.',
            'Každý slide by mal mať jasný účel. Ak slide neobsahuje dôležitú informáciu, je lepšie ho vynechať.',
          ],
          bullets: [
            'titulný slide',
            'cieľ práce',
            'metodika',
            'výsledky',
            'prínos práce',
            'odpovede na posudky',
          ],
        },
        {
          title: 'Nacvičte si vysvetlenie cieľa a metodiky',
          paragraphs: [
            'Komisia sa často pýta, prečo si študent vybral danú tému, aký bol cieľ práce a prečo použil konkrétnu metodiku.',
            'Študent by mal vedieť stručne povedať, čo skúmal, ako postupoval a prečo bol zvolený postup vhodný.',
            'Ak metodiku nevie vysvetliť, pôsobí to, akoby nerozumel vlastnej práci.',
          ],
        },
        {
          title: 'Pripravte si odpovede na posudky',
          paragraphs: [
            'Otázky z posudkov treba brať vážne. Je vhodné pripraviť si odpoveď na každú otázku a vopred si ju nahlas precvičiť.',
            'Ak posudok obsahuje kritiku, odpoveď má byť vecná a pokojná. Študent môže vysvetliť svoj postup alebo uznať, že daná časť by sa dala zlepšiť.',
            'Cieľom nie je hádať sa s oponentom, ale odborne obhájiť svoje rozhodnutia.',
          ],
        },
        {
          title: 'Ako zvládnuť stres',
          paragraphs: [
            'Stres pri obhajobe je prirodzený. Pomáha, ak študent pozná štruktúru prezentácie, vie vysvetliť hlavné body a má pripravené odpovede.',
            'Odporúča sa prezentáciu nacvičiť viackrát, ideálne aj pred inou osobou. Tak sa zistí, či je výklad zrozumiteľný a časovo primeraný.',
            'Počas obhajoby je lepšie hovoriť pokojne, pomalšie a vecne. Komisia nečaká dokonalé divadlo, ale odborné pochopenie témy.',
          ],
        },
      ],
      conclusion:
        'Profesionálna obhajoba stojí na príprave. Študent musí vedieť jasne vysvetliť cieľ, metodiku, výsledky a prínos práce. Ak svojej práci rozumie, dokáže lepšie reagovať aj na otázky komisie.',
    },
  },
  {
    slug: 'excel-grafy-a-data-v-akademickej-praci',
    category: 'Dáta a grafy',
    title: 'Excel, grafy a dáta v akademickej práci',
    excerpt:
      'Ako správne používať tabuľky, grafy, deskriptívnu štatistiku a vizualizácie v seminárnej, bakalárskej alebo diplomovej práci.',
    date: '30. 4. 2026',
    readTime: '7 min čítania',
    icon: BarChart3,
    content: {
      intro:
        'Dáta a grafy dokážu výrazne zvýšiť kvalitu akademickej práce, ak sú použité správne. Nestačí vložiť tabuľku alebo graf iba preto, aby práca vyzerala odborne. Každá vizualizácia musí mať význam, musí byť čitateľná a musí byť vysvetlená v texte.',
      sections: [
        {
          title: 'Graf musí mať jasný účel',
          paragraphs: [
            'Každý graf by mal odpovedať na konkrétnu otázku. Ak graf nič nevysvetľuje alebo iba dekoruje text, do práce nepatrí.',
            'Pred vytvorením grafu je vhodné položiť si otázku: čo má čitateľ z grafu pochopiť? Ak odpoveď nie je jasná, graf treba upraviť alebo vynechať.',
            'Dobrý graf podporuje argumentáciu práce. Pomáha ukázať rozdiely, vývoj, porovnanie alebo vzťahy medzi premennými.',
          ],
        },
        {
          title: 'Tabuľky a grafy musia byť popísané',
          paragraphs: [
            'Každá tabuľka a každý graf musia mať číslo, názov a zdroj údajov. Ak ide o vlastné spracovanie, treba to uviesť.',
            'V texte je potrebné graf vysvetliť. Nestačí napísať „graf zobrazuje výsledky“. Treba povedať, čo z výsledkov vyplýva.',
            'Ak graf ukazuje významný trend alebo rozdiel, treba ho interpretovať a prepojiť s cieľom práce.',
          ],
          bullets: [
            'číslo grafu alebo tabuľky',
            'výstižný názov',
            'zdroj údajov',
            'stručná interpretácia',
            'prepojenie s cieľom práce',
          ],
        },
        {
          title: 'Deskriptívna štatistika v práci',
          paragraphs: [
            'Pri dotazníkoch alebo dátových analýzach sa často používa deskriptívna štatistika. Ide napríklad o početnosť, percentá, priemer, medián, minimum, maximum alebo smerodajnú odchýlku.',
            'Tieto údaje pomáhajú čitateľovi pochopiť základné vlastnosti dát. Nemali by však byť uvedené bez vysvetlenia.',
            'Ak práca obsahuje štatistické ukazovatele, treba vysvetliť, čo znamenajú a prečo sú dôležité pre danú tému.',
          ],
        },
        {
          title: 'Najčastejšie chyby pri grafoch',
          paragraphs: [
            'Častou chybou je používanie príliš veľa farieb, neprehľadných popisov alebo grafov s malými hodnotami, ktoré sa nedajú čítať.',
            'Ďalšou chybou je použitie nevhodného typu grafu. Napríklad koláčový graf sa nehodí na všetky typy dát a pri veľa kategóriách je neprehľadný.',
            'Ak graf nie je čitateľný v tlačenej verzii práce, treba ho zjednodušiť.',
          ],
          bullets: [
            'neprehľadné farby',
            'chýbajúci názov',
            'chýbajúci zdroj',
            'nevhodný typ grafu',
            'žiadna interpretácia v texte',
          ],
        },
      ],
      conclusion:
        'Grafy a tabuľky majú byť funkčné, čitateľné a odborne vysvetlené. Dobrá vizualizácia pomáha čitateľovi pochopiť výsledky práce a posilňuje kvalitu argumentácie.',
    },
  },
  {
    slug: 'najcastejsie-chyby-pri-pisani-prace',
    category: 'Chyby študentov',
    title: 'Najčastejšie chyby pri písaní akademickej práce',
    excerpt:
      'Prehľad najčastejších chýb: nejasný cieľ, všeobecná teória, slabá metodika, nesprávne citácie, slabý záver a nesúlad kapitol.',
    date: '30. 4. 2026',
    readTime: '9 min čítania',
    icon: BrainCircuit,
    content: {
      intro:
        'Mnohé akademické práce majú podobné chyby. Nejde iba o gramatiku alebo formátovanie, ale najmä o nejasný cieľ, slabú argumentáciu, nesprávne citácie, chýbajúcu metodiku a slabé prepojenie medzi kapitolami.',
      sections: [
        {
          title: 'Nejasný alebo príliš všeobecný cieľ',
          paragraphs: [
            'Ak cieľ práce nie je jasný, čitateľ nevie, čo má práca dosiahnuť. Text potom pôsobí ako všeobecný opis témy bez konkrétneho výsledku.',
            'Cieľ by mal byť formulovaný tak, aby sa dal v závere vyhodnotiť. Študent by mal vedieť povedať, či cieľ splnil a akým spôsobom.',
            'Slabý cieľ ovplyvňuje celú prácu, pretože naň nadväzuje metodika, praktická časť aj záver.',
          ],
        },
        {
          title: 'Teória bez súvisu s praktickou časťou',
          paragraphs: [
            'Teoretická časť nemá byť iba zbierkou definícií. Má vytvoriť odborný základ pre praktickú alebo analytickú časť.',
            'Ak sa v praktickej časti nevyužíva nič z teórie, práca pôsobí nesúrodo. Rovnako je problém, ak teória obsahuje veľa tém, ktoré nesúvisia s cieľom.',
            'Každá teoretická kapitola by mala mať dôvod, prečo je v práci zaradená.',
          ],
          bullets: [
            'teória má podporovať cieľ práce',
            'praktická časť má nadväzovať na teóriu',
            'nepíšte definície bez súvisu',
            'vyhnite sa opakovaniu všeobecných viet',
          ],
        },
        {
          title: 'Chýbajúca alebo slabá metodika',
          paragraphs: [
            'Metodika je častým slabým miestom. Študenti niekedy uvedú, že použili analýzu alebo dotazník, ale nevysvetlia presný postup.',
            'Dobrá metodika musí ukázať, ako boli získané údaje, aká vzorka bola použitá, aké metódy boli zvolené a ako boli výsledky vyhodnotené.',
            'Bez metodiky nie je možné posúdiť dôveryhodnosť výsledkov.',
          ],
        },
        {
          title: 'Slabý záver',
          paragraphs: [
            'Záver nemá iba opakovať, čo bolo v práci napísané. Má odpovedať na cieľ práce, zhrnúť hlavné výsledky a pomenovať prínos.',
            'Dobrý záver môže obsahovať aj limity práce a odporúčania pre prax alebo ďalší výskum.',
            'Ak záver neodpovedá na cieľ, práca pôsobí nedokončene.',
          ],
          bullets: [
            'odpoveď na cieľ práce',
            'zhrnutie výsledkov',
            'prínos práce',
            'limity',
            'odporúčania',
          ],
        },
      ],
      conclusion:
        'Najčastejším chybám sa dá predísť dôslednou prípravou a kontrolou. Študent by mal priebežne sledovať cieľ práce, nadväznosť kapitol, metodiku, citácie a kvalitu záveru.',
    },
  },
  {
    slug: 'ako-pracovat-s-literaturou-a-researchom',
    category: 'Rešerš a literatúra',
    title: 'Ako pracovať s odbornou literatúrou a rešeršou',
    excerpt:
      'Rešerš je základ odbornej práce. Článok vysvetľuje, ako hľadať zdroje, robiť poznámky, triediť literatúru a zapájať ju do vlastnej argumentácie.',
    date: '30. 4. 2026',
    readTime: '8 min čítania',
    icon: LibraryBig,
    content: {
      intro:
        'Odborná literatúra tvorí základ akademickej práce. Bez kvalitných zdrojov je text často všeobecný, nepresvedčivý a bez odbornej hodnoty. Rešerš pomáha zistiť, čo už bolo o téme napísané a ako môže študent nadviazať vlastnou analýzou.',
      sections: [
        {
          title: 'Vyberajte relevantné a dôveryhodné zdroje',
          paragraphs: [
            'Nie každý zdroj je vhodný do akademickej práce. Prednosť majú odborné knihy, vedecké články, zákony, normy, oficiálne štatistiky a dôveryhodné inštitucionálne zdroje.',
            'Bežné webové články môžu pomôcť pri orientácii v téme, ale nemali by tvoriť základ odbornej argumentácie.',
            'Pri výbere zdroja treba sledovať autora, rok vydania, odbornosť publikácie a súvis s témou práce.',
          ],
        },
        {
          title: 'Robte si poznámky ku každému zdroju',
          paragraphs: [
            'Pri čítaní literatúry je vhodné zapisovať si hlavné myšlienky, dôležité citácie a poznámku, do ktorej kapitoly sa zdroj hodí.',
            'Takýto systém šetrí čas pri písaní. Študent neskôr nemusí hľadať, odkiaľ pochádza konkrétna myšlienka.',
            'Poznámky by mali obsahovať aj vlastný komentár študenta, nie iba skopírovaný text zo zdroja.',
          ],
          bullets: [
            'autor a rok',
            'názov zdroja',
            'hlavná myšlienka',
            'strana alebo kapitola',
            'možné použitie v práci',
          ],
        },
        {
          title: 'Zdroje triedte podľa kapitol',
          paragraphs: [
            'Ak má práca viac kapitol, je dobré rozdeliť zdroje podľa toho, kde budú použité. Niektoré zdroje patria do teórie, iné do metodiky alebo diskusie.',
            'Triedenie zdrojov pomáha lepšie plánovať text a zabraňuje tomu, aby sa všetka literatúra použila iba v jednej časti práce.',
            'V kvalitnej práci sú zdroje rozložené prirodzene podľa logiky argumentácie.',
          ],
        },
        {
          title: 'Literatúra má podporovať vlastnú argumentáciu',
          paragraphs: [
            'Cieľom rešerše nie je iba zhrnúť, čo napísali iní autori. Študent má zdroje porovnať, vysvetliť a použiť pri vlastnom riešení témy.',
            'Odborná práca má ukázať, že študent literatúre rozumie a vie ju zapojiť do vlastnej argumentácie.',
            'Najlepšie pôsobí text, v ktorom zdroje prirodzene podporujú tvrdenia a vedú k vlastným záverom.',
          ],
        },
      ],
      conclusion:
        'Dobrá rešerš je základ kvalitnej akademickej práce. Pomáha vytvoriť odborný rámec, zlepšiť argumentáciu a správne prepojiť vlastné zistenia s existujúcou literatúrou.',
    },
  },
];

export const blogCategories = [
  'Všetko',
  ...Array.from(new Set(blogArticles.map((article) => article.category))),
];

export function getBlogArticle(slug: string) {
  return blogArticles.find((article) => article.slug === slug);
}