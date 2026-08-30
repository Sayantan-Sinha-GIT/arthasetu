import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import IntroSplash from "@/components/layout/IntroSplash";
import PageBackgroundVideo from "@/components/ui/PageBackgroundVideo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ArthaSetu — Your Business. Your Language. Your Plan.",
  description:
    "AI-powered multilingual business advisor for rural micro-entrepreneurs. Get personalized business guidance, financial planning, and government scheme matching in your language.",
  keywords: [
    "ArthaSetu",
    "business advisor",
    "rural entrepreneurs",
    "government schemes",
    "financial planning",
    "PMEGP",
    "MUDRA",
    "micro-entrepreneurs",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${notoDevanagari.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        <Providers>
          <IntroSplash />
          <PageBackgroundVideo />
          {children}
        </Providers>
      </body>
    </html>
  );
}
