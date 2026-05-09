import { Suspense } from 'react';
import AuditClient from './AuditClient';

export const dynamic = 'force-dynamic';

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-white">
          <section className="mx-auto max-w-6xl px-6 py-8">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
              <div className="h-7 w-64 animate-pulse rounded-xl bg-white/10" />
              <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded-xl bg-white/10" />
              <div className="mt-8 grid gap-4 md:grid-cols-4">
                <div className="h-12 animate-pulse rounded-2xl bg-white/10 md:col-span-2" />
                <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
                <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
              </div>
            </div>
          </section>
        </main>
      }
    >
      <AuditClient />
    </Suspense>
  );
}