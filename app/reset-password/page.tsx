'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';

type AppLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

const LANGUAGE_STORAGE_KEY = 'zedpera_language';

const copy = {
  sk: {
    badge: 'NOVÉ HESLO',
    title: 'Nastavte nové heslo',
    description:
      'Zadajte nové heslo pre svoj ZEDPERA účet. Po uložení sa budete môcť prihlásiť.',
    cardTitle: 'Zmena hesla',
    cardSubtitle:
      'Heslo musí mať aspoň 8 znakov. Odporúčame kombináciu písmen, číslic a symbolov.',
    password: 'Nové heslo',
    passwordPlaceholder: 'Zadajte nové heslo',
    confirmPassword: 'Potvrdenie hesla',
    confirmPasswordPlaceholder: 'Zopakujte nové heslo',
    showPassword: 'Zobraziť heslo',
    hidePassword: 'Skryť heslo',
    save: 'Uložiť nové heslo',
    saving: 'Ukladám heslo...',
    success: 'Heslo bolo úspešne zmenené. Presmerujeme vás na prihlásenie.',
    missing: 'Vyplňte nové heslo aj potvrdenie hesla.',
    minLength: 'Heslo musí mať aspoň 8 znakov.',
    mismatch: 'Heslá sa nezhodujú.',
    noSession:
      'Odkaz na reset hesla je neplatný alebo expiroval. Požiadajte o nový resetovací odkaz.',
    error: 'Heslo sa nepodarilo zmeniť. Skúste to znova.',
    backToLogin: 'Späť na prihlásenie',
    requestNewLink: 'Požiadať o nový odkaz',
  },
  cs: {
    badge: 'NOVÉ HESLO',
    title: 'Nastavte nové heslo',
    description:
      'Zadejte nové heslo pro svůj ZEDPERA účet. Po uložení se budete moci přihlásit.',
    cardTitle: 'Změna hesla',
    cardSubtitle:
      'Heslo musí mít alespoň 8 znaků. Doporučujeme kombinaci písmen, číslic a symbolů.',
    password: 'Nové heslo',
    passwordPlaceholder: 'Zadejte nové heslo',
    confirmPassword: 'Potvrzení hesla',
    confirmPasswordPlaceholder: 'Zopakujte nové heslo',
    showPassword: 'Zobrazit heslo',
    hidePassword: 'Skrýt heslo',
    save: 'Uložit nové heslo',
    saving: 'Ukládám heslo...',
    success: 'Heslo bylo úspěšně změněno. Přesměrujeme vás na přihlášení.',
    missing: 'Vyplňte nové heslo i potvrzení hesla.',
    minLength: 'Heslo musí mít alespoň 8 znaků.',
    mismatch: 'Hesla se neshodují.',
    noSession:
      'Odkaz pro reset hesla je neplatný nebo vypršel. Požádejte o nový resetovací odkaz.',
    error: 'Heslo se nepodařilo změnit. Zkuste to znovu.',
    backToLogin: 'Zpět na přihlášení',
    requestNewLink: 'Požádat o nový odkaz',
  },
  en: {
    badge: 'NEW PASSWORD',
    title: 'Set a new password',
    description:
      'Enter a new password for your ZEDPERA account. After saving, you can sign in.',
    cardTitle: 'Change password',
    cardSubtitle:
      'The password must have at least 8 characters. We recommend combining letters, numbers and symbols.',
    password: 'New password',
    passwordPlaceholder: 'Enter new password',
    confirmPassword: 'Confirm password',
    confirmPasswordPlaceholder: 'Repeat new password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    save: 'Save new password',
    saving: 'Saving password...',
    success: 'Password was changed successfully. We will redirect you to login.',
    missing: 'Enter the new password and password confirmation.',
    minLength: 'Password must have at least 8 characters.',
    mismatch: 'Passwords do not match.',
    noSession:
      'The password reset link is invalid or expired. Request a new reset link.',
    error: 'Password could not be changed. Please try again.',
    backToLogin: 'Back to Login',
    requestNewLink: 'Request new link',
  },
  de: {
    badge: 'NEUES PASSWORT',
    title: 'Neues Passwort festlegen',
    description:
      'Geben Sie ein neues Passwort für Ihr ZEDPERA Konto ein. Danach können Sie sich anmelden.',
    cardTitle: 'Passwort ändern',
    cardSubtitle:
      'Das Passwort muss mindestens 8 Zeichen haben. Wir empfehlen eine Kombination aus Buchstaben, Zahlen und Symbolen.',
    password: 'Neues Passwort',
    passwordPlaceholder: 'Neues Passwort eingeben',
    confirmPassword: 'Passwort bestätigen',
    confirmPasswordPlaceholder: 'Neues Passwort wiederholen',
    showPassword: 'Passwort anzeigen',
    hidePassword: 'Passwort ausblenden',
    save: 'Neues Passwort speichern',
    saving: 'Passwort wird gespeichert...',
    success:
      'Das Passwort wurde erfolgreich geändert. Sie werden zur Anmeldung weitergeleitet.',
    missing: 'Geben Sie das neue Passwort und die Bestätigung ein.',
    minLength: 'Das Passwort muss mindestens 8 Zeichen haben.',
    mismatch: 'Die Passwörter stimmen nicht überein.',
    noSession:
      'Der Link zum Zurücksetzen ist ungültig oder abgelaufen. Fordern Sie einen neuen Link an.',
    error:
      'Das Passwort konnte nicht geändert werden. Bitte versuchen Sie es erneut.',
    backToLogin: 'Zurück zur Anmeldung',
    requestNewLink: 'Neuen Link anfordern',
  },
  pl: {
    badge: 'NOWE HASŁO',
    title: 'Ustaw nowe hasło',
    description:
      'Wpisz nowe hasło do swojego konta ZEDPERA. Po zapisaniu możesz się zalogować.',
    cardTitle: 'Zmiana hasła',
    cardSubtitle:
      'Hasło musi mieć co najmniej 8 znaków. Zalecamy połączenie liter, cyfr i symboli.',
    password: 'Nowe hasło',
    passwordPlaceholder: 'Wpisz nowe hasło',
    confirmPassword: 'Potwierdź hasło',
    confirmPasswordPlaceholder: 'Powtórz nowe hasło',
    showPassword: 'Pokaż hasło',
    hidePassword: 'Ukryj hasło',
    save: 'Zapisz nowe hasło',
    saving: 'Zapisuję hasło...',
    success: 'Hasło zostało zmienione. Przekierujemy Cię do logowania.',
    missing: 'Wpisz nowe hasło i jego potwierdzenie.',
    minLength: 'Hasło musi mieć co najmniej 8 znaków.',
    mismatch: 'Hasła nie są takie same.',
    noSession:
      'Link resetowania hasła jest nieprawidłowy lub wygasł. Poproś o nowy link.',
    error: 'Nie udało się zmienić hasła. Spróbuj ponownie.',
    backToLogin: 'Powrót do logowania',
    requestNewLink: 'Poproś o nowy link',
  },
  hu: {
    badge: 'ÚJ JELSZÓ',
    title: 'Új jelszó beállítása',
    description:
      'Adja meg az új jelszót a ZEDPERA fiókjához. Mentés után be tud jelentkezni.',
    cardTitle: 'Jelszó módosítása',
    cardSubtitle:
      'A jelszónak legalább 8 karakterből kell állnia. Betűk, számok és szimbólumok kombinációját ajánljuk.',
    password: 'Új jelszó',
    passwordPlaceholder: 'Adja meg az új jelszót',
    confirmPassword: 'Jelszó megerősítése',
    confirmPasswordPlaceholder: 'Ismételje meg az új jelszót',
    showPassword: 'Jelszó megjelenítése',
    hidePassword: 'Jelszó elrejtése',
    save: 'Új jelszó mentése',
    saving: 'Jelszó mentése...',
    success: 'A jelszó sikeresen megváltozott. Átirányítjuk a bejelentkezéshez.',
    missing: 'Adja meg az új jelszót és a megerősítést.',
    minLength: 'A jelszónak legalább 8 karakterből kell állnia.',
    mismatch: 'A jelszavak nem egyeznek.',
    noSession:
      'A jelszó-visszaállító link érvénytelen vagy lejárt. Kérjen új linket.',
    error: 'A jelszó módosítása sikertelen. Próbálja újra.',
    backToLogin: 'Vissza a bejelentkezéshez',
    requestNewLink: 'Új link kérése',
  },
} satisfies Record<AppLanguage, Record<string, string>>;

function normalizeLanguage(value: unknown): AppLanguage {
  const normalized = String(value || '').trim().toLowerCase();

  if (['sk', 'slovak', 'slovenčina', 'slovencina'].includes(normalized)) return 'sk';
  if (['cs', 'cz', 'czech', 'čeština', 'cestina'].includes(normalized)) return 'cs';
  if (['en', 'eng', 'english', 'angličtina', 'anglictina'].includes(normalized)) return 'en';
  if (['de', 'ger', 'german', 'deutsch', 'nemčina', 'nemcina'].includes(normalized)) return 'de';
  if (['pl', 'polish', 'polski', 'poľština', 'polstina'].includes(normalized)) return 'pl';
  if (['hu', 'hungarian', 'magyar', 'maďarčina', 'madarcina'].includes(normalized)) return 'hu';

  return 'sk';
}

function ResetPasswordContent() {
  const router = useRouter();
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

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setHasRecoverySession(Boolean(session));
      setCheckingSession(false);
    }

    void checkSession();

    const supabase = createSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function saveNewPassword() {
    setStatus('');
    setError('');

    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();

    if (!cleanPassword || !cleanConfirmPassword) {
      setError(t.missing);
      return;
    }

    if (cleanPassword.length < 8) {
      setError(t.minLength);
      return;
    }

    if (cleanPassword !== cleanConfirmPassword) {
      setError(t.mismatch);
      return;
    }

    if (!hasRecoverySession) {
      setError(t.noSession);
      return;
    }

    try {
      setIsSaving(true);

      const supabase = createSupabaseBrowserClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: cleanPassword,
      });

      if (updateError) {
        setError(updateError.message || t.error);
        return;
      }

      setStatus(t.success);

      window.setTimeout(() => {
        router.push(`/login?password=changed&lang=${currentLanguage}`);
      }, 1800);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : t.error);
    } finally {
      setIsSaving(false);
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
                <KeyRound className="h-8 w-8" />
              </div>

              <h2 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
                {t.cardTitle}
              </h2>

              <p className="mt-4 text-base font-bold leading-7 text-slate-300">
                {t.cardSubtitle}
              </p>

              {checkingSession ? (
                <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm font-black text-slate-200">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Kontrolujem resetovací odkaz...
                </div>
              ) : null}

              {!checkingSession && !hasRecoverySession ? (
                <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-sm font-black leading-6 text-red-100 sm:text-base">
                  {t.noSession}

                  <div className="mt-5">
                    <Link
                      href={`/forgot-password?lang=${currentLanguage}`}
                      className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
                    >
                      {t.requestNewLink}
                    </Link>
                  </div>
                </div>
              ) : null}

              {!checkingSession && hasRecoverySession ? (
                <div className="mt-8 space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-slate-300">
                      {t.password}
                    </span>

                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-800 px-5 py-4 transition focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/20">
                      <Lock className="h-5 w-5 shrink-0 text-slate-400" />

                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            void saveNewPassword();
                          }
                        }}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder={t.passwordPlaceholder}
                        className="w-full bg-transparent text-base font-bold text-white outline-none placeholder:text-slate-500 sm:text-lg"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={
                          showPassword ? t.hidePassword : t.showPassword
                        }
                        className="text-slate-400 transition hover:text-white"
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
                    <span className="mb-2 block text-sm font-black text-slate-300">
                      {t.confirmPassword}
                    </span>

                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-800 px-5 py-4 transition focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/20">
                      <Lock className="h-5 w-5 shrink-0 text-slate-400" />

                      <input
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            void saveNewPassword();
                          }
                        }}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder={t.confirmPasswordPlaceholder}
                        className="w-full bg-transparent text-base font-bold text-white outline-none placeholder:text-slate-500 sm:text-lg"
                      />
                    </div>
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
                    onClick={() => void saveNewPassword()}
                    disabled={isSaving}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 px-6 py-5 text-base font-black text-white shadow-xl shadow-purple-950/40 transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-60 sm:text-lg"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t.saving}
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-5 w-5" />
                        {t.save}
                      </>
                    )}
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
        <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}