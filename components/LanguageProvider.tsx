'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  languages,
  getTranslation,
  normalizeLanguage,
  type AppLanguage,
} from '@/lib/i18n';

type DashboardToolKey =
  | 'aiSupervisor'
  | 'qualityAudit'
  | 'defense'
  | 'translation'
  | 'dataAnalysis'
  | 'planning'
  | 'emails'
  | 'originalityCheck'
  | 'textHumanization';

type DashboardToolCardTranslation = {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
};

type DashboardModuleTranslation = {
  intro: string;
  inputHelp: string;
  resultHelp: string;
  emptyState: string;
};

type DashboardToolTranslations = {
  common: {
    assignmentLabel: string;
    attachments: string;
    attachmentsHelp: string;
    attachFile: string;
    dictate: string;
    canvas: string;
    clear: string;
    infoText: string;
  };
  tools: {
    aiSupervisor: string;
    qualityAudit: string;
    defense: string;
    translation: string;
    dataAnalysis: string;
    planning: string;
    emails: string;
    originalityCheck: string;
    textHumanization: string;
  };
  buttons: {
    aiSupervisor: string;
    qualityAudit: string;
    defense: string;
    translation: string;
    dataAnalysis: string;
    planning: string;
    emails: string;
    originalityCheck: string;
    textHumanization: string;
  };
  placeholders: {
    aiSupervisor: string;
    qualityAudit: string;
    defense: string;
    translation: string;
    dataAnalysis: string;
    planning: string;
    emails: string;
    originalityCheck: string;
    textHumanization: string;
  };
  cards: Record<DashboardToolKey, DashboardToolCardTranslation>;
  modules: Record<DashboardToolKey, DashboardModuleTranslation>;
  resultLabels: {
    generatedOutput: string;
    report: string;
    recommendations: string;
    nextSteps: string;
    copied: string;
    download: string;
    openResult: string;
    processing: string;
  };
  qualityAudit: {
    review: string;
    output: string;
    citationStyle: string;
    stylistics: string;
    citations: string;
    logic: string;
    fullAudit: string;
    detailedReport: string;
    shortReport: string;
  };
  emails: {
    emailType: string;
    tone: string;
    emailSupervisor: string;
    consultationRequest: string;
    apology: string;
    documentsSubmission: string;
    generalAcademicEmail: string;
    professionalPolite: string;
    formal: string;
    friendly: string;
    brief: string;
  };
  planning: {
    todaysDate: string;
  };
};

type AppTranslation = ReturnType<typeof getTranslation> & {
  dashboardTools: DashboardToolTranslations;
};

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: AppTranslation;
  appLanguages: typeof languages;
  isTranslatingInterface: boolean;
  translationProgress: number;
  languageVersion: number;
};

type StoredProfile = {
  id?: string;
  interfaceLanguage?: AppLanguage;
  workLanguage?: AppLanguage;
  updatedAt?: string;
  [key: string]: unknown;
};

const LANGUAGE_STORAGE_KEY = 'zedpera_language';
const SYSTEM_LANGUAGE_STORAGE_KEY = 'zedpera_system_language';
const WORK_LANGUAGE_STORAGE_KEY = 'zedpera_work_language';

const ACTIVE_PROFILE_KEY = 'active_profile';
const LEGACY_PROFILE_KEY = 'profile';
const PROFILES_FULL_KEY = 'profiles_full';

const LANGUAGE_USER_SELECTED_KEY = 'zedpera_language_user_selected';

const LANGUAGE_EVENTS = [
  'zedpera-language-change',
  'zedpera-language-updated',
  'zedpera-interface-language-change',
  'zedpera-force-language-refresh',
];

const dashboardToolTranslations: Record<AppLanguage, DashboardToolTranslations> = {
  sk: {
    common: {
      assignmentLabel: 'Zadanie alebo text',
      attachments: 'Prílohy',
      attachmentsHelp:
        'Nahraj PDF, DOCX, TXT, Excel, CSV, PPT alebo obrázky. Pri analýze dát systém otvorí výsledky v samostatnom okne.',
      attachFile: 'Priložiť súbor',
      dictate: 'Diktovať',
      canvas: 'Canvas',
      clear: 'Vymazať',
      infoText:
        'Vložte text práce alebo otázku. Systém pripraví odborné odporúčania, komentáre a návrhy na zlepšenie.',
    },
    tools: {
      aiSupervisor: 'AI supervízor',
      qualityAudit: 'Audit kvality',
      defense: 'Obhajoba',
      translation: 'Preklad',
      dataAnalysis: 'Analýza dát',
      planning: 'Plánovanie',
      emails: 'Emaily',
      originalityCheck: 'Kontrola originality',
      textHumanization: 'Humanizácia textu',
    },
    buttons: {
      aiSupervisor: 'Spustiť AI supervízora',
      qualityAudit: 'Spustiť audit kvality',
      defense: 'Pripraviť obhajobu',
      translation: 'Preložiť text',
      dataAnalysis: 'Spustiť analýzu dát',
      planning: 'Spustiť plánovanie',
      emails: 'Vygenerovať email',
      originalityCheck: 'Spustiť kontrolu originality',
      textHumanization: 'Spustiť humanizáciu textu',
    },
    placeholders: {
      aiSupervisor:
        'Vložte prácu, otázku alebo časť, ktorú chcete skontrolovať.',
      qualityAudit:
        'Vložte text práce, kapitolu, úvod, záver alebo časť, ktorú chcete odborne skontrolovať.',
      defense:
        'Vložte text práce, abstrakt, záver alebo otázky k obhajobe.',
      translation:
        'Vložte text, ktorý chcete preložiť do zvoleného jazyka.',
      dataAnalysis:
        'Napíšte, čo má systém s dátami urobiť. Napríklad: priprav frekvenčnú analýzu, deskriptívnu štatistiku, grafy, korelácie Pearson/Spearman, testy a interpretáciu výsledkov do práce.',
      planning:
        'Napíšte termín odovzdania, aktuálny stav práce a požadovaný plán. Termín nesmie byť v minulosti.',
      emails:
        'Napíšte, komu má byť email určený a čo má obsahovať. Stačí stručne.',
      originalityCheck:
        'Nahrajte alebo vložte text práce. Systém pripraví orientačný protokol kontroly originality.',
      textHumanization:
        'Vložte text, ktorý chcete upraviť do prirodzenejšej, plynulejšej a menej strojovej podoby.',
    },
    cards: {
      aiSupervisor: {
        title: 'AI supervízor',
        subtitle: 'Odborné vedenie práce',
        description:
          'Skontroluje zadanie, štruktúru, odborný štýl a navrhne konkrétne zlepšenia práce.',
        badge: 'Kontrola práce',
      },
      qualityAudit: {
        title: 'Audit kvality',
        subtitle: 'Odborná kontrola textu',
        description:
          'Overí štylistiku, logiku, citácie, nadväznosť kapitol a pripraví jasnú správu kvality.',
        badge: 'Kvalita',
      },
      defense: {
        title: 'Obhajoba',
        subtitle: 'Príprava na prezentáciu',
        description:
          'Vytvorí otázky, odpovede, osnovu obhajoby a podklady pre profesionálne vystúpenie.',
        badge: 'Prezentácia',
      },
      translation: {
        title: 'Preklad',
        subtitle: 'Akademický preklad textu',
        description:
          'Preloží odborný text do zvoleného jazyka so zachovaním významu, štýlu a terminológie.',
        badge: 'Jazyky',
      },
      dataAnalysis: {
        title: 'Analýza dát',
        subtitle: 'Štatistika a interpretácia',
        description:
          'Pripraví praktickú analýzu dát, tabuľky, grafy, testy a interpretáciu výsledkov do práce.',
        badge: 'Dáta',
      },
      planning: {
        title: 'Plánovanie',
        subtitle: 'Časový plán práce',
        description:
          'Rozdelí prácu na kroky, termíny a priority podľa dátumu odovzdania a aktuálneho stavu.',
        badge: 'Harmonogram',
      },
      emails: {
        title: 'Emaily',
        subtitle: 'Akademická komunikácia',
        description:
          'Vygeneruje profesionálny email vedúcemu, škole alebo konzultantovi v správnom tóne.',
        badge: 'Komunikácia',
      },
      originalityCheck: {
        title: 'Kontrola originality',
        subtitle: 'Orientačné posúdenie podobnosti',
        description:
          'Vyhodnotí rizikové pasáže, navrhne úpravy a pripraví odporúčania na zníženie zhody.',
        badge: 'Originalita',
      },
      textHumanization: {
        title: 'Humanizácia textu',
        subtitle: 'Prirodzenejší odborný text',
        description:
          'Upraví text tak, aby pôsobil plynulo, prirodzene a menej strojovo, bez straty významu.',
        badge: 'Štýl',
      },
    },
    modules: {
      aiSupervisor: {
        intro: 'AI supervízor pomôže skontrolovať zadanie, štruktúru práce, odborný štýl a návrhy na zlepšenie.',
        inputHelp: 'Vložte text práce, zadanie, otázku alebo časť, ktorú chcete odborne skontrolovať.',
        resultHelp: 'Výstup obsahuje odborné pripomienky, odporúčania a konkrétne návrhy úprav.',
        emptyState: 'Zatiaľ nie je vložený text pre AI supervízora.',
      },
      defense: {
        intro: 'Obhajoba pripraví osnovu vystúpenia, otázky komisie, odpovede a podklady k prezentácii.',
        inputHelp: 'Vložte abstrakt, záver, ciele práce alebo otázky, ktoré chcete spracovať k obhajobe.',
        resultHelp: 'Výstup obsahuje návrh obhajoby, odpovede, odporúčania a prezentačný text.',
        emptyState: 'Zatiaľ nie sú vložené podklady k obhajobe.',
      },
      translation: {
        intro: 'Preklad pripraví odborný text vo vybranom cieľovom jazyku so zachovaním významu, štýlu a terminológie.',
        inputHelp: 'Vložte text, ktorý chcete preložiť. Vyberte zdrojový jazyk, cieľový jazyk a štýl prekladu.',
        resultHelp: 'Výstupom je preložený text pripravený na ďalšiu úpravu alebo použitie v práci.',
        emptyState: 'Zatiaľ nie je vložený text na preklad.',
      },
      qualityAudit: {
        intro: 'Audit kvality skontroluje odbornú úroveň, štylistiku, citácie, logiku a nadväznosť textu.',
        inputHelp: 'Vložte kapitolu, úvod, záver alebo celý text práce, ktorý chcete posúdiť.',
        resultHelp: 'Výstup obsahuje slabé miesta, odporúčania, návrhy opráv a stručné hodnotenie kvality.',
        emptyState: 'Zatiaľ nie je vložený text na audit kvality.',
      },
      dataAnalysis: {
        intro: 'Analýza dát pripraví štatistické výpočty, tabuľky, grafy a interpretáciu do záverečnej práce.',
        inputHelp: 'Nahrajte súbor s dátami alebo napíšte, aký typ analýzy potrebujete.',
        resultHelp: 'Výsledok bude obsahovať prehľad dát, výpočty, interpretáciu a odporúčanie do práce.',
        emptyState: 'Zatiaľ nie sú vložené dáta na analýzu.',
      },
      planning: {
        intro: 'Plánovanie vytvorí realistický harmonogram písania podľa termínu odovzdania.',
        inputHelp: 'Uveďte termín, aktuálny stav práce, rozsah a časti, ktoré ešte chýbajú.',
        resultHelp: 'Výstup obsahuje časový plán, priority, míľniky a kontrolný zoznam.',
        emptyState: 'Zatiaľ nie sú zadané údaje na plánovanie.',
      },
      emails: {
        intro: 'Emailový asistent pripraví slušnú akademickú správu podľa účelu a zvoleného tónu.',
        inputHelp: 'Napíšte adresáta, účel správy a základné body, ktoré má email obsahovať.',
        resultHelp: 'Výstupom je pripravený email, ktorý môžete skopírovať alebo upraviť.',
        emptyState: 'Zatiaľ nie je zadaný obsah emailu.',
      },
      originalityCheck: {
        intro: 'Kontrola originality orientačne označí pasáže, ktoré môžu pôsobiť rizikovo alebo príliš podobne.',
        inputHelp: 'Vložte text práce alebo kapitolu, ktorú chcete posúdiť z hľadiska originality.',
        resultHelp: 'Výstup obsahuje rizikové miesta, odporúčania na parafrázovanie a úpravu citácií.',
        emptyState: 'Zatiaľ nie je vložený text na kontrolu originality.',
      },
      textHumanization: {
        intro: 'Humanizátor upraví text do prirodzenejšej, plynulejšej a akademicky vhodnej podoby.',
        inputHelp: 'Vložte text, ktorý chcete preštylizovať bez zmeny odborného významu.',
        resultHelp: 'Výstupom je upravený text s prirodzenejšou formuláciou a lepšou čitateľnosťou.',
        emptyState: 'Zatiaľ nie je vložený text na humanizáciu.',
      },
    },
    resultLabels: {
      generatedOutput: 'Vygenerovaný výstup',
      report: 'Správa',
      recommendations: 'Odporúčania',
      nextSteps: 'Ďalšie kroky',
      copied: 'Skopírované',
      download: 'Stiahnuť',
      openResult: 'Otvoriť výsledok',
      processing: 'Spracúvam...',
    },
    qualityAudit: {
      review: 'Kontrola',
      output: 'Výstup',
      citationStyle: 'Citačný štýl',
      stylistics: 'Štylistika',
      citations: 'Citácie',
      logic: 'Logika a nadväznosť',
      fullAudit: 'Celkový audit',
      detailedReport: 'Detailná správa',
      shortReport: 'Stručná správa',
    },
    emails: {
      emailType: 'Typ emailu',
      tone: 'Tón',
      emailSupervisor: 'Email vedúcemu',
      consultationRequest: 'Žiadosť o konzultáciu',
      apology: 'Ospravedlnenie',
      documentsSubmission: 'Doplnenie podkladov',
      generalAcademicEmail: 'Všeobecný akademický email',
      professionalPolite: 'Profesionálny a slušný',
      formal: 'Formálny',
      friendly: 'Priateľský',
      brief: 'Stručný',
    },
    planning: {
      todaysDate: 'Dnešný dátum',
    },
  },

  cs: {
    common: {
      assignmentLabel: 'Zadání nebo text',
      attachments: 'Přílohy',
      attachmentsHelp:
        'Nahrajte PDF, DOCX, TXT, Excel, CSV, PPT nebo obrázky. Při analýze dat systém otevře výsledky v samostatném okně.',
      attachFile: 'Přiložit soubor',
      dictate: 'Diktovat',
      canvas: 'Canvas',
      clear: 'Vymazat',
      infoText:
        'Vložte text práce nebo otázku. Systém připraví odborná doporučení, komentáře a návrhy na zlepšení.',
    },
    tools: {
      aiSupervisor: 'AI supervizor',
      qualityAudit: 'Audit kvality',
      defense: 'Obhajoba',
      translation: 'Překlad',
      dataAnalysis: 'Analýza dat',
      planning: 'Plánování',
      emails: 'Emaily',
      originalityCheck: 'Kontrola originality',
      textHumanization: 'Humanizace textu',
    },
    buttons: {
      aiSupervisor: 'Spustit AI supervizora',
      qualityAudit: 'Spustit audit kvality',
      defense: 'Připravit obhajobu',
      translation: 'Přeložit text',
      dataAnalysis: 'Spustit analýzu dat',
      planning: 'Spustit plánování',
      emails: 'Vygenerovat email',
      originalityCheck: 'Spustit kontrolu originality',
      textHumanization: 'Spustit humanizaci textu',
    },
    placeholders: {
      aiSupervisor:
        'Vložte práci, otázku nebo část, kterou chcete zkontrolovat.',
      qualityAudit:
        'Vložte text práce, kapitolu, úvod, závěr nebo část, kterou chcete odborně zkontrolovat.',
      defense:
        'Vložte text práce, abstrakt, závěr nebo otázky k obhajobě.',
      translation:
        'Vložte text, který chcete přeložit do zvoleného jazyka.',
      dataAnalysis:
        'Napište, co má systém s daty udělat. Například: připrav frekvenční analýzu, deskriptivní statistiku, grafy, korelace Pearson/Spearman, testy a interpretaci výsledků do práce.',
      planning:
        'Napište termín odevzdání, aktuální stav práce a požadovaný plán. Termín nesmí být v minulosti.',
      emails:
        'Napište, komu má být email určen a co má obsahovat. Stačí stručně.',
      originalityCheck:
        'Nahrajte nebo vložte text práce. Systém připraví orientační protokol kontroly originality.',
      textHumanization:
        'Vložte text, který chcete upravit do přirozenější, plynulejší a méně strojové podoby.',
    },
    cards: {
      aiSupervisor: {
        title: 'AI supervizor',
        subtitle: 'Odborné vedení práce',
        description:
          'Zkontroluje zadání, strukturu, odborný styl a navrhne konkrétní zlepšení práce.',
        badge: 'Kontrola práce',
      },
      qualityAudit: {
        title: 'Audit kvality',
        subtitle: 'Odborná kontrola textu',
        description:
          'Ověří stylistiku, logiku, citace, návaznost kapitol a připraví jasnou zprávu kvality.',
        badge: 'Kvalita',
      },
      defense: {
        title: 'Obhajoba',
        subtitle: 'Příprava na prezentaci',
        description:
          'Vytvoří otázky, odpovědi, osnovu obhajoby a podklady pro profesionální vystoupení.',
        badge: 'Prezentace',
      },
      translation: {
        title: 'Překlad',
        subtitle: 'Akademický překlad textu',
        description:
          'Přeloží odborný text do zvoleného jazyka se zachováním významu, stylu a terminologie.',
        badge: 'Jazyky',
      },
      dataAnalysis: {
        title: 'Analýza dat',
        subtitle: 'Statistika a interpretace',
        description:
          'Připraví praktickou analýzu dat, tabulky, grafy, testy a interpretaci výsledků do práce.',
        badge: 'Data',
      },
      planning: {
        title: 'Plánování',
        subtitle: 'Časový plán práce',
        description:
          'Rozdělí práci na kroky, termíny a priority podle data odevzdání a aktuálního stavu.',
        badge: 'Harmonogram',
      },
      emails: {
        title: 'Emaily',
        subtitle: 'Akademická komunikace',
        description:
          'Vygeneruje profesionální e-mail vedoucímu, škole nebo konzultantovi ve správném tónu.',
        badge: 'Komunikace',
      },
      originalityCheck: {
        title: 'Kontrola originality',
        subtitle: 'Orientační posouzení podobnosti',
        description:
          'Vyhodnotí rizikové pasáže, navrhne úpravy a připraví doporučení pro snížení shody.',
        badge: 'Originalita',
      },
      textHumanization: {
        title: 'Humanizace textu',
        subtitle: 'Přirozenější odborný text',
        description:
          'Upraví text tak, aby působil plynule, přirozeně a méně strojově, bez ztráty významu.',
        badge: 'Styl',
      },
    },
    modules: {
      aiSupervisor: {
        intro: 'AI supervizor pomůže zkontrolovat zadání, strukturu práce, odborný styl a návrhy na zlepšení.',
        inputHelp: 'Vložte text práce, zadání, otázku nebo část, kterou chcete odborně zkontrolovat.',
        resultHelp: 'Výstup obsahuje odborné připomínky, doporučení a konkrétní návrhy úprav.',
        emptyState: 'Zatím není vložený text pro AI supervizora.',
      },
      defense: {
        intro: 'Obhajoba připraví osnovu vystoupení, otázky komise, odpovědi a podklady k prezentaci.',
        inputHelp: 'Vložte abstrakt, závěr, cíle práce nebo otázky, které chcete zpracovat k obhajobě.',
        resultHelp: 'Výstup obsahuje návrh obhajoby, odpovědi, doporučení a prezentační text.',
        emptyState: 'Zatím nejsou vložené podklady k obhajobě.',
      },
      translation: {
        intro: 'Překlad připraví odborný text ve zvoleném cílovém jazyce se zachováním významu, stylu a terminologie.',
        inputHelp: 'Vložte text, který chcete přeložit. Vyberte zdrojový jazyk, cílový jazyk a styl překladu.',
        resultHelp: 'Výstupem je přeložený text připravený k další úpravě nebo použití v práci.',
        emptyState: 'Zatím není vložený text k překladu.',
      },
      qualityAudit: {
        intro: 'Audit kvality zkontroluje odbornou úroveň, stylistiku, citace, logiku a návaznost textu.',
        inputHelp: 'Vložte kapitolu, úvod, závěr nebo celý text práce, který chcete posoudit.',
        resultHelp: 'Výstup obsahuje slabá místa, doporučení, návrhy oprav a stručné hodnocení kvality.',
        emptyState: 'Zatím není vložen text pro audit kvality.',
      },
      dataAnalysis: {
        intro: 'Analýza dat připraví statistické výpočty, tabulky, grafy a interpretaci do závěrečné práce.',
        inputHelp: 'Nahrajte soubor s daty nebo napište, jaký typ analýzy potřebujete.',
        resultHelp: 'Výsledek bude obsahovat přehled dat, výpočty, interpretaci a doporučení do práce.',
        emptyState: 'Zatím nejsou vložena data k analýze.',
      },
      planning: {
        intro: 'Plánování vytvoří realistický harmonogram psaní podle termínu odevzdání.',
        inputHelp: 'Uveďte termín, aktuální stav práce, rozsah a části, které ještě chybí.',
        resultHelp: 'Výstup obsahuje časový plán, priority, milníky a kontrolní seznam.',
        emptyState: 'Zatím nejsou zadány údaje pro plánování.',
      },
      emails: {
        intro: 'E-mailový asistent připraví slušnou akademickou zprávu podle účelu a zvoleného tónu.',
        inputHelp: 'Napište adresáta, účel zprávy a základní body, které má e-mail obsahovat.',
        resultHelp: 'Výstupem je připravený e-mail, který můžete zkopírovat nebo upravit.',
        emptyState: 'Zatím není zadán obsah e-mailu.',
      },
      originalityCheck: {
        intro: 'Kontrola originality orientačně označí pasáže, které mohou působit rizikově nebo příliš podobně.',
        inputHelp: 'Vložte text práce nebo kapitolu, kterou chcete posoudit z hlediska originality.',
        resultHelp: 'Výstup obsahuje riziková místa, doporučení pro parafrázování a úpravu citací.',
        emptyState: 'Zatím není vložen text pro kontrolu originality.',
      },
      textHumanization: {
        intro: 'Humanizátor upraví text do přirozenější, plynulejší a akademicky vhodné podoby.',
        inputHelp: 'Vložte text, který chcete přeformulovat bez změny odborného významu.',
        resultHelp: 'Výstupem je upravený text s přirozenější formulací a lepší čitelností.',
        emptyState: 'Zatím není vložen text pro humanizaci.',
      },
    },
    resultLabels: {
      generatedOutput: 'Vygenerovaný výstup',
      report: 'Zpráva',
      recommendations: 'Doporučení',
      nextSteps: 'Další kroky',
      copied: 'Zkopírováno',
      download: 'Stáhnout',
      openResult: 'Otevřít výsledek',
      processing: 'Zpracovávám...',
    },
    qualityAudit: {
      review: 'Kontrola',
      output: 'Výstup',
      citationStyle: 'Citační styl',
      stylistics: 'Stylistika',
      citations: 'Citace',
      logic: 'Logika a návaznost',
      fullAudit: 'Celkový audit',
      detailedReport: 'Detailní zpráva',
      shortReport: 'Stručná zpráva',
    },
    emails: {
      emailType: 'Typ emailu',
      tone: 'Tón',
      emailSupervisor: 'Email vedoucímu',
      consultationRequest: 'Žádost o konzultaci',
      apology: 'Omluva',
      documentsSubmission: 'Doplnění podkladů',
      generalAcademicEmail: 'Obecný akademický email',
      professionalPolite: 'Profesionální a slušný',
      formal: 'Formální',
      friendly: 'Přátelský',
      brief: 'Stručný',
    },
    planning: {
      todaysDate: 'Dnešní datum',
    },
  },

  en: {
    common: {
      assignmentLabel: 'Assignment or text',
      attachments: 'Attachments',
      attachmentsHelp:
        'Upload PDF, DOCX, TXT, Excel, CSV, PPT or images. For data analysis, the results will open in a separate modal window.',
      attachFile: 'Attach file',
      dictate: 'Dictate',
      canvas: 'Canvas',
      clear: 'Clear',
      infoText:
        'Enter your paper text or question. The system will prepare expert recommendations, comments, and suggestions for improvement.',
    },
    tools: {
      aiSupervisor: 'AI Supervisor',
      qualityAudit: 'Quality Audit',
      defense: 'Defense',
      translation: 'Translation',
      dataAnalysis: 'Data Analysis',
      planning: 'Planning',
      emails: 'Emails',
      originalityCheck: 'Originality Check',
      textHumanization: 'Text Humanization',
    },
    buttons: {
      aiSupervisor: 'Run AI Supervisor',
      qualityAudit: 'Run Quality Audit',
      defense: 'Prepare Defense',
      translation: 'Translate Text',
      dataAnalysis: 'Run Data Analysis',
      planning: 'Start Planning',
      emails: 'Generate Email',
      originalityCheck: 'Run Originality Check',
      textHumanization: 'Run Text Humanization',
    },
    placeholders: {
      aiSupervisor:
        'Insert your paper, question, or section you want to review.',
      qualityAudit:
        'Insert your thesis text, chapter, introduction, conclusion, or any section you want to review.',
      defense:
        'Insert your thesis text, abstract, conclusion, or defense questions.',
      translation:
        'Insert the text you want to translate into the selected language.',
      dataAnalysis:
        'Describe what the system should do with the data. For example: prepare frequency analysis, descriptive statistics, charts, Pearson/Spearman correlations, tests, and interpretation of results for the thesis.',
      planning:
        'Enter the submission deadline, current state of the paper, and the required plan. The deadline must not be in the past.',
      emails:
        'Write who the email is for and what it should contain. A short instruction is enough.',
      originalityCheck:
        'Upload or paste your paper text. The system will prepare an indicative originality check protocol.',
      textHumanization:
        'Insert the text you want to rewrite into a more natural, fluent, and less machine-like form.',
    },
    cards: {
      aiSupervisor: {
        title: 'AI Supervisor',
        subtitle: 'Expert thesis guidance',
        description:
          'Reviews the assignment, structure, academic style, and suggests specific improvements for the paper.',
        badge: 'Paper review',
      },
      qualityAudit: {
        title: 'Quality Audit',
        subtitle: 'Expert text review',
        description:
          'Checks style, logic, citations, chapter flow, and prepares a clear quality report.',
        badge: 'Quality',
      },
      defense: {
        title: 'Defense',
        subtitle: 'Presentation preparation',
        description:
          'Creates questions, answers, a defense outline, and materials for a professional presentation.',
        badge: 'Presentation',
      },
      translation: {
        title: 'Translation',
        subtitle: 'Academic text translation',
        description:
          'Translates academic text into the selected language while preserving meaning, style, and terminology.',
        badge: 'Languages',
      },
      dataAnalysis: {
        title: 'Data Analysis',
        subtitle: 'Statistics and interpretation',
        description:
          'Prepares practical data analysis, tables, charts, tests, and interpretation of results for the thesis.',
        badge: 'Data',
      },
      planning: {
        title: 'Planning',
        subtitle: 'Work schedule',
        description:
          'Divides the work into steps, deadlines, and priorities based on the submission date and current progress.',
        badge: 'Timeline',
      },
      emails: {
        title: 'Emails',
        subtitle: 'Academic communication',
        description:
          'Generates a professional email to a supervisor, school, or consultant in the right tone.',
        badge: 'Communication',
      },
      originalityCheck: {
        title: 'Originality Check',
        subtitle: 'Indicative similarity review',
        description:
          'Evaluates risky passages, suggests edits, and prepares recommendations to reduce similarity.',
        badge: 'Originality',
      },
      textHumanization: {
        title: 'Text Humanization',
        subtitle: 'More natural academic text',
        description:
          'Rewrites text to sound fluent, natural, and less machine-like without changing its meaning.',
        badge: 'Style',
      },
    },
    modules: {
      aiSupervisor: {
        intro: 'The AI Supervisor helps review the assignment, paper structure, academic style, and improvement suggestions.',
        inputHelp: 'Insert your paper text, assignment, question, or section you want to review academically.',
        resultHelp: 'The output includes expert comments, recommendations, and specific revision suggestions.',
        emptyState: 'No text has been added for the AI Supervisor yet.',
      },
      defense: {
        intro: 'Defense preparation creates a presentation outline, committee questions, answers, and supporting materials.',
        inputHelp: 'Insert the abstract, conclusion, research aims, or questions you want to prepare for the defense.',
        resultHelp: 'The output includes a defense proposal, answers, recommendations, and presentation text.',
        emptyState: 'No defense materials have been added yet.',
      },
      translation: {
        intro: 'Translation prepares academic text in the selected target language while preserving meaning, style, and terminology.',
        inputHelp: 'Insert the text you want to translate. Select the source language, target language, and translation style.',
        resultHelp: 'The output is a translated text ready for further editing or use in your paper.',
        emptyState: 'No text has been added for translation yet.',
      },
      qualityAudit: {
        intro: 'The quality audit checks academic level, style, citations, logic, and text coherence.',
        inputHelp: 'Insert a chapter, introduction, conclusion, or the full paper you want to review.',
        resultHelp: 'The output includes weak points, recommendations, suggested fixes, and a brief quality assessment.',
        emptyState: 'No text has been added for the quality audit yet.',
      },
      dataAnalysis: {
        intro: 'Data analysis prepares statistical calculations, tables, charts, and thesis-ready interpretation.',
        inputHelp: 'Upload a data file or describe the type of analysis you need.',
        resultHelp: 'The result will include a data overview, calculations, interpretation, and recommendations for the paper.',
        emptyState: 'No data has been added for analysis yet.',
      },
      planning: {
        intro: 'Planning creates a realistic writing schedule based on the submission deadline.',
        inputHelp: 'Enter the deadline, current progress, scope, and missing sections.',
        resultHelp: 'The output includes a timeline, priorities, milestones, and a checklist.',
        emptyState: 'No planning information has been entered yet.',
      },
      emails: {
        intro: 'The email assistant prepares a polite academic message based on the purpose and selected tone.',
        inputHelp: 'Write the recipient, purpose of the message, and the key points the email should contain.',
        resultHelp: 'The output is a ready-to-use email that you can copy or edit.',
        emptyState: 'No email content has been entered yet.',
      },
      originalityCheck: {
        intro: 'The originality check highlights passages that may look risky or too similar to common sources.',
        inputHelp: 'Insert the paper text or chapter you want to review for originality.',
        resultHelp: 'The output includes risky areas, paraphrasing recommendations, and citation improvement tips.',
        emptyState: 'No text has been added for the originality check yet.',
      },
      textHumanization: {
        intro: 'The humanizer rewrites text into a more natural, fluent, and academically appropriate form.',
        inputHelp: 'Insert text you want to restyle without changing its academic meaning.',
        resultHelp: 'The output is an improved version with more natural wording and better readability.',
        emptyState: 'No text has been added for humanization yet.',
      },
    },
    resultLabels: {
      generatedOutput: 'Generated output',
      report: 'Report',
      recommendations: 'Recommendations',
      nextSteps: 'Next steps',
      copied: 'Copied',
      download: 'Download',
      openResult: 'Open result',
      processing: 'Processing...',
    },
    qualityAudit: {
      review: 'Review',
      output: 'Output',
      citationStyle: 'Citation Style',
      stylistics: 'Stylistics',
      citations: 'Citations',
      logic: 'Logic and coherence',
      fullAudit: 'Full audit',
      detailedReport: 'Detailed report',
      shortReport: 'Short report',
    },
    emails: {
      emailType: 'Email Type',
      tone: 'Tone',
      emailSupervisor: 'Email to supervisor',
      consultationRequest: 'Consultation request',
      apology: 'Apology',
      documentsSubmission: 'Document submission',
      generalAcademicEmail: 'General academic email',
      professionalPolite: 'Professional and polite',
      formal: 'Formal',
      friendly: 'Friendly',
      brief: 'Brief',
    },
    planning: {
      todaysDate: "Today's date",
    },
  },

  de: {
    common: {
      assignmentLabel: 'Aufgabe oder Text',
      attachments: 'Anhänge',
      attachmentsHelp:
        'Laden Sie PDF, DOCX, TXT, Excel, CSV, PPT oder Bilder hoch. Bei der Datenanalyse werden die Ergebnisse in einem separaten Fenster geöffnet.',
      attachFile: 'Datei anhängen',
      dictate: 'Diktieren',
      canvas: 'Canvas',
      clear: 'Löschen',
      infoText:
        'Geben Sie Ihren Arbeitstext oder Ihre Frage ein. Das System erstellt fachliche Empfehlungen, Kommentare und Verbesserungsvorschläge.',
    },
    tools: {
      aiSupervisor: 'KI-Betreuer',
      qualityAudit: 'Qualitätsaudit',
      defense: 'Verteidigung',
      translation: 'Übersetzung',
      dataAnalysis: 'Datenanalyse',
      planning: 'Planung',
      emails: 'E-Mails',
      originalityCheck: 'Originalitätsprüfung',
      textHumanization: 'Text-Humanisierung',
    },
    buttons: {
      aiSupervisor: 'KI-Betreuer starten',
      qualityAudit: 'Qualitätsaudit starten',
      defense: 'Verteidigung vorbereiten',
      translation: 'Text übersetzen',
      dataAnalysis: 'Datenanalyse starten',
      planning: 'Planung starten',
      emails: 'E-Mail generieren',
      originalityCheck: 'Originalitätsprüfung starten',
      textHumanization: 'Text humanisieren',
    },
    placeholders: {
      aiSupervisor:
        'Fügen Sie Ihre Arbeit, Frage oder den Abschnitt ein, den Sie prüfen möchten.',
      qualityAudit:
        'Fügen Sie den Text Ihrer Arbeit, ein Kapitel, eine Einleitung, einen Schluss oder einen Abschnitt ein.',
      defense:
        'Fügen Sie den Text Ihrer Arbeit, Abstract, Schluss oder Fragen zur Verteidigung ein.',
      translation:
        'Fügen Sie den Text ein, den Sie in die gewählte Sprache übersetzen möchten.',
      dataAnalysis:
        'Beschreiben Sie, was das System mit den Daten machen soll. Zum Beispiel: Häufigkeitsanalyse, deskriptive Statistik, Diagramme, Pearson/Spearman-Korrelationen, Tests und Interpretation.',
      planning:
        'Geben Sie Abgabetermin, aktuellen Stand der Arbeit und den gewünschten Plan ein. Der Termin darf nicht in der Vergangenheit liegen.',
      emails:
        'Schreiben Sie, an wen die E-Mail gerichtet ist und was sie enthalten soll.',
      originalityCheck:
        'Laden Sie den Text hoch oder fügen Sie ihn ein. Das System erstellt ein orientierendes Originalitätsprotokoll.',
      textHumanization:
        'Fügen Sie den Text ein, der natürlicher, flüssiger und weniger maschinell wirken soll.',
    },
    cards: {
      aiSupervisor: {
        title: 'KI-Betreuer',
        subtitle: 'Fachliche Betreuung der Arbeit',
        description:
          'Prüft Aufgabenstellung, Struktur, wissenschaftlichen Stil und schlägt konkrete Verbesserungen vor.',
        badge: 'Arbeitsprüfung',
      },
      qualityAudit: {
        title: 'Qualitätsaudit',
        subtitle: 'Fachliche Textprüfung',
        description:
          'Prüft Stil, Logik, Zitate, Kapitelzusammenhang und erstellt einen klaren Qualitätsbericht.',
        badge: 'Qualität',
      },
      defense: {
        title: 'Verteidigung',
        subtitle: 'Vorbereitung der Präsentation',
        description:
          'Erstellt Fragen, Antworten, eine Verteidigungsstruktur und Unterlagen für einen professionellen Auftritt.',
        badge: 'Präsentation',
      },
      translation: {
        title: 'Übersetzung',
        subtitle: 'Akademische Textübersetzung',
        description:
          'Übersetzt Fachtexte in die gewählte Sprache und bewahrt Bedeutung, Stil und Terminologie.',
        badge: 'Sprachen',
      },
      dataAnalysis: {
        title: 'Datenanalyse',
        subtitle: 'Statistik und Interpretation',
        description:
          'Erstellt praktische Datenanalyse, Tabellen, Diagramme, Tests und Ergebnisinterpretationen für die Arbeit.',
        badge: 'Daten',
      },
      planning: {
        title: 'Planung',
        subtitle: 'Arbeitszeitplan',
        description:
          'Teilt die Arbeit nach Abgabetermin und aktuellem Stand in Schritte, Fristen und Prioritäten ein.',
        badge: 'Zeitplan',
      },
      emails: {
        title: 'E-Mails',
        subtitle: 'Akademische Kommunikation',
        description:
          'Generiert eine professionelle E-Mail an Betreuer, Schule oder Berater im passenden Ton.',
        badge: 'Kommunikation',
      },
      originalityCheck: {
        title: 'Originalitätsprüfung',
        subtitle: 'Orientierende Ähnlichkeitsprüfung',
        description:
          'Bewertet riskante Passagen, schlägt Änderungen vor und gibt Empfehlungen zur Reduzierung von Ähnlichkeit.',
        badge: 'Originalität',
      },
      textHumanization: {
        title: 'Text-Humanisierung',
        subtitle: 'Natürlicher akademischer Text',
        description:
          'Formuliert Text flüssiger, natürlicher und weniger maschinell, ohne die Bedeutung zu verändern.',
        badge: 'Stil',
      },
    },
    modules: {
      aiSupervisor: {
        intro: 'Der KI-Betreuer hilft bei der Prüfung der Aufgabenstellung, Struktur, des wissenschaftlichen Stils und der Verbesserungsvorschläge.',
        inputHelp: 'Fügen Sie Arbeitstext, Aufgabenstellung, Frage oder Abschnitt ein, den Sie fachlich prüfen möchten.',
        resultHelp: 'Die Ausgabe enthält fachliche Hinweise, Empfehlungen und konkrete Überarbeitungsvorschläge.',
        emptyState: 'Es wurde noch kein Text für den KI-Betreuer eingefügt.',
      },
      defense: {
        intro: 'Die Verteidigung erstellt eine Gliederung des Vortrags, Kommissionsfragen, Antworten und Präsentationsunterlagen.',
        inputHelp: 'Fügen Sie Abstract, Schluss, Ziele der Arbeit oder Fragen ein, die für die Verteidigung vorbereitet werden sollen.',
        resultHelp: 'Die Ausgabe enthält einen Verteidigungsvorschlag, Antworten, Empfehlungen und Präsentationstext.',
        emptyState: 'Es wurden noch keine Unterlagen für die Verteidigung eingefügt.',
      },
      translation: {
        intro: 'Die Übersetzung erstellt wissenschaftlichen Text in der gewählten Zielsprache und bewahrt Bedeutung, Stil und Terminologie.',
        inputHelp: 'Fügen Sie den Text ein, den Sie übersetzen möchten. Wählen Sie Ausgangssprache, Zielsprache und Übersetzungsstil.',
        resultHelp: 'Die Ausgabe ist ein übersetzter Text, der weiterbearbeitet oder in der Arbeit verwendet werden kann.',
        emptyState: 'Es wurde noch kein Text für die Übersetzung eingefügt.',
      },
      qualityAudit: {
        intro: 'Das Qualitätsaudit prüft fachliches Niveau, Stil, Zitate, Logik und Textkohärenz.',
        inputHelp: 'Fügen Sie Kapitel, Einleitung, Schluss oder die gesamte Arbeit zur Prüfung ein.',
        resultHelp: 'Die Ausgabe enthält Schwachstellen, Empfehlungen, Korrekturvorschläge und eine kurze Qualitätsbewertung.',
        emptyState: 'Für das Qualitätsaudit wurde noch kein Text eingefügt.',
      },
      dataAnalysis: {
        intro: 'Die Datenanalyse erstellt statistische Berechnungen, Tabellen, Diagramme und Interpretation für die Abschlussarbeit.',
        inputHelp: 'Laden Sie eine Datendatei hoch oder beschreiben Sie die benötigte Analyse.',
        resultHelp: 'Das Ergebnis enthält Datenüberblick, Berechnungen, Interpretation und Empfehlungen für die Arbeit.',
        emptyState: 'Es wurden noch keine Daten zur Analyse hinzugefügt.',
      },
      planning: {
        intro: 'Die Planung erstellt einen realistischen Schreibplan anhand des Abgabetermins.',
        inputHelp: 'Geben Sie Termin, aktuellen Stand, Umfang und fehlende Teile an.',
        resultHelp: 'Die Ausgabe enthält Zeitplan, Prioritäten, Meilensteine und Checkliste.',
        emptyState: 'Es wurden noch keine Angaben zur Planung eingegeben.',
      },
      emails: {
        intro: 'Der E-Mail-Assistent erstellt eine höfliche akademische Nachricht nach Zweck und Ton.',
        inputHelp: 'Geben Sie Empfänger, Zweck und die wichtigsten Punkte der E-Mail an.',
        resultHelp: 'Die Ausgabe ist eine fertige E-Mail, die Sie kopieren oder bearbeiten können.',
        emptyState: 'Es wurde noch kein E-Mail-Inhalt eingegeben.',
      },
      originalityCheck: {
        intro: 'Die Originalitätsprüfung markiert orientierend Passagen, die riskant oder zu ähnlich wirken können.',
        inputHelp: 'Fügen Sie den Text oder das Kapitel ein, das auf Originalität geprüft werden soll.',
        resultHelp: 'Die Ausgabe enthält Risikostellen, Paraphrasierungsempfehlungen und Hinweise zu Zitaten.',
        emptyState: 'Für die Originalitätsprüfung wurde noch kein Text eingefügt.',
      },
      textHumanization: {
        intro: 'Der Humanizer formuliert Text natürlicher, flüssiger und akademisch passend um.',
        inputHelp: 'Fügen Sie Text ein, der ohne Bedeutungsänderung stilistisch verbessert werden soll.',
        resultHelp: 'Die Ausgabe ist eine verbesserte Version mit natürlicherer Formulierung und besserer Lesbarkeit.',
        emptyState: 'Für die Humanisierung wurde noch kein Text eingefügt.',
      },
    },
    resultLabels: {
      generatedOutput: 'Generierte Ausgabe',
      report: 'Bericht',
      recommendations: 'Empfehlungen',
      nextSteps: 'Nächste Schritte',
      copied: 'Kopiert',
      download: 'Herunterladen',
      openResult: 'Ergebnis öffnen',
      processing: 'Verarbeitung...',
    },
    qualityAudit: {
      review: 'Prüfung',
      output: 'Ausgabe',
      citationStyle: 'Zitationsstil',
      stylistics: 'Stilistik',
      citations: 'Zitate',
      logic: 'Logik und Kohärenz',
      fullAudit: 'Vollständiges Audit',
      detailedReport: 'Detaillierter Bericht',
      shortReport: 'Kurzer Bericht',
    },
    emails: {
      emailType: 'E-Mail-Typ',
      tone: 'Ton',
      emailSupervisor: 'E-Mail an Betreuer',
      consultationRequest: 'Beratungsanfrage',
      apology: 'Entschuldigung',
      documentsSubmission: 'Unterlagen ergänzen',
      generalAcademicEmail: 'Allgemeine akademische E-Mail',
      professionalPolite: 'Professionell und höflich',
      formal: 'Formell',
      friendly: 'Freundlich',
      brief: 'Kurz',
    },
    planning: {
      todaysDate: 'Heutiges Datum',
    },
  },

  pl: {
    common: {
      assignmentLabel: 'Zadanie lub tekst',
      attachments: 'Załączniki',
      attachmentsHelp:
        'Prześlij PDF, DOCX, TXT, Excel, CSV, PPT lub obrazy. Przy analizie danych wyniki otworzą się w osobnym oknie.',
      attachFile: 'Dołącz plik',
      dictate: 'Dyktuj',
      canvas: 'Canvas',
      clear: 'Wyczyść',
      infoText:
        'Wprowadź tekst pracy lub pytanie. System przygotuje eksperckie rekomendacje, komentarze i sugestie ulepszeń.',
    },
    tools: {
      aiSupervisor: 'Opiekun AI',
      qualityAudit: 'Audyt jakości',
      defense: 'Obrona',
      translation: 'Tłumaczenie',
      dataAnalysis: 'Analiza danych',
      planning: 'Planowanie',
      emails: 'E-maile',
      originalityCheck: 'Kontrola oryginalności',
      textHumanization: 'Humanizacja tekstu',
    },
    buttons: {
      aiSupervisor: 'Uruchom opiekuna AI',
      qualityAudit: 'Uruchom audyt jakości',
      defense: 'Przygotuj obronę',
      translation: 'Przetłumacz tekst',
      dataAnalysis: 'Uruchom analizę danych',
      planning: 'Uruchom planowanie',
      emails: 'Wygeneruj e-mail',
      originalityCheck: 'Uruchom kontrolę oryginalności',
      textHumanization: 'Humanizuj tekst',
    },
    placeholders: {
      aiSupervisor:
        'Wklej pracę, pytanie lub część, którą chcesz sprawdzić.',
      qualityAudit:
        'Wklej tekst pracy, rozdział, wstęp, zakończenie lub część do sprawdzenia.',
      defense:
        'Wklej tekst pracy, abstrakt, zakończenie lub pytania do obrony.',
      translation:
        'Wklej tekst, który chcesz przetłumaczyć na wybrany język.',
      dataAnalysis:
        'Opisz, co system ma zrobić z danymi. Na przykład: analiza częstotliwości, statystyka opisowa, wykresy, korelacje Pearson/Spearman, testy i interpretacja wyników.',
      planning:
        'Podaj termin oddania, aktualny stan pracy i wymagany plan. Termin nie może być w przeszłości.',
      emails:
        'Napisz, do kogo ma być e-mail i co powinien zawierać.',
      originalityCheck:
        'Prześlij lub wklej tekst pracy. System przygotuje orientacyjny protokół oryginalności.',
      textHumanization:
        'Wklej tekst, który chcesz zmienić na bardziej naturalny i płynny.',
    },
    cards: {
      aiSupervisor: {
        title: 'Opiekun AI',
        subtitle: 'Eksperckie prowadzenie pracy',
        description:
          'Sprawdza temat, strukturę, styl akademicki i proponuje konkretne usprawnienia pracy.',
        badge: 'Kontrola pracy',
      },
      qualityAudit: {
        title: 'Audyt jakości',
        subtitle: 'Ekspercka kontrola tekstu',
        description:
          'Sprawdza stylistykę, logikę, cytowania, spójność rozdziałów i przygotowuje jasny raport jakości.',
        badge: 'Jakość',
      },
      defense: {
        title: 'Obrona',
        subtitle: 'Przygotowanie prezentacji',
        description:
          'Tworzy pytania, odpowiedzi, plan obrony i materiały do profesjonalnego wystąpienia.',
        badge: 'Prezentacja',
      },
      translation: {
        title: 'Tłumaczenie',
        subtitle: 'Akademickie tłumaczenie tekstu',
        description:
          'Tłumaczy tekst specjalistyczny na wybrany język, zachowując znaczenie, styl i terminologię.',
        badge: 'Języki',
      },
      dataAnalysis: {
        title: 'Analiza danych',
        subtitle: 'Statystyka i interpretacja',
        description:
          'Przygotowuje analizę danych, tabele, wykresy, testy i interpretację wyników do pracy.',
        badge: 'Dane',
      },
      planning: {
        title: 'Planowanie',
        subtitle: 'Harmonogram pracy',
        description:
          'Dzieli pracę na kroki, terminy i priorytety według daty oddania i aktualnego stanu.',
        badge: 'Harmonogram',
      },
      emails: {
        title: 'E-maile',
        subtitle: 'Komunikacja akademicka',
        description:
          'Generuje profesjonalny e-mail do promotora, szkoły lub konsultanta w odpowiednim tonie.',
        badge: 'Komunikacja',
      },
      originalityCheck: {
        title: 'Kontrola oryginalności',
        subtitle: 'Orientacyjna ocena podobieństwa',
        description:
          'Ocenia ryzykowne fragmenty, sugeruje poprawki i przygotowuje zalecenia ograniczające podobieństwo.',
        badge: 'Oryginalność',
      },
      textHumanization: {
        title: 'Humanizacja tekstu',
        subtitle: 'Bardziej naturalny tekst akademicki',
        description:
          'Przepisuje tekst tak, aby brzmiał płynnie, naturalnie i mniej maszynowo bez zmiany znaczenia.',
        badge: 'Styl',
      },
    },
    modules: {
      aiSupervisor: {
        intro: 'Opiekun AI pomaga sprawdzić temat, strukturę pracy, styl akademicki oraz propozycje ulepszeń.',
        inputHelp: 'Wklej tekst pracy, temat, pytanie lub część, którą chcesz sprawdzić merytorycznie.',
        resultHelp: 'Wynik zawiera komentarze eksperckie, rekomendacje i konkretne propozycje poprawek.',
        emptyState: 'Nie dodano jeszcze tekstu dla opiekuna AI.',
      },
      defense: {
        intro: 'Obrona przygotuje plan wystąpienia, pytania komisji, odpowiedzi oraz materiały do prezentacji.',
        inputHelp: 'Wklej abstrakt, zakończenie, cele pracy lub pytania, które chcesz przygotować do obrony.',
        resultHelp: 'Wynik zawiera propozycję obrony, odpowiedzi, rekomendacje i tekst prezentacji.',
        emptyState: 'Nie dodano jeszcze materiałów do obrony.',
      },
      translation: {
        intro: 'Tłumaczenie przygotuje tekst akademicki w wybranym języku docelowym, zachowując znaczenie, styl i terminologię.',
        inputHelp: 'Wklej tekst, który chcesz przetłumaczyć. Wybierz język źródłowy, język docelowy i styl tłumaczenia.',
        resultHelp: 'Wynikiem jest przetłumaczony tekst gotowy do dalszej edycji lub użycia w pracy.',
        emptyState: 'Nie dodano jeszcze tekstu do tłumaczenia.',
      },
      qualityAudit: {
        intro: 'Audyt jakości sprawdza poziom akademicki, styl, cytowania, logikę i spójność tekstu.',
        inputHelp: 'Wklej rozdział, wstęp, zakończenie lub całą pracę, którą chcesz ocenić.',
        resultHelp: 'Wynik zawiera słabe punkty, rekomendacje, propozycje poprawek i krótką ocenę jakości.',
        emptyState: 'Nie dodano jeszcze tekstu do audytu jakości.',
      },
      dataAnalysis: {
        intro: 'Analiza danych przygotowuje obliczenia statystyczne, tabele, wykresy i interpretację do pracy.',
        inputHelp: 'Prześlij plik z danymi albo opisz typ analizy, którego potrzebujesz.',
        resultHelp: 'Wynik będzie zawierał przegląd danych, obliczenia, interpretację i rekomendacje do pracy.',
        emptyState: 'Nie dodano jeszcze danych do analizy.',
      },
      planning: {
        intro: 'Planowanie tworzy realistyczny harmonogram pisania według terminu oddania.',
        inputHelp: 'Podaj termin, aktualny postęp, zakres i brakujące części.',
        resultHelp: 'Wynik zawiera harmonogram, priorytety, kamienie milowe i listę kontrolną.',
        emptyState: 'Nie podano jeszcze informacji do planowania.',
      },
      emails: {
        intro: 'Asystent e-maili przygotowuje uprzejmą wiadomość akademicką według celu i wybranego tonu.',
        inputHelp: 'Napisz odbiorcę, cel wiadomości i kluczowe punkty, które e-mail ma zawierać.',
        resultHelp: 'Wynikiem jest gotowy e-mail, który można skopiować lub edytować.',
        emptyState: 'Nie wprowadzono jeszcze treści e-maila.',
      },
      originalityCheck: {
        intro: 'Kontrola oryginalności orientacyjnie wskazuje fragmenty, które mogą być ryzykowne lub zbyt podobne.',
        inputHelp: 'Wklej tekst pracy lub rozdział, który chcesz sprawdzić pod kątem oryginalności.',
        resultHelp: 'Wynik zawiera ryzykowne miejsca, zalecenia parafrazowania i poprawy cytowań.',
        emptyState: 'Nie dodano jeszcze tekstu do kontroli oryginalności.',
      },
      textHumanization: {
        intro: 'Humanizator przekształca tekst w bardziej naturalną, płynną i akademicko odpowiednią formę.',
        inputHelp: 'Wklej tekst, który chcesz przeredagować bez zmiany sensu merytorycznego.',
        resultHelp: 'Wynikiem jest poprawiona wersja z naturalniejszym stylem i lepszą czytelnością.',
        emptyState: 'Nie dodano jeszcze tekstu do humanizacji.',
      },
    },
    resultLabels: {
      generatedOutput: 'Wygenerowany wynik',
      report: 'Raport',
      recommendations: 'Rekomendacje',
      nextSteps: 'Następne kroki',
      copied: 'Skopiowano',
      download: 'Pobierz',
      openResult: 'Otwórz wynik',
      processing: 'Przetwarzam...',
    },
    qualityAudit: {
      review: 'Kontrola',
      output: 'Wynik',
      citationStyle: 'Styl cytowania',
      stylistics: 'Stylistyka',
      citations: 'Cytowania',
      logic: 'Logika i spójność',
      fullAudit: 'Pełny audyt',
      detailedReport: 'Raport szczegółowy',
      shortReport: 'Raport krótki',
    },
    emails: {
      emailType: 'Typ e-maila',
      tone: 'Ton',
      emailSupervisor: 'E-mail do promotora',
      consultationRequest: 'Prośba o konsultację',
      apology: 'Przeprosiny',
      documentsSubmission: 'Uzupełnienie dokumentów',
      generalAcademicEmail: 'Ogólny e-mail akademicki',
      professionalPolite: 'Profesjonalny i uprzejmy',
      formal: 'Formalny',
      friendly: 'Przyjazny',
      brief: 'Krótki',
    },
    planning: {
      todaysDate: 'Dzisiejsza data',
    },
  },

  hu: {
    common: {
      assignmentLabel: 'Feladat vagy szöveg',
      attachments: 'Mellékletek',
      attachmentsHelp:
        'Tölts fel PDF, DOCX, TXT, Excel, CSV, PPT vagy képfájlokat. Adatelemzésnél az eredmények külön ablakban nyílnak meg.',
      attachFile: 'Fájl csatolása',
      dictate: 'Diktálás',
      canvas: 'Canvas',
      clear: 'Törlés',
      infoText:
        'Írd be a dolgozat szövegét vagy kérdésedet. A rendszer szakmai ajánlásokat, megjegyzéseket és javítási javaslatokat készít.',
    },
    tools: {
      aiSupervisor: 'AI témavezető',
      qualityAudit: 'Minőségi audit',
      defense: 'Védés',
      translation: 'Fordítás',
      dataAnalysis: 'Adatelemzés',
      planning: 'Tervezés',
      emails: 'E-mailek',
      originalityCheck: 'Eredetiség ellenőrzése',
      textHumanization: 'Szöveg humanizálása',
    },
    buttons: {
      aiSupervisor: 'AI témavezető indítása',
      qualityAudit: 'Minőségi audit indítása',
      defense: 'Védés előkészítése',
      translation: 'Szöveg fordítása',
      dataAnalysis: 'Adatelemzés indítása',
      planning: 'Tervezés indítása',
      emails: 'E-mail generálása',
      originalityCheck: 'Eredetiség ellenőrzése',
      textHumanization: 'Szöveg humanizálása',
    },
    placeholders: {
      aiSupervisor:
        'Illeszd be a dolgozatot, kérdést vagy ellenőrizendő részt.',
      qualityAudit:
        'Illeszd be a dolgozat szövegét, fejezetét, bevezetését, zárását vagy egy ellenőrizendő részt.',
      defense:
        'Illeszd be a dolgozat szövegét, absztraktját, zárását vagy védési kérdéseket.',
      translation:
        'Illeszd be a szöveget, amelyet a kiválasztott nyelvre szeretnél fordítani.',
      dataAnalysis:
        'Írd le, mit tegyen a rendszer az adatokkal. Például: gyakorisági elemzés, leíró statisztika, grafikonok, Pearson/Spearman korrelációk, tesztek és értelmezés.',
      planning:
        'Add meg a leadási határidőt, a dolgozat aktuális állapotát és a szükséges tervet. A határidő nem lehet múltbeli.',
      emails:
        'Írd le, kinek szóljon az e-mail és mit tartalmazzon.',
      originalityCheck:
        'Töltsd fel vagy illeszd be a dolgozat szövegét. A rendszer tájékoztató eredetiségellenőrzési protokollt készít.',
      textHumanization:
        'Illeszd be a szöveget, amelyet természetesebbé és gördülékenyebbé szeretnél tenni.',
    },
    cards: {
      aiSupervisor: {
        title: 'AI témavezető',
        subtitle: 'Szakmai dolgozatvezetés',
        description:
          'Ellenőrzi a feladatot, a szerkezetet, az akadémiai stílust, és konkrét javításokat javasol.',
        badge: 'Dolgozatellenőrzés',
      },
      qualityAudit: {
        title: 'Minőségi audit',
        subtitle: 'Szakmai szövegellenőrzés',
        description:
          'Ellenőrzi a stílust, logikát, hivatkozásokat, fejezetkapcsolatokat, és minőségi jelentést készít.',
        badge: 'Minőség',
      },
      defense: {
        title: 'Védés',
        subtitle: 'Prezentációs felkészítés',
        description:
          'Kérdéseket, válaszokat, védési vázlatot és professzionális előadási anyagokat készít.',
        badge: 'Prezentáció',
      },
      translation: {
        title: 'Fordítás',
        subtitle: 'Akadémiai szövegfordítás',
        description:
          'A kiválasztott nyelvre fordítja a szakmai szöveget, megőrizve a jelentést, stílust és terminológiát.',
        badge: 'Nyelvek',
      },
      dataAnalysis: {
        title: 'Adatelemzés',
        subtitle: 'Statisztika és értelmezés',
        description:
          'Gyakorlati adatelemzést, táblázatokat, grafikonokat, teszteket és dolgozatba illő értelmezést készít.',
        badge: 'Adatok',
      },
      planning: {
        title: 'Tervezés',
        subtitle: 'Dolgozati ütemterv',
        description:
          'A leadási határidő és az aktuális állapot alapján lépésekre, határidőkre és prioritásokra bontja a munkát.',
        badge: 'Ütemterv',
      },
      emails: {
        title: 'E-mailek',
        subtitle: 'Akadémiai kommunikáció',
        description:
          'Professzionális e-mailt készít témavezetőnek, iskolának vagy konzulensnek a megfelelő hangnemben.',
        badge: 'Kommunikáció',
      },
      originalityCheck: {
        title: 'Eredetiség ellenőrzése',
        subtitle: 'Tájékoztató hasonlósági vizsgálat',
        description:
          'Értékeli a kockázatos részeket, javításokat javasol, és ajánlásokat ad a hasonlóság csökkentésére.',
        badge: 'Eredetiség',
      },
      textHumanization: {
        title: 'Szöveg humanizálása',
        subtitle: 'Természetesebb akadémiai szöveg',
        description:
          'Átfogalmazza a szöveget, hogy gördülékenyebb, természetesebb és kevésbé gépies legyen, jelentésváltozás nélkül.',
        badge: 'Stílus',
      },
    },
    modules: {
      aiSupervisor: {
        intro: 'Az AI témavezető segít ellenőrizni a feladatot, a dolgozat szerkezetét, az akadémiai stílust és a fejlesztési javaslatokat.',
        inputHelp: 'Illeszd be a dolgozat szövegét, a feladatot, kérdést vagy azt a részt, amelyet szakmailag ellenőrizni szeretnél.',
        resultHelp: 'A kimenet szakmai megjegyzéseket, ajánlásokat és konkrét javítási javaslatokat tartalmaz.',
        emptyState: 'Még nincs szöveg megadva az AI témavezetőhöz.',
      },
      defense: {
        intro: 'A védés előkészítése előadásvázlatot, bizottsági kérdéseket, válaszokat és prezentációs anyagokat készít.',
        inputHelp: 'Illeszd be az absztraktot, zárást, kutatási célokat vagy a védéshez előkészítendő kérdéseket.',
        resultHelp: 'A kimenet védési javaslatot, válaszokat, ajánlásokat és prezentációs szöveget tartalmaz.',
        emptyState: 'Még nincs megadva anyag a védéshez.',
      },
      translation: {
        intro: 'A fordítás akadémiai szöveget készít a kiválasztott célnyelven, megőrizve a jelentést, stílust és terminológiát.',
        inputHelp: 'Illeszd be a lefordítandó szöveget. Válaszd ki a forrásnyelvet, a célnyelvet és a fordítás stílusát.',
        resultHelp: 'A kimenet egy lefordított szöveg, amely tovább szerkeszthető vagy felhasználható a dolgozatban.',
        emptyState: 'Még nincs megadva szöveg fordításhoz.',
      },
      qualityAudit: {
        intro: 'A minőségi audit ellenőrzi a szakmai szintet, stílust, hivatkozásokat, logikát és szövegkoherenciát.',
        inputHelp: 'Illessz be fejezetet, bevezetést, lezárást vagy teljes dolgozatot ellenőrzésre.',
        resultHelp: 'A kimenet gyenge pontokat, ajánlásokat, javítási javaslatokat és rövid minőségi értékelést tartalmaz.',
        emptyState: 'Még nincs szöveg hozzáadva a minőségi audithoz.',
      },
      dataAnalysis: {
        intro: 'Az adatelemzés statisztikai számításokat, táblázatokat, grafikonokat és dolgozatba illő értelmezést készít.',
        inputHelp: 'Tölts fel adatfájlt, vagy írd le, milyen elemzésre van szükséged.',
        resultHelp: 'Az eredmény adatáttekintést, számításokat, értelmezést és dolgozati ajánlásokat tartalmaz.',
        emptyState: 'Még nincsenek adatok hozzáadva az elemzéshez.',
      },
      planning: {
        intro: 'A tervezés reális írási ütemtervet készít a leadási határidő alapján.',
        inputHelp: 'Add meg a határidőt, az aktuális állapotot, a terjedelmet és a hiányzó részeket.',
        resultHelp: 'A kimenet ütemtervet, prioritásokat, mérföldköveket és ellenőrzőlistát tartalmaz.',
        emptyState: 'Még nincsenek megadva tervezési adatok.',
      },
      emails: {
        intro: 'Az e-mail asszisztens udvarias akadémiai üzenetet készít a cél és a választott hangnem alapján.',
        inputHelp: 'Írd le a címzettet, az üzenet célját és a fő pontokat, amelyeket az e-mailnek tartalmaznia kell.',
        resultHelp: 'A kimenet egy kész e-mail, amelyet másolhatsz vagy szerkeszthetsz.',
        emptyState: 'Még nincs megadva e-mail tartalom.',
      },
      originalityCheck: {
        intro: 'Az eredetiség-ellenőrzés tájékoztató jelleggel jelöli a kockázatos vagy túl hasonló részeket.',
        inputHelp: 'Illeszd be a dolgozat szövegét vagy fejezetét, amelyet eredetiség szempontjából ellenőrizni szeretnél.',
        resultHelp: 'A kimenet kockázatos részeket, parafrázis-ajánlásokat és hivatkozásjavítási tippeket tartalmaz.',
        emptyState: 'Még nincs szöveg hozzáadva az eredetiség-ellenőrzéshez.',
      },
      textHumanization: {
        intro: 'A humanizátor természetesebb, gördülékenyebb és akadémiailag megfelelőbb formába írja át a szöveget.',
        inputHelp: 'Illeszd be azt a szöveget, amelyet jelentésváltozás nélkül szeretnél átfogalmazni.',
        resultHelp: 'A kimenet egy természetesebb megfogalmazású és könnyebben olvasható változat.',
        emptyState: 'Még nincs szöveg hozzáadva a humanizáláshoz.',
      },
    },
    resultLabels: {
      generatedOutput: 'Generált kimenet',
      report: 'Jelentés',
      recommendations: 'Ajánlások',
      nextSteps: 'Következő lépések',
      copied: 'Másolva',
      download: 'Letöltés',
      openResult: 'Eredmény megnyitása',
      processing: 'Feldolgozás...',
    },
    qualityAudit: {
      review: 'Ellenőrzés',
      output: 'Kimenet',
      citationStyle: 'Hivatkozási stílus',
      stylistics: 'Stilisztika',
      citations: 'Hivatkozások',
      logic: 'Logika és koherencia',
      fullAudit: 'Teljes audit',
      detailedReport: 'Részletes jelentés',
      shortReport: 'Rövid jelentés',
    },
    emails: {
      emailType: 'E-mail típusa',
      tone: 'Hangnem',
      emailSupervisor: 'E-mail a témavezetőnek',
      consultationRequest: 'Konzultációs kérés',
      apology: 'Bocsánatkérés',
      documentsSubmission: 'Dokumentumok kiegészítése',
      generalAcademicEmail: 'Általános akadémiai e-mail',
      professionalPolite: 'Professzionális és udvarias',
      formal: 'Formális',
      friendly: 'Barátságos',
      brief: 'Rövid',
    },
    planning: {
      todaysDate: 'Mai dátum',
    },
  },
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isValidLanguage(value: unknown): value is AppLanguage {
  return (
    value === 'sk' ||
    value === 'cs' ||
    value === 'en' ||
    value === 'de' ||
    value === 'pl' ||
    value === 'hu'
  );
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeStoredLanguage(value: unknown): AppLanguage | null {
  if (isValidLanguage(value)) return value;

  if (typeof value !== 'string') return null;

  const normalized = normalizeLanguage(value);

  return isValidLanguage(normalized) ? normalized : null;
}

function getLanguageFromPath(): AppLanguage | null {
  if (typeof window === 'undefined') return null;

  const firstSegment = window.location.pathname
    .split('/')
    .filter(Boolean)[0];

  if (isValidLanguage(firstSegment)) return firstSegment;

  return null;
}

function getStoredLanguage(): AppLanguage | null {
  if (typeof window === 'undefined') return null;

  const savedLanguage =
    window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
    window.localStorage.getItem(SYSTEM_LANGUAGE_STORAGE_KEY) ||
    window.localStorage.getItem(WORK_LANGUAGE_STORAGE_KEY);

  return normalizeStoredLanguage(savedLanguage);
}

function getInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'sk';

  const languageFromPath = getLanguageFromPath();

  if (languageFromPath) return languageFromPath;

  const userSelectedLanguage =
    window.localStorage.getItem(LANGUAGE_USER_SELECTED_KEY) === 'true';

  const storedLanguage = getStoredLanguage();

  if (userSelectedLanguage && storedLanguage) return storedLanguage;
  if (storedLanguage) return storedLanguage;

  return 'sk';
}

function updateProfileInterfaceLanguage(
  nextLanguage: AppLanguage,
  updateWorkLanguage = false,
) {
  if (typeof window === 'undefined') return;

  const now = new Date().toISOString();

  const activeProfile = safeJsonParse<StoredProfile>(
    window.localStorage.getItem(ACTIVE_PROFILE_KEY),
  );

  if (activeProfile?.id) {
    const updatedProfile: StoredProfile = {
      ...activeProfile,
      interfaceLanguage: nextLanguage,
      updatedAt: now,
    };

    if (updateWorkLanguage) {
      updatedProfile.workLanguage = nextLanguage;
    }

    window.localStorage.setItem(
      ACTIVE_PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );

    window.localStorage.setItem(
      LEGACY_PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );

    const profilesFull = safeJsonParse<StoredProfile[]>(
      window.localStorage.getItem(PROFILES_FULL_KEY),
    );

    if (Array.isArray(profilesFull)) {
      const updatedProfiles = profilesFull.map((profile) => {
        if (profile.id === updatedProfile.id) {
          return {
            ...profile,
            interfaceLanguage: nextLanguage,
            ...(updateWorkLanguage ? { workLanguage: nextLanguage } : {}),
            updatedAt: now,
          };
        }

        return profile;
      });

      window.localStorage.setItem(
        PROFILES_FULL_KEY,
        JSON.stringify(updatedProfiles),
      );
    }

    return;
  }

  const legacyProfile = safeJsonParse<StoredProfile>(
    window.localStorage.getItem(LEGACY_PROFILE_KEY),
  );

  if (legacyProfile?.id) {
    const updatedProfile: StoredProfile = {
      ...legacyProfile,
      interfaceLanguage: nextLanguage,
      updatedAt: now,
    };

    if (updateWorkLanguage) {
      updatedProfile.workLanguage = nextLanguage;
    }

    window.localStorage.setItem(
      LEGACY_PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );

    window.localStorage.setItem(
      ACTIVE_PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );
  }
}

function ensureNoTranslateMetaTag() {
  if (typeof document === 'undefined') return;

  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="google"][content="notranslate"]',
  );

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'google';
    meta.content = 'notranslate';
    document.head.appendChild(meta);
  }
}

function applyLanguageToDocument(nextLanguage: AppLanguage) {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = nextLanguage;
  document.documentElement.setAttribute('data-language', nextLanguage);
  document.documentElement.setAttribute('data-system-language', nextLanguage);
  document.documentElement.setAttribute('data-work-language', nextLanguage);
  document.documentElement.setAttribute('translate', 'no');
  document.documentElement.classList.add('notranslate');

  if (document.body) {
    document.body.setAttribute('data-language', nextLanguage);
    document.body.setAttribute('data-system-language', nextLanguage);
    document.body.setAttribute('data-work-language', nextLanguage);
    document.body.setAttribute('translate', 'no');
    document.body.classList.add('notranslate');
  }

  ensureNoTranslateMetaTag();
}

function persistLanguage(
  nextLanguage: AppLanguage,
  options?: {
    markAsUserSelected?: boolean;
    updateProfile?: boolean;
    updateWorkLanguage?: boolean;
  },
) {
  if (typeof window === 'undefined') return;

  const markAsUserSelected = options?.markAsUserSelected ?? false;
  const updateProfile = options?.updateProfile ?? true;
  const updateWorkLanguage = options?.updateWorkLanguage ?? false;

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  window.localStorage.setItem(SYSTEM_LANGUAGE_STORAGE_KEY, nextLanguage);

  if (markAsUserSelected || updateWorkLanguage) {
    window.localStorage.setItem(WORK_LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  if (markAsUserSelected) {
    window.localStorage.setItem(LANGUAGE_USER_SELECTED_KEY, 'true');
  }

  if (updateProfile) {
    updateProfileInterfaceLanguage(nextLanguage, updateWorkLanguage);
  }

  applyLanguageToDocument(nextLanguage);
}

function dispatchLanguageChange(nextLanguage: AppLanguage) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<AppLanguage>('zedpera-language-change', {
      detail: nextLanguage,
    }),
  );

  window.dispatchEvent(
    new CustomEvent<{ language: AppLanguage }>('zedpera-language-updated', {
      detail: { language: nextLanguage },
    }),
  );

  window.dispatchEvent(
    new CustomEvent<{ language: AppLanguage }>(
      'zedpera-interface-language-change',
      {
        detail: { language: nextLanguage },
      },
    ),
  );

  window.dispatchEvent(
    new CustomEvent<{ language: AppLanguage }>('zedpera-force-language-refresh', {
      detail: { language: nextLanguage },
    }),
  );
}

function readLanguageFromCustomEvent(event: Event): AppLanguage | null {
  const customEvent = event as CustomEvent<
    AppLanguage | { language?: AppLanguage; nextLanguage?: AppLanguage }
  >;

  const detail = customEvent.detail;

  if (typeof detail === 'string') {
    return normalizeStoredLanguage(detail);
  }

  return normalizeStoredLanguage(detail?.language || detail?.nextLanguage);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('sk');
  const [isReady, setIsReady] = useState(false);
  const [languageVersion, setLanguageVersion] = useState(0);

  const applyLanguage = useCallback(
    (
      nextLanguage: AppLanguage,
      options?: {
        shouldDispatch?: boolean;
        markAsUserSelected?: boolean;
        updateProfile?: boolean;
        updateWorkLanguage?: boolean;
        forceVersionUpdate?: boolean;
      },
    ) => {
      if (!isValidLanguage(nextLanguage)) return;

      const shouldDispatch = options?.shouldDispatch ?? true;
      const markAsUserSelected = options?.markAsUserSelected ?? false;
      const updateProfile = options?.updateProfile ?? true;
      const updateWorkLanguage = options?.updateWorkLanguage ?? false;
      const forceVersionUpdate = options?.forceVersionUpdate ?? true;

      setLanguageState(nextLanguage);

      if (forceVersionUpdate) {
        setLanguageVersion((version) => version + 1);
      }

      persistLanguage(nextLanguage, {
        markAsUserSelected,
        updateProfile,
        updateWorkLanguage,
      });

      if (shouldDispatch) {
        dispatchLanguageChange(nextLanguage);
      }
    },
    [],
  );

  useEffect(() => {
    const initialLanguage = getInitialLanguage();

    setLanguageState(initialLanguage);
    setLanguageVersion((version) => version + 1);

    persistLanguage(initialLanguage, {
      markAsUserSelected: false,
      updateProfile: false,
      updateWorkLanguage: false,
    });

    setIsReady(true);
    dispatchLanguageChange(initialLanguage);
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key !== LANGUAGE_STORAGE_KEY &&
        event.key !== SYSTEM_LANGUAGE_STORAGE_KEY &&
        event.key !== WORK_LANGUAGE_STORAGE_KEY
      ) {
        return;
      }

      const nextLanguage = normalizeStoredLanguage(event.newValue);

      if (!nextLanguage) return;

      applyLanguage(nextLanguage, {
        shouldDispatch: true,
        markAsUserSelected: false,
        updateProfile: false,
        updateWorkLanguage: false,
        forceVersionUpdate: true,
      });
    };

    const handleCustomLanguageChange = (event: Event) => {
      const nextLanguage = readLanguageFromCustomEvent(event);

      if (!nextLanguage) return;

      applyLanguage(nextLanguage, {
        shouldDispatch: false,
        markAsUserSelected: true,
        updateProfile: true,
        updateWorkLanguage: true,
        forceVersionUpdate: true,
      });
    };

    const handleProfileChange = () => {
      const storedLanguage = getStoredLanguage();

      applyLanguage(storedLanguage || 'sk', {
        shouldDispatch: true,
        markAsUserSelected: false,
        updateProfile: false,
        updateWorkLanguage: false,
        forceVersionUpdate: true,
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('zedpera-profile-change', handleProfileChange);

    LANGUAGE_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleCustomLanguageChange);
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('zedpera-profile-change', handleProfileChange);

      LANGUAGE_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleCustomLanguageChange);
      });
    };
  }, [applyLanguage]);

  const setLanguage = useCallback(
    (nextLanguage: AppLanguage) => {
      if (!isValidLanguage(nextLanguage)) return;

      applyLanguage(nextLanguage, {
        shouldDispatch: true,
        markAsUserSelected: true,
        updateProfile: true,
        updateWorkLanguage: true,
        forceVersionUpdate: true,
      });
    },
    [applyLanguage],
  );

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage,
      t: {
        ...getTranslation(language),
        dashboardTools: dashboardToolTranslations[language],
      } as AppTranslation,
      appLanguages: languages,
      isTranslatingInterface: false,
      translationProgress: 100,
      languageVersion,
    };
  }, [language, setLanguage, languageVersion]);

  return (
    <LanguageContext.Provider value={value}>
      {isReady ? children : null}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage musí byť použitý vo vnútri LanguageProvider.');
  }

  return context;
}