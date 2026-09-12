import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import IntroSplash from "@/components/layout/IntroSplash";
import BootScreen from "@/components/layout/BootScreen";
import ServiceWorkerRegistrar from "@/components/system/ServiceWorkerRegistrar";
import SmoothScrollProvider from "@/components/providers/SmoothScrollProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

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
  title: {
    default: "ArthaSetu — Your Business. Your Language. Your Plan.",
    template: "%s | ArthaSetu",
  },
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3A6E",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${notoDevanagari.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col font-sans antialiased">
        {/*
          Applies the saved (or system) theme to <html> before first paint.
          Without it the tree renders light, then ThemeProvider's effect flips
          it to dark a beat later — a full-page flash in which dark-mode text
          sits on the light background and is briefly unreadable. It also
          means the background video mounts against the right theme the first
          time, instead of fetching the wrong clip and swapping.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('arthasetu-theme');" +
              "if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}" +
              "document.documentElement.classList.add(t);}catch(e){}",
          }}
        />
        {/*
          Rendered here, above the providers, so it is part of the HTML response
          rather than something React draws after it has hydrated. It is the only
          thing on screen while the bundle is still in flight — which on a rural
          connection is most of the wait. IntroSplash takes it back down.
        */}
        <BootScreen />
        <SmoothScrollProvider>
          <Providers>
            <IntroSplash />
            <ServiceWorkerRegistrar />
            {children}
            <Analytics />
            <SpeedInsights />
          </Providers>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}