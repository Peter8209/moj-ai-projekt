import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zedpera",
  description: "AI platforma pre akademické písanie a analýzu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="sk"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body
        className="
          min-h-screen 
          bg-[#0f172a] text-white
          font-sans antialiased
        "
      >
        <div className="flex min-h-screen flex-col">

          {/* ===== HEADER ===== */}
          <header className="w-full border-b border-white/10 bg-[#0f172a]/80 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
              
              {/* LOGO / BRAND */}
              <h1 className="text-xl font-semibold tracking-tight">
                Zedpera
              </h1>

              {/* RIGHT SIDE */}
              <div className="text-sm text-gray-400">
                AI platforma
              </div>

            </div>
          </header>

          {/* ===== CONTENT ===== */}
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 py-6">
              {children}
            </div>
          </main>

          {/* ===== FOOTER ===== */}
          <footer className="border-t border-white/10 text-sm text-gray-400">
            <div className="mx-auto max-w-6xl px-4 py-4 text-center">
              © {new Date().getFullYear()} Zedpera
            </div>
          </footer>

        </div>
      </body>
    </html>
  );
}