import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { mistral } from '@ai-sdk/mistral';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Agent = 'openai' | 'claude' | 'gemini' | 'grok' | 'mistral';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type SavedProfile = {
  title?: string;
  topic?: string;
  type?: string;
  level?: string;
  field?: string;
  supervisor?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  problem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;
  businessProblem?: string;
  businessGoal?: string;
  implementation?: string;
  caseStudy?: string;
  reflection?: string;
  sourcesRequirement?: string;
  keywordsList?: string[];
  keywords?: string[];
  schema?: {
    label?: string;
    description?: string;
    recommendedLength?: string;
    structure?: string[];
    requiredSections?: string[];
    aiInstruction?: string;
  };
};

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (!value || typeof value !== 'string') return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function extractPdfTexts(files: File[]) {
  const results: string[] = [];

  if (!files.length) return results;

  try {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;

    for (const file of files) {
      if (
        file.type !== 'application/pdf' &&
        !file.name.toLowerCase().endsWith('.pdf')
      ) {
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const parsed = await pdfParse(buffer);

        const text = String(parsed?.text || '')
          .replace(/\s+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        if (text) {
          results.push(
            `PDF: ${file.name}\n${text.slice(0, 15000)}`
          );
        } else {
          results.push(`PDF: ${file.name}\n[PDF neobsahovalo extrahovateľný text]`);
        }
      } catch {
        results.push(`PDF: ${file.name}\n[Nepodarilo sa extrahovať obsah PDF]`);
      }
    }
  } catch {
    for (const file of files) {
      results.push(
        `PDF: ${file.name}\n[Server nemá dostupnú PDF extrakciu. Nainštaluj balík pdf-parse.]`
      );
    }
  }

  return results;
}

function buildSystemPrompt(profile: SavedProfile | null, pdfTexts: string[]) {
  const keywords =
    profile?.keywordsList && profile.keywordsList.length > 0
      ? profile.keywordsList
      : profile?.keywords || [];

  const structureText =
    profile?.schema?.structure?.length
      ? profile.schema.structure.map((item, index) => `${index + 1}. ${item}`).join('\n')
      : 'Neuvedené';

  const requiredSectionsText =
    profile?.schema?.requiredSections?.length
      ? profile.schema.requiredSections.map((item) => `- ${item}`).join('\n')
      : 'Neuvedené';

  const pdfBlock = pdfTexts.length
    ? `\nPRILOŽENÉ PDF DOKUMENTY - EXTRAHOVANÝ TEXT:\n${pdfTexts.join('\n\n-----------------\n\n')}\n`
    : '\nPRILOŽENÉ PDF DOKUMENTY: Žiadne.\n';

  return `
Si ZEDPERA, profesionálny akademický AI asistent.

HLAVNÉ PRAVIDLÁ:
- Odpovedaj v jazyku práce: ${profile?.workLanguage || profile?.language || 'SK'}.
- Vychádzaj prednostne z uloženého profilu práce.
- Ak sú priložené PDF dokumenty, použi ich ako doplnkové zdroje.
- Text má byť odborne napísaný, logický a vhodný pre akademické písanie.
- Ak niečo v profile chýba, uveď, čo odporúčaš doplniť.
- Nevymýšľaj konkrétne bibliografické údaje, ak nie sú priamo dostupné.
- Ak používateľ žiada úvod, abstrakt, kapitoly alebo inú časť práce, vytvor ich na mieru podľa profilu.

ULOŽENÝ PROFIL PRÁCE:
Názov práce: ${profile?.title || 'Neuvedené'}
Téma práce: ${profile?.topic || 'Neuvedené'}
Typ práce: ${profile?.schema?.label || profile?.type || 'Neuvedené'}
Úroveň / odbornosť: ${profile?.level || 'Neuvedené'}
Odbor / predmet / oblasť: ${profile?.field || 'Neuvedené'}
Vedúci práce: ${profile?.supervisor || 'Neuvedené'}
Citačná norma: ${profile?.citation || 'Neuvedené'}
Jazyk rozhrania: ${profile?.language || 'Neuvedené'}
Jazyk práce: ${profile?.workLanguage || profile?.language || 'SK'}
Odporúčaný rozsah: ${profile?.schema?.recommendedLength || 'Neuvedené'}

Anotácia:
${profile?.annotation || 'Neuvedené'}

Cieľ práce:
${profile?.goal || 'Neuvedené'}

Výskumný problém:
${profile?.problem || 'Neuvedené'}

Metodológia:
${profile?.methodology || 'Neuvedené'}

Hypotézy:
${profile?.hypotheses || 'Neuvedené'}

Výskumné otázky:
${profile?.researchQuestions || 'Neuvedené'}

Praktická / analytická časť:
${profile?.practicalPart || 'Neuvedené'}

Vedecký / odborný prínos:
${profile?.scientificContribution || 'Neuvedené'}

Firemný / manažérsky problém:
${profile?.businessProblem || 'Neuvedené'}

Manažérsky cieľ:
${profile?.businessGoal || 'Neuvedené'}

Implementácia:
${profile?.implementation || 'Neuvedené'}

Prípadová štúdia:
${profile?.caseStudy || 'Neuvedené'}

Reflexia:
${profile?.reflection || 'Neuvedené'}

Požiadavky na zdroje:
${profile?.sourcesRequirement || 'Neuvedené'}

Kľúčové slová:
${keywords.length ? keywords.join(', ') : 'Neuvedené'}

Štruktúra práce:
${structureText}

Povinné časti:
${requiredSectionsText}

Špecifická inštrukcia typu práce:
${profile?.schema?.aiInstruction || 'Neuvedené'}

${pdfBlock}

FORMÁT ODPOVEDE:
=== VÝSTUP ===
Sem napíš hlavný výstup.

=== ANALÝZA ===
Stručne vysvetli, z ktorých údajov profilu a zdrojov si čerpal.

=== SKÓRE ===
Ohodnoť použiteľnosť výstupu pre akademickú prácu od 0 do 100.

=== ODPORÚČANIA ===
Uveď konkrétne odporúčania, čo má používateľ doplniť alebo skontrolovať.
`;
}

function getAvailableModel(agent: Agent) {
  const requested = agent;

  if (requested === 'openai' && process.env.OPENAI_API_KEY) {
    return openai(process.env.OPENAI_MODEL || 'gpt-4o-mini');
  }

  if (requested === 'claude' && process.env.ANTHROPIC_API_KEY) {
    return anthropic(process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest');
  }

  if (requested === 'gemini' && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(process.env.GOOGLE_MODEL || 'gemini-1.5-flash');
  }

  // "grok" je tu mapovaný cez Groq provider, aby to fungovalo stabilne
  if (requested === 'grok' && process.env.GROQ_API_KEY) {
    return groq(process.env.GROQ_MODEL || 'llama-3.1-70b-versatile');
  }

  if (requested === 'mistral' && process.env.MISTRAL_API_KEY) {
    return mistral(process.env.MISTRAL_MODEL || 'mistral-small-latest');
  }

  // Fallback poradie
  if (process.env.OPENAI_API_KEY) {
    return openai(process.env.OPENAI_MODEL || 'gpt-4o-mini');
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic(process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest');
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(process.env.GOOGLE_MODEL || 'gemini-1.5-flash');
  }

  if (process.env.GROQ_API_KEY) {
    return groq(process.env.GROQ_MODEL || 'llama-3.1-70b-versatile');
  }

  if (process.env.MISTRAL_API_KEY) {
    return mistral(process.env.MISTRAL_MODEL || 'mistral-small-latest');
  }

  throw new Error(
    'Nie je nastavený žiadny AI provider. Doplň aspoň jeden API kľúč: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY alebo MISTRAL_API_KEY.'
  );
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const agent = (formData.get('agent') as Agent) || 'gemini';
    const messages = parseJson<ChatMessage[]>(formData.get('messages'), []);
    const profile = parseJson<SavedProfile | null>(formData.get('profile'), null);
    const files = formData.getAll('files').filter((item): item is File => item instanceof File);

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response('Chýbajú správy pre AI.', { status: 400 });
    }

    const pdfTexts = await extractPdfTexts(files);
    const systemPrompt = buildSystemPrompt(profile, pdfTexts);
    const model = getAvailableModel(agent);

  const result = streamText({
  model,
  system: systemPrompt,
  messages: messages.map((message) => ({
    role: message.role,
    content: message.content,
  })),
  temperature: 0.7,
});

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('CHAT API ERROR:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Neznáma chyba servera v /api/chat';

    return new Response(`API error 500: ${message}`, {
      status: 500,
    });
  }
}