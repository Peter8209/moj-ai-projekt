import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UserProfileInsert = {
  id: string;
  email: string;
  full_name: string;
  country: string;
  currency: string;
  plan: string;
  video_tutorial_seen: boolean;
  created_at: string;
  updated_at: string;
};

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

function getUserFullName(user: any) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')?.[0] ||
    ''
  );
}

export async function POST() {
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

    const email = user.email || '';

    if (!email) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Používateľ nemá priradený e-mail.',
        },
        { status: 400 },
      );
    }

    const { data: existingProfile, error: existingProfileError } =
      await supabase
        .from('user_profiles')
        .select(
          'id, email, full_name, country, currency, plan, video_tutorial_seen, created_at, updated_at',
        )
        .eq('id', user.id)
        .maybeSingle();

    if (existingProfileError) {
      return NextResponse.json(
        {
          ok: false,
          error: existingProfileError.message,
        },
        { status: 500 },
      );
    }

    if (existingProfile) {
      return NextResponse.json({
        ok: true,
        created: false,
        message: 'Profil používateľa už existuje.',
        profile: existingProfile,
      });
    }

    const now = new Date().toISOString();

    const profilePayload: UserProfileInsert = {
      id: user.id,
      email,
      full_name: getUserFullName(user),
      country: 'SK',
      currency: 'EUR',
      plan: 'free',
      video_tutorial_seen: false,
      created_at: now,
      updated_at: now,
    };

    const { data: createdProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert(profilePayload)
      .select(
        'id, email, full_name, country, currency, plan, video_tutorial_seen, created_at, updated_at',
      )
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          ok: false,
          error: insertError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      created: true,
      message: 'Profil používateľa bol vytvorený.',
      profile: createdProfile,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Nastala neočakávaná chyba pri vytváraní profilu používateľa.';

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}