import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Search,
  Sparkles,
} from 'lucide-react';
import { blogArticles, blogCategories } from './blogData';

export default function BlogPage() {
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
                Odborné články pre akademické písanie, AI a obhajobu
              </h1>

              <p className="mt-5 max-w-3xl text-base font-bold leading-8 text-slate-200 md:text-lg">
                Vlastné články Zedpera k písaniu záverečných prác, práci so
                zdrojmi, AI nástrojmi, auditom kvality, praktickou časťou,
                dátami, grafmi a obhajobou.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/25">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/25 text-violet-100">
                  <Search size={22} />
                </div>

                <div>
                  <div className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">
                    Prehľad článkov
                  </div>
                  <div className="text-lg font-black text-white">
                    {blogArticles.length} odborných článkov
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-slate-200">
                Každý článok sa otvorí priamo na vlastnej stránke a je pripravený
                na SEO rozšírenie.
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {blogCategories.map((category) => (
            <button
              key={category}
              type="button"
              className="rounded-2xl border border-white/15 bg-black px-4 py-3 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:border-violet-300/60 hover:bg-zinc-900"
            >
              {category}
            </button>
          ))}
        </div>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {blogArticles.map((post) => {
            const Icon = post.icon;

            return (
              <article
                key={post.slug}
                className="group flex min-h-[430px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1020]/95 shadow-2xl shadow-black/35 transition hover:-translate-y-1 hover:border-violet-300/45 hover:bg-[#10162a]"
              >
                <div className="p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/25 text-violet-100 shadow-lg shadow-violet-950/40">
                      <Icon size={26} />
                    </div>

                    <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1.5 text-xs font-black text-violet-100">
                      {post.category}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black leading-tight text-white">
                    {post.title}
                  </h2>

                  <p className="mt-4 text-sm font-bold leading-7 text-slate-300">
                    {post.excerpt}
                  </p>
                </div>

                <div className="mt-auto border-t border-white/10 p-6">
                  <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={15} />
                      {post.date}
                    </span>

                    <span className="inline-flex items-center gap-2">
                      <BookOpen size={15} />
                      {post.readTime}
                    </span>
                  </div>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black px-5 text-sm font-black text-white shadow-xl shadow-black/40 transition hover:border-violet-400/60 hover:bg-zinc-900"
                  >
                    Čítať článok
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}