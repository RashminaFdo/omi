import type { Metadata, Viewport } from "next";
import {
  JetBrains_Mono,
  Noto_Sans_Sinhala,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { RulesModal } from "@/components/RulesModal";
import { SettingsModal } from "@/components/SettingsModal";
import { SettingsProvider } from "@/lib/settings";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const sinhala = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  variable: "--font-sinhala",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "700", "800"],
});

const SITE_URL = "https://omi.rashmina.dev";

export const viewport: Viewport = {
  themeColor: "#06130f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Omi (ඕමි) — Play Sri Lankan Card Game Online | By Rashmina Fernando",
    template: "%s | Omi (ඕමි) — Sri Lankan Card Game",
  },
  description:
    "Play Omi (ඕමි), the classic 4-player Sri Lankan card game, online for free in real time with friends or AI bots. Authentic Thurumpu, Keta tokens, Kapothi, Basthe, and Seporu rules in English & Sinhala. Built by Rashmina Fernando.",
  keywords: [
    "Omi",
    "Omi card game",
    "Omi online",
    "play Omi online",
    "Omi game",
    "Omi multiplayer",
    "Sri Lankan card game",
    "Sri Lankan card games",
    "Sri Lankan Omi",
    "ඕමි",
    "ඕමි කාඩ් ක්‍රීඩාව",
    "ඕමි ඔන්ලයින්",
    "Rashmina Fernando",
    "rashmina.dev",
    "omi.rashmina.dev",
    "Thurumpu",
    "Kapothi",
    "Basthe",
    "Seporu",
    "Keta",
    "32 card game",
    "4 player card game online",
  ],
  authors: [{ name: "Rashmina Fernando", url: "https://rashmina.dev" }],
  creator: "Rashmina Fernando",
  publisher: "Rashmina Fernando",
  category: "games",
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/omi-logo.png",
    shortcut: "/omi-logo.png",
    apple: "/omi-logo.png",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Omi (ඕමි) — Sri Lankan Card Game",
    title: "Omi (ඕමි) — Play Sri Lankan Card Game Online Free",
    description:
      "Create a private Omi table, share an invite link or 6-character code, and play authentic 4-player Sri Lankan Omi in real time. Built by Rashmina Fernando.",
    locale: "en_US",
    alternateLocale: ["si_LK"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Omi (ඕමි) — Sri Lankan Multiplayer Card Game",
    description:
      "Play authentic 4-player Sri Lankan Omi (ඕමි) online with friends in English & Sinhala. Created by Rashmina Fernando.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "VideoGame",
      name: "Omi (ඕමි) — Sri Lankan Card Game",
      alternateName: ["Omi", "Omi Card Game", "Sri Lankan Omi", "ඕමි"],
      url: SITE_URL,
      image: `${SITE_URL}/omi-logo.png`,
      description:
        "Free real-time 4-player multiplayer web app for the traditional Sri Lankan card game Omi (ඕමි), featuring authentic Thurumpu, blind 5th–8th card trump draw, Kapothi/Basthe, Seporu, and Keta token scoring in English and Sinhala.",
      applicationCategory: "GameApplication",
      operatingSystem: "Any (Web, Mobile, Desktop)",
      genre: ["Card Game", "Multiplayer", "Traditional Sri Lankan Game"],
      playMode: ["MultiPlayer", "CoOp", "SinglePlayer"],
      numberOfPlayers: {
        "@type": "QuantitativeValue",
        minValue: 1,
        maxValue: 4,
      },
      inLanguage: ["en", "si"],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      author: {
        "@type": "Person",
        name: "Rashmina Fernando",
        url: "https://rashmina.dev",
      },
      creator: {
        "@type": "Person",
        name: "Rashmina Fernando",
        url: "https://rashmina.dev",
      },
    },
    {
      "@type": "WebSite",
      name: "Omi (ඕමි) by Rashmina Fernando",
      url: SITE_URL,
      author: {
        "@type": "Person",
        name: "Rashmina Fernando",
        url: "https://rashmina.dev",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${sinhala.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SettingsProvider>
          {children}
          <SettingsModal />
          <RulesModal />
        </SettingsProvider>
      </body>
    </html>
  );
}
