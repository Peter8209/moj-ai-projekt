import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { mistral } from '@ai-sdk/mistral';
import { xai } from '@ai-sdk/xai';
import { perplexity } from '@ai-sdk/perplexity';
import { createOllama } from 'ollama-ai-provider';

const ollama = createOllama();

export const models = {
  'gpt-4o':            openai('gpt-4o'),
  'gpt-4-turbo':       openai('gpt-4-turbo'),

  'claude-3-5-sonnet': anthropic('claude-3-5-sonnet-20241022'),
  'claude-3-opus':     anthropic('claude-3-opus-20240229'),

  'gemini-2.0-flash':  google('gemini-2.0-flash'),
  'gemini-1.5-pro':    google('gemini-1.5-pro'),

  'llama-3.3-70b':     groq('llama-3.3-70b-versatile'),
  'mixtral-8x7b':      groq('mixtral-8x7b-32768'),

  'mistral-large':     mistral('mistral-large-latest'),

  // 🔥 FIX: Cohere odstránené → fallback
  'command-r-plus':    openai('gpt-4o'),

  'grok-2':            xai('grok-2-1212'),
  'sonar-pro':         perplexity('sonar-pro'),

  'ollama-llama3':     ollama('llama3'),
} as const;

export type ModelKey = keyof typeof models;