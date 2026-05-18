import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GLOBAL_ACADEMIC_SYSTEM_PROMPT } from '@/lib/ai-system-prompt';
import { getZedperaErrorMessage } from '@/lib/api-error-messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AUDIT_END_MARKER = 'KONIEC AUDITU';
const MIN_TEXT_LENGTH = 300;
const MAX_MANUAL_TEXT_LENGTH = 30000;
const MAX_ATTACHMENT_TEXT_LENGTH = 30000;
const MAX_TOTAL_SOURCE_LENGTH = 50000;

type SavedProfile = {
  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;
  supervisor?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  methodology?: string;
  keywords?: string[];
  keywordsList?: string[];
};

type UploadedAttachment = {
  id?: string;
  name?: string;
  filename?: string;
  originalName?: string;
  type?: string;
  mimeType?: string;
  size?: number;
  extension?: string;
  url?: string;
  path?: string;

  text?: string;
  content?: string;
  extractedText?: string;
  markdown?: string;
  rawText?: string;
};

type AuditRequest = {
  text?: string;
  checkType?: string;
  outputType?: string;
  citationStyle?: string;
  activeProfile?: SavedProfile | null;
  attachments?: UploadedAttachment[];

  title?: string;
  workType?: string;
  language?: string;

  prompt?: string;
  instruction?: string;
  cleanOutput?: boolean;
  removeBrokenEncoding?: boolean;
  outputFormat?: string;
  requireEndMarker?: string;
  maxOutputTokens?: number;
};

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/Â+/g, '')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã¤/g, 'ä')
    .replace(/Ãč/g, 'č')
    .replace(/Ä/g, 'č')
    .replace(/Ä/g, 'ď')
    .replace(/Ã©/g, 'é')
    .replace(/Ä›/g, 'ě')
    .replace(/Ã­/g, 'í')
    .replace(/Äľ/g, 'ľ')
    .replace(/Ä¾/g, 'ľ')
    .replace(/Åˆ/g, 'ň')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã´/g, 'ô')
    .replace(/Å•/g, 'ŕ')
    .replace(/Å¡/g, 'š')
    .replace(/Å¥/g, 'ť')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã½/g, 'ý')
    .replace(/Å¾/g, 'ž')
    .replace(/ÄŚ/g, 'Č')
    .replace(/ÄŽ/g, 'Ď')
    .replace(/Ã‰/g, 'É')
    .replace(/Ä˝/g, 'Ľ')
    .replace(/Å‡/g, 'Ň')
    .replace(/Ã“/g, 'Ó')
    .replace(/Å Š/g, 'Š')
    .replace(/Å½/g, 'Ž')
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€¦/g, '…')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function limitText(value: string, maxLength: number) {
  const cleaned = cleanText(value);

  if (cleaned.length <= maxLength) {
    return {
      text: cleaned,
      truncated: false,
      originalLength: cleaned.length,
      usedLength: cleaned.length,
    };
  }

  return {
    text: cleaned.slice(0, maxLength).trim(),
    truncated: true,
    originalLength: cleaned.length,
    usedLength: maxLength,
  };
}

function removeBadAuditStart(value: string) {
  return cleanText(value)
    .replace(/^Audit\s+kvality\s*[-–—:]?.*$/im, '')
    .replace(/^AI\s+audit\s+kvality\s*[-–—:]?.*$/im, '')
    .replace(/^Ako\s+audit\s+kvality\s*,?\s*/i, '')
    .replace(/^Ako\s+AI\s+audítor\s*,?\s*/i, '')
    .replace(/^Dobrý\s+deň\s*,?\s*/i, '')
    .replace(/^Vážený\s+študent\s*,?\s*/i, '')
    .replace(/^Predmet\s*:.*$/gim, '')
    .replace(/^Email\s*:.*$/gim, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function removeEndMarker(value: string) {
  return cleanText(value)
    .replace(new RegExp(`\\s*${AUDIT_END_MARKER}\\s*$`, 'i'), '')
    .trim();
}

function hasEndMarker(value: string) {
  return cleanText(value).toUpperCase().includes(AUDIT_END_MARKER);
}

function getProfileKeywords(profile?: SavedProfile | null) {
  if (!profile) return 'nezadané';

  if (Array.isArray(profile.keywords) && profile.keywords.length > 0) {
    return profile.keywords.map(cleanText).filter(Boolean).join(', ');
  }

  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length > 0) {
    return profile.keywordsList.map(cleanText).filter(Boolean).join(', ');
  }

  return 'nezadané';
}

function formatFileSize(bytes?: number) {
  if (!bytes || Number.isNaN(bytes)) return 'nezadané';

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getAttachmentName(file: UploadedAttachment, index: number) {
  return cleanText(
    file.name ||
      file.filename ||
      file.originalName ||
      `priloha-${index + 1}`
  );
}

function getAttachmentType(file: UploadedAttachment) {
  return cleanText(file.type || file.mimeType || file.extension || 'nezadané');
}

function getAttachmentText(file: UploadedAttachment) {
  return cleanText(
    file.text ||
      file.content ||
      file.extractedText ||
      file.markdown ||
      file.rawText ||
      ''
  );
}

function normalizeAttachments(value: unknown): UploadedAttachment[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item) => item && typeof item === 'object') as UploadedAttachment[];
}

function buildAttachmentsBlock(attachments: UploadedAttachment[]) {
  if (!attachments.length) {
    return 'Neboli priložené žiadne prílohy.';
  }

  let totalUsedLength = 0;

  return attachments
    .map((file, index) => {
      const name = getAttachmentName(file, index);
      const type = getAttachmentType(file);
      const size = formatFileSize(file.size);
      const originalFileText = getAttachmentText(file);

      const remainingLimit = Math.max(0, MAX_TOTAL_SOURCE_LENGTH - totalUsedLength);
      const fileLimit = Math.min(MAX_ATTACHMENT_TEXT_LENGTH, remainingLimit);

      const limitedFileText = limitText(originalFileText, fileLimit);
      totalUsedLength += limitedFileText.usedLength;

      const truncationInfo = limitedFileText.truncated
        ? `Text prílohy bol skrátený z ${limitedFileText.originalLength} na ${limitedFileText.usedLength} znakov, aby sa audit neodsekol.`
        : 'Text prílohy nebol skrátený.';

      return `
PRÍLOHA ${index + 1}
Názov súboru: ${name}
Typ súboru: ${type}
Veľkosť: ${size}
URL / cesta: ${file.url || file.path || 'nezadané'}
Stav textu: ${truncationInfo}

OBSAH PRÍLOHY:
"""
${
  limitedFileText.text ||
  'Text z prílohy nebol dostupný. Ak ide o PDF/DOCX, skontroluj, či /api/uploads extrahuje text zo súboru a vracia ho v poli text, content alebo extractedText.'
}
"""
`;
    })
    .join('\n\n----------------------------------------\n\n');
}

function getTotalAttachmentTextLength(attachments: UploadedAttachment[]) {
  return attachments.reduce((total, file) => {
    return total + getAttachmentText(file).length;
  }, 0);
}

function resolveTitle(body: AuditRequest, profile?: SavedProfile | null) {
  return (
    cleanText(body.title) ||
    cleanText(profile?.title) ||
    cleanText(profile?.topic) ||
    'Kontrolovaná akademická práca'
  );
}

function resolveWorkType(body: AuditRequest, profile?: SavedProfile | null) {
  return (
    cleanText(body.workType) ||
    cleanText(profile?.type) ||
    'akademická práca'
  );
}

function resolveLanguage(body: AuditRequest, profile?: SavedProfile | null) {
  return (
    cleanText(body.language) ||
    cleanText(profile?.workLanguage) ||
    cleanText(profile?.language) ||
    'slovenčina'
  );
}

function resolveMaxOutputTokens(body: AuditRequest) {
  const requested = Number(body.maxOutputTokens);

  if (Number.isFinite(requested) && requested >= 2000) {
    return Math.min(Math.round(requested), 6000);
  }

  return 4500;
}

function buildAuditPrompt({
  text,
  attachmentsBlock,
  checkType,
  outputType,
  citationStyle,
  profile,
  hasAttachments,
  title,
  workType,
  language,
  manualTextWasTruncated,
}: {
  text: string;
  attachmentsBlock: string;
  checkType: string;
  outputType: string;
  citationStyle: string;
  profile?: SavedProfile | null;
  hasAttachments: boolean;
  title: string;
  workType: string;
  language: string;
  manualTextWasTruncated: boolean;
}) {
  return `
Si odborný akademický hodnotiteľ, metodológ, školiteľ a odborný korektor.

Tvojou úlohou je vykonať KOMPLETNÝ AUDIT KVALITY AKADEMICKEJ PRÁCE.

KRITICKÉ PRAVIDLÁ:
1. Výstup musí byť dokončený a musí sa skončiť presnou vetou: ${AUDIT_END_MARKER}
2. Nepíš email.
3. Nepíš oslovenie.
4. Nepíš predmet emailu.
5. Nepíš úvod typu "Ako AI audítor".
6. Nepoužívaj markdown značky #, ##, **, --- ani kódové bloky.
7. Nepoužívaj nečitateľné alebo poškodené znaky.
8. Nevymýšľaj konkrétne bibliografické záznamy, autorov, DOI ani URL.
9. Ak treba citácie, odporuč iba typ zdroja: ISO norma, AOAC metóda, odborný článok, učebnica, metodická príručka alebo štandardizovaný laboratórny postup.
10. Buď konkrétny. Nepíš všeobecné frázy.
11. Pri ukážkach prepísaných viet uveď maximálne 5 viet, aby sa výstup neodsekol.
12. Ak ide o chemickú, biologickú, potravinársku alebo laboratórnu metodiku, skontroluj aj odbornú správnosť činidiel, indikátorov, koncentrácií, výpočtov, jednotiek a postupu.
13. Ak text obsahuje odbornú chybu, pomenuj ju priamo a navrhni správne znenie.

PROFIL PRÁCE:
- Názov práce: ${title}
- Téma: ${profile?.topic || 'nezadané'}
- Typ práce: ${workType}
- Úroveň: ${profile?.level || 'nezadané'}
- Odbor: ${profile?.field || 'nezadané'}
- Vedúci práce: ${profile?.supervisor || 'nezadané'}
- Jazyk práce: ${language}
- Citačný štýl: ${citationStyle}
- Cieľ práce: ${profile?.goal || 'nezadané'}
- Metodológia: ${profile?.methodology || 'nezadané'}
- Anotácia: ${profile?.annotation || 'nezadané'}
- Kľúčové slová: ${getProfileKeywords(profile)}

NASTAVENIE AUDITU:
- Typ kontroly: ${checkType}
- Typ výstupu: ${outputType}

ZDROJ TEXTU:
${
  hasAttachments
    ? 'Používateľ vložil text a/alebo nahral prílohy. Pri audite zohľadni ručne vložený text aj obsah príloh.'
    : 'Používateľ vložil text ručne.'
}

TECHNICKÁ INFORMÁCIA:
${
  manualTextWasTruncated
    ? 'Ručne vložený text bol technicky skrátený, aby sa výstup neodsekol. V audite to uveď ako obmedzenie.'
    : 'Ručne vložený text nebol technicky skrátený.'
}

TEXT VLOŽENÝ RUČNE:
"""
${text || 'Text nebol vložený ručne. Audit vykonaj z priložených súborov, ak je ich obsah dostupný.'}
"""

PRÍLOHY NA AUDIT:
${attachmentsBlock}

POVINNÁ ŠTRUKTÚRA VÝSTUPU:

1. Stručné hodnotenie
Zhodnoť celkovú kvalitu textu, akademickú úroveň, odbornú presnosť a použiteľnosť do práce. Uveď 5 až 8 viet.

2. Silné stránky
Uveď konkrétne silné stránky textu.

3. Slabé stránky
Uveď konkrétne slabiny textu.

4. Konkrétne odborné chyby a opravy
Pri každej chybe uveď:
- čo je problém,
- ako to opraviť,
- prečo je oprava dôležitá.

Ak sa v texte nachádza laboratórna metóda, posúď najmä:
- správnosť použitého titrantu,
- indikátor a jeho farebnú zmenu,
- princíp metódy,
- činidlá a koncentrácie,
- prístroje,
- výpočet výsledku,
- prepočet na obsah bielkovín alebo inú sledovanú veličinu,
- potrebu citovať normu alebo štandardizovanú metódu.

5. Logika a štruktúra
Zhodnoť členenie, nadväznosť odsekov, argumentáciu a vnútornú súdržnosť.

6. Metodológia
Zhodnoť, či metodická časť obsahuje dostatočný opis postupu, vzoriek, prístrojov, činidiel, podmienok merania, výpočtov a kontroly kvality.

7. Citácie a zdroje
Zhodnoť, kde treba doplniť citácie. Nevymýšľaj konkrétne bibliografické záznamy.

8. Akademický štýl
Zhodnoť jazyk, formálnosť, odbornosť, terminológiu, štylistiku a zrozumiteľnosť.

9. Ukážky upravených viet
Uveď maximálne 5 vzorových viet. Každú vetu uveď vo forme:
Pôvodný problém:
Lepšia formulácia:

10. Odporúčané doplnenia
Napíš, čo má autor doplniť do práce.

11. Skóre kvality od 0 do 100
Uveď presne tieto riadky:
Logika:
Metodológia:
Citácie:
Akademický štýl:
Odborná presnosť:
Celkové skóre:

12. Priorita opráv
Rozdeľ opravy na:
Urgentné:
Dôležité:
Odporúčané:

13. Technické upozornenie
Ak text obsahoval poškodené znaky, nečitateľné časti, chýbajúci extrahovaný text alebo bol skrátený, uveď to tu. Ak nie, napíš, že technické problémy neboli zistené.

Na úplný koniec napíš presne:
${AUDIT_END_MARKER}
`.trim();
}

function buildSystemMessage() {
  return `
${GLOBAL_ACADEMIC_SYSTEM_PROMPT || ''}

Si prísny, ale konštruktívny akademický školiteľ, metodológ a odborný korektor.
Hodnotíš kvalitu textu, logiku, štruktúru, metodológiu, citácie, odbornú presnosť a akademický štýl.
Výstup musí byť praktický, konkrétny, formálny a použiteľný pre študenta alebo autora práce.
Nepíš email, oslovenie ani marketingový text.
Nevymýšľaj zdroje.
Vždy dokonči odpoveď koncovou značkou ${AUDIT_END_MARKER}.
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Chýba OPENAI_API_KEY v prostredí aplikácie. Nastav ju vo Verceli alebo v .env.local.',
        },
        { status: 500 }
      );
    }

    const body = (await req.json()) as AuditRequest;

    const profile = body.activeProfile || null;

    const rawText = cleanText(body.text);
    const limitedManualText = limitText(rawText, MAX_MANUAL_TEXT_LENGTH);

    const text = limitedManualText.text;
    const checkType = cleanText(body.checkType) || 'Všetko';
    const outputType = cleanText(body.outputType) || 'Detailná správa';

    const title = resolveTitle(body, profile);
    const workType = resolveWorkType(body, profile);
    const language = resolveLanguage(body, profile);

    const citationStyle =
      cleanText(body.citationStyle) ||
      cleanText(profile?.citation) ||
      'ISO 690';

    const attachments = normalizeAttachments(body.attachments);
    const attachmentsBlock = buildAttachmentsBlock(attachments);

    const hasText = text.length >= MIN_TEXT_LENGTH;
    const hasAttachments = attachments.length > 0;
    const extractedAttachmentTextLength = getTotalAttachmentTextLength(attachments);

    if (!hasText && !hasAttachments) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Vlož aspoň 300 znakov textu alebo nahraj prílohu na audit kvality.',
        },
        { status: 400 }
      );
    }

    if (!hasText && hasAttachments && extractedAttachmentTextLength < 50) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Príloha bola nahratá, ale neobsahuje dostupný extrahovaný text. Skontroluj /api/uploads, aby pri PDF/DOCX vracalo text v poli text, content alebo extractedText.',
        },
        { status: 400 }
      );
    }

    const prompt = buildAuditPrompt({
      text,
      attachmentsBlock,
      checkType,
      outputType,
      citationStyle,
      profile,
      hasAttachments,
      title,
      workType,
      language,
      manualTextWasTruncated: limitedManualText.truncated,
    });

    const maxCompletionTokens = resolveMaxOutputTokens(body);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.2,
      max_tokens: maxCompletionTokens,
      presence_penalty: 0,
      frequency_penalty: 0.1,
      messages: [
        {
          role: 'system',
          content: buildSystemMessage(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const rawResult = completion.choices[0]?.message?.content || '';
    const cleanedResult = removeEndMarker(removeBadAuditStart(rawResult));

    if (!cleanedResult.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'AI nevrátila výsledok auditu.',
        },
        { status: 500 }
      );
    }

    const completed = hasEndMarker(rawResult);

    const finalResult = cleanedResult.trim();

    return NextResponse.json({
      ok: true,
      result: finalResult,
      completed,
      warning: completed
        ? ''
        : 'Audit sa pravdepodobne neukončil úplne. Zvýš maxOutputTokens alebo audituj kratší text po kapitolách.',
      meta: {
        checkType,
        outputType,
        citationStyle,
        title,
        workType,
        language,
        textLength: rawText.length,
        usedTextLength: text.length,
        manualTextWasTruncated: limitedManualText.truncated,
        attachmentsCount: attachments.length,
        extractedAttachmentTextLength,
        maxCompletionTokens,
        finishReason: completion.choices[0]?.finish_reason || null,
        completed,
      },
    });
  } catch (error) {
    console.error('AUDIT_ERROR:', error);

    const fallbackMessage =
      error instanceof Error
        ? error.message
        : 'Nepodarilo sa vykonať audit kvality práce.';

    return NextResponse.json(
      {
        ok: false,
        error:
          getZedperaErrorMessage?.(fallbackMessage) ||
          fallbackMessage ||
          'Nepodarilo sa vykonať audit kvality práce.',
      },
      { status: 500 }
    );
  }
}