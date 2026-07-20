import 'server-only';

/**
 * Vráti normalizovaný zoznam administrátorských e-mailov.
 *
 * Hodnota sa nastavuje vo Verceli alebo v .env.local:
 * ZEDPERA_ADMIN_EMAILS=admin@zedpera.com,admin1@zedpera.com
 */
export function getAdminEmails(): Set<string> {
  const configuredEmails =
    process.env.ZEDPERA_ADMIN_EMAILS ?? '';

  return new Set(
    configuredEmails
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Overí, či e-mail aktuálne prihláseného používateľa
 * patrí medzi administrátorov.
 */
export function isAdminEmail(
  email: string | null | undefined,
): boolean {
  const normalizedEmail =
    String(email ?? '').trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  return getAdminEmails().has(normalizedEmail);
}