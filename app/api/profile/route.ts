import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type WorkType = 'seminar' | 'bachelor' | 'master';
type ProfileLanguage = 'SK' | 'CZ' | 'EN' | 'DE' | 'PL' | 'HU';
type CitationStyle = 'APA' | 'ISO' | 'MLA' | 'HARVARD';

type Profile = {
  id: string;

  // ===============================
  // 📘 ZÁKLAD
  // ===============================
  workType: WorkType;
  title: string;
  topic: string;
  field: string;

  // ===============================
  // 🌍 JAZYK + CITÁCIE
  // ===============================
  language: ProfileLanguage;
  citationStyle: CitationStyle;

  // ===============================
  // 🎓 VEDÚCI
  // ===============================
  supervisor: string;

  // ===============================
  // 📄 OBSAH
  // ===============================
  annotation: string;
  goal: string;
  outline: string;

  hypotheses: string;
  methodology: string;

  keywords: string;
  chapters: number;

  // ===============================
  // ⚙️ META
  // ===============================
  createdAt: string;
  updatedAt: string;
};

const allowedWorkTypes: WorkType[] = ['seminar', 'bachelor', 'master'];

const allowedLanguages: ProfileLanguage[] = [
  'SK',
  'CZ',
  'EN',
  'DE',
  'PL',
  'HU',
];

const allowedCitationStyles: CitationStyle[] = [
  'APA',
  'ISO',
  'MLA',
  'HARVARD',
];

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanLongText(value: unknown) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function normalizeWorkType(value: unknown): WorkType | null {
  const text = cleanText(value).toLowerCase();

  if (allowedWorkTypes.includes(text as WorkType)) {
    return text as WorkType;
  }

  return null;
}

function normalizeLanguage(value: unknown): ProfileLanguage | null {
  const text = cleanText(value).toUpperCase();

  if (allowedLanguages.includes(text as ProfileLanguage)) {
    return text as ProfileLanguage;
  }

  return null;
}

function normalizeCitationStyle(value: unknown): CitationStyle | null {
  const text = cleanText(value).toUpperCase();

  if (allowedCitationStyles.includes(text as CitationStyle)) {
    return text as CitationStyle;
  }

  return null;
}

function normalizeChapters(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.round(number);
}

function createValidationError(error: string, message: string) {
  return NextResponse.json(
    {
      ok: false,
      error,
      message,
    },
    { status: 400 },
  );
}

function normalizeProfileFromBody(body: any): Omit<Profile, 'id' | 'createdAt' | 'updatedAt'> {
  const profileSource = body?.profile && typeof body.profile === 'object'
    ? body.profile
    : body;

  const workType = normalizeWorkType(profileSource.workType);
  const language = normalizeLanguage(profileSource.language);
  const citationStyle = normalizeCitationStyle(profileSource.citationStyle);
  const chapters = normalizeChapters(profileSource.chapters);

  return {
    workType: workType || 'seminar',
    title: cleanText(profileSource.title),
    topic: cleanText(profileSource.topic),
    field: cleanText(profileSource.field),

    language: language || 'SK',
    citationStyle: citationStyle || 'APA',

    supervisor: cleanText(profileSource.supervisor),

    annotation: cleanLongText(profileSource.annotation),
    goal: cleanLongText(profileSource.goal),
    outline: cleanLongText(profileSource.outline),

    hypotheses: cleanLongText(profileSource.hypotheses),
    methodology: cleanLongText(profileSource.methodology),

    keywords: cleanText(profileSource.keywords),
    chapters,
  };
}

function validateProfile(profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>) {
  if (!profile.workType || !allowedWorkTypes.includes(profile.workType)) {
    return {
      error: 'WORK_TYPE_REQUIRED',
      message: 'Vyber typ práce.',
    };
  }

  if (!profile.title || profile.title.length < 5) {
    return {
      error: 'INVALID_TITLE',
      message: 'Názov práce musí mať aspoň 5 znakov.',
    };
  }

  if (!profile.topic || profile.topic.length < 5) {
    return {
      error: 'INVALID_TOPIC',
      message: 'Téma práce musí mať aspoň 5 znakov.',
    };
  }

  if (!profile.language || !allowedLanguages.includes(profile.language)) {
    return {
      error: 'LANGUAGE_REQUIRED',
      message: 'Vyber jazyk práce.',
    };
  }

  if (
    !profile.citationStyle ||
    !allowedCitationStyles.includes(profile.citationStyle)
  ) {
    return {
      error: 'CITATION_REQUIRED',
      message: 'Vyber citačný štýl.',
    };
  }

  if (!profile.goal || profile.goal.length < 10) {
    return {
      error: 'GOAL_REQUIRED',
      message: 'Cieľ práce musí mať aspoň 10 znakov.',
    };
  }

  if (!profile.methodology || profile.methodology.length < 3) {
    return {
      error: 'METHODOLOGY_REQUIRED',
      message: 'Doplň metodológiu práce.',
    };
  }

  if (!profile.chapters || profile.chapters < 1 || profile.chapters > 30) {
    return {
      error: 'INVALID_CHAPTERS',
      message: 'Počet kapitol musí byť od 1 do 30.',
    };
  }

  return null;
}

function mapDatabaseProfile(row: any): Profile | null {
  if (!row) return null;

  const profileData = row.profile || row.content || {};

  return {
    id: String(row.id || profileData.id || ''),

    workType:
      normalizeWorkType(profileData.workType || row.work_type || row.type) ||
      'seminar',

    title: cleanText(profileData.title || row.title),
    topic: cleanText(profileData.topic || row.topic),
    field: cleanText(profileData.field || row.field),

    language:
      normalizeLanguage(profileData.language || row.language) || 'SK',

    citationStyle:
      normalizeCitationStyle(
        profileData.citationStyle ||
          profileData.citation ||
          row.citation_style ||
          row.citation,
      ) || 'APA',

    supervisor: cleanText(profileData.supervisor || row.supervisor),

    annotation: cleanLongText(profileData.annotation),
    goal: cleanLongText(profileData.goal),
    outline: cleanLongText(profileData.outline),

    hypotheses: cleanLongText(profileData.hypotheses),
    methodology: cleanLongText(profileData.methodology),

    keywords: cleanText(profileData.keywords),
    chapters: normalizeChapters(profileData.chapters) || 1,

    createdAt:
      profileData.createdAt ||
      row.created_at ||
      new Date().toISOString(),

    updatedAt:
      profileData.updatedAt ||
      row.updated_at ||
      new Date().toISOString(),
  };
}

// =====================================================
// 📥 GET – načítanie profilu prihláseného používateľa
// =====================================================

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
          exists: false,
          reason: 'NOT_AUTHENTICATED',
          message: 'Používateľ nie je prihlásený.',
        },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('PROFILE_GET_DATABASE_ERROR:', error);

      return NextResponse.json(
        {
          ok: false,
          profile: null,
          exists: false,
          reason: 'DATABASE_ERROR',
          message: error.message,
        },
        { status: 500 },
      );
    }

    const profile = mapDatabaseProfile(data);

    return NextResponse.json({
      ok: true,
      profile,
      exists: !!profile,
    });
  } catch (err: any) {
    console.error('PROFILE_GET_ERROR:', err);

    return NextResponse.json(
      {
        ok: false,
        profile: null,
        exists: false,
        reason: 'PROFILE_GET_FAILED',
        message: err?.message || 'Profil práce sa nepodarilo načítať.',
      },
      { status: 500 },
    );
  }
}

// =====================================================
// 📤 POST – vytvorenie / update profilu
// =====================================================

export async function POST(req: NextRequest) {
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
          error: 'NOT_AUTHENTICATED',
          message: 'Používateľ nie je prihlásený.',
        },
        { status: 401 },
      );
    }

    const body = await req.json();

    const normalizedProfile = normalizeProfileFromBody(body);
    const validationError = validateProfile(normalizedProfile);

    if (validationError) {
      return createValidationError(
        validationError.error,
        validationError.message,
      );
    }

    const now = new Date().toISOString();

    const { data: existingProfile, error: existingError } = await supabase
      .from('user_profiles')
      .select('id, created_at, profile')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) {
      console.error('PROFILE_EXISTING_DATABASE_ERROR:', existingError);

      return NextResponse.json(
        {
          ok: false,
          error: 'DATABASE_ERROR',
          message: existingError.message,
        },
        { status: 500 },
      );
    }

    const profileId = existingProfile?.id || crypto.randomUUID();

    const fullProfile: Profile = {
      id: profileId,
      ...normalizedProfile,
      createdAt:
        existingProfile?.profile?.createdAt ||
        existingProfile?.created_at ||
        now,
      updatedAt: now,
    };

    const payload = {
      id: profileId,
      user_id: user.id,

      title: fullProfile.title,
      topic: fullProfile.topic,
      type: fullProfile.workType,
      field: fullProfile.field,
      supervisor: fullProfile.supervisor,
      citation: fullProfile.citationStyle,
      language: fullProfile.language,
      work_language: fullProfile.language,

      content: fullProfile,
      profile: fullProfile,

      updated_at: now,
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(payload, {
        onConflict: 'user_id',
      })
      .select('*')
      .single();

    if (error) {
      console.error('PROFILE_SAVE_DATABASE_ERROR:', error);

      return NextResponse.json(
        {
          ok: false,
          error: 'PROFILE_SAVE_DATABASE_ERROR',
          message: error.message || 'Profil práce sa nepodarilo uložiť.',
        },
        { status: 500 },
      );
    }

    const savedProfile = mapDatabaseProfile(data);

    return NextResponse.json({
      ok: true,
      message: existingProfile ? 'PROFILE_UPDATED' : 'PROFILE_CREATED',
      profile: savedProfile,
    });
  } catch (err: any) {
    console.error('PROFILE_POST_ERROR:', err);

    return NextResponse.json(
      {
        ok: false,
        error: 'PROFILE_FAILED',
        message: err?.message || 'Profil práce sa nepodarilo uložiť.',
      },
      { status: 500 },
    );
  }
}