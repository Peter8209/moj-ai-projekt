import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { xai } from '@ai-sdk/xai';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 90;

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
  file_type?: string | null;
  type?: string | null;
  extracted_text?: string | null;
  created_at?: string;
};

type ModelResult = {
  model: any;
  providerLabel: string;
};

type SourceMode = 'uploaded_documents_first';

type SourceSettings = {
  sourceMode: SourceMode;
  validateAttachmentsAgainstProfile: boolean;
  requireSourceList: boolean;
  allowAiKnowledgeFallback: boolean;
};

// ================= PROJECT DOCUMENTS =================

async function loadProjectDocuments(projectId: string | null) {
  if (!projectId) {
    return [];
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('zedpera_documents')
    .select(
      'id, project_id, file_name, file_path, file_size, file_type, type, extracted_text, created_at'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('LOAD PROJECT DOCUMENTS ERROR:', error);
    return [];
  }

  return (data || []) as ProjectDocument[];
}

// ================= GENERAL HELPERS =================

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

function toCleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

function getWorkLanguage(profile: SavedProfile | null) {
  return (
    toCleanString(profile?.workLanguage) ||
    toCleanString(profile?.language) ||
    'slovenčina'
  );
}

function getCitationStyle(profile: SavedProfile | null) {
  return toCleanString(profile?.citation) || 'ISO 690';
}

function getKeywords(profile: SavedProfile | null) {
  if (!profile) {
    return [];
  }

  const fromKeywordsList = Array.isArray(profile.keywordsList)
    ? profile.keywordsList
    : [];

  const fromKeywords = Array.isArray(profile.keywords) ? profile.keywords : [];

  return [...fromKeywordsList, ...fromKeywords]
    .map((keyword) => String(keyword).trim())
    .filter(Boolean);
}

function normalizeSourceMode(value: unknown): SourceMode {
  if (value === 'uploaded_documents_first') {
    return 'uploaded_documents_first';
  }

  return 'uploaded_documents_first';
}

// ================= ATTACHMENTS =================

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

  if (['.doc', '.docx'].includes(extension)) return 'Word dokument';

  if (['.txt', '.rtf', '.odt', '.md'].includes(extension)) {
    return 'Textový dokument';
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
    return 'Obrázok';
  }

  if (['.xls', '.xlsx', '.csv'].includes(extension)) return 'Tabuľka';

  if (['.ppt', '.pptx'].includes(extension)) return 'Prezentácia';

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
        `NEPODPOROVANÝ SÚBOR:
Názov: ${file.name}
Typ: ${file.type || 'application/octet-stream'}
Veľkosť: ${file.size} bajtov
Stav: Tento formát súboru nie je povolený.`
      );
      continue;
    }

    const extension = getFileExtension(file.name);
    const label = getAttachmentLabel(file.name);

    if (['.txt', '.md', '.csv'].includes(extension)) {
      try {
        const content = await file.text();

        results.push(
          `PRILOŽENÝ SÚBOR:
Názov: ${file.name}
Typ: ${label}
MIME: ${file.type || 'text/plain'}
Veľkosť: ${file.size} bajtov
Stav extrakcie: Text bol extrahovaný.

EXTRAHOVANÝ TEXT:
${content.slice(0, 30000)}`
        );

        continue;
      } catch {
        results.push(
          `PRILOŽENÝ SÚBOR:
Názov: ${file.name}
Typ: ${label}
MIME: ${file.type || 'text/plain'}
Veľkosť: ${file.size} bajtov
Stav extrakcie: Textový obsah sa nepodarilo načítať.`
        );

        continue;
      }
    }

    let note = '';

    if (extension === '.pdf') {
      note =
        'PDF dokument bol priložený, ale táto API trasa zatiaľ neextrahuje plný text PDF. AI pozná iba názov, typ a veľkosť súboru, nie celý obsah.';
    } else if (['.doc', '.docx', '.odt', '.rtf'].includes(extension)) {
      note =
        'Dokument bol priložený, ale táto API trasa zatiaľ neextrahuje plný text Word/ODT/RTF dokumentu. AI pozná iba názov, typ a veľkosť súboru, nie celý obsah.';
    } else if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
      note =
        'Obrázok bol priložený, ale táto API trasa zatiaľ nerobí OCR ani vizuálnu analýzu obrázka. AI pozná iba názov, typ a veľkosť súboru.';
    } else if (['.xls', '.xlsx'].includes(extension)) {
      note =
        'Tabuľkový súbor bol priložený, ale táto API trasa zatiaľ neextrahuje obsah buniek XLS/XLSX. AI pozná iba názov, typ a veľkosť súboru.';
    } else if (['.ppt', '.pptx'].includes(extension)) {
      note =
        'Prezentácia bola priložená, ale táto API trasa zatiaľ neextrahuje text zo slidov. AI pozná iba názov, typ a veľkosť súboru.';
    } else {
      note =
        'Súbor bol priložený, ale táto API trasa zatiaľ neextrahuje jeho plný obsah.';
    }

    results.push(
      `PRILOŽENÝ SÚBOR:
Názov: ${file.name}
Typ: ${label}
MIME: ${file.type || 'application/octet-stream'}
Veľkosť: ${file.size} bajtov
Stav extrakcie: ${note}`
    );
  }

  return results;
}

// ================= SYSTEM PROMPT =================

function buildAttachmentBlock(attachmentTexts: string[]) {
  if (!attachmentTexts.length) {
    return '\nPRILOŽENÉ SÚBORY A PODKLADY: Žiadne.\n';
  }

  return `\nPRILOŽENÉ SÚBORY A PODKLADY:\n${attachmentTexts.join(
    '\n\n-----------------\n\n'
  )}\n`;
}

function buildProfileKeywords(profile: SavedProfile | null) {
  const keywords = getKeywords(profile);

  return keywords.length > 0 ? keywords.join(', ') : 'Neuvedené';
}

function buildSystemPrompt(
  profile: SavedProfile | null,
  attachmentTexts: string[],
  settings: SourceSettings
) {
  const keywords = getKeywords(profile);

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

  const attachmentsBlock = buildAttachmentBlock(attachmentTexts);
  const workLanguage = getWorkLanguage(profile);
  const citationStyle = getCitationStyle(profile);
  const hasAttachments = attachmentTexts.length > 0;

  const documentSourceRules = `
PRAVIDLÁ PRE PRILOŽENÉ DOKUMENTY, ZDROJE A RELEVANTNOSŤ:

1. Semantic Scholar je vypnutý. Nepoužívaj Semantic Scholar, neuvádzaj ho ako zdroj a nespomínaj, že z neho čerpáš.

2. Primárny zdrojový základ tvoria:
- priložené dokumenty používateľa,
- dokumenty načítané zo Supabase,
- text zadaný používateľom v konverzácii,
- uložený Profil práce.

3. Najprv posúď, či priložené dokumenty tematicky zodpovedajú Profilu práce.

4. Profil práce je rozhodujúci. Príloha je relevantná iba vtedy, ak súvisí s témou, cieľom, problémom, metodológiou, odborom alebo kľúčovými slovami profilu.

5. Ak Profil práce hovorí napríklad o škole, pedagogike, divadle, politike, manažmente, IT alebo inom odbore a používateľ priloží dokument o nesúvisiacej téme, napríklad o jačmeni, poľnohospodárstve alebo úplne inom obsahu, musíš jasne uviesť:
"Požadovaná príloha nezodpovedá profilu práce a nebude použitá ako odborný zdroj."

6. Ak je príloha nesúvisiaca s profilom práce, nepoužívaj ju ako odborný zdroj pre hlavný text.

7. Ak sú priložené dokumenty relevantné a ich text je dostupný, čerpaj z nich a v sekcii zdrojov vypíš:
- názov dokumentu,
- typ dokumentu,
- autorov, ak sú v dokumente uvedení,
- rok, ak je v dokumente uvedený,
- názov publikácie alebo dokumentu,
- vydavateľa, časopis, inštitúciu alebo web, ak sú uvedené,
- URL alebo DOI, ak sa v dokumente nachádzajú.

8. Ak sú priložené dokumenty, ale neobsahujú žiadne identifikovateľné bibliografické zdroje, jasne napíš:
"V priložených dokumentoch sa nenachádzajú žiadne identifikovateľné bibliografické zdroje."

9. Ak sú priložené dokumenty, ale server neextrahoval ich obsah, jasne napíš, že nemôžeš overiť zdroje vo vnútri dokumentu, pretože máš dostupný iba názov, typ a veľkosť súboru.

10. Ak nie sú priložené žiadne dokumenty a používateľ chce vytvoriť odborný text, môžeš použiť všeobecné znalosti AI modelu, ale musíš jasne uviesť:
"Text bol vytvorený z uloženého profilu práce a zo všeobecných znalostí AI modelu. Neboli dodané overiteľné priložené zdroje."

11. Ak používaš všeobecné znalosti AI modelu, nesmieš predstierať, že si čerpal z konkrétneho priloženého dokumentu.

12. Ak uvedieš vlastné odborné zdroje, označ ich presne ako:
"AI odporúčané zdroje na overenie a doplnenie."

13. AI odporúčané zdroje nie sú to isté ako overené priložené zdroje. Musíš ich jasne oddeliť.

14. Ak odporúčaš všeobecne známe odborné publikácie, uvádzaj iba údaje, ktorými si si primerane istý. Nevymýšľaj DOI, URL, čísla strán, vydanie ani presný názov kapitoly.

15. Ak si nie si istý bibliografickým údajom, napíš "údaj je potrebné overiť".

16. Vždy rozdeľ zdroje do týchto skupín:

A. Zdroje nájdené v priložených dokumentoch
B. Priložené dokumenty použité ako podklad
C. Upozornenia k nerelevantným alebo neoveriteľným prílohám
D. AI odporúčané zdroje na overenie a doplnenie

17. Ak neexistujú prílohy, sekcia A a B musí jasne uviesť, že neboli dodané žiadne prílohy.

18. Ak existujú prílohy, ale nesúvisia s profilom práce, sekcia C musí jasne pomenovať problém.

19. Ak existujú prílohy, ale nie je extrahovaný ich text, sekcia C musí uviesť, že ich obsah nebol overený.

20. Pri akademickom texte používaj citačný štýl podľa profilu práce: ${citationStyle}.

21. Nevymýšľaj falošné bibliografické údaje. Ak údaj nie je dostupný, napíš "neuvedené".

22. Ak nie je možné overiť zdroje v prílohách, nesmieš tvrdiť, že zdroje boli v prílohách nájdené.

23. Ak používateľ požiada o prácu, kapitolu, úvod, teóriu, abstrakt alebo metodológiu, sekcia "POUŽITÉ ZDROJE A AUTORI" musí byť vždy prítomná.

24. Ak je zapnutá kontrola príloh podľa profilu práce: ${
    settings.validateAttachmentsAgainstProfile ? 'áno' : 'nie'
  }.

25. Povinný zoznam zdrojov: ${settings.requireSourceList ? 'áno' : 'nie'}.

26. Povolené použiť všeobecné znalosti AI pri chýbajúcich prílohách: ${
    settings.allowAiKnowledgeFallback ? 'áno' : 'nie'
  }.

27. Aktuálny zdrojový režim: ${settings.sourceMode}.
`;

  return `
Si ZEDPERA, profesionálny akademický AI asistent a AI vedúci práce.

HLAVNÝ PRACOVNÝ POSTUP:
1. Najprv vychádzaj z uloženého Profilu práce.
2. Následne zohľadni priložené súbory a dokumenty zo Supabase.
3. Semantic Scholar je vypnutý a nesmie sa použiť.
4. Ak existujú prílohy, najprv posúď ich tematickú relevantnosť voči Profilu práce.
5. Ak sú prílohy relevantné a ich text je dostupný, použi ich ako primárny podklad.
6. Ak prílohy chýbajú, môžeš vychádzať zo všeobecných znalostí AI modelu, ale musíš to transparentne uviesť.
7. Ak prílohy neobsahujú zdroje, musíš to transparentne uviesť.
8. Ak prílohy nesúvisia s profilom práce, musíš upozorniť, že nezodpovedajú profilu práce.

HLAVNÉ PRAVIDLÁ:
- Odpovedaj v jazyku práce: ${workLanguage}.
- Vychádzaj prednostne z uloženého profilu práce.
- Text má byť odborne napísaný, logický a vhodný pre akademické písanie.
- Ak niečo v profile chýba, uveď, čo odporúčaš doplniť.
- Nevymýšľaj konkrétne bibliografické údaje, ak nie sú priamo dostupné.
- Nepoužívaj falošné citácie, autorov, DOI ani názvy článkov.
- Nepoužívaj Markdown formátovanie ako tučný text, mriežky, hviezdičky, oddeľovače ani kódové bloky.
- Nadpisy píš obyčajným textom bez znakov #, *, _, \`.
- Výstup musí byť čistý text vhodný na priame vloženie do Word dokumentu.
- Ak sú priložené dokumenty, ale ich obsah nie je extrahovaný, nepredstieraj, že poznáš ich plný obsah.

ULOŽENÝ PROFIL PRÁCE:
Názov práce: ${profile?.title || 'Neuvedené'}
Téma práce: ${profile?.topic || 'Neuvedené'}
Typ práce: ${profile?.schema?.label || profile?.type || 'Neuvedené'}
Úroveň / odbornosť: ${profile?.level || 'Neuvedené'}
Odbor / predmet / oblasť: ${profile?.field || 'Neuvedené'}
Vedúci práce: ${profile?.supervisor || 'Neuvedené'}
Citačná norma: ${citationStyle}
Jazyk rozhrania: ${profile?.language || 'Neuvedené'}
Jazyk práce: ${workLanguage}
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

INFORMÁCIA O PRÍLOHÁCH:
Počet dostupných prílohových blokov: ${attachmentTexts.length}
Sú priložené dokumenty: ${hasAttachments ? 'Áno' : 'Nie'}

${attachmentsBlock}

${documentSourceRules}

FORMÁT ODPOVEDE:
Použi presne tieto sekcie. Nepoužívaj Markdown znaky, hviezdičky, mriežky ani kódové bloky.

=== VÝSTUP ===
Sem napíš hlavný výstup ako čistý akademický text. Ak ide o akademický text, vkladaj citácie priamo do textu podľa normy ${citationStyle}. Ak neboli dostupné overiteľné zdroje, nepoužívaj falošné citácie.

=== ANALÝZA ===
Stručne vysvetli:
- z ktorých údajov profilu si čerpal,
- či boli priložené dokumenty,
- či priložené dokumenty tematicky zodpovedajú profilu práce,
- či sa v priložených dokumentoch nachádzajú identifikovateľné bibliografické zdroje,
- či bol text vytvorený aj zo všeobecných znalostí AI modelu.

=== SKÓRE ===
Napíš iba číslo od 0 do 100 a krátke slovné hodnotenie. Skóre zníž, ak chýbajú relevantné zdroje, chýba extrahovaný obsah príloh alebo prílohy nezodpovedajú profilu práce.

=== ODPORÚČANIA ===
Uveď konkrétne odporúčania v čistom texte bez Markdown symbolov. Odporúčaj najmä:
- doplniť relevantné PDF/Word zdroje,
- doplniť bibliografiu,
- overiť AI odporúčané zdroje,
- odstrániť nerelevantné prílohy,
- doplniť metodológiu alebo výskumné otázky, ak chýbajú.

=== POUŽITÉ ZDROJE A AUTORI ===
A. Zdroje nájdené v priložených dokumentoch
Vypíš všetky identifikované zdroje z dokumentov. Ak sa nenašli, napíš:
V priložených dokumentoch sa nenachádzajú žiadne identifikovateľné bibliografické zdroje.

B. Priložené dokumenty použité ako podklad
Vypíš názvy relevantných priložených dokumentov, z ktorých si čerpal. Ak neboli priložené žiadne dokumenty, napíš:
Neboli priložené žiadne dokumenty.

C. Upozornenia k nerelevantným alebo neoveriteľným prílohám
Ak niektorá príloha nesúvisí s profilom práce, vypíš:
Požadovaná príloha nezodpovedá profilu práce: názov súboru.
Ak príloha nebola obsahovo extrahovaná, vypíš:
Obsah prílohy nebol overený, pretože server má dostupný iba názov, typ a veľkosť súboru: názov súboru.
Ak všetky dostupné prílohy súvisia a ich obsah je použiteľný, napíš:
Neboli zistené nerelevantné prílohy.

D. AI odporúčané zdroje na overenie a doplnenie
Ak neboli priložené zdroje alebo sú zdroje nedostatočné, vypíš relevantné odborné zdroje, ktoré odporúčaš overiť a doplniť. Označ ich ako odporúčané, nie ako overene použité z príloh. Nevymýšľaj DOI, URL ani presné strany.
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
      message.includes('not supported') ||
      message.includes('invalid model'))
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
    temperature: 0.45,
    maxOutputTokens: 4500,
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

    let sourceMode: SourceMode = 'uploaded_documents_first';
    let validateAttachmentsAgainstProfile = true;
    let requireSourceList = true;
    let allowAiKnowledgeFallback = true;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      rawAgent = formData.get('agent')?.toString() || 'gemini';
      messages = parseJson<ChatMessage[]>(formData.get('messages'), []);
      profile = parseJson<SavedProfile | null>(formData.get('profile'), null);
      projectId = formData.get('projectId')?.toString() || null;

      sourceMode = normalizeSourceMode(formData.get('sourceMode')?.toString());

      validateAttachmentsAgainstProfile =
        formData.get('validateAttachmentsAgainstProfile')?.toString() !==
        'false';

      requireSourceList =
        formData.get('requireSourceList')?.toString() !== 'false';

      allowAiKnowledgeFallback =
        formData.get('allowAiKnowledgeFallback')?.toString() !== 'false';

      files = formData
        .getAll('files')
        .filter((item): item is File => item instanceof File);
    } else {
      const body = await req.json().catch(() => null);

      rawAgent = body?.agent || 'gemini';
      messages = Array.isArray(body?.messages) ? body.messages : [];
      profile = body?.profile || body?.activeProfile || body?.savedProfile || null;
      projectId = body?.projectId || null;

      sourceMode = normalizeSourceMode(body?.sourceMode);

      validateAttachmentsAgainstProfile =
        body?.validateAttachmentsAgainstProfile !== false;

      requireSourceList = body?.requireSourceList !== false;

      allowAiKnowledgeFallback = body?.allowAiKnowledgeFallback !== false;

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
      const documentType = doc.file_type || doc.type || 'neuvedené';

      return `DOKUMENT ZO SUPABASE ${index + 1}
Názov: ${doc.file_name}
Typ: ${documentType}
Veľkosť: ${doc.file_size || 0} bajtov
Stav extrakcie: ${
        doc.extracted_text
          ? 'Dokument má uložený extrahovaný text.'
          : 'Dokument nemá uložený extrahovaný text.'
      }

EXTRAHOVANÝ TEXT:
${doc.extracted_text || '[Dokument nemá uložený extrahovaný text]'}`;
    });

    const attachmentTexts = [
      ...uploadedAttachmentTexts,
      ...projectDocumentTexts,
    ];

    const settings: SourceSettings = {
      sourceMode,
      validateAttachmentsAgainstProfile,
      requireSourceList,
      allowAiKnowledgeFallback,
    };

    const systemPrompt = buildSystemPrompt(profile, attachmentTexts, settings);

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

Aj pri náhradnom modeli musíš dodržať pravidlo:
Na konci akademickej odpovede vždy uveď sekciu:

=== POUŽITÉ ZDROJE A AUTORI ===

Semantic Scholar je vypnutý. Používaj iba Profil práce, priložené dokumenty, dokumenty zo Supabase, text používateľa a všeobecné znalosti AI modelu.
Ak neboli dodané overiteľné zdroje, nevymýšľaj ich a jasne uveď:
Text bol vytvorený z uloženého profilu práce a zo všeobecných znalostí AI modelu. Neboli dodané overiteľné priložené zdroje.
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