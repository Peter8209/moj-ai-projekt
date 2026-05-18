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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('sk');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('zedpera_language');

    if (isValidLanguage(savedLanguage)) {
      setLanguageState(savedLanguage);
      document.documentElement.lang = savedLanguage;
      return;
    }

    const browserLanguage = normalizeLanguage(
      navigator.language || navigator.languages?.[0] || 'sk',
    );

    setLanguageState(browserLanguage);
    document.documentElement.lang = browserLanguage;
    localStorage.setItem('zedpera_language', browserLanguage);
  }, []);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    if (!isValidLanguage(nextLanguage)) {
      return;
    }

    setLanguageState(nextLanguage);
    localStorage.setItem('zedpera_language', nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, []);

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
      {children}
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