'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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

const ADMIN_EMAIL = 'admin@zedpera.com';
const ADMIN_PASSWORD = 'admin123';

type AppLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

const LANGUAGE_STORAGE_KEY = 'zedpera_language';

const loginCopy: Record<
  AppLanguage,
  {
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
    demoLogin: string;
    demoLoading: string;
    missingFields: string;
    loginFailed: string;
    genericError: string;
    passwordChanged: string;
  }
> = {
  sk: {
    title: 'Prihlásenie',
    subtitle: 'ZEDPERA účet',
    description: 'Prihlás sa do používateľského alebo admin menu ZEDPERA.',
    email: 'E-mail',
    emailPlaceholder: 'napr. peter@email.com',
    password: 'Heslo',
    passwordPlaceholder: 'Zadaj heslo',
    showPassword: 'Zobraziť heslo',
    hidePassword: 'Skryť heslo',
    loginButton: 'Prihlásiť sa do aplikácie',
    loggingIn: 'Prihlasujem...',
    forgotPassword: 'Zabudli ste heslo?',
    noAccount: 'Nemáš účet?',
    register: 'Registrovať sa',
    backHome: 'Späť na úvodnú stránku',
    demoLogin: 'Pokračovať ako demo používateľ',
    demoLoading: 'Otváram demo...',
    missingFields: 'Vyplň e-mail a heslo.',
    loginFailed: 'Prihlásenie zlyhalo. Skontroluj e-mail a heslo.',
    genericError: 'Prihlásenie zlyhalo. Skús to znova.',
    passwordChanged: 'Heslo bolo úspešne zmenené. Teraz sa môžete prihlásiť.',
  },
  cs: {
    title: 'Přihlášení',
    subtitle: 'ZEDPERA účet',
    description: 'Přihlaste se do uživatelského nebo admin menu ZEDPERA.',
    email: 'E-mail',
    emailPlaceholder: 'např. peter@email.com',
    password: 'Heslo',
    passwordPlaceholder: 'Zadejte heslo',
    showPassword: 'Zobrazit heslo',
    hidePassword: 'Skrýt heslo',
    loginButton: 'Přihlásit se do aplikace',
    loggingIn: 'Přihlašuji...',
    forgotPassword: 'Zapomněli jste heslo?',
    noAccount: 'Nemáte účet?',
    register: 'Registrovat se',
    backHome: 'Zpět na úvodní stránku',
    demoLogin: 'Pokračovat jako demo uživatel',
    demoLoading: 'Otevírám demo...',
    missingFields: 'Vyplňte e-mail a heslo.',
    loginFailed: 'Přihlášení selhalo. Zkontrolujte e-mail a heslo.',
    genericError: 'Přihlášení selhalo. Zkuste to znovu.',
    passwordChanged: 'Heslo bylo úspěšně změněno. Nyní se můžete přihlásit.',
  },
  en: {
    title: 'Login',
    subtitle: 'ZEDPERA account',
    description: 'Sign in to your ZEDPERA user or admin menu.',
    email: 'Email',
    emailPlaceholder: 'e.g. peter@email.com',
    password: 'Password',
    passwordPlaceholder: 'Enter password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    loginButton: 'Sign in to the application',
    loggingIn: 'Signing in...',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    register: 'Register',
    backHome: 'Back to homepage',
    demoLogin: 'Continue as demo user',
    demoLoading: 'Opening demo...',
    missingFields: 'Enter email and password.',
    loginFailed: 'Login failed. Check your email and password.',
    genericError: 'Login failed. Please try again.',
    passwordChanged: 'Password was changed successfully. You can now sign in.',
  },
  de: {
    title: 'Anmeldung',
    subtitle: 'ZEDPERA Konto',
    description: 'Melden Sie sich im Benutzer- oder Admin-Menü von ZEDPERA an.',
    email: 'E-Mail',
    emailPlaceholder: 'z. B. peter@email.com',
    password: 'Passwort',
    passwordPlaceholder: 'Passwort eingeben',
    showPassword: 'Passwort anzeigen',
    hidePassword: 'Passwort ausblenden',
    loginButton: 'In der Anwendung anmelden',
    loggingIn: 'Anmeldung läuft...',
    forgotPassword: 'Passwort vergessen?',
    noAccount: 'Sie haben kein Konto?',
    register: 'Registrieren',
    backHome: 'Zurück zur Startseite',
    demoLogin: 'Als Demo-Benutzer fortfahren',
    demoLoading: 'Demo wird geöffnet...',
    missingFields: 'E-Mail und Passwort ausfüllen.',
    loginFailed: 'Anmeldung fehlgeschlagen. Prüfen Sie E-Mail und Passwort.',
    genericError: 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.',
    passwordChanged:
      'Das Passwort wurde erfolgreich geändert. Sie können sich jetzt anmelden.',
  },
  pl: {
    title: 'Logowanie',
    subtitle: 'Konto ZEDPERA',
    description: 'Zaloguj się do menu użytkownika lub administratora ZEDPERA.',
    email: 'E-mail',
    emailPlaceholder: 'np. peter@email.com',
    password: 'Hasło',
    passwordPlaceholder: 'Wpisz hasło',
    showPassword: 'Pokaż hasło',
    hidePassword: 'Ukryj hasło',
    loginButton: 'Zaloguj się do aplikacji',
    loggingIn: 'Logowanie...',
    forgotPassword: 'Nie pamiętasz hasła?',
    noAccount: 'Nie masz konta?',
    register: 'Zarejestruj się',
    backHome: 'Powrót do strony głównej',
    demoLogin: 'Kontynuuj jako użytkownik demo',
    demoLoading: 'Otwieram demo...',
    missingFields: 'Wpisz e-mail i hasło.',
    loginFailed: 'Logowanie nie powiodło się. Sprawdź e-mail i hasło.',
    genericError: 'Logowanie nie powiodło się. Spróbuj ponownie.',
    passwordChanged:
      'Hasło zostało pomyślnie zmienione. Możesz się teraz zalogować.',
  },
  hu: {
    title: 'Bejelentkezés',
    subtitle: 'ZEDPERA fiók',
    description:
      'Jelentkezzen be a ZEDPERA felhasználói vagy admin menüjébe.',
    email: 'E-mail',
    emailPlaceholder: 'pl. peter@email.com',
    password: 'Jelszó',
    passwordPlaceholder: 'Adja meg a jelszót',
    showPassword: 'Jelszó megjelenítése',
    hidePassword: 'Jelszó elrejtése',
    loginButton: 'Bejelentkezés az alkalmazásba',
    loggingIn: 'Bejelentkezés...',
    forgotPassword: 'Elfelejtette a jelszavát?',
    noAccount: 'Nincs fiókja?',
    register: 'Regisztráció',
    backHome: 'Vissza a kezdőlapra',
    demoLogin: 'Folytatás demo felhasználóként',
    demoLoading: 'Demo megnyitása...',
    missingFields: 'Adja meg az e-mail címet és a jelszót.',
    loginFailed:
      'A bejelentkezés sikertelen. Ellenőrizze az e-mail címet és a jelszót.',
    genericError: 'A bejelentkezés sikertelen. Próbálja újra.',
    passwordChanged:
      'A jelszó sikeresen megváltozott. Most már bejelentkezhet.',
  },
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
  return String(value || '').trim();
}

export default function LoginPage() {
  const router = useRouter();
  const { setLanguage } = useLanguage();

  const [currentLanguage, setCurrentLanguage] = useState<AppLanguage>('sk');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
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

      if (params.get('password') === 'changed') {
        setNotice(loginCopy[getSavedLanguage()].passwordChanged);
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

  const saveLoginData = ({
    userEmail,
    userName,
    role,
    plan,
    adminFree = false,
  }: {
    userEmail: string;
    userName: string;
    role: 'admin' | 'user';
    plan: string;
    adminFree?: boolean;
  }) => {
    if (typeof window === 'undefined') return;

    localStorage.setItem('zedpera_user_email', userEmail);
    localStorage.setItem('zedpera_email', userEmail);
    localStorage.setItem('user_email', userEmail);

    localStorage.setItem('zedpera_user_name', userName);
    localStorage.setItem('zedpera_user_role', role);
    localStorage.setItem('zedpera_user_plan', plan);
    localStorage.setItem('zedpera_is_logged_in', 'true');

    if (adminFree) {
      localStorage.setItem('zedpera_admin_free', 'true');
      document.cookie = 'sub_active=1; path=/; max-age=2592000; SameSite=Lax';
    } else {
      localStorage.removeItem('zedpera_admin_free');
    }
  };

  const clearLoginData = () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('zedpera_user_email');
    localStorage.removeItem('zedpera_email');
    localStorage.removeItem('user_email');
    localStorage.removeItem('zedpera_user_name');
    localStorage.removeItem('zedpera_user_role');
    localStorage.removeItem('zedpera_user_plan');
    localStorage.removeItem('zedpera_is_logged_in');
    localStorage.removeItem('zedpera_admin_free');

    document.cookie = 'sub_active=; path=/; max-age=0; SameSite=Lax';
  };

  const redirectToDashboard = (query: string) => {
    triggerAutoTranslate();

    router.refresh();
    router.push(`/dashboard${query}`);
  };

  const loginUser = async () => {
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

    try {
      setLoading(true);

      window.setTimeout(triggerAutoTranslate, 50);

      const supabase = createSupabaseBrowserClient();

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

      if (loginError) {
        if (cleanEmail === ADMIN_EMAIL && cleanPassword === ADMIN_PASSWORD) {
          saveLoginData({
            userEmail: cleanEmail,
            userName: 'Admin',
            role: 'admin',
            plan: 'admin-free',
            adminFree: true,
          });

          redirectToDashboard('?mode=admin-free');
          return;
        }

        clearLoginData();

        setError(loginError.message || copy.loginFailed);

        window.setTimeout(triggerAutoTranslate, 50);
        window.setTimeout(triggerAutoTranslate, 300);

        return;
      }

      const userEmail = data.user?.email || cleanEmail;

      saveLoginData({
        userEmail,
        userName:
          data.user?.user_metadata?.full_name ||
          data.user?.user_metadata?.name ||
          userEmail,
        role: 'user',
        plan: 'free',
      });

      redirectToDashboard('?login=success');
    } catch (err) {
      clearLoginData();

      setError(err instanceof Error ? err.message : copy.genericError);

      window.setTimeout(triggerAutoTranslate, 50);
      window.setTimeout(triggerAutoTranslate, 300);
    } finally {
      setLoading(false);

      window.setTimeout(triggerAutoTranslate, 100);
    }
  };

  const loginAsDemoUser = async () => {
    const demoEmail = 'demo@zedpera.com';

    try {
      setDemoLoading(true);
      setError('');
      setNotice('');

      const supabase = createSupabaseBrowserClient();

      await supabase.auth.signOut();

      saveLoginData({
        userEmail: demoEmail,
        userName: 'Demo používateľ',
        role: 'user',
        plan: 'free',
      });

      redirectToDashboard('?demo=true');
    } catch {
      saveLoginData({
        userEmail: demoEmail,
        userName: 'Demo používateľ',
        role: 'user',
        plan: 'free',
      });

      redirectToDashboard('?demo=true');
    } finally {
      setDemoLoading(false);
    }
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
            <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{notice}</span>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-700 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                {copy.email}
              </span>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-purple-400 dark:border-white/10 dark:bg-slate-950">
                <Mail size={18} className="text-slate-500" />

                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void loginUser();
                    }
                  }}
                  placeholder={copy.emailPlaceholder}
                  type="email"
                  autoComplete="email"
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
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void loginUser();
                    }
                  }}
                  placeholder={copy.passwordPlaceholder}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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
              type="button"
              onClick={() => void loginUser()}
              disabled={loading || demoLoading}
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

            <button
              type="button"
              onClick={() => void loginAsDemoUser()}
              disabled={loading || demoLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-black text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
            >
              {demoLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {copy.demoLoading}
                </>
              ) : (
                copy.demoLogin
              )}
            </button>
          </div>

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