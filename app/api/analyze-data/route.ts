import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SavedProfile = {
  id?: string;
  title?: string;
  topic?: string;
  type?: string;
  field?: string;
  goal?: string;
  problem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;
  keywords?: string[];
  keywordsList?: string[];
};

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function safeJsonParse<T>(value: FormDataEntryValue | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
  return fileName.slice(index).toLowerCase();
}

async function readFileAsText(file: File) {
  const extension = getFileExtension(file.name);

  if (['.txt', '.csv', '.md', '.rtf'].includes(extension)) {
    try {
      return cleanText(await file.text());
    } catch {
      return '';
    }
  }

  if (['.xlsx', '.xls', '.pdf', '.docx', '.doc', '.pptx'].includes(extension)) {
    return `Súbor "${file.name}" bol priložený, ale tento endpoint momentálne neextrahuje binárny obsah priamo. Pre plnú extrakciu odporúčam napojiť /api/extract-text alebo serverovú extrakciu cez xlsx/pdf-parse/mammoth.`;
  }

  return `Súbor "${file.name}" bol priložený.`;
}

function getKeywords(profile: SavedProfile | null) {
  if (!profile) return 'nezadané';

  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length > 0) {
    return profile.keywordsList.join(', ');
  }

  if (Array.isArray(profile.keywords) && profile.keywords.length > 0) {
    return profile.keywords.join(', ');
  }

  return 'nezadané';
}

function extractJsonFromText(text: string) {
  const cleaned = cleanText(text);

  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

function fallbackResult(fullText: string) {
  return {
    ok: true,
    title: 'Výsledky analýzy',
    summary:
      'Analýza bola vytvorená, ale odpoveď nebola v presnom JSON formáte. Zobrazuje sa kompletný textový výstup.',
    dataDescription: 'Dáta je potrebné skontrolovať podľa priloženého súboru.',
    selectedAnalyses: [],
    descriptiveStatistics: [],
    recommendedCharts: [],
    excelTables: [],
    hypothesisTests: [],
    practicalText: fullText,
    interpretation: fullText,
    warnings: [
      'AI výstup nebol v presnom JSON formáte. Skontroluj prompt alebo model.',
    ],
    fullText,
    meta: {
      generatedAt: new Date().toISOString(),
    },
  };
}

function buildPrompt({
  profile,
  analysisGoal,
  dataDescription,
  filesBlock,
}: {
  profile: SavedProfile | null;
  analysisGoal: string;
  dataDescription: string;
  filesBlock: string;
}) {
  return `
Si profesionálny štatistik, metodológ výskumu a konzultant praktickej časti záverečných prác.

Tvojou úlohou je pripraviť presnú analýzu údajov pre praktickú časť práce.

Musíš navrhnúť:
- všetky vhodné štatistické analýzy,
- deskriptívnu štatistiku,
- grafy,
- Excel tabuľky,
- hypotézy a testy,
- text do praktickej časti,
- interpretáciu výsledkov,
- upozornenia na chýbajúce údaje.

PROFIL PRÁCE:
Názov: ${profile?.title || 'nezadané'}
Téma: ${profile?.topic || 'nezadané'}
Typ práce: ${profile?.type || 'nezadané'}
Odbor: ${profile?.field || 'nezadané'}
Cieľ práce: ${profile?.goal || 'nezadané'}
Výskumný problém: ${profile?.problem || 'nezadané'}
Metodológia: ${profile?.methodology || 'nezadané'}
Hypotézy: ${profile?.hypotheses || 'nezadané'}
Výskumné otázky: ${profile?.researchQuestions || 'nezadané'}
Praktická časť: ${profile?.practicalPart || 'nezadané'}
Citačná norma: ${profile?.citation || 'ISO 690'}
Jazyk práce: ${profile?.workLanguage || profile?.language || 'slovenčina'}
Kľúčové slová: ${getKeywords(profile)}

CIEĽ ANALÝZY OD POUŽÍVATEĽA:
${analysisGoal || 'Navrhni a priprav kompletnú analýzu do praktickej časti.'}

VLOŽENÝ TEXT / OPIS DÁT:
${dataDescription || 'Používateľ nevložil textový opis dát.'}

PRILOŽENÉ SÚBORY:
${filesBlock || 'Bez priložených súborov.'}

DÔLEŽITÉ:
- Ak sú premenné číselné, navrhni priemer, medián, SD, minimum, maximum, kvartily.
- Ak sú premenné kategóriové, navrhni frekvencie, percentá a validné percentá.
- Ak ide o dotazník, navrhni skóre, subškály, reliabilitu Cronbachovo alfa.
- Pri hypotézach navrhni správne testy: korelácia, t-test, ANOVA, Mann-Whitney, Kruskal-Wallis, chí-kvadrát, regresia.
- Pri normalite navrhni Shapiro-Wilk, histogram, Q-Q plot.
- Pri vzťahoch navrhni Pearson/Spearman.
- Pri skupinových rozdieloch navrhni vhodné parametrické alebo neparametrické testy.
- Pri predikcii navrhni lineárnu alebo logistickú regresiu.
- Pri viacerých premenných navrhni korelačnú maticu.
- Navrhni aj grafy: stĺpcový graf, koláčový graf, histogram, boxplot, scatter plot, heatmapa, chybové úsečky.
- Navrhni Excel tabuľky, ktoré majú byť vytvorené.
- Výstup musí byť v slovenčine.

VRÁŤ IBA VALIDNÝ JSON BEZ MARKDOWN BLOKOV.

Presná JSON štruktúra:

{
  "ok": true,
  "title": "Výsledky analýzy",
  "summary": "stručný súhrn",
  "dataDescription": "popis dát",
  "selectedAnalyses": [
    {
      "title": "názov analýzy",
      "description": "prečo je vhodná"
    }
  ],
  "descriptiveStatistics": [
    {
      "title": "Deskriptívna štatistika",
      "description": "popis tabuľky",
      "columns": [
        { "key": "variable", "label": "Premenná" },
        { "key": "n", "label": "N" },
        { "key": "mean", "label": "Priemer" },
        { "key": "median", "label": "Medián" },
        { "key": "sd", "label": "SD" },
        { "key": "min", "label": "Minimum" },
        { "key": "max", "label": "Maximum" }
      ],
      "rows": [
        {
          "variable": "doplní sa podľa dát",
          "n": "potrebné vypočítať",
          "mean": "potrebné vypočítať",
          "median": "potrebné vypočítať",
          "sd": "potrebné vypočítať",
          "min": "potrebné vypočítať",
          "max": "potrebné vypočítať"
        }
      ]
    }
  ],
  "recommendedCharts": [
    {
      "title": "názov grafu",
      "type": "bar",
      "description": "čo má graf zobrazovať",
      "variables": ["premenná"]
    }
  ],
  "excelTables": [
    {
      "title": "názov excel tabuľky",
      "description": "účel tabuľky",
      "columns": [
        { "key": "column", "label": "Stĺpec" },
        { "key": "description", "label": "Popis" }
      ],
      "rows": [
        {
          "column": "Názov premennej",
          "description": "čo sa má vypočítať"
        }
      ]
    }
  ],
  "hypothesisTests": [
    {
      "title": "Hypotéza / výskumná otázka",
      "description": "odporúčaný test a odôvodnenie"
    }
  ],
  "practicalText": "súvislý text do praktickej časti práce",
  "interpretation": "interpretácia výsledkov",
  "warnings": ["upozornenie"],
  "fullText": "kompletný výstup"
}
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const analysisGoal = cleanText(formData.get('analysisGoal'));
    const dataDescription = cleanText(formData.get('dataDescription'));
    const profile = safeJsonParse<SavedProfile>(formData.get('activeProfile'));

    const files = formData
      .getAll('files')
      .filter((item): item is File => item instanceof File);

    const fileTexts: string[] = [];

    for (const file of files) {
      const text = await readFileAsText(file);

      fileTexts.push(`
SÚBOR: ${file.name}
Typ: ${file.type || 'nezadané'}
Veľkosť: ${file.size}
Obsah:
${text || 'Text sa nepodarilo načítať.'}
`);
    }

    const filesBlock = fileTexts.join('\n\n------------------------------\n\n');

    if (!analysisGoal && !dataDescription && files.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Chýbajú dáta na analýzu. Vlož text, cieľ analýzy alebo prilož Excel/CSV súbor.',
        },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba OPENAI_API_KEY v .env.local alebo vo Verceli.',
        },
        { status: 500 },
      );
    }

    const prompt = buildPrompt({
      profile,
      analysisGoal,
      dataDescription,
      filesBlock,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Si štatistik a metodológ. Vždy vraciaš iba validný JSON bez markdownu.',
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

    const jsonText = extractJsonFromText(raw);

    try {
      const parsed = JSON.parse(jsonText);

      return NextResponse.json({
        ...parsed,
        ok: true,
        meta: {
          ...(parsed.meta || {}),
          filesCount: files.length,
          extractedChars: filesBlock.length + dataDescription.length,
          generatedAt: new Date().toISOString(),
          profileTitle: profile?.title || null,
        },
      });
    } catch {
      return NextResponse.json(fallbackResult(raw));
    }
  } catch (error) {
    console.error('ANALYZE_DATA_ERROR:', error);

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