import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Používateľ nie je prihlásený.' },
        { status: 401 }
      );
    }

    const profile = await req.json();

    const title = String(profile?.title || '').trim();

    if (!title) {
      return NextResponse.json(
        { error: 'Chýba názov práce.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('zedpera_projects')
      .insert({
        user_id: user.id,
        title,
        work_type: profile?.type || profile?.schema?.label || null,
        work_language: profile?.workLanguage || profile?.language || 'SK',
        citation: profile?.citation || null,
        field: profile?.field || null,
        supervisor: profile?.supervisor || null,
        profile,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      project: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Neznáma chyba pri ukladaní profilu.',
      },
      { status: 500 }
    );
  }
}