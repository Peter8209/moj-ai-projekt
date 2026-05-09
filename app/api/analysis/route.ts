import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GLOBAL_ACADEMIC_SYSTEM_PROMPT } from '@/lib/ai-system-prompt';
import { getZedperaErrorMessage } from '@/lib/api-error-messages';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SavedProfile = {
  id?: string;
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
  keywords?: string[];
  keywordsList?: string[];
  savedAt?: string;
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

type AnalysisRequest = {
  analysisGoal?: string;
  hypotheses?: string;
  methodology?: string;
  dataDescription?: string;
  analysisType?: string;
  software?: string;
  outputStyle?: string;
  activeProfile?: SavedProfile | null;
  attachments?: UploadedAttachment[];
};

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

function normalizeAttachments(value: unknown): UploadedAttachment[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item) => item && typeof item === 'object') as UploadedAttachment[];
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

function getAttachmentName(file: UploadedAttachment, index: number) {
  return (
    file.name ||
    file.filename ||
    file.originalName ||
    `vysledky-${index + 1}`
  );
}

function formatAttachmentsBlock(attachments: UploadedAttachment[]) {
  if (!attachments.length) {
    return 'Neboli priložené žiadne súbory.';
  }

  return attachments
    .map((file, index) => {
      const text = getAttachmentText(file);

      return `
SÚBOR ${index + 1}
Názov: ${getAttachmentName(file, index)}
Typ: ${file.type || file.mimeType || file.extension || 'nezadané'}
Veľkosť: ${file.size || 'nezadané'}
URL / cesta: ${file.url || file.path || 'nezadané'}

EXTRAHOVANÝ OBSAH:
"""
${
  text ||
  'Text zo súboru nebol dostupný. Skontroluj /api/uploads, aby pri DOCX/XLSX/PDF vracalo pole text, content alebo extractedText.'
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

function getKeywords(profile?: SavedProfile | null) {
  if (!profile) return 'nezadané';

  if (Array.isArray(profile.keywords) && profile.keywords.length > 0) {
    return profile.keywords.join(', ');
  }

  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length > 0) {
    return profile.keywordsList.join(', ');
  }

  return 'nezadané';
}

function buildPrompt({
  analysisGoal,
  hypotheses,
  methodology,
  dataDescription,
  analysisType,
  software,
  outputStyle,
  activeProfile,
  attachmentsBlock,
}: {
  analysisGoal: string;
  hypotheses: string;
  methodology: string;
  dataDescription: string;
  analysisType: string;
  software: string;
  outputStyle: string;
  activeProfile?: SavedProfile | null;
  attachmentsBlock: string;
}) {
  return `
Si odborník na štatistickú analýzu dát, metodológiu výskumu a písanie analytickej časti záverečných prác.

Tvojou úlohou je spracovať výsledky zo štatistického softvéru a pripraviť použiteľný výstup do akademickej práce.

JAZYK ODPOVEDE:
Slovenčina.

PROFIL PRÁCE:
- Názov práce: ${activeProfile?.title || 'nezadané'}
- Téma: ${activeProfile?.topic || 'nezadané'}
- Typ práce: ${activeProfile?.type || 'akademická práca'}
- Odbor: ${activeProfile?.field || 'nezadané'}
- Cieľ práce z profilu: ${activeProfile?.goal || 'nezadané'}
- Hypotézy z profilu: ${activeProfile?.hypotheses || 'nezadané'}
- Výskumné otázky z profilu: ${activeProfile?.researchQuestions || 'nezadané'}
- Metodológia z profilu: ${activeProfile?.methodology || 'nezadané'}
- Kľúčové slová: ${getKeywords(activeProfile)}

NASTAVENIE ANALÝZY:
- Softvér / zdroj výsledkov: ${software}
- Typ analýzy: ${analysisType}
- Typ výstupu: ${outputStyle}

CIEĽ PRÁCE / CIEĽ ANALYTICKEJ ČASTI:
"""
${analysisGoal || activeProfile?.goal || 'nezadané'}
"""

HYPOTÉZY / VÝSKUMNÉ OTÁZKY:
"""
${hypotheses || activeProfile?.hypotheses || activeProfile?.researchQuestions || 'nezadané'}
"""

METODIKA / OPIS PREMENNÝCH:
"""
${methodology || activeProfile?.methodology || 'nezadané'}
"""

DOPLNKOVÝ OPIS DÁT:
"""
${dataDescription || 'nezadané'}
"""

PRILOŽENÉ VÝSLEDKY:
${attachmentsBlock}

DÔLEŽITÉ METODICKÉ POKYNY:
- Nevyberaj všetky výpočty automaticky.
- Vyber iba výpočty, ktoré sú vhodné podľa cieľa práce, hypotéz a typu premenných.
- Pri demografických kategóriách použi frekvenčnú analýzu.
- Pri veku alebo iných číselných premenných použi primerané deskriptívne ukazovatele: priemer, medián, smerodajnú odchýlku, minimum a maximum.
- Pri dotazníkových položkách neprepisuj mechanicky všetky položky, ak nie sú podstatné.
- Pri dotazníkoch odporúčaj používať najmä celkové skóre a subškály.
- Pri normalite vysvetli, čo znamená Shapiro-Wilk a p-hodnota.
- Pri ordinálnych škálach buď opatrný s priemerom a odporúčaj medián/frekvencie, ak je to vhodnejšie.
- Rozlišuj Percent a Valid Percent. Ak sú v dátach veľké počty chýbajúcich hodnôt, upozorni, že interpretovať treba Valid Percent.
- Ak je cieľom opis výskumného súboru, zameraj sa na frekvencie a percentá.
- Ak je cieľom opis dotazníkov, zameraj sa na škálové skóre, priemer, SD, prípadne medián.
- Ak sú hypotézy korelačné, odporuč vhodný korelačný test podľa normality.
- Ak sú hypotézy rozdielové, odporuč vhodný test podľa počtu skupín, typu premennej a normality.
- Ak nie je možné niečo rozhodnúť bez pôvodných dát, jasne to uveď.

Vráť odpoveď presne v tomto formáte:

=== VÝBER VÝPOČTOV DO PRÁCE ===
Napíš, ktoré výpočty majú ísť do analytickej časti a ktoré nie.

=== OPIS VÝSKUMNÉHO SÚBORU ===
Priprav text vhodný do práce. Použi frekvencie, validné percentá a vek, ak sú dostupné.

=== OPIS DOTAZNÍKOV / ŠKÁL ===
Priprav text k deskriptívnej štatistike dotazníkov, celkových skóre a subškál.

=== NORMALITA A VOĽBA TESTOV ===
Vysvetli normalitu a odporuč, či voliť parametrické alebo neparametrické testy.

=== ODPORÚČANÉ TESTY PODĽA HYPOTÉZ ===
Ku každej hypotéze alebo výskumnej otázke odporuč vhodný test.

=== TABUĽKY VHODNÉ DO PRÁCE ===
Navrhni, aké tabuľky majú byť v práci.

=== TEXT DO ANALYTICKEJ ČASTI ===
Napíš súvislý akademický text, ktorý možno vložiť do záverečnej práce.

=== ČO NEUVÁDZAŤ DO PRÁCE ===
Vypíš výsledky, ktoré sú nadbytočné alebo metodicky nevhodné.

=== KONTROLNÝ CHECKLIST ===
Vypíš, čo ešte treba skontrolovať pred finálnym spracovaním analytickej časti.
`;
}

function extractSection(text: string, section: string) {
  const marker = `=== ${section} ===`;
  const start = text.indexOf(marker);

  if (start === -1) return '';

  const rest = text.slice(start + marker.length);
  const next = rest.search(/\n=== .+? ===/);

  if (next === -1) return rest.trim();

  return rest.slice(0, next).trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalysisRequest;

    const analysisGoal = cleanText(body.analysisGoal);
    const hypotheses = cleanText(body.hypotheses);
    const methodology = cleanText(body.methodology);
    const dataDescription = cleanText(body.dataDescription);
    const analysisType =
      cleanText(body.analysisType) || 'Výber výpočtov pre analytickú časť';
    const software = cleanText(body.software) || 'JASP';
    const outputStyle =
      cleanText(body.outputStyle) || 'Text do záverečnej práce';

    const activeProfile = body.activeProfile || null;

    const attachments = normalizeAttachments(body.attachments);
    const attachmentsBlock = formatAttachmentsBlock(attachments);
    const extractedAttachmentTextLength =
      getTotalAttachmentTextLength(attachments);

    const hasAnyInput =
      dataDescription.length >= 30 ||
      extractedAttachmentTextLength >= 50;

    if (!hasAnyInput) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Chýbajú dáta na analýzu. Nahraj súbor s výsledkami alebo vlož opis dát aspoň v rozsahu 30 znakov.',
        },
        { status: 400 },
      );
    }

    if (!analysisGoal && !activeProfile?.goal) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Chýba cieľ práce. Bez cieľa práce nie je možné správne vybrať výpočty do analytickej časti.',
        },
        { status: 400 },
      );
    }

    const prompt = buildPrompt({
      analysisGoal,
      hypotheses,
      methodology,
      dataDescription,
      analysisType,
      software,
      outputStyle,
      activeProfile,
      attachmentsBlock,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Si metodológ, štatistik a akademický konzultant. Pomáhaš vyberať správne štatistické výpočty a píšeš interpretácie výsledkov do záverečných prác.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '';

    if (!raw.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'AI nevrátila výsledok analýzy.',
        },
        { status: 500 },
      );
    }

    const selectedCalculations = [
      extractSection(raw, 'VÝBER VÝPOČTOV DO PRÁCE'),
      extractSection(raw, 'ODPORÚČANÉ TESTY PODĽA HYPOTÉZ'),
      extractSection(raw, 'TABUĽKY VHODNÉ DO PRÁCE'),
    ]
      .filter(Boolean)
      .join('\n\n');

    const interpretation = [
      extractSection(raw, 'OPIS VÝSKUMNÉHO SÚBORU'),
      extractSection(raw, 'OPIS DOTAZNÍKOV / ŠKÁL'),
      extractSection(raw, 'NORMALITA A VOĽBA TESTOV'),
    ]
      .filter(Boolean)
      .join('\n\n');

    const result =
      extractSection(raw, 'TEXT DO ANALYTICKEJ ČASTI') || raw;

    return NextResponse.json({
      ok: true,
      result,
      selectedCalculations,
      interpretation,
      fullResult: raw,
      meta: {
        software,
        analysisType,
        outputStyle,
        attachmentsCount: attachments.length,
        extractedAttachmentTextLength,
      },
    });
  } catch (error) {
    console.error('ANALYSIS_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa vykonať analýzu dát.',
      },
      { status: 500 },
    );
  }
}