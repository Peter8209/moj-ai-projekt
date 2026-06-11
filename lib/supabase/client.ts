'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase klient pre ZEDPERA.
 *
 * Používa sa iba v klientskych komponentoch:
 * - prihlasovanie
 * - registrácia
 * - reset hesla
 * - zmena hesla po kliknutí na resetovací odkaz
 * - odhlásenie
 * - čítanie aktuálne prihláseného používateľa
 *
 * Tento klient používa iba PUBLIC premenné:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Nikdy tu nepoužívaj:
 * - SUPABASE_SERVICE_ROLE_KEY
 * - SUPABASE_ACCESS_TOKEN
 * - žiadne tajné serverové kľúče
 */

function getRequiredEnvValue(value: string | undefined, name: string) {
  const cleanValue = String(value || '').trim();

  if (!cleanValue) {
    throw new Error(`Chýba ${name}. Skontroluj .env.local alebo Vercel Environment Variables.`);
  }

  return cleanValue;
}

export function createSupabaseBrowserClient() {
  const supabaseUrl = getRequiredEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL',
  );

  const supabaseAnonKey = getRequiredEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  );

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      /**
       * Musí byť true:
       * - používateľ ostane prihlásený po refreshi
       * - funguje návrat z emailového reset odkazu
       */
      persistSession: true,

      /**
       * Musí byť true:
       * - Supabase obnovuje token automaticky
       * - používateľovi nepadá session počas práce
       */
      autoRefreshToken: true,

      /**
       * Kritické pre reset hesla:
       * - Supabase po kliknutí na emailový odkaz vloží tokeny do URL
       * - klient ich musí vedieť zachytiť
       * - bez toho reset-password stránka nevie zmeniť heslo
       */
      detectSessionInUrl: true,

      /**
       * Odporúčaný bezpečný flow pre moderné Supabase Auth aplikácie.
       * Funguje pre:
       * - login
       * - register
       * - forgot password
       * - reset password
       */
      flowType: 'pkce',
    },

    /**
     * Globálne hlavičky.
     * Neobsahujú žiadne tajné údaje.
     */
    global: {
      headers: {
        'X-Client-Info': 'zedpera-web',
      },
    },
  });
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
 * Helper na získanie aktuálnej session v klientskom komponente.
 *
 * Použitie:
 * const session = await getCurrentBrowserSession();
 */
export async function getCurrentBrowserSession() {
  const supabase = createSupabaseBrowserClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}

/**
 * Helper na získanie aktuálneho používateľa v klientskom komponente.
 *
 * Použitie:
 * const user = await getCurrentBrowserUser();
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
 * Helper na zistenie, či je používateľ prihlásený.
 *
 * Použitie:
 * const loggedIn = await isBrowserUserLoggedIn();
 */
export async function isBrowserUserLoggedIn() {
  const session = await getCurrentBrowserSession();

  return Boolean(session?.user);
}

/**
 * Helper na odhlásenie používateľa v klientskom komponente.
 *
 * Použitie:
 * await signOutBrowserUser();
 */
export async function signOutBrowserUser() {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('zedpera_user_email');
    localStorage.removeItem('zedpera_email');
    localStorage.removeItem('user_email');
    localStorage.removeItem('zedpera_user_name');
    localStorage.removeItem('zedpera_user_role');
    localStorage.removeItem('zedpera_user_plan');
    localStorage.removeItem('zedpera_is_logged_in');
    localStorage.removeItem('zedpera_admin_free');

    document.cookie = 'sub_active=; path=/; max-age=0; SameSite=Lax';
  }

  return true;
}

/**
 * Helper na odoslanie resetovacieho emailu.
 *
 * Použitie vo forgot-password:
 *
 * await sendBrowserPasswordResetEmail(email, redirectTo);
 *
 * redirectTo má byť napríklad:
 * https://zedpera.com/reset-password?lang=sk
 */
export async function sendBrowserPasswordResetEmail(email: string, redirectTo: string) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanRedirectTo = String(redirectTo || '').trim();

  if (!cleanEmail) {
    throw new Error('Chýba e-mailová adresa.');
  }

  if (!cleanRedirectTo) {
    throw new Error('Chýba redirectTo URL pre reset hesla.');
  }

  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: cleanRedirectTo,
  });

  if (error) {
    throw error;
  }

  return true;
}

/**
 * Helper na zmenu hesla po kliknutí na resetovací odkaz.
 *
 * Použitie v reset-password stránke:
 *
 * await updateBrowserPassword(newPassword);
 */
export async function updateBrowserPassword(newPassword: string) {
  const cleanPassword = String(newPassword || '').trim();

  if (!cleanPassword) {
    throw new Error('Chýba nové heslo.');
  }

  if (cleanPassword.length < 8) {
    throw new Error('Heslo musí mať aspoň 8 znakov.');
  }

  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.auth.updateUser({
    password: cleanPassword,
  });

  if (error) {
    throw error;
  }

  return true;
}