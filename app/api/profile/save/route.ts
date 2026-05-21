import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProfileBody = {
  id?: string;
  profile_id?: string;

  title?: string;
  name?: string;
  topic?: string;
  type?: string;
  workType?: string;
  level?: string;
  field?: string;
  supervisor?: string;

  language?: string;
  interfaceLanguage?: string;
  workLanguage?: string;
  work_language?: string;

  citationStyle?: string;
  citation?: string;
  citation_style?: string;

  annotation?: string;
  goal?: string;
  researchProblem?: string;
  problem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;
  sourcesRequirement?: string;

  schema?: unknown;

  [key: string]: unknown;
};

type MissingField = {
  key: string;
  label: string;
  message: string;
};

type SaveError = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
};

type SafePayload = Record<string, unknown>;

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanLongText(value: unknown) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

/**
 * DÔLEŽITÉ:
 * Databáza používa hodnotu "cs" pre češtinu.
 * UI môže mať "cz", ale pred uložením do Supabase sa musí vždy zmeniť na "cs".
 */
function normalizeLanguage(value: unknown) {
  const language = cleanText(value || 'sk').toLowerCase();

  if (language === 'cz') return 'cs';

  if (['sk', 'cs', 'en', 'de', 'pl', 'hu'].includes(language)) {
    return language;
  }

  return 'sk';
}

function normalizeBody(body: ProfileBody, userEmail: string) {
  const rawTitle = cleanText(body.title || body.name);
  const rawTopic = cleanText(body.topic);
  const rawType = cleanText(body.type || body.workType);
  const rawLevel = cleanText(body.level);
  const rawField = cleanText(body.field);
  const rawSupervisor = cleanText(body.supervisor);
  const rawGoal = cleanLongText(body.goal);
  const rawMethodology = cleanLongText(body.methodology);

  const language = normalizeLanguage(body.language || body.interfaceLanguage);

  const workLanguage = normalizeLanguage(
    body.workLanguage || body.work_language || body.language || 'sk',
  );

  const citation =
    cleanText(body.citationStyle || body.citation || body.citation_style) ||
    'STN ISO 690';

  return {
    id: cleanText(body.id || body.profile_id),

    title: rawTitle || 'Prázdny profil',
    name: rawTitle || 'Prázdny profil',
    topic: rawTopic || 'Bez témy',
    type: rawType || 'bachelor',
    workType: rawType || 'bachelor',
    level: rawLevel || 'bakalárska práca',
    field: rawField,
    supervisor: rawSupervisor,

    language,
    interfaceLanguage: language,
    workLanguage,
    work_language: workLanguage,

    citation,
    citationStyle: citation,
    citation_style: citation,

    annotation: cleanLongText(body.annotation),
    goal: rawGoal,
    researchProblem: cleanLongText(body.researchProblem || body.problem),
    problem: cleanLongText(body.problem || body.researchProblem),
    methodology: rawMethodology,
    hypotheses: cleanLongText(body.hypotheses),
    researchQuestions: cleanLongText(body.researchQuestions),
    practicalPart: cleanLongText(body.practicalPart),
    scientificContribution: cleanLongText(body.scientificContribution),
    sourcesRequirement: cleanLongText(body.sourcesRequirement),

    schema: body.schema || null,

    email: userEmail,
  };
}

function collectMissingFields(body: ProfileBody): MissingField[] {
  const missing: MissingField[] = [];

  const title = cleanText(body.title || body.name);
  const topic = cleanText(body.topic);
  const type = cleanText(body.type || body.workType);
  const level = cleanText(body.level);
  const field = cleanText(body.field);
  const language = cleanText(body.language || body.interfaceLanguage);
  const workLanguage = cleanText(
    body.workLanguage || body.work_language || body.language,
  );
  const citation = cleanText(
    body.citationStyle || body.citation || body.citation_style,
  );
  const goal = cleanLongText(body.goal);
  const methodology = cleanLongText(body.methodology);

  if (!title) {
    missing.push({
      key: 'title',
      label: 'Názov práce',
      message: 'Nie je vyplnený názov práce.',
    });
  }

  if (!topic) {
    missing.push({
      key: 'topic',
      label: 'Téma práce',
      message: 'Nie je vyplnená téma práce.',
    });
  }

  if (!type) {
    missing.push({
      key: 'type',
      label: 'Typ práce',
      message: 'Nie je vybraný typ práce.',
    });
  }

  if (!level) {
    missing.push({
      key: 'level',
      label: 'Stupeň práce',
      message: 'Nie je vyplnený stupeň práce.',
    });
  }

  if (!field) {
    missing.push({
      key: 'field',
      label: 'Odbor / oblasť',
      message: 'Nie je vyplnený odbor alebo oblasť práce.',
    });
  }

  if (!language) {
    missing.push({
      key: 'language',
      label: 'Jazyk rozhrania',
      message: 'Nie je nastavený jazyk rozhrania.',
    });
  }

  if (!workLanguage) {
    missing.push({
      key: 'workLanguage',
      label: 'Jazyk práce',
      message: 'Nie je nastený jazyk práce.',
    });
  }

  if (!citation) {
    missing.push({
      key: 'citationStyle',
      label: 'Citačný štýl',
      message: 'Nie je nastavený citačný štýl.',
    });
  }

  if (!goal) {
    missing.push({
      key: 'goal',
      label: 'Cieľ práce',
      message: 'Nie je vyplnený cieľ práce.',
    });
  }

  if (!methodology) {
    missing.push({
      key: 'methodology',
      label: 'Metodológia',
      message: 'Nie je vyplnená metodológia práce.',
    });
  }

  return missing;
}

function createMissingFieldsMessage(missingFields: MissingField[]) {
  if (missingFields.length === 0) {
    return 'Profil práce bol uložený do databázy.';
  }

  const labels = missingFields.map((item) => item.label).join(', ');

  return `Profil práce bol uložený do databázy, ale chýbajú tieto polia: ${labels}.`;
}

function mapProfile(row: any) {
  if (!row) return null;

  const profile = row.profile || row.content || {};

  return {
    id: row.id,
    user_id: row.user_id || profile.user_id || '',
    email: row.email || row.user_email || profile.email || '',

    title: profile.title || row.title || row.name || '',
    name: profile.name || profile.title || row.name || row.title || '',
    topic: profile.topic || row.topic || '',
    type: profile.type || profile.workType || row.type || '',
    workType: profile.workType || profile.type || row.type || '',
    level: profile.level || row.level || '',
    field: profile.field || row.field || '',
    supervisor: profile.supervisor || row.supervisor || '',

    language: normalizeLanguage(profile.language || row.language || 'sk'),

    interfaceLanguage: normalizeLanguage(
      profile.interfaceLanguage || profile.language || row.language || 'sk',
    ),

    workLanguage: normalizeLanguage(
      profile.workLanguage ||
        profile.work_language ||
        row.work_language ||
        row.language ||
        'sk',
    ),

    work_language: normalizeLanguage(
      profile.work_language ||
        profile.workLanguage ||
        row.work_language ||
        row.language ||
        'sk',
    ),

    citation:
      profile.citation ||
      profile.citationStyle ||
      profile.citation_style ||
      row.citation ||
      row.citation_style ||
      'STN ISO 690',

    citationStyle:
      profile.citationStyle ||
      profile.citation ||
      profile.citation_style ||
      row.citation ||
      row.citation_style ||
      'STN ISO 690',

    citation_style:
      profile.citation_style ||
      profile.citationStyle ||
      profile.citation ||
      row.citation ||
      row.citation_style ||
      'STN ISO 690',

    annotation: profile.annotation || row.annotation || '',
    goal: profile.goal || row.goal || '',

    researchProblem:
      profile.researchProblem ||
      profile.research_problem ||
      row.research_problem ||
      profile.problem ||
      '',

    problem:
      profile.problem ||
      profile.researchProblem ||
      profile.research_problem ||
      row.research_problem ||
      '',

    methodology: profile.methodology || row.methodology || '',
    hypotheses: profile.hypotheses || row.hypotheses || '',

    researchQuestions:
      profile.researchQuestions ||
      profile.research_questions ||
      row.research_questions ||
      '',

    practicalPart:
      profile.practicalPart ||
      profile.practical_part ||
      row.practical_part ||
      '',

    scientificContribution:
      profile.scientificContribution ||
      profile.scientific_contribution ||
      row.scientific_contribution ||
      '',

    sourcesRequirement:
      profile.sourcesRequirement ||
      profile.sources_requirement ||
      row.sources_requirement ||
      '',

    schema: profile.schema || row.schema || null,
    missingFields: profile.missingFields || [],

    createdAt: profile.createdAt || row.created_at || null,
    updatedAt: profile.updatedAt || row.updated_at || null,
  };
}

function createPayload({
  profileId,
  userId,
  userEmail,
  fullProfile,
  now,
}: {
  profileId: string;
  userId: string;
  userEmail: string;
  fullProfile: ReturnType<typeof normalizeBody> & {
    id: string;
    user_id: string;
    email: string;
    missingFields: MissingField[];
    createdAt: string;
    updatedAt: string;
  };
  now: string;
}) {
  return {
    id: profileId,
    user_id: userId,
    email: userEmail,

    title: fullProfile.title,
    topic: fullProfile.topic,
    type: fullProfile.type,
    level: fullProfile.level,
    field: fullProfile.field,
    supervisor: fullProfile.supervisor,

    language: normalizeLanguage(fullProfile.language),
    work_language: normalizeLanguage(fullProfile.workLanguage),
    citation: fullProfile.citation,

    content: {
      ...fullProfile,
      language: normalizeLanguage(fullProfile.language),
      interfaceLanguage: normalizeLanguage(fullProfile.interfaceLanguage),
      workLanguage: normalizeLanguage(fullProfile.workLanguage),
      work_language: normalizeLanguage(fullProfile.work_language),
    },

    profile: {
      ...fullProfile,
      language: normalizeLanguage(fullProfile.language),
      interfaceLanguage: normalizeLanguage(fullProfile.interfaceLanguage),
      workLanguage: normalizeLanguage(fullProfile.workLanguage),
      work_language: normalizeLanguage(fullProfile.work_language),
    },

    updated_at: now,
  };
}

function getDefaultValueForMissingColumn({
  column,
  userId,
  userEmail,
  profileId,
  fullProfile,
  now,
}: {
  column: string;
  userId: string;
  userEmail: string;
  profileId: string;
  fullProfile: Record<string, any>;
  now: string;
}) {
  const key = column.toLowerCase();

  if (key === 'id') return profileId;
  if (key === 'user_id') return userId;
  if (key === 'email') return userEmail;
  if (key === 'user_email') return userEmail;

  if (key === 'name') return fullProfile.title || 'Prázdny profil';
  if (key === 'title') return fullProfile.title || 'Prázdny profil';
  if (key === 'topic') return fullProfile.topic || 'Bez témy';
  if (key === 'type') return fullProfile.type || 'bachelor';

  if (key === 'work_type') {
    return fullProfile.workType || fullProfile.type || 'bachelor';
  }

  if (key === 'level') return fullProfile.level || 'bakalárska práca';
  if (key === 'field') return fullProfile.field || '';
  if (key === 'supervisor') return fullProfile.supervisor || '';

  if (key === 'language') {
    return normalizeLanguage(fullProfile.language || 'sk');
  }

  if (key === 'interface_language') {
    return normalizeLanguage(
      fullProfile.interfaceLanguage || fullProfile.language || 'sk',
    );
  }

  if (key === 'work_language') {
    return normalizeLanguage(fullProfile.workLanguage || 'sk');
  }

  if (key === 'citation') return fullProfile.citation || 'STN ISO 690';

  if (key === 'citation_style') {
    return fullProfile.citation || 'STN ISO 690';
  }

  if (key === 'annotation') return fullProfile.annotation || '';
  if (key === 'goal') return fullProfile.goal || '';

  if (key === 'research_problem') {
    return fullProfile.researchProblem || fullProfile.problem || '';
  }

  if (key === 'problem') {
    return fullProfile.problem || fullProfile.researchProblem || '';
  }

  if (key === 'methodology') return fullProfile.methodology || '';
  if (key === 'hypotheses') return fullProfile.hypotheses || '';

  if (key === 'research_questions') {
    return fullProfile.researchQuestions || '';
  }

  if (key === 'practical_part') return fullProfile.practicalPart || '';

  if (key === 'scientific_contribution') {
    return fullProfile.scientificContribution || '';
  }

  if (key === 'sources_requirement') {
    return fullProfile.sourcesRequirement || '';
  }

  if (key === 'plan') return 'free';
  if (key === 'currency') return 'EUR';
  if (key === 'status') return 'active';
  if (key === 'role') return 'user';

  if (key === 'content') return fullProfile;
  if (key === 'profile') return fullProfile;
  if (key === 'schema') return fullProfile.schema || null;

  if (key === 'created_at') return fullProfile.createdAt || now;
  if (key === 'updated_at') return now;

  return '';
}

function getMissingNotNullColumnFromError(error: SaveError) {
  const message = String(error?.message || '');
  const match = message.match(/null value in column "([^"]+)"/i);

  return match?.[1] || '';
}

function getSchemaMissingColumnFromError(error: SaveError) {
  const message = String(error?.message || '');
  const match = message.match(/Could not find the '([^']+)' column/i);

  return match?.[1] || '';
}

function getCheckConstraintFromError(error: SaveError) {
  const message = String(error?.message || '');
  const match = message.match(/violates check constraint "([^"]+)"/i);

  return match?.[1] || '';
}

function isLanguageCheckConstraint(error: SaveError) {
  const constraint = getCheckConstraintFromError(error);

  return (
    constraint.includes('language') ||
    constraint.includes('work_language') ||
    String(error?.message || '').includes('work_language_check') ||
    String(error?.message || '').includes('language_check')
  );
}

function isDuplicateUserProfileError(error: SaveError) {
  const message = String(error?.message || '').toLowerCase();

  return (
    error?.code === '23505' ||
    message.includes('duplicate key') ||
    message.includes('unique constraint')
  );
}

function isRlsError(error: SaveError) {
  const message = String(error?.message || '').toLowerCase();

  return (
    error?.code === '42501' ||
    message.includes('row-level security') ||
    message.includes('permission denied')
  );
}

function createFriendlyDatabaseError(error: SaveError) {
  if (isRlsError(error)) {
    return 'Databáza odmietla zápis cez RLS pravidlá. Skontroluj policies pre tabuľku user_profiles.';
  }

  if (isLanguageCheckConstraint(error)) {
    return 'Databáza odmietla jazyk práce. Hodnota musí byť jedna z: sk, cs, en, de, pl, hu. Hodnota cz sa musí ukladať ako cs.';
  }

  const missingColumn = getMissingNotNullColumnFromError(error);

  if (missingColumn) {
    return `Databáza vyžaduje povinný stĺpec "${missingColumn}". API sa ho pokúsilo doplniť, ale zápis stále zlyhal.`;
  }

  const schemaMissingColumn = getSchemaMissingColumnFromError(error);

  if (schemaMissingColumn) {
    return `V tabuľke user_profiles chýba stĺpec "${schemaMissingColumn}", ktorý sa aplikácia pokúsila uložiť.`;
  }

  return (
    error?.message ||
    error?.details ||
    error?.hint ||
    'Profil práce sa nepodarilo uložiť do databázy.'
  );
}

async function runSave({
  supabase,
  existingProfile,
  payload,
  now,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  existingProfile: any;
  payload: SafePayload;
  now: string;
  userId: string;
}) {
  if (existingProfile?.id) {
    return await supabase
      .from('user_profiles')
      .update(payload)
      .eq('id', existingProfile.id)
      .eq('user_id', userId)
      .select('*')
      .single();
  }

  return await supabase
    .from('user_profiles')
    .insert({
      ...payload,
      created_at: now,
    })
    .select('*')
    .single();
}

async function findLatestProfileForUser({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  const byUpdatedAt = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!byUpdatedAt.error) {
    return byUpdatedAt;
  }

  const byCreatedAt = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!byCreatedAt.error) {
    return byCreatedAt;
  }

  return await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
}

function forceSafeLanguagePayload(payload: SafePayload) {
  return {
    ...payload,
    language: normalizeLanguage(payload.language || 'sk'),
    work_language: normalizeLanguage(payload.work_language || 'sk'),
    content:
      payload.content && typeof payload.content === 'object'
        ? {
            ...(payload.content as Record<string, unknown>),
            language: normalizeLanguage(
              (payload.content as Record<string, unknown>).language || 'sk',
            ),
            interfaceLanguage: normalizeLanguage(
              (payload.content as Record<string, unknown>).interfaceLanguage ||
                'sk',
            ),
            workLanguage: normalizeLanguage(
              (payload.content as Record<string, unknown>).workLanguage || 'sk',
            ),
            work_language: normalizeLanguage(
              (payload.content as Record<string, unknown>).work_language ||
                'sk',
            ),
          }
        : payload.content,
    profile:
      payload.profile && typeof payload.profile === 'object'
        ? {
            ...(payload.profile as Record<string, unknown>),
            language: normalizeLanguage(
              (payload.profile as Record<string, unknown>).language || 'sk',
            ),
            interfaceLanguage: normalizeLanguage(
              (payload.profile as Record<string, unknown>).interfaceLanguage ||
                'sk',
            ),
            workLanguage: normalizeLanguage(
              (payload.profile as Record<string, unknown>).workLanguage || 'sk',
            ),
            work_language: normalizeLanguage(
              (payload.profile as Record<string, unknown>).work_language ||
                'sk',
            ),
          }
        : payload.profile,
  };
}

async function saveProfileWithRetry({
  supabase,
  existingProfile,
  basePayload,
  now,
  userId,
  userEmail,
  profileId,
  fullProfile,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  existingProfile: any;
  basePayload: SafePayload;
  now: string;
  userId: string;
  userEmail: string;
  profileId: string;
  fullProfile: Record<string, any>;
}) {
  let payload: SafePayload = forceSafeLanguagePayload(basePayload);
  let currentExistingProfile = existingProfile;
  let lastError: SaveError | null = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await runSave({
      supabase,
      existingProfile: currentExistingProfile,
      payload,
      now,
      userId,
    });

    if (!error) {
      return {
        data,
        error: null,
        usedPayload: payload,
      };
    }

    lastError = error;

    if (isLanguageCheckConstraint(error)) {
      payload = forceSafeLanguagePayload(payload);
      payload.language = 'sk';
      payload.work_language = 'sk';

      if (payload.content && typeof payload.content === 'object') {
        payload.content = {
          ...(payload.content as Record<string, unknown>),
          language: 'sk',
          interfaceLanguage: 'sk',
          workLanguage: 'sk',
          work_language: 'sk',
        };
      }

      if (payload.profile && typeof payload.profile === 'object') {
        payload.profile = {
          ...(payload.profile as Record<string, unknown>),
          language: 'sk',
          interfaceLanguage: 'sk',
          workLanguage: 'sk',
          work_language: 'sk',
        };
      }

      continue;
    }

    if (isDuplicateUserProfileError(error)) {
      const existingResult = await findLatestProfileForUser({
        supabase,
        userId,
      });

      if (!existingResult.error && existingResult.data?.id) {
        currentExistingProfile = existingResult.data;
        continue;
      }
    }

    const missingNotNullColumn = getMissingNotNullColumnFromError(error);

    if (missingNotNullColumn) {
      payload = {
        ...payload,
        [missingNotNullColumn]: getDefaultValueForMissingColumn({
          column: missingNotNullColumn,
          userId,
          userEmail,
          profileId,
          fullProfile,
          now,
        }),
      };

      payload = forceSafeLanguagePayload(payload);

      continue;
    }

    const schemaMissingColumn = getSchemaMissingColumnFromError(error);

    if (schemaMissingColumn && schemaMissingColumn in payload) {
      const nextPayload = { ...payload };
      delete nextPayload[schemaMissingColumn];
      payload = forceSafeLanguagePayload(nextPayload);

      continue;
    }

    return {
      data: null,
      error,
      usedPayload: payload,
    };
  }

  return {
    data: null,
    error: lastError,
    usedPayload: payload,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProfileBody;
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

    const userEmail = user.email || '';

    if (!userEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: 'USER_EMAIL_MISSING',
          message: 'Prihlásený používateľ nemá e-mail v Supabase Auth.',
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const normalizedProfile = normalizeBody(body, userEmail);
    const missingFields = collectMissingFields(body);
    const requestedProfileId = cleanText(body.id || body.profile_id);

    let existingProfile: any = null;

    if (requestedProfileId) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', requestedProfileId)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('PROFILE_FIND_BY_ID_ERROR:', error);

        return NextResponse.json(
          {
            ok: false,
            error: 'PROFILE_FIND_BY_ID_ERROR',
            message: createFriendlyDatabaseError(error),
            technicalMessage: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          },
          { status: 500 },
        );
      }

      existingProfile = data;
    }

    if (!existingProfile) {
      const { data, error } = await findLatestProfileForUser({
        supabase,
        userId: user.id,
      });

      if (error) {
        console.error('PROFILE_FIND_BY_USER_ERROR:', error);

        return NextResponse.json(
          {
            ok: false,
            error: 'PROFILE_FIND_BY_USER_ERROR',
            message: createFriendlyDatabaseError(error),
            technicalMessage: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          },
          { status: 500 },
        );
      }

      existingProfile = data;
    }

    const profileId = existingProfile?.id || crypto.randomUUID();

    const fullProfile = {
      ...normalizedProfile,
      id: profileId,
      user_id: user.id,
      email: userEmail,

      language: normalizeLanguage(normalizedProfile.language),
      interfaceLanguage: normalizeLanguage(normalizedProfile.interfaceLanguage),
      workLanguage: normalizeLanguage(normalizedProfile.workLanguage),
      work_language: normalizeLanguage(normalizedProfile.work_language),

      missingFields,

      createdAt:
        existingProfile?.profile?.createdAt ||
        existingProfile?.content?.createdAt ||
        existingProfile?.created_at ||
        now,

      updatedAt: now,
    };

    const basePayload = createPayload({
      profileId,
      userId: user.id,
      userEmail,
      fullProfile,
      now,
    });

    const {
      data: savedProfile,
      error: saveError,
      usedPayload,
    } = await saveProfileWithRetry({
      supabase,
      existingProfile,
      basePayload,
      now,
      userId: user.id,
      userEmail,
      profileId,
      fullProfile,
    });

    if (saveError) {
      console.error('PROFILE_SAVE_DATABASE_ERROR:', saveError);

      return NextResponse.json(
        {
          ok: false,
          error: 'PROFILE_SAVE_DATABASE_ERROR',
          message: createFriendlyDatabaseError(saveError),
          technicalMessage: saveError.message,
          details: saveError.details,
          hint: saveError.hint,
          code: saveError.code,
          missingFields,
          usedPayload,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: createMissingFieldsMessage(missingFields),
      warning:
        missingFields.length > 0
          ? 'Profil je uložený, ale niektoré dôležité polia nie sú vyplnené.'
          : '',
      missingFields,
      profile: mapProfile(savedProfile),
      rawProfile: savedProfile,
    });
  } catch (error: any) {
    console.error('PROFILE_SAVE_FATAL_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'PROFILE_SAVE_FATAL_ERROR',
        message: error?.message || 'Profil sa nepodarilo uložiť.',
      },
      { status: 500 },
    );
  }
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
          exists: false,
          reason: 'NOT_AUTHENTICATED',
          message: 'Používateľ nie je prihlásený.',
        },
        { status: 401 },
      );
    }

    const { data, error } = await findLatestProfileForUser({
      supabase,
      userId: user.id,
    });

    if (error) {
      console.error('PROFILE_GET_DATABASE_ERROR:', error);

      return NextResponse.json(
        {
          ok: false,
          profile: null,
          exists: false,
          reason: 'DATABASE_ERROR',
          message: createFriendlyDatabaseError(error),
          technicalMessage: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      profile: mapProfile(data),
      exists: !!data,
      rawProfile: data,
    });
  } catch (error: any) {
    console.error('PROFILE_GET_FATAL_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        profile: null,
        exists: false,
        reason: 'PROFILE_GET_FATAL_ERROR',
        message: error?.message || 'Profil sa nepodarilo načítať.',
      },
      { status: 500 },
    );
  }
}