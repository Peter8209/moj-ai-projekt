import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { xai } from '@ai-sdk/xai';
import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { createAdminClient } from '@/lib/supabase/server';
import { GLOBAL_ACADEMIC_SYSTEM_PROMPT } from '@/lib/ai-system-prompt';
import { getZedperaErrorMessage } from '@/lib/api-error-messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
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

type ExtractedAttachment = {
  name: string;
  type: string;
  size: number;
  extension: string;
  label: string;
  extractedText: string;
  extractedChars: number;
  extractedPreview: string;
  status: string;
  error?: string | null;
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
    console.error('LOAD_PROJECT_DOCUMENTS_ERROR:', error);
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

function normalizeText(value: string): string {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function limitText(value: string, maxLength: number): string {
  const cleaned = normalizeText(value);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength)}

[TEXT BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT API.]`;
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

function asBoolean(value: FormDataEntryValue | null, fallback: boolean) {
  if (value === null) return fallback;

  const normalized = String(value).toLowerCase().trim();

  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return fallback;
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

const extractableAttachmentExtensions = [
  '.pdf',
  '.docx',
  '.txt',
  '.md',
  '.csv',
  '.rtf',
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

function stripRtf(value: string): string {
  return value
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-zA-Z]+\d* ?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParseModule: any = await import('pdf-parse');
  const pdfParse = pdfParseModule.default || pdfParseModule;

  const result = await pdfParse(buffer);

  return normalizeText(result?.text || '');
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });

  return normalizeText(result.value || '');
}

async function extractTextFromSingleFile(file: File): Promise<ExtractedAttachment> {
  const name = file.name || 'neznamy-subor';
  const type = file.type || 'application/octet-stream';
  const size = file.size || 0;
  const extension = getFileExtension(name);
  const label = getAttachmentLabel(name);

  if (!isAllowedAttachment(file)) {
    return {
      name,
      type,
      size,
      extension,
      label,
      extractedText: '',
      extractedChars: 0,
      extractedPreview: '',
      status: 'Nepodporovaný formát súboru.',
      error: 'Nepodporovaný formát súboru.',
    };
  }

  if (!extractableAttachmentExtensions.includes(extension)) {
    return {
      name,
      type,
      size,
      extension,
      label,
      extractedText: '',
      extractedChars: 0,
      extractedPreview: '',
      status:
        'Súbor bol priložený, ale z tohto typu sa v tejto API trase neextrahuje text. AI má dostupný iba názov, typ a veľkosť súboru.',
      error: null,
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';

    if (['.txt', '.md', '.csv'].includes(extension)) {
      extractedText = normalizeText(buffer.toString('utf8'));
    } else if (extension === '.rtf') {
      extractedText = normalizeText(stripRtf(buffer.toString('utf8')));
    } else if (extension === '.docx') {
      extractedText = await extractDocxText(buffer);
    } else if (extension === '.pdf') {
      extractedText = await extractPdfText(buffer);
    }

    if (!extractedText.trim()) {
      return {
        name,
        type,
        size,
        extension,
        label,
        extractedText: '',
        extractedChars: 0,
        extractedPreview: '',
        status:
          extension === '.pdf'
            ? 'Text sa nepodarilo extrahovať. PDF môže byť skenované ako obrázok alebo môže obsahovať iba obrazové strany.'
            : 'Text sa nepodarilo extrahovať alebo je súbor prázdny.',
        error: null,
      };
    }

    const limited = limitText(extractedText, 50000);

    return {
      name,
      type,
      size,
      extension,
      label,
      extractedText: limited,
      extractedChars: extractedText.length,
      extractedPreview: extractedText.slice(0, 1200),
      status: 'Text bol úspešne extrahovaný.',
      error: null,
    };
  } catch (error) {
    return {
      name,
      type,
      size,
      extension,
      label,
      extractedText: '',
      extractedChars: 0,
      extractedPreview: '',
      status: 'Extrakcia zlyhala.',
      error:
        error instanceof Error
          ? error.message
          : 'Nepodarilo sa extrahovať text zo súboru.',
    };
  }
}

async function extractAttachmentTexts(files: File[]) {
  const extractedFiles: ExtractedAttachment[] = [];

  if (!files.length) {
    return {
      extractedFiles,
      attachmentTexts: [] as string[],
    };
  }

  for (const file of files) {
    const extracted = await extractTextFromSingleFile(file);
    extractedFiles.push(extracted);
  }

  const attachmentTexts = extractedFiles.map((file, index) => {
    const textBlock =
      file.extractedText && file.extractedText.trim().length > 0
        ? file.extractedText
        : '[Text nebol extrahovaný alebo nie je dostupný.]';

    return `PRILOŽENÝ SÚBOR ${index + 1}
Názov: ${file.name}
Typ: ${file.label}
MIME: ${file.type}
Prípona: ${file.extension || 'neuvedené'}
Veľkosť: ${file.size} bajtov
Stav extrakcie: ${file.status}
Počet extrahovaných znakov: ${file.extractedChars}

EXTRAHOVANÝ TEXT:
${textBlock}`;
  });

  return {
    extractedFiles,
    attachmentTexts,
  };
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
PRAVIDLÁ PRE PRILOŽENÉ DOKUMENTY, EXTRAHOVANÝ TEXT, ZDROJE A RELEVANTNOSŤ:

1. Semantic Scholar je vypnutý. Nepoužívaj Semantic Scholar, neuvádzaj ho ako zdroj a nespomínaj, že z neho čerpáš.

2. Primárny zdrojový základ tvoria:
- extrahovaný text z priložených dokumentov používateľa,
- dokumenty načítané zo Supabase,
- text zadaný používateľom v konverzácii,
- uložený Profil práce.

3. Ak sa z prílohy podarilo extrahovať text, musíš tento extrahovaný text použiť ako prvý zdrojový podklad pred všeobecnými znalosťami AI.

4. Nikdy nepíš, že obsah nebol extrahovaný, ak je pri prílohe uvedené:
Stav extrakcie: Text bol úspešne extrahovaný.

5. Ak je pri prílohe extrahovaný text, ale neobsahuje úplné bibliografické údaje, napíš:
Text bol extrahovaný, ale neobsahuje úplné bibliografické údaje.

6. Najprv posúď, či priložené dokumenty tematicky zodpovedajú Profilu práce.

7. Profil práce je rozhodujúci. Príloha je relevantná iba vtedy, ak súvisí s témou, cieľom, problémom, metodológiou, odborom alebo kľúčovými slovami profilu.

8. Ak Profil práce hovorí napríklad o škole, pedagogike, divadle, politike, manažmente, IT alebo inom odbore a používateľ priloží dokument o nesúvisiacej téme, musíš jasne uviesť:
Požadovaná príloha nezodpovedá profilu práce a nebude použitá ako odborný zdroj.

9. Ak je príloha nesúvisiaca s profilom práce, nepoužívaj ju ako odborný zdroj pre hlavný text.

10. Ak sú priložené dokumenty relevantné a ich text je dostupný, čerpaj z nich a v sekcii zdrojov vypíš:
- názov dokumentu,
- typ dokumentu,
- autorov, ak sú v dokumente uvedení,
- rok, ak je v dokumente uvedený,
- názov publikácie alebo dokumentu,
- vydavateľa, časopis, inštitúciu alebo web, ak sú uvedené,
- URL alebo DOI, ak sa v dokumente nachádzajú.

11. Ak sú priložené dokumenty, ale neobsahujú žiadne identifikovateľné bibliografické zdroje, jasne napíš:
V priložených dokumentoch sa nenachádzajú žiadne identifikovateľné bibliografické zdroje.

12. Ak sú priložené dokumenty, ale server neextrahoval ich obsah, jasne napíš, že nemôžeš overiť zdroje vo vnútri dokumentu, pretože máš dostupný iba názov, typ a veľkosť súboru.

13. Ak nie sú priložené žiadne dokumenty a používateľ chce vytvoriť odborný text, môžeš použiť všeobecné znalosti AI modelu, ale musíš jasne uviesť:
Text bol vytvorený z uloženého profilu práce a zo všeobecných znalostí AI modelu. Neboli dodané overiteľné priložené zdroje.

14. Ak používaš všeobecné znalosti AI modelu, nesmieš predstierať, že si čerpal z konkrétneho priloženého dokumentu.

15. Ak uvedieš vlastné odborné zdroje, označ ich presne ako:
AI odporúčané zdroje na overenie a doplnenie.

16. AI odporúčané zdroje nie sú to isté ako overené priložené zdroje. Musíš ich jasne oddeliť.

17. Ak odporúčaš všeobecne známe odborné publikácie, uvádzaj iba údaje, ktorými si si primerane istý. Nevymýšľaj DOI, URL, čísla strán, vydanie ani presný názov kapitoly.

18. Ak si nie si istý bibliografickým údajom, napíš:
údaj je potrebné overiť.

19. Vždy rozdeľ zdroje do týchto skupín:

A. Zdroje nájdené v priložených dokumentoch
B. Priložené dokumenty použité ako podklad
C. Upozornenia k nerelevantným alebo neoveriteľným prílohám
D. AI odporúčané zdroje na overenie a doplnenie

20. Ak neexistujú prílohy, sekcia A a B musí jasne uviesť, že neboli dodané žiadne prílohy.

21. Ak existujú prílohy, ale nesúvisia s profilom práce, sekcia C musí jasne pomenovať problém.

22. Ak existujú prílohy, ale nie je extrahovaný ich text, sekcia C musí uviesť, že ich obsah nebol overený.

23. Pri akademickom texte používaj citačný štýl podľa profilu práce: ${citationStyle}.

24. Nevymýšľaj falošné bibliografické údaje. Ak údaj nie je dostupný, napíš:
neuvedené.

25. Ak používateľ požiada o prácu, kapitolu, úvod, teóriu, abstrakt alebo metodológiu, sekcia POUŽITÉ ZDROJE A AUTORI musí byť vždy prítomná.

26. Ak je zapnutá kontrola príloh podľa profilu práce: ${
    settings.validateAttachmentsAgainstProfile ? 'áno' : 'nie'
  }.

27. Povinný zoznam zdrojov: ${settings.requireSourceList ? 'áno' : 'nie'}.

28. Povolené použiť všeobecné znalosti AI pri chýbajúcich prílohách: ${
    settings.allowAiKnowledgeFallback ? 'áno' : 'nie'
  }.

29. Aktuálny zdrojový režim: ${settings.sourceMode}.
`;

  const citationSpecialistRules = `
ŠPECIÁLNY REŽIM PRE CITÁCIE, BIBLIOGRAFIU A ZDROJE:

Tento režim použi vždy, keď používateľ žiada:
- spracovať zdroje,
- pripraviť bibliografiu,
- opraviť citácie,
- citovať podľa APA 7 alebo ISO 690,
- spracovať zoznam literatúry,
- vytvoriť odkazy v texte,
- analyzovať výstupy zo softvéru JASP, SPSS, Jamovi, R, Excel alebo iného štatistického softvéru,
- alebo keď priložený dokument obsahuje zoznam literatúry, bibliografické záznamy, autorov, roky, názvy kníh, článkov, softvér alebo štatistické výstupy.

POVINNÝ TÓN:
Začni prirodzene, profesionálne a osobne, napríklad:
Ahoj, ako tvoja citačná špecialistka som analyzovala tvoje vstupné údaje a priložené dokumenty.

Ak poznáš meno používateľa alebo meno adresáta z kontextu, môžeš ho použiť. Ak meno nepoznáš, nepoužívaj vymyslené meno.

POVINNÉ SPRACOVANIE ZDROJOV:
1. Najprv identifikuj všetky zdroje uvedené v extrahovanom texte dokumentov.
2. Ak dokument obsahuje neúplný zoznam literatúry, zachovaj všetky dostupné údaje.
3. Chýbajúce roky, vydania, spoluautorov, vydavateľov, DOI, URL alebo verzie softvéru označ vetou:
údaj je potrebné overiť.
4. Ak použiješ pravdepodobné alebo najčastejšie citované vydanie, vždy upozorni:
Rok alebo vydanie je potrebné overiť podľa konkrétneho výtlačku alebo knižničného záznamu.
5. Nikdy nevymýšľaj DOI, URL, vydanie, čísla strán ani presné roky, ak nie sú dostupné.
6. Ak sa v dokumente nachádza "a kol.", odporuč doplniť všetkých spoluautorov.
7. Ak dokument obsahuje výstupy zo štatistického softvéru, uveď softvér ako samostatný zdroj.
8. Ak sa v dokumente nachádza JASP, priprav citáciu softvéru JASP.
9. Ak nie je známa verzia softvéru JASP, použi n.d. alebo upozorni, že verziu treba doplniť.
10. Ak je známa verzia, priprav záznam v tvare:
JASP Team. (rok). JASP (Version verzia) [Computer software]. https://jasp-stats.org/

POVINNÁ ŠTRUKTÚRA ODPOVEDE PRI CITÁCIÁCH:

A) Formátované bibliografické záznamy
Rozdeľ podľa typu:
- Knihy
- Články
- Webové zdroje
- Softvér
- Interné dokumenty / priložené výstupy

Pri každom zázname uveď poznámku, ak je potrebné niečo overiť.

B) Varianty odkazov v texte
Pri každom zdroji priprav:
- parentetický odkaz,
- naratívny odkaz,
- ukážku použitia vo vete.

C) Špeciálne prípady
Vysvetli:
- viac autorov,
- et al.,
- a kol.,
- chýbajúci rok,
- chýbajúce miesto vydania,
- softvér,
- štatistické výstupy,
- interné dokumenty,
- rozdiel medzi overeným zdrojom z prílohy a AI odporúčaným zdrojom.

D) Validácia a korekcia
Uveď konkrétne:
- ktoré údaje treba overiť,
- ktoré roky chýbajú,
- či je potrebné doplniť vydavateľa,
- či je potrebné doplniť spoluautorov,
- či je potrebné doplniť verziu softvéru,
- či APA 7 uvádza alebo neuvádza miesto vydania,
- či treba overiť fyzický výtlačok alebo knižničný záznam.

E) Finálny zoznam literatúry
Priprav čistý zoznam literatúry vhodný na vloženie do práce.

F) Odporúčaná veta do metodológie
Ak sú v dokumente štatistické výstupy, priprav odbornú vetu do metodologickej časti.

PRAVIDLÁ APA 7:
- Pri knihách sa v APA 7 neuvádza miesto vydania.
- Pri troch a viacerých autoroch sa v texte používa "et al.".
- V zozname literatúry sa uvádzajú dostupní autori podľa pravidiel APA 7.
- Pri softvéri sa uvádza autor alebo tím, rok, názov, verzia, typ v hranatých zátvorkách a URL.
- Ak rok nie je známy, použi (n.d.) a upozorni, že údaj treba overiť.

PRAVIDLÁ ISO 690:
- Ak profil práce vyžaduje ISO 690, priprav záznamy podľa ISO 690.
- Ak používateľ výslovne žiada APA 7, použi APA 7 aj vtedy, keď profil obsahuje inú normu.

DÔLEŽITÉ:
- Primárne vychádzaj zo zdrojov v priložených dokumentoch.
- Ak zdroj nie je v dokumente, jasne ho označ ako AI odporúčaný zdroj na overenie.
- Neprezentuj odporúčaný zdroj ako overene nájdený v prílohe.
- Výstup má byť profesionálny, štruktúrovaný a vhodný na vloženie do Word dokumentu.
`;

  return `
Si ZEDPERA, profesionálny akademický AI asistent, AI vedúci práce a citačná špecialistka.

HLAVNÝ PRACOVNÝ POSTUP:
1. Najprv vychádzaj z uloženého Profilu práce.
2. Následne použi extrahovaný text z priložených dokumentov a dokumenty zo Supabase.
3. Ak je pri prílohe extrahovaný text, musíš ho použiť pred všeobecnými znalosťami AI.
4. Semantic Scholar je vypnutý a nesmie sa použiť.
5. Ak existujú prílohy, najprv posúď ich tematickú relevantnosť voči Profilu práce.
6. Ak sú prílohy relevantné a ich text je dostupný, použi ich ako primárny podklad.
7. Ak prílohy chýbajú, môžeš vychádzať zo všeobecných znalostí AI modelu, ale musíš to transparentne uviesť.
8. Ak prílohy neobsahujú zdroje, musíš to transparentne uviesť.
9. Ak prílohy nesúvisia s profilom práce, musíš upozorniť, že nezodpovedajú profilu práce.
10. Nikdy nepíš, že obsah nebol extrahovaný, ak je nižšie uvedený extrahovaný text.

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

${citationSpecialistRules}

FORMÁT ODPOVEDE:
Použi presne tieto sekcie. Nepoužívaj Markdown znaky, hviezdičky, mriežky ani kódové bloky.

=== VÝSTUP ===
Sem napíš hlavný výstup ako čistý akademický text. Ak používateľ žiada citácie alebo zdroje, priprav odpoveď ako citačná špecialistka v štruktúre A až F:
A) Formátované bibliografické záznamy
B) Varianty odkazov v texte
C) Špeciálne prípady
D) Validácia a korekcia
E) Finálny zoznam literatúry
F) Odporúčaná veta do metodológie

Ak ide o akademický text, vkladaj citácie priamo do textu podľa normy ${citationStyle}. Ak neboli dostupné overiteľné zdroje, nepoužívaj falošné citácie.

=== ANALÝZA ===
Stručne vysvetli:
- z ktorých údajov profilu si čerpal,
- či boli priložené dokumenty,
- či bol text príloh extrahovaný,
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
Vypíš všetky identifikované zdroje z extrahovaného textu dokumentov. Ak sa nenašli, napíš:
V priložených dokumentoch sa nenachádzajú žiadne identifikovateľné bibliografické zdroje.
Ak bol text extrahovaný, ale neobsahuje úplné bibliografické údaje, napíš:
Text bol extrahovaný, ale neobsahuje úplné bibliografické údaje.

B. Formátované bibliografické záznamy
Uprav všetky dostupné zdroje podľa citačnej normy. Ak používateľ žiada APA 7, použi APA 7. Ak používateľ žiada ISO 690, použi ISO 690. Pri chýbajúcich údajoch napíš:
údaj je potrebné overiť.

C. Varianty odkazov v texte
Pri každom zdroji priprav parentetický a naratívny odkaz.

D. Priložené dokumenty použité ako podklad
Vypíš názvy relevantných priložených dokumentov, z ktorých si čerpal. Ak neboli priložené žiadne dokumenty, napíš:
Neboli priložené žiadne dokumenty.

E. Upozornenia k nerelevantným alebo neoveriteľným prílohám
Ak niektorá príloha nesúvisí s profilom práce, vypíš:
Požadovaná príloha nezodpovedá profilu práce: názov súboru.
Ak príloha nebola obsahovo extrahovaná, vypíš:
Obsah prílohy nebol overený, pretože server má dostupný iba názov, typ a veľkosť súboru: názov súboru.
Ak všetky dostupné prílohy súvisia a ich obsah je použiteľný, napíš:
Neboli zistené nerelevantné prílohy.

F. AI odporúčané zdroje na overenie a doplnenie
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
    temperature: 0.35,
    maxOutputTokens: 4500,
  });

  return result.toTextStreamResponse();
}

async function createJsonResponse({
  model,
  systemPrompt,
  normalizedMessages,
  extractedFiles,
  providerLabel,
}: {
  model: ModelResult['model'];
  systemPrompt: string;
  normalizedMessages: ReturnType<typeof normalizeMessages>;
  extractedFiles: ExtractedAttachment[];
  providerLabel: string;
}) {
  const result = await generateText({
    model,
    system: systemPrompt,
    messages: normalizedMessages,
    temperature: 0.35,
    maxOutputTokens: 4500,
  });

  return NextResponse.json({
    ok: true,
    provider: providerLabel,
    output: result.text || '',
    extractedFiles: extractedFiles.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      extension: file.extension,
      label: file.label,
      extractedChars: file.extractedChars,
      extractedPreview: file.extractedPreview,
      status: file.status,
      error: file.error || null,
    })),
  });
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
    let returnExtractedFilesInfo = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      rawAgent = formData.get('agent')?.toString() || 'gemini';
      messages = parseJson<ChatMessage[]>(formData.get('messages'), []);
      profile = parseJson<SavedProfile | null>(formData.get('profile'), null);
      projectId = formData.get('projectId')?.toString() || null;

      sourceMode = normalizeSourceMode(formData.get('sourceMode')?.toString());

      validateAttachmentsAgainstProfile = asBoolean(
        formData.get('validateAttachmentsAgainstProfile'),
        true
      );

      requireSourceList = asBoolean(formData.get('requireSourceList'), true);

      allowAiKnowledgeFallback = asBoolean(
        formData.get('allowAiKnowledgeFallback'),
        true
      );

      returnExtractedFilesInfo = asBoolean(
        formData.get('returnExtractedFilesInfo'),
        false
      );

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

      returnExtractedFilesInfo = body?.returnExtractedFilesInfo === true;

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

    const { extractedFiles, attachmentTexts: uploadedAttachmentTexts } =
      await extractAttachmentTexts(files);

    console.log(
      'EXTRACTED_FILES_DEBUG:',
      extractedFiles.map((file) => ({
        name: file.name,
        extension: file.extension,
        chars: file.extractedChars,
        status: file.status,
        error: file.error,
        preview: file.extractedPreview.slice(0, 200),
      }))
    );

    const projectDocuments = await loadProjectDocuments(projectId);

    const projectDocumentTexts = projectDocuments.map((doc, index) => {
      const documentType = doc.file_type || doc.type || 'neuvedené';
      const extractedText = normalizeText(doc.extracted_text || '');

      return `DOKUMENT ZO SUPABASE ${index + 1}
Názov: ${doc.file_name}
Typ: ${documentType}
Veľkosť: ${doc.file_size || 0} bajtov
Stav extrakcie: ${
        extractedText
          ? 'Dokument má uložený extrahovaný text.'
          : 'Dokument nemá uložený extrahovaný text.'
      }
Počet extrahovaných znakov: ${extractedText.length}

EXTRAHOVANÝ TEXT:
${extractedText ? limitText(extractedText, 50000) : '[Dokument nemá uložený extrahovaný text]'}`;
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

      if (returnExtractedFilesInfo) {
        return await createJsonResponse({
          model: primary.model,
          systemPrompt,
          normalizedMessages,
          extractedFiles,
          providerLabel: primary.providerLabel,
        });
      }

      return await createStreamResponse({
        model: primary.model,
        systemPrompt,
        normalizedMessages,
      });
    } catch (primaryError) {
      console.error('PRIMARY_MODEL_ERROR:', primaryError);

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

Ak bol text z príloh extrahovaný, musíš ho použiť ako prvý zdrojový podklad.
Ak používateľ žiada spracovanie citácií, musíš odpovedať ako citačná špecialistka a použiť štruktúru:
A) Formátované bibliografické záznamy
B) Varianty odkazov v texte
C) Špeciálne prípady
D) Validácia a korekcia
E) Finálny zoznam literatúry
F) Odporúčaná veta do metodológie

Semantic Scholar je vypnutý.
Používaj iba Profil práce, extrahovaný text z priložených dokumentov, dokumenty zo Supabase, text používateľa a všeobecné znalosti AI modelu.
Ak neboli dodané overiteľné zdroje, nevymýšľaj ich a jasne uveď:
Text bol vytvorený z uloženého profilu práce a zo všeobecných znalostí AI modelu. Neboli dodané overiteľné priložené zdroje.
`;

      if (returnExtractedFilesInfo) {
        return await createJsonResponse({
          model: fallback.model,
          systemPrompt: fallbackSystemPrompt,
          normalizedMessages,
          extractedFiles,
          providerLabel: fallback.providerLabel,
        });
      }

      return await createStreamResponse({
        model: fallback.model,
        systemPrompt: fallbackSystemPrompt,
        normalizedMessages,
      });
    }
  } catch (error) {
    console.error('CHAT_API_ERROR:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Neznáma chyba servera v /api/chat';

    return new Response(`API error 500: ${message}`, {
      status: 500,
    });
  }
}