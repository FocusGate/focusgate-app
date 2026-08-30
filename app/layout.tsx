import type { Metadata } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import CustomCursor from "@/components/CustomCursor";
import PageTransition from "@/components/PageTransition";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import ScrollTriggerRefresh from "@/components/ScrollTriggerRefresh";
import PostHogProvider from "@/components/analytics/PostHogProvider";

const TITLE = "Raven — You said you'd study. Now prove it.";
const DESCRIPTION = "Raven locks you in, blocks every distraction, and won't let you leave until you're done.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ravenlock.pro"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://ravenlock.pro",
    siteName: "Raven",
    type: "website",
    // No og:image yet — public/ only has Next.js's default starter icons, no real
    // branded social-preview image exists in this repo. Add one (1200x630) and an
    // `images: [...]` entry here before relying on link previews looking right.
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  // Still the old gold "F" mark on black (same source art as the Chrome extension's own
  // icon, extension/icons/icon-source.png) — flagged as pending redesign alongside the
  // extension icons now that the brand is Raven, not FocusGate; file paths below are
  // unchanged since the actual new raven artwork doesn't exist yet. favicon.ico bundles
  // 16/32/48px PNG frames (all modern browsers support PNG-in-ICO); icon-192/512 cover
  // PWA-style and Android home-screen use; apple-icon covers iOS "Add to Home Screen."
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Loaded via <link> (not next/font) so the literal family names "Inter" / "Space
            Grotesk" match every inline font-family reference across the app — next/font
            would rename them and break every one. Raven brand pass: replaces the old
            Geist/Mulish/Instrument Serif trio (Space Grotesk covers both the old serif
            display role and Geist's headline role; Inter covers body text and what Mulish
            used to). No italic weights loaded for Space Grotesk — the handful of spots using
            fontStyle: "italic" fall back to the browser's synthetic italic, which reads fine
            on a geometric sans. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PostHogProvider>
          <CustomCursor />
          <ScrollProgressBar />
          <ScrollTriggerRefresh />
          <SmoothScroll>
            <PageTransition>{children}</PageTransition>
          </SmoothScroll>
        </PostHogProvider>
      </body>
    </html>
  );
}
