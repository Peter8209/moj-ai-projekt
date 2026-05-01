import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { mistral } from '@ai-sdk/mistral';

// ================= TYPES =================
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

// ================= LAZY MODEL =================
export function getModel(modelKey: ModelKey) {
  switch (modelKey) {
    case 'gpt-4o':
      return openai('gpt-4o');

    case 'gpt-4-turbo':
      return openai('gpt-4-turbo');

    case 'claude-3-5-sonnet':
      return anthropic('claude-3-5-sonnet-20241022');

    case 'claude-3-opus':
      return anthropic('claude-3-opus-20240229');

    case 'gemini-2.0-flash':
      return google('gemini-2.0-flash');

    case 'gemini-1.5-pro':
      return google('gemini-1.5-pro');

    case 'llama-3.3-70b':
      return groq('llama-3.3-70b-versatile');

    case 'mixtral-8x7b':
      return groq('mixtral-8x7b-32768');

    case 'mistral-large':
      return mistral('mistral-large-latest');

    // fallbacky
    case 'command-r-plus':
    case 'grok-2':
    case 'sonar-pro':
      return openai('gpt-4o');

    default:
      return openai('gpt-4o');
  }
}