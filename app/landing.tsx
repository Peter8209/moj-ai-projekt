'use client';

import { useState } from "react";
import Link from "next/link";

// ================= PAGE =================
export default function Home() {
  return (
    <main className="min-h-screen bg-[#020617] text-white">

      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-10 py-5 border-b border-white/10 backdrop-blur-xl">
        <div className="text-2xl font-black">ZEDPERA</div>

        <div className="flex gap-8 items-center text-sm">
          <a href="#pricing">Pricing</a>
          <a href="#features">Features</a>
          <a href="#faq">FAQ</a>

          <Link href="/chat" className="bg-blue-600 px-5 py-2 rounded-full">
            Start Writing
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="grid md:grid-cols-2 gap-10 items-center px-10 py-24 max-w-7xl mx-auto">

        {/* LEFT */}
        <div>
          <h1 className="text-5xl font-black mb-6">
            One prompt. <br /> Celá diplomovka.
          </h1>

          <p className="text-gray-400 mb-8 text-lg">
            ZEDPERA vytvorí celú prácu vrátane analýzy, štruktúry a hodnotenia.
          </p>

          <div className="flex gap-4 mb-6">
            <Link href="/chat" className="bg-blue-600 px-8 py-4 rounded-full">
              Start Writing
            </Link>

            <a href="#features" className="bg-white/10 px-8 py-4 rounded-full">
              See Features
            </a>
          </div>

          <div className="space-y-2 text-gray-400 text-sm">
            <div>✔ 8–80 strán práce</div>
            <div>✔ AI vedúci + skóre</div>
            <div>✔ export PDF / Word</div>
            <div>✔ pripravené na obhajobu</div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="bg-black/40 p-3 rounded-lg text-sm mb-3">
            Napíš tému práce...
          </div>

          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="bg-blue-600 px-3 py-1 rounded-full text-xs">AI vedúci</span>
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs">Analýza</span>
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs">Zdroje</span>
          </div>

          <div className="bg-black/50 p-4 rounded-xl text-sm text-gray-300">
            AI generuje kapitoly, analyzuje kvalitu a pripraví ťa na obhajobu…
          </div>
        </div>

      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          AI systém, nie len chat
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white/5 p-6 rounded-2xl">
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section className="py-20 bg-black/30 text-center">
        <h2 className="text-3xl font-bold mb-12">Ako to funguje</h2>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Step n="1" text="Zadáš tému práce" />
          <Step n="2" text="AI píše a analyzuje" />
          <Step n="3" text="Dostaneš výsledok" />
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 text-center">
        <h2 className="text-3xl font-bold mb-10">Pricing</h2>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Price name="Mesačný" price="40€" plan="monthly" />
          <Price name="3 mesiace" price="70€" plan="quarterly" highlight />
          <Price name="Ročný" price="240€" plan="yearly" />
        </div>
      </section>

      {/* TEAM */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold mb-10">Team</h2>

        <div className="flex justify-center gap-10">
          {["Peter", "AI Engine", "Developer"].map((t, i) => (
            <div key={i}>
              <div className="w-20 h-20 bg-white/10 rounded-full mb-2"></div>
              <p>{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-10">FAQ</h2>

        {faq.map((f, i) => (
          <FAQItem key={i} q={f.q} a={f.a} />
        ))}
      </section>

      {/* CTA */}
      <section className="text-center py-20">
        <h2 className="text-4xl font-black mb-6">
          Začni písať teraz
        </h2>

        <Link href="/chat" className="bg-blue-600 px-10 py-5 rounded-full">
          Start Writing
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="text-center py-10 text-gray-500 text-sm border-t border-white/10">
        © ZEDPERA 2026
      </footer>

    </main>
  );
}

////////////////////////////////////////////////////////////////////////////////

// ================= DATA =================
const features = [
  { title: "AI písanie", desc: "Celé kapitoly práce" },
  { title: "AI vedúci", desc: "Analýza a chyby" },
  { title: "Skóre", desc: "Hodnotenie 0–100" },
  { title: "Obhajoba", desc: "Simulácia otázok" },
  { title: "Zdroje", desc: "Práca s článkami" },
  { title: "Export", desc: "PDF, Word, LaTeX" },
];

const faq = [
  {
    q: "Koľko strán vie ZEDPERA vytvoriť?",
    a: "Od 8 do 80 strán."
  },
  {
    q: "Je text detekovateľný AI?",
    a: "Minimalizujeme AI štýl."
  },
  {
    q: "Aké jazyky podporuje?",
    a: "SK, CZ, EN, DE."
  },
];

////////////////////////////////////////////////////////////////////////////////

// ================= COMPONENTS =================
function Step({ n, text }: any) {
  return (
    <div className="bg-white/5 p-6 rounded-2xl">
      <div className="text-3xl mb-2">{n}</div>
      <p>{text}</p>
    </div>
  );
}

function Price({ name, price, plan, highlight }: any) {
  return (
    <div className={`p-6 rounded-2xl ${highlight ? 'bg-white/10 border border-blue-500' : 'bg-white/5'}`}>
      <h3 className="text-xl font-bold">{name}</h3>
      <p className="text-3xl my-4">{price}</p>

      <button
        onClick={() => buy(plan)}
        className="bg-blue-600 px-4 py-2 rounded-xl w-full"
      >
        Kúpiť
      </button>
    </div>
  );
}

function FAQItem({ q, a }: any) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/10 py-4">
      <div
        className="flex justify-between cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <h3>{q}</h3>
        <span>+</span>
      </div>

      {open && (
        <p className="text-gray-400 mt-3">{a}</p>
      )}
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////

// ================= PAYMENT =================
async function buy(plan: string) {
  const res = await fetch("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan,
      email: "test@test.com",
      currency: "EUR"
    }),
  });

  const data = await res.json();

  if (data.url) {
    window.location.href = data.url;
  }
}