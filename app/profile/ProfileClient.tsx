'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Circle,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  MessageCircle,
  Save,
  ShieldCheck,
} from 'lucide-react';

type WorkTypeKey =
  | 'essay'
  | 'seminar'
  | 'semester'
  | 'bachelor'
  | 'diploma'
  | 'rigorous'
  | 'dissertation'
  | 'habilitation'
  | 'soc'
  | 'caseStudy'
  | 'researchPaper'
  | 'article'
  | 'reflection'
  | 'project'
  | 'businessPlan'
  | 'technicalReport'
  | 'laboratoryReport'
  | 'thesisProposal';

type CitationStyleKey =
  | 'iso690'
  | 'iso690_numeric'
  | 'apa7'
  | 'mla9'
  | 'chicago_notes'
  | 'chicago_author_date'
  | 'harvard'
  | 'vancouver'
  | 'ieee'
  | 'acs'
  | 'ama'
  | 'oscola'
  | 'bluebook'
  | 'turabian'
  | 'mhra'
  | 'asa'
  | 'apsa'
  | 'aaa'
  | 'cse_name_year'
  | 'cse_citation_sequence'
  | 'nature'
  | 'elsevier_harvard'
  | 'springer_basic'
  | 'gost'
  | 'din1505'
  | 'abnt'
  | 'custom';

type WorkTemplate = {
  key: WorkTypeKey;
  label: string;
  level: string;
  recommendedLength: string;
  defaultCitationStyle: CitationStyleKey;
  structure: string[];
  requiredSections: string[];
  methodologyHint: string;
  aiInstruction: string;
};

type CitationStyle = {
  key: CitationStyleKey;
  label: string;
  description: string;
  disciplines: string[];
};

type ProfileState = {
  typeKey: WorkTypeKey;
  type: string;
  title: string;
  topic: string;
  field: string;
  level: string;
  goal: string;
  methodology: string;
  researchQuestions: string;
  citation: CitationStyleKey;
  recommendedLength: string;
  structure: string[];
  requiredSections: string[];
  aiInstruction: string;
  updatedAt: string;
};

const WORK_TEMPLATES: Record<WorkTypeKey, WorkTemplate> = {
  essay: {
    key: 'essay',
    label: 'Esej',
    level: 'Stredoškolské / vysokoškolské štúdium',
    recommendedLength: '3 – 8 strán',
    defaultCitationStyle: 'iso690',
    structure: [
      'Názov eseje',
      'Úvod s formuláciou tézy',
      'Vymedzenie problému',
      'Argumentačná časť',
      'Protiargument alebo kritická reflexia',
      'Vlastné stanovisko',
      'Záver',
      'Zoznam použitej literatúry',
    ],
    requiredSections: [
      'Úvod',
      'Téza',
      'Argumenty',
      'Protiargument',
      'Vlastný záver',
      'Zdroje',
    ],
    methodologyHint:
      'Esej nemá byť iba opisná. Musí obsahovať jasnú tézu, argumenty, príklady, kritické porovnanie a vlastný záver.',
    aiInstruction:
      'Vytváraj akademickú esej s jasnou tézou, súvislou argumentáciou, odborným štýlom a bez nadmerného technického členenia.',
  },

  seminar: {
    key: 'seminar',
    label: 'Seminárna práca',
    level: 'Stredoškolské / bakalárske štúdium',
    recommendedLength: '8 – 15 strán',
    defaultCitationStyle: 'iso690',
    structure: [
      'Titulná strana',
      'Obsah',
      'Úvod',
      'Cieľ práce',
      'Teoretická časť',
      'Analytická alebo praktická časť',
      'Záver',
      'Zoznam použitej literatúry',
      'Prílohy',
    ],
    requiredSections: [
      'Úvod',
      'Cieľ práce',
      'Teoretická časť',
      'Záver',
      'Zdroje',
    ],
    methodologyHint:
      'Seminárna práca má preukázať schopnosť pracovať s odbornou literatúrou, správne citovať a vytvoriť vecne usporiadaný text.',
    aiInstruction:
      'Vytváraj odborný text seminárnej práce s jasnou štruktúrou, primeraným rozsahom, citáciami a vecným akademickým štýlom.',
  },

  semester: {
    key: 'semester',
    label: 'Semestrálna práca',
    level: 'Vysokoškolské štúdium',
    recommendedLength: '10 – 20 strán',
    defaultCitationStyle: 'iso690',
    structure: [
      'Titulná strana',
      'Zadanie práce',
      'Obsah',
      'Úvod',
      'Cieľ práce',
      'Teoretické východiská',
      'Riešenie úlohy',
      'Vyhodnotenie',
      'Záver',
      'Literatúra',
      'Prílohy',
    ],
    requiredSections: [
      'Zadanie',
      'Cieľ práce',
      'Riešenie',
      'Vyhodnotenie',
      'Záver',
    ],
    methodologyHint:
      'Semestrálna práca musí ukázať zvládnutie témy v rámci predmetu a aplikáciu poznatkov na konkrétnu úlohu.',
    aiInstruction:
      'Vytváraj štruktúrovanú semestrálnu prácu s dôrazom na riešenie zadania, vecnosť, odbornú presnosť a kontrolovateľné závery.',
  },

  bachelor: {
    key: 'bachelor',
    label: 'Bakalárska práca',
    level: 'Bakalárske štúdium',
    recommendedLength: '30 – 50 strán',
    defaultCitationStyle: 'iso690',
    structure: [
      'Titulná strana',
      'Zadanie práce',
      'Čestné vyhlásenie',
      'Poďakovanie',
      'Abstrakt',
      'Kľúčové slová',
      'Obsah',
      'Zoznam skratiek',
      'Úvod',
      'Cieľ práce',
      'Metodika práce',
      'Teoretická časť',
      'Analytická alebo praktická časť',
      'Diskusia',
      'Záver',
      'Zoznam použitej literatúry',
      'Prílohy',
    ],
    requiredSections: [
      'Abstrakt',
      'Úvod',
      'Cieľ práce',
      'Metodika',
      'Teoretická časť',
      'Praktická časť',
      'Záver',
      'Literatúra',
    ],
    methodologyHint:
      'Bakalárska práca má preukázať orientáciu v odbore, prácu so zdrojmi a schopnosť spracovať konkrétny odborný problém.',
    aiInstruction:
      'Vytváraj akademický text bakalárskej práce s metodikou, odbornou terminológiou, citáciami, praktickou časťou a jasnými závermi.',
  },

  diploma: {
    key: 'diploma',
    label: 'Diplomová práca',
    level: 'Magisterské / inžinierske štúdium',
    recommendedLength: '50 – 80 strán',
    defaultCitationStyle: 'iso690',
    structure: [
      'Titulná strana',
      'Zadanie práce',
      'Čestné vyhlásenie',
      'Poďakovanie',
      'Abstrakt',
      'Abstract',
      'Kľúčové slová',
      'Obsah',
      'Zoznam obrázkov',
      'Zoznam tabuliek',
      'Zoznam skratiek',
      'Úvod',
      'Cieľ práce',
      'Výskumný problém',
      'Metodológia',
      'Teoretické východiská',
      'Analytická časť',
      'Výskumná alebo praktická časť',
      'Diskusia',
      'Odporúčania pre prax',
      'Záver',
      'Zoznam použitej literatúry',
      'Prílohy',
    ],
    requiredSections: [
      'Abstrakt',
      'Úvod',
      'Cieľ práce',
      'Metodológia',
      'Teoretická časť',
      'Výskumná/praktická časť',
      'Diskusia',
      'Záver',
      'Literatúra',
    ],
    methodologyHint:
      'Diplomová práca musí mať hlbšie výskumné alebo aplikačné spracovanie, jasnú metodológiu a vyhodnotenie výsledkov.',
    aiInstruction:
      'Vytváraj odborný text diplomovej práce s výskumným problémom, metodológiou, analytickou časťou, diskusiou a odporúčaniami.',
  },

  rigorous: {
    key: 'rigorous',
    label: 'Rigorózna práca',
    level: 'Rigorózne konanie',
    recommendedLength: '70 – 120 strán',
    defaultCitationStyle: 'iso690',
    structure: [
      'Titulná strana',
      'Vyhlásenie',
      'Abstrakt',
      'Obsah',
      'Úvod',
      'Stav poznania',
      'Cieľ práce',
      'Metodológia',
      'Hlavné kapitoly',
      'Diskusia',
      'Záver',
      'Zoznam literatúry',
      'Prílohy',
    ],
    requiredSections: [
      'Úvod',
      'Stav poznania',
      'Metodológia',
      'Odborná analýza',
      'Záver',
      'Literatúra',
    ],
    methodologyHint:
      'Rigorózna práca musí preukázať vyššiu odbornú samostatnosť a schopnosť hlbšej vedecko-odbornej argumentácie.',
    aiInstruction:
      'Vytváraj rigorózny odborný text s dôrazom na vedeckú argumentáciu, aktuálny stav poznania, metodiku a vlastný prínos.',
  },

  dissertation: {
    key: 'dissertation',
    label: 'Dizertačná práca',
    level: 'Doktorandské štúdium',
    recommendedLength: '100 – 180 strán',
    defaultCitationStyle: 'apa7',
    structure: [
      'Titulná strana',
      'Vyhlásenie',
      'Poďakovanie',
      'Abstrakt',
      'Abstract',
      'Obsah',
      'Zoznam skratiek',
      'Úvod',
      'Výskumný problém',
      'Stav vedeckého poznania',
      'Ciele dizertačnej práce',
      'Výskumné otázky a hypotézy',
      'Metodológia výskumu',
      'Výsledky výskumu',
      'Diskusia',
      'Vedecký prínos',
      'Limity výskumu',
      'Záver',
      'Zoznam literatúry',
      'Publikačná činnosť autora',
      'Prílohy',
    ],
    requiredSections: [
      'Výskumný problém',
      'Stav poznania',
      'Hypotézy/otázky',
      'Metodológia',
      'Výsledky',
      'Diskusia',
      'Vedecký prínos',
      'Záver',
    ],
    methodologyHint:
      'Dizertačná práca musí prinášať nový vedecký poznatok, originálny výskum a jasne formulovaný prínos pre odbor.',
    aiInstruction:
      'Vytváraj vedecký text dizertačnej práce s dôrazom na výskumnú originalitu, metodologickú presnosť, výsledky a vedecký prínos.',
  },

  habilitation: {
    key: 'habilitation',
    label: 'Habilitačná práca',
    level: 'Habilitačné konanie',
    recommendedLength: '120 – 250 strán',
    defaultCitationStyle: 'iso690',
    structure: [
      'Titulná strana',
      'Obsah',
      'Úvod',
      'Vedecký kontext',
      'Autorský prínos',
      'Syntéza výskumných výsledkov',
      'Metodologické východiská',
      'Hlavné kapitoly',
      'Diskusia',
      'Záver',
      'Zoznam literatúry',
      'Prehľad publikačnej činnosti',
    ],
    requiredSections: [
      'Vedecký kontext',
      'Autorský prínos',
      'Syntéza výsledkov',
      'Diskusia',
      'Záver',
    ],
    methodologyHint:
      'Habilitačná práca musí preukázať vedeckú zrelosť, systematický výskum a významný prínos autora.',
    aiInstruction:
      'Vytváraj vysoko odborný vedecký text s dôrazom na syntézu poznania, autorský prínos a akademickú argumentáciu.',
  },

  soc: {
    key: 'soc',
    label: 'SOČ / odborná stredoškolská práca',
    level: 'Stredoškolské štúdium',
    recommendedLength: '15 – 25 strán',
    defaultCitationStyle: 'iso690',
    structure: [
      'Titulná strana',
      'Čestné vyhlásenie',
      'Poďakovanie',
      'Obsah',
      'Úvod',
      'Cieľ práce',
      'Teoretická časť',
      'Praktická časť',
      'Výsledky',
      'Záver',
      'Použitá literatúra',
      'Prílohy',
    ],
    requiredSections: [
      'Úvod',
      'Cieľ',
      'Teoretická časť',
      'Praktická časť',
      'Záver',
      'Literatúra',
    ],
    methodologyHint:
      'SOČ má byť zrozumiteľná, prakticky zameraná a musí ukázať samostatnú prácu študenta.',
    aiInstruction:
      'Vytváraj odbornú, ale zrozumiteľnú prácu vhodnú pre stredoškolskú odbornú činnosť.',
  },

  caseStudy: {
    key: 'caseStudy',
    label: 'Prípadová štúdia',
    level: 'Odborné / vysokoškolské štúdium',
    recommendedLength: '8 – 25 strán',
    defaultCitationStyle: 'apa7',
    structure: [
      'Názov prípadovej štúdie',
      'Úvod',
      'Opis prípadu',
      'Kontext problému',
      'Analýza situácie',
      'Možné riešenia',
      'Vyhodnotenie riešení',
      'Odporúčanie',
      'Záver',
      'Zdroje',
    ],
    requiredSections: [
      'Opis prípadu',
      'Analýza',
      'Riešenia',
      'Odporúčanie',
      'Záver',
    ],
    methodologyHint:
      'Prípadová štúdia musí pracovať s konkrétnym prípadom, analyzovať jeho okolnosti a navrhnúť riešenia.',
    aiInstruction:
      'Vytváraj analytickú prípadovú štúdiu s jasným opisom problému, argumentovaným riešením a odporúčaním.',
  },

  researchPaper: {
    key: 'researchPaper',
    label: 'Výskumná štúdia',
    level: 'Akademické / vedecké štúdium',
    recommendedLength: '15 – 40 strán',
    defaultCitationStyle: 'apa7',
    structure: [
      'Názov',
      'Abstrakt',
      'Kľúčové slová',
      'Úvod',
      'Prehľad literatúry',
      'Metodológia',
      'Výsledky',
      'Diskusia',
      'Záver',
      'Referencie',
    ],
    requiredSections: [
      'Abstrakt',
      'Úvod',
      'Metodológia',
      'Výsledky',
      'Diskusia',
      'Referencie',
    ],
    methodologyHint:
      'Výskumná štúdia musí mať jasne formulovaný výskumný problém, metodiku, výsledky a interpretáciu.',
    aiInstruction:
      'Vytváraj vedeckú štúdiu v štýle IMRaD s dôrazom na presnosť, metodológiu, výsledky a citácie.',
  },

  article: {
    key: 'article',
    label: 'Odborný článok',
    level: 'Odborná / akademická publikácia',
    recommendedLength: '6 – 20 strán',
    defaultCitationStyle: 'apa7',
    structure: [
      'Názov článku',
      'Abstrakt',
      'Kľúčové slová',
      'Úvod',
      'Jadro článku',
      'Diskusia',
      'Záver',
      'Zoznam literatúry',
    ],
    requiredSections: [
      'Abstrakt',
      'Úvod',
      'Jadro článku',
      'Záver',
      'Literatúra',
    ],
    methodologyHint:
      'Odborný článok musí byť vecný, koncentrovaný, argumentačne jasný a publikačne použiteľný.',
    aiInstruction:
      'Vytváraj odborný článok so súvislou argumentáciou, akademickým štýlom, citáciami a jasným záverom.',
  },

  reflection: {
    key: 'reflection',
    label: 'Reflexia',
    level: 'Stredoškolské / vysokoškolské štúdium',
    recommendedLength: '2 – 6 strán',
    defaultCitationStyle: 'iso690',
    structure: [
      'Názov reflexie',
      'Úvod',
      'Opis skúsenosti alebo problému',
      'Osobná analýza',
      'Odborné prepojenie',
      'Poučenie',
      'Záver',
    ],
    requiredSections: [
      'Opis skúsenosti',
      'Vlastná reflexia',
      'Odborné prepojenie',
      'Záver',
    ],
    methodologyHint:
      'Reflexia má obsahovať vlastné premýšľanie, hodnotenie skúsenosti a odborné prepojenie s témou.',
    aiInstruction:
      'Vytváraj reflexívny text s odborným podtónom, ale s primeraným priestorom pre osobné hodnotenie.',
  },

  project: {
    key: 'project',
    label: 'Projektová práca',
    level: 'Školský / odborný projekt',
    recommendedLength: '10 – 40 strán',
    defaultCitationStyle: 'iso690',
    structure: [
      'Titulná strana',
      'Opis projektu',
      'Cieľ projektu',
      'Východiská',
      'Návrh riešenia',
      'Realizácia',
      'Časový harmonogram',
      'Rozpočet',
      'Riziká',
      'Vyhodnotenie',
      'Záver',
      'Zdroje',
    ],
    requiredSections: [
      'Cieľ projektu',
      'Návrh riešenia',
      'Realizácia',
      'Vyhodnotenie',
      'Záver',
    ],
    methodologyHint:
      'Projektová práca musí ukázať cieľ, postup, zdroje, realizáciu a merateľné vyhodnotenie.',
    aiInstruction:
      'Vytváraj projektovú prácu s praktickým riešením, harmonogramom, vyhodnotením a odborným štýlom.',
  },

  businessPlan: {
    key: 'businessPlan',
    label: 'Podnikateľský plán',
    level: 'Odborná / ekonomická práca',
    recommendedLength: '15 – 40 strán',
    defaultCitationStyle: 'harvard',
    structure: [
      'Executive summary',
      'Opis podnikateľského zámeru',
      'Produkt alebo služba',
      'Analýza trhu',
      'Cieľová skupina',
      'Marketingová stratégia',
      'Prevádzkový plán',
      'Finančný plán',
      'Riziká',
      'Záver',
    ],
    requiredSections: [
      'Opis zámeru',
      'Trh',
      'Marketing',
      'Financie',
      'Riziká',
      'Záver',
    ],
    methodologyHint:
      'Podnikateľský plán musí byť praktický, číselne podložený a zameraný na realizovateľnosť.',
    aiInstruction:
      'Vytváraj profesionálny podnikateľský plán s dôrazom na trh, financie, riziká a realizovateľnosť.',
  },

  technicalReport: {
    key: 'technicalReport',
    label: 'Technická správa',
    level: 'Technické / inžinierske štúdium',
    recommendedLength: '10 – 50 strán',
    defaultCitationStyle: 'ieee',
    structure: [
      'Titulná strana',
      'Zadanie',
      'Technický opis',
      'Vstupné podmienky',
      'Návrh riešenia',
      'Výpočty',
      'Materiály',
      'Technologický postup',
      'Bezpečnostné požiadavky',
      'Záver',
      'Prílohy',
    ],
    requiredSections: [
      'Technický opis',
      'Návrh riešenia',
      'Výpočty',
      'Záver',
    ],
    methodologyHint:
      'Technická správa musí byť presná, kontrolovateľná a musí obsahovať technické parametre, normy a výpočty.',
    aiInstruction:
      'Vytváraj technickú správu s vecným opisom, výpočtami, normami, materiálmi a presným technickým jazykom.',
  },

  laboratoryReport: {
    key: 'laboratoryReport',
    label: 'Laboratórny protokol',
    level: 'Stredoškolské / vysokoškolské štúdium',
    recommendedLength: '3 – 12 strán',
    defaultCitationStyle: 'iso690',
    structure: [
      'Názov merania',
      'Cieľ merania',
      'Teoretický základ',
      'Pomôcky a zariadenia',
      'Postup merania',
      'Namerané hodnoty',
      'Výpočty',
      'Vyhodnotenie',
      'Záver',
    ],
    requiredSections: [
      'Cieľ',
      'Postup',
      'Hodnoty',
      'Výpočty',
      'Záver',
    ],
    methodologyHint:
      'Laboratórny protokol musí byť presný, reprodukovateľný a musí obsahovať postup, dáta, výpočty a vyhodnotenie.',
    aiInstruction:
      'Vytváraj laboratórny protokol s dôrazom na meranie, postup, tabuľky, výpočty a odborné vyhodnotenie.',
  },

  thesisProposal: {
    key: 'thesisProposal',
    label: 'Návrh záverečnej práce',
    level: 'Bakalárske / magisterské / doktorandské štúdium',
    recommendedLength: '5 – 15 strán',
    defaultCitationStyle: 'iso690',
    structure: [
      'Pracovný názov',
      'Vymedzenie témy',
      'Výskumný problém',
      'Ciele práce',
      'Výskumné otázky',
      'Metodológia',
      'Predpokladaná štruktúra',
      'Predbežný zoznam literatúry',
      'Harmonogram',
    ],
    requiredSections: [
      'Téma',
      'Cieľ',
      'Výskumný problém',
      'Metodológia',
      'Štruktúra',
      'Literatúra',
    ],
    methodologyHint:
      'Návrh práce musí presne ukázať, čo bude študent skúmať, ako to bude skúmať a aký výsledok očakáva.',
    aiInstruction:
      'Vytváraj návrh záverečnej práce s jasným výskumným problémom, cieľmi, otázkami, metodikou a predbežnou štruktúrou.',
  },
};

const CITATION_STYLES: CitationStyle[] = [
  {
    key: 'iso690',
    label: 'ISO 690 – autor, rok',
    description:
      'Najčastejšia norma v SR a ČR pre školské, seminárne, bakalárske a diplomové práce.',
    disciplines: ['SR/ČR', 'školské práce', 'humanitné vedy'],
  },
  {
    key: 'iso690_numeric',
    label: 'ISO 690 – číselný systém',
    description:
      'Citovanie pomocou číselných odkazov v texte alebo poznámkach.',
    disciplines: ['technika', 'prírodné vedy', 'SR/ČR'],
  },
  {
    key: 'apa7',
    label: 'APA 7',
    description:
      'Medzinárodný štýl pre psychológiu, pedagogiku, sociálne a behaviorálne vedy.',
    disciplines: ['psychológia', 'pedagogika', 'sociológia'],
  },
  {
    key: 'mla9',
    label: 'MLA 9',
    description:
      'Používa sa najmä v literárnej vede, jazykovede a humanitných odboroch.',
    disciplines: ['literatúra', 'jazykoveda', 'humanitné vedy'],
  },
  {
    key: 'chicago_notes',
    label: 'Chicago – poznámky a bibliografia',
    description:
      'Vhodné pre históriu, filozofiu, teológiu a humanitné odbory.',
    disciplines: ['história', 'filozofia', 'teológia'],
  },
  {
    key: 'chicago_author_date',
    label: 'Chicago – autor, dátum',
    description:
      'Alternatíva Chicago štýlu vhodná pre spoločenské a prírodné vedy.',
    disciplines: ['spoločenské vedy', 'prírodné vedy'],
  },
  {
    key: 'harvard',
    label: 'Harvard',
    description:
      'Autor-dátum systém často používaný v ekonomike, manažmente a spoločenských vedách.',
    disciplines: ['ekonómia', 'manažment', 'marketing'],
  },
  {
    key: 'vancouver',
    label: 'Vancouver',
    description:
      'Číselný citačný štýl pre medicínu a biomedicínske odbory.',
    disciplines: ['medicína', 'ošetrovateľstvo', 'biomedicína'],
  },
  {
    key: 'ieee',
    label: 'IEEE',
    description:
      'Technický citačný štýl pre informatiku, elektrotechniku a inžinierstvo.',
    disciplines: ['informatika', 'elektrotechnika', 'technika'],
  },
  {
    key: 'acs',
    label: 'ACS',
    description: 'Citačný štýl Americkej chemickej spoločnosti.',
    disciplines: ['chémia', 'biochémia'],
  },
  {
    key: 'ama',
    label: 'AMA',
    description:
      'Štýl Americkej lekárskej asociácie pre medicínske texty.',
    disciplines: ['medicína', 'zdravotníctvo', 'farmácia'],
  },
  {
    key: 'oscola',
    label: 'OSCOLA',
    description:
      'Právnický citačný štýl používaný najmä vo Veľkej Británii.',
    disciplines: ['právo', 'UK'],
  },
  {
    key: 'bluebook',
    label: 'Bluebook',
    description: 'Americký právnický citačný štýl.',
    disciplines: ['právo USA', 'medzinárodné právo'],
  },
  {
    key: 'turabian',
    label: 'Turabian',
    description: 'Zjednodušená akademická verzia Chicago štýlu.',
    disciplines: ['humanitné vedy', 'história'],
  },
  {
    key: 'mhra',
    label: 'MHRA',
    description: 'Citačný štýl pre moderné humanitné odbory.',
    disciplines: ['literatúra', 'jazykoveda'],
  },
  {
    key: 'asa',
    label: 'ASA',
    description: 'Štýl Americkej sociologickej asociácie.',
    disciplines: ['sociológia'],
  },
  {
    key: 'apsa',
    label: 'APSA',
    description: 'Citačný štýl pre politológiu.',
    disciplines: ['politológia', 'verejná správa'],
  },
  {
    key: 'aaa',
    label: 'AAA',
    description:
      'Citačný štýl Americkej antropologickej asociácie.',
    disciplines: ['antropológia', 'etnológia'],
  },
  {
    key: 'cse_name_year',
    label: 'CSE – meno, rok',
    description: 'Citačný štýl pre biologické a prírodné vedy.',
    disciplines: ['biológia', 'ekológia'],
  },
  {
    key: 'cse_citation_sequence',
    label: 'CSE – číselná sekvencia',
    description: 'Číselná verzia CSE vhodná pre vedecké články.',
    disciplines: ['biológia', 'prírodné vedy'],
  },
  {
    key: 'nature',
    label: 'Nature',
    description: 'Štýl používaný v časopisoch skupiny Nature.',
    disciplines: ['výskum', 'prírodné vedy'],
  },
  {
    key: 'elsevier_harvard',
    label: 'Elsevier Harvard',
    description:
      'Varianta Harvard štýlu používaná v mnohých časopisoch Elsevier.',
    disciplines: ['vedecké články', 'výskum'],
  },
  {
    key: 'springer_basic',
    label: 'Springer Basic',
    description:
      'Základný citačný štýl používaný v publikáciách Springer.',
    disciplines: ['vedecké publikácie'],
  },
  {
    key: 'gost',
    label: 'GOST',
    description: 'Východoeurópska a postsovietska citačná norma.',
    disciplines: ['technické odbory', 'východná Európa'],
  },
  {
    key: 'din1505',
    label: 'DIN 1505',
    description:
      'Nemecká citačná norma používaná v odborných a akademických textoch.',
    disciplines: ['Nemecko', 'technické odbory'],
  },
  {
    key: 'abnt',
    label: 'ABNT',
    description: 'Brazílska akademická citačná norma.',
    disciplines: ['Brazília', 'akademické práce'],
  },
  {
    key: 'custom',
    label: 'Vlastná školská norma',
    description:
      'Použije sa vtedy, keď má škola vlastnú smernicu alebo šablónu.',
    disciplines: ['interné smernice', 'školské normy'],
  },
];

const STEPS = [
  {
    id: 1,
    title: 'Typ práce',
    subtitle: 'Výber šablóny',
    icon: FileText,
  },
  {
    id: 2,
    title: 'Identita práce',
    subtitle: 'Názov, téma, odbor',
    icon: GraduationCap,
  },
  {
    id: 3,
    title: 'Výskumné nastavenie',
    subtitle: 'Cieľ a metodológia',
    icon: LibraryBig,
  },
  {
    id: 4,
    title: 'Norma a štruktúra',
    subtitle: 'Povinné časti',
    icon: ShieldCheck,
  },
  {
    id: 5,
    title: 'Kontrola a uloženie',
    subtitle: 'Finálny profil',
    icon: Save,
  },
];

function normalizeWorkType(value?: string | null): WorkTypeKey {
  if (!value) return 'essay';

  const normalizedValue = value.trim().toLowerCase();

  const found = Object.values(WORK_TEMPLATES).find((template) => {
    return (
      template.key.toLowerCase() === normalizedValue ||
      template.label.toLowerCase() === normalizedValue
    );
  });

  return found?.key ?? 'essay';
}

function createProfileFromTemplate(template: WorkTemplate): ProfileState {
  return {
    typeKey: template.key,
    type: template.label,
    title: '',
    topic: '',
    field: '',
    level: template.level,
    goal: '',
    methodology: '',
    researchQuestions: '',
    citation: template.defaultCitationStyle,
    recommendedLength: template.recommendedLength,
    structure: template.structure,
    requiredSections: template.requiredSections,
    aiInstruction: template.aiInstruction,
    updatedAt: new Date().toISOString(),
  };
}

function getInitialProfile(): ProfileState {
  if (typeof window === 'undefined') {
    return createProfileFromTemplate(WORK_TEMPLATES.essay);
  }

  try {
    const raw = localStorage.getItem('active_profile');

    if (!raw) {
      return createProfileFromTemplate(WORK_TEMPLATES.essay);
    }

    const parsed = JSON.parse(raw) as Partial<ProfileState> & {
      type?: string;
      typeKey?: WorkTypeKey;
    };

    const typeKey = normalizeWorkType(parsed.typeKey || parsed.type);
    const template = WORK_TEMPLATES[typeKey];

    return {
      ...createProfileFromTemplate(template),
      ...parsed,
      typeKey,
      type: template.label,
      level: template.level,
      recommendedLength: template.recommendedLength,
      structure: template.structure,
      requiredSections: template.requiredSections,
      aiInstruction: template.aiInstruction,
      citation: parsed.citation || template.defaultCitationStyle,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return createProfileFromTemplate(WORK_TEMPLATES.essay);
  }
}

export default function ProfileWizard() {
  const router = useRouter();

  const [activeStep, setActiveStep] = useState<number>(1);
  const [profile, setProfile] = useState<ProfileState>(() =>
    getInitialProfile()
  );

  const activeTemplate = WORK_TEMPLATES[profile.typeKey];

  const selectedCitation = useMemo(() => {
    return (
      CITATION_STYLES.find((style) => style.key === profile.citation) ||
      CITATION_STYLES[0]
    );
  }, [profile.citation]);

  useEffect(() => {
    localStorage.setItem('active_profile', JSON.stringify(profile));

    const existingRaw = localStorage.getItem('profiles_full');
    const existingProfiles = existingRaw ? JSON.parse(existingRaw) : [];

    if (Array.isArray(existingProfiles)) {
      const nextProfiles = [
        {
          ...profile,
          id: 'active-profile',
          savedAt: profile.updatedAt,
        },
        ...existingProfiles.filter(
          (item: { id?: string }) => item?.id !== 'active-profile'
        ),
      ];

      localStorage.setItem('profiles_full', JSON.stringify(nextProfiles));
    }
  }, [profile]);

  const updateProfile = <K extends keyof ProfileState>(
    key: K,
    value: ProfileState[K]
  ) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSelectWorkType = (typeKey: WorkTypeKey) => {
    const template = WORK_TEMPLATES[typeKey];

    setProfile((prev) => ({
      ...prev,
      typeKey: template.key,
      type: template.label,
      level: template.level,
      citation: template.defaultCitationStyle,
      recommendedLength: template.recommendedLength,
      structure: template.structure,
      requiredSections: template.requiredSections,
      aiInstruction: template.aiInstruction,
      updatedAt: new Date().toISOString(),
    }));

    setActiveStep(2);
  };

  const handleSave = () => {
    const finalProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('active_profile', JSON.stringify(finalProfile));

    const existingRaw = localStorage.getItem('profiles_full');
    const existingProfiles = existingRaw ? JSON.parse(existingRaw) : [];

    const nextProfiles = Array.isArray(existingProfiles)
      ? [
          {
            ...finalProfile,
            id: 'active-profile',
            savedAt: finalProfile.updatedAt,
          },
          ...existingProfiles.filter(
            (item: { id?: string }) => item?.id !== 'active-profile'
          ),
        ]
      : [
          {
            ...finalProfile,
            id: 'active-profile',
            savedAt: finalProfile.updatedAt,
          },
        ];

    localStorage.setItem('profiles_full', JSON.stringify(nextProfiles));

    alert('Profil práce bol uložený.');
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('sub_active');

      await fetch('/api/auth/logout', {
        method: 'POST',
      }).catch(() => null);

      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1540px] space-y-8">
        <section className="rounded-[1.5rem] border border-white/10 bg-[#0f1220] p-4 shadow-xl shadow-black/20 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-300">
                Konto aktívne
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Sprievodca profilom práce
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-5 py-3 text-sm font-black text-blue-100 transition hover:border-blue-300 hover:bg-blue-500/20"
              >
                <LayoutDashboard size={18} />
                Menu
              </button>

              <button
                type="button"
                onClick={() => router.push('/chat')}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-5 py-3 text-sm font-black text-blue-100 transition hover:border-blue-300 hover:bg-blue-500/20"
              >
                <MessageCircle size={18} />
                AI chat
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-400"
              >
                <LogOut size={18} />
                Odhlásiť sa
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#0f1220] p-5 shadow-2xl shadow-black/30 sm:p-6">
          <div className="grid gap-4 md:grid-cols-5">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              const isDone = activeStep > step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={[
                    'group rounded-xl border p-5 text-left transition duration-200',
                    isActive
                      ? 'border-blue-400 bg-blue-500/15 text-white shadow-xl shadow-blue-950/30'
                      : isDone
                      ? 'border-blue-400/40 bg-blue-500/10 text-white hover:bg-blue-500/15'
                      : 'border-white/10 bg-[#0b1020] text-slate-300 hover:border-blue-300/50 hover:bg-blue-500/[0.06]',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={[
                        'flex h-11 w-11 items-center justify-center rounded-xl',
                        isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#020617] text-white',
                      ].join(' ')}
                    >
                      {isDone ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                    </div>

                    <span
                      className={[
                        'text-sm font-black',
                        isActive ? 'text-blue-200' : 'text-slate-400',
                      ].join(' ')}
                    >
                      {String(step.id).padStart(2, '0')}
                    </span>
                  </div>

                  <h2 className="mt-5 text-lg font-black">{step.title}</h2>
                  <p
                    className={[
                      'mt-2 text-sm',
                      isActive ? 'text-blue-100' : 'text-slate-400',
                    ].join(' ')}
                  >
                    {step.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {activeStep === 1 && (
          <section className="rounded-[2rem] border border-white/10 bg-[#0f1220] p-6 shadow-2xl shadow-black/30">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-300">
                Krok 1
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Vyberte typ práce
              </h1>
              <p className="mt-3 max-w-4xl text-slate-300">
                Každý typ práce má vlastnú normu, rozsah, štruktúru, povinné
                časti, citačný štýl a AI inštrukcie. Výber je klikateľný, nie
                rolovací.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.values(WORK_TEMPLATES).map((template) => {
                const active = profile.typeKey === template.key;

                return (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => handleSelectWorkType(template.key)}
                    className={[
                      'rounded-xl border p-5 text-left transition duration-200',
                      active
                        ? 'border-blue-400 bg-blue-500/15 shadow-xl shadow-blue-950/40'
                        : 'border-white/10 bg-white/[0.04] hover:border-blue-300/60 hover:bg-blue-500/[0.08]',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#020617]">
                        {active ? (
                          <CheckCircle2 className="text-blue-300" size={20} />
                        ) : (
                          <Circle className="text-slate-400" size={20} />
                        )}
                      </div>

                      <span className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-100">
                        {template.recommendedLength}
                      </span>
                    </div>

                    <h3 className="mt-5 text-lg font-black text-white">
                      {template.label}
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                      {template.level}
                    </p>

                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-300">
                      {template.methodologyHint}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {activeStep === 2 && (
          <section className="rounded-[2rem] border border-white/10 bg-[#0f1220] p-6 shadow-2xl shadow-black/30">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-300">
                Krok 2
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Identita práce
              </h1>
              <p className="mt-3 text-slate-300">
                Aktuálne vybraný typ práce:{' '}
                <strong className="text-white">{activeTemplate.label}</strong>
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Field
                label="Názov práce"
                value={profile.title}
                onChange={(value) => updateProfile('title', value)}
                placeholder="Zadajte pracovný alebo finálny názov práce"
              />

              <Field
                label="Odbor / predmet"
                value={profile.field}
                onChange={(value) => updateProfile('field', value)}
                placeholder="Napr. filozofia, manažment, informatika..."
              />

              <div className="lg:col-span-2">
                <TextArea
                  label="Téma práce"
                  value={profile.topic}
                  onChange={(value) => updateProfile('topic', value)}
                  placeholder="Opíšte tému, ktorú má práca riešiť"
                />
              </div>
            </div>

            <WizardActions
              onBack={() => setActiveStep(1)}
              onNext={() => setActiveStep(3)}
            />
          </section>
        )}

        {activeStep === 3 && (
          <section className="rounded-[2rem] border border-white/10 bg-[#0f1220] p-6 shadow-2xl shadow-black/30">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-300">
                Krok 3
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Výskumné nastavenie
              </h1>
              <p className="mt-3 max-w-4xl text-slate-300">
                Tu sa nastaví cieľ práce, metodológia a výskumné otázky. Pri
                eseji sa použije argumentačné nastavenie, pri záverečných prácach
                metodologické a výskumné nastavenie.
              </p>
            </div>

            <div className="grid gap-5">
              <TextArea
                label="Cieľ práce"
                value={profile.goal}
                onChange={(value) => updateProfile('goal', value)}
                placeholder="Zadajte hlavný cieľ práce"
              />

              <TextArea
                label="Metodológia / spôsob spracovania"
                value={profile.methodology}
                onChange={(value) => updateProfile('methodology', value)}
                placeholder="Napr. analýza literatúry, komparácia, dotazník, rozhovor, prípadová štúdia..."
              />

              <TextArea
                label="Výskumné otázky / hypotézy / argumentačné otázky"
                value={profile.researchQuestions}
                onChange={(value) => updateProfile('researchQuestions', value)}
                placeholder="Zadajte otázky, hypotézy alebo hlavné argumentačné línie"
              />
            </div>

            <div className="mt-6 rounded-xl border border-blue-400/30 bg-blue-500/10 p-5">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                Metodické odporúčanie podľa typu práce
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-200">
                {activeTemplate.methodologyHint}
              </p>
            </div>

            <WizardActions
              onBack={() => setActiveStep(2)}
              onNext={() => setActiveStep(4)}
            />
          </section>
        )}

        {activeStep === 4 && (
          <section className="rounded-[2rem] border border-white/10 bg-[#0f1220] p-6 shadow-2xl shadow-black/30">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-300">
                Krok 4
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Norma, štruktúra a povinné časti
              </h1>
              <p className="mt-3 text-slate-300">
                Šablóna načítaná podľa zvoleného typu práce:{' '}
                <strong className="text-white">{activeTemplate.label}</strong>
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard label="Typ práce" value={activeTemplate.label} />
              <InfoCard label="Stupeň / úroveň" value={activeTemplate.level} />
              <InfoCard
                label="Odporúčaný rozsah"
                value={activeTemplate.recommendedLength}
              />
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                Štruktúra práce
              </div>

              <ol className="mt-5 grid gap-3 md:grid-cols-2">
                {activeTemplate.structure.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200"
                  >
                    <span className="font-black text-blue-300">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                Povinné časti
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {activeTemplate.requiredSections.map((section) => (
                  <span
                    key={section}
                    className="rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-100"
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-4">
                <h2 className="text-2xl font-black text-white">
                  Citačná forma
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Citačné štýly sú klikateľné. Predvolený štýl sa nastaví podľa
                  typu práce, ale používateľ ho môže zmeniť.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CITATION_STYLES.map((style) => {
                  const active = profile.citation === style.key;

                  return (
                    <button
                      key={style.key}
                      type="button"
                      onClick={() => updateProfile('citation', style.key)}
                      className={[
                        'rounded-xl border p-4 text-left transition duration-200',
                        active
                          ? 'border-blue-400 bg-blue-500/15 shadow-lg shadow-blue-950/30'
                          : 'border-white/10 bg-white/[0.04] hover:border-blue-300/60 hover:bg-blue-500/[0.08]',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-black text-white">
                          {style.label}
                        </div>

                        {active && (
                          <CheckCircle2
                            size={18}
                            className="shrink-0 text-blue-300"
                          />
                        )}
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-slate-300">
                        {style.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {style.disciplines.slice(0, 3).map((item) => (
                          <span
                            key={item}
                            className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-100"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <WizardActions
              onBack={() => setActiveStep(3)}
              onNext={() => setActiveStep(5)}
            />
          </section>
        )}

        {activeStep === 5 && (
          <section className="rounded-[2rem] border border-white/10 bg-[#0f1220] p-6 shadow-2xl shadow-black/30">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-300">
                Krok 5
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Kontrola a uloženie
              </h1>
              <p className="mt-3 text-slate-300">
                Skontrolujte profil práce. Po uložení sa bude používať v AI
                chate, audite kvality, obhajobe, zdrojoch a ďalších moduloch.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <InfoCard label="Typ práce" value={profile.type} />
              <InfoCard label="Úroveň" value={profile.level} />
              <InfoCard
                label="Odporúčaný rozsah"
                value={profile.recommendedLength}
              />
              <InfoCard label="Citačná forma" value={selectedCitation.label} />
              <InfoCard
                label="Názov práce"
                value={profile.title || 'Nevyplnené'}
              />
              <InfoCard label="Odbor" value={profile.field || 'Nevyplnené'} />
            </div>

            <div className="mt-6 grid gap-4">
              <PreviewBlock label="Téma práce" value={profile.topic} />
              <PreviewBlock label="Cieľ práce" value={profile.goal} />
              <PreviewBlock label="Metodológia" value={profile.methodology} />
              <PreviewBlock
                label="Výskumné otázky / hypotézy"
                value={profile.researchQuestions}
              />
              <PreviewBlock
                label="AI inštrukcia podľa typu práce"
                value={profile.aiInstruction}
              />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setActiveStep(4)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-black text-white hover:bg-white/[0.08]"
              >
                Späť
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-black text-white hover:bg-blue-400"
              >
                Uložiť profil práce
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.25em] text-blue-200">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-300"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.25em] text-blue-200">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500 focus:border-blue-300"
      />
    </label>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-5">
      <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
        {label}
      </div>
      <div className="mt-3 text-lg font-black text-white">{value}</div>
    </div>
  );
}

function PreviewBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-5">
      <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
        {label}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
        {value || 'Nevyplnené'}
      </p>
    </div>
  );
}

function WizardActions({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
      <button
        type="button"
        onClick={onBack}
        className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-black text-white hover:bg-white/[0.08]"
      >
        Späť
      </button>

      <button
        type="button"
        onClick={onNext}
        className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-black text-white hover:bg-blue-400"
      >
        Pokračovať
      </button>
    </div>
  );
}