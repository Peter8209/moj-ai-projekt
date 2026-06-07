'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  FileText,
  Lock,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  readTime: string;
  published: boolean;
};

const ADMIN_PASSWORD = 'ZEDPERA-BLOG-ADMIN-2026';
const STORAGE_KEY = 'zedpera_admin_blog_posts';
const SESSION_KEY = 'zedpera_blog_admin_logged_in';

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `blog_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function createEmptyPost(): BlogPost {
  const now = new Date().toISOString().slice(0, 10);

  return {
    id: createId(),
    slug: '',
    title: '',
    excerpt: '',
    content: '',
    category: 'Akademické písanie',
    date: now,
    readTime: '5 min čítania',
    published: false,
  };
}

function safeParsePosts(value: string | null): BlogPost[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item) => item && typeof item === 'object');
  } catch {
    return [];
  }
}

export default function AdminBlogPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [activePostId, setActivePostId] = useState('');

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    setLoggedIn(session === 'true');

    const storedPosts = safeParsePosts(localStorage.getItem(STORAGE_KEY));

    setPosts(storedPosts);
    setActivePostId(storedPosts[0]?.id || '');
  }, []);

  const activePost = useMemo(() => {
    return posts.find((post) => post.id === activePostId) || null;
  }, [activePostId, posts]);

  function login() {
    if (password.trim() !== ADMIN_PASSWORD) {
      setLoginError('Nesprávne admin heslo.');
      return;
    }

    localStorage.setItem(SESSION_KEY, 'true');
    setLoggedIn(true);
    setLoginError('');
    setPassword('');
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setLoggedIn(false);
    setPassword('');
    setLoginError('');
  }

  function savePosts(nextPosts: BlogPost[]) {
    setPosts(nextPosts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPosts));
  }

  function addPost() {
    const nextPost = createEmptyPost();
    const nextPosts = [nextPost, ...posts];

    savePosts(nextPosts);
    setActivePostId(nextPost.id);
  }

  function updateActivePost(field: keyof BlogPost, value: string | boolean) {
    if (!activePost) return;

    const nextPosts = posts.map((post) => {
      if (post.id !== activePost.id) return post;

      const nextPost = {
        ...post,
        [field]: value,
      };

      if (field === 'title' && !post.slug) {
        nextPost.slug = createSlug(String(value));
      }

      if (field === 'slug') {
        nextPost.slug = createSlug(String(value));
      }

      return nextPost;
    });

    savePosts(nextPosts);
  }

  function deletePost(id: string) {
    const confirmed = window.confirm('Naozaj chcete odstrániť tento článok?');

    if (!confirmed) return;

    const nextPosts = posts.filter((post) => post.id !== id);

    savePosts(nextPosts);
    setActivePostId(nextPosts[0]?.id || '');
  }

  if (!loggedIn) {
    return (
      <main className="min-h-dvh bg-[#020617] px-4 py-10 text-white">
        <section className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-[#0f172a] p-7 shadow-2xl shadow-black/40">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-600/20 text-violet-300">
            <Lock size={28} />
          </div>

          <h1 className="text-3xl font-black text-white">
            Admin blog
          </h1>

          <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
            Táto časť je určená iba pre administrátora. Zákazník na hlavnom
            webe vidí iba zverejnené články a nemá možnosť pridávať vlastný
            blog.
          </p>

          <label className="mt-6 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Admin heslo
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setLoginError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') login();
              }}
              className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400"
              placeholder="Zadajte admin heslo"
            />
          </label>

          {loginError ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
              {loginError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={login}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white transition hover:bg-violet-500"
          >
            <ShieldCheck size={18} />
            Prihlásiť admina
          </button>

          <Link
            href="/blog"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm font-black text-white transition hover:bg-white/[0.12]"
          >
            <ArrowLeft size={18} />
            Späť na blog
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#020617] text-white">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#020617]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-black text-white">
              Admin blog
            </h1>

            <p className="text-sm font-semibold text-slate-400">
              Správa článkov pre Zedpera blog
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white transition hover:bg-white/[0.12]"
            >
              <Eye size={18} />
              Zobraziť blog
            </Link>

            <button
              type="button"
              onClick={addPost}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500"
            >
              <Plus size={18} />
              Nový článok
            </button>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/20"
            >
              <LogOut size={18} />
              Odhlásiť
            </button>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="rounded-[2rem] border border-white/10 bg-[#0f172a] p-4 shadow-2xl shadow-black/30">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-white">
              Články
            </h2>

            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-black text-slate-300">
              {posts.length}
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm font-semibold leading-6 text-slate-400">
              Zatiaľ nie je vytvorený žiadny článok. Kliknite na tlačidlo
              „Nový článok“.
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setActivePostId(post.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    activePostId === post.id
                      ? 'border-violet-400 bg-violet-600/20'
                      : 'border-white/10 bg-black/30 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="font-black text-white">
                    {post.title || 'Bez názvu'}
                  </div>

                  <div className="mt-1 text-xs font-semibold text-slate-400">
                    {post.published ? 'Zverejnený' : 'Koncept'}
                  </div>

                  {post.slug ? (
                    <div className="mt-2 truncate text-xs font-semibold text-violet-300">
                      /blog/{post.slug}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="rounded-[2rem] border border-white/10 bg-[#0f172a] p-5 shadow-2xl shadow-black/30">
          {!activePost ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <FileText className="mb-4 text-violet-300" size={44} />

              <h2 className="text-2xl font-black text-white">
                Vyberte alebo vytvorte článok
              </h2>

              <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-400">
                Články sa pripravujú v admin časti. Na verejnom blogu sa
                zobrazia iba tie, ktoré označíte ako zverejnené.
              </p>

              <button
                type="button"
                onClick={addPost}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-500"
              >
                <Plus size={18} />
                Vytvoriť prvý článok
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <TextInput
                label="Názov článku"
                value={activePost.title}
                onChange={(value) => updateActivePost('title', value)}
                placeholder="Napríklad: Ako začať písať záverečnú prácu"
              />

              <TextInput
                label="URL slug"
                value={activePost.slug}
                onChange={(value) => updateActivePost('slug', value)}
                placeholder="ako-zacat-pisat-zaverecnu-pracu"
              />

              <TextInput
                label="Kategória"
                value={activePost.category}
                onChange={(value) => updateActivePost('category', value)}
                placeholder="Akademické písanie"
              />

              <div className="grid gap-5 md:grid-cols-2">
                <TextInput
                  label="Dátum"
                  value={activePost.date}
                  onChange={(value) => updateActivePost('date', value)}
                  placeholder="2026-06-07"
                />

                <TextInput
                  label="Čas čítania"
                  value={activePost.readTime}
                  onChange={(value) => updateActivePost('readTime', value)}
                  placeholder="5 min čítania"
                />
              </div>

              <TextArea
                label="Krátky popis"
                value={activePost.excerpt}
                onChange={(value) => updateActivePost('excerpt', value)}
                placeholder="Krátke zhrnutie článku, ktoré sa zobrazí vo verejnom zozname blogov."
                rows={3}
              />

              <TextArea
                label="Obsah článku"
                value={activePost.content}
                onChange={(value) => updateActivePost('content', value)}
                placeholder="Sem vložte celý text článku..."
                rows={14}
              />

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <input
                  type="checkbox"
                  checked={activePost.published}
                  onChange={(event) =>
                    updateActivePost('published', event.target.checked)
                  }
                  className="h-5 w-5 accent-violet-600"
                />

                <span>
                  <span className="block font-black text-white">
                    Zverejniť článok
                  </span>

                  <span className="block text-sm font-semibold text-slate-400">
                    Ak nie je zaškrtnuté, článok ostane ako koncept a zákazník
                    ho neuvidí.
                  </span>
                </span>
              </label>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold leading-6 text-emerald-100">
                Článok sa ukladá automaticky do lokálneho úložiska prehliadača.
                Pre verejné ukladanie pre všetkých používateľov odporúčam
                napojiť Supabase databázu.
              </div>

              <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={() => deletePost(activePost.id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/20"
                >
                  <Trash2 size={18} />
                  Odstrániť článok
                </button>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-200">
                  <Save size={18} />
                  Uložené automaticky
                </div>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm font-bold leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400"
      />
    </label>
  );
}

function createSlug(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}