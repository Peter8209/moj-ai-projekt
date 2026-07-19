/**
 * Lokálne údaje viazané na konkrétneho používateľa ZEDPERA.
 *
 * Tento modul zámerne neodstraňuje všeobecné nastavenia aplikácie,
 * napríklad jazyk, farebnú tému, vzhľad alebo iné používateľské preferencie.
 */

export const ACCOUNT_STORAGE_KEYS = [
  'active_profile',
  'profile',
  'profiles_full',
  'generated_texts',
  'chat_history',
  'saved_outputs',
  'latest_generated_work_text',
  'zedpera_originality_protocol_result',
  'zedpera_admin_free',
  'zedpera_user_role',
  'zedpera_user_plan',
] as const;

export type AccountStorageKey = (typeof ACCOUNT_STORAGE_KEYS)[number];

/**
 * Interný identifikátor účtu, ktorému patria aktuálne lokálne údaje.
 * Používa sa iba na rozpoznanie zmeny prihláseného používateľa.
 */
const ACCOUNT_OWNER_STORAGE_KEY = 'zedpera_account_storage_owner';

type ClearAccountStorageResult = {
  clearedKeys: AccountStorageKey[];
  failedKeys: AccountStorageKey[];
};

type AccountChangeResult = ClearAccountStorageResult & {
  accountChanged: boolean;
  previousUserId: string | null;
  currentUserId: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function normalizeUserId(userId: string): string {
  return userId.trim();
}

function safelyRemoveItem(storage: Storage, key: AccountStorageKey): boolean {
  try {
    storage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[account-storage] Nepodarilo sa odstrániť kľúč „${key}“.`, error);
    return false;
  }
}

function safelyGetItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch (error) {
    console.warn(`[account-storage] Nepodarilo sa načítať kľúč „${key}“.`, error);
    return null;
  }
}

function safelySetItem(storage: Storage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[account-storage] Nepodarilo sa uložiť kľúč „${key}“.`, error);
    return false;
  }
}

function safelyRemoveOwnerMarker(storage: Storage): void {
  try {
    storage.removeItem(ACCOUNT_OWNER_STORAGE_KEY);
  } catch (error) {
    console.warn(
      `[account-storage] Nepodarilo sa odstrániť kľúč „${ACCOUNT_OWNER_STORAGE_KEY}“.`,
      error,
    );
  }
}

/**
 * Odstráni všetky lokálne údaje viazané na predchádzajúceho používateľa.
 *
 * Čistí localStorage aj sessionStorage, pretože staršie verzie aplikácie
 * mohli ukladať používateľské údaje do ktoréhokoľvek z týchto úložísk.
 *
 * Nevykonáva localStorage.clear() ani sessionStorage.clear(), takže jazyk,
 * vzhľad aplikácie a ostatné všeobecné nastavenia zostanú zachované.
 */
export function clearAccountStorage(): ClearAccountStorageResult {
  const clearedKeys = new Set<AccountStorageKey>();
  const failedKeys = new Set<AccountStorageKey>();

  if (!isBrowser()) {
    return {
      clearedKeys: [],
      failedKeys: [],
    };
  }

  const storages: Storage[] = [window.localStorage, window.sessionStorage];

  for (const key of ACCOUNT_STORAGE_KEYS) {
    let keyFailed = false;

    for (const storage of storages) {
      if (!safelyRemoveItem(storage, key)) {
        keyFailed = true;
      }
    }

    if (keyFailed) {
      failedKeys.add(key);
    } else {
      clearedKeys.add(key);
    }
  }

  return {
    clearedKeys: Array.from(clearedKeys),
    failedKeys: Array.from(failedKeys),
  };
}

/**
 * Použite po úspešnej registrácii alebo pred uložením údajov nového účtu.
 * Okrem používateľských údajov odstráni aj internú informáciu o vlastníkovi
 * predchádzajúcej lokálnej relácie.
 */
export function clearAccountStorageAfterRegistration(): ClearAccountStorageResult {
  const result = clearAccountStorage();

  if (isBrowser()) {
    safelyRemoveOwnerMarker(window.localStorage);
    safelyRemoveOwnerMarker(window.sessionStorage);
  }

  return result;
}

/**
 * Zapíše identifikátor aktuálneho používateľa do localStorage.
 * Identifikátor sa používa iba na zistenie, či sa v prehliadači zmenil účet.
 */
export function setAccountStorageOwner(userId: string): boolean {
  if (!isBrowser()) {
    return false;
  }

  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return false;
  }

  return safelySetItem(
    window.localStorage,
    ACCOUNT_OWNER_STORAGE_KEY,
    normalizedUserId,
  );
}

/**
 * Skontroluje, či lokálne údaje patria aktuálne prihlásenému používateľovi.
 *
 * Ak sa identifikátor účtu zmenil, odstráni údaje predchádzajúceho účtu
 * a uloží identifikátor nového používateľa. Pri prvom prihlásení sa iba
 * nastaví vlastník úložiska bez zbytočného mazania všeobecných nastavení.
 */
export function clearAccountStorageIfUserChanged(
  userId: string,
): AccountChangeResult {
  const currentUserId = normalizeUserId(userId);

  if (!currentUserId) {
    throw new Error('ACCOUNT_STORAGE_USER_ID_REQUIRED');
  }

  if (!isBrowser()) {
    return {
      accountChanged: false,
      previousUserId: null,
      currentUserId,
      clearedKeys: [],
      failedKeys: [],
    };
  }

  const previousUserId = safelyGetItem(
    window.localStorage,
    ACCOUNT_OWNER_STORAGE_KEY,
  );

  const accountChanged =
    Boolean(previousUserId) && previousUserId !== currentUserId;

  const clearResult = accountChanged
    ? clearAccountStorage()
    : {
        clearedKeys: [],
        failedKeys: [],
      };

  safelySetItem(
    window.localStorage,
    ACCOUNT_OWNER_STORAGE_KEY,
    currentUserId,
  );

  return {
    accountChanged,
    previousUserId,
    currentUserId,
    ...clearResult,
  };
}

/**
 * Použite pri odhlásení, ak chcete zabrániť tomu, aby údaje odhláseného
 * používateľa zostali dostupné ďalšiemu účtu v rovnakom prehliadači.
 */
export function clearAccountStorageOnSignOut(): ClearAccountStorageResult {
  const result = clearAccountStorage();

  if (isBrowser()) {
    safelyRemoveOwnerMarker(window.localStorage);
    safelyRemoveOwnerMarker(window.sessionStorage);
  }

  return result;
}
