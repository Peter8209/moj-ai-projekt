'use client';

import { useState } from 'react';

export default function PlagiarismPage() {

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function checkPlagiarism() {
    setLoading(true);
    setResult(null);

    const res = await fetch('/api/plagiarism', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-black">Kontrola plagiátorstva</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Vlož text práce..."
        className="w-full h-40 bg-black/30 border border-white/10 rounded-xl p-4"
      />

      <button
        onClick={checkPlagiarism}
        className="bg-red-600 px-5 py-3 rounded-xl font-bold"
      >
        Skontrolovať
      </button>

      {loading && <p>Analyzujem...</p>}

      {result && (
        <div className="space-y-4">

          <div className="text-xl font-black">
            Podobnosť: {result.score}%
          </div>

          {result.issues.map((i: any, idx: number) => (
            <div key={idx} className="bg-red-500/10 p-3 rounded-xl">
              <b>⚠️ Problém:</b> {i.text}
              <div className="text-sm text-gray-400">{i.reason}</div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}