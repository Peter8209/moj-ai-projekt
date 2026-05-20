import { cookies } from 'next/headers';
import { createServerClient as createSupabaseServerClientBase } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ================= SERVER CLIENT - USER SESSION =================
// Používa sa v API routách a serverových častiach, kde potrebuješ pracovať
// s aktuálne prihláseným používateľom.
// Tento klient používa ANON key a session cookies z Next.js.

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
          // Napríklad Server Component bez Route Handler kontextu.
        }
      },
    },
  });
}

// ================= ADMIN CLIENT - SERVICE ROLE =================
// Používa sa iba na serveri v API routách.
// Tento klient používa SERVICE ROLE KEY a obchádza RLS.
// Nikdy ho nepoužívaj v klientskom komponente.

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
    },
  });
}

// ================= ALIASES =================
// Tieto aliasy nechávame kvôli kompatibilite so staršími importami v projekte.
// Dôležité:
// - createSupabaseServerClient() je async, preto všade používaj await.
// - createAdminClient() nie je async, preto await nepotrebuje.

export async function createClient() {
  return createSupabaseServerClient();
}

export async function createServerSupabaseClient() {
  return createSupabaseServerClient();
}

export function createSupabaseAdminClient() {
  return createAdminClient();
}