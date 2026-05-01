import { generateText } from 'ai';
import { pickModel, ModelKey } from './router';
import { buildPrompt } from './prompts';

// 🔥 IMPORT PROVIDEROV
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { groq } from '@ai-sdk/groq';

// ================= MODEL MAPPER =================
function getModel(modelKey: ModelKey) {
  switch (modelKey) {
    case 'gpt-4o':
      return openai('gpt-4o');

    case 'gpt-4-turbo':
      return openai('gpt-4-turbo');

    case 'claude-3-5-sonnet':
      return anthropic('claude-3-5-sonnet-20241022');

    case 'gemini-1.5-pro':
      return google('gemini-1.5-pro');

    case 'mixtral-8x7b':
      return mistral('mixtral-8x7b');

    case 'command-r-plus':
      // 🔥 fallback namiesto Cohere
      return openai('gpt-4o');

    case 'sonar-pro':
      return groq('llama-3.1-70b-versatile');

    default:
      return openai('gpt-4o');
  }
}

// ================= MAIN =================
export async function runAI({
  messages,
  mode,
  agent,
  project,
  profile,
}: any) {

  const lastMessage = messages?.[messages.length - 1]?.content || '';

  const modelKey = pickModel(mode, agent);
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
      text: result.text,
      model: modelKey,
    };

  } catch (err) {
    console.error('AI FAIL:', err);

    // 🔥 fallback
    const fallbackModel = openai('gpt-4o');

    const result = await generateText({
      model: fallbackModel,
      prompt,
    });

    return {
      text: result.text,
      model: 'gpt-4o-fallback',
    };
  }
}