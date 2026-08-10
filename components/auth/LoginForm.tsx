"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthErrorMessage, signIn } from "@/lib/supabase";
import { FocusGateMark } from "@/components/landing/Navbar";

/** Email + password sign-in. OTP is disabled for now (the Supabase project doesn't have
 *  passwordless signups enabled yet) — this is the only sign-in path until it's added back. */
export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not sign in. Check your details and try again."));
    } finally {
      setLoading(false);
    }
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

        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, textAlign: "center", marginBottom: 6 }}>Welcome back</h1>
        <p style={{ color: "#9a9da4", fontSize: 14, textAlign: "center", marginBottom: 30 }}>Sign in to your Locked In sessions.</p>

        {/* ph-no-capture: see SignupForm.tsx's identical guard — same reasoning applies here. */}
        <form onSubmit={handleSubmit} className="ph-no-capture" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="email"
            required
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          <Link href="/forgot-password" style={{ color: "#b08d57", fontSize: 13, fontWeight: 600, alignSelf: "flex-end", marginTop: -4 }}>
            Forgot your password?
          </Link>
          {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={loading} style={submitStyle}>
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        <p style={{ color: "#7a7d84", fontSize: 14, textAlign: "center", marginTop: 24 }}>
          New to FocusGate?{" "}
          <Link href="/signup" style={{ color: "#b08d57", fontWeight: 600 }}>
            Create an account
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
