import type { MetadataRoute } from "next";

// Web app manifest – styr hur appen ser ut när den sparas på hemskärmen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dagens",
    short_name: "Dagens",
    description: "Veckans lunchmeny",
    start_url: "/",
    display: "standalone",
    background_color: "#c8552b",
    theme_color: "#c8552b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/dagens-appikon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
