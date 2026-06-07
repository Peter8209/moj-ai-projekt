import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, Clock } from 'lucide-react';

type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
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
    content: [
      'Začiatok písania záverečnej práce býva pre mnohých študentov najťažší. Najväčší problém často nie je samotné písanie, ale nejasná téma, slabý cieľ práce a chýbajúci plán.',
      'Prvým krokom je presne si určiť, čo má práca riešiť. Téma by mala byť konkrétna, primerane úzka a mala by umožňovať spracovanie dostupných zdrojov.',
      'Druhým krokom je formulácia cieľa práce. Cieľ by mal jasne pomenovať, čo má byť výsledkom práce. Nestačí napísať, že cieľom je analyzovať tému. Je potrebné uviesť, čo presne sa bude analyzovať a prečo.',
      'Tretím krokom je osnova. Dobrá osnova pomáha rozdeliť prácu na menšie časti. Vďaka tomu študent vidí, čo má písať najskôr a čo môže doplniť neskôr.',
      'Posledným krokom je harmonogram. Aj jednoduchý plán písania pomáha predísť stresu pred termínom odovzdania.',
    ],
  },
];

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  const post = blogPosts.find((item) => item.slug === slug && item.published);

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-dvh bg-[#020617] text-white">
      <article className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.12]"
        >
          <ArrowLeft size={18} />
          Späť na blog
        </Link>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-violet-200">
            {post.category}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">
            <CalendarDays size={13} />
            {formatDate(post.date)}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">
            <Clock size={13} />
            {post.readTime}
          </span>
        </div>

        <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
          {post.title}
        </h1>

        <p className="mt-5 text-lg leading-8 text-slate-300">
          {post.excerpt}
        </p>

        <div className="mt-10 space-y-6 rounded-[2rem] border border-white/10 bg-[#0f172a] p-6 text-base leading-8 text-slate-200 shadow-2xl shadow-black/30 sm:p-8">
          {post.content.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>
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