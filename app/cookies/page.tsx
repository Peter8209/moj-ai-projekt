import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Cookie,
  Database,
  LockKeyhole,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const cookieGroups = [
  {
    icon: LockKeyhole,
    title: 'Nevyhnutné cookies',
    badge: 'Vždy aktívne',
    text:
      'Tieto cookies sú potrebné na bezpečné fungovanie stránky, prihlásenie, ochranu formulárov, platobné presmerovanie a základné technické nastavenia.',
    examples: ['session', 'security_token', 'csrf_token', 'language'],
  },
  {
    icon: Settings,
    title: 'Preferenčné cookies',
    badge: 'Nastavenia',
    text:
      'Pomáhajú zapamätať si voľby používateľa, napríklad jazyk stránky, vzhľad rozhrania alebo posledné použité nastavenia aplikácie.',
    examples: ['zedpera_language', 'zedpera_theme', 'app_language'],
  },
  {
    icon: BarChart3,
    title: 'Analytické cookies',
    badge: 'Meranie',
    text:
      'Slúžia na pochopenie používania webu, zlepšovanie výkonu, sledovanie chýb a optimalizáciu používateľskej skúsenosti.',
    examples: ['analytics_id', 'performance_event', 'page_view'],
  },
  {
    icon: Sparkles,
    title: 'Marketingové cookies',
    badge: 'Voliteľné',
    text:
      'Môžu byť použité na vyhodnocovanie kampaní, odporúčanie relevantného obsahu a meranie účinnosti komunikácie.',
    examples: ['campaign_id', 'utm_source', 'conversion_event'],
  },
];

const principles = [
  'Cookies nepoužívame na predaj osobných údajov tretím stranám.',
  'Nevyhnutné cookies sú zapnuté vždy, pretože bez nich stránka nemusí fungovať správne.',
  'Voliteľné cookies je možné upraviť alebo zablokovať v nastaveniach prehliadača.',
  'Jazyk stránky sa ukladá lokálne, aby sa po návrate zobrazil správny jazyk.',
];

export default function CookiesPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(124,58,237,0.28),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.18),transparent_28%),#000]" />

      <header className="relative z-10 border-b border-white/10 bg-black/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[84px] max-w-[1260px] flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-black text-white transition hover:border-violet-400/70 hover:bg-violet-600/15"
          >
            <ArrowLeft size={18} className="text-violet-300" />
            Späť na úvod
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-violet-600 to-fuchsia-500 text-lg font-black text-white shadow-[0_0_28px_rgba(80,90,255,0.55)]">
              Z
            </div>

            <div>
              <div className="text-xl font-black uppercase tracking-[0.16em] text-white">
                Zedpera
              </div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
                Cookies a súkromie
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-[1260px] px-5 py-16 lg:px-8">
        <div className="rounded-[2rem] border border-violet-500/30 bg-white/[0.025] p-8 shadow-[0_0_80px_rgba(124,58,237,0.18)] lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/35 bg-violet-500/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-100">
            <Cookie size={17} className="text-violet-300" />
            Informácie o cookies
          </div>

          <h1 className="mt-8 max-w-4xl text-4xl font-black leading-tight tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            Zásady používania cookies na platforme Zedpera
          </h1>

          <p className="mt-6 max-w-3xl text-lg font-bold leading-8 text-white">
            Táto stránka vysvetľuje, aké cookies a podobné technológie môže Zedpera používať,
            prečo ich používa a ako ich môže používateľ spravovať. Text je pripravený ako
            viditeľná a profesionálna informačná stránka pre footer odkaz „Cookies“.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-black/50 p-5"
              >
                <CheckCircle2 size={22} className="mb-4 text-emerald-400" />
                <p className="text-sm font-bold leading-6 text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1260px] px-5 pb-16 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {cookieGroups.map((group) => {
            const Icon = group.icon;

            return (
              <article
                key={group.title}
                className="rounded-3xl border border-white/10 bg-white/[0.025] p-7 shadow-[0_22px_60px_rgba(0,0,0,0.35)] transition hover:border-violet-400/60 hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-300">
                    <Icon size={28} />
                  </div>

                  <span className="rounded-full border border-violet-400/25 bg-violet-600/15 px-4 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-violet-100">
                    {group.badge}
                  </span>
                </div>

                <h2 className="mt-6 text-2xl font-black text-white">
                  {group.title}
                </h2>

                <p className="mt-4 text-sm font-bold leading-7 text-white">
                  {group.text}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {group.examples.map((example) => (
                    <span
                      key={example}
                      className="rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-black text-violet-200"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1260px] px-5 pb-20 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-8 lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
                <ShieldCheck size={17} />
                Správa cookies
              </div>

              <h2 className="mt-6 text-3xl font-black text-white">
                Ako môžete cookies spravovať?
              </h2>

              <p className="mt-4 text-base font-bold leading-8 text-white">
                Cookies môžete spravovať v nastaveniach svojho internetového prehliadača.
                Väčšina prehliadačov umožňuje cookies vymazať, zablokovať alebo nastaviť
                upozornenie pred ich uložením. Vypnutie nevyhnutných cookies môže ovplyvniť
                funkčnosť prihlásenia, platby alebo uloženia jazykových preferencií.
              </p>
            </div>

            <div className="min-w-[260px] rounded-2xl border border-violet-500/30 bg-violet-600/10 p-6">
              <Database size={28} className="text-violet-300" />
              <div className="mt-4 text-lg font-black text-white">
                Posledná aktualizácia
              </div>
              <div className="mt-1 text-sm font-bold text-violet-200">
                04. 06. 2026
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-black px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-[1260px] flex-col gap-4 text-sm font-bold text-white sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Zedpera. Všetky práva vyhradené.</span>

          <div className="flex flex-wrap gap-3">
            <Link href="/gdpr" className="rounded-xl border border-white/10 px-4 py-2 hover:border-violet-400/70">
              GDPR
            </Link>
            <Link href="/obchodne-podmienky" className="rounded-xl border border-white/10 px-4 py-2 hover:border-violet-400/70">
              Obchodné podmienky
            </Link>
            <Link href="/" className="rounded-xl border border-white/10 px-4 py-2 hover:border-violet-400/70">
              Úvod
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
