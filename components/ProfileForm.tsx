'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  Brain,
  FileText,
  Languages,
  Loader2,
  Save,
} from 'lucide-react';

// ================= TYPES =================

type Lang = 'SK' | 'EN';

type WorkType = 'seminar' | 'bachelor' | 'master' | 'essay';

type Profile = {
  type: WorkType;
  title: string;
  topic: string;
  field: string;
  supervisor: string;
  language: Lang;
  workLanguage: Lang;
  goal: string;
  methodology: string;
  keywords: string[];
};

// ================= PROPS =================

type Props = {
  initialData?: Profile;
  onSave?: (data: any) => void;
  onGenerate?: (data: Profile) => Promise<void>;
};

// ================= DEFAULT =================

const defaultProfile: Profile = {
  type: 'bachelor',
  title: '',
  topic: '',
  field: '',
  supervisor: '',
  language: 'SK',
  workLanguage: 'SK',
  goal: '',
  methodology: '',
  keywords: [],
};

// ================= UTILS =================

// 🔥 ODSTRÁNI PRÁZDNE POLIA
function cleanProfile(data: any) {
  const cleaned: any = {};

  Object.entries(data).forEach(([key, value]) => {
    if (
      value !== '' &&
      value !== null &&
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0)
    ) {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

// ================= COMPONENT =================

export default function ProfileForm({
  initialData,
  onSave,
  onGenerate,
}: Props) {
  const [profile, setProfile] = useState<Profile>(
    initialData || defaultProfile
  );

  const [loading, setLoading] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');

  // ================= AUTOSAVE =================

  useEffect(() => {
    if (!initialData) {
      const draft = localStorage.getItem('profile_draft');
      if (draft) setProfile(JSON.parse(draft));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('profile_draft', JSON.stringify(profile));
  }, [profile]);

  // ================= UPDATE =================

  const update = (key: keyof Profile, value: any) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  // ================= KEYWORDS =================

  const addKeyword = () => {
    const value = keywordInput.trim();
    if (!value) return;

    setProfile((prev) => ({
      ...prev,
      keywords: [...new Set([...prev.keywords, value])], // 🔥 bez duplicít
    }));

    setKeywordInput('');
  };

  const removeKeyword = (i: number) => {
    setProfile((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((_, idx) => idx !== i),
    }));
  };

  // ================= SAVE =================

  const saveProfile = () => {
    const id = Date.now().toString();

    const cleaned = cleanProfile(profile);

    const payload = {
      id,
      title: cleaned.title || 'Bez názvu', // 🔥 fallback
      ...cleaned,
      savedAt: new Date().toISOString(),
    };

    if (onSave) {
      onSave(payload);
      return;
    }

    // 🔥 uloženie profilu
    localStorage.setItem(`profile_${id}`, JSON.stringify(payload));

    // 🔥 zoznam profilov
    const list = JSON.parse(localStorage.getItem('profiles') || '[]');
    list.push(id);
    localStorage.setItem('profiles', JSON.stringify(list));

    // 🔥 vymazanie draftu
    localStorage.removeItem('profile_draft');

    alert('✅ Profil uložený (len vyplnené polia)');
  };

  // ================= GENERATE =================

  const handleGenerate = async () => {
    if (!profile.title || !profile.topic) {
      alert('Vyplň názov a tému');
      return;
    }

    setLoading(true);

    try {
      if (onGenerate) {
        await onGenerate(profile);
      } else {
        console.log('GENERATE:', profile);
      }
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================

  return (
    <div className="text-white">
      {loading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <Loader2 className="animate-spin w-10 h-10" />
        </div>
      )}

      <div className="space-y-6">

        {/* TYPE */}
        <section>
          <h2 className="font-bold mb-2 flex gap-2 items-center">
            <BookOpen /> Typ práce
          </h2>

          <div className="flex gap-2">
            {(['seminar', 'bachelor', 'master', 'essay'] as WorkType[]).map((t) => (
              <button
                key={t}
                onClick={() => update('type', t)}
                className={`px-3 py-1 rounded ${
                  profile.type === t
                    ? 'bg-violet-600'
                    : 'bg-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* BASIC */}
        <section>
          <h2 className="font-bold mb-2 flex gap-2 items-center">
            <FileText /> Základ
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Názov"
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
              placeholder="Vedúci"
              value={profile.supervisor}
              onChange={(e) => update('supervisor', e.target.value)}
              className="input"
            />
          </div>
        </section>

        {/* LANG */}
        <section>
          <h2 className="font-bold mb-2 flex gap-2 items-center">
            <Languages /> Jazyk práce
          </h2>

          <div className="flex gap-2">
            {(['SK', 'EN'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => update('workLanguage', l)}
                className={`px-3 py-1 rounded ${
                  profile.workLanguage === l
                    ? 'bg-blue-600'
                    : 'bg-gray-700'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </section>

        {/* GOAL */}
        <section>
          <h2 className="font-bold mb-2">Cieľ</h2>
          <textarea
            value={profile.goal}
            onChange={(e) => update('goal', e.target.value)}
            className="input"
          />
        </section>

        {/* METHOD */}
        <section>
          <h2 className="font-bold mb-2">Metodológia</h2>
          <textarea
            value={profile.methodology}
            onChange={(e) => update('methodology', e.target.value)}
            className="input"
          />
        </section>

        {/* KEYWORDS */}
        <section>
          <h2 className="font-bold mb-2">Kľúčové slová</h2>

          <div className="flex gap-2">
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              className="input"
            />

            <button onClick={addKeyword} className="bg-violet-600 px-3 rounded">
              +
            </button>
          </div>

          <div className="flex gap-2 mt-2 flex-wrap">
            {profile.keywords.map((k, i) => (
              <button
                key={i}
                onClick={() => removeKeyword(i)}
                className="bg-red-600 px-2 rounded"
              >
                {k}
              </button>
            ))}
          </div>
        </section>

        {/* ACTIONS */}
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            className="bg-violet-600 px-4 py-2 rounded flex gap-2 items-center"
          >
            <Brain /> Generovať
          </button>

          <button
            onClick={saveProfile}
            className="bg-gray-700 px-4 py-2 rounded flex gap-2 items-center"
          >
            <Save /> Uložiť
          </button>
        </div>
      </div>

      {/* STYLE */}
      <style jsx>{`
        .input {
          width: 100%;
          background: #111;
          border: 1px solid #333;
          padding: 10px;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}