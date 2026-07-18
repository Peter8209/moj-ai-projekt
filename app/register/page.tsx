'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type AppLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

type RegisterCopy = {
  title: string;
  subtitle: string;
  description: string;
  selectedPlan: string;
  freePlan: string;
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
  missingFields: string;
  invalidEmail: string;
  weakPassword: string;
  passwordMismatch: string;
  termsRequired: string;
  registrationFailed: string;
  confirmationTitle: string;
  confirmationText: string;
  confirmationDetail: string;
  confirmationDisabled: string;
};

const REGISTER_COPY: Record<AppLanguage, RegisterCopy> = {
  sk: {
    title: 'Registrácia',
    subtitle: 'Vytvorenie účtu ZEDPERA',
    description:
      'Vytvorte si používateľský účet. Bezplatný účet bude mať štandardné FREE oprávnenia, nie administrátorský prístup.',
    selectedPlan: 'Vybraný balík',
    freePlan: 'FREE verzia',
    fullName: 'Meno a priezvisko',
    fullNamePlaceholder: 'Zadajte meno a priezvisko',
    email: 'E-mail',
    emailPlaceholder: 'napr. peter@email.com',
    password: 'Heslo',
    passwordPlaceholder: 'Minimálne 8 znakov',
    confirmPassword: 'Potvrdenie hesla',
    confirmPasswordPlaceholder: 'Zadajte heslo znova',
    showPassword: 'Zobraziť heslo',
    hidePassword: 'Skryť heslo',
    termsPrefix: 'Súhlasím s ',
    termsLink: 'obchodnými podmienkami',
    termsSuffix: ' a pravidlami používania služby.',
    privacyPrefix: 'Potvrdzujem, že som sa oboznámil/a so ',
    privacyLink: 'zásadami ochrany osobných údajov',
    privacySuffix: '.',
    submit: 'Registrovať sa',
    submitting: 'Vytváram účet...',
    alreadyAccount: 'Už máte účet?',
    login: 'Prihlásiť sa',
    backHome: 'Späť na úvodnú stránku',
    missingFields: 'Vyplňte všetky povinné polia.',
    invalidEmail: 'Zadajte platnú e-mailovú adresu.',
    weakPassword: 'Heslo musí mať aspoň 8 znakov.',
    passwordMismatch: 'Zadané heslá sa nezhodujú.',
    termsRequired:
      'Pre registráciu je potrebné samostatne potvrdiť obchodné podmienky aj ochranu osobných údajov.',
    registrationFailed: 'Registrácia sa nepodarila. Skúste to znova.',
    confirmationTitle: 'Skontrolujte si e-mail',
    confirmationText:
      'Na zadanú e-mailovú adresu sme odoslali potvrdzujúci odkaz. Účet sa aktivuje až po jeho otvorení.',
    confirmationDetail:
      'Po potvrdení e-mailu budete presmerovaný/á do nového používateľského rozhrania. Skontrolujte aj priečinok Spam alebo Nevyžiadaná pošta.',
    confirmationDisabled:
      'Účet bol vytvorený, ale Supabase vrátil okamžitú reláciu. Zapnite povinné potvrdenie e-mailu v Supabase Auth a registráciu zopakujte s novou adresou.',
  },
  cs: {
    title: 'Registrace',
    subtitle: 'Vytvoření účtu ZEDPERA',
    description:
      'Vytvořte si uživatelský účet. Bezplatný účet bude mít standardní FREE oprávnění, nikoli administrátorský přístup.',
    selectedPlan: 'Vybraný balíček',
    freePlan: 'FREE verze',
    fullName: 'Jméno a příjmení',
    fullNamePlaceholder: 'Zadejte jméno a příjmení',
    email: 'E-mail',
    emailPlaceholder: 'např. peter@email.com',
    password: 'Heslo',
    passwordPlaceholder: 'Minimálně 8 znaků',
    confirmPassword: 'Potvrzení hesla',
    confirmPasswordPlaceholder: 'Zadejte heslo znovu',
    showPassword: 'Zobrazit heslo',
    hidePassword: 'Skrýt heslo',
    termsPrefix: 'Souhlasím s ',
    termsLink: 'obchodními podmínkami',
    termsSuffix: ' a pravidly používání služby.',
    privacyPrefix: 'Potvrzuji, že jsem se seznámil/a se ',
    privacyLink: 'zásadami ochrany osobních údajů',
    privacySuffix: '.',
    submit: 'Registrovat se',
    submitting: 'Vytvářím účet...',
    alreadyAccount: 'Už máte účet?',
    login: 'Přihlásit se',
    backHome: 'Zpět na úvodní stránku',
    missingFields: 'Vyplňte všechna povinná pole.',
    invalidEmail: 'Zadejte platnou e-mailovou adresu.',
    weakPassword: 'Heslo musí mít alespoň 8 znaků.',
    passwordMismatch: 'Zadaná hesla se neshodují.',
    termsRequired:
      'Pro registraci je nutné samostatně potvrdit obchodní podmínky i ochranu osobních údajů.',
    registrationFailed: 'Registrace se nezdařila. Zkuste to znovu.',
    confirmationTitle: 'Zkontrolujte svůj e-mail',
    confirmationText:
      'Na zadanou e-mailovou adresu jsme odeslali potvrzovací odkaz. Účet se aktivuje až po jeho otevření.',
    confirmationDetail:
      'Po potvrzení e-mailu budete přesměrováni do nového uživatelského rozhraní. Zkontrolujte také složku Spam.',
    confirmationDisabled:
      'Účet byl vytvořen, ale Supabase vrátil okamžitou relaci. Zapněte povinné potvrzení e-mailu v Supabase Auth.',
  },
  en: {
    title: 'Registration',
    subtitle: 'Create a ZEDPERA account',
    description:
      'Create a user account. A free account receives standard FREE permissions, never administrator access.',
    selectedPlan: 'Selected plan',
    freePlan: 'FREE plan',
    fullName: 'Full name',
    fullNamePlaceholder: 'Enter your full name',
    email: 'Email',
    emailPlaceholder: 'e.g. peter@email.com',
    password: 'Password',
    passwordPlaceholder: 'At least 8 characters',
    confirmPassword: 'Confirm password',
    confirmPasswordPlaceholder: 'Enter the password again',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    termsPrefix: 'I agree to the ',
    termsLink: 'terms and conditions',
    termsSuffix: ' and service rules.',
    privacyPrefix: 'I confirm that I have read the ',
    privacyLink: 'privacy policy',
    privacySuffix: '.',
    submit: 'Create account',
    submitting: 'Creating account...',
    alreadyAccount: 'Already have an account?',
    login: 'Sign in',
    backHome: 'Back to the home page',
    missingFields: 'Complete all required fields.',
    invalidEmail: 'Enter a valid email address.',
    weakPassword: 'The password must contain at least 8 characters.',
    passwordMismatch: 'The passwords do not match.',
    termsRequired:
      'You must separately accept the terms and the privacy policy.',
    registrationFailed: 'Registration failed. Please try again.',
    confirmationTitle: 'Check your email',
    confirmationText:
      'We sent a confirmation link to your email address. Your account becomes active only after you open it.',
    confirmationDetail:
      'After confirming your email, you will be redirected to the new user interface. Also check your Spam folder.',
    confirmationDisabled:
      'The account was created, but Supabase returned an immediate session. Enable mandatory email confirmation in Supabase Auth.',
  },
  de: {
    title: 'Registrierung',
    subtitle: 'ZEDPERA-Konto erstellen',
    description:
      'Erstellen Sie ein Benutzerkonto. Ein kostenloses Konto erhält normale FREE-Rechte und niemals Administratorzugriff.',
    selectedPlan: 'Gewähltes Paket',
    freePlan: 'FREE-Version',
    fullName: 'Vor- und Nachname',
    fullNamePlaceholder: 'Vor- und Nachname eingeben',
    email: 'E-Mail',
    emailPlaceholder: 'z. B. peter@email.com',
    password: 'Passwort',
    passwordPlaceholder: 'Mindestens 8 Zeichen',
    confirmPassword: 'Passwort bestätigen',
    confirmPasswordPlaceholder: 'Passwort erneut eingeben',
    showPassword: 'Passwort anzeigen',
    hidePassword: 'Passwort ausblenden',
    termsPrefix: 'Ich akzeptiere die ',
    termsLink: 'Geschäftsbedingungen',
    termsSuffix: ' und Nutzungsregeln.',
    privacyPrefix: 'Ich bestätige, dass ich die ',
    privacyLink: 'Datenschutzbestimmungen',
    privacySuffix: ' gelesen habe.',
    submit: 'Registrieren',
    submitting: 'Konto wird erstellt...',
    alreadyAccount: 'Sie haben bereits ein Konto?',
    login: 'Anmelden',
    backHome: 'Zurück zur Startseite',
    missingFields: 'Füllen Sie alle Pflichtfelder aus.',
    invalidEmail: 'Geben Sie eine gültige E-Mail-Adresse ein.',
    weakPassword: 'Das Passwort muss mindestens 8 Zeichen enthalten.',
    passwordMismatch: 'Die Passwörter stimmen nicht überein.',
    termsRequired:
      'Die Geschäftsbedingungen und der Datenschutz müssen separat bestätigt werden.',
    registrationFailed: 'Die Registrierung ist fehlgeschlagen.',
    confirmationTitle: 'Prüfen Sie Ihre E-Mail',
    confirmationText:
      'Wir haben einen Bestätigungslink gesendet. Das Konto wird erst nach dem Öffnen aktiviert.',
    confirmationDetail:
      'Nach der Bestätigung werden Sie zur neuen Benutzeroberfläche weitergeleitet. Prüfen Sie auch den Spam-Ordner.',
    confirmationDisabled:
      'Supabase hat sofort eine Sitzung erstellt. Aktivieren Sie die verpflichtende E-Mail-Bestätigung in Supabase Auth.',
  },
  pl: {
    title: 'Rejestracja',
    subtitle: 'Utworzenie konta ZEDPERA',
    description:
      'Utwórz konto użytkownika. Konto bezpłatne otrzymuje standardowe uprawnienia FREE, nigdy dostęp administratora.',
    selectedPlan: 'Wybrany pakiet',
    freePlan: 'Wersja FREE',
    fullName: 'Imię i nazwisko',
    fullNamePlaceholder: 'Wpisz imię i nazwisko',
    email: 'E-mail',
    emailPlaceholder: 'np. peter@email.com',
    password: 'Hasło',
    passwordPlaceholder: 'Co najmniej 8 znaków',
    confirmPassword: 'Potwierdź hasło',
    confirmPasswordPlaceholder: 'Wpisz hasło ponownie',
    showPassword: 'Pokaż hasło',
    hidePassword: 'Ukryj hasło',
    termsPrefix: 'Akceptuję ',
    termsLink: 'warunki handlowe',
    termsSuffix: ' i zasady korzystania z usługi.',
    privacyPrefix: 'Potwierdzam zapoznanie się z ',
    privacyLink: 'polityką prywatności',
    privacySuffix: '.',
    submit: 'Zarejestruj się',
    submitting: 'Tworzenie konta...',
    alreadyAccount: 'Masz już konto?',
    login: 'Zaloguj się',
    backHome: 'Powrót do strony głównej',
    missingFields: 'Wypełnij wszystkie wymagane pola.',
    invalidEmail: 'Wpisz prawidłowy adres e-mail.',
    weakPassword: 'Hasło musi mieć co najmniej 8 znaków.',
    passwordMismatch: 'Hasła nie są zgodne.',
    termsRequired:
      'Warunki handlowe i polityka prywatności wymagają osobnego potwierdzenia.',
    registrationFailed: 'Rejestracja nie powiodła się.',
    confirmationTitle: 'Sprawdź pocztę e-mail',
    confirmationText:
      'Wysłaliśmy link potwierdzający. Konto zostanie aktywowane dopiero po jego otwarciu.',
    confirmationDetail:
      'Po potwierdzeniu nastąpi przekierowanie do nowego interfejsu. Sprawdź także folder Spam.',
    confirmationDisabled:
      'Supabase utworzył natychmiastową sesję. Włącz obowiązkowe potwierdzenie e-mail w Supabase Auth.',
  },
  hu: {
    title: 'Regisztráció',
    subtitle: 'ZEDPERA-fiók létrehozása',
    description:
      'Hozzon létre felhasználói fiókot. Az ingyenes fiók normál FREE jogosultságokat kap, adminisztrátori hozzáférést soha.',
    selectedPlan: 'Kiválasztott csomag',
    freePlan: 'FREE csomag',
    fullName: 'Teljes név',
    fullNamePlaceholder: 'Adja meg a teljes nevét',
    email: 'E-mail',
    emailPlaceholder: 'pl. peter@email.com',
    password: 'Jelszó',
    passwordPlaceholder: 'Legalább 8 karakter',
    confirmPassword: 'Jelszó megerősítése',
    confirmPasswordPlaceholder: 'Adja meg újra a jelszót',
    showPassword: 'Jelszó megjelenítése',
    hidePassword: 'Jelszó elrejtése',
    termsPrefix: 'Elfogadom az ',
    termsLink: 'üzleti feltételeket',
    termsSuffix: ' és a szolgáltatás szabályait.',
    privacyPrefix: 'Kijelentem, hogy elolvastam az ',
    privacyLink: 'adatvédelmi szabályzatot',
    privacySuffix: '.',
    submit: 'Regisztráció',
    submitting: 'Fiók létrehozása...',
    alreadyAccount: 'Már van fiókja?',
    login: 'Bejelentkezés',
    backHome: 'Vissza a kezdőlapra',
    missingFields: 'Töltse ki az összes kötelező mezőt.',
    invalidEmail: 'Adjon meg érvényes e-mail-címet.',
    weakPassword: 'A jelszónak legalább 8 karakterből kell állnia.',
    passwordMismatch: 'A jelszavak nem egyeznek.',
    termsRequired:
      'Az üzleti feltételeket és az adatvédelmet külön is el kell fogadni.',
    registrationFailed: 'A regisztráció sikertelen.',
    confirmationTitle: 'Ellenőrizze az e-mailjét',
    confirmationText:
      'Megerősítő linket küldtünk. A fiók csak a link megnyitása után aktiválódik.',
    confirmationDetail:
      'A megerősítés után az új felületre irányítjuk. Ellenőrizze a Spam mappát is.',
    confirmationDisabled:
      'A Supabase azonnali munkamenetet adott vissza. Kapcsolja be a kötelező e-mail-megerősítést.',
  },
};

function normalizeLanguage(value: string | null): AppLanguage {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'cs' || normalized === 'cz') return 'cs';
  if (normalized === 'en') return 'en';
  if (normalized === 'de') return 'de';
  if (normalized === 'pl') return 'pl';
  if (normalized === 'hu') return 'hu';
  return 'sk';
}

function normalizePlan(value: string | null): string {
  const plan = String(value || '').trim();
  const allowed = new Set([
    'free',
    'seminar-work',
    'bachelor-thesis',
    'master-thesis',
  ]);

  return allowed.has(plan) ? plan : 'free';
}

function getPlanLabel(plan: string, copy: RegisterCopy): string {
  if (plan === 'seminar-work') return 'Seminárna práca';
  if (plan === 'bachelor-thesis') return 'Bakalárska práca';
  if (plan === 'master-thesis') return 'Diplomová / magisterská práca';
  return copy.freePlan;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const REGISTRATION_STORAGE_KEYS = [
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
  'zedpera_active_user_id',
  'zedpera_user_id',
  'zedpera_user_email',
  'zedpera_email',
  'user_email',
  'email',
  'zedpera_user_name',
  'zedpera_user_role',
  'zedpera_user_plan',
  'zedpera_selected_plan',
  'zedpera_is_logged_in',
  'zedpera_admin_free',
  'zedpera_is_admin',
  'zedpera_admin_mode',
  'admin_mode',
] as const;

function expireRegistrationLegacyCookies() {
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
 * Vyčistí údaje predchádzajúceho účtu bez odstránenia jazyka a vzhľadu.
 * Volá sa až po úspešnom vytvorení nového používateľa.
 */
function clearPreviousAccountStorageAfterRegistration() {
  if (typeof window === 'undefined') return;

  for (const key of REGISTRATION_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }

  expireRegistrationLegacyCookies();
}

export default function RegisterPage() {
  const router = useRouter();

  const [language, setLanguage] = useState<AppLanguage>('sk');
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [configurationWarning, setConfigurationWarning] = useState('');

  const copy = REGISTER_COPY[language];
  const planLabel = useMemo(
    () => getPlanLabel(selectedPlan, copy),
    [copy, selectedPlan],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const nextLanguage = normalizeLanguage(
      params.get('lang') ||
        window.localStorage.getItem('zedpera_language') ||
        document.documentElement.lang,
    );
    const nextPlan = normalizePlan(params.get('plan'));

    setLanguage(nextLanguage);
    setSelectedPlan(nextPlan);

    document.documentElement.lang = nextLanguage;
    window.localStorage.setItem('zedpera_language', nextLanguage);
  }, []);

  async function registerUser() {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    setError('');
    setConfigurationWarning('');

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

    try {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();

      const origin = window.location.origin;
      const callbackNext =
        selectedPlan === 'free'
          ? `/login?registration=confirmed&lang=${language}`
          : `/login?registration=confirmed&plan=${encodeURIComponent(selectedPlan)}&lang=${language}`;
      const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(callbackNext)}`;

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
            registration_source: 'zedpera-web',
            terms_accepted_at: new Date().toISOString(),
            privacy_accepted_at: new Date().toISOString(),
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!data.user?.id) {
        throw new Error(copy.registrationFailed);
      }

      clearPreviousAccountStorageAfterRegistration();

      // Pri zapnutom potvrdení e-mailu Supabase nevráti aktívnu session.
      // Ak ju vráti, konfigurácia projektu povoľuje okamžité prihlásenie.
      if (data.session) {
        await supabase.auth.signOut();
        setConfigurationWarning(copy.confirmationDisabled);
      }

      setConfirmationEmail(cleanEmail);
      setPassword('');
      setConfirmPassword('');
    } catch (registrationError: unknown) {
      const message =
        registrationError instanceof Error
          ? registrationError.message
          : copy.registrationFailed;

      setError(message || copy.registrationFailed);
    } finally {
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

            <h2 className="mt-8 text-3xl font-black leading-tight">
              ZEDPERA
            </h2>

            <p className="mt-4 text-base font-bold leading-7 text-slate-300">
              Bezpečná registrácia používateľa s potvrdením e-mailu a oddelenými oprávneniami účtu.
            </p>

            <div className="mt-8 space-y-4">
              {[
                'FREE účet bez administrátorských oprávnení',
                'Potvrdenie vlastníctva e-mailovej adresy',
                'Oddelené práce a história každého používateľa',
                'Serverové riadenie balíkov a limitov',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm font-bold text-slate-200">
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
              <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm font-bold leading-6 text-red-100">
                {error}
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-200">
                  {copy.fullName}
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 focus-within:border-violet-400/60">
                  <User size={18} className="text-slate-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
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
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
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
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      placeholder={copy.passwordPlaceholder}
                      className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? copy.hidePassword : copy.showPassword}
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
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void registerUser();
                      }}
                      autoComplete="new-password"
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
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(event) => setPrivacyAccepted(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-violet-600"
                  />
                  <div className="text-sm font-semibold leading-6 text-slate-300">
                    <label htmlFor="privacy-accepted" className="cursor-pointer">
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
                    <label htmlFor="privacy-accepted" className="cursor-pointer">
                      {copy.privacySuffix}
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void registerUser()}
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
            </div>

            <div className="mt-6 text-center text-sm font-semibold text-slate-400">
              {copy.alreadyAccount}{' '}
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
