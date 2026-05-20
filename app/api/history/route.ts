import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
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
          error: 'Používateľ nie je prihlásený.',
          authRequired: true,
          items: [],
        },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const module = url.searchParams.get('module');

    let query = supabase
      .from('chat_history')
      .select(
        'id, user_id, profile_id, module, title, user_message, assistant_message, result, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(300);

    if (module && module !== 'all') {
      query = query.eq('module', module);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          items: [],
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      items: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Históriu sa nepodarilo načítať.',
        items: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
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
          error: 'Používateľ nie je prihlásený.',
          authRequired: true,
        },
        { status: 401 },
      );
    }

    const body = await req.json();

    const module = String(body.module || 'chat');
    const title = String(body.title || 'Nový záznam');
    const userMessage = String(body.userMessage || '');
    const assistantMessage = String(body.assistantMessage || '');

    if (!assistantMessage.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba výstup na uloženie do histórie.',
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('chat_history')
      .insert({
        user_id: user.id,
        profile_id: body.profileId || null,
        module,
        title,
        user_message: userMessage,
        assistant_message: assistantMessage,
        result: body.result || {},
      })
      .select('id')
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
      id: data.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Históriu sa nepodarilo uložiť.',
      },
      { status: 500 },
    );
  }
}