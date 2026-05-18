import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type HistoryType =
  | 'chat'
  | 'write'
  | 'supervisor'
  | 'audit'
  | 'defense'
  | 'sources'
  | 'data'
  | 'planning'
  | 'emails'
  | 'translation';

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function createTitle(value: string, fallback = 'Nová konverzácia'): string {
  const text = cleanText(value)
    .replace(/\s+/g, ' ')
    .replace(/^AI Vedúci[:\-\s]*/i, '')
    .trim();

  if (!text) return fallback;

  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}

function createPreview(value: string): string {
  const text = cleanText(value).replace(/\s+/g, ' ');

  if (!text) return '';

  return text.length > 220 ? `${text.slice(0, 220)}...` : text;
}

function getEmailFromRequest(request: Request, fallback?: string | null): string {
  const headerEmail = request.headers.get('x-user-email');

  const email =
    cleanText(fallback) ||
    cleanText(headerEmail) ||
    'demo@zedpera.com';

  return email.toLowerCase();
}

// =====================================================
// GET - NAČÍTANIE HISTÓRIE
// =====================================================

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);

    const email = getEmailFromRequest(request, searchParams.get('email'));
    const type = searchParams.get('type');
    const q = searchParams.get('q')?.trim() || '';
    const limit = Math.min(Number(searchParams.get('limit') || 100), 100);

    let query = supabase
      .from('history_items')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (q) {
      query = query.or(
        `title.ilike.%${q}%,preview.ilike.%${q}%,content.ilike.%${q}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('History GET error:', error);

      return NextResponse.json(
        {
          ok: false,
          error: 'Históriu sa nepodarilo načítať.',
          detail: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      items: data || [],
    });
  } catch (error) {
    console.error('History GET fatal error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Interná chyba pri načítaní histórie.',
      },
      { status: 500 },
    );
  }
}

// =====================================================
// POST - ULOŽENIE DO HISTÓRIE
// =====================================================

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const userEmail =
      cleanText(body.userEmail) ||
      cleanText(body.email) ||
      getEmailFromRequest(request, null);

    const type: HistoryType = body.type || 'chat';

    const rawContent =
      cleanText(body.content) ||
      cleanText(body.answer) ||
      cleanText(body.result) ||
      cleanText(body.message);

    const rawPrompt =
      cleanText(body.prompt) ||
      cleanText(body.question) ||
      cleanText(body.input);

    const title = createTitle(
      cleanText(body.title) || rawPrompt || rawContent,
      'Nová konverzácia',
    );

    const preview = createPreview(
      cleanText(body.preview) || rawContent || rawPrompt,
    );

    if (!rawContent && !rawPrompt) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba obsah na uloženie do histórie.',
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('history_items')
      .insert({
        user_email: userEmail.toLowerCase(),
        type,
        title,
        preview,
        content: rawContent || rawPrompt,
        metadata: {
          prompt: rawPrompt,
          module: body.module || type,
          source: body.source || 'zedpera',
          savedAt: new Date().toISOString(),
          ...(body.metadata || {}),
        },
      })
      .select('*')
      .single();

    if (error) {
      console.error('History POST error:', error);

      return NextResponse.json(
        {
          ok: false,
          error: 'Záznam sa nepodarilo uložiť do histórie.',
          detail: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: data,
    });
  } catch (error) {
    console.error('History POST fatal error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Interná chyba pri ukladaní histórie.',
      },
      { status: 500 },
    );
  }
}

// =====================================================
// DELETE - VYMAZANIE ZÁZNAMU
// =====================================================

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const email = getEmailFromRequest(request, searchParams.get('email'));

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba ID záznamu.',
        },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('history_items')
      .delete()
      .eq('id', id)
      .eq('user_email', email);

    if (error) {
      console.error('History DELETE error:', error);

      return NextResponse.json(
        {
          ok: false,
          error: 'Záznam sa nepodarilo vymazať.',
          detail: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error('History DELETE fatal error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Interná chyba pri mazaní histórie.',
      },
      { status: 500 },
    );
  }
}