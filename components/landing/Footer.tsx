"use client";

import { motion, type Variants } from "framer-motion";
import { FocusGateMark } from "./Navbar";

const footerVariants: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const logoVariants: Variants = {
  hidden: { scale: 0.8 },
  visible: { scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const linksContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const linkVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#badges", label: "Badges" },
  { href: "#pricing", label: "Pricing" },
  { href: "#", label: "Support" },
  { href: "/privacy", label: "Privacy Policy" },
];

export default function Footer() {
  return (
    <motion.footer
      variants={footerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      style={{ background: "#060606", padding: "54px 32px", borderTop: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <motion.div variants={logoVariants} style={{ display: "flex", alignItems: "center", gap: 9, transformOrigin: "left center" }}>
          <FocusGateMark size={20} />
          <span style={{ fontSize: 16, fontWeight: 800 }}>FocusGate</span>
        </motion.div>
        <motion.div variants={linksContainerVariants} style={{ display: "flex", gap: 26 }}>
          {LINKS.map((l) => (
            <motion.a key={l.label} href={l.href} variants={linkVariants} style={{ color: "#8a8d94", fontSize: 14 }}>
              {l.label}
            </motion.a>
          ))}
        </motion.div>
        <div style={{ color: "#8a8d94", fontSize: 14 }}>Built for students who mean it.</div>
      </div>
      <div style={{ maxWidth: 1240, margin: "30px auto 0", color: "#3a3a3a", fontSize: 13 }}>© 2026 FocusGate</div>
    </motion.footer>
  );
}
