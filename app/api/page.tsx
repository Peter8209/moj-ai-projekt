'use client';

import { useState } from 'react';
import { ModelKey } from '@/lib/models';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const MODEL_OPTIONS: ModelKey[] = [
  'gpt-4o',
  'claude-3-5-sonnet',
  'gemini-2.0-flash',
  'llama-3.3-70b',
  'mistral-large',
  'command-r-plus',
  'grok-2',
  'sonar-pro',
  'ollama-llama3',
];

export default function Page() {
  const [selectedModel, setSelectedModel] = useState<ModelKey>('gpt-4o');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages: Message[] = [
  ...messages,
  { role: 'user', content: input },
];

    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: newMessages,
        modelKey: selectedModel,
      }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    let assistantText = '';

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      assistantText += chunk;

      // realtime streaming update
      setMessages([
        ...newMessages,
        { role: 'assistant', content: assistantText },
      ]);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      {/* MODEL SELECT */}
      <select
        value={selectedModel}
        onChange={e => setSelectedModel(e.target.value as ModelKey)}
      >
        {MODEL_OPTIONS.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* CHAT */}
      <div style={{ marginTop: 20 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <b>{m.role}:</b> {m.content}
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div style={{ marginTop: 20 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Napíš správu..."
          style={{ width: '70%', marginRight: 10 }}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? '...' : 'Odoslať'}
        </button>
      </div>
    </div>
  );
}