#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * ZEDPERA — GENERÁTOR SAMOSTATNÝCH PREZENTAČNÝCH VIDEO MANUÁLOV
 * Verzia: PROFESSIONAL WALKTHROUGH / BEZ AI SPRIEVODCU / 6 JAZYKOV
 *
 * Hlavná zmena:
 * - vymazaný text aj grafika „AI sprievodca / AI guide / panáčik“,
 * - 01_hlavne_menu prechádza profesionálne každú položku menu a hlavné časti obrazovky,
 * - každá položka je zvýraznená, označená šípkou a vysvetlená v samostatnom kroku,
 * - video vyzerá ako postupné prechádzanie funkciami systému,
 * - bez hovoreného slova, bez MP3, bez kurzora,
 * - generuje MP4 + VTT + SRT pre 6 jazykov.
 *
 * Spustenie iba hlavného menu:
 * node scripts/_create-localized-video-manuals_SEPARATE_6LANG_MAIN_MENU.cjs --force --manual=01_hlavne_menu --langs=sk,cs,en,de,pl,hu --seconds=7
 *
 * Spustenie všetkých manuálov:
 * node scripts/_create-localized-video-manuals_SEPARATE_6LANG_MAIN_MENU.cjs --force --langs=sk,cs,en,de,pl,hu --seconds=7
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const videoRoot = path.join(repoRoot, 'public', 'video-manualy');

const LANGS = ['sk', 'cs', 'en', 'de', 'pl', 'hu'];

const W = 1280;
const H = 720;
const FPS = 24;

const DEFAULT_SECONDS = 7;
const DEFAULT_TIMEOUT = 180000;

const FONT_REGULAR = 'C:/Windows/Fonts/arial.ttf';
const FONT_BOLD = 'C:/Windows/Fonts/arialbd.ttf';

const ACCENT = {
  sk: '0x8b5cf6',
  cs: '0x3b82f6',
  en: '0x14b8a6',
  de: '0xef4444',
  pl: '0xf59e0b',
  hu: '0x22c55e',
};

const SOFT = {
  sk: '0xc4b5fd',
  cs: '0xbfdbfe',
  en: '0x99f6e4',
  de: '0xfecaca',
  pl: '0xfde68a',
  hu: '0xbbf7d0',
};

const UI = {
  sk: {
    language: 'Slovenčina',
    guide: 'Profesionálny prezentačný manuál',
    click: 'AKTÍVNA ČASŤ',
    step: 'Krok',
    of: 'z',
    system: 'Prechod jednotlivými funkciami systému',
    finalTitle: 'Hlavné menu je vysvetlené',
    finalText: 'Teraz poznáte rozloženie systému a viete, kde sa nachádza každá hlavná funkcia.',
    footer: 'www.zedpera.com · profesionálny video manuál',
  },
  cs: {
    language: 'Čeština',
    guide: 'Profesionální prezentační návod',
    click: 'AKTIVNÍ ČÁST',
    step: 'Krok',
    of: 'z',
    system: 'Průchod jednotlivými funkcemi systému',
    finalTitle: 'Hlavní menu je vysvětleno',
    finalText: 'Nyní znáte rozložení systému a víte, kde se nachází každá hlavní funkce.',
    footer: 'www.zedpera.com · profesionální video návod',
  },
  en: {
    language: 'English',
    guide: 'Professional presentation guide',
    click: 'ACTIVE AREA',
    step: 'Step',
    of: 'of',
    system: 'Walkthrough of individual system functions',
    finalTitle: 'Main menu explained',
    finalText: 'You now understand the system layout and know where each main function is located.',
    footer: 'www.zedpera.com · professional video manual',
  },
  de: {
    language: 'Deutsch',
    guide: 'Professionelle Präsentationsanleitung',
    click: 'AKTIVER BEREICH',
    step: 'Schritt',
    of: 'von',
    system: 'Durchgang durch einzelne Systemfunktionen',
    finalTitle: 'Hauptmenü erklärt',
    finalText: 'Sie kennen nun den Systemaufbau und wissen, wo jede Hauptfunktion zu finden ist.',
    footer: 'www.zedpera.com · professionelles Video-Handbuch',
  },
  pl: {
    language: 'Polski',
    guide: 'Profesjonalna instrukcja prezentacyjna',
    click: 'AKTYWNA CZĘŚĆ',
    step: 'Krok',
    of: 'z',
    system: 'Przejście przez poszczególne funkcje systemu',
    finalTitle: 'Menu główne wyjaśnione',
    finalText: 'Znasz już układ systemu i wiesz, gdzie znajduje się każda główna funkcja.',
    footer: 'www.zedpera.com · profesjonalna instrukcja wideo',
  },
  hu: {
    language: 'Magyar',
    guide: 'Professzionális prezentációs útmutató',
    click: 'AKTÍV TERÜLET',
    step: 'Lépés',
    of: '/',
    system: 'A rendszerfunkciók áttekintése',
    finalTitle: 'A főmenü bemutatva',
    finalText: 'Most már ismeri a rendszer felépítését és a fő funkciók helyét.',
    footer: 'www.zedpera.com · professzionális videó útmutató',
  },
};

const TITLES = {
  '01_hlavne_menu': {
    sk: 'Hlavné menu',
    cs: 'Hlavní menu',
    en: 'Main Menu',
    de: 'Hauptmenü',
    pl: 'Menu główne',
    hu: 'Főmenü',
  },
  '02_profil': {
    sk: 'Profil používateľa',
    cs: 'Profil uživatele',
    en: 'User Profile',
    de: 'Benutzerprofil',
    pl: 'Profil użytkownika',
    hu: 'Felhasználói profil',
  },
  '03_ai_chat': {
    sk: 'AI Chat',
    cs: 'AI Chat',
    en: 'AI Chat',
    de: 'AI Chat',
    pl: 'AI Chat',
    hu: 'AI Chat',
  },
  '04_moje_prace': {
    sk: 'Moje práce',
    cs: 'Moje práce',
    en: 'My Works',
    de: 'Meine Arbeiten',
    pl: 'Moje prace',
    hu: 'Munkáim',
  },
  '05_nova_praca': {
    sk: 'Nová práca',
    cs: 'Nová práce',
    en: 'New Work',
    de: 'Neue Arbeit',
    pl: 'Nowa praca',
    hu: 'Új munka',
  },
  '06_ai_veduci': {
    sk: 'AI školiteľ',
    cs: 'AI školitel',
    en: 'AI Supervisor',
    de: 'KI-Betreuer',
    pl: 'Opiekun AI',
    hu: 'AI témavezető',
  },
  '07_audit_kvality': {
    sk: 'Audit kvality',
    cs: 'Audit kvality',
    en: 'Quality Audit',
    de: 'Qualitätsaudit',
    pl: 'Audyt jakości',
    hu: 'Minőségi audit',
  },
  '08_obhajoba': {
    sk: 'Obhajoba',
    cs: 'Obhajoba',
    en: 'Defense',
    de: 'Verteidigung',
    pl: 'Obrona',
    hu: 'Védés',
  },
  '09_preklad': {
    sk: 'Preklad',
    cs: 'Překlad',
    en: 'Translation',
    de: 'Übersetzung',
    pl: 'Tłumaczenie',
    hu: 'Fordítás',
  },
  '10_analyza_dat': {
    sk: 'Analýza dát',
    cs: 'Analýza dat',
    en: 'Data Analysis',
    de: 'Datenanalyse',
    pl: 'Analiza danych',
    hu: 'Adatelemzés',
  },
  '11_planovanie': {
    sk: 'Plánovanie',
    cs: 'Plánování',
    en: 'Planning',
    de: 'Planung',
    pl: 'Planowanie',
    hu: 'Tervezés',
  },
  '12_emaily': {
    sk: 'Emaily',
    cs: 'E-maily',
    en: 'Emails',
    de: 'E-Mails',
    pl: 'E-maile',
    hu: 'E-mailek',
  },
  '13_originalita_prace': {
    sk: 'Originalita práce',
    cs: 'Originalita práce',
    en: 'Originality Check',
    de: 'Originalitätsprüfung',
    pl: 'Sprawdzenie oryginalności',
    hu: 'Eredetiség ellenőrzés',
  },
  '14_humanizacia_textu': {
    sk: 'Humanizácia textu',
    cs: 'Humanizace textu',
    en: 'Text Humanization',
    de: 'Texthumanisierung',
    pl: 'Humanizacja tekstu',
    hu: 'Szöveg humanizálása',
  },
  '15_zdroje_citacie': {
    sk: 'Zdroje a citácie',
    cs: 'Zdroje a citace',
    en: 'Resources & Citations',
    de: 'Quellen & Zitate',
    pl: 'Źródła i cytowania',
    hu: 'Források és hivatkozások',
  },
  '16_balicky': {
    sk: 'Balíčky',
    cs: 'Balíčky',
    en: 'Packages',
    de: 'Pakete',
    pl: 'Pakiety',
    hu: 'Csomagok',
  },
  '17_historia_chatu': {
    sk: 'História chatu',
    cs: 'Historie chatu',
    en: 'Chat History',
    de: 'Chatverlauf',
    pl: 'Historia czatu',
    hu: 'Csevegési előzmények',
  },
  '18_video_navod': {
    sk: 'Video návod',
    cs: 'Video návod',
    en: 'Video Tutorial',
    de: 'Videoanleitung',
    pl: 'Instrukcja wideo',
    hu: 'Videó útmutató',
  },
  '19_vzhlad_aplikacie': {
    sk: 'Vzhľad aplikácie',
    cs: 'Vzhled aplikace',
    en: 'Application Appearance',
    de: 'Erscheinungsbild',
    pl: 'Wygląd aplikacji',
    hu: 'Alkalmazás megjelenése',
  },
  '20_odhlasenie': {
    sk: 'Odhlásenie',
    cs: 'Odhlášení',
    en: 'Log Out',
    de: 'Abmelden',
    pl: 'Wylogowanie',
    hu: 'Kijelentkezés',
  },
};

const MENU_ITEMS = {
  sk: [
    ['Menu', 'Prehľad celej aplikácie'],
    ['Profil', 'Účet, plán a služba'],
    ['AI Chat', 'Písanie a úprava textu'],
    ['Moje práce', 'Rozpracované práce'],
    ['Zdroje', 'Literatúra a citácie'],
    ['Balíčky', 'Predplatné a doplnky'],
    ['História chatu', 'Uložené konverzácie'],
    ['Video návod', 'Používateľský manuál'],
    ['Odhlásenie', 'Bezpečné ukončenie'],
  ],
  cs: [
    ['Menu', 'Přehled celé aplikace'],
    ['Profil', 'Účet, plán a služba'],
    ['AI Chat', 'Psaní a úprava textu'],
    ['Moje práce', 'Rozpracované práce'],
    ['Zdroje', 'Literatura a citace'],
    ['Balíčky', 'Předplatné a doplňky'],
    ['Historie chatu', 'Uložené konverzace'],
    ['Video návod', 'Uživatelský návod'],
    ['Odhlášení', 'Bezpečné ukončení'],
  ],
  en: [
    ['Menu', 'Application overview'],
    ['Profile', 'Account, plan and service'],
    ['AI Chat', 'Text writing and editing'],
    ['My Works', 'Works in progress'],
    ['Resources', 'Literature and citations'],
    ['Packages', 'Subscriptions and add-ons'],
    ['Chat History', 'Saved conversations'],
    ['Video Tutorial', 'Usage guide'],
    ['Log Out', 'Safe exit'],
  ],
  de: [
    ['Menü', 'Anwendungsübersicht'],
    ['Profil', 'Konto, Plan und Service'],
    ['AI Chat', 'Text schreiben und bearbeiten'],
    ['Meine Arbeiten', 'Laufende Arbeiten'],
    ['Ressourcen', 'Literatur und Zitate'],
    ['Pakete', 'Abos und Add-ons'],
    ['Chatverlauf', 'Gespeicherte Gespräche'],
    ['Videoanleitung', 'Benutzeranleitung'],
    ['Abmelden', 'Sicherer Ausstieg'],
  ],
  pl: [
    ['Menu', 'Przegląd aplikacji'],
    ['Profil', 'Konto, plan i usługa'],
    ['AI Chat', 'Pisanie i edycja tekstu'],
    ['Moje prace', 'Prace w toku'],
    ['Zasoby', 'Literatura i cytowania'],
    ['Pakiety', 'Subskrypcje i dodatki'],
    ['Historia czatu', 'Zapisane rozmowy'],
    ['Instrukcja wideo', 'Przewodnik użycia'],
    ['Wylogowanie', 'Bezpieczne wyjście'],
  ],
  hu: [
    ['Menü', 'Alkalmazás áttekintése'],
    ['Profil', 'Fiók, csomag és szolgáltatás'],
    ['AI Chat', 'Szövegírás és szerkesztés'],
    ['Munkáim', 'Folyamatban lévő munkák'],
    ['Források', 'Irodalom és hivatkozások'],
    ['Csomagok', 'Előfizetések és kiegészítők'],
    ['Csevegési előzmények', 'Mentett beszélgetések'],
    ['Videó útmutató', 'Használati útmutató'],
    ['Kijelentkezés', 'Biztonságos kilépés'],
  ],
};

const MODULE_ITEMS = {
  sk: ['AI školiteľ', 'Analýza dát', 'Audit kvality', 'Plánovanie', 'Obhajoba', 'Emaily', 'Preklad', 'Humanizácia textu'],
  cs: ['AI školitel', 'Analýza dat', 'Audit kvality', 'Plánování', 'Obhajoba', 'E-maily', 'Překlad', 'Humanizace textu'],
  en: ['AI Supervisor', 'Data Analysis', 'Quality Audit', 'Planning', 'Defense', 'Emails', 'Translation', 'Text Humanization'],
  de: ['KI-Betreuer', 'Datenanalyse', 'Qualitätsaudit', 'Planung', 'Verteidigung', 'E-Mails', 'Übersetzung', 'Texthumanisierung'],
  pl: ['Opiekun AI', 'Analiza danych', 'Audyt jakości', 'Planowanie', 'Obrona', 'E-maile', 'Tłumaczenie', 'Humanizacja tekstu'],
  hu: ['AI témavezető', 'Adatelemzés', 'Minőségi audit', 'Tervezés', 'Védés', 'E-mailek', 'Fordítás', 'Szöveg humanizálása'],
};

const FIRST_STEPS = {
  sk: [
    'Položka Menu je hlavný prehľad celej aplikácie a vstup do všetkých sekcií systému.',
    'Profil obsahuje údaje účtu, plán, službu a základné používateľské nastavenia.',
    'AI Chat slúži na písanie, úpravu, vysvetľovanie a generovanie odborného textu.',
    'Moje práce otvorí rozpracované akademické práce, uložené projekty a pracovné profily.',
    'Zdroje slúžia na literatúru, citácie a správu odborných podkladov k práci.',
    'Balíčky zobrazujú predplatné, doplnky a limity dostupných funkcií.',
    'História chatu uchováva uložené konverzácie, výstupy a predchádzajúce odpovede.',
    'Video návod otvorí používateľské manuály a Log Out bezpečne ukončí prácu.',
    'V hornej strednej časti sa nachádzajú AI moduly: školiteľ, analýza dát, audit, plánovanie, obhajoba, emaily, preklad a humanizácia.',
    'V pracovnej časti sa nachádzajú prílohy, veľké textové pole a akčné tlačidlá Dictate, Canvas a Clear.',
  ],
  cs: [
    'Položka Menu je hlavní přehled celé aplikace a vstup do všech sekcí systému.',
    'Profil obsahuje údaje účtu, plán, službu a základní uživatelská nastavení.',
    'AI Chat slouží k psaní, úpravě, vysvětlování a generování odborného textu.',
    'Moje práce otevře rozpracované akademické práce, uložené projekty a pracovní profily.',
    'Zdroje slouží pro literaturu, citace a správu odborných podkladů.',
    'Balíčky zobrazují předplatné, doplňky a limity dostupných funkcí.',
    'Historie chatu uchovává uložené konverzace, výstupy a předchozí odpovědi.',
    'Video návod otevře uživatelské návody a Odhlášení bezpečně ukončí práci.',
    'V horní střední části jsou AI moduly: školitel, analýza dat, audit, plánování, obhajoba, e-maily, překlad a humanizace.',
    'V pracovní části jsou přílohy, velké textové pole a akční tlačítka Dictate, Canvas a Clear.',
  ],
  en: [
    'The Menu item is the main overview of the application and entry point to all system sections.',
    'Profile contains account details, plan, service and basic user settings.',
    'AI Chat is used for writing, editing, explaining and generating academic text.',
    'My Works opens academic works in progress, saved projects and work profiles.',
    'Resources are used for literature, citations and managing academic source materials.',
    'Packages show subscription, add-ons and limits of available features.',
    'Chat History stores saved conversations, outputs and previous answers.',
    'Video Tutorial opens user manuals and Log Out safely ends the session.',
    'The upper center contains AI modules: supervisor, data analysis, audit, planning, defense, emails, translation and humanization.',
    'The work area contains attachments, a large text field and action buttons Dictate, Canvas and Clear.',
  ],
  de: [
    'Der Menüpunkt ist die Hauptübersicht der Anwendung und Einstieg in alle Systembereiche.',
    'Profil enthält Kontodaten, Plan, Service und grundlegende Benutzereinstellungen.',
    'AI Chat dient zum Schreiben, Bearbeiten, Erklären und Generieren akademischer Texte.',
    'Meine Arbeiten öffnet laufende akademische Arbeiten, gespeicherte Projekte und Arbeitsprofile.',
    'Ressourcen dienen zur Literatur, Zitaten und Verwaltung fachlicher Grundlagen.',
    'Pakete zeigen Abonnement, Add-ons und Grenzen verfügbarer Funktionen.',
    'Chatverlauf speichert Gespräche, Ausgaben und frühere Antworten.',
    'Videoanleitung öffnet Benutzerhandbücher und Abmelden beendet die Sitzung sicher.',
    'Oben in der Mitte befinden sich KI-Module: Betreuer, Datenanalyse, Audit, Planung, Verteidigung, E-Mails, Übersetzung und Humanisierung.',
    'Der Arbeitsbereich enthält Anhänge, ein großes Textfeld und Aktionsschaltflächen Dictate, Canvas und Clear.',
  ],
  pl: [
    'Pozycja Menu jest głównym przeglądem aplikacji i wejściem do wszystkich sekcji systemu.',
    'Profil zawiera dane konta, plan, usługę i podstawowe ustawienia użytkownika.',
    'AI Chat służy do pisania, edycji, wyjaśniania i generowania tekstu akademickiego.',
    'Moje prace otwierają prace w toku, zapisane projekty i profile pracy.',
    'Zasoby służą do literatury, cytowań i zarządzania materiałami naukowymi.',
    'Pakiety pokazują subskrypcję, dodatki i limity dostępnych funkcji.',
    'Historia czatu przechowuje zapisane rozmowy, wyniki i wcześniejsze odpowiedzi.',
    'Instrukcja wideo otwiera podręczniki, a Wylogowanie bezpiecznie kończy pracę.',
    'W górnej środkowej części są moduły AI: opiekun, analiza danych, audyt, planowanie, obrona, e-maile, tłumaczenie i humanizacja.',
    'Obszar pracy zawiera załączniki, duże pole tekstowe i przyciski Dictate, Canvas oraz Clear.',
  ],
  hu: [
    'A Menü elem az alkalmazás fő áttekintése és belépési pont minden szekcióhoz.',
    'A Profil fiókadatokat, csomagot, szolgáltatást és alapbeállításokat tartalmaz.',
    'Az AI Chat akadémiai szöveg írására, szerkesztésére, magyarázatára és generálására szolgál.',
    'A Munkáim megnyitja a folyamatban lévő munkákat, mentett projekteket és munkaprofilokat.',
    'A Források irodalom, idézetek és szakmai anyagok kezelésére szolgál.',
    'A Csomagok az előfizetést, kiegészítőket és funkciólimiteket mutatja.',
    'A Csevegési előzmények mentett beszélgetéseket, kimeneteket és korábbi válaszokat tárol.',
    'A Videó útmutató megnyitja a kézikönyveket, a Kijelentkezés biztonságosan lezárja a munkát.',
    'Felül középen AI modulok találhatók: témavezető, adatelemzés, audit, tervezés, védés, e-mailek, fordítás és humanizálás.',
    'A munkaterület mellékleteket, nagy szövegmezőt és Dictate, Canvas, Clear gombokat tartalmaz.',
  ],
};

const MANUALS = [
  {
    slug: '01_hlavne_menu',
    title: TITLES['01_hlavne_menu'],
    category: 'basics',
    steps: FIRST_STEPS,
    detailedMainMenu: true,
  },
];

for (const slug of Object.keys(TITLES).filter((slug) => slug !== '01_hlavne_menu')) {
  MANUALS.push({
    slug,
    title: TITLES[slug],
    category: 'section',
    steps: makeGenericSteps(TITLES[slug]),
    detailedMainMenu: false,
  });
}

function makeGenericSteps(title) {
  return {
    sk: [
      `Otvorte sekciu ${title.sk} v aplikácii Zedpera.`,
      'Sledujte zvýraznenú kartu alebo tlačidlo v pracovnej ploche.',
      'Kliknite presne na označenú časť obrazovky.',
      'Vyplňte alebo skontrolujte potrebné údaje v tejto sekcii.',
      'Potvrďte akciu tlačidlom uložiť, spustiť alebo pokračovať.',
      `Po dokončení môžete sekciu ${title.sk} používať samostatne.`,
    ],
    cs: [
      `Otevřete sekci ${title.cs} v aplikaci Zedpera.`,
      'Sledujte zvýrazněnou kartu nebo tlačítko v pracovní ploše.',
      'Klikněte přesně na označenou část obrazovky.',
      'Vyplňte nebo zkontrolujte potřebné údaje v této sekci.',
      'Potvrďte akci tlačítkem uložit, spustit nebo pokračovat.',
      `Po dokončení můžete sekci ${title.cs} používat samostatně.`,
    ],
    en: [
      `Open the ${title.en} section in the Zedpera application.`,
      'Follow the highlighted card or button in the workspace.',
      'Click exactly on the marked part of the screen.',
      'Fill in or review the information required in this section.',
      'Confirm the action with save, start or continue.',
      `After finishing, you can use the ${title.en} section independently.`,
    ],
    de: [
      `Öffnen Sie den Bereich ${title.de} in Zedpera.`,
      'Beachten Sie die hervorgehobene Karte oder Schaltfläche im Arbeitsbereich.',
      'Klicken Sie genau auf den markierten Bildschirmbereich.',
      'Füllen oder prüfen Sie die erforderlichen Angaben.',
      'Bestätigen Sie mit Speichern, Starten oder Weiter.',
      `Danach können Sie den Bereich ${title.de} selbstständig nutzen.`,
    ],
    pl: [
      `Otwórz sekcję ${title.pl} w aplikacji Zedpera.`,
      'Obserwuj podświetloną kartę lub przycisk w obszarze roboczym.',
      'Kliknij dokładnie oznaczoną część ekranu.',
      'Uzupełnij lub sprawdź wymagane dane w tej sekcji.',
      'Potwierdź akcję przyciskiem zapisz, uruchom lub kontynuuj.',
      `Po zakończeniu możesz samodzielnie używać sekcji ${title.pl}.`,
    ],
    hu: [
      `Nyissa meg a(z) ${title.hu} szekciót a Zedpera alkalmazásban.`,
      'Figyelje a munkaterületen kiemelt kártyát vagy gombot.',
      'Kattintson pontosan a képernyő jelölt részére.',
      'Töltse ki vagy ellenőrizze a szükséges adatokat.',
      'Erősítse meg a műveletet mentés, indítás vagy folytatás gombbal.',
      `Befejezés után önállóan használhatja a(z) ${title.hu} szekciót.`,
    ],
  };
}

function parseArgs() {
  const args = {
    force: false,
    langs: LANGS,
    manual: null,
    seconds: DEFAULT_SECONDS,
    timeout: DEFAULT_TIMEOUT,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === '--force') args.force = true;
    else if (arg.startsWith('--langs=')) args.langs = arg.replace('--langs=', '').split(',').map(normalizeLang).filter(Boolean);
    else if (arg.startsWith('--manual=')) args.manual = arg.replace('--manual=', '').trim() || null;
    else if (arg.startsWith('--seconds=')) {
      const value = Number(arg.replace('--seconds=', '').trim());
      if (Number.isFinite(value) && value >= 5) args.seconds = value;
    } else if (arg.startsWith('--timeout=')) {
      const value = Number(arg.replace('--timeout=', '').trim());
      if (Number.isFinite(value) && value > 10000) args.timeout = value;
    }
  }

  args.langs = [...new Set(args.langs)].filter((lang) => LANGS.includes(lang));
  if (!args.langs.length) args.langs = LANGS;

  return args;
}

function normalizeLang(value) {
  const lang = String(value || 'sk').trim().toLowerCase();
  if (lang === 'cz') return 'cs';
  return LANGS.includes(lang) ? lang : 'sk';
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function exists(file) {
  return Boolean(file) && fs.existsSync(file);
}

function writeText(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, value, 'utf8');
}

function ffPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/:/g, '\\:');
}

function esc(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/%/g, '\\%')
    .replace(/\n/g, ' ');
}

function wrap(value, max) {
  const words = String(value || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);

  return lines.join('\n');
}

function textFile(tempDir, name, value) {
  const file = path.join(tempDir, `${name}.txt`);
  writeText(file, value);
  return ffPath(file);
}

function srtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function titleOf(manual, lang) {
  return manual.title[lang] || manual.title.en || manual.title.sk || manual.slug;
}

function stepsOf(manual, lang) {
  const steps = manual.steps[lang] || manual.steps.en || manual.steps.sk || [];
  const output = [...steps];

  while (output.length < 6) {
    output.push(output[output.length - 1] || titleOf(manual, lang));
  }

  return output;
}

function slidesOf(manual, lang) {
  const ui = UI[lang];
  const title = titleOf(manual, lang);
  const steps = stepsOf(manual, lang);

  return [
    {
      kind: 'intro',
      title,
      text: `${ui.guide}: ${title}`,
    },
    ...steps.map((step, index) => ({
      kind: 'step',
      title: `${ui.step} ${index + 1} ${ui.of} ${steps.length}`,
      text: step,
    })),
    {
      kind: 'final',
      title: ui.finalTitle,
      text: ui.finalText,
    },
  ];
}

function writeSubtitles(manual, lang, slides, seconds) {
  const blocks = slides.map((slide, index) => {
    const start = index * seconds;
    const end = (index + 1) * seconds - 0.1;

    return [
      String(index + 1),
      `${srtTime(start)} --> ${srtTime(end)}`,
      `${slide.title}\n${slide.text}`,
      '',
    ].join('\n');
  });

  const srt = blocks.join('\n');
  const vtt = `WEBVTT\n\n${srt.replace(/,(\d{3})/g, '.$1')}`;

  writeText(path.join(videoRoot, lang, `${manual.slug}.srt`), srt);
  writeText(path.join(videoRoot, lang, `${manual.slug}.vtt`), vtt);
}

function menuTarget(index) {
  return { x: 22, y: 18 + index * 70, w: 244, h: 58 };
}

function moduleTarget(index) {
  const targets = [
    { x: 320, y: 92, w: 370, h: 30 },
    { x: 720, y: 92, w: 370, h: 30 },
    { x: 320, y: 132, w: 370, h: 30 },
    { x: 720, y: 132, w: 370, h: 30 },
    { x: 320, y: 172, w: 370, h: 30 },
    { x: 720, y: 172, w: 370, h: 30 },
    { x: 320, y: 212, w: 370, h: 30 },
    { x: 720, y: 212, w: 370, h: 30 },
  ];
  return targets[index % targets.length];
}

function workspaceTarget(index) {
  const targets = [
    { x: 305, y: 270, w: 930, h: 62 },
    { x: 305, y: 360, w: 930, h: 210 },
    { x: 820, y: 615, w: 110, h: 40 },
    { x: 950, y: 615, w: 110, h: 40 },
    { x: 1080, y: 615, w: 110, h: 40 },
  ];
  return targets[index % targets.length];
}

function targetForSlide(manual, slideIndex) {
  const stepIndex = slideIndex - 1;

  if (manual.detailedMainMenu) {
    if (stepIndex >= 0 && stepIndex <= 7) return menuTarget(stepIndex);
    if (stepIndex === 8) return moduleTarget(1);
    if (stepIndex === 9) return workspaceTarget(0);
    return workspaceTarget(1);
  }

  if (stepIndex <= 1) return menuTarget(0);
  if (stepIndex <= 3) return moduleTarget(stepIndex);
  return workspaceTarget(stepIndex);
}

function drawApplicationScreen(filters, lang, accent, soft, regular, bold) {
  filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=0x020617:t=fill`);
  filters.push(`drawbox=x=0:y=0:w=285:h=${H}:color=0x050816@0.98:t=fill`);
  filters.push(`drawbox=x=285:y=0:w=2:h=${H}:color=0x1e293b:t=fill`);

  const menuItems = MENU_ITEMS[lang] || MENU_ITEMS.en;

  menuItems.forEach(([label, sublabel], index) => {
    const y = 18 + index * 70;
    filters.push(`drawbox=x=22:y=${y}:w=244:h=58:color=${index === 0 ? '0x272a34@0.98' : '0x050816@0.00'}:t=fill`);
    filters.push(`drawbox=x=36:y=${y + 10}:w=38:h=38:color=${index === 0 ? '0x374151' : '0x111827'}:t=fill`);
    filters.push(`drawtext=fontfile='${bold}':text='${esc(label)}':fontcolor=white:fontsize=18:x=88:y=${y + 8}`);
    filters.push(`drawtext=fontfile='${regular}':text='${esc(sublabel)}':fontcolor=white:fontsize=12:x=88:y=${y + 34}`);
  });

  const modules = MODULE_ITEMS[lang] || MODULE_ITEMS.en;

  modules.forEach((label, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = col === 0 ? 320 : 720;
    const y = 92 + row * 40;
    const active =
      label.toLowerCase().includes('data') ||
      label.toLowerCase().includes('dát') ||
      label.toLowerCase().includes('dat') ||
      label.toLowerCase().includes('daten') ||
      label.toLowerCase().includes('analiza') ||
      label.toLowerCase().includes('adat');

    filters.push(`drawbox=x=${x}:y=${y}:w=370:h=30:color=${active ? accent : '0x111827'}:t=fill`);
    filters.push(`drawbox=x=${x}:y=${y}:w=370:h=30:color=white@0.08:t=2`);
    filters.push(`drawtext=fontfile='${bold}':text='${esc(label)}':fontcolor=white:fontsize=18:x=${x + 96}:y=${y + 5}`);
  });

  filters.push(`drawbox=x=305:y=270:w=930:h=62:color=0x050816@0.98:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Attachments')}':fontcolor=white:fontsize=17:x=330:y=289`);
  filters.push(`drawbox=x=1040:y=282:w=140:h=36:color=0x24143d@0.95:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Attach File')}':fontcolor=white:fontsize=16:x=1062:y=291`);

  filters.push(`drawbox=x=305:y=360:w=930:h=210:color=0x0f172a@0.98:t=fill`);
  filters.push(`drawtext=fontfile='${regular}':text='${esc('Describe what the system should do with your text, data, file or academic work.')}':fontcolor=0x93c5fd:fontsize=17:x=330:y=386`);

  filters.push(`drawbox=x=305:y=610:w=420:h=72:color=0x050816@0.98:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Active module card')}':fontcolor=white:fontsize=19:x=350:y=632`);

  filters.push(`drawbox=x=820:y=615:w=110:h=40:color=0x111827:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Dictate')}':fontcolor=white:fontsize=15:x=840:y=627`);

  filters.push(`drawbox=x=950:y=615:w=110:h=40:color=0x111827:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Canvas')}':fontcolor=white:fontsize=15:x=970:y=627`);

  filters.push(`drawbox=x=1080:y=615:w=110:h=40:color=0x3b0b18:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Clear')}':fontcolor=white:fontsize=15:x=1110:y=627`);
}

function drawProfessionalArrow(filters, target, accent, enable) {
  const targetCenterY = Math.round(target.y + target.h / 2);
  const startX = 890;
  const endX = target.x + target.w + 18;
  const y = Math.max(55, Math.min(648, targetCenterY));

  if (endX < startX) {
    filters.push(`drawbox=x=${endX}:y=${y - 5}:w=${startX - endX}:h=10:color=${accent}:t=fill:${enable}`);
  } else {
    filters.push(`drawbox=x=${startX}:y=${y - 5}:w=${endX - startX}:h=10:color=${accent}:t=fill:${enable}`);
  }

  filters.push(`drawbox=x=${target.x + target.w + 4}:y=${y - 18}:w=20:h=20:color=${accent}:t=fill:${enable}`);
  filters.push(`drawbox=x=${target.x + target.w + 4}:y=${y + 2}:w=20:h=20:color=${accent}:t=fill:${enable}`);
}

function buildFilter({ manual, lang, slides, seconds, tempDir }) {
  const ui = UI[lang];
  const accent = ACCENT[lang];
  const soft = SOFT[lang];
  const regular = ffPath(FONT_REGULAR);
  const bold = ffPath(FONT_BOLD);

  const filters = [];

  drawApplicationScreen(filters, lang, accent, soft, regular, bold);

  const headerFile = textFile(tempDir, 'header', `${ui.guide} · ${ui.language}`);
  const footerFile = textFile(tempDir, 'footer', ui.footer);
  const activeFile = textFile(tempDir, 'active', ui.click);

  filters.push(`drawbox=x=0:y=0:w=${W}:h=68:color=0x020617@0.78:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('ZEDPERA')}':fontcolor=white:fontsize=27:x=36:y=20`);
  filters.push(`drawtext=fontfile='${regular}':textfile='${headerFile}':fontcolor=${soft}:fontsize=20:x=180:y=24`);

  filters.push(`drawbox=x=0:y=686:w=${W}:h=34:color=0x020617@0.94:t=fill`);
  filters.push(`drawtext=fontfile='${regular}':textfile='${footerFile}':fontcolor=0x94a3b8:fontsize=17:x=36:y=694`);

  slides.forEach((slide, index) => {
    const start = index * seconds;
    const end = (index + 1) * seconds - 0.05;
    const enable = `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`;

    const titleFile = textFile(tempDir, `s${index}-title`, wrap(slide.title, 32));
    const text = textFile(tempDir, `s${index}-text`, wrap(slide.text, 44));
    const stepFile = textFile(tempDir, `s${index}-step`, `${index + 1}/${slides.length}`);

    const progress = Math.round(1180 * ((index + 1) / slides.length));

    filters.push(`drawbox=x=900:y=92:w=338:h=510:color=0x111827@0.97:t=fill:${enable}`);
    filters.push(`drawbox=x=900:y=92:w=8:h=510:color=${accent}:t=fill:${enable}`);
    filters.push(`drawtext=fontfile='${bold}':textfile='${titleFile}':fontcolor=white:fontsize=34:line_spacing=8:x=928:y=124:${enable}`);
    filters.push(`drawtext=fontfile='${regular}':textfile='${text}':fontcolor=0xe2e8f0:fontsize=23:line_spacing=10:x=928:y=230:${enable}`);
    filters.push(`drawtext=fontfile='${bold}':textfile='${stepFile}':fontcolor=${soft}:fontsize=24:x=1165:y=562:${enable}`);

    if (slide.kind === 'step') {
      const target = targetForSlide(manual, index);

      filters.push(`drawbox=x=${target.x - 8}:y=${target.y - 8}:w=${target.w + 16}:h=${target.h + 16}:color=${accent}@0.28:t=fill:${enable}`);
      filters.push(`drawbox=x=${target.x - 12}:y=${target.y - 12}:w=${target.w + 24}:h=${target.h + 24}:color=${accent}:t=4:${enable}`);
      filters.push(`drawtext=fontfile='${bold}':textfile='${activeFile}':fontcolor=white:fontsize=17:x=${Math.max(32, target.x)}:y=${Math.max(18, target.y - 32)}:${enable}`);

      drawProfessionalArrow(filters, target, accent, enable);
    }

    filters.push(`drawbox=x=50:y=660:w=1180:h=10:color=0x1e293b:t=fill:${enable}`);
    filters.push(`drawbox=x=50:y=660:w=${progress}:h=10:color=${accent}:t=fill:${enable}`);
  });

  return filters.join(',');
}

function writeSubtitlesAndVideo({ manual, lang, force, seconds, timeout }) {
  ensureDir(path.join(videoRoot, lang));

  const outFile = path.join(videoRoot, lang, `${manual.slug}.mp4`);
  const tmpFile = `${outFile}.tmp.mp4`;
  const tmpDir = path.join(videoRoot, '.tmp-render', `${lang}-${manual.slug}`);

  if (!force && exists(outFile)) return { skipped: true, elapsed: 0 };

  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(tmpFile, { force: true });
  ensureDir(tmpDir);

  const slides = slidesOf(manual, lang);
  const duration = slides.length * seconds;
  const filter = buildFilter({ manual, lang, slides, seconds, tempDir: tmpDir });

  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=black:s=${W}x${H}:r=${FPS}:d=${duration.toFixed(2)}`,
    '-f',
    'lavfi',
    '-i',
    `anullsrc=channel_layout=stereo:sample_rate=48000:d=${duration.toFixed(2)}`,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-vf',
    filter,
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-tune',
    'stillimage',
    '-crf',
    '21',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-ar',
    '48000',
    '-t',
    duration.toFixed(2),
    '-movflags',
    '+faststart',
    tmpFile,
  ];

  const started = Date.now();

  const result = cp.spawnSync('ffmpeg', args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout,
    maxBuffer: 1024 * 1024 * 32,
  });

  const elapsed = Date.now() - started;

  if (result.error?.code === 'ETIMEDOUT') {
    fs.rmSync(tmpFile, { force: true });
    throw new Error(`FFmpeg timeout po ${Math.round(elapsed / 1000)} s.`);
  }

  if (result.status !== 0) {
    fs.rmSync(tmpFile, { force: true });
    throw new Error(result.stderr || result.stdout || 'FFmpeg zlyhal.');
  }

  if (!exists(tmpFile) || fs.statSync(tmpFile).size < 4096) {
    fs.rmSync(tmpFile, { force: true });
    throw new Error('FFmpeg nevytvoril platné MP4.');
  }

  fs.renameSync(tmpFile, outFile);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  writeSubtitles(manual, lang, slides, seconds);

  return { skipped: false, elapsed, duration };
}

function main() {
  const args = parseArgs();

  ensureDir(videoRoot);
  fs.rmSync(path.join(videoRoot, '.tmp-render'), { recursive: true, force: true });

  const manuals = MANUALS.filter((manual) => !args.manual || manual.slug === args.manual);

  const report = {
    generatedAt: new Date().toISOString(),
    root: videoRoot,
    mode: 'professional-walkthrough-no-ai-guide',
    languages: args.langs,
    manuals: manuals.map((manual) => manual.slug),
    results: [],
  };

  console.log('══════════════════════════════════════════════════════════════');
  console.log(' ZEDPERA — professional walkthrough video manual generator');
  console.log(' Mode: no AI guide / no character / each menu item highlighted');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`Root: ${videoRoot}`);
  console.log(`Languages: ${args.langs.join(', ')}`);
  console.log(`Manuals: ${manuals.length}`);
  console.log(`Seconds per slide: ${args.seconds}`);
  console.log('──────────────────────────────────────────────────────────────');

  let ok = 0;
  let fail = 0;
  let skip = 0;

  for (const lang of args.langs) {
    ensureDir(path.join(videoRoot, lang));

    for (const manual of manuals) {
      process.stdout.write(`RENDER ${lang}/${manual.slug} ... `);

      const item = {
        lang,
        slug: manual.slug,
        title: titleOf(manual, lang),
        ok: false,
        skipped: false,
        error: null,
      };

      try {
        const result = writeSubtitlesAndVideo({
          manual,
          lang,
          force: args.force,
          seconds: args.seconds,
          timeout: args.timeout,
        });

        item.ok = true;
        item.skipped = result.skipped;
        item.elapsedMs = result.elapsed;
        item.durationSeconds = result.duration || 0;

        if (result.skipped) {
          skip += 1;
          console.log('SKIP');
        } else {
          ok += 1;
          console.log(`OK ${Math.round(result.elapsed / 1000)}s`);
        }
      } catch (error) {
        fail += 1;
        item.error = error instanceof Error ? error.message : String(error);
        console.log(`FAIL ${item.error}`);
      }

      report.results.push(item);
      writeText(path.join(videoRoot, 'generation-report.json'), JSON.stringify(report, null, 2));
    }
  }

  report.finishedAt = new Date().toISOString();
  report.summary = { ok, fail, skip };
  writeText(path.join(videoRoot, 'generation-report.json'), JSON.stringify(report, null, 2));

  console.log('──────────────────────────────────────────────────────────────');
  console.log(`OK: ${ok}`);
  console.log(`FAIL: ${fail}`);
  console.log(`SKIP: ${skip}`);
  console.log(`Report: ${path.join(videoRoot, 'generation-report.json')}`);
}

main();
