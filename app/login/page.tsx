'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Menu,
  Sparkles,
} from 'lucide-react';

const ADMIN_EMAIL = 'admin@zedpera.com';
const ADMIN_PASSWORD = 'admin123';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goToMenu = () => {
    router.push('/');
  };

  const goToDashboard = () => {
    router.push('/dashboard');
  };

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
      return;
    }

    try {
      setLoading(true);

      if (cleanEmail === ADMIN_EMAIL && cleanPassword === ADMIN_PASSWORD) {
        saveLoginData({
          userEmail: cleanEmail,
          userName: 'Admin',
          role: 'admin',
          plan: 'admin-free',
          adminFree: true,
        });

        router.push('/dashboard?mode=admin-free');
        return;
      }

      saveLoginData({
        userEmail: cleanEmail,
        userName: cleanEmail,
        role: 'user',
        plan: 'free',
      });

      router.push('/dashboard?login=success');
    } catch {
      setError('Prihlásenie zlyhalo. Skús to znova.');
    } finally {
      setLoading(false);
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

    router.push('/dashboard?demo=true');
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020617] text-white">
      {/* TOP BAR */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={goToMenu}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
          >
            <Menu size={18} />
            Menu
          </button>

          <div className="hidden text-sm font-semibold text-slate-400 sm:block">
            Prihlásenie do ZEDPERA
          </div>

          <button
            type="button"
            onClick={goToDashboard}
            className="inline-flex items-center gap-2 rounded-2xl border border-purple-400/30 bg-purple-600/20 px-4 py-2 text-sm font-bold text-purple-100 transition hover:bg-purple-600/30"
          >
            <ArrowLeft size={18} />
            Dashboard
          </button>
        </div>
      </header>

      <section className="relative flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-10 h-[320px] w-[320px] rounded-full bg-indigo-600/20 blur-3xl" />

        <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          {/* LEFT INFO */}
          <div className="hidden lg:block">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-bold text-purple-200">
              <Sparkles size={17} />
              AI akademický asistent
            </div>

            <h1 className="text-5xl font-black leading-tight">
              Prihlás sa a pokračuj v práci.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              ZEDPERA ti pomôže s písaním, kontrolou kvality, citáciami,
              obhajobou a spätnou väzbou k akademickej práci.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-2 gap-4">
              <InfoCard title="AI písanie" text="Generovanie kapitol a textov." />
              <InfoCard title="AI vedúci" text="Kritická spätná väzba." />
              <InfoCard title="Citácie" text="Zdroje a odborný aparát." />
              <InfoCard title="Obhajoba" text="Otázky a prezentácia." />
            </div>
          </div>

          {/* LOGIN CARD */}
          <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-lg">
                <GraduationCap size={28} />
              </div>

              <div>
                <h1 className="text-3xl font-black">
                  Prihlásenie
                </h1>

                <p className="text-sm font-semibold text-slate-400">
                  ZEDPERA účet
                </p>
              </div>
            </div>

            <p className="text-sm leading-6 text-slate-400">
              Prihlás sa do používateľského alebo admin menu ZEDPERA.
            </p>

            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <div className="font-black">Test admin údaje:</div>
              <div className="mt-1">E-mail: admin@zedpera.com</div>
              <div>Heslo: admin123</div>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
                {error}
              </div>
            )}

            <div className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-300">
                  E-mail
                </span>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 focus-within:border-purple-400">
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
                    className="w-full bg-transparent text-white outline-none placeholder:text-slate-600"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-300">
                  Heslo
                </span>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 focus-within:border-purple-400">
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
                    className="w-full bg-transparent text-white outline-none placeholder:text-slate-600"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="text-slate-500 transition hover:text-white"
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
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 font-black text-white transition hover:bg-white/20"
              >
                Vyskúšať Zedperu bez prihlásenia
              </button>
            </div>

            <div className="mt-6 text-center text-sm text-slate-400">
              Nemáš účet?{' '}
              <Link href="/register" className="font-bold text-purple-300 hover:text-purple-200">
                Registrovať sa
              </Link>
            </div>

            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-slate-500 hover:text-white">
                Späť na úvodnú stránku
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <div className="font-black text-white">
        {title}
      </div>

      <div className="mt-1 text-sm text-slate-400">
        {text}
      </div>
    </div>
  );
}