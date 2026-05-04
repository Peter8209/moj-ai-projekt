'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// ================= TYPES =================

type Profile = {
  id?: number;
  type: string;
  level: string;
  title: string;
  topic: string;
  field: string;
  supervisor: string;
  citation: string;
  language: string;
  workLanguage: string;
  annotation: string;
  goal: string;
  methodology: string;
  keywordsList: string[];
};

// ================= INITIAL =================

const initialProfile: Profile = {
  type: 'bachelor',
  level: 'expert',
  title: '',
  topic: '',
  field: '',
  supervisor: '',
  citation: 'STN_ISO_690',
  language: 'SK',
  workLanguage: 'SK',
  annotation: '',
  goal: '',
  methodology: '',
  keywordsList: [],
};

// ================= PAGE =================

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [loading, setLoading] = useState(false);

  // ================= LOAD =================

  useEffect(() => {
    const active = localStorage.getItem('active_profile');

    if (active) {
      setProfile(JSON.parse(active));
    } else {
      const draft = localStorage.getItem('profile_draft');
      if (draft) setProfile(JSON.parse(draft));
    }
  }, []);

  // ================= AUTOSAVE =================

  useEffect(() => {
    localStorage.setItem('profile_draft', JSON.stringify(profile));
  }, [profile]);

  // ================= UPDATE =================

  const update = (key: keyof Profile, value: any) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // ================= SAVE =================

  const saveProfile = () => {
    const id = profile.id || Date.now();

    const newProfile = {
      ...profile,
      id,
      savedAt: new Date().toISOString(),
    };

    // load existing
    const stored = localStorage.getItem('profiles');
    const profiles = stored ? JSON.parse(stored) : [];

    // update or insert
    const updated = profiles.filter((p: any) => p.id !== id);
    updated.push(newProfile);

    localStorage.setItem('profiles', JSON.stringify(updated));

    // 🔥 nastav ako aktívny
    localStorage.setItem('active_profile', JSON.stringify(newProfile));

    alert('Profil uložený');
  };

  // ================= GENERATE =================

  const generate = async () => {
    const active = localStorage.getItem('active_profile');

    if (!active) {
      alert('Najprv ulož profil');
      return;
    }

    const activeProfile = JSON.parse(active);

    if (!activeProfile.title || !activeProfile.topic) {
      alert('Vyplň názov a tému');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: activeProfile }),
      });

      if (!res.ok) throw new Error();

      const text = await res.text();

      localStorage.setItem('generated', text);

      router.push('/editor');
    } catch {
      alert('Chyba generovania');
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================

  return (
    <main className="min-h-screen bg-[#050816] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <h1 className="text-3xl font-black">Profil práce</h1>

        <input
          value={profile.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Názov práce"
          className="w-full p-3 bg-[#111525] rounded-xl"
        />

        <input
          value={profile.topic}
          onChange={(e) => update('topic', e.target.value)}
          placeholder="Téma"
          className="w-full p-3 bg-[#111525] rounded-xl"
        />

        <textarea
          value={profile.annotation}
          onChange={(e) => update('annotation', e.target.value)}
          placeholder="Anotácia"
          className="w-full p-3 bg-[#111525] rounded-xl"
        />

        <KeywordsInput
          value={profile.keywordsList}
          onChange={(v) => update('keywordsList', v)}
        />

        <div className="flex gap-4">
          <button
            onClick={generate}
            className="bg-violet-600 px-6 py-3 rounded-xl font-bold"
          >
            Generovať z profilu
          </button>

          <button
            onClick={saveProfile}
            className="bg-white/10 px-6 py-3 rounded-xl"
          >
            Uložiť profil
          </button>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <Loader2 className="animate-spin w-10 h-10" />
        </div>
      )}
    </main>
  );
}

// ================= KEYWORDS =================

function KeywordsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    if (!input.trim()) return;
    onChange([...value, input]);
    setInput('');
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-3 bg-[#111525] rounded-xl"
        />
        <button onClick={add} className="bg-violet-600 px-4 rounded-xl">
          +
        </button>
      </div>

      <div className="flex gap-2 mt-2 flex-wrap">
        {value.map((k, i) => (
          <span key={i} className="bg-violet-600 px-3 py-1 rounded-full text-xs">
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}