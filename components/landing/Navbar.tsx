"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import MagneticButton from "@/components/MagneticButton";
import { getEntryPath } from "@/lib/returningUser";

// TODO: this extension isn't published yet — swap in the real Chrome Web Store URL
// (https://chrome.google.com/webstore/detail/<name>/<extension-id>) once it is. Exported
// so every "Add to Chrome" CTA on the site (Navbar, Hero, ...) points at the same one
// placeholder to update later, instead of several copies drifting out of sync.
export const CHROME_WEBSTORE_URL = "https://chrome.google.com/webstore/detail/focusgate/REPLACE_WITH_EXTENSION_ID";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { scrollY } = useScroll();

  const blurPx = useTransform(scrollY, [0, 50, 200], [0, 0, 20]);
  const backdropFilter = useTransform(blurPx, (b) => (b > 0.5 ? `blur(${b}px)` : "none"));
  const background = useTransform(scrollY, [0, 50], ["rgba(10,10,10,0)", "rgba(10,10,10,0.8)"]);
  const borderColor = useTransform(scrollY, [0, 50], ["rgba(30,41,59,0)", "rgba(30,41,59,1)"]);
  const boxShadow = useTransform(scrollY, [0, 50], ["0 0 0 rgba(0,0,0,0)", "0 12px 40px rgba(0,0,0,0.45)"]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <>
      <motion.nav
        className="fg-float-nav"
        style={{ backdropFilter, WebkitBackdropFilter: backdropFilter, background, borderColor, boxShadow }}
      >
        <div style={{ padding: "12px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
            <FocusGateMark />
            <span
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 25,
                fontWeight: 400,
                letterSpacing: "0.01em",
                color: "#b08d57",
              }}
            >
              FocusGate
            </span>
          </a>

          <div className="fg-nav-links" style={{ display: "flex", alignItems: "center", gap: 38 }}>
            {["features", "badges", "pricing"].map((id) => (
              <NavLink key={id} href={`#${id}`}>
                {id}
              </NavLink>
            ))}
            <a
              href={CHROME_WEBSTORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="fg-navlink"
              style={{ display: "flex", alignItems: "center", gap: 6, color: "#b79a6f", fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", textDecoration: "none" }}
            >
              🧩 Extension
            </a>
          </div>

          <MagneticButton>
            <button type="button" onClick={() => router.push(getEntryPath())} className="fg-cta-nav" style={{ border: "none", cursor: "pointer" }}>
              Get Early Access
            </button>
          </MagneticButton>

          <button className="fg-hamburger" aria-label="Menu" onClick={() => setMenuOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <line x1="4" y1="8" x2="20" y2="8" stroke="#b08d57" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="4" y1="14" x2="20" y2="14" stroke="#b08d57" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </motion.nav>

      <div className={`fg-mobile-menu${menuOpen ? " fg-open" : ""}`}>
        <button
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          style={{ position: "absolute", top: 22, right: 24, background: "transparent", border: "none", cursor: "pointer" }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <line x1="6" y1="6" x2="18" y2="18" stroke="#b08d57" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="18" y1="6" x2="6" y2="18" stroke="#b08d57" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        {["features", "badges", "pricing"].map((id) => (
          <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} style={{ textTransform: "capitalize" }}>
            {id}
          </a>
        ))}
        <a href={CHROME_WEBSTORE_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
          🧩 Chrome Extension
        </a>
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            router.push(getEntryPath());
          }}
          className="fg-cta-nav"
          style={{ border: "none", cursor: "pointer" }}
        >
          Get Early Access
        </button>
      </div>
    </>
  );
}

const underlineVariants: Variants = {
  rest: { scaleX: 0 },
  hover: { scaleX: 1 },
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <motion.a
      href={href}
      className="fg-navlink"
      initial="rest"
      whileHover="hover"
      style={{
        position: "relative",
        color: "#b79a6f",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      {children}
      <motion.span
        variants={underlineVariants}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -4,
          height: 1,
          background: "#b08d57",
          transformOrigin: "left center",
        }}
      />
    </motion.a>
  );
}

export function FocusGateMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 21V11a7 7 0 0 1 14 0v10" stroke="#b08d57" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <line x1="3.6" y1="21" x2="20.4" y2="21" stroke="#b08d57" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="12.4" r="1.5" fill="#b08d57" />
      <path d="M12 13.6V16.6" stroke="#b08d57" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
