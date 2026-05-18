'use client';

import type { AppLanguage } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageProvider';

export default function LanguageSwitcher() {
  const { language, setLanguage, appLanguages } = useLanguage();

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-white/10">
      {appLanguages.map((item) => {
        const active = item.code === language;

        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLanguage(item.code as AppLanguage)}
            title={item.label}
            aria-label={`Zmeniť jazyk na ${item.label}`}
            className={`rounded-xl px-3 py-2 text-xs font-black transition ${
              active
                ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
            }`}
          >
            {item.shortLabel || item.short || item.code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}