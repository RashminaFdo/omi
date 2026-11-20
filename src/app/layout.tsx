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
  variable: "--font-jetbrains-mono",
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://omi-fawn.vercel.app"),
  title: "Omi (ඕමි) — Sri Lankan Multiplayer Card Game",
  description:
    "Play authentic 4-player Sri Lankan Omi (ඕමි) online in real time with friends. Create a room, share a link or 6-character code, and race to 10 Keta tokens.",
  icons: {
    icon: "/omi-logo.png",
    shortcut: "/omi-logo.png",
    apple: "/omi-logo.png",
  },
  openGraph: {
    title: "Omi (ඕමි) — The Sri Lankan Card Game",
    description:
      "Join a live 4-player Sri Lankan Omi table with friends via invite link or 6-character code.",
    images: [{ url: "/omi-logo.png", alt: "Omi — The Sri Lankan Card Game" }],
  },
  twitter: {
    card: "summary",
    title: "Omi (ඕමි) — The Sri Lankan Card Game",
    description:
      "Play real-time 4-player Sri Lankan Omi online with friends.",
    images: ["/omi-logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06130f",
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
        <SettingsProvider>
          {children}
          <SettingsModal />
          <RulesModal />
        </SettingsProvider>
      </body>
    </html>
  );
}
