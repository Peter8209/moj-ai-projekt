'use client';

import type { AppLanguage } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageProvider';

function getNativeLanguageLabel(code: AppLanguage, fallback: string) {
  switch (code) {
    case 'sk':
      return 'Slovenčina';
    case 'cs':
      return 'Čeština';
    case 'en':
      return 'English';
    case 'de':
      return 'Deutsch';
    case 'pl':
      return 'Polski';
    case 'hu':
      return 'Magyar';
    default:
      return fallback;
  }
}

function getShortLanguageLabel(code: AppLanguage, fallback?: string) {
  if (fallback) return fallback;

  switch (code) {
    case 'sk':
      return 'SK';
    case 'cs':
      return 'CZ';
    case 'en':
      return 'EN';
    case 'de':
      return 'DE';
    case 'pl':
      return 'PL';
    case 'hu':
      return 'HU';
    default:
      return 'SK';
  }
}

function updateStoredProfileLanguage(nextLanguage: AppLanguage) {
  if (typeof window === 'undefined') return;

  const now = new Date().toISOString();

  const updateProfileByKey = (key: string) => {
    const raw = window.localStorage.getItem(key);

    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const updated = {
        ...parsed,
        interfaceLanguage: nextLanguage,
        updatedAt: now,
      };

      window.localStorage.setItem(key, JSON.stringify(updated));

      return updated;
    } catch {
      return null;
    }
  };

  const updatedActiveProfile = updateProfileByKey('active_profile');
  updateProfileByKey('profile');

  const rawProfilesFull = window.localStorage.getItem('profiles_full');

  if (rawProfilesFull) {
    try {
      const profiles = JSON.parse(rawProfilesFull);

      if (Array.isArray(profiles)) {
        const updatedProfiles = profiles.map((profile) => {
          if (
            updatedActiveProfile?.id &&
            profile?.id === updatedActiveProfile.id
          ) {
            return {
              ...profile,
              interfaceLanguage: nextLanguage,
              updatedAt: now,
            };
          }

          return profile;
        });

        window.localStorage.setItem(
          'profiles_full',
          JSON.stringify(updatedProfiles),
        );
      }
    } catch {
      // Neplatné profiles_full ignorujeme, aby prepínač nespadol.
    }
  }
}

export default function LanguageSwitcher() {
  const { language, setLanguage, appLanguages } = useLanguage();

  function handleLanguageChange(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage);

    if (typeof window === 'undefined') return;

    window.localStorage.setItem('zedpera_language', nextLanguage);

    updateStoredProfileLanguage(nextLanguage);

    document.documentElement.lang = nextLanguage;
    document.documentElement.setAttribute('data-language', nextLanguage);

    window.dispatchEvent(
      new CustomEvent<AppLanguage>('zedpera-language-change', {
        detail: nextLanguage,
      }),
    );

    window.dispatchEvent(new CustomEvent('zedpera-profile-change'));
  }

  return (
    <div
      className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-white/10"
      role="group"
      aria-label="Výber jazyka rozhrania"
    >
      {appLanguages.map((item) => {
        const code = item.code;
        const active = code === language;

        const label = getNativeLanguageLabel(code, item.label);
        const shortLabel = getShortLanguageLabel(
          code,
          item.shortLabel || item.short,
        );

        return (
          <button
            key={code}
            type="button"
            onClick={() => handleLanguageChange(code)}
            title={label}
            aria-label={`Zmeniť jazyk rozhrania na ${label}`}
            aria-pressed={active}
            className={`min-h-[38px] rounded-xl px-3 py-2 text-xs font-black transition ${
              active
                ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
            }`}
          >
            {shortLabel}
          </button>
        );
      })}
    </div>
  );
}