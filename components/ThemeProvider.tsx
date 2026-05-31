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

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'zedpera_theme';
const LEGACY_THEME_STORAGE_KEY = 'zedpera-theme';
const THEME_STYLE_ID = 'zedpera-global-force-light-dark-style';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  try {
    const savedTheme =
      window.localStorage.getItem(THEME_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);

    if (isTheme(savedTheme)) {
      return savedTheme;
    }
  } catch {
    // ignore
  }

  return getSystemTheme();
}

function injectThemeStyle() {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.getElementById(THEME_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = THEME_STYLE_ID;

  style.innerHTML = `
    /* =========================================================
       ZEDPERA - FORCE GLOBAL THEME
       Cieľ:
       - light režim = svetlé pozadie
       - všetok text tmavý a kontrastný
       - dark režim = tmavé pozadie a svetlý text
       - prepísanie starých tmavých bg tried a bledých textov
    ========================================================= */

    html[data-theme='light'] {
      color-scheme: light;

      --zed-bg: #f4f7fb;
      --zed-bg-2: #edf2f8;
      --zed-surface: #ffffff;
      --zed-surface-2: #f8fafc;
      --zed-surface-3: #eef2f7;
      --zed-sidebar: #f7f9fc;
      --zed-sidebar-active: #ffffff;

      --zed-border: #cbd5e1;
      --zed-border-strong: #94a3b8;

      --zed-text: #020617;
      --zed-text-2: #0f172a;
      --zed-muted: #1e293b;
      --zed-soft: #334155;
      --zed-placeholder: #64748b;

      --zed-primary: #7c3aed;
      --zed-primary-2: #9333ea;
      --zed-primary-soft: rgba(124, 58, 237, 0.08);

      --zed-success: #047857;
      --zed-danger: #dc2626;
      --zed-info: #2563eb;

      --zed-shadow: 0 10px 35px rgba(15, 23, 42, 0.10);
    }

    html[data-theme='dark'] {
      color-scheme: dark;

      --zed-bg: #050711;
      --zed-bg-2: #070a16;
      --zed-surface: #0b1020;
      --zed-surface-2: #10172a;
      --zed-surface-3: #151d33;
      --zed-sidebar: #050711;
      --zed-sidebar-active: #111827;

      --zed-border: rgba(255,255,255,0.12);
      --zed-border-strong: rgba(255,255,255,0.22);

      --zed-text: #ffffff;
      --zed-text-2: #f8fafc;
      --zed-muted: #e2e8f0;
      --zed-soft: #cbd5e1;
      --zed-placeholder: #94a3b8;

      --zed-primary: #8b5cf6;
      --zed-primary-2: #d946ef;
      --zed-primary-soft: rgba(139, 92, 246, 0.14);

      --zed-success: #34d399;
      --zed-danger: #f87171;
      --zed-info: #60a5fa;

      --zed-shadow: 0 14px 40px rgba(0, 0, 0, 0.42);
    }

    html,
    body {
      min-height: 100%;
      background: var(--zed-bg) !important;
      color: var(--zed-text) !important;
    }

    body {
      margin: 0;
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
      font-weight: 600;
    }

    .theme-root,
    .dashboard-shell,
    .dashboard-page {
      min-height: 100vh;
      background: var(--zed-bg) !important;
      color: var(--zed-text) !important;
    }

    .theme-root,
    .theme-root *,
    .dashboard-shell,
    .dashboard-shell *,
    .dashboard-page,
    .dashboard-page * {
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
      transition:
        background-color 0.22s ease,
        color 0.22s ease,
        border-color 0.22s ease,
        box-shadow 0.22s ease,
        opacity 0.22s ease;
    }

    /* =========================================================
       1. TEXTY - VŠETKO KONTRASTNÉ
    ========================================================= */

    .theme-root :where(
      p,
      span,
      div,
      label,
      small,
      li,
      td,
      th,
      a,
      button,
      input,
      textarea,
      select
    ) {
      font-weight: 700;
    }

    html[data-theme='light'] .theme-root :where(
      p,
      span,
      div,
      label,
      small,
      li,
      td,
      th,
      a
    ) {
      color: var(--zed-text-2) !important;
    }

    html[data-theme='dark'] .theme-root :where(
      p,
      span,
      div,
      label,
      small,
      li,
      td,
      th,
      a
    ) {
      color: var(--zed-text-2) !important;
    }

    .theme-root :where(h1, h2, h3, h4, h5, h6, strong, b) {
      color: var(--zed-text) !important;
      font-weight: 900 !important;
      letter-spacing: -0.01em;
    }

    /* =========================================================
       2. TAILWIND TEXT FARBY - PREPÍSAŤ
    ========================================================= */

    html[data-theme='light'] .theme-root [class*="text-slate-"],
    html[data-theme='light'] .theme-root [class*="text-gray-"],
    html[data-theme='light'] .theme-root [class*="text-zinc-"],
    html[data-theme='light'] .theme-root [class*="text-neutral-"],
    html[data-theme='light'] .theme-root [class*="text-stone-"] {
      color: var(--zed-muted) !important;
      opacity: 1 !important;
      font-weight: 700 !important;
    }

    html[data-theme='dark'] .theme-root [class*="text-slate-"],
    html[data-theme='dark'] .theme-root [class*="text-gray-"],
    html[data-theme='dark'] .theme-root [class*="text-zinc-"],
    html[data-theme='dark'] .theme-root [class*="text-neutral-"],
    html[data-theme='dark'] .theme-root [class*="text-stone-"] {
      color: var(--zed-soft) !important;
      opacity: 1 !important;
      font-weight: 700 !important;
    }

    html[data-theme='light'] .theme-root [class*="text-violet-"],
    html[data-theme='light'] .theme-root [class*="text-purple-"],
    html[data-theme='light'] .theme-root [class*="text-fuchsia-"] {
      color: #5b21b6 !important;
      font-weight: 800 !important;
      opacity: 1 !important;
    }

    html[data-theme='dark'] .theme-root [class*="text-violet-"],
    html[data-theme='dark'] .theme-root [class*="text-purple-"],
    html[data-theme='dark'] .theme-root [class*="text-fuchsia-"] {
      color: #e9d5ff !important;
      font-weight: 800 !important;
      opacity: 1 !important;
    }

    /* =========================================================
       3. OPACITY - nič nesmie byť nečitateľné
    ========================================================= */

    .theme-root [class*="opacity-0"],
    .theme-root [class*="opacity-5"],
    .theme-root [class*="opacity-10"],
    .theme-root [class*="opacity-20"],
    .theme-root [class*="opacity-25"],
    .theme-root [class*="opacity-30"],
    .theme-root [class*="opacity-40"],
    .theme-root [class*="opacity-50"],
    .theme-root [class*="opacity-60"],
    .theme-root [class*="opacity-70"],
    .theme-root [class*="opacity-75"] {
      opacity: 1 !important;
    }

    .theme-root :where(
      button:disabled,
      input:disabled,
      textarea:disabled,
      select:disabled,
      [aria-disabled='true']
    ) {
      opacity: 0.86 !important;
      color: var(--zed-soft) !important;
      cursor: not-allowed !important;
      font-weight: 700 !important;
    }

    /* =========================================================
       4. SVETLÉ POZADIA V LIGHT REŽIME
       prepísanie starých tmavých backgroundov
    ========================================================= */

    html[data-theme='light'] .theme-root,
    html[data-theme='light'] .dashboard-shell,
    html[data-theme='light'] .dashboard-page,
    html[data-theme='light'] .theme-root main,
    html[data-theme='light'] .theme-root section,
    html[data-theme='light'] .theme-root article {
      background: transparent;
      color: var(--zed-text);
    }

    html[data-theme='light'] .theme-root [class*="bg-[#050711]"],
    html[data-theme='light'] .theme-root [class*="bg-[#070a16]"],
    html[data-theme='light'] .theme-root [class*="bg-[#0b1020]"],
    html[data-theme='light'] .theme-root [class*="bg-[#020617]"],
    html[data-theme='light'] .theme-root [class*="bg-slate-950"],
    html[data-theme='light'] .theme-root [class*="bg-slate-900"],
    html[data-theme='light'] .theme-root [class*="bg-gray-950"],
    html[data-theme='light'] .theme-root [class*="bg-gray-900"],
    html[data-theme='light'] .theme-root [class*="bg-zinc-950"],
    html[data-theme='light'] .theme-root [class*="bg-zinc-900"],
    html[data-theme='light'] .theme-root [class*="bg-black"],
    html[data-theme='light'] .theme-root [class*="bg-black/"],
    html[data-theme='light'] .theme-root [class*="bg-violet-950"],
    html[data-theme='light'] .theme-root [class*="bg-purple-950"] {
      background: var(--zed-surface) !important;
      color: var(--zed-text) !important;
      box-shadow: var(--zed-shadow);
    }

    html[data-theme='light'] .theme-root [class*="bg-white/"],
    html[data-theme='light'] .theme-root [class*="bg-white["],
    html[data-theme='light'] .theme-root [class*="bg-slate-50"],
    html[data-theme='light'] .theme-root [class*="bg-slate-100"],
    html[data-theme='light'] .theme-root [class*="bg-slate-200"],
    html[data-theme='light'] .theme-root [class*="bg-gray-50"],
    html[data-theme='light'] .theme-root [class*="bg-gray-100"],
    html[data-theme='light'] .theme-root [class*="bg-gray-200"],
    html[data-theme='light'] .theme-root [class*="bg-zinc-50"],
    html[data-theme='light'] .theme-root [class*="bg-zinc-100"],
    html[data-theme='light'] .theme-root [class*="bg-zinc-200"],
    html[data-theme='light'] .theme-root [class*="bg-neutral-50"],
    html[data-theme='light'] .theme-root [class*="bg-neutral-100"],
    html[data-theme='light'] .theme-root [class*="bg-neutral-200"] {
      background: var(--zed-surface-2) !important;
      color: var(--zed-text) !important;
    }

    /* =========================================================
       5. SIDEBAR / MENU / HEADER
    ========================================================= */

    .theme-root aside,
    .theme-root nav,
    .theme-root header,
    .theme-root .dashboard-sidebar,
    .theme-root .sidebar,
    .theme-root [data-sidebar='true'] {
      background: var(--zed-sidebar) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
    }

    .theme-root aside *,
    .theme-root nav *,
    .theme-root header *,
    .theme-root .dashboard-sidebar *,
    .theme-root .sidebar *,
    .theme-root [data-sidebar='true'] * {
      color: var(--zed-text) !important;
      opacity: 1 !important;
      font-weight: 800 !important;
    }

    .theme-root aside .active,
    .theme-root nav .active,
    .theme-root .dashboard-sidebar .active,
    .theme-root [aria-current='page'] {
      background: var(--zed-sidebar-active) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
      box-shadow: var(--zed-shadow);
    }

    /* =========================================================
       6. KARTY, SURFACES, BOXES
    ========================================================= */

    .theme-root .dashboard-surface,
    .theme-root .card,
    .theme-root [data-card='true'] {
      background: var(--zed-surface) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
      box-shadow: var(--zed-shadow);
    }

    .theme-root .dashboard-surface-soft,
    .theme-root [data-surface='soft'] {
      background: var(--zed-surface-2) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
    }

    /* =========================================================
       7. BORDERS
    ========================================================= */

    .theme-root .border,
    .theme-root [class*="border"] {
      border-color: var(--zed-border) !important;
    }

    .theme-root [class*="border-white/"],
    .theme-root [class*="border-slate-"],
    .theme-root [class*="border-gray-"],
    .theme-root [class*="border-zinc-"],
    .theme-root [class*="border-neutral-"] {
      border-color: var(--zed-border) !important;
    }

    /* =========================================================
       8. INPUTS / PLACEHOLDERS
    ========================================================= */

    .theme-root input,
    .theme-root textarea,
    .theme-root select {
      background: var(--zed-surface) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
      caret-color: var(--zed-primary) !important;
      font-weight: 750 !important;
    }

    .theme-root input::placeholder,
    .theme-root textarea::placeholder {
      color: var(--zed-placeholder) !important;
      opacity: 1 !important;
      font-weight: 700 !important;
    }

    .theme-root input:focus,
    .theme-root textarea:focus,
    .theme-root select:focus {
      outline: none !important;
      border-color: var(--zed-primary) !important;
      box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.16) !important;
    }

    /* =========================================================
       9. BUTTONS
    ========================================================= */

    .theme-root button,
    .theme-root a,
    .theme-root [role='button'],
    .theme-root [role='tab'] {
      font-weight: 850 !important;
      opacity: 1 !important;
    }

    html[data-theme='light'] .theme-root button:not([class*="bg-violet"]):not([class*="bg-purple"]):not([class*="bg-fuchsia"]):not([class*="bg-blue"]):not([class*="bg-red"]):not([class*="bg-emerald"]),
    html[data-theme='light'] .theme-root a:not([class*="bg-violet"]):not([class*="bg-purple"]):not([class*="bg-fuchsia"]):not([class*="bg-blue"]):not([class*="bg-red"]):not([class*="bg-emerald"]) {
      color: var(--zed-text) !important;
    }

    /* Farebné CTA nech ostanú výrazné */
    .theme-root [class*="bg-violet-"],
    .theme-root [class*="bg-purple-"],
    .theme-root [class*="bg-fuchsia-"],
    .theme-root [class*="bg-blue-"],
    .theme-root [class*="bg-red-"],
    .theme-root [class*="bg-emerald-"],
    .theme-root [class*="from-violet-"],
    .theme-root [class*="from-purple-"],
    .theme-root [class*="to-fuchsia-"],
    .theme-root [class*="to-violet-"] {
      color: #ffffff !important;
      font-weight: 900 !important;
    }

    .theme-root [class*="bg-violet-"] *,
    .theme-root [class*="bg-purple-"] *,
    .theme-root [class*="bg-fuchsia-"] *,
    .theme-root [class*="bg-blue-"] *,
    .theme-root [class*="bg-red-"] *,
    .theme-root [class*="bg-emerald-"] *,
    .theme-root [class*="from-violet-"] *,
    .theme-root [class*="from-purple-"] *,
    .theme-root [class*="to-fuchsia-"] *,
    .theme-root [class*="to-violet-"] * {
      color: #ffffff !important;
      font-weight: 900 !important;
    }

    /* =========================================================
       10. TABLES / MODALS / POPUPS
    ========================================================= */

    .theme-root table {
      background: var(--zed-surface) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
    }

    .theme-root th {
      color: var(--zed-text) !important;
      font-weight: 900 !important;
    }

    .theme-root td {
      color: var(--zed-text-2) !important;
      font-weight: 700 !important;
    }

    html[data-theme='light'] .theme-root [class*="fixed inset-0"][class*="bg-black"],
    html[data-theme='light'] .theme-root [class*="bg-black/80"],
    html[data-theme='light'] .theme-root [class*="bg-black/70"],
    html[data-theme='light'] .theme-root [class*="bg-black/60"] {
      background: rgba(15, 23, 42, 0.20) !important;
    }

    /* =========================================================
       11. SVG ICONS
    ========================================================= */

    .theme-root svg {
      color: currentColor;
      stroke: currentColor;
      stroke-width: 2.25 !important;
      opacity: 1 !important;
    }

    html[data-theme='light'] .theme-root svg {
      color: var(--zed-muted) !important;
    }

    html[data-theme='dark'] .theme-root svg {
      color: var(--zed-soft) !important;
    }

    .theme-root [class*="bg-violet-"] svg,
    .theme-root [class*="bg-purple-"] svg,
    .theme-root [class*="bg-fuchsia-"] svg,
    .theme-root [class*="bg-blue-"] svg,
    .theme-root [class*="bg-red-"] svg,
    .theme-root [class*="bg-emerald-"] svg {
      color: #ffffff !important;
      stroke: #ffffff !important;
    }

    /* =========================================================
       12. SCROLLBAR
    ========================================================= */

    .theme-root ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }

    html[data-theme='light'] .theme-root ::-webkit-scrollbar-track {
      background: #e2e8f0;
    }

    html[data-theme='light'] .theme-root ::-webkit-scrollbar-thumb {
      background: #8b5cf6;
      border-radius: 999px;
    }

    html[data-theme='dark'] .theme-root ::-webkit-scrollbar-track {
      background: #0f172a;
    }

    html[data-theme='dark'] .theme-root ::-webkit-scrollbar-thumb {
      background: #8b5cf6;
      border-radius: 999px;
    }

    /* =========================================================
       13. TEXT SELECTION
    ========================================================= */

    html[data-theme='light'] ::selection {
      background: rgba(124, 58, 237, 0.22);
      color: #020617;
    }

    html[data-theme='dark'] ::selection {
      background: rgba(168, 85, 247, 0.36);
      color: #ffffff;
    }

    /* =========================================================
       14. POMOCNÉ TRIEDY
    ========================================================= */

    .force-readable,
    .force-readable * {
      opacity: 1 !important;
    }

    .dashboard-muted {
      color: var(--zed-muted) !important;
      font-weight: 750 !important;
      opacity: 1 !important;
    }
  `;

  document.head.appendChild(style);
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document === 'undefined') {
    return;
  }

  injectThemeStyle();

  const root = document.documentElement;

  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

function saveTheme(theme: Theme) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(LEGACY_THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

function notifyThemeChange(theme: Theme) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('zedpera-theme-change', {
      detail: {
        theme,
        isDark: theme === 'dark',
      },
    }),
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initialTheme = getInitialTheme();

    setThemeState(initialTheme);
    applyThemeToDocument(initialTheme);
    saveTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageThemeChange = () => {
      const savedTheme =
        window.localStorage.getItem(THEME_STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);

      if (!isTheme(savedTheme)) {
        return;
      }

      setThemeState(savedTheme);
      applyThemeToDocument(savedTheme);
    };

    const handleCustomThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme?: Theme }>;
      const nextTheme = customEvent.detail?.theme;

      if (!isTheme(nextTheme)) {
        return;
      }

      setThemeState(nextTheme);
      applyThemeToDocument(nextTheme);
      saveTheme(nextTheme);
    };

    window.addEventListener('storage', handleStorageThemeChange);
    window.addEventListener('zedpera-theme-change', handleCustomThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorageThemeChange);
      window.removeEventListener('zedpera-theme-change', handleCustomThemeChange);
    };
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    applyThemeToDocument(nextTheme);
    saveTheme(nextTheme);
    notifyThemeChange(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div
        data-theme-ready={mounted ? 'true' : 'false'}
        data-current-theme={theme}
        className="theme-root dashboard-shell dashboard-page force-readable min-h-screen"
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme musí byť použitý vo vnútri ThemeProvider.');
  }

  return context;
}