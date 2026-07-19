/**
 * Root layout. Owner: C.
 */

import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UnifoldClientProvider } from "@/components/billing/UnifoldClientProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

/** Editorial serif — the brand voice for hero lines, grades, and pull quotes. */
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

/** Registrar mono — course codes, section numbers, timestamps, tickers.
 * Named --font-mono so Tailwind's `font-mono` utility resolves to it. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Professor Me — Teach it to learn it",
  description:
    "Explain any topic to an AI student who probes exactly where you hand-wave. You don't study with it — you teach it.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey = process.env.NEXT_PUBLIC_UNIFOLD_PUBLISHABLE_KEY;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} ${fraunces.variable} ${plexMono.variable} antialiased`}
      >
        <ThemeProvider>
          <UnifoldClientProvider publishableKey={publishableKey}>
            {children}
          </UnifoldClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
