'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  FileText,
  GraduationCap,
  Languages,
  Library,
  Loader2,
  Save,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';

// ================= TYPES =================

type Lang = 'SK' | 'CZ' | 'EN' | 'DE' | 'PL' | 'HU';

type WorkTypeKey =
  | 'seminar'
  | 'essay'
  | 'bachelor'
  | 'master'
  | 'dissertation'
  | 'mba'
  | 'dba';

type LevelKey = 'expert' | 'academic' | 'standard';

type CitationKey = 'APA7' | 'ISO690' | 'STN_ISO_690' | 'Harvard';

type Profile = {
  type: WorkTypeKey;
  level: LevelKey;
  title: string;
  topic: string;
  field: string;
  supervisor: string;
  citation: CitationKey;
  language: Lang;
  workLanguage: Lang;
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

  // ================= AUTOSAVE =================

  useEffect(() => {
    const saved = localStorage.getItem('profile_draft');
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch {}
    }
  }, []);

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
    const id = Date.now();

    const payload = {
      id,
      ...profile,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(`profile_${id}`, JSON.stringify(payload));

    alert('Profil uložený');
  };

  // ================= GENERATE =================

  const generate = async () => {
    if (!profile.title || !profile.topic) {
      alert('Vyplň názov a tému');
      return;
    }

    if (profile.keywordsList.length < 3) {
      alert('Minimálne 3 kľúčové slová');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
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

        <h1 className="text-3xl font-black">ZEDPERA AI</h1>

        {/* INPUTS */}
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

        {/* KEYWORDS */}
        <KeywordsInput
          value={profile.keywordsList}
          onChange={(v) => update('keywordsList', v)}
        />

        {/* BUTTONS */}
        <div className="flex gap-4">
          <button
            onClick={generate}
            className="bg-violet-600 px-6 py-3 rounded-xl font-bold"
          >
            Generovať
          </button>

          <button
            onClick={saveProfile}
            className="bg-white/10 px-6 py-3 rounded-xl"
          >
            Uložiť
          </button>
        </div>
      </div>

      {/* LOADING */}
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
          <span
            key={i}
            className="bg-violet-600 px-3 py-1 rounded-full text-xs"
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}