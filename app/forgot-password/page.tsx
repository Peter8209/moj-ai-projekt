'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
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

function getResetRedirectUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  return `${window.location.origin}/reset-password`;
}

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setStatus('error');
      setMessage('Zadajte e-mailovú adresu.');
      return;
    }

    try {
      setStatus('loading');
      setMessage('');

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: getResetRedirectUrl(),
      });

      if (error) {
        throw error;
      }

      setStatus('sent');
      setMessage(
        'Ak je e-mail zaregistrovaný, poslali sme naň odkaz na obnovenie hesla.',
      );
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Odoslanie odkazu na obnovenie hesla zlyhalo.',
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
              Bezpečná obnova
            </div>

            <h1 className="mt-8 text-5xl font-black leading-tight tracking-tight">
              Zabudli ste heslo?
            </h1>

            <p className="mt-5 max-w-md text-base font-semibold leading-8 text-slate-300">
              Zadajte e-mail účtu. Pošleme vám bezpečný odkaz, cez ktorý si
              nastavíte nové heslo.
            </p>

            <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-bold leading-7 text-slate-300">
                Odkaz na obnovu hesla bude smerovať na stránku:
              </p>

              <code className="mt-3 block break-all rounded-2xl bg-black/35 px-4 py-3 text-xs font-bold text-violet-100">
                /reset-password
              </code>
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
                <Mail className="h-6 w-6" />
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Obnovenie hesla
              </h2>

              <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
                Funguje na mobile aj na webe. Po odoslaní skontrolujte aj spam
                alebo nevyžiadanú poštu.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-black text-slate-200"
                >
                  E-mail
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="vas@email.sk"
                  className="h-14 w-full rounded-2xl border border-white/10 bg-[#0b1020] px-4 text-base font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15"
                />
              </div>

              {message ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
                    status === 'sent'
                      ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
                      : 'border-red-400/25 bg-red-500/10 text-red-100'
                  }`}
                >
                  <div className="flex gap-2">
                    {status === 'sent' ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : null}

                    <span>{message}</span>
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-base font-black text-white shadow-xl shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Mail className="h-5 w-5" />
                )}

                {status === 'loading'
                  ? 'Odosielam odkaz...'
                  : 'Odoslať odkaz na obnovenie'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm font-semibold text-slate-500">
              Spomenuli ste si na heslo?{' '}
              <Link
                href="/login"
                className="font-black text-violet-300 hover:text-violet-200"
              >
                Prihlásiť sa
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}