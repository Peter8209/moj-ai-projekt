import { generateText } from 'ai';
import { pickModel, ModelKey } from './router';
import { buildPrompt } from './prompts';
import { getModel } from './models';

// ================= TYPES =================
type RunAIParams = {
  messages: { role: 'user' | 'assistant'; content: string }[];
  mode: any;
  agent?: string;
  project?: any;
  profile?: any;
};

// ================= MAIN =================
export async function runAI({
  messages,
  mode,
  agent,
  project,
  profile,
}: RunAIParams) {

  // 🔥 SAFE posledná správa
  const lastMessage =
    messages?.[messages.length - 1]?.content ?? '';

  const modelKey: ModelKey = pickModel(mode, agent);

  // 🔥 LAZY MODEL (kľúčový fix)
  const model = getModel(modelKey);

  const prompt = buildPrompt({
    mode,
    project,
    profile,
    message: lastMessage,
  });

  try {
    const result = await generateText({
      model,
      prompt,
    });

    return {
      text: result.text ?? '',
      model: modelKey,
    };

  } catch (err) {
    console.error('AI FAIL:', err);

    // 🔥 fallback (bezpečný)
    try {
      const fallbackModel = getModel('gpt-4o');

      const result = await generateText({
        model: fallbackModel,
        prompt,
      });

      return {
        text: result.text ?? '',
        model: 'gpt-4o-fallback',
      };

    } catch (fallbackErr) {
      console.error('FALLBACK FAIL:', fallbackErr);

      return {
        text: 'Došlo k chybe pri spracovaní AI odpovede.',
        model: 'error',
      };
    }
  }
}