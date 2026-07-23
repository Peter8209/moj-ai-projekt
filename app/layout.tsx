import type { Metadata, Viewport } from 'next';
import './globals.css';

import { ThemeProvider } from '@/components/ThemeProvider';
import { LanguageProvider } from '@/components/LanguageProvider';
import AutoTranslateProvider from '@/components/AutoTranslateProvider';
import ZedperaProviders from '@/components/system/ZedperaProviders';

/**
 * Maximálny čas serverového vykonávania pre koreňový route segment.
 *
 * Hodnota je uvedená priamo ako číselný literál, pretože Next.js vyžaduje,
 * aby route-segment konfigurácia bola staticky analyzovateľná počas buildu.
 *
 * Klientské AI požiadavky a minimálne 30-sekundové oneskorenie chybovej
 * hlášky riadi centrálne lib/ai/config.ts cez ai-fetch.ts.
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

export const metadata: Metadata = {
  title: 'Zedpera',
  description: 'AI platforma pre akademické písanie a analýzu',
  applicationName: 'Zedpera',
  authors: [{ name: 'Zedpera' }],
  generator: 'Next.js',
  keywords: [
    'Zedpera',
    'AI',
    'akademické písanie',
    'analýza dát',
    'citácie',
    'študentské práce',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    {
      media: '(prefers-color-scheme: light)',
      color: '#f8fafc',
    },
    {
      media: '(prefers-color-scheme: dark)',
      color: '#020617',
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sk"
      data-language="sk"
      className="min-h-screen scroll-smooth bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-[#020617] dark:text-white"
      suppressHydrationWarning
    >
      <body className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950 antialiased transition-colors duration-300 dark:bg-[#020617] dark:text-white">
        <ThemeProvider>
          <LanguageProvider>
            <ZedperaProviders>
              <AutoTranslateProvider>
                {children}
              </AutoTranslateProvider>
            </ZedperaProviders>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}