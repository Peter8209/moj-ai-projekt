// lib/models.ts
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { mistral } from '@ai-sdk/mistral';

export type ModelKey =
  | 'gpt-4o'
  | 'gpt-4-turbo'
  | 'claude-3-5-sonnet'
  | 'claude-3-opus'
  | 'gemini-2.0-flash'
  | 'gemini-1.5-pro'
  | 'llama-3.3-70b'
  | 'mixtral-8x7b'
  | 'mistral-large'
  | 'command-r-plus'
  | 'grok-2'
  | 'sonar-pro';

// 🔒 ak chýbajú API kľúče (typicky pri build-e), vráť bezpečný fallback
function safeOpenAI() {
  return openai('gpt-4o');
}

export function getModel(modelKey: ModelKey) {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGoogle = !!process.env.GOOGLE_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasMistral = !!process.env.MISTRAL_API_KEY;

  switch (modelKey) {
    case 'gpt-4o':
      return hasOpenAI ? openai('gpt-4o') : safeOpenAI();

    case 'gpt-4-turbo':
      return hasOpenAI ? openai('gpt-4-turbo') : safeOpenAI();

    case 'claude-3-5-sonnet':
      return hasAnthropic
        ? anthropic('claude-3-5-sonnet-20241022')
        : safeOpenAI();

    case 'claude-3-opus':
      return hasAnthropic
        ? anthropic('claude-3-opus-20240229')
        : safeOpenAI();

    case 'gemini-2.0-flash':
      return hasGoogle ? google('gemini-2.0-flash') : safeOpenAI();

    case 'gemini-1.5-pro':
      return hasGoogle ? google('gemini-1.5-pro') : safeOpenAI();

    case 'llama-3.3-70b':
      return hasGroq ? groq('llama-3.3-70b-versatile') : safeOpenAI();

    case 'mixtral-8x7b':
      return hasGroq ? groq('mixtral-8x7b-32768') : safeOpenAI();

    case 'mistral-large':
      return hasMistral ? mistral('mistral-large-latest') : safeOpenAI();

    // fallbacky
    case 'command-r-plus':
    case 'grok-2':
    case 'sonar-pro':
    default:
      return safeOpenAI();
  }
}