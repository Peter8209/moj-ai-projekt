'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  FileText,
  GraduationCap,
  Library,
  LockKeyhole,
  PlayCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  UploadCloud,
  Zap,
} from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

type PlanId =
  | 'free'
  | 'month'
  | 'quarter'
  | 'year'
  | 'supervisor'
  | 'audit'
  | 'defense'
  | 'admin-free';

type PricingPlan = {
  id: PlanId;
  name: string;
  subtitle: string;
  price: string;
  oldPrice?: string;
  badge?: string;
  highlight?: boolean;
  description: string;
  button: string;
  features: string[];
};

type FAQItemType = {
  question: string;
  answer: string;
};

type FeatureItem = {
  icon: ReactNode;
  title: string;
  text: string;
};

type ReviewItem = {
  name: string;
  role: string;
  text: string;
};

type CompareItem = {
  bad: string;
  good: string;
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-slate-950">
      {/* PROMO BAR */}
      <div className="bg-[#064e4a] px-4 py-3 text-center text-sm font-black text-white">
        🎓 Promo akcia: 3 mesiace za 70 € — ideálne pre seminárnu, bakalársku,
        diplomovú, rigoróznu alebo dizertačnú prácu.
      </div>

      {/* TOP NAVBAR - ŽIADNE ĽAVÉ MENU */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20">
              <GraduationCap className="h-6 w-6" />
            </div>

            <div>
              <div className="text-xl font-black tracking-tight">ZEDPERA</div>
              <div className="-mt-1 text-xs font-semibold text-slate-500">
                AI akademický asistent
              </div>
            </div>
          </Link>

          <div className="flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 text-sm font-bold text-slate-700 lg:w-auto lg:justify-center lg:overflow-visible lg:pb-0">
            <a href="#features" className="rounded-full px-3 py-2 hover:bg-slate-100 hover:text-indigo-600">
              Funkcie
            </a>
            <a href="#how" className="rounded-full px-3 py-2 hover:bg-slate-100 hover:text-indigo-600">
              Ako to funguje
            </a>
            <a href="#comparison" className="rounded-full px-3 py-2 hover:bg-slate-100 hover:text-indigo-600">
              Porovnanie
            </a>
            <a href="#reviews" className="rounded-full px-3 py-2 hover:bg-slate-100 hover:text-indigo-600">
              Recenzie
            </a>
            <a href="#pricing" className="rounded-full px-3 py-2 hover:bg-slate-100 hover:text-indigo-600">
              Balíčky
            </a>
            <a href="#faq" className="rounded-full px-3 py-2 hover:bg-slate-100 hover:text-indigo-600">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Prihlásiť sa
            </Link>

            <Link
              href="/register"
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
            >
              Vyskúšať Zedperu
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute left-[-160px] top-[-160px] h-[520px] w-[520px] rounded-full bg-indigo-200/70 blur-3xl" />
        <div className="absolute right-[-160px] top-20 h-[520px] w-[520px] rounded-full bg-amber-200/80 blur-3xl" />
        <div className="absolute bottom-[-220px] left-1/2 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-emerald-200/60 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/75 px-4 py-2 text-sm font-black text-indigo-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Prvý akademický AI nástroj pre písanie, kontrolu a obhajobu práce
            </div>

            <h1 className="max-w-5xl text-5xl font-black leading-[0.98] tracking-tight text-slate-950 md:text-6xl xl:text-7xl">
              Píš akademickú prácu bez stresu, s AI vedúcim a jasným postupom.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-650">
              ZEDPERA ťa prevedie celým procesom od prvého nápadu, témy,
              osnovy a zdrojov až po finálnu kontrolu, originalitu a prípravu
              na obhajobu. Nie je to obyčajný chat. Je to systém vytvorený
              priamo pre akademické písanie.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-base font-black text-white shadow-xl shadow-indigo-600/25 hover:bg-indigo-700"
              >
                Začať písať bez stresu
                <ArrowRight className="h-5 w-5" />
              </Link>

              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-4 text-base font-black text-slate-900 shadow-sm hover:bg-slate-50"
              >
                Pozrieť balíčky
              </a>
            </div>

            <div className="mt-8 grid gap-3 text-sm font-semibold text-slate-650 sm:grid-cols-2">
              <HeroCheck text="AI vedúci práce dostupný 24/7" />
              <HeroCheck text="Práca so zdrojmi a citáciami" />
              <HeroCheck text="Praktická časť, analýzy a výpočty" />
              <HeroCheck text="Príprava na obhajobu podľa posudkov" />
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <TrustItem
            icon={<Brain className="h-6 w-6" />}
            title="AI vedúci a kritik"
            text="Spätná väzba, návrhy úprav, skóre kvality a upozornenia na slabé miesta."
          />
          <TrustItem
            icon={<Library className="h-6 w-6" />}
            title="Zdroje a citácie"
            text="Práca s vlastnými zdrojmi, poznámkami a online databázou."
          />
          <TrustItem
            icon={<FileCheck2 className="h-6 w-6" />}
            title="Originalita"
            text="Orientačná kontrola zhody a odporúčania, ktoré časti upraviť."
          />
          <TrustItem
            icon={<GraduationCap className="h-6 w-6" />}
            title="Obhajoba"
            text="Príprava odpovedí, prezentácie a sprievodného textu podľa posudkov."
          />
        </div>
      </section>

      {/* VIDEO / INTRO */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-4 shadow-2xl shadow-slate-900/10">
          <div className="relative flex aspect-video items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-indigo-600 via-violet-700 to-slate-950 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_35%)]" />
            <div className="relative text-center">
              <PlayCircle className="mx-auto mb-4 h-16 w-16" />
              <div className="text-2xl font-black">VIDEO</div>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/75">
                Tu môžeš vložiť promo video alebo animáciu, ktorá ukáže, ako
                ZEDPERA sprevádza študenta krok za krokom.
              </p>
            </div>
          </div>
        </div>

        <div>
          <SectionEyebrow>Inteligentný nástroj novej generácie</SectionEyebrow>

          <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            ZEDPERA ti neponúka len výsledok. Učí ťa premýšľať nad prácou.
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-650">
            Zedpera pomáha zlepšovať tvoju prácu krok za krokom. Presne vieš,
            čo máš robiť ďalej, kde je slabé miesto, čo treba doplniť, ktoré
            zdroje použiť a ako pripraviť text tak, aby bol logický,
            prehľadný a obhájiteľný.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <MiniPoint title="Nie obyčajný chat" text="Systém pozná profil tvojej práce a pracuje s kontextom." />
            <MiniPoint title="Nie náhodné zdroje" text="Vie pracovať s nahranými zdrojmi, databázou a citáciami." />
            <MiniPoint title="Nie len text" text="Pomáha aj s praktickou časťou, analýzou a výpočtami." />
            <MiniPoint title="Nie len písanie" text="Pripraví ťa aj na obhajobu a otázky komisie." />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionTitle
          label="Funkcie"
          title="Všetko, čo študent potrebuje na jednom mieste"
          text="ZEDPERA pokrýva celý proces akademickej práce — od zadania a zdrojov až po kontrolu, opravy a obhajobu."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-slate-950 px-5 py-20 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow dark>Ako to funguje</SectionEyebrow>

            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Jednoduchý postup od účtu až po obhajobu
            </h2>

            <p className="mt-5 text-lg leading-8 text-white/65">
              Používateľ sa nemusí trápiť zložitými promptami. ZEDPERA ho vedie
              cez jednotlivé kroky a prispôsobuje výstupy téme, typu práce,
              metodike, zdrojom a požiadavkám školy.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step) => (
              <Step key={step.number} number={step.number} title={step.title} text={step.text} />
            ))}
          </div>

          <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <h3 className="text-3xl font-black">AI vedúci práce 24/7</h3>
                <p className="mt-4 leading-8 text-white/65">
                  Keď dostaneš pripomienky od školiteľa, nahráš ich do systému.
                  ZEDPERA ich zanalyzuje, vysvetlí, čo znamenajú, a navrhne
                  konkrétne úpravy. Funguje ako školiteľ, kritik a korektor v
                  jednom.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <DarkStat value="24/7" label="dostupnosť" />
                <DarkStat value="5+" label="AI modulov" />
                <DarkStat value="1" label="profil práce" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="comparison" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionTitle
          label="Porovnanie"
          title="Prečo nestačí bežná AI alebo všeobecný LLM notebook?"
          text="Bežné AI nástroje často generujú všeobecné texty, vyžadujú dlhé prompty, nepamätajú si celý akademický kontext a môžu pracovať s neoverenými zdrojmi. ZEDPERA je navrhnutá pre akademický proces."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-8">
            <div className="mb-6 inline-flex rounded-full bg-rose-600 px-4 py-1 text-sm font-black text-white">
              Bežná AI
            </div>

            <div className="space-y-4">
              {comparison.map((item) => (
                <CompareBad key={item.bad} text={item.bad} />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8">
            <div className="mb-6 inline-flex rounded-full bg-emerald-600 px-4 py-1 text-sm font-black text-white">
              ZEDPERA
            </div>

            <div className="space-y-4">
              {comparison.map((item) => (
                <CompareGood key={item.good} text={item.good} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-base font-black text-white shadow-xl shadow-indigo-600/25 hover:bg-indigo-700"
          >
            Chcem vyskúšať Zedperu
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* AI DETECTION */}
      <section className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            label="AI detekcia a originalita"
            title="AI detektor nie je konečný dôkaz"
            text="AI detektory pracujú pravdepodobnostne. Preto je dôležitejšie, aby študent rozumel svojej práci, vedel vysvetliť postup, mal reálne zdroje a konzistentný text."
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            <InfoCard
              title="Detektor iba odhaduje"
              text="Sleduje jazykové vzory, predvídateľnosť, dĺžku viet a štýl. Nevie s istotou potvrdiť, kto text napísal."
            />
            <InfoCard
              title="Falošné označenia existujú"
              text="Formálne, gramaticky správne a odborné texty môžu byť nesprávne vyhodnotené ako AI obsah."
            />
            <InfoCard
              title="Rozhoduje obhájiteľnosť"
              text="Najdôležitejšie je, či používateľ práci rozumie, vie vysvetliť zdroje, metodiku a vlastné závery."
            />
          </div>

          <div className="mt-10 rounded-[2rem] border border-slate-200 bg-slate-50 p-8">
            <h3 className="text-2xl font-black">
              Čo si v práci najviac všíma školiteľ alebo oponent?
            </h3>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {riskItems.map((item) => (
                <div key={item} className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 font-black text-slate-950">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                    Kontrolný bod
                  </div>
                  <p className="text-sm leading-6 text-slate-650">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <SectionEyebrow>O nás</SectionEyebrow>
          <h2 className="mt-3 text-4xl font-black tracking-tight">
            20 rokov skúseností pretavených do akademickej AI platformy.
          </h2>
          <p className="mt-5 leading-8 text-slate-650">
            ZEDPERA vznikla ako reakcia na realitu študentov: časový tlak,
            nejasné zadania, slabú spätnú väzbu, nedostupných školiteľov a
            stres pred odovzdaním alebo obhajobou. Cieľom nie je vytvoriť len
            ďalší generátor textu, ale systém, ktorý rozumie procesu písania.
          </p>
        </div>

        <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-900/10">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500">
            <Sparkles className="h-7 w-7" />
          </div>

          <h3 className="text-3xl font-black">Neustále posúvame hranice</h3>

          <p className="mt-5 leading-8 text-white/70">
            ZEDPERA nerastie iba vo funkciách, ale hlavne v tom, ako premýšľa.
            Neučíme ju len písať texty. Učíme ju rozumieť procesu: zadaniu,
            cieľu, metodike, argumentácii, zdrojom, spätnej väzbe a obhajobe.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <DarkStat value="20+" label="rokov praxe" />
            <DarkStat value="1000+" label="skúseností" />
            <DarkStat value="24/7" label="AI podpora" />
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            label="Recenzie"
            title="Skúsenosti používateľov"
            text="Ukážka spätných väzieb od študentov, ktorí používali ZEDPERU pri seminárnych, bakalárskych, diplomových alebo rigoróznych prácach."
          />

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {reviews.map((review) => (
              <ReviewCard key={review.name} review={review} />
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionTitle
          label="Balíčky"
          title="Vyberte si prístup podľa potreby"
          text="Po registrácii a úhrade sa používateľ dostane priamo do aplikácie. Balíky je možné napojiť na platobnú bránu cez API /api/payments."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>

        <div className="mt-14 rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-indigo-600 px-4 py-1 text-sm font-black text-white">
                Doplnkové služby
              </div>

              <h3 className="text-3xl font-black">
                Pridaj si AI vedúceho, audit alebo obhajobu
              </h3>

              <p className="mt-3 max-w-3xl leading-7 text-slate-650">
                Doplnkové služby môžeš predávať samostatne alebo ako súčasť
                vyšších balíkov. Používateľ si ich môže aktivovať podľa fázy,
                v ktorej sa jeho práca nachádza.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <AddonButton id="supervisor" name="AI vedúci" price="50 €" />
              <AddonButton id="audit" name="Audit práce" price="50 €" />
              <AddonButton id="defense" name="Obhajoba" price="60 €" />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-700">
                <LockKeyhole className="h-4 w-4" />
                Admin univerzálny vstup
              </div>

              <h3 className="text-2xl font-black">Admin Free režim</h3>

              <p className="mt-2 max-w-3xl leading-7 text-slate-700">
                Tento vstup používaj iba pre vlastný admin účet. Vo finálnej
                verzii ho odporúčam povoliť len pre konkrétny admin e-mail
                alebo rolu v databáze, nie ako verejne dostupné tlačidlo.
              </p>
            </div>

            <button
              onClick={() => enterFree('admin-free')}
              className="rounded-full bg-emerald-600 px-7 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
            >
              Vstúpiť ako admin free
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <SectionTitle
            label="Otázky a odpovede"
            title="Časté otázky"
            text="Najdôležitejšie odpovede k používaniu ZEDPERY, balíkom, AI vedúcemu, zdrojom, originalite a predplatnému."
          />

          <div className="mt-12 divide-y divide-slate-200 rounded-[2rem] border border-slate-200 bg-white px-6 shadow-sm">
            {faq.map((item) => (
              <FAQAccordion key={item.question} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* LEGAL NOTE */}
      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                <ShieldCheck className="h-4 w-4" />
                Transparentné používanie AI
              </div>

              <h3 className="text-2xl font-black">
                ZEDPERA je softvérový nástroj, nie záruka akademického výsledku.
              </h3>

              <p className="mt-3 max-w-4xl leading-7 text-slate-650">
                Používateľ je zodpovedný za finálny obsah práce, správnosť
                údajov, použité zdroje, citácie a dodržiavanie pravidiel svojej
                školy. Výstupy AI je potrebné overovať, upravovať a dopĺňať
                odbornými zdrojmi.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/terms"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
              >
                Obchodné podmienky
              </Link>

              <Link
                href="/privacy"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
              >
                GDPR
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 p-10 text-center text-white shadow-2xl shadow-indigo-600/25 md:p-16">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
            <Sparkles className="h-8 w-8" />
          </div>

          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            Začni písať bez stresu už dnes
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/75">
            Vytvor si účet, vyber balík a pokračuj priamo do aplikácie.
            ZEDPERA ťa prevedie od prvého nápadu až po obhajobu.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="rounded-full bg-white px-8 py-4 text-base font-black text-indigo-700 shadow-lg"
            >
              Vytvoriť účet
            </Link>

            <Link
              href="/login"
              className="rounded-full border border-white/30 px-8 py-4 text-base font-black text-white hover:bg-white/10"
            >
              Už mám účet
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 text-sm text-slate-500 md:flex-row md:items-center">
          <div>
            <div className="font-black text-slate-950">ZEDPERA</div>
            <div>© 2026 ZEDPERA. AI akademický asistent.</div>
          </div>

          <div className="flex flex-wrap gap-5">
            <Link href="/login" className="hover:text-indigo-600">
              Prihlásenie
            </Link>
            <Link href="/register" className="hover:text-indigo-600">
              Registrácia
            </Link>
            <a href="#pricing" className="hover:text-indigo-600">
              Balíčky
            </a>
            <a href="#faq" className="hover:text-indigo-600">
              FAQ
            </a>
            <Link href="/terms" className="hover:text-indigo-600">
              Podmienky
            </Link>
            <Link href="/privacy" className="hover:text-indigo-600">
              GDPR
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

// =====================================================
// COMPONENTS
// =====================================================

function HeroPreview() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10">
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
        <div className="flex gap-2">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>

        <div className="rounded-full bg-white px-4 py-1 text-xs font-bold text-slate-500">
          zedpera.com
        </div>

        <div className="w-12" />
      </div>

      <div className="rounded-[1.5rem] bg-[#0f1020] p-6 text-white">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500">
            <Brain className="h-6 w-6" />
          </div>

          <div>
            <div className="font-black">AI vedúci práce</div>
            <div className="text-sm text-white/60">
              Kontrola kvality a odporúčania
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <PreviewLine label="Logika textu" value={86} />
          <PreviewLine label="Argumentácia" value={78} />
          <PreviewLine label="Citácie a zdroje" value={91} />
          <PreviewLine label="Pripravenosť na obhajobu" value={82} />
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 text-sm font-bold text-indigo-200">
            Odporúčanie AI
          </div>

          <p className="text-sm leading-6 text-white/75">
            Doplň presnejšie vymedzenie výskumnej otázky, pridaj zdroj k
            tvrdeniu v 2. kapitole a uprav záver tak, aby priamo odpovedal na
            cieľ práce.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <PreviewTag text="Osnova" />
          <PreviewTag text="Kapitoly" />
          <PreviewTag text="Zdroje" />
          <PreviewTag text="Obhajoba" />
          <PreviewTag text="Originalita" />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <SectionEyebrow>{label}</SectionEyebrow>

      <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
        {title}
      </h2>

      {text ? (
        <p className="mt-5 text-lg leading-8 text-slate-650">{text}</p>
      ) : null}
    </div>
  );
}

function SectionEyebrow({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`text-sm font-black uppercase tracking-wider ${
        dark ? 'text-indigo-300' : 'text-indigo-600'
      }`}
    >
      {children}
    </div>
  );
}

function HeroCheck({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      {text}
    </div>
  );
}

function PreviewLine({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-white/65">{label}</span>
        <span className="font-black">{value} %</span>
      </div>

      <div className="h-2 rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-indigo-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function PreviewTag({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
      {text}
    </span>
  );
}

function TrustItem({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1 text-indigo-600">{icon}</div>

      <div>
        <div className="font-black">{title}</div>
        <div className="mt-1 text-sm leading-6 text-slate-650">{text}</div>
      </div>
    </div>
  );
}

function MiniPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2 font-black">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        {title}
      </div>
      <p className="text-sm leading-6 text-slate-650">{text}</p>
    </div>
  );
}

function FeatureCard({ feature }: { feature: FeatureItem }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        {feature.icon}
      </div>

      <h3 className="text-xl font-black">{feature.title}</h3>

      <p className="mt-3 leading-7 text-slate-650">{feature.text}</p>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-7">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-xl font-black">
        {number}
      </div>

      <h3 className="text-xl font-black">{title}</h3>

      <p className="mt-3 leading-7 text-white/65">{text}</p>
    </div>
  );
}

function DarkStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
      <div className="text-3xl font-black">{value}</div>
      <div className="mt-1 text-sm text-white/60">{label}</div>
    </div>
  );
}

function CompareBad({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-4 text-sm leading-6 text-slate-700">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 font-black text-rose-700">
        ×
      </span>
      <span>{text}</span>
    </div>
  );
}

function CompareGood({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-4 text-sm leading-6 text-slate-700">
      <Check className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
      <span>{text}</span>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-black">{title}</h3>
      <p className="mt-3 leading-7 text-slate-650">{text}</p>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewItem }) {
  return (
    <div className="flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
      <Quote className="mb-5 h-8 w-8 text-indigo-500" />

      <p className="flex-1 text-sm leading-7 text-slate-650">{review.text}</p>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="font-black text-slate-950">{review.name}</div>
        <div className="text-sm text-slate-500">{review.role}</div>
      </div>
    </div>
  );
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div
      className={`relative flex flex-col rounded-[2rem] border p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        plan.highlight
          ? 'border-indigo-300 bg-white ring-4 ring-indigo-100'
          : 'border-slate-200 bg-white'
      }`}
    >
      {plan.badge && (
        <div
          className={`mb-5 inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${
            plan.highlight
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {plan.badge}
        </div>
      )}

      <h3 className="text-2xl font-black">{plan.name}</h3>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        {plan.subtitle}
      </p>

      <div className="mt-6">
        <div className="flex items-end gap-3">
          <div className="text-4xl font-black tracking-tight">{plan.price}</div>

          {plan.oldPrice && (
            <div className="pb-1 text-base font-bold text-slate-400 line-through">
              {plan.oldPrice}
            </div>
          )}
        </div>

        <div className="mt-1 text-sm text-slate-500">
          {plan.id === 'free' ? 'bez platby' : 'EUR / prístup'}
        </div>
      </div>

      <p className="mt-5 min-h-[72px] text-sm leading-6 text-slate-650">
        {plan.description}
      </p>

      <button
        onClick={() => {
          if (plan.id === 'free') {
            enterFree('free');
          } else {
            buy(plan.id);
          }
        }}
        className={`mt-6 rounded-full px-5 py-4 text-sm font-black transition ${
          plan.highlight
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700'
            : 'bg-slate-950 text-white hover:bg-slate-800'
        }`}
      >
        {plan.button}
      </button>

      <div className="mt-7 border-t border-slate-200 pt-6">
        <div className="mb-4 text-sm font-black text-slate-950">
          Obsah balíka:
        </div>

        <div className="space-y-3">
          {plan.features.map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-3 text-sm leading-6"
            >
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <span className="text-slate-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddonButton({
  id,
  name,
  price,
}: {
  id: PlanId;
  name: string;
  price: string;
}) {
  return (
    <button
      onClick={() => buy(id)}
      className="rounded-2xl border border-indigo-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="mb-2 flex items-center gap-2 text-indigo-600">
        <Star className="h-4 w-4" />
        <span className="text-xs font-black uppercase">Doplnok</span>
      </div>

      <div className="font-black text-slate-950">{name}</div>

      <div className="mt-1 text-2xl font-black text-indigo-600">{price}</div>
    </button>
  );
}

function FAQAccordion({ item }: { item: FAQItemType }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="py-5">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-6 text-left"
      >
        <span className="text-lg font-black">{item.question}</span>

        <ChevronDown
          className={`h-5 w-5 shrink-0 transition ${
            open ? 'rotate-180 text-indigo-600' : 'text-slate-500'
          }`}
        />
      </button>

      {open && (
        <p className="mt-4 max-w-3xl leading-7 text-slate-650">
          {item.answer}
        </p>
      )}
    </div>
  );
}

// =====================================================
// DATA
// =====================================================

const features: FeatureItem[] = [
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: 'Rýchle vytvorenie práce',
    text: 'Zadaj tému, vyplň profil a získaj odborný text prispôsobený zadaniu, zdrojom, typu práce, jazyku a citačnej norme.',
  },
  {
    icon: <Brain className="h-6 w-6" />,
    title: 'AI vedúci práce 24/7',
    text: 'Sprevádza ťa celým procesom, kontroluje text, navrhuje vylepšenia a pomáha zapracovať pripomienky od školiteľa.',
  },
  {
    icon: <FileCheck2 className="h-6 w-6" />,
    title: 'AI kritik a skóre kvality',
    text: 'Analyzuje logiku, argumentáciu, metodiku, duplicity, štýl a navrhne konkrétne opravy problémových častí.',
  },
  {
    icon: <Library className="h-6 w-6" />,
    title: 'Zdroje a citácie',
    text: 'Použi vlastné zdroje, poznámky z konzultácií alebo online databázu. Systém pomáha citovať podľa zvolenej normy.',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Praktická časť a výpočty',
    text: 'Pomoc pri analýzach, štatistike, interpretácii dát, grafoch, výpočtoch a spracovaní praktickej časti.',
  },
  {
    icon: <GraduationCap className="h-6 w-6" />,
    title: 'Príprava na obhajobu',
    text: 'Po nahratí práce a posudkov systém pripraví obhajobu, otázky, odpovede, prezentáciu a sprievodný text.',
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: 'Kontrola originality',
    text: 'Orientačne vyhodnotí mieru zhody a pomôže identifikovať časti, ktoré je vhodné upraviť alebo doplniť zdrojmi.',
  },
  {
    icon: <UploadCloud className="h-6 w-6" />,
    title: 'Nahrávanie podkladov',
    text: 'Nahraj zadanie, poznámky, zdroje, posudky alebo vlastné texty a pracuj s nimi v jednom profile práce.',
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: 'Export a história práce',
    text: 'Ukladaj si postup, kapitoly, úpravy, pripomienky a pripravuj text na ďalšie spracovanie vo Worde alebo PDF.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Založ si účet',
    text: 'Registrácia trvá len chvíľu. Po prihlásení sa dostaneš do používateľského menu.',
  },
  {
    number: '2',
    title: 'Vyplň profil práce',
    text: 'Zadáš tému, typ práce, cieľ, metodiku, jazyk, citačný štýl a ďalšie požiadavky.',
  },
  {
    number: '3',
    title: 'Nahraj zdroje',
    text: 'Použi vlastné zdroje, poznámky z konzultácií alebo online databázu. Môžeš ich aj kombinovať.',
  },
  {
    number: '4',
    title: 'Začni písať',
    text: 'ZEDPERA vytvorí osnovu, kapitoly, úvod, záver, abstrakt alebo praktickú časť podľa profilu.',
  },
  {
    number: '5',
    title: 'Použi AI vedúceho',
    text: 'AI vedúci ťa upozorní na chyby, nelogické časti, slabé tvrdenia a navrhne konkrétne opravy.',
  },
  {
    number: '6',
    title: 'Over originalitu',
    text: 'Skontroluj zhodu a získaj odporúčania, čo upraviť, doplniť alebo lepšie odcitovať.',
  },
  {
    number: '7',
    title: 'Priprav obhajobu',
    text: 'Nahraj posudky a systém pripraví odpovede, prezentáciu, sprievodný text a argumentáciu.',
  },
  {
    number: '8',
    title: 'Dokonči finálnu verziu',
    text: 'Skontroluj výstup, doplň vlastné poznámky, over zdroje a priprav prácu na odovzdanie.',
  },
];

const comparison: CompareItem[] = [
  {
    bad: 'Píše všeobecné texty, omáčky a môže robiť faktické chyby.',
    good: 'Pozná tému, profil práce, cieľ, metodiku, hypotézy, štýl a požiadavky.',
  },
  {
    bad: 'Nepamätá si celý akademický kontext a musíš opakovať dlhé prompty.',
    good: 'Pracuje s históriou projektu a používateľ nemusí stále zadávať rovnaké informácie.',
  },
  {
    bad: 'Môže si vymýšľať zdroje alebo uvádzať nepresné citácie.',
    good: 'Vychádza z vlastných zdrojov, databázy a citačného štýlu zvoleného v profile.',
  },
  {
    bad: 'Nedokáže spoľahlivo reagovať na pripomienky vedúceho alebo oponenta.',
    good: 'Vie analyzovať pripomienky, vysvetliť ich význam a navrhnúť konkrétne zapracovanie.',
  },
  {
    bad: 'Nepomôže komplexne s praktickou časťou, výpočtami, grafmi a interpretáciou.',
    good: 'Pomáha s praktickou časťou, analýzami, výpočtami, grafmi a vysvetlením výsledkov.',
  },
  {
    bad: 'Nevie pripraviť obhajobu podľa práce a posudkov.',
    good: 'Pripraví obhajobu, odpovede na otázky, argumentáciu a sprievodný text.',
  },
];

const riskItems = [
  'Neexistujúce alebo zvláštne zdroje, ktoré si školiteľ vie rýchlo overiť.',
  'Skoky v štýle písania medzi kapitolami alebo časťami práce.',
  'Prehnane umelý jazyk bez konkrétneho významu a vlastnej argumentácie.',
  'Prázdne závery, ktoré neodpovedajú na cieľ práce alebo výskumné otázky.',
  'Nesprávne formátovanie, zvyšné znaky z editorov alebo nejednotná štruktúra.',
  'Frázy typické pre AI alebo text, ktorému autor pri obhajobe nerozumie.',
];

const reviews: ReviewItem[] = [
  {
    name: 'Študentka bakalárskeho štúdia',
    role: 'Bakalárska práca',
    text: 'Zedperu používam niekoľko týždňov a konečne nemám z práce stres. Keď školiteľka pošle pripomienky, AI vedúci mi pomôže pochopiť, čo presne treba upraviť.',
  },
  {
    name: 'Externý študent',
    role: 'Seminárne práce',
    text: 'Popri práci a rodine som nestíhal písať seminárky. V Zedpere som si nastavil profil, nahral zadanie a systém ma viedol krok za krokom.',
  },
  {
    name: 'Študent diplomového štúdia',
    role: 'Diplomová práca',
    text: 'Najviac oceňujem, že systém pracuje so zdrojmi a nepôsobí ako obyčajný generátor textu. Pomohol mi hlavne pri štruktúre a argumentácii.',
  },
  {
    name: 'Používateľka po vrátení práce',
    role: 'Prepracovanie kapitol',
    text: 'Po pripomienkach som nevedela, ako pokračovať. Nahrala som zadanie, poznámky aj zdroje a Zedpera mi pomohla prejsť prácu systematicky od začiatku.',
  },
  {
    name: 'Študent rigorózneho konania',
    role: 'Príprava obhajoby',
    text: 'Po posudkoch som potreboval vysvetliť chyby a pripraviť reakcie. Zedpera mi pomohla spracovať odpovede a jasnejšie pochopiť, kde bol problém.',
  },
  {
    name: 'Začiatočníčka s AI',
    role: 'Prvé použitie AI',
    text: 'Nikdy predtým som AI nepoužívala. Systém bol prehľadný, vyplnila som profil práce a pochopila som, ako postupovať bez zložitých promptov.',
  },
];

const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    subtitle: 'Vyskúšanie systému',
    price: '0 €',
    badge: 'Štart',
    button: 'Vyskúšať zadarmo',
    description:
      'Základný vstup do aplikácie pre používateľa, ktorý si chce pozrieť rozhranie a vyskúšať AI asistenta.',
    features: [
      'Vstup do používateľského menu',
      'Základné AI písanie',
      'Ukážka profilu práce',
      'Ukážka AI vedúceho',
      'Limitované používanie',
    ],
  },
  {
    id: 'month',
    name: 'Mesačný balík',
    subtitle: 'Najrýchlejší štart',
    price: '40 €',
    oldPrice: '49 €',
    badge: 'Mesačne',
    button: 'Kúpiť mesačný balík',
    description:
      'Vhodné pre používateľa, ktorý potrebuje intenzívne pracovať počas jedného mesiaca.',
    features: [
      'AI písanie kapitol',
      'Tvorba osnovy a štruktúry',
      'Práca so zdrojmi a citáciami',
      'AI vedúci práce',
      'Kontrola kvality textu',
      'História práce v účte',
    ],
  },
  {
    id: 'quarter',
    name: '3 mesiace',
    subtitle: 'Najvýhodnejší balík',
    price: '70 €',
    oldPrice: '120 €',
    badge: 'Promo akcia',
    highlight: true,
    button: 'Kúpiť 3-mesačný balík',
    description:
      'Najlepší balík pre bakalársku alebo diplomovú prácu, kde je viac času na úpravy.',
    features: [
      'Všetko z mesačného balíka',
      'Dlhší prístup k aplikácii',
      'Pokročilý AI vedúci práce',
      'Kontrola logiky a argumentácie',
      'Príprava na obhajobu',
      'Prioritné používanie AI nástrojov',
    ],
  },
  {
    id: 'year',
    name: 'Ročný balík',
    subtitle: 'Pre dlhodobé používanie',
    price: '240 €',
    oldPrice: '480 €',
    badge: 'Ročný prístup',
    button: 'Kúpiť ročný balík',
    description:
      'Pre používateľov, ktorí chcú systém využívať počas celého akademického roka.',
    features: [
      'Ročný prístup do aplikácie',
      'Viac projektov a prác',
      'Pokročilé AI nástroje',
      'AI vedúci, audit a obhajoba',
      'Práca so zdrojmi',
      'Výhodná cena pri dlhodobom používaní',
    ],
  },
];

const faq: FAQItemType[] = [
  {
    question: 'Môžem službu používať počas celého štúdia na viacero prác?',
    answer:
      'Áno. Službu môžete využívať opakovane počas štúdia na rôzne typy akademických prác — od seminárnych až po bakalárske, diplomové, dizertačné či rigorózne práce. Pre každé nové zadanie si vytvoríte alebo nastavíte nový projekt.',
  },
  {
    question: 'Zvládne ZEDPERA každý odbor?',
    answer:
      'ZEDPERA dokáže pracovať s rôznymi odbormi, ak jej používateľ poskytne dobrý profil práce, zadanie, zdroje a požiadavky. Výstupy je potrebné vždy odborne skontrolovať a prispôsobiť pravidlám školy.',
  },
  {
    question: 'Aký je rozdiel medzi ChatGPT, Gemini a ZEDPEROU?',
    answer:
      'ZEDPERA je vytvorená priamo pre akademické písanie. Pracuje s profilom práce, zdrojmi, cieľom, metodikou, históriou projektu a špecializovanými modulmi pre písanie, kontrolu, obhajobu a praktickú časť.',
  },
  {
    question: 'Čo je AI vedúci práce a AI kritik?',
    answer:
      'AI vedúci práce poskytuje spätnú väzbu, odporúčania a návrhy úprav počas písania. AI kritik sa sústredí na chyby, slabé miesta, nelogické tvrdenia, duplicity, štýl a kvalitu argumentácie.',
  },
  {
    question: 'Čo je AI obhajoba?',
    answer:
      'AI obhajoba pomáha pripraviť prezentáciu, odpovede na otázky, reakcie na posudky a sprievodný text. Vychádza z práce, posudkov a zadaného kontextu.',
  },
  {
    question: 'Ako funguje overenie zhody?',
    answer:
      'Po dokončení práce môže používateľ orientačne overiť zhodu textu. Výsledok slúži ako pomôcka na identifikáciu častí, ktoré je vhodné upraviť, doplniť zdrojom alebo lepšie parafrázovať.',
  },
  {
    question: 'Môžem použiť ZEDPERU len na vyhľadávanie zdrojov?',
    answer:
      'Áno. ZEDPERU je možné používať aj na prácu so zdrojmi, rešerš, prípravu citácií, pochopenie odborných textov alebo organizáciu literatúry.',
  },
  {
    question: 'V akých jazykoch môžem vytvoriť prácu?',
    answer:
      'Služba môže byť prispôsobená viacerým jazykom. Výstup závisí od nastavenia profilu, dostupných zdrojov, zadaného jazyka a požadovanej odbornej úrovne.',
  },
  {
    question: 'Je používanie služby legálne?',
    answer:
      'Používanie AI nástrojov pri štúdiu nie je všeobecne zakázané, ale pravidlá sa môžu líšiť podľa školy. Odporúča sa dodržať školské smernice a transparentne uviesť použitie AI, ak to škola vyžaduje.',
  },
  {
    question: 'Môžem predplatné kedykoľvek zrušiť?',
    answer:
      'Áno. Predplatné môže byť zrušiteľné podľa nastavených obchodných podmienok a platobného systému. Ak je predplatné automaticky obnovované, používateľ by mal mať možnosť obnovovanie vypnúť.',
  },
];

// =====================================================
// ACTIONS
// =====================================================

async function buy(plan: PlanId) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zedpera_selected_plan', plan);
    }

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan,
        currency: 'EUR',
        source: 'landingpage',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || 'Platbu sa nepodarilo vytvoriť.');
    }

    if (data?.url) {
      window.location.href = data.url;
      return;
    }

    throw new Error('API nevrátilo platobnú URL.');
  } catch (error) {
    console.error(error);

    alert(
      error instanceof Error
        ? error.message
        : 'Nastala chyba pri vytváraní platby.'
    );
  }
}

function enterFree(plan: 'free' | 'admin-free') {
  if (typeof window === 'undefined') return;

  localStorage.setItem('zedpera_selected_plan', plan);

  if (plan === 'admin-free') {
    localStorage.setItem('zedpera_admin_free', 'true');
    window.location.href = '/dashboard?mode=admin-free';
    return;
  }

  window.location.href = '/register?plan=free';
}