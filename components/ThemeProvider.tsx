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
const THEME_STYLE_ID = 'zedpera-global-dark-ui-style-v1';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark';
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

  return 'dark';
}

function injectThemeStyle() {
  if (typeof document === 'undefined') {
    return;
  }

  const existingStyle = document.getElementById(THEME_STYLE_ID);
  if (existingStyle) {
    return;
  }

  const style = document.createElement('style');
  style.id = THEME_STYLE_ID;

  style.innerHTML = `
    /* =========================================================
       ZEDPERA GLOBAL THEME
       Predvolený režim: DARK
       Cieľ:
       - tmavé pozadie
       - biele čitateľné písmo
       - tmavé karty, modaly, menu, inputy, tabuľky
       - profesionálna mobilná responzivita
    ========================================================= */

    html[data-theme='dark'] {
      color-scheme: dark;

      --zed-bg: #03040a;
      --zed-bg-2: #050711;
      --zed-bg-3: #080b16;

      --zed-surface: #080b16;
      --zed-surface-2: #0b1020;
      --zed-surface-3: #10172a;
      --zed-surface-4: #151d33;

      --zed-sidebar: #050711;
      --zed-sidebar-active: #17102f;

      --zed-border: rgba(255,255,255,0.12);
      --zed-border-strong: rgba(255,255,255,0.22);
      --zed-ring: rgba(139,92,246,0.22);

      --zed-text: #ffffff;
      --zed-text-2: #f8fafc;
      --zed-text-3: #e5e7eb;
      --zed-soft: #cbd5e1;
      --zed-muted: #94a3b8;
      --zed-placeholder: #94a3b8;

      --zed-primary: #8b5cf6;
      --zed-primary-2: #a855f7;
      --zed-primary-3: #d946ef;
      --zed-primary-soft: rgba(139,92,246,0.18);

      --zed-success: #34d399;
      --zed-danger: #fb7185;
      --zed-info: #60a5fa;

      --zed-shadow: 0 18px 45px rgba(0,0,0,0.45);
      --zed-shadow-strong: 0 24px 70px rgba(0,0,0,0.60);
    }

    html[data-theme='light'] {
      color-scheme: light;

      --zed-bg: #f4f7fb;
      --zed-bg-2: #eef3f8;
      --zed-bg-3: #f8fafc;

      --zed-surface: #ffffff;
      --zed-surface-2: #f8fafc;
      --zed-surface-3: #eef2ff;
      --zed-surface-4: #e9d5ff;

      --zed-sidebar: #ffffff;
      --zed-sidebar-active: #f3e8ff;

      --zed-border: #cbd5e1;
      --zed-border-strong: #94a3b8;
      --zed-ring: rgba(124,58,237,0.18);

      --zed-text: #020617;
      --zed-text-2: #0f172a;
      --zed-text-3: #1e293b;
      --zed-soft: #334155;
      --zed-muted: #475569;
      --zed-placeholder: #64748b;

      --zed-primary: #7c3aed;
      --zed-primary-2: #9333ea;
      --zed-primary-3: #c026d3;
      --zed-primary-soft: rgba(124,58,237,0.10);

      --zed-success: #047857;
      --zed-danger: #dc2626;
      --zed-info: #2563eb;

      --zed-shadow: 0 14px 35px rgba(15,23,42,0.10);
      --zed-shadow-strong: 0 20px 50px rgba(15,23,42,0.16);
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
      font-weight: 650;
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
    .dashboard-page *,
    body * {
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    }

    .theme-root :where(
      h1,
      h2,
      h3,
      h4,
      h5,
      h6,
      strong,
      b
    ) {
      color: var(--zed-text) !important;
      font-weight: 900 !important;
      opacity: 1 !important;
    }

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
      button
    ) {
      color: var(--zed-text-2) !important;
      opacity: 1 !important;
      font-weight: 700;
    }

    html[data-theme='dark'] body :where(
      main,
      section,
      article,
      aside,
      nav,
      header,
      footer,
      form,
      dialog
    ) {
      background-color: transparent;
      color: var(--zed-text) !important;
    }

    /* =========================================================
       DARK MODE - všetky svetlé okná prepísať na tmavé
    ========================================================= */

    html[data-theme='dark'] body [class*="bg-white"],
    html[data-theme='dark'] body [class*="bg-white/"],
    html[data-theme='dark'] body [class*="bg-slate-50"],
    html[data-theme='dark'] body [class*="bg-slate-100"],
    html[data-theme='dark'] body [class*="bg-slate-200"],
    html[data-theme='dark'] body [class*="bg-gray-50"],
    html[data-theme='dark'] body [class*="bg-gray-100"],
    html[data-theme='dark'] body [class*="bg-gray-200"],
    html[data-theme='dark'] body [class*="bg-zinc-50"],
    html[data-theme='dark'] body [class*="bg-zinc-100"],
    html[data-theme='dark'] body [class*="bg-zinc-200"],
    html[data-theme='dark'] body [class*="bg-neutral-50"],
    html[data-theme='dark'] body [class*="bg-neutral-100"],
    html[data-theme='dark'] body [class*="bg-neutral-200"],
    html[data-theme='dark'] body [class*="bg-stone-50"],
    html[data-theme='dark'] body [class*="bg-stone-100"],
    html[data-theme='dark'] body [class*="bg-violet-50"],
    html[data-theme='dark'] body [class*="bg-purple-50"],
    html[data-theme='dark'] body [class*="bg-indigo-50"] {
      background: var(--zed-surface-2) !important;
      background-color: var(--zed-surface-2) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
      box-shadow: var(--zed-shadow) !important;
    }

    html[data-theme='dark'] body [class*="bg-white"] *,
    html[data-theme='dark'] body [class*="bg-white/"] *,
    html[data-theme='dark'] body [class*="bg-slate-50"] *,
    html[data-theme='dark'] body [class*="bg-slate-100"] *,
    html[data-theme='dark'] body [class*="bg-slate-200"] *,
    html[data-theme='dark'] body [class*="bg-gray-50"] *,
    html[data-theme='dark'] body [class*="bg-gray-100"] *,
    html[data-theme='dark'] body [class*="bg-gray-200"] *,
    html[data-theme='dark'] body [class*="bg-zinc-50"] *,
    html[data-theme='dark'] body [class*="bg-zinc-100"] *,
    html[data-theme='dark'] body [class*="bg-zinc-200"] *,
    html[data-theme='dark'] body [class*="bg-neutral-50"] *,
    html[data-theme='dark'] body [class*="bg-neutral-100"] *,
    html[data-theme='dark'] body [class*="bg-neutral-200"] *,
    html[data-theme='dark'] body [class*="bg-stone-50"] *,
    html[data-theme='dark'] body [class*="bg-stone-100"] *,
    html[data-theme='dark'] body [class*="bg-violet-50"] *,
    html[data-theme='dark'] body [class*="bg-purple-50"] *,
    html[data-theme='dark'] body [class*="bg-indigo-50"] * {
      color: var(--zed-text) !important;
      opacity: 1 !important;
      font-weight: 750 !important;
    }

    /* =========================================================
       Karty / boxy / modaly / panely
    ========================================================= */

    .theme-root .dashboard-surface,
    .theme-root .dashboard-surface-soft,
    .theme-root .card,
    .theme-root [data-card='true'],
    .theme-root [data-surface='soft'],
    .theme-root [class*="rounded-"][class*="border"],
    .theme-root [class*="shadow"] {
      background: var(--zed-surface-2) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
      box-shadow: var(--zed-shadow) !important;
    }

    .theme-root .dashboard-surface *,
    .theme-root .dashboard-surface-soft *,
    .theme-root .card *,
    .theme-root [data-card='true'] *,
    .theme-root [data-surface='soft'] *,
    .theme-root [class*="rounded-"][class*="border"] *,
    .theme-root [class*="shadow"] * {
      color: var(--zed-text) !important;
      opacity: 1 !important;
    }

    body :where(
      [role='dialog'],
      dialog,
      [data-modal='true'],
      [data-dialog='true'],
      [data-radix-dialog-content],
      [data-headlessui-state],
      [aria-modal='true'],
      .modal,
      .dialog,
      .Dialog,
      .ReactModal__Content
    ) {
      background: var(--zed-surface-2) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
      box-shadow: var(--zed-shadow-strong) !important;
    }

    body :where(
      [role='dialog'],
      dialog,
      [data-modal='true'],
      [data-dialog='true'],
      [data-radix-dialog-content],
      [data-headlessui-state],
      [aria-modal='true'],
      .modal,
      .dialog,
      .Dialog,
      .ReactModal__Content
    ) * {
      color: var(--zed-text) !important;
      opacity: 1 !important;
    }

    /* =========================================================
       Sidebar / header / menu
    ========================================================= */

    .theme-root aside,
    .theme-root nav,
    .theme-root header,
    .theme-root footer,
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
    .theme-root footer *,
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
      box-shadow: var(--zed-shadow) !important;
    }

    /* =========================================================
       Text farby / opacity
    ========================================================= */

    .theme-root [class*="text-slate-"],
    .theme-root [class*="text-gray-"],
    .theme-root [class*="text-zinc-"],
    .theme-root [class*="text-neutral-"],
    .theme-root [class*="text-stone-"] {
      color: var(--zed-soft) !important;
      opacity: 1 !important;
      font-weight: 750 !important;
    }

    .theme-root [class*="text-violet-"],
    .theme-root [class*="text-purple-"],
    .theme-root [class*="text-fuchsia-"],
    .theme-root [class*="text-indigo-"] {
      color: #e9d5ff !important;
      opacity: 1 !important;
      font-weight: 850 !important;
    }

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

    /* =========================================================
       Inputy / selecty / textarea
    ========================================================= */

    .theme-root input,
    .theme-root textarea,
    .theme-root select,
    body input,
    body textarea,
    body select {
      background: var(--zed-surface-2) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
      caret-color: var(--zed-primary) !important;
      font-weight: 750 !important;
    }

    .theme-root input::placeholder,
    .theme-root textarea::placeholder,
    body input::placeholder,
    body textarea::placeholder {
      color: var(--zed-placeholder) !important;
      opacity: 1 !important;
      font-weight: 700 !important;
    }

    .theme-root input:focus,
    .theme-root textarea:focus,
    .theme-root select:focus,
    body input:focus,
    body textarea:focus,
    body select:focus {
      outline: none !important;
      border-color: var(--zed-primary) !important;
      box-shadow: 0 0 0 4px var(--zed-ring) !important;
    }

    /* =========================================================
       Buttony
    ========================================================= */

    .theme-root button,
    .theme-root a,
    .theme-root [role='button'],
    .theme-root [role='tab'] {
      font-weight: 850 !important;
      opacity: 1 !important;
    }

    .theme-root button:not([class*="bg-violet"]):not([class*="bg-purple"]):not([class*="bg-fuchsia"]):not([class*="bg-blue"]):not([class*="bg-red"]):not([class*="bg-emerald"]),
    .theme-root a:not([class*="bg-violet"]):not([class*="bg-purple"]):not([class*="bg-fuchsia"]):not([class*="bg-blue"]):not([class*="bg-red"]):not([class*="bg-emerald"]) {
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
    }

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

    button:disabled,
    input:disabled,
    textarea:disabled,
    select:disabled,
    [aria-disabled='true'] {
      opacity: 0.88 !important;
      color: var(--zed-muted) !important;
      cursor: not-allowed !important;
    }

    /* =========================================================
       Tabuľky
    ========================================================= */

    .theme-root table,
    body table {
      background: var(--zed-surface-2) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
    }

    .theme-root th,
    body th {
      color: var(--zed-text) !important;
      font-weight: 900 !important;
    }

    .theme-root td,
    body td {
      color: var(--zed-text-2) !important;
      font-weight: 700 !important;
    }

    /* =========================================================
       Borders / SVG / scrollbar
    ========================================================= */

    .theme-root .border,
    .theme-root [class*="border"],
    body [class*="border"] {
      border-color: var(--zed-border) !important;
    }

    .theme-root svg,
    body svg {
      color: currentColor;
      stroke: currentColor;
      stroke-width: 2.25 !important;
      opacity: 1 !important;
    }

    ::selection {
      background: rgba(168,85,247,0.36);
      color: #ffffff;
    }

    .theme-root ::-webkit-scrollbar,
    body ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }

    .theme-root ::-webkit-scrollbar-track,
    body ::-webkit-scrollbar-track {
      background: #0f172a;
    }

    .theme-root ::-webkit-scrollbar-thumb,
    body ::-webkit-scrollbar-thumb {
      background: #8b5cf6;
      border-radius: 999px;
    }

    /* =========================================================
       Mobilná profesionálna úprava
    ========================================================= */

    @media (max-width: 768px) {
      html,
      body,
      .theme-root,
      .dashboard-shell,
      .dashboard-page {
        background: #03040a !important;
        color: #ffffff !important;
      }

      body {
        overflow-x: hidden !important;
      }

      .theme-root main,
      .theme-root section,
      .theme-root article,
      .theme-root aside,
      .theme-root nav,
      .theme-root header,
      .theme-root footer {
        max-width: 100vw !important;
      }

      .theme-root [class*="rounded"],
      .theme-root [class*="shadow"],
      .theme-root [class*="border"] {
        background: var(--zed-surface-2) !important;
        color: #ffffff !important;
        border-color: rgba(255,255,255,0.14) !important;
      }

      .theme-root [class*="bg-white"],
      .theme-root [class*="bg-slate-50"],
      .theme-root [class*="bg-gray-50"],
      .theme-root [class*="bg-zinc-50"],
      .theme-root [class*="bg-neutral-50"] {
        background: var(--zed-surface-2) !important;
        color: #ffffff !important;
      }

      .theme-root [class*="bg-white"] *,
      .theme-root [class*="bg-slate-50"] *,
      .theme-root [class*="bg-gray-50"] *,
      .theme-root [class*="bg-zinc-50"] *,
      .theme-root [class*="bg-neutral-50"] * {
        color: #ffffff !important;
      }

      .theme-root button,
      .theme-root a,
      .theme-root input,
      .theme-root textarea,
      .theme-root select {
        min-height: 44px;
      }
    }

    .force-readable,
    .force-readable * {
      opacity: 1 !important;
    }

    .dashboard-muted {
      color: var(--zed-soft) !important;
      font-weight: 750 !important;
      opacity: 1 !important;
    }

    .dashboard-surface {
      background: var(--zed-surface-2) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
      box-shadow: var(--zed-shadow) !important;
    }

    .dashboard-surface-soft {
      background: var(--zed-surface-3) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
    }

    .dashboard-sidebar {
      background: var(--zed-sidebar) !important;
      color: var(--zed-text) !important;
      border-color: var(--zed-border) !important;
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
  const [theme, setThemeState] = useState<Theme>('dark');
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