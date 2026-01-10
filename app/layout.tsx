import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "\uC2A4\uD1A1 \uBA54\uBAA8 \uB300\uC2DC\uBCF4\uB4DC",
  description:
    "\uC2DC\uAC04\uB300\uBCC4 \uC2DC\uC7A5 \uB370\uC774\uD130\uB97C \uD55C\uB208\uC5D0 \uD655\uC778\uD558\uC138\uC694.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${spaceGrotesk.variable} ${fraunces.variable} ${plexMono.variable}`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
