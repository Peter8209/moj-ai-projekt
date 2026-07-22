"use client";

import { ArrowLeft, RefreshCcw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export default function ModulePageFrame({
  title,
  loading,
  warning,
  onRefresh,
  children,
}: {
  title: string;
  loading: boolean;
  warning: string;
  onRefresh: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#050711] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="mb-5 flex flex-col gap-3 rounded-3xl border border-white/10 bg-[#080b16] p-4 shadow-xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-black text-violet-200 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Späť na dashboard
            </Link>
            <h1 className="mt-2 text-xl font-black sm:text-2xl">{title}</h1>
          </div>

          <button
            type="button"
            onClick={() => void onRefresh()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-white transition hover:bg-white/[0.12]"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Obnoviť limity
          </button>
        </header>

        {warning ? (
          <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm font-bold leading-6 text-amber-100">
            {warning}
          </div>
        ) : null}

        {children}
      </div>
    </main>
  );
}
