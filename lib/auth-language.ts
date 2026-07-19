/**
 * Jednotná správa jazykov pre autentifikačné stránky ZEDPERA.
 *
 * Modul používajte pre:
 * - úvodnú stránku,
 * - prihlásenie,
 * - registráciu,
 * - zabudnuté heslo,
 * - nastavenie nového hesla,
 * - potvrdenie účtu,
 * - auth callback,
 * - presmerovania medzi autentifikačnými stránkami.
 *
 * Interný kód češtiny je v aplikácii "cz".
 * Štandardný HTML jazykový kód je však "cs".
 */

export const AUTH_LANGUAGES = [
  'sk',
  'cz',
  'en',
  'de',
  'pl',
  'hu',
] as const;

export type AuthLanguage =
  (typeof AUTH_LANGUAGES)[number];

export const DEFAULT_AUTH_LANGUAGE: AuthLanguage =
  'sk';

/**
 * Názov cookie, v ktorej je uložený vybraný jazyk.
 */
export const AUTH_LANGUAGE_COOKIE_KEY =
  'zedpera_language';

/**
 * Platnosť cookie: 1 rok.
 */
export const AUTH_LANGUAGE_COOKIE_MAX_AGE =
  60 * 60 * 24 * 365;

/**
 * Všetky používané localStorage kľúče.
 *
 * Jazyk zapisujeme do všetkých kľúčov, aby boli úvodná stránka,
 * dashboard a autentifikačné stránky vzájomne synchronizované.
 */
export const AUTH_LANGUAGE_STORAGE_KEYS = [
  'zedpera_language',
  'zedpera_system_language',
  'zedpera_work_language',
  'zedpera_interface_language',
  'zedpera_auth_language',
  'app_language',
] as const;

export type AuthLanguageStorageKey =
  (typeof AUTH_LANGUAGE_STORAGE_KEYS)[number];

export type AuthLanguageChangeSource =
  | 'landing-page'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'auth-callback'
  | 'dashboard'
  | 'profile'
  | 'authentication'
  | 'unknown';

export type AuthLanguageChangeDetail = {
  language: AuthLanguage;
  source?: AuthLanguageChangeSource;
};

export type AuthLanguageDefinition = {
  code: AuthLanguage;
  htmlCode: string;
  shortCode: string;
  name: string;
};

/**
 * Definície jazykov zobrazované vo výberovníku.
 */
export const AUTH_LANGUAGE_DEFINITIONS: readonly AuthLanguageDefinition[] =
  [
    {
      code: 'sk',
      htmlCode: 'sk',
      shortCode: 'SK',
      name: 'Slovenčina',
    },
    {
      code: 'cz',
      htmlCode: 'cs',
      shortCode: 'CZ',
      name: 'Čeština',
    },
    {
      code: 'en',
      htmlCode: 'en',
      shortCode: 'EN',
      name: 'English',
    },
    {
      code: 'de',
      htmlCode: 'de',
      shortCode: 'DE',
      name: 'Deutsch',
    },
    {
      code: 'pl',
      htmlCode: 'pl',
      shortCode: 'PL',
      name: 'Polski',
    },
    {
      code: 'hu',
      htmlCode: 'hu',
      shortCode: 'HU',
      name: 'Magyar',
    },
  ] as const;

/**
 * Overí, či ide o podporovaný interný jazykový kód.
 */
export function isAuthLanguage(
  value: unknown,
): value is AuthLanguage {
  return AUTH_LANGUAGES.includes(
    value as AuthLanguage,
  );
}

/**
 * Normalizuje jazyk na interný kód ZEDPERA.
 *
 * Podporované hodnoty:
 *
 * Slovenčina:
 * sk, sk-SK, slovak, slovenčina
 *
 * Čeština:
 * cs, cz, cs-CZ, czech, čeština
 *
 * Angličtina:
 * en, en-US, en-GB, english
 *
 * Nemčina:
 * de, de-DE, deutsch, german
 *
 * Poľština:
 * pl, pl-PL, polski, polish
 *
 * Maďarčina:
 * hu, hu-HU, magyar, hungarian
 */
export function normalizeAuthLanguage(
  value: unknown,
  fallback: AuthLanguage = DEFAULT_AUTH_LANGUAGE,
): AuthLanguage {
  const rawValue = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');

  if (!rawValue) {
    return fallback;
  }

  const valueWithoutDiacritics = rawValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const baseLanguage =
    valueWithoutDiacritics.split('-')[0] ?? '';

  if (
    baseLanguage === 'sk' ||
    valueWithoutDiacritics === 'slovak' ||
    valueWithoutDiacritics === 'slovencina'
  ) {
    return 'sk';
  }

  /**
   * Český jazyk môže prísť ako "cs" alebo "cz".
   * Vnútri aplikácie ho vždy uložíme ako "cz".
   */
  if (
    baseLanguage === 'cs' ||
    baseLanguage === 'cz' ||
    valueWithoutDiacritics === 'czech' ||
    valueWithoutDiacritics === 'cestina'
  ) {
    return 'cz';
  }

  if (
    baseLanguage === 'en' ||
    valueWithoutDiacritics === 'english' ||
    valueWithoutDiacritics === 'anglictina'
  ) {
    return 'en';
  }

  if (
    baseLanguage === 'de' ||
    valueWithoutDiacritics === 'deutsch' ||
    valueWithoutDiacritics === 'german' ||
    valueWithoutDiacritics === 'nemcina'
  ) {
    return 'de';
  }

  if (
    baseLanguage === 'pl' ||
    valueWithoutDiacritics === 'polski' ||
    valueWithoutDiacritics === 'polish' ||
    valueWithoutDiacritics === 'polstina'
  ) {
    return 'pl';
  }

  if (
    baseLanguage === 'hu' ||
    valueWithoutDiacritics === 'magyar' ||
    valueWithoutDiacritics === 'hungarian' ||
    valueWithoutDiacritics === 'madarcina'
  ) {
    return 'hu';
  }

  return fallback;
}

/**
 * Vráti úplnú definíciu konkrétneho jazyka.
 */
export function getAuthLanguageDefinition(
  language: AuthLanguage,
): AuthLanguageDefinition {
  return (
    AUTH_LANGUAGE_DEFINITIONS.find(
      (item) => item.code === language,
    ) ?? AUTH_LANGUAGE_DEFINITIONS[0]
  );
}

/**
 * Vráti štandardný HTML jazykový kód.
 *
 * Pre češtinu:
 * interný kód = cz
 * HTML kód = cs
 */
export function getHtmlLanguageCode(
  language: AuthLanguage,
): string {
  return getAuthLanguageDefinition(
    language,
  ).htmlCode;
}

/**
 * Vráti názov jazyka.
 */
export function getAuthLanguageName(
  language: AuthLanguage,
): string {
  return getAuthLanguageDefinition(
    language,
  ).name;
}

/**
 * Vráti krátky kód zobrazovaný vo výberovníku.
 */
export function getAuthLanguageShortCode(
  language: AuthLanguage,
): string {
  return getAuthLanguageDefinition(
    language,
  ).shortCode;
}

/**
 * Prečíta jazyk z URL.
 *
 * Podporované parametre:
 * ?lang=cz
 * ?language=cz
 * ?locale=cz
 */
export function readAuthLanguageFromUrl(
  input?: string | URL | null,
): AuthLanguage | null {
  try {
    let url: URL;

    if (input instanceof URL) {
      url = input;
    } else if (typeof input === 'string') {
      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost';

      url = new URL(input, baseUrl);
    } else if (typeof window !== 'undefined') {
      url = new URL(window.location.href);
    } else {
      return null;
    }

    const languageValue =
      url.searchParams.get('lang') ||
      url.searchParams.get('language') ||
      url.searchParams.get('locale');

    if (!languageValue) {
      return null;
    }

    return normalizeAuthLanguage(
      languageValue,
    );
  } catch {
    return null;
  }
}

/**
 * Prečíta jazyk z localStorage.
 */
export function readAuthLanguageFromStorage():
  | AuthLanguage
  | null {
  if (typeof window === 'undefined') {
    return null;
  }

  for (const key of AUTH_LANGUAGE_STORAGE_KEYS) {
    try {
      const storedValue =
        window.localStorage.getItem(key);

      if (storedValue) {
        return normalizeAuthLanguage(
          storedValue,
        );
      }
    } catch {
      /**
       * Privacy režim alebo bezpečnostné nastavenie môže
       * localStorage zablokovať.
       */
    }
  }

  return null;
}

/**
 * Prečíta jazyk z cookie.
 */
export function readAuthLanguageFromCookie():
  | AuthLanguage
  | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookiePrefix =
    `${AUTH_LANGUAGE_COOKIE_KEY}=`;

  const cookiePart = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) =>
      part.startsWith(cookiePrefix),
    );

  if (!cookiePart) {
    return null;
  }

  const encodedValue =
    cookiePart.slice(cookiePrefix.length);

  if (!encodedValue) {
    return null;
  }

  try {
    return normalizeAuthLanguage(
      decodeURIComponent(encodedValue),
    );
  } catch {
    return normalizeAuthLanguage(encodedValue);
  }
}

/**
 * Prečíta jazyk z HTML dokumentu.
 */
export function readAuthLanguageFromDocument():
  | AuthLanguage
  | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const value =
    document.documentElement.getAttribute(
      'data-language',
    ) ||
    document.documentElement.getAttribute(
      'data-system-language',
    ) ||
    document.documentElement.getAttribute(
      'data-work-language',
    ) ||
    document.documentElement.getAttribute(
      'data-interface-language',
    ) ||
    document.documentElement.lang;

  if (!value) {
    return null;
  }

  return normalizeAuthLanguage(value);
}

/**
 * Prečíta preferovaný jazyk prehliadača.
 */
export function readAuthLanguageFromBrowser():
  | AuthLanguage
  | null {
  if (
    typeof window === 'undefined' ||
    typeof window.navigator === 'undefined'
  ) {
    return null;
  }

  const browserLanguage =
    window.navigator.languages?.[0] ||
    window.navigator.language;

  if (!browserLanguage) {
    return null;
  }

  return normalizeAuthLanguage(
    browserLanguage,
  );
}

export type ResolveAuthLanguageOptions = {
  explicitLanguage?: unknown;
  url?: string | URL | null;
  includeStorage?: boolean;
  includeCookie?: boolean;
  includeDocument?: boolean;
  includeBrowser?: boolean;
  fallback?: AuthLanguage;
};

/**
 * Vyrieši aktívny jazyk podľa jednotného poradia:
 *
 * 1. explicitne zadaný jazyk,
 * 2. parameter v URL,
 * 3. localStorage,
 * 4. cookie,
 * 5. HTML dokument,
 * 6. jazyk prehliadača,
 * 7. slovenčina.
 */
export function resolveAuthLanguage(
  options: ResolveAuthLanguageOptions = {},
): AuthLanguage {
  const {
    explicitLanguage,
    url,
    includeStorage = true,
    includeCookie = true,
    includeDocument = true,
    includeBrowser = true,
    fallback = DEFAULT_AUTH_LANGUAGE,
  } = options;

  if (
    explicitLanguage !== null &&
    explicitLanguage !== undefined &&
    String(explicitLanguage).trim() !== ''
  ) {
    return normalizeAuthLanguage(
      explicitLanguage,
      fallback,
    );
  }

  const urlLanguage =
    readAuthLanguageFromUrl(url);

  if (urlLanguage) {
    return urlLanguage;
  }

  if (includeStorage) {
    const storedLanguage =
      readAuthLanguageFromStorage();

    if (storedLanguage) {
      return storedLanguage;
    }
  }

  if (includeCookie) {
    const cookieLanguage =
      readAuthLanguageFromCookie();

    if (cookieLanguage) {
      return cookieLanguage;
    }
  }

  if (includeDocument) {
    const documentLanguage =
      readAuthLanguageFromDocument();

    if (documentLanguage) {
      return documentLanguage;
    }
  }

  if (includeBrowser) {
    const browserLanguage =
      readAuthLanguageFromBrowser();

    if (browserLanguage) {
      return browserLanguage;
    }
  }

  return fallback;
}

/**
 * Skrátená funkcia určená pre inicializáciu React state.
 */
export function getInitialAuthLanguage(
  explicitLanguage?: unknown,
): AuthLanguage {
  return resolveAuthLanguage({
    explicitLanguage,
  });
}

/**
 * Aplikuje jazyk na HTML dokument.
 */
export function applyAuthLanguageToDocument(
  language: AuthLanguage,
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const normalizedLanguage =
    normalizeAuthLanguage(language);

  document.documentElement.lang =
    getHtmlLanguageCode(
      normalizedLanguage,
    );

  document.documentElement.setAttribute(
    'data-language',
    normalizedLanguage,
  );

  document.documentElement.setAttribute(
    'data-system-language',
    normalizedLanguage,
  );

  document.documentElement.setAttribute(
    'data-work-language',
    normalizedLanguage,
  );

  document.documentElement.setAttribute(
    'data-interface-language',
    normalizedLanguage,
  );
}

/**
 * Vytvorí hodnotu jazykovej cookie.
 *
 * Možno ju použiť:
 * - v prehliadači cez document.cookie,
 * - v Next.js route handleri,
 * - v middleware.
 */
export function createAuthLanguageCookieValue(
  language: AuthLanguage,
  options?: {
    secure?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: 'Strict' | 'Lax' | 'None';
  },
): string {
  const normalizedLanguage =
    normalizeAuthLanguage(language);

  const secure =
    options?.secure === true
      ? '; Secure'
      : '';

  const maxAge =
    options?.maxAge ??
    AUTH_LANGUAGE_COOKIE_MAX_AGE;

  const path =
    options?.path ?? '/';

  const sameSite =
    options?.sameSite ?? 'Lax';

  return (
    `${AUTH_LANGUAGE_COOKIE_KEY}=` +
    `${encodeURIComponent(normalizedLanguage)}; ` +
    `Path=${path}; ` +
    `Max-Age=${maxAge}; ` +
    `SameSite=${sameSite}` +
    secure
  );
}

/**
 * Uloží jazyk do localStorage, cookie a HTML dokumentu.
 */
export function persistAuthLanguage(
  language: AuthLanguage,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedLanguage =
    normalizeAuthLanguage(language);

  for (const key of AUTH_LANGUAGE_STORAGE_KEYS) {
    try {
      window.localStorage.setItem(
        key,
        normalizedLanguage,
      );
    } catch {
      /**
       * Cookie a HTML atribúty sa nastavia aj v prípade,
       * že je localStorage zablokovaný.
       */
    }
  }

  applyAuthLanguageToDocument(
    normalizedLanguage,
  );

  document.cookie =
    createAuthLanguageCookieValue(
      normalizedLanguage,
      {
        secure:
          window.location.protocol === 'https:',
      },
    );
}

/**
 * Odstráni uložený jazyk.
 *
 * Pri bežnom odhlásení sa táto funkcia nemá volať.
 * Jazyk používateľa má zostať zachovaný aj po odhlásení.
 */
export function clearPersistedAuthLanguage():
  void {
  if (typeof window === 'undefined') {
    return;
  }

  for (const key of AUTH_LANGUAGE_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignorujeme zablokovaný localStorage.
    }
  }

  document.cookie =
    `${AUTH_LANGUAGE_COOKIE_KEY}=; ` +
    'Path=/; Max-Age=0; SameSite=Lax';
}

/**
 * Získa jazyk z detailu globálnej udalosti.
 *
 * Podporuje:
 *
 * detail: 'cz'
 *
 * aj:
 *
 * detail: {
 *   language: 'cz',
 *   source: 'landing-page'
 * }
 */
export function getAuthLanguageFromEventDetail(
  detail: unknown,
): AuthLanguage {
  if (
    detail &&
    typeof detail === 'object' &&
    'language' in detail
  ) {
    return normalizeAuthLanguage(
      (
        detail as {
          language?: unknown;
        }
      ).language,
    );
  }

  return normalizeAuthLanguage(detail);
}

/**
 * Odošle globálnu udalosť o zmene jazyka.
 */
export function dispatchAuthLanguageChange(
  language: AuthLanguage,
  source: AuthLanguageChangeSource =
    'authentication',
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedLanguage =
    normalizeAuthLanguage(language);

  window.dispatchEvent(
    new CustomEvent<AuthLanguageChangeDetail>(
      'zedpera-language-change',
      {
        detail: {
          language: normalizedLanguage,
          source,
        },
      },
    ),
  );
}

/**
 * Kompletná zmena jazyka:
 *
 * - normalizácia,
 * - uloženie,
 * - aplikovanie na dokument,
 * - odoslanie globálnej udalosti.
 */
export function setAuthLanguage(
  language: AuthLanguage,
  source: AuthLanguageChangeSource =
    'authentication',
): AuthLanguage {
  const normalizedLanguage =
    normalizeAuthLanguage(language);

  persistAuthLanguage(
    normalizedLanguage,
  );

  dispatchAuthLanguageChange(
    normalizedLanguage,
    source,
  );

  return normalizedLanguage;
}

/**
 * Overí, či StorageEvent súvisí so zmenou jazyka.
 */
export function isAuthLanguageStorageEvent(
  event: StorageEvent,
): boolean {
  if (!event.key) {
    return false;
  }

  return AUTH_LANGUAGE_STORAGE_KEYS.includes(
    event.key as AuthLanguageStorageKey,
  );
}

export type InternalHrefParameters = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Pridá jazyk do interného odkazu.
 *
 * Príklady:
 *
 * /login + cz
 * → /login?lang=cz
 *
 * /register?plan=free + en
 * → /register?plan=free&lang=en
 *
 * Externé odkazy sa neupravujú.
 */
export function addAuthLanguageToHref(
  href: string,
  language: AuthLanguage,
  additionalParameters: InternalHrefParameters = {},
): string {
  const cleanHref = String(href ?? '').trim();

  if (!cleanHref) {
    return cleanHref;
  }

  if (
    cleanHref.startsWith('#') ||
    cleanHref.startsWith('http://') ||
    cleanHref.startsWith('https://') ||
    cleanHref.startsWith('//') ||
    cleanHref.startsWith('mailto:') ||
    cleanHref.startsWith('tel:') ||
    cleanHref.startsWith('javascript:')
  ) {
    return cleanHref;
  }

  const hashIndex =
    cleanHref.indexOf('#');

  const hrefWithoutHash =
    hashIndex >= 0
      ? cleanHref.slice(0, hashIndex)
      : cleanHref;

  const hash =
    hashIndex >= 0
      ? cleanHref.slice(hashIndex + 1)
      : '';

  const questionMarkIndex =
    hrefWithoutHash.indexOf('?');

  const pathname =
    questionMarkIndex >= 0
      ? hrefWithoutHash.slice(
          0,
          questionMarkIndex,
        )
      : hrefWithoutHash;

  const originalSearch =
    questionMarkIndex >= 0
      ? hrefWithoutHash.slice(
          questionMarkIndex + 1,
        )
      : '';

  const parameters =
    new URLSearchParams(originalSearch);

  parameters.set(
    'lang',
    normalizeAuthLanguage(language),
  );

  for (const [key, value] of Object.entries(
    additionalParameters,
  )) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      parameters.delete(key);
      continue;
    }

    parameters.set(key, String(value));
  }

  const query =
    parameters.toString();

  return (
    `${pathname}${query ? `?${query}` : ''}` +
    `${hash ? `#${hash}` : ''}`
  );
}

/**
 * Lokalizovaný odkaz na prihlásenie.
 */
export function getLocalizedLoginHref(
  language: AuthLanguage,
  parameters: InternalHrefParameters = {},
): string {
  return addAuthLanguageToHref(
    '/login',
    language,
    parameters,
  );
}

/**
 * Lokalizovaný odkaz na registráciu.
 */
export function getLocalizedRegisterHref(
  language: AuthLanguage,
  parameters: InternalHrefParameters = {},
): string {
  return addAuthLanguageToHref(
    '/register',
    language,
    parameters,
  );
}

/**
 * Lokalizovaný odkaz na zabudnuté heslo.
 */
export function getLocalizedForgotPasswordHref(
  language: AuthLanguage,
  parameters: InternalHrefParameters = {},
): string {
  return addAuthLanguageToHref(
    '/forgot-password',
    language,
    parameters,
  );
}

/**
 * Lokalizovaný odkaz na nastavenie nového hesla.
 */
export function getLocalizedResetPasswordHref(
  language: AuthLanguage,
  parameters: InternalHrefParameters = {},
): string {
  return addAuthLanguageToHref(
    '/reset-password',
    language,
    parameters,
  );
}

/**
 * Lokalizovaný odkaz na auth callback.
 */
export function getLocalizedAuthCallbackHref(
  language: AuthLanguage,
  parameters: InternalHrefParameters = {},
): string {
  return addAuthLanguageToHref(
    '/auth/callback',
    language,
    parameters,
  );
}

/**
 * Lokalizovaný odkaz na úvodnú stránku.
 */
export function getLocalizedHomeHref(
  language: AuthLanguage,
): string {
  return addAuthLanguageToHref(
    '/',
    language,
  );
}

/**
 * Synchronizuje parameter lang v aktuálnej URL bez reloadu.
 *
 * Ostatné parametre vrátane code, token_hash a hash fragmentu
 * zostanú zachované.
 */
export function synchronizeAuthLanguageInUrl(
  language: AuthLanguage,
  mode: 'replace' | 'push' = 'replace',
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(
    window.location.href,
  );

  url.searchParams.set(
    'lang',
    normalizeAuthLanguage(language),
  );

  const nextUrl =
    `${url.pathname}${url.search}${url.hash}`;

  if (mode === 'push') {
    window.history.pushState(
      {},
      document.title,
      nextUrl,
    );

    return;
  }

  window.history.replaceState(
    {},
    document.title,
    nextUrl,
  );
}

/**
 * Vytvorí absolútnu autentifikačnú URL.
 *
 * Použitie:
 *
 * const redirectTo = createAbsoluteAuthUrl(
 *   '/reset-password',
 *   language,
 * );
 */
export function createAbsoluteAuthUrl(
  pathname: string,
  language: AuthLanguage,
  parameters: InternalHrefParameters = {},
  origin?: string,
): string {
  const resolvedOrigin =
    origin ||
    (
      typeof window !== 'undefined'
        ? window.location.origin
        : ''
    );

  if (!resolvedOrigin) {
    throw new Error(
      'Nie je dostupný origin pre vytvorenie absolútnej autentifikačnej URL.',
    );
  }

  const localizedPath =
    addAuthLanguageToHref(
      pathname,
      language,
      parameters,
    );

  return new URL(
    localizedPath,
    resolvedOrigin,
  ).toString();
}