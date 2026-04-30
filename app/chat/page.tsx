'use client';

import { useMemo, useState } from 'react';

// ================= TYPES =================
type Mode =
  | 'write'
  | 'sources'
  | 'supervisor'
  | 'defense'
  | 'audit'
  | 'translate'
  | 'analysis'
  | 'planning'
  | 'email'
  | 'plagiarism';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const modes: Mode[] = [
  'write','sources','supervisor','audit','defense',
  'translate','analysis','planning','email','plagiarism'
];

// ================= PARSER =================
function parseSections(text: string) {
  const get = (name: string) =>
    text.split(`=== ${name} ===`)[1]?.split('===')[0]?.trim() || '';

  return {
    output: get('VÝSTUP') || text,
    analysis: get('ANALÝZA'),
    score: get('SKÓRE'),
    tips: get('ODPORÚČANIA'),
  };
}

// ================= PAGE =================
export default function ChatPage() {
  const [mode, setMode] = useState<Mode>('write');
  const [agent, setAgent] = useState<string>('auto');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [popup, setPopup] = useState(false);
  const [popupData, setPopupData] = useState<any>(null);

  const modeName = useMemo(() => ({
    write: 'AI písanie práce',
    sources: 'Zdroje',
    supervisor: 'AI vedúci práce',
    audit: 'Kontrola kvality',
    defense: 'Obhajoba',
    translate: 'Preklad',
    analysis: 'Analýza dát',
    planning: 'Plánovanie',
    email: 'Email',
    plagiarism: 'Plagiátorstvo',
  }[mode]), [mode]);

  // ================= SEND =================
  const sendMessage = async () => {
    const text = input?.trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user' as const, content: text };
    const next = [...messages, userMsg];

    setMessages(next);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, mode, agent }),
      });

      const data = await res.json();
      const aiText = data?.content || '⚠️ Prázdna odpoveď';

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: aiText }
      ]);

      const parsed = parseSections(aiText);
      setPopupData(parsed);
      setPopup(true);

    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '❌ Chyba API' }
      ]);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">

      {/* HEADER */}
      <h1 className="text-3xl font-black mb-4">{modeName}</h1>

      {/* MODE SWITCH */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {modes.map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              mode === m
                ? 'bg-purple-600'
                : 'bg-white/10 text-gray-300'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* 🔥 AGENT SWITCH */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          ['auto','Auto'],
          ['openai','GPT'],
          ['claude','Claude'],
          ['gemini','Gemini'],
          ['grok','Grok'],
          ['mistral','Mistral'],
        ].map(([key,label]) => (
          <button
            key={key}
            onClick={() => setAgent(key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              agent === key
                ? 'bg-purple-600'
                : 'bg-white/10 text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* CHAT */}
      <div className="h-[55vh] overflow-y-auto mb-6 space-y-4 bg-black/30 p-4 rounded-xl">

        {messages.length === 0 && (
          <div className="text-center opacity-50 mt-10">
            Napíš zadanie a začni…
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div className="inline-block bg-white/10 p-3 rounded-xl max-w-[70%] whitespace-pre-line">
              {m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="text-purple-400 animate-pulse">
            🤖 Premýšľam...
          </div>
        )}
      </div>

      {/* INPUT */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Napíš zadanie..."
          className="flex-1 bg-black/40 p-3 rounded-xl outline-none"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="bg-purple-600 px-5 rounded-xl"
        >
          Odoslať
        </button>
      </form>

      {/* ================= POPUP ================= */}
      {popup && popupData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">

          <div className="bg-[#020617] w-[95%] max-w-6xl p-6 rounded-xl grid grid-cols-3 gap-6 shadow-2xl">

            {/* LEFT */}
            <div className="col-span-2 overflow-y-auto max-h-[80vh]">
              <h2 className="text-xl font-bold mb-3">📄 Výstup</h2>
              <div className="whitespace-pre-line text-gray-300">
                {popupData.output}
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-4">

              <div className="bg-white/10 p-4 rounded-xl">
                <h3>📊 Skóre</h3>
                <div className="text-3xl text-green-400">
                  {popupData.score || '—'}
                </div>
              </div>

              <div className="bg-white/10 p-4 rounded-xl">
                <h3>⚠️ Analýza</h3>
                <div className="text-sm whitespace-pre-line">
                  {popupData.analysis}
                </div>
              </div>

              <div className="bg-white/10 p-4 rounded-xl">
                <h3>✏️ Odporúčania</h3>
                <div className="text-sm whitespace-pre-line">
                  {popupData.tips}
                </div>
              </div>

              <button
                onClick={() => setPopup(false)}
                className="bg-red-500 w-full py-2 rounded-xl"
              >
                Zavrieť
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}