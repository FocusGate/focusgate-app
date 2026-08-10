"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import MagneticButton from "@/components/MagneticButton";
import { getEntryPath } from "@/lib/returningUser";
import { getAppConfig } from "@/lib/entitlements";

const YEARLY_MONTHLY_EQUIVALENT = "$2.50/month";

/** An anchor price strikes through on scroll-into-view (a red line animating across it),
 *  then a beat later reveals the real price — "here's what this would normally run you,
 *  here's what you actually pay." Anchor numbers are illustrative reference points (Pro:
 *  ~2x the real price; Lifetime: ~2.5x), not prices ever actually charged anywhere. */
function StruckPriceReveal({
  oldPrice,
  oldUnit,
  newPrice,
  newUnit,
  badge,
}: {
  oldPrice: string;
  oldUnit: string;
  newPrice: string;
  newUnit: string;
  badge?: string;
}) {
  return (
    <div style={{ margin: "24px 0 6px" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 46, color: "#6b6b70" }}>{oldPrice}</span>
        <span style={{ color: "#5b5e66", fontSize: 14 }}>{oldUnit}</span>
        <motion.span
          initial={{ width: "0%" }}
          whileInView={{ width: "100%" }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ position: "absolute", left: 0, top: "52%", height: 3, background: "#ef4444", borderRadius: 999 }}
        />
      </div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}
      >
        <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 46, color: "#b08d57" }}>{newPrice}</span>
        <span style={{ color: "#999", fontSize: 14 }}>{newUnit}</span>
        {badge && (
          <span style={{ background: "#22c55e", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, letterSpacing: "0.04em" }}>
            {badge}
          </span>
        )}
      </motion.div>
    </div>
  );
}

export default function Pricing() {
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  // Public read (schema.sql's "app_config public read" policy) — this page is reachable
  // signed out, so it can't ride CurrentUserContext's own fetch. Defaults to showing the
  // beta banner (fail toward "still in beta," not toward silently hiding a real, live beta
  // status from an unauthenticated visitor) until the real value resolves.
  const [betaMode, setBetaMode] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAppConfig()
      .then((c) => {
        if (!cancelled) setBetaMode(c.betaMode);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const onBtn: React.CSSProperties = {
    background: "#f5f5f5",
    color: "#0a0a0a",
    border: "none",
    padding: "11px 26px",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
  };
  const offBtn: React.CSSProperties = {
    background: "transparent",
    color: "#9a9da4",
    border: "none",
    padding: "11px 26px",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  };

  function goToSignup() {
    // Same path regardless of beta status or which card/tier was clicked — during beta
    // (and really, always, since there's no payment collection anywhere in this app yet)
    // every signup gets full access. No email-capture step, no paywall in the way.
    router.push(getEntryPath());
  }

  return (
    <section id="pricing" className="fg-sec" style={{ background: "#060606", color: "#fff", padding: "130px 32px 150px", textAlign: "center" }}>
      <h2
        className="fg-h2"
        style={{
          fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
          fontWeight: 700,
          fontSize: 64,
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          color: "#fff",
        }}
      >
        Pricing that respects students.
      </h2>
      <p style={{ color: "#9a9da4", fontSize: 18, lineHeight: 1.6, maxWidth: "60ch", margin: "22px auto 0" }}>
        Try everything free for 5 days. Keep it for less than a coffee a month.
      </p>

      {betaMode && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.35)",
            borderRadius: 999,
            padding: "10px 20px",
            margin: "36px auto 0",
            maxWidth: "72ch",
            color: "#d8d8dc",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <span>🔒</span>
          <span>
            Currently in beta — full access free for all early users. Locked-in low pricing when we launch for anyone who joins now.
          </span>
        </div>
      )}

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#17171a", borderRadius: 999, padding: 5, margin: "28px 0 12px" }}>
        <button onClick={() => setBilling("monthly")} style={billing === "monthly" ? onBtn : offBtn}>
          Monthly
        </button>
        <button onClick={() => setBilling("yearly")} style={billing === "yearly" ? onBtn : offBtn}>
          Yearly{" "}
          <span style={{ background: "#22c55e", color: "#fff", fontSize: 11, padding: "2px 7px", borderRadius: 999, marginLeft: 4 }}>
            Save 50%
          </span>
        </button>
      </div>

      <RevealGroup stagger={0.1} className="fg-price3" style={{ maxWidth: 1140, margin: "34px auto 0", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "stretch", textAlign: "left" }}>
        {/* 5-Day Free Trial — full, unrestricted access, no card required to start. */}
        <RevealItem
          whileHover={{ y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: "#0b0b0d", border: "1px solid #26262b", borderRadius: 20, padding: "34px 30px", display: "flex", flexDirection: "column" }}
        >
          <span style={{ alignSelf: "flex-start", background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", padding: "5px 12px", borderRadius: 999 }}>
            5-DAY FREE TRIAL
          </span>
          <div style={{ margin: "24px 0 6px" }}>
            <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 58, color: "#fff" }}>$0</span>
            <span style={{ color: "#999", fontSize: 15 }}> /5 days</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, margin: "22px 0 0", color: "#cbccd2", fontSize: 14 }}>
            <span>✓ Locked In Mode</span>
            <span>✓ Unlimited blocked sites</span>
            <span>✓ All badge tiers</span>
            <span>✓ Unlimited friend groups</span>
            <span>✓ Dead Man&apos;s Switch</span>
            <span>✓ Unlimited Break Gates</span>
            <span>✓ AI insights</span>
          </div>
          <p style={{ color: "#7a7d84", fontSize: 12.5, marginTop: 20 }}>No credit card required to start.</p>
        </RevealItem>

        {/* Pro — monthly/yearly toggle drives both the price and the copy below it. */}
        <div style={{ transform: "translateY(-14px)" }}>
          <RevealItem
            whileHover={{ y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: "#060606",
              border: "1.5px solid rgba(255,255,255,0.7)",
              borderRadius: 20,
              padding: "38px 30px",
              display: "flex",
              flexDirection: "column",
              color: "#fff",
              boxShadow: "0 30px 70px rgba(0,0,0,0.35), 0 0 44px rgba(255,255,255,0.14)",
            }}
          >
            <span style={{ alignSelf: "flex-start", background: "#f5f5f5", color: "#0a0a0a", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", padding: "5px 12px", borderRadius: 999 }}>
              MOST POPULAR
            </span>
            {billing === "yearly" ? (
              <StruckPriceReveal oldPrice="$59.99" oldUnit="/yr" newPrice="$29.99" newUnit="/yr" badge="SAVE 50%" />
            ) : (
              <StruckPriceReveal oldPrice="$9.99" oldUnit="/mo" newPrice="$4.99" newUnit="/mo" />
            )}
            {billing === "yearly" ? (
              <span style={{ color: "#9a9da4", fontSize: 13, marginTop: 2 }}>Just {YEARLY_MONTHLY_EQUIVALENT}, billed annually</span>
            ) : (
              <span style={{ color: "#9a9da4", fontSize: 13, marginTop: 2 }}>or $29.99/yr — save 50%</span>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 11, margin: "22px 0 0", color: "#cbccd2", fontSize: 14 }}>
              <span>✓ Everything unlocked, always</span>
              <span>✓ Unlimited blocked sites</span>
              <span>✓ All badges, every tier</span>
              <span>✓ Unlimited friend groups</span>
              <span>✓ Dead Man&apos;s Switch</span>
              <span>✓ AI insights</span>
              <span>✓ Advanced stats</span>
              <span>✓ Priority support</span>
            </div>
          </RevealItem>
        </div>

        {/* Lifetime — one-time payment. */}
        <RevealItem
          whileHover={{ y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: "#060606", border: "1.5px solid #b08d57", borderRadius: 20, padding: "34px 30px", display: "flex", flexDirection: "column", color: "#fff", boxShadow: "0 0 30px rgba(176,141,87,0.16)" }}
        >
          <span style={{ alignSelf: "flex-start", background: "#b08d57", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", padding: "5px 12px", borderRadius: 999 }}>
            BEST DEAL
          </span>
          <StruckPriceReveal oldPrice="$199.99" oldUnit=" one-time" newPrice="$79.99" newUnit=" one-time" />
          <p style={{ color: "#b08d57", fontSize: 13, fontWeight: 700, marginTop: 12 }}>Pay once. Yours forever.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, margin: "22px 0 0", color: "#cbccd2", fontSize: 14 }}>
            <span>✓ Everything in Pro, forever</span>
            <span>✓ Exclusive gold Founder badge</span>
            <span>✓ Name in app credits</span>
            <span>✓ Early access to all features</span>
          </div>
        </RevealItem>
      </RevealGroup>

      <RevealItem standalone style={{ marginTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <MagneticButton>
          <button
            type="button"
            onClick={goToSignup}
            style={{
              background: "#b08d57",
              color: "#fff",
              border: "none",
              padding: "18px 40px",
              borderRadius: 999,
              fontSize: 17,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 0 40px rgba(176,141,87,0.45), 0 10px 30px rgba(0,0,0,0.4)",
            }}
          >
            Claim Free Beta Access →
          </button>
        </MagneticButton>
        <p style={{ color: "#8a8d94", fontSize: 13 }}>
          {betaMode ? "⚡ Free full access during beta • No credit card required" : "⚡ No credit card required to start"}
        </p>
      </RevealItem>
    </section>
  );
}
