#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * ZEDPERA — PROFESIONÁLNY GENERÁTOR VIDEO MANUÁLU: PROFIL / CLIENT ACCOUNT
 * Verzia: PROFILE_CLIENT_ACCOUNT_PRO / 6 JAZYKOV / BEZ AI SPRIEVODCU
 *
 * Vytvorí detailný prezentačný manuál v rovnakom štýle ako hlavné menu:
 * - samostatné video pre sekciu Profil / Client Account and Services,
 * - každá položka obrazovky sa prechádza postupne,
 * - každá položka je zvýraznená profesionálnym rámikom,
 * - šípka ukazuje presne na aktívnu časť,
 * - žiadny AI sprievodca, žiadny panáčik, žiadny kurzor,
 * - bez hovoreného slova a bez MP3,
 * - výstup v 6 jazykoch: sk, cs, en, de, pl, hu,
 * - generuje MP4 + VTT + SRT.
 *
 * Výstup:
 * public/video-manualy/sk/02_profil.mp4
 * public/video-manualy/cs/02_profil.mp4
 * public/video-manualy/en/02_profil.mp4
 * public/video-manualy/de/02_profil.mp4
 * public/video-manualy/pl/02_profil.mp4
 * public/video-manualy/hu/02_profil.mp4
 *
 * Spustenie:
 * node scripts/_create-profile-client-account-video.cjs --force --langs=sk,cs,en,de,pl,hu --seconds=7
 *
 * Alebo po premenovaní na hlavný súbor:
 * node scripts/_create-localized-video-manuals.cjs --force --manual=02_profil --langs=sk,cs,en,de,pl,hu --seconds=7
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
    finalTitle: 'Profil používateľa je vysvetlený',
    finalText: 'Teraz viete, kde sa nachádzajú údaje účtu, plán, kredity, projekty, služby a prístup.',
    footer: 'www.zedpera.com · profil používateľa · prezentačný manuál',
  },
  cs: {
    language: 'Čeština',
    guide: 'Profesionální prezentační návod',
    click: 'AKTIVNÍ ČÁST',
    step: 'Krok',
    of: 'z',
    finalTitle: 'Profil uživatele je vysvětlen',
    finalText: 'Nyní víte, kde se nachází údaje účtu, plán, kredity, projekty, služby a přístup.',
    footer: 'www.zedpera.com · profil uživatele · prezentační návod',
  },
  en: {
    language: 'English',
    guide: 'Professional presentation guide',
    click: 'ACTIVE AREA',
    step: 'Step',
    of: 'of',
    finalTitle: 'User profile explained',
    finalText: 'You now know where account data, plan, credits, projects, services and access details are located.',
    footer: 'www.zedpera.com · user profile · presentation manual',
  },
  de: {
    language: 'Deutsch',
    guide: 'Professionelle Präsentationsanleitung',
    click: 'AKTIVER BEREICH',
    step: 'Schritt',
    of: 'von',
    finalTitle: 'Benutzerprofil erklärt',
    finalText: 'Sie wissen nun, wo Kontodaten, Plan, Credits, Projekte, Dienste und Zugriffsinformationen zu finden sind.',
    footer: 'www.zedpera.com · Benutzerprofil · Präsentationsanleitung',
  },
  pl: {
    language: 'Polski',
    guide: 'Profesjonalna instrukcja prezentacyjna',
    click: 'AKTYWNA CZĘŚĆ',
    step: 'Krok',
    of: 'z',
    finalTitle: 'Profil użytkownika wyjaśniony',
    finalText: 'Wiesz już, gdzie znajdują się dane konta, plan, kredyty, projekty, usługi i informacje o dostępie.',
    footer: 'www.zedpera.com · profil użytkownika · instrukcja prezentacyjna',
  },
  hu: {
    language: 'Magyar',
    guide: 'Professzionális prezentációs útmutató',
    click: 'AKTÍV TERÜLET',
    step: 'Lépés',
    of: '/',
    finalTitle: 'Felhasználói profil bemutatva',
    finalText: 'Most már tudja, hol találhatók a fiókadatok, csomag, kreditek, projektek, szolgáltatások és hozzáférési adatok.',
    footer: 'www.zedpera.com · felhasználói profil · prezentációs útmutató',
  },
};

const TITLE = {
  sk: 'Profil používateľa',
  cs: 'Profil uživatele',
  en: 'Client Account and Services',
  de: 'Benutzerkonto und Dienste',
  pl: 'Konto klienta i usługi',
  hu: 'Ügyfélfiók és szolgáltatások',
};

const STEPS = {
  sk: [
    'V hornej časti je titulok Client Account and Services. Táto stránka zobrazuje účet, balík, stav služby, kredity, projekty a dátumy prístupu.',
    'Tlačidlo Return to Menu vás vráti späť na hlavné menu aplikácie.',
    'Tlačidlo Refresh Data obnoví údaje klienta, plán, kredity, projekty a prístupové informácie.',
    'Tlačidlo Cancel Subscription slúži na zrušenie predplatného a vypnutie automatického obnovenia.',
    'Karta Client zobrazuje meno klienta a email účtu.',
    'Karta Plan zobrazuje aktuálny plán a stav účtu.',
    'Karta Credits ukazuje zostávajúce kredity a ich použitie.',
    'Karta Projects ukazuje počet projektov a dostupný limit.',
    'Sekcia Client Details obsahuje podrobné údaje: meno, email, rolu, jazyk, stav účtu a plán.',
    'Subscription Management vysvetľuje možnosť zrušenia predplatného a zachovanie prístupu do konca zaplateného obdobia.',
    'Activated Services zobrazuje dostupné služby pre klienta.',
    'Enabled Features zobrazuje funkcie povolené pre tento účet.',
    'Subscription & Access obsahuje dátumy predplatného, vytvorenia účtu, úprav a posledného prihlásenia.',
    'Spodné informačné karty Contact, Access a Updated sumarizujú email, rolu a poslednú aktualizáciu klienta.',
  ],
  cs: [
    'V horní části je nadpis Client Account and Services. Tato stránka zobrazuje účet, balíček, stav služby, kredity, projekty a data přístupu.',
    'Tlačítko Return to Menu vás vrátí zpět do hlavního menu aplikace.',
    'Tlačítko Refresh Data obnoví údaje klienta, plán, kredity, projekty a přístupové informace.',
    'Tlačítko Cancel Subscription slouží ke zrušení předplatného a vypnutí automatického obnovení.',
    'Karta Client zobrazuje jméno klienta a email účtu.',
    'Karta Plan zobrazuje aktuální plán a stav účtu.',
    'Karta Credits ukazuje zbývající kredity a jejich použití.',
    'Karta Projects ukazuje počet projektů a dostupný limit.',
    'Sekce Client Details obsahuje podrobné údaje: jméno, email, roli, jazyk, stav účtu a plán.',
    'Subscription Management vysvětluje možnost zrušení předplatného a zachování přístupu do konce zaplaceného období.',
    'Activated Services zobrazuje dostupné služby pro klienta.',
    'Enabled Features zobrazuje funkce povolené pro tento účet.',
    'Subscription & Access obsahuje data předplatného, vytvoření účtu, úprav a posledního přihlášení.',
    'Spodní informační karty Contact, Access a Updated shrnují email, roli a poslední aktualizaci klienta.',
  ],
  en: [
    'At the top is the Client Account and Services title. This page shows account, package, service status, credits, projects and access dates.',
    'The Return to Menu button takes you back to the main application menu.',
    'The Refresh Data button reloads client details, plan, credits, projects and access information.',
    'The Cancel Subscription button is used to cancel the subscription and turn off auto-renewal.',
    'The Client card shows the client name and account email.',
    'The Plan card shows the current plan and account status.',
    'The Credits card shows remaining credits and usage.',
    'The Projects card shows the number of projects and available limit.',
    'The Client Details section contains detailed data: name, email, role, language, account status and plan.',
    'Subscription Management explains subscription cancellation and access until the end of the paid period.',
    'Activated Services displays services available to the client.',
    'Enabled Features displays features enabled for this account.',
    'Subscription & Access contains subscription dates, account creation, modification and last login.',
    'Bottom information cards Contact, Access and Updated summarize email, role and last client update.',
  ],
  de: [
    'Oben steht der Titel Client Account and Services. Diese Seite zeigt Konto, Paket, Dienststatus, Credits, Projekte und Zugriffsdaten.',
    'Die Schaltfläche Return to Menu führt zurück zum Hauptmenü der Anwendung.',
    'Refresh Data lädt Kundendaten, Plan, Credits, Projekte und Zugriffsinformationen neu.',
    'Cancel Subscription dient zur Kündigung des Abonnements und deaktiviert die automatische Verlängerung.',
    'Die Karte Client zeigt Kundenname und Konto-E-Mail.',
    'Die Karte Plan zeigt den aktuellen Plan und Kontostatus.',
    'Die Karte Credits zeigt verbleibende Credits und Nutzung.',
    'Die Karte Projects zeigt Anzahl der Projekte und verfügbares Limit.',
    'Client Details enthält Name, E-Mail, Rolle, Sprache, Kontostatus und Plan.',
    'Subscription Management erklärt Kündigung und Zugriff bis zum Ende des bezahlten Zeitraums.',
    'Activated Services zeigt verfügbare Dienste für den Kunden.',
    'Enabled Features zeigt aktivierte Funktionen dieses Kontos.',
    'Subscription & Access enthält Abo-Daten, Kontoerstellung, Änderungen und letzten Login.',
    'Unten fassen Contact, Access und Updated E-Mail, Rolle und letzte Aktualisierung zusammen.',
  ],
  pl: [
    'Na górze znajduje się tytuł Client Account and Services. Strona pokazuje konto, pakiet, status usługi, kredyty, projekty i daty dostępu.',
    'Przycisk Return to Menu przenosi z powrotem do głównego menu aplikacji.',
    'Przycisk Refresh Data odświeża dane klienta, plan, kredyty, projekty i informacje o dostępie.',
    'Przycisk Cancel Subscription służy do anulowania subskrypcji i wyłączenia automatycznego odnowienia.',
    'Karta Client pokazuje nazwę klienta i email konta.',
    'Karta Plan pokazuje aktualny plan i status konta.',
    'Karta Credits pokazuje pozostałe kredyty i ich użycie.',
    'Karta Projects pokazuje liczbę projektów i dostępny limit.',
    'Sekcja Client Details zawiera dane: imię, email, rolę, język, status konta i plan.',
    'Subscription Management wyjaśnia anulowanie subskrypcji i dostęp do końca opłaconego okresu.',
    'Activated Services pokazuje usługi dostępne dla klienta.',
    'Enabled Features pokazuje funkcje włączone dla tego konta.',
    'Subscription & Access zawiera daty subskrypcji, utworzenia konta, zmian i ostatniego logowania.',
    'Dolne karty Contact, Access i Updated podsumowują email, rolę i ostatnią aktualizację klienta.',
  ],
  hu: [
    'Felül a Client Account and Services cím látható. Az oldal megjeleníti a fiókot, csomagot, szolgáltatásállapotot, krediteket, projekteket és hozzáférési dátumokat.',
    'A Return to Menu gomb visszavisz az alkalmazás főmenüjébe.',
    'A Refresh Data gomb frissíti az ügyféladatokat, csomagot, krediteket, projekteket és hozzáférési információkat.',
    'A Cancel Subscription gomb az előfizetés lemondására és az automatikus megújítás kikapcsolására szolgál.',
    'A Client kártya az ügyfél nevét és e-mail címét mutatja.',
    'A Plan kártya az aktuális csomagot és fióká állapotát mutatja.',
    'A Credits kártya a fennmaradó krediteket és használatot mutatja.',
    'A Projects kártya a projektek számát és a limitet mutatja.',
    'A Client Details szekció részletes adatokat tartalmaz: név, email, szerep, nyelv, fiókállapot és csomag.',
    'A Subscription Management az előfizetés lemondását és a fizetett időszak végéig tartó hozzáférést magyarázza.',
    'Az Activated Services az ügyfél számára elérhető szolgáltatásokat mutatja.',
    'Az Enabled Features a fiókhoz engedélyezett funkciókat mutatja.',
    'A Subscription & Access előfizetési dátumokat, fióklétrehozást, módosítást és utolsó bejelentkezést tartalmaz.',
    'Az alsó Contact, Access és Updated kártyák az emailt, szerepet és utolsó frissítést foglalják össze.',
  ],
};

function parseArgs() {
  const args = {
    force: false,
    langs: LANGS,
    seconds: DEFAULT_SECONDS,
    timeout: DEFAULT_TIMEOUT,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === '--force') args.force = true;
    else if (arg.startsWith('--langs=')) {
      args.langs = arg
        .replace('--langs=', '')
        .split(',')
        .map(normalizeLang)
        .filter(Boolean);
    } else if (arg.startsWith('--seconds=')) {
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

function slidesOf(lang) {
  const ui = UI[lang];
  const steps = STEPS[lang];

  return [
    {
      kind: 'intro',
      title: TITLE[lang],
      text: `${ui.guide}: ${TITLE[lang]}`,
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

function writeSubtitles(lang, slides, seconds) {
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

  writeText(path.join(videoRoot, lang, '02_profil.srt'), srt);
  writeText(path.join(videoRoot, lang, '02_profil.vtt'), vtt);
}

const TARGETS = [
  { x: 90, y: 42, w: 1060, h: 120, name: 'header' },
  { x: 690, y: 74, w: 130, h: 42, name: 'return' },
  { x: 836, y: 74, w: 122, h: 42, name: 'refresh' },
  { x: 970, y: 74, w: 158, h: 42, name: 'cancel' },
  { x: 90, y: 194, w: 250, h: 76, name: 'client' },
  { x: 365, y: 194, w: 250, h: 76, name: 'plan' },
  { x: 640, y: 194, w: 250, h: 76, name: 'credits' },
  { x: 915, y: 194, w: 250, h: 76, name: 'projects' },
  { x: 90, y: 300, w: 1060, h: 168, name: 'client details' },
  { x: 90, y: 486, w: 1060, h: 68, name: 'subscription management' },
  { x: 90, y: 570, w: 330, h: 74, name: 'activated services' },
  { x: 450, y: 570, w: 330, h: 74, name: 'enabled features' },
  { x: 810, y: 570, w: 330, h: 74, name: 'subscription access' },
  { x: 90, y: 646, w: 1060, h: 48, name: 'bottom summary' },
];

function targetForSlide(index) {
  const stepIndex = index - 1;
  return TARGETS[Math.max(0, Math.min(TARGETS.length - 1, stepIndex))] || TARGETS[0];
}

function drawProfileScreen(filters, lang, accent, soft, regular, bold) {
  // Background and page shell.
  filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=0x020617:t=fill`);
  filters.push(`drawbox=x=76:y=28:w=1080:h=136:color=0x050816@0.96:t=fill`);
  filters.push(`drawbox=x=76:y=28:w=1080:h=136:color=white@0.06:t=2`);

  filters.push(`drawbox=x=118:y=58:w=50:h=50:color=${accent}:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('CLIENT ACCOUNT')}':fontcolor=${soft}:fontsize=17:x=190:y=48`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc(TITLE[lang])}':fontcolor=white:fontsize=34:x=190:y=78`);
  filters.push(`drawtext=fontfile='${regular}':text='${esc('Account, package, service status, credits, projects, subscriptions and access dates.')}':fontcolor=0xcbd5e1:fontsize=17:x=190:y=118`);

  filters.push(`drawbox=x=690:y=74:w=130:h=42:color=0x111827:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Return to Menu')}':fontcolor=white:fontsize=15:x=712:y=81`);

  filters.push(`drawbox=x=836:y=74:w=122:h=42:color=${accent}:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Refresh Data')}':fontcolor=white:fontsize=16:x=860:y=82`);

  filters.push(`drawbox=x=970:y=74:w=158:h=42:color=0x3b0b18:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Cancel Subscription')}':fontcolor=white:fontsize=15:x=994:y=82`);

  // Top cards.
  const cards = [
    ['CLIENT', 'Admin', 'admin@zedpera.com', 90],
    ['PLAN', 'Admin Access', 'Account Status: Active', 365],
    ['CREDITS', '0 remaining', 'Total: 0 · used: 0', 640],
    ['PROJECTS', '0', 'Limit: 0', 915],
  ];

  cards.forEach(([label, value, sub, x]) => {
    filters.push(`drawbox=x=${x}:y=194:w=250:h=76:color=0x111827@0.95:t=fill`);
    filters.push(`drawbox=x=${x}:y=194:w=250:h=76:color=white@0.08:t=2`);
    filters.push(`drawbox=x=${Number(x) + 18}:y=214:w=42:h=42:color=0x3b1d70:t=fill`);
    filters.push(`drawtext=fontfile='${bold}':text='${esc(label)}':fontcolor=0xcbd5e1:fontsize=14:x=${Number(x) + 78}:y=214`);
    filters.push(`drawtext=fontfile='${bold}':text='${esc(value)}':fontcolor=white:fontsize=21:x=${Number(x) + 78}:y=236`);
    filters.push(`drawtext=fontfile='${regular}':text='${esc(sub)}':fontcolor=0xcbd5e1:fontsize=14:x=${Number(x) + 78}:y=258`);
  });

  // Client details.
  filters.push(`drawbox=x=90:y=300:w=1060:h=168:color=0x050816@0.96:t=fill`);
  filters.push(`drawbox=x=90:y=300:w=1060:h=168:color=white@0.08:t=2`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Client Details')}':fontcolor=white:fontsize=23:x=126:y=324`);
  filters.push(`drawtext=fontfile='${regular}':text='${esc('Basic account, plan and client settings.')}':fontcolor=0xcbd5e1:fontsize=16:x=126:y=354`);

  const details = [
    ['NAME', 'Admin', 126, 392],
    ['EMAIL', 'admin@zedpera.com', 360, 392],
    ['ROLE', 'user', 626, 392],
    ['LANGUAGE', 'en', 850, 392],
    ['ACCOUNT STATUS', 'active', 126, 434],
    ['PLAN', 'admin-free', 360, 434],
    ['SELECTED PLAN', 'admin-free', 626, 434],
    ['SUBSCRIPTION', 'unknown', 850, 434],
  ];

  details.forEach(([label, value, x, y]) => {
    filters.push(`drawtext=fontfile='${bold}':text='${esc(label)}':fontcolor=0xcbd5e1:fontsize=13:x=${x}:y=${y}`);
    filters.push(`drawtext=fontfile='${regular}':text='${esc(value)}':fontcolor=white:fontsize=15:x=${x}:y=${y + 22}`);
  });

  // Subscription management.
  filters.push(`drawbox=x=90:y=486:w=1060:h=68:color=0x2a0b19@0.96:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Subscription Management')}':fontcolor=white:fontsize=19:x=118:y=505`);
  filters.push(`drawtext=fontfile='${regular}':text='${esc('You can cancel your subscription. Auto-renewal will be turned off.')}':fontcolor=white:fontsize=15:x=118:y=532`);
  filters.push(`drawbox=x=940:y=504:w=170:h=34:color=0xef0000:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Cancel Subscription')}':fontcolor=white:fontsize=15:x=968:y=512`);

  // Service blocks.
  const serviceBlocks = [
    ['Activated Services', 'Modules and services available to the client.', 90, 570],
    ['Enabled Features', 'Features available for this client account.', 450, 570],
    ['Subscription & Access', 'Subscription and last access dates.', 810, 570],
  ];

  serviceBlocks.forEach(([title, sub, x, y]) => {
    filters.push(`drawbox=x=${x}:y=${y}:w=330:h=74:color=0x050816@0.96:t=fill`);
    filters.push(`drawbox=x=${x}:y=${y}:w=330:h=74:color=white@0.08:t=2`);
    filters.push(`drawbox=x=${Number(x) + 18}:y=${y + 18}:w=40:h=40:color=0x1f1450:t=fill`);
    filters.push(`drawtext=fontfile='${bold}':text='${esc(title)}':fontcolor=white:fontsize=19:x=${Number(x) + 74}:y=${y + 18}`);
    filters.push(`drawtext=fontfile='${regular}':text='${esc(sub)}':fontcolor=0xcbd5e1:fontsize=13:x=${Number(x) + 74}:y=${y + 45}`);
  });

  // Bottom summary.
  filters.push(`drawbox=x=90:y=646:w=1060:h=48:color=0x111827@0.95:t=fill`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Contact')}':fontcolor=0xcbd5e1:fontsize=14:x=130:y=660`);
  filters.push(`drawtext=fontfile='${regular}':text='${esc('admin@zedpera.com')}':fontcolor=white:fontsize=15:x=130:y=678`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Access')}':fontcolor=0xcbd5e1:fontsize=14:x=500:y=660`);
  filters.push(`drawtext=fontfile='${regular}':text='${esc('user')}':fontcolor=white:fontsize=15:x=500:y=678`);
  filters.push(`drawtext=fontfile='${bold}':text='${esc('Updated')}':fontcolor=0xcbd5e1:fontsize=14:x=800:y=660`);
  filters.push(`drawtext=fontfile='${regular}':text='${esc('21. 05. 2026 08:22')}':fontcolor=white:fontsize=15:x=800:y=678`);
}

function drawArrow(filters, target, accent, enable) {
  const y = Math.round(target.y + target.h / 2);
  const startX = 880;
  const endX = target.x + target.w + 18;

  if (endX < startX) {
    filters.push(`drawbox=x=${endX}:y=${y - 5}:w=${startX - endX}:h=10:color=${accent}:t=fill:${enable}`);
  } else {
    filters.push(`drawbox=x=${startX}:y=${y - 5}:w=${endX - startX}:h=10:color=${accent}:t=fill:${enable}`);
  }

  filters.push(`drawbox=x=${target.x + target.w + 4}:y=${y - 18}:w=20:h=20:color=${accent}:t=fill:${enable}`);
  filters.push(`drawbox=x=${target.x + target.w + 4}:y=${y + 2}:w=20:h=20:color=${accent}:t=fill:${enable}`);
}

function buildFilter({ lang, slides, seconds, tempDir }) {
  const ui = UI[lang];
  const accent = ACCENT[lang];
  const soft = SOFT[lang];
  const regular = ffPath(FONT_REGULAR);
  const bold = ffPath(FONT_BOLD);

  const filters = [];

  drawProfileScreen(filters, lang, accent, soft, regular, bold);

  const headerFile = textFile(tempDir, 'header', `${ui.guide} · ${ui.language}`);
  const footerFile = textFile(tempDir, 'footer', ui.footer);
  const activeFile = textFile(tempDir, 'active', ui.click);

  filters.push(`drawbox=x=0:y=0:w=${W}:h=32:color=0x020617@0.82:t=fill`);
  filters.push(`drawtext=fontfile='${regular}':textfile='${headerFile}':fontcolor=${soft}:fontsize=17:x=36:y=8`);

  filters.push(`drawbox=x=0:y=698:w=${W}:h=22:color=0x020617@0.94:t=fill`);
  filters.push(`drawtext=fontfile='${regular}':textfile='${footerFile}':fontcolor=0x94a3b8:fontsize=14:x=36:y=702`);

  slides.forEach((slide, index) => {
    const start = index * seconds;
    const end = (index + 1) * seconds - 0.05;
    const enable = `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`;

    const titleFile = textFile(tempDir, `s${index}-title`, wrap(slide.title, 32));
    const text = textFile(tempDir, `s${index}-text`, wrap(slide.text, 44));
    const stepFile = textFile(tempDir, `s${index}-step`, `${index + 1}/${slides.length}`);

    const progress = Math.round(1180 * ((index + 1) / slides.length));

    filters.push(`drawbox=x=900:y=170:w=338:h=380:color=0x111827@0.97:t=fill:${enable}`);
    filters.push(`drawbox=x=900:y=170:w=8:h=380:color=${accent}:t=fill:${enable}`);
    filters.push(`drawtext=fontfile='${bold}':textfile='${titleFile}':fontcolor=white:fontsize=32:line_spacing=8:x=928:y=198:${enable}`);
    filters.push(`drawtext=fontfile='${regular}':textfile='${text}':fontcolor=0xe2e8f0:fontsize=22:line_spacing=10:x=928:y=290:${enable}`);
    filters.push(`drawtext=fontfile='${bold}':textfile='${stepFile}':fontcolor=${soft}:fontsize=24:x=1165:y=512:${enable}`);

    if (slide.kind === 'step') {
      const target = TARGETS[Math.max(0, Math.min(TARGETS.length - 1, index - 1))];

      filters.push(`drawbox=x=${target.x - 8}:y=${target.y - 8}:w=${target.w + 16}:h=${target.h + 16}:color=${accent}@0.28:t=fill:${enable}`);
      filters.push(`drawbox=x=${target.x - 12}:y=${target.y - 12}:w=${target.w + 24}:h=${target.h + 24}:color=${accent}:t=4:${enable}`);
      filters.push(`drawtext=fontfile='${bold}':textfile='${activeFile}':fontcolor=white:fontsize=17:x=${Math.max(32, target.x)}:y=${Math.max(18, target.y - 32)}:${enable}`);

      drawArrow(filters, target, accent, enable);
    }

    filters.push(`drawbox=x=50:y=674:w=1180:h=10:color=0x1e293b:t=fill:${enable}`);
    filters.push(`drawbox=x=50:y=674:w=${progress}:h=10:color=${accent}:t=fill:${enable}`);
  });

  return filters.join(',');
}

function renderVideo({ lang, force, seconds, timeout }) {
  ensureDir(path.join(videoRoot, lang));

  const outFile = path.join(videoRoot, lang, '02_profil.mp4');
  const tmpFile = `${outFile}.tmp.mp4`;
  const tmpDir = path.join(videoRoot, '.tmp-render', `${lang}-02_profil`);

  if (!force && exists(outFile)) {
    return { skipped: true, elapsed: 0 };
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(tmpFile, { force: true });
  ensureDir(tmpDir);

  const slides = slidesOf(lang);
  const duration = slides.length * seconds;
  const filter = buildFilter({ lang, slides, seconds, tempDir: tmpDir });

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
  writeSubtitles(lang, slides, seconds);

  return { skipped: false, elapsed, duration };
}

function main() {
  const args = parseArgs();

  ensureDir(videoRoot);
  fs.rmSync(path.join(videoRoot, '.tmp-render'), { recursive: true, force: true });

  const report = {
    generatedAt: new Date().toISOString(),
    root: videoRoot,
    mode: 'profile-client-account-services-walkthrough',
    video: '02_profil',
    languages: args.langs,
    results: [],
  };

  console.log('══════════════════════════════════════════════════════════════');
  console.log(' ZEDPERA — Profile / Client Account video manual generator');
  console.log(' Mode: same professional style / no AI guide / 6 languages');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`Root: ${videoRoot}`);
  console.log(`Languages: ${args.langs.join(', ')}`);
  console.log(`Seconds per slide: ${args.seconds}`);
  console.log('──────────────────────────────────────────────────────────────');

  let ok = 0;
  let fail = 0;
  let skip = 0;

  for (const lang of args.langs) {
    process.stdout.write(`RENDER ${lang}/02_profil ... `);

    const item = {
      lang,
      slug: '02_profil',
      title: TITLE[lang],
      ok: false,
      skipped: false,
      error: null,
    };

    try {
      const result = renderVideo({
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
    writeText(path.join(videoRoot, 'generation-report-profile.json'), JSON.stringify(report, null, 2));
  }

  report.finishedAt = new Date().toISOString();
  report.summary = { ok, fail, skip };
  writeText(path.join(videoRoot, 'generation-report-profile.json'), JSON.stringify(report, null, 2));

  console.log('──────────────────────────────────────────────────────────────');
  console.log(`OK: ${ok}`);
  console.log(`FAIL: ${fail}`);
  console.log(`SKIP: ${skip}`);
  console.log(`Report: ${path.join(videoRoot, 'generation-report-profile.json')}`);
}

main();
