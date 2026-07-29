import "server-only";

import Stripe from "stripe";

import {
  ADDONS,
  PLANS,
  type AddonId,
  type PlanId,
} from "@/lib/billing/catalog";

type PaidPlanId = Exclude<PlanId, "free" | "admin">;

type CatalogEntry = Record<string, unknown>;

type OrderLine = {
  name: string;
  quantity: number;
  amountCents: number | null;
  currency: string;
};

type ResendSuccessResponse = {
  id?: string;
};

type ResendErrorResponse = {
  name?: string;
  message?: string;
  statusCode?: number;
};

export type SendOrderConfirmationEmailInput = {
  session: Stripe.Checkout.Session;
  planId: PaidPlanId | null;
  addonIds: AddonId[];
  paymentReference: string;
  locale?: string | null;
};

export type SendOrderConfirmationEmailResult = {
  sent: boolean;
  skipped: boolean;
  emailId: string | null;
  reason: string | null;
};


type EmailLanguage = "sk" | "cs" | "en" | "de" | "pl" | "hu";

type EmailStep = {
  title: string;
  text: string;
};

type OrderEmailCopy = {
  subject: string;
  preheader: string;
  headingLine1: string;
  headingLine2: string;
  greeting: (customerName: string) => string;
  thankYou: string;
  intro1: string;
  intro2: string;
  stepsIntro: string;
  steps: EmailStep[];
  closing: string;
  team: string;
  cta: string;
  footer: string;
  orderSummaryTitle: string;
  orderNumber: string;
  paidAmount: string;
  fallbackOrderName: string;
};

const EMAIL_COPY: Record<EmailLanguage, OrderEmailCopy> = {
  sk: {
    subject: "Tvoja objednávka je potvrdená – vitaj v Zedpere",
    preheader: "Tvoja objednávka bola úspešne potvrdená a zakúpený prístup je pripravený.",
    headingLine1: "Tvoja objednávka je potvrdená,",
    headingLine2: "vitaj v Zedpere",
    greeting: (customerName) => customerName ? `Čau ${customerName},` : "Čau,",
    thankYou: "ďakujeme za prejavenú dôveru a využitie našich služieb.",
    intro1: "Zedpera je úplne prvý akademický nástroj, s ktorým napíšeš celú prácu od teoretickej až po praktickú časť. Nevymýšľa si zdroje, negeneruje robotické texty, ale vytvára kvalitné výstupy, ktoré môžeš reálne použiť. Ušetrí ti množstvo času, nahradí školiteľa a dokonale ťa pripraví na obhajobu. Celú prácu napíšeš za pár dní bez akéhokoľvek podvádzania.",
    intro2: "Zedpera sa stane tvojím osobným asistentom. Vychádza z tvojich zdrojov. Ak žiadne nemáš, nevadí, vyhľadáš ich u nás v databáze. Nemusíš byť technicky zdatný, systém je jednoduchý a zvládne ho naozaj každý.",
    stepsIntro: "Vitaj v Zedpere! Tu je 11 krokov, ako získať z platformy maximum a napísať skvelú prácu:",
    steps: [
      { title: "Nastav si profil práce.", text: "Čím viac informácií o téme a zadaní vyplníš, tým relevantnejšie výstupy dostaneš." },
      { title: "Pracuj so zdrojmi.", text: "Ak máš vlastné zdroje, vlož ich priamo do chatu. Ak ešte hľadáš, využi našu sekciu Zdroje." },
      { title: "Prekladaj okamžite.", text: "Našiel si skvelý zdroj v angličtine? Prelož si ho priamo u nás bez prepínania okien." },
      { title: "Vedúci práce k dispozícii 24/7.", text: "Keď sa zasekneš alebo školiteľ neodpisuje, náš pomocník je tu pre teba vždy, keď potrebuješ radu." },
      { title: "Audit kvality na počkanie.", text: "Chceš vedieť, či je tvoj text v poriadku? Spusti audit a za pár sekúnd získaš spätnú väzbu, čo vylepšiť." },
      { title: "Analýza dát v kocke.", text: "Nahraj dáta v Exceli a nechaj si pripraviť štatistiky, grafy či testovanie hypotéz. Štatistu už nebudeš potrebovať." },
      { title: "Humanizácia textu.", text: "Potrebuješ upraviť tón práce, aby pôsobila prirodzenejšie? Náš nástroj ti pomôže upraviť štylistiku podľa potreby." },
      { title: "Komunikácia na úrovni.", text: "Potrebuješ napísať vedúcemu práce? Zedpera ti pomôže sformulovať profesionálny e-mail, ktorý určite zaujme." },
      { title: "Plánovanie bez stresu.", text: "Využi náš plánovač, ktorý ti rozvrhne prácu na menšie úlohy, aby si všetky termíny stihol s prehľadom." },
      { title: "Záverečná príprava na obhajobu.", text: "Nahraj hotovú prácu do systému a vygeneruj si kompletnú obhajobu vrátane poznámok k prezentácii." },
      { title: "Máš hotovo!", text: "Gratulujeme, zvládol si to." },
    ],
    closing: "Držíme palce pri písaní aj obhajobe.",
    team: "Tím Zedpera",
    cta: "Pusti sa do toho",
    footer: "Tento e-mail bol odoslaný automaticky po potvrdení objednávky.",
    orderSummaryTitle: "Údaje o objednávke",
    orderNumber: "Číslo objednávky",
    paidAmount: "Uhradená suma",
    fallbackOrderName: "Objednávka ZEDPERA",
  },
  cs: {
    subject: "Tvoje objednávka je potvrzena – vítej v Zedpeře",
    preheader: "Tvoje objednávka byla úspěšně potvrzena a zakoupený přístup je připraven.",
    headingLine1: "Tvoje objednávka je potvrzena,",
    headingLine2: "vítej v Zedpeře",
    greeting: (customerName) => customerName ? `Ahoj ${customerName},` : "Ahoj,",
    thankYou: "děkujeme za projevenou důvěru a využití našich služeb.",
    intro1: "Zedpera je akademický nástroj, se kterým zvládneš celou práci od teoretické až po praktickou část. Nevymýšlí si zdroje, negeneruje robotické texty, ale vytváří kvalitní výstupy, které můžeš skutečně použít. Ušetří ti spoustu času, pomůže ti jako osobní vedoucí a důkladně tě připraví na obhajobu. Celou práci můžeš připravit během několika dnů bez jakéhokoli podvádění.",
    intro2: "Zedpera se stane tvým osobním asistentem. Vychází z tvých zdrojů. Pokud žádné nemáš, nevadí – můžeš je vyhledat v naší databázi. Nemusíš být technicky zdatný, systém je jednoduchý a zvládne ho opravdu každý.",
    stepsIntro: "Vítej v Zedpeře! Tady je 11 kroků, jak z platformy získat maximum a napsat skvělou práci:",
    steps: [
      { title: "Nastav si profil práce.", text: "Čím více informací o tématu a zadání vyplníš, tím relevantnější výstupy dostaneš." },
      { title: "Pracuj se zdroji.", text: "Máš-li vlastní zdroje, vlož je přímo do chatu. Pokud je teprve hledáš, využij naši sekci Zdroje." },
      { title: "Překládej okamžitě.", text: "Našel jsi skvělý zdroj v angličtině? Přelož si ho přímo u nás bez přepínání oken." },
      { title: "Vedoucí práce k dispozici 24/7.", text: "Když se zasekneš nebo vedoucí neodpovídá, náš pomocník je tu pro tebe vždy, když potřebuješ poradit." },
      { title: "Audit kvality na počkání.", text: "Chceš vědět, jestli je tvůj text v pořádku? Spusť audit a během několika sekund získáš zpětnou vazbu, co vylepšit." },
      { title: "Analýza dat v kostce.", text: "Nahraj data v Excelu a nech si připravit statistiky, grafy nebo testování hypotéz. Statistika už nebudeš potřebovat." },
      { title: "Humanizace textu.", text: "Potřebuješ upravit tón práce, aby působila přirozeněji? Náš nástroj ti pomůže upravit styl podle potřeby." },
      { title: "Komunikace na úrovni.", text: "Potřebuješ napsat vedoucímu práce? Zedpera ti pomůže formulovat profesionální e-mail, který zaujme." },
      { title: "Plánování bez stresu.", text: "Využij náš plánovač, který rozdělí práci na menší úkoly, abys všechny termíny zvládl s přehledem." },
      { title: "Závěrečná příprava na obhajobu.", text: "Nahraj hotovou práci do systému a vygeneruj si kompletní obhajobu včetně poznámek k prezentaci." },
      { title: "Máš hotovo!", text: "Gratulujeme, zvládl jsi to." },
    ],
    closing: "Držíme palce při psaní i obhajobě.",
    team: "Tým Zedpera",
    cta: "Pusť se do toho",
    footer: "Tento e-mail byl odeslán automaticky po potvrzení objednávky.",
    orderSummaryTitle: "Údaje o objednávce",
    orderNumber: "Číslo objednávky",
    paidAmount: "Uhrazená částka",
    fallbackOrderName: "Objednávka ZEDPERA",
  },
  en: {
    subject: "Your order is confirmed – welcome to Zedpera",
    preheader: "Your order has been successfully confirmed and your purchased access is ready.",
    headingLine1: "Your order is confirmed,",
    headingLine2: "welcome to Zedpera",
    greeting: (customerName) => customerName ? `Hi ${customerName},` : "Hi,",
    thankYou: "thank you for your trust and for choosing our services.",
    intro1: "Zedpera is an academic tool that helps you create your entire paper, from the theoretical section to the practical part. It does not invent sources or generate robotic text; instead, it creates high-quality outputs you can genuinely use. It saves you a great deal of time, acts as your personal academic assistant, and helps you prepare thoroughly for your defense. You can complete your paper in just a few days without any cheating.",
    intro2: "Zedpera becomes your personal assistant and works with your own sources. If you do not have any yet, that is fine – you can find them in our database. You do not need to be technically skilled; the system is simple and designed so that anyone can use it.",
    stepsIntro: "Welcome to Zedpera! Here are 11 steps to get the most from the platform and write an excellent paper:",
    steps: [
      { title: "Set up your paper profile.", text: "The more information you provide about your topic and assignment, the more relevant your results will be." },
      { title: "Work with sources.", text: "If you have your own sources, upload them directly to the chat. If you are still searching, use our Sources section." },
      { title: "Translate instantly.", text: "Found a great source in another language? Translate it directly in Zedpera without switching windows." },
      { title: "Academic supervisor available 24/7.", text: "When you get stuck or your supervisor does not reply, our assistant is always available when you need guidance." },
      { title: "Quality audit on demand.", text: "Want to know whether your text is good enough? Run the audit and receive feedback within seconds on what to improve." },
      { title: "Data analysis made simple.", text: "Upload your Excel data and generate statistics, charts, or hypothesis tests. You will not need a separate statistician." },
      { title: "Text humanization.", text: "Need your paper to sound more natural? Our tool helps you adjust the tone and style as needed." },
      { title: "Professional communication.", text: "Need to write to your supervisor? Zedpera helps you create a professional e-mail that makes a strong impression." },
      { title: "Stress-free planning.", text: "Use our planner to break your work into smaller tasks so you can meet every deadline with confidence." },
      { title: "Final defense preparation.", text: "Upload your finished paper and generate complete defense materials, including presentation notes." },
      { title: "You are done!", text: "Congratulations, you made it." },
    ],
    closing: "We wish you every success with your writing and defense.",
    team: "The Zedpera Team",
    cta: "Get started",
    footer: "This e-mail was sent automatically after your order was confirmed.",
    orderSummaryTitle: "Order details",
    orderNumber: "Order number",
    paidAmount: "Amount paid",
    fallbackOrderName: "ZEDPERA order",
  },
  de: {
    subject: "Deine Bestellung ist bestätigt – willkommen bei Zedpera",
    preheader: "Deine Bestellung wurde erfolgreich bestätigt und dein gekaufter Zugang ist bereit.",
    headingLine1: "Deine Bestellung ist bestätigt,",
    headingLine2: "willkommen bei Zedpera",
    greeting: (customerName) => customerName ? `Hallo ${customerName},` : "Hallo,",
    thankYou: "vielen Dank für dein Vertrauen und dafür, dass du unsere Dienste nutzt.",
    intro1: "Zedpera ist ein akademisches Werkzeug, mit dem du deine gesamte Arbeit von der Theorie bis zum praktischen Teil erstellen kannst. Es erfindet keine Quellen und erzeugt keine roboterhaften Texte, sondern hochwertige Ergebnisse, die du tatsächlich verwenden kannst. Du sparst viel Zeit, erhältst einen persönlichen akademischen Assistenten und kannst dich gründlich auf deine Verteidigung vorbereiten. Deine Arbeit kannst du in wenigen Tagen fertigstellen – ohne zu schummeln.",
    intro2: "Zedpera wird zu deinem persönlichen Assistenten und arbeitet mit deinen eigenen Quellen. Wenn du noch keine hast, ist das kein Problem – du kannst sie in unserer Datenbank suchen. Du musst technisch nicht versiert sein; das System ist einfach und wirklich für jeden geeignet.",
    stepsIntro: "Willkommen bei Zedpera! Hier sind 11 Schritte, mit denen du das Maximum aus der Plattform holst und eine hervorragende Arbeit schreibst:",
    steps: [
      { title: "Richte dein Arbeitsprofil ein.", text: "Je mehr Informationen du zu Thema und Aufgabenstellung angibst, desto relevanter werden deine Ergebnisse." },
      { title: "Arbeite mit Quellen.", text: "Wenn du eigene Quellen hast, lade sie direkt in den Chat. Wenn du noch suchst, nutze unseren Bereich Quellen." },
      { title: "Übersetze sofort.", text: "Du hast eine großartige Quelle in einer anderen Sprache gefunden? Übersetze sie direkt bei uns, ohne zwischen Fenstern zu wechseln." },
      { title: "Akademischer Betreuer rund um die Uhr.", text: "Wenn du nicht weiterkommst oder dein Betreuer nicht antwortet, ist unser Assistent jederzeit für dich da." },
      { title: "Qualitätsaudit auf Knopfdruck.", text: "Möchtest du wissen, ob dein Text passt? Starte das Audit und erhalte innerhalb weniger Sekunden Feedback zu möglichen Verbesserungen." },
      { title: "Datenanalyse kompakt.", text: "Lade deine Excel-Daten hoch und erstelle Statistiken, Diagramme oder Hypothesentests. Einen separaten Statistiker brauchst du nicht mehr." },
      { title: "Texthumanisierung.", text: "Soll deine Arbeit natürlicher klingen? Unser Tool hilft dir, Ton und Stil entsprechend anzupassen." },
      { title: "Professionelle Kommunikation.", text: "Du musst deinem Betreuer schreiben? Zedpera hilft dir, eine professionelle E-Mail zu formulieren, die überzeugt." },
      { title: "Stressfreie Planung.", text: "Nutze unseren Planer, der deine Arbeit in kleinere Aufgaben aufteilt, damit du alle Fristen im Blick behältst." },
      { title: "Abschließende Vorbereitung auf die Verteidigung.", text: "Lade deine fertige Arbeit hoch und erstelle vollständige Unterlagen für die Verteidigung einschließlich Präsentationsnotizen." },
      { title: "Fertig!", text: "Herzlichen Glückwunsch, du hast es geschafft." },
    ],
    closing: "Wir wünschen dir viel Erfolg beim Schreiben und bei der Verteidigung.",
    team: "Dein Zedpera-Team",
    cta: "Jetzt loslegen",
    footer: "Diese E-Mail wurde nach der Bestätigung deiner Bestellung automatisch versendet.",
    orderSummaryTitle: "Bestelldetails",
    orderNumber: "Bestellnummer",
    paidAmount: "Bezahlter Betrag",
    fallbackOrderName: "ZEDPERA-Bestellung",
  },
  pl: {
    subject: "Twoje zamówienie zostało potwierdzone – witaj w Zedpera",
    preheader: "Twoje zamówienie zostało pomyślnie potwierdzone, a zakupiony dostęp jest już gotowy.",
    headingLine1: "Twoje zamówienie zostało potwierdzone,",
    headingLine2: "witaj w Zedpera",
    greeting: (customerName) => customerName ? `Cześć ${customerName},` : "Cześć,",
    thankYou: "dziękujemy za zaufanie i skorzystanie z naszych usług.",
    intro1: "Zedpera to narzędzie akademickie, z którym przygotujesz całą pracę – od części teoretycznej aż po praktyczną. Nie wymyśla źródeł i nie generuje sztucznych, robotycznych tekstów, lecz tworzy wysokiej jakości materiały, które możesz realnie wykorzystać. Oszczędza mnóstwo czasu, działa jak osobisty asystent akademicki i kompleksowo przygotowuje do obrony. Całą pracę możesz przygotować w kilka dni, bez żadnego oszukiwania.",
    intro2: "Zedpera stanie się Twoim osobistym asystentem i pracuje na podstawie Twoich źródeł. Jeśli jeszcze ich nie masz, nic nie szkodzi – wyszukasz je w naszej bazie. Nie musisz być osobą techniczną; system jest prosty i naprawdę każdy może z niego korzystać.",
    stepsIntro: "Witaj w Zedpera! Oto 11 kroków, dzięki którym wykorzystasz platformę w pełni i napiszesz świetną pracę:",
    steps: [
      { title: "Ustaw profil pracy.", text: "Im więcej informacji o temacie i wymaganiach podasz, tym bardziej trafne wyniki otrzymasz." },
      { title: "Pracuj ze źródłami.", text: "Jeśli masz własne źródła, dodaj je bezpośrednio do czatu. Jeśli dopiero ich szukasz, skorzystaj z sekcji Źródła." },
      { title: "Tłumacz od razu.", text: "Znalazłeś świetne źródło w innym języku? Przetłumacz je bezpośrednio u nas, bez przełączania okien." },
      { title: "Promotor dostępny 24/7.", text: "Gdy utkniesz lub promotor nie odpowiada, nasz asystent jest dostępny zawsze, kiedy potrzebujesz wskazówki." },
      { title: "Audyt jakości od ręki.", text: "Chcesz sprawdzić, czy Twój tekst jest w porządku? Uruchom audyt i w kilka sekund otrzymasz informację, co warto poprawić." },
      { title: "Analiza danych w prosty sposób.", text: "Prześlij dane z Excela i przygotuj statystyki, wykresy lub testy hipotez. Nie będziesz już potrzebować osobnego statystyka." },
      { title: "Humanizacja tekstu.", text: "Chcesz, aby praca brzmiała bardziej naturalnie? Nasze narzędzie pomoże dostosować ton i styl do potrzeb." },
      { title: "Profesjonalna komunikacja.", text: "Musisz napisać do promotora? Zedpera pomoże Ci przygotować profesjonalną wiadomość e-mail, która zrobi dobre wrażenie." },
      { title: "Planowanie bez stresu.", text: "Skorzystaj z planera, który podzieli pracę na mniejsze zadania, aby wszystkie terminy były pod kontrolą." },
      { title: "Końcowe przygotowanie do obrony.", text: "Prześlij gotową pracę i wygeneruj kompletne materiały do obrony, w tym notatki do prezentacji." },
      { title: "Gotowe!", text: "Gratulacje, udało Ci się." },
    ],
    closing: "Trzymamy kciuki za pisanie i obronę.",
    team: "Zespół Zedpera",
    cta: "Zaczynamy",
    footer: "Ta wiadomość e-mail została wysłana automatycznie po potwierdzeniu zamówienia.",
    orderSummaryTitle: "Szczegóły zamówienia",
    orderNumber: "Numer zamówienia",
    paidAmount: "Zapłacona kwota",
    fallbackOrderName: "Zamówienie ZEDPERA",
  },
  hu: {
    subject: "Megrendelésed visszaigazolva – üdvözlünk a Zedperában",
    preheader: "Megrendelésed sikeresen visszaigazolva, a megvásárolt hozzáférés készen áll.",
    headingLine1: "Megrendelésed visszaigazolva,",
    headingLine2: "üdvözlünk a Zedperában",
    greeting: (customerName) => customerName ? `Szia ${customerName},` : "Szia,",
    thankYou: "köszönjük a bizalmadat és hogy szolgáltatásainkat választottad.",
    intro1: "A Zedpera egy akadémiai eszköz, amellyel a teljes dolgozatodat elkészítheted az elméleti résztől egészen a gyakorlati részig. Nem talál ki forrásokat és nem gépies szövegeket generál, hanem valóban felhasználható, minőségi eredményeket készít. Rengeteg időt takarít meg, személyes akadémiai asszisztensként segít, és alaposan felkészít a védésre. A teljes dolgozatot akár néhány nap alatt elkészítheted csalás nélkül.",
    intro2: "A Zedpera a személyes asszisztenseddé válik, és a saját forrásaidból dolgozik. Ha még nincsenek forrásaid, az sem gond – megkeresheted őket az adatbázisunkban. Nem kell műszaki beállítottságúnak lenned; a rendszer egyszerű, és valóban bárki tudja használni.",
    stepsIntro: "Üdvözlünk a Zedperában! Íme 11 lépés, amellyel a legtöbbet hozhatod ki a platformból és kiváló dolgozatot írhatsz:",
    steps: [
      { title: "Állítsd be a dolgozat profilját.", text: "Minél több információt adsz meg a témáról és a feladatról, annál relevánsabb eredményeket kapsz." },
      { title: "Dolgozz forrásokkal.", text: "Ha vannak saját forrásaid, töltsd fel őket közvetlenül a chatbe. Ha még keresel, használd a Források részt." },
      { title: "Fordíts azonnal.", text: "Találtál egy nagyszerű idegen nyelvű forrást? Fordítsd le közvetlenül nálunk, ablakváltás nélkül." },
      { title: "Akadémiai témavezető 24/7.", text: "Ha elakadsz vagy a témavezetőd nem válaszol, asszisztensünk bármikor rendelkezésedre áll, amikor tanácsra van szükséged." },
      { title: "Minőségi audit azonnal.", text: "Szeretnéd tudni, rendben van-e a szöveged? Indíts auditot, és néhány másodperc alatt visszajelzést kapsz a javítandó részekről." },
      { title: "Adatelemzés egyszerűen.", text: "Töltsd fel az Excel-adataidat, és készíts statisztikákat, grafikonokat vagy hipotézisvizsgálatokat. Külön statisztikusra nem lesz szükséged." },
      { title: "Szöveghumanizálás.", text: "Szeretnéd, hogy a dolgozat természetesebben hangozzon? Eszközünk segít a hangnem és a stílus megfelelő alakításában." },
      { title: "Professzionális kommunikáció.", text: "Írnod kell a témavezetődnek? A Zedpera segít professzionális e-mailt megfogalmazni." },
      { title: "Stresszmentes tervezés.", text: "Használd a tervezőnket, amely kisebb feladatokra bontja a munkát, hogy minden határidőt átláthatóan teljesíts." },
      { title: "Végső felkészülés a védésre.", text: "Töltsd fel a kész dolgozatot, és generálj teljes védési anyagot, beleértve a prezentációs jegyzeteket is." },
      { title: "Kész vagy!", text: "Gratulálunk, sikerült." },
    ],
    closing: "Sok sikert kívánunk az íráshoz és a védéshez.",
    team: "A Zedpera csapata",
    cta: "Kezdj hozzá",
    footer: "Ezt az e-mailt a megrendelés visszaigazolása után automatikusan küldtük.",
    orderSummaryTitle: "Megrendelés adatai",
    orderNumber: "Megrendelés száma",
    paidAmount: "Fizetett összeg",
    fallbackOrderName: "ZEDPERA-megrendelés",
  },
};

function getEmailLanguage(locale: string): EmailLanguage {
  const normalized = locale.toLowerCase();

  if (normalized.startsWith("cs")) return "cs";
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("pl")) return "pl";
  if (normalized.startsWith("hu")) return "hu";
  return "sk";
}

const DEFAULT_LOCALE = "sk-SK";
const DEFAULT_CURRENCY = "eur";
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const EMAIL_TIMEOUT_MS = 20_000;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Chýba premenná prostredia ${name}.`);
  }

  return value;
}

function getAppUrl(): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (!appUrl) {
    throw new Error("Chýba NEXT_PUBLIC_APP_URL alebo NEXT_PUBLIC_BASE_URL.");
  }

  return appUrl.replace(/\/+$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeLocale(value: string | null | undefined): string {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  const localeMap: Record<string, string> = {
    sk: "sk-SK",
    "sk-sk": "sk-SK",
    cs: "cs-CZ",
    cz: "cs-CZ",
    "cs-cz": "cs-CZ",
    en: "en-GB",
    "en-gb": "en-GB",
    "en-us": "en-US",
    de: "de-DE",
    "de-de": "de-DE",
    pl: "pl-PL",
    "pl-pl": "pl-PL",
    hu: "hu-HU",
    "hu-hu": "hu-HU",
  };

  return localeMap[normalized] || DEFAULT_LOCALE;
}

function normalizeCurrency(value: string | null | undefined): string {
  const normalized = String(value || DEFAULT_CURRENCY)
    .trim()
    .toUpperCase();

  return /^[A-Z]{3}$/.test(normalized) ? normalized : "EUR";
}

function formatMoney(
  amountCents: number | null | undefined,
  currency: string | null | undefined,
  locale: string,
): string | null {
  if (
    amountCents === null ||
    amountCents === undefined ||
    !Number.isFinite(amountCents)
  ) {
    return null;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizeCurrency(currency),
  }).format(amountCents / 100);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getExpandedCustomer(
  session: Stripe.Checkout.Session,
): Stripe.Customer | null {
  if (!session.customer || typeof session.customer === "string") {
    return null;
  }

  if ("deleted" in session.customer && session.customer.deleted) {
    return null;
  }

  return session.customer as Stripe.Customer;
}

function getCustomerEmail(session: Stripe.Checkout.Session): string {
  const expandedCustomer = getExpandedCustomer(session);

  const candidates = [
    session.customer_details?.email,
    session.customer_email,
    expandedCustomer?.email,
    session.metadata?.customer_email,
    session.metadata?.email,
  ];

  for (const candidate of candidates) {
    const email = String(candidate || "")
      .trim()
      .toLowerCase();

    if (email && isValidEmail(email)) {
      return email;
    }
  }

  return "";
}

function getCustomerName(session: Stripe.Checkout.Session): string {
  const expandedCustomer = getExpandedCustomer(session);

  const candidates = [
    session.customer_details?.name,
    expandedCustomer?.name,
    session.metadata?.customer_name,
    session.metadata?.name,
  ];

  for (const candidate of candidates) {
    const name = String(candidate || "").trim();

    if (name) {
      return name;
    }
  }

  return "";
}

function readCatalogLabel(
  entry: CatalogEntry | undefined,
  fallback: string,
): string {
  if (!entry) {
    return fallback;
  }

  const candidates = [entry.name, entry.title, entry.label];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim();

    if (value) {
      return value;
    }
  }

  return fallback;
}

function getPlanLabel(planId: PaidPlanId | null): string | null {
  if (!planId) {
    return null;
  }

  return readCatalogLabel(PLANS[planId] as unknown as CatalogEntry, planId);
}

function getAddonLabel(addonId: AddonId): string {
  return readCatalogLabel(ADDONS[addonId] as unknown as CatalogEntry, addonId);
}

function getProductName(
  product:
    | string
    | Stripe.Product
    | {
        deleted: true;
        id?: string;
      }
    | null,
): string {
  if (!product || typeof product === "string") {
    return "";
  }

  if ("deleted" in product && product.deleted) {
    return "";
  }

  return String((product as Stripe.Product).name || "").trim();
}

function getOrderLines(
  session: Stripe.Checkout.Session,
  planId: PaidPlanId | null,
  addonIds: AddonId[],
  copy: OrderEmailCopy,
): OrderLine[] {
  const lineItems = session.line_items?.data || [];

  const stripeLines = lineItems
    .map<OrderLine | null>((lineItem) => {
      const productName = getProductName(lineItem.price?.product || null);
      const description = String(lineItem.description || "").trim();
      const name = productName || description;

      if (!name) {
        return null;
      }

      return {
        name,
        quantity: Math.max(Number(lineItem.quantity || 1), 1),
        amountCents:
          typeof lineItem.amount_total === "number"
            ? lineItem.amount_total
            : null,
        currency:
          String(lineItem.currency || session.currency || DEFAULT_CURRENCY)
            .trim()
            .toLowerCase() || DEFAULT_CURRENCY,
      };
    })
    .filter((line): line is OrderLine => Boolean(line));

  if (stripeLines.length > 0) {
    return stripeLines;
  }

  const fallbackLines: OrderLine[] = [];
  const planLabel = getPlanLabel(planId);

  if (planLabel) {
    fallbackLines.push({
      name: planLabel,
      quantity: 1,
      amountCents: null,
      currency: session.currency || DEFAULT_CURRENCY,
    });
  }

  for (const addonId of addonIds) {
    fallbackLines.push({
      name: getAddonLabel(addonId),
      quantity: 1,
      amountCents: null,
      currency: session.currency || DEFAULT_CURRENCY,
    });
  }

  if (fallbackLines.length === 0) {
    fallbackLines.push({
      name: copy.fallbackOrderName,
      quantity: 1,
      amountCents: session.amount_total,
      currency: session.currency || DEFAULT_CURRENCY,
    });
  }

  return fallbackLines;
}

function createOrderSummaryText({
  lines,
  paymentReference,
  session,
  locale,
  copy,
}: {
  lines: OrderLine[];
  paymentReference: string;
  session: Stripe.Checkout.Session;
  locale: string;
  copy: OrderEmailCopy;
}): string {
  const rows = lines.map((line) => {
    const amount = formatMoney(line.amountCents, line.currency, locale);

    return `- ${line.name}${line.quantity > 1 ? ` × ${line.quantity}` : ""}${
      amount ? `: ${amount}` : ""
    }`;
  });

  const total = formatMoney(session.amount_total, session.currency, locale);

  return [
    copy.orderSummaryTitle.toUpperCase(),
    `${copy.orderNumber}: ${paymentReference}`,
    ...rows,
    total ? `${copy.paidAmount}: ${total}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

function createOrderSummaryHtml({
  lines,
  paymentReference,
  session,
  locale,
  copy,
}: {
  lines: OrderLine[];
  paymentReference: string;
  session: Stripe.Checkout.Session;
  locale: string;
  copy: OrderEmailCopy;
}): string {
  const rows = lines
    .map((line) => {
      const amount = formatMoney(line.amountCents, line.currency, locale);

      return `
        <tr>
          <td
            style="
              padding:10px 0;
              border-bottom:1px solid #e5e7eb;
              color:#111827;
              font-size:15px;
              line-height:1.5;
            "
          >
            ${escapeHtml(line.name)}
            ${line.quantity > 1 ? ` × ${line.quantity}` : ""}
          </td>
          <td
            align="right"
            style="
              padding:10px 0 10px 16px;
              border-bottom:1px solid #e5e7eb;
              color:#111827;
              font-size:15px;
              line-height:1.5;
              white-space:nowrap;
            "
          >
            ${amount ? escapeHtml(amount) : "—"}
          </td>
        </tr>
      `;
    })
    .join("");

  const total = formatMoney(session.amount_total, session.currency, locale);

  return `
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="
        width:100%;
        margin:0 0 30px;
        background:#f8fafc;
        border:1px solid #e2e8f0;
        border-radius:14px;
      "
    >
      <tr>
        <td style="padding:22px 24px;">
          <div
            style="
              margin:0 0 12px;
              color:#111827;
              font-size:18px;
              font-weight:700;
            "
          >
            ${escapeHtml(copy.orderSummaryTitle)}
          </div>

          <div
            style="
              margin:0 0 12px;
              color:#64748b;
              font-size:13px;
              line-height:1.5;
            "
          >
            ${escapeHtml(copy.orderNumber)}:
            <strong style="color:#334155;">
              ${escapeHtml(paymentReference)}
            </strong>
          </div>

          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
          >
            ${rows}

            ${
              total
                ? `
                  <tr>
                    <td
                      style="
                        padding:14px 0 0;
                        color:#111827;
                        font-size:16px;
                        font-weight:700;
                      "
                    >
                      ${escapeHtml(copy.paidAmount)}
                    </td>
                    <td
                      align="right"
                      style="
                        padding:14px 0 0 16px;
                        color:#111827;
                        font-size:17px;
                        font-weight:700;
                        white-space:nowrap;
                      "
                    >
                      ${escapeHtml(total)}
                    </td>
                  </tr>
                `
                : ""
            }
          </table>
        </td>
      </tr>
    </table>
  `;
}

function createPlainTextEmail({
  customerName,
  loginUrl,
  orderSummary,
  copy,
}: {
  customerName: string;
  loginUrl: string;
  orderSummary: string;
  copy: OrderEmailCopy;
}): string {
  const greeting = copy.greeting(customerName);
  const steps = copy.steps
    .map((step, index) => `${index + 1}. ${step.title} ${step.text}`)
    .join("\n\n");

  return `
${copy.subject}

${greeting}

${copy.thankYou}

${copy.intro1}

${copy.intro2}

${orderSummary}

${copy.stepsIntro}

${steps}

${copy.closing}

${copy.team}

${copy.cta}:
${loginUrl}

${copy.footer}
  `.trim();
}

function createHtmlEmail({
  customerName,
  logoUrl,
  loginUrl,
  orderSummaryHtml,
  appUrl,
  language,
  copy,
}: {
  customerName: string;
  logoUrl: string;
  loginUrl: string;
  orderSummaryHtml: string;
  appUrl: string;
  language: EmailLanguage;
  copy: OrderEmailCopy;
}): string {
  const greeting = copy.greeting(customerName);

  const stepsHtml = copy.steps
    .map(
      (step, index) => `
        <tr>
          <td valign="top" style="padding:0 0 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td valign="top" width="38" style="width:38px;padding:1px 12px 0 0;">
                  <div
                    style="
                      width:30px;
                      height:30px;
                      border-radius:999px;
                      background:#111827;
                      color:#ffffff;
                      font-size:14px;
                      font-weight:700;
                      line-height:30px;
                      text-align:center;
                    "
                  >
                    ${index + 1}
                  </div>
                </td>
                <td
                  valign="top"
                  style="
                    color:#334155;
                    font-size:15px;
                    line-height:1.65;
                  "
                >
                  <strong style="color:#111827;">${escapeHtml(step.title)}</strong>
                  ${escapeHtml(step.text)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `,
    )
    .join("");

  return `
<!doctype html>
<html lang="${escapeHtml(language)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(copy.subject)}</title>
  </head>

  <body
    style="
      margin:0;
      padding:0;
      background:#f3f5f8;
      color:#172033;
      font-family:Arial,Helvetica,sans-serif;
    "
  >
    <div
      style="
        display:none;
        max-height:0;
        overflow:hidden;
        opacity:0;
        color:transparent;
      "
    >
      ${escapeHtml(copy.preheader)}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3f5f8;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              width:100%;
              max-width:700px;
              background:#ffffff;
              border:1px solid #e5e7eb;
              border-radius:18px;
              overflow:hidden;
              box-shadow:0 10px 35px rgba(15,23,42,0.08);
            "
          >
            <tr>
              <td align="center" style="padding:36px 34px 16px;">
                <img
                  src="${escapeHtml(logoUrl)}"
                  alt="ZEDPERA"
                  width="190"
                  style="
                    display:block;
                    width:190px;
                    max-width:100%;
                    height:auto;
                    border:0;
                    outline:none;
                    text-decoration:none;
                  "
                >
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:12px 40px 42px;
                  color:#334155;
                  font-size:16px;
                  line-height:1.72;
                "
              >
                <h1
                  style="
                    margin:0 0 26px;
                    color:#111827;
                    font-size:30px;
                    line-height:1.25;
                    text-align:center;
                  "
                >
                  ${escapeHtml(copy.headingLine1)}<br>
                  ${escapeHtml(copy.headingLine2)}
                </h1>

                <p style="margin:0 0 18px;">${escapeHtml(greeting)}</p>
                <p style="margin:0 0 18px;">${escapeHtml(copy.thankYou)}</p>
                <p style="margin:0 0 18px;">${escapeHtml(copy.intro1)}</p>
                <p style="margin:0 0 28px;">${escapeHtml(copy.intro2)}</p>

                ${orderSummaryHtml}

                <h2
                  style="
                    margin:0 0 22px;
                    color:#111827;
                    font-size:22px;
                    line-height:1.4;
                  "
                >
                  ${escapeHtml(copy.stepsIntro)}
                </h2>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  ${stepsHtml}
                </table>

                <p style="margin:16px 0 10px;">${escapeHtml(copy.closing)}</p>
                <p style="margin:0 0 28px;"><strong style="color:#111827;">${escapeHtml(copy.team)}</strong></p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center">
                      <a
                        href="${escapeHtml(loginUrl)}"
                        style="
                          display:inline-block;
                          padding:15px 30px;
                          background:#111827;
                          color:#ffffff;
                          text-decoration:none;
                          font-size:16px;
                          font-weight:700;
                          line-height:1.2;
                          border-radius:10px;
                        "
                      >
                        ${escapeHtml(copy.cta)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td
                align="center"
                style="
                  padding:22px 28px;
                  background:#f8fafc;
                  border-top:1px solid #e5e7eb;
                  color:#64748b;
                  font-size:12px;
                  line-height:1.6;
                "
              >
                ${escapeHtml(copy.footer)}
                <br>
                ZEDPERA ·
                <a href="${escapeHtml(appUrl)}" style="color:#475569;text-decoration:underline;">
                  www.zedpera.com
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

async function readResendResponse(
  response: Response,
): Promise<ResendSuccessResponse & ResendErrorResponse> {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText) as ResendSuccessResponse & ResendErrorResponse;
  } catch {
    return {
      message: rawText,
      statusCode: response.status,
    };
  }
}

export async function sendOrderConfirmationEmail(
  input: SendOrderConfirmationEmailInput,
): Promise<SendOrderConfirmationEmailResult> {
  const recipient = getCustomerEmail(input.session);

  if (!recipient) {
    return {
      sent: false,
      skipped: true,
      emailId: null,
      reason: "Checkout Session neobsahuje platnú e-mailovú adresu zákazníka.",
    };
  }

  const resendApiKey = getRequiredEnv("RESEND_API_KEY");
  const emailFrom = getRequiredEnv("EMAIL_FROM");
  const appUrl = getAppUrl();
  const logoUrl =
    process.env.EMAIL_LOGO_URL?.trim() || `${appUrl}/email/zedpera-logo.png`;
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  const orderNotificationEmail =
    process.env.ORDER_NOTIFICATION_EMAIL?.trim().toLowerCase();

  if (replyTo && !isValidEmail(replyTo)) {
    throw new Error("EMAIL_REPLY_TO nemá platný formát e-mailovej adresy.");
  }

  if (orderNotificationEmail && !isValidEmail(orderNotificationEmail)) {
    throw new Error(
      "ORDER_NOTIFICATION_EMAIL nemá platný formát e-mailovej adresy.",
    );
  }

  const locale = normalizeLocale(input.locale);
  const language = getEmailLanguage(locale);
  const copy = EMAIL_COPY[language];
  const customerName = getCustomerName(input.session);
  const loginUrl = `${appUrl}/login?lang=${encodeURIComponent(language)}`;
  const orderLines = getOrderLines(
    input.session,
    input.planId,
    input.addonIds,
    copy,
  );

  const orderSummaryText = createOrderSummaryText({
    lines: orderLines,
    paymentReference: input.paymentReference,
    session: input.session,
    locale,
    copy,
  });

  const orderSummaryHtml = createOrderSummaryHtml({
    lines: orderLines,
    paymentReference: input.paymentReference,
    session: input.session,
    locale,
    copy,
  });

  const html = createHtmlEmail({
    customerName,
    logoUrl,
    loginUrl,
    orderSummaryHtml,
    appUrl,
    language,
    copy,
  });

  const text = createPlainTextEmail({
    customerName,
    loginUrl,
    orderSummary: orderSummaryText,
    copy,
  });

  const bcc =
    orderNotificationEmail && orderNotificationEmail !== recipient
      ? [orderNotificationEmail]
      : undefined;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `zedpera-order-${input.session.id}`,
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [recipient],
      ...(bcc ? { bcc } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: copy.subject,
      html,
      text,
      tags: [
        {
          name: "email_type",
          value: "order_confirmation",
        },
        {
          name: "language",
          value: language,
        },
        {
          name: "stripe_mode",
          value: input.session.livemode ? "live" : "test",
        },
      ],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
  });

  const result = await readResendResponse(response);

  if (!response.ok) {
    throw new Error(
      result.message ||
        `Resend vrátil HTTP ${response.status} pri odosielaní objednávkového e-mailu.`,
    );
  }

  if (!result.id) {
    throw new Error(
      "Resend potvrdil požiadavku, ale nevrátil identifikátor e-mailu.",
    );
  }

  return {
    sent: true,
    skipped: false,
    emailId: result.id,
    reason: null,
  };
}
