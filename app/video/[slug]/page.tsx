import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import AnimatedManualVideo from '@/components/video/AnimatedManualVideo';
import { videoManuals } from '@/lib/videoManuals';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return videoManuals.map((manual) => ({
    slug: manual.slug,
  }));
}

export default async function VideoManualDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const manual = videoManuals.find((item) => item.slug === slug);

  if (!manual) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#050711] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/video"
          className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Späť na videonávody
        </Link>

        <section className="mb-6 rounded-[2rem] border border-white/10 bg-[#070b16] p-5 shadow-2xl shadow-black/40 md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-3 inline-flex rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-200">
                {manual.category}
              </p>

              <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                {manual.title}
              </h1>

              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-300">
                {manual.description}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-200">
              <Clock className="h-4 w-4 text-cyan-300" />
              {manual.duration}
            </div>
          </div>

          <AnimatedManualVideo
            title={manual.title}
            description={manual.description}
            steps={manual.steps}
          />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#070b16] p-5 shadow-2xl shadow-black/30 md:p-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white">
              <PlayCircle className="h-5 w-5" />
            </span>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-300">
                Detailný manuál
              </p>
              <h2 className="text-2xl font-black text-white">
                Presný postup práce so Zedperou
              </h2>
            </div>
          </div>

          <div className="grid gap-3">
            {manual.steps.map((step, index) => (
              <div
                key={`${manual.slug}-${index}`}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                </span>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Krok {index + 1}
                  </p>

                  <p className="mt-1 text-sm font-bold leading-6 text-slate-100">
                    {step}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}