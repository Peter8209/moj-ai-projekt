import { Suspense } from 'react';
import AuditClient from './AuditClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function AuditPageLoading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-emerald-500/20" />

              <div className="min-w-0 flex-1">
                <div className="h-8 w-72 max-w-full animate-pulse rounded-xl bg-white/10" />
                <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-xl bg-white/10" />
                <div className="mt-2 h-4 w-full max-w-xl animate-pulse rounded-xl bg-white/10" />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="h-11 w-32 animate-pulse rounded-2xl bg-white/10" />
              <div className="h-11 w-32 animate-pulse rounded-2xl bg-white/10" />
              <div className="h-11 w-28 animate-pulse rounded-2xl bg-white/10" />
            </div>
          </div>

          <div className="mb-4 h-20 animate-pulse rounded-2xl bg-emerald-500/10" />

          <div className="grid gap-4 md:grid-cols-4">
            <div className="h-12 animate-pulse rounded-2xl bg-white/10 md:col-span-2" />
            <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[18rem_1fr]">
            <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
          </div>

          <div className="mt-4 h-28 animate-pulse rounded-2xl bg-white/10" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="h-5 w-44 animate-pulse rounded-xl bg-white/10" />
              <div className="h-7 w-20 animate-pulse rounded-full bg-white/10" />
            </div>

            <div className="h-[520px] animate-pulse rounded-2xl bg-white/10" />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="h-3 w-28 animate-pulse rounded-xl bg-white/10" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded-xl bg-white/10" />
              </div>

              <div className="h-11 w-40 animate-pulse rounded-2xl bg-emerald-500/30" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="h-5 w-40 animate-pulse rounded-xl bg-white/10" />
              <div className="h-8 w-28 animate-pulse rounded-xl bg-white/10" />
            </div>

            <div className="h-[520px] animate-pulse rounded-2xl bg-white/10" />
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<AuditPageLoading />}>
      <AuditClient />
    </Suspense>
  );
}