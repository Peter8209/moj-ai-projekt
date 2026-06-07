import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock,
  FileText,
  Search,
  ShieldCheck,
} from 'lucide-react';

type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  published: boolean;
};

const blogPosts: BlogPost[] = [
  {
    slug: 'ako-zacat-pisat-zaverecnu-pracu',
    title: 'Ako začať písať záverečnú prácu bez stresu',
    excerpt:
      'Praktický úvod k tomu, ako si pripraviť tému, cieľ, osnovu a plán písania záverečnej práce.',
    date: '2026-06-07',
    readTime: '5 min čítania',
    category: 'Akademické písanie',
    published: true,
  },
];

export default function BlogPage() {
  const publishedPosts = blogPosts.filter((post) => post.published);

  return (
    <main className="min-h-dvh bg-[#020617] text-white">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.12]"
          >
            <ArrowLeft size={18} />
            Späť na hlavnú stránku
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-200">
              <BookOpen size={16} />
              Blog Zedpera
            </div>

            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-200 transition hover:bg-emerald-500/20"
            >
              <ShieldCheck size={16} />
              Admin prihlásenie
            </Link>
          </div>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Blog
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Praktické články o písaní akademických prác, citáciách, zdrojoch,
            metodológii, obhajobe a práci s AI nástrojmi.
          </p>
        </div>

        {publishedPosts.length === 0 ? (
          <section className="rounded-[2rem] border border-white/10 bg-[#0f172a] p-8 text-center shadow-2xl shadow-black/30">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-600/20 text-violet-300">
              <FileText size={30} />
            </div>

            <h2 className="text-2xl font-black text-white">
              Články sa pripravujú
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Blog sekcia je pripravená. Prvý článok bude zverejnený po jeho
              schválení administrátorom.
            </p>
          </section>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {publishedPosts.map((post) => (
              <article
                key={post.slug}
                className="rounded-[2rem] border border-white/10 bg-[#0f172a] p-6 shadow-2xl shadow-black/30 transition hover:border-violet-400/40 hover:bg-[#111827]"
              >
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-violet-200">
                    {post.category}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-slate-300">
                    <CalendarDays size={13} />
                    {formatDate(post.date)}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-slate-300">
                    <Clock size={13} />
                    {post.readTime}
                  </span>
                </div>

                <h2 className="text-2xl font-black leading-tight text-white">
                  {post.title}
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {post.excerpt}
                </p>

                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-500"
                >
                  Čítať článok
                  <Search size={17} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
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