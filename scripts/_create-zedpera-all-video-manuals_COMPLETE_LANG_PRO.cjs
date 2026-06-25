#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * ZEDPERA — GENERÁTOR VIDEO MANUÁLOV PODĽA AKTUÁLNYCH OBRAZOVIEK APLIKÁCIE
 * Verzia: ZEDPERA_SCREEN_MANUALS_COMPLETE_LANG_PRO_2026_06_25
 *
 * Tento skript je upravený podľa dodaných obrazoviek:
 * - 01 Main Menu
 * - 02 Client Account / Profile
 * - 03 AI Chat
 * - 04 My Works / Projects list
 * - 05 New Work / Wizard Profile
 * - 06 AI Supervisor
 * - 07 Quality Audit
 * - 08 Defense
 * - 09 Translation
 * - 10 Data Analysis
 * - 11 Planning
 * - 12 Emails
 * - 14 Text Humanization
 * - 15 Sources and Citations
 * - 16 Packages
 * - 17 Chat History
 * - 18 Video Tutorial
 * - 19 Light and Dark Mode
 * - 20 Log Out
 *
 * Štýl:
 * - rovnaký profesionálny štýl ako 1. video,
 * - tmavé rozhranie Zedpera,
 * - zvýraznenie aktívnej časti rámikom,
 * - šípka na aktívnu časť,
 * - panel s vysvetlením,
 * - progress bar,
 * - bez kurzora, bez AI panáčika, bez hlasu,
 * - výstup MP4 + SRT + VTT,
 * - 6 jazykov: sk, cs, en, de, pl, hu,
 * - Windows-safe FFmpeg cez filter_script.
 *
 * Uložiť ako:
 *   scripts/_create-zedpera-all-video-manuals.cjs
 *
 * Spustenie všetkých videí:
 *   node scripts/_create-zedpera-all-video-manuals.cjs --force --manual=all --langs=sk,cs,en,de,pl,hu --seconds=6.5
 *
 * Spustenie iba konkrétneho videa:
 *   node scripts/_create-zedpera-all-video-manuals.cjs --force --manual=03_ai_chat --langs=en --seconds=6
 *   node scripts/_create-zedpera-all-video-manuals.cjs --force --manual=12_emaily --langs=sk,cs,en,de,pl,hu --seconds=7
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
const DEFAULT_SECONDS = 6.5;
const DEFAULT_TIMEOUT = 240000;

const FONT_REGULAR = process.env.ZEDPERA_FONT_REGULAR || 'C:/Windows/Fonts/arial.ttf';
const FONT_BOLD = process.env.ZEDPERA_FONT_BOLD || 'C:/Windows/Fonts/arialbd.ttf';

const ACCENT = {
  sk: '0x8b5cf6',
  cs: '0x3b82f6',
  en: '0xa855f7',
  de: '0xef4444',
  pl: '0xf59e0b',
  hu: '0x22c55e',
};

const SOFT = {
  sk: '0xc4b5fd',
  cs: '0xbfdbfe',
  en: '0xe9d5ff',
  de: '0xfecaca',
  pl: '0xfde68a',
  hu: '0xbbf7d0',
};

const UI = {
  sk: {
    language: 'Slovenčina', guide: 'Profesionálny video manuál', active: 'AKTÍVNA ČASŤ', step: 'Krok', of: 'z',
    footer: 'www.zedpera.com · video manuál · bez hlasu a bez kurzora', finalTitle: 'Modul je vysvetlený',
    finalText: 'Používateľ vie, kde modul nájde, ktoré časti ovláda a ako pokračuje v práci.',
    menu: 'Menu', profile: 'Profil', aiChat: 'AI Chat', myWork: 'Moje práce', resources: 'Zdroje', packages: 'Balíčky', history: 'História chatu', video: 'Video návod', logout: 'Odhlásiť sa',
    moduleTabs: 'Modulové prepínače', attachments: 'Prílohy', inputArea: 'Vstupné pole', mainButton: 'Hlavné tlačidlo', resultArea: 'Výsledok', sideMenu: 'Ľavé menu',
  },
  cs: {
    language: 'Čeština', guide: 'Profesionální video návod', active: 'AKTIVNÍ ČÁST', step: 'Krok', of: 'z',
    footer: 'www.zedpera.com · video návod · bez hlasu a bez kurzoru', finalTitle: 'Modul je vysvětlen',
    finalText: 'Uživatel ví, kde modul najde, které části ovládá a jak pokračuje v práci.',
    menu: 'Menu', profile: 'Profil', aiChat: 'AI Chat', myWork: 'Moje práce', resources: 'Zdroje', packages: 'Balíčky', history: 'Historie chatu', video: 'Video návod', logout: 'Odhlásit se',
    moduleTabs: 'Přepínače modulů', attachments: 'Přílohy', inputArea: 'Vstupní pole', mainButton: 'Hlavní tlačítko', resultArea: 'Výsledek', sideMenu: 'Levé menu',
  },
  en: {
    language: 'English', guide: 'Professional video guide', active: 'ACTIVE AREA', step: 'Step', of: 'of',
    footer: 'www.zedpera.com · video guide · no voice and no cursor', finalTitle: 'Module explained',
    finalText: 'The user knows where to find the module, which parts to use and how to continue working.',
    menu: 'Menu', profile: 'Profile', aiChat: 'AI Chat', myWork: 'My Work', resources: 'Resources', packages: 'Packages', history: 'Chat History', video: 'Video Tutorial', logout: 'Log out',
    moduleTabs: 'Module switcher', attachments: 'Attachments', inputArea: 'Input area', mainButton: 'Main button', resultArea: 'Result', sideMenu: 'Left menu',
  },
  de: {
    language: 'Deutsch', guide: 'Professionelle Videoanleitung', active: 'AKTIVER BEREICH', step: 'Schritt', of: 'von',
    footer: 'www.zedpera.com · Videoanleitung · ohne Stimme und ohne Cursor', finalTitle: 'Modul erklärt',
    finalText: 'Der Benutzer weiß, wo das Modul zu finden ist, welche Bereiche wichtig sind und wie er weiterarbeitet.',
    menu: 'Menü', profile: 'Profil', aiChat: 'AI Chat', myWork: 'Meine Arbeiten', resources: 'Quellen', packages: 'Pakete', history: 'Chatverlauf', video: 'Videoanleitung', logout: 'Abmelden',
    moduleTabs: 'Modulumschalter', attachments: 'Anhänge', inputArea: 'Eingabebereich', mainButton: 'Hauptschaltfläche', resultArea: 'Ergebnis', sideMenu: 'Linkes Menü',
  },
  pl: {
    language: 'Polski', guide: 'Profesjonalny przewodnik wideo', active: 'AKTYWNY OBSZAR', step: 'Krok', of: 'z',
    footer: 'www.zedpera.com · przewodnik wideo · bez głosu i kursora', finalTitle: 'Moduł wyjaśniony',
    finalText: 'Użytkownik wie, gdzie znaleźć moduł, które części obsługiwać i jak kontynuować pracę.',
    menu: 'Menu', profile: 'Profil', aiChat: 'AI Chat', myWork: 'Moje prace', resources: 'Zasoby', packages: 'Pakiety', history: 'Historia czatu', video: 'Instrukcja wideo', logout: 'Wyloguj',
    moduleTabs: 'Przełącznik modułów', attachments: 'Załączniki', inputArea: 'Pole wejściowe', mainButton: 'Główny przycisk', resultArea: 'Wynik', sideMenu: 'Lewe menu',
  },
  hu: {
    language: 'Magyar', guide: 'Professzionális videó útmutató', active: 'AKTÍV TERÜLET', step: 'Lépés', of: '/',
    footer: 'www.zedpera.com · videó útmutató · hang és kurzor nélkül', finalTitle: 'A modul bemutatva',
    finalText: 'A felhasználó tudja, hol találja a modult, mely részeket használja és hogyan folytassa a munkát.',
    menu: 'Menü', profile: 'Profil', aiChat: 'AI Chat', myWork: 'Munkáim', resources: 'Források', packages: 'Csomagok', history: 'Chat előzmények', video: 'Videó útmutató', logout: 'Kijelentkezés',
    moduleTabs: 'Modulváltó', attachments: 'Mellékletek', inputArea: 'Beviteli mező', mainButton: 'Fő gomb', resultArea: 'Eredmény', sideMenu: 'Bal menü',
  },
};

const CATEGORIES = {
  basics: { sk: 'Základy', cs: 'Základy', en: 'Basics', de: 'Grundlagen', pl: 'Podstawy', hu: 'Alapok' },
  profile: { sk: 'Profil', cs: 'Profil', en: 'Profile', de: 'Profil', pl: 'Profil', hu: 'Profil' },
  ai: { sk: 'AI nástroje', cs: 'AI nástroje', en: 'AI Tools', de: 'AI-Werkzeuge', pl: 'Narzędzia AI', hu: 'AI eszközök' },
  works: { sk: 'Práce', cs: 'Práce', en: 'Works', de: 'Arbeiten', pl: 'Prace', hu: 'Munkák' },
  review: { sk: 'Kontrola', cs: 'Kontrola', en: 'Review', de: 'Prüfung', pl: 'Weryfikacja', hu: 'Ellenőrzés' },
  defense: { sk: 'Obhajoba', cs: 'Obhajoba', en: 'Defense', de: 'Verteidigung', pl: 'Obrona', hu: 'Védés' },
  research: { sk: 'Výskum', cs: 'Výzkum', en: 'Research', de: 'Forschung', pl: 'Badania', hu: 'Kutatás' },
  organization: { sk: 'Organizácia', cs: 'Organizace', en: 'Organization', de: 'Organisation', pl: 'Organizacja', hu: 'Szervezés' },
  communication: { sk: 'Komunikácia', cs: 'Komunikace', en: 'Communication', de: 'Kommunikation', pl: 'Komunikacja', hu: 'Kommunikáció' },
  sources: { sk: 'Zdroje', cs: 'Zdroje', en: 'Sources', de: 'Quellen', pl: 'Źródła', hu: 'Források' },
  payments: { sk: 'Platby', cs: 'Platby', en: 'Payments', de: 'Zahlungen', pl: 'Płatności', hu: 'Fizetések' },
  history: { sk: 'História', cs: 'Historie', en: 'History', de: 'Verlauf', pl: 'Historia', hu: 'Előzmények' },
  help: { sk: 'Pomoc', cs: 'Nápověda', en: 'Help', de: 'Hilfe', pl: 'Pomoc', hu: 'Súgó' },
  settings: { sk: 'Nastavenia', cs: 'Nastavení', en: 'Settings', de: 'Einstellungen', pl: 'Ustawienia', hu: 'Beállítások' },
  account: { sk: 'Účet', cs: 'Účet', en: 'Account', de: 'Konto', pl: 'Konto', hu: 'Fiók' },
};

const MODULES = [
  m(1, '01_main_menu', 'menu', 'basics', 45, ['Hlavné menu Zedpera','Hlavní menu Zedpera','Zedpera Main Menu','Zedpera Hauptmenü','Menu główne Zedpera','Zedpera főmenü'], ['Navigácia cez aplikáciu, dashboard, menu a hlavné systémové sekcie.','Navigace aplikací, dashboardem, menu a hlavními sekcemi.','Navigation through the application, dashboard, menu and main sections.','Navigation durch Anwendung, Dashboard, Menü und Hauptbereiche.','Nawigacja po aplikacji, panelu i głównych sekcjach.','Navigáció az alkalmazásban, irányítópulton és fő részekben.']),
  m(2, '02_profil', 'profile', 'profile', 60, ['Používateľský profil','Uživatelský profil','User Profile','Benutzerprofil','Profil użytkownika','Felhasználói profil'], ['Účet, plán, informácie klienta a základné nastavenia.','Účet, plán, informace klienta a základní nastavení.','Account, plan, client information and basic settings.','Konto, Plan, Kundendaten und Grundeinstellungen.','Konto, plan, informacje klienta i podstawowe ustawienia.','Fiók, csomag, ügyféladatok és alapbeállítások.']),
  m(3, '03_ai_chat', 'ai_chat', 'ai', 75, ['AI Chat','AI Chat','AI Chat','AI Chat','AI Chat','AI Chat'], ['Písanie, úprava a generovanie akademického textu pomocou AI chatu.','Psaní, úprava a generování akademického textu pomocí AI chatu.','Write, edit and generate academic text with AI chat.','Akademische Texte mit AI Chat schreiben, bearbeiten und generieren.','Pisanie, edycja i generowanie tekstu akademickiego z AI chatem.','Akadémiai szöveg írása, szerkesztése és generálása AI chattel.']),
  m(4, '04_moje_prace', 'projects', 'works', 60, ['Moje práce','Moje práce','My Works','Meine Arbeiten','Moje prace','Munkáim'], ['Správa uložených prác, výber aktívnych projektov a pokračovanie v písaní.','Správa uložených prací, výběr aktivních projektů a pokračování v psaní.','Manage saved works, select active projects and continue writing.','Gespeicherte Arbeiten verwalten, aktive Projekte wählen und weiterschreiben.','Zarządzanie zapisanymi pracami, wybór projektów i kontynuacja pisania.','Mentett munkák kezelése, aktív projektek választása és írás folytatása.']),
  m(5, '05_nova_praca', 'wizard', 'works', 90, ['Nová práca','Nová práce','New Work','Neue Arbeit','Nowa praca','Új munka'], ['Vytvorenie novej akademickej práce a vyplnenie profilu práce.','Vytvoření nové akademické práce a vyplnění profilu práce.','Create a new academic work and complete its profile.','Neue akademische Arbeit erstellen und Profil ausfüllen.','Utworzenie nowej pracy akademickiej i uzupełnienie profilu.','Új akadémiai munka létrehozása és profiljának kitöltése.']),
  m(6, '06_ai_skolitel', 'tool_supervisor', 'ai', 75, ['AI školiteľ','AI školitel','AI Supervisor','AI Betreuer','Promotor AI','AI témavezető'], ['Odborná spätná väzba k logike, štruktúre a kvalite práce.','Odborná zpětná vazba k logice, struktuře a kvalitě práce.','Expert feedback on logic, structure and work quality.','Fachliches Feedback zu Logik, Struktur und Qualität.','Ekspercka informacja zwrotna o logice, strukturze i jakości pracy.','Szakértői visszajelzés logikáról, szerkezetről és minőségről.']),
  m(7, '07_audit_kvality', 'tool_quality', 'review', 75, ['Audit kvality','Audit kvality','Quality Audit','Qualitätsaudit','Audyt jakości','Minőségi audit'], ['Kontrola akademického textu, citácií, logiky a metodológie.','Kontrola akademického textu, citací, logiky a metodologie.','Review academic text, citations, logic and methodology.','Akademischen Text, Zitate, Logik und Methodik prüfen.','Sprawdzenie tekstu akademickiego, cytowań, logiki i metodologii.','Akadémiai szöveg, hivatkozások, logika és módszertan ellenőrzése.']),
  m(8, '08_obhajoba', 'tool_defense', 'defense', 90, ['Obhajoba','Obhajoba','Defense','Verteidigung','Obrona','Védés'], ['Príprava prezentácie, otázok komisie a odporúčaných odpovedí.','Příprava prezentace, otázek komise a doporučených odpovědí.','Prepare presentations, committee questions and recommended answers.','Präsentation, Kommissionsfragen und empfohlene Antworten vorbereiten.','Przygotowanie prezentacji, pytań komisji i rekomendowanych odpowiedzi.','Prezentáció, bizottsági kérdések és ajánlott válaszok készítése.']),
  m(9, '09_preklad', 'tool_translation', 'ai', 60, ['Preklad','Překlad','Translation','Übersetzung','Tłumaczenie','Fordítás'], ['Preklad akademického textu podľa zdrojového a cieľového jazyka.','Překlad akademického textu podle zdrojového a cílového jazyka.','Translate academic text based on source and target languages.','Akademischen Text nach Ausgangs- und Zielsprache übersetzen.','Tłumaczenie tekstu akademickiego według języka źródłowego i docelowego.','Akadémiai szöveg fordítása forrás- és célnyelv alapján.']),
  m(10, '10_analyza_dat', 'tool_data', 'research', 75, ['Analýza dát','Analýza dat','Data Analysis','Datenanalyse','Analiza danych','Adatelemzés'], ['Spracovanie tabuliek, dotazníkov, grafov a štatistických výsledkov.','Zpracování tabulek, dotazníků, grafů a statistických výsledků.','Process tables, questionnaires, charts and statistical results.','Tabellen, Fragebögen, Diagramme und statistische Ergebnisse verarbeiten.','Przetwarzanie tabel, kwestionariuszy, wykresów i wyników statystycznych.','Táblázatok, kérdőívek, grafikonok és statisztikai eredmények feldolgozása.']),
  m(11, '11_planovanie', 'tool_planning', 'organization', 60, ['Plánovanie','Plánování','Planning','Planung','Planowanie','Tervezés'], ['Vytvorenie harmonogramu písania podľa termínu odovzdania.','Vytvoření harmonogramu psaní podle termínu odevzdání.','Create a writing schedule based on your submission deadline.','Schreibplan anhand des Abgabetermins erstellen.','Utworzenie harmonogramu pisania według terminu oddania.','Írási ütemterv készítése a leadási határidő alapján.']),
  m(12, '12_emaily', 'tool_emails', 'communication', 60, ['Emaily','Emaily','Emails','E-Mails','E-maile','E-mailek'], ['Generovanie profesionálnych emailov pre školu, školiteľa alebo administratívu.','Generování profesionálních emailů pro školu, školitele nebo administrativu.','Generate professional emails for school, supervisor or administration.','Professionelle E-Mails für Schule, Betreuer oder Verwaltung generieren.','Generowanie profesjonalnych e-maili do szkoły, promotora lub administracji.','Professzionális e-mailek készítése iskolának, témavezetőnek vagy adminisztrációnak.']),
  m(14, '14_humanizacia_textu', 'tool_humanize', 'ai', 60, ['Humanizácia textu','Humanizace textu','Text Humanization','Texthumanisierung','Humanizacja tekstu','Szöveg humanizálása'], ['Prepísanie textu do prirodzenejšieho akademického štýlu.','Přepsání textu do přirozenějšího akademického stylu.','Rewrite text into a more natural academic style.','Text in einen natürlicheren akademischen Stil umschreiben.','Przepisanie tekstu na bardziej naturalny styl akademicki.','Szöveg átírása természetesebb akadémiai stílusra.']),
  m(15, '15_zdroje_citacie', 'sources_page', 'sources', 75, ['Zdroje a citácie','Zdroje a citace','Sources and Citations','Quellen und Zitate','Źródła i cytowania','Források és hivatkozások'], ['Práca s literatúrou, akademickými článkami a bibliografickými údajmi.','Práce s literaturou, akademickými články a bibliografickými údaji.','Work with literature, academic articles and bibliographic data.','Arbeiten mit Literatur, wissenschaftlichen Artikeln und bibliografischen Daten.','Praca z literaturą, artykułami naukowymi i bibliografią.','Irodalom, tudományos cikkek és bibliográfiai adatok kezelése.']),
  m(16, '16_balicky', 'packages_page', 'payments', 75, ['Balíčky','Balíčky','Packages','Pakete','Pakiety','Csomagok'], ['Prehľad predplatného, limitov a dostupných funkcií.','Přehled předplatného, limitů a dostupných funkcí.','Overview of subscriptions, limits and available features.','Überblick über Abos, Limits und verfügbare Funktionen.','Przegląd subskrypcji, limitów i dostępnych funkcji.','Előfizetések, korlátok és elérhető funkciók áttekintése.']),
  m(17, '17_historia_chatu', 'history_page', 'history', 60, ['História chatu','Historie chatu','Chat History','Chatverlauf','Historia czatu','Chat előzmények'], ['Uložené konverzácie, výstupy, osnovy, kapitoly a audity.','Uložené konverzace, výstupy, osnovy, kapitoly a audity.','Saved conversations, outputs, outlines, chapters and audits.','Gespeicherte Gespräche, Ausgaben, Gliederungen, Kapitel und Audits.','Zapisane rozmowy, wyniki, konspekty, rozdziały i audyty.','Mentett beszélgetések, eredmények, vázlatok, fejezetek és auditok.']),
  m(18, '18_video_navody', 'video_page', 'help', 30, ['Video návody','Video návody','Video Guide','Videoanleitung','Przewodnik wideo','Videó útmutató'], ['Prehľad všetkých video návodov na jednom mieste.','Přehled všech video návodů na jednom místě.','Overview of all video guides in one place.','Übersicht aller Videoanleitungen an einem Ort.','Przegląd wszystkich instrukcji wideo w jednym miejscu.','Az összes videó útmutató egy helyen.']),
  m(19, '19_svetly_tmavy_rezim', 'generic_settings', 'settings', 30, ['Svetlý a tmavý režim','Světlý a tmavý režim','Light and Dark Mode','Hell- und Dunkelmodus','Tryb jasny i ciemny','Világos és sötét mód'], ['Prepínanie vzhľadu aplikácie podľa preferencie používateľa.','Přepínání vzhledu aplikace podle preference uživatele.','Switching the application appearance according to user preference.','Umschalten des Erscheinungsbildes nach Benutzerpräferenz.','Przełączanie wyglądu aplikacji według preferencji użytkownika.','Az alkalmazás megjelenésének váltása felhasználói preferencia szerint.']),
  m(20, '20_odhlasenie', 'generic_logout', 'account', 30, ['Odhlásenie','Odhlášení','Log Out','Abmelden','Wylogowanie','Kijelentkezés'], ['Bezpečné ukončenie práce v používateľskom účte.','Bezpečné ukončení práce v uživatelském účtu.','Safely ending work in the user account.','Sicheres Beenden der Arbeit im Benutzerkonto.','Bezpieczne zakończenie pracy na koncie użytkownika.','A munka biztonságos befejezése a felhasználói fiókban.']),
];

function m(n, slug, screen, category, cardSeconds, titles, purposes) {
  return {
    n, slug, screen, category, cardSeconds,
    title: fromLangs(titles),
    purpose: fromLangs(purposes),
  };
}

function fromLangs(values) {
  const result = {};
  LANGS.forEach((lang, i) => { result[lang] = values[i] || values[2] || values[0]; });
  return result;
}

function t(value, lang) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.en || value.sk || '';
}

function parseArgs() {
  const args = { force: false, manual: 'all', langs: LANGS, seconds: DEFAULT_SECONDS, timeout: DEFAULT_TIMEOUT };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--force') args.force = true;
    else if (arg.startsWith('--manual=')) args.manual = arg.replace('--manual=', '').trim();
    else if (arg.startsWith('--langs=')) args.langs = arg.replace('--langs=', '').split(',').map(normalizeLang).filter(Boolean);
    else if (arg.startsWith('--seconds=')) {
      const v = Number(arg.replace('--seconds=', '').trim());
      if (Number.isFinite(v) && v >= 3) args.seconds = v;
    } else if (arg.startsWith('--timeout=')) {
      const v = Number(arg.replace('--timeout=', '').trim());
      if (Number.isFinite(v) && v >= 10000) args.timeout = v;
    }
  }
  args.langs = [...new Set(args.langs)].filter((lang) => LANGS.includes(lang));
  if (!args.langs.length) args.langs = LANGS;
  return args;
}

function normalizeLang(value) {
  const lang = String(value || '').trim().toLowerCase();
  if (lang === 'cz') return 'cs';
  return LANGS.includes(lang) ? lang : null;
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function exists(file) { return Boolean(file) && fs.existsSync(file); }
function writeText(file, value) { ensureDir(path.dirname(file)); fs.writeFileSync(file, value, 'utf8'); }
function ffPath(value) { return String(value || '').replace(/\\/g, '/').replace(/:/g, '\\:'); }
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
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length > max && cur) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
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
function drawText(filters, { font, text, textFilePath, color = 'white', size = 18, x, y, enable, lineSpacing }) {
  const textArg = textFilePath ? `textfile='${textFilePath}'` : `text='${esc(text)}'`;
  const spacing = lineSpacing ? `:line_spacing=${lineSpacing}` : '';
  const en = enable ? `:${enable}` : '';
  filters.push(`drawtext=fontfile='${font}':${textArg}:fontcolor=${color}:fontsize=${size}${spacing}:x=${x}:y=${y}${en}`);
}
function box(filters, x, y, w, h, color, thickness = 'fill', enable) {
  const en = enable ? `:${enable}` : '';
  filters.push(`drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}:t=${thickness}${en}`);
}
function line(filters, x, y, w, h, color, enable) { box(filters, x, y, w, h, color, 'fill', enable); }
function iconBox(filters, x, y, accent) { box(filters, x, y, 42, 42, '0x2d2148', 'fill'); box(filters, x + 12, y + 12, 18, 18, accent, 2); }

function visibleModules() { return MODULES.filter((item) => item.n !== 13); }
function moduleBySlug(slug) { return MODULES.find((m) => m.slug === slug || String(m.n).padStart(2, '0') === slug || String(m.n) === slug); }
function selectedManuals(args) {
  if (!args.manual || args.manual === 'all') return visibleModules();
  const manual = moduleBySlug(args.manual);
  if (!manual) throw new Error(`Neznámy manuál: ${args.manual}`);
  return [manual];
}

const MENU_GRID = {
  cols: [58, 510, 962],
  rows: [52, 150, 248, 346, 444, 542, 640],
  w: 410,
  h: 88,
};
function menuLayout() {
  return visibleModules().map((manual, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return { manual, x: MENU_GRID.cols[col], y: MENU_GRID.rows[row], w: MENU_GRID.w, h: MENU_GRID.h };
  });
}
function cardTargetForManual(manual) {
  const found = menuLayout().find((item) => item.manual.n === manual.n);
  return found ? { x: found.x, y: found.y, w: found.w, h: found.h } : { x: 58, y: 52, w: 410, h: 88 };
}

const PROFILE_TARGETS = [
  { x: 70, y: 35, w: 1090, h: 120 }, { x: 680, y: 68, w: 138, h: 44 }, { x: 834, y: 68, w: 128, h: 44 }, { x: 980, y: 68, w: 174, h: 44 },
  { x: 72, y: 186, w: 260, h: 80 }, { x: 350, y: 186, w: 260, h: 80 }, { x: 628, y: 186, w: 260, h: 80 }, { x: 906, y: 186, w: 260, h: 80 },
  { x: 72, y: 290, w: 672, h: 214 }, { x: 72, y: 516, w: 672, h: 70 }, { x: 790, y: 290, w: 370, h: 88 }, { x: 790, y: 396, w: 370, h: 88 }, { x: 790, y: 502, w: 370, h: 116 }, { x: 72, y: 632, w: 1090, h: 58 },
];
const AI_CHAT_TARGETS = [
  { x: 40, y: 66, w: 130, h: 54 }, { x: 1040, y: 64, w: 188, h: 52 }, { x: 36, y: 142, w: 260, h: 50 }, { x: 170, y: 288, w: 930, h: 168 },
  { x: 175, y: 486, w: 935, h: 50 }, { x: 175, y: 550, w: 935, h: 108 }, { x: 1140, y: 584, w: 50, h: 52 },
];
const PROJECTS_TARGETS = [
  { x: 76, y: 70, w: 118, h: 52 }, { x: 210, y: 70, w: 230, h: 52 }, { x: 458, y: 70, w: 162, h: 52 }, { x: 765, y: 70, w: 360, h: 52 },
  { x: 80, y: 174, w: 370, h: 300 }, { x: 465, y: 174, w: 370, h: 300 }, { x: 850, y: 174, w: 370, h: 360 }, { x: 100, y: 360, w: 260, h: 88 }, { x: 100, y: 420, w: 330, h: 50 },
];
const WIZARD_TARGETS = [
  { x: 12, y: 103, w: 250, h: 520 }, { x: 76, y: 38, w: 230, h: 44 }, { x: 920, y: 22, w: 330, h: 52 }, { x: 292, y: 110, w: 940, h: 64 },
  { x: 312, y: 210, w: 900, h: 265 }, { x: 312, y: 210, w: 160, h: 80 }, { x: 1080, y: 642, w: 150, h: 50 }, { x: 20, y: 642, w: 180, h: 50 },
];
const TOOL_TARGETS = [
  { x: 16, y: 30, w: 245, h: 620 }, { x: 300, y: 56, w: 930, h: 175 }, { x: 300, y: 56, w: 930, h: 175 }, { x: 300, y: 248, w: 930, h: 78 },
  { x: 300, y: 345, w: 930, h: 220 }, { x: 300, y: 585, w: 430, h: 58 }, { x: 745, y: 585, w: 230, h: 58 },
];
const TRANSLATION_TARGETS = [
  { x: 16, y: 30, w: 245, h: 620 }, { x: 300, y: 34, w: 930, h: 86 }, { x: 300, y: 126, w: 930, h: 174 }, { x: 300, y: 306, w: 930, h: 84 },
  { x: 300, y: 420, w: 930, h: 210 }, { x: 300, y: 648, w: 430, h: 50 },
];
const EMAIL_TARGETS = [
  { x: 16, y: 30, w: 245, h: 620 }, { x: 300, y: 52, w: 930, h: 170 }, { x: 310, y: 264, w: 920, h: 210 }, { x: 310, y: 474, w: 920, h: 92 },
  { x: 300, y: 600, w: 930, h: 90 }, { x: 300, y: 646, w: 400, h: 52 },
];
const GENERIC_TARGETS = [
  { x: 16, y: 30, w: 245, h: 620 }, { x: 300, y: 70, w: 900, h: 90 }, { x: 300, y: 190, w: 430, h: 120 }, { x: 760, y: 190, w: 430, h: 120 },
  { x: 300, y: 350, w: 900, h: 120 }, { x: 300, y: 520, w: 900, h: 90 },
];
const HUMANIZE_TARGETS = [
  { x: 16, y: 30, w: 245, h: 620 },
  { x: 300, y: 56, w: 930, h: 175 },
  { x: 770, y: 174, w: 460, h: 42 },
  { x: 300, y: 320, w: 930, h: 230 },
  { x: 300, y: 570, w: 170, h: 52 },
  { x: 485, y: 570, w: 310, h: 52 },
];
const SOURCES_TARGETS = [
  { x: 175, y: 105, w: 108, h: 48 },
  { x: 420, y: 102, w: 460, h: 50 },
  { x: 300, y: 205, w: 860, h: 68 },
  { x: 300, y: 285, w: 860, h: 70 },
  { x: 250, y: 392, w: 980, h: 78 },
  { x: 300, y: 286, w: 120, h: 34 },
];
const PACKAGES_TARGETS = [
  { x: 120, y: 82, w: 108, h: 48 },
  { x: 1010, y: 82, w: 160, h: 48 },
  { x: 125, y: 165, w: 820, h: 210 },
  { x: 125, y: 405, w: 250, h: 250 },
  { x: 410, y: 405, w: 250, h: 250 },
  { x: 695, y: 405, w: 250, h: 250 },
  { x: 980, y: 405, w: 250, h: 250 },
];
const HISTORY_TARGETS = [
  { x: 252, y: 92, w: 430, h: 95 },
  { x: 812, y: 98, w: 280, h: 48 },
  { x: 252, y: 190, w: 390, h: 50 },
  { x: 252, y: 290, w: 840, h: 340 },
  { x: 300, y: 380, w: 650, h: 72 },
  { x: 963, y: 378, w: 110, h: 42 },
];
const VIDEO_TARGETS = [
  { x: 156, y: 88, w: 108, h: 48 },
  { x: 1016, y: 88, w: 170, h: 48 },
  { x: 156, y: 180, w: 1040, h: 250 },
  { x: 185, y: 344, w: 985, h: 76 },
  { x: 156, y: 460, w: 1040, h: 210 },
  { x: 185, y: 540, w: 720, h: 140 },
];

function targetListForScreen(screen) {
  if (screen === 'profile') return PROFILE_TARGETS;
  if (screen === 'ai_chat') return AI_CHAT_TARGETS;
  if (screen === 'projects') return PROJECTS_TARGETS;
  if (screen === 'wizard') return WIZARD_TARGETS;
  if (screen === 'tool_translation') return TRANSLATION_TARGETS;
  if (screen === 'tool_emails') return EMAIL_TARGETS;
  if (screen === 'tool_humanize') return HUMANIZE_TARGETS;
  if (screen === 'sources_page') return SOURCES_TARGETS;
  if (screen === 'packages_page') return PACKAGES_TARGETS;
  if (screen === 'history_page') return HISTORY_TARGETS;
  if (screen === 'video_page') return VIDEO_TARGETS;
  if (screen.startsWith('tool_')) return TOOL_TARGETS;
  return GENERIC_TARGETS;
}

const STEP_TEXT = {
  profile: {
    sk: ['Horný panel zobrazuje názov profilu a základný popis účtu.', 'Return to Menu slúži na návrat späť do hlavného menu.', 'Refresh Data obnoví aktuálne údaje klienta.', 'Cancel Subscription zruší automatické obnovenie predplatného.', 'Karta Client ukazuje meno a email.', 'Karta Plan ukazuje aktuálny plán.', 'Karta Credits ukazuje zostatok kreditov.', 'Karta Projects ukazuje počet projektov a limit.', 'Client Details obsahuje údaje účtu, jazyk, stav a plán.', 'Subscription Management vysvetľuje zrušenie predplatného.', 'Activated Services ukazuje dostupné služby.', 'Enabled Features ukazuje povolené funkcie.', 'Subscription & Access obsahuje dátumy prístupu.', 'Spodné karty sumarizujú kontakt, rolu a poslednú aktualizáciu.'],
    cs: ['Horní panel zobrazuje název profilu a základní popis účtu.', 'Return to Menu slouží k návratu do hlavního menu.', 'Refresh Data obnoví aktuální údaje klienta.', 'Cancel Subscription zruší automatické obnovení předplatného.', 'Karta Client ukazuje jméno a email.', 'Karta Plan ukazuje aktuální plán.', 'Karta Credits ukazuje zůstatek kreditů.', 'Karta Projects ukazuje počet projektů a limit.', 'Client Details obsahuje údaje účtu, jazyk, stav a plán.', 'Subscription Management vysvětluje zrušení předplatného.', 'Activated Services ukazuje dostupné služby.', 'Enabled Features ukazuje povolené funkce.', 'Subscription & Access obsahuje data přístupu.', 'Spodní karty shrnují kontakt, roli a poslední aktualizaci.'],
    en: ['The top panel shows the profile title and account summary.', 'Return to Menu goes back to the main menu.', 'Refresh Data reloads current client data.', 'Cancel Subscription stops subscription renewal.', 'The Client card shows the name and email.', 'The Plan card shows the current plan.', 'The Credits card shows remaining credits.', 'The Projects card shows project count and limits.', 'Client Details contains account, language, status and plan.', 'Subscription Management explains cancellation.', 'Activated Services shows available services.', 'Enabled Features shows enabled features.', 'Subscription & Access contains access dates.', 'Bottom cards summarize contact, role and last update.'],
    de: ['Der obere Bereich zeigt Profilname und Kontozusammenfassung.', 'Return to Menu führt zurück zum Hauptmenü.', 'Refresh Data lädt aktuelle Kundendaten neu.', 'Cancel Subscription beendet die Abo-Verlängerung.', 'Die Karte Client zeigt Name und E-Mail.', 'Die Karte Plan zeigt den aktuellen Plan.', 'Credits zeigt verbleibende Credits.', 'Projects zeigt Projektanzahl und Limit.', 'Client Details enthält Konto, Sprache, Status und Plan.', 'Subscription Management erklärt die Kündigung.', 'Activated Services zeigt verfügbare Dienste.', 'Enabled Features zeigt aktivierte Funktionen.', 'Subscription & Access enthält Zugriffsdaten.', 'Untere Karten fassen Kontakt, Rolle und Aktualisierung zusammen.'],
    pl: ['Górny panel pokazuje tytuł profilu i podsumowanie konta.', 'Return to Menu wraca do głównego menu.', 'Refresh Data odświeża dane klienta.', 'Cancel Subscription zatrzymuje odnawianie subskrypcji.', 'Karta Client pokazuje nazwę i email.', 'Karta Plan pokazuje aktualny plan.', 'Credits pokazuje pozostałe kredyty.', 'Projects pokazuje liczbę projektów i limit.', 'Client Details zawiera konto, język, status i plan.', 'Subscription Management wyjaśnia anulowanie.', 'Activated Services pokazuje dostępne usługi.', 'Enabled Features pokazuje włączone funkcje.', 'Subscription & Access zawiera daty dostępu.', 'Dolne karty podsumowują kontakt, rolę i aktualizację.'],
    hu: ['A felső panel a profil címét és fiókösszefoglalót mutatja.', 'A Return to Menu visszavisz a főmenübe.', 'A Refresh Data frissíti az ügyféladatokat.', 'A Cancel Subscription leállítja az előfizetés megújítását.', 'A Client kártya a nevet és emailt mutatja.', 'A Plan kártya az aktuális csomagot mutatja.', 'A Credits a fennmaradó krediteket mutatja.', 'A Projects a projektek számát és limitet mutatja.', 'A Client Details fiókot, nyelvet, állapotot és csomagot tartalmaz.', 'A Subscription Management a lemondást magyarázza.', 'Az Activated Services elérhető szolgáltatásokat mutat.', 'Az Enabled Features engedélyezett funkciókat mutat.', 'A Subscription & Access hozzáférési dátumokat tartalmaz.', 'Az alsó kártyák kontaktot, szerepet és frissítést mutatnak.'],
  },
  ai_chat: {
    sk: ['Tlačidlo Menu otvorí hlavné menu aplikácie.', 'New Chat založí novú samostatnú konverzáciu.', 'Aktívny profil ukazuje, s ktorou prácou používateľ aktuálne pracuje.', 'Rýchle karty pomáhajú začať úvod, abstrakt, osnovu, kapitolu, citácie alebo akademické prepísanie.', 'Modelové prepínače umožňujú zvoliť Gemini, OpenAI, Claude, Mistral alebo Grok.', 'Do poľa správy používateľ zadá otázku, kapitolu alebo pokyn pre AI.', 'Ikona odoslania spustí odpoveď vybraného modelu.'],
    cs: ['Tlačítko Menu otevře hlavní menu aplikace.', 'New Chat založí novou samostatnou konverzaci.', 'Aktivní profil ukazuje, se kterou prací uživatel pracuje.', 'Rychlé karty pomáhají začít úvod, abstrakt, osnovu, kapitolu, citace nebo přepsání.', 'Přepínače modelů umožňují vybrat Gemini, OpenAI, Claude, Mistral nebo Grok.', 'Do pole zprávy uživatel zadá otázku, kapitolu nebo pokyn.', 'Ikona odeslání spustí odpověď vybraného modelu.'],
    en: ['The Menu button opens the main application menu.', 'New Chat starts a new independent conversation.', 'Active Profile shows which work is currently selected.', 'Quick cards help start an introduction, abstract, outline, chapter, citations or academic rewrite.', 'Model tabs let the user choose Gemini, OpenAI, Claude, Mistral or Grok.', 'The message box accepts the question, chapter or AI instruction.', 'The send icon starts the answer with the selected model.'],
    de: ['Die Menü-Schaltfläche öffnet das Hauptmenü.', 'New Chat startet eine neue Unterhaltung.', 'Active Profile zeigt die aktuell gewählte Arbeit.', 'Schnellkarten helfen bei Einleitung, Abstract, Gliederung, Kapitel, Zitaten oder Umschreiben.', 'Modell-Tabs wählen Gemini, OpenAI, Claude, Mistral oder Grok.', 'Im Nachrichtenfeld wird Frage, Kapitel oder Anweisung eingegeben.', 'Das Senden-Symbol startet die Antwort des Modells.'],
    pl: ['Przycisk Menu otwiera główne menu aplikacji.', 'New Chat rozpoczyna nową rozmowę.', 'Active Profile pokazuje wybraną pracę.', 'Szybkie karty pomagają zacząć wstęp, abstrakt, konspekt, rozdział, cytowania lub przepisanie.', 'Zakładki modeli wybierają Gemini, OpenAI, Claude, Mistral lub Grok.', 'Pole wiadomości przyjmuje pytanie, rozdział lub polecenie.', 'Ikona wysyłania uruchamia odpowiedź modelu.'],
    hu: ['A Menu gomb megnyitja a főmenüt.', 'A New Chat új beszélgetést indít.', 'Az Active Profile mutatja a kiválasztott munkát.', 'A gyors kártyák segítenek bevezető, absztrakt, vázlat, fejezet, hivatkozás vagy átírás indításában.', 'A modellfülek Gemini, OpenAI, Claude, Mistral vagy Grok választását adják.', 'Az üzenetmezőbe kérdés, fejezet vagy utasítás kerül.', 'A küldés ikon elindítja a választ.'],
  },
  projects: {
    sk: ['Menu vráti používateľa do hlavného menu.', 'Create Empty Profile vytvorí prázdny profil práce bez šablóny.', 'New Work otvorí sprievodcu vytvorením novej práce.', 'Vyhľadávanie filtruje práce podľa názvu, odboru alebo školiteľa.', 'Projektová karta obsahuje typ práce, názov, dátum a akčné tlačidlá.', 'Ďalšie karty predstavujú uložené alebo rozpracované práce.', 'Karta s vyplnenými údajmi ukazuje názov, odbor a školiteľa.', 'Select for Generation zvolí prácu ako aktívny profil pre generovanie.', 'Continue Work, Open a Edit slúžia na pokračovanie, otvorenie a úpravu práce.'],
    cs: ['Menu vrátí uživatele do hlavního menu.', 'Create Empty Profile vytvoří prázdný profil práce.', 'New Work otevře průvodce vytvořením nové práce.', 'Vyhledávání filtruje práce podle názvu, oboru nebo školitele.', 'Karta projektu obsahuje typ práce, název, datum a akce.', 'Další karty představují uložené nebo rozpracované práce.', 'Karta s údaji ukazuje název, obor a školitele.', 'Select for Generation zvolí práci jako aktivní profil.', 'Continue Work, Open a Edit slouží k pokračování, otevření a úpravě.'],
    en: ['Menu returns to the main menu.', 'Create Empty Profile creates a blank work profile.', 'New Work opens the new work wizard.', 'Search filters works by title, field or supervisor.', 'A project card contains type, title, date and action buttons.', 'Other cards represent saved or unfinished works.', 'A completed card shows title, field and supervisor.', 'Select for Generation chooses the work as the active profile.', 'Continue Work, Open and Edit continue, open and modify the work.'],
    de: ['Menu führt zum Hauptmenü zurück.', 'Create Empty Profile erstellt ein leeres Arbeitsprofil.', 'New Work öffnet den Assistenten für eine neue Arbeit.', 'Die Suche filtert nach Titel, Fach oder Betreuer.', 'Eine Projektkarte enthält Typ, Titel, Datum und Aktionen.', 'Weitere Karten zeigen gespeicherte oder begonnene Arbeiten.', 'Eine ausgefüllte Karte zeigt Titel, Fach und Betreuer.', 'Select for Generation wählt die Arbeit als aktives Profil.', 'Continue Work, Open und Edit dienen zum Fortsetzen, Öffnen und Bearbeiten.'],
    pl: ['Menu wraca do głównego menu.', 'Create Empty Profile tworzy pusty profil pracy.', 'New Work otwiera kreator nowej pracy.', 'Wyszukiwanie filtruje według tytułu, dziedziny lub promotora.', 'Karta projektu zawiera typ, tytuł, datę i akcje.', 'Inne karty pokazują zapisane lub rozpoczęte prace.', 'Uzupełniona karta pokazuje tytuł, dziedzinę i promotora.', 'Select for Generation wybiera pracę jako aktywny profil.', 'Continue Work, Open i Edit służą do kontynuacji, otwarcia i edycji.'],
    hu: ['A Menu visszavisz a főmenübe.', 'A Create Empty Profile üres munkaprofilt hoz létre.', 'A New Work megnyitja az új munka varázslót.', 'A keresés cím, terület vagy témavezető szerint szűr.', 'A projektkártya típust, címet, dátumot és gombokat tartalmaz.', 'További kártyák mentett vagy félkész munkákat mutatnak.', 'A kitöltött kártya címet, területet és témavezetőt mutat.', 'A Select for Generation aktív profilnak választja a munkát.', 'A Continue Work, Open és Edit folytatást, megnyitást és szerkesztést jelent.'],
  },
  wizard: {
    sk: ['Ľavý panel ukazuje päť krokov sprievodcu profilom práce.', 'Jazykový prepínač nastavuje jazyk budúcej práce.', 'Horné tlačidlá umožňujú návrat do menu, prázdny profil, uloženie alebo zatvorenie.', 'Hlavný nadpis vysvetľuje aktuálny krok Typ práce.', 'Používateľ si vyberie šablónu práce z ponuky typov.', 'Vybraná šablóna Essay je zvýraznená fialovou farbou.', 'Ďalší krok posunie používateľa na identitu práce.', 'Predchádzajúci krok slúži na návrat v sprievodcovi.'],
    cs: ['Levý panel ukazuje pět kroků průvodce profilem práce.', 'Jazykový přepínač nastavuje jazyk budoucí práce.', 'Horní tlačítka umožňují návrat do menu, prázdný profil, uložení nebo zavření.', 'Hlavní nadpis vysvětluje aktuální krok Typ práce.', 'Uživatel si vybere šablonu práce z nabídky typů.', 'Vybraná šablona Essay je zvýrazněna fialově.', 'Další krok posune uživatele na identitu práce.', 'Předchozí krok slouží k návratu v průvodci.'],
    en: ['The left panel shows five steps of the work profile wizard.', 'The language switch sets the language of the future work.', 'Top buttons allow returning to menu, creating an empty profile, saving or closing.', 'The main heading explains the current Work Type step.', 'The user selects a work template from the type grid.', 'The selected Essay template is highlighted in purple.', 'Next Step moves the user to work identity.', 'Previous Step returns back in the wizard.'],
    de: ['Der linke Bereich zeigt fünf Schritte des Profilassistenten.', 'Der Sprachschalter setzt die Sprache der Arbeit.', 'Obere Schaltflächen führen zum Menü, leerem Profil, Speichern oder Schließen.', 'Die Überschrift erklärt den aktuellen Schritt Typ der Arbeit.', 'Der Benutzer wählt eine Vorlage aus dem Raster.', 'Die gewählte Essay-Vorlage ist violett markiert.', 'Nächster Schritt führt zur Identität der Arbeit.', 'Vorheriger Schritt führt zurück.'],
    pl: ['Lewy panel pokazuje pięć kroków kreatora profilu pracy.', 'Przełącznik języka ustawia język pracy.', 'Górne przyciski pozwalają wrócić do menu, utworzyć pusty profil, zapisać lub zamknąć.', 'Nagłówek wyjaśnia krok Typ pracy.', 'Użytkownik wybiera szablon pracy z siatki.', 'Wybrany Essay jest podświetlony na fioletowo.', 'Następny krok przechodzi do tożsamości pracy.', 'Poprzedni krok wraca w kreatorze.'],
    hu: ['A bal panel a munkaprofil varázsló öt lépését mutatja.', 'A nyelvváltó beállítja a munka nyelvét.', 'A felső gombok menüt, üres profilt, mentést vagy bezárást adnak.', 'A fő cím az aktuális Munkatípus lépést magyarázza.', 'A felhasználó sablont választ a típusok közül.', 'A kiválasztott Essay lila színnel kiemelt.', 'A következő lépés a munka azonosítására visz.', 'Az előző lépés visszalépést jelent.'],
  },
  tool: {
    sk: ['Ľavé menu umožňuje prepínať medzi hlavnými časťami aplikácie.', 'Modulový prepínač hore určuje aktívny nástroj.', 'Fialové zvýraznenie ukazuje vybraný modul.', 'Sekcia Attachments umožňuje nahrať PDF, DOCX, Excel, CSV, PPT alebo obrázky.', 'Veľké vstupné pole je miesto pre text, zadanie, otázku alebo dáta.', 'Hlavné tlačidlo spustí spracovanie vybraného modulu.', 'Doplnkové tlačidlá Dictate, Canvas a Clear pomáhajú s ovládaním vstupu.'],
    cs: ['Levé menu umožňuje přepínat hlavní části aplikace.', 'Přepínač modulů nahoře určuje aktivní nástroj.', 'Fialové zvýraznění ukazuje vybraný modul.', 'Sekce Attachments umožňuje nahrát PDF, DOCX, Excel, CSV, PPT nebo obrázky.', 'Velké vstupní pole je místo pro text, zadání, otázku nebo data.', 'Hlavní tlačítko spustí zpracování vybraného modulu.', 'Doplňková tlačítka Dictate, Canvas a Clear pomáhají s ovládáním vstupu.'],
    en: ['The left menu switches between main application areas.', 'The module switcher at the top selects the active tool.', 'The purple highlight shows the selected module.', 'The Attachments section uploads PDF, DOCX, Excel, CSV, PPT or images.', 'The large input field is where text, assignment, question or data is entered.', 'The main button starts processing with the selected module.', 'Dictate, Canvas and Clear help control the input.'],
    de: ['Das linke Menü wechselt zwischen Hauptbereichen.', 'Der Modulumschalter oben wählt das aktive Werkzeug.', 'Die violette Markierung zeigt das gewählte Modul.', 'Attachments lädt PDF, DOCX, Excel, CSV, PPT oder Bilder hoch.', 'Das große Eingabefeld nimmt Text, Aufgabe, Frage oder Daten auf.', 'Die Hauptschaltfläche startet die Verarbeitung.', 'Dictate, Canvas und Clear steuern die Eingabe.'],
    pl: ['Lewe menu przełącza główne obszary aplikacji.', 'Przełącznik modułów u góry wybiera aktywne narzędzie.', 'Fioletowe podświetlenie pokazuje wybrany moduł.', 'Attachments przesyła PDF, DOCX, Excel, CSV, PPT lub obrazy.', 'Duże pole wejściowe przyjmuje tekst, zadanie, pytanie lub dane.', 'Główny przycisk uruchamia przetwarzanie.', 'Dictate, Canvas i Clear pomagają sterować wejściem.'],
    hu: ['A bal menü vált az alkalmazás fő részei között.', 'A felső modulváltó kiválasztja az aktív eszközt.', 'A lila kiemelés mutatja a kiválasztott modult.', 'Az Attachments PDF, DOCX, Excel, CSV, PPT vagy képeket tölt fel.', 'A nagy beviteli mezőbe szöveg, feladat, kérdés vagy adat kerül.', 'A fő gomb elindítja a feldolgozást.', 'A Dictate, Canvas és Clear segíti a bevitelt.'],
  },
  translation: {
    sk: ['Ľavé menu zostáva dostupné na rýchlu navigáciu.', 'Jazykový riadok určuje zdrojový a cieľový jazyk prekladu.', 'Prepínač modulov ukazuje, že aktívny je modul Translation.', 'Štýl prekladu vyberá prirodzený alebo jednoduchý výsledok.', 'Do poľa sa vkladá text na preklad.', 'Translate text spustí preklad do zvoleného jazyka.'],
    cs: ['Levé menu zůstává dostupné pro rychlou navigaci.', 'Jazykový řádek určuje zdrojový a cílový jazyk překladu.', 'Přepínač modulů ukazuje aktivní Translation.', 'Styl překladu vybírá přirozený nebo jednoduchý výsledek.', 'Do pole se vkládá text k překladu.', 'Translate text spustí překlad do zvoleného jazyka.'],
    en: ['The left menu remains available for fast navigation.', 'The language row defines source and target translation languages.', 'The module switcher shows Translation as active.', 'Translation style selects natural or simple output.', 'The text to translate is inserted into the field.', 'Translate text starts translation into the selected language.'],
    de: ['Das linke Menü bleibt für schnelle Navigation verfügbar.', 'Die Sprachzeile definiert Ausgangs- und Zielsprache.', 'Der Modulumschalter zeigt Translation als aktiv.', 'Der Übersetzungsstil wählt natürliches oder einfaches Ergebnis.', 'Der zu übersetzende Text wird in das Feld eingefügt.', 'Translate text startet die Übersetzung.'],
    pl: ['Lewe menu pozostaje dostępne do szybkiej nawigacji.', 'Wiersz języka określa język źródłowy i docelowy.', 'Przełącznik modułów pokazuje aktywny Translation.', 'Styl tłumaczenia wybiera wynik naturalny lub prosty.', 'Tekst do tłumaczenia wkleja się w pole.', 'Translate text rozpoczyna tłumaczenie.'],
    hu: ['A bal menü gyors navigációhoz elérhető marad.', 'A nyelvi sor beállítja a forrás- és célnyelvet.', 'A modulváltó mutatja, hogy a Translation aktív.', 'A fordítási stílus természetes vagy egyszerű eredményt választ.', 'A fordítandó szöveg a mezőbe kerül.', 'A Translate text elindítja a fordítást.'],
  },
  emails: {
    sk: ['Ľavé menu zachováva rýchly návrat do hlavných častí.', 'Modulový prepínač ukazuje aktívny modul Emails.', 'Email Type vyberá typ správy: školiteľ, vyučujúci, termín, žiadosť alebo ospravedlnenie.', 'Druhá časť nastavuje tón emailu, napríklad urgentný alebo stručný.', 'Do textového poľa používateľ stručne napíše, komu a o čom má email byť.', 'Generate Email vytvorí profesionálny email pripravený na kontrolu a odoslanie.'],
    cs: ['Levé menu zachovává rychlý návrat do hlavních částí.', 'Přepínač modulů ukazuje aktivní Emails.', 'Email Type vybírá typ zprávy: školitel, vyučující, termín, žádost nebo omluva.', 'Druhá část nastavuje tón emailu, například urgentní nebo stručný.', 'Do textového pole uživatel stručně napíše, komu a o čem má email být.', 'Generate Email vytvoří profesionální email ke kontrole a odeslání.'],
    en: ['The left menu keeps fast access to main areas.', 'The module switcher shows Emails as the active module.', 'Email Type selects the message type: supervisor, instructor, deadline, request or apology.', 'The second area sets the email tone, such as urgent or concise.', 'The text field briefly describes who the email is for and what it should contain.', 'Generate Email creates a professional email ready for review and sending.'],
    de: ['Das linke Menü bietet schnellen Zugriff auf Hauptbereiche.', 'Der Modulumschalter zeigt Emails als aktiv.', 'Email Type wählt die Nachrichtenart: Betreuer, Dozent, Frist, Anfrage oder Entschuldigung.', 'Der zweite Bereich setzt den Ton, etwa dringend oder knapp.', 'Im Textfeld wird kurz beschrieben, an wen und worüber die E-Mail geht.', 'Generate Email erstellt eine professionelle E-Mail zur Prüfung.'],
    pl: ['Lewe menu zapewnia szybki dostęp do głównych obszarów.', 'Przełącznik modułów pokazuje aktywny Emails.', 'Email Type wybiera typ wiadomości: promotor, prowadzący, termin, prośba lub przeprosiny.', 'Druga część ustawia ton, np. pilny lub zwięzły.', 'Pole tekstowe krótko opisuje adresata i treść emaila.', 'Generate Email tworzy profesjonalny email do sprawdzenia.'],
    hu: ['A bal menü gyors hozzáférést ad a fő részekhez.', 'A modulváltó az Emails modult mutatja aktívnak.', 'Az Email Type kiválasztja az üzenettípust: témavezető, oktató, határidő, kérés vagy bocsánatkérés.', 'A második rész hangnemet állít, például sürgős vagy tömör.', 'A szövegmező röviden leírja, kinek és miről szól az email.', 'A Generate Email professzionális emailt készít ellenőrzésre.'],
  },
  humanize: {
    "sk": [
        "Ľavé menu zachováva rýchlu orientáciu v celej aplikácii a umožňuje návrat do ostatných modulov.",
        "Modulový prepínač zvýrazňuje Text Humanization ako aktívnu sekciu.",
        "Veľké textové pole slúži na vloženie textu, ktorý má byť prirodzenejší, plynulejší a menej strojový.",
        "Tlačidlo Humanize Text spustí profesionálne prepísanie textu do prirodzeného akademického štýlu.",
        "Dictate umožňuje nadiktovať text hlasom namiesto ručného písania.",
        "Canvas otvorí priestor na pohodlnú prácu s dlhším textom a Clear vymaže aktuálny obsah."
    ],
    "cs": [
        "Levé menu zachovává rychlou orientaci v celé aplikaci a umožňuje návrat do ostatních modulů.",
        "Přepínač modulů zvýrazňuje Text Humanization jako aktivní sekci.",
        "Velké textové pole slouží k vložení textu, který má být přirozenější, plynulejší a méně strojový.",
        "Tlačítko Humanize Text spustí profesionální přepsání textu do přirozeného akademického stylu.",
        "Dictate umožňuje nadiktovat text hlasem místo ručního psaní.",
        "Canvas otevře prostor pro pohodlnou práci s delším textem a Clear vymaže aktuální obsah."
    ],
    "en": [
        "The left menu keeps orientation across the application and allows quick access to other modules.",
        "The module switcher highlights Text Humanization as the active section.",
        "The large text area is used to insert text that should become more natural, fluent and less machine-like.",
        "The Humanize Text button starts a professional rewrite into a natural academic style.",
        "Dictate lets the user input text by voice instead of typing.",
        "Canvas opens a convenient workspace for longer text and Clear removes the current content."
    ],
    "de": [
        "Das linke Menü sorgt für Orientierung in der Anwendung und ermöglicht schnellen Zugriff auf andere Module.",
        "Der Modulumschalter hebt Text Humanization als aktiven Bereich hervor.",
        "Das große Textfeld dient zum Einfügen von Text, der natürlicher, flüssiger und weniger maschinell wirken soll.",
        "Die Schaltfläche Humanize Text startet eine professionelle Umschreibung in einen natürlichen akademischen Stil.",
        "Dictate ermöglicht die Spracheingabe statt manueller Texteingabe.",
        "Canvas öffnet einen komfortablen Arbeitsbereich für längere Texte und Clear löscht den aktuellen Inhalt."
    ],
    "pl": [
        "Lewe menu ułatwia orientację w całej aplikacji i umożliwia szybki dostęp do innych modułów.",
        "Przełącznik modułów wyróżnia Text Humanization jako aktywną sekcję.",
        "Duże pole tekstowe służy do wklejenia tekstu, który ma być bardziej naturalny, płynny i mniej maszynowy.",
        "Przycisk Humanize Text uruchamia profesjonalne przepisanie tekstu w naturalnym stylu akademickim.",
        "Dictate pozwala wprowadzać tekst głosowo zamiast ręcznego pisania.",
        "Canvas otwiera wygodną przestrzeń do pracy z dłuższym tekstem, a Clear usuwa aktualną treść."
    ],
    "hu": [
        "A bal oldali menü segít az alkalmazásban való tájékozódásban és gyors hozzáférést ad más modulokhoz.",
        "A modulváltó a Text Humanization részt jelöli aktív szekcióként.",
        "A nagy szövegmezőbe olyan szöveg kerül, amelyet természetesebbé, gördülékenyebbé és kevésbé gépiessé kell alakítani.",
        "A Humanize Text gomb professzionális átírást indít természetes akadémiai stílusban.",
        "A Dictate lehetővé teszi a szöveg hangalapú bevitelét gépelés helyett.",
        "A Canvas kényelmes munkaterületet nyit hosszabb szöveghez, a Clear törli az aktuális tartalmat."
    ]
},
  sources_page: {
    "sk": [
        "Tlačidlo Menu v hornej lište vráti používateľa späť do hlavného menu aplikácie.",
        "Nadpis Academic Resources & Citations označuje samostatnú sekciu pre literatúru, zdroje a citačné podklady.",
        "Vyhľadávacie pole slúži na zadanie témy práce, kľúčového slova alebo výskumnej otázky.",
        "Odporúčané štítky pomáhajú rýchlo vložiť často používané témy a odborné oblasti.",
        "Filtre PDF Only, Last 2 Years, Last 5 Years a časové intervaly spresňujú typ a aktuálnosť zdrojov.",
        "Tlačidlo Search spustí vyhľadanie akademických zdrojov a Reset vymaže nastavené filtre."
    ],
    "cs": [
        "Tlačítko Menu v horní liště vrátí uživatele zpět do hlavního menu aplikace.",
        "Nadpis Academic Resources & Citations označuje samostatnou sekci pro literaturu, zdroje a citační podklady.",
        "Vyhledávací pole slouží k zadání tématu práce, klíčového slova nebo výzkumné otázky.",
        "Doporučené štítky pomáhají rychle vložit často používaná témata a odborné oblasti.",
        "Filtry PDF Only, Last 2 Years, Last 5 Years a časové intervaly zpřesňují typ a aktuálnost zdrojů.",
        "Tlačítko Search spustí vyhledání akademických zdrojů a Reset vymaže nastavené filtry."
    ],
    "en": [
        "The Menu button in the top bar returns the user to the main application menu.",
        "The Academic Resources & Citations heading identifies the dedicated section for literature, sources and citation material.",
        "The search field is used to enter a paper topic, keyword or research question.",
        "Suggested tags help insert frequent topics and professional areas quickly.",
        "PDF Only, Last 2 Years, Last 5 Years and date-range filters refine the source type and recency.",
        "Search starts the academic source search and Reset clears the selected filters."
    ],
    "de": [
        "Die Menü-Schaltfläche in der oberen Leiste führt zurück zum Hauptmenü der Anwendung.",
        "Die Überschrift Academic Resources & Citations kennzeichnet den Bereich für Literatur, Quellen und Zitationsmaterial.",
        "Das Suchfeld dient zur Eingabe eines Arbeitsthemas, Schlüsselworts oder einer Forschungsfrage.",
        "Vorgeschlagene Tags helfen, häufige Themen und Fachbereiche schnell einzufügen.",
        "PDF Only, Last 2 Years, Last 5 Years und Zeitfilter verfeinern Quellentyp und Aktualität.",
        "Search startet die Suche nach akademischen Quellen und Reset löscht die gesetzten Filter."
    ],
    "pl": [
        "Przycisk Menu w górnym pasku przenosi użytkownika z powrotem do głównego menu aplikacji.",
        "Nagłówek Academic Resources & Citations oznacza sekcję poświęconą literaturze, źródłom i materiałom cytowań.",
        "Pole wyszukiwania służy do wpisania tematu pracy, słowa kluczowego lub pytania badawczego.",
        "Sugerowane tagi pomagają szybko wstawić popularne tematy i obszary specjalistyczne.",
        "Filtry PDF Only, Last 2 Years, Last 5 Years oraz zakresy dat doprecyzowują typ i aktualność źródeł.",
        "Search uruchamia wyszukiwanie źródeł akademickich, a Reset czyści ustawione filtry."
    ],
    "hu": [
        "A felső sáv Menu gombja visszaviszi a felhasználót az alkalmazás főmenüjébe.",
        "Az Academic Resources & Citations cím a szakirodalom, források és hivatkozási anyagok külön szekcióját jelöli.",
        "A keresőmezőbe dolgozati téma, kulcsszó vagy kutatási kérdés írható.",
        "A javasolt címkék segítenek gyakori témák és szakmai területek gyors beszúrásában.",
        "A PDF Only, Last 2 Years, Last 5 Years és dátumszűrők pontosítják a forrás típusát és frissességét.",
        "A Search elindítja az akadémiai forráskeresést, a Reset törli a beállított szűrőket."
    ]
},
  packages_page: {
    "sk": [
        "Horné tlačidlo Menu alebo Back to Menu zabezpečuje návrat späť do hlavného menu.",
        "Úvodný blok Packages and Add-ons vysvetľuje, že balíčky sa vyberajú podľa rozsahu práce a mesačnej záťaže.",
        "START BASIC je vstupný balík pre jeden aktívny projekt a základnú AI podporu.",
        "STUDENT PLUS je zvýraznený ako odporúčaný študentský plán s vyššími limitmi a rozšírenými funkciami.",
        "PRO THESIS je určený pre rozsiahlejšie záverečné práce s prioritným spracovaním.",
        "ELITE ACADEMIC je najvyšší plán pre náročné akademické používanie, viac projektov a prémiovú AI kapacitu."
    ],
    "cs": [
        "Horní tlačítko Menu nebo Back to Menu zajišťuje návrat zpět do hlavního menu.",
        "Úvodní blok Packages and Add-ons vysvětluje, že balíčky se volí podle rozsahu práce a měsíční zátěže.",
        "START BASIC je vstupní balíček pro jeden aktivní projekt a základní AI podporu.",
        "STUDENT PLUS je zvýrazněn jako doporučený studentský plán s vyššími limity a rozšířenými funkcemi.",
        "PRO THESIS je určen pro rozsáhlejší závěrečné práce s prioritním zpracováním.",
        "ELITE ACADEMIC je nejvyšší plán pro náročné akademické použití, více projektů a prémiovou AI kapacitu."
    ],
    "en": [
        "The top Menu or Back to Menu button returns the user to the main menu.",
        "The Packages and Add-ons introduction explains that plans are chosen according to workload and monthly scope.",
        "START BASIC is the entry plan for one active project and basic AI support.",
        "STUDENT PLUS is highlighted as the recommended student plan with higher limits and expanded features.",
        "PRO THESIS is intended for more extensive final projects with priority processing.",
        "ELITE ACADEMIC is the highest plan for demanding academic use, multiple projects and premium AI capacity."
    ],
    "de": [
        "Die obere Schaltfläche Menu oder Back to Menu führt zurück zum Hauptmenü.",
        "Der Einführungsbereich Packages and Add-ons erklärt, dass Pakete nach Arbeitsumfang und monatlicher Nutzung gewählt werden.",
        "START BASIC ist das Einstiegspaket für ein aktives Projekt und grundlegende AI-Unterstützung.",
        "STUDENT PLUS ist als empfohlener Studentenplan mit höheren Limits und erweiterten Funktionen hervorgehoben.",
        "PRO THESIS ist für umfangreichere Abschlussarbeiten mit priorisierter Verarbeitung gedacht.",
        "ELITE ACADEMIC ist der höchste Plan für anspruchsvolle akademische Nutzung, mehrere Projekte und Premium-AI-Kapazität."
    ],
    "pl": [
        "Górny przycisk Menu lub Back to Menu przenosi użytkownika do głównego menu.",
        "Wstęp Packages and Add-ons wyjaśnia, że pakiety wybiera się według obciążenia i miesięcznego zakresu pracy.",
        "START BASIC to pakiet wejściowy dla jednego aktywnego projektu i podstawowej obsługi AI.",
        "STUDENT PLUS jest wyróżniony jako rekomendowany plan studencki z wyższymi limitami i rozszerzonymi funkcjami.",
        "PRO THESIS jest przeznaczony dla większych projektów końcowych z priorytetowym przetwarzaniem.",
        "ELITE ACADEMIC to najwyższy plan dla wymagającego użycia akademickiego, wielu projektów i premium AI."
    ],
    "hu": [
        "A felső Menu vagy Back to Menu gomb visszavisz a főmenübe.",
        "A Packages and Add-ons bevezető elmagyarázza, hogy a csomagokat terhelés és havi munkamennyiség alapján kell kiválasztani.",
        "A START BASIC belépő csomag egy aktív projekthez és alap AI támogatáshoz.",
        "A STUDENT PLUS ajánlott hallgatói csomagként van kiemelve magasabb limitekkel és bővített funkciókkal.",
        "A PRO THESIS nagyobb záróprojektekhez készült prioritásos feldolgozással.",
        "Az ELITE ACADEMIC a legmagasabb csomag igényes akadémiai használathoz, több projekthez és prémium AI kapacitáshoz."
    ]
},
  history_page: {
    "sk": [
        "Nadpis Chat History zobrazuje sekciu uložených konverzácií a predchádzajúcich výstupov.",
        "Return to Menu vráti používateľa do hlavného menu a Refresh obnoví zoznam konverzácií.",
        "Vyhľadávacie pole filtruje históriu podľa názvu, obsahu alebo časti požiadavky.",
        "Panel Uložené konverzácie zobrazuje celkový počet záznamov a zoznam predchádzajúcich výstupov.",
        "Každý záznam obsahuje názov, ukážku používateľskej otázky, ukážku odpovede a dátum vytvorenia.",
        "Akčné tlačidlá pri zázname slúžia na otvorenie, pokračovanie alebo odstránenie konkrétnej konverzácie."
    ],
    "cs": [
        "Nadpis Chat History zobrazuje sekci uložených konverzací a předchozích výstupů.",
        "Return to Menu vrátí uživatele do hlavního menu a Refresh obnoví seznam konverzací.",
        "Vyhledávací pole filtruje historii podle názvu, obsahu nebo části požadavku.",
        "Panel Uložené konverzace zobrazuje celkový počet záznamů a seznam předchozích výstupů.",
        "Každý záznam obsahuje název, ukázku uživatelské otázky, ukázku odpovědi a datum vytvoření.",
        "Akční tlačítka u záznamu slouží k otevření, pokračování nebo odstranění konkrétní konverzace."
    ],
    "en": [
        "The Chat History heading opens the section for saved conversations and previous outputs.",
        "Return to Menu goes back to the main menu and Refresh reloads the conversation list.",
        "The search field filters history by title, content or part of the request.",
        "The Saved conversations panel shows the total record count and the list of previous outputs.",
        "Each record contains a title, user prompt preview, answer preview and creation date.",
        "Action buttons on each record open, continue or delete the selected conversation."
    ],
    "de": [
        "Die Überschrift Chat History öffnet den Bereich für gespeicherte Unterhaltungen und frühere Ausgaben.",
        "Return to Menu führt zum Hauptmenü zurück und Refresh lädt die Liste neu.",
        "Das Suchfeld filtert den Verlauf nach Titel, Inhalt oder Teil der Anfrage.",
        "Der Bereich Gespeicherte Konversationen zeigt Gesamtzahl und Liste früherer Ausgaben.",
        "Jeder Eintrag enthält Titel, Vorschau der Nutzerfrage, Antwortvorschau und Erstellungsdatum.",
        "Die Aktionsschaltflächen öffnen, setzen fort oder löschen die ausgewählte Konversation."
    ],
    "pl": [
        "Nagłówek Chat History otwiera sekcję zapisanych rozmów i wcześniejszych wyników.",
        "Return to Menu wraca do głównego menu, a Refresh odświeża listę rozmów.",
        "Pole wyszukiwania filtruje historię według tytułu, treści lub fragmentu zapytania.",
        "Panel Zapisane konwersacje pokazuje liczbę rekordów i listę wcześniejszych wyników.",
        "Każdy rekord zawiera tytuł, podgląd pytania użytkownika, podgląd odpowiedzi i datę utworzenia.",
        "Przyciski akcji przy rekordzie służą do otwarcia, kontynuacji lub usunięcia rozmowy."
    ],
    "hu": [
        "A Chat History cím a mentett beszélgetések és korábbi eredmények szekcióját nyitja meg.",
        "A Return to Menu visszavisz a főmenübe, a Refresh frissíti a beszélgetéslistát.",
        "A keresőmező cím, tartalom vagy kérésrészlet alapján szűri az előzményeket.",
        "A Mentett beszélgetések panel mutatja az összes rekordot és a korábbi eredmények listáját.",
        "Minden rekord címet, felhasználói kérdés előnézetet, válasz előnézetet és létrehozási dátumot tartalmaz.",
        "A rekord melletti akciógombok megnyitják, folytatják vagy törlik a kiválasztott beszélgetést."
    ]
},
  video_page: {
    "sk": [
        "Tlačidlo Menu alebo Back to menu slúži na návrat z video návodov do aplikácie.",
        "Horný nadpis Professional Zedpera manuals označuje centrum všetkých používateľských manuálov.",
        "Panel Now Playing ukazuje práve vybraný video manuál, jeho kategóriu, jazyk a dĺžku.",
        "Tlačidlo Open video otvorí vybrané video v samostatnom okne pre pohodlné sledovanie.",
        "Sekcia Manual scenario and steps zobrazuje textový scenár videa a presné kroky manuálu.",
        "Zoznam krokov umožňuje používateľovi prejsť manuál aj bez videa a skontrolovať postup práce."
    ],
    "cs": [
        "Tlačítko Menu nebo Back to menu slouží k návratu z video návodů do aplikace.",
        "Horní nadpis Professional Zedpera manuals označuje centrum všech uživatelských návodů.",
        "Panel Now Playing ukazuje právě vybraný video návod, jeho kategorii, jazyk a délku.",
        "Tlačítko Open video otevře vybrané video v samostatném okně pro pohodlné sledování.",
        "Sekce Manual scenario and steps zobrazuje textový scénář videa a přesné kroky návodu.",
        "Seznam kroků umožňuje uživateli projít návod i bez videa a zkontrolovat pracovní postup."
    ],
    "en": [
        "The Menu or Back to menu button returns from video guides to the application.",
        "The Professional Zedpera manuals heading identifies the center for all user manuals.",
        "The Now Playing panel shows the selected video guide, category, language and duration.",
        "The Open video button opens the selected video in a separate window for comfortable viewing.",
        "Manual scenario and steps displays the written scenario and exact manual steps.",
        "The step list lets the user follow the guide even without video and verify the workflow."
    ],
    "de": [
        "Die Schaltfläche Menu oder Back to menu führt aus den Videoanleitungen zurück zur Anwendung.",
        "Die Überschrift Professional Zedpera manuals kennzeichnet das Zentrum aller Benutzeranleitungen.",
        "Der Bereich Now Playing zeigt die gewählte Videoanleitung, Kategorie, Sprache und Dauer.",
        "Open video öffnet das ausgewählte Video in einem separaten Fenster.",
        "Manual scenario and steps zeigt das schriftliche Szenario und die genauen Anleitungsschritte.",
        "Die Schrittliste ermöglicht, die Anleitung auch ohne Video zu verfolgen und den Ablauf zu prüfen."
    ],
    "pl": [
        "Przycisk Menu lub Back to menu wraca z instrukcji wideo do aplikacji.",
        "Nagłówek Professional Zedpera manuals oznacza centrum wszystkich instrukcji użytkownika.",
        "Panel Now Playing pokazuje wybraną instrukcję wideo, kategorię, język i czas trwania.",
        "Przycisk Open video otwiera wybrane wideo w osobnym oknie dla wygodnego oglądania.",
        "Sekcja Manual scenario and steps pokazuje pisemny scenariusz i dokładne kroki instrukcji.",
        "Lista kroków pozwala przejść instrukcję także bez wideo i sprawdzić proces pracy."
    ],
    "hu": [
        "A Menu vagy Back to menu gomb a videó útmutatókból visszavisz az alkalmazásba.",
        "A Professional Zedpera manuals cím az összes felhasználói útmutató központját jelöli.",
        "A Now Playing panel az aktuálisan kiválasztott videó útmutatót, kategóriát, nyelvet és időtartamot mutatja.",
        "Az Open video gomb külön ablakban nyitja meg a kiválasztott videót kényelmes megtekintéshez.",
        "A Manual scenario and steps szekció a videó írott forgatókönyvét és pontos lépéseit mutatja.",
        "A lépéslista videó nélkül is követhetővé teszi az útmutatót és ellenőrizhetővé a munkafolyamatot."
    ]
},
  generic: {
    sk: ['Ľavé menu slúži na rýchle prepínanie modulov.', 'Horný panel zobrazuje názov a účel vybranej sekcie.', 'Prvá karta ukazuje hlavné informácie a dostupné možnosti.', 'Druhá karta ukazuje doplnkové nastavenia alebo stav.', 'Hlavná pracovná plocha obsahuje výstupy, zoznamy alebo odporúčania.', 'Používateľ môže výsledok uložiť, otvoriť alebo sa vrátiť do menu.'],
    cs: ['Levé menu slouží k rychlému přepínání modulů.', 'Horní panel zobrazuje název a účel vybrané sekce.', 'První karta ukazuje hlavní informace a dostupné možnosti.', 'Druhá karta ukazuje doplňková nastavení nebo stav.', 'Hlavní pracovní plocha obsahuje výstupy, seznamy nebo doporučení.', 'Uživatel může výsledek uložit, otevřít nebo se vrátit do menu.'],
    en: ['The left menu quickly switches modules.', 'The top panel shows the name and purpose of the selected section.', 'The first card shows main information and available options.', 'The second card shows additional settings or status.', 'The main workspace contains outputs, lists or recommendations.', 'The user can save, open or return to the menu.'],
    de: ['Das linke Menü wechselt schnell zwischen Modulen.', 'Der obere Bereich zeigt Name und Zweck der Sektion.', 'Die erste Karte zeigt Hauptinformationen und Optionen.', 'Die zweite Karte zeigt weitere Einstellungen oder Status.', 'Der Hauptbereich enthält Ausgaben, Listen oder Empfehlungen.', 'Der Benutzer kann speichern, öffnen oder zum Menü zurückkehren.'],
    pl: ['Lewe menu szybko przełącza moduły.', 'Górny panel pokazuje nazwę i cel sekcji.', 'Pierwsza karta pokazuje główne informacje i opcje.', 'Druga karta pokazuje dodatkowe ustawienia lub status.', 'Główna przestrzeń zawiera wyniki, listy lub rekomendacje.', 'Użytkownik może zapisać, otworzyć lub wrócić do menu.'],
    hu: ['A bal menü gyorsan vált modulok között.', 'A felső panel a szekció nevét és célját mutatja.', 'Az első kártya fő információkat és lehetőségeket mutat.', 'A második kártya kiegészítő beállításokat vagy állapotot mutat.', 'A fő munkaterület eredményeket, listákat vagy ajánlásokat tartalmaz.', 'A felhasználó menthet, megnyithat vagy visszatérhet a menübe.'],
  },
};

function stepKeyForScreen(screen) {
  if (screen === 'profile') return 'profile';
  if (screen === 'ai_chat') return 'ai_chat';
  if (screen === 'projects') return 'projects';
  if (screen === 'wizard') return 'wizard';
  if (screen === 'tool_translation') return 'translation';
  if (screen === 'tool_emails') return 'emails';
  if (screen === 'tool_humanize') return 'humanize';
  if (screen === 'sources_page') return 'sources_page';
  if (screen === 'packages_page') return 'packages_page';
  if (screen === 'history_page') return 'history_page';
  if (screen === 'video_page') return 'video_page';
  if (screen.startsWith('tool_')) return 'tool';
  return 'generic';
}

function slidesForManual(manual, lang) {
  const ui = UI[lang];
  const title = t(manual.title, lang);
  const purpose = t(manual.purpose, lang);
  if (manual.screen === 'menu') {
    return [
      { kind: 'intro', title, text: purpose },
      ...visibleModules().map((module) => ({ kind: 'menu-card', manualNumber: module.n, title: `${module.n}. ${t(module.title, lang)}`, text: `${t(CATEGORIES[module.category], lang)}: ${t(module.purpose, lang)}` })),
      { kind: 'final', title: ui.finalTitle, text: ui.finalText },
    ];
  }
  const key = stepKeyForScreen(manual.screen);
  const list = STEP_TEXT[key][lang] || STEP_TEXT[key].en;
  return [
    { kind: 'intro', title, text: purpose },
    ...list.map((text, index) => ({ kind: 'screen-step', targetIndex: index, title: `${ui.step} ${index + 1} ${ui.of} ${list.length}`, text })),
    { kind: 'final', title: ui.finalTitle, text: ui.finalText },
  ];
}

function writeSubtitles(manual, lang, slides, seconds) {
  const blocks = slides.map((slide, index) => {
    const start = index * seconds;
    const end = (index + 1) * seconds - 0.1;
    return [String(index + 1), `${srtTime(start)} --> ${srtTime(end)}`, `${slide.title}\n${slide.text}`, ''].join('\n');
  });
  const srt = blocks.join('\n');
  const vtt = `WEBVTT\n\n${srt.replace(/,(\d{3})/g, '.$1')}`;
  writeText(path.join(videoRoot, lang, `${manual.slug}.srt`), srt);
  writeText(path.join(videoRoot, lang, `${manual.slug}.vtt`), vtt);
}

function drawAppChrome(filters) {
  box(filters, 0, 0, W, H, '0x020617', 'fill');
  box(filters, 0, 0, W, 12, '0x0f766e', 'fill');
}

function drawSideNav(filters, lang, regular, bold, accent, active = 'menu') {
  const ui = UI[lang];
  box(filters, 0, 12, 270, 686, '0x050816@0.98', 'fill');
  box(filters, 270, 12, 1, 686, '0x1f2937', 'fill');
  const items = [
    ['menu', ui.menu, 'Application Overview'], ['profile', ui.profile, 'Client Account, Plan, and Services'], ['ai_chat', ui.aiChat, 'Text Writing and Editing'],
    ['my_work', ui.myWork, 'Works in Progress'], ['resources', ui.resources, 'Literature and Citations'], ['packages', ui.packages, 'Subscription and Add-ons'],
    ['history', ui.history, 'Saved Conversations and Outputs'], ['video', ui.video, 'Usage Guide'], ['logout', ui.logout, ''],
  ];
  items.forEach(([key, title, sub], index) => {
    const y = 34 + index * 68;
    const isActive = key === active;
    if (isActive) box(filters, 18, y - 6, 236, 58, '0x272b35@0.98', 'fill');
    box(filters, 40, y + 6, 32, 32, isActive ? '0x3b4250' : '0x050816', 'fill');
    box(filters, 51, y + 17, 10, 10, 'white@0.85', 2);
    drawText(filters, { font: bold, text: title, color: 'white', size: isActive ? 18 : 17, x: 88, y: y + 5 });
    if (sub) drawText(filters, { font: bold, text: wrap(sub, 26), color: '0xe2e8f0', size: 12, x: 88, y: y + 30, lineSpacing: 2 });
  });
  drawText(filters, { font: bold, text: '© 2026 Zedpera', color: 'white', size: 12, x: 28, y: 680 });
}

function drawModuleSwitcher(filters, active, regular, bold, accent) {
  const x0 = 305, y0 = 58, gap = 14, w = 330, h = 38;
  const items = [
    ['tool_supervisor', 'AI Supervisor'], ['tool_data', 'Data Analysis'],
    ['tool_quality', 'Quality Audit'], ['tool_planning', 'Planning'],
    ['tool_defense', 'Defense'], ['tool_emails', 'Emails'],
    ['tool_translation', 'Translation'], ['tool_humanize', 'Text Humanization'],
  ];
  items.forEach(([key, label], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = x0 + col * (w + gap);
    const y = y0 + row * (h + 10);
    const isActive = key === active;
    box(filters, x, y, w, h, isActive ? accent : '0x111827@0.98', 'fill');
    box(filters, x, y, w, h, isActive ? '0xc084fc' : '0x334155@0.9', isActive ? 3 : 2);
    drawText(filters, { font: bold, text: label, color: 'white', size: 16, x: x + 110, y: y + 10 });
  });
}

function drawMenuScreen(filters, lang, activeManual, regular, bold, accent, soft) {
  drawAppChrome(filters);
  const layout = menuLayout();
  layout.forEach((item) => {
    const manual = item.manual;
    const isActive = activeManual && activeManual.n === manual.n;
    box(filters, item.x, item.y, item.w, item.h, isActive ? '0x24113f@0.98' : '0x0f172a@0.97', 'fill');
    box(filters, item.x, item.y, item.w, item.h, isActive ? accent : '0x334155@0.9', isActive ? 4 : 2);
    box(filters, item.x + 24, item.y + 22, 44, 44, isActive ? accent : '0x293241', 'fill');
    box(filters, item.x + 35, item.y + 33, 22, 22, 'white@0.18', 2);
    drawText(filters, { font: bold, text: `${manual.n}. ${t(manual.title, lang)}`, color: 'white', size: 19, x: item.x + 88, y: item.y + 16 });
    drawText(filters, { font: bold, text: t(CATEGORIES[manual.category], lang), color: soft, size: 13, x: item.x + 88, y: item.y + 42 });
    drawText(filters, { font: regular, text: wrap(t(manual.purpose, lang), 42), color: '0xe2e8f0', size: 12, x: item.x + 88, y: item.y + 60, lineSpacing: 2 });
    box(filters, item.x + item.w - 76, item.y + 14, 58, 20, '0x050816@0.85', 'fill');
    drawText(filters, { font: bold, text: `${manual.cardSeconds}s`, color: 'white', size: 10, x: item.x + item.w - 62, y: item.y + 19 });
  });
}

function drawProfileScreen(filters, lang, regular, bold, accent, soft) {
  drawAppChrome(filters);
  box(filters, 70, 36, 1090, 120, '0x0f172a@0.98', 'fill'); box(filters, 70, 36, 1090, 120, '0x334155@0.9', 2);
  box(filters, 102, 78, 48, 48, accent, 'fill');
  drawText(filters, { font: bold, text: 'CLIENT ACCOUNT', color: soft, size: 12, x: 172, y: 52 });
  drawText(filters, { font: bold, text: 'Client Account and Services', color: 'white', size: 30, x: 172, y: 76 });
  drawText(filters, { font: regular, text: 'Client profile displays account, package, service status, credits, projects, subscriptions, and access dates.', color: '0xcbd5e1', size: 14, x: 172, y: 116 });
  box(filters, 680, 68, 138, 44, '0x111827', 'fill'); drawText(filters, { font: bold, text: 'Return to Menu', color: 'white', size: 12, x: 704, y: 82 });
  box(filters, 834, 68, 128, 44, accent, 'fill'); drawText(filters, { font: bold, text: 'Refresh Data', color: 'white', size: 12, x: 860, y: 82 });
  box(filters, 980, 68, 174, 44, '0x3b0b18', 'fill'); drawText(filters, { font: bold, text: 'Cancel Subscription', color: 'white', size: 12, x: 1005, y: 82 });
  const cards = [['CLIENT','Admin','admin@zedpera.com'], ['PLAN','Free Plan','Account Status: Active'], ['CREDITS','0 remaining','Total: 0 · used: 0'], ['PROJECTS','0','Limit: 0']];
  cards.forEach((c, i) => { const x = 72 + i * 278; box(filters, x, 186, 260, 80, '0x111827@0.98', 'fill'); box(filters, x, 186, 260, 80, '0x334155@0.9', 2); iconBox(filters, x + 20, 206, accent); drawText(filters, { font: bold, text: c[0], color: '0xcbd5e1', size: 11, x: x + 78, y: 206 }); drawText(filters, { font: bold, text: c[1], color: 'white', size: 18, x: x + 78, y: 226 }); drawText(filters, { font: regular, text: c[2], color: '0xcbd5e1', size: 11, x: x + 78, y: 250 }); });
  box(filters, 72, 290, 672, 214, '0x0b1020@0.98', 'fill'); box(filters, 72, 290, 672, 214, '0x334155@0.9', 2);
  drawText(filters, { font: bold, text: 'Client Details', color: 'white', size: 20, x: 102, y: 314 }); drawText(filters, { font: regular, text: 'Basic account, plan, and client settings.', color: '0xcbd5e1', size: 13, x: 102, y: 340 });
  ['NAME  Admin','EMAIL  admin@zedpera.com','ROLE  user','LANGUAGE  en','ACCOUNT STATUS  active','PLAN  Free','SELECTED PLAN  Free','SUBSCRIPTION  unknown','LAST LOAD  25. 06. 2026 06:02'].forEach((row, i) => drawText(filters, { font: regular, text: row, color: i % 2 ? '0xe2e8f0' : 'white', size: 12, x: 102, y: 372 + i * 20 }));
  box(filters, 72, 516, 672, 70, '0x3b0b18@0.92', 'fill'); drawText(filters, { font: bold, text: 'Subscription Management', color: 'white', size: 14, x: 102, y: 532 }); drawText(filters, { font: regular, text: 'Auto-renewal will be turned off and access remains until the end of the paid period.', color: 'white', size: 12, x: 102, y: 554 }); box(filters, 620, 536, 100, 30, '0xef0000', 'fill'); drawText(filters, { font: bold, text: 'Cancel', color: 'white', size: 11, x: 650, y: 544 });
  [['Activated Services','Modules and services available to the client.'], ['Enabled Features','Features available for this client account.'], ['Subscription & Access','Subscription and last access dates.']].forEach((c, i) => { const y = 290 + i * 106; const h = i === 2 ? 116 : 88; box(filters, 790, y, 370, h, '0x0b1020@0.98', 'fill'); box(filters, 790, y, 370, h, '0x334155@0.9', 2); iconBox(filters, 812, y + 20, accent); drawText(filters, { font: bold, text: c[0], color: 'white', size: 17, x: 870, y: y + 20 }); drawText(filters, { font: regular, text: wrap(c[1], 35), color: '0xcbd5e1', size: 12, x: 870, y: y + 45, lineSpacing: 2 }); });
  box(filters, 72, 632, 1090, 58, '0x111827@0.96', 'fill'); box(filters, 72, 632, 1090, 58, '0x334155@0.9', 2); drawText(filters, { font: bold, text: 'CONTACT  admin@zedpera.com        ACCESS  user        UPDATED  Not specified', color: 'white', size: 14, x: 110, y: 654 });
}

function drawAiChatScreen(filters, lang, manual, regular, bold, accent) {
  drawAppChrome(filters);
  box(filters, 40, 66, 130, 54, '0x181b26', 'fill'); box(filters, 40, 66, 130, 54, '0x374151', 2); drawText(filters, { font: bold, text: '⌂  Menu', color: 'white', size: 18, x: 62, y: 84 });
  box(filters, 1040, 64, 188, 52, accent, 'fill'); drawText(filters, { font: bold, text: '+ New Chat', color: 'white', size: 22, x: 1084, y: 82 });
  line(filters, 0, 132, W, 1, '0x1f2937'); box(filters, 36, 142, 260, 50, '0x101827', 'fill'); box(filters, 36, 142, 260, 50, '0x334155', 2); drawText(filters, { font: bold, text: 'Active Profile: Untitled', color: 'white', size: 15, x: 56, y: 160 });
  box(filters, 28, 210, 1224, 300, '0x050816@0.95', 'fill'); box(filters, 28, 210, 1224, 300, '0x1f2937', 2);
  const quick = [['Suggest an introduction','Write an abstract','Suggest chapter outline'], ['Write chapter draft','Process sources and citations','Rewrite text academically']];
  quick.forEach((row, r) => row.forEach((label, c) => { const x = 170 + c * 305; const y = 288 + r * 80; box(filters, x, y, 285, 64, '0x181b26', 'fill'); box(filters, x, y, 285, 64, '0x374151', 2); iconBox(filters, x + 18, y + 12, accent); drawText(filters, { font: bold, text: label, color: 'white', size: 15, x: x + 76, y: y + 24 }); }));
  box(filters, 170, 520, 940, 142, '0x160a33@0.96', 'fill'); box(filters, 170, 520, 940, 142, '0x5b21b6', 2);
  ['MODEL','Gemini','OPEN AI','Claude','Mistral','Grok'].forEach((label, i) => { const x = 190 + i * 100; box(filters, x, 540, i === 1 ? 92 : 82, 34, i === 1 ? accent : '0x1f1d31', 'fill'); drawText(filters, { font: bold, text: label, color: 'white', size: 14, x: x + 18, y: 550 }); });
  box(filters, 200, 590, 740, 58, '0x06111f', 'fill'); drawText(filters, { font: bold, text: 'Napíšte správu...', color: '0x94a3b8', size: 18, x: 226, y: 610 });
  box(filters, 956, 590, 54, 54, '0x2a2140', 'fill'); drawText(filters, { font: bold, text: '🎙', color: 'white', size: 18, x: 972, y: 606 });
  box(filters, 1026, 590, 54, 54, accent, 'fill'); drawText(filters, { font: bold, text: '➤', color: 'white', size: 22, x: 1044, y: 604 });
}

function drawProjectsScreen(filters, lang, manual, regular, bold, accent) {
  drawAppChrome(filters);
  box(filters, 76, 70, 118, 52, '0x181b26', 'fill'); box(filters, 76, 70, 118, 52, '0x374151', 2); drawText(filters, { font: bold, text: '⌂ Menu', color: 'white', size: 18, x: 102, y: 86 });
  box(filters, 210, 70, 230, 52, '0x181b26', 'fill'); box(filters, 210, 70, 230, 52, '0x374151', 2); drawText(filters, { font: bold, text: 'Create Empty Profile', color: 'white', size: 17, x: 252, y: 86 });
  box(filters, 458, 70, 162, 52, accent, 'fill'); drawText(filters, { font: bold, text: '+ New Work', color: 'white', size: 18, x: 498, y: 86 });
  box(filters, 765, 70, 360, 52, '0x0f172a', 'fill'); box(filters, 765, 70, 360, 52, '0x334155', 2); drawText(filters, { font: bold, text: 'Search by title, field, supervisor...', color: '0x94a3b8', size: 15, x: 810, y: 87 });
  const cards = [
    ['Essay','Untitled','03. 06. 2026 17:14','','',80,174,370,300],
    ['Rigorosum Thesis','Untitled','03. 06. 2026 17:13','','',465,174,370,300],
    ['Dissertation','Nutritional Significance of\nCereal Proteins and Their...','09. 05. 2026 07:35','Food Science','Horák',850,174,370,360],
  ];
  cards.forEach(([tag,title,date,field,supervisor,x,y,w,h]) => {
    box(filters, x, y, w, h, '0x0f172a@0.98', 'fill'); box(filters, x, y, w, h, '0x334155@0.9', 2);
    box(filters, x+22, y+26, 120, 32, '0x2d1655', 'fill'); drawText(filters, { font: bold, text: 'Move Card', color: 'white', size: 13, x: x+54, y: y+35 });
    iconBox(filters, x+24, y+78, accent); box(filters, x+w-112, y+78, 84, 24, '0x2d1655', 'fill'); drawText(filters, { font: bold, text: tag, color: 'white', size: 13, x: x+w-96, y: y+83 });
    drawText(filters, { font: bold, text: title, color: 'white', size: 24, x: x+24, y: y+140, lineSpacing: 6 }); drawText(filters, { font: bold, text: date, color: 'white', size: 15, x: x+24, y: y+205 });
    if (field) drawText(filters, { font: bold, text: `${field}\n${supervisor}`, color: 'white', size: 15, x: x+24, y: y+232, lineSpacing: 8 });
    box(filters, x+24, y+h-104, 190, 34, accent, 'fill'); drawText(filters, { font: bold, text: 'Select for Generation', color: 'white', size: 15, x: x+42, y: y+h-95 });
    box(filters, x+24, y+h-58, 156, 34, '0x1d63ff', 'fill'); drawText(filters, { font: bold, text: 'Continue Work', color: 'white', size: 15, x: x+42, y: y+h-49 });
    box(filters, x+190, y+h-58, 74, 34, '0x181b26', 'fill'); box(filters, x+190, y+h-58, 74, 34, '0x374151', 2); drawText(filters, { font: bold, text: 'Open', color: 'white', size: 14, x: x+220, y: y+h-49 });
    box(filters, x+278, y+h-58, 70, 34, '0x21163a', 'fill'); box(filters, x+278, y+h-58, 70, 34, '0x3b2b5f', 2); drawText(filters, { font: bold, text: 'Edit', color: 'white', size: 14, x: x+300, y: y+h-49 });
  });
}

function drawWizardScreen(filters, lang, manual, regular, bold, accent) {
  drawAppChrome(filters);
  drawText(filters, { font: bold, text: 'WIZARD PROFIL PRÁCE', color: 'white', size: 16, x: 76, y: 22 });
  box(filters, 76, 38, 230, 44, '0x1b1733', 'fill'); box(filters, 76, 38, 230, 44, '0x4c1d95', 2); drawText(filters, { font: bold, text: 'Aktuálny jazyk: EN · English', color: 'white', size: 14, x: 96, y: 52 });
  [['⌂ Menu',920], ['+ Empty Profile',1012], ['💾 Uložiť',1142]].forEach(([label,x]) => { box(filters, x, 22, 100, 48, label.includes('Uložiť') ? '0x1d63ff' : '0x111827', 'fill'); box(filters, x, 22, 100, 48, '0x334155', 2); drawText(filters, { font: bold, text: label, color: 'white', size: 14, x: x+18, y: 38 }); });
  box(filters, 1248, 22, 40, 48, '0xef4444', 'fill');
  box(filters, 0, 90, 270, 530, '0x050816', 'fill'); box(filters, 270, 90, 1, 530, '0x1f2937', 'fill');
  [['1. Typ práce','Výber šablóny',0], ['2. Identita práce','Názov, odbor, jazyk',1], ['3. Výskumné nastavenie','Cieľ a metodológia',2], ['4. Norma a štruktúra','Povinné časti',3], ['5. Kontrola a uloženie','Finálny profil',4]].forEach(([title,sub,i]) => { const y=115+i*86; box(filters,12,y,250,68,i===0?'0x2a0f55':'0x111827','fill'); box(filters,12,y,250,68,i===0?'0x6d28d9':'0x334155',2); iconBox(filters,28,y+14,accent); drawText(filters,{font:bold,text:title,color:'white',size:16,x:86,y:y+18}); drawText(filters,{font:bold,text:sub,color:'0xe2e8f0',size:12,x:86,y:y+42}); });
  box(filters, 292, 110, 940, 430, '0x050816@0.98', 'fill'); box(filters, 292, 110, 940, 430, '0x334155@0.9', 2);
  drawText(filters, { font: bold, text: 'WIZARD PROFIL PRÁCE', color: '0xe9d5ff', size: 14, x: 312, y: 132 }); drawText(filters, { font: bold, text: 'Typ práce', color: 'white', size: 34, x: 312, y: 160 }); drawText(filters, { font: bold, text: 'Vyber šablónu. Po kliknutí sa nastaví typ práce, rozsah, štruktúra a citačná norma.', color: 'white', size: 14, x: 312, y: 205 });
  const types = ['Essay','Seminar Paper','Term Paper',"Bachelor's Thesis","Master's Thesis",'Rigorosum Thesis','Dissertation','Habilitačná práca','SOČ / odborná\nstredoškolská práca','Prípadová štúdia','Výskumná štúdia','Odborný článok','Reflection','Projektová práca','Podnikateľský plán','Technical Report','Laboratórny protokol','Návrh záverečnej práce'];
  types.forEach((label, i) => { const col = i % 6; const row = Math.floor(i/6); const x = 312 + col*150; const y = 230 + row*86; box(filters,x,y,140,72,i===0?accent:'0x111827','fill'); box(filters,x,y,140,72,'0x334155',2); drawText(filters,{font:bold,text:label,color:'white',size:13,x:x+10,y:y+14,lineSpacing:3}); drawText(filters,{font:bold,text:i===0?'3 – 8 strán':'10 – 50 strán',color:'0xe2e8f0',size:11,x:x+10,y:y+50}); });
  box(filters, 20, 642, 180, 50, '0x181b26', 'fill'); box(filters, 20, 642, 180, 50, '0x374151', 2); drawText(filters,{font:bold,text:'Predchádzajúci krok',color:'white',size:15,x:40,y:658});
  box(filters, 1080, 642, 150, 50, '0x1d63ff', 'fill'); drawText(filters,{font:bold,text:'Ďalší krok',color:'white',size:17,x:1110,y:658});
  box(filters, 610, 660, 36, 8, accent, 'fill'); [0,1,2,3].forEach((_,i)=>box(filters, 660+i*22,660,10,10,'0x4b5563','fill'));
}

function toolActiveKey(screen) {
  const map = { tool_supervisor:'tool_supervisor', tool_quality:'tool_quality', tool_defense:'tool_defense', tool_translation:'tool_translation', tool_data:'tool_data', tool_planning:'tool_planning', tool_emails:'tool_emails', tool_humanize:'tool_humanize' };
  return map[screen] || 'tool_supervisor';
}
function actionForScreen(screen) {
  return {
    tool_supervisor: 'Run AI Supervisor', tool_quality: 'Run Quality Audit', tool_defense: 'Generate Presentation Text', tool_translation: 'Translate text', tool_data: 'Analyze Data', tool_planning: 'Start Planning', tool_emails: 'Generate Email', tool_humanize: 'Humanize Text',
  }[screen] || 'Generate Result';
}
function placeholderForScreen(screen) {
  return {
    tool_supervisor: 'Insert your paper text, chapter, assignment, question, or section that the AI Supervisor should review.',
    tool_quality: 'Insert a chapter, introduction, conclusion, or full paper section you want to review.',
    tool_defense: 'Insert your thesis text, abstract, conclusion, committee questions, or defense requirements.',
    tool_translation: 'Insert the text you want to translate into the selected target language.',
    tool_data: 'Describe what the system should do with the data, such as frequency analysis, descriptive statistics, charts, correlations, tests, and interpretation.',
    tool_planning: 'Enter the submission deadline, current progress, and requested plan. The deadline must not be in the past.',
    tool_emails: 'Write who the email is for and what it should contain. A short description is enough.',
    tool_humanize: 'Paste text that should be rewritten into a natural academic style.',
  }[screen] || 'Insert text or instructions for the selected module.';
}

function drawToolScreen(filters, lang, manual, regular, bold, accent) {
  drawAppChrome(filters); drawSideNav(filters, lang, regular, bold, accent, 'menu');
  const active = toolActiveKey(manual.screen);
  if (manual.screen === 'tool_translation') {
    drawTranslationExtras(filters, regular, bold, accent);
    drawModuleSwitcher(filters, active, regular, bold, accent);
    box(filters, 300, 306, 930, 84, '0x061c2a@0.98', 'fill'); box(filters, 300, 306, 930, 84, '0x0e7490', 2);
    box(filters, 330, 324, 320, 52, '0x06111f', 'fill'); drawText(filters,{font:bold,text:'Natural',color:'white',size:15,x:344,y:332}); drawText(filters,{font:bold,text:'Fluent and natural language',color:'0xe2e8f0',size:12,x:344,y:354});
    box(filters, 670, 324, 320, 52, '0x06111f', 'fill'); drawText(filters,{font:bold,text:'Simple',color:'white',size:15,x:684,y:332}); drawText(filters,{font:bold,text:'Simple and understandable text',color:'0xe2e8f0',size:12,x:684,y:354});
    drawInputAndButtons(filters, regular, bold, accent, manual.screen, 420, 210, true);
    return;
  }
  drawModuleSwitcher(filters, active, regular, bold, accent);
  if (manual.screen === 'tool_humanize') {
    drawInputAndButtons(filters, regular, bold, accent, manual.screen, 320, 230, true);
    return;
  }
  let yOffset = 248;
  if (manual.screen === 'tool_planning') { box(filters, 300, 248, 930, 42, '0x261408@0.98', 'fill'); box(filters, 300, 248, 930, 42, '0x78350f', 2); drawText(filters,{font:bold,text:"Today's Date: 25. 06. 2026.",color:'white',size:15,x:318,y:262}); yOffset = 320; }
  box(filters, 300, yOffset, 930, 78, '0x050816@0.98', 'fill'); box(filters, 300, yOffset, 930, 78, '0x334155', 2); drawText(filters,{font:bold,text:'Attachments',color:'white',size:18,x:318,y:yOffset+20}); drawText(filters,{font:bold,text:'Upload PDF, DOCX, TXT, Excel, CSV, PPT or images. When analyzing data, the system will open results in a separate modal window.',color:'white',size:12,x:318,y:yOffset+46}); box(filters, 1080, yOffset+18, 130, 42, '0x23163c', 'fill'); box(filters, 1080, yOffset+18, 130, 42, '0x4c1d95', 2); drawText(filters,{font:bold,text:'Attach File',color:'white',size:16,x:1104,y:yOffset+30});
  let inputY = yOffset + 98;
  if (manual.screen === 'tool_emails') { drawEmailsExtras(filters, regular, bold, accent); inputY = 460; }
  else if (manual.screen === 'tool_data') { drawDataExtras(filters, regular, bold, accent); inputY = yOffset + 98; }
  drawInputAndButtons(filters, regular, bold, accent, manual.screen, inputY, manual.screen === 'tool_emails' ? 110 : 220, false);
}

function drawTranslationExtras(filters, regular, bold, accent) {
  box(filters, 300, 32, 930, 28, '0x07162a', 'fill'); drawText(filters,{font:bold,text:'Source Language: English        Target Language: Hungarian',color:'white',size:12,x:320,y:38}); box(filters, 818, 32, 390, 28, accent, 'fill'); drawText(filters,{font:bold,text:'Hungarian',color:'white',size:12,x:850,y:38});
}
function drawEmailsExtras(filters, regular, bold, accent) {
  box(filters, 300, 248, 930, 200, '0x2a0b22@0.96', 'fill'); box(filters, 300, 248, 930, 200, '0x334155', 2); drawText(filters,{font:bold,text:'Emails',color:'white',size:20,x:318,y:268}); drawText(filters,{font:bold,text:'EMAIL TYPE',color:'0xe9d5ff',size:13,x:330,y:306});
  const types = [['Email to Thesis Supervisor','Message to Supervisor or Consultant'], ['Email to Instructor','Formal Message to Educator'], ['Consultation Request','Schedule Consultation'], ['Deadline / Submission','Deadline Communication'], ['Request','Formal or Administrative Request'], ['Apology','Polite and Professional Apology']];
  types.forEach((item,i)=>{ const col=i%2; const row=Math.floor(i/2); const x=330+col*430; const y=330+row*58; box(filters,x,y,410,46,i===0?accent:'0x06111f','fill'); box(filters,x,y,410,46,'0x334155',2); drawText(filters,{font:bold,text:item[0],color:'white',size:14,x:x+14,y:y+12}); drawText(filters,{font:bold,text:item[1],color:'0xe2e8f0',size:11,x:x+14,y:y+30}); });
  box(filters, 330, 468, 410, 46, '0x06111f','fill'); drawText(filters,{font:bold,text:'Urgent',color:'white',size:14,x:344,y:480}); drawText(filters,{font:bold,text:'Urgent Email with Clear Priority',color:'0xe2e8f0',size:11,x:344,y:500});
  box(filters, 760, 468, 410, 46, '0x06111f','fill'); drawText(filters,{font:bold,text:'Concise and factual',color:'white',size:14,x:774,y:480}); drawText(filters,{font:bold,text:'Concise report without unnecessary details',color:'0xe2e8f0',size:11,x:774,y:500});
}
function drawDataExtras(filters, regular, bold, accent) {
  box(filters, 300, 590, 930, 82, '0x061c2a@0.98', 'fill'); box(filters, 300, 590, 930, 82, '0x0e7490', 2); iconBox(filters, 318, 610, accent); drawText(filters,{font:bold,text:'Data Analysis',color:'white',size:20,x:370,y:612}); drawText(filters,{font:bold,text:'It will process the table, variables, statistics, graphs, and open the results in a separate window.',color:'white',size:13,x:370,y:640});
}
function drawInputAndButtons(filters, regular, bold, accent, screen, y, inputH, compact) {
  box(filters, 300, y, 930, inputH, '0x0b1222@0.98', 'fill'); box(filters, 300, y, 930, inputH, '0x334155', 2); drawText(filters,{font:bold,text:wrap(placeholderForScreen(screen), 110),color:'0x93a4bd',size:14,x:318,y:y+24,lineSpacing:5});
  const by = compact ? y + inputH + 12 : Math.min(646, y + inputH + 14);
  box(filters, 300, by, screen==='tool_defense'?250:180, 46, accent, 'fill'); drawText(filters,{font:bold,text:actionForScreen(screen),color:'white',size:15,x:320,y:by+14});
  box(filters, 496, by, 92, 46, '0x181b26', 'fill'); box(filters, 496, by, 92, 46, '0x374151', 2); drawText(filters,{font:bold,text:'Dictate',color:'white',size:14,x:520,y:by+15});
  box(filters, 602, by, 96, 46, '0x181b26', 'fill'); box(filters, 602, by, 96, 46, '0x374151', 2); drawText(filters,{font:bold,text:'Canvas',color:'white',size:14,x:624,y:by+15});
  box(filters, 712, by, 96, 46, '0x3b0b18', 'fill'); box(filters, 712, by, 96, 46, '0x7f1d1d', 2); drawText(filters,{font:bold,text:'Clear',color:'white',size:14,x:742,y:by+15});
}


function drawTopPageHeader(filters, regular, bold, accent, title, rightLabel) {
  drawAppChrome(filters);
  box(filters, 0, 70, W, 90, '0x050816@0.98', 'fill');
  box(filters, 0, 160, W, 1, '0x1f2937', 'fill');
  box(filters, 156, 98, 108, 48, '0x1f2330', 'fill');
  box(filters, 156, 98, 108, 48, '0x374151', 2);
  drawText(filters, { font: bold, text: 'Menu', color: 'white', size: 18, x: 190, y: 114 });
  drawText(filters, { font: bold, text: title, color: '0xd1d5db', size: 16, x: 560, y: 116 });
  if (rightLabel) {
    box(filters, 1010, 98, 170, 48, '0x2a0f55', 'fill');
    box(filters, 1010, 98, 170, 48, '0x6d28d9', 2);
    drawText(filters, { font: bold, text: rightLabel, color: 'white', size: 16, x: 1044, y: 114 });
  }
}

function drawSourcesPageScreen(filters, lang, manual, regular, bold, accent, soft) {
  drawTopPageHeader(filters, regular, bold, accent, 'Academic Resources & Citations', 'Top');
  box(filters, 300, 205, 860, 68, '0x0f172a@0.98', 'fill');
  box(filters, 300, 205, 860, 68, '0x334155', 2);
  drawText(filters, { font: bold, text: 'Enter paper topic...', color: '0x9fb3cf', size: 18, x: 325, y: 232 });
  box(filters, 1060, 214, 86, 50, accent, 'fill');
  drawText(filters, { font: bold, text: 'Search', color: 'white', size: 20, x: 1076, y: 228 });
  const chips = ['Power BI data visualization techniques in business analytics', 'POWER BI', 'SQL - MySQL for Data Analytics and Business Intelligence', 'How the Wheel Works', 'how to solve it'];
  const chipPos = [[300,285,445],[758,285,96],[300,325,430],[742,325,170],[922,325,124]];
  chips.forEach((label, i) => { const [x,y,w] = chipPos[i]; box(filters, x, y, w, 30, '0x202432', 'fill'); drawText(filters, { font: bold, text: label, color: 'white', size: 14, x: x + 12, y: y + 7 }); });
  box(filters, 250, 392, 980, 78, '0x171b27@0.98', 'fill');
  box(filters, 250, 392, 980, 78, '0x334155', 2);
  const filtersItems = [['PDF Only',270,412,130], ['Last 2 Years',415,412,130], ['Last 5 Years',560,412,130], ['2010-2015',705,412,120], ['2015-2020',840,412,125], ['Year, e.g. 2022',980,412,175]];
  filtersItems.forEach(([label,x,y,w]) => { box(filters, x, y, w, 42, '0x272b35', 'fill'); drawText(filters, { font: bold, text: label, color: 'white', size: 16, x: x + 16, y: y + 12 }); });
  box(filters, 1160, 412, 58, 42, '0xef0000', 'fill');
  drawText(filters, { font: bold, text: 'Reset', color: 'white', size: 15, x: 1172, y: 424 });
  drawText(filters, { font: bold, text: t(manual.title, lang), color: soft, size: 24, x: 300, y: 545 });
  drawText(filters, { font: regular, text: wrap(t(manual.purpose, lang), 78), color: '0xcbd5e1', size: 17, x: 300, y: 582, lineSpacing: 7 });
}

function drawPackagesPageScreen(filters, lang, manual, regular, bold, accent, soft) {
  drawTopPageHeader(filters, regular, bold, accent, 'Packages and Add-ons', 'Back to Menu');
  box(filters, 125, 195, 300, 38, '0x2a0f55@0.98', 'fill');
  box(filters, 125, 195, 300, 38, '0x6d28d9', 2);
  drawText(filters, { font: bold, text: 'Subscriptions and Add-on Services', color: 'white', size: 15, x: 155, y: 206 });
  drawText(filters, { font: bold, text: 'Packages and Add-ons', color: 'white', size: 54, x: 125, y: 255 });
  drawText(filters, { font: bold, text: wrap('Choose your monthly plan based on your workload. Each package has a monthly page limit, number of active projects, AI checks, audits, defenses, and its own AI credit limit.', 72), color: '0xe2e8f0', size: 18, x: 125, y: 330, lineSpacing: 9 });
  const cards = [
    ['BASIC START','START BASIC','29 €','Basic monthly plan for one active project and basic AI support.',125,'0x0f172a'],
    ['BEST FOR STUDENTS','STUDENT\nPLUS','59 €','Monthly plan for students who need more pages, more active projects, citations, sources and one defense.',410,'0x2a0f55'],
    ['FOR THESIS / FINAL\nPROJECT','PRO THESIS','99 €','Powerful monthly plan for a more extensive thesis, priority processing and premium AI model.',695,'0x0f172a'],
    ['ULTIMATE ACADEMIC PLAN','ELITE ACADEMIC','149 €','The highest monthly plan for demanding academic use, multiple projects, high limits and full premium AI capacity.',980,'0x0f172a'],
  ];
  cards.forEach(([tag,title,price,desc,x,color], i) => {
    box(filters, x, 405, 250, 250, `${color}@0.98`, 'fill');
    box(filters, x, 405, 250, 250, i === 1 ? '0x7e22ce' : '0x334155', 2);
    box(filters, x + 22, 430, 150, 28, i === 1 ? accent : '0x4c1d95', 'fill');
    drawText(filters, { font: bold, text: tag, color: 'white', size: 11, x: x + 34, y: 438, lineSpacing: 2 });
    drawText(filters, { font: bold, text: title, color: 'white', size: 24, x: x + 22, y: 482, lineSpacing: 4 });
    drawText(filters, { font: regular, text: wrap(desc, 28), color: '0xe2e8f0', size: 14, x: x + 22, y: 540, lineSpacing: 6 });
    drawText(filters, { font: bold, text: price, color: 'white', size: 30, x: x + 22, y: 610 });
    drawText(filters, { font: bold, text: '/ month', color: 'white', size: 12, x: x + 24, y: 644 });
  });
}

function drawHistoryPageScreen(filters, lang, manual, regular, bold, accent, soft) {
  drawAppChrome(filters);
  box(filters, 0, 70, W, H - 70, '0x030712', 'fill');
  box(filters, 252, 92, 840, 150, '0x090a14@0.98', 'fill');
  drawText(filters, { font: bold, text: 'Chat History', color: 'white', size: 40, x: 252, y: 105 });
  drawText(filters, { font: bold, text: 'Your Conversations', color: '0xd1d5db', size: 16, x: 252, y: 160 });
  box(filters, 812, 98, 170, 46, accent, 'fill'); drawText(filters, { font: bold, text: 'Return to Menu', color: 'white', size: 16, x: 846, y: 112 });
  box(filters, 995, 98, 97, 46, '0x111827', 'fill'); box(filters, 995, 98, 97, 46, '0x334155', 2); drawText(filters, { font: bold, text: 'Refresh', color: 'white', size: 16, x: 1024, y: 112 });
  box(filters, 252, 190, 390, 50, '0x0f172a', 'fill'); box(filters, 252, 190, 390, 50, '0x334155', 2); drawText(filters, { font: bold, text: 'Search...', color: '0x94a3b8', size: 16, x: 292, y: 206 });
  box(filters, 252, 290, 840, 360, '0x0b1222@0.98', 'fill'); box(filters, 252, 290, 840, 360, '0x334155', 2);
  drawText(filters, { font: bold, text: 'Uložené konverzácie', color: 'white', size: 24, x: 280, y: 318 });
  drawText(filters, { font: bold, text: '122 záznamov', color: '0xe2e8f0', size: 14, x: 280, y: 350 });
  const rows = ['Navrhni mi úvod mojej práce','Navrhni štruktúru kapitol','Napíš mi abstrakt','Schreib mir das erste Unterkapitel'];
  rows.forEach((label, i) => { const y = 390 + i * 70; box(filters, 280, y, 780, 58, '0x0b1222', 'fill'); box(filters, 305, y + 9, 38, 38, '0x2d1655', 'fill'); drawText(filters, { font: bold, text: label, color: 'white', size: 18, x: 360, y: y + 8 }); drawText(filters, { font: bold, text: 'POUŽÍVATEĽ: '+label+' AI ODPOVEĎ: ukážka odpovede...', color: '0xcbd5e1', size: 12, x: 360, y: y + 34 }); box(filters, 965, y + 12, 32, 32, '0x111827', 'fill'); box(filters, 1006, y + 12, 32, 32, '0x111827', 'fill'); box(filters, 1047, y + 12, 32, 32, '0x3b0b18', 'fill'); });
}

function drawVideoPageScreen(filters, lang, manual, regular, bold, accent, soft) {
  drawTopPageHeader(filters, regular, bold, accent, 'Professional Zedpera manuals', 'Back to menu');
  box(filters, 156, 180, 1040, 250, '0x0f172a@0.98', 'fill'); box(filters, 156, 180, 1040, 250, '0x334155', 2);
  drawText(filters, { font: bold, text: 'NOW PLAYING', color: soft, size: 13, x: 185, y: 210 });
  drawText(filters, { font: bold, text: '1. Zedpera Main Menu', color: 'white', size: 30, x: 185, y: 235 });
  drawText(filters, { font: bold, text: 'Navigation through the application, dashboard, menu, and main system sections.', color: '0xe2e8f0', size: 16, x: 185, y: 285 });
  const badges = ['Category: Basics','Video language: EN','45 sekúnd'];
  badges.forEach((b, i) => { const x = 185 + i * 140; box(filters, x, 320, 126, 30, i===1?'0x083344':'0x21163a', 'fill'); box(filters, x, 320, 126, 30, '0x334155', 2); drawText(filters, { font: bold, text: b, color: 'white', size: 11, x: x + 12, y: 329 }); });
  box(filters, 185, 370, 985, 54, '0x271b49@0.98', 'fill'); box(filters, 185, 370, 985, 54, '0x4c1d95', 2); drawText(filters, { font: bold, text: 'Open in separate window', color: 'white', size: 18, x: 205, y: 386 }); box(filters, 1020, 382, 120, 34, accent, 'fill'); drawText(filters, { font: bold, text: 'Open video', color: 'white', size: 14, x: 1045, y: 392 });
  box(filters, 156, 460, 1040, 220, '0x0b1222@0.98', 'fill'); box(filters, 156, 460, 1040, 220, '0x334155', 2);
  drawText(filters, { font: bold, text: 'Manual scenario and steps', color: 'white', size: 24, x: 185, y: 488 });
  drawText(filters, { font: bold, text: 'Navigation through the application, dashboard, menu, and main system sections.', color: '0xe2e8f0', size: 15, x: 185, y: 535 });
  ['Step 1: Open the relevant section in Zedpera.','Step 2: Check that the correct work profile is selected.','Step 3: Fill in the required data or insert text into the form.','Step 4: Start the processing or requested action.'].forEach((row, i) => drawText(filters, { font: bold, text: row, color: 'white', size: 15, x: 205, y: 575 + i * 28 }));
}

function drawGenericScreen(filters, lang, manual, regular, bold, accent, soft) {
  drawAppChrome(filters); drawSideNav(filters, lang, regular, bold, accent, 'menu');
  box(filters, 300, 70, 900, 90, '0x0f172a@0.98', 'fill'); box(filters, 300, 70, 900, 90, '0x334155', 2); iconBox(filters, 325, 94, accent); drawText(filters,{font:bold,text:t(manual.title,lang),color:'white',size:26,x:386,y:92}); drawText(filters,{font:bold,text:wrap(t(manual.purpose,lang),92),color:'0xcbd5e1',size:14,x:386,y:126});
  const cards = [['Overview','Current status and available options'], ['Settings','Limits, access and module controls']];
  cards.forEach((c,i)=>{ const x=300+i*460; box(filters,x,190,430,120,'0x111827@0.98','fill'); box(filters,x,190,430,120,'0x334155',2); iconBox(filters,x+24,220,accent); drawText(filters,{font:bold,text:c[0],color:'white',size:22,x:x+88,y:220}); drawText(filters,{font:bold,text:c[1],color:'0xcbd5e1',size:14,x:x+88,y:252}); });
  box(filters,300,350,900,120,'0x0b1222@0.98','fill'); box(filters,300,350,900,120,'0x334155',2); drawText(filters,{font:bold,text:'Workspace',color:'white',size:22,x:330,y:372}); drawText(filters,{font:bold,text:'This area displays saved outputs, lists, recommendations, package details or guide content.',color:'0xcbd5e1',size:15,x:330,y:404});
  box(filters,300,520,900,90,'0x0f172a@0.98','fill'); box(filters,300,520,900,90,'0x334155',2); drawText(filters,{font:bold,text:'Save, open or return to menu',color:'white',size:20,x:330,y:548}); box(filters,970,544,160,40,accent,'fill'); drawText(filters,{font:bold,text:'Return to Menu',color:'white',size:14,x:1000,y:556});
}

function drawScreen(filters, lang, manual, regular, bold, accent, soft) {
  switch (manual.screen) {
    case 'menu': return drawMenuScreen(filters, lang, null, regular, bold, accent, soft);
    case 'profile': return drawProfileScreen(filters, lang, regular, bold, accent, soft);
    case 'ai_chat': return drawAiChatScreen(filters, lang, manual, regular, bold, accent);
    case 'projects': return drawProjectsScreen(filters, lang, manual, regular, bold, accent);
    case 'wizard': return drawWizardScreen(filters, lang, manual, regular, bold, accent);
    case 'sources_page': return drawSourcesPageScreen(filters, lang, manual, regular, bold, accent, soft);
    case 'packages_page': return drawPackagesPageScreen(filters, lang, manual, regular, bold, accent, soft);
    case 'history_page': return drawHistoryPageScreen(filters, lang, manual, regular, bold, accent, soft);
    case 'video_page': return drawVideoPageScreen(filters, lang, manual, regular, bold, accent, soft);
    default:
      if (manual.screen.startsWith('tool_')) return drawToolScreen(filters, lang, manual, regular, bold, accent);
      return drawGenericScreen(filters, lang, manual, regular, bold, accent, soft);
  }
}

function drawOverlayPanel(filters, { lang, slides, seconds, tempDir, accent, soft, regular, bold, targetForSlide }) {
  const ui = UI[lang];
  const headerFile = textFile(tempDir, 'top_header', `${ui.guide} · ${ui.language}`);
  const footerFile = textFile(tempDir, 'footer', ui.footer);
  const activeFile = textFile(tempDir, 'active', ui.active);
  box(filters, 0, 0, W, 32, '0x020617@0.82', 'fill'); drawText(filters, { font: regular, textFilePath: headerFile, color: soft, size: 15, x: 34, y: 8 });
  box(filters, 0, 698, W, 22, '0x020617@0.94', 'fill'); drawText(filters, { font: regular, textFilePath: footerFile, color: '0x94a3b8', size: 13, x: 34, y: 702 });
  slides.forEach((slide, index) => {
    const start = index * seconds;
    const end = (index + 1) * seconds - 0.05;
    const enable = `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`;
    const titleFile = textFile(tempDir, `s${index}_title`, wrap(slide.title, 28));
    const textFilePath = textFile(tempDir, `s${index}_text`, wrap(slide.text, 38));
    const stepFile = textFile(tempDir, `s${index}_step`, `${index + 1}/${slides.length}`);
    const progress = Math.round(1180 * ((index + 1) / slides.length));
    box(filters, 905, 174, 330, 354, '0x111827@0.97', 'fill', enable); box(filters, 905, 174, 8, 354, accent, 'fill', enable);
    drawText(filters, { font: bold, textFilePath: titleFile, color: 'white', size: 28, x: 930, y: 202, lineSpacing: 8, enable });
    drawText(filters, { font: regular, textFilePath, color: '0xe2e8f0', size: 19, x: 930, y: 288, lineSpacing: 9, enable });
    drawText(filters, { font: bold, textFilePath: stepFile, color: soft, size: 22, x: 1160, y: 494, enable });
    const target = targetForSlide(slide, index);
    if (target) {
      box(filters, target.x - 8, target.y - 8, target.w + 16, target.h + 16, `${accent}@0.24`, 'fill', enable);
      box(filters, target.x - 12, target.y - 12, target.w + 24, target.h + 24, accent, 4, enable);
      drawText(filters, { font: bold, textFilePath: activeFile, color: 'white', size: 15, x: Math.max(34, target.x), y: Math.max(34, target.y - 30), enable });
      drawArrow(filters, target, accent, enable);
    }
    box(filters, 50, 674, 1180, 10, '0x1e293b', 'fill', enable); box(filters, 50, 674, progress, 10, accent, 'fill', enable);
  });
}

function drawArrow(filters, target, accent, enable) {
  const y = Math.round(target.y + target.h / 2);
  const panelLeft = 905;
  const targetRight = target.x + target.w;
  if (targetRight < panelLeft - 30) {
    const len = panelLeft - targetRight - 24;
    box(filters, targetRight + 10, y - 4, Math.max(20, len), 8, accent, 'fill', enable);
    box(filters, targetRight + 4, y - 16, 18, 18, accent, 'fill', enable);
    box(filters, targetRight + 4, y + 0, 18, 18, accent, 'fill', enable);
  } else {
    box(filters, 860, y - 4, 40, 8, accent, 'fill', enable);
    box(filters, 846, y - 16, 18, 18, accent, 'fill', enable);
    box(filters, 846, y + 0, 18, 18, accent, 'fill', enable);
  }
}

function buildFilter({ manual, lang, slides, seconds, tempDir }) {
  const regular = ffPath(FONT_REGULAR);
  const bold = ffPath(FONT_BOLD);
  const accent = ACCENT[lang];
  const soft = SOFT[lang];
  const filters = [];
  drawScreen(filters, lang, manual, regular, bold, accent, soft);
  drawOverlayPanel(filters, {
    lang, slides, seconds, tempDir, accent, soft, regular, bold,
    targetForSlide: (slide) => {
      if (manual.screen === 'menu') {
        if (slide.kind !== 'menu-card') return null;
        const targetManual = MODULES.find((item) => item.n === slide.manualNumber);
        return targetManual ? cardTargetForManual(targetManual) : null;
      }
      if (slide.kind === 'intro') return cardTargetForManual(manual);
      if (slide.kind !== 'screen-step') return null;
      const list = targetListForScreen(manual.screen);
      return list[Math.max(0, Math.min(list.length - 1, slide.targetIndex))];
    },
  });
  return filters.join(',');
}

function renderVideo({ manual, lang, force, seconds, timeout }) {
  ensureDir(path.join(videoRoot, lang));
  const outFile = path.join(videoRoot, lang, `${manual.slug}.mp4`);
  const tmpFile = `${outFile}.tmp.mp4`;
  const tmpDir = path.join(videoRoot, '.tmp-render', `${lang}-${manual.slug}`);
  if (!force && exists(outFile)) return { skipped: true, elapsed: 0, duration: 0 };
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(tmpFile, { force: true });
  ensureDir(tmpDir);
  const slides = slidesForManual(manual, lang);
  const duration = slides.length * seconds;
  const filter = buildFilter({ manual, lang, slides, seconds, tempDir: tmpDir });
  const filterFile = path.join(tmpDir, 'filtergraph.txt');
  writeText(filterFile, filter);
  const args = [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
    '-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${duration.toFixed(2)}`,
    '-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=48000:d=${duration.toFixed(2)}`,
    '-map', '0:v:0', '-map', '1:a:0', '-filter_script:v', filterFile,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'stillimage', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-ar', '48000', '-t', duration.toFixed(2), '-movflags', '+faststart', tmpFile,
  ];
  const started = Date.now();
  const result = cp.spawnSync('ffmpeg', args, { encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 1024 * 1024 * 32 });
  const elapsed = Date.now() - started;
  if (result.error?.code === 'ETIMEDOUT') { fs.rmSync(tmpFile, { force: true }); throw new Error(`FFmpeg timeout po ${Math.round(elapsed / 1000)} s.`); }
  if (result.error) { fs.rmSync(tmpFile, { force: true }); throw new Error(`FFmpeg sa nespustil: ${result.error.code || ''} ${result.error.message || result.error}`); }
  if (result.status !== 0) { fs.rmSync(tmpFile, { force: true }); throw new Error(result.stderr || result.stdout || `FFmpeg zlyhal so statusom ${result.status}. Filter script: ${filterFile}`); }
  if (!exists(tmpFile) || fs.statSync(tmpFile).size < 4096) { fs.rmSync(tmpFile, { force: true }); throw new Error('FFmpeg nevytvoril platné MP4.'); }
  fs.renameSync(tmpFile, outFile);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  writeSubtitles(manual, lang, slides, seconds);
  return { skipped: false, elapsed, duration };
}

function main() {
  const args = parseArgs();
  ensureDir(videoRoot);
  fs.rmSync(path.join(videoRoot, '.tmp-render'), { recursive: true, force: true });
  const manuals = selectedManuals(args);
  const report = { generatedAt: new Date().toISOString(), root: videoRoot, version: 'ZEDPERA_SCREEN_MANUALS_COMPLETE_LANG_PRO_2026_06_25', languages: args.langs, manuals: manuals.map((m) => m.slug), results: [] };
  console.log('══════════════════════════════════════════════════════════════');
  console.log(' ZEDPERA — video manuály podľa aktuálnych obrazoviek');
  console.log(' Bez hlasu · bez kurzora · MP4 + SRT + VTT · 6 jazykov');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`Root: ${videoRoot}`);
  console.log(`Manuals: ${manuals.map((m) => m.slug).join(', ')}`);
  console.log(`Languages: ${args.langs.join(', ')}`);
  console.log(`Seconds per slide: ${args.seconds}`);
  console.log('──────────────────────────────────────────────────────────────');
  let ok = 0, fail = 0, skip = 0;
  for (const manual of manuals) {
    for (const lang of args.langs) {
      process.stdout.write(`RENDER ${lang}/${manual.slug} ... `);
      const item = { lang, slug: manual.slug, title: t(manual.title, lang), ok: false, skipped: false, error: null };
      try {
        const result = renderVideo({ manual, lang, force: args.force, seconds: args.seconds, timeout: args.timeout });
        item.ok = true; item.skipped = result.skipped; item.elapsedMs = result.elapsed; item.durationSeconds = result.duration;
        if (result.skipped) { skip += 1; console.log('SKIP'); } else { ok += 1; console.log(`OK ${Math.round(result.elapsed / 1000)}s`); }
      } catch (error) {
        fail += 1; item.error = error instanceof Error ? error.message : String(error); console.log(`FAIL ${item.error}`);
      }
      report.results.push(item);
      writeText(path.join(videoRoot, 'generation-report-screen-manuals.json'), JSON.stringify(report, null, 2));
    }
  }
  report.finishedAt = new Date().toISOString();
  report.summary = { ok, fail, skip };
  writeText(path.join(videoRoot, 'generation-report-screen-manuals.json'), JSON.stringify(report, null, 2));
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`OK: ${ok}`);
  console.log(`FAIL: ${fail}`);
  console.log(`SKIP: ${skip}`);
  console.log(`Report: ${path.join(videoRoot, 'generation-report-screen-manuals.json')}`);
  if (fail > 0) process.exitCode = 1;
}

main();
