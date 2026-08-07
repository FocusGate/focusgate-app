import type { Metadata } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import CustomCursor from "@/components/CustomCursor";
import PageTransition from "@/components/PageTransition";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import ScrollTriggerRefresh from "@/components/ScrollTriggerRefresh";

export const metadata: Metadata = {
  title: "FocusGate — You said you'd study. Now prove it.",
  description:
    "FocusGate locks you in, blocks every distraction, and won't let you leave until you're done.",
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
