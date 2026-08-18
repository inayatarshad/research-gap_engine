import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
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
  title: "Lacuna — Research Gap & Discovery Engine",
  description:
    "Map what a research field is studying, and what it is quietly overlooking. Lacuna analyses 16,000+ NLP papers to surface under-researched language and task combinations, with the evidence behind every claim.",
  openGraph: {
    title: "Lacuna — Research Gap & Discovery Engine",
    description:
      "Map what a research field is studying, and what it is quietly overlooking.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f4f0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrument.variable} ${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
