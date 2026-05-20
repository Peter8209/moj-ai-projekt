import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Používateľ nie je prihlásený.',
        },
        { status: 401 },
      );
    }

    const now = new Date().toISOString();

    const payload = {
      user_id: user.id,

      title: body.title || body.name || '',
      topic: body.topic || '',
      type: body.type || '',
      level: body.level || '',
      field: body.field || '',
      supervisor: body.supervisor || '',

      language: body.language || body.interfaceLanguage || 'sk',
      work_language: body.workLanguage || body.work_language || body.language || 'sk',

      citation_style:
        body.citationStyle ||
        body.citation ||
        body.citation_style ||
        'STN ISO 690',

      annotation: body.annotation || '',
      goal: body.goal || '',
      research_problem: body.researchProblem || body.problem || '',
      methodology: body.methodology || '',
      hypotheses: body.hypotheses || '',
      research_questions: body.researchQuestions || '',
      practical_part: body.practicalPart || '',
      scientific_contribution: body.scientificContribution || '',
      sources_requirement: body.sourcesRequirement || '',

      schema: body.schema || null,

      updated_at: now,
    };

    const profileId = body.id || body.profile_id;

    let query;

    if (profileId) {
      query = supabase
        .from('user_profiles')
        .update(payload)
        .eq('id', profileId)
        .eq('user_id', user.id)
        .select('*')
        .single();
    } else {
      query = supabase
        .from('user_profiles')
        .insert({
          ...payload,
          created_at: now,
        })
        .select('*')
        .single();
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      profile: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || 'Profil sa nepodarilo uložiť.',
      },
      { status: 500 },
    );
  }
}