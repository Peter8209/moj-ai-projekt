import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase ADMIN klient pre serverové operácie.
 *
 * Tento klient používa SUPABASE_SERVICE_ROLE_KEY.
 *
 * Používaj ho iba na serveri:
 * - app/api/.../route.ts
 * - server actions
 * - Stripe webhooky
 * - interné administrátorské operácie
 * - mazanie účtov
 * - mazanie dokumentov
 * - zápis do tabuliek mimo RLS obmedzení
 *
 * Nikdy ho nepoužívaj v klientskych komponentoch s 'use client',
 * pretože service role key má plné oprávnenia k databáze.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. Skontroluj .env.local alebo premenné vo Verceli.',
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Skontroluj .env.local alebo premenné vo Verceli.',
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'zedpera-admin-server',
      },
    },
  });
}

/**
 * Alias pre existujúce API routes.
 *
 * Použitie:
 * import { createClient } from '@/lib/supabase/admin';
 */
export function createClient() {
  return createAdminClient();
}

/**
 * Explicitný názov pre nové serverové súbory.
 *
 * Odporúčané použitie:
 * import { createSupabaseAdminClient } from '@/lib/supabase/admin';
 */
export function createSupabaseAdminClient() {
  return createAdminClient();
}