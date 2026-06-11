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
  ShieldCheck,
} from 'lucide-react';

type AppLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

const LANGUAGE_STORAGE_KEY = 'zedpera_language';

const copy = {
  sk: {
    badge: 'BEZPEČNÉ OBNOVENIE',
    title: 'Zabudli ste heslo?',
    description:
      'Zadajte e-mail svojho účtu. Pošleme vám bezpečný odkaz na nastavenie nového hesla.',
    infoTitle: 'Odkaz na reset hesla bude smerovať na:',
    cardTitle: 'Reset hesla',
    cardSubtitle:
      'Funguje na mobile aj na webe. Po odoslaní skontrolujte aj spam alebo nevyžiadanú poštu.',
    email: 'E-mail',
    emailPlaceholder: 'napr. peter@email.com',
    send: 'Odoslať resetovací odkaz',
    sending: 'Odosielam odkaz...',
    success:
      'Ak je e-mailová adresa registrovaná, odoslali sme na ňu odkaz na reset hesla.',
    missingEmail: 'Zadajte e-mailovú adresu.',
    invalidEmail: 'Zadajte platnú e-mailovú adresu.',
    error: 'Reset hesla sa nepodarilo odoslať. Skúste to znova.',
    backToLogin: 'Späť na prihlásenie',
    remembered: 'Spomenuli ste si na heslo?',
    choosePlan: 'Vybrať balík',
  },
  cs: {
    badge: 'BEZPEČNÉ OBNOVENÍ',
    title: 'Zapomněli jste heslo?',
    description:
      'Zadejte e-mail svého účtu. Pošleme vám bezpečný odkaz pro nastavení nového hesla.',
    infoTitle: 'Odkaz pro reset hesla bude směřovat na:',
    cardTitle: 'Reset hesla',
    cardSubtitle:
      'Funguje na mobilu i na webu. Po odeslání zkontrolujte také spam nebo nevyžádanou poštu.',
    email: 'E-mail',
    emailPlaceholder: 'např. peter@email.com',
    send: 'Odeslat odkaz pro reset',
    sending: 'Odesílám odkaz...',
    success:
      'Pokud je e-mailová adresa registrována, odeslali jsme na ni odkaz pro reset hesla.',
    missingEmail: 'Zadejte e-mailovou adresu.',
    invalidEmail: 'Zadejte platnou e-mailovou adresu.',
    error: 'Reset hesla se nepodařilo odeslat. Zkuste to znovu.',
    backToLogin: 'Zpět na přihlášení',
    remembered: 'Vzpomněli jste si na heslo?',
    choosePlan: 'Vybrat balíček',
  },
  en: {
    badge: 'SECURE RECOVERY',
    title: 'Forgot your password?',
    description:
      "Enter your account email. We'll send you a secure link to set a new password.",
    infoTitle: 'The password reset link will direct to:',
    cardTitle: 'Password Reset',
    cardSubtitle:
      'Works on mobile and web. After sending, check your spam or junk folder.',
    email: 'Email',
    emailPlaceholder: 'e.g. peter@email.com',
    send: 'Send reset link',
    sending: 'Sending link...',
    success:
      'If the email address is registered, we have sent a password reset link to it.',
    missingEmail: 'Enter your email address.',
    invalidEmail: 'Enter a valid email address.',
    error: 'Password reset could not be sent. Please try again.',
    backToLogin: 'Back to Login',
    remembered: 'Remembered your password?',
    choosePlan: 'Choose Plan',
  },
  de: {
    badge: 'SICHERE WIEDERHERSTELLUNG',
    title: 'Passwort vergessen?',
    description:
      'Geben Sie die E-Mail-Adresse Ihres Kontos ein. Wir senden Ihnen einen sicheren Link zum Festlegen eines neuen Passworts.',
    infoTitle: 'Der Link zum Zurücksetzen des Passworts führt zu:',
    cardTitle: 'Passwort zurücksetzen',
    cardSubtitle:
      'Funktioniert auf Mobilgeräten und im Web. Prüfen Sie nach dem Senden auch Spam oder Junk-Mail.',
    email: 'E-Mail',
    emailPlaceholder: 'z. B. peter@email.com',
    send: 'Reset-Link senden',
    sending: 'Link wird gesendet...',
    success:
      'Wenn die E-Mail-Adresse registriert ist, haben wir einen Link zum Zurücksetzen des Passworts gesendet.',
    missingEmail: 'Geben Sie Ihre E-Mail-Adresse ein.',
    invalidEmail: 'Geben Sie eine gültige E-Mail-Adresse ein.',
    error:
      'Das Zurücksetzen des Passworts konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
    backToLogin: 'Zurück zur Anmeldung',
    remembered: 'Passwort wieder eingefallen?',
    choosePlan: 'Paket auswählen',
  },
  pl: {
    badge: 'BEZPIECZNE ODZYSKIWANIE',
    title: 'Nie pamiętasz hasła?',
    description:
      'Wpisz e-mail swojego konta. Wyślemy bezpieczny link do ustawienia nowego hasła.',
    infoTitle: 'Link resetowania hasła przekieruje na:',
    cardTitle: 'Reset hasła',
    cardSubtitle:
      'Działa na telefonie i w przeglądarce. Po wysłaniu sprawdź także spam.',
    email: 'E-mail',
    emailPlaceholder: 'np. peter@email.com',
    send: 'Wyślij link resetujący',
    sending: 'Wysyłam link...',
    success:
      'Jeśli adres e-mail jest zarejestrowany, wysłaliśmy na niego link do resetowania hasła.',
    missingEmail: 'Wpisz adres e-mail.',
    invalidEmail: 'Wpisz poprawny adres e-mail.',
    error: 'Nie udało się wysłać resetowania hasła. Spróbuj ponownie.',
    backToLogin: 'Powrót do logowania',
    remembered: 'Pamiętasz hasło?',
    choosePlan: 'Wybierz pakiet',
  },
  hu: {
    badge: 'BIZTONSÁGOS HELYREÁLLÍTÁS',
    title: 'Elfelejtette a jelszavát?',
    description:
      'Adja meg fiókja e-mail címét. Biztonságos linket küldünk az új jelszó beállításához.',
    infoTitle: 'A jelszó-visszaállító link ide irányít:',
    cardTitle: 'Jelszó visszaállítása',
    cardSubtitle:
      'Mobilon és weben is működik. Küldés után ellenőrizze a spam mappát is.',
    email: 'E-mail',
    emailPlaceholder: 'pl. peter@email.com',
    send: 'Visszaállító link küldése',
    sending: 'Link küldése...',
    success:
      'Ha az e-mail cím regisztrálva van, elküldtük rá a jelszó-visszaállító linket.',
    missingEmail: 'Adja meg az e-mail címet.',
    invalidEmail: 'Adjon meg érvényes e-mail címet.',
    error: 'A jelszó-visszaállítás elküldése sikertelen. Próbálja újra.',
    backToLogin: 'Vissza a bejelentkezéshez',
    remembered: 'Emlékszik a jelszavára?',
    choosePlan: 'Csomag választása',
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

  if (['en', 'eng', 'english', 'angličtina', 'anglictina'].includes(normalized)) {
    return 'en';
  }

  if (['de', 'ger', 'german', 'deutsch', 'nemčina', 'nemcina'].includes(normalized)) {
    return 'de';
  }

  if (['pl', 'polish', 'polski', 'poľština', 'polstina'].includes(normalized)) {
    return 'pl';
  }

  if (['hu', 'hungarian', 'magyar', 'maďarčina', 'madarcina'].includes(normalized)) {
    return 'hu';
  }

  return 'sk';
}

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams();

  const currentLanguage = useMemo<AppLanguage>(() => {
    const urlLang = searchParams.get('lang');

    if (urlLang) {
      return normalizeLanguage(urlLang);
    }

    if (typeof window === 'undefined') {
      return 'sk';
    }

    const saved =
      window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
      window.localStorage.getItem('zedpera_system_language') ||
      window.localStorage.getItem('zedpera_interface_language') ||
      document.documentElement.lang;

    return normalizeLanguage(saved);
  }, [searchParams]);

  const t = copy[currentLanguage];

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const resetPath = `/reset-password?lang=${currentLanguage}`;
  const resetUrl = `${getBaseUrl()}${resetPath}`;

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
      <section className="relative min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-purple-700/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-indigo-700/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-20 h-96 w-96 rounded-full bg-purple-700/20 blur-3xl" />

        <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/40 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-white/10 bg-gradient-to-br from-purple-950/45 via-slate-950 to-slate-950 p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-300/20 bg-purple-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-purple-100 sm:px-5">
              <ShieldCheck className="h-4 w-4" />
              {t.badge}
            </div>

            <div className="mt-10 max-w-xl">
              <h1 className="text-5xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                {t.title}
              </h1>

              <p className="mt-6 max-w-2xl text-lg font-bold leading-8 text-slate-300 sm:text-xl">
                {t.description}
              </p>
            </div>

            <div className="mt-10 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 sm:p-6">
              <p className="text-sm font-black text-slate-300 sm:text-base">
                {t.infoTitle}
              </p>

              <div className="mt-4 rounded-2xl bg-black/40 px-5 py-4 font-mono text-sm font-black text-purple-100 break-all">
                {resetPath}
              </div>
            </div>
          </div>

          <div className="flex items-center bg-slate-950/80 p-6 sm:p-10 lg:p-12">
            <div className="w-full">
              <Link
                href={`/login?lang=${currentLanguage}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.backToLogin}
              </Link>

              <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600 to-fuchsia-700 shadow-lg shadow-purple-950/40">
                <Mail className="h-8 w-8" />
              </div>

              <h2 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
                {t.cardTitle}
              </h2>

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

              <div className="mt-8 text-center text-sm font-bold text-slate-400 sm:text-base">
                {t.remembered}{' '}
                <Link
                  href={`/pricing?lang=${currentLanguage}`}
                  className="font-black text-purple-200 transition hover:text-white"
                >
                  {t.choosePlan}
                </Link>
              </div>
            </div>
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