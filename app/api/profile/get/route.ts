import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DbProfileRow = {
  id: string;
  user_id: string;

  title: string | null;
  topic: string | null;
  type: string | null;
  level: string | null;
  field: string | null;
  specialization: string | null;
  supervisor: string | null;

  interface_language: string | null;
  work_language: string | null;
  citation_style: string | null;

  annotation: string | null;
  goal: string | null;
  research_problem: string | null;
  methodology: string | null;
  hypotheses: string | null;
  research_questions: string | null;
  practical_part: string | null;
  scientific_contribution: string | null;
  sources_requirement: string | null;

  structure: string | null;
  required_sections: string | null;
  recommended_length: string | null;
  ai_instruction: string | null;

  created_at: string | null;
  updated_at: string | null;
};

function mapDbProfile(row: DbProfileRow | null) {
  if (!row) return null;

  return {
    id: row.id,

    title: row.title || '',
    topic: row.topic || '',
    type: row.type || 'bachelor',
    level: row.level || '',
    field: row.field || '',
    specialization: row.specialization || '',
    supervisor: row.supervisor || '',

    interfaceLanguage: row.interface_language || 'sk',
    workLanguage: row.work_language || 'sk',
    citationStyle: row.citation_style || 'stn_iso690',

    annotation: row.annotation || '',
    goal: row.goal || '',
    researchProblem: row.research_problem || '',
    methodology: row.methodology || '',
    hypotheses: row.hypotheses || '',
    researchQuestions: row.research_questions || '',
    practicalPart: row.practical_part || '',
    scientificContribution: row.scientific_contribution || '',
    sourcesRequirement: row.sources_requirement || '',

    structure: row.structure || '',
    requiredSections: row.required_sections || '',
    recommendedLength: row.recommended_length || '',
    aiInstruction: row.ai_instruction || '',

    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          profile: null,
          error: 'Používateľ nie je prihlásený.',
        },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from('user_profiles')
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
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          profile: null,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      profile: mapDbProfile(data as DbProfileRow | null),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        profile: null,
        error:
          error instanceof Error
            ? error.message
            : 'Neznáma chyba pri načítaní profilu práce.',
      },
      { status: 500 },
    );
  }
}