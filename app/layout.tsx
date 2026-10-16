import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { t } from "@/lib/i18n";
import { siteUrl } from "@/lib/request";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: t.meta.siteTitle, template: "%s · Léman Poker & Casino" },
  description: t.meta.siteDescription,
  applicationName: "Léman Poker & Casino",
  openGraph: {
    type: "website",
    locale: "fr_CH",
    siteName: "Léman Poker & Casino",
    title: t.meta.siteTitle,
    description: t.meta.siteDescription,
    images: [{ url: "/2023-03-28.webp", width: 1000, height: 1000, alt: "Logo Léman Poker & Casino" }],
  },
  twitter: { card: "summary", title: t.meta.siteTitle, description: t.meta.siteDescription, images: ["/2023-03-28.webp"] },
  icons: { icon: "/favicon.ico", apple: "/leman.png" },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr-CH" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
