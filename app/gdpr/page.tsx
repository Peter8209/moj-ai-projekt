import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Cookie,
  Database,
  FileText,
  Globe2,
  LockKeyhole,
  Scale,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

const sections = [
  {
    title: '1. Prevádzkovateľ',
    icon: UserCheck,
    items: [
      'Prevádzkovateľom je platforma www.zedpera.com (ďalej len „Prevádzkovateľ“).',
    ],
  },
  {
    title: '2. Aké údaje spracúvame',
    icon: Database,
    items: [
      'Spracúvame najmä tieto osobné údaje: meno a priezvisko, ak je poskytnuté, e-mailová adresa, fakturačné údaje, prihlasovacie údaje, obsah nahraných súborov a textov, údaje o používaní služby, logy, aktivita v systéme a komunikácia s podporou.',
    ],
  },
  {
    title: '3. Účel spracúvania',
    icon: Bot,
    items: [
      'Osobné údaje spracúvame za účelom poskytovania AI služby, najmä generovania textov, používania AI vedúceho práce a prípravy obhajoby.',
      'Údaje spracúvame aj za účelom správy používateľského účtu, fakturácie a plnenia účtovných povinností, technickej podpory, zabezpečenia funkčnosti a bezpečnosti systému a zlepšovania kvality služby.',
    ],
  },
  {
    title: '4. Kto má prístup k vašim údajom',
    icon: Globe2,
    items: [
      'K údajom môžu mať prístup poskytovatelia analytických a marketingových nástrojov, najmä Google Ads, Google Analytics, Meta Pixel a TikTok Pixel.',
      'K údajom môžu mať prístup aj poskytovatelia AI modelov a AI infraštruktúry, najmä OpenAI, Anthropic, Google Gemini, xAI Grok a ďalší poskytovatelia AI infraštruktúry.',
      'K údajom môžu mať prístup hostingové a cloudové služby, napríklad Vercel alebo obdobné služby, databázové riešenia, platobné brány, e-mailové a notifikačné systémy.',
    ],
  },
  {
    title: '5. Právny základ spracúvania',
    icon: Scale,
    items: [
      'Osobné údaje spracúvame na základe plnenia zmluvy.',
      'Osobné údaje spracúvame aj na základe zákonných povinností, najmä v oblasti účtovníctva.',
      'Niektoré údaje spracúvame na základe oprávneného záujmu, najmä z dôvodu bezpečnosti, ochrany systému a zlepšovania služby.',
      'Ak je to vyžadované, osobné údaje spracúvame na základe súhlasu, napríklad pri marketingovej komunikácii.',
    ],
  },
  {
    title: '6. Doba uchovávania údajov',
    icon: LockKeyhole,
    items: [
      'Údaje uchovávame počas trvania používateľského účtu.',
      'Po ukončení používania účtu môžu byť údaje uchovávané po dobu 30 dní až 4 rokov podľa typu údajov.',
      'Účtovné údaje uchovávame po dobu 10 rokov.',
      'Marketingové údaje uchovávame do odvolania súhlasu.',
    ],
  },
  {
    title: '7. Príjemcovia údajov',
    icon: CheckCircle2,
    items: [
      'Údaje môžu byť spracúvané poskytovateľmi cloudových služieb.',
      'Údaje môžu byť spracúvané poskytovateľmi AI modelov, napríklad OpenAI, Google, Anthropic alebo Mistral.',
      'Údaje môžu byť spracúvané účtovnými a právnymi službami a technickými dodávateľmi infraštruktúry.',
    ],
  },
  {
    title: '8. Prenos do tretích krajín',
    icon: Globe2,
    items: [
      'Niektoré údaje môžu byť prenášané mimo Európskej únie, napríklad do USA, v rámci používania AI modelov a cloudových služieb.',
      'Takéto prenosy sú zabezpečené primeranými zárukami podľa GDPR.',
    ],
  },
  {
    title: '9. Práva používateľa',
    icon: ShieldCheck,
    items: [
      'Používateľ má právo na prístup k svojim osobným údajom.',
      'Používateľ má právo na opravu nepresných alebo neúplných údajov.',
      'Používateľ má právo na vymazanie údajov, teda právo na zabudnutie.',
      'Používateľ má právo na obmedzenie spracúvania.',
      'Používateľ má právo na prenosnosť údajov.',
    ],
  },
  {
    title: '10. Automatizované spracovanie',
    icon: Bot,
    items: [
      'Služba využíva automatizované spracovanie vrátane AI generovania textu.',
      'Toto spracovanie nemá právne účinky voči Používateľovi v zmysle GDPR.',
    ],
  },
  {
    title: '11. Bezpečnosť',
    icon: LockKeyhole,
    items: [
      'Prevádzkovateľ prijal primerané technické a organizačné opatrenia na ochranu osobných údajov pred stratou, zneužitím alebo neoprávneným prístupom.',
    ],
  },
];

export default function GdprPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-violet-700/25 blur-3xl" />
        <div className="absolute right-[-180px] top-40 h-[460px] w-[460px] rounded-full bg-blue-700/15 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[520px] w-[520px] rounded-full bg-fuchsia-700/15 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black text-white transition hover:border-violet-400/60 hover:bg-white/[0.1]"
          >
            <ArrowLeft size={18} />
            Späť na úvod
          </Link>

          <div className="flex items-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-black text-violet-100">
            <ShieldCheck size={18} />
            GDPR
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-5 py-12">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#080816]/95 shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
          <div className="border-b border-white/10 bg-gradient-to-br from-violet-950/45 via-black to-black p-6 md:p-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/35 bg-violet-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-100">
              <ShieldCheck size={15} />
              www.zedpera.com
            </div>

            <h1 className="max-w-4xl text-3xl font-black tracking-tight text-white md:text-5xl">
              Zásady ochrany osobných údajov
            </h1>

            <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-slate-200">
              Tieto zásady ochrany osobných údajov vysvetľujú, aké osobné údaje
              spracúvame, na aký účel, komu môžu byť sprístupnené a aké práva má
              používateľ platformy Zedpera.com.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-sm">
                <div className="flex items-center gap-3 text-sm font-black text-white">
                  <ShieldCheck className="text-violet-300" size={20} />
                  Účinnosť
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-200">
                  Od 30. 4. 2026
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-sm">
                <div className="flex items-center gap-3 text-sm font-black text-white">
                  <Database className="text-violet-300" size={20} />
                  Spracúvané údaje
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-200">
                  Účet, súbory, texty, platby, logy
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-sm">
                <div className="flex items-center gap-3 text-sm font-black text-white">
                  <Bot className="text-violet-300" size={20} />
                  AI spracovanie
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-200">
                  Automatizované generovanie textov
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#080816] p-6 md:p-10">
            <div className="space-y-7">
              {sections.map((section) => {
                const Icon = section.icon;

                return (
                  <section
                    key={section.title}
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 shadow-sm md:p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-200">
                        <Icon size={22} />
                      </div>

                      <div className="min-w-0">
                        <h2 className="text-xl font-black text-white md:text-2xl">
                          {section.title}
                        </h2>

                        <div className="mt-4 space-y-3">
                          {section.items.map((item) => (
                            <p
                              key={item}
                              className="text-base font-semibold leading-8 text-slate-200"
                            >
                              {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="mt-10 rounded-[1.5rem] border border-violet-500/30 bg-violet-500/10 p-6">
              <h2 className="text-xl font-black text-white">
                Záverečné ustanovenie
              </h2>

              <p className="mt-3 text-base font-semibold leading-8 text-slate-200">
                Zásady ochrany osobných údajov sú účinné od 30. 4. 2026.
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row">
              <Link
                href="/terms"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-700 px-6 py-4 text-sm font-black text-white transition hover:bg-violet-600"
              >
                <FileText size={18} />
                Obchodné podmienky
              </Link>

              <Link
                href="/cookies"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-6 py-4 text-sm font-black text-white transition hover:border-violet-400/60 hover:bg-white/[0.08]"
              >
                <Cookie size={18} />
                Cookies
              </Link>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-6 py-4 text-sm font-black text-white transition hover:border-violet-400/60 hover:bg-white/[0.08]"
              >
                Späť na úvodnú stránku
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}