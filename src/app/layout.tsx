import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { siteConfig } from "@/lib/settings";
import { syncRates } from "@/lib/moneyServer";

// Fonts load at runtime via Google Fonts CSS (graceful serif/sans fallbacks
// when offline). Declared in globals.css as --font-display / --font-sans.

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "FEMZYK MARKET",
    template: "%s | FEMZYK MARKET",
  },
  description: "Store, digital-resource, and web-development information for FEMZYK MARKET. Availability and policies are shown where configured.",
  openGraph: {
    siteName: "FEMZYK MARKET",
    title: "FEMZYK MARKET",
    description: "Store, digital-resource, and web-development information for FEMZYK MARKET.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  syncRates();
  const site = siteConfig();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400..900&family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-gold-500 focus:text-ink-950 focus:px-4 focus:py-2 focus:rounded-lg"
        >
          Skip to content
        </a>
        {site.announcement ? (
          <div className="bg-navy-800 text-center text-xs sm:text-sm text-cream-100 py-2 px-4 border-b border-navy-600/40">
            {site.announcement}
          </div>
        ) : null}
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
