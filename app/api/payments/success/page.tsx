import Link from 'next/link';
import { CheckCircle2, Mail, ShieldCheck, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

type PaymentSuccessPageProps = {
  searchParams?: Promise<{
    session_id?: string;
  }>;
};

export default async function PaymentSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const params = searchParams ? await searchParams : {};
  const sessionId = params?.session_id;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 transition-colors duration-300 dark:bg-[#020617] dark:text-white">
      <section className="mx-auto flex min-h-[80vh] max-w-4xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="text-lg font-black tracking-tight text-slate-950 dark:text-white"
              >
                Zedpera
              </Link>

              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                Platba úspešná
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle2 className="h-11 w-11" />
            </div>

            <div className="text-center">
              <p className="mb-3 text-sm font-black uppercase tracking-[0.28em] text-emerald-600 dark:text-emerald-300">
                Ďakujeme za úhradu
              </p>

              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                Váš účet Zedpera je aktivovaný
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
                Vaša platba bola úspešne prijatá. Teraz môžete využívať funkcie
                svojho balíka v aplikácii Zedpera.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.03]">
                <ShieldCheck className="mb-4 h-7 w-7 text-emerald-600 dark:text-emerald-300" />
                <h2 className="font-black">Prístup aktivovaný</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Platené funkcie sa aktivujú automaticky podľa uhradeného
                  balíka.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.03]">
                <Mail className="mb-4 h-7 w-7 text-blue-600 dark:text-blue-300" />
                <h2 className="font-black">Potvrdenie e-mailom</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Potvrdenie o platbe bude odoslané na e-mail uvedený pri
                  platbe.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.03]">
                <Sparkles className="mb-4 h-7 w-7 text-violet-600 dark:text-violet-300" />
                <h2 className="font-black">AI nástroje</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Môžete začať používať AI písanie, AI Vedúceho, audit kvality
                  a zdroje.
                </p>
              </div>
            </div>

            {sessionId ? (
              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                <span className="font-bold">ID platobnej relácie:</span>{' '}
                {sessionId}
              </div>
            ) : null}

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-7 py-4 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Pokračovať do aplikácie
              </Link>

              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-7 py-4 text-sm font-black text-slate-800 transition hover:bg-slate-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
              >
                Nastaviť akademický profil
              </Link>
            </div>

            <p className="mx-auto mt-7 max-w-2xl text-center text-xs leading-6 text-slate-500 dark:text-slate-400">
              Ak sa prístup neaktivuje okamžite, počkajte niekoľko sekúnd a
              obnovte stránku. Platbu potvrdzuje Stripe systém.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}