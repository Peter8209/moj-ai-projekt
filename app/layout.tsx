import type { Metadata } from 'next';
import './globals.css';

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
      className="min-h-screen bg-[#020617]"
      suppressHydrationWarning
    >
      <body className="min-h-screen overflow-x-hidden bg-[#020617] text-white antialiased">
        {children}
      </body>
    </html>
  );
}