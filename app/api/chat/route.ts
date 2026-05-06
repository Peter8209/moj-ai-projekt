import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { xai } from '@ai-sdk/xai';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
export const runtime = 'nodejs';
export const maxDuration = 60;

// ================= TYPES =================

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

type ProjectDocument = {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  extracted_text?: string | null;
  created_at?: string;
};

async function loadProjectDocuments(projectId: string | null) {
  if (!projectId) {
    return [];
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('zedpera_documents')
    .select(
      'id, project_id, file_name, file_path, file_size, mime_type, extracted_text, created_at'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Nepodarilo sa načítať dokumenty projektu: ${error.message}`);
  }

  return (data || []) as ProjectDocument[];
}

type ModelResult = {
  model: ReturnType<typeof openai>;
  providerLabel: string;
};

// ================= HELPERS =================

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isAllowedAgent(value: unknown): value is Agent {
  return (
    value === 'openai' ||
    value === 'claude' ||
    value === 'gemini' ||
    value === 'grok' ||
    value === 'mistral'
  );
}

function normalizeMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => {
      return (
        message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0
      );
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));
}

const allowedAttachmentExtensions = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.rtf',
  '.odt',
  '.md',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
];

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');

  if (index === -1) {
    return '';
  }

  return fileName.slice(index).toLowerCase();
}

function isAllowedAttachment(file: File) {
  const extension = getFileExtension(file.name);
  return allowedAttachmentExtensions.includes(extension);
}

function getAttachmentLabel(fileName: string) {
  const extension = getFileExtension(fileName);

  if (extension === '.pdf') return 'PDF dokument';

  if (['.doc', '.docx'].includes(extension)) {
    return 'Word dokument';
  }

  if (['.txt', '.rtf', '.odt', '.md'].includes(extension)) {
    return 'Textový dokument';
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
    return 'Obrázok';
  }

  if (['.xls', '.xlsx', '.csv'].includes(extension)) {
    return 'Tabuľka';
  }

  if (['.ppt', '.pptx'].includes(extension)) {
    return 'Prezentácia';
  }

  return 'Súbor';
}

async function extractAttachmentTexts(files: File[]) {
  const results: string[] = [];

  if (!files.length) {
    return results;
  }

  for (const file of files) {
    if (!isAllowedAttachment(file)) {
      results.push(
        `NEPODPOROVANÝ SÚBOR: ${file.name}
Typ: ${file.type || 'application/octet-stream'}
Veľkosť: ${file.size} bajtov
[Tento formát súboru nie je povolený.]`
      );
      continue;
    }

    const extension = getFileExtension(file.name);
    const label = getAttachmentLabel(file.name);

    // TXT a MD vieme na serveri načítať hneď ako obyčajný text.
    if (['.txt', '.md'].includes(extension)) {
      try {
        const content = await file.text();

        results.push(
          `${label}: ${file.name}
Typ: ${file.type || 'text/plain'}
Veľkosť: ${file.size} bajtov

EXTRAHOVANÝ TEXT:
${content.slice(0, 20000)}`
        );

        continue;
      } catch {
        results.push(
          `${label}: ${file.name}
Typ: ${file.type || 'text/plain'}
Veľkosť: ${file.size} bajtov
[Textový obsah sa nepodarilo načítať.]`
        );

        continue;
      }
    }

    // Ostatné formáty zatiaľ iba zaevidujeme ako prílohy.
    // Neskôr môžeš doplniť reálnu extrakciu cez mammoth, pdf-parse, xlsx atď.
    let note = '';

    if (extension === '.pdf') {
      note =
        'PDF dokument bol priložený. V tejto verzii server zatiaľ neextrahuje plný text PDF.';
    } else if (['.doc', '.docx', '.odt', '.rtf'].includes(extension)) {
      note =
        'Dokument bol priložený. V tejto verzii server zatiaľ neextrahuje plný text Word/ODT/RTF dokumentu.';
    } else if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
      note =
        'Obrázok bol priložený. V tejto verzii server zatiaľ nerobí OCR ani vizuálnu analýzu obrázka.';
    } else if (['.xls', '.xlsx', '.csv'].includes(extension)) {
      note =
        'Tabuľkový súbor bol priložený. V tejto verzii server zatiaľ neextrahuje obsah buniek.';
    } else if (['.ppt', '.pptx'].includes(extension)) {
      note =
        'Prezentácia bola priložená. V tejto verzii server zatiaľ neextrahuje text zo slidov.';
    } else {
      note =
        'Súbor bol priložený. V tejto verzii server zatiaľ neextrahuje jeho plný obsah.';
    }

    results.push(
      `${label}: ${file.name}
Typ: ${file.type || 'application/octet-stream'}
Veľkosť: ${file.size} bajtov
[${note} AI vie, že súbor existuje, ale nemá overený celý obsah súboru.]`
    );
  }

  return results;
}

function buildSystemPrompt(
  profile: SavedProfile | null,
  attachmentTexts: string[]
) {
  const keywords =
    profile?.keywordsList && profile.keywordsList.length > 0
      ? profile.keywordsList
      : profile?.keywords || [];

  const structureText =
    profile?.schema?.structure && profile.schema.structure.length > 0
      ? profile.schema.structure
          .map((item, index) => `${index + 1}. ${item}`)
          .join('\n')
      : 'Neuvedené';

  const requiredSectionsText =
    profile?.schema?.requiredSections &&
    profile.schema.requiredSections.length > 0
      ? profile.schema.requiredSections.map((item) => `- ${item}`).join('\n')
      : 'Neuvedené';

  const attachmentsBlock =
  attachmentTexts.length > 0
    ? `\nPRILOŽENÉ SÚBORY A PODKLADY:\n${attachmentTexts.join(
        '\n\n-----------------\n\n'
      )}\n`
    : '\nPRILOŽENÉ SÚBORY A PODKLADY: Žiadne.\n';

  return `
Si ZEDPERA, profesionálny akademický AI asistent a AI vedúci práce.

HLAVNÉ PRAVIDLÁ:
- Odpovedaj v jazyku práce: ${profile?.workLanguage || profile?.language || 'SK'}.
- Vychádzaj prednostne z uloženého profilu práce.
- Ak sú priložené súbory, zohľadni ich ako doplnkové podklady.
- Priložené súbory môžu byť PDF, Word, TXT, obrázky, tabuľky alebo prezentácie.
- Ak pri niektorom súbore nie je dostupný extrahovaný obsah, jasne uveď, že server pozná iba názov, typ a veľkosť súboru, nie celý obsah.- Text má byť odborne napísaný, logický a vhodný pre akademické písanie.
- Ak niečo v profile chýba, uveď, čo odporúčaš doplniť.
- Nevymýšľaj konkrétne bibliografické údaje, ak nie sú priamo dostupné.
- Ak používateľ žiada úvod, abstrakt, kapitoly alebo inú časť práce, vytvor ich na mieru podľa profilu.
- Nepíš všeobecné frázy bez nadväznosti na profil práce.
- Nepoužívaj falošné citácie, autorov, DOI ani názvy článkov.

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
${keywords.length > 0 ? keywords.join(', ') : 'Neuvedené'}

Štruktúra práce:
${structureText}

Povinné časti:
${requiredSectionsText}

Špecifická inštrukcia typu práce:
${profile?.schema?.aiInstruction || 'Neuvedené'}

${attachmentsBlock}

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

// ================= AI MODEL ROUTER =================

function getModelByAgent(agent: Agent): ModelResult {
  if (agent === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Chýba OPENAI_API_KEY pre GPT.');
    }

    return {
      model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
      providerLabel: 'GPT',
    };
  }

  if (agent === 'claude') {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Chýba ANTHROPIC_API_KEY pre Claude.');
    }

    return {
      model: anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6') as any,
      providerLabel: 'Claude',
    };
  }

  if (agent === 'gemini') {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('Chýba GOOGLE_GENERATIVE_AI_API_KEY pre Gemini.');
    }

    return {
      model: google(process.env.GOOGLE_MODEL || 'gemini-2.5-flash') as any,
      providerLabel: 'Gemini',
    };
  }

  if (agent === 'grok') {
    if (!process.env.XAI_API_KEY) {
      throw new Error('Chýba XAI_API_KEY pre Grok.');
    }

    return {
      model: xai(process.env.XAI_MODEL || 'grok-3') as any,
      providerLabel: 'Grok',
    };
  }

  if (agent === 'mistral') {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error('Chýba MISTRAL_API_KEY pre Mistral.');
    }

    return {
      model: mistral(process.env.MISTRAL_MODEL || 'mistral-small-latest') as any,
      providerLabel: 'Mistral',
    };
  }

  throw new Error(`Neznámy AI agent: ${agent}`);
}

function getFallbackModel(): ModelResult {
  if (process.env.OPENAI_API_KEY) {
    return {
      model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
      providerLabel: 'GPT fallback',
    };
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return {
      model: google(process.env.GOOGLE_MODEL || 'gemini-2.5-flash') as any,
      providerLabel: 'Gemini fallback',
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      model: anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6') as any,
      providerLabel: 'Claude fallback',
    };
  }

  if (process.env.MISTRAL_API_KEY) {
    return {
      model: mistral(process.env.MISTRAL_MODEL || 'mistral-small-latest') as any,
      providerLabel: 'Mistral fallback',
    };
  }

  if (process.env.XAI_API_KEY) {
    return {
      model: xai(process.env.XAI_MODEL || 'grok-3') as any,
      providerLabel: 'Grok fallback',
    };
  }

  throw new Error(
    'Nie je nastavený žiadny AI provider. Doplň aspoň jeden API kľúč.'
  );
}

function isModelNotFoundError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes('model') &&
    (message.includes('not found') ||
      message.includes('404') ||
      message.includes('not supported'))
  );
}

async function createStreamResponse({
  model,
  systemPrompt,
  normalizedMessages,
}: {
  model: ModelResult['model'];
  systemPrompt: string;
  normalizedMessages: ReturnType<typeof normalizeMessages>;
}) {
  const result = streamText({
    model,
    system: systemPrompt,
    messages: normalizedMessages,
    temperature: 0.7,
    maxOutputTokens: 4000,
  });

  return result.toTextStreamResponse();
}

// ================= API ROUTE =================

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let rawAgent: unknown = 'gemini';
    let messages: ChatMessage[] = [];
    let profile: SavedProfile | null = null;
    let files: File[] = [];
    let projectId: string | null = null;
if (contentType.includes('multipart/form-data')) {
  const formData = await req.formData();

  // AI agent: openai / claude / gemini / grok / mistral
  rawAgent = formData.get('agent')?.toString() || 'gemini';

  // Správy z chatu
  messages = parseJson<ChatMessage[]>(formData.get('messages'), []);

  // Aktívny profil práce z frontendu
  profile = parseJson<SavedProfile | null>(formData.get('profile'), null);

  // ID projektu zo Supabase
  projectId = formData.get('projectId')?.toString() || null;

  // Priložené súbory z inputu, napr. PDF
  files = formData
    .getAll('files')
    .filter((item): item is File => item instanceof File);
} else {
  const body = await req.json().catch(() => null);

  // AI agent
  rawAgent = body?.agent || 'gemini';

  // Správy z chatu
  messages = Array.isArray(body?.messages) ? body.messages : [];

  // Aktívny profil práce
  profile = body?.profile || null;

  // ID projektu zo Supabase
  projectId = body?.projectId || null;

  // Pri JSON requeste nie sú súbory posielané cez FormData
  files = [];
}
    if (!isAllowedAgent(rawAgent)) {
      return new Response(`Neznámy AI agent: ${String(rawAgent)}`, {
        status: 400,
      });
    }

    const agent = rawAgent;
    const normalizedMessages = normalizeMessages(messages);

    if (normalizedMessages.length === 0) {
      return new Response('Chýbajú správy pre AI.', {
        status: 400,
      });
    }

    const uploadedAttachmentTexts = await extractAttachmentTexts(files);

const projectDocuments = await loadProjectDocuments(projectId);

const projectDocumentTexts = projectDocuments.map((doc, index) => {
  return `DOKUMENT ZO SUPABASE ${index + 1}
Názov: ${doc.file_name}
Typ: ${doc.mime_type || 'neuvedené'}
Veľkosť: ${doc.file_size || 0} bajtov
Text:
${doc.extracted_text || '[Dokument nemá uložený extrahovaný text]'}`;
});

const attachmentTexts = [
  ...uploadedAttachmentTexts,
  ...projectDocumentTexts,
];

const systemPrompt = buildSystemPrompt(profile, attachmentTexts);

    try {
      const primary = getModelByAgent(agent);

      return await createStreamResponse({
        model: primary.model,
        systemPrompt,
        normalizedMessages,
      });
    } catch (primaryError) {
      console.error('PRIMARY MODEL ERROR:', primaryError);

      if (!isModelNotFoundError(primaryError)) {
        throw primaryError;
      }

      const fallback = getFallbackModel();

      const fallbackSystemPrompt = `
${systemPrompt}

TECHNICKÁ POZNÁMKA:
Vybraný model nebol dostupný alebo bol odmietnutý poskytovateľom.
Odpovedáš cez náhradný model: ${fallback.providerLabel}.
`;

      return await createStreamResponse({
        model: fallback.model,
        systemPrompt: fallbackSystemPrompt,
        normalizedMessages,
      });
    }
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