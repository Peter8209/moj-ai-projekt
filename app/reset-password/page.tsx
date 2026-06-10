'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Chýba NEXT_PUBLIC_SUPABASE_URL alebo NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

function validatePassword(password: string) {
  if (password.length < 8) {
    return 'Heslo musí mať aspoň 8 znakov.';
  }

  if (!/[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]/.test(password)) {
    return 'Heslo musí obsahovať aspoň jedno veľké písmeno.';
  }

  if (!/[a-záäčďéíľĺňóôŕšťúýž]/.test(password)) {
    return 'Heslo musí obsahovať aspoň jedno malé písmeno.';
  }

  if (!/[0-9]/.test(password)) {
    return 'Heslo musí obsahovať aspoň jedno číslo.';
  }

  return '';
}

export default function ResetPasswordPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [status, setStatus] = useState<
    'checking' | 'idle' | 'loading' | 'success' | 'error'
  >('checking');
  const [message, setMessage] = useState(
    'Kontrolujem platnosť odkazu na obnovenie hesla...',
  );

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      if (data.session) {
        setSessionReady(true);
        setStatus('idle');
        setMessage('');
        return;
      }

      setStatus('error');
      setMessage(
        'Odkaz na obnovenie hesla nie je platný alebo už vypršal. Požiadajte o nový odkaz.',
      );
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(true);
        setStatus('idle');
        setMessage('');
      }
    });

    window.setTimeout(checkSession, 400);

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanPassword = password.trim();
    const cleanPasswordAgain = passwordAgain.trim();

    if (!sessionReady) {
      setStatus('error');
      setMessage(
        'Odkaz na obnovenie hesla nie je pripravený. Otvorte stránku priamo z e-mailu.',
      );
      return;
    }

    const validationMessage = validatePassword(cleanPassword);

    if (validationMessage) {
      setStatus('error');
      setMessage(validationMessage);
      return;
    }

    if (cleanPassword !== cleanPasswordAgain) {
      setStatus('error');
      setMessage('Heslá sa nezhodujú.');
      return;
    }

    try {
      setStatus('loading');
      setMessage('');

      const { error } = await supabase.auth.updateUser({
        password: cleanPassword,
      });

      if (error) {
        throw error;
      }

      setStatus('success');
      setMessage('Heslo bolo úspešne zmenené. Teraz sa môžete prihlásiť.');
      setPassword('');
      setPasswordAgain('');

      window.setTimeout(() => {
        window.location.href = '/login?password=changed';
      }, 1400);
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Heslo sa nepodarilo zmeniť.',
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-700/25 blur-3xl" />
        <div className="absolute bottom-[-160px] right-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-600/15 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#070b18]/95 shadow-2xl shadow-black/50 backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">
          <div className="hidden border-r border-white/10 bg-gradient-to-br from-violet-600/20 via-[#070b18] to-cyan-600/10 p-10 lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-100">
              <ShieldCheck className="h-4 w-4" />
              Nové heslo
            </div>

            <h1 className="mt-8 text-5xl font-black leading-tight tracking-tight">
              Nastavte nové heslo
            </h1>

            <p className="mt-5 max-w-md text-base font-semibold leading-8 text-slate-300">
              Po kliknutí na odkaz z e-mailu si nastavíte nové bezpečné heslo
              pre svoj účet.
            </p>

            <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-bold leading-7 text-slate-300">
                Odporúčanie:
              </p>

              <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-300">
                <li>• minimálne 8 znakov,</li>
                <li>• veľké a malé písmeno,</li>
                <li>• aspoň jedno číslo,</li>
                <li>• nepoužívajte staré heslo.</li>
              </ul>
            </div>
          </div>

          <div className="p-5 sm:p-8 lg:p-10">
            <Link
              href="/login"
              className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-slate-200 transition hover:bg-white/[0.12] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Späť na prihlásenie
            </Link>

            <div className="mb-7">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-950/40">
                <KeyRound className="h-6 w-6" />
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Obnova hesla
              </h2>

              <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
                Táto stránka je responzívna pre mobil aj desktop.
              </p>
            </div>

            {status === 'checking' ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-sm font-bold text-slate-200">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
                  {message}
                </div>
              </div>
            ) : null}

            {status !== 'checking' ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-black text-slate-200"
                  >
                    Nové heslo
                  </label>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Zadajte nové heslo"
                      className="h-14 w-full rounded-2xl border border-white/10 bg-[#0b1020] pl-12 pr-14 text-base font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                      aria-label={
                        showPassword ? 'Skryť heslo' : 'Zobraziť heslo'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="passwordAgain"
                    className="mb-2 block text-sm font-black text-slate-200"
                  >
                    Zopakovať nové heslo
                  </label>

                  <input
                    id="passwordAgain"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordAgain}
                    onChange={(event) => setPasswordAgain(event.target.value)}
                    placeholder="Zopakujte nové heslo"
                    className="h-14 w-full rounded-2xl border border-white/10 bg-[#0b1020] px-4 text-base font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15"
                  />
                </div>

                {message ? (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
                      status === 'success'
                        ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
                        : 'border-red-400/25 bg-red-500/10 text-red-100'
                    }`}
                  >
                    <div className="flex gap-2">
                      {status === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : null}

                      <span>{message}</span>
                    </div>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={status === 'loading' || !sessionReady}
                  className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-base font-black text-white shadow-xl shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === 'loading' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <KeyRound className="h-5 w-5" />
                  )}

                  {status === 'loading' ? 'Ukladám heslo...' : 'Zmeniť heslo'}
                </button>
              </form>
            ) : null}

            <p className="mt-6 text-center text-sm font-semibold text-slate-500">
              Potrebujete nový odkaz?{' '}
              <Link
                href="/forgot-password"
                className="font-black text-violet-300 hover:text-violet-200"
              >
                Poslať znova
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}