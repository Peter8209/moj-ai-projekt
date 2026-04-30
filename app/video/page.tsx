'use client';

import { useRouter } from 'next/navigation';

export default function VideoPage() {

  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">

      {/* ================= HEADER ================= */}
      <h1 className="text-3xl font-black mb-2">
        Ako používať Zedpera
      </h1>

      <p className="text-gray-400 mb-6">
        Pozri si krátke video a začni písať bez stresu
      </p>

      {/* ================= VIDEO ================= */}
      <div className="mb-8 rounded-xl overflow-hidden border border-white/10">

        {/* 👉 TU DÁŠ SVOJE VIDEO */}
        <iframe
          className="w-full h-[420px]"
          src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          title="Zedpera návod"
          allowFullScreen
        />

      </div>

      {/* ================= KROKY ================= */}
      <div className="grid md:grid-cols-2 gap-4 mb-10">

        <Step
          number="1"
          title="Vyplň profil práce"
          text="Zadaj tému, metodológiu a jazyk. AI z toho vychádza pri každej odpovedi."
          action={() => router.push('/profile')}
          button="Prejsť do profilu"
        />

        <Step
          number="2"
          title="Nahraj zdroje"
          text="PDF, články alebo poznámky. AI ich prečíta a použije pri písaní."
          action={() => router.push('/sources')}
          button="Nahrať zdroje"
        />

        <Step
          number="3"
          title="Generuj text"
          text="Napíš zadanie a AI vytvorí kapitolu v akademickom štýle."
          action={() => router.push('/chat')}
          button="Začať písať"
        />

        <Step
          number="4"
          title="AI vedúci práce"
          text="Získaj konkrétny feedback ako od školiteľa."
          action={() => router.push('/chat?mode=supervisor')}
          button="Skontrolovať prácu"
        />

        <Step
          number="5"
          title="Obhajoba"
          text="Simuluj otázky komisie a priprav sa na obhajobu."
          action={() => router.push('/chat?mode=defense')}
          button="Tréning obhajoby"
        />

        <Step
          number="6"
          title="Kontrola plagiátorstva"
          text="Over si originalitu textu pred odovzdaním."
          action={() => router.push('/chat?mode=audit')}
          button="Skontrolovať text"
        />

      </div>

      {/* ================= TIPY ================= */}
      <div className="border border-white/10 p-6 rounded-xl bg-white/5">

        <h2 className="text-xl font-black mb-4">
          💡 Tipy pre najlepšie výsledky
        </h2>

        <ul className="space-y-3 text-gray-300 text-sm">

          <li>✔ Čím presnejšie zadanie, tým lepší výstup</li>
          <li>✔ Nahraj kvalitné zdroje (PDF, články)</li>
          <li>✔ Používaj AI vedúceho – to je najväčšia výhoda</li>
          <li>✔ Kombinuj generovanie + kontrolu</li>
          <li>✔ Pracuj po kapitolách, nie naraz</li>

        </ul>

      </div>

      {/* ================= CTA ================= */}
      <div className="mt-10 text-center">

        <button
          onClick={() => router.push('/chat')}
          className="bg-violet-600 px-8 py-4 rounded-2xl font-bold text-lg"
        >
          Začať pracovať
        </button>

      </div>

    </div>
  );
}

// ================= COMPONENT =================
function Step({
  number,
  title,
  text,
  action,
  button
}: any) {

  return (
    <div className="border border-white/10 p-5 rounded-xl bg-white/5">

      <div className="text-violet-400 font-black text-lg">
        {number}.
      </div>

      <h3 className="text-lg font-bold mt-1">
        {title}
      </h3>

      <p className="text-sm text-gray-400 mt-2">
        {text}
      </p>

      <button
        onClick={action}
        className="mt-4 bg-white/10 px-4 py-2 rounded-xl text-sm"
      >
        {button}
      </button>

    </div>
  );
}