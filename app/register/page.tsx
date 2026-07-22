"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AppLanguage = "sk" | "cs" | "en" | "de" | "pl" | "hu";

type RegisterCopy = {
  title: string;
  subtitle: string;
  description: string;
  selectedPlan: string;
  freePlan: string;
  seminarPlan: string;
  bachelorPlan: string;
  masterPlan: string;
  fullName: string;
  fullNamePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  termsPrefix: string;
  termsLink: string;
  termsSuffix: string;
  privacyPrefix: string;
  privacyLink: string;
  privacySuffix: string;
  submit: string;
  submitting: string;
  alreadyAccount: string;
  login: string;
  backHome: string;
  sidebarDescription: string;
  benefitFree: string;
  benefitEmail: string;
  benefitIsolation: string;
  benefitServer: string;
  missingFields: string;
  invalidEmail: string;
  weakPassword: string;
  passwordMismatch: string;
  termsRequired: string;
  registrationFailed: string;
  emailAlreadyRegistered: string;
  signupDisabled: string;
  emailProviderDisabled: string;
  tooManyRequests: string;
  confirmationSendFailed: string;
  databaseError: string;
  captchaFailed: string;
  invalidRequest: string;
  networkError: string;
  serviceUnavailable: string;
  confirmationTitle: string;
  confirmationText: string;
  confirmationDetail: string;
  confirmationDisabled: string;
};

const REGISTER_COPY: Record<AppLanguage, RegisterCopy> = {
  sk: {
    title: "Registrácia",
    subtitle: "Vytvorenie účtu ZEDPERA",
    description:
      "Vytvorte si používateľský účet. Bezplatný účet bude mať štandardné FREE oprávnenia, nie administrátorský prístup.",
    selectedPlan: "Vybraný balík",
    freePlan: "FREE verzia",
    seminarPlan: "Seminárna práca",
    bachelorPlan: "Bakalárska práca",
    masterPlan: "Diplomová / magisterská práca",
    fullName: "Meno a priezvisko",
    fullNamePlaceholder: "Zadajte meno a priezvisko",
    email: "E-mail",
    emailPlaceholder: "napr. peter@email.com",
    password: "Heslo",
    passwordPlaceholder: "Minimálne 8 znakov",
    confirmPassword: "Potvrdenie hesla",
    confirmPasswordPlaceholder: "Zadajte heslo znova",
    showPassword: "Zobraziť heslo",
    hidePassword: "Skryť heslo",
    termsPrefix: "Súhlasím s ",
    termsLink: "obchodnými podmienkami",
    termsSuffix: " a pravidlami používania služby.",
    privacyPrefix: "Potvrdzujem, že som sa oboznámil/a so ",
    privacyLink: "zásadami ochrany osobných údajov",
    privacySuffix: ".",
    submit: "Registrovať sa",
    submitting: "Vytváram účet...",
    alreadyAccount: "Už máte účet?",
    login: "Prihlásiť sa",
    backHome: "Späť na úvodnú stránku",
    sidebarDescription:
      "Bezpečná registrácia používateľa s potvrdením e-mailu a oddelenými oprávneniami účtu.",
    benefitFree: "FREE účet bez administrátorských oprávnení",
    benefitEmail: "Potvrdenie vlastníctva e-mailovej adresy",
    benefitIsolation: "Oddelené práce a história každého používateľa",
    benefitServer: "Serverové riadenie balíkov a limitov",
    missingFields: "Vyplňte všetky povinné polia.",
    invalidEmail: "Zadajte platnú e-mailovú adresu.",
    weakPassword: "Heslo musí mať aspoň 8 znakov.",
    passwordMismatch: "Zadané heslá sa nezhodujú.",
    termsRequired:
      "Pre registráciu je potrebné samostatne potvrdiť obchodné podmienky aj ochranu osobných údajov.",
    registrationFailed: "Registrácia sa nepodarila. Skúste to znova.",
    emailAlreadyRegistered:
      "Táto e-mailová adresa je už registrovaná. Prihláste sa alebo použite možnosť Zabudnuté heslo.",
    signupDisabled:
      "Vytváranie nových účtov je momentálne vypnuté. Kontaktujte podporu ZEDPERA.",
    emailProviderDisabled:
      "Registrácia e-mailom a heslom je momentálne vypnutá. Kontaktujte podporu ZEDPERA.",
    tooManyRequests:
      "Bolo odoslaných príliš veľa registračných požiadaviek. Počkajte chvíľu a skúste to znova.",
    confirmationSendFailed:
      "Účet sa nepodarilo vytvoriť, pretože potvrdzovací e-mail nebolo možné odoslať. Skúste to neskôr.",
    databaseError:
      "Registráciu sa nepodarilo uložiť. Skúste to neskôr alebo kontaktujte podporu ZEDPERA.",
    captchaFailed:
      "Bezpečnostné overenie nebolo úspešné. Obnovte stránku a skúste to znova.",
    invalidRequest:
      "Registračné údaje nie sú platné. Skontrolujte formulár a skúste to znova.",
    networkError:
      "Nepodarilo sa spojiť so serverom. Skontrolujte internetové pripojenie a skúste to znova.",
    serviceUnavailable:
      "Registračná služba je dočasne nedostupná. Skúste to neskôr.",
    confirmationTitle: "Registrácia prebehla úspešne",
    confirmationText:
      "Práve prebehla úspešná registrácia vášho účtu. Na zadanú e-mailovú adresu sme odoslali potvrdzovací odkaz. Skontrolujte si, prosím, e-mailovú schránku.",
    confirmationDetail:
      "Pre dokončenie registrácie kliknite na potvrdzovací odkaz v e-maile. Ak správu nevidíte, skontrolujte aj priečinok Spam alebo Nevyžiadaná pošta.",
    confirmationDisabled:
      "Účet bol vytvorený, ale povinné potvrdenie e-mailu nie je správne nastavené. Kontaktujte podporu ZEDPERA.",
  },
  cs: {
    title: "Registrace",
    subtitle: "Vytvoření účtu ZEDPERA",
    description:
      "Vytvořte si uživatelský účet. Bezplatný účet bude mít standardní FREE oprávnění, nikoli administrátorský přístup.",
    selectedPlan: "Vybraný balíček",
    freePlan: "FREE verze",
    seminarPlan: "Seminární práce",
    bachelorPlan: "Bakalářská práce",
    masterPlan: "Diplomová / magisterská práce",
    fullName: "Jméno a příjmení",
    fullNamePlaceholder: "Zadejte jméno a příjmení",
    email: "E-mail",
    emailPlaceholder: "např. peter@email.com",
    password: "Heslo",
    passwordPlaceholder: "Minimálně 8 znaků",
    confirmPassword: "Potvrzení hesla",
    confirmPasswordPlaceholder: "Zadejte heslo znovu",
    showPassword: "Zobrazit heslo",
    hidePassword: "Skrýt heslo",
    termsPrefix: "Souhlasím s ",
    termsLink: "obchodními podmínkami",
    termsSuffix: " a pravidly používání služby.",
    privacyPrefix: "Potvrzuji, že jsem se seznámil/a se ",
    privacyLink: "zásadami ochrany osobních údajů",
    privacySuffix: ".",
    submit: "Registrovat se",
    submitting: "Vytvářím účet...",
    alreadyAccount: "Už máte účet?",
    login: "Přihlásit se",
    backHome: "Zpět na úvodní stránku",
    sidebarDescription:
      "Bezpečná registrace uživatele s potvrzením e-mailu a oddělenými oprávněními účtu.",
    benefitFree: "FREE účet bez administrátorských oprávnění",
    benefitEmail: "Potvrzení vlastnictví e-mailové adresy",
    benefitIsolation: "Oddělené práce a historie každého uživatele",
    benefitServer: "Serverové řízení balíčků a limitů",
    missingFields: "Vyplňte všechna povinná pole.",
    invalidEmail: "Zadejte platnou e-mailovou adresu.",
    weakPassword: "Heslo musí mít alespoň 8 znaků.",
    passwordMismatch: "Zadaná hesla se neshodují.",
    termsRequired:
      "Pro registraci je nutné samostatně potvrdit obchodní podmínky i ochranu osobních údajů.",
    registrationFailed: "Registrace se nezdařila. Zkuste to znovu.",
    emailAlreadyRegistered:
      "Tato e-mailová adresa je již registrována. Přihlaste se nebo použijte možnost Zapomenuté heslo.",
    signupDisabled:
      "Vytváření nových účtů je momentálně vypnuté. Kontaktujte podporu ZEDPERA.",
    emailProviderDisabled:
      "Registrace e-mailem a heslem je momentálně vypnutá. Kontaktujte podporu ZEDPERA.",
    tooManyRequests:
      "Bylo odesláno příliš mnoho registračních požadavků. Chvíli počkejte a zkuste to znovu.",
    confirmationSendFailed:
      "Účet se nepodařilo vytvořit, protože potvrzovací e-mail nebylo možné odeslat. Zkuste to později.",
    databaseError:
      "Registraci se nepodařilo uložit. Zkuste to později nebo kontaktujte podporu ZEDPERA.",
    captchaFailed:
      "Bezpečnostní ověření nebylo úspěšné. Obnovte stránku a zkuste to znovu.",
    invalidRequest:
      "Registrační údaje nejsou platné. Zkontrolujte formulář a zkuste to znovu.",
    networkError:
      "Nepodařilo se spojit se serverem. Zkontrolujte internetové připojení a zkuste to znovu.",
    serviceUnavailable:
      "Registrační služba je dočasně nedostupná. Zkuste to později.",
    confirmationTitle: "Registrace proběhla úspěšně",
    confirmationText:
      "Právě proběhla úspěšná registrace vašeho účtu. Na zadanou e-mailovou adresu jsme odeslali potvrzovací odkaz. Zkontrolujte si prosím e-mailovou schránku.",
    confirmationDetail:
      "Pro dokončení registrace klikněte na potvrzovací odkaz v e-mailu. Pokud zprávu nevidíte, zkontrolujte také složku Spam.",
    confirmationDisabled:
      "Účet byl vytvořen, ale povinné potvrzení e-mailu není správně nastaveno. Kontaktujte podporu ZEDPERA.",
  },
  en: {
    title: "Registration",
    subtitle: "Create a ZEDPERA account",
    description:
      "Create a user account. A free account receives standard FREE permissions, never administrator access.",
    selectedPlan: "Selected plan",
    freePlan: "FREE plan",
    seminarPlan: "Seminar paper",
    bachelorPlan: "Bachelor thesis",
    masterPlan: "Master thesis",
    fullName: "Full name",
    fullNamePlaceholder: "Enter your full name",
    email: "Email",
    emailPlaceholder: "e.g. peter@email.com",
    password: "Password",
    passwordPlaceholder: "At least 8 characters",
    confirmPassword: "Confirm password",
    confirmPasswordPlaceholder: "Enter the password again",
    showPassword: "Show password",
    hidePassword: "Hide password",
    termsPrefix: "I agree to the ",
    termsLink: "terms and conditions",
    termsSuffix: " and service rules.",
    privacyPrefix: "I confirm that I have read the ",
    privacyLink: "privacy policy",
    privacySuffix: ".",
    submit: "Create account",
    submitting: "Creating account...",
    alreadyAccount: "Already have an account?",
    login: "Sign in",
    backHome: "Back to the home page",
    sidebarDescription:
      "Secure user registration with email confirmation and separate account permissions.",
    benefitFree: "FREE account without administrator permissions",
    benefitEmail: "Verification of email address ownership",
    benefitIsolation: "Separate work and history for every user",
    benefitServer: "Server-side management of plans and limits",
    missingFields: "Complete all required fields.",
    invalidEmail: "Enter a valid email address.",
    weakPassword: "The password must contain at least 8 characters.",
    passwordMismatch: "The passwords do not match.",
    termsRequired:
      "You must separately accept the terms and the privacy policy.",
    registrationFailed: "Registration failed. Please try again.",
    emailAlreadyRegistered:
      "This email address is already registered. Sign in or use the Forgot password option.",
    signupDisabled:
      "New account creation is currently disabled. Contact ZEDPERA support.",
    emailProviderDisabled:
      "Email and password registration is currently disabled. Contact ZEDPERA support.",
    tooManyRequests:
      "Too many registration requests were sent. Wait a moment and try again.",
    confirmationSendFailed:
      "The account could not be created because the confirmation email could not be sent. Try again later.",
    databaseError:
      "The registration could not be saved. Try again later or contact ZEDPERA support.",
    captchaFailed:
      "The security check was not successful. Refresh the page and try again.",
    invalidRequest:
      "The registration details are invalid. Check the form and try again.",
    networkError:
      "Unable to connect to the server. Check your internet connection and try again.",
    serviceUnavailable:
      "The registration service is temporarily unavailable. Try again later.",
    confirmationTitle: "Registration successful",
    confirmationText:
      "Your account registration has been completed successfully. We sent a confirmation link to your email address. Please check your inbox.",
    confirmationDetail:
      "To complete the registration, open the confirmation link in the email. If you cannot find the message, also check your Spam folder.",
    confirmationDisabled:
      "The account was created, but mandatory email confirmation is not configured correctly. Contact ZEDPERA support.",
  },
  de: {
    title: "Registrierung",
    subtitle: "ZEDPERA-Konto erstellen",
    description:
      "Erstellen Sie ein Benutzerkonto. Ein kostenloses Konto erhält normale FREE-Rechte und niemals Administratorzugriff.",
    selectedPlan: "Gewähltes Paket",
    freePlan: "FREE-Version",
    seminarPlan: "Seminararbeit",
    bachelorPlan: "Bachelorarbeit",
    masterPlan: "Diplom- / Masterarbeit",
    fullName: "Vor- und Nachname",
    fullNamePlaceholder: "Vor- und Nachname eingeben",
    email: "E-Mail",
    emailPlaceholder: "z. B. peter@email.com",
    password: "Passwort",
    passwordPlaceholder: "Mindestens 8 Zeichen",
    confirmPassword: "Passwort bestätigen",
    confirmPasswordPlaceholder: "Passwort erneut eingeben",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort ausblenden",
    termsPrefix: "Ich akzeptiere die ",
    termsLink: "Geschäftsbedingungen",
    termsSuffix: " und Nutzungsregeln.",
    privacyPrefix: "Ich bestätige, dass ich die ",
    privacyLink: "Datenschutzbestimmungen",
    privacySuffix: " gelesen habe.",
    submit: "Registrieren",
    submitting: "Konto wird erstellt...",
    alreadyAccount: "Sie haben bereits ein Konto?",
    login: "Anmelden",
    backHome: "Zurück zur Startseite",
    sidebarDescription:
      "Sichere Benutzerregistrierung mit E-Mail-Bestätigung und getrennten Kontoberechtigungen.",
    benefitFree: "FREE-Konto ohne Administratorrechte",
    benefitEmail: "Bestätigung der Inhaberschaft der E-Mail-Adresse",
    benefitIsolation: "Getrennte Arbeiten und Verläufe für jeden Benutzer",
    benefitServer: "Serverseitige Verwaltung von Paketen und Limits",
    missingFields: "Füllen Sie alle Pflichtfelder aus.",
    invalidEmail: "Geben Sie eine gültige E-Mail-Adresse ein.",
    weakPassword: "Das Passwort muss mindestens 8 Zeichen enthalten.",
    passwordMismatch: "Die Passwörter stimmen nicht überein.",
    termsRequired:
      "Die Geschäftsbedingungen und der Datenschutz müssen separat bestätigt werden.",
    registrationFailed:
      "Die Registrierung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    emailAlreadyRegistered:
      "Diese E-Mail-Adresse ist bereits registriert. Melden Sie sich an oder verwenden Sie „Passwort vergessen“.",
    signupDisabled:
      "Das Erstellen neuer Konten ist derzeit deaktiviert. Kontaktieren Sie den ZEDPERA-Support.",
    emailProviderDisabled:
      "Die Registrierung mit E-Mail und Passwort ist derzeit deaktiviert. Kontaktieren Sie den ZEDPERA-Support.",
    tooManyRequests:
      "Es wurden zu viele Registrierungsanfragen gesendet. Warten Sie kurz und versuchen Sie es erneut.",
    confirmationSendFailed:
      "Das Konto konnte nicht erstellt werden, weil die Bestätigungs-E-Mail nicht gesendet werden konnte. Versuchen Sie es später erneut.",
    databaseError:
      "Die Registrierung konnte nicht gespeichert werden. Versuchen Sie es später erneut oder kontaktieren Sie den ZEDPERA-Support.",
    captchaFailed:
      "Die Sicherheitsprüfung war nicht erfolgreich. Laden Sie die Seite neu und versuchen Sie es erneut.",
    invalidRequest:
      "Die Registrierungsdaten sind ungültig. Prüfen Sie das Formular und versuchen Sie es erneut.",
    networkError:
      "Die Verbindung zum Server konnte nicht hergestellt werden. Prüfen Sie Ihre Internetverbindung.",
    serviceUnavailable:
      "Der Registrierungsdienst ist vorübergehend nicht verfügbar. Versuchen Sie es später erneut.",
    confirmationTitle: "Registrierung erfolgreich",
    confirmationText:
      "Die Registrierung Ihres Kontos wurde erfolgreich abgeschlossen. Wir haben einen Bestätigungslink an Ihre E-Mail-Adresse gesendet. Bitte prüfen Sie Ihr Postfach.",
    confirmationDetail:
      "Öffnen Sie den Bestätigungslink in der E-Mail, um die Registrierung abzuschließen. Prüfen Sie auch den Spam-Ordner, falls die Nachricht nicht sichtbar ist.",
    confirmationDisabled:
      "Das Konto wurde erstellt, aber die verpflichtende E-Mail-Bestätigung ist nicht korrekt konfiguriert. Kontaktieren Sie den ZEDPERA-Support.",
  },
  pl: {
    title: "Rejestracja",
    subtitle: "Utworzenie konta ZEDPERA",
    description:
      "Utwórz konto użytkownika. Konto bezpłatne otrzymuje standardowe uprawnienia FREE, nigdy dostęp administratora.",
    selectedPlan: "Wybrany pakiet",
    freePlan: "Wersja FREE",
    seminarPlan: "Praca seminaryjna",
    bachelorPlan: "Praca licencjacka",
    masterPlan: "Praca magisterska",
    fullName: "Imię i nazwisko",
    fullNamePlaceholder: "Wpisz imię i nazwisko",
    email: "E-mail",
    emailPlaceholder: "np. peter@email.com",
    password: "Hasło",
    passwordPlaceholder: "Co najmniej 8 znaków",
    confirmPassword: "Potwierdź hasło",
    confirmPasswordPlaceholder: "Wpisz hasło ponownie",
    showPassword: "Pokaż hasło",
    hidePassword: "Ukryj hasło",
    termsPrefix: "Akceptuję ",
    termsLink: "warunki handlowe",
    termsSuffix: " i zasady korzystania z usługi.",
    privacyPrefix: "Potwierdzam zapoznanie się z ",
    privacyLink: "polityką prywatności",
    privacySuffix: ".",
    submit: "Zarejestruj się",
    submitting: "Tworzenie konta...",
    alreadyAccount: "Masz już konto?",
    login: "Zaloguj się",
    backHome: "Powrót do strony głównej",
    sidebarDescription:
      "Bezpieczna rejestracja użytkownika z potwierdzeniem e-maila i oddzielnymi uprawnieniami konta.",
    benefitFree: "Konto FREE bez uprawnień administratora",
    benefitEmail: "Potwierdzenie własności adresu e-mail",
    benefitIsolation: "Oddzielne prace i historia każdego użytkownika",
    benefitServer: "Serwerowe zarządzanie pakietami i limitami",
    missingFields: "Wypełnij wszystkie wymagane pola.",
    invalidEmail: "Wpisz prawidłowy adres e-mail.",
    weakPassword: "Hasło musi mieć co najmniej 8 znaków.",
    passwordMismatch: "Hasła nie są zgodne.",
    termsRequired:
      "Warunki handlowe i polityka prywatności wymagają osobnego potwierdzenia.",
    registrationFailed: "Rejestracja nie powiodła się. Spróbuj ponownie.",
    emailAlreadyRegistered:
      "Ten adres e-mail jest już zarejestrowany. Zaloguj się lub użyj opcji Nie pamiętam hasła.",
    signupDisabled:
      "Tworzenie nowych kont jest obecnie wyłączone. Skontaktuj się z pomocą ZEDPERA.",
    emailProviderDisabled:
      "Rejestracja za pomocą e-maila i hasła jest obecnie wyłączona. Skontaktuj się z pomocą ZEDPERA.",
    tooManyRequests:
      "Wysłano zbyt wiele żądań rejestracji. Odczekaj chwilę i spróbuj ponownie.",
    confirmationSendFailed:
      "Nie udało się utworzyć konta, ponieważ nie można było wysłać wiadomości potwierdzającej. Spróbuj później.",
    databaseError:
      "Nie udało się zapisać rejestracji. Spróbuj później lub skontaktuj się z pomocą ZEDPERA.",
    captchaFailed:
      "Weryfikacja bezpieczeństwa nie powiodła się. Odśwież stronę i spróbuj ponownie.",
    invalidRequest:
      "Dane rejestracyjne są nieprawidłowe. Sprawdź formularz i spróbuj ponownie.",
    networkError:
      "Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.",
    serviceUnavailable:
      "Usługa rejestracji jest tymczasowo niedostępna. Spróbuj później.",
    confirmationTitle: "Rejestracja zakończona pomyślnie",
    confirmationText:
      "Rejestracja konta zakończyła się pomyślnie. Wysłaliśmy link potwierdzający na podany adres e-mail. Sprawdź swoją skrzynkę odbiorczą.",
    confirmationDetail:
      "Aby dokończyć rejestrację, otwórz link potwierdzający w wiadomości. Jeśli jej nie widzisz, sprawdź także folder Spam.",
    confirmationDisabled:
      "Konto zostało utworzone, ale obowiązkowe potwierdzenie e-maila nie jest prawidłowo skonfigurowane. Skontaktuj się z pomocą ZEDPERA.",
  },
  hu: {
    title: "Regisztráció",
    subtitle: "ZEDPERA-fiók létrehozása",
    description:
      "Hozzon létre felhasználói fiókot. Az ingyenes fiók normál FREE jogosultságokat kap, adminisztrátori hozzáférést soha.",
    selectedPlan: "Kiválasztott csomag",
    freePlan: "FREE csomag",
    seminarPlan: "Szemináriumi dolgozat",
    bachelorPlan: "Alapképzési szakdolgozat",
    masterPlan: "Mesterképzési szakdolgozat",
    fullName: "Teljes név",
    fullNamePlaceholder: "Adja meg a teljes nevét",
    email: "E-mail",
    emailPlaceholder: "pl. peter@email.com",
    password: "Jelszó",
    passwordPlaceholder: "Legalább 8 karakter",
    confirmPassword: "Jelszó megerősítése",
    confirmPasswordPlaceholder: "Adja meg újra a jelszót",
    showPassword: "Jelszó megjelenítése",
    hidePassword: "Jelszó elrejtése",
    termsPrefix: "Elfogadom az ",
    termsLink: "üzleti feltételeket",
    termsSuffix: " és a szolgáltatás szabályait.",
    privacyPrefix: "Kijelentem, hogy elolvastam az ",
    privacyLink: "adatvédelmi szabályzatot",
    privacySuffix: ".",
    submit: "Regisztráció",
    submitting: "Fiók létrehozása...",
    alreadyAccount: "Már van fiókja?",
    login: "Bejelentkezés",
    backHome: "Vissza a kezdőlapra",
    sidebarDescription:
      "Biztonságos felhasználói regisztráció e-mail-megerősítéssel és elkülönített fiókjogosultságokkal.",
    benefitFree: "FREE fiók adminisztrátori jogosultságok nélkül",
    benefitEmail: "Az e-mail-cím tulajdonjogának megerősítése",
    benefitIsolation: "Elkülönített munkák és előzmények minden felhasználónak",
    benefitServer: "Csomagok és korlátok szerveroldali kezelése",
    missingFields: "Töltse ki az összes kötelező mezőt.",
    invalidEmail: "Adjon meg érvényes e-mail-címet.",
    weakPassword: "A jelszónak legalább 8 karakterből kell állnia.",
    passwordMismatch: "A jelszavak nem egyeznek.",
    termsRequired:
      "Az üzleti feltételeket és az adatvédelmi szabályzatot külön is el kell fogadni.",
    registrationFailed: "A regisztráció sikertelen. Próbálja újra.",
    emailAlreadyRegistered:
      "Ez az e-mail-cím már regisztrálva van. Jelentkezzen be, vagy használja az Elfelejtett jelszó lehetőséget.",
    signupDisabled:
      "Az új fiókok létrehozása jelenleg ki van kapcsolva. Lépjen kapcsolatba a ZEDPERA ügyfélszolgálatával.",
    emailProviderDisabled:
      "Az e-mail-címmel és jelszóval történő regisztráció jelenleg ki van kapcsolva. Lépjen kapcsolatba a ZEDPERA ügyfélszolgálatával.",
    tooManyRequests:
      "Túl sok regisztrációs kérés érkezett. Várjon egy kicsit, majd próbálja újra.",
    confirmationSendFailed:
      "A fiókot nem sikerült létrehozni, mert a megerősítő e-mailt nem lehetett elküldeni. Próbálja meg később.",
    databaseError:
      "A regisztrációt nem sikerült menteni. Próbálja meg később, vagy lépjen kapcsolatba a ZEDPERA ügyfélszolgálatával.",
    captchaFailed:
      "A biztonsági ellenőrzés nem sikerült. Frissítse az oldalt, majd próbálja újra.",
    invalidRequest:
      "A regisztrációs adatok érvénytelenek. Ellenőrizze az űrlapot, majd próbálja újra.",
    networkError:
      "Nem sikerült kapcsolódni a kiszolgálóhoz. Ellenőrizze az internetkapcsolatot, majd próbálja újra.",
    serviceUnavailable:
      "A regisztrációs szolgáltatás átmenetileg nem érhető el. Próbálja meg később.",
    confirmationTitle: "Sikeres regisztráció",
    confirmationText:
      "A fiók regisztrációja sikeresen megtörtént. Megerősítő hivatkozást küldtünk a megadott e-mail-címre. Kérjük, ellenőrizze a beérkező leveleit.",
    confirmationDetail:
      "A regisztráció befejezéséhez nyissa meg az e-mailben található megerősítő hivatkozást. Ha nem látja az üzenetet, ellenőrizze a Spam mappát is.",
    confirmationDisabled:
      "A fiók létrejött, de a kötelező e-mail-megerősítés nincs megfelelően beállítva. Lépjen kapcsolatba a ZEDPERA ügyfélszolgálatával.",
  },
};

const LANGUAGE_STORAGE_KEYS = [
  "zedpera_language",
  "zedpera_system_language",
  "zedpera_work_language",
  "zedpera_interface_language",
] as const;

function normalizeLanguage(value: unknown): AppLanguage {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "sk" ||
    normalized === "slovak" ||
    normalized === "slovenčina" ||
    normalized === "slovencina"
  ) {
    return "sk";
  }

  if (
    normalized === "cs" ||
    normalized === "cz" ||
    normalized === "czech" ||
    normalized === "čeština" ||
    normalized === "cestina"
  ) {
    return "cs";
  }

  if (normalized === "en" || normalized === "eng" || normalized === "english") {
    return "en";
  }

  if (
    normalized === "de" ||
    normalized === "ger" ||
    normalized === "german" ||
    normalized === "deutsch"
  ) {
    return "de";
  }

  if (
    normalized === "pl" ||
    normalized === "polish" ||
    normalized === "polski"
  ) {
    return "pl";
  }

  if (
    normalized === "hu" ||
    normalized === "hungarian" ||
    normalized === "magyar"
  ) {
    return "hu";
  }

  return "sk";
}

function getSavedLanguage(): AppLanguage {
  if (typeof window === "undefined") return "sk";

  const params = new URLSearchParams(window.location.search);
  const queryLanguage = params.get("lang");

  if (queryLanguage) {
    return normalizeLanguage(queryLanguage);
  }

  for (const key of LANGUAGE_STORAGE_KEYS) {
    const saved = window.localStorage.getItem(key);

    if (saved) {
      return normalizeLanguage(saved);
    }
  }

  return normalizeLanguage(
    document.documentElement.getAttribute("data-language") ||
      document.documentElement.getAttribute("data-system-language") ||
      document.documentElement.getAttribute("data-work-language") ||
      document.documentElement.lang,
  );
}

function persistLanguage(language: AppLanguage) {
  if (typeof window === "undefined") return;

  for (const key of LANGUAGE_STORAGE_KEYS) {
    window.localStorage.setItem(key, language);
  }

  document.documentElement.lang = language;
  document.documentElement.setAttribute("data-language", language);
  document.documentElement.setAttribute("data-system-language", language);
  document.documentElement.setAttribute("data-work-language", language);
}

function normalizePlan(value: string | null): string {
  const plan = String(value || "").trim();
  const allowed = new Set([
    "free",
    "seminar-work",
    "bachelor-thesis",
    "master-thesis",
  ]);

  return allowed.has(plan) ? plan : "free";
}

function getPlanLabel(plan: string, copy: RegisterCopy): string {
  if (plan === "seminar-work") return copy.seminarPlan;
  if (plan === "bachelor-thesis") return copy.bachelorPlan;
  if (plan === "master-thesis") return copy.masterPlan;
  return copy.freePlan;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type AuthErrorLike = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  name?: unknown;
};

function getAuthErrorParts(error: unknown) {
  if (!error || (typeof error !== "object" && typeof error !== "function")) {
    return {
      code: "",
      message: "",
      status: 0,
      name: "",
    };
  }

  const authError = error as AuthErrorLike;
  const parsedStatus = Number(authError.status || 0);

  return {
    code: String(authError.code || "")
      .trim()
      .toLowerCase(),
    message: String(authError.message || "")
      .trim()
      .toLowerCase(),
    status: Number.isFinite(parsedStatus) ? parsedStatus : 0,
    name: String(authError.name || "")
      .trim()
      .toLowerCase(),
  };
}

/**
 * Diagnostikuje registračný problém bez vypísania mena, e-mailu alebo hesla.
 * Používa console.warn, pretože console.error v Next.js development režime
 * vyvoláva chybový overlay aj pri očakávanej a spracovanej chybe formulára.
 */
function warnAboutRegistrationIssue(stage: string, error?: unknown) {
  const { code, message, status, name } = getAuthErrorParts(error);

  console.warn("ZEDPERA_SIGNUP_WARNING", {
    stage,
    code: code || undefined,
    status: status || undefined,
    name: name || undefined,
    message: message || undefined,
  });
}

function isMissingAuthSessionError(error: unknown): boolean {
  const { code, message, name } = getAuthErrorParts(error);

  return (
    code === "session_not_found" ||
    name === "authsessionmissingerror" ||
    /auth session missing|session not found/i.test(message)
  );
}

function isNetworkAuthError(error: unknown): boolean {
  const { message, name } = getAuthErrorParts(error);

  return (
    name === "authretryablefetcherror" ||
    name === "typeerror" ||
    /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(
      message,
    )
  );
}

function getRegistrationErrorMessage(
  error: unknown,
  copy: RegisterCopy,
): string {
  const { code, message, status } = getAuthErrorParts(error);

  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    code === "identity_already_exists" ||
    /user\s+already\s+registered/i.test(message) ||
    /email(?:\s+address)?\s+(?:is\s+)?already\s+(?:registered|exists)/i.test(
      message,
    ) ||
    /already\s+exists/i.test(message)
  ) {
    return copy.emailAlreadyRegistered;
  }

  if (
    code === "weak_password" ||
    /weak password|password.*(?:weak|short|characters)/i.test(message)
  ) {
    return copy.weakPassword;
  }

  if (code === "signup_disabled") {
    return copy.signupDisabled;
  }

  if (code === "email_provider_disabled") {
    return copy.emailProviderDisabled;
  }

  if (
    status === 429 ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    /too many requests|rate limit/i.test(message)
  ) {
    return copy.tooManyRequests;
  }

  if (
    /error sending confirmation email|failed to send.*confirmation|smtp/i.test(
      message,
    )
  ) {
    return copy.confirmationSendFailed;
  }

  if (
    /database error saving new user|error saving new user|database error/i.test(
      message,
    )
  ) {
    return copy.databaseError;
  }

  if (code === "captcha_failed" || /captcha|security check/i.test(message)) {
    return copy.captchaFailed;
  }

  if (code === "bad_json" || code === "validation_failed" || status === 400) {
    return copy.invalidRequest;
  }

  if (isNetworkAuthError(error)) {
    return copy.networkError;
  }

  if (code === "unexpected_failure" || status >= 500) {
    return copy.serviceUnavailable;
  }

  return copy.registrationFailed;
}

const REGISTRATION_STORAGE_KEYS = [
  "active_profile",
  "selected_profile",
  "profile",
  "profiles",
  "profiles_full",
  "profile_wizard_draft",
  "generated_texts",
  "chat_history",
  "saved_outputs",
  "history",
  "zedpera_history",
  "latest_generated_work_text",
  "zedpera_originality_protocol_result",
  "analysis_result",
  "analysis_results",
  "analysis_history",
  "attached_files",
  "zedpera_attached_files",
  "zedpera_active_dashboard_module",
  "zedpera_pending_checkout_item",
  "zedpera_active_user_id",
  "zedpera_user_id",
  "zedpera_user_email",
  "zedpera_email",
  "user_email",
  "email",
  "zedpera_user_name",
  "zedpera_user_role",
  "zedpera_user_plan",
  "zedpera_selected_plan",
  "zedpera_is_logged_in",
  "zedpera_admin_free",
  "zedpera_is_admin",
  "zedpera_admin_mode",
  "admin_mode",
] as const;

function expireRegistrationLegacyCookies() {
  if (typeof document === "undefined") return;

  const expired = "Thu, 01 Jan 1970 00:00:00 GMT";

  for (const cookieName of [
    "sub_active",
    "zedpera_admin_free",
    "zedpera_admin_mode",
  ]) {
    document.cookie = `${cookieName}=; Path=/; Expires=${expired}; SameSite=Lax`;
  }
}

/**
 * Vyčistí údaje predchádzajúceho účtu bez odstránenia jazyka a vzhľadu.
 * Používa sa pri otvorení registrácie aj po úspešnom vytvorení účtu, aby sa
 * nový používateľ nedostal k lokálnym údajom predchádzajúcej relácie.
 */
function clearPreviousAccountStorageAfterRegistration() {
  if (typeof window === "undefined") return;

  for (const key of REGISTRATION_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }

  expireRegistrationLegacyCookies();
}

export default function RegisterPage() {
  const router = useRouter();
  const { setLanguage: setGlobalLanguage } = useLanguage();

  const [language, setPageLanguage] = useState<AppLanguage>("sk");
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);
  const [error, setError] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [configurationWarning, setConfigurationWarning] = useState("");

  const copy = REGISTER_COPY[language];
  const planLabel = useMemo(
    () => getPlanLabel(selectedPlan, copy),
    [copy, selectedPlan],
  );

  const applyPageLanguage = useCallback(
    (value: unknown) => {
      const nextLanguage = normalizeLanguage(value);

      persistLanguage(nextLanguage);
      setPageLanguage(nextLanguage);
      setGlobalLanguage(nextLanguage);
    },
    [setGlobalLanguage],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    applyPageLanguage(getSavedLanguage());
    setSelectedPlan(normalizePlan(params.get("plan")));

    const handleLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      const nextValue =
        detail && typeof detail === "object" && "language" in detail
          ? (detail as { language?: unknown }).language
          : detail;

      applyPageLanguage(nextValue);
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key &&
        LANGUAGE_STORAGE_KEYS.includes(
          event.key as (typeof LANGUAGE_STORAGE_KEYS)[number],
        ) &&
        event.newValue
      ) {
        applyPageLanguage(event.newValue);
      }
    };

    window.addEventListener("zedpera-language-change", handleLanguageChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        "zedpera-language-change",
        handleLanguageChange,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [applyPageLanguage]);

  /**
   * Registračná stránka nikdy nesmie zdediť aktívnu reláciu
   * predchádzajúceho používateľa. Inak môže middleware alebo dashboard
   * používateľa automaticky presmerovať ešte pred dokončením registrácie.
   */
  useEffect(() => {
    let active = true;

    async function clearExistingSession() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError && !isMissingAuthSessionError(signOutError)) {
          warnAboutRegistrationIssue("initial-session-sign-out", signOutError);
        }

        if (active) {
          clearPreviousAccountStorageAfterRegistration();
        }
      } catch (sessionError) {
        warnAboutRegistrationIssue(
          "initial-session-clear-exception",
          sessionError,
        );
      }
    }

    void clearExistingSession();

    return () => {
      active = false;
    };
  }, []);

  async function registerUser() {
    if (loading || submitLockRef.current) return;

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    setError("");
    setConfigurationWarning("");

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setError(copy.missingFields);
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError(copy.invalidEmail);
      return;
    }

    if (password.length < 8) {
      setError(copy.weakPassword);
      return;
    }

    if (password !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      setError(copy.termsRequired);
      return;
    }

    submitLockRef.current = true;
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      /**
       * Odhlásenie starej lokálnej relácie je pomocný krok. Chýbajúca relácia
       * nie je registračná chyba a nesmie zablokovať vytvorenie nového účtu.
       */
      const { error: preSignUpSignOutError } = await supabase.auth.signOut();

      if (
        preSignUpSignOutError &&
        !isMissingAuthSessionError(preSignUpSignOutError)
      ) {
        warnAboutRegistrationIssue(
          "pre-sign-up-sign-out",
          preSignUpSignOutError,
        );
      }

      const configuredSiteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "")
        .trim()
        .replace(/\/$/, "");
      const origin = configuredSiteUrl || window.location.origin;
      const callbackNext =
        selectedPlan === "free"
          ? `/login?registration=confirmed&lang=${language}`
          : `/login?registration=confirmed&plan=${encodeURIComponent(selectedPlan)}&lang=${language}`;
      const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(callbackNext)}`;
      const acceptedAt = new Date().toISOString();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: cleanName,
            name: cleanName,
            selected_plan: selectedPlan,
            requested_plan: selectedPlan,
            registration_source: "zedpera-web",
            terms_accepted_at: acceptedAt,
            privacy_accepted_at: acceptedAt,
          },
        },
      });

      /**
       * Očakávané Supabase Auth chyby spracujeme priamo vo formulári.
       * Nevyhadzujeme ich cez throw, aby Next.js development overlay
       * nezobrazil používateľovi technickú konzolovú chybu.
       */
      if (signUpError) {
        warnAboutRegistrationIssue("sign-up-response-error", signUpError);
        setError(getRegistrationErrorMessage(signUpError, copy));
        return;
      }

      /**
       * Ak Supabase nevrátil chybu, registračná požiadavka bola prijatá.
       * Pri zapnutom potvrdzovaní e-mailu môže Supabase z bezpečnostných dôvodov
       * vrátiť obfuskovaný objekt používateľa alebo prázdne pole identities.
       * Tieto hodnoty preto nepoužívame na zobrazenie hlášky „už registrovaný“.
       * Používateľ vždy dostane neutrálne potvrdenie a pokyn skontrolovať e-mail.
       */

      clearPreviousAccountStorageAfterRegistration();

      /**
       * Pri zapnutom Confirm email je data.session null. Ak je potvrdenie
       * e-mailu vypnuté a Supabase reláciu vráti, reláciu okamžite ukončíme,
       * aby registrácia nepreskočila priamo do dashboardu.
       */
      if (data.session) {
        const { error: postSignUpSignOutError } = await supabase.auth.signOut();

        if (
          postSignUpSignOutError &&
          !isMissingAuthSessionError(postSignUpSignOutError)
        ) {
          warnAboutRegistrationIssue(
            "post-sign-up-sign-out",
            postSignUpSignOutError,
          );
        }

        clearPreviousAccountStorageAfterRegistration();
        setConfigurationWarning(copy.confirmationDisabled);
      }

      setConfirmationEmail(cleanEmail);
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setTermsAccepted(false);
      setPrivacyAccepted(false);
    } catch (registrationError: unknown) {
      warnAboutRegistrationIssue(
        "sign-up-unexpected-exception",
        registrationError,
      );
      setError(getRegistrationErrorMessage(registrationError, copy));
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  }

  if (confirmationEmail) {
    return (
      <main className="min-h-screen bg-[#050816] px-4 py-10 text-white sm:px-6">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-emerald-400/25 bg-[#0b1020]/95 p-7 shadow-2xl shadow-black/40 sm:p-9">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200">
              <CheckCircle2 size={32} />
            </div>

            <h1 className="mt-6 text-center text-3xl font-black">
              {copy.confirmationTitle}
            </h1>

            <p className="mt-4 text-center text-base font-bold leading-7 text-slate-300">
              {copy.confirmationText}
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center font-black text-white">
              {confirmationEmail}
            </div>

            <p className="mt-5 text-center text-sm font-semibold leading-6 text-slate-400">
              {copy.confirmationDetail}
            </p>

            {configurationWarning ? (
              <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm font-bold leading-6 text-amber-100">
                {configurationWarning}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/login?lang=${language}`}
                className="inline-flex min-h-[50px] flex-1 items-center justify-center rounded-2xl bg-violet-600 px-5 text-sm font-black text-white transition hover:bg-violet-500"
              >
                {copy.login}
              </Link>

              <button
                type="button"
                onClick={() => router.push(`/?lang=${language}`)}
                className="inline-flex min-h-[50px] flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-black text-white transition hover:bg-white/[0.1]"
              >
                {copy.backHome}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-190px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-700/25 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-100px] h-[460px] w-[460px] rounded-full bg-blue-700/20 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1020]/95 shadow-2xl shadow-black/45 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="hidden border-r border-white/10 bg-gradient-to-br from-violet-700/30 via-blue-700/15 to-transparent p-10 lg:block">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-950/40">
              <GraduationCap size={32} />
            </div>

            <h2 className="mt-8 text-3xl font-black leading-tight">ZEDPERA</h2>

            <p className="mt-4 text-base font-bold leading-7 text-slate-300">
              {copy.sidebarDescription}
            </p>

            <div className="mt-8 space-y-4">
              {[
                copy.benefitFree,
                copy.benefitEmail,
                copy.benefitIsolation,
                copy.benefitServer,
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 text-sm font-bold text-slate-200"
                >
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="p-6 sm:p-8 lg:p-10">
            <button
              type="button"
              onClick={() => router.push(`/?lang=${language}`)}
              className="inline-flex items-center gap-2 text-sm font-black text-slate-400 transition hover:text-white"
            >
              <ArrowLeft size={17} />
              {copy.backHome}
            </button>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-xl shadow-violet-950/35 lg:hidden">
                <GraduationCap size={28} />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight">
                  {copy.title}
                </h1>
                <p className="mt-1 text-sm font-bold text-slate-400">
                  {copy.subtitle}
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm font-semibold leading-6 text-slate-300">
              {copy.description}
            </p>

            <div className="mt-5 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-violet-200">
                {copy.selectedPlan}
              </div>
              <div className="mt-1 text-lg font-black text-white">
                {planLabel}
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                aria-live="assertive"
                className="mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm font-bold leading-6 text-red-100"
              >
                {error}
              </div>
            ) : null}

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void registerUser();
              }}
              noValidate
            >
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-200">
                  {copy.fullName}
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 focus-within:border-violet-400/60">
                  <User size={18} className="text-slate-500" />
                  <input
                    id="register-full-name"
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    required
                    placeholder={copy.fullNamePlaceholder}
                    className="w-full bg-transparent text-white outline-none placeholder:text-slate-600"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-200">
                  {copy.email}
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 focus-within:border-violet-400/60">
                  <Mail size={18} className="text-slate-500" />
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    placeholder={copy.emailPlaceholder}
                    className="w-full bg-transparent text-white outline-none placeholder:text-slate-600"
                  />
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-200">
                    {copy.password}
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 focus-within:border-violet-400/60">
                    <Lock size={18} className="text-slate-500" />
                    <input
                      id="register-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      placeholder={copy.passwordPlaceholder}
                      className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={
                        showPassword ? copy.hidePassword : copy.showPassword
                      }
                      className="text-slate-500 transition hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-200">
                    {copy.confirmPassword}
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 focus-within:border-violet-400/60">
                    <Lock size={18} className="text-slate-500" />
                    <input
                      id="register-confirm-password"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      required
                      minLength={8}
                      placeholder={copy.confirmPasswordPlaceholder}
                      className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-600"
                    />
                  </div>
                </label>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-start gap-3">
                  <input
                    id="terms-accepted"
                    name="termsAccepted"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-violet-600"
                  />
                  <div className="text-sm font-semibold leading-6 text-slate-300">
                    <label htmlFor="terms-accepted" className="cursor-pointer">
                      {copy.termsPrefix}
                    </label>
                    <Link
                      href="/obchodne-podmienky"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-black text-violet-300 underline decoration-violet-400/50 underline-offset-4 hover:text-violet-200"
                    >
                      {copy.termsLink}
                    </Link>
                    <label htmlFor="terms-accepted" className="cursor-pointer">
                      {copy.termsSuffix}
                    </label>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    id="privacy-accepted"
                    name="privacyAccepted"
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(event) =>
                      setPrivacyAccepted(event.target.checked)
                    }
                    className="mt-1 h-4 w-4 shrink-0 accent-violet-600"
                  />
                  <div className="text-sm font-semibold leading-6 text-slate-300">
                    <label
                      htmlFor="privacy-accepted"
                      className="cursor-pointer"
                    >
                      {copy.privacyPrefix}
                    </label>
                    <Link
                      href="/gdpr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-black text-violet-300 underline decoration-violet-400/50 underline-offset-4 hover:text-violet-200"
                    >
                      {copy.privacyLink}
                    </Link>
                    <label
                      htmlFor="privacy-accepted"
                      className="cursor-pointer"
                    >
                      {copy.privacySuffix}
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 text-sm font-black text-white shadow-xl shadow-violet-950/35 transition hover:from-violet-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {copy.submitting}
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    {copy.submit}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm font-semibold text-slate-400">
              {copy.alreadyAccount}{" "}
              <Link
                href={`/login?lang=${language}`}
                className="font-black text-violet-300 transition hover:text-violet-200"
              >
                {copy.login}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

