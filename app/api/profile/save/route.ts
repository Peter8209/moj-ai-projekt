import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SaveProfileBody = {
  id?: string;

  title?: string;
  topic?: string;
  type?: string;
  level?: string;
  field?: string;
  specialization?: string;
  supervisor?: string;

  interfaceLanguage?: string;
  workLanguage?: string;
  citationStyle?: string;

  annotation?: string;
  goal?: string;
  researchProblem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;
  sourcesRequirement?: string;

  structure?: string;
  requiredSections?: string;
  recommendedLength?: string;
  aiInstruction?: string;

  createdAt?: string;
  updatedAt?: string;
};

function safeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function safeLanguage(value: unknown): string {
  const allowed = ['sk', 'cs', 'en', 'de', 'pl', 'hu'];

  if (typeof value !== 'string') return 'sk';
  if (!allowed.includes(value)) return 'sk';

  return value;
}

function safeCitationStyle(value: unknown): string {
  const allowed = ['apa7', 'iso690', 'stn_iso690', 'chicago'];

  if (typeof value !== 'string') return 'stn_iso690';
  if (!allowed.includes(value)) return 'stn_iso690';

  return value;
}

function safeWorkType(value: unknown): string {
  const allowed = [
    'seminar',
    'bachelor',
    'master',
    'dissertation',
    'rigorous',
    'article',
    'other',
  ];

  if (typeof value !== 'string') return 'bachelor';
  if (!allowed.includes(value)) return value || 'bachelor';

  return value;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SaveProfileBody;

    if (!body?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba ID profilu práce.',
        },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Používateľ nie je prihlásený.',
        },
        { status: 401 },
      );
    }

    const now = new Date().toISOString();

    const payload = {
      id: body.id,
      user_id: user.id,

      title: safeText(body.title),
      topic: safeText(body.topic),
      type: safeWorkType(body.type),
      level: safeText(body.level),
      field: safeText(body.field),
      specialization: safeText(body.specialization),
      supervisor: safeText(body.supervisor),

      interface_language: safeLanguage(body.interfaceLanguage),
      work_language: safeLanguage(body.workLanguage),
      citation_style: safeCitationStyle(body.citationStyle),

      annotation: safeText(body.annotation),
      goal: safeText(body.goal),
      research_problem: safeText(body.researchProblem),
      methodology: safeText(body.methodology),
      hypotheses: safeText(body.hypotheses),
      research_questions: safeText(body.researchQuestions),
      practical_part: safeText(body.practicalPart),
      scientific_contribution: safeText(body.scientificContribution),
      sources_requirement: safeText(body.sourcesRequirement),

      structure: safeText(body.structure),
      required_sections: safeText(body.requiredSections),
      recommended_length: safeText(body.recommendedLength),
      ai_instruction: safeText(body.aiInstruction),

      created_at: body.createdAt || now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(payload, {
        onConflict: 'id',
      })
      .select(
        `
        id,
        user_id,
        title,
        topic,
        type,
        level,
        field,
        specialization,
        supervisor,
        interface_language,
        work_language,
        citation_style,
        annotation,
        goal,
        research_problem,
        methodology,
        hypotheses,
        research_questions,
        practical_part,
        scientific_contribution,
        sources_requirement,
        structure,
        required_sections,
        recommended_length,
        ai_instruction,
        created_at,
        updated_at
      `,
      )
      .single();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      profile: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Neznáma chyba pri ukladaní profilu práce.',
      },
      { status: 500 },
    );
  }
}