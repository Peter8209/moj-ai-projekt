#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * ZEDPERA — KOMPLETNÝ GENERÁTOR PREZENTAČNÝCH VIDEO MANUÁLOV
 * Verzia: ZEDPERA PRO / 6+ KROKOV / ŠÍPKY / ANIMOVANÝ ASISTENT / MULTILANG
 *
 * Cieľ:
 * - každé video je prezentácia jednej časti systému www.zedpera.com,
 * - každá časť má minimálne 6 krokov,
 * - v každom kroku je jasná šípka a zvýraznenie miesta, kam má používateľ kliknúť,
 * - video obsahuje animovaného "panáčika" / asistenta v štýle moderného sprievodcu,
 * - video je bez hovoreného slova, bez MP3, bez kurzora,
 * - generuje sa pre všetky jazyky: SK, CS, EN, DE, PL, HU,
 * - výstup ide do public/video-manualy/<jazyk>/<slug>.mp4,
 * - zároveň generuje .vtt a .srt titulky.
 *
 * Spustenie:
 *   node scripts/_create-localized-video-manuals.cjs --force
 *   node scripts/_create-localized-video-manuals.cjs --force --langs=sk,cs,en,de,pl,hu
 *   node scripts/_create-localized-video-manuals.cjs --force --manual=03_ai_chat
 *   node scripts/_create-localized-video-manuals.cjs --force --seconds=6
 *
 * Poznámka:
 * - Skript používa FFmpeg.
 * - Na Windows používa fonty Arial:
 *   C:/Windows/Fonts/arial.ttf
 *   C:/Windows/Fonts/arialbd.ttf
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

const DEFAULT_SECONDS = 6;
const DEFAULT_TIMEOUT = 150000;

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
    lang: 'Slovenčina',
    brand: 'ZEDPERA',
    site: 'www.zedpera.com',
    guide: 'Klikateľný prezentačný manuál',
    system: 'Prezentácia časti systému',
    click: 'KLIKNITE SEM',
    next: 'Ďalší krok',
    assistant: 'AI sprievodca',
    finalTitle: 'Sekcia je pripravená',
    finalText: 'Teraz viete túto časť systému používať samostatne a správne.',
    footer: 'www.zedpera.com · moderný animovaný manuál',
    step: 'Krok',
    of: 'z',
  },
  cs: {
    lang: 'Čeština',
    brand: 'ZEDPERA',
    site: 'www.zedpera.com',
    guide: 'Klikatelný prezentační návod',
    system: 'Prezentace části systému',
    click: 'KLIKNĚTE SEM',
    next: 'Další krok',
    assistant: 'AI průvodce',
    finalTitle: 'Sekce je připravena',
    finalText: 'Nyní umíte tuto část systému používat samostatně a správně.',
    footer: 'www.zedpera.com · moderní animovaný návod',
    step: 'Krok',
    of: 'z',
  },
  en: {
    lang: 'English',
    brand: 'ZEDPERA',
    site: 'www.zedpera.com',
    guide: 'Clickable presentation guide',
    system: 'System section presentation',
    click: 'CLICK HERE',
    next: 'Next step',
    assistant: 'AI guide',
    finalTitle: 'Section ready',
    finalText: 'You can now use this part of the system independently and correctly.',
    footer: 'www.zedpera.com · modern animated manual',
    step: 'Step',
    of: 'of',
  },
  de: {
    lang: 'Deutsch',
    brand: 'ZEDPERA',
    site: 'www.zedpera.com',
    guide: 'Klickbare Präsentationsanleitung',
    system: 'Präsentation eines Systembereichs',
    click: 'HIER KLICKEN',
    next: 'Nächster Schritt',
    assistant: 'KI-Assistent',
    finalTitle: 'Bereich ist bereit',
    finalText: 'Sie können diesen Systembereich nun selbstständig und korrekt nutzen.',
    footer: 'www.zedpera.com · moderne animierte Anleitung',
    step: 'Schritt',
    of: 'von',
  },
  pl: {
    lang: 'Polski',
    brand: 'ZEDPERA',
    site: 'www.zedpera.com',
    guide: 'Klikalna instrukcja prezentacyjna',
    system: 'Prezentacja części systemu',
    click: 'KLIKNIJ TUTAJ',
    next: 'Następny krok',
    assistant: 'Przewodnik AI',
    finalTitle: 'Sekcja gotowa',
    finalText: 'Możesz teraz korzystać z tej części systemu samodzielnie i poprawnie.',
    footer: 'www.zedpera.com · nowoczesna animowana instrukcja',
    step: 'Krok',
    of: 'z',
  },
  hu: {
    lang: 'Magyar',
    brand: 'ZEDPERA',
    site: 'www.zedpera.com',
    guide: 'Kattintható prezentációs útmutató',
    system: 'Rendszerszekció bemutatása',
    click: 'KATTINTSON IDE',
    next: 'Következő lépés',
    assistant: 'AI útmutató',
    finalTitle: 'A szekció kész',
    finalText: 'Most már önállóan és helyesen használhatja ezt a rendszerrészt.',
    footer: 'www.zedpera.com · modern animált útmutató',
    step: 'Lépés',
    of: '/',
  },
};

function t(lang, value) {
  return value[lang] || value.en || value.sk || '';
}

function steps6(data) {
  return data;
}

/**
 * Každá položka:
 * - slug: názov súboru videa
 * - title: názov sekcie v jazykoch
 * - area: vizuálny štítok sekcie
 * - steps: presne 6 krokov v každom jazyku
 *
 * Vizuálne klikacie zóny sú generované podľa poradia kroku.
 */
const MANUALS = [
  {
    slug: '01_hlavne_menu',
    category: 'basics',
    area: 'Dashboard',
    title: {
      sk: 'Hlavné menu',
      cs: 'Hlavní menu',
      en: 'Main menu',
      de: 'Hauptmenü',
      pl: 'Menu główne',
      hu: 'Főmenü',
    },
    steps: steps6({
      sk: [
        'Otvorte dashboard Zedpera po prihlásení.',
        'V hornej alebo hlavnej časti nájdite karty systému.',
        'Kliknite na kartu Moje práce, ak chcete pokračovať v projekte.',
        'Kliknite na AI nástroje, ak chcete pracovať s textom alebo dátami.',
        'Kliknite na Balíčky alebo Profil pre nastavenia účtu.',
        'Používajte menu ako centrálny rozcestník celej aplikácie.',
      ],
      cs: [
        'Otevřete dashboard Zedpera po přihlášení.',
        'V horní nebo hlavní části najděte karty systému.',
        'Klikněte na kartu Moje práce, pokud chcete pokračovat v projektu.',
        'Klikněte na AI nástroje, pokud chcete pracovat s textem nebo daty.',
        'Klikněte na Balíčky nebo Profil pro nastavení účtu.',
        'Používejte menu jako centrální rozcestník celé aplikace.',
      ],
      en: [
        'Open the Zedpera dashboard after signing in.',
        'Find the system cards in the top or main area.',
        'Click My works when you want to continue a project.',
        'Click AI tools when you want to work with text or data.',
        'Click Packages or Profile for account settings.',
        'Use the menu as the central navigation hub of the application.',
      ],
      de: [
        'Öffnen Sie nach dem Login das Zedpera-Dashboard.',
        'Suchen Sie die Systemkarten im oberen oder Hauptbereich.',
        'Klicken Sie auf Meine Arbeiten, um ein Projekt fortzusetzen.',
        'Klicken Sie auf KI-Werkzeuge, um mit Text oder Daten zu arbeiten.',
        'Klicken Sie auf Pakete oder Profil für Kontoeinstellungen.',
        'Nutzen Sie das Menü als zentrale Navigation der Anwendung.',
      ],
      pl: [
        'Po zalogowaniu otwórz dashboard Zedpera.',
        'Znajdź karty systemu w górnej lub głównej części.',
        'Kliknij Moje prace, aby kontynuować projekt.',
        'Kliknij Narzędzia AI, aby pracować z tekstem lub danymi.',
        'Kliknij Pakiety lub Profil, aby ustawić konto.',
        'Używaj menu jako centralnej nawigacji aplikacji.',
      ],
      hu: [
        'Bejelentkezés után nyissa meg a Zedpera dashboardot.',
        'Keresse meg a rendszerkártyákat a felső vagy fő területen.',
        'Kattintson a Munkáim kártyára a projekt folytatásához.',
        'Kattintson az AI eszközökre szöveg vagy adatok kezeléséhez.',
        'Kattintson a Csomagok vagy Profil elemre a fiókbeállításokhoz.',
        'Használja a menüt az alkalmazás központi navigációjaként.',
      ],
    }),
  },
  {
    slug: '02_profil',
    category: 'profile',
    area: 'Profile',
    title: {
      sk: 'Profil používateľa',
      cs: 'Profil uživatele',
      en: 'User profile',
      de: 'Benutzerprofil',
      pl: 'Profil użytkownika',
      hu: 'Felhasználói profil',
    },
    steps: steps6({
      sk: [
        'Kliknite na sekciu Profil v hlavnom menu.',
        'Skontrolujte osobné a používateľské údaje.',
        'Vyplňte názov práce, tému a typ práce.',
        'Nastavte jazyk práce a citačnú normu.',
        'Doplňte ciele, metodiku a výskumné otázky.',
        'Kliknite na uloženie, aby sa profil použil vo všetkých moduloch.',
      ],
      cs: [
        'Klikněte na sekci Profil v hlavním menu.',
        'Zkontrolujte osobní a uživatelské údaje.',
        'Vyplňte název práce, téma a typ práce.',
        'Nastavte jazyk práce a citační normu.',
        'Doplňte cíle, metodiku a výzkumné otázky.',
        'Klikněte na uložení, aby se profil použil ve všech modulech.',
      ],
      en: [
        'Click the Profile section in the main menu.',
        'Review personal and user details.',
        'Fill in work title, topic, and work type.',
        'Set work language and citation style.',
        'Add goals, methodology, and research questions.',
        'Click save so the profile is used across all modules.',
      ],
      de: [
        'Klicken Sie im Hauptmenü auf Profil.',
        'Prüfen Sie persönliche und Benutzerdaten.',
        'Füllen Sie Titel, Thema und Arbeitstyp aus.',
        'Stellen Sie Sprache und Zitierstil ein.',
        'Ergänzen Sie Ziele, Methodik und Forschungsfragen.',
        'Klicken Sie auf Speichern, damit das Profil in allen Modulen gilt.',
      ],
      pl: [
        'Kliknij sekcję Profil w menu głównym.',
        'Sprawdź dane osobowe i użytkownika.',
        'Uzupełnij tytuł, temat i typ pracy.',
        'Ustaw język pracy i styl cytowania.',
        'Dodaj cele, metodologię i pytania badawcze.',
        'Kliknij zapisz, aby profil działał we wszystkich modułach.',
      ],
      hu: [
        'Kattintson a Profil szekcióra a főmenüben.',
        'Ellenőrizze a személyes és felhasználói adatokat.',
        'Töltse ki a munka címét, témáját és típusát.',
        'Állítsa be a munka nyelvét és idézési stílusát.',
        'Adja meg a célokat, módszertant és kutatási kérdéseket.',
        'Kattintson a mentésre, hogy a profil minden modulban érvényesüljön.',
      ],
    }),
  },
  {
    slug: '03_ai_chat',
    category: 'ai',
    area: 'AI Chat',
    title: { sk: 'AI Chat', cs: 'AI Chat', en: 'AI Chat', de: 'AI Chat', pl: 'AI Chat', hu: 'AI Chat' },
    steps: steps6({
      sk: [
        'Kliknite na kartu AI Chat.',
        'Vyberte aktívnu prácu alebo profil práce.',
        'Do poľa správy zadajte presnú požiadavku.',
        'Doplňte kontext: kapitola, cieľ alebo štýl odpovede.',
        'Kliknite na odoslanie a počkajte na odpoveď.',
        'Výsledok skontrolujte, upravte a použite vo svojej práci.',
      ],
      cs: [
        'Klikněte na kartu AI Chat.',
        'Vyberte aktivní práci nebo profil práce.',
        'Do pole zprávy zadejte přesný požadavek.',
        'Doplňte kontext: kapitola, cíl nebo styl odpovědi.',
        'Klikněte na odeslání a počkejte na odpověď.',
        'Výsledek zkontrolujte, upravte a použijte ve své práci.',
      ],
      en: [
        'Click the AI Chat card.',
        'Select the active work or work profile.',
        'Enter a precise request in the message field.',
        'Add context: chapter, goal, or response style.',
        'Click send and wait for the answer.',
        'Review, edit, and use the result in your work.',
      ],
      de: [
        'Klicken Sie auf die AI Chat-Karte.',
        'Wählen Sie die aktive Arbeit oder das Profil.',
        'Geben Sie eine genaue Anfrage in das Nachrichtenfeld ein.',
        'Ergänzen Sie Kontext: Kapitel, Ziel oder Antwortstil.',
        'Klicken Sie auf Senden und warten Sie auf die Antwort.',
        'Prüfen, bearbeiten und verwenden Sie das Ergebnis in Ihrer Arbeit.',
      ],
      pl: [
        'Kliknij kartę AI Chat.',
        'Wybierz aktywną pracę lub profil pracy.',
        'Wpisz dokładne polecenie w polu wiadomości.',
        'Dodaj kontekst: rozdział, cel lub styl odpowiedzi.',
        'Kliknij wyślij i poczekaj na odpowiedź.',
        'Sprawdź, popraw i użyj wyniku w swojej pracy.',
      ],
      hu: [
        'Kattintson az AI Chat kártyára.',
        'Válassza ki az aktív munkát vagy munkaprofilt.',
        'Írjon pontos kérést az üzenetmezőbe.',
        'Adjon hozzá kontextust: fejezetet, célt vagy válaszstílust.',
        'Kattintson a küldésre és várja meg a választ.',
        'Ellenőrizze, szerkessze és használja fel az eredményt.',
      ],
    }),
  },
];

const EXTRA_MANUALS = [
  ['04_moje_prace', 'works', 'My works'],
  ['05_nova_praca', 'works', 'New work'],
  ['06_ai_veduci', 'ai', 'AI supervisor'],
  ['07_audit_kvality', 'review', 'Quality audit'],
  ['08_obhajoba', 'defense', 'Defense preparation'],
  ['09_preklad', 'communication', 'Translator'],
  ['10_analyza_dat', 'research', 'Data analysis'],
  ['11_planovanie', 'organization', 'Planning'],
  ['12_emaily', 'communication', 'Emails'],
  ['13_originalita_prace', 'review', 'Originality check'],
  ['14_humanizacia_textu', 'ai', 'Text humanization'],
  ['15_zdroje_citacie', 'sources', 'Sources and citations'],
  ['16_balicky', 'payments', 'Packages'],
  ['17_historia_chatu', 'history', 'Chat history'],
  ['18_video_navod', 'help', 'Video guide'],
  ['19_vzhlad_aplikacie', 'settings', 'Application appearance'],
  ['20_odhlasenie', 'settings', 'Sign out'],
];

const TITLE_TRANSLATIONS = {
  'My works': { sk: 'Moje práce', cs: 'Moje práce', en: 'My works', de: 'Meine Arbeiten', pl: 'Moje prace', hu: 'Munkáim' },
  'New work': { sk: 'Nová práca', cs: 'Nová práce', en: 'New work', de: 'Neue Arbeit', pl: 'Nowa praca', hu: 'Új munka' },
  'AI supervisor': { sk: 'AI školiteľ', cs: 'AI školitel', en: 'AI supervisor', de: 'KI-Betreuer', pl: 'Opiekun AI', hu: 'AI témavezető' },
  'Quality audit': { sk: 'Audit kvality', cs: 'Audit kvality', en: 'Quality audit', de: 'Qualitätsaudit', pl: 'Audyt jakości', hu: 'Minőségi audit' },
  'Defense preparation': { sk: 'Obhajoba', cs: 'Obhajoba', en: 'Defense preparation', de: 'Verteidigung', pl: 'Obrona', hu: 'Védés' },
  'Translator': { sk: 'Preklad', cs: 'Překlad', en: 'Translator', de: 'Übersetzer', pl: 'Tłumacz', hu: 'Fordító' },
  'Data analysis': { sk: 'Analýza dát', cs: 'Analýza dat', en: 'Data analysis', de: 'Datenanalyse', pl: 'Analiza danych', hu: 'Adatelemzés' },
  'Planning': { sk: 'Plánovanie', cs: 'Plánování', en: 'Planning', de: 'Planung', pl: 'Planowanie', hu: 'Tervezés' },
  'Emails': { sk: 'Emaily', cs: 'E-maily', en: 'Emails', de: 'E-Mails', pl: 'E-maile', hu: 'E-mailek' },
  'Originality check': { sk: 'Originalita práce', cs: 'Originalita práce', en: 'Originality check', de: 'Originalitätsprüfung', pl: 'Sprawdzenie oryginalności', hu: 'Eredetiség ellenőrzés' },
  'Text humanization': { sk: 'Humanizácia textu', cs: 'Humanizace textu', en: 'Text humanization', de: 'Texthumanisierung', pl: 'Humanizacja tekstu', hu: 'Szöveg humanizálása' },
  'Sources and citations': { sk: 'Zdroje a citácie', cs: 'Zdroje a citace', en: 'Sources and citations', de: 'Quellen und Zitate', pl: 'Źródła i cytowania', hu: 'Források és hivatkozások' },
  'Packages': { sk: 'Balíčky', cs: 'Balíčky', en: 'Packages', de: 'Pakete', pl: 'Pakiety', hu: 'Csomagok' },
  'Chat history': { sk: 'História chatu', cs: 'Historie chatu', en: 'Chat history', de: 'Chatverlauf', pl: 'Historia czatu', hu: 'Csevegési előzmények' },
  'Video guide': { sk: 'Video návod', cs: 'Video návod', en: 'Video guide', de: 'Videoanleitung', pl: 'Instrukcja wideo', hu: 'Videó útmutató' },
  'Application appearance': { sk: 'Vzhľad aplikácie', cs: 'Vzhled aplikace', en: 'Application appearance', de: 'Erscheinungsbild', pl: 'Wygląd aplikacji', hu: 'Alkalmazás megjelenése' },
  'Sign out': { sk: 'Odhlásenie', cs: 'Odhlášení', en: 'Sign out', de: 'Abmelden', pl: 'Wylogowanie', hu: 'Kijelentkezés' },
};

for (const [slug, category, key] of EXTRA_MANUALS) {
  MANUALS.push({
    slug,
    category,
    area: key,
    title: TITLE_TRANSLATIONS[key],
    steps: makeUniversalSteps(TITLE_TRANSLATIONS[key]),
  });
}

function makeUniversalSteps(title) {
  return {
    sk: [
      `Otvorte sekciu ${title.sk} v aplikácii Zedpera.`,
      'Sledujte zvýraznenú kartu alebo tlačidlo v pravej časti prezentácie.',
      'Kliknite presne na označené miesto, ktoré ukazuje šípka.',
      'Vyplňte alebo skontrolujte údaje potrebné pre túto sekciu.',
      'Potvrďte akciu tlačidlom uložiť, spustiť alebo pokračovať.',
      `Po dokončení môžete sekciu ${title.sk} používať samostatne.`,
    ],
    cs: [
      `Otevřete sekci ${title.cs} v aplikaci Zedpera.`,
      'Sledujte zvýrazněnou kartu nebo tlačítko v pravé části prezentace.',
      'Klikněte přesně na označené místo, které ukazuje šipka.',
      'Vyplňte nebo zkontrolujte údaje potřebné pro tuto sekci.',
      'Potvrďte akci tlačítkem uložit, spustit nebo pokračovat.',
      `Po dokončení můžete sekci ${title.cs} používat samostatně.`,
    ],
    en: [
      `Open the ${title.en} section in the Zedpera application.`,
      'Watch the highlighted card or button on the right side of the presentation.',
      'Click exactly on the marked place indicated by the arrow.',
      'Fill in or check the information required for this section.',
      'Confirm the action with save, start, or continue.',
      `After finishing, you can use the ${title.en} section independently.`,
    ],
    de: [
      `Öffnen Sie den Bereich ${title.de} in Zedpera.`,
      'Beachten Sie die hervorgehobene Karte oder Schaltfläche rechts.',
      'Klicken Sie genau auf die markierte Stelle, auf die der Pfeil zeigt.',
      'Füllen oder prüfen Sie die erforderlichen Angaben.',
      'Bestätigen Sie mit Speichern, Starten oder Weiter.',
      `Danach können Sie den Bereich ${title.de} selbstständig nutzen.`,
    ],
    pl: [
      `Otwórz sekcję ${title.pl} w aplikacji Zedpera.`,
      'Obserwuj podświetloną kartę lub przycisk po prawej stronie prezentacji.',
      'Kliknij dokładnie oznaczone miejsce wskazane strzałką.',
      'Uzupełnij lub sprawdź dane wymagane dla tej sekcji.',
      'Potwierdź akcję przyciskiem zapisz, uruchom lub kontynuuj.',
      `Po zakończeniu możesz samodzielnie używać sekcji ${title.pl}.`,
    ],
    hu: [
      `Nyissa meg a(z) ${title.hu} szekciót a Zedpera alkalmazásban.`,
      'Figyelje a prezentáció jobb oldalán kiemelt kártyát vagy gombot.',
      'Kattintson pontosan a nyíllal jelölt helyre.',
      'Töltse ki vagy ellenőrizze a szükséges adatokat.',
      'Erősítse meg a műveletet mentés, indítás vagy folytatás gombbal.',
      `Befejezés után önállóan használhatja a(z) ${title.hu} szekciót.`,
    ],
  };
}

function parseArgs() {
  const args = { force: false, langs: LANGS, manual: null, seconds: DEFAULT_SECONDS, timeout: DEFAULT_TIMEOUT };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--force') args.force = true;
    else if (arg.startsWith('--langs=')) args.langs = arg.replace('--langs=', '').split(',').map(normalizeLang).filter(Boolean);
    else if (arg.startsWith('--manual=')) args.manual = arg.replace('--manual=', '').trim() || null;
    else if (arg.startsWith('--seconds=')) {
      const n = Number(arg.replace('--seconds=', '').trim());
      if (Number.isFinite(n) && n >= 4) args.seconds = n;
    } else if (arg.startsWith('--timeout=')) {
      const n = Number(arg.replace('--timeout=', '').trim());
      if (Number.isFinite(n) && n > 10000) args.timeout = n;
    }
  }
  args.langs = [...new Set(args.langs)].filter(x => LANGS.includes(x));
  if (!args.langs.length) args.langs = LANGS;
  return args;
}

function normalizeLang(v) {
  const lang = String(v || 'sk').trim().toLowerCase();
  if (lang === 'cz') return 'cs';
  return LANGS.includes(lang) ? lang : 'sk';
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function exists(file) { return file && fs.existsSync(file); }
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

function writeTempText(tempDir, name, value) {
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
  if (steps.length >= 6) return steps.slice(0, 6);
  const extended = [...steps];
  while (extended.length < 6) extended.push(extended[extended.length - 1] || titleOf(manual, lang));
  return extended.slice(0, 6);
}

function slidesOf(manual, lang) {
  const ui = UI[lang];
  const title = titleOf(manual, lang);
  const steps = stepsOf(manual, lang);
  return [
    { kind: 'intro', title, eyebrow: `${ui.system} · ${ui.lang}`, text: `${ui.guide}: ${title}` },
    ...steps.map((step, index) => ({ kind: 'step', title: `${ui.step} ${index + 1} ${ui.of} 6`, eyebrow: title, text: step })),
    { kind: 'final', title: ui.finalTitle, eyebrow: title, text: ui.finalText },
  ];
}

function writeSubs(manual, lang, slides, seconds) {
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

function pointForStep(index) {
  const points = [
    { x: 250, y: 276, label: 'Dashboard' },
    { x: 504, y: 276, label: 'Profile' },
    { x: 758, y: 276, label: 'AI tools' },
    { x: 250, y: 458, label: 'Input' },
    { x: 504, y: 458, label: 'Action' },
    { x: 758, y: 458, label: 'Save' },
  ];
  return points[index % points.length];
}

function buildFilter({ manual, lang, slides, seconds, tempDir }) {
  const ui = UI[lang];
  const accent = ACCENT[lang];
  const soft = SOFT[lang];
  const regular = ffPath(FONT_REGULAR);
  const bold = ffPath(FONT_BOLD);

  const brandFile = writeTempText(tempDir, 'brand', ui.brand);
  const siteFile = writeTempText(tempDir, 'site', ui.site);
  const guideFile = writeTempText(tempDir, 'guide', `${ui.guide} · ${ui.lang}`);
  const footerFile = writeTempText(tempDir, 'footer', ui.footer);
  const assistantFile = writeTempText(tempDir, 'assistant', ui.assistant);
  const clickFile = writeTempText(tempDir, 'click', ui.click);

  const filters = [];
  filters.push('format=yuv420p');

  // Base background.
  filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=0x020617:t=fill`);
  filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=${accent}@0.035:t=fill`);

  // Header.
  filters.push(`drawbox=x=0:y=0:w=${W}:h=116:color=0x050816@0.96:t=fill`);
  filters.push(`drawbox=x=46:y=30:w=206:h=52:color=${accent}:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':textfile='${brandFile}':fontcolor=white:fontsize=30:x=76:y=43`);
  filters.push(`drawtext=fontfile='${regular}':textfile='${guideFile}':fontcolor=${soft}:fontsize=23:x=286:y=40`);
  filters.push(`drawtext=fontfile='${regular}':textfile='${siteFile}':fontcolor=0x94a3b8:fontsize=19:x=286:y=72`);
  filters.push(`drawbox=x=0:y=114:w=${W}:h=4:color=${accent}:t=fill`);

  // Footer.
  filters.push(`drawbox=x=0:y=666:w=${W}:h=54:color=0x050816@0.96:t=fill`);
  filters.push(`drawtext=fontfile='${regular}':textfile='${footerFile}':fontcolor=0x94a3b8:fontsize=20:x=50:y=684`);

  // UI shell that simulates clicked system sections.
  filters.push(`drawbox=x=54:y=146:w=820:h=484:color=0x0f172a@0.92:t=fill`);
  filters.push(`drawbox=x=54:y=146:w=820:h=56:color=0x111827@0.96:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('ZEDPERA APP')}':fontcolor=white:fontsize=22:x=82:y=164`);
  filters.push(`drawtext=fontfile='${regular}':text='${esc(titleOf(manual, lang))}':fontcolor=${soft}:fontsize=22:x=250:y=164`);

  // System cards.
  const cardPositions = [
    { x: 110, y: 238, w: 220, h: 105, text: 'Dashboard' },
    { x: 364, y: 238, w: 220, h: 105, text: 'Profile' },
    { x: 618, y: 238, w: 220, h: 105, text: 'AI tools' },
    { x: 110, y: 420, w: 220, h: 105, text: 'Input' },
    { x: 364, y: 420, w: 220, h: 105, text: 'Action' },
    { x: 618, y: 420, w: 220, h: 105, text: 'Save' },
  ];

  cardPositions.forEach((card) => {
    filters.push(`drawbox=x=${card.x}:y=${card.y}:w=${card.w}:h=${card.h}:color=0x020617@0.80:t=fill`);
    filters.push(`drawbox=x=${card.x + 16}:y=${card.y + 18}:w=54:h=54:color=0x334155@0.90:t=fill`);
    filters.push(`drawtext=fontfile='${bold}':text='${esc(card.text)}':fontcolor=white:fontsize=21:x=${card.x + 86}:y=${card.y + 35}`);
  });

  slides.forEach((slide, index) => {
    const start = index * seconds;
    const end = (index + 1) * seconds - 0.05;
    const enable = `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`;

    const titleFile = writeTempText(tempDir, `slide-${index}-title`, wrap(slide.title, 30));
    const eyebrowFile = writeTempText(tempDir, `slide-${index}-eyebrow`, slide.eyebrow);
    const textFile = writeTempText(tempDir, `slide-${index}-text`, wrap(slide.text, 45));

    const p = pointForStep(Math.max(0, index - 1));
    const progress = Math.round(1180 * ((index + 1) / slides.length));

    // Main instruction panel.
    filters.push(`drawbox=x=900:y=146:w=330:h=484:color=0x111827@0.94:t=fill:${enable}`);
    filters.push(`drawbox=x=900:y=146:w=8:h=484:color=${accent}:t=fill:${enable}`);
    filters.push(`drawtext=fontfile='${regular}':textfile='${eyebrowFile}':fontcolor=${soft}:fontsize=22:x=930:y=186:${enable}`);
    filters.push(`drawtext=fontfile='${bold}':textfile='${titleFile}':fontcolor=white:fontsize=34:line_spacing=8:x=930:y=230:${enable}`);
    filters.push(`drawtext=fontfile='${regular}':textfile='${textFile}':fontcolor=0xe2e8f0:fontsize=24:line_spacing=10:x=930:y=330:${enable}`);

    // Animated assistant / panáčik. The figure is simple and robust for FFmpeg.
    filters.push(`drawbox=x=1036:y=500:w=64:h=64:color=${accent}@0.96:t=fill:${enable}`);
    filters.push(`drawbox=x=1052:y=570:w=32:h=42:color=${soft}@0.92:t=fill:${enable}`);
    filters.push(`drawbox=x=1012:y=530:w=26:h=10:color=${soft}@0.92:t=fill:${enable}`);
    filters.push(`drawbox=x=1098:y=530:w=26:h=10:color=${soft}@0.92:t=fill:${enable}`);
    filters.push(`drawtext=fontfile='${bold}':textfile='${assistantFile}':fontcolor=white:fontsize=18:x=972:y=618:${enable}`);

    // Highlight target.
    if (slide.kind === 'step') {
      filters.push(`drawbox=x=${p.x - 22}:y=${p.y - 22}:w=148:h=82:color=${accent}@0.34:t=fill:${enable}`);
      filters.push(`drawbox=x=${p.x - 28}:y=${p.y - 28}:w=160:h=94:color=${accent}:t=4:${enable}`);

      // Arrow made from thick bars, clear and visible.
      filters.push(`drawbox=x=790:y=${p.y + 8}:w=86:h=12:color=${accent}:t=fill:${enable}`);
      filters.push(`drawbox=x=862:y=${p.y - 8}:w=18:h=18:color=${accent}:t=fill:${enable}`);
      filters.push(`drawbox=x=862:y=${p.y + 28}:w=18:h=18:color=${accent}:t=fill:${enable}`);
      filters.push(`drawtext=fontfile='${bold}':textfile='${clickFile}':fontcolor=white:fontsize=19:x=${Math.max(80, p.x - 20)}:y=${p.y - 58}:${enable}`);
    }

    // Slide counter and progress.
    filters.push(`drawbox=x=50:y=642:w=1180:h=10:color=0x1e293b:t=fill:${enable}`);
    filters.push(`drawbox=x=50:y=642:w=${progress}:h=10:color=${accent}:t=fill:${enable}`);
    filters.push(`drawtext=fontfile='${bold}':text='${esc(`${index + 1}/${slides.length}`)}':fontcolor=white:fontsize=22:x=1144:y=612:${enable}`);
  });

  return filters.join(',');
}

function renderVideo({ manual, lang, force, seconds, timeout }) {
  ensureDir(path.join(videoRoot, lang));

  const outFile = path.join(videoRoot, lang, `${manual.slug}.mp4`);
  const tmpFile = `${outFile}.tmp.mp4`;
  const tmpDir = path.join(videoRoot, '.tmp-render', `${lang}-${manual.slug}`);

  if (!force && exists(outFile)) {
    return { skipped: true, elapsed: 0 };
  }

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
  writeSubs(manual, lang, slides, seconds);

  return { skipped: false, elapsed, duration };
}

function main() {
  const args = parseArgs();
  ensureDir(videoRoot);
  fs.rmSync(path.join(videoRoot, '.tmp-render'), { recursive: true, force: true });

  const manuals = MANUALS.filter((m) => !args.manual || m.slug === args.manual);
  const report = {
    generatedAt: new Date().toISOString(),
    root: videoRoot,
    mode: 'animated-clickable-presentation-manuals',
    languages: args.langs,
    manuals: manuals.map((m) => m.slug),
    results: [],
  };

  console.log('══════════════════════════════════════════════════════════════');
  console.log(' ZEDPERA — animated presentation manual generator');
  console.log(' Mode: 6+ steps / arrows / animated assistant / multilingual');
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
      process.stdout.write(`RENDER ${lang}/${manual.slug} slides=8 ... `);

      const item = {
        lang,
        slug: manual.slug,
        title: titleOf(manual, lang),
        category: manual.category,
        ok: false,
        skipped: false,
        error: null,
      };

      try {
        const res = renderVideo({
          manual,
          lang,
          force: args.force,
          seconds: args.seconds,
          timeout: args.timeout,
        });

        item.ok = true;
        item.skipped = res.skipped;
        item.durationSeconds = res.duration || 0;
        item.elapsedMs = res.elapsed;

        if (res.skipped) {
          skip += 1;
          console.log('SKIP');
        } else {
          ok += 1;
          console.log(`OK ${Math.round(res.elapsed / 1000)}s`);
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
