"use client";

import { useRouter } from "next/navigation";
import MagneticButton from "@/components/MagneticButton";
import { getEntryPath } from "@/lib/returningUser";
import { RaveSplit } from "./RaveSplit";

// The final CTA before the footer -- Rave's "cheering" pose (thumbs up), last in the
// alternating sequence down the page (Science-left, Features-right, Feathers-left,
// Pricing-right, Coming-Soon-left, Cheering-right).
export default function BetaBanner() {
  const router = useRouter();

  return (
    <section style={{ background: "#060606", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "110px 32px" }}>
      <RaveSplit image="/rave/rave-cheering.png" imageAlt="Rave cheering you on" side="right" glow="rgba(176,141,87,0.18)">
        <h2
          className="fg-h2"
          style={{
            fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
            fontWeight: 700,
            fontSize: 60,
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            color: "#b08d57",
          }}
        >
          Free during beta.
        </h2>
        <p style={{ fontSize: 18, margin: "20px 0 0", maxWidth: "44ch", color: "#9a9da4" }}>
          No credit card. No catch. Join everyone already on the waitlist.
        </p>
        <MagneticButton style={{ marginTop: 34, display: "inline-block" }}>
          <button
            type="button"
            onClick={() => router.push(getEntryPath())}
            className="fg-cta-nav"
            style={{ display: "inline-block", padding: "16px 32px", fontSize: 16, border: "none", cursor: "pointer" }}
          >
            Join the beta →
          </button>
        </MagneticButton>
      </RaveSplit>
    </section>
  );
}
