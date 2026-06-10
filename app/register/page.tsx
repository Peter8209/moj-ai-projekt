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

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function saveConsentToDatabase(params: {
    cleanEmail: string;
    cleanName: string;
  }) {
    try {
      await fetch('/api/marketing-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: params.cleanName,
          email: params.cleanEmail,
          source: 'registration',
          planId: selectedPlan,
          termsAccepted,
          marketingConsent,
          termsConsentText:
            'Súhlasím s obchodnými podmienkami a beriem na vedomie spracovanie osobných údajov.',
          marketingConsentText:
            'Súhlasím so zasielaním marketingových e-mailov, noviniek a ponúk služby Zedpera na uvedenú e-mailovú adresu. Súhlas môžem kedykoľvek odvolať.',
        }),
      });
    } catch (error) {
      console.error('Nepodarilo sa uložiť marketingový súhlas:', error);
    }
  }

  async function registerUser() {
    if (isSubmitting) return;

    if (!name.trim() || !email.trim() || !password.trim()) {
      setConsentError('Vyplň meno, e-mail a heslo.');
      return;
    }

    if (!email.includes('@')) {
      setConsentError('Zadaj platnú e-mailovú adresu.');
      return;
    }

    if (!termsAccepted) {
      setConsentError(
        'Pre registráciu je potrebné súhlasiť s obchodnými podmienkami.',
      );
      return;
    }

    setConsentError('');
    setIsSubmitting(true);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    try {
      localStorage.setItem('zedpera_user_name', cleanName);
      localStorage.setItem('zedpera_user_email', cleanEmail);
      localStorage.setItem('zedpera_email', cleanEmail);
      localStorage.setItem('user_email', cleanEmail);
      localStorage.setItem('zedpera_user_plan', selectedPlan);
      localStorage.setItem('zedpera_user_role', 'user');
      localStorage.setItem('zedpera_is_logged_in', 'true');

      localStorage.setItem('zedpera_terms_accepted', 'true');
      localStorage.setItem(
        'zedpera_terms_accepted_at',
        new Date().toISOString(),
      );

      localStorage.setItem(
        'zedpera_marketing_consent',
        marketingConsent ? 'true' : 'false',
      );

      if (marketingConsent) {
        localStorage.setItem(
          'zedpera_marketing_consent_at',
          new Date().toISOString(),
        );
      }

      await saveConsentToDatabase({
        cleanEmail,
        cleanName,
      });

      window.location.href = `/dashboard?registered=true&plan=${encodeURIComponent(
        selectedPlan,
      )}`;
    } catch (error) {
      console.error(error);
      setConsentError(
        'Registráciu sa nepodarilo dokončiť. Skúste to prosím znova.',
      );
      setIsSubmitting(false);
    }
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

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-200">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-slate-950 accent-indigo-500"
                required
              />

              <span>
                Súhlasím s{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-bold text-indigo-300 underline underline-offset-4 hover:text-indigo-200"
                >
                  obchodnými podmienkami
                </Link>{' '}
                a beriem na vedomie spracovanie osobných údajov.
                <span className="ml-1 font-bold text-red-300">*</span>
              </span>
            </label>

            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-300">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(event) =>
                  setMarketingConsent(event.target.checked)
                }
                className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-slate-950 accent-indigo-500"
              />

              <span>
                Súhlasím so zasielaním marketingových e-mailov, noviniek a
                ponúk služby Zedpera na uvedenú e-mailovú adresu. Súhlas môžem
                kedykoľvek odvolať.
              </span>
            </label>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Pole označené hviezdičkou je povinné. Marketingový súhlas je
              dobrovoľný a nie je podmienkou registrácie.
            </p>
          </div>

          {consentError ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {consentError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={registerUser}
            disabled={isSubmitting}
            className="w-full rounded-full bg-indigo-600 px-5 py-4 font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'Registrujem...'
              : 'Registrovať sa a vstúpiť do aplikácie'}
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