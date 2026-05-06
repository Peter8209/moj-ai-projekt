import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export type WorkProfile = {
  id?: string;
  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;
  supervisor?: string;
  citation?: string;
  citationStyle?: string;
  language?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  methodology?: string;
  problem?: string;
  keywords?: string[];
  keywordsList?: string[];
};

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getKeywords(profile: WorkProfile): string {
  return [
    ...(Array.isArray(profile.keywords) ? profile.keywords : []),
    ...(Array.isArray(profile.keywordsList) ? profile.keywordsList : []),
  ]
    .map((keyword) => String(keyword).trim())
    .filter(Boolean)
    .join(', ');
}

export async function buildEnglishResearchQuery(
  profile: WorkProfile,
): Promise<string> {
  const profileText = [
    `Názov práce: ${toText(profile.title)}`,
    `Téma: ${toText(profile.topic)}`,
    `Odbor: ${toText(profile.field)}`,
    `Typ práce: ${toText(profile.type)}`,
    `Cieľ práce: ${toText(profile.goal)}`,
    `Výskumný problém: ${toText(profile.problem)}`,
    `Metodológia: ${toText(profile.methodology)}`,
    `Kľúčové slová: ${getKeywords(profile)}`,
  ]
    .filter((line) => !line.endsWith(': '))
    .join('\n');

  if (!profileText.trim()) {
    return '';
  }

  const result = await generateText({
    model: openai('gpt-4o-mini'),
    system: `
Si akademický rešeršný asistent.
Z profilu akademickej práce vytvor jeden presný anglický vyhľadávací dopyt pre Semantic Scholar.

Pravidlá:
- odpovedz iba jedným anglickým dopytom,
- nepíš vysvetlenie,
- nepoužívaj odrážky,
- nepoužívaj úvodzovky,
- maximálne 18 slov,
- zachovaj odborný význam témy,
- ak je téma zo Slovenska alebo Česka, ponechaj aj kľúčové geografické slovo ako Slovakia, Slovak, Czech.
`,
    prompt: profileText,
  });

  return result.text.trim();
}

export function getWorkLanguage(profile: WorkProfile | null | undefined): string {
  return (
    toText(profile?.workLanguage) ||
    toText(profile?.language) ||
    'slovenčina'
  );
}

export function getCitationStyle(profile: WorkProfile | null | undefined): string {
  return (
    toText(profile?.citationStyle) ||
    toText(profile?.citation) ||
    'APA'
  );
}