"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import MagneticButton from "@/components/MagneticButton";
import { getEntryPath } from "@/lib/returningUser";

/** Original price strikes through on scroll-into-view, then a beat later reveals "$0" —
 *  reads as "here's what this normally costs, but not during beta." Only used on the two
 *  paid cards; the Free card is already $0 with nothing to strike through. */
function StruckPriceReveal({ price, unit }: { price: string; unit: string }) {
  return (
    <div style={{ margin: "24px 0 6px" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 46, color: "#6b6b70" }}>{price}</span>
        <span style={{ color: "#5b5e66", fontSize: 14 }}>{unit}</span>
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
        <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 46, color: "#b08d57" }}>$0</span>
        <span
          style={{
            background: "#b08d57",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 999,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Free during beta
        </span>
      </motion.div>
    </div>
  );
}

export default function Pricing() {
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const proPrice = billing === "yearly" ? "$49.99" : "$9.99";
  const proUnit = billing === "yearly" ? "/yr" : "/mo";

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
        Payments aren&apos;t live yet. Join the beta and lock in these prices before we launch them.
      </p>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(176,141,87,0.06)",
          border: "1px solid rgba(176,141,87,0.3)",
          borderRadius: 999,
          padding: "10px 20px",
          margin: "36px auto 0",
          maxWidth: "70ch",
          color: "#d8d8dc",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <span>🔒</span>
        <span>
          All features are 100% free while in Beta. Entering your email reserves your early-bird pricing for when we officially launch — no
          payment details required today.
        </span>
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#17171a", borderRadius: 999, padding: 5, margin: "28px 0 12px" }}>
        <button onClick={() => setBilling("monthly")} style={billing === "monthly" ? onBtn : offBtn}>
          Monthly
        </button>
        <button onClick={() => setBilling("yearly")} style={billing === "yearly" ? onBtn : offBtn}>
          Yearly{" "}
          <span style={{ background: "#22c55e", color: "#fff", fontSize: 11, padding: "2px 7px", borderRadius: 999, marginLeft: 4 }}>
            Save 58%
          </span>
        </button>
      </div>

      <RevealGroup stagger={0.1} className="fg-price3" style={{ maxWidth: 1140, margin: "34px auto 0", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "stretch", textAlign: "left" }}>
        <RevealItem
          whileHover={{ y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: "#0b0b0d", border: "1px solid #26262b", borderRadius: 20, padding: "34px 30px", display: "flex", flexDirection: "column" }}
        >
          <span style={{ alignSelf: "flex-start", background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", padding: "5px 12px", borderRadius: 999 }}>
            FREE DURING BETA
          </span>
          <div style={{ margin: "24px 0 6px" }}>
            <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: 58, color: "#fff" }}>$0</span>
            <span style={{ color: "#999", fontSize: 15 }}> /first month</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, margin: "22px 0 0", color: "#cbccd2", fontSize: 14 }}>
            <span>✓ Locked In Mode</span>
            <span>✓ 5 blocked sites</span>
            <span>✓ Basic badges</span>
            <span>✓ 1 friend group</span>
            <span>✓ Session timer</span>
            <span>✓ Focus streaks</span>
          </div>
        </RevealItem>

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
            <StruckPriceReveal price={proPrice} unit={proUnit} />
            <div style={{ display: "flex", flexDirection: "column", gap: 11, margin: "22px 0 0", color: "#cbccd2", fontSize: 14 }}>
              <span>✓ Everything in Free</span>
              <span>✓ Unlimited blocked sites</span>
              <span>✓ All badges</span>
              <span>✓ Unlimited friend groups</span>
              <span>✓ AI insights</span>
              <span>✓ Advanced stats</span>
              <span>✓ Weekly focus report</span>
              <span>✓ Priority support</span>
            </div>
          </RevealItem>
        </div>

        <RevealItem
          whileHover={{ y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: "#060606", border: "1.5px solid #b08d57", borderRadius: 20, padding: "34px 30px", display: "flex", flexDirection: "column", color: "#fff", boxShadow: "0 0 30px rgba(176,141,87,0.16)" }}
        >
          <span style={{ alignSelf: "flex-start", background: "#b08d57", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", padding: "5px 12px", borderRadius: 999 }}>
            BEST DEAL
          </span>
          <StruckPriceReveal price="$119.99" unit=" one-time" />
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
            onClick={() => router.push(getEntryPath())}
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
        <p style={{ color: "#8a8d94", fontSize: 13 }}>⚡ 100% Free during Beta • No credit card required • Reserves early-bird perks</p>
      </RevealItem>
    </section>
  );
}
