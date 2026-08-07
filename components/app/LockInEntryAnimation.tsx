"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Brief full-screen moment right as a session begins — black background, gold glow
 *  radiating from center, dramatic type. Purely ceremonial (the session is already
 *  running underneath by the time this shows), but a plain "started" toast would undersell
 *  what the confirm modal just committed the user to. Auto-dismisses; nothing to click. */
export default function LockInEntryAnimation({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1900);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 950,
          background: "#0A0A0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.5 }}
          transition={{ duration: 1.7, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(176,141,87,0.4), transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: "relative", textAlign: "center" }}
        >
          <div style={{ fontSize: 40, marginBottom: 18 }}>🔒</div>
          <motion.h1
            initial={{ opacity: 0, y: 14, letterSpacing: "0.35em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0.02em" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: "clamp(38px, 7vw, 68px)",
              color: "#fff",
              margin: 0,
            }}
          >
            You are now <span style={{ color: "#b08d57", fontStyle: "italic" }}>Locked In.</span>
          </motion.h1>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
