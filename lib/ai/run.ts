// lib/ai/run.ts
import { generateText } from 'ai';
import { pickModel, ModelKey } from './router';
import { buildPrompt } from './prompts';
import { getModel } from '../models';

type RunAIParams = {
  messages: { role: 'user' | 'assistant'; content: string }[];
  mode: any;
  agent?: string;
  project?: any;
  profile?: any;
};

export async function runAI({
  messages,
  mode,
  agent,
  project,
  profile,
}: RunAIParams) {
  const lastMessage = messages?.[messages.length - 1]?.content ?? '';

  const modelKey: ModelKey = pickModel(mode, agent);
  const model = getModel(modelKey);

  const prompt = buildPrompt({
    mode,
    project,
    profile,
    message: lastMessage,
  });

  const result = await generateText({ model, prompt });

  return {
    text: result.text ?? '',
    model: modelKey,
  };
}