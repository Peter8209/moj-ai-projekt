import { generateText } from 'ai';
import { models } from './models';
import { pickModel } from './router';
import { buildPrompt } from './prompts';

export async function runAI({
  messages,
  mode,
  agent,
  project,
  profile,
}: any) {

  const lastMessage = messages[messages.length - 1]?.content;

  const modelKey = pickModel(mode, agent);
  const model = models[modelKey];

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
      text: result.text,
      model: modelKey,
    };

  } catch (err) {

    // 🔥 fallback
    console.error('AI FAIL:', err);

    const fallback = models['gpt-4o'];

    const result = await generateText({
      model: fallback,
      prompt,
    });

    return {
      text: result.text,
      model: 'gpt-4o-fallback',
    };
  }
}