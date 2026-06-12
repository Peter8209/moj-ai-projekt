'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
} from 'lucide-react';

type AppLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

const LANGUAGE_STORAGE_KEY = 'zedpera_language';

const copy = {
  sk: {
    cardTitle: 'Reset hesla',
    cardSubtitle:
      'Zadajte e-mail svojho účtu. Ak je e-mail registrovaný, pošleme vám bezpečný odkaz na nastavenie nového hesla.',
    email: 'E-mail',
    emailPlaceholder: 'napr. peter@email.com',
    send: 'Odoslať resetovací odkaz',
    sending: 'Odosielam odkaz...',
    success:
      'Ak je e-mailová adresa registrovaná, odoslali sme na ňu odkaz na reset hesla. Skontrolujte aj spam alebo nevyžiadanú poštu.',
    missingEmail: 'Zadajte e-mailovú adresu.',
    invalidEmail: 'Zadajte platnú e-mailovú adresu.',
    error: 'Reset hesla sa nepodarilo odoslať. Skúste to znova.',
    backToLogin: 'Späť na prihlásenie',
    backHome: 'Späť na úvodnú stránku',
  },
  cs: {
    cardTitle: 'Reset hesla',
    cardSubtitle:
      'Zadejte e-mail svého účtu. Pokud je e-mail registrován, pošleme vám bezpečný odkaz pro nastavení nového hesla.',
    email: 'E-mail',
    emailPlaceholder: 'např. peter@email.com',
    send: 'Odeslat odkaz pro reset',
    sending: 'Odesílám odkaz...',
    success:
      'Pokud je e-mailová adresa registrována, odeslali jsme na ni odkaz pro reset hesla. Zkontrolujte také spam nebo nevyžádanou poštu.',
    missingEmail: 'Zadejte e-mailovou adresu.',
    invalidEmail: 'Zadejte platnou e-mailovou adresu.',
    error: 'Reset hesla se nepodařilo odeslat. Zkuste to znovu.',
    backToLogin: 'Zpět na přihlášení',
    backHome: 'Zpět na úvodní stránku',
  },
  en: {
    cardTitle: 'Password Reset',
    cardSubtitle:
      'Enter your account email. If the email is registered, we will send you a secure link to set a new password.',
    email: 'Email',
    emailPlaceholder: 'e.g. peter@email.com',
    send: 'Send reset link',
    sending: 'Sending link...',
    success:
      'If the email address is registered, we have sent a password reset link to it. Please also check your spam or junk folder.',
    missingEmail: 'Enter your email address.',
    invalidEmail: 'Enter a valid email address.',
    error: 'Password reset could not be sent. Please try again.',
    backToLogin: 'Back to Login',
    backHome: 'Back to homepage',
  },
  de: {
    cardTitle: 'Passwort zurücksetzen',
    cardSubtitle:
      'Geben Sie die E-Mail-Adresse Ihres Kontos ein. Wenn die E-Mail registriert ist, senden wir Ihnen einen sicheren Link zum Festlegen eines neuen Passworts.',
    email: 'E-Mail',
    emailPlaceholder: 'z. B. peter@email.com',
    send: 'Reset-Link senden',
    sending: 'Link wird gesendet...',
    success:
      'Wenn die E-Mail-Adresse registriert ist, haben wir einen Link zum Zurücksetzen des Passworts gesendet. Prüfen Sie auch Spam oder Junk-Mail.',
    missingEmail: 'Geben Sie Ihre E-Mail-Adresse ein.',
    invalidEmail: 'Geben Sie eine gültige E-Mail-Adresse ein.',
    error:
      'Das Zurücksetzen des Passworts konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
    backToLogin: 'Zurück zur Anmeldung',
    backHome: 'Zurück zur Startseite',
  },
  pl: {
    cardTitle: 'Reset hasła',
    cardSubtitle:
      'Wpisz e-mail swojego konta. Jeśli e-mail jest zarejestrowany, wyślemy bezpieczny link do ustawienia nowego hasła.',
    email: 'E-mail',
    emailPlaceholder: 'np. peter@email.com',
    send: 'Wyślij link resetujący',
    sending: 'Wysyłam link...',
    success:
      'Jeśli adres e-mail jest zarejestrowany, wysłaliśmy na niego link do resetowania hasła. Sprawdź także spam.',
    missingEmail: 'Wpisz adres e-mail.',
    invalidEmail: 'Wpisz poprawny adres e-mail.',
    error: 'Nie udało się wysłać resetowania hasła. Spróbuj ponownie.',
    backToLogin: 'Powrót do logowania',
    backHome: 'Powrót do strony głównej',
  },
  hu: {
    cardTitle: 'Jelszó visszaállítása',
    cardSubtitle:
      'Adja meg fiókja e-mail címét. Ha az e-mail regisztrálva van, biztonságos linket küldünk az új jelszó beállításához.',
    email: 'E-mail',
    emailPlaceholder: 'pl. peter@email.com',
    send: 'Visszaállító link küldése',
    sending: 'Link küldése...',
    success:
      'Ha az e-mail cím regisztrálva van, elküldtük rá a jelszó-visszaállító linket. Ellenőrizze a spam mappát is.',
    missingEmail: 'Adja meg az e-mail címet.',
    invalidEmail: 'Adjon meg érvényes e-mail címet.',
    error: 'A jelszó-visszaállítás elküldése sikertelen. Próbálja újra.',
    backToLogin: 'Vissza a bejelentkezéshez',
    backHome: 'Vissza a kezdőlapra',
  },
} satisfies Record<AppLanguage, Record<string, string>>;

function normalizeLanguage(value: unknown): AppLanguage {
  const normalized = String(value || '').trim().toLowerCase();

  if (['sk', 'slovak', 'slovenčina', 'slovencina'].includes(normalized)) {
    return 'sk';
  }

  if (['cs', 'cz', 'czech', 'čeština', 'cestina'].includes(normalized)) {
    return 'cs';
  }

  if (
    ['en', 'eng', 'english', 'angličtina', 'anglictina'].includes(normalized)
  ) {
    return 'en';
  }

  if (
    ['de', 'ger', 'german', 'deutsch', 'nemčina', 'nemcina'].includes(
      normalized,
    )
  ) {
    return 'de';
  }

  if (
    ['pl', 'polish', 'polski', 'poľština', 'polstina'].includes(normalized)
  ) {
    return 'pl';
  }

  if (
    ['hu', 'hungarian', 'magyar', 'maďarčina', 'madarcina'].includes(
      normalized,
    )
  ) {
    return 'hu';
  }

  return 'sk';
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }

  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getSavedLanguage(): AppLanguage {
  if (typeof window === 'undefined') {
    return 'sk';
  }

  const savedLanguage =
    window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
    window.localStorage.getItem('zedpera_system_language') ||
    window.localStorage.getItem('zedpera_interface_language') ||
    window.localStorage.getItem('zedpera_work_language') ||
    document.documentElement.getAttribute('data-language') ||
    document.documentElement.lang ||
    'sk';

  return normalizeLanguage(savedLanguage);
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams();

  const currentLanguage = useMemo<AppLanguage>(() => {
    const urlLang = searchParams.get('lang');

    if (urlLang) {
      return normalizeLanguage(urlLang);
    }

    return getSavedLanguage();
  }, [searchParams]);

  const t = copy[currentLanguage];

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const resetUrl = `${getBaseUrl()}/reset-password?lang=${currentLanguage}`;

  async function sendResetLink() {
    const cleanEmail = email.trim().toLowerCase();

    setStatus('');
    setError('');

    if (!cleanEmail) {
      setError(t.missingEmail);
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError(t.invalidEmail);
      return;
    }

    try {
      setIsSending(true);

      const supabase = createSupabaseBrowserClient();

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: resetUrl,
        },
      );

      if (resetError) {
        setError(resetError.message || t.error);
        return;
      }

      setStatus(t.success);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : t.error);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <section className="relative flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-purple-700/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-indigo-700/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-20 h-96 w-96 rounded-full bg-purple-700/20 blur-3xl" />

        <div className="relative w-full max-w-[620px] rounded-[2rem] border border-white/10 bg-slate-950/95 p-5 shadow-2xl shadow-black/50 backdrop-blur sm:p-8 lg:p-10">
          <div className="mb-8">
            <Link
              href={`/login?lang=${currentLanguage}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.backToLogin}
            </Link>
          </div>

          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600 to-fuchsia-700 shadow-lg shadow-purple-950/40">
            <Mail className="h-8 w-8" />
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl">
            {t.cardTitle}
          </h1>

          <p className="mt-4 text-base font-bold leading-7 text-slate-300">
            {t.cardSubtitle}
          </p>

          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-300">
                {t.email}
              </span>

              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void sendResetLink();
                  }
                }}
                type="email"
                autoComplete="email"
                placeholder={t.emailPlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-slate-800 px-5 py-4 text-base font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20 sm:text-lg"
              />
            </label>

            {status ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm font-black leading-6 text-emerald-100 sm:text-base">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0" />
                  <span>{status}</span>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-black leading-6 text-red-100 sm:text-base">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void sendResetLink()}
              disabled={isSending}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 px-6 py-5 text-base font-black text-white shadow-xl shadow-purple-950/40 transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-60 sm:text-lg"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t.sending}
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5" />
                  {t.send}
                </>
              )}
            </button>
          </div>

          <div className="mt-8 text-center">
            <Link
              href={`/?lang=${currentLanguage}`}
              className="text-sm font-bold text-slate-400 transition hover:text-white sm:text-base"
            >
              {t.backHome}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}