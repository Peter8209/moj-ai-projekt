'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/blog');
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#020617] px-4 text-white">
      <section className="rounded-[2rem] border border-white/10 bg-[#0f172a] p-8 text-center shadow-2xl shadow-black/40">
        <h1 className="text-2xl font-black text-white">
          Presmerovanie...
        </h1>

        <p className="mt-3 text-sm font-semibold text-slate-300">
          Presmerovávam vás do admin blogu.
        </p>
      </section>
    </main>
  );
}