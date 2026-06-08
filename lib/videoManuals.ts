import type { AppLanguage } from '@/lib/i18n';

export type VideoManualTranslation = {
  title: string;
  description: string;
  category: string;
  steps: string[];
};

export type VideoManual = {
  slug: string;
  order: number;
  duration: string;
  fileBase: string;
  hidden?: boolean;
  translations: Record<AppLanguage, VideoManualTranslation>;
};

export type LocalizedVideoManual = VideoManual & {
  title: string;
  description: string;
  category: string;
  steps: string[];
  videoUrl: string;
  thumbnail: string;
};

const fallbackLanguage: AppLanguage = 'sk';

const videoLanguageFolders: Record<AppLanguage, string> = {
  sk: 'sk',
  cs: 'cs',
  en: 'en',
  de: 'de',
  pl: 'pl',
  hu: 'hu',
};

function createTranslations(
  translations: Record<AppLanguage, VideoManualTranslation>,
) {
  return translations;
}

export function getVideoManualTranslation(
  manual: VideoManual,
  language: AppLanguage,
): VideoManualTranslation {
  return manual.translations[language] || manual.translations[fallbackLanguage];
}

export function getVideoManualVideoUrl(
  manual: VideoManual,
  language: AppLanguage,
): string {
  const folder = videoLanguageFolders[language] || videoLanguageFolders[fallbackLanguage];

  return `/video-manualy/${folder}/${manual.fileBase}.mp4`;
}

export function getVideoManualThumbnail(
  manual: VideoManual,
  language: AppLanguage,
): string {
  const folder = videoLanguageFolders[language] || videoLanguageFolders[fallbackLanguage];

  return `/video-manualy/${folder}/${manual.fileBase}.png`;
}

export function getLocalizedVideoManual(
  manual: VideoManual,
  language: AppLanguage,
): LocalizedVideoManual {
  const copy = getVideoManualTranslation(manual, language);

  return {
    ...manual,
    title: copy.title,
    description: copy.description,
    category: copy.category,
    steps: copy.steps,
    videoUrl: getVideoManualVideoUrl(manual, language),
    thumbnail: getVideoManualThumbnail(manual, language),
  };
}

export function getVisibleVideoManuals() {
  return videoManuals.filter((manual) => !manual.hidden);
}

export function getLocalizedVisibleVideoManuals(language: AppLanguage) {
  return getVisibleVideoManuals().map((manual) =>
    getLocalizedVideoManual(manual, language),
  );
}

export function getVideoManualBySlug(slug: string) {
  return videoManuals.find((manual) => manual.slug === slug && !manual.hidden);
}

export function getLocalizedVideoManualBySlug(
  slug: string,
  language: AppLanguage,
) {
  const manual = getVideoManualBySlug(slug);

  if (!manual) return null;

  return getLocalizedVideoManual(manual, language);
}

export const videoManuals: VideoManual[] = [
  {
    order: 1,
    slug: 'hlavne-menu-zedpera',
    duration: '5 min',
    fileBase: '01_hlavne_menu',
    translations: createTranslations({
      sk: {
        title: '1. Hlavné menu Zedpera',
        description:
          'Animovaný manuál ukazuje vstup do systému Zedpera, hlavné menu, dashboard, výber modulu a základný spôsob práce so systémom.',
        category: 'Základy',
        steps: [
          'Otvorte webovú aplikáciu Zedpera a prihláste sa do svojho účtu.',
          'Po prihlásení sa zobrazí hlavný dashboard systému.',
          'Prezrite si hlavné sekcie ako Menu, Profil, AI Chat, Moje práce, Zdroje, Balíčky a Video návod.',
          'Skontrolujte, či máte vybranú správnu prácu alebo profil práce.',
          'Kliknite na požadovaný AI modul, napríklad AI školiteľ, Audit kvality, Obhajoba, Preklad, Analýza dát alebo Emaily.',
          'Do vstupného poľa vložte text, otázku alebo zadanie.',
          'Ak je potrebné, priložte súbor vo formáte Word, PDF, Excel, CSV alebo TXT.',
          'Kliknite na hlavné akčné tlačidlo a počkajte na spracovanie.',
          'Skontrolujte výsledok a podľa potreby ho exportujte.',
        ],
      },
      cs: {
        title: '1. Hlavní menu Zedpera',
        description:
          'Animovaný manuál ukazuje vstup do systému Zedpera, hlavní menu, dashboard, výběr modulu a základní způsob práce se systémem.',
        category: 'Základy',
        steps: [
          'Otevřete webovou aplikaci Zedpera a přihlaste se ke svému účtu.',
          'Po přihlášení se zobrazí hlavní dashboard systému.',
          'Prohlédněte si hlavní sekce jako Menu, Profil, AI Chat, Moje práce, Zdroje, Balíčky a Video návod.',
          'Zkontrolujte, zda máte vybranou správnou práci nebo profil práce.',
          'Klikněte na požadovaný AI modul, například AI školitel, Audit kvality, Obhajoba, Překlad, Analýza dat nebo Emaily.',
          'Do vstupního pole vložte text, otázku nebo zadání.',
          'V případě potřeby přiložte soubor ve formátu Word, PDF, Excel, CSV nebo TXT.',
          'Klikněte na hlavní akční tlačítko a počkejte na zpracování.',
          'Zkontrolujte výsledek a podle potřeby jej exportujte.',
        ],
      },
      en: {
        title: '1. Zedpera Main Menu',
        description:
          'This animated guide shows how to enter Zedpera, use the main menu, dashboard, module selection, and the basic workflow.',
        category: 'Basics',
        steps: [
          'Open the Zedpera web application and sign in to your account.',
          'After signing in, the main dashboard will appear.',
          'Review the main sections such as Menu, Profile, AI Chat, My Works, Sources, Packages, and Video Guide.',
          'Check whether the correct work or work profile is selected.',
          'Click the required AI module, such as AI Supervisor, Quality Audit, Defense, Translation, Data Analysis, or Emails.',
          'Insert text, a question, or an assignment into the input field.',
          'Attach a file if needed, such as Word, PDF, Excel, CSV, or TXT.',
          'Click the main action button and wait for processing.',
          'Review the result and export it if needed.',
        ],
      },
      de: {
        title: '1. Zedpera Hauptmenü',
        description:
          'Diese animierte Anleitung zeigt den Einstieg in Zedpera, das Hauptmenü, das Dashboard, die Modulauswahl und die grundlegende Arbeit mit dem System.',
        category: 'Grundlagen',
        steps: [
          'Öffnen Sie die Webanwendung Zedpera und melden Sie sich an.',
          'Nach der Anmeldung wird das Hauptdashboard angezeigt.',
          'Sehen Sie sich die Hauptbereiche wie Menü, Profil, AI Chat, Meine Arbeiten, Quellen, Pakete und Videoanleitung an.',
          'Prüfen Sie, ob die richtige Arbeit oder das richtige Arbeitsprofil ausgewählt ist.',
          'Klicken Sie auf das gewünschte AI-Modul, zum Beispiel KI-Betreuer, Qualitätsaudit, Verteidigung, Übersetzung, Datenanalyse oder E-Mails.',
          'Fügen Sie Text, eine Frage oder eine Aufgabe in das Eingabefeld ein.',
          'Fügen Sie bei Bedarf eine Datei wie Word, PDF, Excel, CSV oder TXT hinzu.',
          'Klicken Sie auf die Hauptaktion und warten Sie auf die Verarbeitung.',
          'Prüfen Sie das Ergebnis und exportieren Sie es bei Bedarf.',
        ],
      },
      pl: {
        title: '1. Menu główne Zedpera',
        description:
          'Animowany poradnik pokazuje wejście do systemu Zedpera, menu główne, dashboard, wybór modułu i podstawowy sposób pracy z systemem.',
        category: 'Podstawy',
        steps: [
          'Otwórz aplikację internetową Zedpera i zaloguj się na swoje konto.',
          'Po zalogowaniu pojawi się główny dashboard systemu.',
          'Sprawdź główne sekcje, takie jak Menu, Profil, AI Chat, Moje prace, Źródła, Pakiety i Instrukcja wideo.',
          'Upewnij się, że wybrana jest właściwa praca lub profil pracy.',
          'Kliknij wymagany moduł AI, na przykład Opiekun AI, Audyt jakości, Obrona, Tłumaczenie, Analiza danych lub E-maile.',
          'Wprowadź tekst, pytanie lub zadanie do pola wejściowego.',
          'W razie potrzeby dołącz plik Word, PDF, Excel, CSV lub TXT.',
          'Kliknij główny przycisk akcji i poczekaj na przetworzenie.',
          'Sprawdź wynik i w razie potrzeby wyeksportuj go.',
        ],
      },
      hu: {
        title: '1. Zedpera főmenü',
        description:
          'Az animált útmutató bemutatja a Zedpera rendszerbe való belépést, a főmenüt, az irányítópultot, a modulválasztást és az alapvető munkafolyamatot.',
        category: 'Alapok',
        steps: [
          'Nyissa meg a Zedpera webalkalmazást, és jelentkezzen be a fiókjába.',
          'Bejelentkezés után megjelenik a fő irányítópult.',
          'Tekintse át a fő részeket, például Menü, Profil, AI Chat, Munkáim, Források, Csomagok és Videó útmutató.',
          'Ellenőrizze, hogy a megfelelő munka vagy munkaprofil van-e kiválasztva.',
          'Kattintson a kívánt AI modulra, például AI témavezető, Minőségi audit, Védés, Fordítás, Adatelemzés vagy E-mailek.',
          'Illesszen be szöveget, kérdést vagy feladatot a beviteli mezőbe.',
          'Szükség esetén csatoljon Word, PDF, Excel, CSV vagy TXT fájlt.',
          'Kattintson a fő művelet gombra, és várja meg a feldolgozást.',
          'Ellenőrizze az eredményt, és szükség esetén exportálja.',
        ],
      },
    }),
  },
  {
    order: 2,
    slug: 'profil-pouzivatela',
    duration: '4 min',
    fileBase: '02_profil',
    translations: createTranslations({
      sk: {
        title: '2. Profil používateľa',
        description:
          'Manuál vysvetľuje správu používateľského profilu, údajov klienta, balíka a základných nastavení.',
        category: 'Profil',
        steps: [
          'Otvorte sekciu Profil.',
          'Skontrolujte meno, email a údaje klienta.',
          'Pozrite si informácie o balíku a dostupných službách.',
          'Skontrolujte nastavenia účtu a jazyk rozhrania.',
          'Ak je potrebné, aktualizujte údaje a uložte zmeny.',
        ],
      },
      cs: {
        title: '2. Profil uživatele',
        description:
          'Manuál vysvětluje správu uživatelského profilu, údajů klienta, balíčku a základních nastavení.',
        category: 'Profil',
        steps: [
          'Otevřete sekci Profil.',
          'Zkontrolujte jméno, e-mail a údaje klienta.',
          'Podívejte se na informace o balíčku a dostupných službách.',
          'Zkontrolujte nastavení účtu a jazyk rozhraní.',
          'V případě potřeby aktualizujte údaje a uložte změny.',
        ],
      },
      en: {
        title: '2. User Profile',
        description:
          'This guide explains how to manage the user profile, client details, plan, and basic settings.',
        category: 'Profile',
        steps: [
          'Open the Profile section.',
          'Check your name, email, and client information.',
          'Review your plan and available services.',
          'Check account settings and interface language.',
          'Update details if needed and save changes.',
        ],
      },
      de: {
        title: '2. Benutzerprofil',
        description:
          'Diese Anleitung erklärt die Verwaltung des Benutzerprofils, der Kundendaten, des Pakets und der Grundeinstellungen.',
        category: 'Profil',
        steps: [
          'Öffnen Sie den Bereich Profil.',
          'Prüfen Sie Name, E-Mail und Kundendaten.',
          'Sehen Sie sich Informationen zum Paket und zu verfügbaren Diensten an.',
          'Prüfen Sie Kontoeinstellungen und Sprache der Oberfläche.',
          'Aktualisieren Sie bei Bedarf die Daten und speichern Sie die Änderungen.',
        ],
      },
      pl: {
        title: '2. Profil użytkownika',
        description:
          'Poradnik wyjaśnia zarządzanie profilem użytkownika, danymi klienta, pakietem i podstawowymi ustawieniami.',
        category: 'Profil',
        steps: [
          'Otwórz sekcję Profil.',
          'Sprawdź imię, e-mail i dane klienta.',
          'Przejrzyj informacje o pakiecie i dostępnych usługach.',
          'Sprawdź ustawienia konta i język interfejsu.',
          'W razie potrzeby zaktualizuj dane i zapisz zmiany.',
        ],
      },
      hu: {
        title: '2. Felhasználói profil',
        description:
          'Az útmutató bemutatja a felhasználói profil, az ügyféladatok, a csomag és az alapbeállítások kezelését.',
        category: 'Profil',
        steps: [
          'Nyissa meg a Profil szekciót.',
          'Ellenőrizze a nevet, e-mailt és ügyféladatokat.',
          'Tekintse át a csomagot és az elérhető szolgáltatásokat.',
          'Ellenőrizze a fiókbeállításokat és a felület nyelvét.',
          'Szükség esetén frissítse az adatokat és mentse a változásokat.',
        ],
      },
    }),
  },

  {
    order: 3,
    slug: 'ai-chat',
    duration: '5 min',
    fileBase: '03_ai_chat',
    translations: createTranslations({
      sk: {
        title: '3. AI Chat',
        description:
          'Manuál ukazuje písanie, úpravu a generovanie odborného textu cez AI Chat.',
        category: 'AI nástroje',
        steps: [
          'Otvorte sekciu AI Chat.',
          'Napíšte otázku alebo zadanie.',
          'Vyberte vhodný spôsob práce s textom.',
          'Odošlite požiadavku na spracovanie.',
          'Skontrolujte odpoveď a pokračujte v úpravách.',
        ],
      },
      cs: {
        title: '3. AI Chat',
        description:
          'Manuál ukazuje psaní, úpravu a generování odborného textu přes AI Chat.',
        category: 'AI nástroje',
        steps: [
          'Otevřete sekci AI Chat.',
          'Napište otázku nebo zadání.',
          'Vyberte vhodný způsob práce s textem.',
          'Odešlete požadavek ke zpracování.',
          'Zkontrolujte odpověď a pokračujte v úpravách.',
        ],
      },
      en: {
        title: '3. AI Chat',
        description:
          'This guide shows how to write, edit, and generate academic text using AI Chat.',
        category: 'AI Tools',
        steps: [
          'Open the AI Chat section.',
          'Write a question or instruction.',
          'Choose the appropriate way to work with the text.',
          'Submit the request for processing.',
          'Review the response and continue editing.',
        ],
      },
      de: {
        title: '3. AI Chat',
        description:
          'Diese Anleitung zeigt das Schreiben, Bearbeiten und Generieren wissenschaftlicher Texte mit AI Chat.',
        category: 'KI-Werkzeuge',
        steps: [
          'Öffnen Sie den Bereich AI Chat.',
          'Schreiben Sie eine Frage oder Aufgabe.',
          'Wählen Sie die passende Arbeitsweise mit dem Text.',
          'Senden Sie die Anfrage zur Verarbeitung.',
          'Prüfen Sie die Antwort und bearbeiten Sie weiter.',
        ],
      },
      pl: {
        title: '3. AI Chat',
        description:
          'Poradnik pokazuje pisanie, edycję i generowanie tekstu akademickiego za pomocą AI Chat.',
        category: 'Narzędzia AI',
        steps: [
          'Otwórz sekcję AI Chat.',
          'Wpisz pytanie lub polecenie.',
          'Wybierz odpowiedni sposób pracy z tekstem.',
          'Wyślij żądanie do przetworzenia.',
          'Sprawdź odpowiedź i kontynuuj edycję.',
        ],
      },
      hu: {
        title: '3. AI Chat',
        description:
          'Az útmutató bemutatja az akadémiai szöveg írását, szerkesztését és generálását AI Chat segítségével.',
        category: 'AI eszközök',
        steps: [
          'Nyissa meg az AI Chat szekciót.',
          'Írjon be kérdést vagy utasítást.',
          'Válassza ki a szöveggel való munka megfelelő módját.',
          'Küldje el a kérést feldolgozásra.',
          'Ellenőrizze a választ, és folytassa a szerkesztést.',
        ],
      }
    }),
  },

  {
    order: 4,
    slug: 'moje-prace',
    duration: '4 min',
    fileBase: '04_moje_prace',
    translations: createTranslations({
      sk: {
        title: '4. Moje práce',
        description:
          'Manuál vysvetľuje zoznam prác, otvorenie projektu, pokračovanie v práci a správu uložených prác.',
        category: 'Práce',
        steps: [
          'Otvorte sekciu Moje práce.',
          'Prezrite si zoznam rozpracovaných prác.',
          'Vyberte prácu, s ktorou chcete pokračovať.',
          'Kliknite na otvorenie alebo pokračovanie v práci.',
          'V prípade potreby upravte alebo odstráňte uloženú prácu.',
        ],
      },
      cs: {
        title: '4. Moje práce',
        description:
          'Manuál vysvětluje seznam prací, otevření projektu, pokračování v práci a správu uložených prací.',
        category: 'Práce',
        steps: [
          'Otevřete sekci Moje práce.',
          'Prohlédněte si seznam rozpracovaných prací.',
          'Vyberte práci, se kterou chcete pokračovat.',
          'Klikněte na otevření nebo pokračování v práci.',
          'V případě potřeby upravte nebo odstraňte uloženou práci.',
        ],
      },
      en: {
        title: '4. My Works',
        description:
          'This guide explains the work list, opening a project, continuing work, and managing saved works.',
        category: 'Works',
        steps: [
          'Open the My Works section.',
          'Review the list of works in progress.',
          'Select the work you want to continue.',
          'Click to open or continue the work.',
          'Edit or delete saved work if needed.',
        ],
      },
      de: {
        title: '4. Meine Arbeiten',
        description:
          'Diese Anleitung erklärt die Arbeitsliste, das Öffnen eines Projekts, das Fortsetzen der Arbeit und die Verwaltung gespeicherter Arbeiten.',
        category: 'Arbeiten',
        steps: [
          'Öffnen Sie den Bereich Meine Arbeiten.',
          'Sehen Sie sich die Liste der laufenden Arbeiten an.',
          'Wählen Sie die Arbeit aus, mit der Sie fortfahren möchten.',
          'Klicken Sie auf Öffnen oder Fortsetzen.',
          'Bearbeiten oder löschen Sie gespeicherte Arbeiten bei Bedarf.',
        ],
      },
      pl: {
        title: '4. Moje prace',
        description:
          'Poradnik wyjaśnia listę prac, otwieranie projektu, kontynuowanie pracy i zarządzanie zapisanymi pracami.',
        category: 'Prace',
        steps: [
          'Otwórz sekcję Moje prace.',
          'Przejrzyj listę rozpoczętych prac.',
          'Wybierz pracę, którą chcesz kontynuować.',
          'Kliknij otwarcie lub kontynuację pracy.',
          'W razie potrzeby edytuj lub usuń zapisaną pracę.',
        ],
      },
      hu: {
        title: '4. Munkáim',
        description:
          'Az útmutató bemutatja a munkalistát, a projekt megnyitását, a munka folytatását és a mentett munkák kezelését.',
        category: 'Munkák',
        steps: [
          'Nyissa meg a Munkáim szekciót.',
          'Tekintse át a folyamatban lévő munkák listáját.',
          'Válassza ki a folytatni kívánt munkát.',
          'Kattintson a megnyitásra vagy folytatásra.',
          'Szükség esetén szerkessze vagy törölje a mentett munkát.',
        ],
      }
    }),
  },

  {
    order: 5,
    slug: 'nova-praca',
    duration: '6 min',
    fileBase: '05_nova_praca',
    translations: createTranslations({
      sk: {
        title: '5. Nová práca',
        description:
          'Manuál ukazuje vytvorenie novej práce, vyplnenie profilu práce a uloženie základných údajov.',
        category: 'Práce',
        steps: [
          'Kliknite na tlačidlo Nová práca.',
          'Vyberte typ práce a úroveň štúdia.',
          'Vyplňte názov, tému, odbor a jazyk práce.',
          'Doplňte cieľ práce, problém, metodológiu a výskumné otázky.',
          'Uložte profil práce a pokračujte v dashboarde.',
        ],
      },
      cs: {
        title: '5. Nová práce',
        description:
          'Manuál ukazuje vytvoření nové práce, vyplnění profilu práce a uložení základních údajů.',
        category: 'Práce',
        steps: [
          'Klikněte na tlačítko Nová práce.',
          'Vyberte typ práce a úroveň studia.',
          'Vyplňte název, téma, obor a jazyk práce.',
          'Doplňte cíl práce, problém, metodologii a výzkumné otázky.',
          'Uložte profil práce a pokračujte v dashboardu.',
        ],
      },
      en: {
        title: '5. New Work',
        description:
          'This guide shows how to create a new work, fill in the work profile, and save the basic information.',
        category: 'Works',
        steps: [
          'Click the New Work button.',
          'Select the work type and study level.',
          'Fill in the title, topic, field, and work language.',
          'Add the goal, problem, methodology, and research questions.',
          'Save the work profile and continue in the dashboard.',
        ],
      },
      de: {
        title: '5. Neue Arbeit',
        description:
          'Diese Anleitung zeigt das Erstellen einer neuen Arbeit, das Ausfüllen des Arbeitsprofils und das Speichern der Basisdaten.',
        category: 'Arbeiten',
        steps: [
          'Klicken Sie auf Neue Arbeit.',
          'Wählen Sie Arbeitstyp und Studienniveau.',
          'Füllen Sie Titel, Thema, Fachbereich und Sprache aus.',
          'Ergänzen Sie Ziel, Problem, Methodik und Forschungsfragen.',
          'Speichern Sie das Arbeitsprofil und fahren Sie im Dashboard fort.',
        ],
      },
      pl: {
        title: '5. Nowa praca',
        description:
          'Poradnik pokazuje tworzenie nowej pracy, wypełnienie profilu pracy i zapisanie podstawowych danych.',
        category: 'Prace',
        steps: [
          'Kliknij przycisk Nowa praca.',
          'Wybierz typ pracy i poziom studiów.',
          'Wypełnij tytuł, temat, dziedzinę i język pracy.',
          'Dodaj cel, problem, metodologię i pytania badawcze.',
          'Zapisz profil pracy i kontynuuj w dashboardzie.',
        ],
      },
      hu: {
        title: '5. Új munka',
        description:
          'Az útmutató bemutatja új munka létrehozását, a munkaprofil kitöltését és az alapadatok mentését.',
        category: 'Munkák',
        steps: [
          'Kattintson az Új munka gombra.',
          'Válassza ki a munka típusát és a tanulmányi szintet.',
          'Töltse ki a címet, témát, szakterületet és a munka nyelvét.',
          'Adja meg a célt, problémát, módszertant és kutatási kérdéseket.',
          'Mentse a munkaprofilt, és folytassa az irányítópulton.',
        ],
      }
    }),
  },

  {
    order: 6,
    slug: 'ai-skolitel',
    duration: '5 min',
    fileBase: '06_ai_veduci',
    translations: createTranslations({
      sk: {
        title: '6. AI školiteľ',
        description:
          'Ako používať AI školiteľa na odbornú kontrolu práce.',
        category: 'AI nástroje',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '6. AI školitel',
        description:
          'Jak používat AI školitele pro odbornou kontrolu práce.',
        category: 'AI nástroje',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '6. AI Supervisor',
        description:
          'How to use the AI Supervisor for expert review of your work.',
        category: 'AI Tools',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '6. KI-Betreuer',
        description:
          'So verwenden Sie den KI-Betreuer zur fachlichen Prüfung Ihrer Arbeit.',
        category: 'KI-Werkzeuge',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '6. Opiekun AI',
        description:
          'Jak używać opiekuna AI do eksperckiej kontroli pracy.',
        category: 'Narzędzia AI',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '6. AI témavezető',
        description:
          'Az AI témavezető használata a munka szakmai ellenőrzéséhez.',
        category: 'AI eszközök',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 7,
    slug: 'audit-kvality',
    duration: '5 min',
    fileBase: '07_audit_kvality',
    translations: createTranslations({
      sk: {
        title: '7. Audit kvality',
        description:
          'Kontrola kvality textu, logiky, štylistiky a odporúčania na zlepšenie.',
        category: 'AI nástroje',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '7. Audit kvality',
        description:
          'Kontrola kvality textu, logiky, stylistiky a doporučení ke zlepšení.',
        category: 'AI nástroje',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '7. Quality Audit',
        description:
          'Review of text quality, logic, style, and improvement recommendations.',
        category: 'AI Tools',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '7. Qualitätsaudit',
        description:
          'Prüfung von Textqualität, Logik, Stil und Verbesserungsempfehlungen.',
        category: 'KI-Werkzeuge',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '7. Audyt jakości',
        description:
          'Kontrola jakości tekstu, logiki, stylu i rekomendacje ulepszeń.',
        category: 'Narzędzia AI',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '7. Minőségi audit',
        description:
          'Szövegminőség, logika, stílus és fejlesztési javaslatok ellenőrzése.',
        category: 'AI eszközök',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 8,
    slug: 'obhajoba',
    duration: '6 min',
    fileBase: '08_obhajoba',
    translations: createTranslations({
      sk: {
        title: '8. Obhajoba',
        description:
          'Príprava otázok, odpovedí, osnovy a podkladov k obhajobe.',
        category: 'AI nástroje',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '8. Obhajoba',
        description:
          'Příprava otázek, odpovědí, osnovy a podkladů k obhajobě.',
        category: 'AI nástroje',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '8. Defense',
        description:
          'Preparing questions, answers, outline, and defense materials.',
        category: 'AI Tools',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '8. Verteidigung',
        description:
          'Vorbereitung von Fragen, Antworten, Gliederung und Unterlagen zur Verteidigung.',
        category: 'KI-Werkzeuge',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '8. Obrona',
        description:
          'Przygotowanie pytań, odpowiedzi, planu i materiałów do obrony.',
        category: 'Narzędzia AI',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '8. Védés',
        description:
          'Kérdések, válaszok, vázlat és védési anyagok előkészítése.',
        category: 'AI eszközök',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 9,
    slug: 'preklad',
    duration: '4 min',
    fileBase: '09_preklad',
    translations: createTranslations({
      sk: {
        title: '9. Preklad',
        description:
          'Preklad odborného textu do vybraného jazyka.',
        category: 'AI nástroje',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '9. Překlad',
        description:
          'Překlad odborného textu do vybraného jazyka.',
        category: 'AI nástroje',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '9. Translation',
        description:
          'Translation of academic text into the selected language.',
        category: 'AI Tools',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '9. Übersetzung',
        description:
          'Übersetzung von Fachtexten in die gewählte Sprache.',
        category: 'KI-Werkzeuge',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '9. Tłumaczenie',
        description:
          'Tłumaczenie tekstu specjalistycznego na wybrany język.',
        category: 'Narzędzia AI',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '9. Fordítás',
        description:
          'Szakmai szöveg fordítása a kiválasztott nyelvre.',
        category: 'AI eszközök',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 10,
    slug: 'analyza-dat',
    duration: '6 min',
    fileBase: '10_analyza_dat',
    translations: createTranslations({
      sk: {
        title: '10. Analýza dát',
        description:
          'Nahratie dát, spracovanie analýzy, grafov a interpretácie.',
        category: 'AI nástroje',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '10. Analýza dat',
        description:
          'Nahrání dat, zpracování analýzy, grafů a interpretace.',
        category: 'AI nástroje',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '10. Data Analysis',
        description:
          'Uploading data, processing analysis, charts, and interpretation.',
        category: 'AI Tools',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '10. Datenanalyse',
        description:
          'Hochladen von Daten, Analyse, Diagrammen und Interpretation.',
        category: 'KI-Werkzeuge',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '10. Analiza danych',
        description:
          'Przesyłanie danych, analiza, wykresy i interpretacja.',
        category: 'Narzędzia AI',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '10. Adatelemzés',
        description:
          'Adatok feltöltése, elemzés, grafikonok és értelmezés.',
        category: 'AI eszközök',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 11,
    slug: 'planovanie',
    duration: '4 min',
    fileBase: '11_planovanie',
    translations: createTranslations({
      sk: {
        title: '11. Plánovanie',
        description:
          'Vytvorenie harmonogramu práce podľa termínu odovzdania.',
        category: 'AI nástroje',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '11. Plánování',
        description:
          'Vytvoření harmonogramu práce podle termínu odevzdání.',
        category: 'AI nástroje',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '11. Planning',
        description:
          'Creating a work schedule based on the submission deadline.',
        category: 'AI Tools',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '11. Planung',
        description:
          'Erstellung eines Arbeitsplans anhand des Abgabetermins.',
        category: 'KI-Werkzeuge',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '11. Planowanie',
        description:
          'Tworzenie harmonogramu pracy według terminu oddania.',
        category: 'Narzędzia AI',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '11. Tervezés',
        description:
          'Munkaterv készítése a leadási határidő alapján.',
        category: 'AI eszközök',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 12,
    slug: 'emaily',
    duration: '4 min',
    fileBase: '12_emaily',
    translations: createTranslations({
      sk: {
        title: '12. Emaily',
        description:
          'Generovanie akademických emailov pre školiteľa, školu alebo konzultanta.',
        category: 'Komunikácia',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '12. Emaily',
        description:
          'Generování akademických emailů pro školitele, školu nebo konzultanta.',
        category: 'Komunikace',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '12. Emails',
        description:
          'Generating academic emails for a supervisor, school, or consultant.',
        category: 'Communication',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '12. E-Mails',
        description:
          'Erstellung akademischer E-Mails an Betreuer, Schule oder Berater.',
        category: 'Kommunikation',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '12. E-maile',
        description:
          'Generowanie akademickich e-maili do promotora, szkoły lub konsultanta.',
        category: 'Komunikacja',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '12. E-mailek',
        description:
          'Akadémiai e-mailek készítése témavezetőnek, iskolának vagy konzulensnek.',
        category: 'Kommunikáció',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 13,
    slug: 'originalita-prace',
    duration: '5 min',
    fileBase: '13_originalita_prace',
    hidden: true,
    translations: createTranslations({
      sk: {
        title: '13. Kontrola originality',
        description:
          'Orientačná kontrola originality práce.',
        category: 'AI nástroje',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '13. Kontrola originality',
        description:
          'Orientační kontrola originality práce.',
        category: 'AI nástroje',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '13. Originality Check',
        description:
          'Indicative originality check of the work.',
        category: 'AI Tools',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '13. Originalitätsprüfung',
        description:
          'Orientierende Originalitätsprüfung der Arbeit.',
        category: 'KI-Werkzeuge',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '13. Kontrola oryginalności',
        description:
          'Orientacyjna kontrola oryginalności pracy.',
        category: 'Narzędzia AI',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '13. Eredetiség ellenőrzése',
        description:
          'A munka tájékoztató eredetiség-ellenőrzése.',
        category: 'AI eszközök',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 14,
    slug: 'humanizacia-textu',
    duration: '4 min',
    fileBase: '14_humanizacia_textu',
    translations: createTranslations({
      sk: {
        title: '14. Humanizácia textu',
        description:
          'Úprava textu do prirodzenejšej a plynulejšej akademickej podoby.',
        category: 'AI nástroje',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '14. Humanizace textu',
        description:
          'Úprava textu do přirozenější a plynulejší akademické podoby.',
        category: 'AI nástroje',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '14. Text Humanization',
        description:
          'Rewriting text into a more natural and fluent academic form.',
        category: 'AI Tools',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '14. Text-Humanisierung',
        description:
          'Überarbeitung des Textes in eine natürlichere und flüssigere akademische Form.',
        category: 'KI-Werkzeuge',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '14. Humanizacja tekstu',
        description:
          'Przekształcenie tekstu w bardziej naturalną i płynną formę akademicką.',
        category: 'Narzędzia AI',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '14. Szöveg humanizálása',
        description:
          'A szöveg természetesebb és gördülékenyebb akadémiai formába írása.',
        category: 'AI eszközök',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 15,
    slug: 'zdroje-citacie',
    duration: '5 min',
    fileBase: '15_zdroje_citacie',
    translations: createTranslations({
      sk: {
        title: '15. Zdroje a citácie',
        description:
          'Práca so zdrojmi, citáciami a literatúrou.',
        category: 'Zdroje',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '15. Zdroje a citace',
        description:
          'Práce se zdroji, citacemi a literaturou.',
        category: 'Zdroje',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '15. Sources and Citations',
        description:
          'Working with sources, citations, and literature.',
        category: 'Sources',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '15. Quellen und Zitate',
        description:
          'Arbeiten mit Quellen, Zitaten und Literatur.',
        category: 'Quellen',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '15. Źródła i cytowania',
        description:
          'Praca ze źródłami, cytowaniami i literaturą.',
        category: 'Źródła',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '15. Források és hivatkozások',
        description:
          'Forrásokkal, hivatkozásokkal és szakirodalommal való munka.',
        category: 'Források',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 16,
    slug: 'balicky',
    duration: '4 min',
    fileBase: '16_balicky',
    translations: createTranslations({
      sk: {
        title: '16. Balíčky',
        description:
          'Prehľad balíčkov, predplatného a doplnkov.',
        category: 'Účet',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '16. Balíčky',
        description:
          'Přehled balíčků, předplatného a doplňků.',
        category: 'Účet',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '16. Packages',
        description:
          'Overview of packages, subscriptions, and add-ons.',
        category: 'Account',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '16. Pakete',
        description:
          'Übersicht über Pakete, Abonnements und Zusatzleistungen.',
        category: 'Konto',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '16. Pakiety',
        description:
          'Przegląd pakietów, subskrypcji i dodatków.',
        category: 'Konto',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '16. Csomagok',
        description:
          'Csomagok, előfizetések és kiegészítők áttekintése.',
        category: 'Fiók',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 17,
    slug: 'historia-chatu',
    duration: '4 min',
    fileBase: '17_historia_chatu',
    translations: createTranslations({
      sk: {
        title: '17. História chatu',
        description:
          'Zobrazenie uložených konverzácií a výstupov.',
        category: 'História',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '17. Historie chatu',
        description:
          'Zobrazení uložených konverzací a výstupů.',
        category: 'Historie',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '17. Chat History',
        description:
          'Viewing saved conversations and outputs.',
        category: 'History',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '17. Chatverlauf',
        description:
          'Anzeige gespeicherter Konversationen und Ausgaben.',
        category: 'Verlauf',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '17. Historia czatu',
        description:
          'Wyświetlanie zapisanych rozmów i wyników.',
        category: 'Historia',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '17. Chat előzmények',
        description:
          'Mentett beszélgetések és kimenetek megtekintése.',
        category: 'Előzmények',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 18,
    slug: 'video-navod',
    duration: '3 min',
    fileBase: '18_video_navod',
    translations: createTranslations({
      sk: {
        title: '18. Video návod',
        description:
          'Ako používať sekciu video návodov.',
        category: 'Pomoc',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '18. Video návod',
        description:
          'Jak používat sekci video návodů.',
        category: 'Pomoc',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '18. Video Guide',
        description:
          'How to use the video guide section.',
        category: 'Help',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '18. Videoanleitung',
        description:
          'So verwenden Sie den Bereich Videoanleitungen.',
        category: 'Hilfe',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '18. Instrukcja wideo',
        description:
          'Jak korzystać z sekcji instrukcji wideo.',
        category: 'Pomoc',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '18. Videó útmutató',
        description:
          'A videó útmutatók szekció használata.',
        category: 'Súgó',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 19,
    slug: 'vzhlad-aplikacie',
    duration: '3 min',
    fileBase: '19_vzhlad_aplikacie',
    translations: createTranslations({
      sk: {
        title: '19. Vzhľad aplikácie',
        description:
          'Prepínanie vzhľadu a orientácia v používateľskom rozhraní.',
        category: 'Nastavenia',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '19. Vzhled aplikace',
        description:
          'Přepínání vzhledu a orientace v uživatelském rozhraní.',
        category: 'Nastavení',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '19. Application Appearance',
        description:
          'Switching appearance and navigating the user interface.',
        category: 'Settings',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '19. Erscheinungsbild der Anwendung',
        description:
          'Wechsel des Erscheinungsbildes und Navigation in der Benutzeroberfläche.',
        category: 'Einstellungen',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '19. Wygląd aplikacji',
        description:
          'Przełączanie wyglądu i orientacja w interfejsie użytkownika.',
        category: 'Ustawienia',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '19. Alkalmazás megjelenése',
        description:
          'Megjelenés váltása és navigáció a felhasználói felületen.',
        category: 'Beállítások',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },

  {
    order: 20,
    slug: 'odhlasenie',
    duration: '2 min',
    fileBase: '20_odhlasenie',
    translations: createTranslations({
      sk: {
        title: '20. Odhlásenie',
        description:
          'Bezpečné odhlásenie používateľa zo systému.',
        category: 'Účet',
        steps: [
          'Otvorte príslušnú sekciu v aplikácii Zedpera.',
          'Skontrolujte, či je zvolený správny profil práce.',
          'Vyplňte potrebné údaje alebo vložte text do formulára.',
          'Spustite spracovanie alebo požadovanú akciu.',
          'Skontrolujte výsledok a podľa potreby pokračujte ďalším krokom.',
        ],
      },
      cs: {
        title: '20. Odhlášení',
        description:
          'Bezpečné odhlášení uživatele ze systému.',
        category: 'Účet',
        steps: [
          'Otevřete příslušnou sekci v aplikaci Zedpera.',
          'Zkontrolujte, zda je zvolený správný profil práce.',
          'Vyplňte potřebné údaje nebo vložte text do formuláře.',
          'Spusťte zpracování nebo požadovanou akci.',
          'Zkontrolujte výsledek a podle potřeby pokračujte dalším krokem.',
        ],
      },
      en: {
        title: '20. Log Out',
        description:
          'Safe user logout from the system.',
        category: 'Account',
        steps: [
          'Open the relevant section in Zedpera.',
          'Check that the correct work profile is selected.',
          'Fill in the required data or insert text into the form.',
          'Start the processing or requested action.',
          'Review the result and continue with the next step if needed.',
        ],
      },
      de: {
        title: '20. Abmelden',
        description:
          'Sichere Abmeldung des Benutzers vom System.',
        category: 'Konto',
        steps: [
          'Öffnen Sie den entsprechenden Bereich in Zedpera.',
          'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
          'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
          'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
          'Prüfen Sie das Ergebnis und fahren Sie bei Bedarf mit dem nächsten Schritt fort.',
        ],
      },
      pl: {
        title: '20. Wylogowanie',
        description:
          'Bezpieczne wylogowanie użytkownika z systemu.',
        category: 'Konto',
        steps: [
          'Otwórz odpowiednią sekcję w Zedpera.',
          'Sprawdź, czy wybrano właściwy profil pracy.',
          'Wypełnij wymagane dane lub wklej tekst do formularza.',
          'Uruchom przetwarzanie lub żądaną akcję.',
          'Sprawdź wynik i w razie potrzeby przejdź do kolejnego kroku.',
        ],
      },
      hu: {
        title: '20. Kijelentkezés',
        description:
          'Biztonságos kijelentkezés a rendszerből.',
        category: 'Fiók',
        steps: [
          'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
          'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
          'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
          'Indítsa el a feldolgozást vagy a kért műveletet.',
          'Ellenőrizze az eredményt, és szükség esetén folytassa a következő lépéssel.',
        ],
      }
    }),
  },
];
