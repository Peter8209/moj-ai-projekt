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

function makePreview(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

function normalizeItem(item: any) {
  const module = normalizeModule(item.module || item.type);

  return {
    id: item.id,
    module,
    title: item.title || null,
    user_message: item.user_message || item.preview || '',
    assistant_message: item.assistant_message || item.content || item.preview || '',
    result: item.result || null,
    created_at: item.created_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('HISTORY_AUTH_ERROR:', userError);

      return NextResponse.json(
        {
          ok: false,
          reason: 'NOT_AUTHENTICATED',
          message:
            'Používateľ nie je prihlásený alebo server nevie načítať session cookies.',
          items: [],
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const moduleParam = searchParams.get('module');
    const module = moduleParam ? normalizeModule(moduleParam) : null;

    let query = supabase
      .from('history')
      .select(
        'id, user_id, module, type, title, user_message, assistant_message, preview, content, result, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(300);

    if (module && module !== 'chat') {
      query = query.or(`module.eq.${module},type.eq.${module}`);
    }

    if (module && module === 'chat') {
      query = query.or('module.eq.chat,type.eq.chat,module.eq.ai-chat,type.eq.ai-chat');
    }

    const { data, error } = await query;

    if (error) {
      console.error('HISTORY_GET_DATABASE_ERROR:', error);

      return NextResponse.json(
        {
          ok: false,
          reason: 'DATABASE_ERROR',
          message: error.message,
          items: [],
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      userId: user.id,
      items: (data || []).map(normalizeItem),
    });
  } catch (error) {
    console.error('HISTORY_GET_FATAL_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        reason: 'SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Históriu sa nepodarilo načítať.',
        items: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('HISTORY_POST_AUTH_ERROR:', userError);

      return NextResponse.json(
        {
          ok: false,
          reason: 'NOT_AUTHENTICATED',
          message:
            'Používateľ nie je prihlásený alebo server nevie načítať session cookies.',
        },
        { status: 401 },
      );
    }

    const body = await req.json();

    const module = normalizeModule(body.module || body.type);
    const title = String(body.title || '').trim() || 'Uložený výstup';

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
      return NextResponse.json(
        {
          ok: false,
          reason: 'EMPTY_CONTENT',
          message: 'Nie je čo uložiť do histórie.',
        },
        { status: 400 },
      );
    }

    const payload = {
      user_id: user.id,
      module,
      type: module,
      title,
      user_message: userMessage,
      assistant_message: assistantMessage,
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

      return NextResponse.json(
        {
          ok: false,
          reason: 'DATABASE_ERROR',
          message: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: normalizeItem(data),
    });
  } catch (error) {
    console.error('HISTORY_POST_FATAL_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        reason: 'SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Históriu sa nepodarilo uložiť.',
      },
      { status: 500 },
    );
  }
}