import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AXUS ID",
    short_name: "AXUS ID",
    description: "One secure account for every app you use.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: [
      { src: "/icon-tm.png", sizes: "any", type: "image/png" },
      { src: "/icon-tm-dark.png", sizes: "any", type: "image/png" },
    ],
  };
}
