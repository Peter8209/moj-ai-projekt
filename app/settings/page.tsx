'use client';

import { useEffect, useState } from 'react';
import { Save, User, Bot, Globe, ShieldCheck } from 'lucide-react';

// ================= TYPES =================
type Settings = {
  name: string;
  email: string;
  language: string;
  aiModel: string;
  notifications: boolean;
};

// ================= PAGE =================
export default function SettingsPage() {
  const [form, setForm] = useState<Settings>({
    name: '',
    email: '',
    language: 'sk',
    aiModel: 'gpt-4o',
    notifications: true,
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // ================= LOAD =================
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;

        const data = await res.json();
        if (data) setForm({
  name: data.name || '',
  email: data.email || '',
  language: data.language || 'sk',
  aiModel: data.aiModel || 'gpt-4o',
  notifications: data.notifications ?? true,
});
      } catch (e) {
        console.log('Settings load error', e);
      }
    };

    load();
  }, []);

  // ================= SAVE =================
  const save = async () => {
    setLoading(true);
    setSaved(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.log('Save error', e);
    }

    setLoading(false);
  };

  // ================= UI =================
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      <h1 className="text-3xl font-bold flex items-center gap-2">
        <ShieldCheck /> Nastavenia
      </h1>

      {/* ================= USER ================= */}
      <div className="bg-white/5 p-4 rounded-xl space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <User /> Profil
        </h2>

        <input
          className="w-full p-2 rounded bg-black/40"
          placeholder="Meno"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          className="w-full p-2 rounded bg-black/40"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>

      {/* ================= AI ================= */}
      <div className="bg-white/5 p-4 rounded-xl space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Bot /> AI Nastavenia
        </h2>

        <select
          className="w-full p-2 rounded bg-black/40"
          value={form.aiModel}
          onChange={(e) => setForm({ ...form, aiModel: e.target.value })}
        >
          <option value="gpt-4o">GPT-4o (OpenAI)</option>
          <option value="claude-3-opus">Claude 3 Opus</option>
          <option value="gemini-pro">Gemini Pro</option>
          <option value="mistral-large">Mistral Large</option>
        </select>
      </div>

      {/* ================= LANGUAGE ================= */}
      <div className="bg-white/5 p-4 rounded-xl space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Globe /> Jazyk
        </h2>

        <select
          className="w-full p-2 rounded bg-black/40"
          value={form.language}
          onChange={(e) => setForm({ ...form, language: e.target.value })}
        >
          <option value="sk">Slovenčina</option>
          <option value="cz">Čeština</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
      </div>

      {/* ================= NOTIFICATIONS ================= */}
      <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
        <span>Notifikácie</span>

        <input
          type="checkbox"
          checked={form.notifications}
          onChange={(e) =>
            setForm({ ...form, notifications: e.target.checked })
          }
        />
      </div>

      {/* ================= SAVE BUTTON ================= */}
      <button
        onClick={save}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center gap-2"
      >
        <Save />
        {loading ? 'Ukladám...' : 'Uložiť'}
      </button>

      {saved && (
        <div className="text-green-400">
          ✅ Nastavenia uložené
        </div>
      )}
    </div>
  );
}