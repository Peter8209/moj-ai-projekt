import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function createRouteSupabaseClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. Skontroluj .env.local alebo Vercel Environment Variables.',
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Skontroluj .env.local alebo Vercel Environment Variables.',
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },

      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Niektoré serverové kontexty Next.js neumožňujú zápis cookies.
        }
      },
    },
  });
}

export async function GET() {
  try {
    const supabase = await createRouteSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Používateľ nie je prihlásený.',
        },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(
        'id, email, full_name, country, currency, plan, video_tutorial_seen, created_at, updated_at',
      )
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        {
          ok: false,
          error: profileError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email || '',
      },
      profile,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Nastala neočakávaná chyba pri načítaní profilu používateľa.';

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}