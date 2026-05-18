import { cookies } from 'next/headers';
import { createServerClient as createSupabaseServerClientBase } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ================= TYPES =================

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

// ================= SERVER CLIENT - USER SESSION =================
// Používa sa tam, kde potrebuješ pracovať s prihláseným používateľom.
// Tento klient používa ANON key a cookies z Next.js.

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

      setAll(cookiesToSet: CookieToSet[]) {
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
// Tento klient obchádza RLS, preto nikdy nepoužívaj service role key na klientovi.

export async function createAdminClient() {
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

export async function createClient() {
  return createSupabaseServerClient();
}

export async function createServerSupabaseClient() {
  return createSupabaseServerClient();
}

export async function createSupabaseAdminClient() {
  return createAdminClient();
}