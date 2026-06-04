'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  languages,
  getTranslation,
  normalizeLanguage,
  type AppLanguage,
} from '@/lib/i18n';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: ReturnType<typeof getTranslation>;
  appLanguages: typeof languages;
  isTranslatingInterface: boolean;
  translationProgress: number;

  /**
   * Zmení sa pri každom prepnutí jazyka.
   * Použi v dashboarde/logine ako key, ak sa niektoré časti neprekreslia:
   * key={`${language}-${languageVersion}`}
   */
  languageVersion: number;
};

type StoredProfile = {
  id?: string;
  interfaceLanguage?: AppLanguage;
  workLanguage?: AppLanguage;
  updatedAt?: string;
  [key: string]: unknown;
};

const LANGUAGE_STORAGE_KEY = 'zedpera_language';
const SYSTEM_LANGUAGE_STORAGE_KEY = 'zedpera_system_language';
const WORK_LANGUAGE_STORAGE_KEY = 'zedpera_work_language';

const ACTIVE_PROFILE_KEY = 'active_profile';
const LEGACY_PROFILE_KEY = 'profile';
const PROFILES_FULL_KEY = 'profiles_full';

const LANGUAGE_USER_SELECTED_KEY = 'zedpera_language_user_selected';

const LANGUAGE_EVENTS = [
  'zedpera-language-change',
  'zedpera-language-updated',
  'zedpera-interface-language-change',
  'zedpera-force-language-refresh',
];

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isValidLanguage(value: unknown): value is AppLanguage {
  return (
    value === 'sk' ||
    value === 'cs' ||
    value === 'en' ||
    value === 'de' ||
    value === 'pl' ||
    value === 'hu'
  );
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeStoredLanguage(value: unknown): AppLanguage | null {
  if (isValidLanguage(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = normalizeLanguage(value);

  return isValidLanguage(normalized) ? normalized : null;
}

function getLanguageFromPath(): AppLanguage | null {
  if (typeof window === 'undefined') return null;

  const firstSegment = window.location.pathname
    .split('/')
    .filter(Boolean)[0];

  if (isValidLanguage(firstSegment)) {
    return firstSegment;
  }

  return null;
}

function getStoredLanguage(): AppLanguage | null {
  if (typeof window === 'undefined') return null;

  const savedLanguage =
    window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
    window.localStorage.getItem(SYSTEM_LANGUAGE_STORAGE_KEY) ||
    window.localStorage.getItem(WORK_LANGUAGE_STORAGE_KEY);

  return normalizeStoredLanguage(savedLanguage);
}

function getInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') {
    return 'sk';
  }

  const languageFromPath = getLanguageFromPath();

  if (languageFromPath) {
    return languageFromPath;
  }

  const userSelectedLanguage =
    window.localStorage.getItem(LANGUAGE_USER_SELECTED_KEY) === 'true';

  const storedLanguage = getStoredLanguage();

  if (userSelectedLanguage && storedLanguage) {
    return storedLanguage;
  }

  if (storedLanguage) {
    return storedLanguage;
  }

  return 'sk';
}

function updateProfileInterfaceLanguage(
  nextLanguage: AppLanguage,
  updateWorkLanguage = false,
) {
  if (typeof window === 'undefined') return;

  const now = new Date().toISOString();

  const activeProfile = safeJsonParse<StoredProfile>(
    window.localStorage.getItem(ACTIVE_PROFILE_KEY),
  );

  if (activeProfile?.id) {
    const updatedProfile: StoredProfile = {
      ...activeProfile,
      interfaceLanguage: nextLanguage,
      updatedAt: now,
    };

    if (updateWorkLanguage) {
      updatedProfile.workLanguage = nextLanguage;
    }

    window.localStorage.setItem(
      ACTIVE_PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );

    window.localStorage.setItem(
      LEGACY_PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );

    const profilesFull = safeJsonParse<StoredProfile[]>(
      window.localStorage.getItem(PROFILES_FULL_KEY),
    );

    if (Array.isArray(profilesFull)) {
      const updatedProfiles = profilesFull.map((profile) => {
        if (profile.id === updatedProfile.id) {
          return {
            ...profile,
            interfaceLanguage: nextLanguage,
            ...(updateWorkLanguage ? { workLanguage: nextLanguage } : {}),
            updatedAt: now,
          };
        }

        return profile;
      });

      window.localStorage.setItem(
        PROFILES_FULL_KEY,
        JSON.stringify(updatedProfiles),
      );
    }

    return;
  }

  const legacyProfile = safeJsonParse<StoredProfile>(
    window.localStorage.getItem(LEGACY_PROFILE_KEY),
  );

  if (legacyProfile?.id) {
    const updatedProfile: StoredProfile = {
      ...legacyProfile,
      interfaceLanguage: nextLanguage,
      updatedAt: now,
    };

    if (updateWorkLanguage) {
      updatedProfile.workLanguage = nextLanguage;
    }

    window.localStorage.setItem(
      LEGACY_PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );

    window.localStorage.setItem(
      ACTIVE_PROFILE_KEY,
      JSON.stringify(updatedProfile),
    );
  }
}

function ensureNoTranslateMetaTag() {
  if (typeof document === 'undefined') return;

  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="google"][content="notranslate"]',
  );

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'google';
    meta.content = 'notranslate';
    document.head.appendChild(meta);
  }
}

function applyLanguageToDocument(nextLanguage: AppLanguage) {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = nextLanguage;
  document.documentElement.setAttribute('data-language', nextLanguage);
  document.documentElement.setAttribute('data-system-language', nextLanguage);
  document.documentElement.setAttribute('data-work-language', nextLanguage);
  document.documentElement.setAttribute('translate', 'no');
  document.documentElement.classList.add('notranslate');

  if (document.body) {
    document.body.setAttribute('data-language', nextLanguage);
    document.body.setAttribute('data-system-language', nextLanguage);
    document.body.setAttribute('data-work-language', nextLanguage);
    document.body.setAttribute('translate', 'no');
    document.body.classList.add('notranslate');
  }

  ensureNoTranslateMetaTag();
}

function persistLanguage(
  nextLanguage: AppLanguage,
  options?: {
    markAsUserSelected?: boolean;
    updateProfile?: boolean;
    updateWorkLanguage?: boolean;
  },
) {
  if (typeof window === 'undefined') return;

  const markAsUserSelected = options?.markAsUserSelected ?? false;
  const updateProfile = options?.updateProfile ?? true;
  const updateWorkLanguage = options?.updateWorkLanguage ?? false;

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  window.localStorage.setItem(SYSTEM_LANGUAGE_STORAGE_KEY, nextLanguage);

  if (markAsUserSelected || updateWorkLanguage) {
    window.localStorage.setItem(WORK_LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  if (markAsUserSelected) {
    window.localStorage.setItem(LANGUAGE_USER_SELECTED_KEY, 'true');
  }

  if (updateProfile) {
    updateProfileInterfaceLanguage(nextLanguage, updateWorkLanguage);
  }

  applyLanguageToDocument(nextLanguage);
}

function dispatchLanguageChange(nextLanguage: AppLanguage) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<AppLanguage>('zedpera-language-change', {
      detail: nextLanguage,
    }),
  );

  window.dispatchEvent(
    new CustomEvent<{ language: AppLanguage }>('zedpera-language-updated', {
      detail: {
        language: nextLanguage,
      },
    }),
  );

  window.dispatchEvent(
    new CustomEvent<{ language: AppLanguage }>(
      'zedpera-interface-language-change',
      {
        detail: {
          language: nextLanguage,
        },
      },
    ),
  );

  window.dispatchEvent(
    new CustomEvent<{ language: AppLanguage }>('zedpera-force-language-refresh', {
      detail: {
        language: nextLanguage,
      },
    }),
  );
}

function readLanguageFromCustomEvent(event: Event): AppLanguage | null {
  const customEvent = event as CustomEvent<
    AppLanguage | { language?: AppLanguage; nextLanguage?: AppLanguage }
  >;

  const detail = customEvent.detail;

  if (typeof detail === 'string') {
    return normalizeStoredLanguage(detail);
  }

  return normalizeStoredLanguage(detail?.language || detail?.nextLanguage);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('sk');
  const [isReady, setIsReady] = useState(false);
  const [languageVersion, setLanguageVersion] = useState(0);

  const applyLanguage = useCallback(
    (
      nextLanguage: AppLanguage,
      options?: {
        shouldDispatch?: boolean;
        markAsUserSelected?: boolean;
        updateProfile?: boolean;
        updateWorkLanguage?: boolean;
        forceVersionUpdate?: boolean;
      },
    ) => {
      if (!isValidLanguage(nextLanguage)) return;

      const shouldDispatch = options?.shouldDispatch ?? true;
      const markAsUserSelected = options?.markAsUserSelected ?? false;
      const updateProfile = options?.updateProfile ?? true;
      const updateWorkLanguage = options?.updateWorkLanguage ?? false;
      const forceVersionUpdate = options?.forceVersionUpdate ?? true;

      setLanguageState(nextLanguage);

      if (forceVersionUpdate) {
        setLanguageVersion((version) => version + 1);
      }

      persistLanguage(nextLanguage, {
        markAsUserSelected,
        updateProfile,
        updateWorkLanguage,
      });

      if (shouldDispatch) {
        dispatchLanguageChange(nextLanguage);
      }
    },
    [],
  );

  useEffect(() => {
    const initialLanguage = getInitialLanguage();

    setLanguageState(initialLanguage);
    setLanguageVersion((version) => version + 1);

    persistLanguage(initialLanguage, {
      markAsUserSelected: false,
      updateProfile: false,
      updateWorkLanguage: false,
    });

    setIsReady(true);
    dispatchLanguageChange(initialLanguage);
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key !== LANGUAGE_STORAGE_KEY &&
        event.key !== SYSTEM_LANGUAGE_STORAGE_KEY &&
        event.key !== WORK_LANGUAGE_STORAGE_KEY
      ) {
        return;
      }

      const nextLanguage = normalizeStoredLanguage(event.newValue);

      if (!nextLanguage) return;

      applyLanguage(nextLanguage, {
        shouldDispatch: true,
        markAsUserSelected: false,
        updateProfile: false,
        updateWorkLanguage: false,
        forceVersionUpdate: true,
      });
    };

    const handleCustomLanguageChange = (event: Event) => {
      const nextLanguage = readLanguageFromCustomEvent(event);

      if (!nextLanguage) return;

      applyLanguage(nextLanguage, {
        shouldDispatch: false,
        markAsUserSelected: true,
        updateProfile: true,
        updateWorkLanguage: true,
        forceVersionUpdate: true,
      });
    };

    const handleProfileChange = () => {
      const storedLanguage = getStoredLanguage();

      applyLanguage(storedLanguage || 'sk', {
        shouldDispatch: true,
        markAsUserSelected: false,
        updateProfile: false,
        updateWorkLanguage: false,
        forceVersionUpdate: true,
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('zedpera-profile-change', handleProfileChange);

    LANGUAGE_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleCustomLanguageChange);
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('zedpera-profile-change', handleProfileChange);

      LANGUAGE_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleCustomLanguageChange);
      });
    };
  }, [applyLanguage]);

  const setLanguage = useCallback(
    (nextLanguage: AppLanguage) => {
      if (!isValidLanguage(nextLanguage)) return;

      applyLanguage(nextLanguage, {
        shouldDispatch: true,
        markAsUserSelected: true,
        updateProfile: true,
        updateWorkLanguage: true,
        forceVersionUpdate: true,
      });
    },
    [applyLanguage],
  );

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage,
      t: getTranslation(language),
      appLanguages: languages,
      isTranslatingInterface: false,
      translationProgress: 100,
      languageVersion,
    };
  }, [language, setLanguage, languageVersion]);

  return (
    <LanguageContext.Provider value={value}>
      {isReady ? children : null}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage musí byť použitý vo vnútri LanguageProvider.');
  }

  return context;
}