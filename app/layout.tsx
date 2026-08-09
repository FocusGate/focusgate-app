import type { Metadata } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import CustomCursor from "@/components/CustomCursor";
import PageTransition from "@/components/PageTransition";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import ScrollTriggerRefresh from "@/components/ScrollTriggerRefresh";

const TITLE = "FocusGate — You said you'd study. Now prove it.";
const DESCRIPTION = "FocusGate locks you in, blocks every distraction, and won't let you leave until you're done.";

export const metadata: Metadata = {
  metadataBase: new URL("https://focusgate.site"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://focusgate.site",
    siteName: "FocusGate",
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
  // The gold-lock mark on black — same silhouette as FocusGateMark (components/landing/
  // Navbar.tsx) redrawn as bold filled shapes instead of thin strokes, which read fine at
  // 24px in a nav bar but vanish at 16px favicon size. favicon.ico bundles 16/32/48px PNG
  // frames (all modern browsers support PNG-in-ICO); icon-192/512 cover PWA-style and
  // Android home-screen use; apple-icon covers iOS "Add to Home Screen."
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
        {/* Loaded via <link> (not next/font) so the literal family names "Geist" / "Mulish" /
            "Instrument Serif" match the hundreds of inline font-family references ported verbatim
            from the FocusGate.dc.html design — next/font would rename them and break every one. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Mulish:wght@400;500;600;700;800&family=Geist:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CustomCursor />
        <ScrollProgressBar />
        <ScrollTriggerRefresh />
        <SmoothScroll>
          <PageTransition>{children}</PageTransition>
        </SmoothScroll>
      </body>
    </html>
  );
}
