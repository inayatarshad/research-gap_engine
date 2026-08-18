import type { Metadata, Viewport } from "next";
import { Jost, Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

/**
 * Jost is a geometric humanist sans in the Futura lineage: it carries the
 * display voice. Inter handles body and dense data, where a geometric face
 * loses legibility at small sizes.
 */
const display = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-display-face",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HERMÈS, Research Gap & Discovery Engine",
  description:
    "HERMÈS maps what a research field is studying and what it keeps skipping. It analyses 16,605 NLP papers to score under-researched language and task pairings, with the evidence behind every number.",
  openGraph: {
    title: "HERMÈS, Research Gap & Discovery Engine",
    description: "Map what a research field is studying, and what it keeps skipping.",
    type: "website",
    images: [{ url: "/logo.png", width: 211, height: 173, alt: "HERMÈS" }],
  },
  twitter: {
    card: "summary",
    title: "HERMÈS, Research Gap & Discovery Engine",
    description: "Map what a research field is studying, and what it keeps skipping.",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f4f0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
