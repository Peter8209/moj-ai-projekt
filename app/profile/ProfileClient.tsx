'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileText,
  LogOut,
  PlayCircle,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type ProfileData = {
  user: {
    id: string;
    email: string;
  };
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    country: string | null;
    currency: string | null;
    plan: string | null;
    video_tutorial_seen: boolean | null;
    created_at: string;
  } | null;
};

export default function ProfileClient() {
  const router = useRouter();

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [error, setError] = useState('');

  async function loadProfile() {
    setLoading(true);
    setError('');

    try {
      await fetch('/api/profile/init', {
        method: 'POST',
      });

      const res = await fetch('/api/profile/me', {
        method: 'GET',
        cache: 'no-store',
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Profil sa nepodarilo načítať.');
      }

      setData(json);
    } catch (err: any) {
      setError(err.message || 'Nastala chyba pri načítaní profilu.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'ZMAZAŤ') {
      setError('Pre potvrdenie napíšte presne: ZMAZAŤ');
      return;
    }

    const confirmed = window.confirm(
      'Naozaj chcete zrušiť účet? Táto akcia vymaže profil aj dokumenty a nedá sa vrátiť späť.'
    );

    if (!confirmed) return;

    setDeleting(true);
    setError('');

    try {
      const res = await fetch('/api/profile/delete-account', {
        method: 'DELETE',
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Účet sa nepodarilo odstrániť.');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Nastala chyba pri rušení účtu.');
    } finally {
      setDeleting(false);
    }
  }

  async function logout() {
    await fetch('/auth/signout', {
      method: 'POST',
    });

    router.push('/');
    router.refresh();
  }

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 dark:bg-[#020617] dark:text-white">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
            Načítavam profil používateľa...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 transition-colors dark:bg-[#020617] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950">
              <User className="h-6 w-6" />
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Používateľ
              </div>
              <div className="break-all text-sm font-bold">
                {data?.user.email}
              </div>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            <a
              href="/dashboard"
              className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Dashboard
            </a>

            <a
              href="/profile"
              className="block rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
            >
              Profil
            </a>

            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Odhlásiť sa
            </button>
          </nav>
        </aside>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  Profil používateľa
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Tu sa nachádza používateľské konto, prihlásenie, plán,
                  mena, história služieb a bezpečnostné nastavenia.
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                Konto aktívne
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <InfoCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Bezpečné prihlásenie"
              text="Každý používateľ sa prihlasuje do vlastného účtu. Dáta sú filtrované podľa ID prihláseného používateľa."
            />

            <InfoCard
              icon={<FileText className="h-5 w-5" />}
              title="Vlastné dokumenty"
              text="Používateľ vidí iba svoje dokumenty, výstupy, históriu a nastavenia."
            />

            <InfoCard
              icon={<CreditCard className="h-5 w-5" />}
              title="Plán a platby"
              text={`Aktuálny plán: ${data?.profile?.plan || 'free'} | Mena: ${
                data?.profile?.currency || 'EUR'
              }`}
            />

            <InfoCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Stav konta"
              text={`E-mail: ${data?.user.email || ''}`}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <PlayCircle className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              <h2 className="text-xl font-black">Video návod</h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Video návod bude vložený po finálnom odsúhlasení vnútorného
              rozhrania. Používateľ ho uvidí priamo vo svojom profile.
            </p>

            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-black/30">
              <div className="flex aspect-video items-center justify-center">
                <div className="text-center">
                  <PlayCircle className="mx-auto h-14 w-14 text-slate-400" />
                  <div className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                    Video návod bude doplnený po schválení systému
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-500/30 dark:bg-red-500/10">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-300" />
              <h2 className="text-xl font-black text-red-700 dark:text-red-200">
                Zrušenie účtu
              </h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-red-700 dark:text-red-200">
              Po zrušení účtu sa odstráni používateľský profil, nahrané
              dokumenty a súvisiace dáta používateľa. Táto akcia je
              nezvratná.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Pre potvrdenie napíšte: ZMAZAŤ"
                className="min-h-[48px] flex-1 rounded-2xl border border-red-200 bg-white px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-red-400 dark:border-red-500/30 dark:bg-black/30 dark:text-white"
              />

              <button
                onClick={deleteAccount}
                disabled={deleting}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Odstraňujem...' : 'Zrušiť účet'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white">
          {icon}
        </div>
        <h3 className="font-black">{title}</h3>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {text}
      </p>
    </div>
  );
}