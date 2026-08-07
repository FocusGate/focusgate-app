"use client";

import { useRouter } from "next/navigation";
import { RevealItem } from "@/components/motion/Reveal";
import MagneticButton from "@/components/MagneticButton";
import { getEntryPath } from "@/lib/returningUser";

export default function BetaBanner() {
  const router = useRouter();

  return (
    <section style={{ background: "#060606", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <RevealItem standalone style={{ textAlign: "center", padding: "110px 32px", color: "#fff" }}>
        <h2
          className="fg-h2"
          style={{
            fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
            fontWeight: 700,
            fontSize: 68,
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            color: "#b08d57",
          }}
        >
          Free during beta.
        </h2>
        <p style={{ fontSize: 18, margin: "20px auto 0", maxWidth: "54ch", color: "#9a9da4" }}>
          No credit card. No catch. Join students already on the waitlist.
        </p>
        <MagneticButton style={{ marginTop: 34 }}>
          <button
            type="button"
            onClick={() => router.push(getEntryPath())}
            className="fg-cta-nav"
            style={{ display: "inline-block", padding: "16px 32px", fontSize: 16, border: "none", cursor: "pointer" }}
          >
            Join the beta →
          </button>
        </MagneticButton>
      </RevealItem>
    </section>
  );
}
