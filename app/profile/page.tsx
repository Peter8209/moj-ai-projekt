'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ================= TYPES =================
type Profile = {
  type: string;
  title: string;
  topic: string;
  field: string;
  supervisor: string;
  citation: string;
  language: string;
  annotation: string;
  goal: string;
  outline: string;
  hypotheses: string;
  methodology: string;
  keywords: string;
  chapters: number;
  citationsCount: number;
};

// ================= PAGE =================
export default function ProfilePage() {

  const router = useRouter();

  const [profile, setProfile] = useState<Profile>({
    type: '',
    title: '',
    topic: '',
    field: '',
    supervisor: '',
    citation: 'APA',
    language: 'SK',
    annotation: '',
    goal: '',
    outline: '',
    hypotheses: '',
    methodology: '',
    keywords: '',
    chapters: 5,
    citationsCount: 20
  });

  const [loading, setLoading] = useState(false);

  // ================= LOAD EXISTING =================
  useEffect(() => {
    const saved = localStorage.getItem('active_project');

    if (saved) {
      const project = JSON.parse(saved);

      setProfile((prev) => ({
        ...prev,
        title: project.title || ''
      }));
    }
  }, []);

  // ================= HANDLE CHANGE =================
  const update = (key: keyof Profile, value: any) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  // ================= VALIDATION =================
  const isValid = () => {
    return profile.title && profile.topic && profile.type;
  };

  // ================= SAVE =================
  const saveProfile = async () => {

    if (!isValid()) {
      alert("Vyplň názov práce, typ a tému");
      return;
    }

    setLoading(true);

    await fetch('/api/profile', {
      method: 'POST',
      body: JSON.stringify(profile)
    });

    localStorage.setItem('profile', JSON.stringify(profile));

    setLoading(false);

    router.push('/chat');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 max-w-4xl mx-auto">

      {/* HEADER */}
      <h1 className="text-3xl font-black mb-2">Profil práce</h1>
      <p className="text-gray-400 mb-6">
        Toto je najdôležitejšia časť – AI z toho generuje všetko
      </p>

      <div className="grid gap-4">

        {/* ================= BASIC ================= */}
        <select onChange={(e) => update('type', e.target.value)} className="input">
          <option>Typ práce</option>
          <option>Seminárka</option>
          <option>Bakalárka</option>
          <option>Diplomovka</option>
        </select>

        <input
          placeholder="Názov práce"
          value={profile.title}
          onChange={(e) => update('title', e.target.value)}
          className="input"
        />

        <input
          placeholder="Téma"
          value={profile.topic}
          onChange={(e) => update('topic', e.target.value)}
          className="input"
        />

        <input
          placeholder="Odbor"
          value={profile.field}
          onChange={(e) => update('field', e.target.value)}
          className="input"
        />

        <input
          placeholder="Meno vedúceho"
          value={profile.supervisor}
          onChange={(e) => update('supervisor', e.target.value)}
          className="input"
        />

        {/* ================= SETTINGS ================= */}
        <select onChange={(e) => update('citation', e.target.value)} className="input">
          <option>APA</option>
          <option>ISO</option>
          <option>Harvard</option>
        </select>

        <select onChange={(e) => update('language', e.target.value)} className="input">
          <option value="SK">Slovenčina</option>
          <option value="CZ">Čeština</option>
          <option value="EN">English</option>
          <option value="DE">Deutsch</option>
          <option value="PL">Polski</option>
          <option value="HU">Magyar</option>
        </select>

        {/* ================= TEXT ================= */}
        <textarea placeholder="Anotácia" className="input" onChange={(e) => update('annotation', e.target.value)} />
        <textarea placeholder="Cieľ práce" className="input" onChange={(e) => update('goal', e.target.value)} />
        <textarea placeholder="Osnova" className="input" onChange={(e) => update('outline', e.target.value)} />
        <textarea placeholder="Hypotézy / otázky" className="input" onChange={(e) => update('hypotheses', e.target.value)} />
        <textarea placeholder="Metodológia" className="input" onChange={(e) => update('methodology', e.target.value)} />

        <input
          placeholder="Kľúčové slová"
          className="input"
          onChange={(e) => update('keywords', e.target.value)}
        />

        {/* ================= NUMBERS ================= */}
        <input
          type="number"
          placeholder="Počet kapitol"
          value={profile.chapters}
          onChange={(e) => update('chapters', Number(e.target.value))}
          className="input"
        />

        <input
          type="number"
          placeholder="Počet citácií"
          value={profile.citationsCount}
          onChange={(e) => update('citationsCount', Number(e.target.value))}
          className="input"
        />

      </div>

      {/* ================= SAVE ================= */}
      <button
        onClick={saveProfile}
        disabled={loading}
        className="mt-6 w-full bg-violet-600 py-3 rounded-xl font-bold"
      >
        {loading ? "Ukladám..." : "Pokračovať do AI"}
      </button>

    </div>
  );
}