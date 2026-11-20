import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Omi (ඕමි) — Sri Lankan Multiplayer Card Game",
    short_name: "Omi (ඕමි)",
    description:
      "Play authentic 4-player Sri Lankan Omi (ඕමි) online in real time with friends. Created by Rashmina Fernando.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#06130f",
    theme_color: "#06130f",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/omi-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
