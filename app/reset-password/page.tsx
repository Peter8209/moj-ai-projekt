"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AppLanguage = "sk" | "cs" | "en" | "de" | "pl" | "hu";

type RecoveryState = "checking" | "ready" | "saving" | "success" | "invalid";

type ResendState = "idle" | "sending" | "sent";

type ResetPasswordCopy = {
  badge: string;
  title: string;
  description: string;
  backToLogin: string;

  cardEyebrow: string;
  cardTitle: string;
  cardSubtitle: string;

  checkingTitle: string;
  checkingDescription: string;

  invalidTitle: string;
  invalidDescription: string;
  invalidHint: string;

  password: string;
  passwordPlaceholder: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  passwordLocked: string;

  save: string;
  saving: string;

  successTitle: string;
  successDescription: string;
  goToLogin: string;

  resendTitle: string;
  resendDescription: string;
  email: string;
  emailPlaceholder: string;
  requestNewLink: string;
  requestingNewLink: string;
  resendSuccessTitle: string;
  resendSuccessDescription: string;

  missing: string;
  minLength: string;
  mismatch: string;
  samePassword: string;
  weakPassword: string;
  invalidEmail: string;
  sessionExpired: string;
  networkError: string;
  updateError: string;
  resendError: string;

  requirementLength: string;
  requirementMatch: string;
};

type AuthErrorLike = Error & {
  code?: string;
  status?: number;
  name?: string;
};

const LANGUAGE_STORAGE_KEY = "zedpera_language";
const RECOVERY_MARKER_KEY = "zedpera_password_recovery_ready";

const copy: Record<AppLanguage, ResetPasswordCopy> = {
  sk: {
    badge: "BEZPEČNÁ OBNOVA ÚČTU",
    title: "Nastavte nové heslo",
    description:
      "Vytvorte nové heslo pre svoj ZEDPERA účet. Po úspešnom uložení sa prihlásite pomocou nových prihlasovacích údajov.",
    backToLogin: "Späť na prihlásenie",

    cardEyebrow: "ZEDPERA ACCOUNT SECURITY",
    cardTitle: "Zmena hesla",
    cardSubtitle:
      "Použite minimálne 8 znakov. Odporúčame kombináciu veľkých a malých písmen, číslic a symbolov.",

    checkingTitle: "Overujeme resetovací odkaz",
    checkingDescription:
      "Počkajte chvíľu, bezpečne pripravujeme reláciu na nastavenie nového hesla.",

    invalidTitle: "Resetovací odkaz už nie je platný",
    invalidDescription:
      "Odkaz bol použitý, vypršala jeho platnosť alebo ho Supabase odmietol.",
    invalidHint:
      "Z bezpečnostných dôvodov nemožno expirovaným odkazom zmeniť heslo. Nižšie si odošlite nový odkaz.",

    password: "Nové heslo",
    passwordPlaceholder: "Zadajte nové heslo",
    confirmPassword: "Potvrdenie nového hesla",
    confirmPasswordPlaceholder: "Zopakujte nové heslo",
    showPassword: "Zobraziť heslo",
    hidePassword: "Skryť heslo",
    passwordLocked:
      "Polia sa automaticky aktivujú po otvorení nového platného odkazu.",

    save: "Uložiť nové heslo",
    saving: "Ukladám nové heslo...",

    successTitle: "Heslo bolo úspešne zmenené",
    successDescription:
      "Do účtu sa teraz môžete prihlásiť pomocou svojho e-mailu a nového hesla.",
    goToLogin: "Prejsť na prihlásenie",

    resendTitle: "Vyžiadať nový resetovací odkaz",
    resendDescription:
      "Zadajte e-mail svojho ZEDPERA účtu. Pošleme vám nový bezpečný odkaz.",
    email: "E-mail účtu",
    emailPlaceholder: "napr. peter@email.com",
    requestNewLink: "Odoslať nový odkaz",
    requestingNewLink: "Odosielam nový odkaz...",
    resendSuccessTitle: "Nový odkaz bol odoslaný",
    resendSuccessDescription:
      "Skontrolujte doručenú poštu aj priečinok Nevyžiadaná pošta a otvorte posledný prijatý e-mail.",

    missing: "Vyplňte nové heslo aj jeho potvrdenie.",
    minLength: "Nové heslo musí mať aspoň 8 znakov.",
    mismatch: "Zadané heslá sa nezhodujú.",
    samePassword: "Nové heslo sa musí líšiť od pôvodného hesla.",
    weakPassword:
      "Heslo nespĺňa bezpečnostné požiadavky. Použite silnejšie heslo.",
    invalidEmail: "Zadajte platnú e-mailovú adresu.",
    sessionExpired:
      "Resetovacia relácia už nie je platná. Vyžiadajte si nový odkaz.",
    networkError:
      "Nepodarilo sa spojiť so serverom. Skontrolujte internetové pripojenie.",
    updateError: "Heslo sa nepodarilo zmeniť. Skúste to znova.",
    resendError:
      "Nový resetovací odkaz sa nepodarilo odoslať. Skúste to znova.",

    requirementLength: "Minimálne 8 znakov",
    requirementMatch: "Obe heslá sa zhodujú",
  },

  cs: {
    badge: "BEZPEČNÁ OBNOVA ÚČTU",
    title: "Nastavte nové heslo",
    description:
      "Vytvořte nové heslo pro svůj účet ZEDPERA. Po uložení se přihlásíte pomocí nových údajů.",
    backToLogin: "Zpět na přihlášení",

    cardEyebrow: "ZEDPERA ACCOUNT SECURITY",
    cardTitle: "Změna hesla",
    cardSubtitle:
      "Použijte minimálně 8 znaků. Doporučujeme velká a malá písmena, číslice a symboly.",

    checkingTitle: "Ověřujeme resetovací odkaz",
    checkingDescription:
      "Počkejte chvíli, bezpečně připravujeme relaci pro nové heslo.",

    invalidTitle: "Resetovací odkaz již není platný",
    invalidDescription:
      "Odkaz byl použit, vypršela jeho platnost nebo jej Supabase odmítl.",
    invalidHint:
      "Z bezpečnostních důvodů nelze expirovaným odkazem změnit heslo. Níže si odešlete nový odkaz.",

    password: "Nové heslo",
    passwordPlaceholder: "Zadejte nové heslo",
    confirmPassword: "Potvrzení nového hesla",
    confirmPasswordPlaceholder: "Zopakujte nové heslo",
    showPassword: "Zobrazit heslo",
    hidePassword: "Skrýt heslo",
    passwordLocked:
      "Pole se automaticky aktivují po otevření nového platného odkazu.",

    save: "Uložit nové heslo",
    saving: "Ukládám nové heslo...",

    successTitle: "Heslo bylo úspěšně změněno",
    successDescription:
      "Nyní se můžete přihlásit pomocí svého e-mailu a nového hesla.",
    goToLogin: "Přejít na přihlášení",

    resendTitle: "Vyžádat nový resetovací odkaz",
    resendDescription:
      "Zadejte e-mail svého účtu ZEDPERA. Pošleme vám nový bezpečný odkaz.",
    email: "E-mail účtu",
    emailPlaceholder: "např. peter@email.com",
    requestNewLink: "Odeslat nový odkaz",
    requestingNewLink: "Odesílám nový odkaz...",
    resendSuccessTitle: "Nový odkaz byl odeslán",
    resendSuccessDescription:
      "Zkontrolujte doručenou poštu i spam a otevřete poslední přijatý e-mail.",

    missing: "Vyplňte nové heslo i jeho potvrzení.",
    minLength: "Nové heslo musí mít alespoň 8 znaků.",
    mismatch: "Zadaná hesla se neshodují.",
    samePassword: "Nové heslo se musí lišit od původního hesla.",
    weakPassword:
      "Heslo nesplňuje bezpečnostní požadavky. Použijte silnější heslo.",
    invalidEmail: "Zadejte platnou e-mailovou adresu.",
    sessionExpired:
      "Resetovací relace již není platná. Vyžádejte si nový odkaz.",
    networkError:
      "Nepodařilo se připojit k serveru. Zkontrolujte internetové připojení.",
    updateError: "Heslo se nepodařilo změnit. Zkuste to znovu.",
    resendError:
      "Nový resetovací odkaz se nepodařilo odeslat. Zkuste to znovu.",

    requirementLength: "Minimálně 8 znaků",
    requirementMatch: "Obě hesla se shodují",
  },

  en: {
    badge: "SECURE ACCOUNT RECOVERY",
    title: "Set a new password",
    description:
      "Create a new password for your ZEDPERA account. After saving it, you can sign in with your new credentials.",
    backToLogin: "Back to sign in",

    cardEyebrow: "ZEDPERA ACCOUNT SECURITY",
    cardTitle: "Change password",
    cardSubtitle:
      "Use at least 8 characters. We recommend uppercase and lowercase letters, numbers, and symbols.",

    checkingTitle: "Verifying the recovery link",
    checkingDescription:
      "Please wait while we securely prepare the password recovery session.",

    invalidTitle: "The recovery link is no longer valid",
    invalidDescription:
      "The link was already used, expired, or was rejected by Supabase.",
    invalidHint:
      "For security reasons, an expired link cannot change your password. Request a new link below.",

    password: "New password",
    passwordPlaceholder: "Enter a new password",
    confirmPassword: "Confirm new password",
    confirmPasswordPlaceholder: "Repeat the new password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    passwordLocked:
      "The fields will activate automatically after you open a new valid link.",

    save: "Save new password",
    saving: "Saving new password...",

    successTitle: "Your password was changed successfully",
    successDescription:
      "You can now sign in with your email address and new password.",
    goToLogin: "Go to sign in",

    resendTitle: "Request a new recovery link",
    resendDescription:
      "Enter your ZEDPERA account email and we will send a new secure link.",
    email: "Account email",
    emailPlaceholder: "e.g. peter@email.com",
    requestNewLink: "Send a new link",
    requestingNewLink: "Sending a new link...",
    resendSuccessTitle: "A new link was sent",
    resendSuccessDescription:
      "Check your inbox and spam folder, then open the most recent email.",

    missing: "Enter and confirm your new password.",
    minLength: "The new password must contain at least 8 characters.",
    mismatch: "The passwords do not match.",
    samePassword: "The new password must be different from the old password.",
    weakPassword:
      "The password does not meet the security requirements. Use a stronger password.",
    invalidEmail: "Enter a valid email address.",
    sessionExpired:
      "The recovery session is no longer valid. Request a new link.",
    networkError:
      "Unable to connect to the server. Check your internet connection.",
    updateError: "The password could not be changed. Please try again.",
    resendError: "The new recovery link could not be sent. Please try again.",

    requirementLength: "At least 8 characters",
    requirementMatch: "Both passwords match",
  },

  de: {
    badge: "SICHERE KONTOWIEDERHERSTELLUNG",
    title: "Neues Passwort festlegen",
    description:
      "Erstellen Sie ein neues Passwort für Ihr ZEDPERA-Konto. Danach können Sie sich mit den neuen Daten anmelden.",
    backToLogin: "Zurück zur Anmeldung",

    cardEyebrow: "ZEDPERA ACCOUNT SECURITY",
    cardTitle: "Passwort ändern",
    cardSubtitle:
      "Verwenden Sie mindestens 8 Zeichen. Empfohlen sind Groß- und Kleinbuchstaben, Zahlen und Symbole.",

    checkingTitle: "Wiederherstellungslink wird geprüft",
    checkingDescription:
      "Bitte warten Sie, während die sichere Sitzung vorbereitet wird.",

    invalidTitle: "Der Wiederherstellungslink ist nicht mehr gültig",
    invalidDescription:
      "Der Link wurde bereits verwendet, ist abgelaufen oder wurde von Supabase abgelehnt.",
    invalidHint:
      "Aus Sicherheitsgründen kann ein abgelaufener Link das Passwort nicht ändern. Fordern Sie unten einen neuen Link an.",

    password: "Neues Passwort",
    passwordPlaceholder: "Neues Passwort eingeben",
    confirmPassword: "Neues Passwort bestätigen",
    confirmPasswordPlaceholder: "Neues Passwort wiederholen",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort ausblenden",
    passwordLocked:
      "Die Felder werden nach dem Öffnen eines neuen gültigen Links automatisch aktiviert.",

    save: "Neues Passwort speichern",
    saving: "Neues Passwort wird gespeichert...",

    successTitle: "Das Passwort wurde erfolgreich geändert",
    successDescription:
      "Sie können sich jetzt mit Ihrer E-Mail-Adresse und dem neuen Passwort anmelden.",
    goToLogin: "Zur Anmeldung",

    resendTitle: "Neuen Wiederherstellungslink anfordern",
    resendDescription: "Geben Sie die E-Mail-Adresse Ihres ZEDPERA-Kontos ein.",
    email: "E-Mail-Adresse des Kontos",
    emailPlaceholder: "z. B. peter@email.com",
    requestNewLink: "Neuen Link senden",
    requestingNewLink: "Neuer Link wird gesendet...",
    resendSuccessTitle: "Ein neuer Link wurde gesendet",
    resendSuccessDescription:
      "Prüfen Sie Ihren Posteingang und Spam-Ordner und öffnen Sie die neueste E-Mail.",

    missing: "Geben Sie das neue Passwort zweimal ein.",
    minLength: "Das neue Passwort muss mindestens 8 Zeichen enthalten.",
    mismatch: "Die Passwörter stimmen nicht überein.",
    samePassword:
      "Das neue Passwort muss sich vom alten Passwort unterscheiden.",
    weakPassword: "Das Passwort erfüllt die Sicherheitsanforderungen nicht.",
    invalidEmail: "Geben Sie eine gültige E-Mail-Adresse ein.",
    sessionExpired:
      "Die Wiederherstellungssitzung ist nicht mehr gültig. Fordern Sie einen neuen Link an.",
    networkError: "Die Verbindung zum Server konnte nicht hergestellt werden.",
    updateError:
      "Das Passwort konnte nicht geändert werden. Versuchen Sie es erneut.",
    resendError:
      "Der neue Wiederherstellungslink konnte nicht gesendet werden.",

    requirementLength: "Mindestens 8 Zeichen",
    requirementMatch: "Beide Passwörter stimmen überein",
  },

  pl: {
    badge: "BEZPIECZNE ODZYSKIWANIE KONTA",
    title: "Ustaw nowe hasło",
    description:
      "Utwórz nowe hasło do konta ZEDPERA. Po zapisaniu zalogujesz się przy użyciu nowych danych.",
    backToLogin: "Powrót do logowania",

    cardEyebrow: "ZEDPERA ACCOUNT SECURITY",
    cardTitle: "Zmiana hasła",
    cardSubtitle:
      "Użyj co najmniej 8 znaków. Zalecamy wielkie i małe litery, cyfry oraz symbole.",

    checkingTitle: "Sprawdzamy link odzyskiwania",
    checkingDescription:
      "Poczekaj, bezpiecznie przygotowujemy sesję zmiany hasła.",

    invalidTitle: "Link odzyskiwania nie jest już ważny",
    invalidDescription:
      "Link został użyty, wygasł albo został odrzucony przez Supabase.",
    invalidHint:
      "Ze względów bezpieczeństwa wygasły link nie może zmienić hasła. Poproś o nowy link poniżej.",

    password: "Nowe hasło",
    passwordPlaceholder: "Wprowadź nowe hasło",
    confirmPassword: "Potwierdź nowe hasło",
    confirmPasswordPlaceholder: "Powtórz nowe hasło",
    showPassword: "Pokaż hasło",
    hidePassword: "Ukryj hasło",
    passwordLocked:
      "Pola aktywują się automatycznie po otwarciu nowego ważnego linku.",

    save: "Zapisz nowe hasło",
    saving: "Zapisywanie nowego hasła...",

    successTitle: "Hasło zostało pomyślnie zmienione",
    successDescription:
      "Możesz teraz zalogować się za pomocą adresu e-mail i nowego hasła.",
    goToLogin: "Przejdź do logowania",

    resendTitle: "Poproś o nowy link odzyskiwania",
    resendDescription:
      "Wprowadź adres e-mail konta ZEDPERA, a wyślemy nowy bezpieczny link.",
    email: "E-mail konta",
    emailPlaceholder: "np. peter@email.com",
    requestNewLink: "Wyślij nowy link",
    requestingNewLink: "Wysyłanie nowego linku...",
    resendSuccessTitle: "Nowy link został wysłany",
    resendSuccessDescription:
      "Sprawdź skrzynkę odbiorczą i spam, a następnie otwórz najnowszą wiadomość.",

    missing: "Wprowadź nowe hasło i jego potwierdzenie.",
    minLength: "Nowe hasło musi zawierać co najmniej 8 znaków.",
    mismatch: "Hasła nie są takie same.",
    samePassword: "Nowe hasło musi różnić się od starego hasła.",
    weakPassword: "Hasło nie spełnia wymagań bezpieczeństwa.",
    invalidEmail: "Wprowadź prawidłowy adres e-mail.",
    sessionExpired:
      "Sesja odzyskiwania nie jest już ważna. Poproś o nowy link.",
    networkError:
      "Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.",
    updateError: "Nie udało się zmienić hasła. Spróbuj ponownie.",
    resendError: "Nie udało się wysłać nowego linku. Spróbuj ponownie.",

    requirementLength: "Co najmniej 8 znaków",
    requirementMatch: "Oba hasła są takie same",
  },

  hu: {
    badge: "BIZTONSÁGOS FIÓKHELYREÁLLÍTÁS",
    title: "Állítson be új jelszót",
    description:
      "Hozzon létre új jelszót a ZEDPERA-fiókjához. Mentés után az új adatokkal jelentkezhet be.",
    backToLogin: "Vissza a bejelentkezéshez",

    cardEyebrow: "ZEDPERA ACCOUNT SECURITY",
    cardTitle: "Jelszó módosítása",
    cardSubtitle:
      "Használjon legalább 8 karaktert. Nagy- és kisbetűk, számok és szimbólumok használatát javasoljuk.",

    checkingTitle: "A helyreállítási hivatkozás ellenőrzése",
    checkingDescription:
      "Kérjük, várjon, amíg biztonságosan előkészítjük a munkamenetet.",

    invalidTitle: "A helyreállítási hivatkozás már nem érvényes",
    invalidDescription:
      "A hivatkozást már felhasználták, lejárt vagy a Supabase elutasította.",
    invalidHint:
      "Biztonsági okokból lejárt hivatkozással nem módosítható a jelszó. Kérjen újat alább.",

    password: "Új jelszó",
    passwordPlaceholder: "Adja meg az új jelszót",
    confirmPassword: "Új jelszó megerősítése",
    confirmPasswordPlaceholder: "Ismételje meg az új jelszót",
    showPassword: "Jelszó megjelenítése",
    hidePassword: "Jelszó elrejtése",
    passwordLocked:
      "A mezők egy új érvényes hivatkozás megnyitása után automatikusan aktiválódnak.",

    save: "Új jelszó mentése",
    saving: "Új jelszó mentése...",

    successTitle: "A jelszó sikeresen megváltozott",
    successDescription:
      "Most már bejelentkezhet az e-mail-címével és az új jelszavával.",
    goToLogin: "Tovább a bejelentkezéshez",

    resendTitle: "Új helyreállítási hivatkozás kérése",
    resendDescription:
      "Adja meg a ZEDPERA-fiók e-mail-címét, és új biztonságos hivatkozást küldünk.",
    email: "Fiók e-mail-címe",
    emailPlaceholder: "pl. peter@email.com",
    requestNewLink: "Új hivatkozás küldése",
    requestingNewLink: "Új hivatkozás küldése...",
    resendSuccessTitle: "Az új hivatkozást elküldtük",
    resendSuccessDescription:
      "Ellenőrizze a beérkezett és a levélszemét mappát, majd nyissa meg a legújabb e-mailt.",

    missing: "Adja meg és erősítse meg az új jelszót.",
    minLength: "Az új jelszónak legalább 8 karakterből kell állnia.",
    mismatch: "A jelszavak nem egyeznek.",
    samePassword: "Az új jelszónak különböznie kell a régi jelszótól.",
    weakPassword: "A jelszó nem felel meg a biztonsági követelményeknek.",
    invalidEmail: "Adjon meg érvényes e-mail-címet.",
    sessionExpired:
      "A helyreállítási munkamenet már nem érvényes. Kérjen új hivatkozást.",
    networkError:
      "Nem sikerült kapcsolódni a kiszolgálóhoz. Ellenőrizze az internetkapcsolatot.",
    updateError: "A jelszó módosítása sikertelen. Próbálja újra.",
    resendError: "Az új helyreállítási hivatkozást nem sikerült elküldeni.",

    requirementLength: "Legalább 8 karakter",
    requirementMatch: "A két jelszó megegyezik",
  },
};

function normalizeLanguage(value: unknown): AppLanguage {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["cs", "cz", "czech", "čeština", "cestina"].includes(normalized)) {
    return "cs";
  }

  if (
    ["en", "eng", "english", "angličtina", "anglictina"].includes(normalized)
  ) {
    return "en";
  }

  if (
    ["de", "ger", "german", "deutsch", "nemčina", "nemcina"].includes(
      normalized,
    )
  ) {
    return "de";
  }

  if (["pl", "polish", "polski", "poľština", "polstina"].includes(normalized)) {
    return "pl";
  }

  if (
    ["hu", "hungarian", "magyar", "maďarčina", "madarcina"].includes(normalized)
  ) {
    return "hu";
  }

  return "sk";
}

function getSavedLanguage(urlLanguage: string | null): AppLanguage {
  if (urlLanguage) {
    return normalizeLanguage(urlLanguage);
  }

  if (typeof window === "undefined") {
    return "sk";
  }

  return normalizeLanguage(
    window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
      window.localStorage.getItem("zedpera_system_language") ||
      window.localStorage.getItem("zedpera_work_language") ||
      window.localStorage.getItem("zedpera_interface_language") ||
      document.documentElement.lang,
  );
}

function persistLanguage(language: AppLanguage) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  window.localStorage.setItem("zedpera_system_language", language);
  window.localStorage.setItem("zedpera_work_language", language);
  window.localStorage.setItem("zedpera_interface_language", language);

  document.documentElement.lang = language;
  document.documentElement.setAttribute("data-language", language);
  document.documentElement.setAttribute("data-system-language", language);
  document.documentElement.setAttribute("data-work-language", language);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getAuthErrorParts(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      code: "",
      message: "",
      status: 0,
      name: "",
    };
  }

  const authError = error as AuthErrorLike;

  return {
    code: String(authError.code ?? "")
      .trim()
      .toLowerCase(),
    message: String(authError.message ?? "")
      .trim()
      .toLowerCase(),
    status: Number(authError.status ?? 0),
    name: String(authError.name ?? "")
      .trim()
      .toLowerCase(),
  };
}

function isNetworkError(error: unknown) {
  const { name, message } = getAuthErrorParts(error);

  return (
    name === "authretryablefetcherror" ||
    name === "typeerror" ||
    /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(
      message,
    )
  );
}

function mapPasswordError(error: unknown, translations: ResetPasswordCopy) {
  const { code, message, status } = getAuthErrorParts(error);

  if (isNetworkError(error)) {
    return translations.networkError;
  }

  if (
    code === "same_password" ||
    /same password|different from the old password/i.test(message)
  ) {
    return translations.samePassword;
  }

  if (
    code === "weak_password" ||
    /weak password|password should be|password must be/i.test(message)
  ) {
    return translations.weakPassword;
  }

  if (
    code === "session_not_found" ||
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    status === 401 ||
    /session.*missing|session.*expired|jwt.*expired|invalid.*token/i.test(
      message,
    )
  ) {
    return translations.sessionExpired;
  }

  return translations.updateError;
}

function hasUrlAuthError(url: URL) {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

  return Boolean(
    url.searchParams.get("error") ||
    url.searchParams.get("error_code") ||
    url.searchParams.get("error_description") ||
    hash.get("error") ||
    hash.get("error_code") ||
    hash.get("error_description"),
  );
}

function hasRecoveryPayload(url: URL) {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

  return Boolean(
    url.searchParams.get("code") ||
    url.searchParams.get("token_hash") ||
    url.searchParams.get("type") === "recovery" ||
    hash.get("access_token") ||
    hash.get("refresh_token") ||
    hash.get("type") === "recovery",
  );
}

function cleanRecoveryUrl(language: AppLanguage) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);

  for (const parameter of [
    "code",
    "token_hash",
    "type",
    "error",
    "error_code",
    "error_description",
  ]) {
    url.searchParams.delete(parameter);
  }

  url.searchParams.set("lang", language);
  url.hash = "";

  const search = url.searchParams.toString();

  window.history.replaceState(
    {},
    document.title,
    `${url.pathname}${search ? `?${search}` : ""}`,
  );
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function Requirement({
  complete,
  children,
}: {
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-xs font-bold transition ${
        complete ? "text-emerald-300" : "text-slate-500"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
          complete
            ? "border-emerald-400/40 bg-emerald-400/15"
            : "border-white/10 bg-white/[0.04]"
        }`}
      >
        {complete ? <Check className="h-3 w-3" /> : null}
      </span>
      {children}
    </div>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLanguage } = useLanguage();

  const currentLanguage = useMemo(
    () => getSavedLanguage(searchParams.get("lang")),
    [searchParams],
  );

  const t = copy[currentLanguage];

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [resendState, setResendState] = useState<ResendState>("idle");

  const [passwordError, setPasswordError] = useState("");
  const [resendError, setResendError] = useState("");

  const mountedRef = useRef(true);
  const initializationStartedRef = useRef(false);
  const recoveryReadyRef = useRef(false);

  /*
   * Recovery secrets are kept only in memory after the URL is cleaned.
   * They are deliberately verified only after the user submits the new
   * password. This prevents email security scanners from consuming a
   * single-use recovery token merely by opening or previewing the link.
   */
  const pendingTokenHashRef = useRef<string | null>(null);
  const pendingCodeRef = useRef<string | null>(null);
  const pendingAccessTokenRef = useRef<string | null>(null);
  const pendingRefreshTokenRef = useRef<string | null>(null);

  const passwordLengthValid = password.length >= 8;
  const passwordsMatch =
    Boolean(password) &&
    Boolean(confirmPassword) &&
    password === confirmPassword;

  const activateRecovery = useCallback(() => {
    if (!mountedRef.current) return;

    recoveryReadyRef.current = true;

    window.sessionStorage.setItem(RECOVERY_MARKER_KEY, "true");

    setPasswordError("");
    setRecoveryState("ready");
    cleanRecoveryUrl(currentLanguage);
  }, [currentLanguage]);

  useEffect(() => {
    persistLanguage(currentLanguage);
    setLanguage(currentLanguage);
  }, [currentLanguage, setLanguage]);

  useEffect(() => {
    mountedRef.current = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (event === "PASSWORD_RECOVERY" && session?.user) {
        activateRecovery();
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [activateRecovery, supabase]);

  useEffect(() => {
    if (initializationStartedRef.current) return;

    initializationStartedRef.current = true;

    const initializeRecovery = async () => {
      const url = new URL(window.location.href);
      const payloadPresent = hasRecoveryPayload(url);
      const storedRecoveryMarker =
        window.sessionStorage.getItem(RECOVERY_MARKER_KEY) === "true";

      try {
        setRecoveryState("checking");
        setPasswordError("");

        /*
         * Supabase explicitly returned an authentication error, for example
         * otp_expired. Only this case is immediately presented as invalid.
         */
        if (hasUrlAuthError(url)) {
          window.sessionStorage.removeItem(RECOVERY_MARKER_KEY);
          setRecoveryState("invalid");
          cleanRecoveryUrl(currentLanguage);
          return;
        }

        const tokenHash = url.searchParams.get("token_hash");
        const code = url.searchParams.get("code");

        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        /*
         * Do not verify or exchange single-use values during initial page
         * loading. Email providers and security products can prefetch links.
         * Store the values in memory, remove them from the address bar and
         * show the password fields immediately. Verification happens only
         * when the user submits the form.
         */
        if (tokenHash) {
          pendingTokenHashRef.current = tokenHash;
          setRecoveryState("ready");
          cleanRecoveryUrl(currentLanguage);
          return;
        }

        if (code) {
          pendingCodeRef.current = code;
          setRecoveryState("ready");
          cleanRecoveryUrl(currentLanguage);
          return;
        }

        if (accessToken && refreshToken) {
          pendingAccessTokenRef.current = accessToken;
          pendingRefreshTokenRef.current = refreshToken;
          setRecoveryState("ready");
          cleanRecoveryUrl(currentLanguage);
          return;
        }

        /*
         * The Supabase client may already have completed the recovery flow
         * before this component was mounted. Accept an existing session only
         * when it is accompanied by our recovery marker.
         */
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (initialSession?.user && storedRecoveryMarker) {
          activateRecovery();
          return;
        }

        /*
         * Give PASSWORD_RECOVERY and automatic implicit-flow processing a
         * short opportunity to finish. A normal logged-in session without a
         * recovery payload or marker is intentionally not accepted here.
         */
        for (let attempt = 0; attempt < 8; attempt += 1) {
          if (recoveryReadyRef.current || !mountedRef.current) {
            return;
          }

          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.user && (payloadPresent || storedRecoveryMarker)) {
            activateRecovery();
            return;
          }

          await wait(250);
        }

        window.sessionStorage.removeItem(RECOVERY_MARKER_KEY);
        setRecoveryState("invalid");
        cleanRecoveryUrl(currentLanguage);
      } catch {
        if (!mountedRef.current) return;

        window.sessionStorage.removeItem(RECOVERY_MARKER_KEY);
        setRecoveryState("invalid");
        cleanRecoveryUrl(currentLanguage);
      }
    };

    void initializeRecovery();
  }, [activateRecovery, currentLanguage, supabase]);

  const saveNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (recoveryState !== "ready") return;

    setPasswordError("");

    if (!password || !confirmPassword) {
      setPasswordError(t.missing);
      return;
    }

    if (password.length < 8) {
      setPasswordError(t.minLength);
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError(t.mismatch);
      return;
    }

    try {
      setRecoveryState("saving");

      let {
        data: { session },
      } = await supabase.auth.getSession();

      /*
       * Establish the temporary recovery session only after the real user
       * submits the form. This is the critical protection against link
       * scanners consuming a one-time recovery link before the user does.
       */
      if (!session?.user && pendingTokenHashRef.current) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: pendingTokenHashRef.current,
          type: "recovery",
        });

        if (error || !data.session?.user) {
          pendingTokenHashRef.current = null;
          window.sessionStorage.removeItem(RECOVERY_MARKER_KEY);
          setPasswordError(t.sessionExpired);
          setRecoveryState("invalid");
          return;
        }

        session = data.session;
        pendingTokenHashRef.current = null;
      }

      if (!session?.user && pendingCodeRef.current) {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(
            pendingCodeRef.current,
          );

        if (error || !data.session?.user) {
          pendingCodeRef.current = null;
          window.sessionStorage.removeItem(RECOVERY_MARKER_KEY);
          setPasswordError(t.sessionExpired);
          setRecoveryState("invalid");
          return;
        }

        session = data.session;
        pendingCodeRef.current = null;
      }

      if (
        !session?.user &&
        pendingAccessTokenRef.current &&
        pendingRefreshTokenRef.current
      ) {
        const { data, error } = await supabase.auth.setSession({
          access_token: pendingAccessTokenRef.current,
          refresh_token: pendingRefreshTokenRef.current,
        });

        if (error || !data.session?.user) {
          pendingAccessTokenRef.current = null;
          pendingRefreshTokenRef.current = null;
          window.sessionStorage.removeItem(RECOVERY_MARKER_KEY);
          setPasswordError(t.sessionExpired);
          setRecoveryState("invalid");
          return;
        }

        session = data.session;
        pendingAccessTokenRef.current = null;
        pendingRefreshTokenRef.current = null;
      }

      if (!session?.user) {
        window.sessionStorage.removeItem(RECOVERY_MARKER_KEY);
        setPasswordError(t.sessionExpired);
        setRecoveryState("invalid");
        return;
      }

      window.sessionStorage.setItem(RECOVERY_MARKER_KEY, "true");

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        const message = mapPasswordError(error, t);
        const { code, status } = getAuthErrorParts(error);

        setPasswordError(message);

        if (
          code === "session_not_found" ||
          code === "refresh_token_not_found" ||
          code === "refresh_token_already_used" ||
          status === 401
        ) {
          window.sessionStorage.removeItem(RECOVERY_MARKER_KEY);
          setRecoveryState("invalid");
        } else {
          setRecoveryState("ready");
        }

        return;
      }

      window.sessionStorage.removeItem(RECOVERY_MARKER_KEY);

      setPassword("");
      setConfirmPassword("");
      setRecoveryState("success");

      await supabase.auth.signOut({
        scope: "local",
      });
    } catch (error: unknown) {
      setPasswordError(mapPasswordError(error, t));
      setRecoveryState("ready");
    }
  };

  const requestNewLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanEmail = normalizeEmail(email);

    setResendError("");

    if (!isValidEmail(cleanEmail)) {
      setResendError(t.invalidEmail);
      return;
    }

    try {
      setResendState("sending");

      const redirectTo =
        `${window.location.origin}/reset-password` + `?lang=${currentLanguage}`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        setResendError(isNetworkError(error) ? t.networkError : t.resendError);
        setResendState("idle");
        return;
      }

      setEmail(cleanEmail);
      setResendState("sent");
    } catch (error: unknown) {
      setResendError(isNetworkError(error) ? t.networkError : t.resendError);
      setResendState("idle");
    }
  };

  const goToLogin = () => {
    router.replace(`/login?password=changed&lang=${currentLanguage}`);
  };

  return (
    <main className="min-h-screen bg-[#070313] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1440px] overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#09061a] shadow-[0_30px_100px_rgba(0,0,0,0.45)] lg:grid-cols-[0.88fr_1.12fr]">
        <aside className="relative hidden overflow-hidden border-r border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(126,34,206,0.30),transparent_42%),linear-gradient(145deg,#19042e_0%,#080516_55%,#050814_100%)] p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-fuchsia-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-purple-300/20 bg-purple-300/10 px-5 py-3 text-xs font-black tracking-[0.26em] text-purple-100">
              <ShieldCheck className="h-5 w-5" />
              {t.badge}
            </div>

            <h1 className="mt-14 max-w-xl text-6xl font-black leading-[1.02] tracking-[-0.04em] xl:text-7xl">
              {t.title}
            </h1>

            <p className="mt-8 max-w-xl text-xl font-semibold leading-9 text-slate-300">
              {t.description}
            </p>
          </div>

          <div className="relative z-10 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-200">
                <Lock className="h-6 w-6" />
              </div>

              <div>
                <p className="font-black text-white">{t.cardTitle}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                  {t.cardSubtitle}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="relative flex items-center justify-center p-5 sm:p-8 lg:p-10 xl:p-14">
          <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl" />

          <div className="relative w-full max-w-2xl">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
              <Link
                href={`/login?lang=${currentLanguage}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-purple-300/25 hover:bg-white/[0.09] hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.backToLogin}
              </Link>

              <div className="text-right">
                <p className="text-[10px] font-black tracking-[0.24em] text-purple-300">
                  {t.cardEyebrow}
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#0d0a20]/95 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7 lg:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-950/40">
                  <KeyRound className="h-7 w-7" />
                </div>

                <div>
                  <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                    {t.cardTitle}
                  </h2>
                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-400 sm:text-base">
                    {t.cardSubtitle}
                  </p>
                </div>
              </div>

              {recoveryState === "checking" ? (
                <div className="mt-7 rounded-2xl border border-purple-400/20 bg-purple-500/10 p-5">
                  <div className="flex items-start gap-3">
                    <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-purple-300" />

                    <div>
                      <p className="font-black text-purple-100">
                        {t.checkingTitle}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-purple-100/70">
                        {t.checkingDescription}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {recoveryState === "invalid" ? (
                <div className="mt-7 rounded-2xl border border-amber-400/20 bg-amber-500/[0.08] p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />

                    <div>
                      <p className="font-black text-amber-100">
                        {t.invalidTitle}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-amber-100/75">
                        {t.invalidDescription}
                      </p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                        {t.invalidHint}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {recoveryState === "ready" || recoveryState === "saving" ? (
                <form
                  onSubmit={saveNewPassword}
                  className="mt-7 space-y-5"
                  noValidate
                >
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-slate-200">
                      {t.password}
                    </span>

                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 transition focus-within:border-purple-400/60 focus-within:ring-4 focus-within:ring-purple-500/10">
                      <Lock className="h-5 w-5 shrink-0 text-slate-500" />

                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder={t.passwordPlaceholder}
                        disabled={recoveryState === "saving"}
                        className="min-w-0 flex-1 bg-transparent text-base font-bold text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        disabled={recoveryState === "saving"}
                        aria-label={
                          showPassword ? t.hidePassword : t.showPassword
                        }
                        className="rounded-xl p-2 text-slate-500 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-slate-200">
                      {t.confirmPassword}
                    </span>

                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 transition focus-within:border-purple-400/60 focus-within:ring-4 focus-within:ring-purple-500/10">
                      <Lock className="h-5 w-5 shrink-0 text-slate-500" />

                      <input
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder={t.confirmPasswordPlaceholder}
                        disabled={recoveryState === "saving"}
                        className="min-w-0 flex-1 bg-transparent text-base font-bold text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((value) => !value)
                        }
                        disabled={recoveryState === "saving"}
                        aria-label={
                          showConfirmPassword ? t.hidePassword : t.showPassword
                        }
                        className="rounded-xl p-2 text-slate-500 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Requirement complete={passwordLengthValid}>
                      {t.requirementLength}
                    </Requirement>

                    <Requirement complete={passwordsMatch}>
                      {t.requirementMatch}
                    </Requirement>
                  </div>

                  {passwordError ? (
                    <div
                      role="alert"
                      className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold leading-6 text-red-100"
                    >
                      {passwordError}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={recoveryState === "saving"}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 text-base font-black text-white shadow-xl shadow-purple-950/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {recoveryState === "saving" ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t.saving}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-5 w-5" />
                        {t.save}
                      </>
                    )}
                  </button>
                </form>
              ) : null}

              {recoveryState === "invalid" ? (
                <div className="mt-7 border-t border-white/10 pt-7">
                  {resendState === "sent" ? (
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />

                        <div>
                          <p className="font-black text-emerald-100">
                            {t.resendSuccessTitle}
                          </p>
                          <p className="mt-1 text-sm font-semibold leading-6 text-emerald-100/75">
                            {t.resendSuccessDescription}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form
                      onSubmit={requestNewLink}
                      className="space-y-4"
                      noValidate
                    >
                      <div>
                        <h3 className="text-lg font-black text-white">
                          {t.resendTitle}
                        </h3>
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-400">
                          {t.resendDescription}
                        </p>
                      </div>

                      <label className="block">
                        <span className="mb-2 block text-sm font-black text-slate-200">
                          {t.email}
                        </span>

                        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 transition focus-within:border-purple-400/60 focus-within:ring-4 focus-within:ring-purple-500/10">
                          <Mail className="h-5 w-5 shrink-0 text-slate-500" />

                          <input
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            type="email"
                            autoComplete="email"
                            placeholder={t.emailPlaceholder}
                            disabled={resendState === "sending"}
                            className="min-w-0 flex-1 bg-transparent text-base font-bold text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed"
                          />
                        </div>
                      </label>

                      {resendError ? (
                        <div
                          role="alert"
                          className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold leading-6 text-red-100"
                        >
                          {resendError}
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={resendState === "sending"}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-purple-300/20 bg-purple-500/15 px-6 py-4 text-sm font-black text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {resendState === "sending" ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            {t.requestingNewLink}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-5 w-5" />
                            {t.requestNewLink}
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              ) : null}

              {recoveryState === "success" ? (
                <div className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />

                    <div>
                      <p className="text-lg font-black text-emerald-100">
                        {t.successTitle}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-emerald-100/75">
                        {t.successDescription}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={goToLogin}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-black !text-black shadow-lg shadow-black/20 transition hover:bg-slate-100 hover:!text-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
                    style={{ color: "#000000" }}
                  >
                    <ArrowLeft className="h-4 w-4 !text-black" aria-hidden="true" />
                    <span className="!text-black" style={{ color: "#000000" }}>
                      {t.goToLogin}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#070313] text-white">
          <Loader2 className="h-8 w-8 animate-spin text-purple-300" />
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
