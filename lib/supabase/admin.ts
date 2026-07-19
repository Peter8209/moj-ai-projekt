import 'server-only';

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

/**
 * Jediná zdieľaná inštancia administrátorského Supabase klienta.
 *
 * Klient sa vytvorí až pri prvom použití a následne sa opakovane
 * používa počas životnosti serverovej inštancie.
 */
let adminClient: SupabaseClient | null = null;

/**
 * Vytvorí alebo vráti existujúceho Supabase ADMIN klienta.
 *
 * Tento klient používa SUPABASE_SERVICE_ROLE_KEY a obchádza RLS.
 *
 * Používajte ho iba v serverovom prostredí:
 * - app/api/.../route.ts
 * - server actions
 * - Stripe webhooky
 * - interné administrátorské operácie
 * - aktivácia zakúpených balíkov
 * - aktualizácia používateľských oprávnení
 * - mazanie používateľských účtov
 * - mazanie dokumentov
 * - zápis do tabuliek mimo RLS obmedzení
 *
 * Nikdy ho nepoužívajte v klientskych komponentoch označených
 * direktívou 'use client'. Service role key poskytuje plný prístup
 * k databáze a nesmie sa dostať do prehliadača.
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Chýba NEXT_PUBLIC_SUPABASE_URL. Skontrolujte súbor .env.local alebo environment premenné vo Verceli.',
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Chýba SUPABASE_SERVICE_ROLE_KEY. Skontrolujte súbor .env.local alebo environment premenné vo Verceli.',
    );
  }

  if (!adminClient) {
    adminClient = createSupabaseClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },

        global: {
          headers: {
            'X-Client-Info': 'zedpera-admin-server',
          },
        },
      },
    );
  }

  return adminClient;
}

/**
 * Alias zachovávajúci kompatibilitu so súbormi, ktoré importujú:
 *
 * import { createClient } from '@/lib/supabase/admin';
 */
export function createClient(): SupabaseClient {
  return createAdminClient();
}

/**
 * Odporúčaný explicitný názov pre nové serverové súbory.
 *
 * Použitie:
 *
 * import {
 *   createSupabaseAdminClient,
 * } from '@/lib/supabase/admin';
 */
export function createSupabaseAdminClient(): SupabaseClient {
  return createAdminClient();
}

/**
 * Typ administrátorského Supabase klienta.
 *
 * Môže sa použiť napríklad v pomocných funkciách:
 *
 * async function activatePlan(
 *   supabase: AdminSupabaseClient,
 * ) {
 *   // ...
 * }
 */
export type AdminSupabaseClient = SupabaseClient;