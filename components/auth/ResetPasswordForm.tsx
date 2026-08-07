"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { changePassword, getAuthErrorMessage } from "@/lib/supabase";
import { FocusGateMark } from "@/components/landing/Navbar";

/** Lands here from the emailed recovery link, which gives the browser client a temporary
 *  recovery session — `changePassword()` (a plain `auth.updateUser()`) works against that
 *  session without needing the old password. */
export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      await changePassword(password);
      router.push("/dashboard");
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not reset your password. The link may have expired — request a new one."));
    } finally {
      setSaving(false);
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

        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, textAlign: "center", marginBottom: 6 }}>Set a new password</h1>
        <p style={{ color: "#9a9da4", fontSize: 14, textAlign: "center", marginBottom: 30 }}>Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="password"
            required
            minLength={6}
            placeholder="New password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            required
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={inputStyle}
          />
          {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={saving} style={submitStyle}>
            {saving ? "Saving…" : "Reset password →"}
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
