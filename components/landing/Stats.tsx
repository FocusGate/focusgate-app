"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionCountUp } from "@/hooks/useMotionCountUp";

function Stat({
  target,
  suffix,
  prefix,
  decimals,
  comma,
  label,
  desc,
  size = 96,
  weight = 800,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  comma?: boolean;
  label: string;
  desc?: string;
  size?: number;
  weight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useMotionCountUp(ref, { target, suffix, prefix, decimals, comma });

  return (
    <div style={{ padding: "0 44px", textAlign: "center" }}>
      <div
        ref={ref}
        style={{
          fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
          fontWeight: weight,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: desc ? "-0.03em" : "-0.02em",
          color: "#fff",
          fontVariantNumeric: "tabular-nums",
        }}
      />
      <div style={{ color: "#fff", fontSize: 20, fontWeight: 600, marginTop: 20 }}>{label}</div>
      {desc && (
        <div style={{ color: "#7a7d84", fontSize: 14, lineHeight: 1.6, marginTop: 14, maxWidth: "30ch", marginLeft: "auto", marginRight: "auto" }}>
          {desc}
        </div>
      )}
    </div>
  );
}

export default function Stats() {
  const [liveCount, setLiveCount] = useState(12847293);
  const fastUntilRef = useRef(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      setLiveCount((v) => v + Math.floor(Math.random() * 3) + 1);
      const delay = performance.now() < fastUntilRef.current ? 90 : 1800;
      timeout = setTimeout(tick, delay);
    };
    tick();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      <section className="fg-sec" style={{ background: "#060606", padding: "90px 32px 120px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="fg-stats3" style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          <Stat target={87} suffix="%" label="More focused" desc="Students using FocusGate report significantly fewer distractions during study sessions." />
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.09)", borderRight: "1px solid rgba(255,255,255,0.09)" }}>
            <Stat target={2.4} decimals={1} suffix="hrs" label="Saved every day" desc="The average FocusGate user reclaims over 2 hours of lost study time daily." />
          </div>
          <Stat target={91} suffix="%" label="Complete their sessions" desc="Locked In Mode users finish what they started. Every time." />
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}>
          <div className="fg-live-pill" style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#0A0A0A", borderRadius: 999, padding: "13px 24px" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B", boxShadow: "0 0 10px #F59E0B", animation: "fg-heartbeat 1.4s ease-in-out infinite" }} />
            <span style={{ color: "#9a9da4", fontSize: 15, fontWeight: 500 }}>
              <span style={{ color: "#fff", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{liveCount.toLocaleString("en-US")}</span> minutes
              saved with FocusGate
            </span>
          </div>
        </div>
      </section>

      <section className="fg-sec" style={{ background: "#060606", padding: "70px 32px", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="fg-stats3" style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          <Stat target={10000} comma suffix="+" label="Students on the waitlist" size={88} weight={700} />
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.09)", borderRight: "1px solid rgba(255,255,255,0.09)" }}>
            <StatGold target={1} prefix="#" label="Focus app built for students" />
          </div>
          <Stat target={365} label="Days to unlock Legend badge" size={88} weight={700} />
        </div>
      </section>
    </>
  );
}

function StatGold({ target, prefix, label }: { target: number; prefix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useMotionCountUp(ref, { target, prefix });
  return (
    <div style={{ padding: "0 44px", textAlign: "center" }}>
      <div
        ref={ref}
        style={{
          fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
          fontWeight: 700,
          fontSize: 88,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: "#b08d57",
          fontVariantNumeric: "tabular-nums",
        }}
      />
      <div style={{ color: "#7a7d84", fontSize: 15, marginTop: 16 }}>{label}</div>
    </div>
  );
}
