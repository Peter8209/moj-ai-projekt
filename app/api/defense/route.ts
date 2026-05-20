import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_DEFENSE_MODEL || 'gpt-4.1-mini';

const MAX_TEXT_CHARS_PER_FILE = 120_000;
const MAX_TOTAL_ATTACHMENT_CHARS = 350_000;
const LARGE_FILE_LIMIT_BYTES = 8 * 1024 * 1024;

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
  sourcesRequirement?: string;
  keywords?: string[];
  keywordsList?: string[];
};

type DefenseSlide = {
  title: string;
  bullets: string[];
  speakerNotes?: string;
};

type ReviewFileInfo = {
  name: string;
  size: number;
  type: string;
  text: string;
  compressed: boolean;
  extractionAvailable: boolean;
  warning?: string;
};

type DefenseResponse = {
  ok: boolean;
  slides?: DefenseSlide[];
  textOutput?: string;
  reviewsCount?: number;
  reviews?: Array<{
    name: string;
    size: number;
    type: string;
    compressed: boolean;
    extractionAvailable: boolean;
    warning?: string;
  }>;
  allowedExports?: Array<'docx' | 'pptx' | 'pdf'>;
  disallowedExports?: Array<'xlsx'>;
  warning?: string;
  error?: string;
};

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function cleanInvisibleCharacters(value: string) {
  return value
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function stripMarkdownFences(value: string) {
  return value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function cleanClientVisibleText(value: string) {
  return cleanInvisibleCharacters(value)
    .replace(/\bprimárny zdroj\b/gi, '')
    .replace(/\bsekundárny zdroj\b/gi, '')
    .replace(/\binterný zdroj\b/gi, '')
    .replace(/\banalyzovaný zdroj\b/gi, '')
    .replace(/\bpodľa nahratého súboru\b/gi, '')
    .replace(/\bpodľa prílohy\b/gi, '')
    .replace(/\bpoužívateľ nahral súbor\b/gi, '')
    .replace(/\bdokument obsahuje\b/gi, '')
    .replace(/\bAI vedúci\b/gi, '')
    .replace(/\bsystémová poznámka\b/gi, '')
    .replace(/\btechnická poznámka\b/gi, '')
    .replace(/\bprompt\b/gi, '')
    .replace(/\bmodel\b/gi, '')
    .replace(/\bOpenAI\b/gi, '')
    .replace(/\bZEDPERA\b/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanBullet(value: string) {
  return cleanClientVisibleText(value)
    .replace(/^[-•–—]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim();
}

function normalizeSlide(slide: unknown): DefenseSlide | null {
  if (!slide || typeof slide !== 'object') return null;

  const raw = slide as Record<string, unknown>;

  const title = cleanClientVisibleText(String(raw.title || ''));

  if (!title) return null;

  const bulletsRaw = Array.isArray(raw.bullets) ? raw.bullets : [];

  const bullets = bulletsRaw
    .map((item) => cleanBullet(String(item || '')))
    .filter(Boolean)
    .slice(0, 6);

  if (bullets.length === 0) return null;

  return {
    title,
    bullets,
    speakerNotes: cleanClientVisibleText(String(raw.speakerNotes || '')),
  };
}

function normalizeSlides(value: unknown): DefenseSlide[] {
  if (!value || typeof value !== 'object') return [];

  const raw = value as Record<string, unknown>;
  const rawSlides = Array.isArray(raw.slides) ? raw.slides : [];

  return rawSlides
    .map((slide) => normalizeSlide(slide))
    .filter((slide): slide is DefenseSlide => Boolean(slide))
    .slice(0, 14);
}

function getProfileKeywords(profile: SavedProfile | null) {
  if (!profile) return 'nezadané';

  if (Array.isArray(profile.keywords) && profile.keywords.length > 0) {
    return profile.keywords.filter(Boolean).join(', ');
  }

  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length > 0) {
    return profile.keywordsList.filter(Boolean).join(', ');
  }

  return 'nezadané';
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function truncateText(value: string, maxChars: number) {
  const clean = cleanInvisibleCharacters(value);

  if (clean.length <= maxChars) {
    return {
      text: clean,
      truncated: false,
    };
  }

  return {
    text:
      clean.slice(0, maxChars) +
      '\n\n[Text bol technicky skrátený kvôli veľkosti prílohy. Do obhajoby použi iba vecný obsah, nie túto poznámku.]',
    truncated: true,
  };
}

function isTextLikeFile(fileName: string, fileType: string) {
  const lowerName = fileName.toLowerCase();
  const lowerType = fileType.toLowerCase();

  return (
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.rtf') ||
    lowerName.endsWith('.json') ||
    lowerType.startsWith('text/') ||
    lowerType.includes('csv') ||
    lowerType.includes('json')
  );
}

async function extractTextFromUploadedFile(file: File): Promise<ReviewFileInfo> {
  const name = file.name || 'bez-nazvu';
  const type = file.type || 'application/octet-stream';
  const size = file.size || 0;
  const compressed = size > LARGE_FILE_LIMIT_BYTES;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isTextLikeFile(name, type)) {
      const decoded = buffer.toString('utf-8');
      const truncated = truncateText(decoded, MAX_TEXT_CHARS_PER_FILE);

      return {
        name,
        size,
        type,
        text: truncated.text,
        compressed: compressed || truncated.truncated,
        extractionAvailable: true,
        warning: truncated.truncated
          ? 'Text prílohy bol skrátený kvôli veľkosti.'
          : undefined,
      };
    }

    return {
      name,
      size,
      type,
      text: [
        `Príloha bola prijatá.`,
        `Názov: ${name}`,
        `Typ: ${type}`,
        `Veľkosť: ${formatFileSize(size)}`,
        `Text z tohto typu súboru nebol v tejto API route priamo extrahovaný.`,
      ].join('\n'),
      compressed,
      extractionAvailable: false,
      warning:
        'Text z tejto prílohy nebol automaticky extrahovaný. Ak ide o PDF/DOCX, odporúčané je posielať aj clientExtractedText alebo zapojiť serverovú extrakciu.',
    };
  } catch {
    return {
      name,
      size,
      type,
      text: [
        `Príloha bola prijatá, ale nepodarilo sa ju prečítať.`,
        `Názov: ${name}`,
        `Typ: ${type}`,
        `Veľkosť: ${formatFileSize(size)}`,
      ].join('\n'),
      compressed,
      extractionAvailable: false,
      warning: 'Súbor sa nepodarilo prečítať.',
    };
  }
}

function buildReviewsPromptBlock(reviewFiles: ReviewFileInfo[]) {
  if (!reviewFiles.length) {
    return 'Neboli priložené žiadne posudky ani podklady.';
  }

  let usedChars = 0;

  return reviewFiles
    .map((file, index) => {
      const remainingChars = Math.max(MAX_TOTAL_ATTACHMENT_CHARS - usedChars, 0);
      const allowedChars = Math.min(MAX_TEXT_CHARS_PER_FILE, remainingChars);
      const truncated = truncateText(file.text, allowedChars || 2_000);

      usedChars += truncated.text.length;

      return `
PODKLAD ${index + 1}
Názov súboru: ${file.name}
Typ: ${file.type || 'nezadané'}
Veľkosť: ${formatFileSize(file.size)}
Technické skrátenie: ${file.compressed || truncated.truncated ? 'áno' : 'nie'}
Textová extrakcia dostupná: ${file.extractionAvailable ? 'áno' : 'nie'}

OBSAH PODKLADU:
${truncated.text || 'Bez dostupného textu.'}
`;
    })
    .join('\n\n-----------------------------\n\n');
}

function buildProfilePromptBlock(profile: SavedProfile | null, defenseType: string) {
  return `
- Názov práce z profilu: ${profile?.title || 'nezadané'}
- Téma: ${profile?.topic || 'nezadané'}
- Typ práce: ${profile?.type || defenseType}
- Úroveň práce: ${profile?.level || 'nezadané'}
- Odbor: ${profile?.field || 'nezadané'}
- Vedúci práce: ${profile?.supervisor || 'nezadané'}
- Jazyk rozhrania: ${profile?.language || 'slovenčina'}
- Jazyk práce: ${profile?.workLanguage || profile?.language || 'slovenčina'}
- Citačná norma: ${profile?.citation || 'nezadané'}
- Anotácia: ${profile?.annotation || 'nezadané'}
- Cieľ práce: ${profile?.goal || 'nezadané'}
- Výskumný problém: ${profile?.problem || 'nezadané'}
- Metodológia: ${profile?.methodology || 'nezadané'}
- Hypotézy: ${profile?.hypotheses || 'nezadané'}
- Výskumné otázky: ${profile?.researchQuestions || 'nezadané'}
- Praktická časť: ${profile?.practicalPart || 'nezadané'}
- Odborný alebo vedecký prínos: ${profile?.scientificContribution || 'nezadané'}
- Požiadavky na zdroje: ${profile?.sourcesRequirement || 'nezadané'}
- Kľúčové slová: ${getProfileKeywords(profile)}
`.trim();
}

function buildFallbackSlides({
  title,
  defenseType,
  profile,
  reviewFilesCount,
}: {
  title: string;
  defenseType: string;
  profile: SavedProfile | null;
  reviewFilesCount: number;
}): DefenseSlide[] {
  return [
    {
      title: title || 'Obhajoba záverečnej práce',
      bullets: [
        `${profile?.type || defenseType} obhajoba`,
        profile?.field || 'Odbor práce',
        profile?.supervisor ? `Vedúci práce: ${profile.supervisor}` : 'Predstavenie témy a zamerania práce',
      ].filter(Boolean),
      speakerNotes:
        'Na úvod stručne predstavte názov práce, odbor, typ práce a dôvod, prečo je téma dôležitá.',
    },
    {
      title: 'Cieľ práce',
      bullets: [
        profile?.goal || 'Predstavenie hlavného cieľa práce',
        profile?.problem || 'Vysvetlenie riešeného problému',
        'Prepojenie cieľa s témou a použitou metodológiou',
      ].filter(Boolean),
      speakerNotes:
        'Vysvetlite hlavný zámer práce a ukážte, ako cieľ súvisí s riešeným problémom.',
    },
    {
      title: 'Metodologický postup',
      bullets: [
        profile?.methodology || 'Charakteristika použitého metodologického postupu',
        'Vysvetlenie spôsobu spracovania témy',
        'Zdôvodnenie zvoleného postupu',
      ].filter(Boolean),
      speakerNotes:
        'Popíšte, ako bola práca spracovaná a prečo bol zvolený daný metodologický postup.',
    },
    {
      title: 'Hlavné zistenia a prínos',
      bullets: [
        'Zhrnutie najdôležitejších výsledkov práce',
        profile?.scientificContribution || 'Vysvetlenie odborného alebo praktického prínosu',
        'Prepojenie výsledkov s cieľom práce',
      ].filter(Boolean),
      speakerNotes:
        'Zdôraznite, čo je najdôležitejším výsledkom práce a v čom spočíva jej prínos.',
    },
    {
      title: 'Reakcia na otázky a pripomienky',
      bullets:
        reviewFilesCount > 0
          ? [
              `Počet priložených podkladov: ${reviewFilesCount}`,
              'Pripomienky sú pripravené na vecnú ústnu reakciu',
              'Odpovede je potrebné formulovať pokojne, odborne a konkrétne',
            ]
          : [
              'Podklady s otázkami neboli priložené',
              'Reakcie je potrebné doplniť podľa konkrétnych otázok komisie',
              'Odpovede majú byť vecné, stručné a opreté o obsah práce',
            ],
      speakerNotes:
        'Pri otázkach komisie odpovedajte priamo, bez obhajovania sa, s dôrazom na odborné zdôvodnenie.',
    },
    {
      title: 'Záver obhajoby',
      bullets: [
        'Zhrnutie cieľa a výsledkov práce',
        'Vyzdvihnutie hlavného prínosu práce',
        'Poďakovanie komisii za pozornosť',
      ],
      speakerNotes:
        'Ukončite obhajobu stručne a sebavedomo. Následne vytvorte priestor na otázky komisie.',
    },
  ].map((slide) => normalizeSlide(slide)).filter((slide): slide is DefenseSlide => Boolean(slide));
}

function buildPlainTextOutput(slides: DefenseSlide[]) {
  return slides
    .map((slide, index) => {
      const bullets = slide.bullets.map((bullet) => `- ${bullet}`).join('\n');

      return [
        `${index + 1}. ${slide.title}`,
        bullets,
        slide.speakerNotes ? `Poznámky k vystúpeniu: ${slide.speakerNotes}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

function buildSystemPrompt() {
  return `
Si odborný akademický asistent pre prípravu obhajoby záverečnej práce.

Tvojou úlohou je vytvoriť čistý výstup pre klienta:
- prezentáciu na obhajobu,
- stručné body do slidov,
- poznámky pre ústne vystúpenie,
- reakcie na otázky a pripomienky komisie.

Musíš vychádzať z:
- aktuálneho profilu práce,
- názvu práce,
- stručného obsahu práce,
- priložených podkladov,
- cieľa, metodológie, hypotéz, výskumných otázok a prínosu práce.

Zakázané výrazy vo výstupe:
- primárny zdroj,
- sekundárny zdroj,
- interný zdroj,
- analyzovaný zdroj,
- podľa nahratého súboru,
- podľa prílohy,
- používateľ nahral súbor,
- dokument obsahuje,
- AI vedúci,
- systémová poznámka,
- technická poznámka,
- prompt,
- model,
- OpenAI,
- ZEDPERA.

Výstup musí byť čistý, profesionálny a vhodný na export do Wordu, PPTX a PDF.
Nepíš interné komentáre.
Nepíš technické vysvetlenia.
Nepíš, z ktorého zdroja si čerpal.
Obsah z dokumentov zapracuj prirodzene do textu.
Excel sa pri obhajobe nepoužíva.

Vráť iba platný JSON.
`.trim();
}

function buildUserPrompt({
  title,
  summary,
  defenseType,
  profile,
  reviewsBlock,
}: {
  title: string;
  summary: string;
  defenseType: string;
  profile: SavedProfile | null;
  reviewsBlock: string;
}) {
  return `
Vytvor profesionálnu prezentáciu na obhajobu záverečnej práce.

JAZYK VÝSTUPU:
${profile?.workLanguage || profile?.language || 'slovenčina'}

NÁZOV PRÁCE:
${title}

TYP OBHAJOBY:
${defenseType}

AKTUÁLNY PROFIL PRÁCE:
${buildProfilePromptBlock(profile, defenseType)}

STRUČNÝ OBSAH PRÁCE:
${summary}

PRILOŽENÉ PODKLADY:
${reviewsBlock}

HLAVNÁ ÚLOHA:
Vytvor prezentáciu na obhajobu, ktorá bude použiteľná pred komisiou.

POŽIADAVKY:
- vytvor 10 až 12 slidov,
- každý slide musí mať jasný názov,
- každý slide musí mať 3 až 5 stručných bodov,
- ku každému slidu doplň speakerNotes,
- prezentácia má byť akademická, vecná a obhájiteľná,
- nepíš všeobecné frázy bez obsahu,
- zachovaj logiku obhajoby: úvod, dôvod výberu témy, cieľ, problém, metodológia, výsledky, prínos, limity, otázky, odpovede a záver,
- ak sú dostupné otázky alebo pripomienky, priprav konkrétne odpovede,
- ak nie sú dostupné konkrétne otázky, priprav univerzálne otázky komisie podľa profilu práce.

DÔLEŽITÉ:
Vo výstupe nesmie byť uvedené "primárny zdroj" ani "sekundárny zdroj".
Vo výstupe nesmie byť uvedené, že text pochádza z prílohy alebo nahratého dokumentu.
Výstup má byť čistý, ako keby bol priamo pripravený pre klienta.

VRÁŤ IBA JSON BEZ MARKDOWNU.

Presný formát:
{
  "slides": [
    {
      "title": "Názov slidu",
      "bullets": ["bod 1", "bod 2", "bod 3"],
      "speakerNotes": "Krátke poznámky k tomu, čo má študent povedať."
    }
  ]
}
`.trim();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Nepodarilo sa vygenerovať prezentáciu na obhajobu.';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const title = cleanClientVisibleText(String(formData.get('title') || ''));

    const summary = cleanClientVisibleText(
      String(
        formData.get('summary') ||
          formData.get('text') ||
          formData.get('content') ||
          '',
      ),
    );

    const defenseType = cleanClientVisibleText(
      String(formData.get('defenseType') || 'Bakalárska'),
    );

    const activeProfileRaw = String(
      formData.get('activeProfile') ||
        formData.get('profile') ||
        formData.get('savedProfile') ||
        'null',
    );

    const profile = safeJsonParse<SavedProfile | null>(activeProfileRaw, null);

    const uploadedReviewFiles = [
      ...formData.getAll('reviews'),
      ...formData.getAll('files'),
      ...formData.getAll('attachments'),
    ].filter((item): item is File => item instanceof File);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json<DefenseResponse>(
        {
          ok: false,
          error: 'Chýba OPENAI_API_KEY v .env.local.',
        },
        { status: 500 },
      );
    }

    if (!title && !profile?.title) {
      return NextResponse.json<DefenseResponse>(
        {
          ok: false,
          error: 'Chýba názov práce.',
        },
        { status: 400 },
      );
    }

    if (!summary || summary.length < 80) {
      return NextResponse.json<DefenseResponse>(
        {
          ok: false,
          error:
            'Stručný obsah práce je príliš krátky. Vlož aspoň 80 znakov alebo pošli extrahovaný text práce.',
        },
        { status: 400 },
      );
    }

    const finalTitle = title || cleanClientVisibleText(profile?.title || '');

    const reviewFiles: ReviewFileInfo[] = [];

    for (const file of uploadedReviewFiles) {
      const extracted = await extractTextFromUploadedFile(file);
      reviewFiles.push(extracted);
    }

    const clientExtractedText = cleanClientVisibleText(
      String(
        formData.get('clientExtractedText') ||
          formData.get('attachmentTexts') ||
          '',
      ),
    );

    if (clientExtractedText) {
      const truncated = truncateText(clientExtractedText, MAX_TOTAL_ATTACHMENT_CHARS);

      reviewFiles.unshift({
        name: 'Extrahovaný text z klienta',
        size: Buffer.byteLength(clientExtractedText, 'utf-8'),
        type: 'text/plain',
        text: truncated.text,
        compressed: truncated.truncated,
        extractionAvailable: true,
        warning: truncated.truncated
          ? 'Extrahovaný text z klienta bol skrátený kvôli veľkosti.'
          : undefined,
      });
    }

    const reviewsBlock = buildReviewsPromptBlock(reviewFiles);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(),
        },
        {
          role: 'user',
          content: buildUserPrompt({
            title: finalTitle,
            summary,
            defenseType,
            profile,
            reviewsBlock,
          }),
        },
      ],
    });

    const raw = stripMarkdownFences(completion.choices[0]?.message?.content || '{}');

    let parsed: unknown = {};

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    let slides = normalizeSlides(parsed);

    let warning: string | undefined;

    if (!slides.length) {
      slides = buildFallbackSlides({
        title: finalTitle,
        defenseType,
        profile,
        reviewFilesCount: reviewFiles.length,
      });

      warning =
        'AI nevrátila platné slidy vo formáte JSON. Bol použitý náhradný základ prezentácie.';
    }

    const textOutput = buildPlainTextOutput(slides);

    return NextResponse.json<DefenseResponse>({
      ok: true,
      slides,
      textOutput,
      reviewsCount: reviewFiles.length,
      reviews: reviewFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        compressed: file.compressed,
        extractionAvailable: file.extractionAvailable,
        warning: file.warning,
      })),
      allowedExports: ['docx', 'pptx', 'pdf'],
      disallowedExports: ['xlsx'],
      warning,
    });
  } catch (error) {
    console.error('DEFENSE_GENERATE_ERROR:', error);

    return NextResponse.json<DefenseResponse>(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}