import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Cookie,
  FileText,
  Scale,
  ShieldCheck,
} from 'lucide-react';

const sections = [
  {
    title: '1. Základné ustanovenia',
    items: [
      '1.1. Tieto obchodné podmienky (ďalej len „Podmienky“) upravujú právne vzťahy medzi platformou www.zedpera.com (ďalej len „Poskytovateľ“) a používateľom služby (ďalej len „Používateľ“).',
      '1.2. Služba je poskytovaná prostredníctvom online platformy Zedpera.com.',
      '1.3. Služba zahŕňa najmä: AI generovanie textov akademického charakteru, AI asistenta / „vedúceho práce“, analytické a redakčné nástroje, generovanie obhajoby a prípravu na obhajobu, kontrolu originality textu (orientačná), prácu s AI modelmi tretích strán.',
      '1.4. Používateľ berie na vedomie, že služba je softvérový nástroj, nie akademická ani konzultačná služba v právnom zmysle.',
    ],
  },
  {
    title: '2. Charakter služby a vylúčenie zodpovednosti za účel použitia',
    items: [
      '2.1. Služba je poskytovaná výlučne ako nástroj na generovanie a úpravu textov.',
      '2.2. Poskytovateľ nezodpovedá za použitie výstupov Používateľom, ich akademické uznanie, ich súlad so školskými pravidlami ani výsledné hodnotenie práce.',
      '2.3. Používateľ nesie plnú zodpovednosť za finálny obsah práce, správnosť údajov, citácie a zdroje a dodržiavanie akademickej etiky.',
      '2.4. Používateľ výslovne berie na vedomie, že služba nie je určená na obchádzanie akademických pravidiel.',
    ],
  },
  {
    title: '3. AI výstupy a obmedzenia',
    items: [
      '3.1. Výstupy AI môžu obsahovať nepresnosti, nemusia byť aktuálne a môžu byť zjednodušené.',
      '3.2. Poskytovateľ nezaručuje pravdivosť výstupov, úplnosť, odbornú správnosť ani vhodnosť pre akademické účely.',
      '3.3. Používateľ je povinný všetky výstupy overovať, upravovať a dopĺňať z odborných zdrojov.',
    ],
  },
  {
    title: '4. AI vedúci práce a obhajoba',
    items: [
      '4.1. Funkcia „AI vedúci práce“ poskytuje spätnú väzbu, návrhy úprav, jazykovú a štylistickú korekciu.',
      '4.2. Funkcia „obhajoba“ je generovaná automaticky a má výlučne orientačný charakter.',
      '4.3. Poskytovateľ nezodpovedá za úspešnosť obhajoby ani reakcie skúšobnej komisie.',
    ],
  },
  {
    title: '5. Zmluva a aktivácia služby',
    items: [
      '5.1. Zmluva vzniká zaplatením predplatného.',
      '5.2. Služba sa aktivuje okamžite po úhrade.',
      '5.3. Používateľ výslovne súhlasí so začatím poskytovania služby pred uplynutím lehoty na odstúpenie.',
      '5.4. Po úplnom sprístupnení služby Používateľ stráca právo na odstúpenie od zmluvy.',
    ],
  },
  {
    title: '6. Predplatné a platby',
    items: [
      '6.1. Služba funguje na báze automaticky obnovovaného predplatného.',
      '6.2. Obnovenie prebieha automaticky, pokiaľ Používateľ predplatné nezruší.',
      '6.3. Poskytovateľ si vyhradzuje právo meniť ceny s účinnosťou do budúcnosti.',
      '6.4. Nevyužitie služby nezakladá nárok na vrátenie peňazí.',
    ],
  },
  {
    title: '7. Reklamácie',
    items: [
      '7.1. Reklamovať možno výlučne technickú nefunkčnosť systému, ktorá dlhodobo pretrváva na všetkých moduloch. Reklamácia sa nevzťahuje na nefunkčnosť iba niektorého samostatného modulu.',
      '7.2. Reklamácia sa nevzťahuje na kvalitu textu, štýl, obsah ani výsledky AI.',
      '7.3. Reklamácie musia byť podané do 7 dní od zistenia problému.',
      '7.4. Poskytovateľ si vyhradzuje právo reklamáciu zamietnuť, ak nejde o technickú chybu systému.',
    ],
  },
  {
    title: '8. Obmedzenie zodpovednosti',
    items: [
      '8.1. Poskytovateľ nenesie zodpovednosť za žiadnu priamu, nepriamu, následnú alebo ušlú škodu.',
      '8.2. Celková zodpovednosť Poskytovateľa je maximálne do výšky zaplatenej sumy za službu.',
      '8.3. Poskytovateľ nezodpovedá za rozhodnutia škôl, disciplinárne konania, plagiátorské sankcie ani akademické výsledky.',
    ],
  },
  {
    title: '9. AI modely tretích strán',
    items: [
      '9.1. Služba využíva modely tretích strán, napríklad OpenAI, Google, Anthropic alebo Mistral.',
      '9.2. Poskytovateľ nezodpovedá za výpadky týchto systémov, zmeny ich funkcionality ani obmedzenia ich dostupnosti.',
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden bg-black">
        <div className="absolute left-1/2 top-[-220px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-violet-700/30 blur-3xl" />
        <div className="absolute right-[-180px] top-40 h-[460px] w-[460px] rounded-full bg-blue-700/20 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[520px] w-[520px] rounded-full bg-fuchsia-700/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-black text-white shadow-lg shadow-black/30 transition hover:border-violet-400/70 hover:bg-white/[0.12]"
          >
            <ArrowLeft size={18} />
            Späť na úvod
          </Link>

          <div className="flex items-center gap-2 rounded-2xl border border-violet-400/40 bg-violet-600/20 px-4 py-3 text-sm font-black text-violet-100 shadow-lg shadow-black/30">
            <FileText size={18} />
            Obchodné podmienky
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-5 py-12">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#070b16]/95 shadow-[0_30px_120px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <div className="border-b border-white/10 bg-[#0b1020] p-6 md:p-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-600/20 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-100">
              <Scale size={15} />
              Zedpera.com
            </div>

            <h1 className="max-w-4xl text-3xl font-black tracking-tight text-white md:text-5xl">
              Obchodné podmienky pre služby Zedpera
            </h1>

            <p className="mt-5 max-w-3xl text-base font-bold leading-7 text-slate-100">
              Tieto obchodné podmienky upravujú používanie online platformy
              Zedpera.com a vzťah medzi poskytovateľom služby a používateľom.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-xl shadow-black/25">
                <div className="flex items-center gap-3 text-sm font-black text-white">
                  <ShieldCheck className="text-violet-200" size={20} />
                  Účinnosť
                </div>
                <p className="mt-2 text-sm font-bold text-white">
                  Od 30. 4. 2026
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-xl shadow-black/25">
                <div className="flex items-center gap-3 text-sm font-black text-white">
                  <Bot className="text-violet-200" size={20} />
                  Charakter služby
                </div>
                <p className="mt-2 text-sm font-bold text-white">
                  Softvérový AI nástroj
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-xl shadow-black/25">
                <div className="flex items-center gap-3 text-sm font-black text-white">
                  <CheckCircle2 className="text-violet-200" size={20} />
                  Platforma
                </div>
                <p className="mt-2 text-sm font-bold text-white">
                  www.zedpera.com
                </p>
              </div>
            </div>
          </div>

          <div className="bg-black p-6 md:p-10">
            <div className="space-y-7">
              {sections.map((section) => (
                <section
                  key={section.title}
                  className="rounded-[1.5rem] border border-white/10 bg-[#0b1020] p-5 shadow-xl shadow-black/25 md:p-6"
                >
                  <h2 className="text-xl font-black text-white md:text-2xl">
                    {section.title}
                  </h2>

                  <div className="mt-4 space-y-3">
                    {section.items.map((item) => (
                      <p
                        key={item}
                        className="text-base font-bold leading-8 text-white"
                      >
                        {item}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-10 rounded-[1.5rem] border border-violet-400/35 bg-violet-600/15 p-6 shadow-xl shadow-black/25">
              <h2 className="text-xl font-black text-white">
                Záverečné ustanovenie
              </h2>

              <p className="mt-3 text-base font-bold leading-8 text-white">
                Obchodné podmienky sú účinné od 30. 4. 2026.
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row">
              <Link
                href="/gdpr"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-violet-950/40 transition hover:bg-violet-500"
              >
                <ShieldCheck size={18} />
                Zásady ochrany osobných údajov
              </Link>

              <Link
                href="/cookies"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-4 text-sm font-black text-white shadow-lg shadow-black/25 transition hover:border-violet-300/60 hover:bg-white/[0.12]"
              >
                <Cookie size={18} />
                Cookies
              </Link>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-4 text-sm font-black text-white shadow-lg shadow-black/25 transition hover:border-violet-300/60 hover:bg-white/[0.12]"
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