'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

type ThemeToggleButtonProps = {
  compact?: boolean;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function ThemeToggleButton({
  compact = false,
  className,
}: ThemeToggleButtonProps) {
  const { isDark, toggleTheme } = useTheme();

  const label = isDark ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      data-theme={isDark ? 'dark' : 'light'}
      className={cx(
        'group relative inline-flex shrink-0 items-center overflow-hidden rounded-2xl border shadow-sm outline-none transition-all duration-300',
        'focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        'dark:focus-visible:ring-violet-300 dark:focus-visible:ring-offset-slate-950',

        compact ? 'h-11 w-[58px] px-1.5' : 'h-[46px] w-[82px] px-2',

        'border-slate-200 bg-white text-slate-700',
        'hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950',

        'dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100',
        'dark:hover:border-white/15 dark:hover:bg-white/[0.10]',

        className
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'absolute top-1/2 -translate-y-1/2 rounded-xl shadow-sm transition-all duration-300 ease-out',
          'bg-slate-100 ring-1 ring-slate-200',
          'dark:bg-white/[0.12] dark:ring-white/10',

          compact ? 'h-8 w-8' : 'h-8 w-8',

          isDark
            ? compact
              ? 'left-[22px]'
              : 'left-[42px]'
            : 'left-[6px]'
        )}
      />

      <span
        aria-hidden="true"
        className={cx(
          'relative z-10 grid w-full items-center',
          compact ? 'grid-cols-2 gap-1' : 'grid-cols-2 gap-2'
        )}
      >
        <span className="flex items-center justify-center">
          <Sun
            className={cx(
              'h-5 w-5 transition-all duration-300',
              isDark
                ? 'scale-100 text-amber-400 opacity-100'
                : 'scale-90 text-slate-400 opacity-55 group-hover:text-slate-500'
            )}
            strokeWidth={2.2}
          />
        </span>

        <span className="flex items-center justify-center">
          <Moon
            className={cx(
              'h-5 w-5 transition-all duration-300',
              isDark
                ? 'scale-90 text-slate-400 opacity-55 dark:text-slate-500'
                : 'scale-100 text-violet-700 opacity-100'
            )}
            strokeWidth={2.2}
          />
        </span>
      </span>
    </button>
  );
}