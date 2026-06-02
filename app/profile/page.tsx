'use client';

import { useState } from 'react';
import { BriefcaseBusiness, FileText, UserCircle } from 'lucide-react';
import ClientAccountProfile from './ClientAccountProfile';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

type ProfileTab = 'client' | 'work';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('client');

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-800">
                <UserCircle size={15} />
                Profil
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Profil klienta a profil práce
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-700">
                V tejto časti je samostatne profil klienta s balíčkom a zároveň
                profil práce, ktorý sa používa v AI chate, audite, obhajobe a
                exportoch.
              </p>
            </div>

            <div className="grid gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveTab('client')}
                className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition ${
                  activeTab === 'client'
                    ? 'bg-white text-violet-900 shadow-lg shadow-slate-200/80'
                    : 'text-slate-600 hover:bg-white hover:text-slate-950'
                }`}
              >
                <BriefcaseBusiness size={18} />
                Profil klienta
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('work')}
                className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition ${
                  activeTab === 'work'
                    ? 'bg-white text-blue-900 shadow-lg shadow-slate-200/80'
                    : 'text-slate-600 hover:bg-white hover:text-slate-950'
                }`}
              >
                <FileText size={18} />
                Profil práce
              </button>
            </div>
          </div>
        </section>

        {activeTab === 'client' ? <ClientAccountProfile /> : <ProfileClient />}
      </div>
    </main>
  );
}