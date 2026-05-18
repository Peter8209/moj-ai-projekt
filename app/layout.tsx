import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LanguageProvider } from '@/components/LanguageProvider';

export const metadata: Metadata = {
  title: 'Zedpera',
  description: 'AI platforma pre akademické písanie a analýzu',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="sk"
      className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-[#020617] dark:text-white"
      suppressHydrationWarning
    >
      <body className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950 antialiased transition-colors duration-300 dark:bg-[#020617] dark:text-white">
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}