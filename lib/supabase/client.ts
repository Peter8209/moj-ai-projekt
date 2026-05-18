import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase klient.
 *
 * Používa sa iba v klientskych komponentoch:
 * - komponenty s 'use client'
 * - formuláre
 * - prihlasovanie
 * - registrácia
 * - odhlásenie
 * - čítanie dát aktuálne prihláseného používateľa na klientovi
 *
 * Tento klient používa iba ANON KEY.
 * Nepoužívaj tu SUPABASE_SERVICE_ROLE_KEY.
 */
export function createClient() {
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
 * Alternatívny názov pre nové komponenty.
 *
 * Môžeš použiť:
 * import { createSupabaseBrowserClient } from '@/lib/supabase/client';
 */
export function createSupabaseBrowserClient() {
  return createClient();
}