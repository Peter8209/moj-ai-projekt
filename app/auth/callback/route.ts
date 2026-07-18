import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function createLoginUrl(
  request: NextRequest,
  params: Record<string, string>,
): URL {
  const url = new URL('/login', request.nextUrl.origin);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const language =
    request.nextUrl.searchParams.get('lang') || 'sk';

  if (!code) {
    return NextResponse.redirect(
      createLoginUrl(request, {
        error: 'confirmation_code_missing',
        lang: language,
      }),
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        createLoginUrl(request, {
          error: 'confirmation_failed',
          detail: error.message,
          lang: language,
        }),
      );
    }

    /**
     * exchangeCodeForSession vytvorí aktívnu reláciu. ZEDPERA však po
     * potvrdení e-mailu požaduje ručné prihlásenie, preto reláciu okamžite
     * zrušíme. Tým zabránime middleware alebo login stránke, aby používateľa
     * automaticky presmerovali do dashboardu.
     */
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.warn(
        'AUTH_CONFIRMATION_SIGN_OUT_WARNING:',
        signOutError.message,
      );
    }

    return NextResponse.redirect(
      createLoginUrl(request, {
        registration: 'confirmed',
        emailConfirmed: '1',
        clearLegacyAccountState: '1',
        lang: language,
      }),
    );
  } catch (callbackError: unknown) {
    const detail =
      callbackError instanceof Error
        ? callbackError.message
        : 'Unknown confirmation error';

    return NextResponse.redirect(
      createLoginUrl(request, {
        error: 'confirmation_failed',
        detail,
        lang: language,
      }),
    );
  }
}
