import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Späť na úvod
          </Link>

          <div className="flex items-center gap-2 text-sm font-black text-violet-700">
            <FileText size={18} />
            Obchodné podmienky
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 md:p-10">
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">
            Obchodné podmienky pre služby Zedpera
          </h1>

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Účinné od 30. 4. 2026
          </p>

          <div className="mt-10 space-y-8 text-base leading-8 text-slate-700">
            <section>
              <h2 className="text-2xl font-black text-slate-950">
                1. Základné ustanovenia
              </h2>

              <p className="mt-3">
                1.1. Tieto obchodné podmienky upravujú právne vzťahy medzi
                spoločnosťou Thesbuy Ltd., IČO: 15544719, so sídlom Initial
                Business Centre Unit 7, Wilson Business Park, Manchester,
                United Kingdom, M40 8WN, ďalej len „Poskytovateľ“, a
                používateľom služby, ďalej len „Používateľ“.
              </p>

              <p>
                1.2. Služba je poskytovaná prostredníctvom online platformy
                Zedpera.
              </p>

              <p>
                1.3. Služba zahŕňa najmä AI generovanie textov akademického
                charakteru, AI asistenta alebo „vedúceho práce“, analytické a
                redakčné nástroje, generovanie obhajoby a prípravu na obhajobu,
                orientačnú kontrolu originality textu a prácu s AI modelmi
                tretích strán.
              </p>

              <p>
                1.4. Používateľ berie na vedomie, že služba je softvérový
                nástroj, nie akademická ani konzultačná služba v právnom
                zmysle.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                2. Charakter služby a vylúčenie zodpovednosti za účel použitia
              </h2>

              <p className="mt-3">
                2.1. Služba je poskytovaná výlučne ako nástroj na generovanie a
                úpravu textov.
              </p>

              <p>
                2.2. Poskytovateľ nezodpovedá za použitie výstupov
                Používateľom, ich akademické uznanie, súlad so školskými
                pravidlami ani výsledné hodnotenie práce.
              </p>

              <p>
                2.3. Používateľ nesie plnú zodpovednosť za finálny obsah práce,
                správnosť údajov, citácie, zdroje a dodržiavanie akademickej
                etiky.
              </p>

              <p>
                2.4. Používateľ výslovne berie na vedomie, že služba nie je
                určená na obchádzanie akademických pravidiel.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                3. AI výstupy a obmedzenia
              </h2>

              <p className="mt-3">
                3.1. Výstupy AI môžu obsahovať nepresnosti, nemusia byť
                aktuálne a môžu byť zjednodušené.
              </p>

              <p>
                3.2. Poskytovateľ nezaručuje pravdivosť výstupov, úplnosť,
                odbornú správnosť ani vhodnosť pre akademické účely.
              </p>

              <p>
                3.3. Používateľ je povinný všetky výstupy overovať, upravovať a
                dopĺňať z odborných zdrojov.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                4. AI vedúci práce a obhajoba
              </h2>

              <p className="mt-3">
                4.1. Funkcia „AI vedúci práce“ poskytuje spätnú väzbu, návrhy
                úprav, jazykovú a štylistickú korekciu.
              </p>

              <p>
                4.2. Funkcia „obhajoba“ je generovaná automaticky a má výlučne
                orientačný charakter.
              </p>

              <p>
                4.3. Poskytovateľ nezodpovedá za úspešnosť obhajoby ani reakcie
                skúšobnej komisie.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                5. Zmluva a aktivácia služby
              </h2>

              <p className="mt-3">
                5.1. Zmluva vzniká zaplatením predplatného.
              </p>

              <p>
                5.2. Služba sa aktivuje okamžite po úhrade.
              </p>

              <p>
                5.3. Používateľ výslovne súhlasí so začatím poskytovania služby
                pred uplynutím lehoty na odstúpenie.
              </p>

              <p>
                5.4. Po úplnom sprístupnení služby Používateľ stráca právo na
                odstúpenie od zmluvy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                6. Predplatné a platby
              </h2>

              <p className="mt-3">
                6.1. Služba funguje na báze automaticky obnovovaného
                predplatného.
              </p>

              <p>
                6.2. Obnovenie prebieha automaticky, pokiaľ Používateľ
                predplatné nezruší.
              </p>

              <p>
                6.3. Poskytovateľ si vyhradzuje právo meniť ceny s účinnosťou
                do budúcnosti.
              </p>

              <p>
                6.4. Nevyužitie služby nezakladá nárok na vrátenie peňazí.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                7. Reklamácie
              </h2>

              <p className="mt-3">
                7.1. Reklamovať možno výlučne technickú nefunkčnosť systému,
                ktorá dlhodobo pretrváva na všetkých moduloch.
              </p>

              <p>
                7.2. Reklamácia sa nevzťahuje na kvalitu textu, štýl, obsah ani
                výsledky AI.
              </p>

              <p>
                7.3. Reklamácie musia byť podané do 7 dní od zistenia problému.
              </p>

              <p>
                7.4. Poskytovateľ si vyhradzuje právo reklamáciu zamietnuť, ak
                nejde o technickú chybu systému.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                8. Obmedzenie zodpovednosti
              </h2>

              <p className="mt-3">
                8.1. Poskytovateľ nenesie zodpovednosť za žiadnu priamu,
                nepriamu, následnú alebo ušlú škodu.
              </p>

              <p>
                8.2. Celková zodpovednosť Poskytovateľa je maximálne do výšky
                zaplatenej sumy za službu.
              </p>

              <p>
                8.3. Poskytovateľ nezodpovedá za rozhodnutia škôl,
                disciplinárne konania, plagiátorské sankcie ani akademické
                výsledky.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                9. AI modely tretích strán
              </h2>

              <p className="mt-3">
                9.1. Služba využíva modely tretích strán, napríklad OpenAI,
                Google, Anthropic alebo Mistral.
              </p>

              <p>
                9.2. Poskytovateľ nezodpovedá za výpadky týchto systémov, zmeny
                ich funkcionality ani obmedzenia ich dostupnosti.
              </p>
            </section>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row">
            <Link
              href="/gdpr"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Zásady ochrany osobných údajov
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Späť na úvodnú stránku
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}