import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ArthaSetu — Your Business. Your Language. Your Plan.",
    short_name: "ArthaSetu",
    description:
      "AI-powered multilingual business advisor for rural micro-entrepreneurs. Get personalized business guidance, financial planning, and government scheme matching in your language.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5EEE1",
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
