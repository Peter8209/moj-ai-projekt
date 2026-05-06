import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { mistral } from '@ai-sdk/mistral';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  profileId?: string | null;
  activeProfile?: any;
  agent?: 'openai' | 'gemini' | 'claude' | 'mistral';
};

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

  throw new Error('Nie je nastavený žiadny AI provider.');
}

function cleanInputText(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .trim();
}

function section(text: string, name: string) {
  return text.split(`=== ${name} ===`)[1]?.split('===')[0]?.trim() || '';
}

function numberFromSection(text: string, name: string) {
  const value = section(text, name);
  const match = value.match(/\d+/);
  return match ? Math.max(0, Math.min(100, Number(match[0]))) : null;
}

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
}) {
  return `
Si ZEDPERA Originalita – predbežná kontrola originality práce podobná univerzitnému postupu.

DÔLEŽITÉ PRAVIDLÁ:
- Toto je predbežná orientačná kontrola, nie oficiálna kontrola CRZP, Turnitin ani školský antiplagiátorský systém.
- Neuvádzaj falošné zhody s konkrétnymi databázami.
- Neuvádzaj vymyslené percentá zhody s internetom.
- Hodnoť riziko originality podľa kvality textu, chýbajúcich citácií, generických formulácií, rizikových viet, neparafrázovaných častí a odbornej argumentácie.
- Neuč používateľa obchádzať detektory.
- Odporúčaj poctivé citovanie, parafrázovanie, doplnenie zdrojov a vlastný odborný komentár.
- Výstup má byť formálny, akademický a použiteľný ako predbežný protokol.

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
Číslo od 0 do 100. 100 znamená veľmi generický alebo AI-pôsobiaci text.

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

=== UKÁŽKA AKADEMICKEJ ÚPRAVY ===
Vyber 1–3 rizikové vety a ukáž poctivú akademickú úpravu.

=== UPOZORNENIE ===
Uveď, že výsledok je orientačný a nenahrádza oficiálnu kontrolu originality.
`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OriginalityRequest;

    const text = cleanInputText(String(body.text || ''));

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: 'TEXT_REQUIRED',
          message: 'Chýba text práce na kontrolu originality.',
        },
        { status: 400 },
      );
    }

    if (text.length < 300) {
      return NextResponse.json(
        {
          ok: false,
          error: 'TEXT_TOO_SHORT',
          message: 'Na kontrolu vlož aspoň 300 znakov.',
        },
        { status: 400 },
      );
    }

    const activeProfile = body.activeProfile || null;

    const prompt = buildOriginalityPrompt({
      text: text.slice(0, 50000),
      title: body.title || activeProfile?.title || 'Kontrola originality',
      authorName: body.authorName || '',
      school: body.school || '',
      faculty: body.faculty || '',
      studyProgram: body.studyProgram || '',
      supervisor: body.supervisor || activeProfile?.supervisor || '',
      workType: body.workType || activeProfile?.type || '',
      citationStyle: body.citationStyle || activeProfile?.citation || 'ISO 690',
      language: body.language || activeProfile?.workLanguage || activeProfile?.language || 'SK',
      activeProfile,
    });

    const model = getModel(body.agent);

    const result = await generateText({
      model,
      prompt,
      temperature: 0.15,
      maxOutputTokens: 4000,
    });

    const report = result.text || '';

    const originalityScore = numberFromSection(report, 'SKÓRE ORIGINALITY');
    const similarityRiskScore = numberFromSection(report, 'RIZIKO PODOBNOSTI');
    const aiStyleScore = numberFromSection(report, 'AI / GENERICKÝ ŠTÝL');

    const status = section(report, 'STAV KONTROLY');
    const riskLevel = section(report, 'CELKOVÉ HODNOTENIE');
    const riskyPassages = section(report, 'RIZIKOVÉ PASÁŽE');
    const missingCitations = section(report, 'CHÝBAJÚCE CITÁCIE');
    const recommendations = section(report, 'ODPORÚČANIA NA ÚPRAVU');
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
          citation_style: body.citationStyle || activeProfile?.citation || 'ISO 690',
          language: body.language || activeProfile?.language || 'SK',

          file_name: body.fileName || null,
          file_size: body.fileSize || null,
          mime_type: body.mimeType || null,

          extracted_text: text,
          input_length: text.length,

          originality_score: originalityScore,
          similarity_risk_score: similarityRiskScore,
          ai_style_score: aiStyleScore,

          risk_level: riskLevel,
          summary: section(report, 'CELKOVÉ HODNOTENIE'),

          matching_style_passages: riskyPassages ? [{ text: riskyPassages }] : [],
          missing_citations: missingCitations ? [{ text: missingCitations }] : [],
          risky_passages: riskyPassages ? [{ text: riskyPassages }] : [],
          recommendations: recommendations ? [{ text: recommendations }] : [],

          raw_report: report,
          status: status || 'completed',
        })
        .select('id')
        .single();

      if (!error && data?.id) {
        savedId = data.id;
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
      riskLevel,
      riskyPassages,
      missingCitations,
      recommendations,
      rewriteSample,
      report,
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
      { status: 500 },
    );
  }
}