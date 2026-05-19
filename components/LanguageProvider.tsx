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
};

type StoredProfile = {
  id?: string;
  interfaceLanguage?: AppLanguage;
  workLanguage?: AppLanguage;
  updatedAt?: string;
  [key: string]: unknown;
};

const LANGUAGE_STORAGE_KEY = 'zedpera_language';
const ACTIVE_PROFILE_KEY = 'active_profile';
const LEGACY_PROFILE_KEY = 'profile';
const PROFILES_FULL_KEY = 'profiles_full';

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

function getLanguageFromProfile(): AppLanguage | null {
  if (typeof window === 'undefined') return null;

  const activeProfile = safeJsonParse<StoredProfile>(
    window.localStorage.getItem(ACTIVE_PROFILE_KEY),
  );

  if (isValidLanguage(activeProfile?.interfaceLanguage)) {
    return activeProfile.interfaceLanguage;
  }

  const legacyProfile = safeJsonParse<StoredProfile>(
    window.localStorage.getItem(LEGACY_PROFILE_KEY),
  );

  if (isValidLanguage(legacyProfile?.interfaceLanguage)) {
    return legacyProfile.interfaceLanguage;
  }

  return null;
}

function getInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') {
    return 'sk';
  }

  const languageFromPath = getLanguageFromPath();

  if (languageFromPath) {
    return languageFromPath;
  }

  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (isValidLanguage(savedLanguage)) {
    return savedLanguage;
  }

  const languageFromProfile = getLanguageFromProfile();

  if (languageFromProfile) {
    return languageFromProfile;
  }

  const browserLanguage = normalizeLanguage(
    window.navigator.languages?.[0] || window.navigator.language || 'sk',
  );

  return isValidLanguage(browserLanguage) ? browserLanguage : 'sk';
}

function updateProfileInterfaceLanguage(nextLanguage: AppLanguage) {
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

function applyLanguageToDocument(nextLanguage: AppLanguage) {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = nextLanguage;
  document.documentElement.setAttribute('data-language', nextLanguage);
}

function persistLanguage(nextLanguage: AppLanguage) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  updateProfileInterfaceLanguage(nextLanguage);
  applyLanguageToDocument(nextLanguage);
}

function dispatchLanguageChange(nextLanguage: AppLanguage) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<AppLanguage>('zedpera-language-change', {
      detail: nextLanguage,
    }),
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('sk');
  const [isReady, setIsReady] = useState(false);

  const applyLanguage = useCallback(
    (nextLanguage: AppLanguage, shouldDispatch = true) => {
      if (!isValidLanguage(nextLanguage)) return;

      setLanguageState(nextLanguage);
      persistLanguage(nextLanguage);

      if (shouldDispatch) {
        dispatchLanguageChange(nextLanguage);
      }
    },
    [],
  );

  useEffect(() => {
    const initialLanguage = getInitialLanguage();

    setLanguageState(initialLanguage);
    persistLanguage(initialLanguage);
    setIsReady(true);

    dispatchLanguageChange(initialLanguage);
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_STORAGE_KEY) return;

      const nextLanguage = event.newValue;

      if (!isValidLanguage(nextLanguage)) return;

      applyLanguage(nextLanguage, false);
    };

    const handleCustomLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppLanguage>;
      const nextLanguage = customEvent.detail;

      if (!isValidLanguage(nextLanguage)) return;

      applyLanguage(nextLanguage, false);
    };

    const handleProfileChange = () => {
      const profileLanguage = getLanguageFromProfile();

      if (!profileLanguage) return;

      applyLanguage(profileLanguage, true);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(
      'zedpera-language-change',
      handleCustomLanguageChange,
    );
    window.addEventListener('zedpera-profile-change', handleProfileChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(
        'zedpera-language-change',
        handleCustomLanguageChange,
      );
      window.removeEventListener('zedpera-profile-change', handleProfileChange);
    };
  }, [applyLanguage]);

  const setLanguage = useCallback(
    (nextLanguage: AppLanguage) => {
      applyLanguage(nextLanguage, true);
    },
    [applyLanguage],
  );

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage,
      t: getTranslation(language),
      appLanguages: languages,
    };
  }, [language, setLanguage]);

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