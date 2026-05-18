'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  MailCheck,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import ThemeToggleButton from '@/components/ThemeToggleButton';

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-[#020617] dark:text-white">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-[#020617]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-xl font-black tracking-tight">
            ZEDPERA
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggleButton />

            <Link
              href="/login"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
            >
              Prihlásenie
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-5 py-20">
        <div className="absolute left-1/2 top-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-800/30" />

        <div className="relative mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-200/70 transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/40 md:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/10">
              <CheckCircle2 size={44} />
            </div>

            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-100">
              <Sparkles size={17} />
              Platba bola úspešná
            </div>

            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 dark:text-white md:text-5xl">
              Ďakujeme! Už stačí iba aktivovať prístup cez e-mail.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 md:text-lg">
              Vaša platba prebehla úspešne. Na e-mail, ktorý ste zadali pri platbe,
              sme odoslali informácie k aktivácii účtu a ďalšiemu postupu.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <StepCard
                number="1"
                icon={<MailCheck size={28} />}
                title="Skontrolujte e-mail"
                text="Otvorte svoju e-mailovú schránku a nájdite správu od ZEDPERA."
              />

              <StepCard
                number="2"
                icon={<UserCheck size={28} />}
                title="Aktivujte prístup"
                text="Kliknite na aktivačný odkaz alebo sa prihláste do svojho účtu."
              />

              <StepCard
                number="3"
                icon={<ShieldCheck size={28} />}
                title="Začnite pracovať"
                text="Po aktivácii môžete vytvoriť profil práce a používať AI moduly."
              />
            </div>

            <div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-left text-sm leading-7 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
              <strong>Dôležité:</strong> Ak e-mail nevidíte do niekoľkých minút,
              skontrolujte priečinok Spam, Reklamy alebo Hromadné správy.
            </div>

            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-7 py-4 text-sm font-black text-white shadow-xl shadow-violet-900/25 transition hover:opacity-90"
              >
                Prejsť na prihlásenie
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
              >
                Otvoriť dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StepCard({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left shadow-sm transition-colors duration-300 dark:border-white/10 dark:bg-[#020617]/60">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          {icon}
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white dark:bg-white dark:text-slate-950">
          {number}
        </div>
      </div>

      <h3 className="mt-5 text-lg font-black text-slate-950 dark:text-white">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
        {text}
      </p>
    </div>
  );
}