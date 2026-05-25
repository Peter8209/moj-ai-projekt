import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type HistoryModule =
  | 'chat'
  | 'supervisor'
  | 'quality'
  | 'defense'
  | 'translation'
  | 'data'
  | 'planning'
  | 'emails'
  | 'originality'
  | 'humanizer'
  | 'sources';

type HistoryRow = {
  id: string;
  user_id?: string | null;
  module?: string | null;
  type?: string | null;
  title?: string | null;
  user_message?: string | null;
  assistant_message?: string | null;
  preview?: string | null;
  content?: string | null;
  result?: Record<string, unknown> | null;
  created_at?: string | null;
};

type HistoryRequestBody = {
  module?: string;
  type?: string;
  title?: string;
  user_message?: string;
  userMessage?: string;
  question?: string;
  input?: string;
  assistant_message?: string;
  assistantMessage?: string;
  answer?: string;
  output?: string;
  content?: string;
  preview?: string;
  result?: Record<string, unknown> | null;
};

const allowedModules: HistoryModule[] = [
  'chat',
  'supervisor',
  'quality',
  'defense',
  'translation',
  'data',
  'planning',
  'emails',
  'originality',
  'humanizer',
  'sources',
];

function normalizeModule(value: unknown): HistoryModule {
  const module = String(value || 'chat').trim();

  if (module === 'ai-chat') return 'chat';
  if (module === 'ai') return 'chat';
  if (module === 'audit') return 'quality';

  return allowedModules.includes(module as HistoryModule)
    ? (module as HistoryModule)
    : 'chat';
}

function getModuleLabel(module: HistoryModule) {
  if (module === 'supervisor') return 'AI vedúci';
  if (module === 'quality') return 'Audit kvality';
  if (module === 'defense') return 'Obhajoba';
  if (module === 'translation') return 'Preklad';
  if (module === 'data') return 'Analýza dát';
  if (module === 'planning') return 'Plánovanie';
  if (module === 'emails') return 'Emaily';
  if (module === 'originality') return 'Originalita';
  if (module === 'humanizer') return 'Humanizácia';
  if (module === 'sources') return 'Zdroje';

  return 'AI chat';
}

function makePreview(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);
}

function normalizeItem(item: HistoryRow) {
  const module = normalizeModule(item.module || item.type);

  return {
    id: item.id,
    module,
    title: item.title || getModuleLabel(module),
    user_message: item.user_message || item.preview || '',
    assistant_message:
      item.assistant_message || item.content || item.preview || '',
    preview: item.preview || '',
    content: item.content || '',
    result: item.result || null,
    created_at: item.created_at || new Date().toISOString(),
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
    error,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, user, error: userError } = await getAuthenticatedUser();

    if (userError || !user) {
      console.error('HISTORY_AUTH_ERROR:', userError);

      return jsonResponse(
        {
          ok: false,
          reason: 'NOT_AUTHENTICATED',
          message:
            'Používateľ nie je prihlásený alebo server nevie načítať session cookies.',
          items: [],
        },
        401,
      );
    }

    const { searchParams } = new URL(req.url);
    const moduleParam = searchParams.get('module');
    const limitParam = searchParams.get('limit');

    const limit = Math.min(Math.max(Number(limitParam || 300), 1), 300);
    const module = moduleParam && moduleParam !== 'all'
      ? normalizeModule(moduleParam)
      : null;

    let query = supabase
      .from('history')
      .select(
        'id, user_id, module, type, title, user_message, assistant_message, preview, content, result, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (module && module !== 'chat') {
      query = query.or(`module.eq.${module},type.eq.${module}`);
    }

    if (module && module === 'chat') {
      query = query.or(
        'module.eq.chat,type.eq.chat,module.eq.ai-chat,type.eq.ai-chat,module.eq.ai,type.eq.ai',
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('HISTORY_GET_DATABASE_ERROR:', error);

      return jsonResponse(
        {
          ok: false,
          reason: 'DATABASE_ERROR',
          message: error.message,
          items: [],
        },
        500,
      );
    }

    return jsonResponse({
      ok: true,
      userId: user.id,
      items: Array.isArray(data)
        ? data.map((item) => normalizeItem(item as HistoryRow))
        : [],
    });
  } catch (error) {
    console.error('HISTORY_GET_FATAL_ERROR:', error);

    return jsonResponse(
      {
        ok: false,
        reason: 'SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Históriu sa nepodarilo načítať.',
        items: [],
      },
      500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user, error: userError } = await getAuthenticatedUser();

    if (userError || !user) {
      console.error('HISTORY_POST_AUTH_ERROR:', userError);

      return jsonResponse(
        {
          ok: false,
          reason: 'NOT_AUTHENTICATED',
          message:
            'Používateľ nie je prihlásený alebo server nevie načítať session cookies.',
        },
        401,
      );
    }

    const body = (await req.json().catch(() => null)) as HistoryRequestBody | null;

    if (!body) {
      return jsonResponse(
        {
          ok: false,
          reason: 'INVALID_JSON',
          message: 'Neplatný JSON payload.',
        },
        400,
      );
    }

    const module = normalizeModule(body.module || body.type);
    const title =
      String(body.title || '').trim().slice(0, 180) || getModuleLabel(module);

    const userMessage = String(
      body.user_message || body.userMessage || body.question || body.input || '',
    ).trim();

    const assistantMessage = String(
      body.assistant_message ||
        body.assistantMessage ||
        body.answer ||
        body.output ||
        body.content ||
        '',
    ).trim();

    const preview = makePreview(
      body.preview || assistantMessage || userMessage || title,
    );

    if (!userMessage && !assistantMessage && !preview) {
      return jsonResponse(
        {
          ok: false,
          reason: 'EMPTY_CONTENT',
          message: 'Nie je čo uložiť do histórie.',
        },
        400,
      );
    }

    const payload = {
      user_id: user.id,
      module,
      type: module,
      title,
      user_message: userMessage || null,
      assistant_message: assistantMessage || null,
      preview,
      content: assistantMessage || userMessage || preview,
      result:
        body.result && typeof body.result === 'object'
          ? body.result
          : null,
    };

    const { data, error } = await supabase
      .from('history')
      .insert(payload)
      .select(
        'id, user_id, module, type, title, user_message, assistant_message, preview, content, result, created_at',
      )
      .single();

    if (error) {
      console.error('HISTORY_POST_DATABASE_ERROR:', error);

      return jsonResponse(
        {
          ok: false,
          reason: 'DATABASE_ERROR',
          message: error.message,
        },
        500,
      );
    }

    return jsonResponse({
      ok: true,
      item: normalizeItem(data as HistoryRow),
    });
  } catch (error) {
    console.error('HISTORY_POST_FATAL_ERROR:', error);

    return jsonResponse(
      {
        ok: false,
        reason: 'SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Históriu sa nepodarilo uložiť.',
      },
      500,
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user, error: userError } = await getAuthenticatedUser();

    if (userError || !user) {
      console.error('HISTORY_DELETE_AUTH_ERROR:', userError);

      return jsonResponse(
        {
          ok: false,
          reason: 'NOT_AUTHENTICATED',
          message:
            'Používateľ nie je prihlásený alebo server nevie načítať session cookies.',
        },
        401,
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return jsonResponse(
        {
          ok: false,
          reason: 'MISSING_ID',
          message: 'Chýba ID záznamu na vymazanie.',
        },
        400,
      );
    }

    const { error } = await supabase
      .from('history')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('HISTORY_DELETE_DATABASE_ERROR:', error);

      return jsonResponse(
        {
          ok: false,
          reason: 'DATABASE_ERROR',
          message: error.message,
        },
        500,
      );
    }

    return jsonResponse({
      ok: true,
      deletedId: id,
    });
  } catch (error) {
    console.error('HISTORY_DELETE_FATAL_ERROR:', error);

    return jsonResponse(
      {
        ok: false,
        reason: 'SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Záznam sa nepodarilo vymazať.',
      },
      500,
    );
  }
}