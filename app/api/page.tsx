'use client';
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { ModelKey } from '@/lib/models';

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

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    body: { modelKey: selectedModel },
  });

  return (
    <div>
      <select
        value={selectedModel}
        onChange={e => setSelectedModel(e.target.value as ModelKey)}
      >
        {MODEL_OPTIONS.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <div>
        {messages.map(m => (
          <div key={m.id}>
            <b>{m.role}:</b> {m.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} placeholder="Napíš správu..." />
        <button type="submit">Odoslať</button>
      </form>
    </div>
  );
}
