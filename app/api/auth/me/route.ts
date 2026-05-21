import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('AUTH_ME_ERROR:', error);

      return NextResponse.json(
        {
          ok: false,
          user: null,
          reason: 'NOT_AUTHENTICATED',
          message:
            error?.message ||
            'Server nevidí Supabase session. Používateľ nie je prihlásený.',
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('AUTH_ME_FATAL_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        user: null,
        reason: 'SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa overiť používateľa.',
      },
      { status: 500 },
    );
  }
}