'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

type Props = {
  compact?: boolean;
};

export default function ThemeToggleButton({ compact = false }: Props) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'}
      title={isDark ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'}
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12] ${
        compact ? 'h-[44px] w-[58px]' : 'h-[46px] w-[82px]'
      }`}
    >
      <span className="flex items-center justify-center gap-2">
        <Sun
          className={`h-5 w-5 transition-all duration-300 ${
            isDark
              ? 'scale-100 text-amber-400 opacity-100'
              : 'scale-90 text-slate-400 opacity-45'
          }`}
        />

        <Moon
          className={`h-5 w-5 transition-all duration-300 ${
            isDark
              ? 'scale-90 text-slate-400 opacity-45'
              : 'scale-100 text-violet-700 opacity-100'
          }`}
        />
      </span>
    </button>
  );
}