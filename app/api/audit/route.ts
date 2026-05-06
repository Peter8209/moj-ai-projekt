import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
};

function getProfileKeywords(profile?: SavedProfile | null) {
  if (!profile) return 'nezadané';

  if (Array.isArray(profile.keywords) && profile.keywords.length > 0) {
    return profile.keywords.join(', ');
  }

  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length > 0) {
    return profile.keywordsList.join(', ');
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

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function getAttachmentName(file: UploadedAttachment, index: number) {
  return (
    file.name ||
    file.filename ||
    file.originalName ||
    `priloha-${index + 1}`
  );
}

function getAttachmentType(file: UploadedAttachment) {
  return file.type || file.mimeType || file.extension || 'nezadané';
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

  return attachments
    .map((file, index) => {
      const name = getAttachmentName(file, index);
      const type = getAttachmentType(file);
      const size = formatFileSize(file.size);
      const fileText = getAttachmentText(file);

      return `
PRÍLOHA ${index + 1}
Názov súboru: ${name}
Typ súboru: ${type}
Veľkosť: ${size}
URL / cesta: ${file.url || file.path || 'nezadané'}

OBSAH PRÍLOHY:
"""
${
  fileText ||
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

function buildAuditPrompt({
  text,
  attachmentsBlock,
  checkType,
  outputType,
  citationStyle,
  profile,
  hasAttachments,
}: {
  text: string;
  attachmentsBlock: string;
  checkType: string;
  outputType: string;
  citationStyle: string;
  profile?: SavedProfile | null;
  hasAttachments: boolean;
}) {
  return `
Si odborný akademický hodnotiteľ, metodológ a prísny vedúci záverečnej práce.

Tvojou úlohou je vykonať AUDIT KVALITY AKADEMICKEJ PRÁCE.

PROFIL PRÁCE:
- Názov práce: ${profile?.title || 'nezadané'}
- Téma: ${profile?.topic || 'nezadané'}
- Typ práce: ${profile?.type || 'akademická práca'}
- Úroveň: ${profile?.level || 'nezadané'}
- Odbor: ${profile?.field || 'nezadané'}
- Vedúci práce: ${profile?.supervisor || 'nezadané'}
- Jazyk práce: ${profile?.workLanguage || profile?.language || 'slovenčina'}
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

TEXT VLOŽENÝ RUČNE:
"""
${text || 'Text nebol vložený ručne. Audit vykonaj z priložených súborov, ak je ich obsah dostupný.'}
"""

PRÍLOHY NA AUDIT:
${attachmentsBlock}

DÔLEŽITÉ POKYNY:
- Hodnoť kvalitu akademického textu, nie autora.
- Buď prísny, ale konštruktívny.
- Nepíš všeobecné frázy.
- Uvádzaj konkrétne problémy.
- Uvádzaj konkrétne odporúčania.
- Ak pracuješ s prílohou a jej text nebol dostupný, jasne napíš, že text z prílohy nebol extrahovaný a audit je obmedzený.
- Ak je k dispozícii obsah prílohy, audituj ho rovnako ako ručne vložený text.
- Ak je zvolený typ kontroly iný než „Všetko“, zameraj sa hlavne na túto oblasť, ale stručne spomeň aj ostatné riziká.
- Citačné odporúčania prispôsob norme ${citationStyle}.

Vráť odpoveď v tomto formáte:

=== CELKOVÉ HODNOTENIE ===
Skóre 0–100:
Krátke zdôvodnenie:

=== LOGIKA A NADVÄZNOSŤ ===
Skóre 0–100:
Silné stránky:
Slabé miesta:
Čo opraviť:

=== ARGUMENTÁCIA ===
Skóre 0–100:
Problémy:
Odporúčania:

=== ŠTRUKTÚRA TEXTU ===
Skóre 0–100:
Vyhodnoť členenie, nadväznosť odsekov a akademickú organizáciu textu.

=== METODOLÓGIA ===
Skóre 0–100:
Vyhodnoť, či text zodpovedá cieľu a metodológii práce.

=== AKADEMICKÝ ŠTÝL ===
Skóre 0–100:
Vyhodnoť formálnosť, odbornosť, štylistiku a jazyk.

=== CITÁCIE A ZDROJE ===
Skóre 0–100:
Vyhodnoť prácu so zdrojmi podľa normy ${citationStyle}.

=== RIZIKOVÉ PASÁŽE ===
Vypíš konkrétne pasáže alebo typy viet, ktoré pôsobia slabo, všeobecne, neodborne alebo genericky.

=== KONKRÉTNE ODPORÚČANIA NA OPRAVU ===
Vypíš presné kroky, čo má autor doplniť, prepísať alebo rozšíriť.

=== UKÁŽKA LEPŠIEHO PREPISU ===
Ukáž, ako by sa dala slabšia časť textu prepísať akademickejšie.

=== PRIORITNÝ CHECKLIST PRED ODOVZDANÍM ===
Vytvor praktický checklist najdôležitejších úprav.

=== ZÁVER ===
Napíš, či je text vhodný na odovzdanie, alebo potrebuje úpravy.
`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AuditRequest;

    const text = cleanText(body.text);
    const checkType = cleanText(body.checkType) || 'Všetko';
    const outputType = cleanText(body.outputType) || 'Detailná správa';

    const profile = body.activeProfile || null;

    const citationStyle =
      cleanText(body.citationStyle) ||
      profile?.citation ||
      'ISO 690';

    const attachments = normalizeAttachments(body.attachments);
    const attachmentsBlock = buildAttachmentsBlock(attachments);

    const hasText = text.length >= 300;
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
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.25,
      messages: [
        {
          role: 'system',
          content:
            'Si prísny, ale konštruktívny akademický školiteľ a metodológ. Hodnotíš kvalitu textu, logiku, štruktúru, metodológiu, citácie a akademický štýl.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const result = completion.choices[0]?.message?.content || '';

    if (!result.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'AI nevrátila výsledok auditu.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      result,
      meta: {
        checkType,
        outputType,
        citationStyle,
        textLength: text.length,
        attachmentsCount: attachments.length,
        extractedAttachmentTextLength,
      },
    });
  } catch (error) {
    console.error('AUDIT_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa vykonať audit kvality práce.',
      },
      { status: 500 }
    );
  }
}