'use client';

import Link from 'next/link';
import { LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

type ClientProfileInfo = {
  name: string;
  email: string;
  initials: string;
  plan: string;
};

function getClientInitials(name: string, email: string) {
  const source = name || email || 'Klient';

  const parts = source
    .replace(/@.*$/, '')
    .split(/[.\s_-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function safeJsonParse(value: string | null): Record<string, unknown> {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return {};
  } catch {
    return {};
  }
}

function readClientProfileFromStorage(): ClientProfileInfo {
  if (typeof window === 'undefined') {
    return {
      name: 'Klient',
      email: '',
      initials: 'K',
      plan: 'Zedpera',
    };
  }

  const storedUser =
    safeJsonParse(localStorage.getItem('zedpera_user')) ||
    safeJsonParse(localStorage.getItem('user')) ||
    safeJsonParse(localStorage.getItem('profile'));

  const email = String(
    storedUser.email ||
      storedUser.userEmail ||
      storedUser.mail ||
      localStorage.getItem('zedpera_user_email') ||
      localStorage.getItem('zedpera_email') ||
      localStorage.getItem('user_email') ||
      localStorage.getItem('email') ||
      '',
  ).trim();

  const rawName = String(
    storedUser.name ||
      storedUser.fullName ||
      storedUser.full_name ||
      storedUser.displayName ||
      storedUser.username ||
      localStorage.getItem('zedpera_user_name') ||
      localStorage.getItem('user_name') ||
      '',
  ).trim();

  const name = rawName || (email ? email.split('@')[0] : 'Klient');

  const plan = String(
    storedUser.plan ||
      storedUser.subscription ||
      storedUser.subscriptionPlan ||
      storedUser.packageName ||
      localStorage.getItem('zedpera_plan') ||
      localStorage.getItem('subscription_plan') ||
      localStorage.getItem('plan') ||
      'Zedpera',
  ).trim();

  return {
    name,
    email,
    plan: plan || 'Zedpera',
    initials: getClientInitials(name, email),
  };
}

function clearClientStorage() {
  if (typeof window === 'undefined') return;

  const keysToRemove = [
    'zedpera_user',
    'zedpera_user_email',
    'zedpera_email',
    'zedpera_user_name',
    'zedpera_plan',
    'user',
    'profile',
    'user_email',
    'email',
    'user_name',
    'subscription_plan',
    'plan',
    'auth_token',
    'access_token',
    'refresh_token',
    'token',
    'jwt',
    'session',
  ];

  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // bezpečné ignorovanie
    }
  });
}

export default function ClientAccountPanel() {
  const [clientProfileInfo, setClientProfileInfo] =
    useState<ClientProfileInfo>({
      name: 'Klient',
      email: '',
      initials: 'K',
      plan: 'Zedpera',
    });

  useEffect(() => {
    const refreshClientProfile = () => {
      setClientProfileInfo(readClientProfileFromStorage());
    };

    refreshClientProfile();

    window.addEventListener('storage', refreshClientProfile);
    window.addEventListener(
      'zedpera-client-profile-change',
      refreshClientProfile,
    );

    return () => {
      window.removeEventListener('storage', refreshClientProfile);
      window.removeEventListener(
        'zedpera-client-profile-change',
        refreshClientProfile,
      );
    };
  }, []);

  const logoutClient = async () => {
    const confirmed = window.confirm('Naozaj sa chcete odhlásiť?');

    if (!confirmed) return;

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => null);
    } finally {
      clearClientStorage();
      window.location.href = '/login';
    }
  };

  return (
    <div className="mt-auto border-t border-white/10 px-4 pb-5 pt-4">
      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-sm font-black text-white shadow-lg shadow-violet-900/30">
            {clientProfileInfo.initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-white">
              {clientProfileInfo.name}
            </div>

            <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-400">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {clientProfileInfo.email || 'E-mail nie je dostupný'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {clientProfileInfo.plan || 'Aktívny program'}
          </span>
        </div>
      </div>

      <div className="grid gap-2">
        <Link
          href="/profile"
          className="group flex min-h-[44px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-black text-slate-100 transition hover:border-violet-400/40 hover:bg-violet-600/20 hover:text-white"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-violet-200 transition group-hover:bg-violet-600 group-hover:text-white">
            <UserRound className="h-4 w-4" />
          </span>

          <span className="min-w-0 flex-1 truncate">Profil klienta</span>
        </Link>

        <button
          type="button"
          onClick={logoutClient}
          className="group flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-left text-sm font-black text-red-200 transition hover:border-red-400/50 hover:bg-red-500/20 hover:text-white"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-200 transition group-hover:bg-red-600 group-hover:text-white">
            <LogOut className="h-4 w-4" />
          </span>

          <span className="min-w-0 flex-1 truncate">Odhlásiť sa</span>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between px-1 text-[11px] font-bold text-slate-500">
        <span>© 2026 Zedpera</span>
        <span>v1.0</span>
      </div>
    </div>
  );
}