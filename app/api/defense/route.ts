import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SavedProfile = {
  title?: string;
  topic?: string;
  type?: string;
  level?: string;
  field?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  methodology?: string;
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
};

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeSlide(slide: any): DefenseSlide | null {
  if (!slide || typeof slide !== 'object') return null;

  const title = String(slide.title || '').trim();

  if (!title) return null;

  const bulletsRaw = Array.isArray(slide.bullets) ? slide.bullets : [];

  const bullets = bulletsRaw
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 6);

  if (bullets.length === 0) return null;

  return {
    title,
    bullets,
    speakerNotes: String(slide.speakerNotes || '').trim(),
  };
}

function normalizeSlides(value: any): DefenseSlide[] {
  const rawSlides = Array.isArray(value?.slides) ? value.slides : [];

  return rawSlides
    .map((slide: any) => normalizeSlide(slide))
    .filter(Boolean) as DefenseSlide[];
}

function getProfileKeywords(profile: SavedProfile | null) {
  if (!profile) return 'nezadané';

  if (Array.isArray(profile.keywords) && profile.keywords.length > 0) {
    return profile.keywords.join(', ');
  }

  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length > 0) {
    return profile.keywordsList.join(', ');
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

async function extractTextFromUploadedFile(file: File): Promise<ReviewFileInfo> {
  const name = file.name || 'bez-nazvu';
  const type = file.type || 'application/octet-stream';
  const size = file.size || 0;

  const lowerName = name.toLowerCase();

  let text = '';

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.rtf')
    ) {
      text = buffer.toString('utf-8');
    } else {
      text = [
        `Súbor bol priložený, ale text sa z neho v tejto verzii API ešte automaticky neextrahuje.`,
        `Názov súboru: ${name}`,
        `Typ súboru: ${type}`,
        `Veľkosť: ${formatFileSize(size)}`,
        `Ak ide o PDF alebo DOCX posudok, odporúča sa doplniť extrakciu textu cez pdf-parse alebo mammoth.`,
      ].join('\n');
    }
  } catch {
    text = [
      `Súbor bol priložený, ale nepodarilo sa ho prečítať.`,
      `Názov súboru: ${name}`,
      `Typ súboru: ${type}`,
      `Veľkosť: ${formatFileSize(size)}`,
    ].join('\n');
  }

  return {
    name,
    size,
    type,
    text: text.trim(),
  };
}

function buildReviewsPromptBlock(reviewFiles: ReviewFileInfo[]) {
  if (!reviewFiles.length) {
    return 'Neboli priložené žiadne posudky.';
  }

  return reviewFiles
    .map((file, index) => {
      return `
POSUDOK / PODKLAD ${index + 1}
Názov súboru: ${file.name}
Typ: ${file.type || 'nezadané'}
Veľkosť: ${formatFileSize(file.size)}

TEXT / INFORMÁCIA ZO SÚBORU:
${file.text || 'Bez extrahovaného textu.'}
`;
    })
    .join('\n\n-----------------------------\n\n');
}

function buildFallbackSlides({
  title,
  defenseType,
  reviewFilesCount,
}: {
  title: string;
  defenseType: string;
  reviewFilesCount: number;
}): DefenseSlide[] {
  return [
    {
      title: 'Titulný slide',
      bullets: [
        title,
        `${defenseType} obhajoba`,
        'Prezentácia pripravená systémom ZEDPERA',
      ],
      speakerNotes:
        'Predstavte názov práce, typ práce a stručne uveďte, čomu sa práca venuje.',
    },
    {
      title: 'Cieľ práce',
      bullets: [
        'Predstavenie hlavného cieľa práce',
        'Vysvetlenie riešeného problému',
        'Prepojenie cieľa s témou a metodológiou',
      ],
      speakerNotes:
        'Vysvetlite, čo bolo hlavným zámerom práce a prečo je téma dôležitá.',
    },
    {
      title: 'Posudky a pripomienky',
      bullets:
        reviewFilesCount > 0
          ? [
              `Počet priložených posudkov alebo podkladov: ${reviewFilesCount}`,
              'Pripomienky sú zohľadnené v časti otázky a odpovede',
              'Prezentácia obsahuje priestor na reakciu študenta',
            ]
          : [
              'Posudky neboli priložené',
              'Otázky a odpovede boli pripravené podľa názvu, profilu a obsahu práce',
              'Odporúča sa doplniť konkrétne posudky pred finálnou obhajobou',
            ],
      speakerNotes:
        'Ak boli priložené posudky, vysvetlite, že ste sa s pripomienkami oboznámili a pripravili ste si odpovede.',
    },
    {
      title: 'Záver obhajoby',
      bullets: [
        'Zhrnutie riešeného problému',
        'Zhrnutie prínosu práce',
        'Priestor na otázky komisie',
      ],
      speakerNotes:
        'Ukončite prezentáciu stručne, vecne a pripravte sa na otázky.',
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const title = String(formData.get('title') || '').trim();
    const summary = String(formData.get('summary') || '').trim();
    const defenseType = String(
      formData.get('defenseType') || 'Bakalárska',
    ).trim();

    const activeProfileRaw = String(formData.get('activeProfile') || 'null');
    const profile = safeJsonParse<SavedProfile | null>(activeProfileRaw, null);

    const uploadedReviewFiles = formData
      .getAll('reviews')
      .filter((item): item is File => item instanceof File);

    if (!title) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba názov práce.',
        },
        { status: 400 },
      );
    }

    if (!summary || summary.length < 100) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Stručný obsah práce je príliš krátky. Vlož aspoň 100 znakov.',
        },
        { status: 400 },
      );
    }

    const reviewFiles: ReviewFileInfo[] = [];

    for (const file of uploadedReviewFiles) {
      const extracted = await extractTextFromUploadedFile(file);
      reviewFiles.push(extracted);
    }

    const reviewsBlock = buildReviewsPromptBlock(reviewFiles);

    const prompt = `
Vytvor profesionálnu prezentáciu na obhajobu záverečnej práce.

JAZYK VÝSTUPU:
slovenčina

NÁZOV PRÁCE:
${title}

TYP OBHAJOBY:
${defenseType}

PROFIL PRÁCE:
- Téma: ${profile?.topic || 'nezadané'}
- Typ práce: ${profile?.type || defenseType}
- Úroveň práce: ${profile?.level || 'nezadané'}
- Odbor: ${profile?.field || 'nezadané'}
- Jazyk práce: ${profile?.workLanguage || profile?.language || 'slovenčina'}
- Cieľ práce: ${profile?.goal || 'nezadané'}
- Metodológia: ${profile?.methodology || 'nezadané'}
- Citovanie: ${profile?.citation || 'nezadané'}
- Kľúčové slová: ${getProfileKeywords(profile)}

STRUČNÝ OBSAH PRÁCE:
${summary}

PRILOŽENÉ POSUDKY / PODKLADY:
${reviewsBlock}

HLAVNÁ ÚLOHA:
Vytvor prezentáciu na obhajobu, ktorá bude použiteľná pred komisiou.

POŽIADAVKY NA PREZENTÁCIU:
- vytvor 10 až 12 slidov,
- každý slide musí mať jasný názov,
- každý slide musí mať 3 až 5 stručných bodov,
- ku každému slidu doplň speakerNotes,
- prezentácia má byť akademická, vecná a obhájiteľná,
- text musí byť v slovenčine,
- nepíš všeobecné frázy bez obsahu,
- zachovaj logiku obhajoby: úvod, cieľ, metodológia, výsledky, prínos, limity, posudky, otázky a záver.

DÔLEŽITÉ K POSUDKOM:
Ak sú priložené posudky alebo podklady, musia byť zapracované do prezentácie.
Vytvor samostatné slidy alebo časti:
1. Reakcia na pripomienky z posudkov.
2. Otázky z posudkov.
3. Návrh odpovedí študenta.
4. Slabé miesta práce a ich obhajoba.
5. Odporúčaná ústna reakcia pred komisiou.

Ak v priložených súboroch nie je dostupný extrahovaný text, aj tak vytvor univerzálnu časť pre reakciu na posudky a upozorni v poznámkach, že otázky treba doplniť podľa konkrétneho znenia posudkov.

VRÁŤ IBA ČISTÝ JSON BEZ MARKDOWNU.

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
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Si odborník na akademické prezentácie, obhajoby záverečných prác a spracovanie pripomienok z posudkov vedúceho a oponenta.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';

    let parsed: any = {};

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const slides = normalizeSlides(parsed);

    if (!slides.length) {
      return NextResponse.json({
        ok: true,
        slides: buildFallbackSlides({
          title,
          defenseType,
          reviewFilesCount: reviewFiles.length,
        }),
        reviewsCount: reviewFiles.length,
        reviews: reviewFiles.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
        warning:
          'AI nevrátila platné slidy vo formáte JSON. Bol použitý náhradný základ prezentácie.',
      });
    }

    return NextResponse.json({
      ok: true,
      slides,
      reviewsCount: reviewFiles.length,
      reviews: reviewFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    });
  } catch (error) {
    console.error('DEFENSE_GENERATE_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa vygenerovať prezentáciu na obhajobu.',
      },
      { status: 500 },
    );
  }
}