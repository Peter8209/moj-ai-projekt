'use client';

import { useState, useEffect } from 'react';

// ================= TYPES =================
type Plan = {
  id: string;
  name: string;
  price: string;
};

type Addon = {
  id: string;
  name: string;
  price: string;
};

// ================= DATA =================
const plans: Plan[] = [
  { id: 'monthly', name: 'Mesačný', price: '40 €' },
  { id: 'quarter', name: '3 mesiace', price: '70 €' },
  { id: 'yearly', name: 'Ročný', price: '240 €' },
];

const addons: Addon[] = [
  { id: 'supervisor', name: 'AI vedúci práce', price: '50 €' },
  { id: 'audit', name: 'Kontrola kvality', price: '50 €' },
  { id: 'defense', name: 'Obhajoba + prezentácia', price: '60 €' },
  { id: 'plagiarism', name: 'Kontrola plagiátorstva', price: '12 €' },
];

// ================= PAGE =================
export default function PricingPage() {

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);

  // ================= CHECK SUB =================
  useEffect(() => {
    const cookie = document.cookie.includes('sub_active=1');
    setHasSubscription(cookie);
  }, []);

  // ================= TOGGLE ADDON =================
  const toggleAddon = (id: string) => {
    setSelectedAddons(prev =>
      prev.includes(id)
        ? prev.filter(a => a !== id)
        : [...prev, id]
    );
  };

  // ================= BUY =================
  const handleCheckout = async () => {

    if (!selectedPlan && !hasSubscription) {
      alert("Vyber základný plán");
      return;
    }

    const res = await fetch('/api/payments', {
      method: 'POST',
      body: JSON.stringify({
        plan: selectedPlan,
        addons: selectedAddons
      })
    });

    const data = await res.json();

    window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">

      {/* HEADER */}
      <h1 className="text-3xl font-black mb-2">
        Balíčky a doplnky
      </h1>
      <p className="text-gray-400 mb-6">
        Najprv si aktivuj plán, potom si môžeš dokúpiť doplnky
      </p>

      {/* ================= PLANS ================= */}
      {!hasSubscription && (
        <div className="grid md:grid-cols-3 gap-4 mb-8">

          {plans.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`p-6 rounded-2xl border cursor-pointer ${
                selectedPlan === p.id
                  ? 'border-violet-500 bg-violet-600/20'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <h2 className="text-xl font-black">{p.name}</h2>
              <div className="text-3xl mt-2">{p.price}</div>
            </div>
          ))}

        </div>
      )}

      {/* ================= ADDONS ================= */}
      <div className="mb-8">

        <h2 className="text-xl font-black mb-3">
          Doplnkové služby
        </h2>

        {!hasSubscription && (
          <p className="text-red-400 text-sm mb-3">
            Najprv musíš zakúpiť základný plán
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-3">

          {addons.map((a) => (
            <div
              key={a.id}
              onClick={() => hasSubscription && toggleAddon(a.id)}
              className={`p-4 rounded-xl border ${
                selectedAddons.includes(a.id)
                  ? 'border-violet-500 bg-violet-600/20'
                  : 'border-white/10 bg-white/5'
              } ${!hasSubscription ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex justify-between">
                <span>{a.name}</span>
                <b>{a.price}</b>
              </div>
            </div>
          ))}

        </div>

      </div>

      {/* ================= CTA ================= */}
      <button
        onClick={handleCheckout}
        className="w-full bg-violet-600 py-3 rounded-xl font-bold"
      >
        Pokračovať na platbu
      </button>

      {/* ================= MENTORING ================= */}
      <div className="mt-10 border-t border-white/10 pt-6">

        <h3 className="text-lg font-black mb-2">
          Akademický pracovník + mentoring
        </h3>

        <p className="text-gray-400 text-sm mb-4">
          Potrebuješ pomoc od reálneho experta?
        </p>

        <div className="flex gap-3">

          <button
            onClick={() => window.location.href = "https://www.zaverecneprace.sk/"}
            className="bg-green-600 px-4 py-2 rounded-xl"
          >
            Slovensko
          </button>

          <button
            onClick={() => window.location.href = "https://www.zaverecne-prace.cz/"}
            className="bg-blue-600 px-4 py-2 rounded-xl"
          >
            Česko
          </button>

        </div>

      </div>

    </div>
  );
}