#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * ZEDPERA - GENERÁTOR PREZENTAČNÝCH VIDEO MANUÁLOV
 * Režim: www.zedpera.com / bez hlasu / bez MP3 / bez kurzora / všetky jazyky
 *
 * Výstup:
 * public/video-manualy/sk/*.mp4 + *.vtt + *.srt
 * public/video-manualy/cs/*.mp4 + *.vtt + *.srt
 * public/video-manualy/en/*.mp4 + *.vtt + *.srt
 * public/video-manualy/de/*.mp4 + *.vtt + *.srt
 * public/video-manualy/pl/*.mp4 + *.vtt + *.srt
 * public/video-manualy/hu/*.mp4 + *.vtt + *.srt
 *
 * Spustenie:
 * node scripts/_create-localized-video-manuals.cjs --force
 * node scripts/_create-localized-video-manuals.cjs --force --langs=sk,cs,en,de,pl,hu
 * node scripts/_create-localized-video-manuals.cjs --force --manual=03_ai_chat
 * node scripts/_create-localized-video-manuals.cjs --force --seconds=6
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

const FONT_REGULAR = 'C:/Windows/Fonts/arial.ttf';
const FONT_BOLD = 'C:/Windows/Fonts/arialbd.ttf';

const DEFAULT_SECONDS = 5;
const DEFAULT_TIMEOUT = 120000;

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
    guide: 'Prezentačný video manuál',
    section: 'Sekcia',
    step: 'Krok',
    click: 'Kliknite na príslušnú kartu alebo tlačidlo v aplikácii.',
    doneTitle: 'Manuál dokončený',
    doneText: 'Túto sekciu môžete teraz používať samostatne a efektívne.',
    footer: 'www.zedpera.com · moderný klikateľný manuál',
  },
  cs: {
    lang: 'Čeština',
    guide: 'Prezentační video návod',
    section: 'Sekce',
    step: 'Krok',
    click: 'Klikněte na příslušnou kartu nebo tlačítko v aplikaci.',
    doneTitle: 'Návod dokončen',
    doneText: 'Tuto sekci nyní můžete používat samostatně a efektivně.',
    footer: 'www.zedpera.com · moderní klikatelný návod',
  },
  en: {
    lang: 'English',
    guide: 'Presentation video guide',
    section: 'Section',
    step: 'Step',
    click: 'Click the relevant card or button in the application.',
    doneTitle: 'Guide complete',
    doneText: 'You can now use this section independently and effectively.',
    footer: 'www.zedpera.com · modern clickable guide',
  },
  de: {
    lang: 'Deutsch',
    guide: 'Präsentationsvideo-Anleitung',
    section: 'Bereich',
    step: 'Schritt',
    click: 'Klicken Sie auf die passende Karte oder Schaltfläche in der Anwendung.',
    doneTitle: 'Anleitung abgeschlossen',
    doneText: 'Sie können diesen Bereich nun selbstständig und effizient nutzen.',
    footer: 'www.zedpera.com · moderne klickbare Anleitung',
  },
  pl: {
    lang: 'Polski',
    guide: 'Prezentacyjna instrukcja wideo',
    section: 'Sekcja',
    step: 'Krok',
    click: 'Kliknij odpowiednią kartę lub przycisk w aplikacji.',
    doneTitle: 'Instrukcja ukończona',
    doneText: 'Możesz teraz korzystać z tej sekcji samodzielnie i efektywnie.',
    footer: 'www.zedpera.com · nowoczesna klikalna instrukcja',
  },
  hu: {
    lang: 'Magyar',
    guide: 'Prezentációs videó útmutató',
    section: 'Szekció',
    step: 'Lépés',
    click: 'Kattintson a megfelelő kártyára vagy gombra az alkalmazásban.',
    doneTitle: 'Útmutató kész',
    doneText: 'Most már önállóan és hatékonyan használhatja ezt a szekciót.',
    footer: 'www.zedpera.com · modern kattintható útmutató',
  },
};

const MANUALS = [
  ['01_hlavne_menu', 'basics',
    { sk: 'Hlavné menu', cs: 'Hlavní menu', en: 'Main menu', de: 'Hauptmenü', pl: 'Menu główne', hu: 'Főmenü' },
    {
      sk: ['Hlavné menu je vstupný bod do aplikácie Zedpera.', 'Otvoríte z neho práce, AI nástroje, balíčky, profil a manuály.', 'Kliknite na kartu podľa sekcie, ktorú chcete používať.', 'Na mobile používajte prehľadné karty namiesto zložitého menu.'],
      cs: ['Hlavní menu je vstupní bod do aplikace Zedpera.', 'Otevřete z něj práce, AI nástroje, balíčky, profil a návody.', 'Klikněte na kartu podle sekce, kterou chcete používat.', 'Na mobilu používejte přehledné karty místo složitého menu.'],
      en: ['The main menu is the entry point to the Zedpera application.', 'Open works, AI tools, packages, profile, and manuals from it.', 'Click the card for the section you want to use.', 'On mobile, use clear cards instead of a complex menu.'],
      de: ['Das Hauptmenü ist der Einstiegspunkt in Zedpera.', 'Öffnen Sie Arbeiten, KI-Werkzeuge, Pakete, Profil und Anleitungen.', 'Klicken Sie auf die Karte des gewünschten Bereichs.', 'Auf Mobilgeräten nutzen Sie übersichtliche Karten.'],
      pl: ['Menu główne jest punktem wejścia do aplikacji Zedpera.', 'Otworzysz z niego prace, narzędzia AI, pakiety, profil i instrukcje.', 'Kliknij kartę sekcji, której chcesz używać.', 'Na telefonie korzystaj z czytelnych kart.'],
      hu: ['A főmenü a Zedpera alkalmazás belépési pontja.', 'Innen nyithatók meg a munkák, AI eszközök, csomagok, profil és útmutatók.', 'Kattintson a használni kívánt szekció kártyájára.', 'Mobilon használjon áttekinthető kártyákat.'],
    }],
  ['02_profil', 'profile',
    { sk: 'Profil používateľa', cs: 'Profil uživatele', en: 'User profile', de: 'Benutzerprofil', pl: 'Profil użytkownika', hu: 'Felhasználói profil' },
    {
      sk: ['Profil nastavuje používateľa a akademickú prácu.', 'Vyplňte názov, tému, odbor, jazyk a citačnú normu.', 'Presný profil zlepšuje výsledky AI modulov.', 'Po každej zmene profil uložte.'],
      cs: ['Profil nastavuje uživatele a akademickou práci.', 'Vyplňte název, téma, obor, jazyk a citační normu.', 'Přesný profil zlepšuje výsledky AI modulů.', 'Po každé změně profil uložte.'],
      en: ['The profile configures the user and academic work.', 'Fill in title, topic, field, language, and citation style.', 'A precise profile improves AI module results.', 'Save the profile after each change.'],
      de: ['Das Profil konfiguriert Benutzer und akademische Arbeit.', 'Füllen Sie Titel, Thema, Fachgebiet, Sprache und Zitierstil aus.', 'Ein präzises Profil verbessert KI-Ergebnisse.', 'Speichern Sie das Profil nach jeder Änderung.'],
      pl: ['Profil konfiguruje użytkownika i pracę akademicką.', 'Uzupełnij tytuł, temat, dziedzinę, język i styl cytowania.', 'Dokładny profil poprawia wyniki AI.', 'Po każdej zmianie zapisz profil.'],
      hu: ['A profil beállítja a felhasználót és az akadémiai munkát.', 'Töltse ki a címet, témát, területet, nyelvet és idézési stílust.', 'A pontos profil javítja az AI eredményeket.', 'Minden módosítás után mentse a profilt.'],
    }],
  ['03_ai_chat', 'ai',
    { sk: 'AI Chat', cs: 'AI Chat', en: 'AI Chat', de: 'AI Chat', pl: 'AI Chat', hu: 'AI Chat' },
    {
      sk: ['AI Chat pomáha písať, upravovať a vysvetľovať odborný text.', 'Zadajte presnú požiadavku a kontext práce.', 'Vyberte štýl odpovede podľa potreby.', 'Výsledok vždy skontrolujte a upravte.'],
      cs: ['AI Chat pomáhá psát, upravovat a vysvětlovat odborný text.', 'Zadejte přesný požadavek a kontext práce.', 'Vyberte styl odpovědi podle potřeby.', 'Výsledek vždy zkontrolujte a upravte.'],
      en: ['AI Chat helps write, edit, and explain academic text.', 'Enter a precise request and work context.', 'Choose the response style you need.', 'Always review and adjust the output.'],
      de: ['AI Chat hilft beim Schreiben, Überarbeiten und Erklären.', 'Geben Sie eine genaue Anfrage und Kontext ein.', 'Wählen Sie den passenden Antwortstil.', 'Prüfen und bearbeiten Sie das Ergebnis.'],
      pl: ['AI Chat pomaga pisać, edytować i wyjaśniać tekst.', 'Wpisz dokładne polecenie i kontekst pracy.', 'Wybierz potrzebny styl odpowiedzi.', 'Zawsze sprawdź i popraw wynik.'],
      hu: ['Az AI Chat segít szöveget írni, javítani és magyarázni.', 'Adjon meg pontos kérést és munkakörnyezetet.', 'Válassza ki a válaszstílust.', 'Mindig ellenőrizze és módosítsa az eredményt.'],
    }],
  ['04_moje_prace', 'works',
    { sk: 'Moje práce', cs: 'Moje práce', en: 'My works', de: 'Meine Arbeiten', pl: 'Moje prace', hu: 'Munkáim' },
    genericSteps('works')],
  ['05_nova_praca', 'works',
    { sk: 'Nová práca', cs: 'Nová práce', en: 'New work', de: 'Neue Arbeit', pl: 'Nowa praca', hu: 'Új munka' },
    genericSteps('newWork')],
  ['06_ai_veduci', 'ai',
    { sk: 'AI školiteľ', cs: 'AI školitel', en: 'AI supervisor', de: 'KI-Betreuer', pl: 'Opiekun AI', hu: 'AI témavezető' },
    genericSteps('aiSupervisor')],
  ['07_audit_kvality', 'review',
    { sk: 'Audit kvality', cs: 'Audit kvality', en: 'Quality audit', de: 'Qualitätsaudit', pl: 'Audyt jakości', hu: 'Minőségi audit' },
    genericSteps('audit')],
  ['08_obhajoba', 'defense',
    { sk: 'Obhajoba', cs: 'Obhajoba', en: 'Defense preparation', de: 'Verteidigung', pl: 'Obrona', hu: 'Védés' },
    genericSteps('defense')],
  ['09_preklad', 'communication',
    { sk: 'Preklad', cs: 'Překlad', en: 'Translator', de: 'Übersetzer', pl: 'Tłumacz', hu: 'Fordító' },
    genericSteps('translate')],
  ['10_analyza_dat', 'research',
    { sk: 'Analýza dát', cs: 'Analýza dat', en: 'Data analysis', de: 'Datenanalyse', pl: 'Analiza danych', hu: 'Adatelemzés' },
    genericSteps('data')],
  ['11_planovanie', 'organization',
    { sk: 'Plánovanie', cs: 'Plánování', en: 'Planning', de: 'Planung', pl: 'Planowanie', hu: 'Tervezés' },
    genericSteps('planning')],
  ['12_emaily', 'communication',
    { sk: 'Emaily', cs: 'E-maily', en: 'Emails', de: 'E-Mails', pl: 'E-maile', hu: 'E-mailek' },
    genericSteps('emails')],
  ['13_originalita_prace', 'review',
    { sk: 'Originalita práce', cs: 'Originalita práce', en: 'Originality check', de: 'Originalitätsprüfung', pl: 'Sprawdzenie oryginalności', hu: 'Eredetiség ellenőrzés' },
    genericSteps('originality')],
  ['14_humanizacia_textu', 'ai',
    { sk: 'Humanizácia textu', cs: 'Humanizace textu', en: 'Text humanization', de: 'Texthumanisierung', pl: 'Humanizacja tekstu', hu: 'Szöveg humanizálása' },
    genericSteps('humanize')],
  ['15_zdroje_citacie', 'sources',
    { sk: 'Zdroje a citácie', cs: 'Zdroje a citace', en: 'Sources and citations', de: 'Quellen und Zitate', pl: 'Źródła i cytowania', hu: 'Források és hivatkozások' },
    genericSteps('sources')],
  ['16_balicky', 'payments',
    { sk: 'Balíčky', cs: 'Balíčky', en: 'Packages', de: 'Pakete', pl: 'Pakiety', hu: 'Csomagok' },
    genericSteps('packages')],
  ['17_historia_chatu', 'history',
    { sk: 'História chatu', cs: 'Historie chatu', en: 'Chat history', de: 'Chatverlauf', pl: 'Historia czatu', hu: 'Csevegési előzmények' },
    genericSteps('history')],
  ['18_video_navod', 'help',
    { sk: 'Video návod', cs: 'Video návod', en: 'Video guide', de: 'Videoanleitung', pl: 'Instrukcja wideo', hu: 'Videó útmutató' },
    genericSteps('videoGuide')],
  ['19_vzhlad_aplikacie', 'settings',
    { sk: 'Vzhľad aplikácie', cs: 'Vzhled aplikace', en: 'Application appearance', de: 'Erscheinungsbild', pl: 'Wygląd aplikacji', hu: 'Alkalmazás megjelenése' },
    genericSteps('appearance')],
  ['20_odhlasenie', 'settings',
    { sk: 'Odhlásenie', cs: 'Odhlášení', en: 'Sign out', de: 'Abmelden', pl: 'Wylogowanie', hu: 'Kijelentkezés' },
    genericSteps('logout')],
].map(([slug, category, title, steps]) => ({ slug, category, title, steps }));

function genericSteps(kind) {
  const map = {
    works: {
      sk: ['Sekcia zobrazuje uložené práce.', 'Vyberte existujúcu prácu alebo vytvorte novú.', 'Po kliknutí sa načíta profil a moduly.', 'Použite ju na rýchly návrat k projektu.'],
      cs: ['Sekce zobrazuje uložené práce.', 'Vyberte existující práci nebo vytvořte novou.', 'Po kliknutí se načte profil a moduly.', 'Použijte ji pro rychlý návrat k projektu.'],
      en: ['This section displays saved works.', 'Select an existing work or create a new one.', 'After clicking, the profile and modules load.', 'Use it to quickly return to a project.'],
      de: ['Dieser Bereich zeigt gespeicherte Arbeiten.', 'Wählen Sie eine Arbeit oder erstellen Sie eine neue.', 'Nach dem Klick laden Profil und Module.', 'Nutzen Sie ihn für schnellen Projektzugriff.'],
      pl: ['Sekcja pokazuje zapisane prace.', 'Wybierz istniejącą pracę lub utwórz nową.', 'Po kliknięciu załaduje się profil i moduły.', 'Użyj jej do szybkiego powrotu do projektu.'],
      hu: ['Ez a szekció megjeleníti a mentett munkákat.', 'Válasszon meglévő munkát vagy hozzon létre újat.', 'Kattintás után betöltődik a profil és a modulok.', 'Használja gyors visszatérésre a projekthez.'],
    },
    newWork: {
      sk: ['Nová práca vytvorí samostatný projekt.', 'Zadajte názov, tému, typ práce a jazyk.', 'Vyplňte čo najviac údajov.', 'Po uložení môžete používať všetky moduly.'],
      cs: ['Nová práce vytvoří samostatný projekt.', 'Zadejte název, téma, typ práce a jazyk.', 'Vyplňte co nejvíce údajů.', 'Po uložení můžete používat všechny moduly.'],
      en: ['New work creates a separate project.', 'Enter title, topic, work type, and language.', 'Fill in as many details as possible.', 'After saving, use all modules.'],
      de: ['Neue Arbeit erstellt ein eigenes Projekt.', 'Geben Sie Titel, Thema, Typ und Sprache ein.', 'Füllen Sie möglichst viele Angaben aus.', 'Nach dem Speichern nutzen Sie alle Module.'],
      pl: ['Nowa praca tworzy osobny projekt.', 'Wpisz tytuł, temat, typ pracy i język.', 'Uzupełnij jak najwięcej danych.', 'Po zapisaniu używaj wszystkich modułów.'],
      hu: ['Az Új munka külön projektet hoz létre.', 'Adja meg a címet, témát, típust és nyelvet.', 'Töltsön ki minél több adatot.', 'Mentés után használja az összes modult.'],
    },
    aiSupervisor: {
      sk: ['AI školiteľ vedie tvorbu odbornej práce.', 'Pomáha s osnovou, cieľmi a metodikou.', 'Pýtajte sa v kontexte profilu práce.', 'Výstupy používajte ako odbornú oporu.'],
      cs: ['AI školitel vede tvorbu odborné práce.', 'Pomáhá s osnovou, cíli a metodikou.', 'Ptejte se v kontextu profilu práce.', 'Výstupy používejte jako odbornou oporu.'],
      en: ['AI supervisor guides academic work creation.', 'It helps with outline, goals, and methodology.', 'Ask in the context of the work profile.', 'Use outputs as expert support.'],
      de: ['Der KI-Betreuer begleitet die Arbeitserstellung.', 'Er hilft bei Gliederung, Zielen und Methodik.', 'Fragen Sie im Kontext des Profils.', 'Nutzen Sie Ergebnisse als fachliche Unterstützung.'],
      pl: ['Opiekun AI prowadzi tworzenie pracy.', 'Pomaga z planem, celami i metodologią.', 'Pytaj w kontekście profilu pracy.', 'Używaj wyników jako wsparcia.'],
      hu: ['Az AI témavezető támogatja a munka készítését.', 'Segít a vázlatban, célokban és módszertanban.', 'A munkaprofil kontextusában kérdezzen.', 'Használja az eredményeket szakmai támogatásként.'],
    },
    audit: {
      sk: ['Audit kontroluje text, štruktúru a citácie.', 'Vložte kapitolu alebo celý text.', 'Vyberte typ kontroly.', 'Výsledky použite ako zoznam opráv.'],
      cs: ['Audit kontroluje text, strukturu a citace.', 'Vložte kapitolu nebo celý text.', 'Vyberte typ kontroly.', 'Výsledky použijte jako seznam oprav.'],
      en: ['Audit checks text, structure, and citations.', 'Insert a chapter or full text.', 'Choose review type.', 'Use results as an improvement list.'],
      de: ['Audit prüft Text, Struktur und Zitate.', 'Fügen Sie Kapitel oder Volltext ein.', 'Wählen Sie die Prüfart.', 'Nutzen Sie Ergebnisse als Verbesserungsliste.'],
      pl: ['Audyt sprawdza tekst, strukturę i cytowania.', 'Wklej rozdział lub cały tekst.', 'Wybierz typ kontroli.', 'Użyj wyników jako listy poprawek.'],
      hu: ['Az audit ellenőrzi a szöveget, szerkezetet és hivatkozásokat.', 'Illesszen be fejezetet vagy teljes szöveget.', 'Válassza ki az ellenőrzés típusát.', 'Használja az eredményeket javítási listaként.'],
    },
    defense: {
      sk: ['Obhajoba pomáha pripraviť prezentáciu.', 'Zadajte cieľ práce a hlavné výsledky.', 'AI pripraví osnovu a otázky.', 'Výstup upravte podľa školy.'],
      cs: ['Obhajoba pomáhá připravit prezentaci.', 'Zadejte cíl práce a hlavní výsledky.', 'AI připraví osnovu a otázky.', 'Výstup upravte podle školy.'],
      en: ['Defense helps prepare a presentation.', 'Enter work goal and key results.', 'AI prepares outline and questions.', 'Adjust output to school requirements.'],
      de: ['Verteidigung hilft bei Präsentation.', 'Geben Sie Ziel und Ergebnisse ein.', 'KI erstellt Gliederung und Fragen.', 'Passen Sie den Output an Vorgaben an.'],
      pl: ['Obrona pomaga przygotować prezentację.', 'Podaj cel pracy i wyniki.', 'AI przygotuje plan i pytania.', 'Dostosuj wynik do wymagań uczelni.'],
      hu: ['A Védés segít prezentációt készíteni.', 'Adja meg a célt és fő eredményeket.', 'Az AI vázlatot és kérdéseket készít.', 'Igazítsa az intézményi követelményekhez.'],
    },
    translate: {
      sk: ['Preklad prekladá odborné texty medzi jazykmi.', 'Vyberte zdrojový a cieľový jazyk.', 'Vložte text a spustite preklad.', 'Skontrolujte odbornú terminológiu.'],
      cs: ['Překlad překládá odborné texty mezi jazyky.', 'Vyberte zdrojový a cílový jazyk.', 'Vložte text a spusťte překlad.', 'Zkontrolujte odbornou terminologii.'],
      en: ['Translator translates academic texts between languages.', 'Choose source and target language.', 'Insert text and start translation.', 'Check professional terminology.'],
      de: ['Übersetzer übersetzt Fachtexte zwischen Sprachen.', 'Wählen Sie Quell- und Zielsprache.', 'Fügen Sie Text ein und starten Sie.', 'Prüfen Sie Fachterminologie.'],
      pl: ['Tłumacz tłumaczy teksty specjalistyczne.', 'Wybierz język źródłowy i docelowy.', 'Wklej tekst i uruchom tłumaczenie.', 'Sprawdź terminologię.'],
      hu: ['A Fordító szakmai szövegeket fordít nyelvek között.', 'Válassza ki a forrás- és célnyelvet.', 'Illessze be a szöveget és indítsa el.', 'Ellenőrizze a terminológiát.'],
    },
    data: {
      sk: ['Analýza dát spracuje tabuľky a dáta.', 'Nahrajte súbor alebo vložte dáta.', 'Vyberte typ analýzy.', 'Exportujte výsledky do Wordu, Excelu alebo PDF.'],
      cs: ['Analýza dat zpracuje tabulky a data.', 'Nahrajte soubor nebo vložte data.', 'Vyberte typ analýzy.', 'Exportujte výsledky do Wordu, Excelu nebo PDF.'],
      en: ['Data analysis processes tables and data.', 'Upload a file or insert data.', 'Choose analysis type.', 'Export results to Word, Excel, or PDF.'],
      de: ['Datenanalyse verarbeitet Tabellen und Daten.', 'Laden Sie Datei hoch oder fügen Sie Daten ein.', 'Wählen Sie den Analysetyp.', 'Exportieren Sie nach Word, Excel oder PDF.'],
      pl: ['Analiza danych przetwarza tabele i dane.', 'Prześlij plik lub wklej dane.', 'Wybierz typ analizy.', 'Eksportuj do Worda, Excela lub PDF.'],
      hu: ['Az Adatelemzés táblázatokat és adatokat dolgoz fel.', 'Töltsön fel fájlt vagy illesszen be adatokat.', 'Válassza ki az elemzés típusát.', 'Exportáljon Wordbe, Excelbe vagy PDF-be.'],
    },
    planning: genericSimple('Planning creates a realistic task schedule.'),
    emails: genericSimple('Emails creates professional communication.'),
    originality: genericSimple('Originality check helps review similarity and citations.'),
    humanize: genericSimple('Text humanization improves style and naturalness.'),
    sources: genericSimple('Sources and citations manages literature records.'),
    packages: genericSimple('Packages define the available functions and limits.'),
    history: genericSimple('Chat history stores and reopens previous conversations.'),
    videoGuide: genericSimple('Video guide provides quick visual help for each section.'),
    appearance: genericSimple('Application appearance controls visual comfort.'),
    logout: genericSimple('Sign out safely ends work in the application.'),
  };

  return map[kind] || map.works;
}

function genericSimple(enText) {
  return {
    sk: ['Otvorte príslušnú sekciu v aplikácii.', 'Skontrolujte dostupné možnosti a popis.', 'Kliknite na požadovanú funkciu.', 'Výsledok uložte alebo použite v práci.'],
    cs: ['Otevřete příslušnou sekci v aplikaci.', 'Zkontrolujte dostupné možnosti a popis.', 'Klikněte na požadovanou funkci.', 'Výsledek uložte nebo použijte v práci.'],
    en: [enText, 'Review the available options and description.', 'Click the required function.', 'Save or use the result in your work.'],
    de: ['Öffnen Sie den entsprechenden Bereich.', 'Prüfen Sie Optionen und Beschreibung.', 'Klicken Sie auf die gewünschte Funktion.', 'Speichern oder nutzen Sie das Ergebnis.'],
    pl: ['Otwórz odpowiednią sekcję w aplikacji.', 'Sprawdź opcje i opis.', 'Kliknij wymaganą funkcję.', 'Zapisz lub użyj wyniku w pracy.'],
    hu: ['Nyissa meg a megfelelő szekciót.', 'Ellenőrizze a lehetőségeket és leírást.', 'Kattintson a kívánt funkcióra.', 'Mentse vagy használja fel az eredményt.'],
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
      if (Number.isFinite(n) && n >= 3) args.seconds = n;
    } else if (arg.startsWith('--timeout=')) {
      const n = Number(arg.replace('--timeout=', '').trim());
      if (Number.isFinite(n) && n > 5000) args.timeout = n;
    }
  }
  args.langs = [...new Set(args.langs)].filter(x => LANGS.includes(x));
  if (!args.langs.length) args.langs = LANGS;
  return args;
}

function normalizeLang(value) {
  const v = String(value || 'sk').trim().toLowerCase();
  return v === 'cz' ? 'cs' : LANGS.includes(v) ? v : 'sk';
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function exists(file) { return file && fs.existsSync(file); }
function writeText(file, text) { ensureDir(path.dirname(file)); fs.writeFileSync(file, text, 'utf8'); }
function ffPath(v) { return String(v || '').replace(/\\/g, '/').replace(/:/g, '\\:'); }

function safeText(v) {
  return String(v || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/%/g, '\\%')
    .replace(/\n/g, ' ');
}

function wrap(text, max) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let row = '';
  for (const word of words) {
    const next = row ? `${row} ${word}` : word;
    if (next.length > max && row) { lines.push(row); row = word; }
    else row = next;
  }
  if (row) lines.push(row);
  return lines.join('\n');
}

function textFile(tempDir, name, value) {
  const file = path.join(tempDir, `${name}.txt`);
  writeText(file, value);
  return ffPath(file);
}

function srtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function titleOf(manual, lang) { return manual.title[lang] || manual.title.en || manual.title.sk || manual.slug; }
function stepsOf(manual, lang) { return manual.steps[lang] || manual.steps.en || manual.steps.sk || []; }

function slidesOf(manual, lang) {
  const ui = UI[lang];
  const title = titleOf(manual, lang);
  const steps = stepsOf(manual, lang);
  return [
    { kind: 'intro', eyebrow: `${ui.guide} · ${ui.lang}`, title, text: `${ui.section}: ${title}. ${ui.click}` },
    ...steps.map((s, i) => ({ kind: 'step', eyebrow: title, title: `${ui.step} ${i + 1}`, text: s })),
    { kind: 'final', eyebrow: ui.doneTitle, title: ui.doneTitle, text: ui.doneText },
  ];
}

function writeSubs(manual, lang, slides, seconds) {
  const blocks = slides.map((slide, i) => {
    const start = i * seconds;
    const end = (i + 1) * seconds - 0.1;
    return [String(i + 1), `${srtTime(start)} --> ${srtTime(end)}`, `${slide.title}\n${slide.text}`, ''].join('\n');
  });
  const srt = blocks.join('\n');
  const vtt = `WEBVTT\n\n${srt.replace(/,(\d{3})/g, '.$1')}`;
  writeText(path.join(videoRoot, lang, `${manual.slug}.srt`), srt);
  writeText(path.join(videoRoot, lang, `${manual.slug}.vtt`), vtt);
}

function buildFilter({ manual, lang, slides, seconds, tempDir }) {
  const ui = UI[lang];
  const accent = ACCENT[lang];
  const soft = SOFT[lang];
  const regular = ffPath(FONT_REGULAR);
  const bold = ffPath(FONT_BOLD);
  const duration = slides.length * seconds;

  const brand = textFile(tempDir, 'brand', 'ZEDPERA');
  const domain = textFile(tempDir, 'domain', 'www.zedpera.com');
  const guide = textFile(tempDir, 'guide', `${ui.guide} · ${ui.lang}`);
  const footer = textFile(tempDir, 'footer', ui.footer);

  const f = [];
  f.push('format=yuv420p');
  f.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=0x020617:t=fill`);
  f.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=${accent}@0.035:t=fill`);
  f.push(`drawbox=x=0:y=0:w=${W}:h=132:color=0x050816@0.96:t=fill`);
  f.push(`drawbox=x=52:y=38:w=206:h=52:color=${accent}:t=fill`);
  f.push(`drawtext=fontfile='${bold}':textfile='${brand}':fontcolor=white:fontsize=30:x=82:y=51`);
  f.push(`drawtext=fontfile='${regular}':textfile='${guide}':fontcolor=${soft}:fontsize=24:x=292:y=51`);
  f.push(`drawtext=fontfile='${regular}':textfile='${domain}':fontcolor=0x94a3b8:fontsize=20:x=292:y=83`);
  f.push(`drawbox=x=0:y=130:w=${W}:h=4:color=${accent}:t=fill`);
  f.push(`drawbox=x=0:y=666:w=${W}:h=54:color=0x050816@0.96:t=fill`);
  f.push(`drawtext=fontfile='${regular}':textfile='${footer}':fontcolor=0x94a3b8:fontsize=20:x=54:y=684`);

  slides.forEach((slide, i) => {
    const start = i * seconds;
    const end = (i + 1) * seconds - 0.05;
    const enable = `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`;
    const eyebrow = textFile(tempDir, `s${i}-eyebrow`, slide.eyebrow);
    const title = textFile(tempDir, `s${i}-title`, wrap(slide.title, 30));
    const text = textFile(tempDir, `s${i}-text`, wrap(slide.text, 54));
    const progress = Math.round(1152 * ((i + 1) / slides.length));

    f.push(`drawbox=x=64:y=182:w=1152:h=430:color=0x111827@0.92:t=fill:${enable}`);
    f.push(`drawbox=x=64:y=182:w=10:h=430:color=${accent}:t=fill:${enable}`);
    f.push(`drawbox=x=96:y=220:w=190:h=44:color=${accent}@0.95:t=fill:${enable}`);
    f.push(`drawtext=fontfile='${bold}':text='${safeText(ui.section)}':fontcolor=white:fontsize=20:x=124:y=232:${enable}`);
    f.push(`drawtext=fontfile='${regular}':textfile='${eyebrow}':fontcolor=${soft}:fontsize=24:x=104:y=292:${enable}`);
    f.push(`drawtext=fontfile='${bold}':textfile='${title}':fontcolor=white:fontsize=${slide.kind === 'intro' ? 58 : 50}:line_spacing=8:x=104:y=338:${enable}`);
    f.push(`drawtext=fontfile='${regular}':textfile='${text}':fontcolor=0xe2e8f0:fontsize=31:line_spacing=12:x=104:y=464:${enable}`);
    f.push(`drawbox=x=878:y=248:w=270:h=250:color=0x020617@0.70:t=fill:${enable}`);
    f.push(`drawbox=x=900:y=272:w=86:h=86:color=${accent}:t=fill:${enable}`);
    f.push(`drawtext=fontfile='${bold}':text='${safeText(String(i + 1))}':fontcolor=white:fontsize=44:x=930:y=290:${enable}`);
    f.push(`drawtext=fontfile='${bold}':text='${safeText(ui.click)}':fontcolor=white:fontsize=20:line_spacing=8:x=902:y=384:${enable}`);
    f.push(`drawbox=x=64:y=634:w=1152:h=10:color=0x1e293b:t=fill:${enable}`);
    f.push(`drawbox=x=64:y=634:w=${progress}:h=10:color=${accent}:t=fill:${enable}`);
    f.push(`drawtext=fontfile='${bold}':text='${safeText(`${i + 1}/${slides.length}`)}':fontcolor=white:fontsize=22:x=1136:y=626:${enable}`);
  });

  return { filter: f.join(','), duration };
}

function render({ manual, lang, force, seconds, timeout }) {
  const outDir = path.join(videoRoot, lang);
  ensureDir(outDir);

  const outFile = path.join(outDir, `${manual.slug}.mp4`);
  const tmpOut = `${outFile}.tmp.mp4`;
  const tmpDir = path.join(videoRoot, '.tmp-render', `${lang}-${manual.slug}`);

  if (!force && exists(outFile)) return { skipped: true, outFile, elapsed: 0 };

  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(tmpOut, { force: true });
  ensureDir(tmpDir);

  const slides = slidesOf(manual, lang);
  const { filter, duration } = buildFilter({ manual, lang, slides, seconds, tempDir: tmpDir });

  const args = [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
    '-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${duration.toFixed(2)}`,
    '-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=48000:d=${duration.toFixed(2)}`,
    '-map', '0:v:0', '-map', '1:a:0',
    '-vf', filter,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'stillimage', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-ar', '48000',
    '-t', duration.toFixed(2), '-movflags', '+faststart',
    tmpOut,
  ];

  const started = Date.now();
  const result = cp.spawnSync('ffmpeg', args, { encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 1024 * 1024 * 32 });
  const elapsed = Date.now() - started;

  if (result.error?.code === 'ETIMEDOUT') {
    fs.rmSync(tmpOut, { force: true });
    throw new Error(`FFmpeg timeout po ${Math.round(elapsed / 1000)} s.`);
  }
  if (result.status !== 0) {
    fs.rmSync(tmpOut, { force: true });
    throw new Error(result.stderr || result.stdout || 'FFmpeg zlyhal.');
  }
  if (!exists(tmpOut) || fs.statSync(tmpOut).size < 4096) {
    fs.rmSync(tmpOut, { force: true });
    throw new Error('FFmpeg nevytvoril platné MP4.');
  }

  fs.renameSync(tmpOut, outFile);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  writeSubs(manual, lang, slides, seconds);

  return { skipped: false, outFile, elapsed, duration };
}

function main() {
  const args = parseArgs();
  ensureDir(videoRoot);
  fs.rmSync(path.join(videoRoot, '.tmp-render'), { recursive: true, force: true });

  const manuals = MANUALS.filter(m => !args.manual || m.slug === args.manual);
  const report = { generatedAt: new Date().toISOString(), mode: 'zedpera-presentation-videos', root: videoRoot, langs: args.langs, manuals: manuals.map(m => m.slug), results: [] };

  console.log('══════════════════════════════════════════════════════════════');
  console.log(' ZEDPERA — www.zedpera.com video manual generator');
  console.log(' Mode: silent presentation / all languages / clickable manual style');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`Root: ${videoRoot}`);
  console.log(`Languages: ${args.langs.join(', ')}`);
  console.log(`Manuals: ${manuals.length}`);
  console.log(`Seconds per slide: ${args.seconds}`);
  console.log('──────────────────────────────────────────────────────────────');

  let ok = 0, fail = 0, skip = 0;

  for (const lang of args.langs) {
    ensureDir(path.join(videoRoot, lang));
    for (const manual of manuals) {
      process.stdout.write(`RENDER ${lang}/${manual.slug} ... `);
      const item = { lang, slug: manual.slug, title: titleOf(manual, lang), category: manual.category, ok: false, skipped: false, error: null };
      try {
        const res = render({ manual, lang, force: args.force, seconds: args.seconds, timeout: args.timeout });
        item.ok = true; item.skipped = res.skipped; item.elapsedMs = res.elapsed; item.durationSeconds = res.duration || 0;
        if (res.skipped) { skip++; console.log('SKIP'); } else { ok++; console.log(`OK ${Math.round(res.elapsed / 1000)}s`); }
      } catch (e) {
        fail++; item.error = e instanceof Error ? e.message : String(e); console.log(`FAIL ${item.error}`);
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
