import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

const AI_CHAT_MODULE = 'chat';
const AI_CHAT_TITLE = 'AI chat';

function isAiChatModule(value: unknown) {
  const module = String(value || '').trim().toLowerCase();

  return (
    !module ||
    module === 'chat' ||
    module === 'ai-chat' ||
    module === 'ai' ||
    module === 'ai_chat'
  );
}

function makePreview(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);
}

function normalizeItem(item: HistoryRow) {
  return {
    id: item.id,
    module: AI_CHAT_MODULE,
    type: AI_CHAT_MODULE,
    title: item.title || AI_CHAT_TITLE,
    user_message: item.user_message || '',
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
    const { supabase, user, error: userError } =
      await getAuthenticatedUser();

    if (userError || !user) {
      console.error('AI_CHAT_HISTORY_AUTH_ERROR:', userError);

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
    const limitParam = searchParams.get('limit');

    const limit = Math.min(Math.max(Number(limitParam || 300), 1), 300);

    const { data, error } = await supabase
      .from('history')
      .select(
        'id, user_id, module, type, title, user_message, assistant_message, preview, content, result, created_at',
      )
      .eq('user_id', user.id)
      .or(
        'module.eq.chat,type.eq.chat,module.eq.ai-chat,type.eq.ai-chat,module.eq.ai,type.eq.ai,module.eq.ai_chat,type.eq.ai_chat',
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('AI_CHAT_HISTORY_GET_DATABASE_ERROR:', error);

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
      scope: 'ai-chat-only',
      userId: user.id,
      items: Array.isArray(data)
        ? data.map((item) => normalizeItem(item as HistoryRow))
        : [],
    });
  } catch (error) {
    console.error('AI_CHAT_HISTORY_GET_FATAL_ERROR:', error);

    return jsonResponse(
      {
        ok: false,
        reason: 'SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Históriu AI chatu sa nepodarilo načítať.',
        items: [],
      },
      500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user, error: userError } =
      await getAuthenticatedUser();

    if (userError || !user) {
      console.error('AI_CHAT_HISTORY_POST_AUTH_ERROR:', userError);

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

    const body = (await req.json().catch(() => null)) as
      | HistoryRequestBody
      | null;

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

    const incomingModule = body.module || body.type;

    if (!isAiChatModule(incomingModule)) {
      return jsonResponse(
        {
          ok: true,
          skipped: true,
          reason: 'AI_CHAT_HISTORY_ONLY',
          message:
            'Táto história je určená iba pre AI chat. Záznam z iného modulu sa neuložil.',
        },
        200,
      );
    }

    const title =
      String(body.title || '').trim().slice(0, 180) || AI_CHAT_TITLE;

    const userMessage = String(
      body.user_message ||
        body.userMessage ||
        body.question ||
        body.input ||
        '',
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
          message: 'Nie je čo uložiť do histórie AI chatu.',
        },
        400,
      );
    }

    const payload = {
      user_id: user.id,
      module: AI_CHAT_MODULE,
      type: AI_CHAT_MODULE,
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
      console.error('AI_CHAT_HISTORY_POST_DATABASE_ERROR:', error);

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
      scope: 'ai-chat-only',
      item: normalizeItem(data as HistoryRow),
    });
  } catch (error) {
    console.error('AI_CHAT_HISTORY_POST_FATAL_ERROR:', error);

    return jsonResponse(
      {
        ok: false,
        reason: 'SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Históriu AI chatu sa nepodarilo uložiť.',
      },
      500,
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user, error: userError } =
      await getAuthenticatedUser();

    if (userError || !user) {
      console.error('AI_CHAT_HISTORY_DELETE_AUTH_ERROR:', userError);

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
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll) {
      const { error } = await supabase
        .from('history')
        .delete()
        .eq('user_id', user.id)
        .or(
          'module.eq.chat,type.eq.chat,module.eq.ai-chat,type.eq.ai-chat,module.eq.ai,type.eq.ai,module.eq.ai_chat,type.eq.ai_chat',
        );

      if (error) {
        console.error('AI_CHAT_HISTORY_DELETE_ALL_DATABASE_ERROR:', error);

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
        scope: 'ai-chat-only',
        deleted: 'all-ai-chat-history',
      });
    }

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
      .eq('user_id', user.id)
      .or(
        'module.eq.chat,type.eq.chat,module.eq.ai-chat,type.eq.ai-chat,module.eq.ai,type.eq.ai,module.eq.ai_chat,type.eq.ai_chat',
      );

    if (error) {
      console.error('AI_CHAT_HISTORY_DELETE_DATABASE_ERROR:', error);

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
      scope: 'ai-chat-only',
      deletedId: id,
    });
  } catch (error) {
    console.error('AI_CHAT_HISTORY_DELETE_FATAL_ERROR:', error);

    return jsonResponse(
      {
        ok: false,
        reason: 'SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Záznam z histórie AI chatu sa nepodarilo vymazať.',
      },
      500,
    );
  }
}