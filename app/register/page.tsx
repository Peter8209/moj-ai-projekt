'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function RegisterContent() {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan') || 'free';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function registerUser() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      alert('Vyplň meno, e-mail a heslo.');
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    localStorage.setItem('zedpera_user_name', cleanName);
    localStorage.setItem('zedpera_user_email', cleanEmail);
    localStorage.setItem('zedpera_email', cleanEmail);
    localStorage.setItem('user_email', cleanEmail);
    localStorage.setItem('zedpera_user_plan', selectedPlan);
    localStorage.setItem('zedpera_user_role', 'user');
    localStorage.setItem('zedpera_is_logged_in', 'true');

    window.location.href = `/dashboard?registered=true&plan=${encodeURIComponent(
      selectedPlan,
    )}`;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 className="text-3xl font-black">Registrácia</h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Vytvor si účet a pokračuj do aplikácie ZEDPERA.
        </p>

        <div className="mt-4 rounded-2xl bg-indigo-500/10 p-4 text-sm text-indigo-200">
          Vybraný balík: <strong>{selectedPlan}</strong>
        </div>

        <div className="mt-8 space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Meno"
            autoComplete="name"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-indigo-400"
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            type="email"
            autoComplete="email"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-indigo-400"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Heslo"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-indigo-400"
          />

          <button
            type="button"
            onClick={registerUser}
            className="w-full rounded-full bg-indigo-600 px-5 py-4 font-black text-white transition hover:bg-indigo-700"
          >
            Registrovať sa a vstúpiť do aplikácie
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          Už máš účet?{' '}
          <Link href="/login" className="font-bold text-indigo-300">
            Prihlásiť sa
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-white">
            Späť na úvodnú stránku
          </Link>
        </div>
      </div>
    </main>
  );
}

function RegisterFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 className="text-3xl font-black">Registrácia</h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Načítavam registračný formulár...
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterContent />
    </Suspense>
  );
}