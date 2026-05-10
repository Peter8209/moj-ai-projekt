import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-dvh overflow-hidden bg-[#020617]`}
      suppressHydrationWarning
    >
      <body className="h-dvh overflow-hidden bg-[#020617] text-white antialiased">
        {children}
      </body>
    </html>
  );
}