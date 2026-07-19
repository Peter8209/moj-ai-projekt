'use client';

import Link from 'next/link';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useLanguage } from '@/components/LanguageProvider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  LogIn,
  Mail,
} from 'lucide-react';


type AppLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

const LANGUAGE_STORAGE_KEY = 'zedpera_language';

type LoginCopy = {
  title: string;
  subtitle: string;
  description: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  loginButton: string;
  loggingIn: string;
  forgotPassword: string;
  noAccount: string;
  register: string;
  backHome: string;
  missingFields: string;
  invalidEmail: string;
  invalidCredentials: string;
  emailNotConfirmed: string;
  tooManyAttempts: string;
  accountBlocked: string;
  emailLoginDisabled: string;
  invalidRequest: string;
  sessionExpired: string;
  networkError: string;
  serviceUnavailable: string;
  loginFailed: string;
  genericError: string;
  passwordChanged: string;
  registrationConfirmed: string;
  callbackFailed: string;
  callbackCodeMissing: string;
  callbackExpired: string;
  callbackSessionMissing: string;
};

const loginCopy: Record<AppLanguage, LoginCopy> = {
  "sk": {
    "title": "Prihlásenie",
    "subtitle": "ZEDPERA účet",
    "description": "Prihlásenie je dostupné iba pre registrovaných používateľov ZEDPERA.",
    "email": "E-mail",
    "emailPlaceholder": "napr. peter@email.com",
    "password": "Heslo",
    "passwordPlaceholder": "Zadajte heslo",
    "showPassword": "Zobraziť heslo",
    "hidePassword": "Skryť heslo",
    "loginButton": "Prihlásiť sa do aplikácie",
    "loggingIn": "Prihlasujem...",
    "forgotPassword": "Zabudli ste heslo?",
    "noAccount": "Nemáte účet?",
    "register": "Registrovať sa",
    "backHome": "Späť na úvodnú stránku",
    "missingFields": "Vyplňte e-mail a heslo.",
    "invalidEmail": "Zadajte platnú e-mailovú adresu.",
    "invalidCredentials": "Nesprávny e-mail alebo heslo. Skontrolujte zadané údaje.",
    "emailNotConfirmed": "E-mailová adresa ešte nebola potvrdená. Otvorte potvrdzovací e-mail a následne sa prihláste.",
    "tooManyAttempts": "Bolo vykonaných príliš veľa pokusov o prihlásenie. Počkajte chvíľu a skúste to znova.",
    "accountBlocked": "Tento používateľský účet je dočasne zablokovaný. Kontaktujte podporu ZEDPERA.",
    "emailLoginDisabled": "Prihlasovanie e-mailom a heslom je momentálne vypnuté. Kontaktujte podporu ZEDPERA.",
    "invalidRequest": "Požiadavka na prihlásenie nie je platná. Obnovte stránku a skúste to znova.",
    "sessionExpired": "Prihlasovacia relácia vypršala. Prihláste sa znova.",
    "networkError": "Nepodarilo sa spojiť so serverom. Skontrolujte internetové pripojenie a skúste to znova.",
    "serviceUnavailable": "Prihlasovacia služba je dočasne nedostupná. Skúste to neskôr.",
    "loginFailed": "Prihlásenie sa nepodarilo. Skontrolujte zadané údaje a skúste to znova.",
    "genericError": "Prihlásenie sa nepodarilo. Skúste to znova.",
    "passwordChanged": "Heslo bolo úspešne zmenené. Teraz sa môžete prihlásiť.",
    "registrationConfirmed": "E-mailová adresa bola úspešne potvrdená. Teraz sa môžete bezpečne prihlásiť.",
    "callbackFailed": "Potvrdenie účtu sa nepodarilo dokončiť. Skúste znovu otvoriť odkaz z potvrdzovacieho e-mailu.",
    "callbackCodeMissing": "Potvrdzovací odkaz neobsahuje platný kód. Požiadajte o nový potvrdzovací e-mail.",
    "callbackExpired": "Potvrdzovací odkaz vypršal alebo už bol použitý. Požiadajte o nový odkaz.",
    "callbackSessionMissing": "E-mail bol potvrdený, ale prihlasovaciu reláciu sa nepodarilo vytvoriť. Prihláste sa e-mailom a heslom."
  },
  "cs": {
    "title": "Přihlášení",
    "subtitle": "Účet ZEDPERA",
    "description": "Přihlášení je dostupné pouze pro registrované uživatele ZEDPERA.",
    "email": "E-mail",
    "emailPlaceholder": "např. peter@email.com",
    "password": "Heslo",
    "passwordPlaceholder": "Zadejte heslo",
    "showPassword": "Zobrazit heslo",
    "hidePassword": "Skrýt heslo",
    "loginButton": "Přihlásit se do aplikace",
    "loggingIn": "Přihlašuji...",
    "forgotPassword": "Zapomněli jste heslo?",
    "noAccount": "Nemáte účet?",
    "register": "Registrovat se",
    "backHome": "Zpět na úvodní stránku",
    "missingFields": "Vyplňte e-mail a heslo.",
    "invalidEmail": "Zadejte platnou e-mailovou adresu.",
    "invalidCredentials": "Nesprávný e-mail nebo heslo. Zkontrolujte zadané údaje.",
    "emailNotConfirmed": "E-mailová adresa ještě nebyla potvrzena. Otevřete potvrzovací e-mail a poté se přihlaste.",
    "tooManyAttempts": "Proběhlo příliš mnoho pokusů o přihlášení. Chvíli počkejte a zkuste to znovu.",
    "accountBlocked": "Tento uživatelský účet je dočasně zablokován. Kontaktujte podporu ZEDPERA.",
    "emailLoginDisabled": "Přihlašování e-mailem a heslem je momentálně vypnuté. Kontaktujte podporu ZEDPERA.",
    "invalidRequest": "Požadavek na přihlášení není platný. Obnovte stránku a zkuste to znovu.",
    "sessionExpired": "Přihlašovací relace vypršela. Přihlaste se znovu.",
    "networkError": "Nepodařilo se spojit se serverem. Zkontrolujte internetové připojení a zkuste to znovu.",
    "serviceUnavailable": "Přihlašovací služba je dočasně nedostupná. Zkuste to později.",
    "loginFailed": "Přihlášení se nezdařilo. Zkontrolujte údaje a zkuste to znovu.",
    "genericError": "Přihlášení se nezdařilo. Zkuste to znovu.",
    "passwordChanged": "Heslo bylo úspěšně změněno. Nyní se můžete přihlásit.",
    "registrationConfirmed": "E-mailová adresa byla úspěšně potvrzena. Nyní se můžete bezpečně přihlásit.",
    "callbackFailed": "Potvrzení účtu se nepodařilo dokončit. Znovu otevřete odkaz z potvrzovacího e-mailu.",
    "callbackCodeMissing": "Potvrzovací odkaz neobsahuje platný kód. Požádejte o nový potvrzovací e-mail.",
    "callbackExpired": "Potvrzovací odkaz vypršel nebo již byl použit. Požádejte o nový odkaz.",
    "callbackSessionMissing": "E-mail byl potvrzen, ale přihlašovací relaci se nepodařilo vytvořit. Přihlaste se e-mailem a heslem."
  },
  "en": {
    "title": "Sign in",
    "subtitle": "ZEDPERA account",
    "description": "Sign-in is available only to registered ZEDPERA users.",
    "email": "Email",
    "emailPlaceholder": "e.g. peter@email.com",
    "password": "Password",
    "passwordPlaceholder": "Enter your password",
    "showPassword": "Show password",
    "hidePassword": "Hide password",
    "loginButton": "Sign in to the application",
    "loggingIn": "Signing in...",
    "forgotPassword": "Forgot your password?",
    "noAccount": "Don't have an account?",
    "register": "Register",
    "backHome": "Back to the home page",
    "missingFields": "Enter your email and password.",
    "invalidEmail": "Enter a valid email address.",
    "invalidCredentials": "Incorrect email or password. Check the details you entered.",
    "emailNotConfirmed": "Your email address has not been confirmed yet. Open the confirmation email and then sign in.",
    "tooManyAttempts": "Too many sign-in attempts were made. Wait a moment and try again.",
    "accountBlocked": "This user account is temporarily blocked. Contact ZEDPERA support.",
    "emailLoginDisabled": "Email and password sign-in is currently disabled. Contact ZEDPERA support.",
    "invalidRequest": "The sign-in request is invalid. Refresh the page and try again.",
    "sessionExpired": "Your sign-in session has expired. Sign in again.",
    "networkError": "Unable to connect to the server. Check your internet connection and try again.",
    "serviceUnavailable": "The authentication service is temporarily unavailable. Try again later.",
    "loginFailed": "Sign-in failed. Check your details and try again.",
    "genericError": "Sign-in failed. Please try again.",
    "passwordChanged": "Your password was changed successfully. You can now sign in.",
    "registrationConfirmed": "Your email address was confirmed successfully. You can now sign in securely.",
    "callbackFailed": "Account confirmation could not be completed. Open the link from the confirmation email again.",
    "callbackCodeMissing": "The confirmation link does not contain a valid code. Request a new confirmation email.",
    "callbackExpired": "The confirmation link has expired or was already used. Request a new link.",
    "callbackSessionMissing": "Your email was confirmed, but a sign-in session could not be created. Sign in with your email and password."
  },
  "de": {
    "title": "Anmeldung",
    "subtitle": "ZEDPERA-Konto",
    "description": "Die Anmeldung ist nur für registrierte ZEDPERA-Benutzer verfügbar.",
    "email": "E-Mail",
    "emailPlaceholder": "z. B. peter@email.com",
    "password": "Passwort",
    "passwordPlaceholder": "Passwort eingeben",
    "showPassword": "Passwort anzeigen",
    "hidePassword": "Passwort ausblenden",
    "loginButton": "In der Anwendung anmelden",
    "loggingIn": "Anmeldung läuft...",
    "forgotPassword": "Passwort vergessen?",
    "noAccount": "Sie haben noch kein Konto?",
    "register": "Registrieren",
    "backHome": "Zurück zur Startseite",
    "missingFields": "Geben Sie E-Mail-Adresse und Passwort ein.",
    "invalidEmail": "Geben Sie eine gültige E-Mail-Adresse ein.",
    "invalidCredentials": "E-Mail-Adresse oder Passwort ist falsch. Prüfen Sie Ihre Eingaben.",
    "emailNotConfirmed": "Ihre E-Mail-Adresse wurde noch nicht bestätigt. Öffnen Sie die Bestätigungs-E-Mail und melden Sie sich anschließend an.",
    "tooManyAttempts": "Es wurden zu viele Anmeldeversuche durchgeführt. Warten Sie kurz und versuchen Sie es erneut.",
    "accountBlocked": "Dieses Benutzerkonto ist vorübergehend gesperrt. Kontaktieren Sie den ZEDPERA-Support.",
    "emailLoginDisabled": "Die Anmeldung mit E-Mail und Passwort ist derzeit deaktiviert. Kontaktieren Sie den ZEDPERA-Support.",
    "invalidRequest": "Die Anmeldeanfrage ist ungültig. Laden Sie die Seite neu und versuchen Sie es erneut.",
    "sessionExpired": "Ihre Anmeldesitzung ist abgelaufen. Melden Sie sich erneut an.",
    "networkError": "Die Verbindung zum Server konnte nicht hergestellt werden. Prüfen Sie Ihre Internetverbindung.",
    "serviceUnavailable": "Der Anmeldedienst ist vorübergehend nicht verfügbar. Versuchen Sie es später erneut.",
    "loginFailed": "Die Anmeldung ist fehlgeschlagen. Prüfen Sie Ihre Angaben und versuchen Sie es erneut.",
    "genericError": "Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    "passwordChanged": "Das Passwort wurde erfolgreich geändert. Sie können sich jetzt anmelden.",
    "registrationConfirmed": "Ihre E-Mail-Adresse wurde erfolgreich bestätigt. Sie können sich jetzt sicher anmelden.",
    "callbackFailed": "Die Kontobestätigung konnte nicht abgeschlossen werden. Öffnen Sie den Link aus der Bestätigungs-E-Mail erneut.",
    "callbackCodeMissing": "Der Bestätigungslink enthält keinen gültigen Code. Fordern Sie eine neue Bestätigungs-E-Mail an.",
    "callbackExpired": "Der Bestätigungslink ist abgelaufen oder wurde bereits verwendet. Fordern Sie einen neuen Link an.",
    "callbackSessionMissing": "Die E-Mail wurde bestätigt, aber es konnte keine Anmeldesitzung erstellt werden. Melden Sie sich mit E-Mail und Passwort an."
  },
  "pl": {
    "title": "Logowanie",
    "subtitle": "Konto ZEDPERA",
    "description": "Logowanie jest dostępne tylko dla zarejestrowanych użytkowników ZEDPERA.",
    "email": "E-mail",
    "emailPlaceholder": "np. peter@email.com",
    "password": "Hasło",
    "passwordPlaceholder": "Wpisz hasło",
    "showPassword": "Pokaż hasło",
    "hidePassword": "Ukryj hasło",
    "loginButton": "Zaloguj się do aplikacji",
    "loggingIn": "Logowanie...",
    "forgotPassword": "Nie pamiętasz hasła?",
    "noAccount": "Nie masz konta?",
    "register": "Zarejestruj się",
    "backHome": "Powrót do strony głównej",
    "missingFields": "Wpisz e-mail i hasło.",
    "invalidEmail": "Wpisz prawidłowy adres e-mail.",
    "invalidCredentials": "Nieprawidłowy e-mail lub hasło. Sprawdź wprowadzone dane.",
    "emailNotConfirmed": "Adres e-mail nie został jeszcze potwierdzony. Otwórz wiadomość potwierdzającą, a następnie zaloguj się.",
    "tooManyAttempts": "Wykonano zbyt wiele prób logowania. Odczekaj chwilę i spróbuj ponownie.",
    "accountBlocked": "To konto użytkownika jest tymczasowo zablokowane. Skontaktuj się z pomocą ZEDPERA.",
    "emailLoginDisabled": "Logowanie za pomocą e-maila i hasła jest obecnie wyłączone. Skontaktuj się z pomocą ZEDPERA.",
    "invalidRequest": "Żądanie logowania jest nieprawidłowe. Odśwież stronę i spróbuj ponownie.",
    "sessionExpired": "Sesja logowania wygasła. Zaloguj się ponownie.",
    "networkError": "Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.",
    "serviceUnavailable": "Usługa logowania jest tymczasowo niedostępna. Spróbuj później.",
    "loginFailed": "Logowanie nie powiodło się. Sprawdź dane i spróbuj ponownie.",
    "genericError": "Logowanie nie powiodło się. Spróbuj ponownie.",
    "passwordChanged": "Hasło zostało pomyślnie zmienione. Możesz się teraz zalogować.",
    "registrationConfirmed": "Adres e-mail został pomyślnie potwierdzony. Możesz się teraz bezpiecznie zalogować.",
    "callbackFailed": "Nie udało się zakończyć potwierdzania konta. Otwórz ponownie link z wiadomości potwierdzającej.",
    "callbackCodeMissing": "Link potwierdzający nie zawiera prawidłowego kodu. Poproś o nową wiadomość potwierdzającą.",
    "callbackExpired": "Link potwierdzający wygasł lub został już użyty. Poproś o nowy link.",
    "callbackSessionMissing": "Adres e-mail został potwierdzony, ale nie udało się utworzyć sesji logowania. Zaloguj się e-mailem i hasłem."
  },
  "hu": {
    "title": "Bejelentkezés",
    "subtitle": "ZEDPERA-fiók",
    "description": "A bejelentkezés csak regisztrált ZEDPERA-felhasználók számára érhető el.",
    "email": "E-mail",
    "emailPlaceholder": "pl. peter@email.com",
    "password": "Jelszó",
    "passwordPlaceholder": "Adja meg a jelszót",
    "showPassword": "Jelszó megjelenítése",
    "hidePassword": "Jelszó elrejtése",
    "loginButton": "Bejelentkezés az alkalmazásba",
    "loggingIn": "Bejelentkezés...",
    "forgotPassword": "Elfelejtette a jelszavát?",
    "noAccount": "Nincs még fiókja?",
    "register": "Regisztráció",
    "backHome": "Vissza a kezdőlapra",
    "missingFields": "Adja meg az e-mail-címet és a jelszót.",
    "invalidEmail": "Adjon meg érvényes e-mail-címet.",
    "invalidCredentials": "Helytelen e-mail-cím vagy jelszó. Ellenőrizze a megadott adatokat.",
    "emailNotConfirmed": "Az e-mail-cím még nincs megerősítve. Nyissa meg a megerősítő e-mailt, majd jelentkezzen be.",
    "tooManyAttempts": "Túl sok bejelentkezési kísérlet történt. Várjon egy kicsit, majd próbálja újra.",
    "accountBlocked": "Ez a felhasználói fiók ideiglenesen zárolva van. Lépjen kapcsolatba a ZEDPERA ügyfélszolgálatával.",
    "emailLoginDisabled": "Az e-mail-címmel és jelszóval történő bejelentkezés jelenleg ki van kapcsolva. Lépjen kapcsolatba a ZEDPERA ügyfélszolgálatával.",
    "invalidRequest": "A bejelentkezési kérés érvénytelen. Frissítse az oldalt, majd próbálja újra.",
    "sessionExpired": "A bejelentkezési munkamenet lejárt. Jelentkezzen be újra.",
    "networkError": "Nem sikerült kapcsolódni a kiszolgálóhoz. Ellenőrizze az internetkapcsolatot, majd próbálja újra.",
    "serviceUnavailable": "A bejelentkezési szolgáltatás átmenetileg nem érhető el. Próbálja meg később.",
    "loginFailed": "A bejelentkezés sikertelen. Ellenőrizze az adatokat, majd próbálja újra.",
    "genericError": "A bejelentkezés sikertelen. Próbálja újra.",
    "passwordChanged": "A jelszó sikeresen megváltozott. Most már bejelentkezhet.",
    "registrationConfirmed": "Az e-mail-cím megerősítése sikeres volt. Most már biztonságosan bejelentkezhet.",
    "callbackFailed": "A fiók megerősítését nem sikerült befejezni. Nyissa meg újra a megerősítő e-mailben található hivatkozást.",
    "callbackCodeMissing": "A megerősítő hivatkozás nem tartalmaz érvényes kódot. Kérjen új megerősítő e-mailt.",
    "callbackExpired": "A megerősítő hivatkozás lejárt vagy már felhasználták. Kérjen új hivatkozást.",
    "callbackSessionMissing": "Az e-mail-címet megerősítették, de nem sikerült bejelentkezési munkamenetet létrehozni. Jelentkezzen be e-mail-címmel és jelszóval."
  }
};

function normalizeLanguage(value: unknown): AppLanguage {
  const normalized = String(value || '').trim().toLowerCase();

  if (
    normalized === 'sk' ||
    normalized === 'slovak' ||
    normalized === 'slovenčina' ||
    normalized === 'slovencina'
  ) {
    return 'sk';
  }

  if (
    normalized === 'cs' ||
    normalized === 'cz' ||
    normalized === 'czech' ||
    normalized === 'čeština' ||
    normalized === 'cestina'
  ) {
    return 'cs';
  }

  if (
    normalized === 'en' ||
    normalized === 'eng' ||
    normalized === 'english' ||
    normalized === 'angličtina' ||
    normalized === 'anglictina'
  ) {
    return 'en';
  }

  if (
    normalized === 'de' ||
    normalized === 'ger' ||
    normalized === 'german' ||
    normalized === 'deutsch' ||
    normalized === 'nemčina' ||
    normalized === 'nemcina'
  ) {
    return 'de';
  }

  if (
    normalized === 'pl' ||
    normalized === 'polish' ||
    normalized === 'polski' ||
    normalized === 'poľština' ||
    normalized === 'polstina'
  ) {
    return 'pl';
  }

  if (
    normalized === 'hu' ||
    normalized === 'hungarian' ||
    normalized === 'magyar' ||
    normalized === 'maďarčina' ||
    normalized === 'madarcina'
  ) {
    return 'hu';
  }

  return 'sk';
}

function getUrlLanguage(): AppLanguage | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang');

  if (!lang) return null;

  return normalizeLanguage(lang);
}

function getSavedLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'sk';

  const urlLanguage = getUrlLanguage();

  if (urlLanguage) return urlLanguage;

  const savedLanguage =
    window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
    window.localStorage.getItem('zedpera_system_language') ||
    window.localStorage.getItem('zedpera_work_language') ||
    window.localStorage.getItem('zedpera_interface_language') ||
    document.documentElement.getAttribute('data-language') ||
    document.documentElement.lang;

  return normalizeLanguage(savedLanguage);
}

function persistLanguage(language: AppLanguage) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem('zedpera_language', language);
  window.localStorage.setItem('zedpera_system_language', language);
  window.localStorage.setItem('zedpera_work_language', language);
  window.localStorage.setItem('zedpera_interface_language', language);

  document.documentElement.lang = language;
  document.documentElement.setAttribute('data-language', language);
  document.documentElement.setAttribute('data-system-language', language);
  document.documentElement.setAttribute('data-work-language', language);
}

function normalizeEmail(value: string) {
  return String(value || '').trim().toLowerCase();
}

function normalizePassword(value: string) {
  return String(value || '');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const SESSION_VERIFY_ATTEMPTS = 6;
const SESSION_VERIFY_DELAY_MS = 120;

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

/**
 * Po úspešnom signInWithPassword čaká, kým Supabase browser klient
 * sprístupní rovnakú reláciu aj cez getSession(). Tým sa odstráni stav,
 * keď sa dashboard otvorí skôr, než sa session zapíše do úložiska/cookies.
 */
async function getVerifiedSession(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  expectedUserId: string,
) {
  for (let attempt = 0; attempt < SESSION_VERIFY_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    const session = data.session;

    if (session?.access_token && session.user?.id === expectedUserId) {
      return session;
    }

    if (attempt < SESSION_VERIFY_ATTEMPTS - 1) {
      await wait(SESSION_VERIFY_DELAY_MS);
    }
  }

  return null;
}

type AuthErrorLike = Error & {
  code?: string;
  status?: number;
  name?: string;
};

function getAuthErrorParts(error: unknown) {
  if (!error || typeof error !== 'object') {
    return {
      code: '',
      message: '',
      status: 0,
      name: '',
    };
  }

  const authError = error as Partial<AuthErrorLike>;

  return {
    code: String(authError.code || '').trim().toLowerCase(),
    message: String(authError.message || '').trim().toLowerCase(),
    status: Number(authError.status || 0),
    name: String(authError.name || '').trim().toLowerCase(),
  };
}

function isNetworkAuthError(error: unknown): boolean {
  const { message, name } = getAuthErrorParts(error);

  return (
    name === 'authretryablefetcherror' ||
    name === 'typeerror' ||
    /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(
      message,
    )
  );
}

function getLoginErrorMessage(
  error: unknown,
  copy: LoginCopy,
): string {
  const { code, message, status } = getAuthErrorParts(error);

  if (
    code === 'email_not_confirmed' ||
    /email not confirmed|email_not_confirmed/i.test(message)
  ) {
    return copy.emailNotConfirmed;
  }

  if (
    code === 'invalid_credentials' ||
    code === 'user_not_found' ||
    /invalid login credentials|invalid credentials|wrong password/i.test(
      message,
    )
  ) {
    return copy.invalidCredentials;
  }

  if (
    status === 429 ||
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    /too many requests|rate limit/i.test(message)
  ) {
    return copy.tooManyAttempts;
  }

  if (code === 'user_banned' || /user.*banned|account.*blocked/i.test(message)) {
    return copy.accountBlocked;
  }

  if (
    code === 'email_provider_disabled' ||
    /email provider.*disabled/i.test(message)
  ) {
    return copy.emailLoginDisabled;
  }

  if (code === 'session_not_found') {
    return copy.sessionExpired;
  }

  if (
    code === 'bad_json' ||
    code === 'validation_failed' ||
    status === 400
  ) {
    return copy.invalidRequest;
  }

  if (isNetworkAuthError(error)) {
    return copy.networkError;
  }

  if (
    code === 'unexpected_failure' ||
    status >= 500
  ) {
    return copy.serviceUnavailable;
  }

  return copy.loginFailed;
}

function getCallbackErrorMessage(
  errorCode: string | null,
  copy: LoginCopy,
): string {
  const code = String(errorCode || '').trim().toLowerCase();

  if (
    code === 'confirmation_code_missing' ||
    code === 'missing_confirmation_code'
  ) {
    return copy.callbackCodeMissing;
  }

  if (
    code === 'invite_not_found' ||
    code === 'otp_expired' ||
    code === 'flow_state_expired' ||
    code === 'flow_state_not_found'
  ) {
    return copy.callbackExpired;
  }

  if (code === 'session_not_created') {
    return copy.callbackSessionMissing;
  }

  return copy.callbackFailed;
}

const ACTIVE_USER_STORAGE_KEY = 'zedpera_active_user_id';

const LEGACY_AUTHORIZATION_KEYS = [
  'zedpera_admin_free',
  'zedpera_is_admin',
  'zedpera_admin_mode',
  'admin_mode',
  'zedpera_user_role',
  'zedpera_user_plan',
  'zedpera_selected_plan',
] as const;

const ACCOUNT_SCOPED_KEYS = [
  'active_profile',
  'selected_profile',
  'profile',
  'profiles',
  'profiles_full',
  'profile_wizard_draft',
  'generated_texts',
  'chat_history',
  'saved_outputs',
  'history',
  'zedpera_history',
  'latest_generated_work_text',
  'zedpera_originality_protocol_result',
  'analysis_result',
  'analysis_results',
  'analysis_history',
  'attached_files',
  'zedpera_attached_files',
  'zedpera_active_dashboard_module',
  'zedpera_pending_checkout_item',
] as const;

const CLIENT_IDENTITY_KEYS = [
  'zedpera_user_email',
  'zedpera_email',
  'user_email',
  'email',
  'zedpera_user_name',
  'zedpera_user_id',
  'zedpera_is_logged_in',
] as const;

function removeClientStorageKeys(keys: readonly string[]) {
  if (typeof window === 'undefined') return;

  for (const key of keys) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
}

function expireLegacyAuthorizationCookies() {
  if (typeof document === 'undefined') return;

  const expired = 'Thu, 01 Jan 1970 00:00:00 GMT';

  for (const cookieName of [
    'sub_active',
    'zedpera_admin_free',
    'zedpera_admin_mode',
  ]) {
    document.cookie = `${cookieName}=; Path=/; Expires=${expired}; SameSite=Lax`;
  }
}

/**
 * Klient nikdy neprideľuje administrátorské oprávnenia.
 * Staré lokálne admin príznaky sa pri každom prihlásení odstránia.
 */
function clearLegacyClientAuthorizationState() {
  removeClientStorageKeys(LEGACY_AUTHORIZATION_KEYS);
  expireLegacyAuthorizationCookies();
}

function clearClientIdentityState() {
  removeClientStorageKeys(CLIENT_IDENTITY_KEYS);
  clearLegacyClientAuthorizationState();
}

/**
 * Pri zmene používateľa vyčistí lokálne dáta predchádzajúceho účtu.
 * Jazyk a všeobecné vizuálne nastavenia zostávajú zachované.
 */
function prepareClientStorageForUser(userId: string) {
  if (typeof window === 'undefined') return;

  const normalizedUserId = String(userId || '').trim();

  if (!normalizedUserId) {
    clearClientIdentityState();
    return;
  }

  const previousUserId =
    window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY) ||
    window.sessionStorage.getItem(ACTIVE_USER_STORAGE_KEY) ||
    '';

  if (!previousUserId || previousUserId !== normalizedUserId) {
    removeClientStorageKeys(ACCOUNT_SCOPED_KEYS);
  }

  clearLegacyClientAuthorizationState();

  window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, normalizedUserId);
  window.sessionStorage.setItem(ACTIVE_USER_STORAGE_KEY, normalizedUserId);
}

function saveClientIdentity({
  userId,
  userEmail,
  userName,
}: {
  userId: string;
  userEmail: string;
  userName: string;
}) {
  if (typeof window === 'undefined') return;

  clearLegacyClientAuthorizationState();

  window.localStorage.setItem('zedpera_user_id', userId);
  window.localStorage.setItem('zedpera_user_email', userEmail);
  window.localStorage.setItem('zedpera_email', userEmail);
  window.localStorage.setItem('user_email', userEmail);
  window.localStorage.setItem('zedpera_user_name', userName);
  window.localStorage.setItem('zedpera_is_logged_in', 'true');
}

export default function LoginPage() {
  const { setLanguage } = useLanguage();

  const [currentLanguage, setCurrentLanguage] = useState<AppLanguage>('sk');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const copy = loginCopy[currentLanguage];

  const triggerAutoTranslate = useCallback(() => {
    if (typeof window === 'undefined') return;

    const language = getSavedLanguage();

    persistLanguage(language);
    setCurrentLanguage(language);
    setLanguage(language);

    window.dispatchEvent(
      new CustomEvent<AppLanguage>('zedpera-language-change', {
        detail: language,
      }),
    );
  }, [setLanguage]);

  useEffect(() => {
    triggerAutoTranslate();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const activeCopy = loginCopy[getSavedLanguage()];

      if (params.get('password') === 'changed') {
        setNotice(activeCopy.passwordChanged);
      } else if (params.get('registration') === 'confirmed') {
        setNotice(activeCopy.registrationConfirmed);
      }

      const callbackErrorCode = params.get('error');

      if (callbackErrorCode) {
        setError(
          getCallbackErrorMessage(callbackErrorCode, activeCopy),
        );
      }
    }

    const timers = [
      window.setTimeout(triggerAutoTranslate, 150),
      window.setTimeout(triggerAutoTranslate, 500),
      window.setTimeout(triggerAutoTranslate, 1000),
      window.setTimeout(triggerAutoTranslate, 1800),
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [triggerAutoTranslate]);

  const redirectToDashboard = (query: string) => {
    if (typeof window === 'undefined') return;

    persistLanguage(currentLanguage);

    const separator = query.includes('?') ? '&' : '?';
    const destination = `/dashboard${query}${separator}lang=${currentLanguage}`;

    /**
     * Tvrdé presmerovanie zabezpečí, že middleware a serverové komponenty
     * načítajú už uloženú Supabase session. replace zároveň zabráni návratu
     * používateľa späť na prihlasovací formulár tlačidlom Späť.
     */
    window.location.replace(destination);
  };

  const loginUser = async () => {
    if (loading) return;
    const cleanEmail = normalizeEmail(email);
    const cleanPassword = normalizePassword(password);

    setError('');
    setNotice('');

    if (!cleanEmail || !cleanPassword) {
      setError(copy.missingFields);

      window.setTimeout(triggerAutoTranslate, 50);
      window.setTimeout(triggerAutoTranslate, 300);

      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError(copy.invalidEmail);

      window.setTimeout(triggerAutoTranslate, 50);
      window.setTimeout(triggerAutoTranslate, 300);

      return;
    }

    try {
      setLoading(true);

      window.setTimeout(triggerAutoTranslate, 50);

      const supabase = createSupabaseBrowserClient();

      /**
       * Prihlásenie prebieha výhradne cez Supabase Auth.
       * Klient neobsahuje administrátorský e-mail, heslo ani lokálny admin režim.
       */
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

      if (loginError) {
        /**
         * Nesprávne prihlasovacie údaje sú očakávaný stav formulára.
         * Preto sa chyba nevypisuje cez console.error(), pretože Next.js
         * development overlay by ju zobrazil ako červenú aplikačnú chybu.
         */
        clearClientIdentityState();
        setError(getLoginErrorMessage(loginError, copy));

        window.setTimeout(triggerAutoTranslate, 50);
        window.setTimeout(triggerAutoTranslate, 300);

        return;
      }

      const signedInUser = data.user;

      if (!signedInUser?.id || !data.session?.access_token) {
        clearClientIdentityState();
        setError(copy.loginFailed);
        return;
      }

      const verifiedSession = await getVerifiedSession(
        supabase,
        signedInUser.id,
      );

      if (!verifiedSession) {
        await supabase.auth.signOut();
        clearClientIdentityState();
        setError(copy.sessionExpired);
        return;
      }

      const authenticatedUser = verifiedSession.user;

      /**
       * Dodatočná ochrana proti otvoreniu dashboardu nepotvrdeným účtom.
       * Primárne túto kontrolu vykonáva Supabase Auth.
       */
      if (!authenticatedUser.email_confirmed_at) {
        await supabase.auth.signOut();
        clearClientIdentityState();
        setError(copy.emailNotConfirmed);
        return;
      }

      const userEmail = authenticatedUser.email || cleanEmail;
      const userName =
        authenticatedUser.user_metadata?.full_name ||
        authenticatedUser.user_metadata?.name ||
        userEmail;

      prepareClientStorageForUser(authenticatedUser.id);

      saveClientIdentity({
        userId: authenticatedUser.id,
        userEmail,
        userName,
      });

      /**
       * Plán, dostupné funkcie a administrátorský stav načíta dashboard
       * výhradne zo serverového endpointu /api/entitlements/me.
       */
      redirectToDashboard('?login=success');
    } catch (err: unknown) {
      /**
       * Aj neočakávanú chybu zobrazíme používateľovi vo formulári.
       * console.error() sa tu zámerne nepoužíva, aby Next.js v režime
       * vývoja neprekryl formulár development overlayom.
       */
      clearClientIdentityState();
      setError(getLoginErrorMessage(err, copy));

      window.setTimeout(triggerAutoTranslate, 50);
      window.setTimeout(triggerAutoTranslate, 300);
    } finally {
      setLoading(false);

      window.setTimeout(triggerAutoTranslate, 100);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loginUser();
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-[#020617] dark:text-white">
      <section className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-10 h-[320px] w-[320px] rounded-full bg-indigo-600/20 blur-3xl" />

        <div className="relative mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-8 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/40">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-lg">
              <GraduationCap size={28} />
            </div>

            <div>
              <h1 className="text-3xl font-black text-slate-950 dark:text-white">
                {copy.title}
              </h1>

              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            {copy.description}
          </p>

          {notice ? (
            <div
              role="status"
              aria-live="polite"
              className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-200"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{notice}</span>
              </div>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-700 dark:text-red-200"
            >
              {error}
            </div>
          ) : null}

          <form
            className="mt-7 space-y-4"
            onSubmit={handleSubmit}
            aria-busy={loading}
          >
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                {copy.email}
              </span>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-purple-400 dark:border-white/10 dark:bg-slate-950">
                <Mail size={18} className="text-slate-500" />

                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={copy.emailPlaceholder}
                  type="email"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full bg-transparent text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-600"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                {copy.password}
              </span>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-purple-400 dark:border-white/10 dark:bg-slate-950">
                <Lock size={18} className="text-slate-500" />

                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={copy.passwordPlaceholder}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full bg-transparent text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-600"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-slate-500 transition hover:text-slate-900 dark:hover:text-white"
                  aria-label={
                    showPassword ? copy.hidePassword : copy.showPassword
                  }
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <div className="flex justify-end">
              <Link
                href={`/forgot-password?lang=${currentLanguage}`}
                className="text-sm font-black text-purple-600 transition hover:text-purple-500 dark:text-purple-300 dark:hover:text-purple-200"
              >
                {copy.forgotPassword}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-700 px-5 py-4 font-black text-white shadow-xl shadow-purple-950/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {copy.loggingIn}
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  {copy.loginButton}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {copy.noAccount}{' '}
            <Link
              href={`/register?lang=${currentLanguage}`}
              className="font-bold text-purple-600 hover:text-purple-500 dark:text-purple-300 dark:hover:text-purple-200"
            >
              {copy.register}
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link
              href={`/?lang=${currentLanguage}`}
              className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              {copy.backHome}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}