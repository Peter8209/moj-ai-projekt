'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '@/components/LanguageProvider';

import {
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

function isValidLanguage(value: unknown): value is AppLanguage {
  return (
    value === 'sk' ||
    value === 'cs' ||
    value === 'en' ||
    value === 'de' ||
    value === 'pl' ||
    value === 'hu'
  );
}

function getSavedLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'sk';

  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (isValidLanguage(savedLanguage)) {
    return savedLanguage;
  }

  return 'sk';
}

export default function LoginPage() {
  const router = useRouter();
  const { setLanguage } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const triggerAutoTranslate = useCallback(() => {
    if (typeof window === 'undefined') return;

    const language = getSavedLanguage();

    setLanguage(language);

    document.documentElement.lang = language;
    document.documentElement.setAttribute('data-language', language);

    window.dispatchEvent(
      new CustomEvent<AppLanguage>('zedpera-language-change', {
        detail: language,
      }),
    );
  }, [setLanguage]);

  useEffect(() => {
    triggerAutoTranslate();

    const timers = [
      window.setTimeout(triggerAutoTranslate, 250),
      window.setTimeout(triggerAutoTranslate, 750),
      window.setTimeout(triggerAutoTranslate, 1500),
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
    } else {
      localStorage.removeItem('zedpera_admin_free');
    }
  };

  const loginUser = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    setError('');

    if (!cleanEmail || !cleanPassword) {
      setError('Vyplň e-mail a heslo.');

      window.setTimeout(triggerAutoTranslate, 50);
      window.setTimeout(triggerAutoTranslate, 300);

      return;
    }

    try {
      setLoading(true);

      window.setTimeout(triggerAutoTranslate, 50);

      if (cleanEmail === ADMIN_EMAIL && cleanPassword === ADMIN_PASSWORD) {
        saveLoginData({
          userEmail: cleanEmail,
          userName: 'Admin',
          role: 'admin',
          plan: 'admin-free',
          adminFree: true,
        });

        triggerAutoTranslate();

        router.push('/dashboard?mode=admin-free');
        return;
      }

      saveLoginData({
        userEmail: cleanEmail,
        userName: cleanEmail,
        role: 'user',
        plan: 'free',
      });

      triggerAutoTranslate();

      router.push('/dashboard?login=success');
    } catch {
      setError('Prihlásenie zlyhalo. Skús to znova.');

      window.setTimeout(triggerAutoTranslate, 50);
      window.setTimeout(triggerAutoTranslate, 300);
    } finally {
      setLoading(false);

      window.setTimeout(triggerAutoTranslate, 100);
    }
  };

  const loginAsDemoUser = () => {
    const demoEmail = 'demo@zedpera.com';

    saveLoginData({
      userEmail: demoEmail,
      userName: 'Demo používateľ',
      role: 'user',
      plan: 'free',
    });

    triggerAutoTranslate();

    router.push('/dashboard?demo=true');
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
                Prihlásenie
              </h1>

              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                ZEDPERA účet
              </p>
            </div>
          </div>

          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            Prihlás sa do používateľského alebo admin menu ZEDPERA.
          </p>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                E-mail
              </span>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-purple-400 dark:border-white/10 dark:bg-slate-950">
                <Mail size={18} className="text-slate-500" />

                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void loginUser();
                    }
                  }}
                  placeholder="napr. peter@email.com"
                  type="email"
                  autoComplete="email"
                  className="w-full bg-transparent text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-600"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                Heslo
              </span>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-purple-400 dark:border-white/10 dark:bg-slate-950">
                <Lock size={18} className="text-slate-500" />

                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void loginUser();
                    }
                  }}
                  placeholder="Zadaj heslo"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full bg-transparent text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-600"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-slate-500 transition hover:text-slate-900 dark:hover:text-white"
                  aria-label={showPassword ? 'Skryť heslo' : 'Zobraziť heslo'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button
              type="button"
              onClick={() => void loginUser()}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-700 px-5 py-4 font-black text-white shadow-xl shadow-purple-950/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Prihlasujem...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Prihlásiť sa do aplikácie
                </>
              )}
            </button>

            <button
              type="button"
              onClick={loginAsDemoUser}
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-5 py-4 font-black text-slate-900 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              Vyskúšať Zedperu bez prihlásenia
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Nemáš účet?{' '}
            <Link
              href="/register"
              className="font-bold text-purple-600 hover:text-purple-500 dark:text-purple-300 dark:hover:text-purple-200"
            >
              Registrovať sa
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Späť na úvodnú stránku
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}