'use client';

import { useState } from 'react';
import type { AppLanguage } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageProvider';
import TranslationLoadingOverlay from '@/components/TranslationLoadingOverlay';

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

export default function LanguageSwitcher() {
  const { language, setLanguage, appLanguages } = useLanguage();

  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [translationLanguageLabel, setTranslationLanguageLabel] = useState('');

  function startTranslationProgress() {
    setTranslationLoading(true);
    setTranslationProgress(0);

    let current = 0;

    const interval = window.setInterval(() => {
      current += Math.floor(Math.random() * 9) + 4;

      if (current >= 92) {
        current = 92;
        window.clearInterval(interval);
      }

      setTranslationProgress(current);
    }, 180);

    return interval;
  }

  function finishTranslationProgress(interval: number) {
    window.clearInterval(interval);

    setTranslationProgress(100);

    window.setTimeout(() => {
      setTranslationLoading(false);
      setTranslationProgress(0);
    }, 500);
  }

  async function handleLanguageChange(code: AppLanguage, label: string) {
    if (code === language) return;

    setTranslationLanguageLabel(getNativeLanguageLabel(code, label));

    const progressInterval = startTranslationProgress();

    try {
      localStorage.setItem('zedpera_language', code);
      localStorage.setItem('zedpera_system_language', code);
      localStorage.setItem('zedpera_work_language', code);

      document.documentElement.lang = code;
      document.documentElement.setAttribute('data-language', code);
      document.documentElement.setAttribute('data-system-language', code);
      document.documentElement.setAttribute('data-work-language', code);

      setLanguage(code);

      window.dispatchEvent(
        new CustomEvent<AppLanguage>('zedpera-language-change', {
          detail: code,
        }),
      );

      await new Promise((resolve) => window.setTimeout(resolve, 900));

      finishTranslationProgress(progressInterval);
    } catch (error) {
      console.warn('LANGUAGE CHANGE ERROR:', error);

      finishTranslationProgress(progressInterval);
    }
  }

  return (
    <>
      <TranslationLoadingOverlay
        visible={translationLoading}
        progress={translationProgress}
        languageLabel={translationLanguageLabel}
      />

      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-white/10">
        {appLanguages.map((item) => {
          const active = item.code === language;

          return (
            <button
              key={item.code}
              type="button"
              onClick={() =>
                void handleLanguageChange(item.code as AppLanguage, item.label)
              }
              title={item.label}
              aria-label={`Zmeniť jazyk na ${item.label}`}
              disabled={translationLoading}
              className={`rounded-xl px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
            >
              {item.code.toUpperCase()}
            </button>
          );
        })}
      </div>
    </>
  );
}