'use client';

import { useState } from 'react';
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';
import ClientAccountProfile from './ClientAccountProfile';
import ProfileClient from './ProfileClient';

type ProfileTab = 'client' | 'work';

export default function ProfileTabsClient() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('client');

  return (
    <main className="profile-tabs-page min-h-screen bg-[#f4f7fb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/80">
          <div className="bg-gradient-to-r from-violet-50 via-white to-blue-50 p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-xl shadow-violet-300/60">
                  <UserCircle size={34} />
                </div>

                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-800 shadow-sm">
                    <ShieldCheck size={15} />
                    Profil Zedpera
                  </div>

                  <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                    Profil klienta a profil práce
                  </h1>

                  <p className="mt-2 max-w-4xl text-sm font-black leading-6 text-slate-700 sm:text-base">
                    V tejto sekcii je samostatne spracovaný klientsky účet,
                    aktívny balíček, aktivované služby a zároveň profil práce,
                    ktorý sa používa v AI chate, audite kvality, obhajobe,
                    zdrojoch a exportoch.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-2 shadow-inner sm:grid-cols-2 xl:min-w-[520px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('client')}
                  className={`profile-tab-button ${
                    activeTab === 'client'
                      ? 'profile-tab-button-active-client'
                      : 'profile-tab-button-inactive'
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <BriefcaseBusiness size={22} />
                  </span>

                  <span className="text-left">
                    <span className="block text-base font-black">
                      Profil klienta
                    </span>
                    <span className="mt-0.5 block text-xs font-black opacity-80">
                      Účet, balíček, aktivácie
                    </span>
                  </span>

                  {activeTab === 'client' && (
                    <CheckCircle2 className="ml-auto shrink-0" size={20} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('work')}
                  className={`profile-tab-button ${
                    activeTab === 'work'
                      ? 'profile-tab-button-active-work'
                      : 'profile-tab-button-inactive'
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <FileText size={22} />
                  </span>

                  <span className="text-left">
                    <span className="block text-base font-black">
                      Profil práce
                    </span>
                    <span className="mt-0.5 block text-xs font-black opacity-80">
                      Typ práce, štruktúra, citácie
                    </span>
                  </span>

                  {activeTab === 'work' && (
                    <CheckCircle2 className="ml-auto shrink-0" size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="profile-tab-content">
          {activeTab === 'client' ? <ClientAccountProfile /> : <ProfileClient />}
        </section>
      </div>

      <style jsx global>{`
        .profile-tabs-page,
        .profile-tabs-page * {
          opacity: 1 !important;
          visibility: visible !important;
          text-shadow: none !important;
          filter: none !important;
          mix-blend-mode: normal !important;
          -webkit-font-smoothing: antialiased !important;
          text-rendering: geometricPrecision !important;
        }

        .profile-tabs-page {
          background:
            radial-gradient(circle at 12% 0%, rgba(124, 58, 237, 0.10), transparent 30%),
            radial-gradient(circle at 88% 6%, rgba(37, 99, 235, 0.08), transparent 32%),
            linear-gradient(180deg, #ffffff 0%, #f4f7fb 48%, #eef4ff 100%) !important;
          color: #020617 !important;
        }

        .profile-tabs-page :where(h1, h2, h3, h4, h5, h6, strong, b) {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          font-weight: 950 !important;
          letter-spacing: -0.035em;
        }

        .profile-tabs-page :where(p, span, div, label, small, li) {
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
          font-weight: 800 !important;
        }

        .profile-tabs-page :where(.text-slate-300, .text-slate-400, .text-slate-500, .text-slate-600, .text-gray-400, .text-gray-500) {
          color: #334155 !important;
          -webkit-text-fill-color: #334155 !important;
          font-weight: 850 !important;
        }

        .profile-tab-button {
          min-height: 72px;
          display: inline-flex;
          align-items: center;
          gap: 0.85rem;
          border-radius: 1.35rem;
          padding: 0.9rem 1rem;
          border: 2px solid transparent;
          font-weight: 950;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .profile-tab-button:hover {
          transform: translateY(-1px);
        }

        .profile-tab-button,
        .profile-tab-button * {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          font-weight: 950 !important;
        }

        .profile-tab-button-active-client {
          background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%) !important;
          border-color: #a78bfa !important;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95) inset,
            0 18px 40px rgba(124, 58, 237, 0.18) !important;
        }

        .profile-tab-button-active-work {
          background: linear-gradient(135deg, #dbeafe 0%, #d1fae5 100%) !important;
          border-color: #93c5fd !important;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95) inset,
            0 18px 40px rgba(37, 99, 235, 0.16) !important;
        }

        .profile-tab-button-inactive {
          background: #ffffff !important;
          border-color: #e2e8f0 !important;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95) inset,
            0 10px 25px rgba(15, 23, 42, 0.07) !important;
        }

        .profile-tab-button-inactive:hover {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
        }

        .profile-tab-content > main {
          min-height: auto !important;
          background: transparent !important;
          padding: 0 !important;
        }

        .profile-tab-content input,
        .profile-tab-content textarea,
        .profile-tab-content select {
          background: #ffffff !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          border-color: #cbd5e1 !important;
          font-weight: 850 !important;
        }

        .profile-tab-content input::placeholder,
        .profile-tab-content textarea::placeholder {
          color: #64748b !important;
          -webkit-text-fill-color: #64748b !important;
          opacity: 1 !important;
          font-weight: 800 !important;
        }

        .profile-tab-content button,
        .profile-tab-content a[class*='rounded'] {
          font-weight: 950 !important;
        }

        .profile-tab-content svg {
          opacity: 1 !important;
          visibility: visible !important;
          filter: none !important;
        }

        @media (max-width: 640px) {
          .profile-tab-button {
            min-height: 68px;
            padding: 0.85rem;
          }

          .profile-tab-button span.block.text-base {
            font-size: 0.92rem;
          }
        }
      `}</style>
    </main>
  );
}