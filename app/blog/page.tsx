'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  FileText,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';

type BlogArticle = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  author: string;
  createdAt: string;
};

const STORAGE_KEY = 'zedpera_custom_blog_articles';

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function BlogPage() {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Akademické písanie');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('Zedpera');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      setArticles([]);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as BlogArticle[];
      setArticles(Array.isArray(parsed) ? parsed : []);
    } catch {
      setArticles([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  }, [articles]);

  const articleCountLabel = useMemo(() => {
    if (articles.length === 1) {
      return '1 vlastný článok';
    }

    if (articles.length > 1 && articles.length < 5) {
      return `${articles.length} vlastné články`;
    }

    return `${articles.length} vlastných článkov`;
  }, [articles.length]);

  const clearForm = () => {
    setTitle('');
    setCategory('Akademické písanie');
    setExcerpt('');
    setContent('');
    setAuthor('Zedpera');
  };

  const handleSaveArticle = () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setMessage('Vyplňte minimálne názov článku a obsah článku.');
      return;
    }

    const newArticle: BlogArticle = {
      id: `${createSlug(trimmedTitle)}-${Date.now()}`,
      title: trimmedTitle,
      category: category.trim() || 'Blog',
      excerpt:
        excerpt.trim() ||
        trimmedContent.replace(/\s+/g, ' ').slice(0, 180) + '...',
      content: trimmedContent,
      author: author.trim() || 'Zedpera',
      createdAt: new Date().toISOString(),
    };

    setArticles((current) => [newArticle, ...current]);
    clearForm();
    setMessage('Článok bol úspešne uložený.');
  };

  const handleDeleteArticle = (id: string) => {
    setArticles((current) => current.filter((article) => article.id !== id));
    setMessage('Článok bol vymazaný.');
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-violet-700/30 blur-3xl" />
        <div className="absolute right-[-180px] top-40 h-[460px] w-[460px] rounded-full bg-blue-700/20 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[520px] w-[520px] rounded-full bg-fuchsia-700/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-black px-4 py-3 text-sm font-black text-white shadow-lg shadow-black/30 transition hover:border-violet-400/70 hover:bg-zinc-900"
          >
            <ArrowLeft size={18} />
            Späť na úvod
          </Link>

          <div className="flex items-center gap-2 rounded-2xl border border-violet-400/40 bg-violet-600/20 px-4 py-3 text-sm font-black text-violet-100 shadow-lg shadow-black/30">
            <BookOpen size={18} />
            Blog
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-12">
        <div className="mb-10 overflow-hidden rounded-[2rem] border border-white/10 bg-[#090d1a]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.85)] backdrop-blur-xl md:p-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-600/20 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-100">
            <Sparkles size={15} />
            Zedpera blog
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">
                Blog a vlastné odborné články
              </h1>

              <p className="mt-5 max-w-3xl text-base font-bold leading-8 text-slate-200 md:text-lg">
                V tejto časti môžete písať vlastné články pre Zedperu. Pôvodné
                ukážkové články sú odstránené. Zobrazia sa iba články, ktoré si
                sami vytvoríte a uložíte.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/25">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/25 text-violet-100">
                  <FileText size={22} />
                </div>

                <div>
                  <div className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">
                    Prehľad článkov
                  </div>
                  <div className="text-lg font-black text-white">
                    {articleCountLabel}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-slate-200">
                Články sa ukladajú lokálne v prehliadači. Pre ostrú produkciu
                ich odporúčam ukladať do Supabase databázy.
              </div>
            </div>
          </div>
        </div>

        <section className="mb-10 rounded-[2rem] border border-white/10 bg-[#07101f]/95 p-6 shadow-2xl shadow-black/40 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-600/20 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-100">
                <Plus size={15} />
                Nový článok
              </div>

              <h2 className="mt-4 text-3xl font-black text-white">
                Napísať vlastný článok
              </h2>

              <p className="mt-2 text-sm font-bold leading-6 text-slate-300">
                Vyplňte názov, kategóriu, krátky popis a samotný obsah článku.
              </p>
            </div>

            {message && (
              <div className="rounded-2xl border border-violet-400/40 bg-violet-600/20 px-4 py-3 text-sm font-black text-violet-100">
                {message}
              </div>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-black text-white">
                Názov článku
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Napr. Ako správne napísať úvod záverečnej práce"
                className="min-h-[54px] w-full rounded-2xl border border-white/15 bg-black px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-white">
                Kategória
              </span>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Napr. Akademické písanie"
                className="min-h-[54px] w-full rounded-2xl border border-white/15 bg-black px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-black text-white">
                Krátky popis článku
              </span>
              <textarea
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
                placeholder="Krátky úvodný popis, ktorý sa zobrazí v karte článku."
                rows={3}
                className="w-full resize-none rounded-2xl border border-white/15 bg-black px-4 py-4 text-sm font-bold leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-white">
                Autor
              </span>
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="Zedpera"
                className="min-h-[54px] w-full rounded-2xl border border-white/15 bg-black px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-black text-white">
                Obsah článku
              </span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Sem napíšte celý článok..."
                rows={14}
                className="w-full resize-y rounded-2xl border border-white/15 bg-black px-4 py-4 text-sm font-bold leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveArticle}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 text-sm font-black text-white shadow-xl shadow-violet-950/40 transition hover:bg-violet-500"
            >
              <Save size={18} />
              Uložiť článok
            </button>

            <button
              type="button"
              onClick={clearForm}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black px-6 text-sm font-black text-white transition hover:border-violet-400/60 hover:bg-zinc-900"
            >
              Vyčistiť formulár
            </button>
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-white">
                Uložené články
              </h2>
              <p className="mt-2 text-sm font-bold text-slate-400">
                Tu sa zobrazujú iba vaše vlastné uložené články.
              </p>
            </div>
          </div>

          {articles.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-white/15 bg-[#0b1020]/80 p-10 text-center shadow-2xl shadow-black/30">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-600/20 text-violet-100">
                <BookOpen size={30} />
              </div>

              <h3 className="text-2xl font-black text-white">
                Zatiaľ nie je uložený žiadny článok
              </h3>

              <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-300">
                Pôvodné články boli odstránené. Nový článok vytvoríte vo
                formulári vyššie a po uložení sa zobrazí v tejto časti.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {articles.map((post) => (
                <article
                  key={post.id}
                  className="group flex min-h-[430px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1020]/95 shadow-2xl shadow-black/35 transition hover:-translate-y-1 hover:border-violet-300/45 hover:bg-[#10162a]"
                >
                  <div className="p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/25 text-violet-100 shadow-lg shadow-violet-950/40">
                        <FileText size={26} />
                      </div>

                      <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1.5 text-xs font-black text-violet-100">
                        {post.category}
                      </span>
                    </div>

                    <h3 className="text-2xl font-black leading-tight text-white">
                      {post.title}
                    </h3>

                    <p className="mt-4 text-sm font-bold leading-7 text-slate-300">
                      {post.excerpt}
                    </p>

                    <div className="mt-5 max-h-44 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-7 text-slate-300">
                      {post.content}
                    </div>
                  </div>

                  <div className="mt-auto border-t border-white/10 p-6">
                    <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={15} />
                        {formatDate(post.createdAt)}
                      </span>

                      <span className="inline-flex items-center gap-2">
                        <BookOpen size={15} />
                        {post.author}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteArticle(post.id)}
                      className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 text-sm font-black text-red-100 shadow-xl shadow-black/40 transition hover:border-red-300/70 hover:bg-red-500/20"
                    >
                      <Trash2 size={18} />
                      Vymazať článok
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}