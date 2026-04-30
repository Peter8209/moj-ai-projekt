import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

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
    <html lang="sk" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-[#020617] text-white antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}