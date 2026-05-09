'use client';

import Link from 'next/link';
import { useState } from 'react';

const ADMIN_EMAIL = 'admin@zedpera.com';
const ADMIN_PASSWORD = 'admin123';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function loginUser() {
    if (!email || !password) {
      alert('Vyplň e-mail a heslo.');
      return;
    }

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem('zedpera_user_email', email);
      localStorage.setItem('zedpera_user_name', 'Admin');
      localStorage.setItem('zedpera_user_role', 'admin');
      localStorage.setItem('zedpera_user_plan', 'admin-free');
      localStorage.setItem('zedpera_is_logged_in', 'true');
      localStorage.setItem('zedpera_admin_free', 'true');

      window.location.href = '/dashboard?mode=admin-free';
      return;
    }

    localStorage.setItem('zedpera_user_email', email);
    localStorage.setItem('zedpera_user_name', email);
    localStorage.setItem('zedpera_user_role', 'user');
    localStorage.setItem('zedpera_user_plan', 'free');
    localStorage.setItem('zedpera_is_logged_in', 'true');

    window.location.href = '/dashboard?login=success';
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 className="text-3xl font-black">Prihlásenie</h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Prihlás sa do používateľského alebo admin menu ZEDPERA.
        </p>

        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <div className="font-black">Test admin údaje:</div>
          <div className="mt-1">E-mail: admin@zedpera.com</div>
          <div>Heslo: admin123</div>
        </div>

        <div className="mt-8 space-y-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            type="email"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Heslo"
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
          />

          <button
            onClick={loginUser}
            className="w-full rounded-full bg-indigo-600 px-5 py-4 font-black text-white hover:bg-indigo-700"
          >
            Prihlásiť sa do aplikácie
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          Nemáš účet?{' '}
          <Link href="/register" className="font-bold text-indigo-300">
            Registrovať sa
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