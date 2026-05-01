// lib/ai/run.ts

import { generateText } from 'ai';
import { pickModel, ModelKey } from './router';
import { buildPrompt } from './prompts';
import { getModel } from '../models';

// ================= TYPES =================
type RunAIParams = {
  messages: { role: 'user' | 'assistant'; content: string }[];
  mode: any;
  agent?: string;
  project?: any;
  profile?: any;
};

// ================= SYSTEM PROMPT =================
function buildSystemPrompt({ mode, project, profile }: any): string {
  return `
You are ZEDPERA AI – expert assistant for academic writing.

MODE: ${mode}

Your role:
- Help with academic writing, structure, logic, and clarity
- Provide critical feedback (like a thesis supervisor)
- Detect weak arguments and suggest improvements
- Be precise, structured, and professional

Rules:
- Do NOT hallucinate sources
- Be concise but useful
- Prefer structured output (headings, bullet points)
- If unsure, say so

Context:
Project: ${JSON.stringify(project || {})}
Profile: ${JSON.stringify(profile || {})}
`;
}

// ================= MAIN =================
export async function runAI({
  messages,
  mode,
  agent,
  project,
  profile,
}: RunAIParams) {
  // 🔹 posledná user správa
  const lastMessage =
    messages?.[messages.length - 1]?.content ?? '';

  // 🔹 výber modelu
  const modelKey: ModelKey = pickModel(mode, agent);
  const model = getModel(modelKey);

  // 🔹 prompt (user content)
  const prompt = buildPrompt({
    mode,
    project,
    profile,
    message: lastMessage,
  });

  // 🔹 system prompt (SAFE – bez warningu)
  const system = buildSystemPrompt({ mode, project, profile });

  try {
    // ================= TIMEOUT WRAPPER =================
    const result = await Promise.race([
      generateText({
        model,
        system,
        prompt,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 20000)
      ),
    ]) as any;

    return {
      text: result?.text ?? '',
      model: modelKey,
    };

  } catch (err) {
    console.error('❌ AI ERROR:', err);

    // ================= FALLBACK =================
    try {
      const fallbackModel = getModel('gpt-4o');

      const fallbackResult = await generateText({
        model: fallbackModel,
        system,
        prompt,
      });

      return {
        text: fallbackResult?.text ?? '',
        model: 'gpt-4o-fallback',
      };

    } catch (fallbackErr) {
      console.error('❌ FALLBACK ERROR:', fallbackErr);

      return {
        text: 'Došlo k chybe pri generovaní odpovede. Skús znova.',
        model: 'error',
      };
    }
  }
}