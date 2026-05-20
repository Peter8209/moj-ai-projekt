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

type ProfileResponse = {
  id: string;

  title: string;
  topic: string;
  type: string;
  level: string;
  field: string;
  specialization: string;
  supervisor: string;

  interfaceLanguage: string;
  workLanguage: string;

  citationStyle: string;
  citation: string;

  annotation: string;
  goal: string;
  problem: string;
  researchProblem: string;
  methodology: string;
  hypotheses: string;
  researchQuestions: string;
  practicalPart: string;
  scientificContribution: string;
  sourcesRequirement: string;

  structure: string;
  requiredSections: string;
  recommendedLength: string;
  aiInstruction: string;

  schema: {
    structure: string;
    requiredSections: string;
    recommendedLength: string;
    aiInstruction: string;
  };

  createdAt: string;
  updatedAt: string;
  savedAt: string;
};

function normalizeCitationStyle(value?: string | null): string {
  const raw = String(value || '').trim().toLowerCase();

  if (!raw) return 'STN ISO 690';

  if (raw.includes('apa')) return 'APA 7';

  if (raw.includes('chicago')) return 'Chicago';

  if (raw.includes('stn') && raw.includes('iso')) return 'STN ISO 690';

  if (raw.includes('iso')) return 'ISO 690';

  if (
    raw === 'stn_iso690' ||
    raw === 'stn_iso_690' ||
    raw === 'stn-iso-690'
  ) {
    return 'STN ISO 690';
  }

  if (raw === 'iso690' || raw === 'iso_690' || raw === 'iso-690') {
    return 'ISO 690';
  }

  if (raw === 'apa7' || raw === 'apa_7' || raw === 'apa-7') {
    return 'APA 7';
  }

  return 'STN ISO 690';
}

function normalizeLanguage(value?: string | null): string {
  const raw = String(value || '').trim().toLowerCase();

  if (['sk', 'cs', 'en', 'de', 'pl', 'hu'].includes(raw)) {
    return raw;
  }

  if (raw.includes('sloven')) return 'sk';
  if (raw.includes('česk') || raw.includes('cesk') || raw.includes('czech')) return 'cs';
  if (raw.includes('english') || raw.includes('angl')) return 'en';
  if (raw.includes('deutsch') || raw.includes('nem')) return 'de';
  if (raw.includes('pol')) return 'pl';
  if (raw.includes('hung') || raw.includes('maď') || raw.includes('mad')) return 'hu';

  return 'sk';
}

function mapDbProfile(row: DbProfileRow | null): ProfileResponse | null {
  if (!row) return null;

  const now = new Date().toISOString();

  const citationStyle = normalizeCitationStyle(row.citation_style);
  const interfaceLanguage = normalizeLanguage(row.interface_language);
  const workLanguage = normalizeLanguage(row.work_language);

  const structure = row.structure || '';
  const requiredSections = row.required_sections || '';
  const recommendedLength = row.recommended_length || '';
  const aiInstruction = row.ai_instruction || '';

  return {
    id: row.id,

    title: row.title || '',
    topic: row.topic || '',
    type: row.type || 'bachelor',
    level: row.level || '',
    field: row.field || '',
    specialization: row.specialization || '',
    supervisor: row.supervisor || '',

    interfaceLanguage,
    workLanguage,

    citationStyle,
    citation: citationStyle,

    annotation: row.annotation || '',
    goal: row.goal || '',
    problem: row.research_problem || '',
    researchProblem: row.research_problem || '',
    methodology: row.methodology || '',
    hypotheses: row.hypotheses || '',
    researchQuestions: row.research_questions || '',
    practicalPart: row.practical_part || '',
    scientificContribution: row.scientific_contribution || '',
    sourcesRequirement: row.sources_requirement || '',

    structure,
    requiredSections,
    recommendedLength,
    aiInstruction,

    schema: {
      structure,
      requiredSections,
      recommendedLength,
      aiInstruction,
    },

    createdAt: row.created_at || now,
    updatedAt: row.updated_at || now,
    savedAt: row.updated_at || row.created_at || now,
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
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
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

    const profile = mapDbProfile(data as DbProfileRow | null);

    return NextResponse.json(
      {
        ok: true,
        profile,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      },
    );
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