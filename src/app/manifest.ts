import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ArthaSetu — Your Business. Your Language. Your Plan.",
    short_name: "ArthaSetu",
    description:
      "AI-powered multilingual business advisor for rural micro-entrepreneurs. Get personalized business guidance, financial planning, and government scheme matching in your language.",
    id: "/",
    start_url: "/",
    lang: "en-IN",
    display: "standalone",
    // Matches --color-background in globals.css, so the splash Chrome paints
    // from this manifest hands over to the page without a step in colour.
    background_color: "#FDF5E3",
    theme_color: "#1E3A6E",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
