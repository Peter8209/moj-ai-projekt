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

  return `/videos/zedpera_fixed/${folder}/${manual.fileBase}.mp4`;
}

export function getVideoManualThumbnail(
  manual: VideoManual,
  language: AppLanguage,
): string {
  const folder = videoLanguageFolders[language] || videoLanguageFolders[fallbackLanguage];

  return `/videos/zedpera_fixed/${folder}/${manual.fileBase}.png`;
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

const defaultSteps = {
  sk: [
    'Otvorte príslušnú sekciu v aplikácii Zedpera.',
    'Skontrolujte, či máte vybraný správny profil práce.',
    'Vyplňte potrebné údaje alebo vložte text do formulára.',
    'Spustite spracovanie alebo požadovanú akciu.',
    'Skontrolujte výsledok a pokračujte ďalším krokom.',
  ],
  cs: [
    'Otevřete příslušnou sekci v aplikaci Zedpera.',
    'Zkontrolujte, zda máte vybraný správný profil práce.',
    'Vyplňte potřebné údaje nebo vložte text do formuláře.',
    'Spusťte zpracování nebo požadovanou akci.',
    'Zkontrolujte výsledek a pokračujte dalším krokem.',
  ],
  en: [
    'Open the relevant section in Zedpera.',
    'Check that the correct work profile is selected.',
    'Fill in the required data or insert text into the form.',
    'Start the processing or requested action.',
    'Review the result and continue with the next step.',
  ],
  de: [
    'Öffnen Sie den entsprechenden Bereich in Zedpera.',
    'Prüfen Sie, ob das richtige Arbeitsprofil ausgewählt ist.',
    'Füllen Sie die erforderlichen Daten aus oder fügen Sie Text in das Formular ein.',
    'Starten Sie die Verarbeitung oder die gewünschte Aktion.',
    'Prüfen Sie das Ergebnis und fahren Sie mit dem nächsten Schritt fort.',
  ],
  pl: [
    'Otwórz odpowiednią sekcję w Zedpera.',
    'Sprawdź, czy wybrano właściwy profil pracy.',
    'Wypełnij wymagane dane lub wklej tekst do formularza.',
    'Uruchom przetwarzanie lub żądaną akcję.',
    'Sprawdź wynik i przejdź do kolejnego kroku.',
  ],
  hu: [
    'Nyissa meg a megfelelő szekciót a Zedpera alkalmazásban.',
    'Ellenőrizze, hogy a megfelelő munkaprofil van-e kiválasztva.',
    'Töltse ki a szükséges adatokat vagy illesszen be szöveget az űrlapba.',
    'Indítsa el a feldolgozást vagy a kért műveletet.',
    'Ellenőrizze az eredményt, és folytassa a következő lépéssel.',
  ],
};

function manual(
  order: number,
  slug: string,
  duration: string,
  fileBase: string,
  titles: {
    sk: [string, string, string];
    cs: [string, string, string];
    en: [string, string, string];
    de: [string, string, string];
    pl: [string, string, string];
    hu: [string, string, string];
  },
  hidden = false,
): VideoManual {
  return {
    order,
    slug,
    duration,
    fileBase,
    hidden,
    translations: createTranslations({
      sk: {
        title: titles.sk[0],
        description: titles.sk[1],
        category: titles.sk[2],
        steps: defaultSteps.sk,
      },
      cs: {
        title: titles.cs[0],
        description: titles.cs[1],
        category: titles.cs[2],
        steps: defaultSteps.cs,
      },
      en: {
        title: titles.en[0],
        description: titles.en[1],
        category: titles.en[2],
        steps: defaultSteps.en,
      },
      de: {
        title: titles.de[0],
        description: titles.de[1],
        category: titles.de[2],
        steps: defaultSteps.de,
      },
      pl: {
        title: titles.pl[0],
        description: titles.pl[1],
        category: titles.pl[2],
        steps: defaultSteps.pl,
      },
      hu: {
        title: titles.hu[0],
        description: titles.hu[1],
        category: titles.hu[2],
        steps: defaultSteps.hu,
      },
    }),
  };
}

export const videoManuals: VideoManual[] = [
  manual(1, 'hlavne-menu-zedpera', '45 sekúnd', '01_hlavne_menu', {
    sk: ['1. Hlavné menu Zedpera', 'Orientácia v aplikácii, dashboarde, menu a základných sekciách systému.', 'Základy'],
    cs: ['1. Hlavní menu Zedpera', 'Orientace v aplikaci, dashboardu, menu a základních sekcích systému.', 'Základy'],
    en: ['1. Zedpera Main Menu', 'Navigation through the application, dashboard, menu, and main system sections.', 'Basics'],
    de: ['1. Zedpera Hauptmenü', 'Navigation in der Anwendung, im Dashboard, Menü und den Hauptbereichen.', 'Grundlagen'],
    pl: ['1. Menu główne Zedpera', 'Nawigacja w aplikacji, dashboardzie, menu i głównych sekcjach systemu.', 'Podstawy'],
    hu: ['1. Zedpera főmenü', 'Navigáció az alkalmazásban, irányítópulton, menüben és fő részekben.', 'Alapok'],
  }),
  manual(2, 'profil-pouzivatela', '60 sekúnd', '02_profil', {
    sk: ['2. Profil používateľa', 'Správa účtu, balíka, údajov klienta a základných nastavení.', 'Profil'],
    cs: ['2. Profil uživatele', 'Správa účtu, balíčku, údajů klienta a základních nastavení.', 'Profil'],
    en: ['2. User Profile', 'Account, plan, client information, and basic settings management.', 'Profile'],
    de: ['2. Benutzerprofil', 'Verwaltung von Konto, Paket, Kundendaten und Grundeinstellungen.', 'Profil'],
    pl: ['2. Profil użytkownika', 'Zarządzanie kontem, pakietem, danymi klienta i ustawieniami.', 'Profil'],
    hu: ['2. Felhasználói profil', 'Fiók, csomag, ügyféladatok és alapbeállítások kezelése.', 'Profil'],
  }),
  manual(3, 'ai-chat', '75 sekúnd', '03_ai_chat', {
    sk: ['3. AI Chat', 'Písanie, úprava a generovanie odborného textu pomocou AI chatu.', 'AI nástroje'],
    cs: ['3. AI Chat', 'Psaní, úprava a generování odborného textu pomocí AI chatu.', 'AI nástroje'],
    en: ['3. AI Chat', 'Writing, editing, and generating academic text using AI chat.', 'AI Tools'],
    de: ['3. AI Chat', 'Schreiben, Bearbeiten und Generieren wissenschaftlicher Texte mit AI Chat.', 'KI-Werkzeuge'],
    pl: ['3. AI Chat', 'Pisanie, edycja i generowanie tekstu akademickiego za pomocą AI Chat.', 'Narzędzia AI'],
    hu: ['3. AI Chat', 'Akadémiai szöveg írása, szerkesztése és generálása AI Chat segítségével.', 'AI eszközök'],
  }),
  manual(4, 'moje-prace', '60 sekúnd', '04_moje_prace', {
    sk: ['4. Moje práce', 'Správa uložených prác, výber aktívnej práce a pokračovanie v projekte.', 'Práce'],
    cs: ['4. Moje práce', 'Správa uložených prací, výběr aktivní práce a pokračování v projektu.', 'Práce'],
    en: ['4. My Works', 'Managing saved works, selecting the active work, and continuing a project.', 'Works'],
    de: ['4. Meine Arbeiten', 'Gespeicherte Arbeiten verwalten, aktive Arbeit auswählen und Projekt fortsetzen.', 'Arbeiten'],
    pl: ['4. Moje prace', 'Zarządzanie zapisanymi pracami, wybór aktywnej pracy i kontynuacja projektu.', 'Prace'],
    hu: ['4. Munkáim', 'Mentett munkák kezelése, aktív munka kiválasztása és projekt folytatása.', 'Munkák'],
  }),
  manual(5, 'nova-praca', '90 sekúnd', '05_nova_praca', {
    sk: ['5. Nová práca', 'Vytvorenie novej akademickej práce a vyplnenie profilu práce.', 'Práce'],
    cs: ['5. Nová práce', 'Vytvoření nové akademické práce a vyplnění profilu práce.', 'Práce'],
    en: ['5. New Work', 'Creating a new academic work and filling in the work profile.', 'Works'],
    de: ['5. Neue Arbeit', 'Erstellen einer neuen wissenschaftlichen Arbeit und Ausfüllen des Profils.', 'Arbeiten'],
    pl: ['5. Nowa praca', 'Tworzenie nowej pracy akademickiej i wypełnianie profilu pracy.', 'Prace'],
    hu: ['5. Új munka', 'Új akadémiai munka létrehozása és munkaprofil kitöltése.', 'Munkák'],
  }),
  manual(6, 'ai-skolitel', '75 sekúnd', '06_ai_veduci', {
    sk: ['6. AI školiteľ', 'Odborná spätná väzba k logike, štruktúre a kvalite práce.', 'AI nástroje'],
    cs: ['6. AI školitel', 'Odborná zpětná vazba k logice, struktuře a kvalitě práce.', 'AI nástroje'],
    en: ['6. AI Supervisor', 'Expert feedback on logic, structure, and work quality.', 'AI Tools'],
    de: ['6. KI-Betreuer', 'Fachliches Feedback zu Logik, Struktur und Qualität der Arbeit.', 'KI-Werkzeuge'],
    pl: ['6. Opiekun AI', 'Ekspercka informacja zwrotna o logice, strukturze i jakości pracy.', 'Narzędzia AI'],
    hu: ['6. AI témavezető', 'Szakmai visszajelzés a logikáról, szerkezetről és minőségről.', 'AI eszközök'],
  }),
  manual(7, 'audit-kvality', '75 sekúnd', '07_audit_kvality', {
    sk: ['7. Audit kvality', 'Kontrola akademického textu, citácií, logiky a metodológie.', 'Kontrola'],
    cs: ['7. Audit kvality', 'Kontrola akademického textu, citací, logiky a metodologie.', 'Kontrola'],
    en: ['7. Quality Audit', 'Review of academic text, citations, logic, and methodology.', 'Review'],
    de: ['7. Qualitätsaudit', 'Prüfung von wissenschaftlichem Text, Zitaten, Logik und Methodik.', 'Prüfung'],
    pl: ['7. Audyt jakości', 'Kontrola tekstu akademickiego, cytowań, logiki i metodologii.', 'Kontrola'],
    hu: ['7. Minőségi audit', 'Akadémiai szöveg, hivatkozások, logika és módszertan ellenőrzése.', 'Ellenőrzés'],
  }),
  manual(8, 'obhajoba', '90 sekúnd', '08_obhajoba', {
    sk: ['8. Obhajoba', 'Príprava prezentácie, otázok komisie a odporúčaných odpovedí.', 'Obhajoba'],
    cs: ['8. Obhajoba', 'Příprava prezentace, otázek komise a doporučených odpovědí.', 'Obhajoba'],
    en: ['8. Defense', 'Preparing presentation, committee questions, and recommended answers.', 'Defense'],
    de: ['8. Verteidigung', 'Vorbereitung von Präsentation, Kommissionsfragen und Antworten.', 'Verteidigung'],
    pl: ['8. Obrona', 'Przygotowanie prezentacji, pytań komisji i zalecanych odpowiedzi.', 'Obrona'],
    hu: ['8. Védés', 'Prezentáció, bizottsági kérdések és ajánlott válaszok előkészítése.', 'Védés'],
  }),
  manual(9, 'preklad', '60 sekúnd', '09_preklad', {
    sk: ['9. Preklad', 'Preklad odborného textu podľa zdrojového a cieľového jazyka.', 'AI nástroje'],
    cs: ['9. Překlad', 'Překlad odborného textu podle zdrojového a cílového jazyka.', 'AI nástroje'],
    en: ['9. Translation', 'Academic text translation based on source and target language.', 'AI Tools'],
    de: ['9. Übersetzung', 'Übersetzung wissenschaftlicher Texte nach Ausgangs- und Zielsprache.', 'KI-Werkzeuge'],
    pl: ['9. Tłumaczenie', 'Tłumaczenie tekstu akademickiego według języka źródłowego i docelowego.', 'Narzędzia AI'],
    hu: ['9. Fordítás', 'Akadémiai szöveg fordítása forrás- és célnyelv szerint.', 'AI eszközök'],
  }),
  manual(10, 'analyza-dat', '75 sekúnd', '10_analyza_dat', {
    sk: ['10. Analýza dát', 'Spracovanie tabuliek, dotazníkov, grafov a štatistických výsledkov.', 'Výskum'],
    cs: ['10. Analýza dat', 'Zpracování tabulek, dotazníků, grafů a statistických výsledků.', 'Výzkum'],
    en: ['10. Data Analysis', 'Processing tables, questionnaires, charts, and statistical results.', 'Research'],
    de: ['10. Datenanalyse', 'Verarbeitung von Tabellen, Fragebögen, Diagrammen und Ergebnissen.', 'Forschung'],
    pl: ['10. Analiza danych', 'Przetwarzanie tabel, ankiet, wykresów i wyników statystycznych.', 'Badania'],
    hu: ['10. Adatelemzés', 'Táblázatok, kérdőívek, grafikonok és statisztikai eredmények feldolgozása.', 'Kutatás'],
  }),
  manual(11, 'planovanie', '60 sekúnd', '11_planovanie', {
    sk: ['11. Plánovanie', 'Vytvorenie harmonogramu písania práce podľa termínu odovzdania.', 'Organizácia'],
    cs: ['11. Plánování', 'Vytvoření harmonogramu psaní práce podle termínu odevzdání.', 'Organizace'],
    en: ['11. Planning', 'Creating a writing schedule based on the submission deadline.', 'Organization'],
    de: ['11. Planung', 'Erstellung eines Schreibplans anhand des Abgabetermins.', 'Organisation'],
    pl: ['11. Planowanie', 'Tworzenie harmonogramu pisania według terminu oddania.', 'Organizacja'],
    hu: ['11. Tervezés', 'Írási ütemterv készítése a leadási határidő alapján.', 'Szervezés'],
  }),
  manual(12, 'emaily', '60 sekúnd', '12_emaily', {
    sk: ['12. Emaily', 'Generovanie profesionálnych emailov pre školu, školiteľa alebo administratívu.', 'Komunikácia'],
    cs: ['12. Emaily', 'Generování profesionálních e-mailů pro školu, školitele nebo administrativu.', 'Komunikace'],
    en: ['12. Emails', 'Generating professional emails for school, supervisor, or administration.', 'Communication'],
    de: ['12. E-Mails', 'Erstellung professioneller E-Mails an Schule, Betreuer oder Verwaltung.', 'Kommunikation'],
    pl: ['12. E-maile', 'Generowanie profesjonalnych e-maili do szkoły, promotora lub administracji.', 'Komunikacja'],
    hu: ['12. E-mailek', 'Professzionális e-mailek készítése iskolának, témavezetőnek vagy adminisztrációnak.', 'Kommunikáció'],
  }),
  manual(13, 'originalita-prace', '60 sekúnd', '13_originalita_prace', {
    sk: ['13. Originalita práce', 'Orientačná kontrola rizikových alebo nedostatočne odcitovaných pasáží.', 'Kontrola'],
    cs: ['13. Originalita práce', 'Orientační kontrola rizikových nebo nedostatečně citovaných pasáží.', 'Kontrola'],
    en: ['13. Originality Check', 'Indicative check of risky or insufficiently cited passages.', 'Review'],
    de: ['13. Originalitätsprüfung', 'Orientierende Prüfung riskanter oder unzureichend zitierter Passagen.', 'Prüfung'],
    pl: ['13. Kontrola oryginalności', 'Orientacyjna kontrola ryzykownych lub niedostatecznie cytowanych fragmentów.', 'Kontrola'],
    hu: ['13. Eredetiség ellenőrzése', 'Kockázatos vagy nem megfelelően idézett részek tájékoztató ellenőrzése.', 'Ellenőrzés'],
  }, true),
  manual(14, 'humanizacia-textu', '60 sekúnd', '14_humanizacia_textu', {
    sk: ['14. Humanizácia textu', 'Úprava textu do prirodzenejšieho akademického štýlu.', 'AI nástroje'],
    cs: ['14. Humanizace textu', 'Úprava textu do přirozenějšího akademického stylu.', 'AI nástroje'],
    en: ['14. Text Humanization', 'Rewriting text into a more natural academic style.', 'AI Tools'],
    de: ['14. Text-Humanisierung', 'Überarbeitung des Textes in einen natürlicheren akademischen Stil.', 'KI-Werkzeuge'],
    pl: ['14. Humanizacja tekstu', 'Przekształcenie tekstu w bardziej naturalny styl akademicki.', 'Narzędzia AI'],
    hu: ['14. Szöveg humanizálása', 'Szöveg átírása természetesebb akadémiai stílusba.', 'AI eszközök'],
  }),
  manual(15, 'zdroje-citacie', '75 sekúnd', '15_zdroje_citacie', {
    sk: ['15. Zdroje a citácie', 'Práca s literatúrou, odbornými článkami a bibliografickými údajmi.', 'Zdroje'],
    cs: ['15. Zdroje a citace', 'Práce s literaturou, odbornými články a bibliografickými údaji.', 'Zdroje'],
    en: ['15. Sources and Citations', 'Working with literature, academic articles, and bibliographic data.', 'Sources'],
    de: ['15. Quellen und Zitate', 'Arbeiten mit Literatur, Fachartikeln und bibliografischen Daten.', 'Quellen'],
    pl: ['15. Źródła i cytowania', 'Praca z literaturą, artykułami naukowymi i danymi bibliograficznymi.', 'Źródła'],
    hu: ['15. Források és hivatkozások', 'Szakirodalommal, tudományos cikkekkel és bibliográfiai adatokkal való munka.', 'Források'],
  }),
  manual(16, 'balicky', '75 sekúnd', '16_balicky', {
    sk: ['16. Balíčky', 'Prehľad predplatného, limitov a dostupných funkcií.', 'Platby'],
    cs: ['16. Balíčky', 'Přehled předplatného, limitů a dostupných funkcí.', 'Platby'],
    en: ['16. Packages', 'Overview of subscriptions, limits, and available features.', 'Payments'],
    de: ['16. Pakete', 'Übersicht über Abonnements, Limits und verfügbare Funktionen.', 'Zahlungen'],
    pl: ['16. Pakiety', 'Przegląd subskrypcji, limitów i dostępnych funkcji.', 'Płatności'],
    hu: ['16. Csomagok', 'Előfizetések, korlátok és elérhető funkciók áttekintése.', 'Fizetések'],
  }),
  manual(17, 'historia-chatu', '60 sekúnd', '17_historia_chatu', {
    sk: ['17. História chatu', 'Uložené konverzácie, výstupy, osnovy, kapitoly a audity.', 'História'],
    cs: ['17. Historie chatu', 'Uložené konverzace, výstupy, osnovy, kapitoly a audity.', 'Historie'],
    en: ['17. Chat History', 'Saved conversations, outputs, outlines, chapters, and audits.', 'History'],
    de: ['17. Chatverlauf', 'Gespeicherte Konversationen, Ausgaben, Gliederungen, Kapitel und Audits.', 'Verlauf'],
    pl: ['17. Historia czatu', 'Zapisane rozmowy, wyniki, konspekty, rozdziały i audyty.', 'Historia'],
    hu: ['17. Chat előzmények', 'Mentett beszélgetések, kimenetek, vázlatok, fejezetek és auditok.', 'Előzmények'],
  }),
  manual(18, 'video-navod', '30 sekúnd', '18_video_navod', {
    sk: ['18. Video návod', 'Prehľad všetkých video manuálov na jednom mieste.', 'Pomoc'],
    cs: ['18. Video návod', 'Přehled všech video návodů na jednom místě.', 'Pomoc'],
    en: ['18. Video Guide', 'Overview of all video guides in one place.', 'Help'],
    de: ['18. Videoanleitung', 'Übersicht aller Videoanleitungen an einem Ort.', 'Hilfe'],
    pl: ['18. Instrukcja wideo', 'Przegląd wszystkich instrukcji wideo w jednym miejscu.', 'Pomoc'],
    hu: ['18. Videó útmutató', 'Minden videó útmutató áttekintése egy helyen.', 'Súgó'],
  }),
  manual(19, 'vzhlad-aplikacie', '30 sekúnd', '19_vzhlad_aplikacie', {
    sk: ['19. Svetlý a tmavý režim', 'Prepínanie vzhľadu aplikácie podľa potreby používateľa.', 'Nastavenia'],
    cs: ['19. Světlý a tmavý režim', 'Přepínání vzhledu aplikace podle potřeby uživatele.', 'Nastavení'],
    en: ['19. Light and Dark Mode', 'Switching the application appearance according to user preference.', 'Settings'],
    de: ['19. Heller und dunkler Modus', 'Wechsel des Erscheinungsbildes nach Benutzerwunsch.', 'Einstellungen'],
    pl: ['19. Tryb jasny i ciemny', 'Przełączanie wyglądu aplikacji według preferencji użytkownika.', 'Ustawienia'],
    hu: ['19. Világos és sötét mód', 'Az alkalmazás megjelenésének váltása felhasználói igény szerint.', 'Beállítások'],
  }),
  manual(20, 'odhlasenie', '30 sekúnd', '20_odhlasenie', {
    sk: ['20. Odhlásenie', 'Bezpečné ukončenie práce v používateľskom účte.', 'Účet'],
    cs: ['20. Odhlášení', 'Bezpečné ukončení práce v uživatelském účtu.', 'Účet'],
    en: ['20. Log Out', 'Safely ending work in the user account.', 'Account'],
    de: ['20. Abmelden', 'Sicheres Beenden der Arbeit im Benutzerkonto.', 'Konto'],
    pl: ['20. Wylogowanie', 'Bezpieczne zakończenie pracy na koncie użytkownika.', 'Konto'],
    hu: ['20. Kijelentkezés', 'A munka biztonságos befejezése a felhasználói fiókban.', 'Fiók'],
  }),
];
