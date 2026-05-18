import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 transition-colors duration-300 dark:bg-[#020617] dark:text-white">
      <section className="mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-2xl transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300">
            <XCircle className="h-11 w-11" />
          </div>

          <p className="mb-3 text-sm font-black uppercase tracking-[0.28em] text-red-600 dark:text-red-300">
            Platba zrušená
          </p>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Platba nebola dokončená
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">
            Platba bola zrušená alebo sa nepodarilo dokončiť platobný proces.
            Môžete sa vrátiť späť na cenník a skúsiť platbu znova.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-7 py-4 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Skúsiť znova
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-7 py-4 text-sm font-black text-slate-800 transition hover:bg-slate-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
            >
              Späť na úvod
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}