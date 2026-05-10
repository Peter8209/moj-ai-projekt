import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function GdprPage() {
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
            <ShieldCheck size={18} />
            GDPR
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 md:p-10">
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">
            Zásady ochrany osobných údajov
          </h1>

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Účinné od 30. 4. 2026
          </p>

          <div className="mt-10 space-y-8 text-base leading-8 text-slate-700">
            <section>
              <h2 className="text-2xl font-black text-slate-950">
                1. Prevádzkovateľ
              </h2>

              <p className="mt-3">
                Prevádzkovateľom je spoločnosť Thesbuy Ltd., IČO: 15544719, so
                sídlom Initial Business Centre Unit 7, Wilson Business Park,
                Manchester, United Kingdom, M40 8WN, ďalej len
                „Prevádzkovateľ“.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                2. Aké údaje spracúvame
              </h2>

              <p className="mt-3">
                Spracúvame najmä tieto osobné údaje: meno a priezvisko, ak je
                poskytnuté, e-mailová adresa, fakturačné údaje, prihlasovacie
                údaje, obsah nahraných súborov a textov, údaje o používaní
                služby, logy, aktivita v systéme a komunikácia s podporou.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                3. Účel spracúvania
              </h2>

              <p className="mt-3">
                Osobné údaje spracúvame za účelom poskytovania AI služby,
                generovania textov, používania AI vedúceho práce, prípravy
                obhajoby, správy používateľského účtu, fakturácie, plnenia
                účtovných povinností, technickej podpory, zabezpečenia
                funkčnosti a bezpečnosti systému a zlepšovania kvality služby.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                4. Kto má prístup k vašim údajom
              </h2>

              <p className="mt-3">
                K údajom môžu mať prístup poskytovatelia analytických a
                marketingových nástrojov, napríklad Google Ads, Google
                Analytics, Meta Pixel alebo TikTok Pixel, poskytovatelia AI
                modelov, napríklad OpenAI, Anthropic, Google Gemini, xAI Grok a
                ďalší poskytovatelia AI infraštruktúry, hostingové a cloudové
                služby, databázové riešenia, platobné brány, e-mailové a
                notifikačné systémy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                5. Právny základ spracúvania
              </h2>

              <p className="mt-3">
                Osobné údaje spracúvame na základe plnenia zmluvy, zákonných
                povinností, najmä účtovníctva, oprávneného záujmu, najmä
                bezpečnosti a zlepšovania služby, a súhlasu, ak je vyžadovaný,
                napríklad pri marketingu.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                6. Doba uchovávania údajov
              </h2>

              <p className="mt-3">
                Údaje uchovávame počas trvania používateľského účtu. Následne
                môžu byť uchovávané po dobu 30 dní až 4 rokov podľa typu
                údajov. Účtovné údaje uchovávame po dobu 10 rokov. Marketingové
                údaje uchovávame do odvolania súhlasu.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                7. Príjemcovia údajov
              </h2>

              <p className="mt-3">
                Údaje môžu byť spracúvané poskytovateľmi cloudových služieb,
                poskytovateľmi AI modelov, napríklad OpenAI, Google, Anthropic
                alebo Mistral, účtovnými a právnymi službami a technickými
                dodávateľmi infraštruktúry.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                8. Prenos do tretích krajín
              </h2>

              <p className="mt-3">
                Niektoré údaje môžu byť prenášané mimo Európskej únie,
                napríklad do USA, v rámci používania AI modelov. Takéto prenosy
                sú zabezpečené primeranými zárukami podľa GDPR.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                9. Práva používateľa
              </h2>

              <p className="mt-3">
                Používateľ má právo na prístup k údajom, opravu údajov,
                vymazanie údajov, teda právo na zabudnutie, obmedzenie
                spracúvania a prenosnosť údajov.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                10. Automatizované spracovanie
              </h2>

              <p className="mt-3">
                Služba využíva automatizované spracovanie vrátane AI generovania
                textu. Toto spracovanie nemá právne účinky voči Používateľovi v
                zmysle GDPR.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-950">
                11. Bezpečnosť
              </h2>

              <p className="mt-3">
                Prevádzkovateľ prijal primerané technické a organizačné
                opatrenia na ochranu osobných údajov pred stratou, zneužitím
                alebo neoprávneným prístupom.
              </p>
            </section>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row">
            <Link
              href="/obchodne-podmienky"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Obchodné podmienky
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