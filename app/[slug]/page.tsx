import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { blogArticles, getBlogArticle } from '../blogData';

export function generateStaticParams() {
  return blogArticles.map((article) => ({
    slug: article.slug,
  }));
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;
  const article = getBlogArticle(slug);

  if (!article) {
    notFound();
  }

  const Icon = article.icon;
  const relatedArticles = blogArticles.filter((item) => item.slug !== slug);

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
            href="/blog"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-black px-4 py-3 text-sm font-black text-white shadow-lg shadow-black/30 transition hover:border-violet-400/70 hover:bg-zinc-900"
          >
            <ArrowLeft size={18} />
            Späť na blog
          </Link>

          <div className="flex items-center gap-2 rounded-2xl border border-violet-400/40 bg-violet-600/20 px-4 py-3 text-sm font-black text-violet-100 shadow-lg shadow-black/30">
            <Icon size={18} />
            {article.category}
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-5 py-12">
        <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#090d1a]/95 shadow-[0_30px_120px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <div className="border-b border-white/10 bg-gradient-to-br from-violet-950/45 via-black to-black p-6 md:p-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-600/20 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-100">
              <Icon size={15} />
              {article.category}
            </div>

            <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">
              {article.title}
            </h1>

            <p className="mt-6 max-w-3xl text-base font-bold leading-8 text-slate-200 md:text-lg">
              {article.excerpt}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-[0.14em] text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2">
                <CalendarDays size={15} />
                {article.date}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2">
                <BookOpen size={15} />
                {article.readTime}
              </span>
            </div>
          </div>

          <div className="p-6 md:p-10">
            <p className="rounded-[1.5rem] border border-violet-400/25 bg-violet-600/10 p-5 text-lg font-bold leading-9 text-slate-100">
              {article.content.intro}
            </p>

            <div className="mt-10 space-y-8">
              {article.content.sections.map((section, index) => (
                <section
                  key={section.title}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 md:p-7"
                >
                  <div className="mb-5 flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600/25 text-violet-100">
                      {index + 1}
                    </div>

                    <h2 className="text-2xl font-black leading-tight text-white md:text-3xl">
                      {section.title}
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {section.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-base font-semibold leading-8 text-slate-200"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {section.bullets?.length ? (
                    <ul className="mt-6 grid gap-3 md:grid-cols-2">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 text-sm font-bold leading-6 text-slate-100"
                        >
                          <CheckCircle2
                            size={18}
                            className="mt-0.5 shrink-0 text-violet-300"
                          />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>

            <div className="mt-10 rounded-[1.5rem] border border-violet-400/30 bg-violet-600/15 p-6">
              <h2 className="text-2xl font-black text-white">Záver</h2>

              <p className="mt-4 text-base font-semibold leading-8 text-slate-100">
                {article.content.conclusion}
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row">
              <Link
                href="/blog"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black px-6 py-4 text-sm font-black text-white shadow-xl shadow-black/40 transition hover:border-violet-400/60 hover:bg-zinc-900"
              >
                <ArrowLeft size={18} />
                Späť na všetky články
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black px-6 py-4 text-sm font-black text-white shadow-xl shadow-black/40 transition hover:border-violet-400/60 hover:bg-zinc-900"
              >
                Prejsť do aplikácie
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </article>

        <section className="mt-12">
          <h2 className="mb-6 text-2xl font-black text-white">
            Ďalšie články
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            {relatedArticles.slice(0, 4).map((item) => {
              const RelatedIcon = item.icon;

              return (
                <Link
                  key={item.slug}
                  href={`/blog/${item.slug}`}
                  className="group rounded-[1.5rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/30 transition hover:-translate-y-1 hover:border-violet-400/50 hover:bg-[#10162a]"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600/25 text-violet-100">
                      <RelatedIcon size={21} />
                    </div>

                    <ChevronRight
                      size={20}
                      className="text-slate-500 transition group-hover:text-violet-300"
                    />
                  </div>

                  <div className="text-xs font-black uppercase tracking-[0.14em] text-violet-300">
                    {item.category}
                  </div>

                  <h3 className="mt-2 text-lg font-black leading-tight text-white">
                    {item.title}
                  </h3>

                  <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-slate-300">
                    {item.excerpt}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}