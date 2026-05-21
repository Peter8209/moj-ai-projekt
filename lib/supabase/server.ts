import { cookies } from 'next/headers';
import { createServerClient as createSupabaseServerClientBase } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ======================================================
// SERVER CLIENT - USER SESSION
// ======================================================
// Používa sa v API routách a serverových častiach,
// kde potrebuješ pracovať s aktuálne prihláseným používateľom.
//
// Tento klient používa:
// - NEXT_PUBLIC_SUPABASE_URL
// - NEXT_PUBLIC_SUPABASE_ANON_KEY
// - session cookies z Next.js
//
// DÔLEŽITÉ:
// Táto funkcia je async.
// V API routách ju používaj vždy takto:
//
// const supabase = await createSupabaseServerClient();
//
// Nie takto:
//
// const supabase = createSupabaseServerClient();
//
// Inak dostaneš chybu:
// Property 'from' does not exist on type 'Promise<...>'
// ======================================================

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return createSupabaseServerClientBase(supabaseUrl, supabaseAnonKey, {
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
          // Niektoré serverové kontexty neumožňujú zápis cookies.
          // Napríklad Server Component mimo Route Handler kontextu.
          // V API route to fungovať má.
        }
      },
    },
  });
}

// ======================================================
// ADMIN CLIENT - SERVICE ROLE
// ======================================================
// Používa sa iba na serveri v API routách.
// Tento klient používa SUPABASE_SERVICE_ROLE_KEY.
// Obchádza RLS pravidlá.
//
// Nikdy ho nepoužívaj:
// - v klientskom komponente,
// - v súbore s 'use client',
// - na frontende.
// ======================================================

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

// ======================================================
// CURRENT USER HELPER
// ======================================================
// Pomocná funkcia na zistenie aktuálne prihláseného používateľa.
// Ak používateľ nie je prihlásený, vráti null.
// ======================================================

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

// ======================================================
// REQUIRE USER HELPER
// ======================================================
// Pomocná funkcia pre API routy, kde je login povinný.
// Ak používateľ nie je prihlásený, vyhodí chybu NOT_AUTHENTICATED.
// ======================================================

export async function requireCurrentUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('NOT_AUTHENTICATED');
  }

  return {
    supabase,
    user,
  };
}

// ======================================================
// ALIASES - kompatibilita so staršími importami
// ======================================================
// Tieto aliasy nechávame kvôli starším súborom v projekte.
//
// Pozor:
// - createClient() je async
// - createServerSupabaseClient() je async
// - createAdminClient() nie je async
// - createSupabaseAdminClient() nie je async
// ======================================================

export async function createClient() {
  return createSupabaseServerClient();
}

export async function createServerSupabaseClient() {
  return createSupabaseServerClient();
}

export function createSupabaseAdminClient() {
  return createAdminClient();
}

// ======================================================
// DEFAULT EXPORT NEPOUŽÍVAŤ
// ======================================================
// Tento súbor exportuje iba named exporty.
// Importuj napríklad takto:
//
// import { createSupabaseServerClient } from '@/lib/supabase/server';
// import { createAdminClient } from '@/lib/supabase/server';
// ======================================================