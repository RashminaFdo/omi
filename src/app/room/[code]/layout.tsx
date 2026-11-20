import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Game Table",
  description:
    "Join a live 4-player Sri Lankan Omi (ඕමි) table with friends on omi.rashmina.dev.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
