"use client";

import { useState } from "react";
import { changePassword } from "@/lib/supabase";

export default function PasswordChangeForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      await changePassword(newPassword);
      setSuccess(true);
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 340 }}>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password"
        style={inputStyle}
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        style={inputStyle}
      />
      <button type="submit" disabled={saving} style={{ ...btnStyle, opacity: saving ? 0.6 : 1, alignSelf: "flex-start" }}>
        {saving ? "Updating…" : "Update password"}
      </button>
      {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
      {success && <p style={{ color: "#22c55e", fontSize: 13 }}>Password updated.</p>}
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#101012",
  border: "1px solid #26262b",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  background: "rgba(245,158,11,0.15)",
  color: "#F59E0B",
  border: "1px solid rgba(245,158,11,0.4)",
  padding: "10px 18px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};
