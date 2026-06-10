import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type ConsentRequestBody = {
  name?: string;
  email?: string;
  source?: string;
  planId?: string;
  termsAccepted?: boolean;
  marketingConsent?: boolean;
  termsConsentText?: string;
  marketingConsentText?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || '';
  }

  return request.headers.get('x-real-ip') || '';
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Chýba Supabase konfigurácia. Skontroluj NEXT_PUBLIC_SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY.',
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as ConsentRequestBody;

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const source = String(body.source || 'registration').trim();
    const planId = body.planId ? String(body.planId).trim() : null;

    const termsAccepted = Boolean(body.termsAccepted);
    const marketingConsent = Boolean(body.marketingConsent);

    const now = new Date().toISOString();

    const termsConsentText =
      body.termsConsentText ||
      'Súhlasím s obchodnými podmienkami a beriem na vedomie spracovanie osobných údajov.';

    const marketingConsentText =
      body.marketingConsentText ||
      'Súhlasím so zasielaním marketingových e-mailov, noviniek a ponúk služby Zedpera na uvedenú e-mailovú adresu. Súhlas môžem kedykoľvek odvolať.';

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Neplatná e-mailová adresa.',
        },
        { status: 400 },
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Je potrebné súhlasiť s obchodnými podmienkami.',
        },
        { status: 400 },
      );
    }

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error: contactError } = await supabase
      .from('marketing_contacts')
      .upsert(
        {
          email,
          name: name || null,
          source,
          plan_id: planId,

          terms_accepted: termsAccepted,
          terms_accepted_at: termsAccepted ? now : null,
          terms_consent_text: termsConsentText,

          marketing_consent: marketingConsent,
          marketing_consent_at: marketingConsent ? now : null,
          marketing_consent_text: marketingConsent
            ? marketingConsentText
            : null,

          ip_address: ipAddress || null,
          user_agent: userAgent || null,

          updated_at: now,
        },
        {
          onConflict: 'email',
        },
      );

    if (contactError) {
      return NextResponse.json(
        {
          ok: false,
          error: contactError.message,
        },
        { status: 500 },
      );
    }

    const { error: consentLogError } = await supabase
      .from('consent_logs')
      .insert({
        email,
        name: name || null,
        source,
        plan_id: planId,

        terms_accepted: termsAccepted,
        terms_accepted_at: termsAccepted ? now : null,
        terms_consent_text: termsConsentText,

        marketing_consent: marketingConsent,
        marketing_consent_at: marketingConsent ? now : null,
        marketing_consent_text: marketingConsent
          ? marketingConsentText
          : null,

        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        created_at: now,
      });

    if (consentLogError) {
      return NextResponse.json(
        {
          ok: false,
          error: consentLogError.message,
        },
        { status: 500 },
      );
    }

    if (source === 'checkout') {
      const { error: orderConsentError } = await supabase
        .from('order_consents')
        .insert({
          email,
          name: name || null,
          plan_id: planId,

          terms_accepted: termsAccepted,
          terms_accepted_at: termsAccepted ? now : null,

          marketing_consent: marketingConsent,
          marketing_consent_at: marketingConsent ? now : null,

          created_at: now,
        });

      if (orderConsentError) {
        return NextResponse.json(
          {
            ok: false,
            error: orderConsentError.message,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Súhlas bol uložený.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa uložiť súhlas.',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      message: 'Marketing consent API is running.',
    },
    { status: 200 },
  );
}