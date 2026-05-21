'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase klient.
 *
 * Používa sa iba v klientskych komponentoch:
 * - komponenty s 'use client'
 * - prihlasovanie
 * - registrácia
 * - odhlásenie
 * - čítanie dát aktuálne prihláseného používateľa na klientovi
 *
 * Tento klient používa:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Nepoužívaj tu SUPABASE_SERVICE_ROLE_KEY.
 */
export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Chýba NEXT_PUBLIC_SUPABASE_URL.');
  }

  if (!supabaseAnonKey) {
    throw new Error('Chýba NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Alias kvôli kompatibilite so staršími importami.
 *
 * Staršie súbory môžu mať:
 * import { createClient } from '@/lib/supabase/client';
 *
 * Nové súbory odporúčam písať:
 * import { createSupabaseBrowserClient } from '@/lib/supabase/client';
 */
export function createClient() {
  return createSupabaseBrowserClient();
}

/**
 * Helper na získanie aktuálneho používateľa v klientskom komponente.
 */
export async function getCurrentBrowserUser() {
  const supabase = createSupabaseBrowserClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Helper na odhlásenie používateľa v klientskom komponente.
 */
export async function signOutBrowserUser() {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  return true;
}