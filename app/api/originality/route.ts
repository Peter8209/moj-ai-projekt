import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { mistral } from '@ai-sdk/mistral';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

// ================= TYPES =================

type OriginalityRequest = {
  title?: string;
  authorName?: string;
  school?: string;
  faculty?: string;
  studyProgram?: string;
  supervisor?: string;
  workType?: string;
  citationStyle?: string;
  language?: string;
  text?: string;
  profileId?: string | null;
  activeProfile?: any;
  agent?: 'openai' | 'gemini' | 'claude' | 'mistral';
  checkAuthenticity?: boolean | string;
};

type ExtractedUploadResult = {
  text: string;
  warning?: string | null;
};

// ================= FILE CONFIG =================

const ALLOWED_EXTENSIONS = [
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

const MAX_EXTRACTED_TEXT_LENGTH = 70000;

// ================= HELPERS =================

function getExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');

  if (index === -1) {
    return '';
  }

  return fileName.slice(index).toLowerCase();
}

function isAllowedFile(file: File) {
  return ALLOWED_EXTENSIONS.includes(getExtension(file.name));
}

function cleanInputText(value: string) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function cleanAiText(value: string) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function stripRtf(value: string) {
  return String(value || '')
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-zA-Z]+\d* ?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function section(text: string, name: string) {
  return (
    cleanAiText(text)
      .split(`=== ${name} ===`)[1]
      ?.split('===')[0]
      ?.trim() || ''
  );
}

function numberFromSection(text: string, name: string) {
  const value = section(text, name);
  const match = value.match(/\d+/);

  return match ? Math.max(0, Math.min(100, Number(match[0]))) : null;
}

function boolValue(value: boolean | string | undefined, fallback = true) {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();

    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }

    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }

  return fallback;
}

// ================= AI MODEL ROUTER =================

function getModel(agent?: string) {
  if (agent === 'openai' && process.env.OPENAI_API_KEY) {
    return openai(process.env.OPENAI_MODEL || 'gpt-4o-mini');
  }

  if (agent === 'claude' && process.env.ANTHROPIC_API_KEY) {
    return anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6') as any;
  }

  if (agent === 'mistral' && process.env.MISTRAL_API_KEY) {
    return mistral(process.env.MISTRAL_MODEL || 'mistral-small-latest') as any;
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(process.env.GOOGLE_MODEL || 'gemini-2.5-flash') as any;
  }

  if (process.env.OPENAI_API_KEY) {
    return openai(process.env.OPENAI_MODEL || 'gpt-4o-mini');
  }

  throw new Error(
    'Nie je nastavený žiadny AI provider. Doplň GOOGLE_GENERATIVE_AI_API_KEY alebo OPENAI_API_KEY.'
  );
}

// ================= FILE TEXT EXTRACTION =================

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParseModule: any = await import('pdf-parse');

  const possibleDefaultParser = pdfParseModule?.default;

  if (typeof possibleDefaultParser === 'function') {
    const result = await possibleDefaultParser(buffer);
    return cleanInputText(result?.text || '');
  }

  if (typeof pdfParseModule === 'function') {
    const result = await pdfParseModule(buffer);
    return cleanInputText(result?.text || '');
  }

  if (typeof pdfParseModule?.parse === 'function') {
    const result = await pdfParseModule.parse(buffer);
    return cleanInputText(result?.text || result?.content || '');
  }

  if (typeof pdfParseModule?.parsePDF === 'function') {
    const result = await pdfParseModule.parsePDF(buffer);
    return cleanInputText(result?.text || result?.content || '');
  }

  throw new Error(
    'PDF parser sa nepodarilo inicializovať. Skontroluj verziu balíka pdf-parse.'
  );
}

async function extractTextFromFile(file: File): Promise<ExtractedUploadResult> {
  const extension = getExtension(file.name);

  if (!isAllowedFile(file)) {
    throw new Error(`Nepodporovaný formát súboru: ${file.name}`);
  }

  if (['.txt', '.md', '.csv'].includes(extension)) {
    const content = await file.text();

    return {
      text: cleanInputText(content),
      warning: null,
    };
  }

  if (extension === '.rtf') {
    try {
      const content = await file.text();

      return {
        text: cleanInputText(stripRtf(content)),
        warning: null,
      };
    } catch (error) {
      console.error('RTF EXTRACT ERROR:', error);

      return {
        text: `[RTF súbor bol priložený: ${file.name}. Text RTF sa nepodarilo automaticky extrahovať.]`,
        warning:
          error instanceof Error
            ? `RTF extrakcia zlyhala: ${error.message}`
            : 'RTF extrakcia zlyhala.',
      };
    }
  }

  if (extension === '.docx') {
    try {
      const mammoth = await import('mammoth');
      const buffer = Buffer.from(await file.arrayBuffer());

      const result = await mammoth.extractRawText({
        buffer,
      } as any);

      return {
        text: cleanInputText(result.value || ''),
        warning:
          result.messages && result.messages.length > 0
            ? result.messages
                .map((message: any) => message?.message)
                .filter(Boolean)
                .join(' | ')
            : null,
      };
    } catch (error) {
      console.error('DOCX EXTRACT ERROR:', error);

      return {
        text: `[DOCX súbor bol priložený: ${file.name}. Text DOCX sa nepodarilo automaticky extrahovať.]`,
        warning:
          error instanceof Error
            ? `DOCX extrakcia zlyhala: ${error.message}`
            : 'DOCX extrakcia zlyhala.',
      };
    }
  }

  if (['.xls', '.xlsx'].includes(extension)) {
    try {
      const xlsx = await import('xlsx');
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = xlsx.read(buffer, { type: 'buffer' });

      const texts: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = xlsx.utils.sheet_to_csv(sheet);

        if (csv.trim()) {
          texts.push(`Hárok: ${sheetName}\n${csv}`);
        }
      }

      return {
        text: cleanInputText(texts.join('\n\n')),
        warning: null,
      };
    } catch (error) {
      console.error('XLSX EXTRACT ERROR:', error);

      return {
        text: `[Tabuľkový súbor bol priložený: ${file.name}. Text z tabuľky sa nepodarilo automaticky extrahovať.]`,
        warning:
          error instanceof Error
            ? `Tabuľková extrakcia zlyhala: ${error.message}`
            : 'Tabuľková extrakcia zlyhala.',
      };
    }
  }

  if (extension === '.pdf') {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const extractedText = await extractPdfText(buffer);

      if (!extractedText.trim()) {
        return {
          text: `[PDF súbor bol priložený: ${file.name}. PDF neobsahuje čitateľný text alebo je skenované ako obrázok.]`,
          warning:
            'PDF neobsahuje čitateľný text alebo je skenované ako obrázok.',
        };
      }

      return {
        text: extractedText,
        warning: null,
      };
    } catch (error) {
      console.error('PDF EXTRACT ERROR:', error);

      return {
        text: `[PDF súbor bol priložený: ${file.name}. Text PDF sa nepodarilo automaticky extrahovať.]`,
        warning:
          error instanceof Error
            ? `PDF extrakcia zlyhala: ${error.message}`
            : 'PDF extrakcia zlyhala.',
      };
    }
  }

  if (['.doc', '.odt', '.ppt', '.pptx'].includes(extension)) {
    return {
      text: `[Súbor bol priložený: ${file.name}. Tento formát je povolený, ale plná extrakcia textu pre tento typ zatiaľ nie je aktívna. Pre presnejšiu kontrolu vlož text práce aj ručne alebo nahraj DOCX/PDF/TXT.]`,
      warning:
        'Súbor je povolený, ale text sa z tohto typu v tejto trase plne neextrahuje.',
    };
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
    return {
      text: `[Obrázok bol priložený: ${file.name}. OCR alebo vizuálna analýza obrázkov zatiaľ nie je aktívna. Pre presnejšiu kontrolu vlož text z obrázka aj ručne.]`,
      warning:
        'Obrázok bol priložený, ale OCR v tejto trase zatiaľ nie je aktívne.',
    };
  }

  return {
    text: `[Súbor bol priložený: ${file.name}.]`,
    warning: null,
  };
}

// ================= PROMPT =================

function buildOriginalityPrompt(data: {
  text: string;
  title: string;
  authorName: string;
  school: string;
  faculty: string;
  studyProgram: string;
  supervisor: string;
  workType: string;
  citationStyle: string;
  language: string;
  activeProfile: any;
  checkAuthenticity: boolean;
}) {
  return `
Si ZEDPERA Originalita – predbežná kontrola originality práce podobná univerzitnému krokovému postupu.

DÔLEŽITÉ PRAVIDLÁ:
- Toto je predbežná orientačná kontrola, nie oficiálna kontrola CRZP, Turnitin ani školský antiplagiátorský systém.
- Neuvádzaj falošné zhody s konkrétnymi databázami.
- Neuvádzaj vymyslené percentá zhody s internetom.
- Hodnoť riziko originality podľa kvality textu, chýbajúcich citácií, generických formulácií, rizikových viet, neparafrázovaných častí a odbornej argumentácie.
- Neuč používateľa obchádzať AI detektory ani školské systémy.
- Namiesto toho odporúčaj poctivé citovanie, parafrázovanie, doplnenie zdrojov, vlastnú analýzu a konkrétnejší akademický štýl.
- Pri kontrole autentickosti sleduj šablónové frázy, opakovanie, všeobecné tvrdenia bez zdrojov, chýbajúci vlastný prínos a neosobný generický štýl.
- Výstup píš čisto, bez Markdown hviezdičiek, bez kódových blokov, bez falošných citácií a bez vymyslených DOI.

ÚDAJE O PRÁCI:
Názov práce: ${data.title || 'Neuvedené'}
Autor: ${data.authorName || 'Neuvedené'}
Škola: ${data.school || 'Neuvedené'}
Fakulta: ${data.faculty || 'Neuvedené'}
Študijný program: ${data.studyProgram || 'Neuvedené'}
Vedúci práce: ${data.supervisor || data.activeProfile?.supervisor || 'Neuvedené'}
Typ práce: ${data.workType || data.activeProfile?.type || 'Neuvedené'}
Citačná norma: ${data.citationStyle || data.activeProfile?.citation || 'ISO 690'}
Jazyk: ${data.language || data.activeProfile?.language || 'SK'}
Kontrola autentickosti textu: ${data.checkAuthenticity ? 'Áno' : 'Nie'}

PROFIL PRÁCE:
Téma: ${data.activeProfile?.topic || 'Neuvedené'}
Cieľ: ${data.activeProfile?.goal || 'Neuvedené'}
Metodológia: ${data.activeProfile?.methodology || 'Neuvedené'}
Odbor: ${data.activeProfile?.field || 'Neuvedené'}

TEXT NA KONTROLU:
"""
${data.text}
"""

Vráť výsledok PRESNE v tomto formáte:

=== STAV KONTROLY ===
Dokončené / Čiastočné / Nedostatočný vstup.

=== SKÓRE ORIGINALITY ===
Číslo od 0 do 100. 100 znamená vysoká predpokladaná originalita.

=== RIZIKO PODOBNOSTI ===
Číslo od 0 do 100. 100 znamená vysoké riziko podobnosti.

=== AI / GENERICKÝ ŠTÝL ===
Číslo od 0 do 100. 100 znamená vysoké riziko príliš generického, šablónového alebo AI-pôsobiaceho textu. Nehodnoť to ako obchádzanie detektorov, ale ako akademickú prirodzenosť, konkrétnosť a mieru vlastného prínosu autora.

=== AUTENTICKOSŤ TEXTU ===
Číslo od 0 do 100. 100 znamená prirodzený, konkrétny, odborne pôsobiaci text s viditeľným autorským prínosom.

=== CELKOVÉ HODNOTENIE ===
Slovné hodnotenie: Nízke riziko / Stredné riziko / Vysoké riziko. Pridaj vysvetlenie.

=== RIZIKOVÉ PASÁŽE ===
Vypíš konkrétne pasáže alebo vety, ktoré môžu byť rizikové. Pri každej:
- cituj krátky úsek
- vysvetli dôvod rizika
- navrhni opravu

=== CHÝBAJÚCE CITÁCIE ===
Uveď miesta, kde pravdepodobne treba doplniť citáciu alebo zdroj.

=== ODPORÚČANIA NA ÚPRAVU ===
Daj konkrétne odporúčania:
- čo citovať
- čo parafrázovať
- kde doplniť vlastný komentár
- kde doplniť metodológiu alebo zdroj

=== AUTENTICKÁ AKADEMICKÁ ÚPRAVA ===
Vyber 1–3 generické alebo príliš šablónové vety a ukáž, ako ich poctivo upraviť tak, aby:
- boli konkrétnejšie,
- obsahovali odborný kontext,
- nadväzovali na tému práce,
- boli vhodné na citovanie,
- nepôsobili ako všeobecný AI text,
- ale zároveň neobchádzali žiadne detektory ani akademické pravidlá.

=== UKÁŽKA AKADEMICKEJ ÚPRAVY ===
Vyber 1–3 rizikové vety a ukáž poctivú akademickú úpravu.

=== UPOZORNENIE ===
Uveď, že výsledok je orientačný a nenahrádza oficiálnu kontrolu originality.
`;
}

// ================= API ROUTE =================

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let body: OriginalityRequest = {};
    let uploadedFile: File | null = null;
    let fileWarning: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      const rawFile = formData.get('file');
      uploadedFile = rawFile instanceof File ? rawFile : null;

      const activeProfileRaw = formData.get('activeProfile')?.toString() || '';

      let activeProfile = null;

      try {
        activeProfile = activeProfileRaw ? JSON.parse(activeProfileRaw) : null;
      } catch {
        activeProfile = null;
      }

      body = {
        title: formData.get('title')?.toString() || '',
        authorName: formData.get('authorName')?.toString() || '',
        school: formData.get('school')?.toString() || '',
        faculty: formData.get('faculty')?.toString() || '',
        studyProgram: formData.get('studyProgram')?.toString() || '',
        supervisor: formData.get('supervisor')?.toString() || '',
        workType: formData.get('workType')?.toString() || '',
        citationStyle: formData.get('citationStyle')?.toString() || 'ISO 690',
        language: formData.get('language')?.toString() || 'SK',
        text: formData.get('text')?.toString() || '',
        profileId: formData.get('profileId')?.toString() || null,
        agent: (formData.get('agent')?.toString() || 'gemini') as any,
        checkAuthenticity:
          formData.get('checkAuthenticity')?.toString() !== 'false',
        activeProfile,
      };
    } else {
      body = (await req.json()) as OriginalityRequest;
    }

    let extractedFromFile = '';

    if (uploadedFile) {
      const extracted = await extractTextFromFile(uploadedFile);
      extractedFromFile = extracted.text;
      fileWarning = extracted.warning || null;
    }

    const text = cleanInputText(
      `${body.text || ''}\n\n${extractedFromFile || ''}`
    );

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: 'TEXT_REQUIRED',
          message: 'Chýba text práce alebo extrahovaný obsah súboru.',
        },
        { status: 400 }
      );
    }

    if (text.length < 300) {
      return NextResponse.json(
        {
          ok: false,
          error: 'TEXT_TOO_SHORT',
          message:
            'Na kontrolu vlož aspoň 300 znakov alebo nahraj čitateľný súbor.',
        },
        { status: 400 }
      );
    }

    const activeProfile = body.activeProfile || null;

    const prompt = buildOriginalityPrompt({
      text: text.slice(0, MAX_EXTRACTED_TEXT_LENGTH),
      title: body.title || activeProfile?.title || 'Kontrola originality',
      authorName: body.authorName || '',
      school: body.school || '',
      faculty: body.faculty || '',
      studyProgram: body.studyProgram || '',
      supervisor: body.supervisor || activeProfile?.supervisor || '',
      workType: body.workType || activeProfile?.type || '',
      citationStyle: body.citationStyle || activeProfile?.citation || 'ISO 690',
      language:
        body.language ||
        activeProfile?.workLanguage ||
        activeProfile?.language ||
        'SK',
      activeProfile,
      checkAuthenticity: boolValue(body.checkAuthenticity, true),
    });

    const model = getModel(body.agent);

    const result = await generateText({
      model,
      prompt,
      temperature: 0.15,
      maxOutputTokens: 4500,
    });

    const report = cleanAiText(result.text || '');

    const status = section(report, 'STAV KONTROLY');
    const originalityScore = numberFromSection(report, 'SKÓRE ORIGINALITY');
    const similarityRiskScore = numberFromSection(report, 'RIZIKO PODOBNOSTI');
    const aiStyleScore = numberFromSection(report, 'AI / GENERICKÝ ŠTÝL');
    const authenticityScore = numberFromSection(report, 'AUTENTICKOSŤ TEXTU');

    const riskLevel = section(report, 'CELKOVÉ HODNOTENIE');
    const riskyPassages = section(report, 'RIZIKOVÉ PASÁŽE');
    const missingCitations = section(report, 'CHÝBAJÚCE CITÁCIE');
    const recommendations = section(report, 'ODPORÚČANIA NA ÚPRAVU');
    const authenticRewrite = section(report, 'AUTENTICKÁ AKADEMICKÁ ÚPRAVA');
    const rewriteSample = section(report, 'UKÁŽKA AKADEMICKEJ ÚPRAVY');

    let savedId: string | null = null;

    try {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from('zedpera_originality_checks')
        .insert({
          user_id: null,
          profile_id: body.profileId || null,

          title: body.title || activeProfile?.title || 'Kontrola originality',
          author_name: body.authorName || null,
          school: body.school || null,
          faculty: body.faculty || null,
          study_program: body.studyProgram || null,
          supervisor: body.supervisor || activeProfile?.supervisor || null,

          work_type: body.workType || activeProfile?.type || null,
          citation_style:
            body.citationStyle || activeProfile?.citation || 'ISO 690',
          language: body.language || activeProfile?.language || 'SK',

          file_name: uploadedFile?.name || null,
          file_size: uploadedFile?.size || null,
          mime_type: uploadedFile?.type || null,

          extracted_text: text,
          input_length: text.length,

          originality_score: originalityScore,
          similarity_risk_score: similarityRiskScore,
          ai_style_score: aiStyleScore,
          authenticity_score: authenticityScore,

          risk_level: riskLevel,
          summary: riskLevel,

          risky_passages: riskyPassages ? [{ text: riskyPassages }] : [],
          missing_citations: missingCitations ? [{ text: missingCitations }] : [],
          recommendations: recommendations ? [{ text: recommendations }] : [],
          authentic_rewrite: authenticRewrite
            ? [{ text: authenticRewrite }]
            : [],

          raw_report: report,
          status: status || 'completed',
        })
        .select('id')
        .single();

      if (!error && data?.id) {
        savedId = data.id;
      }

      if (error) {
        console.error('ORIGINALITY SAVE ERROR:', error);
      }
    } catch (saveError) {
      console.error('ORIGINALITY SAVE ERROR:', saveError);
    }

    return NextResponse.json({
      ok: true,
      id: savedId,

      status,
      originalityScore,
      similarityRiskScore,
      aiStyleScore,
      authenticityScore,

      riskLevel,
      riskyPassages,
      missingCitations,
      recommendations,
      authenticRewrite,
      rewriteSample,
      report,

      fileWarning,

      file: uploadedFile
        ? {
            name: uploadedFile.name,
            size: uploadedFile.size,
            type: uploadedFile.type,
            extension: getExtension(uploadedFile.name),
          }
        : null,
    });
  } catch (error) {
    console.error('ORIGINALITY API ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'ORIGINALITY_CHECK_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Neznáma chyba pri kontrole originality.',
      },
      { status: 500 }
    );
  }
}