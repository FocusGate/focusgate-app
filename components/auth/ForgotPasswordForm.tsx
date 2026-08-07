"use client";

import { useState } from "react";
import Link from "next/link";
import { getAuthErrorMessage, requestPasswordReset } from "@/lib/supabase";
import { FocusGateMark } from "@/components/landing/Navbar";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not send that reset link. Try again in a moment."));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#060606",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 40 }}>
            <FocusGateMark />
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 25, color: "#b08d57" }}>FocusGate</span>
          </Link>

          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #F59E0B, #b08d57)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: "0 0 30px rgba(245,158,11,0.4)",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 20 20" fill="#0a0a0a">
              <path d="M2.94 6.94a.75.75 0 011.06 0L10 12.94l6-6a.75.75 0 111.06 1.06l-6.53 6.53a.75.75 0 01-1.06 0L2.94 8a.75.75 0 010-1.06z" />
            </svg>
          </div>

          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Check your email</h1>
          <p style={{ color: "#9a9da4", fontSize: 14, lineHeight: 1.6 }}>
            If an account exists for <span style={{ color: "#fff" }}>{email}</span>, we sent a link to reset your
            password.
          </p>

          <Link href="/login" style={{ display: "inline-block", marginTop: 26, color: "#b08d57", fontWeight: 600, fontSize: 14 }}>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060606",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 40 }}>
          <FocusGateMark />
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 25, color: "#b08d57" }}>FocusGate</span>
        </Link>

        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, textAlign: "center", marginBottom: 6 }}>Reset your password</h1>
        <p style={{ color: "#9a9da4", fontSize: 14, textAlign: "center", marginBottom: 30 }}>
          Enter your email and we&apos;ll send you a link to set a new one.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="email"
            required
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={loading} style={submitStyle}>
            {loading ? "Sending…" : "Send reset link →"}
          </button>
        </form>

        <p style={{ color: "#7a7d84", fontSize: 14, textAlign: "center", marginTop: 24 }}>
          <Link href="/login" style={{ color: "#b08d57", fontWeight: 600 }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#101012",
  border: "1px solid #26262b",
  color: "#fff",
  padding: "14px 16px",
  borderRadius: 12,
  fontSize: 15,
  outline: "none",
};

const submitStyle: React.CSSProperties = {
  background: "#F59E0B",
  color: "#0a0a0a",
  border: "none",
  padding: "14px",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 6,
};
